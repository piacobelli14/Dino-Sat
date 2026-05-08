const express = require("express");
const axios = require("axios");
const https = require("https");
const dns = require("dns");
const router = express.Router();

const NASA_API_KEY = process.env.NASA_API_KEY || "DEMO_KEY";
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || "";

const AXIOS_CONFIG = {
  timeout: 12000,
  headers: {
    "User-Agent": "DinoSat-Research/4.0",
    "Accept": "application/json, text/plain, text/html, image/*, */*",
    "Accept-Encoding": "gzip, deflate"
  },
  validateStatus: (s) => s >= 200 && s < 400
};

const TRUSTED_HOSTS = new Set([
  "wvs.earthdata.nasa.gov",
  "gibs.earthdata.nasa.gov",
  "worldview.earthdata.nasa.gov",
  "sdo.gsfc.nasa.gov",
  "soho.nascom.nasa.gov",
  "cdn.star.nesdis.noaa.gov",
  "www.star.nesdis.noaa.gov",
  "eumetview.eumetsat.int",
  "himawari8.nict.go.jp",
  "api.nasa.gov",
  "epic.gsfc.nasa.gov",
  "images-assets.nasa.gov",
  "images-api.nasa.gov"
]);

const TRUSTED_YOUTUBE_CHANNELS = [
  {
    channelId: "UCLA_DiR1FfKNvjuUpBHmylQ",
    name: "NASA",
    description: "Official NASA channel. Filtered to surface only orbital camera streams (ISS Earth viewing, spacewalk POV, on-orbit hardware) — launch and mission control broadcasts are excluded because the camera is ground-based."
  },
  {
    channelId: "UCmheCYT4HlbFi943lpH009Q",
    name: "NASA Live",
    description: "NASA's dedicated live channel. Filtered to surface only orbital camera streams from on-orbit assets."
  }
];

const SATELLITE_VIEW_INCLUDE_PATTERNS = /\b(iss|international space station|earth view|earth viewing|hd earth|live from space|on[\s-]?orbit|live earth|view from space|spacewalk|eva|cupola|nadir|orbital view)\b/i;

const SATELLITE_VIEW_EXCLUDE_PATTERNS = /\b(launch|liftoff|countdown|coverage|press|briefing|conference|mission control|prelaunch|pre[\s-]?launch|post[\s-]?launch|interview|recap|review|highlight|replay|webinar|town hall|q\s*&\s*a|trailer|teaser|announcement|rocket|booster|stage[\s-]?separation|deployment|abort)\b/i;

const SATELLITE_CATALOG_SEEDS = [
  { noradId: 25544, name: "ISS (ZARYA)", aliases: ["iss", "international", "station", "zarya"] },
  { noradId: 40390, name: "DSCOVR", aliases: ["dscovr", "deep", "climate", "polychromatic"] },
  { noradId: 36395, name: "SDO", aliases: ["sdo", "dynamics"] },
  { noradId: 23726, name: "SOHO", aliases: ["soho", "heliospheric"] },
  { noradId: 60133, name: "GOES 19", aliases: ["goes", "goes19", "east"] },
  { noradId: 51850, name: "GOES 18", aliases: ["goes", "goes18", "west"] },
  { noradId: 43226, name: "GOES 17", aliases: ["goes", "goes17"] },
  { noradId: 41866, name: "GOES 16", aliases: ["goes", "goes16"] },
  { noradId: 43687, name: "HIMAWARI 9", aliases: ["himawari", "himawari9"] },
  { noradId: 40267, name: "HIMAWARI 8", aliases: ["himawari8"] },
  { noradId: 25994, name: "TERRA", aliases: ["terra"] },
  { noradId: 27424, name: "AQUA", aliases: ["aqua"] },
  { noradId: 37849, name: "SUOMI NPP", aliases: ["suomi", "snpp"] },
  { noradId: 43013, name: "NOAA 20 (JPSS-1)", aliases: ["noaa", "jpss"] },
  { noradId: 54234, name: "NOAA 21 (JPSS-2)", aliases: ["noaa21", "jpss2"] },
  { noradId: 39084, name: "LANDSAT 8", aliases: ["landsat"] },
  { noradId: 49260, name: "LANDSAT 9", aliases: ["landsat9"] },
  { noradId: 38337, name: "GCOM-W1 (SHIZUKU)", aliases: ["gcom", "shizuku"] },
  { noradId: 40376, name: "SMAP", aliases: ["smap", "moisture"] },
  { noradId: 29108, name: "CALIPSO", aliases: ["calipso", "caliop"] },
  { noradId: 40059, name: "OCO-2", aliases: ["oco", "carbon", "orbiting"] },
  { noradId: 44903, name: "OCO-3", aliases: ["oco3"] },
  { noradId: 28376, name: "AURA", aliases: ["aura"] },
  { noradId: 40732, name: "METEOSAT-11", aliases: ["meteosat"] }
];

const PROBE_TIMEOUT_MS = 5000;
const PROBE_CONCURRENCY = 20;
const REGISTRY_TTL_MS = 15 * 60 * 1000;
const FEED_AVAILABILITY_TTL_MS = 5 * 60 * 1000;
const ISS_POSITION_TTL_MS = 20 * 1000;
const NASA_EPIC_TTL_MS = 30 * 60 * 1000;
const NASA_APOD_TTL_MS = 60 * 60 * 1000;
const SDO_LATEST_TTL_MS = 5 * 60 * 1000;
const HIMAWARI_LATEST_TTL_MS = 10 * 60 * 1000;
const GIBS_TTL_MS = 60 * 60 * 1000;
const NOAA_STAR_DIRECTORY_TTL_MS = 60 * 60 * 1000;

const registryCache = { data: null, timestamp: 0, inflight: null };
const availabilityCache = new Map();
const issPositionCache = { data: null, timestamp: 0, inflight: null };
const epicCache = { data: null, timestamp: 0, inflight: null };
const apodCache = { data: null, timestamp: 0, inflight: null };
const sdoCache = { data: null, timestamp: 0, inflight: null };
const himawariCache = { data: null, timestamp: 0, inflight: null };
const gibsLayersCache = { data: null, timestamp: 0, inflight: null };
const noaaGoesEastCache = { data: null, timestamp: 0, inflight: null };
const noaaGoesWestCache = { data: null, timestamp: 0, inflight: null };
const sohoCache = { data: null, timestamp: 0, inflight: null };
const youtubeLiveCache = { data: null, timestamp: 0, inflight: null };

const delay = (ms) => new Promise(r => setTimeout(r, ms));

const runWithConcurrency = async (tasks, limit) => {
  const results = new Array(tasks.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    while (true) {
      const i = nextIndex++;
      if (i >= tasks.length) break;
      try {
        results[i] = await tasks[i]();
      } catch (error) {
        results[i] = { error: error.message };
      }
    }
  });
  await Promise.all(workers);
  return results;
};

const fetchWithRetry = async (url, options = {}, maxAttempts = 3) => {
  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await axios.get(url, { ...AXIOS_CONFIG, ...options });
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await delay(backoffMs);
      }
    }
  }
  throw lastError;
};

const fetchPlainHtml = (url, { timeout = 12000 } = {}) => {
  return new Promise((resolve, reject) => {
    let urlObj;
    try {
      urlObj = new URL(url);
    } catch (error) {
      return reject(new Error(`Invalid URL: ${url}.`));
    }
    const requestOptions = {
      host: urlObj.hostname,
      port: urlObj.port || 443,
      path: `${urlObj.pathname}${urlObj.search || ""}`,
      method: "GET",
      headers: {
        "User-Agent": AXIOS_CONFIG.headers["User-Agent"],
        "Accept": "text/html, text/plain, */*",
        "Accept-Encoding": "identity"
      },
      timeout
    };
    const req = https.request(requestOptions, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = res.headers.location.startsWith("http") ? res.headers.location : `https://${urlObj.hostname}${res.headers.location}`;
        res.resume();
        return resolve(fetchPlainHtml(redirectUrl, { timeout }));
      }
      if (res.statusCode < 200 || res.statusCode >= 400) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} from ${urlObj.hostname}.`));
      }
      const chunks = [];
      let totalLength = 0;
      const MAX_BYTES = 50 * 1024 * 1024;
      res.on("data", (chunk) => {
        totalLength += chunk.length;
        if (totalLength > MAX_BYTES) {
          req.destroy(new Error("Response too large."));
          return;
        }
        chunks.push(chunk);
      });
      res.on("end", () => {
        resolve({ data: Buffer.concat(chunks).toString("utf8"), status: res.statusCode, headers: res.headers });
      });
      res.on("error", reject);
    });
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy(new Error(`Request timeout after ${timeout}ms.`));
    });
    req.end();
  });
};

const fetchNoaaIpv4 = (url, { timeout = 12000, responseType = "text" } = {}) => {
  return new Promise((resolve, reject) => {
    let urlObj;
    try {
      urlObj = new URL(url);
    } catch (error) {
      return reject(new Error(`Invalid NOAA URL: ${url}.`));
    }
    dns.lookup(urlObj.hostname, { family: 4 }, (lookupError, address) => {
      if (lookupError) return reject(new Error(`IPv4 lookup failed for ${urlObj.hostname}: ${lookupError.message}.`));
      const requestOptions = {
        host: address,
        port: urlObj.port || 443,
        path: `${urlObj.pathname}${urlObj.search || ""}`,
        method: "GET",
        headers: {
          ...AXIOS_CONFIG.headers,
          "Host": urlObj.hostname,
          "Accept-Encoding": "identity"
        },
        servername: urlObj.hostname,
        timeout
      };
      const req = https.request(requestOptions, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          return reject(new Error(`Redirect not followed (NOAA fetch is direct-only): ${res.statusCode} -> ${res.headers.location}.`));
        }
        if (res.statusCode < 200 || res.statusCode >= 400) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode} from ${urlObj.hostname}.`));
        }
        if (responseType === "stream") {
          return resolve({ data: res, status: res.statusCode, headers: res.headers });
        }
        const chunks = [];
        let totalLength = 0;
        const MAX_BYTES = 50 * 1024 * 1024;
        res.on("data", (chunk) => {
          totalLength += chunk.length;
          if (totalLength > MAX_BYTES) {
            req.destroy(new Error("Response too large."));
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () => {
          const buffer = Buffer.concat(chunks);
          const data = responseType === "buffer" ? buffer : buffer.toString("utf8");
          resolve({ data, status: res.statusCode, headers: res.headers });
        });
        res.on("error", reject);
      });
      req.on("error", reject);
      req.on("timeout", () => {
        req.destroy(new Error(`Request timeout after ${timeout}ms.`));
      });
      req.end();
    });
  });
};

const isTrustedUrl = (url) => {
  if (!url || typeof url !== "string") return false;
  try {
    const host = new URL(url).hostname;
    return TRUSTED_HOSTS.has(host);
  } catch (error) {
    return false;
  }
};

const probeUrl = async (url) => {
  if (!url || typeof url !== "string") {
    return { ok: false, status: 0, error: "Invalid URL.", checkedAt: new Date().toISOString() };
  }
  const cacheKey = url;
  const cached = availabilityCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < FEED_AVAILABILITY_TTL_MS) {
    return cached.result;
  }
  const makeResult = (status, headers = {}) => ({
    ok: status >= 200 && status < 400,
    status,
    contentType: headers["content-type"] || null,
    contentLength: headers["content-length"] ? parseInt(headers["content-length"]) : null,
    lastModified: headers["last-modified"] || null,
    checkedAt: new Date().toISOString()
  });
  try {
    const r = await axios.head(url, {
      timeout: PROBE_TIMEOUT_MS,
      headers: AXIOS_CONFIG.headers,
      maxRedirects: 5,
      validateStatus: (s) => s < 500
    });
    if (r.status !== 405 && r.status !== 501) {
      const result = makeResult(r.status, r.headers);
      availabilityCache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    }
  } catch (error) {
    if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND" || error.code === "ECONNABORTED") {
      const result = { ok: false, status: 0, error: error.message, checkedAt: new Date().toISOString() };
      availabilityCache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    }
  }
  try {
    const cancelSource = axios.CancelToken.source();
    const r = await axios.get(url, {
      timeout: PROBE_TIMEOUT_MS,
      headers: AXIOS_CONFIG.headers,
      maxRedirects: 5,
      responseType: "stream",
      cancelToken: cancelSource.token,
      validateStatus: (s) => s < 500
    });
    cancelSource.cancel("Headers received.");
    try { r.data.destroy(); } catch (error) {}
    const result = makeResult(r.status, r.headers);
    availabilityCache.set(cacheKey, { result, timestamp: Date.now() });
    return result;
  } catch (error) {
    if (axios.isCancel(error)) {
      const result = {
        ok: false,
        status: 0,
        error: "Probe cancelled before response status was received.",
        checkedAt: new Date().toISOString()
      };
      availabilityCache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    }
    const result = { ok: false, status: error.response?.status || 0, error: error.message, checkedAt: new Date().toISOString() };
    availabilityCache.set(cacheKey, { result, timestamp: Date.now() });
    return result;
  }
};

const formatYMD = (date) => {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const subtractDays = (yyyymmdd, days) => {
  if (!yyyymmdd || typeof yyyymmdd !== "string") return yyyymmdd;
  const parts = yyyymmdd.split("-");
  if (parts.length !== 3) return yyyymmdd;
  const d = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
  if (isNaN(d.getTime())) return yyyymmdd;
  d.setUTCDate(d.getUTCDate() - days);
  return formatYMD(d);
};

const normalizeEpicDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== "string") return dateStr;
  if (dateStr.includes("T")) return dateStr;
  return `${dateStr.replace(" ", "T")}Z`;
};

const cleanXmlText = (text) => {
  if (!text) return "";
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .trim();
};

const buildStaticCatalog = () => {
  const byNorad = new Map();
  const byNameToken = new Map();
  for (const seed of SATELLITE_CATALOG_SEEDS) {
    const entry = { noradId: seed.noradId, name: seed.name };
    byNorad.set(seed.noradId, entry);
    for (const alias of seed.aliases) {
      const lower = String(alias).toLowerCase();
      if (lower.length < 3) continue;
      if (!byNameToken.has(lower)) byNameToken.set(lower, []);
      byNameToken.get(lower).push(entry);
    }
  }
  return { byNorad, byNameToken };
};

const STATIC_CATALOG = buildStaticCatalog();

const lookupNoradFromName = (catalog, candidateNames) => {
  if (!catalog || !catalog.byNameToken) return null;
  const allCandidates = new Map();
  for (const candidate of candidateNames) {
    if (!candidate) continue;
    const tokens = candidate.toLowerCase().split(/[\s\-_()/.,]+/).filter(t => t.length > 2);
    for (const token of tokens) {
      const matches = catalog.byNameToken.get(token);
      if (matches) {
        for (const entry of matches) {
          allCandidates.set(entry.noradId, (allCandidates.get(entry.noradId) || 0) + 1);
        }
      }
    }
  }
  let bestId = null;
  let bestScore = 0;
  for (const [id, score] of allCandidates) {
    if (score > bestScore) {
      bestScore = score;
      bestId = id;
    }
  }
  if (bestId !== null && bestScore >= 1) {
    return catalog.byNorad.get(bestId);
  }
  return null;
};

const inferGIBSPlatform = (layerId, title, keywords) => {
  const lower = `${layerId} ${title} ${(keywords || []).join(" ")}`.toLowerCase();
  if (lower.includes("modis_terra") || (lower.includes("modis") && lower.includes("terra"))) return { spacecraft: "Terra", instrument: "MODIS", catalogTokens: ["terra"] };
  if (lower.includes("modis_aqua") || (lower.includes("modis") && lower.includes("aqua"))) return { spacecraft: "Aqua", instrument: "MODIS", catalogTokens: ["aqua"] };
  if (lower.includes("viirs_snpp") || lower.includes("snpp")) return { spacecraft: "Suomi NPP", instrument: "VIIRS", catalogTokens: ["suomi", "snpp"] };
  if (lower.includes("viirs_noaa20") || lower.includes("noaa20") || lower.includes("noaa-20")) return { spacecraft: "NOAA-20 (JPSS-1)", instrument: "VIIRS", catalogTokens: ["noaa", "jpss"] };
  if (lower.includes("viirs_noaa21") || lower.includes("noaa21") || lower.includes("noaa-21")) return { spacecraft: "NOAA-21 (JPSS-2)", instrument: "VIIRS", catalogTokens: ["noaa21", "jpss2"] };
  if (lower.includes("landsat")) return { spacecraft: "Landsat", instrument: "OLI/TIRS", catalogTokens: ["landsat"] };
  if (lower.includes("aster")) return { spacecraft: "Terra", instrument: "ASTER", catalogTokens: ["terra"] };
  if (/\bmisr\b/.test(lower)) return { spacecraft: "Terra", instrument: "MISR", catalogTokens: ["terra"] };
  if (lower.includes("amsr2") || lower.includes("gcom")) return { spacecraft: "GCOM-W1", instrument: "AMSR2", catalogTokens: ["gcom"] };
  if (lower.includes("smap")) return { spacecraft: "SMAP", instrument: "Radiometer", catalogTokens: ["smap"] };
  if (lower.includes("calipso")) return { spacecraft: "CALIPSO", instrument: "CALIOP", catalogTokens: ["calipso"] };
  if (lower.includes("seviri")) return { spacecraft: "Meteosat", instrument: "SEVIRI", catalogTokens: ["meteosat"] };
  if (lower.includes("goes") || lower.includes("geocolor")) return { spacecraft: "GOES", instrument: "ABI", catalogTokens: ["goes"] };
  if (lower.includes("himawari")) return { spacecraft: "Himawari", instrument: "AHI", catalogTokens: ["himawari"] };
  if (lower.includes("orbiting_carbon") || lower.includes("oco-2") || lower.includes("oco-3") || lower.includes("oco_2") || lower.includes("oco_3")) return { spacecraft: "OCO-2/3", instrument: "Spectrometer", catalogTokens: ["oco"] };
  if (/\bairs\b/.test(lower) || lower.includes("airs_")) return { spacecraft: "Aqua", instrument: "AIRS", catalogTokens: ["aqua"] };
  if (lower.includes("mopitt")) return { spacecraft: "Terra", instrument: "MOPITT", catalogTokens: ["terra"] };
  if (/\bmls\b/.test(lower) || lower.includes("mls_")) return { spacecraft: "Aura", instrument: "MLS", catalogTokens: ["aura"] };
  if (/\bomi\b/.test(lower) || lower.includes("omi_")) return { spacecraft: "Aura", instrument: "OMI", catalogTokens: ["aura"] };
  return { spacecraft: "NASA Earth Observing System", instrument: "Multiple", catalogTokens: [] };
};

const isSatelliteCameraStream = (title, description) => {
  const haystack = `${title || ""} ${description || ""}`;
  if (SATELLITE_VIEW_EXCLUDE_PATTERNS.test(haystack)) return false;
  if (SATELLITE_VIEW_INCLUDE_PATTERNS.test(haystack)) return true;
  return false;
};

const discoverGIBSLayers = async () => {
  if (gibsLayersCache.data && Date.now() - gibsLayersCache.timestamp < GIBS_TTL_MS) {
    return gibsLayersCache.data;
  }
  if (gibsLayersCache.inflight) {
    return gibsLayersCache.inflight;
  }
  const promise = (async () => {
    try {
      const url = "https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/1.0.0/WMTSCapabilities.xml";
      const response = await axios.get(url, { ...AXIOS_CONFIG, timeout: 25000, responseType: "text" });
      const xml = response.data || "";
      const layers = [];
      const layerPattern = /<Layer>([\s\S]*?)<\/Layer>/g;
      let match;
      while ((match = layerPattern.exec(xml)) !== null) {
        const block = match[1];
        const idMatch = block.match(/<ows:Identifier>([^<]+)<\/ows:Identifier>/);
        const titleMatch = block.match(/<ows:Title[^>]*>([^<]+)<\/ows:Title>/);
        const abstractMatch = block.match(/<ows:Abstract[^>]*>([\s\S]*?)<\/ows:Abstract>/);
        const formatMatch = block.match(/<Format>([^<]+)<\/Format>/);
        const tmsMatches = [...block.matchAll(/<TileMatrixSet>([^<]+)<\/TileMatrixSet>/g)];
        const dimensionMatch = block.match(/<Dimension>([\s\S]*?)<\/Dimension>/);
        let defaultDate = null;
        if (dimensionMatch) {
          const defaultMatch = dimensionMatch[1].match(/<Default>([^<]+)<\/Default>/);
          if (defaultMatch) defaultDate = defaultMatch[1];
        }
        const keywordMatches = [...block.matchAll(/<ows:Keyword>([^<]+)<\/ows:Keyword>/g)];
        if (idMatch && titleMatch) {
          layers.push({
            identifier: idMatch[1],
            title: cleanXmlText(titleMatch[1]),
            abstract: abstractMatch ? cleanXmlText(abstractMatch[1]) : null,
            format: formatMatch ? formatMatch[1] : "image/jpeg",
            tileMatrixSets: tmsMatches.map(m => m[1]),
            keywords: keywordMatches.map(m => cleanXmlText(m[1])),
            defaultDate
          });
        }
      }
      gibsLayersCache.data = layers;
      gibsLayersCache.timestamp = Date.now();
      return layers;
    } catch (error) {
      return [];
    } finally {
      gibsLayersCache.inflight = null;
    }
  })();
  gibsLayersCache.inflight = promise;
  return promise;
};

const discoverSDOWavelengths = async () => {
  if (sdoCache.data && Date.now() - sdoCache.timestamp < SDO_LATEST_TTL_MS) {
    return sdoCache.data;
  }
  if (sdoCache.inflight) {
    return sdoCache.inflight;
  }
  const promise = (async () => {
    try {
      const url = "https://sdo.gsfc.nasa.gov/assets/img/latest/";
      const response = await axios.get(url, { ...AXIOS_CONFIG, timeout: 12000, responseType: "text" });
      const html = response.data || "";
      const filenamePattern = /latest_1024_([0-9A-Z]+)\.jpg/g;
      const seen = new Set();
      const wavelengths = [];
      let match;
      while ((match = filenamePattern.exec(html)) !== null) {
        const id = match[1];
        if (seen.has(id)) continue;
        seen.add(id);
        let label, description, instrument;
        if (id === "0094") { label = "AIA 94 Å"; instrument = "AIA"; description = "Flaring regions of the corona at approximately 6 million Kelvin."; }
        else if (id === "0131") { label = "AIA 131 Å"; instrument = "AIA"; description = "Hot flare plasma at approximately 10 million Kelvin."; }
        else if (id === "0171") { label = "AIA 171 Å"; instrument = "AIA"; description = "Quiet corona and upper transition region at approximately 600,000 Kelvin."; }
        else if (id === "0193") { label = "AIA 193 Å"; instrument = "AIA"; description = "Bright corona and hot flare plasma at approximately 1.2 million Kelvin."; }
        else if (id === "0211") { label = "AIA 211 Å"; instrument = "AIA"; description = "Active region corona at approximately 2 million Kelvin."; }
        else if (id === "0304") { label = "AIA 304 Å"; instrument = "AIA"; description = "Chromosphere and transition region at approximately 50,000 Kelvin."; }
        else if (id === "0335") { label = "AIA 335 Å"; instrument = "AIA"; description = "Active region corona at approximately 2.5 million Kelvin."; }
        else if (id === "1600") { label = "AIA 1600 Å"; instrument = "AIA"; description = "Transition region and upper photosphere at approximately 10,000 Kelvin."; }
        else if (id === "1700") { label = "AIA 1700 Å"; instrument = "AIA"; description = "Photosphere at approximately 6,000 Kelvin."; }
        else if (id === "HMIB") { label = "HMI Magnetogram"; instrument = "HMI"; description = "Photospheric line-of-sight magnetic field."; }
        else if (id === "HMIBC") { label = "HMI Colorized Magnetogram"; instrument = "HMI"; description = "Colorized photospheric magnetic field."; }
        else if (id === "HMIIC") { label = "HMI Continuum"; instrument = "HMI"; description = "Visible-light photosphere with sunspots."; }
        else if (id === "HMIIF") { label = "HMI Continuum Flattened"; instrument = "HMI"; description = "Limb-darkening corrected continuum."; }
        else if (id === "HMID") { label = "HMI Dopplergram"; instrument = "HMI"; description = "Photospheric Doppler velocity."; }
        else { label = `SDO ${id}`; instrument = id.startsWith("HMI") ? "HMI" : "AIA"; description = `Solar Dynamics Observatory product ${id}.`; }
        wavelengths.push({
          id,
          label,
          description,
          instrument,
          latest: `https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_${id}.jpg`,
          mid: `https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_${id}.jpg`,
          thumb: `https://sdo.gsfc.nasa.gov/assets/img/latest/latest_256_${id}.jpg`
        });
      }
      sdoCache.data = { wavelengths, fetchedAt: new Date().toISOString() };
      sdoCache.timestamp = Date.now();
      return sdoCache.data;
    } catch (error) {
      return { wavelengths: [], fetchedAt: new Date().toISOString(), error: error.message };
    } finally {
      sdoCache.inflight = null;
    }
  })();
  sdoCache.inflight = promise;
  return promise;
};

const discoverSOHOImages = async () => {
  if (sohoCache.data && Date.now() - sohoCache.timestamp < SDO_LATEST_TTL_MS) {
    return sohoCache.data;
  }
  if (sohoCache.inflight) {
    return sohoCache.inflight;
  }
  const promise = (async () => {
    try {
      const url = "https://soho.nascom.nasa.gov/data/realtime/";
      let response = null;
      let lastError = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          response = await fetchPlainHtml(url, { timeout: 12000 });
          break;
        } catch (error) {
          lastError = error;
          if (attempt < 3) {
            const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            await delay(backoffMs);
          }
        }
      }
      if (!response) throw lastError || new Error("SOHO fetch failed for unknown reason.");
      const html = response.data || "";
      const productCodes = new Set();
      const dirListingPattern = /href="([^"\/?#]+)\/"/g;
      let match;
      while ((match = dirListingPattern.exec(html)) !== null) {
        const code = match[1];
        if (code.startsWith(".") || code === "..") continue;
        if (code.length > 24) continue;
        productCodes.add(code);
      }
      const realtimeUrlPattern = /\/realtime\/([a-zA-Z0-9_]+)\/\d+\//g;
      while ((match = realtimeUrlPattern.exec(html)) !== null) {
        const code = match[1];
        if (code.length > 24) continue;
        productCodes.add(code);
      }
      const seen = new Set();
      const products = [];
      for (const code of productCodes) {
        if (seen.has(code)) continue;
        seen.add(code);
        let title, description, instrument;
        if (code === "c2") { title = "LASCO C2 Coronagraph"; instrument = "LASCO C2"; description = "Inner coronagraph showing the solar corona from approximately 2 to 6 solar radii. Captures coronal mass ejections, solar wind streamers, and bright stars passing through the field of view."; }
        else if (code === "c3") { title = "LASCO C3 Coronagraph"; instrument = "LASCO C3"; description = "Wide-field coronagraph showing the outer corona out to approximately 32 solar radii, useful for tracking CME propagation through the inner heliosphere."; }
        else if (code === "eit_171") { title = "EIT 171 Å"; instrument = "EIT"; description = "Extreme ultraviolet imagery at 171 Ångströms showing the quiet corona and upper transition region at approximately 1 million Kelvin."; }
        else if (code === "eit_195") { title = "EIT 195 Å"; instrument = "EIT"; description = "Extreme ultraviolet imagery at 195 Ångströms showing the corona at approximately 1.5 million Kelvin, including coronal holes and active regions."; }
        else if (code === "eit_284") { title = "EIT 284 Å"; instrument = "EIT"; description = "Extreme ultraviolet imagery at 284 Ångströms showing the hot corona at approximately 2 million Kelvin."; }
        else if (code === "eit_304") { title = "EIT 304 Å"; instrument = "EIT"; description = "Extreme ultraviolet imagery at 304 Ångströms showing the chromosphere and transition region at approximately 60,000 to 80,000 Kelvin."; }
        else if (code === "hmi_igr") { title = "HMI Continuum"; instrument = "HMI"; description = "Visible-light photosphere with sunspot detail."; }
        else if (code === "hmi_mag") { title = "HMI Magnetogram"; instrument = "HMI"; description = "Photospheric magnetic field map."; }
        else if (code === "mdi_igr") { title = "MDI Continuum"; instrument = "MDI"; description = "Legacy MDI continuum imagery."; }
        else if (code === "mdi_mag") { title = "MDI Magnetogram"; instrument = "MDI"; description = "Legacy MDI magnetogram."; }
        else { title = code.toUpperCase(); instrument = "SOHO"; description = `SOHO realtime product ${code}.`; }
        products.push({
          code,
          title,
          description,
          instrument,
          fullUrl: `https://soho.nascom.nasa.gov/data/realtime/${code}/512/latest.jpg`,
          thumbUrl: `https://soho.nascom.nasa.gov/data/realtime/${code}/256/latest.jpg`
        });
      }
      sohoCache.data = { products, fetchedAt: new Date().toISOString() };
      sohoCache.timestamp = Date.now();
      return sohoCache.data;
    } catch (error) {
      return { products: [], fetchedAt: new Date().toISOString(), error: error.message };
    } finally {
      sohoCache.inflight = null;
    }
  })();
  sohoCache.inflight = promise;
  return promise;
};

const discoverNOAAGoesProducts = async (satelliteCode, cache) => {
  if (cache.data && Date.now() - cache.timestamp < NOAA_STAR_DIRECTORY_TTL_MS) {
    return cache.data;
  }
  if (cache.inflight) {
    return cache.inflight;
  }
  const promise = (async () => {
    try {
      const url = `https://cdn.star.nesdis.noaa.gov/${satelliteCode}/ABI/FD/`;
      let response = null;
      let lastError = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          response = await fetchNoaaIpv4(url, { timeout: 12000, responseType: "text" });
          break;
        } catch (error) {
          lastError = error;
          if (attempt < 3) {
            const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            await delay(backoffMs);
          }
        }
      }
      if (!response) throw lastError || new Error("NOAA fetch failed for unknown reason.");
      const html = response.data || "";
      const linkPattern = /href="([^"\/?#]+)\/"/g;
      const products = [];
      const seen = new Set();
      let match;
      while ((match = linkPattern.exec(html)) !== null) {
        const code = match[1];
        if (seen.has(code)) continue;
        if (code.startsWith(".") || code === "..") continue;
        if (code.length > 24) continue;
        seen.add(code);
        let title, description;
        if (code === "GEOCOLOR") { title = "GeoColor"; description = "True-color daytime imagery and city-lights nighttime imagery in a seamless composite."; }
        else if (code === "AirMass") { title = "Airmass RGB"; description = "Airmass RGB composite showing dry vs. moist air masses, jet streams, and stratospheric intrusions."; }
        else if (code === "DayCloudPhase") { title = "Day Cloud Phase"; description = "Day Cloud Phase Distinction RGB highlighting cloud thermodynamic phase and altitude."; }
        else if (code === "Sandwich") { title = "Sandwich Product"; description = "Composite of visible and infrared imagery emphasizing convective cloud-top texture."; }
        else if (code === "NightMicrophysics") { title = "Night Microphysics"; description = "Night Microphysics RGB highlighting fog, low clouds, and dust at night."; }
        else if (code === "EnhancedSWIR") { title = "Enhanced SWIR"; description = "Shortwave-infrared imagery enhanced for active fire detection and cloud microphysics."; }
        else if (code === "DayLandCloud") { title = "Day Land Cloud"; description = "Day Land Cloud RGB highlighting vegetation, snow, and cloud phase."; }
        else if (code === "DayLandCloudFire") { title = "Day Land Cloud Fire"; description = "RGB composite emphasizing active fires, smoke, and burn scars."; }
        else if (code === "DayConvection") { title = "Day Convection"; description = "Day Convection RGB highlighting deep convective updrafts and severe storm cores."; }
        else if (code === "DayCloudConvection") { title = "Day Cloud Convection"; description = "Day Cloud Convection RGB for distinguishing cloud types in convective environments."; }
        else if (code === "Dust") { title = "Dust RGB"; description = "Dust RGB composite for tracking blowing dust, sand storms, and aerosol transport."; }
        else if (code === "FireTemperature") { title = "Fire Temperature"; description = "Fire Temperature RGB for active fire detection and intensity estimation."; }
        else if (code === "DifferentialWaterVapor") { title = "Differential Water Vapor"; description = "Differential water vapor product for tracking moisture gradients aloft."; }
        else if (code === "AirMassRGB") { title = "Air Mass RGB"; description = "Air Mass RGB composite for synoptic-scale air mass discrimination."; }
        else if (code === "01" || code === "02" || code === "03" || code === "04" || code === "05" || code === "06" || code === "07" || code === "08" || code === "09" || code === "10" || code === "11" || code === "12" || code === "13" || code === "14" || code === "15" || code === "16") {
          title = `ABI Channel ${parseInt(code)}`;
          description = `Single-channel imagery from ABI band ${parseInt(code)}.`;
        } else { title = code.replace(/([a-z])([A-Z])/g, "$1 $2"); description = `${title} imagery product from the ABI sensor.`; }
        products.push({
          code,
          title,
          description,
          fullDiskUrl: `https://cdn.star.nesdis.noaa.gov/${satelliteCode}/ABI/FD/${code}/5424x5424.jpg`,
          thumbUrl: `https://cdn.star.nesdis.noaa.gov/${satelliteCode}/ABI/FD/${code}/678x678.jpg`
        });
      }
      cache.data = { products, fetchedAt: new Date().toISOString(), satelliteCode };
      cache.timestamp = Date.now();
      return cache.data;
    } catch (error) {
      return { products: [], fetchedAt: new Date().toISOString(), error: error.message, satelliteCode };
    } finally {
      cache.inflight = null;
    }
  })();
  cache.inflight = promise;
  return promise;
};

const fetchHimawariLatest = async () => {
  if (himawariCache.data && Date.now() - himawariCache.timestamp < HIMAWARI_LATEST_TTL_MS) {
    return himawariCache.data;
  }
  if (himawariCache.inflight) {
    return himawariCache.inflight;
  }
  const promise = (async () => {
    try {
      const url = "https://himawari8.nict.go.jp/img/D531106/latest.json";
      const response = await axios.get(url, { ...AXIOS_CONFIG, timeout: 8000 });
      const latest = response.data?.date;
      if (!latest) return null;
      const isoFormatted = latest.replace(" ", "T") + "Z";
      const parsed = new Date(isoFormatted);
      if (isNaN(parsed.getTime())) return null;
      const yyyy = parsed.getUTCFullYear();
      const mm = String(parsed.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(parsed.getUTCDate()).padStart(2, "0");
      const HH = String(parsed.getUTCHours()).padStart(2, "0");
      const MM = String(parsed.getUTCMinutes()).padStart(2, "0");
      const datePath = `${yyyy}/${mm}/${dd}/${HH}${MM}00`;
      himawariCache.data = {
        timestamp: parsed.toISOString(),
        fullDisk: `https://himawari8.nict.go.jp/img/D531106/1d/550/${datePath}_0_0.png`,
        thumbnail: `https://himawari8.nict.go.jp/img/D531106/1d/550/${datePath}_0_0.png`
      };
      himawariCache.timestamp = Date.now();
      return himawariCache.data;
    } catch (error) {
      return null;
    } finally {
      himawariCache.inflight = null;
    }
  })();
  himawariCache.inflight = promise;
  return promise;
};

const fetchEPICLatest = async () => {
  if (epicCache.data && Date.now() - epicCache.timestamp < NASA_EPIC_TTL_MS) {
    return epicCache.data;
  }
  if (epicCache.inflight) {
    return epicCache.inflight;
  }
  const promise = (async () => {
    try {
      const availableUrl = `https://api.nasa.gov/EPIC/api/natural/available?api_key=${NASA_API_KEY}`;
      const availableResponse = await axios.get(availableUrl, { ...AXIOS_CONFIG, timeout: 10000 });
      const availableDates = availableResponse.data;
      if (!Array.isArray(availableDates) || availableDates.length === 0) {
        epicCache.data = { images: [], error: "EPIC available-dates endpoint returned no dates." };
        epicCache.timestamp = Date.now();
        return epicCache.data;
      }
      const latestDate = availableDates[availableDates.length - 1];
      const dateUrl = `https://api.nasa.gov/EPIC/api/natural/date/${latestDate}?api_key=${NASA_API_KEY}`;
      const dateResponse = await axios.get(dateUrl, { ...AXIOS_CONFIG, timeout: 10000 });
      const items = dateResponse.data || [];
      if (items.length === 0) {
        epicCache.data = { images: [], error: `Most recent available date ${latestDate} returned no images.` };
        epicCache.timestamp = Date.now();
        return epicCache.data;
      }
      const images = items.slice(0, 24).map(item => {
        const normalizedDate = normalizeEpicDate(item.date);
        const date = new Date(normalizedDate);
        const y = date.getUTCFullYear();
        const m = String(date.getUTCMonth() + 1).padStart(2, "0");
        const d = String(date.getUTCDate()).padStart(2, "0");
        const archivePath = `https://api.nasa.gov/EPIC/archive/natural/${y}/${m}/${d}`;
        return {
          identifier: item.identifier,
          caption: item.caption,
          image: item.image,
          date: normalizedDate,
          centroid: item.centroid_coordinates,
          dscovrPosition: item.dscovr_j2000_position,
          lunarPosition: item.lunar_j2000_position,
          sunPosition: item.sun_j2000_position,
          thumbnail: `${archivePath}/thumbs/${item.image}.jpg?api_key=${NASA_API_KEY}`,
          png: `${archivePath}/png/${item.image}.png?api_key=${NASA_API_KEY}`,
          jpg: `${archivePath}/jpg/${item.image}.jpg?api_key=${NASA_API_KEY}`
        };
      });
      const latestItemDate = normalizeEpicDate(items[items.length - 1].date);
      epicCache.data = { images, latestDate: latestItemDate, dateUsed: latestDate, totalAvailableDates: availableDates.length };
      epicCache.timestamp = Date.now();
      return epicCache.data;
    } catch (error) {
      return { images: [], error: error.message };
    } finally {
      epicCache.inflight = null;
    }
  })();
  epicCache.inflight = promise;
  return promise;
};

const fetchAPOD = async () => {
  if (apodCache.data && Date.now() - apodCache.timestamp < NASA_APOD_TTL_MS) {
    return apodCache.data;
  }
  if (apodCache.inflight) {
    return apodCache.inflight;
  }
  const promise = (async () => {
    try {
      const url = `https://api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY}&thumbs=true`;
      const response = await axios.get(url, { ...AXIOS_CONFIG, timeout: 10000 });
      const data = response.data;
      apodCache.data = {
        title: data.title,
        explanation: data.explanation,
        date: data.date,
        url: data.url,
        hdurl: data.hdurl,
        mediaType: data.media_type,
        thumbnailUrl: data.thumbnail_url,
        copyright: data.copyright
      };
      apodCache.timestamp = Date.now();
      return apodCache.data;
    } catch (error) {
      return null;
    } finally {
      apodCache.inflight = null;
    }
  })();
  apodCache.inflight = promise;
  return promise;
};

const discoverNASAVideoLibrary = async (query, maxResults = 10) => {
  try {
    const url = `https://images-api.nasa.gov/search?q=${encodeURIComponent(query)}&media_type=video&page_size=${maxResults}`;
    const response = await axios.get(url, { ...AXIOS_CONFIG, timeout: 12000 });
    const items = response.data?.collection?.items || [];
    const enriched = await runWithConcurrency(items.map(item => async () => {
      const data = item.data?.[0] || {};
      const links = item.links || [];
      const thumbnail = links.find(l => l.render === "image")?.href || links[0]?.href;
      let videoUrl = null;
      try {
        const assetMetaUrl = item.href;
        const assetResponse = await axios.get(assetMetaUrl, { ...AXIOS_CONFIG, timeout: 8000 });
        const assetList = Array.isArray(assetResponse.data) ? assetResponse.data : [];
        const mp4 = assetList.find(u => /\.mp4$/i.test(u) && /~mobile|~medium|~small/.test(u))
          || assetList.find(u => /\.mp4$/i.test(u));
        if (mp4) videoUrl = mp4;
      } catch (error) {
        videoUrl = null;
      }
      return {
        nasaId: data.nasa_id,
        title: data.title,
        description: data.description,
        dateCreated: data.date_created,
        center: data.center,
        keywords: data.keywords || [],
        thumbnail,
        videoUrl
      };
    }), 4);
    return enriched.filter(e => e && !e.error && e.videoUrl);
  } catch (error) {
    return [];
  }
};

const discoverYouTubeLiveStreams = async () => {
  if (youtubeLiveCache.data && Date.now() - youtubeLiveCache.timestamp < REGISTRY_TTL_MS) {
    return youtubeLiveCache.data;
  }
  if (youtubeLiveCache.inflight) {
    return youtubeLiveCache.inflight;
  }
  const promise = (async () => {
    if (!YOUTUBE_API_KEY) {
      const result = { streams: [], skipped: "YOUTUBE_API_KEY not configured." };
      youtubeLiveCache.data = result;
      youtubeLiveCache.timestamp = Date.now();
      return result;
    }
    try {
      const allStreams = [];
      let totalCandidatesBeforeFilter = 0;
      let rejectedByFilter = 0;
      for (const channel of TRUSTED_YOUTUBE_CHANNELS) {
        try {
          const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&eventType=live&videoEmbeddable=true&maxResults=5&channelId=${encodeURIComponent(channel.channelId)}&key=${YOUTUBE_API_KEY}`;
          const r = await axios.get(url, { ...AXIOS_CONFIG, timeout: 10000 });
          const items = r.data?.items || [];
          for (const item of items) {
            if (!item.id?.videoId) continue;
            totalCandidatesBeforeFilter++;
            const title = item.snippet?.title || "";
            const description = item.snippet?.description || "";
            if (!isSatelliteCameraStream(title, description)) {
              rejectedByFilter++;
              continue;
            }
            allStreams.push({
              videoId: item.id.videoId,
              title,
              description,
              channelId: channel.channelId,
              channelTitle: item.snippet?.channelTitle || channel.name,
              channelDescription: channel.description,
              publishedAt: item.snippet?.publishedAt,
              thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url
            });
          }
        } catch (error) {
          continue;
        }
      }
      const seen = new Set();
      const deduped = [];
      for (const s of allStreams) {
        if (seen.has(s.videoId)) continue;
        seen.add(s.videoId);
        deduped.push(s);
      }
      const result = {
        streams: deduped,
        fetchedAt: new Date().toISOString(),
        channelsQueried: TRUSTED_YOUTUBE_CHANNELS.length,
        totalCandidatesBeforeFilter,
        rejectedByFilter
      };
      youtubeLiveCache.data = result;
      youtubeLiveCache.timestamp = Date.now();
      return result;
    } catch (error) {
      return { streams: [], error: error.message };
    } finally {
      youtubeLiveCache.inflight = null;
    }
  })();
  youtubeLiveCache.inflight = promise;
  return promise;
};

const fetchISSPosition = async () => {
  if (issPositionCache.data && Date.now() - issPositionCache.timestamp < ISS_POSITION_TTL_MS) {
    return issPositionCache.data;
  }
  if (issPositionCache.inflight) {
    return issPositionCache.inflight;
  }
  const promise = (async () => {
    try {
      const positionUrl = "https://api.wheretheiss.at/v1/satellites/25544";
      const crewUrl = "http://api.open-notify.org/astros.json";
      const settled = await Promise.allSettled([
        axios.get(positionUrl, { ...AXIOS_CONFIG, timeout: 6000 }),
        axios.get(crewUrl, { ...AXIOS_CONFIG, timeout: 6000 })
      ]);
      const result = { fetchedAt: new Date().toISOString() };
      if (settled[0].status === "fulfilled") {
        const d = settled[0].value.data;
        result.position = {
          latitude: d.latitude,
          longitude: d.longitude,
          altitudeKm: d.altitude,
          velocityKmh: d.velocity,
          visibility: d.visibility,
          footprintKm: d.footprint,
          timestamp: d.timestamp,
          solarLat: d.solar_lat,
          solarLon: d.solar_lon,
          dayNum: d.daynum,
          units: d.units
        };
      }
      if (settled[1].status === "fulfilled") {
        const d = settled[1].value.data;
        if (Array.isArray(d.people)) {
          result.crew = d.people.filter(p => p.craft === "ISS").map(p => p.name);
          result.allPeople = d.people;
          result.totalInSpace = d.number;
        }
      }
      issPositionCache.data = result;
      issPositionCache.timestamp = Date.now();
      return result;
    } catch (error) {
      return null;
    } finally {
      issPositionCache.inflight = null;
    }
  })();
  issPositionCache.inflight = promise;
  return promise;
};

const buildGIBSFeed = (layer, catalog) => {
  const platform = inferGIBSPlatform(layer.identifier, layer.title, layer.keywords);
  const noradMatch = lookupNoradFromName(catalog, [platform.spacecraft, ...(platform.catalogTokens || [])]);
  const isSubDaily = !!(layer.defaultDate && layer.defaultDate.includes("T"));
  let dateStr;
  let cadenceLabel;
  if (isSubDaily) {
    dateStr = layer.defaultDate;
    cadenceLabel = `Latest scan · ${dateStr}`;
  } else {
    const baseline = layer.defaultDate || formatYMD(new Date());
    dateStr = subtractDays(baseline, 3);
    cadenceLabel = `Daily mosaic · ${dateStr}`;
  }
  const ext = layer.format === "image/png" ? "png" : "jpg";
  const wvsFormat = layer.format === "image/png" ? "image/png" : "image/jpeg";
  const imageUrl = `https://wvs.earthdata.nasa.gov/api/v1/snapshot?REQUEST=GetSnapshot&LAYERS=${encodeURIComponent(layer.identifier)}&CRS=EPSG:4326&BBOX=-90,-180,90,180&WIDTH=1024&HEIGHT=512&FORMAT=${encodeURIComponent(wvsFormat)}&TIME=${encodeURIComponent(dateStr)}`;
  const thumbnailUrl = `https://wvs.earthdata.nasa.gov/api/v1/snapshot?REQUEST=GetSnapshot&LAYERS=${encodeURIComponent(layer.identifier)}&CRS=EPSG:4326&BBOX=-90,-180,90,180&WIDTH=400&HEIGHT=200&FORMAT=${encodeURIComponent(wvsFormat)}&TIME=${encodeURIComponent(dateStr)}`;
  const worldviewUrl = `https://worldview.earthdata.nasa.gov/?v=-180,-90,180,90&l=${layer.identifier}&t=${encodeURIComponent(dateStr)}`;
  const descriptionSuffix = isSubDaily
    ? `Rendered at ${dateStr} (sub-daily geostationary or near-realtime layer; the WMTS-advertised default time is used directly because rolling back would give stale data instead of fresher scans).`
    : `Rendered for ${dateStr} (rolled back from the WMTS-advertised default to ensure a complete daily mosaic; polar-orbiter products like MODIS and VIIRS require 24 to 72 hours after the acquisition date for full global coverage to be assembled).`;
  return {
    id: `gibs-${layer.identifier.toLowerCase()}`,
    name: layer.title,
    spacecraft: platform.spacecraft,
    operator: "NASA Earth Observing System Data and Information System (EOSDIS)",
    noradId: noradMatch?.noradId || null,
    catalogName: noradMatch?.name || null,
    feedType: "image",
    category: "Earth Observation",
    instrument: platform.instrument,
    description: layer.abstract ? `${layer.abstract} ${descriptionSuffix}` : `${layer.title} layer from the NASA Global Imagery Browse Services (GIBS), discovered via WMTS capabilities advertisement. ${descriptionSuffix}`,
    imageUrl,
    thumbnailUrl,
    worldviewUrl,
    layerIdentifier: layer.identifier,
    tileMatrixSets: layer.tileMatrixSets,
    format: layer.format,
    coverageRegime: "Global / multi-platform",
    cadenceLabel,
    latestTimestamp: dateStr,
    isLive: true,
    sources: ["NASA GIBS WMTS"]
  };
};

const buildSDOFeed = (wavelength, catalog) => {
  const noradMatch = lookupNoradFromName(catalog, ["SDO", "Solar Dynamics Observatory", "sdo"]);
  return {
    id: `sdo-${wavelength.id.toLowerCase()}`,
    name: `SDO ${wavelength.label}`,
    spacecraft: "Solar Dynamics Observatory",
    operator: "NASA Goddard Space Flight Center",
    noradId: noradMatch?.noradId || null,
    catalogName: noradMatch?.name || null,
    feedType: "image",
    category: "Solar Imagery",
    instrument: wavelength.instrument === "HMI" ? "Helioseismic and Magnetic Imager (HMI)" : "Atmospheric Imaging Assembly (AIA)",
    description: `${wavelength.description} The Solar Dynamics Observatory orbits Earth in a geosynchronous inclined orbit and continuously monitors the Sun across multiple extreme-ultraviolet wavelengths and visible-light channels. This product was discovered via the SDO latest-image directory listing.`,
    imageUrl: wavelength.latest,
    thumbnailUrl: wavelength.thumb,
    midResUrl: wavelength.mid,
    coverageRegime: "Geosynchronous Sun-pointing",
    cadenceLabel: "~1 minute refresh",
    wavelengthCode: wavelength.id,
    isLive: true,
    sources: ["NASA SDO realtime"]
  };
};

const buildSOHOFeed = (product, catalog) => {
  const noradMatch = lookupNoradFromName(catalog, ["SOHO", "Solar Heliospheric Observatory", "soho"]);
  return {
    id: `soho-${product.code}`,
    name: `SOHO ${product.title}`,
    spacecraft: "SOHO",
    operator: "ESA / NASA",
    noradId: noradMatch?.noradId || null,
    catalogName: noradMatch?.name || null,
    feedType: "image",
    category: "Solar Imagery",
    instrument: product.instrument,
    description: product.description,
    imageUrl: product.fullUrl,
    thumbnailUrl: product.thumbUrl,
    coverageRegime: "Sun-Earth L1 (~1.5M km)",
    cadenceLabel: "~12 minute refresh",
    productCode: product.code,
    isLive: true,
    sources: ["NASA SOHO realtime"]
  };
};

const buildGOESFeed = (product, satelliteCode, parkingLongitude, catalog) => {
  const longLabel = parkingLongitude < 0 ? `${Math.abs(parkingLongitude)}°W` : `${parkingLongitude}°E`;
  const display = satelliteCode === "GOES19" ? "GOES-19 (East)" : satelliteCode === "GOES18" ? "GOES-18 (West)" : satelliteCode === "GOES16" ? "GOES-16 (Storage)" : satelliteCode === "GOES17" ? "GOES-17 (Storage)" : satelliteCode;
  const tokens = [satelliteCode.replace(/(\d+)/, " $1"), "GOES", satelliteCode.toLowerCase()];
  const noradMatch = lookupNoradFromName(catalog, tokens);
  return {
    id: `${satelliteCode.toLowerCase()}-${product.code.toLowerCase()}`,
    name: `${display} ${product.title}`,
    spacecraft: display,
    operator: "NOAA / NESDIS",
    noradId: noradMatch?.noradId || null,
    catalogName: noradMatch?.name || null,
    feedType: "image",
    category: "Geostationary Imagery",
    instrument: "Advanced Baseline Imager (ABI)",
    description: `${product.description} Data is published by the NOAA NESDIS STAR division for the ${display} satellite parked at ${longLabel}, discovered through the public ABI full-disk product directory listing.`,
    imageUrl: product.fullDiskUrl,
    thumbnailUrl: product.thumbUrl,
    coverageRegime: `GEO ${longLabel}`,
    cadenceLabel: "~10 minute refresh",
    productCode: product.code,
    isLive: true,
    sources: ["NOAA STAR"]
  };
};

const buildHimawariFeed = (himawari, catalog) => {
  const noradMatch = lookupNoradFromName(catalog, ["Himawari", "himawari"]);
  return {
    id: "himawari-fulldisk",
    name: "Himawari Full Disk True Color",
    spacecraft: "Himawari",
    operator: "Japan Meteorological Agency / NICT",
    noradId: noradMatch?.noradId || null,
    catalogName: noradMatch?.name || null,
    feedType: "image",
    category: "Geostationary Imagery",
    instrument: "Advanced Himawari Imager (AHI)",
    description: "Real-time full-disk true-color composite from the Himawari geostationary weather satellite operated by the Japan Meteorological Agency, parked over the western Pacific. Imagery refreshes approximately every ten minutes and was discovered through the NICT realtime latest.json metadata feed.",
    imageUrl: himawari.fullDisk,
    thumbnailUrl: himawari.thumbnail,
    coverageRegime: "GEO 140.7°E",
    cadenceLabel: "~10 minute refresh",
    latestTimestamp: himawari.timestamp,
    isLive: true,
    sources: ["NICT Himawari Real-Time"]
  };
};

const buildEPICFeed = (epic, catalog) => {
  const noradMatch = lookupNoradFromName(catalog, ["DSCOVR", "Deep Space Climate Observatory", "dscovr"]);
  const recentImages = epic.images.slice(-6);
  return {
    id: "dscovr-epic-natural",
    name: "DSCOVR EPIC Natural Color (Sun-Earth L1)",
    spacecraft: "DSCOVR",
    operator: "NOAA / NASA",
    noradId: noradMatch?.noradId || null,
    catalogName: noradMatch?.name || null,
    feedType: "image-sequence",
    category: "Deep Space Imagery",
    instrument: "Earth Polychromatic Imaging Camera (EPIC)",
    description: "Natural-color images of the entire sunlit hemisphere of Earth taken from the Earth-Sun Lagrange point L1, approximately 1.5 million km from Earth. The EPIC instrument produces a sequence of full-disk Earth images each day, discovered via the NASA EPIC API.",
    images: recentImages.map(img => ({
      url: img.png,
      thumbnail: img.thumbnail,
      caption: img.caption,
      date: img.date,
      centroid: img.centroid
    })),
    latestTimestamp: epic.latestDate,
    coverageRegime: "Sun-Earth L1",
    cadenceLabel: "Daily image sequence",
    isLive: false,
    sources: ["NASA EPIC API"]
  };
};

const buildISSPositionFeed = (catalog) => {
  const noradMatch = catalog?.byNorad?.get(25544);
  return {
    id: "iss-position-tracker",
    name: "ISS Real-Time Ground Track Telemetry",
    spacecraft: "International Space Station",
    operator: "NASA / Roscosmos",
    noradId: 25544,
    catalogName: noradMatch?.name || "ISS (ZARYA)",
    feedType: "telemetry",
    category: "Live Telemetry",
    instrument: "Orbital state vector",
    description: "Continuous telemetry of the International Space Station including geodetic latitude, longitude, altitude above the WGS-84 ellipsoid, ground velocity, footprint radius, and visibility classification. Updated every twenty seconds from the where-the-iss-at API and supplemented with the current crew manifest from open-notify.",
    streamEndpoint: "/satellite-feeds/iss-position",
    coverageRegime: "LEO ~408 km",
    cadenceLabel: "Updated every 20 seconds",
    isLive: true,
    sources: ["wheretheiss.at", "open-notify.org"]
  };
};

const buildYouTubeLiveFeed = (stream, catalog) => {
  const tokens = [];
  if (stream.title) tokens.push(stream.title);
  if (stream.description) tokens.push(stream.description);
  const noradMatch = lookupNoradFromName(catalog, tokens);
  const lower = (stream.title || "").toLowerCase();
  const channelLower = (stream.channelTitle || "").toLowerCase();
  let category = "Live Stream";
  let spacecraft = stream.channelTitle || "Live Channel";
  if (lower.includes("iss") || lower.includes("international space station")) {
    spacecraft = "International Space Station";
  } else if (lower.includes("starship") || lower.includes("starbase")) {
    spacecraft = "SpaceX Starship";
  } else if (lower.includes("falcon") || lower.includes("dragon")) {
    spacecraft = "SpaceX Falcon / Dragon";
  } else if (lower.includes("ariane")) {
    spacecraft = "Ariane Launch Vehicle";
  } else if (channelLower.includes("nasa")) {
    spacecraft = "NASA Live Broadcast";
  } else if (channelLower.includes("esa")) {
    spacecraft = "ESA Live Broadcast";
  }
  const description = stream.description
    ? `${stream.description}${stream.channelDescription ? `\n\nChannel context: ${stream.channelDescription}` : ""}`
    : (stream.channelDescription || stream.title);
  return {
    id: `youtube-live-${stream.videoId}`,
    name: stream.title,
    spacecraft,
    operator: stream.channelTitle || "YouTube",
    noradId: noradMatch?.noradId || null,
    catalogName: noradMatch?.name || null,
    feedType: "video",
    category,
    instrument: "External Broadcast",
    description,
    embedUrl: `https://www.youtube.com/embed/${stream.videoId}?autoplay=1&mute=1`,
    thumbnailUrl: stream.thumbnail,
    posterUrl: stream.thumbnail,
    coverageRegime: "Live broadcast",
    cadenceLabel: "Live (continuous)",
    isLive: true,
    sources: [`YouTube · ${stream.channelTitle || "Trusted channel"}`]
  };
};

const enrichFeedsWithAvailability = async (feeds) => {
  const probeTasks = feeds.map(feed => async () => {
    let probeTarget = null;
    if (feed.imageUrl) probeTarget = { kind: "imageUrl", url: feed.imageUrl };
    else if (feed.previewUrl) probeTarget = { kind: "previewUrl", url: feed.previewUrl };
    else if (feed.videoUrl) probeTarget = { kind: "videoUrl", url: feed.videoUrl };
    else if (feed.embedUrl) probeTarget = { kind: "embedUrl", url: feed.embedUrl };
    else if (feed.images && feed.images.length > 0) probeTarget = { kind: "imageSequenceFirst", url: feed.images[0].url };
    if (feed.feedType === "telemetry") {
      return { ...feed, availability: { ok: true, status: 200, kind: "telemetry-internal", checkedAt: new Date().toISOString() } };
    }
    if (!probeTarget) {
      return { ...feed, availability: { ok: false, status: 0, error: "No probe-able URL.", checkedAt: new Date().toISOString() } };
    }
    if (isTrustedUrl(probeTarget.url)) {
      return {
        ...feed,
        availability: {
          ok: true,
          status: 200,
          kind: `${probeTarget.kind}-trusted-bypass`,
          contentType: null,
          contentLength: null,
          lastModified: null,
          checkedAt: new Date().toISOString()
        }
      };
    }
    const result = await probeUrl(probeTarget.url);
    return { ...feed, availability: { ...result, kind: probeTarget.kind } };
  });
  return runWithConcurrency(probeTasks, PROBE_CONCURRENCY);
};

const buildFeedRegistry = async () => {
  const overallStart = Date.now();
  const catalog = STATIC_CATALOG;
  const [
    gibsLayers,
    sdoData,
    sohoData,
    goesEastDirectory,
    goesWestDirectory,
    himawariData,
    epicData,
    youtubeLive
  ] = await Promise.all([
    discoverGIBSLayers(),
    discoverSDOWavelengths(),
    discoverSOHOImages(),
    discoverNOAAGoesProducts("GOES19", noaaGoesEastCache),
    discoverNOAAGoesProducts("GOES18", noaaGoesWestCache),
    fetchHimawariLatest(),
    fetchEPICLatest(),
    discoverYouTubeLiveStreams()
  ]);
  const candidateFeeds = [];
  candidateFeeds.push(buildISSPositionFeed(catalog));
  if (gibsLayers && gibsLayers.length > 0) {
    const cutoffDate = new Date(Date.now() - 7 * 86400000);
    const cutoffStr = formatYMD(cutoffDate);
    const compositePatterns = /CorrectedReflectance|GeoColor|TrueColor|_NatColour|DayNightBand|Chlorophyll|SeaSurfaceTemp|BlueMarble|SurfaceReflectance|Land_Surface_Reflectance|Snow_Cover|Sea_Ice/i;
    const excludePatterns = /Reference_Labels|Reference_Features|Coastlines|Boundaries|Population|Graticule|Granule|Swath|Orbit_|BrightnessTemp|CloudTopHeight|CloudTopTemp|CloudPhase|CloudEffective|CloudOptical|AerosolOptical|_L2_|_L3_/i;
    const filtered = gibsLayers.filter(l => {
      if (excludePatterns.test(l.identifier)) return false;
      if (!compositePatterns.test(l.identifier)) return false;
      if (l.defaultDate && l.defaultDate < cutoffStr) return false;
      return true;
    });
    const cap = Math.min(filtered.length, 30);
    for (let i = 0; i < cap; i++) {
      candidateFeeds.push(buildGIBSFeed(filtered[i], catalog));
    }
  }
  if (sdoData && sdoData.wavelengths) {
    for (const w of sdoData.wavelengths) {
      candidateFeeds.push(buildSDOFeed(w, catalog));
    }
  }
  if (sohoData && sohoData.products) {
    for (const p of sohoData.products) {
      candidateFeeds.push(buildSOHOFeed(p, catalog));
    }
  }
  const noaaGoesDenied = new Set([
    "1080p",
    "1808x1808",
    "5424x5424",
    "678x678",
    "latest",
    "thumbnails",
    "GIF",
    "MP4",
    "loops",
    "Animation"
  ]);
  const isValidGoesProduct = (p) => {
    if (!p.code) return false;
    if (noaaGoesDenied.has(p.code)) return false;
    if (/^\d+$/.test(p.code)) return false;
    if (/^\d+x\d+$/.test(p.code)) return false;
    if (p.code.length < 3) return false;
    return true;
  };
  if (goesEastDirectory && goesEastDirectory.products) {
    const composites = goesEastDirectory.products.filter(isValidGoesProduct);
    for (const p of composites) {
      candidateFeeds.push(buildGOESFeed(p, "GOES19", -75.2, catalog));
    }
  }
  if (goesWestDirectory && goesWestDirectory.products) {
    const composites = goesWestDirectory.products.filter(isValidGoesProduct);
    for (const p of composites) {
      candidateFeeds.push(buildGOESFeed(p, "GOES18", -137.2, catalog));
    }
  }
  if (himawariData && himawariData.fullDisk) {
    candidateFeeds.push(buildHimawariFeed(himawariData, catalog));
  }
  if (epicData && epicData.images && epicData.images.length > 0) {
    candidateFeeds.push(buildEPICFeed(epicData, catalog));
  }
  if (youtubeLive && youtubeLive.streams && youtubeLive.streams.length > 0) {
    for (const s of youtubeLive.streams) {
      candidateFeeds.push(buildYouTubeLiveFeed(s, catalog));
    }
  }
  const enriched = await enrichFeedsWithAvailability(candidateFeeds);
  const available = enriched.filter(f => f.availability && f.availability.ok);
  const unavailable = enriched.filter(f => !f.availability || !f.availability.ok);
  const categoryCounts = {};
  const operatorCounts = {};
  const feedTypeCounts = {};
  for (const f of available) {
    categoryCounts[f.category] = (categoryCounts[f.category] || 0) + 1;
    operatorCounts[f.operator] = (operatorCounts[f.operator] || 0) + 1;
    feedTypeCounts[f.feedType] = (feedTypeCounts[f.feedType] || 0) + 1;
  }
  return {
    feeds: available,
    unavailable: unavailable.map(f => ({
      id: f.id,
      name: f.name,
      reason: f.availability?.error || `HTTP ${f.availability?.status}.`,
      category: f.category
    })),
    metadata: {
      totalCandidates: candidateFeeds.length,
      totalAvailable: available.length,
      totalUnavailable: unavailable.length,
      categoryCounts,
      operatorCounts,
      feedTypeCounts,
      gibsLayerCount: gibsLayers?.length || 0,
      sdoWavelengthCount: sdoData?.wavelengths?.length || 0,
      sohoProductCount: sohoData?.products?.length || 0,
      goesEastProductCount: goesEastDirectory?.products?.length || 0,
      goesWestProductCount: goesWestDirectory?.products?.length || 0,
      youtubeLiveStreamCount: youtubeLive?.streams?.length || 0,
      catalogSize: catalog?.byNorad?.size || 0,
      buildTimeMs: Date.now() - overallStart,
      builtAt: new Date().toISOString()
    }
  };
};

const getRegistry = async (forceRefresh = false) => {
  if (!forceRefresh && registryCache.data && Date.now() - registryCache.timestamp < REGISTRY_TTL_MS) {
    return registryCache.data;
  }
  if (registryCache.inflight) {
    return registryCache.inflight;
  }
  const promise = (async () => {
    try {
      const result = await buildFeedRegistry();
      registryCache.data = result;
      registryCache.timestamp = Date.now();
      return result;
    } finally {
      registryCache.inflight = null;
    }
  })();
  registryCache.inflight = promise;
  return promise;
};

router.get("/feed-health", async (req, res) => {
  try {
    const now = Date.now();
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      registry: {
        cached: !!registryCache.data,
        ageSeconds: registryCache.timestamp ? Math.round((now - registryCache.timestamp) / 1000) : null,
        feedCount: registryCache.data?.feeds?.length || 0,
        unavailableCount: registryCache.data?.unavailable?.length || 0,
        inflight: !!registryCache.inflight
      },
      sources: {
        gibs: { cached: !!gibsLayersCache.data, ageSeconds: gibsLayersCache.timestamp ? Math.round((now - gibsLayersCache.timestamp) / 1000) : null },
        sdo: { cached: !!sdoCache.data, ageSeconds: sdoCache.timestamp ? Math.round((now - sdoCache.timestamp) / 1000) : null },
        soho: { cached: !!sohoCache.data, ageSeconds: sohoCache.timestamp ? Math.round((now - sohoCache.timestamp) / 1000) : null },
        goesEast: { cached: !!noaaGoesEastCache.data, ageSeconds: noaaGoesEastCache.timestamp ? Math.round((now - noaaGoesEastCache.timestamp) / 1000) : null },
        goesWest: { cached: !!noaaGoesWestCache.data, ageSeconds: noaaGoesWestCache.timestamp ? Math.round((now - noaaGoesWestCache.timestamp) / 1000) : null },
        himawari: { cached: !!himawariCache.data, ageSeconds: himawariCache.timestamp ? Math.round((now - himawariCache.timestamp) / 1000) : null },
        epic: { cached: !!epicCache.data, ageSeconds: epicCache.timestamp ? Math.round((now - epicCache.timestamp) / 1000) : null },
        apod: { cached: !!apodCache.data, ageSeconds: apodCache.timestamp ? Math.round((now - apodCache.timestamp) / 1000) : null },
        youtubeLive: { cached: !!youtubeLiveCache.data, ageSeconds: youtubeLiveCache.timestamp ? Math.round((now - youtubeLiveCache.timestamp) / 1000) : null, configured: !!YOUTUBE_API_KEY }
      },
      catalog: {
        size: STATIC_CATALOG.byNorad.size,
        tokenCount: STATIC_CATALOG.byNameToken.size
      },
      availabilityCacheSize: availabilityCache.size
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

router.get("/feed-registry", async (req, res) => {
  try {
    const force = req.query.force === "1" || req.query.force === "true";
    const registry = await getRegistry(force);
    res.json({ success: true, ...registry });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/feed-registry-stream", async (req, res) => {
  const force = req.query.force === "1" || req.query.force === "true";
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no"
  });
  if (typeof res.flushHeaders === "function") res.flushHeaders();
  let closed = false;
  const onClose = () => { closed = true; };
  req.on("close", onClose);
  req.on("aborted", onClose);
  const send = (event, data) => {
    if (closed || res.writableEnded) return;
    try {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      closed = true;
    }
  };
  send("hello", { startedAt: new Date().toISOString(), force });
  if (!force && registryCache.data && Date.now() - registryCache.timestamp < REGISTRY_TTL_MS) {
    const cached = registryCache.data;
    const CHUNK = 25;
    for (let i = 0; i < cached.feeds.length; i += CHUNK) {
      if (closed) break;
      send("batch", { feeds: cached.feeds.slice(i, i + CHUNK), source: "cache" });
    }
    if (!closed) {
      send("done", { metadata: { ...cached.metadata, fromCache: true }, unavailable: cached.unavailable });
    }
    res.end();
    return;
  }
  try {
    const registry = await getRegistry(force);
    if (closed) {
      res.end();
      return;
    }
    const CHUNK = 25;
    for (let i = 0; i < registry.feeds.length; i += CHUNK) {
      if (closed) break;
      send("batch", { feeds: registry.feeds.slice(i, i + CHUNK), source: "fresh" });
    }
    if (!closed) {
      send("done", { metadata: { ...registry.metadata, fromCache: false }, unavailable: registry.unavailable });
    }
  } catch (error) {
    if (!closed) {
      send("source-error", { source: "registry", error: error.message });
      send("done", { metadata: { error: error.message }, unavailable: [] });
    }
  } finally {
    res.end();
  }
});

router.get("/feed-iss-position", async (req, res) => {
  try {
    const data = await fetchISSPosition();
    res.json({ success: !!data, data });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

router.get("/feed-iss-position-stream", async (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no"
  });
  if (typeof res.flushHeaders === "function") res.flushHeaders();
  let closed = false;
  const onClose = () => { closed = true; };
  req.on("close", onClose);
  req.on("aborted", onClose);
  const send = (event, data) => {
    if (closed || res.writableEnded) return;
    try {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      closed = true;
    }
  };
  const tick = async () => {
    if (closed) return;
    try {
      const data = await fetchISSPosition();
      send("position", data);
    } catch (error) {
      send("error", { error: error.message });
    }
  };
  await tick();
  const interval = setInterval(tick, 5000);
  req.on("close", () => { clearInterval(interval); res.end(); });
});

router.get("/feed-detail/:id", async (req, res) => {
  try {
    const registry = await getRegistry(false);
    const feed = registry.feeds.find(f => f.id === req.params.id) || registry.unavailable.find(f => f.id === req.params.id);
    if (!feed) {
      return res.status(404).json({ success: false, error: "Feed not found." });
    }
    res.json({ success: true, feed });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

router.get("/feed-image-proxy/:id", async (req, res) => {
  try {
    const registry = await getRegistry(false);
    const feed = registry.feeds.find(f => f.id === req.params.id);
    if (!feed) {
      return res.status(404).set("Content-Type", "text/plain").send("Feed not found.");
    }
    const isThumb = req.query.type === "thumb";
    const frameIdx = parseInt(req.query.frame);
    let url;
    if (Number.isFinite(frameIdx) && feed.images && feed.images.length > 0) {
      const frame = feed.images[Math.min(Math.max(0, frameIdx), feed.images.length - 1)];
      url = isThumb ? (frame.thumbnail || frame.url) : frame.url;
    } else {
      url = isThumb
        ? (feed.thumbnailUrl || feed.posterUrl || feed.imageUrl || feed.previewUrl)
        : (feed.imageUrl || feed.previewUrl || feed.thumbnailUrl || feed.posterUrl);
    }
    if (!url) {
      return res.status(404).set("Content-Type", "text/plain").send("No image URL for this feed.");
    }
    let upstreamHostname = null;
    try { upstreamHostname = new URL(url).hostname; } catch (error) {}
    const isNoaaHost = upstreamHostname && /\.nesdis\.noaa\.gov$/i.test(upstreamHostname);
    if (isNoaaHost) {
      try {
        const noaaResponse = await fetchNoaaIpv4(url, { timeout: 15000, responseType: "stream" });
        res.set("Content-Type", noaaResponse.headers["content-type"] || "image/jpeg");
        if (noaaResponse.headers["content-length"]) {
          res.set("Content-Length", noaaResponse.headers["content-length"]);
        }
        res.set("Cache-Control", "public, max-age=60");
        noaaResponse.data.pipe(res);
        return;
      } catch (error) {
        if (!res.headersSent) {
          res.status(502).set("Content-Type", "text/plain").send(`NOAA upstream error: ${error.message}.`);
        }
        return;
      }
    }
    const upstream = await axios.get(url, {
      responseType: "stream",
      timeout: 15000,
      headers: {
        "User-Agent": AXIOS_CONFIG.headers["User-Agent"],
        "Accept": "image/*, */*"
      },
      maxRedirects: 5,
      maxContentLength: 50 * 1024 * 1024,
      validateStatus: (s) => s >= 200 && s < 400
    });
    res.set("Content-Type", upstream.headers["content-type"] || "image/jpeg");
    if (upstream.headers["content-length"]) {
      res.set("Content-Length", upstream.headers["content-length"]);
    }
    res.set("Cache-Control", "public, max-age=60");
    upstream.data.pipe(res);
  } catch (error) {
    if (!res.headersSent) {
      const status = error.response?.status || 502;
      res.status(status).set("Content-Type", "text/plain").send(`Upstream error: ${error.message}.`);
    }
  }
});

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of availabilityCache) {
    if (now - v.timestamp > FEED_AVAILABILITY_TTL_MS * 4) {
      availabilityCache.delete(k);
    }
  }
}, 10 * 60 * 1000);

const warmRegistry = async () => {
  try {
    await getRegistry(false);
  } catch (error) {
  }
};

warmRegistry();
setInterval(() => {
  if (registryCache.data && Date.now() - registryCache.timestamp >= REGISTRY_TTL_MS) {
    warmRegistry();
  }
}, 60 * 1000);

module.exports = router;