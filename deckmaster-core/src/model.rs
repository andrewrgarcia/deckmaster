use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Presentation {
    pub id: Uuid,
    pub metadata: Metadata,
    pub theme: Theme,
    pub assets: Vec<Asset>,
    pub slides: Vec<Slide>,
}

impl Presentation {
    pub fn new(title: impl Into<String>) -> Self {
        Self {
            id: Uuid::new_v4(),
            metadata: Metadata {
                title: title.into(),
                author: None,
            },
            theme: Theme::default(),
            assets: vec![],
            slides: vec![],
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Metadata {
    pub title: String,
    pub author: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Theme {
    pub name: String,
    pub background: Color,
    pub foreground: Color,
}

impl Default for Theme {
    fn default() -> Self {
        Self {
            name: "Default".to_string(),
            background: Color::hex("#FFFFFF"),
            foreground: Color::hex("#111111"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Slide {
    pub id: Uuid,
    pub name: Option<String>,
    pub size: SlideSize,
    pub elements: Vec<Element>,
}

impl Slide {
    pub fn new(name: impl Into<Option<String>>) -> Self {
        Self {
            id: Uuid::new_v4(),
            name: name.into(),
            size: SlideSize::widescreen(),
            elements: vec![],
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SlideSize {
    pub width: f32,
    pub height: f32,
}

impl SlideSize {
    pub fn widescreen() -> Self {
        Self {
            // Canonical DeckMaster units are points.
            // 16:9 widescreen = 13.333in × 7.5in.
            // 1 inch = 72 points.
            width: 960.0,
            height: 540.0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Rect {
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Color {
    pub value: String,
}

impl Color {
    pub fn hex(value: impl Into<String>) -> Self {
        Self {
            value: value.into(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Asset {
    pub id: Uuid,
    pub path: String,
    pub media_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type")]
pub enum Element {
    Text(TextElement),
    Image(ImageElement),
    Shape(ShapeElement),
    Table(TableElement),
    Chart(ChartElement),
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct TextElement {
    pub id: Uuid,
    pub bounds: Rect,
    pub text: String,
    pub font_size: f32,
    pub color: Color,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ImageElement {
    pub id: Uuid,
    pub bounds: Rect,
    pub asset_id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ShapeElement {
    pub id: Uuid,
    pub bounds: Rect,
    pub kind: ShapeKind,
    pub fill: Color,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ShapeKind {
    Rectangle,
    Ellipse,
    Line,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct TableElement {
    pub id: Uuid,
    pub bounds: Rect,
    pub rows: Vec<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ChartElement {
    pub id: Uuid,
    pub bounds: Rect,
    pub title: String,
}

impl Element {
    pub fn kind_name(&self) -> &'static str {
        match self {
            Element::Text(_) => "Text",
            Element::Image(_) => "Image",
            Element::Shape(_) => "Shape",
            Element::Table(_) => "Table",
            Element::Chart(_) => "Chart",
        }
    }
}

impl Slide {
    pub fn add_text(
        &mut self,
        text: impl Into<String>,
        x: f32,
        y: f32,
        width: f32,
        height: f32,
    ) {
        self.elements.push(Element::Text(TextElement {
            id: Uuid::new_v4(),
            bounds: Rect {
                x,
                y,
                width,
                height,
            },
            text: text.into(),
            font_size: 24.0,
            color: Color::hex("#111111"),
        }));
    }
}