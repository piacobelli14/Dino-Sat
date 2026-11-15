const { PermanentError, parseAnyDate } = require("../../../engine");

const SETTINGS = {
  domain: "asteroid-tracker",

  aggregator: {
    module: "../../../../routes/sat/trackers/asteroids.js",
    provider: "JPL Small-Body Database",
    catalogIntervalSeconds: 3600,
    sentryIntervalSeconds: 3600,
    sources: [{ sourceKey: "asteroid-catalog", name: "Asteroid Tracker Catalog", config: {} }]
  },

  jpl: {
    scout: "https://ssd-api.jpl.nasa.gov/scout.api",
    fireball: "https://ssd-api.jpl.nasa.gov/fireball.api?date-min={dateMin}&sort=date",
    scoutProvider: "CNEOS Scout",
    fireballProvider: "CNEOS Fireball Data",
    fireballStart: "1988-01-01",
    userAgent: `DinoSat-Harvester/1.0 (+contact: ${process.env.ASTEROID_CONTACT_EMAIL || "set-ASTEROID_CONTACT_EMAIL-env-var"})`,
    hosts: { "ssd-api.jpl.nasa.gov": 15000 },
    intervals: { scout: 3600, fireball: 86400 },
    breakerHours: 6,
    sources: [
      { sourceKey: "cneos-scout", name: "CNEOS Scout", config: {} },
      { sourceKey: "cneos-fireball", name: "CNEOS Fireballs", config: {} }
    ]
  },

  frontier: {
    seeds: ["https://cneos.jpl.nasa.gov/", "https://ssd.jpl.nasa.gov/"],
    allow: ["jpl.nasa.gov"],
    deny: ["ssd-api\\.jpl\\.nasa\\.gov", "/(about|news|contact|privacy|images?/)(/|\\.|$)"],
    htmlFollow: "/(data|tools|orbits|sb|ca|sentry|scout|fireballs|dat|ftp)(/|$)",
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

const loadAggregator = () => {
  try {
    return require(SETTINGS.aggregator.module);
  } catch (error) {
    throw new PermanentError(`The asteroid aggregator could not be loaded from ${SETTINGS.aggregator.module}.`);
  }
};

const asteroidCatalog = (() => {
  const S = SETTINGS.aggregator;

  const elementCandidate = (asteroid) => {
    const id = asteroid.spkid || asteroid.designation || asteroid.name;
    const epochJd = asteroid.elements ? toNumber(asteroid.elements.epoch) : null;
    const observedAt = asteroid.epochISO ? parseAnyDate(asteroid.epochISO) : epochJd ? new Date((epochJd - 2440587.5) * 86400000) : null;
    if (!id || !observedAt) return null;
    return {
      product: {
        productKey: `sbdb-${slugOf(id)}`,
        name: asteroid.name || asteroid.designation || String(id),
        category: asteroid.category || "Asteroid",
        kind: "elements",
        mode: "index",
        metadata: {
          provider: asteroid.source || S.provider,
          spkid: asteroid.spkid || null,
          designation: asteroid.designation || null,
          group: asteroid.group || null,
          isNEO: Boolean(asteroid.isNEO),
          isPHA: Boolean(asteroid.isPHA),
          h: toNumber(asteroid.h),
          diameterKm: toNumber(asteroid.diameter),
          albedo: toNumber(asteroid.albedo)
        }
      },
      frame: {
        observedAt,
        originUrl: null,
        mimeType: "application/json",
        metadata: {
          source: asteroid.source || S.provider,
          semiMajorAxisAU: toNumber(asteroid.semiMajorAxisAU),
          eccentricity: toNumber(asteroid.eccentricity),
          inclination: toNumber(asteroid.inclination),
          raan: toNumber(asteroid.raan),
          argOfPerihelion: toNumber(asteroid.argOfPerihelion),
          meanAnomaly: toNumber(asteroid.meanAnomaly),
          perihelionAU: toNumber(asteroid.perihelionAU),
          aphelionAU: toNumber(asteroid.aphelionAU),
          periodYears: toNumber(asteroid.orbitalPeriodYears),
          moidAU: toNumber(asteroid.moidAU),
          jupiterMoidAU: toNumber(asteroid.jupiterMOIDAU),
          h: toNumber(asteroid.h),
          numObs: toNumber(asteroid.numObs),
          arcDays: toNumber(asteroid.observationArcDays),
          lastObs: asteroid.lastObs || null
        }
      }
    };
  };

  const sentryCandidate = (object, observedAt) => ({
    product: {
      productKey: `sentry-${slugOf(object.des)}`,
      name: object.fullname || object.des,
      category: "Impact Risk",
      kind: "risk",
      mode: "index",
      metadata: { provider: "CNEOS Sentry", designation: object.des, diameterKm: toNumber(object.diameter), h: toNumber(object.h) }
    },
    frame: {
      observedAt,
      originUrl: null,
      mimeType: "application/json",
      metadata: {
        source: "CNEOS Sentry",
        impactProbability: toNumber(object.ip),
        palermoCumulative: toNumber(object.psCum),
        palermoMax: toNumber(object.psMax),
        torinoMax: toNumber(object.tsMax),
        impacts: toNumber(object.nImp),
        yearRange: object.range || object.year_range || null,
        vInf: toNumber(object.vInf),
        lastObs: object.lastObs || null
      }
    }
  });

  const catalog = async (job, context) => {
    const aggregator = loadAggregator();
    if (typeof aggregator.catalogSnapshot !== "function") throw new PermanentError("The asteroid aggregator does not expose catalogSnapshot, so deploy the updated routes/sat/trackers/asteroids.js.");
    await context.heartbeat();
    const current = await aggregator.catalogSnapshot();
    if (!current || !current.asteroids.length) throw new Error(current && current.error ? `The asteroid catalog is empty because ${String(current.error).charAt(0).toLowerCase()}${String(current.error).slice(1).replace(/\.$/, "")}.` : "The asteroid catalog is empty.");
    const last = await context.cursors.get("asteroid:catalog");
    if (last && last.timestamp === current.timestamp) return { summary: { skipped: "The asteroid catalog has not changed." }, requeue: S.catalogIntervalSeconds };
    const candidates = current.asteroids.map(elementCandidate).filter(Boolean);
    const summary = await ingestInBatches(context, candidates);
    await context.cursors.set("asteroid:catalog", { timestamp: current.timestamp, asteroids: current.asteroids.length });
    return { summary: { ...summary, asteroids: current.asteroids.length }, requeue: S.catalogIntervalSeconds };
  };

  const sentry = async (job, context) => {
    const aggregator = loadAggregator();
    if (typeof aggregator.sentrySnapshot !== "function") throw new PermanentError("The asteroid aggregator does not expose sentrySnapshot, so deploy the updated routes/sat/trackers/asteroids.js.");
    await context.heartbeat();
    const current = await aggregator.sentrySnapshot();
    const objects = current && Array.isArray(current.objects) ? current.objects : [];
    if (!objects.length) throw new Error("The Sentry list is empty.");
    const previous = (await context.cursors.get("asteroid:sentry")) || { signatures: {} };
    const signatures = {};
    const observedAt = new Date(current.timestamp || Date.now());
    const candidates = [];
    for (const object of objects) {
      if (!object || !object.des) continue;
      const signature = [object.ip, object.psCum, object.psMax, object.tsMax, object.nImp, object.lastObs].join("|");
      signatures[object.des] = signature;
      if (previous.signatures[object.des] !== signature) candidates.push(sentryCandidate(object, observedAt));
    }
    const summary = await ingestInBatches(context, candidates);
    await context.cursors.set("asteroid:sentry", { signatures, updatedAt: observedAt.toISOString() });
    return { summary: { ...summary, objects: objects.length, changed: candidates.length }, requeue: S.sentryIntervalSeconds };
  };

  return {
    key: "asteroids",
    domain: SETTINGS.domain,
    hosts: {},
    sources: S.sources,
    schedules: (source) => [
      { scheduleKey: `${source.sourceKey}:catalog`, jobType: "asteroids:catalog", intervalSeconds: S.catalogIntervalSeconds },
      { scheduleKey: `${source.sourceKey}:sentry`, jobType: "asteroids:sentry", intervalSeconds: S.sentryIntervalSeconds }
    ],
    startupJobs: () => [{ jobType: "asteroids:catalog", payload: {} }, { jobType: "asteroids:sentry", payload: {} }],
    handlers: { catalog, sentry },
    helpers: { elementCandidate, sentryCandidate }
  };
})();

const cneos = (() => {
  const S = SETTINGS.jpl;
  const headers = { "User-Agent": S.userAgent };

  const withBreaker = (handler) => async (job, context) => {
    const breaker = await context.cursors.get("cneos:breaker");
    if (breaker && breaker.until && new Date(breaker.until) > new Date()) {
      return { summary: { skipped: `JPL requests are paused until ${breaker.until} after an error response.` }, requeue: Math.max(600, Math.round((new Date(breaker.until) - Date.now()) / 1000)) };
    }
    try {
      return await handler(job, context);
    } catch (error) {
      const until = new Date(Date.now() + S.breakerHours * 3600000).toISOString();
      await context.cursors.set("cneos:breaker", { until, reason: error.message });
      throw new PermanentError(`JPL requests are paused until ${until} because ${error.message.charAt(0).toLowerCase()}${error.message.slice(1)}`);
    }
  };

  const scout = async (job, context) => {
    const { data } = await context.http.json(S.scout, { headers });
    const rows = data && Array.isArray(data.data) ? data.data : [];
    const candidates = [];
    for (const row of rows) {
      const parsed = row.lastRun ? parseAnyDate(/[zZ]$|[+-]\d{2}:?\d{2}$/.test(String(row.lastRun)) ? String(row.lastRun) : `${String(row.lastRun).trim().replace(" ", "T")}Z`) : null;
      const observedAt = parsed || new Date(Math.floor(Date.now() / 3600000) * 3600000);
      if (!row.objectName) continue;
      candidates.push({
        product: {
          productKey: `scout-${slugOf(row.objectName)}`,
          name: row.objectName,
          category: "NEO Candidate",
          kind: "candidate",
          mode: "index",
          metadata: { provider: S.scoutProvider, objectName: row.objectName }
        },
        frame: {
          observedAt,
          originUrl: null,
          mimeType: "application/json",
          metadata: {
            source: S.scoutProvider,
            neoScore: toNumber(row.neoScore),
            phaScore: toNumber(row.phaScore),
            neo1kmScore: toNumber(row.neo1kmScore),
            geocentricScore: toNumber(row.geocentricScore),
            ieoScore: toNumber(row.ieoScore),
            rating: toNumber(row.rating),
            h: toNumber(row.H),
            vmag: toNumber(row.Vmag),
            nObs: toNumber(row.nObs),
            arcDays: toNumber(row.arc),
            moidAU: toNumber(row.moid),
            caDistLD: toNumber(row.caDist),
            vInf: toNumber(row.vInf),
            ra: row.ra || null,
            dec: row.dec || null
          }
        }
      });
    }
    const summary = await ingestInBatches(context, candidates);
    return { summary: { ...summary, objects: rows.length }, requeue: S.intervals.scout };
  };

  const fireball = async (job, context) => {
    const cursor = (await context.cursors.get("cneos:fireball")) || { latest: S.fireballStart };
    const { data } = await context.http.json(fill(S.fireball, { dateMin: String(cursor.latest).slice(0, 10) }), { headers });
    const fields = data && Array.isArray(data.fields) ? data.fields : [];
    const rows = data && Array.isArray(data.data) ? data.data : [];
    const at = (row, name) => (fields.indexOf(name) >= 0 ? row[fields.indexOf(name)] : null);
    const product = { productKey: "cneos-fireballs", name: "CNEOS Fireball Events", category: "Fireballs", kind: "events", mode: "index", metadata: { provider: S.fireballProvider } };
    let latest = cursor.latest;
    const candidates = [];
    for (const row of rows) {
      const date = at(row, "date");
      const observedAt = parseAnyDate(date ? `${String(date).replace(" ", "T")}Z` : null);
      if (!observedAt) continue;
      if (!latest || observedAt.toISOString() > latest) latest = observedAt.toISOString();
      const lat = toNumber(at(row, "lat"));
      const lon = toNumber(at(row, "lon"));
      candidates.push({
        product,
        frame: {
          observedAt,
          originUrl: null,
          mimeType: "application/json",
          metadata: {
            source: S.fireballProvider,
            latitude: lat === null ? null : at(row, "lat-dir") === "S" ? -lat : lat,
            longitude: lon === null ? null : at(row, "lon-dir") === "W" ? -lon : lon,
            altitudeKm: toNumber(at(row, "alt")),
            radiatedEnergy: toNumber(at(row, "energy")),
            impactEnergyKt: toNumber(at(row, "impact-e")),
            vx: toNumber(at(row, "vx")),
            vy: toNumber(at(row, "vy")),
            vz: toNumber(at(row, "vz"))
          }
        }
      });
    }
    const summary = await ingestInBatches(context, candidates);
    await context.cursors.set("cneos:fireball", { latest, updatedAt: new Date().toISOString() });
    return { summary: { ...summary, records: rows.length }, requeue: S.intervals.fireball };
  };

  return {
    key: "cneos",
    domain: SETTINGS.domain,
    hosts: S.hosts,
    sources: S.sources,
    schedules: (source) => (source.sourceKey === "cneos-scout"
      ? [{ scheduleKey: `${source.sourceKey}:scout`, jobType: "cneos:scout", intervalSeconds: S.intervals.scout }]
      : [{ scheduleKey: `${source.sourceKey}:fireball`, jobType: "cneos:fireball", intervalSeconds: S.intervals.fireball }]),
    startupJobs: (source) => [{ jobType: source.sourceKey === "cneos-scout" ? "cneos:scout" : "cneos:fireball", payload: {} }],
    handlers: { scout: withBreaker(scout), fireball: withBreaker(fireball) }
  };
})();

module.exports = {
  domain: SETTINGS.domain,
  adapters: [asteroidCatalog, cneos],
  frontier: SETTINGS.frontier
};