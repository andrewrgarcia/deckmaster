pub mod export;
pub mod import;
pub mod package;
pub mod presentation_xml;
pub mod presentation_parser;
pub mod relationships;
pub mod slide_xml;
pub mod slide_parser;
pub mod units;

use thiserror::Error;

pub use export::*;
pub use import::*;
pub use package::*;
pub use presentation_xml::*;
pub use presentation_parser::*;
pub use relationships::*;
pub use slide_xml::*;
pub use slide_parser::*;
pub use units::*;

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