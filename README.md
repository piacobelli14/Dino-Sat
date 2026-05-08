# DinoSat

A space situational awareness platform. DinoSat is a single web app for tracking the things that move through near-Earth space and the inner solar system: active satellites, asteroids, comets, launch weather, live spacecraft telemetry, arbitrary n-body systems, and an astronomical reference database. Seven pages, three product categories, one heliocentric worldview, a lot of orbital mechanics happening under the hood.

Hosted at **[DinoSat](https://dinosat.app)**. Account creation, sessions, and team management are handled through Dino Auth (see below).

This is a personal-scale platform built because the existing tools for this stuff are either Cold War era government dashboards, paywalled aerospace software, or toy demos. DinoSat sits somewhere in the middle: real propagators, real ephemerides, real conjunction math, wrapped in a UI that is actually pleasant to look at.

---

## Screenshots

| Asteroid Tracker | Comet Tracker | Satellite Tracker |
|:---:|:---:|:---:|
| ![Asteroid Tracker](Screenshots/AsteroidTracker.png) | ![Comet Tracker](Screenshots/CometTracker.png) | ![Satellite Tracker](Screenshots/SatelliteTracker.png) |

| Earth Conditions | Satellite Feeds | Simulator | Celestial Reference |
|:---:|:---:|:---:|:---:|
| ![Earth Conditions](Screenshots/EarthConditions.png) | ![Satellite Feeds](Screenshots/SatelliteFeeds.png) | ![Simulator](Screenshots/Simulator.png) | ![Celestial Reference](Screenshots/CelestialReference.png) |

---

## The seven pages

DinoSat groups its pages into three categories: **Trackers** (live and catalog views of moving objects), **Monitors** (real-time operational dashboards), and **Simulators** (sandboxed physics playgrounds), plus a standalone **Celestial Reference** for object lookup.

### Trackers

#### Asteroid Tracker
A heliocentric Three.js scene rendering tens of thousands of asteroid orbits sourced from the JPL Small-Body Database. Streaming ingest pushes objects into the scene as they arrive so the page becomes interactive before the full catalog finishes loading. Virtual scroll sidebar handles the catalog list without choking on thousands of rows. Full-text search across designation, name, and orbital class. Click any object to pull a Gemini-generated dossier with structured sections covering discovery context, orbital characteristics, physical properties, and observational history. Bloom post-processing on the sun, frustum culling on everything else, instanced geometry for the orbits.

#### Comet Tracker
Same shape as the asteroid tracker, different physics. Comets need a three-branch orbital propagator that handles elliptical, parabolic, and hyperbolic trajectories cleanly, because plenty of the interesting ones are not coming back. Each branch uses the right solver for its conic section: Newton-Raphson on Kepler's equation for closed orbits, Barker's equation for parabolic, hyperbolic Kepler's equation for unbound. Perihelion and aphelion markers rendered in-scene, tail orientation computed from the sun-comet vector, JPL SBDB queries on the backend with aggressive caching since the upstream is rate-limited.

#### Satellite Tracker
Live tracking for active satellites in LEO, MEO, and GEO. SGP4 propagation runs client-side at 60 Hz against a TLE catalog refreshed server-side. The backend pushes TLE updates and conjunction events over SSE so the client never polls. Per-object trail buffers keep the orbit history visible without redrawing the whole path every frame. Eclipse geometry is computed as cone-cone intersection in the Earth-Sun frame, so umbra and penumbra transitions are visually correct, not approximated. Conjunction detection runs continuously with a coarse spatial hash to prune candidate pairs, then refines survivors with adaptive timestepping around the closest approach. CSV export for any selection. The conjunction engine is the part that took the longest to get right.

### Monitors

#### Earth Conditions
A launch commit dashboard. Five evaluation modules feed a `POST /consolidated-evaluation` endpoint backed by an `AlertManager` class that aggregates and ranks violations against configurable launch criteria. Layered weather maps on top: surface winds, precipitation, cloud cover, lightning, visibility. Built to answer the question "would this launch fly today" for any pad on Earth, which turns out to require a lot of inputs from a lot of upstreams, all of which need to agree before you get a green light. The AlertManager handles the disagreement.

#### Satellite Feeds
Live operational feeds from active spacecraft. ISS telemetry includes position, attitude, environmental data, and crew presence. Public imagery streams are routed through an image proxy on the backend to dodge CORS and to enforce per-feed rate limits. The feed registry itself is served over SSE, so new feeds added server-side appear in the client without a rebuild. The page that gets opened in the background and just left running.

### Simulators

#### Simulator (N-Body)
A real n-body integrator playground. Four integrators ship in the box: RKF45 adaptive step, classical RK4, Yoshida 4th-order symplectic, and Verlet. Optional physics layers stack on top of the base Newtonian gravity: general relativity corrections, J2 oblateness for non-spherical primaries, post-Newtonian terms for strong-field regimes, Plummer softening for close encounters that would otherwise NaN out, Roche limit visualization for tidal disruption, and inelastic collision handling. Drop in any combination of bodies, pick your physics, run it. Useful for sanity-checking intuition about three-body chaos, hierarchical systems, and what happens when you push a moon past Roche.

### Reference

#### Celestial Reference
A search engine tuned for astronomical objects. Queries hit Wikipedia's search API filtered for astronomical relevance (planets, stars, moons, asteroids, comets, galaxies, nebulae, constellations, exoplanets, satellites), then selected results pull a full extract plus structured Wikidata properties through a chained query against `Special:EntityData` and `wbgetentities` for unit and entity label resolution. The properties get organized into six categories on the client: Classification, Physical, Orbital, Observational, Discovery, and Composition. Pure frontend, no backend involvement. Search history is persisted to localStorage. Useful when you need a quick reference on something that is not in any of the other pages' catalogs.

---

## Architecture

DinoSat is a two-repo project: a React frontend (`dinosat/`) and a Node.js/Express backend (`dinosat_webapi/`). The backend serves all page-specific data routes plus the auth integration with Dino Auth. The frontend handles all rendering, propagation, and user interaction.

### Frontend (`dinosat/`)

```
dinosat/
├── public/
│   ├── DinoSatLogo*.png         Brand assets
│   ├── MoonBackground.mp4       Hero/landing video
│   └── placeholder.stl          3D model placeholder
├── src/
│   ├── pages/
│   │   ├── Account/
│   │   │   ├── Account.jsx       Personal account settings
│   │   │   └── Team.jsx          Org/team management
│   │   ├── Authnetication/       (yes, the typo is committed)
│   │   │   ├── AuthLogin.jsx
│   │   │   ├── AuthRegister.jsx
│   │   │   ├── AuthReset.jsx
│   │   │   └── AuthVerifyEmail.jsx
│   │   └── DinoSat/
│   │       ├── DinoSatTrackers/
│   │       │   ├── AsteroidTracker.jsx
│   │       │   ├── CometTracker.jsx
│   │       │   └── SatelliteTracker.jsx
│   │       ├── DinoSatMonitors/
│   │       │   ├── EarthConditions.jsx
│   │       │   └── SatelliteFeeds.jsx
│   │       ├── DinoSatSimulators/
│   │       │   └── Simulator.jsx
│   │       └── CelestialReference.jsx
│   ├── helpers/                  Shared UI utilities (Nav, Alert, etc.)
│   ├── lib/                      Three.js, SGP4, Kepler, n-body
│   ├── configs/                  Runtime config
│   ├── styles/                   Page-scoped CSS
│   ├── App.jsx
│   ├── ErrorBoundary.jsx
│   ├── ProtectedRoute.jsx        Token gate, redirects to Dino Auth
│   ├── TouchDevice.jsx           Mobile-block screen
│   └── UseAuth.jsx               Dino Auth hook
├── satellites.json               Bootstrap satellite catalog
├── vite.config.js
└── vercel.json
```

### Backend (`dinosat_webapi/`)

```
dinosat_webapi/
├── api/
│   ├── config/
│   │   ├── db.js                 PostgreSQL pool
│   │   ├── s3.js                 Object storage client
│   │   └── smtp.js               Transactional mail
│   ├── middleware/               Auth, validation, rate limiting
│   ├── routes/
│   │   └── dinolabs-dinosat/
│   │       ├── dinolabs-dinosat-monitors/
│   │       │   ├── dinolabs-dinosat-earth-conditions.js
│   │       │   └── dinolabs-dinosat-satellite-feeds.js
│   │       └── dinolabs-dinosat-trackers/
│   │           ├── dinolabs-dinosat-asteroid-tracker.js
│   │           ├── dinolabs-dinosat-comet-tracker.js
│   │           └── dinolabs-dinosat-satellite-tracker.js
│   ├── workers/                  Connection manager worker
│   ├── public/                   Catchall and static
│   ├── docs/
│   └── index.js
└── vercel.json
```

The route namespace mirrors the frontend page categories. Every backend route lives under `dinolabs-dinosat/` and splits into `monitors/` and `trackers/`, matching the page groupings. The Simulator and Celestial Reference do not need backend routes: the simulator is pure client-side physics, and the reference page talks directly to Wikipedia and Wikidata from the browser.

### Data sources
- **JPL SBDB.** Asteroid and comet ephemerides. Cached aggressively because the upstream is rate-limited.
- **CelesTrak / Space-Track.** TLEs for the satellite tracker, refreshed on a cron.
- **Open-Meteo + NOAA.** Weather inputs for Earth Conditions.
- **NASA APIs.** ISS telemetry and public imagery feeds.
- **Wikipedia + Wikidata.** Celestial Reference content (frontend-direct).
- **Gemini API.** AI dossier generation, gated server-side.

### Streaming
SSE everywhere it makes sense. The satellite tracker, feed registry, and asteroid catalog ingest all use server-sent events over plain HTTP rather than WebSockets. The data flow is one-way, SSE survives proxies better, and reconnection is built in.

### Three.js
The tracker pages share a heliocentric scene builder, bloom pipeline, and trail buffer implementation. The catalogs and the simulator extend it with their own physics layers; the satellite tracker swaps in a geocentric frame. Frustum culling and instanced meshes do most of the work keeping framerate up with 30,000+ orbits on screen.

---

## Authentication and accounts

Account creation, login, sessions, password resets, email verification, organization management, and role-based access are **all handled through Dino Auth**, a separate private API internal to the broader DinoLabs architecture. Dino Auth is **not part of this repository**, is not open-sourced, and is not available for self-hosting. DinoSat is simply integrated with it: the platform does not implement its own auth, does not store passwords, and does not roll its own session management.

What this means in practice:

- Sign-up, login, reset, and verification flows all proxy through Dino Auth.
- Sessions come back as bearer tokens with embedded user ID and optional org ID.
- Team management (inviting members, role assignment, org-level settings) lives in the `Team.jsx` page on the DinoSat frontend but proxies all writes through Dino Auth.
- Every protected route on the DinoSat backend validates tokens against Dino Auth.
- The `ProtectedRoute.jsx` component on the frontend handles redirects and token refresh transparently.

**Existing DinoLabs accounts work here.** If you already have an account from one of our other open-source DinoLabs platforms, those credentials sign you straight into DinoSat. One account, every product.

If you fork DinoSat and want to run it standalone, you will need to replace the auth middleware on the backend (`api/middleware/`) and `UseAuth.jsx` on the frontend with your own implementation.

---

## Hosted version

The intended way to use DinoSat is the hosted version at **[dinosat.app](https://dinosat.app)**. It runs on infrastructure that is set up to handle the upstream data ingest (TLE refreshes, SBDB caching, weather pulls, Gemini quotas), and accounts are free.

This repository exists primarily as a reference and as the development home of the project. Self-hosting is possible but is not the supported path.

---

## Setup (self-hosting)

If you do want to run it yourself, this is roughly what you're signing up for.

### Requirements
- Node.js 20 or later
- PostgreSQL 15 or later
- A JPL SBDB scraping budget (be polite, cache hard)
- API keys: NASA, Gemini, Space-Track (optional, for higher TLE refresh rates)
- An auth provider replacement for Dino Auth

### Build

Both repos run independently.

**Frontend (`dinosat/`)**
1. `npm install`
2. `cp .env.example .env` and fill in the API base URL and auth provider config
3. `npm run dev` for local development, `npm run build` for production

**Backend (`dinosat_webapi/`)**
1. `npm install`
2. `cp .env.example .env` and fill in database URL, API keys, and auth provider config
3. `npm run db:migrate`
4. `npm run dev` for local, `npm start` for production

### Environment variables
The full lists live in each repo's `.env.example`. The ones you cannot skip on the backend:

- `DATABASE_URL`
- `NASA_API_KEY`
- `GEMINI_API_KEY`
- `AUTH_PROVIDER_URL`
- `AUTH_JWT_PUBLIC_KEY`

---

## Design notes

- **Heliocentric, not geocentric.** Most space visualization tools default to Earth at the center because most users care about Earth orbits. DinoSat defaults to the sun for the tracker pages because asteroids and comets do not orbit Earth. The satellite tracker switches frames.
- **Real propagation, not interpolation.** Asteroid and comet positions are computed from Keplerian elements using a proper solver (Newton-Raphson on the eccentric anomaly for elliptical, Barker's equation for parabolic, hyperbolic Kepler for hyperbolic). Satellites use SGP4. The simulator uses real integrators. No precomputed paths, no spline tricks.
- **The conjunction engine is the spicy part.** Naive pairwise close-approach detection on tens of thousands of satellites is not free. The implementation uses a coarse spatial hash to prune candidate pairs, then refines survivors with adaptive timestepping. Eclipse geometry uses cone-cone intersection in the Earth-Sun frame.
- **Dossier generation is gated server-side.** Gemini calls go through a backend route that enforces per-user rate limits and caches results. The frontend never sees an API key.
- **Celestial Reference is intentionally frontend-only.** It hits Wikipedia and Wikidata directly from the browser because there is no value-add in proxying that traffic through the backend, and CORS is already permissive on those endpoints.

---

## Limitations and known issues

- TLEs go stale. Anything older than a few days will visibly drift from reality. The tracker shows TLE epoch on hover so you can see this.
- The asteroid tracker excludes objects with bad orbital fits (high uncertainty parameter). This is on purpose, but it means some recently discovered NEOs will not appear until JPL updates the fit.
- The simulator is not a research tool. Energy drift in long RK4 runs is real. Use Yoshida or Verlet for anything where you actually care about long-term stability.
- Earth Conditions weather data is only as good as the upstream forecast model. It is not a substitute for an actual range safety officer.
- Celestial Reference is bottlenecked on Wikipedia's API. Bulk lookups will get rate-limited.
- No mobile layout. Three.js scenes with thousands of objects on a phone is a bad time. `TouchDevice.jsx` shows a desktop-only message on touch devices.

---

## License

Apache License 2.0 with a Commons Clause restriction. You can read it, fork it, modify it, and run it for non-commercial purposes. You cannot sell it, sublicense it, or offer it as a hosted commercial service. The intent is to keep the code open as a reference while reserving commercial rights. See `LICENSE` for the full text.
