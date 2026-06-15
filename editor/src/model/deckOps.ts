import type {
  Element,
  ImageElement,
  Presentation,
  Slide,
  TextElement,
} from "./types";

export function createBlankSlide(slideNumber: number): Slide {
  return {
    id: crypto.randomUUID(),
    name: `Slide ${slideNumber}`,
    size: {
      width: 960,
      height: 540,
    },
    elements: [],
  };
}

export function createDefaultTextElement(): TextElement {
  return {
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
}

export function createImageElement(
  src: string,
  alt: string | null,
): ImageElement {
  return {
    type: "Image",
    id: crypto.randomUUID(),
    bounds: {
      x: 120,
      y: 120,
      width: 320,
      height: 180,
    },
    src,
    alt,
  };
}

export function moveElement(
  deck: Presentation,
  slideIndex: number,
  elementId: string,
  x: number,
  y: number,
): Presentation {
  return updateElement(deck, slideIndex, elementId, (element) => ({
    ...element,
    bounds: {
      ...element.bounds,
      x,
      y,
    },
  }));
}

export function resizeElement(
  deck: Presentation,
  slideIndex: number,
  elementId: string,
  width: number,
  height: number,
): Presentation {
  return updateElement(deck, slideIndex, elementId, (element) => ({
    ...element,
    bounds: {
      ...element.bounds,
      width,
      height,
    },
  }));
}

export function nudgeElement(
  deck: Presentation,
  slideIndex: number,
  elementId: string,
  dx: number,
  dy: number,
): Presentation {
  return updateElement(deck, slideIndex, elementId, (element) => ({
    ...element,
    bounds: {
      ...element.bounds,
      x: element.bounds.x + dx,
      y: element.bounds.y + dy,
    },
  }));
}

export function updateText(
  deck: Presentation,
  slideIndex: number,
  elementId: string,
  text: string,
): Presentation {
  return updateElement(deck, slideIndex, elementId, (element) => {
    if (element.type !== "Text") {
      return element;
    }

    return {
      ...element,
      text,
    };
  });
}

export function updateFontSize(
  deck: Presentation,
  slideIndex: number,
  elementId: string,
  fontSize: number,
): Presentation {
  return updateElement(deck, slideIndex, elementId, (element) => {
    if (element.type !== "Text") {
      return element;
    }

    return {
      ...element,
      font_size: fontSize,
    };
  });
}

export function updateColor(
  deck: Presentation,
  slideIndex: number,
  elementId: string,
  color: string,
): Presentation {
  return updateElement(deck, slideIndex, elementId, (element) => {
    if (element.type !== "Text") {
      return element;
    }

    return {
      ...element,
      color: {
        value: color,
      },
    };
  });
}

export function addTextElement(
  deck: Presentation,
  slideIndex: number,
  element: TextElement,
): Presentation {
  return addElementToSlide(deck, slideIndex, element);
}

export function addElementToSlide(
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

export function deleteElement(
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

export function findElement(
  deck: Presentation,
  slideIndex: number,
  elementId: string,
): Element | null {
  const slide = deck.slides[slideIndex];

  if (!slide) {
    return null;
  }

  return slide.elements.find((element) => element.id === elementId) ?? null;
}

export function insertSlideAt(
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

export function renameSlideAt(
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

export function deleteSlideAt(
  deck: Presentation,
  indexToDelete: number,
): Presentation {
  return {
    ...deck,
    slides: deck.slides.filter((_, index) => index !== indexToDelete),
  };
}

export function cloneSlide(slide: Slide): Slide {
  return {
    ...slide,
    id: crypto.randomUUID(),
    name: slide.name ? `${slide.name} Copy` : "Untitled Copy",
    elements: slide.elements.map(cloneElement),
  };
}

export function cloneElement(element: Element): Element {
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

  return {
    ...element,
    id: crypto.randomUUID(),
    bounds: {
      ...element.bounds,
    },
  };
}

export function cloneElementForClipboard(element: Element): Element {
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

  return {
    ...element,
    bounds: {
      ...element.bounds,
    },
  };
}

export function cloneElementWithOffset(element: Element): Element {
  const cloned = cloneElement(element);

  return {
    ...cloned,
    bounds: {
      ...cloned.bounds,
      x: cloned.bounds.x + 24,
      y: cloned.bounds.y + 24,
    },
  };
}

export function normalizeHexColor(value: string): string {
  const trimmed = value.trim();

  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) {
    return `#${trimmed.toUpperCase()}`;
  }

  return "#111111";
}

export function cloneDeck(deck: Presentation): Presentation {
  return JSON.parse(JSON.stringify(deck)) as Presentation;
}

function updateElement(
  deck: Presentation,
  slideIndex: number,
  elementId: string,
  update: (element: Element) => Element,
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

          return update(element);
        }),
      };
    }),
  };
}