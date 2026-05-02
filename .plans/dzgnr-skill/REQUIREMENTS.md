# Requirements: Dzgnr Agent Skill

## Goal

Create an agent skill that teaches AI agents how to use Dzgnr to create print-oriented HTML designs and render them to correctly sized PDFs.

## Confirmed Requirements

- The skill should be added inside the Dzgnr repository, not installed directly into the global user skills directory.
- The skill should optimize for print artifacts such as business cards, flyers, posters, banners, and similar physical-design outputs.
- The skill should include full examples, not only prose guidance.
- Each Dzgnr project/example should be self-contained in its own directory.
- Each project directory should include all necessary assets.
- Each project directory should include a small `README.md` describing what that specific project/file is about and how to render it.
- Default dimensions must be stored in configuration, specifically a per-project `dzgnr.json`, rather than relying on CLI `--width`/`--height` flags.
- The skill should teach agents to use relative spacing where sensible so that dimension overrides remain viable.
- The skill should include researched guidance on making strong designs for this use case.
- Research should cover both how agent skills work and how to create high-quality print/design outputs with Dzgnr.

## Constraints

- Do not create or modify implementation code during planning.
- The implementation should follow the existing skill format used by local skills: a `SKILL.md` file with YAML frontmatter (`name`, `description`, optional metadata) followed by concise procedural guidance.
- The final skill should be practical for agents: clear triggers, workflow, project structure, design heuristics, sizing guidance, validation steps, and example layouts.

## Open Implementation Decisions For The Build Agent

- Exact repository path for the skill directory should be chosen during implementation after checking project conventions. A likely location is `skills/dzgnr/` or `.agents/skills/dzgnr/` inside the repository.
- Exact example set should balance usefulness and repository size. Suggested examples include business card, flyer/poster, and banner/signage.
