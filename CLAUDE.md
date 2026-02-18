# CLAUDE.md - AI Assistant Guide for HTA-Reimbursement-Price

## Project Overview

**HTA-Reimbursement-Price** is a Health Technology Assessment (HTA) reimbursement pricing project. This repository is intended to support analysis, modeling, or tooling related to drug/therapy reimbursement price evaluation as part of HTA processes.

> **Status**: This project is in its initial setup phase. This document should be updated as the codebase evolves.

## Repository Structure

```
HTA-Reimbursement-Price/
├── CLAUDE.md          # This file - AI assistant guidelines
└── (project files to be added)
```

As the project grows, update this section to reflect the actual directory layout.

## Getting Started

### Prerequisites

_(To be defined as the project takes shape. Common prerequisites for HTA projects include Python 3.x, R, or Node.js depending on the technology stack chosen.)_

### Setup

```bash
git clone <repository-url>
cd HTA-Reimbursement-Price
# Additional setup steps to be added
```

## Development Workflow

### Branch Strategy

- **Main branch**: `main` — stable, production-ready code
- **Feature branches**: `feature/<description>` or `claude/<description>` for AI-assisted development
- Write clear, descriptive commit messages summarizing the "why" behind changes
- Keep pull requests focused on a single concern

### Code Quality

When contributing to this project, follow these conventions:

1. **Keep changes minimal and focused** — only modify what is necessary for the task at hand
2. **Do not introduce security vulnerabilities** — validate inputs at system boundaries, avoid injection risks
3. **Write tests** for new functionality when a test framework is in place
4. **Document public interfaces** — but avoid over-commenting obvious code

### Testing

_(Testing framework and instructions to be added once the project stack is established.)_

```bash
# Placeholder — update with actual test commands
# e.g., pytest, npm test, Rscript tests/run_tests.R
```

### Linting and Formatting

_(Linter and formatter configuration to be added. Update this section when tools like ESLint, Prettier, Black, flake8, or styler are introduced.)_

```bash
# Placeholder — update with actual lint/format commands
```

### Building

_(Build steps to be documented once the project architecture is defined.)_

```bash
# Placeholder — update with actual build commands
```

## Key Conventions for AI Assistants

### Before Making Changes

- **Read before writing**: Always read existing files before proposing modifications
- **Understand context**: Check related files and dependencies before editing
- **Check for tests**: If a test suite exists, run it before and after changes

### When Writing Code

- Follow the existing code style and patterns in the repository
- Prefer simple, readable solutions over clever abstractions
- Do not add features, refactoring, or "improvements" beyond what was requested
- Avoid creating unnecessary helper files or utility modules for one-time operations
- Remove unused code completely rather than commenting it out

### When Committing

- Use concise commit messages that explain the purpose of the change
- Stage specific files rather than using `git add -A`
- Never commit secrets, credentials, or `.env` files

## Architecture Notes

_(To be documented as the project architecture is established. This section should cover:)_

- Data flow and processing pipeline
- Key modules and their responsibilities
- External data sources or APIs used
- Database or storage layer (if applicable)
- Deployment targets and CI/CD pipeline

## Domain Context

**Health Technology Assessment (HTA)** is the systematic evaluation of properties, effects, and impacts of health technologies and interventions. Reimbursement pricing is a key output of HTA processes, determining the price at which healthcare systems will reimburse drugs, devices, or therapies.

Key domain concepts that may appear in this codebase:

- **ICER** — Incremental Cost-Effectiveness Ratio
- **QALY** — Quality-Adjusted Life Year
- **DALY** — Disability-Adjusted Life Year
- **CEA** — Cost-Effectiveness Analysis
- **BIA** — Budget Impact Analysis
- **Reference pricing** — pricing based on comparable therapies
- **Value-based pricing** — pricing tied to clinical outcomes
- **Willingness-to-pay threshold** — maximum acceptable cost per QALY gained

## Updating This File

This CLAUDE.md should be kept up to date as the project evolves. When making significant structural changes (adding frameworks, changing build tools, modifying directory layout), update the relevant sections of this file.
