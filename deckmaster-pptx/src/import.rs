use deckmaster_core::Presentation;
use std::path::Path;

use crate::{PptxError, Result};

pub struct PptxImporter;

impl PptxImporter {
    pub fn import(
        path: impl AsRef<Path>,
    ) -> Result<Presentation> {
        let _path = path.as_ref();

        Err(PptxError::ImportNotImplemented)
    }
}