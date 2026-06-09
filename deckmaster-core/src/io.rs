use crate::model::Presentation;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum DeckMasterError {
    #[error("serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("unsupported feature: {0}")]
    Unsupported(String),
}

pub type Result<T> = std::result::Result<T, DeckMasterError>;

pub fn to_json(presentation: &Presentation) -> Result<String> {
    Ok(serde_json::to_string_pretty(presentation)?)
}

pub fn from_json(source: &str) -> Result<Presentation> {
    Ok(serde_json::from_str(source)?)
}