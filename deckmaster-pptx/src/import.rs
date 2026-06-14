use deckmaster_core::{
    Color,
    Element,
    Presentation,
    Slide,
    TextElement,
};

use uuid::Uuid;

use crate::{
    Package,
    PresentationParser,
    PresentationXml,
    Relationships,
    SlideParser,
    SlideXml,
    Result,
};

pub struct PptxImporter;

impl PptxImporter {
    pub fn import(
        path: impl AsRef<std::path::Path>,
    ) -> Result<Presentation> {
        let mut package =
            Package::open(path)?;

        let presentation_xml =
            PresentationXml::load(
                &mut package,
            )?;

        let slide_refs =
            PresentationParser::slide_relationships(
                presentation_xml.xml(),
            )?;

        let rels =
            Relationships::load_presentation_relationships(
                &mut package,
            )?;

        let mut presentation =
            Presentation::new(
                "Imported Presentation",
            );

        for slide_ref in slide_refs {
            let rel = rels
                .iter()
                .find(|r| {
                    r.id
                        == slide_ref
                            .relationship_id
                })
                .unwrap();

            let slide_xml =
                SlideXml::load(
                    &mut package,
                    &rel.target,
                )?;

            let texts =
                SlideParser::extract_text_elements(
                    slide_xml.xml(),
                )?;

            let mut slide =
                Slide::new(Some(
                    "Imported Slide"
                        .to_string(),
                ));

            for text in texts {
                slide.elements.push(
                    Element::Text(
                        TextElement {
                            id: Uuid::new_v4(),
                            bounds: text.bounds,
                            text: text.text,
                            font_size: 18.0,
                            color: Color::hex(
                                "#000000",
                            ),
                        },
                    ),
                );
            }

            presentation.slides.push(
                slide,
            );
        }

        Ok(presentation)
    }
}