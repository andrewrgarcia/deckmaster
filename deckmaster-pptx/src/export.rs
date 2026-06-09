use deckmaster_core::Presentation;
use std::path::Path;

use crate::{PptxError, Result};

pub struct PptxExporter;

impl PptxExporter {
    pub fn export(
        _presentation: &Presentation,
        _path: impl AsRef<Path>,
    ) -> Result<()> {
        Err(PptxError::ExportNotImplemented)
    }
}