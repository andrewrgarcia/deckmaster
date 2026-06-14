use deckmaster_core::{Element, Presentation, Slide};

use std::fs::File;
use std::io::{Read, Write};
use std::path::Path;

use zip::write::SimpleFileOptions;
use zip::{ZipArchive, ZipWriter};

use crate::units::pt_to_emu;
use crate::Result;

pub struct PptxExporter;

impl PptxExporter {
    pub fn export(
        presentation: &Presentation,
        output: impl AsRef<Path>,
    ) -> Result<()> {
        let template_path = concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/templates/blank.pptx"
        );

        let template = File::open(template_path)?;
        let mut archive = ZipArchive::new(template)?;

        let output = File::create(output)?;
        let mut writer = ZipWriter::new(output);

        let options = SimpleFileOptions::default();

        let slide_count = presentation.slides.len();

        assert!(
            slide_count > 0,
            "presentation must contain at least one slide"
        );

        for i in 0..archive.len() {
            let mut file = archive.by_index(i)?;
            let name = file.name().to_string();

            if is_generated_slide_xml(&name) {
                continue;
            }

            let mut bytes = Vec::new();
            file.read_to_end(&mut bytes)?;

            writer.start_file(&name, options)?;

            if name == "ppt/presentation.xml" {
                let xml = String::from_utf8_lossy(&bytes);
                let patched = patch_presentation_xml(&xml, slide_count);

                writer.write_all(patched.as_bytes())?;
            } else if name == "ppt/_rels/presentation.xml.rels" {
                let xml = String::from_utf8_lossy(&bytes);
                let patched = patch_presentation_relationships(
                    &xml,
                    slide_count,
                );

                writer.write_all(patched.as_bytes())?;
            } else if name == "[Content_Types].xml" {
                let xml = String::from_utf8_lossy(&bytes);
                let patched = patch_content_types(&xml, slide_count);

                writer.write_all(patched.as_bytes())?;
            } else {
                writer.write_all(&bytes)?;
            }
        }

        for (index, slide) in presentation.slides.iter().enumerate() {
            let slide_number = index + 1;
            let path = format!("ppt/slides/slide{slide_number}.xml");
            let xml = generate_slide_xml(slide);

            writer.start_file(path, options)?;
            writer.write_all(xml.as_bytes())?;
        }

        writer.finish()?;

        Ok(())
    }
}

fn is_generated_slide_xml(path: &str) -> bool {
    path.starts_with("ppt/slides/slide") && path.ends_with(".xml")
}

fn patch_presentation_xml(xml: &str, slide_count: usize) -> String {
    let mut slide_ids = String::new();

    for index in 0..slide_count {
        let slide_number = index + 1;
        let slide_id = 256 + index;

        slide_ids.push_str(&format!(
            r#"<p:sldId id="{slide_id}" r:id="rIdSlide{slide_number}"/>"#
        ));
    }

    replace_between(
        xml,
        "<p:sldIdLst>",
        "</p:sldIdLst>",
        &slide_ids,
    )
}

fn patch_presentation_relationships(
    xml: &str,
    slide_count: usize,
) -> String {
    let without_old_slides = remove_relationships_of_type(
        xml,
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide",
    );

    let mut new_slide_rels = String::new();

    for index in 0..slide_count {
        let slide_number = index + 1;

        new_slide_rels.push_str(&format!(
            r#"<Relationship Id="rIdSlide{slide_number}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide{slide_number}.xml"/>"#
        ));
    }

    insert_before(
        &without_old_slides,
        "</Relationships>",
        &new_slide_rels,
    )
}

fn patch_content_types(xml: &str, slide_count: usize) -> String {
    let without_old_slide_overrides =
        remove_slide_content_type_overrides(xml);

    let mut overrides = String::new();

    for index in 0..slide_count {
        let slide_number = index + 1;

        overrides.push_str(&format!(
            r#"<Override PartName="/ppt/slides/slide{slide_number}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>"#
        ));
    }

    insert_before(
        &without_old_slide_overrides,
        "</Types>",
        &overrides,
    )
}

fn generate_slide_xml(slide: &Slide) -> String {
    let mut shapes = String::new();

    for (index, element) in slide.elements.iter().enumerate() {
        if let Element::Text(text) = element {
            let id = 100 + index;

            let x = pt_to_emu(text.bounds.x);
            let y = pt_to_emu(text.bounds.y);
            let cx = pt_to_emu(text.bounds.width);
            let cy = pt_to_emu(text.bounds.height);
            let font_size = (text.font_size * 100.0).round() as i64;

            shapes.push_str(
                &format!(
                    r#"
<p:sp>
  <p:nvSpPr>
    <p:cNvPr id="{id}" name="Text{id}"/>
    <p:cNvSpPr txBox="1"/>
    <p:nvPr/>
  </p:nvSpPr>

  <p:spPr>
    <a:xfrm>
      <a:off x="{x}" y="{y}"/>
      <a:ext cx="{cx}" cy="{cy}"/>
    </a:xfrm>

    <a:prstGeom prst="rect">
      <a:avLst/>
    </a:prstGeom>
  </p:spPr>

  <p:txBody>
    <a:bodyPr/>
    <a:lstStyle/>
    <a:p>
      <a:r>
        <a:rPr sz="{font_size}"/>
        <a:t>{}</a:t>
      </a:r>
    </a:p>
  </p:txBody>
</p:sp>
"#,
                    xml_escape(&text.text)
                ),
            );
        }
    }

    format!(
        r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld
xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">

<p:cSld>
<p:spTree>

<p:nvGrpSpPr>
<p:cNvPr id="1" name=""/>
<p:cNvGrpSpPr/>
<p:nvPr/>
</p:nvGrpSpPr>

<p:grpSpPr>
<a:xfrm>
<a:off x="0" y="0"/>
<a:ext cx="0" cy="0"/>
<a:chOff x="0" y="0"/>
<a:chExt cx="0" cy="0"/>
</a:xfrm>
</p:grpSpPr>

{}

</p:spTree>
</p:cSld>

<p:clrMapOvr>
<a:masterClrMapping/>
</p:clrMapOvr>

</p:sld>
"#,
        shapes
    )
}

fn replace_between(
    xml: &str,
    start_tag: &str,
    end_tag: &str,
    replacement: &str,
) -> String {
    let Some(start) = xml.find(start_tag) else {
        return xml.to_string();
    };

    let Some(end) = xml.find(end_tag) else {
        return xml.to_string();
    };

    let content_start = start + start_tag.len();

    format!(
        "{}{}{}",
        &xml[..content_start],
        replacement,
        &xml[end..]
    )
}

fn insert_before(xml: &str, marker: &str, insertion: &str) -> String {
    let Some(index) = xml.find(marker) else {
        return xml.to_string();
    };

    format!("{}{}{}", &xml[..index], insertion, &xml[index..])
}

fn remove_relationships_of_type(xml: &str, relationship_type: &str) -> String {
    let mut output = String::new();
    let mut rest = xml;

    loop {
        let Some(start) = rest.find("<Relationship") else {
            output.push_str(rest);
            break;
        };

        output.push_str(&rest[..start]);

        let Some(end_relative) = rest[start..].find("/>") else {
            output.push_str(&rest[start..]);
            break;
        };

        let end = start + end_relative + 2;
        let tag = &rest[start..end];

        if !tag.contains(relationship_type) {
            output.push_str(tag);
        }

        rest = &rest[end..];
    }

    output
}

fn remove_slide_content_type_overrides(xml: &str) -> String {
    let mut output = String::new();
    let mut rest = xml;

    loop {
        let Some(start) = rest.find("<Override") else {
            output.push_str(rest);
            break;
        };

        output.push_str(&rest[..start]);

        let Some(end_relative) = rest[start..].find("/>") else {
            output.push_str(&rest[start..]);
            break;
        };

        let end = start + end_relative + 2;
        let tag = &rest[start..end];

        let is_slide_override =
            tag.contains(r#"PartName="/ppt/slides/slide"#);

        if !is_slide_override {
            output.push_str(tag);
        }

        rest = &rest[end..];
    }

    output
}

fn xml_escape(text: &str) -> String {
    text.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}