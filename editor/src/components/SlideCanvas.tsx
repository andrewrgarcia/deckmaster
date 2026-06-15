import type { MouseEvent, RefObject } from "react";
import type { Slide, TextElement } from "../model/types";

type SlideCanvasProps = {
  selectedSlide: Slide | undefined;
  selectedSlideIndex: number;
  backgroundColor: string;

  selectedElementId: string | null;
  editingElementId: string | null;
  editingText: string;
  editorInput: RefObject<HTMLTextAreaElement | null>;

  onWorkspaceMouseDown: () => void;
  onStartDrag: (
    event: MouseEvent,
    slideIndex: number,
    element: TextElement,
  ) => void;
  onStartResize: (
    event: MouseEvent,
    slideIndex: number,
    element: TextElement,
  ) => void;
  onStartEditingText: (
    event: MouseEvent,
    element: TextElement,
  ) => void;
  onEditingTextChange: (value: string) => void;
  onFinishEditingText: () => void;
};

export function SlideCanvas({
  selectedSlide,
  selectedSlideIndex,
  backgroundColor,
  selectedElementId,
  editingElementId,
  editingText,
  editorInput,
  onWorkspaceMouseDown,
  onStartDrag,
  onStartResize,
  onStartEditingText,
  onEditingTextChange,
  onFinishEditingText,
}: SlideCanvasProps) {
  return (
    <section className="workspace" onMouseDown={onWorkspaceMouseDown}>
      {selectedSlide ? (
        <div
          className="slideCanvas"
          style={{
            width: selectedSlide.size.width,
            height: selectedSlide.size.height,
            background: backgroundColor,
          }}
        >
          {selectedSlide.elements.map((element) => {
            if (element.type !== "Text") {
              return null;
            }

            const selected = selectedElementId === element.id;
            const editing = editingElementId === element.id;

            return (
              <div
                key={element.id}
                className={`textBox ${selected ? "selected" : ""} ${
                  editing ? "editing" : ""
                }`}
                style={{
                  left: element.bounds.x,
                  top: element.bounds.y,
                  width: element.bounds.width,
                  height: element.bounds.height,
                  fontSize: element.font_size,
                  color: element.color.value,
                }}
                onMouseDown={(event) => {
                  if (editing) {
                    event.stopPropagation();
                    return;
                  }

                  onStartDrag(event, selectedSlideIndex, element);
                }}
                onDoubleClick={(event) => onStartEditingText(event, element)}
              >
                {editing ? (
                  <textarea
                    ref={editorInput}
                    className="inlineTextEditor"
                    value={editingText}
                    onChange={(event) =>
                      onEditingTextChange(event.target.value)
                    }
                    onMouseDown={(event) => event.stopPropagation()}
                    onBlur={onFinishEditingText}
                  />
                ) : (
                  element.text
                )}

                {selected && !editing ? (
                  <div
                    className="resizeHandle"
                    onMouseDown={(event) =>
                      onStartResize(event, selectedSlideIndex, element)
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
  );
}