use deckmaster_core::{Color, Element, Presentation, Rect, Slide, TextElement};
use deckmaster_pptx::{PptxExporter, PptxImporter};

#[test]
fn imports_text_font_size_from_pptx() {
    let mut presentation = Presentation::new("Font Size Import Test");

    let mut slide = Slide::new(Some("Slide 1".to_string()));

    slide.elements.push(Element::Text(TextElement {
        id: uuid::Uuid::new_v4(),
        bounds: Rect {
            x: 100.0,
            y: 200.0,
            width: 500.0,
            height: 80.0,
        },
        text: "Large Text".to_string(),
        font_size: 32.0,
        color: Color::hex("#111111"),
    }));

    presentation.slides.push(slide);

    let output = std::env::temp_dir()
        .join("deckmaster-import-font-size.pptx");

    PptxExporter::export(&presentation, &output).unwrap();

    let imported = PptxImporter::import(&output).unwrap();

    let imported_text = imported.slides[0]
        .elements
        .iter()
        .find_map(|element| match element {
            Element::Text(text) => Some(text),
            _ => None,
        })
        .expect("expected imported text element");

    assert_eq!(imported_text.text, "Large Text");

    assert!(
        (imported_text.font_size - 32.0).abs() < 0.01,
        "expected font_size=32.0, got {}",
        imported_text.font_size
    );
}