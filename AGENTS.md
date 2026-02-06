# AGENTS

See [README.md](./README.md) for project architecture and data flow.

## Before Committing

1. `bun run format` → must pass
2. `bun run typecheck` → must pass (warnings OK)

## Code Style

- Functional, declarative programming. No classes.
- TypeScript strict: no `any`, explicit types, interfaces over types.
- CSS modules only. Use existing variables from `src/styles/_variables.css`.
- Mobile-first CSS with modern syntax (`width >= 40rem`).

## Constraints

- Keep wagmi on v2.x when updating dependencies, because of rainbowkit constraints
- Pin dependencies to specific versions
- Minimal, surgical changes — no over-engineering
- If unsure, ask instead of guessing
