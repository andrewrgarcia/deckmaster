use clap::{Parser, Subcommand};
use std::fs;
use std::path::PathBuf;
use deckmaster_core::io::from_json;

#[derive(Parser)]
#[command(name = "deckmaster")]
#[command(version = "0.1.0")]
#[command(about = "deckmaster presentation engine CLI")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    Inspect {
        file: PathBuf,
    },
}

fn main() {
    let cli = Cli::parse();

    let result = match cli.command {
        Commands::Inspect { file } => inspect(file),
    };

    if let Err(err) = result {
        eprintln!("error: {err}");
        std::process::exit(1);
    }
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