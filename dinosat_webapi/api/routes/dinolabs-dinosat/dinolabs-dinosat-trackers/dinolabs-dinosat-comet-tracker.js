const express = require("express");
const axios = require("axios");
const v8 = require("v8");
const router = express.Router();

const AU_KM = 149597870.7;
const SUN_GM = 1.32712440018e11;

const NASA_API_KEY = process.env.NASA_API_KEY || "DEMO_KEY";
const CONTACT_EMAIL = process.env.COMET_CONTACT_EMAIL || "set-COMET_CONTACT_EMAIL-env-var";

const AXIOS_CONFIG = {
  timeout: 300000,
  maxContentLength: Infinity,
  maxBodyLength: Infinity,
  headers: {
    "User-Agent": `CometCatalog-Research/1.0 (+contact: ${CONTACT_EMAIL})`,
    "Accept": "application/json, text/plain, */*",
    "Accept-Encoding": "gzip, deflate"
  }
};

const OBSERVATION_AXIOS_TIMEOUT_MS = 8000;
const GEMINI_STAGE_TIMEOUT_MS = 25000;

const CACHE_DURATION = 6 * 60 * 60 * 1000;
const NEO_WATCH_TTL = 15 * 60 * 1000;
const GEMINI_TTL = 24 * 60 * 60 * 1000;
const OBSERVATION_TTL = 60 * 60 * 1000;
const PANEL_AI_TTL = 60 * 60 * 1000;
const SENTRY_TTL = 60 * 60 * 1000;
const POPULATION_TTL = 6 * 60 * 60 * 1000;
const GEMINI_CACHE_MAX_ENTRIES = 500;
const OBSERVATION_CACHE_MAX_ENTRIES = 500;

const FETCH_CONCURRENCY = 2;
const FETCH_MAX_RETRIES = 4;
const FETCH_RETRY_BASE_MS = 750;
const FETCH_RETRY_CAP_MS = 8000;

const MEMORY_SAMPLE_WINDOW = 64;
const MEMORY_ROW_CHECK_STRIDE = 500;
const MEMORY_PROJECTION_SIGMA = 2;

const APPARITION_HIGH_CONFIDENCE_APPARITIONS = 2;

const CATEGORY_COLORS = {
  "Jupiter-Family": "#00D4FF",
  "Halley-Type": "#AB47BC",
  "Encke-Type": "#FF9500",
  "Chiron-Type": "#FFA726",
  "Long-Period": "#42A5F5",
  "Near-Parabolic": "#9C27B0",
  "Hyperbolic": "#E91E63",
  "Interstellar": "#FF4081",
  "Sungrazer": "#FFD060",
  "Main-Belt Comet": "#4ECDC4",
  "Centaur Comet": "#A8E6CF",
  "Defunct": "#5a5a6a",
  "Disintegrated": "#704020",
  "Unclassified": "#808080"
};

const SBDB_QUERY_BASE = "https://ssd-api.jpl.nasa.gov/sbdb_query.api";
const SBDB_LOOKUP_BASE = "https://ssd-api.jpl.nasa.gov/sbdb.api";
const CAD_BASE = "https://ssd-api.jpl.nasa.gov/cad.api";

const SBDB_FIELDS_FULL = "spkid,full_name,pdes,name,prefix,kind,neo,pha,M1,M2,K1,K2,A1,A2,A3,DT,diameter,albedo,rot_per,GM,extent,spec_B,spec_T,class,e,q,a,i,om,w,ma,tp,epoch,moid,moid_jup,n_obs_used,first_obs,last_obs,producer,n_del_obs_used,n_dop_obs_used";
const SBDB_FIELDS_BASIC = "spkid,full_name,pdes,name,kind,M1,K1,M2,K2,A1,A2,A3,diameter,albedo,rot_per,spec_B,spec_T,class,e,q,a,i,om,w,ma,tp,epoch,moid,moid_jup,n_obs_used,first_obs,last_obs";

const SBDB_QUERIES = [
  {
    name: "All Comets",
    params: {
      "fields": SBDB_FIELDS_FULL,
      "sb-kind": "c",
      "full-prec": "true"
    },
    label: "COM"
  },
  {
    name: "Jupiter-Family Comets",
    params: {
      "fields": SBDB_FIELDS_BASIC,
      "sb-class": "JFc",
      "full-prec": "true"
    },
    label: "JFC"
  },
  {
    name: "Jupiter-Family Numbered",
    params: {
      "fields": SBDB_FIELDS_BASIC,
      "sb-class": "JFC",
      "full-prec": "true"
    },
    label: "JFCN"
  },
  {
    name: "Halley-Type Comets",
    params: {
      "fields": SBDB_FIELDS_BASIC,
      "sb-class": "HTC",
      "full-prec": "true"
    },
    label: "HTC"
  },
  {
    name: "Encke-Type Comets",
    params: {
      "fields": SBDB_FIELDS_BASIC,
      "sb-class": "ETc",
      "full-prec": "true"
    },
    label: "ETC"
  },
  {
    name: "Chiron-Type Comets",
    params: {
      "fields": SBDB_FIELDS_BASIC,
      "sb-class": "CTc",
      "full-prec": "true"
    },
    label: "CTC"
  },
  {
    name: "Hyperbolic Comets",
    params: {
      "fields": SBDB_FIELDS_BASIC,
      "sb-class": "HYP",
      "full-prec": "true"
    },
    label: "HYP"
  },
  {
    name: "Parabolic Comets",
    params: {
      "fields": SBDB_FIELDS_BASIC,
      "sb-class": "PAR",
      "full-prec": "true"
    },
    label: "PAR"
  },
  {
    name: "Comets with Activity (large q)",
    params: {
      "fields": SBDB_FIELDS_BASIC,
      "sb-kind": "c",
      "full-prec": "true"
    },
    label: "ACT"
  }
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

let cometCache = null;
let cacheTimestamp = null;
let inflightFetch = null;
let partialAccumulation = [];
const fetchSubscribers = new Set();

let cometWatchCache = null;
let cometWatchTimestamp = null;
let inflightCometWatch = null;

let apparitionCache = null;
let apparitionCacheTimestamp = null;

let populationCache = null;
let populationCacheTimestamp = null;

const geminiCache = new Map();
const observationCache = new Map();
const cometWatchAICache = { data: null, timestamp: 0 };

const apiBreakers = {
  jplSBDB: { state: "closed", consecutiveFailures: 0, failureThreshold: 3, openedAtMs: 0, cooldownMs: 5 * 60 * 1000, halfOpenAfterMs: 60 * 1000, lastError: null, lastSuccessMs: 0, totalRequests: 0, totalFailures: 0 },
  cad: { state: "closed", consecutiveFailures: 0, failureThreshold: 3, openedAtMs: 0, cooldownMs: 5 * 60 * 1000, halfOpenAfterMs: 60 * 1000, lastError: null, lastSuccessMs: 0, totalRequests: 0, totalFailures: 0 }
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

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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

const julianToISO = (jd) => {
  if (!Number.isFinite(jd)) return null;
  try {
    const ms = (jd - 2440587.5) * 86400000;
    const d = new Date(ms);
    return d.toISOString();
  } catch (error) {
    return null;
  }
};

const dateToJD = (date) => date.getTime() / 86400000.0 + 2440587.5;

const classifyComet = (e, q, a, period, orbitClass, fullName) => {
  if (orbitClass) {
    const c = String(orbitClass).toUpperCase();
    if (c === "JFC" || c === "JFc".toUpperCase()) return "Jupiter-Family";
    if (c === "HTC") return "Halley-Type";
    if (c === "ETC" || c === "ETc".toUpperCase()) return "Encke-Type";
    if (c === "CTC" || c === "CTc".toUpperCase()) return "Chiron-Type";
    if (c === "HYP") return "Hyperbolic";
    if (c === "PAR") return "Near-Parabolic";
    if (c === "COM" || c === "COMET") {
    }
  }
  if (q !== null && q !== undefined && q < 0.01) return "Sungrazer";
  if (e > 1.05) return "Interstellar";
  if (e > 1) return "Hyperbolic";
  if (Math.abs(e - 1) < 1e-4) return "Near-Parabolic";
  if (period !== null && period !== undefined) {
    if (period < 20) {
      if (a !== null && a !== undefined && a < 4.0) return "Encke-Type";
      return "Jupiter-Family";
    }
    if (period < 200) return "Halley-Type";
    return "Long-Period";
  }
  if (a !== null && a !== undefined && a > 5.5 && a < 30) return "Centaur Comet";
  if (fullName && fullName.toLowerCase().includes("main-belt")) return "Main-Belt Comet";
  return "Unclassified";
};

const inferGroup = (name, designation, category) => {
  const lowerName = (name || "").toLowerCase();
  if (lowerName.includes("halley")) return "1P/Halley";
  if (lowerName.includes("encke")) return "2P/Encke";
  if (lowerName.includes("biela")) return "3D/Biela";
  if (lowerName.includes("tempel") && lowerName.includes("1")) return "9P/Tempel 1";
  if (lowerName.includes("tempel") && lowerName.includes("2")) return "10P/Tempel 2";
  if (lowerName.includes("hartley")) return "103P/Hartley";
  if (lowerName.includes("wild")) return "81P/Wild";
  if (lowerName.includes("borrelly")) return "19P/Borrelly";
  if (lowerName.includes("churyumov") || lowerName.includes("67p")) return "67P/Churyumov-Gerasimenko";
  if (lowerName.includes("hale-bopp")) return "C/1995 O1 Hale-Bopp";
  if (lowerName.includes("hyakutake")) return "C/1996 B2 Hyakutake";
  if (lowerName.includes("mcnaught")) return "McNaught";
  if (lowerName.includes("ikeya-seki")) return "Ikeya-Seki Sungrazer";
  if (lowerName.includes("lovejoy")) return "Lovejoy Sungrazer";
  if (lowerName.includes("ison")) return "C/2012 S1 ISON";
  if (lowerName.includes("siding spring")) return "C/2013 A1 Siding Spring";
  if (lowerName.includes("oumuamua") || lowerName.includes("'oumuamua")) return "1I/'Oumuamua";
  if (lowerName.includes("borisov")) return "2I/Borisov";
  if (lowerName.includes("kreutz")) return "Kreutz Sungrazer Family";
  if (lowerName.includes("schwassmann")) return "Schwassmann-Wachmann";
  if (lowerName.includes("shoemaker") && lowerName.includes("levy")) return "Shoemaker-Levy 9";
  if (lowerName.includes("neowise")) return "C/2020 F3 NEOWISE";
  if (lowerName.includes("leonard")) return "C/2021 A1 Leonard";
  if (category) return category;
  return "General";
};

const inferActivityStatus = (fullName, lastObs, e, q) => {
  const lowerName = (fullName || "").toLowerCase();
  if (lowerName.includes("disintegrated") || lowerName.includes("destroyed") || lowerName.match(/^d\//i)) return "Disintegrated";
  if (lowerName.includes("lost") || lowerName.includes("defunct")) return "Lost";
  if (q !== null && q !== undefined && q < 0.01) return "Active";
  try {
    if (lastObs) {
      const last = new Date(lastObs);
      const daysSince = (Date.now() - last.getTime()) / 86400000;
      if (daysSince < 365) return "Active";
      if (daysSince < 365 * 5) return "Dormant";
      if (daysSince > 365 * 30) return "Lost";
    }
  } catch (error) {}
  if (e > 1) return "Active";
  return "Unknown";
};

const buildCometFromSBDB = (fields, dataRow, source) => {
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
    const cleanName = (fullName && fullName.trim()) || (name && name.trim()) || pdes || spkid;
    const designation = pdes || prefix || spkid || "";

    const e = parseFloat(get("e"));
    const q = parseFloat(get("q"));
    const a = parseFloat(get("a"));
    const i = parseFloat(get("i"));
    const om = parseFloat(get("om"));
    const w = parseFloat(get("w"));
    const ma = parseFloat(get("ma"));
    const tp = parseFloat(get("tp"));
    const epoch = parseFloat(get("epoch"));
    const moid = parseFloat(get("moid"));
    const moidJup = parseFloat(get("moid_jup"));
    const m1 = parseFloat(get("M1"));
    const k1 = parseFloat(get("K1"));
    const m2 = parseFloat(get("M2"));
    const k2 = parseFloat(get("K2"));
    const a1 = parseFloat(get("A1"));
    const a2 = parseFloat(get("A2"));
    const a3 = parseFloat(get("A3"));
    const diameter = parseFloat(get("diameter"));
    const albedo = parseFloat(get("albedo"));
    const rotPer = parseFloat(get("rot_per"));
    const gm = parseFloat(get("GM"));
    const numObs = parseInt(get("n_obs_used"));
    const firstObs = get("first_obs");
    const lastObs = get("last_obs");
    const orbitClass = get("class");
    const specB = get("spec_B");
    const specT = get("spec_T");
    const kind = get("kind");

    const isCometKind = !kind || String(kind).toLowerCase().startsWith("c");

    if (!Number.isFinite(e) || !Number.isFinite(epoch)) return null;
    if (e < 0) return null;

    let qFinal = Number.isFinite(q) ? q : null;
    let aFinal = Number.isFinite(a) ? a : null;
    if (qFinal === null && aFinal !== null && e < 1) {
      qFinal = aFinal * (1 - e);
    }
    if (aFinal === null && qFinal !== null && e < 1) {
      aFinal = qFinal / (1 - e);
    }

    if (qFinal === null || qFinal <= 0) return null;

    const isBound = e < 1;
    const aphelion = isBound && aFinal !== null ? aFinal * (1 + e) : null;
    const period = isBound && aFinal !== null && aFinal > 0 ? Math.sqrt(Math.pow(aFinal, 3)) : null;
    const periodDays = period !== null ? period * 365.25 : null;

    const category = classifyComet(e, qFinal, aFinal, period, orbitClass, fullName);
    const color = CATEGORY_COLORS[category] || "#FFFFFF";
    const group = inferGroup(cleanName, designation, category);
    const observationArcDays = computeObservationArcDays(firstObs, lastObs);
    const activityStatus = inferActivityStatus(fullName, lastObs, e, qFinal);
    const epochISO = julianToISO(epoch);
    const tpISO = Number.isFinite(tp) ? julianToISO(tp) : null;

    let apparitionCount = null;
    if (period !== null && firstObs && lastObs) {
      const arcYears = observationArcDays !== null ? observationArcDays / 365.25 : null;
      if (arcYears !== null && period > 0) {
        apparitionCount = Math.max(1, Math.round(arcYears / period));
      }
    } else if (!isBound) {
      apparitionCount = 1;
    }

    return {
      id: `cmt_${spkid || designation || cleanName}`,
      name: cleanName,
      designation: designation,
      spkid: spkid,
      category: category,
      group: group,
      color: color,
      active: false,
      source: source,
      status: "Active",
      activityStatus: activityStatus,
      isBound: isBound,
      m1: Number.isFinite(m1) ? m1 : null,
      k1: Number.isFinite(k1) ? k1 : (Number.isFinite(m1) ? 10 : null),
      m2: Number.isFinite(m2) ? m2 : null,
      k2: Number.isFinite(k2) ? k2 : null,
      a1: Number.isFinite(a1) ? a1 : null,
      a2: Number.isFinite(a2) ? a2 : null,
      a3: Number.isFinite(a3) ? a3 : null,
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
      apparitionCount: apparitionCount,
      firstObs: firstObs,
      lastObs: lastObs,
      epochISO: epochISO,
      perihelionTimeISO: tpISO,
      orbitalPeriodYears: period !== null ? Math.round(period * 1000) / 1000 : null,
      orbitalPeriodDays: periodDays !== null ? Math.round(periodDays * 100) / 100 : null,
      perihelionAU: Math.round(qFinal * 100000) / 100000,
      aphelionAU: aphelion !== null ? Math.round(aphelion * 100000) / 100000 : null,
      semiMajorAxisAU: aFinal !== null ? Math.round(aFinal * 100000) / 100000 : null,
      eccentricity: Math.round(e * 1000000) / 1000000,
      inclination: Number.isFinite(i) ? Math.round(i * 100) / 100 : 0,
      raan: Number.isFinite(om) ? Math.round(om * 100) / 100 : 0,
      argOfPerihelion: Number.isFinite(w) ? Math.round(w * 100) / 100 : 0,
      meanAnomaly: Number.isFinite(ma) ? Math.round(ma * 100) / 100 : null,
      perihelionTime: Number.isFinite(tp) ? tp : null,
      elements: {
        a: aFinal,
        e: e,
        q: qFinal,
        i: Number.isFinite(i) ? i : 0,
        om: Number.isFinite(om) ? om : 0,
        w: Number.isFinite(w) ? w : 0,
        ma: Number.isFinite(ma) ? ma : null,
        tp: Number.isFinite(tp) ? tp : null,
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

const fetchSBDBQuery = async (query) => {
  if (!breakerCanCall(apiBreakers.jplSBDB)) {
    throw new Error(`JPL SBDB circuit breaker is open with ${apiBreakers.jplSBDB.consecutiveFailures} prior failures.`);
  }
  apiBreakers.jplSBDB.totalRequests++;

  const params = new URLSearchParams(query.params);
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

const doFetchAllComets = async (callbacks = {}) => {
  const { onBatch, onProgress, onError, isCancelled } = callbacks;

  const allComets = [];
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
            onError(query.name, "Memory budget exhausted before query.");
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
      let data = await fetchSBDBQuery(query);
      if (!data || !data.fields || !data.data) {
        throw new Error("Malformed SBDB response.");
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
        const comet = buildCometFromSBDB(fields, rows[r], query.name);
        processed++;
        if (!comet) continue;
        if (seenIds.has(comet.id)) continue;
        seenIds.add(comet.id);
        allComets.push(comet);
        newOnes.push(comet);
      }
      memoryGuard.endBatch();

      data.data = null;
      data = null;

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
          onError(query.name, `Memory halt at row ${processed} of ${totalRows}.`);
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

  allComets.sort((a, b) => {
    if (a.activityStatus === "Active" && b.activityStatus !== "Active") return -1;
    if (b.activityStatus === "Active" && a.activityStatus !== "Active") return 1;
    if ((a.perihelionAU || 999) !== (b.perihelionAU || 999)) {
      return (a.perihelionAU || 999) - (b.perihelionAU || 999);
    }
    return a.name.localeCompare(b.name);
  });

  lastMemorySnapshot = memoryGuard.snapshot();

  return {
    success: allComets.length > 0,
    comets: allComets,
    errors: errors,
    metadata: {
      totalSources: SBDB_QUERIES.length,
      successfulSources: successfulSources,
      memoryHaltedSources: memoryHaltedSources,
      totalComets: allComets.length,
      cached: false,
      memoryOptimized: true,
      memoryAware: true,
      memory: lastMemorySnapshot,
      provider: "JPL SBDB",
      loadTimeMs: Date.now() - overallStart
    }
  };
};

const startSharedFetch = () => {
  if (inflightFetch) return inflightFetch;
  partialAccumulation = [];

  const promise = (async () => {
    return await doFetchAllComets({
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
      cometCache = result;
      cacheTimestamp = Date.now();
    }
  }).catch(() => {}).finally(() => {
    inflightFetch = null;
    partialAccumulation = [];
  });

  return promise;
};

const fetchAllComets = async () => {
  if (cometCache && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
    return cometCache;
  }
  try {
    return await startSharedFetch();
  } catch (error) {
    return {
      success: false,
      error: `An unexpected error occurred: ${error.message}.`,
      comets: [],
      errors: [`An unexpected error occurred: ${error.message}.`],
      metadata: { totalSources: 0, successfulSources: 0, totalComets: 0, cached: false }
    };
  }
};

const buildApparitionCandidates = (catalog, now) => {
  if (!catalog || !catalog.success) return [];
  const nowJD = dateToJD(now);
  const oneYearMs = 365.25 * 86400000;
  const candidates = [];

  for (const c of catalog.comets) {
    if (c.activityStatus === "Disintegrated" || c.activityStatus === "Lost") continue;
    if (!c.perihelionAU) continue;

    const tpJD = c.elements?.tp;
    let tpDate = null;
    let yearsToTp = null;
    if (Number.isFinite(tpJD)) {
      tpDate = new Date((tpJD - 2440587.5) * 86400000);
      yearsToTp = (tpJD - nowJD) / 365.25;
    }

    const peakMag = (Number.isFinite(c.m1) && Number.isFinite(c.perihelionAU))
      ? c.m1 + (c.k1 || 10) * Math.log10(c.perihelionAU) + 5 * Math.log10(Math.max(0.1, c.perihelionAU - 1))
      : null;

    let riskTier = "Low";
    if (yearsToTp !== null) {
      const days = yearsToTp * 365.25;
      if (days >= 0 && days < 30) riskTier = "Imminent";
      else if (days >= 0 && days < 180) riskTier = "High";
      else if (days >= 0 && days < 365) riskTier = "Moderate";
      else riskTier = "Low";
    }

    const tier = (c.apparitionCount && c.apparitionCount >= APPARITION_HIGH_CONFIDENCE_APPARITIONS) ? "highConfidence" : "heuristic";

    candidates.push({
      designation: c.designation,
      name: c.name,
      category: c.category,
      activityStatus: c.activityStatus,
      q: c.perihelionAU,
      e: c.eccentricity,
      i: c.inclination,
      moidAU: c.moidAU,
      m1: c.m1,
      k1: c.k1,
      peakMag: peakMag !== null ? Math.round(peakMag * 10) / 10 : null,
      tpJD: tpJD,
      tpDate: tpDate ? tpDate.toISOString().substring(0, 10) : null,
      yearsToTp: yearsToTp !== null ? Math.round(yearsToTp * 100) / 100 : null,
      riskTier,
      tier,
      apparitionCount: c.apparitionCount,
      diameter: c.diameter,
      elements: c.elements
    });
  }

  candidates.sort((a, b) => {
    const aTime = a.tpJD || Infinity;
    const bTime = b.tpJD || Infinity;
    return aTime - bTime;
  });

  return candidates;
};

const fetchApparitionWatch = async () => {
  if (apparitionCache && apparitionCacheTimestamp && Date.now() - apparitionCacheTimestamp < SENTRY_TTL) {
    return apparitionCache;
  }
  const catalog = await fetchAllComets();
  const candidates = buildApparitionCandidates(catalog, new Date());
  apparitionCache = candidates;
  apparitionCacheTimestamp = Date.now();
  return candidates;
};

const fetchCloseApproachData = async (dateMin, dateMax, distMax) => {
  if (!breakerCanCall(apiBreakers.cad)) {
    throw new Error("The CAD circuit breaker is open.");
  }
  apiBreakers.cad.totalRequests++;
  try {
    const params = new URLSearchParams({
      "date-min": dateMin,
      "date-max": dateMax,
      "dist-max": String(distMax),
      "sort": "date",
      "fullname": "true",
      "body": "Earth",
      "kind": "c"
    });
    const r = await axios.get(`${CAD_BASE}?${params.toString()}`, AXIOS_CONFIG);
    breakerOnSuccess(apiBreakers.cad);
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
        h: Number.isFinite(h) ? h : null
      };
    });
    return result;
  } catch (error) {
    breakerOnFailure(apiBreakers.cad, error);
    throw error;
  }
};

const fetchCometWatch = async () => {
  if (cometWatchCache && cometWatchTimestamp && Date.now() - cometWatchTimestamp < NEO_WATCH_TTL) {
    return cometWatchCache;
  }
  if (inflightCometWatch) return inflightCometWatch;

  inflightCometWatch = (async () => {
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
    const date30 = new Date(now.getTime() + 30 * 86400000);
    const date90 = new Date(now.getTime() + 90 * 86400000);
    const date365 = new Date(now.getTime() + 365 * 86400000);
    const dateMinus30 = new Date(now.getTime() - 30 * 86400000);
    const nowJD = dateToJD(now);
    const tp90JD = dateToJD(date90);

    let catalogResult = null;
    try {
      catalogResult = await fetchAllComets();
    } catch (error) {
      data.errors.push(`Catalog fetch failed: ${error.message}.`);
    }

    try {
      const ca365 = await fetchCloseApproachData(formatDate(now), formatDate(date365), "0.5");
      data.sources.push("CAD-365d");

      const cutoff30Ms = date30.getTime();
      const within = (p, ms) => {
        try {
          return new Date(p.cdDate).getTime() <= ms;
        } catch (error) {
          return false;
        }
      };

      const ca30 = ca365.filter(p => within(p, cutoff30Ms));

      data.next30Days = ca30.length;
      data.next365Days = ca365.length;
      data.upcomingPasses = ca365;

      if (ca30.length > 0) {
        const closest = ca30.reduce((min, p) => p.distAU < min.distAU ? p : min, ca30[0]);
        data.closestUpcoming = closest;
      } else if (ca365.length > 0) {
        const closest = ca365.reduce((min, p) => p.distAU < min.distAU ? p : min, ca365[0]);
        data.closestUpcoming = closest;
      }
    } catch (error) {
      data.errors.push(`CAD fetch failed: ${error.message}.`);
    }

    try {
      if (catalogResult && catalogResult.success) {
        const upcomingPerihelionList = [];
        let earthCrossingCount = 0;
        let activeCount = 0;
        let brightApparitions = 0;

        for (const c of catalogResult.comets) {
          if (c.activityStatus === "Active") activeCount++;
          if (c.perihelionAU !== null && c.perihelionAU < 1.017) earthCrossingCount++;

          const tpJD = c.elements?.tp;
          if (Number.isFinite(tpJD) && tpJD >= nowJD && tpJD <= tp90JD) {
            const peakMag = (Number.isFinite(c.m1) && Number.isFinite(c.perihelionAU))
              ? c.m1 + (c.k1 || 10) * Math.log10(c.perihelionAU) + 5 * Math.log10(Math.max(0.1, c.perihelionAU - 1))
              : null;
            if (peakMag !== null && peakMag < 10) brightApparitions++;
            upcomingPerihelionList.push({
              designation: c.designation,
              name: c.name,
              category: c.category,
              activityStatus: c.activityStatus,
              q: c.perihelionAU,
              e: c.eccentricity,
              i: c.inclination,
              m1: c.m1,
              peakMag: peakMag !== null ? Math.round(peakMag * 10) / 10 : null,
              tpJD: tpJD,
              tpDate: julianToISO(tpJD)?.substring(0, 10) || null
            });
          }
        }

        upcomingPerihelionList.sort((a, b) => (a.tpJD || Infinity) - (b.tpJD || Infinity));

        data.upcomingPerihelionList = upcomingPerihelionList;
        data.upcomingPerihelia = upcomingPerihelionList.length;
        data.earthCrossingCount = earthCrossingCount;
        data.activeCount = activeCount;
        data.brightApparitions = brightApparitions;

        const recentDiscoveries = catalogResult.comets
          .filter(c => {
            if (!c.firstObs) return false;
            try {
              return new Date(c.firstObs).getTime() > dateMinus30.getTime();
            } catch (error) {
              return false;
            }
          })
          .map(c => ({
            designation: c.designation,
            name: c.name,
            discoveryDate: c.firstObs,
            class: c.category,
            diameter: c.diameter,
            m1: c.m1,
            q: c.perihelionAU,
            e: c.eccentricity,
            i: c.inclination
          }));
        data.recentDiscoveries = recentDiscoveries;
        data.recentDiscoveriesCount = recentDiscoveries.length;
      }
    } catch (error) {
      data.errors.push(`Catalog scan failed: ${error.message}.`);
    }

    let overallSeverity = 0;
    if ((data.upcomingPerihelia || 0) > 5) overallSeverity = Math.max(overallSeverity, 2);
    if ((data.upcomingPerihelia || 0) > 15) overallSeverity = Math.max(overallSeverity, 3);
    if ((data.brightApparitions || 0) > 0) overallSeverity = Math.max(overallSeverity, 3);
    if ((data.brightApparitions || 0) > 2) overallSeverity = Math.max(overallSeverity, 4);
    if (data.closestUpcoming && data.closestUpcoming.distAU < 0.05) overallSeverity = Math.max(overallSeverity, 4);
    if (data.closestUpcoming && data.closestUpcoming.distAU < 0.01) overallSeverity = Math.max(overallSeverity, 5);

    let overallStatus = "Quiet";
    let overallColor = "#4ade80";
    if (overallSeverity >= 5) { overallStatus = "Severe"; overallColor = "#e04020"; }
    else if (overallSeverity >= 3) { overallStatus = "Active"; overallColor = "#c08040"; }
    else if (overallSeverity >= 1) { overallStatus = "Elevated"; overallColor = "#7a8a5a"; }
    data.overall = { status: overallStatus, color: overallColor, severity: overallSeverity };

    return data;
  })();

  try {
    const result = await inflightCometWatch;
    cometWatchCache = result;
    cometWatchTimestamp = Date.now();
    return result;
  } finally {
    inflightCometWatch = null;
  }
};

const callGeminiAPIWithTimeout = async (prompt, useGrounding = true, maxTokens = 4096, temperature = 0.3, timeoutMs = GEMINI_STAGE_TIMEOUT_MS) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("The GEMINI_API_KEY environment variable is not configured.");
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

const buildCometStage1Prompt = (comet) => {
  const orbital = `Perihelion (q): ${comet.perihelionAU} AU, Eccentricity: ${comet.eccentricity}, Inclination: ${comet.inclination}°, Period: ${comet.orbitalPeriodYears !== null ? comet.orbitalPeriodYears + " years" : "unbound"}, Aphelion: ${comet.aphelionAU !== null ? comet.aphelionAU + " AU" : "unbound"}, Class: ${comet.category}, MOID: ${comet.moidAU} AU, M1: ${comet.m1}, K1: ${comet.k1}, Diameter: ${comet.diameter || "?"} km, Activity: ${comet.activityStatus}`;
  return `You are a comet catalog analyst. Research the comet "${comet.name}" (designation ${comet.designation || "unknown"}) using Google Search.

Orbital state: ${orbital}

Return ONLY a JSON object (no markdown, no fences) with verifiable facts:

{
  "operator": "Discoverer name (person or survey)",
  "internationalDesignator": "Provisional designation (e.g. C/2020 F3)",
  "launchDate": "Discovery date YYYY-MM-DD or YYYY",
  "launchVehicle": "Discovery survey or program",
  "launchSite": "Discovery observatory or site",
  "missionStatus": "Active | Dormant | Disintegrated | Lost | Recovered",
  "factSheet": {
    "manufacturer": "Nucleus diameter (km if known)",
    "bus": "Composition class (e.g. dust-rich, gas-rich, depleted, carbon-chain depleted)",
    "mass": "Estimated nucleus mass kg if known (string with unit)",
    "power": "Albedo if known (decimal 0-1)",
    "designLife": "Rotation period in hours if known",
    "propulsion": "Dust/gas production rates Q(H2O) at perihelion if known",
    "stabilization": "Single | Binary | Fragmented | Disintegrated"
  },
  "instruments": ["spacecraft visit 1", "spacecraft visit 2"]
}

Use null for unknown fields. Do not fabricate.`;
};

const buildCometStage2Prompt = (comet, stage1) => {
  const ops = stage1?.parsed?.operator || "Unknown";
  return `You are a comet mission analyst. Research and write narrative analysis for "${comet.name}" (designation ${comet.designation || "?"}, discovered by ${ops}).

Return ONLY a JSON object (no markdown):

{
  "executiveSummary": "Two sentences capturing this comet's discovery context and current scientific or apparition significance.",
  "missionBrief": "Two-paragraph detailed brief: paragraph 1 covers discovery circumstances and immediate scientific interest. Paragraph 2 covers subsequent apparitions, characterization, and broader significance to comet science.",
  "scientificContribution": "Specific scientific contributions of this comet: composition class, nucleus characterization, presence of fragments, lightcurve studies, spacecraft visits, occultation results, isotopic measurements.",
  "constellationContext": "How this comet fits within its dynamical family: parent body if known, family membership (Kreutz, Marsden, Meyer, etc.), resonance state, sibling comets, source reservoir (Oort Cloud, Kuiper Belt, scattered disk).",
  "geopoliticalSignificance": "Cultural, historical, or societal impact. Address public observation campaigns, naked-eye apparitions, panic responses or scientific milestones.",
  "commercialContext": "Astronomy outreach, public engagement, or amateur observation context. Naked-eye visibility windows. Use null if not applicable."
}

Be specific and factual. Use null for non-applicable fields.`;
};

const buildCometStage3Prompt = (comet, stage1, stage2) => {
  return `You are a comet risk and operations analyst. For "${comet.name}" (designation ${comet.designation || "?"}), provide events timeline and risk assessment.

Return ONLY a JSON object (no markdown):

{
  "notableEvents": [
    {"date": "YYYY-MM-DD or YYYY", "event": "Concrete description of perihelion passage, close approach, fragmentation event, occultation, spacecraft encounter, or characterization milestone"}
  ],
  "riskAssessment": {
    "tleAgeRisk": "How orbit determination quality (observation arc ${comet.observationArcDays || "?"} days, ${comet.apparitionCount || "?"} apparitions) affects ephemeris accuracy and prediction uncertainty given non-gravitational forces.",
    "decayRisk": "Fragmentation and disintegration outlook including thermal stress at perihelion. Comet activity status: ${comet.activityStatus}.",
    "conjunctionRisk": "Known close-approach concerns or general MOID-based proximity. Earth MOID ${comet.moidAU || "?"} AU.",
    "operationalRisk": "Other operational concerns: dust hazards, outgassing-driven non-gravitational acceleration, spacecraft safety near nucleus.",
    "cyberRisk": "Mission window and accessibility for spacecraft rendezvous given perihelion-passage timing. Δv estimates if known.",
    "regulatoryRisk": "Planetary protection, sample-return contamination considerations for cometary ices and organics."
  }
}

Provide up to 6 most significant events. Each risk field should be 1-3 sentences with specific reasoning.`;
};

const fetchCometIntelligence = async (comet) => {
  const cacheKey = String(comet.designation || comet.spkid || comet.name);
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
    const s1 = await runStage(1, buildCometStage1Prompt(comet), 2048, 0.2);
    const s2 = await runStage(2, buildCometStage2Prompt(comet, stages[0]), 3000, 0.4);
    const s3 = await runStage(3, buildCometStage3Prompt(comet, stages[0], stages[1]), 3000, 0.3);

    const merged = {
      ...(s1.parsed || {}),
      ...(s2.parsed || {}),
      ...(s3.parsed || {})
    };

    const successfulStages = perStage.filter(p => !p.timedOut && !p.error).length;
    if (successfulStages === 0) {
      return {
        designation: comet.designation,
        name: comet.name,
        error: "All Gemini stages failed.",
        partialStages,
        generatedAt: new Date().toISOString(),
        sources: [],
        intelligence: null,
        tokenUsage: { total: totalTokens, prompt: totalPrompt, completion: totalCompletion, perStage }
      };
    }

    const result = {
      designation: comet.designation,
      name: comet.name,
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
      designation: comet.designation,
      name: comet.name,
      error: error.message,
      partialStages,
      generatedAt: new Date().toISOString(),
      sources: [],
      intelligence: null,
      tokenUsage: { total: totalTokens, prompt: totalPrompt, completion: totalCompletion, perStage }
    };
  }
};

const buildCometWatchStage1Prompt = (sw) => {
  const summary = `Current Comet Watch State:
- Upcoming perihelia (next 90 days): ${sw.upcomingPerihelia || 0}
- Close approaches in next 30 days: ${sw.next30Days || 0}
- Close approaches in next 365 days: ${sw.next365Days || 0}
- Active comets: ${sw.activeCount || 0}
- Earth-crossing comets: ${sw.earthCrossingCount || 0}
- Bright apparitions forecast (m<10): ${sw.brightApparitions || 0}
- Recent discoveries (past 30d): ${sw.recentDiscoveriesCount || 0}
- Closest upcoming: ${sw.closestUpcoming?.name || "none"} at ${sw.closestUpcoming?.distLD?.toFixed(2) || "?"} LD on ${sw.closestUpcoming?.cdDate || "?"}`;
  return `You are a NASA/ESA comet science analyst. Generate a current comet posture analysis based on:

${summary}

Return ONLY a JSON object (no markdown, no fences):

{
  "executiveSummary": "Three-sentence brief covering: current state of cometary activity, upcoming notable apparitions, and immediate observation implications.",
  "currentConditions": "Detailed paragraph analyzing the current comet environment, dynamical drivers, what observers should watch for in the next 30 days, and where survey gaps may exist."
}

Be specific and use technical language appropriate for comet observers and operators.`;
};

const buildCometWatchStage2Prompt = (sw) => {
  return `You are a comet apparition forecaster. Based on current comet posture, search recent IAU/MPC/CBAT reports and produce 30-day and 365-day forecasts.

Current state: ${sw.upcomingPerihelia || 0} upcoming perihelia in 90d, ${sw.next30Days || 0} approaches in 30d, ${sw.activeCount || 0} active comets, ${sw.brightApparitions || 0} bright forecasts.

Return ONLY a JSON object (no markdown):

{
  "forecast24h": "Detailed 30-day outlook covering: notable upcoming perihelion passages, expected discovery rate from surveys (Pan-STARRS, ATLAS, ZTF), anticipated observation campaigns, and amateur observer decision points.",
  "forecast72h": "365-day outlook covering: significant calendar-year events including expected returns of periodic comets, opposition windows for outer comets, planned spacecraft encounters, and apparition evolution.",
  "historicalContext": "How current conditions compare to recent years, comparison to historical great comets, and similar past apparitions that observers may use as analogs."
}`;
};

const buildCometWatchStage3Prompt = (sw) => {
  return `You are a comet operations analyst. Based on the current comet watch state, produce domain-specific impact assessment and recommended actions.

State: ${sw.activeCount || 0} active comets, ${sw.earthCrossingCount || 0} Earth-crossers, ${sw.upcomingPerihelia || 0} upcoming perihelia, ${sw.recentDiscoveriesCount || 0} recent discoveries.

Return ONLY a JSON object (no markdown):

{
  "satelliteImpacts": [
    {"regime": "Comet Discovery Survey", "impact": "Specific narrative on survey health, gap regions, throughput", "severity": "Low|Moderate|High"},
    {"regime": "Mission Targets", "impact": "Available rendezvous and sample-return opportunities, accessibility windows for in-situ comet science", "severity": "Low|Moderate|High"},
    {"regime": "Astronomy Outreach", "impact": "Naked-eye and binocular comet visibility for public engagement", "severity": "Low|Moderate|High"},
    {"regime": "Earth Observation Risks", "impact": "Cometary dust stream risk to satellites, meteor stream activity", "severity": "Low|Moderate|High"}
  ],
  "recommendedActions": [
    "Specific operational action 1 with rationale",
    "Specific operational action 2 with rationale",
    "Specific operational action 3 with rationale",
    "Specific operational action 4 with rationale"
  ],
  "scientificAnalysis": "Paragraph-level scientific interpretation: which dynamical and observational processes dominate the current state, key open questions about cometary composition and origin, and what observations would resolve them."
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

const fetchObservationData = async (comet) => {
  const cacheKey = String(comet.designation || comet.spkid || comet.name);
  const cached = observationCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < OBSERVATION_TTL) {
    return cached.data;
  }

  const result = {
    designation: comet.designation,
    name: comet.name,
    generatedAt: new Date().toISOString(),
    closeApproaches: [],
    physicalProperties: null,
    wikipedia: null,
    references: []
  };

  const cleanName = (comet.name || "").replace(/^[CDPXIA]\/[\d\s]+/i, "").split(/[\(\[]/)[0].trim().replace(/\s+/g, "_");
  const wikiTitle = cleanName ? `Comet_${cleanName}` : null;
  const altWikiTitle = cleanName;

  const externalTasks = [];
  if (wikiTitle) externalTasks.push(fetchWikipediaSummary(wikiTitle));
  else externalTasks.push(Promise.resolve(null));
  externalTasks.push(fetchSBDBLookup(comet.designation || comet.spkid || comet.name));

  const settled = await Promise.allSettled(externalTasks);

  let wikiPrimary = settled[0].status === "fulfilled" ? settled[0].value : null;
  if (!wikiPrimary && altWikiTitle && altWikiTitle !== wikiTitle) {
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
        if (p.name === "M1" && Number.isFinite(v)) props.m1 = v;
        if (p.name === "K1" && Number.isFinite(v)) props.k1 = v;
        if (p.name === "M2" && Number.isFinite(v)) props.m2 = v;
        if (p.name === "K2" && Number.isFinite(v)) props.k2 = v;
        if (p.name === "GM" && Number.isFinite(v)) props.gm = v;
      }
      if (Object.keys(props).length > 0) result.physicalProperties = props;
    }
    if (sbdbData.ca_data && Array.isArray(sbdbData.ca_data)) {
      result.closeApproaches = sbdbData.ca_data.map(ca => ({
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
    url: `https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=${encodeURIComponent(comet.designation || comet.name)}`
  });
  result.references.push({
    label: "Minor Planet Center",
    url: `https://www.minorplanetcenter.net/db_search/show_object?utf8=&object_id=${encodeURIComponent(comet.designation || comet.name)}`
  });
  result.references.push({
    label: "JPL Horizons",
    url: `https://ssd.jpl.nasa.gov/horizons/app.html#/?CENTER='500@10'&COMMAND='${encodeURIComponent(comet.designation || comet.name)}'`
  });
  result.references.push({
    label: "CNEOS Close Approach Tables",
    url: `https://cneos.jpl.nasa.gov/ca/`
  });
  result.references.push({
    label: "Cometary Activity Database",
    url: `https://cobs.si/`
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
        cached: !!cometCache,
        cacheAgeSeconds: cacheTimestamp ? Math.round((now - cacheTimestamp) / 1000) : null,
        cachedCometCount: cometCache ? cometCache.comets.length : 0,
        inflightFetch: !!inflightFetch,
        partialAccumulationLength: partialAccumulation.length,
        activeSubscribers: fetchSubscribers.size,
        provider: "JPL SBDB"
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
      cometWatch: {
        cached: !!cometWatchCache,
        cacheAgeSeconds: cometWatchTimestamp ? Math.round((now - cometWatchTimestamp) / 1000) : null,
        inflight: !!inflightCometWatch,
        sources: cometWatchCache?.sources || [],
        errors: cometWatchCache?.errors || []
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
        cometWatchAI: { cached: !!cometWatchAICache.data, ageSeconds: cometWatchAICache.timestamp ? Math.round((now - cometWatchAICache.timestamp) / 1000) : null },
        apparition: { cached: !!apparitionCache, ageSeconds: apparitionCacheTimestamp ? Math.round((now - apparitionCacheTimestamp) / 1000) : null },
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
    lines.push(`# HELP comet_catalog_size Cached comet count`);
    lines.push(`# TYPE comet_catalog_size gauge`);
    lines.push(`comet_catalog_size ${cometCache ? cometCache.comets.length : 0}`);
    lines.push(`# HELP comet_catalog_cache_age_seconds Age of cached catalog in seconds`);
    lines.push(`# TYPE comet_catalog_cache_age_seconds gauge`);
    lines.push(`comet_catalog_cache_age_seconds ${cacheTimestamp ? Math.round((now - cacheTimestamp) / 1000) : -1}`);
    lines.push(`# HELP comet_inflight_fetch Currently inflight catalog fetch`);
    lines.push(`# TYPE comet_inflight_fetch gauge`);
    lines.push(`comet_inflight_fetch ${inflightFetch ? 1 : 0}`);
    lines.push(`# HELP comet_partial_accumulation Items accumulated during inflight fetch`);
    lines.push(`# TYPE comet_partial_accumulation gauge`);
    lines.push(`comet_partial_accumulation ${partialAccumulation.length}`);
    lines.push(`# HELP comet_active_subscribers SSE subscribers attached to the shared fetch`);
    lines.push(`# TYPE comet_active_subscribers gauge`);
    lines.push(`comet_active_subscribers ${fetchSubscribers.size}`);
    lines.push(`# HELP comet_gemini_cache_entries`);
    lines.push(`# TYPE comet_gemini_cache_entries gauge`);
    lines.push(`comet_gemini_cache_entries ${geminiCache.size}`);
    lines.push(`# HELP comet_observation_cache_entries`);
    lines.push(`# TYPE comet_observation_cache_entries gauge`);
    lines.push(`comet_observation_cache_entries ${observationCache.size}`);
    lines.push(`# HELP comet_heap_used_bytes Live V8 heap used in bytes`);
    lines.push(`# TYPE comet_heap_used_bytes gauge`);
    lines.push(`comet_heap_used_bytes ${mem.heapUsed}`);
    lines.push(`# HELP comet_heap_total_bytes Live V8 heap total in bytes`);
    lines.push(`# TYPE comet_heap_total_bytes gauge`);
    lines.push(`comet_heap_total_bytes ${mem.heapTotal}`);
    lines.push(`# HELP comet_heap_limit_bytes V8 heap_size_limit in bytes`);
    lines.push(`# TYPE comet_heap_limit_bytes gauge`);
    lines.push(`comet_heap_limit_bytes ${heap.heap_size_limit}`);
    lines.push(`# HELP comet_heap_used_fraction heapUsed / heap_size_limit`);
    lines.push(`# TYPE comet_heap_used_fraction gauge`);
    lines.push(`comet_heap_used_fraction ${heap.heap_size_limit > 0 ? mem.heapUsed / heap.heap_size_limit : 0}`);
    lines.push(`# HELP comet_rss_bytes Process RSS in bytes`);
    lines.push(`# TYPE comet_rss_bytes gauge`);
    lines.push(`comet_rss_bytes ${mem.rss}`);
    lines.push(`# HELP comet_external_bytes Process external memory in bytes`);
    lines.push(`# TYPE comet_external_bytes gauge`);
    lines.push(`comet_external_bytes ${mem.external || 0}`);
    if (lastMemorySnapshot) {
      lines.push(`# HELP comet_last_fetch_memory_halted_sources Number of sources halted by memory guard in the last fetch`);
      lines.push(`# TYPE comet_last_fetch_memory_halted_sources gauge`);
      lines.push(`comet_last_fetch_memory_halted_sources ${lastMemorySnapshot.haltedQueries.length}`);
      lines.push(`# HELP comet_last_fetch_halted_rows_total Total rows skipped due to memory halt in the last fetch`);
      lines.push(`# TYPE comet_last_fetch_halted_rows_total gauge`);
      lines.push(`comet_last_fetch_halted_rows_total ${lastMemorySnapshot.haltedRowsTotal}`);
      lines.push(`# HELP comet_last_fetch_peak_heap_bytes Peak heap used during last fetch`);
      lines.push(`# TYPE comet_last_fetch_peak_heap_bytes gauge`);
      lines.push(`comet_last_fetch_peak_heap_bytes ${lastMemorySnapshot.peakHeapUsedBytes}`);
      lines.push(`# HELP comet_last_fetch_projected_batch_bytes Projected next batch heap delta at end of last fetch`);
      lines.push(`# TYPE comet_last_fetch_projected_batch_bytes gauge`);
      lines.push(`comet_last_fetch_projected_batch_bytes ${lastMemorySnapshot.projectedNextBatchBytes}`);
      lines.push(`# HELP comet_last_fetch_gc_triggered Total GC triggers in the last fetch`);
      lines.push(`# TYPE comet_last_fetch_gc_triggered counter`);
      lines.push(`comet_last_fetch_gc_triggered ${lastMemorySnapshot.gcTriggeredCount}`);
    }
    Object.entries(apiBreakers).forEach(([name, breaker]) => {
      const state = breaker.state === "closed" ? 0 : breaker.state === "half-open" ? 1 : 2;
      lines.push(`# HELP comet_breaker_${name}_state 0=closed,1=half-open,2=open`);
      lines.push(`# TYPE comet_breaker_${name}_state gauge`);
      lines.push(`comet_breaker_${name}_state ${state}`);
      lines.push(`# HELP comet_breaker_${name}_failures Consecutive failures`);
      lines.push(`# TYPE comet_breaker_${name}_failures gauge`);
      lines.push(`comet_breaker_${name}_failures ${breaker.consecutiveFailures}`);
      lines.push(`# HELP comet_breaker_${name}_total_requests Total fetch attempts`);
      lines.push(`# TYPE comet_breaker_${name}_total_requests counter`);
      lines.push(`comet_breaker_${name}_total_requests ${breaker.totalRequests}`);
    });
    res.set("Content-Type", "text/plain; version=0.0.4");
    res.send(lines.join("\n") + "\n");
  } catch (error) {
    res.status(500).send(`Error generating metrics: ${error.message}.`);
  }
});

router.get("/comet-stream", async (req, res) => {
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
    if (closed || res.writableEnded) return false;
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

  const streamInChunks = (sats, sourceLabel) => {
    const CHUNK_SIZE = 250;
    for (let i = 0; i < sats.length; i += CHUNK_SIZE) {
      if (closed) return;
      sendEvent("batch", {
        comets: sats.slice(i, i + CHUNK_SIZE),
        source: sourceLabel
      });
    }
  };

  if (cometCache && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_DURATION) {
    streamInChunks(cometCache.comets, "Cache");
    sendEvent("progress", {
      completed: cometCache.metadata.totalSources,
      total: cometCache.metadata.totalSources,
      successful: cometCache.metadata.successfulSources,
      memory: lastMemorySnapshot
    });
    if (!closed) {
      sendEvent("done", {
        metadata: {
          ...cometCache.metadata,
          fromCache: true,
          cacheAge: Math.round((Date.now() - cacheTimestamp) / 1000),
          loadTime: Date.now() - startTime
        },
        errors: cometCache.errors
      });
    }
    res.end();
    return;
  }

  if (partialAccumulation.length > 0) {
    streamInChunks([...partialAccumulation], "Inflight Partial");
  }

  const subscriber = {
    onBatch: (newSats, source) => sendEvent("batch", { comets: newSats, source }),
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

router.get("/all-comet-data", async (req, res) => {
  try {
    const startTime = Date.now();
    const result = await fetchAllComets();
    const loadTime = Date.now() - startTime;

    if (!result.success) {
      return res.json({
        success: false,
        comets: [],
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
          memory: lastMemorySnapshot
        }
      });
    }

    const categoryCounts = result.comets.reduce((acc, c) => {
      acc[c.category] = (acc[c.category] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      comets: result.comets,
      errors: result.errors || [],
      metadata: {
        totalSources: result.metadata.totalSources,
        successfulSources: result.metadata.successfulSources,
        memoryHaltedSources: result.metadata.memoryHaltedSources,
        loadTime: loadTime,
        dataQuality: result.errors.length === 0 ? "High" : result.errors.length < 3 ? "Medium" : "Low",
        queryTime: new Date().toISOString(),
        categoryCounts: categoryCounts,
        realSources: ["JPL SBDB", "MPC", "CNEOS"],
        memoryOptimized: true,
        memoryAware: true,
        memory: result.metadata.memory,
        totalComets: result.metadata.totalComets,
        cacheAge: cacheTimestamp ? Math.round((Date.now() - cacheTimestamp) / 1000) : null
      }
    });
  } catch (error) {
    res.json({
      success: false,
      comets: [],
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

router.get("/jfc-comets", async (req, res) => {
  try {
    const result = await fetchAllComets();
    const jfc = result.comets.filter(c => c.category === "Jupiter-Family");
    res.json({
      success: result.success,
      source: "JPL SBDB Jupiter-Family",
      comets: jfc,
      errors: result.success ? [] : (result.errors || [result.error]),
      metadata: {
        queryTime: new Date().toISOString(),
        dataPoints: jfc.length,
        method: "JPL SBDB - Jupiter-Family Comets (2 < T_J < 3, P < 20 yr)",
        memoryOptimized: true,
        memoryAware: true,
        memory: result.metadata?.memory || lastMemorySnapshot
      }
    });
  } catch (error) {
    res.json({
      success: false,
      source: "JPL SBDB Jupiter-Family",
      error: `Failed to retrieve JFC data: ${error.message}.`,
      comets: []
    });
  }
});

router.get("/long-period-comets", async (req, res) => {
  try {
    const result = await fetchAllComets();
    const lp = result.comets.filter(c => c.category === "Long-Period" || c.category === "Halley-Type");
    res.json({
      success: result.success,
      source: "JPL SBDB Long-Period",
      comets: lp,
      errors: result.success ? [] : (result.errors || [result.error]),
      metadata: {
        queryTime: new Date().toISOString(),
        dataPoints: lp.length,
        method: "JPL SBDB - Long-Period and Halley-Type Comets (P > 20 yr)",
        memoryOptimized: true,
        memoryAware: true,
        memory: result.metadata?.memory || lastMemorySnapshot
      }
    });
  } catch (error) {
    res.json({
      success: false,
      source: "JPL SBDB Long-Period",
      error: `Failed to retrieve long-period data: ${error.message}.`,
      comets: []
    });
  }
});

router.get("/sungrazer-comets", async (req, res) => {
  try {
    const result = await fetchAllComets();
    const sg = result.comets.filter(c => c.perihelionAU !== null && c.perihelionAU < 0.01);
    res.json({
      success: result.success,
      source: "JPL SBDB Sungrazers",
      comets: sg,
      errors: result.success ? [] : (result.errors || [result.error]),
      metadata: {
        queryTime: new Date().toISOString(),
        dataPoints: sg.length,
        method: "JPL SBDB - Sungrazing Comets (q < 0.01 AU)",
        memoryOptimized: true,
        memoryAware: true,
        memory: result.metadata?.memory || lastMemorySnapshot
      }
    });
  } catch (error) {
    res.json({
      success: false,
      source: "JPL SBDB Sungrazers",
      error: `Failed to retrieve sungrazer data: ${error.message}.`,
      comets: []
    });
  }
});

router.get("/comet-watch", async (req, res) => {
  try {
    const data = await fetchCometWatch();
    res.json({ success: true, data, cached: cometWatchTimestamp ? Date.now() - cometWatchTimestamp < NEO_WATCH_TTL : false });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

router.post("/comet-watch-ai", async (req, res) => {
  try {
    const swInput = req.body && req.body.neoWatch;
    if (!swInput) {
      return res.status(400).json({ success: false, error: "Missing neoWatch payload." });
    }
    if (cometWatchAICache.data && Date.now() - cometWatchAICache.timestamp < PANEL_AI_TTL) {
      return res.json({ success: true, data: { ...cometWatchAICache.data, fromCache: true } });
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
      runIndependent(1, buildCometWatchStage1Prompt(swInput), 2048, 0.3),
      runIndependent(2, buildCometWatchStage2Prompt(swInput), 2500, 0.4),
      runIndependent(3, buildCometWatchStage3Prompt(swInput), 3000, 0.3)
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
    cometWatchAICache.data = result;
    cometWatchAICache.timestamp = Date.now();
    res.json({ success: true, data: result });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

router.post("/comet-intelligence", async (req, res) => {
  try {
    const ast = req.body && req.body.comet;
    if (!ast || !(ast.designation || ast.spkid || ast.name)) {
      return res.status(400).json({ success: false, error: "Missing comet payload." });
    }
    const result = await fetchCometIntelligence(ast);
    res.json({ success: !result.error, data: result, error: result.error });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

router.post("/comet-observation", async (req, res) => {
  try {
    const ast = req.body && req.body.comet;
    if (!ast || !(ast.designation || ast.spkid || ast.name)) {
      return res.status(400).json({ success: false, error: "Missing comet payload." });
    }
    const result = await fetchObservationData(ast);
    res.json({ success: true, data: result });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

router.get("/apparition-watch", async (req, res) => {
  try {
    const candidates = await fetchApparitionWatch();
    res.json({
      success: true,
      candidates,
      total: candidates.length,
      methodology: {
        highConfidenceCriterion: `Periodic comet with ${APPARITION_HIGH_CONFIDENCE_APPARITIONS}+ observed apparitions and well-determined non-gravitational parameters`,
        magnitudeFormula: "m = M1 + 5·log10(Δ) + K1·log10(rH)",
        peakMagnitudeApprox: "peakMag ≈ M1 + K1·log10(q) + 5·log10(max(0.1, q-1))",
        riskTiers: {
          imminent: "Perihelion within 30 days",
          high: "30-180 days",
          moderate: "180-365 days",
          low: "More than 1 year"
        },
        formulation: "Apparition forecasting uses two-body Kepler/Barker propagation. Non-gravitational acceleration parameters A1 (radial), A2 (transverse), A3 (normal) from outgassing dominate long-term ephemeris error.",
        limitations: "Predicted positions can deviate significantly from observed positions during active phases near perihelion. Single-apparition comets are heuristic-tier candidates."
      }
    });
  } catch (error) {
    res.json({ success: false, error: error.message, candidates: [] });
  }
});

router.get("/comet-population-census", async (req, res) => {
  try {
    if (populationCache && populationCacheTimestamp && Date.now() - populationCacheTimestamp < POPULATION_TTL) {
      return res.json({ success: true, populations: populationCache, fromCache: true, generatedAt: new Date(populationCacheTimestamp).toISOString() });
    }
    const result = await fetchAllComets();
    if (!result.success) {
      return res.json({ success: false, error: "Catalog is unavailable." });
    }

    const expected = {
      "Jupiter-Family": { estimatedTotal: 700, description: "Short-period comets with Tisserand parameter 2 < T_J < 3 and orbital periods under 20 years. Sourced primarily from the scattered disk and Kuiper Belt." },
      "Halley-Type": { estimatedTotal: 100, description: "Periodic comets with T_J < 2 and periods between 20 and 200 years. Often retrograde or highly inclined, sourced from the inner Oort Cloud." },
      "Encke-Type": { estimatedTotal: 30, description: "Short-period comets dynamically decoupled from Jupiter (a < 4 AU, aphelion inside Jupiter's orbit). Named after 2P/Encke." },
      "Chiron-Type": { estimatedTotal: 50, description: "Comet-like Centaurs with active outgassing in the giant planet region. Bridge between Centaurs and Jupiter-family comets." },
      "Long-Period": { estimatedTotal: 4000, description: "Periods exceeding 200 years; sourced from the Oort Cloud. Many appear once historically before becoming near-parabolic." },
      "Near-Parabolic": { estimatedTotal: 500, description: "Eccentricity very close to 1; dynamically new from the Oort Cloud or returning over multi-millennium timescales." },
      "Hyperbolic": { estimatedTotal: 1000, description: "e > 1, unbound trajectories. Includes dynamically excited Oort Cloud comets ejected by planetary perturbations." },
      "Interstellar": { estimatedTotal: 5, description: "Confirmed interstellar visitors (1I/'Oumuamua, 2I/Borisov). Estimates suggest more pass through the inner solar system but most are too faint." },
      "Sungrazer": { estimatedTotal: 4500, description: "Perihelion below 0.01 AU. Includes the Kreutz family and SOHO-discovered fragments. Most disintegrate at perihelion." },
      "Centaur Comet": { estimatedTotal: 200, description: "Active or transitional comets in the giant-planet region (a between 5.5 and 30 AU). Reservoir feeding the Jupiter-family population." },
      "Main-Belt Comet": { estimatedTotal: 20, description: "Asteroidal orbits with cometary activity. Likely source of Earth's water; rare and scientifically valuable." }
    };

    const populations = {};
    Object.keys(expected).forEach(group => {
      const objs = result.comets.filter(c => c.category === group);
      const tracked = objs.length;
      const activeCount = objs.filter(c => c.activityStatus === "Active").length;
      const earthCrossingCount = objs.filter(c => c.perihelionAU !== null && c.perihelionAU < 1.017).length;
      const avgQ = objs.length > 0 ? objs.reduce((s, c) => s + (c.perihelionAU || 0), 0) / objs.length : 0;
      const avgE = objs.length > 0 ? objs.reduce((s, c) => s + (c.eccentricity || 0), 0) / objs.length : 0;
      const avgI = objs.length > 0 ? objs.reduce((s, c) => s + (c.inclination || 0), 0) / objs.length : 0;

      populations[group] = {
        description: expected[group].description,
        estimatedTotal: expected[group].estimatedTotal,
        tracked: tracked,
        coveragePct: expected[group].estimatedTotal > 0 ? Math.min(100, Math.round((tracked / expected[group].estimatedTotal) * 100)) : 0,
        activeCount: activeCount,
        earthCrossingCount: earthCrossingCount,
        averageQ: Math.round(avgQ * 1000) / 1000,
        averageE: Math.round(avgE * 1000000) / 1000000,
        averageI: Math.round(avgI * 100) / 100,
        status: tracked >= expected[group].estimatedTotal * 0.5 ? "Nominal" : tracked >= expected[group].estimatedTotal * 0.1 ? "Degraded" : tracked > 0 ? "Partial" : "Unavailable",
        ids: objs.map(c => ({
          designation: c.designation,
          spkid: c.spkid,
          name: c.name,
          q: c.perihelionAU,
          e: c.eccentricity,
          i: c.inclination,
          m1: c.m1,
          k1: c.k1,
          activityStatus: c.activityStatus,
          category: c.category,
          color: c.color,
          elements: c.elements
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
    const distMax = req.query.distMax || "0.5";
    const data = await fetchCloseApproachData(dateMin, dateMax, distMax);
    res.json({ success: true, approaches: data, count: data.length });
  } catch (error) {
    res.json({ success: false, error: error.message, approaches: [] });
  }
});

const warmCache = async () => {
  try {
    if (cometCache && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_DURATION) {
      return;
    }
    await startSharedFetch();
  } catch (error) {}
};

const warmCometWatch = async () => {
  try {
    await fetchCometWatch();
  } catch (error) {}
};

warmCometWatch();
setInterval(warmCometWatch, NEO_WATCH_TTL);

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
  if (cometWatchAICache.timestamp && now - cometWatchAICache.timestamp > PANEL_AI_TTL) {
    cometWatchAICache.data = null;
    cometWatchAICache.timestamp = 0;
  }
  if (apparitionCacheTimestamp && now - apparitionCacheTimestamp > SENTRY_TTL) {
    apparitionCache = null;
    apparitionCacheTimestamp = null;
  }
  if (populationCacheTimestamp && now - populationCacheTimestamp > POPULATION_TTL) {
    populationCache = null;
    populationCacheTimestamp = null;
  }
}, 60 * 60 * 1000);

module.exports = router;