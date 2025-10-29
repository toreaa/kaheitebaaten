# Redis Cloud Database Setup ✅

## Hvorfor?
For å tracke båtpasseringer 24/7 uavhengig av om noen har nettsiden åpen.

## Setup (Allerede ferdig! ✅)

Prosjektet bruker nå **Redis Cloud** med følgende oppsett:

- **Database**: kaheitebaatenredis
- **Region**: EU West (London)
- **Gratis tier**: 30MB lagring (mer enn nok!)
- **Pakke**: `ioredis` for Node.js tilkobling

## Miljøvariabler (Allerede lagt til)

```
REDIS_URL=redis://default:***@redis-19446.crce204.eu-west-2-3.ec2.redns.redis-cloud.com:19446
```

Lagt til i alle Vercel environments:
- ✅ Production
- ✅ Preview
- ✅ Development

## Hva skjer da?

Cron jobben vil kjøre **hvert minutt** (24/7) og:
1. Hente AIS-data fra Barentswatch
2. Sjekke om båter har passert geofencet
3. Lagre passeringer i KV database
4. Frontenden henter data fra databasen

**Ingen data går tapt selv om ingen besøker siden!**
