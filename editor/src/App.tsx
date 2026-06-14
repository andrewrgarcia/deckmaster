import { useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import "./App.css";

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Color = {
  value: string;
};

type TextElement = {
  type: "Text";
  id: string;
  bounds: Rect;
  text: string;
  font_size: number;
  color: Color;
};

type Element = TextElement;

type Slide = {
  id: string;
  name: string | null;
  size: {
    width: number;
    height: number;
  };
  elements: Element[];
};

type Presentation = {
  id: string;
  metadata: {
    title: string;
    author: string | null;
  };
  theme: {
    name: string;
    background: Color;
    foreground: Color;
  };
  assets: unknown[];
  slides: Slide[];
};

const initialDeck: Presentation = {
  id: "00000000-0000-0000-0000-000000000001",
  metadata: {
    title: "Editor Demo",
    author: "Andrew",
  },
  theme: {
    name: "Default",
    background: { value: "#FFFFFF" },
    foreground: { value: "#111111" },
  },
  assets: [],
  slides: [
    {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Slide 1",
      size: {
        width: 960,
        height: 540,
      },
      elements: [
        {
          type: "Text",
          id: "00000000-0000-0000-0000-000000000003",
          bounds: {
            x: 100,
            y: 200,
            width: 500,
            height: 80,
          },
          text: "Drag me around",
          font_size: 32,
          color: {
            value: "#111111",
          },
        },
      ],
    },
  ],
};

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

  const selectedSlide =
  deck.slides[selectedSlideIndex] ?? deck.slides[0];

  function loadDeckFile(file: File) {
    const reader = new FileReader();

    reader.onload = () => {
      const text = String(reader.result);
      const parsed = JSON.parse(text) as Presentation;

      setDeck(parsed);
      setSelectedSlideIndex(0);
      setSelectedElementId(null);
    };

    reader.readAsText(file);
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
    const slideNumber = deck.slides.length + 1;

    const newSlide: Slide = {
      id: crypto.randomUUID(),
      name: `Slide ${slideNumber}`,
      size: {
        width: 960,
        height: 540,
      },
      elements: [],
    };

    setDeck((current) => ({
      ...current,
      slides: [...current.slides, newSlide],
    }));

    setSelectedSlideIndex(deck.slides.length);
    setSelectedElementId(null);
  }

  function renameCurrentSlide(name: string) {
    setDeck((current) =>
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

    setDeck((current) => deleteSlideAt(current, selectedSlideIndex));
    setSelectedSlideIndex(nextSlideIndex);
    setSelectedElementId(null);
  }

  function deleteSelectedElement() {
    if (!selectedElementId) {
      return;
    }

    setDeck((current) =>
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

    setDeck((current) =>
      insertSlideAt(current, newSlideIndex, duplicatedSlide),
    );

    setSelectedSlideIndex(newSlideIndex);
    setSelectedElementId(null);
  }

  function addTextToCurrentSlide() {
    const newElement: TextElement = {
      type: "Text",
      id: crypto.randomUUID(),
      bounds: {
        x: 120,
        y: 120,
        width: 420,
        height: 80,
      },
      text: "New text",
      font_size: 32,
      color: {
        value: "#111111",
      },
    };

    setDeck((current) =>
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

    setDeck((current) =>
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

    setDeck((current) =>
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

    setDeck((current) =>
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

        setDeck((current) =>
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

      setDeck((current) =>
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

function moveElement(
  deck: Presentation,
  slideIndex: number,
  elementId: string,
  x: number,
  y: number,
): Presentation {
  return {
    ...deck,
    slides: deck.slides.map((slide, index) => {
      if (index !== slideIndex) {
        return slide;
      }

      return {
        ...slide,
        elements: slide.elements.map((element) => {
          if (element.id !== elementId) {
            return element;
          }

          return {
            ...element,
            bounds: {
              ...element.bounds,
              x,
              y,
            },
          };
        }),
      };
    }),
  };
}

function resizeElement(
  deck: Presentation,
  slideIndex: number,
  elementId: string,
  width: number,
  height: number,
): Presentation {
  return {
    ...deck,
    slides: deck.slides.map((slide, index) => {
      if (index !== slideIndex) {
        return slide;
      }

      return {
        ...slide,
        elements: slide.elements.map((element) => {
          if (element.id !== elementId) {
            return element;
          }

          return {
            ...element,
            bounds: {
              ...element.bounds,
              width,
              height,
            },
          };
        }),
      };
    }),
  };
}

function updateText(
  deck: Presentation,
  slideIndex: number,
  elementId: string,
  text: string,
): Presentation {
  return {
    ...deck,
    slides: deck.slides.map((slide, index) => {
      if (index !== slideIndex) {
        return slide;
      }

      return {
        ...slide,
        elements: slide.elements.map((element) => {
          if (element.id !== elementId || element.type !== "Text") {
            return element;
          }

          return {
            ...element,
            text,
          };
        }),
      };
    }),
  };
}

function addTextElement(
  deck: Presentation,
  slideIndex: number,
  element: TextElement,
): Presentation {
  return {
    ...deck,
    slides: deck.slides.map((slide, index) => {
      if (index !== slideIndex) {
        return slide;
      }

      return {
        ...slide,
        elements: [...slide.elements, element],
      };
    }),
  };
}

function updateFontSize(
  deck: Presentation,
  slideIndex: number,
  elementId: string,
  fontSize: number,
): Presentation {
  return {
    ...deck,
    slides: deck.slides.map((slide, index) => {
      if (index !== slideIndex) {
        return slide;
      }

      return {
        ...slide,
        elements: slide.elements.map((element) => {
          if (element.id !== elementId || element.type !== "Text") {
            return element;
          }

          return {
            ...element,
            font_size: fontSize,
          };
        }),
      };
    }),
  };
}

function updateColor(
  deck: Presentation,
  slideIndex: number,
  elementId: string,
  color: string,
): Presentation {
  return {
    ...deck,
    slides: deck.slides.map((slide, index) => {
      if (index !== slideIndex) {
        return slide;
      }

      return {
        ...slide,
        elements: slide.elements.map((element) => {
          if (element.id !== elementId || element.type !== "Text") {
            return element;
          }

          return {
            ...element,
            color: {
              value: color,
            },
          };
        }),
      };
    }),
  };
}

function normalizeHexColor(value: string): string {
  const trimmed = value.trim();

  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) {
    return `#${trimmed.toUpperCase()}`;
  }

  return "#111111";
}

function insertSlideAt(
  deck: Presentation,
  index: number,
  slide: Slide,
): Presentation {
  const slides = [...deck.slides];

  slides.splice(index, 0, slide);

  return {
    ...deck,
    slides,
  };
}

function cloneSlide(slide: Slide): Slide {
  return {
    ...slide,
    id: crypto.randomUUID(),
    name: slide.name ? `${slide.name} Copy` : "Untitled Copy",
    elements: slide.elements.map(cloneElement),
  };
}

function cloneElement(element: Element): Element {
  if (element.type === "Text") {
    return {
      ...element,
      id: crypto.randomUUID(),
      bounds: {
        ...element.bounds,
      },
      color: {
        ...element.color,
      },
    };
  }

  return element;
}


function renameSlideAt(
  deck: Presentation,
  slideIndex: number,
  name: string,
): Presentation {
  return {
    ...deck,
    slides: deck.slides.map((slide, index) => {
      if (index !== slideIndex) {
        return slide;
      }

      return {
        ...slide,
        name,
      };
    }),
  };
}

function deleteSlideAt(
  deck: Presentation,
  indexToDelete: number,
): Presentation {
  return {
    ...deck,
    slides: deck.slides.filter((_, index) => index !== indexToDelete),
  };
}

function deleteElement(
  deck: Presentation,
  slideIndex: number,
  elementId: string,
): Presentation {
  return {
    ...deck,
    slides: deck.slides.map((slide, index) => {
      if (index !== slideIndex) {
        return slide;
      }

      return {
        ...slide,
        elements: slide.elements.filter(
          (element) => element.id !== elementId,
        ),
      };
    }),
  };
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();

  return (
    tagName === "input" ||
    tagName === "textarea" ||
    target.isContentEditable
  );
}

function findElement(
  deck: Presentation,
  slideIndex: number,
  elementId: string,
): Element | null {
  const slide = deck.slides[slideIndex];

  if (!slide) {
    return null;
  }

  return (
    slide.elements.find((element) => element.id === elementId) ?? null
  );
}

function addElementToSlide(
  deck: Presentation,
  slideIndex: number,
  element: Element,
): Presentation {
  return {
    ...deck,
    slides: deck.slides.map((slide, index) => {
      if (index !== slideIndex) {
        return slide;
      }

      return {
        ...slide,
        elements: [...slide.elements, element],
      };
    }),
  };
}

function cloneElementForClipboard(element: Element): Element {
  if (element.type === "Text") {
    return {
      ...element,
      bounds: {
        ...element.bounds,
      },
      color: {
        ...element.color,
      },
    };
  }

  return element;
}

function cloneElementWithOffset(element: Element): Element {
  if (element.type === "Text") {
    return {
      ...element,
      id: crypto.randomUUID(),
      bounds: {
        ...element.bounds,
        x: element.bounds.x + 24,
        y: element.bounds.y + 24,
      },
      color: {
        ...element.color,
      },
    };
  }

  return element;
}

