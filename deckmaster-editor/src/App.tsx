import { useRef, useState } from "react";
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

export default function App() {
  const [deck, setDeck] = useState<Presentation>(initialDeck);
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(
    null,
  );

  const dragState = useRef<DragState | null>(null);

  const selectedSlide = deck.slides[selectedSlideIndex];

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
    event: React.MouseEvent,
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

  function onMouseMove(event: React.MouseEvent) {
    const drag = dragState.current;

    if (!drag) {
      return;
    }

    const dx = event.clientX - drag.startMouseX;
    const dy = event.clientY - drag.startMouseY;

    const nextX = drag.startElementX + dx;
    const nextY = drag.startElementY + dy;

    setDeck((current) => moveElement(current, drag.slideIndex, drag.elementId, nextX, nextY));
  }

  function stopDrag() {
    dragState.current = null;
  }

  function updateSelectedText(value: string) {
    if (!selectedElementId) {
      return;
    }

    setDeck((current) =>
      updateText(current, selectedSlideIndex, selectedElementId, value),
    );
  }

  const selectedTextElement = selectedSlide?.elements.find(
    (element) => element.id === selectedElementId && element.type === "Text",
  ) as TextElement | undefined;

  return (
    <main
      className="app"
      onMouseMove={onMouseMove}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
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

        <h2>Selected text</h2>

        {selectedTextElement ? (
          <textarea
            value={selectedTextElement.text}
            onChange={(event) => updateSelectedText(event.target.value)}
          />
        ) : (
          <p className="muted">Click a text box.</p>
        )}
      </aside>

      <section className="workspace" onMouseDown={() => setSelectedElementId(null)}>
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
              </div>
            );
          })}
        </div>
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