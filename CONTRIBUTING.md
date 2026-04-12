# Contributing

Thanks for taking interest in contributing to this project. Please follow these guidelines to make collaboration smooth.

Setup
1. Copy example env: `cp .env.local.example .env.local` (or create `.env.local` manually) and fill real values.
2. Install deps: `npm install`
3. Run dev: `npm run dev`

Secrets
- Never commit `.env.local` or any files with secrets. If you accidentally push keys, rotate them immediately.

Code style
- Run `npm run lint` before creating PRs.
- Use small, focused commits with descriptive messages.

Pull Requests
- Fork or branch from `main`.
- Add a clear description and link related issues.
- CI should pass (lint/build). Maintainers will review and merge.

Local tests
- Add unit tests for new logic; use the test runner configured by the project (none by default).

Contact
- Open an issue for design discussions before large changes.
