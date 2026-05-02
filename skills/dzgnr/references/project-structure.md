# Dzgnr Project Structure

Use one directory per print artifact so files stay reproducible and portable.

```text
my-artifact/
  README.md
  dzgnr.json
  index.html
  assets/
    logo.svg
    texture.svg
```

- `README.md`: Short description of intent, dimensions, assets, and render command.
- `dzgnr.json`: Source-of-truth defaults for page dimensions and render behavior.
- `index.html`: The print layout source.
- `assets/`: Local assets used by the layout (prefer SVG for logos and marks).

Standard render command (run inside artifact directory):

```bash
dzgnr render index.html --config dzgnr.json
```

Validation command for machine-readable checks:

```bash
dzgnr render index.html --config dzgnr.json --json
```
