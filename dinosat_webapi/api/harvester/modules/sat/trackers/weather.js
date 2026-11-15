const { PermanentError } = require("../../../engine");

const SETTINGS = {
  domain: "weather-tracker",

  census: {
    module: "../../../../routes/sat/trackers/weather.js",
    provider: "DinoSat Weather Tracker",
    intervalSeconds: 600,
    sources: [{ sourceKey: "weather-census", name: "National Severe Weather Census", config: {} }]
  },

  warnings: {
    provider: "DinoSat Weather Tracker",
    dedupeHours: 48,
    maxRemembered: 3000
  },

  frontier: {
    seeds: ["https://mesonet.agron.iastate.edu/api/", "https://www.spc.noaa.gov/gis/", "https://www.nhc.noaa.gov/gis/", "https://www.weather.gov/documentation/services-web-api"],
    allow: ["mesonet.agron.iastate.edu", "spc.noaa.gov", "nhc.noaa.gov", "weather.gov"],
    deny: ["/auth/", "/(login|register|account|profile|forum|about|news|contact|privacy|search)(/|\\.|$)"],
    htmlFollow: "/(data|datasets|docs|downloads|archive|gis|api)(/|$)",
    leadIgnoreHosts: ["twitter.com", "x.com", "facebook.com", "youtube.com", "linkedin.com", "wikipedia.org", "instagram.com"],
    maxDepth: 3,
    maxNodes: 1000,
    dateWindow: 3,
    indexDays: 30,
    minRevisitSeconds: 604800,
    maxRevisitSeconds: 2592000
  }
};

const yieldLoop = () => new Promise((resolve) => setImmediate(resolve));

const toNumber = (value) => {
  const number = Number(value);
  return value === null || value === undefined || value === "" || !Number.isFinite(number) ? null : number;
};

const offsetMs = (value) => {
  let hash = 0;
  for (const char of String(value)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % 1000;
};

const ingestInBatches = async (context, candidates, batchSize = 800) => {
  const totals = { candidates: 0, products: 0, indexed: 0 };
  for (let i = 0; i < candidates.length; i += batchSize) {
    await context.heartbeat();
    const summary = await context.ingest(candidates.slice(i, i + batchSize), { maxArchivePerVisit: 0 });
    totals.candidates += summary.candidates;
    totals.products += summary.products;
    totals.indexed += summary.indexed;
    await yieldLoop();
  }
  return totals;
};

const compactCounts = (entries, key) => (entries || []).map((item) => `${item[key]}:${item.count}`).join(",");

const census = (() => {
  const S = SETTINGS.census;
  const W = SETTINGS.warnings;

  const loadAggregator = () => {
    let aggregator;
    try {
      aggregator = require(S.module);
    } catch (error) {
      throw new PermanentError(`The Weather Tracker aggregator could not be loaded from ${S.module}.`);
    }
    if (typeof aggregator.weatherCensus !== "function") throw new PermanentError("The Weather Tracker aggregator does not expose weatherCensus, so deploy the updated routes/sat/trackers/weather.js.");
    return aggregator;
  };

  const censusCandidate = (stats, observedAt) => ({
    product: {
      productKey: "weather-census-national",
      name: "National Severe Weather Census",
      category: "Severe Weather",
      kind: "census",
      mode: "index",
      metadata: { provider: S.provider }
    },
    frame: {
      observedAt,
      originUrl: null,
      mimeType: "application/json",
      metadata: {
        alerts: toNumber(stats.alerts.total),
        warnings: toNumber(stats.alerts.warnings),
        watches: toNumber(stats.alerts.watches),
        advisories: toNumber(stats.alerts.advisories),
        tornadoWarnings: toNumber(stats.alerts.tornadoWarnings),
        severeWarnings: toNumber(stats.alerts.severeWarnings),
        flashFloodWarnings: toNumber(stats.alerts.flashFloodWarnings),
        emergencies: toNumber(stats.alerts.emergencies),
        considerable: toNumber(stats.alerts.considerable),
        observedTornadoes: toNumber(stats.alerts.observedTornadoes),
        stormCells: toNumber(stats.storms.total),
        severeCells: toNumber(stats.storms.severe),
        hailCells: toNumber(stats.storms.hail),
        mesocyclones: toNumber(stats.storms.mesocyclones),
        tornadicCells: toNumber(stats.storms.tornadic),
        maxHail: toNumber(stats.storms.maxHail),
        maxDbz: toNumber(stats.storms.maxDbz),
        maxTop: toNumber(stats.storms.maxTop),
        reports: toNumber(stats.reports.total),
        tornadoReports: toNumber(stats.reports.tornadoes),
        hailReports: toNumber(stats.reports.hail),
        windReports: toNumber(stats.reports.wind),
        tropicalCyclones: (stats.tropical || []).length,
        topEvents: compactCounts((stats.alerts.byEvent || []).slice(0, 12), "event")
      }
    }
  });

  const warningCandidate = (item) => ({
    product: {
      productKey: "weather-warning-log",
      name: "Severe Weather Warning Log",
      category: "Severe Weather",
      kind: "events",
      mode: "index",
      metadata: { provider: W.provider }
    },
    frame: {
      observedAt: new Date((Date.parse(item.sent) || Date.now()) + offsetMs(item.id)),
      originUrl: null,
      mimeType: "application/json",
      metadata: {
        alertId: item.id,
        event: item.event,
        headline: item.headline || null,
        severity: item.severity || null,
        sender: item.sender || null,
        areaDesc: item.areaDesc || null,
        sent: item.sent || null,
        expires: item.expires || null,
        maxHail: toNumber(item.maxHail),
        maxWind: item.maxWind || null,
        tornadoDetection: item.tornadoDetection || null,
        threat: item.threat || null,
        latitude: toNumber(item.lat),
        longitude: toNumber(item.lon)
      }
    }
  });

  const snapshot = async (job, context) => {
    const aggregator = loadAggregator();
    const stats = await aggregator.weatherCensus();
    await context.heartbeat();
    const observedAt = new Date(Math.floor(Date.now() / 1000) * 1000);
    const cursor = (await context.cursors.get("weather:warnings")) || { seen: {} };
    const seen = cursor.seen || {};
    const cutoff = Date.now() - W.dedupeHours * 3600000;
    for (const [key, at] of Object.entries(seen)) if (at < cutoff) delete seen[key];
    const candidates = [censusCandidate(stats, observedAt)];
    let fresh = 0;
    for (const item of stats.warnings || []) {
      if (!item.id) continue;
      if (seen[item.id]) {
        seen[item.id] = Date.now();
        continue;
      }
      seen[item.id] = Date.now();
      candidates.push(warningCandidate(item));
      fresh += 1;
    }
    const trimmed = Object.entries(seen).sort((a, b) => b[1] - a[1]).slice(0, W.maxRemembered);
    const summary = await ingestInBatches(context, candidates);
    await context.cursors.set("weather:warnings", { seen: Object.fromEntries(trimmed), updatedAt: new Date().toISOString() });
    return { summary: { ...summary, alerts: stats.alerts.total, warnings: fresh, stormCells: stats.storms.total }, requeue: S.intervalSeconds };
  };

  return {
    key: "weathercensus",
    domain: SETTINGS.domain,
    hosts: {},
    sources: S.sources,
    schedules: (source) => [{ scheduleKey: `${source.sourceKey}:snapshot`, jobType: "weathercensus:snapshot", intervalSeconds: S.intervalSeconds }],
    startupJobs: () => [{ jobType: "weathercensus:snapshot", payload: {} }],
    handlers: { snapshot }
  };
})();

module.exports = {
  domain: SETTINGS.domain,
  adapters: [census],
  frontier: SETTINGS.frontier
};