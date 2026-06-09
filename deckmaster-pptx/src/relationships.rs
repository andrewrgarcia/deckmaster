use quick_xml::events::Event;
use quick_xml::Reader;

use crate::{Package, Result};

#[derive(Debug)]
pub struct Relationship {
    pub id: String,
    pub target: String,
}

pub struct Relationships;

impl Relationships {
    pub fn load_presentation_relationships(
        package: &mut Package,
    ) -> Result<Vec<Relationship>> {
        let xml = package.read_string(
            "ppt/_rels/presentation.xml.rels",
        )?;

        Self::parse(&xml)
    }

    fn parse(
        xml: &str,
    ) -> Result<Vec<Relationship>> {
        let mut reader =
            Reader::from_str(xml);

        let mut rels = Vec::new();

        loop {
            match reader.read_event() {
                Ok(Event::Start(ref e))
                | Ok(Event::Empty(ref e)) => {
                    if e.name().as_ref()
                        .ends_with(b"Relationship")
                    {
                        let mut id = None;
                        let mut target = None;

                        for attr in e.attributes() {
                            let attr =
                                attr.unwrap();

                            let key =
                                String::from_utf8_lossy(
                                    attr.key.as_ref(),
                                );

                            let value =
                                String::from_utf8_lossy(
                                    attr.value.as_ref(),
                                )
                                .to_string();

                            match key.as_ref() {
                                "Id" => {
                                    id = Some(value)
                                }

                                "Target" => {
                                    target =
                                        Some(value)
                                }

                                _ => {}
                            }
                        }

                        if let (
                            Some(id),
                            Some(target),
                        ) = (id, target)
                        {
                            rels.push(
                                Relationship {
                                    id,
                                    target,
                                },
                            );
                        }
                    }
                }

                Ok(Event::Eof) => break,

                Err(e) => {
                    panic!(
                        "xml parse error: {e}"
                    );
                }

                _ => {}
            }
        }

        Ok(rels)
    }
}