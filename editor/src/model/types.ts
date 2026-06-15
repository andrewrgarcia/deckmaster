export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Color = {
  value: string;
};

export type TextElement = {
  type: "Text";
  id: string;
  bounds: Rect;
  text: string;
  font_size: number;
  color: Color;
};

export type ImageElement = {
  type: "Image";
  id: string;
  bounds: Rect;
  src: string;
  alt: string | null;
};

export type Element = TextElement | ImageElement;

export type Slide = {
  id: string;
  name: string | null;
  size: {
    width: number;
    height: number;
  };
  elements: Element[];
};

export type Presentation = {
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