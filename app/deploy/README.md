# Adviser workspace deployment

The adviser workspace runs as a separate service behind `app.salarycrossing.com`.
It intentionally has no JavaScript package dependencies and requires Node.js 22.13+
with the built-in SQLite module.

## Host preparation

Create a dedicated unprivileged account and private data directories:

```sh
sudo useradd --system --home /var/lib/salarycrossing-adviser --shell /usr/sbin/nologin salarycrossing
sudo install -d -o salarycrossing -g salarycrossing -m 0700 /var/lib/salarycrossing-adviser
sudo install -d -o salarycrossing -g salarycrossing -m 0700 /var/lib/salarycrossing-adviser/documents
sudo install -d -o salarycrossing -g salarycrossing -m 0700 /var/backups/salarycrossing-adviser
sudo install -d -o www-data -g www-data -m 0755 /var/www/certbot
sudo apt-get install -y clamav poppler-utils
sudo freshclam
```

Create `/etc/salarycrossing-adviser.env` with mode `0600`. Generate the master
key with `openssl rand -base64 32` and use a separate `openssl rand -hex 32`
value for the session secret.

```dotenv
NODE_ENV=production
ADVISER_HOST=127.0.0.1
ADVISER_PORT=8787
ADVISER_ORIGIN=https://app.salarycrossing.com
ADVISER_DB=/var/lib/salarycrossing-adviser/adviser.sqlite
ADVISER_STORAGE=/var/lib/salarycrossing-adviser/documents
ADVISER_BACKUPS=/var/backups/salarycrossing-adviser
ADVISER_BACKUP_RETENTION_DAYS=30
ADVISER_MASTER_KEY=<32-byte-base64-key>
ADVISER_SESSION_SECRET=<independent-random-secret>
ADVISER_DOCUMENT_UPLOADS_ENABLED=0
ADVISER_LLM_API_KEY=<provider-api-key>
ADVISER_LLM_MODEL=deepseek-flash
ADVISER_LLM_URL=https://api.deepseek.com/responses
```

Keep document uploads disabled until ClamAV is current and the privacy/security
review is complete. Before processing client documents with DeepSeek, verify the
model-training opt-out, disclose processing in China, obtain an appropriate lawful
basis and complete the international-transfer review. `OPENAI_API_KEY` remains a
legacy fallback for existing installations. Add the Stripe variables only after
creating the founding-pilot price and webhook endpoint.

## First owner

Pass the first password only in the process environment. It is stored as a salted
scrypt hash and is never written to the service environment file.

```sh
sudo -u salarycrossing env $(sudo cat /etc/salarycrossing-adviser.env | xargs) \
  ADVISER_ADMIN_PASSWORD='<temporary-password>' \
  node /opt/ukcalc/app/cli.mjs setup \
  --organization 'Salary Crossing' --slug salary-crossing \
  --name Owner --email hello@salarycrossing.com
```

## Services and proxy

Install the service and maintenance units, enable them, configure nginx from the
provided sample, and request the TLS certificate only after the DNS record points
to the host. Verify `GET /health` locally and through the public hostname. The
health response deliberately reports whether AI, billing, and uploads are active.

The daily maintenance unit creates an AES-256-GCM encrypted database/document
archive and expires backups older than 30 days. Deleted case document ciphertext
is removed immediately; encrypted backup copies expire within that same window.
