# Start the App Locally

This guide explains how to run My Todo App in a local development environment.

## Requirements

- Node.js `22.14.0` as defined in `.node-version`
- pnpm `10.28.1` as defined in `package.json`
- Docker for local PostgreSQL
- A separate [`iframe_sandbox`](https://github.com/tokuzou0829/iframe_sandbox) repository for scrap oEmbed previews, if you need embedded link previews

## 1. Install Dependencies

```bash
pnpm i
```

## 2. Create Local Environment Variables

```bash
cp .env.example .env
```

The example file contains local defaults for PostgreSQL and placeholder values for auth, R2-compatible storage, and Web Push.

Important variables:

- `BETTER_AUTH_URL`: local app URL, usually `http://localhost:3000`.
- `BETTER_AUTH_SECRET`: secret used by Better Auth. Generate a real value for shared or deployed environments.
- `DATABASE_URL`: PostgreSQL connection URL.
- `NEXT_PUBLIC_IFRAME_SANDBOX_URL`: iframe sandbox Worker URL, usually `http://localhost:8787` locally.
- `R2_S3_URL`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_URL`, `R2_BUCKET_NAME`: object storage settings.
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`: Web Push VAPID keys.

For local UI and API development, the placeholder R2 and VAPID values from `.env.example` are enough unless you need to exercise real storage or push notification delivery.

## 3. Start the Iframe Sandbox

Scrap link previews render third-party oEmbed HTML in a separate Hono/Cloudflare Workers sandbox. Clone the sandbox repository next to this app repository so it is available at `../iframe_sandbox`.

From the parent directory of this repository, clone and set up the sandbox:

```bash
git clone https://github.com/tokuzou0829/iframe_sandbox.git
cd iframe_sandbox
pnpm i
```

Create local Worker variables:

```bash
cp .dev.vars.example .dev.vars
```

For local development, `ALLOWED_ORIGINS` must include the Next.js app origin:

```env
ALLOWED_ORIGINS="http://localhost:3000"
```

Start the sandbox Worker:

```bash
pnpm dev
```

The local sandbox URL must match this app's `.env`:

```env
NEXT_PUBLIC_IFRAME_SANDBOX_URL="http://localhost:8787"
```

Do not commit production origins or secrets in `wrangler.jsonc`. For deployed Workers, upload `ALLOWED_ORIGINS` to Cloudflare with Wrangler secrets:

```bash
pnpm exec wrangler secret put ALLOWED_ORIGINS
```

Use a space-separated value for multiple parent app origins, for example `https://todo.example.com https://todo-staging.example.com`.

## 4. Start the Development Server

```bash
pnpm dev
```

This command starts PostgreSQL with Docker Compose, generates and runs Drizzle migrations, and starts the Next.js development server.

Open the app at:

```txt
http://localhost:3000
```

## Common Commands

```bash
pnpm dev
pnpm db:up
pnpm db:down
pnpm db:generate
pnpm db:migrate
pnpm db:studio
pnpm test
pnpm lint
pnpm fmt
pnpm build
pnpm start
```

## Database

Start the local database only:

```bash
pnpm db:up
```

Stop the local database:

```bash
pnpm db:down
```

Open Drizzle Studio:

```bash
pnpm db:studio
```

## Testing

Run all tests:

```bash
pnpm test
```

Run a single test file:

```bash
pnpm test -- server/routes/todos.test.ts
```

Some tests use Docker-based PostgreSQL test containers, so Docker must be running.

## Linting and Formatting

```bash
pnpm lint
pnpm fmt
```

`pnpm lint` runs Biome linting, ESLint, and Knip. `pnpm fmt` formats Markdown and YAML with Prettier and code files with Biome.

## Production Build

```bash
pnpm build
pnpm start
```

## Troubleshooting

### Docker is not running

`pnpm dev` and database-related commands require Docker. Start Docker and retry the command.

### PostgreSQL port is already in use

The local database uses port `5432` by default. Change `DATABASE_PORT` in `.env` if another PostgreSQL instance is already using that port.

### Environment validation fails

Check that `.env` exists and includes all variables from `.env.example`. The app validates required environment variables during startup.

### Migrations fail after schema changes

Regenerate and rerun migrations:

```bash
pnpm db:generate
pnpm db:migrate
```
