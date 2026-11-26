# CI/CD Documentation — GitHub Actions

This repository is a monorepo containing three projects. Each has its own
GitHub Actions workflow, triggered only when relevant files change.

## Repository layout

| Project | Path | Type | Workflow |
|---|---|---|---|
| Static website | `index.html`, `style.css`, `app.js` (repo root) | HTML/CSS/JS | `deploy-pages.yml` |
| Forestrun | `forestrun/` | Python (pandas data analysis + Flask demo) | `forestrun-ci.yml` |
| Hands-on-1 | `hands-on-1/` | Flask web app | `flask-ci.yml` |

## Workflows

### 1. `.github/workflows/forestrun-ci.yml` — Forestrun CI

**Purpose:** Validates the data analysis pipeline on every change.

- **Triggers:** push/PR to `main` touching `forestrun/**`, or manual (`workflow_dispatch`).
- **Runner:** `ubuntu-latest`, Python 3.12 with pip caching.
- **Steps:**
  1. Install `pandas` and `flake8`.
  2. Syntax-check all sources with `python -m compileall`.
  3. Lint with `flake8` (max line length 100).
  4. Run `analyze.py` as a smoke test (uses committed `data/prices.csv`).
  5. Upload generated files in `forestrun/results/` as a build artifact (kept 14 days).

### 2. `.github/workflows/flask-ci.yml` — Flask App CI (hands-on-1)

**Purpose:** Build verification and smoke test for the Flask app.

- **Triggers:** push/PR to `main` touching `hands-on-1/**`, or manual.
- **Steps:**
  1. Install dependencies from `hands-on-1/requirements.txt`.
  2. Verify `app.py` imports cleanly.
  3. Start the server (`python app.py`, port 8000), poll `http://127.0.0.1:8000/`
     with `curl` for up to 30 seconds, and fail the job if the app does not respond.

### 3. `.github/workflows/deploy-pages.yml` — Static Site Deploy (CD)

**Purpose:** Continuous deployment of the root static website to GitHub Pages.

- **Triggers:** push to `main` touching `index.html`, `style.css`, `app.js`, or manual.
- **Concurrency:** only one deployment at a time; in-progress runs are cancelled.
- **Jobs:**
  1. **validate** — syntax-checks `app.js` with Node 20 and verifies required files exist.
  2. **deploy** — stages `index.html`, `style.css`, `app.js` into a `site/` directory
     (so the Python projects are never published) and deploys to GitHub Pages.
- **Permissions:** uses OIDC (`id-token: write`), no stored cloud secrets needed.

## One-time setup

1. **Push this repository to GitHub** (workflows only run on GitHub).
2. **Enable GitHub Pages** for the static site:
   - Repository → **Settings → Pages → Build and deployment → Source**
   - Select **GitHub Actions**.
3. No secrets are required — all workflows use the default `GITHUB_TOKEN`.

## Badges (optional)

Add these to the root `README.md` once the repo is on GitHub
(replace `OWNER` and `REPO`):

```markdown
![Forestrun CI](https://github.com/OWNER/REPO/actions/workflows/forestrun-ci.yml/badge.svg)
![Flask App CI](https://github.com/OWNER/REPO/actions/workflows/flask-ci.yml/badge.svg)
![Pages Deploy](https://github.com/OWNER/REPO/actions/workflows/deploy-pages.yml/badge.svg)
```

## Extending

- **Tests:** the Python projects currently have no test suite. Add `pytest`
  tests under each project and insert a `pytest` step after dependency
  installation.
- **Linting JS:** add a step running `npx eslint .` for the static site.
- **Docker:** if you containerize the Flask apps, add a build/push job using
  `docker/build-push-action` after the smoke-test job passes.
- **Environments:** protect the `github-pages` environment
  (Settings → Environments) to require approvals before deployment.
