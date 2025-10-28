# Kå heit båten - AIS Tromsøysundet

Sanntids AIS-visning av fartøy i Tromsøysundet. Bygget med Next.js, Leaflet og Vercel Edge Runtime.

## Funksjoner

- 🗺️ Interaktivt kart med Leaflet
- 🚢 Sanntids AIS-data (eller mock-data hvis API-nøkkel mangler)
- ⚡ Edge Runtime for rask respons
- 🔄 Automatisk polling hvert 30. sekund (SWR)
- 🌍 Optimalisert for europeiske regioner (Stockholm)

## Deploy til Vercel

### 1. Push til GitHub

```bash
git add .
git commit -m "Initial commit - AIS app"
git push origin main
```

### 2. Importer til Vercel

1. Gå til [vercel.com](https://vercel.com)
2. Klikk "Add New Project"
3. Importer ditt GitHub-repo
4. Vercel detekterer automatisk Next.js-konfigurasjonen
5. Klikk "Deploy"

### 3. Legg til miljøvariabler (valgfritt)

Hvis du har en AIS API-nøkkel:

1. Gå til Project Settings → Environment Variables
2. Legg til:
   - `AIS_API_KEY`: Din AIS API-nøkkel (f.eks. fra AISHub, MarineTraffic, etc.)

**Merk:** Appen fungerer perfekt uten API-nøkkel ved å bruke mock-data.

## Lokal utvikling

```bash
# Installer avhengigheter
npm install

# Kjør dev-server
npm run dev

# Bygg for produksjon
npm run build

# Start produksjons-server
npm start
```

Åpne [http://localhost:3000](http://localhost:3000) i nettleseren.

## Miljøvariabler

Kopier `.env.example` til `.env.local`:

```bash
cp .env.example .env.local
```

Tilgjengelige variabler:

- `AIS_API_KEY`: (Valgfri) AIS API-nøkkel
- `NEXT_PUBLIC_MAP_CENTER_LAT`: Kartets senter-latitude (standard: 69.65)
- `NEXT_PUBLIC_MAP_CENTER_LNG`: Kartets senter-longitude (standard: 18.96)
- `NEXT_PUBLIC_MAP_ZOOM`: Zoom-nivå (standard: 12)

## Teknologi

- **Next.js 15** med App Router
- **React 18**
- **TypeScript**
- **Leaflet** + react-leaflet for kart
- **SWR** for data polling
- **Vercel Edge Runtime** for API-routes

## Struktur

```
├── app/
│   ├── api/ais/route.ts    # Edge API med mock fallback
│   ├── layout.tsx          # Root layout
│   ├── page.tsx           # Hovedside med SWR
│   └── globals.css        # Global styling
├── components/
│   └── AISMap.tsx         # Leaflet-kart komponent
├── types/
│   └── ais.ts            # TypeScript types
└── vercel.json           # Vercel config
```

## Tilpasse til annen AIS-leverandør

Rediger `app/api/ais/route.ts` og oppdater `fetchLiveAIS()` for å matche din leverandørs API-format.

Eksempel på leverandører:
- AISHub
- MarineTraffic
- VesselFinder
- Norwegian Coastal Administration (Kystverket)

## Lisens

MIT
