import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
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
  faChevronDown, faChevronUp, faXmark, faXmarkSquare, faSquareCheck, faClone,
  faSun, faBolt, faTriangleExclamation, faGlobe, faBrain, faEye,
  faTowerBroadcast, faRadiation, faWind, faMagnet, faClock, faFire,
  faCircleNodes, faSatelliteDish, faMapLocation, faRoute, faSpinner,
  faCheckCircle, faXmarkCircle, faMicrochip, faMagnifyingGlass, faFilter,
  faSort, faGauge, faShieldHalved, faArrowTrendDown, faArrowTrendUp,
  faRulerCombined, faTemperatureHigh, faAtom, faDiagramProject,
  faNetworkWired, faChartArea, faChartColumn, faTable, faList,
  faFlask, faPersonChalkboard, faBookOpen, faMicroscope, faLayerGroup
} from "@fortawesome/free-solid-svg-icons";
import * as satelliteJs from "satellite.js";
import DinoLabsNav from "../../../helpers/Nav.jsx";
import "../../../styles/helperStyles/Switch.css";
import "../../../styles/mainStyles/DinoSat/DinoSatTrackers/Satellites/SatelliteTracker.css";

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
  { label: "-10 hours/sec", value: -36000 },
  { label: "-5 hours/sec", value: -18000 },
  { label: "-1 hour/sec", value: -3600 },
  { label: "Real-time", value: 1 },
  { label: "1 hour/sec", value: 3600 },
  { label: "5 hours/sec", value: 18000 },
  { label: "10 hours/sec", value: 36000 }
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

const WORLD_MAP_IMAGE_URL = "https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57752/land_shallow_topo_2048.jpg";

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

const dateToJulianDate = (date) => date.getTime() / 86400000.0 + 2440587.5;

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

const tleAgeColor = (ageDays) => {
  if (ageDays === null || ageDays === undefined) return "#808080";
  if (ageDays < 1) return "#4ade80";
  if (ageDays < 3) return "#84cc16";
  if (ageDays < 7) return "#facc15";
  if (ageDays < 14) return "#fb923c";
  return "#ef4444";
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
  const altThreshKm = thresholdKm * 1.5;

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

        if (realKm < thresholdKm && altDiff < altThreshKm) {
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

  const handleMouseLeave = useCallback(() => setHover(null), []);

  if (!stats || numericValues.length === 0) {
    return (
      <div className="dinoSatChartEmpty">
        <small>No data available.</small>
      </div>
    );
  }

  const hoveredItem = hover ? numericValues[hover.index] : null;

  return (
    <div className="dinoSatChartContainer" ref={wrapperRef}>
      <div className="dinoSatChartHeader">
        {label && <span className="dinoSatChartLabel">{label}</span>}
        <div className="dinoSatChartStats">
          <span className="dinoSatChartStat"><b>Latest</b>{valueFormatter ? valueFormatter(stats.latest) : stats.latest.toFixed(2)}{unit ? ` ${unit}` : ""}</span>
          <span className="dinoSatChartStat"><b>Min</b>{valueFormatter ? valueFormatter(stats.rawMin) : stats.rawMin.toFixed(2)}</span>
          <span className="dinoSatChartStat"><b>Max</b>{valueFormatter ? valueFormatter(stats.rawMax) : stats.rawMax.toFixed(2)}</span>
          <span className="dinoSatChartStat"><b>Mean</b>{valueFormatter ? valueFormatter(stats.mean) : stats.mean.toFixed(2)}</span>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        className="dinoSatChartCanvas"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      {hover && hoveredItem && (
        <div
          className="dinoSatChartTooltip"
          style={{
            left: `${Math.min(width - 180, Math.max(0, hover.clientX - hover.rectLeft + 12))}px`,
            top: "10px"
          }}
        >
          <div className="dinoSatChartTooltipTime">{formatChartTimeFull(hoveredItem.time)}</div>
          <div className="dinoSatChartTooltipValue" style={{ color: accentColor }}>
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
    <div className={`dinoSatStatTile ${large ? "dinoSatStatTileLarge" : ""}`} style={{ borderLeftColor: accent || "var(--st-accent-primary)" }}>
      <div className="dinoSatStatTileLabel">{label}</div>
      <div className="dinoSatStatTileValue" style={color ? { color } : undefined}>
        {value}
        {unit && <span className="dinoSatStatTileUnit">{unit}</span>}
      </div>
      {sub && <div className="dinoSatStatTileSub">{sub}</div>}
    </div>
  );
};

const SpaceWeatherStrip = ({ data, loading, expanded, onToggle }) => {
  if (loading && !data) {
    return (
      <div className="dinoSatSpaceWeatherStrip dinoSatSpaceWeatherLoading">
        <FontAwesomeIcon icon={faSpinner} spin /> <span>Loading space weather...</span>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="dinoSatSpaceWeatherStrip dinoSatSpaceWeatherUnavailable">
        <FontAwesomeIcon icon={faTriangleExclamation} /> <span>Space weather unavailable.</span>
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
    <div className="dinoSatSpaceWeatherStrip">
      <div className="dinoSatSpaceWeatherStripCells">
        <div className="dinoSatSpaceWeatherCell" style={{ borderLeftColor: overall.color }}>
          <div className="dinoSatSpaceWeatherCellLabel">Status</div>
          <div className="dinoSatSpaceWeatherCellValue" style={{ color: overall.color }}>{overall.status}</div>
        </div>

        {kp && (
          <div className="dinoSatSpaceWeatherCell" style={{ borderLeftColor: kp.classification.color }}>
            <div className="dinoSatSpaceWeatherCellLabel">Kp · {kp.classification.level}</div>
            <div className="dinoSatSpaceWeatherCellValue">{kp.current}<span>{kp.classification.label}</span></div>
          </div>
        )}

        {f107 && (
          <div className="dinoSatSpaceWeatherCell" style={{ borderLeftColor: f107.classification.color }}>
            <div className="dinoSatSpaceWeatherCellLabel">F10.7 Flux</div>
            <div className="dinoSatSpaceWeatherCellValue">{f107.current}<span>sfu · {f107.classification.label}</span></div>
          </div>
        )}

        {sw && sw.speed && (
          <div className="dinoSatSpaceWeatherCell" style={{ borderLeftColor: sw.classification?.color || "#666" }}>
            <div className="dinoSatSpaceWeatherCellLabel">Solar Wind</div>
            <div className="dinoSatSpaceWeatherCellValue">{sw.speed}<span>km/s · {sw.density?.toFixed(1)} p/cm³</span></div>
          </div>
        )}

        {imf && imf.bz !== null && (
          <div className="dinoSatSpaceWeatherCell" style={{ borderLeftColor: imf.bz < -5 ? "#e04020" : imf.bz < 0 ? "#c08040" : "#5a7068" }}>
            <div className="dinoSatSpaceWeatherCellLabel">IMF Bz</div>
            <div className="dinoSatSpaceWeatherCellValue">{imf.bz}<span>nT · {imf.bz < 0 ? "south" : "north"}</span></div>
          </div>
        )}

        {xray && (
          <div className="dinoSatSpaceWeatherCell" style={{ borderLeftColor: xray.classification === "X" ? "#e04020" : xray.classification === "M" ? "#c08040" : "#5a7068" }}>
            <div className="dinoSatSpaceWeatherCellLabel">X-Ray</div>
            <div className="dinoSatSpaceWeatherCellValue">Class {xray.classification}<span>{xray.flux.toExponential(1)} W/m²</span></div>
          </div>
        )}

        {protons && (
          <div className="dinoSatSpaceWeatherCell" style={{ borderLeftColor: protons.stormLevel === "S0" ? "#5a7068" : "#c08040" }}>
            <div className="dinoSatSpaceWeatherCellLabel">Protons</div>
            <div className="dinoSatSpaceWeatherCellValue">{protons.stormLevel}<span>{protons.flux?.toFixed(2)} pfu</span></div>
          </div>
        )}

        {scales && (
          <div className="dinoSatSpaceWeatherCell">
            <div className="dinoSatSpaceWeatherCellLabel">NOAA Scales</div>
            <div className="dinoSatSpaceWeatherCellValue">G{scales.geomagnetic.scale} S{scales.radiation.scale} R{scales.radioBlackout.scale}<span>{alertCount} alerts</span></div>
          </div>
        )}
      </div>

      <button
        className="dinoSatSpaceWeatherToggle"
        onClick={onToggle}
        title={expanded ? "Hide briefing." : "Show full briefing."}
      >
        {expanded ? "Hide Briefing" : "Show Briefing"}
        <FontAwesomeIcon icon={expanded ? faChevronUp : faChevronDown} />
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
    <div className="dinoSatDossierTabContent">
      <div className="dinoSatStatTileGrid">
        <StatTile label="Overall Status" value={data.overall?.status || "Unknown"} sub={`Severity ${data.overall?.severity || 0}/6`} color={data.overall?.color} accent={data.overall?.color} large />
        {data.kpIndex && (<StatTile label={`Kp Index · ${data.kpIndex.classification.level}`} value={data.kpIndex.current} sub={data.kpIndex.classification.label} color={data.kpIndex.classification.color} accent={data.kpIndex.classification.color} />)}
        {data.f107 && (<StatTile label="F10.7 Flux" value={data.f107.current} unit="sfu" sub={data.f107.classification.label} color={data.f107.classification.color} accent={data.f107.classification.color} />)}
        {data.solarWind && data.solarWind.speed && (<StatTile label="Solar Wind Speed" value={data.solarWind.speed} unit="km/s" sub={`${data.solarWind.density?.toFixed(1)} p/cm³ · ${data.solarWind.classification?.label || ""}`} color={data.solarWind.classification?.color} accent={data.solarWind.classification?.color} />)}
        {data.imf && data.imf.bz !== null && (<StatTile label="IMF Bz" value={data.imf.bz} unit="nT" sub={data.imf.orientation} color={data.imf.bz < -5 ? "#e04020" : data.imf.bz < 0 ? "#c08040" : "#5a7068"} accent={data.imf.bz < -5 ? "#e04020" : data.imf.bz < 0 ? "#c08040" : "#5a7068"} />)}
        {data.xray && (<StatTile label="X-Ray Class" value={data.xray.classification} sub={data.xray.flux.toExponential(2) + " W/m²"} color={data.xray.classification === "X" ? "#e04020" : data.xray.classification === "M" ? "#c08040" : "#5a7068"} accent={data.xray.classification === "X" ? "#e04020" : data.xray.classification === "M" ? "#c08040" : "#5a7068"} />)}
        {data.protons && (<StatTile label="Proton Storm" value={data.protons.stormLevel} sub={`${data.protons.flux?.toFixed(2)} pfu (≥10 MeV)`} color={data.protons.stormLevel === "S0" ? "#5a7068" : "#c08040"} accent={data.protons.stormLevel === "S0" ? "#5a7068" : "#c08040"} />)}
        {data.electrons && (<StatTile label="Electron Flux" value={data.electrons.flux?.toFixed(2)} unit="e/cm²·s·sr" sub="≥2 MeV" accent="#9a9a4a" />)}
        {data.scales && (<StatTile label="NOAA Scales" value={`G${data.scales.geomagnetic.scale} S${data.scales.radiation.scale} R${data.scales.radioBlackout.scale}`} sub={`${data.alerts?.length || 0} active alerts`} accent="#42a5f5" />)}
      </div>

      {data.kpIndex && data.kpIndex.history && data.kpIndex.history.length > 0 && (
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faChartArea} /> Kp Index · Last 24h</span></div>
          <div className="dinoSatPanelCardBody">
            <ChartCanvas values={data.kpIndex.history.slice(-24)} height={160} accent="#9a9a4a" colorFn={(v) => v < 4 ? "#5a7068" : v < 6 ? "#c08040" : "#e04020"} label="Kp index" unit="" valueFormatter={(v) => v.toFixed(1)} mode="bars" yMin={0} yMax={9} threshold={5} thresholdLabel="Storm threshold (Kp 5)" />
          </div>
        </div>
      )}
    </div>
  );

  const renderGeomagnetic = () => (
    <div className="dinoSatDossierTabContent">
      <div className="dinoSatStatTileGrid">
        {data.kpIndex && (
          <>
            <StatTile label="Kp Current" value={data.kpIndex.current} accent={data.kpIndex.classification.color} color={data.kpIndex.classification.color} sub={data.kpIndex.classification.level} />
            <StatTile label="Storm Class" value={data.kpIndex.classification.level} sub={data.kpIndex.classification.label} accent={data.kpIndex.classification.color} />
            <StatTile label="Severity" value={`${data.kpIndex.classification.severity}/6`} accent={data.kpIndex.classification.color} />
          </>
        )}
        {data.imf && (
          <>
            <StatTile label="IMF Bz" value={data.imf.bz} unit="nT" sub={data.imf.orientation} accent={data.imf.bz < -5 ? "#e04020" : "#5a7068"} color={data.imf.bz < -5 ? "#e04020" : undefined} />
            <StatTile label="IMF Bt" value={data.imf.bt} unit="nT" sub="Total field magnitude" accent="#42a5f5" />
          </>
        )}
      </div>

      {data.kpIndex && data.kpIndex.history && (
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faChartArea} /> Kp Time Series · 24h</span></div>
          <div className="dinoSatPanelCardBody">
            <ChartCanvas values={data.kpIndex.history} height={170} accent="#9a9a4a" colorFn={(v) => v < 4 ? "#5a7068" : v < 6 ? "#c08040" : "#e04020"} label="Kp index" valueFormatter={(v) => v.toFixed(1)} mode="bars" yMin={0} yMax={9} threshold={5} thresholdLabel="Storm threshold" />
          </div>
        </div>
      )}

      {data.imf && data.imf.history && (
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faChartArea} /> IMF Bz Time Series</span></div>
          <div className="dinoSatPanelCardBody">
            <ChartCanvas values={data.imf.history} valueKey="bz" height={170} accent="#42a5f5" colorFn={(v) => v < -5 ? "#e04020" : v < 0 ? "#c08040" : "#5a7068"} label="IMF Bz (GSM)" unit="nT" valueFormatter={(v) => v.toFixed(1)} threshold={-5} thresholdLabel="Geoeffective threshold" />
          </div>
        </div>
      )}

      <div className="dinoSatPanelCard">
        <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faBookOpen} /> Geomagnetic Operational Notes</span></div>
        <div className="dinoSatPanelCardBody">
          <div className="dinoSatBriefingGrid">
            <div className="dinoSatBriefingItem"><b>GIC Risk</b><p>Geomagnetically induced currents threaten power grid transformers during sustained Kp ≥ 6 events. Operators should monitor reactive power and consider load shedding.</p></div>
            <div className="dinoSatBriefingItem"><b>HF Propagation</b><p>Polar cap absorption events degrade HF communications above 60° geomagnetic latitude during severe storms.</p></div>
            <div className="dinoSatBriefingItem"><b>Atmospheric Drag</b><p>Heating from energetic precipitation expands the upper atmosphere, increasing drag on LEO assets by 50-300% during major storms.</p></div>
            <div className="dinoSatBriefingItem"><b>Surface Charging</b><p>Substorm injection events cause differential charging on GEO satellites; expect ESD anomalies during sustained Kp ≥ 5.</p></div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSolar = () => (
    <div className="dinoSatDossierTabContent">
      <div className="dinoSatStatTileGrid">
        {data.f107 && (
          <>
            <StatTile label="F10.7 Observed" value={data.f107.current} unit="sfu" accent={data.f107.classification.color} color={data.f107.classification.color} sub={data.f107.classification.label} />
            <StatTile label="F10.7 Adjusted" value={data.f107.adjusted} unit="sfu" sub="1 AU normalized" accent="#fb923c" />
          </>
        )}
        {data.xray && (
          <>
            <StatTile label="X-Ray Flux" value={data.xray.flux.toExponential(2)} unit="W/m²" accent={data.xray.classification === "X" ? "#e04020" : "#fb923c"} />
            <StatTile label="X-Ray Class" value={data.xray.classification} sub="0.1-0.8 nm" accent={data.xray.classification === "X" ? "#e04020" : "#fb923c"} color={data.xray.classification === "X" ? "#e04020" : "#fb923c"} />
          </>
        )}
        {data.solarWind && (
          <>
            <StatTile label="SW Speed" value={data.solarWind.speed} unit="km/s" accent={data.solarWind.classification?.color} color={data.solarWind.classification?.color} sub={data.solarWind.classification?.label} />
            <StatTile label="SW Density" value={data.solarWind.density?.toFixed(2)} unit="p/cm³" accent="#42a5f5" />
            <StatTile label="SW Temperature" value={data.solarWind.temperature?.toLocaleString()} unit="K" accent="#fb923c" />
          </>
        )}
      </div>

      {data.f107 && data.f107.history && (
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faChartArea} /> F10.7 30-Day Trend</span></div>
          <div className="dinoSatPanelCardBody">
            <ChartCanvas values={data.f107.history} height={170} accent="#fb923c" colorFn={(v) => v < 100 ? "#5a7068" : v < 150 ? "#9a9a4a" : "#c08040"} label="F10.7 flux" unit="sfu" valueFormatter={(v) => v.toFixed(0)} threshold={150} thresholdLabel="High activity" />
          </div>
        </div>
      )}

      {data.solarWind && data.solarWind.history && (
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faWind} /> Solar Wind Speed</span></div>
          <div className="dinoSatPanelCardBody">
            <ChartCanvas values={data.solarWind.history} valueKey="speed" height={170} accent="#4ECDC4" colorFn={(v) => v < 400 ? "#5a7068" : v < 600 ? "#9a9a4a" : "#c08040"} label="Solar wind speed" unit="km/s" valueFormatter={(v) => v.toFixed(0)} threshold={500} thresholdLabel="Elevated stream" />
          </div>
        </div>
      )}

      {data.solarRegions && data.solarRegions.length > 0 && (
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faSun} /> Active Solar Regions ({data.solarRegions.length})</span></div>
          <div className="dinoSatPanelCardBody">
            <div className="dinoSatTableScroll">
              <table className="dinoSatDataTable">
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
              </table>
            </div>
          </div>
        </div>
      )}

      {data.cmes && data.cmes.length > 0 && (
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faBolt} /> Recent CME Events</span></div>
          <div className="dinoSatPanelCardBody">
            <div className="dinoSatTableScroll">
              <table className="dinoSatDataTable">
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
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderParticles = () => (
    <div className="dinoSatDossierTabContent">
      <div className="dinoSatStatTileGrid">
        {data.protons && (
          <>
            <StatTile label="Proton Flux" value={data.protons.flux?.toFixed(3)} unit="pfu" sub="≥10 MeV integral" accent={data.protons.stormLevel === "S0" ? "#5a7068" : "#c08040"} />
            <StatTile label="Storm Level" value={data.protons.stormLevel} sub="NOAA SEP scale" color={data.protons.stormLevel === "S0" ? "#5a7068" : "#c08040"} accent={data.protons.stormLevel === "S0" ? "#5a7068" : "#c08040"} />
          </>
        )}
        {data.electrons && (<StatTile label="Electron Flux" value={data.electrons.flux?.toFixed(2)} unit="e/cm²·s·sr" sub="≥2 MeV integral" accent="#9a9a4a" />)}
        {data.xray && (<StatTile label="Soft X-Ray" value={data.xray.flux.toExponential(2)} unit="W/m²" sub={`Class ${data.xray.classification} · GOES primary`} accent={data.xray.classification === "X" ? "#e04020" : "#5a7068"} />)}
      </div>

      {data.xray && data.xray.history && (
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faChartArea} /> Soft X-Ray (0.1-0.8 nm) · 6h</span></div>
          <div className="dinoSatPanelCardBody">
            <ChartCanvas values={data.xray.history.map(h => ({ time: h.time, value: Math.log10(Math.max(1e-9, h.flux)) }))} height={170} accent="#fb923c" label="log₁₀(flux)" unit="W/m²" valueFormatter={(v) => `1e${v.toFixed(1)}`} threshold={-5} thresholdLabel="M-class threshold" />
          </div>
        </div>
      )}

      {data.protons && data.protons.history && (
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faChartArea} /> Proton Flux (≥10 MeV) · 6h</span></div>
          <div className="dinoSatPanelCardBody">
            <ChartCanvas values={data.protons.history} valueKey="flux" height={170} accent="#c08040" colorFn={(v) => v < 1 ? "#5a7068" : v < 10 ? "#9a9a4a" : "#e04020"} label="Proton flux" unit="pfu" valueFormatter={(v) => v.toFixed(2)} threshold={10} thresholdLabel="S1 storm threshold" />
          </div>
        </div>
      )}

      {data.electrons && data.electrons.history && (
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faChartArea} /> Electron Flux (≥2 MeV) · 24h</span></div>
          <div className="dinoSatPanelCardBody">
            <ChartCanvas values={data.electrons.history} valueKey="flux" height={170} accent="#9a9a4a" label="Electron flux" unit="e/cm²·s·sr" valueFormatter={(v) => v.toExponential(1)} />
          </div>
        </div>
      )}

      <div className="dinoSatPanelCard">
        <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faBookOpen} /> Particle Environment Reference</span></div>
        <div className="dinoSatPanelCardBody">
          <div className="dinoSatBriefingGrid">
            <div className="dinoSatBriefingItem"><b>SEP Events</b><p>Solar energetic protons cause single-event upsets and total ionizing dose accumulation. Polar passes and high-altitude orbits are most exposed.</p></div>
            <div className="dinoSatBriefingItem"><b>Inner Belt</b><p>Trapped protons (10-100 MeV) at L=1.3-2.5 dominate radiation environment for LEO above 1000 km.</p></div>
            <div className="dinoSatBriefingItem"><b>Outer Belt</b><p>Trapped relativistic electrons at L=3-7 cause deep dielectric charging on GEO assets, especially during HSS-driven enhancements.</p></div>
            <div className="dinoSatBriefingItem"><b>South Atlantic Anomaly</b><p>Region of weakened geomagnetic field where inner-belt protons reach LEO altitudes; major source of SEU on civilian satellites.</p></div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderOperational = () => (
    <div className="dinoSatDossierTabContent">
      <div className="dinoSatPanelCard">
        <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faShieldHalved} /> Mission Domain Risk Matrix</span></div>
        <div className="dinoSatPanelCardBody">
          <div className="dinoSatRiskMatrix">
            <div className="dinoSatRiskMatrixRow dinoSatRiskMatrixHeader">
              <div>Domain</div><div>Geomag</div><div>Solar Flare</div><div>SEP</div><div>Drag</div><div>Charging</div>
            </div>
            <div className="dinoSatRiskMatrixRow">
              <div>LEO Imaging</div>
              <div className={`dinoSatRiskCell ${data.kpIndex?.classification.severity > 3 ? "dinoSatRiskHigh" : "dinoSatRiskLow"}`}>{data.kpIndex?.classification.severity > 3 ? "HIGH" : "LOW"}</div>
              <div className={`dinoSatRiskCell ${data.xray?.classification === "X" ? "dinoSatRiskHigh" : "dinoSatRiskLow"}`}>{data.xray?.classification === "X" ? "HIGH" : "LOW"}</div>
              <div className={`dinoSatRiskCell ${data.protons?.flux > 10 ? "dinoSatRiskHigh" : "dinoSatRiskLow"}`}>{data.protons?.flux > 10 ? "HIGH" : "LOW"}</div>
              <div className={`dinoSatRiskCell ${data.f107?.current > 150 ? "dinoSatRiskHigh" : "dinoSatRiskLow"}`}>{data.f107?.current > 150 ? "HIGH" : "LOW"}</div>
              <div className="dinoSatRiskCell dinoSatRiskLow">LOW</div>
            </div>
            <div className="dinoSatRiskMatrixRow">
              <div>GEO Comms</div>
              <div className={`dinoSatRiskCell ${data.kpIndex?.classification.severity > 4 ? "dinoSatRiskHigh" : "dinoSatRiskMod"}`}>{data.kpIndex?.classification.severity > 4 ? "HIGH" : "MOD"}</div>
              <div className={`dinoSatRiskCell ${data.xray?.classification === "X" ? "dinoSatRiskMod" : "dinoSatRiskLow"}`}>{data.xray?.classification === "X" ? "MOD" : "LOW"}</div>
              <div className={`dinoSatRiskCell ${data.protons?.flux > 10 ? "dinoSatRiskHigh" : "dinoSatRiskLow"}`}>{data.protons?.flux > 10 ? "HIGH" : "LOW"}</div>
              <div className="dinoSatRiskCell dinoSatRiskLow">N/A</div>
              <div className={`dinoSatRiskCell ${data.electrons?.flux > 1000 ? "dinoSatRiskHigh" : "dinoSatRiskMod"}`}>{data.electrons?.flux > 1000 ? "HIGH" : "MOD"}</div>
            </div>
            <div className="dinoSatRiskMatrixRow">
              <div>GNSS</div>
              <div className={`dinoSatRiskCell ${data.kpIndex?.classification.severity > 3 ? "dinoSatRiskHigh" : "dinoSatRiskLow"}`}>{data.kpIndex?.classification.severity > 3 ? "HIGH" : "LOW"}</div>
              <div className={`dinoSatRiskCell ${data.xray?.classification === "X" ? "dinoSatRiskHigh" : "dinoSatRiskLow"}`}>{data.xray?.classification === "X" ? "HIGH" : "LOW"}</div>
              <div className={`dinoSatRiskCell ${data.protons?.flux > 10 ? "dinoSatRiskMod" : "dinoSatRiskLow"}`}>{data.protons?.flux > 10 ? "MOD" : "LOW"}</div>
              <div className="dinoSatRiskCell dinoSatRiskLow">LOW</div>
              <div className="dinoSatRiskCell dinoSatRiskLow">LOW</div>
            </div>
            <div className="dinoSatRiskMatrixRow">
              <div>HF Comms</div>
              <div className={`dinoSatRiskCell ${data.kpIndex?.classification.severity > 2 ? "dinoSatRiskHigh" : "dinoSatRiskLow"}`}>{data.kpIndex?.classification.severity > 2 ? "HIGH" : "LOW"}</div>
              <div className={`dinoSatRiskCell ${data.xray?.classification === "M" || data.xray?.classification === "X" ? "dinoSatRiskHigh" : "dinoSatRiskLow"}`}>{data.xray?.classification === "M" || data.xray?.classification === "X" ? "HIGH" : "LOW"}</div>
              <div className={`dinoSatRiskCell ${data.protons?.flux > 10 ? "dinoSatRiskHigh" : "dinoSatRiskLow"}`}>{data.protons?.flux > 10 ? "HIGH" : "LOW"}</div>
              <div className="dinoSatRiskCell dinoSatRiskLow">N/A</div>
              <div className="dinoSatRiskCell dinoSatRiskLow">N/A</div>
            </div>
            <div className="dinoSatRiskMatrixRow">
              <div>Power Grid</div>
              <div className={`dinoSatRiskCell ${data.kpIndex?.classification.severity > 4 ? "dinoSatRiskHigh" : data.kpIndex?.classification.severity > 2 ? "dinoSatRiskMod" : "dinoSatRiskLow"}`}>{data.kpIndex?.classification.severity > 4 ? "HIGH" : data.kpIndex?.classification.severity > 2 ? "MOD" : "LOW"}</div>
              <div className="dinoSatRiskCell dinoSatRiskLow">LOW</div>
              <div className="dinoSatRiskCell dinoSatRiskLow">LOW</div>
              <div className="dinoSatRiskCell dinoSatRiskLow">N/A</div>
              <div className="dinoSatRiskCell dinoSatRiskLow">N/A</div>
            </div>
          </div>
        </div>
      </div>

      {data.alerts && data.alerts.length > 0 && (
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faTriangleExclamation} /> SWPC Active Alerts ({data.alerts.length})</span></div>
          <div className="dinoSatPanelCardBody">
            <div className="dinoSatSpaceWeatherAlerts">
              {data.alerts.map((a, i) => (
                <div key={i} className="dinoSatSpaceWeatherAlert">
                  <div className="dinoSatSpaceWeatherAlertId">{a.productId}</div>
                  <div className="dinoSatSpaceWeatherAlertTime">{a.issueDateTime}</div>
                  <pre className="dinoSatSpaceWeatherAlertMsg">{a.message}</pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderAI = () => (
    <div className="dinoSatDossierTabContent">
      {aiAnalysis && !aiAnalysis.error && (
        <div className="dinoSatMissionIntelHeader">
          <small>
            Generated {formatGeneratedAt(aiAnalysis.generatedAt)}
            {aiAnalysis.tokenUsage && ` · tokens: ${aiAnalysis.tokenUsage.total || "?"}`}
            {aiAnalysis.stages && ` · ${aiAnalysis.stages} stages`}
          </small>
          <button className="dinoSatSatelliteSelectButton" onClick={onRequestAIAnalysis} disabled={aiLoading}>
            <FontAwesomeIcon icon={aiLoading ? faSpinner : faBrain} spin={aiLoading} /> Regenerate
          </button>
        </div>
      )}

      {aiLoading && !aiAnalysis && (
        <div className="dinoSatStatusDisplay">
          <FontAwesomeIcon icon={faSpinner} spin />
          <p>Querying multi-stage AI ensemble for space weather operational analysis...</p>
        </div>
      )}

      {!aiLoading && !aiAnalysis && (
        <div className="dinoSatStatusDisplay">
          <FontAwesomeIcon icon={faSpinner} spin />
          <p>Preparing AI analysis...</p>
        </div>
      )}

      {aiAnalysis && aiAnalysis.error && (
        <div className="dinoSatStatusDisplay dinoSatStatusError">
          <FontAwesomeIcon icon={faTriangleExclamation} />
          <p>AI analysis failed: {aiAnalysis.error}</p>
          <button className="dinoSatSatelliteSelectButton" onClick={onRequestAIAnalysis} disabled={aiLoading}>
            <FontAwesomeIcon icon={aiLoading ? faSpinner : faBrain} spin={aiLoading} /> Retry
          </button>
        </div>
      )}

      {aiAnalysis && !aiAnalysis.error && aiAnalysis.report && (
        <>
          {aiAnalysis.report.executiveSummary && (
            <div className="dinoSatPanelCard">
              <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faPersonChalkboard} /> Executive Summary</span></div>
              <div className="dinoSatPanelCardBody"><p className="dinoSatMissionBriefText">{safeRenderText(aiAnalysis.report.executiveSummary)}</p></div>
            </div>
          )}
          {aiAnalysis.report.currentConditions && (
            <div className="dinoSatPanelCard">
              <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faGauge} /> Current Conditions Analysis</span></div>
              <div className="dinoSatPanelCardBody"><p className="dinoSatMissionBriefText">{safeRenderText(aiAnalysis.report.currentConditions)}</p></div>
            </div>
          )}
          {aiAnalysis.report.forecast24h && (
            <div className="dinoSatPanelCard">
              <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faArrowTrendUp} /> 24-Hour Forecast</span></div>
              <div className="dinoSatPanelCardBody"><p className="dinoSatMissionBriefText">{safeRenderText(aiAnalysis.report.forecast24h)}</p></div>
            </div>
          )}
          {aiAnalysis.report.forecast72h && (
            <div className="dinoSatPanelCard">
              <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faArrowTrendUp} /> 72-Hour Outlook</span></div>
              <div className="dinoSatPanelCardBody"><p className="dinoSatMissionBriefText">{safeRenderText(aiAnalysis.report.forecast72h)}</p></div>
            </div>
          )}
          {aiAnalysis.report.satelliteImpacts && Array.isArray(aiAnalysis.report.satelliteImpacts) && (
            <div className="dinoSatPanelCard">
              <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faSatellite} /> Satellite Impact Assessment</span></div>
              <div className="dinoSatPanelCardBody">
                <div className="dinoSatBriefingGrid">
                  {aiAnalysis.report.satelliteImpacts.map((s, i) => (
                    <div key={i} className="dinoSatBriefingItem">
                      <b>{safeRenderText(s.regime || `Item ${i + 1}`)}</b>
                      <p>{safeRenderText(s.impact || s.description || "")}</p>
                      {s.severity && <small style={{ color: s.severity === "High" ? "#e04020" : s.severity === "Moderate" ? "#c08040" : "#5a7068" }}>Severity: {safeRenderText(s.severity)}</small>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {aiAnalysis.report.recommendedActions && Array.isArray(aiAnalysis.report.recommendedActions) && (
            <div className="dinoSatPanelCard">
              <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faList} /> Recommended Operational Actions</span></div>
              <div className="dinoSatPanelCardBody">
                <ol className="dinoSatNumberedList">
                  {aiAnalysis.report.recommendedActions.map((a, i) => (
                    <li key={i}>{safeRenderText(a)}</li>
                  ))}
                </ol>
              </div>
            </div>
          )}
          {aiAnalysis.report.historicalContext && (
            <div className="dinoSatPanelCard">
              <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faClock} /> Historical Context</span></div>
              <div className="dinoSatPanelCardBody"><p className="dinoSatMissionBriefText">{safeRenderText(aiAnalysis.report.historicalContext)}</p></div>
            </div>
          )}
          {aiAnalysis.report.scientificAnalysis && (
            <div className="dinoSatPanelCard">
              <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faMicroscope} /> Scientific Analysis</span></div>
              <div className="dinoSatPanelCardBody"><p className="dinoSatMissionBriefText">{safeRenderText(aiAnalysis.report.scientificAnalysis)}</p></div>
            </div>
          )}
          {aiAnalysis.sources && aiAnalysis.sources.length > 0 && (
            <div className="dinoSatPanelCard">
              <div className="dinoSatPanelCardHeader"><span>Grounded Sources</span></div>
              <div className="dinoSatPanelCardBody">
                <div className="dinoSatSourceList">
                  {aiAnalysis.sources.map((s, i) => (
                    <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="dinoSatSourceLink">{s.title || s.url}</a>
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
    <div className="dinoSatSpaceWeatherDetail">
      <div className="dinoSatSpaceWeatherDetailHeader">
        <span>Space Weather Operations Center · {new Date(data.timestamp).toLocaleString()}</span>
        <button className="dinoSatSatelliteCloseButton" onClick={onClose}><FontAwesomeIcon icon={faXmark} /></button>
      </div>
      <div className="dinoSatDossierTabs">
        <div className="dinoSatDossierTabsScroll">
          {sections.map(section => (
            <button
              key={section.key}
              className={`dinoSatDossierTab ${activeSection === section.key ? "dinoSatDossierTabActive" : ""}`}
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
      <div className="dinoSatDossierBody">
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
  const prevOrbitColor = "#10B981";

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      mapImgRef.current = img;
      setMapLoaded(true);
    };
    img.onerror = () => {
      setMapLoaded(true);
    };
    img.src = WORLD_MAP_IMAGE_URL;
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
    <div className="dinoSatGroundTrackContainer">
      <canvas ref={canvasRef} className="dinoSatGroundTrackCanvas" />
      <div className="dinoSatGroundTrackOverlay">
        <div className="dinoSatGroundTrackLegend">
          <button
            className={`dinoSatGroundTrackToggle ${showCurrentOrbit ? "dinoSatGroundTrackToggleActive" : ""}`}
            onClick={() => setShowCurrentOrbit(v => !v)}
          >
            <div className="dinoSatGroundTrackLegendDot" style={{ background: showCurrentOrbit ? satColor : "rgba(120,130,140,0.4)" }} />
            <span>Current orbit</span>
          </button>
          <button
            className={`dinoSatGroundTrackToggle ${showPreviousOrbit ? "dinoSatGroundTrackToggleActive" : ""}`}
            onClick={() => setShowPreviousOrbit(v => !v)}
          >
            <div className="dinoSatGroundTrackLegendDot" style={{ background: showPreviousOrbit ? prevOrbitColor : "rgba(120,130,140,0.4)" }} />
            <span>Previous orbit</span>
          </button>
          <span className="dinoSatGroundTrackLegendDivider" />
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
    <div className="dinoSatSpaceWeatherDetail">
      <div className="dinoSatSpaceWeatherDetailHeader">
        <span><FontAwesomeIcon icon={faTriangleExclamation} /> Conjunction Watch · {conjunctions.length} close approaches</span>
        <button className="dinoSatSatelliteCloseButton" onClick={onClose}><FontAwesomeIcon icon={faXmark} /></button>
      </div>
      <div className="dinoSatDossierTabs">
        <div className="dinoSatDossierTabsScroll">
          <button className={`dinoSatDossierTab ${activeTab === "watch" ? "dinoSatDossierTabActive" : ""}`} onClick={() => setActiveTab("watch")}><FontAwesomeIcon icon={faTriangleExclamation} /> Watch List</button>
          <button className={`dinoSatDossierTab ${activeTab === "stats" ? "dinoSatDossierTabActive" : ""}`} onClick={() => setActiveTab("stats")}><FontAwesomeIcon icon={faChartColumn} /> Statistics</button>
        </div>
      </div>
      <div className="dinoSatDossierBody">
        {activeTab === "watch" && (
          <div className="dinoSatDossierTabContent">
            <div className="dinoSatPanelCard">
              <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faFilter} /> Filter & Sort</span></div>
              <div className="dinoSatPanelCardBody">
                <div className="dinoSatFilterRow">
                  <div className="dinoSatFilterField">
                    <label>Search</label>
                    <input type="text" placeholder="Name or NORAD ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="dinoSatSatelliteSearchInput" />
                  </div>
                  <div className="dinoSatFilterField">
                    <label>Severity</label>
                    <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="dinoSatSatelliteFPSSelect">
                      <option value="all">All</option>
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="moderate">Moderate</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div className="dinoSatFilterField">
                    <label>Sort by</label>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="dinoSatSatelliteFPSSelect">
                      <option value="distance">Closest first</option>
                      <option value="altitude">Lowest altitude</option>
                      <option value="severity">Most severe</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="dinoSatPanelCard">
              <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faTable} /> Close Approach Pairs ({filtered.length})</span></div>
              <div className="dinoSatPanelCardBody">
                {filtered.length === 0 ? (
                  <div className="dinoSatPanelEmpty">No conjunctions match the current filter.</div>
                ) : (
                  <div className="dinoSatTableScroll">
                    <table className="dinoSatDataTable">
                      <thead>
                        <tr><th>Severity</th><th>Distance</th><th>Δ Alt</th><th>Mid Alt</th><th>Object A</th><th>Object B</th><th>Bearing</th><th></th></tr>
                      </thead>
                      <tbody>
                        {filtered.map((c, i) => (
                          <tr key={i} className={`dinoSatConjunctionTableRow dinoSatConjunctionSev-${c.severity.toLowerCase()}`}>
                            <td><span className={`dinoSatConjunctionSeverity dinoSatConjunctionSev-${c.severity.toLowerCase()}`}>{c.severity}</span></td>
                            <td><b>{c.distanceKm.toFixed(2)} km</b></td>
                            <td>{c.altitudeDifferenceKm.toFixed(1)} km</td>
                            <td>{c.combinedAltitude} km</td>
                            <td><button className="dinoSatTableButton" onClick={() => onSelect && onSelect(c.a)}>{c.a.name}<small>NORAD {c.a.noradId} · {c.a.category}</small></button></td>
                            <td><button className="dinoSatTableButton" onClick={() => onSelect && onSelect(c.b)}>{c.b.name}<small>NORAD {c.b.noradId} · {c.b.category}</small></button></td>
                            <td>{c.relativeBearingDeg}°</td>
                            <td><button className="dinoSatSatelliteSelectButton" onClick={() => onSelect && onSelect(c.a)}>Inspect</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {activeTab === "stats" && (
          <div className="dinoSatDossierTabContent">
            <div className="dinoSatStatTileGrid">
              <StatTile label="Total Pairs" value={stats.total} sub="Catalog-wide" accent="#42a5f5" large />
              <StatTile label="Critical (<5km)" value={stats.critical} color="#ef4444" accent="#ef4444" />
              <StatTile label="High (5-20km)" value={stats.high} color="#fb923c" accent="#fb923c" />
              <StatTile label="Moderate (20-35km)" value={stats.moderate} color="#facc15" accent="#facc15" />
              <StatTile label="Low (>35km)" value={stats.low} color="#84cc16" accent="#84cc16" />
              <StatTile label="Mean Distance" value={stats.avgDistance.toFixed(2)} unit="km" accent="#42a5f5" />
              <StatTile label="Closest Pair" value={stats.minDistance.toFixed(2)} unit="km" accent="#ef4444" color="#ef4444" />
            </div>
            <div className="dinoSatPanelCard">
              <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faBookOpen} /> Conjunction Methodology</span></div>
              <div className="dinoSatPanelCardBody">
                <div className="dinoSatBriefingGrid">
                  <div className="dinoSatBriefingItem"><b>Detection</b><p>Spatial-hash based pairwise 3D distance check across the full satellite catalog. Active satellites use cached ECI positions; inactive satellites are propagated on demand. The grid cell size matches the threshold so that only pairs in the same or neighboring cells are considered, dropping the cost from O(n²) to roughly O(n) for typical orbital distributions.</p></div>
                  <div className="dinoSatBriefingItem"><b>Severity</b><p>Critical: &lt;5km. High: 5-20km. Moderate: 20-35km. Low: 35-threshold. Real CSpOC operational thresholds for maneuver decisions are typically 1-5km radial.</p></div>
                  <div className="dinoSatBriefingItem"><b>Coordinate Frame</b><p>All distance computations are performed in true ECI kilometers using SGP4 positions, not in compressed scene coordinates, so altitude differences are physically accurate even for satellites at very different orbital regimes.</p></div>
                  <div className="dinoSatBriefingItem"><b>Limitations</b><p>This is an instantaneous snapshot using SGP4-propagated positions. True TCA analysis requires covariance propagation and Pc computation per CSM 18 SPCS standard, not implemented here.</p></div>
                  <div className="dinoSatBriefingItem"><b>Update Rate</b><p>Refreshed every {Math.round(PERFORMANCE_CONSTANTS.CONJUNCTION_CHECK_INTERVAL_MS / 1000)} seconds against the most recent propagated positions of all satellites in the catalog, regardless of which subset is currently rendered.</p></div>
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
    <div className="dinoSatSpaceWeatherDetail">
      <div className="dinoSatSpaceWeatherDetailHeader">
        <span><FontAwesomeIcon icon={faCircleNodes} /> Constellation Health Monitor</span>
        <button className="dinoSatSatelliteCloseButton" onClick={onClose}><FontAwesomeIcon icon={faXmark} /></button>
      </div>
      <div className="dinoSatDossierTabs">
        <div className="dinoSatDossierTabsScroll">
          <button className={`dinoSatDossierTab ${activeTab === "constellations" ? "dinoSatDossierTabActive" : ""}`} onClick={() => setActiveTab("constellations")}><FontAwesomeIcon icon={faCircleNodes} /> Constellations</button>
          <button className={`dinoSatDossierTab ${activeTab === "fleet" ? "dinoSatDossierTabActive" : ""}`} onClick={() => setActiveTab("fleet")}><FontAwesomeIcon icon={faNetworkWired} /> Fleet Aggregate</button>
          <button className={`dinoSatDossierTab ${activeTab === "compare" ? "dinoSatDossierTabActive" : ""}`} onClick={() => setActiveTab("compare")}><FontAwesomeIcon icon={faTable} /> Comparison Table</button>
        </div>
      </div>
      <div className="dinoSatDossierBody">
        {activeTab === "constellations" && (
          <div className="dinoSatDossierTabContent">
            <div className="dinoSatPanelCard">
              <div className="dinoSatPanelCardHeader">
                <span><FontAwesomeIcon icon={faMagnifyingGlass} /> Search</span>
                <button className="dinoSatPassComputeButton" onClick={onRefresh}><FontAwesomeIcon icon={loading ? faSpinner : faSatellite} spin={loading} /> {loading ? "Loading" : "Refresh"}</button>
              </div>
              <div className="dinoSatPanelCardBody">
                <input type="text" placeholder="Search by name, operator, or status..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="dinoSatSatelliteSearchInput" />
              </div>
            </div>
            {!data || filteredEntries.length === 0 ? (
              <div className="dinoSatPanelEmpty">{loading ? "Loading constellation data..." : "No constellations match the search."}</div>
            ) : (
              <div className="dinoSatConstellationGridDense">
                {filteredEntries.map(([group, c]) => {
                  const cappedCoverage = Math.min(100, c.coveragePct || 0);
                  return (
                    <div key={group} className={`dinoSatConstellationCard dinoSatConstellationStatus-${(c.status || "unknown").toLowerCase()}`} onClick={() => setSelectedConstellation(group)}>
                      <div className="dinoSatConstellationHeader">
                        <h5>{group}</h5>
                        <span className={`dinoSatConstellationStatusBadge dinoSatConstellationStatus-${(c.status || "unknown").toLowerCase()}`}>{c.status}</span>
                      </div>
                      <small>{c.operator}</small>
                      <div className="dinoSatConstellationStats">
                        <div><span>Tracked</span><b>{c.tracked}/{c.expectedNominal}</b></div>
                        <div><span>Coverage</span><b>{cappedCoverage}%</b></div>
                        <div><span>Fresh TLE</span><b>{c.recentTleCount}</b></div>
                        <div><span>Stale TLE</span><b>{c.staleTleCount}</b></div>
                        <div><span>Avg Alt</span><b>{c.averageAltitude} km</b></div>
                        <div><span>Avg Inc</span><b>{c.averageInclination}°</b></div>
                      </div>
                      <div className="dinoSatConstellationBar">
                        <div className="dinoSatConstellationBarFill" style={{ width: `${cappedCoverage}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {selectedConstellation && data && data[selectedConstellation] && data[selectedConstellation].ids && (
              <div className="dinoSatPanelCard">
                <div className="dinoSatPanelCardHeader">
                  <span><FontAwesomeIcon icon={faList} /> {selectedConstellation} Members ({data[selectedConstellation].ids.length})</span>
                  <button className="dinoSatSatelliteCloseButton" onClick={() => setSelectedConstellation(null)}><FontAwesomeIcon icon={faXmark} /></button>
                </div>
                <div className="dinoSatPanelCardBody">
                  <div className="dinoSatTableScroll">
                    <table className="dinoSatDataTable">
                      <thead><tr><th>NORAD</th><th>Name</th><th>Altitude</th><th>TLE Age</th></tr></thead>
                      <tbody>
                        {data[selectedConstellation].ids.map((m, i) => (
                          <tr key={i}>
                            <td>{m.noradId}</td>
                            <td><button className="dinoSatTableButton" onClick={() => onSelect && onSelect(m)}>{m.name}</button></td>
                            <td>{m.altitude} km</td>
                            <td style={{ color: tleAgeColor(m.tleAgeDays) }}>{m.tleAgeDays !== null && m.tleAgeDays !== undefined ? `${m.tleAgeDays.toFixed(1)} d` : "?"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {activeTab === "fleet" && aggregateStats && (
          <div className="dinoSatDossierTabContent">
            <div className="dinoSatStatTileGrid">
              <StatTile label="Constellations" value={aggregateStats.totalConstellations} accent="#42a5f5" large />
              <StatTile label="Total Tracked" value={aggregateStats.totalTracked.toLocaleString()} sub={`of ${aggregateStats.totalNominal.toLocaleString()} nominal`} accent="#4ade80" />
              <StatTile label="Overall Coverage" value={`${aggregateStats.overallCoverage}%`} color={aggregateStats.overallCoverage > 90 ? "#4ade80" : aggregateStats.overallCoverage > 70 ? "#fb923c" : "#ef4444"} accent={aggregateStats.overallCoverage > 90 ? "#4ade80" : aggregateStats.overallCoverage > 70 ? "#fb923c" : "#ef4444"} />
              <StatTile label="Fresh TLEs" value={aggregateStats.totalFresh.toLocaleString()} sub="<7 days old" color="#4ade80" accent="#4ade80" />
              <StatTile label="Stale TLEs" value={aggregateStats.totalStale.toLocaleString()} sub=">14 days old" color="#ef4444" accent="#ef4444" />
              <StatTile label="Nominal Status" value={aggregateStats.nominalCount} color="#4ade80" accent="#4ade80" />
              <StatTile label="Degraded" value={aggregateStats.degradedCount} color="#fb923c" accent="#fb923c" />
              <StatTile label="Partial" value={aggregateStats.partialCount} color="#facc15" accent="#facc15" />
              <StatTile label="Unavailable" value={aggregateStats.unavailableCount} color="#ef4444" accent="#ef4444" />
            </div>
            <div className="dinoSatPanelCard">
              <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faBookOpen} /> Operational Health Definitions</span></div>
              <div className="dinoSatPanelCardBody">
                <div className="dinoSatBriefingGrid">
                  <div className="dinoSatBriefingItem"><b>Nominal</b><p>Tracked count ≥95% of operator's published nominal count. Constellation operating at full design capacity with redundancy intact.</p></div>
                  <div className="dinoSatBriefingItem"><b>Degraded</b><p>Tracked count between 80-95% of nominal. Service may be available with reduced redundancy or coverage gaps in specific regions.</p></div>
                  <div className="dinoSatBriefingItem"><b>Partial</b><p>Tracked count below 80% but above zero. Significant capability impact likely; replenishment launches probably required.</p></div>
                  <div className="dinoSatBriefingItem"><b>Unavailable</b><p>No tracked satellites in the public catalog. Either constellation is decommissioned or members are not in our data sources.</p></div>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === "compare" && data && (
          <div className="dinoSatDossierTabContent">
            <div className="dinoSatPanelCard">
              <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faTable} /> Constellation Comparison Matrix</span></div>
              <div className="dinoSatPanelCardBody">
                <div className="dinoSatTableScroll">
                  <table className="dinoSatDataTable">
                    <thead>
                      <tr><th>Constellation</th><th>Operator</th><th>Status</th><th>Tracked</th><th>Nominal</th><th>Coverage</th><th>Fresh</th><th>Stale</th><th>Avg Alt</th><th>Avg Inc</th></tr>
                    </thead>
                    <tbody>
                      {Object.entries(data).map(([group, c]) => (
                        <tr key={group} className={`dinoSatConstellationStatus-${(c.status || "unknown").toLowerCase()}`}>
                          <td><b>{group}</b></td>
                          <td>{c.operator}</td>
                          <td><span className={`dinoSatConstellationStatusBadge dinoSatConstellationStatus-${(c.status || "unknown").toLowerCase()}`}>{c.status}</span></td>
                          <td>{c.tracked}</td>
                          <td>{c.expectedNominal}</td>
                          <td>{Math.min(100, c.coveragePct || 0)}%</td>
                          <td style={{ color: "#4ade80" }}>{c.recentTleCount}</td>
                          <td style={{ color: "#ef4444" }}>{c.staleTleCount}</td>
                          <td>{c.averageAltitude} km</td>
                          <td>{c.averageInclination}°</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
    <div className="dinoSatSpaceWeatherDetail">
      <div className="dinoSatSpaceWeatherDetailHeader">
        <span><FontAwesomeIcon icon={faFire} /> Decay & Reentry Watch · {candidates?.length || 0} candidates</span>
        <button className="dinoSatSatelliteCloseButton" onClick={onClose}><FontAwesomeIcon icon={faXmark} /></button>
      </div>
      <div className="dinoSatDossierTabs">
        <div className="dinoSatDossierTabsScroll">
          <button className={`dinoSatDossierTab ${activeTab === "watch" ? "dinoSatDossierTabActive" : ""}`} onClick={() => setActiveTab("watch")}><FontAwesomeIcon icon={faFire} /> Watch List</button>
          <button className={`dinoSatDossierTab ${activeTab === "stats" ? "dinoSatDossierTabActive" : ""}`} onClick={() => setActiveTab("stats")}><FontAwesomeIcon icon={faChartColumn} /> Statistics</button>
        </div>
      </div>
      <div className="dinoSatDossierBody">
        {activeTab === "watch" && (
          <div className="dinoSatDossierTabContent">
            <div className="dinoSatPanelCard">
              <div className="dinoSatPanelCardHeader">
                <span><FontAwesomeIcon icon={faFilter} /> Filter & Sort</span>
                <button className="dinoSatPassComputeButton" onClick={onRefresh}><FontAwesomeIcon icon={loading ? faSpinner : faFire} spin={loading} /> {loading ? "Loading" : "Refresh"}</button>
              </div>
              <div className="dinoSatPanelCardBody">
                <div className="dinoSatFilterRow">
                  <div className="dinoSatFilterField">
                    <label>Search</label>
                    <input type="text" placeholder="Name, NORAD, group..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="dinoSatSatelliteSearchInput" />
                  </div>
                  <div className="dinoSatFilterField">
                    <label>Risk Level</label>
                    <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} className="dinoSatSatelliteFPSSelect">
                      <option value="all">All</option>
                      <option value="imminent">Imminent</option>
                      <option value="high">High</option>
                      <option value="moderate">Moderate</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div className="dinoSatFilterField">
                    <label>Sort by</label>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="dinoSatSatelliteFPSSelect">
                      <option value="days">Soonest reentry</option>
                      <option value="altitude">Lowest altitude</option>
                      <option value="bstar">Highest BSTAR</option>
                      <option value="confidence">Confidence tier</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="dinoSatPanelCard">
              <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faTable} /> Decay Candidates ({filtered.length})</span></div>
              <div className="dinoSatPanelCardBody">
                {filtered.length === 0 ? (
                  <div className="dinoSatPanelEmpty">{loading ? "Computing decay candidates..." : "No candidates match the filter."}</div>
                ) : (
                  <div className="dinoSatTableScroll">
                    <table className="dinoSatDataTable">
                      <thead>
                        <tr><th>Risk</th><th>Tier</th><th>Name</th><th>NORAD</th><th>Altitude</th><th>Est. Days</th><th>BSTAR</th><th>F10.7 Adj</th><th>Group</th><th>TLE Age</th><th></th></tr>
                      </thead>
                      <tbody>
                        {filtered.map((c) => (
                          <tr key={c.noradId} className={`dinoSatDecayRisk-${c.decayRisk.toLowerCase()}`}>
                            <td><span className={`dinoSatDecayRiskBadge dinoSatDecayRisk-${c.decayRisk.toLowerCase()}`}>{c.decayRisk}</span></td>
                            <td><span className={`dinoSatDecayTierBadge dinoSatDecayTier-${c.tier || "heuristic"}`}>{c.tier === "highConfidence" ? "High Conf" : "Heuristic"}</span></td>
                            <td><b>{c.name}</b></td>
                            <td>{c.noradId}</td>
                            <td>{c.altitude.toFixed(0)} km</td>
                            <td>~{c.estimatedDaysToReentry} d</td>
                            <td>{c.bstar ? c.bstar.toExponential(2) : "—"}</td>
                            <td>{c.f107Multiplier ? `${c.f107Multiplier.toFixed(2)}×` : "1.00×"}</td>
                            <td>{c.group || "—"}</td>
                            <td style={{ color: tleAgeColor(c.tleAgeDays) }}>{c.tleAgeDays !== null && c.tleAgeDays !== undefined ? `${c.tleAgeDays.toFixed(1)} d` : "?"}</td>
                            <td><button className="dinoSatSatelliteSelectButton" onClick={() => onSelect && onSelect(c)}>Inspect</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {activeTab === "stats" && stats && (
          <div className="dinoSatDossierTabContent">
            <div className="dinoSatStatTileGrid">
              <StatTile label="Total Candidates" value={stats.total} sub="LEO objects under decay watch" accent="#42a5f5" large />
              <StatTile label="High Confidence" value={stats.highConfidence} sub={methodology?.highConfidenceCeilingKm ? `BSTAR + altitude < ${methodology.highConfidenceCeilingKm} km` : "BSTAR + low altitude"} color="#ef4444" accent="#ef4444" />
              <StatTile label="Heuristic Only" value={stats.heuristic} sub="BSTAR signal alone" color="#fb923c" accent="#fb923c" />
              <StatTile label="Imminent (<7d)" value={stats.imminent} color="#ef4444" accent="#ef4444" />
              <StatTile label="High (7-30d)" value={stats.high} color="#fb923c" accent="#fb923c" />
              <StatTile label="Moderate (30-60d)" value={stats.moderate} color="#facc15" accent="#facc15" />
              <StatTile label="Low (60-90d)" value={stats.low} color="#84cc16" accent="#84cc16" />
              <StatTile label="Mean Altitude" value={stats.avgAltitude} unit="km" accent="#42a5f5" />
              <StatTile label="Mean Days to Reentry" value={stats.avgDays} unit="days" accent="#fb923c" />
              <StatTile label="Lowest Altitude" value={stats.lowestAltitude.toFixed(0)} unit="km" color="#ef4444" accent="#ef4444" />
            </div>
            <div className="dinoSatPanelCard">
              <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faBookOpen} /> Decay Estimation Methodology</span></div>
              <div className="dinoSatPanelCardBody">
                <div className="dinoSatBriefingGrid">
                  <div className="dinoSatBriefingItem"><b>BSTAR Drag Term</b><p>The B* coefficient from the TLE encodes the satellite's ballistic coefficient including atmospheric density at epoch. Higher absolute values indicate stronger drag effects.</p></div>
                  <div className="dinoSatBriefingItem"><b>F10.7 Coupling</b><p>Current F10.7 flux is read from the live SWPC feed and used to scale the heuristic decay rate. The thermosphere expands with rising solar flux, increasing drag on LEO objects. Multiplier ranges roughly 0.7× (quiet sun, F10.7 ≈ 70 sfu) to 2.0× (active sun, F10.7 ≈ 200+ sfu).{methodology?.f107Current ? ` Current F10.7: ${methodology.f107Current} sfu.` : ""}</p></div>
                  <div className="dinoSatBriefingItem"><b>Estimation</b><p>Heuristic decay rate is approximated as |BSTAR| × altitude × f10_multiplier. Days to reentry uses altitude / (decay rate × 100). This is a first-order heuristic, not an SGP4 propagation to entry interface.</p></div>
                  <div className="dinoSatBriefingItem"><b>Confidence Tiers</b><p><b>High Confidence:</b> BSTAR signal AND altitude below {methodology?.highConfidenceCeilingKm || 450} km. These objects are in the regime where atmospheric drag dominates and reentry is plausible within months. <b>Heuristic:</b> BSTAR-only signal at altitudes between {methodology?.highConfidenceCeilingKm || 450} and {methodology?.altitudeCeilingKm || 800} km. Watch list candidate worthy of deeper investigation but not actionable on the heuristic alone.</p></div>
                  <div className="dinoSatBriefingItem"><b>Risk Tiers</b><p>Imminent: &lt;7 days. High: 7-30 days. Moderate: 30-60 days. Low: 60-90 days. Real reentry timing depends heavily on solar activity coupling, satellite attitude, frontal area, and ballistic coefficient evolution.</p></div>
                  <div className="dinoSatBriefingItem"><b>Limitations</b><p>True decay analysis requires GP-history fits, atmosphere models (NRLMSISE-00, JB2008), and forward propagation. The F10.7 coupling here is a linear scaling and does not capture the non-linear thermospheric response to sustained high flux or geomagnetic forcing.</p></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const PassPredictionsTab = ({ satellite, satrec, observerLocation, onLocationChange, onRequestGeolocation }) => {
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

  useEffect(() => { compute(); }, [compute]);

  const azCompass = (deg) => {
    const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    return dirs[Math.round(((deg % 360) / 22.5)) % 16];
  };

  return (
    <div className="dinoSatDossierTabContent">
      <div className="dinoSatPanelCard">
        <div className="dinoSatPanelCardHeader">
          <span><FontAwesomeIcon icon={faTowerBroadcast} /> Pass Prediction Setup</span>
          <button className="dinoSatPassComputeButton" onClick={compute} disabled={!observerLocation || !satrec}>
            <FontAwesomeIcon icon={computing ? faSpinner : faRoute} spin={computing} /> {computing ? "Computing" : "Compute"}
          </button>
        </div>
        <div className="dinoSatPanelCardBody">
          <div className="dinoSatPassControlsRow">
            <div className="dinoSatPassField">
              <label>Latitude</label>
              <input key={`lat-${observerLocation?.lat ?? "x"}`} type="number" placeholder="0.0000" step="0.0001" defaultValue={observerLocation?.lat ?? ""} onBlur={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) onLocationChange({ ...(observerLocation || {}), lat: v }); }} />
            </div>
            <div className="dinoSatPassField">
              <label>Longitude</label>
              <input key={`lon-${observerLocation?.lon ?? "x"}`} type="number" placeholder="0.0000" step="0.0001" defaultValue={observerLocation?.lon ?? ""} onBlur={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) onLocationChange({ ...(observerLocation || {}), lon: v }); }} />
            </div>
            <div className="dinoSatPassField">
              <label>Altitude (m)</label>
              <input key={`alt-${observerLocation?.alt ?? "x"}`} type="number" placeholder="0" defaultValue={observerLocation?.alt ?? 0} onBlur={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) onLocationChange({ ...(observerLocation || {}), alt: v }); }} />
            </div>
            <div className="dinoSatPassField">
              <label>Window (h)</label>
              <input type="number" min="1" max="168" value={hours} onChange={(e) => setHours(Math.max(1, Math.min(168, parseInt(e.target.value) || 48)))} />
            </div>
            <div className="dinoSatPassField">
              <label>Min Elevation (°)</label>
              <input type="number" min="0" max="89" value={minEl} onChange={(e) => setMinEl(Math.max(0, Math.min(89, parseInt(e.target.value) || 10)))} />
            </div>
            <div className="dinoSatPassField">
              <label>Quick Set</label>
              <button className="dinoSatPassLocationButton" onClick={onRequestGeolocation}><FontAwesomeIcon icon={faMapLocation} /> My Location</button>
            </div>
          </div>
        </div>
      </div>

      {!observerLocation ? (
        <div className="dinoSatPanelEmpty">Enter an observer location above to compute pass predictions.</div>
      ) : !satrec ? (
        <div className="dinoSatPanelEmpty">No SGP4 propagator available for this satellite.</div>
      ) : passes.length === 0 ? (
        <div className="dinoSatPanelEmpty">No passes above {minEl}° in the next {hours} hours.</div>
      ) : (
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faRoute} /> Upcoming Passes ({passes.length})</span></div>
          <div className="dinoSatPanelCardBody">
            <div className="dinoSatPassList">
              {passes.map((p, i) => {
                const aosDate = new Date(p.aos);
                const tcaDate = new Date(p.tca);
                const losDate = new Date(p.los);
                return (
                  <div key={i} className="dinoSatPassItem">
                    <div className="dinoSatPassNumber">#{i + 1}</div>
                    <div className="dinoSatPassRow">
                      <div className="dinoSatPassEventCol">
                        <div className="dinoSatPassEventLabel">AOS</div>
                        <div className="dinoSatPassEventTime">{aosDate.toLocaleString()}</div>
                        <div className="dinoSatPassEventDetail">{p.aosAzimuth}° {azCompass(p.aosAzimuth)}</div>
                      </div>
                      <div className="dinoSatPassEventCol dinoSatPassEventColPeak">
                        <div className="dinoSatPassEventLabel">TCA</div>
                        <div className="dinoSatPassEventTime">{tcaDate.toLocaleString()}</div>
                        <div className="dinoSatPassEventDetail">El {p.tcaElevation}° / Az {p.tcaAzimuth}° {azCompass(p.tcaAzimuth)}</div>
                      </div>
                      <div className="dinoSatPassEventCol">
                        <div className="dinoSatPassEventLabel">LOS</div>
                        <div className="dinoSatPassEventTime">{losDate.toLocaleString()}</div>
                        <div className="dinoSatPassEventDetail">{p.losAzimuth}° {azCompass(p.losAzimuth)}</div>
                      </div>
                      <div className="dinoSatPassDuration">{Math.floor(p.durationSec / 60)}m {p.durationSec % 60}s</div>
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
      <div className="dinoSatDossierTabContent">
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faBrain} /> AI Mission Brief</span></div>
          <div className="dinoSatPanelCardBody">
            <div className="dinoSatStatusDisplay"><FontAwesomeIcon icon={faSpinner} spin /><p>Querying multi-stage AI ensemble for comprehensive mission intelligence...</p></div>
          </div>
        </div>
      </div>
    );
  }
  if (!intelligence) {
    return (
      <div className="dinoSatDossierTabContent">
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faBrain} /> AI Mission Brief</span></div>
          <div className="dinoSatPanelCardBody">
            <div className="dinoSatStatusDisplay"><FontAwesomeIcon icon={faSpinner} spin /><p>Preparing mission intelligence...</p></div>
          </div>
        </div>
      </div>
    );
  }
  if (intelligence.error) {
    return (
      <div className="dinoSatDossierTabContent">
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faTriangleExclamation} /> Request Failed</span></div>
          <div className="dinoSatPanelCardBody">
            <div className="dinoSatStatusDisplay dinoSatStatusError">
              <FontAwesomeIcon icon={faTriangleExclamation} />
              <p>{intelligence.error}</p>
              {intelligence.partialStages && intelligence.partialStages.length > 0 && (<small>Partial stages completed: {intelligence.partialStages.join(", ")}.</small>)}
              <button className="dinoSatSatelliteSelectButton" onClick={onRefresh}><FontAwesomeIcon icon={faBrain} /> Retry</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const intel = intelligence.intelligence || {};
  const tokenSummary = intelligence.tokenUsage;
  return (
    <div className="dinoSatDossierTabContent">
      <div className="dinoSatMissionIntelHeader">
        <small>
          {intelligence.fromCache ? `Cached ${intelligence.cacheAgeMinutes || 0}m ago` : `Generated ${formatGeneratedAt(intelligence.generatedAt)}`} · model: {intelligence.model} · {intelligence.stages || 1} stage{(intelligence.stages || 1) > 1 ? "s" : ""}
          {tokenSummary && tokenSummary.total !== undefined && ` · tokens: ${tokenSummary.total}`}
          {intelligence.partialStages && intelligence.partialStages.length > 0 && ` · partial: ${intelligence.partialStages.join("/")}`}
        </small>
        <button className="dinoSatSatelliteSelectButton" onClick={onRefresh}><FontAwesomeIcon icon={faBrain} /> Regenerate</button>
      </div>

      {tokenSummary && tokenSummary.perStage && (
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faGauge} /> Token Usage Per Stage</span></div>
          <div className="dinoSatPanelCardBody">
            <div className="dinoSatTokenUsageGrid">
              {tokenSummary.perStage.map((s, i) => (
                <div key={i} className="dinoSatTokenUsageItem">
                  <div className="dinoSatTokenUsageLabel">Stage {s.stage}</div>
                  <div className="dinoSatTokenUsageValue">
                    {s.total !== undefined ? s.total : "?"}
                    <span>{s.prompt !== undefined ? `${s.prompt} in` : ""} {s.completion !== undefined ? `· ${s.completion} out` : ""}</span>
                  </div>
                  {s.timedOut && <small style={{ color: "#fb923c" }}>Timed out.</small>}
                  {s.truncated && <small style={{ color: "#fb923c" }}>Truncated.</small>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {intel.executiveSummary && (
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faPersonChalkboard} /> Executive Summary</span></div>
          <div className="dinoSatPanelCardBody"><p className="dinoSatMissionBriefText">{safeRenderText(intel.executiveSummary)}</p></div>
        </div>
      )}

      {intel.missionBrief && (
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faBrain} /> Mission Brief</span></div>
          <div className="dinoSatPanelCardBody"><p className="dinoSatMissionBriefText">{safeRenderText(intel.missionBrief)}</p></div>
        </div>
      )}

      <div className="dinoSatPanelCard">
        <div className="dinoSatPanelCardHeader"><span>Operator & Launch</span></div>
        <div className="dinoSatPanelCardBody">
          <div className="dinoSatDossierStrip">
            <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Operator</div><div className="dinoSatDossierCellValue">{safeRenderText(intel.operator)}</div></div>
            <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Launch Date</div><div className="dinoSatDossierCellValue">{safeRenderText(intel.launchDate)}</div></div>
            <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Launch Vehicle</div><div className="dinoSatDossierCellValue">{safeRenderText(intel.launchVehicle)}</div></div>
            <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Launch Site</div><div className="dinoSatDossierCellValue">{safeRenderText(intel.launchSite)}</div></div>
            <div className="dinoSatDossierCell" style={{ borderLeftColor: intel.missionStatus === "Active" ? "#4ade80" : "#fb923c" }}><div className="dinoSatDossierCellLabel">Mission Status</div><div className="dinoSatDossierCellValue" style={{ color: intel.missionStatus === "Active" ? "#4ade80" : "#fb923c" }}>{safeRenderText(intel.missionStatus)}</div></div>
            <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">International Designator</div><div className="dinoSatDossierCellValue">{safeRenderText(intel.internationalDesignator)}</div></div>
          </div>
        </div>
      </div>

      {intel.factSheet && (
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span>Spacecraft Fact Sheet</span></div>
          <div className="dinoSatPanelCardBody">
            <div className="dinoSatDossierStrip">
              <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Manufacturer</div><div className="dinoSatDossierCellValue">{safeRenderText(intel.factSheet.manufacturer)}</div></div>
              <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Bus / Platform</div><div className="dinoSatDossierCellValue">{safeRenderText(intel.factSheet.bus)}</div></div>
              <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Mass</div><div className="dinoSatDossierCellValue">{safeRenderText(intel.factSheet.mass)}</div></div>
              <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Power</div><div className="dinoSatDossierCellValue">{safeRenderText(intel.factSheet.power)}</div></div>
              <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Design Life</div><div className="dinoSatDossierCellValue">{safeRenderText(intel.factSheet.designLife)}</div></div>
              <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Propulsion</div><div className="dinoSatDossierCellValue">{safeRenderText(intel.factSheet.propulsion)}</div></div>
              <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Stabilization</div><div className="dinoSatDossierCellValue">{safeRenderText(intel.factSheet.stabilization)}</div></div>
            </div>
          </div>
        </div>
      )}

      {intel.instruments && intel.instruments.length > 0 && (
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faMicrochip} /> Instruments / Payload</span></div>
          <div className="dinoSatPanelCardBody">
            <div className="dinoSatInstrumentList">
              {intel.instruments.map((inst, i) => (<span key={i} className="dinoSatInstrumentChip">{safeRenderText(inst)}</span>))}
            </div>
          </div>
        </div>
      )}

      {intel.scientificContribution && (
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faMicroscope} /> Scientific Contribution</span></div>
          <div className="dinoSatPanelCardBody"><p className="dinoSatMissionBriefText">{safeRenderText(intel.scientificContribution)}</p></div>
        </div>
      )}

      {intel.notableEvents && intel.notableEvents.length > 0 && (
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faClock} /> Notable Events Timeline</span></div>
          <div className="dinoSatPanelCardBody">
            <div className="dinoSatTimelineList">
              {intel.notableEvents.map((e, i) => (<div key={i} className="dinoSatTimelineItem"><div className="dinoSatTimelineDate">{safeRenderText(e.date)}</div><div className="dinoSatTimelineEvent">{safeRenderText(e.event)}</div></div>))}
            </div>
          </div>
        </div>
      )}

      {intel.constellationContext && (
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faCircleNodes} /> Constellation Context</span></div>
          <div className="dinoSatPanelCardBody"><p className="dinoSatMissionBriefText">{safeRenderText(intel.constellationContext)}</p></div>
        </div>
      )}

      {intel.riskAssessment && (
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faTriangleExclamation} /> Risk Assessment</span></div>
          <div className="dinoSatPanelCardBody">
            <div className="dinoSatRiskGrid">
              <div className="dinoSatRiskItem"><b>TLE Age</b><p>{safeRenderText(intel.riskAssessment.tleAgeRisk)}</p></div>
              <div className="dinoSatRiskItem"><b>Decay</b><p>{safeRenderText(intel.riskAssessment.decayRisk)}</p></div>
              <div className="dinoSatRiskItem"><b>Conjunction</b><p>{safeRenderText(intel.riskAssessment.conjunctionRisk)}</p></div>
              <div className="dinoSatRiskItem"><b>Operational</b><p>{safeRenderText(intel.riskAssessment.operationalRisk)}</p></div>
              {intel.riskAssessment.cyberRisk && <div className="dinoSatRiskItem"><b>Cyber/Comms</b><p>{safeRenderText(intel.riskAssessment.cyberRisk)}</p></div>}
              {intel.riskAssessment.regulatoryRisk && <div className="dinoSatRiskItem"><b>Regulatory</b><p>{safeRenderText(intel.riskAssessment.regulatoryRisk)}</p></div>}
            </div>
          </div>
        </div>
      )}

      {intel.geopoliticalSignificance && (
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faGlobe} /> Geopolitical Significance</span></div>
          <div className="dinoSatPanelCardBody"><p className="dinoSatMissionBriefText">{safeRenderText(intel.geopoliticalSignificance)}</p></div>
        </div>
      )}

      {intel.commercialContext && (
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faChartColumn} /> Commercial / Market Context</span></div>
          <div className="dinoSatPanelCardBody"><p className="dinoSatMissionBriefText">{safeRenderText(intel.commercialContext)}</p></div>
        </div>
      )}

      {intelligence.sources && intelligence.sources.length > 0 && (
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span>Grounded Sources ({intelligence.sources.length})</span></div>
          <div className="dinoSatPanelCardBody">
            <div className="dinoSatSourceList">
              {intelligence.sources.map((s, i) => (<a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="dinoSatSourceLink">{s.title || s.url}</a>))}
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
  let visibilityNote = "Insufficient orbital data to estimate observability.";

  if (isLEO && altKm < 600) {
    visibilityClass = "Naked eye";
    visibilityColor = "#4ade80";
    visibilityNote = "Low LEO objects can reach magnitude -3 to +3 during twilight passes. Look for them as fast-moving stars 30-90 minutes after sunset or before sunrise. Brighter objects (ISS-class) are unmistakable; smaller payloads may need binoculars.";
  } else if (isLEO) {
    visibilityClass = "Marginal";
    visibilityColor = "#facc15";
    visibilityNote = "Higher LEO objects are dimmer and require darker skies. Many are visible to the naked eye during favorable twilight passes; binoculars or a small telescope help significantly. Magnitude typically ranges +3 to +7.";
  } else if (isMEO) {
    visibilityClass = "Telescope";
    visibilityColor = "#fb923c";
    visibilityNote = "MEO altitude (e.g. GPS, GLONASS) is beyond reliable naked-eye visibility. Amateur telescopes 8\" or larger under dark skies can resolve them as faint moving points. Best observed near opposition.";
  } else if (isGEO) {
    visibilityClass = "Telescope · stationary";
    visibilityColor = "#fb923c";
    visibilityNote = "GEO satellites appear nearly stationary in the sky, drifting along the celestial equator. Typically magnitude +10 to +13. A telescope on an equatorial mount makes them easy targets once located.";
  } else if (isHEO) {
    visibilityClass = "Specialized";
    visibilityColor = "#a78bfa";
    visibilityNote = "Highly elliptical orbits sweep through wide altitude ranges. Brightness varies dramatically along the orbit; observation requires precise pass timing and tracking equipment.";
  }

  const enrichRef = (label) => {
    if (!label) return "";
    if (label === "N2YO Tracking") return "Real-time position tracking, pass predictions, and visibility maps for ground observers.";
    if (label === "Heavens-Above") return "Detailed pass predictions, brightness estimates, and visual observation guides.";
    if (label === "CelesTrak SATCAT") return "Authoritative TLE source and historical orbital element archive.";
    if (label.toLowerCase().includes("wikipedia")) return "Reference article with mission background, history, and technical details.";
    if (label.toLowerCase().includes("space-track")) return "Official US Space Force catalog with TLE history and ownership data.";
    return "";
  };

  const hostnameOf = (url) => {
    try { return new URL(url).hostname.replace("www.", ""); } catch (error) { return url; }
  };

  const renderOverview = () => (
    <>
      <div className="dinoSatDossierStrip">
        <div className="dinoSatDossierCell" style={{ borderLeftColor: visibilityColor }}><div className="dinoSatDossierCellLabel">Visibility</div><div className="dinoSatDossierCellValue" style={{ color: visibilityColor }}>{visibilityClass}</div></div>
        <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Orbit Class</div><div className="dinoSatDossierCellValue">{satellite?.category || "—"}</div></div>
        <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Altitude</div><div className="dinoSatDossierCellValue">{altKm}<span>km</span></div></div>
        <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Passes / Day</div><div className="dinoSatDossierCellValue">{passesPerDay}<span>orbital</span></div></div>
        <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Horizon Distance</div><div className="dinoSatDossierCellValue">{horizonDist}<span>km</span></div></div>
        <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Footprint Radius</div><div className="dinoSatDossierCellValue">{footprintRadius}<span>km</span></div></div>
        <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">NORAD ID</div><div className="dinoSatDossierCellValue">{satellite?.noradId || "—"}</div></div>
      </div>
      <div className="dinoSatPanelCard">
        <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faEye} /> Observation Guide</span></div>
        <div className="dinoSatPanelCardBody"><p>{visibilityNote}</p></div>
      </div>
    </>
  );

  if (loading) {
    return (
      <div className="dinoSatDossierTabContent">
        {renderOverview()}
        <div className="dinoSatPanelEmpty"><FontAwesomeIcon icon={faSpinner} spin /> Loading external observation data...</div>
      </div>
    );
  }

  if (!observation) {
    return (
      <div className="dinoSatDossierTabContent">
        {renderOverview()}
        <div className="dinoSatPanelEmpty"><FontAwesomeIcon icon={faSpinner} spin /><p>Loading external catalog data...</p></div>
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
    <div className="dinoSatDossierTabContent">
      {renderOverview()}

      {observation.wikipedia && (
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faGlobe} /> {observation.wikipedia.title}</span></div>
          <div className="dinoSatPanelCardBody">
            {observation.wikipedia.thumbnail && (<img src={observation.wikipedia.thumbnail} alt={observation.wikipedia.title} className="dinoSatWikiThumb" />)}
            <p>{observation.wikipedia.extract}</p>
            {observation.wikipedia.url && (<a href={observation.wikipedia.url} target="_blank" rel="noopener noreferrer" className="dinoSatSourceLink">Read more on Wikipedia</a>)}
          </div>
        </div>
      )}

      {observation.imagery && observation.imagery.length > 0 && (
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faSatelliteDish} /> Public Imagery / Data</span></div>
          <div className="dinoSatPanelCardBody">
            <div className="dinoSatImageryGrid">
              {observation.imagery.map((img, i) => (
                <div key={i} className="dinoSatImageryCard">
                  <div className="dinoSatImageryLabel">{img.label}</div>
                  {img.wmts && (<img src={img.wmts} alt={img.label} className="dinoSatImageryThumb" onError={(e) => { e.target.style.display = "none"; }} />)}
                  {img.worldview && (<a href={img.worldview} target="_blank" rel="noopener noreferrer" className="dinoSatImageryLink"><FontAwesomeIcon icon={faGlobe} /> Open in NASA Worldview</a>)}
                  {img.date && <small>Date: {img.date}.</small>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {observation.issData && (
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faSatellite} /> ISS Real-Time Status</span></div>
          <div className="dinoSatPanelCardBody">
            {observation.issData.position && (
              <div className="dinoSatDossierStrip">
                <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Latitude</div><div className="dinoSatDossierCellValue">{observation.issData.position.latitude?.toFixed(4)}°</div></div>
                <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Longitude</div><div className="dinoSatDossierCellValue">{observation.issData.position.longitude?.toFixed(4)}°</div></div>
                <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Altitude</div><div className="dinoSatDossierCellValue">{observation.issData.position.altitude?.toFixed(2)}<span>km</span></div></div>
                <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Velocity</div><div className="dinoSatDossierCellValue">{observation.issData.position.velocity?.toFixed(2)}<span>km/h</span></div></div>
                <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Visibility</div><div className="dinoSatDossierCellValue">{observation.issData.position.visibility}</div></div>
                <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Total in Space</div><div className="dinoSatDossierCellValue">{observation.issData.totalInSpace}</div></div>
              </div>
            )}
            {observation.issData.crew && observation.issData.crew.length > 0 && (
              <div style={{ marginTop: "12px" }}>
                <h5>ISS Crew ({observation.issData.crew.length})</h5>
                <div className="dinoSatInstrumentList">
                  {observation.issData.crew.map((name, i) => (<span key={i} className="dinoSatInstrumentChip">{name}</span>))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {observation.activeEvents && observation.activeEvents.length > 0 && (
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faFire} /> Active Earth Events (NASA EONET)</span></div>
          <div className="dinoSatPanelCardBody">
            <div className="dinoSatEONETList">
              {observation.activeEvents.slice(0, 10).map((e, i) => (
                <a key={i} href={e.link} target="_blank" rel="noopener noreferrer" className="dinoSatEONETItem">
                  <div className="dinoSatEONETTitle">{e.title}</div>
                  <div className="dinoSatEONETMeta">
                    {e.categories.map((c, j) => <span key={j} className="dinoSatEONETCategory">{c}</span>)}
                    <span>{e.date ? new Date(e.date).toLocaleDateString() : ""}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {externalRefs.length > 0 && (
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faSatelliteDish} /> External Tracking & Catalogs</span></div>
          <div className="dinoSatPanelCardBody">
            <div className="dinoSatExternalRefGrid">
              {externalRefs.map((r, i) => (
                <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="dinoSatExternalRefCard">
                  <div className="dinoSatExternalRefName">{r.label}</div>
                  {r.description && <div className="dinoSatExternalRefDesc">{r.description}</div>}
                  <div className="dinoSatExternalRefUrl">{r.host}</div>
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
  const ageDays = satellite.tleAgeDays;
  const errorEnvelope1d = ageDays !== null ? Math.max(0.5, ageDays * 0.5) : null;
  const errorEnvelope7d = ageDays !== null ? Math.max(2, ageDays * 2) : null;
  return (
    <div className="dinoSatDossierTabContent">
      <div className="dinoSatPanelCard">
        <div className="dinoSatPanelCardHeader"><span>TLE Quality</span></div>
        <div className="dinoSatPanelCardBody">
          <div className="dinoSatDossierStrip">
            <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Epoch</div><div className="dinoSatDossierCellValue">{satellite.tleEpoch || "Unknown"}</div></div>
            <div className="dinoSatDossierCell" style={{ borderLeftColor: tleAgeColor(ageDays) }}><div className="dinoSatDossierCellLabel">Age</div><div className="dinoSatDossierCellValue" style={{ color: tleAgeColor(ageDays) }}>{ageDays !== null ? ageDays : "?"}<span>days</span></div></div>
            <div className="dinoSatDossierCell" style={{ borderLeftColor: tleAgeColor(ageDays) }}><div className="dinoSatDossierCellLabel">Quality Class</div><div className="dinoSatDossierCellValue" style={{ color: tleAgeColor(ageDays) }}>{tleAgeLabel(ageDays)}</div></div>
            <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">BSTAR Drag</div><div className="dinoSatDossierCellValue">{satellite.bstar !== undefined ? satellite.bstar.toExponential(3) : "?"}</div></div>
            <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Error +1d</div><div className="dinoSatDossierCellValue">{errorEnvelope1d !== null ? `~${errorEnvelope1d.toFixed(1)}` : "?"}<span>km</span></div></div>
            <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Error +7d</div><div className="dinoSatDossierCellValue">{errorEnvelope7d !== null ? `~${errorEnvelope7d.toFixed(1)}` : "?"}<span>km</span></div></div>
          </div>
        </div>
      </div>
      <div className="dinoSatPanelCard">
        <div className="dinoSatPanelCardHeader"><span>Raw TLE</span></div>
        <div className="dinoSatPanelCardBody">
          <pre className="dinoSatTLEBlock">{satellite.tle?.line1 || ""}{"\n"}{satellite.tle?.line2 || ""}</pre>
        </div>
      </div>
    </div>
  );
};

export default function SatelliteTracker() {
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);
  const [showErrors, setShowErrors] = useState(false);
  const [copiedErrors, setCopiedErrors] = useState(false);
  const [loadingMetadata, setLoadingMetadata] = useState(null);
  const [satellites, setSatellites] = useState([]);
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
  const [showAltitudeBands, setShowAltitudeBands] = useState(true);
  const [showDistanceRings, setShowDistanceRings] = useState(true);
  const [bloomEnabled, setBloomEnabled] = useState(true);
  const [bloomStrength, setBloomStrength] = useState(0.6);
  const [bloomRadius, setBloomRadius] = useState(0.3);
  const [bloomThreshold, setBloomThreshold] = useState(0.3);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [legendCollapsed, setLegendCollapsed] = useState(false);
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
      if (colorByTleAgeRef.current) { baseColor = tleAgeColor(satellite.tleAgeDays); }
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
    if (satelliteInstanceRef.current.instanceColor) { satelliteInstanceRef.current.instanceColor.needsUpdate = true; }
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
    const url = `${import.meta.env.VITE_API_AUTH_URL}/satellite-stream`;

    let eventSource;
    try {
      eventSource = new EventSource(url);
    } catch (error) {
      setLoading(false);
      setErrors([`Failed to open stream: ${error.message}.`]);
      return;
    }
    eventSourceRef.current = eventSource;

    let helloReceived = false;
    const connectionTimeoutId = setTimeout(() => {
      if (!helloReceived && eventSource.readyState !== EventSource.OPEN) {
        setErrors(prev => [...prev, "Stream connection timeout — server did not respond."]);
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
          const isActive = activeCount < PERFORMANCE_CONSTANTS.PRESELECT_COUNT;
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
          setErrors(prev => [...prev, `Failed to fetch ${data.source}: ${data.error}.`]);
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
      const r = await fetch(`${import.meta.env.VITE_API_AUTH_URL}/space-weather`);
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
      const r = await fetch(`${import.meta.env.VITE_API_AUTH_URL}/space-weather-ai`, {
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
      const r = await fetch(`${import.meta.env.VITE_API_AUTH_URL}/mission-intelligence`, {
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
      const r = await fetch(`${import.meta.env.VITE_API_AUTH_URL}/observation-data`, {
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
      const r = await fetch(`${import.meta.env.VITE_API_AUTH_URL}/constellation-health`);
      const j = await r.json();
      if (j.success) setConstellationHealth(j.constellations);
    } catch (error) {} finally {
      setConstellationLoading(false);
    }
  }, []);

  const fetchDecayWatch = useCallback(async () => {
    setDecayLoading(true);
    try {
      const r = await fetch(`${import.meta.env.VITE_API_AUTH_URL}/decay-watch`);
      const j = await r.json();
      if (j.success) {
        setDecayCandidates(j.candidates || []);
        setDecayMethodology(j.methodology || null);
      }
    } catch (error) {} finally {
      setDecayLoading(false);
    }
  }, []);

  const requestGeolocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setObserverLocation({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          alt: pos.coords.altitude || 0
        });
      },
      (error) => {
        alert(`Geolocation failed: ${error.message}.`);
      }
    );
  }, []);

  const copyAllErrors = useCallback(async () => {
    try {
      const errorText = errors.join("\n");
      await navigator.clipboard.writeText(errorText);
      setCopiedErrors(true);
      setTimeout(() => setCopiedErrors(false), 2000);
    } catch (error) {}
  }, [errors]);

  const handleVirtualScroll = useCallback((e) => {
    setVirtualScrollOffset(e.target.scrollTop);
  }, []);

  const getVirtualScrollItems = useMemo(() => {
    if (!virtualScrollRef.current) {
      return { visibleItems: filteredSatellites.slice(0, 20), startIndex: 0, endIndex: 19 };
    }

    const containerHeight = virtualScrollRef.current.clientHeight || 400;
    const itemHeight = PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT;
    const buffer = PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_BUFFER;

    const startIndex = Math.max(0, Math.floor(virtualScrollOffset / itemHeight) - buffer);
    const endIndex = Math.min(
      filteredSatellites.length - 1,
      Math.ceil((virtualScrollOffset + containerHeight) / itemHeight) + buffer
    );

    const visibleItems = filteredSatellites.slice(startIndex, endIndex + 1);

    return { visibleItems, startIndex, endIndex };
  }, [filteredSatellites, virtualScrollOffset]);

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

  const togglePlay = useCallback(() => setIsPlaying(p => !p), []);
  const toggleOrbits = useCallback(() => setShowOrbits(v => !v), []);
  const toggleTrails = useCallback(() => setShowTrails(v => !v), []);
  const toggleLabels = useCallback(() => setShowLabels(v => !v), []);
  const toggleEquatorialGrid = useCallback(() => setShowEquatorialGrid(v => !v), []);
  const toggleAxisMarkers = useCallback(() => setShowAxisMarkers(v => !v), []);
  const toggleAltitudeBands = useCallback(() => setShowAltitudeBands(v => !v), []);
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
    if (!selectedSatellite) return;
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

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 8000);
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
    const earthGeometry = new THREE.SphereGeometry(SCENE_EARTH_RADIUS, 32, 32);
    const earthMaterial = new THREE.MeshPhongMaterial({ color: 0x4488DD, shininess: 10, transparent: false });
    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    earthGroup.add(earth);
    const landGeometry = new THREE.SphereGeometry(SCENE_EARTH_RADIUS + 0.001, 16, 16);
    const landMaterial = new THREE.MeshPhongMaterial({ color: 0x228B22, transparent: true, opacity: 0.7 });
    earthGroup.add(new THREE.Mesh(landGeometry, landMaterial));
    const cloudGeometry = new THREE.SphereGeometry(SCENE_EARTH_RADIUS + 0.004, 16, 16);
    const cloudMaterial = new THREE.MeshPhongMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.25 });
    earthGroup.add(new THREE.Mesh(cloudGeometry, cloudMaterial));

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
    controls.maxDistance = 2000;
    controls.minDistance = 10;
    controlsRef.current = controls;

    const handleResize = () => {
      if (!mountRef.current) return;
      const newWidth = mountRef.current.clientWidth;
      const newHeight = mountRef.current.clientHeight;
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
    composer.render();
    setSceneInitialized(true);

    return () => {
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
        if (line) { line.geometry.dispose(); line.material.dispose(); }
      });
      Object.values(trailLinesRef.current).forEach(line => {
        if (line) { line.geometry.dispose(); line.material.dispose(); }
      });
      composer.dispose();
      window.removeEventListener("resize", handleResize);
      controls.dispose();
      scene.traverse(child => {
        if (child instanceof THREE.Mesh || child instanceof THREE.InstancedMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) { child.material.forEach(mat => mat.dispose()); }
            else { child.material.dispose(); }
          }
        }
        if (child instanceof THREE.Line || child instanceof THREE.Points) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        }
      });
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    if (sceneInitialized) {
      fetchSatelliteData();
      const interval = setInterval(() => fetchSatelliteData(), 15 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [sceneInitialized, fetchSatelliteData]);

  useEffect(() => { if (gridRef.current) gridRef.current.visible = showGrid; }, [showGrid]);
  useEffect(() => { if (equatorialGridRef.current) equatorialGridRef.current.visible = showEquatorialGrid; }, [showEquatorialGrid]);
  useEffect(() => { if (axisMarkersRef.current) axisMarkersRef.current.visible = showAxisMarkers; }, [showAxisMarkers]);
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
          if (data.inShadow) { inShadow++; } else { sunlit++; }
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
      <div className="dinoSatDossierTabContent">
        <div className="dinoSatStatTileGrid">
          <StatTile label="Status" value={sat.status} sub={`${sat.category} · ${sat.propagationModel || "No TLE"}`} color={sat.status === "Active" ? "#4ade80" : "#fb923c"} accent={sat.color} large />
          <StatTile label="NORAD ID" value={sat.noradId} sub={sat.source || "Unknown source"} accent="#42a5f5" />
          <StatTile label="TLE Age" value={ageDays !== null && ageDays !== undefined ? `${ageDays}d` : "?"} sub={tleAgeLabel(ageDays)} color={tleColor} accent={tleColor} />
          <StatTile label="Altitude" value={sat.altitude} unit="km" sub={`${sat.apogee} apo / ${sat.perigee} peri`} accent="#42a5f5" />
          <StatTile label="Period" value={sat.period?.toFixed(2)} unit="min" sub={`${sat.meanMotion} rev/day`} accent="#42a5f5" />
          <StatTile label="Inclination" value={`${sat.inclination}°`} sub={`${inclLabel} · RAAN ${sat.raan}°`} accent="#42a5f5" />
          <StatTile label="Eccentricity" value={sat.eccentricity} sub={eccLabel} accent="#42a5f5" />
          <StatTile label="Velocity" value={sat.velocity} unit="km/s" sub={`SMA ${sat.semiMajorAxis} km`} accent="#42a5f5" />
          <StatTile label="Eclipse" value={inShadow ? "Shadow" : "Sunlit"} sub={`${illumination}% illumination`} color={inShadow ? "#fb923c" : "#4ade80"} accent={inShadow ? "#fb923c" : "#4ade80"} />
          {sat.hasTLE && (<StatTile label="Render State" value={isVisible ? "Visible" : "Culled"} sub="ECI J2000.0" color={isVisible ? "#4ade80" : "#fb923c"} accent={isVisible ? "#4ade80" : "#fb923c"} />)}
          {advanced.isSunSynchronous && (<StatTile label="Sun-Synchronous" value="Yes" sub={`${advanced.sunSyncInclination}° expected`} color="#4ade80" accent="#4ade80" />)}
        </div>

        <div className="dinoSatDossierGrid">
          <div className="dinoSatPanelCard">
            <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faRulerCombined} /> Keplerian Elements</span></div>
            <div className="dinoSatPanelCardBody">
              <div className="dinosatSatelliteHUDSectionGrid">
                <div className="dinosatSatelliteHUDSectionItem"><span>Semi-Major Axis</span><span>{sat.semiMajorAxis} km</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Eccentricity</span><span>{sat.eccentricity}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Inclination</span><span>{sat.inclination}°</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>RAAN (Ω)</span><span>{sat.raan}°</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Arg of Perigee (ω)</span><span>{sat.argOfPerigee}°</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Mean Anomaly (M)</span><span>{sat.meanAnomaly}°</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Mean Motion (n)</span><span>{sat.meanMotion} rev/d</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Apogee Altitude</span><span>{sat.apogee} km</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Perigee Altitude</span><span>{sat.perigee} km</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Apogee/Perigee Ratio</span><span>{sat.apogee && sat.perigee ? (sat.apogee / sat.perigee).toFixed(3) : "—"}</span></div>
              </div>
            </div>
          </div>

          <div className="dinoSatPanelCard">
            <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faAtom} /> Derived Orbital Mechanics</span></div>
            <div className="dinoSatPanelCardBody">
              <div className="dinosatSatelliteHUDSectionGrid">
                <div className="dinosatSatelliteHUDSectionItem"><span>Velocity at Avg</span><span>{sat.velocity} km/s</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Specific Energy</span><span>{sat.specificEnergy} km²/s²</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Angular Momentum</span><span>{sat.angularMomentum} km²/s</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Mean Angular Motion</span><span>{sat.meanAngularMotion} rad/s</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Escape Velocity</span><span>{advanced.escapeVelocity} km/s</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Orbit Circumference</span><span>{advanced.orbitCircumference?.toLocaleString()} km</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>RAAN Drift Rate (J2)</span><span>{advanced.raanRate}°/day</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Arg.P Drift Rate (J2)</span><span>{advanced.argpRate}°/day</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Nodal Precession Period</span><span>{advanced.nodalPrecessionPeriod ? `${advanced.nodalPrecessionPeriod} days` : "—"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Apsidal Precession Period</span><span>{advanced.apsidalPrecessionPeriod ? `${advanced.apsidalPrecessionPeriod} days` : "—"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Repeat Ground Track</span><span>{advanced.repeatGroundTrackDays !== null ? `${advanced.repeatGroundTrackDays} days (${advanced.repeatGroundTrackRevs} revs)` : "—"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Sun-Sync Inclination</span><span>{advanced.sunSyncInclination !== null ? `${advanced.sunSyncInclination}°` : "—"}</span></div>
              </div>
            </div>
          </div>

          <div className="dinoSatPanelCard">
            <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faEye} /> Sensor Coverage Geometry</span></div>
            <div className="dinoSatPanelCardBody">
              <div className="dinosatSatelliteHUDSectionGrid">
                <div className="dinosatSatelliteHUDSectionItem"><span>Horizon Distance</span><span>{horizonDist} km</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Footprint Radius</span><span>{footprintRadius} km</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Coverage Area</span><span>{coverageArea} M km²</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Earth Surface %</span><span>{earthCoverage}%</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Passes per Day</span><span>{Math.round(1440 / sat.period)}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Period in Hours</span><span>{(sat.period / 60).toFixed(2)} h</span></div>
              </div>
            </div>
          </div>

          <div className="dinoSatPanelCard">
            <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faSatellite} /> Identity & Provenance</span></div>
            <div className="dinoSatPanelCardBody">
              <div className="dinosatSatelliteHUDSectionGrid">
                <div className="dinosatSatelliteHUDSectionItem"><span>Name</span><span>{sat.name}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>NORAD ID</span><span>{sat.noradId}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Category</span><span>{sat.category}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Group</span><span>{sat.group || "—"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Status</span><span style={{ color: sat.status === "Active" ? "#4ade80" : "#fb923c" }}>{sat.status}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Source</span><span>{sat.source || "Unknown"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Propagation</span><span style={{ color: sat.hasTLE ? "#4ade80" : "#fb923c" }}>{sat.propagationModel || "No TLE"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Has TLE</span><span>{sat.hasTLE ? "Yes" : "No"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Epoch Year</span><span>{sat.epochYear !== undefined && sat.epochYear !== null ? sat.epochYear : "—"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Epoch Day</span><span>{sat.epochDay !== undefined ? sat.epochDay : "—"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>BSTAR</span><span>{sat.bstar !== undefined ? sat.bstar.toExponential(3) : "—"}</span></div>
              </div>
            </div>
          </div>

          {sat.hasTLE && livePosition && (
            <div className="dinoSatPanelCard">
              <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faGauge} /> Live State Vector (ECI)</span></div>
              <div className="dinoSatPanelCardBody">
                <div className="dinosatSatelliteHUDSectionGrid">
                  <div className="dinosatSatelliteHUDSectionItem"><span>Rendering</span><span style={{ color: "#4ade80" }}>Instanced</span></div>
                  <div className="dinosatSatelliteHUDSectionItem"><span>Position Source</span><span style={{ color: "#4ade80" }}>SGP4/SDP4</span></div>
                  <div className="dinosatSatelliteHUDSectionItem"><span>Visibility</span><span style={{ color: isVisible ? "#4ade80" : "#fb923c" }}>{isVisible ? "Visible" : "Culled"}</span></div>
                  <div className="dinosatSatelliteHUDSectionItem"><span>Coordinate Frame</span><span>ECI J2000.0</span></div>
                  <div className="dinosatSatelliteHUDSectionItem"><span>Eclipse Status</span><span style={{ color: inShadow ? "#fb923c" : "#4ade80" }}>{inShadow ? "In Shadow" : "Sunlit"}</span></div>
                  <div className="dinosatSatelliteHUDSectionItem"><span>Illumination</span><span>{illumination}%</span></div>
                  <div className="dinosatSatelliteHUDSectionItem"><span>X (scene)</span><span>{livePosition.x.toFixed(3)}</span></div>
                  <div className="dinosatSatelliteHUDSectionItem"><span>Y (scene)</span><span>{livePosition.y.toFixed(3)}</span></div>
                  <div className="dinosatSatelliteHUDSectionItem"><span>Z (scene)</span><span>{livePosition.z.toFixed(3)}</span></div>
                  <div className="dinosatSatelliteHUDSectionItem"><span>Geocentric Distance</span><span>{liveDistanceFromEarthCenter ? `${liveDistanceFromEarthCenter.toFixed(0)} km` : "—"}</span></div>
                </div>
              </div>
            </div>
          )}

          <div className="dinoSatPanelCard">
            <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faBookOpen} /> Operational Implications</span></div>
            <div className="dinoSatPanelCardBody">
              <div className="dinoSatBriefingGrid">
                <div className="dinoSatBriefingItem"><b>Orbital Regime</b><p>{sat.category} class at {sat.altitude} km. {advanced.isSunSynchronous ? "Sun-synchronous orbit; provides consistent solar illumination angle for imaging." : "Standard regime for this category."}</p></div>
                <div className="dinoSatBriefingItem"><b>Drag Sensitivity</b><p>{sat.altitude < 600 ? "Significant atmospheric drag at this altitude; orbit will decay rapidly without station-keeping." : sat.altitude < 1000 ? "Moderate drag; periodic boosts likely required over multi-year operations." : "Minimal drag at this altitude; orbit is essentially stable."}</p></div>
                <div className="dinoSatBriefingItem"><b>Radiation Environment</b><p>{sat.altitude < 1000 ? "Below the inner Van Allen belt; standard SAA exposure during equatorial passes." : sat.altitude < 13000 ? "Inside the inner Van Allen belt; high TID accumulation environment." : sat.altitude < 30000 ? "Between belts; moderate radiation, periodic outer-belt incursions." : "GEO/HEO environment; vulnerable to outer-belt electron enhancements."}</p></div>
                <div className="dinoSatBriefingItem"><b>Eclipse Profile</b><p>{liveData?.inShadow ? "Currently in Earth's shadow. Battery discharge phase active; thermal cycling stress." : "Currently illuminated. Solar arrays providing power; thermal expansion from sun heating."}</p></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="dinoSatPageWrapper">
      <DinoLabsNav activePage={"sat"}/>

      <div className={`dinoSatSatelliteTrackerContainer satellite-theme-${theme}`}>
        <div className={`dinoSatSatelliteSideBar ${sidebarCollapsed ? "dinoSatSatelliteSideBarCollapsed" : ""}`}>
          {loading && (
            <div className="dinoSatSatelliteSideBarLoadingContainer">
              <label>Loading Satellite Data...</label>
              <div className="dinoSatSatelliteSideBarLoadingBar">
                <div className="dinoSatSatelliteSideBarLoadingBarAccent" />
              </div>
              <small>Fetching from CelesTrak, IERS, NOAA SWPC...</small>
            </div>
          )}

          <div className="dinoSatSatelliteSideBarHeader">
            <h1>
              {!sidebarCollapsed && <small>Satellite Tracker</small>}
            </h1>

            {!sidebarCollapsed && (
              <>
                <div className="dinoSatSatelliteSideBarThemeSelector">
                  <button className={`dinoSatSatelliteSelectButton ${theme === "dark" ? "dinoSatSatelliteButtonActive" : ""}`} onClick={() => setTheme("dark")}>Dark</button>
                  <button className={`dinoSatSatelliteSelectButton ${theme === "neon" ? "dinoSatSatelliteButtonActive" : ""}`} onClick={() => setTheme("neon")}>Neon</button>
                </div>

                <div className="dinoSatSatelliteSideBarThemeSelector">
                  <div className="dinoSatSatelliteSideBarThemeSelectorStatusIndicator">
                    Ready
                    {loadingMetadata && (
                      <div style={{ fontSize: "9px", marginTop: "2px" }}>
                        Quality: {loadingMetadata.dataQuality} | Load: {loadingMetadata.loadTime?.toFixed(0)}ms
                      </div>
                    )}
                  </div>
                </div>

                <div className="dinoSatSatelliteSideBarThemeSelector">
                  {errors.length > 0 && (
                    <div
                      className="dinoSatSatelliteSideBarThemeSelectorErrorIndicator"
                      onClick={() => setShowErrors(!showErrors)}
                      style={{
                        opacity: showErrors ? 1.0 : "",
                        paddingTop: showErrors ? "" : 0,
                        paddingBottom: showErrors ? "" : 0
                      }}
                    >
                      <div className="dinoSatSatelliteSideBarThemeSelectorErrorIndicatorHeader">
                        <span>API Errors ({errors.length})</span>
                        <button onClick={(e) => { e.stopPropagation(); copyAllErrors(); }} aria-label="Copy all errors">
                          <FontAwesomeIcon icon={copiedErrors ? faSquareCheck : faClone} size="sm" />
                        </button>
                      </div>
                      {showErrors && (
                        <div className="dinoSatSatelliteSideBarThemeSelectorErrorIndicatorList">
                          {errors.map((error, index) => (
                            <div key={index} style={{ opacity: 0.8 }}>{error}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {!sidebarCollapsed && !loading && (
            <>
              <div className="dinoSatSatelliteSearchControls">
                <input type="text" placeholder="Search satellites..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="dinoSatSatelliteSearchInput" />
                <div className="dinoSatSatelliteSelectControls">
                  <button className="dinoSatSatelliteSelectButton" onClick={selectAllSatellites}>All</button>
                  <button className="dinoSatSatelliteSelectButton" onClick={deselectAllSatellites}>None</button>
                  <button className="dinoSatSatelliteSelectButton" onClick={fetchSatelliteData}>Refresh</button>
                </div>
                <div className="dinoSatSatelliteSelectControls">
                  <button className={`dinoSatSatelliteSelectButton ${colorByTleAge ? "dinoSatSatelliteButtonActive" : ""}`} onClick={() => setColorByTleAge(v => !v)}>
                    {colorByTleAge ? "Color: TLE Age" : "Color: Category"}
                  </button>
                </div>
              </div>

              <div className="dinoSatSatelliteTLEQualityBar">
                <div className="dinoSatTLEQualityCount" style={{ color: "#4ade80" }} title="Fresh (<1d)"><b>{tleQualityStats.fresh}</b><span>fresh</span></div>
                <div className="dinoSatTLEQualityCount" style={{ color: "#84cc16" }} title="Recent (1-3d)"><b>{tleQualityStats.recent}</b><span>recent</span></div>
                <div className="dinoSatTLEQualityCount" style={{ color: "#facc15" }} title="Aging (3-7d)"><b>{tleQualityStats.aging}</b><span>aging</span></div>
                <div className="dinoSatTLEQualityCount" style={{ color: "#fb923c" }} title="Stale (1-2w)"><b>{tleQualityStats.stale}</b><span>stale</span></div>
                <div className="dinoSatTLEQualityCount" style={{ color: "#ef4444" }} title="Very stale (>2w)"><b>{tleQualityStats.veryStale}</b><span>old</span></div>
              </div>

              <div className="dinoSatSatelliteObjectsHeader">
                <span className="dinoSatSatelliteObjectsHeaderIcon"><FontAwesomeIcon icon={faSatellite} /></span>
                <span>Satellites ({satellites.filter(s => s.active).length}/{satellites.length})</span>
              </div>

              <div
                ref={virtualScrollRef}
                className="dinoSatSatelliteList satellite-list"
                style={{ flex: 1, overflowY: "auto", position: "relative" }}
                onScroll={handleVirtualScroll}
              >
                <div style={{ height: filteredSatellites.length * PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT, position: "relative" }}>
                  <div style={{ position: "absolute", top: startIndex * PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT, width: "100%" }}>
                    {visibleItems.map((satellite) => (
                      <div
                        key={satellite.id}
                        className={`dinoSatSatelliteListItem satellite-item ${satellite.active ? "dinoSatSatelliteButtonActive" : ""} ${selectedSatellite === satellite.id ? "satellite-selected" : ""}`}
                        style={{ height: PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT, minHeight: PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT }}
                        onClick={() => {
                          if (!satellite.active) { toggleSatellite(satellite.id); }
                          setSelectedSatellite(satellite.id);
                          zoomToSatellite(satellite.id);
                        }}
                      >
                        <div className="dinoSatSatelliteIndicator" style={{ backgroundColor: satellite.color }} />
                        <div className="dinoSatSatelliteTleBadge" style={{ backgroundColor: tleAgeColor(satellite.tleAgeDays) }} title={`TLE: ${tleAgeLabel(satellite.tleAgeDays)}`} />
                        <div className="dinoSatSatelliteName satellite-name">{satellite.name}</div>
                        <label className="consoleSwitch">
                          <input type="checkbox" checked={satellite.active} onChange={() => { toggleSatellite(satellite.id); }} />
                          <span className="consoleSlider round"></span>
                        </label>
                        <button className="dinoSatSatelliteInfoButton" onClick={(e) => { e.stopPropagation(); openDossier(satellite); }} aria-label="Show dossier">
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

        <div className={`dinoSatSatelliteMainView ${anyOverlayPanelOpen ? "dinoSatPanelOpen" : ""}`}>
          <SpaceWeatherStrip data={spaceWeather} loading={spaceWeatherLoading} expanded={spaceWeatherExpanded} onToggle={toggleSpaceWeatherExpanded} />

          {spaceWeatherExpanded && (
            <SpaceWeatherDetail data={spaceWeather} onClose={() => setSpaceWeatherExpanded(false)} onRequestAIAnalysis={() => fetchSpaceWeatherAI(true)} aiAnalysis={spaceWeatherAI} aiLoading={spaceWeatherAILoading} />
          )}

          {showConjunctionPanel && (
            <ConjunctionsPanel conjunctions={conjunctions} onSelect={openDossier} onClose={() => setShowConjunctionPanel(false)} satellites={satellites} />
          )}

          {showConstellationPanel && (
            <ConstellationHealthPanel data={constellationHealth} loading={constellationLoading} onRefresh={fetchConstellationHealth} onClose={() => setShowConstellationPanel(false)} onSelect={openDossier} />
          )}

          {showDecayPanel && (
            <DecayWatchPanel candidates={decayCandidates} loading={decayLoading} onRefresh={fetchDecayWatch} onClose={() => setShowDecayPanel(false)} onSelect={openDossier} methodology={decayMethodology} />
          )}

          <div className="dinonSatSatelliteViewHeader">
            <div className="dinoSatSatellitePlaybackControls">
              <button className="dinoSatSatellitePlaybackControlsButton" onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"}>
                <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
              </button>

              {SPEED_OPTIONS.map(option => (
                <button key={option.label} className={`dinoSatSatellitePlaybackControlsSpeedButton ${speedMultiplier === option.value ? "dinoSatSatelliteButtonActive" : ""}`} onClick={() => changeSpeed(option.value)} aria-label={option.label}>
                  {option.label}
                </button>
              ))}

              <select className="dinoSatSatelliteFPSSelect" value={targetFps} onChange={(e) => setTargetFps(Number(e.target.value))} aria-label="Target FPS">
                {FPS_OPTIONS.map(fps => (<option key={fps} value={fps}>{fps} FPS</option>))}
              </select>

              <button className={`dinoSatSatellitePlaybackControlsButton ${viewMode === "3d" ? "dinoSatSatelliteButtonActive" : ""}`} onClick={() => setViewMode("3d")}><FontAwesomeIcon icon={faGlobe} /> 3D</button>
              <button className={`dinoSatSatellitePlaybackControlsButton ${viewMode === "2d" ? "dinoSatSatelliteButtonActive" : ""}`} onClick={() => setViewMode("2d")} disabled={!selectedSatellite} title={!selectedSatellite ? "Select a satellite for ground track." : ""}><FontAwesomeIcon icon={faMapLocation} /> 2D Track</button>

              <button className={`dinoSatSatellitePlaybackControlsButton ${hudVisible ? "dinoSatSatelliteButtonActive" : ""}`} onClick={toggleHUD} aria-label="Toggle HUD"><FontAwesomeIcon icon={faChartLine} /> HUD</button>
              <button className={`dinoSatSatellitePlaybackControlsButton ${showConjunctionPanel ? "dinoSatSatelliteButtonActive" : ""}`} onClick={toggleConjunctionPanel}><FontAwesomeIcon icon={faTriangleExclamation} /> Conjunctions ({conjunctions.length})</button>
              <button className={`dinoSatSatellitePlaybackControlsButton ${showConstellationPanel ? "dinoSatSatelliteButtonActive" : ""}`} onClick={toggleConstellationPanel}><FontAwesomeIcon icon={faCircleNodes} /> Constellation Health</button>
              <button className={`dinoSatSatellitePlaybackControlsButton ${showDecayPanel ? "dinoSatSatelliteButtonActive" : ""}`} onClick={toggleDecayPanel}><FontAwesomeIcon icon={faFire} /> Decay Watch</button>

              <button className="dinoSatSatellitePlaybackControlsButton" onClick={exportJSON}>JSON</button>
              <button className="dinoSatSatellitePlaybackControlsButton" onClick={exportCSV}>CSV</button>
              <button className="dinoSatSatellitePlaybackControlsButton" onClick={exportText}>TXT</button>
            </div>
          </div>

          <div className="dinoSatMainContent">
            <div className="dinoSatCanvasArea">
              <div ref={mountRef} className="dinoSatSatelliteCanvasContainer" style={{ display: (viewMode === "2d" || anyOverlayPanelOpen) ? "none" : "block" }} />

              {viewMode === "2d" && !anyOverlayPanelOpen && selectedSatelliteObj && (
                <GroundTrackView satellite={selectedSatelliteObj} satrec={selectedSatrec} currentDate={new Date(simulationDateMsRef.current)} />
              )}
            </div>

            <div className="dinoSatRightRail">
              <div className="dinoSatRightRailSection">
                <button className="dinoSatRightRailSectionHeader" onClick={() => setControlsCollapsed(c => !c)}>
                  <span>3D Controls</span>
                  <FontAwesomeIcon icon={controlsCollapsed ? faChevronDown : faChevronUp} />
                </button>
                {!controlsCollapsed && (
                  <div className="dinoSatRightRailSectionBody">
                    <div className="dinoSatRailControlGrid">
                      <button className="dinoSatSatelliteControlButton" onClick={resetCamera}>Reset Camera</button>
                      <button className="dinoSatSatelliteControlButton" onClick={toggleOrbits}>{showOrbits ? "Hide" : "Show"} Orbits</button>
                      <button className="dinoSatSatelliteControlButton" onClick={toggleTrails}>{showTrails ? "Hide" : "Show"} Trails</button>
                      <button className="dinoSatSatelliteControlButton" onClick={toggleLabels}>{showLabels ? "Hide" : "Show"} Labels</button>
                      <button className="dinoSatSatelliteControlButton" onClick={toggleBloom}>{bloomEnabled ? "Disable" : "Enable"} Bloom</button>
                      <button className="dinoSatSatelliteControlButton" onClick={toggleAxisMarkers}>{showAxisMarkers ? "Hide" : "Show"} Axes</button>
                      <button className="dinoSatSatelliteControlButton" onClick={toggleEquatorialGrid}>{showEquatorialGrid ? "Hide" : "Show"} Grid</button>
                      <button className="dinoSatSatelliteControlButton" onClick={toggleAltitudeBands}>{showAltitudeBands ? "Hide" : "Show"} Alt Bands</button>
                      <button className="dinoSatSatelliteControlButton" onClick={toggleDistanceRings}>{showDistanceRings ? "Hide" : "Show"} Dist Rings</button>
                    </div>
                    <div className="dinoSatSatelliteBloomControls">
                      <div className="dinoSatSatelliteBloomSlider">
                        <span>Conj km</span>
                        <input type="range" min="5" max="200" step="5" value={conjunctionThreshold} onChange={(e) => setConjunctionThreshold(parseInt(e.target.value))} />
                        <span>{conjunctionThreshold}</span>
                      </div>
                    </div>
                    {bloomEnabled && (
                      <div className="dinoSatSatelliteBloomControls">
                        <div className="dinoSatSatelliteBloomSlider">
                          <span>Strength</span>
                          <input type="range" min="0" max="5" step="0.1" value={bloomStrength} onChange={(e) => setBloomStrength(parseFloat(e.target.value))} />
                          <span>{bloomStrength.toFixed(1)}</span>
                        </div>
                        <div className="dinoSatSatelliteBloomSlider">
                          <span>Radius</span>
                          <input type="range" min="0" max="2" step="0.05" value={bloomRadius} onChange={(e) => setBloomRadius(parseFloat(e.target.value))} />
                          <span>{bloomRadius.toFixed(2)}</span>
                        </div>
                        <div className="dinoSatSatelliteBloomSlider">
                          <span>Threshold</span>
                          <input type="range" min="0" max="2" step="0.05" value={bloomThreshold} onChange={(e) => setBloomThreshold(parseFloat(e.target.value))} />
                          <span>{bloomThreshold.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="dinoSatRightRailSection">
                <button className="dinoSatRightRailSectionHeader" onClick={() => setLegendCollapsed(c => !c)}>
                  <span>Category Legend</span>
                  <FontAwesomeIcon icon={legendCollapsed ? faChevronDown : faChevronUp} />
                </button>
                {!legendCollapsed && (
                  <div className="dinoSatRightRailSectionBody">
                    <div className="dinoSatRailLegendList">
                      {Object.entries(CATEGORY_COLORS).map(([category, color]) => (
                        <div key={category} className="dinoSatSatelliteLegendItem">
                          <div className="dinoSatSatelliteLegendColor" style={{ backgroundColor: color }} />
                          <span>{category}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {hudVisible && (
            <div ref={hudPanelRef} className="dinoSatSatelliteHUDPanel" tabIndex={0}>
              <div className="dinoSatSatelliteHUDPanelHeader">
                <span>Performance HUD & System Telemetry</span>
                <button className="dinoSatSatelliteCloseButton" onClick={toggleHUD}><FontAwesomeIcon icon={faXmark} /></button>
              </div>
              <div className="dinoSatSatelliteHUDContent">
                <div className="dinoSatStatTileGrid">
                  <StatTile label="FPS" value={actualFps} sub={`Target ${targetFps}`} color={actualFps >= targetFps * 0.9 ? "#4ade80" : actualFps >= targetFps * 0.6 ? "#facc15" : "#ef4444"} accent={actualFps >= targetFps * 0.9 ? "#4ade80" : "#fb923c"} large />
                  <StatTile label="Render Time" value={performanceStats.renderTime} unit="ms" accent="#42a5f5" />
                  <StatTile label="Draw Calls" value={performanceStats.drawCalls} accent="#42a5f5" />
                  <StatTile label="Triangles" value={performanceStats.triangles.toLocaleString()} accent="#42a5f5" />
                  <StatTile label="Lines" value={performanceStats.lines.toLocaleString()} accent="#42a5f5" />
                  <StatTile label="Visible Sats" value={performanceStats.visibleSatellites} color="#4ade80" accent="#4ade80" />
                  <StatTile label="Culled" value={performanceStats.culledSatellites} color="#fb923c" accent="#fb923c" />
                  <StatTile label="Active / Total" value={`${activeSatellites} / ${satellites.length}`} accent="#42a5f5" />
                  <StatTile label="Conjunctions" value={conjunctions.length} color={conjunctions.length > 0 ? "#fb923c" : "#4ade80"} accent={conjunctions.length > 0 ? "#fb923c" : "#4ade80"} />
                  <StatTile label="Sim Speed" value={speedLabel} accent="#42a5f5" />
                  <StatTile label="Memory" value={performanceStats.memoryUsage} unit="objects" accent="#42a5f5" />
                  <StatTile label="Geometries" value={performanceStats.geometries} accent="#42a5f5" />
                  <StatTile label="Textures" value={performanceStats.textures} accent="#42a5f5" />
                  <StatTile label="Sunlit" value={eclipseStats.sunlit} color="#4ade80" accent="#4ade80" />
                  <StatTile label="In Shadow" value={eclipseStats.inShadow} color="#fb923c" accent="#fb923c" />
                </div>

                <div className="dinoSatDossierGrid">
                  <div className="dinoSatPanelCard">
                    <div className="dinoSatPanelCardHeader"><span>Coordinate System & Reference Frame</span></div>
                    <div className="dinoSatPanelCardBody">
                      <div className="dinosatSatelliteHUDSectionGrid">
                        <div className="dinosatSatelliteHUDSectionItem"><span>Reference Frame</span><span>ECI J2000.0</span></div>
                        <div className="dinosatSatelliteHUDSectionItem"><span>Origin</span><span>Earth Center</span></div>
                        <div className="dinosatSatelliteHUDSectionItem"><span>X-Axis</span><span>Vernal Equinox</span></div>
                        <div className="dinosatSatelliteHUDSectionItem"><span>Y-Axis</span><span>90E Longitude</span></div>
                        <div className="dinosatSatelliteHUDSectionItem"><span>Z-Axis</span><span>North Pole</span></div>
                        <div className="dinosatSatelliteHUDSectionItem"><span>Units</span><span>km (scaled)</span></div>
                        <div className="dinosatSatelliteHUDSectionItem"><span>Scale Factor</span><span>{ORBITAL_CONSTANTS.SCALE_FACTOR}</span></div>
                        <div className="dinosatSatelliteHUDSectionItem"><span>Earth Radius</span><span>{EARTH_RADIUS_KM} km</span></div>
                        <div className="dinosatSatelliteHUDSectionItem"><span>μ (Earth GM)</span><span>{EARTH_GM} km³/s²</span></div>
                      </div>
                    </div>
                  </div>

                  <div className="dinoSatPanelCard">
                    <div className="dinoSatPanelCardHeader"><span>Orbital Propagation Status</span></div>
                    <div className="dinoSatPanelCardBody">
                      <div className="dinosatSatelliteHUDSectionGrid">
                        <div className="dinosatSatelliteHUDSectionItem"><span>SGP4 Satellites</span><span style={{ color: "#4ade80" }}>{sgp4Count}</span></div>
                        <div className="dinosatSatelliteHUDSectionItem"><span>SDP4 Deep Space</span><span style={{ color: "#fb923c" }}>{sdp4Count}</span></div>
                        <div className="dinosatSatelliteHUDSectionItem"><span>TLE Errors</span><span style={{ color: errors.length > 0 ? "#ef4444" : "#4ade80" }}>{errors.length}</span></div>
                        <div className="dinosatSatelliteHUDSectionItem"><span>Earth Rotation</span><span style={{ color: earthRotationData ? "#4ade80" : "#ef4444" }}>{earthRotationData ? "IERS" : "Failed"}</span></div>
                        <div className="dinosatSatelliteHUDSectionItem"><span>Simulation Time</span><span>{currentTime}</span></div>
                        <div className="dinosatSatelliteHUDSectionItem"><span>Update Frequency</span><span>1/{PERFORMANCE_CONSTANTS.UPDATE_FREQUENCY} frame</span></div>
                        <div className="dinosatSatelliteHUDSectionItem"><span>Frustum Margin</span><span>{PERFORMANCE_CONSTANTS.FRUSTUM_MARGIN}x</span></div>
                        <div className="dinosatSatelliteHUDSectionItem"><span>Trail Length</span><span>{PERFORMANCE_CONSTANTS.TRAIL_LENGTH} samples</span></div>
                      </div>
                    </div>
                  </div>

                  <div className="dinoSatPanelCard">
                    <div className="dinoSatPanelCardHeader"><span>TLE Quality Distribution</span></div>
                    <div className="dinoSatPanelCardBody">
                      <div className="dinosatSatelliteHUDSectionGrid">
                        <div className="dinosatSatelliteHUDSectionItem"><span>Fresh (&lt;1d)</span><span style={{ color: "#4ade80" }}>{tleQualityStats.fresh}</span></div>
                        <div className="dinosatSatelliteHUDSectionItem"><span>Recent (1-3d)</span><span style={{ color: "#84cc16" }}>{tleQualityStats.recent}</span></div>
                        <div className="dinosatSatelliteHUDSectionItem"><span>Aging (3-7d)</span><span style={{ color: "#facc15" }}>{tleQualityStats.aging}</span></div>
                        <div className="dinosatSatelliteHUDSectionItem"><span>Stale (1-2w)</span><span style={{ color: "#fb923c" }}>{tleQualityStats.stale}</span></div>
                        <div className="dinosatSatelliteHUDSectionItem"><span>Very Stale (&gt;2w)</span><span style={{ color: "#ef4444" }}>{tleQualityStats.veryStale}</span></div>
                        <div className="dinosatSatelliteHUDSectionItem"><span>Unknown</span><span>{tleQualityStats.unknown}</span></div>
                      </div>
                    </div>
                  </div>

                  <div className="dinoSatPanelCard">
                    <div className="dinoSatPanelCardHeader"><span>Fleet Statistics by Category</span></div>
                    <div className="dinoSatPanelCardBody">
                      <div className="dinosatSatelliteHUDSectionGrid">
                        {Object.entries(CATEGORY_COLORS).map(([cat, col]) => (
                          <div key={cat} className="dinosatSatelliteHUDSectionItem">
                            <span>{cat}</span>
                            <span style={{ color: col }}>{categoryCounts[cat] || 0}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {spaceWeather && spaceWeather.kpIndex && (
                    <div className="dinoSatPanelCard">
                      <div className="dinoSatPanelCardHeader"><span>Space Weather Snapshot</span></div>
                      <div className="dinoSatPanelCardBody">
                        <div className="dinosatSatelliteHUDSectionGrid">
                          <div className="dinosatSatelliteHUDSectionItem"><span>Kp Index</span><span style={{ color: spaceWeather.kpIndex.classification.color }}>{spaceWeather.kpIndex.current} ({spaceWeather.kpIndex.classification.level})</span></div>
                          <div className="dinosatSatelliteHUDSectionItem"><span>F10.7 Flux</span><span>{spaceWeather.f107?.current || "N/A"} sfu</span></div>
                          <div className="dinosatSatelliteHUDSectionItem"><span>Solar Wind</span><span>{spaceWeather.solarWind?.speed || "N/A"} km/s</span></div>
                          <div className="dinosatSatelliteHUDSectionItem"><span>X-Ray Class</span><span>{spaceWeather.xray?.classification || "N/A"}</span></div>
                          <div className="dinosatSatelliteHUDSectionItem"><span>Active Alerts</span><span style={{ color: spaceWeather.alerts?.length > 0 ? "#fb923c" : "#4ade80" }}>{spaceWeather.alerts?.length || 0}</span></div>
                          <div className="dinosatSatelliteHUDSectionItem"><span>Status</span><span style={{ color: spaceWeather.overall.color }}>{spaceWeather.overall.status}</span></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {detailedSatellite && enrichedDetailedSatellite && (
            <div ref={detailedPanelRef} className="dinoSatSatelliteDetailedPanel" tabIndex={0}>
              <div className="dinoSatSatelliteHUDPanelHeader">
                <span>
                  Satellite Details: {enrichedDetailedSatellite.name}
                  <small style={{ marginLeft: "12px", color: tleAgeColor(enrichedDetailedSatellite.tleAgeDays) }}>
                    TLE: {tleAgeLabel(enrichedDetailedSatellite.tleAgeDays)}
                  </small>
                </span>
                <button className="dinoSatSatelliteCloseButton" onClick={() => setDetailedSatellite(null)}><FontAwesomeIcon icon={faXmark} /></button>
              </div>

              <div className="dinoSatDossierTabs">
                <div className="dinoSatDossierTabsScroll">
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
                      className={`dinoSatDossierTab ${activeDossierTab === tab.key ? "dinoSatDossierTabActive" : ""}`}
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

              <div className="dinoSatSatelliteHUDContent dinoSatDossierBody">
                {activeDossierTab === "orbital" && renderOrbitalDossierContent()}

                {activeDossierTab === "intel" && (
                  <MissionIntelligenceTab satellite={enrichedDetailedSatellite} intelligence={currentMissionIntel} loading={missionIntelLoading && !currentMissionIntel} onRefresh={() => fetchMissionIntelligenceFor(enrichedDetailedSatellite, true)} />
                )}

                {activeDossierTab === "observations" && (
                  <ObservationsTab satellite={enrichedDetailedSatellite} observation={currentObservation} loading={observationLoading && !currentObservation} onRefresh={() => fetchObservationDataFor(enrichedDetailedSatellite, true)} />
                )}

                {activeDossierTab === "passes" && (
                  <PassPredictionsTab satellite={enrichedDetailedSatellite} satrec={detailedSatrec} observerLocation={observerLocation} onLocationChange={setObserverLocation} onRequestGeolocation={requestGeolocation} />
                )}

                {activeDossierTab === "tle" && (
                  <TleHistoryTab satellite={enrichedDetailedSatellite} />
                )}

                {activeDossierTab === "track" && (
                  <div className="dinoSatDossierTabContent">
                    <div className="dinoSatPanelCard">
                      <div className="dinoSatPanelCardHeader"><span>Ground Track (Equirectangular)</span></div>
                      <div className="dinoSatPanelCardBody dinoSatGroundTrackTabBody">
                        <GroundTrackView satellite={enrichedDetailedSatellite} satrec={detailedSatrec} currentDate={new Date(simulationDateMsRef.current)} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}