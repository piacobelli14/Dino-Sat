const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const os = require("os");
const router = express.Router();

const SOURCES = {
  userAgent: process.env.FLIGHTS_USER_AGENT || process.env.WEATHER_API_USER_AGENT || "DinoSat-Flight-Tracker/1.0",
  opensky: {
    name: "OpenSky Network",
    enabled: process.env.FLIGHTS_OPENSKY_ENABLED === "true",
    disabledNote: "OpenSky blocks requests from cloud hosting networks, so this source stays off unless FLIGHTS_OPENSKY_ENABLED is set to true.",
    blockedNote: "OpenSky drops requests from cloud hosting networks, so a timeout from this server usually means it is blocked. Remove FLIGHTS_OPENSKY_ENABLED to turn this source off.",
    states: "https://opensky-network.org/api/states/all?extended=1",
    token: "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token",
    clientIdEnv: "OPENSKY_CLIENT_ID",
    clientSecretEnv: "OPENSKY_CLIENT_SECRET",
    globalCreditCost: 4,
    reserveCredits: 40,
    minIntervalSeconds: { registered: 90, anonymous: 900 },
    timeoutMs: 45000,
    home: "https://opensky-network.org",
    attribution: "The OpenSky Network",
    terms: "Non-commercial use with attribution. Anonymous access allows 400 credits per day and a registered account allows 4,000."
  },
  adsbfi: {
    name: "adsb.fi",
    point: "https://opendata.adsb.fi/api/v3/lat/{lat}/lon/{lon}/dist/{dist}",
    hex: "https://opendata.adsb.fi/api/v2/hex/{hex}",
    minIntervalMs: 1000,
    concurrency: 2,
    timeoutMs: 20000,
    home: "https://adsb.fi",
    attribution: "adsb.fi",
    terms: "Personal, non-commercial use only with a citation and link to adsb.fi. Public endpoints allow one request per second."
  },
  adsblol: {
    name: "adsb.lol",
    point: "https://api.adsb.lol/v2/lat/{lat}/lon/{lon}/dist/{dist}",
    hex: "https://api.adsb.lol/v2/hex/{hex}",
    lookups: {
      callsign: "https://api.adsb.lol/v2/callsign/{value}",
      registration: "https://api.adsb.lol/v2/reg/{value}",
      type: "https://api.adsb.lol/v2/type/{value}"
    },
    globals: [
      { key: "military", url: "https://api.adsb.lol/v2/mil", intervalSeconds: 180 },
      { key: "squawk7700", url: "https://api.adsb.lol/v2/sqk/7700", intervalSeconds: 180 },
      { key: "squawk7600", url: "https://api.adsb.lol/v2/sqk/7600", intervalSeconds: 300 },
      { key: "squawk7500", url: "https://api.adsb.lol/v2/sqk/7500", intervalSeconds: 300 }
    ],
    sweep: true,
    minIntervalMs: 4000,
    concurrency: 1,
    rateLimitCooldownSeconds: 180,
    timeoutMs: 20000,
    home: "https://adsb.lol",
    attribution: "adsb.lol (ODbL 1.0)",
    terms: "Open data under the ODbL 1.0 license. Rate limits are dynamic and tighter for servers that do not feed data, so this server sweeps adsb.lol at a slower pace, backs off on every rate limit response, and also uses it for worldwide military and emergency pulls and searches."
  },
  airplaneslive: {
    name: "airplanes.live",
    point: "https://api.airplanes.live/v2/point/{lat}/{lon}/{dist}",
    hex: "https://api.airplanes.live/v2/hex/{hex}",
    minIntervalMs: 1000,
    concurrency: 2,
    timeoutMs: 20000,
    home: "https://airplanes.live",
    attribution: "airplanes.live",
    terms: "Personal, non-commercial or internal business use with no uptime guarantee. The public API allows one request per second and point queries up to 250 nautical miles."
  },
  airlines: {
    name: "Virtual Radar Server Standing Data",
    csv: "https://raw.githubusercontent.com/vradarserver/standing-data/main/airlines/schema-01/airlines.csv",
    refreshHours: 24,
    timeoutMs: 60000,
    home: "https://github.com/vradarserver/standing-data",
    attribution: "Virtual Radar Server Standing Data (CC0)"
  },
  routes: {
    name: "Virtual Radar Server Standing Data",
    routeFile: "https://raw.githubusercontent.com/vradarserver/standing-data/main/routes/schema-01/{letter}/{airline}-all.csv",
    airportFile: "https://raw.githubusercontent.com/vradarserver/standing-data/main/airports/schema-01/{letter}/{prefix}.csv",
    callsignPattern: "^[A-Z]{3}[0-9]{1,4}[A-Z]{0,2}$",
    fileRefreshHours: 24,
    fileRetryMinutes: 10,
    timeoutMs: 30000,
    minIntervalMs: 250,
    resolveEveryMs: 2000,
    knownTtlHours: 6,
    unknownTtlHours: 1,
    maxCache: 20000,
    maxRouteFiles: 40,
    maxAirportFiles: 150,
    maxPendingFiles: 4,
    attribution: "Virtual Radar Server Standing Data (CC0)"
  },
  ourairports: {
    name: "OurAirports",
    csv: "https://davidmegginson.github.io/ourairports-data/airports.csv",
    refreshHours: 24,
    timeoutMs: 60000,
    home: "https://ourairports.com",
    attribution: "OurAirports (Public Domain)"
  },
  sweep: {
    radiusNm: 250,
    tickMs: 500,
    alwaysOn: true,
    activeMinutes: 10,
    quietRevisitMinutes: 20,
    quietThreshold: 3,
    tileRefreshSeconds: 20,
    focusTtlSeconds: 30,
    focusMinZoom: 5,
    focusMaxTiles: 12,
    focusRefreshSeconds: 8,
    regions: [
      { name: "North America", minLat: 18, maxLat: 56, minLon: -128, maxLon: -62 },
      { name: "Europe", minLat: 35, maxLat: 62, minLon: -12, maxLon: 35 },
      { name: "East Asia", minLat: 18, maxLat: 50, minLon: 100, maxLon: 150 },
      { name: "South Asia", minLat: 5, maxLat: 40, minLon: 68, maxLon: 100 },
      { name: "Southeast Asia", minLat: -10, maxLat: 20, minLon: 95, maxLon: 125 },
      { name: "Middle East", minLat: 12, maxLat: 40, minLon: 35, maxLon: 68 },
      { name: "Caribbean And Central America", minLat: 6, maxLat: 18, minLon: -100, maxLon: -58 },
      { name: "South America", minLat: -56, maxLat: 12, minLon: -82, maxLon: -34 },
      { name: "Oceania", minLat: -48, maxLat: -10, minLon: 110, maxLon: 180 },
      { name: "North Atlantic", minLat: 40, maxLat: 64, minLon: -62, maxLon: -12 },
      { name: "Russia And Central Asia", minLat: 40, maxLat: 70, minLon: 35, maxLon: 180 },
      { name: "Africa", minLat: -35, maxLat: 37, minLon: -18, maxLon: 52 },
      { name: "Scandinavia And Iceland", minLat: 62, maxLat: 71, minLon: -25, maxLon: 32 },
      { name: "Northern Canada And Alaska", minLat: 56, maxLat: 72, minLon: -170, maxLon: -55 },
      { name: "Hawaii", minLat: 15, maxLat: 25, minLon: -162, maxLon: -150 },
      { name: "Indian Ocean", minLat: -30, maxLat: 5, minLon: 40, maxLon: 110 }
    ]
  },
  emergencies: {
    watchSeconds: 60,
    keepHours: 24,
    maxEnded: 500
  },
  retention: {
    staleSeconds: 600,
    groundSpeedKt: 40,
    groundAltitudeFt: 500,
    unsweptStaleSeconds: 1500,
    pruneIntervalMs: 5000,
    statePath: process.env.FLIGHTS_STATE_PATH || path.join(os.tmpdir(), "dinosat-flights-state.json"),
    stateSaveSeconds: 15,
    tombstoneMinutes: 15,
    trailPoints: 60,
    trailMinMoveDeg: 0.01,
    trailMinSeconds: 15,
    maxTrailResponse: 1500,
    detailCacheSeconds: 20
  },
  analysis: {
    name: "Gemini",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.FLIGHTS_ANALYSIS_MODEL || "gemini-3.5-flash-lite",
    thinkingLevel: process.env.FLIGHTS_ANALYSIS_THINKING || "low",
    temperature: 0.3,
    maxOutputTokens: 1200,
    timeoutMs: 20000,
    warmConcurrency: 3,
    cacheLimit: 300,
    instructions: "You are a senior air traffic control and aviation safety analyst briefing a member of the public about one aircraft that is squawking an emergency transponder code. Use only the flight data provided and never invent facts, places, numbers, causes, or times. Write in plain, calm, direct language. The summary must be 2 to 4 complete sentences that say which aircraft it is, what the squawk code means, where it is, and what it is doing now based on its altitude, speed, vertical rate, and route. List the specific risks that the code and the flight state suggest, and say clearly when something cannot be known from the data. List concrete things an observer or a person on the ground can do, such as monitoring ATC audio or avoiding the destination airport area, in priority order. The timing field must be one complete sentence about when the squawk started and how long it has lasted. The confidence field must be one complete sentence explaining how reliable the information is based on the sources and how recent the position is. Every list item must be a complete sentence that ends with a period."
  }
};

const KNOTS_PER_MPS = 1.943844;
const FEET_PER_METER = 3.28084;
const FPM_PER_MPS = 196.8504;
const SOURCE_BITS = { opensky: 1, adsbfi: 2, adsblol: 4, airplaneslive: 8 };
const EMERGENCY_SQUAWKS = { "7500": "Unlawful Interference", "7600": "Radio Failure", "7700": "General Emergency" };
const OPENSKY_CATEGORIES = { 2: "A1", 3: "A2", 4: "A3", 5: "A4", 6: "A5", 7: "A6", 8: "A7", 9: "B1", 10: "B2", 11: "B3", 12: "B4", 14: "B6", 15: "B7", 16: "C1", 17: "C2", 18: "C3" };
const SNAPSHOT_FIELDS = ["hex", "flight", "lat", "lon", "alt", "gs", "trk", "vr", "sq", "cat", "type", "reg", "ground", "mil", "posAt", "src", "al", "orig", "dest"];

const EPOCH = crypto.randomBytes(6).toString("hex");
const aircraft = new Map();
const trails = new Map();
const tombstones = new Map();
const detailCache = new Map();
let version = 0;
let activeUntil = 0;
let loopTimer = null;
let statsCache = { at: 0, value: null };
let airportsCache = { at: 0, rows: [], loading: null, error: null };
let airlinesCache = { at: 0, map: new Map(), loading: null, error: null };
const routeCache = new Map();
const typeDescriptions = new Map();
const globalPulls = new Map();
const routeStatus = { requests: 0, resolved: 0, lastSuccessAt: null, lastError: null };
const routeFiles = new Map();
const squawkEvents = new Map();
const endedSquawks = [];
const airportFiles = new Map();
let lastResolveAt = 0;

const sourceStatus = {
  opensky: { key: "opensky", name: SOURCES.opensky.name, requests: 0, lastSuccessAt: null, lastError: null, lastCount: 0, cooldownUntil: 0, credits: null, authenticated: false, nextPullAt: 0 },
  adsbfi: { key: "adsbfi", name: SOURCES.adsbfi.name, requests: 0, lastSuccessAt: null, lastError: null, lastCount: 0, cooldownUntil: 0, errorStreak: 0 },
  adsblol: { key: "adsblol", name: SOURCES.adsblol.name, requests: 0, lastSuccessAt: null, lastError: null, lastCount: 0, cooldownUntil: 0, errorStreak: 0 },
  airplaneslive: { key: "airplaneslive", name: SOURCES.airplaneslive.name, requests: 0, lastSuccessAt: null, lastError: null, lastCount: 0, cooldownUntil: 0, errorStreak: 0 }
};

const fill = (template, values) => template.replace(/\{(\w+)\}/g, (match, key) => (values[key] === undefined ? match : String(values[key])));

const toNumber = (value) => {
  const number = Number(value);
  return value === null || value === undefined || value === "" || !Number.isFinite(number) ? null : number;
};

const round = (value, digits) => (value === null ? null : Math.round(value * 10 ** digits) / 10 ** digits);

const HTTP_EXPLANATIONS = {
  400: "The source rejected the request as malformed (HTTP 400).",
  401: "The source rejected the credentials (HTTP 401).",
  403: "The source refused access from this server (HTTP 403).",
  404: "The source did not recognize the requested address (HTTP 404).",
  429: "The source is rate limiting this server (HTTP 429).",
  500: "The source had an internal error (HTTP 500).",
  502: "The source's gateway failed (HTTP 502).",
  503: "The source is temporarily unavailable (HTTP 503).",
  504: "The source's gateway timed out (HTTP 504)."
};

const errorMessage = (error) => {
  const status = error && error.response ? error.response.status : null;
  if (status) return HTTP_EXPLANATIONS[status] || `The source answered with HTTP ${status}.`;
  const code = error && error.code ? String(error.code) : "";
  const message = String(error && error.message ? error.message : error);
  if (code === "ECONNABORTED" || code === "ETIMEDOUT" || /timeout/i.test(message)) {
    const match = /(\d+)ms/.exec(message);
    return `The source did not answer within ${match ? Math.round(Number(match[1]) / 1000) : "the allowed"} seconds.`;
  }
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") return "The source's address could not be resolved.";
  if (code === "ECONNREFUSED" || code === "ECONNRESET") return "The source closed the connection.";
  return `The request failed because ${message.replace(/\.$/, "").replace(/^\w/, (c) => c.toLowerCase())}.`;
};

const buildSweepTiles = () => {
  const radiusDeg = SOURCES.sweep.radiusNm / 60;
  const rowStep = radiusDeg * 1.5;
  const tiles = [];
  for (const region of SOURCES.sweep.regions) {
    let row = 0;
    for (let lat = region.minLat + radiusDeg * 0.5; lat <= region.maxLat; lat += rowStep) {
      const colStep = (Math.sqrt(3) * radiusDeg) / Math.max(0.2, Math.cos((lat * Math.PI) / 180));
      const offset = row % 2 ? colStep / 2 : 0;
      for (let lon = region.minLon + offset; lon <= region.maxLon; lon += colStep) {
        tiles.push({ lat: round(lat, 3), lon: round(((lon + 540) % 360) - 180, 3), region: region.name });
      }
      row += 1;
    }
  }
  return tiles;
};

const SWEEP_TILES = buildSweepTiles();
const SWEEP_KEYS = ["adsbfi", "airplaneslive", "adsblol"];
const sweepCursor = { shared: 0 };
let sweepOrder = [];
let sweepOrderAt = 0;
let sweepWrapped = false;
const tileClaims = new Map();
const focus = { tiles: [], expiresAt: 0, served: new Map() };
const tileStats = new Map();

const createHostQueue = (minIntervalMs, concurrency = 1) => {
  const pending = [];
  let inflight = 0;
  let lastStart = 0;
  let waiting = false;
  const pump = async () => {
    if (waiting || inflight >= concurrency || !pending.length) return;
    waiting = true;
    const wait = Math.max(0, lastStart + minIntervalMs - Date.now());
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    waiting = false;
    if (inflight >= concurrency || !pending.length) return;
    pending.sort((a, b) => a.priority - b.priority);
    const task = pending.shift();
    lastStart = Date.now();
    inflight += 1;
    pump();
    try {
      task.resolve(await task.run());
    } catch (error) {
      task.reject(error);
    } finally {
      inflight -= 1;
      pump();
    }
  };
  return {
    schedule: (run, priority = 5) => new Promise((resolve, reject) => {
      pending.push({ run, priority, resolve, reject });
      pump();
    }),
    idle: () => inflight < concurrency && pending.length === 0,
    size: () => pending.length + inflight
  };
};

const hostQueues = {
  adsbfi: createHostQueue(SOURCES.adsbfi.minIntervalMs, SOURCES.adsbfi.concurrency),
  adsblol: createHostQueue(SOURCES.adsblol.minIntervalMs, SOURCES.adsblol.concurrency),
  airplaneslive: createHostQueue(SOURCES.airplaneslive.minIntervalMs, SOURCES.airplaneslive.concurrency),
  routes: createHostQueue(SOURCES.routes.minIntervalMs)
};

const httpGet = (url, timeout, headers = {}) => axios.get(url, {
  timeout,
  headers: { "User-Agent": SOURCES.userAgent, Accept: "application/json", ...headers },
  validateStatus: (status) => status >= 200 && status < 300
});

const categoryGroup = (entry) => {
  if (entry.mil) return "military";
  const cat = entry.cat || "";
  if (["A3", "A4", "A5"].includes(cat)) return "airliner";
  if (cat === "A2") return "small";
  if (["A1", "B1", "B4"].includes(cat)) return "light";
  if (cat === "A6") return "highPerformance";
  if (cat === "A7") return "rotorcraft";
  if (["C1", "C2", "C3"].includes(cat)) return "surface";
  if (cat) return "other";
  return "unknown";
};

const altitudeBand = (entry) => {
  if (entry.ground) return "ground";
  if (entry.alt === null) return "unknown";
  if (entry.alt < 10000) return "low";
  if (entry.alt < 30000) return "mid";
  return "high";
};

const regionOf = (lat, lon) => {
  const match = SOURCES.sweep.regions.find((region) => lat >= region.minLat && lat <= region.maxLat && lon >= region.minLon && lon <= region.maxLon);
  return match ? match.name : "Oceanic And Remote";
};

const operatorOf = (flight) => {
  const match = /^([A-Z]{3})\d/.exec(flight || "");
  return match ? match[1] : null;
};

const emergencyOf = (entry) => {
  if (entry.sq && EMERGENCY_SQUAWKS[entry.sq]) return EMERGENCY_SQUAWKS[entry.sq];
  if (entry.emergency && entry.emergency !== "none") return entry.emergency.replace(/(^|_)(\w)/g, (m, sep, c) => `${sep ? " " : ""}${c.toUpperCase()}`);
  return null;
};

const recordTrail = (hex, entry) => {
  if (entry.lat === null || entry.lon === null || !entry.posAt) return;
  const list = trails.get(hex) || [];
  const last = list[list.length - 1];
  const moved = !last || Math.abs(last[0] - entry.lon) + Math.abs(last[1] - entry.lat) >= SOURCES.retention.trailMinMoveDeg;
  const aged = !last || entry.posAt - last[3] >= SOURCES.retention.trailMinSeconds;
  if (last && entry.posAt <= last[3]) return;
  if (!moved && !aged) return;
  list.push([round(entry.lon, 4), round(entry.lat, 4), entry.alt, entry.posAt]);
  if (list.length > SOURCES.retention.trailPoints) list.splice(0, list.length - SOURCES.retention.trailPoints);
  trails.set(hex, list);
};

const ROUTE_PATTERN = new RegExp(SOURCES.routes.callsignPattern);

const airlineCodeOf = (flight) => {
  const match = /^([A-Z]{3})\d/.exec(flight || "");
  return match ? match[1] : null;
};

const freshRoute = (callsign) => {
  const cached = routeCache.get(callsign);
  if (!cached) return null;
  const ttl = (cached.known ? SOURCES.routes.knownTtlHours : SOURCES.routes.unknownTtlHours) * 3600000;
  return Date.now() - cached.at < ttl ? cached : null;
};

const squawkCode = (entry) => (EMERGENCY_SQUAWKS[entry.sq] ? entry.sq : entry.emergency && entry.emergency !== "none" ? entry.emergency : null);

const closeSquawk = (event, endedAt, outcome, nextSquawk) => {
  squawkEvents.delete(event.hex);
  const { checkedAt, ...record } = event;
  endedSquawks.unshift({ ...record, endedAt, durationSeconds: Math.max(0, endedAt - event.startedAt), outcome, nextSquawk: nextSquawk || null });
  const cutoff = Math.floor(Date.now() / 1000) - SOURCES.emergencies.keepHours * 3600;
  while (endedSquawks.length && (endedSquawks.length > SOURCES.emergencies.maxEnded || endedSquawks[endedSquawks.length - 1].endedAt < cutoff)) endedSquawks.pop();
};

const trackSquawk = (entry) => {
  const reason = emergencyOf(entry);
  const code = reason ? squawkCode(entry) : null;
  const active = squawkEvents.get(entry.hex);
  if (active && active.squawk !== code) closeSquawk(active, entry.posAt, reason ? "changed" : "cleared", entry.sq || null);
  if (!reason) return;
  const current = squawkEvents.get(entry.hex);
  const position = { lastSeenAt: entry.posAt, lastLat: round(entry.lat, 3), lastLon: round(entry.lon, 3), lastAlt: entry.ground ? 0 : entry.alt, lastGround: Boolean(entry.ground), flight: entry.flight || null, reg: entry.reg || null, type: entry.type || null };
  if (current) Object.assign(current, position);
  else squawkEvents.set(entry.hex, { hex: entry.hex, squawk: code, reason, startedAt: entry.posAt, startLat: round(entry.lat, 3), startLon: round(entry.lon, 3), startAlt: entry.ground ? 0 : entry.alt, checkedAt: Date.now(), ...position });
};

const watchSquawks = () => {
  const now = Date.now();
  for (const event of squawkEvents.values()) {
    if (now - event.checkedAt < SOURCES.emergencies.watchSeconds * 1000) continue;
    const entry = aircraft.get(event.hex);
    event.checkedAt = now;
    if (entry && now / 1000 - entry.posAt < SOURCES.emergencies.watchSeconds) continue;
    if (sourceStatus.adsbfi.cooldownUntil > now) continue;
    hostQueues.adsbfi.schedule(async () => {
      sourceStatus.adsbfi.requests += 1;
      const { data } = await httpGet(fill(SOURCES.adsbfi.hex, { hex: event.hex }), SOURCES.adsbfi.timeoutMs);
      mergeReports(parseReadsb(data), "adsbfi");
    }, 2).catch((error) => noteFailure("adsbfi", error, cooldownFor("adsbfi", error)));
  }
};

const squawkPayload = () => {
  const now = Math.floor(Date.now() / 1000);
  return {
    active: Array.from(squawkEvents.values()).map(({ checkedAt, ...event }) => ({ ...event, durationSeconds: Math.max(0, now - event.startedAt) })),
    ended: endedSquawks.slice(0, 100)
  };
};

const legDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = Math.PI / 180;
  const a = Math.sin(((lat2 - lat1) * toRad) / 2) ** 2 + Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(((lon2 - lon1) * toRad) / 2) ** 2;
  return 2 * Math.asin(Math.min(1, Math.sqrt(a)));
};

const bearingTo = (lat1, lon1, lat2, lon2) => {
  const toRad = Math.PI / 180;
  const y = Math.sin((lon2 - lon1) * toRad) * Math.cos(lat2 * toRad);
  const x = Math.cos(lat1 * toRad) * Math.sin(lat2 * toRad) - Math.sin(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.cos((lon2 - lon1) * toRad);
  return ((Math.atan2(y, x) / toRad) + 360) % 360;
};

const currentLeg = (airports, entry) => {
  if (airports.length <= 2 || entry.lat === null || entry.lon === null) return [airports[0], airports[airports.length - 1]];
  let best = null;
  for (let i = 0; i < airports.length - 1; i += 1) {
    const a = airports[i];
    const b = airports[i + 1];
    if (a.lat === null || b.lat === null) continue;
    const detour = legDistance(a.lat, a.lon, entry.lat, entry.lon) + legDistance(entry.lat, entry.lon, b.lat, b.lon) - legDistance(a.lat, a.lon, b.lat, b.lon);
    const heading = entry.trk === null || entry.trk === undefined || entry.ground ? 0 : Math.abs(((bearingTo(entry.lat, entry.lon, b.lat, b.lon) - entry.trk + 540) % 360) - 180) > 90 ? Math.PI : 0;
    const score = detour + heading;
    if (!best || score < best.score) best = { score, pair: [a, b] };
  }
  return best ? best.pair : [airports[0], airports[airports.length - 1]];
};

const applyRoute = (entry) => {
  const route = entry.flight ? freshRoute(entry.flight) : null;
  const airline = (route && route.airline) || airlineCodeOf(entry.flight);
  const usable = route && route.known && route.airports.length >= 2;
  const leg = usable ? currentLeg(route.airports, entry) : null;
  const orig = leg ? leg[0].icao : null;
  const dest = leg ? leg[1].icao : null;
  const changed = entry.al !== airline || entry.orig !== orig || entry.dest !== dest;
  entry.al = airline;
  entry.orig = orig;
  entry.dest = dest;
  return changed;
};

const mergeReports = (reports, sourceKey) => {
  version += 1;
  let changed = 0;
  for (const report of reports) {
    if (!report || !report.hex || report.lat === null || report.lon === null || !report.posAt) continue;
    const hex = report.hex;
    const current = aircraft.get(hex);
    const newer = !current || report.posAt >= current.posAt;
    const next = current ? { ...current } : { hex, src: 0 };
    if (newer) {
      for (const key of ["lat", "lon", "alt", "altGeom", "gs", "trk", "vr", "ground", "posAt"]) next[key] = report[key];
      if (report.sq !== undefined && report.sq !== null) next.sq = report.sq;
      if (report.emergency !== undefined) next.emergency = report.emergency;
    }
    for (const key of ["flight", "reg", "type", "desc", "operator", "cat", "country"]) {
      if (report[key] && (newer || !next[key])) next[key] = report[key];
    }
    if (report.mil) next.mil = true;
    if (report.type && report.desc && !typeDescriptions.has(report.type)) typeDescriptions.set(report.type, report.desc);
    applyRoute(next);
    if (newer) trackSquawk(next);
    next.src |= SOURCE_BITS[sourceKey];
    next.seenAt = Date.now();
    next.v = version;
    aircraft.set(hex, next);
    tombstones.delete(hex);
    if (newer) recordTrail(hex, next);
    changed += 1;
  }
  statsCache.at = 0;
  return changed;
};

const tileSweptAt = (lat, lon) => {
  const radiusDeg = SOURCES.sweep.radiusNm / 60;
  let latest = 0;
  for (let index = 0; index < SWEEP_TILES.length; index += 1) {
    const tile = SWEEP_TILES[index];
    if (Math.abs(tile.lat - lat) > radiusDeg) continue;
    const dLon = Math.abs(((tile.lon - lon + 540) % 360) - 180) * Math.cos((lat * Math.PI) / 180);
    if (Math.hypot(tile.lat - lat, dLon) > radiusDeg) continue;
    for (const sourceKey of SWEEP_KEYS) {
      const stats = tileStats.get(`${sourceKey}:${index}`);
      if (stats && stats.at > latest) latest = stats.at;
    }
  }
  return latest;
};

let lastPruneAt = 0;

const pruneStale = () => {
  if (Date.now() - lastPruneAt < SOURCES.retention.pruneIntervalMs) return;
  lastPruneAt = Date.now();
  const nowSeconds = Math.floor(Date.now() / 1000);
  const cutoff = nowSeconds - SOURCES.retention.staleSeconds;
  const hardCutoff = nowSeconds - SOURCES.retention.unsweptStaleSeconds;
  let removed = 0;
  for (const [hex, entry] of aircraft.entries()) {
    if (entry.posAt < cutoff && (entry.posAt < hardCutoff || tileSweptAt(entry.lat, entry.lon) / 1000 > entry.posAt + SOURCES.sweep.tileRefreshSeconds)) {
      if (squawkEvents.has(hex)) closeSquawk(squawkEvents.get(hex), squawkEvents.get(hex).lastSeenAt, "lost", null);
      aircraft.delete(hex);
      trails.delete(hex);
      tombstones.set(hex, { v: version + 1, at: Date.now() });
      removed += 1;
    }
  }
  if (removed) version += 1;
  const tombCutoff = Date.now() - SOURCES.retention.tombstoneMinutes * 60000;
  for (const [hex, stone] of tombstones.entries()) if (stone.at < tombCutoff) tombstones.delete(hex);
  for (const [hex, cached] of detailCache.entries()) if (Date.now() - cached.at > SOURCES.retention.detailCacheSeconds * 1000 * 3) detailCache.delete(hex);
  if (removed) statsCache.at = 0;
};

const oldestTombstoneVersion = () => {
  let oldest = null;
  for (const stone of tombstones.values()) if (oldest === null || stone.v < oldest) oldest = stone.v;
  return oldest;
};

const parseReadsb = (payload) => {
  const nowMs = toNumber(payload && payload.now) || Date.now();
  const list = Array.isArray(payload && payload.ac) ? payload.ac : Array.isArray(payload && payload.aircraft) ? payload.aircraft : [];
  const reports = [];
  for (const ac of list) {
    const lat = toNumber(ac.lat);
    const lon = toNumber(ac.lon);
    if (lat === null || lon === null || !ac.hex) continue;
    const baro = toNumber(ac.alt_baro);
    const speed = toNumber(ac.gs);
    const surfaceCategory = typeof ac.category === "string" && /^C[1-3]$/.test(ac.category);
    const ground = ac.alt_baro === "ground" || surfaceCategory || (speed !== null && speed < SOURCES.retention.groundSpeedKt && (baro === null || baro <= SOURCES.retention.groundAltitudeFt));
    const seenPos = toNumber(ac.seen_pos);
    reports.push({
      hex: String(ac.hex).toLowerCase().replace(/^~/, ""),
      flight: ac.flight ? String(ac.flight).trim() || null : null,
      reg: ac.r || null,
      type: ac.t || null,
      desc: ac.desc || null,
      operator: ac.ownOp || null,
      cat: ac.category || null,
      lat,
      lon,
      alt: ground ? 0 : toNumber(ac.alt_baro),
      altGeom: toNumber(ac.alt_geom),
      gs: toNumber(ac.gs),
      trk: toNumber(ac.track !== undefined ? ac.track : ac.true_heading),
      vr: toNumber(ac.baro_rate !== undefined ? ac.baro_rate : ac.geom_rate),
      sq: ac.squawk || null,
      emergency: ac.emergency || null,
      ground,
      mil: Boolean(toNumber(ac.dbFlags) & 1),
      posAt: Math.floor((nowMs - (seenPos === null ? 0 : seenPos * 1000)) / 1000)
    });
  }
  return reports;
};

const parseOpenSky = (payload) => {
  const states = Array.isArray(payload && payload.states) ? payload.states : [];
  const reports = [];
  for (const s of states) {
    const lon = toNumber(s[5]);
    const lat = toNumber(s[6]);
    if (lat === null || lon === null || !s[0]) continue;
    const baro = toNumber(s[7]);
    const velocity = toNumber(s[9]);
    const vertical = toNumber(s[11]);
    const geo = toNumber(s[13]);
    reports.push({
      hex: String(s[0]).toLowerCase(),
      flight: s[1] ? String(s[1]).trim() || null : null,
      country: s[2] || null,
      lat,
      lon,
      alt: s[8] ? 0 : baro === null ? null : Math.round(baro * FEET_PER_METER),
      altGeom: geo === null ? null : Math.round(geo * FEET_PER_METER),
      gs: velocity === null ? null : round(velocity * KNOTS_PER_MPS, 1),
      trk: toNumber(s[10]),
      vr: vertical === null ? null : Math.round(vertical * FPM_PER_MPS),
      sq: s[14] || null,
      ground: Boolean(s[8]),
      cat: OPENSKY_CATEGORIES[toNumber(s[17])] || null,
      posAt: toNumber(s[3]) || toNumber(s[4])
    });
  }
  return reports;
};

const noteFailure = (key, error, cooldownMs) => {
  const status = sourceStatus[key];
  const previous = status.lastError;
  status.lastError = errorMessage(error);
  status.errorStreak = (status.errorStreak || 0) + 1;
  status.cooldownUntil = Date.now() + cooldownMs;
  if (previous !== status.lastError) console.log(`[flights] ${status.name} failed and is paused for ${Math.round(cooldownMs / 1000)} seconds. ${status.lastError}`);
};

const noteSuccess = (key, count) => {
  const status = sourceStatus[key];
  if (status.lastError) console.log(`[flights] ${status.name} recovered and returned ${count} aircraft.`);
  status.lastSuccessAt = new Date().toISOString();
  status.lastError = null;
  status.lastCount = count;
  status.errorStreak = 0;
};

const cooldownFor = (key, error) => {
  const code = error && error.response ? error.response.status : 0;
  if (code === 403 || code === 401) return 60 * 60000;
  if (code === 429) {
    const retryAfter = toNumber(error.response.headers && error.response.headers["retry-after"]);
    const base = (retryAfter || SOURCES[key].rateLimitCooldownSeconds || 60) * 1000;
    return Math.min(30 * 60000, base * 2 ** Math.min(3, sourceStatus[key].errorStreak || 0));
  }
  const streak = (sourceStatus[key].errorStreak || 0) + 1;
  return Math.min(10 * 60000, 15000 * 2 ** Math.min(6, streak - 1));
};

const fetchPoint = (key, lat, lon, priority, tileIndex = null) => hostQueues[key].schedule(async () => {
  const status = sourceStatus[key];
  if (status.cooldownUntil > Date.now()) return 0;
  status.requests += 1;
  try {
    const url = fill(SOURCES[key].point, { lat: lat.toFixed(4), lon: lon.toFixed(4), dist: SOURCES.sweep.radiusNm });
    const { data } = await httpGet(url, SOURCES[key].timeoutMs);
    const reports = parseReadsb(data);
    mergeReports(reports, key);
    noteSuccess(key, reports.length);
    if (tileIndex !== null) tileStats.set(`${key}:${tileIndex}`, { count: reports.length, at: Date.now() });
    return reports.length;
  } catch (error) {
    noteFailure(key, error, cooldownFor(key, error));
    return 0;
  }
}, priority);

const openskyToken = { value: null, expiresAt: 0, failedAt: 0 };

const openskyAuthHeader = async () => {
  const clientId = process.env[SOURCES.opensky.clientIdEnv];
  const clientSecret = process.env[SOURCES.opensky.clientSecretEnv];
  if (!clientId || !clientSecret) return {};
  if (openskyToken.value && openskyToken.expiresAt > Date.now() + 60000) return { Authorization: `Bearer ${openskyToken.value}` };
  if (Date.now() - openskyToken.failedAt < 10 * 60000) return {};
  try {
    const body = new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret });
    const { data } = await axios.post(SOURCES.opensky.token, body.toString(), { timeout: 15000, headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": SOURCES.userAgent } });
    openskyToken.value = data.access_token;
    openskyToken.expiresAt = Date.now() + (toNumber(data.expires_in) || 1800) * 1000;
    return { Authorization: `Bearer ${openskyToken.value}` };
  } catch (error) {
    openskyToken.failedAt = Date.now();
    console.log(`[flights] The OpenSky token request failed, so OpenSky is using anonymous access. ${errorMessage(error)}`);
    return {};
  }
};

const openskyInterval = () => {
  const status = sourceStatus.opensky;
  const base = (status.authenticated ? SOURCES.opensky.minIntervalSeconds.registered : SOURCES.opensky.minIntervalSeconds.anonymous) * 1000;
  if (status.credits === null) return base;
  const usable = Math.max(0, status.credits - SOURCES.opensky.reserveCredits);
  const pulls = Math.floor(usable / SOURCES.opensky.globalCreditCost);
  const now = new Date();
  const reset = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  if (pulls <= 0) return Math.max(base, reset - now.getTime());
  return Math.max(base, Math.floor((reset - now.getTime()) / pulls));
};

let openskyInflight = null;

const pullOpenSky = () => {
  if (openskyInflight) return openskyInflight;
  const status = sourceStatus.opensky;
  if (status.cooldownUntil > Date.now()) return Promise.resolve(0);
  openskyInflight = (async () => {
    status.requests += 1;
    try {
      const headers = await openskyAuthHeader();
      status.authenticated = Boolean(headers.Authorization);
      const response = await httpGet(SOURCES.opensky.states, SOURCES.opensky.timeoutMs, headers);
      const remaining = toNumber(response.headers["x-rate-limit-remaining"]);
      if (remaining !== null) status.credits = remaining;
      const reports = parseOpenSky(response.data);
      mergeReports(reports, "opensky");
      noteSuccess("opensky", reports.length);
      status.nextPullAt = Date.now() + openskyInterval();
      return reports.length;
    } catch (error) {
      const code = error && error.response ? error.response.status : 0;
      if (code === 401) openskyToken.value = null;
      const retryAfter = error && error.response ? toNumber(error.response.headers["x-rate-limit-retry-after-seconds"]) : null;
      const cooldown = code === 429 && retryAfter ? retryAfter * 1000 : cooldownFor("opensky", error);
      noteFailure("opensky", error, cooldown);
      status.nextPullAt = Date.now() + Math.max(cooldown, openskyInterval());
      return 0;
    } finally {
      openskyInflight = null;
    }
  })();
  return openskyInflight;
};

const nextTile = (key) => {
  const now = Date.now();
  if (focus.expiresAt >= now) {
    let pick = null;
    let pickServed = Infinity;
    for (const tile of focus.tiles) {
      const served = focus.served.get(tile.key) || {};
      const last = served[key] || 0;
      if (now - last >= SOURCES.sweep.focusRefreshSeconds * 1000 && last < pickServed) {
        pick = tile;
        pickServed = last;
      }
    }
    if (pick) {
      focus.served.set(pick.key, { ...(focus.served.get(pick.key) || {}), [key]: now });
      return { lat: pick.lat, lon: pick.lon, priority: 1 };
    }
  }
  const quietMs = SOURCES.sweep.quietRevisitMinutes * 60000;
  const quiet = (sourceKey, index) => {
    const stats = tileStats.get(`${sourceKey}:${index}`);
    return Boolean(stats) && stats.count < SOURCES.sweep.quietThreshold && now - stats.at < quietMs;
  };
  const seenBy = (sourceKey, index) => tileStats.has(`${sourceKey}:${index}`);
  const bestCount = (index) => SWEEP_KEYS.reduce((best, sourceKey) => Math.max(best, (tileStats.get(`${sourceKey}:${index}`) || { count: 0 }).count), 0);
  if (sweepOrder.length === 0 || sweepWrapped) {
    sweepOrderAt = now;
    sweepWrapped = false;
    const all = SWEEP_TILES.map((tile, index) => index);
    const unseen = all.filter((index) => !SWEEP_KEYS.some((sourceKey) => seenBy(sourceKey, index)));
    const seen = all.filter((index) => SWEEP_KEYS.some((sourceKey) => seenBy(sourceKey, index))).sort((a, b) => bestCount(b) - bestCount(a));
    sweepOrder = unseen.concat(seen);
    sweepCursor.shared = 0;
  }
  const advanceCursor = (position) => {
    if (position >= sweepOrder.length) sweepWrapped = true;
    sweepCursor.shared = position % Math.max(1, sweepOrder.length);
  };
  const claimed = (index) => now - (tileClaims.get(index) || 0) < SOURCES.sweep.tileRefreshSeconds * 1000;
  const claim = (index) => {
    tileClaims.set(index, now);
    const tile = SWEEP_TILES[index];
    return { lat: tile.lat, lon: tile.lon, priority: 5, index };
  };
  const start = sweepCursor.shared;
  let leading = true;
  for (let step = 0; step < sweepOrder.length; step += 1) {
    const index = sweepOrder[(start + step) % sweepOrder.length];
    const skipForAll = claimed(index) || SWEEP_KEYS.every((sourceKey) => quiet(sourceKey, index));
    if (skipForAll) {
      if (leading) advanceCursor(start + step + 1);
      continue;
    }
    if (quiet(key, index)) {
      leading = false;
      continue;
    }
    if (leading) advanceCursor(start + step + 1);
    return claim(index);
  }
  const index = sweepOrder.length ? sweepOrder[sweepCursor.shared % sweepOrder.length] : 0;
  advanceCursor(sweepCursor.shared + 1);
  return claim(index);
};

const evictFiles = (store, max) => {
  if (store.size <= max) return;
  const idle = Array.from(store.entries()).filter(([, state]) => !state.loading).sort((a, b) => (a[1].used || 0) - (b[1].used || 0));
  for (let i = 0; i < idle.length && store.size > max; i += 1) store.delete(idle[i][0]);
};

const routeFileState = (store, key, url, parse, max, load = true) => {
  const current = store.get(key);
  const now = Date.now();
  if (current) current.used = now;
  if (current && current.map && now - current.at < SOURCES.routes.fileRefreshHours * 3600000) return current;
  if (!load) return current || { map: null };
  if (current && (current.loading || (!current.map && now - current.at < SOURCES.routes.fileRetryMinutes * 60000))) return current;
  const state = { at: current ? current.at : 0, map: current ? current.map : null, loading: true, used: now };
  store.set(key, state);
  evictFiles(store, max);
  hostQueues.routes.schedule(async () => {
    routeStatus.requests += 1;
    try {
      const { data } = await axios.get(url, { timeout: SOURCES.routes.timeoutMs, responseType: "text", headers: { "User-Agent": SOURCES.userAgent }, validateStatus: (status) => (status >= 200 && status < 300) || status === 404 });
      store.set(key, { at: Date.now(), map: typeof data === "string" && !/^404/.test(data) ? parse(String(data).replace(/^\uFEFF/, "").split(/\r?\n/)) : new Map(), loading: false, used: Date.now() });
      evictFiles(store, max);
      routeStatus.lastSuccessAt = new Date().toISOString();
      routeStatus.lastError = null;
    } catch (error) {
      store.set(key, { at: Date.now(), map: state.map, loading: false, used: Date.now() });
      routeStatus.lastError = `The route file ${key} could not be loaded. ${errorMessage(error)}`;
    }
    lastResolveAt = 0;
  }, 3).catch(() => null);
  return state;
};

const parseRouteFile = (lines) => {
  const header = parseCsvLine(lines[0] || "");
  const idx = { callsign: header.indexOf("Callsign"), codes: header.indexOf("AirportCodes") };
  const map = new Map();
  if (idx.callsign < 0 || idx.codes < 0) return map;
  for (let i = 1; i < lines.length; i += 1) {
    if (!lines[i]) continue;
    const f = parseCsvLine(lines[i]);
    if (f[idx.callsign] && f[idx.codes]) map.set(f[idx.callsign], f[idx.codes]);
  }
  return map;
};

const parseAirportFile = (lines) => {
  const header = parseCsvLine(lines[0] || "");
  const idx = { code: header.indexOf("Code"), name: header.indexOf("Name"), icao: header.indexOf("ICAO"), iata: header.indexOf("IATA"), location: header.indexOf("Location"), country: header.indexOf("CountryISO2"), lat: header.indexOf("Latitude"), lon: header.indexOf("Longitude") };
  const map = new Map();
  if (idx.code < 0 || idx.lat < 0 || idx.lon < 0) return map;
  for (let i = 1; i < lines.length; i += 1) {
    if (!lines[i]) continue;
    const f = parseCsvLine(lines[i]);
    const lat = toNumber(f[idx.lat]);
    const lon = toNumber(f[idx.lon]);
    if (!f[idx.code] || lat === null || lon === null) continue;
    map.set(f[idx.code], { icao: (idx.icao >= 0 && f[idx.icao]) || f[idx.code], iata: (idx.iata >= 0 && f[idx.iata]) || null, name: (idx.name >= 0 && f[idx.name]) || null, location: (idx.location >= 0 && f[idx.location]) || null, country: (idx.country >= 0 && f[idx.country]) || null, lat, lon });
  }
  return map;
};

const routeFileFor = (airline, load) => routeFileState(routeFiles, airline, fill(SOURCES.routes.routeFile, { letter: airline.charAt(0), airline }), parseRouteFile, SOURCES.routes.maxRouteFiles, load);

const airportFileFor = (code, load) => {
  const prefix = code.slice(0, 2);
  return routeFileState(airportFiles, prefix, fill(SOURCES.routes.airportFile, { letter: prefix.charAt(0), prefix }), parseAirportFile, SOURCES.routes.maxAirportFiles, load);
};

const resolveRoutes = () => {
  if (Date.now() - lastResolveAt < SOURCES.routes.resolveEveryMs) return;
  lastResolveAt = Date.now();
  const bounds = focus.expiresAt >= Date.now() ? focus.bounds : null;
  const inFocus = [];
  const elsewhere = [];
  for (const entry of aircraft.values()) {
    const callsign = entry.flight;
    if (!callsign || !ROUTE_PATTERN.test(callsign) || freshRoute(callsign)) continue;
    const inside = bounds && entry.lat >= bounds.south && entry.lat <= bounds.north && ((bounds.west <= bounds.east && entry.lon >= bounds.west && entry.lon <= bounds.east) || (bounds.west > bounds.east && (entry.lon >= bounds.west || entry.lon <= bounds.east)));
    (inside ? inFocus : elsewhere).push(callsign);
  }
  const now = Date.now();
  let resolved = 0;
  const focusCount = inFocus.length;
  const candidates = inFocus.concat(elsewhere);
  for (let i = 0; i < candidates.length; i += 1) {
    const callsign = candidates[i];
    const load = i < focusCount && hostQueues.routes.size() < SOURCES.routes.maxPendingFiles;
    if (freshRoute(callsign)) continue;
    const file = routeFileFor(callsign.slice(0, 3), load);
    if (!file.map) continue;
    const route = file.map.get(callsign);
    if (!route) {
      routeCache.set(callsign, { at: now, known: false, airline: null, number: null, airports: [], plausible: null });
      resolved += 1;
      continue;
    }
    const codes = route.split("-").filter(Boolean);
    const files = codes.map((code) => airportFileFor(code, load));
    if (files.some((item) => !item.map)) continue;
    const airports = codes.map((code, index) => files[index].map.get(code)).filter(Boolean);
    const known = airports.length >= 2 && airports.length === codes.length;
    routeCache.set(callsign, { at: now, known, airline: callsign.slice(0, 3), number: callsign.slice(3), airports, plausible: null });
    if (known) routeStatus.resolved += 1;
    resolved += 1;
  }
  if (routeCache.size > SOURCES.routes.maxCache) {
    let excess = routeCache.size - SOURCES.routes.maxCache;
    for (const key of routeCache.keys()) {
      if (excess <= 0) break;
      routeCache.delete(key);
      excess -= 1;
    }
  }
  if (!resolved) return;
  version += 1;
  for (const entry of aircraft.values()) if (entry.flight && applyRoute(entry)) entry.v = version;
};

const fetchGlobal = (item) => hostQueues.adsblol.schedule(async () => {
  const status = sourceStatus.adsblol;
  if (status.cooldownUntil > Date.now()) return 0;
  status.requests += 1;
  try {
    const { data } = await httpGet(item.url, SOURCES.adsblol.timeoutMs);
    const reports = parseReadsb(data);
    mergeReports(reports, "adsblol");
    globalPulls.set(item.key, { at: Date.now(), count: reports.length, error: null });
    noteSuccess("adsblol", reports.length);
    return reports.length;
  } catch (error) {
    globalPulls.set(item.key, { at: Date.now(), count: 0, error: errorMessage(error) });
    noteFailure("adsblol", error, cooldownFor("adsblol", error));
    return 0;
  }
}, 3);

const dueGlobal = () => SOURCES.adsblol.globals.find((item) => {
  const last = globalPulls.get(item.key);
  return !last || Date.now() - last.at >= item.intervalSeconds * 1000;
});

const tick = () => {
  if (!SOURCES.sweep.alwaysOn && Date.now() > activeUntil) {
    clearInterval(loopTimer);
    loopTimer = null;
    return;
  }
  pruneStale();
  resolveRoutes();
  watchSquawks();
  if (SOURCES.opensky.enabled && Date.now() >= sourceStatus.opensky.nextPullAt) pullOpenSky();
  for (const key of SWEEP_KEYS) {
    if (sourceStatus[key].cooldownUntil > Date.now() || !hostQueues[key].idle()) continue;
    if (key === "adsblol") {
      const global = dueGlobal();
      if (global) {
        globalPulls.set(global.key, { ...(globalPulls.get(global.key) || {}), at: Date.now() });
        fetchGlobal(global);
        continue;
      }
      if (!SOURCES.adsblol.sweep) continue;
    }
    const tile = nextTile(key);
    fetchPoint(key, tile.lat, tile.lon, tile.priority, tile.index ?? null);
  }
};

const saveState = () => {
  try {
    const cutoff = Math.floor(Date.now() / 1000) - SOURCES.retention.staleSeconds;
    const rows = [];
    for (const entry of aircraft.values()) if (entry.posAt >= cutoff) rows.push(entry);
    const tmp = `${SOURCES.retention.statePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify({ at: Date.now(), aircraft: rows, tiles: Array.from(tileStats.entries()) }));
    fs.renameSync(tmp, SOURCES.retention.statePath);
  } catch (error) {
    // best effort only
  }
};

const loadState = () => {
  try {
    if (!fs.existsSync(SOURCES.retention.statePath)) return 0;
    const saved = JSON.parse(fs.readFileSync(SOURCES.retention.statePath, "utf8"));
    const cutoff = Math.floor(Date.now() / 1000) - SOURCES.retention.staleSeconds;
    let loaded = 0;
    for (const entry of saved.aircraft || []) {
      if (!entry || !entry.hex || !Number.isFinite(entry.posAt) || entry.posAt < cutoff) continue;
      version += 1;
      entry.v = version;
      aircraft.set(entry.hex, entry);
      loaded += 1;
    }
    for (const [tileKey, stats] of saved.tiles || []) if (typeof tileKey === "string" && tileKey.includes(":") && stats) tileStats.set(tileKey, stats);
    return loaded;
  } catch (error) {
    return 0;
  }
};

const markActive = () => {
  activeUntil = Date.now() + SOURCES.sweep.activeMinutes * 60000;
  if (!loopTimer) {
    loopTimer = setInterval(tick, SOURCES.sweep.tickMs);
    if (loopTimer.unref) loopTimer.unref();
    tick();
  }
};

const setFocus = (bounds, lat, lon, zoom) => {
  if (!Number.isFinite(zoom) || zoom < SOURCES.sweep.focusMinZoom || !Number.isFinite(lat) || !Number.isFinite(lon)) return;
  const radiusDeg = SOURCES.sweep.radiusNm / 60;
  const rowStep = radiusDeg * 1.5;
  const valid = bounds && [bounds.west, bounds.south, bounds.east, bounds.north].every(Number.isFinite);
  const south = Math.max(-85, valid ? bounds.south : lat - radiusDeg);
  const north = Math.min(85, valid ? bounds.north : lat + radiusDeg);
  let west = valid ? bounds.west : lon - radiusDeg;
  let east = valid ? bounds.east : lon + radiusDeg;
  if (east - west >= 360) {
    west = -180;
    east = 180;
  }
  const tiles = [];
  for (let row = Math.floor(south / rowStep); row * rowStep <= north + rowStep / 2; row += 1) {
    const tileLat = row * rowStep;
    if (tileLat < -85 || tileLat > 85) continue;
    const colStep = (Math.sqrt(3) * radiusDeg) / Math.max(0.2, Math.cos((tileLat * Math.PI) / 180));
    const offset = Math.abs(row) % 2 ? colStep / 2 : 0;
    for (let col = Math.floor((west - offset) / colStep); col * colStep + offset <= east + colStep / 2; col += 1) {
      const tileLon = ((col * colStep + offset + 540) % 360) - 180;
      tiles.push({ key: `${row}:${col}`, lat: round(tileLat, 3), lon: round(tileLon, 3), distance: Math.abs(tileLat - lat) + Math.abs(col * colStep + offset - lon) * Math.cos((lat * Math.PI) / 180) });
    }
  }
  tiles.sort((a, b) => a.distance - b.distance);
  focus.tiles = tiles.slice(0, SOURCES.sweep.focusMaxTiles);
  focus.bounds = { west: ((west + 540) % 360) - 180, east: ((east + 540) % 360) - 180, south, north };
  if (east - west >= 360) focus.bounds = { west: -180, east: 180, south, north };
  focus.expiresAt = Date.now() + SOURCES.sweep.focusTtlSeconds * 1000;
  const cutoff = Date.now() - SOURCES.sweep.focusTtlSeconds * 1000;
  for (const [key, served] of focus.served.entries()) if (Math.max(...SWEEP_KEYS.map((source) => served[source] || 0)) < cutoff) focus.served.delete(key);
};

const toRow = (entry) => [
  entry.hex,
  entry.flight || null,
  round(entry.lat, 4),
  round(entry.lon, 4),
  entry.alt,
  entry.gs === null || entry.gs === undefined ? null : Math.round(entry.gs),
  entry.trk === null || entry.trk === undefined ? null : Math.round(entry.trk),
  entry.vr === null || entry.vr === undefined ? null : Math.round(entry.vr),
  entry.sq || null,
  entry.cat || null,
  entry.type || null,
  entry.reg || null,
  entry.ground ? 1 : 0,
  entry.mil ? 1 : 0,
  entry.posAt,
  entry.src,
  entry.al || null,
  entry.orig || null,
  entry.dest || null
];

const buildStats = () => {
  if (statsCache.value && Date.now() - statsCache.at < 5000) return statsCache.value;
  const stats = {
    total: 0,
    airborne: 0,
    ground: 0,
    military: 0,
    bySource: { opensky: 0, adsbfi: 0, adsblol: 0, airplaneslive: 0 },
    byAltitude: { ground: 0, low: 0, mid: 0, high: 0, unknown: 0 },
    byCategory: {},
    byRegion: {},
    operators: {},
    types: {},
    speeds: [0, 0, 0, 0, 0, 0],
    emergencies: []
  };
  for (const entry of aircraft.values()) {
    stats.total += 1;
    if (entry.ground) stats.ground += 1; else stats.airborne += 1;
    if (entry.mil) stats.military += 1;
    for (const [key, bit] of Object.entries(SOURCE_BITS)) if (entry.src & bit) stats.bySource[key] += 1;
    stats.byAltitude[altitudeBand(entry)] += 1;
    const group = categoryGroup(entry);
    stats.byCategory[group] = (stats.byCategory[group] || 0) + 1;
    const region = regionOf(entry.lat, entry.lon);
    stats.byRegion[region] = (stats.byRegion[region] || 0) + 1;
    const operator = operatorOf(entry.flight);
    if (operator) stats.operators[operator] = (stats.operators[operator] || 0) + 1;
    if (entry.type) stats.types[entry.type] = (stats.types[entry.type] || 0) + 1;
    if (!entry.ground && entry.gs !== null && entry.gs !== undefined) stats.speeds[Math.min(5, Math.floor(entry.gs / 100))] += 1;
    const emergency = emergencyOf(entry);
    if (emergency) stats.emergencies.push({ hex: entry.hex, flight: entry.flight || null, reg: entry.reg || null, type: entry.type || null, squawk: entry.sq || null, reason: emergency, lat: round(entry.lat, 3), lon: round(entry.lon, 3), alt: entry.alt, posAt: entry.posAt });
  }
  const top = (map, limit) => Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([key, count]) => ({ key, count }));
  stats.topOperators = top(stats.operators, 15);
  stats.topTypes = top(stats.types, 15);
  delete stats.operators;
  delete stats.types;
  stats.generatedAt = new Date().toISOString();
  statsCache = { at: Date.now(), value: stats };
  return stats;
};

const sourcesPayload = () => ({
  opensky: { ...sourceStatus.opensky, enabled: SOURCES.opensky.enabled, note: !SOURCES.opensky.enabled ? SOURCES.opensky.disabledNote : sourceStatus.opensky.lastError && !sourceStatus.opensky.lastSuccessAt ? SOURCES.opensky.blockedNote : null, cooldownUntil: sourceStatus.opensky.cooldownUntil ? new Date(sourceStatus.opensky.cooldownUntil).toISOString() : null, nextPullAt: sourceStatus.opensky.nextPullAt ? new Date(sourceStatus.opensky.nextPullAt).toISOString() : null, home: SOURCES.opensky.home, attribution: SOURCES.opensky.attribution, terms: SOURCES.opensky.terms, intervalSeconds: Math.round(openskyInterval() / 1000) },
  adsbfi: { ...sourceStatus.adsbfi, enabled: true, cooldownUntil: sourceStatus.adsbfi.cooldownUntil ? new Date(sourceStatus.adsbfi.cooldownUntil).toISOString() : null, home: SOURCES.adsbfi.home, attribution: SOURCES.adsbfi.attribution, terms: SOURCES.adsbfi.terms, queued: hostQueues.adsbfi.size() },
  adsblol: { ...sourceStatus.adsblol, enabled: true, cooldownUntil: sourceStatus.adsblol.cooldownUntil ? new Date(sourceStatus.adsblol.cooldownUntil).toISOString() : null, home: SOURCES.adsblol.home, attribution: SOURCES.adsblol.attribution, terms: SOURCES.adsblol.terms, queued: hostQueues.adsblol.size(), routes: { ...routeStatus, cached: routeCache.size }, globals: Object.fromEntries(Array.from(globalPulls.entries()).map(([key, value]) => [key, { ...value, at: value.at ? new Date(value.at).toISOString() : null }])) },
  airplaneslive: { ...sourceStatus.airplaneslive, enabled: true, cooldownUntil: sourceStatus.airplaneslive.cooldownUntil ? new Date(sourceStatus.airplaneslive.cooldownUntil).toISOString() : null, home: SOURCES.airplaneslive.home, attribution: SOURCES.airplaneslive.attribution, terms: SOURCES.airplaneslive.terms, queued: hostQueues.airplaneslive.size() }
});

const parseCsvLine = (line) => {
  const out = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (quoted) {
      if (c === "\"" && line[i + 1] === "\"") { field += "\""; i += 1; }
      else if (c === "\"") quoted = false;
      else field += c;
    } else if (c === "\"") quoted = true;
    else if (c === ",") { out.push(field); field = ""; }
    else field += c;
  }
  out.push(field);
  return out;
};

const loadAirports = async () => {
  if (airportsCache.rows.length && Date.now() - airportsCache.at < SOURCES.ourairports.refreshHours * 3600000) return airportsCache;
  if (airportsCache.loading) return airportsCache.loading;
  airportsCache.loading = (async () => {
    try {
      const { data } = await axios.get(SOURCES.ourairports.csv, { timeout: SOURCES.ourairports.timeoutMs, responseType: "text", headers: { "User-Agent": SOURCES.userAgent } });
      const lines = String(data).split(/\r?\n/);
      const header = parseCsvLine(lines[0] || "");
      const col = (name) => header.indexOf(name);
      const idx = { ident: col("ident"), type: col("type"), name: col("name"), lat: col("latitude_deg"), lon: col("longitude_deg"), country: col("iso_country"), city: col("municipality"), scheduled: col("scheduled_service"), iata: col("iata_code"), icao: col("icao_code"), gps: col("gps_code") };
      if (idx.type < 0 || idx.lat < 0 || idx.lon < 0) throw new Error("The airport file did not include the expected columns");
      const rows = [];
      for (let i = 1; i < lines.length; i += 1) {
        if (!lines[i]) continue;
        const f = parseCsvLine(lines[i]);
        const type = f[idx.type];
        if (type !== "large_airport" && !(type === "medium_airport" && f[idx.scheduled] === "yes")) continue;
        const lat = toNumber(f[idx.lat]);
        const lon = toNumber(f[idx.lon]);
        if (lat === null || lon === null) continue;
        const icao = (idx.icao >= 0 && f[idx.icao]) || (idx.gps >= 0 && f[idx.gps]) || f[idx.ident];
        rows.push([icao, (idx.iata >= 0 && f[idx.iata]) || null, f[idx.name], round(lat, 4), round(lon, 4), type === "large_airport" ? "large" : "medium", f[idx.country] || null, (idx.city >= 0 && f[idx.city]) || null]);
      }
      airportsCache = { at: Date.now(), rows, loading: null, error: null };
    } catch (error) {
      airportsCache = { ...airportsCache, loading: null, error: errorMessage(error) };
    }
    return airportsCache;
  })();
  return airportsCache.loading;
};

const loadAirlines = async () => {
  if (airlinesCache.map.size && Date.now() - airlinesCache.at < SOURCES.airlines.refreshHours * 3600000) return airlinesCache;
  if (airlinesCache.loading) return airlinesCache.loading;
  airlinesCache.loading = (async () => {
    try {
      const { data } = await axios.get(SOURCES.airlines.csv, { timeout: SOURCES.airlines.timeoutMs, responseType: "text", headers: { "User-Agent": SOURCES.userAgent } });
      const lines = String(data).replace(/^\uFEFF/, "").split(/\r?\n/);
      const header = parseCsvLine(lines[0] || "");
      const idx = { name: header.indexOf("Name"), icao: header.indexOf("ICAO"), iata: header.indexOf("IATA") };
      if (idx.name < 0 || idx.icao < 0) throw new Error("The airline file did not include the expected columns");
      const map = new Map();
      for (let i = 1; i < lines.length; i += 1) {
        if (!lines[i]) continue;
        const f = parseCsvLine(lines[i]);
        const icao = f[idx.icao];
        if (!icao || !/^[A-Z]{3}$/.test(icao) || map.has(icao)) continue;
        map.set(icao, [f[idx.name], (idx.iata >= 0 && f[idx.iata]) || null]);
      }
      airlinesCache = { at: Date.now(), map, loading: null, error: null };
    } catch (error) {
      airlinesCache = { ...airlinesCache, loading: null, error: errorMessage(error) };
    }
    return airlinesCache;
  })();
  return airlinesCache.loading;
};

const ensureFresh = async () => {
  const status = sourceStatus.opensky;
  if (SOURCES.opensky.enabled && Date.now() >= status.nextPullAt && status.cooldownUntil <= Date.now()) await pullOpenSky();
  pruneStale();
};

router.get("/flights/snapshot", (req, res) => {
  try {
    setFocus({ west: Number(req.query.west), south: Number(req.query.south), east: Number(req.query.east), north: Number(req.query.north) }, Number(req.query.lat), Number(req.query.lon), Number(req.query.zoom));
    markActive();
    const since = Number(req.query.since);
    const sameEpoch = req.query.epoch === EPOCH;
    const oldestStone = oldestTombstoneVersion();
    const canDelta = sameEpoch && Number.isFinite(since) && since > 0 && (oldestStone === null || since >= oldestStone - 1);
    const rows = [];
    for (const entry of aircraft.values()) if (!canDelta || entry.v > since) rows.push(toRow(entry));
    const removed = [];
    if (canDelta) for (const [hex, stone] of tombstones.entries()) if (stone.v > since) removed.push(hex);
    const stats = buildStats();
    res.json({
      success: true,
      epoch: EPOCH,
      version,
      full: !canDelta,
      fields: SNAPSHOT_FIELDS,
      rows,
      removed,
      total: aircraft.size,
      stats: { total: stats.total, airborne: stats.airborne, ground: stats.ground, military: stats.military, emergencies: stats.emergencies.length, bySource: stats.bySource },
      sources: sourcesPayload(),
      sweep: { tiles: SWEEP_TILES.length, focus: focus.expiresAt >= Date.now() ? focus.tiles.length : 0 },
      squawks: squawkPayload(),
      updatedAt: new Date().toISOString()
    });
    warmAnalyses(Array.from(squawkEvents.values()));
  } catch (error) {
    res.status(500).json({ success: false, message: "The flight snapshot could not be built." });
  }
});

router.get("/flights/stats", (req, res) => {
  markActive();
  res.json({ success: true, stats: buildStats(), sources: sourcesPayload() });
});

router.get("/flights/search", (req, res) => {
  const query = String(req.query.q || "").trim().toUpperCase();
  if (query.length < 2) return res.json({ success: true, results: [] });
  const results = [];
  for (const entry of aircraft.values()) {
    const fields = [entry.flight, entry.reg, entry.hex, entry.type].filter(Boolean).map((value) => String(value).toUpperCase());
    if (fields.some((value) => value.includes(query))) results.push(toRow(entry));
    if (results.length >= 25) break;
  }
  res.json({ success: true, fields: SNAPSHOT_FIELDS, results });
});

const analysisCache = new Map();
const analysisWarmQueue = [];
let analysisWarmActive = 0;

const analysisKey = (event) => `${event.hex}|${event.squawk}|${event.startedAt}`;

const requestAnalysis = async (event) => {
  const settings = SOURCES.analysis;
  const entry = aircraft.get(event.hex) || {};
  const airlines = await loadAirlines().catch(() => ({ map: new Map() }));
  const route = entry.flight ? freshRoute(entry.flight) : null;
  const airlineRow = entry.al && airlines.map ? airlines.map.get(entry.al) : null;
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    callsign: entry.flight || event.flight || null,
    registration: entry.reg || event.reg || null,
    icaoHex: event.hex.toUpperCase(),
    aircraftType: entry.type || event.type || null,
    category: entry.cat ? categoryGroup(entry) : null,
    military: Boolean(entry.mil),
    airline: airlineRow ? airlineRow[0] : entry.al || null,
    route: route && route.known ? route.airports.map((airport) => [airport.iata || airport.icao, airport.name, airport.location].filter(Boolean).join(", ")) : null,
    squawk: event.squawk,
    squawkMeaning: event.reason,
    squawkStartedAt: new Date(event.startedAt * 1000).toISOString(),
    squawkingForMinutes: Math.round(Math.max(0, now - event.startedAt) / 60),
    startPosition: { latitude: event.startLat, longitude: event.startLon, altitudeFt: event.startAlt },
    currentPosition: { latitude: entry.lat ?? event.lastLat, longitude: entry.lon ?? event.lastLon, region: regionOf(entry.lat ?? event.lastLat, entry.lon ?? event.lastLon) },
    altitudeFt: entry.ground ? 0 : entry.alt ?? event.lastAlt ?? null,
    onGround: Boolean(entry.ground ?? event.lastGround),
    groundSpeedKt: entry.gs ?? null,
    trackDeg: entry.trk ?? null,
    verticalRateFpm: entry.vr ?? null,
    lastPositionAt: entry.posAt ? new Date(entry.posAt * 1000).toISOString() : event.lastSeenAt ? new Date(event.lastSeenAt * 1000).toISOString() : null,
    sources: Object.entries(SOURCE_BITS).filter(([, bit]) => (entry.src || 0) & bit).map(([key]) => SOURCES[key].name)
  };
  const body = (withThinking) => ({
    systemInstruction: { parts: [{ text: settings.instructions }] },
    contents: [{ role: "user", parts: [{ text: JSON.stringify(payload) }] }],
    generationConfig: {
      temperature: settings.temperature,
      maxOutputTokens: settings.maxOutputTokens,
      ...(withThinking && settings.thinkingLevel ? { thinkingConfig: { thinkingLevel: settings.thinkingLevel } } : {}),
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          summary: { type: "STRING" },
          threats: { type: "ARRAY", items: { type: "STRING" } },
          actions: { type: "ARRAY", items: { type: "STRING" } },
          timing: { type: "STRING" },
          confidence: { type: "STRING" }
        },
        required: ["summary", "threats", "actions", "timing", "confidence"]
      }
    }
  });
  const url = fill(settings.endpoint, { model: encodeURIComponent(settings.model) });
  const options = { headers: { "Content-Type": "application/json", "x-goog-api-key": settings.apiKey }, timeout: settings.timeoutMs };
  let response;
  try {
    response = await axios.post(url, body(true), options);
  } catch (error) {
    const message = error && error.response && error.response.data && error.response.data.error ? String(error.response.data.error.message || "") : "";
    if (!(error && error.response && error.response.status === 400 && /thinking/i.test(message))) throw error;
    response = await axios.post(url, body(false), options);
  }
  const content = (((response.data || {}).candidates || [])[0] || {}).content;
  const raw = content && Array.isArray(content.parts) ? content.parts.map((part) => part.text || "").join("") : "";
  const parsed = JSON.parse(raw.replace(/```json\s*/g, "").replace(/```/g, "").trim());
  return {
    summary: String(parsed.summary || "").trim(),
    threats: (Array.isArray(parsed.threats) ? parsed.threats : []).map((item) => String(item).trim()).filter(Boolean),
    actions: (Array.isArray(parsed.actions) ? parsed.actions : []).map((item) => String(item).trim()).filter(Boolean),
    timing: String(parsed.timing || "").trim(),
    confidence: String(parsed.confidence || "").trim(),
    model: settings.model,
    generatedAt: new Date().toISOString()
  };
};

const analysisFor = (event) => {
  const key = analysisKey(event);
  const cached = analysisCache.get(key);
  if (cached && cached.result) return Promise.resolve(cached.result);
  if (cached && cached.loading) return cached.loading;
  const loading = requestAnalysis(event).then((result) => {
    analysisCache.set(key, { result });
    while (analysisCache.size > SOURCES.analysis.cacheLimit) analysisCache.delete(analysisCache.keys().next().value);
    return result;
  }).catch((error) => {
    analysisCache.set(key, { failedAt: Date.now() });
    throw error;
  });
  analysisCache.set(key, { loading });
  return loading;
};

const warmAnalyses = (events) => {
  if (!SOURCES.analysis.apiKey) return;
  for (const event of events) if (!analysisCache.has(analysisKey(event)) && !analysisWarmQueue.some((queued) => analysisKey(queued) === analysisKey(event))) analysisWarmQueue.push(event);
  while (analysisWarmActive < SOURCES.analysis.warmConcurrency && analysisWarmQueue.length) {
    const next = analysisWarmQueue.shift();
    analysisWarmActive += 1;
    analysisFor(next).catch(() => null).finally(() => {
      analysisWarmActive -= 1;
      warmAnalyses([]);
    });
  }
};

router.get("/flights/alerts/analysis", async (req, res) => {
  if (!SOURCES.analysis.apiKey) return res.status(503).json({ success: false, message: "The AI analysis is unavailable because GEMINI_API_KEY is not configured." });
  const hex = String(req.query.hex || "").toLowerCase().replace(/[^0-9a-f]/g, "");
  const event = squawkEvents.get(hex) || endedSquawks.find((item) => item.hex === hex) || null;
  if (!event) return res.status(404).json({ success: false, message: "The aircraft is not squawking an emergency code right now." });
  try {
    const cached = analysisCache.get(analysisKey(event));
    const result = await analysisFor(event);
    res.json({ success: true, analysis: result, cached: Boolean(cached && cached.result) });
  } catch (error) {
    const reason = error && error.response && error.response.data && error.response.data.error ? error.response.data.error.message : errorMessage(error);
    res.status(502).json({ success: false, message: `The AI analysis could not be generated by ${SOURCES.analysis.name}. ${String(reason || "The request failed.").replace(/\.?$/, ".")}` });
  }
});

router.get("/flights/aircraft/:hex", async (req, res) => {
  const hex = String(req.params.hex || "").toLowerCase().replace(/[^0-9a-f]/g, "");
  if (hex.length !== 6) return res.status(400).json({ success: false, message: "A six character ICAO hex address is required." });
  markActive();
  const cached = detailCache.get(hex);
  if (!cached || Date.now() - cached.at > SOURCES.retention.detailCacheSeconds * 1000) {
    detailCache.set(hex, { at: Date.now() });
    for (const key of ["adsbfi", "airplaneslive", "adsblol"]) {
      if (sourceStatus[key].cooldownUntil > Date.now()) continue;
      try {
        await hostQueues[key].schedule(async () => {
          sourceStatus[key].requests += 1;
          const { data } = await httpGet(fill(SOURCES[key].hex, { hex }), SOURCES[key].timeoutMs);
          mergeReports(parseReadsb(data), key);
        }, 0);
        break;
      } catch (error) {
        noteFailure(key, error, cooldownFor(key, error));
      }
    }
  }
  const entry = aircraft.get(hex);
  if (!entry) return res.status(404).json({ success: false, message: "The aircraft is not currently being tracked." });
  const airlines = await loadAirlines();
  const route = entry.flight ? freshRoute(entry.flight) : null;
  const airline = entry.al && airlines.map.get(entry.al) ? { icao: entry.al, name: airlines.map.get(entry.al)[0], iata: airlines.map.get(entry.al)[1] } : entry.al ? { icao: entry.al, name: null, iata: null } : null;
  res.json({
    success: true,
    aircraft: { ...entry, category: categoryGroup(entry), altitudeBand: altitudeBand(entry), region: regionOf(entry.lat, entry.lon), operatorCode: operatorOf(entry.flight), emergency: emergencyOf(entry), sources: Object.entries(SOURCE_BITS).filter(([, bit]) => entry.src & bit).map(([key]) => SOURCES[key].name) },
    airline,
    route: route && route.known ? { number: route.number, plausible: route.plausible, airports: route.airports } : null
  });
});

const parseBounds = (query) => {
  const bounds = { west: Number(query.west), south: Number(query.south), east: Number(query.east), north: Number(query.north) };
  return Object.values(bounds).every(Number.isFinite) ? bounds : null;
};

const inQueryBounds = (bounds, lat, lon) => {
  if (!bounds) return true;
  if (lat < bounds.south || lat > bounds.north) return false;
  if (bounds.east - bounds.west >= 360) return true;
  const west = ((bounds.west + 540) % 360) - 180;
  const east = ((bounds.east + 540) % 360) - 180;
  return west <= east ? lon >= west && lon <= east : lon >= west || lon <= east;
};

router.get("/flights/trails", (req, res) => {
  const bounds = parseBounds(req.query);
  const limit = Math.max(1, Math.min(SOURCES.retention.maxTrailResponse, Number(req.query.limit) || SOURCES.retention.maxTrailResponse));
  const result = {};
  let count = 0;
  for (const [hex, list] of trails.entries()) {
    if (list.length < 2) continue;
    const entry = aircraft.get(hex);
    if (!entry || !inQueryBounds(bounds, entry.lat, entry.lon)) continue;
    result[hex] = list.map((point) => [point[0], point[1], point[2], point[3]]);
    count += 1;
    if (count >= limit) break;
  }
  res.json({ success: true, fields: ["lon", "lat", "alt", "time"], trails: result, count, updatedAt: new Date().toISOString() });
});

router.get("/flights/airports", async (req, res) => {
  const cache = await loadAirports();
  if (!cache.rows.length) return res.status(502).json({ success: false, message: `The airport list could not be loaded from ${SOURCES.ourairports.name}. ${cache.error || "The file was empty."}` });
  res.json({ success: true, fields: ["icao", "iata", "name", "lat", "lon", "size", "country", "city"], rows: cache.rows, count: cache.rows.length, source: SOURCES.ourairports.attribution, updatedAt: new Date(cache.at).toISOString() });
});

router.get("/flights/reference", async (req, res) => {
  const airlines = await loadAirlines();
  const codes = new Set();
  const types = new Set();
  const airportCodes = new Map();
  for (const entry of aircraft.values()) {
    if (entry.al) codes.add(entry.al);
    if (entry.type) types.add(entry.type);
    const route = entry.flight ? freshRoute(entry.flight) : null;
    if (route && route.known) for (const airport of route.airports) if (airport.icao && !airportCodes.has(airport.icao)) airportCodes.set(airport.icao, airport);
  }
  res.json({
    success: true,
    airlines: Object.fromEntries(Array.from(codes).map((code) => [code, airlines.map.get(code) || [null, null]])),
    types: Object.fromEntries(Array.from(types).map((type) => [type, typeDescriptions.get(type) || null])),
    airports: Object.fromEntries(Array.from(airportCodes.entries()).map(([code, airport]) => [code, [airport.name, airport.iata, airport.location, airport.country, airport.lat, airport.lon]])),
    airlineSource: airlines.error ? null : SOURCES.airlines.attribution,
    airlineError: airlines.error,
    routes: { ...routeStatus, cached: routeCache.size },
    updatedAt: new Date().toISOString()
  });
});

router.get("/flights/lookup", async (req, res) => {
  const field = String(req.query.field || "");
  const value = String(req.query.value || "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
  if (!SOURCES.adsblol.lookups[field] || value.length < 2) return res.status(400).json({ success: false, message: "Choose callsign, registration, or type and enter at least two characters." });
  if (sourceStatus.adsblol.cooldownUntil > Date.now()) return res.status(503).json({ success: false, message: `The worldwide lookup is paused until ${new Date(sourceStatus.adsblol.cooldownUntil).toLocaleTimeString("en-US")} because adsb.lol asked us to slow down.` });
  markActive();
  try {
    const reports = await hostQueues.adsblol.schedule(async () => {
      sourceStatus.adsblol.requests += 1;
      const { data } = await httpGet(fill(SOURCES.adsblol.lookups[field], { value }), SOURCES.adsblol.timeoutMs);
      return parseReadsb(data);
    }, 0);
    mergeReports(reports, "adsblol");
    const rows = reports.map((report) => aircraft.get(report.hex)).filter(Boolean).map(toRow);
    res.json({ success: true, fields: SNAPSHOT_FIELDS, rows, count: rows.length });
  } catch (error) {
    noteFailure("adsblol", error, cooldownFor("adsblol", error));
    res.status(502).json({ success: false, message: `The worldwide lookup failed. ${errorMessage(error)}` });
  }
});

router.get("/flights/health", (req, res) => {
  const sources = sourcesPayload();
  const enabled = Object.values(sources).filter((source) => source.enabled);
  const failing = enabled.filter((source) => source.lastError).length;
  res.json({
    success: true,
    status: failing === 0 ? "OPERATIONAL" : failing === enabled.length ? "DOWN" : "DEGRADED",
    tracked: aircraft.size,
    version,
    epoch: EPOCH,
    active: Date.now() < activeUntil,
    regions: SOURCES.sweep.regions.map((region) => { const indexes = SWEEP_TILES.map((tile, index) => (tile.region === region.name ? index : -1)).filter((index) => index >= 0); const recent = indexes.filter((index) => SWEEP_KEYS.some((sourceKey) => { const stats = tileStats.get(`${sourceKey}:${index}`); return stats && Date.now() - stats.at < SOURCES.retention.staleSeconds * 1000; })); return { name: region.name, tiles: indexes.length, sweptRecently: recent.length, aircraft: indexes.reduce((sum, index) => sum + SWEEP_KEYS.reduce((best, sourceKey) => Math.max(best, (tileStats.get(`${sourceKey}:${index}`) || { count: 0 }).count), 0), 0) }; }),
    sweep: { tiles: SWEEP_TILES.length, quiet: Array.from(tileStats.entries()).filter(([tileKey, stats]) => tileKey.startsWith("adsbfi:") && stats.count < SOURCES.sweep.quietThreshold && Date.now() - stats.at < SOURCES.sweep.quietRevisitMinutes * 60000).length, cursor: { ...sweepCursor }, focus: focus.expiresAt >= Date.now() ? focus.tiles.length : 0 },
    sources,
    uptimeSeconds: Math.floor(process.uptime())
  });
});

loadState();
const stateTimer = setInterval(saveState, SOURCES.retention.stateSaveSeconds * 1000);
if (stateTimer.unref) stateTimer.unref();
if (SOURCES.sweep.alwaysOn) markActive();

module.exports = router;

module.exports.trafficCensus = async () => {
  await ensureFresh();
  const stats = buildStats();
  return { ...stats, squawks: squawkPayload(), sources: sourcesPayload() };
};