# Sette opp Vercel KV for bakgrunnstracking

## Hvorfor?
For å tracke båtpasseringer 24/7 uavhengig av om noen har nettsiden åpen.

## Steg 1: Opprett Vercel KV Database

1. Gå til [Vercel Dashboard](https://vercel.com/dashboard)
2. Velg ditt `kaheitebaaten` prosjekt
3. Gå til **Storage** → **Create Database**
4. Velg **KV (Redis)**
5. Gi den navnet: `kaheitebaaten-kv`
6. Velg region: **Stockholm (arn1)** (nærmest Norge)
7. Klikk **Create**

## Steg 2: Koble til prosjektet

Vercel vil automatisk:
- Legge til miljøvariabler (`KV_REST_API_URL`, `KV_REST_API_TOKEN`)
- Disse blir tilgjengelige i API-routes

## Steg 3: Installer pakke (allerede gjort)

```bash
npm install @vercel/kv
```

## Steg 4: Deploy

```bash
git add .
git commit -m "Add Vercel KV support"
git push
```

## Gratis tier limits:
- **30,000 kommandoer per dag**
- **256 MB lagring**
- Mer enn nok for dette prosjektet!

## Hva skjer da?

Cron jobben vil kjøre **hvert minutt** (24/7) og:
1. Hente AIS-data fra Barentswatch
2. Sjekke om båter har passert geofencet
3. Lagre passeringer i KV database
4. Frontenden henter data fra databasen

**Ingen data går tapt selv om ingen besøker siden!**
