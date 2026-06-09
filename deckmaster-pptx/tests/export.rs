use deckmaster_core::Presentation;
use deckmaster_pptx::PptxExporter;

#[test]
fn exports_presentation() {
    let mut presentation =
        Presentation::new(
            "Export Test",
        );

    let mut slide =
        deckmaster_core::Slide::new(
            Some(
                "Slide 1".to_string(),
            ),
        );

    slide.add_text(
        "DeckMaster Export",
        0.0,
        0.0,
        100.0,
        100.0,
    );

    presentation
        .slides
        .push(slide);

    let output = std::env::temp_dir()
        .join(
            "deckmaster-export.pptx",
        );

    PptxExporter::export(
        &presentation,
        &output,
    )
    .unwrap();

    assert!(output.exists());
}