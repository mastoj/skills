---
name: dnsimple-vercel-domain
description: Automates creating a DNSimple-managed subdomain and attaching it to a Vercel project. Use when a user wants to add a subdomain in DNSimple for a Vercel app, connect a custom subdomain to a Vercel project, or automate DNSimple + Vercel domain setup.
---

# DNSimple + Vercel Domain Automation

## What this skill does

This skill automates the preferred flow for connecting a DNSimple-managed subdomain to Vercel:

1. add the domain to the Vercel project first
2. inspect Vercel's DNS/verification requirements
3. create or update the required DNS record(s) in DNSimple
4. optionally verify/wait until Vercel accepts the domain

It uses:
- **DNSimple API** for DNS records
- **Vercel API** for project-domain attachment and verification

It does **not** depend on the legacy `dnsimple-cli` package.

## Required environment variables

- `DNSIMPLE_TOKEN`
- `DNSIMPLE_ACCOUNT_ID`
- `VERCEL_TOKEN`

Optional but useful:
- `VERCEL_TEAM_ID` (if you want to override auto-detection)

## Quick start

Run from the repo root after `vercel link --repo`:

```bash
node dnsimple-vercel-domain/scripts/link-domain.mjs \
  --zone example.com \
  --subdomain app \
  --project my-vercel-project \
  --dry-run
```

Then run for real:

```bash
node dnsimple-vercel-domain/scripts/link-domain.mjs \
  --zone example.com \
  --subdomain app \
  --project my-vercel-project \
  --wait
```

## Inputs

Use either:
- `--zone` + `--subdomain`

or:
- `--domain`

Required:
- `--project <vercel-project-name-or-id>`

Optional:
- `--record-target <value>` — manual override if Vercel's API response is too weird to infer automatically
- `--ttl <seconds>` — defaults to `300`
- `--wait` — poll Vercel verification after updating DNS
- `--dry-run` — show the plan without mutating Vercel or DNSimple
- `--json` — emit machine-readable JSON summary

## Examples

### Example 1: normal subdomain flow

```bash
node dnsimple-vercel-domain/scripts/link-domain.mjs \
  --zone tomasjansson.dev \
  --subdomain vimangler \
  --project vimangler-web \
  --wait
```

### Example 2: full domain input

```bash
node dnsimple-vercel-domain/scripts/link-domain.mjs \
  --domain app.example.com \
  --project my-project \
  --wait
```

### Example 3: manual record-target override

```bash
node dnsimple-vercel-domain/scripts/link-domain.mjs \
  --zone example.com \
  --subdomain app \
  --project my-project \
  --record-target cname.vercel-dns.com \
  --wait
```

## Notes and caveats

- This skill is designed primarily for **subdomains**, not full apex-domain migrations.
- It prefers linked Vercel repo metadata from `.vercel/repo.json` or `.vercel/project.json` when present.
- If Vercel returns an unexpected config shape, use `--record-target` and rerun.
- DNS propagation is not instant; `--wait` helps, but real-world DNS latency still exists.
- If the project belongs to a team, repo linkage or `VERCEL_TEAM_ID` should make that explicit.
