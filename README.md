# AFTERIMAGE // VANCOUVER

**An experimental atlas of creative work.** Not a commodity job board. A cartographic field recorder for the overlap between film, VFX, games, music technology, AI systems, infrastructure, and the people building interesting things in Vancouver.

Built by Suzy Easton. Designed to be a companion to [suzyeaston.ca](https://suzyeaston.ca), which already has a Vancouver radar, field audio, and a Gastown world-building experiment.

## Start here

```bash
# Unzip this folder, then:
cd afterimage-vancouver
python3 scripts/build_catalog.py
python3 -m unittest discover -s tests -v
python3 -m http.server 8787
# Open http://localhost:8787
```

**Create the public repository** (GitHub CLI required, no secret token in this repo):

```bash
brew install gh       # if not already installed
# gh auth login       # if not already signed in
gh auth status
bash scripts/create-repo.sh
```

This verifies the account as `suzyeaston`, initializes git, runs tests, creates the repo `suzyeaston/afterimage-vancouver`, pushes `main`, attempts to enable GitHub Pages via Actions, and requests first publication. If Pages requires a manual setting, the script explains it.

- Repo: `https://github.com/suzyeaston/afterimage-vancouver`
- Expected public atlas after deployment: `https://suzyeaston.github.io/afterimage-vancouver/`
- WordPress integration: [`site-integration/README.md`](site-integration/README.md)

## Data rules / how to read the map

The creative map is **editorial**, but the hiring signals are **source-backed**. An employer being present does *not* mean it is hiring. A source may remain online after a job closes. “Recently listed” means an official source was observed within 14 days, **not** that an application is still open. Expression-of-interest forms have their own category. Jobs older than 14 days without a new observation become **needs recheck**. The Map uses approximate office or city coordinates and explicitly labels uncertainty. It is not intended for navigating to workplaces.

**Seed snapshot checked November 6, 2026** from official career sources including:

- [Disney Animation Vancouver](https://www.disneycareers.com/en/job/vancouver/sr-software-engineer-emerging-technology/391/102471835424)
- [Netflix Animation](https://explore.jobs.netflix.net/careers?domain=netflix.com&pid=790318358916)
- [Sony Pictures Imageworks](https://job-boards.greenhouse.io/sonypicturesimageworks)
- [Image Engine](https://image-engine.com/jobs/)
- [Blackbird Interactive](https://jobs.lever.co/blackbirdinteractive)
- [Kanto Audio](https://kantoaudio.com/en-ca/pages/careers)

This is a curated starting set, not a comprehensive Vancouver labour-market census. Some cards are a *watchlist only* (e.g. Beatdapp, EA and ILM); no vacancy is asserted for them without a verified listing. Some roles may be a stretch but are useful to study for trends.

## What's in the machine

```text
index.html                 Responsive experimental map interface
assets/{app.js,style.css}  Leaflet map, active filters, detail overlays and signal dispatches
data/targets.json          Public employer profiles and map centroids
 data/manual_openings.json Human-verified job sightings
 data/signals.json         Dated research observations and hypotheses
 data/catalog.json         Generated public site snapshot
 data/history.json         Aggregated daily source counts (no personal data)
scripts/build_catalog.py   JSON → local SQLite → public JSON; optional ATS poll
scripts/track.py           Local-only application notebook (never published)
.github/workflows/         Daily checks and GitHub Pages deployment
site-integration/          WordPress page template
```

**Database:** running the builder creates `build/afterimage.db` using standard-library SQLite. It stores normalized `employers`, `jobs` and `signals`; the static site consumes a safe JSON projection. The database is ignored by git. All public source data is versioned for auditable changes.

**Source refresh:**

```bash
python3 scripts/build_catalog.py --refresh --append-history
```

Official, unauthenticated Greenhouse (`boards-api.greenhouse.io`) and Lever (`api.lever.co`) endpoints are used only for explicitly configured ATS boards. Each new record has a source URL and a timestamp. Feed failures do not magically turn old observations into current facts. No aggressive crawling, LinkedIn scraping, invented statuses, or applicant data. Scheduled GitHub Actions checks the allowlist once daily and republishes committed snapshots. Rate limits and employer terms still apply.

**Personal pipeline, stored only on your Mac:**

```bash
python3 scripts/track.py add --company 'Walt Disney Animation Studios' --role 'Sr. Software Engineer, Emerging Technology' --stage researching --note 'Agent tooling + studio engineering'
python3 scripts/track.py list
```

That file is `private/applications.db` and ignored by git. **Do not paste private recruiter conversations or personal financial information into the public JSON files.**

## Next mutations

- Expand source adapters beyond the current two verified ATS boards; validate one at a time.
- Add optional concert venues, creative communities and studios as *network nodes*, visually distinct from employers and openings.
- Add event/grant/residency layers with separate source and date rules.
- Plot week-over-week changes from `data/history.json`, not algorithmic claims about an entire industry.
- Consider importing public City of Vancouver business/industry data for richer geographic context.
- A consent-based contact layer might help networking, but it must remain private and opt-in.

## Respect the city

Vancouver is on the unceded territories of the xʷməθkʷəy̓əm (Musqueam), Sḵwx̱wú7mesh (Squamish Nation) and səlilwətaɬ (Tsleil-Waututh Nation). The map uses OpenStreetMap data styled by CARTO. Attribution is shown on the map. CSS and artwork here are original; no third-party poster or photography is embedded.

MIT-licensed project code. Links and company names belong to their respective owners.
