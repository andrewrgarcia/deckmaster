import { useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import "./App.css";

import { Sidebar } from "./components/Sidebar";
import { SlideCanvas } from "./components/SlideCanvas";
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
import type { Element, Presentation, TextElement } from "./model/types";
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
  const [editingElementId, setEditingElementId] = useState<string | null>(
    null,
  );
  const [editingText, setEditingText] = useState("");

  const editorInput = useRef<HTMLTextAreaElement | null>(null);
  const dragState = useRef<DragState | null>(null);
  const resizeState = useRef<ResizeState | null>(null);
  const elementClipboard = useRef<Element | null>(null);
  const undoStack = useRef<Presentation[]>([]);
  const redoStack = useRef<Presentation[]>([]);

  const selectedSlide = deck.slides[selectedSlideIndex] ?? deck.slides[0];

  const selectedTextElement = selectedSlide?.elements.find(
    (element) => element.id === selectedElementId && element.type === "Text",
  ) as TextElement | undefined;

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
      setEditingElementId(null);
      setEditingText("");
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

  function commitDeck(update: (current: Presentation) => Presentation) {
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
    setEditingElementId(null);
    setEditingText("");
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
    setEditingElementId(null);
    setEditingText("");
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

  function addSlide() {
    const newSlide = createBlankSlide(deck.slides.length + 1);

    commitDeck((current) => ({
      ...current,
      slides: [...current.slides, newSlide],
    }));

    setSelectedSlideIndex(deck.slides.length);
    setSelectedElementId(null);
    setEditingElementId(null);
    setEditingText("");
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
    setEditingElementId(null);
    setEditingText("");
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
    setEditingElementId(null);
    setEditingText("");
  }

  function renameCurrentSlide(name: string) {
    commitDeck((current) => renameSlideAt(current, selectedSlideIndex, name));
  }

  function addTextToCurrentSlide() {
    const newElement = createDefaultTextElement();

    commitDeck((current) =>
      addTextElement(current, selectedSlideIndex, newElement),
    );

    setSelectedElementId(newElement.id);
    setEditingElementId(null);
    setEditingText("");
  }

  function deleteSelectedElement() {
    if (!selectedElementId) {
      return;
    }

    commitDeck((current) =>
      deleteElement(current, selectedSlideIndex, selectedElementId),
    );

    setSelectedElementId(null);
    setEditingElementId(null);
    setEditingText("");
  }

  function startDrag(
    event: MouseEvent,
    slideIndex: number,
    element: TextElement,
  ) {
    event.stopPropagation();

    setSelectedElementId(element.id);
    setEditingElementId(null);
    setEditingText("");

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

  function startResize(
    event: MouseEvent,
    slideIndex: number,
    element: TextElement,
  ) {
    event.stopPropagation();

    setSelectedElementId(element.id);
    setEditingElementId(null);
    setEditingText("");

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

  function startEditingText(event: MouseEvent, element: TextElement) {
    event.stopPropagation();

    setSelectedElementId(element.id);
    setEditingElementId(element.id);
    setEditingText(element.text);

    rememberCurrentDeck();
  }

  function finishEditingText() {
    if (!editingElementId) {
      return;
    }

    const elementId = editingElementId;
    const nextText = editingText;

    setDeck((current) =>
      updateText(current, selectedSlideIndex, elementId, nextText),
    );

    setEditingElementId(null);
    setEditingText("");
  }

  function cancelEditingText() {
    setEditingElementId(null);
    setEditingText("");
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

  useEffect(() => {
    if (!editingElementId || !editorInput.current) {
      return;
    }

    editorInput.current.focus();
    editorInput.current.select();
  }, [editingElementId]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (editingElementId) {
        if (event.key === "Escape") {
          event.preventDefault();
          cancelEditingText();
        }

        return;
      }

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
          nudgeElement(current, selectedSlideIndex, selectedElementId, dx, dy),
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
          addElementToSlide(current, selectedSlideIndex, pastedElement),
        );

        setSelectedElementId(pastedElement.id);
        setEditingElementId(null);
        setEditingText("");

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
        deleteElement(current, selectedSlideIndex, selectedElementId),
      );

      setSelectedElementId(null);
      setEditingElementId(null);
      setEditingText("");
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [deck, selectedElementId, selectedSlideIndex, editingElementId]);

  return (
    <main
      className="app"
      onMouseMove={onMouseMove}
      onMouseUp={stopInteraction}
      onMouseLeave={stopInteraction}
    >
      <Sidebar
        deck={deck}
        selectedSlide={selectedSlide}
        selectedSlideIndex={selectedSlideIndex}
        selectedTextElement={selectedTextElement}
        onLoadDeckFile={loadDeckFile}
        onDownloadDeck={downloadDeck}
        onUndo={undo}
        onRedo={redo}
        onAddSlide={addSlide}
        onDuplicateCurrentSlide={duplicateCurrentSlide}
        onDeleteCurrentSlide={deleteCurrentSlide}
        onAddTextToCurrentSlide={addTextToCurrentSlide}
        onSelectSlide={(index) => {
          setSelectedSlideIndex(index);
          setSelectedElementId(null);
          setEditingElementId(null);
          setEditingText("");
        }}
        onRenameCurrentSlide={renameCurrentSlide}
        onUpdateSelectedFontSize={updateSelectedFontSize}
        onUpdateSelectedColor={updateSelectedColor}
        onDeleteSelectedElement={deleteSelectedElement}
      />

      <SlideCanvas
        selectedSlide={selectedSlide}
        selectedSlideIndex={selectedSlideIndex}
        backgroundColor={deck.theme.background.value}
        selectedElementId={selectedElementId}
        editingElementId={editingElementId}
        editingText={editingText}
        editorInput={editorInput}
        onWorkspaceMouseDown={() => {
          if (editingElementId) {
            finishEditingText();
          }

          setSelectedElementId(null);
        }}
        onStartDrag={startDrag}
        onStartResize={startResize}
        onStartEditingText={startEditingText}
        onEditingTextChange={setEditingText}
        onFinishEditingText={finishEditingText}
      />
    </main>
  );
}