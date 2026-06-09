use crate::{
    io::{from_json, to_json, Result},
    Presentation,
};

use std::fs;
use std::path::{Path, PathBuf};

pub struct Document {
    path: PathBuf,
    presentation: Presentation,
}

impl Document {
    pub fn open(path: impl AsRef<Path>) -> Result<Self> {
        let path = path.as_ref().to_path_buf();

        let source = fs::read_to_string(&path)?;

        let presentation = from_json(&source)?;

        Ok(Self {
            path,
            presentation,
        })
    }

    pub fn create(
        path: impl AsRef<Path>,
        presentation: Presentation,
    ) -> Result<Self> {
        let path = path.as_ref().to_path_buf();

        let document = Self {
            path,
            presentation,
        };

        document.save()?;

        Ok(document)
    }

    pub fn save(&self) -> Result<()> {
        let json = to_json(&self.presentation)?;

        fs::write(&self.path, json)?;

        Ok(())
    }

    pub fn presentation(&self) -> &Presentation {
        &self.presentation
    }

    pub fn presentation_mut(&mut self) -> &mut Presentation {
        &mut self.presentation
    }
}