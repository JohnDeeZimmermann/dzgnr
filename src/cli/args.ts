export interface CliArgs {
  command: "render";
  inputPath: string;
  widthCm?: number;
  heightCm?: number;
  outputPath?: string;
  configPath?: string;
  screen?: boolean;
  json?: boolean;
  rgb?: boolean;
  png?: boolean;
  pngDpi?: number;
}

function showUsage(): never {
  console.error(`Usage: dzgnr render <input.html> [options]

Arguments:
  <input.html>  Path to HTML file to render

Options:
  --width <cm>     Page width in centimeters (required unless in config)
  --height <cm>    Page height in centimeters (required unless in config)
  --out <path>     Output PDF path (default: derived from input name)
  --config <path>  Path to JSON config file
  --screen         Use screen media instead of print media
  --rgb            Skip CMYK conversion; output Chromium RGB PDF directly
  --json           Output validation report as JSON
  --png            Generate RGB PNG preview(s) from the final PDF output
  --png-dpi <dpi>  PNG preview resolution in DPI (default: 150)

Example:
  dzgnr render design.html --width 9 --height 5.5 --out business-card.pdf --png`);
  process.exit(1);
}

export function parseArgs(argv: string[]): CliArgs {
  const args = argv.slice(2);

  if (args.length < 1) {
    showUsage();
  }

  const command = args[0];
  if (command !== "render") {
    console.error(`Error: Unknown command "${command}". Only "render" is supported.\n`);
    showUsage();
  }

  const positional: string[] = [];
  const flags: Record<string, string> = {};

  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      if (key === "screen" || key === "json" || key === "rgb" || key === "png") {
        flags[key] = "true";
      } else if (i + 1 < args.length && !args[i + 1].startsWith("--")) {
        flags[key] = args[i + 1];
        i++;
      } else {
        console.error(`Error: Missing value for flag --${key}\n`);
        showUsage();
      }
    } else {
      positional.push(args[i]);
    }
  }

  const inputPath = positional[0];
  if (!inputPath) {
    console.error("Error: Missing input HTML file path.\n");
    showUsage();
  }

  const widthCm = flags.width ? parseFloat(flags.width) : undefined;
  const heightCm = flags.height ? parseFloat(flags.height) : undefined;

  if (widthCm !== undefined && (isNaN(widthCm) || widthCm <= 0)) {
    console.error(`Error: Invalid width "${flags.width}". Must be a positive number in cm.\n`);
    process.exit(1);
  }
  if (heightCm !== undefined && (isNaN(heightCm) || heightCm <= 0)) {
    console.error(`Error: Invalid height "${flags.height}". Must be a positive number in cm.\n`);
    process.exit(1);
  }

  const pngDpi = flags["png-dpi"] ? parseFloat(flags["png-dpi"]) : undefined;

  if (pngDpi !== undefined && (isNaN(pngDpi) || pngDpi <= 0 || !isFinite(pngDpi))) {
    console.error(`Error: Invalid PNG DPI "${flags["png-dpi"]}". Must be a positive finite number.\n`);
    process.exit(1);
  }

  return {
    command: "render",
    inputPath,
    widthCm,
    heightCm,
    outputPath: flags.out,
    configPath: flags.config,
    screen: flags.screen === "true",
    json: flags.json === "true",
    rgb: flags.rgb === "true" ? true : undefined,
    png: flags.png === "true" ? true : undefined,
    pngDpi,
  };
}
