#!/usr/bin/env python3
"""Private application notebook. Never committed or published."""
import argparse
import datetime as dt
import pathlib
import sqlite3

ROOT = pathlib.Path(__file__).resolve().parents[1]
DB = ROOT / 'private' / 'applications.db'
STAGES = ('saved', 'researching', 'applied', 'interviewing', 'offer', 'closed')


def main():
    parser = argparse.ArgumentParser(description='AFTERIMAGE local-only application tracker')
    sub = parser.add_subparsers(dest='command', required=True)
    add = sub.add_parser('add', help='Create or update a private opportunity')
    add.add_argument('--company', required=True)
    add.add_argument('--role', required=True)
    add.add_argument('--stage', choices=STAGES, default='saved')
    add.add_argument('--url', default='')
    add.add_argument('--note', default='')
    sub.add_parser('list', help='List private applications')
    args = parser.parse_args()
    DB.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(DB)
    try:
        con.execute('''CREATE TABLE IF NOT EXISTS applications
            (id INTEGER PRIMARY KEY, company TEXT NOT NULL, role TEXT NOT NULL,
             stage TEXT NOT NULL, url TEXT, note TEXT, updated_at TEXT,
             UNIQUE (company, role))''')
        if args.command == 'add':
            con.execute('''INSERT INTO applications(company,role,stage,url,note,updated_at)
              VALUES(?,?,?,?,?,?) ON CONFLICT(company,role) DO UPDATE SET
              stage=excluded.stage,url=excluded.url,note=excluded.note,
              updated_at=excluded.updated_at''',
              (args.company,args.role,args.stage,args.url,args.note,dt.date.today().isoformat()))
            con.commit()
            print(f'Private record saved in {DB.relative_to(ROOT)}. This file is gitignored.')
        else:
            rows=con.execute('SELECT company,role,stage,updated_at FROM applications ORDER BY updated_at DESC, company').fetchall()
            for company,role,stage,updated in rows:
                print(f'{updated} | {stage:12} | {company} — {role}')
            if not rows:
                print('No private application records yet.')
    finally:
        con.close()


if __name__=='__main__':
    main()
