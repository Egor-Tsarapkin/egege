# EGEGE

The site is ready to run on a regular Linux VPS with Docker. Structured data is
stored in SQLite and uploaded files are stored on the VPS filesystem. Both are
kept in the persistent `data` directory.

## VPS deployment

Requirements:

- Ubuntu or another current Linux distribution;
- Docker Engine with Docker Compose;
- a domain whose `A` record points to the VPS;
- open TCP ports 80 and 443.

Copy the project to the VPS, then:

```bash
cp .env.example .env
```

Fill in the real domain and Yandex ID OAuth settings in `.env`.
Keep `ADMIN_EMAILS=egortsarapkinpersona@gmail.com` unless the administrator
account changes.

Start or update the site:

```bash
docker compose up -d --build
```

Caddy obtains and renews HTTPS certificates automatically. The application is
available only through Caddy; port 3000 is bound to the VPS loopback interface.

## Persistent data and backup

Back up the entire `data` directory. It contains:

- `egege.sqlite` — profiles, progress, consents, variants and analytics;
- `uploads/` — teacher files and images.

Create a consistent SQLite backup while the site is running:

```bash
docker compose exec egege node -e "const D=require('better-sqlite3');new D('/app/data/egege.sqlite').backup('/app/data/egege-backup.sqlite').then(()=>console.log('backup ready'))"
```

## Yandex ID authentication

Create an application for user authentication in Yandex OAuth and add this
redirect URL:

```text
https://YOUR-DOMAIN/auth/yandex/callback
```

Request only `login:info` and `login:email`. Put the issued client ID and client
secret in `.env`; never commit the client secret. User accounts, provider
identities, and sessions are stored in the local SQLite database.

## Local verification

```bash
npm ci
npm test
npm start
```

The previous Sites/Cloudflare build remains available as `npm run build:sites`.

## Daily КЕГЭ synchronization

Run an update manually without rebuilding the website:

```bash
docker compose --profile tools run --rm kege-sync
```

The updater refreshes the task bank, discovers new archive variants, removes
duplicate task numbers inside a variant, and synchronizes every cached variant
with the canonical task database. A lock prevents overlapping runs.

For a daily VPS update, install `deploy/egege-kege-sync.service` and
`deploy/egege-kege-sync.timer` into `/etc/systemd/system/`, then enable the
timer. It runs every day around 04:20 Moscow time and catches up after downtime.
