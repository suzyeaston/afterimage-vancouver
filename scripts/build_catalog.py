#!/usr/bin/env python3
"""AFTERIMAGE signal processing: trusted public ATS feeds -> SQLite -> static JSON.
No scraping, paid API, secret, candidate history, or personal data is published.
"""
import argparse
import datetime as dt
import json
import pathlib
import sqlite3
import sys
import urllib.error
import urllib.request
from urllib.parse import urlparse

ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'
BUILD = ROOT / 'build'
TODAY = dt.datetime.now(dt.timezone.utc).date()
MAX_AGE_DAYS = 14


def load(name):
    return json.loads((DATA / name).read_text(encoding='utf-8'))


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, sort_keys=False) + '\n', encoding='utf-8')


def get_json(url):
    req = urllib.request.Request(url, headers={
        'User-Agent': 'AFTERIMAGE-Vancouver/0.1 (+https://github.com/suzyeaston/afterimage-vancouver)',
        'Accept': 'application/json',
    })
    with urllib.request.urlopen(req, timeout=16) as response:
        if int(response.headers.get('Content-Length', 0)) > 5_000_000:
            raise ValueError('ATS response too large')
        raw = response.read(5_000_001)
        if len(raw) > 5_000_000:
            raise ValueError('ATS response too large')
        return json.loads(raw)


def plausible_local(location):
    loc = str(location).lower()
    return any(x in loc for x in ('vancouver', 'british columbia', 'burnaby', 'remote', 'canada'))


def greenhouse_jobs(company):
    board = company['ats']['board']
    data = get_json(f'https://boards-api.greenhouse.io/v1/boards/{board}/jobs')
    out = []
    for job in data.get('jobs', []):
        location = job.get('location', {}).get('name', '')
        if not plausible_local(location):
            continue
        title = job.get('title', 'Untitled')
        url = job.get('absolute_url')
        if not url or not url.startswith('https://'):
            continue
        is_eoi = any(token in title.lower() for token in ('expression of interest', 'general application'))
        out.append({
            'id': f"gh-{board}-{job['id']}", 'employer_id': company['id'], 'title': title,
            'url': url, 'observed_at': TODAY.isoformat(), 'posted_at': '',
            'type': 'expression-of-interest' if is_eoi else 'listed',
            'track': 'ATS discovery', 'note': f'Official Greenhouse board · {location}',
            'origin': 'api',
        })
    return out


def lever_jobs(company):
    board = company['ats']['board']
    data = get_json(f'https://api.lever.co/v0/postings/{board}?mode=json')
    out = []
    for job in data:
        categories = job.get('categories', {})
        location = categories.get('location', '') + ' ' + job.get('workplaceType', '')
        if not plausible_local(location):
            continue
        title = job.get('text', 'Untitled')
        url = job.get('hostedUrl')
        if not url or not url.startswith('https://'):
            continue
        is_eoi = 'general application' in title.lower()
        out.append({
            'id': f"lever-{board}-{job['id']}", 'employer_id': company['id'],
            'title': title, 'url': url, 'observed_at': TODAY.isoformat(),
            'posted_at': '', 'type': 'expression-of-interest' if is_eoi else 'listed',
            'track': categories.get('team') or 'ATS discovery',
            'note': f'Official Lever board · {location.strip()}', 'origin': 'api',
        })
    return out


def validate_targets(companies):
    ids = [c['id'] for c in companies]
    if len(ids) != len(set(ids)):
        raise ValueError('Duplicate employer ids')
    for c in companies:
        if not (48.9 < c['lat'] < 49.7 and -123.5 < c['lng'] < -122.5):
            raise ValueError(f'Invalid Metro Vancouver coordinate: {c["id"]}')
        for key in ('website', 'careers', 'source'):
            if urlparse(c[key]).scheme != 'https':
                raise ValueError(f'Invalid source URL: {c["id"]}.{key}')


def status_for(job):
    observed = dt.date.fromisoformat(job['observed_at'])
    days = (TODAY - observed).days
    if days < 0:  # clock skew or a future observation must not count as live
        return 'needs-review'
    if days > MAX_AGE_DAYS:
        return 'needs-review'
    if job['type'] == 'expression-of-interest':
        return 'interest-only'
    return 'recently-listed'


def build(refresh=False, append_history=False):
    companies = load('targets.json')
    validate_targets(companies)
    manual = load('manual_openings.json')
    signals = load('signals.json')
    all_ids = {c['id'] for c in companies}
    for job in manual:
        if job['employer_id'] not in all_ids:
            raise ValueError(f'Unknown employer {job["employer_id"]}')
        if urlparse(job['url']).scheme != 'https':
            raise ValueError('Job URL must use HTTPS')
    fresh, updated_boards, errors = [], set(), []
    if refresh:
        for company in companies:
            adapter = (company.get('ats') or {}).get('type')
            if not adapter:
                continue
            try:
                pulled = {'greenhouse': greenhouse_jobs, 'lever': lever_jobs}[adapter](company)
                fresh.extend(pulled)
                updated_boards.add(company['id'])
                print(f"Updated {company['id']}: {len(pulled)} official ATS listings")
            except (urllib.error.URLError, TimeoutError, ValueError, KeyError, TypeError) as ex:
                errors.append(f"{company['id']}: {ex}")
                print('WARN: '+errors[-1], file=sys.stderr)

    # Successful board refresh supersedes all manually observed jobs for that board.
    # Unavailable sources retain dated manual observations, which will expire to needs-review.
    jobs = [dict(job, origin='manual') for job in manual if job['employer_id'] not in updated_boards]
    jobs.extend(fresh)
    seen = set()
    deduped = []
    for job in jobs:
        key = (job['employer_id'], job['title'].strip().lower())
        if key in seen:
            continue
        seen.add(key)
        entry = dict(job)
        entry['status'] = status_for(job)
        deduped.append(entry)
    deduped.sort(key=lambda x: (x['status'] != 'recently-listed', x['employer_id'], x['title']))

    for company in companies:
        employer_jobs = [j for j in deduped if j['employer_id'] == company['id']]
        company['recent_roles'] = sum(j['status'] == 'recently-listed' for j in employer_jobs)
        company['interest_forms'] = sum(j['status'] == 'interest-only' for j in employer_jobs)

    catalogue = {
        'title': 'AFTERIMAGE / VANCOUVER', 'generated_at': dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds'),
        'max_freshness_days': MAX_AGE_DAYS,
        'sources_refreshed': sorted(updated_boards), 'refresh_errors': errors,
        'employers': companies, 'jobs': deduped, 'signals': signals,
        'counts': {'employers': len(companies), 'recent_roles': sum(j['status'] == 'recently-listed' for j in deduped),
                   'interest_forms': sum(j['status'] == 'interest-only' for j in deduped),
                   'needs_review': sum(j['status'] == 'needs-review' for j in deduped)},
        'disclaimer': 'Recently listed is not guaranteed open. Confirm each role at the official source. Pins represent public offices or approximate areas, never an exact job site unless indicated.',
    }
    BUILD.mkdir(parents=True, exist_ok=True)
    dbpath = BUILD / 'afterimage.db'
    dbpath.unlink(missing_ok=True)
    conn = sqlite3.connect(dbpath)
    try:
        conn.executescript('''
            PRAGMA foreign_keys=ON;
            CREATE TABLE employers (id TEXT PRIMARY KEY, name TEXT NOT NULL, sector TEXT NOT NULL,
                district TEXT, lat REAL, lng REAL, fit INTEGER, website TEXT, careers TEXT);
            CREATE TABLE jobs (id TEXT PRIMARY KEY, employer_id TEXT NOT NULL REFERENCES employers(id),
                title TEXT NOT NULL, url TEXT NOT NULL, status TEXT NOT NULL, observed_at TEXT NOT NULL,
                track TEXT, origin TEXT);
            CREATE TABLE signals (id TEXT PRIMARY KEY, title TEXT NOT NULL, category TEXT, summary TEXT, url TEXT);
            CREATE INDEX jobs_employer_status ON jobs(employer_id, status);
        ''')
        conn.executemany('INSERT INTO employers VALUES (?,?,?,?,?,?,?,?,?)', [
            (c['id'], c['name'], c['sector'], c['district'], c['lat'], c['lng'], c['fit'], c['website'], c['careers']) for c in companies
        ])
        conn.executemany('INSERT INTO jobs VALUES (?,?,?,?,?,?,?,?)', [
            (j['id'], j['employer_id'], j['title'], j['url'], j['status'], j['observed_at'], j.get('track'), j['origin']) for j in deduped
        ])
        conn.executemany('INSERT INTO signals VALUES (?,?,?,?,?)', [
            (s['id'], s['title'], s['category'], s['summary'], s['source']) for s in signals
        ])
        conn.commit()
    finally:
        conn.close()
    write_json(DATA / 'catalog.json', catalogue)

    if append_history:
        history = load('history.json')
        today = TODAY.isoformat()
        record = {'date': today, **catalogue['counts'], 'updated_boards': sorted(updated_boards)}
        history = [x for x in history if x['date'] != today] + [record]
        write_json(DATA / 'history.json', sorted(history, key=lambda x: x['date'])[-365:])
    print(f"Snapshot: {len(companies)} employers, {catalogue['counts']['recent_roles']} recently listed, {catalogue['counts']['needs_review']} needs review")
    return catalogue


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--refresh', action='store_true', help='Poll allowlisted public Greenhouse / Lever endpoints')
    parser.add_argument('--append-history', action='store_true', help='Append aggregate snapshots only, no private data')
    args = parser.parse_args()
    build(args.refresh, args.append_history)
