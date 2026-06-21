Deployment steps — Vercel (web) + Railway (API)

1) Web (Vercel)
- Connect your GitHub repository to Vercel and import the project.
- Set the Root or Project Settings to run the monorepo build:
  - Install command: `pnpm install`
  - Build command: `pnpm --filter @finos/web build`
  - Output directory: `.next`
- Add environment variable `NEXT_PUBLIC_API_URL` with the public API URL (from Railway).

2) API (Railway)
- Option A — Deploy from Docker image (recommended with CI):
  - The workflow `.github/workflows/build-and-push-api.yml` builds and pushes an image to GitHub Container Registry on pushes to `main`.
  - In Railway, create a new Project -> New Service -> choose Docker image and point it at `ghcr.io/<OWNER>/<REPO>:api-<sha>` (replace tags as needed).

- Option B — Connect Railway to this GitHub repo and instruct Railway to build using `apps/api/Dockerfile`.

3) Required environment variables (set in Railway project service settings):
- `DATABASE_URL` — e.g. `postgresql://finos:finos@<railway-postgres-host>:5432/finos?schema=public`
- `REDIS_URL` — e.g. `redis://<railway-redis-host>:6379`
- `ENABLE_WORKERS` — `true`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — strong random secrets
- `WEB_ORIGIN` — your Vercel URL (e.g. `https://your-app.vercel.app`)
- `API_PORT` — `4000` (if needed)

4) Secrets and CI notes
- No Railway secret is required for the provided workflow; it pushes the image to GitHub Container Registry. If you want the workflow to trigger a Railway deploy automatically, create a Railway API key and we can add a deploy step to the workflow.
- Ensure the repository has the `GITHUB_TOKEN` (provided automatically) and that GitHub Packages (GHCR) is enabled.

5) Verify
- After Vercel builds the web, confirm the site loads and calls to `NEXT_PUBLIC_API_URL` return 200.
- In Railway, check service logs for the API and run database migrations if needed (use `pnpm --filter @finos/database prisma:migrate` locally or via a Railway one-off command).

If you want, I can:
- add an automatic Railway deploy step to the GitHub Action (requires a `RAILWAY_API_KEY` repo secret), or
- set up a full workflow that builds, pushes, and runs `railway up` to deploy.
