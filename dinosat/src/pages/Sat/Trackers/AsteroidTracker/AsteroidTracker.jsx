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
  faMeteor, faLightbulb, faBan, faCheck, faDownload,
  faSquareCaretUp, faSquareCaretDown, faSquarePlus, faSquareMinus, faEyeSlash, faBell, faVolumeHigh, faVolumeXmark,
  faBellSlash, faRepeat, faMapPin, faPlus, faEdit, faTrash, faSave, faTimes, faExclamationCircle, faCheckDouble,
  faForwardStep, faBackwardStep, faLocationCrosshairs, faLocationDot, faMapMarkerAlt, faSearchPlus, faGlobeAmericas
} from "@fortawesome/free-solid-svg-icons";
import Nav from "../../../../helpers/Nav.jsx";
import Dropdown from "../../../../helpers/Dropdown.jsx";
import useAuth from "../../../../UseAuth.jsx";
import { openDB } from "idb";
import "../../../../styles/helperStyles/Switch.css";
import "../../../../styles/mainStyles/Sat/Trackers/WeatherTracker/WeatherTracker.css";
import "../../../../styles/mainStyles/Sat/Trackers/SatelliteTracker/SatelliteTracker.css";
import "../../../../styles/helperStyles/LoadingSpinner.css";
import "../../../../styles/helperStyles/Disconnected.css";

const AU_KM = 149597870.7;
const SUN_GM = 1.32712440018e11;
const EARTH_ORBIT_AU = 1.0;
const SCENE_SUN_RADIUS = 4.0;

const ORBITAL_CONSTANTS = {
  JULIAN_DATE_J2000: 2451545.0,
  DEG_TO_RAD: Math.PI / 180.0,
  SCALE_FACTOR: 12.0
};

const PERFORMANCE_CONSTANTS = {
  MAX_VISIBLE_ASTEROIDS: 8000,
  UPDATE_FREQUENCY: 2,
  FRUSTUM_MARGIN: 1.5,
  PRESELECT_COUNT: 100,
  VIRTUAL_SCROLL_ITEM_HEIGHT: 44,
  VIRTUAL_SCROLL_BUFFER: 10,
  TRAIL_LENGTH: 30,
  CLOSE_APPROACH_THRESHOLD_AU: 0.05,
  CLOSE_APPROACH_CHECK_INTERVAL_MS: 5000,
  STREAM_CONNECTION_TIMEOUT_MS: 30000,
  SEARCH_DEBOUNCE_MS: 200
};

const CATEGORY_COLORS = {
  "Atira": "#FF4081",
  "Aten": "#FF6B6B",
  "Apollo": "#FF9500",
  "Amor": "#FFE66D",
  "Main Belt Inner": "#4ECDC4",
  "Main Belt Middle": "#42A5F5",
  "Main Belt Outer": "#00BCD4",
  "Hilda": "#AB47BC",
  "Jupiter Trojan": "#A8E6CF",
  "Centaur": "#FFA726",
  "TNO": "#9C27B0",
  "KBO": "#E91E63",
  "Comet": "#00D4FF",
  "Unclassified": "#808080"
};

const SPECTRAL_COLORS = {
  "C": "#5a5a6a",
  "S": "#FF9500",
  "M": "#9a9a9a",
  "V": "#e04040",
  "B": "#5060c0",
  "D": "#704020",
  "P": "#605040",
  "X": "#a08060",
  "Q": "#d06030",
  "T": "#807060",
  "K": "#a06040",
  "L": "#a08040",
  "A": "#e06030",
  "R": "#d04030",
  "O": "#306080",
  "Unknown": "#808080"
};

const SPEED_OPTIONS = [
  { label: "-100 Days/sec", value: -8640000 },
  { label: "-30 Days/sec", value: -2592000 },
  { label: "-1 Day/sec", value: -86400 },
  { label: "Real-Time", value: 1 },
  { label: "1 Day/sec", value: 86400 },
  { label: "30 Days/sec", value: 2592000 },
  { label: "100 Days/sec", value: 8640000 }
];

const FPS_OPTIONS = [30, 60, 120, 144];

const SOURCES = {
  apiBase: import.meta.env.VITE_API_BASE_URL,
  endpoints: {
    asteroidAlerts: "/asteroid-alerts",
    alertAnalysis: "/asteroid-alerts/analysis",
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
    refreshMs: 1000
  },
  geocoding: {
    photon: "https://photon.komoot.io/api/",
    nominatim: "https://nominatim.openstreetmap.org/search",
    userAgent: "AsteroidTracker/1.0",
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
    dbName: "AsteroidTrackerStateDB",
    storeName: "state",
    recordId: "state",
    restoreFlag: "asteroidTrackerRestoreInFlight",
    restoreSettleMs: 3000,
    saveDebounceMs: 500
  },
  sounds: {
    defaults: { enabled: false, minLevel: "warning", scope: "view", volume: 0.6, mode: "single", snoozeUntil: 0 },
    repeatGapSeconds: 0.8,
    scheduleAheadSeconds: 120,
    topUpSeconds: 20
  },
  harvest: {
    base: `${import.meta.env.VITE_API_BASE_URL}/harvest`,
    domain: "asteroid-tracker",
    productPrefix: "sbdb-",
    healthRefreshMs: 60 * 1000,
    historyRanges: [["1y", "1Y", 365 * 86400], ["5y", "5Y", 5 * 365 * 86400], ["10y", "10Y", 10 * 365 * 86400], ["30y", "30Y", 30 * 365 * 86400]],
    historyPoints: 500,
    exportOptions: [["Element History CSV", "csv"], ["Element History JSON", "json"]],
    jobPattern: /^(asteroids|cneos):/,
    statusColors: { Healthy: "#4ecdc4", Degraded: "#FF9500", Idle: "#919baf", "Needs Schema": "#ff6b6b", Loading: "#919baf" }
  }
};

const apiUrl = (key) => `${SOURCES.apiBase}${SOURCES.endpoints[key]}`;

const dateToJulianDate = (date) => {
  return date.getTime() / 86400000.0 + 2440587.5;
};

const formatChartTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
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

const safeRenderText = (value) => {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value.map(v => {
      if (v === null || v === undefined) return "";
      if (typeof v === "string") return v;
      if (typeof v === "number" || typeof v === "boolean") return String(v);
      if (typeof v === "object") {
        const candidate = v.text || v.description || v.value || v.label || v.name || v.event;
        if (typeof candidate === "string") return candidate;
        const stringEntries = Object.entries(v).filter(([, val]) => typeof val === "string" || typeof val === "number");
        if (stringEntries.length > 0) {
          return stringEntries.map(([k, val]) => `${k}: ${val}`).join(", ");
        }
        return "";
      }
      return String(v);
    }).filter(s => s && s.length > 0).join(". ");
  }
  if (typeof value === "object") {
    const candidate = value.text || value.description || value.value || value.label || value.name || value.event;
    if (typeof candidate === "string") return candidate;
    const stringEntries = Object.entries(value).filter(([, val]) => typeof val === "string" || typeof val === "number");
    if (stringEntries.length > 0) {
      return stringEntries.map(([k, val]) => `${k}: ${val}`).join(". ");
    }
    return "—";
  }
  return String(value);
};

const orbitArcAgeColor = (ageDays) => {
  if (ageDays === null || ageDays === undefined) return "#808080";
  if (ageDays > 3650) return "#4ecdc4";
  if (ageDays > 730) return "#7fe9e1";
  if (ageDays > 180) return "#ffd93d";
  if (ageDays > 30) return "#FF9500";
  return "#ff6b6b";
};

const orbitArcAgeLabel = (ageDays) => {
  if (ageDays === null || ageDays === undefined) return "Unknown";
  if (ageDays > 3650) return "Multi-Decade Arc";
  if (ageDays > 730) return "Multi-Year Arc";
  if (ageDays > 180) return "Year-Class Arc";
  if (ageDays > 30) return "Short Arc";
  return "Very Short Arc";
};

const moidColor = (moidAU) => {
  if (moidAU === null || moidAU === undefined) return "#808080";
  if (moidAU < 0.002) return "#ff6b6b";
  if (moidAU < 0.01) return "#FF9500";
  if (moidAU < 0.05) return "#ffd93d";
  if (moidAU < 0.2) return "#7fe9e1";
  return "#4ecdc4";
};

const moidLabel = (moidAU) => {
  if (moidAU === null || moidAU === undefined) return "Unknown";
  if (moidAU < 0.002) return "Critical (<0.002 AU)";
  if (moidAU < 0.01) return "Very close (<0.01 AU)";
  if (moidAU < 0.05) return "PHA threshold (<0.05 AU)";
  if (moidAU < 0.2) return "Close (<0.2 AU)";
  return "Distant";
};

const torinoColor = (torino) => {
  if (torino === null || torino === undefined) return "#808080";
  if (torino === 0) return "#4ecdc4";
  if (torino === 1) return "#7fe9e1";
  if (torino <= 4) return "#ffd93d";
  if (torino <= 7) return "#FF9500";
  return "#ff6b6b";
};

const solveKepler = (M, e) => {
  let E = M;
  for (let i = 0; i < 30; i++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-10) break;
  }
  return E;
};

const solveHyperbolicKepler = (M, e) => {
  let F = Math.log(2 * Math.abs(M) / e + 1.8);
  if (M < 0) F = -F;
  for (let i = 0; i < 50; i++) {
    const f = e * Math.sinh(F) - F - M;
    const fp = e * Math.cosh(F) - 1;
    if (Math.abs(fp) < 1e-15) break;
    const dF = f / fp;
    F -= dF;
    if (Math.abs(dF) < 1e-10) break;
  }
  return F;
};

const propagateAsteroid = (asteroid, date) => {
  if (!asteroid || !asteroid.elements) return null;
  const el = asteroid.elements;
  const a = el.a;
  const e = el.e;
  const i = el.i * ORBITAL_CONSTANTS.DEG_TO_RAD;
  const omega = el.om * ORBITAL_CONSTANTS.DEG_TO_RAD;
  const w = el.w * ORBITAL_CONSTANTS.DEG_TO_RAD;
  const epochJD = el.epoch;
  const M0 = el.ma * ORBITAL_CONSTANTS.DEG_TO_RAD;

  if (!Number.isFinite(a) || !Number.isFinite(e) || !Number.isFinite(epochJD) || !Number.isFinite(M0)) return null;
  if (e < 0) return null;

  const targetJD = dateToJulianDate(date);
  const dt = (targetJD - epochJD) * 86400.0;

  const cosw = Math.cos(w);
  const sinw = Math.sin(w);
  const cosO = Math.cos(omega);
  const sinO = Math.sin(omega);
  const cosi = Math.cos(i);
  const sini = Math.sin(i);

  let xOrbital;
  let yOrbital;

  if (e < 1) {
    if (a <= 0) return null;
    const n = Math.sqrt(SUN_GM / Math.pow(a * AU_KM, 3));
    const M = M0 + n * dt;
    const E = solveKepler(M, e);
    const cosE = Math.cos(E);
    const sinE = Math.sin(E);
    xOrbital = a * (cosE - e);
    yOrbital = a * Math.sqrt(1 - e * e) * sinE;
  } else if (e > 1) {
    const absA = Math.abs(a);
    if (absA <= 0) return null;
    const n = Math.sqrt(SUN_GM / Math.pow(absA * AU_KM, 3));
    const M = M0 + n * dt;
    const F = solveHyperbolicKepler(M, e);
    if (!Number.isFinite(F)) return null;
    xOrbital = absA * (e - Math.cosh(F));
    yOrbital = absA * Math.sqrt(e * e - 1) * Math.sinh(F);
  } else {
    return null;
  }

  if (!Number.isFinite(xOrbital) || !Number.isFinite(yOrbital)) return null;

  const x = (cosO * cosw - sinO * sinw * cosi) * xOrbital + (-cosO * sinw - sinO * cosw * cosi) * yOrbital;
  const y = (sinO * cosw + cosO * sinw * cosi) * xOrbital + (-sinO * sinw + cosO * cosw * cosi) * yOrbital;
  const z = (sinw * sini) * xOrbital + (cosw * sini) * yOrbital;

  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return null;

  return new THREE.Vector3(
    x * ORBITAL_CONSTANTS.SCALE_FACTOR,
    z * ORBITAL_CONSTANTS.SCALE_FACTOR,
    -y * ORBITAL_CONSTANTS.SCALE_FACTOR
  );
};

const propagateEarth = (date) => {
  const targetJD = dateToJulianDate(date);
  const T = (targetJD - 2451545.0) / 36525.0;
  const L = (280.46646 + 36000.76983 * T) * ORBITAL_CONSTANTS.DEG_TO_RAD;
  const g = (357.52911 + 35999.05029 * T) * ORBITAL_CONSTANTS.DEG_TO_RAD;
  const lambda = L + (1.914602 - 0.004817 * T) * Math.sin(g) * ORBITAL_CONSTANTS.DEG_TO_RAD
    + (0.019993 - 0.000101 * T) * Math.sin(2 * g) * ORBITAL_CONSTANTS.DEG_TO_RAD;
  const r = 1.00014 - 0.01671 * Math.cos(g) - 0.00014 * Math.cos(2 * g);
  const x = -r * Math.cos(lambda);
  const y = -r * Math.sin(lambda);
  return new THREE.Vector3(
    x * ORBITAL_CONSTANTS.SCALE_FACTOR,
    0,
    -y * ORBITAL_CONSTANTS.SCALE_FACTOR
  );
};

const enrichAsteroid = (s) => {
  if (!s || !s.elements) return s;
  try {
    const el = s.elements;
    const a = el.a;
    const e = el.e;
    const i = el.i;
    const period = a > 0 ? Math.sqrt(Math.pow(a, 3)) : 0;
    const perihelion = a * (1 - e);
    const aphelion = a * (1 + e);
    const periodDays = period * 365.25;
    const meanMotion = period > 0 ? 360.0 / periodDays : 0;
    const velocityAtPerihelion = perihelion > 0 ? Math.sqrt(SUN_GM * (2 / (perihelion * AU_KM) - 1 / (a * AU_KM))) : 0;
    const velocityAtAphelion = aphelion > 0 ? Math.sqrt(SUN_GM * (2 / (aphelion * AU_KM) - 1 / (a * AU_KM))) : 0;
    const meanVelocity = a > 0 ? Math.sqrt(SUN_GM / (a * AU_KM)) : 0;
    const specificEnergy = a > 0 ? -SUN_GM / (2 * a * AU_KM) : 0;
    const angularMomentum = a > 0 ? Math.sqrt(SUN_GM * a * AU_KM * (1 - e * e)) : 0;
    return {
      ...s,
      semiMajorAxisAU: Math.round(a * 100000) / 100000,
      eccentricity: Math.round(e * 1000000) / 1000000,
      inclination: Math.round(i * 100) / 100,
      raan: Math.round((el.om || 0) * 100) / 100,
      argOfPerihelion: Math.round((el.w || 0) * 100) / 100,
      meanAnomaly: Math.round((el.ma || 0) * 100) / 100,
      orbitalPeriodYears: Math.round(period * 1000) / 1000,
      orbitalPeriodDays: Math.round(periodDays * 100) / 100,
      perihelionAU: Math.round(perihelion * 100000) / 100000,
      aphelionAU: Math.round(aphelion * 100000) / 100000,
      perihelionKm: Math.round(perihelion * AU_KM),
      aphelionKm: Math.round(aphelion * AU_KM),
      meanMotion: Math.round(meanMotion * 1000000) / 1000000,
      velocityAtPerihelion: Math.round(velocityAtPerihelion * 1000) / 1000,
      velocityAtAphelion: Math.round(velocityAtAphelion * 1000) / 1000,
      meanVelocity: Math.round(meanVelocity * 1000) / 1000,
      specificEnergy: Math.round(specificEnergy * 1000) / 1000,
      angularMomentum: Math.round(angularMomentum * 100) / 100
    };
  } catch (error) {
    return s;
  }
};

const computeAdvancedDerivatives = (sat) => {
  if (!sat || !sat.semiMajorAxisAU) return {};
  const a = sat.semiMajorAxisAU;
  const e = sat.eccentricity || 0;
  const i = (sat.inclination || 0) * Math.PI / 180;
  const tisserandJupiter = (5.2 / a) + 2 * Math.cos(i) * Math.sqrt((a / 5.2) * (1 - e * e));
  const earthMOID = sat.moidAU !== undefined ? sat.moidAU : null;
  const jupiterMOID = sat.jupiterMOIDAU !== undefined ? sat.jupiterMOIDAU : null;
  const b = a * Math.sqrt(1 - e * e);
  const orbitCircumference = Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
  const heliocentricLongPerihelion = ((sat.raan || 0) + (sat.argOfPerihelion || 0)) % 360;
  const isPHA = sat.isPHA || false;
  const earthCrossing = sat.perihelionAU !== undefined && sat.aphelionAU !== undefined && sat.perihelionAU < 1.017 && sat.aphelionAU > 0.983;
  const marsCrossing = sat.perihelionAU !== undefined && sat.perihelionAU < 1.666 && sat.aphelionAU > 1.381;
  const jupiterCrossing = sat.perihelionAU !== undefined && sat.aphelionAU !== undefined && sat.perihelionAU < 5.46 && sat.aphelionAU > 4.95;
  return {
    tisserandJupiter: Math.round(tisserandJupiter * 1000) / 1000,
    earthMOIDAU: earthMOID,
    jupiterMOIDAU: jupiterMOID,
    orbitCircumferenceAU: Math.round(orbitCircumference * 1000) / 1000,
    heliocentricLongPerihelion: Math.round(heliocentricLongPerihelion * 100) / 100,
    isPHA,
    earthCrossing,
    marsCrossing,
    jupiterCrossing
  };
};

const detectCloseApproaches = (asteroids, asteroidData, thresholdAU, currentDate) => {
  const approaches = [];
  const earthData = asteroidData.get("__earth__");
  if (!earthData || !earthData.position) return [];
  const earthPos = earthData.position;
  const moidPrefilter = thresholdAU * 1.5;

  for (let i = 0; i < asteroids.length; i++) {
    const sat = asteroids[i];
    if (sat.moidAU !== null && sat.moidAU !== undefined && sat.moidAU > moidPrefilter) continue;

    let position = null;
    if (sat.active) {
      const data = asteroidData.get(sat.id);
      position = data ? data.position : null;
    }
    if (!position && currentDate && sat.elements) {
      position = propagateAsteroid(sat, currentDate);
    }
    if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y) || !Number.isFinite(position.z)) continue;

    const sceneDist = position.distanceTo(earthPos);
    const distAU = sceneDist / ORBITAL_CONSTANTS.SCALE_FACTOR;
    if (distAU < thresholdAU) {
      approaches.push({
        asteroid: sat,
        distanceAU: Math.round(distAU * 1000000) / 1000000,
        distanceKm: Math.round(distAU * AU_KM),
        distanceLD: Math.round((distAU * AU_KM / 384400) * 1000) / 1000,
        severity: distAU < 0.0027 ? "Critical" : distAU < 0.01 ? "High" : distAU < 0.025 ? "Moderate" : "Low",
        relativeBearingDeg: Math.round(Math.atan2(position.z - earthPos.z, position.x - earthPos.x) * 180 / Math.PI)
      });
    }
  }
  return approaches.sort((a, b) => a.distanceAU - b.distanceAU).slice(0, 200);
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
  return sprite;
};

const createEclipticGrid = () => {
  const group = new THREE.Group();
  group.name = "EclipticGrid";
  const gridRadius = 600;
  const radialSegments = 24;

  for (let i = 0; i < radialSegments; i++) {
    const angle = (i / radialSegments) * Math.PI * 2;
    const points = [
      new THREE.Vector3(SCENE_SUN_RADIUS * Math.cos(angle), 0, SCENE_SUN_RADIUS * Math.sin(angle)),
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

  const distances = [12, 24, 36, 60, 120, 240, 480, 600];
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
  const axisLength = 400;
  const axisRadius = 0.15;

  const xGeometry = new THREE.CylinderGeometry(axisRadius, axisRadius, axisLength, 8);
  const xMaterial = new THREE.MeshBasicMaterial({ color: 0x6a9a9a, transparent: true, opacity: 0.7 });
  const xAxis = new THREE.Mesh(xGeometry, xMaterial);
  xAxis.rotation.z = -Math.PI / 2;
  xAxis.position.set(axisLength / 2 + SCENE_SUN_RADIUS, 0, 0);
  group.add(xAxis);

  const yGeometry = new THREE.CylinderGeometry(axisRadius, axisRadius, axisLength, 8);
  const yMaterial = new THREE.MeshBasicMaterial({ color: 0x6a9a6a, transparent: true, opacity: 0.7 });
  const yAxis = new THREE.Mesh(yGeometry, yMaterial);
  yAxis.position.set(0, axisLength / 2 + SCENE_SUN_RADIUS, 0);
  group.add(yAxis);

  const zGeometry = new THREE.CylinderGeometry(axisRadius, axisRadius, axisLength, 8);
  const zMaterial = new THREE.MeshBasicMaterial({ color: 0x6a6a9a, transparent: true, opacity: 0.7 });
  const zAxis = new THREE.Mesh(zGeometry, zMaterial);
  zAxis.rotation.x = Math.PI / 2;
  zAxis.position.set(0, 0, axisLength / 2 + SCENE_SUN_RADIUS);
  group.add(zAxis);

  const xLabel = createTextSprite("X (Vernal Eq.)", 0x8ababa);
  xLabel.position.set(axisLength + SCENE_SUN_RADIUS + 16, 4, 0);
  group.add(xLabel);

  const yLabel = createTextSprite("Y (Ecliptic North)", 0x8aba8a);
  yLabel.position.set(0, axisLength + SCENE_SUN_RADIUS + 16, 0);
  group.add(yLabel);

  const zLabel = createTextSprite("Z (90° Ecliptic)", 0x8a8aba);
  zLabel.position.set(0, 4, axisLength + SCENE_SUN_RADIUS + 16);
  group.add(zLabel);

  const originLabel = createTextSprite("Sun (Heliocenter)", 0xffaa44);
  originLabel.position.set(0, -SCENE_SUN_RADIUS - 6, 0);
  group.add(originLabel);

  return group;
};

const createOrbitalZones = () => {
  const group = new THREE.Group();
  group.name = "OrbitalZones";
  const scaleFactor = ORBITAL_CONSTANTS.SCALE_FACTOR;

  const zones = [
    { name: "Inner System (Mercury-Mars)", innerRadius: 0.39 * scaleFactor, outerRadius: 1.66 * scaleFactor, color: 0xFF9500 },
    { name: "Main Belt", innerRadius: 2.06 * scaleFactor, outerRadius: 3.27 * scaleFactor, color: 0x4ECDC4 },
    { name: "Outer System (Jupiter+)", innerRadius: 4.95 * scaleFactor, outerRadius: 30 * scaleFactor, color: 0xAB47BC }
  ];

  zones.forEach((zone, index) => {
    const innerPoints = [];
    const outerPoints = [];
    for (let i = 0; i <= 64; i++) {
      const angle = (i / 64) * Math.PI * 2;
      innerPoints.push(new THREE.Vector3(zone.innerRadius * Math.cos(angle), 0, zone.innerRadius * Math.sin(angle)));
      outerPoints.push(new THREE.Vector3(zone.outerRadius * Math.cos(angle), 0, zone.outerRadius * Math.sin(angle)));
    }

    const innerCurve = new THREE.CatmullRomCurve3(innerPoints, true);
    const innerTube = new THREE.TubeGeometry(innerCurve, 64, 0.08, 6, true);
    const innerMaterial = new THREE.MeshBasicMaterial({ color: zone.color, transparent: true, opacity: 0.5 });
    const innerMesh = new THREE.Mesh(innerTube, innerMaterial);
    group.add(innerMesh);

    const outerCurve = new THREE.CatmullRomCurve3(outerPoints, true);
    const outerTube = new THREE.TubeGeometry(outerCurve, 64, 0.08, 6, true);
    const outerMaterial = new THREE.MeshBasicMaterial({ color: zone.color, transparent: true, opacity: 0.5 });
    const outerMesh = new THREE.Mesh(outerTube, outerMaterial);
    group.add(outerMesh);

    const labelAngle = (index * 90 + 45) * Math.PI / 180;
    const labelRadius = (zone.innerRadius + zone.outerRadius) / 2;
    const label = createTextSprite(zone.name, zone.color);
    label.position.set(labelRadius * Math.cos(labelAngle), 1.5, labelRadius * Math.sin(labelAngle));
    group.add(label);
  });

  return group;
};

const createDistanceRings = () => {
  const group = new THREE.Group();
  group.name = "DistanceRings";
  const scaleFactor = ORBITAL_CONSTANTS.SCALE_FACTOR;

  const planets = [
    { au: 0.39, label: "Mercury 0.39 AU", color: 0x808080 },
    { au: 0.72, label: "Venus 0.72 AU", color: 0xE0C080 },
    { au: 1.0, label: "Earth 1.00 AU", color: 0x42A5F5 },
    { au: 1.52, label: "Mars 1.52 AU", color: 0xC04020 },
    { au: 5.20, label: "Jupiter 5.20 AU", color: 0xC09060 },
    { au: 9.58, label: "Saturn 9.58 AU", color: 0xD0B080 },
    { au: 19.22, label: "Uranus 19.22 AU", color: 0x80C0E0 },
    { au: 30.05, label: "Neptune 30.05 AU", color: 0x4060C0 }
  ];

  planets.forEach((planet, index) => {
    const radius = planet.au * scaleFactor;
    const points = [];
    for (let i = 0; i <= 128; i++) {
      const angle = (i / 128) * Math.PI * 2;
      points.push(new THREE.Vector3(radius * Math.cos(angle), 0, radius * Math.sin(angle)));
    }

    const curve = new THREE.CatmullRomCurve3(points, true);
    const tubeGeometry = new THREE.TubeGeometry(curve, 128, 0.06, 6, true);
    const isEarth = Math.abs(planet.au - 1.0) < 0.01;
    const tubeMaterial = new THREE.MeshBasicMaterial({
      color: isEarth ? 0x42A5F5 : planet.color,
      transparent: true,
      opacity: isEarth ? 0.85 : 0.45
    });
    const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
    group.add(tube);

    const labelAngle = (index * 41) * Math.PI / 180;
    const label = createTextSprite(planet.label, isEarth ? 0x42A5F5 : planet.color);
    label.position.set(radius * Math.cos(labelAngle), 0.6, radius * Math.sin(labelAngle));
    group.add(label);
  });

  return group;
};

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

  const handleMouseDown = useCallback((event, ignoreFn) => {
    if (ignoreFn && ignoreFn(event.target)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
    dragStartRef.current = {
      x: event.clientX - positionRef.current.x,
      y: event.clientY - positionRef.current.y
    };
  }, []);

  useEffect(() => {
    if (!isDragging) {
      return;
    }
    const handleMove = (event) => {
      if (!panelRef.current) {
        return;
      }
      event.preventDefault();
      let newX = event.clientX - dragStartRef.current.x;
      let newY = event.clientY - dragStartRef.current.y;
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

const StatTile = ({ label, value, unit, sub, color, accent, large }) => {
  return (
    <div className={`satStatTile ${large ? "satStatTileLarge" : ""}`} style={{ borderLeftColor: accent || "Var(--St-Accent-Primary)" }}>
      <div className="satStatTileLabel">{label}</div>
      <div className="satStatTileValue" style={color ? { color } : undefined}>
        {value}
        {unit && <span className="satStatTileUnit">{unit}</span>}
      </div>
      {sub && <div className="satStatTileSub">{sub}</div>}
    </div>
  );
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
    if (!wrapperRef.current) return;
    const update = () => {
      if (wrapperRef.current) {
        const w = wrapperRef.current.clientWidth;
        setWidth(prev => prev !== w ? w : prev);
      }
    };
    update();
    const rafId1 = requestAnimationFrame(update);
    const rafId2 = requestAnimationFrame(() => requestAnimationFrame(update));
    const ro = new ResizeObserver(update);
    ro.observe(wrapperRef.current);
    return () => {
      cancelAnimationFrame(rafId1);
      cancelAnimationFrame(rafId2);
      ro.disconnect();
    };
  }, []);

  const numericValues = useMemo(() => {
    if (!values) return [];
    return values
      .map(v => ({ time: v[tk], value: Number(v[vk]) }))
      .filter(v => Number.isFinite(v.value));
  }, [values, tk, vk]);

  const stats = useMemo(() => {
    if (numericValues.length === 0) return null;
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
    if (!canvas || !stats) return;

    const effectiveWidth = width || (wrapperRef.current?.clientWidth ?? 0);
    if (effectiveWidth <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    const W = effectiveWidth;
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

    if (plotW <= 0 || plotH <= 0) return;

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

  const handleMouseMove = useCallback((event) => {
    if (!canvasRef.current || numericValues.length === 0) return;
    const effectiveWidth = width || (wrapperRef.current?.clientWidth ?? 0);
    if (effectiveWidth <= 0) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const padL = 52;
    const padR = 16;
    const plotW = effectiveWidth - padL - padR;
    const x = event.clientX - rect.left;
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
    setHover({ index: idx, clientX: event.clientX, clientY: event.clientY, rectLeft: rect.left, rectTop: rect.top });
  }, [numericValues, width, renderMode]);

  const handleMouseLeave = useCallback(() => setHover(null), []);

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

const NEOWatchStrip = ({ data, loading, expanded, onToggle }) => {
  if (loading && !data) {
    return (
      <div className="satSpaceWeatherStrip satSpaceWeatherLoading" />
    );
  }
  if (!data) {
    return (
      <div className="satSpaceWeatherStrip satSpaceWeatherUnavailable">
        <FontAwesomeIcon icon={faTriangleExclamation} /> <span>NEO Close-Approach Data Unavailable</span>
      </div>
    );
  }

  const overall = data.overall || { status: "Quiet", color: "#4ecdc4", severity: 0 };
  const next7 = data.next7Days;
  const next30 = data.next30Days;
  const next365 = data.next365Days;
  const phaCount = data.totalPHACount;
  const sentryCount = data.sentryRiskCount;
  const closestUpcoming = data.closestUpcoming;
  const recentDiscoveries = data.recentDiscoveriesCount;

  return (
    <div className="satSpaceWeatherStrip">
      <div className="satSpaceWeatherStripCells">
        <div className="satSpaceWeatherCell" style={{ borderLeftColor: overall.color }}>
          <div className="satSpaceWeatherCellLabel">Status</div>
          <div className="satSpaceWeatherCellValue" style={{ color: overall.color }}>{overall.status}</div>
        </div>

        {next7 !== undefined && (
          <div className="satSpaceWeatherCell" style={{ borderLeftColor: next7 > 5 ? "#FF9500" : "#4ecdc4" }}>
            <div className="satSpaceWeatherCellLabel">Next 7 Days</div>
            <div className="satSpaceWeatherCellValue">{next7}<span>Close Approaches</span></div>
          </div>
        )}

        {next30 !== undefined && (
          <div className="satSpaceWeatherCell" style={{ borderLeftColor: "#42a5f5" }}>
            <div className="satSpaceWeatherCellLabel">Next 30 Days</div>
            <div className="satSpaceWeatherCellValue">{next30}<span>Tracked Passes</span></div>
          </div>
        )}

        {next365 !== undefined && (
          <div className="satSpaceWeatherCell" style={{ borderLeftColor: "#9c27b0" }}>
            <div className="satSpaceWeatherCellLabel">Next 365 Days</div>
            <div className="satSpaceWeatherCellValue">{next365}<span>Annual Passes</span></div>
          </div>
        )}

        {phaCount !== undefined && (
          <div className="satSpaceWeatherCell" style={{ borderLeftColor: "#ff6b6b" }}>
            <div className="satSpaceWeatherCellLabel">PHA Catalog</div>
            <div className="satSpaceWeatherCellValue">{phaCount}<span>Potentially Hazardous</span></div>
          </div>
        )}

        {sentryCount !== undefined && (
          <div className="satSpaceWeatherCell" style={{ borderLeftColor: sentryCount > 0 ? "#FF9500" : "#4ecdc4" }}>
            <div className="satSpaceWeatherCellLabel">Sentry Risk</div>
            <div className="satSpaceWeatherCellValue">{sentryCount}<span>Impact-Monitoring</span></div>
          </div>
        )}

        {closestUpcoming && (
          <div className="satSpaceWeatherCell" style={{ borderLeftColor: moidColor(closestUpcoming.distAU) }}>
            <div className="satSpaceWeatherCellLabel">Closest Upcoming</div>
            <div className="satSpaceWeatherCellValue">{closestUpcoming.distLD?.toFixed(1)}<span>LD · {closestUpcoming.name}</span></div>
          </div>
        )}

        {recentDiscoveries !== undefined && (
          <div className="satSpaceWeatherCell">
            <div className="satSpaceWeatherCellLabel">New Discoveries</div>
            <div className="satSpaceWeatherCellValue">{recentDiscoveries}<span>Past 30 Days</span></div>
          </div>
        )}
      </div>

      <button
        className="satSpaceWeatherToggle"
        onClick={onToggle}
        title={expanded ? "Hide Briefing" : "Show Full Briefing"}
      >
        {expanded ? "Hide Briefing" : "Show Briefing"}
        <FontAwesomeIcon icon={expanded ? faSquareCaretUp : faSquareCaretDown} />
      </button>
    </div>
  );
};

const NEOWatchDetail = ({ data, onClose, onRequestAIAnalysis, aiAnalysis, aiLoading, onSelect }) => {
  const [activeSection, setActiveSection] = useState("overview");
  if (!data) return null;

  const sections = [
    { key: "overview", label: "Overview", icon: faGauge },
    { key: "upcoming", label: "Upcoming Passes", icon: faClock },
    { key: "sentry", label: "Sentry Risk", icon: faTriangleExclamation },
    { key: "discoveries", label: "Recent Discoveries", icon: faMeteor },
    { key: "operational", label: "Risk Matrix", icon: faShieldHalved },
    { key: "ai", label: "AI Analysis", icon: faBrain }
  ];

  const renderOverview = () => (
    <div className="satDossierTabContent">
      <div className="satStatTileGrid">
        <StatTile label="Overall Status" value={data.overall?.status || "Quiet"} sub={`Severity ${data.overall?.severity || 0}/6`} color={data.overall?.color} accent={data.overall?.color} large />
        <StatTile label="Next 7 Days" value={data.next7Days || 0} sub="Close Approaches" accent="#42a5f5" />
        <StatTile label="Next 30 Days" value={data.next30Days || 0} sub="Tracked Passes" accent="#42a5f5" />
        <StatTile label="Next 365 Days" value={data.next365Days || 0} sub="Annual Passes" accent="#9c27b0" />
        <StatTile label="PHA Catalog" value={data.totalPHACount || 0} sub="MOID < 0.05 AU, H < 22" color="#ff6b6b" accent="#ff6b6b" />
        <StatTile label="Sentry Risk" value={data.sentryRiskCount || 0} sub="Impact-Monitoring" color={(data.sentryRiskCount || 0) > 0 ? "#FF9500" : "#4ecdc4"} accent="#FF9500" />
        <StatTile label="Recent Discoveries" value={data.recentDiscoveriesCount || 0} sub="Past 30 Days" accent="#42a5f5" />
        {data.closestUpcoming && (
          <StatTile label="Closest Upcoming" value={data.closestUpcoming.distLD?.toFixed(2)} unit="LD" sub={data.closestUpcoming.name} color={moidColor(data.closestUpcoming.distAU)} accent={moidColor(data.closestUpcoming.distAU)} />
        )}
      </div>

      {data.upcomingPasses && data.upcomingPasses.length > 0 && (
        <div className="satPanelCard">
          <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faClock} /> Imminent Approaches (Next 7 Days)</span></div>
          <div className="satPanelCardBody">
            <div className="satTableScroll">
              <AdaptiveTable>
                <thead><tr><th>Date (UTC)</th><th>Object</th><th>Distance (LD)</th><th>Distance (AU)</th><th>Velocity</th><th>Magnitude</th><th>PHA</th></tr></thead>
                <tbody>
                  {data.upcomingPasses.slice(0, 10).map((p, i) => (
                    <tr key={i}>
                      <td>{p.cdDate}</td>
                      <td><b>{p.name}</b></td>
                      <td style={{ color: moidColor(p.distAU) }}>{p.distLD?.toFixed(2)}</td>
                      <td>{p.distAU?.toFixed(6)}</td>
                      <td>{p.vRel?.toFixed(2)} km/s</td>
                      <td>{p.h !== null ? p.h.toFixed(1) : "—"}</td>
                      <td>{p.isPHA ? <span style={{ color: "#ff6b6b" }}>Yes</span> : "No"}</td>
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

  const renderUpcoming = () => (
    <div className="satDossierTabContent">
      <div className="satPanelCard">
        <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faClock} /> All Upcoming Close Approaches</span></div>
        <div className="satPanelCardBody">
          {!data.upcomingPasses || data.upcomingPasses.length === 0 ? (
            <div className="satPanelEmpty">There are no upcoming approaches in the configured window.</div>
          ) : (
            <div className="satTableScroll">
              <AdaptiveTable>
                <thead><tr><th>Severity</th><th>Date (UTC)</th><th>Object</th><th>LD</th><th>AU</th><th>km</th><th>v_rel km/s</th><th>H</th><th>PHA</th></tr></thead>
                <tbody>
                  {data.upcomingPasses.map((p, i) => (
                    <tr key={i}>
                      <td><span className="satConjunctionSeverity" style={{ background: moidColor(p.distAU) + "33", color: moidColor(p.distAU) }}>{moidLabel(p.distAU)}</span></td>
                      <td>{p.cdDate}</td>
                      <td><b>{p.name}</b></td>
                      <td>{p.distLD?.toFixed(3)}</td>
                      <td>{p.distAU?.toFixed(6)}</td>
                      <td>{p.distKm?.toLocaleString()}</td>
                      <td>{p.vRel?.toFixed(2)}</td>
                      <td>{p.h !== null ? p.h.toFixed(1) : "—"}</td>
                      <td>{p.isPHA ? <span style={{ color: "#ff6b6b" }}>Yes</span> : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </AdaptiveTable>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderSentry = () => (
    <div className="satDossierTabContent">
      <div className="satPanelCard">
        <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faTriangleExclamation} /> CNEOS Sentry Impact Risk Table</span></div>
        <div className="satPanelCardBody">
          {!data.sentryObjects || data.sentryObjects.length === 0 ? (
            <div className="satPanelEmpty">No Sentry risk data is available.</div>
          ) : (
            <div className="satTableScroll">
              <AdaptiveTable>
                <thead><tr><th>Designation</th><th>Year Range</th><th>Potential Impacts</th><th>Cumulative IP</th><th>Palermo</th><th>Torino</th><th>Diameter</th><th>H</th></tr></thead>
                <tbody>
                  {data.sentryObjects.map((s, i) => (
                    <tr key={i}>
                      <td><b>{s.des}</b></td>
                      <td>{s.range}</td>
                      <td>{s.nImp}</td>
                      <td>{s.ipScientific}</td>
                      <td style={{ color: parseFloat(s.psCum) > -3 ? "#FF9500" : "#4ecdc4" }}>{s.psCum}</td>
                      <td style={{ color: torinoColor(parseInt(s.tsMax)) }}>{s.tsMax}</td>
                      <td>{s.diameter ? `${s.diameter} km` : "—"}</td>
                      <td>{s.h !== null && s.h !== undefined ? s.h.toFixed(1) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </AdaptiveTable>
            </div>
          )}
        </div>
      </div>
      <div className="satPanelCard">
        <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faBookOpen} /> Sentry Methodology</span></div>
        <div className="satPanelCardBody">
          <div className="satBriefingGrid">
            <div className="satBriefingItem"><b>Sentry System</b><p>NASA JPL CNEOS Sentry is the automated impact-monitoring system that performs continuous orbit propagation and Monte Carlo sampling of orbital uncertainty regions to compute impact probabilities for the next 100 years.</p></div>
            <div className="satBriefingItem"><b>Palermo Scale</b><p>This logarithmic scale compares impact likelihood to background risk. Values below -2 are routine; values above 0 indicate hazard exceeding the background impact rate.</p></div>
            <div className="satBriefingItem"><b>Torino Scale</b><p>This 0-10 integer scale combines impact probability and kinetic energy. A 0 means no hazard, 1 is routine, 2-4 merit attention, 5-7 are threatening, and 8-10 mean a certain collision.</p></div>
            <div className="satBriefingItem"><b>Removal</b><p>Objects are removed from Sentry once additional observations refine the orbit and impact possibility falls below detection threshold. Most listed objects exit the table within months.</p></div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDiscoveries = () => (
    <div className="satDossierTabContent">
      <div className="satPanelCard">
        <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faMeteor} /> Recent Discoveries</span></div>
        <div className="satPanelCardBody">
          {!data.recentDiscoveries || data.recentDiscoveries.length === 0 ? (
            <div className="satPanelEmpty">No recent discovery data is available.</div>
          ) : (
            <div className="satTableScroll">
              <AdaptiveTable>
                <thead><tr><th>Designation</th><th>Discovery</th><th>Class</th><th>Diameter</th><th>H</th><th>a (AU)</th><th>e</th><th>i (°)</th></tr></thead>
                <tbody>
                  {data.recentDiscoveries.map((d, i) => (
                    <tr key={i}>
                      <td><b>{d.designation}</b></td>
                      <td>{d.discoveryDate}</td>
                      <td>{d.class}</td>
                      <td>{d.diameter ? `${d.diameter} km` : "—"}</td>
                      <td>{d.h !== null && d.h !== undefined ? d.h.toFixed(1) : "—"}</td>
                      <td>{d.a?.toFixed(3)}</td>
                      <td>{d.e?.toFixed(4)}</td>
                      <td>{d.i?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </AdaptiveTable>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderOperational = () => (
    <div className="satDossierTabContent">
      <div className="satPanelCard">
        <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faShieldHalved} /> Hazard Domain Risk Matrix</span></div>
        <div className="satPanelCardBody">
          <div className="satRiskMatrix">
            <div className="satRiskMatrixRow satRiskMatrixHeader">
              <div>Domain</div><div>Imminent Impact</div><div>Sentry Risk</div><div>PHA Density</div><div>Low Δv</div><div>Survey Gap</div>
            </div>
            <div className="satRiskMatrixRow">
              <div>Planetary Defense</div>
              <div className={`satRiskCell ${(data.next7Days || 0) > 10 ? "satRiskHigh" : (data.next7Days || 0) > 3 ? "satRiskMod" : "satRiskLow"}`}>{(data.next7Days || 0) > 10 ? "HIGH" : (data.next7Days || 0) > 3 ? "MOD" : "LOW"}</div>
              <div className={`satRiskCell ${(data.sentryRiskCount || 0) > 5 ? "satRiskHigh" : (data.sentryRiskCount || 0) > 0 ? "satRiskMod" : "satRiskLow"}`}>{(data.sentryRiskCount || 0) > 5 ? "HIGH" : (data.sentryRiskCount || 0) > 0 ? "MOD" : "LOW"}</div>
              <div className={`satRiskCell ${(data.totalPHACount || 0) > 2500 ? "satRiskHigh" : "satRiskMod"}`}>{(data.totalPHACount || 0) > 2500 ? "HIGH" : "MOD"}</div>
              <div className="satRiskCell satRiskLow">N/A</div>
              <div className="satRiskCell satRiskMod">Mod</div>
            </div>
            <div className="satRiskMatrixRow">
              <div>Mission Targets</div>
              <div className="satRiskCell satRiskLow">Low</div>
              <div className="satRiskCell satRiskLow">Low</div>
              <div className="satRiskCell satRiskLow">Low</div>
              <div className="satRiskCell satRiskHigh">High</div>
              <div className="satRiskCell satRiskMod">Mod</div>
            </div>
            <div className="satRiskMatrixRow">
              <div>Resource Prospecting</div>
              <div className="satRiskCell satRiskLow">N/A</div>
              <div className="satRiskCell satRiskLow">N/A</div>
              <div className="satRiskCell satRiskLow">N/A</div>
              <div className="satRiskCell satRiskHigh">High</div>
              <div className="satRiskCell satRiskMod">Mod</div>
            </div>
            <div className="satRiskMatrixRow">
              <div>Earth Observation</div>
              <div className={`satRiskCell ${(data.next7Days || 0) > 10 ? "satRiskMod" : "satRiskLow"}`}>{(data.next7Days || 0) > 10 ? "MOD" : "LOW"}</div>
              <div className="satRiskCell satRiskLow">Low</div>
              <div className="satRiskCell satRiskLow">Low</div>
              <div className="satRiskCell satRiskLow">N/A</div>
              <div className="satRiskCell satRiskLow">Low</div>
            </div>
            <div className="satRiskMatrixRow">
              <div>Scientific Survey</div>
              <div className="satRiskCell satRiskLow">N/A</div>
              <div className="satRiskCell satRiskLow">N/A</div>
              <div className="satRiskCell satRiskLow">N/A</div>
              <div className="satRiskCell satRiskLow">N/A</div>
              <div className="satRiskCell satRiskHigh">High</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAI = () => (
    <div className="satDossierTabContent">
      {aiAnalysis && !aiAnalysis.error && (
        <div className="satMissionIntelHeader">
          <small>
            Generated {formatGeneratedAt(aiAnalysis.generatedAt)}
            {aiAnalysis.tokenUsage && ` · tokens: ${aiAnalysis.tokenUsage.total || "?"}`}
            {aiAnalysis.stages && ` · ${aiAnalysis.stages} stages`}
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
              <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faGauge} /> Current Hazard Posture</span></div>
              <div className="satPanelCardBody"><p className="satMissionBriefText">{safeRenderText(aiAnalysis.report.currentConditions)}</p></div>
            </div>
          )}
          {aiAnalysis.report.forecast24h && (
            <div className="satPanelCard">
              <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faArrowTrendUp} /> Near-Term Forecast (30 Days)</span></div>
              <div className="satPanelCardBody"><p className="satMissionBriefText">{safeRenderText(aiAnalysis.report.forecast24h)}</p></div>
            </div>
          )}
          {aiAnalysis.report.forecast72h && (
            <div className="satPanelCard">
              <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faArrowTrendUp} /> Long-Term Outlook (1 Year)</span></div>
              <div className="satPanelCardBody"><p className="satMissionBriefText">{safeRenderText(aiAnalysis.report.forecast72h)}</p></div>
            </div>
          )}
          {aiAnalysis.report.satelliteImpacts && Array.isArray(aiAnalysis.report.satelliteImpacts) && (
            <div className="satPanelCard">
              <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faMeteor} /> Domain-Specific Impact Assessment</span></div>
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
              <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faList} /> Recommended Actions</span></div>
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
        <span>NEO Watch Operations Center · {new Date(data.timestamp).toLocaleString()}</span>
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
        {activeSection === "upcoming" && renderUpcoming()}
        {activeSection === "sentry" && renderSentry()}
        {activeSection === "discoveries" && renderDiscoveries()}
        {activeSection === "operational" && renderOperational()}
        {activeSection === "ai" && renderAI()}
      </div>
    </div>
  );
};

const CloseApproachesPanel = ({ approaches, onSelect, onClose, asteroids }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("distance");
  const [activeTab, setActiveTab] = useState("watch");

  const filtered = useMemo(() => {
    let result = approaches;
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(c =>
        c.asteroid.name.toLowerCase().includes(lower) ||
        String(c.asteroid.designation || "").toLowerCase().includes(lower)
      );
    }
    if (severityFilter !== "all") {
      result = result.filter(c => c.severity.toLowerCase() === severityFilter);
    }
    if (sortBy === "distance") {
      result = [...result].sort((a, b) => a.distanceAU - b.distanceAU);
    } else if (sortBy === "severity") {
      const order = { Critical: 0, High: 1, Moderate: 2, Low: 3 };
      result = [...result].sort((a, b) => order[a.severity] - order[b.severity]);
    }
    return result;
  }, [approaches, searchTerm, severityFilter, sortBy]);

  const stats = useMemo(() => {
    return {
      total: approaches.length,
      critical: approaches.filter(c => c.severity === "Critical").length,
      high: approaches.filter(c => c.severity === "High").length,
      moderate: approaches.filter(c => c.severity === "Moderate").length,
      low: approaches.filter(c => c.severity === "Low").length,
      avgDistance: approaches.length > 0 ? approaches.reduce((s, c) => s + c.distanceAU, 0) / approaches.length : 0,
      minDistance: approaches.length > 0 ? Math.min(...approaches.map(c => c.distanceAU)) : 0
    };
  }, [approaches]);

  return (
    <div className="satSpaceWeatherDetail">
      <div className="satSpaceWeatherDetailHeader">
        <span><FontAwesomeIcon icon={faTriangleExclamation} /> Close Approaches Watch · {approaches.length} Active Proximity Events</span>
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
                    <input type="text" placeholder="Name or Designation" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="satSatelliteSearchInput" />
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
                      value={labelFor(CLOSE_APPROACH_SORT_OPTIONS, sortBy)}
                      onChange={(option) => setSortBy(valueFor(CLOSE_APPROACH_SORT_OPTIONS, option))}
                      options={CLOSE_APPROACH_SORT_OPTIONS.map(([, label]) => label)}
                      placeholder="Sort By"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="satPanelCard">
              <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faTable} /> Active Proximity Events ({filtered.length})</span></div>
              <div className="satPanelCardBody">
                {filtered.length === 0 ? (
                  <div className="satPanelEmpty">No close approaches match the current filter.</div>
                ) : (
                  <div className="satTableScroll">
                    <AdaptiveTable>
                      <thead>
                        <tr><th>Severity</th><th>Distance (AU)</th><th>Distance (LD)</th><th>Distance (km)</th><th>Object</th><th>Class</th><th>Bearing</th><th></th></tr>
                      </thead>
                      <tbody>
                        {filtered.map((c, i) => (
                          <tr key={i} className={`satConjunctionTableRow satConjunctionSev-${c.severity.toLowerCase()}`}>
                            <td><span className={`satConjunctionSeverity satConjunctionSev-${c.severity.toLowerCase()}`}>{c.severity}</span></td>
                            <td><b>{c.distanceAU.toFixed(6)}</b></td>
                            <td>{c.distanceLD?.toFixed(2)}</td>
                            <td>{c.distanceKm.toLocaleString()}</td>
                            <td><button className="satTableButton" onClick={() => onSelect && onSelect(c.asteroid)}>{c.asteroid.name}<small>{c.asteroid.designation || "—"} · {c.asteroid.category}</small></button></td>
                            <td>{c.asteroid.category}</td>
                            <td>{c.relativeBearingDeg}°</td>
                            <td><button className="satSatelliteSelectButton" onClick={() => onSelect && onSelect(c.asteroid)}>Inspect</button></td>
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
              <StatTile label="Total Events" value={stats.total} sub="Catalog-Wide Near Earth" accent="#42a5f5" large />
              <StatTile label="Critical (<0.0027 AU)" value={stats.critical} color="#ff6b6b" accent="#ff6b6b" sub="Sub-Lunar Distance" />
              <StatTile label="High (<0.01 AU)" value={stats.high} color="#FF9500" accent="#FF9500" />
              <StatTile label="Moderate (<0.025 AU)" value={stats.moderate} color="#ffd93d" accent="#ffd93d" />
              <StatTile label="Low (>0.025 AU)" value={stats.low} color="#7fe9e1" accent="#7fe9e1" />
              <StatTile label="Mean Distance" value={stats.avgDistance.toFixed(6)} unit="AU" accent="#42a5f5" />
              <StatTile label="Closest Object" value={stats.minDistance.toFixed(6)} unit="AU" accent="#ff6b6b" color="#ff6b6b" />
            </div>
            <div className="satPanelCard">
              <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faBookOpen} /> Close Approach Methodology</span></div>
              <div className="satPanelCardBody">
                <div className="satBriefingGrid">
                  <div className="satBriefingItem"><b>Detection</b><p>A catalog-wide MOID pre-filter selects candidate asteroids whose orbital geometry permits a close approach below the threshold; positions are then propagated for the current simulation epoch and tested against Earth's analytic position.</p></div>
                  <div className="satBriefingItem"><b>Severity</b><p>Critical means under 0.0027 AU (sub-lunar distance, under 1 LD), high means 0.0027 to 0.01 AU, moderate means 0.01 to 0.025 AU, and low means 0.025 AU up to the threshold. The lunar distance reference (LD = 0.00257 AU) is the natural break point for "very close" passes.</p></div>
                  <div className="satBriefingItem"><b>Limitations</b><p>This is a snapshot using two-body Kepler propagation. True close-approach analysis requires N-body integration with planetary perturbations and orbital uncertainty propagation per CNEOS Sentry standards.</p></div>
                  <div className="satBriefingItem"><b>Update Rate</b><p>The check is refreshed every {Math.round(PERFORMANCE_CONSTANTS.CLOSE_APPROACH_CHECK_INTERVAL_MS / 1000)} seconds against the most recent propagated positions of the candidate set, regardless of which subset of the catalog is currently rendered.</p></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const PHACatalogPanel = ({ data, loading, onRefresh, onClose, onSelect }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("groups");
  const [selectedGroup, setSelectedGroup] = useState(null);

  const filteredEntries = useMemo(() => {
    if (!data) return [];
    const entries = Object.entries(data);
    if (!searchTerm) return entries;
    const lower = searchTerm.toLowerCase();
    return entries.filter(([name, c]) =>
      name.toLowerCase().includes(lower) ||
      (c.description || "").toLowerCase().includes(lower)
    );
  }, [data, searchTerm]);

  const aggregateStats = useMemo(() => {
    if (!data) return null;
    const entries = Object.entries(data);
    const totalTracked = entries.reduce((s, [, c]) => s + (c.tracked || 0), 0);
    const totalKnown = entries.reduce((s, [, c]) => s + (c.estimatedTotal || 0), 0);
    const totalPHA = entries.reduce((s, [, c]) => s + (c.phaCount || 0), 0);
    const totalNEO = entries.reduce((s, [, c]) => s + (c.neoCount || 0), 0);
    return {
      totalGroups: entries.length,
      totalTracked,
      totalKnown,
      totalPHA,
      totalNEO,
      coveragePct: totalKnown > 0 ? Math.round((totalTracked / totalKnown) * 100) : 0
    };
  }, [data]);

  return (
    <div className="satSpaceWeatherDetail">
      <div className="satSpaceWeatherDetailHeader">
        <span><FontAwesomeIcon icon={faCircleNodes} /> Asteroid Population Census</span>
        <button className="satSatelliteCloseButton" onClick={onClose}><FontAwesomeIcon icon={faXmark} /></button>
      </div>
      <div className="satDossierTabs">
        <div className="satDossierTabsScroll">
          <button className={`satDossierTab ${activeTab === "groups" ? "satDossierTabActive" : ""}`} onClick={() => setActiveTab("groups")}><FontAwesomeIcon icon={faCircleNodes} /> Population Groups</button>
          <button className={`satDossierTab ${activeTab === "fleet" ? "satDossierTabActive" : ""}`} onClick={() => setActiveTab("fleet")}><FontAwesomeIcon icon={faNetworkWired} /> Aggregate</button>
          <button className={`satDossierTab ${activeTab === "compare" ? "satDossierTabActive" : ""}`} onClick={() => setActiveTab("compare")}><FontAwesomeIcon icon={faTable} /> Comparison Table</button>
        </div>
      </div>
      <div className="satDossierBody">
        {activeTab === "groups" && (
          <div className="satDossierTabContent">
            <div className="satPanelCard">
              <div className="satPanelCardHeader">
                <span><FontAwesomeIcon icon={faMagnifyingGlass} /> Search</span>
                <button className="satPassComputeButton" onClick={onRefresh}><FontAwesomeIcon icon={loading ? faSpinner : faSatellite} spin={loading} /> {loading ? "Loading" : "Refresh"}</button>
              </div>
              <div className="satPanelCardBody">
                <input type="text" placeholder="Search by Name or Description" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="satSatelliteSearchInput" />
              </div>
            </div>
            {!data || filteredEntries.length === 0 ? (
              <div className="satPanelEmpty">{loading ? <div className="loading-circle" /> : "No groups match the search."}</div>
            ) : (
              <div className="satConstellationGridDense">
                {filteredEntries.map(([group, c]) => (
                  <div key={group} className={`satConstellationCard satConstellationStatus-${(c.status || "unknown").toLowerCase()}`} onClick={() => setSelectedGroup(group)}>
                    <div className="satConstellationHeader">
                      <h5>{group}</h5>
                      <span className={`satConstellationStatusBadge satConstellationStatus-${(c.status || "unknown").toLowerCase()}`}>{c.status}</span>
                    </div>
                    <small>{c.description}</small>
                    <div className="satConstellationStats">
                      <div><span>Tracked</span><b>{c.tracked}</b></div>
                      <div><span>Est. Total</span><b>{c.estimatedTotal?.toLocaleString() || "?"}</b></div>
                      <div><span>Coverage</span><b>{c.coveragePct}%</b></div>
                      <div><span>PHAs</span><b>{c.phaCount}</b></div>
                      <div><span>Avg a</span><b>{c.averageA} AU</b></div>
                      <div><span>Avg e</span><b>{c.averageE}</b></div>
                    </div>
                    <div className="satConstellationBar">
                      <div className="satConstellationBarFill" style={{ width: `${Math.min(100, c.coveragePct)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {selectedGroup && data && data[selectedGroup] && data[selectedGroup].ids && (
              <div className="satPanelCard">
                <div className="satPanelCardHeader">
                  <span><FontAwesomeIcon icon={faList} /> {selectedGroup} Members ({data[selectedGroup].ids.length})</span>
                  <button className="satSatelliteCloseButton" onClick={() => setSelectedGroup(null)}><FontAwesomeIcon icon={faXmark} /></button>
                </div>
                <div className="satPanelCardBody">
                  <div className="satTableScroll">
                    <AdaptiveTable>
                      <thead><tr><th>Designation</th><th>Name</th><th>a (AU)</th><th>e</th><th>i (°)</th><th>H</th><th>PHA</th></tr></thead>
                      <tbody>
                        {data[selectedGroup].ids.map((m, i) => (
                          <tr key={i}>
                            <td>{m.designation}</td>
                            <td><button className="satTableButton" onClick={() => onSelect && onSelect(m)}>{m.name}</button></td>
                            <td>{m.a?.toFixed(3)}</td>
                            <td>{m.e?.toFixed(4)}</td>
                            <td>{m.i?.toFixed(2)}</td>
                            <td>{m.h !== null && m.h !== undefined ? m.h.toFixed(1) : "—"}</td>
                            <td>{m.isPHA ? <span style={{ color: "#ff6b6b" }}>Yes</span> : "No"}</td>
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
              <StatTile label="Population Groups" value={aggregateStats.totalGroups} accent="#42a5f5" large />
              <StatTile label="Total Tracked" value={aggregateStats.totalTracked.toLocaleString()} sub={`Of ~${aggregateStats.totalKnown.toLocaleString()} Estimated`} accent="#4ecdc4" />
              <StatTile label="Catalog Coverage" value={`${aggregateStats.coveragePct}%`} color={aggregateStats.coveragePct > 50 ? "#4ecdc4" : aggregateStats.coveragePct > 20 ? "#FF9500" : "#ff6b6b"} accent={aggregateStats.coveragePct > 50 ? "#4ecdc4" : "#FF9500"} />
              <StatTile label="NEO Count" value={aggregateStats.totalNEO.toLocaleString()} sub="Earth-Approaching" color="#FF9500" accent="#FF9500" />
              <StatTile label="PHA Count" value={aggregateStats.totalPHA.toLocaleString()} sub="MOID < 0.05 AU, H < 22" color="#ff6b6b" accent="#ff6b6b" />
            </div>
            <div className="satPanelCard">
              <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faBookOpen} /> Population Group Definitions</span></div>
              <div className="satPanelCardBody">
                <div className="satBriefingGrid">
                  <div className="satBriefingItem"><b>Atira</b><p>These Inner Earth Objects orbit entirely inside Earth's orbit (aphelion &lt; 0.983 AU). They are difficult to detect and must be observed at sub-solar elongations near twilight.</p></div>
                  <div className="satBriefingItem"><b>Aten</b><p>These Earth-crossing objects have a semi-major axis under 1.0 AU. They spend most of their orbit inside Earth's, and their aphelion exceeds 0.983 AU.</p></div>
                  <div className="satBriefingItem"><b>Apollo</b><p>These Earth-crossing objects have a semi-major axis over 1.0 AU. They are the largest near-Earth class, with perihelion below 1.017 AU.</p></div>
                  <div className="satBriefingItem"><b>Amor</b><p>These Mars-crossing or near-Earth objects do not cross Earth's orbit. Their perihelion is between 1.017 and 1.3 AU.</p></div>
                  <div className="satBriefingItem"><b>Main Belt</b><p>These objects orbit between Mars and Jupiter (~2.06-3.27 AU). Inner, middle, and outer subdivisions track different dynamical and compositional populations.</p></div>
                  <div className="satBriefingItem"><b>Trojans</b><p>These objects are locked at Jupiter's L4 and L5 Lagrange points, ±60° ahead of and behind Jupiter, and are stable for billions of years.</p></div>
                  <div className="satBriefingItem"><b>Centaurs</b><p>These objects follow unstable orbits between Jupiter and Neptune. Many are former Kuiper Belt objects on their way to becoming Jupiter-family comets.</p></div>
                  <div className="satBriefingItem"><b>TNOs / KBOs</b><p>This trans-Neptunian region lies beyond Neptune's orbit. It includes Plutinos in 3:2 resonance, classical KBOs, and scattered-disk objects.</p></div>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === "compare" && data && (
          <div className="satDossierTabContent">
            <div className="satPanelCard">
              <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faTable} /> Population Comparison Matrix</span></div>
              <div className="satPanelCardBody">
                <div className="satTableScroll">
                  <AdaptiveTable>
                    <thead>
                      <tr><th>Group</th><th>Description</th><th>Status</th><th>Tracked</th><th>Est. Total</th><th>Coverage</th><th>NEO</th><th>PHA</th><th>Avg a</th><th>Avg e</th></tr>
                    </thead>
                    <tbody>
                      {Object.entries(data).map(([group, c]) => (
                        <tr key={group} className={`satConstellationStatus-${(c.status || "unknown").toLowerCase()}`}>
                          <td><b>{group}</b></td>
                          <td>{c.description}</td>
                          <td><span className={`satConstellationStatusBadge satConstellationStatus-${(c.status || "unknown").toLowerCase()}`}>{c.status}</span></td>
                          <td>{c.tracked}</td>
                          <td>{c.estimatedTotal?.toLocaleString() || "?"}</td>
                          <td>{c.coveragePct}%</td>
                          <td style={{ color: "#FF9500" }}>{c.neoCount}</td>
                          <td style={{ color: "#ff6b6b" }}>{c.phaCount}</td>
                          <td>{c.averageA} AU</td>
                          <td>{c.averageE}</td>
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

const SentryWatchPanel = ({ candidates, loading, onRefresh, onClose, onSelect, methodology }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [sortBy, setSortBy] = useState("palermo");
  const [activeTab, setActiveTab] = useState("watch");

  const filtered = useMemo(() => {
    if (!candidates) return [];
    let result = candidates;
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(c =>
        c.des.toLowerCase().includes(lower) ||
        (c.fullname || "").toLowerCase().includes(lower)
      );
    }
    if (riskFilter !== "all") {
      result = result.filter(c => (c.decayRisk || "").toLowerCase() === riskFilter);
    }
    if (sortBy === "palermo") {
      result = [...result].sort((a, b) => parseFloat(b.psCum) - parseFloat(a.psCum));
    } else if (sortBy === "torino") {
      result = [...result].sort((a, b) => parseInt(b.tsMax || 0) - parseInt(a.tsMax || 0));
    } else if (sortBy === "ip") {
      result = [...result].sort((a, b) => parseFloat(b.ip || 0) - parseFloat(a.ip || 0));
    } else if (sortBy === "diameter") {
      result = [...result].sort((a, b) => (b.diameter || 0) - (a.diameter || 0));
    }
    return result;
  }, [candidates, searchTerm, riskFilter, sortBy]);

  const stats = useMemo(() => {
    if (!candidates) return null;
    return {
      total: candidates.length,
      imminent: candidates.filter(c => c.decayRisk === "Imminent").length,
      high: candidates.filter(c => c.decayRisk === "High").length,
      moderate: candidates.filter(c => c.decayRisk === "Moderate").length,
      low: candidates.filter(c => c.decayRisk === "Low").length,
      torinoNonZero: candidates.filter(c => parseInt(c.tsMax || 0) > 0).length,
      palermoAboveZero: candidates.filter(c => parseFloat(c.psCum || -99) > 0).length,
      avgDiameter: candidates.length > 0 ? candidates.reduce((s, c) => s + (c.diameter || 0), 0) / candidates.length : 0,
      maxDiameter: candidates.length > 0 ? Math.max(...candidates.map(c => c.diameter || 0)) : 0
    };
  }, [candidates]);

  return (
    <div className="satSpaceWeatherDetail">
      <div className="satSpaceWeatherDetailHeader">
        <span><FontAwesomeIcon icon={faFire} /> Sentry Impact Risk Watch · {candidates?.length || 0} Monitored Objects</span>
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
                    <input type="text" placeholder="Designation or Name" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="satSatelliteSearchInput" />
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
                      value={labelFor(SENTRY_SORT_OPTIONS, sortBy)}
                      onChange={(option) => setSortBy(valueFor(SENTRY_SORT_OPTIONS, option))}
                      options={SENTRY_SORT_OPTIONS.map(([, label]) => label)}
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
                <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faTable} /> Sentry Risk Objects ({filtered.length})</span></div>
                <div className="satPanelCardBody">
                  {filtered.length === 0 ? (
                    <div className="satPanelEmpty">No objects match the filter.</div>
                  ) : (
                    <div className="satTableScroll">
                      <AdaptiveTable>
                        <thead>
                          <tr><th>Risk</th><th>Tier</th><th>Designation</th><th>Year Range</th><th>Impacts</th><th>Cum. IP</th><th>Palermo</th><th>Torino</th><th>Diameter</th><th>H</th><th></th></tr>
                        </thead>
                        <tbody>
                          {filtered.map((c) => (
                            <tr key={c.des} className={`satDecayRisk-${(c.decayRisk || "low").toLowerCase()}`}>
                              <td><span className={`satDecayRiskBadge satDecayRisk-${(c.decayRisk || "low").toLowerCase()}`}>{c.decayRisk}</span></td>
                              <td><span className={`satDecayTierBadge satDecayTier-${c.tier || "heuristic"}`}>{c.tier === "highConfidence" ? "High Conf" : "Heuristic"}</span></td>
                              <td><b>{c.des}</b></td>
                              <td>{c.range}</td>
                              <td>{c.nImp}</td>
                              <td>{c.ipScientific}</td>
                              <td style={{ color: parseFloat(c.psCum) > -3 ? "#FF9500" : "#4ecdc4" }}>{c.psCum}</td>
                              <td style={{ color: torinoColor(parseInt(c.tsMax)) }}>{c.tsMax}</td>
                              <td>{c.diameter ? `${c.diameter} km` : "—"}</td>
                              <td>{c.h !== null && c.h !== undefined ? c.h.toFixed(1) : "—"}</td>
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
              <StatTile label="Total Monitored" value={stats.total} sub="Sentry Impact-Monitoring Objects" accent="#42a5f5" large />
              <StatTile label="Torino > 0" value={stats.torinoNonZero} color="#FF9500" accent="#FF9500" sub="Meriting Attention" />
              <StatTile label="Palermo > 0" value={stats.palermoAboveZero} color="#ff6b6b" accent="#ff6b6b" sub="Above Background Risk" />
              <StatTile label="Imminent" value={stats.imminent} color="#ff6b6b" accent="#ff6b6b" />
              <StatTile label="High" value={stats.high} color="#FF9500" accent="#FF9500" />
              <StatTile label="Moderate" value={stats.moderate} color="#ffd93d" accent="#ffd93d" />
              <StatTile label="Low" value={stats.low} color="#7fe9e1" accent="#7fe9e1" />
              <StatTile label="Mean Diameter" value={stats.avgDiameter.toFixed(3)} unit="km" accent="#42a5f5" />
              <StatTile label="Largest Object" value={stats.maxDiameter.toFixed(3)} unit="km" color="#ff6b6b" accent="#ff6b6b" />
            </div>
            <div className="satPanelCard">
              <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faBookOpen} /> Sentry Methodology</span></div>
              <div className="satPanelCardBody">
                <div className="satBriefingGrid">
                  <div className="satBriefingItem"><b>Impact Probability</b><p>The cumulative impact probability is the sum of all virtual impactor probabilities over the 100-year prediction window. Even small values are noteworthy because the analytical floor is roughly 1e-10.</p></div>
                  <div className="satBriefingItem"><b>Palermo Scale</b><p>{methodology?.palermoFormulation || "Log10(P_impact / (E_impact × T))"} is the formulation, and positive values mean impact likelihood exceeds the integrated background risk over the time window.</p></div>
                  <div className="satBriefingItem"><b>Torino Scale</b><p>This 0-10 integer combines impact probability and kinetic energy. Most listed objects are 0-1, occasionally rising to 2-4 before re-observation eliminates the impact possibility.</p></div>
                  <div className="satBriefingItem"><b>Confidence Tiers</b><p><b>High Confidence:</b> {methodology?.highConfidenceCriterion || "Diameter > 0.14 km AND Torino > 0"} is the criterion, and these objects pose a detectable hazard that warrants active observation campaigns. <b>Heuristic:</b> Smaller or lower-Torino objects stay on the watch list pending orbit refinement.</p></div>
                  <div className="satBriefingItem"><b>Risk Tiers</b><p>Imminent means the closest virtual impactor is within 10 years, high means 10 to 30 years, moderate means 30 to 60 years, and low means 60 to 100 years. These are based on the impact-window center, not probability.</p></div>
                  <div className="satBriefingItem"><b>Limitations</b><p>Sentry uses linearized covariance propagation and Monte Carlo sampling of orbital uncertainty. Yarkovsky thermal drift is included for objects where it is constrained. Objects exit Sentry once the observation arc grows enough to eliminate the impact possibility.</p></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const FlybyPredictionsTab = ({ asteroid, observerLocation, onLocationChange, onPickLocation, currentDate }) => {
  const [hours, setHours] = useState(168);
  const [computing, setComputing] = useState(false);
  const [predictions, setPredictions] = useState([]);
  const currentDateRef = useRef(currentDate);

  useEffect(() => { currentDateRef.current = currentDate; }, [currentDate]);

  const compute = useCallback(() => {
    if (!asteroid || !asteroid.elements) return;
    setComputing(true);
    setTimeout(() => {
      const now = currentDateRef.current || new Date();
      const points = [];
      const samples = 240;
      for (let i = 0; i <= samples; i++) {
        const t = new Date(now.getTime() + (i / samples) * hours * 3600000);
        const satPos = propagateAsteroid(asteroid, t);
        const earthPos = propagateEarth(t);
        if (!satPos || !earthPos) continue;
        const dist = satPos.distanceTo(earthPos) / ORBITAL_CONSTANTS.SCALE_FACTOR;
        points.push({ time: t.toISOString(), value: dist });
      }
      setPredictions(points);
      setComputing(false);
    }, 50);
  }, [asteroid, hours]);

  useEffect(() => { compute(); }, [compute]);

  if (!asteroid || !asteroid.elements) {
    return (
      <div className="satDossierTabContent">
        <div className="satPanelEmpty">No orbital elements are available for flyby prediction.</div>
      </div>
    );
  }

  const minPoint = predictions.length > 0 ? predictions.reduce((m, p) => p.value < m.value ? p : m, predictions[0]) : null;

  return (
    <div className="satDossierTabContent">
      <div className="satPanelCard">
        <div className="satPanelCardHeader">
          <span><FontAwesomeIcon icon={faTowerBroadcast} /> Earth Approach Prediction</span>
          <button className="satPassComputeButton" onClick={compute}>
            <FontAwesomeIcon icon={computing ? faSpinner : faRoute} spin={computing} /> {computing ? "Computing" : "Recompute"}
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
              <input key={`alt-${observerLocation?.alt ?? "x"}`} type="number" placeholder="0" defaultValue={observerLocation?.alt ?? 0} disabled={!observerLocation} onBlur={(event) => { const v = parseFloat(event.target.value); if (!isNaN(v) && observerLocation) onLocationChange({ ...observerLocation, alt: v }); }} />
            </div>
            <div className="satPassField">
              <label>Window (h)</label>
              <input type="number" min="24" max="8760" value={hours} onChange={(event) => setHours(Math.max(24, Math.min(8760, parseInt(event.target.value) || 168)))} />
            </div>
            <div className="satPassField">
              <label>Quick Set</label>
              <button className="satPassLocationButton" onClick={onPickLocation}><FontAwesomeIcon icon={faMapLocation} /> Set Location</button>
            </div>
          </div>
        </div>
      </div>

      {minPoint && (
        <div className="satPanelCard">
          <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faRoute} /> Closest Approach in Window</span></div>
          <div className="satPanelCardBody">
            <div className="satDossierStrip">
              <div className="satDossierCell"><div className="satDossierCellLabel">Time (UTC)</div><div className="satDossierCellValue">{formatChartTimeFull(minPoint.time)}</div></div>
              <div className="satDossierCell" style={{ borderLeftColor: moidColor(minPoint.value) }}><div className="satDossierCellLabel">Distance</div><div className="satDossierCellValue" style={{ color: moidColor(minPoint.value) }}>{minPoint.value.toFixed(6)}<span>AU</span></div></div>
              <div className="satDossierCell"><div className="satDossierCellLabel">Lunar Distances</div><div className="satDossierCellValue">{(minPoint.value * AU_KM / 384400).toFixed(2)}<span>LD</span></div></div>
              <div className="satDossierCell"><div className="satDossierCellLabel">Distance (km)</div><div className="satDossierCellValue">{Math.round(minPoint.value * AU_KM).toLocaleString()}</div></div>
            </div>
          </div>
        </div>
      )}

      <div className="satPanelCard">
        <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faChartArea} /> Earth-Object Distance Over Window</span></div>
        <div className="satPanelCardBody">
          <ChartCanvas values={predictions} height={200} accent="#42a5f5" colorFn={(v) => moidColor(v)} label="Heliocentric Distance to Earth" unit="AU" valueFormatter={(v) => v.toFixed(4)} threshold={0.05} thresholdLabel="PHA Threshold (0.05 AU)" />
        </div>
      </div>
    </div>
  );
};

const MissionIntelligenceTab = ({ asteroid, intelligence, loading, onRefresh }) => {
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
              {intelligence.partialStages && intelligence.partialStages.length > 0 && (<small>Partial Stages Completed: {intelligence.partialStages.join(", ")}</small>)}
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
          {intelligence.fromCache ? `Cached ${intelligence.cacheAgeMinutes || 0}m Ago` : `Generated ${formatGeneratedAt(intelligence.generatedAt)}`} · model: {intelligence.model} · {intelligence.stages || 1} stage{(intelligence.stages || 1) > 1 ? "s" : ""}
          {tokenSummary && tokenSummary.total !== undefined && ` · tokens: ${tokenSummary.total}`}
          {intelligence.partialStages && intelligence.partialStages.length > 0 && ` · partial: ${intelligence.partialStages.join("/")}`}
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
          <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faBrain} /> Discovery & Mission Brief</span></div>
          <div className="satPanelCardBody"><p className="satMissionBriefText">{safeRenderText(intel.missionBrief)}</p></div>
        </div>
      )}

      <div className="satPanelCard">
        <div className="satPanelCardHeader"><span>Discovery Provenance</span></div>
        <div className="satPanelCardBody">
          <div className="satDossierStrip">
            <div className="satDossierCell"><div className="satDossierCellLabel">Discoverer</div><div className="satDossierCellValue">{safeRenderText(intel.operator)}</div></div>
            <div className="satDossierCell"><div className="satDossierCellLabel">Discovery Date</div><div className="satDossierCellValue">{safeRenderText(intel.launchDate)}</div></div>
            <div className="satDossierCell"><div className="satDossierCellLabel">Discovery Survey</div><div className="satDossierCellValue">{safeRenderText(intel.launchVehicle)}</div></div>
            <div className="satDossierCell"><div className="satDossierCellLabel">Observatory</div><div className="satDossierCellValue">{safeRenderText(intel.launchSite)}</div></div>
            <div className="satDossierCell" style={{ borderLeftColor: intel.missionStatus === "Active" ? "#4ecdc4" : "#FF9500" }}><div className="satDossierCellLabel">Object Status</div><div className="satDossierCellValue" style={{ color: intel.missionStatus === "Active" ? "#4ecdc4" : "#FF9500" }}>{safeRenderText(intel.missionStatus)}</div></div>
            <div className="satDossierCell"><div className="satDossierCellLabel">Provisional Designation</div><div className="satDossierCellValue">{safeRenderText(intel.internationalDesignator)}</div></div>
          </div>
        </div>
      </div>

      {intel.factSheet && (
        <div className="satPanelCard">
          <div className="satPanelCardHeader"><span>Physical Properties Fact Sheet</span></div>
          <div className="satPanelCardBody">
            <div className="satDossierStrip">
              <div className="satDossierCell"><div className="satDossierCellLabel">Spectral Type</div><div className="satDossierCellValue">{safeRenderText(intel.factSheet.manufacturer)}</div></div>
              <div className="satDossierCell"><div className="satDossierCellLabel">Composition</div><div className="satDossierCellValue">{safeRenderText(intel.factSheet.bus)}</div></div>
              <div className="satDossierCell"><div className="satDossierCellLabel">Estimated Mass</div><div className="satDossierCellValue">{safeRenderText(intel.factSheet.mass)}</div></div>
              <div className="satDossierCell"><div className="satDossierCellLabel">Albedo</div><div className="satDossierCellValue">{safeRenderText(intel.factSheet.power)}</div></div>
              <div className="satDossierCell"><div className="satDossierCellLabel">Rotation Period</div><div className="satDossierCellValue">{safeRenderText(intel.factSheet.designLife)}</div></div>
              <div className="satDossierCell"><div className="satDossierCellLabel">Pole Direction</div><div className="satDossierCellValue">{safeRenderText(intel.factSheet.propulsion)}</div></div>
              <div className="satDossierCell"><div className="satDossierCellLabel">Binary System</div><div className="satDossierCellValue">{safeRenderText(intel.factSheet.stabilization)}</div></div>
            </div>
          </div>
        </div>
      )}

      {intel.instruments && intel.instruments.length > 0 && (
        <div className="satPanelCard">
          <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faMicrochip} /> Spacecraft Visits / Mission Targets</span></div>
          <div className="satPanelCardBody">
            <div className="satInstrumentList">
              {intel.instruments.map((inst, i) => (<span key={i} className="satInstrumentChip">{safeRenderText(inst)}</span>))}
            </div>
          </div>
        </div>
      )}

      {intel.scientificContribution && (
        <div className="satPanelCard">
          <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faMicroscope} /> Scientific Significance</span></div>
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
          <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faCircleNodes} /> Population Family Context</span></div>
          <div className="satPanelCardBody"><p className="satMissionBriefText">{safeRenderText(intel.constellationContext)}</p></div>
        </div>
      )}

      {intel.riskAssessment && (
        <div className="satPanelCard">
          <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faTriangleExclamation} /> Risk Assessment</span></div>
          <div className="satPanelCardBody">
            <div className="satRiskGrid">
              <div className="satRiskItem"><b>Orbit Arc</b><p>{safeRenderText(intel.riskAssessment.tleAgeRisk)}</p></div>
              <div className="satRiskItem"><b>Impact Risk</b><p>{safeRenderText(intel.riskAssessment.decayRisk)}</p></div>
              <div className="satRiskItem"><b>Close Approach</b><p>{safeRenderText(intel.riskAssessment.conjunctionRisk)}</p></div>
              <div className="satRiskItem"><b>Operational</b><p>{safeRenderText(intel.riskAssessment.operationalRisk)}</p></div>
              {intel.riskAssessment.cyberRisk && <div className="satRiskItem"><b>Mission Window</b><p>{safeRenderText(intel.riskAssessment.cyberRisk)}</p></div>}
              {intel.riskAssessment.regulatoryRisk && <div className="satRiskItem"><b>Treaty / Policy</b><p>{safeRenderText(intel.riskAssessment.regulatoryRisk)}</p></div>}
            </div>
          </div>
        </div>
      )}

      {intel.geopoliticalSignificance && (
        <div className="satPanelCard">
          <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faGlobe} /> Geopolitical / Defense Significance</span></div>
          <div className="satPanelCardBody"><p className="satMissionBriefText">{safeRenderText(intel.geopoliticalSignificance)}</p></div>
        </div>
      )}

      {intel.commercialContext && (
        <div className="satPanelCard">
          <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faChartColumn} /> Commercial / Resource Context</span></div>
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

const ObservationsTab = ({ asteroid, observation, loading, onRefresh }) => {
  const a = asteroid?.semiMajorAxisAU || 0;
  const e = asteroid?.eccentricity || 0;
  const perihelion = asteroid?.perihelionAU || 0;
  const aphelion = asteroid?.aphelionAU || 0;
  const period = asteroid?.orbitalPeriodYears || 0;

  const isInner = perihelion < 1.0;
  const isMainBelt = a >= 2.0 && a <= 3.5;
  const isOuter = a > 5.0;
  const isPHA = asteroid?.isPHA;

  let visibilityClass = "Unknown";
  let visibilityColor = "#808080";
  let visibilityNote = "There is not enough orbital data to estimate observability.";

  const h = asteroid?.h;
  if (h !== null && h !== undefined) {
    if (h < 18 && isInner) {
      visibilityClass = "Naked Eye Possible";
      visibilityColor = "#4ecdc4";
      visibilityNote = "Bright NEO with absolute magnitude H<18. During favorable close approaches it can reach naked-eye visibility (V mag < 6) for observers in dark sky locations.";
    } else if (h < 22 && (isInner || isMainBelt)) {
      visibilityClass = "Binocular";
      visibilityColor = "#7fe9e1";
      visibilityNote = "This is a moderately bright object, so binoculars or a small telescope are required during opposition or close approaches. Its apparent magnitude is typically V 8-12.";
    } else if (h < 26) {
      visibilityClass = "Telescope";
      visibilityColor = "#FF9500";
      visibilityNote = "A telescope is required. The object is visible only in 8-inch or larger amateur instruments under dark skies during favorable apparitions, at an apparent magnitude of V 12-18.";
    } else {
      visibilityClass = "Specialized";
      visibilityColor = "#7fe9e1";
      visibilityNote = "This faint object requires large-aperture telescopes, CCD imaging, and tracking, so it is beyond the reach of casual observation.";
    }
  }

  const enrichRef = (label) => {
    if (!label) return "";
    if (label === "JPL SBDB Browser") return "This is the authoritative source for orbit elements, physical parameters, and observation arc data for known small bodies.";
    if (label === "Minor Planet Center") return "This IAU-sanctioned catalog provides discovery circulars, observation logs, and ephemerides.";
    if (label === "JPL Horizons") return "This high-precision ephemeris service provides state vectors and topocentric ephemerides at arbitrary epochs.";
    if (label === "CNEOS Close Approach Tables") return "This database lists past and predicted close approaches to Earth and other planets.";
    if (label === "CNEOS Sentry") return "This automated impact-monitoring system tracks objects with a non-zero impact probability over the next century.";
    if (label.toLowerCase().includes("wikipedia")) return "This reference article covers discovery context, scientific significance, and physical characterization.";
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
        <div className="satDossierCell"><div className="satDossierCellLabel">Population</div><div className="satDossierCellValue">{asteroid?.category || "—"}</div></div>
        <div className="satDossierCell"><div className="satDossierCellLabel">Semi-Major Axis</div><div className="satDossierCellValue">{a.toFixed(3)}<span>AU</span></div></div>
        <div className="satDossierCell"><div className="satDossierCellLabel">Period</div><div className="satDossierCellValue">{period.toFixed(2)}<span>Years</span></div></div>
        <div className="satDossierCell"><div className="satDossierCellLabel">Perihelion</div><div className="satDossierCellValue">{perihelion.toFixed(3)}<span>AU</span></div></div>
        <div className="satDossierCell"><div className="satDossierCellLabel">Aphelion</div><div className="satDossierCellValue">{aphelion.toFixed(3)}<span>AU</span></div></div>
        <div className="satDossierCell"><div className="satDossierCellLabel">Designation</div><div className="satDossierCellValue">{asteroid?.designation || "—"}</div></div>
        {isPHA && <div className="satDossierCell" style={{ borderLeftColor: "#ff6b6b" }}><div className="satDossierCellLabel">Hazard Class</div><div className="satDossierCellValue" style={{ color: "#ff6b6b" }}>PHA</div></div>}
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

      {observation.closeApproaches && observation.closeApproaches.length > 0 && (
        <div className="satPanelCard">
          <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faClock} /> Recorded Close Approaches</span></div>
          <div className="satPanelCardBody">
            <div className="satTableScroll">
              <AdaptiveTable>
                <thead><tr><th>Date</th><th>Body</th><th>Distance (LD)</th><th>Distance (AU)</th><th>v_rel km/s</th></tr></thead>
                <tbody>
                  {observation.closeApproaches.map((c, i) => (
                    <tr key={i}>
                      <td>{c.date}</td>
                      <td>{c.body || "Earth"}</td>
                      <td style={{ color: moidColor(c.distAU) }}>{c.distLD?.toFixed(3)}</td>
                      <td>{c.distAU?.toFixed(6)}</td>
                      <td>{c.vRel?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </AdaptiveTable>
            </div>
          </div>
        </div>
      )}

      {observation.physicalProperties && (
        <div className="satPanelCard">
          <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faAtom} /> Physical Properties</span></div>
          <div className="satPanelCardBody">
            <div className="satDossierStrip">
              {observation.physicalProperties.diameter && <div className="satDossierCell"><div className="satDossierCellLabel">Diameter</div><div className="satDossierCellValue">{observation.physicalProperties.diameter}<span>km</span></div></div>}
              {observation.physicalProperties.albedo && <div className="satDossierCell"><div className="satDossierCellLabel">Albedo</div><div className="satDossierCellValue">{observation.physicalProperties.albedo}</div></div>}
              {observation.physicalProperties.rotationPeriod && <div className="satDossierCell"><div className="satDossierCellLabel">Rotation Period</div><div className="satDossierCellValue">{observation.physicalProperties.rotationPeriod}<span>Hours</span></div></div>}
              {observation.physicalProperties.spectralType && <div className="satDossierCell"><div className="satDossierCellLabel">Spectral Type</div><div className="satDossierCellValue">{observation.physicalProperties.spectralType}</div></div>}
              {observation.physicalProperties.h !== undefined && <div className="satDossierCell"><div className="satDossierCellLabel">Absolute Magnitude H</div><div className="satDossierCellValue">{observation.physicalProperties.h?.toFixed(2)}</div></div>}
              {observation.physicalProperties.gm && <div className="satDossierCell"><div className="satDossierCellLabel">GM</div><div className="satDossierCellValue">{observation.physicalProperties.gm}<span>Km³/s²</span></div></div>}
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

const OrbitArcTab = ({ asteroid }) => {
  const [rangeKey, setRangeKey] = useState("5y");
  const [history, setHistory] = useState({ frames: [], loading: false, error: null, backfill: null, supported: false });
  const productKey = asteroid?.spkid || asteroid?.designation || asteroid?.name ? `${SOURCES.harvest.productPrefix}${String(asteroid.spkid || asteroid.designation || asteroid.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}` : null;
  const range = SOURCES.harvest.historyRanges.find(([key]) => key === rangeKey) || SOURCES.harvest.historyRanges[1];

  useEffect(() => {
    if (!productKey) return undefined;
    let cancelled = false;
    const load = async () => {
      setHistory((prev) => ({ ...prev, loading: true, error: null }));
      const to = new Date(Date.now() + 365 * 86400000);
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
    const to = new Date(Date.now() + 365 * 86400000);
    const from = new Date(to.getTime() - range[2] * 1000);
    const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString(), format: option[1] });
    window.open(`${SOURCES.harvest.base}/products/${encodeURIComponent(productKey)}/export?${params.toString()}`, "_blank", "noopener");
  };

  const latestSets = history.frames.slice(-12).reverse();

  const ageDays = asteroid.observationArcDays;
  const errorEnvelope1y = ageDays !== null && ageDays !== undefined ? Math.max(100, 10000 / Math.max(1, ageDays / 365)) : null;
  const errorEnvelope10y = ageDays !== null && ageDays !== undefined ? Math.max(1000, 100000 / Math.max(1, ageDays / 365)) : null;
  return (
    <div className="satDossierTabContent">
      <div className="satPanelCard">
        <div className="satPanelCardHeader"><span>Orbit Determination Quality</span></div>
        <div className="satPanelCardBody">
          <div className="satDossierStrip">
            <div className="satDossierCell"><div className="satDossierCellLabel">Epoch</div><div className="satDossierCellValue">{asteroid.epochISO || "Unknown"}</div></div>
            <div className="satDossierCell" style={{ borderLeftColor: orbitArcAgeColor(ageDays) }}><div className="satDossierCellLabel">Observation Arc</div><div className="satDossierCellValue" style={{ color: orbitArcAgeColor(ageDays) }}>{ageDays !== null && ageDays !== undefined ? Math.round(ageDays) : "?"}<span>Days</span></div></div>
            <div className="satDossierCell" style={{ borderLeftColor: orbitArcAgeColor(ageDays) }}><div className="satDossierCellLabel">Quality Class</div><div className="satDossierCellValue" style={{ color: orbitArcAgeColor(ageDays) }}>{orbitArcAgeLabel(ageDays)}</div></div>
            <div className="satDossierCell"><div className="satDossierCellLabel">Number of Observations</div><div className="satDossierCellValue">{asteroid.numObs || "?"}</div></div>
            <div className="satDossierCell"><div className="satDossierCellLabel">Position Error +1y</div><div className="satDossierCellValue">{errorEnvelope1y !== null ? `~${errorEnvelope1y.toFixed(0)}` : "?"}<span>km</span></div></div>
            <div className="satDossierCell"><div className="satDossierCellLabel">Position Error +10y</div><div className="satDossierCellValue">{errorEnvelope10y !== null ? `~${errorEnvelope10y.toFixed(0)}` : "?"}<span>km</span></div></div>
          </div>
        </div>
      </div>
      <div className="satPanelCard">
        <div className="satPanelCardHeader"><span>Raw Orbital Elements (J2000 Heliocentric Ecliptic)</span></div>
        <div className="satPanelCardBody">
          <pre className="satTLEBlock">
{`Epoch JD:        ${asteroid.elements?.epoch || "?"}
Semi-Major Axis: ${asteroid.elements?.a?.toFixed(8) || "?"} AU
Eccentricity:    ${asteroid.elements?.e?.toFixed(8) || "?"}
Inclination:     ${asteroid.elements?.i?.toFixed(6) || "?"}°
Long. Asc Node:  ${asteroid.elements?.om?.toFixed(6) || "?"}°
Arg. Perihelion: ${asteroid.elements?.w?.toFixed(6) || "?"}°
Mean Anomaly:    ${asteroid.elements?.ma?.toFixed(6) || "?"}°`}
          </pre>
        </div>
      </div>
      <div className="satPanelCard satTleHistoryCard">
        <div className="satPanelCardHeader">
          <span><FontAwesomeIcon icon={faChartLine} /> Element History</span>
          <div className="satTleHistoryControls">
            {SOURCES.harvest.historyRanges.map(([key, label]) => (
              <button key={key} className={`satSatelliteSelectButton ${rangeKey === key ? "satSatelliteButtonActive" : ""}`} onClick={() => setRangeKey(key)}>{label}</button>
            ))}
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
                    ? "No element sets were recorded in this window yet."
                    : "No element sets were recorded in this window yet, and the harvester builds this history as JPL publishes new orbit solutions."}
            </div>
          )}
          {history.frames.length > 0 && (
            <>
              <div className="satTleHistoryCharts">
                <ChartCanvas values={history.frames} valueKey="perihelionAU" height={150} accent="#4ecdc4" label="Perihelion" unit="AU" valueFormatter={(v) => v.toFixed(5)} />
                <ChartCanvas values={history.frames} valueKey="aphelionAU" height={150} accent="#42a5f5" label="Aphelion" unit="AU" valueFormatter={(v) => v.toFixed(5)} />
                <ChartCanvas values={history.frames} valueKey="moidAU" height={150} accent="#FF9500" label="Earth MOID" unit="AU" valueFormatter={(v) => v.toFixed(6)} />
                <ChartCanvas values={history.frames} valueKey="eccentricity" height={150} accent="#ffd93d" label="Eccentricity" unit="" valueFormatter={(v) => v.toFixed(6)} />
              </div>
              <div className="satTableScroll">
                <AdaptiveTable>
                  <thead>
                    <tr><th>Epoch</th><th>Perihelion (AU)</th><th>Aphelion (AU)</th><th>Period (Years)</th><th>Inclination (°)</th><th>Earth MOID (AU)</th><th>Source</th></tr>
                  </thead>
                  <tbody>
                    {latestSets.map((set) => (
                      <tr key={set.time}>
                        <td>{new Date(set.time).toLocaleString()}</td>
                        <td>{Number.isFinite(set.perihelionAU) ? set.perihelionAU.toFixed(5) : "—"}</td>
                        <td>{Number.isFinite(set.aphelionAU) ? set.aphelionAU.toFixed(5) : "—"}</td>
                        <td>{Number.isFinite(set.periodYears) ? set.periodYears.toFixed(3) : "—"}</td>
                        <td>{Number.isFinite(set.inclination) ? set.inclination.toFixed(4) : "—"}</td>
                        <td>{Number.isFinite(set.moidAU) ? set.moidAU.toFixed(6) : "—"}</td>
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

const CLOSE_APPROACH_SORT_OPTIONS = [["distance", "Closest First"], ["severity", "Most Severe"]];

const RISK_FILTER_OPTIONS = [["all", "All"], ["imminent", "Imminent"], ["high", "High"], ["moderate", "Moderate"], ["low", "Low"]];

const SENTRY_SORT_OPTIONS = [["palermo", "Palermo Descending"], ["torino", "Torino Descending"], ["ip", "Impact Probability"], ["diameter", "Largest First"]];

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

const ALERT_KIND_LABELS = { impactRisk: "Impact Risk", unconfirmed: "Unconfirmed Object", closeApproach: "Close Approach", fireball: "Fireball", fireballNear: "Fireball Near Location" };

const ALERT_DETAIL_LABELS = { designation: "Designation", impactProbability: "Impact Probability", torinoMax: "Torino Scale (Max)", palermoMax: "Palermo Scale (Max)", palermoCumulative: "Palermo Scale (Cumulative)", potentialImpacts: "Potential Impacts", impactYears: "Impact Years", diameterKm: "Diameter (km)", absoluteMagnitude: "Absolute Magnitude (H)", entryVelocityKms: "Entry Velocity (km/s)", lastObservation: "Last Observation", impactRating: "Impact Rating", neoScore: "NEO Score", phaScore: "PHA Score", observations: "Observations", arcHours: "Observation Arc (H)", moidAu: "MOID (AU)", visualMagnitude: "Visual Magnitude", distanceKm: "Nominal Distance (km)", lunarDistances: "Lunar Distances", minimumDistanceKm: "Minimum Distance (km)", relativeVelocityKms: "Relative Velocity (km/s)", timeUncertainty: "Time Uncertainty", impactEnergyKt: "Impact Energy (kt)", radiatedEnergy: "Radiated Energy (×10¹⁰ J)", altitudeKm: "Altitude (km)", velocityKms: "Velocity (km/s)" };

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
  [item.kind === "closeApproach" ? "Closest Approach" : item.kind === "fireball" || item.kind === "fireballNear" ? "Detected" : "Event Time", formatAlertTime(item.eventAt)],
  ["Expires", formatAlertTime(item.expiresAt)],
  ["Impact Point", Number.isFinite(item.lat) && Number.isFinite(item.lon) ? `${item.lat.toFixed(2)}°, ${item.lon.toFixed(2)}°` : null],
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

const OBLIQUITY_J2000_RAD = 23.4392911 * Math.PI / 180;

const greenwichSiderealDegrees = (date) => {
  const value = (280.46061837 + 360.98564736629 * (dateToJulianDate(date) - 2451545.0)) % 360;
  return value < 0 ? value + 360 : value;
};

const subObserverPoint = (position, earthPosition, gmstDeg) => {
  const scale = ORBITAL_CONSTANTS.SCALE_FACTOR;
  const x = (position.x - earthPosition.x) / scale;
  const y = -(position.z - earthPosition.z) / scale;
  const z = (position.y - earthPosition.y) / scale;
  const distance = Math.sqrt(x * x + y * y + z * z);
  if (!Number.isFinite(distance) || distance <= 0) return null;
  const cosE = Math.cos(OBLIQUITY_J2000_RAD);
  const sinE = Math.sin(OBLIQUITY_J2000_RAD);
  const ey = y * cosE - z * sinE;
  const ez = y * sinE + z * cosE;
  const ra = Math.atan2(ey, x) * 180 / Math.PI;
  const dec = Math.asin(Math.max(-1, Math.min(1, ez / distance))) * 180 / Math.PI;
  let lon = (ra - gmstDeg) % 360;
  if (lon > 180) lon -= 360;
  if (lon < -180) lon += 360;
  return { lat: dec, lon, distanceAu: distance };
};

const earthBasisMatrix = new THREE.Matrix4();

const orientEarth = (mesh, date) => {
  if (!mesh) return;
  const g = greenwichSiderealDegrees(date) * Math.PI / 180;
  const cosE = Math.cos(OBLIQUITY_J2000_RAD);
  const sinE = Math.sin(OBLIQUITY_J2000_RAD);
  const cosG = Math.cos(g);
  const sinG = Math.sin(g);
  const xAxis = new THREE.Vector3(cosG, -sinG * sinE, -sinG * cosE);
  const yAxis = new THREE.Vector3(0, cosE, -sinE);
  const zAxis = new THREE.Vector3(sinG, cosG * sinE, cosG * cosE);
  earthBasisMatrix.makeBasis(xAxis, yAxis, zAxis);
  mesh.quaternion.setFromRotationMatrix(earthBasisMatrix);
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
          <div ref={libreContainerRef} className="satEarthCondPickerCanvas" style={{ display: provider === "maplibre" ? "block" : "none" }} />
          <div ref={appleContainerRef} className="satEarthCondPickerCanvas" style={{ display: provider === "apple" ? "block" : "none" }} />
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

const AsteroidTracker = () => {
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
  const [asteroids, setAsteroids] = useState([]);
  useEffect(() => {
    if (asteroids.length) setLastDataUpdate(new Date());
  }, [asteroids]);
  const [filteredAsteroids, setFilteredAsteroids] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [targetFps, setTargetFps] = useState(60);
  const [actualFps, setActualFps] = useState(60);
  const [currentTime, setCurrentTime] = useState("");
  const [isPlaying, setIsPlaying] = useState(true);
  const [showOrbits, setShowOrbits] = useState(true);
  const [showTrails, setShowTrails] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [showEclipticGrid, setShowEclipticGrid] = useState(true);
  const [showAxisMarkers, setShowAxisMarkers] = useState(true);
  const [showEarth, setShowEarth] = useState(true);
  const [mapGlobe, setMapGlobe] = useState(true);
  const [viewMode, setViewMode] = useState("3d");
  const [showOrbitalZones, setShowOrbitalZones] = useState(true);
  const [showDistanceRings, setShowDistanceRings] = useState(true);
  const [bloomEnabled, setBloomEnabled] = useState(true);
  const [bloomStrength, setBloomStrength] = useState(0.8);
  const [bloomRadius, setBloomRadius] = useState(0.4);
  const [bloomThreshold, setBloomThreshold] = useState(0.25);
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
  const [detailedAsteroid, setDetailedAsteroid] = useState(null);
  const [selectedAsteroid, setSelectedAsteroid] = useState(null);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [theme, setTheme] = useState("dark");
  const [sceneInitialized, setSceneInitialized] = useState(false);
  const [performanceStats, setPerformanceStats] = useState({ renderTime: 0, memoryUsage: 0, triangles: 0, drawCalls: 0, lines: 0, textures: 0, geometries: 0, visibleAsteroids: 0, culledAsteroids: 0 });
  const [virtualScrollOffset, setVirtualScrollOffset] = useState(0);
  const [neoWatch, setNEOWatch] = useState(null);
  const [neoWatchLoading, setNEOWatchLoading] = useState(false);
  const [neoWatchExpanded, setNEOWatchExpanded] = useState(false);
  const [neoWatchAI, setNEOWatchAI] = useState(null);
  const [neoWatchAILoading, setNEOWatchAILoading] = useState(false);
  const [missionIntelMap, setMissionIntelMap] = useState(new Map());
  const [missionIntelLoading, setMissionIntelLoading] = useState(false);
  const [observationMap, setObservationMap] = useState(new Map());
  const [observationLoading, setObservationLoading] = useState(false);
  const [activeDossierTab, setActiveDossierTab] = useState("orbital");
  const [observerLocation, setObserverLocation] = useState(null);
  const [closeApproaches, setCloseApproaches] = useState([]);
  const [closeApproachThreshold, setCloseApproachThreshold] = useState(0.05);
  const [showCloseApproachPanel, setShowCloseApproachPanel] = useState(false);
  const [phaCatalog, setPHACatalog] = useState(null);
  const [phaLoading, setPHALoading] = useState(false);
  const [showPHAPanel, setShowPHAPanel] = useState(false);
  const [sentryCandidates, setSentryCandidates] = useState([]);
  const [sentryMethodology, setSentryMethodology] = useState(null);
  const [sentryLoading, setSentryLoading] = useState(false);
  const [showSentryPanel, setShowSentryPanel] = useState(false);
  const [colorByObservationArc, setColorByObservationArc] = useState(false);
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
      const response = await fetch(`${apiUrl("asteroidAlerts")}?points=${encodeURIComponent(alertPoints)}`);
      const data = await response.json().catch(() => null);
      if (!response.ok || !data || !data.success) throw new Error((data && data.message) || `The alerts request returned status ${response.status}.`);
      setAlertsData(data);
      setAlertsError(null);
    } catch (error) {
      setAlertsError(`The asteroid alerts could not be loaded because of the error "${errorText(error)}".`);
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
      if (alert.global !== false) list.push({ ...alert, key: `${alert.identity}|${alert.severity}`, placeId: null, placeLabel: null });
      if (alert.kind !== "fireball" || !alert.distances) continue;
      for (const [pointId, distanceKm] of Object.entries(alert.distances)) {
        const label = placeLabel(pointId);
        if (!label || distanceKm > alert.nearRadiusKm) continue;
        list.push({
          ...alert,
          kind: "fireballNear",
          identity: `fireballnear|${alert.identity}|${pointId}`,
          key: `fireballnear|${alert.identity}|${pointId}|WARNING`,
          severity: "WARNING",
          title: `${alert.title} Near ${label}`,
          message: `${alert.message} The fireball was ${distanceKm.toLocaleString()} km from ${label}, inside the ${alert.nearRadiusKm.toLocaleString()} km proximity radius.`,
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
    const nearby = (alertItems || []).filter((entry) => entry.kind === "fireballNear" && entry.identity.startsWith(`fireballnear|${item.kind === "fireballNear" ? item.identity.split("|").slice(1, 3).join("|") : item.identity}|`)).map((entry) => ({ label: entry.placeLabel, distanceKm: entry.distanceKm }));
    fetch(apiUrl("alertAnalysis"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alert: { key: item.key, kind: item.kind, title: item.title, message: item.message, severity: item.severity, source: item.source, issuedAt: item.issuedAt, eventAt: item.eventAt, expiresAt: item.expiresAt, lat: item.lat, lon: item.lon, nearRadiusKm: item.nearRadiusKm, nearby, details: item.details || {} } })
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
  const sunRef = useRef(null);
  const earthMarkerRef = useRef(null);
  const asteroidGroupRef = useRef(null);
  const simulationDateMsRef = useRef(Date.now());
  const frameCountRef = useRef(0);
  const lastFpsTime = useRef(0);
  const gridRef = useRef(null);
  const eclipticGridRef = useRef(null);
  const axisMarkersRef = useRef(null);
  const orbitalZonesRef = useRef(null);
  const distanceRingsRef = useRef(null);
  const hudPanelRef = useRef(null);
  const legendPanelRef = useRef(null);
  const controlsPanelRef = useRef(null);
  const detailedPanelRef = useRef(null);
  const controlsRef = useRef(null);
  const starsRef = useRef(null);
  const virtualScrollRef = useRef(null);
  const lastCloseApproachCheckRef = useRef(0);
  const activeTweensRef = useRef([]);
  const eventSourceRef = useRef(null);
  const intelAbortRef = useRef(null);
  const observationAbortRef = useRef(null);
  const lastSpeedSignRef = useRef(1);

  const orbitMetaRef = useRef(new Map());
  const asteroidInstanceRef = useRef(null);
  const glowInstanceRef = useRef(null);
  const orbitLinesRef = useRef({});
  const trailLinesRef = useRef({});
  const trailBuffersRef = useRef(new Map());
  const asteroidDataRef = useRef(new Map());
  const labelsRef = useRef({});
  const visibleAsteroidsRef = useRef(new Set());
  const frustumRef = useRef(new THREE.Frustum());
  const tempMatrix = useRef(new THREE.Matrix4());
  const tempColor = useRef(new THREE.Color());
  const tempSphere = useRef(new THREE.Sphere());
  const tempProjMatrix = useRef(new THREE.Matrix4());
  const tempVecRef = useRef(new THREE.Vector3());

  const asteroidsRef = useRef([]);
  const isPlayingRef = useRef(true);
  const speedMultiplierRef = useRef(1);
  const bloomEnabledRef = useRef(true);
  const targetFpsRef = useRef(60);
  const showOrbitsRef = useRef(true);
  const showTrailsRef = useRef(true);
  const showLabelsRef = useRef(true);
  const colorByObservationArcRef = useRef(false);
  const closeApproachThresholdRef = useRef(0.05);

  useEffect(() => { asteroidsRef.current = asteroids; }, [asteroids]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { speedMultiplierRef.current = speedMultiplier; }, [speedMultiplier]);
  useEffect(() => { bloomEnabledRef.current = bloomEnabled; }, [bloomEnabled]);
  useEffect(() => { targetFpsRef.current = targetFps; }, [targetFps]);
  useEffect(() => { showOrbitsRef.current = showOrbits; }, [showOrbits]);
  useEffect(() => { showTrailsRef.current = showTrails; }, [showTrails]);
  useEffect(() => { showLabelsRef.current = showLabels; }, [showLabels]);
  useEffect(() => { colorByObservationArcRef.current = colorByObservationArc; }, [colorByObservationArc]);
  useEffect(() => { closeApproachThresholdRef.current = closeApproachThreshold; }, [closeApproachThreshold]);

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

  const anyOverlayPanelOpen = hudVisible || !!detailedAsteroid || neoWatchExpanded || showCloseApproachPanel || showPHAPanel || showSentryPanel;

  const closeAllOverlayPanels = useCallback(() => {
    setHudVisible(false);
    setDetailedAsteroid(null);
    setNEOWatchExpanded(false);
    setShowCloseApproachPanel(false);
    setShowPHAPanel(false);
    setShowSentryPanel(false);
  }, []);

  const computeAllPositions = useCallback(() => {
    const date = new Date(simulationDateMsRef.current);
    const sats = asteroidsRef.current;
    for (let i = 0; i < sats.length; i++) {
      const asteroid = sats[i];
      if (!asteroid.active) continue;
      const position = propagateAsteroid(asteroid, date);
      if (position) {
        asteroidDataRef.current.set(asteroid.id, { position, lastUpdate: Date.now() });
      }
    }
    const earthPos = propagateEarth(date);
    if (earthPos) {
      asteroidDataRef.current.set("__earth__", { position: earthPos, lastUpdate: Date.now() });
      if (earthMarkerRef.current) {
        earthMarkerRef.current.position.copy(earthPos);
        orientEarth(earthMarkerRef.current, date);
      }
    }
  }, []);

  const performFrustumCulling = useCallback(() => {
    if (!cameraRef.current) return;
    const camera = cameraRef.current;
    tempProjMatrix.current.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustumRef.current.setFromProjectionMatrix(tempProjMatrix.current);

    const sats = asteroidsRef.current;
    const candidates = [];
    const MARGIN = PERFORMANCE_CONSTANTS.FRUSTUM_MARGIN;

    for (let i = 0; i < sats.length; i++) {
      const asteroid = sats[i];
      if (!asteroid.active) continue;
      const data = asteroidDataRef.current.get(asteroid.id);
      if (!data || !data.position) continue;
      if (!Number.isFinite(data.position.x) || !Number.isFinite(data.position.y) || !Number.isFinite(data.position.z)) continue;
      const dist = data.position.distanceTo(camera.position);
      if (dist >= 6000) continue;
      tempSphere.current.set(data.position, 2.0 * MARGIN);
      if (!frustumRef.current.intersectsSphere(tempSphere.current)) continue;
      candidates.push({ id: asteroid.id, dist });
    }

    candidates.sort((a, b) => a.dist - b.dist);

    const newVisible = new Set();
    const MAX = PERFORMANCE_CONSTANTS.MAX_VISIBLE_ASTEROIDS;
    const limit = Math.min(MAX, candidates.length);
    for (let i = 0; i < limit; i++) {
      newVisible.add(candidates[i].id);
    }
    visibleAsteroidsRef.current = newVisible;
  }, []);

  const writeInstanceBuffers = useCallback(() => {
    if (!asteroidInstanceRef.current || !glowInstanceRef.current) return;
    const visible = visibleAsteroidsRef.current;
    const sats = asteroidsRef.current;
    let idx = 0;
    for (let i = 0; i < sats.length; i++) {
      const asteroid = sats[i];
      if (!asteroid.active) continue;
      if (!visible.has(asteroid.id)) continue;
      const data = asteroidDataRef.current.get(asteroid.id);
      if (!data || !data.position) continue;
      if (!Number.isFinite(data.position.x)) continue;
      tempMatrix.current.makeTranslation(data.position.x, data.position.y, data.position.z);
      asteroidInstanceRef.current.setMatrixAt(idx, tempMatrix.current);
      glowInstanceRef.current.setMatrixAt(idx, tempMatrix.current);
      let baseColor = asteroid.color;
      if (colorByObservationArcRef.current) {
        baseColor = orbitArcAgeColor(asteroid.observationArcDays);
      }
      tempColor.current.set(baseColor);
      asteroidInstanceRef.current.setColorAt(idx, tempColor.current);
      data.instanceIndex = idx;
      idx++;
    }
    asteroidInstanceRef.current.count = idx;
    glowInstanceRef.current.count = idx;
    asteroidInstanceRef.current.instanceMatrix.needsUpdate = true;
    glowInstanceRef.current.instanceMatrix.needsUpdate = true;
    if (asteroidInstanceRef.current.instanceColor) {
      asteroidInstanceRef.current.instanceColor.needsUpdate = true;
    }
  }, []);

  const createLabel = useCallback((text, color) => {
    const div = document.createElement("div");
    div.className = "satellite-body-label";
    div.textContent = text;
    div.style.cssText = `color: ${color}; font-size: 11px; font-weight: 700; padding: 2px 6px; background: rgba(0, 0, 0, 0.8); border-radius: 3px; border: 1px solid ${color}; pointer-events: none; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; white-space: nowrap; position: absolute; z-index: 5; transform: translate(-50%, -50%); transition: none;`;
    return new LabelObject(div);
  }, []);

  const createOrbitLine = useCallback((asteroid) => {
    if (!asteroid.elements) return null;
    try {
      const orbitPoints = [];
      const segments = 96;
      const periodDays = (asteroid.orbitalPeriodYears || 1) * 365.25;
      const now = new Date(simulationDateMsRef.current);
      const directionSign = (speedMultiplierRef.current < 0) ? -1 : 1;

      for (let i = 0; i <= segments; i++) {
        const offset = directionSign * (i / segments) * periodDays * 86400000;
        const t = new Date(now.getTime() + offset);
        const pos = propagateAsteroid(asteroid, t);
        if (pos) orbitPoints.push(pos);
      }

      if (orbitPoints.length < 2) return null;

      const positions = [];
      for (const p of orbitPoints) {
        positions.push(p.x, p.y, p.z);
      }

      const geometry = new LineGeometry();
      geometry.setPositions(positions);

      const material = new LineMaterial({
        color: asteroid.color,
        transparent: true,
        opacity: 0.7,
        linewidth: 2.0,
        resolution: new THREE.Vector2(window.innerWidth, window.innerHeight)
      });

      const line = new Line2(geometry, material);
      line.computeLineDistances();
      line.visible = showOrbitsRef.current;
      return line;
    } catch (error) {
      return null;
    }
  }, []);

  const createTrailLine = useCallback((asteroid) => {
    const positions = new Array(PERFORMANCE_CONSTANTS.TRAIL_LENGTH * 3).fill(0);
    const geometry = new LineGeometry();
    geometry.setPositions(positions);
    const material = new LineMaterial({
      color: asteroid.color,
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

  const updateTrailPositions = useCallback((asteroid, trail) => {
    const data = asteroidDataRef.current.get(asteroid.id);
    if (!data || !data.position) return;
    const pos = data.position;
    if (!Number.isFinite(pos.x) || !Number.isFinite(pos.y) || !Number.isFinite(pos.z)) return;

    let buffer = trailBuffersRef.current.get(asteroid.id);
    if (!buffer) {
      buffer = [];
      trailBuffersRef.current.set(asteroid.id, buffer);
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
    if (!asteroidGroupRef.current) return;
    const sats = asteroidsRef.current;
    const simNow = simulationDateMsRef.current;

    for (let i = 0; i < sats.length; i++) {
      const asteroid = sats[i];
      if (!asteroid.active) continue;

      if (orbitLinesRef.current[asteroid.id]) {
        const meta = orbitMetaRef.current.get(asteroid.id);
        const periodMs = (asteroid.orbitalPeriodYears || 1) * 365.25 * 86400000;
        const halfPeriodMs = periodMs / 2;
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
          const old = orbitLinesRef.current[asteroid.id];
          asteroidGroupRef.current.remove(old);
          old.geometry.dispose();
          old.material.dispose();
          delete orbitLinesRef.current[asteroid.id];
          orbitMetaRef.current.delete(asteroid.id);
        }
      }

      if (showOrbitsRef.current && !orbitLinesRef.current[asteroid.id]) {
        const orbit = createOrbitLine(asteroid);
        if (orbit) {
          asteroidGroupRef.current.add(orbit);
          orbitLinesRef.current[asteroid.id] = orbit;
          orbitMetaRef.current.set(asteroid.id, { createdAtMs: simNow, lastDirection: Math.sign(speedMultiplierRef.current) || 1 });
        }
      }

      if (showTrailsRef.current && !trailLinesRef.current[asteroid.id]) {
        const trail = createTrailLine(asteroid);
        if (trail) {
          asteroidGroupRef.current.add(trail);
          trailLinesRef.current[asteroid.id] = trail;
        }
      }

      if (orbitLinesRef.current[asteroid.id]) {
        orbitLinesRef.current[asteroid.id].visible = showOrbitsRef.current;
      }

      if (trailLinesRef.current[asteroid.id]) {
        const trail = trailLinesRef.current[asteroid.id];
        trail.visible = showTrailsRef.current;
        if (showTrailsRef.current) {
          updateTrailPositions(asteroid, trail);
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
          asteroidGroupRef.current.remove(line);
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
          asteroidGroupRef.current.remove(line);
          line.geometry.dispose();
          line.material.dispose();
          delete trailLinesRef.current[id];
          trailBuffersRef.current.delete(id);
        }
      }
    }
  }, [createOrbitLine, createTrailLine, updateTrailPositions]);

  const updateLabels = useCallback(() => {
    if (!cameraRef.current || !labelRendererRef.current) return;

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

      const data = asteroidDataRef.current.get(id);
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

  const fetchAsteroidData = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setLoading(true);
    setErrors([]);
    setAsteroids([]);
    asteroidDataRef.current.clear();
    orbitMetaRef.current.clear();
    trailBuffersRef.current.clear();

    const seenIds = new Set();
    let activeCount = 0;
    let interactive = false;
    const startTime = performance.now();
    const url = `${import.meta.env.VITE_API_BASE_URL}/asteroid-stream`;

    let eventSource;
    try {
      eventSource = new EventSource(url);
    } catch (error) {
      setLoading(false);
      setErrors([`The asteroid stream could not be opened because of the error "${String(error.message).replace(/\.$/, "")}".`]);
      return;
    }
    eventSourceRef.current = eventSource;

    let helloReceived = false;
    const connectionTimeoutId = setTimeout(() => {
      if (!helloReceived && eventSource.readyState !== EventSource.OPEN) {
        setErrors(prev => [...prev, "The stream connection timed out because the server did not respond."]);
        setLoading(false);
        try {
          eventSource.close();
        } catch (error) {}
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
      try {
        eventSource.close();
      } catch (error) {}
    };

    eventSource.addEventListener("hello", () => {
      helloReceived = true;
      clearTimeout(connectionTimeoutId);
    });

    eventSource.addEventListener("batch", (event) => {
      try {
        const data = JSON.parse(event.data);
        if (!data.asteroids || data.asteroids.length === 0) return;
        const additions = [];
        for (const sat of data.asteroids) {
          if (seenIds.has(sat.id)) continue;
          seenIds.add(sat.id);
          const isActive = restoredActiveRef.current ? restoredActiveRef.current.has(sat.id) : activeCount < PERFORMANCE_CONSTANTS.PRESELECT_COUNT;
          if (isActive) activeCount++;
          additions.push({
            ...sat,
            active: isActive,
            _lowerName: (sat.name || "").toLowerCase(),
            _lowerCategory: (sat.category || "").toLowerCase(),
            _lowerDesignation: (sat.designation || "").toLowerCase(),
            _lowerGroup: (sat.group || "").toLowerCase()
          });
        }
        if (additions.length === 0) return;
        setAsteroids(prev => prev.concat(additions));
        if (!interactive && seenIds.size >= 50) {
          interactive = true;
          setLoading(false);
        }
      } catch (error) {}
    });

    eventSource.addEventListener("progress", (event) => {
      try {
        const data = JSON.parse(event.data);
        setLoadingMetadata(prev => ({
          ...(prev || {}),
          progress: `${data.completed}/${data.total}`,
          successfulSources: data.successful,
          totalSources: data.total
        }));
      } catch (error) {}
    });

    eventSource.addEventListener("source-error", (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && data.error) {
          setErrors(prev => [...prev, `The ${data.source} source failed with the error "${String(data.error).replace(/\.$/, "")}".`]);
        }
      } catch (error) {}
    });

    eventSource.addEventListener("done", (event) => {
      try {
        const data = JSON.parse(event.data);
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

  const fetchNEOWatchData = useCallback(async () => {
    setNEOWatchLoading(true);
    try {
      const r = await fetch(`${import.meta.env.VITE_API_BASE_URL}/neo-watch`);
      const j = await r.json();
      if (j.success) setNEOWatch(j.data);
    } catch (error) {
    } finally {
      setNEOWatchLoading(false);
    }
  }, []);

  const fetchNEOWatchAI = useCallback(async (force = false) => {
    if (!neoWatch) return;
    if (!force && neoWatchAI) return;
    setNEOWatchAILoading(true);
    try {
      const r = await fetch(`${import.meta.env.VITE_API_BASE_URL}/neo-watch-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ neoWatch })
      });
      const j = await r.json();
      if (j.data) {
        setNEOWatchAI(j.data);
      } else {
        setNEOWatchAI({ error: j.error || "AI generation failed." });
      }
    } catch (error) {
      setNEOWatchAI({ error: error.message });
    } finally {
      setNEOWatchAILoading(false);
    }
  }, [neoWatch, neoWatchAI]);

  const fetchMissionIntelligenceFor = useCallback(async (asteroid, force = false) => {
    if (!asteroid) return;
    if (!force && missionIntelMap.has(asteroid.designation)) return;

    if (intelAbortRef.current) {
      try {
        intelAbortRef.current.abort();
      } catch (error) {}
    }
    const controller = new AbortController();
    intelAbortRef.current = controller;

    setMissionIntelLoading(true);
    try {
      const r = await fetch(`${import.meta.env.VITE_API_BASE_URL}/asteroid-intelligence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asteroid: enrichAsteroid(asteroid) }),
        signal: controller.signal
      });
      const j = await r.json();
      if (j.data) {
        setMissionIntelMap(prev => {
          const next = new Map(prev);
          next.set(asteroid.designation, j.data);
          return next;
        });
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        setMissionIntelMap(prev => {
          const next = new Map(prev);
          next.set(asteroid.designation, { error: error.message });
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

  const fetchObservationDataFor = useCallback(async (asteroid, force = false) => {
    if (!asteroid) return;
    if (!force && observationMap.has(asteroid.designation)) return;

    if (observationAbortRef.current) {
      try {
        observationAbortRef.current.abort();
      } catch (error) {}
    }
    const controller = new AbortController();
    observationAbortRef.current = controller;

    setObservationLoading(true);
    try {
      const r = await fetch(`${import.meta.env.VITE_API_BASE_URL}/asteroid-observation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asteroid: enrichAsteroid(asteroid) }),
        signal: controller.signal
      });
      const j = await r.json();
      if (j.data) {
        setObservationMap(prev => {
          const next = new Map(prev);
          next.set(asteroid.designation, j.data);
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

  const fetchPHACatalog = useCallback(async () => {
    setPHALoading(true);
    try {
      const r = await fetch(`${import.meta.env.VITE_API_BASE_URL}/asteroid-population-census`);
      const j = await r.json();
      if (j.success) setPHACatalog(j.populations);
    } catch (error) {
    } finally {
      setPHALoading(false);
    }
  }, []);

  const fetchSentryWatch = useCallback(async () => {
    setSentryLoading(true);
    try {
      const r = await fetch(`${import.meta.env.VITE_API_BASE_URL}/sentry-watch`);
      const j = await r.json();
      if (j.success) {
        setSentryCandidates(j.candidates || []);
        setSentryMethodology(j.methodology || null);
      }
    } catch (error) {
    } finally {
      setSentryLoading(false);
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

  const handleVirtualScroll = useCallback((event) => {
    setVirtualScrollOffset(event.target.scrollTop);
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
      return { visibleItems: filteredAsteroids.slice(0, 20), startIndex: 0, endIndex: 19 };
    }

    const containerHeight = virtualListHeight || virtualScrollRef.current.clientHeight || 400;
    const itemHeight = PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT;
    const buffer = PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_BUFFER;

    const startIndex = Math.max(0, Math.floor(virtualScrollOffset / itemHeight) - buffer);
    const endIndex = Math.min(
      filteredAsteroids.length - 1,
      Math.ceil((virtualScrollOffset + containerHeight) / itemHeight) + buffer
    );

    const visibleItems = filteredAsteroids.slice(startIndex, endIndex + 1);

    return { visibleItems, startIndex, endIndex };
  }, [filteredAsteroids, virtualScrollOffset, virtualListHeight]);

  const exportJSON = useCallback(() => {
    const detailedAsteroids = asteroids.map(asteroid => {
      const data = asteroidDataRef.current.get(asteroid.id);
      const position = data && data.position ? data.position : { x: 0, y: 0, z: 0 };
      const distance = Math.sqrt(position.x * position.x + position.y * position.y + position.z * position.z);

      return {
        ...asteroid,
        currentPosition: {
          x: position.x.toFixed(2),
          y: position.y.toFixed(2),
          z: position.z.toFixed(2)
        },
        currentHelioDistanceAU: (distance / ORBITAL_CONSTANTS.SCALE_FACTOR).toFixed(6),
        propagationModel: "Two-body Kepler",
        hasOrbit: !!asteroid.elements,
        visible: visibleAsteroidsRef.current.has(asteroid.id)
      };
    });

    const exportData = {
      asteroids: detailedAsteroids,
      neoWatch: neoWatch,
      closeApproaches: closeApproaches,
      simulationTime: new Date(simulationDateMsRef.current).toISOString(),
      hudReadouts: {
        activeAsteroids: asteroids.filter(s => s.active).length,
        actualFps,
        currentTime,
        speedMultiplier,
        performanceStats
      },
      loadingMetadata,
      apiErrors: errors,
      orbitPropagation: {
        keplerCount: asteroids.filter(s => s.elements).length,
        fallbackCount: asteroids.filter(s => !s.elements).length
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "asteroid_catalog.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [asteroids, neoWatch, closeApproaches, actualFps, currentTime, speedMultiplier, performanceStats, loadingMetadata, errors]);

  const exportCSV = useCallback(() => {
    let csv = "ID,Name,Designation,Category,Group,SemiMajorAxisAU,Eccentricity,InclinationDeg,RAANDeg,ArgPerihelionDeg,MeanAnomalyDeg,PeriodYears,PerihelionAU,AphelionAU,MeanVelocityKmS,AbsoluteMagnitudeH,DiameterKm,IsPHA,MOIDAU,ObservationArcDays,NumObs,EpochISO,PositionX,PositionY,PositionZ,HelioDistanceAU,PropagationModel,HasOrbit,Visible\n";

    asteroids.forEach(asteroid => {
      const e = enrichAsteroid(asteroid);
      const data = asteroidDataRef.current.get(asteroid.id);
      const position = data && data.position ? data.position : { x: 0, y: 0, z: 0 };
      const distance = Math.sqrt(position.x * position.x + position.y * position.y + position.z * position.z);
      const visible = visibleAsteroidsRef.current.has(asteroid.id);

      csv += `${e.id},"${e.name}","${e.designation || ""}",${e.category},"${e.group || ""}",${e.semiMajorAxisAU || ""},${e.eccentricity || ""},${e.inclination || ""},${e.raan || ""},${e.argOfPerihelion || ""},${e.meanAnomaly || ""},${e.orbitalPeriodYears || ""},${e.perihelionAU || ""},${e.aphelionAU || ""},${e.meanVelocity || ""},${e.h !== null && e.h !== undefined ? e.h : ""},${e.diameter || ""},${!!e.isPHA},${e.moidAU !== null && e.moidAU !== undefined ? e.moidAU : ""},${e.observationArcDays || ""},${e.numObs || ""},${e.epochISO || ""},${position.x.toFixed(2)},${position.y.toFixed(2)},${position.z.toFixed(2)},${(distance / ORBITAL_CONSTANTS.SCALE_FACTOR).toFixed(6)},Two-body Kepler,${!!e.elements},${visible}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "asteroid_catalog.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [asteroids]);

  const exportText = useCallback(() => {
    const header = `# Asteroid Tracker Data Export\n# Generated: ${new Date().toISOString()}\n# Simulation Time: ${new Date(simulationDateMsRef.current).toISOString()}\n# Total Asteroids: ${asteroids.length}\n# Format: Name | Designation | Cat | Group | a(AU) | e | i(deg) | Period(y) | q(AU) | Q(AU) | v(km/s) | H | Diameter(km) | PHA | MOID(AU) | Arc(d)\n#\n`;
    const rows = asteroids.map(s => {
      const e = enrichAsteroid(s);
      return `${e.name} | ${e.designation || ""} | ${e.category} | ${e.group || ""} | ${e.semiMajorAxisAU || ""} | ${e.eccentricity || ""} | ${e.inclination || ""} | ${e.orbitalPeriodYears || ""} | ${e.perihelionAU || ""} | ${e.aphelionAU || ""} | ${e.meanVelocity || ""} | ${e.h !== null && e.h !== undefined ? e.h : ""} | ${e.diameter || ""} | ${e.isPHA ? "Y" : "N"} | ${e.moidAU !== null && e.moidAU !== undefined ? e.moidAU : ""} | ${e.observationArcDays || ""}`;
    }).join("\n");

    const blob = new Blob([header + rows + "\n"], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "asteroid_catalog.txt";
    a.click();
    URL.revokeObjectURL(url);
  }, [asteroids]);

  const toggleAsteroid = useCallback((id) => {
    setAsteroids(prev => prev.map(asteroid =>
      asteroid.id === id ? { ...asteroid, active: !asteroid.active } : asteroid
    ));
  }, []);

  const selectAllAsteroids = useCallback(() => {
    setAsteroids(prev => prev.map(asteroid => ({ ...asteroid, active: true })));
  }, []);

  const deselectAllAsteroids = useCallback(() => {
    setAsteroids(prev => prev.map(asteroid => ({ ...asteroid, active: false })));
  }, []);

  const togglePlay = useCallback(() => setIsPlaying(p => !p), []);
  const toggleOrbits = useCallback(() => setShowOrbits(v => !v), []);
  const toggleTrails = useCallback(() => setShowTrails(v => !v), []);
  const toggleLabels = useCallback(() => setShowLabels(v => !v), []);
  const toggleEclipticGrid = useCallback(() => setShowEclipticGrid(v => !v), []);
  const toggleAxisMarkers = useCallback(() => setShowAxisMarkers(v => !v), []);
  const toggleEarth = useCallback(() => setShowEarth(v => !v), []);

  const collectEarthMapPoints = useCallback(() => {
    const earth = asteroidDataRef.current.get("__earth__");
    if (!earth || !earth.position) return [];
    const gmst = greenwichSiderealDegrees(new Date(simulationDateMsRef.current));
    const points = [];
    for (const item of asteroidsRef.current) {
      if (!item.active) continue;
      const data = asteroidDataRef.current.get(item.id);
      if (!data || !data.position) continue;
      const point = subObserverPoint(data.position, earth.position, gmst);
      if (!point) continue;
      points.push({ id: String(item.id), name: item.name, color: colorByObservationArcRef.current ? orbitArcAgeColor(item.observationArcDays) : item.color, lat: point.lat, lon: point.lon, line: `Distance ${point.distanceAu.toFixed(3)} AU` });
    }
    return points;
  }, []);
  const toggleOrbitalZones = useCallback(() => setShowOrbitalZones(v => !v), []);
  const toggleDistanceRings = useCallback(() => setShowDistanceRings(v => !v), []);
  const toggleBloom = useCallback(() => setBloomEnabled(v => !v), []);

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

  const toggleNEOWatchExpanded = useCallback(() => {
    setNEOWatchExpanded(v => {
      const next = !v;
      if (next) {
        closeAllOverlayPanels();
        setNEOWatchExpanded(true);
        return true;
      }
      return false;
    });
  }, [closeAllOverlayPanels]);

  const toggleCloseApproachPanel = useCallback(() => {
    setShowCloseApproachPanel(v => {
      const next = !v;
      if (next) {
        closeAllOverlayPanels();
        setShowCloseApproachPanel(true);
        return true;
      }
      return false;
    });
  }, [closeAllOverlayPanels]);

  const togglePHAPanel = useCallback(() => {
    setShowPHAPanel(v => {
      const next = !v;
      if (next) {
        closeAllOverlayPanels();
        setShowPHAPanel(true);
        if (!phaCatalog) fetchPHACatalog();
        return true;
      }
      return false;
    });
  }, [closeAllOverlayPanels, phaCatalog, fetchPHACatalog]);

  const toggleSentryPanel = useCallback(() => {
    setShowSentryPanel(v => {
      const next = !v;
      if (next) {
        closeAllOverlayPanels();
        setShowSentryPanel(true);
        if (sentryCandidates.length === 0) fetchSentryWatch();
        return true;
      }
      return false;
    });
  }, [closeAllOverlayPanels, sentryCandidates, fetchSentryWatch]);

  const resetCamera = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.position.set(180, 100, 180);
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
      try {
        t.stop();
      } catch (error) {}
    }
    activeTweensRef.current = [];
  }, []);

  const zoomToAsteroid = useCallback((id) => {
    const data = asteroidDataRef.current.get(id);
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

  const openDossier = useCallback((asteroid) => {
    closeAllOverlayPanels();
    setDetailedAsteroid(asteroid);
    setActiveDossierTab("orbital");
    detailedDraggable.setPosition({ x: 0, y: 0 });
  }, [detailedDraggable, closeAllOverlayPanels]);

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        try {
          eventSourceRef.current.close();
        } catch (error) {}
        eventSourceRef.current = null;
      }
      if (intelAbortRef.current) {
        try {
          intelAbortRef.current.abort();
        } catch (error) {}
        intelAbortRef.current = null;
      }
      if (observationAbortRef.current) {
        try {
          observationAbortRef.current.abort();
        } catch (error) {}
        observationAbortRef.current = null;
      }
      stopActiveTweens();
    };
  }, [stopActiveTweens]);

  useEffect(() => {
    if (!detailedAsteroid) {
      if (intelAbortRef.current) {
        try {
          intelAbortRef.current.abort();
        } catch (error) {}
        intelAbortRef.current = null;
      }
      if (observationAbortRef.current) {
        try {
          observationAbortRef.current.abort();
        } catch (error) {}
        observationAbortRef.current = null;
      }
    }
  }, [detailedAsteroid]);

  useEffect(() => {
    if (!selectedAsteroid || !asteroids.length) return;
    const exists = asteroids.some(s => s.id === selectedAsteroid && s.active);
    if (!exists) {
      setSelectedAsteroid(null);
    }
  }, [asteroids, selectedAsteroid]);

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
      setFilteredAsteroids(asteroids);
      return;
    }
    const filtered = asteroids.filter(asteroid =>
      (asteroid._lowerName && asteroid._lowerName.includes(lower)) ||
      (asteroid._lowerCategory && asteroid._lowerCategory.includes(lower)) ||
      (asteroid._lowerDesignation && asteroid._lowerDesignation.includes(lower)) ||
      (asteroid._lowerGroup && asteroid._lowerGroup.includes(lower))
    );
    setFilteredAsteroids(filtered);
  }, [asteroids, debouncedSearchTerm]);

  useEffect(() => {
    fetchNEOWatchData();
    const interval = setInterval(fetchNEOWatchData, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchNEOWatchData]);

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050508, 0.000005);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width && height ? width / height : 1, 0.1, 16000);
    camera.position.set(180, 100, 180);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance"
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x030305, 1);
    renderer.shadowMap.enabled = false;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);
    const wheelHost = mountRef.current;
    const claimWheel = (event) => { event.preventDefault(); };
    wheelHost.addEventListener("wheel", claimWheel, { passive: false, capture: true });

    const composer = new EffectComposer(renderer);
    composerRef.current = composer;

    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.8, 0.4, 0.25);
    bloomPassRef.current = bloomPass;
    composer.addPass(bloomPass);

    const labelRenderer = document.createElement("div");
    labelRenderer.style.cssText = `position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 5;`;
    mountRef.current.appendChild(labelRenderer);
    labelRendererRef.current = labelRenderer;

    const ambientLight = new THREE.AmbientLight(0x303035, 0.4);
    scene.add(ambientLight);

    const sunGroup = new THREE.Group();

    const sunGeometry = new THREE.SphereGeometry(SCENE_SUN_RADIUS, 64, 64);
    const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xFFD060 });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sunGroup.add(sun);

    const coronaGeometry = new THREE.SphereGeometry(SCENE_SUN_RADIUS * 1.4, 64, 64);
    const coronaVertexShader = `varying vec3 vNormal; varying vec3 vPositionNormal; void main() { vNormal = normalize(normalMatrix * normal); vPositionNormal = normalize((modelViewMatrix * vec4(position, 1.0)).xyz); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
    const coronaFragmentShader = `varying vec3 vNormal; varying vec3 vPositionNormal; void main() { float intensity = pow(0.7 - dot(vNormal, vPositionNormal), 4.0); vec3 hotColor = vec3(1.0, 0.85, 0.45); vec3 outerColor = vec3(0.9, 0.5, 0.2); vec3 coronaColor = mix(hotColor, outerColor, intensity); float hdrBoost = 1.5 + intensity * 1.2; gl_FragColor = vec4(coronaColor * hdrBoost, 1.0) * intensity * 0.9; }`;
    const coronaMaterial = new THREE.ShaderMaterial({ vertexShader: coronaVertexShader, fragmentShader: coronaFragmentShader, blending: THREE.AdditiveBlending, side: THREE.BackSide, transparent: true, depthWrite: false });
    const corona = new THREE.Mesh(coronaGeometry, coronaMaterial);
    sunGroup.add(corona);

    const flareGeometry = new THREE.SphereGeometry(SCENE_SUN_RADIUS * 2.5, 64, 64);
    const flareMaterial = new THREE.ShaderMaterial({ vertexShader: coronaVertexShader, fragmentShader: `varying vec3 vNormal; varying vec3 vPositionNormal; void main() { float intensity = pow(0.5 - dot(vNormal, vPositionNormal), 6.0); vec3 flareColor = vec3(1.0, 0.7, 0.3); gl_FragColor = vec4(flareColor, 1.0) * intensity * 0.4; }`, blending: THREE.AdditiveBlending, side: THREE.BackSide, transparent: true, depthWrite: false });
    const flare = new THREE.Mesh(flareGeometry, flareMaterial);
    sunGroup.add(flare);

    const sunLight = new THREE.PointLight(0xFFFFFF, 2.5, 0, 0);
    sunGroup.add(sunLight);

    scene.add(sunGroup);
    sunRef.current = sunGroup;

    const earthMarkerGeometry = new THREE.SphereGeometry(0.6, 64, 48);
    const earthMarkerMaterial = new THREE.MeshPhongMaterial({ color: 0x42A5F5, emissive: 0x42A5F5, emissiveIntensity: 0.35, shininess: 10 });
    applyEarthTexture(earthMarkerMaterial, renderer, true);
    const earthMarker = new THREE.Mesh(earthMarkerGeometry, earthMarkerMaterial);
    scene.add(earthMarker);
    earthMarkerRef.current = earthMarker;

    const earthGlowGeometry = new THREE.SphereGeometry(1.2, 16, 16);
    const earthGlowMaterial = new THREE.MeshBasicMaterial({ color: 0x42A5F5, transparent: true, opacity: 0.3, side: THREE.BackSide });
    const earthGlow = new THREE.Mesh(earthGlowGeometry, earthGlowMaterial);
    earthMarker.add(earthGlow);

    const polarGrid = new THREE.PolarGridHelper(600, 16, 8, 64, 0x444448, 0x222225);
    polarGrid.visible = false;
    scene.add(polarGrid);
    gridRef.current = polarGrid;

    const eclipticGrid = createEclipticGrid();
    eclipticGrid.visible = true;
    scene.add(eclipticGrid);
    eclipticGridRef.current = eclipticGrid;

    const axisMarkers = createAxisMarkers();
    axisMarkers.visible = true;
    scene.add(axisMarkers);
    axisMarkersRef.current = axisMarkers;

    const orbitalZones = createOrbitalZones();
    orbitalZones.visible = true;
    scene.add(orbitalZones);
    orbitalZonesRef.current = orbitalZones;

    const distanceRings = createDistanceRings();
    distanceRings.visible = true;
    scene.add(distanceRings);
    distanceRingsRef.current = distanceRings;

    const asteroidGroup = new THREE.Group();
    scene.add(asteroidGroup);
    asteroidGroupRef.current = asteroidGroup;

    const asteroidGeometry = new THREE.SphereGeometry(0.4, 8, 8);
    const asteroidMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 1.0 });
    const asteroidInstance = new THREE.InstancedMesh(asteroidGeometry, asteroidMaterial, PERFORMANCE_CONSTANTS.MAX_VISIBLE_ASTEROIDS);
    asteroidInstance.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    asteroidInstance.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(PERFORMANCE_CONSTANTS.MAX_VISIBLE_ASTEROIDS * 3), 3);
    asteroidInstance.count = 0;
    asteroidGroup.add(asteroidInstance);
    asteroidInstanceRef.current = asteroidInstance;

    const glowGeometry = new THREE.SphereGeometry(1.0, 8, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.2, side: THREE.BackSide });
    const glowInstance = new THREE.InstancedMesh(glowGeometry, glowMaterial, PERFORMANCE_CONSTANTS.MAX_VISIBLE_ASTEROIDS);
    glowInstance.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    glowInstance.count = 0;
    asteroidGroup.add(glowInstance);
    glowInstanceRef.current = glowInstance;

    const starsGeometry = new THREE.BufferGeometry();
    const starCount = 10000;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);
    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      const radius = 3000 + Math.random() * 6000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      starPositions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPositions[i3 + 2] = radius * Math.cos(phi);
      const starType = Math.random();
      let baseColor, intensity, size;
      if (starType < 0.5) { baseColor = { r: 0.9, g: 0.95, b: 1.0 }; intensity = 0.7 + Math.random() * 0.3; size = 1.0 + Math.random() * 0.5; }
      else if (starType < 0.7) { baseColor = { r: 1.0, g: 0.95, b: 0.85 }; intensity = 0.75 + Math.random() * 0.25; size = 1.2 + Math.random() * 0.8; }
      else if (starType < 0.85) { baseColor = { r: 1.0, g: 0.7, b: 0.4 }; intensity = 0.8 + Math.random() * 0.2; size = 1.8 + Math.random() * 1.0; }
      else { baseColor = { r: 0.95, g: 0.92, b: 1.0 }; intensity = 0.6 + Math.random() * 0.3; size = 0.5 + Math.random() * 0.3; }
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
    controls.maxDistance = 6000;
    controls.minDistance = 6;
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
      fetchAsteroidData();
      const interval = setInterval(() => fetchAsteroidData(), 60 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [sceneInitialized, stateRestored, fetchAsteroidData]);

  useEffect(() => { if (gridRef.current) gridRef.current.visible = showGrid; }, [showGrid]);
  useEffect(() => { if (eclipticGridRef.current) eclipticGridRef.current.visible = showEclipticGrid; }, [showEclipticGrid]);
  useEffect(() => { if (axisMarkersRef.current) axisMarkersRef.current.visible = showAxisMarkers; }, [showAxisMarkers]);
  useEffect(() => { if (earthMarkerRef.current) earthMarkerRef.current.visible = showEarth; }, [showEarth]);
  useEffect(() => { if (orbitalZonesRef.current) orbitalZonesRef.current.visible = showOrbitalZones; }, [showOrbitalZones]);
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
    Object.keys(labelsRef.current).forEach(asteroidId => {
      const label = labelsRef.current[asteroidId];
      if (label && label.element) {
        if (!asteroids.find(s => s.id === asteroidId && s.active)) {
          if (label.element.parentNode) {
            label.element.parentNode.removeChild(label.element);
          }
          delete labelsRef.current[asteroidId];
        }
      }
    });
    asteroids.forEach(asteroid => {
      if (asteroid.active && !labelsRef.current[asteroid.id]) {
        const label = createLabel(asteroid.name, asteroid.color);
        labelsRef.current[asteroid.id] = label;
        if (labelRendererRef.current) {
          labelRendererRef.current.appendChild(label.element);
        }
      }
    });
  }, [asteroids, createLabel]);

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
            visibleAsteroids: visibleAsteroidsRef.current.size,
            culledAsteroids: Math.max(0, asteroidsRef.current.filter(s => s.active).length - visibleAsteroidsRef.current.size)
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

      if (frameCountRef.current % PERFORMANCE_CONSTANTS.UPDATE_FREQUENCY === 0) {
        computeAllPositions();
        performFrustumCulling();
        writeInstanceBuffers();
        updateOrbitsAndTrails();
        updateLabels();
      }

      if (time - lastCloseApproachCheckRef.current > PERFORMANCE_CONSTANTS.CLOSE_APPROACH_CHECK_INTERVAL_MS) {
        lastCloseApproachCheckRef.current = time;
        const newApp = detectCloseApproaches(asteroidsRef.current, asteroidDataRef.current, closeApproachThresholdRef.current, new Date(simulationDateMsRef.current));
        setCloseApproaches(newApp);
      }

      TWEEN.update(time);

      const canvas = rendererRef.current?.domElement;
      if (!canvas || canvas.width === 0 || canvas.height === 0) return;

      if (bloomEnabledRef.current) {
        composerRef.current.render();
      } else {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate(performance.now());

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [sceneInitialized, computeAllPositions, performFrustumCulling, writeInstanceBuffers, updateOrbitsAndTrails, updateLabels]);

  const enrichedDetailedAsteroid = useMemo(() => {
    return detailedAsteroid ? enrichAsteroid(detailedAsteroid) : null;
  }, [detailedAsteroid]);

  const selectedAsteroidObj = useMemo(() => {
    if (!selectedAsteroid) return null;
    return asteroids.find(s => s.id === selectedAsteroid) || null;
  }, [asteroids, selectedAsteroid]);

  const activeAsteroids = useMemo(() => asteroids.filter(s => s.active).length, [asteroids]);
  const keplerCount = useMemo(() => asteroids.filter(s => s.elements).length, [asteroids]);
  const phaCount = useMemo(() => asteroids.filter(s => s.isPHA).length, [asteroids]);
  const neoCount = useMemo(() => asteroids.filter(s => ["Atira", "Aten", "Apollo", "Amor"].includes(s.category)).length, [asteroids]);

  const orbitArcStats = useMemo(() => {
    const stats = { multiDecade: 0, multiYear: 0, yearClass: 0, shortArc: 0, veryShort: 0, unknown: 0 };
    asteroids.forEach(s => {
      if (!s.active) return;
      const a = s.observationArcDays;
      if (a === null || a === undefined) stats.unknown++;
      else if (a > 3650) stats.multiDecade++;
      else if (a > 730) stats.multiYear++;
      else if (a > 180) stats.yearClass++;
      else if (a > 30) stats.shortArc++;
      else stats.veryShort++;
    });
    return stats;
  }, [asteroids]);

  const categoryCounts = useMemo(() => {
    return asteroids.reduce((acc, asteroid) => {
      if (asteroid.active) {
        acc[asteroid.category] = (acc[asteroid.category] || 0) + 1;
      }
      return acc;
    }, {});
  }, [asteroids]);

  const speedLabel = useMemo(() => {
    const match = SPEED_OPTIONS.find(o => o.value === speedMultiplier);
    return match ? match.label : `${speedMultiplier}x`;
  }, [speedMultiplier]);

  const { visibleItems, startIndex } = getVirtualScrollItems;

  const currentMissionIntel = detailedAsteroid ? missionIntelMap.get(detailedAsteroid.designation) : null;
  const currentObservation = detailedAsteroid ? observationMap.get(detailedAsteroid.designation) : null;

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
        pick("speedMultiplier", setSpeedMultiplier, (value) => SPEED_OPTIONS.some((option) => option.value === value));
        pick("targetFps", setTargetFps, (value) => FPS_OPTIONS.includes(value));
        pick("showOrbits", setShowOrbits, isBoolean);
        pick("showTrails", setShowTrails, isBoolean);
        pick("showLabels", setShowLabels, isBoolean);
        pick("showGrid", setShowGrid, isBoolean);
        pick("showEclipticGrid", setShowEclipticGrid, isBoolean);
        pick("showAxisMarkers", setShowAxisMarkers, isBoolean);
        pick("showEarth", setShowEarth, isBoolean);
        pick("mapGlobe", setMapGlobe, isBoolean);
        pick("showOrbitalZones", setShowOrbitalZones, isBoolean);
        pick("showDistanceRings", setShowDistanceRings, isBoolean);
        pick("bloomEnabled", setBloomEnabled, isBoolean);
        pick("bloomStrength", setBloomStrength, isNumber);
        pick("bloomRadius", setBloomRadius, isNumber);
        pick("bloomThreshold", setBloomThreshold, isNumber);
        pick("closeApproachThreshold", setCloseApproachThreshold, isNumber);
        pick("colorByObservationArc", setColorByObservationArc, isBoolean);
        pick("sidebarCollapsed", setSidebarCollapsed, isBoolean);
        pick("controlsCollapsed", setControlsCollapsed, isBoolean);
        pick("legendCollapsed", setLegendCollapsed, isBoolean);
        pick("layoutVisibility", (value) => setLayoutVisibility((current) => ({ ...current, ...value })), (value) => typeof value === "object");
        pick("expandedWarnings", setExpandedWarnings, (value) => typeof value === "object");
        pick("observerLocation", setObserverLocation, (value) => typeof value === "object" && Number.isFinite(value.lat) && Number.isFinite(value.lon) && value.lat >= -90 && value.lat <= 90 && value.lon >= -180 && value.lon <= 180);
        pick("selectedAreaId", setSelectedAreaId, (value) => typeof value === "string");
        pick("areaFilterActive", setAreaFilterActive, isBoolean);
        pick("selectedAsteroid", setSelectedAsteroid, (value) => typeof value === "string");
        pick("sounds", replaceSoundSettings, (value) => typeof value === "object");
        if (Array.isArray(saved.activeAsteroids)) restoredActiveRef.current = new Set(saved.activeAsteroids.filter((id) => typeof id === "string"));
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

  const activeAsteroidIds = useMemo(() => asteroids.filter((asteroid) => asteroid.active).map((asteroid) => asteroid.id), [asteroids]);

  useEffect(() => {
    if (!stateRestored) return undefined;
    if (saveStateDebounceRef.current) clearTimeout(saveStateDebounceRef.current);
    saveStateDebounceRef.current = setTimeout(() => {
      saveStateToDB({
        theme,
        isPlaying,
        speedMultiplier,
        targetFps,
        showOrbits,
        showTrails,
        showLabels,
        showGrid,
        showEclipticGrid,
        showAxisMarkers,
        showEarth,
        mapGlobe,
        showOrbitalZones,
        showDistanceRings,
        bloomEnabled,
        bloomStrength,
        bloomRadius,
        bloomThreshold,
        closeApproachThreshold,
        colorByObservationArc,
        sidebarCollapsed,
        controlsCollapsed,
        legendCollapsed,
        layoutVisibility,
        expandedWarnings,
        observerLocation,
        selectedAreaId,
        areaFilterActive,
        selectedAsteroid,
        activeAsteroids: asteroids.length ? activeAsteroidIds : restoredActiveRef.current ? Array.from(restoredActiveRef.current) : undefined,
        sounds: sounds.settings
      });
    }, SOURCES.persistence.saveDebounceMs);
    return () => clearTimeout(saveStateDebounceRef.current);
  }, [stateRestored, theme, isPlaying, speedMultiplier, targetFps, showOrbits, showTrails, showLabels, showGrid, showEclipticGrid, showAxisMarkers, showEarth, mapGlobe, showOrbitalZones, showDistanceRings, bloomEnabled, bloomStrength, bloomRadius, bloomThreshold, closeApproachThreshold, colorByObservationArc, sidebarCollapsed, controlsCollapsed, legendCollapsed, layoutVisibility, expandedWarnings, observerLocation, selectedAreaId, areaFilterActive, selectedAsteroid, activeAsteroidIds, asteroids.length, sounds.settings]);

  useEffect(() => {
    if (!sceneInitialized || !stateRestored) return;
    if (gridRef.current) gridRef.current.visible = showGrid;
    if (eclipticGridRef.current) eclipticGridRef.current.visible = showEclipticGrid;
    if (axisMarkersRef.current) axisMarkersRef.current.visible = showAxisMarkers;
    if (earthMarkerRef.current) earthMarkerRef.current.visible = showEarth;
    if (orbitalZonesRef.current) orbitalZonesRef.current.visible = showOrbitalZones;
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
    if (!item.designation) return null;
    const target = String(item.designation).toLowerCase();
    return asteroids.find((asteroid) => (asteroid.designation && String(asteroid.designation).toLowerCase() === target) || (asteroid.name && String(asteroid.name).toLowerCase().includes(`(${target})`))) || null;
  };

  const showAlertDetails = (item) => {
    const object = alertObject(item);
    if (object) {
      setShowAlertsPanel(false);
      if (!object.active) toggleAsteroid(object.id);
      setSelectedAsteroid(object.id);
      openDossier(object);
      return;
    }
    if (item.kind === "impactRisk") {
      setShowAlertsPanel(false);
      closeAllOverlayPanels();
      setShowSentryPanel(true);
      if (!sentryCandidates.length) fetchSentryWatch();
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
            <div className="satWeatherAckSectionTitle">AI Analysis</div>
            {renderAnalysis(item, ackEntry.ended)}
          </div>
          <div className="satWeatherAckActions">
            <span className="satWeatherAckRemaining">{!pending ? "Already Acknowledged" : pendingCount === 1 ? "Last Alert To Acknowledge" : `${pendingCount - 1} More To Acknowledge`}</span>
            <button type="button" className="satWeatherModalBtnSecondary" onClick={() => {
              closeAckModal();
              showAlertDetails(item);
            }}><FontAwesomeIcon icon={alertObject(item) ? faMeteor : faInfoCircle} /> {alertObject(item) ? "View Object" : "View Details"}</button>
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
              alertsError && !alertsData ? null : <div className="satWeatherAckNote">There are no active impact risk, unconfirmed object, close approach, or fireball alerts in this scope.</div>
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
                                {renderAnalysis(item, false)}
                      <div className="satWeatherModalActions">
                        {pendingKeys.has(item.key) && <button type="button" className="satWeatherModalBtnSecondary" onClick={() => sounds.acknowledge(item.key)}><FontAwesomeIcon icon={faCheck} /> Acknowledge</button>}
                        {(alertObject(item) || item.kind === "impactRisk") && <button type="button" className="satWeatherModalBtnPrimary" onClick={() => showAlertDetails(item)}><FontAwesomeIcon icon={alertObject(item) ? faMeteor : faShieldHalved} /> {alertObject(item) ? "View Object" : "Sentry Watch"}</button>}
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
          <div className="satWeatherAreaListEmpty">Add an area to watch for fireballs detected near it.</div>
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
    if (!enrichedDetailedAsteroid) return null;
    const sat = enrichedDetailedAsteroid;
    const advanced = computeAdvancedDerivatives(sat);
    const liveData = asteroidDataRef.current.get(sat.id);
    const isVisible = visibleAsteroidsRef.current.has(sat.id);
    const ageDays = sat.observationArcDays;
    const arcColor = orbitArcAgeColor(ageDays);
    const eccLabel = sat.eccentricity < 0.01 ? "circular" : sat.eccentricity < 0.1 ? "near-circular" : sat.eccentricity < 0.5 ? "elliptical" : sat.eccentricity < 0.9 ? "highly elliptical" : "extreme";
    const inclLabel = sat.inclination < 5 ? "low" : sat.inclination < 30 ? "moderate" : sat.inclination < 60 ? "high" : sat.inclination < 90 ? "near-polar" : "retrograde";
    const livePosition = liveData?.position;
    const liveDistanceFromSun = livePosition ? livePosition.length() / ORBITAL_CONSTANTS.SCALE_FACTOR : null;
    const earthData = asteroidDataRef.current.get("__earth__");
    const earthDistance = livePosition && earthData?.position ? livePosition.distanceTo(earthData.position) / ORBITAL_CONSTANTS.SCALE_FACTOR : null;

    return (
      <div className="satDossierTabContent">
        <div className="satStatTileGrid">
          <StatTile label="Status" value={sat.status || "Active"} sub={`${sat.category} · Two-body Kepler`} color="#4ecdc4" accent={sat.color} large />
          <StatTile label="Designation" value={sat.designation || "—"} sub={sat.group || "Unclassified"} accent="#42a5f5" />
          <StatTile label="Observation Arc" value={ageDays !== null && ageDays !== undefined ? `${Math.round(ageDays)}d` : "?"} sub={orbitArcAgeLabel(ageDays)} color={arcColor} accent={arcColor} />
          <StatTile label="Semi-Major Axis" value={sat.semiMajorAxisAU} unit="AU" sub={`${sat.perihelionAU} q / ${sat.aphelionAU} Q`} accent="#42a5f5" />
          <StatTile label="Period" value={sat.orbitalPeriodYears} unit="years" sub={`${sat.orbitalPeriodDays} days`} accent="#42a5f5" />
          <StatTile label="Inclination" value={`${sat.inclination}°`} sub={`${inclLabel} · Ω ${sat.raan}°`} accent="#42a5f5" />
          <StatTile label="Eccentricity" value={sat.eccentricity} sub={eccLabel} accent="#42a5f5" />
          <StatTile label="Mean Velocity" value={sat.meanVelocity} unit="km/s" sub={`q: ${sat.velocityAtPerihelion} / Q: ${sat.velocityAtAphelion}`} accent="#42a5f5" />
          {sat.isPHA && <StatTile label="Hazard Class" value="PHA" sub="Potentially Hazardous" color="#ff6b6b" accent="#ff6b6b" />}
          {sat.moidAU !== null && sat.moidAU !== undefined && <StatTile label="Earth MOID" value={sat.moidAU.toFixed(6)} unit="AU" sub={moidLabel(sat.moidAU)} color={moidColor(sat.moidAU)} accent={moidColor(sat.moidAU)} />}
          {sat.h !== null && sat.h !== undefined && <StatTile label="Absolute Mag H" value={sat.h.toFixed(2)} sub="Asteroid Magnitude" accent="#42a5f5" />}
          {sat.diameter && <StatTile label="Estimated Diameter" value={sat.diameter} unit="km" accent="#42a5f5" />}
          {sat.elements && <StatTile label="Render State" value={isVisible ? "Visible" : "Culled"} sub="Heliocentric Ecliptic" color={isVisible ? "#4ecdc4" : "#FF9500"} accent={isVisible ? "#4ecdc4" : "#FF9500"} />}
          {advanced.tisserandJupiter && <StatTile label="Tisserand (J)" value={advanced.tisserandJupiter} sub={advanced.tisserandJupiter < 3 ? "Comet-like" : "Asteroid-like"} accent="#42a5f5" />}
        </div>

        <div className="satDossierGrid">
          <div className="satPanelCard">
            <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faRulerCombined} /> Keplerian Elements</span></div>
            <div className="satPanelCardBody">
              <div className="satSatelliteHUDSectionGrid">
                <div className="satSatelliteHUDSectionItem"><span>Semi-Major Axis (a)</span><span>{sat.semiMajorAxisAU} AU</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Eccentricity (e)</span><span>{sat.eccentricity}</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Inclination (i)</span><span>{sat.inclination}°</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Long. Asc. Node (Ω)</span><span>{sat.raan}°</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Arg. Perihelion (ω)</span><span>{sat.argOfPerihelion}°</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Mean Anomaly (M)</span><span>{sat.meanAnomaly}°</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Mean Motion (n)</span><span>{sat.meanMotion} °/d</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Perihelion (q)</span><span>{sat.perihelionAU} AU</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Aphelion (Q)</span><span>{sat.aphelionAU} AU</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Aphelion/Perihelion</span><span>{sat.aphelionAU && sat.perihelionAU ? (sat.aphelionAU / sat.perihelionAU).toFixed(3) : "—"}</span></div>
              </div>
            </div>
          </div>

          <div className="satPanelCard">
            <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faAtom} /> Derived Orbital Mechanics</span></div>
            <div className="satPanelCardBody">
              <div className="satSatelliteHUDSectionGrid">
                <div className="satSatelliteHUDSectionItem"><span>Mean Velocity</span><span>{sat.meanVelocity} km/s</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Velocity at q</span><span>{sat.velocityAtPerihelion} km/s</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Velocity at Q</span><span>{sat.velocityAtAphelion} km/s</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Specific Energy</span><span>{sat.specificEnergy} Km²/s²</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Angular Momentum</span><span>{sat.angularMomentum} Km²/s</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Tisserand (Jupiter)</span><span>{advanced.tisserandJupiter}</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Orbit Circumference</span><span>{advanced.orbitCircumferenceAU} AU</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Long. of Perihelion</span><span>{advanced.heliocentricLongPerihelion}°</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Earth-crossing</span><span>{advanced.earthCrossing ? "Yes" : "No"}</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Mars-crossing</span><span>{advanced.marsCrossing ? "Yes" : "No"}</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Jupiter-crossing</span><span>{advanced.jupiterCrossing ? "Yes" : "No"}</span></div>
                <div className="satSatelliteHUDSectionItem"><span>PHA Status</span><span style={{ color: advanced.isPHA ? "#ff6b6b" : "#4ecdc4" }}>{advanced.isPHA ? "Yes" : "No"}</span></div>
              </div>
            </div>
          </div>

          <div className="satPanelCard">
            <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faEye} /> Hazard & Approach Geometry</span></div>
            <div className="satPanelCardBody">
              <div className="satSatelliteHUDSectionGrid">
                <div className="satSatelliteHUDSectionItem"><span>Earth MOID</span><span style={{ color: moidColor(sat.moidAU) }}>{sat.moidAU !== null && sat.moidAU !== undefined ? `${sat.moidAU.toFixed(6)} AU` : "—"}</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Earth MOID (LD)</span><span>{sat.moidAU !== null && sat.moidAU !== undefined ? (sat.moidAU * AU_KM / 384400).toFixed(2) : "—"}</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Earth MOID (km)</span><span>{sat.moidAU !== null && sat.moidAU !== undefined ? Math.round(sat.moidAU * AU_KM).toLocaleString() : "—"}</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Jupiter MOID</span><span>{sat.jupiterMOIDAU !== null && sat.jupiterMOIDAU !== undefined ? `${sat.jupiterMOIDAU.toFixed(4)} AU` : "—"}</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Hazard Tier</span><span style={{ color: moidColor(sat.moidAU) }}>{moidLabel(sat.moidAU)}</span></div>
                <div className="satSatelliteHUDSectionItem"><span>PHA Threshold</span><span>MOID &lt; 0.05 AU AND H &lt; 22</span></div>
              </div>
            </div>
          </div>

          <div className="satPanelCard">
            <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faSatellite} /> Identity & Provenance</span></div>
            <div className="satPanelCardBody">
              <div className="satSatelliteHUDSectionGrid">
                <div className="satSatelliteHUDSectionItem"><span>Name</span><span>{sat.name}</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Designation</span><span>{sat.designation || "—"}</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Population</span><span>{sat.category}</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Group</span><span>{sat.group || "—"}</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Status</span><span style={{ color: "#4ecdc4" }}>{sat.status || "Active"}</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Source</span><span>{sat.source || "JPL SBDB"}</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Propagation</span><span style={{ color: "#4ecdc4" }}>Two-body Kepler</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Has Elements</span><span>{sat.elements ? "Yes" : "No"}</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Epoch (JD)</span><span>{sat.elements?.epoch !== undefined ? sat.elements.epoch : "—"}</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Number of Obs</span><span>{sat.numObs || "?"}</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Absolute Magnitude</span><span>{sat.h !== null && sat.h !== undefined ? sat.h.toFixed(2) : "—"}</span></div>
                <div className="satSatelliteHUDSectionItem"><span>Diameter Estimate</span><span>{sat.diameter ? `${sat.diameter} km` : "—"}</span></div>
              </div>
            </div>
          </div>

          {sat.elements && livePosition && (
            <div className="satPanelCard">
              <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faGauge} /> Live State Vector (Heliocentric Ecliptic)</span></div>
              <div className="satPanelCardBody">
                <div className="satSatelliteHUDSectionGrid">
                  <div className="satSatelliteHUDSectionItem"><span>Rendering</span><span style={{ color: "#4ecdc4" }}>Instanced</span></div>
                  <div className="satSatelliteHUDSectionItem"><span>Position Source</span><span style={{ color: "#4ecdc4" }}>Two-body Kepler</span></div>
                  <div className="satSatelliteHUDSectionItem"><span>Visibility</span><span style={{ color: isVisible ? "#4ecdc4" : "#FF9500" }}>{isVisible ? "Visible" : "Culled"}</span></div>
                  <div className="satSatelliteHUDSectionItem"><span>Coordinate Frame</span><span>Ecliptic J2000</span></div>
                  <div className="satSatelliteHUDSectionItem"><span>X (Scene)</span><span>{livePosition.x.toFixed(3)}</span></div>
                  <div className="satSatelliteHUDSectionItem"><span>Y (Scene)</span><span>{livePosition.y.toFixed(3)}</span></div>
                  <div className="satSatelliteHUDSectionItem"><span>Z (Scene)</span><span>{livePosition.z.toFixed(3)}</span></div>
                  <div className="satSatelliteHUDSectionItem"><span>Heliocentric Distance</span><span>{liveDistanceFromSun ? `${liveDistanceFromSun.toFixed(4)} AU` : "—"}</span></div>
                  <div className="satSatelliteHUDSectionItem"><span>Earth Distance</span><span>{earthDistance ? `${earthDistance.toFixed(4)} AU` : "—"}</span></div>
                  <div className="satSatelliteHUDSectionItem"><span>Earth Distance (LD)</span><span>{earthDistance ? (earthDistance * AU_KM / 384400).toFixed(2) : "—"}</span></div>
                </div>
              </div>
            </div>
          )}

          <div className="satPanelCard">
            <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faBookOpen} /> Operational Implications</span></div>
            <div className="satPanelCardBody">
              <div className="satBriefingGrid">
                <div className="satBriefingItem"><b>Population Class</b><p>This is a {sat.category} object with a semi-major axis of {sat.semiMajorAxisAU} AU. {advanced.earthCrossing ? "It follows an Earth-crossing trajectory, with perihelion below 1.017 AU." : advanced.marsCrossing ? "It crosses Mars's orbit without entering Earth's neighborhood." : "Its outer-system orbit stays clear of the inner planets."}</p></div>
                <div className="satBriefingItem"><b>Hazard Profile</b><p>{sat.isPHA ? `It is classified as Potentially Hazardous, with a MOID of ${sat.moidAU?.toFixed(6)} AU and an absolute magnitude of ${sat.h?.toFixed(1)}, so it is subject to enhanced observation campaigns.` : sat.moidAU !== null && sat.moidAU !== undefined && sat.moidAU < 0.2 ? "Its orbit comes close to Earth, but it does not meet the PHA threshold." : "There are no imminent close-approach concerns."}</p></div>
                <div className="satBriefingItem"><b>Mission Accessibility</b><p>{advanced.tisserandJupiter > 3 && sat.semiMajorAxisAU < 2 ? "It is reachable from Earth with low Δv, which makes it favorable for sample return or rendezvous missions." : sat.semiMajorAxisAU > 5 ? "It is in the outer system, so a mission would need high Δv and a gravity assist." : "It needs moderate Δv, and the mission window depends on synodic alignment."}</p></div>
                <div className="satBriefingItem"><b>Tisserand Classification</b><p>{advanced.tisserandJupiter < 3 ? "A Tisserand parameter below 3 indicates comet-like dynamics, so the orbit is gravitationally coupled to Jupiter and may show non-gravitational forces." : "It shows asteroid-like dynamics that are decoupled from Jupiter perturbations on short timescales."}</p></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const summaryStatus = !loading && asteroids.length === 0 ? "SEVERE" : errors.length > 0 ? "ELEVATED" : "NOMINAL";
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
      {layoutVisibility.nav && <Nav activePage="asteroidtracker" />}

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
              <div className="satSummarySubtitle">{activeAreas ? `${activeAreasLabel} | Alerting For All Areas | ${bellItems.length} Alert${bellItems.length === 1 ? "" : "s"}` : `${selectedAsteroidObj ? selectedAsteroidObj.name : "All Asteroids"} | ${activeAsteroids} of ${asteroids.length} Asteroids Tracked${observerLocation ? ` | ${locationName}` : ""}`}</div>
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
              {!sidebarCollapsed && <small>Asteroid Tracker</small>}
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
                        <button onClick={(event) => { event.stopPropagation(); copyAllErrors(); }} aria-label="Copy All Errors">
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
                <input type="text" placeholder="Search Asteroids" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="satSatelliteSearchInput" />
                <div className="satSatelliteSelectControls">
                  <button className="satSatelliteSelectButton" onClick={selectAllAsteroids}>All</button>
                  <button className="satSatelliteSelectButton" onClick={deselectAllAsteroids}>None</button>
                  <button className="satSatelliteSelectButton" onClick={fetchAsteroidData}>Refresh</button>
                </div>
                <div className="satSatelliteSelectControls">
                  <button className={`satSatelliteSelectButton ${colorByObservationArc ? "satSatelliteButtonActive" : ""}`} onClick={() => setColorByObservationArc(v => !v)}>
                    {colorByObservationArc ? "Color: Arc Quality" : "Color: Population"}
                  </button>
                </div>
              </div>

              <div className="satSatelliteTLEQualityBar">
                <div className="satTLEQualityCount" style={{ color: "#4ecdc4" }} title="Multi-Decade Arc"><b>{orbitArcStats.multiDecade}</b><span>Decade+</span></div>
                <div className="satTLEQualityCount" style={{ color: "#7fe9e1" }} title="Multi-Year Arc"><b>{orbitArcStats.multiYear}</b><span>Year+</span></div>
                <div className="satTLEQualityCount" style={{ color: "#ffd93d" }} title="Year-Class Arc"><b>{orbitArcStats.yearClass}</b><span>~year</span></div>
                <div className="satTLEQualityCount" style={{ color: "#FF9500" }} title="Short Arc"><b>{orbitArcStats.shortArc}</b><span>Short</span></div>
                <div className="satTLEQualityCount" style={{ color: "#ff6b6b" }} title="Very Short Arc"><b>{orbitArcStats.veryShort}</b><span>V.short</span></div>
              </div>

              <div className="satSatelliteObjectsHeader">
                <span className="satSatelliteObjectsHeaderIcon"><FontAwesomeIcon icon={faMeteor} /></span>
                <span>Asteroids ({asteroids.filter(s => s.active).length}/{asteroids.length})</span>
              </div>

              <div
                ref={virtualScrollRef}
                className="satSatelliteList satellite-list"
                style={{ flex: 1, overflowY: "auto", position: "relative" }}
                onScroll={handleVirtualScroll}
              >
                <div style={{ height: filteredAsteroids.length * PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT, position: "relative" }}>
                  <div style={{ position: "absolute", top: startIndex * PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT, width: "100%" }}>
                    {visibleItems.map((asteroid) => (
                      <div
                        key={asteroid.id}
                        className={`satSatelliteListItem satellite-item ${asteroid.active ? "satSatelliteButtonActive" : ""} ${selectedAsteroid === asteroid.id ? "satellite-selected" : ""}`}
                        style={{ height: PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT, minHeight: PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT }}
                        onClick={() => {
                          if (!asteroid.active) { toggleAsteroid(asteroid.id); }
                          setSelectedAsteroid(asteroid.id);
                          zoomToAsteroid(asteroid.id);
                        }}
                      >
                        <div className="satSatelliteIndicator" style={{ backgroundColor: asteroid.color }} />
                        <div className="satSatelliteTleBadge" style={{ backgroundColor: orbitArcAgeColor(asteroid.observationArcDays) }} title={`Arc: ${orbitArcAgeLabel(asteroid.observationArcDays)}`} />
                        <div className="satSatelliteName satellite-name">{asteroid.name}</div>
                        <label className="consoleSwitch">
                          <input type="checkbox" checked={asteroid.active} onChange={() => { toggleAsteroid(asteroid.id); }} />
                          <span className="consoleSlider round"></span>
                        </label>
                        <button className="satSatelliteInfoButton" onClick={(event) => { event.stopPropagation(); openDossier(asteroid); }} aria-label="Show Dossier">
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

              <button className={`satSatellitePlaybackControlsButton ${hudVisible ? "satSatelliteButtonActive" : ""}`} onClick={toggleHUD} aria-label="Toggle HUD"><FontAwesomeIcon icon={faChartLine} /> HUD</button>
              <button className={`satSatellitePlaybackControlsButton ${showCloseApproachPanel ? "satSatelliteButtonActive" : ""}`} onClick={toggleCloseApproachPanel}><FontAwesomeIcon icon={faTriangleExclamation} /> Close Approaches ({closeApproaches.length})</button>
              <button className={`satSatellitePlaybackControlsButton ${showPHAPanel ? "satSatelliteButtonActive" : ""}`} onClick={togglePHAPanel}><FontAwesomeIcon icon={faCircleNodes} /> Population Census</button>
              <button className={`satSatellitePlaybackControlsButton ${showSentryPanel ? "satSatelliteButtonActive" : ""}`} onClick={toggleSentryPanel}><FontAwesomeIcon icon={faFire} /> Sentry Watch</button>

              <button className="satSatellitePlaybackControlsButton" onClick={exportJSON}>JSON</button>
              <button className="satSatellitePlaybackControlsButton" onClick={exportCSV}>CSV</button>
              <button className="satSatellitePlaybackControlsButton" onClick={exportText}>TXT</button>
            </div>
            {renderLayoutControls()}
          </div>
          <NEOWatchStrip data={neoWatch} loading={neoWatchLoading} expanded={neoWatchExpanded} onToggle={toggleNEOWatchExpanded} />
          </div>

          {neoWatchExpanded && (
            <PanelModal onClose={() => setNEOWatchExpanded(false)}>
              <NEOWatchDetail data={neoWatch} onClose={() => setNEOWatchExpanded(false)} onRequestAIAnalysis={() => fetchNEOWatchAI(true)} aiAnalysis={neoWatchAI} aiLoading={neoWatchAILoading} onSelect={openDossier} />
            </PanelModal>
          )}

          {showCloseApproachPanel && (
            <PanelModal onClose={() => setShowCloseApproachPanel(false)}>
              <CloseApproachesPanel approaches={closeApproaches} onSelect={openDossier} onClose={() => setShowCloseApproachPanel(false)} asteroids={asteroids} />
            </PanelModal>
          )}

          {showPHAPanel && (
            <PanelModal onClose={() => setShowPHAPanel(false)}>
              <PHACatalogPanel data={phaCatalog} loading={phaLoading} onRefresh={fetchPHACatalog} onClose={() => setShowPHAPanel(false)} onSelect={openDossier} />
            </PanelModal>
          )}

          {showSentryPanel && (
            <PanelModal onClose={() => setShowSentryPanel(false)}>
              <SentryWatchPanel candidates={sentryCandidates} loading={sentryLoading} onRefresh={fetchSentryWatch} onClose={() => setShowSentryPanel(false)} onSelect={openDossier} methodology={sentryMethodology} />
            </PanelModal>
          )}

          <div className="satMainContent">
            <div className="satCanvasArea">
              <div ref={mountRef} className="satSatelliteCanvasContainer" style={{ display: viewMode === "3d" ? "block" : "none" }} />

              {viewMode === "map" && (
                <EarthMapView collect={collectEarthMapPoints} selectedId={selectedAsteroid} onSelect={setSelectedAsteroid} globe={mapGlobe} />
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
                      <button className="satSatelliteControlButton" onClick={toggleEclipticGrid}>{showEclipticGrid ? "Hide" : "Show"} Grid</button>
                      <button className="satSatelliteControlButton" onClick={toggleOrbitalZones}>{showOrbitalZones ? "Hide" : "Show"} Zones</button>
                      <button className="satSatelliteControlButton" onClick={toggleDistanceRings}>{showDistanceRings ? "Hide" : "Show"} Planets</button>
                      <button className="satSatelliteControlButton" onClick={toggleEarth}>{showEarth ? "Hide" : "Show"} Earth</button>
                    </div>
                    <div className="satSatelliteBloomControls">
                      <div className="satSatelliteBloomSlider">
                        <span>CA AU</span>
                        <input type="range" min="0.005" max="0.5" step="0.005" value={closeApproachThreshold} onChange={(event) => setCloseApproachThreshold(parseFloat(event.target.value))} />
                        <span>{closeApproachThreshold.toFixed(3)}</span>
                      </div>
                    </div>
                    {bloomEnabled && (
                      <div className="satSatelliteBloomControls">
                        <div className="satSatelliteBloomSlider">
                          <span>Strength</span>
                          <input type="range" min="0" max="5" step="0.1" value={bloomStrength} onChange={(event) => setBloomStrength(parseFloat(event.target.value))} />
                          <span>{bloomStrength.toFixed(1)}</span>
                        </div>
                        <div className="satSatelliteBloomSlider">
                          <span>Radius</span>
                          <input type="range" min="0" max="2" step="0.05" value={bloomRadius} onChange={(event) => setBloomRadius(parseFloat(event.target.value))} />
                          <span>{bloomRadius.toFixed(2)}</span>
                        </div>
                        <div className="satSatelliteBloomSlider">
                          <span>Threshold</span>
                          <input type="range" min="0" max="2" step="0.05" value={bloomThreshold} onChange={(event) => setBloomThreshold(parseFloat(event.target.value))} />
                          <span>{bloomThreshold.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="satRightRailSection">
                <button className="satRightRailSectionHeader" onClick={() => setLegendCollapsed(c => !c)}>
                  <span>Population Legend</span>
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
                    <StatTile label="Visible Asteroids" value={performanceStats.visibleAsteroids} color="#4ecdc4" accent="#4ecdc4" />
                    <StatTile label="Culled" value={performanceStats.culledAsteroids} color="#FF9500" accent="#FF9500" />
                    <StatTile label="Active / Total" value={`${activeAsteroids} / ${asteroids.length}`} accent="#42a5f5" />
                    <StatTile label="Close Approaches" value={closeApproaches.length} color={closeApproaches.length > 0 ? "#FF9500" : "#4ecdc4"} accent={closeApproaches.length > 0 ? "#FF9500" : "#4ecdc4"} />
                    <StatTile label="Sim Speed" value={speedLabel} accent="#42a5f5" />
                    <StatTile label="Memory" value={performanceStats.memoryUsage} unit="objects" accent="#42a5f5" />
                    <StatTile label="Geometries" value={performanceStats.geometries} accent="#42a5f5" />
                    <StatTile label="Textures" value={performanceStats.textures} accent="#42a5f5" />
                    <StatTile label="NEO Count" value={neoCount} color="#FF9500" accent="#FF9500" />
                    <StatTile label="PHA Count" value={phaCount} color="#ff6b6b" accent="#ff6b6b" />
                  </div>

                  <div className="satDossierGrid">
                    <div className="satPanelCard">
                      <div className="satPanelCardHeader"><span>Coordinate System & Reference Frame</span></div>
                      <div className="satPanelCardBody">
                        <div className="satSatelliteHUDSectionGrid">
                          <div className="satSatelliteHUDSectionItem"><span>Reference Frame</span><span>Heliocentric Ecliptic J2000</span></div>
                          <div className="satSatelliteHUDSectionItem"><span>Origin</span><span>Sun Center</span></div>
                          <div className="satSatelliteHUDSectionItem"><span>X-Axis</span><span>Vernal Equinox</span></div>
                          <div className="satSatelliteHUDSectionItem"><span>Y-Axis</span><span>Ecliptic North</span></div>
                          <div className="satSatelliteHUDSectionItem"><span>Z-Axis</span><span>90° Ecliptic Longitude</span></div>
                          <div className="satSatelliteHUDSectionItem"><span>Units</span><span>AU (Scaled)</span></div>
                          <div className="satSatelliteHUDSectionItem"><span>Scale Factor</span><span>{ORBITAL_CONSTANTS.SCALE_FACTOR}</span></div>
                          <div className="satSatelliteHUDSectionItem"><span>1 AU</span><span>{AU_KM.toLocaleString()} km</span></div>
                          <div className="satSatelliteHUDSectionItem"><span>μ (Sun GM)</span><span>{SUN_GM.toExponential(4)} Km³/s²</span></div>
                        </div>
                      </div>
                    </div>

                    <div className="satPanelCard">
                      <div className="satPanelCardHeader"><span>Orbital Propagation Status</span></div>
                      <div className="satPanelCardBody">
                        <div className="satSatelliteHUDSectionGrid">
                          <div className="satSatelliteHUDSectionItem"><span>Two-body Kepler</span><span style={{ color: "#4ecdc4" }}>{keplerCount}</span></div>
                          <div className="satSatelliteHUDSectionItem"><span>NEO Asteroids</span><span style={{ color: "#FF9500" }}>{neoCount}</span></div>
                          <div className="satSatelliteHUDSectionItem"><span>PHAs</span><span style={{ color: "#ff6b6b" }}>{phaCount}</span></div>
                          <div className="satSatelliteHUDSectionItem"><span>Element Errors</span><span style={{ color: errors.length > 0 ? "#ff6b6b" : "#4ecdc4" }}>{errors.length}</span></div>
                          <div className="satSatelliteHUDSectionItem"><span>Simulation Time</span><span>{currentTime}</span></div>
                          <div className="satSatelliteHUDSectionItem"><span>Update Frequency</span><span>1/{PERFORMANCE_CONSTANTS.UPDATE_FREQUENCY} Frame</span></div>
                          <div className="satSatelliteHUDSectionItem"><span>Frustum Margin</span><span>{PERFORMANCE_CONSTANTS.FRUSTUM_MARGIN}x</span></div>
                          <div className="satSatelliteHUDSectionItem"><span>Trail Length</span><span>{PERFORMANCE_CONSTANTS.TRAIL_LENGTH} Samples</span></div>
                        </div>
                      </div>
                    </div>

                    <div className="satPanelCard">
                      <div className="satPanelCardHeader"><span>Observation Arc Distribution</span></div>
                      <div className="satPanelCardBody">
                        <div className="satSatelliteHUDSectionGrid">
                          <div className="satSatelliteHUDSectionItem"><span>Multi-decade (&gt;10y)</span><span style={{ color: "#4ecdc4" }}>{orbitArcStats.multiDecade}</span></div>
                          <div className="satSatelliteHUDSectionItem"><span>Multi-year (2-10y)</span><span style={{ color: "#7fe9e1" }}>{orbitArcStats.multiYear}</span></div>
                          <div className="satSatelliteHUDSectionItem"><span>Year-class (6m-2y)</span><span style={{ color: "#ffd93d" }}>{orbitArcStats.yearClass}</span></div>
                          <div className="satSatelliteHUDSectionItem"><span>Short (1-6m)</span><span style={{ color: "#FF9500" }}>{orbitArcStats.shortArc}</span></div>
                          <div className="satSatelliteHUDSectionItem"><span>Very Short (&lt;1m)</span><span style={{ color: "#ff6b6b" }}>{orbitArcStats.veryShort}</span></div>
                          <div className="satSatelliteHUDSectionItem"><span>Unknown</span><span>{orbitArcStats.unknown}</span></div>
                        </div>
                      </div>
                    </div>

                    <div className="satPanelCard">
                      <div className="satPanelCardHeader"><span>Population Statistics by Class</span></div>
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

                    {neoWatch && (
                      <div className="satPanelCard">
                        <div className="satPanelCardHeader"><span>NEO Watch Snapshot</span></div>
                        <div className="satPanelCardBody">
                          <div className="satSatelliteHUDSectionGrid">
                            <div className="satSatelliteHUDSectionItem"><span>Status</span><span style={{ color: neoWatch.overall?.color }}>{neoWatch.overall?.status}</span></div>
                            <div className="satSatelliteHUDSectionItem"><span>Next 7 Days</span><span>{neoWatch.next7Days || 0}</span></div>
                            <div className="satSatelliteHUDSectionItem"><span>Next 30 Days</span><span>{neoWatch.next30Days || 0}</span></div>
                            <div className="satSatelliteHUDSectionItem"><span>PHA Catalog</span><span style={{ color: "#ff6b6b" }}>{neoWatch.totalPHACount || 0}</span></div>
                            <div className="satSatelliteHUDSectionItem"><span>Sentry Risk</span><span style={{ color: (neoWatch.sentryRiskCount || 0) > 0 ? "#FF9500" : "#4ecdc4" }}>{neoWatch.sentryRiskCount || 0}</span></div>
                            <div className="satSatelliteHUDSectionItem"><span>Recent Discoveries</span><span>{neoWatch.recentDiscoveriesCount || 0}</span></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </PanelModal>
          )}

          {detailedAsteroid && enrichedDetailedAsteroid && (
            <PanelModal onClose={() => setDetailedAsteroid(null)}>
              <div ref={detailedPanelRef} className="satSatelliteDetailedPanel" tabIndex={0}>
                <div className="satSatelliteHUDPanelHeader">
                  <span>
                    Asteroid Details: {enrichedDetailedAsteroid.name}
                    <small style={{ marginLeft: "12px", color: orbitArcAgeColor(enrichedDetailedAsteroid.observationArcDays) }}>
                      Arc: {orbitArcAgeLabel(enrichedDetailedAsteroid.observationArcDays)}
                    </small>
                  </span>
                  <button className="satSatelliteCloseButton" onClick={() => setDetailedAsteroid(null)}><FontAwesomeIcon icon={faXmark} /></button>
                </div>

                <div className="satDossierTabs">
                  <div className="satDossierTabsScroll">
                    {[
                      { key: "orbital", label: "Orbital", icon: faMeteor },
                      { key: "intel", label: "AI Brief", icon: faBrain },
                      { key: "observations", label: "Observations", icon: faEye },
                      { key: "passes", label: "Flyby Predictions", icon: faTowerBroadcast },
                      { key: "tle", label: "Orbit Arc", icon: faClock }
                    ].map(tab => (
                      <button
                        key={tab.key}
                        className={`satDossierTab ${activeDossierTab === tab.key ? "satDossierTabActive" : ""}`}
                        onClick={() => {
                          setActiveDossierTab(tab.key);
                          if (tab.key === "intel" && !missionIntelMap.has(enrichedDetailedAsteroid.designation)) {
                            fetchMissionIntelligenceFor(enrichedDetailedAsteroid);
                          }
                          if (tab.key === "observations" && !observationMap.has(enrichedDetailedAsteroid.designation)) {
                            fetchObservationDataFor(enrichedDetailedAsteroid);
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
                    <MissionIntelligenceTab asteroid={enrichedDetailedAsteroid} intelligence={currentMissionIntel} loading={missionIntelLoading && !currentMissionIntel} onRefresh={() => fetchMissionIntelligenceFor(enrichedDetailedAsteroid, true)} />
                  )}

                  {activeDossierTab === "observations" && (
                    <ObservationsTab asteroid={enrichedDetailedAsteroid} observation={currentObservation} loading={observationLoading && !currentObservation} onRefresh={() => fetchObservationDataFor(enrichedDetailedAsteroid, true)} />
                  )}

                  {activeDossierTab === "passes" && (
                    <FlybyPredictionsTab asteroid={enrichedDetailedAsteroid} observerLocation={observerLocation} onLocationChange={setObserverLocation} onPickLocation={() => setShowLocationPicker(true)} currentDate={new Date(simulationDateMsRef.current)} />
                  )}

                  {activeDossierTab === "tle" && (
                    <OrbitArcTab asteroid={enrichedDetailedAsteroid} />
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
            <span>Asteroids: {asteroids.length}</span>
            <span>Tracked: {activeAsteroids}</span>
            <span>Close Approaches: {closeApproaches.length}</span>
            <span>Sentry Candidates: {sentryCandidates.length}</span>
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
          Monitored areas are checked against every fireball reported by US Government sensors, and a fireball detected within the proximity radius of an area raises a warning for that area. Choosing Alert For All Areas points the alert bell, the counts, and the alert sounds at all of them at once, while impact risk, unconfirmed object, and close approach alerts apply everywhere. Choose a point with a radius (a circle around an address or coordinates) or a bounding box (a rectangle).
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

export default AsteroidTracker;