# DeckMaster deck.json examples

Three complete, valid documents. Each one would pass
`scripts/validate_deck.py` as-is (the image example assumes a real PNG
exists at the referenced asset path).

## Example 1: single-slide, text only

The simplest valid deck: one slide, two text elements, no images, no
assets array entries needed.

```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "metadata": {
    "title": "Q3 Revenue Update",
    "author": null
  },
  "theme": {
    "name": "Default",
    "background": { "value": "#FFFFFF" },
    "foreground": { "value": "#111111" }
  },
  "assets": [],
  "slides": [
    {
      "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "name": "Title",
      "size": { "width": 960.0, "height": 540.0 },
      "elements": [
        {
          "type": "Text",
          "id": "3c2f1e2a-7a4c-4b1b-9b2a-1a2b3c4d5e6f",
          "bounds": { "x": 100.0, "y": 180.0, "width": 760.0, "height": 100.0 },
          "text": "Q3 Revenue Update",
          "font_size": 44.0,
          "color": { "value": "#111111" }
        },
        {
          "type": "Text",
          "id": "5d4c3b2a-1f0e-4d9c-8b7a-6e5d4c3b2a1f",
          "bounds": { "x": 100.0, "y": 300.0, "width": 760.0, "height": 60.0 },
          "text": "Revenue grew 24% quarter over quarter",
          "font_size": 24.0,
          "color": { "value": "#3F4D68" }
        }
      ]
    }
  ]
}
```

Notice the title and subtitle are two separate Text elements stacked
vertically with a gap (title ends around y=280, subtitle starts at
y=300), not one element with a line break in the middle.

## Example 2: multiple slides

Same shape, repeated. Each slide gets its own fresh `id` and each
element across the whole document gets its own fresh `id` -- nothing is
reused between slide 1 and slide 2 here.

```json
{
  "id": "6fa459ea-ee8a-3ca4-894e-db77e160355e",
  "metadata": {
    "title": "Onboarding Walkthrough",
    "author": "Support Team"
  },
  "theme": {
    "name": "Default",
    "background": { "value": "#FFFFFF" },
    "foreground": { "value": "#111111" }
  },
  "assets": [],
  "slides": [
    {
      "id": "16fd2706-8baf-433b-82eb-8c7fada847da",
      "name": "Welcome",
      "size": { "width": 960.0, "height": 540.0 },
      "elements": [
        {
          "type": "Text",
          "id": "a1a2a3a4-a5a6-4a7a-8a9a-aaabacadaeaf",
          "bounds": { "x": 80.0, "y": 200.0, "width": 800.0, "height": 80.0 },
          "text": "Welcome to the Team",
          "font_size": 40.0,
          "color": { "value": "#111111" }
        }
      ]
    },
    {
      "id": "b4b5b6b7-b8b9-4bab-8bcb-dbeacafa0b0b",
      "name": "Step 1",
      "size": { "width": 960.0, "height": 540.0 },
      "elements": [
        {
          "type": "Text",
          "id": "c1c2c3c4-c5c6-4c7c-8c9c-cacbcccdcecf",
          "bounds": { "x": 80.0, "y": 70.0, "width": 800.0, "height": 70.0 },
          "text": "Step 1: Set up your accounts",
          "font_size": 34.0,
          "color": { "value": "#111111" }
        },
        {
          "type": "Text",
          "id": "d1d2d3d4-d5d6-4d7d-8d9d-dadbdcdddedf",
          "bounds": { "x": 80.0, "y": 170.0, "width": 760.0, "height": 200.0 },
          "text": "Create your email, Slack, and calendar accounts using the credentials in your welcome packet.",
          "font_size": 22.0,
          "color": { "value": "#2A3345" }
        }
      ]
    }
  ]
}
```

## Example 3: with an image

The Image element's `asset_id` matches an entry in the top-level
`assets[]` array, and that array entry's id is also the filename (minus
extension) the image bytes need to exist at: `assets/e2e3e4e5-....png`.

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "metadata": {
    "title": "Product Screenshot",
    "author": null
  },
  "theme": {
    "name": "Default",
    "background": { "value": "#FFFFFF" },
    "foreground": { "value": "#111111" }
  },
  "assets": [
    {
      "id": "e2e3e4e5-e6e7-4e8e-9e0e-e1e2e3e4e5e6",
      "media_type": "image/png",
      "alt": "Screenshot of the dashboard"
    }
  ],
  "slides": [
    {
      "id": "f1f2f3f4-f5f6-4f7f-8f9f-f0f1f2f3f4f5",
      "name": "Dashboard",
      "size": { "width": 960.0, "height": 540.0 },
      "elements": [
        {
          "type": "Text",
          "id": "12345678-1234-4234-8234-123456789012",
          "bounds": { "x": 80.0, "y": 60.0, "width": 800.0, "height": 60.0 },
          "text": "Here's the new dashboard",
          "font_size": 32.0,
          "color": { "value": "#111111" }
        },
        {
          "type": "Image",
          "id": "23456789-2345-4345-8345-234567890123",
          "bounds": { "x": 180.0, "y": 150.0, "width": 600.0, "height": 340.0 },
          "asset_id": "e2e3e4e5-e6e7-4e8e-9e0e-e1e2e3e4e5e6",
          "alt": "Screenshot of the dashboard"
        }
      ]
    }
  ]
}
```

For this deck to actually pack/validate successfully, a real PNG file
needs to exist at `assets/e2e3e4e5-e6e7-4e8e-9e0e-e1e2e3e4e5e6.png`
alongside this `deck.json`. If you don't have an actual image to put
there, leave the Image element and its assets[] entry out entirely
rather than writing this shape with no backing file -- see "Why this
format is easy to write" in SKILL.md.
