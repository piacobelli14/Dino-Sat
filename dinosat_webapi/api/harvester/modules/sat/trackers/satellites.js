const { HttpStatusError, PermanentError, parseAnyDate, titleCase } = require("../../../engine");

const SETTINGS = {
  domain: "satellite-tracker",

  celestrak: {
    index: "https://celestrak.org/NORAD/elements/",
    groupElements: "https://celestrak.org/NORAD/elements/gp.php?{query}={value}&FORMAT=json",
    objectElements: "https://celestrak.org/NORAD/elements/gp.php?CATNR={norad}&FORMAT=json",
    groupCatalog: "https://celestrak.org/satcat/records.php?{query}={value}&FORMAT=JSON",
    linkPattern: "gp\\.php\\?(GROUP|SPECIAL)=([A-Za-z0-9_.-]+)",
    primaryGroupPattern: "^active$",
    fallbackGroups: [{ query: "GROUP", value: "active", title: "Active Satellites" }],
    provider: "CelesTrak",
    userAgent: `DinoSat-Research/4.0 (+contact: ${process.env.CELESTRAK_CONTACT_EMAIL || "set-CELESTRAK_CONTACT_EMAIL-env-var"})`,
    hosts: { "celestrak.org": 4000 },
    intervals: { discover: 86400, primaryGroup: 7200, group: 43200, catalog: 86400 },
    enabledWithSpacetrack: false,
    breakerHours: 12,
    ingestBatch: 800,
    sources: [{ sourceKey: "celestrak-gp", name: "CelesTrak GP Elements", config: {} }]
  },

  spacetrack: {
    base: "https://www.space-track.org",
    login: "https://www.space-track.org/ajaxauth/login",
    history: "https://www.space-track.org/basicspacedata/query/class/gp_history/NORAD_CAT_ID/{norad}/EPOCH/{from}--{to}/orderby/EPOCH%20asc/format/json",
    catalog: "https://www.space-track.org/basicspacedata/query/class/gp/decay_date/null-val/epoch/%3Enow-10/orderby/NORAD_CAT_ID%20asc/limit/{limit},{offset}/format/json",
    pageSize: 5000,
    maxPages: 40,
    catalogIntervalSeconds: 6 * 3600,
    minCatalogGapSeconds: 3600,
    sources: [{ sourceKey: "spacetrack-gp", name: "Space-Track GP Catalog", config: {} }],
    user: process.env.SPACETRACK_USER || "",
    password: process.env.SPACETRACK_PASS || "",
    provider: "Space-Track",
    hosts: { "www.space-track.org": 2500 },
    daysPerRun: 180,
    sessionMinutes: 90
  },

  aggregator: {
    module: "../../../../routes/sat/trackers/satellites.js",
    provider: "DinoSat Tracker Catalog",
    intervalSeconds: 1800,
    sources: [{ sourceKey: "tracker-catalog", name: "Tracker Catalog", config: {} }]
  },

  orbit: { earthRadiusKm: 6378.137, earthGm: 398600.4418 },

  categoryRules: [
    [/\bdeb\b|debris|\br\/b\b|rocket body|\bobject [a-z]+\b/i, "Debris"],
    [/starlink/i, "Starlink"],
    [/oneweb/i, "OneWeb"],
    [/kuiper/i, "Kuiper"],
    [/qianfan|guowang|hulianwang/i, "Chinese Megaconstellation"],
    [/\biss\b|zarya|tiangong|tianhe|css \(/i, "Space Station"],
    [/gps|navstar|glonass|galileo|beidou|irnss|qzs/i, "Navigation"],
    [/goes|noaa|metop|meteosat|himawari|fengyun|dmsp|meteor|gk-?2a/i, "Weather"],
    [/sentinel|landsat|worldview|pleiades|spot |flock|dove|skysat|iceye|capella|radarsat/i, "Earth Observation"],
    [/usa \d|nrol|cosmos|kosmos|yaogan/i, "Military"],
    [/iridium|intelsat|ses-|eutelsat|telesat|inmarsat|viasat|echostar|orbcomm|globalstar|tdrs/i, "Communication"],
    [/hubble|chandra|fermi|swift|tess|nustar|xmm|integral|jwst/i, "Scientific"],
    [/cubesat|lemur|\bcube\b/i, "CubeSat"],
    [/oscar|amsat|\bao-\d/i, "Amateur"]
  ],

  orbitRegimes: [
    [(orbit) => orbit.apogeeKm > 100000, "Deep Space"],
    [(orbit) => orbit.eccentricity > 0.25, "HEO"],
    [(orbit) => orbit.perigeeKm > 34000 && orbit.apogeeKm < 37000, "GEO"],
    [(orbit) => orbit.perigeeKm > 2000, "MEO"],
    [() => true, "LEO"]
  ],

  frontier: {
    seeds: [
      "https://planet4589.org/space/gcat/index.html",
      "https://db.satnogs.org/"
    ],
    allow: ["planet4589.org", "satnogs.org", "nasa.gov", "esa.int"],
    deny: ["/NORAD/elements/gp\\.php", "/NORAD/elements/table", "/satcat/records\\.php", "/(about|news|contact|login|account|privacy|donate)(/|\\.|$)"],
    htmlFollow: "/(data|elements|space|gcat|tsv|cat|catalog|satcat|spacedata|ephemerides|documentation)(/|$)",
    leadIgnoreHosts: ["twitter.com", "x.com", "facebook.com", "bsky.app", "youtube.com", "linkedin.com", "gofundme.com", "wikipedia.org"],
    maxDepth: 4,
    maxNodes: 2000,
    dateWindow: 3,
    indexDays: 30,
    minRevisitSeconds: 86400,
    maxRevisitSeconds: 604800
  }
};

const fill = (template, values) => template.replace(/\{(\w+)\}/g, (match, key) => (values[key] === undefined ? match : String(values[key])));

const round = (value, digits) => (Number.isFinite(value) ? Number(value.toFixed(digits)) : null);

const yieldLoop = () => new Promise((resolve) => setImmediate(resolve));

const parseEpoch = (value) => {
  if (!value) return null;
  const text = String(value).trim();
  return parseAnyDate(/[zZ]|[+-]\d{2}:?\d{2}$/.test(text) ? text : `${text}Z`);
};

const orbitOf = (record) => {
  const meanMotion = Number(record.MEAN_MOTION);
  const eccentricity = Number(record.ECCENTRICITY);
  if (!Number.isFinite(meanMotion) || meanMotion <= 0 || !Number.isFinite(eccentricity)) return null;
  const { earthGm, earthRadiusKm } = SETTINGS.orbit;
  const semiMajorAxisKm = Math.cbrt(earthGm / Math.pow((meanMotion * 2 * Math.PI) / 86400, 2));
  return {
    meanMotion,
    eccentricity,
    semiMajorAxisKm,
    perigeeKm: semiMajorAxisKm * (1 - eccentricity) - earthRadiusKm,
    apogeeKm: semiMajorAxisKm * (1 + eccentricity) - earthRadiusKm,
    periodMin: 1440 / meanMotion
  };
};

const categoryFor = (name, orbit) => {
  const rule = SETTINGS.categoryRules.find(([pattern]) => pattern.test(String(name || "")));
  if (rule) return rule[1];
  if (!orbit) return "Unclassified";
  return SETTINGS.orbitRegimes.find(([test]) => test(orbit))[1];
};

const productKeyFor = (norad) => `norad-${norad}`;

const elementCandidate = (record, provider, originUrl) => {
  const norad = Number(record.NORAD_CAT_ID);
  const observedAt = parseEpoch(record.EPOCH);
  const orbit = orbitOf(record);
  if (!Number.isFinite(norad) || !observedAt || !orbit) return null;
  const name = String(record.OBJECT_NAME || `NORAD ${norad}`).trim();
  return {
    product: {
      productKey: productKeyFor(norad),
      name,
      category: categoryFor(name, orbit),
      kind: "elements",
      mode: "index",
      metadata: { provider, noradId: norad, objectId: record.OBJECT_ID || null }
    },
    frame: {
      observedAt,
      originUrl,
      mimeType: "application/json",
      metadata: {
        source: provider,
        meanMotion: round(orbit.meanMotion, 8),
        eccentricity: round(orbit.eccentricity, 7),
        inclination: round(Number(record.INCLINATION), 4),
        raan: round(Number(record.RA_OF_ASC_NODE), 4),
        argOfPericenter: round(Number(record.ARG_OF_PERICENTER), 4),
        meanAnomaly: round(Number(record.MEAN_ANOMALY), 4),
        bstar: Number.isFinite(Number(record.BSTAR)) ? Number(record.BSTAR) : null,
        meanMotionDot: Number.isFinite(Number(record.MEAN_MOTION_DOT)) ? Number(record.MEAN_MOTION_DOT) : null,
        meanMotionDdot: Number.isFinite(Number(record.MEAN_MOTION_DDOT)) ? Number(record.MEAN_MOTION_DDOT) : null,
        revAtEpoch: Number.isFinite(Number(record.REV_AT_EPOCH)) ? Number(record.REV_AT_EPOCH) : null,
        elementSetNo: Number.isFinite(Number(record.ELEMENT_SET_NO)) ? Number(record.ELEMENT_SET_NO) : null,
        perigeeKm: round(orbit.perigeeKm, 2),
        apogeeKm: round(orbit.apogeeKm, 2),
        periodMin: round(orbit.periodMin, 4),
        semiMajorAxisKm: round(orbit.semiMajorAxisKm, 3),
        line1: record.TLE_LINE1 || null,
        line2: record.TLE_LINE2 || null
      }
    }
  };
};

const ingestInBatches = async (context, candidates) => {
  const totals = { candidates: 0, products: 0, indexed: 0 };
  for (let i = 0; i < candidates.length; i += SETTINGS.celestrak.ingestBatch) {
    await context.heartbeat();
    const summary = await context.ingest(candidates.slice(i, i + SETTINGS.celestrak.ingestBatch), { maxArchivePerVisit: 0 });
    totals.candidates += summary.candidates;
    totals.products += summary.products;
    totals.indexed += summary.indexed;
    await yieldLoop();
  }
  return totals;
};

const historyWindow = (payload, days) => {
  const from = new Date(payload.from);
  const to = new Date(payload.to);
  const start = new Date(Math.max(from.getTime(), to.getTime() - days * 86400000));
  return { start, end: to, nextTo: start > from ? new Date(start.getTime() - 1000).toISOString() : null };
};

const spacetrackSession = { cookie: null, expiresAt: 0 };

const spacetrackCookie = async (context) => {
  const S = SETTINGS.spacetrack;
  if (spacetrackSession.cookie && Date.now() < spacetrackSession.expiresAt) return spacetrackSession.cookie;
  const result = await context.http.request(S.login, {
    method: "POST",
    body: new URLSearchParams({ identity: S.user, password: S.password }).toString(),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    accept: "application/json, text/plain, */*"
  });
  const headers = result.headers;
  const cookies = headers && typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [headers && headers.get("set-cookie")].filter(Boolean);
  const cookie = cookies.map((value) => String(value).split(";")[0]).filter(Boolean).join("; ");
  const loginText = result.body ? result.body.toString("utf8") : "";
  if (!cookie || /"Login"\s*:\s*"Failed"/i.test(loginText)) throw new PermanentError("Space-Track rejected the login, so check the SPACETRACK_USER and SPACETRACK_PASS values.");
  spacetrackSession.cookie = cookie;
  spacetrackSession.expiresAt = Date.now() + S.sessionMinutes * 60000;
  return cookie;
};

const celestrak = (() => {
  const S = SETTINGS.celestrak;
  const linkPattern = new RegExp(S.linkPattern, "g");
  const primaryPattern = new RegExp(S.primaryGroupPattern, "i");
  const headers = { "User-Agent": S.userAgent };

  const stripTags = (html) => html.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

  const discoverGroups = (html) => {
    const groups = new Map();
    const cells = html.split(/<td\b/i);
    for (const cell of cells) {
      linkPattern.lastIndex = 0;
      let match;
      while ((match = linkPattern.exec(cell))) {
        const query = match[1].toUpperCase();
        const value = match[2];
        const key = `${query}:${value.toLowerCase()}`;
        if (groups.has(key)) continue;
        const anchor = cell.lastIndexOf("<a", match.index);
        const before = stripTags(cell.slice(0, anchor >= 0 ? anchor : match.index).replace(/^[^>]*>/, ""));
        const title = before.split(/gp\.php|table\.php/i)[0].trim().slice(-80) || titleCase(value.replace(/[-_]/g, " "));
        groups.set(key, { query, value, title });
      }
    }
    return Array.from(groups.values());
  };

  const history = async (job, context) => {
    const row = await context.store.getProduct(job.payload.productKey);
    const norad = row && row.metadata ? row.metadata.noradId : null;
    if (!norad) return { summary: { skipped: "The product does not carry a NORAD catalog number." } };
    const coverageKey = `spacetrack:history:${norad}`;
    const coverage = (await context.cursors.get(coverageKey)) || { windows: [] };
    const window = historyWindow(job.payload, SETTINGS.spacetrack.daysPerRun);
    const covered = coverage.windows.some(([from, to]) => from <= window.start.getTime() && to >= window.end.getTime());
    const next = window.nextTo ? { requeue: { dedupeKey: `${job.dedupe_key}:c${Date.now()}`, jobType: job.job_type, sourceKey: job.source_key, priority: 8, payload: { ...job.payload, to: window.nextTo } } } : {};
    if (covered) return { summary: { skipped: "This history window was already downloaded, and Space-Track asks that history is never downloaded twice." }, ...next };
    const url = fill(SETTINGS.spacetrack.history, { norad, from: window.start.toISOString().slice(0, 10), to: window.end.toISOString().slice(0, 10) });
    let records = [];
    try {
      const { data } = await context.http.json(url, { headers: { Cookie: await spacetrackCookie(context) } });
      records = Array.isArray(data) ? data : [];
    } catch (error) {
      if (error instanceof HttpStatusError && error.status === 401) spacetrackSession.cookie = null;
      throw error;
    }
    const candidates = records.map((record) => elementCandidate(record, SETTINGS.spacetrack.provider, fill(S.objectElements, { norad }))).filter(Boolean);
    const summary = await ingestInBatches(context, candidates);
    coverage.windows.push([window.start.getTime(), window.end.getTime()]);
    await context.cursors.set(coverageKey, { windows: coverage.windows.slice(-50) });
    const requeue = window.nextTo ? { requeue: { dedupeKey: `${job.dedupe_key}:c${Date.now()}`, jobType: job.job_type, sourceKey: job.source_key, priority: 8, payload: { ...job.payload, to: window.nextTo } } } : {};
    return { summary: { ...summary, records: records.length }, ...requeue };
  };

  const handlers = {
    discover: async (job, context) => {
      let groups = [];
      let discoveryError = null;
      try {
        const { text } = await context.http.text(S.index, { accept: "text/html", headers });
        groups = discoverGroups(text || "");
      } catch (error) {
        discoveryError = error;
      }
      const known = new Set(groups.map((group) => `${group.query}:${group.value.toLowerCase()}`));
      for (const group of S.fallbackGroups) {
        if (!known.has(`${group.query}:${group.value.toLowerCase()}`)) groups.push(group);
      }
      if (discoveryError || groups.length <= S.fallbackGroups.length) {
        await context.events.warn(discoveryError ? `The CelesTrak index could not be read, so only the fallback groups were queued. ${discoveryError.message}` : "The CelesTrak index listed no element groups, so only the fallback groups were queued.", { sourceKey: context.sourceKey });
      }
      const jobs = [];
      for (const group of groups) {
        jobs.push({ dedupeKey: `celestrak:group:${group.query}:${group.value}`, jobType: "celestrak:group", sourceKey: context.sourceKey, priority: primaryPattern.test(group.value) ? 2 : 4, payload: group });
        jobs.push({ dedupeKey: `celestrak:catalog:${group.query}:${group.value}`, jobType: "celestrak:catalog", sourceKey: context.sourceKey, priority: 6, payload: group });
      }
      await context.queue.enqueue(jobs, { onConflict: "earliest" });
      await context.cursors.set("celestrak:groups", { groups, updatedAt: new Date().toISOString() });
      if (discoveryError) throw discoveryError;
      return { summary: { groups: groups.length } };
    },
    group: async (job, context) => {
      const { query, value } = job.payload;
      const { data } = await context.http.json(fill(S.groupElements, { query, value }), { headers });
      const records = Array.isArray(data) ? data : [];
      const candidates = [];
      for (const record of records) {
        const candidate = elementCandidate(record, S.provider, fill(S.objectElements, { norad: record.NORAD_CAT_ID }));
        if (candidate) candidates.push(candidate);
      }
      const summary = await ingestInBatches(context, candidates);
      return { summary: { ...summary, records: records.length }, requeue: primaryPattern.test(value) ? S.intervals.primaryGroup : S.intervals.group };
    },
    catalog: async (job, context) => {
      const { query, value } = job.payload;
      const { data } = await context.http.json(fill(S.groupCatalog, { query, value }), { headers });
      const records = Array.isArray(data) ? data : [];
      const candidates = [];
      for (const record of records) {
        const norad = Number(record.NORAD_CAT_ID);
        if (!Number.isFinite(norad) || record.DECAY_DATE) continue;
        const orbit = Number.isFinite(Number(record.PERIGEE)) && Number.isFinite(Number(record.APOGEE))
          ? { perigeeKm: Number(record.PERIGEE), apogeeKm: Number(record.APOGEE), eccentricity: 0 }
          : null;
        if (orbit) {
          const a = (orbit.perigeeKm + orbit.apogeeKm) / 2 + SETTINGS.orbit.earthRadiusKm;
          orbit.eccentricity = a > 0 ? (orbit.apogeeKm - orbit.perigeeKm) / (2 * a) : 0;
        }
        const name = String(record.OBJECT_NAME || `NORAD ${norad}`).trim();
        candidates.push({
          product: {
            productKey: productKeyFor(norad),
            name,
            category: categoryFor(name, orbit),
            kind: "elements",
            mode: "index",
            metadata: {
              provider: S.provider,
              noradId: norad,
              objectId: record.OBJECT_ID || null,
              objectType: record.OBJECT_TYPE || null,
              opsStatus: record.OPS_STATUS_CODE || null,
              owner: record.OWNER || null,
              launchDate: record.LAUNCH_DATE || null,
              launchSite: record.LAUNCH_SITE || null,
              rcs: Number.isFinite(Number(record.RCS)) ? Number(record.RCS) : null,
              orbitCenter: record.ORBIT_CENTER || null,
              orbitType: record.ORBIT_TYPE || null
            }
          }
        });
      }
      const summary = await ingestInBatches(context, candidates);
      return { summary: { ...summary, records: records.length }, requeue: S.intervals.catalog };
    }
  };

  const spacetrackConfigured = Boolean(SETTINGS.spacetrack.user && SETTINGS.spacetrack.password);
  const active = !spacetrackConfigured || S.enabledWithSpacetrack;

  const guarded = {};
  for (const [name, handler] of Object.entries(handlers)) {
    guarded[name] = async (job, context) => {
      if (!active) return { summary: { skipped: "CelesTrak is not used while Space-Track is configured." } };
      const breaker = await context.cursors.get("celestrak:breaker");
      if (breaker && breaker.until && new Date(breaker.until) > new Date()) return { summary: { skipped: `CelesTrak requests are paused until ${breaker.until} after an error response.` } };
      try {
        return await handler(job, context);
      } catch (error) {
        const until = new Date(Date.now() + S.breakerHours * 3600000).toISOString();
        await context.cursors.set("celestrak:breaker", { until, reason: error.message });
        throw new PermanentError(`CelesTrak requests are paused until ${until} because ${error.message.charAt(0).toLowerCase()}${error.message.slice(1)}`);
      }
    };
  }

  return {
    key: "celestrak",
    domain: SETTINGS.domain,
    hosts: { ...S.hosts, ...SETTINGS.spacetrack.hosts },
    sources: S.sources,
    schedules: (source) => (active ? [{ scheduleKey: `${source.sourceKey}:discover`, jobType: "celestrak:discover", intervalSeconds: S.intervals.discover }] : []),
    handlers: guarded,
    helpers: { discoverGroups, elementCandidate, categoryFor, orbitOf, history }
  };
})();

const spacetrack = (() => {
  const S = SETTINGS.spacetrack;
  const configured = Boolean(S.user && S.password);

  const catalog = async (job, context) => {
    const last = await context.cursors.get("spacetrack:catalog");
    if (last && last.completedAt && Date.now() - new Date(last.completedAt).getTime() < S.minCatalogGapSeconds * 1000) {
      return { summary: { skipped: "The catalog was downloaded recently." }, requeue: S.catalogIntervalSeconds };
    }
    const totals = { records: 0, candidates: 0, products: 0, indexed: 0, pages: 0 };
    for (let page = 0; page < S.maxPages; page += 1) {
      await context.heartbeat();
      const url = fill(S.catalog, { limit: S.pageSize, offset: page * S.pageSize });
      let data;
      try {
        ({ data } = await context.http.json(url, { headers: { Cookie: await spacetrackCookie(context) } }));
      } catch (error) {
        if (error instanceof HttpStatusError && error.status === 401) spacetrackSession.cookie = null;
        throw error;
      }
      const records = Array.isArray(data) ? data : [];
      totals.pages += 1;
      totals.records += records.length;
      const candidates = [];
      for (const record of records) {
        const candidate = elementCandidate(record, S.provider, fill(SETTINGS.celestrak.objectElements, { norad: record.NORAD_CAT_ID }));
        if (!candidate) continue;
        candidate.product.metadata = {
          ...candidate.product.metadata,
          objectType: record.OBJECT_TYPE || null,
          rcsSize: record.RCS_SIZE || null,
          country: record.COUNTRY_CODE || null,
          launchDate: record.LAUNCH_DATE || null,
          launchSite: record.SITE || null
        };
        candidates.push(candidate);
      }
      const summary = await ingestInBatches(context, candidates);
      totals.candidates += summary.candidates;
      totals.products += summary.products;
      totals.indexed += summary.indexed;
      if (records.length < S.pageSize) break;
    }
    await context.cursors.set("spacetrack:catalog", { completedAt: new Date().toISOString(), records: totals.records });
    return { summary: totals, requeue: S.catalogIntervalSeconds };
  };

  return {
    key: "spacetrack",
    domain: SETTINGS.domain,
    hosts: S.hosts,
    sources: configured ? S.sources : [],
    schedules: (source) => [{ scheduleKey: `${source.sourceKey}:catalog`, jobType: "spacetrack:catalog", intervalSeconds: S.catalogIntervalSeconds }],
    startupJobs: () => [{ jobType: "spacetrack:catalog", payload: {} }],
    handlers: configured ? { catalog, history: celestrak.helpers.history } : {}
  };
})();

const trackerCatalog = (() => {
  const S = SETTINGS.aggregator;

  const recordFrom = (satellite) => {
    const line2 = satellite && satellite.tle ? String(satellite.tle.line2 || "") : "";
    if (line2.length < 63 || !satellite.tleEpoch) return null;
    return {
      NORAD_CAT_ID: satellite.noradId,
      OBJECT_NAME: satellite.name,
      EPOCH: satellite.tleEpoch,
      INCLINATION: parseFloat(line2.substring(8, 16)),
      RA_OF_ASC_NODE: parseFloat(line2.substring(17, 25)),
      ECCENTRICITY: parseFloat(`0.${line2.substring(26, 33).trim()}`),
      ARG_OF_PERICENTER: parseFloat(line2.substring(34, 42)),
      MEAN_ANOMALY: parseFloat(line2.substring(43, 51)),
      MEAN_MOTION: parseFloat(line2.substring(52, 63)),
      REV_AT_EPOCH: parseInt(line2.substring(63, 68), 10),
      BSTAR: satellite.bstar,
      TLE_LINE1: satellite.tle.line1,
      TLE_LINE2: satellite.tle.line2
    };
  };

  const snapshot = async (job, context) => {
    let aggregator;
    try {
      aggregator = require(S.module);
    } catch (error) {
      throw new PermanentError(`The tracker aggregator could not be loaded from ${S.module}.`);
    }
    if (typeof aggregator.catalogSnapshot !== "function") throw new PermanentError("The tracker aggregator does not expose catalogSnapshot, so deploy the updated routes/sat/trackers/satellites.js.");
    await context.heartbeat();
    const current = await aggregator.catalogSnapshot();
    if (!current || !current.timestamp || !current.satellites.length) {
      throw new Error(current && current.error ? `The tracker catalog is empty because ${String(current.error).charAt(0).toLowerCase()}${String(current.error).slice(1).replace(/\.$/, "")}.` : "The tracker catalog is empty.");
    }
    const last = await context.cursors.get("tracker:catalog");
    if (last && last.timestamp === current.timestamp) return { summary: { skipped: "The tracker catalog has not changed." }, requeue: S.intervalSeconds };
    const candidates = [];
    for (const satellite of current.satellites) {
      const record = recordFrom(satellite);
      const candidate = record ? elementCandidate(record, satellite.source || S.provider, null) : null;
      if (!candidate) continue;
      candidate.product.category = satellite.category || candidate.product.category;
      candidate.product.metadata = { ...candidate.product.metadata, provider: satellite.source || S.provider, group: satellite.group || null };
      candidates.push(candidate);
    }
    const summary = await ingestInBatches(context, candidates);
    await context.cursors.set("tracker:catalog", { timestamp: current.timestamp, satellites: current.satellites.length });
    return { summary: { ...summary, satellites: current.satellites.length }, requeue: S.intervalSeconds };
  };

  return {
    key: "tracker",
    domain: SETTINGS.domain,
    hosts: {},
    sources: S.sources,
    schedules: (source) => [{ scheduleKey: `${source.sourceKey}:snapshot`, jobType: "tracker:snapshot", intervalSeconds: S.intervalSeconds }],
    startupJobs: () => [{ jobType: "tracker:snapshot", payload: {} }],
    handlers: { snapshot },
    helpers: { recordFrom }
  };
})();

const drain = (adapter) => ({
  ...adapter,
  schedules: () => [],
  startupJobs: () => [{ jobType: `${adapter.key}:retire`, payload: {} }],
  handlers: Object.fromEntries(Object.keys(adapter.handlers).concat(["history", "catalog", "retire"]).map((name) => [name, async () => ({ summary: { skipped: "This source was retired in favor of the tracker catalog." } })]))
});

module.exports = {
  domain: SETTINGS.domain,
  adapters: [trackerCatalog, drain(celestrak), drain(spacetrack)],
  frontier: SETTINGS.frontier
};