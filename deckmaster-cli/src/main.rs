use clap::{Parser, Subcommand};
use deckmaster_core::{
    io::{from_json, to_json},
    Presentation, Slide,
};
use std::fs;
use std::path::PathBuf;

#[derive(Parser)]
#[command(name = "deckmaster")]
#[command(version = "0.1.0")]
#[command(about = "Deckmaster presentation engine CLI")]
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
}

fn main() {
    let cli = Cli::parse();

    let result = match cli.command {
        Commands::Inspect { file } => inspect(file),
        Commands::New { file, title } => create_new(file, title),
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
        "Welcome to Deckmaster",
        100.0,
        100.0,
        500.0,
        100.0,
    );

    presentation.slides.push(slide);

    let json = to_json(&presentation)?;

    fs::write(file, json)?;

    println!("Presentation created.");

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
        println!("  Elements: {}", slide.elements.len());

        for element in &slide.elements {
            println!("  - {}", element.kind_name());
        }
    }

    Ok(())
}