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
    aircraft: 5000,
    satellites: 600,
    asteroids: 500,
    comets: 400,
    categories: 8
  },
  retrySeconds: 30,
  waitSeconds: 8,
  warmOnStart: true,
  warmDelaySeconds: 15,
  flightSnapshotRoute: "/flights/snapshot",
  aircraftSourceFields: ["lat", "lon"],
  weatherRoutes: {
    radar: { path: "/weather/radar", query: { product: "composite" } },
    alerts: { path: "/weather/alerts", query: {} },
    storms: { path: "/weather/storms", query: {} },
    reports: { path: "/weather/reports", query: {} },
    tropical: { path: "/weather/tropical", query: {} }
  },
  weatherMapEvents: ["Tornado Warning", "Severe Thunderstorm Warning", "Flash Flood Warning", "Extreme Wind Warning", "Snow Squall Warning", "Special Marine Warning", "Dust Storm Warning"]
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

const callRoute = (routerModule, path, query = {}) => new Promise((resolve, reject) => {
  const layer = (routerModule.stack || []).find((entry) => entry.route && entry.route.path === path && entry.route.methods && entry.route.methods.get);
  if (!layer || !layer.route.stack.length) {
    reject(new Error(`The route ${path} was not found.`));
    return;
  }
  const req = { method: "GET", url: path, originalUrl: path, query, params: {}, headers: {} };
  const res = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    type() { return this; },
    set() { return this; },
    json(body) { resolve({ status: this.statusCode, body }); return this; },
    send(body) {
      try {
        resolve({ status: this.statusCode, body: typeof body === "string" ? JSON.parse(body) : body });
      } catch (error) {
        reject(error);
      }
      return this;
    }
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

const builders = {
  flights: async () => {
    const snapshot = await callRoute(loadModule("flights"), SOURCES.flightSnapshotRoute);
    if (snapshot.status !== 200 || !snapshot.body || !Array.isArray(snapshot.body.rows) || !Array.isArray(snapshot.body.fields)) throw new Error((snapshot.body && snapshot.body.message) || "The flight snapshot returned no aircraft.");
    const columns = SOURCES.aircraftSourceFields.map((field) => snapshot.body.fields.indexOf(field));
    const located = snapshot.body.rows.filter((row) => Number.isFinite(row[columns[0]]) && Number.isFinite(row[columns[1]]));
    if (!located.length) throw new Error("The flight sweep has not reported any aircraft yet.");
    const stats = snapshot.body.stats || {};
    return {
      count: stats.total,
      stats: {
        total: stats.total,
        airborne: stats.airborne,
        ground: stats.ground,
        military: stats.military,
        emergencies: stats.emergencies
      },
      fields: snapshot.body.fields,
      rows: sample(located, SOURCES.limits.aircraft)
    };
  },
  weather: async () => {
    const weather = loadModule("weather");
    const census = await weather.weatherCensus();
    const layers = {};
    for (const [key, route] of Object.entries(SOURCES.weatherRoutes)) {
      try {
        const result = await callRoute(weather, route.path, route.query);
        layers[key] = result.status === 200 && result.body && result.body.success ? result.body : null;
      } catch (error) {
        layers[key] = null;
      }
    }
    if (layers.alerts && Array.isArray(layers.alerts.alerts)) layers.alerts = { ...layers.alerts, alerts: layers.alerts.alerts.filter((alert) => SOURCES.weatherMapEvents.includes(alert.event)) };
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
      radar: layers.radar,
      alerts: layers.alerts,
      storms: layers.storms,
      reports: layers.reports,
      tropical: layers.tropical
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
    const snapshot = await loadModule("asteroids").catalogSnapshot();
    if (!snapshot.asteroids.length) throw new Error(snapshot.error || "The asteroid catalog is empty right now.");
    const bound = snapshot.asteroids.filter((asteroid) => asteroid.elements && asteroid.elements.a > 0 && asteroid.elements.e < 1);
    return {
      count: snapshot.asteroids.length,
      stats: {
        total: snapshot.asteroids.length,
        nearEarth: snapshot.asteroids.filter((asteroid) => asteroid.isNEO).length,
        hazardous: snapshot.asteroids.filter((asteroid) => asteroid.isPHA).length,
        shown: Math.min(bound.length, SOURCES.limits.asteroids)
      },
      categories: tally(snapshot.asteroids, (asteroid) => asteroid.category, SOURCES.limits.categories),
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

const build = (key) => {
  const entry = cache[key];
  if (entry.loading) return entry.loading;
  entry.loading = Promise.resolve().then(() => builders[key]()).then((value) => {
    entry.value = value;
    entry.at = Date.now();
    entry.error = null;
  }).catch((error) => {
    entry.error = errorMessage(error);
    entry.failedAt = Date.now();
  }).finally(() => {
    entry.loading = null;
  });
  return entry.loading;
};

const isFresh = (key) => Boolean(cache[key].value) && Date.now() - cache[key].at < SOURCES.refreshSeconds[key] * 1000;

const isCooling = (key) => Boolean(cache[key].error) && Date.now() - cache[key].failedAt < SOURCES.retrySeconds * 1000;

const refresh = (key) => {
  if (isFresh(key) || isCooling(key)) return null;
  return build(key);
};

const waitFor = (promise, seconds) => new Promise((resolve) => {
  const timer = setTimeout(resolve, seconds * 1000);
  promise.then(() => null, () => null).then(() => {
    clearTimeout(timer);
    resolve();
  });
});

router.get("/landing/summary", (req, res) => {
  try {
    const counts = {};
    const errors = {};
    const pending = [];
    sections.forEach((key) => {
      refresh(key);
      counts[key] = cache[key].value ? cache[key].value.count : null;
      errors[key] = cache[key].value ? null : cache[key].error;
      if (!cache[key].value && cache[key].loading) pending.push(key);
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
    const entry = cache[key];
    const running = refresh(key);
    if (!entry.value && running) await waitFor(running, SOURCES.waitSeconds);
    if (entry.value) return res.json({ success: true, section: key, ...entry.value, stale: !isFresh(key), updatedAt: new Date(entry.at).toISOString() });
    if (entry.loading) return res.json({ success: true, section: key, pending: true });
    res.status(502).json({ success: false, message: entry.error || `The ${SOURCES.labels[key]} demo has no data right now.` });
  } catch (error) {
    res.status(500).json({ success: false, message: `The ${SOURCES.labels[key]} demo could not be built. ${errorMessage(error)}` });
  }
});

if (SOURCES.warmOnStart) {
  const warmTimer = setTimeout(async () => {
    for (const key of sections) await build(key);
  }, SOURCES.warmDelaySeconds * 1000);
  if (warmTimer.unref) warmTimer.unref();
}

module.exports = router;