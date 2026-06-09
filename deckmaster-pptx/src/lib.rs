pub mod export;
pub mod import;
pub mod package;

use thiserror::Error;

pub use export::*;
pub use import::*;
pub use package::*;

#[derive(Debug, Error)]
pub enum PptxError {
    #[error("PPTX import is not implemented yet")]
    ImportNotImplemented,

    #[error("PPTX export is not implemented yet")]
    ExportNotImplemented,

    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("ZIP error: {0}")]
    Zip(#[from] zip::result::ZipError),
}

pub type Result<T> =
    std::result::Result<T, PptxError>;