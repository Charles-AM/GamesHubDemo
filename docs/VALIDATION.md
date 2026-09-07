# Validation status

Validated on Node 24.19.0 on 2026-09-07.

The original Documents checkout was affected by macOS cloud offloading and disk pressure. A temporary local checkout is used to run reproducible checks. No existing Supabase data or unrelated files were changed.

## Passed

- Prisma 7.10 client generation from the checked-in PostgreSQL schema.
- Strict TypeScript checks for the web application, API, and shared packages.
- Production build, including route chunks and the generated service worker.
- Eleven Vitest game-engine and security tests.
- Guest Snake play, result persistence, reload persistence, and activity display in desktop and mobile Chromium.
- Production-only and complete dependency audits: zero known vulnerabilities after patched transitive overrides.

The browser smoke run deliberately omitted the API service. Failed `/api/me` requests exercised the signed-out fallback while the guest flow continued to work.

## Configured for CI

The GitHub workflow starts fresh PostgreSQL 17 and Redis 8 services, applies the migration, and then runs the account flow: register, sign out, sign in, play, inspect history, and sign out. That integration test was not run locally because Docker Desktop is not installed on this machine. The migration was reviewed and Prisma generated its client successfully, but no local database was mutated.

## External configuration

Google OAuth requires the owner's client credentials and consent-screen configuration. Vercel/Railway/AWS deployment credentials have not been provided. Docker's CLI symlink on this machine points to a missing Docker installation. These integrations are not claimed as verified.
