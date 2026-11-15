const express = require("express");
const axios = require("axios");
const router = express.Router();

const SOURCES = {
  userAgent: process.env.WEATHER_API_USER_AGENT || "DinoSat-Weather-Tracker/1.0",
  nws: {
    name: "National Weather Service",
    alerts: "https://api.weather.gov/alerts/active?status=actual",
    pointAlerts: "https://api.weather.gov/alerts/active?status=actual&point={lat},{lon}",
    zoneBase: "https://api.weather.gov/zones/",
    refreshSeconds: 60,
    pointCacheSeconds: 120,
    maxAreaPoints: 50,
    minIntervalMs: 250,
    zoneRefreshHours: 168,
    zoneRetryMinutes: 30,
    maxZones: 4000,
    maxPendingZones: 6,
    simplifyDegrees: 0.01,
    timeoutMs: 30000,
    rateLimitCooldownSeconds: 30,
    home: "https://www.weather.gov",
    attribution: "National Weather Service",
    terms: "Public domain data from the United States government. Requests must identify the application in the User-Agent header."
  },
  iem: {
    name: "Iowa Environmental Mesonet",
    base: "https://mesonet.agron.iastate.edu",
    radarList: "https://mesonet.agron.iastate.edu/json/radar.py?operation=list&radar={radar}&product={product}&start={start}&end={end}",
    radarSites: "https://mesonet.agron.iastate.edu/json/radar.py?operation=available",
    storms: "https://mesonet.agron.iastate.edu/geojson/nexrad_attr.py",
    reports: "https://mesonet.agron.iastate.edu/geojson/lsr.geojson?hours={hours}",
    archiveTile: "https://mesonet{shard}.agron.iastate.edu/c/tile.py/1.0.0/{layer}/{z}/{x}/{y}.png",
    liveTile: "https://mesonet{shard}.agron.iastate.edu/cache/tile.py/1.0.0/{layer}/{z}/{x}/{y}.png",
    shards: [""],
    frameMinutes: 60,
    maxFrames: 13,
    framesRefreshSeconds: 60,
    stormsRefreshSeconds: 120,
    reportsRefreshSeconds: 300,
    reportHours: 24,
    sitesRefreshHours: 24,
    minIntervalMs: 400,
    timeoutMs: 30000,
    rateLimitCooldownSeconds: 60,
    home: "https://mesonet.agron.iastate.edu",
    attribution: "Iowa Environmental Mesonet",
    terms: "Free public services from Iowa State University. The tile service is requested from the primary host name."
  },
  rainviewer: {
    name: "RainViewer",
    maps: "https://api.rainviewer.com/public/weather-maps.json",
    tile: "{host}{path}/{size}/{z}/{x}/{y}/{color}/{options}.png",
    size: 512,
    color: 2,
    options: "1_1",
    maxZoom: 7,
    maxFrames: 7,
    refreshSeconds: 300,
    minIntervalMs: 1000,
    timeoutMs: 20000,
    rateLimitCooldownSeconds: 120,
    home: "https://www.rainviewer.com",
    attribution: "Weather data by RainViewer",
    terms: "Free for personal and small community use with visible attribution. Tiles stop at zoom 7, only the Universal Blue palette remains, and each viewer is limited to 100 tile requests per minute."
  },
  spc: {
    name: "Storm Prediction Center",
    outlooks: {
      categorical: "https://www.spc.noaa.gov/products/outlook/day1otlk_cat.nolyr.geojson",
      tornado: "https://www.spc.noaa.gov/products/outlook/day1otlk_torn.nolyr.geojson",
      hail: "https://www.spc.noaa.gov/products/outlook/day1otlk_hail.nolyr.geojson",
      wind: "https://www.spc.noaa.gov/products/outlook/day1otlk_wind.nolyr.geojson"
    },
    refreshSeconds: 900,
    minIntervalMs: 500,
    timeoutMs: 30000,
    rateLimitCooldownSeconds: 120,
    home: "https://www.spc.noaa.gov",
    attribution: "NOAA Storm Prediction Center",
    terms: "Public domain data from the United States government."
  },
  nhc: {
    name: "National Hurricane Center",
    current: "https://www.nhc.noaa.gov/CurrentStorms.json",
    mapServer: "https://mapservices.weather.noaa.gov/tropical/rest/services/tropical/NHC_tropical_weather/MapServer",
    layerQuery: "{server}/{id}/query?where=1%3D1&outFields=*&returnGeometry=true&f=geojson",
    layerSuffixes: { cone: "Forecast Cone", track: "Forecast Track", points: "Forecast Points", past: "Past Track" },
    refreshSeconds: 900,
    layerRefreshHours: 24,
    minIntervalMs: 500,
    timeoutMs: 30000,
    rateLimitCooldownSeconds: 120,
    home: "https://www.nhc.noaa.gov",
    attribution: "NOAA National Hurricane Center",
    terms: "Public domain data from the United States government."
  },
  openMeteo: {
    name: "Open-Meteo",
    forecast: "https://api.open-meteo.com/v1/forecast",
    keyEnv: "OPEN_METEO_API_KEY",
    current: "temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure,cloud_cover",
    minutely: "precipitation",
    hourly: "temperature_2m,precipitation,precipitation_probability,weather_code,cape,lifted_index,wind_gusts_10m,visibility",
    forecastHours: 48,
    airQuality: "https://air-quality-api.open-meteo.com/v1/air-quality",
    archive: "https://archive-api.open-meteo.com/v1/archive",
    snapshot: {
      current: "temperature_2m,apparent_temperature,relative_humidity_2m,dew_point_2m,is_day,precipitation,weather_code,cloud_cover,pressure_msl,surface_pressure,visibility,uv_index,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
      minutely: "precipitation",
      hourly: "temperature_2m,apparent_temperature,relative_humidity_2m,dew_point_2m,precipitation_probability,precipitation,snowfall,weather_code,is_day,pressure_msl,visibility,uv_index,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,daylight_duration,uv_index_max,precipitation_sum,snowfall_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant",
      airCurrent: "us_aqi,us_aqi_pm2_5,us_aqi_pm10,us_aqi_ozone,us_aqi_nitrogen_dioxide,us_aqi_sulphur_dioxide,us_aqi_carbon_monoxide,pm2_5,pm10,ozone,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide,alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen",
      airHourly: "us_aqi",
      pastHours: 24,
      forecastHours: 48,
      pastDays: 1,
      forecastDays: 10,
      minutelySteps: 8,
      airForecastHours: 24,
      airCacheMinutes: 30,
      normalsStartYear: 1991,
      normalsEndYear: 2020,
      normalsWindowDays: 7,
      normalsGridDegrees: 0.25,
      normalsCacheHours: 24,
      maxNormals: 100,
      responseWaitMs: 15000,
      twilightDegrees: -6,
      moonHorizonDegrees: 0.133,
      astronomyStepMinutes: 10,
      weatherCodes: { 0: "Clear", 1: "Mostly Clear", 2: "Partly Cloudy", 3: "Overcast", 45: "Fog", 48: "Freezing Fog", 51: "Light Drizzle", 53: "Drizzle", 55: "Heavy Drizzle", 56: "Freezing Drizzle", 57: "Heavy Freezing Drizzle", 61: "Light Rain", 63: "Rain", 65: "Heavy Rain", 66: "Freezing Rain", 67: "Heavy Freezing Rain", 71: "Light Snow", 73: "Snow", 75: "Heavy Snow", 77: "Snow Grains", 80: "Light Showers", 81: "Showers", 82: "Violent Showers", 85: "Snow Showers", 86: "Heavy Snow Showers", 95: "Thunderstorm", 96: "Thunderstorm With Hail", 99: "Severe Thunderstorm With Hail" }
    },
    cacheMinutes: 10,
    maxCache: 200,
    minIntervalMs: 250,
    timeoutMs: 20000,
    rateLimitCooldownSeconds: 120,
    home: "https://open-meteo.com",
    attribution: "Open-Meteo (CC BY 4.0)",
    terms: "Free for non-commercial use with attribution, up to 10,000 requests per day. Setting OPEN_METEO_API_KEY switches to the paid customer endpoint."
  },
  realEarth: {
    name: "SSEC RealEarth",
    tile: "https://realearth.ssec.wisc.edu/tiles/{product}/{z}/{x}/{y}.png",
    maxZoom: 7,
    home: "https://realearth.ssec.wisc.edu",
    attribution: "SSEC RealEarth",
    terms: "Free public tiles from the University of Wisconsin Space Science and Engineering Center. Leaving out the time returns the latest image, and availability is not guaranteed."
  },
  gibs: {
    name: "NASA GIBS",
    tile: "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/{layer}/default/default/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png",
    maxZoom: 6,
    home: "https://www.earthdata.nasa.gov/engage/open-data-services-software/earthdata-developer-portal/gibs-api",
    attribution: "NASA GIBS",
    terms: "Public domain imagery from NASA. The default time returns the latest available image."
  },
  satellite: {
    channels: {
      ch13: { label: "Infrared (Band 13)", global: "globalir" },
      ch02: { label: "Visible (Band 2)", global: "globalvis" },
      ch09: { label: "Water Vapor (Band 9)", global: "globalwv" }
    },
    layers: [
      { key: "west", layer: "goes_west_fulldisk_{channel}", minZoom: 0, maxZoom: 5 },
      { key: "east", layer: "goes_east_fulldisk_{channel}", minZoom: 0, maxZoom: 5 },
      { key: "conus", layer: "goes_east_conus_{channel}", minZoom: 5, maxZoom: 10 }
    ],
    refreshSeconds: 300
  },
  rainfall: {
    periods: {
      p1h: { label: "Past Hour", layer: "q2-n1p", global: "IMERG_Precipitation_Rate_30min" },
      p24h: { label: "Past 24 Hours", layer: "q2-p24h", global: "IMERG_Precipitation_Rate" },
      p48h: { label: "Past 48 Hours", layer: "q2-p48h", global: "IMERG_Precipitation_Rate" },
      p72h: { label: "Past 72 Hours", layer: "q2-p72h", global: "IMERG_Precipitation_Rate" }
    },
    maxZoom: 10,
    refreshSeconds: 300
  },
  radarProducts: {
    composite: { label: "US Composite Reflectivity", radar: "USCOMP", product: "N0Q", legend: "reflectivity", maxZoom: 10, stepMinutes: 5 },
    global: { label: "Global Composite Reflectivity", legend: "universalBlue", stepMinutes: 10 },
    reflectivity: { label: "Single Site Reflectivity", product: "N0B", legend: "reflectivity", maxZoom: 12, stepMinutes: 1 },
    velocity: { label: "Single Site Velocity", product: "N0U", legend: "velocity", maxZoom: 12, stepMinutes: 1 },
    stormRelative: { label: "Single Site Storm Relative Velocity", product: "N0S", legend: "velocity", maxZoom: 12, stepMinutes: 1 },
    echoTops: { label: "Single Site Echo Tops", product: "NET", legend: "echoTops", maxZoom: 12, stepMinutes: 1 }
  },
  warnings: {
    logEvents: ["Tornado Warning", "Severe Thunderstorm Warning", "Flash Flood Warning", "Extreme Wind Warning", "Snow Squall Warning", "Hurricane Warning", "Storm Surge Warning", "Tsunami Warning", "Dust Storm Warning", "Blizzard Warning", "Ice Storm Warning"],
    emergencyThreats: ["CATASTROPHIC"],
    considerableThreats: ["CONSIDERABLE", "DESTRUCTIVE"]
  },
  analysis: {
    name: "Gemini",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.WEATHER_ANALYSIS_MODEL || "gemini-3.5-flash-lite",
    thinkingLevel: process.env.WEATHER_ANALYSIS_THINKING || "low",
    temperature: 0.3,
    maxOutputTokens: 1200,
    timeoutMs: 20000,
    warmConcurrency: 3,
    cacheLimit: 300,
    maxTextChars: 6000,
    snapshotMaxOutputTokens: 3000,
    snapshotCacheMinutes: 30,
    snapshotCacheLimit: 200,
    snapshotInstructions: "You are a senior National Weather Service forecaster writing the local weather briefing for one place, shown beside a detailed dashboard of cards. Use only the data provided and never invent facts, places, numbers, or times. Temperatures are in degrees Fahrenheit, wind in miles per hour, precipitation in inches, visibility in miles, and pressure in hectopascals, and all times are local to the place. Write in plain, calm, direct language for a member of the public. The headline must be one short complete sentence naming the most important weather story. The summary must be 2 to 4 complete sentences covering what it is like now, what changes over the next 24 hours, and anything notable later in the ten-day outlook. The actions list must give 3 to 6 concrete, practical action points in priority order, such as what to wear, when to carry an umbrella, when to avoid outdoor exertion, or the best window for outdoor plans, and must reflect any active alerts first. For every card, the insight must be one complete sentence interpreting that card's data for this place right now, and the action must be one complete sentence with one practical step, or a sentence saying no action is needed. Every string must be a complete sentence that ends with a period.",
    instructions: "You are a senior National Weather Service meteorologist briefing a member of the public about one active alert. Use only the alert data provided and never invent facts, places, numbers, or times. Write in plain, calm, direct language. The summary must be 2 to 4 complete sentences that say what is happening, where, and until when. List the specific threats with their magnitudes when given. List concrete protective actions in priority order, taking the official instructions into account. The timing field must be one complete sentence about when the threat starts, peaks, and ends. The confidence field must be one complete sentence explaining how certain the alert is based on its certainty, urgency, and detection fields. Every list item must be a complete sentence that ends with a period."
  },
  retention: {
    maxAlertsResponse: 3000,
    maxStormsResponse: 2000,
    maxReportsResponse: 5000
  }
};

const HAZARD_COLORS = {
  "Tsunami Warning": "#FD6347",
  "Tornado Warning": "#FF0000",
  "Extreme Wind Warning": "#FF8C00",
  "Severe Thunderstorm Warning": "#FFA500",
  "Flash Flood Warning": "#8B0000",
  "Flash Flood Statement": "#8B0000",
  "Severe Weather Statement": "#00FFFF",
  "Shelter In Place Warning": "#FA8072",
  "Evacuation Immediate": "#7FFF00",
  "Civil Danger Warning": "#FFB6C1",
  "Nuclear Power Plant Warning": "#4B0082",
  "Radiological Hazard Warning": "#4B0082",
  "Hazardous Materials Warning": "#4B0082",
  "Fire Warning": "#A0522D",
  "Civil Emergency Message": "#FFB6C1",
  "Law Enforcement Warning": "#C0C0C0",
  "Storm Surge Warning": "#B524F7",
  "Hurricane Force Wind Warning": "#CD5C5C",
  "Hurricane Warning": "#DC143C",
  "Typhoon Warning": "#DC143C",
  "Special Marine Warning": "#FFA500",
  "Blizzard Warning": "#FF4500",
  "Snow Squall Warning": "#C71585",
  "Ice Storm Warning": "#8B008B",
  "Heavy Freezing Spray Warning": "#00BFFF",
  "Winter Storm Warning": "#FF69B4",
  "Lake Effect Snow Warning": "#008B8B",
  "Dust Storm Warning": "#FFE4C4",
  "Blowing Dust Warning": "#FFE4C4",
  "High Wind Warning": "#DAA520",
  "Tropical Storm Warning": "#B22222",
  "Storm Warning": "#9400D3",
  "Tsunami Advisory": "#D2691E",
  "Tsunami Watch": "#FF00FF",
  "Avalanche Warning": "#1E90FF",
  "Earthquake Warning": "#8B4513",
  "Volcano Warning": "#2F4F4F",
  "Ashfall Warning": "#A9A9A9",
  "Flood Warning": "#00FF00",
  "Coastal Flood Warning": "#228B22",
  "Lakeshore Flood Warning": "#228B22",
  "Ashfall Advisory": "#696969",
  "High Surf Warning": "#228B22",
  "Extreme Heat Warning": "#C71585",
  "Tornado Watch": "#FFFF00",
  "Severe Thunderstorm Watch": "#DB7093",
  "Flash Flood Watch": "#2E8B57",
  "Gale Warning": "#DDA0DD",
  "Flood Statement": "#00FF00",
  "Extreme Cold Warning": "#0000FF",
  "Freeze Warning": "#483D8B",
  "Red Flag Warning": "#FF1493",
  "Storm Surge Watch": "#DB7FF7",
  "Hurricane Watch": "#FF00FF",
  "Hurricane Force Wind Watch": "#9932CC",
  "Typhoon Watch": "#FF00FF",
  "Tropical Storm Watch": "#F08080",
  "Storm Watch": "#FFE4B5",
  "Tropical Cyclone Local Statement": "#FFE4B5",
  "Winter Weather Advisory": "#7B68EE",
  "Avalanche Advisory": "#CD853F",
  "Cold Weather Advisory": "#AFEEEE",
  "Heat Advisory": "#FF7F50",
  "Flood Advisory": "#00FF7F",
  "Coastal Flood Advisory": "#7CFC00",
  "Lakeshore Flood Advisory": "#7CFC00",
  "High Surf Advisory": "#BA55D3",
  "Dense Fog Advisory": "#708090",
  "Dense Smoke Advisory": "#F0E68C",
  "Small Craft Advisory": "#D8BFD8",
  "Brisk Wind Advisory": "#D8BFD8",
  "Hazardous Seas Warning": "#D8BFD8",
  "Dust Advisory": "#BDB76B",
  "Blowing Dust Advisory": "#BDB76B",
  "Lake Wind Advisory": "#D2B48C",
  "Wind Advisory": "#D2B48C",
  "Frost Advisory": "#6495ED",
  "Freezing Fog Advisory": "#008080",
  "Freezing Spray Advisory": "#00BFFF",
  "Low Water Advisory": "#A52A2A",
  "Local Area Emergency": "#C0C0C0",
  "Winter Storm Watch": "#4682B4",
  "Rip Current Statement": "#40E0D0",
  "Beach Hazards Statement": "#40E0D0",
  "Gale Watch": "#FFC0CB",
  "Avalanche Watch": "#F4A460",
  "Hazardous Seas Watch": "#483D8B",
  "Heavy Freezing Spray Watch": "#BC8F8F",
  "Flood Watch": "#2E8B57",
  "Coastal Flood Watch": "#66CDAA",
  "Lakeshore Flood Watch": "#66CDAA",
  "High Wind Watch": "#B8860B",
  "Extreme Heat Watch": "#800000",
  "Extreme Cold Watch": "#5F9EA0",
  "Freeze Watch": "#00FFFF",
  "Fire Weather Watch": "#FFDEAD",
  "Extreme Fire Danger": "#E9967A",
  "911 Telephone Outage": "#C0C0C0",
  "Coastal Flood Statement": "#6B8E23",
  "Lakeshore Flood Statement": "#6B8E23",
  "Special Weather Statement": "#FFE4B5",
  "Marine Weather Statement": "#FFDAB9",
  "Air Quality Alert": "#808080",
  "Air Stagnation Advisory": "#808080",
  "Hazardous Weather Outlook": "#EEE8AA",
  "Hydrologic Outlook": "#90EE90",
  "Short Term Forecast": "#98FB98",
  "Administrative Message": "#C0C0C0",
  "Test": "#F0FFFF",
  "Child Abduction Emergency": "#FFFFFF",
  "Blue Alert": "#FFFFFF"
};

const HAZARD_RANK = Object.fromEntries(Object.keys(HAZARD_COLORS).map((event, index) => [event, index + 1]));

const REPORT_TYPES = {
  T: "Tornado",
  C: "Funnel Cloud",
  W: "Waterspout",
  H: "Hail",
  G: "Wind Gust",
  D: "Wind Damage",
  M: "Marine Wind",
  N: "Non-Thunderstorm Wind",
  O: "Non-Thunderstorm Wind",
  F: "Flash Flood",
  E: "Flood",
  R: "Heavy Rain",
  S: "Snow",
  s: "Sleet",
  Z: "Blizzard",
  "5": "Ice Storm",
  X: "Heavy Snow",
  L: "Lightning",
  4: "Freezing Rain",
  "0": "Avalanche",
  A: "Dust Storm",
  B: "Downburst",
  P: "Debris Flow",
  Q: "Tropical Storm",
  U: "Wildfire"
};

const cache = {
  alerts: { at: 0, list: [], byId: new Map(), error: null, loading: null },
  frames: new Map(),
  sites: { at: 0, list: [], error: null, loading: null },
  storms: { at: 0, list: [], valid: null, error: null, loading: null },
  reports: { at: 0, list: [], error: null, loading: null },
  outlooks: new Map(),
  tropical: { at: 0, storms: [], features: [], error: null, loading: null },
  tropicalLayers: { at: 0, ids: null, loading: null },
  rainviewer: { at: 0, data: null, error: null, loading: null },
  points: new Map(),
  pointAlerts: new Map(),
  snapshots: new Map(),
  airQuality: new Map(),
  normals: new Map()
};

const zones = new Map();
const zoneQueue = new Set();

const sourceStatus = Object.fromEntries(["nws", "iem", "rainviewer", "spc", "nhc", "openMeteo"].map((key) => [key, { key, name: SOURCES[key].name, requests: 0, lastSuccessAt: null, lastError: null, lastCount: 0, cooldownUntil: 0, errorStreak: 0 }]));

const fill = (template, values) => template.replace(/\{(\w+)\}/g, (match, key) => (values[key] === undefined ? match : String(values[key])));

const toNumber = (value) => {
  const number = Number(value);
  return value === null || value === undefined || value === "" || !Number.isFinite(number) ? null : number;
};

const round = (value, digits) => (value === null || value === undefined ? null : Math.round(value * 10 ** digits) / 10 ** digits);

const HTTP_EXPLANATIONS = {
  400: "The source rejected the request as malformed (HTTP 400).",
  401: "The source rejected the credentials (HTTP 401).",
  403: "The source refused access from this server (HTTP 403).",
  404: "The source did not recognize the requested address (HTTP 404).",
  429: "The source is rate limiting this server (HTTP 429).",
  500: "The source had an internal error (HTTP 500).",
  502: "The source's gateway failed (HTTP 502).",
  503: "The source is temporarily unavailable (HTTP 503).",
  504: "The source's gateway timed out (HTTP 504)."
};

const errorMessage = (error) => {
  const status = error && error.response ? error.response.status : null;
  if (status) return HTTP_EXPLANATIONS[status] || `The source answered with HTTP ${status}.`;
  const code = error && error.code ? String(error.code) : "";
  const message = String(error && error.message ? error.message : error);
  if (code === "ECONNABORTED" || code === "ETIMEDOUT" || /timeout/i.test(message)) {
    const match = /(\d+)ms/.exec(message);
    return `The source did not answer within ${match ? Math.round(Number(match[1]) / 1000) : "the allowed"} seconds.`;
  }
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") return "The source's address could not be resolved.";
  if (code === "ECONNREFUSED" || code === "ECONNRESET") return "The source closed the connection.";
  return `The request failed because ${message.replace(/\.$/, "").replace(/^\w/, (c) => c.toLowerCase())}.`;
};

const createHostQueue = (minIntervalMs) => {
  const pending = [];
  let busy = false;
  let lastStart = 0;
  const pump = async () => {
    if (busy || !pending.length) return;
    busy = true;
    const wait = Math.max(0, lastStart + minIntervalMs - Date.now());
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    pending.sort((a, b) => a.priority - b.priority);
    const task = pending.shift();
    lastStart = Date.now();
    try {
      task.resolve(await task.run());
    } catch (error) {
      task.reject(error);
    } finally {
      busy = false;
      pump();
    }
  };
  return {
    schedule: (run, priority = 5) => new Promise((resolve, reject) => {
      pending.push({ run, priority, resolve, reject });
      pump();
    }),
    idle: () => !busy && pending.length === 0,
    size: () => pending.length + (busy ? 1 : 0)
  };
};

const hostQueues = Object.fromEntries(["nws", "iem", "rainviewer", "spc", "nhc", "openMeteo"].map((key) => [key, createHostQueue(SOURCES[key].minIntervalMs)]));

const noteFailure = (key, error) => {
  const status = sourceStatus[key];
  const previous = status.lastError;
  status.lastError = errorMessage(error);
  status.errorStreak += 1;
  const code = error && error.response ? error.response.status : 0;
  let cooldown = Math.min(10 * 60000, 15000 * 2 ** Math.min(5, status.errorStreak - 1));
  if (code === 429) {
    const retryAfter = toNumber(error.response.headers && error.response.headers["retry-after"]);
    cooldown = Math.min(30 * 60000, (retryAfter || SOURCES[key].rateLimitCooldownSeconds) * 1000 * 2 ** Math.min(3, status.errorStreak - 1));
  }
  status.cooldownUntil = Date.now() + cooldown;
  if (previous !== status.lastError) console.log(`[weather] ${status.name} failed and is paused for ${Math.round(cooldown / 1000)} seconds. ${status.lastError}`);
};

const noteSuccess = (key, count) => {
  const status = sourceStatus[key];
  if (status.lastError) console.log(`[weather] ${status.name} recovered.`);
  status.lastSuccessAt = new Date().toISOString();
  status.lastError = null;
  status.lastCount = count;
  status.errorStreak = 0;
};

const fetchJson = (key, url, priority = 5, accept = "application/json") => {
  const status = sourceStatus[key];
  if (status.cooldownUntil > Date.now()) return Promise.reject(new Error(`${status.name} is paused until ${new Date(status.cooldownUntil).toLocaleTimeString("en-US")} after the error "${String(status.lastError || "").replace(/\.$/, "")}"`));
  return hostQueues[key].schedule(async () => {
    status.requests += 1;
    const { data } = await axios.get(url, {
      timeout: SOURCES[key].timeoutMs,
      headers: { "User-Agent": SOURCES.userAgent, Accept: accept },
      validateStatus: (code) => code >= 200 && code < 300
    });
    return typeof data === "string" ? JSON.parse(data) : data;
  }, priority);
};

const refreshing = (entry, refreshSeconds, load) => {
  const fresh = entry.at && Date.now() - entry.at < refreshSeconds * 1000;
  if (!fresh && !entry.loading) {
    entry.loading = load().finally(() => {
      entry.loading = null;
    });
  }
  if (entry.at) return Promise.resolve(entry);
  return entry.loading || Promise.resolve(entry);
};

const perpendicular = (point, start, end) => {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  if (!dx && !dy) return Math.hypot(point[0] - start[0], point[1] - start[1]);
  const t = Math.max(0, Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(point[0] - (start[0] + t * dx), point[1] - (start[1] + t * dy));
};

const simplifyRing = (ring, tolerance) => {
  if (!Array.isArray(ring) || ring.length <= 4) return ring;
  const keep = new Uint8Array(ring.length);
  keep[0] = 1;
  keep[ring.length - 1] = 1;
  const stack = [[0, ring.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    let index = -1;
    let max = 0;
    for (let i = first + 1; i < last; i += 1) {
      const distance = perpendicular(ring[i], ring[first], ring[last]);
      if (distance > max) {
        max = distance;
        index = i;
      }
    }
    if (index > 0 && max > tolerance) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  const out = ring.filter((point, i) => keep[i]).map((point) => [round(point[0], 4), round(point[1], 4)]);
  return out.length >= 4 ? out : ring.map((point) => [round(point[0], 4), round(point[1], 4)]);
};

const polygonsOf = (geometry, tolerance) => {
  if (!geometry) return [];
  if (geometry.type === "Polygon") return [geometry.coordinates.map((ring) => simplifyRing(ring, tolerance))];
  if (geometry.type === "MultiPolygon") return geometry.coordinates.map((polygon) => polygon.map((ring) => simplifyRing(ring, tolerance)));
  if (geometry.type === "GeometryCollection") return (geometry.geometries || []).flatMap((item) => polygonsOf(item, tolerance));
  return [];
};

const boundsOf = (polygons) => {
  let west = 180;
  let east = -180;
  let south = 90;
  let north = -90;
  for (const polygon of polygons) {
    for (const point of polygon[0] || []) {
      if (point[0] < west) west = point[0];
      if (point[0] > east) east = point[0];
      if (point[1] < south) south = point[1];
      if (point[1] > north) north = point[1];
    }
  }
  return west <= east ? [round(west, 3), round(south, 3), round(east, 3), round(north, 3)] : null;
};

const parseBounds = (query) => {
  const bounds = { west: Number(query.west), south: Number(query.south), east: Number(query.east), north: Number(query.north) };
  return Object.values(bounds).every(Number.isFinite) ? bounds : null;
};

const intersects = (box, bounds) => {
  if (!bounds || !box) return true;
  if (box[3] < bounds.south || box[1] > bounds.north) return false;
  if (bounds.east - bounds.west >= 360) return true;
  return !(box[2] < bounds.west || box[0] > bounds.east);
};

const inBounds = (bounds, lat, lon) => {
  if (!bounds) return true;
  if (lat < bounds.south || lat > bounds.north) return false;
  if (bounds.east - bounds.west >= 360) return true;
  return lon >= bounds.west && lon <= bounds.east;
};

const zoneIdOf = (url) => {
  const match = /\/zones\/([a-z]+)\/([A-Z0-9]+)$/i.exec(String(url || ""));
  return match ? `${match[1]}/${match[2]}` : null;
};

const loadZone = (zoneId) => {
  const current = zones.get(zoneId);
  if (current && current.loading) return;
  if (current && current.polygons && Date.now() - current.at < SOURCES.nws.zoneRefreshHours * 3600000) return;
  if (current && !current.polygons && Date.now() - current.at < SOURCES.nws.zoneRetryMinutes * 60000) return;
  if (hostQueues.nws.size() >= SOURCES.nws.maxPendingZones || sourceStatus.nws.cooldownUntil > Date.now()) {
    zoneQueue.add(zoneId);
    return;
  }
  zoneQueue.delete(zoneId);
  zones.set(zoneId, { at: current ? current.at : 0, polygons: current ? current.polygons : null, name: current ? current.name : null, loading: true, used: Date.now() });
  fetchJson("nws", `${SOURCES.nws.zoneBase}${zoneId}`, 6, "application/geo+json")
    .then((data) => {
      const polygons = polygonsOf(data && data.geometry, SOURCES.nws.simplifyDegrees);
      zones.set(zoneId, { at: Date.now(), polygons: polygons.length ? polygons : [], name: data && data.properties ? data.properties.name || null : null, loading: false, used: Date.now() });
      if (zones.size > SOURCES.nws.maxZones) {
        const idle = Array.from(zones.entries()).filter(([, zone]) => !zone.loading).sort((a, b) => a[1].used - b[1].used);
        for (let i = 0; i < idle.length && zones.size > SOURCES.nws.maxZones; i += 1) zones.delete(idle[i][0]);
      }
      cache.alerts.version = (cache.alerts.version || 0) + 1;
    })
    .catch((error) => {
      zones.set(zoneId, { at: Date.now(), polygons: null, name: null, loading: false, used: Date.now() });
      if (error && error.response) noteFailure("nws", error);
    })
    .finally(drainZones);
};

const drainZones = () => {
  for (const zoneId of Array.from(zoneQueue)) {
    if (hostQueues.nws.size() >= SOURCES.nws.maxPendingZones || sourceStatus.nws.cooldownUntil > Date.now()) return;
    zoneQueue.delete(zoneId);
    loadZone(zoneId);
  }
};

const severityRank = (alert) => {
  const rank = HAZARD_RANK[alert.event] || 200;
  const severity = { Extreme: 0, Severe: 1, Moderate: 2, Minor: 3 }[alert.severity];
  return rank + (severity === undefined ? 4 : severity) * 0.01;
};

const threatOf = (parameters) => {
  const tornado = parameters.tornadoDamageThreat ? parameters.tornadoDamageThreat[0] : null;
  const storm = parameters.thunderstormDamageThreat ? parameters.thunderstormDamageThreat[0] : null;
  const flood = parameters.flashFloodDamageThreat ? parameters.flashFloodDamageThreat[0] : null;
  const threats = [tornado, storm, flood].filter(Boolean).map((value) => String(value).toUpperCase());
  if (threats.some((value) => SOURCES.warnings.emergencyThreats.includes(value))) return "emergency";
  if (threats.some((value) => SOURCES.warnings.considerableThreats.includes(value))) return "considerable";
  return null;
};

const firstParam = (parameters, key) => (parameters && Array.isArray(parameters[key]) && parameters[key].length ? parameters[key][0] : null);

const compactAlert = (feature) => {
  const p = feature.properties || {};
  const parameters = p.parameters || {};
  const own = polygonsOf(feature.geometry, 0.001);
  const zoneIds = own.length ? [] : (p.affectedZones || []).map(zoneIdOf).filter(Boolean);
  return {
    id: p.id || feature.id,
    event: p.event || "Unknown Alert",
    headline: p.headline || null,
    nwsHeadline: firstParam(parameters, "NWSheadline"),
    severity: p.severity || null,
    certainty: p.certainty || null,
    urgency: p.urgency || null,
    category: p.category || null,
    response: p.response || null,
    messageType: p.messageType || null,
    status: p.status || null,
    sender: p.senderName || null,
    areaDesc: p.areaDesc || null,
    sent: p.sent || null,
    effective: p.effective || null,
    onset: p.onset || null,
    expires: p.expires || null,
    ends: p.ends || null,
    description: p.description || null,
    instruction: p.instruction || null,
    maxHail: toNumber(firstParam(parameters, "maxHailSize")),
    maxWind: firstParam(parameters, "maxWindGust"),
    tornadoDetection: firstParam(parameters, "tornadoDetection"),
    tornadoThreat: firstParam(parameters, "tornadoDamageThreat"),
    stormThreat: firstParam(parameters, "thunderstormDamageThreat"),
    floodThreat: firstParam(parameters, "flashFloodDamageThreat"),
    floodDetection: firstParam(parameters, "flashFloodDetection"),
    vtec: firstParam(parameters, "VTEC"),
    eventMotion: firstParam(parameters, "eventMotionDescription"),
    threat: threatOf(parameters),
    color: HAZARD_COLORS[p.event] || "#C0C0C0",
    rank: 0,
    ownPolygons: own,
    zoneIds,
    states: Array.from(new Set(((p.geocode && p.geocode.UGC) || []).map((code) => String(code).slice(0, 2))))
  };
};

const alertGeometry = (alert) => {
  if (alert.ownPolygons.length) return { polygons: alert.ownPolygons, pending: 0, source: "polygon" };
  const polygons = [];
  let pending = 0;
  for (const zoneId of alert.zoneIds) {
    const zone = zones.get(zoneId);
    if (zone) zone.used = Date.now();
    if (zone && zone.polygons) polygons.push(...zone.polygons);
    else pending += 1;
  }
  return { polygons, pending, source: "zones" };
};

const loadAlerts = () => refreshing(cache.alerts, SOURCES.nws.refreshSeconds, async () => {
  try {
    const data = await fetchJson("nws", SOURCES.nws.alerts, 1, "application/geo+json");
    const features = Array.isArray(data && data.features) ? data.features : [];
    const list = features.map(compactAlert).filter((alert) => alert.id);
    list.forEach((alert) => {
      alert.rank = severityRank(alert);
    });
    list.sort((a, b) => a.rank - b.rank);
    cache.alerts.list = list;
    cache.alerts.byId = new Map(list.map((alert) => [alert.id, alert]));
    cache.alerts.at = Date.now();
    cache.alerts.error = null;
    cache.alerts.version = (cache.alerts.version || 0) + 1;
    noteSuccess("nws", list.length);
    for (const alert of list) for (const zoneId of alert.zoneIds) loadZone(zoneId);
    drainZones();
  } catch (error) {
    cache.alerts.error = errorMessage(error);
    cache.alerts.at = Date.now() - SOURCES.nws.refreshSeconds * 500;
    if (error && error.response) noteFailure("nws", error);
  }
  return cache.alerts;
});

const alertsKeeper = setInterval(() => loadAlerts(), SOURCES.nws.refreshSeconds * 500);
if (alertsKeeper.unref) alertsKeeper.unref();

const alertSummary = (alert, withGeometry) => {
  const geometry = withGeometry ? alertGeometry(alert) : null;
  const summary = {
    id: alert.id,
    event: alert.event,
    headline: alert.nwsHeadline || alert.headline,
    severity: alert.severity,
    certainty: alert.certainty,
    urgency: alert.urgency,
    messageType: alert.messageType,
    sender: alert.sender,
    areaDesc: alert.areaDesc,
    sent: alert.sent,
    onset: alert.onset,
    expires: alert.expires,
    ends: alert.ends,
    maxHail: alert.maxHail,
    maxWind: alert.maxWind,
    tornadoDetection: alert.tornadoDetection,
    tornadoThreat: alert.tornadoThreat,
    stormThreat: alert.stormThreat,
    floodThreat: alert.floodThreat,
    threat: alert.threat,
    vtec: alert.vtec,
    color: alert.color,
    rank: alert.rank,
    states: alert.states,
    zoneCount: alert.zoneIds.length
  };
  if (geometry) {
    summary.polygons = geometry.polygons;
    summary.pendingZones = geometry.pending;
    summary.shape = geometry.source;
    summary.bbox = boundsOf(geometry.polygons);
  }
  return summary;
};

const alertStats = (list) => {
  const byEvent = {};
  const stats = { total: list.length, warnings: 0, watches: 0, advisories: 0, statements: 0, other: 0, tornadoWarnings: 0, severeWarnings: 0, flashFloodWarnings: 0, emergencies: 0, considerable: 0, observedTornadoes: 0, byEvent: [] };
  for (const alert of list) {
    byEvent[alert.event] = (byEvent[alert.event] || 0) + 1;
    if (/Warning$/.test(alert.event)) stats.warnings += 1;
    else if (/Watch$/.test(alert.event)) stats.watches += 1;
    else if (/Advisory$/.test(alert.event)) stats.advisories += 1;
    else if (/Statement$/.test(alert.event)) stats.statements += 1;
    else stats.other += 1;
    if (alert.event === "Tornado Warning") stats.tornadoWarnings += 1;
    if (alert.event === "Severe Thunderstorm Warning") stats.severeWarnings += 1;
    if (alert.event === "Flash Flood Warning") stats.flashFloodWarnings += 1;
    if (alert.threat === "emergency") stats.emergencies += 1;
    if (alert.threat === "considerable") stats.considerable += 1;
    if (alert.tornadoDetection && /OBSERVED/i.test(alert.tornadoDetection)) stats.observedTornadoes += 1;
  }
  stats.byEvent = Object.entries(byEvent).map(([event, count]) => ({ event, count, color: HAZARD_COLORS[event] || "#C0C0C0", rank: HAZARD_RANK[event] || 200 })).sort((a, b) => a.rank - b.rank);
  return stats;
};

const radarStamp = (iso) => iso.replace(/[-:TZ]/g, "").slice(0, 12);

const shardFor = (value) => {
  let hash = 0;
  for (const char of String(value)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return SOURCES.iem.shards[hash % SOURCES.iem.shards.length];
};

const iemTile = (template, layer) => fill(template, { shard: shardFor(layer), layer });

const pickFrames = (scans, maxFrames) => {
  if (scans.length <= maxFrames) return scans;
  const step = (scans.length - 1) / (maxFrames - 1);
  const out = [];
  for (let i = 0; i < maxFrames; i += 1) out.push(scans[Math.round(i * step)]);
  return Array.from(new Set(out));
};

const loadIemFrames = (radar, product) => {
  const key = `${radar}:${product}`;
  if (!cache.frames.has(key)) cache.frames.set(key, { at: 0, frames: [], error: null, loading: null });
  const entry = cache.frames.get(key);
  return refreshing(entry, SOURCES.iem.framesRefreshSeconds, async () => {
    try {
      const end = new Date();
      const start = new Date(end.getTime() - SOURCES.iem.frameMinutes * 60000);
      const iso = (date) => `${date.toISOString().slice(0, 16)}Z`;
      const data = await fetchJson("iem", fill(SOURCES.iem.radarList, { radar, product, start: iso(start), end: iso(end) }), 2);
      const scans = Array.isArray(data && data.scans) ? data.scans.map((scan) => scan.ts).filter(Boolean).sort() : [];
      entry.frames = pickFrames(scans, SOURCES.iem.maxFrames).map((ts) => ({
        time: new Date(ts).toISOString(),
        url: iemTile(SOURCES.iem.archiveTile, `ridge::${radar}-${product}-${radarStamp(ts)}`)
      }));
      entry.at = Date.now();
      entry.error = entry.frames.length ? null : `No ${product} scans from ${radar} were found in the last ${SOURCES.iem.frameMinutes} minutes.`;
      noteSuccess("iem", entry.frames.length);
    } catch (error) {
      entry.error = errorMessage(error);
      entry.at = Date.now() - SOURCES.iem.framesRefreshSeconds * 500;
      if (error && error.response) noteFailure("iem", error);
    }
    return entry;
  });
};

const loadRainViewer = () => refreshing(cache.rainviewer, SOURCES.rainviewer.refreshSeconds, async () => {
  try {
    const data = await fetchJson("rainviewer", SOURCES.rainviewer.maps, 2);
    cache.rainviewer.data = data;
    cache.rainviewer.at = Date.now();
    cache.rainviewer.error = null;
    noteSuccess("rainviewer", data && data.radar && Array.isArray(data.radar.past) ? data.radar.past.length : 0);
  } catch (error) {
    cache.rainviewer.error = errorMessage(error);
    cache.rainviewer.at = Date.now() - SOURCES.rainviewer.refreshSeconds * 500;
    if (error && error.response) noteFailure("rainviewer", error);
  }
  return cache.rainviewer;
});

const loadSites = () => refreshing(cache.sites, SOURCES.iem.sitesRefreshHours * 3600, async () => {
  try {
    const data = await fetchJson("iem", SOURCES.iem.radarSites, 3);
    const radars = Array.isArray(data && data.radars) ? data.radars : [];
    cache.sites.list = radars
      .filter((item) => item.id && item.id !== "USCOMP" && Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lon)))
      .map((item) => ({ id: item.id, name: item.name || item.id, lat: round(Number(item.lat), 4), lon: round(Number(item.lon), 4), type: item.type || null }))
      .sort((a, b) => a.id.localeCompare(b.id));
    cache.sites.at = Date.now();
    cache.sites.error = null;
  } catch (error) {
    cache.sites.error = errorMessage(error);
    cache.sites.at = Date.now() - 3600 * 1000 * SOURCES.iem.sitesRefreshHours + 10 * 60000;
    if (error && error.response) noteFailure("iem", error);
  }
  return cache.sites;
});

const flagged = (value) => {
  const text = String(value === null || value === undefined ? "" : value).trim().toUpperCase();
  return text && text !== "NONE" && text !== "0" && text !== "NULL" ? text : null;
};

const stormSeverity = (cell) => {
  if (cell.tvs) return 4;
  if (cell.meso || (cell.maxSize !== null && cell.maxSize >= 2)) return 3;
  if ((cell.posh !== null && cell.posh >= 50) || (cell.maxSize !== null && cell.maxSize >= 1)) return 2;
  if ((cell.poh !== null && cell.poh >= 50) || (cell.maxDbz !== null && cell.maxDbz >= 55)) return 1;
  return 0;
};

const loadStorms = () => refreshing(cache.storms, SOURCES.iem.stormsRefreshSeconds, async () => {
  try {
    const data = await fetchJson("iem", SOURCES.iem.storms, 2, "application/geo+json");
    const features = Array.isArray(data && data.features) ? data.features : [];
    const list = [];
    for (const feature of features) {
      const p = feature.properties || {};
      const coords = feature.geometry && feature.geometry.coordinates;
      if (!Array.isArray(coords)) continue;
      const cell = {
        id: `${p.nexrad || "UNK"}-${p.storm_id || list.length}`,
        nexrad: p.nexrad || null,
        storm: p.storm_id || null,
        lat: round(Number(coords[1]), 4),
        lon: round(Number(coords[0]), 4),
        tvs: flagged(p.tvs),
        meso: flagged(p.meso),
        posh: toNumber(p.posh),
        poh: toNumber(p.poh),
        maxSize: toNumber(p.max_size),
        vil: toNumber(p.vil),
        maxDbz: toNumber(p.max_dbz),
        maxDbzHeight: toNumber(p.max_dbz_height),
        top: toNumber(p.top),
        drct: toNumber(p.drct),
        sknt: toNumber(p.sknt),
        azimuth: toNumber(p.azimuth),
        range: toNumber(p.range),
        valid: p.valid || null
      };
      if (!Number.isFinite(cell.lat) || !Number.isFinite(cell.lon)) continue;
      cell.severity = stormSeverity(cell);
      list.push(cell);
    }
    list.sort((a, b) => b.severity - a.severity || (b.maxSize || 0) - (a.maxSize || 0) || (b.maxDbz || 0) - (a.maxDbz || 0));
    cache.storms.list = list;
    cache.storms.valid = data && (data.generated_at || data.generation_time) ? data.generated_at || data.generation_time : null;
    cache.storms.at = Date.now();
    cache.storms.error = null;
    noteSuccess("iem", list.length);
  } catch (error) {
    cache.storms.error = errorMessage(error);
    cache.storms.at = Date.now() - SOURCES.iem.stormsRefreshSeconds * 500;
    if (error && error.response) noteFailure("iem", error);
  }
  return cache.storms;
});

const loadReports = () => refreshing(cache.reports, SOURCES.iem.reportsRefreshSeconds, async () => {
  try {
    const data = await fetchJson("iem", fill(SOURCES.iem.reports, { hours: SOURCES.iem.reportHours }), 3, "application/geo+json");
    const features = Array.isArray(data && data.features) ? data.features : [];
    const list = [];
    features.forEach((feature, index) => {
      const p = feature.properties || {};
      const lat = toNumber(p.lat !== undefined ? p.lat : feature.geometry && feature.geometry.coordinates && feature.geometry.coordinates[1]);
      const lon = toNumber(p.lon !== undefined ? p.lon : feature.geometry && feature.geometry.coordinates && feature.geometry.coordinates[0]);
      if (lat === null || lon === null) return;
      list.push({
        id: `${p.valid || ""}-${p.wfo || ""}-${index}`,
        type: p.type || null,
        typeText: p.typetext || REPORT_TYPES[p.type] || "Report",
        magnitude: p.magnitude === "" || p.magnitude === undefined ? null : p.magnitude,
        unit: p.unit || null,
        qualifier: p.qualifier || null,
        city: p.city || null,
        county: p.county || null,
        state: p.state || p.st || null,
        wfo: p.wfo || null,
        source: p.source || null,
        remark: p.remark || null,
        valid: p.valid || null,
        lat: round(lat, 4),
        lon: round(lon, 4)
      });
    });
    list.sort((a, b) => String(b.valid).localeCompare(String(a.valid)));
    cache.reports.list = list;
    cache.reports.at = Date.now();
    cache.reports.error = null;
    noteSuccess("iem", list.length);
  } catch (error) {
    cache.reports.error = errorMessage(error);
    cache.reports.at = Date.now() - SOURCES.iem.reportsRefreshSeconds * 500;
    if (error && error.response) noteFailure("iem", error);
  }
  return cache.reports;
});

const loadOutlook = (kind) => {
  if (!cache.outlooks.has(kind)) cache.outlooks.set(kind, { at: 0, features: [], error: null, loading: null });
  const entry = cache.outlooks.get(kind);
  return refreshing(entry, SOURCES.spc.refreshSeconds, async () => {
    try {
      const data = await fetchJson("spc", SOURCES.spc.outlooks[kind], 3, "application/geo+json");
      const features = Array.isArray(data && data.features) ? data.features : [];
      entry.features = features.map((feature) => {
        const p = feature.properties || {};
        return {
          dn: toNumber(p.DN),
          label: p.LABEL || null,
          label2: p.LABEL2 || null,
          fill: p.fill || null,
          stroke: p.stroke || null,
          valid: p.VALID_ISO || p.VALID || null,
          expire: p.EXPIRE_ISO || p.EXPIRE || null,
          issue: p.ISSUE_ISO || p.ISSUE || null,
          polygons: polygonsOf(feature.geometry, 0.02)
        };
      }).filter((feature) => feature.polygons.length).sort((a, b) => (a.dn || 0) - (b.dn || 0));
      entry.at = Date.now();
      entry.error = null;
      noteSuccess("spc", entry.features.length);
    } catch (error) {
      entry.error = errorMessage(error);
      entry.at = Date.now() - SOURCES.spc.refreshSeconds * 500;
      if (error && error.response) noteFailure("spc", error);
    }
    return entry;
  });
};

const loadTropicalLayers = () => refreshing(cache.tropicalLayers, SOURCES.nhc.layerRefreshHours * 3600, async () => {
  try {
    const data = await fetchJson("nhc", `${SOURCES.nhc.mapServer}?f=json`, 3);
    const ids = {};
    for (const layer of (data && data.layers) || []) if (layer && layer.name) ids[String(layer.name).trim()] = layer.id;
    cache.tropicalLayers.ids = ids;
    cache.tropicalLayers.at = Date.now();
  } catch (error) {
    cache.tropicalLayers.at = Date.now() - SOURCES.nhc.layerRefreshHours * 3600000 + 10 * 60000;
    if (error && error.response) noteFailure("nhc", error);
  }
  return cache.tropicalLayers;
});

const parseCoordinate = (value) => {
  if (typeof value === "number") return value;
  const match = /^([\d.]+)\s*([NSEW])$/i.exec(String(value || "").trim());
  if (!match) return toNumber(value);
  const number = Number(match[1]);
  return /[SW]/i.test(match[2]) ? -number : number;
};

const loadTropical = () => refreshing(cache.tropical, SOURCES.nhc.refreshSeconds, async () => {
  try {
    const data = await fetchJson("nhc", SOURCES.nhc.current, 2);
    const storms = (Array.isArray(data && data.activeStorms) ? data.activeStorms : []).map((storm) => ({
      id: storm.id,
      bin: storm.binNumber || null,
      name: storm.name || null,
      classification: storm.classification || null,
      intensity: toNumber(storm.intensity),
      pressure: toNumber(storm.pressure),
      lat: storm.latitudeNumeric !== undefined ? toNumber(storm.latitudeNumeric) : parseCoordinate(storm.latitude),
      lon: storm.longitudeNumeric !== undefined ? toNumber(storm.longitudeNumeric) : parseCoordinate(storm.longitude),
      movementDir: toNumber(storm.movementDir),
      movementSpeed: toNumber(storm.movementSpeed),
      lastUpdate: storm.lastUpdate || null,
      advisory: storm.publicAdvisory ? { number: storm.publicAdvisory.advNum || null, url: storm.publicAdvisory.url || null, issued: storm.publicAdvisory.issuance || null } : null
    }));
    const features = [];
    const layers = await loadTropicalLayers();
    if (layers.ids) {
      for (const storm of storms) {
        if (!storm.bin) continue;
        for (const [kind, suffix] of Object.entries(SOURCES.nhc.layerSuffixes)) {
          const id = layers.ids[`${storm.bin} ${suffix}`];
          if (id === undefined) continue;
          try {
            const layer = await fetchJson("nhc", fill(SOURCES.nhc.layerQuery, { server: SOURCES.nhc.mapServer, id }), 4, "application/geo+json");
            for (const feature of (layer && layer.features) || []) {
              if (!feature || !feature.geometry) continue;
              const p = feature.properties || {};
              const item = { storm: storm.id, kind, properties: {} };
              const upper = Object.fromEntries(Object.entries(p).map(([key, value]) => [key.toUpperCase(), value]));
              for (const key of ["TAU", "MAXWIND", "GUST", "MSLP", "TCDVLP", "DVLBL", "SSNUM", "SS", "FLDATELBL", "DATELBL", "ADVDATE", "STORMTYPE", "INTENSITY", "VALIDTIME"]) if (upper[key] !== undefined && upper[key] !== null && upper[key] !== "") item.properties[key] = upper[key];
              if (feature.geometry.type === "Point") item.point = [round(feature.geometry.coordinates[0], 3), round(feature.geometry.coordinates[1], 3)];
              else if (feature.geometry.type === "LineString") item.path = feature.geometry.coordinates.map((c) => [round(c[0], 3), round(c[1], 3)]);
              else if (feature.geometry.type === "MultiLineString") item.paths = feature.geometry.coordinates.map((line) => line.map((c) => [round(c[0], 3), round(c[1], 3)]));
              else item.polygons = polygonsOf(feature.geometry, 0.02);
              features.push(item);
            }
          } catch (error) {
            if (error && error.response) noteFailure("nhc", error);
          }
        }
      }
    }
    cache.tropical.storms = storms;
    cache.tropical.features = features;
    cache.tropical.at = Date.now();
    cache.tropical.error = null;
    noteSuccess("nhc", storms.length);
  } catch (error) {
    cache.tropical.error = errorMessage(error);
    cache.tropical.at = Date.now() - SOURCES.nhc.refreshSeconds * 500;
    if (error && error.response) noteFailure("nhc", error);
  }
  return cache.tropical;
});

const openMeteoUrl = (url) => {
  const apiKey = process.env[SOURCES.openMeteo.keyEnv];
  if (!apiKey) return url;
  const parsed = new URL(url);
  parsed.hostname = `customer-${parsed.hostname}`;
  parsed.searchParams.set("apikey", apiKey);
  return parsed.toString();
};

const loadPoint = (lat, lon) => {
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  if (!cache.points.has(key)) cache.points.set(key, { at: 0, data: null, error: null, loading: null });
  const entry = cache.points.get(key);
  entry.used = Date.now();
  if (cache.points.size > SOURCES.openMeteo.maxCache) {
    const idle = Array.from(cache.points.entries()).filter(([, item]) => !item.loading).sort((a, b) => (a[1].used || 0) - (b[1].used || 0));
    for (let i = 0; i < idle.length && cache.points.size > SOURCES.openMeteo.maxCache; i += 1) cache.points.delete(idle[i][0]);
  }
  return refreshing(entry, SOURCES.openMeteo.cacheMinutes * 60, async () => {
    try {
      const params = new URLSearchParams({ latitude: lat.toFixed(4), longitude: lon.toFixed(4), current: SOURCES.openMeteo.current, minutely_15: SOURCES.openMeteo.minutely, hourly: SOURCES.openMeteo.hourly, forecast_hours: String(SOURCES.openMeteo.forecastHours), forecast_minutely_15: "16", timezone: "auto", wind_speed_unit: "mph", precipitation_unit: "inch", temperature_unit: "fahrenheit" });
      entry.data = await fetchJson("openMeteo", openMeteoUrl(`${SOURCES.openMeteo.forecast}?${params.toString()}`), 2);
      entry.at = Date.now();
      entry.error = null;
      noteSuccess("openMeteo", 1);
    } catch (error) {
      entry.error = errorMessage(error);
      entry.at = Date.now() - SOURCES.openMeteo.cacheMinutes * 30000;
      if (error && error.response) noteFailure("openMeteo", error);
    }
    return entry;
  });
};

const loadPointAlerts = (lat, lon) => {
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  if (!cache.pointAlerts.has(key)) cache.pointAlerts.set(key, { at: 0, ids: [], error: null, loading: null });
  const entry = cache.pointAlerts.get(key);
  entry.used = Date.now();
  if (cache.pointAlerts.size > SOURCES.openMeteo.maxCache) {
    const idle = Array.from(cache.pointAlerts.entries()).filter(([, item]) => !item.loading).sort((a, b) => (a[1].used || 0) - (b[1].used || 0));
    for (let i = 0; i < idle.length && cache.pointAlerts.size > SOURCES.openMeteo.maxCache; i += 1) cache.pointAlerts.delete(idle[i][0]);
  }
  return refreshing(entry, SOURCES.nws.pointCacheSeconds, async () => {
    try {
      const data = await fetchJson("nws", fill(SOURCES.nws.pointAlerts, { lat: lat.toFixed(4), lon: lon.toFixed(4) }), 1, "application/geo+json");
      entry.list = (Array.isArray(data && data.features) ? data.features : []).map(compactAlert).map((alert) => ({ ...alert, rank: severityRank(alert) })).sort((a, b) => a.rank - b.rank);
      entry.at = Date.now();
      entry.error = null;
    } catch (error) {
      entry.error = errorMessage(error);
      entry.at = Date.now() - SOURCES.nws.pointCacheSeconds * 500;
      if (error && error.response) noteFailure("nws", error);
    }
    return entry;
  });
};

const stormStats = (list) => {
  const stats = { total: list.length, severe: 0, hail: 0, largeHail: 0, mesocyclones: 0, tornadic: 0, maxHail: null, maxDbz: null, maxTop: null, radars: 0 };
  const radars = new Set();
  for (const cell of list) {
    if (cell.nexrad) radars.add(cell.nexrad);
    if (cell.severity >= 2) stats.severe += 1;
    if (cell.maxSize !== null && cell.maxSize > 0) stats.hail += 1;
    if (cell.maxSize !== null && cell.maxSize >= 2) stats.largeHail += 1;
    if (cell.meso) stats.mesocyclones += 1;
    if (cell.tvs) stats.tornadic += 1;
    if (cell.maxSize !== null && (stats.maxHail === null || cell.maxSize > stats.maxHail)) stats.maxHail = cell.maxSize;
    if (cell.maxDbz !== null && (stats.maxDbz === null || cell.maxDbz > stats.maxDbz)) stats.maxDbz = cell.maxDbz;
    if (cell.top !== null && (stats.maxTop === null || cell.top > stats.maxTop)) stats.maxTop = cell.top;
  }
  stats.radars = radars.size;
  return stats;
};

const reportStats = (list) => {
  const byType = {};
  for (const report of list) byType[report.typeText] = (byType[report.typeText] || 0) + 1;
  return { total: list.length, tornadoes: list.filter((report) => report.type === "T").length, hail: list.filter((report) => report.type === "H").length, wind: list.filter((report) => report.type === "G" || report.type === "D").length, byType: Object.entries(byType).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count) };
};

const sourcesPayload = () => Object.fromEntries(Object.entries(sourceStatus).map(([key, status]) => [key, {
  ...status,
  enabled: true,
  cooldownUntil: status.cooldownUntil ? new Date(status.cooldownUntil).toISOString() : null,
  home: SOURCES[key].home,
  attribution: SOURCES[key].attribution,
  terms: SOURCES[key].terms,
  queued: hostQueues[key].size()
}]));

const failure = (res, status, message) => res.status(status).json({ success: false, message });

const analysisCache = new Map();

const findAlert = async (id) => {
  const entry = cache.alerts.at ? cache.alerts : await loadAlerts();
  if (entry.byId.has(id)) return entry.byId.get(id);
  for (const point of cache.pointAlerts.values()) {
    const match = (point.list || []).find((alert) => alert.id === id);
    if (match) return match;
  }
  return null;
};

const alertDetailPayload = (alert) => ({ ...alertSummary(alert, false), description: alert.description, instruction: alert.instruction, category: alert.category, response: alert.response, effective: alert.effective, floodDetection: alert.floodDetection, vtec: alert.vtec, eventMotion: alert.eventMotion, nwsHeadline: alert.nwsHeadline, status: alert.status });

const requestAnalysis = async (alert) => {
  const settings = SOURCES.analysis;
  const payload = {
    event: alert.event,
    headline: alert.nwsHeadline || alert.headline,
    severity: alert.severity,
    certainty: alert.certainty,
    urgency: alert.urgency,
    messageType: alert.messageType,
    issuedBy: alert.sender,
    areas: alert.areaDesc,
    sent: alert.sent,
    effective: alert.effective,
    onset: alert.onset,
    expires: alert.expires,
    ends: alert.ends,
    maxHailInches: alert.maxHail,
    maxWindGust: alert.maxWind,
    tornadoDetection: alert.tornadoDetection,
    tornadoDamageThreat: alert.tornadoThreat,
    thunderstormDamageThreat: alert.stormThreat,
    flashFloodDamageThreat: alert.floodThreat,
    flashFloodDetection: alert.floodDetection,
    eventMotion: alert.eventMotion,
    description: String(alert.description || "").slice(0, settings.maxTextChars),
    instruction: String(alert.instruction || "").slice(0, settings.maxTextChars)
  };
  const body = (withThinking) => ({
    systemInstruction: { parts: [{ text: settings.instructions }] },
    contents: [{ role: "user", parts: [{ text: JSON.stringify(payload) }] }],
    generationConfig: {
      temperature: settings.temperature,
      maxOutputTokens: settings.maxOutputTokens,
      ...(withThinking && settings.thinkingLevel ? { thinkingConfig: { thinkingLevel: settings.thinkingLevel } } : {}),
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          summary: { type: "STRING" },
          threats: { type: "ARRAY", items: { type: "STRING" } },
          actions: { type: "ARRAY", items: { type: "STRING" } },
          timing: { type: "STRING" },
          confidence: { type: "STRING" }
        },
        required: ["summary", "threats", "actions", "timing", "confidence"]
      }
    }
  });
  const url = fill(settings.endpoint, { model: encodeURIComponent(settings.model) });
  const options = { headers: { "Content-Type": "application/json", "x-goog-api-key": settings.apiKey }, timeout: settings.timeoutMs };
  let response;
  try {
    response = await axios.post(url, body(true), options);
  } catch (error) {
    const message = error && error.response && error.response.data && error.response.data.error ? String(error.response.data.error.message || "") : "";
    if (!(error && error.response && error.response.status === 400 && /thinking/i.test(message))) throw error;
    response = await axios.post(url, body(false), options);
  }
  const text = (((response.data || {}).candidates || [])[0] || {}).content;
  const raw = text && Array.isArray(text.parts) ? text.parts.map((part) => part.text || "").join("") : "";
  const parsed = JSON.parse(raw.replace(/```json\s*/g, "").replace(/```/g, "").trim());
  return {
    summary: String(parsed.summary || "").trim(),
    threats: (Array.isArray(parsed.threats) ? parsed.threats : []).map((item) => String(item).trim()).filter(Boolean),
    actions: (Array.isArray(parsed.actions) ? parsed.actions : []).map((item) => String(item).trim()).filter(Boolean),
    timing: String(parsed.timing || "").trim(),
    confidence: String(parsed.confidence || "").trim(),
    model: settings.model,
    generatedAt: new Date().toISOString()
  };
};

router.get("/weather/radar", async (req, res) => {
  try {
    const productKey = SOURCES.radarProducts[req.query.product] ? req.query.product : "composite";
    const meta = SOURCES.radarProducts[productKey];
    if (productKey === "global") {
      const entry = await loadRainViewer();
      const data = entry.data;
      if (!data || !data.radar || !Array.isArray(data.radar.past)) return failure(res, 502, `The global radar frame list could not be loaded from ${SOURCES.rainviewer.name}. ${entry.error || "The response was empty."}`);
      const frames = data.radar.past.slice(-SOURCES.rainviewer.maxFrames).map((frame) => ({
        time: new Date(frame.time * 1000).toISOString(),
        url: fill(SOURCES.rainviewer.tile, { host: data.host, path: frame.path, size: SOURCES.rainviewer.size, color: SOURCES.rainviewer.color, options: SOURCES.rainviewer.options })
      }));
      return res.json({ success: true, product: productKey, label: meta.label, legend: meta.legend, frames, tileSize: SOURCES.rainviewer.size, maxZoom: SOURCES.rainviewer.maxZoom, stepMinutes: meta.stepMinutes, attribution: SOURCES.rainviewer.attribution, updatedAt: new Date(entry.at).toISOString() });
    }
    let radar = meta.radar;
    if (!radar) {
      radar = String(req.query.site || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
      if (radar.length < 3) return failure(res, 400, "A radar site identifier is required for single site products.");
    }
    const entry = await loadIemFrames(radar, meta.product);
    if (!entry.frames.length) return failure(res, 502, entry.error || `No radar frames are available for ${radar}.`);
    res.json({ success: true, product: productKey, label: meta.label, legend: meta.legend, radar, radarProduct: meta.product, frames: entry.frames, tileSize: 256, maxZoom: meta.maxZoom, stepMinutes: meta.stepMinutes, attribution: SOURCES.iem.attribution, error: entry.error, updatedAt: new Date(entry.at).toISOString() });
  } catch (error) {
    failure(res, 500, `The radar frames could not be built. ${errorMessage(error)}`);
  }
});

router.get("/weather/radar/sites", async (req, res) => {
  const entry = await loadSites();
  if (!entry.list.length) return failure(res, 502, `The radar site list could not be loaded from ${SOURCES.iem.name}. ${entry.error || "The list was empty."}`);
  res.json({ success: true, sites: entry.list, count: entry.list.length, updatedAt: new Date(entry.at).toISOString() });
});

router.get("/weather/overlays", (req, res) => {
  const bust = Math.floor(Date.now() / (SOURCES.satellite.refreshSeconds * 1000));
  const satellite = Object.fromEntries(Object.entries(SOURCES.satellite.channels).map(([channel, meta]) => [channel, {
    label: meta.label,
    layers: [
      { key: "global", minZoom: 0, maxZoom: SOURCES.realEarth.maxZoom, url: `${fill(SOURCES.realEarth.tile, { product: meta.global })}?v=${bust}` },
      ...SOURCES.satellite.layers.map((item) => {
        const layer = fill(item.layer, { channel });
        return { key: item.key, minZoom: item.minZoom, maxZoom: item.maxZoom, url: `${iemTile(SOURCES.iem.liveTile, layer)}?v=${bust}` };
      })
    ]
  }]));
  const rainfall = Object.fromEntries(Object.entries(SOURCES.rainfall.periods).map(([period, meta]) => [period, {
    label: meta.label,
    layers: [
      { key: "global", minZoom: 0, maxZoom: SOURCES.gibs.maxZoom, url: `${fill(SOURCES.gibs.tile, { layer: meta.global })}?v=${bust}` },
      { key: "mrms", minZoom: 0, maxZoom: SOURCES.rainfall.maxZoom, url: `${iemTile(SOURCES.iem.liveTile, meta.layer)}?v=${bust}` }
    ]
  }]));
  const attribution = [SOURCES.iem.attribution, SOURCES.realEarth.attribution, SOURCES.gibs.attribution].join(", ");
  res.json({ success: true, satellite, rainfall, attribution, refreshSeconds: SOURCES.satellite.refreshSeconds, updatedAt: new Date().toISOString() });
});

const alertsResponseCache = new Map();

router.get("/weather/alerts", async (req, res) => {
  const entry = await loadAlerts();
  if (!entry.at || (!entry.list.length && entry.error)) return failure(res, 502, `The active alerts could not be loaded from ${SOURCES.nws.name}. ${entry.error || "The response was empty."}`);
  drainZones();
  const cacheKey = `${entry.version || 0}|${entry.at}|${["west", "south", "east", "north"].map((key) => req.query[key] || "").join(",")}`;
  if (alertsResponseCache.has(cacheKey)) return res.type("application/json").send(alertsResponseCache.get(cacheKey));
  const bounds = parseBounds(req.query);
  const out = [];
  let pendingZones = 0;
  for (const alert of entry.list) {
    const summary = alertSummary(alert, true);
    pendingZones += summary.pendingZones;
    if (!intersects(summary.bbox, bounds) && summary.polygons.length) continue;
    out.push(summary);
    if (out.length >= SOURCES.retention.maxAlertsResponse) break;
  }
  const body = JSON.stringify({ success: true, alerts: out, stats: alertStats(entry.list), pendingZones, loadingZones: zoneQueue.size + hostQueues.nws.size(), version: entry.version || 0, error: entry.error, updatedAt: new Date(entry.at).toISOString() });
  alertsResponseCache.clear();
  alertsResponseCache.set(cacheKey, body);
  res.type("application/json").send(body);
});

router.get("/weather/alerts/detail", async (req, res) => {
  const alert = await findAlert(String(req.query.id || ""));
  if (!alert) return failure(res, 404, "The alert is no longer active or was not found.");
  res.json({ success: true, alert: alertDetailPayload(alert) });
});

const analysisFor = (alert) => {
  const key = `${alert.id}|${alert.sent || ""}`;
  const cached = analysisCache.get(key);
  if (cached) return cached.result ? Promise.resolve(cached.result) : cached.loading;
  const loading = requestAnalysis(alert).then((result) => {
    analysisCache.set(key, { result });
    while (analysisCache.size > SOURCES.analysis.cacheLimit) analysisCache.delete(analysisCache.keys().next().value);
    return result;
  }).catch((error) => {
    analysisCache.delete(key);
    throw error;
  });
  analysisCache.set(key, { loading });
  return loading;
};

const warmQueue = [];
let warmActive = 0;

const warmAnalyses = (alerts) => {
  if (!SOURCES.analysis.apiKey) return;
  for (const alert of alerts) if (!analysisCache.has(`${alert.id}|${alert.sent || ""}`) && !warmQueue.includes(alert)) warmQueue.push(alert);
  while (warmActive < SOURCES.analysis.warmConcurrency && warmQueue.length) {
    const next = warmQueue.shift();
    warmActive += 1;
    analysisFor(next).catch(() => null).finally(() => {
      warmActive -= 1;
      warmAnalyses([]);
    });
  }
};

router.get("/weather/alerts/analysis", async (req, res) => {
  if (!SOURCES.analysis.apiKey) return failure(res, 503, "The AI analysis is unavailable because GEMINI_API_KEY is not configured.");
  const alert = await findAlert(String(req.query.id || ""));
  if (!alert) return failure(res, 404, "The alert is no longer active or was not found.");
  try {
    const cached = analysisCache.get(`${alert.id}|${alert.sent || ""}`);
    const result = await analysisFor(alert);
    res.json({ success: true, analysis: result, cached: Boolean(cached && cached.result) });
  } catch (error) {
    const reason = error && error.response && error.response.data && error.response.data.error ? error.response.data.error.message : errorMessage(error);
    failure(res, 502, `The AI analysis could not be generated by ${SOURCES.analysis.name}. ${String(reason || "The request failed.").replace(/\.?$/, ".")}`);
  }
});

router.get("/weather/alerts/points", async (req, res) => {
  const points = String(req.query.points || "").split(";").map((pair) => pair.split(",").map(Number)).filter((pair) => pair.length === 2 && Number.isFinite(pair[0]) && Number.isFinite(pair[1]) && Math.abs(pair[0]) <= 90 && Math.abs(pair[1]) <= 180).slice(0, SOURCES.nws.maxAreaPoints);
  if (!points.length) return failure(res, 400, "At least one valid latitude and longitude pair is required.");
  const results = await Promise.all(points.map(([lat, lon]) => loadPointAlerts(lat, lon)));
  const out = {};
  const errors = [];
  points.forEach(([lat, lon], index) => {
    const entry = results[index];
    out[`${lat},${lon}`] = (entry.list || []).map((alert) => alertSummary(alert, true));
    warmAnalyses(entry.list || []);
    if (entry.error && !entry.list) errors.push(entry.error);
  });
  res.json({ success: true, points: out, error: errors[0] || null, updatedAt: new Date().toISOString() });
});

router.get("/weather/storms", async (req, res) => {
  const entry = await loadStorms();
  if (!entry.at || (!entry.list.length && entry.error)) return failure(res, 502, `The storm cells could not be loaded from ${SOURCES.iem.name}. ${entry.error || "The response was empty."}`);
  const bounds = parseBounds(req.query);
  const cells = entry.list.filter((cell) => inBounds(bounds, cell.lat, cell.lon)).slice(0, SOURCES.retention.maxStormsResponse);
  res.json({ success: true, cells, stats: stormStats(entry.list), valid: entry.valid, error: entry.error, updatedAt: new Date(entry.at).toISOString() });
});

router.get("/weather/reports", async (req, res) => {
  const entry = await loadReports();
  if (!entry.at || (!entry.list.length && entry.error)) return failure(res, 502, `The storm reports could not be loaded from ${SOURCES.iem.name}. ${entry.error || "The response was empty."}`);
  res.json({ success: true, reports: entry.list.slice(0, SOURCES.retention.maxReportsResponse), stats: reportStats(entry.list), hours: SOURCES.iem.reportHours, error: entry.error, updatedAt: new Date(entry.at).toISOString() });
});

router.get("/weather/outlooks", async (req, res) => {
  const kind = SOURCES.spc.outlooks[req.query.kind] ? req.query.kind : "categorical";
  const entry = await loadOutlook(kind);
  if (!entry.at || (!entry.features.length && entry.error)) return failure(res, 502, `The ${kind} outlook could not be loaded from ${SOURCES.spc.name}. ${entry.error || "The response was empty."}`);
  res.json({ success: true, kind, features: entry.features, error: entry.error, updatedAt: new Date(entry.at).toISOString() });
});

router.get("/weather/tropical", async (req, res) => {
  const entry = await loadTropical();
  if (!entry.at || (entry.error && !entry.storms.length)) return failure(res, 502, `The tropical cyclones could not be loaded from ${SOURCES.nhc.name}. ${entry.error || "The response was empty."}`);
  res.json({ success: true, storms: entry.storms, features: entry.features, error: entry.error, updatedAt: new Date(entry.at).toISOString() });
});

router.get("/weather/point", async (req, res) => {
  const lat = toNumber(req.query.lat);
  const lon = toNumber(req.query.lon);
  if (lat === null || lon === null || lat < -90 || lat > 90 || lon < -180 || lon > 180) return failure(res, 400, "A valid latitude and longitude are required.");
  const [forecast, alerts] = await Promise.all([loadPoint(lat, lon), loadPointAlerts(lat, lon)]);
  if (!forecast.data && !alerts.list) return failure(res, 502, `The point forecast could not be loaded. ${forecast.error || alerts.error || "Both sources failed."}`);
  res.json({ success: true, forecast: forecast.data, forecastError: forecast.error, alerts: (alerts.list || []).map((alert) => alertSummary(alert, false)), alertsError: alerts.error, updatedAt: new Date().toISOString() });
});

const snapshotDelay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const snapshotParams = (lat, lon, extra) => new URLSearchParams({ latitude: lat.toFixed(4), longitude: lon.toFixed(4), timezone: "auto", wind_speed_unit: "mph", precipitation_unit: "inch", temperature_unit: "fahrenheit", ...extra });

const loadSnapshotForecast = (lat, lon) => {
  const settings = SOURCES.openMeteo.snapshot;
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  if (!cache.snapshots.has(key)) cache.snapshots.set(key, { at: 0, data: null, error: null, loading: null });
  const entry = cache.snapshots.get(key);
  entry.used = Date.now();
  if (cache.snapshots.size > SOURCES.openMeteo.maxCache) {
    const idle = Array.from(cache.snapshots.entries()).filter(([, item]) => !item.loading).sort((a, b) => (a[1].used || 0) - (b[1].used || 0));
    for (let i = 0; i < idle.length && cache.snapshots.size > SOURCES.openMeteo.maxCache; i += 1) cache.snapshots.delete(idle[i][0]);
  }
  return refreshing(entry, SOURCES.openMeteo.cacheMinutes * 60, async () => {
    try {
      const params = snapshotParams(lat, lon, { current: settings.current, minutely_15: settings.minutely, forecast_minutely_15: String(settings.minutelySteps), hourly: settings.hourly, past_hours: String(settings.pastHours), forecast_hours: String(settings.forecastHours), daily: settings.daily, past_days: String(settings.pastDays), forecast_days: String(settings.forecastDays) });
      entry.data = await fetchJson("openMeteo", openMeteoUrl(`${SOURCES.openMeteo.forecast}?${params.toString()}`), 2);
      entry.at = Date.now();
      entry.error = null;
      noteSuccess("openMeteo", 1);
    } catch (error) {
      entry.error = errorMessage(error);
      entry.at = Date.now() - SOURCES.openMeteo.cacheMinutes * 30000;
      if (error && error.response) noteFailure("openMeteo", error);
    }
    return entry;
  });
};

const loadAirQuality = (lat, lon) => {
  const settings = SOURCES.openMeteo.snapshot;
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  if (!cache.airQuality.has(key)) cache.airQuality.set(key, { at: 0, data: null, error: null, loading: null });
  const entry = cache.airQuality.get(key);
  entry.used = Date.now();
  if (cache.airQuality.size > SOURCES.openMeteo.maxCache) {
    const idle = Array.from(cache.airQuality.entries()).filter(([, item]) => !item.loading).sort((a, b) => (a[1].used || 0) - (b[1].used || 0));
    for (let i = 0; i < idle.length && cache.airQuality.size > SOURCES.openMeteo.maxCache; i += 1) cache.airQuality.delete(idle[i][0]);
  }
  return refreshing(entry, settings.airCacheMinutes * 60, async () => {
    try {
      const params = new URLSearchParams({ latitude: lat.toFixed(4), longitude: lon.toFixed(4), timezone: "auto", current: settings.airCurrent, hourly: settings.airHourly, forecast_hours: String(settings.airForecastHours) });
      entry.data = await fetchJson("openMeteo", openMeteoUrl(`${SOURCES.openMeteo.airQuality}?${params.toString()}`), 3);
      entry.at = Date.now();
      entry.error = null;
    } catch (error) {
      entry.error = errorMessage(error);
      entry.at = Date.now() - settings.airCacheMinutes * 30000;
      if (error && error.response) noteFailure("openMeteo", error);
    }
    return entry;
  });
};

const loadNormals = (lat, lon, month, day) => {
  const settings = SOURCES.openMeteo.snapshot;
  const grid = settings.normalsGridDegrees;
  const gridLat = Math.round(lat / grid) * grid;
  const gridLon = Math.round(lon / grid) * grid;
  const key = `${gridLat.toFixed(2)},${gridLon.toFixed(2)},${month},${day}`;
  if (!cache.normals.has(key)) cache.normals.set(key, { at: 0, data: null, error: null, loading: null });
  const entry = cache.normals.get(key);
  entry.used = Date.now();
  if (cache.normals.size > settings.maxNormals) {
    const idle = Array.from(cache.normals.entries()).filter(([, item]) => !item.loading).sort((a, b) => (a[1].used || 0) - (b[1].used || 0));
    for (let i = 0; i < idle.length && cache.normals.size > settings.maxNormals; i += 1) cache.normals.delete(idle[i][0]);
  }
  return refreshing(entry, settings.normalsCacheHours * 3600, async () => {
    try {
      const highs = [];
      const lows = [];
      const precipitation = [];
      let recordHigh = null;
      let recordLow = null;
      const iso = (date) => date.toISOString().slice(0, 10);
      for (let year = settings.normalsStartYear; year <= settings.normalsEndYear; year += 1) {
        const leap = new Date(Date.UTC(year, 1, 29)).getUTCMonth() === 1;
        const center = new Date(Date.UTC(year, month - 1, month === 2 && day === 29 && !leap ? 28 : day));
        const start = new Date(center.getTime() - settings.normalsWindowDays * 86400000);
        const end = new Date(center.getTime() + settings.normalsWindowDays * 86400000);
        const params = snapshotParams(gridLat, gridLon, { start_date: iso(start), end_date: iso(end), daily: "temperature_2m_max,temperature_2m_min,precipitation_sum" });
        const data = await fetchJson("openMeteo", openMeteoUrl(`${SOURCES.openMeteo.archive}?${params.toString()}`), 6);
        const daily = (data && data.daily) || {};
        (daily.time || []).forEach((time, index) => {
          const high = toNumber(daily.temperature_2m_max && daily.temperature_2m_max[index]);
          const low = toNumber(daily.temperature_2m_min && daily.temperature_2m_min[index]);
          const rain = toNumber(daily.precipitation_sum && daily.precipitation_sum[index]);
          if (high !== null) highs.push(high);
          if (low !== null) lows.push(low);
          if (rain !== null) precipitation.push(rain);
          if (time === iso(center)) {
            if (high !== null && (!recordHigh || high > recordHigh.value)) recordHigh = { value: round(high, 1), year };
            if (low !== null && (!recordLow || low < recordLow.value)) recordLow = { value: round(low, 1), year };
          }
        });
      }
      if (!highs.length || !lows.length) throw new Error("The reanalysis archive returned no temperatures for this place.");
      const mean = (list) => list.reduce((sum, value) => sum + value, 0) / list.length;
      entry.data = { normalHigh: round(mean(highs), 1), normalLow: round(mean(lows), 1), normalPrecipitationPerDay: precipitation.length ? round(mean(precipitation), 3) : null, wetDayPercent: precipitation.length ? Math.round(precipitation.filter((value) => value >= 0.01).length / precipitation.length * 100) : null, recordHigh, recordLow, years: `${settings.normalsStartYear}–${settings.normalsEndYear}`, windowDays: settings.normalsWindowDays * 2 + 1, gridLat: round(gridLat, 2), gridLon: round(gridLon, 2) };
      entry.at = Date.now();
      entry.error = null;
    } catch (error) {
      entry.error = errorMessage(error);
      entry.at = Date.now() - settings.normalsCacheHours * 3600000 + 15 * 60000;
      if (error && error.response) noteFailure("openMeteo", error);
    }
    return entry;
  });
};

const astroRad = Math.PI / 180;

const astroDays = (ms) => ms / 86400000 - 0.5 + 2440588 - 2451545;

const astroObliquity = 23.4397 * astroRad;

const sunCoordinates = (days) => {
  const anomaly = astroRad * (357.5291 + 0.98560028 * days);
  const center = astroRad * (1.9148 * Math.sin(anomaly) + 0.02 * Math.sin(2 * anomaly) + 0.0003 * Math.sin(3 * anomaly));
  const longitude = anomaly + center + astroRad * 102.9372 + Math.PI;
  return { ra: Math.atan2(Math.sin(longitude) * Math.cos(astroObliquity), Math.cos(longitude)), dec: Math.asin(Math.sin(astroObliquity) * Math.sin(longitude)), dist: 149598000 };
};

const moonCoordinates = (days) => {
  const meanLongitude = 218.316 + 13.176396 * days;
  const anomaly = astroRad * (134.963 + 13.064993 * days);
  const node = astroRad * (93.272 + 13.22935 * days);
  const elongation = astroRad * (297.85 + 12.190749 * days);
  const sunAnomaly = astroRad * (357.529 + 0.98560028 * days);
  const longitude = astroRad * (meanLongitude + 6.289 * Math.sin(anomaly) + 1.274 * Math.sin(2 * elongation - anomaly) + 0.658 * Math.sin(2 * elongation) + 0.214 * Math.sin(2 * anomaly) - 0.186 * Math.sin(sunAnomaly) - 0.114 * Math.sin(2 * node));
  const latitude = astroRad * (5.128 * Math.sin(node) + 0.281 * Math.sin(anomaly + node) + 0.278 * Math.sin(anomaly - node) + 0.173 * Math.sin(2 * elongation - node));
  return {
    ra: Math.atan2(Math.sin(longitude) * Math.cos(astroObliquity) - Math.tan(latitude) * Math.sin(astroObliquity), Math.cos(longitude)),
    dec: Math.asin(Math.sin(latitude) * Math.cos(astroObliquity) + Math.cos(latitude) * Math.sin(astroObliquity) * Math.sin(longitude)),
    dist: 385001 - 20905 * Math.cos(anomaly) - 3699 * Math.cos(2 * elongation - anomaly) - 2956 * Math.cos(2 * elongation)
  };
};

const astroAltitude = (coords, days, lat, lon) => {
  const sidereal = astroRad * (280.16 + 360.9856235 * days) + lon * astroRad;
  const hourAngle = sidereal - coords.ra;
  const phi = lat * astroRad;
  return Math.asin(Math.sin(phi) * Math.sin(coords.dec) + Math.cos(phi) * Math.cos(coords.dec) * Math.cos(hourAngle)) / astroRad;
};

const moonPhase = (ms) => {
  const days = astroDays(ms);
  const sun = sunCoordinates(days);
  const moon = moonCoordinates(days);
  const phi = Math.acos(Math.sin(sun.dec) * Math.sin(moon.dec) + Math.cos(sun.dec) * Math.cos(moon.dec) * Math.cos(sun.ra - moon.ra));
  const inc = Math.atan2(sun.dist * Math.sin(phi), moon.dist - sun.dist * Math.cos(phi));
  const angle = Math.atan2(Math.cos(sun.dec) * Math.sin(sun.ra - moon.ra), Math.sin(sun.dec) * Math.cos(moon.dec) - Math.cos(sun.dec) * Math.sin(moon.dec) * Math.cos(sun.ra - moon.ra));
  return { fraction: (1 + Math.cos(inc)) / 2, phase: 0.5 + 0.5 * inc * (angle < 0 ? -1 : 1) / Math.PI, distanceKm: Math.round(moon.dist) };
};

const MOON_PHASE_NAMES = [[0.0339, "New Moon"], [0.2161, "Waxing Crescent"], [0.2839, "First Quarter"], [0.4661, "Waxing Gibbous"], [0.5339, "Full Moon"], [0.7161, "Waning Gibbous"], [0.7839, "Last Quarter"], [0.9661, "Waning Crescent"], [1.01, "New Moon"]];

const crossings = (start, hours, stepMinutes, valueAt, threshold) => {
  const events = [];
  let previousTime = start;
  let previousValue = valueAt(start) - threshold;
  for (let time = start + stepMinutes * 60000; time <= start + hours * 3600000; time += stepMinutes * 60000) {
    const value = valueAt(time) - threshold;
    if ((previousValue < 0) !== (value < 0)) {
      const at = previousTime + (time - previousTime) * (previousValue / (previousValue - value));
      events.push({ at: new Date(Math.round(at)).toISOString(), rising: value > previousValue });
    }
    previousTime = time;
    previousValue = value;
  }
  return events;
};

const nextPhaseTime = (now, target) => {
  const step = 3600000;
  const crossed = (previous, current) => (target === 0 ? current < previous - 0.5 : previous < target && current >= target);
  let previous = moonPhase(now).phase;
  for (let time = now + step; time <= now + 32 * 86400000; time += step) {
    const current = moonPhase(time).phase;
    if (crossed(previous, current)) {
      let low = time - step;
      let high = time;
      while (high - low > 60000) {
        const middle = (low + high) / 2;
        if (crossed(moonPhase(low).phase, moonPhase(middle).phase)) high = middle;
        else low = middle;
      }
      return new Date(Math.round(high)).toISOString();
    }
    previous = current;
  }
  return null;
};

const astronomy = (lat, lon, utcOffsetSeconds) => {
  const settings = SOURCES.openMeteo.snapshot;
  const now = Date.now();
  const local = new Date(now + utcOffsetSeconds * 1000);
  const midnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - utcOffsetSeconds * 1000;
  const sunAt = (ms) => astroAltitude(sunCoordinates(astroDays(ms)), astroDays(ms), lat, lon);
  const moonAt = (ms) => astroAltitude(moonCoordinates(astroDays(ms)), astroDays(ms), lat, lon);
  const twilight = crossings(midnight, 24, settings.astronomyStepMinutes, sunAt, settings.twilightDegrees);
  const moonEvents = crossings(midnight, 24, settings.astronomyStepMinutes, moonAt, settings.moonHorizonDegrees);
  const phase = moonPhase(now);
  const phaseName = MOON_PHASE_NAMES.find(([limit]) => phase.phase < limit)[1];
  const noon = [];
  for (let time = midnight; time <= midnight + 86400000; time += settings.astronomyStepMinutes * 60000) noon.push([time, sunAt(time)]);
  const solarNoon = noon.reduce((best, entry) => (entry[1] > best[1] ? entry : best), noon[0]);
  return {
    sun: {
      firstLight: (twilight.find((event) => event.rising) || {}).at || null,
      lastLight: (twilight.find((event) => !event.rising) || {}).at || null,
      solarNoon: new Date(solarNoon[0]).toISOString(),
      noonAltitude: round(solarNoon[1], 1),
      altitude: round(sunAt(now), 1)
    },
    moon: {
      phase: round(phase.phase, 4),
      phaseName,
      illumination: Math.round(phase.fraction * 100),
      ageDays: round(phase.phase * 29.530588, 1),
      distanceKm: phase.distanceKm,
      altitude: round(moonAt(now), 1),
      moonrise: (moonEvents.find((event) => event.rising) || {}).at || null,
      moonset: (moonEvents.find((event) => !event.rising) || {}).at || null,
      nextFullMoon: nextPhaseTime(now, 0.5),
      nextNewMoon: nextPhaseTime(now, 0)
    }
  };
};

router.get("/weather/snapshot", async (req, res) => {
  const lat = toNumber(req.query.lat);
  const lon = toNumber(req.query.lon);
  if (lat === null || lon === null || lat < -90 || lat > 90 || lon < -180 || lon > 180) return failure(res, 400, "A valid latitude and longitude are required.");
  const [forecast, air, alerts] = await Promise.all([loadSnapshotForecast(lat, lon), loadAirQuality(lat, lon), loadPointAlerts(lat, lon)]);
  if (!forecast.data) return failure(res, 502, `The local weather snapshot could not be loaded. ${forecast.error || "The forecast service returned no data."}`);
  const offset = Number(forecast.data.utc_offset_seconds) || 0;
  const local = new Date(Date.now() + offset * 1000);
  const normalsEntry = loadNormals(lat, lon, local.getUTCMonth() + 1, local.getUTCDate());
  const normals = await Promise.race([normalsEntry, snapshotDelay(SOURCES.openMeteo.snapshot.responseWaitMs).then(() => null)]);
  res.json({
    success: true,
    forecast: forecast.data,
    forecastError: forecast.error,
    airQuality: air.data,
    airQualityError: air.error,
    averages: normals && normals.data ? normals.data : null,
    averagesError: normals ? normals.error : null,
    averagesPending: !normals || (!normals.data && !normals.error),
    astronomy: astronomy(lat, lon, offset),
    alerts: (alerts.list || []).map((alert) => alertSummary(alert, false)),
    alertsError: alerts.error,
    updatedAt: new Date().toISOString()
  });
});

const snapshotAnalysisCache = new Map();

const SNAPSHOT_CARD_KEYS = ["hourly", "tenDay", "nextHours", "airQuality", "uv", "sun", "wind", "precipitation", "feelsLike", "humidity", "visibility", "pressure", "moon", "averages"];

const snapshotDigest = (forecast, air, normals, astro, alerts) => {
  const current = forecast.current || {};
  const hourly = forecast.hourly || {};
  const daily = forecast.daily || {};
  const minutely = forecast.minutely_15 || {};
  const nowText = current.time || "";
  const hourTimes = hourly.time || [];
  const hourIndex = Math.max(0, hourTimes.findIndex((time) => time.slice(0, 13) === nowText.slice(0, 13)));
  const todayIndex = Math.max(0, (daily.time || []).indexOf(nowText.slice(0, 10)));
  const pick = (series, index) => (series && series[index] !== undefined ? series[index] : null);
  const next24 = hourTimes.slice(hourIndex, hourIndex + 24).map((time, offset) => {
    const index = hourIndex + offset;
    return { time, temperature: pick(hourly.temperature_2m, index), feelsLike: pick(hourly.apparent_temperature, index), precipitationChance: pick(hourly.precipitation_probability, index), precipitation: pick(hourly.precipitation, index), condition: SOURCES.openMeteo.snapshot.weatherCodes[pick(hourly.weather_code, index)] || null, uvIndex: pick(hourly.uv_index, index), windGust: pick(hourly.wind_gusts_10m, index), humidity: pick(hourly.relative_humidity_2m, index), visibility: pick(hourly.visibility, index) };
  });
  const lastDayPrecipitation = (hourly.precipitation || []).slice(Math.max(0, hourIndex - 24), hourIndex).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const tenDay = (daily.time || []).slice(todayIndex, todayIndex + 10).map((date, offset) => {
    const index = todayIndex + offset;
    return { date, condition: SOURCES.openMeteo.snapshot.weatherCodes[pick(daily.weather_code, index)] || null, high: pick(daily.temperature_2m_max, index), low: pick(daily.temperature_2m_min, index), precipitationChance: pick(daily.precipitation_probability_max, index), precipitation: pick(daily.precipitation_sum, index), snowfall: pick(daily.snowfall_sum, index), maxGust: pick(daily.wind_gusts_10m_max, index), uvMax: pick(daily.uv_index_max, index), sunrise: pick(daily.sunrise, index), sunset: pick(daily.sunset, index) };
  });
  const airCurrent = air && air.current ? air.current : null;
  const offset = Number(forecast.utc_offset_seconds) || 0;
  const localTime = (iso) => (iso ? new Date(Date.parse(iso) + offset * 1000).toISOString().slice(0, 16) : null);
  return {
    localTime: nowText,
    timezone: forecast.timezone,
    current: { temperature: current.temperature_2m, feelsLike: current.apparent_temperature, condition: SOURCES.openMeteo.snapshot.weatherCodes[current.weather_code] || null, isDay: current.is_day === 1, humidity: current.relative_humidity_2m, dewPoint: current.dew_point_2m, cloudCover: current.cloud_cover, windSpeed: current.wind_speed_10m, windGust: current.wind_gusts_10m, windDirection: current.wind_direction_10m, pressure: current.pressure_msl, pressureThreeHoursAgo: pick(hourly.pressure_msl, hourIndex - 3), visibility: current.visibility, visibilityUnit: (forecast.current_units || {}).visibility || "m", uvIndex: current.uv_index },
    nextTwoHoursPrecipitation: (minutely.time || []).map((time, index) => ({ time, precipitation: pick(minutely.precipitation, index) })),
    lastDayPrecipitation: Math.round(lastDayPrecipitation * 100) / 100,
    next24Hours: next24,
    tenDay,
    airQuality: airCurrent ? { usAqi: airCurrent.us_aqi, pm25: airCurrent.pm2_5, pm10: airCurrent.pm10, ozone: airCurrent.ozone, nitrogenDioxide: airCurrent.nitrogen_dioxide, subIndices: { pm25: airCurrent.us_aqi_pm2_5, pm10: airCurrent.us_aqi_pm10, ozone: airCurrent.us_aqi_ozone, nitrogenDioxide: airCurrent.us_aqi_nitrogen_dioxide }, pollen: Object.fromEntries(["alder_pollen", "birch_pollen", "grass_pollen", "mugwort_pollen", "olive_pollen", "ragweed_pollen"].filter((key) => airCurrent[key] !== null && airCurrent[key] !== undefined).map((key) => [key, airCurrent[key]])) } : null,
    averages: normals || null,
    sun: astro ? { firstLight: localTime(astro.sun.firstLight), lastLight: localTime(astro.sun.lastLight), solarNoon: localTime(astro.sun.solarNoon) } : null,
    moon: astro ? { phase: astro.moon.phaseName, illuminationPercent: astro.moon.illumination, moonrise: localTime(astro.moon.moonrise), moonset: localTime(astro.moon.moonset), nextFullMoon: localTime(astro.moon.nextFullMoon), nextNewMoon: localTime(astro.moon.nextNewMoon) } : null,
    alerts: (alerts || []).slice(0, 5).map((alert) => ({ event: alert.event, severity: alert.severity, headline: alert.nwsHeadline || alert.headline || null, expires: alert.expires || null }))
  };
};

const requestSnapshotAnalysis = async (digest) => {
  const settings = SOURCES.analysis;
  const card = { type: "OBJECT", properties: { insight: { type: "STRING" }, action: { type: "STRING" } }, required: ["insight", "action"] };
  const body = (withThinking) => ({
    systemInstruction: { parts: [{ text: settings.snapshotInstructions }] },
    contents: [{ role: "user", parts: [{ text: JSON.stringify(digest) }] }],
    generationConfig: {
      temperature: settings.temperature,
      maxOutputTokens: settings.snapshotMaxOutputTokens,
      ...(withThinking && settings.thinkingLevel ? { thinkingConfig: { thinkingLevel: settings.thinkingLevel } } : {}),
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          headline: { type: "STRING" },
          summary: { type: "STRING" },
          actions: { type: "ARRAY", items: { type: "STRING" } },
          cards: { type: "OBJECT", properties: Object.fromEntries(SNAPSHOT_CARD_KEYS.map((key) => [key, card])), required: SNAPSHOT_CARD_KEYS }
        },
        required: ["headline", "summary", "actions", "cards"]
      }
    }
  });
  const url = fill(settings.endpoint, { model: encodeURIComponent(settings.model) });
  const options = { headers: { "Content-Type": "application/json", "x-goog-api-key": settings.apiKey }, timeout: settings.timeoutMs };
  let response;
  try {
    response = await axios.post(url, body(true), options);
  } catch (error) {
    const message = error && error.response && error.response.data && error.response.data.error ? String(error.response.data.error.message || "") : "";
    if (!(error && error.response && error.response.status === 400 && /thinking/i.test(message))) throw error;
    response = await axios.post(url, body(false), options);
  }
  const content = (((response.data || {}).candidates || [])[0] || {}).content;
  const raw = content && Array.isArray(content.parts) ? content.parts.map((part) => part.text || "").join("") : "";
  const parsed = JSON.parse(raw.replace(/```json\s*/g, "").replace(/```/g, "").trim());
  const text = (value) => String(value || "").trim();
  const cards = parsed.cards && typeof parsed.cards === "object" ? parsed.cards : {};
  return {
    headline: text(parsed.headline),
    summary: text(parsed.summary),
    actions: (Array.isArray(parsed.actions) ? parsed.actions : []).map(text).filter(Boolean),
    cards: Object.fromEntries(SNAPSHOT_CARD_KEYS.map((key) => [key, { insight: text(cards[key] && cards[key].insight), action: text(cards[key] && cards[key].action) }])),
    model: settings.model,
    generatedAt: new Date().toISOString()
  };
};

router.get("/weather/snapshot/analysis", async (req, res) => {
  const settings = SOURCES.analysis;
  if (!settings.apiKey) return failure(res, 503, "The AI briefing is unavailable because GEMINI_API_KEY is not configured.");
  const lat = toNumber(req.query.lat);
  const lon = toNumber(req.query.lon);
  if (lat === null || lon === null || lat < -90 || lat > 90 || lon < -180 || lon > 180) return failure(res, 400, "A valid latitude and longitude are required.");
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const cached = snapshotAnalysisCache.get(key);
  if (cached && cached.result && Date.now() - cached.at < settings.snapshotCacheMinutes * 60000) return res.json({ success: true, analysis: cached.result, cached: true });
  try {
    const loading = cached && cached.loading ? cached.loading : (async () => {
      const [forecast, air, alerts] = await Promise.all([loadSnapshotForecast(lat, lon), loadAirQuality(lat, lon), loadPointAlerts(lat, lon)]);
      if (!forecast.data) throw new Error(forecast.error || "The forecast service returned no data.");
      const offset = Number(forecast.data.utc_offset_seconds) || 0;
      const local = new Date(Date.now() + offset * 1000);
      const normals = await Promise.race([loadNormals(lat, lon, local.getUTCMonth() + 1, local.getUTCDate()), snapshotDelay(SOURCES.openMeteo.snapshot.responseWaitMs).then(() => null)]);
      return requestSnapshotAnalysis(snapshotDigest(forecast.data, air.data, normals && normals.data, astronomy(lat, lon, offset), alerts.list));
    })();
    if (!cached || !cached.loading) snapshotAnalysisCache.set(key, { loading });
    const result = await loading;
    snapshotAnalysisCache.set(key, { result, at: Date.now() });
    while (snapshotAnalysisCache.size > settings.snapshotCacheLimit) snapshotAnalysisCache.delete(snapshotAnalysisCache.keys().next().value);
    res.json({ success: true, analysis: result, cached: false });
  } catch (error) {
    snapshotAnalysisCache.delete(key);
    const reason = error && error.response && error.response.data && error.response.data.error ? error.response.data.error.message : error.message;
    failure(res, 502, `The AI briefing could not be generated by ${settings.name}. ${String(reason || "The request failed.").replace(/\.?$/, ".")}`);
  }
});

router.get("/weather/health", (req, res) => {
  const sources = sourcesPayload();
  const failing = Object.values(sources).filter((source) => source.lastError).length;
  res.json({
    success: true,
    status: failing === 0 ? "OPERATIONAL" : failing === Object.keys(sources).length ? "DOWN" : "DEGRADED",
    sources,
    zones: { cached: zones.size, queued: zoneQueue.size },
    uptimeSeconds: Math.floor(process.uptime())
  });
});

module.exports = router;

module.exports.weatherCensus = async () => {
  const [alerts, storms, reports, tropical] = await Promise.all([loadAlerts(), loadStorms(), loadReports(), loadTropical()]);
  if (!alerts.at || (!alerts.list.length && alerts.error)) throw new Error(`The active alerts could not be loaded from ${SOURCES.nws.name}. ${alerts.error || "The response was empty."}`);
  const logged = alerts.list.filter((alert) => SOURCES.warnings.logEvents.includes(alert.event) || alert.threat === "emergency").map((alert) => {
    const geometry = alertGeometry(alert);
    const box = boundsOf(geometry.polygons);
    return {
      id: alert.id,
      event: alert.event,
      headline: alert.nwsHeadline || alert.headline,
      severity: alert.severity,
      sender: alert.sender,
      areaDesc: alert.areaDesc ? String(alert.areaDesc).slice(0, 500) : null,
      sent: alert.sent,
      expires: alert.expires,
      maxHail: alert.maxHail,
      maxWind: alert.maxWind,
      tornadoDetection: alert.tornadoDetection,
      threat: alert.threat,
      lat: box ? round((box[1] + box[3]) / 2, 3) : null,
      lon: box ? round((box[0] + box[2]) / 2, 3) : null
    };
  });
  return {
    alerts: alertStats(alerts.list),
    storms: stormStats(storms.list),
    reports: reportStats(reports.list),
    tropical: tropical.storms.map((storm) => ({ id: storm.id, name: storm.name, classification: storm.classification, intensity: storm.intensity, pressure: storm.pressure, lat: storm.lat, lon: storm.lon })),
    warnings: logged,
    errors: { alerts: alerts.error, storms: storms.error, reports: reports.error, tropical: tropical.error },
    sources: sourcesPayload()
  };
};