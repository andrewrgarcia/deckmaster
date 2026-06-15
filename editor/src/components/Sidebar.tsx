import type { Presentation, Slide, TextElement } from "../model/types";
import { normalizeHexColor } from "../model/deckOps";

type SidebarProps = {
  deck: Presentation;
  selectedSlide: Slide | undefined;
  selectedSlideIndex: number;
  selectedTextElement: TextElement | undefined;

  onLoadDeckFile: (file: File) => void;
  onDownloadDeck: () => void;
  onUndo: () => void;
  onRedo: () => void;

  onAddSlide: () => void;
  onDuplicateCurrentSlide: () => void;
  onDeleteCurrentSlide: () => void;
  onAddTextToCurrentSlide: () => void;

  onSelectSlide: (index: number) => void;
  onRenameCurrentSlide: (name: string) => void;

  onUpdateSelectedFontSize: (value: number) => void;
  onUpdateSelectedColor: (value: string) => void;
  onDeleteSelectedElement: () => void;
};

export function Sidebar({
  deck,
  selectedSlide,
  selectedSlideIndex,
  selectedTextElement,
  onLoadDeckFile,
  onDownloadDeck,
  onUndo,
  onRedo,
  onAddSlide,
  onDuplicateCurrentSlide,
  onDeleteCurrentSlide,
  onAddTextToCurrentSlide,
  onSelectSlide,
  onRenameCurrentSlide,
  onUpdateSelectedFontSize,
  onUpdateSelectedColor,
  onDeleteSelectedElement,
}: SidebarProps) {
  return (
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
              onLoadDeckFile(file);
            }
          }}
        />
      </label>

      <button onClick={onDownloadDeck}>Download .deck.json</button>
      <button onClick={onUndo}>Undo</button>
      <button onClick={onRedo}>Redo</button>
      <button onClick={onAddSlide}>Add slide</button>
      <button onClick={onDuplicateCurrentSlide}>Duplicate slide</button>
      <button onClick={onDeleteCurrentSlide} disabled={deck.slides.length <= 1}>
        Delete slide
      </button>
      <button onClick={onAddTextToCurrentSlide}>Add text</button>

      <h2>Slides</h2>

      <div className="slideList">
        {deck.slides.map((slide, index) => (
          <button
            key={slide.id}
            className={index === selectedSlideIndex ? "active" : ""}
            onClick={() => onSelectSlide(index)}
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
              onChange={(event) => onRenameCurrentSlide(event.target.value)}
            />
          </label>

          <button
            className="dangerButton"
            onClick={onDeleteCurrentSlide}
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
          <p className="muted">
            Double-click the text box to edit text directly.
          </p>

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
                onUpdateSelectedFontSize(Number(event.target.value))
              }
            />
          </label>

          <label>
            Color
            <input
              className="colorInput"
              type="color"
              value={normalizeHexColor(selectedTextElement.color.value)}
              onChange={(event) => onUpdateSelectedColor(event.target.value)}
            />
          </label>

          <button className="dangerButton" onClick={onDeleteSelectedElement}>
            Delete selected element
          </button>
        </div>
      ) : (
        <p className="muted">Click a text box.</p>
      )}
    </aside>
  );
}