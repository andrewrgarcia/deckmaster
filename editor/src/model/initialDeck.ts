import type { Presentation } from "./types";

export const initialDeck: Presentation = {
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