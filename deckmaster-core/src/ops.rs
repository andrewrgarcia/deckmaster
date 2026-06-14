use crate::io::{DeckMasterError, Result};
use crate::{Element, Presentation, Rect};

use uuid::Uuid;

pub fn move_element(
    presentation: &mut Presentation,
    slide_id: Uuid,
    element_id: Uuid,
    x: f32,
    y: f32,
) -> Result<()> {
    let element =
        find_element_mut(presentation, slide_id, element_id)?;

    let bounds = element_bounds_mut(element);

    bounds.x = x;
    bounds.y = y;

    Ok(())
}

pub fn resize_element(
    presentation: &mut Presentation,
    slide_id: Uuid,
    element_id: Uuid,
    width: f32,
    height: f32,
) -> Result<()> {
    let element =
        find_element_mut(presentation, slide_id, element_id)?;

    let bounds = element_bounds_mut(element);

    bounds.width = width;
    bounds.height = height;

    Ok(())
}

pub fn update_text(
    presentation: &mut Presentation,
    slide_id: Uuid,
    element_id: Uuid,
    text: impl Into<String>,
) -> Result<()> {
    let element =
        find_element_mut(presentation, slide_id, element_id)?;

    match element {
        Element::Text(text_element) => {
            text_element.text = text.into();
            Ok(())
        }

        _ => Err(DeckMasterError::Unsupported(
            "element is not text".to_string(),
        )),
    }
}

fn find_element_mut(
    presentation: &mut Presentation,
    slide_id: Uuid,
    element_id: Uuid,
) -> Result<&mut Element> {
    let slide = presentation
        .slides
        .iter_mut()
        .find(|slide| slide.id == slide_id)
        .ok_or_else(|| {
            DeckMasterError::Unsupported(
                format!("slide not found: {slide_id}"),
            )
        })?;

    slide
        .elements
        .iter_mut()
        .find(|element| element_id_of(element) == element_id)
        .ok_or_else(|| {
            DeckMasterError::Unsupported(
                format!("element not found: {element_id}"),
            )
        })
}

fn element_id_of(element: &Element) -> Uuid {
    match element {
        Element::Text(text) => text.id,
        Element::Image(image) => image.id,
        Element::Shape(shape) => shape.id,
        Element::Table(table) => table.id,
        Element::Chart(chart) => chart.id,
    }
}

fn element_bounds_mut(element: &mut Element) -> &mut Rect {
    match element {
        Element::Text(text) => &mut text.bounds,
        Element::Image(image) => &mut image.bounds,
        Element::Shape(shape) => &mut shape.bounds,
        Element::Table(table) => &mut table.bounds,
        Element::Chart(chart) => &mut chart.bounds,
    }
}