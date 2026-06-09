use std::path::Path;
use deckmaster_core::Presentation;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum PptxError {
    #[error("PPTX import is not implemented yet")]
    ImportNotImplemented,

    #[error("PPTX export is not implemented yet")]
    ExportNotImplemented,
}

pub type Result<T> = std::result::Result<T, PptxError>;

pub fn import_pptx(_path: impl AsRef<Path>) -> Result<Presentation> {
    Err(PptxError::ImportNotImplemented)
}

pub fn export_pptx(_presentation: &Presentation, _path: impl AsRef<Path>) -> Result<()> {
    Err(PptxError::ExportNotImplemented)
}