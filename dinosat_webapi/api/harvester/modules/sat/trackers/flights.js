const { PermanentError } = require("../../../engine");

const SETTINGS = {
  domain: "flight-tracker",

  census: {
    module: "../../../../routes/sat/trackers/flights.js",
    provider: "DinoSat Flight Tracker",
    intervalSeconds: 600,
    minAircraft: 50,
    sources: [{ sourceKey: "flight-census", name: "Global Flight Traffic Census", config: {} }]
  },

  emergencies: {
    provider: "DinoSat Flight Tracker",
    dedupeHours: 6,
    maxRemembered: 500
  },

  frontier: {
    seeds: ["https://opensky-network.org/data/", "https://ourairports.com/data/", "https://adsb.lol/", "https://adsb.fi/"],
    allow: ["opensky-network.org", "ourairports.com", "adsb.lol", "adsb.fi"],
    deny: ["/api/", "/auth/", "/(login|register|account|profile|forum|about|news|contact|privacy|search)(/|\\.|$)"],
    htmlFollow: "/(data|datasets|docs|downloads|archive)(/|$)",
    leadIgnoreHosts: ["twitter.com", "x.com", "facebook.com", "youtube.com", "linkedin.com", "wikipedia.org", "discord.gg", "discord.com"],
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

const compactCounts = (entries) => (entries || []).map((item) => `${item.key}:${item.count}`).join(",");

const census = (() => {
  const S = SETTINGS.census;
  const E = SETTINGS.emergencies;

  const loadAggregator = () => {
    let aggregator;
    try {
      aggregator = require(S.module);
    } catch (error) {
      throw new PermanentError(`The Flight Tracker aggregator could not be loaded from ${S.module}.`);
    }
    if (typeof aggregator.trafficCensus !== "function") throw new PermanentError("The Flight Tracker aggregator does not expose trafficCensus, so deploy the updated routes/sat/trackers/flights.js.");
    return aggregator;
  };

  const trafficCandidate = (stats, observedAt) => ({
    product: {
      productKey: "flight-traffic-global",
      name: "Global Flight Traffic",
      category: "Air Traffic",
      kind: "census",
      mode: "index",
      metadata: { provider: S.provider }
    },
    frame: {
      observedAt,
      originUrl: null,
      mimeType: "application/json",
      metadata: {
        total: toNumber(stats.total),
        airborne: toNumber(stats.airborne),
        ground: toNumber(stats.ground),
        military: toNumber(stats.military),
        emergencies: (stats.emergencies || []).length,
        opensky: toNumber(stats.bySource && stats.bySource.opensky),
        adsbfi: toNumber(stats.bySource && stats.bySource.adsbfi),
        adsblol: toNumber(stats.bySource && stats.bySource.adsblol),
        altitudeLow: toNumber(stats.byAltitude && stats.byAltitude.low),
        altitudeMid: toNumber(stats.byAltitude && stats.byAltitude.mid),
        altitudeHigh: toNumber(stats.byAltitude && stats.byAltitude.high),
        categories: compactCounts(Object.entries(stats.byCategory || {}).map(([key, count]) => ({ key, count }))),
        regions: compactCounts(Object.entries(stats.byRegion || {}).map(([key, count]) => ({ key, count }))),
        topOperators: compactCounts((stats.topOperators || []).slice(0, 10)),
        topTypes: compactCounts((stats.topTypes || []).slice(0, 10))
      }
    }
  });

  const emergencyCandidate = (item) => ({
    product: {
      productKey: "flight-emergencies",
      name: "Aircraft Emergency Squawks",
      category: "Air Traffic",
      kind: "events",
      mode: "index",
      metadata: { provider: E.provider }
    },
    frame: {
      observedAt: new Date((toNumber(item.posAt) || Math.floor(Date.now() / 1000)) * 1000 + offsetMs(item.hex)),
      originUrl: null,
      mimeType: "application/json",
      metadata: {
        hex: item.hex,
        flight: item.flight || null,
        registration: item.reg || null,
        type: item.type || null,
        squawk: item.squawk || null,
        reason: item.reason,
        latitude: toNumber(item.lat),
        longitude: toNumber(item.lon),
        altitudeFt: toNumber(item.alt)
      }
    }
  });

  const outcomeCandidate = (item) => ({
    product: {
      productKey: "flight-emergency-outcomes",
      name: "Aircraft Emergency Squawk Outcomes",
      category: "Air Traffic",
      kind: "events",
      mode: "index",
      metadata: { provider: E.provider }
    },
    frame: {
      observedAt: new Date(toNumber(item.endedAt) * 1000 + offsetMs(item.hex)),
      originUrl: null,
      mimeType: "application/json",
      metadata: {
        hex: item.hex,
        flight: item.flight || null,
        registration: item.reg || null,
        type: item.type || null,
        squawk: item.squawk || null,
        reason: item.reason,
        outcome: item.outcome,
        nextSquawk: item.nextSquawk || null,
        startedAt: new Date(toNumber(item.startedAt) * 1000).toISOString(),
        endedAt: new Date(toNumber(item.endedAt) * 1000).toISOString(),
        durationSeconds: toNumber(item.durationSeconds),
        startLatitude: toNumber(item.startLat),
        startLongitude: toNumber(item.startLon),
        startAltitudeFt: toNumber(item.startAlt),
        endLatitude: toNumber(item.lastLat),
        endLongitude: toNumber(item.lastLon),
        endAltitudeFt: toNumber(item.lastAlt),
        endedOnGround: Boolean(item.lastGround)
      }
    }
  });

  const snapshot = async (job, context) => {
    const aggregator = loadAggregator();
    const stats = await aggregator.trafficCensus();
    await context.heartbeat();
    if (!stats || toNumber(stats.total) === null || stats.total < S.minAircraft) {
      return { summary: { skipped: `The census found ${stats && stats.total ? stats.total : 0} aircraft, which is below the ${S.minAircraft} aircraft minimum for a global frame.` }, requeue: S.intervalSeconds };
    }
    const observedAt = new Date(Math.floor(Date.now() / 1000) * 1000);
    const cursor = (await context.cursors.get("flights:emergencies")) || { seen: {} };
    const seen = cursor.seen || {};
    const cutoff = Date.now() - E.dedupeHours * 3600000;
    for (const [key, at] of Object.entries(seen)) if (at < cutoff) delete seen[key];
    const candidates = [trafficCandidate(stats, observedAt)];
    let fresh = 0;
    for (const item of stats.emergencies || []) {
      const key = `${item.hex}:${item.squawk || item.reason}`;
      if (seen[key]) {
        seen[key] = Date.now();
        continue;
      }
      seen[key] = Date.now();
      candidates.push(emergencyCandidate(item));
      fresh += 1;
    }
    const ended = (stats.squawks && stats.squawks.ended) || [];
    for (const item of ended) {
      if (toNumber(item.endedAt) === null || toNumber(item.startedAt) === null || Date.now() / 1000 - item.endedAt > E.dedupeHours * 3600) continue;
      const key = `outcome:${item.hex}:${item.squawk}:${item.startedAt}`;
      if (seen[key]) continue;
      seen[key] = Date.now();
      candidates.push(outcomeCandidate(item));
    }
    const trimmed = Object.entries(seen).sort((a, b) => b[1] - a[1]).slice(0, E.maxRemembered);
    const summary = await ingestInBatches(context, candidates);
    await context.cursors.set("flights:emergencies", { seen: Object.fromEntries(trimmed), updatedAt: new Date().toISOString() });
    return { summary: { ...summary, aircraft: stats.total, emergencies: fresh }, requeue: S.intervalSeconds };
  };

  return {
    key: "flightcensus",
    domain: SETTINGS.domain,
    hosts: {},
    sources: S.sources,
    schedules: (source) => [{ scheduleKey: `${source.sourceKey}:snapshot`, jobType: "flightcensus:snapshot", intervalSeconds: S.intervalSeconds }],
    startupJobs: () => [{ jobType: "flightcensus:snapshot", payload: {} }],
    handlers: { snapshot }
  };
})();

module.exports = {
  domain: SETTINGS.domain,
  adapters: [census],
  frontier: SETTINGS.frontier
};