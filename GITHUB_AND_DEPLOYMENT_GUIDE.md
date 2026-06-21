# FinOS GitHub Upload and Deployment Guide

This guide assumes you are new to Git, GitHub, and deployment. Follow the steps in order.

## 1. Recommended Deployment

Use:

- GitHub for storing the source code
- Vercel for the Next.js frontend
- Railway for the NestJS API
- Railway PostgreSQL for the database
- Railway Redis for BullMQ background jobs

The architecture will be:

```text
GitHub repository
  |-- Vercel -> apps/web
  `-- Railway -> apps/api
        |-- PostgreSQL
        `-- Redis
```

## 2. What Should Be Uploaded?

Upload the source code and configuration:

```text
apps/
packages/
docs/
.editorconfig
.env.example
.env.production.example
.gitignore
package.json
pnpm-lock.yaml
pnpm-workspace.yaml
turbo.json
docker-compose.yml
README.md
all project documentation files
```

Upload Prisma migrations after creating them:

```text
packages/database/prisma/migrations/
```

Do not upload:

```text
node_modules/
.next/
dist/
build/
coverage/
.turbo/
.env
.env.local
.env.production
log files
real passwords, tokens, or database URLs
```

The existing `.gitignore` already excludes these generated and secret files.

The example environment files are safe to upload only while they contain placeholders. Never replace placeholder secrets in an example file with real secrets.

## 3. Current Project Readiness

The following checks currently pass after generating Prisma Client:

```text
Prisma schema validation
API TypeScript type check
```

The frontend TypeScript configuration was corrected for the installed TypeScript version.

Before production deployment, you still need to create and commit the initial Prisma migration. The repository currently contains `schema.prisma`, but no `prisma/migrations` directory.

## 4. Install Git

Check whether Git is installed:

```powershell
git --version
```

Download Git from:

```text
https://git-scm.com/download/win
```

Configure your identity once:

```powershell
git config --global user.name "Your Name"
git config --global user.email "your-github-email@example.com"
```

Use the email connected to your GitHub account.

## 5. Create the Initial Database Migration

Do this before the first GitHub upload so production has a versioned database structure.

Start PostgreSQL and Redis:

```powershell
docker compose up -d postgres redis
```

Set the local database URL for the current PowerShell window:

```powershell
$env:DATABASE_URL="postgresql://finos:finos@localhost:5432/finos?schema=public"
```

Generate Prisma Client:

```powershell
pnpm --filter @finos/database prisma:generate
```

Create the initial migration:

```powershell
pnpm --filter @finos/database exec prisma migrate dev --name init
```

This should create:

```text
packages/database/prisma/migrations/
```

Commit this directory to GitHub. Production deployments use migration files, not only `schema.prisma`.

Do not use `prisma migrate dev` against a production database.

## 6. Run Checks Before Uploading

In PowerShell:

```powershell
$env:DATABASE_URL="postgresql://finos:finos@localhost:5432/finos?schema=public"
pnpm --filter @finos/database prisma:generate
pnpm --filter @finos/database prisma:validate
pnpm --filter @finos/api typecheck
pnpm --filter @finos/web typecheck
pnpm --filter @finos/api test
pnpm --filter @finos/api build
pnpm --filter @finos/web build
```

Do not deploy merely because files were uploaded. A production build should pass first.

## 7. Check Exactly What Git Will Upload

This folder is not currently a Git repository, so initialize it:

```powershell
git init -b main
```

Preview ignored files:

```powershell
git status --ignored
```

Stage allowed files:

```powershell
git add .
```

Review the staged file list:

```powershell
git status
git diff --cached --stat
```

Important checks:

- `node_modules` must not appear.
- `.next` must not appear.
- `.env` must not appear.
- Real passwords or tokens must not appear.
- `pnpm-lock.yaml` should appear.
- Prisma migrations should appear.

Create the first commit:

```powershell
git commit -m "Initial FinOS project"
```

## 8. Create the GitHub Repository

1. Sign in at `https://github.com`.
2. Click the `+` button.
3. Select `New repository`.
4. Repository name: `finos`.
5. Add a description such as `Multi-tenant financial operating system for SMEs`.
6. Choose `Private` initially if you are unsure about exposing the code.
7. Do not add another README, `.gitignore`, or license during creation.
8. Click `Create repository`.

GitHub will show a repository URL similar to:

```text
https://github.com/YOUR_USERNAME/finos.git
```

Connect and push:

```powershell
git remote add origin https://github.com/YOUR_USERNAME/finos.git
git remote -v
git push -u origin main
```

GitHub no longer accepts an account password for command-line Git authentication. Use the browser sign-in flow, Git Credential Manager, SSH, or a personal access token when prompted.

## 9. Easier Alternative: GitHub Desktop

You may use GitHub Desktop instead of terminal authentication:

1. Install GitHub Desktop.
2. Sign in.
3. Select `File` -> `Add local repository`.
4. Select the FinOS folder.
5. If requested, create a repository in this folder.
6. Review all changed files.
7. Commit with `Initial FinOS project`.
8. Click `Publish repository`.
9. Keep it private initially if preferred.

The `.gitignore` rules still control generated and secret files.

## 10. Future GitHub Updates

After changing code:

```powershell
git status
git add .
git commit -m "Describe the change"
git push
```

Example:

```powershell
git commit -m "fix(api): improve payment validation"
```

## 11. Generate Strong JWT Secrets

Run this twice and store the two outputs separately:

```powershell
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Use one output for `JWT_ACCESS_SECRET` and the other for `JWT_REFRESH_SECRET`.

Add them only in Railway's Variables page. Do not put them in GitHub files.

## 12. Deploy PostgreSQL and Redis on Railway

1. Sign in at `https://railway.com`.
2. Create a new project.
3. Add a PostgreSQL database.
4. Add a Redis database.
5. Keep both services private inside the Railway project.

Railway provides connection variables. Use the supplied PostgreSQL connection string as `DATABASE_URL` and Redis connection string as `REDIS_URL`.

## 13. Deploy the API on Railway

Create a service from the GitHub repository.

Because this is a shared pnpm monorepo, use the repository root as the build context. Configure:

```text
Dockerfile path: apps/api/Dockerfile
```

If Railway asks through variables, set:

```text
RAILWAY_DOCKERFILE_PATH=apps/api/Dockerfile
```

API variables:

```env
NODE_ENV=production
DATABASE_URL=<Railway PostgreSQL URL>
REDIS_URL=<Railway Redis URL>
JWT_ACCESS_SECRET=<first generated secret>
JWT_REFRESH_SECRET=<second generated secret>
WEB_ORIGIN=https://YOUR_VERCEL_DOMAIN
ENABLE_WORKERS=true
```

Do not set a fixed `PORT` unless Railway requires it for a special configuration. Railway provides `PORT`, and the API now supports it automatically.

Generate a public Railway domain for the API. It will look similar to:

```text
https://finos-api-production.up.railway.app
```

## 14. Apply Production Database Migrations

Production should use:

```powershell
pnpm --filter @finos/database exec prisma migrate deploy
```

On Railway, add this as a pre-deploy command when the migration directory exists:

```text
pnpm --filter @finos/database exec prisma migrate deploy
```

Do not use this until the initial migration has been created and committed.

Do not use `prisma migrate dev` in production.

Seed data only for a portfolio demo environment:

```powershell
pnpm --filter @finos/database seed
```

Never seed demo users into a real customer production database.

## 15. Deploy the Frontend on Vercel

1. Sign in at `https://vercel.com`.
2. Select `Add New` -> `Project`.
3. Import the GitHub `finos` repository.
4. Set Framework Preset to `Next.js`.
5. Set Root Directory to:

```text
apps/web
```

6. Add:

```env
NEXT_PUBLIC_API_URL=https://YOUR_RAILWAY_API_DOMAIN
```

7. Deploy.

Vercel should detect the root `pnpm-lock.yaml` and workspace.

Your frontend domain will look similar to:

```text
https://finos-yourname.vercel.app
```

## 16. Connect Vercel and Railway

After Vercel gives you the final frontend URL, return to Railway and set:

```env
WEB_ORIGIN=https://finos-yourname.vercel.app
```

Redeploy the API.

Why?

The browser blocks cross-origin API requests unless the API allows the exact frontend origin through CORS.

Do not include a trailing slash unless the configured frontend origin also uses it consistently.

## 17. Correct Deployment Order

Use this order:

1. Create and commit Prisma migration.
2. Push the project to GitHub.
3. Create Railway PostgreSQL.
4. Create Railway Redis.
5. Deploy Railway API.
6. Apply production migration.
7. Copy the Railway API URL.
8. Deploy Vercel web with `NEXT_PUBLIC_API_URL`.
9. Copy the Vercel URL.
10. Set Railway `WEB_ORIGIN`.
11. Redeploy and test.

## 18. Test the Deployment

Check:

1. The Vercel page opens.
2. Browser developer tools show no CORS error.
3. Signup reaches the API.
4. Login works after account activation or seeded demo setup.
5. Company creation works.
6. Customer creation works.
7. Invoice creation and posting work.
8. Payment creation works.
9. Railway logs show no database or Redis connection errors.
10. Background workers start when `ENABLE_WORKERS=true`.

The project currently has no dedicated API health endpoint, so inspect Railway logs and test a real endpoint until one is added.

## 19. Common Errors

### `DATABASE_URL` is missing

Add it to Railway variables or set it in the local PowerShell session before Prisma commands.

### Prisma exports are missing during TypeScript checks

Run:

```powershell
pnpm --filter @finos/database prisma:generate
```

### CORS error in the browser

Set Railway:

```env
WEB_ORIGIN=https://your-exact-vercel-domain
```

Then redeploy the API.

### Frontend calls localhost after deployment

Set this in Vercel and redeploy:

```env
NEXT_PUBLIC_API_URL=https://your-railway-api-domain
```

`NEXT_PUBLIC_API_URL` is embedded into browser code during the build.

### No database tables

Create and commit migrations locally, then run:

```powershell
pnpm --filter @finos/database exec prisma migrate deploy
```

### Git uploads `node_modules`

Check that `.gitignore` exists before `git add .`.

If files were staged but not committed:

```powershell
git restore --staged node_modules
```

### A secret was pushed

Immediately rotate the secret. Removing it from the latest file is not enough because it may remain in Git history.

## 20. Public Portfolio Checklist

Before making the repository public:

- No real `.env` file
- No live database URL
- No JWT secrets
- No provider API keys
- No private customer data
- No personal access tokens
- Demo credentials are intentionally documented
- README includes screenshots
- License choice is deliberate
- Build and type checks pass
- Deployment URLs work
- Database migrations are committed

## 21. Official References

- GitHub existing project upload: `https://docs.github.com/get-started/importing-your-projects-to-github/importing-source-code-to-github/adding-an-existing-project-to-github-using-the-command-line`
- GitHub Desktop publishing: `https://docs.github.com/desktop/adding-and-cloning-repositories/adding-an-existing-project-to-github-using-github-desktop`
- Vercel monorepos: `https://vercel.com/docs/monorepos`
- Vercel Next.js deployment: `https://vercel.com/docs/frameworks/nextjs`
- Railway monorepos: `https://docs.railway.com/guides/monorepo`
- Railway Redis: `https://docs.railway.com/databases/redis`
- Prisma production migrations: `https://www.prisma.io/docs/cli/migrate/deploy`
