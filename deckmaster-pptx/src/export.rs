use deckmaster_core::{Element, Presentation};

use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::Path;

use zip::write::SimpleFileOptions;
use zip::{ZipArchive, ZipWriter};

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

        let template =
            File::open(template_path)?;

        let mut archive =
            ZipArchive::new(template)?;

        let output =
            File::create(output)?;

        let mut writer =
            ZipWriter::new(output);

        let options =
            SimpleFileOptions::default();

        let slide_xml =
            generate_slide_xml(
                presentation,
            );

        for i in 0..archive.len() {
            let mut file =
                archive.by_index(i)?;

            let name =
                file.name().to_string();

            writer.start_file(
                &name,
                options,
            )?;

            if name
                == "ppt/slides/slide1.xml"
            {
                writer.write_all(
                    slide_xml.as_bytes(),
                )?;
            } else {
                let mut bytes =
                    Vec::new();

                file.read_to_end(
                    &mut bytes,
                )?;

                writer.write_all(
                    &bytes,
                )?;
            }
        }

        writer.finish()?;

        Ok(())
    }
}

fn generate_slide_xml(
    presentation: &Presentation,
) -> String {
    let slide =
        presentation
            .slides
            .first()
            .expect("presentation must contain a slide");

    let mut shapes =
        String::new();

    for (index, element) in
        slide.elements.iter().enumerate()
    {
        if let Element::Text(text) =
            element
        {
            let id =
                100 + index;

            let y =
                1_000_000
                    + (index as i64
                        * 800_000);

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
      <a:off x="500000" y="{y}"/>
      <a:ext cx="7000000" cy="500000"/>
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
        <a:t>{}</a:t>
      </a:r>
    </a:p>
  </p:txBody>
</p:sp>
"#,
                    xml_escape(
                        &text.text
                    )
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

fn xml_escape(
    text: &str,
) -> String {
    text.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}