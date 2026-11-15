import React, { useEffect, useLayoutEffect, useRef, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import * as THREE from "three";
import * as TWEEN from "three/examples/jsm/libs/tween.module.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faInfoCircle, faPlay, faPause, faSatellite, faChartLine,
  faXmark, faXmarkSquare, faSquareCheck, faClone,
  faSun, faBolt, faTriangleExclamation, faGlobe, faBrain, faEye,
  faTowerBroadcast, faRadiation, faWind, faMagnet, faClock, faFire,
  faCircleNodes, faSatelliteDish, faMapLocation, faRoute, faSpinner,
  faCheckCircle, faXmarkCircle, faMicrochip, faMagnifyingGlass, faFilter,
  faSort, faGauge, faShieldHalved, faArrowTrendDown, faArrowTrendUp,
  faRulerCombined, faTemperatureHigh, faAtom, faDiagramProject,
  faNetworkWired, faChartArea, faChartColumn, faTable, faList,
  faFlask, faPersonChalkboard, faBookOpen, faMicroscope, faLayerGroup,
  faSquareCaretUp, faSquareCaretDown, faSquarePlus, faSquareMinus, faEyeSlash, faBell,
  faLightbulb, faBan, faCheck, faDownload, faVolumeHigh, faVolumeXmark, faBellSlash, faRepeat, faMapPin,
  faPlus, faEdit, faTrash, faSave, faTimes, faExclamationCircle, faCheckDouble, faForwardStep, faBackwardStep,
  faLocationCrosshairs, faLocationDot, faMapMarkerAlt, faSearchPlus, faGlobeAmericas
} from "@fortawesome/free-solid-svg-icons";
import * as satelliteJs from "satellite.js";
import Nav from "../../../../helpers/Nav.jsx";
import Dropdown from "../../../../helpers/Dropdown.jsx";
import useAuth from "../../../../UseAuth.jsx";
import { openDB } from "idb";
import "../../../../styles/helperStyles/Switch.css";
import "../../../../styles/mainStyles/Sat/Trackers/WeatherTracker/WeatherTracker.css";
import "../../../../styles/mainStyles/Sat/Trackers/SatelliteTracker/SatelliteTracker.css";
import "../../../../styles/helperStyles/LoadingSpinner.css";
import "../../../../styles/helperStyles/Disconnected.css";

const SCENE_EARTH_RADIUS = 6.371;
const EARTH_RADIUS_KM = 6378.137;
const EARTH_GM = 398600.4418;
const SUN_RADIUS_KM = 696000;
const AU_KM = 149597870.7;
const NON_BLOOM_LAYER = 1;

const ORBITAL_CONSTANTS = {
  JULIAN_DATE_J2000: 2451545.0,
  DEG_TO_RAD: Math.PI / 180.0,
  SCALE_FACTOR: 200
};

const PERFORMANCE_CONSTANTS = {
  MAX_VISIBLE_SATELLITES: 8000,
  UPDATE_FREQUENCY: 2,
  FRUSTUM_MARGIN: 1.5,
  PRESELECT_COUNT: 100,
  VIRTUAL_SCROLL_ITEM_HEIGHT: 44,
  VIRTUAL_SCROLL_BUFFER: 10,
  TRAIL_LENGTH: 30,
  CONJUNCTION_THRESHOLD_KM: 50,
  CONJUNCTION_CHECK_INTERVAL_MS: 5000,
  CONJUNCTION_GRID_CELL_KM: 50,
  STREAM_CONNECTION_TIMEOUT_MS: 30000,
  SEARCH_DEBOUNCE_MS: 200
};

const CATEGORY_COLORS = {
  "LEO": "#4ECDC4",
  "MEO": "#FF9500",
  "GEO": "#FF6B6B",
  "HEO": "#FFE66D",
  "Deep Space": "#A8E6CF",
  "Starlink": "#00D4FF",
  "OneWeb": "#FF4081",
  "Military": "#FFA726",
  "Weather": "#66BB6A",
  "Communication": "#AB47BC",
  "Navigation": "#42A5F5",
  "Scientific": "#EF5350",
  "Debris": "#808080",
  "CubeSat": "#E91E63",
  "Amateur": "#9C27B0",
  "Earth Observation": "#00BCD4",
  "Spy/Reconnaissance": "#FF5722"
};

const SPEED_OPTIONS = [
  { label: "-10 Hours/Sec", value: -36000 },
  { label: "-5 Hours/Sec", value: -18000 },
  { label: "-1 Hour/Sec", value: -3600 },
  { label: "Real-Time", value: 1 },
  { label: "1 Hour/Sec", value: 3600 },
  { label: "5 Hours/Sec", value: 18000 },
  { label: "10 Hours/Sec", value: 36000 }
];

const FPS_OPTIONS = [30, 60, 120, 144];

const GROUND_TRACK_CITIES = [
  { name: "New York", lat: 40.71, lon: -74.01 },
  { name: "London", lat: 51.51, lon: -0.13 },
  { name: "Tokyo", lat: 35.68, lon: 139.69 },
  { name: "Sydney", lat: -33.87, lon: 151.21 },
  { name: "São Paulo", lat: -23.55, lon: -46.63 },
  { name: "Cape Town", lat: -33.92, lon: 18.42 },
  { name: "Mumbai", lat: 19.08, lon: 72.88 },
  { name: "Cairo", lat: 30.04, lon: 31.24 },
  { name: "Los Angeles", lat: 34.05, lon: -118.24 },
  { name: "Singapore", lat: 1.35, lon: 103.82 },
  { name: "Anchorage", lat: 61.22, lon: -149.90 },
  { name: "Moscow", lat: 55.75, lon: 37.62 },
  { name: "Buenos Aires", lat: -34.61, lon: -58.38 },
  { name: "Beijing", lat: 39.90, lon: 116.41 },
  { name: "Houston", lat: 29.76, lon: -95.37 },
  { name: "Denver", lat: 39.74, lon: -104.99 },
  { name: "Chicago", lat: 41.88, lon: -87.63 },
  { name: "Miami", lat: 25.76, lon: -80.19 },
  { name: "Mexico City", lat: 19.43, lon: -99.13 },
  { name: "Lima", lat: -12.05, lon: -77.04 },
  { name: "Bogotá", lat: 4.71, lon: -74.07 },
  { name: "Lagos", lat: 6.52, lon: 3.38 },
  { name: "Nairobi", lat: -1.29, lon: 36.82 },
  { name: "Dubai", lat: 25.20, lon: 55.27 },
  { name: "Delhi", lat: 28.61, lon: 77.21 },
  { name: "Bangkok", lat: 13.76, lon: 100.50 },
  { name: "Shanghai", lat: 31.23, lon: 121.47 },
  { name: "Seoul", lat: 37.57, lon: 126.98 },
  { name: "Jakarta", lat: -6.21, lon: 106.85 },
  { name: "Paris", lat: 48.86, lon: 2.35 },
  { name: "Berlin", lat: 52.52, lon: 13.41 },
  { name: "Istanbul", lat: 41.01, lon: 28.98 },
  { name: "Johannesburg", lat: -26.20, lon: 28.04 },
  { name: "Perth", lat: -31.95, lon: 115.86 },
  { name: "Auckland", lat: -36.85, lon: 174.76 },
  { name: "Honolulu", lat: 21.31, lon: -157.86 },
  { name: "Reykjavik", lat: 64.15, lon: -21.94 },
  { name: "Santiago", lat: -33.45, lon: -70.67 },
  { name: "Vancouver", lat: 49.28, lon: -123.12 },
  { name: "Toronto", lat: 43.65, lon: -79.38 }
];

const SOURCES = {
  apiBase: import.meta.env.VITE_API_BASE_URL,
  endpoints: {
    satelliteStream: "/satellite-stream",
    spaceWeather: "/space-weather",
    spaceWeatherAI: "/space-weather-ai",
    missionIntelligence: "/mission-intelligence",
    observationData: "/observation-data",
    constellationHealth: "/constellation-health",
    decayWatch: "/decay-watch",
    satelliteAlerts: "/satellite-alerts",
    alertAnalysis: "/satellite-alerts/analysis",
    areas: "/risk/areas",
    reverseGeocode: "/reverse-geocode",
    locationSearch: "/location-search"
  },
  assets: {
    maplibreCss: "https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css",
    maplibreScript: "https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js",
    mapkitScript: "https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.js",
    mapkitToken: import.meta.env.VITE_APPLE_MAPS_KEY,
    satelliteTiles: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    labelTiles: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
    earthMapCss: "https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.css",
    earthMapScript: "https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.js"
  },
  earthView: {
    textureZoom: 3,
    tileSize: 256,
    center: [0, 20],
    zoom: 1.6,
    minZoom: 0,
    maxZoom: 10,
    refreshMs: 500
  },
  geocoding: {
    photon: "https://photon.komoot.io/api/",
    nominatim: "https://nominatim.openstreetmap.org/search",
    userAgent: "SatelliteTracker/1.0",
    minQueryLength: 3,
    debounceMs: 300,
    resultLimit: 6,
    cacheLimit: 100,
    attribution: "Photon · © OpenStreetMap Contributors"
  },
  alerts: {
    refreshMs: 60 * 1000
  },
  defaultLocation: { lat: 29.7604, lon: -95.3698 },
  tables: {
    tightAt: 14,
    wrapAt: 28
  },
  persistence: {
    dbName: "SatelliteTrackerStateDB",
    storeName: "state",
    recordId: "state",
    restoreFlag: "satelliteTrackerRestoreInFlight",
    restoreSettleMs: 3000,
    saveDebounceMs: 500
  },
  sounds: {
    defaults: { enabled: false, minLevel: "warning", scope: "view", volume: 0.6, mode: "single", snoozeUntil: 0 },
    repeatGapSeconds: 0.8,
    scheduleAheadSeconds: 120,
    topUpSeconds: 20
  },
  worldMapImage: "https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57752/land_shallow_topo_2048.jpg",
  harvest: {
    base: `${import.meta.env.VITE_API_BASE_URL}/harvest`,
    domain: "satellite-tracker",
    productPrefix: "norad-",
    healthRefreshMs: 60 * 1000,
    historyRanges: [["30d", "30D", 30 * 86400], ["90d", "90D", 90 * 86400], ["1y", "1Y", 365 * 86400], ["5y", "5Y", 5 * 365 * 86400]],
    historyPoints: 500,
    backfillThreshold: 5,
    exportOptions: [["Element History CSV", "csv"], ["Element History JSON", "json"]],
    jobPattern: /^(tracker|celestrak|spacetrack):/,
    statusColors: { Healthy: "#4ecdc4", Degraded: "#FF9500", Idle: "#919baf", "Needs Schema": "#ff6b6b", Loading: "#919baf" }
  }
};

const apiUrl = (key) => `${SOURCES.apiBase}${SOURCES.endpoints[key]}`;

const dateToJulianDate = (date) => {
  return date.getTime() / 86400000.0 + 2440587.5;
};

const eciToScene = (eci) => {
  const distKm = Math.sqrt(eci.x * eci.x + eci.y * eci.y + eci.z * eci.z);
  if (distKm <= 0 || !Number.isFinite(distKm)) {
    return null;
  }
  const altKm = distKm - EARTH_RADIUS_KM;
  const sceneR = SCENE_EARTH_RADIUS + altKm / ORBITAL_CONSTANTS.SCALE_FACTOR;
  const scale = sceneR / distKm;
  return new THREE.Vector3(eci.x * scale, eci.z * scale, -eci.y * scale);
};

const computeSunDirectionECI = (date) => {
  const targetJD = dateToJulianDate(date);
  const T = (targetJD - 2451545.0) / 36525.0;
  const L = (280.46646 + 36000.76983 * T) * ORBITAL_CONSTANTS.DEG_TO_RAD;
  const g = (357.52911 + 35999.05029 * T) * ORBITAL_CONSTANTS.DEG_TO_RAD;
  const lambda = L + (1.914602 - 0.004817 * T) * Math.sin(g) * ORBITAL_CONSTANTS.DEG_TO_RAD
    + (0.019993 - 0.000101 * T) * Math.sin(2 * g) * ORBITAL_CONSTANTS.DEG_TO_RAD;
  const obliquity = (23.4393 - 0.0130042 * T) * ORBITAL_CONSTANTS.DEG_TO_RAD;
  const x = Math.cos(lambda);
  const y = Math.cos(obliquity) * Math.sin(lambda);
  const z = Math.sin(obliquity) * Math.sin(lambda);
  return { x, y, z };
};

const niceTickStep = (range, target) => {
  const raw = range / Math.max(1, target);
  const mag = Math.pow(10, Math.floor(Math.log10(Math.abs(raw))));
  const norm = raw / mag;
  let step;
  if (norm < 1.5) step = 1;
  else if (norm < 3) step = 2;
  else if (norm < 7) step = 5;
  else step = 10;
  return step * mag;
};

const formatChartTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mon = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${mon}-${dd} ${hh}:${mm}Z`;
};

const formatChartTimeFull = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toUTCString().substring(0, 25);
};

const formatGeneratedAt = (ts) => {
  if (!ts) return "—";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString();
};

const csvQuote = (val) => {
  const s = String(val === null || val === undefined ? "" : val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return `"${s}"`;
};

const safeRenderText = (value) => {
  if (value === null || value === undefined) return "—";
  const sanitize = (s) => typeof s === "string" ? s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1") : s;
  if (typeof value === "string") return sanitize(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value.map(v => {
      if (v === null || v === undefined) return "";
      if (typeof v === "string") return sanitize(v);
      if (typeof v === "number" || typeof v === "boolean") return String(v);
      if (typeof v === "object") {
        const candidate = v.text || v.description || v.value || v.label || v.name || v.event;
        if (typeof candidate === "string") return sanitize(candidate);
        const stringEntries = Object.entries(v).filter(([, val]) => typeof val === "string" || typeof val === "number");
        if (stringEntries.length > 0) {
          return stringEntries.map(([k, val]) => `${k}: ${sanitize(String(val))}`).join(", ");
        }
        return "";
      }
      return String(v);
    }).filter(s => s && s.length > 0).join(". ");
  }
  if (typeof value === "object") {
    const candidate = value.text || value.description || value.value || value.label || value.name || value.event;
    if (typeof candidate === "string") return sanitize(candidate);
    const stringEntries = Object.entries(value).filter(([, val]) => typeof val === "string" || typeof val === "number");
    if (stringEntries.length > 0) {
      return stringEntries.map(([k, val]) => `${k}: ${sanitize(String(val))}`).join(". ");
    }
    return "—";
  }
  return String(value);
};

const tleAgeColor = (ageDays) => {
  if (ageDays === null || ageDays === undefined) return "#808080";
  if (ageDays < 1) return "#4ecdc4";
  if (ageDays < 3) return "#7fe9e1";
  if (ageDays < 7) return "#ffd93d";
  if (ageDays < 14) return "#FF9500";
  return "#ff6b6b";
};

const tleAgeLabel = (ageDays) => {
  if (ageDays === null || ageDays === undefined) return "Unknown";
  if (ageDays < 1) return "Fresh (<1d)";
  if (ageDays < 3) return "Recent (1-3d)";
  if (ageDays < 7) return "Aging (3-7d)";
  if (ageDays < 14) return "Stale (1-2w)";
  return "Very stale (>2w)";
};

const enrichSatellite = (s) => {
  if (!s || !s.tle || !s.tle.line1 || !s.tle.line2) {
    return s;
  }
  try {
    const line1 = s.tle.line1;
    const line2 = s.tle.line2;
    const epochYearRaw = parseInt(line1.substring(18, 20));
    const epochYear = Number.isFinite(epochYearRaw)
      ? (epochYearRaw < 57 ? 2000 + epochYearRaw : 1900 + epochYearRaw)
      : null;
    const epochDay = parseFloat(line1.substring(20, 32));
    const inclination = parseFloat(line2.substring(8, 16));
    const raan = parseFloat(line2.substring(17, 25));
    const eccentricity = parseFloat("0." + line2.substring(26, 33));
    const argOfPerigee = parseFloat(line2.substring(34, 42));
    const meanAnomaly = parseFloat(line2.substring(43, 51));
    const meanMotion = parseFloat(line2.substring(52, 63));
    const sma = Math.pow(EARTH_GM / Math.pow(meanMotion * 2 * Math.PI / 86400, 2), 1 / 3);
    const apogee = sma * (1 + eccentricity) - EARTH_RADIUS_KM;
    const perigee = sma * (1 - eccentricity) - EARTH_RADIUS_KM;
    const velocity = Math.sqrt(EARTH_GM / sma);
    const specificEnergy = -EARTH_GM / (2 * sma);
    const angularMomentum = Math.sqrt(EARTH_GM * sma * (1 - eccentricity * eccentricity));
    const meanAngularMotion = (2 * Math.PI) / (s.period * 60);
    return {
      ...s,
      epochYear,
      epochDay: Math.round(epochDay * 100000) / 100000,
      inclination: Math.round(inclination * 100) / 100,
      raan: Math.round(raan * 100) / 100,
      eccentricity: Math.round(eccentricity * 1000000) / 1000000,
      argOfPerigee: Math.round(argOfPerigee * 100) / 100,
      meanAnomaly: Math.round(meanAnomaly * 100) / 100,
      meanMotion: Math.round(meanMotion * 100000) / 100000,
      semiMajorAxis: Math.round(sma * 100) / 100,
      apogee: Math.round(apogee * 10) / 10,
      perigee: Math.round(perigee * 10) / 10,
      velocity: Math.round(velocity * 1000) / 1000,
      specificEnergy: Math.round(specificEnergy * 1000) / 1000,
      angularMomentum: Math.round(angularMomentum * 100) / 100,
      meanAngularMotion: Math.round(meanAngularMotion * 1000000) / 1000000
    };
  } catch (error) {
    return s;
  }
};

const computeRepeatGroundTrack = (periodMin) => {
  if (!Number.isFinite(periodMin) || periodMin <= 0) return null;
  const siderealDayMin = 1436.07;
  const revsPerSiderealDay = siderealDayMin / periodMin;
  let bestDays = null;
  let bestRevs = null;
  let bestError = Infinity;
  for (let days = 1; days <= 30; days++) {
    const revs = revsPerSiderealDay * days;
    const nearest = Math.round(revs);
    if (nearest <= 0) continue;
    const error = Math.abs(revs - nearest);
    if (error < bestError) {
      bestError = error;
      bestDays = days;
      bestRevs = nearest;
    }
    if (error < 0.001) break;
  }
  return bestDays !== null && bestError < 0.05 ? { days: bestDays, revs: bestRevs, error: bestError } : null;
};

const computeAdvancedDerivatives = (sat) => {
  if (!sat || !sat.semiMajorAxis) {
    return {};
  }
  const sma = sat.semiMajorAxis;
  const ecc = sat.eccentricity || 0;
  const inc = (sat.inclination || 0) * Math.PI / 180;
  const J2 = 1.08263e-3;
  const Re = EARTH_RADIUS_KM;
  const n = Math.sqrt(EARTH_GM / Math.pow(sma, 3));
  const p = sma * (1 - ecc * ecc);
  const raanRate = -1.5 * n * J2 * Math.pow(Re / p, 2) * Math.cos(inc) * 86400 * 180 / Math.PI;
  const argpRate = 0.75 * n * J2 * Math.pow(Re / p, 2) * (5 * Math.cos(inc) * Math.cos(inc) - 1) * 86400 * 180 / Math.PI;
  const sunSyncArg = -Math.pow(sma / 12352.0, 7 / 2);
  const sunSyncInc = (sunSyncArg >= -1 && sunSyncArg <= 1) ? Math.acos(sunSyncArg) * 180 / Math.PI : null;
  const isSunSync = sunSyncInc !== null && Math.abs(sunSyncInc - (sat.inclination || 0)) < 2;
  const escapeVelocity = Math.sqrt(2 * EARTH_GM / sma);
  const orbitCircumference = 2 * Math.PI * sma * (1 - ecc * ecc / 4);
  const repeat = computeRepeatGroundTrack(sat.period);
  const repeatGroundTrackDays = repeat ? repeat.days : null;
  const repeatGroundTrackRevs = repeat ? repeat.revs : null;
  const flatness = ecc;
  const apsidalPrecessionPeriod = argpRate !== 0 ? Math.abs(360 / argpRate) : Infinity;
  const nodalPrecessionPeriod = raanRate !== 0 ? Math.abs(360 / raanRate) : Infinity;
  return {
    raanRate: Math.round(raanRate * 1000000) / 1000000,
    argpRate: Math.round(argpRate * 1000000) / 1000000,
    sunSyncInclination: sunSyncInc !== null ? Math.round(sunSyncInc * 100) / 100 : null,
    isSunSynchronous: isSunSync,
    escapeVelocity: Math.round(escapeVelocity * 1000) / 1000,
    orbitCircumference: Math.round(orbitCircumference),
    repeatGroundTrackDays,
    repeatGroundTrackRevs,
    apsidalPrecessionPeriod: Number.isFinite(apsidalPrecessionPeriod) ? Math.round(apsidalPrecessionPeriod) : null,
    nodalPrecessionPeriod: Number.isFinite(nodalPrecessionPeriod) ? Math.round(nodalPrecessionPeriod) : null,
    flatness: Math.round(flatness * 10000) / 10000
  };
};

const computeGroundTrack = (satrec, startDate, durationMinutes, samples) => {
  const points = [];
  const startMs = startDate.getTime();
  for (let i = 0; i <= samples; i++) {
    const t = new Date(startMs + (i / samples) * durationMinutes * 60000);
    try {
      const pv = satelliteJs.propagate(satrec, t);
      if (!pv.position) continue;
      const gmst = satelliteJs.gstime(t);
      const geo = satelliteJs.eciToGeodetic(pv.position, gmst);
      points.push({
        lat: geo.latitude * 180 / Math.PI,
        lon: geo.longitude * 180 / Math.PI,
        alt: geo.height,
        time: t.toISOString()
      });
    } catch (error) {}
  }
  return points;
};

const computePassPredictions = (satrec, observerLat, observerLon, observerAlt, hours, minElevation) => {
  if (!satrec) {
    return [];
  }
  const passes = [];
  const observerGd = {
    latitude: observerLat * Math.PI / 180,
    longitude: observerLon * Math.PI / 180,
    height: (observerAlt || 0) / 1000
  };

  const now = new Date();
  const endTime = new Date(now.getTime() + hours * 3600000);
  const stepSec = 30;

  let inPass = false;
  let passStart = null;
  let maxEl = -90;
  let maxElTime = null;
  let maxAz = 0;

  for (let t = now.getTime(); t < endTime.getTime(); t += stepSec * 1000) {
    const date = new Date(t);
    try {
      const pv = satelliteJs.propagate(satrec, date);
      if (!pv.position) continue;
      const gmst = satelliteJs.gstime(date);
      const ecf = satelliteJs.eciToEcf(pv.position, gmst);
      const look = satelliteJs.ecfToLookAngles(observerGd, ecf);
      const elevation = look.elevation * 180 / Math.PI;
      const azimuth = look.azimuth * 180 / Math.PI;

      if (elevation > 0) {
        if (!inPass) {
          inPass = true;
          passStart = { time: date, elevation, azimuth };
          maxEl = elevation;
          maxElTime = date;
          maxAz = azimuth;
        } else {
          if (elevation > maxEl) {
            maxEl = elevation;
            maxElTime = date;
            maxAz = azimuth;
          }
        }
      } else if (inPass) {
        inPass = false;
        if (maxEl >= (minElevation || 10) && passStart) {
          passes.push({
            aos: passStart.time.toISOString(),
            aosAzimuth: Math.round(passStart.azimuth),
            tca: maxElTime.toISOString(),
            tcaElevation: Math.round(maxEl * 10) / 10,
            tcaAzimuth: Math.round(maxAz),
            los: date.toISOString(),
            losAzimuth: Math.round(azimuth),
            durationSec: Math.round((date.getTime() - passStart.time.getTime()) / 1000)
          });
          if (passes.length >= 10) {
            break;
          }
        }
        passStart = null;
        maxEl = -90;
      }
    } catch (error) {}
  }
  return passes;
};

const detectConjunctions = (satellites, satelliteData, thresholdKm, currentDate, getOrCreateSatrec) => {
  const conjunctions = [];
  const positions = [];

  for (let i = 0; i < satellites.length; i++) {
    const sat = satellites[i];
    let eciKm = null;

    if (sat.active) {
      const data = satelliteData.get(sat.id);
      if (data && data.eciKm) {
        eciKm = data.eciKm;
      }
    }

    if (!eciKm && currentDate && getOrCreateSatrec) {
      const satrec = getOrCreateSatrec(sat);
      if (satrec) {
        try {
          const pv = satelliteJs.propagate(satrec, currentDate);
          if (pv.position && Number.isFinite(pv.position.x) && Number.isFinite(pv.position.y) && Number.isFinite(pv.position.z)) {
            eciKm = pv.position;
          }
        } catch (error) {}
      }
    }

    if (!eciKm) continue;

    const distFromCenterKm = Math.sqrt(eciKm.x * eciKm.x + eciKm.y * eciKm.y + eciKm.z * eciKm.z);
    const altitudeKm = distFromCenterKm - EARTH_RADIUS_KM;
    positions.push({ sat, eciKm, distKm: distFromCenterKm, altitudeKm });
  }

  const cellSize = Math.max(thresholdKm, PERFORMANCE_CONSTANTS.CONJUNCTION_GRID_CELL_KM);

  const grid = new Map();
  const cellKeyFor = (px, py, pz) => {
    const cx = Math.floor(px / cellSize);
    const cy = Math.floor(py / cellSize);
    const cz = Math.floor(pz / cellSize);
    return `${cx},${cy},${cz}`;
  };

  for (let i = 0; i < positions.length; i++) {
    const p = positions[i];
    const key = cellKeyFor(p.eciKm.x, p.eciKm.y, p.eciKm.z);
    let bucket = grid.get(key);
    if (!bucket) {
      bucket = [];
      grid.set(key, bucket);
    }
    bucket.push(i);
  }

  const checkedPairs = new Set();
  const neighborOffsets = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dz = -1; dz <= 1; dz++) {
        neighborOffsets.push([dx, dy, dz]);
      }
    }
  }

  for (let i = 0; i < positions.length; i++) {
    const a = positions[i];
    const cx = Math.floor(a.eciKm.x / cellSize);
    const cy = Math.floor(a.eciKm.y / cellSize);
    const cz = Math.floor(a.eciKm.z / cellSize);
    for (let n = 0; n < neighborOffsets.length; n++) {
      const off = neighborOffsets[n];
      const neighborKey = `${cx + off[0]},${cy + off[1]},${cz + off[2]}`;
      const bucket = grid.get(neighborKey);
      if (!bucket) continue;
      for (let k = 0; k < bucket.length; k++) {
        const j = bucket[k];
        if (j <= i) continue;
        const pairKey = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (checkedPairs.has(pairKey)) continue;
        checkedPairs.add(pairKey);
        const b = positions[j];

        const dx2 = a.eciKm.x - b.eciKm.x;
        const dy2 = a.eciKm.y - b.eciKm.y;
        const dz2 = a.eciKm.z - b.eciKm.z;
        const realKm = Math.sqrt(dx2 * dx2 + dy2 * dy2 + dz2 * dz2);
        const altDiff = Math.abs(a.altitudeKm - b.altitudeKm);

        if (realKm < thresholdKm) {
          conjunctions.push({
            a: a.sat,
            b: b.sat,
            distanceKm: Math.round(realKm * 100) / 100,
            altitudeDifferenceKm: Math.round(altDiff * 100) / 100,
            severity: realKm < 5 ? "Critical" : realKm < 20 ? "High" : realKm < 35 ? "Moderate" : "Low",
            relativeBearingDeg: Math.round(Math.atan2(dz2, dx2) * 180 / Math.PI),
            combinedAltitude: Math.round((a.altitudeKm + b.altitudeKm) / 2)
          });
        }
      }
    }
  }
  return conjunctions.sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 200);
};

const createTextSprite = (text, color) => {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const fontSize = 14;
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  context.font = `600 ${fontSize}px ${fontFamily}`;
  const textMetrics = context.measureText(text);
  const textWidth = Math.ceil(textMetrics.width);
  const padding = 6;
  const canvasWidth = Math.max(64, textWidth + padding * 2 + 4);
  const canvasHeight = fontSize + padding * 2 + 4;
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  context.clearRect(0, 0, canvas.width, canvas.height);
  const colorHex = `#${color.toString(16).padStart(6, "0")}`;
  context.fillStyle = "rgba(10, 12, 15, 0.85)";
  const radius = 3;
  context.beginPath();
  context.roundRect(2, 2, canvas.width - 4, canvas.height - 4, radius);
  context.fill();
  context.strokeStyle = colorHex;
  context.lineWidth = 1;
  context.globalAlpha = 0.6;
  context.stroke();
  context.globalAlpha = 1;
  context.font = `600 ${fontSize}px ${fontFamily}`;
  context.fillStyle = colorHex;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.globalAlpha = 0.9;
  context.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, sizeAttenuation: false });
  const sprite = new THREE.Sprite(material);
  const aspect = canvasWidth / canvasHeight;
  sprite.scale.set(0.035 * aspect, 0.035, 1);
  sprite.layers.set(NON_BLOOM_LAYER);
  return sprite;
};

const createEquatorialGrid = () => {
  const group = new THREE.Group();
  group.name = "EquatorialGrid";
  const gridRadius = 250;
  const radialSegments = 24;

  for (let i = 0; i < radialSegments; i++) {
    const angle = (i / radialSegments) * Math.PI * 2;
    const points = [
      new THREE.Vector3(SCENE_EARTH_RADIUS * Math.cos(angle), 0, SCENE_EARTH_RADIUS * Math.sin(angle)),
      new THREE.Vector3(gridRadius * Math.cos(angle), 0, gridRadius * Math.sin(angle))
    ];
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x4a5a6a,
      transparent: true,
      opacity: 0.25
    });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    group.add(line);
  }

  const distances = [20, 40, 60, 80, 100, 150, 200, 250];
  distances.forEach(dist => {
    const circlePoints = [];
    for (let i = 0; i <= 64; i++) {
      const angle = (i / 64) * Math.PI * 2;
      circlePoints.push(new THREE.Vector3(dist * Math.cos(angle), 0, dist * Math.sin(angle)));
    }
    const circleGeometry = new THREE.BufferGeometry().setFromPoints(circlePoints);
    const circleMaterial = new THREE.LineBasicMaterial({
      color: 0x4a5a6a,
      transparent: true,
      opacity: 0.15
    });
    const circle = new THREE.Line(circleGeometry, circleMaterial);
    group.add(circle);
  });

  return group;
};

const createAxisMarkers = () => {
  const group = new THREE.Group();
  group.name = "AxisMarkers";
  const axisLength = 200;
  const axisRadius = 0.1;

  const xGeometry = new THREE.CylinderGeometry(axisRadius, axisRadius, axisLength, 8);
  const xMaterial = new THREE.MeshBasicMaterial({ color: 0x6a9a9a, transparent: true, opacity: 0.7 });
  const xAxis = new THREE.Mesh(xGeometry, xMaterial);
  xAxis.rotation.z = -Math.PI / 2;
  xAxis.position.set(axisLength / 2 + SCENE_EARTH_RADIUS, 0, 0);
  group.add(xAxis);

  const yGeometry = new THREE.CylinderGeometry(axisRadius, axisRadius, axisLength, 8);
  const yMaterial = new THREE.MeshBasicMaterial({ color: 0x6a9a6a, transparent: true, opacity: 0.7 });
  const yAxis = new THREE.Mesh(yGeometry, yMaterial);
  yAxis.position.set(0, axisLength / 2 + SCENE_EARTH_RADIUS, 0);
  group.add(yAxis);

  const zGeometry = new THREE.CylinderGeometry(axisRadius, axisRadius, axisLength, 8);
  const zMaterial = new THREE.MeshBasicMaterial({ color: 0x6a6a9a, transparent: true, opacity: 0.7 });
  const zAxis = new THREE.Mesh(zGeometry, zMaterial);
  zAxis.rotation.x = Math.PI / 2;
  zAxis.position.set(0, 0, axisLength / 2 + SCENE_EARTH_RADIUS);
  group.add(zAxis);

  const xLabel = createTextSprite("X (Vernal Eq.)", 0x8ababa);
  xLabel.position.set(axisLength + SCENE_EARTH_RADIUS + 12, 2, 0);
  group.add(xLabel);

  const yLabel = createTextSprite("Y (90E Long)", 0x8aba8a);
  yLabel.position.set(0, axisLength + SCENE_EARTH_RADIUS + 12, 0);
  group.add(yLabel);

  const zLabel = createTextSprite("Z (North Pole)", 0x8a8aba);
  zLabel.position.set(0, 2, axisLength + SCENE_EARTH_RADIUS + 12);
  group.add(zLabel);

  const originLabel = createTextSprite("Earth Center", 0x999999);
  originLabel.position.set(0, -SCENE_EARTH_RADIUS - 4, 0);
  group.add(originLabel);

  return group;
};

const createAltitudeBands = () => {
  const group = new THREE.Group();
  group.name = "AltitudeBands";
  const scaleFactor = ORBITAL_CONSTANTS.SCALE_FACTOR;

  const bands = [
    { name: "LEO (200-2000 km)", innerRadius: SCENE_EARTH_RADIUS + (200 / scaleFactor), outerRadius: SCENE_EARTH_RADIUS + (2000 / scaleFactor), color: 0x4ECDC4 },
    { name: "MEO (2000-20000 km)", innerRadius: SCENE_EARTH_RADIUS + (2000 / scaleFactor), outerRadius: SCENE_EARTH_RADIUS + (20000 / scaleFactor), color: 0xFF9500 },
    { name: "GEO (35786 km)", innerRadius: SCENE_EARTH_RADIUS + (35000 / scaleFactor), outerRadius: SCENE_EARTH_RADIUS + (36500 / scaleFactor), color: 0xFF6B6B }
  ];

  bands.forEach((band, index) => {
    const innerPoints = [];
    const outerPoints = [];
    for (let i = 0; i <= 64; i++) {
      const angle = (i / 64) * Math.PI * 2;
      innerPoints.push(new THREE.Vector3(band.innerRadius * Math.cos(angle), 0, band.innerRadius * Math.sin(angle)));
      outerPoints.push(new THREE.Vector3(band.outerRadius * Math.cos(angle), 0, band.outerRadius * Math.sin(angle)));
    }

    const innerCurve = new THREE.CatmullRomCurve3(innerPoints, true);
    const innerTube = new THREE.TubeGeometry(innerCurve, 64, 0.05, 6, true);
    const innerMaterial = new THREE.MeshBasicMaterial({ color: band.color, transparent: true, opacity: 0.5 });
    const innerMesh = new THREE.Mesh(innerTube, innerMaterial);
    group.add(innerMesh);

    const outerCurve = new THREE.CatmullRomCurve3(outerPoints, true);
    const outerTube = new THREE.TubeGeometry(outerCurve, 64, 0.05, 6, true);
    const outerMaterial = new THREE.MeshBasicMaterial({ color: band.color, transparent: true, opacity: 0.5 });
    const outerMesh = new THREE.Mesh(outerTube, outerMaterial);
    group.add(outerMesh);

    if (band.name.includes("GEO")) {
      const ringGeometry = new THREE.RingGeometry(band.innerRadius, band.outerRadius, 64);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: band.color,
        transparent: true,
        opacity: 0.1,
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = -Math.PI / 2;
      group.add(ring);
    }

    const labelAngle = (index * 60 + 30) * Math.PI / 180;
    const labelRadius = (band.innerRadius + band.outerRadius) / 2;
    const label = createTextSprite(band.name, band.color);
    label.position.set(labelRadius * Math.cos(labelAngle), 1, labelRadius * Math.sin(labelAngle));
    group.add(label);
  });

  return group;
};

const createDistanceRings = () => {
  const group = new THREE.Group();
  group.name = "DistanceRings";
  const scaleFactor = ORBITAL_CONSTANTS.SCALE_FACTOR;

  const distances = [
    { km: 500, label: "500 km" },
    { km: 1000, label: "1,000 km" },
    { km: 2000, label: "2,000 km" },
    { km: 5000, label: "5,000 km" },
    { km: 10000, label: "10,000 km" },
    { km: 20000, label: "20,000 km" },
    { km: 35786, label: "GEO 35,786 km" }
  ];

  distances.forEach((dist, index) => {
    const radius = SCENE_EARTH_RADIUS + (dist.km / scaleFactor);
    const points = [];
    for (let i = 0; i <= 128; i++) {
      const angle = (i / 128) * Math.PI * 2;
      points.push(new THREE.Vector3(radius * Math.cos(angle), 0, radius * Math.sin(angle)));
    }

    const curve = new THREE.CatmullRomCurve3(points, true);
    const tubeGeometry = new THREE.TubeGeometry(curve, 128, 0.03, 6, true);
    const isGeo = dist.km === 35786;
    const tubeMaterial = new THREE.MeshBasicMaterial({
      color: isGeo ? 0xFF6B6B : 0x5a6a7a,
      transparent: true,
      opacity: isGeo ? 0.7 : 0.35
    });
    const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
    group.add(tube);

    const labelAngle = (index * 45) * Math.PI / 180;
    const label = createTextSprite(dist.label, isGeo ? 0xFF6B6B : 0x7a8a9a);
    label.position.set(radius * Math.cos(labelAngle), 0.5, radius * Math.sin(labelAngle));
    group.add(label);
  });

  return group;
};

class LabelObject extends THREE.Object3D {
  constructor(element) {
    super();
    this.element = element;
    this.element.style.position = "absolute";
    this.element.style.userSelect = "none";
    this.element.style.zIndex = "5";
  }
}

const clampCentered = (x, y, rect) => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const minX = (rect.width / 2) - (w / 2) + 10;
  const maxX = (rect.width / 2) - (w / 2) + w - 10;
  const minY = (rect.height / 2) - (h / 2) + 10;
  const maxY = (rect.height / 2) - (h / 2) + h - 10;
  return {
    x: Math.max(minX, Math.min(maxX, x)),
    y: Math.max(minY, Math.min(maxY, y))
  };
};

const clampLegend = (x, y, rect) => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  return {
    x: Math.max(-10, Math.min(w - rect.width - 30, x)),
    y: Math.max(-60, Math.min(h - rect.height - 20, y))
  };
};

const clampControls = (x, y, rect) => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  return {
    x: Math.max(-(w - rect.width - 30), Math.min(10, x)),
    y: Math.max(-60, Math.min(h - rect.height - 20, y))
  };
};

const useDraggable = (panelRef, clampFn) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const positionRef = useRef({ x: 0, y: 0 });
  const clampFnRef = useRef(clampFn);

  useEffect(() => { positionRef.current = position; }, [position]);
  useEffect(() => { clampFnRef.current = clampFn; }, [clampFn]);

  const handleMouseDown = useCallback((e, ignoreFn) => {
    if (ignoreFn && ignoreFn(e.target)) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - positionRef.current.x,
      y: e.clientY - positionRef.current.y
    };
  }, []);

  useEffect(() => {
    if (!isDragging) {
      return;
    }
    const handleMove = (e) => {
      if (!panelRef.current) {
        return;
      }
      e.preventDefault();
      let newX = e.clientX - dragStartRef.current.x;
      let newY = e.clientY - dragStartRef.current.y;
      if (clampFnRef.current) {
        const clamped = clampFnRef.current(newX, newY, panelRef.current.getBoundingClientRect());
        newX = clamped.x;
        newY = clamped.y;
      }
      setPosition({ x: newX, y: newY });
    };
    const handleUp = () => setIsDragging(false);
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
  }, [isDragging, panelRef]);

  return { position, setPosition, isDragging, handleMouseDown };
};

const ChartCanvas = ({ values, height = 140, colorFn, accent, label, unit, valueFormatter, timeKey, valueKey, mode, yMin, yMax, threshold, thresholdLabel }) => {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const [hover, setHover] = useState(null);
  const [width, setWidth] = useState(0);
  const tk = timeKey || "time";
  const vk = valueKey || "value";
  const accentColor = accent || "#4ECDC4";
  const renderMode = mode || "area";

  useEffect(() => {
    if (!wrapperRef.current) {
      return;
    }
    const update = () => {
      if (wrapperRef.current) {
        setWidth(wrapperRef.current.clientWidth);
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, []);

  const numericValues = useMemo(() => {
    if (!values) {
      return [];
    }
    return values
      .map(v => ({ time: v[tk], value: Number(v[vk]) }))
      .filter(v => Number.isFinite(v.value));
  }, [values, tk, vk]);

  const stats = useMemo(() => {
    if (numericValues.length === 0) {
      return null;
    }
    const vs = numericValues.map(v => v.value);
    const minV = Number.isFinite(yMin) ? yMin : Math.min(...vs);
    const maxV = Number.isFinite(yMax) ? yMax : Math.max(...vs);
    const range = maxV - minV || 1;
    const padding = range * 0.1;
    return {
      min: minV - (Number.isFinite(yMin) ? 0 : padding),
      max: maxV + (Number.isFinite(yMax) ? 0 : padding),
      rawMin: minV,
      rawMax: maxV,
      mean: vs.reduce((s, v) => s + v, 0) / vs.length,
      latest: vs[vs.length - 1]
    };
  }, [numericValues, yMin, yMax]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !stats || width === 0) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const W = width;
    const H = height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const padL = 52;
    const padR = 16;
    const padT = 10;
    const padB = 28;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    if (plotW <= 0 || plotH <= 0) {
      return;
    }

    const xCount = numericValues.length;
    const xPos = (i) => {
      if (xCount === 1) {
        return padL + plotW / 2;
      }
      if (renderMode === "bars") {
        return padL + ((i + 0.5) / xCount) * plotW;
      }
      return padL + (i / (xCount - 1)) * plotW;
    };

    ctx.fillStyle = "rgba(10, 14, 20, 0.55)";
    ctx.fillRect(padL, padT, plotW, plotH);

    ctx.strokeStyle = "rgba(70, 80, 96, 0.35)";
    ctx.lineWidth = 1;
    ctx.font = "600 9px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillStyle = "rgba(170, 180, 200, 0.7)";

    const yRange = stats.max - stats.min;
    const yStep = niceTickStep(yRange, 5);
    const yStart = Math.ceil(stats.min / yStep) * yStep;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let v = yStart; v <= stats.max; v += yStep) {
      const y = padT + plotH - ((v - stats.min) / yRange) * plotH;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + plotW, y);
      ctx.strokeStyle = "rgba(70, 80, 96, 0.18)";
      ctx.stroke();
      const formatted = valueFormatter ? valueFormatter(v) : (Math.abs(v) > 1000 ? v.toFixed(0) : v.toFixed(yStep < 1 ? 1 : 0));
      ctx.fillText(formatted, padL - 6, y);
    }

    ctx.strokeStyle = "rgba(120, 135, 155, 0.55)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, padT + plotH);
    ctx.lineTo(padL + plotW, padT + plotH);
    ctx.stroke();

    if (Number.isFinite(threshold) && threshold >= stats.min && threshold <= stats.max) {
      const ty = padT + plotH - ((threshold - stats.min) / yRange) * plotH;
      ctx.strokeStyle = "rgba(140, 155, 175, 0.35)";
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(padL, ty);
      ctx.lineTo(padL + plotW, ty);
      ctx.stroke();
      ctx.setLineDash([]);
      if (thresholdLabel) {
        ctx.font = "700 8px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
        const labelMetrics = ctx.measureText(thresholdLabel);
        const lblW = labelMetrics.width + 10;
        const lblH = 14;
        const lblX = padL + plotW - lblW - 6;
        const lblY = ty - lblH - 6;
        ctx.fillStyle = "rgba(20, 24, 32, 0.88)";
        ctx.beginPath();
        ctx.roundRect(lblX, lblY, lblW, lblH, 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(140, 155, 175, 0.3)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = "rgba(170, 180, 200, 0.7)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(thresholdLabel, lblX + lblW / 2, lblY + lblH / 2);
        ctx.font = "600 9px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
      }
    }

    const xTickTarget = Math.min(6, xCount);
    const xTickStep = Math.max(1, Math.floor(xCount / xTickTarget));
    ctx.fillStyle = "rgba(170, 180, 200, 0.65)";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let i = 0; i < xCount; i += xTickStep) {
      const px = xPos(i);
      ctx.strokeStyle = "rgba(70, 80, 96, 0.25)";
      ctx.beginPath();
      ctx.moveTo(px, padT + plotH);
      ctx.lineTo(px, padT + plotH + 3);
      ctx.stroke();
      const ts = numericValues[i].time;
      if (ts) {
        ctx.fillText(formatChartTime(ts), px, padT + plotH + 6);
      }
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(padL, padT, plotW, plotH);
    ctx.clip();

    if (renderMode === "bars") {
      const barW = Math.max(2, (plotW / xCount) * 0.78);
      for (let i = 0; i < xCount; i++) {
        const v = numericValues[i].value;
        const px = xPos(i);
        const py = padT + plotH - ((v - stats.min) / yRange) * plotH;
        const color = colorFn ? colorFn(v) : accentColor;
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(px - barW / 2, py, barW, padT + plotH - py);
      }
      ctx.globalAlpha = 1;
    } else {
      ctx.beginPath();
      for (let i = 0; i < xCount; i++) {
        const v = numericValues[i].value;
        const px = xPos(i);
        const py = padT + plotH - ((v - stats.min) / yRange) * plotH;
        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      const lastX = xPos(xCount - 1);
      ctx.lineTo(lastX, padT + plotH);
      ctx.lineTo(padL, padT + plotH);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, padT, 0, padT + plotH);
      grad.addColorStop(0, accentColor + "55");
      grad.addColorStop(1, accentColor + "08");
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      for (let i = 0; i < xCount; i++) {
        const v = numericValues[i].value;
        const px = xPos(i);
        const py = padT + plotH - ((v - stats.min) / yRange) * plotH;
        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 1.8;
      ctx.lineJoin = "round";
      ctx.stroke();
    }

    ctx.restore();

    if (hover && hover.index >= 0 && hover.index < xCount) {
      const i = hover.index;
      const v = numericValues[i].value;
      const px = xPos(i);
      const py = padT + plotH - ((v - stats.min) / yRange) * plotH;
      ctx.strokeStyle = "rgba(200, 215, 230, 0.4)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(px, padT);
      ctx.lineTo(px, padT + plotH);
      ctx.stroke();
      ctx.setLineDash([]);
      if (renderMode === "bars") {
        const barW = Math.max(2, (plotW / xCount) * 0.78);
        ctx.save();
        ctx.beginPath();
        ctx.rect(padL, padT, plotW, plotH);
        ctx.clip();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(px - barW / 2 - 0.5, py - 0.5, barW + 1, padT + plotH - py + 1);
        ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
        ctx.fillRect(px - barW / 2, py, barW, padT + plotH - py);
        ctx.restore();
      } else {
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#0a0c0f";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  }, [numericValues, stats, width, height, colorFn, accentColor, valueFormatter, threshold, thresholdLabel, renderMode, hover]);

  const handleMouseMove = useCallback((e) => {
    if (!canvasRef.current || numericValues.length === 0 || width === 0) {
      return;
    }
    const rect = canvasRef.current.getBoundingClientRect();
    const padL = 52;
    const padR = 16;
    const plotW = width - padL - padR;
    const x = e.clientX - rect.left;
    if (x < padL || x > padL + plotW) {
      setHover(null);
      return;
    }
    const xCount = numericValues.length;
    let idx;
    if (renderMode === "bars") {
      idx = Math.max(0, Math.min(xCount - 1, Math.floor(((x - padL) / plotW) * xCount)));
    } else {
      const t = (x - padL) / plotW;
      idx = Math.max(0, Math.min(xCount - 1, Math.round(t * (xCount - 1))));
    }
    setHover({ index: idx, clientX: e.clientX, clientY: e.clientY, rectLeft: rect.left, rectTop: rect.top });
  }, [numericValues, width, renderMode]);

  const handleMouseLeave = useCallback(() => {
    setHover(null);
  }, []);

  if (!stats || numericValues.length === 0) {
    return (
      <div className="satChartEmpty">
        <small>No Data Available</small>
      </div>
    );
  }

  const hoveredItem = hover ? numericValues[hover.index] : null;

  return (
    <div className="satChartContainer" ref={wrapperRef}>
      <div className="satChartHeader">
        {label && <span className="satChartLabel">{label}</span>}
        <div className="satChartStats">
          <span className="satChartStat"><b>Latest</b>{valueFormatter ? valueFormatter(stats.latest) : stats.latest.toFixed(2)}{unit ? ` ${unit}` : ""}</span>
          <span className="satChartStat"><b>Min</b>{valueFormatter ? valueFormatter(stats.rawMin) : stats.rawMin.toFixed(2)}</span>
          <span className="satChartStat"><b>Max</b>{valueFormatter ? valueFormatter(stats.rawMax) : stats.rawMax.toFixed(2)}</span>
          <span className="satChartStat"><b>Mean</b>{valueFormatter ? valueFormatter(stats.mean) : stats.mean.toFixed(2)}</span>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        className="satChartCanvas"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      {hover && hoveredItem && (
        <div
          className="satChartTooltip"
          style={{
            left: `${Math.min(width - 180, Math.max(0, hover.clientX - hover.rectLeft + 12))}px`,
            top: "10px"
          }}
        >
          <div className="satChartTooltipTime">{formatChartTimeFull(hoveredItem.time)}</div>
          <div className="satChartTooltipValue" style={{ color: accentColor }}>
            {valueFormatter ? valueFormatter(hoveredItem.value) : hoveredItem.value.toFixed(3)}
            {unit && <span>{unit}</span>}
          </div>
        </div>
      )}
    </div>
  );
};

const StatTile = ({ label, value, unit, sub, color, accent, large }) => {
  return (
    <div className={`satStatTile ${large ? "satStatTileLarge" : ""}`} style={{ borderLeftColor: accent || "var(--st-accent-primary)" }}>
      <div className="satStatTileLabel">{label}</div>
      <div className="satStatTileValue" style={color ? { color } : undefined}>
        {value}
        {unit && <span className="satStatTileUnit">{unit}</span>}
      </div>
      {sub && <div className="satStatTileSub">{sub}</div>}
    </div>
  );
};

const SpaceWeatherStrip = ({ data, loading, expanded, onToggle }) => {
  if (loading && !data) {
    return (
      <div className="satSpaceWeatherStrip satSpaceWeatherLoading" />
    );
  }
  if (!data) {
    return (
      <div className="satSpaceWeatherStrip satSpaceWeatherUnavailable">
        <FontAwesomeIcon icon={faTriangleExclamation} /> <span>Space weather data is unavailable.</span>
      </div>
    );
  }

  const overall = data.overall || { status: "Unknown", color: "#666", severity: 0 };
  const kp = data.kpIndex;
  const f107 = data.f107;
  const sw = data.solarWind;
  const imf = data.imf;
  const xray = data.xray;
  const protons = data.protons;
  const scales = data.scales;
  const alertCount = data.alerts?.length || 0;

  return (
    <div className="satSpaceWeatherStrip">
      <div className="satSpaceWeatherStripCells">
        <div className="satSpaceWeatherCell" style={{ borderLeftColor: overall.color }}>
          <div className="satSpaceWeatherCellLabel">Status</div>
          <div className="satSpaceWeatherCellValue" style={{ color: overall.color }}>{overall.status}</div>
        </div>

        {kp && (
          <div className="satSpaceWeatherCell" style={{ borderLeftColor: kp.classification.color }}>
            <div className="satSpaceWeatherCellLabel">Kp · {kp.classification.level}</div>
            <div className="satSpaceWeatherCellValue">{kp.current}<span>{kp.classification.label}</span></div>
          </div>
        )}

        {f107 && (
          <div className="satSpaceWeatherCell" style={{ borderLeftColor: f107.classification.color }}>
            <div className="satSpaceWeatherCellLabel">F10.7 Flux</div>
            <div className="satSpaceWeatherCellValue">{f107.current}<span>sfu · {f107.classification.label}</span></div>
          </div>
        )}

        {sw && sw.speed && (
          <div className="satSpaceWeatherCell" style={{ borderLeftColor: sw.classification?.color || "#666" }}>
            <div className="satSpaceWeatherCellLabel">Solar Wind</div>
            <div className="satSpaceWeatherCellValue">{sw.speed}<span>km/s · {sw.density?.toFixed(1)} p/cm³</span></div>
          </div>
        )}

        {imf && imf.bz !== null && (
          <div className="satSpaceWeatherCell" style={{ borderLeftColor: imf.bz < -5 ? "#ff6b6b" : imf.bz < 0 ? "#FF9500" : "#4ecdc4" }}>
            <div className="satSpaceWeatherCellLabel">IMF Bz</div>
            <div className="satSpaceWeatherCellValue">{imf.bz}<span>nT · {imf.bz < 0 ? "south" : "north"}</span></div>
          </div>
        )}

        {xray && (
          <div className="satSpaceWeatherCell" style={{ borderLeftColor: xray.classification === "X" ? "#ff6b6b" : xray.classification === "M" ? "#FF9500" : "#4ecdc4" }}>
            <div className="satSpaceWeatherCellLabel">X-Ray</div>
            <div className="satSpaceWeatherCellValue">Class {xray.classification}<span>{xray.flux.toExponential(1)} W/m²</span></div>
          </div>
        )}

        {protons && (
          <div className="satSpaceWeatherCell" style={{ borderLeftColor: protons.stormLevel === "S0" ? "#4ecdc4" : "#FF9500" }}>
            <div className="satSpaceWeatherCellLabel">Protons</div>
            <div className="satSpaceWeatherCellValue">{protons.stormLevel}<span>{protons.flux?.toFixed(2)} pfu</span></div>
          </div>
        )}

        {scales && (
          <div className="satSpaceWeatherCell">
            <div className="satSpaceWeatherCellLabel">NOAA Scales</div>
            <div className="satSpaceWeatherCellValue">G{scales.geomagnetic.scale} S{scales.radiation.scale} R{scales.radioBlackout.scale}<span>{alertCount} Alerts</span></div>
          </div>
        )}
      </div>

      <button
        className="satSpaceWeatherToggle"
        onClick={onToggle}
        title={expanded ? "Hide briefing." : "Show full briefing."}
      >
        {expanded ? "Hide Briefing" : "Show Briefing"}
        <FontAwesomeIcon icon={expanded ? faSquareCaretUp : faSquareCaretDown} />
      </button>
    </div>
  );
};

const SpaceWeatherDetail = ({ data, onClose, onRequestAIAnalysis, aiAnalysis, aiLoading }) => {
  const [activeSection, setActiveSection] = useState("overview");
  if (!data) {
    return null;
  }

  const sections = [
    { key: "overview", label: "Overview", icon: faGauge },
    { key: "geomagnetic", label: "Geomagnetic", icon: faMagnet },
    { key: "solar", label: "Solar Activity", icon: faSun },
    { key: "particles", label: "Particle Flux", icon: faAtom },
    { key: "operational", label: "Operational Impact", icon: faShieldHalved },
    { key: "ai", label: "AI Analysis", icon: faBrain }
  ];

  const renderOverview = () => (
    <div className="satDossierTabContent">
      <div className="satStatTileGrid">
        <StatTile label="Overall Status" value={data.overall?.status || "Unknown"} sub={`Severity ${data.overall?.severity || 0}/6`} color={data.overall?.color} accent={data.overall?.color} large />
        {data.kpIndex && (<StatTile label={`Kp Index · ${data.kpIndex.classification.level}`} value={data.kpIndex.current} sub={data.kpIndex.classification.label} color={data.kpIndex.classification.color} accent={data.kpIndex.classification.color} />)}
        {data.f107 && (<StatTile label="F10.7 Flux" value={data.f107.current} unit="sfu" sub={data.f107.classification.label} color={data.f107.classification.color} accent={data.f107.classification.color} />)}
        {data.solarWind && data.solarWind.speed && (<StatTile label="Solar Wind Speed" value={data.solarWind.speed} unit="km/s" sub={`${data.solarWind.density?.toFixed(1)} p/cm³ · ${data.solarWind.classification?.label || ""}`} color={data.solarWind.classification?.color} accent={data.solarWind.classification?.color} />)}
        {data.imf && data.imf.bz !== null && (<StatTile label="IMF Bz" value={data.imf.bz} unit="nT" sub={data.imf.orientation} color={data.imf.bz < -5 ? "#ff6b6b" : data.imf.bz < 0 ? "#FF9500" : "#4ecdc4"} accent={data.imf.bz < -5 ? "#ff6b6b" : data.imf.bz < 0 ? "#FF9500" : "#4ecdc4"} />)}
        {data.xray && (<StatTile label="X-Ray Class" value={data.xray.classification} sub={data.xray.flux.toExponential(2) + " W/m²"} color={data.xray.classification === "X" ? "#ff6b6b" : data.xray.classification === "M" ? "#FF9500" : "#4ecdc4"} accent={data.xray.classification === "X" ? "#ff6b6b" : data.xray.classification === "M" ? "#FF9500" : "#4ecdc4"} />)}
        {data.protons && (<StatTile label="Proton Storm" value={data.protons.stormLevel} sub={`${data.protons.flux?.toFixed(2)} pfu (≥10 MeV)`} color={data.protons.stormLevel === "S0" ? "#4ecdc4" : "#FF9500"} accent={data.protons.stormLevel === "S0" ? "#4ecdc4" : "#FF9500"} />)}
        {data.electrons && (<StatTile label="Electron Flux" value={data.electrons.flux?.toFixed(2)} unit="e/cm²·s·sr" sub="≥2 MeV" accent="#ffd93d" />)}
        {data.scales && (<StatTile label="NOAA Scales" value={`G${data.scales.geomagnetic.scale} S${data.scales.radiation.scale} R${data.scales.radioBlackout.scale}`} sub={`${data.alerts?.length || 0} Active Alerts`} accent="#42a5f5" />)}
      </div>

      {data.kpIndex && data.kpIndex.history && data.kpIndex.history.length > 0 && (
        <div className="satPanelCard">
          <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faChartArea} /> Kp Index · Last 24h</span></div>
          <div className="satPanelCardBody">
            <ChartCanvas values={data.kpIndex.history.slice(-24)} height={160} accent="#ffd93d" colorFn={(v) => v < 4 ? "#4ecdc4" : v < 6 ? "#FF9500" : "#ff6b6b"} label="Kp Index" unit="" valueFormatter={(v) => v.toFixed(1)} mode="bars" yMin={0} yMax={9} threshold={5} thresholdLabel="Storm Threshold (Kp 5)" />
          </div>
        </div>
      )}
    </div>
  );

  const renderGeomagnetic = () => (
    <div className="satDossierTabContent">
      <div className="satStatTileGrid">
        {data.kpIndex && (
          <>
            <StatTile label="Kp Current" value={data.kpIndex.current} accent={data.kpIndex.classification.color} color={data.kpIndex.classification.color} sub={data.kpIndex.classification.level} />
            <StatTile label="Storm Class" value={data.kpIndex.classification.level} sub={data.kpIndex.classification.label} accent={data.kpIndex.classification.color} />
            <StatTile label="Severity" value={`${data.kpIndex.classification.severity}/6`} accent={data.kpIndex.classification.color} />
          </>
        )}
        {data.imf && (
          <>
            <StatTile label="IMF Bz" value={data.imf.bz} unit="nT" sub={data.imf.orientation} accent={data.imf.bz < -5 ? "#ff6b6b" : "#4ecdc4"} color={data.imf.bz < -5 ? "#ff6b6b" : undefined} />
            <StatTile label="IMF Bt" value={data.imf.bt} unit="nT" sub="Total Field Magnitude" accent="#42a5f5" />
          </>
        )}
      </div>

      {data.kpIndex && data.kpIndex.history && (
        <div className="satPanelCard">
          <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faChartArea} /> Kp Time Series · 24h</span></div>
          <div className="satPanelCardBody">
            <ChartCanvas values={data.kpIndex.history} height={170} accent="#ffd93d" colorFn={(v) => v < 4 ? "#4ecdc4" : v < 6 ? "#FF9500" : "#ff6b6b"} label="Kp Index" valueFormatter={(v) => v.toFixed(1)} mode="bars" yMin={0} yMax={9} threshold={5} thresholdLabel="Storm Threshold" />
          </div>
        </div>
      )}

      {data.imf && data.imf.history && (
        <div className="satPanelCard">
          <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faChartArea} /> IMF Bz Time Series</span></div>
          <div className="satPanelCardBody">
            <ChartCanvas values={data.imf.history} valueKey="bz" height={170} accent="#42a5f5" colorFn={(v) => v < -5 ? "#ff6b6b" : v < 0 ? "#FF9500" : "#4ecdc4"} label="IMF Bz (GSM)" unit="nT" valueFormatter={(v) => v.toFixed(1)} threshold={-5} thresholdLabel="Geoeffective Threshold" />
          </div>
        </div>
      )}

      <div className="satPanelCard">
        <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faBookOpen} /> Geomagnetic Operational Notes</span></div>
        <div className="satPanelCardBody">
          <div className="satBriefingGrid">
            <div className="satBriefingItem"><b>GIC Risk</b><p>Geomagnetically induced currents threaten power grid transformers during sustained Kp ≥ 6 events. Operators should monitor reactive power and consider load shedding.</p></div>
            <div className="satBriefingItem"><b>HF Propagation</b><p>Polar cap absorption events degrade HF communications above 60° geomagnetic latitude during severe storms.</p></div>
            <div className="satBriefingItem"><b>Atmospheric Drag</b><p>Heating from energetic precipitation expands the upper atmosphere, increasing drag on LEO assets by 50-300% during major storms.</p></div>
            <div className="satBriefingItem"><b>Surface Charging</b><p>Substorm injection events cause differential charging on GEO satellites; expect ESD anomalies during sustained Kp ≥ 5.</p></div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSolar = () => (
    <div className="satDossierTabContent">
      <div className="satStatTileGrid">
        {data.f107 && (
          <>
            <StatTile label="F10.7 Observed" value={data.f107.current} unit="sfu" accent={data.f107.classification.color} color={data.f107.classification.color} sub={data.f107.classification.label} />
            <StatTile label="F10.7 Adjusted" value={data.f107.adjusted} unit="sfu" sub="1 AU Normalized" accent="#FF9500" />
          </>
        )}
        {data.xray && (
          <>
            <StatTile label="X-Ray Flux" value={data.xray.flux.toExponential(2)} unit="W/m²" accent={data.xray.classification === "X" ? "#ff6b6b" : "#FF9500"} />
            <StatTile label="X-Ray Class" value={data.xray.classification} sub="0.1-0.8 nm" accent={data.xray.classification === "X" ? "#ff6b6b" : "#FF9500"} color={data.xray.classification === "X" ? "#ff6b6b" : "#FF9500"} />
          </>
        )}
        {data.solarWind && (
          <>
            <StatTile label="SW Speed" value={data.solarWind.speed} unit="km/s" accent={data.solarWind.classification?.color} color={data.solarWind.classification?.color} sub={data.solarWind.classification?.label} />
            <StatTile label="SW Density" value={data.solarWind.density?.toFixed(2)} unit="p/cm³" accent="#42a5f5" />
            <StatTile label="SW Temperature" value={data.solarWind.temperature?.toLocaleString()} unit="K" accent="#FF9500" />
          </>
        )}
      </div>

      {data.f107 && data.f107.history && (
        <div className="satPanelCard">
          <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faChartArea} /> F10.7 30-Day Trend</span></div>
          <div className="satPanelCardBody">
            <ChartCanvas values={data.f107.history} height={170} accent="#FF9500" colorFn={(v) => v < 100 ? "#4ecdc4" : v < 150 ? "#ffd93d" : "#FF9500"} label="F10.7 Flux" unit="sfu" valueFormatter={(v) => v.toFixed(0)} threshold={150} thresholdLabel="High Activity" />
          </div>
        </div>
      )}

      {data.solarWind && data.solarWind.history && (
        <div className="satPanelCard">
          <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faWind} /> Solar Wind Speed</span></div>
          <div className="satPanelCardBody">
            <ChartCanvas values={data.solarWind.history} valueKey="speed" height={170} accent="#4ECDC4" colorFn={(v) => v < 400 ? "#4ecdc4" : v < 600 ? "#ffd93d" : "#FF9500"} label="Solar Wind Speed" unit="km/s" valueFormatter={(v) => v.toFixed(0)} threshold={500} thresholdLabel="Elevated Stream" />
          </div>
        </div>
      )}

      {data.solarRegions && data.solarRegions.length > 0 && (
        <div className="satPanelCard">
          <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faSun} /> Active Solar Regions ({data.solarRegions.length})</span></div>
          <div className="satPanelCardBody">
            <div className="satTableScroll">
              <AdaptiveTable>
                <thead><tr><th>Region</th><th>Location</th><th>Spot Class</th><th>Mag Class</th><th>Spots</th><th>Area</th></tr></thead>
                <tbody>
                  {data.solarRegions.map((r, i) => (
                    <tr key={i}>
                      <td>AR{r.region}</td>
                      <td>{r.location}</td>
                      <td>{r.spotClass}</td>
                      <td>{r.magClass}</td>
                      <td>{r.numSpots}</td>
                      <td>{r.area}</td>
                    </tr>
                  ))}
                </tbody>
              </AdaptiveTable>
            </div>
          </div>
        </div>
      )}

      {data.cmes && data.cmes.length > 0 && (
        <div className="satPanelCard">
          <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faBolt} /> Recent CME Events</span></div>
          <div className="satPanelCardBody">
            <div className="satTableScroll">
              <AdaptiveTable>
                <thead><tr><th>Time</th><th>Speed</th><th>Type</th><th>Lat/Lon</th><th>Half Angle</th></tr></thead>
                <tbody>
                  {data.cmes.map((c, i) => (
                    <tr key={i}>
                      <td>{new Date(c.time).toUTCString().substring(5, 22)}</td>
                      <td>{c.speed} km/s</td>
                      <td>{c.type}</td>
                      <td>{c.latitude}°/{c.longitude}°</td>
                      <td>{c.halfAngle}°</td>
                    </tr>
                  ))}
                </tbody>
              </AdaptiveTable>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderParticles = () => (
    <div className="satDossierTabContent">
      <div className="satStatTileGrid">
        {data.protons && (
          <>
            <StatTile label="Proton Flux" value={data.protons.flux?.toFixed(3)} unit="pfu" sub="≥10 MeV Integral" accent={data.protons.stormLevel === "S0" ? "#4ecdc4" : "#FF9500"} />
            <StatTile label="Storm Level" value={data.protons.stormLevel} sub="NOAA SEP Scale" color={data.protons.stormLevel === "S0" ? "#4ecdc4" : "#FF9500"} accent={data.protons.stormLevel === "S0" ? "#4ecdc4" : "#FF9500"} />
          </>
        )}
        {data.electrons && (<StatTile label="Electron Flux" value={data.electrons.flux?.toFixed(2)} unit="e/cm²·s·sr" sub="≥2 MeV Integral" accent="#ffd93d" />)}
        {data.xray && (<StatTile label="Soft X-Ray" value={data.xray.flux.toExponential(2)} unit="W/m²" sub={`Class ${data.xray.classification} · GOES Primary`} accent={data.xray.classification === "X" ? "#ff6b6b" : "#4ecdc4"} />)}
      </div>

      {data.xray && data.xray.history && (
        <div className="satPanelCard">
          <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faChartArea} /> Soft X-Ray (0.1-0.8 nm) · 6h</span></div>
          <div className="satPanelCardBody">
            <ChartCanvas values={data.xray.history.map(h => ({ time: h.time, value: Math.log10(Math.max(1e-9, h.flux)) }))} height={170} accent="#FF9500" label="log₁₀(flux)" unit="W/m²" valueFormatter={(v) => `1e${v.toFixed(1)}`} threshold={-5} thresholdLabel="M-Class Threshold" />
          </div>
        </div>
      )}

      {data.protons && data.protons.history && (
        <div className="satPanelCard">
          <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faChartArea} /> Proton Flux (≥10 MeV) · 6h</span></div>
          <div className="satPanelCardBody">
            <ChartCanvas values={data.protons.history} valueKey="flux" height={170} accent="#FF9500" colorFn={(v) => v < 1 ? "#4ecdc4" : v < 10 ? "#ffd93d" : "#ff6b6b"} label="Proton Flux" unit="pfu" valueFormatter={(v) => v.toFixed(2)} threshold={10} thresholdLabel="S1 Storm Threshold" />
          </div>
        </div>
      )}

      {data.electrons && data.electrons.history && (
        <div className="satPanelCard">
          <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faChartArea} /> Electron Flux (≥2 MeV) · 24h</span></div>
          <div className="satPanelCardBody">
            <ChartCanvas values={data.electrons.history} valueKey="flux" height={170} accent="#ffd93d" label="Electron Flux" unit="e/cm²·s·sr" valueFormatter={(v) => v.toExponential(1)} />
          </div>
        </div>
      )}

      <div className="satPanelCard">
        <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faBookOpen} /> Particle Environment Reference</span></div>
        <div className="satPanelCardBody">
          <div className="satBriefingGrid">
            <div className="satBriefingItem"><b>SEP Events</b><p>Solar energetic protons cause single-event upsets and total ionizing dose accumulation. Polar passes and high-altitude orbits are most exposed.</p></div>
            <div className="satBriefingItem"><b>Inner Belt</b><p>Trapped protons (10-100 MeV) at L=1.3-2.5 dominate radiation environment for LEO above 1000 km.</p></div>
            <div className="satBriefingItem"><b>Outer Belt</b><p>Trapped relativistic electrons at L=3-7 cause deep dielectric charging on GEO assets, especially during HSS-driven enhancements.</p></div>
            <div className="satBriefingItem"><b>South Atlantic Anomaly</b><p>This is a region of weakened geomagnetic field where inner-belt protons reach LEO altitudes, and it is a major source of SEU on civilian satellites.</p></div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderOperational = () => (
    <div className="satDossierTabContent">
      <div className="satPanelCard">
        <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faShieldHalved} /> Mission Domain Risk Matrix</span></div>
        <div className="satPanelCardBody">
          <div className="satRiskMatrix">
            <div className="satRiskMatrixRow satRiskMatrixHeader">
              <div>Domain</div><div>Geomag</div><div>Solar Flare</div><div>SEP</div><div>Drag</div><div>Charging</div>
            </div>
            <div className="satRiskMatrixRow">
              <div>LEO Imaging</div>
              <div className={`satRiskCell ${data.kpIndex?.classification.severity > 3 ? "satRiskHigh" : "satRiskLow"}`}>{data.kpIndex?.classification.severity > 3 ? "HIGH" : "LOW"}</div>
              <div className={`satRiskCell ${data.xray?.classification === "X" ? "satRiskHigh" : "satRiskLow"}`}>{data.xray?.classification === "X" ? "HIGH" : "LOW"}</div>
              <div className={`satRiskCell ${data.protons?.flux > 10 ? "satRiskHigh" : "satRiskLow"}`}>{data.protons?.flux > 10 ? "HIGH" : "LOW"}</div>
              <div className={`satRiskCell ${data.f107?.current > 150 ? "satRiskHigh" : "satRiskLow"}`}>{data.f107?.current > 150 ? "HIGH" : "LOW"}</div>
              <div className="satRiskCell satRiskLow">Low</div>
            </div>
            <div className="satRiskMatrixRow">
              <div>GEO Comms</div>
              <div className={`satRiskCell ${data.kpIndex?.classification.severity > 4 ? "satRiskHigh" : "satRiskMod"}`}>{data.kpIndex?.classification.severity > 4 ? "HIGH" : "MOD"}</div>
              <div className={`satRiskCell ${data.xray?.classification === "X" ? "satRiskMod" : "satRiskLow"}`}>{data.xray?.classification === "X" ? "MOD" : "LOW"}</div>
              <div className={`satRiskCell ${data.protons?.flux > 10 ? "satRiskHigh" : "satRiskLow"}`}>{data.protons?.flux > 10 ? "HIGH" : "LOW"}</div>
              <div className="satRiskCell satRiskLow">N/A</div>
              <div className={`satRiskCell ${data.electrons?.flux > 1000 ? "satRiskHigh" : "satRiskMod"}`}>{data.electrons?.flux > 1000 ? "HIGH" : "MOD"}</div>
            </div>
            <div className="satRiskMatrixRow">
              <div>GNSS</div>
              <div className={`satRiskCell ${data.kpIndex?.classification.severity > 3 ? "satRiskHigh" : "satRiskLow"}`}>{data.kpIndex?.classification.severity > 3 ? "HIGH" : "LOW"}</div>
              <div className={`satRiskCell ${data.xray?.classification === "X" ? "satRiskHigh" : "satRiskLow"}`}>{data.xray?.classification === "X" ? "HIGH" : "LOW"}</div>
              <div className={`satRiskCell ${data.protons?.flux > 10 ? "satRiskMod" : "satRiskLow"}`}>{data.protons?.flux > 10 ? "MOD" : "LOW"}</div>
              <div className="satRiskCell satRiskLow">Low</div>
              <div className="satRiskCell satRiskLow">Low</div>
            </div>
            <div className="satRiskMatrixRow">
              <div>HF Comms</div>
              <div className={`satRiskCell ${data.kpIndex?.classification.severity > 2 ? "satRiskHigh" : "satRiskLow"}`}>{data.kpIndex?.classification.severity > 2 ? "HIGH" : "LOW"}</div>
              <div className={`satRiskCell ${data.xray?.classification === "M" || data.xray?.classification === "X" ? "satRiskHigh" : "satRiskLow"}`}>{data.xray?.classification === "M" || data.xray?.classification === "X" ? "HIGH" : "LOW"}</div>
              <div className={`satRiskCell ${data.protons?.flux > 10 ? "satRiskHigh" : "satRiskLow"}`}>{data.protons?.flux > 10 ? "HIGH" : "LOW"}</div>
              <div className="satRiskCell satRiskLow">N/A</div>
              <div className="satRiskCell satRiskLow">N/A</div>
            </div>
            <div className="satRiskMatrixRow">
              <div>Power Grid</div>
              <div className={`satRiskCell ${data.kpIndex?.classification.severity > 4 ? "satRiskHigh" : data.kpIndex?.classification.severity > 2 ? "satRiskMod" : "satRiskLow"}`}>{data.kpIndex?.classification.severity > 4 ? "HIGH" : data.kpIndex?.classification.severity > 2 ? "MOD" : "LOW"}</div>
              <div className="satRiskCell satRiskLow">Low</div>
              <div className="satRiskCell satRiskLow">Low</div>
              <div className="satRiskCell satRiskLow">N/A</div>
              <div className="satRiskCell satRiskLow">N/A</div>
            </div>
          </div>
        </div>
      </div>

      {data.alerts && data.alerts.length > 0 && (
        <div className="satPanelCard">
          <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faTriangleExclamation} /> SWPC Active Alerts ({data.alerts.length})</span></div>
          <div className="satPanelCardBody">
            <div className="satSpaceWeatherAlerts">
              {data.alerts.map((a, i) => (
                <div key={i} className="satSpaceWeatherAlert">
                  <div className="satSpaceWeatherAlertId">{a.productId}</div>
                  <div className="satSpaceWeatherAlertTime">{a.issueDateTime}</div>
                  <pre className="satSpaceWeatherAlertMsg">{a.message}</pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderAI = () => (
    <div className="satDossierTabContent">
      {aiAnalysis && !aiAnalysis.error && (
        <div className="satMissionIntelHeader">
          <small>
            Generated {formatGeneratedAt(aiAnalysis.generatedAt)}
            {aiAnalysis.tokenUsage && ` · Tokens: ${aiAnalysis.tokenUsage.total || "?"}`}
            {aiAnalysis.stages && ` · ${aiAnalysis.stages} Stages`}
          </small>
          <button className="satSatelliteSelectButton" onClick={onRequestAIAnalysis} disabled={aiLoading}>
            <FontAwesomeIcon icon={aiLoading ? faSpinner : faBrain} spin={aiLoading} /> Regenerate
          </button>
        </div>
      )}

      {aiLoading && !aiAnalysis && (
        <div className="satStatusDisplay">
          <div className="loading-circle" />
        </div>
      )}

      {!aiLoading && !aiAnalysis && (
        <div className="satStatusDisplay">
          <div className="loading-circle" />
        </div>
      )}

      {aiAnalysis && aiAnalysis.error && (
        <div className="satStatusDisplay satStatusError">
          <FontAwesomeIcon icon={faTriangleExclamation} />
          <p>AI Analysis Failed: {aiAnalysis.error}</p>
          <button className="satSatelliteSelectButton" onClick={onRequestAIAnalysis} disabled={aiLoading}>
            <FontAwesomeIcon icon={aiLoading ? faSpinner : faBrain} spin={aiLoading} /> Retry
          </button>
        </div>
      )}

      {aiAnalysis && !aiAnalysis.error && aiAnalysis.report && (
        <>
          {aiAnalysis.report.executiveSummary && (
            <div className="satPanelCard">
              <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faPersonChalkboard} /> Executive Summary</span></div>
              <div className="satPanelCardBody"><p className="satMissionBriefText">{safeRenderText(aiAnalysis.report.executiveSummary)}</p></div>
            </div>
          )}
          {aiAnalysis.report.currentConditions && (
            <div className="satPanelCard">
              <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faGauge} /> Current Conditions Analysis</span></div>
              <div className="satPanelCardBody"><p className="satMissionBriefText">{safeRenderText(aiAnalysis.report.currentConditions)}</p></div>
            </div>
          )}
          {aiAnalysis.report.forecast24h && (
            <div className="satPanelCard">
              <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faArrowTrendUp} /> 24-Hour Forecast</span></div>
              <div className="satPanelCardBody"><p className="satMissionBriefText">{safeRenderText(aiAnalysis.report.forecast24h)}</p></div>
            </div>
          )}
          {aiAnalysis.report.forecast72h && (
            <div className="satPanelCard">
              <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faArrowTrendUp} /> 72-Hour Outlook</span></div>
              <div className="satPanelCardBody"><p className="satMissionBriefText">{safeRenderText(aiAnalysis.report.forecast72h)}</p></div>
            </div>
          )}
          {aiAnalysis.report.satelliteImpacts && Array.isArray(aiAnalysis.report.satelliteImpacts) && (
            <div className="satPanelCard">
              <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faSatellite} /> Satellite Impact Assessment</span></div>
              <div className="satPanelCardBody">
                <div className="satBriefingGrid">
                  {aiAnalysis.report.satelliteImpacts.map((s, i) => (
                    <div key={i} className="satBriefingItem">
                      <b>{safeRenderText(s.regime || `Item ${i + 1}`)}</b>
                      <p>{safeRenderText(s.impact || s.description || "")}</p>
                      {s.severity && <small style={{ color: s.severity === "High" ? "#ff6b6b" : s.severity === "Moderate" ? "#FF9500" : "#4ecdc4" }}>Severity: {safeRenderText(s.severity)}</small>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {aiAnalysis.report.recommendedActions && Array.isArray(aiAnalysis.report.recommendedActions) && (
            <div className="satPanelCard">
              <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faList} /> Recommended Operational Actions</span></div>
              <div className="satPanelCardBody">
                <ol className="satNumberedList">
                  {aiAnalysis.report.recommendedActions.map((a, i) => (
                    <li key={i}>{safeRenderText(a)}</li>
                  ))}
                </ol>
              </div>
            </div>
          )}
          {aiAnalysis.report.historicalContext && (
            <div className="satPanelCard">
              <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faClock} /> Historical Context</span></div>
              <div className="satPanelCardBody"><p className="satMissionBriefText">{safeRenderText(aiAnalysis.report.historicalContext)}</p></div>
            </div>
          )}
          {aiAnalysis.report.scientificAnalysis && (
            <div className="satPanelCard">
              <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faMicroscope} /> Scientific Analysis</span></div>
              <div className="satPanelCardBody"><p className="satMissionBriefText">{safeRenderText(aiAnalysis.report.scientificAnalysis)}</p></div>
            </div>
          )}
          {aiAnalysis.sources && aiAnalysis.sources.length > 0 && (
            <div className="satPanelCard">
              <div className="satPanelCardHeader"><span>Grounded Sources</span></div>
              <div className="satPanelCardBody">
                <div className="satSourceList">
                  {aiAnalysis.sources.map((s, i) => (
                    <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="satSourceLink">{s.title || s.url}</a>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="satSpaceWeatherDetail">
      <div className="satSpaceWeatherDetailHeader">
        <span>Space Weather Operations Center · {new Date(data.timestamp).toLocaleString()}</span>
        <button className="satSatelliteCloseButton" onClick={onClose}><FontAwesomeIcon icon={faXmark} /></button>
      </div>
      <div className="satDossierTabs">
        <div className="satDossierTabsScroll">
          {sections.map(section => (
            <button
              key={section.key}
              className={`satDossierTab ${activeSection === section.key ? "satDossierTabActive" : ""}`}
              onClick={() => {
                setActiveSection(section.key);
                if (section.key === "ai" && !aiAnalysis && !aiLoading) {
                  onRequestAIAnalysis();
                }
              }}
            >
              <FontAwesomeIcon icon={section.icon} /> {section.label}
            </button>
          ))}
        </div>
      </div>
      <div className="satDossierBody">
        {activeSection === "overview" && renderOverview()}
        {activeSection === "geomagnetic" && renderGeomagnetic()}
        {activeSection === "solar" && renderSolar()}
        {activeSection === "particles" && renderParticles()}
        {activeSection === "operational" && renderOperational()}
        {activeSection === "ai" && renderAI()}
      </div>
    </div>
  );
};

const GroundTrackView = ({ satellite, satrec, currentDate }) => {
  const [currentOrbit, setCurrentOrbit] = useState([]);
  const [previousOrbit, setPreviousOrbit] = useState([]);
  const [currentPos, setCurrentPos] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showCurrentOrbit, setShowCurrentOrbit] = useState(true);
  const [showPreviousOrbit, setShowPreviousOrbit] = useState(true);
  const mapImgRef = useRef(null);
  const canvasRef = useRef(null);

  const satColor = satellite?.color || "#4ECDC4";
  const prevOrbitColor = "#4ecdc4";

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      mapImgRef.current = img;
      setMapLoaded(true);
    };
    img.onerror = () => {
      setMapLoaded(true);
    };
    img.src = SOURCES.worldMapImage;
  }, []);

  useEffect(() => {
    if (!satrec || !satellite) {
      setCurrentOrbit([]);
      setPreviousOrbit([]);
      setCurrentPos(null);
      return;
    }
    const period = satellite.period || 90;
    const now = currentDate || new Date();
    const samplesPerOrbit = 200;
    const cur = [];
    const prev = [];
    for (let i = samplesPerOrbit; i >= 0; i--) {
      const t = new Date(now.getTime() - (i / samplesPerOrbit) * period * 60000);
      try {
        const pv = satelliteJs.propagate(satrec, t);
        if (!pv.position) continue;
        const gmst = satelliteJs.gstime(t);
        const geo = satelliteJs.eciToGeodetic(pv.position, gmst);
        cur.push({
          lat: geo.latitude * 180 / Math.PI,
          lon: geo.longitude * 180 / Math.PI
        });
      } catch (error) {}
    }
    for (let i = samplesPerOrbit; i >= 0; i--) {
      const t = new Date(now.getTime() - period * 60000 - (i / samplesPerOrbit) * period * 60000);
      try {
        const pv = satelliteJs.propagate(satrec, t);
        if (!pv.position) continue;
        const gmst = satelliteJs.gstime(t);
        const geo = satelliteJs.eciToGeodetic(pv.position, gmst);
        prev.push({
          lat: geo.latitude * 180 / Math.PI,
          lon: geo.longitude * 180 / Math.PI
        });
      } catch (error) {}
    }
    setCurrentOrbit(cur);
    setPreviousOrbit(prev);
    try {
      const pv = satelliteJs.propagate(satrec, now);
      if (pv.position) {
        const gmst = satelliteJs.gstime(now);
        const geo = satelliteJs.eciToGeodetic(pv.position, gmst);
        setCurrentPos({
          lat: geo.latitude * 180 / Math.PI,
          lon: geo.longitude * 180 / Math.PI,
          alt: geo.height
        });
      }
    } catch (error) {}
  }, [satrec, satellite, currentDate]);

  const segmentsFromTrack = (pts) => {
    const segs = [];
    let cur = [];
    for (let i = 0; i < pts.length; i++) {
      if (cur.length === 0) {
        cur.push(pts[i]);
        continue;
      }
      const prev = cur[cur.length - 1];
      if (Math.abs(pts[i].lon - prev.lon) > 180) {
        segs.push(cur);
        cur = [pts[i]];
      } else {
        cur.push(pts[i]);
      }
    }
    if (cur.length > 0) {
      segs.push(cur);
    }
    return segs;
  };

  const currentSegs = segmentsFromTrack(currentOrbit);
  const previousSegs = segmentsFromTrack(previousOrbit);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    const W = 1440;
    const H = 720;
    canvas.width = W;
    canvas.height = H;

    ctx.fillStyle = "#060a12";
    ctx.fillRect(0, 0, W, H);

    if (mapImgRef.current) {
      ctx.globalAlpha = 0.35;
      ctx.drawImage(mapImgRef.current, 0, 0, W, H);
      ctx.globalAlpha = 1.0;
      ctx.globalCompositeOperation = "color";
      ctx.fillStyle = "rgba(50,90,150,0.7)";
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(6,10,18,0.45)";
      ctx.fillRect(0, 0, W, H);
    }

    const toX = (lon) => ((lon + 180) / 360) * W;
    const toY = (lat) => ((90 - lat) / 180) * H;

    ctx.strokeStyle = "rgba(80,120,180,0.18)";
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    for (const lat of [-60, -30, 30, 60]) {
      ctx.beginPath();
      ctx.moveTo(0, toY(lat));
      ctx.lineTo(W, toY(lat));
      ctx.stroke();
    }
    for (const lon of [-120, -60, 60, 120]) {
      ctx.beginPath();
      ctx.moveTo(toX(lon), 0);
      ctx.lineTo(toX(lon), H);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    ctx.strokeStyle = "rgba(120,160,210,0.3)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, toY(0));
    ctx.lineTo(W, toY(0));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(toX(0), 0);
    ctx.lineTo(toX(0), H);
    ctx.stroke();

    ctx.font = "bold 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    for (const lat of [-60, -30, 30, 60]) {
      ctx.fillStyle = "rgba(140,170,210,0.45)";
      ctx.fillText(lat > 0 ? `+${lat}°` : `${lat}°`, 6, toY(lat) - 4);
    }
    for (const lon of [-120, -60, 60, 120]) {
      ctx.fillStyle = "rgba(140,170,210,0.45)";
      ctx.fillText(lon > 0 ? `+${lon}°` : `${lon}°`, toX(lon) + 4, H - 6);
    }

    GROUND_TRACK_CITIES.forEach(city => {
      const cx = toX(city.lon);
      const cy = toY(city.lat);
      ctx.fillStyle = "rgba(200,210,225,0.6)";
      ctx.beginPath();
      ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(190,200,218,0.65)";
      ctx.font = "600 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      ctx.fillText(city.name, cx + 5, cy + 4);
    });

    const drawSegments = (segs, color, width, dash, alpha) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.setLineDash(dash);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalAlpha = alpha;
      segs.forEach(seg => {
        if (seg.length < 2) {
          return;
        }
        ctx.beginPath();
        ctx.moveTo(toX(seg[0].lon), toY(seg[0].lat));
        for (let i = 1; i < seg.length; i++) {
          ctx.lineTo(toX(seg[i].lon), toY(seg[i].lat));
        }
        ctx.stroke();
      });
      ctx.setLineDash([]);
      ctx.globalAlpha = 1.0;
    };

    if (showPreviousOrbit) {
      drawSegments(previousSegs, prevOrbitColor, 2.5, [6, 5], 0.5);
    }
    if (showCurrentOrbit) {
      drawSegments(currentSegs, satColor, 3, [8, 5], 0.9);
    }

    if (currentPos) {
      const cx = toX(currentPos.lon);
      const cy = toY(currentPos.lat);
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 28);
      gradient.addColorStop(0, satColor + "99");
      gradient.addColorStop(0.5, satColor + "33");
      gradient.addColorStop(1, satColor + "00");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, 28, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = satColor;
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1.0;

      ctx.fillStyle = satColor;
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }, [currentOrbit, previousOrbit, currentPos, satellite, mapLoaded, satColor, prevOrbitColor, showCurrentOrbit, showPreviousOrbit]);

  return (
    <div className="satGroundTrackContainer">
      <canvas ref={canvasRef} className="satGroundTrackCanvas" />
      <div className="satGroundTrackOverlay">
        <div className="satGroundTrackLegend">
          <button
            className={`satGroundTrackToggle ${showCurrentOrbit ? "satGroundTrackToggleActive" : ""}`}
            onClick={() => setShowCurrentOrbit(v => !v)}
          >
            <div className="satGroundTrackLegendDot" style={{ background: showCurrentOrbit ? satColor : "rgba(120,130,140,0.4)" }} />
            <span>Current Orbit</span>
          </button>
          <button
            className={`satGroundTrackToggle ${showPreviousOrbit ? "satGroundTrackToggleActive" : ""}`}
            onClick={() => setShowPreviousOrbit(v => !v)}
          >
            <div className="satGroundTrackLegendDot" style={{ background: showPreviousOrbit ? prevOrbitColor : "rgba(120,130,140,0.4)" }} />
            <span>Previous Orbit</span>
          </button>
          <span className="satGroundTrackLegendDivider" />
          <small>{satellite?.name || ""}</small>
          {currentPos && (
            <small>
              {currentPos.lat.toFixed(2)}°, {currentPos.lon.toFixed(2)}°, {currentPos.alt.toFixed(0)} km
            </small>
          )}
        </div>
      </div>
    </div>
  );
};

const ConjunctionsPanel = ({ conjunctions, onSelect, onClose, satellites }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("distance");
  const [activeTab, setActiveTab] = useState("watch");

  const filtered = useMemo(() => {
    let result = conjunctions;
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(c =>
        c.a.name.toLowerCase().includes(lower) ||
        c.b.name.toLowerCase().includes(lower) ||
        String(c.a.noradId).includes(lower) ||
        String(c.b.noradId).includes(lower)
      );
    }
    if (severityFilter !== "all") {
      result = result.filter(c => c.severity.toLowerCase() === severityFilter);
    }
    if (sortBy === "distance") {
      result = [...result].sort((a, b) => a.distanceKm - b.distanceKm);
    } else if (sortBy === "altitude") {
      result = [...result].sort((a, b) => a.combinedAltitude - b.combinedAltitude);
    } else if (sortBy === "severity") {
      const order = { Critical: 0, High: 1, Moderate: 2, Low: 3 };
      result = [...result].sort((a, b) => order[a.severity] - order[b.severity]);
    }
    return result;
  }, [conjunctions, searchTerm, severityFilter, sortBy]);

  const stats = useMemo(() => {
    return {
      total: conjunctions.length,
      critical: conjunctions.filter(c => c.severity === "Critical").length,
      high: conjunctions.filter(c => c.severity === "High").length,
      moderate: conjunctions.filter(c => c.severity === "Moderate").length,
      low: conjunctions.filter(c => c.severity === "Low").length,
      avgDistance: conjunctions.length > 0 ? Math.round(conjunctions.reduce((s, c) => s + c.distanceKm, 0) / conjunctions.length * 100) / 100 : 0,
      minDistance: conjunctions.length > 0 ? Math.min(...conjunctions.map(c => c.distanceKm)) : 0
    };
  }, [conjunctions]);

  return (
    <div className="satSpaceWeatherDetail">
      <div className="satSpaceWeatherDetailHeader">
        <span><FontAwesomeIcon icon={faTriangleExclamation} /> Conjunction Watch · {conjunctions.length} Close Approaches</span>
        <button className="satSatelliteCloseButton" onClick={onClose}><FontAwesomeIcon icon={faXmark} /></button>
      </div>
      <div className="satDossierTabs">
        <div className="satDossierTabsScroll">
          <button className={`satDossierTab ${activeTab === "watch" ? "satDossierTabActive" : ""}`} onClick={() => setActiveTab("watch")}><FontAwesomeIcon icon={faTriangleExclamation} /> Watch List</button>
          <button className={`satDossierTab ${activeTab === "stats" ? "satDossierTabActive" : ""}`} onClick={() => setActiveTab("stats")}><FontAwesomeIcon icon={faChartColumn} /> Statistics</button>
        </div>
      </div>
      <div className="satDossierBody">
        {activeTab === "watch" && (
          <div className="satDossierTabContent">
            <div className="satPanelCard">
              <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faFilter} /> Filter & Sort</span></div>
              <div className="satPanelCardBody">
                <div className="satFilterRow">
                  <div className="satFilterField">
                    <label>Search</label>
                    <input type="text" placeholder="Name or NORAD ID" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="satSatelliteSearchInput" />
                  </div>
                  <div className="satFilterField">
                    <Dropdown
                      value={labelFor(SEVERITY_FILTER_OPTIONS, severityFilter)}
                      onChange={(option) => setSeverityFilter(valueFor(SEVERITY_FILTER_OPTIONS, option))}
                      options={SEVERITY_FILTER_OPTIONS.map(([, label]) => label)}
                      placeholder="Severity"
                    />
                  </div>
                  <div className="satFilterField">
                    <Dropdown
                      value={labelFor(CONJUNCTION_SORT_OPTIONS, sortBy)}
                      onChange={(option) => setSortBy(valueFor(CONJUNCTION_SORT_OPTIONS, option))}
                      options={CONJUNCTION_SORT_OPTIONS.map(([, label]) => label)}
                      placeholder="Sort By"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="satPanelCard">
              <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faTable} /> Close Approach Pairs ({filtered.length})</span></div>
              <div className="satPanelCardBody">
                {filtered.length === 0 ? (
                  <div className="satPanelEmpty">No conjunctions match the current filter.</div>
                ) : (
                  <div className="satTableScroll">
                    <AdaptiveTable>
                      <thead>
                        <tr><th>Severity</th><th>Distance</th><th>Δ Alt</th><th>Mid Alt</th><th>Object A</th><th>Object B</th><th>Bearing</th><th></th></tr>
                      </thead>
                      <tbody>
                        {filtered.map((c, i) => (
                          <tr key={i} className={`satConjunctionTableRow satConjunctionSev-${c.severity.toLowerCase()}`}>
                            <td><span className={`satConjunctionSeverity satConjunctionSev-${c.severity.toLowerCase()}`}>{c.severity}</span></td>
                            <td><b>{c.distanceKm.toFixed(2)} km</b></td>
                            <td>{c.altitudeDifferenceKm.toFixed(1)} km</td>
                            <td>{c.combinedAltitude} km</td>
                            <td><button className="satTableButton" onClick={() => onSelect && onSelect(c.a)}>{c.a.name}<small>NORAD {c.a.noradId} · {c.a.category}</small></button></td>
                            <td><button className="satTableButton" onClick={() => onSelect && onSelect(c.b)}>{c.b.name}<small>NORAD {c.b.noradId} · {c.b.category}</small></button></td>
                            <td>{c.relativeBearingDeg}°</td>
                            <td><button className="satSatelliteSelectButton" onClick={() => onSelect && onSelect(c.a)}>Inspect</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </AdaptiveTable>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {activeTab === "stats" && (
          <div className="satDossierTabContent">
            <div className="satStatTileGrid">
              <StatTile label="Total Pairs" value={stats.total} sub="Catalog-Wide" accent="#42a5f5" large />
              <StatTile label="Critical (<5km)" value={stats.critical} color="#ff6b6b" accent="#ff6b6b" />
              <StatTile label="High (5-20km)" value={stats.high} color="#FF9500" accent="#FF9500" />
              <StatTile label="Moderate (20-35km)" value={stats.moderate} color="#ffd93d" accent="#ffd93d" />
              <StatTile label="Low (>35km)" value={stats.low} color="#7fe9e1" accent="#7fe9e1" />
              <StatTile label="Mean Distance" value={stats.avgDistance.toFixed(2)} unit="km" accent="#42a5f5" />
              <StatTile label="Closest Pair" value={stats.minDistance.toFixed(2)} unit="km" accent="#ff6b6b" color="#ff6b6b" />
            </div>
            <div className="satPanelCard">
              <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faBookOpen} /> Conjunction Methodology</span></div>
              <div className="satPanelCardBody">
                <div className="satBriefingGrid">
                  <div className="satBriefingItem"><b>Detection</b><p>Conjunctions are found with a spatial-hash pairwise 3D distance check across the full satellite catalog. Active satellites use cached ECI positions; inactive satellites are propagated on demand. The grid cell size matches the threshold so that only pairs in the same or neighboring cells are considered, dropping the cost from O(n²) to roughly O(n) for typical orbital distributions.</p></div>
                  <div className="satBriefingItem"><b>Severity</b><p>Critical means under 5 km, high means 5 to 20 km, moderate means 20 to 35 km, and low means 35 km up to the threshold. Real CSpOC operational thresholds for maneuver decisions are typically 1-5km radial.</p></div>
                  <div className="satBriefingItem"><b>Coordinate Frame</b><p>All distance computations are performed in true ECI kilometers using SGP4 positions, not in compressed scene coordinates, so altitude differences are physically accurate even for satellites at very different orbital regimes.</p></div>
                  <div className="satBriefingItem"><b>Limitations</b><p>This is an instantaneous snapshot using SGP4-propagated positions. True TCA analysis requires covariance propagation and Pc computation per the CSM 18 SPCS standard, which is not implemented here.</p></div>
                  <div className="satBriefingItem"><b>Update Rate</b><p>Conjunctions are refreshed every {Math.round(PERFORMANCE_CONSTANTS.CONJUNCTION_CHECK_INTERVAL_MS / 1000)} seconds against the most recent propagated positions of all satellites in the catalog, regardless of which subset is currently rendered.</p></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ConstellationHealthPanel = ({ data, loading, onRefresh, onClose, onSelect }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("constellations");
  const [selectedConstellation, setSelectedConstellation] = useState(null);

  const filteredEntries = useMemo(() => {
    if (!data) {
      return [];
    }
    const entries = Object.entries(data);
    if (!searchTerm) {
      return entries;
    }
    const lower = searchTerm.toLowerCase();
    return entries.filter(([name, c]) =>
      name.toLowerCase().includes(lower) ||
      (c.operator || "").toLowerCase().includes(lower) ||
      (c.status || "").toLowerCase().includes(lower)
    );
  }, [data, searchTerm]);

  const aggregateStats = useMemo(() => {
    if (!data) {
      return null;
    }
    const entries = Object.entries(data);
    const totalTracked = entries.reduce((s, [, c]) => s + (c.tracked || 0), 0);
    const totalNominal = entries.reduce((s, [, c]) => s + (c.expectedNominal || 0), 0);
    const totalFresh = entries.reduce((s, [, c]) => s + (c.recentTleCount || 0), 0);
    const totalStale = entries.reduce((s, [, c]) => s + (c.staleTleCount || 0), 0);
    const nominalCount = entries.filter(([, c]) => c.status === "Nominal").length;
    const degradedCount = entries.filter(([, c]) => c.status === "Degraded").length;
    const partialCount = entries.filter(([, c]) => c.status === "Partial").length;
    const unavailableCount = entries.filter(([, c]) => c.status === "Unavailable").length;
    return {
      totalConstellations: entries.length,
      totalTracked,
      totalNominal,
      totalFresh,
      totalStale,
      nominalCount,
      degradedCount,
      partialCount,
      unavailableCount,
      overallCoverage: totalNominal > 0 ? Math.min(100, Math.round((totalTracked / totalNominal) * 100)) : 0
    };
  }, [data]);

  return (
    <div className="satSpaceWeatherDetail">
      <div className="satSpaceWeatherDetailHeader">
        <span><FontAwesomeIcon icon={faCircleNodes} /> Constellation Health Monitor</span>
        <button className="satSatelliteCloseButton" onClick={onClose}><FontAwesomeIcon icon={faXmark} /></button>
      </div>
      <div className="satDossierTabs">
        <div className="satDossierTabsScroll">
          <button className={`satDossierTab ${activeTab === "constellations" ? "satDossierTabActive" : ""}`} onClick={() => setActiveTab("constellations")}><FontAwesomeIcon icon={faCircleNodes} /> Constellations</button>
          <button className={`satDossierTab ${activeTab === "fleet" ? "satDossierTabActive" : ""}`} onClick={() => setActiveTab("fleet")}><FontAwesomeIcon icon={faNetworkWired} /> Fleet Aggregate</button>
          <button className={`satDossierTab ${activeTab === "compare" ? "satDossierTabActive" : ""}`} onClick={() => setActiveTab("compare")}><FontAwesomeIcon icon={faTable} /> Comparison Table</button>
        </div>
      </div>
      <div className="satDossierBody">
        {activeTab === "constellations" && (
          <div className="satDossierTabContent">
            <div className="satPanelCard">
              <div className="satPanelCardHeader">
                <span><FontAwesomeIcon icon={faMagnifyingGlass} /> Search</span>
                <button className="satPassComputeButton" onClick={onRefresh}><FontAwesomeIcon icon={loading ? faSpinner : faSatellite} spin={loading} /> {loading ? "Loading" : "Refresh"}</button>
              </div>
              <div className="satPanelCardBody">
                <input type="text" placeholder="Search by Name, Operator, or Status" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="satSatelliteSearchInput" />
              </div>
            </div>
            {!data || filteredEntries.length === 0 ? (
              <div className="satPanelEmpty">{loading ? <div className="loading-circle" /> : "No constellations match the search."}</div>
            ) : (
              <div className="satConstellationGridDense">
                {filteredEntries.map(([group, c]) => {
                  const cappedCoverage = Math.min(100, c.coveragePct || 0);
                  return (
                    <div key={group} className={`satConstellationCard satConstellationStatus-${(c.status || "unknown").toLowerCase()}`} onClick={() => setSelectedConstellation(group)}>
                      <div className="satConstellationHeader">
                        <h5>{group}</h5>
                        <span className={`satConstellationStatusBadge satConstellationStatus-${(c.status || "unknown").toLowerCase()}`}>{c.status}</span>
                      </div>
                      <small>{c.operator}</small>
                      <div className="satConstellationStats">
                        <div><span>Tracked</span><b>{c.tracked}/{c.expectedNominal}</b></div>
                        <div><span>Coverage</span><b>{cappedCoverage}%</b></div>
                        <div><span>Fresh TLE</span><b>{c.recentTleCount}</b></div>
                        <div><span>Stale TLE</span><b>{c.staleTleCount}</b></div>
                        <div><span>Avg Alt</span><b>{c.averageAltitude} km</b></div>
                        <div><span>Avg Inc</span><b>{c.averageInclination}°</b></div>
                      </div>
                      <div className="satConstellationBar">
                        <div className="satConstellationBarFill" style={{ width: `${cappedCoverage}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {selectedConstellation && data && data[selectedConstellation] && data[selectedConstellation].ids && (
              <div className="satPanelCard">
                <div className="satPanelCardHeader">
                  <span><FontAwesomeIcon icon={faList} /> {selectedConstellation} Members ({data[selectedConstellation].ids.length})</span>
                  <button className="satSatelliteCloseButton" onClick={() => setSelectedConstellation(null)}><FontAwesomeIcon icon={faXmark} /></button>
                </div>
                <div className="satPanelCardBody">
                  <div className="satTableScroll">
                    <AdaptiveTable>
                      <thead><tr><th>NORAD</th><th>Name</th><th>Altitude</th><th>TLE Age</th></tr></thead>
                      <tbody>
                        {data[selectedConstellation].ids.map((m, i) => (
                          <tr key={i}>
                            <td>{m.noradId}</td>
                            <td><button className="satTableButton" onClick={() => onSelect && onSelect(m)}>{m.name}</button></td>
                            <td>{m.altitude} km</td>
                            <td style={{ color: tleAgeColor(m.tleAgeDays) }}>{m.tleAgeDays !== null && m.tleAgeDays !== undefined ? `${m.tleAgeDays.toFixed(1)} d` : "?"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </AdaptiveTable>
                  </div>
                </div>
              </div>
            )}
            </div>
          )}
          {activeTab === "fleet" && aggregateStats && (
            <div className="satDossierTabContent">
            <div className="satStatTileGrid">
              <StatTile label="Constellations" value={aggregateStats.totalConstellations} accent="#42a5f5" large />
              <StatTile label="Total Tracked" value={aggregateStats.totalTracked.toLocaleString()} sub={`Of ${aggregateStats.totalNominal.toLocaleString()} Nominal`} accent="#4ecdc4" />
              <StatTile label="Overall Coverage" value={`${aggregateStats.overallCoverage}%`} color={aggregateStats.overallCoverage > 90 ? "#4ecdc4" : aggregateStats.overallCoverage > 70 ? "#FF9500" : "#ff6b6b"} accent={aggregateStats.overallCoverage > 90 ? "#4ecdc4" : aggregateStats.overallCoverage > 70 ? "#FF9500" : "#ff6b6b"} />
              <StatTile label="Fresh TLEs" value={aggregateStats.totalFresh.toLocaleString()} sub="<7 Days Old" color="#4ecdc4" accent="#4ecdc4" />
              <StatTile label="Stale TLEs" value={aggregateStats.totalStale.toLocaleString()} sub=">14 Days Old" color="#ff6b6b" accent="#ff6b6b" />
              <StatTile label="Nominal Status" value={aggregateStats.nominalCount} color="#4ecdc4" accent="#4ecdc4" />
              <StatTile label="Degraded" value={aggregateStats.degradedCount} color="#FF9500" accent="#FF9500" />
              <StatTile label="Partial" value={aggregateStats.partialCount} color="#ffd93d" accent="#ffd93d" />
              <StatTile label="Unavailable" value={aggregateStats.unavailableCount} color="#ff6b6b" accent="#ff6b6b" />
            </div>
            <div className="satPanelCard">
              <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faBookOpen} /> Operational Health Definitions</span></div>
              <div className="satPanelCardBody">
                <div className="satBriefingGrid">
                  <div className="satBriefingItem"><b>Nominal</b><p>The tracked count is at least 95% of the operator's published nominal count. The constellation is operating at full design capacity with redundancy intact.</p></div>
                  <div className="satBriefingItem"><b>Degraded</b><p>The tracked count is between 80% and 95% of nominal. Service may be available with reduced redundancy or coverage gaps in specific regions.</p></div>
                  <div className="satBriefingItem"><b>Partial</b><p>The tracked count is below 80% but above zero. A significant capability impact is likely, and replenishment launches are probably required.</p></div>
                  <div className="satBriefingItem"><b>Unavailable</b><p>There are no tracked satellites in the public catalog. Either the constellation is decommissioned or its members are not in our data sources.</p></div>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === "compare" && data && (
          <div className="satDossierTabContent">
            <div className="satPanelCard">
              <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faTable} /> Constellation Comparison Matrix</span></div>
              <div className="satPanelCardBody">
                <div className="satTableScroll">
                  <AdaptiveTable>
                    <thead>
                      <tr><th>Constellation</th><th>Operator</th><th>Status</th><th>Tracked</th><th>Nominal</th><th>Coverage</th><th>Fresh</th><th>Stale</th><th>Avg Alt</th><th>Avg Inc</th></tr>
                    </thead>
                    <tbody>
                      {Object.entries(data).map(([group, c]) => (
                        <tr key={group} className={`satConstellationStatus-${(c.status || "unknown").toLowerCase()}`}>
                          <td><b>{group}</b></td>
                          <td>{c.operator}</td>
                          <td><span className={`satConstellationStatusBadge satConstellationStatus-${(c.status || "unknown").toLowerCase()}`}>{c.status}</span></td>
                          <td>{c.tracked}</td>
                          <td>{c.expectedNominal}</td>
                          <td>{Math.min(100, c.coveragePct || 0)}%</td>
                          <td style={{ color: "#4ecdc4" }}>{c.recentTleCount}</td>
                          <td style={{ color: "#ff6b6b" }}>{c.staleTleCount}</td>
                          <td>{c.averageAltitude} km</td>
                          <td>{c.averageInclination}°</td>
                        </tr>
                      ))}
                    </tbody>
                  </AdaptiveTable>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const DecayWatchPanel = ({ candidates, loading, onRefresh, onClose, onSelect, methodology }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [sortBy, setSortBy] = useState("days");
  const [activeTab, setActiveTab] = useState("watch");

  const filtered = useMemo(() => {
    if (!candidates) {
      return [];
    }
    let result = candidates;
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(lower) ||
        String(c.noradId).includes(lower) ||
        (c.group || "").toLowerCase().includes(lower)
      );
    }
    if (riskFilter !== "all") {
      result = result.filter(c => c.decayRisk.toLowerCase() === riskFilter);
    }
    if (sortBy === "days") {
      result = [...result].sort((a, b) => a.estimatedDaysToReentry - b.estimatedDaysToReentry);
    } else if (sortBy === "altitude") {
      result = [...result].sort((a, b) => a.altitude - b.altitude);
    } else if (sortBy === "bstar") {
      result = [...result].sort((a, b) => Math.abs(b.bstar || 0) - Math.abs(a.bstar || 0));
    } else if (sortBy === "confidence") {
      const order = { highConfidence: 0, heuristic: 1 };
      result = [...result].sort((a, b) => (order[a.tier] ?? 2) - (order[b.tier] ?? 2));
    }
    return result;
  }, [candidates, searchTerm, riskFilter, sortBy]);

  const stats = useMemo(() => {
    if (!candidates) {
      return null;
    }
    return {
      total: candidates.length,
      imminent: candidates.filter(c => c.decayRisk === "Imminent").length,
      high: candidates.filter(c => c.decayRisk === "High").length,
      moderate: candidates.filter(c => c.decayRisk === "Moderate").length,
      low: candidates.filter(c => c.decayRisk === "Low").length,
      highConfidence: candidates.filter(c => c.tier === "highConfidence").length,
      heuristic: candidates.filter(c => c.tier === "heuristic").length,
      avgAltitude: candidates.length > 0 ? Math.round(candidates.reduce((s, c) => s + c.altitude, 0) / candidates.length) : 0,
      avgDays: candidates.length > 0 ? Math.round(candidates.reduce((s, c) => s + c.estimatedDaysToReentry, 0) / candidates.length) : 0,
      lowestAltitude: candidates.length > 0 ? Math.min(...candidates.map(c => c.altitude)) : 0
    };
  }, [candidates]);

  return (
    <div className="satSpaceWeatherDetail">
      <div className="satSpaceWeatherDetailHeader">
        <span><FontAwesomeIcon icon={faFire} /> Decay & Reentry Watch · {candidates?.length || 0} Candidates</span>
        <button className="satSatelliteCloseButton" onClick={onClose}><FontAwesomeIcon icon={faXmark} /></button>
      </div>
      <div className="satDossierTabs">
        <div className="satDossierTabsScroll">
          <button className={`satDossierTab ${activeTab === "watch" ? "satDossierTabActive" : ""}`} onClick={() => setActiveTab("watch")}><FontAwesomeIcon icon={faFire} /> Watch List</button>
          <button className={`satDossierTab ${activeTab === "stats" ? "satDossierTabActive" : ""}`} onClick={() => setActiveTab("stats")}><FontAwesomeIcon icon={faChartColumn} /> Statistics</button>
        </div>
      </div>
      <div className="satDossierBody">
        {activeTab === "watch" && (
          <div className="satDossierTabContent">
            <div className="satPanelCard">
              <div className="satPanelCardHeader">
                <span><FontAwesomeIcon icon={faFilter} /> Filter & Sort</span>
                <button className="satPassComputeButton" onClick={onRefresh}><FontAwesomeIcon icon={loading ? faSpinner : faFire} spin={loading} /> {loading ? "Loading" : "Refresh"}</button>
              </div>
              <div className="satPanelCardBody">
                <div className="satFilterRow">
                  <div className="satFilterField">
                    <label>Search</label>
                    <input type="text" placeholder="Name, NORAD, or Group" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="satSatelliteSearchInput" />
                  </div>
                  <div className="satFilterField">
                    <Dropdown
                      value={labelFor(RISK_FILTER_OPTIONS, riskFilter)}
                      onChange={(option) => setRiskFilter(valueFor(RISK_FILTER_OPTIONS, option))}
                      options={RISK_FILTER_OPTIONS.map(([, label]) => label)}
                      placeholder="Risk Level"
                    />
                  </div>
                  <div className="satFilterField">
                    <Dropdown
                      value={labelFor(DECAY_SORT_OPTIONS, sortBy)}
                      onChange={(option) => setSortBy(valueFor(DECAY_SORT_OPTIONS, option))}
                      options={DECAY_SORT_OPTIONS.map(([, label]) => label)}
                      placeholder="Sort By"
                    />
                  </div>
                </div>
              </div>
            </div>
            {loading ? (
              <div className="satPanelEmpty"><div className="loading-circle" /></div>
            ) : (
              <div className="satPanelCard">
                <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faTable} /> Decay Candidates ({filtered.length})</span></div>
                <div className="satPanelCardBody">
                  {filtered.length === 0 ? (
                    <div className="satPanelEmpty">No candidates match the filter.</div>
                  ) : (
                    <div className="satTableScroll">
                      <AdaptiveTable>
                        <thead>
                          <tr><th>Risk</th><th>Tier</th><th>Name</th><th>NORAD</th><th>Altitude</th><th>Est. Days</th><th>BSTAR</th><th>F10.7 Adj</th><th>Group</th><th>TLE Age</th><th></th></tr>
                        </thead>
                        <tbody>
                          {filtered.map((c) => (
                            <tr key={c.noradId} className={`satDecayRisk-${c.decayRisk.toLowerCase()}`}>
                              <td><span className={`satDecayRiskBadge satDecayRisk-${c.decayRisk.toLowerCase()}`}>{c.decayRisk}</span></td>
                              <td><span className={`satDecayTierBadge satDecayTier-${c.tier || "heuristic"}`}>{c.tier === "highConfidence" ? "High Conf" : "Heuristic"}</span></td>
                              <td><b>{c.name}</b></td>
                              <td>{c.noradId}</td>
                              <td>{c.altitude.toFixed(0)} km</td>
                              <td>~{c.estimatedDaysToReentry} d</td>
                              <td>{c.bstar ? c.bstar.toExponential(2) : "—"}</td>
                              <td>{c.f107Multiplier ? `${c.f107Multiplier.toFixed(2)}×` : "1.00×"}</td>
                              <td>{c.group || "—"}</td>
                              <td style={{ color: tleAgeColor(c.tleAgeDays) }}>{c.tleAgeDays !== null && c.tleAgeDays !== undefined ? `${c.tleAgeDays.toFixed(1)} d` : "?"}</td>
                              <td><button className="satSatelliteSelectButton" onClick={() => onSelect && onSelect(c)}>Inspect</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </AdaptiveTable>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        {activeTab === "stats" && stats && (
          <div className="satDossierTabContent">
            <div className="satStatTileGrid">
              <StatTile label="Total Candidates" value={stats.total} sub="LEO Objects Under Decay Watch" accent="#42a5f5" large />
              <StatTile label="High Confidence" value={stats.highConfidence} sub={methodology?.highConfidenceCeilingKm ? `BSTAR + Altitude < ${methodology.highConfidenceCeilingKm} km` : "BSTAR + Low Altitude"} color="#ff6b6b" accent="#ff6b6b" />
              <StatTile label="Heuristic Only" value={stats.heuristic} sub="BSTAR Signal Alone" color="#FF9500" accent="#FF9500" />
              <StatTile label="Imminent (<7d)" value={stats.imminent} color="#ff6b6b" accent="#ff6b6b" />
              <StatTile label="High (7-30d)" value={stats.high} color="#FF9500" accent="#FF9500" />
              <StatTile label="Moderate (30-60d)" value={stats.moderate} color="#ffd93d" accent="#ffd93d" />
              <StatTile label="Low (60-90d)" value={stats.low} color="#7fe9e1" accent="#7fe9e1" />
              <StatTile label="Mean Altitude" value={stats.avgAltitude} unit="km" accent="#42a5f5" />
              <StatTile label="Mean Days to Reentry" value={stats.avgDays} unit="days" accent="#FF9500" />
              <StatTile label="Lowest Altitude" value={stats.lowestAltitude.toFixed(0)} unit="km" color="#ff6b6b" accent="#ff6b6b" />
            </div>
            <div className="satPanelCard">
              <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faBookOpen} /> Decay Estimation Methodology</span></div>
              <div className="satPanelCardBody">
                <div className="satBriefingGrid">
                  <div className="satBriefingItem"><b>BSTAR Drag Term</b><p>The B* coefficient from the TLE encodes the satellite's ballistic coefficient including atmospheric density at epoch. Higher absolute values indicate stronger drag effects.</p></div>
                  <div className="satBriefingItem"><b>F10.7 Coupling</b><p>Current F10.7 flux is read from the live SWPC feed and used to scale the heuristic decay rate. The thermosphere expands with rising solar flux, increasing drag on LEO objects. The multiplier ranges from roughly 0.7× (quiet sun, F10.7 ≈ 70 sfu) to 2.0× (active sun, F10.7 ≈ 200+ sfu).{methodology?.f107Current ? ` The current F10.7 is ${methodology.f107Current} sfu.` : ""}</p></div>
                  <div className="satBriefingItem"><b>Estimation</b><p>The heuristic decay rate is approximated as |BSTAR| × altitude × f10_multiplier. Days to reentry are estimated as altitude / (decay rate × 100). This is a first-order heuristic, not an SGP4 propagation to entry interface.</p></div>
                  <div className="satBriefingItem"><b>Confidence Tiers</b><p><b>High Confidence:</b> This tier requires a BSTAR signal and an altitude below {methodology?.highConfidenceCeilingKm || 450} km. These objects are in the regime where atmospheric drag dominates and reentry is plausible within months. <b>Heuristic:</b> This tier has a BSTAR-only signal at altitudes between {methodology?.highConfidenceCeilingKm || 450} and {methodology?.altitudeCeilingKm || 800} km. These are watch list candidates worth deeper investigation, but they are not actionable on the heuristic alone.</p></div>
                  <div className="satBriefingItem"><b>Risk Tiers</b><p>Imminent means under 7 days, high means 7 to 30 days, moderate means 30 to 60 days, and low means 60 to 90 days. Real reentry timing depends heavily on solar activity coupling, satellite attitude, frontal area, and ballistic coefficient evolution.</p></div>
                  <div className="satBriefingItem"><b>Limitations</b><p>True decay analysis requires GP-history fits, atmosphere models (NRLMSISE-00, JB2008), and forward propagation. The F10.7 coupling here is a linear scaling and does not capture the non-linear thermospheric response to sustained high flux or geomagnetic forcing.</p></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const PassPredictionsTab = ({ satellite, satrec, observerLocation, onLocationChange, onPickLocation }) => {
  const [passes, setPasses] = useState([]);
  const [hours, setHours] = useState(48);
  const [minEl, setMinEl] = useState(10);
  const [computing, setComputing] = useState(false);

  const compute = useCallback(() => {
    if (!satrec || !observerLocation) {
      return;
    }
    setComputing(true);
    setTimeout(() => {
      const result = computePassPredictions(satrec, observerLocation.lat, observerLocation.lon, observerLocation.alt || 0, hours, minEl);
      setPasses(result);
      setComputing(false);
    }, 50);
  }, [satrec, observerLocation, hours, minEl]);

  useEffect(() => {
    compute();
  }, [compute]);

  const azCompass = (deg) => {
    const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    return dirs[Math.round(((deg % 360) / 22.5)) % 16];
  };

  return (
    <div className="satDossierTabContent">
      <div className="satPanelCard">
        <div className="satPanelCardHeader">
          <span><FontAwesomeIcon icon={faTowerBroadcast} /> Pass Prediction Setup</span>
          <button className="satPassComputeButton" onClick={compute} disabled={!observerLocation || !satrec}>
            <FontAwesomeIcon icon={computing ? faSpinner : faRoute} spin={computing} /> {computing ? "Computing" : "Compute"}
          </button>
        </div>
        <div className="satPanelCardBody">
          <div className="satPassControlsRow">
            <div className="satPassField satPassFieldLocation">
              <label>Location</label>
              <div className="satWeatherLocationCurrent" title={observerLocation ? `${observerLocation.label || "Custom Coordinates"} | ${observerLocation.lat.toFixed(4)}°, ${observerLocation.lon.toFixed(4)}°` : "No Location Set"}>
                <span className="satWeatherLocationCurrentName">{observerLocation ? observerLocation.label || "Custom Coordinates" : "No Location Set"}</span>
                <span className="satWeatherLocationCurrentCoords">{observerLocation ? `${observerLocation.lat.toFixed(4)}°, ${observerLocation.lon.toFixed(4)}°` : "Use Set Location To Choose One"}</span>
              </div>
            </div>
            <div className="satPassField">
              <label>Altitude (m)</label>
              <input key={`alt-${observerLocation?.alt ?? "x"}`} type="number" placeholder="0" defaultValue={observerLocation?.alt ?? 0} disabled={!observerLocation} onBlur={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v) && observerLocation) onLocationChange({ ...observerLocation, alt: v }); }} />
            </div>
            <div className="satPassField">
              <label>Window (h)</label>
              <input type="number" min="1" max="168" value={hours} onChange={(e) => setHours(Math.max(1, Math.min(168, parseInt(e.target.value) || 48)))} />
            </div>
            <div className="satPassField">
              <label>Min Elevation (°)</label>
              <input type="number" min="0" max="89" value={minEl} onChange={(e) => setMinEl(Math.max(0, Math.min(89, parseInt(e.target.value) || 10)))} />
            </div>
            <div className="satPassField">
              <label>Quick Set</label>
              <button className="satPassLocationButton" onClick={onPickLocation}><FontAwesomeIcon icon={faMapLocation} /> Set Location</button>
            </div>
          </div>
        </div>
      </div>

      {!observerLocation ? (
        <div className="satPanelEmpty">Set a location above to compute pass predictions.</div>
      ) : !satrec ? (
        <div className="satPanelEmpty">No SGP4 propagator is available for this satellite.</div>
      ) : passes.length === 0 ? (
        <div className="satPanelEmpty">No passes above {minEl}° in the next {hours} hours.</div>
      ) : (
        <div className="satPanelCard">
          <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faRoute} /> Upcoming Passes ({passes.length})</span></div>
          <div className="satPanelCardBody">
            <div className="satPassList">
              {passes.map((p, i) => {
                const aosDate = new Date(p.aos);
                const tcaDate = new Date(p.tca);
                const losDate = new Date(p.los);
                return (
                  <div key={i} className="satPassItem">
                    <div className="satPassNumber">#{i + 1}</div>
                    <div className="satPassRow">
                      <div className="satPassEventCol">
                        <div className="satPassEventLabel">AOS</div>
                        <div className="satPassEventTime">{aosDate.toLocaleString()}</div>
                        <div className="satPassEventDetail">{p.aosAzimuth}° {azCompass(p.aosAzimuth)}</div>
                      </div>
                      <div className="satPassEventCol satPassEventColPeak">
                        <div className="satPassEventLabel">TCA</div>
                        <div className="satPassEventTime">{tcaDate.toLocaleString()}</div>
                        <div className="satPassEventDetail">El {p.tcaElevation}° / Az {p.tcaAzimuth}° {azCompass(p.tcaAzimuth)}</div>
                      </div>
                      <div className="satPassEventCol">
                        <div className="satPassEventLabel">LOS</div>
                        <div className="satPassEventTime">{losDate.toLocaleString()}</div>
                        <div className="satPassEventDetail">{p.losAzimuth}° {azCompass(p.losAzimuth)}</div>
                      </div>
                      <div className="satPassDuration">{Math.floor(p.durationSec / 60)}m {p.durationSec % 60}s</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MissionIntelligenceTab = ({ satellite, intelligence, loading, onRefresh }) => {
  if (loading) {
    return (
      <div className="satDossierTabContent">
        <div className="satPanelEmpty"><div className="loading-circle" /></div>
      </div>
    );
  }
  if (!intelligence) {
    return (
      <div className="satDossierTabContent">
        <div className="satPanelEmpty"><div className="loading-circle" /></div>
      </div>
    );
  }
  if (intelligence.error) {
    return (
      <div className="satDossierTabContent">
        <div className="satPanelCard">
          <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faTriangleExclamation} /> Request Failed</span></div>
          <div className="satPanelCardBody">
            <div className="satStatusDisplay satStatusError">
              <FontAwesomeIcon icon={faTriangleExclamation} />
              <p>{intelligence.error}</p>
              {intelligence.partialStages && intelligence.partialStages.length > 0 && (<small>Only these stages completed: {intelligence.partialStages.join(", ")}.</small>)}
              <button className="satSatelliteSelectButton" onClick={onRefresh}><FontAwesomeIcon icon={faBrain} /> Retry</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const intel = intelligence.intelligence || {};
  const tokenSummary = intelligence.tokenUsage;
  return (
    <div className="satDossierTabContent">
      <div className="satMissionIntelHeader">
        <small>
          {intelligence.fromCache ? `Cached ${intelligence.cacheAgeMinutes || 0}m Ago` : `Generated ${formatGeneratedAt(intelligence.generatedAt)}`} · Model: {intelligence.model} · {intelligence.stages || 1} Stage{(intelligence.stages || 1) > 1 ? "s" : ""}
          {tokenSummary && tokenSummary.total !== undefined && ` · Tokens: ${tokenSummary.total}`}
          {intelligence.partialStages && intelligence.partialStages.length > 0 && ` · Partial: ${intelligence.partialStages.join("/")}`}
        </small>
        <button className="satSatelliteSelectButton" onClick={onRefresh}><FontAwesomeIcon icon={faBrain} /> Regenerate</button>
      </div>

      {tokenSummary && tokenSummary.perStage && (
        <div className="satPanelCard">
          <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faGauge} /> Token Usage Per Stage</span></div>
          <div className="satPanelCardBody">
            <div className="satTokenUsageGrid">
              {tokenSummary.perStage.map((s, i) => (
                <div key={i} className="satTokenUsageItem">
                  <div className="satTokenUsageLabel">Stage {s.stage}</div>
                  <div className="satTokenUsageValue">
                    {s.total !== undefined ? s.total : "?"}
                    <span>{s.prompt !== undefined ? `${s.prompt} in` : ""} {s.completion !== undefined ? `· ${s.completion} out` : ""}</span>
                  </div>
                  {s.timedOut && <small style={{ color: "#FF9500" }}>Timed Out</small>}
                  {s.truncated && <small style={{ color: "#FF9500" }}>Truncated</small>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {intel.executiveSummary && (
        <div className="satPanelCard">
          <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faPersonChalkboard} /> Executive Summary</span></div>
          <div className="satPanelCardBody"><p className="satMissionBriefText">{safeRenderText(intel.executiveSummary)}</p></div>
        </div>
      )}

      {intel.missionBrief && (
        <div className="satPanelCard">
          <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faBrain} /> Mission Brief</span></div>
          <div className="satPanelCardBody"><p className="satMissionBriefText">{safeRenderText(intel.missionBrief)}</p></div>
        </div>
      )}

      <div className="satPanelCard">
        <div className="satPanelCardHeader"><span>Operator & Launch</span></div>
        <div className="satPanelCardBody">
          <div className="satDossierStrip">
            <div className="satDossierCell"><div className="satDossierCellLabel">Operator</div><div className="satDossierCellValue">{safeRenderText(intel.operator)}</div></div>
            <div className="satDossierCell"><div className="satDossierCellLabel">Launch Date</div><div className="satDossierCellValue">{safeRenderText(intel.launchDate)}</div></div>
            <div className="satDossierCell"><div className="satDossierCellLabel">Launch Vehicle</div><div className="satDossierCellValue">{safeRenderText(intel.launchVehicle)}</div></div>
            <div className="satDossierCell"><div className="satDossierCellLabel">Launch Site</div><div className="satDossierCellValue">{safeRenderText(intel.launchSite)}</div></div>
            <div className="satDossierCell" style={{ borderLeftColor: intel.missionStatus === "Active" ? "#4ecdc4" : "#FF9500" }}><div className="satDossierCellLabel">Mission Status</div><div className="satDossierCellValue" style={{ color: intel.missionStatus === "Active" ? "#4ecdc4" : "#FF9500" }}>{safeRenderText(intel.missionStatus)}</div></div>
            <div className="satDossierCell"><div className="satDossierCellLabel">International Designator</div><div className="satDossierCellValue">{safeRenderText(intel.internationalDesignator)}</div></div>
          </div>
        </div>
      </div>

      {intel.factSheet && (
        <div className="satPanelCard">
          <div className="satPanelCardHeader"><span>Spacecraft Fact Sheet</span></div>
          <div className="satPanelCardBody">
            <div className="satDossierStrip">
              <div className="satDossierCell"><div className="satDossierCellLabel">Manufacturer</div><div className="satDossierCellValue">{safeRenderText(intel.factSheet.manufacturer)}</div></div>
              <div className="satDossierCell"><div className="satDossierCellLabel">Bus / Platform</div><div className="satDossierCellValue">{safeRenderText(intel.factSheet.bus)}</div></div>
              <div className="satDossierCell"><div className="satDossierCellLabel">Mass</div><div className="satDossierCellValue">{safeRenderText(intel.factSheet.mass)}</div></div>
              <div className="satDossierCell"><div className="satDossierCellLabel">Power</div><div className="satDossierCellValue">{safeRenderText(intel.factSheet.power)}</div></div>
              <div className="satDossierCell"><div className="satDossierCellLabel">Design Life</div><div className="satDossierCellValue">{safeRenderText(intel.factSheet.designLife)}</div></div>
              <div className="satDossierCell"><div className="satDossierCellLabel">Propulsion</div><div className="satDossierCellValue">{safeRenderText(intel.factSheet.propulsion)}</div></div>
              <div className="satDossierCell"><div className="satDossierCellLabel">Stabilization</div><div className="satDossierCellValue">{safeRenderText(intel.factSheet.stabilization)}</div></div>
            </div>
          </div>
        </div>
      )}

      {intel.instruments && intel.instruments.length > 0 && (
        <div className="satPanelCard">
          <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faMicrochip} /> Instruments / Payload</span></div>
          <div className="satPanelCardBody">
            <div className="satInstrumentList">
              {intel.instruments.map((inst, i) => (<span key={i} className="satInstrumentChip">{safeRenderText(inst)}</span>))}
            </div>
          </div>
        </div>
      )}

      {intel.scientificContribution && (
        <div className="satPanelCard">
          <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faMicroscope} /> Scientific Contribution</span></div>
          <div className="satPanelCardBody"><p className="satMissionBriefText">{safeRenderText(intel.scientificContribution)}</p></div>
        </div>
      )}

      {intel.notableEvents && intel.notableEvents.length > 0 && (
        <div className="satPanelCard">
          <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faClock} /> Notable Events Timeline</span></div>
          <div className="satPanelCardBody">
            <div className="satTimelineList">
              {intel.notableEvents.map((e, i) => (<div key={i} className="satTimelineItem"><div className="satTimelineDate">{safeRenderText(e.date)}</div><div className="satTimelineEvent">{safeRenderText(e.event)}</div></div>))}
            </div>
          </div>
        </div>
      )}

      {intel.constellationContext && (
        <div className="satPanelCard">
          <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faCircleNodes} /> Constellation Context</span></div>
          <div className="satPanelCardBody"><p className="satMissionBriefText">{safeRenderText(intel.constellationContext)}</p></div>
        </div>
      )}

      {intel.riskAssessment && (
        <div className="satPanelCard">
          <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faTriangleExclamation} /> Risk Assessment</span></div>
          <div className="satPanelCardBody">
            <div className="satRiskGrid">
              <div className="satRiskItem"><b>TLE Age</b><p>{safeRenderText(intel.riskAssessment.tleAgeRisk)}</p></div>
              <div className="satRiskItem"><b>Decay</b><p>{safeRenderText(intel.riskAssessment.decayRisk)}</p></div>
              <div className="satRiskItem"><b>Conjunction</b><p>{safeRenderText(intel.riskAssessment.conjunctionRisk)}</p></div>
              <div className="satRiskItem"><b>Operational</b><p>{safeRenderText(intel.riskAssessment.operationalRisk)}</p></div>
              {intel.riskAssessment.cyberRisk && <div className="satRiskItem"><b>Cyber/Comms</b><p>{safeRenderText(intel.riskAssessment.cyberRisk)}</p></div>}
              {intel.riskAssessment.regulatoryRisk && <div className="satRiskItem"><b>Regulatory</b><p>{safeRenderText(intel.riskAssessment.regulatoryRisk)}</p></div>}
            </div>
          </div>
        </div>
      )}

      {intel.geopoliticalSignificance && (
        <div className="satPanelCard">
          <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faGlobe} /> Geopolitical Significance</span></div>
          <div className="satPanelCardBody"><p className="satMissionBriefText">{safeRenderText(intel.geopoliticalSignificance)}</p></div>
        </div>
      )}

      {intel.commercialContext && (
        <div className="satPanelCard">
          <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faChartColumn} /> Commercial / Market Context</span></div>
          <div className="satPanelCardBody"><p className="satMissionBriefText">{safeRenderText(intel.commercialContext)}</p></div>
        </div>
      )}

      {intelligence.sources && intelligence.sources.length > 0 && (
        <div className="satPanelCard">
          <div className="satPanelCardHeader"><span>Grounded Sources ({intelligence.sources.length})</span></div>
          <div className="satPanelCardBody">
            <div className="satSourceList">
              {intelligence.sources.map((s, i) => (<a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="satSourceLink">{s.title || s.url}</a>))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ObservationsTab = ({ satellite, observation, loading, onRefresh }) => {
  const altKm = satellite?.altitude || 0;
  const period = satellite?.period || 0;
  const isLEO = altKm > 0 && altKm < 2000;
  const isMEO = altKm >= 2000 && altKm < 35000;
  const isGEO = altKm >= 35000 && altKm < 36500;
  const isHEO = altKm >= 36500;

  const horizonDist = altKm > 0 ? Math.round(Math.sqrt(Math.pow(6371 + altKm, 2) - Math.pow(6371, 2))) : 0;
  const passesPerDay = period > 0 ? Math.round(1440 / period) : 0;
  const footprintRadius = altKm > 0 ? Math.round(6371 * Math.acos(6371 / (6371 + altKm)) * 180 / Math.PI * 111) : 0;

  let visibilityClass = "Unknown";
  let visibilityColor = "#808080";
  let visibilityNote = "There is not enough orbital data to estimate observability.";

  if (isLEO && altKm < 600) {
    visibilityClass = "Naked Eye";
    visibilityColor = "#4ecdc4";
    visibilityNote = "Low LEO objects can reach magnitude -3 to +3 during twilight passes. Look for them as fast-moving stars 30-90 minutes after sunset or before sunrise. Brighter objects (ISS-class) are unmistakable; smaller payloads may need binoculars.";
  } else if (isLEO) {
    visibilityClass = "Marginal";
    visibilityColor = "#ffd93d";
    visibilityNote = "Higher LEO objects are dimmer and require darker skies. Many are visible to the naked eye during favorable twilight passes; binoculars or a small telescope help significantly. Magnitude typically ranges +3 to +7.";
  } else if (isMEO) {
    visibilityClass = "Telescope";
    visibilityColor = "#FF9500";
    visibilityNote = "MEO altitude (e.g. GPS, GLONASS) is beyond reliable naked-eye visibility. Amateur telescopes 8\" or larger under dark skies can resolve them as faint moving points. Best observed near opposition.";
  } else if (isGEO) {
    visibilityClass = "Telescope · Stationary";
    visibilityColor = "#FF9500";
    visibilityNote = "GEO satellites appear nearly stationary in the sky, drifting along the celestial equator. Typically magnitude +10 to +13. A telescope on an equatorial mount makes them easy targets once located.";
  } else if (isHEO) {
    visibilityClass = "Specialized";
    visibilityColor = "#7fe9e1";
    visibilityNote = "Highly elliptical orbits sweep through wide altitude ranges. Brightness varies dramatically along the orbit; observation requires precise pass timing and tracking equipment.";
  }

  const enrichRef = (label) => {
    if (!label) return "";
    if (label === "N2YO Tracking") return "This service offers real-time position tracking, pass predictions, and visibility maps for ground observers.";
    if (label === "Heavens-Above") return "This service offers detailed pass predictions, brightness estimates, and visual observation guides.";
    if (label === "CelesTrak SATCAT") return "This is the authoritative TLE source and an archive of historical orbital elements.";
    if (label.toLowerCase().includes("wikipedia")) return "This reference article covers mission background, history, and technical details.";
    if (label.toLowerCase().includes("space-track")) return "This is the official US Space Force catalog, with TLE history and ownership data.";
    return "";
  };

  const hostnameOf = (url) => {
    try {
      return new URL(url).hostname.replace("www.", "");
    } catch (error) {
      return url;
    }
  };

  const renderOverview = () => (
    <>
      <div className="satDossierStrip">
        <div className="satDossierCell" style={{ borderLeftColor: visibilityColor }}><div className="satDossierCellLabel">Visibility</div><div className="satDossierCellValue" style={{ color: visibilityColor }}>{visibilityClass}</div></div>
        <div className="satDossierCell"><div className="satDossierCellLabel">Orbit Class</div><div className="satDossierCellValue">{satellite?.category || "—"}</div></div>
        <div className="satDossierCell"><div className="satDossierCellLabel">Altitude</div><div className="satDossierCellValue">{altKm}<span>km</span></div></div>
        <div className="satDossierCell"><div className="satDossierCellLabel">Passes / Day</div><div className="satDossierCellValue">{passesPerDay}<span>Orbital</span></div></div>
        <div className="satDossierCell"><div className="satDossierCellLabel">Horizon Distance</div><div className="satDossierCellValue">{horizonDist}<span>km</span></div></div>
        <div className="satDossierCell"><div className="satDossierCellLabel">Footprint Radius</div><div className="satDossierCellValue">{footprintRadius}<span>km</span></div></div>
        <div className="satDossierCell"><div className="satDossierCellLabel">NORAD ID</div><div className="satDossierCellValue">{satellite?.noradId || "—"}</div></div>
      </div>
      <div className="satPanelCard">
        <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faEye} /> Observation Guide</span></div>
        <div className="satPanelCardBody"><p>{visibilityNote}</p></div>
      </div>
    </>
  );

  if (loading) {
    return (
      <div className="satDossierTabContent">
        {renderOverview()}
        <div className="satPanelEmpty"><div className="loading-circle" /></div>
      </div>
    );
  }

  if (!observation) {
    return (
      <div className="satDossierTabContent">
        {renderOverview()}
        <div className="satPanelEmpty"><div className="loading-circle" /></div>
      </div>
    );
  }

  const externalRefs = (observation.references || []).map(r => ({
    label: r.label,
    url: r.url,
    description: enrichRef(r.label),
    host: hostnameOf(r.url)
  }));

  return (
    <div className="satDossierTabContent">
      {renderOverview()}

      {observation.wikipedia && (
        <div className="satPanelCard">
          <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faGlobe} /> {observation.wikipedia.title}</span></div>
          <div className="satPanelCardBody">
            {observation.wikipedia.thumbnail && (<img src={observation.wikipedia.thumbnail} alt={observation.wikipedia.title} className="satWikiThumb" />)}
            <p>{observation.wikipedia.extract}</p>
            {observation.wikipedia.url && (<a href={observation.wikipedia.url} target="_blank" rel="noopener noreferrer" className="satSourceLink">Read More on Wikipedia</a>)}
          </div>
        </div>
      )}

      {observation.imagery && observation.imagery.length > 0 && (
        <div className="satPanelCard">
          <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faSatelliteDish} /> Public Imagery / Data</span></div>
          <div className="satPanelCardBody">
            <div className="satImageryGrid">
              {observation.imagery.map((img, i) => (
                <div key={i} className="satImageryCard">
                  <div className="satImageryLabel">{img.label}</div>
                  {img.wmts && (<img src={img.wmts} alt={img.label} className="satImageryThumb" onError={(e) => { e.target.style.display = "none"; }} />)}
                  {img.worldview && (<a href={img.worldview} target="_blank" rel="noopener noreferrer" className="satImageryLink"><FontAwesomeIcon icon={faGlobe} /> Open in NASA Worldview</a>)}
                  {img.date && <small>Date: {img.date}.</small>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {observation.issData && (
        <div className="satPanelCard">
          <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faSatellite} /> ISS Real-Time Status</span></div>
          <div className="satPanelCardBody">
            {observation.issData.position && (
              <div className="satDossierStrip">
                <div className="satDossierCell"><div className="satDossierCellLabel">Latitude</div><div className="satDossierCellValue">{observation.issData.position.latitude?.toFixed(4)}°</div></div>
                <div className="satDossierCell"><div className="satDossierCellLabel">Longitude</div><div className="satDossierCellValue">{observation.issData.position.longitude?.toFixed(4)}°</div></div>
                <div className="satDossierCell"><div className="satDossierCellLabel">Altitude</div><div className="satDossierCellValue">{observation.issData.position.altitude?.toFixed(2)}<span>km</span></div></div>
                <div className="satDossierCell"><div className="satDossierCellLabel">Velocity</div><div className="satDossierCellValue">{observation.issData.position.velocity?.toFixed(2)}<span>km/h</span></div></div>
                <div className="satDossierCell"><div className="satDossierCellLabel">Visibility</div><div className="satDossierCellValue">{observation.issData.position.visibility}</div></div>
                <div className="satDossierCell"><div className="satDossierCellLabel">Total in Space</div><div className="satDossierCellValue">{observation.issData.totalInSpace}</div></div>
              </div>
            )}
            {observation.issData.crew && observation.issData.crew.length > 0 && (
              <div style={{ marginTop: "12px" }}>
                <h5>ISS Crew ({observation.issData.crew.length})</h5>
                <div className="satInstrumentList">
                  {observation.issData.crew.map((name, i) => (<span key={i} className="satInstrumentChip">{name}</span>))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {observation.activeEvents && observation.activeEvents.length > 0 && (
        <div className="satPanelCard">
          <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faFire} /> Active Earth Events (NASA EONET)</span></div>
          <div className="satPanelCardBody">
            <div className="satEONETList">
              {observation.activeEvents.slice(0, 10).map((e, i) => (
                <a key={i} href={e.link} target="_blank" rel="noopener noreferrer" className="satEONETItem">
                  <div className="satEONETTitle">{e.title}</div>
                  <div className="satEONETMeta">
                    {e.categories.map((c, j) => <span key={j} className="satEONETCategory">{c}</span>)}
                    <span>{e.date ? new Date(e.date).toLocaleDateString() : ""}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {externalRefs.length > 0 && (
        <div className="satPanelCard">
          <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faSatelliteDish} /> External Tracking & Catalogs</span></div>
          <div className="satPanelCardBody">
            <div className="satExternalRefGrid">
              {externalRefs.map((r, i) => (
                <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="satExternalRefCard">
                  <div className="satExternalRefName">{r.label}</div>
                  {r.description && <div className="satExternalRefDesc">{r.description}</div>}
                  <div className="satExternalRefUrl">{r.host}</div>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TleHistoryTab = ({ satellite }) => {
  const [rangeKey, setRangeKey] = useState("90d");
  const [history, setHistory] = useState({ frames: [], loading: false, error: null, backfill: null, supported: false });
  const productKey = satellite?.noradId ? `${SOURCES.harvest.productPrefix}${satellite.noradId}` : null;
  const range = SOURCES.harvest.historyRanges.find(([key]) => key === rangeKey) || SOURCES.harvest.historyRanges[1];

  useEffect(() => {
    if (!productKey) return undefined;
    let cancelled = false;
    const load = async () => {
      setHistory((prev) => ({ ...prev, loading: true, error: null }));
      const to = new Date();
      const from = new Date(to.getTime() - range[2] * 1000);
      const step = Math.max(0, Math.floor(range[2] / SOURCES.harvest.historyPoints));
      try {
        const [framesResponse, productResponse] = await Promise.all([
          fetch(`${SOURCES.harvest.base}/products/${encodeURIComponent(productKey)}/frames?from=${from.toISOString()}&to=${to.toISOString()}&limit=2000&step=${step}`),
          fetch(`${SOURCES.harvest.base}/products/${encodeURIComponent(productKey)}`)
        ]);
        const framesData = framesResponse.ok ? await framesResponse.json() : { frames: [] };
        const productData = productResponse.ok ? await productResponse.json() : {};
        const supported = Boolean(productData?.product?.history);
        const frames = (framesData.frames || []).map((frame) => ({ time: frame.observedAt, ...frame.metadata }));
        if (!cancelled) setHistory((prev) => ({ frames, loading: false, error: null, backfill: prev.backfill, supported }));
      } catch (error) {
        if (!cancelled) setHistory((prev) => ({ ...prev, loading: false, error: "The element history could not be loaded." }));
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [productKey, rangeKey]);

  const startExport = (label) => {
    const option = SOURCES.harvest.exportOptions.find(([name]) => name === label);
    if (!option || !productKey) return;
    const to = new Date();
    const from = new Date(to.getTime() - range[2] * 1000);
    const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString(), format: option[1] });
    window.open(`${SOURCES.harvest.base}/products/${encodeURIComponent(productKey)}/export?${params.toString()}`, "_blank", "noopener");
  };

  const latestSets = history.frames.slice(-12).reverse();

  const requestHistory = async () => {
    if (!productKey) return;
    const to = new Date();
    const from = new Date(to.getTime() - range[2] * 1000);
    try {
      const response = await fetch(`${SOURCES.harvest.base}/products/${encodeURIComponent(productKey)}/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: from.toISOString(), to: to.toISOString() })
      });
      const data = await response.json().catch(() => ({}));
      setHistory((prev) => ({ ...prev, backfill: response.ok && data.queued ? "queued" : "recent" }));
    } catch (error) {
      setHistory((prev) => ({ ...prev, error: "The history request could not be sent." }));
    }
  };

  const ageDays = satellite.tleAgeDays;
  const errorEnvelope1d = ageDays !== null ? Math.max(0.5, ageDays * 0.5) : null;
  const errorEnvelope7d = ageDays !== null ? Math.max(2, ageDays * 2) : null;
  return (
    <div className="satDossierTabContent">
      <div className="satPanelCard">
        <div className="satPanelCardHeader"><span>TLE Quality</span></div>
        <div className="satPanelCardBody">
          <div className="satDossierStrip">
            <div className="satDossierCell"><div className="satDossierCellLabel">Epoch</div><div className="satDossierCellValue">{satellite.tleEpoch || "Unknown"}</div></div>
            <div className="satDossierCell" style={{ borderLeftColor: tleAgeColor(ageDays) }}><div className="satDossierCellLabel">Age</div><div className="satDossierCellValue" style={{ color: tleAgeColor(ageDays) }}>{ageDays !== null ? ageDays : "?"}<span>Days</span></div></div>
            <div className="satDossierCell" style={{ borderLeftColor: tleAgeColor(ageDays) }}><div className="satDossierCellLabel">Quality Class</div><div className="satDossierCellValue" style={{ color: tleAgeColor(ageDays) }}>{tleAgeLabel(ageDays)}</div></div>
            <div className="satDossierCell"><div className="satDossierCellLabel">BSTAR Drag</div><div className="satDossierCellValue">{satellite.bstar !== undefined ? satellite.bstar.toExponential(3) : "?"}</div></div>
            <div className="satDossierCell"><div className="satDossierCellLabel">Error +1d</div><div className="satDossierCellValue">{errorEnvelope1d !== null ? `~${errorEnvelope1d.toFixed(1)}` : "?"}<span>km</span></div></div>
            <div className="satDossierCell"><div className="satDossierCellLabel">Error +7d</div><div className="satDossierCellValue">{errorEnvelope7d !== null ? `~${errorEnvelope7d.toFixed(1)}` : "?"}<span>km</span></div></div>
          </div>
        </div>
      </div>
      <div className="satPanelCard">
        <div className="satPanelCardHeader"><span>Raw TLE</span></div>
        <div className="satPanelCardBody">
          <pre className="satTLEBlock">{satellite.tle?.line1 || ""}{"\n"}{satellite.tle?.line2 || ""}</pre>
        </div>
      </div>
      <div className="satPanelCard satTleHistoryCard">
        <div className="satPanelCardHeader">
          <span><FontAwesomeIcon icon={faChartLine} /> Element History</span>
          <div className="satTleHistoryControls">
            {SOURCES.harvest.historyRanges.map(([key, label]) => (
              <button key={key} className={`satSatelliteSelectButton ${rangeKey === key ? "satSatelliteButtonActive" : ""}`} onClick={() => setRangeKey(key)}>{label}</button>
            ))}
            {history.supported && !history.backfill && history.frames.length < SOURCES.harvest.backfillThreshold && (
              <button className="satSatelliteSelectButton" onClick={requestHistory}>Request History</button>
            )}
            <div className="satTleHistoryExport">
              <Dropdown value="" onChange={startExport} options={SOURCES.harvest.exportOptions.map(([label]) => label)} placeholder="Export" />
            </div>
          </div>
        </div>
        <div className="satPanelCardBody">
          {history.loading && history.frames.length === 0 && (
            <div className="satTleHistoryNote"><FontAwesomeIcon icon={faSpinner} spin /> Loading Element History</div>
          )}
          {history.error && <div className="satTleHistoryNote satTleHistoryNoteError">{history.error}</div>}
          {!history.loading && !history.error && history.frames.length === 0 && (
            <div className="satTleHistoryNote">
              {history.backfill === "queued"
                ? "A historical backfill was requested, and element sets will appear here as they are collected."
                : history.backfill === "recent"
                  ? "A historical backfill was already requested for this window, and element sets will appear as they are collected."
                  : history.supported
                    ? "No element sets were recorded in this window yet, and Request History downloads them once from Space-Track."
                    : "No element sets were recorded in this window yet, and the harvester builds this history as new element sets are published."}
            </div>
          )}
          {history.frames.length > 0 && (
            <>
              <div className="satTleHistoryCharts">
                <ChartCanvas values={history.frames} valueKey="perigeeKm" height={150} accent="#4ecdc4" label="Perigee Altitude" unit="km" valueFormatter={(v) => v.toFixed(1)} />
                <ChartCanvas values={history.frames} valueKey="apogeeKm" height={150} accent="#42a5f5" label="Apogee Altitude" unit="km" valueFormatter={(v) => v.toFixed(1)} />
                <ChartCanvas values={history.frames} valueKey="bstar" height={150} accent="#FF9500" label="BSTAR Drag Term" unit="" valueFormatter={(v) => v.toExponential(2)} />
                <ChartCanvas values={history.frames} valueKey="inclination" height={150} accent="#ffd93d" label="Inclination" unit="°" valueFormatter={(v) => v.toFixed(4)} />
              </div>
              <div className="satTableScroll">
                <AdaptiveTable>
                  <thead>
                    <tr><th>Epoch</th><th>Perigee (km)</th><th>Apogee (km)</th><th>Period (min)</th><th>Inclination (°)</th><th>BSTAR</th><th>Source</th></tr>
                  </thead>
                  <tbody>
                    {latestSets.map((set) => (
                      <tr key={set.time}>
                        <td>{new Date(set.time).toLocaleString()}</td>
                        <td>{Number.isFinite(set.perigeeKm) ? set.perigeeKm.toFixed(1) : "—"}</td>
                        <td>{Number.isFinite(set.apogeeKm) ? set.apogeeKm.toFixed(1) : "—"}</td>
                        <td>{Number.isFinite(set.periodMin) ? set.periodMin.toFixed(2) : "—"}</td>
                        <td>{Number.isFinite(set.inclination) ? set.inclination.toFixed(4) : "—"}</td>
                        <td>{Number.isFinite(set.bstar) ? set.bstar.toExponential(3) : "—"}</td>
                        <td>{set.source || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </AdaptiveTable>
              </div>
              <div className="satTleHistoryNote">{`${history.frames.length.toLocaleString()} element sets are shown for this window.`}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const SEVERITY_FILTER_OPTIONS = [["all", "All"], ["critical", "Critical"], ["high", "High"], ["moderate", "Moderate"], ["low", "Low"]];

const CONJUNCTION_SORT_OPTIONS = [["distance", "Closest First"], ["altitude", "Lowest Altitude"], ["severity", "Most Severe"]];

const RISK_FILTER_OPTIONS = [["all", "All"], ["imminent", "Imminent"], ["high", "High"], ["moderate", "Moderate"], ["low", "Low"]];

const DECAY_SORT_OPTIONS = [["days", "Soonest Reentry"], ["altitude", "Lowest Altitude"], ["bstar", "Highest BSTAR"], ["confidence", "Confidence Tier"]];

const labelFor = (options, value) => (options.find(([v]) => v === value) || [null, ""])[1];

const valueFor = (options, label) => (options.find(([, l]) => l === label) || [options[0][0]])[0];

const DEFAULT_LAYOUT = { nav: true, header: true, sidebar: true, footer: true };

const LAYOUT_TOGGLES = [["nav", "Nav"], ["header", "Header"], ["sidebar", "Sidebar"], ["footer", "Footer"]];

const EXPANDABLE_SELECTOR = ".satStatTileLabel, .satStatTileSub, .satStatTileValue, .satSatelliteHUDSectionItem span, .satDossierCellLabel, .satDossierCellValue, .satSatelliteName, .satSatelliteSideBarHeader h1 small";

const EXPAND_CONTAINER_PATTERN = /(Tile|Cell|Card|Item|Row|Section|Panel|Banner|Header)(\s|$)/;

const isInteractiveTarget = (target, root) => {
  if (target.closest("button, a, input, select, textarea, label, [role='button']")) return true;
  let node = target;
  while (node && node !== root && node !== document.body) {
    if (window.getComputedStyle(node).cursor === "pointer") return true;
    node = node.parentElement;
  }
  return false;
};

const findExpandContainer = (element, root) => {
  let node = element.parentElement;
  for (let depth = 0; node && node !== root && depth < 6; depth++) {
    if (EXPAND_CONTAINER_PATTERN.test(String(node.className || ""))) return node;
    node = node.parentElement;
  }
  return element.parentElement || element;
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
          <FontAwesomeIcon icon={faMagnifyingGlass} className="satOpSearchBarIcon" />
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

const PanelModal = ({ onClose, children }) => {
  useEffect(() => {
    const handleKey = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);
  return createPortal(
    <div className="satModalPortal">
      <div className="satFeedsModalOverlay" onClick={onClose}>
        <div className="satFeedsModal satPanelModal" onClick={(event) => event.stopPropagation()}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

const ExpandModal = ({ view, onClose }) => {
  useEffect(() => {
    if (!view) return undefined;
    const handleKey = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [view, onClose]);
  if (!view) return null;
  return createPortal(
    <div className="satModalPortal">
      <div className="satFeedsModalOverlay" onClick={onClose}>
        <div className="satFeedsModal" onClick={(event) => event.stopPropagation()}>
          <div className="satFeedsModalHeader">
            <span>{view.title}</span>
            <button type="button" className="satFeedsModalClose" onClick={onClose} aria-label="Close">
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
          <div className="satFeedsModalContent">
            <div className="satExpandedContent" dangerouslySetInnerHTML={{ __html: view.html }} />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

const CUSTOM_LOCATION_LABEL = "Custom Coordinates";

const SOUND_VOLUME_OPTIONS = [[0.3, "Quiet"], [0.6, "Normal"], [1, "Loud"]];

const SNOOZE_OPTIONS = [[15, "15 Minutes"], [30, "30 Minutes"], [60, "1 Hour"], [120, "2 Hours"], [240, "4 Hours"], [480, "8 Hours"], [1440, "24 Hours"]];

const SOUND_LEVEL_LABELS = { notice: "Notice", warning: "Warning", critical: "Critical", emergency: "Emergency" };

const ALERT_SCOPE_OPTIONS = [["selected", "Alert For Selected Area"], ["areas", "Alert For All Areas"]];

const ALERT_SEVERITY_ORDER = { CRITICAL: 0, WARNING: 1 };

const ALERT_SEVERITY_COLORS = { CRITICAL: "#ff6b6b", WARNING: "#FF9500" };

const ALERT_SOUND_LEVEL_MAP = { CRITICAL: "critical", WARNING: "warning" };

const ALERT_KIND_LABELS = { spaceWeather: "Space Weather", reentry: "Reentry Prediction", reentryNear: "Reentry Near Location", collision: "Collision Risk" };

const ALERT_DETAIL_LABELS = { messageCode: "Message Code", serialNumber: "Serial Number", scale: "NOAA Scale", kIndex: "K-Index", description: "Description", noradId: "NORAD ID", objectType: "Object Type", radarCrossSection: "Radar Cross Section", country: "Country", windowMinutes: "Uncertainty Window (Min)", direction: "Direction", revolution: "Revolution", inclination: "Inclination (°)", highInterest: "High Interest", nextReportHours: "Next Report (H)", cdmId: "CDM ID", missDistanceMeters: "Miss Distance (M)", collisionProbability: "Collision Probability", emergencyReportable: "Emergency Reportable", crewedSpacecraft: "Crewed Spacecraft", object1: "Object 1", object1Type: "Object 1 Type", object1RadarCrossSection: "Object 1 Radar Cross Section", object2: "Object 2", object2Type: "Object 2 Type", object2RadarCrossSection: "Object 2 Radar Cross Section" };

const alertItemKey = (item) => item.key;

const alertItemIdentity = (item) => item.identity;

const alertSoundLevel = (item) => ALERT_SOUND_LEVEL_MAP[item.severity] || null;

const alertSoundMessage = (item, ended) => ({ title: ended ? `${item.title} Ended` : item.title, body: item.message });

const formatAlertTime = (iso) => (iso ? new Date(iso).toLocaleString() : null);

const alertDetailValue = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return Number.isInteger(value) ? value.toLocaleString() : Number(value.toFixed(3)).toLocaleString();
  if (typeof value === "object") return null;
  return String(value);
};

const alertFields = (item) => [
  ["Severity", item.severity === "CRITICAL" ? "Critical" : "Warning"],
  ["Type", ALERT_KIND_LABELS[item.kind] || null],
  ["Source", item.source],
  ["Location", item.placeLabel],
  ["Distance", item.distanceKm !== undefined && item.distanceKm !== null ? `${item.distanceKm.toLocaleString()} km` : null],
  ["Issued", formatAlertTime(item.issuedAt)],
  [item.kind === "collision" ? "Closest Approach" : item.kind === "spaceWeather" ? "Event Time" : "Predicted Reentry", formatAlertTime(item.eventAt)],
  ["Expires", item.kind === "spaceWeather" ? formatAlertTime(item.expiresAt) : null],
  ["Predicted Point", Number.isFinite(item.lat) && Number.isFinite(item.lon) ? `${item.lat.toFixed(2)}°, ${item.lon.toFixed(2)}°` : null],
  ["Proximity Radius", Number.isFinite(item.nearRadiusKm) ? `${item.nearRadiusKm.toLocaleString()} km` : null],
  ...Object.entries(item.details && typeof item.details === "object" ? item.details : {}).map(([key, value]) => [ALERT_DETAIL_LABELS[key] || titleCaseWords(key.replace(/([a-z0-9])([A-Z])/g, "$1 $2")), alertDetailValue(value)])
];

const areaCenter = (area) => (area.mode === "point_radius" ? { lat: area.latitude, lon: area.longitude } : { lat: (area.min_lat + area.max_lat) / 2, lon: (area.min_lng + area.max_lng) / 2 });

const AdaptiveTable = ({ children }) => {
  const tableRef = useRef(null);
  useLayoutEffect(() => {
    const table = tableRef.current;
    if (!table) return;
    const rows = Array.from(table.rows);
    const widths = [];
    for (const row of rows) Array.from(row.cells).forEach((cell, column) => { widths[column] = Math.max(widths[column] || 0, cell.textContent.trim().length); });
    for (const row of rows) {
      Array.from(row.cells).forEach((cell, column) => {
        const kind = widths[column] > SOURCES.tables.wrapAt ? "satWeatherCellWrap" : widths[column] > SOURCES.tables.tightAt ? "satWeatherCellMedium" : "satWeatherCellTight";
        cell.classList.remove("satWeatherCellWrap", "satWeatherCellMedium", "satWeatherCellTight");
        cell.classList.add(kind);
      });
    }
  });
  return <table ref={tableRef} className="satDataTable satWeatherDataTable">{children}</table>;
};

const titleCaseName = (text) => String(text || "").toLowerCase().replace(/(^|[\s/(-])([a-z])/g, (match, lead, ch) => `${lead}${ch.toUpperCase()}`);

const parseOfficialText = (text) => {
  const blocks = String(text || "").replace(/\r/g, "").split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
  return blocks.map((block) => {
    const items = [];
    for (const rawLine of block.split("\n")) {
      const line = rawLine.trim();
      if (!line) continue;
      if (/^[-*•]\s+/.test(line) || !items.length) items.push(line);
      else items[items.length - 1] = `${items[items.length - 1]} ${line}`;
    }
    const first = items[0] || "";
    const section = /^(?:[-*•]\s*)?([A-Z][A-Z0-9 /&'()-]{1,40}?)\s*\.{2,}\s*(.*)$/.exec(first);
    const clean = (value) => value.replace(/^[-*•]\s+/, "").replace(/^([^.]{3,80}?)\s*\.{3,}\s*/, "$1: ").replace(/\s*\.{3,}\s*/g, "… ").replace(/\s{2,}/g, " ").trim();
    if (section) {
      const lead = clean(section[2]);
      const rest = items.slice(1).map(clean).filter(Boolean);
      return { label: section[1].trim(), text: lead, bullets: rest };
    }
    if (items.length > 1 && items.every((item) => /^[-*•]\s+/.test(item))) return { label: null, text: "", bullets: items.map(clean) };
    return { label: null, text: clean(items.join(" ")), bullets: [] };
  });
};

const linkify = (text) => String(text || "").split(/(https?:\/\/[^\s]+)/g).map((part, index) => (/^https?:\/\//.test(part)
  ? <a key={index} className="satWeatherTableLink" href={part.replace(/[.,;)]+$/, "").replace(/^http:/, "https:")} target="_blank" rel="noopener noreferrer">{part.replace(/[.,;)]+$/, "")}</a>
  : <React.Fragment key={index}>{part}</React.Fragment>));

const OfficialText = ({ title, text }) => {
  const sections = parseOfficialText(text);
  if (!sections.length) return null;
  return (
    <div className="satWeatherOfficial">
      <div className="satWeatherDetailTextTitle">{title}</div>
      {sections.map((section, index) => (
        <div key={index} className={`satWeatherOfficialRow ${section.label ? "" : "satWeatherOfficialRowPlain"}`}>
          {section.label && <div className="satWeatherOfficialLabel">{titleCaseName(section.label)}</div>}
          <div className="satWeatherOfficialBody">
            {section.text && <p>{linkify(section.text)}</p>}
            {section.bullets.map((item, bullet) => <p key={bullet}>{linkify(item)}</p>)}
          </div>
        </div>
      ))}
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

let earthTextureRequest = null;

const loadEarthTexture = () => {
  if (earthTextureRequest) return earthTextureRequest;
  earthTextureRequest = new Promise((resolve, reject) => {
    const { textureZoom, tileSize } = SOURCES.earthView;
    const count = 2 ** textureZoom;
    const mercator = document.createElement("canvas");
    mercator.width = count * tileSize;
    mercator.height = count * tileSize;
    const mercatorContext = mercator.getContext("2d");
    let pending = count * count;
    let loaded = 0;
    const finish = () => {
      pending -= 1;
      if (pending > 0) return;
      if (!loaded) {
        reject(new Error("The Earth imagery tiles could not be loaded."));
        return;
      }
      const output = document.createElement("canvas");
      output.width = mercator.width;
      output.height = mercator.width / 2;
      const context = output.getContext("2d");
      const limit = 85.05112878 * Math.PI / 180;
      for (let row = 0; row < output.height; row++) {
        const lat = Math.max(-limit, Math.min(limit, (90 - ((row + 0.5) / output.height) * 180) * Math.PI / 180));
        const source = (1 - Math.log(Math.tan(Math.PI / 4 + lat / 2)) / Math.PI) / 2 * mercator.height;
        context.drawImage(mercator, 0, Math.min(mercator.height - 1, Math.max(0, Math.floor(source))), mercator.width, 1, 0, row, output.width, 1);
      }
      resolve(output);
    };
    for (let y = 0; y < count; y++) {
      for (let x = 0; x < count; x++) {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => {
          mercatorContext.drawImage(image, x * tileSize, y * tileSize, tileSize, tileSize);
          loaded += 1;
          finish();
        };
        image.onerror = finish;
        image.src = SOURCES.assets.satelliteTiles.replace("{z}", String(textureZoom)).replace("{y}", String(y)).replace("{x}", String(x));
      }
    }
  }).catch((error) => {
    earthTextureRequest = null;
    throw error;
  });
  return earthTextureRequest;
};

const applyEarthTexture = (material, renderer, nightGlow) => {
  loadEarthTexture().then((canvas) => {
    const texture = new THREE.CanvasTexture(canvas);
    if (THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
    if (renderer && renderer.capabilities) texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    material.map = texture;
    material.color.set(0xffffff);
    if (nightGlow) {
      material.emissiveMap = texture;
      material.emissive.set(0xffffff);
    }
    material.needsUpdate = true;
  }).catch(() => {});
};

let earthMapRequest = null;

const loadEarthMapLibre = () => {
  if (earthMapRequest) return earthMapRequest;
  earthMapRequest = (async () => {
    loadExternalCss(SOURCES.assets.earthMapCss, "flight-maplibre-css");
    const response = await fetch(SOURCES.assets.earthMapScript);
    if (!response.ok) throw new Error(`The script ${SOURCES.assets.earthMapScript} returned status ${response.status}.`);
    const code = await response.text();
    const module = { exports: {} };
    new Function("module", "exports", code)(module, module.exports);
    if (!module.exports || !module.exports.Map) throw new Error("MapLibre GL did not load.");
    return module.exports;
  })().catch((error) => {
    earthMapRequest = null;
    throw error;
  });
  return earthMapRequest;
};

const EMPTY_EARTH_POINTS = { type: "FeatureCollection", features: [] };

const EarthMapView = ({ collect, selectedId, onSelect, globe }) => {
  const hostRef = useRef(null);
  const mapRef = useRef(null);
  const collectRef = useRef(collect);
  const selectRef = useRef(onSelect);
  const pointsRef = useRef(new Map());
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const [hover, setHover] = useState(null);
  collectRef.current = collect;
  selectRef.current = onSelect;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    let cancelled = false;
    let observer = null;
    const claimWheel = (event) => { event.preventDefault(); };
    host.addEventListener("wheel", claimWheel, { passive: false, capture: true });
    loadEarthMapLibre().then((maplibregl) => {
      if (cancelled) return;
      const view = SOURCES.earthView;
      const map = new maplibregl.Map({
        container: host,
        style: {
          version: 8,
          sources: {
            "earth-imagery": { type: "raster", tiles: [SOURCES.assets.satelliteTiles], tileSize: 256, maxzoom: 19, attribution: "Tiles © Esri" },
            "earth-labels": { type: "raster", tiles: [SOURCES.assets.labelTiles], tileSize: 256, maxzoom: 19 }
          },
          layers: [
            { id: "earth-imagery-layer", type: "raster", source: "earth-imagery" },
            { id: "earth-labels-layer", type: "raster", source: "earth-labels", paint: { "raster-opacity": 0.9 } }
          ]
        },
        center: view.center,
        zoom: view.zoom,
        minZoom: view.minZoom,
        maxZoom: view.maxZoom,
        antialias: true,
        attributionControl: false
      });
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl(), "top-right");
      map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
      if (typeof ResizeObserver !== "undefined") {
        observer = new ResizeObserver(() => {
          if (mapRef.current) mapRef.current.resize();
        });
        observer.observe(host);
      }
      map.on("load", () => {
        if (cancelled) return;
        map.addSource("earth-objects", { type: "geojson", data: EMPTY_EARTH_POINTS });
        map.addLayer({ id: "earth-objects-glow", type: "circle", source: "earth-objects", paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 0, 4, 6, 9], "circle-color": ["get", "color"], "circle-opacity": 0.22, "circle-blur": 1 } });
        map.addLayer({ id: "earth-objects-points", type: "circle", source: "earth-objects", paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 0, 1.8, 6, 4.5], "circle-color": ["get", "color"], "circle-opacity": 0.95, "circle-blur": 0.15, "circle-stroke-width": 0.75, "circle-stroke-color": "rgba(8, 9, 12, 0.7)" } });
        map.addLayer({ id: "earth-objects-selected", type: "circle", source: "earth-objects", filter: ["==", ["get", "id"], ""], paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 0, 7, 6, 11], "circle-color": "rgba(0, 0, 0, 0)", "circle-blur": 0.1, "circle-stroke-width": 2, "circle-stroke-color": ["get", "color"], "circle-stroke-opacity": 0.9 } });
        map.on("mousemove", "earth-objects-points", (event) => {
          const feature = event.features && event.features[0];
          if (!feature) return;
          map.getCanvas().style.cursor = "pointer";
          setHover({ x: event.point.x, y: event.point.y, title: feature.properties.name, line: feature.properties.line });
        });
        map.on("mouseleave", "earth-objects-points", () => {
          map.getCanvas().style.cursor = "";
          setHover(null);
        });
        map.on("click", "earth-objects-points", (event) => {
          const feature = event.features && event.features[0];
          if (feature && selectRef.current) selectRef.current(String(feature.properties.id));
        });
        setReady(true);
      });
    }).catch((reason) => {
      if (!cancelled) setError(`The Earth map could not be started because of the error "${reason && reason.message ? reason.message : String(reason)}".`);
    });
    return () => {
      cancelled = true;
      if (observer) observer.disconnect();
      host.removeEventListener("wheel", claimWheel, { capture: true });
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (reason) {
          mapRef.current = null;
        }
      }
      mapRef.current = null;
      setReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return undefined;
    const push = () => {
      const source = map.getSource("earth-objects");
      if (!source) return;
      const points = collectRef.current ? collectRef.current() : [];
      const index = new Map();
      const features = [];
      for (const point of points) {
        if (!Number.isFinite(point.lat) || !Number.isFinite(point.lon)) continue;
        index.set(point.id, point);
        features.push({ type: "Feature", geometry: { type: "Point", coordinates: [point.lon, point.lat] }, properties: { id: point.id, name: point.name, line: point.line, color: point.color } });
      }
      pointsRef.current = index;
      source.setData({ type: "FeatureCollection", features });
    };
    push();
    const timer = setInterval(push, SOURCES.earthView.refreshMs);
    return () => clearInterval(timer);
  }, [ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    try {
      if (typeof map.setProjection === "function") map.setProjection({ type: globe ? "globe" : "mercator" });
    } catch (reason) {
      setError(`The globe view could not be switched because of the error "${reason && reason.message ? reason.message : String(reason)}".`);
    }
  }, [ready, globe]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const id = selectedId ? String(selectedId) : "";
    if (map.getLayer("earth-objects-selected")) map.setFilter("earth-objects-selected", ["==", ["get", "id"], id]);
    const point = pointsRef.current.get(id);
    if (point) map.easeTo({ center: [point.lon, point.lat], duration: 800 });
  }, [ready, selectedId]);

  return (
    <div className="satWeatherMapWrapper">
      <div ref={hostRef} className="satWeatherMapContainer" onMouseLeave={() => setHover(null)} />
      {hover && (
        <div className="satWeatherTooltip" style={{ left: hover.x + 14, top: hover.y + 14 }}>
          <div className="satWeatherTooltipTitle">{hover.title}</div>
          {hover.line && <div className="satWeatherTooltipLine">{hover.line}</div>}
        </div>
      )}
      {ready && error && <div className="satWeatherMapError" style={{ zIndex: 2000 }}>{error}</div>}
      {!ready && (
        <div className="satWeatherMapLoadingOverlay" style={{ zIndex: 2001 }}>
          <div className="satWeatherMapLoadingContent">
            <div className="loading-circle" />
            {error && <small className="satWeatherMapProviderError">{error}</small>}
          </div>
        </div>
      )}
    </div>
  );
};

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

const SatelliteTracker = () => {
  const navigate = useNavigate();
  const { token, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!authLoading && !token) navigate("/login");
  }, [authLoading, token, navigate]);

  const [errors, setErrors] = useState([]);
  const [showErrors, setShowErrors] = useState(false);
  const [copiedErrors, setCopiedErrors] = useState(false);
  const [loadingMetadata, setLoadingMetadata] = useState(null);
  const [satellites, setSatellites] = useState([]);
  useEffect(() => {
    if (satellites.length) setLastDataUpdate(new Date());
  }, [satellites]);
  const [earthRotationData, setEarthRotationData] = useState(null);
  const [filteredSatellites, setFilteredSatellites] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [targetFps, setTargetFps] = useState(60);
  const [actualFps, setActualFps] = useState(60);
  const [currentTime, setCurrentTime] = useState("");
  const [isPlaying, setIsPlaying] = useState(true);
  const [earthRotation, setEarthRotation] = useState(true);
  const [showOrbits, setShowOrbits] = useState(true);
  const [showTrails, setShowTrails] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [showEquatorialGrid, setShowEquatorialGrid] = useState(true);
  const [showAxisMarkers, setShowAxisMarkers] = useState(true);
  const [showEarth, setShowEarth] = useState(true);
  const [mapGlobe, setMapGlobe] = useState(true);
  const [showAltitudeBands, setShowAltitudeBands] = useState(true);
  const [showDistanceRings, setShowDistanceRings] = useState(true);
  const [bloomEnabled, setBloomEnabled] = useState(true);
  const [bloomStrength, setBloomStrength] = useState(0.6);
  const [bloomRadius, setBloomRadius] = useState(0.3);
  const [bloomThreshold, setBloomThreshold] = useState(0.3);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [layoutVisibility, setLayoutVisibility] = useState(DEFAULT_LAYOUT);
  const [expandedView, setExpandedView] = useState(null);
  const [lastDataUpdate, setLastDataUpdate] = useState(null);
  useEffect(() => {
    const timer = setTimeout(() => window.dispatchEvent(new Event("resize")), 60);
    return () => clearTimeout(timer);
  }, [layoutVisibility]);
  const [legendCollapsed, setLegendCollapsed] = useState(false);
  const [harvestHealth, setHarvestHealth] = useState(null);
  const [harvestHealthError, setHarvestHealthError] = useState(null);
  const [harvestObjects, setHarvestObjects] = useState(0);
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
  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  const [hudVisible, setHudVisible] = useState(false);
  const [detailedSatellite, setDetailedSatellite] = useState(null);
  const [selectedSatellite, setSelectedSatellite] = useState(null);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [theme, setTheme] = useState("dark");
  const [sceneInitialized, setSceneInitialized] = useState(false);
  const [performanceStats, setPerformanceStats] = useState({ renderTime: 0, memoryUsage: 0, triangles: 0, drawCalls: 0, lines: 0, textures: 0, geometries: 0, visibleSatellites: 0, culledSatellites: 0 });
  const [virtualScrollOffset, setVirtualScrollOffset] = useState(0);
  const [spaceWeather, setSpaceWeather] = useState(null);
  const [spaceWeatherLoading, setSpaceWeatherLoading] = useState(false);
  const [spaceWeatherExpanded, setSpaceWeatherExpanded] = useState(false);
  const [spaceWeatherAI, setSpaceWeatherAI] = useState(null);
  const [spaceWeatherAILoading, setSpaceWeatherAILoading] = useState(false);
  const [missionIntelMap, setMissionIntelMap] = useState(new Map());
  const [missionIntelLoading, setMissionIntelLoading] = useState(false);
  const [observationMap, setObservationMap] = useState(new Map());
  const [observationLoading, setObservationLoading] = useState(false);
  const [activeDossierTab, setActiveDossierTab] = useState("orbital");
  const [viewMode, setViewMode] = useState("3d");
  const [observerLocation, setObserverLocation] = useState(null);
  const [conjunctions, setConjunctions] = useState([]);
  const [conjunctionThreshold, setConjunctionThreshold] = useState(50);
  const [showConjunctionPanel, setShowConjunctionPanel] = useState(false);
  const [constellationHealth, setConstellationHealth] = useState(null);
  const [constellationLoading, setConstellationLoading] = useState(false);
  const [showConstellationPanel, setShowConstellationPanel] = useState(false);
  const [decayCandidates, setDecayCandidates] = useState([]);
  const [decayMethodology, setDecayMethodology] = useState(null);
  const [decayLoading, setDecayLoading] = useState(false);
  const [showDecayPanel, setShowDecayPanel] = useState(false);
  const [colorByTleAge, setColorByTleAge] = useState(false);
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
  const [stateRestored, setStateRestored] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [apiSuccess, setApiSuccess] = useState(null);
  const [alertsData, setAlertsData] = useState(null);
  const [alertsError, setAlertsError] = useState(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationQuery, setLocationQuery] = useState("");
  const [locationResults, setLocationResults] = useState([]);
  const [locationSearchStatus, setLocationSearchStatus] = useState("");
  const [showAlertsPanel, setShowAlertsPanel] = useState(false);
  const [expandedAlertKey, setExpandedAlertKey] = useState(null);
  const restoredActiveRef = useRef(null);
  const soundsEnabledRef = useRef(false);

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
  const locationName = observerLocation ? observerLocation.label || CUSTOM_LOCATION_LABEL : null;

  const setLocation = useCallback((lat, lon, label) => {
    setObserverLocation((current) => ({ lat: Number(lat), lon: Number(lon), alt: current && Number.isFinite(current.alt) ? current.alt : 0, label: label || CUSTOM_LOCATION_LABEL }));
  }, []);

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
    setLocation(result.latitude, result.longitude, result.label);
    setLocationResults([]);
    setLocationQuery("");
    setLocationSearchStatus("");
  }, [setLocation]);

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
    if (!observerLocation) {
      showNotification("Set a location first.", "error");
      return;
    }
    setAreaFormData((prev) => ({ ...prev, latitude: observerLocation.lat.toFixed(6), longitude: observerLocation.lon.toFixed(6), name: prev.name && prev.name.trim() ? prev.name : observerLocation.label === CUSTOM_LOCATION_LABEL ? "" : observerLocation.label || "" }));
  }, [observerLocation, showNotification]);

  const showArea = useCallback((area) => {
    const center = areaCenter(area);
    setLocation(Number(center.lat.toFixed(4)), Number(center.lon.toFixed(4)), area.name && area.name.trim() ? area.name.trim() : describeArea(area));
  }, [setLocation]);

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

  const alertPoints = useMemo(() => [
    observerLocation ? `selected:${observerLocation.lat.toFixed(4)}:${observerLocation.lon.toFixed(4)}` : null,
    ...areas.map((area) => {
      const center = areaCenter(area);
      return `${area.area_id}:${center.lat.toFixed(4)}:${center.lon.toFixed(4)}`;
    })
  ].filter(Boolean).join(";"), [observerLocation, areas]);

  const loadAlerts = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl("satelliteAlerts")}?points=${encodeURIComponent(alertPoints)}`);
      const data = await response.json().catch(() => null);
      if (!response.ok || !data || !data.success) throw new Error((data && data.message) || `The alerts request returned status ${response.status}.`);
      setAlertsData(data);
      setAlertsError(null);
    } catch (error) {
      setAlertsError(`The satellite alerts could not be loaded because of the error "${errorText(error)}".`);
    }
  }, [alertPoints]);

  useEffect(() => {
    if (authLoading || !stateRestored) return undefined;
    loadAlerts();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible" || soundsEnabledRef.current) loadAlerts();
    }, SOURCES.alerts.refreshMs);
    return () => clearInterval(timer);
  }, [authLoading, stateRestored, loadAlerts]);

  const alertItems = useMemo(() => {
    if (!alertsData) return null;
    const placeLabel = (pointId) => {
      if (pointId === "selected") return observerLocation ? observerLocation.label || CUSTOM_LOCATION_LABEL : null;
      const area = areas.find((entry) => entry.area_id === pointId);
      return area ? describeArea(area) : null;
    };
    const list = [];
    for (const alert of alertsData.alerts || []) {
      list.push({ ...alert, key: `${alert.identity}|${alert.severity}`, placeId: null, placeLabel: null });
      if (alert.kind !== "reentry" || !alert.distances) continue;
      for (const [pointId, distanceKm] of Object.entries(alert.distances)) {
        const label = placeLabel(pointId);
        if (!label || distanceKm > alert.nearRadiusKm) continue;
        list.push({
          ...alert,
          kind: "reentryNear",
          identity: `reentrynear|${alert.identity}|${pointId}`,
          key: `reentrynear|${alert.identity}|${pointId}|CRITICAL`,
          severity: "CRITICAL",
          title: `${alert.title} Near ${label}`,
          message: `${alert.message} The predicted point is ${distanceKm.toLocaleString()} km from ${label}, inside the ${alert.nearRadiusKm.toLocaleString()} km proximity radius.`,
          placeId: pointId,
          placeLabel: label,
          distanceKm
        });
      }
    }
    return list.sort((a, b) => (ALERT_SEVERITY_ORDER[a.severity] ?? 5) - (ALERT_SEVERITY_ORDER[b.severity] ?? 5) || String(a.eventAt || "").localeCompare(String(b.eventAt || "")));
  }, [alertsData, observerLocation, areas]);

  const scopeIds = useMemo(() => (activeAreas ? new Set(activeAreas.map((area) => area.area_id)) : new Set(["selected"])), [activeAreas]);
  const bellItems = useMemo(() => (alertItems || []).filter((item) => !item.placeId || scopeIds.has(item.placeId)), [alertItems, scopeIds]);
  const bellKeys = useMemo(() => new Set(bellItems.map((item) => item.key)), [bellItems]);
  const soundInScope = (item) => bellKeys.has(item.key);
  const soundScopeKey = useMemo(() => bellItems.map((item) => item.key).join(","), [bellItems]);

  const areaCounts = useMemo(() => {
    const counts = {};
    for (const area of areas) {
      const inside = (alertItems || []).filter((item) => !item.placeId || item.placeId === area.area_id);
      counts[area.area_id] = { total: inside.length, critical: inside.filter((item) => item.severity === "CRITICAL").length, top: inside[0] ? inside[0].severity : null };
    }
    return counts;
  }, [areas, alertItems]);

  const sounds = useAlertSounds({
    defaults: SOURCES.sounds.defaults,
    ready: stateRestored && areasLoaded,
    items: alertsData ? bellItems : null,
    inScope: soundInScope,
    scopeKey: soundScopeKey,
    ignoreLevel: true,
    getKey: alertItemKey,
    getLevel: alertSoundLevel,
    getId: alertItemIdentity,
    describe: alertSoundMessage,
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
    const live = (bellItems || []).map((item) => ({ key: alertItemKey(item), id: alertItemIdentity(item), item, level: alertSoundLevel(item) || ALERT_SOUND_LEVELS[0], ended: false, updated: false, at: Date.now(), message: alertSoundMessage(item, false) }));
    const known = new Set(live.map((entry) => entry.key));
    return [...live, ...ackHistory.filter((entry) => !known.has(entry.key) && (!entry.item.placeId || scopeIds.has(entry.item.placeId)))];
  }, [bellItems, ackHistory, scopeIds]);
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

  const requestAnalysis = useCallback((item) => {
    if (ackRequestedRef.current.has(item.key)) return;
    ackRequestedRef.current.add(item.key);
    setAckAnalyses((current) => ({ ...current, [item.key]: { loading: true } }));
    const nearby = (alertItems || []).filter((entry) => entry.kind === "reentryNear" && entry.identity.startsWith(`reentrynear|${item.kind === "reentryNear" ? item.identity.split("|").slice(1, 3).join("|") : item.identity}|`)).map((entry) => ({ label: entry.placeLabel, distanceKm: entry.distanceKm }));
    fetch(apiUrl("alertAnalysis"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alert: { key: item.key, kind: item.kind, title: item.title, message: item.message, severity: item.severity, source: item.source, issuedAt: item.issuedAt, eventAt: item.eventAt, expiresAt: item.expiresAt, lat: item.lat, lon: item.lon, nearRadiusKm: item.nearRadiusKm, nearby, officialText: item.officialText || null, details: item.details || {} } })
    })
      .then((response) => response.json().catch(() => null).then((data) => {
        if (!response.ok || !data || !data.success) throw new Error((data && data.message) || `The analysis request returned status ${response.status}.`);
        return data;
      }))
      .then((data) => setAckAnalyses((current) => ({ ...current, [item.key]: { data: data.analysis } })))
      .catch((error) => setAckAnalyses((current) => ({ ...current, [item.key]: { error: errorText(error) } })));
  }, [alertItems]);

  useEffect(() => {
    for (const entry of ackQueue) if (!entry.ended) requestAnalysis(entry.item);
  }, [ackQueue, requestAnalysis]);

  useEffect(() => {
    if (!showAlertsPanel || !expandedAlertKey) return;
    const item = bellItems.find((entry) => entry.key === expandedAlertKey);
    if (item) requestAnalysis(item);
  }, [showAlertsPanel, expandedAlertKey, bellItems, requestAnalysis]);

  useEffect(() => {
    if (!stateRestored || !areas.length) return;
    if (!selectedAreaId || !areas.some((area) => area.area_id === selectedAreaId)) setSelectedAreaId(areas[0].area_id);
  }, [stateRestored, areas, selectedAreaId]);


  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const composerRef = useRef(null);
  const bloomPassRef = useRef(null);
  const labelRendererRef = useRef(null);
  const cameraRef = useRef(null);
  const earthRef = useRef(null);
  const satelliteGroupRef = useRef(null);
  const simulationDateMsRef = useRef(Date.now());
  const frameCountRef = useRef(0);
  const lastFpsTime = useRef(0);
  const gridRef = useRef(null);
  const equatorialGridRef = useRef(null);
  const axisMarkersRef = useRef(null);
  const altitudeBandsRef = useRef(null);
  const distanceRingsRef = useRef(null);
  const hudPanelRef = useRef(null);
  const legendPanelRef = useRef(null);
  const controlsPanelRef = useRef(null);
  const detailedPanelRef = useRef(null);
  const controlsRef = useRef(null);
  const starsRef = useRef(null);
  const virtualScrollRef = useRef(null);
  const lastConjunctionCheckRef = useRef(0);
  const activeTweensRef = useRef([]);
  const eventSourceRef = useRef(null);
  const intelAbortRef = useRef(null);
  const observationAbortRef = useRef(null);
  const lastSpeedSignRef = useRef(1);

  const orbitMetaRef = useRef(new Map());
  const satelliteInstanceRef = useRef(null);
  const glowInstanceRef = useRef(null);
  const orbitLinesRef = useRef({});
  const trailLinesRef = useRef({});
  const trailBuffersRef = useRef(new Map());
  const satelliteDataRef = useRef(new Map());
  const satrecCacheRef = useRef(new Map());
  const labelsRef = useRef({});
  const visibleSatellitesRef = useRef(new Set());
  const frustumRef = useRef(new THREE.Frustum());
  const tempMatrix = useRef(new THREE.Matrix4());
  const tempColor = useRef(new THREE.Color());
  const tempSphere = useRef(new THREE.Sphere());
  const tempProjMatrix = useRef(new THREE.Matrix4());
  const tempVecRef = useRef(new THREE.Vector3());
  const sunPositionRef = useRef(new THREE.Vector3(1000000, 500000, 1000000));
  const sunLightRef = useRef(null);

  const satellitesRef = useRef([]);
  const isPlayingRef = useRef(true);
  const speedMultiplierRef = useRef(1);
  const earthRotationFlagRef = useRef(true);
  const earthRotationDataRef = useRef(null);
  const bloomEnabledRef = useRef(true);
  const targetFpsRef = useRef(60);
  const showOrbitsRef = useRef(true);
  const showTrailsRef = useRef(true);
  const showLabelsRef = useRef(true);
  const colorByTleAgeRef = useRef(false);
  const conjunctionThresholdRef = useRef(50);
  const anyOverlayOpenRef = useRef(false);

  useEffect(() => { satellitesRef.current = satellites; }, [satellites]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { speedMultiplierRef.current = speedMultiplier; }, [speedMultiplier]);
  useEffect(() => { earthRotationFlagRef.current = earthRotation; }, [earthRotation]);
  useEffect(() => { earthRotationDataRef.current = earthRotationData; }, [earthRotationData]);
  useEffect(() => { bloomEnabledRef.current = bloomEnabled; }, [bloomEnabled]);
  useEffect(() => { targetFpsRef.current = targetFps; }, [targetFps]);
  useEffect(() => { showOrbitsRef.current = showOrbits; }, [showOrbits]);
  useEffect(() => { showTrailsRef.current = showTrails; }, [showTrails]);
  useEffect(() => { showLabelsRef.current = showLabels; }, [showLabels]);
  useEffect(() => { colorByTleAgeRef.current = colorByTleAge; }, [colorByTleAge]);
  useEffect(() => { conjunctionThresholdRef.current = conjunctionThreshold; }, [conjunctionThreshold]);

  useEffect(() => {
    const newSign = Math.sign(speedMultiplier) || 1;
    if (newSign !== lastSpeedSignRef.current) {
      trailBuffersRef.current.clear();
      lastSpeedSignRef.current = newSign;
    }
  }, [speedMultiplier]);

  const hudDraggable = useDraggable(hudPanelRef, clampCentered);
  const legendDraggable = useDraggable(legendPanelRef, clampLegend);
  const controlsDraggable = useDraggable(controlsPanelRef, clampControls);
  const detailedDraggable = useDraggable(detailedPanelRef, clampCentered);

  const anyOverlayPanelOpen = hudVisible || !!detailedSatellite || spaceWeatherExpanded || showConjunctionPanel || showConstellationPanel || showDecayPanel;

  useEffect(() => { anyOverlayOpenRef.current = anyOverlayPanelOpen; }, [anyOverlayPanelOpen]);

  const closeAllOverlayPanels = useCallback(() => {
    setHudVisible(false);
    setDetailedSatellite(null);
    setSpaceWeatherExpanded(false);
    setShowConjunctionPanel(false);
    setShowConstellationPanel(false);
    setShowDecayPanel(false);
  }, []);

  const getOrCreateSatrec = useCallback((satellite) => {
    if (!satellite || !satellite.tle || !satellite.tle.line1 || !satellite.tle.line2) {
      return null;
    }
    if (satrecCacheRef.current.has(satellite.id)) {
      return satrecCacheRef.current.get(satellite.id);
    }
    try {
      const satrec = satelliteJs.twoline2satrec(satellite.tle.line1, satellite.tle.line2);
      satrecCacheRef.current.set(satellite.id, satrec);
      return satrec;
    } catch (error) {
      satrecCacheRef.current.set(satellite.id, null);
      return null;
    }
  }, []);

  const computeOrbitPositionFallback = useCallback((satellite, date) => {
    const orbitRadius = SCENE_EARTH_RADIUS + (satellite.altitude / ORBITAL_CONSTANTS.SCALE_FACTOR);
    const angularVelocity = (2 * Math.PI) / Math.max(satellite.period, 1);
    const phase = ((Number(satellite.noradId) || 0) % 1000) * 0.0173;
    const epochAnchorMs = satellite.tleEpoch
      ? new Date(satellite.tleEpoch).getTime()
      : Date.now();
    const tMinutes = (date.getTime() - epochAnchorMs) / 60000;
    const angle = (tMinutes * angularVelocity) + phase;
    const position = new THREE.Vector3(orbitRadius * Math.cos(angle), 0, orbitRadius * Math.sin(angle));
    const inc = satellite.inclination || 0;
    const raan = satellite.raan || 0;
    const argP = satellite.argOfPerigee || 0;
    position.applyAxisAngle(new THREE.Vector3(0, 1, 0), argP * ORBITAL_CONSTANTS.DEG_TO_RAD);
    position.applyAxisAngle(new THREE.Vector3(1, 0, 0), inc * ORBITAL_CONSTANTS.DEG_TO_RAD);
    position.applyAxisAngle(new THREE.Vector3(0, 1, 0), raan * ORBITAL_CONSTANTS.DEG_TO_RAD);
    return position;
  }, []);

  const computeOrbitPosition = useCallback((satellite, date) => {
    const satrec = getOrCreateSatrec(satellite);
    if (satrec) {
      try {
        const pv = satelliteJs.propagate(satrec, date);
        const eci = pv.position;
        if (eci && Number.isFinite(eci.x) && Number.isFinite(eci.y) && Number.isFinite(eci.z)) {
          const scenePos = eciToScene(eci);
          if (scenePos) {
            return scenePos;
          }
        }
      } catch (error) {}
    }
    return computeOrbitPositionFallback(satellite, date);
  }, [getOrCreateSatrec, computeOrbitPositionFallback]);

  const checkEclipse = useCallback((satellitePosition) => {
    const sunPosition = sunPositionRef.current;
    const sunDir = sunPosition.clone().normalize();

    const sceneR = satellitePosition.length();
    if (!Number.isFinite(sceneR) || sceneR <= 0) {
      return { inShadow: false, shadowFactor: 1.0 };
    }

    const altitudeKm = (sceneR - SCENE_EARTH_RADIUS) * ORBITAL_CONSTANTS.SCALE_FACTOR;
    const realDistFromCenterKm = EARTH_RADIUS_KM + altitudeKm;
    const satRealKm = satellitePosition.clone().normalize().multiplyScalar(realDistFromCenterKm);

    const projectionLengthKm = satRealKm.dot(sunDir);
    if (projectionLengthKm >= 0) {
      return { inShadow: false, shadowFactor: 1.0 };
    }

    const closestPointOnAxisKm = sunDir.clone().multiplyScalar(projectionLengthKm);
    const perpDistanceKm = satRealKm.clone().sub(closestPointOnAxisKm).length();

    const umbraAngle = Math.atan((SUN_RADIUS_KM - EARTH_RADIUS_KM) / AU_KM);
    const penumbraAngle = Math.atan((SUN_RADIUS_KM + EARTH_RADIUS_KM) / AU_KM);

    const distBehindEarthKm = Math.abs(projectionLengthKm);
    const umbraRadiusKm = Math.max(0, EARTH_RADIUS_KM - distBehindEarthKm * Math.tan(umbraAngle));
    const penumbraRadiusKm = EARTH_RADIUS_KM + distBehindEarthKm * Math.tan(penumbraAngle);

    if (umbraRadiusKm > 0 && perpDistanceKm < umbraRadiusKm) {
      return { inShadow: true, shadowFactor: 0.15 };
    } else if (perpDistanceKm < penumbraRadiusKm && penumbraRadiusKm > umbraRadiusKm) {
      const t = (perpDistanceKm - umbraRadiusKm) / (penumbraRadiusKm - umbraRadiusKm);
      return { inShadow: true, shadowFactor: 0.15 + (0.85 * t) };
    }

    return { inShadow: false, shadowFactor: 1.0 };
  }, []);

  const computeAllPositions = useCallback(() => {
    const date = new Date(simulationDateMsRef.current);
    const sats = satellitesRef.current;
    for (let i = 0; i < sats.length; i++) {
      const satellite = sats[i];
      if (!satellite.active) continue;

      let eciKm = null;
      let position = null;
      const satrec = getOrCreateSatrec(satellite);

      if (satrec) {
        try {
          const pv = satelliteJs.propagate(satrec, date);
          const eci = pv.position;
          if (eci && Number.isFinite(eci.x) && Number.isFinite(eci.y) && Number.isFinite(eci.z)) {
            eciKm = eci;
            position = eciToScene(eci);
          }
        } catch (error) {}
      }

      if (!position) {
        position = computeOrbitPositionFallback(satellite, date);
      }

      if (position) {
        const eclipse = checkEclipse(position);
        satelliteDataRef.current.set(satellite.id, {
          position,
          eciKm,
          inShadow: eclipse.inShadow,
          shadowFactor: eclipse.shadowFactor,
          lastUpdate: Date.now()
        });
      }
    }
  }, [getOrCreateSatrec, computeOrbitPositionFallback, checkEclipse]);

  const performFrustumCulling = useCallback(() => {
    if (!cameraRef.current) {
      return;
    }
    const camera = cameraRef.current;
    tempProjMatrix.current.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustumRef.current.setFromProjectionMatrix(tempProjMatrix.current);

    const sats = satellitesRef.current;
    const candidates = [];
    const MARGIN = PERFORMANCE_CONSTANTS.FRUSTUM_MARGIN;

    for (let i = 0; i < sats.length; i++) {
      const satellite = sats[i];
      if (!satellite.active) continue;
      const data = satelliteDataRef.current.get(satellite.id);
      if (!data || !data.position) continue;
      const dist = data.position.distanceTo(camera.position);
      if (dist >= 3000) continue;
      tempSphere.current.set(data.position, 2.0 * MARGIN);
      if (!frustumRef.current.intersectsSphere(tempSphere.current)) continue;
      candidates.push({ id: satellite.id, dist });
    }

    candidates.sort((a, b) => a.dist - b.dist);

    const newVisible = new Set();
    const MAX = PERFORMANCE_CONSTANTS.MAX_VISIBLE_SATELLITES;
    const limit = Math.min(MAX, candidates.length);
    for (let i = 0; i < limit; i++) {
      newVisible.add(candidates[i].id);
    }
    visibleSatellitesRef.current = newVisible;
  }, []);

  const writeInstanceBuffers = useCallback(() => {
    if (!satelliteInstanceRef.current || !glowInstanceRef.current) {
      return;
    }
    const visible = visibleSatellitesRef.current;
    const sats = satellitesRef.current;
    let idx = 0;
    for (let i = 0; i < sats.length; i++) {
      const satellite = sats[i];
      if (!satellite.active) continue;
      if (!visible.has(satellite.id)) continue;
      const data = satelliteDataRef.current.get(satellite.id);
      if (!data || !data.position) continue;
      tempMatrix.current.makeTranslation(data.position.x, data.position.y, data.position.z);
      satelliteInstanceRef.current.setMatrixAt(idx, tempMatrix.current);
      glowInstanceRef.current.setMatrixAt(idx, tempMatrix.current);
      let baseColor = satellite.color;
      if (colorByTleAgeRef.current) {
        baseColor = tleAgeColor(satellite.tleAgeDays);
      }
      tempColor.current.set(baseColor);
      const boost = (1.0 + data.shadowFactor * 2.0) * data.shadowFactor;
      tempColor.current.multiplyScalar(boost);
      satelliteInstanceRef.current.setColorAt(idx, tempColor.current);
      data.instanceIndex = idx;
      idx++;
    }
    satelliteInstanceRef.current.count = idx;
    glowInstanceRef.current.count = idx;
    satelliteInstanceRef.current.instanceMatrix.needsUpdate = true;
    glowInstanceRef.current.instanceMatrix.needsUpdate = true;
    if (satelliteInstanceRef.current.instanceColor) {
      satelliteInstanceRef.current.instanceColor.needsUpdate = true;
    }
  }, []);

  const createLabel = useCallback((text, color) => {
    const div = document.createElement("div");
    div.className = "satellite-body-label";
    div.textContent = text;
    div.style.cssText = `color: ${color}; font-size: 11px; font-weight: 700; padding: 2px 6px; background: rgba(0, 0, 0, 0.8); border-radius: 3px; border: 1px solid ${color}; pointer-events: none; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; white-space: nowrap; position: absolute; z-index: 5; transform: translate(-50%, -50%); transition: none;`;
    return new LabelObject(div);
  }, []);

  const createOrbitLine = useCallback((satellite) => {
    const satrec = getOrCreateSatrec(satellite);
    if (!satrec) {
      return null;
    }
    try {
      const orbitPoints = [];
      const segments = 64;
      const now = new Date(simulationDateMsRef.current);
      const directionSign = (speedMultiplierRef.current < 0) ? -1 : 1;

      for (let i = 0; i <= segments; i++) {
        const offset = directionSign * (i / segments) * satellite.period;
        const t = new Date(now.getTime() + offset * 60000);
        const pv = satelliteJs.propagate(satrec, t);
        const eci = pv.position;
        if (eci && Number.isFinite(eci.x) && Number.isFinite(eci.y) && Number.isFinite(eci.z)) {
          const scenePos = eciToScene(eci);
          if (scenePos) {
            orbitPoints.push(scenePos);
          }
        }
      }

      if (orbitPoints.length < 2) {
        return null;
      }

      const positions = [];
      for (const p of orbitPoints) {
        positions.push(p.x, p.y, p.z);
      }

      const geometry = new LineGeometry();
      geometry.setPositions(positions);

      const material = new LineMaterial({
        color: satellite.color,
        transparent: true,
        opacity: 0.7,
        linewidth: 2.5,
        resolution: new THREE.Vector2(window.innerWidth, window.innerHeight)
      });

      const line = new Line2(geometry, material);
      line.computeLineDistances();
      line.visible = showOrbitsRef.current;
      return line;
    } catch (error) {
      return null;
    }
  }, [getOrCreateSatrec]);

  const createTrailLine = useCallback((satellite) => {
    const positions = new Array(PERFORMANCE_CONSTANTS.TRAIL_LENGTH * 3).fill(0);
    const geometry = new LineGeometry();
    geometry.setPositions(positions);
    const material = new LineMaterial({
      color: satellite.color,
      transparent: true,
      opacity: 0.9,
      linewidth: 3,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight)
    });
    const line = new Line2(geometry, material);
    line.computeLineDistances();
    line.visible = showTrailsRef.current;
    return line;
  }, []);

  const updateTrailPositions = useCallback((satellite, trail) => {
    const data = satelliteDataRef.current.get(satellite.id);
    if (!data || !data.position) return;
    const pos = data.position;
    if (!Number.isFinite(pos.x) || !Number.isFinite(pos.y) || !Number.isFinite(pos.z)) return;

    let buffer = trailBuffersRef.current.get(satellite.id);
    if (!buffer) {
      buffer = [];
      trailBuffersRef.current.set(satellite.id, buffer);
    }

    buffer.push(pos.x, pos.y, pos.z);
    const maxLen = PERFORMANCE_CONSTANTS.TRAIL_LENGTH * 3;
    while (buffer.length > maxLen) {
      buffer.shift();
      buffer.shift();
      buffer.shift();
    }

    if (buffer.length >= 6) {
      const padded = buffer.length < maxLen ? buffer.concat(buffer.slice(buffer.length - 3)) : buffer;
      trail.geometry.setPositions(padded);
      trail.computeLineDistances();
    }
  }, []);

  const updateOrbitsAndTrails = useCallback(() => {
    if (!satelliteGroupRef.current) {
      return;
    }
    const sats = satellitesRef.current;
    const simNow = simulationDateMsRef.current;

    for (let i = 0; i < sats.length; i++) {
      const satellite = sats[i];
      if (!satellite.active) continue;
      if (satellite.category === "Deep Space") continue;

      if (orbitLinesRef.current[satellite.id]) {
        const meta = orbitMetaRef.current.get(satellite.id);
        const halfPeriodMs = (satellite.period * 30 * 1000);
        const speedDir = Math.sign(speedMultiplierRef.current) || 1;
        const lastDir = meta && meta.lastDirection !== undefined ? meta.lastDirection : speedDir;
        const directionFlipped = speedDir !== lastDir;
        const elapsedMs = meta ? (simNow - meta.createdAtMs) : 0;
        const triggerRebuild = (
          (speedDir >= 0 && elapsedMs > halfPeriodMs) ||
          (speedDir < 0 && elapsedMs < -halfPeriodMs) ||
          directionFlipped
        );
        if (meta && triggerRebuild) {
          const old = orbitLinesRef.current[satellite.id];
          satelliteGroupRef.current.remove(old);
          old.geometry.dispose();
          old.material.dispose();
          delete orbitLinesRef.current[satellite.id];
          orbitMetaRef.current.delete(satellite.id);
        }
      }

      if (showOrbitsRef.current && !orbitLinesRef.current[satellite.id]) {
        const orbit = createOrbitLine(satellite);
        if (orbit) {
          satelliteGroupRef.current.add(orbit);
          orbitLinesRef.current[satellite.id] = orbit;
          orbitMetaRef.current.set(satellite.id, { createdAtMs: simNow, lastDirection: Math.sign(speedMultiplierRef.current) || 1 });
        }
      }

      if (showTrailsRef.current && !trailLinesRef.current[satellite.id]) {
        const trail = createTrailLine(satellite);
        if (trail) {
          satelliteGroupRef.current.add(trail);
          trailLinesRef.current[satellite.id] = trail;
        }
      }

      if (orbitLinesRef.current[satellite.id]) {
        orbitLinesRef.current[satellite.id].visible = showOrbitsRef.current;
      }

      if (trailLinesRef.current[satellite.id]) {
        const trail = trailLinesRef.current[satellite.id];
        trail.visible = showTrailsRef.current;
        if (showTrailsRef.current) {
          updateTrailPositions(satellite, trail);
        }
      }
    }

    const orbitIds = Object.keys(orbitLinesRef.current);
    for (let i = 0; i < orbitIds.length; i++) {
      const id = orbitIds[i];
      const sat = sats.find(s => s.id === id);
      if (!sat || !sat.active) {
        const line = orbitLinesRef.current[id];
        if (line) {
          satelliteGroupRef.current.remove(line);
          line.geometry.dispose();
          line.material.dispose();
          delete orbitLinesRef.current[id];
          orbitMetaRef.current.delete(id);
        }
      }
    }

    const trailIds = Object.keys(trailLinesRef.current);
    for (let i = 0; i < trailIds.length; i++) {
      const id = trailIds[i];
      const sat = sats.find(s => s.id === id);
      if (!sat || !sat.active) {
        const line = trailLinesRef.current[id];
        if (line) {
          satelliteGroupRef.current.remove(line);
          line.geometry.dispose();
          line.material.dispose();
          delete trailLinesRef.current[id];
          trailBuffersRef.current.delete(id);
        }
      }
    }
  }, [createOrbitLine, createTrailLine, updateTrailPositions]);

  const updateLabels = useCallback(() => {
    if (!cameraRef.current || !labelRendererRef.current) {
      return;
    }

    if (!showLabelsRef.current) {
      const ids = Object.keys(labelsRef.current);
      for (let i = 0; i < ids.length; i++) {
        const label = labelsRef.current[ids[i]];
        if (label && label.element) {
          label.element.style.display = "none";
        }
      }
      return;
    }

    const camera = cameraRef.current;
    const width = mountRef.current ? mountRef.current.clientWidth : 800;
    const height = mountRef.current ? mountRef.current.clientHeight : 600;
    const v = tempVecRef.current;

    const ids = Object.keys(labelsRef.current);
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const label = labelsRef.current[id];
      if (!label || !label.element) continue;

      const data = satelliteDataRef.current.get(id);
      if (!data || !data.position) {
        label.element.style.display = "none";
        continue;
      }

      v.copy(data.position).project(camera);
      const behind = v.z > 1;

      if (behind) {
        label.element.style.display = "none";
        continue;
      }

      const x = (v.x * 0.5 + 0.5) * width;
      const y = (v.y * -0.5 + 0.5) * height;

      if (x >= -100 && x <= width + 100 && y >= -100 && y <= height + 100) {
        label.element.style.left = `${Math.round(x)}px`;
        label.element.style.top = `${Math.round(y)}px`;
        label.element.style.display = "block";
      } else {
        label.element.style.display = "none";
      }
    }
  }, []);

  const fetchSatelliteData = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setLoading(true);
    setErrors([]);
    setSatellites([]);
    satrecCacheRef.current.clear();
    satelliteDataRef.current.clear();
    orbitMetaRef.current.clear();
    trailBuffersRef.current.clear();

    const seenIds = new Set();
    let activeCount = 0;
    let interactive = false;
    const startTime = performance.now();
    const url = apiUrl("satelliteStream");

    let eventSource;
    try {
      eventSource = new EventSource(url);
    } catch (error) {
      setLoading(false);
      setErrors([`The satellite stream could not be opened because of the error "${String(error.message).replace(/\.$/, "")}".`]);
      return;
    }
    eventSourceRef.current = eventSource;

    let helloReceived = false;
    const connectionTimeoutId = setTimeout(() => {
      if (!helloReceived && eventSource.readyState !== EventSource.OPEN) {
        setErrors(prev => [...prev, "The stream connection timed out because the server did not respond."]);
        setLoading(false);
        try { eventSource.close(); } catch (error) {}
        if (eventSourceRef.current === eventSource) {
          eventSourceRef.current = null;
        }
      }
    }, PERFORMANCE_CONSTANTS.STREAM_CONNECTION_TIMEOUT_MS);

    const closeStream = () => {
      clearTimeout(connectionTimeoutId);
      if (eventSourceRef.current === eventSource) {
        eventSourceRef.current = null;
      }
      try { eventSource.close(); } catch (error) {}
    };

    eventSource.addEventListener("hello", () => {
      helloReceived = true;
      clearTimeout(connectionTimeoutId);
    });

    eventSource.addEventListener("meta", (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.earthRotation) {
          setEarthRotationData(data.earthRotation);
        }
      } catch (error) {}
    });

    eventSource.addEventListener("batch", (e) => {
      try {
        const data = JSON.parse(e.data);
        if (!data.satellites || data.satellites.length === 0) return;
        const additions = [];
        for (const sat of data.satellites) {
          if (seenIds.has(sat.id)) continue;
          seenIds.add(sat.id);
          const isActive = restoredActiveRef.current ? restoredActiveRef.current.has(sat.id) : activeCount < PERFORMANCE_CONSTANTS.PRESELECT_COUNT;
          if (isActive) activeCount++;
          additions.push({
            ...sat,
            active: isActive,
            _lowerName: (sat.name || "").toLowerCase(),
            _lowerCategory: (sat.category || "").toLowerCase(),
            _lowerGroup: (sat.group || "").toLowerCase()
          });
        }
        if (additions.length === 0) return;
        setSatellites(prev => prev.concat(additions));
        if (!interactive && seenIds.size >= 100) {
          interactive = true;
          setLoading(false);
        }
      } catch (error) {}
    });

    eventSource.addEventListener("progress", (e) => {
      try {
        const data = JSON.parse(e.data);
        setLoadingMetadata(prev => ({
          ...(prev || {}),
          progress: `${data.completed}/${data.total}`,
          successfulSources: data.successful,
          totalSources: data.total
        }));
      } catch (error) {}
    });

    eventSource.addEventListener("source-error", (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data && data.error) {
          setErrors(prev => [...prev, `The ${data.source} source failed with the error "${String(data.error).replace(/\.$/, "")}".`]);
        }
      } catch (error) {}
    });

    eventSource.addEventListener("done", (e) => {
      try {
        const data = JSON.parse(e.data);
        const finalErrors = data.errors || [];
        setLoadingMetadata(prev => ({
          ...(prev || {}),
          ...data.metadata,
          loadTime: performance.now() - startTime,
          dataQuality: finalErrors.length === 0 ? "High" : finalErrors.length < 5 ? "Medium" : "Low",
          queryTime: new Date().toISOString()
        }));
        if (finalErrors.length) setErrors(prev => [...prev, ...finalErrors]);
      } catch (error) {}
      setLoading(false);
      closeStream();
    });

    eventSource.onerror = () => {
      if (eventSource.readyState === EventSource.CLOSED) {
        setLoading(false);
        closeStream();
        return;
      }
      if (eventSource.readyState === EventSource.CONNECTING && !helloReceived) {
        return;
      }
    };
  }, []);

  const fetchSpaceWeatherData = useCallback(async () => {
    setSpaceWeatherLoading(true);
    try {
      const r = await fetch(apiUrl("spaceWeather"));
      const j = await r.json();
      if (j.success) setSpaceWeather(j.data);
    } catch (error) {} finally {
      setSpaceWeatherLoading(false);
    }
  }, []);

  const fetchSpaceWeatherAI = useCallback(async (force = false) => {
    if (!spaceWeather) return;
    if (!force && spaceWeatherAI) return;
    setSpaceWeatherAILoading(true);
    try {
      const r = await fetch(apiUrl("spaceWeatherAI"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spaceWeather })
      });
      const j = await r.json();
      if (j.data) {
        setSpaceWeatherAI(j.data);
      } else {
        setSpaceWeatherAI({ error: j.error || "AI generation failed." });
      }
    } catch (error) {
      setSpaceWeatherAI({ error: error.message });
    } finally {
      setSpaceWeatherAILoading(false);
    }
  }, [spaceWeather, spaceWeatherAI]);

  const fetchMissionIntelligenceFor = useCallback(async (satellite, force = false) => {
    if (!satellite) return;
    if (!force && missionIntelMap.has(satellite.noradId)) return;

    if (intelAbortRef.current) {
      try { intelAbortRef.current.abort(); } catch (error) {}
    }
    const controller = new AbortController();
    intelAbortRef.current = controller;

    setMissionIntelLoading(true);
    try {
      const r = await fetch(apiUrl("missionIntelligence"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ satellite: enrichSatellite(satellite) }),
        signal: controller.signal
      });
      const j = await r.json();
      if (j.data) {
        setMissionIntelMap(prev => {
          const next = new Map(prev);
          next.set(satellite.noradId, j.data);
          return next;
        });
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        setMissionIntelMap(prev => {
          const next = new Map(prev);
          next.set(satellite.noradId, { error: error.message });
          return next;
        });
      }
    } finally {
      if (intelAbortRef.current === controller) {
        intelAbortRef.current = null;
      }
      setMissionIntelLoading(false);
    }
  }, [missionIntelMap]);

  const fetchObservationDataFor = useCallback(async (satellite, force = false) => {
    if (!satellite) return;
    if (!force && observationMap.has(satellite.noradId)) return;

    if (observationAbortRef.current) {
      try { observationAbortRef.current.abort(); } catch (error) {}
    }
    const controller = new AbortController();
    observationAbortRef.current = controller;

    setObservationLoading(true);
    try {
      const r = await fetch(apiUrl("observationData"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ satellite: enrichSatellite(satellite) }),
        signal: controller.signal
      });
      const j = await r.json();
      if (j.data) {
        setObservationMap(prev => {
          const next = new Map(prev);
          next.set(satellite.noradId, j.data);
          return next;
        });
      }
    } catch (error) {
      if (error.name === "AbortError") return;
    } finally {
      if (observationAbortRef.current === controller) {
        observationAbortRef.current = null;
      }
      setObservationLoading(false);
    }
  }, [observationMap]);

  const fetchConstellationHealth = useCallback(async () => {
    setConstellationLoading(true);
    try {
      const r = await fetch(apiUrl("constellationHealth"));
      const j = await r.json();
      if (j.success) setConstellationHealth(j.constellations);
    } catch (error) {} finally {
      setConstellationLoading(false);
    }
  }, []);

  const fetchDecayWatch = useCallback(async () => {
    setDecayLoading(true);
    try {
      const r = await fetch(apiUrl("decayWatch"));
      const j = await r.json();
      if (j.success) {
        setDecayCandidates(j.candidates || []);
        setDecayMethodology(j.methodology || null);
      }
    } catch (error) {} finally {
      setDecayLoading(false);
    }
  }, []);

  const displayErrors = useMemo(() => errors.concat(harvestWarnings), [errors, harvestWarnings]);

  const copyAllErrors = useCallback(async () => {
    try {
      const allErrors = displayErrors.join("\n");
      await navigator.clipboard.writeText(allErrors);
      setCopiedErrors(true);
      setTimeout(() => setCopiedErrors(false), 2000);
    } catch (error) {}
  }, [displayErrors]);

  const handleVirtualScroll = useCallback((e) => {
    setVirtualScrollOffset(e.target.scrollTop);
  }, []);

  const [virtualListHeight, setVirtualListHeight] = useState(0);

  useEffect(() => {
    const element = virtualScrollRef.current;
    if (!element || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(() => setVirtualListHeight(element.clientHeight));
    observer.observe(element);
    setVirtualListHeight(element.clientHeight);
    return () => observer.disconnect();
  }, [layoutVisibility.sidebar, sidebarCollapsed, loading]);

  const getVirtualScrollItems = useMemo(() => {
    if (!virtualScrollRef.current) {
      return { visibleItems: filteredSatellites.slice(0, 20), startIndex: 0, endIndex: 19 };
    }

    const containerHeight = virtualListHeight || virtualScrollRef.current.clientHeight || 400;
    const itemHeight = PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT;
    const buffer = PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_BUFFER;

    const startIndex = Math.max(0, Math.floor(virtualScrollOffset / itemHeight) - buffer);
    const endIndex = Math.min(
      filteredSatellites.length - 1,
      Math.ceil((virtualScrollOffset + containerHeight) / itemHeight) + buffer
    );

    const visibleItems = filteredSatellites.slice(startIndex, endIndex + 1);

    return { visibleItems, startIndex, endIndex };
  }, [filteredSatellites, virtualScrollOffset, virtualListHeight]);

  const exportJSON = useCallback(() => {
    const detailedSatellites = satellites.map(satellite => {
      const data = satelliteDataRef.current.get(satellite.id);
      const position = data && data.position ? data.position : { x: 0, y: 0, z: 0 };
      const distance = Math.sqrt(position.x * position.x + position.y * position.y + position.z * position.z);

      return {
        ...satellite,
        currentPosition: {
          x: position.x.toFixed(2),
          y: position.y.toFixed(2),
          z: position.z.toFixed(2)
        },
        currentDistance: distance.toFixed(2),
        propagationModel: satellite.propagationModel || "None",
        hasTLE: !!satellite.hasTLE,
        visible: visibleSatellitesRef.current.has(satellite.id)
      };
    });

    const exportData = {
      satellites: detailedSatellites,
      earthRotation: earthRotationData,
      spaceWeather: spaceWeather,
      conjunctions: conjunctions,
      simulationTime: new Date(simulationDateMsRef.current).toISOString(),
      hudReadouts: {
        activeSatellites: satellites.filter(s => s.active).length,
        actualFps,
        currentTime,
        speedMultiplier,
        performanceStats
      },
      loadingMetadata,
      apiErrors: errors,
      orbitPropagation: {
        sgp4Count: satellites.filter(s => s.propagationModel === "SGP4").length,
        sdp4Count: satellites.filter(s => s.propagationModel === "SDP4").length,
        fallbackCount: satellites.filter(s => !s.hasTLE).length
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "satellite_data.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [satellites, earthRotationData, spaceWeather, conjunctions, actualFps, currentTime, speedMultiplier, performanceStats, loadingMetadata, errors]);

  const exportCSV = useCallback(() => {
    let csv = "ID,Name,Category,Altitude,Inclination,Period,Status,Color,Active,Source,Group,NORAD ID,Apogee,Perigee,Eccentricity,RAAN,Mean Anomaly,Velocity,Mean Motion,Epoch Year,Epoch Day,TLEAgeDays,BSTAR,PositionX,PositionY,PositionZ,CurrentDistance,PropagationModel,HasTLE,Visible\n";

    satellites.forEach(satellite => {
      const e = enrichSatellite(satellite);
      const data = satelliteDataRef.current.get(satellite.id);
      const position = data && data.position ? data.position : { x: 0, y: 0, z: 0 };
      const distance = Math.sqrt(position.x * position.x + position.y * position.y + position.z * position.z);
      const visible = visibleSatellitesRef.current.has(satellite.id);

      csv += `${csvQuote(e.id)},${csvQuote(e.name)},${csvQuote(e.category)},${e.altitude},${e.inclination || ""},${e.period},${csvQuote(e.status)},${e.color},${e.active},${csvQuote(e.source || "")},${csvQuote(e.group || "")},${e.noradId},${e.apogee || ""},${e.perigee || ""},${e.eccentricity || ""},${e.raan || ""},${e.meanAnomaly || ""},${e.velocity || ""},${e.meanMotion || ""},${e.epochYear || ""},${e.epochDay || ""},${e.tleAgeDays || ""},${e.bstar || ""},${position.x.toFixed(2)},${position.y.toFixed(2)},${position.z.toFixed(2)},${distance.toFixed(2)},${e.propagationModel || "None"},${!!e.hasTLE},${visible}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "satellite_data.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [satellites]);

  const exportText = useCallback(() => {
    const header = `# Satellite Tracker Data Export\n# Generated: ${new Date().toISOString()}\n# Simulation Time: ${new Date(simulationDateMsRef.current).toISOString()}\n# Total Satellites: ${satellites.length}\n# Format: Name | NORAD | Cat | Group | Alt(km) | Inc(deg) | Period(min) | Ecc | RAAN(deg) | MA(deg) | Vel(km/s) | MM(rev/day) | TLEAge(d)\n#\n`;
    const rows = satellites.map(s => {
      const e = enrichSatellite(s);
      return `${e.name} | ${e.noradId} | ${e.category} | ${e.group || ""} | ${e.altitude} | ${e.inclination || ""} | ${e.period} | ${e.eccentricity || ""} | ${e.raan || ""} | ${e.meanAnomaly || ""} | ${e.velocity || ""} | ${e.meanMotion || ""} | ${e.tleAgeDays || ""}`;
    }).join("\n");

    const blob = new Blob([header + rows + "\n"], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "satellite_data.txt";
    a.click();
    URL.revokeObjectURL(url);
  }, [satellites]);

  const toggleSatellite = useCallback((id) => {
    setSatellites(prev => prev.map(satellite =>
      satellite.id === id ? { ...satellite, active: !satellite.active } : satellite
    ));
  }, []);

  const selectAllSatellites = useCallback(() => {
    setSatellites(prev => prev.map(satellite => ({ ...satellite, active: true })));
  }, []);

  const deselectAllSatellites = useCallback(() => {
    setSatellites(prev => prev.map(satellite => ({ ...satellite, active: false })));
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying(p => !p);
  }, []);

  const toggleOrbits = useCallback(() => {
    setShowOrbits(v => !v);
  }, []);

  const toggleTrails = useCallback(() => {
    setShowTrails(v => !v);
  }, []);

  const toggleLabels = useCallback(() => {
    setShowLabels(v => !v);
  }, []);

  const toggleEquatorialGrid = useCallback(() => {
    setShowEquatorialGrid(v => !v);
  }, []);

  const toggleAxisMarkers = useCallback(() => {
    setShowAxisMarkers(v => !v);
  }, []);

  const toggleEarth = useCallback(() => {
    setShowEarth(v => !v);
  }, []);

  const collectEarthMapPoints = useCallback(() => {
    const gmst = satelliteJs.gstime(new Date(simulationDateMsRef.current));
    const points = [];
    for (const satellite of satellitesRef.current) {
      if (!satellite.active) continue;
      const data = satelliteDataRef.current.get(satellite.id);
      if (!data || !data.eciKm) continue;
      try {
        const geo = satelliteJs.eciToGeodetic(data.eciKm, gmst);
        points.push({ id: String(satellite.id), name: satellite.name, color: colorByTleAgeRef.current ? tleAgeColor(satellite.tleAgeDays) : satellite.color, lat: geo.latitude * 180 / Math.PI, lon: geo.longitude * 180 / Math.PI, line: `Altitude ${Math.round(geo.height).toLocaleString()} Km` });
      } catch (error) {}
    }
    return points;
  }, []);

  const toggleAltitudeBands = useCallback(() => {
    setShowAltitudeBands(v => !v);
  }, []);

  const toggleDistanceRings = useCallback(() => {
    setShowDistanceRings(v => !v);
  }, []);

  const toggleBloom = useCallback(() => {
    setBloomEnabled(v => !v);
  }, []);

  const toggleHUD = useCallback(() => {
    setHudVisible(v => {
      const next = !v;
      if (next) {
        closeAllOverlayPanels();
        setHudVisible(true);
        hudDraggable.setPosition({ x: 0, y: 0 });
        return true;
      }
      return false;
    });
  }, [hudDraggable, closeAllOverlayPanels]);

  const toggleSpaceWeatherExpanded = useCallback(() => {
    setSpaceWeatherExpanded(v => {
      const next = !v;
      if (next) {
        closeAllOverlayPanels();
        setSpaceWeatherExpanded(true);
        return true;
      }
      return false;
    });
  }, [closeAllOverlayPanels]);

  const toggleConjunctionPanel = useCallback(() => {
    setShowConjunctionPanel(v => {
      const next = !v;
      if (next) {
        closeAllOverlayPanels();
        setShowConjunctionPanel(true);
        return true;
      }
      return false;
    });
  }, [closeAllOverlayPanels]);

  const toggleConstellationPanel = useCallback(() => {
    setShowConstellationPanel(v => {
      const next = !v;
      if (next) {
        closeAllOverlayPanels();
        setShowConstellationPanel(true);
        if (!constellationHealth) fetchConstellationHealth();
        return true;
      }
      return false;
    });
  }, [closeAllOverlayPanels, constellationHealth, fetchConstellationHealth]);

  const toggleDecayPanel = useCallback(() => {
    setShowDecayPanel(v => {
      const next = !v;
      if (next) {
        closeAllOverlayPanels();
        setShowDecayPanel(true);
        if (decayCandidates.length === 0) fetchDecayWatch();
        return true;
      }
      return false;
    });
  }, [closeAllOverlayPanels, decayCandidates, fetchDecayWatch]);

  const resetCamera = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.position.set(150, 80, 150);
      cameraRef.current.lookAt(0, 0, 0);
    }
  }, []);

  const changeSpeed = useCallback((speed) => {
    setSpeedMultiplier(speed);
    if (speed === 1) {
      simulationDateMsRef.current = Date.now();
    }
  }, []);

  const stopActiveTweens = useCallback(() => {
    for (const t of activeTweensRef.current) {
      try { t.stop(); } catch (error) {}
    }
    activeTweensRef.current = [];
  }, []);

  const zoomToSatellite = useCallback((id) => {
    const data = satelliteDataRef.current.get(id);
    if (!data || !data.position || !cameraRef.current || !controlsRef.current) {
      return;
    }

    stopActiveTweens();

    const targetPosition = data.position.clone();
    const currentTarget = controlsRef.current.target.clone();
    const currentCameraPos = cameraRef.current.position.clone();
    const direction = currentCameraPos.clone().sub(currentTarget).normalize();
    const currentDistance = currentCameraPos.distanceTo(currentTarget);
    const desiredCameraPos = targetPosition.clone().add(direction.multiplyScalar(currentDistance));

    const camTween = new TWEEN.Tween(currentCameraPos)
      .to(desiredCameraPos, 1000)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate(() => {
        cameraRef.current.position.copy(currentCameraPos);
      })
      .onComplete(() => {
        const pos = cameraRef.current.position;
        const dist = pos.length();
        const minDist = 10;
        if (dist < minDist) {
          pos.normalize().multiplyScalar(minDist);
          cameraRef.current.position.copy(pos);
        }
      })
      .start();

    const targetTween = new TWEEN.Tween(currentTarget)
      .to(targetPosition, 1000)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate(() => {
        controlsRef.current.target.copy(currentTarget);
        controlsRef.current.update();
      })
      .start();

    activeTweensRef.current.push(camTween, targetTween);
  }, [stopActiveTweens]);

  const openDossier = useCallback((satellite) => {
    closeAllOverlayPanels();
    setDetailedSatellite(satellite);
    setActiveDossierTab("orbital");
    detailedDraggable.setPosition({ x: 0, y: 0 });
  }, [detailedDraggable, closeAllOverlayPanels]);

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        try { eventSourceRef.current.close(); } catch (error) {}
        eventSourceRef.current = null;
      }
      if (intelAbortRef.current) {
        try { intelAbortRef.current.abort(); } catch (error) {}
        intelAbortRef.current = null;
      }
      if (observationAbortRef.current) {
        try { observationAbortRef.current.abort(); } catch (error) {}
        observationAbortRef.current = null;
      }
      stopActiveTweens();
    };
  }, [stopActiveTweens]);

  useEffect(() => {
    if (!detailedSatellite) {
      if (intelAbortRef.current) {
        try { intelAbortRef.current.abort(); } catch (error) {}
        intelAbortRef.current = null;
      }
      if (observationAbortRef.current) {
        try { observationAbortRef.current.abort(); } catch (error) {}
        observationAbortRef.current = null;
      }
    }
  }, [detailedSatellite]);

  useEffect(() => {
    if (!selectedSatellite || !satellites.length) return;
    const exists = satellites.some(s => s.id === selectedSatellite && s.active);
    if (!exists) {
      setSelectedSatellite(null);
      if (viewMode === "2d") setViewMode("3d");
    }
  }, [satellites, selectedSatellite, viewMode]);

  useEffect(() => {
    document.body.className = `satellite-theme-${theme}`;
    return () => {
      document.body.className = "";
    };
  }, [theme]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, PERFORMANCE_CONSTANTS.SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchTerm]);

  useEffect(() => {
    const lower = debouncedSearchTerm.toLowerCase();
    if (!lower) {
      setFilteredSatellites(satellites);
      return;
    }
    const filtered = satellites.filter(satellite =>
      (satellite._lowerName && satellite._lowerName.includes(lower)) ||
      (satellite._lowerCategory && satellite._lowerCategory.includes(lower)) ||
      (satellite._lowerGroup && satellite._lowerGroup.includes(lower))
    );
    setFilteredSatellites(filtered);
  }, [satellites, debouncedSearchTerm]);

  useEffect(() => {
    fetchSpaceWeatherData();
    const interval = setInterval(fetchSpaceWeatherData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchSpaceWeatherData]);

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050508, 0.00002);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width && height ? width / height : 1, 0.1, 8000);
    camera.position.set(150, 80, 150);
    camera.lookAt(0, 0, 0);
    camera.layers.enableAll();
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x030305, 1);
    renderer.shadowMap.enabled = false;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);
    const wheelHost = mountRef.current;
    const claimWheel = (event) => { event.preventDefault(); };
    wheelHost.addEventListener("wheel", claimWheel, { passive: false, capture: true });

    const composer = new EffectComposer(renderer);
    composerRef.current = composer;
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.6, 0.3, 0.3);
    bloomPassRef.current = bloomPass;
    composer.addPass(bloomPass);

    const labelRenderer = document.createElement("div");
    labelRenderer.style.cssText = `position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 5;`;
    mountRef.current.appendChild(labelRenderer);
    labelRendererRef.current = labelRenderer;

    const ambientLight = new THREE.AmbientLight(0x606065, 0.5);
    scene.add(ambientLight);

    const earthGroup = new THREE.Group();
    const earthGeometry = new THREE.SphereGeometry(SCENE_EARTH_RADIUS, 96, 64);
    const earthMaterial = new THREE.MeshPhongMaterial({ color: 0x4488DD, shininess: 10, transparent: false });
    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    earthGroup.add(earth);
    applyEarthTexture(earthMaterial, renderer, false);

    const atmosphereGeometry = new THREE.SphereGeometry(SCENE_EARTH_RADIUS + 0.05, 64, 64);
    const atmosphereMaterial = new THREE.ShaderMaterial({
      vertexShader: `varying vec3 vNormal; varying vec3 vPositionNormal; void main() { vNormal = normalize(normalMatrix * normal); vPositionNormal = normalize((modelViewMatrix * vec4(position, 1.0)).xyz); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying vec3 vNormal; varying vec3 vPositionNormal; void main() { float intensity = pow(0.6 - dot(vNormal, vPositionNormal), 3.0); vec3 innerColor = vec3(0.85, 0.9, 0.95); vec3 outerColor = vec3(0.4, 0.5, 0.6); vec3 atmosphereColor = mix(innerColor, outerColor, intensity); float hdrBoost = 1.0 + intensity * 0.8; gl_FragColor = vec4(atmosphereColor * hdrBoost, 1.0) * intensity * 0.7; }`,
      blending: THREE.AdditiveBlending, side: THREE.BackSide, transparent: true, depthWrite: false
    });
    earthGroup.add(new THREE.Mesh(atmosphereGeometry, atmosphereMaterial));

    const innerAtmosphereGeometry = new THREE.SphereGeometry(SCENE_EARTH_RADIUS + 0.004, 64, 64);
    const innerAtmosphereMaterial = new THREE.ShaderMaterial({
      vertexShader: `varying vec3 vNormal; varying vec3 vSunDirection; varying float vIntensity; uniform vec3 sunPosition; void main() { vNormal = normalize(normalMatrix * normal); vec4 worldPosition = modelMatrix * vec4(position, 1.0); vSunDirection = normalize(sunPosition - worldPosition.xyz); float sunDot = dot(vNormal, vSunDirection); vIntensity = max(0.0, sunDot); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying vec3 vNormal; varying vec3 vSunDirection; varying float vIntensity; void main() { float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 3.0); vec3 dayColorInner = vec3(0.9, 0.92, 0.95); vec3 dayColorOuter = vec3(0.5, 0.55, 0.6); vec3 sunsetColor = vec3(1.0, 0.7, 0.4); vec3 nightColor = vec3(0.03, 0.04, 0.06); float terminator = smoothstep(-0.1, 0.3, vIntensity); vec3 dayColor = mix(dayColorOuter, dayColorInner, fresnel); vec3 twilightColor = mix(sunsetColor, dayColor, smoothstep(0.0, 0.25, vIntensity)); vec3 color = mix(nightColor, twilightColor, terminator); float hdrBoost = 1.0 + vIntensity * 0.8; float alpha = fresnel * 0.35 * (0.3 + 0.7 * vIntensity); gl_FragColor = vec4(color * hdrBoost, alpha); }`,
      uniforms: { sunPosition: { value: sunPositionRef.current } },
      blending: THREE.AdditiveBlending, side: THREE.FrontSide, transparent: true, depthWrite: false
    });
    earthGroup.add(new THREE.Mesh(innerAtmosphereGeometry, innerAtmosphereMaterial));

    const sunLight = new THREE.DirectionalLight(0xFFFFFF, 1.5);
    sunLight.position.copy(sunPositionRef.current.clone().normalize().multiplyScalar(100));
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    scene.add(earthGroup);
    earthRef.current = earthGroup;

    const polarGrid = new THREE.PolarGridHelper(300, 16, 8, 64, 0x444448, 0x222225);
    polarGrid.visible = false;
    scene.add(polarGrid);
    gridRef.current = polarGrid;

    const equatorialGrid = createEquatorialGrid();
    equatorialGrid.visible = true;
    scene.add(equatorialGrid);
    equatorialGridRef.current = equatorialGrid;

    const axisMarkers = createAxisMarkers();
    axisMarkers.visible = true;
    scene.add(axisMarkers);
    axisMarkersRef.current = axisMarkers;

    const altitudeBands = createAltitudeBands();
    altitudeBands.visible = true;
    scene.add(altitudeBands);
    altitudeBandsRef.current = altitudeBands;

    const distanceRings = createDistanceRings();
    distanceRings.visible = true;
    scene.add(distanceRings);
    distanceRingsRef.current = distanceRings;

    const satelliteGroup = new THREE.Group();
    scene.add(satelliteGroup);
    satelliteGroupRef.current = satelliteGroup;

    const satelliteGeometry = new THREE.SphereGeometry(0.5, 8, 8);
    const satelliteMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 1.0 });
    const satelliteInstance = new THREE.InstancedMesh(satelliteGeometry, satelliteMaterial, PERFORMANCE_CONSTANTS.MAX_VISIBLE_SATELLITES);
    satelliteInstance.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    satelliteInstance.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(PERFORMANCE_CONSTANTS.MAX_VISIBLE_SATELLITES * 3), 3);
    satelliteInstance.count = 0;
    satelliteGroup.add(satelliteInstance);
    satelliteInstanceRef.current = satelliteInstance;

    const glowGeometry = new THREE.SphereGeometry(1.2, 8, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.2, side: THREE.BackSide });
    const glowInstance = new THREE.InstancedMesh(glowGeometry, glowMaterial, PERFORMANCE_CONSTANTS.MAX_VISIBLE_SATELLITES);
    glowInstance.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    glowInstance.count = 0;
    satelliteGroup.add(glowInstance);
    glowInstanceRef.current = glowInstance;

    const starsGeometry = new THREE.BufferGeometry();
    const starCount = 8000;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);
    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      const radius = 1500 + Math.random() * 3000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      starPositions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPositions[i3 + 2] = radius * Math.cos(phi);
      const starType = Math.random();
      let baseColor, intensity, size;
      if (starType < 0.5) {
        baseColor = { r: 0.9, g: 0.95, b: 1.0 };
        intensity = 0.7 + Math.random() * 0.3;
        size = 1.0 + Math.random() * 0.5;
      } else if (starType < 0.7) {
        baseColor = { r: 1.0, g: 0.95, b: 0.85 };
        intensity = 0.75 + Math.random() * 0.25;
        size = 1.2 + Math.random() * 0.8;
      } else if (starType < 0.85) {
        baseColor = { r: 1.0, g: 0.7, b: 0.4 };
        intensity = 0.8 + Math.random() * 0.2;
        size = 1.8 + Math.random() * 1.0;
      } else {
        baseColor = { r: 0.95, g: 0.92, b: 1.0 };
        intensity = 0.6 + Math.random() * 0.3;
        size = 0.5 + Math.random() * 0.3;
      }
      starColors[i3] = baseColor.r * intensity;
      starColors[i3 + 1] = baseColor.g * intensity;
      starColors[i3 + 2] = baseColor.b * intensity;
      starSizes[i] = size;
    }
    starsGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    starsGeometry.setAttribute("color", new THREE.BufferAttribute(starColors, 3));
    starsGeometry.setAttribute("size", new THREE.BufferAttribute(starSizes, 1));
    const starsMaterial = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0.0 } },
      vertexShader: `attribute float size; varying vec3 vColor; uniform float time; void main() { vColor = color; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); float twinkle = sin(time * 1.5 + position.x * 0.01 + position.y * 0.01) * 0.15 + 0.85; gl_PointSize = size * twinkle * (200.0 / -mvPosition.z); gl_Position = projectionMatrix * mvPosition; }`,
      fragmentShader: `varying vec3 vColor; void main() { float distance = length(gl_PointCoord - vec2(0.5)); if (distance > 0.5) discard; float alpha = 1.0 - smoothstep(0.0, 0.5, distance); alpha *= alpha; float coreBrightness = smoothstep(0.2, 0.0, distance) * 1.2; vec3 hdrColor = vColor * (1.0 + coreBrightness); gl_FragColor = vec4(hdrColor, alpha * 0.9); }`,
      transparent: true, vertexColors: true, blending: THREE.AdditiveBlending
    });
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);
    starsRef.current = stars;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.enableTouch = true;
    controls.maxDistance = 2000;
    controls.minDistance = 10;
    controlsRef.current = controls;

    const handleResize = () => {
      if (!mountRef.current) return;
      const newWidth = mountRef.current.clientWidth;
      const newHeight = mountRef.current.clientHeight;
      if (!newWidth || !newHeight) return;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
      composer.setSize(newWidth, newHeight);
      bloomPass.resolution.set(newWidth, newHeight);
      Object.values(orbitLinesRef.current).forEach(line => {
        if (line && line.material && line.material.resolution) {
          line.material.resolution.set(newWidth, newHeight);
        }
      });
      Object.values(trailLinesRef.current).forEach(line => {
        if (line && line.material && line.material.resolution) {
          line.material.resolution.set(newWidth, newHeight);
        }
      });
    };

    window.addEventListener("resize", handleResize);
    const mountResizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(handleResize) : null;
    if (mountResizeObserver) mountResizeObserver.observe(mountRef.current);
    if (renderer.domElement.width > 0 && renderer.domElement.height > 0) composer.render();
    setSceneInitialized(true);

    return () => {
      wheelHost.removeEventListener("wheel", claimWheel, { capture: true });
      if (mountRef.current && renderer.domElement && mountRef.current.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
      if (mountRef.current && labelRenderer && mountRef.current.contains(labelRenderer)) {
        mountRef.current.removeChild(labelRenderer);
      }
      Object.values(labelsRef.current).forEach(label => {
        if (label && label.element && label.element.parentNode) {
          label.element.parentNode.removeChild(label.element);
        }
      });
      Object.values(orbitLinesRef.current).forEach(line => {
        if (line) {
          line.geometry.dispose();
          line.material.dispose();
        }
      });
      Object.values(trailLinesRef.current).forEach(line => {
        if (line) {
          line.geometry.dispose();
          line.material.dispose();
        }
      });
      composer.dispose();
      window.removeEventListener("resize", handleResize);
      if (mountResizeObserver) mountResizeObserver.disconnect();
      controls.dispose();
      scene.traverse(child => {
        if (child instanceof THREE.Mesh || child instanceof THREE.InstancedMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(mat => mat.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
        if (child instanceof THREE.Line || child instanceof THREE.Points) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        }
      });
      renderer.dispose();
    };
  }, [authLoading]);

  useEffect(() => {
    if (sceneInitialized && stateRestored) {
      fetchSatelliteData();
      const interval = setInterval(() => fetchSatelliteData(), 15 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [sceneInitialized, stateRestored, fetchSatelliteData]);

  useEffect(() => { if (gridRef.current) gridRef.current.visible = showGrid; }, [showGrid]);
  useEffect(() => { if (equatorialGridRef.current) equatorialGridRef.current.visible = showEquatorialGrid; }, [showEquatorialGrid]);
  useEffect(() => { if (axisMarkersRef.current) axisMarkersRef.current.visible = showAxisMarkers; }, [showAxisMarkers]);
  useEffect(() => { if (earthRef.current) earthRef.current.visible = showEarth; }, [showEarth]);
  useEffect(() => { if (altitudeBandsRef.current) altitudeBandsRef.current.visible = showAltitudeBands; }, [showAltitudeBands]);
  useEffect(() => { if (distanceRingsRef.current) distanceRingsRef.current.visible = showDistanceRings; }, [showDistanceRings]);

  useEffect(() => {
    if (bloomPassRef.current) {
      bloomPassRef.current.enabled = bloomEnabled;
      bloomPassRef.current.strength = bloomStrength;
      bloomPassRef.current.radius = bloomRadius;
      bloomPassRef.current.threshold = bloomThreshold;
    }
  }, [bloomEnabled, bloomStrength, bloomRadius, bloomThreshold]);

  useEffect(() => {
    Object.keys(labelsRef.current).forEach(satelliteId => {
      const label = labelsRef.current[satelliteId];
      if (label && label.element) {
        if (!satellites.find(s => s.id === satelliteId && s.active)) {
          if (label.element.parentNode) {
            label.element.parentNode.removeChild(label.element);
          }
          delete labelsRef.current[satelliteId];
        }
      }
    });
    satellites.forEach(satellite => {
      if (satellite.active && !labelsRef.current[satellite.id]) {
        const label = createLabel(satellite.name, satellite.color);
        labelsRef.current[satellite.id] = label;
        if (labelRendererRef.current) {
          labelRendererRef.current.appendChild(label.element);
        }
      }
    });
  }, [satellites, createLabel]);

  useEffect(() => {
    if (!sceneInitialized || !sceneRef.current || !composerRef.current || !cameraRef.current) return;

    let animationId;
    let lastTime = performance.now();
    let fpsCounter = 0;
    let then = performance.now();
    lastFpsTime.current = then;

    const animate = (time) => {
      animationId = requestAnimationFrame(animate);

      const fpsInterval = 1000 / targetFpsRef.current;
      const elapsed = time - then;
      if (elapsed < fpsInterval) return;

      const deltaTime = time - lastTime;
      const actualDelta = deltaTime / 1000;
      then = time - (elapsed % fpsInterval);
      lastTime = time;
      frameCountRef.current++;

      if (starsRef.current && starsRef.current.material && starsRef.current.material.uniforms) {
        starsRef.current.material.uniforms.time.value = time * 0.001;
      }

      fpsCounter++;
      if (time - lastFpsTime.current >= 1000) {
        const fps = Math.round(fpsCounter * 1000 / (time - lastFpsTime.current));
        setActualFps(fps);
        fpsCounter = 0;
        lastFpsTime.current = time;
        if (rendererRef.current && rendererRef.current.info) {
          const info = rendererRef.current.info;
          setPerformanceStats({
            renderTime: Math.round(deltaTime * 100) / 100,
            memoryUsage: info.memory.geometries + info.memory.textures,
            triangles: info.render.triangles,
            drawCalls: info.render.calls,
            lines: info.render.lines,
            textures: info.memory.textures,
            geometries: info.memory.geometries,
            visibleSatellites: visibleSatellitesRef.current.size,
            culledSatellites: Math.max(0, satellitesRef.current.filter(s => s.active).length - visibleSatellitesRef.current.size)
          });
        }
      }

      if (controlsRef.current) controlsRef.current.update();

      if (isPlayingRef.current) {
        if (speedMultiplierRef.current === 1) {
          simulationDateMsRef.current = Date.now();
        } else {
          simulationDateMsRef.current += actualDelta * 1000 * speedMultiplierRef.current;
        }
      }

      const currentDate = new Date(simulationDateMsRef.current);
      setCurrentTime(currentDate.toLocaleString("en-US", {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit", second: "2-digit"
      }));

      if (earthRef.current && earthRotationFlagRef.current && earthRotationDataRef.current) {
        const eod = earthRotationDataRef.current;
        const currentJD = dateToJulianDate(currentDate);
        let gmst = eod.gmst + 360.98564736629 * (currentJD - eod.julianDate) * ORBITAL_CONSTANTS.DEG_TO_RAD;
        gmst = gmst % (2 * Math.PI);
        if (gmst < 0) gmst += 2 * Math.PI;
        earthRef.current.rotation.y = gmst;

        const sunECI = computeSunDirectionECI(currentDate);
        const sunDistance = 1000000;
        sunPositionRef.current.set(
          sunECI.x * sunDistance,
          sunECI.z * sunDistance,
          -sunECI.y * sunDistance
        );

        if (sunLightRef.current) {
          sunLightRef.current.position.copy(sunPositionRef.current.clone().normalize().multiplyScalar(100));
        }
      }

      if (!anyOverlayOpenRef.current && frameCountRef.current % PERFORMANCE_CONSTANTS.UPDATE_FREQUENCY === 0) {
        computeAllPositions();
        performFrustumCulling();
        writeInstanceBuffers();
        updateOrbitsAndTrails();
        updateLabels();
      }

      if (!anyOverlayOpenRef.current && time - lastConjunctionCheckRef.current > PERFORMANCE_CONSTANTS.CONJUNCTION_CHECK_INTERVAL_MS) {
        lastConjunctionCheckRef.current = time;
        const newConj = detectConjunctions(satellitesRef.current, satelliteDataRef.current, conjunctionThresholdRef.current, new Date(simulationDateMsRef.current), getOrCreateSatrec);
        setConjunctions(newConj);
      }

      TWEEN.update(time);

      const canvas = rendererRef.current?.domElement;
      if (!canvas || canvas.width === 0 || canvas.height === 0) return;

      if (bloomEnabledRef.current) {
        cameraRef.current.layers.set(0);
        composerRef.current.render();
        cameraRef.current.layers.set(NON_BLOOM_LAYER);
        rendererRef.current.autoClear = false;
        rendererRef.current.render(sceneRef.current, cameraRef.current);
        rendererRef.current.autoClear = true;
        cameraRef.current.layers.enableAll();
      } else {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate(performance.now());

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [sceneInitialized, computeAllPositions, performFrustumCulling, writeInstanceBuffers, updateOrbitsAndTrails, updateLabels, getOrCreateSatrec]);

  const enrichedDetailedSatellite = useMemo(() => {
    return detailedSatellite ? enrichSatellite(detailedSatellite) : null;
  }, [detailedSatellite]);

  const detailedSatrec = useMemo(() => {
    return detailedSatellite ? getOrCreateSatrec(detailedSatellite) : null;
  }, [detailedSatellite, getOrCreateSatrec]);

  const selectedSatelliteObj = useMemo(() => {
    if (!selectedSatellite) return null;
    return satellites.find(s => s.id === selectedSatellite) || null;
  }, [satellites, selectedSatellite]);

  const selectedSatrec = useMemo(() => {
    return selectedSatelliteObj ? getOrCreateSatrec(selectedSatelliteObj) : null;
  }, [selectedSatelliteObj, getOrCreateSatrec]);

  const activeSatellites = useMemo(() => satellites.filter(s => s.active).length, [satellites]);
  const sgp4Count = useMemo(() => satellites.filter(s => s.propagationModel === "SGP4").length, [satellites]);
  const sdp4Count = useMemo(() => satellites.filter(s => s.propagationModel === "SDP4").length, [satellites]);

  const eclipseStats = useMemo(() => {
    let inShadow = 0;
    let sunlit = 0;
    satellites.forEach(satellite => {
      if (satellite.active) {
        const data = satelliteDataRef.current.get(satellite.id);
        if (data) {
          if (data.inShadow) {
            inShadow++;
          } else {
            sunlit++;
          }
        }
      }
    });
    return { inShadow, sunlit };
  }, [satellites, performanceStats]);

  const tleQualityStats = useMemo(() => {
    const stats = { fresh: 0, recent: 0, aging: 0, stale: 0, veryStale: 0, unknown: 0 };
    satellites.forEach(s => {
      if (!s.active) return;
      const a = s.tleAgeDays;
      if (a === null || a === undefined) stats.unknown++;
      else if (a < 1) stats.fresh++;
      else if (a < 3) stats.recent++;
      else if (a < 7) stats.aging++;
      else if (a < 14) stats.stale++;
      else stats.veryStale++;
    });
    return stats;
  }, [satellites]);

  const categoryCounts = useMemo(() => {
    return satellites.reduce((acc, satellite) => {
      if (satellite.active) {
        acc[satellite.category] = (acc[satellite.category] || 0) + 1;
      }
      return acc;
    }, {});
  }, [satellites]);

  const speedLabel = useMemo(() => {
    const match = SPEED_OPTIONS.find(o => o.value === speedMultiplier);
    return match ? match.label : `${speedMultiplier}x`;
  }, [speedMultiplier]);

  const { visibleItems, startIndex } = getVirtualScrollItems;

  const currentMissionIntel = detailedSatellite ? missionIntelMap.get(detailedSatellite.noradId) : null;
  const currentObservation = detailedSatellite ? observationMap.get(detailedSatellite.noradId) : null;

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
        const isBoolean = (value) => typeof value === "boolean";
        const isNumber = (value) => Number.isFinite(value);
        pick("theme", setTheme, (value) => value === "dark" || value === "neon");
        pick("isPlaying", setIsPlaying, isBoolean);
        pick("earthRotation", setEarthRotation, isBoolean);
        pick("speedMultiplier", setSpeedMultiplier, (value) => SPEED_OPTIONS.some((option) => option.value === value));
        pick("targetFps", setTargetFps, (value) => FPS_OPTIONS.includes(value));
        pick("showOrbits", setShowOrbits, isBoolean);
        pick("showTrails", setShowTrails, isBoolean);
        pick("showLabels", setShowLabels, isBoolean);
        pick("showGrid", setShowGrid, isBoolean);
        pick("showEquatorialGrid", setShowEquatorialGrid, isBoolean);
        pick("showAxisMarkers", setShowAxisMarkers, isBoolean);
        pick("showEarth", setShowEarth, isBoolean);
        pick("mapGlobe", setMapGlobe, isBoolean);
        pick("showAltitudeBands", setShowAltitudeBands, isBoolean);
        pick("showDistanceRings", setShowDistanceRings, isBoolean);
        pick("bloomEnabled", setBloomEnabled, isBoolean);
        pick("bloomStrength", setBloomStrength, isNumber);
        pick("bloomRadius", setBloomRadius, isNumber);
        pick("bloomThreshold", setBloomThreshold, isNumber);
        pick("conjunctionThreshold", setConjunctionThreshold, isNumber);
        pick("colorByTleAge", setColorByTleAge, isBoolean);
        pick("sidebarCollapsed", setSidebarCollapsed, isBoolean);
        pick("controlsCollapsed", setControlsCollapsed, isBoolean);
        pick("legendCollapsed", setLegendCollapsed, isBoolean);
        pick("layoutVisibility", (value) => setLayoutVisibility((current) => ({ ...current, ...value })), (value) => typeof value === "object");
        pick("expandedWarnings", setExpandedWarnings, (value) => typeof value === "object");
        pick("observerLocation", setObserverLocation, (value) => typeof value === "object" && Number.isFinite(value.lat) && Number.isFinite(value.lon) && value.lat >= -90 && value.lat <= 90 && value.lon >= -180 && value.lon <= 180);
        pick("selectedAreaId", setSelectedAreaId, (value) => typeof value === "string");
        pick("areaFilterActive", setAreaFilterActive, isBoolean);
        pick("selectedSatellite", setSelectedSatellite, (value) => typeof value === "string");
        pick("sounds", replaceSoundSettings, (value) => typeof value === "object");
        if (Array.isArray(saved.activeSatellites)) restoredActiveRef.current = new Set(saved.activeSatellites.filter((id) => typeof id === "string"));
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

  const activeSatelliteIds = useMemo(() => satellites.filter((satellite) => satellite.active).map((satellite) => satellite.id), [satellites]);

  useEffect(() => {
    if (!stateRestored) return undefined;
    if (saveStateDebounceRef.current) clearTimeout(saveStateDebounceRef.current);
    saveStateDebounceRef.current = setTimeout(() => {
      saveStateToDB({
        theme,
        isPlaying,
        earthRotation,
        speedMultiplier,
        targetFps,
        showOrbits,
        showTrails,
        showLabels,
        showGrid,
        showEquatorialGrid,
        showAxisMarkers,
        showEarth,
        mapGlobe,
        showAltitudeBands,
        showDistanceRings,
        bloomEnabled,
        bloomStrength,
        bloomRadius,
        bloomThreshold,
        conjunctionThreshold,
        colorByTleAge,
        sidebarCollapsed,
        controlsCollapsed,
        legendCollapsed,
        layoutVisibility,
        expandedWarnings,
        observerLocation,
        selectedAreaId,
        areaFilterActive,
        selectedSatellite,
        activeSatellites: satellites.length ? activeSatelliteIds : restoredActiveRef.current ? Array.from(restoredActiveRef.current) : undefined,
        sounds: sounds.settings
      });
    }, SOURCES.persistence.saveDebounceMs);
    return () => clearTimeout(saveStateDebounceRef.current);
  }, [stateRestored, theme, isPlaying, earthRotation, speedMultiplier, targetFps, showOrbits, showTrails, showLabels, showGrid, showEquatorialGrid, showAxisMarkers, showEarth, mapGlobe, showAltitudeBands, showDistanceRings, bloomEnabled, bloomStrength, bloomRadius, bloomThreshold, conjunctionThreshold, colorByTleAge, sidebarCollapsed, controlsCollapsed, legendCollapsed, layoutVisibility, expandedWarnings, observerLocation, selectedAreaId, areaFilterActive, selectedSatellite, activeSatelliteIds, satellites.length, sounds.settings]);

  useEffect(() => {
    if (!sceneInitialized || !stateRestored) return;
    if (gridRef.current) gridRef.current.visible = showGrid;
    if (equatorialGridRef.current) equatorialGridRef.current.visible = showEquatorialGrid;
    if (axisMarkersRef.current) axisMarkersRef.current.visible = showAxisMarkers;
    if (earthRef.current) earthRef.current.visible = showEarth;
    if (altitudeBandsRef.current) altitudeBandsRef.current.visible = showAltitudeBands;
    if (distanceRingsRef.current) distanceRingsRef.current.visible = showDistanceRings;
    if (bloomPassRef.current) {
      bloomPassRef.current.enabled = bloomEnabled;
      bloomPassRef.current.strength = bloomStrength;
      bloomPassRef.current.radius = bloomRadius;
      bloomPassRef.current.threshold = bloomThreshold;
    }
  }, [sceneInitialized, stateRestored]);

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

  const alertObject = (item) => {
    const ids = item.norad || [];
    for (const id of ids) {
      const match = satellites.find((satellite) => satellite.noradId === id);
      if (match) return match;
    }
    return null;
  };

  const showAlertDetails = (item) => {
    const object = alertObject(item);
    if (object) {
      setShowAlertsPanel(false);
      if (!object.active) toggleSatellite(object.id);
      setSelectedSatellite(object.id);
      openDossier(object);
      return;
    }
    if (item.kind === "spaceWeather") {
      setShowAlertsPanel(false);
      closeAllOverlayPanels();
      setSpaceWeatherExpanded(true);
      return;
    }
    setExpandedAlertKey(item.key);
    setShowAlertsPanel(true);
  };

  const renderAnalysis = (item, ended) => {
    const analysisState = ackAnalyses[item.key] || {};
    const analysis = analysisState.data;
    return (
      <div className="satWeatherAckAnalysis">
        {ended && <div className="satWeatherAckNote">This alert has ended, so no analysis is generated for it.</div>}
        {!ended && analysisState.loading && <div className="satWeatherAckNote"><FontAwesomeIcon icon={faSpinner} spin /> Generating Analysis</div>}
        {!ended && analysisState.error && <div className="satWeatherDetailError">{`The AI analysis is unavailable because of the error "${String(analysisState.error).replace(/\.$/, "")}".`}</div>}
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
            <div className="satWeatherAckFootnote">{`Generated By ${analysis.model} At ${new Date(analysis.generatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} From The Live Alert Data`}</div>
          </>
        )}
      </div>
    );
  };

  const renderAckModal = () => {
    if (!ackEntry) return null;
    const position = Math.min(ackIndex, ackList.length - 1);
    const pending = ackPendingKeys.has(ackEntry.key);
    const pendingCount = ackList.filter((item) => ackPendingKeys.has(item.key)).length;
    const item = ackEntry.item;
    const status = ackEntry.ended ? "Ended" : ackEntry.updated ? "Updated" : "New";
    const color = ackEntry.ended ? "#919baf" : ALERT_SEVERITY_COLORS[item.severity] || "#FF9500";
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
                <span className="satWeatherAckEvent" style={{ color }}>{item.title}</span>
                <span className={`satWeatherAckStatus satWeatherAckStatus${status}`}>{status}</span>
              </div>
              <div className="satWeatherAckHeadline">{item.message}</div>
            </div>
            <div className="satWeatherAckSectionTitle">Alert Details</div>
            {renderDetailFields(alertFields(item), { columns: 3, wideAt: 26, fullAt: 40 })}
            {item.officialText && <OfficialText title="Official Message" text={item.officialText} />}
            <div className="satWeatherAckSectionTitle">AI Analysis</div>
            {renderAnalysis(item, ackEntry.ended)}
          </div>
          <div className="satWeatherAckActions">
            <span className="satWeatherAckRemaining">{!pending ? "Already Acknowledged" : pendingCount === 1 ? "Last Alert To Acknowledge" : `${pendingCount - 1} More To Acknowledge`}</span>
            <button type="button" className="satWeatherModalBtnSecondary" onClick={() => {
              closeAckModal();
              showAlertDetails(item);
            }}><FontAwesomeIcon icon={alertObject(item) ? faSatellite : faInfoCircle} /> {alertObject(item) ? "View Object" : "View Details"}</button>
            <button type="button" className="satWeatherModalBtnPrimary" disabled={!pending} onClick={() => sounds.acknowledge(ackEntry.key)}><FontAwesomeIcon icon={faCheck} /> {pending ? "Acknowledge" : "Acknowledged"}</button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  const renderAlertsPanel = () => {
    if (!showAlertsPanel) return null;
    return createPortal(
      <div className="satWeatherModalOverlay" onClick={() => setShowAlertsPanel(false)}>
        <div className="satWeatherModal" onClick={(clickEvent) => clickEvent.stopPropagation()}>
          <div className="satWeatherModalHeader">
            <span>{`Active Alerts (${bellItems.length})`}</span>
            <button type="button" className="satWeatherModalClose" onClick={() => setShowAlertsPanel(false)} title="Close"><FontAwesomeIcon icon={faTimes} /></button>
          </div>
          <div className="satWeatherModalContent">
            <div className="satWeatherAckSectionTitle">{activeAreas ? `Alerting For ${activeAreasLabel}` : `Alerting For ${locationName || "Global Events Only"}`}</div>
            {renderDetailFields((alertsData ? alertsData.sources : []).map((source) => [source.name, source.error ? `${source.status} | ${source.error}` : `${source.status}${source.checkedAt ? ` | Checked ${new Date(source.checkedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : ""}`]))}
            {alertsError && <div className="satWeatherDetailError">{alertsError}</div>}
            {bellItems.length === 0 ? (
              alertsError && !alertsData ? null : <div className="satWeatherAckNote">There are no active space weather, reentry, or collision alerts in this scope.</div>
            ) : bellItems.map((item) => {
              const color = ALERT_SEVERITY_COLORS[item.severity] || "#FF9500";
              const expanded = expandedAlertKey === item.key;
              return (
                <div key={item.key} className="satTrackerAlertEntry">
                  <button type="button" className="satWeatherAckTitle satTrackerAlertToggle" style={{ borderLeftColor: color }} onClick={() => setExpandedAlertKey(expanded ? null : item.key)}>
                    <div className="satWeatherAckTitleRow">
                      <span className="satWeatherAckEvent" style={{ color }}>{item.title}</span>
                      <span className={`satWeatherAckStatus ${pendingKeys.has(item.key) ? "satWeatherAckStatusNew" : "satWeatherAckStatusUpdated"}`}>{pendingKeys.has(item.key) ? "Unacknowledged" : titleCaseWords(item.severity.toLowerCase())}</span>
                    </div>
                    <div className="satWeatherAckHeadline">{item.message}</div>
                  </button>
                  {expanded && (
                    <>
                      {renderDetailFields(alertFields(item))}
                      {item.officialText && <OfficialText title="Official Message" text={item.officialText} />}
                      {renderAnalysis(item, false)}
                      <div className="satWeatherModalActions">
                        {pendingKeys.has(item.key) && <button type="button" className="satWeatherModalBtnSecondary" onClick={() => sounds.acknowledge(item.key)}><FontAwesomeIcon icon={faCheck} /> Acknowledge</button>}
                        {(alertObject(item) || item.kind === "spaceWeather") && <button type="button" className="satWeatherModalBtnPrimary" onClick={() => showAlertDetails(item)}><FontAwesomeIcon icon={alertObject(item) ? faSatellite : faSun} /> {alertObject(item) ? "View Object" : "Space Weather"}</button>}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>,
      document.body
    );
  };

  const renderAlertControls = () => (
    <div className="satTrackerAlertControls">
      <div className="satWeatherAreaList">
        <div className="satWeatherAreaListHeader">
          <span className="satWeatherAreaListTitle"><FontAwesomeIcon icon={faMapPin} /> Monitored Areas</span>
          <button className="satWeatherAreaListButton" onClick={() => openAreaModal(null)} title="Add Area"><FontAwesomeIcon icon={faPlus} /></button>
        </div>
        {areas.length === 0 ? (
          <div className="satWeatherAreaListEmpty">Add an area to watch for reentries predicted near it.</div>
        ) : (
          <div className="satWeatherAreaListItems">
            {areas.map((area) => {
              const summary = areaCounts[area.area_id] || { total: 0, critical: 0, top: null };
              const isSelected = area.area_id === selectedAreaId;
              return (
                <div key={area.area_id} className={`satWeatherAreaListItem${isSelected ? " satWeatherAreaListItemSelected" : ""}`} onClick={() => selectArea(area)}>
                  <span className="satWeatherAreaListItemDot" style={{ backgroundColor: summary.top ? ALERT_SEVERITY_COLORS[summary.top] : alertsData ? "#4ecdc4" : "#3d4354" }} />
                  <div className="satWeatherAreaListItemInfo">
                    <span className="satWeatherAreaListItemName">{area.name || describeArea(area)}</span>
                    <span className="satWeatherAreaListItemMeta">{`${summary.total} Alert${summary.total === 1 ? "" : "s"} · ${summary.critical} Critical`}</span>
                  </div>
                  <button className="satWeatherAreaListButton" onClick={(event) => { event.stopPropagation(); openAreaModal(area); }} title="Edit Area"><FontAwesomeIcon icon={faEdit} /></button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Dropdown
        value={labelFor(ALERT_SCOPE_OPTIONS, activeAreas ? "areas" : "selected")}
        onChange={(option) => chooseAlertScope(valueFor(ALERT_SCOPE_OPTIONS, option))}
        options={ALERT_SCOPE_OPTIONS.map(([, label]) => label)}
        placeholder="Alert Scope"
      />
      <div className="satTrackerLocationSearch">
        <input
          type="text"
          placeholder="Search Places"
          value={locationQuery}
          onChange={(event) => setLocationQuery(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") searchLocations(); }}
          className="satEarthCondInput"
        />
        <button type="button" onClick={searchLocations} className="satEarthCondBtn satEarthCondBtnSecondary satWeatherBtnElide" title="Search Places">
          <FontAwesomeIcon icon={faSearchPlus} /> <span>Search</span>
        </button>
      </div>
      {locationSearchStatus && <div className="satEarthCondLocationSearchStatus">{locationSearchStatus}</div>}
      {locationResults.length > 0 && (
        <div className="satEarthCondLocationResults">
          {locationResults.map((result) => (
            <button key={`${result.latitude}_${result.longitude}`} type="button" className="satEarthCondLocationResult" onClick={() => selectSearchResult(result)}>
              <span className="satEarthCondLocationResultName">{result.label}</span>
              <span className="satEarthCondLocationResultCoords">{result.latitude.toFixed(3)}, {result.longitude.toFixed(3)}</span>
            </button>
          ))}
        </div>
      )}
      <button type="button" onClick={() => setShowLocationPicker(true)} className="satEarthCondBtn satEarthCondBtnSecondary satWeatherBtnElide" title="Choose A Location On The Map Or By Coordinates">
        <FontAwesomeIcon icon={faGlobeAmericas} /> <span>Set Location</span>
      </button>
      {observerLocation && (
        <div className="satWeatherLocationCurrent" title={`${locationName} | ${observerLocation.lat.toFixed(4)}°, ${observerLocation.lon.toFixed(4)}°`}>
          <span className="satWeatherLocationCurrentName">{locationName}</span>
          <span className="satWeatherLocationCurrentCoords">{`${observerLocation.lat.toFixed(4)}°, ${observerLocation.lon.toFixed(4)}°`}</span>
        </div>
      )}
    </div>
  );

  const renderSoundBar = () => (
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
        className="satSummaryAlertBtn"
        onClick={() => sounds.test(sounds.settings.minLevel)}
      >
        <FontAwesomeIcon icon={faPlay} />
      </button>
    </div>
  );

  const renderOrbitalDossierContent = () => {
    if (!enrichedDetailedSatellite) return null;
    const sat = enrichedDetailedSatellite;
    const advanced = computeAdvancedDerivatives(sat);
    const liveData = satelliteDataRef.current.get(sat.id);
    const inShadow = liveData?.inShadow;
    const illumination = Math.round((liveData?.shadowFactor || 1.0) * 100);
    const isVisible = visibleSatellitesRef.current.has(sat.id);
    const ageDays = sat.tleAgeDays;
    const tleColor = tleAgeColor(ageDays);
    const horizonDist = Math.round(Math.sqrt(Math.pow(6371 + sat.altitude, 2) - Math.pow(6371, 2)));
    const footprintRadius = Math.round(6371 * Math.acos(6371 / (6371 + sat.altitude)) * 180 / Math.PI * 111);
    const coverageArea = (Math.PI * Math.pow(6371 * Math.acos(6371 / (6371 + sat.altitude)), 2) / 1000000).toFixed(2);
    const earthCoverage = ((1 - Math.cos(Math.acos(6371 / (6371 + sat.altitude)))) / 2 * 100).toFixed(2);
    const eccLabel = sat.eccentricity < 0.01 ? "circular" : sat.eccentricity < 0.1 ? "near-circular" : sat.eccentricity < 0.5 ? "elliptical" : "highly elliptical";
    const inclLabel = sat.inclination < 1 ? "equatorial" : sat.inclination < 30 ? "low" : sat.inclination < 60 ? "mid" : sat.inclination < 90 ? "high" : sat.inclination < 100 ? "near-polar" : "retrograde";
    const livePosition = liveData?.position;
    const liveDistanceFromEarthCenter = livePosition ? livePosition.length() * ORBITAL_CONSTANTS.SCALE_FACTOR : null;

    return (
      <div className="satDossierTabContent">
        <div className="satStatTileGrid">
          <StatTile label="Status" value={sat.status} sub={`${sat.category} · ${sat.propagationModel || "No TLE"}`} color={sat.status === "Active" ? "#4ecdc4" : "#FF9500"} accent={sat.color} large />
          <StatTile label="NORAD ID" value={sat.noradId} sub={sat.source || "Unknown Source"} accent="#42a5f5" />
          <StatTile label="TLE Age" value={ageDays !== null && ageDays !== undefined ? `${ageDays}d` : "?"} sub={tleAgeLabel(ageDays)} color={tleColor} accent={tleColor} />
          <StatTile label="Altitude" value={sat.altitude} unit="km" sub={`${sat.apogee} apo / ${sat.perigee} peri`} accent="#42a5f5" />
          <StatTile label="Period" value={sat.period?.toFixed(2)} unit="min" sub={`${sat.meanMotion} rev/day`} accent="#42a5f5" />
          <StatTile label="Inclination" value={`${sat.inclination}°`} sub={`${inclLabel} · RAAN ${sat.raan}°`} accent="#42a5f5" />
          <StatTile label="Eccentricity" value={sat.eccentricity} sub={eccLabel} accent="#42a5f5" />
          <StatTile label="Velocity" value={sat.velocity} unit="km/s" sub={`SMA ${sat.semiMajorAxis} km`} accent="#42a5f5" />
          <StatTile label="Eclipse" value={inShadow ? "Shadow" : "Sunlit"} sub={`${illumination}% Illumination`} color={inShadow ? "#FF9500" : "#4ecdc4"} accent={inShadow ? "#FF9500" : "#4ecdc4"} />
          {sat.hasTLE && (<StatTile label="Render State" value={isVisible ? "Visible" : "Culled"} sub="ECI J2000.0" color={isVisible ? "#4ecdc4" : "#FF9500"} accent={isVisible ? "#4ecdc4" : "#FF9500"} />)}
          {advanced.isSunSynchronous && (<StatTile label="Sun-Synchronous" value="Yes" sub={`${advanced.sunSyncInclination}° Expected`} color="#4ecdc4" accent="#4ecdc4" />)}
        </div>

        <div className="satDossierGrid">
          <div className="satPanelCard">
            <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faRulerCombined} /> Keplerian Elements</span></div>
            <div className="satPanelCardBody">
              <div className="satSatelliteHUDSectionGrid">
                <div className="satSatelliteHUDSectionItem"><span>Semi-Major Axis</span><span>{sat.semiMajorAxis} km</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Eccentricity</span><span>{sat.eccentricity}</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Inclination</span><span>{sat.inclination}°</span></div>
                <div className="satSatelliteHUDSectionItem"><span>RAAN (Ω)</span><span>{sat.raan}°</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Arg of Perigee (ω)</span><span>{sat.argOfPerigee}°</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Mean Anomaly (M)</span><span>{sat.meanAnomaly}°</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Mean Motion (n)</span><span>{sat.meanMotion} rev/d</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Apogee Altitude</span><span>{sat.apogee} km</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Perigee Altitude</span><span>{sat.perigee} km</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Apogee/Perigee Ratio</span><span>{sat.apogee && sat.perigee ? (sat.apogee / sat.perigee).toFixed(3) : "—"}</span></div>
              </div>
            </div>
          </div>

          <div className="satPanelCard">
            <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faAtom} /> Derived Orbital Mechanics</span></div>
            <div className="satPanelCardBody">
              <div className="satSatelliteHUDSectionGrid">
                <div className="satSatelliteHUDSectionItem"><span>Average Velocity</span><span>{sat.velocity} km/s</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Specific Energy</span><span>{sat.specificEnergy} km²/s²</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Angular Momentum</span><span>{sat.angularMomentum} km²/s</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Mean Angular Motion</span><span>{sat.meanAngularMotion} rad/s</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Escape Velocity</span><span>{advanced.escapeVelocity} km/s</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Orbit Circumference</span><span>{advanced.orbitCircumference?.toLocaleString()} km</span></div>
                <div className="satSatelliteHUDSectionItem"><span>RAAN Drift Rate (J2)</span><span>{advanced.raanRate}°/day</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Arg.P Drift Rate (J2)</span><span>{advanced.argpRate}°/day</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Nodal Precession Period</span><span>{advanced.nodalPrecessionPeriod ? `${advanced.nodalPrecessionPeriod} days` : "—"}</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Apsidal Precession Period</span><span>{advanced.apsidalPrecessionPeriod ? `${advanced.apsidalPrecessionPeriod} days` : "—"}</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Repeat Ground Track</span><span>{advanced.repeatGroundTrackDays !== null ? `${advanced.repeatGroundTrackDays} Days (${advanced.repeatGroundTrackRevs} Revs)` : "—"}</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Sun-Sync Inclination</span><span>{advanced.sunSyncInclination !== null ? `${advanced.sunSyncInclination}°` : "—"}</span></div>
              </div>
            </div>
          </div>

          <div className="satPanelCard">
            <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faEye} /> Sensor Coverage Geometry</span></div>
            <div className="satPanelCardBody">
              <div className="satSatelliteHUDSectionGrid">
                <div className="satSatelliteHUDSectionItem"><span>Horizon Distance</span><span>{horizonDist} km</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Footprint Radius</span><span>{footprintRadius} km</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Coverage Area</span><span>{coverageArea} M km²</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Earth Surface %</span><span>{earthCoverage}%</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Passes per Day</span><span>{Math.round(1440 / sat.period)}</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Period in Hours</span><span>{(sat.period / 60).toFixed(2)} h</span></div>
              </div>
            </div>
          </div>

          <div className="satPanelCard">
            <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faSatellite} /> Identity & Provenance</span></div>
            <div className="satPanelCardBody">
              <div className="satSatelliteHUDSectionGrid">
                <div className="satSatelliteHUDSectionItem"><span>Name</span><span>{sat.name}</span></div>
                <div className="satSatelliteHUDSectionItem"><span>NORAD ID</span><span>{sat.noradId}</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Category</span><span>{sat.category}</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Group</span><span>{sat.group || "—"}</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Status</span><span style={{ color: sat.status === "Active" ? "#4ecdc4" : "#FF9500" }}>{sat.status}</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Source</span><span>{sat.source || "Unknown"}</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Propagation</span><span style={{ color: sat.hasTLE ? "#4ecdc4" : "#FF9500" }}>{sat.propagationModel || "No TLE"}</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Has TLE</span><span>{sat.hasTLE ? "Yes" : "No"}</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Epoch Year</span><span>{sat.epochYear !== undefined && sat.epochYear !== null ? sat.epochYear : "—"}</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Epoch Day</span><span>{sat.epochDay !== undefined ? sat.epochDay : "—"}</span></div>
                <div className="satSatelliteHUDSectionItem"><span>BSTAR</span><span>{sat.bstar !== undefined ? sat.bstar.toExponential(3) : "—"}</span></div>
              </div>
            </div>
          </div>

          {sat.hasTLE && livePosition && (
            <div className="satPanelCard">
              <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faGauge} /> Live State Vector (ECI)</span></div>
              <div className="satPanelCardBody">
                <div className="satSatelliteHUDSectionGrid">
                  <div className="satSatelliteHUDSectionItem"><span>Rendering</span><span style={{ color: "#4ecdc4" }}>Instanced</span></div>
                  <div className="satSatelliteHUDSectionItem"><span>Position Source</span><span style={{ color: "#4ecdc4" }}>SGP4/SDP4</span></div>
                  <div className="satSatelliteHUDSectionItem"><span>Visibility</span><span style={{ color: isVisible ? "#4ecdc4" : "#FF9500" }}>{isVisible ? "Visible" : "Culled"}</span></div>
                  <div className="satSatelliteHUDSectionItem"><span>Coordinate Frame</span><span>ECI J2000.0</span></div>
                  <div className="satSatelliteHUDSectionItem"><span>Eclipse Status</span><span style={{ color: inShadow ? "#FF9500" : "#4ecdc4" }}>{inShadow ? "In Shadow" : "Sunlit"}</span></div>
                  <div className="satSatelliteHUDSectionItem"><span>Illumination</span><span>{illumination}%</span></div>
                  <div className="satSatelliteHUDSectionItem"><span>X (scene)</span><span>{livePosition.x.toFixed(3)}</span></div>
                  <div className="satSatelliteHUDSectionItem"><span>Y (scene)</span><span>{livePosition.y.toFixed(3)}</span></div>
                  <div className="satSatelliteHUDSectionItem"><span>Z (scene)</span><span>{livePosition.z.toFixed(3)}</span></div>
                  <div className="satSatelliteHUDSectionItem"><span>Geocentric Distance</span><span>{liveDistanceFromEarthCenter ? `${liveDistanceFromEarthCenter.toFixed(0)} km` : "—"}</span></div>
                </div>
              </div>
            </div>
          )}

          <div className="satPanelCard">
            <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faBookOpen} /> Operational Implications</span></div>
            <div className="satPanelCardBody">
              <div className="satBriefingGrid">
                <div className="satBriefingItem"><b>Orbital Regime</b><p>This satellite is in the {sat.category} class at {sat.altitude} km. {advanced.isSunSynchronous ? "It is in a sun-synchronous orbit, which provides a consistent solar illumination angle for imaging." : "Its orbit is standard for this category."}</p></div>
                <div className="satBriefingItem"><b>Drag Sensitivity</b><p>{sat.altitude < 600 ? "Atmospheric drag is significant at this altitude, so the orbit will decay rapidly without station-keeping." : sat.altitude < 1000 ? "Drag is moderate here, so periodic boosts are likely required over multi-year operations." : "Drag is minimal at this altitude, so the orbit is essentially stable."}</p></div>
                <div className="satBriefingItem"><b>Radiation Environment</b><p>{sat.altitude < 1000 ? "The satellite is below the inner Van Allen belt, with standard SAA exposure during equatorial passes." : sat.altitude < 13000 ? "The satellite is inside the inner Van Allen belt, where total ionizing dose accumulates quickly." : sat.altitude < 30000 ? "The satellite is between the belts, with moderate radiation and periodic outer-belt incursions." : "The satellite is in the GEO or HEO environment and is vulnerable to outer-belt electron enhancements."}</p></div>
                <div className="satBriefingItem"><b>Eclipse Profile</b><p>{liveData?.inShadow ? "The satellite is currently in Earth's shadow, so its batteries are discharging and it is under thermal cycling stress." : "The satellite is currently illuminated, so its solar arrays are providing power and sun heating causes thermal expansion."}</p></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const summaryStatus = !loading && satellites.length === 0 ? "SEVERE" : errors.length > 0 ? "ELEVATED" : "NOMINAL";
  const summaryStatusLabel = summaryStatus === "SEVERE" ? "Severe" : summaryStatus === "ELEVATED" ? "Elevated" : "Nominal";

  const renderLayoutControls = () => (
    <div className="satLayoutControls">
      {LAYOUT_TOGGLES.map(([key, label]) => (
        <button
          key={key}
          type="button"
          title={`${layoutVisibility[key] ? "Hide" : "Show"} ${label}`}
          className={`satLayoutToggle ${layoutVisibility[key] ? "satLayoutToggleActive" : ""}`}
          onClick={() => setLayoutVisibility(prev => ({ ...prev, [key]: !prev[key] }))}
        >
          <FontAwesomeIcon icon={layoutVisibility[key] ? faEye : faEyeSlash} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );

  const handleExpandClick = (event) => {
    const root = event.currentTarget;
    if (!(event.target instanceof Element) || event.target.closest(".satExpandedContent, .satFeedsModalOverlay")) return;
    const target = event.target.closest(EXPANDABLE_SELECTOR);
    if (!target || isInteractiveTarget(event.target, root)) return;
    const container = findExpandContainer(target, root);
    setExpandedView({ title: target.textContent.trim() || "Details", html: container.outerHTML });
  };

  return (
    <div className="satPageWrapper satTrackerPage" onClick={handleExpandClick}>
      {layoutVisibility.nav && <Nav activePage="satellitetracker" />}

      {authLoading ? (
        <div className="satGate">
          <div className="loading-wrapper">
            <div className="loading-circle" />
            <label className="loading-title">
              Loading
            </label>
          </div>
        </div>
      ) : (
      <>
      <div className={`satLayoutColumn ${layoutVisibility.nav ? "" : "satLayoutColumnNoNav"}`}>
      {layoutVisibility.header && (
        <header className="satSummaryHeader satWeatherHeader">
          <div className="satSummaryHeaderContent">
            <div className="satSummaryTitleSection">
              <div className="satSummarySubtitle">{activeAreas ? `${activeAreasLabel} | Alerting For All Areas | ${bellItems.length} Alert${bellItems.length === 1 ? "" : "s"}` : `${selectedSatelliteObj ? selectedSatelliteObj.name : "All Satellites"} | ${activeSatellites} of ${satellites.length} Satellites Tracked${observerLocation ? ` | ${locationName}` : ""}`}</div>
            </div>
            <div className="satSummaryHeaderStatus">
              <div className={`satSummaryDecision satSummaryDecision${summaryStatus}`}>
                <FontAwesomeIcon icon={summaryStatus === "NOMINAL" ? faSquareCheck : summaryStatus === "SEVERE" ? faXmarkSquare : faTriangleExclamation} />
                <span>{summaryStatusLabel}</span>
              </div>
              <button
                type="button"
                title={bellItems.length ? "Show Alerts" : "Show Alert Sources"}
                className={`satSummaryAlertBtn ${bellItems.some((item) => item.severity === "CRITICAL") ? "satSummaryAlertBtnCritical" : bellItems.length > 0 ? "satSummaryAlertBtnWarning" : ""}`}
                onClick={() => {
                  if (ackReviewList.length) {
                    openAckReview();
                    return;
                  }
                  setExpandedAlertKey(bellItems[0] ? bellItems[0].key : null);
                  setShowAlertsPanel(true);
                }}
              >
                <FontAwesomeIcon icon={faBell} />
                {bellItems.length > 0 && <span className="satSummaryAlertBadge">{bellItems.length}</span>}
              </button>
              {renderSoundBar()}
            </div>
          </div>
        </header>
      )}
      <div className={`satSatelliteTrackerContainer satellite-theme-${theme}`}>
        {layoutVisibility.sidebar && (
        <div className={`satSatelliteSideBar ${sidebarCollapsed ? "satSatelliteSideBarCollapsed" : ""}`}>
          {loading && (
            <div className="satSatelliteSideBarLoadingContainer">
              <div className="loading-circle" />
            </div>
          )}

          <div className="satSatelliteSideBarHeader">
            <h1>
              {!sidebarCollapsed && <small>Satellite Tracker</small>}
            </h1>

            {!sidebarCollapsed && (
              <>
                <div className="satSatelliteSideBarThemeSelector">
                  <button className={`satSatelliteSelectButton ${theme === "dark" ? "satSatelliteButtonActive" : ""}`} onClick={() => setTheme("dark")}>Dark</button>
                  <button className={`satSatelliteSelectButton ${theme === "neon" ? "satSatelliteButtonActive" : ""}`} onClick={() => setTheme("neon")}>Neon</button>
                </div>

                <div className="satSatelliteSideBarThemeSelector">
                  <div className="satSatelliteSideBarThemeSelectorStatusIndicator">
                    Ready
                    {loadingMetadata && (
                      <div style={{ fontSize: "9px", marginTop: "2px" }}>
                        Quality: {loadingMetadata.dataQuality} | Load: {loadingMetadata.loadTime?.toFixed(0)}ms
                      </div>
                    )}
                  </div>
                </div>

                <div className="satSatelliteSideBarThemeSelector">
                  {displayErrors.length > 0 && (
                    <div
                      className="satSatelliteSideBarThemeSelectorErrorIndicator"
                      onClick={() => setShowErrors(!showErrors)}
                      style={{
                        opacity: showErrors ? 1.0 : "",
                        paddingTop: showErrors ? "" : 0,
                        paddingBottom: showErrors ? "" : 0
                      }}
                    >
                      <div className="satSatelliteSideBarThemeSelectorErrorIndicatorHeader">
                        <span>API Errors ({displayErrors.length})</span>
                        <button onClick={(e) => { e.stopPropagation(); copyAllErrors(); }} aria-label="Copy All Errors">
                          <FontAwesomeIcon icon={copiedErrors ? faSquareCheck : faClone} size="sm" />
                        </button>
                      </div>
                      {showErrors && (
                        <div className="satSatelliteSideBarThemeSelectorErrorIndicatorList">
                          {displayErrors.map((error, index) => (
                            <div key={index} className={`satSatelliteErrorItem ${expandedWarnings[error] ? "satSatelliteErrorItemExpanded" : ""}`} onClick={(event) => { event.stopPropagation(); toggleWarning(error); }}>
                              <FontAwesomeIcon icon={faTriangleExclamation} className="satSatelliteErrorItemIcon" />
                              <div className="satSatelliteErrorItemBody">
                                <span className="satSatelliteErrorItemTitle">{splitWarning(error)[0]}</span>
                                <span className="satSatelliteErrorItemText">{splitWarning(error)[1]}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {!sidebarCollapsed && renderAlertControls()}

          {!sidebarCollapsed && !loading && (
            <>
              <div className="satSatelliteSearchControls">
                <input type="text" placeholder="Search Satellites" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="satSatelliteSearchInput" />
                <div className="satSatelliteSelectControls">
                  <button className="satSatelliteSelectButton" onClick={selectAllSatellites}>All</button>
                  <button className="satSatelliteSelectButton" onClick={deselectAllSatellites}>None</button>
                  <button className="satSatelliteSelectButton" onClick={fetchSatelliteData}>Refresh</button>
                </div>
                <div className="satSatelliteSelectControls">
                  <button className={`satSatelliteSelectButton ${colorByTleAge ? "satSatelliteButtonActive" : ""}`} onClick={() => setColorByTleAge(v => !v)}>
                    {colorByTleAge ? "Color: TLE Age" : "Color: Category"}
                  </button>
                </div>
              </div>

              <div className="satSatelliteTLEQualityBar">
                <div className="satTLEQualityCount" style={{ color: "#4ecdc4" }} title="Fresh (<1d)"><b>{tleQualityStats.fresh}</b><span>Fresh</span></div>
                <div className="satTLEQualityCount" style={{ color: "#7fe9e1" }} title="Recent (1-3d)"><b>{tleQualityStats.recent}</b><span>Recent</span></div>
                <div className="satTLEQualityCount" style={{ color: "#ffd93d" }} title="Aging (3-7d)"><b>{tleQualityStats.aging}</b><span>Aging</span></div>
                <div className="satTLEQualityCount" style={{ color: "#FF9500" }} title="Stale (1-2w)"><b>{tleQualityStats.stale}</b><span>Stale</span></div>
                <div className="satTLEQualityCount" style={{ color: "#ff6b6b" }} title="Very Stale (>2w)"><b>{tleQualityStats.veryStale}</b><span>Old</span></div>
              </div>

              <div className="satSatelliteObjectsHeader">
                <span className="satSatelliteObjectsHeaderIcon"><FontAwesomeIcon icon={faSatellite} /></span>
                <span>Satellites ({satellites.filter(s => s.active).length}/{satellites.length})</span>
              </div>

              <div
                ref={virtualScrollRef}
                className="satSatelliteList satellite-list"
                style={{ flex: 1, overflowY: "auto", position: "relative" }}
                onScroll={handleVirtualScroll}
              >
                <div style={{ height: filteredSatellites.length * PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT, position: "relative" }}>
                  <div style={{ position: "absolute", top: startIndex * PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT, width: "100%" }}>
                    {visibleItems.map((satellite) => (
                      <div
                        key={satellite.id}
                        className={`satSatelliteListItem satellite-item ${satellite.active ? "satSatelliteButtonActive" : ""} ${selectedSatellite === satellite.id ? "satellite-selected" : ""}`}
                        style={{ height: PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT, minHeight: PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT }}
                        onClick={() => {
                          if (!satellite.active) { toggleSatellite(satellite.id); }
                          setSelectedSatellite(satellite.id);
                          zoomToSatellite(satellite.id);
                        }}
                      >
                        <div className="satSatelliteIndicator" style={{ backgroundColor: satellite.color }} />
                        <div className="satSatelliteTleBadge" style={{ backgroundColor: tleAgeColor(satellite.tleAgeDays) }} title={`TLE: ${tleAgeLabel(satellite.tleAgeDays)}`} />
                        <div className="satSatelliteName satellite-name">{satellite.name}</div>
                        <label className="consoleSwitch">
                          <input type="checkbox" checked={satellite.active} onChange={() => { toggleSatellite(satellite.id); }} />
                          <span className="consoleSlider round"></span>
                        </label>
                        <button className="satSatelliteInfoButton" onClick={(e) => { e.stopPropagation(); openDossier(satellite); }} aria-label="Show Dossier">
                          <FontAwesomeIcon icon={faInfoCircle} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        )}

        <div className="satSatelliteMainView">
          <div className="satTopBars">
          <div className="satSatelliteViewHeader">
            <div className="satSatellitePlaybackControls">
              <button className="satSatellitePlaybackControlsButton" onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"}>
                <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
              </button>

              {SPEED_OPTIONS.map(option => (
                <button key={option.label} className={`satSatellitePlaybackControlsSpeedButton ${speedMultiplier === option.value ? "satSatelliteButtonActive" : ""}`} onClick={() => changeSpeed(option.value)} aria-label={option.label}>
                  {option.label}
                </button>
              ))}

              <Dropdown
                value={`${targetFps} FPS`}
                onChange={(option) => setTargetFps(parseInt(option, 10))}
                options={FPS_OPTIONS.map((fps) => `${fps} FPS`)}
                placeholder="Target FPS"
              />

              <button className={`satSatellitePlaybackControlsButton ${viewMode === "3d" ? "satSatelliteButtonActive" : ""}`} onClick={() => setViewMode("3d")}><FontAwesomeIcon icon={faGlobe} /> 3D</button>
              <button className={`satSatellitePlaybackControlsButton ${viewMode === "map" ? "satSatelliteButtonActive" : ""}`} onClick={() => setViewMode("map")}><FontAwesomeIcon icon={faGlobeAmericas} /> Map</button>
              {viewMode === "map" && <button className={`satSatellitePlaybackControlsButton ${mapGlobe ? "satSatelliteButtonActive" : ""}`} onClick={() => setMapGlobe((value) => !value)} title={mapGlobe ? "Switch To Flat Map" : "Switch To Globe"}><FontAwesomeIcon icon={faGlobe} /> Globe</button>}
              <button className={`satSatellitePlaybackControlsButton ${viewMode === "2d" ? "satSatelliteButtonActive" : ""}`} onClick={() => setViewMode("2d")} disabled={!selectedSatellite} title={!selectedSatellite ? "Select a satellite for ground track." : ""}><FontAwesomeIcon icon={faMapLocation} /> 2D Track</button>

              <button className={`satSatellitePlaybackControlsButton ${hudVisible ? "satSatelliteButtonActive" : ""}`} onClick={toggleHUD} aria-label="Toggle HUD"><FontAwesomeIcon icon={faChartLine} /> HUD</button>
              <button className={`satSatellitePlaybackControlsButton ${showConjunctionPanel ? "satSatelliteButtonActive" : ""}`} onClick={toggleConjunctionPanel}><FontAwesomeIcon icon={faTriangleExclamation} /> Conjunctions ({conjunctions.length})</button>
              <button className={`satSatellitePlaybackControlsButton ${showConstellationPanel ? "satSatelliteButtonActive" : ""}`} onClick={toggleConstellationPanel}><FontAwesomeIcon icon={faCircleNodes} /> Constellation Health</button>
              <button className={`satSatellitePlaybackControlsButton ${showDecayPanel ? "satSatelliteButtonActive" : ""}`} onClick={toggleDecayPanel}><FontAwesomeIcon icon={faFire} /> Decay Watch</button>

              <button className="satSatellitePlaybackControlsButton" onClick={exportJSON}>JSON</button>
              <button className="satSatellitePlaybackControlsButton" onClick={exportCSV}>CSV</button>
              <button className="satSatellitePlaybackControlsButton" onClick={exportText}>TXT</button>
            </div>
            {renderLayoutControls()}
          </div>
          <SpaceWeatherStrip data={spaceWeather} loading={spaceWeatherLoading} expanded={spaceWeatherExpanded} onToggle={toggleSpaceWeatherExpanded} />
          </div>

          {spaceWeatherExpanded && (
            <PanelModal onClose={() => setSpaceWeatherExpanded(false)}>
              <SpaceWeatherDetail data={spaceWeather} onClose={() => setSpaceWeatherExpanded(false)} onRequestAIAnalysis={() => fetchSpaceWeatherAI(true)} aiAnalysis={spaceWeatherAI} aiLoading={spaceWeatherAILoading} />
            </PanelModal>
          )}

          {showConjunctionPanel && (
            <PanelModal onClose={() => setShowConjunctionPanel(false)}>
              <ConjunctionsPanel conjunctions={conjunctions} onSelect={openDossier} onClose={() => setShowConjunctionPanel(false)} satellites={satellites} />
            </PanelModal>
          )}

          {showConstellationPanel && (
            <PanelModal onClose={() => setShowConstellationPanel(false)}>
              <ConstellationHealthPanel data={constellationHealth} loading={constellationLoading} onRefresh={fetchConstellationHealth} onClose={() => setShowConstellationPanel(false)} onSelect={openDossier} />
            </PanelModal>
          )}

          {showDecayPanel && (
            <PanelModal onClose={() => setShowDecayPanel(false)}>
              <DecayWatchPanel candidates={decayCandidates} loading={decayLoading} onRefresh={fetchDecayWatch} onClose={() => setShowDecayPanel(false)} onSelect={openDossier} methodology={decayMethodology} />
            </PanelModal>
          )}

          <div className="satMainContent">
            <div className="satCanvasArea">
              <div ref={mountRef} className="satSatelliteCanvasContainer" style={{ display: viewMode === "3d" ? "block" : "none" }} />

              {viewMode === "map" && (
                <EarthMapView collect={collectEarthMapPoints} selectedId={selectedSatellite} onSelect={setSelectedSatellite} globe={mapGlobe} />
              )}

              {viewMode === "2d" && selectedSatelliteObj && (
                <GroundTrackView satellite={selectedSatelliteObj} satrec={selectedSatrec} currentDate={new Date(simulationDateMsRef.current)} />
              )}
            </div>

            <div className="satRightRail">
              <div className="satRightRailSection">
                <button className="satRightRailSectionHeader" onClick={() => setControlsCollapsed(c => !c)}>
                  <span>3D Controls</span>
                  <FontAwesomeIcon icon={controlsCollapsed ? faSquarePlus : faSquareMinus} />
                </button>
                {!controlsCollapsed && (
                  <div className="satRightRailSectionBody">
                    <div className="satRailControlGrid">
                      <button className="satSatelliteControlButton" onClick={resetCamera}>Reset Camera</button>
                      <button className="satSatelliteControlButton" onClick={toggleOrbits}>{showOrbits ? "Hide" : "Show"} Orbits</button>
                      <button className="satSatelliteControlButton" onClick={toggleTrails}>{showTrails ? "Hide" : "Show"} Trails</button>
                      <button className="satSatelliteControlButton" onClick={toggleLabels}>{showLabels ? "Hide" : "Show"} Labels</button>
                      <button className="satSatelliteControlButton" onClick={toggleBloom}>{bloomEnabled ? "Disable" : "Enable"} Bloom</button>
                      <button className="satSatelliteControlButton" onClick={toggleAxisMarkers}>{showAxisMarkers ? "Hide" : "Show"} Axes</button>
                      <button className="satSatelliteControlButton" onClick={toggleEquatorialGrid}>{showEquatorialGrid ? "Hide" : "Show"} Grid</button>
                      <button className="satSatelliteControlButton" onClick={toggleAltitudeBands}>{showAltitudeBands ? "Hide" : "Show"} Alt Bands</button>
                      <button className="satSatelliteControlButton" onClick={toggleDistanceRings}>{showDistanceRings ? "Hide" : "Show"} Dist Rings</button>
                      <button className="satSatelliteControlButton" onClick={toggleEarth}>{showEarth ? "Hide" : "Show"} Earth</button>
                    </div>
                    <div className="satSatelliteBloomControls">
                      <div className="satSatelliteBloomSlider">
                        <span>Conj km</span>
                        <input type="range" min="5" max="200" step="5" value={conjunctionThreshold} onChange={(e) => setConjunctionThreshold(parseInt(e.target.value))} />
                        <span>{conjunctionThreshold}</span>
                      </div>
                    </div>
                    {bloomEnabled && (
                      <div className="satSatelliteBloomControls">
                        <div className="satSatelliteBloomSlider">
                          <span>Strength</span>
                          <input type="range" min="0" max="5" step="0.1" value={bloomStrength} onChange={(e) => setBloomStrength(parseFloat(e.target.value))} />
                          <span>{bloomStrength.toFixed(1)}</span>
                        </div>
                        <div className="satSatelliteBloomSlider">
                          <span>Radius</span>
                          <input type="range" min="0" max="2" step="0.05" value={bloomRadius} onChange={(e) => setBloomRadius(parseFloat(e.target.value))} />
                          <span>{bloomRadius.toFixed(2)}</span>
                        </div>
                        <div className="satSatelliteBloomSlider">
                          <span>Threshold</span>
                          <input type="range" min="0" max="2" step="0.05" value={bloomThreshold} onChange={(e) => setBloomThreshold(parseFloat(e.target.value))} />
                          <span>{bloomThreshold.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="satRightRailSection">
                <button className="satRightRailSectionHeader" onClick={() => setLegendCollapsed(c => !c)}>
                  <span>Category Legend</span>
                  <FontAwesomeIcon icon={legendCollapsed ? faSquarePlus : faSquareMinus} />
                </button>
                {!legendCollapsed && (
                  <div className="satRightRailSectionBody">
                    <div className="satRailLegendList">
                      {Object.entries(CATEGORY_COLORS).map(([category, color]) => (
                        <div key={category} className="satSatelliteLegendItem">
                          <div className="satSatelliteLegendColor" style={{ backgroundColor: color }} />
                          <span>{category}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="satRightRailSection">
                <button className="satRightRailSectionHeader">
                  <span>Harvester</span>
                </button>
                <div className="satRightRailSectionBody">
                  <div className="satSatelliteHUDSectionGrid">
                    <div className="satSatelliteHUDSectionItem"><span>Status</span><span style={{ color: SOURCES.harvest.statusColors[harvestStatusLabel] || "#ff6b6b" }}>{harvestStatusLabel}</span></div>
                    <div className="satSatelliteHUDSectionItem"><span>Objects</span><span>{harvestObjects.toLocaleString()}</span></div>
                    <div className="satSatelliteHUDSectionItem"><span>Element Sets</span><span>{harvestStats.frames.toLocaleString()}</span></div>
                    <div className="satSatelliteHUDSectionItem"><span>Storage</span><span>{harvestHealth?.storage ? `${formatBytes(harvestHealth.storage.usedBytes)} / ${formatBytes(harvestHealth.storage.budgetBytes)}` : "—"}</span></div>
                    <div className="satSatelliteHUDSectionItem"><span>Jobs Due</span><span>{harvestStats.due}</span></div>
                    <div className="satSatelliteHUDSectionItem"><span>Jobs Running</span><span>{harvestStats.running}</span></div>
                    <div className="satSatelliteHUDSectionItem"><span>Sources</span><span>{harvestStats.sources}</span></div>
                    <div className="satSatelliteHUDSectionItem"><span>Failing</span><span style={{ color: harvestStats.failing ? "#ff6b6b" : undefined }}>{harvestStats.failing}</span></div>
                    <div className="satSatelliteHUDSectionItem"><span>New Leads</span><span style={{ color: harvestHealth?.leads?.new_leads ? "#ffd93d" : undefined }}>{harvestHealth?.leads ? harvestHealth.leads.new_leads : "—"}</span></div>
                    <div className="satSatelliteHUDSectionItem"><span>Throttle</span><span style={{ color: harvestHealth?.engine?.throttle === "Normal" ? "#4ecdc4" : harvestHealth?.engine?.throttle ? "#FF9500" : undefined }}>{harvestHealth?.engine?.throttle ? `${harvestHealth.engine.throttle} (${harvestHealth.engine.lagMs} ms)` : "—"}</span></div>
                    <div className="satSatelliteHUDSectionItem"><span>Last Tick</span><span>{harvestHealth?.engine?.lastTickAt ? formatRelativeTime(harvestHealth.engine.lastTickAt) : "—"}</span></div>
                  </div>
                  <button className="satPassComputeButton satHarvestLeadsButton" onClick={() => setShowLeads(true)}>
                    <FontAwesomeIcon icon={faLightbulb} /><span className="satHarvestLeadsLabel">Source Leads{harvestHealth?.leads?.new_leads ? ` (${harvestHealth.leads.new_leads} New)` : ""}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {showLeads && <LeadsModal onClose={() => setShowLeads(false)} onChanged={loadHarvestHealth} />}

          {hudVisible && (
            <PanelModal onClose={toggleHUD}>
              <div ref={hudPanelRef} className="satSatelliteHUDPanel" tabIndex={0}>
                <div className="satSatelliteHUDPanelHeader">
                  <span>Performance HUD & System Telemetry</span>
                  <button className="satSatelliteCloseButton" onClick={toggleHUD}><FontAwesomeIcon icon={faXmark} /></button>
                </div>
                <div className="satSatelliteHUDContent">
                  <div className="satStatTileGrid">
                    <StatTile label="FPS" value={actualFps} sub={`Target ${targetFps}`} color={actualFps >= targetFps * 0.9 ? "#4ecdc4" : actualFps >= targetFps * 0.6 ? "#ffd93d" : "#ff6b6b"} accent={actualFps >= targetFps * 0.9 ? "#4ecdc4" : "#FF9500"} large />
                    <StatTile label="Render Time" value={performanceStats.renderTime} unit="ms" accent="#42a5f5" />
                    <StatTile label="Draw Calls" value={performanceStats.drawCalls} accent="#42a5f5" />
                    <StatTile label="Triangles" value={performanceStats.triangles.toLocaleString()} accent="#42a5f5" />
                    <StatTile label="Lines" value={performanceStats.lines.toLocaleString()} accent="#42a5f5" />
                    <StatTile label="Visible Sats" value={performanceStats.visibleSatellites} color="#4ecdc4" accent="#4ecdc4" />
                    <StatTile label="Culled" value={performanceStats.culledSatellites} color="#FF9500" accent="#FF9500" />
                    <StatTile label="Active / Total" value={`${activeSatellites} / ${satellites.length}`} accent="#42a5f5" />
                    <StatTile label="Conjunctions" value={conjunctions.length} color={conjunctions.length > 0 ? "#FF9500" : "#4ecdc4"} accent={conjunctions.length > 0 ? "#FF9500" : "#4ecdc4"} />
                    <StatTile label="Sim Speed" value={speedLabel} accent="#42a5f5" />
                    <StatTile label="Memory" value={performanceStats.memoryUsage} unit="objects" accent="#42a5f5" />
                    <StatTile label="Geometries" value={performanceStats.geometries} accent="#42a5f5" />
                    <StatTile label="Textures" value={performanceStats.textures} accent="#42a5f5" />
                    <StatTile label="Sunlit" value={eclipseStats.sunlit} color="#4ecdc4" accent="#4ecdc4" />
                    <StatTile label="In Shadow" value={eclipseStats.inShadow} color="#FF9500" accent="#FF9500" />
                  </div>

                  <div className="satDossierGrid">
                    <div className="satPanelCard">
                      <div className="satPanelCardHeader"><span>Coordinate System & Reference Frame</span></div>
                      <div className="satPanelCardBody">
                        <div className="satSatelliteHUDSectionGrid">
                          <div className="satSatelliteHUDSectionItem"><span>Reference Frame</span><span>ECI J2000.0</span></div>
                          <div className="satSatelliteHUDSectionItem"><span>Origin</span><span>Earth Center</span></div>
                          <div className="satSatelliteHUDSectionItem"><span>X-Axis</span><span>Vernal Equinox</span></div>
                          <div className="satSatelliteHUDSectionItem"><span>Y-Axis</span><span>90E Longitude</span></div>
                          <div className="satSatelliteHUDSectionItem"><span>Z-Axis</span><span>North Pole</span></div>
                          <div className="satSatelliteHUDSectionItem"><span>Units</span><span>km (scaled)</span></div>
                          <div className="satSatelliteHUDSectionItem"><span>Scale Factor</span><span>{ORBITAL_CONSTANTS.SCALE_FACTOR}</span></div>
                          <div className="satSatelliteHUDSectionItem"><span>Earth Radius</span><span>{EARTH_RADIUS_KM} km</span></div>
                          <div className="satSatelliteHUDSectionItem"><span>μ (Earth GM)</span><span>{EARTH_GM} km³/s²</span></div>
                        </div>
                      </div>
                    </div>

                    <div className="satPanelCard">
                      <div className="satPanelCardHeader"><span>Orbital Propagation Status</span></div>
                      <div className="satPanelCardBody">
                        <div className="satSatelliteHUDSectionGrid">
                          <div className="satSatelliteHUDSectionItem"><span>SGP4 Satellites</span><span style={{ color: "#4ecdc4" }}>{sgp4Count}</span></div>
                          <div className="satSatelliteHUDSectionItem"><span>SDP4 Deep Space</span><span style={{ color: "#FF9500" }}>{sdp4Count}</span></div>
                          <div className="satSatelliteHUDSectionItem"><span>TLE Errors</span><span style={{ color: errors.length > 0 ? "#ff6b6b" : "#4ecdc4" }}>{errors.length}</span></div>
                          <div className="satSatelliteHUDSectionItem"><span>Earth Rotation</span><span style={{ color: earthRotationData ? "#4ecdc4" : "#ff6b6b" }}>{earthRotationData ? "IERS" : "Failed"}</span></div>
                          <div className="satSatelliteHUDSectionItem"><span>Simulation Time</span><span>{currentTime}</span></div>
                          <div className="satSatelliteHUDSectionItem"><span>Update Frequency</span><span>1/{PERFORMANCE_CONSTANTS.UPDATE_FREQUENCY} Frame</span></div>
                          <div className="satSatelliteHUDSectionItem"><span>Frustum Margin</span><span>{PERFORMANCE_CONSTANTS.FRUSTUM_MARGIN}x</span></div>
                          <div className="satSatelliteHUDSectionItem"><span>Trail Length</span><span>{PERFORMANCE_CONSTANTS.TRAIL_LENGTH} Samples</span></div>
                        </div>
                      </div>
                    </div>

                    <div className="satPanelCard">
                      <div className="satPanelCardHeader"><span>TLE Quality Distribution</span></div>
                      <div className="satPanelCardBody">
                        <div className="satSatelliteHUDSectionGrid">
                          <div className="satSatelliteHUDSectionItem"><span>Fresh (&lt;1d)</span><span style={{ color: "#4ecdc4" }}>{tleQualityStats.fresh}</span></div>
                          <div className="satSatelliteHUDSectionItem"><span>Recent (1-3d)</span><span style={{ color: "#7fe9e1" }}>{tleQualityStats.recent}</span></div>
                          <div className="satSatelliteHUDSectionItem"><span>Aging (3-7d)</span><span style={{ color: "#ffd93d" }}>{tleQualityStats.aging}</span></div>
                          <div className="satSatelliteHUDSectionItem"><span>Stale (1-2w)</span><span style={{ color: "#FF9500" }}>{tleQualityStats.stale}</span></div>
                          <div className="satSatelliteHUDSectionItem"><span>Very Stale (&gt;2w)</span><span style={{ color: "#ff6b6b" }}>{tleQualityStats.veryStale}</span></div>
                          <div className="satSatelliteHUDSectionItem"><span>Unknown</span><span>{tleQualityStats.unknown}</span></div>
                        </div>
                      </div>
                    </div>

                    <div className="satPanelCard">
                      <div className="satPanelCardHeader"><span>Fleet Statistics by Category</span></div>
                      <div className="satPanelCardBody">
                        <div className="satSatelliteHUDSectionGrid">
                          {Object.entries(CATEGORY_COLORS).map(([cat, col]) => (
                            <div key={cat} className="satSatelliteHUDSectionItem">
                              <span>{cat}</span>
                              <span style={{ color: col }}>{categoryCounts[cat] || 0}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {spaceWeather && spaceWeather.kpIndex && (
                      <div className="satPanelCard">
                        <div className="satPanelCardHeader"><span>Space Weather Snapshot</span></div>
                        <div className="satPanelCardBody">
                          <div className="satSatelliteHUDSectionGrid">
                            <div className="satSatelliteHUDSectionItem"><span>Kp Index</span><span style={{ color: spaceWeather.kpIndex.classification.color }}>{spaceWeather.kpIndex.current} ({spaceWeather.kpIndex.classification.level})</span></div>
                            <div className="satSatelliteHUDSectionItem"><span>F10.7 Flux</span><span>{spaceWeather.f107?.current || "N/A"} sfu</span></div>
                            <div className="satSatelliteHUDSectionItem"><span>Solar Wind</span><span>{spaceWeather.solarWind?.speed || "N/A"} km/s</span></div>
                            <div className="satSatelliteHUDSectionItem"><span>X-Ray Class</span><span>{spaceWeather.xray?.classification || "N/A"}</span></div>
                            <div className="satSatelliteHUDSectionItem"><span>Active Alerts</span><span style={{ color: spaceWeather.alerts?.length > 0 ? "#FF9500" : "#4ecdc4" }}>{spaceWeather.alerts?.length || 0}</span></div>
                            <div className="satSatelliteHUDSectionItem"><span>Status</span><span style={{ color: spaceWeather.overall.color }}>{spaceWeather.overall.status}</span></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </PanelModal>
          )}

          {detailedSatellite && enrichedDetailedSatellite && (
            <PanelModal onClose={() => setDetailedSatellite(null)}>
              <div ref={detailedPanelRef} className="satSatelliteDetailedPanel" tabIndex={0}>
                <div className="satSatelliteHUDPanelHeader">
                  <span>
                    Satellite Details: {enrichedDetailedSatellite.name}
                    <small style={{ marginLeft: "12px", color: tleAgeColor(enrichedDetailedSatellite.tleAgeDays) }}>
                      TLE: {tleAgeLabel(enrichedDetailedSatellite.tleAgeDays)}
                    </small>
                  </span>
                  <button className="satSatelliteCloseButton" onClick={() => setDetailedSatellite(null)}><FontAwesomeIcon icon={faXmark} /></button>
                </div>

                <div className="satDossierTabs">
                  <div className="satDossierTabsScroll">
                    {[
                      { key: "orbital", label: "Orbital", icon: faSatellite },
                      { key: "intel", label: "AI Brief", icon: faBrain },
                      { key: "observations", label: "Observations", icon: faEye },
                      { key: "passes", label: "Pass Predictions", icon: faTowerBroadcast },
                      { key: "tle", label: "TLE History", icon: faClock },
                      { key: "track", label: "Ground Track", icon: faMapLocation }
                    ].map(tab => (
                      <button
                        key={tab.key}
                        className={`satDossierTab ${activeDossierTab === tab.key ? "satDossierTabActive" : ""}`}
                        onClick={() => {
                          setActiveDossierTab(tab.key);
                          if (tab.key === "intel" && !missionIntelMap.has(enrichedDetailedSatellite.noradId)) {
                            fetchMissionIntelligenceFor(enrichedDetailedSatellite);
                          }
                          if (tab.key === "observations" && !observationMap.has(enrichedDetailedSatellite.noradId)) {
                            fetchObservationDataFor(enrichedDetailedSatellite);
                          }
                        }}
                      >
                        <FontAwesomeIcon icon={tab.icon} /> {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="satSatelliteHUDContent satDossierBody">
                  {activeDossierTab === "orbital" && renderOrbitalDossierContent()}

                  {activeDossierTab === "intel" && (
                    <MissionIntelligenceTab satellite={enrichedDetailedSatellite} intelligence={currentMissionIntel} loading={missionIntelLoading && !currentMissionIntel} onRefresh={() => fetchMissionIntelligenceFor(enrichedDetailedSatellite, true)} />
                  )}

                  {activeDossierTab === "observations" && (
                    <ObservationsTab satellite={enrichedDetailedSatellite} observation={currentObservation} loading={observationLoading && !currentObservation} onRefresh={() => fetchObservationDataFor(enrichedDetailedSatellite, true)} />
                  )}

                  {activeDossierTab === "passes" && (
                    <PassPredictionsTab satellite={enrichedDetailedSatellite} satrec={detailedSatrec} observerLocation={observerLocation} onLocationChange={setObserverLocation} onPickLocation={() => setShowLocationPicker(true)} />
                  )}

                  {activeDossierTab === "tle" && (
                    <TleHistoryTab satellite={enrichedDetailedSatellite} />
                  )}

                  {activeDossierTab === "track" && (
                    <div className="satDossierTabContent">
                      <div className="satPanelCard">
                        <div className="satPanelCardHeader"><span>Ground Track (Equirectangular)</span></div>
                        <div className="satPanelCardBody satGroundTrackTabBody">
                          <GroundTrackView satellite={enrichedDetailedSatellite} satrec={detailedSatrec} currentDate={new Date(simulationDateMsRef.current)} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </PanelModal>
          )}
        </div>
      </div>
      {layoutVisibility.footer && (
        <footer className="satSummaryFooter">
          <div className="satSummaryFooterContent">
            <span>Last Updated: {lastDataUpdate ? lastDataUpdate.toLocaleTimeString() : "—"}</span>
            <span>Satellites: {satellites.length}</span>
            <span>Tracked: {activeSatellites}</span>
            <span>Fresh TLE: {tleQualityStats.fresh + tleQualityStats.recent}</span>
            <span>Stale TLE: {tleQualityStats.stale + tleQualityStats.veryStale}</span>
            <span>Conjunctions: {conjunctions.length}</span>
            <span>Errors: {errors.length}</span>
            <span>Status: {summaryStatusLabel}</span>
          </div>
        </footer>
      )}
      </div>
      <ExpandModal view={expandedView} onClose={() => setExpandedView(null)} />
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
      {renderAlertsPanel()}
      {renderAckModal()}
      <AreaModal open={areaModalOpen} onClose={() => setAreaModalOpen(false)} title={editingAreaId ? "Edit Monitored Area" : "Add Monitored Area"}>
        <p className="satWeatherModalIntro">
          Monitored areas are checked against every reentry prediction, and a reentry predicted within its proximity radius of an area raises a critical alert for that area. Choosing Alert For All Areas points the alert bell, the counts, and the alert sounds at all of them at once, while space weather and collision alerts apply everywhere. Choose a point with a radius (a circle around an address or coordinates) or a bounding box (a rectangle).
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
                  bias={observerLocation ? { latitude: observerLocation.lat, longitude: observerLocation.lon } : null}
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
            <button type="button" className="satWeatherModalBtnSecondary" onClick={useSelectedLocationForArea} disabled={!observerLocation}><FontAwesomeIcon icon={faLocationCrosshairs} /> Use Selected Location</button>
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
      {showLocationPicker && createPortal(
        <div className="satTrackerPickerHost">
          <LocationPickerModal
            initialLat={observerLocation ? observerLocation.lat : SOURCES.defaultLocation.lat}
            initialLon={observerLocation ? observerLocation.lon : SOURCES.defaultLocation.lon}
            initialLabel={observerLocation && observerLocation.label !== CUSTOM_LOCATION_LABEL ? observerLocation.label : null}
            onCancel={() => setShowLocationPicker(false)}
            onConfirm={(choice) => {
              setLocation(choice.lat, choice.lon, choice.label || CUSTOM_LOCATION_LABEL);
              setShowLocationPicker(false);
            }}
          />
        </div>,
        document.body
      )}
      </>
      )}
    </div>
  );
};

export default SatelliteTracker;