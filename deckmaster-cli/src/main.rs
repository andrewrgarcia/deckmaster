use clap::{Parser, Subcommand};
use deckmaster_core::{
    io::{from_json, to_json},
    Document, Element, Presentation, Slide,
};
use deckmaster_pptx::{PptxExporter, PptxImporter};
use std::fs;
use std::path::PathBuf;

#[derive(Parser)]
#[command(name = "deckmaster")]
#[command(version = "0.1.0")]
#[command(about = "DeckMaster presentation engine CLI")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    Inspect {
        file: PathBuf,
    },

    New {
        file: PathBuf,
        title: String,
    },

    AddSlide {
        file: PathBuf,
        title: String,
    },

    AddText {
        file: PathBuf,
        slide: usize,
        text: String,
    },

    Import {
        input: PathBuf,
        output: PathBuf,
    },

    Export {
        input: PathBuf,
        output: PathBuf,
    },
}

fn main() {
    let cli = Cli::parse();

    let result = match cli.command {
        Commands::Inspect { file } => inspect(file),
        Commands::New { file, title } => create_new(file, title),
        Commands::AddSlide { file, title } => add_slide(file, title),
        Commands::AddText { file, slide, text } => {
            add_text(file, slide, text)
        }
        Commands::Import { input, output } => import_pptx(input, output),
        Commands::Export { input, output } => export_pptx(input, output),
    };

    if let Err(err) = result {
        eprintln!("error: {err}");
        std::process::exit(1);
    }
}

fn create_new(
    file: PathBuf,
    title: String,
) -> Result<(), Box<dyn std::error::Error>> {
    let mut presentation = Presentation::new(title);

    let mut slide = Slide::new(Some("Slide 1".to_string()));

    slide.add_text(
        "Welcome to DeckMaster",
        100.0,
        100.0,
        500.0,
        100.0,
    );

    presentation.slides.push(slide);

    fs::write(file, to_json(&presentation)?)?;

    println!("Presentation created.");

    Ok(())
}

fn add_slide(
    file: PathBuf,
    title: String,
) -> Result<(), Box<dyn std::error::Error>> {
    let mut document = Document::open(&file)?;

    document.add_slide(title);

    document.save()?;

    println!("Slide added.");

    Ok(())
}

fn add_text(
    file: PathBuf,
    slide: usize,
    text: String,
) -> Result<(), Box<dyn std::error::Error>> {
    if slide == 0 {
        return Err("slide numbers start at 1".into());
    }

    let mut document = Document::open(&file)?;

    document.add_text(slide - 1, text)?;

    document.save()?;

    println!("Text added.");

    Ok(())
}

fn import_pptx(
    input: PathBuf,
    output: PathBuf,
) -> Result<(), Box<dyn std::error::Error>> {
    let presentation = PptxImporter::import(input)?;

    fs::write(output, to_json(&presentation)?)?;

    println!("PPTX imported.");

    Ok(())
}

fn export_pptx(
    input: PathBuf,
    output: PathBuf,
) -> Result<(), Box<dyn std::error::Error>> {
    let source = fs::read_to_string(input)?;

    let presentation = from_json(&source)?;

    PptxExporter::export(&presentation, output)?;

    println!("PPTX exported.");

    Ok(())
}

fn inspect(file: PathBuf) -> Result<(), Box<dyn std::error::Error>> {
    let source = fs::read_to_string(file)?;

    let presentation = from_json(&source)?;

    println!("Title: {}", presentation.metadata.title);
    println!("Slides: {}", presentation.slides.len());

    for (index, slide) in presentation.slides.iter().enumerate() {
        let name = slide.name.as_deref().unwrap_or("(untitled)");

        println!();
        println!("Slide {}: {}", index + 1, name);
        println!("  ID: {}", slide.id);
        println!("  Elements: {}", slide.elements.len());

        for element in &slide.elements {
            match element {
                Element::Text(text) => {
                    println!("  - Text [{}]: {}", text.id, text.text);
                }

                Element::Image(image) => {
                    println!("  - Image [{}]", image.id);
                }

                Element::Shape(shape) => {
                    println!("  - Shape [{}]", shape.id);
                }

                Element::Table(table) => {
                    println!("  - Table [{}]", table.id);
                }

                Element::Chart(chart) => {
                    println!("  - Chart [{}]", chart.id);
                }
            }
        }
    }

    Ok(())
}