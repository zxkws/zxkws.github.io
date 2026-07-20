# Repository Guidelines

## Project Structure & Module Organization

This pnpm workspace contains a micro-frontend system. `packages/main-app/` is the React/Webpack shell. `v-app/` is the main Vue application; `auth-app/`, `v-react/`, and `chess-mirror-app/` are focused Vite micro-apps. Learning sites live in `react-learning-app/`, `vue-learning-app/`, and `person-resume-app/`. Reusable code belongs in `shared-fetch/`, `shared-theme/`, and `build-tools/`. The corresponding NestJS backend is `../monorepo-server-admin`.

## Build, Test, and Development Commands

Run commands from the repository root:

- `pnpm install` installs all workspace dependencies.
- `pnpm dev` starts the shell and primary micro-apps for local integration.
- `pnpm dev:main`, `pnpm dev:v-app`, `pnpm dev:auth`, `pnpm dev:v-react`, or `pnpm dev:chess` starts one application.
- `pnpm build:all` builds every production application in dependency order.
- `pnpm --filter <package> build` validates one package.
- `pnpm --filter main-app lint` runs Biome and Stylelint; `pnpm --filter v-react lint` runs ESLint with fixes.

Production builds use `https://system.zxkws.nyc.mn/api`; local applications proxy `/api` to the backend. Do not casually change either contract.

## Coding Style & Naming Conventions

Use TypeScript, two-space indentation, single quotes, semicolons, trailing commas, and the 120-character limit in `.prettierrc.cjs`. Use PascalCase for components, camelCase for functions and variables, and kebab-case for feature directories. Follow the owning package's framework patterns. Run its formatter or linter before committing.

When displaying backend data, render the returned values directly. Do not add unsolicited date, number, label, or fallback formatting; transform values only when the requirement explicitly calls for it.

## Testing Guidelines

There is no repository-wide automated test command or coverage threshold. Run the affected package's build and lint commands, then exercise standalone and shell-embedded routes. For API changes, run the backend and verify success, empty, loading, and error states. Name new colocated tests `Component.test.tsx` or `feature.spec.ts`.

## Commit & Pull Request Guidelines

Commitlint enforces Conventional Commits. Use focused subjects such as `feat: add voice assistant workspace`, `fix: prevent stale micro app bundles`, or `refactor: simplify API client`. Pull requests should describe the user-visible result, list affected packages and verification commands, and link related issues. Include screenshots or recordings for UI changes and note API, route, environment, or deployment-path changes.

## Security & Configuration

Never commit credentials, tokens, or local environment files. Keep secrets out of client bundles; only public configuration may use `VITE_*` or build-time variables. Preserve each micro-app's configured base path and avoid committing generated `dist/` output.
