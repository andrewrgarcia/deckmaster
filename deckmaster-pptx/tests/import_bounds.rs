use deckmaster_core::{Element, Presentation};
use deckmaster_pptx::{PptxExporter, PptxImporter};

fn approx_eq(a: f32, b: f32) -> bool {
    (a - b).abs() < 0.01
}

#[test]
fn imports_text_bounds_from_pptx() {
    let mut presentation = Presentation::new("Import Bounds Test");

    let mut slide =
        deckmaster_core::Slide::new(Some("Slide 1".to_string()));

    slide.add_text(
        "Positioned Text",
        100.0,
        200.0,
        500.0,
        80.0,
    );

    presentation.slides.push(slide);

    let output = std::env::temp_dir()
        .join("deckmaster-import-bounds.pptx");

    PptxExporter::export(&presentation, &output).unwrap();

    let imported = PptxImporter::import(&output).unwrap();

    let slide = &imported.slides[0];

    let text = slide
        .elements
        .iter()
        .find_map(|element| match element {
            Element::Text(text) => Some(text),
            _ => None,
        })
        .expect("expected imported text element");

    assert_eq!(text.text, "Positioned Text");

    assert!(
        approx_eq(text.bounds.x, 100.0),
        "expected x=100.0, got {}",
        text.bounds.x
    );

    assert!(
        approx_eq(text.bounds.y, 200.0),
        "expected y=200.0, got {}",
        text.bounds.y
    );

    assert!(
        approx_eq(text.bounds.width, 500.0),
        "expected width=500.0, got {}",
        text.bounds.width
    );

    assert!(
        approx_eq(text.bounds.height, 80.0),
        "expected height=80.0, got {}",
        text.bounds.height
    );
}