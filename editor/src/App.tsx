import { useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import "./App.css";

import { initialDeck } from "./model/initialDeck";
import {
  addElementToSlide,
  addTextElement,
  cloneDeck,
  cloneElementForClipboard,
  cloneElementWithOffset,
  cloneSlide,
  createBlankSlide,
  createDefaultTextElement,
  deleteElement,
  deleteSlideAt,
  findElement,
  insertSlideAt,
  moveElement,
  normalizeHexColor,
  nudgeElement,
  renameSlideAt,
  resizeElement,
  updateColor,
  updateFontSize,
  updateText,
} from "./model/deckOps";
import type {
  Element,
  Presentation,
  TextElement,
} from "./model/types";
import { isEditableTarget } from "./utils/dom";


type DragState = {
  slideIndex: number;
  elementId: string;
  startMouseX: number;
  startMouseY: number;
  startElementX: number;
  startElementY: number;
};

type ResizeState = {
  slideIndex: number;
  elementId: string;
  startMouseX: number;
  startMouseY: number;
  startWidth: number;
  startHeight: number;
};

export default function App() {
  const [deck, setDeck] = useState<Presentation>(initialDeck);
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(
    null,
  );

  const dragState = useRef<DragState | null>(null);
  const resizeState = useRef<ResizeState | null>(null);
  const elementClipboard = useRef<Element | null>(null);
  const undoStack = useRef<Presentation[]>([]);
  const redoStack = useRef<Presentation[]>([]);

  const selectedSlide =
  deck.slides[selectedSlideIndex] ?? deck.slides[0];

  function loadDeckFile(file: File) {
    const reader = new FileReader();

    reader.onload = () => {
      const text = String(reader.result);
      const parsed = JSON.parse(text) as Presentation;

      undoStack.current = [];
      redoStack.current = [];

      setDeck(parsed);
      setSelectedSlideIndex(0);
      setSelectedElementId(null);
    };

    reader.readAsText(file);
  }

  function rememberCurrentDeck() {
    undoStack.current.push(cloneDeck(deck));

    if (undoStack.current.length > 100) {
      undoStack.current.shift();
    }

    redoStack.current = [];
  }

  function commitDeck(
    update: (current: Presentation) => Presentation,
  ) {
    rememberCurrentDeck();
    setDeck(update);
  }

  function undo() {
    const previous = undoStack.current.pop();

    if (!previous) {
      return;
    }

    redoStack.current.push(cloneDeck(deck));

    setDeck(previous);

    setSelectedSlideIndex((index) =>
      Math.min(index, Math.max(0, previous.slides.length - 1)),
    );

    setSelectedElementId(null);
  }

  function redo() {
    const next = redoStack.current.pop();

    if (!next) {
      return;
    }

    undoStack.current.push(cloneDeck(deck));

    setDeck(next);

    setSelectedSlideIndex((index) =>
      Math.min(index, Math.max(0, next.slides.length - 1)),
    );

    setSelectedElementId(null);
  }

  function downloadDeck() {
    const blob = new Blob([JSON.stringify(deck, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${deck.metadata.title || "deck"}.deck.json`;
    link.click();

    URL.revokeObjectURL(url);
  }

  function startDrag(
    event: MouseEvent,
    slideIndex: number,
    element: TextElement,
  ) {
    event.stopPropagation();

    setSelectedElementId(element.id);

    rememberCurrentDeck();

    dragState.current = {
      slideIndex,
      elementId: element.id,
      startMouseX: event.clientX,
      startMouseY: event.clientY,
      startElementX: element.bounds.x,
      startElementY: element.bounds.y,
    };
  }

  function addSlide() {
    const newSlide = createBlankSlide(deck.slides.length + 1);

    commitDeck((current) => ({
      ...current,
      slides: [...current.slides, newSlide],
    }));

    setSelectedSlideIndex(deck.slides.length);
    setSelectedElementId(null);
  }

  function renameCurrentSlide(name: string) {
    commitDeck((current) =>
      renameSlideAt(current, selectedSlideIndex, name),
    );
  }

  function deleteCurrentSlide() {
    if (deck.slides.length <= 1) {
      return;
    }

    const nextSlideIndex =
      selectedSlideIndex === deck.slides.length - 1
        ? selectedSlideIndex - 1
        : selectedSlideIndex;

    commitDeck((current) => deleteSlideAt(current, selectedSlideIndex));
    setSelectedSlideIndex(nextSlideIndex);
    setSelectedElementId(null);
  }

  function deleteSelectedElement() {
    if (!selectedElementId) {
      return;
    }

    commitDeck((current) =>
      deleteElement(
        current,
        selectedSlideIndex,
        selectedElementId,
      ),
    );

    setSelectedElementId(null);
  }

  function duplicateCurrentSlide() {
    const sourceSlide = deck.slides[selectedSlideIndex];

    if (!sourceSlide) {
      return;
    }

    const duplicatedSlide = cloneSlide(sourceSlide);

    const newSlideIndex = selectedSlideIndex + 1;

    commitDeck((current) =>
      insertSlideAt(current, newSlideIndex, duplicatedSlide),
    );

    setSelectedSlideIndex(newSlideIndex);
    setSelectedElementId(null);
  }

  function addTextToCurrentSlide() {
    const newElement = createDefaultTextElement();

    commitDeck((current) =>
      addTextElement(current, selectedSlideIndex, newElement),
    );

    setSelectedElementId(newElement.id);
  }

  function startResize(
    event: MouseEvent,
    slideIndex: number,
    element: TextElement,
  ) {
    event.stopPropagation();

    setSelectedElementId(element.id);

    rememberCurrentDeck();

    resizeState.current = {
      slideIndex,
      elementId: element.id,
      startMouseX: event.clientX,
      startMouseY: event.clientY,
      startWidth: element.bounds.width,
      startHeight: element.bounds.height,
    };
  }

  function onMouseMove(event: MouseEvent) {
    const resize = resizeState.current;

    if (resize) {
      const dx = event.clientX - resize.startMouseX;
      const dy = event.clientY - resize.startMouseY;

      const nextWidth = Math.max(40, resize.startWidth + dx);
      const nextHeight = Math.max(24, resize.startHeight + dy);

      setDeck((current) =>
        resizeElement(
          current,
          resize.slideIndex,
          resize.elementId,
          nextWidth,
          nextHeight,
        ),
      );

      return;
    }

    const drag = dragState.current;

    if (!drag) {
      return;
    }

    const dx = event.clientX - drag.startMouseX;
    const dy = event.clientY - drag.startMouseY;

    const nextX = drag.startElementX + dx;
    const nextY = drag.startElementY + dy;

    setDeck((current) =>
      moveElement(current, drag.slideIndex, drag.elementId, nextX, nextY),
    );
  }

  function stopInteraction() {
    dragState.current = null;
    resizeState.current = null;
  }

  function updateSelectedText(value: string) {
    if (!selectedElementId) {
      return;
    }

    commitDeck((current) =>
      updateText(current, selectedSlideIndex, selectedElementId, value),
    );
  }

  function updateSelectedFontSize(value: number) {
    if (!selectedElementId) {
      return;
    }

    const safeValue = Number.isFinite(value)
      ? Math.max(4, Math.min(160, value))
      : 32;

    commitDeck((current) =>
      updateFontSize(
        current,
        selectedSlideIndex,
        selectedElementId,
        safeValue,
      ),
    );
  }

  function updateSelectedColor(value: string) {
    if (!selectedElementId) {
      return;
    }

    commitDeck((current) =>
      updateColor(
        current,
        selectedSlideIndex,
        selectedElementId,
        normalizeHexColor(value),
      ),
    );
  }

  
  const selectedTextElement = selectedSlide?.elements.find(
    (element) => element.id === selectedElementId && element.type === "Text",
  ) as TextElement | undefined;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) {
        return;
      }

      const key = event.key.toLowerCase();
      const commandKey = event.ctrlKey || event.metaKey;

      if (commandKey && key === "z" && event.shiftKey) {
        event.preventDefault();
        redo();
        return;
      }

      if (commandKey && key === "z") {
        event.preventDefault();
        undo();
        return;
      }

      if (commandKey && key === "y") {
        event.preventDefault();
        redo();
        return;
      }

      if (
        event.key === "ArrowUp" ||
        event.key === "ArrowDown" ||
        event.key === "ArrowLeft" ||
        event.key === "ArrowRight"
      ) {
        if (!selectedElementId) {
          return;
        }

        event.preventDefault();

        const step = event.shiftKey ? 10 : 1;

        let dx = 0;
        let dy = 0;

        if (event.key === "ArrowLeft") {
          dx = -step;
        }

        if (event.key === "ArrowRight") {
          dx = step;
        }

        if (event.key === "ArrowUp") {
          dy = -step;
        }

        if (event.key === "ArrowDown") {
          dy = step;
        }

        commitDeck((current) =>
          nudgeElement(
            current,
            selectedSlideIndex,
            selectedElementId,
            dx,
            dy,
          ),
        );

        return;
      }

      if (commandKey && key === "c") {
        if (!selectedElementId) {
          return;
        }

        const selectedElement = findElement(
          deck,
          selectedSlideIndex,
          selectedElementId,
        );

        if (!selectedElement) {
          return;
        }

        event.preventDefault();

        elementClipboard.current = cloneElementForClipboard(selectedElement);

        return;
      }

      if (commandKey && key === "v") {
        const copiedElement = elementClipboard.current;

        if (!copiedElement) {
          return;
        }

        event.preventDefault();

        const pastedElement = cloneElementWithOffset(copiedElement);

        commitDeck((current) =>
          addElementToSlide(
            current,
            selectedSlideIndex,
            pastedElement,
          ),
        );

        setSelectedElementId(pastedElement.id);

        return;
      }

      if (event.key !== "Delete" && event.key !== "Backspace") {
        return;
      }

      if (!selectedElementId) {
        return;
      }

      event.preventDefault();

      commitDeck((current) =>
        deleteElement(
          current,
          selectedSlideIndex,
          selectedElementId,
        ),
      );

      setSelectedElementId(null);
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [deck, selectedElementId, selectedSlideIndex]);

  return (
    <main
      className="app"
      onMouseMove={onMouseMove}
      onMouseUp={stopInteraction}
      onMouseLeave={stopInteraction}
    >
      <aside className="sidebar">
        <h1>DeckMaster Editor</h1>

        <label className="fileButton">
          Load .deck.json
          <input
            type="file"
            accept=".json,.deck"
            onChange={(event) => {
              const file = event.target.files?.[0];

              if (file) {
                loadDeckFile(file);
              }
            }}
          />
        </label>

        <button onClick={downloadDeck}>Download .deck.json</button>
        <button onClick={undo}>Undo</button>
        <button onClick={redo}>Redo</button>
        <button onClick={addSlide}>Add slide</button>
        <button onClick={duplicateCurrentSlide}>Duplicate slide</button>
        <button
          onClick={deleteCurrentSlide}
          disabled={deck.slides.length <= 1}
        >
          Delete slide
        </button>
        <button onClick={addTextToCurrentSlide}>Add text</button>

        <h2>Slides</h2>

        <div className="slideList">
          {deck.slides.map((slide, index) => (
            <button
              key={slide.id}
              className={index === selectedSlideIndex ? "active" : ""}
              onClick={() => {
                setSelectedSlideIndex(index);
                setSelectedElementId(null);
              }}
            >
              {index + 1}. {slide.name ?? "Untitled"}
            </button>
          ))}
        </div>

        <h2>Selected slide</h2>

        {selectedSlide ? (
          <div className="selectedControls">
            <label>
              Slide name
              <input
                className="textInput"
                type="text"
                value={selectedSlide.name ?? ""}
                onChange={(event) => renameCurrentSlide(event.target.value)}
              />
            </label>

            <button
              className="dangerButton"
              onClick={deleteCurrentSlide}
              disabled={deck.slides.length <= 1}
            >
              Delete slide
            </button>
          </div>
        ) : (
          <p className="muted">No slide selected.</p>
        )}

        <h2>Selected text</h2>

        {selectedTextElement ? (
          <div className="selectedControls">
            <label>
              Text
              <textarea
                value={selectedTextElement.text}
                onChange={(event) => updateSelectedText(event.target.value)}
              />
            </label>

            <label>
              Font size
              <input
                className="numberInput"
                type="number"
                min={4}
                max={160}
                step={1}
                value={selectedTextElement.font_size}
                onChange={(event) =>
                  updateSelectedFontSize(Number(event.target.value))
                }
              />
            </label>

            <label>
              Color
              <input
                className="colorInput"
                type="color"
                value={normalizeHexColor(selectedTextElement.color.value)}
                onChange={(event) => updateSelectedColor(event.target.value)}
              />
            </label>

            <button
              className="dangerButton"
              onClick={deleteSelectedElement}
            >
              Delete selected element
            </button>

          </div>
        ) : (
          <p className="muted">Click a text box.</p>
        )}
      </aside>

      <section
        className="workspace"
        onMouseDown={() => setSelectedElementId(null)}
      >
      {selectedSlide ? (
        <div
          className="slideCanvas"
          style={{
            width: selectedSlide.size.width,
            height: selectedSlide.size.height,
            background: deck.theme.background.value,
          }}
        >
          {selectedSlide.elements.map((element) => {
            if (element.type !== "Text") {
              return null;
            }

            const selected = selectedElementId === element.id;

            return (
              <div
                key={element.id}
                className={`textBox ${selected ? "selected" : ""}`}
                style={{
                  left: element.bounds.x,
                  top: element.bounds.y,
                  width: element.bounds.width,
                  height: element.bounds.height,
                  fontSize: element.font_size,
                  color: element.color.value,
                }}
                onMouseDown={(event) =>
                  startDrag(event, selectedSlideIndex, element)
                }
              >
                {element.text}

                {selected ? (
                  <div
                    className="resizeHandle"
                    onMouseDown={(event) =>
                      startResize(event, selectedSlideIndex, element)
                    }
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="muted">No slide selected.</p>
      )}
      </section>
    </main>
  );
}