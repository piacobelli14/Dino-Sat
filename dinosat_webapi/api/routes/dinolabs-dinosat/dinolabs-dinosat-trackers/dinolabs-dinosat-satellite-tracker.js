const express = require("express");
const axios = require("axios");
const v8 = require("v8");
const router = express.Router();

const EARTH_RADIUS_KM = 6371;
const EARTH_GM = 398600.4418;

const CELESTRAK_CONTACT_EMAIL = process.env.CELESTRAK_CONTACT_EMAIL || "set-CELESTRAK_CONTACT_EMAIL-env-var";

const AXIOS_CONFIG = {
  timeout: 20000,
  headers: {
    "User-Agent": `DinoSat-Research/4.0 (+contact: ${CELESTRAK_CONTACT_EMAIL})`,
    "Accept": "text/plain, application/json, */*",
    "Accept-Encoding": "gzip, deflate"
  }
};

const OBSERVATION_AXIOS_TIMEOUT_MS = 5000;

const SPACETRACK_BASE = "https://www.space-track.org";
const SPACETRACK_USER = process.env.SPACETRACK_USER || "";
const SPACETRACK_PASS = process.env.SPACETRACK_PASS || "";
const SPACETRACK_ENABLED = !!(SPACETRACK_USER && SPACETRACK_PASS);

const CACHE_DURATION = 2 * 60 * 60 * 1000 + 5 * 60 * 1000;
const SPACE_WEATHER_TTL = 5 * 60 * 1000;
const GEMINI_TTL = 24 * 60 * 60 * 1000;
const OBSERVATION_TTL = 30 * 60 * 1000;
const PANEL_AI_TTL = 30 * 60 * 1000;
const GEMINI_CACHE_MAX_ENTRIES = 500;
const OBSERVATION_CACHE_MAX_ENTRIES = 500;
const GEMINI_STAGE_TIMEOUT_MS = 25000;

const FETCH_CONCURRENCY = 8;
const FETCH_MAX_RETRIES = 2;
const FETCH_RETRY_BASE_MS = 500;
const FETCH_RETRY_CAP_MS = 3000;

const MEMORY_SAMPLE_WINDOW = 64;
const MEMORY_ROW_CHECK_STRIDE = 500;
const MEMORY_PROJECTION_SIGMA = 2;

const DECAY_WATCH_ALTITUDE_CEILING_KM = 800;
const DECAY_WATCH_HIGH_CONFIDENCE_CEILING_KM = 450;

const CATEGORY_COLORS = {
  "LEO": "#4ECDC4",
  "MEO": "#FF9500",
  "GEO": "#FF6B6B",
  "HEO": "#FFE66D",
  "Deep Space": "#A8E6CF",
  "Starlink": "#00D4FF",
  "OneWeb": "#FF4081",
  "Military": "#FFA726",
  "Weather": "#66BB6A",
  "Communication": "#AB47BC",
  "Navigation": "#42A5F5",
  "Scientific": "#EF5350",
  "Debris": "#808080",
  "CubeSat": "#E91E63",
  "Amateur": "#9C27B0",
  "Earth Observation": "#00BCD4",
  "Spy/Reconnaissance": "#FF5722"
};

const ENDPOINTS = [
  { url: "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle", name: "Active Catalog" }
];

const SPACE_WEATHER_SOURCES = {
  kpIndex: "https://services.swpc.noaa.gov/json/planetary_k_index_1m.json",
  f107Flux: "https://services.swpc.noaa.gov/json/f107_cm_flux.json",
  solarWindPlasma: "https://services.swpc.noaa.gov/products/solar-wind/plasma-1-day.json",
  solarWindMag: "https://services.swpc.noaa.gov/products/solar-wind/mag-1-day.json",
  alerts: "https://services.swpc.noaa.gov/products/alerts.json",
  geoStorm: "https://services.swpc.noaa.gov/products/noaa-scales.json",
  xrayFlares: "https://services.swpc.noaa.gov/json/goes/primary/xrays-6-hour.json",
  protonFlux: "https://services.swpc.noaa.gov/json/goes/primary/integral-protons-6-hour.json",
  electronFlux: "https://services.swpc.noaa.gov/json/goes/primary/integral-electrons-1-day.json",
  auroraForecast: "https://services.swpc.noaa.gov/text/aurora-nowcast-hemi-power.txt",
  solarRegions: "https://services.swpc.noaa.gov/json/solar_regions.json",
  cmeAnalysis: "https://services.swpc.noaa.gov/json/donki/cme-analysis.json"
};

const GROUND_TRACK_CITIES = [
  { name: "New York", lat: 40.71, lon: -74.01 },
  { name: "London", lat: 51.51, lon: -0.13 },
  { name: "Tokyo", lat: 35.68, lon: 139.69 },
  { name: "Sydney", lat: -33.87, lon: 151.21 },
  { name: "São Paulo", lat: -23.55, lon: -46.63 },
  { name: "Cape Town", lat: -33.92, lon: 18.42 },
  { name: "Mumbai", lat: 19.08, lon: 72.88 },
  { name: "Cairo", lat: 30.04, lon: 31.24 },
  { name: "Los Angeles", lat: 34.05, lon: -118.24 },
  { name: "Singapore", lat: 1.35, lon: 103.82 },
  { name: "Anchorage", lat: 61.22, lon: -149.90 },
  { name: "Moscow", lat: 55.75, lon: 37.62 },
  { name: "Buenos Aires", lat: -34.61, lon: -58.38 },
  { name: "Beijing", lat: 39.90, lon: 116.41 },
  { name: "Houston", lat: 29.76, lon: -95.37 },
  { name: "Denver", lat: 39.74, lon: -104.99 },
  { name: "Chicago", lat: 41.88, lon: -87.63 },
  { name: "Miami", lat: 25.76, lon: -80.19 },
  { name: "Mexico City", lat: 19.43, lon: -99.13 },
  { name: "Lima", lat: -12.05, lon: -77.04 },
  { name: "Bogotá", lat: 4.71, lon: -74.07 },
  { name: "Lagos", lat: 6.52, lon: 3.38 },
  { name: "Nairobi", lat: -1.29, lon: 36.82 },
  { name: "Dubai", lat: 25.20, lon: 55.27 },
  { name: "Delhi", lat: 28.61, lon: 77.21 },
  { name: "Bangkok", lat: 13.76, lon: 100.50 },
  { name: "Shanghai", lat: 31.23, lon: 121.47 },
  { name: "Seoul", lat: 37.57, lon: 126.98 },
  { name: "Jakarta", lat: -6.21, lon: 106.85 },
  { name: "Paris", lat: 48.86, lon: 2.35 },
  { name: "Berlin", lat: 52.52, lon: 13.41 },
  { name: "Istanbul", lat: 41.01, lon: 28.98 },
  { name: "Johannesburg", lat: -26.20, lon: 28.04 },
  { name: "Perth", lat: -31.95, lon: 115.86 },
  { name: "Auckland", lat: -36.85, lon: 174.76 },
  { name: "Honolulu", lat: 21.31, lon: -157.86 },
  { name: "Reykjavik", lat: 64.15, lon: -21.94 },
  { name: "Santiago", lat: -33.45, lon: -70.67 },
  { name: "Vancouver", lat: 49.28, lon: -123.12 },
  { name: "Toronto", lat: 43.65, lon: -79.38 }
];

class AdaptiveMemoryGuard {
  constructor() {
    this.deltaSamples = [];
    this.maxSamples = MEMORY_SAMPLE_WINDOW;
    this.beginMark = process.memoryUsage().heapUsed;
    this.haltedQueries = [];
    this.haltedRowsTotal = 0;
    this.gcTriggeredCount = 0;
    this.lastGCBytesFreed = 0;
    this.peakHeapUsedBytes = this.beginMark;
    this.createdAt = Date.now();
  }

  beginBatch() {
    this.beginMark = process.memoryUsage().heapUsed;
  }

  endBatch() {
    const now = process.memoryUsage().heapUsed;
    if (now > this.peakHeapUsedBytes) {
      this.peakHeapUsedBytes = now;
    }
    const delta = now - this.beginMark;
    if (delta > 0) {
      this.deltaSamples.push(delta);
      if (this.deltaSamples.length > this.maxSamples) {
        this.deltaSamples.shift();
      }
    }
    this.beginMark = now;
  }

  tryGC() {
    if (typeof global.gc !== "function") {
      return 0;
    }
    const before = process.memoryUsage().heapUsed;
    try {
      global.gc();
    } catch (error) {
      return 0;
    }
    const after = process.memoryUsage().heapUsed;
    const freed = Math.max(0, before - after);
    this.lastGCBytesFreed = freed;
    this.gcTriggeredCount++;
    this.beginMark = after;
    return freed;
  }

  projectedNextBatch() {
    if (this.deltaSamples.length === 0) {
      return 0;
    }
    const sum = this.deltaSamples.reduce((a, b) => a + b, 0);
    const mean = sum / this.deltaSamples.length;
    const variance = this.deltaSamples.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / this.deltaSamples.length;
    const stdDev = Math.sqrt(variance);
    const peak = Math.max(...this.deltaSamples);
    return Math.max(peak, mean + MEMORY_PROJECTION_SIGMA * stdDev);
  }

  canIngestMore() {
    const mem = process.memoryUsage();
    const heap = v8.getHeapStatistics();
    const limit = heap.heap_size_limit;
    const external = mem.external || 0;
    const projected = this.projectedNextBatch();
    if (projected === 0) {
      const reserveForGrowth = Math.max(mem.heapTotal - mem.heapUsed, external);
      return (mem.heapUsed + reserveForGrowth) < limit;
    }
    const safetyMargin = projected + external;
    return (mem.heapUsed + safetyMargin) < limit;
  }

  recordHaltedQuery(queryName, rowsAccepted, rowsRemaining) {
    const mem = process.memoryUsage();
    const heap = v8.getHeapStatistics();
    this.haltedQueries.push({
      query: queryName,
      rowsAccepted: rowsAccepted,
      rowsRemaining: rowsRemaining,
      heapUsedAtHaltBytes: mem.heapUsed,
      heapLimitBytes: heap.heap_size_limit,
      atFraction: heap.heap_size_limit > 0 ? mem.heapUsed / heap.heap_size_limit : 0
    });
    if (rowsRemaining > 0) {
      this.haltedRowsTotal += rowsRemaining;
    }
  }

  snapshot() {
    const mem = process.memoryUsage();
    const heap = v8.getHeapStatistics();
    const limit = heap.heap_size_limit;
    return {
      heapUsedBytes: mem.heapUsed,
      heapTotalBytes: mem.heapTotal,
      heapLimitBytes: limit,
      externalBytes: mem.external || 0,
      rssBytes: mem.rss,
      usedFraction: limit > 0 ? mem.heapUsed / limit : 0,
      availableBytes: Math.max(0, limit - mem.heapUsed),
      projectedNextBatchBytes: this.projectedNextBatch(),
      sampleCount: this.deltaSamples.length,
      haltedQueries: this.haltedQueries.slice(),
      haltedRowsTotal: this.haltedRowsTotal,
      peakHeapUsedBytes: this.peakHeapUsedBytes,
      gcTriggeredCount: this.gcTriggeredCount,
      lastGCBytesFreedBytes: this.lastGCBytesFreed,
      gcAvailable: typeof global.gc === "function",
      ageMs: Date.now() - this.createdAt
    };
  }
}

let lastMemorySnapshot = null;

let satelliteCache = null;
let cacheTimestamp = null;
let inflightFetch = null;
let partialAccumulation = [];
const fetchSubscribers = new Set();

let spaceWeatherCache = null;
let spaceWeatherTimestamp = null;
let inflightSpaceWeather = null;

const geminiCache = new Map();
const observationCache = new Map();
const spaceWeatherAICache = { data: null, timestamp: 0 };

let spacetrackCookie = null;
let spacetrackCookieExpiresMs = 0;

const spacetrackBreaker = {
  state: "closed",
  consecutiveFailures: 0,
  failureThreshold: 3,
  openedAtMs: 0,
  cooldownMs: 5 * 60 * 1000,
  halfOpenAfterMs: 60 * 1000,
  lastError: null,
  lastSuccessMs: 0,
  totalRequests: 0,
  totalFailures: 0
};

const delay = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

const breakerCanCall = (breaker) => {
  if (breaker.state === "closed") {
    return true;
  }
  const now = Date.now();
  if (breaker.state === "open") {
    if (now - breaker.openedAtMs >= breaker.cooldownMs) {
      breaker.state = "half-open";
      return true;
    }
    return false;
  }
  if (breaker.state === "half-open") {
    return true;
  }
  return false;
};

const breakerOnSuccess = (breaker) => {
  breaker.consecutiveFailures = 0;
  breaker.state = "closed";
  breaker.lastSuccessMs = Date.now();
  breaker.lastError = null;
};

const breakerOnFailure = (breaker, error) => {
  breaker.consecutiveFailures++;
  breaker.totalFailures++;
  breaker.lastError = error?.message || String(error);
  if (breaker.state === "half-open") {
    breaker.state = "open";
    breaker.openedAtMs = Date.now();
    return;
  }
  if (breaker.consecutiveFailures >= breaker.failureThreshold) {
    breaker.state = "open";
    breaker.openedAtMs = Date.now();
  }
};

const cacheSet = (cache, key, value, maxEntries) => {
  if (cache.size >= maxEntries) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) {
      cache.delete(oldestKey);
    }
  }
  cache.set(key, value);
};

const sanitizeMarkdown = (text) => {
  if (typeof text !== "string") {
    return text;
  }
  let cleaned = text;
  cleaned = cleaned.replace(/\*\*\*([^*]+)\*\*\*/g, "$1");
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, "$1");
  cleaned = cleaned.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s.,;:!?)]|$)/g, "$1$2");
  cleaned = cleaned.replace(/__([^_]+)__/g, "$1");
  cleaned = cleaned.replace(/`([^`]+)`/g, "$1");
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, "");
  cleaned = cleaned.replace(/\s+\n/g, "\n");
  cleaned = cleaned.trim();
  return cleaned;
};

const sanitizeStringFields = (obj) => {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (typeof obj === "string") {
    return sanitizeMarkdown(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeStringFields(item));
  }
  if (typeof obj === "object") {
    const out = {};
    for (const k of Object.keys(obj)) {
      out[k] = sanitizeStringFields(obj[k]);
    }
    return out;
  }
  return obj;
};

const normalizeStringArray = (value) => {
  if (!value) {
    return [];
  }
  if (!Array.isArray(value)) {
    if (typeof value === "string") {
      return [sanitizeMarkdown(value)];
    }
    if (typeof value === "object") {
      return [JSON.stringify(value)];
    }
    return [String(value)];
  }
  return value.map(item => {
    if (typeof item === "string") {
      return sanitizeMarkdown(item);
    }
    if (item && typeof item === "object") {
      const text = item.action || item.description || item.text || item.name || JSON.stringify(item);
      return sanitizeMarkdown(text);
    }
    return String(item);
  });
};

const normalizeImpactArray = (value) => {
  if (!value || !Array.isArray(value)) {
    return [];
  }
  return value.map(item => {
    if (!item || typeof item !== "object") {
      return { regime: "Unknown", impact: String(item || ""), severity: "Low" };
    }
    return {
      regime: sanitizeMarkdown(item.regime || item.domain || item.name || "Unknown"),
      impact: sanitizeMarkdown(item.impact || item.description || item.text || ""),
      severity: sanitizeMarkdown(item.severity || "Low")
    };
  });
};

const normalizeEventsArray = (value) => {
  if (!value || !Array.isArray(value)) {
    return [];
  }
  return value.map(item => {
    if (!item || typeof item !== "object") {
      return { date: "Unknown", event: String(item || "") };
    }
    return {
      date: sanitizeMarkdown(item.date || item.year || item.time || "Unknown"),
      event: sanitizeMarkdown(item.event || item.description || item.text || "")
    };
  });
};

const normalizeMissionIntelligence = (parsed) => {
  if (!parsed || typeof parsed !== "object") {
    return parsed;
  }
  const out = sanitizeStringFields(parsed);
  if (out.instruments !== undefined) {
    out.instruments = normalizeStringArray(out.instruments);
  }
  if (out.notableEvents !== undefined) {
    out.notableEvents = normalizeEventsArray(out.notableEvents);
  }
  return out;
};

const normalizeSpaceWeatherReport = (parsed) => {
  if (!parsed || typeof parsed !== "object") {
    return parsed;
  }
  const out = sanitizeStringFields(parsed);
  if (out.satelliteImpacts !== undefined) {
    out.satelliteImpacts = normalizeImpactArray(out.satelliteImpacts);
  }
  if (out.recommendedActions !== undefined) {
    out.recommendedActions = normalizeStringArray(out.recommendedActions);
  }
  return out;
};

const safeJsonParse = (text) => {
  if (!text) {
    return null;
  }
  let cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  try {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.substring(start, end + 1));
    }
  } catch (error) {
  }
  try {
    return JSON.parse(cleaned);
  } catch (error) {
    return null;
  }
};

const validateTLEChecksum = (line) => {
  if (!line || line.length < 69) {
    return false;
  }
  let checksum = 0;
  for (let j = 0; j < 68; j++) {
    const char = line.charAt(j);
    if (char >= "0" && char <= "9") {
      checksum += parseInt(char);
    } else if (char === "-") {
      checksum += 1;
    }
  }
  const expectedChecksum = parseInt(line.charAt(68));
  return (checksum % 10) === expectedChecksum;
};

const computeTLEEpoch = (line1) => {
  try {
    const epochYear = parseInt(line1.substring(18, 20));
    const epochDay = parseFloat(line1.substring(20, 32));
    const fullYear = epochYear < 57 ? 2000 + epochYear : 1900 + epochYear;
    const yearStart = new Date(Date.UTC(fullYear, 0, 1));
    const epochMs = yearStart.getTime() + (epochDay - 1) * 86400000;
    return new Date(epochMs);
  } catch (error) {
    return null;
  }
};

const computeBSTAR = (line1) => {
  try {
    const bstarRaw = line1.substring(53, 61);
    if (!bstarRaw || bstarRaw.length < 8) {
      return 0;
    }
    const sign = bstarRaw[0] === "-" ? -1 : 1;
    const mantissaField = bstarRaw.substring(1, 6).trim();
    if (!mantissaField) {
      return 0;
    }
    const mantissa = parseFloat("0." + mantissaField);
    const exponentField = bstarRaw.substring(6, 8).trim();
    const exponent = parseInt(exponentField, 10);
    if (!Number.isFinite(mantissa) || !Number.isFinite(exponent)) {
      return 0;
    }
    return sign * mantissa * Math.pow(10, exponent);
  } catch (error) {
    return 0;
  }
};

const processOrbitalParameters = (line2, line1) => {
  try {
    const meanMotion = parseFloat(line2.substring(52, 63));
    const eccentricity = parseFloat("0." + line2.substring(26, 33));
    const inclination = parseFloat(line2.substring(8, 16));

    if (!Number.isFinite(meanMotion) || !Number.isFinite(eccentricity) || !Number.isFinite(inclination) || meanMotion <= 0) {
      return null;
    }

    const semiMajorAxis = Math.pow(EARTH_GM / Math.pow(meanMotion * 2 * Math.PI / 86400, 2), 1 / 3);
    const altitude = semiMajorAxis - EARTH_RADIUS_KM;
    const period = (2 * Math.PI * Math.sqrt(Math.pow(semiMajorAxis * 1000, 3) / 398600441800000)) / 60;

    if (altitude < 100 || altitude > 100000 || period <= 0) {
      return null;
    }

    const epochDate = computeTLEEpoch(line1);
    const bstar = computeBSTAR(line1);

    return {
      altitude,
      period,
      eccentricity,
      inclination,
      meanMotion,
      epochDate,
      bstar
    };
  } catch (error) {
    return null;
  }
};

const classifySatellite = (altitude, inclination, eccentricity, period, name = "", source = "") => {
  const lowerName = name.toLowerCase();
  const lowerSource = source.toLowerCase();

  if (lowerName.includes("deb") || lowerName.includes("debris") ||
      lowerSource.includes("debris") || lowerName.includes(" r/b") ||
      lowerName.includes("rocket body") || lowerName.includes("object")) {
    return "Debris";
  }

  if (altitude > 100000) return "Deep Space";
  if (eccentricity > 0.25 && altitude > 500) return "HEO";
  if (altitude > 35000 && altitude < 36000 && eccentricity < 0.01) return "GEO";
  if (altitude > 35000) return "GEO";
  if (altitude > 2000 && altitude < 35000) return "MEO";
  if (altitude < 2000) return "LEO";
  return "LEO";
};

const inferGroup = (name, source) => {
  const lowerName = name.toLowerCase();
  const lowerSource = source.toLowerCase();

  if (lowerName.includes("starlink")) return "Starlink";
  if (lowerName.includes("oneweb")) return "OneWeb";
  if (lowerName.includes("deb") || lowerName.includes("debris") || lowerName.includes(" r/b")) return "Debris";
  if (lowerName.includes("cosmos") || lowerName.includes("kosmos")) return "COSMOS";
  if (lowerName.includes("molniya")) return "Molniya";
  if (lowerName.includes("goes")) return "GOES";
  if (lowerName.includes("noaa")) return "NOAA";
  if (lowerName.includes("gps") || lowerName.includes("navstar")) return "GPS";
  if (lowerName.includes("glonass")) return "GLONASS";
  if (lowerName.includes("galileo")) return "Galileo";
  if (lowerName.includes("beidou")) return "Beidou";
  if (lowerName.includes("intelsat")) return "Intelsat";
  if (lowerName.includes("ses ")) return "SES";
  if (lowerName.includes("iridium")) return "Iridium";
  if (lowerName.includes("orbcomm")) return "Orbcomm";
  if (lowerName.includes("globalstar")) return "Globalstar";
  if (lowerName.includes("planet") || lowerName.includes("dove") || lowerName.includes("flock")) return "Planet Labs";
  if (lowerName.includes("spire") || lowerName.includes("lemur")) return "Spire";
  if (lowerName.includes("swarm")) return "Swarm";
  if (lowerName.includes("amsat") || lowerName.includes("oscar")) return "Amateur Radio";
  if (lowerName.includes("usa ") || lowerName.includes("nrol")) return "Military";
  if (lowerName.includes("meteo") || lowerName.includes("metop") || lowerName.includes("dmsp")) return "Weather";
  if (lowerName.includes("hubble") || lowerName.includes("chandra") || lowerName.includes("fermi")) return "Scientific";
  if (lowerName.includes("lageos") || lowerName.includes("starlette")) return "Geodetic";
  if (lowerName.includes("inmarsat")) return "Inmarsat";
  if (lowerName.includes("telesat")) return "Telesat";
  if (lowerName.includes("eutelsat")) return "Eutelsat";
  if (lowerName.includes("cospas") || lowerSource.includes("sarsat")) return "Search & Rescue";
  if (lowerName.includes("tdrs")) return "TDRSS";
  if (lowerName.includes("iss") || lowerName.includes("zarya") || lowerName.includes("tiangong")) return "Space Station";
  if (lowerName.includes("sentinel") || lowerName.includes("landsat") || lowerName.includes("worldview")) return "Earth Observation";

  return "General";
};

const classifyKpIndex = (kp) => {
  if (kp < 4) return { level: "G0", label: "Quiet", color: "#5a7068", severity: 0 };
  if (kp < 5) return { level: "G0", label: "Unsettled", color: "#7a8a5a", severity: 1 };
  if (kp < 6) return { level: "G1", label: "Minor Storm", color: "#9a9a4a", severity: 2 };
  if (kp < 7) return { level: "G2", label: "Moderate Storm", color: "#c08040", severity: 3 };
  if (kp < 8) return { level: "G3", label: "Strong Storm", color: "#d06030", severity: 4 };
  if (kp < 9) return { level: "G4", label: "Severe Storm", color: "#e04020", severity: 5 };
  return { level: "G5", label: "Extreme Storm", color: "#ff2020", severity: 6 };
};

const classifyF107 = (flux) => {
  if (flux < 70) return { label: "Very Low", color: "#5a7068", impact: "Minimal drag perturbation on LEO satellites." };
  if (flux < 100) return { label: "Low", color: "#7a8a5a", impact: "Standard atmospheric drag on LEO platforms." };
  if (flux < 150) return { label: "Moderate", color: "#9a9a4a", impact: "Increased drag, watch decay-prone objects." };
  if (flux < 200) return { label: "High", color: "#c08040", impact: "Significant drag uplift, expect maneuver needs on LEO." };
  return { label: "Very High", color: "#e04020", impact: "Extreme drag environment, station-keeping required." };
};

const classifySolarWind = (speedKmS) => {
  if (speedKmS < 350) return { label: "Slow", color: "#5a7068", category: "ambient" };
  if (speedKmS < 500) return { label: "Normal", color: "#7a8a5a", category: "ambient" };
  if (speedKmS < 700) return { label: "Elevated", color: "#9a9a4a", category: "stream" };
  if (speedKmS < 900) return { label: "High", color: "#c08040", category: "shock" };
  return { label: "Extreme", color: "#e04020", category: "cme" };
};

const computeF107Multiplier = (f107Value) => {
  if (!Number.isFinite(f107Value) || f107Value <= 0) {
    return 1.0;
  }
  const baseline = 100;
  const multiplier = Math.pow(f107Value / baseline, 1.35);
  return Math.max(0.7, Math.min(2.0, multiplier));
};

const computeEquationOfEquinoxesDeg = (jd) => {
  const tCenturies = (jd - 2451545.0) / 36525.0;
  const omegaMoon = (125.04452 - 1934.136261 * tCenturies) * Math.PI / 180.0;
  const sunMeanLongitude = (280.4665 + 36000.7698 * tCenturies) * Math.PI / 180.0;
  const obliquityRad = (23.4393 - 0.0130042 * tCenturies) * Math.PI / 180.0;
  const deltaPsiArcsec = -17.20 * Math.sin(omegaMoon) - 1.32 * Math.sin(2 * sunMeanLongitude);
  return (deltaPsiArcsec * Math.cos(obliquityRad)) / 3600.0;
};

const parseTLEDataFull = (tleText, source, memoryGuard) => {
  const lines = tleText.split("\n").filter(line => line.trim());
  const satellites = [];
  const totalTriplets = Math.floor(lines.length / 3);

  for (let i = 0; i < lines.length; i += 3) {
    if (i + 2 >= lines.length) {
      break;
    }

    if (memoryGuard && (satellites.length % MEMORY_ROW_CHECK_STRIDE) === 0 && satellites.length > 0) {
      memoryGuard.endBatch();
      if (!memoryGuard.canIngestMore()) {
        memoryGuard.tryGC();
        if (!memoryGuard.canIngestMore()) {
          const remaining = totalTriplets - Math.floor(i / 3);
          memoryGuard.recordHaltedQuery(source, satellites.length, remaining);
          break;
        }
      }
      memoryGuard.beginBatch();
    }

    try {
      const name = lines[i].trim();
      const line1 = lines[i + 1];
      const line2 = lines[i + 2];

      if (!line1 || !line2 || line1.length < 69 || line2.length < 69) continue;
      if (!line1.startsWith("1 ") || !line2.startsWith("2 ")) continue;
      if (!validateTLEChecksum(line1) || !validateTLEChecksum(line2)) continue;

      const noradId = parseInt(line1.substring(2, 7));
      if (!Number.isFinite(noradId)) continue;

      const orbitalParams = processOrbitalParameters(line2, line1);
      if (!orbitalParams) continue;

      const category = classifySatellite(
        orbitalParams.altitude,
        orbitalParams.inclination,
        orbitalParams.eccentricity,
        orbitalParams.period,
        name,
        source
      );
      const color = CATEGORY_COLORS[category] || "#FFFFFF";
      const group = inferGroup(name, source);

      const tleAgeDays = orbitalParams.epochDate
        ? (Date.now() - orbitalParams.epochDate.getTime()) / 86400000
        : null;

      satellites.push({
        id: `sat_${noradId}`,
        name: name,
        noradId: noradId,
        category: category,
        group: group,
        altitude: Math.round(orbitalParams.altitude * 10) / 10,
        period: Math.round(orbitalParams.period * 100) / 100,
        inclination: Math.round(orbitalParams.inclination * 100) / 100,
        eccentricity: Math.round(orbitalParams.eccentricity * 1000000) / 1000000,
        status: "Active",
        color: color,
        active: false,
        source: source,
        hasTLE: true,
        propagationModel: orbitalParams.period > 225 ? "SDP4" : "SGP4",
        tleEpoch: orbitalParams.epochDate ? orbitalParams.epochDate.toISOString() : null,
        tleAgeDays: tleAgeDays !== null ? Math.round(tleAgeDays * 100) / 100 : null,
        bstar: orbitalParams.bstar,
        tle: {
          line1: line1,
          line2: line2
        }
      });
    } catch (error) {
      continue;
    }
  }

  return satellites;
};

const fetchWithRetry = async (url, config, name) => {
  let lastError;
  for (let attempt = 1; attempt <= FETCH_MAX_RETRIES; attempt++) {
    try {
      const response = await axios.get(url, config);
      return response;
    } catch (error) {
      const status = error.response?.status;
      lastError = error;

      if (status === 403 || status === 404 || status === 429) {
        break;
      }
      if (attempt === FETCH_MAX_RETRIES) {
        break;
      }
      const waitTime = Math.min(FETCH_RETRY_BASE_MS * Math.pow(2, attempt - 1), FETCH_RETRY_CAP_MS);
      await delay(waitTime);
    }
  }
  throw lastError;
};

const runWithConcurrency = async (tasks, limit) => {
  const results = new Array(tasks.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    while (true) {
      const i = nextIndex++;
      if (i >= tasks.length) {
        break;
      }
      results[i] = await tasks[i]();
    }
  });
  await Promise.all(workers);
  return results;
};

const spacetrackLogin = async () => {
  if (!SPACETRACK_ENABLED) {
    throw new Error("Space-Track is not configured.");
  }
  if (spacetrackCookie && Date.now() < spacetrackCookieExpiresMs) {
    return spacetrackCookie;
  }
  const body = new URLSearchParams();
  body.append("identity", SPACETRACK_USER);
  body.append("password", SPACETRACK_PASS);
  const r = await axios.post(
    `${SPACETRACK_BASE}/ajaxauth/login`,
    body.toString(),
    {
      timeout: 20000,
      headers: {
        ...AXIOS_CONFIG.headers,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      maxRedirects: 0,
      validateStatus: (s) => s === 200 || s === 302
    }
  );
  const setCookie = r.headers["set-cookie"];
  if (!setCookie || setCookie.length === 0) {
    throw new Error("Space-Track login returned no session cookie.");
  }
  spacetrackCookie = setCookie.map(c => c.split(";")[0]).join("; ");
  spacetrackCookieExpiresMs = Date.now() + 60 * 60 * 1000;
  return spacetrackCookie;
};

const fetchSpacetrackCatalog = async () => {
  const cookie = await spacetrackLogin();
  const url = `${SPACETRACK_BASE}/basicspacedata/query/class/gp/decay_date/null-val/epoch/%3Enow-30/orderby/norad_cat_id/format/3le`;
  const r = await axios.get(url, {
    timeout: 60000,
    headers: { ...AXIOS_CONFIG.headers, Cookie: cookie },
    responseType: "text",
    transformResponse: [(data) => data]
  });
  return (r.data || "").replace(/\r\n/g, "\n").replace(/^0 /gm, "");
};

const doFetchSpacetrack = async (callbacks = {}) => {
  const { onBatch, onProgress, onError } = callbacks;
  const overallStart = Date.now();
  const memoryGuard = new AdaptiveMemoryGuard();

  spacetrackBreaker.totalRequests++;

  if (!breakerCanCall(spacetrackBreaker)) {
    const remainMs = Math.max(0, spacetrackBreaker.cooldownMs - (Date.now() - spacetrackBreaker.openedAtMs));
    const remainSec = Math.round(remainMs / 1000);
    const errMsg = `Space-Track circuit breaker is open after ${spacetrackBreaker.consecutiveFailures} prior failures, retry in ~${remainSec}s.`;
    if (onError) {
      try { onError("Space-Track GP", errMsg); } catch (error) {}
    }
    if (onProgress) {
      try { onProgress({ completed: 1, total: 1, successful: 0 }); } catch (error) {}
    }
    return {
      success: false,
      satellites: [],
      errors: [errMsg],
      metadata: {
        totalSources: 1,
        successfulSources: 0,
        totalSatellites: 0,
        cached: false,
        provider: "Space-Track",
        loadTimeMs: Date.now() - overallStart,
        circuitBreakerOpen: true
      }
    };
  }

  if (onProgress) {
    try { onProgress({ completed: 0, total: 1, successful: 0 }); } catch (error) {}
  }

  try {
    const tleText = await fetchSpacetrackCatalog();
    memoryGuard.beginBatch();
    const satellites = parseTLEDataFull(tleText, "Space-Track GP", memoryGuard);
    memoryGuard.endBatch();
    satellites.sort((a, b) => a.name.localeCompare(b.name));
    if (satellites.length > 0 && onBatch) {
      try { onBatch(satellites, "Space-Track GP"); } catch (error) {}
    }
    if (onProgress) {
      try { onProgress({ completed: 1, total: 1, successful: 1, memory: memoryGuard.snapshot() }); } catch (error) {}
    }
    breakerOnSuccess(spacetrackBreaker);
    lastMemorySnapshot = memoryGuard.snapshot();
    return {
      success: satellites.length > 0,
      satellites,
      errors: [],
      metadata: {
        totalSources: 1,
        successfulSources: 1,
        totalSatellites: satellites.length,
        cached: false,
        memoryOptimized: true,
        memoryAware: true,
        memory: lastMemorySnapshot,
        provider: "Space-Track",
        loadTimeMs: Date.now() - overallStart
      }
    };
  } catch (error) {
    breakerOnFailure(spacetrackBreaker, error);
    if (onError) {
      try { onError("Space-Track GP", error.message); } catch (error) {}
    }
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      spacetrackCookie = null;
      spacetrackCookieExpiresMs = 0;
    }
    lastMemorySnapshot = memoryGuard.snapshot();
    return {
      success: false,
      satellites: [],
      errors: [`Space-Track fetch failed: ${error.message}.`],
      metadata: {
        totalSources: 1,
        successfulSources: 0,
        totalSatellites: 0,
        cached: false,
        memoryAware: true,
        memory: lastMemorySnapshot,
        provider: "Space-Track",
        loadTimeMs: Date.now() - overallStart
      }
    };
  }
};

const doFetchAllSatellites = async (callbacks = {}) => {
  const { onBatch, onProgress, onError, isCancelled } = callbacks;

  const allSatellites = [];
  const errors = [];
  const seenNoradIds = new Set();
  let successfulSources = 0;
  let completed = 0;
  let memoryHaltedSources = 0;
  const overallStart = Date.now();
  const memoryGuard = new AdaptiveMemoryGuard();

  const tasks = ENDPOINTS.map(endpoint => async () => {
    if (isCancelled && isCancelled()) {
      return;
    }
    if (!memoryGuard.canIngestMore()) {
      memoryGuard.tryGC();
      if (!memoryGuard.canIngestMore()) {
        const msg = `Skipped ${endpoint.name} because the memory budget was exhausted before the fetch started.`;
        errors.push(msg);
        memoryGuard.recordHaltedQuery(endpoint.name, 0, -1);
        memoryHaltedSources++;
        if (onError) {
          try { onError(endpoint.name, "Memory budget exhausted before fetch."); } catch (error) {}
        }
        completed++;
        if (onProgress) {
          try { onProgress({ completed, total: ENDPOINTS.length, successful: successfulSources, memoryHaltedSources, memory: memoryGuard.snapshot() }); } catch (error) {}
        }
        return;
      }
    }
    try {
      const response = await fetchWithRetry(endpoint.url, AXIOS_CONFIG, endpoint.name);
      if (response.data && typeof response.data === "string") {
        memoryGuard.beginBatch();
        const satellites = parseTLEDataFull(response.data, endpoint.name, memoryGuard);
        memoryGuard.endBatch();
        const newOnes = [];
        for (const satellite of satellites) {
          if (!seenNoradIds.has(satellite.noradId)) {
            seenNoradIds.add(satellite.noradId);
            allSatellites.push(satellite);
            newOnes.push(satellite);
          }
        }
        successfulSources++;
        if (newOnes.length > 0 && onBatch) {
          try { onBatch(newOnes, endpoint.name); } catch (error) {}
        }
      }
    } catch (error) {
      const msg = `Failed to fetch ${endpoint.name}: ${error.message}.`;
      errors.push(msg);
      if (onError) {
        try { onError(endpoint.name, error.message); } catch (error) {}
      }
    } finally {
      completed++;
      memoryGuard.tryGC();
      if (onProgress) {
        try { onProgress({ completed, total: ENDPOINTS.length, successful: successfulSources, memoryHaltedSources, memory: memoryGuard.snapshot() }); } catch (error) {}
      }
    }
  });

  await runWithConcurrency(tasks, FETCH_CONCURRENCY);

  allSatellites.sort((a, b) => a.name.localeCompare(b.name));

  lastMemorySnapshot = memoryGuard.snapshot();

  return {
    success: allSatellites.length > 0,
    satellites: allSatellites,
    errors: errors,
    metadata: {
      totalSources: ENDPOINTS.length,
      successfulSources: successfulSources,
      memoryHaltedSources: memoryHaltedSources,
      totalSatellites: allSatellites.length,
      cached: false,
      memoryOptimized: true,
      memoryAware: true,
      memory: lastMemorySnapshot,
      loadTimeMs: Date.now() - overallStart
    }
  };
};

const startSharedFetch = () => {
  if (inflightFetch) {
    return inflightFetch;
  }
  partialAccumulation = [];

  const fetcher = SPACETRACK_ENABLED ? doFetchSpacetrack : doFetchAllSatellites;

  const promise = (async () => {
    return await fetcher({
      onBatch: (newOnes, source) => {
        partialAccumulation.push(...newOnes);
        for (const sub of fetchSubscribers) {
          try { if (sub.onBatch) sub.onBatch(newOnes, source); } catch (error) {}
        }
      },
      onProgress: (info) => {
        for (const sub of fetchSubscribers) {
          try { if (sub.onProgress) sub.onProgress(info); } catch (error) {}
        }
      },
      onError: (source, error) => {
        for (const sub of fetchSubscribers) {
          try { if (sub.onError) sub.onError(source, error); } catch (error) {}
        }
      },
      isCancelled: () => false
    });
  })();

  inflightFetch = promise;

  promise.then(result => {
    if (result && result.success) {
      satelliteCache = result;
      cacheTimestamp = Date.now();
    }
  }).catch(() => {}).finally(() => {
    inflightFetch = null;
    partialAccumulation = [];
  });

  return promise;
};

const fetchAllActiveSatellites = async () => {
  if (satelliteCache && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
    return satelliteCache;
  }
  try {
    return await startSharedFetch();
  } catch (error) {
    return {
      success: false,
      error: `An unexpected error occurred: ${error.message}.`,
      satellites: [],
      errors: [`An unexpected error occurred: ${error.message}.`],
      metadata: {
        totalSources: 0,
        successfulSources: 0,
        totalSatellites: 0,
        cached: false,
        memoryOptimized: true
      }
    };
  }
};

const fetchEarthRotationData = async () => {
  try {
    const url = "https://celestrak.org/SpaceData/eop-last5.txt";
    const response = await axios.get(url, AXIOS_CONFIG);

    if (response.data && typeof response.data === "string") {
      const lines = response.data.split("\n").filter(line => line.trim() && !line.startsWith("#"));

      if (lines.length > 0) {
        const latestLine = lines[lines.length - 1];
        const parts = latestLine.split(/\s+/);

        if (parts.length >= 7) {
          const mjd = parseFloat(parts[0]);
          const ut1_utc = parseFloat(parts[4]) / 1000000.0;

          const jd = mjd + 2400000.5;
          const t = (jd - 2451545.0) / 36525.0;

          let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) +
                     0.000387933 * t * t - t * t * t / 38710000.0;

          gmst = gmst % 360.0;
          if (gmst < 0) gmst += 360.0;

          const equationOfEquinoxesDeg = computeEquationOfEquinoxesDeg(jd);
          const gast = gmst + equationOfEquinoxesDeg;

          return {
            success: true,
            data: {
              gmst: gmst * Math.PI / 180.0,
              gast: gast * Math.PI / 180.0,
              ut1_utc: ut1_utc,
              mjd: mjd,
              julianDate: jd
            },
            source: "CelesTrak Earth Orientation Parameters"
          };
        }
      }
    }

    throw new Error("Unable to retrieve Earth rotation data from the external source.");
  } catch (error) {
    const currentDate = new Date();
    const jd = 2440587.5 + currentDate.getTime() / 86400000.0;
    const t = (jd - 2451545.0) / 36525.0;

    let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) +
               0.000387933 * t * t - t * t * t / 38710000.0;

    gmst = gmst % 360.0;
    if (gmst < 0) gmst += 360.0;

    const equationOfEquinoxesDeg = computeEquationOfEquinoxesDeg(jd);
    const gast = gmst + equationOfEquinoxesDeg;

    return {
      success: true,
      data: {
        gmst: gmst * Math.PI / 180.0,
        gast: gast * Math.PI / 180.0,
        ut1_utc: 0.0,
        mjd: jd - 2400000.5,
        julianDate: jd
      },
      source: "Calculated GMST (Fallback)",
      warning: `The external source failed with the following error: ${error.message}. The system is using calculated GMST as a fallback.`
    };
  }
};

const fetchSpaceWeather = async () => {
  if (spaceWeatherCache && spaceWeatherTimestamp && Date.now() - spaceWeatherTimestamp < SPACE_WEATHER_TTL) {
    return spaceWeatherCache;
  }

  if (inflightSpaceWeather) {
    return inflightSpaceWeather;
  }

  inflightSpaceWeather = (async () => {
    const data = {
      timestamp: new Date().toISOString(),
      sources: [],
      errors: []
    };

    const safeFetch = async (key, url) => {
      try {
        const r = await axios.get(url, { ...AXIOS_CONFIG, timeout: 10000 });
        data.sources.push(key);
        return r.data;
      } catch (error) {
        data.errors.push(`${key}: ${error.message}.`);
        return null;
      }
    };

    const [kpData, f107Data, plasmaData, magData, alertsData, scalesData, xrayData, protonData, electronData, regionsData, cmeData] = await Promise.all([
      safeFetch("kp_index", SPACE_WEATHER_SOURCES.kpIndex),
      safeFetch("f10.7_flux", SPACE_WEATHER_SOURCES.f107Flux),
      safeFetch("solar_wind_plasma", SPACE_WEATHER_SOURCES.solarWindPlasma),
      safeFetch("solar_wind_mag", SPACE_WEATHER_SOURCES.solarWindMag),
      safeFetch("alerts", SPACE_WEATHER_SOURCES.alerts),
      safeFetch("noaa_scales", SPACE_WEATHER_SOURCES.geoStorm),
      safeFetch("xray_flares", SPACE_WEATHER_SOURCES.xrayFlares),
      safeFetch("proton_flux", SPACE_WEATHER_SOURCES.protonFlux),
      safeFetch("electron_flux", SPACE_WEATHER_SOURCES.electronFlux),
      safeFetch("solar_regions", SPACE_WEATHER_SOURCES.solarRegions),
      safeFetch("cme_analysis", SPACE_WEATHER_SOURCES.cmeAnalysis)
    ]);

    if (Array.isArray(kpData) && kpData.length > 0) {
      const latest = kpData[kpData.length - 1];
      const kpValue = parseFloat(latest.kp_index || latest.estimated_kp || 0);
      data.kpIndex = {
        current: Math.round(kpValue * 10) / 10,
        timestamp: latest.time_tag,
        classification: classifyKpIndex(kpValue),
        history: kpData.map(r => ({
          time: r.time_tag,
          value: parseFloat(r.kp_index || r.estimated_kp || 0)
        }))
      };
    }

    if (Array.isArray(f107Data) && f107Data.length > 0) {
      const latest = f107Data[f107Data.length - 1];
      const fluxValue = parseFloat(latest.flux || latest.observed_flux || 0);
      data.f107 = {
        current: Math.round(fluxValue * 10) / 10,
        timestamp: latest.time_tag,
        classification: classifyF107(fluxValue),
        adjusted: parseFloat(latest.adjusted_flux || fluxValue),
        history: f107Data.map(r => ({
          time: r.time_tag,
          value: parseFloat(r.flux || r.observed_flux || 0)
        }))
      };
    }

    if (Array.isArray(plasmaData) && plasmaData.length > 1) {
      const headers = plasmaData[0];
      const rows = plasmaData.slice(1).filter(r => r && r.length >= headers.length);
      if (rows.length > 0) {
        const speedIdx = headers.indexOf("speed");
        const densityIdx = headers.indexOf("density");
        const tempIdx = headers.indexOf("temperature");
        const last = rows[rows.length - 1];
        const speed = parseFloat(last[speedIdx]);
        const density = parseFloat(last[densityIdx]);
        data.solarWind = {
          speed: Number.isFinite(speed) ? Math.round(speed) : null,
          density: Number.isFinite(density) ? Math.round(density * 100) / 100 : null,
          temperature: Number.isFinite(parseFloat(last[tempIdx])) ? Math.round(parseFloat(last[tempIdx])) : null,
          timestamp: last[0],
          classification: Number.isFinite(speed) ? classifySolarWind(speed) : null,
          history: rows.map(r => ({
            time: r[0],
            speed: parseFloat(r[speedIdx]),
            density: parseFloat(r[densityIdx])
          }))
        };
      }
    }

    if (Array.isArray(magData) && magData.length > 1) {
      const headers = magData[0];
      const rows = magData.slice(1).filter(r => r && r.length >= headers.length);
      if (rows.length > 0) {
        const bzIdx = headers.indexOf("bz_gsm");
        const btIdx = headers.indexOf("bt");
        const last = rows[rows.length - 1];
        const bz = parseFloat(last[bzIdx]);
        const bt = parseFloat(last[btIdx]);
        data.imf = {
          bz: Number.isFinite(bz) ? Math.round(bz * 100) / 100 : null,
          bt: Number.isFinite(bt) ? Math.round(bt * 100) / 100 : null,
          timestamp: last[0],
          orientation: bz < -5 ? "Strongly southward (geoeffective)" : bz < 0 ? "Southward" : "Northward",
          history: rows.map(r => ({
            time: r[0],
            bz: parseFloat(r[bzIdx]),
            bt: parseFloat(r[btIdx])
          }))
        };
      }
    }

    if (Array.isArray(alertsData)) {
      data.alerts = alertsData.map(a => ({
        productId: a.product_id,
        issueDateTime: a.issue_datetime,
        message: a.message
      }));
    }

    if (scalesData && typeof scalesData === "object") {
      const today = scalesData["0"] || {};
      data.scales = {
        geomagnetic: { scale: today.G?.Scale || "0", text: today.G?.Text || "No storms" },
        radiation: { scale: today.S?.Scale || "0", text: today.S?.Text || "Normal" },
        radioBlackout: { scale: today.R?.Scale || "0", text: today.R?.Text || "Normal" }
      };
    }

    if (Array.isArray(xrayData) && xrayData.length > 0) {
      const recent = xrayData.filter(x => x.energy === "0.1-0.8nm");
      const latest = recent[recent.length - 1];
      if (latest) {
        const flux = parseFloat(latest.flux);
        let cls = "A";
        if (flux >= 1e-4) cls = "X";
        else if (flux >= 1e-5) cls = "M";
        else if (flux >= 1e-6) cls = "C";
        else if (flux >= 1e-7) cls = "B";
        data.xray = {
          flux: flux,
          classification: cls,
          timestamp: latest.time_tag,
          history: recent.map(x => ({ time: x.time_tag, flux: parseFloat(x.flux) }))
        };
      }
    }

    if (Array.isArray(protonData) && protonData.length > 0) {
      const recent = protonData.filter(p => p.energy === ">=10 MeV");
      const latest = recent[recent.length - 1];
      if (latest) {
        const flux = parseFloat(latest.flux);
        data.protons = {
          flux: flux,
          stormLevel: flux >= 100000 ? "S5" : flux >= 10000 ? "S4" : flux >= 1000 ? "S3" : flux >= 100 ? "S2" : flux >= 10 ? "S1" : "S0",
          timestamp: latest.time_tag,
          history: recent.map(p => ({ time: p.time_tag, flux: parseFloat(p.flux) }))
        };
      }
    }

    if (Array.isArray(electronData) && electronData.length > 0) {
      const recent = electronData.filter(e => e.energy === ">=2 MeV");
      const latest = recent[recent.length - 1];
      if (latest) {
        data.electrons = {
          flux: parseFloat(latest.flux),
          timestamp: latest.time_tag,
          history: recent.map(e => ({ time: e.time_tag, flux: parseFloat(e.flux) }))
        };
      }
    }

    if (Array.isArray(regionsData)) {
      data.solarRegions = regionsData.map(r => ({
        region: r.region,
        location: r.location,
        spotClass: r.spotclass,
        magClass: r.mag_class,
        numSpots: r.number_spots,
        area: r.area
      }));
    }

    if (Array.isArray(cmeData)) {
      data.cmes = cmeData.map(c => ({
        time: c.time21_5,
        speed: c.speed,
        type: c.type,
        latitude: c.latitude,
        longitude: c.longitude,
        halfAngle: c.halfAngle,
        note: c.note
      }));
    }

    let overallSeverity = 0;
    let overallStatus = "Quiet";
    let overallColor = "#5a7068";
    if (data.kpIndex) {
      overallSeverity = Math.max(overallSeverity, data.kpIndex.classification.severity);
    }
    if (data.protons && data.protons.flux >= 10) {
      overallSeverity = Math.max(overallSeverity, 2);
    }
    if (data.xray && (data.xray.classification === "M" || data.xray.classification === "X")) {
      overallSeverity = Math.max(overallSeverity, data.xray.classification === "X" ? 4 : 3);
    }
    if (overallSeverity >= 5) { overallStatus = "Severe"; overallColor = "#e04020"; }
    else if (overallSeverity >= 3) { overallStatus = "Active"; overallColor = "#c08040"; }
    else if (overallSeverity >= 1) { overallStatus = "Unsettled"; overallColor = "#7a8a5a"; }

    data.overall = { status: overallStatus, color: overallColor, severity: overallSeverity };

    return data;
  })();

  try {
    const result = await inflightSpaceWeather;
    spaceWeatherCache = result;
    spaceWeatherTimestamp = Date.now();
    return result;
  } finally {
    inflightSpaceWeather = null;
  }
};

const callGeminiAPIWithTimeout = async (prompt, useGrounding = true, maxTokens = 4096, temperature = 0.3, timeoutMs = GEMINI_STAGE_TIMEOUT_MS) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
      topP: 0.95
    }
  };
  if (useGrounding) {
    body.tools = [{ google_search: {} }];
  }

  const startMs = Date.now();
  let response;
  try {
    response = await axios.post(url, body, {
      headers: { "Content-Type": "application/json" },
      timeout: timeoutMs
    });
  } catch (error) {
    if (error.code === "ECONNABORTED" || (error.message && error.message.includes("timeout"))) {
      throw Object.assign(new Error(`Gemini stage timed out after ${timeoutMs}ms.`), { timedOut: true, elapsedMs: Date.now() - startMs });
    }
    throw error;
  }

  const candidate = response.data?.candidates?.[0];
  const text = candidate?.content?.parts?.map(p => p.text || "").join("") || "";
  const grounding = candidate?.groundingMetadata || null;
  const sources = grounding?.groundingChunks?.map(c => ({
    url: c.web?.uri,
    title: c.web?.title
  })).filter(s => s.url) || [];

  const usage = response.data?.usageMetadata || {};
  const tokenUsage = {
    prompt: usage.promptTokenCount,
    completion: usage.candidatesTokenCount,
    total: usage.totalTokenCount
  };
  const finishReason = candidate?.finishReason;
  const truncated = finishReason === "MAX_TOKENS";

  return {
    text,
    sources,
    tokenUsage,
    truncated,
    finishReason,
    elapsedMs: Date.now() - startMs,
    timedOut: false
  };
};

const callGeminiAPI = async (prompt, useGrounding = true, maxTokens = 4096, temperature = 0.3) => {
  return callGeminiAPIWithTimeout(prompt, useGrounding, maxTokens, temperature, GEMINI_STAGE_TIMEOUT_MS);
};

const buildMissionStage1Prompt = (satellite) => {
  const orbital = `Altitude: ${satellite.altitude} km, Inclination: ${satellite.inclination || "?"}°, Period: ${satellite.period} min, Eccentricity: ${satellite.eccentricity || "?"}, Category: ${satellite.category}, Group: ${satellite.group || "?"}, NORAD ID: ${satellite.noradId}`;
  return `You are a satellite intelligence analyst. Research the satellite "${satellite.name}" (NORAD ID ${satellite.noradId}) using Google Search.

Orbital state: ${orbital}

Return ONLY a JSON object (no markdown, no fences, no asterisks for bold) with verifiable facts:

{
  "operator": "Operating organization or agency",
  "internationalDesignator": "YYYY-NNNL format if known",
  "launchDate": "YYYY-MM-DD or approximate",
  "launchVehicle": "Launch vehicle name",
  "launchSite": "Launch site name",
  "missionStatus": "Active | Inactive | Decommissioned | Reentered",
  "factSheet": {
    "manufacturer": "Spacecraft manufacturer",
    "bus": "Spacecraft bus or platform",
    "mass": "kg if known (string with unit)",
    "power": "watts if known (string with unit)",
    "designLife": "years if known (string with unit)",
    "propulsion": "Propulsion type if known",
    "stabilization": "3-axis | spin | gravity-gradient | etc"
  },
  "instruments": ["instrument 1", "instrument 2"]
}

Use null for unknown fields. Do not fabricate. Do not use markdown formatting in any string values.`;
};

const buildMissionStage2Prompt = (satellite, stage1) => {
  const ops = stage1?.parsed?.operator || "Unknown";
  return `You are a satellite mission analyst. Research and write narrative analysis for "${satellite.name}" (NORAD ${satellite.noradId}, operated by ${ops}).

Return ONLY a JSON object (no markdown, no asterisks for bold):

{
  "executiveSummary": "Two sentences capturing the essence of this satellite's mission and current significance.",
  "missionBrief": "Two-paragraph detailed brief: paragraph 1 covers mission purpose, scientific or operational goals, and primary capabilities. Paragraph 2 covers operational history, current state, and broader significance.",
  "scientificContribution": "Specific scientific or operational contributions of this satellite to its field, with concrete examples of data products, discoveries, or services provided.",
  "constellationContext": "How this satellite fits within its constellation or mission family, including its role relative to companion satellites.",
  "geopoliticalSignificance": "Strategic, geopolitical, or national-security relevance of this satellite. Address operator-nation context.",
  "commercialContext": "Commercial market position, customer base, revenue model, and competitive landscape if applicable. Use null for non-commercial assets."
}

Be specific and factual. Use null for non-applicable fields. Do not use markdown formatting (no double asterisks, no underscores) in any string values.`;
};

const buildMissionStage3Prompt = (satellite, stage1, stage2) => {
  return `You are a satellite operations analyst. For "${satellite.name}" (NORAD ${satellite.noradId}), provide events timeline and risk assessment.

Return ONLY a JSON object (no markdown, no asterisks):

{
  "notableEvents": [
    {"date": "YYYY-MM-DD or YYYY", "event": "Concrete description of anomaly, maneuver, milestone, or upgrade"}
  ],
  "riskAssessment": {
    "tleAgeRisk": "How TLE age affects tracking accuracy and operational decisions for this orbit class.",
    "decayRisk": "Reentry/decay outlook based on altitude (${satellite.altitude} km) and BSTAR.",
    "conjunctionRisk": "Known close approach concerns or general congestion risk in this regime.",
    "operationalRisk": "Other operational concerns: payload health, age, ground segment, succession.",
    "cyberRisk": "Cyber and command-link integrity concerns for this satellite's class.",
    "regulatoryRisk": "Spectrum, licensing, debris-mitigation, end-of-life regulatory exposure."
  }
}

Provide up to 6 most significant events. Each risk field should be 1-3 sentences with specific reasoning. Do not use markdown formatting in any string values.`;
};

const fetchMissionIntelligence = async (satellite) => {
  const cacheKey = String(satellite.noradId);
  const cached = geminiCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < GEMINI_TTL) {
    return { ...cached.data, fromCache: true, cacheAgeMinutes: Math.round((Date.now() - cached.timestamp) / 60000) };
  }

  const stages = [];
  const partialStages = [];
  const allSources = [];
  const seenUrls = new Set();
  let totalTokens = 0;
  let totalPrompt = 0;
  let totalCompletion = 0;
  const perStage = [];

  const runStage = async (stageNum, prompt, maxTokens, temperature) => {
    try {
      const result = await callGeminiAPIWithTimeout(prompt, true, maxTokens, temperature, GEMINI_STAGE_TIMEOUT_MS);
      const parsed = safeJsonParse(result.text);
      stages.push({ parsed, text: result.text, sources: result.sources, tokenUsage: result.tokenUsage });
      partialStages.push(`stage${stageNum}-ok`);
      for (const s of result.sources || []) {
        if (s.url && !seenUrls.has(s.url)) {
          seenUrls.add(s.url);
          allSources.push(s);
        }
      }
      if (result.tokenUsage) {
        if (Number.isFinite(result.tokenUsage.total)) totalTokens += result.tokenUsage.total;
        if (Number.isFinite(result.tokenUsage.prompt)) totalPrompt += result.tokenUsage.prompt;
        if (Number.isFinite(result.tokenUsage.completion)) totalCompletion += result.tokenUsage.completion;
      }
      perStage.push({
        stage: stageNum,
        prompt: result.tokenUsage?.prompt,
        completion: result.tokenUsage?.completion,
        total: result.tokenUsage?.total,
        elapsedMs: result.elapsedMs,
        truncated: result.truncated,
        timedOut: false
      });
      return { ok: true, parsed };
    } catch (error) {
      const isTimeout = !!error.timedOut;
      stages.push({ parsed: null, text: "", sources: [], tokenUsage: null, error: error.message });
      partialStages.push(`stage${stageNum}-${isTimeout ? "timeout" : "error"}`);
      perStage.push({
        stage: stageNum,
        elapsedMs: error.elapsedMs,
        timedOut: isTimeout,
        error: error.message,
        truncated: false
      });
      return { ok: false, parsed: null };
    }
  };

  try {
    const s1 = await runStage(1, buildMissionStage1Prompt(satellite), 2048, 0.2);
    const s2 = await runStage(2, buildMissionStage2Prompt(satellite, stages[0]), 3000, 0.4);
    const s3 = await runStage(3, buildMissionStage3Prompt(satellite, stages[0], stages[1]), 3000, 0.3);

    const merged = {
      ...(s1.parsed || {}),
      ...(s2.parsed || {}),
      ...(s3.parsed || {})
    };

    const normalized = normalizeMissionIntelligence(merged);

    const successfulStages = perStage.filter(p => !p.timedOut && !p.error).length;
    if (successfulStages === 0) {
      return {
        noradId: satellite.noradId,
        name: satellite.name,
        error: "All Gemini stages failed.",
        partialStages,
        generatedAt: new Date().toISOString(),
        sources: [],
        intelligence: null,
        tokenUsage: { total: totalTokens, prompt: totalPrompt, completion: totalCompletion, perStage }
      };
    }

    const result = {
      noradId: satellite.noradId,
      name: satellite.name,
      generatedAt: new Date().toISOString(),
      intelligence: normalized,
      sources: allSources,
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      stages: successfulStages,
      partialStages,
      tokenUsage: { total: totalTokens, prompt: totalPrompt, completion: totalCompletion, perStage }
    };

    cacheSet(geminiCache, cacheKey, { data: result, timestamp: Date.now() }, GEMINI_CACHE_MAX_ENTRIES);
    return { ...result, fromCache: false };
  } catch (error) {
    return {
      noradId: satellite.noradId,
      name: satellite.name,
      error: error.message,
      partialStages,
      generatedAt: new Date().toISOString(),
      sources: [],
      intelligence: null,
      tokenUsage: { total: totalTokens, prompt: totalPrompt, completion: totalCompletion, perStage }
    };
  }
};

const buildSpaceWeatherStage1Prompt = (sw) => {
  const summary = `Current Conditions:
- Kp Index: ${sw.kpIndex?.current || "N/A"} (${sw.kpIndex?.classification.label || "Unknown"})
- F10.7 Flux: ${sw.f107?.current || "N/A"} sfu (${sw.f107?.classification.label || "Unknown"})
- Solar Wind: ${sw.solarWind?.speed || "N/A"} km/s, density ${sw.solarWind?.density || "N/A"} p/cm³
- IMF Bz: ${sw.imf?.bz || "N/A"} nT (${sw.imf?.orientation || "Unknown"})
- X-Ray: ${sw.xray?.classification || "N/A"}-class (${sw.xray?.flux?.toExponential(2) || "N/A"} W/m²)
- Proton Storm: ${sw.protons?.stormLevel || "S0"} (${sw.protons?.flux?.toFixed(2) || "0"} pfu)
- NOAA Scales: G${sw.scales?.geomagnetic.scale || "0"} S${sw.scales?.radiation.scale || "0"} R${sw.scales?.radioBlackout.scale || "0"}
- Active Alerts: ${sw.alerts?.length || 0}
- Active Solar Regions: ${sw.solarRegions?.length || 0}
- Recent CMEs: ${sw.cmes?.length || 0}`;
  return `You are a NASA/NOAA space weather operations analyst. Generate a current conditions analysis based on:

${summary}

Return ONLY a JSON object (no markdown, no fences, no asterisks):

{
  "executiveSummary": "Three-sentence brief covering: current state of geospace, dominant drivers, immediate operational implications.",
  "currentConditions": "Detailed paragraph analyzing the current solar-terrestrial coupling, drivers behind observed parameters, and what operators should watch over the next 6 hours."
}

Be specific and use technical language appropriate for satellite operators. Do not use markdown formatting in string values.`;
};

const buildSpaceWeatherStage2Prompt = (sw) => {
  return `You are a space weather forecaster. Based on current conditions, search recent SWPC reports and produce 24-hour and 72-hour forecasts.

Current state: Kp ${sw.kpIndex?.current || "N/A"}, F10.7 ${sw.f107?.current || "N/A"} sfu, X-Ray ${sw.xray?.classification || "A"}-class, Solar Wind ${sw.solarWind?.speed || "N/A"} km/s.

Return ONLY a JSON object (no markdown, no asterisks):

{
  "forecast24h": "Detailed 24-hour outlook covering: expected geomagnetic activity envelope, solar flare probability, solar wind evolution, and operator decision points.",
  "forecast72h": "Three-day outlook covering: dominant driver patterns expected, any incoming CMEs or HSS streams, expected G/S/R scale evolution.",
  "historicalContext": "How current conditions compare to recent activity, solar cycle phase context, and similar past events that operators may use as analogs."
}

Do not use markdown formatting in string values.`;
};

const buildSpaceWeatherStage3Prompt = (sw) => {
  return `You are a satellite operations risk analyst. Based on the current space weather state, produce satellite-specific impact assessment and recommended actions.

State: Kp ${sw.kpIndex?.current || "N/A"} (${sw.kpIndex?.classification.label}), F10.7 ${sw.f107?.current || "N/A"} sfu, X-Ray ${sw.xray?.classification || "A"}, Protons ${sw.protons?.stormLevel || "S0"}, IMF Bz ${sw.imf?.bz || "0"} nT.

Return ONLY a JSON object (no markdown, no asterisks):

{
  "satelliteImpacts": [
    {"regime": "LEO Imaging", "impact": "Specific drag, attitude, and SAA impact narrative", "severity": "Low|Moderate|High"},
    {"regime": "GEO Communications", "impact": "Charging, SEU, and ranging accuracy narrative", "severity": "Low|Moderate|High"},
    {"regime": "GNSS / GPS", "impact": "Ionospheric scintillation, ranging error narrative", "severity": "Low|Moderate|High"},
    {"regime": "HF Communications", "impact": "Polar absorption and ionosphere disturbance narrative", "severity": "Low|Moderate|High"}
  ],
  "recommendedActions": [
    "Specific operational action 1 with rationale",
    "Specific operational action 2 with rationale",
    "Specific operational action 3 with rationale",
    "Specific operational action 4 with rationale"
  ],
  "scientificAnalysis": "Paragraph-level scientific interpretation: which physical processes dominate the current state, key open questions, and what observations would resolve them."
}

Do not use markdown formatting in string values.`;
};

const fetchWikipediaSummary = async (title) => {
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const r = await axios.get(url, { ...AXIOS_CONFIG, timeout: OBSERVATION_AXIOS_TIMEOUT_MS });
    return {
      title: r.data.title,
      extract: r.data.extract,
      thumbnail: r.data.thumbnail?.source,
      url: r.data.content_urls?.desktop?.page
    };
  } catch (error) {
    return null;
  }
};

const fetchEONETEvents = async () => {
  try {
    const url = "https://eonet.gsfc.nasa.gov/api/v3/events?status=open";
    const r = await axios.get(url, { ...AXIOS_CONFIG, timeout: OBSERVATION_AXIOS_TIMEOUT_MS });
    return (r.data?.events || []).map(e => ({
      id: e.id,
      title: e.title,
      categories: e.categories?.map(c => c.title) || [],
      date: e.geometry?.[0]?.date,
      coordinates: e.geometry?.[0]?.coordinates,
      sources: e.sources?.map(s => ({ id: s.id, url: s.url })) || [],
      link: e.link
    }));
  } catch (error) {
    return [];
  }
};

const fetchISSData = async () => {
  try {
    const settled = await Promise.allSettled([
      axios.get("https://api.wheretheiss.at/v1/satellites/25544", { ...AXIOS_CONFIG, timeout: OBSERVATION_AXIOS_TIMEOUT_MS }),
      axios.get("http://api.open-notify.org/astros.json", { ...AXIOS_CONFIG, timeout: OBSERVATION_AXIOS_TIMEOUT_MS })
    ]);
    const posR = settled[0].status === "fulfilled" ? settled[0].value : null;
    const crewR = settled[1].status === "fulfilled" ? settled[1].value : null;

    const result = {};
    if (posR && posR.data) {
      result.position = {
        latitude: posR.data.latitude,
        longitude: posR.data.longitude,
        altitude: posR.data.altitude,
        velocity: posR.data.velocity,
        visibility: posR.data.visibility,
        timestamp: posR.data.timestamp
      };
    }
    if (crewR && crewR.data && Array.isArray(crewR.data.people)) {
      result.crew = crewR.data.people.filter(p => p.craft === "ISS").map(p => p.name);
      result.totalInSpace = crewR.data.number;
      result.allCrews = crewR.data.people;
    }
    return Object.keys(result).length > 0 ? result : null;
  } catch (error) {
    return null;
  }
};

const buildGIBSImageryURL = (layer, date) => {
  const formatted = (date || new Date()).toISOString().substring(0, 10);
  return {
    layer,
    date: formatted,
    wmts: `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/${layer}/default/${formatted}/250m/0/0/0.jpg`,
    worldview: `https://worldview.earthdata.nasa.gov/?v=-180,-90,180,90&l=${layer}&t=${formatted}`
  };
};

const fetchObservationData = async (satellite) => {
  const cacheKey = String(satellite.noradId);
  const cached = observationCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < OBSERVATION_TTL) {
    return cached.data;
  }

  const result = {
    noradId: satellite.noradId,
    name: satellite.name,
    generatedAt: new Date().toISOString(),
    imagery: [],
    activeEvents: [],
    issData: null,
    wikipedia: null,
    references: []
  };

  const lowerName = (satellite.name || "").toLowerCase();
  const group = (satellite.group || "").toLowerCase();

  if (lowerName.includes("modis") || lowerName.includes("terra") || lowerName.includes("aqua")) {
    const today = new Date();
    result.imagery.push({
      label: "MODIS Terra True Color",
      ...buildGIBSImageryURL("MODIS_Terra_CorrectedReflectance_TrueColor", today)
    });
    result.imagery.push({
      label: "MODIS Aqua True Color",
      ...buildGIBSImageryURL("MODIS_Aqua_CorrectedReflectance_TrueColor", today)
    });
  }

  if (lowerName.includes("viirs") || lowerName.includes("suomi") || lowerName.includes("npp") || lowerName.includes("noaa-20") || lowerName.includes("noaa 20")) {
    const today = new Date();
    result.imagery.push({
      label: "VIIRS True Color",
      ...buildGIBSImageryURL("VIIRS_SNPP_CorrectedReflectance_TrueColor", today)
    });
    result.imagery.push({
      label: "VIIRS Day/Night Band",
      ...buildGIBSImageryURL("VIIRS_SNPP_DayNightBand_ENCC", today)
    });
  }

  if (lowerName.includes("landsat")) {
    result.imagery.push({
      label: "Landsat WELD Reflectance",
      layer: "Landsat_WELD_CorrectedReflectance_TrueColor_Global_Annual",
      worldview: "https://worldview.earthdata.nasa.gov/?l=Landsat_WELD_CorrectedReflectance_TrueColor_Global_Annual"
    });
  }

  if (lowerName.includes("sentinel")) {
    result.imagery.push({
      label: "Sentinel-2 (Copernicus Browser)",
      worldview: "https://browser.dataspace.copernicus.eu/"
    });
  }

  if (lowerName.includes("goes")) {
    const today = new Date();
    result.imagery.push({
      label: "GOES-East Geocolor",
      ...buildGIBSImageryURL("GOES-East_ABI_GeoColor", today)
    });
    result.imagery.push({
      label: "GOES-West Geocolor",
      ...buildGIBSImageryURL("GOES-West_ABI_GeoColor", today)
    });
  }

  if (group.includes("starlink")) {
    result.references.push({ label: "Starlink coverage map", url: "https://www.starlink.com/map" });
  }

  if (lowerName.includes("hubble")) {
    result.references.push({ label: "Hubble Latest Observations", url: "https://hubblesite.org/resource-gallery/images" });
  }

  if (lowerName.includes("jwst") || lowerName.includes("webb")) {
    result.references.push({ label: "JWST Observation Schedule", url: "https://www.stsci.edu/jwst/science-execution/observing-schedules" });
  }

  const isISS = satellite.noradId === 25544 || lowerName.includes("iss") || lowerName.includes("zarya");
  const isEarthObs = satellite.category === "Earth Observation" || satellite.category === "Weather" || lowerName.includes("modis") || lowerName.includes("viirs") || lowerName.includes("goes");

  const wikiTitle = satellite.name.replace(/\s+/g, "_");
  const cleanName = satellite.name.split(/[\(\[]/)[0].trim().replace(/\s+/g, "_");

  const externalTasks = [];
  externalTasks.push(isISS ? fetchISSData() : Promise.resolve(null));
  externalTasks.push(isEarthObs ? fetchEONETEvents() : Promise.resolve([]));
  externalTasks.push(fetchWikipediaSummary(wikiTitle));

  const settled = await Promise.allSettled(externalTasks);

  result.issData = settled[0].status === "fulfilled" ? settled[0].value : null;
  result.activeEvents = settled[1].status === "fulfilled" ? (settled[1].value || []) : [];
  let wikiPrimary = settled[2].status === "fulfilled" ? settled[2].value : null;

  if (!wikiPrimary && cleanName !== wikiTitle) {
    try {
      wikiPrimary = await fetchWikipediaSummary(cleanName);
    } catch (error) {
      wikiPrimary = null;
    }
  }
  if (wikiPrimary && wikiPrimary.extract) {
    wikiPrimary = { ...wikiPrimary, extract: sanitizeMarkdown(wikiPrimary.extract) };
  }
  result.wikipedia = wikiPrimary;

  if (isISS) {
    result.references.push({ label: "ISS Live Stream (NASA)", url: "https://www.nasa.gov/live" });
    result.references.push({ label: "Spot The Station", url: "https://spotthestation.nasa.gov/" });
  }

  result.references.push({
    label: "N2YO Tracking",
    url: `https://www.n2yo.com/satellite/?s=${satellite.noradId}`
  });
  result.references.push({
    label: "Heavens-Above",
    url: `https://www.heavens-above.com/orbit.aspx?satid=${satellite.noradId}`
  });
  result.references.push({
    label: "CelesTrak SATCAT",
    url: `https://celestrak.org/satcat/search-results.php?CATNR=${satellite.noradId}`
  });

  cacheSet(observationCache, cacheKey, { data: result, timestamp: Date.now() }, OBSERVATION_CACHE_MAX_ENTRIES);
  return result;
};

router.get("/health", async (req, res) => {
  try {
    const now = Date.now();
    const mem = process.memoryUsage();
    const heap = v8.getHeapStatistics();
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      catalog: {
        cached: !!satelliteCache,
        cacheAgeSeconds: cacheTimestamp ? Math.round((now - cacheTimestamp) / 1000) : null,
        cachedSatelliteCount: satelliteCache ? satelliteCache.satellites.length : 0,
        inflightFetch: !!inflightFetch,
        partialAccumulationLength: partialAccumulation.length,
        activeSubscribers: fetchSubscribers.size,
        provider: SPACETRACK_ENABLED ? "Space-Track" : "CelesTrak"
      },
      memory: {
        live: {
          heapUsedBytes: mem.heapUsed,
          heapTotalBytes: mem.heapTotal,
          heapLimitBytes: heap.heap_size_limit,
          externalBytes: mem.external || 0,
          rssBytes: mem.rss,
          usedFraction: heap.heap_size_limit > 0 ? mem.heapUsed / heap.heap_size_limit : 0,
          availableBytes: Math.max(0, heap.heap_size_limit - mem.heapUsed),
          gcAvailable: typeof global.gc === "function"
        },
        lastFetch: lastMemorySnapshot
      },
      spaceWeather: {
        cached: !!spaceWeatherCache,
        cacheAgeSeconds: spaceWeatherTimestamp ? Math.round((now - spaceWeatherTimestamp) / 1000) : null,
        inflight: !!inflightSpaceWeather,
        sources: spaceWeatherCache?.sources || [],
        errors: spaceWeatherCache?.errors || []
      },
      spacetrackBreaker: SPACETRACK_ENABLED ? {
        state: spacetrackBreaker.state,
        consecutiveFailures: spacetrackBreaker.consecutiveFailures,
        totalRequests: spacetrackBreaker.totalRequests,
        totalFailures: spacetrackBreaker.totalFailures,
        lastSuccessSecondsAgo: spacetrackBreaker.lastSuccessMs ? Math.round((now - spacetrackBreaker.lastSuccessMs) / 1000) : null,
        lastError: spacetrackBreaker.lastError,
        cooldownRemainingSeconds: spacetrackBreaker.state === "open" ? Math.max(0, Math.round((spacetrackBreaker.cooldownMs - (now - spacetrackBreaker.openedAtMs)) / 1000)) : 0
      } : null,
      caches: {
        gemini: { entries: geminiCache.size, maxEntries: GEMINI_CACHE_MAX_ENTRIES },
        observation: { entries: observationCache.size, maxEntries: OBSERVATION_CACHE_MAX_ENTRIES },
        spaceWeatherAI: { cached: !!spaceWeatherAICache.data, ageSeconds: spaceWeatherAICache.timestamp ? Math.round((now - spaceWeatherAICache.timestamp) / 1000) : null }
      }
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

router.get("/metrics", async (req, res) => {
  try {
    const lines = [];
    const now = Date.now();
    const mem = process.memoryUsage();
    const heap = v8.getHeapStatistics();
    lines.push(`# HELP satellite_catalog_size Cached satellite count`);
    lines.push(`# TYPE satellite_catalog_size gauge`);
    lines.push(`satellite_catalog_size ${satelliteCache ? satelliteCache.satellites.length : 0}`);
    lines.push(`# HELP satellite_catalog_cache_age_seconds Age of cached catalog in seconds`);
    lines.push(`# TYPE satellite_catalog_cache_age_seconds gauge`);
    lines.push(`satellite_catalog_cache_age_seconds ${cacheTimestamp ? Math.round((now - cacheTimestamp) / 1000) : -1}`);
    lines.push(`# HELP satellite_inflight_fetch Currently inflight catalog fetch`);
    lines.push(`# TYPE satellite_inflight_fetch gauge`);
    lines.push(`satellite_inflight_fetch ${inflightFetch ? 1 : 0}`);
    lines.push(`# HELP satellite_partial_accumulation Items accumulated during inflight fetch`);
    lines.push(`# TYPE satellite_partial_accumulation gauge`);
    lines.push(`satellite_partial_accumulation ${partialAccumulation.length}`);
    lines.push(`# HELP satellite_active_subscribers SSE subscribers attached to the shared fetch`);
    lines.push(`# TYPE satellite_active_subscribers gauge`);
    lines.push(`satellite_active_subscribers ${fetchSubscribers.size}`);
    lines.push(`# HELP satellite_gemini_cache_entries`);
    lines.push(`# TYPE satellite_gemini_cache_entries gauge`);
    lines.push(`satellite_gemini_cache_entries ${geminiCache.size}`);
    lines.push(`# HELP satellite_observation_cache_entries`);
    lines.push(`# TYPE satellite_observation_cache_entries gauge`);
    lines.push(`satellite_observation_cache_entries ${observationCache.size}`);
    lines.push(`# HELP satellite_heap_used_bytes Live V8 heap used in bytes`);
    lines.push(`# TYPE satellite_heap_used_bytes gauge`);
    lines.push(`satellite_heap_used_bytes ${mem.heapUsed}`);
    lines.push(`# HELP satellite_heap_total_bytes Live V8 heap total in bytes`);
    lines.push(`# TYPE satellite_heap_total_bytes gauge`);
    lines.push(`satellite_heap_total_bytes ${mem.heapTotal}`);
    lines.push(`# HELP satellite_heap_limit_bytes V8 heap_size_limit in bytes`);
    lines.push(`# TYPE satellite_heap_limit_bytes gauge`);
    lines.push(`satellite_heap_limit_bytes ${heap.heap_size_limit}`);
    lines.push(`# HELP satellite_heap_used_fraction heapUsed / heap_size_limit`);
    lines.push(`# TYPE satellite_heap_used_fraction gauge`);
    lines.push(`satellite_heap_used_fraction ${heap.heap_size_limit > 0 ? mem.heapUsed / heap.heap_size_limit : 0}`);
    lines.push(`# HELP satellite_rss_bytes Process RSS in bytes`);
    lines.push(`# TYPE satellite_rss_bytes gauge`);
    lines.push(`satellite_rss_bytes ${mem.rss}`);
    lines.push(`# HELP satellite_external_bytes Process external memory in bytes`);
    lines.push(`# TYPE satellite_external_bytes gauge`);
    lines.push(`satellite_external_bytes ${mem.external || 0}`);
    if (lastMemorySnapshot) {
      lines.push(`# HELP satellite_last_fetch_memory_halted_sources Number of sources halted by memory guard in the last fetch`);
      lines.push(`# TYPE satellite_last_fetch_memory_halted_sources gauge`);
      lines.push(`satellite_last_fetch_memory_halted_sources ${lastMemorySnapshot.haltedQueries.length}`);
      lines.push(`# HELP satellite_last_fetch_halted_rows_total Total rows skipped due to memory halt in the last fetch`);
      lines.push(`# TYPE satellite_last_fetch_halted_rows_total gauge`);
      lines.push(`satellite_last_fetch_halted_rows_total ${lastMemorySnapshot.haltedRowsTotal}`);
      lines.push(`# HELP satellite_last_fetch_peak_heap_bytes Peak heap used during last fetch`);
      lines.push(`# TYPE satellite_last_fetch_peak_heap_bytes gauge`);
      lines.push(`satellite_last_fetch_peak_heap_bytes ${lastMemorySnapshot.peakHeapUsedBytes}`);
      lines.push(`# HELP satellite_last_fetch_gc_triggered Total GC triggers in the last fetch`);
      lines.push(`# TYPE satellite_last_fetch_gc_triggered counter`);
      lines.push(`satellite_last_fetch_gc_triggered ${lastMemorySnapshot.gcTriggeredCount}`);
    }
    if (SPACETRACK_ENABLED) {
      const breakerState = spacetrackBreaker.state === "closed" ? 0 : spacetrackBreaker.state === "half-open" ? 1 : 2;
      lines.push(`# HELP satellite_spacetrack_breaker_state 0=closed,1=half-open,2=open`);
      lines.push(`# TYPE satellite_spacetrack_breaker_state gauge`);
      lines.push(`satellite_spacetrack_breaker_state ${breakerState}`);
      lines.push(`# HELP satellite_spacetrack_breaker_failures Consecutive failures`);
      lines.push(`# TYPE satellite_spacetrack_breaker_failures gauge`);
      lines.push(`satellite_spacetrack_breaker_failures ${spacetrackBreaker.consecutiveFailures}`);
      lines.push(`# HELP satellite_spacetrack_total_requests Total Space-Track fetch attempts`);
      lines.push(`# TYPE satellite_spacetrack_total_requests counter`);
      lines.push(`satellite_spacetrack_total_requests ${spacetrackBreaker.totalRequests}`);
      lines.push(`# HELP satellite_spacetrack_total_failures Total Space-Track fetch failures`);
      lines.push(`# TYPE satellite_spacetrack_total_failures counter`);
      lines.push(`satellite_spacetrack_total_failures ${spacetrackBreaker.totalFailures}`);
    }
    res.set("Content-Type", "text/plain; version=0.0.4");
    res.send(lines.join("\n") + "\n");
  } catch (error) {
    res.status(500).send(`Error generating metrics: ${error.message}.`);
  }
});

router.get("/satellite-stream", async (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no"
  });
  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }

  let closed = false;
  const onClose = () => { closed = true; };
  req.on("close", onClose);
  req.on("aborted", onClose);

  const sendEvent = (event, data) => {
    if (closed || res.writableEnded) {
      return false;
    }
    try {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      return true;
    } catch (error) {
      closed = true;
      return false;
    }
  };

  const startTime = Date.now();
  sendEvent("hello", { startedAt: new Date().toISOString() });

  fetchEarthRotationData().then(result => {
    sendEvent("meta", {
      earthRotation: result.success ? result.data : null,
      source: result.source,
      warning: result.warning
    });
  }).catch(() => {});

  const streamInChunks = (sats, sourceLabel) => {
    const CHUNK_SIZE = 500;
    for (let i = 0; i < sats.length; i += CHUNK_SIZE) {
      if (closed) {
        return;
      }
      sendEvent("batch", {
        satellites: sats.slice(i, i + CHUNK_SIZE),
        source: sourceLabel
      });
    }
  };

  if (satelliteCache && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_DURATION) {
    streamInChunks(satelliteCache.satellites, "Cache");
    sendEvent("progress", {
      completed: satelliteCache.metadata.totalSources,
      total: satelliteCache.metadata.totalSources,
      successful: satelliteCache.metadata.successfulSources,
      memory: lastMemorySnapshot
    });
    if (!closed) {
      sendEvent("done", {
        metadata: {
          ...satelliteCache.metadata,
          fromCache: true,
          cacheAge: Math.round((Date.now() - cacheTimestamp) / 1000),
          loadTime: Date.now() - startTime
        },
        errors: satelliteCache.errors
      });
    }
    res.end();
    return;
  }

  if (partialAccumulation.length > 0) {
    streamInChunks([...partialAccumulation], "Inflight Partial");
  }

  const subscriber = {
    onBatch: (newSats, source) => sendEvent("batch", { satellites: newSats, source }),
    onProgress: (info) => sendEvent("progress", info),
    onError: (source, error) => sendEvent("source-error", { source, error })
  };
  fetchSubscribers.add(subscriber);

  try {
    const promise = startSharedFetch();
    const result = await promise;
    if (!closed) {
      sendEvent("done", {
        metadata: {
          ...(result?.metadata || { totalSources: ENDPOINTS.length, successfulSources: 0 }),
          fromCache: false,
          loadTime: Date.now() - startTime
        },
        errors: result?.errors || []
      });
    }
  } catch (error) {
    if (!closed) {
      sendEvent("source-error", { source: "system", error: error.message });
      sendEvent("done", {
        metadata: { totalSources: ENDPOINTS.length, successfulSources: 0, loadTime: Date.now() - startTime },
        errors: [error.message]
      });
    }
  } finally {
    fetchSubscribers.delete(subscriber);
    res.end();
  }
});

router.get("/all-satellite-data", async (req, res) => {
  try {
    const startTime = Date.now();

    const [satelliteResult, earthRotationResult] = await Promise.all([
      fetchAllActiveSatellites(),
      fetchEarthRotationData()
    ]);

    const loadTime = Date.now() - startTime;

    if (!satelliteResult.success) {
      return res.json({
        success: false,
        satellites: [],
        earthRotation: null,
        errors: satelliteResult.errors || [satelliteResult.error],
        metadata: {
          totalSources: 0,
          successfulSources: 0,
          loadTime: loadTime,
          dataQuality: "No Data",
          queryTime: new Date().toISOString(),
          realSources: ["CelesTrak", "IERS"],
          memoryOptimized: true,
          memoryAware: true,
          memory: lastMemorySnapshot
        }
      });
    }

    const categoryCounts = satelliteResult.satellites.reduce((acc, satellite) => {
      acc[satellite.category] = (acc[satellite.category] || 0) + 1;
      return acc;
    }, {});

    const allErrors = [...(satelliteResult.errors || [])];
    if (!earthRotationResult.success) {
      allErrors.push(`Failed to retrieve Earth rotation data: ${earthRotationResult.error}.`);
    }

    res.json({
      success: true,
      satellites: satelliteResult.satellites,
      earthRotation: earthRotationResult.success ? earthRotationResult.data : null,
      errors: allErrors,
      metadata: {
        totalSources: satelliteResult.metadata.totalSources + 1,
        successfulSources: satelliteResult.metadata.successfulSources + (earthRotationResult.success ? 1 : 0),
        memoryHaltedSources: satelliteResult.metadata.memoryHaltedSources || 0,
        loadTime: loadTime,
        dataQuality: allErrors.length === 0 ? "High" : allErrors.length < 5 ? "Medium" : "Low",
        queryTime: new Date().toISOString(),
        categoryCounts: categoryCounts,
        realSources: ["CelesTrak TLE Feeds", "IERS Earth Orientation Centre"],
        memoryOptimized: true,
        memoryAware: true,
        memory: satelliteResult.metadata.memory || lastMemorySnapshot,
        totalSatellites: satelliteResult.metadata.totalSatellites,
        cacheAge: cacheTimestamp ? Math.round((Date.now() - cacheTimestamp) / 1000) : null
      }
    });
  } catch (error) {
    res.json({
      success: false,
      satellites: [],
      earthRotation: null,
      errors: [`A critical system error occurred: ${error.message}.`],
      metadata: {
        totalSources: 0,
        successfulSources: 0,
        loadTime: 0,
        dataQuality: "No Data",
        queryTime: new Date().toISOString(),
        memoryOptimized: true,
        memoryAware: true,
        memory: lastMemorySnapshot
      }
    });
  }
});

router.get("/leo-satellites", async (req, res) => {
  try {
    const result = await fetchAllActiveSatellites();
    const leo = result.satellites.filter(sat => sat.category === "LEO");

    res.json({
      success: result.success,
      source: "CelesTrak LEO Satellites",
      satellites: leo,
      errors: result.success ? [] : (result.errors || [result.error]),
      metadata: {
        queryTime: new Date().toISOString(),
        dataPoints: leo.length,
        method: "CelesTrak TLE Data - Low Earth Orbit Satellites",
        memoryOptimized: true,
        memoryAware: true,
        memory: result.metadata?.memory || lastMemorySnapshot
      }
    });
  } catch (error) {
    res.json({
      success: false,
      source: "CelesTrak LEO Satellites",
      error: `Failed to retrieve LEO satellite data: ${error.message}.`,
      satellites: []
    });
  }
});

router.get("/geo-satellites", async (req, res) => {
  try {
    const result = await fetchAllActiveSatellites();
    const geo = result.satellites.filter(sat => sat.category === "GEO");

    res.json({
      success: result.success,
      source: "CelesTrak GEO Satellites",
      satellites: geo,
      errors: result.success ? [] : (result.errors || [result.error]),
      metadata: {
        queryTime: new Date().toISOString(),
        dataPoints: geo.length,
        method: "CelesTrak TLE Data - Geostationary Satellites",
        memoryOptimized: true,
        memoryAware: true,
        memory: result.metadata?.memory || lastMemorySnapshot
      }
    });
  } catch (error) {
    res.json({
      success: false,
      source: "CelesTrak GEO Satellites",
      error: `Failed to retrieve GEO satellite data: ${error.message}.`,
      satellites: []
    });
  }
});

router.get("/starlink-satellites", async (req, res) => {
  try {
    const result = await fetchAllActiveSatellites();
    const starlink = result.satellites.filter(sat => sat.group === "Starlink");

    res.json({
      success: result.success,
      source: "CelesTrak Starlink Satellites",
      satellites: starlink,
      errors: result.success ? [] : (result.errors || [result.error]),
      metadata: {
        queryTime: new Date().toISOString(),
        dataPoints: starlink.length,
        method: "CelesTrak TLE Data - Starlink Constellation",
        memoryOptimized: true,
        memoryAware: true,
        memory: result.metadata?.memory || lastMemorySnapshot
      }
    });
  } catch (error) {
    res.json({
      success: false,
      source: "CelesTrak Starlink Satellites",
      error: `Failed to retrieve Starlink satellite data: ${error.message}.`,
      satellites: []
    });
  }
});

router.get("/earth-rotation", async (req, res) => {
  try {
    const result = await fetchEarthRotationData();

    res.json({
      success: result.success,
      source: "IERS Earth Orientation Centre",
      data: result.data,
      errors: result.success ? [] : [result.error],
      metadata: {
        queryTime: new Date().toISOString(),
        method: "IERS Earth Orientation Parameters - Real-time GMST/GAST"
      }
    });
  } catch (error) {
    res.json({
      success: false,
      source: "IERS Earth Orientation Centre",
      error: `Failed to retrieve Earth rotation data: ${error.message}.`,
      data: null
    });
  }
});

router.get("/space-weather", async (req, res) => {
  try {
    const data = await fetchSpaceWeather();
    res.json({ success: true, data, cached: spaceWeatherTimestamp ? Date.now() - spaceWeatherTimestamp < SPACE_WEATHER_TTL : false });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

router.post("/space-weather-ai", async (req, res) => {
  try {
    const swInput = req.body && req.body.spaceWeather;
    if (!swInput) {
      return res.status(400).json({ success: false, error: "Missing spaceWeather payload." });
    }
    if (spaceWeatherAICache.data && Date.now() - spaceWeatherAICache.timestamp < PANEL_AI_TTL) {
      return res.json({ success: true, data: { ...spaceWeatherAICache.data, fromCache: true } });
    }

    const allSources = [];
    const seen = new Set();
    const perStage = [];
    let totalTokens = 0;
    let totalPrompt = 0;
    let totalCompletion = 0;

    const runIndependent = async (stageNum, prompt, maxTokens, temperature) => {
      try {
        const r = await callGeminiAPIWithTimeout(prompt, true, maxTokens, temperature, GEMINI_STAGE_TIMEOUT_MS);
        for (const s of r.sources) {
          if (s.url && !seen.has(s.url)) { seen.add(s.url); allSources.push(s); }
        }
        if (r.tokenUsage) {
          if (Number.isFinite(r.tokenUsage.total)) totalTokens += r.tokenUsage.total;
          if (Number.isFinite(r.tokenUsage.prompt)) totalPrompt += r.tokenUsage.prompt;
          if (Number.isFinite(r.tokenUsage.completion)) totalCompletion += r.tokenUsage.completion;
        }
        perStage.push({
          stage: stageNum,
          prompt: r.tokenUsage?.prompt,
          completion: r.tokenUsage?.completion,
          total: r.tokenUsage?.total,
          elapsedMs: r.elapsedMs,
          truncated: r.truncated,
          timedOut: false
        });
        return safeJsonParse(r.text) || {};
      } catch (error) {
        perStage.push({
          stage: stageNum,
          elapsedMs: error.elapsedMs,
          timedOut: !!error.timedOut,
          error: error.message,
          truncated: false
        });
        return {};
      }
    };

    const [p1, p2, p3] = await Promise.all([
      runIndependent(1, buildSpaceWeatherStage1Prompt(swInput), 2048, 0.3),
      runIndependent(2, buildSpaceWeatherStage2Prompt(swInput), 2500, 0.4),
      runIndependent(3, buildSpaceWeatherStage3Prompt(swInput), 3000, 0.3)
    ]);

    const successfulStages = perStage.filter(s => !s.timedOut && !s.error).length;
    if (successfulStages === 0) {
      return res.json({ success: false, error: "All Gemini stages failed.", data: { tokenUsage: { total: totalTokens, prompt: totalPrompt, completion: totalCompletion, perStage } } });
    }

    const mergedReport = { ...p1, ...p2, ...p3 };
    const normalizedReport = normalizeSpaceWeatherReport(mergedReport);

    const result = {
      generatedAt: new Date().toISOString(),
      report: normalizedReport,
      sources: allSources,
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      stages: successfulStages,
      tokenUsage: { total: totalTokens, prompt: totalPrompt, completion: totalCompletion, perStage }
    };
    spaceWeatherAICache.data = result;
    spaceWeatherAICache.timestamp = Date.now();
    res.json({ success: true, data: result });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

router.post("/mission-intelligence", async (req, res) => {
  try {
    const sat = req.body && req.body.satellite;
    if (!sat || !sat.noradId) {
      return res.status(400).json({ success: false, error: "Missing satellite payload." });
    }
    const result = await fetchMissionIntelligence(sat);
    res.json({ success: !result.error, data: result, error: result.error });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

router.post("/observation-data", async (req, res) => {
  try {
    const sat = req.body && req.body.satellite;
    if (!sat || !sat.noradId) {
      return res.status(400).json({ success: false, error: "Missing satellite payload." });
    }
    const result = await fetchObservationData(sat);
    res.json({ success: true, data: result });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

router.get("/eonet-events", async (req, res) => {
  try {
    const events = await fetchEONETEvents();
    res.json({ success: true, events });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

router.get("/iss-status", async (req, res) => {
  try {
    const data = await fetchISSData();
    res.json({ success: !!data, data });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

router.get("/constellation-health", async (req, res) => {
  try {
    const result = await fetchAllActiveSatellites();
    if (!result.success) {
      return res.json({ success: false, error: "Catalog unavailable." });
    }

    const expected = {
      "Starlink": { nominal: 5500, operator: "SpaceX" },
      "OneWeb": { nominal: 648, operator: "Eutelsat OneWeb" },
      "GPS": { nominal: 31, operator: "US Space Force" },
      "GLONASS": { nominal: 24, operator: "Roscosmos" },
      "Galileo": { nominal: 30, operator: "EU GSA" },
      "Beidou": { nominal: 35, operator: "CNSA" },
      "Iridium": { nominal: 75, operator: "Iridium Communications" },
      "Globalstar": { nominal: 48, operator: "Globalstar Inc" },
      "Orbcomm": { nominal: 31, operator: "Orbcomm" },
      "Planet Labs": { nominal: 200, operator: "Planet Labs" },
      "Spire": { nominal: 100, operator: "Spire Global" }
    };

    const health = {};
    Object.keys(expected).forEach(group => {
      const sats = result.satellites.filter(s => s.group === group);
      const tracked = sats.length;
      const nominal = expected[group].nominal;
      const recentEpochs = sats.filter(s => s.tleAgeDays !== null && s.tleAgeDays < 7).length;
      const staleEpochs = sats.filter(s => s.tleAgeDays !== null && s.tleAgeDays > 14).length;

      const avgAlt = sats.length > 0 ? sats.reduce((sum, s) => sum + s.altitude, 0) / sats.length : 0;
      const avgInc = sats.length > 0 ? sats.reduce((sum, s) => sum + (s.inclination || 0), 0) / sats.length : 0;

      const rawCoveragePct = nominal > 0 ? Math.round((tracked / nominal) * 100) : 0;

      health[group] = {
        operator: expected[group].operator,
        tracked: tracked,
        expectedNominal: nominal,
        coveragePct: Math.min(100, rawCoveragePct),
        rawCoveragePct: rawCoveragePct,
        recentTleCount: recentEpochs,
        staleTleCount: staleEpochs,
        averageAltitude: Math.round(avgAlt),
        averageInclination: Math.round(avgInc * 10) / 10,
        status: tracked >= nominal * 0.95 ? "Nominal" : tracked >= nominal * 0.8 ? "Degraded" : tracked > 0 ? "Partial" : "Unavailable",
        ids: sats.map(s => ({ noradId: s.noradId, name: s.name, altitude: s.altitude, tleAgeDays: s.tleAgeDays }))
      };
    });

    res.json({ success: true, constellations: health, generatedAt: new Date().toISOString() });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

router.get("/decay-watch", async (req, res) => {
  try {
    const result = await fetchAllActiveSatellites();
    if (!result.success) {
      return res.json({ success: false, error: "Catalog unavailable.", candidates: [] });
    }

    let f107Current = null;
    let f107Multiplier = 1.0;
    try {
      const sw = await fetchSpaceWeather();
      if (sw && sw.f107 && Number.isFinite(sw.f107.current)) {
        f107Current = sw.f107.current;
        f107Multiplier = computeF107Multiplier(f107Current);
      }
    } catch (error) {
      f107Multiplier = 1.0;
    }

    const candidates = result.satellites
      .filter(s => s.category === "LEO" && s.altitude < DECAY_WATCH_ALTITUDE_CEILING_KM && s.bstar && Math.abs(s.bstar) > 1e-4)
      .map(s => {
        const baseDecayRate = Math.abs(s.bstar) * s.altitude;
        const coupledDecayRate = baseDecayRate * f107Multiplier;
        const estimatedDaysToReentry = s.altitude / Math.max(0.05, coupledDecayRate * 100);
        const tier = (s.altitude < DECAY_WATCH_HIGH_CONFIDENCE_CEILING_KM) ? "highConfidence" : "heuristic";
        return {
          ...s,
          baseDecayRate: Math.round(baseDecayRate * 1000000) / 1000000,
          decayRate: Math.round(coupledDecayRate * 1000000) / 1000000,
          f107Multiplier: Math.round(f107Multiplier * 1000) / 1000,
          estimatedDaysToReentry: Math.round(estimatedDaysToReentry),
          decayRisk: estimatedDaysToReentry < 7 ? "Imminent" : estimatedDaysToReentry < 30 ? "High" : estimatedDaysToReentry < 90 ? "Moderate" : "Low",
          tier
        };
      })
      .filter(s => s.estimatedDaysToReentry < 90)
      .sort((a, b) => a.estimatedDaysToReentry - b.estimatedDaysToReentry);

    res.json({
      success: true,
      candidates,
      total: candidates.length,
      methodology: {
        f107Current,
        f107Multiplier: Math.round(f107Multiplier * 1000) / 1000,
        baseline: 100,
        altitudeCeilingKm: DECAY_WATCH_ALTITUDE_CEILING_KM,
        highConfidenceCeilingKm: DECAY_WATCH_HIGH_CONFIDENCE_CEILING_KM,
        formulation: "decayRate = |BSTAR| * altitude * f107Multiplier; estimatedDays = altitude / (decayRate * 100)",
        f107MultiplierFormulation: "clamp(0.7, 2.0, (F10.7 / 100)^1.35)",
        confidenceTiers: {
          highConfidence: `BSTAR signal AND altitude < ${DECAY_WATCH_HIGH_CONFIDENCE_CEILING_KM} km`,
          heuristic: `BSTAR signal at altitudes between ${DECAY_WATCH_HIGH_CONFIDENCE_CEILING_KM} and ${DECAY_WATCH_ALTITUDE_CEILING_KM} km; watch list candidate`
        }
      }
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

const warmCache = async () => {
  try {
    if (satelliteCache && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_DURATION) {
      return;
    }
    await startSharedFetch();
  } catch (error) {
  }
};

const warmSpaceWeather = async () => {
  try {
    await fetchSpaceWeather();
  } catch (error) {
  }
};

warmSpaceWeather();
setInterval(warmSpaceWeather, SPACE_WEATHER_TTL);

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of geminiCache) {
    if (now - v.timestamp > GEMINI_TTL) {
      geminiCache.delete(k);
    }
  }
  for (const [k, v] of observationCache) {
    if (now - v.timestamp > OBSERVATION_TTL) {
      observationCache.delete(k);
    }
  }
  if (spaceWeatherAICache.timestamp && now - spaceWeatherAICache.timestamp > PANEL_AI_TTL) {
    spaceWeatherAICache.data = null;
    spaceWeatherAICache.timestamp = 0;
  }
}, 60 * 60 * 1000);

module.exports = router;