import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faThermometerHalf, faWind, faEye, faEyeSlash, faCloudRain, faBolt, faGlobe, faWater,
  faExclamationTriangle, faSquareCheck, faXmarkSquare, faChartLine, faRefresh,
  faDownload, faInfoCircle, faMapMarkerAlt, faClock, faSignal, faShield,
  faSatellite, faCloud, faWaveSquare, faTachometerAlt, faBiohazard,
  faPlane, faAnchor, faLeaf, faSun, faGlobeAmericas, faDatabase, faMagnet,
  faSatelliteDish, faTemperatureLow, faCloudShowersHeavy,
  faSnowflake, faSmog, faHouseUser, faHelicopter, faBell, faHistory,
  faSearchPlus, faTint, faFire, faFilter, faFlask,
  faBroadcastTower, faHourglassHalf, faSpinner,
  faXmark, faLightbulb, faCheck, faBan, faLayerGroup, faVolumeHigh, faVolumeXmark, faBellSlash,
  faRepeat, faMapPin, faPlus, faEdit, faTrash, faSave, faTimes, faCheckCircle, faExclamationCircle,
  faCheckDouble, faPlay, faForwardStep, faBackwardStep, faLocationCrosshairs, faTriangleExclamation, faLocationDot,
} from "@fortawesome/free-solid-svg-icons";
import Nav from "../../../helpers/Nav.jsx";
import Dropdown from "../../../helpers/Dropdown.jsx";
import useAuth from "../../../UseAuth.jsx";
import ReactEcharts from "echarts-for-react";
import { openDB } from "idb";
import "../../../styles/mainStyles/Sat/EarthConditions/EarthConditions.css";
import "../../../styles/mainStyles/Sat/Trackers/WeatherTracker/WeatherTracker.css";
import "../../../styles/helperStyles/LoadingSpinner.css";
import "../../../styles/helperStyles/Disconnected.css";

const SOURCES = {
  apiBase: import.meta.env.VITE_API_BASE_URL,
  endpoints: {
    reverseGeocode: "/reverse-geocode",
    locationSearch: "/location-search",
    consolidatedEvaluation: "/consolidated-evaluation",
    interpretations: "/earth-conditions/interpretations",
    areaAlerts: "/earth-conditions/area-alerts",
    alertAnalysis: "/earth-conditions/alerts/analysis",
    areas: "/risk/areas"
  },
  geocoding: {
    photon: "https://photon.komoot.io/api/",
    nominatim: "https://nominatim.openstreetmap.org/search",
    userAgent: "EarthConditions/1.0",
    minQueryLength: 3,
    debounceMs: 300,
    resultLimit: 6,
    cacheLimit: 100,
    attribution: "Photon · © OpenStreetMap Contributors"
  },
  defaultLocation: { key: "29.7604,-95.3698", label: "Houston, United States" },
  conditions: {
    bellSeverities: ["CRITICAL", "WARNING"],
    systemCategories: ["DATA_SOURCE", "LATENCY", "DATA_INTEGRITY", "SYSTEM_INTEGRATION", "SYSTEM"],
    areaRefreshMs: 5 * 60 * 1000
  },
  tables: {
    tightAt: 14,
    wrapAt: 28
  },
  persistence: {
    dbName: "EarthConditionsStateDB",
    storeName: "state",
    recordId: "state",
    restoreFlag: "earthConditionsRestoreInFlight",
    restoreSettleMs: 3000,
    saveDebounceMs: 500
  },
  sounds: {
    defaults: { enabled: false, minLevel: "warning", scope: "view", volume: 0.6, mode: "single", snoozeUntil: 0 },
    repeatGapSeconds: 0.8,
    scheduleAheadSeconds: 120,
    topUpSeconds: 20
  },
  assets: {
    maplibreCss: "https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css",
    maplibreScript: "https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js",
    mapkitScript: "https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.js",
    mapkitToken: import.meta.env.VITE_APPLE_MAPS_KEY,
    satelliteTiles: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    labelTiles: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
    windyEmbed: "https://embed.windy.com/embed2.html"
  },
  harvest: {
    base: `${import.meta.env.VITE_API_BASE_URL}/harvest`,
    domain: "earth-conditions",
    locationPrecision: 1,
    healthRefreshMs: 60 * 1000,
    exportDays: 365,
    jobPattern: /^(earthlocations|usgs|gdacs|nhc):/,
    statusColors: { Healthy: "#4ecdc4", Degraded: "#FF9500", Idle: "#919baf", "Needs Schema": "#ff6b6b", Loading: "#919baf" }
  }
};

const apiUrl = (key) => `${SOURCES.apiBase}${SOURCES.endpoints[key]}`;

const DATA_TYPE = {
  LIVE: { label: "LIVE", icon: faBroadcastTower, color: "#4ecdc4", description: "Real-Time Observation" },
  FORECAST: { label: "FORECAST", icon: faCloudShowersHeavy, color: "#42a5f5", description: "Predicted Future Conditions" },
  TREND: { label: "TREND", icon: faChartLine, color: "#7fe9e1", description: "Calculated Trend Projection" },
  HISTORICAL: { label: "HISTORICAL", icon: faHistory, color: "#919baf", description: "Past Recorded Data" },
  COMPUTED: { label: "COMPUTED", icon: faDatabase, color: "#cdd4e4", description: "Derived from Current Data" },
  PROBABILISTIC: { label: "PROBABILITY", icon: faHourglassHalf, color: "#ffd93d", description: "Statistical Likelihood" }
};

const WINDY_OVERLAYS = [
  { id: "radar", name: "Weather Radar", icon: faSatelliteDish, category: "Standard" },
  { id: "satellite", name: "Satellite", icon: faGlobeAmericas, category: "Standard" },
  { id: "wind", name: "Wind", icon: faWind, category: "Standard" },
  { id: "gust", name: "Wind Gusts", icon: faWind, category: "Standard" },
  { id: "rain", name: "Rain & Thunder", icon: faCloudRain, category: "Standard" },
  { id: "thunder", name: "Thunderstorms", icon: faBolt, category: "Standard" },
  { id: "rainAccu", name: "Rain Accumulation", icon: faCloudShowersHeavy, category: "Standard" },
  { id: "temp", name: "Temperature", icon: faThermometerHalf, category: "Standard" },
  { id: "dewpoint", name: "Dew Point", icon: faTint, category: "Standard" },
  { id: "rh", name: "Humidity", icon: faTint, category: "Standard" },
  { id: "pressure", name: "Pressure", icon: faTachometerAlt, category: "Standard" },
  { id: "uvindex", name: "UV Index", icon: faSun, category: "Standard" },
  { id: "clouds", name: "Clouds", icon: faCloud, category: "Aviation" },
  { id: "hclouds", name: "High Clouds", icon: faCloud, category: "Aviation" },
  { id: "mclouds", name: "Medium Clouds", icon: faCloud, category: "Aviation" },
  { id: "lclouds", name: "Low Clouds", icon: faSmog, category: "Aviation" },
  { id: "fog", name: "Fog", icon: faSmog, category: "Aviation" },
  { id: "cloudtop", name: "Cloud Tops", icon: faPlane, category: "Aviation" },
  { id: "cbase", name: "Cloud Base", icon: faHelicopter, category: "Aviation" },
  { id: "visibility", name: "Visibility", icon: faEye, category: "Aviation" },
  { id: "cape", name: "CAPE Index", icon: faBolt, category: "Aviation" },
  { id: "turbulence", name: "Clear Air Turbulence", icon: faPlane, category: "Aviation" },
  { id: "icing", name: "Icing Severity", icon: faSnowflake, category: "Aviation" },
  { id: "deg0", name: "Freezing Altitude", icon: faTemperatureLow, category: "Aviation" },
  { id: "snowAccu", name: "New Snow", icon: faSnowflake, category: "Winter" },
  { id: "snowcover", name: "Snow Depth", icon: faSnowflake, category: "Winter" },
  { id: "ptype", name: "Precipitation Type", icon: faFilter, category: "Winter" },
  { id: "wetbulbtemp", name: "Wet Bulb Temp", icon: faThermometerHalf, category: "Winter" },
  { id: "waves", name: "Waves", icon: faWater, category: "Marine" },
  { id: "swell1", name: "Swell 1", icon: faWater, category: "Marine" },
  { id: "swell2", name: "Swell 2", icon: faWater, category: "Marine" },
  { id: "swell3", name: "Swell 3", icon: faWater, category: "Marine" },
  { id: "wwaves", name: "Wind Waves", icon: faWater, category: "Marine" },
  { id: "sst", name: "Sea Temperature", icon: faThermometerHalf, category: "Marine" },
  { id: "currents", name: "Currents", icon: faAnchor, category: "Marine" },
  { id: "currentsTide", name: "Tidal Currents", icon: faAnchor, category: "Marine" },
  { id: "cosc", name: "CO Concentration", icon: faBiohazard, category: "Air Quality" },
  { id: "tcso2", name: "SO2 Mass", icon: faSmog, category: "Air Quality" },
  { id: "no2", name: "NO2", icon: faSmog, category: "Air Quality" },
  { id: "pm2p5", name: "PM2.5", icon: faSmog, category: "Air Quality" },
  { id: "aod550", name: "Aerosol", icon: faSmog, category: "Air Quality" },
  { id: "gtco3", name: "Ozone Layer", icon: faShield, category: "Air Quality" },
  { id: "go3", name: "Surface Ozone", icon: faShield, category: "Air Quality" },
  { id: "fwi", name: "Fire Weather Index", icon: faFire, category: "Air Quality" },
  { id: "dfm10h", name: "Fuel Moisture", icon: faLeaf, category: "Air Quality" }
];

const CUSTOM_LOCATION_LABEL = "Custom Coordinates";

const SEVERITY_CONFIG = {
  CRITICAL: { color: "#ff6b6b", icon: faExclamationTriangle },
  WARNING: { color: "#FF9500", icon: faExclamationTriangle },
  ADVISORY: { color: "#ffd93d", icon: faInfoCircle },
  INFO: { color: "#42a5f5", icon: faInfoCircle },
  NOMINAL: { color: "#4ecdc4", icon: faSquareCheck }
};

const SOUND_VOLUME_OPTIONS = [[0.3, "Quiet"], [0.6, "Normal"], [1, "Loud"]];

const SNOOZE_OPTIONS = [[15, "15 Minutes"], [30, "30 Minutes"], [60, "1 Hour"], [120, "2 Hours"], [240, "4 Hours"], [480, "8 Hours"], [1440, "24 Hours"]];

const SOUND_LEVEL_LABELS = { notice: "Advisory", warning: "Warning", critical: "Critical", emergency: "Emergency" };

const CONDITION_SOUND_LEVELS = { CRITICAL: "critical", WARNING: "warning" };

const CONDITION_SEVERITY_ORDER = { CRITICAL: 0, WARNING: 1, ADVISORY: 2, INFO: 3, NOMINAL: 4 };

const MAP_CATEGORY_OPTIONS = [["all", "All"], ["Standard", "Standard"], ["Aviation", "Aviation"], ["Marine", "Marine"], ["Air Quality", "Air Quality"], ["Winter", "Winter"]];

const getProbabilityColor = (prob) => {
  const p = prob ?? 0;
  if (p >= 0.5) return "#ff6b6b";
  if (p >= 0.3) return "#FF9500";
  if (p >= 0.1) return "#4ecdc4";
  return "#4ecdc4";
};

const RISK_TYPE_COLORS = {
  WIND_VIOLATION: "#FF9500",
  KP_VIOLATION: "#ff6b6b",
  PRECIP_VIOLATION: "#42a5f5",
  COMBINED: "#42a5f5",
  NOMINAL: "#4ecdc4",
  WIND_SPEED: "#4ecdc4",
  GEOMAGNETIC: "#4ecdc4",
  PRECIPITATION: "#42a5f5"
};

const STATUS_TEXT_COLORS = {
  OK: "#4ecdc4",
  NOMINAL: "#4ecdc4",
  CLEAR: "#4ecdc4",
  GOOD: "#4ecdc4",
  OPEN: "#4ecdc4",
  LOW: "#4ecdc4",
  NONE: "#4ecdc4",
  ADVISORY: "#ffd93d",
  MARGINAL: "#ffd93d",
  MODERATE: "#FF9500",
  WARNING: "#FF9500",
  ELEVATED: "#FF9500",
  DEGRADED: "#FF9500",
  REDUCED: "#FF9500",
  BUSY: "#FF9500",
  ACTIVE: "#FF9500",
  HIGH: "#ff6b6b",
  CRITICAL: "#ff6b6b",
  VIOLATION: "#ff6b6b",
  SEVERE: "#ff6b6b",
  EXTREME: "#ff6b6b",
  FAILED: "#ff6b6b",
  SAFE: "#4ecdc4",
  WATCH: "#ffd93d",
  "UNHEALTHY FOR SENSITIVE GROUPS": "#FF9500",
  UNHEALTHY: "#ff6b6b",
  "VERY UNHEALTHY": "#d9534f",
  HAZARDOUS: "#d9534f",
  "VERY HIGH": "#ff6b6b",
  "NOT COVERED": "#919baf",
  "NOT CONFIGURED": "#919baf",
  DETECTED: "#FF9500",
  GUARDED: "#ffd93d",
  CAUTION: "#FF9500",
  RESTRICTED: "#ff6b6b",
  "NO DATA": "#919baf",
  UNKNOWN: "#919baf",
  UNAVAILABLE: "#919baf"
};

const MODULE_DEFINITIONS = [
  { key: "overview", name: "Overview", icon: faGlobe },
  { key: "groundEnvironment", name: "Local Conditions & Hazards", icon: faHouseUser },
  { key: "atmosphericEnvironment", name: "Atmospheric Environment", icon: faCloud },
  { key: "electromagneticEnvironment", name: "Space Weather", icon: faSun },
  { key: "temporalForensics", name: "Forecast & Outlook", icon: faClock }
];

const CONSOLE_VIEWS = [["alerts", "Alerts", faBell], ["violations", "Violations", faExclamationTriangle], ["sources", "Data Sources", faDatabase]];

const CONSOLE_LEVEL_OPTIONS = {
  alerts: [["all", "All"], ["unacknowledged", "Unacknowledged"], ["CRITICAL", "Critical"], ["WARNING", "Warning"], ["ADVISORY", "Advisory"], ["INFO", "Info"]],
  violations: [["all", "All"], ["unacknowledged", "Unacknowledged"], ["CRITICAL", "Critical"], ["WARNING", "Warning"], ["ADVISORY", "Advisory"]],
  sources: [["all", "All"], ["FAILED", "Failed"], ["DEGRADED", "Degraded"], ["PENDING", "Pending"], ["AVAILABLE", "Available"]]
};

const ALERT_SCOPE_OPTIONS = [["selected", "Alert For Selected Area"], ["areas", "Alert For All Areas"]];

const REFRESH_INTERVAL_OPTIONS = [[30000, "30 Seconds"], [60000, "1 Minute"], [300000, "5 Minutes"], [600000, "10 Minutes"]];

const renderEmptyState = (icon, message) => (
  <div className="disconnectedNoResults satEarthCondFullHeight">
    <div className="disconnectedNoResultCell">
      <FontAwesomeIcon icon={icon} size="5x" className="disconnectedNoResultsIcon" />
      <div className="disconnectedNoResultsText">{message}</div>
    </div>
  </div>
);

const CHART_FONT = "Inter, Arial, sans-serif";

const labelFor = (options, value) => (options.find(([v]) => v === value) || [null, ""])[1];

const valueFor = (options, label) => (options.find(([, l]) => l === label) || [options[0][0]])[0];


const DISPLAY_ACRONYMS = new Set(["OK", "UV", "AQI", "US", "EU", "UK", "UTC", "NWS", "NOAA", "USGS", "GDACS", "NHC", "SPC", "TFR", "TFRS", "NOTAM", "NOTAMS", "CAPE", "LI", "SST", "FWI", "ISI", "BUI", "FFMC", "DMC", "DC", "IFR", "VFR", "MVFR", "LIFR", "HF", "VHF", "UHF", "GPS", "TLE", "ISS", "SWPC", "NMDB", "METAR", "AM", "PM", "PM2.5", "PM10", "NO2", "SO2", "CO", "O3", "EPA", "CAMS", "ECMWF", "GFS", "ICON", "GEM", "ERA5", "WBGT", "SEP", "CME", "API", "AIS", "ADS-B", "OULU", "JUNG", "JUNG1", "NEWK", "KIEL2", "LMKS", "ATHN", "MXCO", "APTY", "KERG", "INVK", "FSMT", "THUL", "SOLAR1", "ACE", "IMAP", "DSCOVR", "GOES"]);
const DISPLAY_UNITS = new Set(["km", "m", "mm", "cm", "ms", "min", "nm", "kt", "kts", "s", "h", "hr", "hrs", "mb", "ppb", "ppm", "kg", "g", "mi", "ft", "mph", "deg", "pfu", "nt", "db", "days", "hours", "minutes", "percent", "baseline"]);
const DISPLAY_SMALL_WORDS = new Set(["a", "an", "the", "and", "or", "of", "in", "on", "at", "to", "for", "by", "with", "vs", "from", "per"]);

const formatDisplayValue = (value) => {
  if (typeof value !== "string") return value;
  const text = value.trim();
  if (!/[A-Za-z]/.test(text)) return value;
  const isEnum = /^[A-Z0-9_ /&().+-]+$/.test(text) && /[A-Z]{2}/.test(text);
  const isIdentifier = /^[a-z][a-z0-9]*(?:[_ ][a-z0-9]+)*$/.test(text) && !DISPLAY_UNITS.has(text);
  if (!isEnum && !isIdentifier) return value;
  return text.replace(/_/g, " ").split(/\s+/).map((word, index) => {
    const match = word.match(/^([^A-Za-z0-9]*)(.*?)([^A-Za-z0-9.]*)$/);
    const [, lead, core, trail] = match || ["", "", word, ""];
    const upper = core.toUpperCase();
    if (DISPLAY_ACRONYMS.has(upper)) return lead + upper + trail;
    if (/\d/.test(core) && !/^\d+[A-Za-z]+$/.test(core)) return lead + upper + trail;
    const lower = core.toLowerCase();
    if (index > 0 && DISPLAY_SMALL_WORDS.has(lower) && !lead) return lower + trail;
    return lead + lower.charAt(0).toUpperCase() + lower.slice(1) + trail;
  }).join(" ");
};

const DEFAULT_LAYOUT = { nav: true, header: true, sidebar: true, footer: true };

const LAYOUT_TOGGLES = [["nav", "Nav"], ["header", "Header"], ["sidebar", "Sidebar"], ["footer", "Footer"]];

const MODULE_NAMES = Object.fromEntries(MODULE_DEFINITIONS.map((module) => [module.key, module.name]));

const conditionStem = (text) => String(text || "").replace(/[-+]?\d[\d,]*(?:\.\d+)?(?:e[-+]?\d+)?/gi, "#").replace(/\s+/g, " ").trim().toLowerCase();

const conditionIdentity = (item) => (item.kind === "violation" ? `violation|${item.parameterId || item.parameter}|${item.source}` : `alert|${item.category}|${item.source}|${conditionStem(item.message)}`);

const conditionItemKey = (item) => item.key;

const conditionItemIdentity = (item) => item.identity;

const conditionSoundLevel = (item) => CONDITION_SOUND_LEVELS[item.severity] || null;

const conditionTitle = (item) => `${formatDisplayValue(item.severity)} | ${item.kind === "violation" ? item.parameter : formatDisplayValue(item.category || "Alert")}`;

const conditionSoundMessage = (item, ended) => ({
  title: ended ? `${conditionTitle(item)} Ended` : conditionTitle(item),
  body: `${item.message} ${item.placeLabel ? `(${item.placeLabel})` : ""}`.trim()
});

const isBellCondition = (item) => SOURCES.conditions.bellSeverities.includes(item.severity) && !(item.kind === "alert" && SOURCES.conditions.systemCategories.includes(item.category));

const isSystemCondition = (item) => item.kind === "alert" && SOURCES.conditions.systemCategories.includes(item.category);

const sortConditions = (list) => list.sort((a, b) => (CONDITION_SEVERITY_ORDER[a.severity] ?? 5) - (CONDITION_SEVERITY_ORDER[b.severity] ?? 5) || String(a.message).localeCompare(String(b.message)));

const normalizeCondition = (raw, kind, moduleKey) => {
  const item = { ...raw, kind, moduleKey, moduleName: MODULE_NAMES[moduleKey] || MODULE_NAMES.overview, level: raw.severity };
  item.identity = conditionIdentity(item);
  item.key = `${item.identity}|${item.severity}`;
  item.id = item.key;
  return item;
};

const mergeConditions = (groups) => {
  const merged = new Map();
  for (const { items, place } of groups) {
    for (const item of items) {
      const existing = merged.get(item.key);
      if (existing) {
        if (!existing.places.some((entry) => entry.label === place.label)) existing.places.push(place);
        continue;
      }
      merged.set(item.key, { ...item, places: [place] });
    }
  }
  return sortConditions(Array.from(merged.values()).map((item) => ({ ...item, placeLabel: item.places.map((entry) => entry.label).join(", ") })));
};

const detailLabel = (key) => key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());

const detailValue = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isInteger(value) ? value.toLocaleString() : Number(value.toFixed(3)).toLocaleString();
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return null;
  return formatDisplayValue(String(value));
};

const CONDITION_FIELD_LABELS = ["Severity", "Location", "Locations", "Coordinates", "Category", "Module", "Source", "Parameter", "Value", "Limit", "Deviation", "Criticality", "Reference", "Raised", "Status"];

const conditionFields = (item) => [
  ["Severity", formatDisplayValue(item.severity)],
  [item.places && item.places.length > 1 ? "Locations" : "Location", item.placeLabel],
  ["Coordinates", item.places && item.places.length === 1 && Number.isFinite(item.places[0].lat) ? `${item.places[0].lat.toFixed(4)}°, ${item.places[0].lon.toFixed(4)}°` : null],
  ["Category", item.category ? formatDisplayValue(item.category) : null],
  ["Module", item.moduleName],
  ["Source", item.source ? formatDisplayValue(item.source) : null],
  ["Parameter", item.parameter],
  ["Value", item.value],
  ["Limit", item.limit],
  ["Deviation", item.deviationPercent !== null && item.deviationPercent !== undefined ? `${item.deviationPercent}%` : null],
  ["Criticality", item.criticality ? formatDisplayValue(item.criticality) : null],
  ["Reference", item.limitSource],
  ["Raised", item.timestamp ? new Date(item.timestamp).toLocaleString() : null],
  ...Object.entries(item.details && typeof item.details === "object" ? item.details : {}).filter(([key]) => key !== "errorStack").map(([key, value]) => [`${detailLabel(key)}${CONDITION_FIELD_LABELS.includes(detailLabel(key)) ? " Detail" : ""}`, detailValue(value)])
];

const areaCenter = (area) => (area.mode === "point_radius" ? { lat: area.latitude, lon: area.longitude } : { lat: (area.min_lat + area.max_lat) / 2, lon: (area.min_lng + area.max_lng) / 2 });

const EXPANDABLE_SELECTOR = ".satEarthCondTableCard, .satEarthCondChartDescription, .satEarthCondStatusTileGrid, .satEarthCondGaugeStats, .satEarthCondStatsSummary";

const ResponsiveChart = ({ option, className, onExpand }) => {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(() => {
      try {
        chartRef.current?.getEchartsInstance()?.resize();
      } catch (error) {
        return;
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={containerRef} className={`satEarthCondChartWrapper ${onExpand ? "satEarthCondExpandable" : ""}`} onClick={onExpand}>
      <ReactEcharts ref={chartRef} option={option} className={className} autoResize={false} />
    </div>
  );
};

const ALERT_SOUND_LEVELS = ["notice", "warning", "critical", "emergency"];

const alternating = (low, high, steps, length, wave, gain) => Array.from({ length: steps }, (_, index) => ({ at: index * length, freq: index % 2 ? high : low, length: length * 0.92, wave, gain }));

const ALERT_SOUND_PATTERNS = {
  notice: [{ at: 0, freq: 880, length: 0.16, wave: "sine", gain: 0.45 }, { at: 0.2, freq: 1174.7, length: 0.3, wave: "sine", gain: 0.45 }],
  warning: [0, 0.75].flatMap((offset) => [659.3, 880, 1046.5].map((freq, index) => ({ at: offset + index * 0.16, freq, length: 0.15, wave: "triangle", gain: 0.6 }))),
  critical: alternating(740, 988, 10, 0.17, "square", 0.22),
  emergency: [...alternating(784, 1175, 12, 0.13, "sawtooth", 0.24), ...alternating(784, 1175, 12, 0.13, "sawtooth", 0.24).map((note) => ({ ...note, at: note.at + 1.9 }))]
};

const patternSeconds = (level) => (ALERT_SOUND_PATTERNS[level] || []).reduce((end, note) => Math.max(end, note.at + note.length), 0);

const createAlertSoundEngine = () => {
  let context = null;
  let master = null;
  let loopTimer = null;
  let loopState = null;
  let pending = null;
  const active = new Set();
  const ensure = () => {
    if (context) return context;
    const Context = typeof window !== "undefined" ? window.AudioContext || window.webkitAudioContext : null;
    if (!Context) return null;
    context = new Context();
    master = context.createGain();
    master.connect(context.destination);
    return context;
  };
  const unlock = async () => {
    const audio = ensure();
    if (!audio) return false;
    if (audio.state !== "running") {
      try {
        await audio.resume();
      } catch (error) {
        return false;
      }
    }
    if (audio.state === "running" && pending) {
      const queued = pending;
      pending = null;
      schedule(queued.level, queued.volume, audio.currentTime + 0.05);
    }
    if (audio.state === "running" && loopState) topUp();
    return audio.state === "running";
  };
  const ready = () => Boolean(context && context.state === "running");
  const schedule = (level, volume, start) => {
    const audio = ensure();
    const pattern = ALERT_SOUND_PATTERNS[level];
    if (!audio || !pattern || audio.state !== "running") return false;
    master.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), audio.currentTime);
    for (const note of pattern) {
      const oscillator = audio.createOscillator();
      const filter = audio.createBiquadFilter();
      const envelope = audio.createGain();
      const at = start + note.at;
      oscillator.type = note.wave;
      oscillator.frequency.setValueAtTime(note.freq, at);
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(2600, at);
      envelope.gain.setValueAtTime(0.0001, at);
      envelope.gain.exponentialRampToValueAtTime(note.gain, at + 0.015);
      envelope.gain.setValueAtTime(note.gain, at + note.length * 0.7);
      envelope.gain.exponentialRampToValueAtTime(0.0001, at + note.length);
      oscillator.connect(filter);
      filter.connect(envelope);
      envelope.connect(master);
      oscillator.onended = () => {
        active.delete(oscillator);
        envelope.disconnect();
      };
      active.add(oscillator);
      oscillator.start(at);
      oscillator.stop(at + note.length + 0.02);
    }
    return true;
  };
  const silenceAll = () => {
    for (const oscillator of active) {
      try {
        oscillator.stop(0);
      } catch (error) {
        active.delete(oscillator);
      }
    }
    active.clear();
  };
  const stop = () => {
    pending = null;
    if (loopTimer) clearInterval(loopTimer);
    loopTimer = null;
    loopState = null;
    silenceAll();
  };
  const play = (level, volume) => {
    stop();
    const audio = ensure();
    if (!audio) return false;
    if (audio.state === "running") return schedule(level, volume, audio.currentTime + 0.05);
    pending = { level, volume };
    audio.resume().then(() => {
      if (audio.state === "running" && pending) {
        const queued = pending;
        pending = null;
        schedule(queued.level, queued.volume, audio.currentTime + 0.05);
      }
    }).catch(() => null);
    return false;
  };
  const topUp = () => {
    const audio = ensure();
    if (!loopState || !audio) return;
    if (audio.state !== "running") {
      audio.resume().catch(() => null);
      return;
    }
    if (loopState.next < audio.currentTime) loopState.next = audio.currentTime + 0.05;
    const horizon = audio.currentTime + loopState.ahead;
    while (loopState.next <= horizon) {
      schedule(loopState.level, loopState.volume, loopState.next);
      loopState.next += loopState.every;
    }
  };
  const loop = (level, volume, everyMs, aheadSeconds, topUpMs) => {
    stop();
    const audio = ensure();
    if (!audio) return false;
    loopState = { level, volume, every: patternSeconds(level) + everyMs / 1000, ahead: aheadSeconds, next: audio.currentTime + 0.05 };
    topUp();
    loopTimer = setInterval(topUp, topUpMs);
    return true;
  };
  const looping = () => Boolean(loopState);
  const close = () => {
    stop();
    if (context) context.close().catch(() => null);
    context = null;
    master = null;
  };
  return { unlock, ready, play, loop, looping, stop, close };
};

const PAGE_LOAD_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const stateDBPromise = typeof indexedDB !== "undefined" ? openDB(SOURCES.persistence.dbName, 1, {
  upgrade(db) {
    db.createObjectStore(SOURCES.persistence.storeName, { keyPath: "id" });
  }
}) : null;

const saveStateToDB = async (state) => {
  try {
    const db = await stateDBPromise;
    if (db) await db.put(SOURCES.persistence.storeName, { id: SOURCES.persistence.recordId, data: state, savedAt: Date.now() });
  } catch { }
};

const clearStateFromDB = async () => {
  try {
    const db = await stateDBPromise;
    if (db) await db.delete(SOURCES.persistence.storeName, SOURCES.persistence.recordId);
  } catch { }
};

const loadStateFromDB = async () => {
  try {
    const db = await stateDBPromise;
    if (!db) return null;
    const record = await db.get(SOURCES.persistence.storeName, SOURCES.persistence.recordId);
    if (!record || !record.data) return null;
    const flag = sessionStorage.getItem(SOURCES.persistence.restoreFlag);
    if (flag && flag !== PAGE_LOAD_ID) {
      sessionStorage.removeItem(SOURCES.persistence.restoreFlag);
      await clearStateFromDB();
      return null;
    }
    sessionStorage.setItem(SOURCES.persistence.restoreFlag, PAGE_LOAD_ID);
    return record.data;
  } catch {
    return null;
  }
};

const showSystemNotification = (title, body, persistent) => {
  try {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const notification = new Notification(title, { body, tag: "alert-sound", renotify: true, requireInteraction: persistent });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (error) {
    return;
  }
};

const levelRank = (level) => ALERT_SOUND_LEVELS.indexOf(level);

const topQueueLevel = (queue) => queue.reduce((top, entry) => (!top || levelRank(entry.level) > levelRank(top) ? entry.level : top), null);

const useAlertSounds = ({ defaults, ready, items, inScope, scopeKey, ignoreLevel, getKey, getLevel, getId, describe, repeatMs, aheadSeconds, topUpMs }) => {
  const engineRef = useRef(null);
  const seenRef = useRef(null);
  const promptedRef = useRef(new Set());
  const queueRef = useRef([]);
  const scopeRef = useRef(inScope);
  scopeRef.current = inScope;
  const [settings, setSettings] = useState(defaults);
  const [unlocked, setUnlocked] = useState(false);
  const [queue, setQueue] = useState([]);
  const [testAlarm, setTestAlarm] = useState(null);
  if (!engineRef.current) engineRef.current = createAlertSoundEngine();
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const updateSettings = useCallback((patch) => {
    setSettings((current) => ({ ...current, ...patch }));
  }, []);

  const replaceSettings = useCallback((saved) => {
    setSettings({ ...defaults, ...(saved && typeof saved === "object" ? saved : {}) });
  }, [defaults]);

  const unlock = useCallback(async () => {
    const ok = await engineRef.current.unlock();
    setUnlocked(ok);
    return ok;
  }, []);

  useEffect(() => {
    if (!settings.enabled || unlocked) return undefined;
    const handler = () => {
      unlock();
    };
    window.addEventListener("pointerdown", handler);
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("keydown", handler);
    };
  }, [settings.enabled, unlocked, unlock]);

  useEffect(() => () => engineRef.current && engineRef.current.stop(), []);

  const snoozed = settings.snoozeUntil > Date.now();

  useEffect(() => {
    if (!settings.snoozeUntil) return undefined;
    const wait = settings.snoozeUntil - Date.now();
    if (wait <= 0) {
      updateSettings({ snoozeUntil: 0 });
      return undefined;
    }
    const timer = setTimeout(() => updateSettings({ snoozeUntil: 0 }), Math.min(wait, 2147483000));
    return () => clearTimeout(timer);
  }, [settings.snoozeUntil, updateSettings]);

  const syncLoop = useCallback((list) => {
    const engine = engineRef.current;
    const current = settingsRef.current;
    if (!list.length) {
      engine.stop();
      return;
    }
    if (current.mode === "persistent") engine.loop(topQueueLevel(list), current.volume, repeatMs, aheadSeconds, topUpMs);
  }, [repeatMs, aheadSeconds, topUpMs]);

  const commitQueue = useCallback((list) => {
    queueRef.current = list;
    setQueue(list);
  }, []);

  const acknowledge = useCallback((key) => {
    const before = queueRef.current;
    const next = before.filter((entry) => entry.key !== key);
    commitQueue(next);
    if (!next.length) engineRef.current.stop();
    else if (topQueueLevel(next) !== topQueueLevel(before)) syncLoop(next);
  }, [commitQueue, syncLoop]);

  const acknowledgeAll = useCallback(() => {
    commitQueue([]);
    setTestAlarm(null);
    engineRef.current.stop();
  }, [commitQueue]);

  const silence = useCallback(() => {
    setTestAlarm(null);
    engineRef.current.stop();
    if (queueRef.current.length) syncLoop(queueRef.current);
  }, [syncLoop]);

  const snooze = useCallback((minutes) => {
    acknowledgeAll();
    updateSettings({ snoozeUntil: minutes > 0 ? Date.now() + minutes * 60000 : 0 });
  }, [acknowledgeAll, updateSettings]);

  const test = useCallback(async (level) => {
    if (!(await unlock())) return;
    const persistent = settings.mode === "persistent";
    if (persistent) engineRef.current.loop(level, settings.volume, repeatMs, aheadSeconds, topUpMs);
    else engineRef.current.play(level, settings.volume);
    setTestAlarm({ level, persistent, at: Date.now() });
  }, [unlock, settings.mode, settings.volume, repeatMs, aheadSeconds, topUpMs]);

  const toggle = useCallback(async () => {
    if (settings.enabled) {
      acknowledgeAll();
      updateSettings({ enabled: false });
      return;
    }
    seenRef.current = null;
    promptedRef.current = new Set();
    updateSettings({ enabled: true });
    if (typeof Notification !== "undefined" && Notification.permission === "default") Notification.requestPermission().catch(() => null);
    if (await unlock()) engineRef.current.play("notice", settings.volume);
  }, [settings.enabled, settings.volume, acknowledgeAll, updateSettings, unlock]);

  useEffect(() => {
    if (!items) return;
    const keys = new Map();
    for (const item of items) {
      const level = getLevel(item);
      if (level) keys.set(getKey(item), { item, level });
    }
    if (!settings.enabled || !ready) {
      seenRef.current = null;
      promptedRef.current = new Set();
      return;
    }
    const previous = seenRef.current || new Map();
    seenRef.current = keys;
    const prompted = promptedRef.current;
    const floor = ignoreLevel ? -1 : levelRank(settings.minLevel);
    const counts = (entry) => levelRank(entry.level) >= floor && (!scopeRef.current || scopeRef.current(entry.item, settings.scope));
    for (const key of Array.from(prompted)) if (!keys.has(key)) prompted.delete(key);
    if (snoozed) {
      for (const [key, entry] of keys.entries()) if (counts(entry)) prompted.add(key);
      return;
    }
    const kept = queueRef.current.filter((entry) => {
      if (entry.ended) return true;
      const current = keys.get(entry.key);
      if (current && counts(current)) return true;
      prompted.delete(entry.key);
      return false;
    });
    const previousIds = new Set(Array.from(previous.values()).map((entry) => getId(entry.item)));
    const added = [];
    const now = Date.now();
    for (const [key, entry] of keys.entries()) {
      if (prompted.has(key) || !counts(entry)) continue;
      prompted.add(key);
      const id = getId(entry.item);
      added.push({ key, id, item: entry.item, level: entry.level, ended: false, updated: previousIds.has(id) && !previous.has(key), at: now, message: describe ? describe(entry.item, false) : null });
    }
    const liveIds = new Set(Array.from(keys.values()).map((entry) => getId(entry.item)));
    for (const [key, entry] of previous.entries()) {
      if (keys.has(key) || !counts(entry) || liveIds.has(getId(entry.item))) continue;
      added.push({ key: `${key}|ended`, id: getId(entry.item), item: entry.item, level: ALERT_SOUND_LEVELS[0], ended: true, updated: false, at: now, message: describe ? describe(entry.item, true) : null });
    }
    if (!added.length) {
      if (kept.length !== queueRef.current.length) {
        commitQueue(kept);
        if (!kept.length) engineRef.current.stop();
        else syncLoop(kept);
      }
      return;
    }
    const addedIds = new Set(added.map((entry) => entry.id));
    const merged = [...kept.filter((entry) => !addedIds.has(entry.id)), ...added];
    commitQueue(merged);
    const persistent = settings.mode === "persistent";
    if (persistent) syncLoop(merged);
    else engineRef.current.play(topQueueLevel(added), settings.volume);
    const lead = added.reduce((top, entry) => (!top || levelRank(entry.level) > levelRank(top.level) ? entry : top), null);
    if (added.length === 1 && lead.message) showSystemNotification(lead.message.title, lead.message.body, persistent);
    else showSystemNotification(`${added.length} Condition Changes`, added.map((entry) => (entry.message ? entry.message.body : "")).filter(Boolean).slice(0, 4).join("; "), persistent);
  }, [items, ready, snoozed, scopeKey, settings.enabled, settings.minLevel, settings.volume, settings.mode, settings.scope, getKey, getLevel, getId, describe, commitQueue, syncLoop]);

  useEffect(() => {
    if (!testAlarm || testAlarm.persistent) return undefined;
    const timer = setTimeout(() => setTestAlarm(null), 15000);
    return () => clearTimeout(timer);
  }, [testAlarm]);

  useEffect(() => {
    const list = queueRef.current;
    if (!list.length) return;
    if (settings.mode === "single") engineRef.current.stop();
    else syncLoop(list);
  }, [settings.mode, settings.volume, syncLoop]);

  const alarm = testAlarm ? { ...testAlarm, test: true } : queue.length ? { level: topQueueLevel(queue), item: queue[0].item, persistent: settings.mode === "persistent", count: queue.length } : null;

  return { settings, updateSettings, replaceSettings, unlocked, alarm, queue, snoozed, acknowledge, acknowledgeAll, silence, snooze, toggle, test };
};

const INITIAL_AREA_FORM = {
  mode: "point_radius",
  name: "",
  address: "",
  latitude: "",
  longitude: "",
  radius_km: "100",
  min_lat: "",
  max_lat: "",
  min_lng: "",
  max_lng: ""
};

const describeArea = (area) => {
  if (!area) return null;
  const name = area.name && area.name.trim() ? area.name.trim() : null;
  if (area.mode === "point_radius") return name || `${area.latitude.toFixed(3)}°, ${area.longitude.toFixed(3)}° · ${area.radius_km}km`;
  if (area.mode === "bbox") return name || `BBox ${area.min_lat.toFixed(2)}/${area.min_lng.toFixed(2)} → ${area.max_lat.toFixed(2)}/${area.max_lng.toFixed(2)}`;
  return name || "Area";
};

const SUGGESTION_CACHE = new Map();

const toSuggestion = (feature) => {
  const p = feature.properties || {};
  const coordinates = (feature.geometry && feature.geometry.coordinates) || [];
  const longitude = Number(coordinates[0]);
  const latitude = Number(coordinates[1]);
  const street = [p.housenumber, p.street].filter(Boolean).join(" ");
  const city = p.city || p.town || p.village || p.district || p.locality || p.county || "";
  const placeName = p.name && p.name !== street ? p.name : "";
  const primary = street || placeName || city || p.state || p.country || "";
  const secondary = [
    street && placeName ? placeName : null,
    city && city !== primary ? city : null,
    p.state && p.state !== primary ? p.state : null,
    p.postcode || null,
    p.country && p.country !== primary ? p.country : null
  ].filter(Boolean).join(", ");
  return {
    id: `${p.osm_type || ""}${p.osm_id || ""}_${latitude}_${longitude}`,
    primary,
    secondary,
    label: [primary, secondary].filter(Boolean).join(", "),
    latitude,
    longitude,
    street: street || (p.osm_key === "highway" ? p.name || "" : ""),
    city,
    state: p.state || "",
    country: p.country || "",
    postalCode: p.postcode || ""
  };
};

const fetchSuggestions = async (query, bias, signal) => {
  const biasKey = bias ? `${bias.latitude.toFixed(1)},${bias.longitude.toFixed(1)}` : "";
  const key = `${query.toLowerCase()}|${biasKey}`;
  if (SUGGESTION_CACHE.has(key)) return SUGGESTION_CACHE.get(key);
  const params = new URLSearchParams({ q: query, limit: String(SOURCES.geocoding.resultLimit), lang: "en" });
  if (bias) {
    params.set("lat", String(bias.latitude));
    params.set("lon", String(bias.longitude));
  }
  const response = await fetch(`${SOURCES.geocoding.photon}?${params.toString()}`, { signal });
  if (!response.ok) throw new Error(`The address service returned status ${response.status}.`);
  const data = await response.json();
  const seen = new Set();
  const results = (data.features || [])
    .map(toSuggestion)
    .filter((suggestion) => suggestion.primary && Number.isFinite(suggestion.latitude) && Number.isFinite(suggestion.longitude))
    .filter((suggestion) => {
      if (seen.has(suggestion.label)) return false;
      seen.add(suggestion.label);
      return true;
    });
  if (SUGGESTION_CACHE.size >= SOURCES.geocoding.cacheLimit) SUGGESTION_CACHE.delete(SUGGESTION_CACHE.keys().next().value);
  SUGGESTION_CACHE.set(key, results);
  return results;
};

const AddressAutocomplete = ({ value, onChange, onSelect, placeholder, className, style, bias, onKeyDown }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchedQuery, setSearchedQuery] = useState("");
  const [highlight, setHighlight] = useState(-1);
  const abortRef = useRef(null);
  const timerRef = useRef(null);
  const skipNextRef = useRef(false);
  const biasLatitude = bias ? Number(bias.latitude) : NaN;
  const biasLongitude = bias ? Number(bias.longitude) : NaN;
  const query = (value || "").trim();

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (skipNextRef.current) {
      skipNextRef.current = false;
      return undefined;
    }
    if (query.length < SOURCES.geocoding.minQueryLength) {
      if (abortRef.current) abortRef.current.abort();
      setSuggestions([]);
      setLoading(false);
      setError("");
      setSearchedQuery("");
      return undefined;
    }
    timerRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError("");
      try {
        const biasPoint = Number.isFinite(biasLatitude) && Number.isFinite(biasLongitude) ? { latitude: biasLatitude, longitude: biasLongitude } : null;
        const results = await fetchSuggestions(query, biasPoint, controller.signal);
        if (controller.signal.aborted) return;
        setSuggestions(results);
        setHighlight(results.length ? 0 : -1);
        setSearchedQuery(query);
      } catch (fetchError) {
        if (fetchError.name === "AbortError") return;
        setSuggestions([]);
        setSearchedQuery(query);
        setError("Address suggestions are unavailable right now.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, SOURCES.geocoding.debounceMs);
    return () => clearTimeout(timerRef.current);
  }, [query, biasLatitude, biasLongitude]);

  useEffect(() => () => {
    clearTimeout(timerRef.current);
    if (abortRef.current) abortRef.current.abort();
  }, []);

  const choose = (suggestion) => {
    skipNextRef.current = true;
    setOpen(false);
    setSuggestions([]);
    setSearchedQuery("");
    onChange(suggestion.label);
    if (onSelect) onSelect(suggestion);
  };

  const handleKeyDown = (event) => {
    const menuVisible = open && suggestions.length > 0;
    if (menuVisible && event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((previous) => (previous + 1) % suggestions.length);
      return;
    }
    if (menuVisible && event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((previous) => (previous <= 0 ? suggestions.length - 1 : previous - 1));
      return;
    }
    if (menuVisible && event.key === "Enter" && highlight >= 0) {
      event.preventDefault();
      choose(suggestions[highlight]);
      return;
    }
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (onKeyDown) onKeyDown(event);
  };

  const showMenu = open && query.length >= SOURCES.geocoding.minQueryLength && (loading || error || suggestions.length > 0 || searchedQuery === query);

  return (
    <div className="satWeatherAddressAutocomplete" style={style}>
      <input
        type="text"
        className={className}
        value={value || ""}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        role="combobox"
        aria-expanded={showMenu}
        aria-autocomplete="list"
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
      />
      {showMenu && (
        <div className="satWeatherAddressAutocompleteMenu" role="listbox">
          {loading && suggestions.length === 0 && (
            <div className="satWeatherAddressAutocompleteStatus">
              <FontAwesomeIcon icon={faSpinner} spin />
            </div>
          )}
          {!loading && error && (
            <div className="satWeatherAddressAutocompleteStatus satWeatherAddressAutocompleteError">
              <FontAwesomeIcon icon={faTriangleExclamation} />
              <span>{error}</span>
            </div>
          )}
          {!loading && !error && suggestions.length === 0 && (
            <div className="satWeatherAddressAutocompleteStatus">
              <span>No Matching Addresses</span>
            </div>
          )}
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              type="button"
              role="option"
              aria-selected={index === highlight}
              className={`satWeatherAddressAutocompleteItem${index === highlight ? " satWeatherAddressAutocompleteItemActive" : ""}`}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setHighlight(index)}
              onClick={() => choose(suggestion)}
            >
              <FontAwesomeIcon icon={faLocationDot} className="satWeatherAddressAutocompleteIcon" />
              <span className="satWeatherAddressAutocompleteText">
                <span className="satWeatherAddressAutocompletePrimary">{suggestion.primary}</span>
                {suggestion.secondary && <span className="satWeatherAddressAutocompleteSecondary">{suggestion.secondary}</span>}
              </span>
            </button>
          ))}
          <div className="satWeatherAddressAutocompleteAttribution">{SOURCES.geocoding.attribution}</div>
        </div>
      )}
    </div>
  );
};

const AreaModal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return createPortal(
    <div className="satWeatherModalOverlay" onClick={onClose}>
      <div className="satWeatherModal" onClick={(event) => event.stopPropagation()}>
        <div className="satWeatherModalHeader">
          <span>{title}</span>
          <button className="satWeatherModalClose" onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        <div className="satWeatherModalContent">{children}</div>
      </div>
    </div>,
    document.body
  );
};

const PICKER_APPLE_ZOOM_THRESHOLD = 6;
const PICKER_MAPKIT_TOKEN = SOURCES.assets.mapkitToken;

const loadExternalCss = (href, id) => {
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
};

const loadExternalScript = (src, id, isReady) => new Promise((resolve, reject) => {
  if (isReady()) {
    resolve();
    return;
  }
  const existing = document.getElementById(id) || document.querySelector(`script[src="${src}"]`);
  const script = existing || document.createElement("script");
  const timeout = setTimeout(() => reject(new Error(`The script ${src} took too long to load.`)), 15000);
  script.addEventListener("load", () => {
    clearTimeout(timeout);
    resolve();
  });
  script.addEventListener("error", () => {
    clearTimeout(timeout);
    reject(new Error(`The script ${src} failed to load.`));
  });
  if (!existing) {
    script.id = id;
    script.src = src;
    script.async = true;
    document.head.appendChild(script);
  }
});

const loadPickerMapLibre = async () => {
  loadExternalCss(SOURCES.assets.maplibreCss, "maplibre-css");
  await loadExternalScript(SOURCES.assets.maplibreScript, "maplibre-script", () => Boolean(window.maplibregl));
  return window.maplibregl;
};

const loadPickerMapKit = async () => {
  if (!PICKER_MAPKIT_TOKEN) throw new Error("VITE_APPLE_MAPS_KEY is not configured.");
  await loadExternalScript(SOURCES.assets.mapkitScript, "apple-mapkit-script", () => Boolean(window.mapkit));
  if (!window.__dinoMapkitInitialized) {
    try {
      window.mapkit.init({ authorizationCallback: done => done(PICKER_MAPKIT_TOKEN) });
    } catch (error) {
      if (!/already/i.test(error.message || "")) throw error;
    }
    window.__dinoMapkitInitialized = true;
  }
  return window.mapkit;
};

const pickerZoomToSpan = (zoom) => 360 / Math.pow(2, zoom);
const pickerSpanToZoom = (span) => Math.max(0, Math.min(Math.log2(360 / Math.max(span, 0.0001)), 22));

const LocationPickerModal = ({ initialLat, initialLon, initialLabel, onCancel, onConfirm }) => {
  const libreContainerRef = useRef(null);
  const appleContainerRef = useRef(null);
  const libreMapRef = useRef(null);
  const appleMapRef = useRef(null);
  const libreMarkerRef = useRef(null);
  const appleMarkerRef = useRef(null);
  const providerRef = useRef("maplibre");
  const appleReadyRef = useRef(false);
  const switchingRef = useRef(false);
  const pointerDownRef = useRef(null);
  const pickRef = useRef(null);
  const [provider, setProvider] = useState("maplibre");
  const [picked, setPicked] = useState({ lat: initialLat, lon: initialLon, label: initialLabel || null });
  const [labelLoading, setLabelLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searchStatus, setSearchStatus] = useState("");
  const [mapStatus, setMapStatus] = useState("Loading Map");
  const [locating, setLocating] = useState(false);
  const [latText, setLatText] = useState(initialLat === null || initialLat === undefined ? "" : String(initialLat));
  const [lonText, setLonText] = useState(initialLon === null || initialLon === undefined ? "" : String(initialLon));
  const typedLat = parseFloat(latText);
  const typedLon = parseFloat(lonText);
  const typedValid = Number.isFinite(typedLat) && Number.isFinite(typedLon) && typedLat >= -90 && typedLat <= 90 && typedLon >= -180 && typedLon <= 180;

  const switchProvider = useCallback((target, lat, lon, zoom) => {
    if (switchingRef.current || providerRef.current === target) return;
    switchingRef.current = true;
    providerRef.current = target;
    setProvider(target);
    if (target === "apple" && appleMapRef.current && window.mapkit) {
      const span = pickerZoomToSpan(zoom);
      appleMapRef.current.setRegionAnimated(new window.mapkit.CoordinateRegion(new window.mapkit.Coordinate(lat, lon), new window.mapkit.CoordinateSpan(span, span)), false);
    } else if (target === "maplibre" && libreMapRef.current) {
      libreMapRef.current.jumpTo({ center: [lon, lat], zoom });
      setTimeout(() => libreMapRef.current?.resize(), 0);
    }
    setTimeout(() => { switchingRef.current = false; }, 300);
  }, []);

  const flyTo = useCallback((lat, lon, zoom) => {
    if (zoom >= PICKER_APPLE_ZOOM_THRESHOLD && appleReadyRef.current) {
      if (providerRef.current !== "apple") switchProvider("apple", lat, lon, zoom);
      else if (appleMapRef.current && window.mapkit) {
        const span = pickerZoomToSpan(zoom);
        appleMapRef.current.setRegionAnimated(new window.mapkit.CoordinateRegion(new window.mapkit.Coordinate(lat, lon), new window.mapkit.CoordinateSpan(span, span)), true);
      }
      return;
    }
    if (providerRef.current !== "maplibre") switchProvider("maplibre", lat, lon, zoom);
    else libreMapRef.current?.flyTo({ center: [lon, lat], zoom, duration: 1200 });
  }, [switchProvider]);

  const placeMarkers = useCallback((lat, lon) => {
    if (libreMapRef.current && window.maplibregl) {
      if (!libreMarkerRef.current) {
        const element = document.createElement("div");
        element.className = "satEarthCondPickerMarker";
        libreMarkerRef.current = new window.maplibregl.Marker({ element }).setLngLat([lon, lat]).addTo(libreMapRef.current);
      } else {
        libreMarkerRef.current.setLngLat([lon, lat]);
      }
    }
    if (appleMapRef.current && window.mapkit) {
      if (appleMarkerRef.current) appleMapRef.current.removeAnnotation(appleMarkerRef.current);
      appleMarkerRef.current = new window.mapkit.MarkerAnnotation(new window.mapkit.Coordinate(lat, lon), { color: "#4ecdc4", glyphColor: "#08090c", title: "Selected Location" });
      appleMapRef.current.addAnnotation(appleMarkerRef.current);
    }
  }, []);

  const lookupLabel = useCallback(async (lat, lon) => {
    setLabelLoading(true);
    const finish = (label) => {
      setPicked(prev => (prev.lat === lat && prev.lon === lon ? { ...prev, label } : prev));
      setLabelLoading(false);
    };
    if (window.mapkit && window.__dinoMapkitInitialized) {
      try {
        new window.mapkit.Geocoder({ language: "en-US" }).reverseLookup(new window.mapkit.Coordinate(lat, lon), (error, data) => {
          const place = data?.results?.[0];
          if (!error && place) {
            finish([place.locality, place.administrativeArea, place.country].filter(Boolean).join(", ") || place.formattedAddress || null);
          } else {
            fetchBackendLabel(lat, lon).then(finish);
          }
        });
        return;
      } catch (error) {
        finish(await fetchBackendLabel(lat, lon));
        return;
      }
    }
    finish(await fetchBackendLabel(lat, lon));
  }, []);

  const fetchBackendLabel = async (lat, lon) => {
    try {
      const response = await fetch(`${apiUrl("reverseGeocode")}?lat=${lat}&lon=${lon}`);
      if (!response.ok) return null;
      const data = await response.json();
      return data.label || null;
    } catch (error) {
      return null;
    }
  };

  const pickPoint = useCallback((lat, lon, label = null) => {
    const roundedLat = parseFloat(lat.toFixed(4));
    const roundedLon = parseFloat((((lon + 540) % 360) - 180).toFixed(4));
    setPicked({ lat: roundedLat, lon: roundedLon, label });
    setLatText(String(roundedLat));
    setLonText(String(roundedLon));
    placeMarkers(roundedLat, roundedLon);
    if (!label) lookupLabel(roundedLat, roundedLon);
  }, [placeMarkers, lookupLabel]);

  useEffect(() => {
    pickRef.current = pickPoint;
  }, [pickPoint]);

  useEffect(() => {
    let cancelled = false;
    const handleKey = (event) => { if (event.key === "Escape") onCancel(); };
    window.addEventListener("keydown", handleKey);
    const pickerHost = libreContainerRef.current?.parentElement || null;
    const claimWheel = (event) => { event.preventDefault(); };
    pickerHost?.addEventListener("wheel", claimWheel, { passive: false, capture: true });
    loadPickerMapLibre().then(maplibregl => {
      if (cancelled || !libreContainerRef.current) return;
      const map = new maplibregl.Map({
        container: libreContainerRef.current,
        style: {
          version: 8,
          sources: {
            "satellite-tiles": { type: "raster", tiles: [SOURCES.assets.satelliteTiles], tileSize: 256, maxzoom: 19, attribution: "Tiles © Esri" },
            "labels-tiles": { type: "raster", tiles: [SOURCES.assets.labelTiles], tileSize: 256, maxzoom: 19 }
          },
          layers: [
            { id: "satellite-layer", type: "raster", source: "satellite-tiles" },
            { id: "labels-layer", type: "raster", source: "labels-tiles", paint: { "raster-opacity": 0.9 } }
          ]
        },
        center: [initialLon, initialLat],
        zoom: 4,
        minZoom: 1,
        maxZoom: 18,
        antialias: true
      });
      map.addControl(new maplibregl.NavigationControl(), "top-right");
      map.addControl(new maplibregl.ScaleControl(), "bottom-left");
      map.on("load", () => {
        setMapStatus("");
        pickRef.current?.(initialLat, initialLon, initialLabel || null);
      });
      map.on("mousedown", event => { pointerDownRef.current = { x: event.originalEvent.clientX, y: event.originalEvent.clientY }; });
      map.on("click", event => {
        const down = pointerDownRef.current;
        if (down && Math.hypot(event.originalEvent.clientX - down.x, event.originalEvent.clientY - down.y) > 8) return;
        pickRef.current?.(event.lngLat.lat, event.lngLat.lng);
      });
      map.on("moveend", () => {
        if (providerRef.current !== "maplibre") return;
        const center = map.getCenter();
        if (map.getZoom() >= PICKER_APPLE_ZOOM_THRESHOLD && appleReadyRef.current && !switchingRef.current) switchProvider("apple", center.lat, center.lng, map.getZoom());
      });
      libreMapRef.current = map;
    }).catch(() => { if (!cancelled) setMapStatus("The map could not be loaded."); });
    loadPickerMapKit().then(mapkit => {
      if (cancelled || !appleContainerRef.current) return;
      const map = new mapkit.Map(appleContainerRef.current, {
        mapType: mapkit.Map.MapTypes.Hybrid,
        colorScheme: mapkit.Map.ColorSchemes.Dark,
        showsCompass: mapkit.FeatureVisibility.Visible,
        showsZoomControl: true,
        showsScale: mapkit.FeatureVisibility.Visible,
        showsMapTypeControl: false,
        showsUserLocationControl: true,
        showsPointsOfInterest: true,
        isRotationEnabled: true
      });
      map.addEventListener("region-change-end", () => {
        if (providerRef.current !== "apple" || switchingRef.current) return;
        const zoom = pickerSpanToZoom(map.region.span.latitudeDelta);
        if (zoom < PICKER_APPLE_ZOOM_THRESHOLD) switchProvider("maplibre", map.center.latitude, map.center.longitude, zoom);
      });
      const element = appleContainerRef.current;
      element.addEventListener("mousedown", event => { pointerDownRef.current = { x: event.clientX, y: event.clientY }; });
      element.addEventListener("mouseup", event => {
        if (providerRef.current !== "apple") return;
        const down = pointerDownRef.current;
        if (!down || Math.hypot(event.clientX - down.x, event.clientY - down.y) > 8) return;
        if (event.target.closest && event.target.closest(".mk-controls-container, .mk-annotation-container button, .mk-bottom-controls-container, .mk-top-controls-container")) return;
        const coordinate = map.convertPointOnPageToCoordinate(new DOMPoint(event.clientX, event.clientY));
        if (coordinate) pickRef.current?.(coordinate.latitude, coordinate.longitude);
      });
      appleMapRef.current = map;
      appleReadyRef.current = true;
      const current = libreMapRef.current;
      if (current && current.getZoom() >= PICKER_APPLE_ZOOM_THRESHOLD) {
        const center = current.getCenter();
        switchProvider("apple", center.lat, center.lng, current.getZoom());
      }
    }).catch(() => { appleReadyRef.current = false; });
    return () => {
      cancelled = true;
      window.removeEventListener("keydown", handleKey);
      pickerHost?.removeEventListener("wheel", claimWheel, { capture: true });
      try { libreMapRef.current?.remove(); } catch (error) { libreMapRef.current = null; }
      try { appleMapRef.current?.destroy(); } catch (error) { appleMapRef.current = null; }
      libreMapRef.current = null;
      appleMapRef.current = null;
      libreMarkerRef.current = null;
      appleMarkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (appleMapRef.current && window.mapkit && picked.lat !== null && picked.lat !== undefined) placeMarkers(picked.lat, picked.lon);
  }, [provider]);

  const runSearch = useCallback(async () => {
    const text = query.trim();
    if (text.length < 2) {
      setSearchStatus("Enter at least 2 characters to search.");
      setResults([]);
      return;
    }
    setSearchStatus("Searching");
    const useBackend = async () => {
      try {
        const response = await fetch(`${apiUrl("locationSearch")}?query=${encodeURIComponent(text)}`);
        const data = response.ok ? await response.json() : { results: [] };
        const mapped = (data.results || []).map(r => ({ label: r.label, lat: r.latitude, lon: r.longitude }));
        setResults(mapped);
        setSearchStatus(mapped.length ? "" : "No places matched that search.");
      } catch (error) {
        setResults([]);
        setSearchStatus("The location search is unavailable right now.");
      }
    };
    if (window.mapkit && window.__dinoMapkitInitialized) {
      try {
        new window.mapkit.Search({ language: "en-US" }).search(text, (error, data) => {
          if (error || !data?.places?.length) {
            useBackend();
            return;
          }
          setResults(data.places.slice(0, 6).map(p => ({ label: [p.name, p.formattedAddress].filter(Boolean).join(", "), lat: p.coordinate.latitude, lon: p.coordinate.longitude })));
          setSearchStatus("");
        });
        return;
      } catch (error) {
        await useBackend();
        return;
      }
    }
    await useBackend();
  }, [query]);

  const chooseResult = (result) => {
    pickPoint(result.lat, result.lon, result.label);
    flyTo(result.lat, result.lon, 10);
    setResults([]);
    setQuery("");
    setSearchStatus("");
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setSearchStatus("This browser does not support location access.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(position => {
      setLocating(false);
      pickPoint(position.coords.latitude, position.coords.longitude);
      flyTo(position.coords.latitude, position.coords.longitude, 11);
    }, () => {
      setLocating(false);
      setSearchStatus("Your location could not be determined. Check the browser's location permission.");
    }, { enableHighAccuracy: true, timeout: 10000 });
  };

  return (
    <div className="satEarthCondModalOverlay" onClick={onCancel}>
      <div className="satEarthCondModal satEarthCondPickerModal" onClick={(event) => event.stopPropagation()}>
        <div className="satEarthCondModalHeader">
          <h4 className="satEarthCondModalTitle">Choose Location</h4>
          <button type="button" className="satEarthCondModalClose" onClick={onCancel} aria-label="Close">
            <FontAwesomeIcon icon={faXmarkSquare} />
          </button>
        </div>
        <div className="satEarthCondPickerToolbar">
          <div className="satEarthCondPickerSearch">
            <input
              type="text"
              placeholder="Search Places"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") runSearch(); }}
              className="satEarthCondInput"
            />
            {results.length > 0 && (
              <div className="satEarthCondPickerResults">
                {results.map((result, index) => (
                  <button key={`${result.lat}_${result.lon}_${index}`} type="button" className="satEarthCondPickerResult" onClick={() => chooseResult(result)}>
                    <span className="satEarthCondPickerResultName">{result.label}</span>
                    <span className="satEarthCondPickerResultCoords">{result.lat.toFixed(3)}, {result.lon.toFixed(3)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="button" className="satEarthCondBtn satEarthCondBtnSecondary" onClick={runSearch}>
            <FontAwesomeIcon icon={faSearchPlus} /> Search
          </button>
          <button type="button" className="satEarthCondBtn satEarthCondBtnSecondary" onClick={useMyLocation} disabled={locating}>
            <FontAwesomeIcon icon={locating ? faSpinner : faMapMarkerAlt} spin={locating} /> My Location
          </button>
          {searchStatus && <span className="satEarthCondPickerStatus">{searchStatus}</span>}
        </div>
        <div className="satEarthCondPickerToolbar satWeatherPickerCoords">
          <label className="satWeatherPickerCoordField">
            <span>Latitude</span>
            <input type="number" step="0.0001" min="-90" max="90" value={latText} onChange={(event) => setLatText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && typedValid) { pickPoint(typedLat, typedLon); flyTo(typedLat, typedLon, 9); } }} className="satEarthCondInput" placeholder="-90 To 90" />
          </label>
          <label className="satWeatherPickerCoordField">
            <span>Longitude</span>
            <input type="number" step="0.0001" min="-180" max="180" value={lonText} onChange={(event) => setLonText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && typedValid) { pickPoint(typedLat, typedLon); flyTo(typedLat, typedLon, 9); } }} className="satEarthCondInput" placeholder="-180 To 180" />
          </label>
          <button type="button" className="satEarthCondBtn satEarthCondBtnSecondary" disabled={!typedValid} onClick={() => { pickPoint(typedLat, typedLon); flyTo(typedLat, typedLon, 9); }}>
            <FontAwesomeIcon icon={faMapMarkerAlt} /> Go To Coordinates
          </button>
        </div>
        <div className="satEarthCondPickerMap">
          <div ref={libreContainerRef} className="satEarthCondPickerCanvas" style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, width: "100%", height: "100%", display: provider === "maplibre" ? "block" : "none" }} />
          <div ref={appleContainerRef} className="satEarthCondPickerCanvas" style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, width: "100%", height: "100%", display: provider === "apple" ? "block" : "none" }} />
          {mapStatus && <div className="satEarthCondPickerOverlayStatus">{mapStatus}</div>}
          <div className="satEarthCondPickerHint">Click Anywhere To Drop A Pin</div>
        </div>
        <div className="satEarthCondPickerFooter">
          <div className="satEarthCondPickerSelection">
            <span className="satEarthCondPickerSelectionLabel">Selected Location</span>
            <span className="satEarthCondPickerSelectionValue">
              {labelLoading ? "Looking Up Place Name" : picked.label || "Unnamed Location"}
            </span>
            <span className="satEarthCondPickerSelectionCoords">
              {picked.lat !== null && picked.lat !== undefined ? `${picked.lat.toFixed(4)}°, ${picked.lon.toFixed(4)}°` : "—"}
            </span>
          </div>
          <div className="satEarthCondPickerActions">
            <button type="button" className="satEarthCondBtn satEarthCondBtnSecondary" onClick={onCancel}>Cancel</button>
            <button type="button" className="satEarthCondBtn satEarthCondBtnSecondary" onClick={() => onConfirm(picked)} disabled={picked.lat === null || picked.lat === undefined}>
              <FontAwesomeIcon icon={faSquareCheck} /> Use This Location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const csvQuote = (val) => {
  const s = String(val === null || val === undefined ? "" : val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return `"${s}"`;
};

const titleCaseWords = (text) => String(text || "").replace(/[_-]+/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());

const LEAD_STATUS_TABS = [["new", "New"], ["reviewing", "Reviewing"], ["adopted", "Adopted"], ["dismissed", "Dismissed"], ["all", "All"]];

const LEAD_KINDS = { auth: { label: "Authentication", color: "#ff6b6b" }, key: { label: "API Key", color: "#FF9500" }, api: { label: "API", color: "#42a5f5" }, catalog: { label: "Catalog", color: "#4ecdc4" }, feed: { label: "Feed", color: "#7fe9e1" }, stream: { label: "Stream", color: "#ffd93d" }, host: { label: "New Host", color: "#cdd4e4" } };

const splitWarning = (message) => {
  const text = String(message || "").trim();
  const index = text.indexOf(": ");
  return index > 0 && index <= 80 ? [text.slice(0, index), text.slice(index + 2)] : ["Error", text];
};

const errorText = (error) => String(error && error.message ? error.message : error).replace(/\.$/, "");

const formatBytes = (bytes) => {
  const value = Number(bytes) || 0;
  if (value >= 1073741824) return `${(value / 1073741824).toFixed(2)} GB`;
  if (value >= 1048576) return `${(value / 1048576).toFixed(1)} MB`;
  return `${Math.round(value / 1024)} KB`;
};

const parseFeedDate = (value) => {
  if (!value) return null;
  if (typeof value !== "string") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  let normalized = value;
  if (!normalized.includes("T") && /^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}/.test(normalized)) {
    normalized = `${normalized.replace(" ", "T")}Z`;
  }
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
};

const formatRelativeTime = (iso) => {
  if (!iso) return "—";
  const d = parseFeedDate(iso);
  if (!d) return iso;
  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (Math.abs(diffSec) < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (Math.abs(diffHr) < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d ago`;
};

const formatAbsoluteTime = (iso) => {
  if (!iso) return "—";
  const d = parseFeedDate(iso);
  if (!d) return iso;
  return d.toLocaleString();
};

const leadEvidence = (lead) => {
  const evidence = lead.evidence || {};
  if (evidence.wwwAuthenticate) return `The host answered ${evidence.status} and asked for ${evidence.wwwAuthenticate.split(/\s+/)[0]} credentials.`;
  if (evidence.status) return `The host answered ${evidence.status} without saying which credentials it wants.`;
  if (evidence.excerpt) return `“${evidence.excerpt.slice(0, 220)}${evidence.excerpt.length > 220 ? "…" : ""}”`;
  if (evidence.linkedFrom) return `Linked from ${evidence.linkedFrom}${evidence.text ? ` as “${evidence.text}”` : ""}.`;
  return "—";
};

const FeedsModal = ({ title, onClose, children, className, footer }) => {
  useEffect(() => {
    const handleKey = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);
  return createPortal(
    <div className="satModalPortal">
      <div className="satFeedsModalOverlay" onClick={onClose}>
        <div className={`satFeedsModal ${className || ""}`} onClick={(event) => event.stopPropagation()}>
          <div className="satFeedsModalHeader">
            <span>{title}</span>
            <button type="button" className="satFeedsModalClose" onClick={onClose} aria-label="Close">
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
          <div className="satFeedsModalContent">{children}</div>
          {footer && <div className="satOpModalFooter">{footer}</div>}
        </div>
      </div>
    </div>,
    document.body
  );
};

const LeadsModal = ({ onClose, onChanged }) => {
  const [status, setStatus] = useState("new");
  const [kind, setKind] = useState("");
  const [text, setText] = useState("");
  const [leads, setLeads] = useState([]);
  const [counts, setCounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status, limit: "300" });
      if (kind) params.set("kind", kind);
      const response = await fetch(`${SOURCES.harvest.base}/leads?${params.toString()}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.message || `The leads request failed with status ${response.status}.`);
      setLeads(data.leads || []);
      setCounts(data.counts || []);
      setError(null);
    } catch (loadError) {
      setError(`The leads could not be loaded because of the error "${errorText(loadError)}".`);
    } finally {
      setLoading(false);
    }
  }, [status, kind]);

  useEffect(() => {
    load();
  }, [load]);

  const update = async (lead, nextStatus) => {
    setBusyId(lead.leadId);
    try {
      const response = await fetch(`${SOURCES.harvest.base}/leads/${lead.leadId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.message || `The update failed with status ${response.status}.`);
      setLeads(prev => (status === "all" ? prev.map(item => (item.leadId === lead.leadId ? { ...item, status: nextStatus } : item)) : prev.filter(item => item.leadId !== lead.leadId)));
      setCounts(prev => prev.map(row => (row.kind === lead.kind && row.status === lead.status ? { ...row, total: row.total - 1 } : row)).concat([{ status: nextStatus, kind: lead.kind, total: 1 }]));
      setNotice(null);
      if (onChanged) onChanged();
    } catch (updateError) {
      setNotice(`The lead could not be updated because of the error "${errorText(updateError)}".`);
    } finally {
      setBusyId(null);
    }
  };

  const exportLeads = async (format) => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ status, limit: "500" });
      if (kind) params.set("kind", kind);
      const response = await fetch(`${SOURCES.harvest.base}/leads?${params.toString()}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.message || `The export request failed with status ${response.status}.`);
      const rows = data.leads || [];
      let body;
      let type;
      if (format === "json") {
        body = JSON.stringify({ exportedAt: new Date().toISOString(), status, kind: kind || "all", leads: rows }, null, 2);
        type = "application/json";
      } else {
        body = "LeadId,Status,Kind,Title,Host,Url,Hits,Evidence,Note,Source,Domain,FirstSeen,LastSeen\n";
        rows.forEach(lead => {
          body += `${csvQuote(lead.leadId)},${csvQuote(lead.status)},${csvQuote(lead.kind)},${csvQuote(lead.title)},${csvQuote(lead.host)},${csvQuote(lead.url)},${lead.hits},${csvQuote(leadEvidence(lead))},${csvQuote(lead.note || "")},${csvQuote(lead.source_key)},${csvQuote(lead.domain)},${csvQuote(lead.first_seen_at)},${csvQuote(lead.last_seen_at)}\n`;
        });
        type = "text/csv";
      }
      const blob = new Blob([body], { type });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `source_leads_${status}${kind ? `_${kind}` : ""}.${format}`;
      anchor.click();
      URL.revokeObjectURL(url);
      setNotice(null);
    } catch (exportError) {
      setNotice(`The leads could not be exported because of the error "${errorText(exportError)}".`);
    } finally {
      setExporting(false);
    }
  };

  const totalFor = (statusKey, kindKey) => counts.filter(row => (statusKey === "all" || row.status === statusKey) && (!kindKey || row.kind === kindKey)).reduce((sum, row) => sum + row.total, 0);
  const tabs = LEAD_STATUS_TABS.map(([key, label]) => ({ key, label: `${label} (${totalFor(key, kind)})`, icon: key === "new" ? faLightbulb : key === "adopted" ? faCheck : key === "dismissed" ? faBan : key === "reviewing" ? faEye : faLayerGroup }));
  const kindOptions = [["", "All Kinds"]].concat(Object.entries(LEAD_KINDS).map(([key, meta]) => [key, `${meta.label} (${totalFor(status, key)})`]));
  const kindLabel = (kindOptions.find(([value]) => value === kind) || kindOptions[0])[1];
  const needle = text.trim().toLowerCase();
  const visible = needle ? leads.filter(lead => [lead.host, lead.title, lead.url, leadEvidence(lead)].some(value => value && String(value).toLowerCase().includes(needle))) : leads;
  const chips = [
    kind ? { key: "kind", label: (LEAD_KINDS[kind] || { label: titleCaseWords(kind) }).label, clear: () => setKind("") } : null,
    needle ? { key: "text", label: `Text: ${text.trim()}`, clear: () => setText("") } : null
  ].filter(Boolean);

  const rows = visible.map((lead) => {
    const meta = LEAD_KINDS[lead.kind] || { label: titleCaseWords(lead.kind), color: "#cdd4e4" };
    return [
      <div className="satOpResultCell">
        <span className="satOpResultPrimary" title={lead.host || lead.title}>{lead.host || lead.title}</span>
        <a className="satOpResultSecondary satOpResultLink" href={lead.url} target="_blank" rel="noopener noreferrer" title={lead.url}>{lead.url}</a>
        <span className="satOpResultSecondary satOpResultClamp" title={leadEvidence(lead)}>{leadEvidence(lead)}</span>
      </div>,
      <span className="satLeadKind" style={{ color: meta.color, borderColor: meta.color }}>{meta.label}</span>,
      <span className="satOpResultPlain">{lead.hits}</span>,
      <span className="satOpResultPlain" title={formatAbsoluteTime(lead.last_seen_at)}>{formatRelativeTime(lead.last_seen_at)}</span>,
      <div className="satLeadActions">
        {lead.status !== "reviewing" && <button className="satLeadAction" disabled={busyId === lead.leadId} onClick={() => update(lead, "reviewing")} title="Mark As Reviewing"><FontAwesomeIcon icon={faEye} /></button>}
        {lead.status !== "adopted" && <button className="satLeadAction satLeadActionAdopt" disabled={busyId === lead.leadId} onClick={() => update(lead, "adopted")} title="Mark As Adopted"><FontAwesomeIcon icon={faCheck} /></button>}
        {lead.status !== "dismissed" && <button className="satLeadAction satLeadActionDismiss" disabled={busyId === lead.leadId} onClick={() => update(lead, "dismissed")} title="Dismiss"><FontAwesomeIcon icon={faBan} /></button>}
      </div>
    ];
  });

  const footer = (
    <>
      <span className="satOpModalFooterInfo">{needle ? `${visible.length.toLocaleString()} Matches In The Top ${leads.length.toLocaleString()} Of ${totalFor(status, kind).toLocaleString()} Leads` : `${leads.length.toLocaleString()} Of ${totalFor(status, kind).toLocaleString()} Leads Shown`}</span>
      <div className="satOpModalFooterActions">
        <button type="button" className="satLeadFilter" disabled={exporting} onClick={() => exportLeads("csv")} title="Export Leads As CSV"><FontAwesomeIcon icon={faDownload} /> CSV</button>
        <button type="button" className="satLeadFilter" disabled={exporting} onClick={() => exportLeads("json")} title="Export Leads As JSON"><FontAwesomeIcon icon={faDownload} /> JSON</button>
      </div>
    </>
  );

  return (
    <FeedsModal title="Source Leads" onClose={onClose} className="satOpModal satOpLeadsModal" footer={footer}>
      <div className="satOpToolbar">
        <div className="satOpSearchBar">
          <FontAwesomeIcon icon={faSearchPlus} className="satOpSearchBarIcon" />
          <input type="text" className="satOpInput" placeholder="Host, URL, Or Evidence" value={text} onChange={(event) => setText(event.target.value)} />
        </div>
        <div className="satOpToolbarField">
          <Dropdown value={kindLabel} onChange={(option) => setKind((kindOptions.find(([, label]) => label === option) || kindOptions[0])[0])} options={kindOptions.map(([, label]) => label)} placeholder="Kind" />
        </div>
      </div>
      {chips.length > 0 && (
        <div className="satOpChipRow">
          {chips.map((chip) => (
            <button key={chip.key} type="button" className="satOpChip" onClick={chip.clear} title={`Remove ${chip.label}`}>
              <span>{chip.label}</span>
              <FontAwesomeIcon icon={faXmark} />
            </button>
          ))}
        </div>
      )}
      <FeedsTabs tabs={tabs} activeTab={status} onTabChange={setStatus} />
      <div className="satOpNote">The harvester flags sources it found but cannot collect on its own, such as hosts that require credentials, API documentation, and data catalogs on unlisted domains.</div>
      {notice && <div className="satLeadNotice">{notice}</div>}
      {error ? (
        <div className="satFeedsEmpty satFeedsError">{error}</div>
      ) : loading && leads.length === 0 ? (
        <div className="satFeedsEmpty">Loading Leads</div>
      ) : (
        <FeedsTable columns={["Lead", "Kind", "Hits", "Last Seen", ""]} widths={["auto", "124px", "56px", "88px", "140px"]} rows={rows} emptyText={needle ? "No leads match that text." : "No leads match this filter."} />
      )}
    </FeedsModal>
  );
};

const FeedsTabs = ({ tabs, activeTab, onTabChange }) => (
  <div className="satFeedsTabs">
    {tabs.map(tab => (
      <button
        key={tab.key}
        type="button"
        className={`satFeedsTab ${activeTab === tab.key ? "satFeedsTabActive" : ""}`}
        onClick={() => onTabChange(tab.key)}
      >
        <FontAwesomeIcon icon={tab.icon} /> {tab.label}
      </button>
    ))}
  </div>
);

const FeedsTable = ({ columns, rows, emptyText, widths }) => (
  rows.length === 0 ? (
    <div className="satFeedsEmpty">{emptyText}</div>
  ) : (
    <div className="satFeedsTableScroll">
      <table className="satFeedsTable">
        <thead><tr>{columns.map((column, index) => <th key={index} style={widths ? { width: widths[index] } : undefined}>{column}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
);


const EarthConditions = () => {
  const navigate = useNavigate();
  const { token, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [consolidatedData, setConsolidatedData] = useState(null);
  const [errors, setErrors] = useState([]);
  const [harvestHealth, setHarvestHealth] = useState(null);
  const [harvestHealthError, setHarvestHealthError] = useState(null);
  const [harvestObjects, setHarvestObjects] = useState(0);
  const [locationSnapshots, setLocationSnapshots] = useState(null);
  const [showLeads, setShowLeads] = useState(false);
  const [expandedWarnings, setExpandedWarnings] = useState({});
  const toggleWarning = (key) => setExpandedWarnings((current) => ({ ...current, [key]: !current[key] }));

  const loadHarvestHealth = useCallback(async () => {
    try {
      const [healthResponse, productsResponse] = await Promise.all([
        fetch(`${SOURCES.harvest.base}/health`),
        fetch(`${SOURCES.harvest.base}/products?domain=${SOURCES.harvest.domain}&limit=1`)
      ]);
      const health = await healthResponse.json().catch(() => null);
      const products = productsResponse.ok ? await productsResponse.json().catch(() => null) : null;
      if (!healthResponse.ok || !health) throw new Error(`The harvester health request failed with status ${healthResponse.status}.`);
      setHarvestHealth(health);
      setHarvestObjects(products ? products.total : 0);
      setHarvestHealthError(null);
    } catch (error) {
      setHarvestHealthError(errorText(error));
    }
  }, []);

  useEffect(() => {
    loadHarvestHealth();
    const timer = setInterval(loadHarvestHealth, SOURCES.harvest.healthRefreshMs);
    return () => clearInterval(timer);
  }, [loadHarvestHealth]);

  const harvestSources = useMemo(() => (harvestHealth?.sources || []).filter((source) => source.domain === SOURCES.harvest.domain), [harvestHealth]);

  const harvestStats = useMemo(() => {
    const jobs = (harvestHealth?.queue || []).filter((row) => SOURCES.harvest.jobPattern.test(row.job_type));
    return {
      frames: harvestSources.reduce((sum, source) => sum + (Number(source.frames) || 0), 0),
      due: jobs.reduce((sum, row) => sum + (Number(row.due) || 0), 0),
      running: jobs.reduce((sum, row) => sum + (Number(row.running) || 0), 0),
      sources: harvestSources.length,
      failing: harvestSources.filter((source) => source.enabled && source.error_streak >= 3).length
    };
  }, [harvestHealth, harvestSources]);

  const harvestWarnings = useMemo(() => harvestSources.filter((source) => source.enabled && source.last_error).map((source) => `${source.name}: ${source.last_error}`), [harvestSources]);

  const harvestStatusLabel = harvestHealth?.status === "Needs Schema" || harvestHealth?.status === "Idle"
    ? harvestHealth.status
    : harvestHealth
      ? (harvestStats.failing ? "Degraded" : "Healthy")
      : harvestHealthError ? "Unavailable" : "Loading";


  const [activeTab, setActiveTab] = useState("overview");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(60000);
  const [selectedLocation, setSelectedLocation] = useState(SOURCES.defaultLocation.key);

  const locationProductKey = useMemo(() => {
    const [lat, lon] = String(selectedLocation || "").split(",").map(Number);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return `location-${`${lat.toFixed(SOURCES.harvest.locationPrecision)}_${lon.toFixed(SOURCES.harvest.locationPrecision)}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
  }, [selectedLocation]);

  useEffect(() => {
    if (!locationProductKey) return undefined;
    let cancelled = false;
    fetch(`${SOURCES.harvest.base}/products/${encodeURIComponent(locationProductKey)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => { if (!cancelled) setLocationSnapshots(data && data.product ? data.product.frameCount : 0); })
      .catch(() => { if (!cancelled) setLocationSnapshots(null); });
    return () => {
      cancelled = true;
    };
  }, [locationProductKey, harvestHealth]);

  const exportHarvest = (productKey, format) => {
    const to = new Date();
    const from = new Date(to.getTime() - SOURCES.harvest.exportDays * 86400000);
    const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString(), format });
    window.open(`${SOURCES.harvest.base}/products/${encodeURIComponent(productKey)}/export?${params.toString()}`, "_blank", "noopener");
  };

  const [dataExportFormat] = useState("json");
  const [alertHistory, setAlertHistory] = useState([]);
  const [performanceMetrics, setPerformanceMetrics] = useState({ latency: 0, availability: 100 });
  const [mapCategoryFilter, setMapCategoryFilter] = useState("all");
  const [mapSearchTerm, setMapSearchTerm] = useState("");
  const [mapAltitude] = useState("surface");
  const [layoutVisibility, setLayoutVisibility] = useState(DEFAULT_LAYOUT);
  const [expandedView, setExpandedView] = useState(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [interpretations, setInterpretations] = useState({});
  const [interpretationFailures, setInterpretationFailures] = useState({});
  const tabContentRef = useRef(null);
  const interpretationSnapshotsRef = useRef(new Map());
  const interpretationLocationRef = useRef(null);
  const [locationQuery, setLocationQuery] = useState("");
  const [locationResults, setLocationResults] = useState([]);
  const [locationSearchStatus, setLocationSearchStatus] = useState("");
  const [customLocationLabel, setCustomLocationLabel] = useState({ key: SOURCES.defaultLocation.key, label: SOURCES.defaultLocation.label });
  const [consoleView, setConsoleView] = useState("alerts");
  const [consoleModuleFilter, setConsoleModuleFilter] = useState("all");
  const [consoleLevelFilter, setConsoleLevelFilter] = useState("all");
  const [consoleSearch, setConsoleSearch] = useState("");
  const [selectedConsoleItemId, setSelectedConsoleItemId] = useState(null);
  const [orgid] = useState(localStorage.getItem("orgid") || "default_org");
  const [username] = useState(localStorage.getItem("username") || "default_user");
  const [areas, setAreas] = useState([]);
  const [areasLoaded, setAreasLoaded] = useState(false);
  const [selectedAreaId, setSelectedAreaId] = useState(null);
  const [editingAreaId, setEditingAreaId] = useState(null);
  const [areaFilterActive, setAreaFilterActive] = useState(false);
  const [areaFormData, setAreaFormData] = useState({ ...INITIAL_AREA_FORM });
  const [isGeocodingArea, setIsGeocodingArea] = useState(false);
  const [areaModalOpen, setAreaModalOpen] = useState(false);
  const [areaResults, setAreaResults] = useState({});
  const [stateRestored, setStateRestored] = useState(false);
  const [firstEvaluationDone, setFirstEvaluationDone] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [apiSuccess, setApiSuccess] = useState(null);
  useEffect(() => {
    if (!authLoading && !token) navigate("/login");
  }, [authLoading, token, navigate]);

  const intervalRef = useRef(null);
  const evaluationRequestRef = useRef({ id: 0, controller: null });
  const previousLocationRef = useRef(null);

  const safeRenderValue = useCallback((value, fallback = "—") => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === "object") {
      return value.value !== undefined ? value.value : JSON.stringify(value);
    }
    return String(value);
  }, []);

  const safeNumber = useCallback((value, fallback = 0) => {
    if (value === null || value === undefined) return fallback;
    const num = parseFloat(value);
    return isNaN(num) ? fallback : num;
  }, []);

  const getAllAlerts = useCallback(() => {
    if (!consolidatedData?.alerts) return [];
    return [...consolidatedData.alerts].sort((a, b) => (CONDITION_SEVERITY_ORDER[a.severity] ?? 5) - (CONDITION_SEVERITY_ORDER[b.severity] ?? 5));
  }, [consolidatedData]);

  const getAllViolations = useCallback(() => {
    if (!consolidatedData?.violations) return [];
    return [...consolidatedData.violations].sort((a, b) => (CONDITION_SEVERITY_ORDER[a.severity] ?? 5) - (CONDITION_SEVERITY_ORDER[b.severity] ?? 5));
  }, [consolidatedData]);

  const getConsolidatedDecision = useCallback(() => {
    if (!consolidatedData?.decision) {
      return {
        status: "UNKNOWN",
        confidence: 0,
        primaryReason: "Conditions data has not arrived yet.",
        category: "INIT",
        allReasons: [],
        riskScore: 1.0,
        dataAvailability: 0,
        alertSummary: { critical: 0, warning: 0, total: 0 },
        violationSummary: { critical: 0, warning: 0, total: 0 },
        dataSourceSummary: { total: 0, operational: 0, failed: 0, failedCritical: 0 }
      };
    }
    return consolidatedData.decision;
  }, [consolidatedData]);

  const getModuleData = useCallback((moduleName) => {
    if (!consolidatedData?.detailed_modules) return null;
    return consolidatedData.detailed_modules[moduleName];
  }, [consolidatedData]);

  const renderDataTypeBadge = useCallback((dataType, size = "normal") => {
    const config = DATA_TYPE[dataType] || DATA_TYPE.LIVE;
    const sizeClass = size === "small" ? "satEarthCondDataTypeBadgeSmall" : "";
    return (
      <span
        className={`satEarthCondDataTypeBadge ${sizeClass}`}
        style={{ backgroundColor: config.color + "20", color: config.color, borderColor: config.color }}
        title={config.description}
      >
        <FontAwesomeIcon icon={config.icon} />
        <span>{config.label}</span>
      </span>
    );
  }, []);

  const renderDataTypeIndicator = useCallback((dataType) => {
    const config = DATA_TYPE[dataType] || DATA_TYPE.LIVE;
    return (
      <div className="satEarthCondDataTypeIndicator" style={{ color: config.color }} title={config.description}>
        <FontAwesomeIcon icon={config.icon} />
      </div>
    );
  }, []);

  const locationName = customLocationLabel && customLocationLabel.key === selectedLocation ? customLocationLabel.label : CUSTOM_LOCATION_LABEL;
  const [selectedLat, selectedLon] = selectedLocation.split(",").map(Number);

  const searchLocations = useCallback(async () => {
    const query = locationQuery.trim();
    if (query.length < 2) {
      setLocationSearchStatus("Enter at least 2 characters to search.");
      setLocationResults([]);
      return;
    }
    setLocationSearchStatus("Searching");
    try {
      const response = await fetch(`${apiUrl("locationSearch")}?query=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error(`The server returned status ${response.status}.`);
      const data = await response.json();
      setLocationResults(data.results || []);
      setLocationSearchStatus((data.results || []).length ? "" : "No places matched that search.");
    } catch (error) {
      setLocationResults([]);
      setLocationSearchStatus("The location search is unavailable right now.");
    }
  }, [locationQuery]);

  const selectSearchResult = useCallback((result) => {
    const key = `${result.latitude},${result.longitude}`;
    setCustomLocationLabel({ key, label: result.label });
    setSelectedLocation(key);
    setLocationResults([]);
    setLocationQuery("");
    setLocationSearchStatus("");
  }, []);

  const fetchConsolidatedEvaluation = useCallback(async () => {
    const startTime = performance.now();
    evaluationRequestRef.current.controller?.abort();
    const controller = new AbortController();
    const requestId = evaluationRequestRef.current.id + 1;
    evaluationRequestRef.current = { id: requestId, controller };
    setLoading(true);
    setErrors([]);

    try {
      const [lat, lon] = selectedLocation.split(",").map(Number);

      const requestBody = { lat, lon };

      const response = await fetch(apiUrl("consolidatedEvaluation"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`The server returned status ${response.status} (${response.statusText}).`);
      }

      const data = await response.json();
      if (evaluationRequestRef.current.id !== requestId) return;
      setConsolidatedData({ ...data, requestedLocation: selectedLocation });

      setPerformanceMetrics(prev => ({
        ...prev,
        latency: Math.round(performance.now() - startTime),
        availability: 100
      }));

      if (data.alerts && data.alerts.length > 0) {
        setAlertHistory(prev => [
          ...data.alerts.map(a => ({ ...a, receivedAt: new Date().toISOString() })),
          ...prev
        ].slice(0, 200));
      }

    } catch (error) {
      if (error.name === "AbortError" || evaluationRequestRef.current.id !== requestId) return;
      setErrors(prev => [...prev, {
        timestamp: new Date().toISOString(),
        message: error.message,
        severity: "ERROR"
      }]);
      setPerformanceMetrics(prev => ({ ...prev, availability: 0 }));
    } finally {
      if (evaluationRequestRef.current.id === requestId) {
        setLoading(false);
        setFirstEvaluationDone(true);
      }
    }
  }, [selectedLocation]);

  const showNotification = useCallback((message, type = "success") => {
    const setter = type === "success" ? setApiSuccess : setApiError;
    setter(message);
    setTimeout(() => setter(null), type === "success" ? 4000 : 5000);
  }, []);

  const apiFetch = useCallback(async (url, options = {}) => {
    const response = await fetch(url, options);
    try {
      return await response.json();
    } catch (error) {
      return { success: false, message: `Server returned a non-JSON response with status ${response.status}.` };
    }
  }, []);

  const apiFetchWithStatus = useCallback(async (url, options = {}) => {
    const response = await fetch(url, options);
    let data;
    try {
      data = await response.json();
    } catch (error) {
      data = { success: false, message: `Server returned a non-JSON response with status ${response.status}.` };
    }
    return { status: response.status, data };
  }, []);

  const fetchAreas = useCallback(async () => {
    if (!orgid || !username) return;
    try {
      const data = await apiFetch(`${apiUrl("areas")}?orgid=${encodeURIComponent(orgid)}&username=${encodeURIComponent(username)}`);
      if (data && data.success && Array.isArray(data.areas)) {
        setAreas(data.areas);
        setSelectedAreaId((prev) => (prev && data.areas.some((area) => area.area_id === prev) ? prev : (data.areas[0] ? data.areas[0].area_id : null)));
      }
    } catch (error) { }
    setAreasLoaded(true);
  }, [orgid, username, apiFetch]);

  const saveAreaToBackend = useCallback(async (area, areaId) => {
    if (!orgid || !username || !area) return null;
    try {
      const url = areaId ? `${apiUrl("areas")}/${encodeURIComponent(areaId)}` : apiUrl("areas");
      const { status, data } = await apiFetchWithStatus(url, {
        method: areaId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgid, username, ...area, filter_active: true })
      });
      if ((status !== 200 && status !== 201) || !data || !data.success) {
        showNotification((data && data.message) || "The monitored area could not be saved.", "error");
        return null;
      }
      return data.area;
    } catch (error) {
      showNotification("A network error prevented saving the monitored area.", "error");
      return null;
    }
  }, [orgid, username, apiFetchWithStatus, showNotification]);

  const deleteAreaFromBackend = useCallback(async (areaId) => {
    if (!orgid || !username || !areaId) return false;
    try {
      const data = await apiFetch(`${apiUrl("areas")}/${encodeURIComponent(areaId)}?orgid=${encodeURIComponent(orgid)}&username=${encodeURIComponent(username)}`, { method: "DELETE" });
      return Boolean(data && data.success);
    } catch (error) {
      return false;
    }
  }, [orgid, username, apiFetch]);

  useEffect(() => {
    fetchAreas();
  }, [fetchAreas]);

  const userArea = useMemo(() => areas.find((area) => area.area_id === selectedAreaId) || null, [areas, selectedAreaId]);
  const activeAreas = areaFilterActive && areas.length ? areas : null;
  const activeAreasLabel = activeAreas ? (activeAreas.length === 1 ? describeArea(activeAreas[0]) : `My ${activeAreas.length} Areas`) : null;

  const soundsEnabledRef = useRef(false);
  const autoRefreshRef = useRef(autoRefresh);
  const areaScanRef = useRef(0);

  useEffect(() => {
    autoRefreshRef.current = autoRefresh;
  }, [autoRefresh]);

  const scanAreas = useCallback(async () => {
    const scanId = areaScanRef.current + 1;
    areaScanRef.current = scanId;
    for (const area of areas) {
      if (areaScanRef.current !== scanId) return;
      const center = areaCenter(area);
      try {
        const response = await fetch(apiUrl("areaAlerts"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat: center.lat, lon: center.lon })
        });
        const data = await response.json().catch(() => null);
        if (!response.ok || !data || !data.success) throw new Error((data && data.message) || `The area evaluation returned status ${response.status}.`);
        setAreaResults((current) => ({ ...current, [area.area_id]: { alerts: data.alerts || [], violations: data.violations || [], status: data.status, evaluatedAt: data.evaluatedAt, center, error: null } }));
      } catch (error) {
        setAreaResults((current) => ({ ...current, [area.area_id]: { ...(current[area.area_id] || { alerts: [], violations: [], center }), error: errorText(error) } }));
      }
    }
  }, [areas]);

  useEffect(() => {
    if (!stateRestored || !firstEvaluationDone || !areas.length) return undefined;
    scanAreas();
    const timer = setInterval(() => {
      if (autoRefreshRef.current || soundsEnabledRef.current) scanAreas();
    }, Math.max(refreshInterval, SOURCES.conditions.areaRefreshMs));
    return () => clearInterval(timer);
  }, [stateRestored, firstEvaluationDone, areas, refreshInterval, scanAreas]);

  useEffect(() => {
    if (!consolidatedData || !areas.length) return;
    const [lat, lon] = String(consolidatedData.requestedLocation || "").split(",").map(Number);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    const matches = areas.filter((area) => {
      const center = areaCenter(area);
      return center.lat.toFixed(2) === lat.toFixed(2) && center.lon.toFixed(2) === lon.toFixed(2);
    });
    if (!matches.length) return;
    const modules = consolidatedData.detailed_modules || {};
    const collect = (field) => MODULE_DEFINITIONS.flatMap((module) => ((modules[module.key] && modules[module.key][field]) || []).filter((entry) => entry && entry.message).map((entry) => ({ ...entry, module: module.key })));
    const result = { alerts: collect("alerts"), violations: collect("violations"), status: consolidatedData.decision ? consolidatedData.decision.status : null, evaluatedAt: new Date().toISOString(), error: null };
    setAreaResults((current) => ({ ...current, ...Object.fromEntries(matches.map((area) => [area.area_id, { ...result, center: areaCenter(area) }])) }));
  }, [consolidatedData, areas]);

  const refreshAll = useCallback(() => {
    fetchConsolidatedEvaluation();
    if (areas.length) scanAreas();
  }, [fetchConsolidatedEvaluation, areas.length, scanAreas]);

  const handleAreaFormChange = useCallback((field, value) => setAreaFormData((prev) => ({ ...prev, [field]: value })), []);

  const openAreaModal = useCallback((area) => {
    setEditingAreaId(area ? area.area_id : null);
    if (area && area.mode === "point_radius") {
      setAreaFormData({
        ...INITIAL_AREA_FORM,
        mode: "point_radius",
        name: area.name || "",
        address: area.address || "",
        latitude: area.latitude.toString(),
        longitude: area.longitude.toString(),
        radius_km: area.radius_km.toString()
      });
    } else if (area && area.mode === "bbox") {
      setAreaFormData({
        ...INITIAL_AREA_FORM,
        mode: "bbox",
        name: area.name || "",
        min_lat: area.min_lat.toString(),
        max_lat: area.max_lat.toString(),
        min_lng: area.min_lng.toString(),
        max_lng: area.max_lng.toString()
      });
    } else {
      setAreaFormData({ ...INITIAL_AREA_FORM });
    }
    setAreaModalOpen(true);
  }, []);

  const handleGeocodeArea = useCallback(async () => {
    const query = (areaFormData.address || "").trim();
    if (!query) {
      showNotification("Enter an address to geocode.", "error");
      return;
    }
    setIsGeocodingArea(true);
    try {
      const response = await fetch(`${SOURCES.geocoding.nominatim}?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`, { headers: { "User-Agent": SOURCES.geocoding.userAgent } });
      if (!response.ok) throw new Error("The geocoding service returned an error.");
      const results = await response.json();
      if (!results.length) {
        showNotification("The address was not found. Try a more specific query.", "error");
        return;
      }
      const place = results[0];
      const lat = parseFloat(place.lat);
      const lng = parseFloat(place.lon);
      const address = place.address || {};
      const friendlyName = address.city || address.town || address.village || address.county || (place.display_name ? place.display_name.split(",")[0] : "") || query;
      setAreaFormData((prev) => ({
        ...prev,
        latitude: lat.toFixed(6),
        longitude: lng.toFixed(6),
        name: prev.name && prev.name.trim() ? prev.name : friendlyName
      }));
      showNotification(`The address was geocoded to ${place.display_name ? place.display_name.substring(0, 80) : `${lat}, ${lng}`}.`);
    } catch (error) {
      showNotification("The address could not be geocoded. Check your network.", "error");
    } finally {
      setIsGeocodingArea(false);
    }
  }, [areaFormData.address, showNotification]);

  const useSelectedLocationForArea = useCallback(() => {
    setAreaFormData((prev) => ({ ...prev, latitude: selectedLat.toFixed(6), longitude: selectedLon.toFixed(6), name: prev.name && prev.name.trim() ? prev.name : locationName === CUSTOM_LOCATION_LABEL ? "" : locationName }));
  }, [selectedLat, selectedLon, locationName]);

  const showArea = useCallback((area) => {
    const center = areaCenter(area);
    const key = `${Number(center.lat.toFixed(4))},${Number(center.lon.toFixed(4))}`;
    setCustomLocationLabel({ key, label: area.name && area.name.trim() ? area.name.trim() : describeArea(area) });
    setSelectedLocation(key);
  }, []);

  const handleSaveArea = useCallback(async (activateImmediately = true) => {
    let area = null;
    if (areaFormData.mode === "point_radius") {
      const lat = parseFloat(areaFormData.latitude);
      const lng = parseFloat(areaFormData.longitude);
      const radius = parseFloat(areaFormData.radius_km);
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        showNotification("Latitude and longitude must be valid coordinates.", "error");
        return;
      }
      if (isNaN(radius) || radius <= 0 || radius > 10000) {
        showNotification("Radius must be between 1 and 10000 km.", "error");
        return;
      }
      area = { mode: "point_radius", name: (areaFormData.name || "").trim(), address: (areaFormData.address || "").trim(), latitude: lat, longitude: lng, radius_km: radius };
    } else if (areaFormData.mode === "bbox") {
      const minLat = parseFloat(areaFormData.min_lat);
      const maxLat = parseFloat(areaFormData.max_lat);
      const minLng = parseFloat(areaFormData.min_lng);
      const maxLng = parseFloat(areaFormData.max_lng);
      if ([minLat, maxLat, minLng, maxLng].some((value) => isNaN(value))) {
        showNotification("All bounding box coordinates are required.", "error");
        return;
      }
      if (minLat >= maxLat || minLng >= maxLng) {
        showNotification("Min coordinates must be less than max coordinates.", "error");
        return;
      }
      if (minLat < -90 || maxLat > 90 || minLng < -180 || maxLng > 180) {
        showNotification("Coordinates must be in valid lat/lng ranges.", "error");
        return;
      }
      area = { mode: "bbox", name: (areaFormData.name || "").trim(), min_lat: minLat, max_lat: maxLat, min_lng: minLng, max_lng: maxLng };
    }
    if (!area) return;
    const saved = await saveAreaToBackend(area, editingAreaId);
    if (!saved) return;
    setAreas((prev) => (editingAreaId ? prev.map((item) => (item.area_id === saved.area_id ? saved : item)) : [...prev, saved]));
    setSelectedAreaId(saved.area_id);
    if (activateImmediately) setAreaFilterActive(true);
    setAreaModalOpen(false);
    setEditingAreaId(null);
    showNotification(`The monitored area ${describeArea(saved)} was saved.`);
    showArea(saved);
  }, [areaFormData, editingAreaId, showNotification, saveAreaToBackend, showArea]);

  const deleteArea = useCallback(async (areaId) => {
    if (!areaId) return;
    const deleted = await deleteAreaFromBackend(areaId);
    if (!deleted) {
      showNotification("The monitored area could not be deleted.", "error");
      return;
    }
    setAreas((prev) => {
      const remaining = prev.filter((area) => area.area_id !== areaId);
      setSelectedAreaId((current) => (current === areaId ? (remaining[0] ? remaining[0].area_id : null) : current));
      return remaining;
    });
    setAreaResults((current) => {
      const next = { ...current };
      delete next[areaId];
      return next;
    });
    setAreaModalOpen(false);
    setEditingAreaId(null);
    showNotification("The monitored area was deleted.");
  }, [showNotification, deleteAreaFromBackend]);

  const selectArea = useCallback((area) => {
    setSelectedAreaId(area.area_id);
    showArea(area);
  }, [showArea]);

  const chooseAlertScope = useCallback((scope) => {
    if (scope === "areas" && !userArea) {
      showNotification("Add a monitored area first.", "error");
      openAreaModal(null);
      return;
    }
    setAreaFilterActive(scope === "areas");
  }, [userArea, openAreaModal, showNotification]);

  const locationConditions = useMemo(() => {
    if (!consolidatedData || consolidatedData.requestedLocation !== selectedLocation) return null;
    const modules = consolidatedData.detailed_modules || {};
    const items = MODULE_DEFINITIONS.flatMap((module) => [
      ...((modules[module.key] && modules[module.key].alerts) || []).filter((alert) => alert && alert.message).map((alert) => normalizeCondition(alert, "alert", module.key)),
      ...((modules[module.key] && modules[module.key].violations) || []).filter((violation) => violation && violation.message).map((violation) => normalizeCondition(violation, "violation", module.key))
    ]);
    return mergeConditions([{ items, place: { label: locationName, lat: selectedLat, lon: selectedLon, areaId: null } }]);
  }, [consolidatedData, selectedLocation, locationName, selectedLat, selectedLon]);

  const areaConditionGroups = useMemo(() => areas.filter((area) => areaResults[area.area_id]).map((area) => {
    const result = areaResults[area.area_id];
    const center = areaCenter(area);
    return {
      area,
      items: [
        ...(result.alerts || []).filter((alert) => alert && alert.message).map((alert) => normalizeCondition(alert, "alert", alert.module)),
        ...(result.violations || []).filter((violation) => violation && violation.message).map((violation) => normalizeCondition(violation, "violation", violation.module))
      ],
      place: { label: describeArea(area), lat: center.lat, lon: center.lon, areaId: area.area_id }
    };
  }), [areas, areaResults]);

  const areaConditions = useMemo(() => mergeConditions(areaConditionGroups), [areaConditionGroups]);

  const areaCounts = useMemo(() => Object.fromEntries(areaConditionGroups.map((group) => {
    const inside = mergeConditions([group]).filter(isBellCondition);
    return [group.area.area_id, { total: inside.length, critical: inside.filter((item) => item.severity === "CRITICAL").length, top: inside[0] ? inside[0].severity : null }];
  })), [areaConditionGroups]);

  const areasReady = areas.length > 0 && areas.every((area) => areaResults[area.area_id]);
  const areaErrors = areas.filter((area) => areaResults[area.area_id] && areaResults[area.area_id].error);
  const areaCheckedAt = areas.map((area) => (areaResults[area.area_id] && areaResults[area.area_id].evaluatedAt) || null).filter(Boolean).sort().pop() || null;

  const scopeConditions = useMemo(() => (activeAreas ? areaConditions : locationConditions || []), [activeAreas, areaConditions, locationConditions]);
  const scopeReady = activeAreas ? areasReady : Boolean(locationConditions);
  const bellItems = useMemo(() => scopeConditions.filter(isBellCondition), [scopeConditions]);
  const bellKeys = useMemo(() => new Set(bellItems.map((item) => item.key)), [bellItems]);
  const soundInScope = (item) => bellKeys.has(item.key);
  const soundScopeKey = useMemo(() => bellItems.map((item) => item.key).join(","), [bellItems]);

  const sounds = useAlertSounds({
    defaults: SOURCES.sounds.defaults,
    ready: stateRestored && areasLoaded,
    items: scopeReady ? bellItems : null,
    inScope: soundInScope,
    scopeKey: soundScopeKey,
    ignoreLevel: true,
    getKey: conditionItemKey,
    getLevel: conditionSoundLevel,
    getId: conditionItemIdentity,
    describe: conditionSoundMessage,
    repeatMs: SOURCES.sounds.repeatGapSeconds * 1000,
    aheadSeconds: SOURCES.sounds.scheduleAheadSeconds,
    topUpMs: SOURCES.sounds.topUpSeconds * 1000
  });

  useEffect(() => {
    soundsEnabledRef.current = sounds.settings.enabled;
  }, [sounds.settings.enabled]);

  const [ackOpen, setAckOpen] = useState(false);
  const [ackReview, setAckReview] = useState(false);
  const [ackIndex, setAckIndex] = useState(0);
  const [ackAnalyses, setAckAnalyses] = useState({});
  const ackQueue = sounds.queue;
  const ackKeysRef = useRef(new Set());
  const pendingKeys = useMemo(() => new Set(ackQueue.filter((entry) => !entry.ended).map((entry) => entry.key)), [ackQueue]);

  useEffect(() => {
    const firstNew = ackQueue.findIndex((entry) => !ackKeysRef.current.has(entry.key));
    ackKeysRef.current = new Set(ackQueue.map((entry) => entry.key));
    if (!ackQueue.length && !ackReview) setAckOpen(false);
    if (firstNew >= 0 && !ackReview) {
      setAckOpen(true);
      setAckIndex(firstNew);
    }
  }, [ackQueue, ackReview]);

  const [ackHistory, setAckHistory] = useState([]);

  useEffect(() => {
    if (!ackQueue.length) return;
    setAckHistory((current) => {
      const known = new Set(current.map((entry) => entry.key));
      const added = ackQueue.filter((entry) => !known.has(entry.key));
      if (!added.length) return current;
      return [...added, ...current].slice(0, 200);
    });
  }, [ackQueue]);

  const ackPendingKeys = useMemo(() => new Set(ackQueue.map((entry) => entry.key)), [ackQueue]);
  const ackReviewList = useMemo(() => {
    const live = (bellItems || []).map((item) => ({ key: conditionItemKey(item), id: conditionItemIdentity(item), item, level: conditionSoundLevel(item) || ALERT_SOUND_LEVELS[0], ended: false, updated: false, at: Date.now(), message: conditionSoundMessage(item, false) }));
    const known = new Set(live.map((entry) => entry.key));
    return [...live, ...ackHistory.filter((entry) => !known.has(entry.key) && (!activeAreas || (entry.item.places || []).some((place) => activeAreas.some((area) => area.area_id === place.areaId))))];
  }, [bellItems, ackHistory, activeAreas]);
  const ackList = ackReview ? ackReviewList : ackQueue;

  useEffect(() => {
    setAckIndex((index) => Math.max(0, Math.min(index, ackList.length - 1)));
  }, [ackList]);

  const closeAckModal = useCallback(() => {
    setAckOpen(false);
    setAckReview(false);
  }, []);

  const openAckReview = useCallback(() => {
    setAckReview(true);
    setAckOpen(true);
    setAckIndex(0);
  }, []);

  const ackEntry = ackOpen && ackList.length ? ackList[Math.min(ackIndex, ackList.length - 1)] : null;

  const ackRequestedRef = useRef(new Set());

  useEffect(() => {
    for (const entry of ackQueue) {
      if (entry.ended || ackRequestedRef.current.has(entry.key)) continue;
      ackRequestedRef.current.add(entry.key);
      setAckAnalyses((current) => ({ ...current, [entry.key]: { loading: true } }));
      const item = entry.item;
      const place = item.places[0];
      fetch(apiUrl("alertAnalysis"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item: { key: item.key, kind: item.kind, message: item.message, severity: item.severity, category: item.category, source: item.source, moduleName: item.moduleName, parameter: item.parameter, value: item.value, limit: item.limit, deviationPercent: item.deviationPercent, limitSource: item.limitSource, recommendedAction: item.recommendedAction, details: item.details, timestamp: item.timestamp },
          location: { label: item.placeLabel, latitude: place.lat, longitude: place.lon, areas: item.places.filter((entryPlace) => entryPlace.areaId).map((entryPlace) => entryPlace.label) }
        })
      })
        .then((response) => response.json().catch(() => null).then((data) => {
          if (!response.ok || !data || !data.success) throw new Error((data && data.message) || `The analysis request returned status ${response.status}.`);
          return data;
        }))
        .then((data) => setAckAnalyses((current) => ({ ...current, [entry.key]: { data: data.analysis } })))
        .catch((error) => setAckAnalyses((current) => ({ ...current, [entry.key]: { error: errorText(error) } })));
    }
  }, [ackQueue]);

  const showCondition = useCallback((item) => {
    setActiveTab("overview");
    setConsoleView(item.kind === "violation" ? "violations" : "alerts");
    setConsoleModuleFilter("all");
    setConsoleLevelFilter("all");
    setConsoleSearch("");
    setSelectedConsoleItemId(item.key);
  }, []);

  useEffect(() => {
    if (!stateRestored || !areas.length) return;
    if (!selectedAreaId || !areas.some((area) => area.area_id === selectedAreaId)) setSelectedAreaId(areas[0].area_id);
  }, [stateRestored, areas, selectedAreaId]);

  const saveStateDebounceRef = useRef(null);
  const replaceSoundSettings = sounds.replaceSettings;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await loadStateFromDB();
      if (cancelled) return;
      if (saved) {
        const pick = (key, setter, check) => {
          if (saved[key] !== undefined && saved[key] !== null && (!check || check(saved[key]))) setter(saved[key]);
        };
        const inOptions = (options) => (value) => options.some(([option]) => option === value);
        const validLocation = (value) => {
          if (typeof value !== "string") return false;
          const [lat, lon] = value.split(",").map(Number);
          return value.split(",").length === 2 && Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
        };
        pick("activeTab", setActiveTab, (value) => typeof value === "string");
        pick("autoRefresh", setAutoRefresh, (value) => typeof value === "boolean");
        pick("refreshInterval", setRefreshInterval, inOptions(REFRESH_INTERVAL_OPTIONS));
        pick("customLocationLabel", setCustomLocationLabel, (value) => typeof value === "object");
        pick("selectedLocation", setSelectedLocation, validLocation);
        pick("layoutVisibility", (value) => setLayoutVisibility((current) => ({ ...current, ...value })), (value) => typeof value === "object");
        pick("expandedWarnings", setExpandedWarnings, (value) => typeof value === "object");
        pick("selectedAreaId", setSelectedAreaId, (value) => typeof value === "string");
        pick("areaFilterActive", setAreaFilterActive, (value) => typeof value === "boolean");
        pick("consoleView", setConsoleView, inOptions(CONSOLE_VIEWS));
        pick("consoleModuleFilter", setConsoleModuleFilter, (value) => value === "all" || MODULE_DEFINITIONS.some((module) => module.key === value));
        pick("consoleLevelFilter", setConsoleLevelFilter, (value) => typeof value === "string");
        pick("mapCategoryFilter", setMapCategoryFilter, inOptions(MAP_CATEGORY_OPTIONS));
        pick("sounds", replaceSoundSettings, (value) => typeof value === "object");
      }
      setStateRestored(true);
      window.setTimeout(() => {
        if (sessionStorage.getItem(SOURCES.persistence.restoreFlag) === PAGE_LOAD_ID) sessionStorage.removeItem(SOURCES.persistence.restoreFlag);
      }, SOURCES.persistence.restoreSettleMs);
    })();
    return () => {
      cancelled = true;
    };
  }, [replaceSoundSettings]);

  useEffect(() => {
    if (!stateRestored) return undefined;
    if (saveStateDebounceRef.current) clearTimeout(saveStateDebounceRef.current);
    saveStateDebounceRef.current = setTimeout(() => {
      saveStateToDB({
        activeTab,
        autoRefresh,
        refreshInterval,
        selectedLocation,
        customLocationLabel,
        layoutVisibility,
        expandedWarnings,
        selectedAreaId,
        areaFilterActive,
        consoleView,
        consoleModuleFilter,
        consoleLevelFilter,
        mapCategoryFilter,
        sounds: sounds.settings
      });
    }, SOURCES.persistence.saveDebounceMs);
    return () => clearTimeout(saveStateDebounceRef.current);
  }, [stateRestored, activeTab, autoRefresh, refreshInterval, selectedLocation, customLocationLabel, layoutVisibility, expandedWarnings, selectedAreaId, areaFilterActive, consoleView, consoleModuleFilter, consoleLevelFilter, mapCategoryFilter, sounds.settings]);


  const getResponsiveOptions = useCallback((screenSize) => {
    if (screenSize < 499) return { fontSize: 0, grid: { left: 0, right: 0, bottom: 0, top: 0 }, lineWidth: 0, symbolSize: 0 };
    if (screenSize <= 699) return { fontSize: 9, grid: { left: 40, right: 40, bottom: 8, top: 12 }, lineWidth: 1.5, symbolSize: 4 };
    if (screenSize <= 1299) return { fontSize: 10, grid: { left: 40, right: 40, bottom: 35, top: 30 }, lineWidth: 2, symbolSize: 5 };
    return { fontSize: 11, grid: { left: 60, right: 60, bottom: 40, top: 40 }, lineWidth: 2.5, symbolSize: 6 };
  }, []);

  const createDynamicLineChart = useCallback((title, data, xKey, yKey, unitKey = "", colorOverride = null, isForecast = false) => {
    const screenSize = window.innerWidth;
    const { fontSize, grid, lineWidth, symbolSize } = getResponsiveOptions(screenSize);
    if (!data || !Array.isArray(data) || data.length === 0) return null;
    const chartData = data.map(item => safeNumber(typeof yKey === "function" ? yKey(item) : item[yKey], 0));
    const xAxisData = data.map((item, index) => typeof xKey === "function" ? xKey(item, index) : (item[xKey] !== undefined ? String(item[xKey]) : String(index)));
    const lineStyleType = isForecast ? "dashed" : "solid";
    const lineColor = colorOverride || "#4ecdc4";
    const option = {
      textStyle: { fontFamily: CHART_FONT },
      tooltip: {
        trigger: "axis", backgroundColor: "#0b0c0f", borderColor: "#3d4354", borderWidth: 2, padding: 10, extraCssText: "border-radius: 4px;",
        textStyle: { color: "#ebf0f8", fontSize: 11, fontWeight: 700, fontFamily: CHART_FONT },
        formatter: (params) => `<div><div style="font-size:10px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;color:#919baf;margin-bottom:6px">${title}${isForecast ? " (Forecast)" : " (Observed)"}</div>${params.map(p => `<div style="font-weight:700;color:#cdd4e4">${p.seriesName}: <span style="font-weight:800;color:${lineColor}">${parseFloat(p.data).toFixed(2)}${unitKey}</span></div>`).join("")}</div>`
      },
      xAxis: { type: "category", data: xAxisData, axisLabel: { color: "#919baf", fontSize, fontWeight: 700, fontFamily: CHART_FONT, width: 90, overflow: "truncate", ellipsis: "…", hideOverlap: true }, axisLine: { lineStyle: { color: "#3d4354", width: 2 } }, axisTick: { lineStyle: { color: "#3d4354" } }, splitLine: { show: false } },
      yAxis: { type: "value", axisLabel: { color: "#919baf", fontSize, fontWeight: 700, fontFamily: CHART_FONT, width: 60, overflow: "truncate", ellipsis: "…" }, axisLine: { show: false }, splitLine: { lineStyle: { color: "#323746", type: "dashed" } } },
      series: [{ name: title, data: chartData, type: "line", smooth: true, itemStyle: { color: lineColor }, lineStyle: { color: lineColor, width: lineWidth, type: lineStyleType }, symbol: "circle", symbolSize, showSymbol: false, areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: lineColor + "40" }, { offset: 1, color: lineColor + "00" }] } } }],
      grid: { ...grid, containLabel: true }
    };
    Object.defineProperty(option, "statsMeta", { value: { values: chartData, unit: unitKey }, enumerable: false });
    return option;
  }, [getResponsiveOptions, safeNumber]);

  const renderChartStats = useCallback((chartConfig) => {
    const values = chartConfig?.statsMeta?.values || [];
    const unit = chartConfig?.statsMeta?.unit || "";
    const format = (v) => {
      if (v === null || v === undefined || isNaN(v)) return "—";
      const a = Math.abs(v);
      const text = a !== 0 && (a < 0.01 || a >= 100000) ? v.toExponential(2) : a >= 100 ? v.toFixed(0) : v.toFixed(2);
      return `${text}${unit}`;
    };
    const has = values.length > 0;
    const stats = [
      ["Points", has ? values.length : "—"],
      ["Min", has ? format(Math.min(...values)) : "—"],
      ["Max", has ? format(Math.max(...values)) : "—"],
      ["Mean", has ? format(values.reduce((a, b) => a + b, 0) / values.length) : "—"],
      ["Latest", has ? format(values[values.length - 1]) : "—"]
    ];
    return (
      <div className="satEarthCondStatsSummary">
        {stats.map(([label, value]) => <span key={label}>{label}: {value}</span>)}
      </div>
    );
  }, []);

  const renderDynamicChart = useCallback((chartConfig, className = "satEarthCondChart", dataType = null) => {
    if (!chartConfig) return <div className="satEarthCondNoChartData">No Data Available</div>;
    return <ResponsiveChart option={chartConfig} className={className} onExpand={() => setExpandedView({ title: chartConfig.series?.[0]?.name || "Chart", chart: chartConfig })} />;
  }, []);

  const renderGauge = useCallback(({ value, display, label, unit = "", min, max, zones }) => {
    const hasValue = value !== null && value !== undefined && !isNaN(value);
    const span = max - min;
    const toPercent = (v) => Math.max(0, Math.min(100, ((v - min) / span) * 100));
    const zoneIndex = hasValue ? zones.findIndex(z => value < z.to) : -1;
    const activeIndex = hasValue ? (zoneIndex === -1 ? zones.length - 1 : zoneIndex) : -1;
    const activeZone = activeIndex >= 0 ? zones[activeIndex] : null;
    const nextZone = activeIndex >= 0 && activeIndex < zones.length - 1 ? zones[activeIndex + 1] : null;
    const formatNumber = (v) => Number.isInteger(v) ? String(v) : v.toFixed(1);
    const boundaries = [min, ...zones.map(z => z.to)];
    const stats = [
      ["Level", activeZone ? activeZone.label : "No Data", activeZone ? activeZone.color : null],
      ["Next Level", nextZone ? nextZone.label : activeZone ? "Top of Scale" : "—", nextZone ? nextZone.color : null],
      ["Threshold", activeZone && nextZone ? `${formatNumber(activeZone.to)}${unit}` : "—", null],
      ["To Threshold", activeZone && nextZone ? `${formatNumber(Math.abs(activeZone.to - value))}${unit}` : "—", null]
    ];
    return (
      <div className="satEarthCondRiskGauge">
        <div className="satEarthCondGaugeValue" style={{ color: activeZone ? activeZone.color : "#919baf" }}>{display}</div>
        <div className="satEarthCondGaugeLabel">{label}</div>
        <div className="satEarthCondGaugeScale">
          <div className="satEarthCondGaugeBar">
            {zones.map((z, i) => (
              <div key={i} className="satEarthCondGaugeZone" style={{ left: `${toPercent(boundaries[i])}%`, width: `${toPercent(z.to) - toPercent(boundaries[i])}%`, backgroundColor: z.color }} />
            ))}
            {hasValue && <div className="satEarthCondGaugeFill" style={{ width: `${toPercent(value)}%`, backgroundColor: activeZone.color }} />}
            {hasValue && <div className="satEarthCondGaugeMarker" style={{ left: `${toPercent(value)}%` }} />}
          </div>
          <div className="satEarthCondGaugeTicks">
            {boundaries.map((b, i) => (
              <span key={i} className="satEarthCondGaugeTick" style={{ left: `${toPercent(b)}%` }}>{formatNumber(b)}</span>
            ))}
          </div>
        </div>
        <div className="satEarthCondGaugeLegend">
          {zones.map((z, i) => (
            <span key={i} className={`satEarthCondGaugeLegendItem ${i === activeIndex ? "satEarthCondGaugeLegendItemActive" : ""}`}>
              <span className="satEarthCondGaugeLegendSwatch" style={{ backgroundColor: z.color }} />
              {z.label}
            </span>
          ))}
        </div>
        <div className="satEarthCondGaugeStats">
          {stats.map(([statLabel, statValue, statColor]) => (
            <div key={statLabel} className="satEarthCondGaugeStat">
              <span className="satEarthCondGaugeStatLabel">{statLabel}</span>
              <span className="satEarthCondGaugeStatValue" style={statColor ? { color: statColor } : undefined}>{statValue}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }, []);

  const renderDataTable = useCallback((title, headers, rows, options = {}) => {
    const prepared = rows.map((row) => row.map((cell) => {
      const isObject = cell !== null && typeof cell === "object" && !Array.isArray(cell);
      const text = safeRenderValue(isObject ? cell.value : cell);
      const color = isObject && cell.color ? cell.color : STATUS_TEXT_COLORS[String(text).toUpperCase()];
      return { text: String(formatDisplayValue(text)), color };
    }));
    const widths = headers.map((header, column) => prepared.reduce((longest, row) => Math.max(longest, row[column] ? row[column].text.length : 0), String(header).length));
    const kindOf = (column) => (widths[column] > SOURCES.tables.wrapAt ? "satWeatherCellWrap" : widths[column] > SOURCES.tables.tightAt ? "satWeatherCellMedium" : "satWeatherCellTight");
    return (
      <div className="satEarthCondTableCard">
        <div className="satEarthCondTableHeader">
          <h3>{title}</h3>
        </div>
        <div className="satEarthCondTableWrapper satWeatherTableWrapper">
          <table className="satEarthCondDataTable satWeatherDataTable">
            <thead><tr>{headers.map((header, column) => <th key={column} className={kindOf(column)}>{header}</th>)}</tr></thead>
            <tbody>
              {prepared.length > 0 ? prepared.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, column) => <td key={column} className={kindOf(column)} style={cell.color ? { color: cell.color } : undefined}>{cell.text}</td>)}
                </tr>
              )) : <tr><td colSpan={headers.length} className="satEarthCondTableNoData">{options.emptyText || "No Data"}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    );
  }, [safeRenderValue]);

  const renderDetailFields = (fields, options = {}) => (options.columns !== 3 ? (
    <div className="satWeatherDetailList">
      {fields.filter(([, value]) => value !== undefined && value !== null && value !== "" && value !== "—").map(([label, value]) => (
        <div key={label} className="satWeatherDetailRow">
          <span className="satWeatherDetailRowLabel">{label}</span>
          <span className="satWeatherDetailRowValue">{String(value)}</span>
        </div>
      ))}
    </div>
  ) : (
    <div className={`satWeatherDetailFields ${options.columns === 3 ? "satWeatherDetailFieldsWide" : ""}`}>
      {fields.filter(([, value]) => value !== undefined && value !== null && value !== "" && value !== "—").map(([label, value]) => {
        const text = value === null || value === "" ? "—" : String(value);
        return (
          <div key={label} className={`satWeatherDetailField ${text.length > (options.fullAt || 9999) ? "satWeatherDetailFieldFull" : text.length > (options.wideAt || 22) ? "satWeatherDetailFieldWide" : ""}`}>
            <span className="satWeatherDetailLabel">{label}</span>
            <span className="satWeatherDetailValue">{text}</span>
          </div>
        );
      })}
    </div>
  ));

  const exportData = useCallback((format) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const decision = getConsolidatedDecision();
    const allAlerts = getAllAlerts();
    const allViolations = getAllViolations();
    const exportContent = {
      metadata: {
        exportTime: new Date().toISOString(),
        location: locationName,
        latitude: selectedLat,
        longitude: selectedLon
      },
      decision: decision,
      alerts: allAlerts,
      violations: allViolations,
      consolidatedData: consolidatedData,
      performanceMetrics,
      alertHistory
    };
    const content = format === "csv"
      ? [
        "Timestamp,Module,Type,Severity,Parameter,Value,Limit,Message",
        ...allViolations.map(v => `${v.timestamp || ""},${v.source || ""},VIOLATION,${v.severity || ""},${v.parameter || ""},${v.value || ""},${v.limit || ""},"${(v.message || "").replace(/"/g, '""')}"`),
        ...allAlerts.map(a => `${a.timestamp || ""},${a.source || ""},ALERT,${a.severity || ""},${a.category || ""},,,"${(a.message || "").replace(/"/g, '""')}"`)
      ].join("\n")
      : JSON.stringify(exportContent, null, 2);
    const blob = new Blob([content], { type: format === "csv" ? "text/csv" : "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `earth-conditions-${timestamp}.${format === "csv" ? "csv" : "json"}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [consolidatedData, locationName, selectedLat, selectedLon, performanceMetrics, alertHistory, getConsolidatedDecision, getAllAlerts, getAllViolations]);

  const getWindyMapUrl = useCallback((lat, lon, overlay, level = "surface") => `${SOURCES.assets.windyEmbed}?lat=${lat}&lon=${lon}&detailLat=${lat}&detailLon=${lon}&width=650&height=500&zoom=6&level=${level}&overlay=${overlay}&product=ecmwf&menu=&message=&marker=&calendar=&pressure=&type=map&location=coordinates&detail=&metricWind=kt&metricTemp=c&radarRange=-1&timestamp=${Date.now()}`, []);

  const handleExpandClick = (event) => {
    if (event.target.closest("button, a, input, select, textarea, label")) return;
    const target = event.target.closest(EXPANDABLE_SELECTOR);
    if (!target) return;
    const panel = target.closest("[class*='satEarthCondPanel']");
    const heading = panel?.querySelector("h4")?.textContent || target.querySelector("h3")?.textContent || "Details";
    setExpandedView({ title: heading, html: target.outerHTML });
  };

  const locationTimezone = getModuleData("groundEnvironment")?.locationTimezone || undefined;

  const formatLocationTime = (iso, withDate = false) => {
    if (!iso) return "—";
    const date = new Date(iso);
    if (isNaN(date.valueOf())) return "—";
    const options = { hour: "numeric", minute: "2-digit", ...(withDate ? { month: "short", day: "numeric" } : {}) };
    try {
      return date.toLocaleString("en-US", { ...options, timeZone: locationTimezone });
    } catch (error) {
      return date.toLocaleString("en-US", options);
    }
  };

  const formatValue = (value, digits = 1, unit = "") => (value === null || value === undefined || isNaN(value) ? "—" : `${Number(value).toFixed(digits)}${unit}`);

  const renderDescription = (text) => (
    interpretations[text] ? (
      <p className="satEarthCondChartDescriptionText" data-description-key={text}>{interpretations[text]}</p>
    ) : (
      <p className="satEarthCondChartDescriptionText satEarthCondDescriptionPending" data-description-key={text}>
        {interpretationFailures[text] ? "Interpretation Unavailable" : "Generating Interpretation"}
      </p>
    )
  );

  const PANEL_CONTAINER_CLASS = { LIVE: "Live", FORECAST: "Forecast", TREND: "Trend", HISTORICAL: "Historical", COMPUTED: "Computed", PROBABILISTIC: "Forecast" };

  const renderSection = (label, icon, rows) => (
    <>
      <div className="satEarthCondSectionDivider">
        <div className="satEarthCondSectionDividerLine" />
        <span className="satEarthCondSectionDividerLabel">
          <FontAwesomeIcon icon={icon} />
          {label}
        </span>
        <div className="satEarthCondSectionDividerLine" />
      </div>
      {rows.map((row, rowIndex) => {
        const panels = row.filter(Boolean);
        if (!panels.length) return null;
        const width = panels.length === 1 ? "Single" : panels.length === 2 ? "Double" : "Triple";
        return (
          <div key={`${label}_${rowIndex}`} className="satEarthCondOverviewGrid">
            {panels.map(panel => (
              <div key={panel.title} className={`satEarthCondPanel${width} satEarthCondChartContainer${PANEL_CONTAINER_CLASS[panel.badge] || "Live"}`}>
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>{panel.title}</h4>
                  {renderDataTypeBadge(panel.badge || "LIVE", "small")}
                </div>
                {panel.content}
                <div className="satEarthCondChartDescription">
                  {panel.axes && (
                    <div className="satEarthCondChartAxesInfo">
                      <span><strong>X-Axis:</strong> {panel.axes[0]}</span>
                      <span><strong>Y-Axis:</strong> {panel.axes[1]}</span>
                    </div>
                  )}
                  {renderDescription(panel.description)}
                </div>
                {panel.axes && renderChartStats(panel.chart)}
              </div>
            ))}
          </div>
        );
      })}
    </>
  );

  const renderOverviewTab = () => {
    const decision = getConsolidatedDecision() || {};
    const criticalCount = bellItems.filter((item) => item.severity === "CRITICAL").length;
    const warningCount = bellItems.filter((item) => item.severity === "WARNING").length;
    const advisoryCount = scopeConditions.filter((item) => item.severity === "ADVISORY" && !isSystemCondition(item)).length;
    const statusColor = decision.status === "NOMINAL" ? "#4ecdc4" : decision.status === "ELEVATED" ? "#FF9500" : decision.status === "SEVERE" ? "#ff6b6b" : "#919baf";
    const moduleStatuses = decision.moduleStatuses || consolidatedData?.module_statuses || [];

    const sourceStatusOrder = { FAILED: 0, DEGRADED: 1, PENDING: 2, AVAILABLE: 3 };
    const getSourceColor = (status) => status === "AVAILABLE" ? "#4ecdc4" : status === "DEGRADED" ? "#FF9500" : status === "FAILED" ? "#ff6b6b" : "#919baf";

    const consoleItems = {
      alerts: scopeConditions.filter((item) => item.kind === "alert"),
      violations: scopeConditions.filter((item) => item.kind === "violation"),
      sources: MODULE_DEFINITIONS.flatMap(module => (getModuleData(module.key)?.alertManager?.dataSources || []).filter(Boolean).map((ds, idx) => ({ ...ds, id: `${module.key}_${ds.name}_${idx}`, moduleKey: module.key, moduleName: module.name, level: ds.status })))
        .sort((a, b) => (sourceStatusOrder[a.level] ?? 4) - (sourceStatusOrder[b.level] ?? 4))
    };

    const levelOptions = CONSOLE_LEVEL_OPTIONS[consoleView];
    const matchesLevel = (item, level) => level === "all" || (level === "unacknowledged" ? pendingKeys.has(item.key) : item.level === level);
    const matchesModule = (item, moduleKey) => moduleKey === "all" || item.moduleKey === moduleKey;
    const searchTerm = consoleSearch.trim().toLowerCase();
    const matchesSearch = (item) => searchTerm === "" || [item.message, item.parameter, item.name, item.source, item.category, item.description, item.moduleName, item.placeLabel].filter(Boolean).some(text => String(text).toLowerCase().includes(searchTerm));

    const viewItems = consoleItems[consoleView];
    const visibleItems = viewItems.filter(item => matchesModule(item, consoleModuleFilter) && matchesLevel(item, consoleLevelFilter) && matchesSearch(item));
    const selectedItem = visibleItems.find(item => item.id === selectedConsoleItemId) || visibleItems[0] || null;

    const moduleCounts = Object.fromEntries([["all", 0], ...MODULE_DEFINITIONS.map(module => [module.key, 0])]);
    viewItems.filter(item => matchesLevel(item, consoleLevelFilter) && matchesSearch(item)).forEach(item => {
      moduleCounts.all++;
      moduleCounts[item.moduleKey]++;
    });
    const levelCounts = Object.fromEntries(levelOptions.map(([value]) => [value, viewItems.filter(item => matchesModule(item, consoleModuleFilter) && matchesLevel(item, value) && matchesSearch(item)).length]));

    const switchConsoleView = (view) => {
      setConsoleView(view);
      setConsoleLevelFilter("all");
      setSelectedConsoleItemId(null);
    };

    const formatTime = (timestamp) => timestamp ? new Date(timestamp).toLocaleTimeString() : "—";
    const formatDetailValue = (value) => {
      if (value === null || value === undefined || value === "") return "—";
      if (typeof value === "number") return Number.isInteger(value) ? value : value.toFixed(3);
      if (typeof value === "object") return JSON.stringify(value);
      return String(value);
    };

    const renderConsoleRow = (item) => {
      const isSelected = selectedItem && item.id === selectedItem.id;
      const levelColor = consoleView === "sources" ? getSourceColor(item.level) : (SEVERITY_CONFIG[item.level] || SEVERITY_CONFIG.INFO).color;
      const isPending = consoleView !== "sources" && pendingKeys.has(item.key);
      const primaryText = consoleView === "alerts" ? item.message : consoleView === "violations" ? item.parameter : formatDisplayValue(item.name || "");
      const secondaryText = consoleView === "alerts" ? formatDisplayValue(item.category) : consoleView === "violations" ? `${item.value} | Limit ${item.limit}` : formatDisplayValue(item.criticality);
      const trailingText = consoleView === "alerts" ? formatTime(item.timestamp) : consoleView === "violations" ? `${item.deviationPercent ?? 0}%` : (item.responseTime ? `${item.responseTime}ms` : "—");
      return (
        <button
          key={item.id}
          type="button"
          className={`satEarthCondConsoleRow ${isSelected ? "satEarthCondConsoleRowSelected" : ""}`}
          style={{ borderLeftColor: levelColor }}
          onClick={() => setSelectedConsoleItemId(item.id)}
        >
          <span className="satEarthCondConsoleRowLevel" style={{ color: levelColor }}>{formatDisplayValue(item.level)}</span>
          <span className="satEarthCondConsoleRowText">
            <span className="satEarthCondConsoleRowPrimary">{primaryText}</span>
            <span className="satEarthCondConsoleRowSecondary">{[activeAreas && consoleView !== "sources" ? item.placeLabel : null, item.moduleName, secondaryText].filter(Boolean).join(" | ")}</span>
          </span>
          <span className="satEarthCondConsoleRowTrailing">{isPending ? "Unacknowledged" : trailingText}</span>
        </button>
      );
    };

    const renderConsoleDetail = () => {
      if (!selectedItem) {
        return (
          <div className="satEarthCondConsoleEmpty">
            <FontAwesomeIcon icon={faSquareCheck} />
            <span>Nothing Matches the Current Filters</span>
          </div>
        );
      }
      const levelColor = consoleView === "sources" ? getSourceColor(selectedItem.level) : (SEVERITY_CONFIG[selectedItem.level] || SEVERITY_CONFIG.INFO).color;
      let title;
      let fields;
      let note = null;
      if (consoleView === "sources") {
        title = formatDisplayValue(selectedItem.name || "");
        fields = [
          ["Status", selectedItem.status],
          ["Criticality", selectedItem.criticality],
          ["Module", selectedItem.moduleName],
          ["Response Time", selectedItem.responseTime ? `${selectedItem.responseTime}ms` : null],
          ["Last Update", formatTime(selectedItem.lastUpdate)],
          ["Error Count", selectedItem.errorCount]
        ].map(([label, value]) => [label, formatDisplayValue(formatDetailValue(value))]);
        note = selectedItem.description || null;
      } else {
        title = selectedItem.message;
        fields = [
          ["Status", pendingKeys.has(selectedItem.key) ? "Unacknowledged" : null],
          ...conditionFields(selectedItem)
        ];
        note = selectedItem.recommendedAction || null;
      }
      return (
        <div className="satEarthCondConsoleDetailBody">
          <div className="satEarthCondConsoleDetailHeader" style={{ borderLeftColor: levelColor }}>
            <span className="satEarthCondConsoleDetailLevel" style={{ color: levelColor }}>{formatDisplayValue(selectedItem.level)}</span>
            <span className="satEarthCondConsoleDetailTitle">{title}</span>
          </div>
          {renderDetailFields(fields)}
          {note && <div className="satEarthCondConsoleDetailNote">{note}</div>}
          {consoleView !== "sources" && pendingKeys.has(selectedItem.key) && (
            <button type="button" className="satEarthCondBtn satEarthCondBtnSecondary" onClick={() => sounds.acknowledge(selectedItem.key)}>
              <FontAwesomeIcon icon={faSquareCheck} /> Acknowledge
            </button>
          )}
        </div>
      );
    };

    return (
      <div className="satEarthCondOverviewTab">

        <div className="satEarthCondMainDecision" style={{ borderColor: statusColor }}>
          <div className="satEarthCondDecisionDataType">
            {renderDataTypeBadge("COMPUTED")}
          </div>

          <div className="satEarthCondDecisionContent">
            <div className="satEarthCondDecisionIconStack">
              <h1 style={{ color: statusColor }}>{formatDisplayValue(decision.status || "UNKNOWN")}</h1>
            </div>
            <p className="satEarthCondDecisionReason">{decision.primaryReason || "No Reason Available"}</p>
            <div className="satEarthCondDecisionMeta">
              <span>Confidence: <strong>{decision.confidence ?? 0}%</strong></span>
              <span>Hazard Index: <strong>{((decision.riskScore || 0) * 100).toFixed(1)}%</strong></span>
              <span>Data Available: <strong>{decision.dataAvailability ?? 0}%</strong></span>
              <span>Category: <strong>{decision.category || "N/A"}</strong></span>
            </div>
            <div className="satEarthCondConfidenceBar"><div className="satEarthCondConfidenceFill" style={{ width: `${decision.confidence ?? 0}%`, backgroundColor: statusColor }} /></div>
          </div>
        </div>

        <div className="satEarthCondSummaryBar">
          <div className="satEarthCondSummaryCards">
            <div className="satEarthCondSummaryCard satEarthCondSummaryCardCritical"><FontAwesomeIcon icon={faExclamationTriangle} /><div className="satEarthCondSummaryCardContent"><span className="satEarthCondSummaryCount">{criticalCount}</span><span className="satEarthCondSummaryLabel">Critical</span></div></div>
            <div className="satEarthCondSummaryCard satEarthCondSummaryCardWarning"><FontAwesomeIcon icon={faExclamationTriangle} /><div className="satEarthCondSummaryCardContent"><span className="satEarthCondSummaryCount">{warningCount}</span><span className="satEarthCondSummaryLabel">Warning</span></div></div>
            <div className="satEarthCondSummaryCard satEarthCondSummaryCardAdvisory"><FontAwesomeIcon icon={faInfoCircle} /><div className="satEarthCondSummaryCardContent"><span className="satEarthCondSummaryCount">{advisoryCount}</span><span className="satEarthCondSummaryLabel">Advisory</span></div></div>
            <div className="satEarthCondSummaryCard satEarthCondSummaryCardAck"><FontAwesomeIcon icon={faSquareCheck} /><div className="satEarthCondSummaryCardContent"><span className="satEarthCondSummaryCount">{pendingKeys.size}</span><span className="satEarthCondSummaryLabel">Unacknowledged</span></div></div>
          </div>
        </div>

        <div className="satEarthCondModuleStrip">
          {MODULE_DEFINITIONS.map(module => {
            const moduleStatus = moduleStatuses.find(m => m && m.name === module.name);
            const status = moduleStatus?.status || "PENDING";
            const violations = consoleItems.violations.filter((item) => item.moduleKey === module.key).length;
            const alerts = consoleItems.alerts.filter((item) => item.moduleKey === module.key).length;
            const critAlerts = bellItems.filter((item) => item.moduleKey === module.key && item.severity === "CRITICAL").length;
            const modStatusColor = status === "AVAILABLE" ? "rgba(78, 205, 196, 0.6)" : status === "FAILED" ? "rgba(255, 107, 107, 0.6)" : status === "PENDING" ? "rgba(145, 155, 175, 0.6)" : "rgba(255, 149, 0, 0.6)";
            const isActive = consoleModuleFilter === module.key;
            return (
              <button
                key={module.key}
                type="button"
                className={`satEarthCondSystemItem satEarthCondModuleStripItem ${isActive ? "satEarthCondModuleStripItemActive" : ""}`}
                onClick={() => {
                  setConsoleModuleFilter(isActive ? "all" : module.key);
                  setSelectedConsoleItemId(null);
                }}
              >
                <div className="satEarthCondSystemIndicator" style={{ backgroundColor: modStatusColor }}><FontAwesomeIcon icon={module.icon} /></div>
                <div className="satEarthCondSystemInfo">
                  <span className="satEarthCondSystemName">{module.name}</span>
                  <span className="satEarthCondSystemStatus" style={{ color: modStatusColor }}>{formatDisplayValue(status)}</span>
                </div>
                <div className="satEarthCondSystemCounts">
                  {critAlerts > 0 && <span className="satEarthCondCriticalCount">{critAlerts}</span>}
                  {violations > 0 && <span className="satEarthCondViolationCount">{violations}</span>}
                  {alerts > 0 && <span className="satEarthCondAlertCount">{alerts}</span>}
                </div>
              </button>
            );
          })}
        </div>

        <div className="satEarthCondConsole">
          <div className="satEarthCondConsoleTabs">
            {CONSOLE_VIEWS.map(([view, label, icon]) => (
              <button
                key={view}
                type="button"
                className={`satEarthCondConsoleTab ${consoleView === view ? "satEarthCondConsoleTabActive" : ""}`}
                onClick={() => switchConsoleView(view)}
              >
                <FontAwesomeIcon icon={icon} />
                <span>{label}</span>
                <span className="satEarthCondConsoleTabCount">{consoleItems[view].length}</span>
              </button>
            ))}
            <input
              type="text"
              placeholder="Search"
              value={consoleSearch}
              onChange={(e) => setConsoleSearch(e.target.value)}
              className="satEarthCondInput satEarthCondConsoleSearch"
            />
          </div>

          <div className="satEarthCondConsoleBody">
            <div className="satEarthCondConsoleRail">
              <div className="satEarthCondConsoleRailGroup">
                <span className="satEarthCondConsoleRailLabel">Module</span>
                {[["all", "All Modules"], ...MODULE_DEFINITIONS.map(module => [module.key, module.name])].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`satEarthCondConsoleRailItem ${consoleModuleFilter === value ? "satEarthCondConsoleRailItemActive" : ""}`}
                    onClick={() => {
                      setConsoleModuleFilter(value);
                      setSelectedConsoleItemId(null);
                    }}
                  >
                    <span>{label}</span>
                    <span className="satEarthCondConsoleRailCount">{moduleCounts[value] ?? 0}</span>
                  </button>
                ))}
              </div>
              <div className="satEarthCondConsoleRailGroup">
                <span className="satEarthCondConsoleRailLabel">{consoleView === "sources" ? "Status" : "Severity"}</span>
                {levelOptions.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`satEarthCondConsoleRailItem ${consoleLevelFilter === value ? "satEarthCondConsoleRailItemActive" : ""}`}
                    onClick={() => {
                      setConsoleLevelFilter(value);
                      setSelectedConsoleItemId(null);
                    }}
                  >
                    <span>{label}</span>
                    <span className="satEarthCondConsoleRailCount">{levelCounts[value] ?? 0}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="satEarthCondConsoleList">
              <div className="satEarthCondConsoleListHeader">
                <span>Showing {visibleItems.length} of {viewItems.length}</span>
                {consoleView !== "sources" && visibleItems.some(item => pendingKeys.has(item.key)) && (
                  <button
                    type="button"
                    className="satEarthCondConsoleListAction"
                    onClick={() => visibleItems.filter(item => pendingKeys.has(item.key)).forEach(item => sounds.acknowledge(item.key))}
                  >
                    Acknowledge Shown
                  </button>
                )}
              </div>
              <div className="satEarthCondConsoleListRows">
                {visibleItems.length > 0 ? visibleItems.map(renderConsoleRow) : (
                  <div className="satEarthCondConsoleEmpty">
                    <FontAwesomeIcon icon={faSquareCheck} />
                    <span>Nothing Matches the Current Filters</span>
                  </div>
                )}
              </div>
            </div>

            <div className="satEarthCondConsoleDetail">
              {renderConsoleDetail()}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderGroundEnvironmentTab = () => {
    const data = getModuleData("groundEnvironment") || {};
    if (!data || Object.keys(data).length === 0) return renderEmptyState(faDatabase, "There is no local conditions data yet.");

    const coastalMesoscale = getModuleData("temporalForensics")?.coastalMesoscale || {};
    const historicalGradients = coastalMesoscale.historicalGradients || [];
    const marineLayerData = coastalMesoscale.marineLayerData || [];
    const landSeaGradientChart = historicalGradients.length > 0 ? createDynamicLineChart("Land-Sea Temp Gradient", historicalGradients.slice(-48), "timestamp", "gradient", " °C", "#ffd93d", false) : null;
    const marineLayerChart = marineLayerData.length > 0 ? createDynamicLineChart("Marine Layer Depth", marineLayerData.slice(-48), "timestamp", "depth", " m", "#42a5f5", false) : null;

    const historicalSeismic = data.historicalSeismic || {};
    const historicalSeismicTimeSeries = historicalSeismic?.timeSeries || [];
    const seismicChart = historicalSeismicTimeSeries.length > 0 ? createDynamicLineChart("Seismic Activity (30 Days)", historicalSeismicTimeSeries, "timestamp", "magnitude", " M", "#42a5f5", false) : null;




    const severeWeather = data.severeWeather || {};
    const lightningMonitoring = data.lightningMonitoring || {};
    const airTraffic = data.airTraffic || {};
    const airspaceRestrictions = data.airspaceRestrictions || {};
    const localEnvironment = data.localEnvironment || {};
    const outdoorSafety = localEnvironment.outdoorSafety || {};
    const localHazards = data.localHazards || {};
    const seaConditions = localHazards.seaConditions || {};
    const statusColor = (status) => STATUS_TEXT_COLORS[String(status).toUpperCase()] || "#919baf";
    const hasNumber = (value) => value !== null && value !== undefined && !isNaN(value);
    const waveHeight = seaConditions.waveHeight;
    const outdoorStatus = outdoorSafety.outdoorSafe === null || outdoorSafety.outdoorSafe === undefined ? "NO DATA" : outdoorSafety.outdoorSafe ? "SAFE" : "CAUTION";
    const visibilityMeters = localEnvironment.visibility?.visibility;
    const warningCount = data.officialWarnings?.warnings?.length ?? 0;
    const warningStatus = data.officialWarnings?.coverage === "NOT_COVERED" ? "NOT COVERED" : data.officialWarnings?.coverage === "COVERED" ? (warningCount > 0 ? "ACTIVE" : "NONE") : "NO DATA";
    const localStatusItems = [
      { label: "Outdoor", icon: faThermometerHalf, status: outdoorStatus, color: statusColor(outdoorStatus), detail: hasNumber(outdoorSafety.heatIndex) ? `Heat Index ${outdoorSafety.heatIndex} C` : "Heat Index Unavailable" },
      { label: "Visibility", icon: faEye, status: localEnvironment.visibility?.status || "NO DATA", color: statusColor(localEnvironment.visibility?.status || "NO DATA"), detail: hasNumber(visibilityMeters) ? `${(visibilityMeters / 1000).toFixed(1)} km Range` : "Range Unavailable" },
      { label: "Sea State", icon: faWater, status: seaConditions.seaState ? seaConditions.seaState.replace(/_/g, " ") : "NO DATA", color: hasNumber(waveHeight) ? (waveHeight < 2.5 ? "#4ecdc4" : waveHeight < 4 ? "#FF9500" : "#ff6b6b") : "#919baf", detail: hasNumber(waveHeight) ? `${waveHeight} m Waves` : "Wave Height Unavailable" },
      { label: "Lightning", icon: faBolt, status: lightningMonitoring.activityStatus || "NO DATA", color: statusColor(lightningMonitoring.activityStatus || "NO DATA"), detail: lightningMonitoring.basis ? lightningMonitoring.basis.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : "Estimate Unavailable" },
      { label: "Severe Weather", icon: faCloudShowersHeavy, status: severeWeather.threatAssessment || "NO DATA", color: statusColor(severeWeather.threatAssessment || "NO DATA"), detail: `${severeWeather.reports24h?.total ?? 0} Reports (24h)` },
      { label: "Airspace", icon: faPlane, status: airspaceRestrictions.airspaceClosureStatus || "NO DATA", color: statusColor(airspaceRestrictions.airspaceClosureStatus || "NO DATA"), detail: `${airspaceRestrictions.activeTFRs?.length ?? 0} TFRs, ${airspaceRestrictions.activeNOTAMs?.length ?? 0} NOTAMs` },
      { label: "Official Warnings", icon: faExclamationTriangle, status: warningStatus, color: statusColor(warningStatus), detail: data.officialWarnings?.provider ? `${data.officialWarnings.warnings?.length ?? 0} Active From ${data.officialWarnings.provider}` : "No Feed For This Country" },
      { label: "Air Quality", icon: faSmog, status: data.airQuality?.usAqiCategory || "NO DATA", color: statusColor(data.airQuality?.usAqiCategory || "NO DATA"), detail: hasNumber(data.airQuality?.usAqi) ? `US AQI ${Math.round(data.airQuality.usAqi)}` : "AQI Unavailable" },
      { label: "UV", icon: faSun, status: data.airQuality?.uvCategory || "NO DATA", color: statusColor(data.airQuality?.uvCategory || "NO DATA"), detail: hasNumber(data.airQuality?.uvIndex) ? `UV Index ${data.airQuality.uvIndex.toFixed(1)}` : "UV Unavailable" }
    ];

    const getThreatColor = (threat) => {
      if (threat === "CRITICAL") return "#ff6b6b";
      if (threat === "ELEVATED") return "#FF9500";
      if (threat === "GUARDED") return "#ffd93d";
      return "#4ecdc4";
    };

    const officialWarnings = data.officialWarnings || { warnings: [] };
    const nearestObservation = data.nearestObservation?.station || null;
    const comfort = data.comfort || {};
    const airQuality = data.airQuality || { hourly: [], pollen: {} };
    const purpleAir = data.purpleAir || { sensors: [] };
    const sunMoon = data.sunMoon || {};
    const garden = data.garden || { daily: [] };
    const tropicalHazards = data.tropicalHazards || { storms: [], events: [] };
    const tides = data.tides || { extremes: [], series: [] };
    const riverGauges = data.riverGauges || { gauges: [] };
    const floodForecast = data.floodForecast || { series: [] };

    const warningEmptyText = officialWarnings.coverage === "NOT_COVERED" ? "No official warning feed covers this country yet." : officialWarnings.coverage === "COVERED" ? "No official warnings are in effect for this location." : "Official warning coverage could not be determined.";
    const aqiChart = airQuality.hourly?.length ? createDynamicLineChart("US AQI Forecast", airQuality.hourly.filter(p => p && p.usAqi !== null && p.usAqi !== undefined), (p) => p.time.slice(11, 16), "usAqi", "", "#FF9500", true) : null;
    const uvChart = airQuality.hourly?.length ? createDynamicLineChart("UV Index Forecast", airQuality.hourly.filter(p => p && p.uvIndex !== null && p.uvIndex !== undefined), (p) => p.time.slice(11, 16), "uvIndex", "", "#ffd93d", true) : null;
    const tideChart = tides.series?.length ? createDynamicLineChart("Tide Prediction", tides.series.filter(p => p && p.height !== null && p.height !== undefined), (p) => formatLocationTime(p.time, true), "height", " m", "#42a5f5", true) : null;
    const dischargeChart = floodForecast.series?.length ? createDynamicLineChart("River Discharge", floodForecast.series.filter(p => p && ((p.median ?? p.discharge) !== null && (p.median ?? p.discharge) !== undefined)), "date", (p) => p.median ?? p.discharge, " m³/s", "#4ecdc4", true) : null;

    const officialWarningsSection = renderSection("Official Warnings", faExclamationTriangle, [[
      {
        title: `Active Warnings (${officialWarnings.warnings?.length || 0})`,
        badge: "LIVE",
        content: renderDataTable(officialWarnings.provider || "Official Warnings", ["Event", "Severity", "Urgency", "Area", "Onset", "Expires", "Issued By"], (officialWarnings.warnings || []).map(w => [
          w.event || "—",
          { value: String(w.severity || "Unknown").toUpperCase(), color: w.severity === "Extreme" ? "#ff6b6b" : w.severity === "Severe" ? "#FF9500" : w.severity === "Moderate" ? "#ffd93d" : "#42a5f5" },
          w.urgency || "—",
          w.area || "—",
          formatLocationTime(w.onset, true),
          formatLocationTime(w.expires, true),
          w.sender || "—"
        ]), { emptyText: warningEmptyText }),
        description: `This table lists the watches, warnings, and advisories currently in effect from ${officialWarnings.provider || "the national weather service"} for the selected location. Official warnings are issued by forecasters and take precedence over any value computed on this page. ${officialWarnings.matchMethod === "Region Name" ? "European warnings are matched to this location by region name, so check the issuing service for exact boundaries." : "United States warnings are matched to this exact point."}`
      }
    ]]);

    const nearestObservationSection = renderSection("Nearest Observation", faPlane, [[
      {
        title: nearestObservation ? `${nearestObservation.id}: ${nearestObservation.name}` : "Airport Observation",
        badge: "LIVE",
        content: renderDataTable("METAR", ["Parameter", "Value", "Unit"], nearestObservation ? [
          ["Distance", formatValue(nearestObservation.distanceKm), "km"],
          ["Observed", formatLocationTime(nearestObservation.observedAt, true), ""],
          ["Temperature", formatValue(nearestObservation.temperature), "C"],
          ["Dew Point", formatValue(nearestObservation.dewPoint), "C"],
          ["Wind", `${formatValue(nearestObservation.windSpeed)}${nearestObservation.windGust ? ` Gusting ${formatValue(nearestObservation.windGust)}` : ""}`, "m/s"],
          ["Wind Direction", formatValue(nearestObservation.windDirection, 0), "deg"],
          ["Visibility", formatValue(nearestObservation.visibilityKm), "km"],
          ["Ceiling", nearestObservation.ceilingFt !== null && nearestObservation.ceilingFt !== undefined ? nearestObservation.ceilingFt : "None", "ft"],
          ["Pressure", formatValue(nearestObservation.pressure), "hPa"],
          ["Weather", nearestObservation.weather || "None", ""],
          ["Flight Category", nearestObservation.flightCategory || "—", ""]
        ] : [], { emptyText: "No airport observation was found within about 150 km." }),
        description: "This table shows the most recent official observation from the nearest airport weather station, reported in the METAR format. Airport stations are calibrated instruments maintained to aviation standards, which makes them the most reliable ground truth nearby. The flight category summarizes ceiling and visibility, from VFR for clear conditions to LIFR for very low clouds or fog."
      },
      {
        title: "Observation Versus Model",
        badge: "COMPUTED",
        content: renderDataTable("Comparison", ["Parameter", "Observed", "Model", "Difference", "Unit"], nearestObservation && comfort.dataAvailable ? [
          ["Temperature", nearestObservation.temperature, comfort.temperature, "C"],
          ["Dew Point", nearestObservation.dewPoint, comfort.dewPoint, "C"],
          ["Wind Speed", nearestObservation.windSpeed, comfort.windSpeedKmh !== null && comfort.windSpeedKmh !== undefined ? comfort.windSpeedKmh / 3.6 : null, "m/s"]
        ].map(([label, observed, model, unit]) => [
          label,
          formatValue(observed),
          formatValue(model),
          observed !== null && observed !== undefined && model !== null && model !== undefined ? `${observed - model > 0 ? "+" : ""}${(observed - model).toFixed(1)}` : "—",
          unit
        ]) : [], { emptyText: "Both an airport observation and model data are needed for this comparison." }),
        description: "This table compares the airport observation with the model value at the selected location. The two are not at exactly the same place, so small differences are expected, but large ones suggest the model is missing a front, a sea breeze, or a local storm."
      }
    ]]);

    const comfortSection = renderSection("Comfort & Health", faThermometerHalf, [[
      {
        title: "Heat Stress (WBGT)",
        badge: "COMPUTED",
        content: renderGauge({ value: comfort.wbgt, display: comfort.wbgt !== null && comfort.wbgt !== undefined ? `${comfort.wbgt.toFixed(1)}°C` : "—", label: "Estimated Wet Bulb Globe Temperature", unit: "°C", min: 15, max: 35, zones: [{ to: 25.6, label: "Low", color: "#4ecdc4" }, { to: 27.8, label: "Moderate", color: "#ffd93d" }, { to: 29.4, label: "Elevated", color: "#FF9500" }, { to: 31.1, label: "High", color: "#ff6b6b" }, { to: 35, label: "Extreme", color: "#d9534f" }] }),
        description: "This gauge shows the estimated wet bulb globe temperature in the shade, the standard measure used by athletic and military guidelines to limit heat stress. It combines temperature and humidity, and full sun can add several degrees. Above 29.4°C, strenuous activity should be limited and frequent rest breaks taken."
      },
      {
        title: "Comfort Indices",
        badge: "COMPUTED",
        content: renderDataTable("Indices", ["Parameter", "Value", "Status"], [
          ["Feels Like", formatValue(comfort.apparentTemperature, 1, " C"), "INFO"],
          ["Wind Chill", comfort.windChill !== null && comfort.windChill !== undefined ? formatValue(comfort.windChill, 1, " C") : "Not Applicable", comfort.windChill !== null && comfort.windChill !== undefined && comfort.windChill < -10 ? "WARNING" : "OK"],
          ["Dew Point", formatValue(comfort.dewPoint, 1, " C"), comfort.dewPointComfort || "—"],
          ["Humidity", formatValue(comfort.humidity, 0, "%"), "INFO"],
          ["Pressure", formatValue(comfort.pressure, 1, " hPa"), "INFO"],
          ["Pressure Change (3h)", comfort.pressureChange3h !== null && comfort.pressureChange3h !== undefined ? `${comfort.pressureChange3h > 0 ? "+" : ""}${comfort.pressureChange3h.toFixed(1)} hPa` : "—", comfort.pressureTendency || "—"],
          ["Heat Category", comfort.wbgtCategory || "—", comfort.wbgtCategory || "—"]
        ]),
        description: "This table lists how the air actually feels and how it is changing. Dew point is the best single measure of mugginess, with values above 18°C feeling humid for most people. A pressure fall of more than 3 hPa in 3 hours often signals an approaching storm, and people sensitive to pressure changes may notice headaches or joint pain."
      }
    ]]);

    const airQualitySection = renderSection("Air Quality & UV", faSmog, [
      [
        {
          title: "Air Quality Index",
          badge: "LIVE",
          content: renderGauge({ value: airQuality.usAqi, display: airQuality.usAqi !== null && airQuality.usAqi !== undefined ? String(Math.round(airQuality.usAqi)) : "—", label: "US Air Quality Index", unit: "", min: 0, max: 300, zones: [{ to: 50, label: "Good", color: "#4ecdc4" }, { to: 100, label: "Moderate", color: "#ffd93d" }, { to: 150, label: "Sensitive", color: "#FF9500" }, { to: 200, label: "Unhealthy", color: "#ff6b6b" }, { to: 300, label: "Very Unhealthy", color: "#d9534f" }] }),
          description: "This gauge shows the US Air Quality Index from the CAMS atmospheric composition model. Above 100, people with asthma, heart disease, children, and older adults should reduce prolonged outdoor exertion, and above 150 everyone should. The index is driven by whichever pollutant is currently worst, most often fine particles or ozone."
        },
        {
          title: "UV Index",
          badge: "LIVE",
          content: renderGauge({ value: airQuality.uvIndex, display: airQuality.uvIndex !== null && airQuality.uvIndex !== undefined ? airQuality.uvIndex.toFixed(1) : "—", label: `UV Index (Today's Peak ${airQuality.uvMaxToday !== null && airQuality.uvMaxToday !== undefined ? airQuality.uvMaxToday.toFixed(1) : "—"})`, unit: "", min: 0, max: 12, zones: [{ to: 3, label: "Low", color: "#4ecdc4" }, { to: 6, label: "Moderate", color: "#ffd93d" }, { to: 8, label: "High", color: "#FF9500" }, { to: 11, label: "Very High", color: "#ff6b6b" }, { to: 12, label: "Extreme", color: "#d9534f" }] }),
          description: "This gauge shows the current ultraviolet index and today's forecast peak. At 3 or higher, sun protection is recommended, and at 8 or higher unprotected skin can burn in under 15 minutes. UV is strongest around solar noon and can stay high on cloudy days."
        }
      ],
      [
        {
          title: "Pollutants",
          badge: "LIVE",
          content: renderDataTable("Concentrations", ["Pollutant", "Value", "Unit", "Status"], [
            ["PM2.5", formatValue(airQuality.pm25), "µg/m³", airQuality.pm25 === null || airQuality.pm25 === undefined ? "NO DATA" : airQuality.pm25 <= 9 ? "GOOD" : airQuality.pm25 <= 35.4 ? "MODERATE" : "HIGH"],
            ["PM10", formatValue(airQuality.pm10), "µg/m³", airQuality.pm10 === null || airQuality.pm10 === undefined ? "NO DATA" : airQuality.pm10 <= 54 ? "GOOD" : airQuality.pm10 <= 154 ? "MODERATE" : "HIGH"],
            ["Ozone", formatValue(airQuality.ozone), "µg/m³", airQuality.ozone === null || airQuality.ozone === undefined ? "NO DATA" : airQuality.ozone <= 100 ? "GOOD" : airQuality.ozone <= 160 ? "MODERATE" : "HIGH"],
            ["Nitrogen Dioxide", formatValue(airQuality.nitrogenDioxide), "µg/m³", airQuality.nitrogenDioxide === null || airQuality.nitrogenDioxide === undefined ? "NO DATA" : airQuality.nitrogenDioxide <= 40 ? "GOOD" : "MODERATE"],
            ["Sulphur Dioxide", formatValue(airQuality.sulphurDioxide), "µg/m³", "INFO"],
            ["Carbon Monoxide", formatValue(airQuality.carbonMonoxide, 0), "µg/m³", "INFO"],
            ["Dust", formatValue(airQuality.dust), "µg/m³", "INFO"],
            ["European AQI", formatValue(airQuality.europeanAqi, 0), "", "INFO"]
          ]),
          description: "This table breaks the air quality index into its individual pollutants. Fine particles (PM2.5) come mostly from smoke, traffic, and industry and penetrate deepest into the lungs, while ozone forms on hot, sunny afternoons. Model values represent an area several kilometers wide and can miss very local sources."
        },
        {
          title: "Pollen",
          badge: "LIVE",
          content: renderDataTable("Pollen Grains", ["Type", "Value", "Unit", "Status"], [["Grass", "grass"], ["Birch", "birch"], ["Alder", "alder"], ["Ragweed", "ragweed"], ["Mugwort", "mugwort"], ["Olive", "olive"]].map(([label, key]) => {
            const value = airQuality.pollen?.[key];
            return [label, formatValue(value, 0), "grains/m³", value === null || value === undefined ? "NO DATA" : value < 10 ? "LOW" : value < 50 ? "MODERATE" : "HIGH"];
          })),
          description: "This table shows pollen concentrations for six common allergenic plants. The pollen forecast covers Europe only, so locations elsewhere show no data. Counts above about 50 grains per cubic meter cause symptoms for most people with the relevant allergy."
        }
      ],
      [
        {
          title: `PurpleAir Sensors (${purpleAir.sensors?.length || 0})`,
          badge: "LIVE",
          content: renderDataTable("Nearby Sensors", ["Sensor", "Distance (km)", "PM2.5 (Corrected)", "AQI", "Humidity (%)", "Last Seen"], (purpleAir.sensors || []).map(s => [
            s.name,
            formatValue(s.distanceKm),
            formatValue(s.correctedPm25),
            { value: s.aqi !== null && s.aqi !== undefined ? s.aqi : "—", color: s.aqi === null || s.aqi === undefined ? undefined : s.aqi <= 50 ? "#4ecdc4" : s.aqi <= 100 ? "#ffd93d" : s.aqi <= 150 ? "#FF9500" : "#ff6b6b" },
            formatValue(s.humidity, 0),
            formatLocationTime(s.lastSeen)
          ]), { emptyText: purpleAir.configured ? "No outdoor PurpleAir sensors reported in the last hour nearby." : "PurpleAir is not configured. Add a PurpleAir API key to see community sensors." }),
          description: "This table lists nearby PurpleAir community sensors, which measure fine particles at street level where the air quality model cannot. Raw readings are adjusted with the US EPA correction for humidity, which otherwise makes these sensors read high. Sensors next to a grill or a road can read far higher than their surroundings."
        }
      ],
      [
        {
          title: "Air Quality Forecast (36h)",
          badge: "FORECAST",
          content: renderDynamicChart(aqiChart, "satEarthCondChart"),
          chart: aqiChart,
          axes: ["Local Time (Next 36 Hours)", "US Air Quality Index"],
          description: "This chart shows the forecast US Air Quality Index for the next 36 hours. Ozone usually peaks in the late afternoon, while smoke and fine particles often build overnight when the air near the ground is stable. Use it to plan outdoor exercise for the cleanest part of the day."
        },
        {
          title: "UV Forecast (36h)",
          badge: "FORECAST",
          content: renderDynamicChart(uvChart, "satEarthCondChart"),
          chart: uvChart,
          axes: ["Local Time (Next 36 Hours)", "UV Index"],
          description: "This chart shows the forecast UV index for the next 36 hours. The curve follows the height of the sun, peaking near solar noon. Clouds in the forecast lower the values, but thin cloud blocks much less ultraviolet light than it appears to."
        }
      ]
    ]);

    const sunMoonSection = renderSection("Sun & Moon", faSun, [[
      {
        title: "Sun Times",
        badge: "COMPUTED",
        content: renderDataTable("Today", ["Event", "Time"], [
          ["Astronomical Dawn", formatLocationTime(sunMoon.astronomicalDawn)],
          ["Civil Dawn", formatLocationTime(sunMoon.civilDawn)],
          ["Sunrise", formatLocationTime(sunMoon.sunrise)],
          ["Morning Golden Hour Ends", formatLocationTime(sunMoon.goldenHourMorningEnd)],
          ["Solar Noon", formatLocationTime(sunMoon.solarNoon)],
          ["Evening Golden Hour Begins", formatLocationTime(sunMoon.goldenHourEveningStart)],
          ["Sunset", formatLocationTime(sunMoon.sunset)],
          ["Civil Dusk", formatLocationTime(sunMoon.civilDusk)],
          ["Astronomical Dusk", formatLocationTime(sunMoon.astronomicalDusk)],
          ["Day Length", sunMoon.dayLengthHours !== null && sunMoon.dayLengthHours !== undefined ? `${Math.floor(sunMoon.dayLengthHours)}h ${Math.round((sunMoon.dayLengthHours % 1) * 60)}m` : "—"],
          ["Change From Yesterday", sunMoon.dayLengthChangeMinutes !== null && sunMoon.dayLengthChangeMinutes !== undefined ? `${sunMoon.dayLengthChangeMinutes > 0 ? "+" : ""}${sunMoon.dayLengthChangeMinutes.toFixed(1)} min` : "—"]
        ]),
        description: `This table lists today's sun events in the selected location's local time${locationTimezone ? ` (${locationTimezone})` : ""}. Civil twilight is bright enough for most outdoor activity without lights, and golden hour is the low, warm light photographers prefer. The times are calculated from the sun's position and are accurate to about a minute.`
      },
      {
        title: "Moon & Sky",
        badge: "COMPUTED",
        content: renderDataTable("Current", ["Parameter", "Value"], [
          ["Moon Phase", sunMoon.moonPhaseName || "—"],
          ["Illumination", formatValue(sunMoon.moonIllumination, 0, "%")],
          ["Moonrise", sunMoon.moonAlwaysUp ? "Up All Day" : sunMoon.moonAlwaysDown ? "Down All Day" : formatLocationTime(sunMoon.moonrise)],
          ["Moonset", sunMoon.moonAlwaysUp ? "Up All Day" : sunMoon.moonAlwaysDown ? "Down All Day" : formatLocationTime(sunMoon.moonset)],
          ["Moon Altitude", formatValue(sunMoon.moonAltitude, 1, "°")],
          ["Moon Distance", sunMoon.moonDistanceKm ? `${sunMoon.moonDistanceKm.toLocaleString()} km` : "—"],
          ["Sky State", sunMoon.skyState || "—"],
          ["Sun Altitude", formatValue(sunMoon.sunAltitude, 1, "°")],
          ["Sun Azimuth", formatValue(sunMoon.sunAzimuth, 0, "°")]
        ]),
        description: "This table shows the moon's phase, rise and set times, and current position, along with where the sun is now. A bright moon washes out faint stars and aurora, so the darkest skies come around the new moon. A negative altitude means the object is below the horizon."
      }
    ]]);

    const gardenSection = renderSection("Garden & Soil", faLeaf, [
      [
        {
          title: "Soil Conditions",
          badge: "LIVE",
          content: renderDataTable("Current", ["Parameter", "Value", "Unit"], [
            ["Surface Temperature", formatValue(garden.soilTemperature0cm), "C"],
            ["Temperature at 6 cm", formatValue(garden.soilTemperature6cm), "C"],
            ["Temperature at 18 cm", formatValue(garden.soilTemperature18cm), "C"],
            ["Moisture 0-1 cm", formatValue(garden.soilMoisture0to1cm, 3), "m³/m³"],
            ["Moisture 1-3 cm", formatValue(garden.soilMoisture1to3cm, 3), "m³/m³"],
            ["Moisture 3-9 cm", formatValue(garden.soilMoisture3to9cm, 3), "m³/m³"],
            ["Moisture 9-27 cm", formatValue(garden.soilMoisture9to27cm, 3), "m³/m³"]
          ]),
          description: "This table shows modeled soil temperature and moisture at several depths. Most seeds germinate once soil at 6 cm stays above about 10°C, and moisture below roughly 0.15 m³/m³ in the root zone usually means plants need watering. Values come from a land surface model and do not account for irrigation or mulch."
        },
        {
          title: "Water Balance & Frost",
          badge: "FORECAST",
          content: renderDataTable("Next 7 Days", ["Parameter", "Value", "Status"], [
            ["Evapotranspiration", formatValue(garden.evapotranspiration7d, 1, " mm"), "INFO"],
            ["Precipitation", formatValue(garden.precipitation7d, 1, " mm"), "INFO"],
            ["Water Balance", garden.waterBalance7d !== null && garden.waterBalance7d !== undefined ? `${garden.waterBalance7d > 0 ? "+" : ""}${garden.waterBalance7d.toFixed(1)} mm` : "—", garden.waterBalance7d === null || garden.waterBalance7d === undefined ? "NO DATA" : garden.waterBalance7d < -15 ? "WARNING" : "OK"],
            ["Frost Nights", garden.frostNights7d ?? "—", (garden.frostNights7d || 0) > 0 ? "WARNING" : "NONE"],
            ["First Frost", garden.firstFrostDate || "None Forecast", garden.firstFrostDate ? "WARNING" : "OK"],
            ["Coldest Night", formatValue(garden.minTemperature7d, 1, " C"), "INFO"]
          ]),
          description: "This table compares the water plants are expected to lose through evaporation and transpiration with the rain forecast over the next week. A negative balance means the soil is drying out and watering will be needed. Frost nights count any forecast low at or below 0°C, when tender plants need protection."
        }
      ],
      [
        {
          title: "7-Day Garden Outlook",
          badge: "FORECAST",
          content: renderDataTable("Daily", ["Date", "Low (°C)", "High (°C)", "Rain (mm)", "Evapotranspiration (mm)", "Balance (mm)"], (garden.daily || []).map(d => [
            d.date,
            { value: formatValue(d.minTemperature), color: d.minTemperature !== null && d.minTemperature !== undefined && d.minTemperature <= 0 ? "#42a5f5" : undefined },
            formatValue(d.maxTemperature),
            formatValue(d.precipitation),
            formatValue(d.evapotranspiration),
            { value: d.waterBalance === null || d.waterBalance === undefined ? "—" : `${d.waterBalance > 0 ? "+" : ""}${d.waterBalance.toFixed(1)}`, color: d.waterBalance !== null && d.waterBalance !== undefined && d.waterBalance < 0 ? "#FF9500" : undefined }
          ])),
          description: "This table lists the daily temperatures, rain, and evaporative demand for the coming week. Lows at or below freezing are highlighted in blue and days that dry the soil are highlighted in orange. Evapotranspiration is the FAO reference value for a well-watered grass surface."
        }
      ]
    ]);

    const tropicalSection = renderSection("Tropical & Global Hazards", faGlobeAmericas, [
      [
        {
          title: `Active Tropical Cyclones (${tropicalHazards.storms?.length || 0})`,
          badge: "LIVE",
          content: renderDataTable("National Hurricane Center", ["Name", "Classification", "Wind (kt)", "Pressure (mb)", "Movement", "Distance (km)", "Bearing (°)"], (tropicalHazards.storms || []).map(s => [
            s.name,
            s.classification,
            s.intensityKt ?? "—",
            s.pressureMb ?? "—",
            s.movement || "—",
            { value: s.distanceKm ?? "—", color: s.distanceKm !== null && s.distanceKm < 500 ? "#ff6b6b" : s.distanceKm !== null && s.distanceKm < 1000 ? "#FF9500" : undefined },
            s.bearing ?? "—"
          ]), { emptyText: "The National Hurricane Center is not tracking any active storms." }),
          description: "This table lists tropical cyclones currently tracked by the National Hurricane Center in the Atlantic and eastern and central Pacific, with their distance and bearing from the selected location. Storms within 500 km are highlighted in red. Typhoons and cyclones in other basins appear in the global disaster alerts below."
        }
      ],
      [
        {
          title: `Global Disaster Alerts (${tropicalHazards.events?.length || 0})`,
          badge: "LIVE",
          content: renderDataTable("GDACS", ["Type", "Name", "Alert Level", "Country", "Severity", "Distance (km)", "Started"], (tropicalHazards.events || []).map(ev => [
            ev.type,
            ev.name,
            { value: ev.alertLevel, color: ev.alertLevel === "RED" ? "#ff6b6b" : ev.alertLevel === "ORANGE" ? "#FF9500" : "#4ecdc4" },
            ev.country || "—",
            ev.severity || "—",
            ev.distanceKm,
            ev.fromDate ? ev.fromDate.slice(0, 10) : "—"
          ]), { emptyText: "No disaster alerts in the last 14 days fall within 2500 km of this location." }),
          description: "This table lists earthquakes, tropical cyclones, floods, volcanic eruptions, wildfires, and droughts from the Global Disaster Alert and Coordination System within 2500 km, plus any red alert worldwide. The alert level estimates humanitarian impact from the event's size and the population exposed, with red being the most severe."
        }
      ]
    ]);

    const tidesSection = renderSection("Sea State & Tides", faWater, [
      [
        {
          title: "Sea State",
          badge: "LIVE",
          content: renderDataTable("Marine", ["Parameter", "Value", "Status"], [
            ["Wave Height", `${seaConditions.waveHeight ?? "—"} m`, seaConditions.waveHeight !== null && seaConditions.waveHeight !== undefined ? (seaConditions.waveHeight < 2.5 ? "OK" : seaConditions.waveHeight < 4 ? "WARNING" : "CRITICAL") : "NO DATA"],
            ["Sea State", seaConditions.seaState?.replace(/_/g, " ") ?? "—", "INFO"]
          ]),
          description: "This table shows the current significant wave height and the corresponding sea state near the selected location. Sea state ranges from calm through slight, moderate, and rough to very rough. Wave heights of 2.5 m or more are flagged as hazardous for small craft."
        },
        {
          title: "Tide Summary",
          badge: "FORECAST",
          content: renderDataTable(tides.provider || "Tides", ["Parameter", "Value"], tides.station ? [
            ["Station", tides.station.name],
            ["Distance", formatValue(tides.station.distanceKm, 1, " km")],
            ["Datum", tides.station.datum || "—"],
            ["Next High", tides.nextHigh ? `${formatLocationTime(tides.nextHigh.time, true)} (${formatValue(tides.nextHigh.height, 2, " m")})` : "—"],
            ["Next Low", tides.nextLow ? `${formatLocationTime(tides.nextLow.time, true)} (${formatValue(tides.nextLow.height, 2, " m")})` : "—"],
            ["Tide Is", tides.trend || "—"],
            ["Latest Observed", tides.latestObserved ? `${formatValue(tides.latestObserved.height, 2, " m")} at ${formatLocationTime(tides.latestObserved.time)}` : "Not Measured"]
          ] : [], { emptyText: "No tide station was found within 150 km. Outside the United States, add a WorldTides API key." }),
          description: "This table summarizes the tide at the nearest prediction station, including the time and height of the next high and low tide. Heights are measured above the station's datum, which for NOAA stations is mean lower low water. Strong onshore winds and low pressure can push the real water level well above the prediction."
        },
        {
          title: "Tide Times",
          badge: "FORECAST",
          content: renderDataTable("High & Low", ["Time", "Type", "Height (m)"], (tides.extremes || []).map(t => [
            formatLocationTime(t.time, true),
            { value: t.type, color: t.type === "HIGH" ? "#42a5f5" : "#4ecdc4" },
            formatValue(t.height, 2)
          ]), { emptyText: "No tide predictions are available for this location." }),
          description: "This table lists the upcoming high and low tides in local time. Most coastlines see two highs and two lows each day, roughly 12 hours and 25 minutes apart, though some locations have only one of each."
        }
      ],
      [
        {
          title: "Tide Prediction (48h)",
          badge: "FORECAST",
          content: renderDynamicChart(tideChart, "satEarthCondChart"),
          chart: tideChart,
          axes: ["Local Time (Next 48 Hours)", "Water Level (m)"],
          description: "This chart shows the predicted water level at the nearest tide station over the next two days. The height of each peak changes with the moon's phase, with the largest range around new and full moon and the smallest around the quarter moons."
        }
      ]
    ]);

    const riversSection = renderSection("Rivers & Flooding", faTint, [
      [
        {
          title: `River Gauges (${riverGauges.gauges?.length || 0})`,
          badge: "LIVE",
          content: renderDataTable("USGS Gauges", ["Gauge", "Distance (km)", "Stage", "Flow", "Updated"], (riverGauges.gauges || []).map(g => [
            g.name,
            formatValue(g.distanceKm),
            g.stage !== null && g.stage !== undefined ? `${g.stage.toFixed(2)} ${g.stageUnit || ""}`.trim() : "—",
            g.flow !== null && g.flow !== undefined ? `${Math.round(g.flow).toLocaleString()} ${g.flowUnit || ""}`.trim() : "—",
            formatLocationTime(g.time, true)
          ]), { emptyText: "No USGS stream gauges report data within about 40 km. Gauges are available in the United States only." }),
          description: "This table lists the nearest United States Geological Survey stream gauges with their latest water level (stage) and flow. Stage is measured against a local reference point at each gauge, so compare it with the flood stage published for that gauge rather than with other gauges. Data are provisional and may be revised."
        }
      ],
      [
        {
          title: "Discharge Outlook",
          badge: "FORECAST",
          content: renderDataTable("GloFAS", ["Parameter", "Value", "Status"], [
            ["Current Discharge", formatValue(floodForecast.currentDischarge, 1, " m³/s"), "INFO"],
            ["Forecast Peak", formatValue(floodForecast.peakDischarge, 1, " m³/s"), "INFO"],
            ["Peak Date", floodForecast.peakDate || "—", "INFO"],
            ["Peak Versus Current", floodForecast.peakRatio !== null && floodForecast.peakRatio !== undefined ? `${floodForecast.peakRatio.toFixed(2)}x` : "—", floodForecast.peakRatio >= 2 ? "WARNING" : floodForecast.peakRatio >= 1.25 ? "ADVISORY" : "OK"],
            ["Trend", floodForecast.trend || "—", "INFO"]
          ]),
          description: "This table summarizes the 30-day river discharge forecast from the Global Flood Awareness System for the river cell nearest the selected location. A forecast peak at least twice today's flow signals a meaningful rise. The model grid is about 5 km wide, so the nearest river cell may not be the stream closest to you."
        },
        {
          title: "River Discharge Forecast (30d)",
          badge: "FORECAST",
          content: renderDynamicChart(dischargeChart, "satEarthCondChart"),
          chart: dischargeChart,
          axes: ["Date (Past 7 Days to Next 30 Days)", "Discharge (m³/s)"],
          description: "This chart shows modeled river discharge for the past week and the median of the ensemble forecast for the next 30 days. Discharge responds to rain upstream, so rivers can keep rising for days after the rain has stopped locally."
        }
      ]
    ]);

    return (
      <div className="satEarthCondModuleTab">
        <div className="satEarthCondSectionDivider">
          <div className="satEarthCondSectionDividerLine" />
          <span className="satEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faShield} />
            Local Status
          </span>
          <div className="satEarthCondSectionDividerLine" />
        </div>
        <div className="satEarthCondOverviewGrid">
          <div className="satEarthCondPanelSingle satEarthCondChartContainerLive">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>Local Status Overview</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            <div className="satEarthCondStatusTileGrid">
              {localStatusItems.map(item => (
                <div key={item.label} className="satEarthCondStatusTile">
                  <div className="satEarthCondStatusTileHeader">
                    <FontAwesomeIcon icon={item.icon} />
                    <span>{item.label}</span>
                  </div>
                  <div className="satEarthCondStatusTileValue" style={{ color: item.color }}>
                    <span className="satEarthCondStatusTileDot" style={{ backgroundColor: item.color }} />
                    {formatDisplayValue(item.status)}
                  </div>
                  <div className="satEarthCondStatusTileDetail">{item.detail}</div>
                </div>
              ))}
            </div>
            <div className="satEarthCondChartDescription">
              {renderDescription("This panel summarizes the six local conditions that matter most at a glance: outdoor safety, visibility, sea state, lightning, severe weather, and airspace. Each tile shows the current status in color along with the measurement behind it, so problems stand out before you read any of the detailed sections below.")}
            </div>
          </div>
        </div>
        {officialWarningsSection}
        {nearestObservationSection}
        <div className="satEarthCondSectionDivider">
          <div className="satEarthCondSectionDividerLine" />
          <span className="satEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faBroadcastTower} />
            Local Conditions & Outdoor Safety
          </span>
          <div className="satEarthCondSectionDividerLine" />
        </div>
        <div className="satEarthCondOverviewGrid">
          <div className="satEarthCondPanelTriple satEarthCondChartContainerLive">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>Local Environment</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderDataTable("Conditions", ["Parameter", "Value", "Unit"], [
              ["Wind Dir", localEnvironment.windRose?.direction ?? "—", "deg"],
              ["Wind Speed", localEnvironment.windRose?.speed ?? "—", "m/s"],
              ["Gust Factor", localEnvironment.windRose?.gustFactor !== null && localEnvironment.windRose?.gustFactor !== undefined ? localEnvironment.windRose.gustFactor.toFixed(2) : "—", ""],
              ["Visibility", localEnvironment.visibility?.visibility ?? "—", "m"],
              ["Visibility Status", localEnvironment.visibility?.status ?? "—", ""]
            ])}
            <div className="satEarthCondChartDescription">
              {renderDescription("This table lists the current surface wind direction, wind speed, gust factor, and visibility at the selected location. The gust factor is the ratio of peak gusts to sustained wind, where values well above 1 indicate turbulent, gusty conditions. Visibility is classified as good or reduced against a 5 km threshold.")}
            </div>
          </div>
          <div className="satEarthCondPanelTriple satEarthCondChartContainerLive">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>Outdoor Safety</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderDataTable("Exposure", ["Parameter", "Value", "Status"], [
              ["Heat Index", `${outdoorSafety.heatIndex ?? "—"} C`, outdoorSafety.outdoorSafe ? "OK" : "VIOLATION"],
              ["Safe Outdoors", outdoorSafety.outdoorSafe ? "YES" : "NO", outdoorSafety.outdoorSafe ? "OK" : "VIOLATION"]
            ])}
            <div className="satEarthCondChartDescription">
              {renderDescription("This table combines the conditions that most affect people outdoors. It shows the heat index calculated from temperature and humidity and an overall judgment of whether conditions are safe for outdoor activity. A heat index of 40 C or higher marks conditions as unsafe.")}
            </div>
          </div>
          <div className="satEarthCondPanelTriple satEarthCondChartContainerLive">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>Lightning Monitoring</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderDataTable("Estimated Activity", ["Parameter", "Value", "Status"], [
              ["Activity Status", lightningMonitoring.activityStatus || "—", lightningMonitoring.activityStatus === "NOMINAL" ? "OK" : lightningMonitoring.activityStatus === "ELEVATED" ? "WARNING" : lightningMonitoring.activityStatus === "WATCH" ? "WATCH" : "NO DATA"],
              ["Basis", lightningMonitoring.basis || "—", "INFO"],
              ["Data Source", "Estimated From Current Conditions", "INFO"]
            ])}
            <div className="satEarthCondChartDescription">
              {renderDescription("This table estimates lightning activity at the selected location from current weather. It is elevated when a thunderstorm is being reported and set to watch when the atmosphere is unstable enough to support thunderstorms, based on CAPE above 2000 J/kg and a lifted index below -4. No free real-time strike detection feed is available, so individual strikes are not tracked.")}
            </div>
          </div>
        </div>
        {comfortSection}
        {airQualitySection}
        {sunMoonSection}
        {gardenSection}
        <div className="satEarthCondSectionDivider">
          <div className="satEarthCondSectionDividerLine" />
          <span className="satEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faCloudShowersHeavy} />
            Severe Weather
          </span>
          <div className="satEarthCondSectionDividerLine" />
        </div>
        <div className="satEarthCondOverviewGrid">
          <div className="satEarthCondPanelDouble satEarthCondChartContainerLive">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>Threat Assessment</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderDataTable("Report Summary", ["Type", "Count (24h)", "Nearby", "Status"], [
              ["Tornado", severeWeather.reports24h?.tornado?.length ?? 0, (severeWeather.reports24h?.tornado || []).filter(r => r && r.distance <= 300).length, (severeWeather.reports24h?.tornado || []).filter(r => r && r.distance <= 300).length > 0 ? "CRITICAL" : "CLEAR"],
              ["Hail", severeWeather.reports24h?.hail?.length ?? 0, (severeWeather.reports24h?.hail || []).filter(r => r && r.distance <= 300).length, (severeWeather.reports24h?.hail || []).filter(r => r && r.distance <= 300).length > 3 ? "WARNING" : "OK"],
              ["Wind Damage", severeWeather.reports24h?.wind?.length ?? 0, (severeWeather.reports24h?.wind || []).filter(r => r && r.distance <= 300).length, (severeWeather.reports24h?.wind || []).filter(r => r && r.distance <= 300).length > 5 ? "WARNING" : "OK"],
              ["Total Reports", severeWeather.reports24h?.total ?? 0, severeWeather.nearbyReports?.length ?? 0, (severeWeather.nearbyReports?.length ?? 0) > 10 ? "WARNING" : "OK"]
            ])}
            <div className="satEarthCondChartDescription">
              {renderDescription("This table summarizes Storm Prediction Center severe weather reports from the last 24 hours by type. It counts tornado, hail, and wind damage reports nationally alongside the number that occurred near the selected location. The status column flags when nearby activity is high enough to warrant attention.")}
            </div>
          </div>
          {((severeWeather.reports24h?.tornado?.length > 0)) && (
            <div className="satEarthCondPanelDouble satEarthCondChartContainerLive">
              <div className="satEarthCondChartHeaderWithBadge">
                <h4>Tornado Reports ({severeWeather.reports24h.tornado.length})</h4>
                {renderDataTypeBadge("LIVE", "small")}
              </div>
              {renderDataTable("Tornado Activity", ["Time", "Location", "State", "Distance (km)", "Comments"],
                severeWeather.reports24h.tornado.slice(0, 10).map(r => [
                  r?.time || "—",
                  r?.location || r?.county || "—",
                  r?.state || "—",
                  r?.distance ?? "—",
                  r?.comments ? r.comments.substring(0, 50) : "—"
                ])
              )}
              <div className="satEarthCondChartDescription">
                {renderDescription("This table lists tornado reports filed with the Storm Prediction Center over the last 24 hours, sorted with the closest reports first. Each entry includes the report time, location, state, distance from the selected location, and any spotter comments. Reports are preliminary and may be revised or removed after review.")}
              </div>
            </div>
          )}
        </div>
        {((((((severeWeather.reports24h?.hail?.length ?? 0) > 0 || (severeWeather.reports24h?.wind?.length ?? 0) > 0 || (severeWeather.nearbyReports?.length ?? 0) > 0)) && (severeWeather.reports24h?.hail?.length > 0))) || (((((severeWeather.reports24h?.hail?.length ?? 0) > 0 || (severeWeather.reports24h?.wind?.length ?? 0) > 0 || (severeWeather.nearbyReports?.length ?? 0) > 0)) && (severeWeather.reports24h?.wind?.length > 0)))) && (
          <div className="satEarthCondOverviewGrid">
            {((((severeWeather.reports24h?.hail?.length ?? 0) > 0 || (severeWeather.reports24h?.wind?.length ?? 0) > 0 || (severeWeather.nearbyReports?.length ?? 0) > 0)) && (severeWeather.reports24h?.hail?.length > 0)) && (
              <div className="satEarthCondPanelDouble satEarthCondChartContainerLive">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Hail Reports ({severeWeather.reports24h.hail.length})</h4>
                  {renderDataTypeBadge("LIVE", "small")}
                </div>
                {renderDataTable("Hail Activity", ["Time", "Size", "Location", "State", "Distance (km)"],
                  severeWeather.reports24h.hail.slice(0, 10).map(r => [
                    r?.time || "—",
                    r?.speed || "—",
                    r?.location || r?.county || "—",
                    r?.state || "—",
                    r?.distance ?? "—"
                  ])
                )}
                <div className="satEarthCondChartDescription">
                  {renderDescription("This table lists hail reports filed with the Storm Prediction Center over the last 24 hours. Each entry includes the report time, hailstone size, location, state, and distance from the selected location. Larger hail sizes indicate stronger storm updrafts and greater potential for damage.")}
                </div>
              </div>
            )}
            {((((severeWeather.reports24h?.hail?.length ?? 0) > 0 || (severeWeather.reports24h?.wind?.length ?? 0) > 0 || (severeWeather.nearbyReports?.length ?? 0) > 0)) && (severeWeather.reports24h?.wind?.length > 0)) && (
              <div className="satEarthCondPanelDouble satEarthCondChartContainerLive">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Wind Damage Reports ({severeWeather.reports24h.wind.length})</h4>
                  {renderDataTypeBadge("LIVE", "small")}
                </div>
                {renderDataTable("Wind Damage", ["Time", "Speed", "Location", "State", "Distance (km)"],
                  severeWeather.reports24h.wind.slice(0, 10).map(r => [
                    r?.time || "—",
                    r?.speed || "—",
                    r?.location || r?.county || "—",
                    r?.state || "—",
                    r?.distance ?? "—"
                  ])
                )}
                <div className="satEarthCondChartDescription">
                  {renderDescription("This table lists damaging wind reports filed with the Storm Prediction Center over the last 24 hours. Each entry includes the report time, measured or estimated wind speed, location, state, and distance from the selected location. Damaging winds are most often caused by thunderstorm downbursts and squall lines.")}
                </div>
              </div>
            )}
          </div>
        )}
        {((((severeWeather.reports24h?.hail?.length ?? 0) > 0 || (severeWeather.reports24h?.wind?.length ?? 0) > 0 || (severeWeather.nearbyReports?.length ?? 0) > 0)) && (severeWeather.nearbyReports?.length > 0)) && (
          <div className="satEarthCondOverviewGrid">
            {((((severeWeather.reports24h?.hail?.length ?? 0) > 0 || (severeWeather.reports24h?.wind?.length ?? 0) > 0 || (severeWeather.nearbyReports?.length ?? 0) > 0)) && (severeWeather.nearbyReports?.length > 0)) && (
              <div className="satEarthCondPanelSingle satEarthCondChartContainerLive">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Nearby Severe Weather Reports ({severeWeather.nearbyReports.length})</h4>
                  {renderDataTypeBadge("LIVE", "small")}
                </div>
                {renderDataTable("All Nearby Reports (Within 300km)", ["Time", "Type", "Location", "State", "Distance (km)", "Comments"],
                  severeWeather.nearbyReports.slice(0, 15).map(r => [
                    r?.time || "—",
                    r?.type || "—",
                    r?.location || r?.county || "—",
                    r?.state || "—",
                    r?.distance ?? "—",
                    r?.comments ? r.comments.substring(0, 40) : "—"
                  ])
                )}
                <div className="satEarthCondChartDescription">
                  {renderDescription("This table combines every tornado, hail, and wind damage report within 300 km of the selected location over the last 24 hours. It gives a single view of recent severe weather in the area regardless of type. Spotter comments often describe the observed damage or storm behavior.")}
                </div>
              </div>
            )}
          </div>
        )}
        <div className="satEarthCondSectionDivider">
          <div className="satEarthCondSectionDividerLine" />
          <span className="satEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faFire} />
            Fire Weather & Wildfires
          </span>
          <div className="satEarthCondSectionDividerLine" />
        </div>

                {((data.localHazards?.fireRisk?.dataAvailable) || (data.localHazards?.fireRisk?.dataAvailable)) && (
          <div className="satEarthCondOverviewGrid">
            {data.localHazards?.fireRisk?.dataAvailable && (
              <div className="satEarthCondPanelDouble satEarthCondChartContainerComputed">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Fire Weather Index</h4>
                  {renderDataTypeBadge("COMPUTED", "small")}
                </div>
                {renderGauge({ value: data.localHazards.fireRisk.index, display: data.localHazards.fireRisk.index ?? "—", label: "Fire Weather Index", unit: "", min: 0, max: 50, zones: [{ to: 5, label: "Low", color: "#4ecdc4" }, { to: 12, label: "Moderate", color: "#ffd93d" }, { to: 21, label: "High", color: "#FF9500" }, { to: 33, label: "Very High", color: "#ff8a5b" }, { to: 50, label: "Extreme", color: "#ff6b6b" }] })}
                <div className="satEarthCondChartDescription">
                  {renderDescription("This gauge shows the Canadian Fire Weather Index, a standard measure of wildfire danger derived from temperature, humidity, wind, and recent precipitation. The index combines how easily fires start with how quickly they spread and how much fuel is available. Values above 21 indicate high danger, and values above 33 indicate extreme danger.")}
                </div>
              </div>
            )}
            {data.localHazards?.fireRisk?.dataAvailable && (
              <div className="satEarthCondPanelDouble satEarthCondChartContainerComputed">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Fire Weather Components</h4>
                  {renderDataTypeBadge("COMPUTED", "small")}
                </div>
                {renderDataTable("FWI Components", ["Component", "Value", "Description"], [
                                    [
                                      "FFMC",
                                      data.localHazards.fireRisk.components?.ffmc ?? "—",
                                      "Fine Fuel Moisture Code"
                                    ],
                                    [
                                      "DMC",
                                      data.localHazards.fireRisk.components?.dmc ?? "—",
                                      "Duff Moisture Code"
                                    ],
                                    [
                                      "DC",
                                      data.localHazards.fireRisk.components?.dc ?? "—",
                                      "Drought Code"
                                    ],
                                    [
                                      "ISI",
                                      data.localHazards.fireRisk.components?.isi ?? "—",
                                      "Initial Spread Index"
                                    ],
                                    [
                                      "BUI",
                                      data.localHazards.fireRisk.components?.bui ?? "—",
                                      "Build Up Index"
                                    ]
                                  ])}
                <div className="satEarthCondChartDescription">
                  {renderDescription("This table breaks the Fire Weather Index into its component codes. The moisture codes describe how dry fuels are at different depths, from fine surface litter to deep organic layers. The spread and buildup indices describe how fast a fire would move and how much fuel would be available to burn.")}
                </div>
              </div>
            )}
          </div>
        )}
        {((data.localHazards?.geospatialHazards?.fires?.length > 0)) && (
          <div className="satEarthCondOverviewGrid">
            {((data.localHazards?.geospatialHazards?.fires?.length > 0)) && (
              <div className="satEarthCondPanelSingle satEarthCondChartContainerLive">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Active Fires Nearby ({data.localHazards.geospatialHazards.fires.length})</h4>
                  {renderDataTypeBadge("LIVE", "small")}
                </div>
                {renderDataTable("Fire Activity", ["Name", "Distance (km)", "Acres", "Containment", "Status"],
                  data.localHazards.geospatialHazards.fires.slice(0, 10).map(fire => [
                    fire?.name || "—",
                    fire?.distance !== null && fire?.distance !== undefined ? fire.distance.toFixed(1) : "—",
                    fire?.acres || "—",
                    fire?.containment || "—",
                    fire?.status || "—"
                  ])
                )}
                <div className="satEarthCondChartDescription">
                  {renderDescription("This table lists active wildfire incidents near the selected location with their distance, size in acres, and containment. Low containment on a large nearby fire indicates an ongoing threat from smoke and possible spread. Fire data comes from public incident reporting and may lag conditions on the ground.")}
                </div>
              </div>
            )}
          </div>
        )}
        <div className="satEarthCondSectionDivider">
          <div className="satEarthCondSectionDividerLine" />
          <span className="satEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faGlobeAmericas} />
            Seismic Activity
          </span>
          <div className="satEarthCondSectionDividerLine" />
        </div>
                {((((((data.localHazards?.geospatialHazards?.earthquakes?.length ?? 0) > 0 || (data.seismicTrends?.recentActivity?.length ?? 0) > 0)) && (data.localHazards?.geospatialHazards?.earthquakes?.length > 0))) || ((((data.seismicTrends?.magnitudeTrends || (data.seismicTrends?.significantEvents?.length ?? 0) > 0)) && (data.seismicTrends?.significantEvents?.length > 0)))) && (
          <div className="satEarthCondOverviewGrid">
            {((((data.localHazards?.geospatialHazards?.earthquakes?.length ?? 0) > 0 || (data.seismicTrends?.recentActivity?.length ?? 0) > 0)) && (data.localHazards?.geospatialHazards?.earthquakes?.length > 0)) && (
              <div className="satEarthCondPanelDouble satEarthCondChartContainerLive">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Recent Earthquakes (24h)</h4>
                  {renderDataTypeBadge("LIVE", "small")}
                </div>
                {renderDataTable("Seismic Events (24h)", ["Magnitude", "Distance (km)", "Depth (km)", "Location"],
                  data.localHazards.geospatialHazards.earthquakes.slice(0, 10).map(eq => [
                    eq?.magnitude !== null && eq?.magnitude !== undefined ? eq.magnitude.toFixed(1) : "—",
                    eq?.distance !== null && eq?.distance !== undefined ? eq.distance.toFixed(0) : "—",
                    eq?.depth !== null && eq?.depth !== undefined ? eq.depth.toFixed(0) : "—",
                    eq?.location || "—"
                  ])
                )}
                <div className="satEarthCondChartDescription">
                  {renderDescription("This table lists earthquakes recorded near the selected location in the last 24 hours with their magnitude, distance, and depth. Shallow earthquakes are generally felt more strongly at the surface than deeper ones of the same magnitude. Data comes from the United States Geological Survey earthquake feed.")}
                </div>
              </div>
            )}
            {(((data.seismicTrends?.magnitudeTrends || (data.seismicTrends?.significantEvents?.length ?? 0) > 0)) && (data.seismicTrends?.significantEvents?.length > 0)) && (
              <div className="satEarthCondPanelDouble satEarthCondChartContainerHistorical">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Significant Seismic Events (M4.5+)</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDataTable("Major Events", ["Time", "Magnitude", "Distance (km)", "Depth (km)", "Location"],
                  data.seismicTrends.significantEvents.slice(0, 10).map(eq => [
                    eq?.timestamp ? new Date(eq.timestamp).toLocaleString() : "—",
                    eq?.magnitude !== null && eq?.magnitude !== undefined ? eq.magnitude.toFixed(1) : "—",
                    eq?.distance ?? "—",
                    eq?.depth !== null && eq?.depth !== undefined ? eq.depth.toFixed(0) : "—",
                    eq?.location || "—"
                  ])
                )}
                <div className="satEarthCondChartDescription">
                  {renderDescription("This table lists earthquakes of magnitude 4.5 or greater from the regional seismic record. Events of this size are commonly felt and can cause minor damage near the epicenter. Tracking them shows how often the region produces meaningful earthquakes.")}
                </div>
              </div>
            )}
          </div>
        )}
        {((((((data.localHazards?.geospatialHazards?.earthquakes?.length ?? 0) > 0 || (data.seismicTrends?.recentActivity?.length ?? 0) > 0)) && (data.seismicTrends?.recentActivity?.length > 0))) || ((((data.seismicTrends?.magnitudeTrends || (data.seismicTrends?.significantEvents?.length ?? 0) > 0)) && data.seismicTrends?.magnitudeTrends))) && (
          <div className="satEarthCondOverviewGrid">
            {((((data.localHazards?.geospatialHazards?.earthquakes?.length ?? 0) > 0 || (data.seismicTrends?.recentActivity?.length ?? 0) > 0)) && (data.seismicTrends?.recentActivity?.length > 0)) && (
              <div className="satEarthCondPanelDouble satEarthCondChartContainerHistorical">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Monthly Seismic Activity</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDataTable("Monthly Activity", ["Month", "Events", "Max Magnitude", "Avg Magnitude"],
                  data.seismicTrends.recentActivity.slice(0, 6).map(month => [
                    month?.month || "—",
                    month?.eventCount ?? "—",
                    month?.maxMagnitude !== null && month?.maxMagnitude !== undefined ? month.maxMagnitude.toFixed(1) : "—",
                    month?.averageMagnitude !== null && month?.averageMagnitude !== undefined ? month.averageMagnitude.toFixed(1) : "—"
                  ])
                )}
                <div className="satEarthCondChartDescription">
                  {renderDescription("This table groups recent earthquakes by month and shows the event count along with the maximum and average magnitude. Comparing months reveals whether seismic activity in the region is steady, rising, or tied to a specific sequence such as an aftershock series.")}
                </div>
              </div>
            )}
            {(((data.seismicTrends?.magnitudeTrends || (data.seismicTrends?.significantEvents?.length ?? 0) > 0)) && data.seismicTrends?.magnitudeTrends) && (
              <div className="satEarthCondPanelDouble satEarthCondChartContainerHistorical">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Seismic Trends</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDataTable("Trend Analysis", ["Period", "Event Count", "Max Magnitude", "Avg Magnitude"], [
                  ["Last 30 Days", data.seismicTrends.magnitudeTrends.last30Days?.count ?? "—", data.seismicTrends.magnitudeTrends.last30Days?.maxMagnitude !== null && data.seismicTrends.magnitudeTrends.last30Days?.maxMagnitude !== undefined ? data.seismicTrends.magnitudeTrends.last30Days.maxMagnitude.toFixed(1) : "—", data.seismicTrends.magnitudeTrends.last30Days?.averageMagnitude !== null && data.seismicTrends.magnitudeTrends.last30Days?.averageMagnitude !== undefined ? data.seismicTrends.magnitudeTrends.last30Days.averageMagnitude.toFixed(1) : "—"],
                  ["Last 90 Days", data.seismicTrends.magnitudeTrends.last90Days?.count ?? "—", data.seismicTrends.magnitudeTrends.last90Days?.maxMagnitude !== null && data.seismicTrends.magnitudeTrends.last90Days?.maxMagnitude !== undefined ? data.seismicTrends.magnitudeTrends.last90Days.maxMagnitude.toFixed(1) : "—", data.seismicTrends.magnitudeTrends.last90Days?.averageMagnitude !== null && data.seismicTrends.magnitudeTrends.last90Days?.averageMagnitude !== undefined ? data.seismicTrends.magnitudeTrends.last90Days.averageMagnitude.toFixed(1) : "—"]
                ])}
                <div className="satEarthCondChartDescription">
                  {renderDescription("This table compares earthquake activity over the last 30 days with the last 90 days. A higher recent rate than the longer baseline can indicate a swarm or an aftershock sequence. The magnitude columns show whether recent events are larger or smaller than usual.")}
                </div>
              </div>
            )}
          </div>
        )}
        {seismicChart && (
          <div className="satEarthCondOverviewGrid">
            {seismicChart && (
              <div className="satEarthCondPanelSingle satEarthCondChartContainerHistorical">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Seismic History (1 Year)</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(seismicChart, "satEarthCondChart")}
                <div className="satEarthCondChartDescription">
                  <div className="satEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (1-Year Observation Period)</span>
                    <span><strong>Y-Axis:</strong> Earthquake Magnitude (Richter Scale)</span>
                  </div>
                  {renderDescription("This chart displays seismic activity recorded within the monitoring radius of the selected location over the past year. Each data point is an individual earthquake plotted by its magnitude on the date it occurred. Clusters of events can indicate aftershock sequences or swarms, and the overall pattern shows how seismically active this region typically is, which helps put any new event in context.")}
                </div>
                {renderChartStats(seismicChart)}
                
              </div>
            )}
          </div>
        )}
        {tropicalSection}
        <div className="satEarthCondSectionDivider">
          <div className="satEarthCondSectionDividerLine" />
          <span className="satEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faPlane} />
            Air Traffic & Airspace
          </span>
          <div className="satEarthCondSectionDividerLine" />
        </div>
        <div className="satEarthCondOverviewGrid">
          <div className="satEarthCondPanelDouble satEarthCondChartContainerLive">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>Air Traffic Summary</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderDataTable("Nearby Aircraft", ["Parameter", "Value", "Status"], [
              ["Search Radius", airTraffic.searchRadiusKm !== null && airTraffic.searchRadiusKm !== undefined ? `${airTraffic.searchRadiusKm} km` : "—", "INFO"],
              ["Aircraft in Area", airTraffic.aircraftCount !== null && airTraffic.aircraftCount !== undefined ? airTraffic.aircraftCount : "—", airTraffic.aircraftCount !== null && airTraffic.aircraftCount !== undefined ? (airTraffic.aircraftCount > 20 ? "BUSY" : "OK") : "NO DATA"],
              ["Nearest Aircraft", airTraffic.minAircraftDistance !== null && airTraffic.minAircraftDistance !== undefined ? `${airTraffic.minAircraftDistance} km` : "—", airTraffic.minAircraftDistance !== null && airTraffic.minAircraftDistance !== undefined ? "OK" : "NO DATA"]
            ])}
            <div className="satEarthCondChartDescription">
              {renderDescription("This table summarizes aircraft currently flying within the search radius of the selected location using community ADS-B tracking data from adsb.lol. It shows the number of aircraft in the area and the distance to the nearest one. A high aircraft count is flagged as busy airspace.")}
            </div>
          </div>
          <div className="satEarthCondPanelDouble satEarthCondChartContainerLive">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>Airspace Restrictions</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderDataTable("NOTAMs & TFRs", ["Parameter", "Value", "Status"], [
              ["Active TFRs", airspaceRestrictions.activeTFRs?.length ?? 0, (airspaceRestrictions.activeTFRs?.length ?? 0) > 0 ? "ACTIVE" : "NONE"],
              ["Active NOTAMs", airspaceRestrictions.activeNOTAMs?.length ?? 0, (airspaceRestrictions.activeNOTAMs?.length ?? 0) > 0 ? "ACTIVE" : "NONE"],
              ["Airspace Status", airspaceRestrictions.airspaceClosureStatus || "—", airspaceRestrictions.airspaceClosureStatus === "RESTRICTED" ? "ACTIVE" : airspaceRestrictions.airspaceClosureStatus === "OPEN" ? "OPEN" : "UNKNOWN"]
            ])}
            <div className="satEarthCondChartDescription">
              {renderDescription("This table shows active Temporary Flight Restrictions and Notices to Air Missions affecting the area around the selected location. Temporary Flight Restrictions limit flights for events such as wildfires, security operations, or disaster response. The airspace status summarizes whether any restriction is currently active.")}
            </div>
          </div>
        </div>
        {((airTraffic.aircraft?.length > 0)) && (
          <div className="satEarthCondOverviewGrid">
            {((airTraffic.aircraft?.length > 0)) && (
              <div className="satEarthCondPanelSingle satEarthCondChartContainerLive">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Aircraft in Tracking Area ({airTraffic.aircraft.length})</h4>
                  {renderDataTypeBadge("LIVE", "small")}
                </div>
                {renderDataTable("Aircraft", ["Callsign", "ICAO24", "Distance (km)", "Altitude (m)", "Velocity (m/s)", "Heading (°)", "Bearing (°)", "Vert Rate"],
                  airTraffic.aircraft.slice(0, 25).map(ac => [
                    ac?.callsign || "—",
                    ac?.icao24 || "—",
                    ac?.distance ?? "—",
                    ac?.altitude !== null && ac?.altitude !== undefined ? Math.round(ac.altitude) : "—",
                    ac?.velocity !== null && ac?.velocity !== undefined ? Math.round(ac.velocity) : "—",
                    ac?.heading !== null && ac?.heading !== undefined ? Math.round(ac.heading) : "—",
                    ac?.bearing ?? "—",
                    ac?.verticalRate !== null && ac?.verticalRate !== undefined ? ac.verticalRate.toFixed(1) : "—"
                  ])
                )}
                <div className="satEarthCondChartDescription">
                  {renderDescription("This table lists individual aircraft within the tracking radius, sorted from nearest to farthest. Each entry includes the callsign, transponder address, altitude, speed, heading, bearing from the selected location, and vertical rate. Positive vertical rates indicate climbing aircraft and negative rates indicate descending aircraft.")}
                </div>
              </div>
            )}
          </div>
        )}
        {tidesSection}
        {riversSection}
        <div className="satEarthCondSectionDivider">
          <div className="satEarthCondSectionDividerLine" />
          <span className="satEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faWater} style={{ color: "#42a5f5" }} />
            Coastal Mesoscale
          </span>
          <div className="satEarthCondSectionDividerLine" />
        </div>
        <div className="satEarthCondOverviewGrid">
          <div className="satEarthCondPanelDouble satEarthCondChartContainerLive">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>Sea Breeze Front</h4>
              {renderDataTypeBadge("COMPUTED", "small")}
            </div>
            {renderGauge({ value: coastalMesoscale.seaBreezeFront?.probability, display: coastalMesoscale.seaBreezeFront?.probability !== null && coastalMesoscale.seaBreezeFront?.probability !== undefined ? `${coastalMesoscale.seaBreezeFront?.probability.toFixed(0)}%` : "—", label: "Sea Breeze Probability", unit: "%", min: 0, max: 100, zones: [{ to: 30, label: "Unlikely", color: "#4ecdc4" }, { to: 50, label: "Possible", color: "#FF9500" }, { to: 100, label: "Likely", color: "#ff6b6b" }] })}
            {renderDataTable("Front Status", ["Parameter", "Value"], [
              ["Expected Timing", coastalMesoscale.seaBreezeFront?.expectedTiming || "—"],
              ["Front Position", coastalMesoscale.seaBreezeFront?.frontPosition || "—"]
            ])}
            <div className="satEarthCondChartDescription">
              {renderDescription("This panel estimates the likelihood of a sea breeze developing at the selected location, along with its expected timing and front position. Sea breezes form when land heats faster than the adjacent sea, pulling cooler marine air inland. The arriving front can shift winds sharply and trigger afternoon thunderstorms.")}
            </div>
          </div>
          <div className="satEarthCondPanelDouble satEarthCondChartContainerComputed">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>Thermal Circulation</h4>
              {renderDataTypeBadge("COMPUTED", "small")}
            </div>
            {renderGauge({ value: coastalMesoscale.thermalCirculation?.strength !== null && coastalMesoscale.thermalCirculation?.strength !== undefined ? coastalMesoscale.thermalCirculation?.strength * 100 : null, display: coastalMesoscale.thermalCirculation?.strength !== null && coastalMesoscale.thermalCirculation?.strength !== undefined ? `${(coastalMesoscale.thermalCirculation?.strength * 100).toFixed(0)}%` : "—", label: coastalMesoscale.thermalCirculation?.type ? coastalMesoscale.thermalCirculation?.type.replace(/_/g, " ") : "Circulation Strength", unit: "%", min: 0, max: 100, zones: [{ to: 25, label: "Weak", color: "#4ecdc4" }, { to: 50, label: "Moderate", color: "#ffd93d" }, { to: 100, label: "Strong", color: "#FF9500" }] })}
            {renderDataTable("Circulation Parameters", ["Parameter", "Value"], [
              ["Circulation Type", coastalMesoscale.thermalCirculation?.type || "—"],
              ["Strength Index", coastalMesoscale.thermalCirculation?.strength !== null && coastalMesoscale.thermalCirculation?.strength !== undefined ? coastalMesoscale.thermalCirculation?.strength.toFixed(3) : "—"],
              ["Driving Gradient", `${coastalMesoscale.thermalCirculation?.gradient !== null && coastalMesoscale.thermalCirculation?.gradient !== undefined ? coastalMesoscale.thermalCirculation?.gradient.toFixed(1) : "—"} °C`]
            ])}
            <div className="satEarthCondChartDescription">
              {renderDescription("This panel describes the local thermal circulation driven by the temperature difference between land and sea. It shows the circulation type, its relative strength, and the temperature gradient driving it. Stronger circulations produce more pronounced daily wind shifts along the coast.")}
            </div>
          </div>
        </div>
        <div className="satEarthCondOverviewGrid">
          <div className="satEarthCondPanelDouble satEarthCondChartContainerLive">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>Land-Sea Temperature Gradient</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderGauge({ value: coastalMesoscale.landSeaGradient?.value, display: coastalMesoscale.landSeaGradient?.value !== null && coastalMesoscale.landSeaGradient?.value !== undefined ? `${coastalMesoscale.landSeaGradient?.value > 0 ? "+" : ""}${coastalMesoscale.landSeaGradient?.value.toFixed(1)}°C` : "—", label: "Gradient (Land - Sea)", unit: "°C", min: -10, max: 10, zones: [{ to: -5, label: "Sea Warmer", color: "#ffd93d" }, { to: 5, label: "Weak", color: "#4ecdc4" }, { to: 10, label: "Land Warmer", color: "#ffd93d" }] })}
            {renderDataTable("Temperatures", ["Parameter", "Value", "Unit"], [
              ["Land Temperature", coastalMesoscale.landSeaGradient?.landTemp !== null && coastalMesoscale.landSeaGradient?.landTemp !== undefined ? coastalMesoscale.landSeaGradient?.landTemp.toFixed(1) : "—", "°C"],
              ["Sea Temperature", coastalMesoscale.landSeaGradient?.seaTemp !== null && coastalMesoscale.landSeaGradient?.seaTemp !== undefined ? coastalMesoscale.landSeaGradient?.seaTemp.toFixed(1) : "—", "°C"],
              ["Gradient", coastalMesoscale.landSeaGradient?.value !== null && coastalMesoscale.landSeaGradient?.value !== undefined ? coastalMesoscale.landSeaGradient?.value.toFixed(2) : "—", "°C"]
            ])}
            <div className="satEarthCondChartDescription">
              {renderDescription("This panel compares the current land and sea surface temperatures and shows the difference between them. A positive gradient means the land is warmer, which favors sea breezes, while a negative gradient favors land breezes. The larger the difference, the stronger the resulting coastal circulation.")}
            </div>
          </div>
          {((((coastalMesoscale.convergenceZones && coastalMesoscale.convergenceZones.length > 0) || landSeaGradientChart)) && landSeaGradientChart) && (
            <div className="satEarthCondPanelDouble satEarthCondChartContainerHistorical">
              <div className="satEarthCondChartHeaderWithBadge">
                <h4>Land-Sea Gradient History (48h)</h4>
                {renderDataTypeBadge("HISTORICAL", "small")}
              </div>
              {renderDynamicChart(landSeaGradientChart, "satEarthCondChart")}
              <div className="satEarthCondChartDescription">
                <div className="satEarthCondChartAxesInfo">
                  <span><strong>X-Axis:</strong> Time (48-Hour Observation Period)</span>
                  <span><strong>Y-Axis:</strong> Temperature Gradient (°C)</span>
                </div>
                {renderDescription("This chart displays the temperature difference between land and sea surfaces over the past 48 hours. The land-sea gradient is the primary driver of coastal circulations such as sea breezes and land breezes. Strong daytime gradients push cool marine air inland, shifting winds and sometimes triggering afternoon thunderstorms along the sea breeze front.")}
              </div>
              {renderChartStats(landSeaGradientChart)}
            </div>
          )}
        </div>
        <div className="satEarthCondOverviewGrid">
          <div className="satEarthCondPanelDouble satEarthCondChartContainerComputed">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>Onshore Flow & Convergence</h4>
              {renderDataTypeBadge("COMPUTED", "small")}
            </div>
            {renderGauge({ value: coastalMesoscale.onshoreFlow?.convergenceIndex !== null && coastalMesoscale.onshoreFlow?.convergenceIndex !== undefined ? coastalMesoscale.onshoreFlow?.convergenceIndex * 100 : null, display: coastalMesoscale.onshoreFlow?.convergenceIndex !== null && coastalMesoscale.onshoreFlow?.convergenceIndex !== undefined ? `${(coastalMesoscale.onshoreFlow?.convergenceIndex * 100).toFixed(0)}%` : "—", label: "Convergence Index", unit: "%", min: 0, max: 100, zones: [{ to: 25, label: "Weak", color: "#4ecdc4" }, { to: 50, label: "Moderate", color: "#ffd93d" }, { to: 100, label: "Strong", color: "#FF9500" }] })}
            {renderDataTable("Flow Parameters", ["Parameter", "Value", "Unit", "Status"], [
              ["Onshore Flow Intensity", coastalMesoscale.onshoreFlow?.intensity !== null && coastalMesoscale.onshoreFlow?.intensity !== undefined ? coastalMesoscale.onshoreFlow?.intensity.toFixed(1) : "—", "m/s", (coastalMesoscale.onshoreFlow?.intensity ?? 0) > 8 ? "STRONG" : (coastalMesoscale.onshoreFlow?.intensity ?? 0) > 4 ? "MODERATE" : "WEAK"],
              ["Convergence Index", coastalMesoscale.onshoreFlow?.convergenceIndex !== null && coastalMesoscale.onshoreFlow?.convergenceIndex !== undefined ? coastalMesoscale.onshoreFlow?.convergenceIndex.toFixed(3) : "—", "", (coastalMesoscale.onshoreFlow?.convergenceIndex ?? 0) > 0.5 ? "ELEVATED" : "NOMINAL"]
            ])}
            <div className="satEarthCondChartDescription">
              {renderDescription("This panel measures how strongly air is flowing onshore and how much it is converging near the coast. Convergence forces air upward, which can build clouds and set off showers or thunderstorms. Higher convergence index values indicate a greater chance of coastal convective development.")}
            </div>
          </div>
          {((((coastalMesoscale.convergenceZones && coastalMesoscale.convergenceZones.length > 0) || landSeaGradientChart)) && (coastalMesoscale.convergenceZones?.length > 0)) && (
            <div className="satEarthCondPanelDouble satEarthCondChartContainerComputed">
              <div className="satEarthCondChartHeaderWithBadge">
                <h4>Convergence Zones ({coastalMesoscale.convergenceZones.length})</h4>
                {renderDataTypeBadge("COMPUTED", "small")}
              </div>
              {renderDataTable("Detected Zones", ["Type", "Index", "Location"],
                coastalMesoscale.convergenceZones.map(zone => [
                  zone?.type?.replace(/_/g, " ") || "—",
                  zone?.index !== null && zone?.index !== undefined ? zone.index.toFixed(3) : "—",
                  zone?.location || "—"
                ])
              )}
              <div className="satEarthCondChartDescription">
                {renderDescription("This table lists areas where surface winds are converging near the selected location, along with their type, strength index, and position. These zones often mark where clouds and storms develop first. An empty table means no significant convergence was detected.")}
              </div>
            </div>
          )}
        </div>
        {((marineLayerChart) || (((marineLayerData.length > 0)))) && (
          <div className="satEarthCondOverviewGrid">
            {marineLayerChart && (
              <div className="satEarthCondPanelDouble satEarthCondChartContainerHistorical">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Marine Layer Depth History (48h)</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(marineLayerChart, "satEarthCondChart")}
                <div className="satEarthCondChartDescription">
                  <div className="satEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (48-Hour Observation Period)</span>
                    <span><strong>Y-Axis:</strong> Marine Layer Depth (m)</span>
                  </div>
                  {renderDescription("This chart tracks the vertical extent of the marine layer over the past 48 hours. The marine layer is a cool, moist air mass that forms over the ocean and can spread inland along the coast, bringing low stratus clouds, fog, and drizzle. Its depth controls how far inland the cloud and cool air penetrate and how quickly it burns off during the day.")}
                </div>
                {renderChartStats(marineLayerChart)}
              </div>
            )}
            {((marineLayerData.length > 0)) && (
              <div className="satEarthCondPanelDouble satEarthCondChartContainerHistorical">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Marine Layer Profile ({marineLayerData.length} Hours)</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDataTable("Marine Layer Data", ["Time", "Depth (m)", "Inversion Strength", "Surface T (°C)", "850hPa T (°C)"],
                  marineLayerData.slice(-24).map(ml => [
                    ml?.timestamp ? new Date(ml.timestamp).toLocaleTimeString() : "—",
                    ml?.depth !== null && ml?.depth !== undefined ? ml.depth.toFixed(0) : "—",
                    ml?.inversionStrength !== null && ml?.inversionStrength !== undefined ? ml.inversionStrength.toFixed(2) : "—",
                    ml?.surfaceTemp !== null && ml?.surfaceTemp !== undefined ? ml.surfaceTemp.toFixed(1) : "—",
                    ml?.temp850hPa !== null && ml?.temp850hPa !== undefined ? ml.temp850hPa.toFixed(1) : "—"
                  ])
                )}
                <div className="satEarthCondChartDescription">
                  {renderDescription("This table lists the hourly marine layer depth together with the inversion strength that caps it and the temperatures at the surface and at 850 hPa. A deeper marine layer with a strong cap tends to bring persistent low clouds, fog, and drizzle to the coast.")}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderAtmosphericEnvironmentTab = () => {
    const data = getModuleData("atmosphericEnvironment") || {};
    if (!data || Object.keys(data).length === 0) return renderEmptyState(faDatabase, "There is no atmospheric environment data yet.");

    const acousticPropagation = getModuleData("temporalForensics")?.acousticPropagation || {};
    const soundSpeedProfile = acousticPropagation.soundSpeedProfile || [];
    const soundSpeedChart = soundSpeedProfile.length > 0 ? createDynamicLineChart("Sound Speed Profile", soundSpeedProfile, "altitude", "soundSpeed", " m/s", "#42a5f5", false) : null;
    const atmosphericElectricity = getModuleData("groundEnvironment")?.localEnvironment?.atmosphericElectricity || {};

    const shearProfileVertical = data.shearProfile?.verticalProfile || [];
    const atmosphericDensityProfile = data.atmosphericDensity?.densityProfile || [];

    const shearChart = shearProfileVertical.length > 0 ? createDynamicLineChart("Wind Shear", shearProfileVertical, "altitude", "shear", " m/s/km", "#42a5f5", false) : null;
    const densityChart = atmosphericDensityProfile.length > 0 ? createDynamicLineChart("Atmospheric Density", atmosphericDensityProfile, "altitude", "density", " kg/m³", "#4ecdc4", false) : null;

    const historicalAtmo = data.historicalAtmospheric || {};
    const historicalAtmoTimeSeries = historicalAtmo?.timeSeries || [];
    const atmoWind10Chart = historicalAtmoTimeSeries.length > 0 ? createDynamicLineChart("30-Day Surface Wind (10m)", historicalAtmoTimeSeries.filter(d => d && d.wind_10m !== null && d.wind_10m !== undefined), "timestamp", "wind_10m", " m/s", "#4ecdc4", false) : null;
    const atmoWind100Chart = historicalAtmoTimeSeries.length > 0 ? createDynamicLineChart("30-Day Upper Wind (100m)", historicalAtmoTimeSeries.filter(d => d && d.wind_100m !== null && d.wind_100m !== undefined), "timestamp", "wind_100m", " m/s", "#42a5f5", false) : null;
    const atmoTempChart = historicalAtmoTimeSeries.length > 0 ? createDynamicLineChart("30-Day Surface Temp", historicalAtmoTimeSeries.filter(d => d && d.temp_surface !== null && d.temp_surface !== undefined), "timestamp", "temp_surface", " °C", "#ffd93d", false) : null;
    const atmoPressureChart = historicalAtmoTimeSeries.length > 0 ? createDynamicLineChart("30-Day Surface Pressure", historicalAtmoTimeSeries.filter(d => d && d.pressure !== null && d.pressure !== undefined), "timestamp", "pressure", " hPa", "#42a5f5", false) : null;
    const iceCrystalIndicator = getModuleData("electromagneticEnvironment")?.atmosphericCharging?.iceCrystalIndicator;
    const atmoGustChart = historicalAtmoTimeSeries.length > 0 ? createDynamicLineChart("30-Day Wind Gusts", historicalAtmoTimeSeries.filter(d => d && d.wind_gusts !== null && d.wind_gusts !== undefined), "timestamp", "wind_gusts", " m/s", "#ff6b6b", false) : null;

    const criticalLayers = data.shearProfile?.criticalLayers || [];
    const warningLayers = data.shearProfile?.warningLayers || [];
    const verticalProfile = data.shearProfile?.verticalProfile || [];
    const densityProfile = data.atmosphericDensity?.densityProfile || [];
    const surfaceDensityLevel = densityProfile.length > 0 ? [...densityProfile].sort((x, y) => (x?.altitude ?? 0) - (y?.altitude ?? 0))[0] : null;

    const cloudAnalysis = data.cloudAnalysis || {};
    const humidityProfile = data.humidityProfile || {};
    const temperatureInversions = data.temperatureInversions || {};
    const convectiveAnalysis = data.convectiveAnalysis || {};

    const historicalCloud = cloudAnalysis.historicalCloud || {};
    const historicalHumidity = humidityProfile.historicalHumidity || {};
    const historicalInversions = temperatureInversions.historicalInversions || {};

    const historicalCloudTimeSeries = historicalCloud?.timeSeries || [];
    const historicalHumidityTimeSeries = historicalHumidity?.timeSeries || [];
    const historicalInversionsTimeSeries = historicalInversions?.timeSeries || [];

    const cloudTotalChart = historicalCloudTimeSeries.length > 0 ? createDynamicLineChart("Cloud Cover (30d)", historicalCloudTimeSeries.filter(d => d && d.totalCover !== null && d.totalCover !== undefined), "timestamp", "totalCover", "%", "#919baf", false) : null;
    const cloudLowChart = historicalCloudTimeSeries.length > 0 ? createDynamicLineChart("Low Cloud Cover (30d)", historicalCloudTimeSeries.filter(d => d && d.lowCover !== null && d.lowCover !== undefined), "timestamp", "lowCover", "%", "#42a5f5", false) : null;
    const precipChart = historicalCloudTimeSeries.length > 0 ? createDynamicLineChart("Precipitation (30d)", historicalCloudTimeSeries.filter(d => d && d.precipitation !== null && d.precipitation !== undefined), "timestamp", "precipitation", " mm", "#42a5f5", false) : null;

    const surfaceRHChart = historicalHumidityTimeSeries.length > 0 ? createDynamicLineChart("Surface RH (30d)", historicalHumidityTimeSeries.filter(d => d && d.surfaceRH !== null && d.surfaceRH !== undefined), "timestamp", "surfaceRH", "%", "#4ecdc4", false) : null;
    const dewpointDepressionChart = historicalHumidityTimeSeries.length > 0 ? createDynamicLineChart("Dewpoint Depression (30d)", historicalHumidityTimeSeries.filter(d => d && d.dewpointDepression !== null && d.dewpointDepression !== undefined), "timestamp", "dewpointDepression", " °C", "#ffd93d", false) : null;

    const inversionIndicatorChart = historicalInversionsTimeSeries.length > 0 ? createDynamicLineChart("Inversion Indicator (30d)", historicalInversionsTimeSeries.filter(d => d && d.maxStrength !== null && d.maxStrength !== undefined), "timestamp", "maxStrength", "", "#42a5f5", false) : null;

    const cloudAnalysisLayers = cloudAnalysis?.layers || [];
    const capeChart = cloudAnalysisLayers.length > 0 ? createDynamicLineChart("CAPE Forecast (24h)", cloudAnalysisLayers.filter(d => d && d.cape !== null && d.cape !== undefined), "hour", "cape", " J/kg", "#ffd93d", true) : null;
    const liftedIndexChart = cloudAnalysisLayers.length > 0 ? createDynamicLineChart("Lifted Index (24h)", cloudAnalysisLayers.filter(d => d && d.liftedIndex !== null && d.liftedIndex !== undefined), "hour", "liftedIndex", " °C", "#4ecdc4", true) : null;

    return (
      <div className="satEarthCondModuleTab">
        <div className="satEarthCondSectionDivider">
          <div className="satEarthCondSectionDividerLine" />
          <span className="satEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faCloud} />
            Clouds & Visibility
          </span>
          <div className="satEarthCondSectionDividerLine" />
        </div>
        <div className="satEarthCondOverviewGrid">
          <div className="satEarthCondPanelDouble satEarthCondChartContainerLive">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>Current Cloud Conditions</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderDataTable("Cloud Cover", ["Parameter", "Value", "Unit", "Status"], [
              ["Total Cover", cloudAnalysis.current?.totalCover !== null && cloudAnalysis.current?.totalCover !== undefined ? cloudAnalysis.current.totalCover : "—", "%", cloudAnalysis.current?.totalCover !== null && cloudAnalysis.current?.totalCover !== undefined ? (cloudAnalysis.current.totalCover <= 25 ? "OPTIMAL" : cloudAnalysis.current.totalCover <= 50 ? "NOMINAL" : cloudAnalysis.current.totalCover <= 75 ? "MARGINAL" : "WARNING") : "NO DATA"],
              ["Low Cloud", cloudAnalysis.current?.lowCover !== null && cloudAnalysis.current?.lowCover !== undefined ? cloudAnalysis.current.lowCover : "—", "%", cloudAnalysis.current?.lowCover !== null && cloudAnalysis.current?.lowCover !== undefined ? (cloudAnalysis.current.lowCover <= 20 ? "OPTIMAL" : cloudAnalysis.current.lowCover <= 40 ? "NOMINAL" : cloudAnalysis.current.lowCover <= 60 ? "MARGINAL" : "WARNING") : "NO DATA"],
              ["Mid Cloud", cloudAnalysis.current?.midCover !== null && cloudAnalysis.current?.midCover !== undefined ? cloudAnalysis.current.midCover : "—", "%", cloudAnalysis.current?.midCover !== null && cloudAnalysis.current?.midCover !== undefined ? "OK" : "NO DATA"],
              ["High Cloud", cloudAnalysis.current?.highCover !== null && cloudAnalysis.current?.highCover !== undefined ? cloudAnalysis.current.highCover : "—", "%", cloudAnalysis.current?.highCover !== null && cloudAnalysis.current?.highCover !== undefined ? "OK" : "NO DATA"],
              ["Cloud Base", cloudAnalysis.current?.cloudBaseHeight !== null && cloudAnalysis.current?.cloudBaseHeight !== undefined ? cloudAnalysis.current.cloudBaseHeight.toFixed(0) : "—", "m", cloudAnalysis.current?.cloudBaseHeight !== null && cloudAnalysis.current?.cloudBaseHeight !== undefined ? (cloudAnalysis.current.cloudBaseHeight >= 1500 ? "OPTIMAL" : cloudAnalysis.current.cloudBaseHeight >= 1000 ? "NOMINAL" : "WARNING") : "NO DATA"],
              ["Weather Code", cloudAnalysis.current?.weatherCode !== null && cloudAnalysis.current?.weatherCode !== undefined ? cloudAnalysis.current.weatherCode : "—", "", cloudAnalysis.current?.weatherCode !== null && cloudAnalysis.current?.weatherCode !== undefined ? (cloudAnalysis.current.weatherCode < 50 ? "OK" : cloudAnalysis.current.weatherCode < 80 ? "PRECIP" : "STORM") : "NO DATA"]
            ])}
            <div className="satEarthCondChartDescription">
              {renderDescription("This table shows current cloud cover in total and at low, mid, and high levels, along with the estimated cloud base height and the reported weather code. Low clouds most affect visibility and ceilings, while high clouds mainly reduce sunlight.")}
            </div>
          </div>
          <div className="satEarthCondPanelDouble satEarthCondChartContainerLive">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>Cumulus & Visibility</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderDataTable("Cumulus Analysis", ["Parameter", "Value", "Status"], [
              ["Cumulus Penetration Alt", cloudAnalysis.cumulusPenetration?.altitude !== null && cloudAnalysis.cumulusPenetration?.altitude !== undefined ? `${cloudAnalysis.cumulusPenetration.altitude} m` : "—", cloudAnalysis.cumulusPenetration?.risk === "HIGH" ? "CRITICAL" : cloudAnalysis.cumulusPenetration?.risk === "MODERATE" ? "WARNING" : "OK"],
              ["Cumulus Risk", cloudAnalysis.cumulusPenetration?.risk || "—", cloudAnalysis.cumulusPenetration?.risk === "HIGH" ? "CRITICAL" : cloudAnalysis.cumulusPenetration?.risk === "MODERATE" ? "WARNING" : "OK"],
              ["Optical Visibility Impact", cloudAnalysis.opticalVisibility?.impacted ? "YES" : "NO", cloudAnalysis.opticalVisibility?.impacted ? "DEGRADED" : "CLEAR"],
              ["Visibility Degradation", cloudAnalysis.opticalVisibility?.degradation || "—", cloudAnalysis.opticalVisibility?.degradation === "SEVERE" ? "CRITICAL" : cloudAnalysis.opticalVisibility?.degradation === "MODERATE" ? "WARNING" : "OK"]
            ])}
            <div className="satEarthCondChartDescription">
              {renderDescription("This table assesses cumulus cloud development and its effect on visibility. It shows how high cumulus tops are estimated to reach, the associated risk level, and how clouds and moisture are degrading visibility. Tall, vigorous cumulus clouds can grow into thunderstorms.")}
            </div>
          </div>
        </div>
        {((cloudAnalysisLayers.length > 0)) && (
          <div className="satEarthCondOverviewGrid">
            {((cloudAnalysisLayers.length > 0)) && (
              <div className="satEarthCondPanelSingle satEarthCondChartContainerForecast">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>24-Hour Cloud Layer Forecast ({cloudAnalysisLayers.length} Hours)</h4>
                  {renderDataTypeBadge("FORECAST", "small")}
                </div>
                {renderDataTable("Hourly Cloud Layers", ["Hour", "Total %", "Low %", "Mid %", "High %", "Precip (mm)", "Precip Prob %", "Weather"], cloudAnalysisLayers.slice(0, 24).map((layer, i) => {
                    const wCode = layer?.weatherCode ?? 0;
                    const weatherDesc = wCode >= 95 ? "THUNDERSTORM" : wCode >= 80 ? "SHOWERS" : wCode >= 70 ? "SNOW" : wCode >= 61 ? "RAIN" : wCode >= 51 ? "DRIZZLE" : wCode >= 45 ? "FOG" : "CLEAR";
                    return [
                      `T+${layer?.hour ?? i}h`,
                      layer?.totalCover !== null && layer?.totalCover !== undefined ? layer.totalCover : "—",
                      layer?.lowCover !== null && layer?.lowCover !== undefined ? layer.lowCover : "—",
                      layer?.midCover !== null && layer?.midCover !== undefined ? layer.midCover : "—",
                      layer?.highCover !== null && layer?.highCover !== undefined ? layer.highCover : "—",
                      layer?.precipitation !== null && layer?.precipitation !== undefined ? layer.precipitation.toFixed(1) : "—",
                      layer?.precipProbability !== null && layer?.precipProbability !== undefined ? layer.precipProbability : "—",
                      { value: weatherDesc, color: wCode >= 95 ? "#ff6b6b" : wCode >= 61 ? "#FF9500" : "#4ecdc4" }
                    ];
                  }))}
                <div className="satEarthCondChartDescription">
                  {renderDescription("This table forecasts cloud cover by layer for each of the next 24 hours, along with precipitation amount, precipitation probability, and the expected weather type. It shows when skies are likely to clear or fill in and when rain or storms are most likely.")}
                </div>
              </div>
            )}
          </div>
        )}
        <div className="satEarthCondSectionDivider">
          <div className="satEarthCondSectionDividerLine" />
          <span className="satEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faTint} />
            Humidity & Moisture
          </span>
          <div className="satEarthCondSectionDividerLine" />
        </div>
        <div className="satEarthCondOverviewGrid">
          <div className="satEarthCondPanelTriple satEarthCondChartContainerLive">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>Current Humidity</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderDataTable("Surface & Levels", ["Level", "RH %", "Status"], [
              ["Surface", humidityProfile.current?.surface !== null && humidityProfile.current?.surface !== undefined ? humidityProfile.current.surface.toFixed(0) : "—", humidityProfile.current?.surface !== null && humidityProfile.current?.surface !== undefined ? (humidityProfile.current.surface >= 20 && humidityProfile.current.surface <= 80 ? "NOMINAL" : "MARGINAL") : "NO DATA"],
              ["850 hPa", humidityProfile.current?.levels?.["850hPa"] !== undefined ? humidityProfile.current.levels["850hPa"].toFixed(0) : "—", "OK"],
              ["700 hPa", humidityProfile.current?.levels?.["700hPa"] !== undefined ? humidityProfile.current.levels["700hPa"].toFixed(0) : "—", "OK"],
              ["500 hPa", humidityProfile.current?.levels?.["500hPa"] !== undefined ? humidityProfile.current.levels["500hPa"].toFixed(0) : "—", "OK"],
              ["300 hPa", humidityProfile.current?.levels?.["300hPa"] !== undefined ? humidityProfile.current.levels["300hPa"].toFixed(0) : "—", "OK"],
              ["200 hPa", humidityProfile.current?.levels?.["200hPa"] !== undefined ? humidityProfile.current.levels["200hPa"].toFixed(0) : "—", "OK"]
            ])}
            <div className="satEarthCondChartDescription">
              {renderDescription("This table shows relative humidity at the surface and at standard pressure levels from 850 hPa up to 200 hPa. Moist layers aloft can support cloud development and icing, while very dry layers suppress clouds. Each level is flagged when humidity is unusually high or low.")}
            </div>
          </div>
          <div className="satEarthCondPanelTriple satEarthCondChartContainerLive">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>Precipitation & Moisture</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderDataTable("Precipitation", ["Parameter", "Value", "Unit", "Status"], [
              ["Precip Rate", cloudAnalysis.current?.precipitationRate !== null && cloudAnalysis.current?.precipitationRate !== undefined ? cloudAnalysis.current.precipitationRate.toFixed(2) : "—", "mm/h", cloudAnalysis.current?.precipitationRate !== null && cloudAnalysis.current?.precipitationRate !== undefined ? (cloudAnalysis.current.precipitationRate <= 0.5 ? "OPTIMAL" : cloudAnalysis.current.precipitationRate <= 2 ? "NOMINAL" : cloudAnalysis.current.precipitationRate <= 5 ? "WARNING" : "CRITICAL") : "NO DATA"],
              ["Precipitable Water", cloudAnalysis.current?.precipitableWater !== null && cloudAnalysis.current?.precipitableWater !== undefined ? cloudAnalysis.current.precipitableWater.toFixed(1) : "—", "mm", cloudAnalysis.current?.precipitableWater !== null && cloudAnalysis.current?.precipitableWater !== undefined ? (cloudAnalysis.current.precipitableWater <= 20 ? "OPTIMAL" : cloudAnalysis.current.precipitableWater <= 35 ? "NOMINAL" : "MARGINAL") : "NO DATA"],
              ["Precip Clouds", cloudAnalysis.precipitatingClouds?.detected ? "YES" : "NO", "", cloudAnalysis.precipitatingClouds?.detected ? "ACTIVE" : "CLEAR"],
              ["Precip Type", cloudAnalysis.precipitatingClouds?.type || "—", "", cloudAnalysis.precipitatingClouds?.type ? "DETECTED" : "NONE"],
              ["Precip Intensity", cloudAnalysis.precipitatingClouds?.intensity || "—", "", cloudAnalysis.precipitatingClouds?.intensity === "SEVERE" ? "CRITICAL" : cloudAnalysis.precipitatingClouds?.intensity === "HEAVY" ? "WARNING" : "OK"]
            ])}
            <div className="satEarthCondChartDescription">
              {renderDescription("This table shows the current precipitation rate, total precipitable water in the atmospheric column, and the type and intensity of any precipitation. Precipitable water is the depth of water that would result if all vapor in the column condensed, and high values support heavy rainfall.")}
            </div>
          </div>
          <div className="satEarthCondPanelTriple satEarthCondChartContainerComputed">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>Condensation Risk</h4>
              {renderDataTypeBadge("COMPUTED", "small")}
            </div>
            {renderDataTable("Surface Moisture", ["Parameter", "Value", "Status"], [
              ["Dewpoint Depression", humidityProfile.condensation?.dewpointDepression !== null && humidityProfile.condensation?.dewpointDepression !== undefined ? humidityProfile.condensation.dewpointDepression.toFixed(1) : "—", humidityProfile.condensation?.dewpointDepression !== null && humidityProfile.condensation?.dewpointDepression !== undefined ? (humidityProfile.condensation.dewpointDepression >= 5 ? "OPTIMAL" : humidityProfile.condensation.dewpointDepression >= 3 ? "NOMINAL" : "WARNING") : "NO DATA"],
              ["Concern Level", humidityProfile.condensation?.concern || "—", humidityProfile.condensation?.concern === "HIGH" ? "CRITICAL" : humidityProfile.condensation?.concern === "MODERATE" ? "WARNING" : "OK"],
              ["Condensation Risk", humidityProfile.condensation?.condensationRisk || "—", humidityProfile.condensation?.condensationRisk === "ELEVATED" ? "WARNING" : humidityProfile.condensation?.condensationRisk === "POSSIBLE" ? "MARGINAL" : "OK"]
            ])}
            <div className="satEarthCondChartDescription">
              {renderDescription("This table evaluates the risk of condensation and fog near the surface using the dewpoint depression, which is the gap between air temperature and dewpoint. When that gap falls below about 3 °C, the air is close to saturation and surfaces can collect condensation.")}
            </div>
          </div>
        </div>
        <div className="satEarthCondOverviewGrid">
          <div className="satEarthCondPanelDouble satEarthCondChartContainerComputed">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>Frost Formation Risk</h4>
              {renderDataTypeBadge("COMPUTED", "small")}
            </div>
            {renderDataTable("Frost Analysis", ["Parameter", "Value", "Status"], [
              ["Risk Index", humidityProfile.frostFormation?.riskIndex !== null && humidityProfile.frostFormation?.riskIndex !== undefined ? humidityProfile.frostFormation.riskIndex.toFixed(2) : "—", humidityProfile.frostFormation?.risk === "HIGH" ? "CRITICAL" : humidityProfile.frostFormation?.risk === "MODERATE" ? "WARNING" : "OK"],
              ["Risk Level", humidityProfile.frostFormation?.risk || "—", humidityProfile.frostFormation?.risk === "HIGH" ? "CRITICAL" : humidityProfile.frostFormation?.risk === "MODERATE" ? "WARNING" : "OK"],
              ["Critical Altitudes", humidityProfile.frostFormation?.criticalAltitudes?.length ?? 0, (humidityProfile.frostFormation?.criticalAltitudes?.length ?? 0) > 0 ? "WARNING" : "CLEAR"]
            ])}
            <div className="satEarthCondChartDescription">
              {renderDescription("This table assesses the risk of frost or ice forming at the surface and aloft. It combines temperature and humidity into a risk index and counts the altitudes where conditions favor frost. Frost aloft is also an indicator of aircraft icing potential.")}
            </div>
          </div>
          <div className="satEarthCondPanelDouble satEarthCondChartContainerComputed">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>Frost Critical Altitudes</h4>
              {renderDataTypeBadge("COMPUTED", "small")}
            </div>
            {renderDataTable("Critical Altitudes", ["Alt (m)", "Pressure", "RH %", "Temp °C"], (humidityProfile.frostFormation?.criticalAltitudes || []).slice(0, 5).map((alt, i) => [
                              alt?.altitude !== null && alt?.altitude !== undefined ? alt.altitude.toFixed(0) : "—",
                              `${alt?.pressure || "—"} hPa`,
                              alt?.humidity !== null && alt?.humidity !== undefined ? alt.humidity.toFixed(0) : "—",
                              alt?.temperature !== null && alt?.temperature !== undefined ? alt.temperature.toFixed(1) : "—"
                            ]))}
            <div className="satEarthCondChartDescription">
              {renderDescription("This table lists the specific altitudes where frost or ice formation is most likely, with the pressure, relative humidity, and temperature at each level. These layers combine near-freezing temperatures with high humidity. An empty table means no critical layers were identified.")}
            </div>
          </div>
        </div>
        {((humidityProfile.layers?.length > 0)) && (
          <div className="satEarthCondOverviewGrid">
            {((humidityProfile.layers?.length > 0)) && (
              <div className="satEarthCondPanelSingle satEarthCondChartContainerLive">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Full Humidity Profile ({humidityProfile.layers.length} Levels)</h4>
                  {renderDataTypeBadge("LIVE", "small")}
                </div>
                {renderDataTable("Humidity by Level", ["Altitude (m)", "Pressure (hPa)", "RH %", "Temp °C", "Status"], humidityProfile.layers.map((layer, i) => {
                    const rh = layer?.relativeHumidity ?? 50;
                    const status = rh > 85 ? "HIGH" : rh < 30 ? "LOW" : "NOMINAL";
                    const statusColor = rh > 85 ? "#FF9500" : rh < 30 ? "#ffd93d" : "#4ecdc4";
                    return [
                      layer?.height !== null && layer?.height !== undefined ? layer.height.toFixed(0) : "—",
                      layer?.pressure || "—",
                      { value: layer?.relativeHumidity !== null && layer?.relativeHumidity !== undefined ? layer.relativeHumidity.toFixed(0) : "—", color: statusColor },
                      layer?.temperature !== null && layer?.temperature !== undefined ? layer.temperature.toFixed(1) : "—",
                      { value: status, color: statusColor }
                    ];
                  }))}
                <div className="satEarthCondChartDescription">
                  {renderDescription("This table lists relative humidity and temperature at every level of the vertical profile from the surface upward. Each level is classified as high, nominal, or low humidity. Together these levels show where cloud layers are likely and where the air is dry.")}
                </div>
              </div>
            )}
          </div>
        )}
        <div className="satEarthCondSectionDivider">
          <div className="satEarthCondSectionDividerLine" />
          <span className="satEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faBolt} />
            Convection & Electrical Hazards
          </span>
          <div className="satEarthCondSectionDividerLine" />
        </div>
        <div className="satEarthCondOverviewGrid">
          <div className="satEarthCondPanelDouble satEarthCondChartContainerLive">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>Convective Indices</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderDataTable("Stability", ["Parameter", "Value", "Unit", "Status"], [
              ["CAPE", convectiveAnalysis.cape !== null && convectiveAnalysis.cape !== undefined ? convectiveAnalysis.cape.toFixed(0) : "—", "J/kg", convectiveAnalysis.cape !== null && convectiveAnalysis.cape !== undefined ? (convectiveAnalysis.cape < 500 ? "OPTIMAL" : convectiveAnalysis.cape < 1000 ? "NOMINAL" : convectiveAnalysis.cape < 2500 ? "WARNING" : "CRITICAL") : "NO DATA"],
              ["Lifted Index", convectiveAnalysis.liftedIndex !== null && convectiveAnalysis.liftedIndex !== undefined ? convectiveAnalysis.liftedIndex.toFixed(1) : "—", "°C", convectiveAnalysis.liftedIndex !== null && convectiveAnalysis.liftedIndex !== undefined ? (convectiveAnalysis.liftedIndex >= 2 ? "OPTIMAL" : convectiveAnalysis.liftedIndex >= 0 ? "NOMINAL" : convectiveAnalysis.liftedIndex >= -2 ? "MARGINAL" : "WARNING") : "NO DATA"],
              ["Convective Risk", convectiveAnalysis.convectiveRisk || "—", "", convectiveAnalysis.convectiveRisk === "HIGH" ? "CRITICAL" : convectiveAnalysis.convectiveRisk === "ELEVATED" ? "WARNING" : convectiveAnalysis.convectiveRisk === "MODERATE" ? "MARGINAL" : "OK"],
              ["Thunderstorm Potential", convectiveAnalysis.thunderstormPotential?.replace(/_/g, " ") || "—", "", convectiveAnalysis.thunderstormPotential === "WIDESPREAD_SEVERE" ? "CRITICAL" : convectiveAnalysis.thunderstormPotential === "SCATTERED_LIKELY" ? "WARNING" : "OK"]
            ])}
            <div className="satEarthCondChartDescription">
              {renderDescription("This table lists the key measures of thunderstorm potential. CAPE is the energy available to rising air, and the lifted index measures how unstable the atmosphere is, with negative values indicating instability. The convective risk and thunderstorm potential ratings summarize the two.")}
            </div>
          </div>
          <div className="satEarthCondPanelDouble satEarthCondChartContainerComputed">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>Convective Risk Gauge</h4>
              {renderDataTypeBadge("COMPUTED", "small")}
            </div>
            {renderGauge({ value: convectiveAnalysis.cape, display: convectiveAnalysis.cape !== null && convectiveAnalysis.cape !== undefined ? convectiveAnalysis.cape.toFixed(0) : "—", label: "CAPE (J/kg)", unit: " J/kg", min: 0, max: 4000, zones: [{ to: 500, label: "Stable", color: "#4ecdc4" }, { to: 1000, label: "Marginal", color: "#ffd93d" }, { to: 2500, label: "Moderate", color: "#FF9500" }, { to: 4000, label: "Extreme", color: "#ff6b6b" }] })}
            <div className="satEarthCondChartDescription">
              {renderDescription("This gauge shows convective available potential energy, or CAPE, against standard thresholds. Values below 500 J/kg indicate a stable atmosphere, while values above 2500 J/kg indicate extreme instability capable of supporting severe thunderstorms if storms can form.")}
            </div>
          </div>
        </div>
        <div className="satEarthCondOverviewGrid">
          <div className="satEarthCondPanelDouble satEarthCondChartContainerComputed">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>Atmospheric Electricity</h4>
              {renderDataTypeBadge("COMPUTED", "small")}
            </div>
            {renderDataTable("Electrostatic Risk", ["Parameter", "Value", "Status"], [
              ["Field Strength", atmosphericElectricity.fieldStrength !== null && atmosphericElectricity.fieldStrength !== undefined ? `${atmosphericElectricity.fieldStrength.toFixed(2)} kV/m` : "—", atmosphericElectricity.fieldStrength !== null && atmosphericElectricity.fieldStrength !== undefined ? (atmosphericElectricity.fieldStrength > 5 ? "WARNING" : "NOMINAL") : "NO DATA"],
              ["Cumulus Electrification", atmosphericElectricity.cumulusElectrification !== null && atmosphericElectricity.cumulusElectrification !== undefined ? `${(atmosphericElectricity.cumulusElectrification * 100).toFixed(1)}%` : "—", atmosphericElectricity.cumulusElectrification !== null && atmosphericElectricity.cumulusElectrification !== undefined ? (atmosphericElectricity.cumulusElectrification > 0.8 ? "CRITICAL" : atmosphericElectricity.cumulusElectrification > 0.5 ? "WARNING" : "NOMINAL") : "NO DATA"],
              ["Anvil Cloud Distance", atmosphericElectricity.anvilCloudDistance !== null && atmosphericElectricity.anvilCloudDistance !== undefined ? `${atmosphericElectricity.anvilCloudDistance} nm` : "—", atmosphericElectricity.anvilCloudDistance !== null && atmosphericElectricity.anvilCloudDistance !== undefined ? (atmosphericElectricity.anvilCloudDistance < 10 ? "WARNING" : "OK") : "NO DATA"],
              ["Precip Static Risk", atmosphericElectricity.precipitationStaticRisk !== null && atmosphericElectricity.precipitationStaticRisk !== undefined ? `${(atmosphericElectricity.precipitationStaticRisk * 100).toFixed(1)}%` : "—", atmosphericElectricity.precipitationStaticRisk !== null && atmosphericElectricity.precipitationStaticRisk !== undefined ? (atmosphericElectricity.precipitationStaticRisk > 0.5 ? "WARNING" : "OK") : "NO DATA"]
            ])}
            <div className="satEarthCondChartDescription">
              {renderDescription("This table summarizes the electrical state of the lower atmosphere. It shows the estimated atmospheric field strength, how electrified developing cumulus clouds are, the distance to any thunderstorm anvil cloud, and the risk of precipitation static. Rising values indicate a building lightning threat.")}
            </div>

          </div>
          <div className="satEarthCondPanelDouble satEarthCondChartContainerComputed">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>Cumulus Electrification</h4>
              {renderDataTypeBadge("COMPUTED", "small")}
            </div>
            {renderGauge({ value: atmosphericElectricity.cumulusElectrification !== null && atmosphericElectricity.cumulusElectrification !== undefined ? atmosphericElectricity.cumulusElectrification * 100 : null, display: atmosphericElectricity.cumulusElectrification !== null && atmosphericElectricity.cumulusElectrification !== undefined ? `${(atmosphericElectricity.cumulusElectrification * 100).toFixed(0)}%` : "—", label: "Cumulus Electrification Index", unit: "%", min: 0, max: 100, zones: [{ to: 50, label: "Low", color: "#4ecdc4" }, { to: 80, label: "Elevated", color: "#FF9500" }, { to: 100, label: "High", color: "#ff6b6b" }] })}
            <div className="satEarthCondChartDescription">
              {renderDescription("This gauge shows the cumulus electrification index, an estimate of how much electrical charge developing cumulus clouds are building. Charge separation grows as clouds deepen and ice forms inside them. Values above 80% indicate clouds that may soon produce lightning.")}
            </div>
          </div>
        </div>
        <div className="satEarthCondOverviewGrid">
          <div className="satEarthCondPanelDouble satEarthCondChartContainerComputed">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>Static Electricity Risk</h4>
              {renderDataTypeBadge("COMPUTED", "small")}
            </div>
            {renderDataTable("Triboelectric Analysis", ["Parameter", "Value", "Status"], [
              ["Risk Index", humidityProfile.staticElectricity?.riskIndex !== null && humidityProfile.staticElectricity?.riskIndex !== undefined ? humidityProfile.staticElectricity.riskIndex.toFixed(2) : "—", humidityProfile.staticElectricity?.risk === "ELEVATED" ? "WARNING" : humidityProfile.staticElectricity?.risk === "MODERATE" ? "MARGINAL" : "OK"],
              ["Risk Level", humidityProfile.staticElectricity?.risk || "—", humidityProfile.staticElectricity?.risk === "ELEVATED" ? "WARNING" : "OK"],
              ["Concern Layers", humidityProfile.staticElectricity?.concernLayers?.length ?? 0, (humidityProfile.staticElectricity?.concernLayers?.length ?? 0) > 0 ? "ADVISORY" : "CLEAR"],
              ["Ice Crystal Indicator", iceCrystalIndicator !== null && iceCrystalIndicator !== undefined ? `${(iceCrystalIndicator * 100).toFixed(1)}%` : "—", iceCrystalIndicator !== null && iceCrystalIndicator !== undefined ? (iceCrystalIndicator > 0.5 ? "WARNING" : "OK") : "NO DATA"]
            ])}
            <div className="satEarthCondChartDescription">
              {renderDescription("This table estimates the risk of static charge building up from moving air, ice crystals, and dry layers aloft. It shows the overall risk index and level, the number of layers of concern, and an ice crystal indicator. Static buildup can interfere with radio equipment and electronics.")}
            </div>
          </div>
          <div className="satEarthCondPanelDouble satEarthCondChartContainerComputed">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>Static Concern Layers</h4>
              {renderDataTypeBadge("COMPUTED", "small")}
            </div>
            {renderDataTable("Concern Layers", ["Alt (m)", "Pressure", "RH %"], (humidityProfile.staticElectricity?.concernLayers || []).slice(0, 5).map((layer, i) => [
                              layer?.altitude !== null && layer?.altitude !== undefined ? layer.altitude.toFixed(0) : "—",
                              `${layer?.pressure || "—"} hPa`,
                              { value: layer?.humidity !== null && layer?.humidity !== undefined ? layer.humidity.toFixed(0) : "—", color: "#ffd93d" }
                            ]))}
            <div className="satEarthCondChartDescription">
              {renderDescription("This table lists the atmospheric layers where conditions most favor static charge buildup, with the altitude, pressure, and relative humidity of each. These are typically dry or icy layers. An empty table means no layers of concern were identified.")}
            </div>
          </div>
        </div>
        {(((((capeChart || liftedIndexChart)) && capeChart)) || ((((capeChart || liftedIndexChart)) && liftedIndexChart))) && (
          <div className="satEarthCondOverviewGrid">
            {(((capeChart || liftedIndexChart)) && capeChart) && (
              <div className="satEarthCondPanelDouble satEarthCondChartContainerForecast">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>CAPE Forecast (24h)</h4>
                  {renderDataTypeBadge("FORECAST", "small")}
                </div>
                {renderDynamicChart(capeChart, "satEarthCondChart")}
                <div className="satEarthCondChartDescription">
                  <div className="satEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Forecast Hour (T+0 to T+24h)</span>
                    <span><strong>Y-Axis:</strong> CAPE (J/kg)</span>
                  </div>
                  {renderDescription("This chart displays the 24-hour forecast of Convective Available Potential Energy (CAPE). CAPE quantifies the amount of energy available for convection and is a primary indicator of thunderstorm potential. Values below 500 J/kg indicate stable conditions, 500-1000 J/kg suggest marginal instability, 1000-2500 J/kg indicate moderate instability with possible thunderstorms, and values above 2500 J/kg signal high instability with potential for severe convective weather including lightning hazards.")}
                </div>
                {renderChartStats(capeChart)}
              </div>
            )}
            {(((capeChart || liftedIndexChart)) && liftedIndexChart) && (
              <div className="satEarthCondPanelDouble satEarthCondChartContainerForecast">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Lifted Index Forecast (24h)</h4>
                  {renderDataTypeBadge("FORECAST", "small")}
                </div>
                {renderDynamicChart(liftedIndexChart, "satEarthCondChart")}
                <div className="satEarthCondChartDescription">
                  <div className="satEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Forecast Hour (T+0 to T+24h)</span>
                    <span><strong>Y-Axis:</strong> Lifted Index (°C)</span>
                  </div>
                  {renderDescription("This chart shows the 24-hour forecast of Lifted Index (LI), a measure of atmospheric stability. The Lifted Index compares the temperature of a lifted air parcel to the environmental temperature at 500 hPa. Positive values indicate stable conditions, values near zero suggest marginal stability, and negative values indicate instability. Values below -2°C suggest conditions favorable for thunderstorm development, while values below -6°C indicate severe thunderstorm potential with significant lightning risk.")}
                </div>
                {renderChartStats(liftedIndexChart)}
              </div>
            )}
          </div>
        )}

        <div className="satEarthCondSectionDivider">
          <div className="satEarthCondSectionDividerLine" />
          <span className="satEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faThermometerHalf} />
            Stability & Inversions
          </span>
          <div className="satEarthCondSectionDividerLine" />
        </div>
        <div className="satEarthCondOverviewGrid">
          <div className="satEarthCondPanelTriple satEarthCondChartContainerLive">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>Inversion Summary</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderDataTable("Detection", ["Parameter", "Value", "Status"], [
              ["Total Inversions", temperatureInversions.detected?.length ?? 0, (temperatureInversions.detected?.length ?? 0) > 3 ? "WARNING" : "OK"],
              ["Low-Level Inversions", temperatureInversions.lowLevelInversions?.length ?? 0, (temperatureInversions.lowLevelInversions?.length ?? 0) > 0 ? "ADVISORY" : "CLEAR"],
              ["Strongest Strength", temperatureInversions.strongestInversion?.strength !== null && temperatureInversions.strongestInversion?.strength !== undefined ? temperatureInversions.strongestInversion.strength.toFixed(2) + " C/100m" : "—", (temperatureInversions.strongestInversion?.strength ?? 0) > 2.0 ? "WARNING" : "OK"],
              ["Strongest Base", temperatureInversions.strongestInversion?.baseHeight !== null && temperatureInversions.strongestInversion?.baseHeight !== undefined ? temperatureInversions.strongestInversion.baseHeight.toFixed(0) + " m" : "—", "INFO"],
              ["Stability Index", temperatureInversions.atmosphericStability?.index !== null && temperatureInversions.atmosphericStability?.index !== undefined ? temperatureInversions.atmosphericStability.index.toFixed(2) : "—", (temperatureInversions.atmosphericStability?.index ?? 1) < 0.4 ? "WARNING" : "OK"],
              ["Stability Class", temperatureInversions.atmosphericStability?.classification?.replace(/_/g, " ") || "—", temperatureInversions.atmosphericStability?.classification === "VERY_STABLE" ? "WARNING" : "OK"]
            ])}
            <div className="satEarthCondChartDescription">
              {renderDescription("This table summarizes the temperature inversions detected in the current vertical profile, where temperature rises with height instead of falling. It shows how many inversions were found, the strength and base of the strongest one, and the overall stability class. Inversions suppress mixing and trap moisture and pollutants.")}
            </div>
          </div>
          <div className="satEarthCondPanelTriple satEarthCondChartContainerComputed">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>Pollutant Dispersion Impact</h4>
              {renderDataTypeBadge("COMPUTED", "small")}
            </div>
            {renderDataTable("Near-Surface Trapping", ["Parameter", "Value", "Status"], [
              ["Impacted", temperatureInversions.pollutantDispersion?.impacted ? "YES" : "NO", temperatureInversions.pollutantDispersion?.impacted ? "WARNING" : "CLEAR"],
              ["Trapping Altitude", temperatureInversions.pollutantDispersion?.trappingAltitude !== null && temperatureInversions.pollutantDispersion?.trappingAltitude !== undefined ? temperatureInversions.pollutantDispersion.trappingAltitude.toFixed(0) + " m" : "—", temperatureInversions.pollutantDispersion?.trappingAltitude && temperatureInversions.pollutantDispersion.trappingAltitude < 1000 ? "WARNING" : "OK"],
              ["Dispersal Rating", temperatureInversions.pollutantDispersion?.dispersalRating || "—", temperatureInversions.pollutantDispersion?.dispersalRating === "POOR" ? "CRITICAL" : temperatureInversions.pollutantDispersion?.dispersalRating === "REDUCED" ? "WARNING" : "OK"]
            ])}
            <div className="satEarthCondChartDescription">
              {renderDescription("This table assesses how well pollutants and smoke can disperse from the surface. A low-level inversion acts as a lid that traps pollution near the ground. The trapping altitude shows the height of that lid, and the dispersal rating summarizes air quality risk.")}
            </div>
          </div>
          <div className="satEarthCondPanelTriple satEarthCondChartContainerComputed">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>Fog Potential</h4>
              {renderDataTypeBadge("COMPUTED", "small")}
            </div>
            {renderDataTable("Fog Formation", ["Parameter", "Value", "Status"], [
              ["Probability", temperatureInversions.fogPotential?.probability !== null && temperatureInversions.fogPotential?.probability !== undefined ? temperatureInversions.fogPotential.probability.toFixed(0) + "%" : "—", (temperatureInversions.fogPotential?.probability ?? 0) > 50 ? "WARNING" : (temperatureInversions.fogPotential?.probability ?? 0) > 25 ? "ADVISORY" : "OK"],
              ["Fog Type", temperatureInversions.fogPotential?.type?.replace(/_/g, " ") || "—", temperatureInversions.fogPotential?.type ? "POSSIBLE" : "UNLIKELY"],
              ["Formation Conditions", temperatureInversions.fogPotential?.formationConditions || "—", temperatureInversions.fogPotential?.formationConditions === "FAVORABLE" ? "WARNING" : "OK"]
            ])}
            <div className="satEarthCondChartDescription">
              {renderDescription("This table estimates the probability of fog forming at the selected location and the most likely fog type. Radiation fog forms on clear, calm nights, while advection fog forms when moist air moves over a cooler surface. The formation conditions column explains what is driving the estimate.")}
            </div>
          </div>
        </div>
        {((temperatureInversions.detected?.length > 0)) && (
          <div className="satEarthCondOverviewGrid">
            {((temperatureInversions.detected?.length > 0)) && (
              <div className="satEarthCondPanelSingle satEarthCondChartContainerLive">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Detected Inversions ({temperatureInversions.detected.length})</h4>
                  {renderDataTypeBadge("LIVE", "small")}
                </div>
                {renderDataTable("Inversion Layers", ["Base Alt (m)", "Top Alt (m)", "Base P (hPa)", "Top P (hPa)", "Base T (°C)", "Top T (°C)", "Strength", "Thickness (m)", "ΔT (°C)"], temperatureInversions.detected.map((inv, i) => {
                    const strengthVal = inv?.strength ?? 0;
                    const strengthColor = strengthVal > 2.0 ? "#ff6b6b" : strengthVal > 1.0 ? "#FF9500" : "#4ecdc4";
                    return [
                      inv?.baseHeight !== null && inv?.baseHeight !== undefined ? inv.baseHeight.toFixed(0) : "—",
                      inv?.topHeight !== null && inv?.topHeight !== undefined ? inv.topHeight.toFixed(0) : "—",
                      inv?.basePressure || "—",
                      inv?.topPressure || "—",
                      inv?.baseTemperature !== null && inv?.baseTemperature !== undefined ? inv.baseTemperature.toFixed(1) : "—",
                      inv?.topTemperature !== null && inv?.topTemperature !== undefined ? inv.topTemperature.toFixed(1) : "—",
                      { value: inv?.strength !== null && inv?.strength !== undefined ? inv.strength.toFixed(3) : "—", color: strengthColor },
                      inv?.thickness !== null && inv?.thickness !== undefined ? inv.thickness.toFixed(0) : "—",
                      inv?.temperatureDelta !== null && inv?.temperatureDelta !== undefined ? inv.temperatureDelta.toFixed(2) : "—"
                    ];
                  }))}
                <div className="satEarthCondChartDescription">
                  {renderDescription("This table lists every temperature inversion found in the vertical profile. Each entry shows the base and top altitude, pressure, and temperature, along with the inversion strength, thickness, and total temperature increase. Stronger and thicker inversions are more effective at trapping air below them.")}
                </div>
              </div>
            )}
          </div>
        )}
        {((temperatureInversions.lowLevelInversions?.length > 0)) && (
          <div className="satEarthCondOverviewGrid">
            {((temperatureInversions.lowLevelInversions?.length > 0)) && (
              <div className="satEarthCondPanelSingle satEarthCondChartContainerLive">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Low-Level Inversions (Below 5000 m) - {temperatureInversions.lowLevelInversions.length}</h4>
                  {renderDataTypeBadge("LIVE", "small")}
                </div>
                {renderDataTable("Low-Level Layers", ["Base Alt (m)", "Top Alt (m)", "Strength (C/100m)", "Thickness (m)", "ΔT (°C)", "Impact"], temperatureInversions.lowLevelInversions.map((inv, i) => {
                    const baseH = inv?.baseHeight ?? 0;
                    const impact = baseH < 1000 ? "HIGH" : baseH < 2000 ? "MODERATE" : "LOW";
                    const impactColor = impact === "HIGH" ? "#ff6b6b" : impact === "MODERATE" ? "#FF9500" : "#4ecdc4";
                    return [
                      inv?.baseHeight !== null && inv?.baseHeight !== undefined ? inv.baseHeight.toFixed(0) : "—",
                      inv?.topHeight !== null && inv?.topHeight !== undefined ? inv.topHeight.toFixed(0) : "—",
                      { value: inv?.strength !== null && inv?.strength !== undefined ? inv.strength.toFixed(3) : "—", color: (inv?.strength ?? 0) > 2.0 ? "#ff6b6b" : "#4ecdc4" },
                      inv?.thickness !== null && inv?.thickness !== undefined ? inv.thickness.toFixed(0) : "—",
                      inv?.temperatureDelta !== null && inv?.temperatureDelta !== undefined ? inv.temperatureDelta.toFixed(2) : "—",
                      { value: impact, color: impactColor }
                    ];
                  }))}
                <div className="satEarthCondChartDescription">
                  {renderDescription("This table lists inversions with bases below 5000 m, which have the greatest effect on surface conditions. Each entry is rated by impact, with inversions based below 1000 m rated highest because they most directly trap fog, pollution, and sound near the ground.")}
                </div>
              </div>
            )}
          </div>
        )}
        <div className="satEarthCondSectionDivider">
          <div className="satEarthCondSectionDividerLine" />
          <span className="satEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faWaveSquare} style={{ color: "#FF9500" }} />
            Acoustic Propagation
          </span>
          <div className="satEarthCondSectionDividerLine" />
        </div>
        <div className="satEarthCondOverviewGrid">
          <div className="satEarthCondPanelTriple satEarthCondChartContainerComputed">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>Refraction Analysis</h4>
              {renderDataTypeBadge("COMPUTED", "small")}
            </div>
            {renderDataTable("Refraction Parameters", ["Parameter", "Value", "Status"], [
                            ["Refraction Coefficient", acousticPropagation.refraction?.coefficient !== null && acousticPropagation.refraction?.coefficient !== undefined ? acousticPropagation.refraction?.coefficient.toFixed(3) : "—", (acousticPropagation.refraction?.coefficient ?? 1) > 1.1 || (acousticPropagation.refraction?.coefficient ?? 1) < 0.9 ? "SIGNIFICANT" : "NOMINAL"],
                            ["Sound Speed Gradient", `${acousticPropagation.refraction?.gradient !== null && acousticPropagation.refraction?.gradient !== undefined ? acousticPropagation.refraction?.gradient.toFixed(2) : "—"} m/s/km`, Math.abs(acousticPropagation.refraction?.gradient ?? 0) > 10 ? "STRONG" : "MODERATE"],
                            ["Inversion Detected", acousticPropagation.refraction?.inversionDetected ? "YES" : "NO", acousticPropagation.refraction?.inversionDetected ? "PRESENT" : "ABSENT"],
                            ["Inversion Altitude", acousticPropagation.refraction?.inversionAltitude ? `${acousticPropagation.refraction?.inversionAltitude} m` : "—", acousticPropagation.refraction?.inversionAltitude ? "DETECTED" : "—"]
                          ])}
            <div className="satEarthCondChartDescription">
              {renderDescription("This table describes how sound is bending as it travels through the atmosphere. Temperature and wind changes with height refract sound upward or downward. When sound bends back toward the ground, noise from distant sources carries much farther than usual.")}
            </div>
          </div>
          <div className="satEarthCondPanelTriple satEarthCondChartContainerComputed">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>Acoustic Ducting</h4>
              {renderDataTypeBadge("COMPUTED", "small")}
            </div>
            {renderGauge({ value: acousticPropagation.ductingProbability, display: acousticPropagation.ductingProbability !== null && acousticPropagation.ductingProbability !== undefined ? `${acousticPropagation.ductingProbability.toFixed(0)}%` : "—", label: "Ducting Probability", unit: "%", min: 0, max: 100, zones: [{ to: 25, label: "Unlikely", color: "#4ecdc4" }, { to: 50, label: "Possible", color: "#ffd93d" }, { to: 100, label: "Likely", color: "#FF9500" }] })}
            <div className="satEarthCondChartDescription">
              {renderDescription("This gauge shows the probability that an acoustic duct has formed. A duct is a layer that traps sound and guides it horizontally over long distances, usually beneath a temperature inversion. Ducting is most common on calm, clear nights.")}
            </div>
          </div>
          {((((acousticPropagation.shadowZones && acousticPropagation.shadowZones.length > 0) || soundSpeedChart)) && (acousticPropagation.shadowZones?.length > 0)) && (
            <div className="satEarthCondPanelTriple satEarthCondChartContainerComputed">
              <div className="satEarthCondChartHeaderWithBadge">
                <h4>Shadow Zones ({acousticPropagation.shadowZones.length})</h4>
                {renderDataTypeBadge("COMPUTED", "small")}
              </div>
              {renderDataTable("Acoustic Shadow Zones", ["Distance (km)", "Type", "Intensity"],
                acousticPropagation.shadowZones.map(zone => [
                  zone?.distance !== null && zone?.distance !== undefined ? zone.distance.toFixed(1) : "—",
                  zone?.type?.replace(/_/g, " ") || "—",
                  zone?.intensity || "—"
                ])
              )}
              <div className="satEarthCondChartDescription">
                {renderDescription("This table lists acoustic shadow zones, which are areas where sound from a source cannot reach because it bends away from the ground. Each entry shows the distance to the zone, its type, and intensity. Sounds that would normally be audible can be silent inside a shadow zone.")}
              </div>
            </div>
          )}
        </div>
        {((((((acousticPropagation.shadowZones && acousticPropagation.shadowZones.length > 0) || soundSpeedChart)) && soundSpeedChart)) || (((soundSpeedProfile.length > 0)))) && (
          <div className="satEarthCondOverviewGrid">
            {((((acousticPropagation.shadowZones && acousticPropagation.shadowZones.length > 0) || soundSpeedChart)) && soundSpeedChart) && (
              <div className="satEarthCondPanelDouble satEarthCondChartContainerComputed">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Sound Speed vs Altitude</h4>
                  {renderDataTypeBadge("COMPUTED", "small")}
                </div>
                {renderDynamicChart(soundSpeedChart, "satEarthCondChart")}
                <div className="satEarthCondChartDescription">
                  <div className="satEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Altitude (m)</span>
                    <span><strong>Y-Axis:</strong> Sound Speed (m/s)</span>
                  </div>
                  {renderDescription("This chart displays the vertical profile of sound speed through the atmosphere. Sound speed varies with temperature and humidity, creating layers that can bend, focus, or trap acoustic energy. Temperature inversions can channel sound over unusually long distances, which is why noise from traffic, industry, thunder, or events can carry much farther on calm, stable nights.")}
                </div>
                {renderChartStats(soundSpeedChart)}
              </div>
            )}
            {((soundSpeedProfile.length > 0)) && (
              <div className="satEarthCondPanelDouble satEarthCondChartContainerComputed">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Sound Speed Profile ({soundSpeedProfile.length} Levels)</h4>
                  {renderDataTypeBadge("COMPUTED", "small")}
                </div>
                {renderDataTable("Vertical Profile", ["Altitude (m)", "Pressure (hPa)", "Temperature (°C)", "Sound Speed (m/s)"],
                  soundSpeedProfile.map(level => [
                    level?.altitude !== null && level?.altitude !== undefined ? level.altitude.toFixed(0) : "0",
                    level?.pressureLevel || "Surface",
                    level?.temperature !== null && level?.temperature !== undefined ? level.temperature.toFixed(1) : "—",
                    level?.soundSpeed !== null && level?.soundSpeed !== undefined ? level.soundSpeed.toFixed(1) : "—"
                  ])
                )}
                <div className="satEarthCondChartDescription">
                  {renderDescription("This table lists the speed of sound at each level of the vertical profile along with the altitude, pressure, and temperature there. Sound travels faster in warmer air, so the pattern of speeds with height determines whether sound bends upward or downward.")}
                </div>
              </div>
            )}
          </div>
        )}
        <div className="satEarthCondSectionDivider">
          <div className="satEarthCondSectionDividerLine" />
          <span className="satEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faBroadcastTower} />
            Vertical Profile
          </span>
          <div className="satEarthCondSectionDividerLine" />
        </div>
        <div className="satEarthCondOverviewGrid">
          <div className="satEarthCondPanelDouble satEarthCondChartContainerComputed">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>Vertical Structure</h4>
              {renderDataTypeBadge("COMPUTED", "small")}
            </div>
            {renderDataTable("Density & Scale", ["Parameter", "Value", "Unit"], [
              ["Lowest Level Density", surfaceDensityLevel?.density !== null && surfaceDensityLevel?.density !== undefined ? surfaceDensityLevel.density.toFixed(3) : "—", "kg/m³"],
              ["Scale Height", data.atmosphericDensity?.scaleHeight !== null && data.atmosphericDensity?.scaleHeight !== undefined ? data.atmosphericDensity.scaleHeight.toFixed(0) : "—", "m"],
              ["Profile Levels", densityProfile.length, ""]
            ])}
            <div className="satEarthCondChartDescription">
              {renderDescription("This table summarizes the density structure of the atmosphere above the selected location. It shows air density at the lowest level of the profile, the scale height over which pressure and density fall by a factor of about 2.7, and the number of levels available in the profile.")}
            </div>
          </div>
          <div className="satEarthCondPanelDouble satEarthCondChartContainerComputed">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>Freezing Level & Icing</h4>
              {renderDataTypeBadge("COMPUTED", "small")}
            </div>
            {renderDataTable("Icing", ["Parameter", "Value", "Unit"], [
              ["Freezing Level", data.freezeLine?.height !== null && data.freezeLine?.height !== undefined ? Math.round(data.freezeLine.height) : "—", "m"],
              ["Icing Risk", data.freezeLine?.icingRisk || "—", ""]
            ])}
            <div className="satEarthCondChartDescription">
              {renderDescription("This table shows the altitude of the freezing level and the associated icing risk. Below the freezing level precipitation generally falls as rain, while above it clouds containing supercooled water can cause ice to accumulate on aircraft.")}
            </div>
          </div>
        </div>
        {densityChart && (
          <div className="satEarthCondOverviewGrid">
            {densityChart && (
              <div className="satEarthCondPanelSingle satEarthCondChartContainerComputed">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Density Profile</h4>
                  {renderDataTypeBadge("COMPUTED", "small")}
                </div>
                {renderDynamicChart(densityChart, "satEarthCondChart")}
                <div className="satEarthCondChartDescription">
                  <div className="satEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Altitude (m)</span>
                    <span><strong>Y-Axis:</strong> Atmospheric Density (kg/m³)</span>
                  </div>
                  {renderDescription("This chart shows the atmospheric density profile versus altitude based on current meteorological conditions. Atmospheric density decreases exponentially with altitude following the barometric formula, and its exact profile depends on the temperature of each layer, so warm air columns are less dense than cold ones. The profile affects sound propagation, aircraft performance, and the vertical structure of weather systems.")}
                </div>
                {renderChartStats(densityChart)}
              </div>
            )}
          </div>
        )}
        <div className="satEarthCondSectionDivider">
          <div className="satEarthCondSectionDividerLine" />
          <span className="satEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faWind} />
            Winds Aloft & Shear
          </span>
          <div className="satEarthCondSectionDividerLine" />
        </div>
        <div className="satEarthCondOverviewGrid">
          <div className="satEarthCondPanelDouble satEarthCondChartContainerLive">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>Upper-Level Winds</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderDataTable("Shear & Jet Stream", ["Parameter", "Value", "Unit"], [
              ["Max Shear", data.windShearAnalysis?.maxShear !== null && data.windShearAnalysis?.maxShear !== undefined ? data.windShearAnalysis.maxShear.toFixed(2) : "—", "m/s/km"],
              ["Max Shear Alt", data.windShearAnalysis?.maxShearAltitude !== null && data.windShearAnalysis?.maxShearAltitude !== undefined ? Math.round(data.windShearAnalysis.maxShearAltitude) : "—", "m"],
              ["Jet Stream Speed", data.windShearAnalysis?.jetStreamData?.speed !== null && data.windShearAnalysis?.jetStreamData?.speed !== undefined ? data.windShearAnalysis.jetStreamData.speed.toFixed(1) : "—", "m/s"],
              ["Jet Stream Alt", data.windShearAnalysis?.jetStreamData?.height !== null && data.windShearAnalysis?.jetStreamData?.height !== undefined ? Math.round(data.windShearAnalysis.jetStreamData.height) : "—", "m"]
            ])}
            <div className="satEarthCondChartDescription">
              {renderDescription("This table shows the strongest wind shear in the vertical profile with its altitude, along with the speed and altitude of the jet stream if one is present. Strong shear and a nearby jet stream both increase turbulence and can help organize severe thunderstorms.")}
            </div>
          </div>
          <div className="satEarthCondPanelDouble satEarthCondChartContainerLive">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>Shear Summary</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            <div className="satEarthCondShearSummary">
              <div className="satEarthCondShearStat">
                <span className="satEarthCondShearLabel">Total Layers</span>
                <span className="satEarthCondShearValue">{verticalProfile.length}</span>
              </div>
              <div className="satEarthCondShearStat" style={{ color: criticalLayers.length > 0 ? "#FF9500" : "#919baf" }}>
                <span className="satEarthCondShearLabel">Elevated (≥15)</span>
                <span className="satEarthCondShearValue">{criticalLayers.length}</span>
              </div>
              <div className="satEarthCondShearStat" style={{ color: warningLayers.length > 0 ? "#ff6b6b" : "#919baf" }}>
                <span className="satEarthCondShearLabel">High (≥25)</span>
                <span className="satEarthCondShearValue">{warningLayers.length}</span>
              </div>
            </div>
            <div className="satEarthCondChartDescription">
              {renderDescription("This panel counts the layers in the vertical profile and how many of them have elevated or high wind shear. Shear of 15 m/s/km or more is treated as elevated and 25 m/s/km or more as high. These counts give a quick sense of how turbulent the atmosphere is aloft.")}
            </div>

          </div>
        </div>
        <div className="satEarthCondOverviewGrid">
          {shearChart && (
            <div className="satEarthCondPanelDouble satEarthCondChartContainerLive">
              <div className="satEarthCondChartHeaderWithBadge">
                <h4>Shear Profile Chart</h4>
                {renderDataTypeBadge("LIVE", "small")}
              </div>
              {renderDynamicChart(shearChart, "satEarthCondChart")}
              <div className="satEarthCondChartDescription">
                <div className="satEarthCondChartAxesInfo">
                  <span><strong>X-Axis:</strong> Altitude (m)</span>
                  <span><strong>Y-Axis:</strong> Wind Shear (m/s/km)</span>
                </div>
                {renderDescription("This chart displays the vertical wind shear profile from the surface to the upper atmosphere. Wind shear is the rate of change in wind velocity with altitude, calculated between adjacent pressure levels. Strong shear produces turbulence for aircraft, can tilt and organize thunderstorms into longer-lived severe storms, and often marks the jet stream and frontal boundaries.")}
              </div>
              {renderChartStats(shearChart)}
            </div>
          )}
          <div className="satEarthCondPanelDouble satEarthCondChartContainerLive">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>Elevated Shear Layers</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderDataTable("Elevated Shear Layers (≥15 m/s/km)", ["Alt (m)", "Shear", "Wind", "ΔH (m)", "ΔV (m/s)"], criticalLayers.map((l, i) => [
                  l && l.altitude !== null && l.altitude !== undefined ? Math.round(l.altitude) : "—",
                  { value: l && l.shear !== null && l.shear !== undefined ? l.shear.toFixed(2) : "—", color: l && l.shear >= 25 ? "#ff6b6b" : "#FF9500" },
                  l && l.windSpeed !== null && l.windSpeed !== undefined ? `${l.windSpeed.toFixed(1)} m/s` : "—",
                  l && l.heightDiff !== null && l.heightDiff !== undefined ? Math.round(l.heightDiff) : "—",
                  l && l.windDiff !== null && l.windDiff !== undefined ? l.windDiff.toFixed(1) : "—"
                ]), { emptyText: "No elevated shear layers were detected above the 15 m/s/km threshold." })}
            <div className="satEarthCondChartDescription">
              {renderDescription("This table lists each layer where wind shear reaches at least 15 m/s/km. Each entry shows the altitude, shear rate, wind speed, and the height and wind change across the layer. An empty table means no elevated shear layers were detected.")}
            </div>
          </div>
        </div>
        {((verticalProfile.length > 0)) && (
          <div className="satEarthCondOverviewGrid">
            {((verticalProfile.length > 0)) && (
              <div className="satEarthCondPanelSingle satEarthCondChartContainerLive">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Full Vertical Shear Profile</h4>
                  {renderDataTypeBadge("LIVE", "small")}
                </div>
                {renderDataTable("Shear by Level", ["Pressure (hPa)", "Altitude (m)", "Shear (m/s/km)", "Wind Speed (m/s)", "Wind Dir (°)", "Status"], verticalProfile.map((l, i) => {
                    const shearVal = l?.shear ?? 0;
                    const status = shearVal >= 25 ? "HIGH" : shearVal >= 15 ? "ELEVATED" : shearVal >= 10 ? "MODERATE" : "NOMINAL";
                    const statusColor = shearVal >= 25 ? "#ff6b6b" : shearVal >= 15 ? "#FF9500" : shearVal >= 10 ? "#4ecdc4" : "#4ecdc4";
                    return [
                      l?.pressureLevel || "—",
                      l?.altitude !== null && l?.altitude !== undefined ? Math.round(l.altitude) : "—",
                      { value: l?.shear !== null && l?.shear !== undefined ? l.shear.toFixed(2) : "—", color: statusColor },
                      l?.windSpeed !== null && l?.windSpeed !== undefined ? l.windSpeed.toFixed(1) : "—",
                      l?.windDirection !== null && l?.windDirection !== undefined ? Math.round(l.windDirection) : "—",
                      { value: status, color: statusColor }
                    ];
                  }))}
                <div className="satEarthCondChartDescription">
                  {renderDescription("This table lists wind shear, wind speed, and wind direction at every level of the vertical profile, from the surface to the upper atmosphere. Each level is rated from nominal to high so that turbulent layers are easy to find.")}
                </div>
              </div>
            )}
          </div>
        )}
        <div className="satEarthCondSectionDivider">
          <div className="satEarthCondSectionDividerLine" />
          <span className="satEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faCloud} style={{ color: DATA_TYPE.HISTORICAL.color }} />
            Cloud & Precipitation History (30-Day)
          </span>
          <div className="satEarthCondSectionDividerLine" />
        </div>
                {(((((cloudTotalChart || cloudLowChart)) && cloudTotalChart)) || ((((cloudTotalChart || cloudLowChart)) && cloudLowChart))) && (
          <div className="satEarthCondOverviewGrid">
            {(((cloudTotalChart || cloudLowChart)) && cloudTotalChart) && (
              <div className="satEarthCondPanelDouble satEarthCondChartContainerHistorical">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Total Cloud Cover History</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(cloudTotalChart, "satEarthCondChart")}
                <div className="satEarthCondChartDescription">
                  <div className="satEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (30-Day Observation Period)</span>
                    <span><strong>Y-Axis:</strong> Total Cloud Cover (%)</span>
                  </div>
                  {renderDescription("This chart displays total cloud coverage over the past 30 days, combining all cloud layers from the surface to high altitude. Cloud cover moderates daytime heating and nighttime cooling, affects solar energy availability, and often indicates the presence of weather systems. Extended periods of heavy coverage usually coincide with stalled fronts or persistent moisture.")}
                </div>
                {renderChartStats(cloudTotalChart)}
              </div>
            )}
            {(((cloudTotalChart || cloudLowChart)) && cloudLowChart) && (
              <div className="satEarthCondPanelDouble satEarthCondChartContainerHistorical">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Low Cloud Cover History</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(cloudLowChart, "satEarthCondChart")}
                <div className="satEarthCondChartDescription">
                  <div className="satEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (30-Day Observation Period)</span>
                    <span><strong>Y-Axis:</strong> Low Cloud Cover (%)</span>
                  </div>
                  {renderDescription("This chart shows low-level cloud coverage (below roughly 2000 m) over the past 30 days. Low clouds such as stratus and stratocumulus bring overcast skies, drizzle, and reduced ceilings that affect aviation and visibility. They are closely tied to marine layers, fog, and moist onshore flow, and they strongly suppress daytime surface heating.")}
                </div>
                {renderChartStats(cloudLowChart)}
                
              </div>
            )}
          </div>
        )}
        {((precipChart) || (historicalCloud?.statistics?.totalCover)) && (
          <div className="satEarthCondOverviewGrid">
            {precipChart && (
              <div className="satEarthCondPanelDouble satEarthCondChartContainerHistorical">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Precipitation History</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(precipChart, "satEarthCondChart")}
                <div className="satEarthCondChartDescription">
                  <div className="satEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (30-Day Observation Period)</span>
                    <span><strong>Y-Axis:</strong> Precipitation (mm)</span>
                  </div>
                  {renderDescription("This chart displays precipitation accumulation over the past 30 days. Precipitation history shows how wet or dry recent conditions have been, which drives soil moisture, flood potential, and wildfire risk. Heavy hourly totals point to convective downpours, while long runs of dry hours indicate drought stress on vegetation.")}
                </div>
                {renderChartStats(precipChart)}
                
              </div>
            )}
            {historicalCloud?.statistics?.totalCover && (
              <div className="satEarthCondPanelDouble satEarthCondChartContainerHistorical">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Cloud Cover Statistics</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDataTable("30-Day Cloud Stats", ["Parameter", "Value", "Unit"], [
                  ["Min Cover", historicalCloud.statistics.totalCover.min !== null && historicalCloud.statistics.totalCover.min !== undefined ? historicalCloud.statistics.totalCover.min.toFixed(0) : "—", "%"],
                  ["Max Cover", historicalCloud.statistics.totalCover.max !== null && historicalCloud.statistics.totalCover.max !== undefined ? historicalCloud.statistics.totalCover.max.toFixed(0) : "—", "%"],
                  ["Mean Cover", historicalCloud.statistics.totalCover.mean !== null && historicalCloud.statistics.totalCover.mean !== undefined ? historicalCloud.statistics.totalCover.mean.toFixed(1) : "—", "%"],
                  ["Std Dev", historicalCloud.statistics.totalCover.stdDev !== null && historicalCloud.statistics.totalCover.stdDev !== undefined ? historicalCloud.statistics.totalCover.stdDev.toFixed(1) : "—", "%"],
                  ["Clear Hours (<25%)", historicalCloud.statistics.totalCover.clearDays ?? 0, "hours"],
                  ["Overcast Hours (>75%)", historicalCloud.statistics.totalCover.overcastDays ?? 0, "hours"]
                ])}
                <div className="satEarthCondChartDescription">
                  {renderDescription("This table summarizes cloud cover over the last 30 days, including the minimum, maximum, mean, and variability. It also counts the hours that were mostly clear, with less than 25% cover, and mostly overcast, with more than 75% cover.")}
                </div>
              </div>
            )}
          </div>
        )}
        <div className="satEarthCondSectionDivider">
          <div className="satEarthCondSectionDividerLine" />
          <span className="satEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faTint} />
            Humidity & Inversion History (30-Day)
          </span>
          <div className="satEarthCondSectionDividerLine" />
        </div>
                {(((((surfaceRHChart || dewpointDepressionChart)) && surfaceRHChart)) || ((((surfaceRHChart || dewpointDepressionChart)) && dewpointDepressionChart))) && (
          <div className="satEarthCondOverviewGrid">
            {(((surfaceRHChart || dewpointDepressionChart)) && surfaceRHChart) && (
              <div className="satEarthCondPanelDouble satEarthCondChartContainerHistorical">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Surface Relative Humidity History</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(surfaceRHChart, "satEarthCondChart")}
                <div className="satEarthCondChartDescription">
                  <div className="satEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (30-Day Observation Period)</span>
                    <span><strong>Y-Axis:</strong> Relative Humidity (%)</span>
                  </div>
                  {renderDescription("This chart displays surface relative humidity over the past 30 days. Humidity controls fog and dew formation, heat stress in warm weather, and the drying of vegetation and fuels. Very high values signal saturated air where fog and drizzle form easily, while very low values increase static electricity and wildfire risk.")}
                </div>
                {renderChartStats(surfaceRHChart)}
              </div>
            )}
            {(((surfaceRHChart || dewpointDepressionChart)) && dewpointDepressionChart) && (
              <div className="satEarthCondPanelDouble satEarthCondChartContainerHistorical">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Dewpoint Depression History</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(dewpointDepressionChart, "satEarthCondChart")}
                <div className="satEarthCondChartDescription">
                  <div className="satEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (30-Day Observation Period)</span>
                    <span><strong>Y-Axis:</strong> Dewpoint Depression (°C)</span>
                  </div>
                  {renderDescription("This chart shows dewpoint depression (temperature minus dewpoint) over the past 30 days. Dewpoint depression indicates how close the air is to saturation, and smaller values mean a higher likelihood of fog, dew, low cloud, and condensation on surfaces. Values below about 3 °C, especially on calm and clear nights, frequently lead to fog formation at this location.")}
                </div>
                {renderChartStats(dewpointDepressionChart)}
                
              </div>
            )}
          </div>
        )}
        <div className="satEarthCondOverviewGrid">
          {historicalHumidity?.statistics?.surfaceRH && (
            <div className="satEarthCondPanelDouble satEarthCondChartContainerHistorical">
              <div className="satEarthCondChartHeaderWithBadge">
                <h4>Surface Humidity Statistics</h4>
                {renderDataTypeBadge("HISTORICAL", "small")}
              </div>
              {renderDataTable("30-Day Humidity Stats", ["Parameter", "Value", "Unit"], [
                ["Min RH", historicalHumidity.statistics.surfaceRH.min !== null && historicalHumidity.statistics.surfaceRH.min !== undefined ? historicalHumidity.statistics.surfaceRH.min.toFixed(0) : "—", "%"],
                ["Max RH", historicalHumidity.statistics.surfaceRH.max !== null && historicalHumidity.statistics.surfaceRH.max !== undefined ? historicalHumidity.statistics.surfaceRH.max.toFixed(0) : "—", "%"],
                ["Mean RH", historicalHumidity.statistics.surfaceRH.mean !== null && historicalHumidity.statistics.surfaceRH.mean !== undefined ? historicalHumidity.statistics.surfaceRH.mean.toFixed(1) : "—", "%"],
                ["Std Dev", historicalHumidity.statistics.surfaceRH.stdDev !== null && historicalHumidity.statistics.surfaceRH.stdDev !== undefined ? historicalHumidity.statistics.surfaceRH.stdDev.toFixed(1) : "—", "%"],
                ["High RH Hours (>85%)", historicalHumidity.statistics.surfaceRH.highHumidityHours ?? 0, "hours"],
                ["Low RH Hours (<30%)", historicalHumidity.statistics.surfaceRH.lowHumidityHours ?? 0, "hours"]
              ])}
              <div className="satEarthCondChartDescription">
                {renderDescription("This table summarizes surface relative humidity over the last 30 days, including the minimum, maximum, mean, and variability. It also counts the hours of very humid air above 85% and very dry air below 30%, which relate to fog risk and fire risk.")}
              </div>
            </div>
          )}
          <div className="satEarthCondPanelDouble satEarthCondChartContainerHistorical">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>Inversion Statistics</h4>
              {renderDataTypeBadge("HISTORICAL", "small")}
            </div>
            {renderDataTable("30-Day Inversion Stats", ["Parameter", "Value", "Unit"], [
              ["Frequency", historicalInversions.statistics?.frequency !== null && historicalInversions.statistics?.frequency !== undefined ? historicalInversions.statistics.frequency.toFixed(1) : "0", "% of Time"],
              ["Mean Indicator", historicalInversions.statistics?.meanStrength !== null && historicalInversions.statistics?.meanStrength !== undefined ? historicalInversions.statistics.meanStrength.toFixed(2) : "0", "index"],
              ["Max Indicator", historicalInversions.statistics?.maxStrength !== null && historicalInversions.statistics?.maxStrength !== undefined ? historicalInversions.statistics.maxStrength.toFixed(2) : "0", "index"],
              ["Probable Inversions", historicalInversions.statistics?.probableCount ?? historicalInversions.statistics?.strongInversionHours ?? 0, "hours"],
              ["Possible Inversions", historicalInversions.statistics?.possibleCount ?? 0, "hours"]
            ])}
            {historicalInversions.statistics?.note && (
              <div className="satEarthCondDataTrust" style={{ marginTop: "8px", fontSize: "11px", color: "#919baf" }}>
                Note: {historicalInversions.statistics.note}
              </div>
            )}
            <div className="satEarthCondChartDescription">
              {renderDescription("This table summarizes how often temperature inversions occurred over the last 30 days and how strong they were. Frequent inversions indicate a location prone to trapped pollution, fog, and cold air pooling, especially overnight.")}
            </div>
          </div>
        </div>
        {inversionIndicatorChart && (
          <div className="satEarthCondOverviewGrid">
            {inversionIndicatorChart && (
              <div className="satEarthCondPanelSingle satEarthCondChartContainerHistorical">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Inversion Indicator History</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(inversionIndicatorChart, "satEarthCondChart")}
                <div className="satEarthCondChartDescription">
                  <div className="satEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (30-Day Observation Period)</span>
                    <span><strong>Y-Axis:</strong> Inversion Strength Index</span>
                  </div>
                  {renderDescription("This chart displays the temperature inversion strength indicator over the past 30 days. Temperature inversions occur when temperature increases with altitude rather than decreasing, creating stable layers that suppress vertical mixing. Inversions trap pollutants, smoke, and moisture near the ground, degrading air quality and visibility, and they often form on clear, calm nights.")}
                </div>
                {renderChartStats(inversionIndicatorChart)}
              </div>
            )}
          </div>
        )}


        <div className="satEarthCondSectionDivider">
          <div className="satEarthCondSectionDividerLine" />
          <span className="satEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faHistory} style={{ color: DATA_TYPE.HISTORICAL.color }} />
            Wind, Temperature & Pressure History (30-Day)
          </span>
          <div className="satEarthCondSectionDividerLine" />
        </div>
                {((atmoWind10Chart) || (atmoWind100Chart)) && (
          <div className="satEarthCondOverviewGrid">
            {atmoWind10Chart && (
              <div className="satEarthCondPanelDouble satEarthCondChartContainerHistorical">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Historical Surface Wind (10m)</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(atmoWind10Chart, "satEarthCondChart")}
                <div className="satEarthCondChartDescription">
                  <div className="satEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (30-Day Observation Period)</span>
                    <span><strong>Y-Axis:</strong> Wind Speed at 10m (m/s)</span>
                  </div>
                  {renderDescription("This chart displays surface wind speed at 10 meters above ground level over the past 30 days. The 10-meter wind is the standard meteorological reference height and best represents the wind experienced at ground level. It drives wind chill, wave development, dust transport, and wildfire behavior, and its long-term pattern shows how windy this location usually is.")}
                </div>
                {renderChartStats(atmoWind10Chart)}
                
              </div>
            )}
            {atmoWind100Chart && (
              <div className="satEarthCondPanelDouble satEarthCondChartContainerHistorical">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Historical Upper Wind (100m)</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(atmoWind100Chart, "satEarthCondChart")}
                <div className="satEarthCondChartDescription">
                  <div className="satEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (30-Day Observation Period)</span>
                    <span><strong>Y-Axis:</strong> Wind Speed at 100m (m/s)</span>
                  </div>
                  {renderDescription("This chart shows wind speed at 100 meters above ground over the past 30 days. The 100-meter level sits within the atmospheric boundary layer and is often stronger and steadier than the surface wind, since it is less affected by terrain and buildings. Comparing it with the 10-meter wind reveals near-surface shear and stability, and it is the height most relevant to wind energy production.")}
                </div>
                {renderChartStats(atmoWind100Chart)}
                
              </div>
            )}
          </div>
        )}
        {((atmoGustChart) || (historicalAtmo?.statistics?.highWindFrequency)) && (
          <div className="satEarthCondOverviewGrid">
            {atmoGustChart && (
              <div className="satEarthCondPanelDouble satEarthCondChartContainerHistorical">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Historical Wind Gusts</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(atmoGustChart, "satEarthCondChart")}
                <div className="satEarthCondChartDescription">
                  <div className="satEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (30-Day Observation Period)</span>
                    <span><strong>Y-Axis:</strong> Wind Gust Speed (m/s)</span>
                  </div>
                  {renderDescription("This chart displays peak wind gust measurements over the past 30 days. Gusts are sudden, brief increases in wind speed that cause most wind-related damage to trees, power lines, and structures. Frequent strong gusts relative to the average wind indicate turbulent mixing, which is common with frontal passages, convective storms, and rough terrain.")}
                </div>
                {renderChartStats(atmoGustChart)}
                
              </div>
            )}
            {historicalAtmo?.statistics?.highWindFrequency && (
              <div className="satEarthCondPanelDouble satEarthCondChartContainerHistorical">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>High Wind Activity</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDataTable("Wind Stats (100m)", ["Parameter", "Value", "Unit"], [
                  ["High Wind Events (>20 m/s)", historicalAtmo.statistics.highWindFrequency.events ?? 0, "count"],
                  ["Frequency", `${historicalAtmo.statistics.highWindFrequency.percentage !== null && historicalAtmo.statistics.highWindFrequency.percentage !== undefined ? historicalAtmo.statistics.highWindFrequency.percentage.toFixed(1) : "—"}%`, "of Time"],
                  ["Max Speed", `${historicalAtmo.statistics.highWindFrequency.maxSpeed !== null && historicalAtmo.statistics.highWindFrequency.maxSpeed !== undefined ? historicalAtmo.statistics.highWindFrequency.maxSpeed.toFixed(1) : "—"}`, "m/s"]
                ])}
                <div className="satEarthCondChartDescription">
                  {renderDescription("This table summarizes high wind events at 100 m above ground over the last 30 days. It counts the hours with winds above 20 m/s, the share of time those winds occurred, and the maximum speed recorded.")}
                </div>
              </div>
            )}
          </div>
        )}
        {((atmoTempChart) || (atmoPressureChart)) && (
          <div className="satEarthCondOverviewGrid">
            {atmoTempChart && (
              <div className="satEarthCondPanelDouble satEarthCondChartContainerHistorical">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Historical Surface Temperature</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(atmoTempChart, "satEarthCondChart")}
                <div className="satEarthCondChartDescription">
                  <div className="satEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (30-Day Observation Period)</span>
                    <span><strong>Y-Axis:</strong> Surface Temperature (°C)</span>
                  </div>
                  {renderDescription("This chart tracks surface air temperature over the past 30 days. Temperature controls air density, humidity capacity, and atmospheric stability, and it drives heat stress, frost risk, and energy demand at the surface. The 30-day record shows the typical daily range at this location and highlights warm spells and cold outbreaks.")}
                </div>
                {renderChartStats(atmoTempChart)}
                
              </div>
            )}
            {atmoPressureChart && (
              <div className="satEarthCondPanelDouble satEarthCondChartContainerHistorical">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Historical Surface Pressure</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(atmoPressureChart, "satEarthCondChart")}
                <div className="satEarthCondChartDescription">
                  <div className="satEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (30-Day Observation Period)</span>
                    <span><strong>Y-Axis:</strong> Surface Pressure (hPa)</span>
                  </div>
                  {renderDescription("This chart displays barometric pressure readings over the observation period. Short-term pressure changes are an early signal of approaching weather systems, since a steady fall often precedes wind and rain and a steady rise usually brings clearing. Unusually rapid changes can indicate intensifying storms.")}
                </div>
                {renderChartStats(atmoPressureChart)}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderElectromagneticEnvironmentTab = () => {
    const data = getModuleData("electromagneticEnvironment") || {};
    if (!data || Object.keys(data).length === 0) return renderEmptyState(faDatabase, "There is no space weather data yet.");

    const radiationEnvironment = getModuleData("temporalForensics")?.radiationEnvironment || {};
    const differentialElectrons = radiationEnvironment.differentialElectrons || [];
    const differentialProtons = radiationEnvironment.differentialProtons || [];
    const diffElectronChart = differentialElectrons.length > 0 ? createDynamicLineChart("Differential Electrons", differentialElectrons.slice(-100), "timestamp", (d) => {
      if (!d) return 0;
      const keys = Object.keys(d).filter(k => k.startsWith("flux_"));
      return keys.length > 0 && d[keys[0]] !== null && d[keys[0]] !== undefined ? d[keys[0]] : 0;
    }, " e/cm²-s-sr-keV", "#4ecdc4", false) : null;
    const diffProtonChart = differentialProtons.length > 0 ? createDynamicLineChart("Differential Protons", differentialProtons.slice(-100), "timestamp", (d) => {
      if (!d) return 0;
      const keys = Object.keys(d).filter(k => k.startsWith("flux_"));
      return keys.length > 0 && d[keys[0]] !== null && d[keys[0]] !== undefined ? d[keys[0]] : 0;
    }, " p/cm²-s-sr-MeV", "#ffd93d", false) : null;
    const cosmicRayAnalysis = getModuleData("atmosphericEnvironment")?.cosmicRayAnalysis || {};

    const kIndexForecast = data.kIndexHorizon?.forecast || [];
    const kpChart = kIndexForecast.length > 0 ? createDynamicLineChart("Kp Index", kIndexForecast, "time", "kp", "", "#4ecdc4", true) : null;

    const historicalRad = data.historicalRadiation || {};
    const protonTimeSeries = historicalRad?.protonTimeSeries || {};
    const electronTimeSeries = historicalRad?.electronTimeSeries || {};
    const neutronTimeSeries = historicalRad?.neutronTimeSeries || {};
    const xrayTimeSeries = historicalRad?.xrayTimeSeries || {};

    const protonP10 = protonTimeSeries.p10 || [];
    const protonP50 = protonTimeSeries.p50 || [];
    const protonP100 = protonTimeSeries.p100 || [];
    const electronE2 = electronTimeSeries.e2 || [];
    const neutronOulu = neutronTimeSeries.oulu || [];
    const neutronJung = neutronTimeSeries.jung || [];
    const neutronNewk = neutronTimeSeries.newk || [];
    const xrayShort = xrayTimeSeries.short || [];
    const xrayLong = xrayTimeSeries.long || [];

    const proton10Chart = protonP10.length > 0 ? createDynamicLineChart("Proton ≥10 MeV", protonP10, "timestamp", "value", " pfu", "#42a5f5", false) : null;
    const proton50Chart = protonP50.length > 0 ? createDynamicLineChart("Proton ≥50 MeV", protonP50, "timestamp", "value", " pfu", "#42a5f5", false) : null;
    const proton100Chart = protonP100.length > 0 ? createDynamicLineChart("Proton ≥100 MeV", protonP100, "timestamp", "value", " pfu", "#42a5f5", false) : null;

    const electron2Chart = electronE2.length > 0 ? createDynamicLineChart("Electron ≥2 MeV", electronE2, "timestamp", "value", " pfu", "#4ecdc4", false) : null;

    const neutronOuluChart = neutronOulu.length > 0 ? createDynamicLineChart("Neutron OULU (0.8 GV)", neutronOulu, "timestamp", "value", "%", "#ffd93d", false) : null;
    const locationCutoff = historicalRad?.neutronStations?.locationCutoff ?? null;
    const primaryStation = historicalRad?.neutronStations?.primary || { code: "—", name: "No Station", cutoff: "—" };
    const secondaryStation = historicalRad?.neutronStations?.secondary || { code: "—", name: "No Station", cutoff: "—" };
    const neutronJungChart = neutronJung.length > 0 ? createDynamicLineChart(`Neutron ${primaryStation.code} (${primaryStation.cutoff} GV)`, neutronJung, "timestamp", "value", "%", "#FF9500", false) : null;
    const neutronNewkChart = neutronNewk.length > 0 ? createDynamicLineChart(`Neutron ${secondaryStation.code} (${secondaryStation.cutoff} GV)`, neutronNewk, "timestamp", "value", "%", "#FF9500", false) : null;

    const xrayShortChart = xrayShort.length > 0 ? createDynamicLineChart("X-ray 0.05-0.4nm", xrayShort, "timestamp", "value", " W/m²", "#ff6b6b", false) : null;
    const xrayLongChart = xrayLong.length > 0 ? createDynamicLineChart("X-ray 0.1-0.8nm", xrayLong, "timestamp", "value", " W/m²", "#FF9500", false) : null;

    const commandData = getModuleData("overview") || {};
    const overviewDataPoints = commandData?.alertManager?.dataPoints || [];
    const getOverviewValue = (key) => {
      const point = overviewDataPoints.find(p => p && p.id === key);
      return point ? point.value : null;
    };
    const groundRadiationEnv = getModuleData("groundEnvironment")?.radiationEnvironment || {};
    const geomagneticTimeSeries = groundRadiationEnv.geomagneticTimeSeries || [];
    const solarWindTimeSeries = groundRadiationEnv.solarWindTimeSeries || [];
    const geomagChart = geomagneticTimeSeries.length > 0 ? createDynamicLineChart("Geomagnetic Bz (7-day)", geomagneticTimeSeries.slice(-200), "timestamp", "bz", " nT", "#4ecdc4", false) : null;
    const solarWindChart = solarWindTimeSeries.length > 0 ? createDynamicLineChart("Solar Wind Speed (7-day)", solarWindTimeSeries.slice(-200), "timestamp", "speed", " km/s", "#42a5f5", false) : null;
    const currentKp = getOverviewValue("kp_index");
    const dstIndex = getOverviewValue("dst_index");
    const f107Flux = getOverviewValue("f107_flux");
    const trackedObjects = getOverviewValue("tracked_objects");
    const catalogData = commandData?.orbitalEnvironment?.catalogData;
    const overheadAnalysis = commandData?.orbitalEnvironment?.overheadAnalysis;
    const historicalSpaceWeather = commandData?.historicalSpaceWeather || {};
    const historicalSpaceWeatherTimeSeries = historicalSpaceWeather?.timeSeries || [];
    const spaceWeatherKpChart = historicalSpaceWeatherTimeSeries.length > 0 ? createDynamicLineChart("Historical Kp Index", historicalSpaceWeatherTimeSeries.slice(-48), "timestamp", "value", "", "#42a5f5", false) : null;

    const signalIntegrity = data.signalIntegrity || {};
    const solarFlareActivity = data.solarFlareActivity || {};
    const cmeStatus = data.cmeStatus || {};
    const geomagnticStormForecast = data.geomagnticStormForecast || {};

    const getSignalStatus = (value, available) => {
      if (!available || value === null || value === undefined) return "NO DATA";
      return "OK";
    };

    const getFlareClassColor = (flareClass) => {
      if (flareClass === "X") return "#ff6b6b";
      if (flareClass === "M") return "#FF9500";
      if (flareClass === "C") return "#ffd93d";
      if (flareClass === "B") return "#4ecdc4";
      return "#919baf";
    };



    const aurora = data.aurora || {};
    const auroraSection = renderSection("Aurora Visibility", faMagnet, [[
      {
        title: "Aurora Probability",
        badge: "FORECAST",
        content: renderGauge({ value: aurora.localProbability, display: aurora.localProbability !== null && aurora.localProbability !== undefined ? `${Math.round(aurora.localProbability)}%` : "—", label: "Probability of Aurora Overhead", unit: "%", min: 0, max: 100, zones: [{ to: 10, label: "Unlikely", color: "#919baf" }, { to: 25, label: "Possible", color: "#42a5f5" }, { to: 50, label: "Good", color: "#4ecdc4" }, { to: 100, label: "Excellent", color: "#7fe9e1" }] }),
        description: "This gauge shows the NOAA OVATION model's probability of visible aurora directly overhead at the selected location in about 30 minutes. The model is driven by live solar wind measurements, so it responds within minutes to incoming geomagnetic storms. Aurora is usually only visible poleward of about 55° magnetic latitude unless a strong storm is under way."
      },
      {
        title: "Viewing Conditions",
        badge: "FORECAST",
        content: renderDataTable("Tonight", ["Parameter", "Value", "Status"], [
          ["Overhead Probability", formatValue(aurora.localProbability, 0, "%"), aurora.localProbability >= 25 ? "GOOD" : "LOW"],
          ["Horizon Probability", formatValue(aurora.horizonProbability, 0, "%"), aurora.horizonProbability >= 25 ? "GOOD" : "LOW"],
          ["Sun Altitude", formatValue(aurora.sunAltitude, 1, "°"), aurora.isDark ? "OK" : "REDUCED"],
          ["Dark Enough", aurora.isDark === null || aurora.isDark === undefined ? "—" : aurora.isDark ? "YES" : "NO", aurora.isDark ? "OK" : "REDUCED"],
          ["Outlook", aurora.outlook || "—", aurora.outlook === "EXCELLENT" || aurora.outlook === "GOOD" ? "GOOD" : "INFO"],
          ["Forecast Valid", formatLocationTime(aurora.forecastTime, true), "INFO"]
        ]),
        description: "This table combines the aurora forecast with whether the sky is dark enough to see it. Aurora occurs 100 to 300 km up, so a display several hundred kilometers poleward can still be seen low on the horizon, which is what the horizon probability measures. The sun must be at least 12° below the horizon, and a bright moon or cloud cover will also hide faint displays."
      }
    ]]);

    return (
      <div className="satEarthCondModuleTab">
        <div className="satEarthCondSectionDivider">
          <div className="satEarthCondSectionDividerLine" />
          <span className="satEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faSun} />
            Solar Activity
          </span>
          <div className="satEarthCondSectionDividerLine" />
        </div>
        <div className="satEarthCondOverviewGrid">
          <div className="satEarthCondPanelTriple satEarthCondChartContainerForecast">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>Flare Probabilities (24h)</h4>
              {renderDataTypeBadge("PROBABILISTIC", "small")}
            </div>
            {renderDataTable("Probabilities", ["Flare Class", "Probability", "Risk Level"], [
              ["C-class", solarFlareActivity.flareProbabilities?.cClass !== null && solarFlareActivity.flareProbabilities?.cClass !== undefined ? `${solarFlareActivity.flareProbabilities.cClass}%` : "—", solarFlareActivity.flareProbabilities?.cClass !== null && solarFlareActivity.flareProbabilities?.cClass !== undefined ? (solarFlareActivity.flareProbabilities.cClass >= 80 ? "HIGH" : solarFlareActivity.flareProbabilities.cClass >= 50 ? "MODERATE" : "LOW") : "NO DATA"],
              ["M-class", solarFlareActivity.flareProbabilities?.mClass !== null && solarFlareActivity.flareProbabilities?.mClass !== undefined ? `${solarFlareActivity.flareProbabilities.mClass}%` : "—", solarFlareActivity.flareProbabilities?.mClass !== null && solarFlareActivity.flareProbabilities?.mClass !== undefined ? (solarFlareActivity.flareProbabilities.mClass >= 40 ? "HIGH" : solarFlareActivity.flareProbabilities.mClass >= 20 ? "MODERATE" : "LOW") : "NO DATA"],
              ["X-class", solarFlareActivity.flareProbabilities?.xClass !== null && solarFlareActivity.flareProbabilities?.xClass !== undefined ? `${solarFlareActivity.flareProbabilities.xClass}%` : "—", solarFlareActivity.flareProbabilities?.xClass !== null && solarFlareActivity.flareProbabilities?.xClass !== undefined ? (solarFlareActivity.flareProbabilities.xClass >= 10 ? "CRITICAL" : solarFlareActivity.flareProbabilities.xClass >= 5 ? "HIGH" : "LOW") : "NO DATA"],
              ["Proton Event", solarFlareActivity.protonEventProbability !== null && solarFlareActivity.protonEventProbability !== undefined ? `${solarFlareActivity.protonEventProbability}%` : "—", solarFlareActivity.protonEventProbability !== null && solarFlareActivity.protonEventProbability !== undefined ? (solarFlareActivity.protonEventProbability >= 30 ? "HIGH" : solarFlareActivity.protonEventProbability >= 10 ? "MODERATE" : "LOW") : "NO DATA"]
            ])}
            <div className="satEarthCondChartDescription">
              {renderDescription("This table shows the Space Weather Prediction Center forecast probabilities for C-class, M-class, and X-class solar flares and for a solar proton event over the next 24 hours. M-class and X-class flares can cause radio blackouts on the sunlit side of Earth.")}
            </div>
          </div>
          <div className="satEarthCondPanelTriple satEarthCondChartContainerLive">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>Current Solar Activity</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderDataTable("X-ray Flux", ["Parameter", "Value", "Unit", "Status"], [
              ["X-ray (0.1-0.8nm)", solarFlareActivity.currentXrayFluxLong !== null && solarFlareActivity.currentXrayFluxLong !== undefined ? solarFlareActivity.currentXrayFluxLong.toExponential(2) : "—", "W/m²", solarFlareActivity.dataAvailable ? "OK" : "NO DATA"],
              ["X-ray (0.05-0.4nm)", solarFlareActivity.currentXrayFluxShort !== null && solarFlareActivity.currentXrayFluxShort !== undefined ? solarFlareActivity.currentXrayFluxShort.toExponential(2) : "—", "W/m²", solarFlareActivity.dataAvailable ? "OK" : "NO DATA"]
            ])}
            <div className="satEarthCondChartDescription">
              {renderDescription("This table shows the current solar X-ray flux in two wavelength bands measured by GOES satellites. The long wavelength band is the basis of the flare classification scale, where each letter from A through X represents a tenfold increase in X-ray output.")}
            </div>
          </div>
          <div className="satEarthCondPanelTriple satEarthCondChartContainerComputed">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>Flare Probability Gauge</h4>
              {renderDataTypeBadge("PROBABILISTIC", "small")}
            </div>
            {renderGauge({ value: solarFlareActivity.flareProbabilities?.mClass, display: solarFlareActivity.flareProbabilities?.mClass !== null && solarFlareActivity.flareProbabilities?.mClass !== undefined ? `${solarFlareActivity.flareProbabilities.mClass}%` : "—", label: "M-class Probability", unit: "%", min: 0, max: 100, zones: [{ to: 25, label: "Low", color: "#4ecdc4" }, { to: 50, label: "Moderate", color: "#FF9500" }, { to: 100, label: "High", color: "#ff6b6b" }] })}
            <div className="satEarthCondChartDescription">
              {renderDescription("This gauge shows the probability of an M-class solar flare within the next 24 hours. M-class flares are moderate events that can cause brief radio blackouts in polar regions and on the sunlit side of Earth.")}
            </div>
          </div>
        </div>
        {((solarFlareActivity.activeRegions?.length > 0)) && (
          <div className="satEarthCondOverviewGrid">
            {((solarFlareActivity.activeRegions?.length > 0)) && (
              <div className="satEarthCondPanelSingle satEarthCondChartContainerLive">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Active Solar Regions ({solarFlareActivity.activeRegions.length})</h4>
                  {renderDataTypeBadge("LIVE", "small")}
                </div>
                {renderDataTable("Sunspot Regions", ["Region", "Location", "Area", "Spots", "Mag Class", "Spot Class"],
                  solarFlareActivity.activeRegions.slice(0, 15).map(region => [
                    region?.regionNumber || "—",
                    region?.location || "—",
                    region?.area !== null && region?.area !== undefined ? region.area : "—",
                    region?.numSpots !== null && region?.numSpots !== undefined ? region.numSpots : "—",
                    region?.magClass || "—",
                    region?.spotClass || "—"
                  ])
                )}
                <div className="satEarthCondChartDescription">
                  {renderDescription("This table lists the numbered active regions currently visible on the Sun. Each entry includes the region location, area, number of sunspots, and magnetic and spot classifications. Regions with complex magnetic classes, such as beta-gamma-delta, are the most likely to produce large flares.")}
                </div>
              </div>
            )}
          </div>
        )}
        <div className="satEarthCondSectionDivider">
          <div className="satEarthCondSectionDividerLine" />
          <span className="satEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faGlobeAmericas} />
            Geomagnetic Conditions & CMEs
          </span>
          <div className="satEarthCondSectionDividerLine" />
        </div>
        <div className="satEarthCondOverviewGrid">
          <div className="satEarthCondPanelDouble satEarthCondChartContainerLive">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>Geomagnetic Indices</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderDataTable("Indices", ["Parameter", "Value", "Unit", "Status"], [
              ["Kp Index", currentKp !== null && currentKp !== undefined ? currentKp.toFixed(1) : "—", "", currentKp !== null && currentKp !== undefined ? (currentKp <= 3 ? "NOMINAL" : currentKp <= 5 ? "WARNING" : "CRITICAL") : "NO DATA"],
              ["Dst Index", dstIndex !== null && dstIndex !== undefined ? dstIndex.toFixed(0) : "—", "nT", dstIndex !== null && dstIndex !== undefined ? (dstIndex >= -40 && dstIndex <= 30 ? "NOMINAL" : dstIndex >= -100 ? "WARNING" : "CRITICAL") : "NO DATA"],
              ["F10.7 Flux", f107Flux !== null && f107Flux !== undefined ? f107Flux.toFixed(0) : "—", "sfu", f107Flux !== null && f107Flux !== undefined ? (f107Flux >= 60 && f107Flux <= 150 ? "NOMINAL" : "MARGINAL") : "NO DATA"],
              ["Bz Component", groundRadiationEnv.currentConditions?.bzComponent !== undefined && groundRadiationEnv.currentConditions?.bzComponent !== null ? groundRadiationEnv.currentConditions.bzComponent.toFixed(1) : "—", "nT", groundRadiationEnv.currentConditions?.bzComponent !== undefined && groundRadiationEnv.currentConditions?.bzComponent !== null ? (groundRadiationEnv.currentConditions.bzComponent < -10 ? "STORM" : "NOMINAL") : "NO DATA"],
              ["K-Index Boulder", groundRadiationEnv.currentConditions?.kIndexBoulder !== undefined && groundRadiationEnv.currentConditions?.kIndexBoulder !== null ? groundRadiationEnv.currentConditions.kIndexBoulder.toFixed(0) : "—", "", groundRadiationEnv.currentConditions?.kIndexBoulder !== undefined && groundRadiationEnv.currentConditions?.kIndexBoulder !== null ? (groundRadiationEnv.currentConditions.kIndexBoulder >= 5 ? "STORM" : groundRadiationEnv.currentConditions.kIndexBoulder >= 4 ? "ACTIVE" : "QUIET") : "NO DATA"]
            ])}
            <div className="satEarthCondChartDescription">
              {renderDescription("This table shows the main indices of geomagnetic activity. Kp measures global disturbance on a 0 to 9 scale, Dst measures ring current strength with strongly negative values during storms, F10.7 tracks overall solar activity, and Bz shows the north-south direction of the interplanetary magnetic field.")}
            </div>
          </div>
          <div className="satEarthCondPanelDouble satEarthCondChartContainerForecast">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>Geomagnetic Storm Forecast</h4>
              {renderDataTypeBadge("PROBABILISTIC", "small")}
            </div>
            {renderDataTable("Storm Probabilities", ["Type", "Probability", "Risk"], [
              ["Minor Storm (G1-G2)", geomagnticStormForecast.minorStormProb !== null && geomagnticStormForecast.minorStormProb !== undefined ? `${geomagnticStormForecast.minorStormProb}%` : "—", geomagnticStormForecast.minorStormProb !== null && geomagnticStormForecast.minorStormProb !== undefined ? (geomagnticStormForecast.minorStormProb >= 50 ? "HIGH" : geomagnticStormForecast.minorStormProb >= 25 ? "MODERATE" : "LOW") : "NO DATA"],
              ["Major Storm (G3+)", geomagnticStormForecast.majorStormProb !== null && geomagnticStormForecast.majorStormProb !== undefined ? `${geomagnticStormForecast.majorStormProb}%` : "—", geomagnticStormForecast.majorStormProb !== null && geomagnticStormForecast.majorStormProb !== undefined ? (geomagnticStormForecast.majorStormProb >= 30 ? "CRITICAL" : geomagnticStormForecast.majorStormProb >= 10 ? "HIGH" : "LOW") : "NO DATA"],
              ["Radio Blackout (R1-R2)", geomagnticStormForecast.radioBlackoutProbR1R2 !== null && geomagnticStormForecast.radioBlackoutProbR1R2 !== undefined ? `${geomagnticStormForecast.radioBlackoutProbR1R2}%` : "—", geomagnticStormForecast.radioBlackoutProbR1R2 !== null && geomagnticStormForecast.radioBlackoutProbR1R2 !== undefined ? (geomagnticStormForecast.radioBlackoutProbR1R2 >= 50 ? "HIGH" : "LOW") : "NO DATA"],
              ["Radio Blackout (R3+)", geomagnticStormForecast.radioBlackoutProbR3 !== null && geomagnticStormForecast.radioBlackoutProbR3 !== undefined ? `${geomagnticStormForecast.radioBlackoutProbR3}%` : "—", geomagnticStormForecast.radioBlackoutProbR3 !== null && geomagnticStormForecast.radioBlackoutProbR3 !== undefined ? (geomagnticStormForecast.radioBlackoutProbR3 >= 10 ? "CRITICAL" : "LOW") : "NO DATA"]
            ])}
            <div className="satEarthCondChartDescription">
              {renderDescription("This table shows the three-day forecast probabilities for minor and major geomagnetic storms and for radio blackouts at two severity levels. Geomagnetic storms can disrupt GPS, power grids, and satellite operations, while radio blackouts affect high-frequency communications.")}
            </div>
          </div>
        </div>
        {(((((kpChart || kIndexForecast.length > 0)) && kpChart)) || ((((kpChart || kIndexForecast.length > 0)) && (kIndexForecast.length > 0)))) && (
          <div className="satEarthCondOverviewGrid">
            {(((kpChart || kIndexForecast.length > 0)) && kpChart) && (
              <div className="satEarthCondPanelDouble satEarthCondChartContainerForecast">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Kp Index Forecast</h4>
                  {renderDataTypeBadge("FORECAST", "small")}
                </div>
                {renderDynamicChart(kpChart, "satEarthCondChart")}
                <div className="satEarthCondChartDescription">
                  <div className="satEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Forecast Time (Hours Ahead)</span>
                    <span><strong>Y-Axis:</strong> Kp Index (0-9 Scale)</span>
                  </div>
                  {renderDescription("This chart displays the forecasted planetary K-index (Kp) for upcoming hours based on NOAA Space Weather Prediction Center models. The Kp index quantifies geomagnetic disturbance on a 0-9 scale, where values 0-3 indicate quiet conditions, 4 indicates unsettled conditions, and 5+ indicates geomagnetic storm levels. Higher Kp values correlate with increased radiation belt activity, GPS accuracy degradation, and potential impacts to spacecraft attitude control and communications systems.")}
                </div>
                {renderChartStats(kpChart)}
                
              </div>
            )}
            {(((kpChart || kIndexForecast.length > 0)) && (kIndexForecast.length > 0)) && (
              <div className="satEarthCondPanelDouble satEarthCondChartContainerForecast">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Kp Forecast Table</h4>
                  {renderDataTypeBadge("FORECAST", "small")}
                </div>
                {renderDataTable("Kp Forecast", ["Time", "Kp", "Condition"],
                  kIndexForecast.slice(0, 8).map(f => [
                    f?.time || "—",
                    f?.kp !== null && f?.kp !== undefined ? f.kp.toFixed(1) : "—",
                    f?.condition || "—"
                  ])
                )}
                <div className="satEarthCondChartDescription">
                  {renderDescription("This table lists the forecast Kp index for upcoming time periods along with the expected condition. Kp values of 5 or higher correspond to geomagnetic storm conditions and bring auroras to lower latitudes.")}
                </div>
              </div>
            )}
          </div>
        )}
        <div className="satEarthCondOverviewGrid">
          <div className="satEarthCondPanelDouble satEarthCondChartContainerLive">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>CME Status</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderDataTable("Coronal Mass Ejections", ["Parameter", "Value", "Status"], [
              ["Active CMEs", cmeStatus.activeCMEs?.length ?? 0, (cmeStatus.activeCMEs?.length ?? 0) > 0 ? "ACTIVE" : "NONE"],
              ["Arrival Probability", cmeStatus.arrivalProbability !== null && cmeStatus.arrivalProbability !== undefined ? `${cmeStatus.arrivalProbability}%` : "—", cmeStatus.arrivalProbability !== null && cmeStatus.arrivalProbability !== undefined ? (cmeStatus.arrivalProbability >= 60 ? "HIGH" : cmeStatus.arrivalProbability >= 30 ? "MODERATE" : "LOW") : "NO DATA"],
              ["Est. Arrival", cmeStatus.estimatedArrival || "—", cmeStatus.estimatedArrival ? "PREDICTED" : "NONE"],
              ["Active Alerts", cmeStatus.alerts?.length ?? 0, (cmeStatus.alerts?.length ?? 0) > 0 ? "ACTIVE" : "NONE"]
            ])}
            <div className="satEarthCondChartDescription">
              {renderDescription("This table summarizes coronal mass ejections currently being tracked. It shows how many are active, the probability that one reaches Earth, the estimated arrival time, and the number of related alerts. An Earth-directed coronal mass ejection can trigger a geomagnetic storm one to four days after launch.")}
            </div>
          </div>
          {((cmeStatus.activeCMEs?.length > 0)) && (
            <div className="satEarthCondPanelDouble satEarthCondChartContainerLive">
              <div className="satEarthCondChartHeaderWithBadge">
                <h4>Active CME Detections ({cmeStatus.activeCMEs.length})</h4>
                {renderDataTypeBadge("LIVE", "small")}
              </div>
              {renderDataTable("CME Events", ["Detected", "Description"],
                cmeStatus.activeCMEs.slice(0, 10).map(cme => [
                  cme?.detected ? new Date(cme.detected).toLocaleString() : "—",
                  cme?.description || "—"
                ])
              )}
              <div className="satEarthCondChartDescription">
                {renderDescription("This table lists recently detected coronal mass ejections with their detection time and a description of each event. An empty table means no coronal mass ejections have been detected in the recent monitoring window.")}
              </div>
            </div>
          )}
        </div>
        {((cmeStatus.alerts?.length > 0)) && (
          <div className="satEarthCondOverviewGrid">
            {((cmeStatus.alerts?.length > 0)) && (
              <div className="satEarthCondPanelSingle satEarthCondChartContainerLive">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>SWPC Space Weather Alerts ({cmeStatus.alerts.length})</h4>
                  {renderDataTypeBadge("LIVE", "small")}
                </div>
                {renderDataTable("Alerts", ["Type", "Issue Time", "Message"],
                  cmeStatus.alerts.slice(0, 10).map(alert => [
                    alert?.type || "—",
                    alert?.issueTime ? new Date(alert.issueTime).toLocaleString() : "—",
                    alert?.message ? (alert.message.substring(0, 150) + (alert.message.length > 150 ? "..." : "")) : "—"
                  ])
                )}
                <div className="satEarthCondChartDescription">
                  {renderDescription("This table lists the watches, warnings, and alerts recently issued by the NOAA Space Weather Prediction Center. Each entry includes the alert type, issue time, and the message text.")}
                </div>
              </div>
            )}
          </div>
        )}
        {auroraSection}
        <div className="satEarthCondSectionDivider">
          <div className="satEarthCondSectionDividerLine" />
          <span className="satEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faSatellite} />
            Magnetosphere
          </span>
          <div className="satEarthCondSectionDividerLine" />
        </div>
        <div className="satEarthCondOverviewGrid">
          <div className="satEarthCondPanelDouble satEarthCondChartContainerLive">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>Magnetopause Conditions</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderDataTable("Magnetosphere", ["Parameter", "Value", "Unit"], [
              ["Standoff Distance", radiationEnvironment.magnetopause?.standoffDistance !== null && radiationEnvironment.magnetopause?.standoffDistance !== undefined ? radiationEnvironment.magnetopause?.standoffDistance.toFixed(2) : "—", "Re"],
              ["Solar Wind Density", radiationEnvironment.magnetopause?.solarWindDensity !== null && radiationEnvironment.magnetopause?.solarWindDensity !== undefined ? radiationEnvironment.magnetopause?.solarWindDensity.toFixed(1) : "—", "p/cm³"],
              ["Solar Wind Speed", radiationEnvironment.magnetopause?.solarWindSpeed !== null && radiationEnvironment.magnetopause?.solarWindSpeed !== undefined ? radiationEnvironment.magnetopause?.solarWindSpeed.toFixed(0) : "—", "km/s"],
              ["Dynamic Pressure", radiationEnvironment.magnetopause?.dynamicPressure !== null && radiationEnvironment.magnetopause?.dynamicPressure !== undefined ? radiationEnvironment.magnetopause?.dynamicPressure.toFixed(4) : "—", "nPa"]
            ])}
            <div className="satEarthCondChartDescription">
              {renderDescription("This table shows the current position of the magnetopause, the outer boundary of Earth's magnetic field, along with the solar wind density, speed, and dynamic pressure pushing against it. Higher solar wind pressure compresses the magnetosphere closer to Earth.")}
            </div>
          </div>
          <div className="satEarthCondPanelDouble satEarthCondChartContainerLive">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>Magnetopause Standoff</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderGauge({ value: radiationEnvironment.magnetopause?.standoffDistance, display: radiationEnvironment.magnetopause?.standoffDistance !== null && radiationEnvironment.magnetopause?.standoffDistance !== undefined ? `${radiationEnvironment.magnetopause?.standoffDistance.toFixed(1)} Re` : "—", label: "Magnetopause Standoff Distance", unit: " Re", min: 5, max: 14, zones: [{ to: 8, label: "Compressed", color: "#ff6b6b" }, { to: 10, label: "Reduced", color: "#FF9500" }, { to: 14, label: "Nominal", color: "#4ecdc4" }] })}
            <div className="satEarthCondChartDescription">
              {renderDescription("This gauge shows how far the magnetopause sits from Earth in Earth radii. It normally sits about 10 Earth radii away, and values below 8 indicate strong compression. In extreme compression, satellites in geostationary orbit can be exposed directly to the solar wind.")}
            </div>
          </div>
        </div>
        <div className="satEarthCondSectionDivider">
          <div className="satEarthCondSectionDividerLine" />
          <span className="satEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faSatellite} />
            Particle Radiation
          </span>
          <div className="satEarthCondSectionDividerLine" />
        </div>
        <div className="satEarthCondOverviewGrid">
          <div className="satEarthCondPanelTriple satEarthCondChartContainerLive">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>Radiation Levels</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderDataTable("Particle Flux", ["Parameter", "Value", "Unit", "Status"], [
              ["Proton ≥10 MeV", groundRadiationEnv.currentConditions?.proton10MeV !== undefined && groundRadiationEnv.currentConditions?.proton10MeV !== null ? groundRadiationEnv.currentConditions.proton10MeV.toFixed(2) : "—", "pfu", groundRadiationEnv.currentConditions?.proton10MeV !== undefined && groundRadiationEnv.currentConditions?.proton10MeV !== null ? (groundRadiationEnv.currentConditions.proton10MeV > 10 ? "WARNING" : "NOMINAL") : "NO DATA"],
              ["Proton ≥50 MeV", groundRadiationEnv.currentConditions?.proton50MeV !== undefined && groundRadiationEnv.currentConditions?.proton50MeV !== null ? groundRadiationEnv.currentConditions.proton50MeV.toFixed(2) : "—", "pfu", groundRadiationEnv.currentConditions?.proton50MeV !== undefined && groundRadiationEnv.currentConditions?.proton50MeV !== null ? (groundRadiationEnv.currentConditions.proton50MeV > 5 ? "WARNING" : "NOMINAL") : "NO DATA"],
              ["Proton ≥100 MeV", groundRadiationEnv.currentConditions?.proton100MeV !== undefined && groundRadiationEnv.currentConditions?.proton100MeV !== null ? groundRadiationEnv.currentConditions.proton100MeV.toFixed(2) : "—", "pfu", groundRadiationEnv.currentConditions?.proton100MeV !== undefined && groundRadiationEnv.currentConditions?.proton100MeV !== null ? (groundRadiationEnv.currentConditions.proton100MeV > 1 ? "WARNING" : "NOMINAL") : "NO DATA"],
              ["Electron ≥2 MeV", groundRadiationEnv.currentConditions?.electron2MeV !== undefined && groundRadiationEnv.currentConditions?.electron2MeV !== null ? groundRadiationEnv.currentConditions.electron2MeV.toFixed(0) : "—", "pfu", groundRadiationEnv.currentConditions?.electron2MeV !== undefined && groundRadiationEnv.currentConditions?.electron2MeV !== null ? (groundRadiationEnv.currentConditions.electron2MeV > 10000 ? "WARNING" : "NOMINAL") : "NO DATA"]
            ])}
            <div className="satEarthCondChartDescription">
              {renderDescription("This table shows the current flux of energetic protons at three energy thresholds and of energetic electrons measured by GOES satellites. Elevated proton flux indicates a solar radiation storm, while elevated electron flux raises the risk of charging damage to satellites.")}
            </div>
          </div>
          <div className="satEarthCondPanelTriple satEarthCondChartContainerLive">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>Neutron Monitor</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderDataTable("Cosmic Ray Analysis", ["Parameter", "Value", "Status"], [
              ["Station", cosmicRayAnalysis.stationName ? `${cosmicRayAnalysis.stationName} (${cosmicRayAnalysis.cutoffRigidity} GV)` : cosmicRayAnalysis.station || "—", cosmicRayAnalysis.status === "AVAILABLE" ? "ACTIVE" : "UNAVAILABLE"],
              ["Neutron Counts", cosmicRayAnalysis.neutronCounts !== null && cosmicRayAnalysis.neutronCounts !== undefined ? cosmicRayAnalysis.neutronCounts.toFixed(0) + " /min" : "—", cosmicRayAnalysis.status === "AVAILABLE" ? "OK" : "NO DATA"],
              ["Deviation", cosmicRayAnalysis.percentDeviation !== null && cosmicRayAnalysis.percentDeviation !== undefined ? (cosmicRayAnalysis.percentDeviation > 0 ? "+" : "") + cosmicRayAnalysis.percentDeviation.toFixed(2) + "%" : "—", cosmicRayAnalysis.percentDeviation !== null && cosmicRayAnalysis.percentDeviation !== undefined ? (Math.abs(cosmicRayAnalysis.percentDeviation) > 3 ? "ADVISORY" : "NOMINAL") : "NO DATA"],
              ["Data Status", cosmicRayAnalysis.status || "NO_DATA", cosmicRayAnalysis.status === "AVAILABLE" ? "OK" : "DEGRADED"]
            ])}
            <div className="satEarthCondChartDescription">
              {renderDescription("This table shows the current reading from a ground-based neutron monitor, which counts particles produced when cosmic rays strike the atmosphere. It includes the station, the count rate, and its deviation from normal. Sudden drops often follow the arrival of a coronal mass ejection.")}
            </div>
          </div>
          {((cosmicRayAnalysis.status === "AVAILABLE" && cosmicRayAnalysis.percentDeviation !== null && cosmicRayAnalysis.percentDeviation !== undefined)) && (
            <div className="satEarthCondPanelTriple satEarthCondChartContainerComputed">
              <div className="satEarthCondChartHeaderWithBadge">
                <h4>Cosmic Ray Flux Gauge</h4>
                {renderDataTypeBadge("COMPUTED", "small")}
              </div>
              {renderGauge({ value: cosmicRayAnalysis.percentDeviation, display: `${cosmicRayAnalysis.percentDeviation > 0 ? "+" : ""}${cosmicRayAnalysis.percentDeviation.toFixed(2)}%`, label: `Intra-Hour Deviation (${cosmicRayAnalysis.station})`, unit: "%", min: -10, max: 10, zones: [{ to: -3, label: "Decrease", color: "#FF9500" }, { to: 3, label: "Normal", color: "#4ecdc4" }, { to: 10, label: "Increase", color: "#FF9500" }] })}
              <div className="satEarthCondChartDescription">
                {renderDescription("This gauge shows how much the neutron monitor count rate has changed within the last hour. Small variations are normal, while sharp decreases can signal a Forbush decrease caused by a passing coronal mass ejection and sharp increases can signal a ground level enhancement from a strong solar particle event.")}
              </div>
            </div>
          )}
        </div>
        <div className="satEarthCondSectionDivider">
          <div className="satEarthCondSectionDividerLine" />
          <span className="satEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faBroadcastTower} />
            Radio & GPS Impacts
          </span>
          <div className="satEarthCondSectionDividerLine" />
        </div>
        <div className="satEarthCondOverviewGrid">
          <div className="satEarthCondPanelDouble satEarthCondChartContainerComputed">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>Signal Integrity</h4>
              {renderDataTypeBadge("COMPUTED", "small")}
            </div>
            {renderDataTable("RF", ["Parameter", "Value", "Unit", "Status"], [
              ["GPS Accuracy", signalIntegrity.gpsAccuracy !== null && signalIntegrity.gpsAccuracy !== undefined ? signalIntegrity.gpsAccuracy.toFixed(2) : "—", "m", getSignalStatus(signalIntegrity.gpsAccuracy, signalIntegrity.dataAvailable)],
              ["Radio Link Quality", signalIntegrity.radioLinkQuality !== null && signalIntegrity.radioLinkQuality !== undefined ? signalIntegrity.radioLinkQuality.toFixed(1) : "—", "%", getSignalStatus(signalIntegrity.radioLinkQuality, signalIntegrity.dataAvailable)],
              ["TEC", signalIntegrity.tec !== null && signalIntegrity.tec !== undefined ? signalIntegrity.tec.toFixed(1) : "—", "TECU", getSignalStatus(signalIntegrity.tec, signalIntegrity.dataAvailable)],
              ["Scintillation (S4)", signalIntegrity.scintillation !== null && signalIntegrity.scintillation !== undefined ? signalIntegrity.scintillation.toFixed(2) : "—", "S4", getSignalStatus(signalIntegrity.scintillation, signalIntegrity.dataAvailable)]
            ])}
            <div className="satEarthCondChartDescription">
              {renderDescription("This table estimates how space weather is affecting radio and satellite navigation signals. It shows expected GPS position accuracy, overall radio link quality, total electron content in the ionosphere, and the S4 scintillation index. High scintillation causes signal fading and loss of GPS lock.")}
            </div>
          </div>
          <div className="satEarthCondPanelDouble satEarthCondChartContainerLive">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>Band Spectrum</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            <div className="satEarthCondSpectrumGrid">
              {["hf", "lBand", "sBand"].map(band => {
                const status = data.spectrumTrafficLight?.[band] || "UNKNOWN";
                const color = status === "GREEN" ? "#4ecdc4" : status === "YELLOW" ? "#FF9500" : status === "RED" ? "#ff6b6b" : "#919baf";
                return (
                  <div key={band} className="satEarthCondSpectrumBand" style={{ borderColor: color }}>
                    <div className="satEarthCondSpectrumIndicator" style={{ backgroundColor: color }} />
                    <span className="satEarthCondSpectrumLabel">{band === "hf" ? "HF" : band === "lBand" ? "L-Band" : "S-Band"}</span>
                  </div>
                );
              })}
            </div>
            <div className="satEarthCondChartDescription">
              {renderDescription("This panel rates current conditions for three radio frequency bands. HF is used for long-distance communication, L-band carries GPS and satellite phone signals, and S-band carries many satellite data links. Each band is colored by how much space weather is expected to degrade it.")}
            </div>
          </div>
        </div>
        <div className="satEarthCondSectionDivider">
          <div className="satEarthCondSectionDividerLine" />
          <span className="satEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faSatellite} />
            Orbital Environment
          </span>
          <div className="satEarthCondSectionDividerLine" />
        </div>

        <div className="satEarthCondOverviewGrid">
          <div className="satEarthCondPanelTriple satEarthCondChartContainerLive">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>Space Catalog Summary</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderDataTable("Tracked Objects", ["Parameter", "Value", "Status"], [
              ["Total Tracked Objects", trackedObjects !== null && trackedObjects !== undefined ? trackedObjects : "—", trackedObjects !== null && trackedObjects !== undefined ? "OK" : "NO DATA"],
              ["Active Satellites", catalogData?.activeSatellites?.totalCount ?? "—", catalogData?.activeSatellites ? "OK" : "NO DATA"],
              ["Space Stations & Crewed Vehicles", catalogData?.spaceStations?.totalCount ?? "—", catalogData?.spaceStations ? "OK" : "NO DATA"]
            ])}
            <div className="satEarthCondChartDescription">
              {renderDescription("This table summarizes the satellite catalog used for orbital tracking. It shows the total number of tracked objects, how many are active satellites, and how many are space stations or crewed vehicles.")}
            </div>
          </div>
          <div className="satEarthCondPanelTriple satEarthCondChartContainerComputed">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>Overhead Coverage</h4>
              {renderDataTypeBadge("COMPUTED", "small")}
            </div>
            {renderDataTable("Orbits Reaching This Latitude", ["Parameter", "Value", "Unit"], [
              ["Observer Latitude", overheadAnalysis?.observerLatitude !== null && overheadAnalysis?.observerLatitude !== undefined ? overheadAnalysis.observerLatitude.toFixed(2) : "—", "deg"],
              ["Satellites Reaching Latitude", overheadAnalysis?.satellitesReachingLatitude ?? "—", ""],
              ["Stations Reaching Latitude", overheadAnalysis?.stationsReachingLatitude ?? "—", ""]
            ])}
            <div className="satEarthCondChartDescription">
              {renderDescription("This table shows how many satellites and space stations follow orbits that can pass over the selected latitude. A satellite can only pass overhead if its orbital inclination is at least as large as the observer's latitude, so higher latitudes are reached by fewer satellites.")}
            </div>
          </div>
          {(((catalogData?.activeSatellites?.altitudeDistribution || overheadAnalysis?.stations?.length > 0)) && catalogData?.activeSatellites?.altitudeDistribution) && (
            <div className="satEarthCondPanelTriple satEarthCondChartContainerLive">
              <div className="satEarthCondChartHeaderWithBadge">
                <h4>Altitude Regime Distribution</h4>
                {renderDataTypeBadge("LIVE", "small")}
              </div>
              {renderDataTable("Objects by Altitude", ["Regime", "Count", "Description"], [
                ["LEO (< 2000 km)", catalogData.activeSatellites.altitudeDistribution.leo ?? 0, "Low Earth Orbit"],
                ["MEO (2000-35000 km)", catalogData.activeSatellites.altitudeDistribution.meo ?? 0, "Medium Earth Orbit"],
                ["GEO (~36000 km)", catalogData.activeSatellites.altitudeDistribution.geo ?? 0, "Geostationary"],
                ["HEO (> 36000 km)", catalogData.activeSatellites.altitudeDistribution.heo ?? 0, "High Earth Orbit"]
              ])}
              <div className="satEarthCondChartDescription">
                {renderDescription("This table groups tracked satellites by orbital altitude. Low Earth orbit holds most satellites and the space stations, medium Earth orbit holds navigation constellations such as GPS, and geostationary orbit holds communication and weather satellites that stay fixed over one point on the equator.")}
              </div>
            </div>
          )}
        </div>
        {(((catalogData?.activeSatellites?.altitudeDistribution || overheadAnalysis?.stations?.length > 0)) && (overheadAnalysis?.stations?.length > 0)) && (
          <div className="satEarthCondOverviewGrid">
            {(((catalogData?.activeSatellites?.altitudeDistribution || overheadAnalysis?.stations?.length > 0)) && (overheadAnalysis?.stations?.length > 0)) && (
              <div className="satEarthCondPanelSingle satEarthCondChartContainerLive">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Tracked Space Stations & Crewed Vehicles ({overheadAnalysis.stations.length})</h4>
                  {renderDataTypeBadge("LIVE", "small")}
                </div>
                {renderDataTable("Crewed Assets", ["Name", "NORAD ID", "Inclination (deg)", "Altitude (km)", "Reaches Latitude"],
                  overheadAnalysis.stations.slice(0, 15).map(s => [
                    s?.name || "—",
                    s?.noradId || "—",
                    s?.inclination !== null && s?.inclination !== undefined ? s.inclination.toFixed(2) : "—",
                    s?.altitude !== null && s?.altitude !== undefined ? s.altitude.toFixed(0) : "—",
                    s?.reachesLatitude ? "YES" : "NO"
                  ])
                )}
                <div className="satEarthCondChartDescription">
                  {renderDescription("This table lists space stations and crewed vehicles with their catalog number, inclination, and average altitude. The final column shows whether each one's orbit can pass over the selected latitude.")}
                </div>
              </div>
            )}
          </div>
        )}
        <div className="satEarthCondSectionDivider">
          <div className="satEarthCondSectionDividerLine" />
          <span className="satEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faHistory} />
            Geomagnetic & Solar Wind History (7-Day)
          </span>
          <div className="satEarthCondSectionDividerLine" />
        </div>
                {spaceWeatherKpChart && (
          <div className="satEarthCondOverviewGrid">
            {spaceWeatherKpChart && (
              <div className="satEarthCondPanelSingle satEarthCondChartContainerHistorical">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Kp Index History</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(spaceWeatherKpChart, "satEarthCondChart")}
                <div className="satEarthCondChartDescription">
                  <div className="satEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (7-Day Observation Period)</span>
                    <span><strong>Y-Axis:</strong> Kp Index (0-9 Scale)</span>
                  </div>
                  {renderDescription("This chart displays historical Kp index measurements over the past 7 days. The Kp index is a global geomagnetic activity indicator derived from ground-based magnetometer networks worldwide. Tracking Kp history helps identify geomagnetic storm patterns, assess the persistence of disturbed conditions, and correlate space weather events with observed effects on spacecraft systems. Sustained elevated Kp values indicate prolonged periods of enhanced radiation belt activity and increased risk to sensitive electronics.")}
                </div>
                {renderChartStats(spaceWeatherKpChart)}
                
              </div>
            )}
          </div>
        )}
        {(((((geomagChart || solarWindChart)) && geomagChart)) || ((((geomagChart || solarWindChart)) && solarWindChart))) && (
          <div className="satEarthCondOverviewGrid">
            {(((geomagChart || solarWindChart)) && geomagChart) && (
              <div className="satEarthCondPanelDouble satEarthCondChartContainerHistorical">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Geomagnetic Bz (7-day)</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(geomagChart, "satEarthCondChart")}
                <div className="satEarthCondChartDescription">
                  <div className="satEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (7-Day Observation Period)</span>
                    <span><strong>Y-Axis:</strong> Interplanetary Magnetic Field Bz Component (nT)</span>
                  </div>
                  {renderDescription("This chart shows the north-south component (Bz) of the interplanetary magnetic field over the past 7 days. When Bz turns strongly southward (negative values), it allows solar wind energy to couple efficiently into Earth's magnetosphere, triggering geomagnetic storms. Sustained Bz values below -10 nT typically result in significant geomagnetic activity that can affect spacecraft attitude control systems, increase atmospheric drag on low-Earth orbit satellites, and cause GPS positioning errors. This parameter is a key predictor of impending geomagnetic disturbances.")}
                </div>
                {renderChartStats(geomagChart)}
              </div>
            )}
            {(((geomagChart || solarWindChart)) && solarWindChart) && (
              <div className="satEarthCondPanelDouble satEarthCondChartContainerHistorical">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Solar Wind Speed (7-day)</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(solarWindChart, "satEarthCondChart")}
                <div className="satEarthCondChartDescription">
                  <div className="satEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (7-Day Observation Period)</span>
                    <span><strong>Y-Axis:</strong> Solar Wind Speed (km/s)</span>
                  </div>
                  {renderDescription("This chart displays solar wind velocity measurements over the past 7 days from upstream solar wind monitors. Normal solar wind speeds range from 300-500 km/s, while high-speed streams from coronal holes can exceed 700 km/s. Elevated solar wind speeds increase the dynamic pressure on Earth's magnetosphere, compressing it and enhancing geomagnetic activity. Combined with a southward Bz component, high solar wind speeds significantly increase the probability of geomagnetic storms that can affect spacecraft operations and ground-based systems.")}
                </div>
                {renderChartStats(solarWindChart)}
              </div>
            )}
          </div>
        )}
        <div className="satEarthCondSectionDivider">
          <div className="satEarthCondSectionDividerLine" />
          <span className="satEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faSatellite} />
            Particle Radiation History (7-Day)
          </span>
          <div className="satEarthCondSectionDividerLine" />
        </div>
        <div className="satEarthCondOverviewGrid">
          <div className="satEarthCondPanelSingle satEarthCondChartContainerHistorical">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>Radiation History Summary</h4>
              {renderDataTypeBadge("HISTORICAL", "small")}
            </div>
            <div className="satEarthCondRadiationSummaryGrid">
              <div className="satEarthCondRadiationGroup">
                <div className="satEarthCondRadiationGroupHeader">Protons (GOES Primary)</div>
                <div className="satEarthCondRadiationGroupStats">
                  <div className="satEarthCondRadiationStat">
                    <span className="satEarthCondRadiationLabel">≥10 MeV</span>
                    <span className="satEarthCondRadiationValue">{historicalRad?.statistics?.proton10MeV?.dataPoints ?? 0} Points</span>
                    {historicalRad?.statistics?.proton10MeV && (
                      <span className="satEarthCondRadiationRange">{historicalRad.statistics.proton10MeV.min !== null && historicalRad.statistics.proton10MeV.min !== undefined ? historicalRad.statistics.proton10MeV.min.toFixed(2) : "—"} - {historicalRad.statistics.proton10MeV.max !== null && historicalRad.statistics.proton10MeV.max !== undefined ? historicalRad.statistics.proton10MeV.max.toFixed(2) : "—"} pfu</span>
                    )}
                  </div>
                  <div className="satEarthCondRadiationStat">
                    <span className="satEarthCondRadiationLabel">≥50 MeV</span>
                    <span className="satEarthCondRadiationValue">{historicalRad?.statistics?.proton50MeV?.dataPoints ?? 0} Points</span>
                    {historicalRad?.statistics?.proton50MeV && (
                      <span className="satEarthCondRadiationRange">{historicalRad.statistics.proton50MeV.min !== null && historicalRad.statistics.proton50MeV.min !== undefined ? historicalRad.statistics.proton50MeV.min.toFixed(2) : "—"} - {historicalRad.statistics.proton50MeV.max !== null && historicalRad.statistics.proton50MeV.max !== undefined ? historicalRad.statistics.proton50MeV.max.toFixed(2) : "—"} pfu</span>
                    )}
                  </div>
                  <div className="satEarthCondRadiationStat">
                    <span className="satEarthCondRadiationLabel">≥100 MeV</span>
                    <span className="satEarthCondRadiationValue">{historicalRad?.statistics?.proton100MeV?.dataPoints ?? 0} Points</span>
                    {historicalRad?.statistics?.proton100MeV && (
                      <span className="satEarthCondRadiationRange">{historicalRad.statistics.proton100MeV.min !== null && historicalRad.statistics.proton100MeV.min !== undefined ? historicalRad.statistics.proton100MeV.min.toFixed(2) : "—"} - {historicalRad.statistics.proton100MeV.max !== null && historicalRad.statistics.proton100MeV.max !== undefined ? historicalRad.statistics.proton100MeV.max.toFixed(2) : "—"} pfu</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="satEarthCondRadiationGroup">
                <div className="satEarthCondRadiationGroupHeader">Electrons (GOES Primary)</div>
                <div className="satEarthCondRadiationGroupStats">
                  <div className="satEarthCondRadiationStat">
                    <span className="satEarthCondRadiationLabel">≥2 MeV (Integral)</span>
                    <span className="satEarthCondRadiationValue">{historicalRad?.statistics?.electron2MeV?.dataPoints ?? 0} Points</span>
                    {historicalRad?.statistics?.electron2MeV && (
                      <span className="satEarthCondRadiationRange">{historicalRad.statistics.electron2MeV.min !== null && historicalRad.statistics.electron2MeV.min !== undefined ? historicalRad.statistics.electron2MeV.min.toFixed(0) : "—"} - {historicalRad.statistics.electron2MeV.max !== null && historicalRad.statistics.electron2MeV.max !== undefined ? historicalRad.statistics.electron2MeV.max.toFixed(0) : "—"} pfu</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="satEarthCondRadiationGroup">
                <div className="satEarthCondRadiationGroupHeader">Neutrons (NMDB Cosmic Ray Monitors)</div>
                <div className="satEarthCondRadiationGroupStats">
                  <div className="satEarthCondRadiationStat">
                    <span className="satEarthCondRadiationLabel">OULU (0.8 GV)</span>
                    <span className="satEarthCondRadiationValue">{historicalRad?.statistics?.neutronOulu?.dataPoints ?? 0} Points</span>
                    {historicalRad?.statistics?.neutronOulu && (
                      <span className="satEarthCondRadiationRange">{historicalRad.statistics.neutronOulu.min !== null && historicalRad.statistics.neutronOulu.min !== undefined ? historicalRad.statistics.neutronOulu.min.toFixed(1) : "—"} - {historicalRad.statistics.neutronOulu.max !== null && historicalRad.statistics.neutronOulu.max !== undefined ? historicalRad.statistics.neutronOulu.max.toFixed(1) : "—"}%</span>
                    )}
                  </div>
                  <div className="satEarthCondRadiationStat">
                    <span className="satEarthCondRadiationLabel">Local: {primaryStation.name} ({primaryStation.cutoff} GV)</span>
                    <span className="satEarthCondRadiationValue">{historicalRad?.statistics?.neutronJung?.dataPoints ?? 0} Points</span>
                    {historicalRad?.statistics?.neutronJung && (
                      <span className="satEarthCondRadiationRange">{historicalRad.statistics.neutronJung.min !== null && historicalRad.statistics.neutronJung.min !== undefined ? historicalRad.statistics.neutronJung.min.toFixed(1) : "—"} - {historicalRad.statistics.neutronJung.max !== null && historicalRad.statistics.neutronJung.max !== undefined ? historicalRad.statistics.neutronJung.max.toFixed(1) : "—"}%</span>
                    )}
                  </div>
                  <div className="satEarthCondRadiationStat">
                    <span className="satEarthCondRadiationLabel">Polar Reference: {secondaryStation.name} ({secondaryStation.cutoff} GV)</span>
                    <span className="satEarthCondRadiationValue">{historicalRad?.statistics?.neutronNewk?.dataPoints ?? 0} Points</span>
                    {historicalRad?.statistics?.neutronNewk && (
                      <span className="satEarthCondRadiationRange">{historicalRad.statistics.neutronNewk.min !== null && historicalRad.statistics.neutronNewk.min !== undefined ? historicalRad.statistics.neutronNewk.min.toFixed(1) : "—"} - {historicalRad.statistics.neutronNewk.max !== null && historicalRad.statistics.neutronNewk.max !== undefined ? historicalRad.statistics.neutronNewk.max.toFixed(1) : "—"}%</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="satEarthCondRadiationGroup">
                <div className="satEarthCondRadiationGroupHeader">X-ray Flux (GOES)</div>
                <div className="satEarthCondRadiationGroupStats">
                  <div className="satEarthCondRadiationStat">
                    <span className="satEarthCondRadiationLabel">Short (0.05-0.4nm)</span>
                    <span className="satEarthCondRadiationValue">{historicalRad?.statistics?.xrayShort?.dataPoints ?? 0} Points</span>
                    {historicalRad?.statistics?.xrayShort && (
                      <span className="satEarthCondRadiationRange">{historicalRad.statistics.xrayShort.min !== null && historicalRad.statistics.xrayShort.min !== undefined ? historicalRad.statistics.xrayShort.min.toExponential(1) : "—"} - {historicalRad.statistics.xrayShort.max !== null && historicalRad.statistics.xrayShort.max !== undefined ? historicalRad.statistics.xrayShort.max.toExponential(1) : "—"} W/m²</span>
                    )}
                  </div>
                  <div className="satEarthCondRadiationStat">
                    <span className="satEarthCondRadiationLabel">Long (0.1-0.8nm)</span>
                    <span className="satEarthCondRadiationValue">{historicalRad?.statistics?.xrayLong?.dataPoints ?? 0} Points</span>
                    {historicalRad?.statistics?.xrayLong && (
                      <>
                        <span className="satEarthCondRadiationRange">{historicalRad.statistics.xrayLong.min !== null && historicalRad.statistics.xrayLong.min !== undefined ? historicalRad.statistics.xrayLong.min.toExponential(1) : "—"} - {historicalRad.statistics.xrayLong.max !== null && historicalRad.statistics.xrayLong.max !== undefined ? historicalRad.statistics.xrayLong.max.toExponential(1) : "—"} W/m²</span>
                        {(historicalRad.statistics.xrayLong.mClassEvents ?? 0) > 0 && (
                          <span className="satEarthCondRadiationRange">M-Class Events: {historicalRad.statistics.xrayLong.mClassEvents}</span>
                        )}
                        {(historicalRad.statistics.xrayLong.xClassEvents ?? 0) > 0 && (
                          <span className="satEarthCondRadiationRange">X-Class Events: {historicalRad.statistics.xrayLong.xClassEvents}</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="satEarthCondChartDescription">
              {renderDescription("This panel summarizes the last seven days of particle radiation data shown in the charts below. For each proton, electron, neutron, and X-ray measurement it shows how many data points were collected and the range between the lowest and highest values.")}
            </div>
          </div>
        </div>
        {(((((proton10Chart || proton50Chart)) && proton10Chart)) || ((((proton10Chart || proton50Chart)) && proton50Chart))) && (
          <div className="satEarthCondOverviewGrid">
            {(((proton10Chart || proton50Chart)) && proton10Chart) && (
              <div className="satEarthCondPanelDouble satEarthCondChartContainerHistorical">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Proton ≥10 MeV History</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(proton10Chart, "satEarthCondChart")}
                <div className="satEarthCondChartDescription">
                  <div className="satEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (7-Day Observation Period)</span>
                    <span><strong>Y-Axis:</strong> Proton Flux ≥10 MeV (pfu)</span>
                  </div>
                  {renderDescription("This chart displays the flux of solar energetic protons with energies ≥10 MeV measured by GOES satellites over the past 7 days. This energy threshold is commonly used for solar proton event (SPE) detection. Flux values exceeding 10 pfu indicate an S1 (Minor) radiation storm, with higher levels triggering more severe classifications. These protons can cause single-event upsets in spacecraft electronics, degrade solar panel performance, and pose radiation hazards during EVA operations.")}
                </div>
                {renderChartStats(proton10Chart)}
                
              </div>
            )}
            {(((proton10Chart || proton50Chart)) && proton50Chart) && (
              <div className="satEarthCondPanelDouble satEarthCondChartContainerHistorical">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Proton ≥50 MeV History</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(proton50Chart, "satEarthCondChart")}
                <div className="satEarthCondChartDescription">
                  <div className="satEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (7-Day Observation Period)</span>
                    <span><strong>Y-Axis:</strong> Proton Flux ≥50 MeV (pfu)</span>
                  </div>
                  {renderDescription("This chart shows the flux of higher-energy solar protons (≥50 MeV) over the past 7 days. These more energetic protons have greater penetrating power, affecting satellite electronics behind shielding and contributing to radiation dose at aviation altitudes during strong events. The most intense events can even produce ground-level enhancements detectable by neutron monitors at the surface.")}
                </div>
                {renderChartStats(proton50Chart)}
                
              </div>
            )}
          </div>
        )}
        {(((((proton100Chart || electron2Chart)) && proton100Chart)) || ((((proton100Chart || electron2Chart)) && electron2Chart))) && (
          <div className="satEarthCondOverviewGrid">
            {(((proton100Chart || electron2Chart)) && proton100Chart) && (
              <div className="satEarthCondPanelDouble satEarthCondChartContainerHistorical">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Proton ≥100 MeV History</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(proton100Chart, "satEarthCondChart")}
                <div className="satEarthCondChartDescription">
                  <div className="satEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (7-Day Observation Period)</span>
                    <span><strong>Y-Axis:</strong> Proton Flux ≥100 MeV (pfu)</span>
                  </div>
                  {renderDescription("This chart displays the flux of very high-energy protons (≥100 MeV) over the past 7 days. These extremely energetic particles can penetrate substantial shielding and pose the greatest radiation threat to astronauts and sensitive electronics. Ground-level enhancement (GLE) events, where solar protons are detected by surface neutron monitors, require ≥100 MeV protons. Elevated flux at this energy indicates the most severe solar particle events.")}
                </div>
                {renderChartStats(proton100Chart)}
                
              </div>
            )}
            {(((proton100Chart || electron2Chart)) && electron2Chart) && (
              <div className="satEarthCondPanelDouble satEarthCondChartContainerHistorical">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Electron ≥2 MeV History (Integral)</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(electron2Chart, "satEarthCondChart")}
                <div className="satEarthCondChartDescription">
                  <div className="satEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (7-Day Observation Period)</span>
                    <span><strong>Y-Axis:</strong> Electron Flux ≥2 MeV (pfu)</span>
                  </div>
                  {renderDescription("This chart shows relativistic electron flux (≥2 MeV) measured by GOES satellites over the past 7 days. High-energy electrons in the outer radiation belt can cause deep dielectric charging in spacecraft, where charge accumulates in insulating materials and discharges destructively. Flux levels above 1000 pfu indicate enhanced electron belt conditions, while sustained levels above 10000 pfu present significant risk of electrostatic discharge damage to spacecraft components.")}
                </div>
                {renderChartStats(electron2Chart)}
                
              </div>
            )}
          </div>
        )}
        {(((((neutronJungChart || neutronNewkChart)) && neutronJungChart)) || ((((neutronJungChart || neutronNewkChart)) && neutronNewkChart))) && (
          <div className="satEarthCondOverviewGrid">
            {(((neutronJungChart || neutronNewkChart)) && neutronJungChart) && (
              <div className="satEarthCondPanelDouble satEarthCondChartContainerHistorical">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Local Neutron Monitor: {primaryStation.name} ({primaryStation.cutoff} GV)</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(neutronJungChart, "satEarthCondChart")}
                <div className="satEarthCondChartDescription">
                  <div className="satEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (7-Day Observation Period)</span>
                    <span><strong>Y-Axis:</strong> Neutron Count Rate (% Deviation from Baseline)</span>
                  </div>
                  {renderDescription(`This chart shows the last 7 days from the ${primaryStation.name} (${primaryStation.code}) neutron monitor, which was chosen automatically from the stations currently reporting to the Neutron Monitor Database because its geomagnetic cutoff rigidity of ${primaryStation.cutoff} GV is closest to the estimated ${locationCutoff ?? "—"} GV cutoff at the selected location. Cosmic rays at that cutoff are the ones that reach this location, so this station best represents local ground-level radiation. A sudden drop of several percent marks a Forbush decrease caused by a passing coronal mass ejection.`)}
                </div>
                {renderChartStats(neutronJungChart)}
                
              </div>
            )}
            {(((neutronJungChart || neutronNewkChart)) && neutronNewkChart) && (
              <div className="satEarthCondPanelDouble satEarthCondChartContainerHistorical">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Polar Reference: {secondaryStation.name} ({secondaryStation.cutoff} GV)</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(neutronNewkChart, "satEarthCondChart")}
                <div className="satEarthCondChartDescription">
                  <div className="satEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (7-Day Observation Period)</span>
                    <span><strong>Y-Axis:</strong> Neutron Count Rate (% Deviation from Baseline)</span>
                  </div>
                  {renderDescription(`This chart shows the last 7 days from the ${secondaryStation.name} (${secondaryStation.code}) neutron monitor, the best-covered polar station currently reporting, with a cutoff rigidity of ${secondaryStation.cutoff} GV. Its low cutoff lets it see the broadest range of cosmic-ray energies, so it serves as a reference for comparing changes at the local station.`)}
                </div>
                {renderChartStats(neutronNewkChart)}
                
              </div>
            )}
          </div>
        )}
        {(((((xrayShortChart || xrayLongChart)) && xrayShortChart)) || ((((xrayShortChart || xrayLongChart)) && xrayLongChart))) && (
          <div className="satEarthCondOverviewGrid">
            {(((xrayShortChart || xrayLongChart)) && xrayShortChart) && (
              <div className="satEarthCondPanelDouble satEarthCondChartContainerHistorical">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>X-ray Short (0.05-0.4nm) History</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(xrayShortChart, "satEarthCondChart")}
                <div className="satEarthCondChartDescription">
                  <div className="satEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (7-Day Observation Period)</span>
                    <span><strong>Y-Axis:</strong> X-ray Flux 0.05-0.4nm (W/m²)</span>
                  </div>
                  {renderDescription("This chart displays solar X-ray flux in the short wavelength band (0.05-0.4nm) over the past 7 days. This harder X-ray channel responds to the hottest coronal plasma during solar flares and provides information about the impulsive phase of flare events. The ratio between short and long wavelength X-ray channels helps characterize flare temperature and intensity. Elevated short-wavelength flux indicates significant solar activity with potential for associated particle events.")}
                </div>
                {renderChartStats(xrayShortChart)}
                
              </div>
            )}
            {(((xrayShortChart || xrayLongChart)) && xrayLongChart) && (
              <div className="satEarthCondPanelDouble satEarthCondChartContainerHistorical">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>X-ray Long (0.1-0.8nm) History</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(xrayLongChart, "satEarthCondChart")}
                <div className="satEarthCondChartDescription">
                  <div className="satEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (7-Day Observation Period)</span>
                    <span><strong>Y-Axis:</strong> X-ray Flux 0.1-0.8nm (W/m²)</span>
                  </div>
                  {renderDescription("This chart shows solar X-ray flux in the long wavelength band (0.1-0.8nm) over the past 7 days. This channel is used for the standard solar flare classification system: A, B, C, M, and X classes based on peak flux levels. M-class flares (≥10⁻⁵ W/m²) can cause brief HF radio blackouts, while X-class flares (≥10⁻⁴ W/m²) may cause significant ionospheric disturbances affecting GPS and communications. Flare events are identified as spikes in this time series.")}
                </div>
                {renderChartStats(xrayLongChart)}
                
              </div>
            )}
          </div>
        )}
        {(diffElectronChart && diffElectronChart) && (
          <div className="satEarthCondOverviewGrid">
            {(diffElectronChart && diffElectronChart) && (
              <div className="satEarthCondPanelSingle satEarthCondChartContainerHistorical">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Differential Electron Flux</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(diffElectronChart, "satEarthCondChart")}
                <div className="satEarthCondChartDescription">
                  <div className="satEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (7-Day Observation Period)</span>
                    <span><strong>Y-Axis:</strong> Electron Flux (e/cm²-s-sr-keV)</span>
                  </div>
                  {renderDescription("This chart displays differential electron flux measurements from space weather monitoring satellites over the past 7 days. Differential flux is electron intensity at specific energy levels, showing how the energy spectrum of the radiation belts evolves. Enhancements in these channels drive surface charging on satellites and are closely linked to substorm activity and auroral displays.")}
                </div>
                {renderChartStats(diffElectronChart)}
              </div>
            )}
          </div>
        )}
        {((differentialElectrons.length > 0)) && (
          <div className="satEarthCondOverviewGrid">
            {((differentialElectrons.length > 0)) && (
              <div className="satEarthCondPanelSingle satEarthCondChartContainerHistorical">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Differential Electron Channels ({differentialElectrons.length} Points)</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {(() => {
                  const sample = differentialElectrons[differentialElectrons.length - 1];
                  const fluxKeys = Object.keys(sample || {}).filter(k => k.startsWith("flux_"));
                  const headers = ["Timestamp", ...fluxKeys.map(k => k.replace("flux_", "").replace(/_/g, "-"))];
                  const rows = differentialElectrons.slice(-20).map(d => [
                    d?.timestamp ? new Date(d.timestamp).toLocaleTimeString() : "—",
                    ...fluxKeys.map(k => d && d[k] !== null && d[k] !== undefined ? d[k].toExponential(2) : "—")
                  ]);
                  return renderDataTable("Electron Flux by Channel", headers, rows);
                })()}
                <div className="satEarthCondChartDescription">
                  {renderDescription("This table lists the raw differential electron flux values for each energy channel over the last seven days. It provides the exact numbers behind the differential electron flux chart for closer inspection.")}
                </div>
              </div>
            )}
          </div>
        )}
        {diffProtonChart && (
          <div className="satEarthCondOverviewGrid">
            {diffProtonChart && (
              <div className="satEarthCondPanelSingle satEarthCondChartContainerHistorical">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Differential Proton Flux</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(diffProtonChart, "satEarthCondChart")}
                <div className="satEarthCondChartDescription">
                  <div className="satEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (7-Day Observation Period)</span>
                    <span><strong>Y-Axis:</strong> Proton Flux (p/cm²-s-sr-MeV)</span>
                  </div>
                  {renderDescription("This chart displays differential proton flux measurements over the past 7 days. Solar energetic protons during solar particle events penetrate satellite shielding, increase radiation exposure on polar and high-altitude flights, and cause polar cap absorption that disrupts HF radio at high latitudes. The energy spectrum shows how hard each event is and how deeply it can penetrate.")}
                </div>
                {renderChartStats(diffProtonChart)}
              </div>
            )}
          </div>
        )}
        {((differentialProtons.length > 0)) && (
          <div className="satEarthCondOverviewGrid">
            {((differentialProtons.length > 0)) && (
              <div className="satEarthCondPanelSingle satEarthCondChartContainerHistorical">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Differential Proton Channels ({differentialProtons.length} Points)</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {(() => {
                  const sample = differentialProtons[differentialProtons.length - 1];
                  const fluxKeys = Object.keys(sample || {}).filter(k => k.startsWith("flux_"));
                  const headers = ["Timestamp", ...fluxKeys.map(k => k.replace("flux_", "").replace(/_/g, "-").replace(/p/, ""))];
                  const rows = differentialProtons.slice(-20).map(d => [
                    d?.timestamp ? new Date(d.timestamp).toLocaleTimeString() : "—",
                    ...fluxKeys.map(k => d && d[k] !== null && d[k] !== undefined ? d[k].toExponential(2) : "—")
                  ]);
                  return renderDataTable("Proton Flux by Channel", headers, rows);
                })()}
                <div className="satEarthCondChartDescription">
                  {renderDescription("This table lists the raw differential proton flux values for each energy channel over the last seven days. It provides the exact numbers behind the differential proton flux chart for closer inspection.")}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderTemporalForensicsTab = () => {
    const data = getModuleData("temporalForensics") || {};
    if (!data || Object.keys(data).length === 0) return renderEmptyState(faDatabase, "There is no forecast data yet.");



    const violationsObj = data.probabilisticOutcomes?.violations || {};
    const violationsEntries = Object.entries(violationsObj);
    const weatherFronts = data.sensorValidation?.weatherFronts || [];
    const driftAlerts = data.sensorValidation?.drift || [];
    const dataQuality = data.sensorValidation?.dataQuality || [];

    const extendedForecasts = data.extendedForecasts || {};

    const atmosphericForecast = extendedForecasts.atmospheric || [];
    const marineForecast = extendedForecasts.marineForecast || [];







    const extAtmoTempChart = atmosphericForecast.length > 0 ? createDynamicLineChart("Extended Temperature Forecast", atmosphericForecast.filter(d => d && d.temperature !== null && d.temperature !== undefined).slice(0, 72), "timestamp", "temperature", " °C", "#ffd93d", true) : null;
    const extAtmoPrecipChart = atmosphericForecast.length > 0 ? createDynamicLineChart("Extended Precip Probability", atmosphericForecast.filter(d => d && d.precipitationProb !== null && d.precipitationProb !== undefined).slice(0, 72), "timestamp", "precipitationProb", "%", "#4ecdc4", true) : null;

    const extMarineWaveChart = marineForecast.length > 0 ? createDynamicLineChart("Wave Height Forecast (72h)", marineForecast.filter(d => d && d.waveHeight !== null && d.waveHeight !== undefined).slice(0, 72), "timestamp", "waveHeight", " m", "#42a5f5", true) : null;
    const extMarineSSTChart = marineForecast.length > 0 ? createDynamicLineChart("Sea Surface Temp Forecast", marineForecast.filter(d => d && d.seaSurfaceTemperature !== null && d.seaSurfaceTemperature !== undefined).slice(0, 72), "timestamp", "seaSurfaceTemperature", " °C", "#4ecdc4", true) : null;


    const nowcast = data.nowcast || { series: [] };
    const modelAgreement = data.modelAgreement || { models: [], spreadSeries: [] };
    const climateNormals = data.climateNormals || {};
    const nowcastChart = nowcast.series?.length ? createDynamicLineChart("Precipitation Rate", nowcast.series, (p) => (p.minutesFromNow <= 0 ? "Now" : `+${p.minutesFromNow}m`), "rateMmH", " mm/h", "#42a5f5", true) : null;
    const spreadChart = modelAgreement.spreadSeries?.length ? createDynamicLineChart("Model Temperature Spread", modelAgreement.spreadSeries, (p) => formatLocationTime(p.time, true), "spread", " °C", "#ffd93d", true) : null;
    const departure = (value) => (value === null || value === undefined ? "—" : `${value > 0 ? "+" : ""}${value.toFixed(1)} C`);

    const nowcastSection = renderSection("Precipitation Nowcast (2h)", faCloudRain, [[
      {
        title: "Next 2 Hours",
        badge: "FORECAST",
        content: renderDataTable(nowcast.summary || "Nowcast", ["Parameter", "Value", "Status"], [
          ["Precipitating Now", nowcast.raining ? "YES" : "NO", nowcast.raining ? "ACTIVE" : "CLEAR"],
          ["Starts In", nowcast.startsInMinutes !== null && nowcast.startsInMinutes !== undefined ? `${nowcast.startsInMinutes} min` : "—", nowcast.startsInMinutes !== null && nowcast.startsInMinutes !== undefined ? "WARNING" : "NONE"],
          ["Ends In", nowcast.endsInMinutes !== null && nowcast.endsInMinutes !== undefined ? `${nowcast.endsInMinutes} min` : nowcast.raining ? "Beyond 2 Hours" : "—", "INFO"],
          ["Total Next 2 Hours", formatValue(nowcast.totalNext2h, 1, " mm"), "INFO"],
          ["Peak Rate", formatValue(nowcast.peakRateMmH, 1, " mm/h"), nowcast.peakRateMmH >= 7.6 ? "HIGH" : nowcast.peakRateMmH >= 2.5 ? "MODERATE" : "LOW"]
        ]),
        description: "This table summarizes the precipitation forecast in 15-minute steps for the next two hours, with the headline in the table title. The 15-minute data come from rapid-refresh models over the United States and central Europe and are interpolated from hourly forecasts elsewhere, so treat start times outside those regions as approximate."
      },
      {
        title: "Precipitation Rate (2h)",
        badge: "FORECAST",
        content: renderDynamicChart(nowcastChart, "satEarthCondChart"),
        chart: nowcastChart,
        axes: ["Minutes From Now", "Precipitation Rate (mm/h)"],
        description: "This chart shows the forecast precipitation rate for each 15-minute step over the next two hours. Rates above about 2.5 mm/h are moderate rain and above 7.6 mm/h are heavy rain that can cause ponding on roads."
      }
    ]]);

    const modelAgreementSection = renderSection("Model Agreement (72h)", faChartLine, [
      [
        {
          title: "Model Comparison",
          badge: "FORECAST",
          content: renderDataTable("Four Global Models", ["Model", "24h High (°C)", "24h Low (°C)", "72h Precip (mm)", "Max Wind (m/s)"], (modelAgreement.models || []).map(m => [m.label, formatValue(m.high24h), formatValue(m.low24h), formatValue(m.precip72h), formatValue(m.maxWind72h)]), { emptyText: "Model comparison data is unavailable." }),
          description: "This table compares four independent global weather models for the next three days: ECMWF from Europe, GFS from the United States, ICON from Germany, and GEM from Canada. When they agree, the forecast is trustworthy, and when they disagree, the forecast is uncertain regardless of what any single app shows."
        },
        {
          title: "Agreement Summary",
          badge: "COMPUTED",
          content: renderDataTable("Confidence", ["Parameter", "Value", "Status"], [
            ["Forecast Confidence", modelAgreement.confidence || "—", modelAgreement.confidence === "HIGH" ? "GOOD" : modelAgreement.confidence === "MODERATE" ? "MODERATE" : modelAgreement.confidence === "LOW" ? "WARNING" : "NO DATA"],
            ["Mean Spread (24h)", formatValue(modelAgreement.meanSpread24h, 2, " C"), "INFO"],
            ["Mean Spread (72h)", formatValue(modelAgreement.meanSpread72h, 2, " C"), "INFO"],
            ["Precipitation Agreement", modelAgreement.precipitationAgreement || "—", modelAgreement.precipitationAgreement === "SPLIT" ? "MODERATE" : "OK"],
            ["Models Compared", (modelAgreement.models || []).length, "INFO"]
          ]),
          description: "This table rates forecast confidence from the average temperature spread between the models. A spread under 1.5°C over three days is high confidence, while more than 3°C means the models are resolving the weather pattern differently. A split on precipitation means some models bring rain and others do not."
        }
      ],
      [
        {
          title: "Temperature Spread (72h)",
          badge: "FORECAST",
          content: renderDynamicChart(spreadChart, "satEarthCondChart"),
          chart: spreadChart,
          axes: ["Local Time (Next 72 Hours)", "Spread Between Models (°C)"],
          description: "This chart shows the difference between the warmest and coolest model at each hour. The spread normally grows with lead time, and sharp spikes often mark the timing of a front that the models place at different hours."
        }
      ]
    ]);

    const climateSection = renderSection("Climate Normals & Records", faHistory, [[
      {
        title: "Today Versus Normal",
        badge: "HISTORICAL",
        content: renderDataTable(climateNormals.date || "Today", ["Parameter", "Value", "Status"], [
          ["Forecast High", formatValue(climateNormals.forecastHigh, 1, " C"), "INFO"],
          ["Normal High", formatValue(climateNormals.normalHigh, 1, " C"), "INFO"],
          ["High Departure", departure(climateNormals.highDeparture), climateNormals.highDeparture === null || climateNormals.highDeparture === undefined ? "NO DATA" : Math.abs(climateNormals.highDeparture) >= 5 ? "WARNING" : "OK"],
          ["Forecast Low", formatValue(climateNormals.forecastLow, 1, " C"), "INFO"],
          ["Normal Low", formatValue(climateNormals.normalLow, 1, " C"), "INFO"],
          ["Low Departure", departure(climateNormals.lowDeparture), climateNormals.lowDeparture === null || climateNormals.lowDeparture === undefined ? "NO DATA" : Math.abs(climateNormals.lowDeparture) >= 5 ? "WARNING" : "OK"],
          ["Normal Daily Precipitation", formatValue(climateNormals.normalPrecip, 2, " mm"), "INFO"]
        ]),
        description: "This table compares today's forecast high and low with the 1991 to 2020 climate normal for this time of year, averaged over a two-week window centered on today. Departures of 5°C or more are unusual and are highlighted. Normals come from the ERA5 reanalysis, which represents an area about 25 km wide."
      },
      {
        title: "Records for This Date",
        badge: "HISTORICAL",
        content: renderDataTable("Since 1940", ["Parameter", "Value", "Year"], [
          ["Record High", formatValue(climateNormals.recordHigh, 1, " C"), climateNormals.recordHighYear ?? "—"],
          ["Record Low", formatValue(climateNormals.recordLow, 1, " C"), climateNormals.recordLowYear ?? "—"],
          ["Years of Record", climateNormals.yearsOfRecord ?? "—", "—"]
        ]),
        description: "This table lists the warmest high and coldest low recorded on today's calendar date in the reanalysis record, which begins in 1940. Reanalysis smooths extremes over a wide area, so official station records at a nearby airport are often a few degrees more extreme."
      }
    ]]);

    return (
      <div className="satEarthCondModuleTab">
        {nowcastSection}
        <div className="satEarthCondSectionDivider">
          <div className="satEarthCondSectionDividerLine" />
          <span className="satEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faHourglassHalf} />
            Hazard Probabilities
          </span>
          <div className="satEarthCondSectionDividerLine" />
        </div>
        <div className="satEarthCondOverviewGrid">
          <div className="satEarthCondPanelSingle satEarthCondChartContainerForecast">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>Probabilistic Hazard Forecast</h4>
              {renderDataTypeBadge("PROBABILISTIC", "small")}
            </div>
            {renderDataTable("Hazard Probabilities", ["Time Offset", "Combined Prob", "Primary Risk", "Wind Prob", "Kp Prob", "Precip Prob", "Proj. Wind", "Proj. Kp"], violationsEntries.map(([time, v]) => [
                  time,
                  { value: v?.probability !== null && v?.probability !== undefined ? `${(v.probability * 100).toFixed(1)}%` : "—", color: getProbabilityColor(v?.probability) },
                  { value: v?.type?.replace(/_/g, " ") || "—", color: RISK_TYPE_COLORS[v?.type] || "#4ecdc4" },
                  { value: v?.windComponent !== undefined && v?.windComponent !== null ? `${(v.windComponent * 100).toFixed(1)}%` : "—", color: getProbabilityColor(v?.windComponent) },
                  { value: v?.kpComponent !== undefined && v?.kpComponent !== null ? `${(v.kpComponent * 100).toFixed(1)}%` : "—", color: getProbabilityColor(v?.kpComponent) },
                  { value: v?.precipComponent !== undefined && v?.precipComponent !== null ? `${(v.precipComponent * 100).toFixed(1)}%` : "—", color: getProbabilityColor(v?.precipComponent) },
                  v?.projectedWind !== null && v?.projectedWind !== undefined ? `${v.projectedWind} m/s` : "—",
                  v?.projectedKp !== null && v?.projectedKp !== undefined ? v.projectedKp.toFixed(2) : "—"
                ]), { emptyText: "Hazard forecast data has not arrived yet." })}
            <div className="satEarthCondChartDescription">
              {renderDescription("This table forecasts the probability of hazardous conditions at time offsets from 10 minutes to 12 hours ahead. It combines separate probabilities for high wind, geomagnetic activity, and precipitation into a single combined value and names the primary risk. Projected wind speed and Kp are shown for each offset.")}
            </div>
          </div>
        </div>
        <div className="satEarthCondSectionDivider">
          <div className="satEarthCondSectionDividerLine" />
          <span className="satEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faCloudShowersHeavy} />
            Fronts & Boundaries
          </span>
          <div className="satEarthCondSectionDividerLine" />
        </div>
        <div className="satEarthCondOverviewGrid">
          <div className="satEarthCondPanelSingle satEarthCondChartContainerForecast">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>Weather Fronts & Boundaries ({weatherFronts.length})</h4>
              {renderDataTypeBadge("FORECAST", "small")}
            </div>
            {renderDataTable("Detected Fronts", ["Time", "Type", "Intensity", "Temp Δ", "Wind Dir Δ", "Pressure Δ", "Indicators"], weatherFronts.map((front, i) => {
                  const intensityColor = front?.intensity === "STRONG" ? "#ff6b6b" : front?.intensity === "MODERATE" ? "#FF9500" : "#4ecdc4";
                  return [
                    front?.time || "—",
                    front?.type?.replace(/_/g, " ") || "—",
                    { value: front?.intensity || "—", color: intensityColor },
                    front?.tempChange !== undefined && front?.tempChange !== null ? `${front.tempChange.toFixed(1)}°C` : "—",
                    front?.windDirChange !== undefined && front?.windDirChange !== null ? `${front.windDirChange}°` : "—",
                    front?.pressureChange !== undefined && front?.pressureChange !== null ? `${front.pressureChange.toFixed(1)} hPa` : "—",
                    front?.indicators?.join(", ") || "—"
                  ];
                }), { emptyText: "No significant fronts or boundaries were detected in the forecast period." })}
            <div className="satEarthCondChartDescription">
              {renderDescription("This table lists weather fronts and boundaries expected to affect the selected location. Each entry includes the expected time, front type, intensity, and the changes in temperature, wind direction, and pressure that signal its passage, along with the indicators used to detect it.")}
            </div>
          </div>
        </div>
        {modelAgreementSection}
        <div className="satEarthCondSectionDivider">
          <div className="satEarthCondSectionDividerLine" />
          <span className="satEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faCloudShowersHeavy} style={{ color: DATA_TYPE.FORECAST.color }} />
            Atmospheric Forecast (72h)
          </span>
          <div className="satEarthCondSectionDividerLine" />
        </div>
                {(((((atmosphericForecast.length > 0 || extAtmoTempChart)) && (atmosphericForecast.length > 0))) || ((((atmosphericForecast.length > 0 || extAtmoTempChart)) && extAtmoTempChart))) && (
          <div className="satEarthCondOverviewGrid">
            {(((atmosphericForecast.length > 0 || extAtmoTempChart)) && (atmosphericForecast.length > 0)) && (
              <div className="satEarthCondPanelDouble satEarthCondChartContainerForecast">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Extended Wind Speed (72h)</h4>
                  {renderDataTypeBadge("FORECAST", "small")}
                </div>
                {renderDynamicChart(createDynamicLineChart("Extended Wind Speed", atmosphericForecast.filter(d => d && d.windSpeed !== null && d.windSpeed !== undefined).slice(0, 72), "timestamp", "windSpeed", " m/s", "#4ecdc4", true), "satEarthCondChart")}
                <div className="satEarthCondChartDescription">
                  <div className="satEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (72-Hour Forecast Period)</span>
                    <span><strong>Y-Axis:</strong> Wind Speed (m/s)</span>
                  </div>
                  {renderDescription("This chart provides an extended 72-hour wind speed forecast. Extended forecasts make it possible to spot windy periods days in advance, which matters for outdoor plans, marine activity, and wildfire danger. Forecast confidence decreases with lead time, so later values should be treated as broad guidance.")}
                </div>
                {renderChartStats(createDynamicLineChart("Extended Wind Speed", atmosphericForecast.filter(d => d && d.windSpeed !== null && d.windSpeed !== undefined).slice(0, 72), "timestamp", "windSpeed", " m/s", "#4ecdc4", true))}
              </div>
            )}
            {(((atmosphericForecast.length > 0 || extAtmoTempChart)) && extAtmoTempChart) && (
              <div className="satEarthCondPanelDouble satEarthCondChartContainerForecast">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Extended Temperature (72h)</h4>
                  {renderDataTypeBadge("FORECAST", "small")}
                </div>
                {renderDynamicChart(extAtmoTempChart, "satEarthCondChart")}
                <div className="satEarthCondChartDescription">
                  <div className="satEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (72-Hour Forecast Period)</span>
                    <span><strong>Y-Axis:</strong> Temperature (°C)</span>
                  </div>
                  {renderDescription("This chart displays the 72-hour temperature forecast for the selected location. The forecast shows the expected daily cycle along with any warming or cooling trends from approaching air masses, which helps anticipate frost, heat stress, and changes in energy demand. Forecast confidence decreases with lead time.")}
                </div>
                {renderChartStats(extAtmoTempChart)}
              </div>
            )}
          </div>
        )}
        {((extAtmoPrecipChart) || (((atmosphericForecast.length > 0)))) && (
          <div className="satEarthCondOverviewGrid">
            {extAtmoPrecipChart && (
              <div className="satEarthCondPanelDouble satEarthCondChartContainerForecast">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Extended Precip Probability (72h)</h4>
                  {renderDataTypeBadge("FORECAST", "small")}
                </div>
                {renderDynamicChart(extAtmoPrecipChart, "satEarthCondChart")}
                <div className="satEarthCondChartDescription">
                  <div className="satEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (72-Hour Forecast Period)</span>
                    <span><strong>Y-Axis:</strong> Precipitation Probability (%)</span>
                  </div>
                  {renderDescription("This chart shows extended precipitation probability forecasts over the next 72 hours. Long-range precipitation outlooks help identify likely wet and dry periods for planning outdoor activity and anticipating flood risk. Sustained high probabilities indicate a prolonged wet period from a slow-moving weather system.")}
                </div>
                {renderChartStats(extAtmoPrecipChart)}
              </div>
            )}
            {((atmosphericForecast.length > 0)) && (
              <div className="satEarthCondPanelDouble satEarthCondChartContainerForecast">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Extended Atmospheric Forecast Table ({atmosphericForecast.length} Hours)</h4>
                  {renderDataTypeBadge("FORECAST", "small")}
                </div>
                {renderDataTable("72-Hour Forecast", ["Time", "Temp (°C)", "Wind (m/s)", "Precip Prob (%)"],
                  atmosphericForecast.slice(0, 24).map(d => [
                    d?.timestamp ? new Date(d.timestamp).toLocaleTimeString() : "—",
                    d?.temperature !== null && d?.temperature !== undefined ? d.temperature.toFixed(1) : "—",
                    d?.windSpeed !== null && d?.windSpeed !== undefined ? d.windSpeed.toFixed(1) : "—",
                    d?.precipitationProb !== null && d?.precipitationProb !== undefined ? d.precipitationProb.toFixed(0) : "—"
                  ])
                )}
                <div className="satEarthCondChartDescription">
                  {renderDescription("This table lists the hourly forecast for the next 72 hours, including temperature, wind speed, and precipitation probability. It provides the exact values behind the extended forecast charts above.")}
                </div>
              </div>
            )}
          </div>
        )}
        <div className="satEarthCondSectionDivider">
          <div className="satEarthCondSectionDividerLine" />
          <span className="satEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faWater} />
            Marine Forecast (72h)
          </span>
          <div className="satEarthCondSectionDividerLine" />
        </div>
                {(((((extMarineWaveChart || extMarineSSTChart)) && extMarineWaveChart)) || ((((extMarineWaveChart || extMarineSSTChart)) && extMarineSSTChart))) && (
          <div className="satEarthCondOverviewGrid">
            {(((extMarineWaveChart || extMarineSSTChart)) && extMarineWaveChart) && (
              <div className="satEarthCondPanelDouble satEarthCondChartContainerForecast">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Extended Wave Height (72h)</h4>
                  {renderDataTypeBadge("FORECAST", "small")}
                </div>
                {renderDynamicChart(extMarineWaveChart, "satEarthCondChart")}
                <div className="satEarthCondChartDescription">
                  <div className="satEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (72-Hour Forecast Period)</span>
                    <span><strong>Y-Axis:</strong> Significant Wave Height (m)</span>
                  </div>
                  {renderDescription("This chart displays the 72-hour significant wave height forecast for waters near the selected location. Wave height is the primary indicator of sea state and drives hazards for small craft, beach users, and coastal areas. Building wave heights often precede the arrival of strong winds or distant storm swell.")}
                </div>
                {renderChartStats(extMarineWaveChart)}
              </div>
            )}
            {(((extMarineWaveChart || extMarineSSTChart)) && extMarineSSTChart) && (
              <div className="satEarthCondPanelDouble satEarthCondChartContainerForecast">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Sea Surface Temperature (72h)</h4>
                  {renderDataTypeBadge("FORECAST", "small")}
                </div>
                {renderDynamicChart(extMarineSSTChart, "satEarthCondChart")}
                <div className="satEarthCondChartDescription">
                  <div className="satEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (72-Hour Forecast Period)</span>
                    <span><strong>Y-Axis:</strong> Sea Surface Temperature (°C)</span>
                  </div>
                  {renderDescription("This chart shows the 72-hour sea surface temperature forecast. Sea surface temperature influences coastal weather patterns, marine layer development, and fog formation. Warm waters fuel tropical storms and heavy rainfall, while the contrast between sea and land temperatures drives sea breeze circulations.")}
                </div>
                {renderChartStats(extMarineSSTChart)}
              </div>
            )}
          </div>
        )}
        {((marineForecast.length > 0)) && (
          <div className="satEarthCondOverviewGrid">
            {((marineForecast.length > 0)) && (
              <div className="satEarthCondPanelSingle satEarthCondChartContainerForecast">
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>Extended Marine Forecast Table ({marineForecast.length} Hours)</h4>
                  {renderDataTypeBadge("FORECAST", "small")}
                </div>
                {renderDataTable("72-Hour Marine Forecast", ["Time", "Wave Height (m)", "Wave Dir (°)", "Period (s)", "SST (°C)"],
                  marineForecast.slice(0, 24).map(d => [
                    d?.timestamp ? new Date(d.timestamp).toLocaleTimeString() : "—",
                    d?.waveHeight !== null && d?.waveHeight !== undefined ? d.waveHeight.toFixed(1) : "—",
                    d?.waveDirection !== null && d?.waveDirection !== undefined ? d.waveDirection.toFixed(0) : "—",
                    d?.wavePeriod !== null && d?.wavePeriod !== undefined ? d.wavePeriod.toFixed(1) : "—",
                    d?.seaSurfaceTemperature !== null && d?.seaSurfaceTemperature !== undefined ? d.seaSurfaceTemperature.toFixed(1) : "—"
                  ])
                )}
                <div className="satEarthCondChartDescription">
                  {renderDescription("This table lists the hourly marine forecast for the next 72 hours, including wave height, wave direction, wave period, and sea surface temperature. Longer wave periods indicate swell from distant storms, which carries more energy than local wind waves of the same height.")}
                </div>
              </div>
            )}
          </div>
        )}
        {climateSection}
        <div className="satEarthCondSectionDivider">
          <div className="satEarthCondSectionDividerLine" />
          <span className="satEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faChartLine} />
            Parameter Trends
          </span>
          <div className="satEarthCondSectionDividerLine" />
        </div>
        <div className="satEarthCondOverviewGrid">
          <div className="satEarthCondPanelSingle satEarthCondChartContainerTrend">
            <div className="satEarthCondChartHeaderWithBadge">
              <h4>Parameter Trends</h4>
              {renderDataTypeBadge("TREND", "small")}
            </div>
            {renderDataTable("Parameters", ["Parameter", "Rate (Trend)", "Direction", "Current (Live)"], [
              ["Wind Speed", data.trendLines?.wind?.derivative !== null && data.trendLines?.wind?.derivative !== undefined ? `${data.trendLines.wind.derivative.toFixed(3)} m/s/h` : "—", data.trendLines?.wind?.forecast ?? "—", data.trendLines?.wind?.currentValue !== null && data.trendLines?.wind?.currentValue !== undefined ? `${data.trendLines.wind.currentValue.toFixed(1)} m/s` : "—"],
              ["Kp Index", data.trendLines?.kp?.derivative !== null && data.trendLines?.kp?.derivative !== undefined ? `${data.trendLines.kp.derivative.toFixed(3)} /h` : "—", data.trendLines?.kp?.derivative !== null && data.trendLines?.kp?.derivative !== undefined ? (data.trendLines.kp.derivative > 0.1 ? "INCREASING" : data.trendLines.kp.derivative < -0.1 ? "DECREASING" : "STABLE") : "—", data.trendLines?.kp?.currentValue !== null && data.trendLines?.kp?.currentValue !== undefined ? data.trendLines.kp.currentValue.toFixed(1) : "—"],
              ["Wind Shear", data.trendLines?.shear?.derivative !== null && data.trendLines?.shear?.derivative !== undefined ? `${data.trendLines.shear.derivative.toFixed(3)} /h` : "—", data.trendLines?.shear?.forecast ?? "—", "—"]
            ])}
            <div className="satEarthCondChartDescription">
              {renderDescription("This table shows how key parameters are changing right now. For wind speed, the Kp index, and wind shear, it lists the current value, the calculated rate of change per hour, and whether each is rising, falling, or steady.")}
            </div>
          </div>
        </div>

      </div>
    );
  };

  const renderGlobalAnalysisTab = () => {
    const [lat, lon] = selectedLocation.split(",").map(Number);
    const filteredOverlays = WINDY_OVERLAYS.filter(o => (mapCategoryFilter === "all" || o.category === mapCategoryFilter) && (mapSearchTerm === "" || o.name.toLowerCase().includes(mapSearchTerm.toLowerCase())));

    const getMapDescription = (overlayId) => {
      const descriptions = {
        wind: "This map displays surface wind speed and direction patterns across the region. Wind vectors indicate flow direction while color intensity represents wind magnitude. The visualization helps identify approaching frontal boundaries, sea breeze development, and synoptic-scale flow patterns that shape local conditions.",
        gust: "This map shows wind gust intensity and distribution. Gusts are sudden, brief increases in wind speed that cause most wind damage to trees, power lines, and structures. Peak gusts often exceed sustained winds by a wide margin in storms and near frontal boundaries.",
        rain: "This map displays precipitation intensity and coverage. It shows where rain is falling now and how bands of precipitation are organized, which helps anticipate flooding, reduced visibility, and hazardous travel conditions as systems move across the region.",
        clouds: "This map shows cloud cover percentage and distribution. Cloud coverage controls sunlight at the surface, overnight cooling, and solar energy output. Thick, organized cloud layers often mark frontal systems or embedded convection.",
        pressure: "This map displays sea level pressure patterns and gradients. Pressure distribution drives large-scale atmospheric circulation and helps identify approaching weather systems. Tight pressure gradients indicate strong wind potential, while pressure trends show how conditions are evolving.",
        temp: "This map shows surface temperature distribution across the region. Temperature patterns reveal warm and cold air masses and the fronts between them. Gradients between land and water drive coastal circulations such as sea breezes that shift local winds and temperatures.",
        dewpoint: "This map displays dewpoint temperature distribution. Dewpoint indicates atmospheric moisture content and helps predict fog formation, cloud development, and precipitation potential. High dewpoints combined with cooling temperatures can lead to rapid fog development and muggy, uncomfortable conditions.",
        rh: "This map shows relative humidity distribution. Humidity levels influence comfort, fog formation, and how quickly vegetation dries out. Very low humidity increases static electricity and wildfire risk, while very high humidity favors fog, dew, and heat stress.",
        cape: "This map displays Convective Available Potential Energy (CAPE) values. CAPE quantifies atmospheric instability and thunderstorm development potential. Higher CAPE values indicate greater energy available for convective updrafts, correlating with severe weather risk including lightning, hail, and strong downdrafts.",
        visibility: "This map shows visibility conditions across the region. Visibility affects driving, aviation, and marine navigation. Reduced visibility from fog, haze, smoke, or precipitation can develop quickly and create hazardous travel conditions.",
        snow: "This map displays snowfall accumulation and intensity. Snow accumulation affects road conditions, travel, and infrastructure, and heavy wet snow can bring down trees and power lines. Snow cover also keeps surface temperatures low long after the snowfall ends.",
        freezingLevel: "This map shows the altitude of the freezing level across the region. The freezing level determines whether precipitation falls as rain or snow and marks where aircraft icing becomes likely. A low freezing level signals cold air aloft and a greater chance of wintry precipitation reaching the ground.",
        thunder: "This map displays thunderstorm probability and lightning activity. Lightning is one of the leading weather hazards, and strikes can occur well away from the storm itself. Thunderstorm areas also bring heavy rain, hail, and damaging winds.",
        turbulence: "This map shows atmospheric turbulence intensity at various altitudes. Clear air turbulence near jet streams and mechanical turbulence from terrain affect aviation comfort and safety. Turbulent regions often coincide with strong wind shear and mountain wave activity.",
        icing: "This map displays aircraft icing potential. Icing occurs in cloud layers containing supercooled water droplets that freeze on contact with surfaces. It is a significant aviation hazard and often accompanies freezing rain and drizzle at the surface.",
        waves: "This map shows ocean wave height and direction. Wave conditions determine sea state for boating, shipping, and beach safety. Large waves can cause coastal erosion and overwash, particularly when they coincide with high tides.",
        swell: "This map displays ocean swell patterns and periods. Long-period swells from distant storms can create hazardous surf and rip currents even under calm local winds. Swell direction and period determine which coastlines are most exposed.",
        sst: "This map shows sea surface temperature distribution. SST influences coastal weather patterns, marine layer development, and fog formation. Warm waters fuel tropical storm development and heavy rainfall, while temperature gradients between ocean currents drive localized weather.",
        currentsTide: "This map displays ocean current patterns and tidal flows. Current information matters for navigation, swimming safety, and the drift of debris or pollutants. Strong tidal currents are most pronounced in inlets, straits, and bays.",
        airQuality: "This map shows air quality index values. Air quality affects respiratory health during outdoor activity and may indicate atmospheric conditions relevant to visibility. Smoke from wildfires can significantly degrade air quality and visibility across wide regions.",
        pm25: "This map displays fine particulate matter (PM2.5) concentrations. PM2.5 penetrates deep into the lungs and is the air pollutant most closely linked to health effects. Elevated levels often indicate wildfire smoke, dust, or industrial emissions.",
        dust: "This map shows dust and sand concentration in the atmosphere. Dust storms can severely reduce visibility, degrade air quality, and damage sensitive equipment. Long-range dust transport can affect regions far from the source deserts.",
        satellite: "This satellite imagery shows current cloud patterns and weather system organization. Satellite observations provide synoptic-scale context for understanding regional weather evolution and help validate numerical forecast model performance. Visible and infrared channels reveal cloud thickness, convective development, and frontal boundaries.",
        radar: "This radar imagery displays precipitation intensity and movement. Radar is essential for tracking convective cells, estimating precipitation rates, and identifying hazardous weather approaching the selected location. Doppler capabilities reveal wind patterns within precipitation that may indicate rotation or severe downdrafts.",
        windAnimation: "This animated wind visualization shows atmospheric flow patterns over time. Wind animations help identify convergence zones, frontal passages, and circulation features that affect local conditions. The temporal evolution of wind patterns shows how weather systems are moving and intensifying.",
        cosc: "This map displays CO (carbon monoxide) concentrations from satellite observations. CO serves as a tracer for combustion emissions and atmospheric transport patterns. Elevated CO may indicate biomass burning events that could affect air quality and visibility across the region.",
        so2: "This map shows sulfur dioxide concentrations. SO2 is a volcanic emission tracer and industrial pollutant indicator. Volcanic SO2 plumes can pose aviation hazards and affect atmospheric chemistry, so monitoring helps identify potential volcanic activity.",
        no2: "This map displays nitrogen dioxide concentrations. NO2 indicates combustion sources and photochemical smog potential. Urban and industrial NO2 plumes affect air quality and may correlate with haze conditions that reduce visibility.",
        gtco3: "This map shows total column ozone distribution. Ozone levels affect UV radiation exposure and atmospheric chemistry. Ozone depletion is most relevant at high latitudes, where reduced ozone provides less protection from solar UV radiation."
      };
      return descriptions[overlayId] || "This map displays environmental data for the region around the selected location. The visualization supports assessment of current and developing conditions.";
    };

    return (
      <div className="satEarthCondGlobalTab">
        <div className="satEarthCondMapControls">
          <div className="satEarthCondMapControlGroup" style={{ flex: 1 }}>
            <div className="satEarthCondSearchInputWrapper">
              <FontAwesomeIcon icon={faSearchPlus} className="satEarthCondSearchIcon" />
              <input type="text" placeholder="Find Layer" value={mapSearchTerm} onChange={(e) => setMapSearchTerm(e.target.value)} className="satEarthCondInput satEarthCondSearchInput" />
            </div>
          </div>
          <div className="satEarthCondMapControlGroup">
            <Dropdown
              value={labelFor(MAP_CATEGORY_OPTIONS, mapCategoryFilter)}
              onChange={(option) => setMapCategoryFilter(valueFor(MAP_CATEGORY_OPTIONS, option))}
              options={MAP_CATEGORY_OPTIONS.map(([, label]) => label)}
              placeholder="Category"
            />
          </div>
        </div>
        <div className="satEarthCondMapsGrid">
          {filteredOverlays.map(o => (
            <div key={o.id} className="satEarthCondMapCard">
              <div className="satEarthCondMapTitle">
                <FontAwesomeIcon icon={o.icon} className="satEarthCondMapTitleIcon" />
                {o.name}
              </div>
              <div className="satEarthCondMapIframeContainer">
                <iframe src={getWindyMapUrl(lat, lon, o.id, mapAltitude)} title={o.name} className="satEarthCondMapIframe" allow="geolocation" loading="lazy" scrolling="no" />
              </div>
              <div className="satEarthCondChartDescriptionMaps">
                <p className="satEarthCondChartDescriptionText">
                  {getMapDescription(o.id)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCurrentTabContent = () => {
    switch (activeTab) {
      case "global": return renderGlobalAnalysisTab();
      case "overview": return renderOverviewTab();
      case "atmosphericEnvironment": return renderAtmosphericEnvironmentTab();
      case "electromagneticEnvironment": return renderElectromagneticEnvironmentTab();
      case "groundEnvironment": return renderGroundEnvironmentTab();
      case "temporalForensics": return renderTemporalForensicsTab();
      default: return renderOverviewTab();
    }
  };

  const renderAckModal = () => {
    if (!ackEntry) return null;
    const position = Math.min(ackIndex, ackList.length - 1);
    const pending = ackPendingKeys.has(ackEntry.key);
    const pendingCount = ackList.filter((item) => ackPendingKeys.has(item.key)).length;
    const analysisState = ackAnalyses[ackEntry.key] || {};
    const analysis = analysisState.data;
    const item = ackEntry.item;
    const status = ackEntry.ended ? "Ended" : ackEntry.updated ? "Updated" : "New";
    const color = ackEntry.ended ? "#919baf" : (SEVERITY_CONFIG[item.severity] || SEVERITY_CONFIG.INFO).color;
    return createPortal(
      <div className="satWeatherModalOverlay satWeatherAckOverlay">
        <div className="satWeatherModal satWeatherAckModal" onClick={(clickEvent) => clickEvent.stopPropagation()}>
          <div className="satWeatherModalHeader">
            <span>{`Alert ${position + 1} Of ${ackList.length}`}</span>
            <div className="satWeatherAckPager">
              {ackQueue.length > 1 && (
                <button type="button" className="satWeatherModalClose satWeatherAckAllButton" onClick={sounds.acknowledgeAll} title="Acknowledge Every Alert In The Queue"><FontAwesomeIcon icon={faCheckDouble} /> {`Acknowledge All (${ackQueue.length})`}</button>
              )}
              <button type="button" className="satWeatherModalClose" disabled={position <= 0} onClick={() => setAckIndex(position - 1)} title="Previous Alert"><FontAwesomeIcon icon={faBackwardStep} /></button>
              <button type="button" className="satWeatherModalClose" disabled={position >= ackList.length - 1} onClick={() => setAckIndex(position + 1)} title="Next Alert"><FontAwesomeIcon icon={faForwardStep} /></button>
              <button type="button" className="satWeatherModalClose" onClick={closeAckModal} title={ackReview ? "Close" : "Minimize Until The Next Alert"}><FontAwesomeIcon icon={faTimes} /></button>
            </div>
          </div>
          <div className="satWeatherModalContent">
            <div className="satWeatherAckTitle" style={{ borderLeftColor: color }}>
              <div className="satWeatherAckTitleRow">
                <span className="satWeatherAckEvent" style={{ color }}>{conditionTitle(item)}</span>
                <span className={`satWeatherAckStatus satWeatherAckStatus${status}`}>{status}</span>
              </div>
              <div className="satWeatherAckHeadline">{item.message}</div>
            </div>
            <div className="satWeatherAckSectionTitle">{item.kind === "violation" ? "Violation Details" : "Alert Details"}</div>
            {renderDetailFields(conditionFields(item), { columns: 3, skipEmpty: true, wideAt: 26, fullAt: 40 })}
            {item.recommendedAction && (
              <>
                <div className="satWeatherAckSectionTitle">Recommended Action</div>
                <div className="satWeatherAckAnalysis">
                  <p className="satWeatherAckSummary">{item.recommendedAction}</p>
                </div>
              </>
            )}
            <div className="satWeatherAckSectionTitle">AI Analysis</div>
            <div className="satWeatherAckAnalysis">
              {ackEntry.ended && <div className="satWeatherAckNote">This alert has ended, so no analysis is generated for it.</div>}
              {!ackEntry.ended && analysisState.loading && <div className="satWeatherAckNote"><FontAwesomeIcon icon={faSpinner} spin /> Generating Analysis</div>}
              {!ackEntry.ended && analysisState.error && <div className="satWeatherDetailError">{`The AI analysis is unavailable because of the error "${String(analysisState.error).replace(/\.$/, "")}".`}</div>}
              {analysis && (
                <>
                  <p className="satWeatherAckSummary">{analysis.summary}</p>
                  <div className="satWeatherAckColumns">
                    <div className="satWeatherAckBlock">
                      <div className="satWeatherAckBlockTitle">Risks</div>
                      {analysis.threats.map((threat, index) => <p key={index}>{threat}</p>)}
                    </div>
                    <div className="satWeatherAckBlock">
                      <div className="satWeatherAckBlockTitle">Recommended Actions</div>
                      {analysis.actions.map((action, index) => <p key={index}>{action}</p>)}
                    </div>
                  </div>
                  <div className="satWeatherAckColumns">
                    <div className="satWeatherAckBlock">
                      <div className="satWeatherAckBlockTitle">Timing</div>
                      <p>{analysis.timing}</p>
                    </div>
                    <div className="satWeatherAckBlock">
                      <div className="satWeatherAckBlockTitle">Confidence</div>
                      <p>{analysis.confidence}</p>
                    </div>
                  </div>
                  <div className="satWeatherAckFootnote">{`Generated By ${analysis.model} At ${new Date(analysis.generatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} From The Live Conditions Data`}</div>
                </>
              )}
            </div>
          </div>
          <div className="satWeatherAckActions">
            <span className="satWeatherAckRemaining">{!pending ? "Already Acknowledged" : pendingCount === 1 ? "Last Alert To Acknowledge" : `${pendingCount - 1} More To Acknowledge`}</span>
            <button type="button" className="satWeatherModalBtnSecondary" onClick={() => {
              closeAckModal();
              showCondition(item);
            }}><FontAwesomeIcon icon={faSearchPlus} /> View Details</button>
            <button type="button" className="satWeatherModalBtnPrimary" disabled={!pending} onClick={() => sounds.acknowledge(ackEntry.key)}><FontAwesomeIcon icon={faCheck} /> {pending ? "Acknowledge" : "Acknowledged"}</button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  const renderControlsPanel = () => (
    <div className="satEarthCondControlsPanel">

      <div className="satWeatherAreaList">
        <div className="satWeatherAreaListHeader">
          <span className="satWeatherAreaListTitle"><FontAwesomeIcon icon={faMapPin} /> Monitored Areas</span>
          <button className="satWeatherAreaListButton" onClick={() => openAreaModal(null)} title="Add Area"><FontAwesomeIcon icon={faPlus} /></button>
        </div>
        {areas.length > 0 && (
          <div className={`satWeatherAreaListStatus ${areaErrors.length ? "satWeatherAreaListStatusError" : ""}`}>
            {areaErrors.length ? `The conditions for ${areaErrors.length === 1 ? describeArea(areaErrors[0]) : `${areaErrors.length} areas`} could not be evaluated because of the error "${String(areaResults[areaErrors[0].area_id].error).replace(/\.$/, "")}".` : areasReady && areaCheckedAt ? `Evaluated At ${new Date(areaCheckedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Evaluating Your Areas"}
          </div>
        )}
        {areas.length === 0 ? (
          <div className="satWeatherAreaListEmpty">Add an area to start tracking the conditions and alerts inside it.</div>
        ) : (
          <div className="satWeatherAreaListItems">
            {areas.map((area) => {
              const summary = areaCounts[area.area_id] || { total: 0, critical: 0, top: null };
              const isSelected = area.area_id === selectedAreaId;
              return (
                <div key={area.area_id} className={`satWeatherAreaListItem${isSelected ? " satWeatherAreaListItemSelected" : ""}`} onClick={() => selectArea(area)}>
                  <span className="satWeatherAreaListItemDot" style={{ backgroundColor: summary.top ? SEVERITY_CONFIG[summary.top].color : areaResults[area.area_id] ? "#4ecdc4" : "#3d4354" }} />
                  <div className="satWeatherAreaListItemInfo">
                    <span className="satWeatherAreaListItemName">{area.name || describeArea(area)}</span>
                    <span className="satWeatherAreaListItemMeta">{areaResults[area.area_id] ? `${summary.total} Alert${summary.total === 1 ? "" : "s"} · ${summary.critical} Critical` : "Evaluating"}</span>
                  </div>
                  <button className="satWeatherAreaListButton" onClick={(event) => { event.stopPropagation(); openAreaModal(area); }} title="Edit Area"><FontAwesomeIcon icon={faEdit} /></button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="satEarthCondControlGroupStack">
        <div className="satEarthCondControlGroup">
          <Dropdown
            value={labelFor(ALERT_SCOPE_OPTIONS, activeAreas ? "areas" : "selected")}
            onChange={(option) => chooseAlertScope(valueFor(ALERT_SCOPE_OPTIONS, option))}
            options={ALERT_SCOPE_OPTIONS.map(([, label]) => label)}
            placeholder="Alert Scope"
          />
        </div>
        <div className="satEarthCondControlGroup">
          <label>Search Places</label>
          <input
            type="text"
            placeholder="City or Place"
            value={locationQuery}
            onChange={(e) => setLocationQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") searchLocations(); }}
            className="satEarthCondInput"
          />
        </div>
        <div className="satEarthCondControlGroup">
          <button onClick={searchLocations} className="satEarthCondBtn satEarthCondBtnSecondary">
            <FontAwesomeIcon icon={faSearchPlus} /> Search
          </button>
          {locationSearchStatus && <div className="satEarthCondLocationSearchStatus">{locationSearchStatus}</div>}
          {locationResults.length > 0 && (
            <div className="satEarthCondLocationResults">
              {locationResults.map(result => (
                <button key={`${result.latitude}_${result.longitude}`} type="button" className="satEarthCondLocationResult" onClick={() => selectSearchResult(result)}>
                  <span className="satEarthCondLocationResultName">{result.label}</span>
                  <span className="satEarthCondLocationResultCoords">{result.latitude.toFixed(3)}, {result.longitude.toFixed(3)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="satEarthCondControlGroup">
          <button onClick={() => setShowLocationPicker(true)} className="satEarthCondBtn satEarthCondBtnSecondary satWeatherBtnElide" title="Choose A Location On The Map Or By Coordinates">
            <FontAwesomeIcon icon={faGlobeAmericas} /> <span>Set Location</span>
          </button>
        </div>
        <div className="satEarthCondControlGroup">
          <div className="satWeatherLocationCurrent" title={`${locationName} | ${selectedLat.toFixed(4)}°, ${selectedLon.toFixed(4)}°`}>
            <span className="satWeatherLocationCurrentName">{locationName}</span>
            <span className="satWeatherLocationCurrentCoords">{`${selectedLat.toFixed(4)}°, ${selectedLon.toFixed(4)}°`}</span>
          </div>
        </div>
      </div>

      <div className="satEarthCondControlGroupStack">
        <div className="satEarthCondControlGroup">
          <label className="satEarthCondCheckboxLabel">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            <span>Auto Refresh</span>
          </label>
        </div>
      </div>

      <div className="satEarthCondControlGroupStack" style={{ borderBottom: 0 }}>
        <div className="satEarthCondControlGroup">
          <Dropdown
            value={labelFor(REFRESH_INTERVAL_OPTIONS, refreshInterval)}
            onChange={(option) => setRefreshInterval(valueFor(REFRESH_INTERVAL_OPTIONS, option))}
            options={REFRESH_INTERVAL_OPTIONS.map(([, label]) => label)}
            placeholder="Interval"
            className={autoRefresh ? "" : "satEarthCondDropdownDisabled"}
          />
        </div>
      </div>

      <div className="satEarthCondControlGroupStack">
        <div className="satEarthCondHarvestPanel">
          <div className="satEarthCondHarvestTitle">Harvester</div>
          <div className="satEarthCondHarvestRow"><span>Status</span><span style={{ color: SOURCES.harvest.statusColors[harvestStatusLabel] || "#ff6b6b" }}>{harvestStatusLabel}</span></div>
          <div className="satEarthCondHarvestRow"><span>Products</span><span>{harvestObjects.toLocaleString()}</span></div>
          <div className="satEarthCondHarvestRow"><span>Records</span><span>{harvestStats.frames.toLocaleString()}</span></div>
          <div className="satEarthCondHarvestRow"><span>Location Snapshots</span><span>{locationSnapshots === null ? "—" : locationSnapshots.toLocaleString()}</span></div>
          <div className="satEarthCondHarvestRow"><span>Jobs Due</span><span>{harvestStats.due}</span></div>
          <div className="satEarthCondHarvestRow"><span>Jobs Running</span><span>{harvestStats.running}</span></div>
          <div className="satEarthCondHarvestRow"><span>Sources</span><span>{harvestStats.sources}</span></div>
          <div className="satEarthCondHarvestRow"><span>Failing</span><span style={{ color: harvestStats.failing ? "#ff6b6b" : undefined }}>{harvestStats.failing}</span></div>
          <div className="satEarthCondHarvestRow"><span>New Leads</span><span style={{ color: harvestHealth?.leads?.new_leads ? "#ffd93d" : undefined }}>{harvestHealth?.leads ? harvestHealth.leads.new_leads : "—"}</span></div>
          <div className="satEarthCondHarvestRow"><span>Throttle</span><span style={{ color: harvestHealth?.engine?.throttle === "Normal" ? "#4ecdc4" : harvestHealth?.engine?.throttle ? "#FF9500" : undefined }}>{harvestHealth?.engine?.throttle ? `${harvestHealth.engine.throttle} (${harvestHealth.engine.lagMs} ms)` : "—"}</span></div>
          <div className="satEarthCondHarvestRow"><span>Last Tick</span><span>{harvestHealth?.engine?.lastTickAt ? formatRelativeTime(harvestHealth.engine.lastTickAt) : "—"}</span></div>
          {harvestWarnings.length > 0 && (
            <div className="satEarthCondHarvestWarnings">
              {harvestWarnings.map((warning, index) => {
                const [title, text] = splitWarning(warning);
                return (
                  <div key={index} className={`satEarthCondHarvestWarning ${expandedWarnings[warning] ? "satEarthCondHarvestWarningExpanded" : ""}`} onClick={() => toggleWarning(warning)}>
                    <FontAwesomeIcon icon={faExclamationTriangle} className="satEarthCondHarvestWarningIcon" />
                    <div className="satEarthCondHarvestWarningBody">
                      <span className="satEarthCondHarvestWarningTitle">{title}</span>
                      <span className="satEarthCondHarvestWarningText">{text}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="satEarthCondHarvestActions">
            <button className="satEarthCondBtn satEarthCondBtnSecondary" onClick={() => locationProductKey && exportHarvest(locationProductKey, "csv")} disabled={!locationProductKey || !locationSnapshots}>
              <FontAwesomeIcon icon={faHistory} /><span className="satEarthCondHarvestLabel">Location History</span>
            </button>
            <button className="satEarthCondBtn satEarthCondBtnSecondary" onClick={() => setShowLeads(true)}>
              <FontAwesomeIcon icon={faLightbulb} /><span className="satEarthCondHarvestLabel">Source Leads{harvestHealth?.leads?.new_leads ? ` (${harvestHealth.leads.new_leads} New)` : ""}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="satEarthCondControlActions">
        <button onClick={refreshAll} disabled={loading} className="satEarthCondBtn satEarthCondBtnPrimary">
          {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faRefresh} />} Refresh
        </button>
        <button onClick={() => exportData(dataExportFormat)} className="satEarthCondBtn satEarthCondBtnSecondary">
          <FontAwesomeIcon icon={faDownload} /> Export
        </button>
      </div>
    </div>
  );

  useEffect(() => {
    if (!stateRestored) return;
    if (previousLocationRef.current !== null && previousLocationRef.current !== selectedLocation) {
      setConsolidatedData(null);
      setSelectedConsoleItemId(null);
    }
    previousLocationRef.current = selectedLocation;
    fetchConsolidatedEvaluation();
  }, [stateRestored, fetchConsolidatedEvaluation]);
  useEffect(() => {
    interpretationLocationRef.current = selectedLocation;
    setInterpretations({});
    setInterpretationFailures({});
    interpretationSnapshotsRef.current = new Map();
  }, [selectedLocation]);
  useEffect(() => {
    if (!consolidatedData || activeTab === "global") return undefined;
    const requestLocation = selectedLocation;
    const timer = setTimeout(async () => {
      const root = tabContentRef.current;
      if (!root) return;
      const panels = [];
      root.querySelectorAll("[data-description-key]").forEach(node => {
        const panel = node.closest("[class*='satEarthCondPanel']");
        const key = node.getAttribute("data-description-key");
        if (!panel || !key) return;
        const clone = panel.cloneNode(true);
        clone.querySelectorAll(".satEarthCondChartDescription, .satEarthCondChartHeaderWithBadge, canvas, svg, button").forEach(child => child.remove());
        clone.querySelectorAll("tr").forEach(row => { row.textContent = `${[...row.children].map(cell => cell.textContent.trim()).join(" | ")}\n`; });
        clone.querySelectorAll(".satEarthCondStatsSummary span, .satEarthCondGaugeStat, .satEarthCondStatusTile, .satEarthCondGaugeLegendItem").forEach(child => child.append("; "));
        const content = clone.textContent.replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").trim().slice(0, 2000);
        const title = panel.querySelector("h4")?.textContent?.trim() || "Panel";
        const snapshot = `${title}|${content}`;
        if (interpretationSnapshotsRef.current.get(key) === snapshot) return;
        panels.push({ key, title, reference: key, content, snapshot });
      });
      if (!panels.length) return;
      panels.forEach(p => interpretationSnapshotsRef.current.set(p.key, p.snapshot));
      try {
        const [lat, lon] = selectedLocation.split(",").map(Number);
        const response = await fetch(apiUrl("interpretations"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ location: { label: locationName, latitude: lat, longitude: lon }, panels: panels.map(({ key, title, reference, content }) => ({ key, title, reference, content })) })
        });
        if (!response.ok) throw new Error(`The server returned status ${response.status}.`);
        const data = await response.json();
        if (interpretationLocationRef.current !== requestLocation) return;
        const received = data.interpretations || {};
        setInterpretations(prev => ({ ...prev, ...received }));
        const missing = panels.filter(p => !received[p.key]);
        missing.forEach(p => interpretationSnapshotsRef.current.delete(p.key));
        setInterpretationFailures(prev => ({ ...prev, ...Object.fromEntries(missing.map(p => [p.key, true])), ...Object.fromEntries(Object.keys(received).map(key => [key, false])) }));
      } catch (error) {
        panels.forEach(p => interpretationSnapshotsRef.current.delete(p.key));
        if (interpretationLocationRef.current === requestLocation) setInterpretationFailures(prev => ({ ...prev, ...Object.fromEntries(panels.map(p => [p.key, true])) }));
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [activeTab, consolidatedData, selectedLocation, locationName]);
  useEffect(() => {
    if (!expandedView) return undefined;
    const handleKey = (event) => { if (event.key === "Escape") setExpandedView(null); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [expandedView]);
  useEffect(() => {
    if (stateRestored && autoRefresh) intervalRef.current = setInterval(fetchConsolidatedEvaluation, refreshInterval);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [stateRestored, autoRefresh, refreshInterval, fetchConsolidatedEvaluation]);

  const allViolations = getAllViolations();
  const bellCritical = bellItems.some((item) => item.severity === "CRITICAL");
  const decision = getConsolidatedDecision();

  return (
    <div className="satEarthCondPage">
      {layoutVisibility.nav && <Nav activePage="earthconditions" />}

      {authLoading ? (
        <div className="satEarthCondGate">
          <div className="loading-wrapper">
            <div className="loading-circle" />
            <label className="loading-title">
              Loading
            </label>
          </div>
        </div>
      ) : (
      <div className={`satEarthCondContainer ${layoutVisibility.nav ? "" : "satEarthCondContainerNoNav"}`}>
        {layoutVisibility.header && (
        <header className="satEarthCondHeader satWeatherHeader">
          <div className="satEarthCondHeaderContent">
            <div className="satEarthCondTitleSection">
              <div className="satEarthCondSubtitle">{activeAreas ? `${activeAreasLabel} | Alerting For All Areas | ${bellItems.length} Alert${bellItems.length === 1 ? "" : "s"}` : `${locationName} | ${selectedLat.toFixed(4)}°, ${selectedLon.toFixed(4)}°`}</div>
            </div>
            <div className="satEarthCondHeaderStatus">
              <div className={`satEarthCondHeaderDecision satEarthCondDecision${decision.status.replace(/_/g, "")}`}>
                <FontAwesomeIcon icon={decision.status === "NOMINAL" ? faSquareCheck : decision.status === "SEVERE" ? faXmarkSquare : faExclamationTriangle} />
                <span>{formatDisplayValue(decision.status)}</span>
              </div>
              <button
                type="button"
                title={bellItems.length ? "Show Alerts" : "Show Overview"}
                className={`satEarthCondAlertBtn ${bellCritical ? "satEarthCondAlertBtnCritical" : bellItems.length > 0 ? "satEarthCondAlertBtnWarning" : ""}`}
                onClick={() => {
                  if (ackReviewList.length) {
                    openAckReview();
                    return;
                  }
                  if (bellItems.length) {
                    showCondition(bellItems[0]);
                    return;
                  }
                  setActiveTab("overview");
                }}
              >
                <FontAwesomeIcon icon={faBell} />
                {bellItems.length > 0 && <span className="satEarthCondAlertBadge">{bellItems.length}</span>}
              </button>
              <div className="satWeatherSoundBar">
                {(ackQueue.length > 0 || (sounds.alarm && sounds.alarm.test && sounds.alarm.persistent)) && (
                  <button
                    type="button"
                    title={ackQueue.length ? "Review And Acknowledge Each Alert" : "Stop The Repeating Alert Sound"}
                    className="satWeatherHeaderToggle satWeatherHeaderToggleAlarm"
                    onClick={() => {
                      if (sounds.alarm && sounds.alarm.test) sounds.silence();
                      if (ackQueue.length) setAckOpen(true);
                    }}
                  >
                    <FontAwesomeIcon icon={faVolumeXmark} />
                    <span>{ackQueue.length ? `Acknowledge (${ackQueue.length})` : "Acknowledge"}</span>
                  </button>
                )}
                <div className="satWeatherSoundGroup">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={sounds.settings.enabled}
                    title={!sounds.settings.enabled ? "Turn On Alert Sounds" : sounds.unlocked ? "Turn Off Alert Sounds" : "Click Anywhere To Allow Alert Sounds"}
                    className={`satWeatherSoundSwitchRow ${sounds.settings.enabled && !sounds.unlocked ? "satWeatherSoundSwitchBlocked" : ""}`}
                    onClick={sounds.toggle}
                  >
                    <FontAwesomeIcon icon={sounds.settings.enabled ? faVolumeHigh : faVolumeXmark} className="satWeatherSoundSwitchIcon" />
                    <span className="satWeatherSoundSwitchLabel">Sound</span>
                    <span className={`satWeatherSwitch ${sounds.settings.enabled ? "satWeatherSwitchOn" : ""}`}>
                      <span className="satWeatherSwitchKnob" />
                    </span>
                  </button>
                  <span className="satWeatherSoundDivider" />
                  <button
                    type="button"
                    role="switch"
                    aria-checked={sounds.settings.mode === "persistent"}
                    title={sounds.settings.mode === "persistent" ? "Alert Sounds Repeat Until Acknowledged" : "Alert Sounds Play Once Per Alert"}
                    className="satWeatherSoundSwitchRow"
                    onClick={() => sounds.updateSettings({ mode: sounds.settings.mode === "persistent" ? "single" : "persistent" })}
                  >
                    <FontAwesomeIcon icon={faRepeat} className="satWeatherSoundSwitchIcon" />
                    <span className="satWeatherSoundSwitchLabel">Repeat</span>
                    <span className={`satWeatherSwitch ${sounds.settings.mode === "persistent" ? "satWeatherSwitchOn" : ""}`}>
                      <span className="satWeatherSwitchKnob" />
                    </span>
                  </button>
                </div>
                {sounds.snoozed ? (
                  <button
                    type="button"
                    title="End The Snooze And Resume Alert Sounds And Pop Ups"
                    className="satWeatherHeaderToggle satWeatherHeaderToggleSnoozed"
                    onClick={() => sounds.snooze(0)}
                  >
                    <FontAwesomeIcon icon={faBellSlash} />
                    <span>{`Snoozed Until ${new Date(sounds.settings.snoozeUntil).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`}</span>
                  </button>
                ) : (
                  <Dropdown
                    className="satWeatherSoundDropdown satWeatherSoundDropdownNarrow"
                    value={null}
                    onChange={(option) => sounds.snooze(valueFor(SNOOZE_OPTIONS, option))}
                    options={SNOOZE_OPTIONS.map(([, label]) => label)}
                    placeholder="Snooze"
                  />
                )}
                <Dropdown
                  className="satWeatherSoundDropdown satWeatherSoundDropdownSmall"
                  value={labelFor(SOUND_VOLUME_OPTIONS, sounds.settings.volume)}
                  onChange={(option) => sounds.updateSettings({ volume: valueFor(SOUND_VOLUME_OPTIONS, option) })}
                  options={SOUND_VOLUME_OPTIONS.map(([, label]) => label)}
                  placeholder="Volume"
                />
                <button
                  type="button"
                  title={`Test The ${SOUND_LEVEL_LABELS[sounds.settings.minLevel]} Sound`}
                  className="satEarthCondAlertBtn"
                  onClick={() => sounds.test(sounds.settings.minLevel)}
                >
                  <FontAwesomeIcon icon={faPlay} />
                </button>
              </div>
            </div>
          </div>
        </header>
        )}
        <div className="satEarthCondMainContent">
          {layoutVisibility.sidebar && <aside className="satEarthCondSidebar">{renderControlsPanel()}</aside>}
          {showLeads && <LeadsModal onClose={() => setShowLeads(false)} onChanged={loadHarvestHealth} />}
          <div className="satEarthCondContentArea">
            <nav className="satEarthCondTabs">
              {[
                { id: "overview", label: "Overview", icon: faGlobe },
                { id: "groundEnvironment", label: "Local Conditions & Hazards", icon: faHouseUser },
                { id: "atmosphericEnvironment", label: "Atmospheric Environment", icon: faCloud },
                { id: "electromagneticEnvironment", label: "Space Weather", icon: faSun },
                { id: "temporalForensics", label: "Forecast & Outlook", icon: faClock },
                { id: "global", label: "Weather Maps", icon: faGlobeAmericas },
              ].map(tab => {
                const badge = tab.id === "overview" ? bellItems.length : tab.id === "global" ? 0 : bellItems.filter((item) => item.moduleKey === tab.id).length;
                return (
                  <button key={tab.id} className={`satEarthCondTab ${activeTab === tab.id ? "satEarthCondTabActive" : ""}`} onClick={() => setActiveTab(tab.id)}>
                    <FontAwesomeIcon icon={tab.icon} />
                    <span>{tab.label}</span>
                    {badge > 0 && <span className="satEarthCondTabBadge">{badge}</span>}
                  </button>
                );
              })}
              <div className="satEarthCondLayoutControls">
                {LAYOUT_TOGGLES.map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    title={`${layoutVisibility[key] ? "Hide" : "Show"} ${label}`}
                    className={`satEarthCondLayoutToggle ${layoutVisibility[key] ? "satEarthCondLayoutToggleActive" : ""}`}
                    onClick={() => setLayoutVisibility(prev => ({ ...prev, [key]: !prev[key] }))}
                  >
                    <FontAwesomeIcon icon={layoutVisibility[key] ? faEye : faEyeSlash} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </nav>
            <div className="satEarthCondTabContent" ref={tabContentRef} onClick={handleExpandClick}>
              {loading && !consolidatedData ? (
                <div className="satEarthCondLoadingState">
                  <div className="loading-circle" />
                </div>
              ) : errors.length > 0 && !consolidatedData ? (
                <div className="disconnectedNoResults satEarthCondFullHeight">
                  <div className="disconnectedNoResultCell">
                    <FontAwesomeIcon icon={faExclamationTriangle} size="5x" className="disconnectedNoResultsIcon" />
                    <div className="disconnectedNoResultsText">The conditions services could not be reached.</div>
                    <div className="disconnectedNoResultsButtons">
                      <button className="disconnectedNoResultsRefresh" onClick={fetchConsolidatedEvaluation} disabled={loading}>
                        {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faRefresh} />} Refresh
                      </button>
                    </div>
                  </div>
                </div>
              ) : renderCurrentTabContent()}
            </div>
          </div>
        </div>
        {layoutVisibility.footer && (
        <footer className="satEarthCondFooter">
          <div className="satEarthCondFooterContent">
            <span>Last Updated: {new Date().toLocaleTimeString()}</span>
            <span>Latency: {performanceMetrics.latency}ms</span>
            <span>Modules: {consolidatedData?.module_statuses?.length || 0}/5</span>
            <span>Alerts: {bellItems.length}</span>
            <span>Violations: {allViolations.length}</span>
            <span>Status: {decision.status}</span>
          </div>
        </footer>
        )}
      </div>
      )}
      {apiError && (
        <div className="satWeatherNotification satWeatherNotificationError">
          <FontAwesomeIcon icon={faExclamationCircle} />
          <span>{apiError}</span>
          <button onClick={() => setApiError(null)}><FontAwesomeIcon icon={faTimes} /></button>
        </div>
      )}
      {apiSuccess && (
        <div className="satWeatherNotification satWeatherNotificationSuccess">
          <FontAwesomeIcon icon={faCheckCircle} />
          <span>{apiSuccess}</span>
          <button onClick={() => setApiSuccess(null)}><FontAwesomeIcon icon={faTimes} /></button>
        </div>
      )}
      {renderAckModal()}
      <AreaModal open={areaModalOpen} onClose={() => setAreaModalOpen(false)} title={editingAreaId ? "Edit Monitored Area" : "Add Monitored Area"}>
        <p className="satWeatherModalIntro">
          Monitored areas are evaluated for every condition alert and threshold violation at their center, and choosing Alert For All Areas points the alert bell, the overview console, the counts, and the alert sounds at all of them at once. Choose a point with a radius (a circle around an address or coordinates) or a bounding box (a rectangle).
        </p>
        <div className="satWeatherFormGroup">
          <label>Area Name (Optional)</label>
          <input type="text" value={areaFormData.name} onChange={(event) => handleAreaFormChange("name", event.target.value)} placeholder="Houston Metro or North Bay" maxLength="80" />
        </div>
        <div className="satWeatherFormGroup">
          <Dropdown
            value={areaFormData.mode === "bbox" ? "Bounding Box (Rectangular Area)" : "Point + Radius (Circular Area)"}
            onChange={(option) => handleAreaFormChange("mode", option === "Bounding Box (Rectangular Area)" ? "bbox" : "point_radius")}
            options={["Point + Radius (Circular Area)", "Bounding Box (Rectangular Area)"]}
            placeholder="Area Mode"
          />
        </div>
        {areaFormData.mode === "point_radius" && (
          <>
            <div className="satWeatherFormGroup">
              <label>Address (Geocoded To Coordinates)</label>
              <div className="satWeatherFormInline">
                <AddressAutocomplete
                  value={areaFormData.address}
                  onChange={(text) => handleAreaFormChange("address", text)}
                  onSelect={(place) => setAreaFormData((prev) => ({
                    ...prev,
                    address: place.label,
                    latitude: place.latitude.toFixed(6),
                    longitude: place.longitude.toFixed(6),
                    name: prev.name && prev.name.trim() ? prev.name : (place.city || place.primary)
                  }))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleGeocodeArea();
                    }
                  }}
                  bias={{ latitude: selectedLat, longitude: selectedLon }}
                  placeholder="Start typing an address."
                  style={{ flex: 1 }}
                />
                <button type="button" className="satWeatherModalBtnSecondary satWeatherModalBtnInline" onClick={handleGeocodeArea} disabled={isGeocodingArea || !(areaFormData.address || "").trim()}>
                  {isGeocodingArea ? <><FontAwesomeIcon icon={faSpinner} spin /> Geocoding</> : <><FontAwesomeIcon icon={faLocationCrosshairs} /> Geocode</>}
                </button>
              </div>
            </div>
            <div className="satWeatherFormRow">
              <div className="satWeatherFormGroup"><label>Latitude *</label><input type="number" step="any" value={areaFormData.latitude} onChange={(event) => handleAreaFormChange("latitude", event.target.value)} placeholder="-90 To 90" required /></div>
              <div className="satWeatherFormGroup"><label>Longitude *</label><input type="number" step="any" value={areaFormData.longitude} onChange={(event) => handleAreaFormChange("longitude", event.target.value)} placeholder="-180 To 180" required /></div>
              <div className="satWeatherFormGroup"><label>Radius (km) *</label><input type="number" min="1" max="10000" step="any" value={areaFormData.radius_km} onChange={(event) => handleAreaFormChange("radius_km", event.target.value)} placeholder="100" required /></div>
            </div>
            <button type="button" className="satWeatherModalBtnSecondary" onClick={useSelectedLocationForArea}><FontAwesomeIcon icon={faLocationCrosshairs} /> Use Selected Location</button>
          </>
        )}
        {areaFormData.mode === "bbox" && (
          <>
            <div className="satWeatherFormRow">
              <div className="satWeatherFormGroup"><label>Min Latitude (South) *</label><input type="number" step="any" value={areaFormData.min_lat} onChange={(event) => handleAreaFormChange("min_lat", event.target.value)} placeholder="-90 To 90" required /></div>
              <div className="satWeatherFormGroup"><label>Max Latitude (North) *</label><input type="number" step="any" value={areaFormData.max_lat} onChange={(event) => handleAreaFormChange("max_lat", event.target.value)} placeholder="-90 To 90" required /></div>
            </div>
            <div className="satWeatherFormRow">
              <div className="satWeatherFormGroup"><label>Min Longitude (West) *</label><input type="number" step="any" value={areaFormData.min_lng} onChange={(event) => handleAreaFormChange("min_lng", event.target.value)} placeholder="-180 To 180" required /></div>
              <div className="satWeatherFormGroup"><label>Max Longitude (East) *</label><input type="number" step="any" value={areaFormData.max_lng} onChange={(event) => handleAreaFormChange("max_lng", event.target.value)} placeholder="-180 To 180" required /></div>
            </div>
          </>
        )}
        <div className="satWeatherModalActions">
          {editingAreaId && <button className="satWeatherModalBtnDanger" onClick={() => deleteArea(editingAreaId)}><FontAwesomeIcon icon={faTrash} /> Delete Area</button>}
          <button className="satWeatherModalBtnSecondary" onClick={() => setAreaModalOpen(false)}>Cancel</button>
          <button className="satWeatherModalBtnPrimary" onClick={() => handleSaveArea(true)}><FontAwesomeIcon icon={faSave} /> Save Area</button>
        </div>
      </AreaModal>
      {showLocationPicker && (
        <LocationPickerModal
          initialLat={selectedLat}
          initialLon={selectedLon}
          initialLabel={locationName === CUSTOM_LOCATION_LABEL ? null : locationName}
          onCancel={() => setShowLocationPicker(false)}
          onConfirm={(choice) => {
            const key = `${choice.lat},${choice.lon}`;
            setCustomLocationLabel({ key, label: choice.label || CUSTOM_LOCATION_LABEL });
            setSelectedLocation(key);
            setShowLocationPicker(false);
          }}
        />
      )}
      {expandedView && (
        <div className="satEarthCondModalOverlay" onClick={() => setExpandedView(null)}>
          <div className="satEarthCondModal" onClick={(event) => event.stopPropagation()}>
            <div className="satEarthCondModalHeader">
              <h4 className="satEarthCondModalTitle">{expandedView.title}</h4>
              <button type="button" className="satEarthCondModalClose" onClick={() => setExpandedView(null)} aria-label="Close">
                <FontAwesomeIcon icon={faXmarkSquare} />
              </button>
            </div>
            <div className="satEarthCondModalBody">
              {expandedView.chart ? (
                <ResponsiveChart
                  option={{
                    ...expandedView.chart,
                    xAxis: { ...expandedView.chart.xAxis, axisLabel: { ...expandedView.chart.xAxis?.axisLabel, overflow: "none", width: undefined } },
                    yAxis: { ...expandedView.chart.yAxis, axisLabel: { ...expandedView.chart.yAxis?.axisLabel, overflow: "none", width: undefined } }
                  }}
                  className="satEarthCondChart satEarthCondChartExpanded"
                />
              ) : (
                <div className="satEarthCondExpandedContent satWeatherExpandedContent" dangerouslySetInnerHTML={{ __html: expandedView.html }} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EarthConditions;