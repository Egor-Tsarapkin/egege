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

Fill in the real domain and the existing Supabase public settings in `.env`.
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

## Authentication after changing the domain

Add the new URL to the allowed redirect URLs in Supabase:

```text
https://YOUR-DOMAIN/auth/callback
```

The Google and Yandex providers continue to use Supabase. Their provider
callback remains the Supabase callback shown in the provider settings.

## Local verification

```bash
npm ci
npm test
npm start
```

The previous Sites/Cloudflare build remains available as `npm run build:sites`.
