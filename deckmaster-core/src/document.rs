use crate::{
    io::{from_json, to_json, Result},
    Presentation, Slide,
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

    pub fn find_slide(
        &self,
        slide_id: uuid::Uuid,
    ) -> Option<&crate::Slide> {
        self.presentation
            .slides
            .iter()
            .find(|slide| slide.id == slide_id)
    }

    pub fn find_slide_mut(
        &mut self,
        slide_id: uuid::Uuid,
    ) -> Option<&mut crate::Slide> {
        self.presentation
            .slides
            .iter_mut()
            .find(|slide| slide.id == slide_id)
    }

    pub fn add_slide(&mut self, title: impl Into<String>) {
        let slide_number = self.presentation.slides.len() + 1;

        let mut slide = Slide::new(Some(title.into()));

        slide.add_text(
            format!("Slide {}", slide_number),
            100.0,
            100.0,
            500.0,
            100.0,
        );

        self.presentation.slides.push(slide);
    }

    pub fn add_text(
        &mut self,
        slide_index: usize,
        text: impl Into<String>,
    ) -> Result<()> {
        let slide = self
            .presentation
            .slides
            .get_mut(slide_index)
            .ok_or_else(|| {
                crate::io::DeckMasterError::Unsupported(
                    "slide does not exist".to_string(),
                )
            })?;

        slide.add_text(
            text,
            100.0,
            200.0,
            600.0,
            100.0,
        );

        Ok(())
    }
}