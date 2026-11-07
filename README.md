# AFTERIMAGE // VANCOUVER

## Interface / November 2026 redesign

AFTERIMAGE v2 is an **open, single-scroll field guide** with one shared search and visible sections for job leads, BC AI Compass organizations, The Observatory's historical connections, community echoes and sourced field observations. There is no layer-switch maze. The geographic map now uses an open, keyless vector basemap via OpenFreeMap and MapLibre.

The map is a **real zoomable street map** using [OpenFreeMap](https://openfreemap.org/) vector tiles and [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/). These sources are public, keyless services, not an opaque API-key-dependent raster mosaic. Employer coordinates are plotted from sourced/approximate catalogue positions; MapLibre dynamically clusters overlapping employers. Compass records sharing a municipal centroid remain one clearly labelled count marker, **never a fictional shared office**. MapLibre and the open basemap are optional third-party dependencies: if they fail, the job and organization directories stay available with an external OpenStreetMap link. Scroll-wheel zoom is disabled to preserve the WordPress page's single-scroll behavior.

Public page: `index.html` + `assets/atlas-core.js`, `assets/city-map.js`, `assets/atlas.js`, `assets/atlas.css`. The previous Leaflet and experimental SVG implementations are no longer loaded; the map lives in `assets/city-map.js`. Legacy code remains in the repository for migration history. All datasets and source attribution are preserved. The standalone page can report its height to the trusted `suzyeaston.ca` embed via a restricted `postMessage` handshake, avoiding nested scrollbars when the companion WordPress change is deployed.

**Scope reminder:** 10 curated employers are the only sources of observed job listings. The Compass dataset (99 organization records, August 20 source export), Observatory network (20 historical organization nodes), and the seven archived community events are research information, *not* active vacancies or endorsements. Always use the original source URLs and verification dates.

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

## BC + AI / community echoes

The **optional archival community layer** connects AFTERIMAGE with public, non-person community event records from [The Observatory](https://github.com/WalksWithASwagger/official-observer) (the archived public ecosystem map that is now maintained elsewhere). This is a **separate lens** from job listings: events are clearly marked *historical*, never presented as current RSVPs or hiring signals. A map marker is shown only where the venue is independently corroborated (H.R. MacMillan Space Centre). Other records appear as a source-linked historical directory without made-up coordinates.

- Original data: **“The Observatory — BC + AI ecosystem map”**, licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- Modification: selected non-person Vancouver event entities from the upstream public data, omitted relationships and other regions, and added a corroborated venue pin.
- Source revision: `732ca559c91105709ebab1ae2ea1fd6c79ff647c` (archived snapshot).
- [Vancouver AI Meetup Archive](https://github.com/bc-ai-ecosystem/vancouver-ai) provides additional public transcripts and recaps; it is linked rather than copied here.
- Refresh from the pinned upstream source using `python3 scripts/import_observatory.py`. Use `--input` to work from a verified local public `entities.json` file.

We did **not** fork an archived application simply to borrow its data. The source remains credited, and the atlas stays its own creative instrument. No private community contact graphs or identifiable profiles enter the site.

## Organization constellation / opt-in network view

**20 organizations, 16 org-to-org links and 59 directed organization-related connection records**, adapted from a *frozen public snapshot* of The Observatory. The graph distinguishes regions (Vancouver / BC / Victoria / national) using colored rings and an organization directory. **Node positions are conceptual**, not coordinates or business addresses.

- Select **Connect the organizations** in the atlas, search by organization, tag, or relationship, and filter by region.
- Click a node or a directory entry to read its public description and the explicitly sourced connections to other organizations, programmes, archived events, and initiatives. Linked organization nodes open one another.
- The connection verbs (e.g. `hosts`, `partners`, `collaborates`) are taken from the archived source, **not independently checked for current accuracy**. This does not imply hiring, affiliation, endorsement, sponsorship, or a currently running event.
- People and personal contact information are excluded. No extra geographic pins or fictitious connections are invented.
- Dataset: `data/organizations.json`; source provenance and CC BY 4.0 modification notice are included in the JSON and the interface.
- Reproduce from the pinned public archive using `python3 scripts/import_organizations.py` (network required), or use `--entities path/to/entities.json --relationships path/to/relationships.json` for an offline import. Refresh intentionally, not automatically from an unreviewed mutable feed.

The organization layer is **not** an extension of the job-openings database: it helps discover organizations and communities to research separately. The employer cards still link to official job sources and only those are permitted to imply a recently observed role.

## BC AI Compass / source-checked organization discovery

Martin Montero's [BC AI Compass](https://bc-aicompass.ca/) contains a publicly licensed, source-checked BC organization directory. AFTERIMAGE includes an **optional, separately labeled** local research lens based on its `public/ecosystem.json` export.

- **99 organizations** selected from the pinned public export: 90 in Metro Vancouver, 9 province-wide. Records are not job vacancies and do not add to the employer-openings count.
- Source export is dated **August 20, 2026**. The upstream README mentions a larger current count; the imported dataset is explicitly a dated snapshot and does not claim live re-verification.
- Original source URL, source-check date, category and original verification flags remain on every record. Clicking a record opens its original website/evidence page and links back to the BC AI Compass project.
- **Geographic honesty:** Metro Vancouver's 90 records have only 6 distinct mapped positions in this particular export, often shared municipal centroids. AFTERIMAGE groups identical positions into count markers; a centroid is **never** presented as the location of an organization's office. Province-wide entries have no fabricated pins.
- A small, manually checked **four-record same-organization crosswalk** links the historical Observatory view to matching source-checked Compass records. These are identity links, not new partnership claims.
- Organization-only; no professional profiles, personal emails, or contact collections are imported. The project and its data remain Martin's, and there is no implied partnership, endorsement, or hiring relationship.
- Source [license](https://github.com/MartinMontero/BCAICompass/blob/main/LICENSE): the organization dataset is **CC BY 4.0**. Attribution: **BC AI Compass (bc-aicompass.ca), by Martin Montero**. Our transformation and pinned source SHA are recorded in `data/compass.json`.
- Rebuild the derived subset from the original pinned export with `python3 scripts/import_compass.py`, or run `python3 scripts/import_compass.py --input /path/to/ecosystem.json` to work offline. A fresh source revision requires a new provenance/freshness review before publishing.

Use **Explore source-checked BC organizations** to access this lens. It is separate from **Connect the organizations**, which illustrates historical relationships from The Observatory. Neither mode asserts an active job opening. The live hiring map remains based on employer career links.

### A basemap migration note

The original CARTO dark tiles began displaying **API KEY REQUIRED** watermarks after CARTO introduced API keys in September 2026. AFTERIMAGE now uses the [OpenStreetMap tile service](https://operations.osmfoundation.org/policies/tiles/) directly at low volume, using browser caching, proper attribution, and a locally applied CSS dark treatment. No key, no bulk tile downloads, no silent watermarking. For significant traffic, evaluate an appropriate paid or self-hosted basemap provider.

## Next mutations

- Expand source adapters beyond the current two verified ATS boards; validate one at a time.
- Add sourced creative spaces and grants/residencies as typed network nodes, distinct from employer openings.
- Add event/grant/residency layers with separate source and date rules.
- Plot week-over-week changes from `data/history.json`, not algorithmic claims about an entire industry.
- Consider importing public City of Vancouver business/industry data for richer geographic context.
- A consent-based contact layer might help networking, but it must remain private and opt-in.

## Respect the city

Vancouver is on the unceded territories of the xʷməθkʷəy̓əm (Musqueam), Sḵwx̱wú7mesh (Squamish Nation) and səlilwətaɬ (Tsleil-Waututh Nation). The map uses OpenStreetMap tiles and a local dark CSS treatment. Attribution is shown on the map. CSS and artwork here are original; no third-party poster or photography is embedded.

MIT-licensed project code. Links and company names belong to their respective owners.