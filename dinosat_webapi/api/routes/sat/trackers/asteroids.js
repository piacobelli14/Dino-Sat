const express = require("express");
const axios = require("axios");
const v8 = require("v8");
const fs = require("fs");
const os = require("os");
const router = express.Router();

const AU_KM = 149597870.7;
const SUN_GM = 1.32712440018e11;

const NASA_API_KEY = process.env.NASA_API_KEY || "DEMO_KEY";
const CONTACT_EMAIL = process.env.ASTEROID_CONTACT_EMAIL || "set-ASTEROID_CONTACT_EMAIL-env-var";

const SBDB_QUERY_BASE = "https://ssd-api.jpl.nasa.gov/sbdb_query.api";
const SBDB_LOOKUP_BASE = "https://ssd-api.jpl.nasa.gov/sbdb.api";
const NEOWS_FEED_BASE = "https://api.nasa.gov/neo/rest/v1/feed";
const NEOWS_BROWSE_BASE = "https://api.nasa.gov/neo/rest/v1/neo/browse";
const SENTRY_BASE = "https://ssd-api.jpl.nasa.gov/sentry.api";
const CAD_BASE = "https://ssd-api.jpl.nasa.gov/cad.api";

const AXIOS_CONFIG = {
  timeout: 240000,
  maxContentLength: Infinity,
  maxBodyLength: Infinity,
  headers: {
    "User-Agent": `AsteroidTracker-Research/1.0 (+contact: ${CONTACT_EMAIL})`,
    "Accept": "application/json, text/plain, */*",
    "Accept-Encoding": "gzip, deflate"
  }
};

const OBSERVATION_AXIOS_TIMEOUT_MS = 8000;

const CACHE_DURATION = 6 * 60 * 60 * 1000;
const NEO_WATCH_TTL = 15 * 60 * 1000;
const GEMINI_TTL = 24 * 60 * 60 * 1000;
const OBSERVATION_TTL = 60 * 60 * 1000;
const PANEL_AI_TTL = 60 * 60 * 1000;
const SENTRY_TTL = 60 * 60 * 1000;
const POPULATION_TTL = 6 * 60 * 60 * 1000;
const GEMINI_CACHE_MAX_ENTRIES = 500;
const OBSERVATION_CACHE_MAX_ENTRIES = 500;
const GEMINI_STAGE_TIMEOUT_MS = 25000;

const FETCH_CONCURRENCY = 2;
const FETCH_MAX_RETRIES = 4;
const FETCH_RETRY_BASE_MS = 750;
const FETCH_RETRY_CAP_MS = 8000;

const MEMORY_SAMPLE_WINDOW = 64;
const MEMORY_ROW_CHECK_STRIDE = 500;
const MEMORY_PROJECTION_SIGMA = 2;

const SENTRY_HIGH_CONFIDENCE_DIAMETER_KM = 0.14;

const ASTEROID_ALERTS = {
  sentry: "https://ssd-api.jpl.nasa.gov/sentry.api",
  scout: "https://ssd-api.jpl.nasa.gov/scout.api",
  cad: "https://ssd-api.jpl.nasa.gov/cad.api",
  fireball: "https://ssd-api.jpl.nasa.gov/fireball.api",
  sentryRefreshMs: 60 * 60 * 1000,
  scoutRefreshMs: 15 * 60 * 1000,
  cadRefreshMs: 60 * 60 * 1000,
  fireballRefreshMs: 60 * 60 * 1000,
  failureRetryMs: 15 * 60 * 1000,
  timeoutMs: 30000,
  sentryWarningTorino: 1,
  sentryCriticalTorino: 2,
  sentryWarningPalermo: -2,
  sentryCriticalPalermo: 0,
  scoutWarningRating: 3,
  scoutCriticalRating: 4,
  scoutRatingLabels: ["Negligible", "Small", "Modest", "Moderate", "Elevated"],
  closeApproachDays: 7,
  closeApproachMaxLd: 1,
  closeApproachCriticalKm: 42164,
  largeObjectMaxH: 22,
  largeObjectDays: 14,
  largeObjectMaxLd: 5,
  fireballDays: 14,
  fireballWarningKt: 1,
  fireballCriticalKt: 10,
  fireballNearKm: 1000,
  lunarDistanceKm: 384400,
  earthRadiusKm: 6371,
  maxPoints: 25
};

const ASTEROID_ANALYSIS = {
  name: "Gemini",
  endpoint: "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
  model: process.env.ASTEROID_ANALYSIS_MODEL || "gemini-3.5-flash-lite",
  thinkingLevel: process.env.ASTEROID_ANALYSIS_THINKING || "low",
  temperature: 0.3,
  maxOutputTokens: 1200,
  timeoutMs: 25000,
  cacheMs: 60 * 60 * 1000,
  retryAfterMs: 60 * 1000,
  cacheLimit: 300,
  instructions: "You are a senior planetary defense analyst briefing a member of the public about one active alert raised by a live asteroid tracking dashboard. The alert is either a NASA JPL Sentry impact risk assessment, a JPL Scout assessment of an unconfirmed object on the Minor Planet Center confirmation page, a JPL close approach to Earth, or a fireball reported by United States government sensors to NASA CNEOS. Use only the alert data provided and never invent facts, objects, places, numbers, causes, or times. Write in plain, calm, direct language and keep impact risks in proportion, explaining that most small probabilities fall as more observations arrive when the data supports that. The summary must be 2 to 4 complete sentences that say what the object or event is, how close or how likely it is, how serious it is, and when it matters. List the specific risks, and say clearly when something cannot be known from the data, such as the size of an object known only from its brightness. List concrete monitoring or follow-up actions in priority order. The timing field must be one complete sentence about when the event occurs or occurred and how long it is likely to matter. The confidence field must be one complete sentence explaining how reliable the alert is based on its source, the observation arc, and the uncertainty. Every list item must be a complete sentence that ends with a period."
};

const CATEGORY_COLORS = {
  "Atira": "#FF4081",
  "Aten": "#FF6B6B",
  "Apollo": "#FF9500",
  "Amor": "#FFE66D",
  "Main Belt Inner": "#4ECDC4",
  "Main Belt Middle": "#42A5F5",
  "Main Belt Outer": "#00BCD4",
  "Hilda": "#AB47BC",
  "Jupiter Trojan": "#A8E6CF",
  "Centaur": "#FFA726",
  "TNO": "#9C27B0",
  "KBO": "#E91E63",
  "Comet": "#00D4FF",
  "Unclassified": "#808080"
};

const SBDB_FIELDS_FULL = "spkid,full_name,pdes,name,prefix,neo,pha,H,diameter,albedo,rot_per,GM,extent,spec_B,spec_T,class,a,e,i,om,w,ma,epoch,moid,moid_jup,n_obs_used,first_obs,last_obs,producer";
const SBDB_FIELDS_BASIC = "spkid,full_name,pdes,name,neo,pha,H,diameter,albedo,rot_per,spec_B,spec_T,class,a,e,i,om,w,ma,epoch,moid,moid_jup,n_obs_used,first_obs,last_obs";

const SBDB_QUERIES = [
  {
    name: "PHA Catalog",
    params: {
      "fields": SBDB_FIELDS_FULL,
      "sb-group": "pha",
      "full-prec": "true"
    },
    label: "PHA"
  },
  {
    name: "Atira (Inner Earth Objects)",
    params: {
      "fields": SBDB_FIELDS_BASIC,
      "sb-class": "IEO",
      "full-prec": "true"
    },
    label: "ATI"
  },
  {
    name: "Aten",
    params: {
      "fields": SBDB_FIELDS_BASIC,
      "sb-class": "ATE",
      "full-prec": "true"
    },
    label: "ATE"
  },
  {
    name: "Apollo",
    params: {
      "fields": SBDB_FIELDS_BASIC,
      "sb-class": "APO",
      "full-prec": "true"
    },
    label: "APO"
  },
  {
    name: "Amor",
    params: {
      "fields": SBDB_FIELDS_BASIC,
      "sb-class": "AMO",
      "full-prec": "true"
    },
    label: "AMO"
  },
  {
    name: "Mars-Crossing",
    params: {
      "fields": SBDB_FIELDS_BASIC,
      "sb-class": "MCA",
      "full-prec": "true"
    },
    label: "MCA"
  },
  {
    name: "Inner Main Belt",
    params: {
      "fields": SBDB_FIELDS_BASIC,
      "sb-class": "IMB",
      "full-prec": "true"
    },
    label: "IMB"
  },
  {
    name: "Main Belt",
    params: {
      "fields": SBDB_FIELDS_BASIC,
      "sb-class": "MBA",
      "full-prec": "true"
    },
    label: "MBA"
  },
  {
    name: "Outer Main Belt",
    params: {
      "fields": SBDB_FIELDS_BASIC,
      "sb-class": "OMB",
      "full-prec": "true"
    },
    label: "OMB"
  },
  {
    name: "Jupiter Trojans",
    params: {
      "fields": SBDB_FIELDS_BASIC,
      "sb-class": "TJN",
      "full-prec": "true"
    },
    label: "TJN"
  },
  {
    name: "Centaurs",
    params: {
      "fields": SBDB_FIELDS_BASIC,
      "sb-class": "CEN",
      "full-prec": "true"
    },
    label: "CEN"
  },
  {
    name: "Trans-Neptunian",
    params: {
      "fields": SBDB_FIELDS_BASIC,
      "sb-class": "TNO",
      "full-prec": "true"
    },
    label: "TNO"
  }
];

const detectContainerMemoryLimit = () => {
  const candidates = [];
  let totalMem = 0;
  try {
    totalMem = os.totalmem();
  } catch (error) {}
  const sanityCeiling = totalMem > 0 ? totalMem * 4 : Number.MAX_SAFE_INTEGER;
  const tryRead = (filePath) => {
    try {
      const content = fs.readFileSync(filePath, "utf8").trim();
      if (!content || content === "max") return null;
      const n = parseInt(content);
      if (!Number.isFinite(n) || n <= 0 || n > sanityCeiling) return null;
      return n;
    } catch (error) {
      return null;
    }
  };
  const v2 = tryRead("/sys/fs/cgroup/memory.max");
  if (v2 !== null) candidates.push({ source: "cgroup_v2", bytes: v2 });
  const v1 = tryRead("/sys/fs/cgroup/memory/memory.limit_in_bytes");
  if (v1 !== null) candidates.push({ source: "cgroup_v1", bytes: v1 });
  const envBytes = process.env.MEMORY_LIMIT_BYTES;
  if (envBytes) {
    const n = parseInt(String(envBytes).trim());
    if (Number.isFinite(n) && n > 0 && n <= sanityCeiling) {
      candidates.push({ source: "env:MEMORY_LIMIT_BYTES", bytes: n });
    }
  }
  const envMB = process.env.MEMORY_LIMIT_MB;
  if (envMB) {
    const n = parseFloat(String(envMB).trim()) * 1024 * 1024;
    if (Number.isFinite(n) && n > 0 && n <= sanityCeiling) {
      candidates.push({ source: "env:MEMORY_LIMIT_MB", bytes: n });
    }
  }
  if (totalMem > 0) {
    candidates.push({ source: "os_totalmem", bytes: totalMem });
  }
  try {
    const v8limit = v8.getHeapStatistics().heap_size_limit;
    if (Number.isFinite(v8limit) && v8limit > 0) {
      candidates.push({ source: "v8_heap_limit", bytes: v8limit });
    }
  } catch (error) {}
  if (candidates.length === 0) {
    return { bytes: null, sources: [], chosen: null };
  }
  candidates.sort((a, b) => a.bytes - b.bytes);
  return { bytes: candidates[0].bytes, sources: candidates, chosen: candidates[0].source };
};

const containerMemoryDetection = detectContainerMemoryLimit();

class AdaptiveMemoryGuard {
  constructor() {
    const mem = process.memoryUsage();
    this.rssDeltaSamples = [];
    this.heapDeltaSamples = [];
    this.maxSamples = MEMORY_SAMPLE_WINDOW;
    this.beginRssMark = mem.rss;
    this.beginHeapMark = mem.heapUsed;
    this.haltedQueries = [];
    this.haltedRowsTotal = 0;
    this.gcTriggeredCount = 0;
    this.lastGCBytesFreed = 0;
    this.peakRssBytes = mem.rss;
    this.peakHeapUsedBytes = mem.heapUsed;
    this.createdAt = Date.now();
    this.detection = containerMemoryDetection;
    this.effectiveLimit = containerMemoryDetection.bytes;
  }

  beginBatch() {
    const mem = process.memoryUsage();
    this.beginRssMark = mem.rss;
    this.beginHeapMark = mem.heapUsed;
  }

  endBatch() {
    const mem = process.memoryUsage();
    if (mem.rss > this.peakRssBytes) {
      this.peakRssBytes = mem.rss;
    }
    if (mem.heapUsed > this.peakHeapUsedBytes) {
      this.peakHeapUsedBytes = mem.heapUsed;
    }
    const rssDelta = mem.rss - this.beginRssMark;
    const heapDelta = mem.heapUsed - this.beginHeapMark;
    if (rssDelta > 0) {
      this.rssDeltaSamples.push(rssDelta);
      if (this.rssDeltaSamples.length > this.maxSamples) {
        this.rssDeltaSamples.shift();
      }
    }
    if (heapDelta > 0) {
      this.heapDeltaSamples.push(heapDelta);
      if (this.heapDeltaSamples.length > this.maxSamples) {
        this.heapDeltaSamples.shift();
      }
    }
    this.beginRssMark = mem.rss;
    this.beginHeapMark = mem.heapUsed;
  }

  tryGC() {
    if (typeof global.gc !== "function") {
      return 0;
    }
    const before = process.memoryUsage().rss;
    try {
      global.gc();
    } catch (error) {
      return 0;
    }
    const after = process.memoryUsage();
    const freed = Math.max(0, before - after.rss);
    this.lastGCBytesFreed = freed;
    this.gcTriggeredCount++;
    this.beginRssMark = after.rss;
    this.beginHeapMark = after.heapUsed;
    return freed;
  }

  projectedNextBatch() {
    if (this.rssDeltaSamples.length === 0) {
      return 0;
    }
    const sum = this.rssDeltaSamples.reduce((a, b) => a + b, 0);
    const mean = sum / this.rssDeltaSamples.length;
    const variance = this.rssDeltaSamples.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / this.rssDeltaSamples.length;
    const stdDev = Math.sqrt(variance);
    const peak = Math.max(...this.rssDeltaSamples);
    return Math.max(peak, mean + MEMORY_PROJECTION_SIGMA * stdDev);
  }

  canIngestMore() {
    const mem = process.memoryUsage();
    const limit = this.effectiveLimit;
    if (!limit || !Number.isFinite(limit) || limit <= 0) {
      return true;
    }
    const projected = this.projectedNextBatch();
    if (projected === 0) {
      const external = mem.external || 0;
      const arrayBuffers = mem.arrayBuffers || 0;
      const inFlightAtRisk = Math.max(external + arrayBuffers, mem.heapTotal - mem.heapUsed);
      return (mem.rss + inFlightAtRisk) < limit;
    }
    return (mem.rss + projected) < limit;
  }

  recordHaltedQuery(queryName, rowsAccepted, rowsRemaining) {
    const mem = process.memoryUsage();
    this.haltedQueries.push({
      query: queryName,
      rowsAccepted: rowsAccepted,
      rowsRemaining: rowsRemaining,
      rssAtHaltBytes: mem.rss,
      heapUsedAtHaltBytes: mem.heapUsed,
      externalAtHaltBytes: mem.external || 0,
      effectiveLimitBytes: this.effectiveLimit,
      atFraction: this.effectiveLimit && this.effectiveLimit > 0 ? mem.rss / this.effectiveLimit : 0
    });
    if (rowsRemaining > 0) {
      this.haltedRowsTotal += rowsRemaining;
    }
  }

  snapshot() {
    const mem = process.memoryUsage();
    const heap = v8.getHeapStatistics();
    const limit = this.effectiveLimit;
    const projected = this.projectedNextBatch();
    return {
      rssBytes: mem.rss,
      heapUsedBytes: mem.heapUsed,
      heapTotalBytes: mem.heapTotal,
      heapLimitBytes: heap.heap_size_limit,
      externalBytes: mem.external || 0,
      arrayBuffersBytes: mem.arrayBuffers || 0,
      effectiveLimitBytes: limit,
      effectiveLimitSource: this.detection.chosen,
      effectiveLimitCandidates: this.detection.sources,
      usedFractionOfLimit: limit && limit > 0 ? mem.rss / limit : 0,
      usedFraction: heap.heap_size_limit > 0 ? mem.heapUsed / heap.heap_size_limit : 0,
      availableBytes: limit ? Math.max(0, limit - mem.rss) : Math.max(0, heap.heap_size_limit - mem.heapUsed),
      projectedNextBatchBytes: projected,
      sampleCount: this.rssDeltaSamples.length,
      heapSampleCount: this.heapDeltaSamples.length,
      haltedQueries: this.haltedQueries.slice(),
      haltedRowsTotal: this.haltedRowsTotal,
      peakRssBytes: this.peakRssBytes,
      peakHeapUsedBytes: this.peakHeapUsedBytes,
      gcTriggeredCount: this.gcTriggeredCount,
      lastGCBytesFreedBytes: this.lastGCBytesFreed,
      gcAvailable: typeof global.gc === "function",
      ageMs: Date.now() - this.createdAt
    };
  }
}

let lastMemorySnapshot = null;

let asteroidCache = null;
let cacheTimestamp = null;
let inflightFetch = null;
let partialAccumulation = [];
const fetchSubscribers = new Set();

let neoWatchCache = null;
let neoWatchTimestamp = null;
let inflightNEOWatch = null;

let sentryCache = null;
let sentryCacheTimestamp = null;

let populationCache = null;
let populationCacheTimestamp = null;

const geminiCache = new Map();
const observationCache = new Map();
const neoWatchAICache = { data: null, timestamp: 0 };

const apiBreakers = {
  jplSBDB: { state: "closed", consecutiveFailures: 0, failureThreshold: 3, openedAtMs: 0, cooldownMs: 5 * 60 * 1000, halfOpenAfterMs: 60 * 1000, lastError: null, lastSuccessMs: 0, totalRequests: 0, totalFailures: 0 },
  neoWs: { state: "closed", consecutiveFailures: 0, failureThreshold: 3, openedAtMs: 0, cooldownMs: 5 * 60 * 1000, halfOpenAfterMs: 60 * 1000, lastError: null, lastSuccessMs: 0, totalRequests: 0, totalFailures: 0 },
  sentry: { state: "closed", consecutiveFailures: 0, failureThreshold: 3, openedAtMs: 0, cooldownMs: 5 * 60 * 1000, halfOpenAfterMs: 60 * 1000, lastError: null, lastSuccessMs: 0, totalRequests: 0, totalFailures: 0 }
};

const breakerCanCall = (breaker) => {
  if (breaker.state === "closed") return true;
  const now = Date.now();
  if (breaker.state === "open") {
    if (now - breaker.openedAtMs >= breaker.cooldownMs) {
      breaker.state = "half-open";
      return true;
    }
    return false;
  }
  return true;
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

const delay = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
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

const safeJsonParse = (text) => {
  if (!text) return null;
  let cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  try {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.substring(start, end + 1));
    }
  } catch (error) {}
  try {
    return JSON.parse(cleaned);
  } catch (error) {
    return null;
  }
};

const computeObservationArcDays = (firstObs, lastObs) => {
  try {
    const first = new Date(firstObs);
    const last = new Date(lastObs);
    if (isNaN(first.getTime()) || isNaN(last.getTime())) return null;
    return (last.getTime() - first.getTime()) / 86400000;
  } catch (error) {
    return null;
  }
};

const classifyAsteroid = (a, e, i, perihelion, aphelion, isNEO, isPHA, orbitClass) => {
  if (orbitClass) {
    const c = String(orbitClass).toUpperCase();
    if (c === "ATI" || c === "ATIRA") return "Atira";
    if (c === "ATE" || c === "ATEN") return "Aten";
    if (c === "APO" || c === "APOLLO") return "Apollo";
    if (c === "AMO" || c === "AMOR") return "Amor";
    if (c === "HIL" || c === "HILDA") return "Hilda";
    if (c === "TJN" || c === "JTR" || c.includes("TROJAN")) return "Jupiter Trojan";
    if (c === "CEN" || c === "CENTAUR") return "Centaur";
    if (c === "TNO" || c.includes("TRANS-NEPTUN")) return "TNO";
    if (c === "KBO" || c.includes("KUIPER")) return "KBO";
    if (c === "HYA" || c === "HYC" || c === "PAA" || c === "PAR") return "Comet";
    if (c.includes("COMET") || c === "JFC" || c === "HFC" || c === "ETC" || c === "HTC") return "Comet";
  }
  if (e > 1) return "Comet";
  if (isNEO) {
    if (aphelion < 0.983) return "Atira";
    if (a < 1.0 && aphelion > 0.983) return "Aten";
    if (a > 1.0 && perihelion < 1.017) return "Apollo";
    if (perihelion >= 1.017 && perihelion < 1.3) return "Amor";
  }
  if (a >= 2.06 && a < 2.5) return "Main Belt Inner";
  if (a >= 2.5 && a < 2.82) return "Main Belt Middle";
  if (a >= 2.82 && a < 3.27) return "Main Belt Outer";
  if (a >= 3.27 && a < 4.6) return "Hilda";
  if (a >= 4.6 && a < 5.5) return "Jupiter Trojan";
  if (a >= 5.5 && a < 30.1) return "Centaur";
  if (a >= 30.1 && a < 50) return "TNO";
  if (a >= 50) return "KBO";
  return "Unclassified";
};

const inferGroup = (name, designation, category) => {
  const lowerName = (name || "").toLowerCase();
  const lowerDes = (designation || "").toLowerCase();
  if (lowerName.includes("apophis")) return "Apophis";
  if (lowerName.includes("bennu")) return "Bennu";
  if (lowerName.includes("ryugu")) return "Ryugu";
  if (lowerName.includes("itokawa")) return "Itokawa";
  if (lowerName.includes("eros")) return "Eros";
  if (lowerName.includes("vesta")) return "Vesta";
  if (lowerName.includes("ceres")) return "Ceres";
  if (lowerName.includes("pallas")) return "Pallas";
  if (lowerName.includes("juno")) return "Juno";
  if (lowerName.includes("hygiea")) return "Hygiea";
  if (lowerName.includes("psyche")) return "Psyche";
  if (lowerName.includes("dimorphos") || lowerName.includes("didymos")) return "Didymos System";
  if (lowerName.includes("steins")) return "Steins";
  if (lowerName.includes("lutetia")) return "Lutetia";
  if (lowerName.includes("mathilde")) return "Mathilde";
  if (lowerName.includes("ida") && !lowerName.includes("idahoe")) return "Ida";
  if (lowerName.includes("gaspra")) return "Gaspra";
  if (lowerName.includes("hayabusa")) return "Hayabusa Target";
  if (lowerName.includes("don quijote")) return "Don Quijote";
  if (lowerName.includes("kleopatra")) return "Kleopatra";
  if (lowerName.includes("oumuamua")) return "Interstellar";
  if (lowerName.includes("borisov")) return "Interstellar";
  if (category) return category;
  return "General";
};

const buildAsteroidFromSBDB = (fields, dataRow, source) => {
  try {
    const get = (fieldName) => {
      const idx = fields.indexOf(fieldName);
      return idx >= 0 ? dataRow[idx] : null;
    };

    const fullName = get("full_name") || "";
    const pdes = get("pdes") || "";
    const name = get("name") || "";
    const prefix = get("prefix") || "";
    const spkid = get("spkid") || "";
    const cleanName = (name && name.trim()) || (fullName && fullName.trim()) || pdes || spkid;
    const designation = pdes || prefix || spkid || "";

    const a = parseFloat(get("a"));
    const e = parseFloat(get("e"));
    const i = parseFloat(get("i"));
    const om = parseFloat(get("om"));
    const w = parseFloat(get("w"));
    const ma = parseFloat(get("ma"));
    const epoch = parseFloat(get("epoch"));
    const moid = parseFloat(get("moid"));
    const moidJup = parseFloat(get("moid_jup"));
    const h = parseFloat(get("H"));
    const diameter = parseFloat(get("diameter"));
    const albedo = parseFloat(get("albedo"));
    const rotPer = parseFloat(get("rot_per"));
    const gm = parseFloat(get("GM"));
    const numObs = parseInt(get("n_obs_used"));
    const firstObs = get("first_obs");
    const lastObs = get("last_obs");
    const orbitClass = get("class");
    const neoFlag = get("neo");
    const phaFlag = get("pha");
    const specB = get("spec_B");
    const specT = get("spec_T");

    if (!Number.isFinite(a) || !Number.isFinite(e) || !Number.isFinite(epoch)) {
      return null;
    }
    const isElliptic = e < 1 && a > 0;
    const isHyperbolic = e > 1 && a < 0;
    if (!isElliptic && !isHyperbolic) {
      return null;
    }

    const isNEO = neoFlag === "Y" || neoFlag === true || neoFlag === "1";
    const isPHA = phaFlag === "Y" || phaFlag === true || phaFlag === "1";

    const perihelion = isHyperbolic ? Math.abs(a) * (e - 1) : a * (1 - e);
    const aphelion = isElliptic ? a * (1 + e) : Infinity;
    const period = isElliptic ? Math.sqrt(Math.pow(a, 3)) : 0;
    const periodDays = period * 365.25;

    const category = classifyAsteroid(a, e, i, perihelion, aphelion, isNEO, isPHA, orbitClass);
    const color = CATEGORY_COLORS[category] || "#FFFFFF";
    const group = inferGroup(cleanName, designation, category);
    const observationArcDays = computeObservationArcDays(firstObs, lastObs);
    const epochISO = (() => {
      try {
        const ms = (epoch - 2440587.5) * 86400000;
        const d = new Date(ms);
        return d.toISOString();
      } catch (error) {
        return null;
      }
    })();

    const aphelionAUOut = isElliptic ? Math.round(aphelion * 100000) / 100000 : null;
    const aphelionKmOut = isElliptic ? Math.round(aphelion * AU_KM) : null;

    return {
      id: `ast_${spkid || designation || cleanName}`,
      name: cleanName,
      designation: designation,
      spkid: spkid,
      category: category,
      group: group,
      color: color,
      active: false,
      source: source,
      status: "Active",
      isPHA: isPHA,
      isNEO: isNEO,
      isHyperbolic: isHyperbolic,
      h: Number.isFinite(h) ? h : null,
      diameter: Number.isFinite(diameter) ? Math.round(diameter * 1000) / 1000 : null,
      albedo: Number.isFinite(albedo) ? Math.round(albedo * 1000) / 1000 : null,
      rotationPeriod: Number.isFinite(rotPer) ? Math.round(rotPer * 100) / 100 : null,
      gm: Number.isFinite(gm) ? gm : null,
      spectralTypeB: specB || null,
      spectralTypeT: specT || null,
      moidAU: Number.isFinite(moid) ? Math.round(moid * 1000000) / 1000000 : null,
      jupiterMOIDAU: Number.isFinite(moidJup) ? Math.round(moidJup * 10000) / 10000 : null,
      observationArcDays: observationArcDays !== null ? Math.round(observationArcDays) : null,
      numObs: Number.isFinite(numObs) ? numObs : null,
      firstObs: firstObs,
      lastObs: lastObs,
      epochISO: epochISO,
      orbitalPeriodYears: Math.round(period * 1000) / 1000,
      orbitalPeriodDays: Math.round(periodDays * 100) / 100,
      perihelionAU: Math.round(perihelion * 100000) / 100000,
      aphelionAU: aphelionAUOut,
      perihelionKm: Math.round(perihelion * AU_KM),
      aphelionKm: aphelionKmOut,
      semiMajorAxisAU: Math.round(a * 100000) / 100000,
      eccentricity: Math.round(e * 1000000) / 1000000,
      inclination: Number.isFinite(i) ? Math.round(i * 100) / 100 : 0,
      raan: Number.isFinite(om) ? Math.round(om * 100) / 100 : 0,
      argOfPerihelion: Number.isFinite(w) ? Math.round(w * 100) / 100 : 0,
      meanAnomaly: Number.isFinite(ma) ? Math.round(ma * 100) / 100 : 0,
      elements: {
        a: a,
        e: e,
        i: Number.isFinite(i) ? i : 0,
        om: Number.isFinite(om) ? om : 0,
        w: Number.isFinite(w) ? w : 0,
        ma: Number.isFinite(ma) ? ma : 0,
        epoch: epoch
      }
    };
  } catch (error) {
    return null;
  }
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

      if (status === 403 || status === 404) {
        break;
      }
      if (attempt === FETCH_MAX_RETRIES) {
        break;
      }
      const isTransient = status === 503 || status === 502 || status === 504 || status === 429;
      const baseWait = isTransient ? FETCH_RETRY_BASE_MS * 4 : FETCH_RETRY_BASE_MS;
      const cap = isTransient ? FETCH_RETRY_CAP_MS * 3 : FETCH_RETRY_CAP_MS;
      const waitTime = Math.min(baseWait * Math.pow(2, attempt - 1), cap);
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
      if (i >= tasks.length) break;
      results[i] = await tasks[i]();
    }
  });
  await Promise.all(workers);
  return results;
};

let observedBytesPerRow = 0;
let observedSampleQueries = 0;

const updateBytesPerRowObservation = (rssBefore, rssAfter, rowCount) => {
  if (rowCount <= 0) return;
  const delta = rssAfter - rssBefore;
  if (delta <= 0) return;
  const bytesPerRow = delta / rowCount;
  observedSampleQueries++;
  if (bytesPerRow > observedBytesPerRow) {
    observedBytesPerRow = bytesPerRow;
  }
};

const computeAdaptiveQueryLimit = () => {
  const detectedLimit = containerMemoryDetection.bytes;
  if (!detectedLimit) return null;
  if (observedBytesPerRow <= 0 || observedSampleQueries < 2) return null;
  const mem = process.memoryUsage();
  const conservativePerRow = observedBytesPerRow * 3;
  const availableForResponse = Math.max(0, detectedLimit - mem.rss - mem.heapTotal);
  if (availableForResponse <= 0) return 1;
  return Math.max(1, Math.floor(availableForResponse / conservativePerRow));
};

const fetchSBDBQuery = async (query) => {
  if (!breakerCanCall(apiBreakers.jplSBDB)) {
    throw new Error(`JPL SBDB circuit breaker open (${apiBreakers.jplSBDB.consecutiveFailures} prior failures).`);
  }
  apiBreakers.jplSBDB.totalRequests++;

  const params = new URLSearchParams(query.params);
  const adaptiveLimit = computeAdaptiveQueryLimit();
  if (adaptiveLimit !== null) {
    params.set("limit", String(adaptiveLimit));
  }
  const url = `${SBDB_QUERY_BASE}?${params.toString()}`;

  try {
    const response = await fetchWithRetry(url, AXIOS_CONFIG, query.name);
    breakerOnSuccess(apiBreakers.jplSBDB);
    return response.data;
  } catch (error) {
    breakerOnFailure(apiBreakers.jplSBDB, error);
    throw error;
  }
};

const doFetchAllAsteroids = async (callbacks = {}) => {
  const { onBatch, onProgress, onError, isCancelled } = callbacks;

  const allAsteroids = [];
  const errors = [];
  const seenIds = new Set();
  let successfulSources = 0;
  let completed = 0;
  let memoryHaltedSources = 0;
  const overallStart = Date.now();
  const memoryGuard = new AdaptiveMemoryGuard();

  const tasks = SBDB_QUERIES.map(query => async () => {
    if (isCancelled && isCancelled()) {
      return;
    }
    if (!memoryGuard.canIngestMore()) {
      memoryGuard.tryGC();
      if (!memoryGuard.canIngestMore()) {
        const msg = `Skipped ${query.name} because the memory budget was exhausted before the query started.`;
        errors.push(msg);
        memoryGuard.recordHaltedQuery(query.name, 0, -1);
        memoryHaltedSources++;
        if (onError) {
          try {
            onError(query.name, "The memory budget was exhausted before the query.");
          } catch (error) {}
        }
        completed++;
        if (onProgress) {
          try {
            onProgress({
              completed,
              total: SBDB_QUERIES.length,
              successful: successfulSources,
              memoryHaltedSources,
              memory: memoryGuard.snapshot()
            });
          } catch (error) {}
        }
        return;
      }
    }
    try {
      const rssBeforeQuery = process.memoryUsage().rss;
      let data = await fetchSBDBQuery(query);
      if (!data || !data.fields || !data.data) {
        throw new Error("The SBDB response was malformed.");
      }
      const fields = data.fields;
      const rows = data.data;
      const totalRows = rows.length;
      const newOnes = [];
      let processed = 0;
      let halted = false;

      memoryGuard.beginBatch();
      for (let r = 0; r < totalRows; r++) {
        if (r > 0 && (r % MEMORY_ROW_CHECK_STRIDE) === 0) {
          memoryGuard.endBatch();
          if (!memoryGuard.canIngestMore()) {
            memoryGuard.tryGC();
            if (!memoryGuard.canIngestMore()) {
              memoryGuard.recordHaltedQuery(query.name, processed, totalRows - processed);
              memoryHaltedSources++;
              halted = true;
              break;
            }
          }
          memoryGuard.beginBatch();
        }
        const asteroid = buildAsteroidFromSBDB(fields, rows[r], query.name);
        processed++;
        if (!asteroid) continue;
        if (seenIds.has(asteroid.id)) continue;
        seenIds.add(asteroid.id);
        allAsteroids.push(asteroid);
        newOnes.push(asteroid);
      }
      memoryGuard.endBatch();

      data.data = null;
      data = null;

      updateBytesPerRowObservation(rssBeforeQuery, process.memoryUsage().rss, processed);

      if (!halted) {
        successfulSources++;
      }
      if (newOnes.length > 0 && onBatch) {
        try {
          onBatch(newOnes, query.name);
        } catch (error) {}
      }
      if (halted && onError) {
        try {
          onError(query.name, `The query stopped at row ${processed} of ${totalRows} to stay within the memory budget.`);
        } catch (error) {}
      }
    } catch (error) {
      const msg = `Failed to fetch ${query.name}: ${error.message}.`;
      errors.push(msg);
      if (onError) {
        try {
          onError(query.name, error.message);
        } catch (error) {}
      }
    } finally {
      completed++;
      memoryGuard.tryGC();
      if (onProgress) {
        try {
          onProgress({
            completed,
            total: SBDB_QUERIES.length,
            successful: successfulSources,
            memoryHaltedSources,
            memory: memoryGuard.snapshot()
          });
        } catch (error) {}
      }
    }
  });

  await runWithConcurrency(tasks, FETCH_CONCURRENCY);

  allAsteroids.sort((a, b) => {
    if (a.isPHA !== b.isPHA) return a.isPHA ? -1 : 1;
    if (a.isNEO !== b.isNEO) return a.isNEO ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  lastMemorySnapshot = memoryGuard.snapshot();

  return {
    success: allAsteroids.length > 0,
    asteroids: allAsteroids,
    errors: errors,
    metadata: {
      totalSources: SBDB_QUERIES.length,
      successfulSources: successfulSources,
      memoryHaltedSources: memoryHaltedSources,
      totalAsteroids: allAsteroids.length,
      cached: false,
      memoryOptimized: true,
      memoryAware: true,
      memory: lastMemorySnapshot,
      activeRenderingLimit: 100,
      provider: "JPL SBDB",
      loadTimeMs: Date.now() - overallStart
    }
  };
};

const startSharedFetch = () => {
  if (inflightFetch) return inflightFetch;
  partialAccumulation = [];

  const promise = (async () => {
    return await doFetchAllAsteroids({
      onBatch: (newOnes, source) => {
        partialAccumulation.push(...newOnes);
        for (const sub of fetchSubscribers) {
          try {
            if (sub.onBatch) sub.onBatch(newOnes, source);
          } catch (error) {}
        }
      },
      onProgress: (info) => {
        for (const sub of fetchSubscribers) {
          try {
            if (sub.onProgress) sub.onProgress(info);
          } catch (error) {}
        }
      },
      onError: (source, error) => {
        for (const sub of fetchSubscribers) {
          try {
            if (sub.onError) sub.onError(source, error);
          } catch (error) {}
        }
      },
      isCancelled: () => false
    });
  })();

  inflightFetch = promise;

  promise.then(result => {
    if (result && result.success) {
      asteroidCache = result;
      cacheTimestamp = Date.now();
    }
  }).catch(() => {}).finally(() => {
    inflightFetch = null;
    partialAccumulation = [];
  });

  return promise;
};

const fetchAllAsteroids = async () => {
  if (asteroidCache && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
    return asteroidCache;
  }
  try {
    return await startSharedFetch();
  } catch (error) {
    return {
      success: false,
      error: `An unexpected error occurred: ${error.message}.`,
      asteroids: [],
      errors: [`An unexpected error occurred: ${error.message}.`],
      metadata: { totalSources: 0, successfulSources: 0, totalAsteroids: 0, cached: false }
    };
  }
};

const fetchSentryWatch = async () => {
  if (sentryCache && sentryCacheTimestamp && Date.now() - sentryCacheTimestamp < SENTRY_TTL) {
    return sentryCache;
  }
  if (!breakerCanCall(apiBreakers.sentry)) {
    throw new Error("Sentry API circuit breaker is open.");
  }
  apiBreakers.sentry.totalRequests++;
  try {
    const r = await axios.get(`${SENTRY_BASE}?all=1`, AXIOS_CONFIG);
    breakerOnSuccess(apiBreakers.sentry);
    const objects = (r.data?.data || []).map(o => ({
      des: o.des,
      fullname: o.fullname,
      year_range: o.year_range,
      range: o.year_range,
      nImp: parseInt(o.n_imp) || 0,
      ipScientific: o.ip_scientific || o.ip || "—",
      ip: parseFloat(o.ip) || 0,
      psCum: o.ps_cum || "—",
      psMax: o.ps_max || "—",
      tsMax: o.ts_max || "0",
      diameter: o.diameter ? Math.round(parseFloat(o.diameter) * 1000) / 1000 : null,
      h: o.h !== undefined ? parseFloat(o.h) : null,
      vInf: parseFloat(o.v_inf) || null,
      lastObs: o.last_obs
    }));
    sentryCache = objects;
    sentryCacheTimestamp = Date.now();
    return objects;
  } catch (error) {
    breakerOnFailure(apiBreakers.sentry, error);
    throw error;
  }
};

const fetchCloseApproachData = async (dateMin, dateMax, distMax) => {
  if (!breakerCanCall(apiBreakers.neoWs)) {
    throw new Error("NeoWs/CAD circuit breaker is open.");
  }
  apiBreakers.neoWs.totalRequests++;
  try {
    const params = new URLSearchParams({
      "date-min": dateMin,
      "date-max": dateMax,
      "dist-max": String(distMax),
      "sort": "date",
      "fullname": "true",
      "body": "Earth"
    });
    const r = await axios.get(`${CAD_BASE}?${params.toString()}`, AXIOS_CONFIG);
    breakerOnSuccess(apiBreakers.neoWs);
    const fields = r.data?.fields || [];
    const data = r.data?.data || [];
    const idx = (name) => fields.indexOf(name);
    const result = data.map(row => {
      const distAU = parseFloat(row[idx("dist")]);
      const vRel = parseFloat(row[idx("v_rel")]);
      const h = idx("h") >= 0 ? parseFloat(row[idx("h")]) : null;
      return {
        des: row[idx("des")],
        name: row[idx("fullname")] || row[idx("des")],
        cdDate: row[idx("cd")],
        distAU: distAU,
        distLD: distAU * AU_KM / 384400,
        distKm: Math.round(distAU * AU_KM),
        vRel: vRel,
        h: Number.isFinite(h) ? h : null,
        isPHA: false
      };
    });
    return result;
  } catch (error) {
    breakerOnFailure(apiBreakers.neoWs, error);
    throw error;
  }
};

const buildPHADesignationSet = (catalogResult) => {
  const phaSet = new Set();
  if (!catalogResult || !catalogResult.success) return phaSet;
  for (const a of catalogResult.asteroids) {
    if (!a.isPHA) continue;
    if (a.designation) phaSet.add(String(a.designation).trim());
    if (a.spkid) phaSet.add(String(a.spkid).trim());
    if (a.name) phaSet.add(String(a.name).trim());
  }
  return phaSet;
};

const patchPHAFlags = (approaches, phaSet) => {
  if (!phaSet || phaSet.size === 0) return;
  for (const p of approaches) {
    if (!p) continue;
    const desKey = p.des ? String(p.des).trim() : null;
    const nameKey = p.name ? String(p.name).trim() : null;
    if ((desKey && phaSet.has(desKey)) || (nameKey && phaSet.has(nameKey))) {
      p.isPHA = true;
    }
  }
};

const fetchNEOWatch = async () => {
  if (neoWatchCache && neoWatchTimestamp && Date.now() - neoWatchTimestamp < NEO_WATCH_TTL) {
    return neoWatchCache;
  }
  if (inflightNEOWatch) return inflightNEOWatch;

  inflightNEOWatch = (async () => {
    const data = {
      timestamp: new Date().toISOString(),
      sources: [],
      errors: []
    };

    const formatDate = (d) => {
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(d.getUTCDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    };

    const now = new Date();
    const date7 = new Date(now.getTime() + 7 * 86400000);
    const date30 = new Date(now.getTime() + 30 * 86400000);
    const date365 = new Date(now.getTime() + 365 * 86400000);
    const dateMinus30 = new Date(now.getTime() - 30 * 86400000);

    let catalogResult = null;
    try {
      catalogResult = await fetchAllAsteroids();
    } catch (error) {
      data.errors.push(`The catalog PHA index request failed with the error "${String(error.message).replace(/\.$/, "")}".`);
    }
    const phaSet = buildPHADesignationSet(catalogResult);

    try {
      const ca365 = await fetchCloseApproachData(formatDate(now), formatDate(date365), "0.05");
      data.sources.push("CAD-365d");

      patchPHAFlags(ca365, phaSet);

      const cutoff7Ms = date7.getTime();
      const cutoff30Ms = date30.getTime();
      const within = (p, ms) => {
        try {
          return new Date(p.cdDate).getTime() <= ms;
        } catch (error) {
          return false;
        }
      };

      const ca7 = ca365.filter(p => within(p, cutoff7Ms));
      const ca30 = ca365.filter(p => within(p, cutoff30Ms));

      data.next7Days = ca7.length;
      data.next30Days = ca30.length;
      data.next365Days = ca365.length;
      data.upcomingPasses = ca7.slice(0, 50);

      if (ca7.length > 0) {
        const closest = ca7.reduce((min, p) => p.distAU < min.distAU ? p : min, ca7[0]);
        data.closestUpcoming = closest;
      }
    } catch (error) {
      data.errors.push(`The CAD request failed with the error "${String(error.message).replace(/\.$/, "")}".`);
    }

    try {
      const sentry = await fetchSentryWatch();
      data.sources.push("Sentry");
      data.sentryRiskCount = sentry.length;
      data.sentryObjects = sentry.slice(0, 30);
    } catch (error) {
      data.errors.push(`The Sentry request failed with the error "${String(error.message).replace(/\.$/, "")}".`);
    }

    try {
      if (catalogResult && catalogResult.success) {
        const phaTotal = catalogResult.asteroids.filter(a => a.isPHA).length;
        data.totalPHACount = phaTotal;
        const recentDiscoveries = catalogResult.asteroids
          .filter(a => {
            if (!a.firstObs) return false;
            try {
              return new Date(a.firstObs).getTime() > dateMinus30.getTime();
            } catch (error) {
              return false;
            }
          })
          .slice(0, 30)
          .map(a => ({
            designation: a.designation,
            name: a.name,
            discoveryDate: a.firstObs,
            class: a.category,
            diameter: a.diameter,
            h: a.h,
            a: a.semiMajorAxisAU,
            e: a.eccentricity,
            i: a.inclination
          }));
        data.recentDiscoveries = recentDiscoveries;
        data.recentDiscoveriesCount = recentDiscoveries.length;
      }
    } catch (error) {
      data.errors.push(`The catalog request failed with the error "${String(error.message).replace(/\.$/, "")}".`);
    }

    let overallSeverity = 0;
    if ((data.next7Days || 0) > 10) overallSeverity = Math.max(overallSeverity, 2);
    if ((data.next7Days || 0) > 20) overallSeverity = Math.max(overallSeverity, 3);
    if ((data.sentryRiskCount || 0) > 10) overallSeverity = Math.max(overallSeverity, 2);
    if (data.sentryObjects) {
      const torinoMax = data.sentryObjects.reduce((m, o) => Math.max(m, parseInt(o.tsMax) || 0), 0);
      if (torinoMax >= 1) overallSeverity = Math.max(overallSeverity, 3);
      if (torinoMax >= 2) overallSeverity = Math.max(overallSeverity, 4);
      const palermoMax = data.sentryObjects.reduce((m, o) => Math.max(m, parseFloat(o.psCum) || -99), -99);
      if (palermoMax > -2) overallSeverity = Math.max(overallSeverity, 3);
      if (palermoMax > 0) overallSeverity = Math.max(overallSeverity, 5);
    }

    let overallStatus = "Quiet";
    let overallColor = "#4ade80";
    if (overallSeverity >= 5) { overallStatus = "Severe"; overallColor = "#e04020"; }
    else if (overallSeverity >= 3) { overallStatus = "Active"; overallColor = "#c08040"; }
    else if (overallSeverity >= 1) { overallStatus = "Elevated"; overallColor = "#7a8a5a"; }
    data.overall = { status: overallStatus, color: overallColor, severity: overallSeverity };

    return data;
  })();

  try {
    const result = await inflightNEOWatch;
    neoWatchCache = result;
    neoWatchTimestamp = Date.now();
    return result;
  } finally {
    inflightNEOWatch = null;
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
      throw Object.assign(new Error(`The Gemini stage timed out after ${timeoutMs} ms.`), { timedOut: true, elapsedMs: Date.now() - startMs });
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

const buildAsteroidStage1Prompt = (asteroid) => {
  const orbital = `Semi-major axis: ${asteroid.semiMajorAxisAU} AU, Eccentricity: ${asteroid.eccentricity}, Inclination: ${asteroid.inclination}°, Period: ${asteroid.orbitalPeriodYears} years, Perihelion: ${asteroid.perihelionAU} AU, Aphelion: ${asteroid.aphelionAU} AU, Class: ${asteroid.category}, MOID: ${asteroid.moidAU} AU, H: ${asteroid.h}, Diameter: ${asteroid.diameter || "?"} km`;
  return `You are an asteroid catalog analyst. Research the asteroid "${asteroid.name}" (designation ${asteroid.designation || "unknown"}) using Google Search.

Orbital state: ${orbital}

Return ONLY a JSON object (no markdown, no fences) with verifiable facts:

{
  "operator": "Discoverer name (person or survey)",
  "internationalDesignator": "Provisional designation (e.g. 1989 ML)",
  "launchDate": "Discovery date YYYY-MM-DD or YYYY",
  "launchVehicle": "Discovery survey or program",
  "launchSite": "Discovery observatory or site",
  "missionStatus": "Active | Lost | Recovered | Numbered | Comet",
  "factSheet": {
    "manufacturer": "Spectral type (Tholen / SMASS / Bus-DeMeo)",
    "bus": "Composition class (e.g. carbonaceous, silicaceous, metallic, basaltic)",
    "mass": "kg if known (string with unit)",
    "power": "Albedo if known (decimal 0-1)",
    "designLife": "Rotation period in hours if known",
    "propulsion": "Pole orientation if known (e.g. RA/Dec)",
    "stabilization": "Binary | Triple | Single | Tumbling"
  },
  "instruments": ["spacecraft visit 1", "spacecraft visit 2"]
}

Use null for unknown fields. Do not fabricate.`;
};

const buildAsteroidStage2Prompt = (asteroid, stage1) => {
  const ops = stage1?.parsed?.operator || "Unknown";
  return `You are an asteroid mission analyst. Research and write narrative analysis for "${asteroid.name}" (designation ${asteroid.designation || "?"}, discovered by ${ops}).

Return ONLY a JSON object (no markdown):

{
  "executiveSummary": "Two sentences capturing this asteroid's discovery context and current scientific or hazard significance.",
  "missionBrief": "Two-paragraph detailed brief: paragraph 1 covers discovery circumstances and immediate scientific interest. Paragraph 2 covers subsequent observations, characterization, and broader significance to planetary science.",
  "scientificContribution": "Specific scientific contributions of this object: composition class, taxonomic role, presence of moons, lightcurve studies, spacecraft visits, occultation results.",
  "constellationContext": "How this asteroid fits within its dynamical family or population: parent body if known, family membership, resonance state, sibling objects.",
  "geopoliticalSignificance": "Strategic, planetary-defense, or mission-target relevance. Address spacefaring nations' interest in this object.",
  "commercialContext": "Mineral resource potential, accessibility for asteroid mining, or rendezvous mission economics if applicable. Use null if not applicable."
}

Be specific and factual. Use null for non-applicable fields.`;
};

const buildAsteroidStage3Prompt = (asteroid, stage1, stage2) => {
  return `You are an asteroid risk and operations analyst. For "${asteroid.name}" (designation ${asteroid.designation || "?"}), provide events timeline and risk assessment.

Return ONLY a JSON object (no markdown):

{
  "notableEvents": [
    {"date": "YYYY-MM-DD or YYYY", "event": "Concrete description of close approach, opposition, occultation, spacecraft encounter, or characterization milestone"}
  ],
  "riskAssessment": {
    "tleAgeRisk": "How orbit determination quality (observation arc ${asteroid.observationArcDays || "?"} days) affects ephemeris accuracy and prediction uncertainty.",
    "decayRisk": "Impact and orbital evolution outlook including Yarkovsky drift if known. Object H ${asteroid.h || "?"}.",
    "conjunctionRisk": "Known close-approach concerns or general MOID-based hazard. Earth MOID ${asteroid.moidAU || "?"} AU.",
    "operationalRisk": "Other operational concerns: chaotic dynamics, thermal extremes, spacecraft hazards near object.",
    "cyberRisk": "Mission window and accessibility for spacecraft rendezvous. Δv estimates if known.",
    "regulatoryRisk": "Planetary protection, Outer Space Treaty, or sample-return contamination considerations."
  }
}

Provide up to 6 most significant events. Each risk field should be 1-3 sentences with specific reasoning.`;
};

const fetchAsteroidIntelligence = async (asteroid) => {
  const cacheKey = String(asteroid.designation || asteroid.spkid || asteroid.name);
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
    const s1 = await runStage(1, buildAsteroidStage1Prompt(asteroid), 2048, 0.2);
    const s2 = await runStage(2, buildAsteroidStage2Prompt(asteroid, stages[0]), 3000, 0.4);
    const s3 = await runStage(3, buildAsteroidStage3Prompt(asteroid, stages[0], stages[1]), 3000, 0.3);

    const merged = {
      ...(s1.parsed || {}),
      ...(s2.parsed || {}),
      ...(s3.parsed || {})
    };

    const successfulStages = perStage.filter(p => !p.timedOut && !p.error).length;
    if (successfulStages === 0) {
      return {
        designation: asteroid.designation,
        name: asteroid.name,
        error: "All Gemini stages failed.",
        partialStages,
        generatedAt: new Date().toISOString(),
        sources: [],
        intelligence: null,
        tokenUsage: { total: totalTokens, prompt: totalPrompt, completion: totalCompletion, perStage }
      };
    }

    const result = {
      designation: asteroid.designation,
      name: asteroid.name,
      generatedAt: new Date().toISOString(),
      intelligence: merged,
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
      designation: asteroid.designation,
      name: asteroid.name,
      error: error.message,
      partialStages,
      generatedAt: new Date().toISOString(),
      sources: [],
      intelligence: null,
      tokenUsage: { total: totalTokens, prompt: totalPrompt, completion: totalCompletion, perStage }
    };
  }
};

const buildNEOWatchStage1Prompt = (sw) => {
  const summary = `Current NEO Watch State:
- Close approaches in next 7 days: ${sw.next7Days || 0}
- Close approaches in next 30 days: ${sw.next30Days || 0}
- Close approaches in next 365 days: ${sw.next365Days || 0}
- Total PHA catalog count: ${sw.totalPHACount || 0}
- Sentry impact-monitoring objects: ${sw.sentryRiskCount || 0}
- Recent discoveries (past 30d): ${sw.recentDiscoveriesCount || 0}
- Closest upcoming: ${sw.closestUpcoming?.name || "none"} at ${sw.closestUpcoming?.distLD?.toFixed(2) || "?"} LD on ${sw.closestUpcoming?.cdDate || "?"}`;
  return `You are a NASA/ESA planetary defense analyst. Generate a current hazard posture analysis based on:

${summary}

Return ONLY a JSON object (no markdown, no fences):

{
  "executiveSummary": "Three-sentence brief covering: current state of near-Earth space, upcoming notable approaches, and immediate planetary defense implications.",
  "currentConditions": "Detailed paragraph analyzing the current NEO environment, dynamical drivers, what observers should watch for in the next 30 days, and where survey gaps may exist."
}

Be specific and use technical language appropriate for planetary defense operators.`;
};

const buildNEOWatchStage2Prompt = (sw) => {
  return `You are a planetary defense forecaster. Based on current NEO posture, search recent CNEOS reports and produce 30-day and 365-day forecasts.

Current state: ${sw.next7Days || 0} approaches in 7d, ${sw.next30Days || 0} in 30d, ${sw.totalPHACount || 0} PHA catalog, ${sw.sentryRiskCount || 0} Sentry objects.

Return ONLY a JSON object (no markdown):

{
  "forecast24h": "Detailed 30-day outlook covering: notable upcoming close approaches, expected discovery rate, anticipated observation campaigns, and operator decision points.",
  "forecast72h": "365-day outlook covering: significant calendar-year events including occultations, opposition windows, planned spacecraft encounters, and Sentry table evolution.",
  "historicalContext": "How current conditions compare to recent years, solar elongation effects on detection, and similar past events that operators may use as analogs."
}`;
};

const buildNEOWatchStage3Prompt = (sw) => {
  return `You are an asteroid risk analyst. Based on the current NEO watch state, produce domain-specific impact assessment and recommended actions.

State: ${sw.totalPHACount || 0} PHAs cataloged, ${sw.sentryRiskCount || 0} Sentry objects, ${sw.next7Days || 0} 7-day approaches, ${sw.recentDiscoveriesCount || 0} recent discoveries.

Return ONLY a JSON object (no markdown):

{
  "satelliteImpacts": [
    {"regime": "Planetary Defense Survey", "impact": "Specific narrative on impact-monitoring health, gap regions, survey throughput", "severity": "Low|Moderate|High"},
    {"regime": "Mission Targets", "impact": "Available rendezvous and sample-return opportunities, accessibility windows", "severity": "Low|Moderate|High"},
    {"regime": "Resource Prospecting", "impact": "Commercially-relevant accessible objects, current characterization needs", "severity": "Low|Moderate|High"},
    {"regime": "Earth Observation Risks", "impact": "Bolide and meteor stream risk to satellites and Earth surface", "severity": "Low|Moderate|High"}
  ],
  "recommendedActions": [
    "Specific operational action 1 with rationale",
    "Specific operational action 2 with rationale",
    "Specific operational action 3 with rationale",
    "Specific operational action 4 with rationale"
  ],
  "scientificAnalysis": "Paragraph-level scientific interpretation: which dynamical and observational processes dominate the current state, key open questions, and what observations would resolve them."
}`;
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

const fetchSBDBLookup = async (designation) => {
  try {
    const url = `${SBDB_LOOKUP_BASE}?sstr=${encodeURIComponent(designation)}&full-prec=true&phys-par=true&ca-data=true`;
    const r = await axios.get(url, { ...AXIOS_CONFIG, timeout: OBSERVATION_AXIOS_TIMEOUT_MS });
    return r.data;
  } catch (error) {
    return null;
  }
};

const fetchObservationData = async (asteroid) => {
  const cacheKey = String(asteroid.designation || asteroid.spkid || asteroid.name);
  const cached = observationCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < OBSERVATION_TTL) {
    return cached.data;
  }

  const result = {
    designation: asteroid.designation,
    name: asteroid.name,
    generatedAt: new Date().toISOString(),
    closeApproaches: [],
    physicalProperties: null,
    wikipedia: null,
    references: []
  };

  const cleanName = (asteroid.name || "").split(/[\(\[]/)[0].trim().replace(/\s+/g, "_");
  const wikiTitle = `${cleanName}_(asteroid)`;
  const altWikiTitle = cleanName;

  const externalTasks = [];
  externalTasks.push(fetchWikipediaSummary(wikiTitle));
  externalTasks.push(fetchSBDBLookup(asteroid.designation || asteroid.spkid || asteroid.name));

  const settled = await Promise.allSettled(externalTasks);

  let wikiPrimary = settled[0].status === "fulfilled" ? settled[0].value : null;
  if (!wikiPrimary && altWikiTitle !== wikiTitle) {
    try {
      wikiPrimary = await fetchWikipediaSummary(altWikiTitle);
    } catch (error) {}
  }
  result.wikipedia = wikiPrimary;

  const sbdbData = settled[1].status === "fulfilled" ? settled[1].value : null;
  if (sbdbData) {
    if (sbdbData.phys_par && Array.isArray(sbdbData.phys_par)) {
      const props = {};
      for (const p of sbdbData.phys_par) {
        const v = parseFloat(p.value);
        if (p.name === "diameter" && Number.isFinite(v)) props.diameter = Math.round(v * 1000) / 1000;
        if (p.name === "albedo" && Number.isFinite(v)) props.albedo = Math.round(v * 1000) / 1000;
        if (p.name === "rot_per" && Number.isFinite(v)) props.rotationPeriod = Math.round(v * 100) / 100;
        if ((p.name === "spec_B" || p.name === "spec_T") && p.value) props.spectralType = props.spectralType || p.value;
        if (p.name === "H" && Number.isFinite(v)) props.h = v;
        if (p.name === "GM" && Number.isFinite(v)) props.gm = v;
      }
      if (Object.keys(props).length > 0) result.physicalProperties = props;
    }
    if (sbdbData.ca_data && Array.isArray(sbdbData.ca_data)) {
      result.closeApproaches = sbdbData.ca_data.slice(0, 30).map(ca => ({
        date: ca.cd,
        body: ca.body || "Earth",
        distAU: parseFloat(ca.dist),
        distLD: parseFloat(ca.dist) * AU_KM / 384400,
        vRel: parseFloat(ca.v_rel)
      }));
    }
  }

  result.references.push({
    label: "JPL SBDB Browser",
    url: `https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=${encodeURIComponent(asteroid.designation || asteroid.name)}`
  });
  result.references.push({
    label: "Minor Planet Center",
    url: `https://www.minorplanetcenter.net/db_search/show_object?utf8=&object_id=${encodeURIComponent(asteroid.designation || asteroid.name)}`
  });
  result.references.push({
    label: "JPL Horizons",
    url: `https://ssd.jpl.nasa.gov/horizons/app.html#/?CENTER='500@10'&COMMAND='${encodeURIComponent(asteroid.designation || asteroid.name)}'`
  });
  result.references.push({
    label: "CNEOS Close Approach Tables",
    url: `https://cneos.jpl.nasa.gov/ca/`
  });
  if (asteroid.isPHA || asteroid.isNEO) {
    result.references.push({
      label: "CNEOS Sentry",
      url: `https://cneos.jpl.nasa.gov/sentry/`
    });
  }

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
        cached: !!asteroidCache,
        cacheAgeSeconds: cacheTimestamp ? Math.round((now - cacheTimestamp) / 1000) : null,
        cachedAsteroidCount: asteroidCache ? asteroidCache.asteroids.length : 0,
        inflightFetch: !!inflightFetch,
        partialAccumulationLength: partialAccumulation.length,
        activeSubscribers: fetchSubscribers.size,
        provider: "JPL SBDB"
      },
      memory: {
        live: {
          rssBytes: mem.rss,
          heapUsedBytes: mem.heapUsed,
          heapTotalBytes: mem.heapTotal,
          heapLimitBytes: heap.heap_size_limit,
          externalBytes: mem.external || 0,
          arrayBuffersBytes: mem.arrayBuffers || 0,
          effectiveLimitBytes: containerMemoryDetection.bytes,
          effectiveLimitSource: containerMemoryDetection.chosen,
          effectiveLimitCandidates: containerMemoryDetection.sources,
          usedFraction: heap.heap_size_limit > 0 ? mem.heapUsed / heap.heap_size_limit : 0,
          usedFractionOfLimit: containerMemoryDetection.bytes ? mem.rss / containerMemoryDetection.bytes : null,
          availableBytes: Math.max(0, heap.heap_size_limit - mem.heapUsed),
          availableUnderLimitBytes: containerMemoryDetection.bytes ? Math.max(0, containerMemoryDetection.bytes - mem.rss) : null,
          gcAvailable: typeof global.gc === "function"
        },
        lastFetch: lastMemorySnapshot
      },
      neoWatch: {
        cached: !!neoWatchCache,
        cacheAgeSeconds: neoWatchTimestamp ? Math.round((now - neoWatchTimestamp) / 1000) : null,
        inflight: !!inflightNEOWatch,
        sources: neoWatchCache?.sources || [],
        errors: neoWatchCache?.errors || []
      },
      breakers: Object.entries(apiBreakers).reduce((acc, [name, breaker]) => {
        acc[name] = {
          state: breaker.state,
          consecutiveFailures: breaker.consecutiveFailures,
          totalRequests: breaker.totalRequests,
          totalFailures: breaker.totalFailures,
          lastSuccessSecondsAgo: breaker.lastSuccessMs ? Math.round((now - breaker.lastSuccessMs) / 1000) : null,
          lastError: breaker.lastError,
          cooldownRemainingSeconds: breaker.state === "open" ? Math.max(0, Math.round((breaker.cooldownMs - (now - breaker.openedAtMs)) / 1000)) : 0
        };
        return acc;
      }, {}),
      caches: {
        gemini: { entries: geminiCache.size, maxEntries: GEMINI_CACHE_MAX_ENTRIES },
        observation: { entries: observationCache.size, maxEntries: OBSERVATION_CACHE_MAX_ENTRIES },
        neoWatchAI: { cached: !!neoWatchAICache.data, ageSeconds: neoWatchAICache.timestamp ? Math.round((now - neoWatchAICache.timestamp) / 1000) : null },
        sentry: { cached: !!sentryCache, ageSeconds: sentryCacheTimestamp ? Math.round((now - sentryCacheTimestamp) / 1000) : null },
        population: { cached: !!populationCache, ageSeconds: populationCacheTimestamp ? Math.round((now - populationCacheTimestamp) / 1000) : null }
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
    lines.push(`# HELP asteroid_catalog_size Cached asteroid count`);
    lines.push(`# TYPE asteroid_catalog_size gauge`);
    lines.push(`asteroid_catalog_size ${asteroidCache ? asteroidCache.asteroids.length : 0}`);
    lines.push(`# HELP asteroid_catalog_cache_age_seconds Age of cached catalog in seconds`);
    lines.push(`# TYPE asteroid_catalog_cache_age_seconds gauge`);
    lines.push(`asteroid_catalog_cache_age_seconds ${cacheTimestamp ? Math.round((now - cacheTimestamp) / 1000) : -1}`);
    lines.push(`# HELP asteroid_inflight_fetch Currently inflight catalog fetch`);
    lines.push(`# TYPE asteroid_inflight_fetch gauge`);
    lines.push(`asteroid_inflight_fetch ${inflightFetch ? 1 : 0}`);
    lines.push(`# HELP asteroid_partial_accumulation Items accumulated during inflight fetch`);
    lines.push(`# TYPE asteroid_partial_accumulation gauge`);
    lines.push(`asteroid_partial_accumulation ${partialAccumulation.length}`);
    lines.push(`# HELP asteroid_active_subscribers SSE subscribers attached to the shared fetch`);
    lines.push(`# TYPE asteroid_active_subscribers gauge`);
    lines.push(`asteroid_active_subscribers ${fetchSubscribers.size}`);
    lines.push(`# HELP asteroid_gemini_cache_entries`);
    lines.push(`# TYPE asteroid_gemini_cache_entries gauge`);
    lines.push(`asteroid_gemini_cache_entries ${geminiCache.size}`);
    lines.push(`# HELP asteroid_observation_cache_entries`);
    lines.push(`# TYPE asteroid_observation_cache_entries gauge`);
    lines.push(`asteroid_observation_cache_entries ${observationCache.size}`);
    lines.push(`# HELP asteroid_heap_used_bytes Live V8 heap used in bytes`);
    lines.push(`# TYPE asteroid_heap_used_bytes gauge`);
    lines.push(`asteroid_heap_used_bytes ${mem.heapUsed}`);
    lines.push(`# HELP asteroid_heap_total_bytes Live V8 heap total in bytes`);
    lines.push(`# TYPE asteroid_heap_total_bytes gauge`);
    lines.push(`asteroid_heap_total_bytes ${mem.heapTotal}`);
    lines.push(`# HELP asteroid_heap_limit_bytes V8 heap_size_limit in bytes`);
    lines.push(`# TYPE asteroid_heap_limit_bytes gauge`);
    lines.push(`asteroid_heap_limit_bytes ${heap.heap_size_limit}`);
    lines.push(`# HELP asteroid_heap_used_fraction heapUsed / heap_size_limit`);
    lines.push(`# TYPE asteroid_heap_used_fraction gauge`);
    lines.push(`asteroid_heap_used_fraction ${heap.heap_size_limit > 0 ? mem.heapUsed / heap.heap_size_limit : 0}`);
    lines.push(`# HELP asteroid_rss_bytes Process RSS in bytes`);
    lines.push(`# TYPE asteroid_rss_bytes gauge`);
    lines.push(`asteroid_rss_bytes ${mem.rss}`);
    lines.push(`# HELP asteroid_external_bytes Process external memory in bytes`);
    lines.push(`# TYPE asteroid_external_bytes gauge`);
    lines.push(`asteroid_external_bytes ${mem.external || 0}`);
    lines.push(`# HELP asteroid_effective_memory_limit_bytes Detected container memory limit in bytes`);
    lines.push(`# TYPE asteroid_effective_memory_limit_bytes gauge`);
    lines.push(`asteroid_effective_memory_limit_bytes ${containerMemoryDetection.bytes || 0}`);
    lines.push(`# HELP asteroid_rss_under_limit_fraction RSS divided by effective container memory limit`);
    lines.push(`# TYPE asteroid_rss_under_limit_fraction gauge`);
    lines.push(`asteroid_rss_under_limit_fraction ${containerMemoryDetection.bytes ? mem.rss / containerMemoryDetection.bytes : 0}`);
    if (lastMemorySnapshot) {
      lines.push(`# HELP asteroid_last_fetch_memory_halted_sources Number of sources halted by memory guard in the last fetch`);
      lines.push(`# TYPE asteroid_last_fetch_memory_halted_sources gauge`);
      lines.push(`asteroid_last_fetch_memory_halted_sources ${lastMemorySnapshot.haltedQueries.length}`);
      lines.push(`# HELP asteroid_last_fetch_halted_rows_total Total rows skipped due to memory halt in the last fetch`);
      lines.push(`# TYPE asteroid_last_fetch_halted_rows_total gauge`);
      lines.push(`asteroid_last_fetch_halted_rows_total ${lastMemorySnapshot.haltedRowsTotal}`);
      lines.push(`# HELP asteroid_last_fetch_peak_heap_bytes Peak heap used during last fetch`);
      lines.push(`# TYPE asteroid_last_fetch_peak_heap_bytes gauge`);
      lines.push(`asteroid_last_fetch_peak_heap_bytes ${lastMemorySnapshot.peakHeapUsedBytes}`);
      lines.push(`# HELP asteroid_last_fetch_projected_batch_bytes Projected next batch heap delta at end of last fetch`);
      lines.push(`# TYPE asteroid_last_fetch_projected_batch_bytes gauge`);
      lines.push(`asteroid_last_fetch_projected_batch_bytes ${lastMemorySnapshot.projectedNextBatchBytes}`);
      lines.push(`# HELP asteroid_last_fetch_gc_triggered Total GC triggers in the last fetch`);
      lines.push(`# TYPE asteroid_last_fetch_gc_triggered counter`);
      lines.push(`asteroid_last_fetch_gc_triggered ${lastMemorySnapshot.gcTriggeredCount}`);
    }
    Object.entries(apiBreakers).forEach(([name, breaker]) => {
      const state = breaker.state === "closed" ? 0 : breaker.state === "half-open" ? 1 : 2;
      lines.push(`# HELP asteroid_breaker_${name}_state 0=closed,1=half-open,2=open`);
      lines.push(`# TYPE asteroid_breaker_${name}_state gauge`);
      lines.push(`asteroid_breaker_${name}_state ${state}`);
      lines.push(`# HELP asteroid_breaker_${name}_failures Consecutive failures`);
      lines.push(`# TYPE asteroid_breaker_${name}_failures gauge`);
      lines.push(`asteroid_breaker_${name}_failures ${breaker.consecutiveFailures}`);
      lines.push(`# HELP asteroid_breaker_${name}_total_requests Total fetch attempts`);
      lines.push(`# TYPE asteroid_breaker_${name}_total_requests counter`);
      lines.push(`asteroid_breaker_${name}_total_requests ${breaker.totalRequests}`);
    });
    res.set("Content-Type", "text/plain; version=0.0.4");
    res.send(lines.join("\n") + "\n");
  } catch (error) {
    res.status(500).send(`The metrics could not be generated because of the error "${String(error.message).replace(/\.$/, "")}".`);
  }
});

router.get("/asteroid-stream", async (req, res) => {
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
  let heartbeat = null;
  const onClose = () => {
    closed = true;
    if (heartbeat) clearInterval(heartbeat);
  };
  req.on("close", onClose);
  req.on("aborted", onClose);
  res.on("close", onClose);

  const sendEvent = (event, data) => {
    if (closed || res.writableEnded) return false;
    try {
      return res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      closed = true;
      return false;
    }
  };

  const waitForDrain = () => new Promise((resolve) => {
    if (closed || res.writableEnded) return resolve();
    const finish = () => {
      res.off("drain", finish);
      res.off("close", finish);
      resolve();
    };
    res.on("drain", finish);
    res.on("close", finish);
  });

  try {
    res.write("retry: 3000\n\n");
  } catch (error) {
    closed = true;
  }
  heartbeat = setInterval(() => {
    if (closed || res.writableEnded) {
      clearInterval(heartbeat);
      return;
    }
    try {
      res.write(": keep-alive\n\n");
    } catch (error) {
      onClose();
    }
  }, 15000);
  res.on("finish", onClose);

  const startTime = Date.now();
  sendEvent("hello", { startedAt: new Date().toISOString() });

  const streamInChunks = async (sats, sourceLabel) => {
    const CHUNK_SIZE = 250;
    for (let i = 0; i < sats.length; i += CHUNK_SIZE) {
      if (closed) return;
      const flushed = sendEvent("batch", {
        asteroids: sats.slice(i, i + CHUNK_SIZE),
        source: sourceLabel
      });
      if (!flushed && !closed) await waitForDrain();
    }
  };

  if (asteroidCache && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_DURATION) {
    await streamInChunks(asteroidCache.asteroids, "Cache");
    sendEvent("progress", {
      completed: asteroidCache.metadata.totalSources,
      total: asteroidCache.metadata.totalSources,
      successful: asteroidCache.metadata.successfulSources,
      memory: lastMemorySnapshot
    });
    if (!closed) {
      sendEvent("done", {
        metadata: {
          ...asteroidCache.metadata,
          fromCache: true,
          cacheAge: Math.round((Date.now() - cacheTimestamp) / 1000),
          loadTime: Date.now() - startTime
        },
        errors: asteroidCache.errors
      });
    }
    res.end();
    return;
  }

  if (partialAccumulation.length > 0) {
    await streamInChunks([...partialAccumulation], "Inflight Partial");
  }

  const subscriber = {
    onBatch: (newSats, source) => sendEvent("batch", { asteroids: newSats, source }),
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
          ...(result?.metadata || { totalSources: SBDB_QUERIES.length, successfulSources: 0 }),
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
        metadata: { totalSources: SBDB_QUERIES.length, successfulSources: 0, loadTime: Date.now() - startTime },
        errors: [error.message]
      });
    }
  } finally {
    fetchSubscribers.delete(subscriber);
    res.end();
  }
});

router.get("/all-asteroid-data", async (req, res) => {
  try {
    const startTime = Date.now();
    const result = await fetchAllAsteroids();
    const loadTime = Date.now() - startTime;

    if (!result.success) {
      return res.json({
        success: false,
        asteroids: [],
        errors: result.errors || [result.error],
        metadata: {
          totalSources: 0,
          successfulSources: 0,
          loadTime: loadTime,
          dataQuality: "No Data",
          queryTime: new Date().toISOString(),
          realSources: ["JPL SBDB"],
          memoryOptimized: true,
          memoryAware: true,
          memory: lastMemorySnapshot,
          activeRenderingLimit: 100
        }
      });
    }

    const categoryCounts = result.asteroids.reduce((acc, a) => {
      acc[a.category] = (acc[a.category] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      asteroids: result.asteroids,
      errors: result.errors || [],
      metadata: {
        totalSources: result.metadata.totalSources,
        successfulSources: result.metadata.successfulSources,
        memoryHaltedSources: result.metadata.memoryHaltedSources,
        loadTime: loadTime,
        dataQuality: result.errors.length === 0 ? "High" : result.errors.length < 3 ? "Medium" : "Low",
        queryTime: new Date().toISOString(),
        categoryCounts: categoryCounts,
        realSources: ["JPL SBDB", "NeoWs", "MPC"],
        memoryOptimized: true,
        memoryAware: true,
        memory: result.metadata.memory,
        activeRenderingLimit: 100,
        totalAsteroids: result.metadata.totalAsteroids,
        cacheAge: cacheTimestamp ? Math.round((Date.now() - cacheTimestamp) / 1000) : null
      }
    });
  } catch (error) {
    res.json({
      success: false,
      asteroids: [],
      errors: [`A critical system error occurred: ${error.message}.`],
      metadata: {
        totalSources: 0,
        successfulSources: 0,
        loadTime: 0,
        dataQuality: "No Data",
        queryTime: new Date().toISOString(),
        memoryOptimized: true,
        memoryAware: true,
        memory: lastMemorySnapshot,
        activeRenderingLimit: 100
      }
    });
  }
});

router.get("/neo-asteroids", async (req, res) => {
  try {
    const result = await fetchAllAsteroids();
    const neo = result.asteroids.filter(a => a.isNEO);
    res.json({
      success: result.success,
      source: "JPL SBDB NEO Catalog",
      asteroids: neo,
      errors: result.success ? [] : (result.errors || [result.error]),
      metadata: {
        queryTime: new Date().toISOString(),
        dataPoints: neo.length,
        method: "JPL SBDB - Near-Earth Objects",
        memoryOptimized: true,
        memoryAware: true,
        memory: result.metadata?.memory || lastMemorySnapshot
      }
    });
  } catch (error) {
    res.json({
      success: false,
      source: "JPL SBDB NEO Catalog",
      error: `Failed to retrieve NEO data: ${error.message}.`,
      asteroids: []
    });
  }
});

router.get("/pha-asteroids", async (req, res) => {
  try {
    const result = await fetchAllAsteroids();
    const pha = result.asteroids.filter(a => a.isPHA);
    res.json({
      success: result.success,
      source: "JPL SBDB PHA Catalog",
      asteroids: pha,
      errors: result.success ? [] : (result.errors || [result.error]),
      metadata: {
        queryTime: new Date().toISOString(),
        dataPoints: pha.length,
        method: "JPL SBDB - Potentially Hazardous Asteroids",
        memoryOptimized: true,
        memoryAware: true,
        memory: result.metadata?.memory || lastMemorySnapshot
      }
    });
  } catch (error) {
    res.json({
      success: false,
      source: "JPL SBDB PHA Catalog",
      error: `Failed to retrieve PHA data: ${error.message}.`,
      asteroids: []
    });
  }
});

router.get("/main-belt-asteroids", async (req, res) => {
  try {
    const result = await fetchAllAsteroids();
    const mb = result.asteroids.filter(a => a.category && a.category.startsWith("Main Belt"));
    res.json({
      success: result.success,
      source: "JPL SBDB Main Belt",
      asteroids: mb,
      errors: result.success ? [] : (result.errors || [result.error]),
      metadata: {
        queryTime: new Date().toISOString(),
        dataPoints: mb.length,
        method: "JPL SBDB - Main Belt Asteroids (a Between 2.06 and 3.27 AU)",
        memoryOptimized: true,
        memoryAware: true,
        memory: result.metadata?.memory || lastMemorySnapshot
      }
    });
  } catch (error) {
    res.json({
      success: false,
      source: "JPL SBDB Main Belt",
      error: `Failed to retrieve Main Belt data: ${error.message}.`,
      asteroids: []
    });
  }
});

router.get("/neo-watch", async (req, res) => {
  try {
    const data = await fetchNEOWatch();
    res.json({ success: true, data, cached: neoWatchTimestamp ? Date.now() - neoWatchTimestamp < NEO_WATCH_TTL : false });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

router.post("/neo-watch-ai", async (req, res) => {
  try {
    const swInput = req.body && req.body.neoWatch;
    if (!swInput) {
      return res.status(400).json({ success: false, error: "The neoWatch payload is missing." });
    }
    if (neoWatchAICache.data && Date.now() - neoWatchAICache.timestamp < PANEL_AI_TTL) {
      return res.json({ success: true, data: { ...neoWatchAICache.data, fromCache: true } });
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
          if (s.url && !seen.has(s.url)) {
            seen.add(s.url);
            allSources.push(s);
          }
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
      runIndependent(1, buildNEOWatchStage1Prompt(swInput), 2048, 0.3),
      runIndependent(2, buildNEOWatchStage2Prompt(swInput), 2500, 0.4),
      runIndependent(3, buildNEOWatchStage3Prompt(swInput), 3000, 0.3)
    ]);

    const successfulStages = perStage.filter(s => !s.timedOut && !s.error).length;
    if (successfulStages === 0) {
      return res.json({ success: false, error: "All Gemini stages failed.", data: { tokenUsage: { total: totalTokens, prompt: totalPrompt, completion: totalCompletion, perStage } } });
    }

    const result = {
      generatedAt: new Date().toISOString(),
      report: { ...p1, ...p2, ...p3 },
      sources: allSources,
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      stages: successfulStages,
      tokenUsage: { total: totalTokens, prompt: totalPrompt, completion: totalCompletion, perStage }
    };
    neoWatchAICache.data = result;
    neoWatchAICache.timestamp = Date.now();
    res.json({ success: true, data: result });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

router.post("/asteroid-intelligence", async (req, res) => {
  try {
    const ast = req.body && req.body.asteroid;
    if (!ast || !(ast.designation || ast.spkid || ast.name)) {
      return res.status(400).json({ success: false, error: "The asteroid payload is missing." });
    }
    const result = await fetchAsteroidIntelligence(ast);
    res.json({ success: !result.error, data: result, error: result.error });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

router.post("/asteroid-observation", async (req, res) => {
  try {
    const ast = req.body && req.body.asteroid;
    if (!ast || !(ast.designation || ast.spkid || ast.name)) {
      return res.status(400).json({ success: false, error: "The asteroid payload is missing." });
    }
    const result = await fetchObservationData(ast);
    res.json({ success: true, data: result });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

router.get("/sentry-watch", async (req, res) => {
  try {
    const sentry = await fetchSentryWatch();
    let catalog = null;
    try {
      catalog = await fetchAllAsteroids();
    } catch (error) {}

    const candidates = sentry.map(s => {
      const yearMatch = (s.range || "").match(/(\d{4})-(\d{4})/);
      const yearStart = yearMatch ? parseInt(yearMatch[1]) : null;
      const yearEnd = yearMatch ? parseInt(yearMatch[2]) : null;
      const yearsToFirstImpact = yearStart ? Math.max(0, yearStart - new Date().getFullYear()) : 100;
      let decayRisk = "Low";
      if (yearsToFirstImpact < 10) decayRisk = "Imminent";
      else if (yearsToFirstImpact < 30) decayRisk = "High";
      else if (yearsToFirstImpact < 60) decayRisk = "Moderate";

      const torino = parseInt(s.tsMax) || 0;
      const tier = (s.diameter && s.diameter > SENTRY_HIGH_CONFIDENCE_DIAMETER_KM && torino > 0) ? "highConfidence" : "heuristic";

      let catalogObj = null;
      if (catalog && catalog.asteroids) {
        catalogObj = catalog.asteroids.find(a => a.designation === s.des || a.spkid === s.des);
      }

      return {
        ...s,
        decayRisk,
        tier,
        yearStart,
        yearEnd,
        elements: catalogObj?.elements || null,
        category: catalogObj?.category || "PHA"
      };
    });

    res.json({
      success: true,
      candidates,
      total: candidates.length,
      methodology: {
        highConfidenceCriterion: `Diameter > ${SENTRY_HIGH_CONFIDENCE_DIAMETER_KM} km AND Torino > 0`,
        palermoFormulation: "PS = log10(P_impact / (E_impact × T_window × bg_rate))",
        torinoScale: "This 0-10 integer scale combines impact probability and kinetic energy.",
        riskTiers: {
          imminent: "First Virtual Impactor Within 10 Years",
          high: "10-30 Years",
          moderate: "30-60 Years",
          low: "60-100 Years"
        },
        formulation: "Sentry uses linearized covariance propagation and Monte Carlo sampling of orbital uncertainty, including Yarkovsky thermal drift where it is constrained.",
        limitations: "Most Sentry objects exit the table within months as additional observations refine the orbit. Smaller objects (D < 0.14 km) are harder to characterize and tend to be heuristic-tier candidates."
      }
    });
  } catch (error) {
    res.json({ success: false, error: error.message, candidates: [] });
  }
});

router.get("/asteroid-population-census", async (req, res) => {
  try {
    if (populationCache && populationCacheTimestamp && Date.now() - populationCacheTimestamp < POPULATION_TTL) {
      return res.json({ success: true, populations: populationCache, fromCache: true, generatedAt: new Date(populationCacheTimestamp).toISOString() });
    }
    const result = await fetchAllAsteroids();
    if (!result.success) {
      return res.json({ success: false, error: "The catalog is unavailable." });
    }

    const expected = {
      "Atira": { estimatedTotal: 50, description: "These Inner Earth Objects orbit entirely within Earth's orbit. They are difficult to detect at low solar elongations." },
      "Aten": { estimatedTotal: 2500, description: "These Earth-crossing objects have a < 1 AU. They form a significant population that includes many PHAs." },
      "Apollo": { estimatedTotal: 18000, description: "These Earth-crossing objects have a > 1 AU. They are the largest near-Earth class and contain the majority of cataloged NEOs." },
      "Amor": { estimatedTotal: 11000, description: "These Mars-crossing or near-Earth objects do not cross Earth's orbit. Their perihelion is 1.017-1.3 AU." },
      "Main Belt Inner": { estimatedTotal: 350000, description: "These objects orbit between Mars and the Hungaria group, with a from 2.06 to 2.5 AU. Silicate-rich S-types dominate." },
      "Main Belt Middle": { estimatedTotal: 450000, description: "This is the central main belt, with a from 2.5 to 2.82 AU. Its population is a mix of C-types and S-types." },
      "Main Belt Outer": { estimatedTotal: 380000, description: "This is the outer main belt, with a from 2.82 to 3.27 AU. Carbonaceous C-types dominate." },
      "Hilda": { estimatedTotal: 5000, description: "These objects are in a 3:2 mean-motion resonance with Jupiter at ~3.97 AU." },
      "Jupiter Trojan": { estimatedTotal: 12500, description: "These objects librate stably around Jupiter's L4 and L5 Lagrange points at ~5.2 AU." },
      "Centaur": { estimatedTotal: 1200, description: "These objects follow unstable orbits between Jupiter and Neptune, and many become Jupiter-family comets." },
      "TNO": { estimatedTotal: 5000, description: "These trans-Neptunian objects lie between 30 and 50 AU and include Plutinos and classical KBOs." },
      "KBO": { estimatedTotal: 100000, description: "These Kuiper Belt and scattered disk objects lie beyond 50 AU." },
      "Comet": { estimatedTotal: 4000, description: "These active or extinct comets show significant non-gravitational forces." }
    };

    const populations = {};
    Object.keys(expected).forEach(group => {
      const objs = result.asteroids.filter(a => a.category === group);
      const tracked = objs.length;
      const phaCount = objs.filter(a => a.isPHA).length;
      const neoCount = objs.filter(a => a.isNEO).length;
      const avgA = objs.length > 0 ? objs.reduce((s, a) => s + (a.semiMajorAxisAU || 0), 0) / objs.length : 0;
      const avgE = objs.length > 0 ? objs.reduce((s, a) => s + (a.eccentricity || 0), 0) / objs.length : 0;
      const avgI = objs.length > 0 ? objs.reduce((s, a) => s + (a.inclination || 0), 0) / objs.length : 0;

      populations[group] = {
        description: expected[group].description,
        estimatedTotal: expected[group].estimatedTotal,
        tracked: tracked,
        coveragePct: expected[group].estimatedTotal > 0 ? Math.min(100, Math.round((tracked / expected[group].estimatedTotal) * 100)) : 0,
        phaCount: phaCount,
        neoCount: neoCount,
        averageA: Math.round(avgA * 1000) / 1000,
        averageE: Math.round(avgE * 1000000) / 1000000,
        averageI: Math.round(avgI * 100) / 100,
        status: tracked >= expected[group].estimatedTotal * 0.5 ? "Nominal" : tracked >= expected[group].estimatedTotal * 0.1 ? "Degraded" : tracked > 0 ? "Partial" : "Unavailable",
        ids: objs.slice(0, 100).map(a => ({
          designation: a.designation,
          spkid: a.spkid,
          name: a.name,
          a: a.semiMajorAxisAU,
          e: a.eccentricity,
          i: a.inclination,
          h: a.h,
          isPHA: a.isPHA,
          isNEO: a.isNEO,
          category: a.category,
          color: a.color,
          elements: a.elements
        }))
      };
    });

    populationCache = populations;
    populationCacheTimestamp = Date.now();

    res.json({ success: true, populations, generatedAt: new Date().toISOString() });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

router.get("/close-approaches", async (req, res) => {
  try {
    const dateMin = req.query.dateMin || new Date().toISOString().substring(0, 10);
    const dateMax = req.query.dateMax || new Date(Date.now() + 30 * 86400000).toISOString().substring(0, 10);
    const distMax = req.query.distMax || "0.05";
    const data = await fetchCloseApproachData(dateMin, dateMax, distMax);
    let phaSet = new Set();
    try {
      const catalogResult = await fetchAllAsteroids();
      phaSet = buildPHADesignationSet(catalogResult);
    } catch (error) {}
    patchPHAFlags(data, phaSet);
    res.json({ success: true, approaches: data, count: data.length });
  } catch (error) {
    res.json({ success: false, error: error.message, approaches: [] });
  }
});

const asteroidAlertState = {
  sentry: { items: [], fetchedAt: 0, attemptedAt: 0, error: null, loading: null },
  scout: { items: [], fetchedAt: 0, attemptedAt: 0, error: null, loading: null },
  cad: { items: [], fetchedAt: 0, attemptedAt: 0, error: null, loading: null },
  fireball: { items: [], fetchedAt: 0, attemptedAt: 0, error: null, loading: null }
};

const alertNumber = (value) => {
  const parsed = typeof value === "number" ? value : parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const alertGreatCircleKm = (lat1, lon1, lat2, lon2) => {
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2;
  return ASTEROID_ALERTS.earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const jplTime = (value) => {
  if (!value) return null;
  const text = String(value).trim().replace(/^(\d{4})-([A-Za-z]{3})-(\d{2})/, (match, year, month, day) => `${year}-${String(["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(month) + 1).padStart(2, "0")}-${day}`);
  const parsed = Date.parse(`${text.replace(" ", "T")}${/z$/i.test(text) ? "" : "Z"}`);
  return Number.isFinite(parsed) ? parsed : null;
};

const jplRows = (data) => {
  const fields = Array.isArray(data && data.fields) ? data.fields : [];
  return (Array.isArray(data && data.data) ? data.data : []).map((row) => (Array.isArray(row) ? Object.fromEntries(fields.map((field, index) => [field, row[index]])) : row));
};

const jplGet = async (url, params) => {
  const r = await axios.get(url, { ...AXIOS_CONFIG, timeout: ASTEROID_ALERTS.timeoutMs, params });
  return r.data;
};

const refreshAsteroidAlertSource = (key, intervalMs, loader) => {
  const entry = asteroidAlertState[key];
  const now = Date.now();
  if (entry.loading) return entry.loading;
  const due = entry.error ? now - entry.attemptedAt >= ASTEROID_ALERTS.failureRetryMs : now - entry.fetchedAt >= intervalMs;
  if (!due) return Promise.resolve();
  entry.attemptedAt = now;
  entry.loading = loader().then((items) => {
    entry.items = items;
    entry.fetchedAt = Date.now();
    entry.error = null;
  }).catch((error) => {
    entry.error = error && error.message ? error.message : String(error);
  }).finally(() => {
    entry.loading = null;
  });
  return entry.loading;
};

const loadSentryRisks = async () => jplRows(await jplGet(ASTEROID_ALERTS.sentry)).map((row) => ({
  des: row.des,
  name: row.fullname ? String(row.fullname).trim() : row.des,
  impactProbability: alertNumber(row.ip),
  palermoMax: alertNumber(row.ps_max),
  palermoCumulative: alertNumber(row.ps_cum),
  torinoMax: alertNumber(row.ts_max) || 0,
  impacts: alertNumber(row.n_imp),
  range: row.range || null,
  lastObservation: row.last_obs || null,
  diameterKm: alertNumber(row.diameter),
  h: alertNumber(row.h),
  vInf: alertNumber(row.v_inf)
})).filter((row) => row.des);

const loadScoutObjects = async () => jplRows(await jplGet(ASTEROID_ALERTS.scout)).map((row) => ({
  name: row.objectName,
  rating: row.rating === null || row.rating === undefined || row.rating === "" ? null : parseInt(row.rating, 10),
  neoScore: alertNumber(row.neoScore),
  phaScore: alertNumber(row.phaScore),
  ieoScore: alertNumber(row.ieoScore),
  geocentricScore: alertNumber(row.geocentricScore),
  observations: alertNumber(row.nObs),
  arcDays: alertNumber(row.arc),
  h: alertNumber(row.H),
  moid: alertNumber(row.moid),
  caDist: alertNumber(row.caDist),
  vInf: alertNumber(row.vInf),
  vMag: alertNumber(row.Vmag),
  lastRun: row.lastRun || null
})).filter((row) => row.name);

const loadCloseApproaches = async () => {
  const settings = ASTEROID_ALERTS;
  const [near, large] = await Promise.all([
    jplGet(settings.cad, { "date-min": "now", "date-max": `+${settings.closeApproachDays}`, "dist-max": `${settings.closeApproachMaxLd}LD`, fullname: "true", diameter: "true", sort: "dist" }),
    jplGet(settings.cad, { "date-min": "now", "date-max": `+${settings.largeObjectDays}`, "dist-max": `${settings.largeObjectMaxLd}LD`, "h-max": String(settings.largeObjectMaxH), fullname: "true", diameter: "true", sort: "dist" })
  ]);
  const merged = new Map();
  for (const row of [...jplRows(near), ...jplRows(large)]) {
    const key = `${row.des}|${row.cd}`;
    if (merged.has(key)) continue;
    const distAu = alertNumber(row.dist);
    merged.set(key, {
      des: row.des,
      name: row.fullname ? String(row.fullname).trim() : row.des,
      at: jplTime(row.cd),
      distKm: distAu !== null ? distAu * AU_KM : null,
      distMinKm: alertNumber(row.dist_min) !== null ? alertNumber(row.dist_min) * AU_KM : null,
      vRel: alertNumber(row.v_rel),
      h: alertNumber(row.h),
      diameterKm: alertNumber(row.diameter),
      timeSigma: row.t_sigma_f || null
    });
  }
  return Array.from(merged.values()).filter((row) => row.at && row.distKm !== null);
};

const loadFireballs = async () => {
  const since = new Date(Date.now() - ASTEROID_ALERTS.fireballDays * 86400000).toISOString().slice(0, 10);
  return jplRows(await jplGet(ASTEROID_ALERTS.fireball, { "date-min": since, "req-loc": "true", sort: "-date" })).map((row) => {
    const lat = alertNumber(row.lat);
    const lon = alertNumber(row.lon);
    return {
      at: jplTime(row.date),
      lat: lat === null ? null : row["lat-dir"] === "S" ? -lat : lat,
      lon: lon === null ? null : row["lon-dir"] === "W" ? -lon : lon,
      altitudeKm: alertNumber(row.alt),
      velocity: alertNumber(row.vel),
      radiatedEnergy: alertNumber(row.energy),
      impactEnergyKt: alertNumber(row["impact-e"])
    };
  }).filter((row) => row.at && row.lat !== null && row.lon !== null);
};

const asteroidAlertItems = () => {
  const settings = ASTEROID_ALERTS;
  const now = Date.now();
  const iso = (ms) => (ms ? new Date(ms).toISOString() : null);
  const utc = (ms) => new Date(ms).toUTCString().replace(" GMT", " UTC");
  const items = [];
  for (const row of asteroidAlertState.sentry.items) {
    const warn = row.torinoMax >= settings.sentryWarningTorino || (row.palermoMax !== null && row.palermoMax >= settings.sentryWarningPalermo);
    if (!warn) continue;
    const critical = row.torinoMax >= settings.sentryCriticalTorino || (row.palermoMax !== null && row.palermoMax >= settings.sentryCriticalPalermo);
    items.push({
      identity: `sentry|${row.des}`,
      kind: "impactRisk",
      severity: critical ? "CRITICAL" : "WARNING",
      global: true,
      title: `${row.name} Impact Risk`,
      message: `${row.name} has a cumulative impact probability of ${row.impactProbability !== null ? row.impactProbability.toExponential(1) : "unknown"} across ${row.range || "the next century"}, with a Torino rating of ${row.torinoMax} and a maximum Palermo rating of ${row.palermoMax !== null ? row.palermoMax.toFixed(2) : "unknown"}.`,
      source: "JPL Sentry",
      issuedAt: row.lastObservation ? iso(jplTime(row.lastObservation)) : null,
      eventAt: null,
      designation: row.des,
      details: { designation: row.des, impactProbability: row.impactProbability !== null ? row.impactProbability.toExponential(2) : null, torinoMax: row.torinoMax, palermoMax: row.palermoMax, palermoCumulative: row.palermoCumulative, potentialImpacts: row.impacts, impactYears: row.range, diameterKm: row.diameterKm, absoluteMagnitude: row.h, entryVelocityKms: row.vInf, lastObservation: row.lastObservation }
    });
  }
  for (const row of asteroidAlertState.scout.items) {
    if (row.rating === null || row.rating < settings.scoutWarningRating) continue;
    items.push({
      identity: `scout|${row.name}`,
      kind: "unconfirmed",
      severity: row.rating >= settings.scoutCriticalRating ? "CRITICAL" : "WARNING",
      global: true,
      title: `${row.name} ${settings.scoutRatingLabels[row.rating] || "Elevated"} Impact Rating`,
      message: `The unconfirmed object ${row.name} has a Scout impact rating of ${settings.scoutRatingLabels[row.rating] || row.rating} from ${row.observations ?? "few"} observations over ${row.arcDays !== null ? `${(row.arcDays * 24).toFixed(1)} hours` : "a short arc"}, and follow-up observations will refine it quickly.`,
      source: "JPL Scout",
      issuedAt: row.lastRun ? iso(jplTime(row.lastRun)) : null,
      eventAt: null,
      designation: row.name,
      details: { designation: row.name, impactRating: settings.scoutRatingLabels[row.rating] || row.rating, neoScore: row.neoScore, phaScore: row.phaScore, observations: row.observations, arcHours: row.arcDays !== null ? Math.round(row.arcDays * 2400) / 100 : null, absoluteMagnitude: row.h, moidAu: row.moid, visualMagnitude: row.vMag }
    });
  }
  for (const row of asteroidAlertState.cad.items) {
    if (row.at < now) continue;
    const ld = row.distKm / settings.lunarDistanceKm;
    const large = row.h !== null && row.h <= settings.largeObjectMaxH;
    if (!(ld <= settings.closeApproachMaxLd || (large && ld <= settings.largeObjectMaxLd))) continue;
    const critical = row.distKm <= settings.closeApproachCriticalKm || (large && ld <= settings.closeApproachMaxLd);
    items.push({
      identity: `approach|${row.des}|${Math.round(row.at / 3600000)}`,
      kind: "closeApproach",
      severity: critical ? "CRITICAL" : "WARNING",
      global: true,
      title: `${row.name} Close Approach`,
      message: `${row.name} passes ${Math.round(row.distKm).toLocaleString()} km from Earth (${ld.toFixed(2)} lunar distances) at ${utc(row.at)} at ${row.vRel !== null ? `${row.vRel.toFixed(1)} km/s` : "an unknown speed"}.`,
      source: "JPL Close Approach Data",
      issuedAt: null,
      eventAt: iso(row.at),
      designation: row.des,
      details: { designation: row.des, distanceKm: Math.round(row.distKm), lunarDistances: Math.round(ld * 100) / 100, minimumDistanceKm: row.distMinKm !== null ? Math.round(row.distMinKm) : null, relativeVelocityKms: row.vRel, absoluteMagnitude: row.h, diameterKm: row.diameterKm, timeUncertainty: row.timeSigma }
    });
  }
  for (const row of asteroidAlertState.fireball.items) {
    const energy = row.impactEnergyKt || 0;
    items.push({
      identity: `fireball|${row.at}|${row.lat.toFixed(1)}|${row.lon.toFixed(1)}`,
      kind: "fireball",
      severity: energy >= settings.fireballCriticalKt ? "CRITICAL" : "WARNING",
      global: energy >= settings.fireballWarningKt,
      title: `Fireball Over ${Math.abs(row.lat).toFixed(1)}°${row.lat < 0 ? "S" : "N"}, ${Math.abs(row.lon).toFixed(1)}°${row.lon < 0 ? "W" : "E"}`,
      message: `A fireball was detected at ${utc(row.at)}${row.altitudeKm !== null ? ` at ${row.altitudeKm} km altitude` : ""} with an estimated impact energy of ${energy ? `${energy} kt` : "an unknown amount"}.`,
      source: "CNEOS Fireballs",
      issuedAt: null,
      eventAt: iso(row.at),
      lat: row.lat,
      lon: row.lon,
      nearRadiusKm: settings.fireballNearKm,
      details: { impactEnergyKt: row.impactEnergyKt, radiatedEnergy: row.radiatedEnergy, altitudeKm: row.altitudeKm, velocityKms: row.velocity }
    });
  }
  return items;
};

const parseAsteroidAlertPoints = (value) => String(value || "").split(";").map((part) => {
  const [id, lat, lon] = part.split(":");
  const latNum = alertNumber(lat);
  const lonNum = alertNumber(lon);
  return id && latNum !== null && lonNum !== null && latNum >= -90 && latNum <= 90 && lonNum >= -180 && lonNum <= 180 ? { id: id.slice(0, 80), lat: latNum, lon: lonNum } : null;
}).filter(Boolean).slice(0, ASTEROID_ALERTS.maxPoints);

router.get("/asteroid-alerts", async (req, res) => {
  try {
    const settings = ASTEROID_ALERTS;
    await Promise.all([
      refreshAsteroidAlertSource("sentry", settings.sentryRefreshMs, loadSentryRisks),
      refreshAsteroidAlertSource("scout", settings.scoutRefreshMs, loadScoutObjects),
      refreshAsteroidAlertSource("cad", settings.cadRefreshMs, loadCloseApproaches),
      refreshAsteroidAlertSource("fireball", settings.fireballRefreshMs, loadFireballs)
    ]);
    const points = parseAsteroidAlertPoints(req.query.points);
    const alerts = asteroidAlertItems().map((alert) => ({
      ...alert,
      distances: alert.kind === "fireball" ? Object.fromEntries(points.map((point) => [point.id, Math.round(alertGreatCircleKm(point.lat, point.lon, alert.lat, alert.lon))])) : {}
    }));
    const status = (entry) => (entry.error ? "Failed" : entry.fetchedAt ? "Available" : "Pending");
    const names = { sentry: "JPL Sentry", scout: "JPL Scout", cad: "JPL Close Approach Data", fireball: "CNEOS Fireballs" };
    res.json({
      success: true,
      alerts,
      sources: Object.entries(names).map(([key, name]) => ({ name, status: status(asteroidAlertState[key]), checkedAt: asteroidAlertState[key].fetchedAt ? new Date(asteroidAlertState[key].fetchedAt).toISOString() : null, error: asteroidAlertState[key].error })),
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, message: `The asteroid alerts could not be built because of the error "${String(error.message).replace(/\.$/, "")}".` });
  }
});

const asteroidAnalysisCache = new Map();

const requestAsteroidAnalysis = async (payload) => {
  const settings = ASTEROID_ANALYSIS;
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
  const url = settings.endpoint.replace("{model}", encodeURIComponent(settings.model));
  const options = { headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY }, timeout: settings.timeoutMs };
  let response;
  try {
    response = await axios.post(url, body(true), options);
  } catch (error) {
    const message = String(error?.response?.data?.error?.message || "");
    if (!(error?.response?.status === 400 && /thinking/i.test(message))) throw error;
    response = await axios.post(url, body(false), options);
  }
  const raw = (response.data?.candidates?.[0]?.content?.parts || []).map((part) => part.text || "").join("");
  const parsed = JSON.parse(raw.replace(/```json\s*/g, "").replace(/```/g, "").trim());
  const list = (value) => (Array.isArray(value) ? value : []).map((item) => String(item).trim()).filter(Boolean);
  return {
    summary: String(parsed.summary || "").trim(),
    threats: list(parsed.threats),
    actions: list(parsed.actions),
    timing: String(parsed.timing || "").trim(),
    confidence: String(parsed.confidence || "").trim(),
    model: settings.model,
    generatedAt: new Date().toISOString()
  };
};

router.post("/asteroid-alerts/analysis", async (req, res) => {
  const settings = ASTEROID_ANALYSIS;
  if (!process.env.GEMINI_API_KEY) return res.status(503).json({ success: false, message: "The AI analysis is unavailable because GEMINI_API_KEY is not configured." });
  const alert = req.body && typeof req.body.alert === "object" ? req.body.alert : null;
  if (!alert || !alert.key || !alert.message) return res.status(400).json({ success: false, message: "An alert with a key and a message is required." });
  const text = (value, limit = 400) => (value === null || value === undefined || value === "" ? null : String(value).slice(0, limit));
  const details = Object.fromEntries(Object.entries(alert.details && typeof alert.details === "object" ? alert.details : {}).filter(([, value]) => ["number", "boolean"].includes(typeof value) || (typeof value === "string" && value.length <= 200)));
  const payload = {
    alertType: text(alert.kind, 40),
    title: text(alert.title, 200),
    message: text(alert.message, 600),
    severity: text(alert.severity, 20),
    source: text(alert.source, 60),
    issuedAt: text(alert.issuedAt, 40),
    eventAt: text(alert.eventAt, 40),
    location: alertNumber(alert.lat) !== null && alertNumber(alert.lon) !== null ? { latitude: alertNumber(alert.lat), longitude: alertNumber(alert.lon) } : null,
    nearbyPlaces: Array.isArray(alert.nearby) ? alert.nearby.slice(0, 10).map((place) => ({ name: text(place.label, 80), distanceKm: alertNumber(place.distanceKm) })) : [],
    details,
    now: new Date().toISOString()
  };
  const key = `${String(alert.key).slice(0, 300)}|${payload.nearbyPlaces.map((place) => place.name).join(",")}`;
  const cached = asteroidAnalysisCache.get(key);
  if (cached && cached.result && Date.now() - cached.at < settings.cacheMs) return res.json({ success: true, analysis: cached.result, cached: true });
  if (cached && cached.failedAt && Date.now() - cached.failedAt < settings.retryAfterMs) return res.status(502).json({ success: false, message: `The AI analysis could not be generated by ${settings.name}. ${cached.reason}` });
  try {
    const loading = cached && cached.loading ? cached.loading : requestAsteroidAnalysis(payload);
    if (!cached || !cached.loading) asteroidAnalysisCache.set(key, { loading });
    const result = await loading;
    asteroidAnalysisCache.set(key, { result, at: Date.now() });
    while (asteroidAnalysisCache.size > settings.cacheLimit) asteroidAnalysisCache.delete(asteroidAnalysisCache.keys().next().value);
    res.json({ success: true, analysis: result, cached: false });
  } catch (error) {
    const reason = String(error?.response?.data?.error?.message || error.message || "The request failed.").replace(/\.?$/, ".");
    asteroidAnalysisCache.set(key, { failedAt: Date.now(), reason });
    res.status(502).json({ success: false, message: `The AI analysis could not be generated by ${settings.name}. ${reason}` });
  }
});

const warmCache = async () => {
  try {
    if (asteroidCache && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_DURATION) {
      return;
    }
    await startSharedFetch();
  } catch (error) {}
};

const warmNEOWatch = async () => {
  try {
    await fetchNEOWatch();
  } catch (error) {}
};

warmNEOWatch();
setInterval(warmNEOWatch, NEO_WATCH_TTL);

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
  if (neoWatchAICache.timestamp && now - neoWatchAICache.timestamp > PANEL_AI_TTL) {
    neoWatchAICache.data = null;
    neoWatchAICache.timestamp = 0;
  }
  if (sentryCacheTimestamp && now - sentryCacheTimestamp > SENTRY_TTL) {
    sentryCache = null;
    sentryCacheTimestamp = null;
  }
  if (populationCacheTimestamp && now - populationCacheTimestamp > POPULATION_TTL) {
    populationCache = null;
    populationCacheTimestamp = null;
  }
}, 60 * 60 * 1000);

module.exports = router;
module.exports.catalogSnapshot = async () => {
  const result = await fetchAllAsteroids();
  const asteroids = result && Array.isArray(result.asteroids) ? result.asteroids : [];
  return { asteroids, timestamp: asteroids.length ? cacheTimestamp || Date.now() : null, error: result && !result.success ? (result.error || (result.errors || [])[0] || null) : null };
};

module.exports.sentrySnapshot = async () => {
  const objects = await fetchSentryWatch();
  return { objects: Array.isArray(objects) ? objects : [], timestamp: sentryCacheTimestamp || Date.now() };
};