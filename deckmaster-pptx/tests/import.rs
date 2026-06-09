use deckmaster_pptx::PptxImporter;

#[test]
fn imports_presentation() {
    let path = concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/testdata/sample.pptx"
    );

    let presentation =
        PptxImporter::import(path)
            .unwrap();

    println!(
        "slides: {}",
        presentation.slides.len()
    );

    assert!(
        !presentation.slides.is_empty()
    );
}