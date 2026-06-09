use quick_xml::events::Event;
use quick_xml::Reader;

use crate::Result;

pub struct SlideParser;

impl SlideParser {
    pub fn extract_text(
        xml: &str,
    ) -> Result<Vec<String>> {
        let mut reader =
            Reader::from_str(xml);

        let mut texts = Vec::new();

        loop {
            match reader.read_event() {
                Ok(Event::Start(ref e)) => {
                    if e.name()
                        .as_ref()
                        .ends_with(b"t")
                    {
                        if let Ok(Event::Text(text)) =
                            reader.read_event()
                        {
                            let value =
                                String::from_utf8_lossy(
                                    text.as_ref(),
                                )
                                .to_string();

                            texts.push(value);
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

        Ok(texts)
    }
}