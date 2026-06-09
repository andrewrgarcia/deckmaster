use deckmaster_core::Element;
use deckmaster_pptx::PptxImporter;

#[test]
fn imports_slide_text() {
    let path = concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/testdata/sample.pptx"
    );

    let presentation =
        PptxImporter::import(path)
            .unwrap();

    let slide =
        &presentation.slides[0];

    for element in &slide.elements {
        match element {
            Element::Text(text) => {
                println!("{}", text.text);
            }
            _ => {}
        }
    }
}