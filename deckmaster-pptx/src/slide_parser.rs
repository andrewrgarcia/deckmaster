use deckmaster_core::{Color, Rect};
use quick_xml::events::{BytesStart, Event};
use quick_xml::Reader;

use crate::units::emu_to_pt;
use crate::Result;

#[derive(Debug, Clone, PartialEq)]
pub struct ParsedTextElement {
    pub text: String,
    pub bounds: Rect,
    pub font_size: f32,
    pub color: Color,
}

pub struct SlideParser;

impl SlideParser {
    pub fn extract_text(xml: &str) -> Result<Vec<String>> {
        Ok(Self::extract_text_elements(xml)?
            .into_iter()
            .map(|element| element.text)
            .collect())
    }

    pub fn extract_text_elements(
        xml: &str,
    ) -> Result<Vec<ParsedTextElement>> {
        let mut reader = Reader::from_str(xml);

        let mut elements = Vec::new();

        let mut in_shape = false;
        let mut in_text = false;

        let mut current_text = String::new();

        let mut x = 0.0;
        let mut y = 0.0;
        let mut width = 100.0;
        let mut height = 30.0;
        let mut font_size = 18.0;
        let mut color = Color::hex("#000000");
        
        loop {
            match reader.read_event() {
                Ok(Event::Start(ref e)) | Ok(Event::Empty(ref e)) => {
                    let name = e.name();

                    if name.as_ref().ends_with(b"sp") {
                        in_shape = true;
                        in_text = false;
                        current_text.clear();

                        x = 0.0;
                        y = 0.0;
                        width = 100.0;
                        height = 30.0;
                        font_size = 18.0;
                        color = Color::hex("#000000");
                    }

                    if in_shape && name.as_ref().ends_with(b"off") {
                        if let Some(value) = attr_i64(e, b"x") {
                            x = emu_to_pt(value);
                        }

                        if let Some(value) = attr_i64(e, b"y") {
                            y = emu_to_pt(value);
                        }
                    }

                    if in_shape && name.as_ref().ends_with(b"ext") {
                        if let Some(value) = attr_i64(e, b"cx") {
                            width = emu_to_pt(value);
                        }

                        if let Some(value) = attr_i64(e, b"cy") {
                            height = emu_to_pt(value);
                        }
                    }

                    if in_shape && in_text && name.as_ref().ends_with(b"rPr") {
                        if let Some(value) = attr_i64(e, b"sz") {
                            font_size = value as f32 / 100.0;
                        }
                    }

                    if in_shape && in_text && name.as_ref().ends_with(b"srgbClr") {
                        if let Some(value) = attr_string(e, b"val") {
                            color = Color::hex(format!("#{value}"));
                        }
                    }

                    if in_shape && name.as_ref().ends_with(b"txBody") {
                        in_text = true;
                    }

                    if in_shape && in_text && name.as_ref().ends_with(b"t") {
                        if let Ok(Event::Text(text)) = reader.read_event() {
                            let value = String::from_utf8_lossy(
                                text.as_ref(),
                            )
                            .to_string();

                            current_text.push_str(&value);
                        }
                    }
                }

                Ok(Event::End(ref e)) => {
                    let name = e.name();

                    if name.as_ref().ends_with(b"txBody") {
                        in_text = false;
                    }

                    if name.as_ref().ends_with(b"sp") {
                        if !current_text.is_empty() {
                            elements.push(ParsedTextElement {
                                text: current_text.clone(),
                                bounds: Rect {
                                    x,
                                    y,
                                    width,
                                    height,
                                },
                                font_size,
                                color: color.clone(),
                            });
                        }

                        in_shape = false;
                        in_text = false;
                        current_text.clear();
                    }
                }

                Ok(Event::Eof) => break,

                Err(e) => {
                    panic!("xml parse error: {e}");
                }

                _ => {}
            }
        }

        Ok(elements)
    }
}

fn attr_string(e: &BytesStart<'_>, key: &[u8]) -> Option<String> {
    for attr in e.attributes().flatten() {
        if attr.key.as_ref() == key {
            return Some(
                String::from_utf8_lossy(attr.value.as_ref()).to_string(),
            );
        }
    }

    None
}

fn attr_i64(e: &BytesStart<'_>, key: &[u8]) -> Option<i64> {
    for attr in e.attributes().flatten() {
        if attr.key.as_ref() == key {
            let value =
                String::from_utf8_lossy(attr.value.as_ref()).to_string();

            return value.parse::<i64>().ok();
        }
    }

    None
}