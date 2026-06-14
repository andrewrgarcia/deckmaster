use deckmaster_core::Presentation;
use deckmaster_pptx::PptxExporter;

use std::fs::File;
use std::io::Read;
use zip::ZipArchive;

#[test]
fn exports_text_bounds_as_pptx_emus() {
    let mut presentation = Presentation::new("Bounds Test");

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
        .join("deckmaster-export-bounds.pptx");

    PptxExporter::export(&presentation, &output).unwrap();

    let file = File::open(&output).unwrap();
    let mut archive = ZipArchive::new(file).unwrap();

    let mut slide_xml = String::new();

    archive
        .by_name("ppt/slides/slide1.xml")
        .unwrap()
        .read_to_string(&mut slide_xml)
        .unwrap();

    assert!(
        slide_xml.contains(r#"<a:off x="1270000" y="2540000"/>"#),
        "expected text offset to use bounds x/y in EMUs; got:\n{}",
        slide_xml
    );

    assert!(
        slide_xml.contains(r#"<a:ext cx="6350000" cy="1016000"/>"#),
        "expected text size to use bounds width/height in EMUs; got:\n{}",
        slide_xml
    );
}