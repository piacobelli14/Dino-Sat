const { PermanentError, HttpStatusError, parseAnyDate } = require("../../../engine");

const SETTINGS = {
  domain: "earth-conditions",

  aggregator: {
    module: "../../../../routes/sat/monitors/earthconditions.js",
    provider: "DinoSat Earth Conditions",
    intervalSeconds: 600,
    locationPrecision: 1,
    sources: [{ sourceKey: "earth-locations", name: "Earth Conditions Locations", config: {} }]
  },

  usgs: {
    recent: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson",
    query: "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime={from}&endtime={to}&minmagnitude=2.5&orderby=time-asc&limit=20000",
    provider: "USGS Earthquake Hazards Program",
    hosts: { "earthquake.usgs.gov": 5000 },
    intervalSeconds: 900,
    historyDaysPerRun: 30,
    sources: [{ sourceKey: "usgs-earthquakes", name: "USGS Earthquakes", config: {} }]
  },

  gdacs: {
    events: "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=EQ;TC;FL;VO;WF;DR&fromdate={from}&todate={to}&alertlevel=Green;Orange;Red",
    provider: "Global Disaster Alert and Coordination System, GDACS",
    lookbackDays: 7,
    hosts: { "www.gdacs.org": 10000 },
    intervalSeconds: 3600,
    types: { EQ: "Earthquake", TC: "Tropical Cyclone", FL: "Flood", VO: "Volcano", WF: "Wildfire", DR: "Drought" },
    sources: [{ sourceKey: "gdacs-events", name: "GDACS Disaster Events", config: {} }]
  },

  nhc: {
    storms: "https://www.nhc.noaa.gov/CurrentStorms.json",
    provider: "NOAA National Hurricane Center",
    hosts: { "www.nhc.noaa.gov": 10000 },
    intervalSeconds: 1800,
    sources: [{ sourceKey: "nhc-storms", name: "NHC Active Storms", config: {} }]
  },

  userAgent: `DinoSat-Harvester/1.0 (+contact: ${process.env.WEATHER_API_USER_AGENT || process.env.ASTEROID_CONTACT_EMAIL || "set-WEATHER_API_USER_AGENT-env-var"})`,
  breakerHours: 3,

  frontier: {
    seeds: ["https://www.gdacs.org/feed_reference.aspx", "https://earthquake.usgs.gov/earthquakes/feed/v1.0/", "https://www.nhc.noaa.gov/data/"],
    allow: ["gdacs.org", "usgs.gov", "noaa.gov"],
    deny: ["gdacsapi", "fdsnws", "/earthquakes/feed/v1\\.0/summary/", "/(about|news|contact|privacy|search)(/|\\.|$)"],
    htmlFollow: "/(data|feed|feeds|gis|products|archive)(/|$)",
    leadIgnoreHosts: ["twitter.com", "x.com", "facebook.com", "youtube.com", "linkedin.com", "wikipedia.org"],
    maxDepth: 3,
    maxNodes: 1000,
    dateWindow: 3,
    indexDays: 30,
    minRevisitSeconds: 604800,
    maxRevisitSeconds: 2592000
  }
};

const fill = (template, values) => template.replace(/\{(\w+)\}/g, (match, key) => (values[key] === undefined ? match : String(values[key])));

const yieldLoop = () => new Promise((resolve) => setImmediate(resolve));

const toNumber = (value) => {
  const number = Number(value);
  return value === null || value === undefined || value === "" || !Number.isFinite(number) ? null : number;
};

const slugOf = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const headers = { "User-Agent": SETTINGS.userAgent };

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

const withBreaker = (name, handler) => async (job, context) => {
  const key = `earth:breaker:${name}`;
  const breaker = await context.cursors.get(key);
  if (breaker && breaker.until && new Date(breaker.until) > new Date()) {
    return { summary: { skipped: `Requests to ${name} are paused until ${breaker.until} after an error response.` }, requeue: Math.max(600, Math.round((new Date(breaker.until) - Date.now()) / 1000)) };
  }
  try {
    return await handler(job, context);
  } catch (error) {
    if (error instanceof PermanentError) throw error;
    const until = new Date(Date.now() + SETTINGS.breakerHours * 3600000).toISOString();
    await context.cursors.set(key, { until, reason: error.message });
    throw new PermanentError(`Requests to ${name} are paused until ${until} because ${error.message.charAt(0).toLowerCase()}${error.message.slice(1)}`);
  }
};

const locations = (() => {
  const S = SETTINGS.aggregator;

  const snapshot = async (job, context) => {
    let aggregator;
    try {
      aggregator = require(S.module);
    } catch (error) {
      throw new PermanentError(`The Earth Conditions aggregator could not be loaded from ${S.module}.`);
    }
    if (typeof aggregator.evaluationSnapshots !== "function") throw new PermanentError("The Earth Conditions aggregator does not expose evaluationSnapshots, so deploy the updated routes/sat/monitors/earthconditions.js.");
    const cursor = (await context.cursors.get("earth:locations")) || { since: 0 };
    const snapshots = aggregator.evaluationSnapshots(cursor.since || 0);
    let since = cursor.since || 0;
    const candidates = [];
    for (const item of snapshots) {
      since = Math.max(since, item.at);
      const lat = Number(item.lat).toFixed(S.locationPrecision);
      const lon = Number(item.lon).toFixed(S.locationPrecision);
      candidates.push({
        product: {
          productKey: `location-${slugOf(`${lat}_${lon}`)}`,
          name: `Conditions At ${lat}, ${lon}`,
          category: "Location Conditions",
          kind: "conditions",
          mode: "index",
          metadata: { provider: S.provider, lat: Number(lat), lon: Number(lon) }
        },
        frame: {
          observedAt: new Date(item.at),
          originUrl: null,
          mimeType: "application/json",
          metadata: { status: item.status, riskScore: toNumber(item.riskScore), confidence: toNumber(item.confidence), dataAvailability: toNumber(item.dataAvailability), ...item.points }
        }
      });
    }
    const summary = await ingestInBatches(context, candidates);
    await context.cursors.set("earth:locations", { since, updatedAt: new Date().toISOString() });
    return { summary: { ...summary, snapshots: snapshots.length }, requeue: S.intervalSeconds };
  };

  return {
    key: "earthlocations",
    domain: SETTINGS.domain,
    hosts: {},
    sources: S.sources,
    schedules: (source) => [{ scheduleKey: `${source.sourceKey}:snapshot`, jobType: "earthlocations:snapshot", intervalSeconds: S.intervalSeconds }],
    startupJobs: () => [{ jobType: "earthlocations:snapshot", payload: {} }],
    handlers: { snapshot }
  };
})();

const quakeCandidate = (feature) => {
  const props = feature && feature.properties ? feature.properties : null;
  const coords = feature && feature.geometry && Array.isArray(feature.geometry.coordinates) ? feature.geometry.coordinates : [];
  if (!props || !Number.isFinite(Number(props.time))) return null;
  return {
    product: {
      productKey: "usgs-earthquakes",
      name: "USGS Earthquakes M2.5+",
      category: "Earthquakes",
      kind: "events",
      mode: "index",
      metadata: { provider: SETTINGS.usgs.provider }
    },
    frame: {
      observedAt: new Date(Number(props.time)),
      originUrl: props.url || null,
      mimeType: "application/json",
      metadata: {
        eventId: feature.id || null,
        magnitude: toNumber(props.mag),
        magnitudeType: props.magType || null,
        place: props.place || null,
        latitude: toNumber(coords[1]),
        longitude: toNumber(coords[0]),
        depthKm: toNumber(coords[2]),
        significance: toNumber(props.sig),
        tsunami: Number(props.tsunami) === 1,
        alert: props.alert || null,
        felt: toNumber(props.felt),
        status: props.status || null
      }
    }
  };
};

const usgs = (() => {
  const S = SETTINGS.usgs;

  const recent = async (job, context) => {
    const { data } = await context.http.json(S.recent, { headers });
    const features = data && Array.isArray(data.features) ? data.features : [];
    const summary = await ingestInBatches(context, features.map(quakeCandidate).filter(Boolean));
    return { summary: { ...summary, events: features.length }, requeue: S.intervalSeconds };
  };

  const history = async (job, context) => {
    const from = new Date(job.payload.from);
    const to = new Date(job.payload.to);
    const start = new Date(Math.max(from.getTime(), to.getTime() - S.historyDaysPerRun * 86400000));
    const { data } = await context.http.json(fill(S.query, { from: start.toISOString(), to: to.toISOString() }), { headers, timeoutMs: 60000 });
    const features = data && Array.isArray(data.features) ? data.features : [];
    const summary = await ingestInBatches(context, features.map(quakeCandidate).filter(Boolean));
    const nextTo = start > from ? new Date(start.getTime() - 1000).toISOString() : null;
    return { summary: { ...summary, events: features.length }, ...(nextTo ? { requeue: { dedupeKey: `${job.dedupe_key}:c${Date.now()}`, jobType: job.job_type, sourceKey: job.source_key, priority: 8, payload: { ...job.payload, to: nextTo } } } : {}) };
  };

  return {
    key: "usgs",
    domain: SETTINGS.domain,
    hosts: S.hosts,
    sources: S.sources,
    schedules: (source) => [{ scheduleKey: `${source.sourceKey}:recent`, jobType: "usgs:recent", intervalSeconds: S.intervalSeconds }],
    startupJobs: () => [{ jobType: "usgs:recent", payload: {} }],
    handlers: { recent: withBreaker("USGS", recent), history: withBreaker("USGS", history) },
    helpers: { quakeCandidate }
  };
})();

const gdacs = (() => {
  const S = SETTINGS.gdacs;
  const day = (date) => date.toISOString().slice(0, 10);

  const events = async (job, context) => {
    const to = new Date();
    const from = new Date(to.getTime() - S.lookbackDays * 86400000);
    let data = null;
    try {
      ({ data } = await context.http.json(fill(S.events, { from: day(from), to: day(to) }), { headers }));
    } catch (error) {
      if (error instanceof HttpStatusError && error.status === 404) return { summary: { events: 0 }, requeue: S.intervalSeconds };
      throw error;
    }
    const features = data && Array.isArray(data.features) ? data.features : [];
    const candidates = [];
    for (const feature of features) {
      const props = feature && feature.properties ? feature.properties : null;
      if (!props || !props.eventtype || !props.eventid) continue;
      const observedAt = parseAnyDate(props.datemodified || props.todate || props.fromdate);
      if (!observedAt) continue;
      const coords = feature.geometry && Array.isArray(feature.geometry.coordinates) && typeof feature.geometry.coordinates[0] === "number" ? feature.geometry.coordinates : [];
      const severity = props.severitydata || {};
      candidates.push({
        product: {
          productKey: `gdacs-${slugOf(props.eventtype)}-${slugOf(props.eventid)}`,
          name: props.name || props.eventname || `${S.types[props.eventtype] || props.eventtype} ${props.eventid}`,
          category: S.types[props.eventtype] || "Disaster",
          kind: "events",
          mode: "index",
          metadata: { provider: S.provider, eventType: props.eventtype, eventId: props.eventid, country: props.country || null, fromDate: props.fromdate || null }
        },
        frame: {
          observedAt,
          originUrl: props.url && props.url.report ? props.url.report : null,
          mimeType: "application/json",
          metadata: {
            episodeId: props.episodeid || null,
            alertLevel: props.alertlevel || null,
            alertScore: toNumber(props.alertscore),
            severity: toNumber(severity.severity),
            severityText: severity.severitytext || null,
            severityUnit: severity.severityunit || null,
            latitude: toNumber(coords[1]),
            longitude: toNumber(coords[0]),
            toDate: props.todate || null,
            isCurrent: props.iscurrent === true || props.iscurrent === "true"
          }
        }
      });
    }
    const summary = await ingestInBatches(context, candidates);
    return { summary: { ...summary, events: features.length }, requeue: S.intervalSeconds };
  };

  return {
    key: "gdacs",
    domain: SETTINGS.domain,
    hosts: S.hosts,
    sources: S.sources,
    schedules: (source) => [{ scheduleKey: `${source.sourceKey}:events`, jobType: "gdacs:events", intervalSeconds: S.intervalSeconds }],
    startupJobs: () => [{ jobType: "gdacs:events", payload: {} }],
    handlers: { events: withBreaker("GDACS", events) }
  };
})();

const nhc = (() => {
  const S = SETTINGS.nhc;

  const storms = async (job, context) => {
    const { data } = await context.http.json(S.storms, { headers });
    const active = data && Array.isArray(data.activeStorms) ? data.activeStorms : [];
    const candidates = [];
    for (const storm of active) {
      const observedAt = parseAnyDate(storm.lastUpdate);
      if (!storm.id || !observedAt) continue;
      candidates.push({
        product: {
          productKey: `nhc-${slugOf(storm.id)}`,
          name: storm.name ? `${storm.name} (${String(storm.id).toUpperCase()})` : String(storm.id).toUpperCase(),
          category: "Tropical Cyclone",
          kind: "track",
          mode: "index",
          metadata: { provider: S.provider, stormId: storm.id, binNumber: storm.binNumber || null }
        },
        frame: {
          observedAt,
          originUrl: storm.publicAdvisory && storm.publicAdvisory.url ? storm.publicAdvisory.url : null,
          mimeType: "application/json",
          metadata: {
            classification: storm.classification || null,
            intensityKt: toNumber(storm.intensity),
            pressureMb: toNumber(storm.pressure),
            latitude: toNumber(storm.latitudeNumeric),
            longitude: toNumber(storm.longitudeNumeric),
            movementDirection: toNumber(storm.movementDir),
            movementSpeedMph: toNumber(storm.movementSpeed)
          }
        }
      });
    }
    const summary = await ingestInBatches(context, candidates);
    return { summary: { ...summary, storms: active.length }, requeue: S.intervalSeconds };
  };

  return {
    key: "nhc",
    domain: SETTINGS.domain,
    hosts: S.hosts,
    sources: S.sources,
    schedules: (source) => [{ scheduleKey: `${source.sourceKey}:storms`, jobType: "nhc:storms", intervalSeconds: S.intervalSeconds }],
    startupJobs: () => [{ jobType: "nhc:storms", payload: {} }],
    handlers: { storms: withBreaker("NHC", storms) }
  };
})();

module.exports = {
  domain: SETTINGS.domain,
  adapters: [locations, usgs, gdacs, nhc],
  frontier: SETTINGS.frontier
};