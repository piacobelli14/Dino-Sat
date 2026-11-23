const express = require("express");
const router = express.Router();

const SOURCES = {
  modules: {
    flights: "./trackers/flights.js",
    weather: "./trackers/weather.js",
    satellites: "./trackers/satellites.js",
    asteroids: "./trackers/asteroids.js",
    comets: "./trackers/comets.js"
  },
  labels: {
    flights: "Flight Tracker",
    weather: "Weather Tracker",
    satellites: "Satellite Tracker",
    asteroids: "Asteroid Tracker",
    comets: "Comet Tracker"
  },
  refreshSeconds: {
    flights: 15,
    weather: 60,
    satellites: 900,
    asteroids: 1800,
    comets: 1800
  },
  limits: {
    aircraft: 2500,
    warnings: 200,
    events: 8,
    operators: 8,
    satellites: 600,
    asteroids: 500,
    comets: 400,
    sentry: 8,
    categories: 8
  },
  retrySeconds: 30,
  buildTimeoutSeconds: 20,
  flightSnapshotRoute: "/flights/snapshot",
  aircraftFields: ["lat", "lon", "track", "altitude", "ground", "flight"],
  aircraftSourceFields: ["lat", "lon", "trk", "alt", "ground", "flight"]
};

const sections = Object.keys(SOURCES.modules);

const cache = Object.fromEntries(sections.map((key) => [key, { at: 0, value: null, error: null, failedAt: 0, loading: null }]));

const modules = {};

const errorMessage = (error) => (error && error.message ? error.message : String(error));

const loadModule = (key) => {
  if (modules[key]) return modules[key];
  try {
    modules[key] = require(SOURCES.modules[key]);
    return modules[key];
  } catch (error) {
    throw new Error(`The ${SOURCES.labels[key]} routes could not be loaded from ${SOURCES.modules[key]}. ${errorMessage(error)}`);
  }
};

const callRoute = (routerModule, path) => new Promise((resolve, reject) => {
  const layer = (routerModule.stack || []).find((entry) => entry.route && entry.route.path === path && entry.route.methods && entry.route.methods.get);
  if (!layer || !layer.route.stack.length) {
    reject(new Error(`The route ${path} was not found.`));
    return;
  }
  const req = { method: "GET", url: path, originalUrl: path, query: {}, params: {}, headers: {} };
  const res = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { resolve({ status: this.statusCode, body }); return this; }
  };
  try {
    Promise.resolve(layer.route.stack[0].handle(req, res, (error) => reject(error || new Error(`The route ${path} did not respond.`)))).catch(reject);
  } catch (error) {
    reject(error);
  }
});

const sample = (list, limit) => {
  if (list.length <= limit) return list;
  const step = list.length / limit;
  const out = [];
  for (let i = 0; i < limit; i += 1) out.push(list[Math.floor(i * step)]);
  return out;
};

const tally = (list, pick, limit) => {
  const counts = {};
  for (const item of list) {
    const key = pick(item) || "Other";
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([key, count]) => ({ key, count }));
};

const finite = (value) => (Number.isFinite(Number(value)) && value !== null ? Number(value) : null);

const builders = {
  flights: async () => {
    const flights = loadModule("flights");
    const census = await flights.trafficCensus();
    const snapshot = await callRoute(flights, SOURCES.flightSnapshotRoute);
    if (snapshot.status !== 200 || !snapshot.body || !Array.isArray(snapshot.body.rows) || !Array.isArray(snapshot.body.fields)) throw new Error((snapshot.body && snapshot.body.message) || "The flight snapshot returned no aircraft.");
    const columns = SOURCES.aircraftSourceFields.map((field) => snapshot.body.fields.indexOf(field));
    const located = snapshot.body.rows.filter((row) => Number.isFinite(row[columns[0]]) && Number.isFinite(row[columns[1]]));
    return {
      count: census.total,
      stats: {
        total: census.total,
        airborne: census.airborne,
        ground: census.ground,
        military: census.military,
        emergencies: Array.isArray(census.emergencies) ? census.emergencies.length : 0
      },
      operators: (census.topOperators || []).slice(0, SOURCES.limits.operators),
      fields: SOURCES.aircraftFields,
      rows: sample(located, SOURCES.limits.aircraft).map((row) => columns.map((column) => (column === -1 || row[column] === undefined ? null : row[column])))
    };
  },
  weather: async () => {
    const census = await loadModule("weather").weatherCensus();
    const colors = Object.fromEntries((census.alerts.byEvent || []).map((entry) => [entry.event, entry.color]));
    const warnings = (census.warnings || []).filter((warning) => finite(warning.lat) !== null && finite(warning.lon) !== null);
    return {
      count: census.alerts.total,
      stats: {
        total: census.alerts.total,
        warnings: census.alerts.warnings,
        watches: census.alerts.watches,
        advisories: census.alerts.advisories,
        tornadoWarnings: census.alerts.tornadoWarnings,
        severeWarnings: census.alerts.severeWarnings,
        flashFloodWarnings: census.alerts.flashFloodWarnings,
        stormCells: census.storms ? census.storms.total : 0
      },
      events: (census.alerts.byEvent || []).slice(0, SOURCES.limits.events).map((entry) => ({ key: entry.event, count: entry.count, color: entry.color })),
      warnings: warnings.slice(0, SOURCES.limits.warnings).map((warning) => ({
        id: warning.id,
        event: warning.event,
        area: warning.areaDesc ? String(warning.areaDesc).split(";")[0].slice(0, 80) : null,
        expires: warning.expires,
        lat: warning.lat,
        lon: warning.lon,
        color: colors[warning.event] || "#C0C0C0"
      })),
      tropical: (census.tropical || []).filter((storm) => finite(storm.lat) !== null && finite(storm.lon) !== null)
    };
  },
  satellites: async () => {
    const snapshot = await loadModule("satellites").catalogSnapshot();
    if (!snapshot.satellites.length) throw new Error(snapshot.error || "The satellite catalog is empty right now.");
    const usable = snapshot.satellites.filter((satellite) => satellite.tle && satellite.tle.line1 && satellite.tle.line2);
    return {
      count: snapshot.satellites.length,
      stats: {
        total: snapshot.satellites.length,
        lowEarth: snapshot.satellites.filter((satellite) => satellite.altitude !== null && satellite.altitude < 2000).length,
        geostationary: snapshot.satellites.filter((satellite) => satellite.altitude >= 35000 && satellite.altitude <= 36600).length,
        shown: Math.min(usable.length, SOURCES.limits.satellites)
      },
      categories: tally(snapshot.satellites, (satellite) => satellite.category, SOURCES.limits.categories),
      satellites: sample(usable, SOURCES.limits.satellites).map((satellite) => ({
        id: satellite.id,
        name: satellite.name,
        category: satellite.category,
        color: satellite.color,
        altitude: satellite.altitude,
        line1: satellite.tle.line1,
        line2: satellite.tle.line2
      }))
    };
  },
  asteroids: async () => {
    const asteroids = loadModule("asteroids");
    const snapshot = await asteroids.catalogSnapshot();
    if (!snapshot.asteroids.length) throw new Error(snapshot.error || "The asteroid catalog is empty right now.");
    const bound = snapshot.asteroids.filter((asteroid) => asteroid.elements && asteroid.elements.a > 0 && asteroid.elements.e < 1);
    let sentry = [];
    if (typeof asteroids.sentrySnapshot === "function") {
      try {
        sentry = (await asteroids.sentrySnapshot()).objects.slice(0, SOURCES.limits.sentry).map((object) => ({ key: object.fullname || object.designation || object.des || "Unnamed Object", count: object.nImp || 0 }));
      } catch (error) {
        sentry = [];
      }
    }
    return {
      count: snapshot.asteroids.length,
      stats: {
        total: snapshot.asteroids.length,
        nearEarth: snapshot.asteroids.filter((asteroid) => asteroid.isNEO).length,
        hazardous: snapshot.asteroids.filter((asteroid) => asteroid.isPHA).length,
        shown: Math.min(bound.length, SOURCES.limits.asteroids)
      },
      categories: tally(snapshot.asteroids, (asteroid) => asteroid.category, SOURCES.limits.categories),
      sentry,
      objects: sample(bound, SOURCES.limits.asteroids).map((asteroid) => ({
        id: asteroid.id,
        name: asteroid.name,
        category: asteroid.category,
        color: asteroid.color,
        hazardous: Boolean(asteroid.isPHA),
        elements: { a: asteroid.elements.a, e: asteroid.elements.e, i: asteroid.elements.i, om: asteroid.elements.om, w: asteroid.elements.w, ma: asteroid.elements.ma, epoch: asteroid.elements.epoch }
      }))
    };
  },
  comets: async () => {
    const snapshot = await loadModule("comets").catalogSnapshot();
    if (!snapshot.comets.length) throw new Error(snapshot.error || "The comet catalog is empty right now.");
    const bound = snapshot.comets.filter((comet) => comet.elements && comet.elements.a > 0 && comet.elements.e < 1 && (comet.elements.ma !== null || comet.elements.tp !== null));
    return {
      count: snapshot.comets.length,
      stats: {
        total: snapshot.comets.length,
        periodic: bound.length,
        nearSun: snapshot.comets.filter((comet) => comet.elements && comet.elements.q !== null && comet.elements.q < 1.3).length,
        shown: Math.min(bound.length, SOURCES.limits.comets)
      },
      categories: tally(snapshot.comets, (comet) => comet.category, SOURCES.limits.categories),
      objects: sample(bound, SOURCES.limits.comets).map((comet) => ({
        id: comet.id,
        name: comet.name,
        category: comet.category,
        color: comet.color,
        elements: { a: comet.elements.a, e: comet.elements.e, i: comet.elements.i, om: comet.elements.om, w: comet.elements.w, ma: comet.elements.ma, tp: comet.elements.tp, epoch: comet.elements.epoch }
      }))
    };
  }
};

let buildQueue = Promise.resolve();

const loadSection = (key) => {
  const entry = cache[key];
  if (entry.value && Date.now() - entry.at < SOURCES.refreshSeconds[key] * 1000) return Promise.resolve(entry);
  if (entry.error && Date.now() - entry.failedAt < SOURCES.retrySeconds * 1000) return Promise.resolve(entry);
  if (entry.loading) return entry.loading;
  const turn = buildQueue.then(() => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`The ${SOURCES.labels[key]} data took longer than ${SOURCES.buildTimeoutSeconds} seconds to load.`)), SOURCES.buildTimeoutSeconds * 1000);
    builders[key]().then(resolve, reject).finally(() => clearTimeout(timer));
  }));
  buildQueue = turn.then(() => null, () => null);
  entry.loading = turn.then((value) => {
    entry.value = value;
    entry.at = Date.now();
    entry.error = null;
    return entry;
  }).catch((error) => {
    entry.error = errorMessage(error);
    entry.failedAt = Date.now();
    return entry;
  }).finally(() => {
    entry.loading = null;
  });
  return entry.loading;
};

router.get("/landing/summary", (req, res) => {
  try {
    const counts = {};
    const errors = {};
    const pending = [];
    sections.forEach((key) => {
      loadSection(key);
      counts[key] = cache[key].value ? cache[key].value.count : null;
      errors[key] = cache[key].value ? null : cache[key].error;
      if (!cache[key].value && !cache[key].error) pending.push(key);
    });
    res.json({ success: true, counts, errors, pending, updatedAt: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ success: false, message: `The landing summary could not be built. ${errorMessage(error)}` });
  }
});

router.get("/landing/demo/:section", async (req, res) => {
  const key = req.params.section;
  if (!builders[key]) return res.status(404).json({ success: false, message: "That demo does not exist." });
  try {
    const entry = await loadSection(key);
    if (!entry.value) return res.status(502).json({ success: false, message: entry.error || `The ${SOURCES.labels[key]} demo has no data right now.` });
    res.json({ success: true, section: key, ...entry.value, stale: Boolean(entry.error), updatedAt: new Date(entry.at).toISOString() });
  } catch (error) {
    res.status(500).json({ success: false, message: `The ${SOURCES.labels[key]} demo could not be built. ${errorMessage(error)}` });
  }
});

module.exports = router;