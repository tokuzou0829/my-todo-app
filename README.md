# My Todo App

My Todo App is an authenticated productivity app built with Next.js App Router, Hono, Better Auth, Drizzle ORM, PostgreSQL, and Cloudflare R2-compatible storage.

The app provides personal workspace features for managing todos, subscriptions, finance records, scraps, push notifications, and API keys for external integrations.

## Features

- Authenticated todo management.
- Subscription tracking.
- Finance entries, tags, and analytics.
- Scrap storage backed by R2-compatible object storage.
- Web Push subscription management and test delivery.
- Developer API keys for external clients.
- Developer API for todos, subscriptions, finance, and account data.

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
