# Deploy til Vercel

## Steg 1: Push til GitHub

```bash
git add .
git commit -m "Initial commit - AIS Tromsøysundet app"
git push origin main
```

## Steg 2: Deploy på Vercel

1. Gå til **[vercel.com/new](https://vercel.com/new)**
2. Velg "Import Git Repository"
3. Velg ditt `kaheitebaaten` repo
4. Vercel detekterer automatisk Next.js
5. **Klikk "Deploy"**

Ferdig! Appen kjører nå med mock-data.

## Steg 3: Legg til AIS API-nøkkel (valgfritt)

Hvis du har en AIS-leverandør:

1. Gå til **Project Settings** → **Environment Variables**
2. Legg til:
   - **Key:** `AIS_API_KEY`
   - **Value:** [din API-nøkkel]
3. Redeploy (skjer automatisk)

## Ferdig!

Din app kjører nå på: `https://kaheitebaaten.vercel.app`

- ✅ Edge Runtime (rask respons)
- ✅ Stockholm region (arn1)
- ✅ Automatisk polling hvert 30. sekund
- ✅ Mock-data hvis API-nøkkel mangler
