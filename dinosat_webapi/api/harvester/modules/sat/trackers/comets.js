const { PermanentError, parseAnyDate } = require("../../../engine");

const SETTINGS = {
  domain: "comet-tracker",

  aggregator: {
    module: "../../../../routes/sat/trackers/comets.js",
    provider: "JPL Small-Body Database",
    catalogIntervalSeconds: 3600,
    sources: [{ sourceKey: "comet-catalog", name: "Comet Tracker Catalog", config: {} }]
  },

  cobs: {
    observations: "https://cobs.si/api/obs_list.api?format=json&exclude_issue=true&from_date={fromDate}&page={page}",
    provider: "COBS Comet Observation Database",
    attribution: "Credit: COBS Comet Observation Database – CC BY-NC-SA 4.0",
    license: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
    userAgent: `DinoSat-Harvester/1.0 (+contact: ${process.env.COMET_CONTACT_EMAIL || process.env.ASTEROID_CONTACT_EMAIL || "set-COMET_CONTACT_EMAIL-env-var"})`,
    hosts: { "cobs.si": 10000 },
    initialBackfillDays: 365,
    maxPagesPerRun: 10,
    intervalSeconds: 86400,
    breakerHours: 12,
    sources: [{ sourceKey: "cobs-observations", name: "COBS Comet Observations", config: {} }]
  },

  frontier: {
    seeds: ["https://cobs.si/comet/", "https://ssd.jpl.nasa.gov/"],
    allow: ["cobs.si", "jpl.nasa.gov"],
    deny: ["ssd-api\\.jpl\\.nasa\\.gov", "cobs\\.si/api/", "/(accounts|about|news|contact|privacy|gallery)(/|\\.|$)"],
    htmlFollow: "/(comet|data|tools|orbits|sb|ephemeris|analysis)(/|$)",
    leadIgnoreHosts: ["twitter.com", "x.com", "facebook.com", "youtube.com", "linkedin.com", "wikipedia.org", "paypal.com"],
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

const normalizeDesignation = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");

const loadAggregator = () => {
  try {
    return require(SETTINGS.aggregator.module);
  } catch (error) {
    throw new PermanentError(`The comet aggregator could not be loaded from ${SETTINGS.aggregator.module}.`);
  }
};

const cometCatalog = (() => {
  const S = SETTINGS.aggregator;

  const elementCandidate = (comet) => {
    const key = normalizeDesignation(comet.designation || comet.spkid || comet.name);
    const epochJd = comet.elements ? toNumber(comet.elements.epoch) : null;
    const observedAt = comet.epochISO ? parseAnyDate(comet.epochISO) : epochJd ? new Date((epochJd - 2440587.5) * 86400000) : null;
    if (!key || !observedAt) return null;
    return {
      product: {
        productKey: `comet-${key}`,
        name: comet.name || comet.designation,
        category: comet.category || "Comet",
        kind: "elements",
        mode: "index",
        metadata: {
          provider: comet.source || S.provider,
          spkid: comet.spkid || null,
          designation: comet.designation || null,
          group: comet.group || null,
          isBound: comet.isBound !== undefined ? Boolean(comet.isBound) : null,
          diameterKm: toNumber(comet.diameter)
        }
      },
      frame: {
        observedAt,
        originUrl: null,
        mimeType: "application/json",
        metadata: {
          source: comet.source || S.provider,
          perihelionAU: toNumber(comet.perihelionAU),
          aphelionAU: toNumber(comet.aphelionAU),
          semiMajorAxisAU: toNumber(comet.semiMajorAxisAU),
          eccentricity: toNumber(comet.eccentricity),
          inclination: toNumber(comet.inclination),
          raan: toNumber(comet.raan),
          argOfPerihelion: toNumber(comet.argOfPerihelion),
          perihelionTime: comet.perihelionTimeISO || null,
          periodYears: toNumber(comet.orbitalPeriodYears),
          moidAU: toNumber(comet.moidAU),
          jupiterMoidAU: toNumber(comet.jupiterMOIDAU),
          m1: toNumber(comet.m1),
          k1: toNumber(comet.k1),
          numObs: toNumber(comet.numObs),
          arcDays: toNumber(comet.observationArcDays),
          lastObs: comet.lastObs || null
        }
      }
    };
  };

  const catalog = async (job, context) => {
    const aggregator = loadAggregator();
    if (typeof aggregator.catalogSnapshot !== "function") throw new PermanentError("The comet aggregator does not expose catalogSnapshot, so deploy the updated routes/sat/trackers/comets.js.");
    await context.heartbeat();
    const current = await aggregator.catalogSnapshot();
    if (!current || !current.comets.length) throw new Error(current && current.error ? `The comet catalog is empty because ${String(current.error).charAt(0).toLowerCase()}${String(current.error).slice(1).replace(/\.$/, "")}.` : "The comet catalog is empty.");
    const last = await context.cursors.get("comet:catalog");
    if (last && last.timestamp === current.timestamp) return { summary: { skipped: "The comet catalog has not changed." }, requeue: S.catalogIntervalSeconds };
    const candidates = current.comets.map(elementCandidate).filter(Boolean);
    const summary = await ingestInBatches(context, candidates);
    await context.cursors.set("comet:catalog", { timestamp: current.timestamp, comets: current.comets.length });
    return { summary: { ...summary, comets: current.comets.length }, requeue: S.catalogIntervalSeconds };
  };

  return {
    key: "comets",
    domain: SETTINGS.domain,
    hosts: {},
    sources: S.sources,
    schedules: (source) => [{ scheduleKey: `${source.sourceKey}:catalog`, jobType: "comets:catalog", intervalSeconds: S.catalogIntervalSeconds }],
    startupJobs: () => [{ jobType: "comets:catalog", payload: {} }],
    handlers: { catalog },
    helpers: { elementCandidate }
  };
})();

const cobs = (() => {
  const S = SETTINGS.cobs;
  const headers = { "User-Agent": S.userAgent };

  const pad = (value) => String(value).padStart(2, "0");
  const cobsDate = (date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;

  const observationCandidate = (row) => {
    const comet = row && row.comet ? row.comet : null;
    const observedAt = row && row.obs_date ? parseAnyDate(`${String(row.obs_date).trim().replace(" ", "T")}Z`) : null;
    const key = comet ? normalizeDesignation(comet.name) : "";
    if (!key || !observedAt) return null;
    const magnitude = toNumber(row.magnitude);
    if (magnitude === null) return null;
    return {
      product: {
        productKey: `cobs-${key}`,
        name: comet.fullname || comet.name,
        category: "Comet Photometry",
        kind: "magnitudes",
        mode: "index",
        metadata: { provider: S.provider, designation: comet.name, mpcName: comet.mpc_name || null, attribution: S.attribution, license: S.license }
      },
      frame: {
        observedAt,
        originUrl: null,
        mimeType: "application/json",
        metadata: {
          source: S.provider,
          magnitude,
          magnitudeError: toNumber(row.magnitude_error),
          observationType: row.type || null,
          method: row.obs_method ? row.obs_method.name || row.obs_method.key || null : null,
          apertureCm: toNumber(row.instrument_aperture),
          comaDiameterArcmin: toNumber(row.coma_diameter),
          condensation: row.coma_dc || null,
          tailLength: toNumber(row.tail_length),
          tailLengthUnit: row.tail_length_unit || null,
          tailPositionAngle: toNumber(row.tail_pa),
          uncertain: row.conditions === ":"
        }
      }
    };
  };

  const observations = async (job, context) => {
    const breaker = await context.cursors.get("cobs:breaker");
    if (breaker && breaker.until && new Date(breaker.until) > new Date()) {
      return { summary: { skipped: `COBS requests are paused until ${breaker.until} after an error response.` }, requeue: Math.max(3600, Math.round((new Date(breaker.until) - Date.now()) / 1000)) };
    }
    const cursor = (await context.cursors.get("cobs:observations")) || { fromDate: cobsDate(new Date(Date.now() - S.initialBackfillDays * 86400000)), page: 1 };
    let page = cursor.page || 1;
    let pages = page;
    let latest = cursor.latest || null;
    const totals = { candidates: 0, products: 0, indexed: 0, observations: 0, pages: 0 };
    try {
      for (let run = 0; run < S.maxPagesPerRun && page <= pages; run += 1) {
        await context.heartbeat();
        const { data } = await context.http.json(fill(S.observations, { fromDate: encodeURIComponent(cursor.fromDate), page }), { headers });
        const rows = data && Array.isArray(data.object) ? data.object : [];
        pages = data && data.info && Number(data.info.pages) ? Number(data.info.pages) : page;
        const candidates = rows.map(observationCandidate).filter(Boolean);
        for (const candidate of candidates) {
          const iso = candidate.frame.observedAt.toISOString();
          if (!latest || iso > latest) latest = iso;
        }
        const summary = await ingestInBatches(context, candidates);
        totals.candidates += summary.candidates;
        totals.products += summary.products;
        totals.indexed += summary.indexed;
        totals.observations += rows.length;
        totals.pages += 1;
        page += 1;
      }
    } catch (error) {
      const until = new Date(Date.now() + S.breakerHours * 3600000).toISOString();
      await context.cursors.set("cobs:breaker", { until, reason: error.message });
      await context.cursors.set("cobs:observations", { fromDate: cursor.fromDate, page, latest });
      throw new PermanentError(`COBS requests are paused until ${until} because ${error.message.charAt(0).toLowerCase()}${error.message.slice(1)}`);
    }
    const finished = page > pages;
    const next = finished
      ? { fromDate: latest ? cobsDate(new Date(latest)) : cursor.fromDate, page: 1, latest }
      : { fromDate: cursor.fromDate, page, latest };
    await context.cursors.set("cobs:observations", next);
    return { summary: { ...totals, finished }, requeue: finished ? S.intervalSeconds : 600 };
  };

  return {
    key: "cobs",
    domain: SETTINGS.domain,
    hosts: S.hosts,
    sources: S.sources,
    schedules: (source) => [{ scheduleKey: `${source.sourceKey}:observations`, jobType: "cobs:observations", intervalSeconds: S.intervalSeconds }],
    startupJobs: () => [{ jobType: "cobs:observations", payload: {} }],
    handlers: { observations },
    helpers: { observationCandidate, normalizeDesignation }
  };
})();

module.exports = {
  domain: SETTINGS.domain,
  adapters: [cometCatalog, cobs],
  frontier: SETTINGS.frontier
};