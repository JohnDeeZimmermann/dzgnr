## Linter Rules

This project uses strict ESLint rules (configured in `eslint.config.js`) enforced on `src/**/*.ts`:

| Rule | Severity | Threshold |
|------|----------|-----------|
| `complexity` | error | max 10 |
| `sonarjs/cognitive-complexity` | error | max 15 |
| `max-lines-per-function` | error | max 40 lines |
| `max-lines` | error | max 250 lines |
| `max-params` | warn | max 4 params |
| `@typescript-eslint/no-unused-vars` | warn | args prefixed with `_` ignored |
| `@typescript-eslint/no-explicit-any` | warn | — |
| `import-x/no-cycle` | error | max depth 10 |
| `import-x/max-dependencies` | warn | max 10 per file |
| `import-x/no-self-import` | error | — |

Before creating a file or making edits, check these limits and design code to stay within them. Split large functions or files proactively. Run `eslint` to verify compliance before finishing any task.
