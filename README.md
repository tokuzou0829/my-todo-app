# My Todo App

My Todo App is an authenticated productivity app built with Next.js App Router, Hono, Better Auth, Drizzle ORM, PostgreSQL, and Cloudflare R2-compatible storage.

You can use this app as a personal data management tool for yourself, or as a platform to share your personal data, making it extremely convenient to use!

## Features

- Authenticated todo management.
- Subscription tracking.
- Finance entries, tags, and analytics.
- Scrap storage backed by R2-compatible object storage.
- Developer API keys for external clients.
- Developer API for todos, scraps, subscriptions, finance, and account data.

## Tech Stack

- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS v4
- API: Hono on Next.js Route Handlers
- Auth: Better Auth
- Database: Drizzle ORM and PostgreSQL
- Storage: Cloudflare R2-compatible storage via aws4fetch
- Push notifications: web-push
- Tooling: pnpm, Vitest, Biome, ESLint, Prettier, Lefthook

## Project Structure

```txt
app/       Next.js App Router pages and API route entrypoint
components/ React UI components
db/        Drizzle schema and migrations
docs/      Project and API documentation
lib/       Shared client, auth, database, and utility code
server/    Hono routes, use cases, repositories, and domain objects
tests/     Test setup helpers
```

## Documentation

- [Start the app locally](./docs/start.md)
- [Documentation index](./docs/README.md)
- [Developer API](./docs/developer-api/README.md)

## Requirements

- Node.js `22.14.0`
- pnpm `10.28.1`
- Docker for local PostgreSQL

See [Start the app locally](./docs/start.md) for setup and development commands.

## About the use of AI

I am using AI to create this project.

AI was used for the following parts:

- Actual coding
- English translation of README and work logs

AI was not used for the following parts:

- Actual application operation testing
- Code review

While using AI for coding, I pursue more beautiful and user-friendly UIs by refining prompts and repeating the process. I am also dedicated to creating bug-free applications.
