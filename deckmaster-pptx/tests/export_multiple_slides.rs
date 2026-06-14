use deckmaster_core::{Element, Presentation, Slide};
use deckmaster_pptx::{PptxExporter, PptxImporter};

use std::fs::File;
use std::io::Read;
use zip::ZipArchive;

fn read_zip_string(
    archive: &mut ZipArchive<File>,
    path: &str,
) -> String {
    let mut file = archive.by_name(path).unwrap();

    let mut text = String::new();

    file.read_to_string(&mut text).unwrap();

    text
}

#[test]
fn exports_multiple_slides() {
    let mut presentation = Presentation::new("Multi Slide Export Test");

    let mut slide_1 = Slide::new(Some("Intro".to_string()));
    slide_1.add_text(
        "First Slide",
        100.0,
        100.0,
        500.0,
        80.0,
    );

    let mut slide_2 = Slide::new(Some("Results".to_string()));
    slide_2.add_text(
        "Second Slide",
        120.0,
        160.0,
        500.0,
        80.0,
    );

    presentation.slides.push(slide_1);
    presentation.slides.push(slide_2);

    let output = std::env::temp_dir()
        .join("deckmaster-multiple-slides.pptx");

    PptxExporter::export(&presentation, &output).unwrap();

    let file = File::open(&output).unwrap();
    let mut archive = ZipArchive::new(file).unwrap();

    let presentation_xml =
        read_zip_string(&mut archive, "ppt/presentation.xml");

    assert!(
        presentation_xml.contains(r#"r:id="rIdSlide1""#),
        "presentation.xml should reference slide 1"
    );

    assert!(
        presentation_xml.contains(r#"r:id="rIdSlide2""#),
        "presentation.xml should reference slide 2"
    );

    let rels_xml = read_zip_string(
        &mut archive,
        "ppt/_rels/presentation.xml.rels",
    );

    assert!(
        rels_xml.contains(r#"Target="slides/slide1.xml""#),
        "presentation relationships should point to slide1.xml"
    );

    assert!(
        rels_xml.contains(r#"Target="slides/slide2.xml""#),
        "presentation relationships should point to slide2.xml"
    );

    let content_types =
        read_zip_string(&mut archive, "[Content_Types].xml");

    assert!(
        content_types.contains(r#"/ppt/slides/slide1.xml"#),
        "content types should include slide1.xml"
    );

    assert!(
        content_types.contains(r#"/ppt/slides/slide2.xml"#),
        "content types should include slide2.xml"
    );

    let slide_1_xml =
        read_zip_string(&mut archive, "ppt/slides/slide1.xml");

    let slide_2_xml =
        read_zip_string(&mut archive, "ppt/slides/slide2.xml");

    assert!(
        slide_1_xml.contains("First Slide"),
        "slide1.xml should contain first slide text"
    );

    assert!(
        slide_2_xml.contains("Second Slide"),
        "slide2.xml should contain second slide text"
    );
}

#[test]
fn exported_multiple_slides_can_be_imported() {
    let mut presentation = Presentation::new("Multi Slide Round Trip Test");

    let mut slide_1 = Slide::new(Some("Intro".to_string()));
    slide_1.add_text(
        "First Slide",
        100.0,
        100.0,
        500.0,
        80.0,
    );

    let mut slide_2 = Slide::new(Some("Results".to_string()));
    slide_2.add_text(
        "Second Slide",
        120.0,
        160.0,
        500.0,
        80.0,
    );

    presentation.slides.push(slide_1);
    presentation.slides.push(slide_2);

    let output = std::env::temp_dir()
        .join("deckmaster-multiple-slides-roundtrip.pptx");

    PptxExporter::export(&presentation, &output).unwrap();

    let imported = PptxImporter::import(&output).unwrap();

    assert_eq!(
        imported.slides.len(),
        2,
        "imported presentation should have two slides"
    );

    let slide_1_texts: Vec<String> = imported.slides[0]
        .elements
        .iter()
        .filter_map(|element| match element {
            Element::Text(text) => Some(text.text.clone()),
            _ => None,
        })
        .collect();

    let slide_2_texts: Vec<String> = imported.slides[1]
        .elements
        .iter()
        .filter_map(|element| match element {
            Element::Text(text) => Some(text.text.clone()),
            _ => None,
        })
        .collect();

    assert!(
        slide_1_texts.contains(&"First Slide".to_string()),
        "imported slide 1 should contain first slide text"
    );

    assert!(
        slide_2_texts.contains(&"Second Slide".to_string()),
        "imported slide 2 should contain second slide text"
    );
}