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
  faFlask, faPersonChalkboard, faBookOpen, faMicroscope, faLayerGroup,
  faMeteor, faSnowflake, faSmog
} from "@fortawesome/free-solid-svg-icons";
import DinoLabsNav from "../../../helpers/Nav.jsx";
import "../../../styles/helperStyles/Switch.css";
import "../../../styles/mainStyles/DinoSat/DinoSatTrackers/Satellites/SatelliteTracker.css";

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
  MAX_VISIBLE_COMETS: 4000,
  UPDATE_FREQUENCY: 2,
  FRUSTUM_MARGIN: 1.5,
  PRESELECT_COUNT: 80,
  VIRTUAL_SCROLL_ITEM_HEIGHT: 44,
  VIRTUAL_SCROLL_BUFFER: 10,
  TRAIL_LENGTH: 40,
  CLOSE_APPROACH_THRESHOLD_AU: 0.1,
  CLOSE_APPROACH_CHECK_INTERVAL_MS: 5000,
  STREAM_CONNECTION_TIMEOUT_MS: 30000,
  SEARCH_DEBOUNCE_MS: 200
};

const CATEGORY_COLORS = {
  "Jupiter-Family": "#00D4FF",
  "Halley-Type": "#AB47BC",
  "Encke-Type": "#FF9500",
  "Chiron-Type": "#FFA726",
  "Long-Period": "#42A5F5",
  "Near-Parabolic": "#9C27B0",
  "Hyperbolic": "#E91E63",
  "Interstellar": "#FF4081",
  "Sungrazer": "#FFD060",
  "Main-Belt Comet": "#4ECDC4",
  "Centaur Comet": "#A8E6CF",
  "Defunct": "#5a5a6a",
  "Disintegrated": "#704020",
  "Unclassified": "#808080"
};

const ACTIVITY_COLORS = {
  "Active": "#4ade80",
  "Dormant": "#facc15",
  "Disintegrated": "#ef4444",
  "Lost": "#5a5a6a",
  "Recovered": "#42a5f5",
  "Unknown": "#808080"
};

const SPEED_OPTIONS = [
  { label: "-100 days/sec", value: -8640000 },
  { label: "-30 days/sec", value: -2592000 },
  { label: "-1 day/sec", value: -86400 },
  { label: "Real-time", value: 1 },
  { label: "1 day/sec", value: 86400 },
  { label: "30 days/sec", value: 2592000 },
  { label: "100 days/sec", value: 8640000 }
];

const FPS_OPTIONS = [30, 60, 120, 144];

const dateToJulianDate = (date) => date.getTime() / 86400000.0 + 2440587.5;

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
  if (ageDays > 3650) return "#4ade80";
  if (ageDays > 730) return "#84cc16";
  if (ageDays > 180) return "#facc15";
  if (ageDays > 30) return "#fb923c";
  return "#ef4444";
};

const orbitArcAgeLabel = (ageDays) => {
  if (ageDays === null || ageDays === undefined) return "Unknown";
  if (ageDays > 3650) return "Multi-decade arc";
  if (ageDays > 730) return "Multi-year arc";
  if (ageDays > 180) return "Year-class arc";
  if (ageDays > 30) return "Short arc";
  return "Very short arc";
};

const moidColor = (moidAU) => {
  if (moidAU === null || moidAU === undefined) return "#808080";
  if (moidAU < 0.005) return "#ef4444";
  if (moidAU < 0.05) return "#fb923c";
  if (moidAU < 0.2) return "#facc15";
  if (moidAU < 0.5) return "#84cc16";
  return "#4ade80";
};

const moidLabel = (moidAU) => {
  if (moidAU === null || moidAU === undefined) return "Unknown";
  if (moidAU < 0.005) return "Critical (<0.005 AU)";
  if (moidAU < 0.05) return "Very close (<0.05 AU)";
  if (moidAU < 0.2) return "Close (<0.2 AU)";
  if (moidAU < 0.5) return "Moderate (<0.5 AU)";
  return "Distant";
};

const activityColor = (status) => {
  return ACTIVITY_COLORS[status] || ACTIVITY_COLORS["Unknown"];
};

const tisserandFamilyLabel = (tj) => {
  if (tj === null || tj === undefined) return "Unknown";
  if (tj < 2) return "Halley-type / Long-period";
  if (tj < 3) return "Jupiter-family";
  return "Asteroid-like";
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

const solveBarker = (M) => {
  const W = 1.5 * M;
  const Y = Math.cbrt(W + Math.sqrt(W * W + 1));
  return Y - 1.0 / Y;
};

const propagateComet = (comet, date) => {
  if (!comet || !comet.elements) return null;
  const el = comet.elements;
  const e = el.e;
  const i = el.i * ORBITAL_CONSTANTS.DEG_TO_RAD;
  const omega = el.om * ORBITAL_CONSTANTS.DEG_TO_RAD;
  const w = el.w * ORBITAL_CONSTANTS.DEG_TO_RAD;
  const epochJD = el.epoch;

  if (!Number.isFinite(e) || !Number.isFinite(epochJD)) return null;
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

  const NEAR_PARABOLIC_TOL = 1e-4;

  if (Math.abs(e - 1.0) < NEAR_PARABOLIC_TOL) {
    const q = Number.isFinite(el.q) ? el.q : (Number.isFinite(el.a) ? el.a * (1 - e) : null);
    if (q === null || q <= 0) return null;
    const tpJD = Number.isFinite(el.tp) ? el.tp : epochJD;
    const dtp = (targetJD - tpJD) * 86400.0;
    const M = Math.sqrt(SUN_GM / (2 * Math.pow(q * AU_KM, 3))) * dtp;
    const D = solveBarker(M);
    if (!Number.isFinite(D)) return null;
    xOrbital = q * (1 - D * D);
    yOrbital = 2 * q * D;
  } else if (e < 1) {
    const a = Number.isFinite(el.a) ? el.a : (Number.isFinite(el.q) ? el.q / (1 - e) : null);
    if (a === null || a <= 0) return null;
    const n = Math.sqrt(SUN_GM / Math.pow(a * AU_KM, 3));
    let M;
    if (Number.isFinite(el.tp)) {
      const dtp = (targetJD - el.tp) * 86400.0;
      M = n * dtp;
    } else if (Number.isFinite(el.ma)) {
      const M0 = el.ma * ORBITAL_CONSTANTS.DEG_TO_RAD;
      M = M0 + n * dt;
    } else {
      M = n * dt;
    }
    const E = solveKepler(M, e);
    const cosE = Math.cos(E);
    const sinE = Math.sin(E);
    xOrbital = a * (cosE - e);
    yOrbital = a * Math.sqrt(1 - e * e) * sinE;
  } else {
    const q = Number.isFinite(el.q) ? el.q : (Number.isFinite(el.a) ? Math.abs(el.a) * (e - 1) : null);
    if (q === null || q <= 0) return null;
    const absA = q / (e - 1);
    if (absA <= 0) return null;
    const n = Math.sqrt(SUN_GM / Math.pow(absA * AU_KM, 3));
    let M;
    if (Number.isFinite(el.tp)) {
      const dtp = (targetJD - el.tp) * 86400.0;
      M = n * dtp;
    } else if (Number.isFinite(el.ma)) {
      const M0 = el.ma * ORBITAL_CONSTANTS.DEG_TO_RAD;
      M = M0 + n * dt;
    } else {
      M = n * dt;
    }
    const F = solveHyperbolicKepler(M, e);
    if (!Number.isFinite(F)) return null;
    xOrbital = absA * (e - Math.cosh(F));
    yOrbital = absA * Math.sqrt(e * e - 1) * Math.sinh(F);
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

const apparentMagnitude = (m1, k1, rH, delta) => {
  if (!Number.isFinite(m1) || !Number.isFinite(rH) || !Number.isFinite(delta) || rH <= 0 || delta <= 0) return null;
  const k = Number.isFinite(k1) ? k1 : 10;
  return m1 + 5 * Math.log10(delta) + k * Math.log10(rH);
};

const activityProxy = (rH) => {
  if (!Number.isFinite(rH) || rH <= 0) return 0;
  return 1.0 / Math.pow(rH, 2.5);
};

const enrichComet = (s) => {
  if (!s || !s.elements) return s;
  try {
    const el = s.elements;
    const e = el.e;
    const q = Number.isFinite(el.q) ? el.q : (Number.isFinite(el.a) ? el.a * (1 - e) : null);
    const isBound = e < 1;
    const a = isBound ? (Number.isFinite(el.a) ? el.a : (q !== null ? q / (1 - e) : null)) : null;
    const aphelion = isBound && a !== null ? a * (1 + e) : null;
    const period = isBound && a !== null && a > 0 ? Math.sqrt(Math.pow(a, 3)) : null;
    const periodDays = period !== null ? period * 365.25 : null;
    const meanMotion = period !== null && period > 0 ? 360.0 / periodDays : null;
    const velocityAtPerihelion = q !== null && q > 0
      ? Math.sqrt(SUN_GM * (1 + e) / (q * AU_KM))
      : null;
    const velocityAtAphelion = aphelion !== null && aphelion > 0
      ? Math.sqrt(SUN_GM * (2 / (aphelion * AU_KM) - 1 / (a * AU_KM)))
      : null;
    const meanVelocity = isBound && a !== null && a > 0 ? Math.sqrt(SUN_GM / (a * AU_KM)) : null;
    const specificEnergy = isBound && a !== null && a > 0 ? -SUN_GM / (2 * a * AU_KM) : (q !== null && q > 0 ? SUN_GM * (e - 1) / (2 * q * AU_KM) : null);
    const angularMomentum = q !== null && q > 0 ? Math.sqrt(SUN_GM * q * AU_KM * (1 + e)) : null;
    return {
      ...s,
      semiMajorAxisAU: a !== null ? Math.round(a * 100000) / 100000 : null,
      eccentricity: Math.round(e * 1000000) / 1000000,
      inclination: Math.round((el.i || 0) * 100) / 100,
      raan: Math.round((el.om || 0) * 100) / 100,
      argOfPerihelion: Math.round((el.w || 0) * 100) / 100,
      meanAnomaly: Number.isFinite(el.ma) ? Math.round(el.ma * 100) / 100 : null,
      perihelionTime: Number.isFinite(el.tp) ? el.tp : null,
      orbitalPeriodYears: period !== null ? Math.round(period * 1000) / 1000 : null,
      orbitalPeriodDays: periodDays !== null ? Math.round(periodDays * 100) / 100 : null,
      perihelionAU: q !== null ? Math.round(q * 100000) / 100000 : null,
      aphelionAU: aphelion !== null ? Math.round(aphelion * 100000) / 100000 : null,
      perihelionKm: q !== null ? Math.round(q * AU_KM) : null,
      aphelionKm: aphelion !== null ? Math.round(aphelion * AU_KM) : null,
      meanMotion: meanMotion !== null ? Math.round(meanMotion * 1000000) / 1000000 : null,
      velocityAtPerihelion: velocityAtPerihelion !== null ? Math.round(velocityAtPerihelion * 1000) / 1000 : null,
      velocityAtAphelion: velocityAtAphelion !== null ? Math.round(velocityAtAphelion * 1000) / 1000 : null,
      meanVelocity: meanVelocity !== null ? Math.round(meanVelocity * 1000) / 1000 : null,
      specificEnergy: specificEnergy !== null ? Math.round(specificEnergy * 1000) / 1000 : null,
      angularMomentum: angularMomentum !== null ? Math.round(angularMomentum * 100) / 100 : null,
      isBound: isBound
    };
  } catch (error) {
    return s;
  }
};

const computeAdvancedDerivatives = (sat) => {
  if (!sat || !sat.elements) return {};
  const a = sat.semiMajorAxisAU;
  const e = sat.eccentricity || 0;
  const i = (sat.inclination || 0) * Math.PI / 180;
  const tisserandJupiter = a !== null && a > 0
    ? (5.2 / a) + 2 * Math.cos(i) * Math.sqrt((a / 5.2) * (1 - e * e))
    : null;
  const earthMOID = sat.moidAU !== undefined ? sat.moidAU : null;
  const jupiterMOID = sat.jupiterMOIDAU !== undefined ? sat.jupiterMOIDAU : null;
  const b = a !== null && a > 0 ? a * Math.sqrt(1 - e * e) : null;
  const orbitCircumference = a !== null && b !== null ? Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b))) : null;
  const heliocentricLongPerihelion = ((sat.raan || 0) + (sat.argOfPerihelion || 0)) % 360;
  const isEarthCrosser = sat.perihelionAU !== null && sat.perihelionAU < 1.017 && (sat.aphelionAU === null || sat.aphelionAU > 0.983);
  const earthCrossing = isEarthCrosser;
  const marsCrossing = sat.perihelionAU !== null && sat.perihelionAU < 1.666 && (sat.aphelionAU === null || sat.aphelionAU > 1.381);
  const jupiterCrossing = sat.perihelionAU !== null && sat.perihelionAU < 5.46 && (sat.aphelionAU === null || sat.aphelionAU > 4.95);
  const isSungrazer = sat.perihelionAU !== null && sat.perihelionAU < 0.01;
  const isInterstellar = e > 1.05;
  return {
    tisserandJupiter: tisserandJupiter !== null ? Math.round(tisserandJupiter * 1000) / 1000 : null,
    earthMOIDAU: earthMOID,
    jupiterMOIDAU: jupiterMOID,
    orbitCircumferenceAU: orbitCircumference !== null ? Math.round(orbitCircumference * 1000) / 1000 : null,
    heliocentricLongPerihelion: Math.round(heliocentricLongPerihelion * 100) / 100,
    earthCrossing,
    marsCrossing,
    jupiterCrossing,
    isSungrazer,
    isInterstellar
  };
};

const detectCloseApproaches = (comets, cometData, thresholdAU, currentDate) => {
  const approaches = [];
  if (!currentDate) return [];
  const moidPrefilter = Math.max(3.0, thresholdAU * 30);

  const WINDOW_DAYS = 365;
  const SAMPLE_COUNT = 60;
  const stepMs = (WINDOW_DAYS * 86400000) / SAMPLE_COUNT;
  const startMs = currentDate.getTime();

  const sampleTimes = [];
  for (let s = 0; s <= SAMPLE_COUNT; s++) {
    sampleTimes.push(new Date(startMs + s * stepMs));
  }
  const earthSamples = sampleTimes.map(t => propagateEarth(t));

  for (let i = 0; i < comets.length; i++) {
    const sat = comets[i];
    if (!sat.elements) continue;
    if (sat.moidAU !== null && sat.moidAU !== undefined && sat.moidAU > moidPrefilter) continue;

    let bestDistAU = Infinity;
    let bestPos = null;
    let bestEarthPos = null;
    let bestTime = null;

    for (let s = 0; s <= SAMPLE_COUNT; s++) {
      const t = sampleTimes[s];
      const earthPos = earthSamples[s];
      if (!earthPos) continue;
      const cometPos = propagateComet(sat, t);
      if (!cometPos) continue;
      if (!Number.isFinite(cometPos.x) || !Number.isFinite(cometPos.y) || !Number.isFinite(cometPos.z)) continue;
      const sceneDist = cometPos.distanceTo(earthPos);
      const distAU = sceneDist / ORBITAL_CONSTANTS.SCALE_FACTOR;
      if (distAU < bestDistAU) {
        bestDistAU = distAU;
        bestPos = cometPos;
        bestEarthPos = earthPos;
        bestTime = t;
      }
    }

    if (bestDistAU < thresholdAU && bestPos && bestEarthPos) {
      approaches.push({
        comet: sat,
        distanceAU: Math.round(bestDistAU * 1000000) / 1000000,
        distanceKm: Math.round(bestDistAU * AU_KM),
        distanceLD: Math.round((bestDistAU * AU_KM / 384400) * 1000) / 1000,
        severity: bestDistAU < 0.005 ? "Critical" : bestDistAU < 0.05 ? "High" : bestDistAU < 0.1 ? "Moderate" : "Low",
        relativeBearingDeg: Math.round(Math.atan2(bestPos.z - bestEarthPos.z, bestPos.x - bestEarthPos.x) * 180 / Math.PI),
        approachTime: bestTime ? bestTime.toISOString() : null
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
    { name: "Inner System (Sungrazer perihelia)", innerRadius: 0.005 * scaleFactor, outerRadius: 0.39 * scaleFactor, color: 0xFFD060 },
    { name: "Inner Planets (Mercury-Mars)", innerRadius: 0.39 * scaleFactor, outerRadius: 1.66 * scaleFactor, color: 0xFF9500 },
    { name: "Jupiter-Family Region", innerRadius: 2.0 * scaleFactor, outerRadius: 5.5 * scaleFactor, color: 0x00D4FF },
    { name: "Halley-Type / Long-Period", innerRadius: 5.5 * scaleFactor, outerRadius: 30 * scaleFactor, color: 0xAB47BC }
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
      <div className="dinoSatChartEmpty">
        <small>No data available</small>
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

const CometWatchStrip = ({ data, loading, expanded, onToggle }) => {
  if (loading && !data) {
    return (
      <div className="dinoSatSpaceWeatherStrip dinoSatSpaceWeatherLoading">
        <FontAwesomeIcon icon={faSpinner} spin /> <span>Loading comet apparition feed...</span>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="dinoSatSpaceWeatherStrip dinoSatSpaceWeatherUnavailable">
        <FontAwesomeIcon icon={faTriangleExclamation} /> <span>Comet apparition data unavailable</span>
      </div>
    );
  }

  const overall = data.overall || { status: "Quiet", color: "#4ade80", severity: 0 };
  const upcomingPerihelia = data.upcomingPerihelia;
  const next30 = data.next30Days;
  const next365 = data.next365Days;
  const activeCount = data.activeCount;
  const brightApparitions = data.brightApparitions;
  const closestUpcoming = data.closestUpcoming;
  const recentDiscoveries = data.recentDiscoveriesCount;

  return (
    <div className="dinoSatSpaceWeatherStrip">
      <div className="dinoSatSpaceWeatherStripCells">
        <div className="dinoSatSpaceWeatherCell" style={{ borderLeftColor: overall.color }}>
          <div className="dinoSatSpaceWeatherCellLabel">Status</div>
          <div className="dinoSatSpaceWeatherCellValue" style={{ color: overall.color }}>{overall.status}</div>
        </div>

        {upcomingPerihelia !== undefined && (
          <div className="dinoSatSpaceWeatherCell" style={{ borderLeftColor: upcomingPerihelia > 5 ? "#fb923c" : "#4ade80" }}>
            <div className="dinoSatSpaceWeatherCellLabel">Upcoming Perihelia</div>
            <div className="dinoSatSpaceWeatherCellValue">{upcomingPerihelia}<span>next 90 days</span></div>
          </div>
        )}

        {next30 !== undefined && (
          <div className="dinoSatSpaceWeatherCell" style={{ borderLeftColor: "#42a5f5" }}>
            <div className="dinoSatSpaceWeatherCellLabel">Next 30 Days</div>
            <div className="dinoSatSpaceWeatherCellValue">{next30}<span>close approaches</span></div>
          </div>
        )}

        {next365 !== undefined && (
          <div className="dinoSatSpaceWeatherCell" style={{ borderLeftColor: "#9c27b0" }}>
            <div className="dinoSatSpaceWeatherCellLabel">Next 365 Days</div>
            <div className="dinoSatSpaceWeatherCellValue">{next365}<span>annual passes</span></div>
          </div>
        )}

        {activeCount !== undefined && (
          <div className="dinoSatSpaceWeatherCell" style={{ borderLeftColor: "#4ade80" }}>
            <div className="dinoSatSpaceWeatherCellLabel">Active Comets</div>
            <div className="dinoSatSpaceWeatherCellValue">{activeCount}<span>currently observable</span></div>
          </div>
        )}

        {brightApparitions !== undefined && (
          <div className="dinoSatSpaceWeatherCell" style={{ borderLeftColor: brightApparitions > 0 ? "#fb923c" : "#4ade80" }}>
            <div className="dinoSatSpaceWeatherCellLabel">Bright Apparitions</div>
            <div className="dinoSatSpaceWeatherCellValue">{brightApparitions}<span>m &lt; 10 forecast</span></div>
          </div>
        )}

        {closestUpcoming && (
          <div className="dinoSatSpaceWeatherCell" style={{ borderLeftColor: moidColor(closestUpcoming.distAU) }}>
            <div className="dinoSatSpaceWeatherCellLabel">Closest Upcoming</div>
            <div className="dinoSatSpaceWeatherCellValue">{closestUpcoming.distLD?.toFixed(1)}<span>LD · {closestUpcoming.name}</span></div>
          </div>
        )}

        {recentDiscoveries !== undefined && (
          <div className="dinoSatSpaceWeatherCell">
            <div className="dinoSatSpaceWeatherCellLabel">New Discoveries</div>
            <div className="dinoSatSpaceWeatherCellValue">{recentDiscoveries}<span>past 30 days</span></div>
          </div>
        )}
      </div>

      <button
        className="dinoSatSpaceWeatherToggle"
        onClick={onToggle}
        title={expanded ? "Hide briefing" : "Show full briefing"}
      >
        {expanded ? "Hide Briefing" : "Show Briefing"}
        <FontAwesomeIcon icon={expanded ? faChevronUp : faChevronDown} />
      </button>
    </div>
  );
};

const CometWatchDetail = ({ data, onClose, onRequestAIAnalysis, aiAnalysis, aiLoading, onSelect }) => {
  const [activeSection, setActiveSection] = useState("overview");
  if (!data) return null;

  const sections = [
    { key: "overview", label: "Overview", icon: faGauge },
    { key: "upcoming", label: "Upcoming Perihelia", icon: faClock },
    { key: "approaches", label: "Close Approaches", icon: faTriangleExclamation },
    { key: "discoveries", label: "Recent Discoveries", icon: faMeteor },
    { key: "operational", label: "Risk Matrix", icon: faShieldHalved },
    { key: "ai", label: "AI Analysis", icon: faBrain }
  ];

  const renderOverview = () => (
    <div className="dinoSatDossierTabContent">
      <div className="dinoSatStatTileGrid">
        <StatTile label="Overall Status" value={data.overall?.status || "Quiet"} sub={`Severity ${data.overall?.severity || 0}/6`} color={data.overall?.color} accent={data.overall?.color} large />
        <StatTile label="Upcoming Perihelia" value={data.upcomingPerihelia || 0} sub="Next 90 days" accent="#42a5f5" />
        <StatTile label="Next 30 Days" value={data.next30Days || 0} sub="Close approaches" accent="#42a5f5" />
        <StatTile label="Next 365 Days" value={data.next365Days || 0} sub="Annual passes" accent="#9c27b0" />
        <StatTile label="Active Comets" value={data.activeCount || 0} sub="Currently observable" color="#4ade80" accent="#4ade80" />
        <StatTile label="Bright Apparitions" value={data.brightApparitions || 0} sub="m < 10 forecast" color={(data.brightApparitions || 0) > 0 ? "#fb923c" : "#4ade80"} accent="#fb923c" />
        <StatTile label="Recent Discoveries" value={data.recentDiscoveriesCount || 0} sub="Past 30 days" accent="#42a5f5" />
        {data.closestUpcoming && (
          <StatTile label="Closest Upcoming" value={data.closestUpcoming.distLD?.toFixed(2)} unit="LD" sub={data.closestUpcoming.name} color={moidColor(data.closestUpcoming.distAU)} accent={moidColor(data.closestUpcoming.distAU)} />
        )}
      </div>

      {data.upcomingPerihelionList && data.upcomingPerihelionList.length > 0 && (
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faSnowflake} /> Imminent Perihelion Passages</span></div>
          <div className="dinoSatPanelCardBody">
            <div className="dinoSatTableScroll">
              <table className="dinoSatDataTable">
                <thead><tr><th>Perihelion Date</th><th>Comet</th><th>Class</th><th>q (AU)</th><th>e</th><th>Forecast Mag</th></tr></thead>
                <tbody>
                  {data.upcomingPerihelionList.slice(0, 10).map((p, i) => (
                    <tr key={i}>
                      <td>{p.tpDate}</td>
                      <td><b>{p.name}</b></td>
                      <td>{p.category}</td>
                      <td>{p.q?.toFixed(4)}</td>
                      <td>{p.e?.toFixed(4)}</td>
                      <td>{p.peakMag !== null ? p.peakMag.toFixed(1) : "—"}</td>
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

  const renderUpcoming = () => (
    <div className="dinoSatDossierTabContent">
      <div className="dinoSatPanelCard">
        <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faSnowflake} /> All Upcoming Perihelion Passages</span></div>
        <div className="dinoSatPanelCardBody">
          {!data.upcomingPerihelionList || data.upcomingPerihelionList.length === 0 ? (
            <div className="dinoSatPanelEmpty">No upcoming perihelia in the configured window.</div>
          ) : (
            <div className="dinoSatTableScroll">
              <table className="dinoSatDataTable">
                <thead><tr><th>Date (UTC)</th><th>Comet</th><th>Class</th><th>q (AU)</th><th>e</th><th>i (°)</th><th>M1</th><th>Peak Mag</th><th>Activity</th></tr></thead>
                <tbody>
                  {data.upcomingPerihelionList.map((p, i) => (
                    <tr key={i}>
                      <td>{p.tpDate}</td>
                      <td><b>{p.name}</b></td>
                      <td>{p.category}</td>
                      <td>{p.q?.toFixed(4)}</td>
                      <td>{p.e?.toFixed(4)}</td>
                      <td>{p.i?.toFixed(2)}</td>
                      <td>{p.m1 !== null ? p.m1.toFixed(1) : "—"}</td>
                      <td>{p.peakMag !== null ? p.peakMag.toFixed(1) : "—"}</td>
                      <td><span style={{ color: activityColor(p.activityStatus) }}>{p.activityStatus}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderApproaches = () => (
    <div className="dinoSatDossierTabContent">
      <div className="dinoSatPanelCard">
        <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faTriangleExclamation} /> Comet Close Approaches</span></div>
        <div className="dinoSatPanelCardBody">
          {!data.upcomingPasses || data.upcomingPasses.length === 0 ? (
            <div className="dinoSatPanelEmpty">No comet close approaches in the window.</div>
          ) : (
            <div className="dinoSatTableScroll">
              <table className="dinoSatDataTable">
                <thead><tr><th>Severity</th><th>Date (UTC)</th><th>Comet</th><th>LD</th><th>AU</th><th>km</th><th>v_rel km/s</th></tr></thead>
                <tbody>
                  {data.upcomingPasses.map((p, i) => (
                    <tr key={i}>
                      <td><span className="dinoSatConjunctionSeverity" style={{ background: moidColor(p.distAU) + "33", color: moidColor(p.distAU) }}>{moidLabel(p.distAU)}</span></td>
                      <td>{p.cdDate}</td>
                      <td><b>{p.name}</b></td>
                      <td>{p.distLD?.toFixed(3)}</td>
                      <td>{p.distAU?.toFixed(6)}</td>
                      <td>{p.distKm?.toLocaleString()}</td>
                      <td>{p.vRel?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <div className="dinoSatPanelCard">
        <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faBookOpen} /> Comet Approach Considerations</span></div>
        <div className="dinoSatPanelCardBody">
          <div className="dinoSatBriefingGrid">
            <div className="dinoSatBriefingItem"><b>Non-Gravitational Forces</b><p>Comet ephemeris uncertainty grows rapidly as outgassing-induced acceleration is poorly constrained until perihelion observations are reduced. A nominal close approach may shift by tens of thousands of km from initial predictions.</p></div>
            <div className="dinoSatBriefingItem"><b>Hazard Framing</b><p>Comets are not classified under the PHA system because their long observation arcs and unstable trajectories make the standard MOID + H test poorly suited. CNEOS Sentry tracks select cometary objects on a case-by-case basis.</p></div>
            <div className="dinoSatBriefingItem"><b>Apparition Geometry</b><p>Earth approach during a comet apparition is governed by the orbit's heliocentric geometry. Earth-crossing comets (q &lt; 1.017 AU) with low MOID create the brightest naked-eye displays.</p></div>
            <div className="dinoSatBriefingItem"><b>Update Rate</b><p>Refreshed every {Math.round(PERFORMANCE_CONSTANTS.CLOSE_APPROACH_CHECK_INTERVAL_MS / 1000)} seconds against propagated comet positions, capturing transient close passes during the simulated time window.</p></div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDiscoveries = () => (
    <div className="dinoSatDossierTabContent">
      <div className="dinoSatPanelCard">
        <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faMeteor} /> Recent Comet Discoveries</span></div>
        <div className="dinoSatPanelCardBody">
          {!data.recentDiscoveries || data.recentDiscoveries.length === 0 ? (
            <div className="dinoSatPanelEmpty">No recent discovery data available.</div>
          ) : (
            <div className="dinoSatTableScroll">
              <table className="dinoSatDataTable">
                <thead><tr><th>Designation</th><th>Discovery</th><th>Class</th><th>q (AU)</th><th>e</th><th>i (°)</th><th>M1</th></tr></thead>
                <tbody>
                  {data.recentDiscoveries.map((d, i) => (
                    <tr key={i}>
                      <td><b>{d.designation}</b></td>
                      <td>{d.discoveryDate}</td>
                      <td>{d.class}</td>
                      <td>{d.q?.toFixed(4)}</td>
                      <td>{d.e?.toFixed(4)}</td>
                      <td>{d.i?.toFixed(2)}</td>
                      <td>{d.m1 !== null && d.m1 !== undefined ? d.m1.toFixed(1) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderOperational = () => (
    <div className="dinoSatDossierTabContent">
      <div className="dinoSatPanelCard">
        <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faShieldHalved} /> Comet Hazard Domain Risk Matrix</span></div>
        <div className="dinoSatPanelCardBody">
          <div className="dinoSatRiskMatrix">
            <div className="dinoSatRiskMatrixRow dinoSatRiskMatrixHeader">
              <div>Domain</div><div>Imminent Perihelion</div><div>Bright Apparition</div><div>Earth Crossers</div><div>Mission Δv</div><div>Survey Gap</div>
            </div>
            <div className="dinoSatRiskMatrixRow">
              <div>Planetary Defense</div>
              <div className={`dinoSatRiskCell ${(data.upcomingPerihelia || 0) > 10 ? "dinoSatRiskHigh" : (data.upcomingPerihelia || 0) > 3 ? "dinoSatRiskMod" : "dinoSatRiskLow"}`}>{(data.upcomingPerihelia || 0) > 10 ? "HIGH" : (data.upcomingPerihelia || 0) > 3 ? "MOD" : "LOW"}</div>
              <div className={`dinoSatRiskCell ${(data.brightApparitions || 0) > 0 ? "dinoSatRiskMod" : "dinoSatRiskLow"}`}>{(data.brightApparitions || 0) > 0 ? "MOD" : "LOW"}</div>
              <div className={`dinoSatRiskCell ${(data.earthCrossingCount || 0) > 50 ? "dinoSatRiskHigh" : "dinoSatRiskMod"}`}>{(data.earthCrossingCount || 0) > 50 ? "HIGH" : "MOD"}</div>
              <div className="dinoSatRiskCell dinoSatRiskLow">N/A</div>
              <div className="dinoSatRiskCell dinoSatRiskHigh">HIGH</div>
            </div>
                        <div className="dinoSatRiskMatrixRow">
              <div>Mission Targets</div>
              <div className="dinoSatRiskCell dinoSatRiskLow">LOW</div>
              <div className="dinoSatRiskCell dinoSatRiskMod">MOD</div>
              <div className="dinoSatRiskCell dinoSatRiskLow">LOW</div>
              <div className="dinoSatRiskCell dinoSatRiskHigh">HIGH</div>
              <div className="dinoSatRiskCell dinoSatRiskMod">MOD</div>
            </div>
            <div className="dinoSatRiskMatrixRow">
              <div>Astronomy / Observation</div>
              <div className="dinoSatRiskCell dinoSatRiskMod">MOD</div>
              <div className={`dinoSatRiskCell ${(data.brightApparitions || 0) > 0 ? "dinoSatRiskHigh" : "dinoSatRiskLow"}`}>{(data.brightApparitions || 0) > 0 ? "HIGH" : "LOW"}</div>
              <div className="dinoSatRiskCell dinoSatRiskLow">N/A</div>
              <div className="dinoSatRiskCell dinoSatRiskLow">N/A</div>
              <div className="dinoSatRiskCell dinoSatRiskMod">MOD</div>
            </div>
            <div className="dinoSatRiskMatrixRow">
              <div>Earth Observation</div>
              <div className="dinoSatRiskCell dinoSatRiskLow">LOW</div>
              <div className="dinoSatRiskCell dinoSatRiskLow">LOW</div>
              <div className="dinoSatRiskCell dinoSatRiskLow">LOW</div>
              <div className="dinoSatRiskCell dinoSatRiskLow">N/A</div>
              <div className="dinoSatRiskCell dinoSatRiskLow">LOW</div>
            </div>
            <div className="dinoSatRiskMatrixRow">
              <div>Scientific Survey</div>
              <div className="dinoSatRiskCell dinoSatRiskLow">N/A</div>
              <div className="dinoSatRiskCell dinoSatRiskMod">MOD</div>
              <div className="dinoSatRiskCell dinoSatRiskLow">N/A</div>
              <div className="dinoSatRiskCell dinoSatRiskLow">N/A</div>
              <div className="dinoSatRiskCell dinoSatRiskHigh">HIGH</div>
            </div>
          </div>
        </div>
      </div>
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
          <p>Querying multi-stage AI ensemble for comet operational analysis...</p>
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
              <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faGauge} /> Current Cometary Posture</span></div>
              <div className="dinoSatPanelCardBody"><p className="dinoSatMissionBriefText">{safeRenderText(aiAnalysis.report.currentConditions)}</p></div>
            </div>
          )}
          {aiAnalysis.report.forecast24h && (
            <div className="dinoSatPanelCard">
              <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faArrowTrendUp} /> Near-Term Forecast (30 days)</span></div>
              <div className="dinoSatPanelCardBody"><p className="dinoSatMissionBriefText">{safeRenderText(aiAnalysis.report.forecast24h)}</p></div>
            </div>
          )}
          {aiAnalysis.report.forecast72h && (
            <div className="dinoSatPanelCard">
              <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faArrowTrendUp} /> Long-Term Outlook (1 year)</span></div>
              <div className="dinoSatPanelCardBody"><p className="dinoSatMissionBriefText">{safeRenderText(aiAnalysis.report.forecast72h)}</p></div>
            </div>
          )}
          {aiAnalysis.report.satelliteImpacts && Array.isArray(aiAnalysis.report.satelliteImpacts) && (
            <div className="dinoSatPanelCard">
              <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faMeteor} /> Domain-Specific Impact Assessment</span></div>
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
              <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faList} /> Recommended Actions</span></div>
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
        <span>Comet Watch Operations Center · {new Date(data.timestamp).toLocaleString()}</span>
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
        {activeSection === "upcoming" && renderUpcoming()}
        {activeSection === "approaches" && renderApproaches()}
        {activeSection === "discoveries" && renderDiscoveries()}
        {activeSection === "operational" && renderOperational()}
        {activeSection === "ai" && renderAI()}
      </div>
    </div>
  );
};

const CloseApproachesPanel = ({ approaches, onSelect, onClose, comets }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("distance");
  const [activeTab, setActiveTab] = useState("watch");

  const filtered = useMemo(() => {
    let result = approaches;
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(c =>
        c.comet.name.toLowerCase().includes(lower) ||
        String(c.comet.designation || "").toLowerCase().includes(lower)
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
    <div className="dinoSatSpaceWeatherDetail">
      <div className="dinoSatSpaceWeatherDetailHeader">
        <span><FontAwesomeIcon icon={faTriangleExclamation} /> Comet Close Approaches · {approaches.length} active proximity events</span>
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
                    <input type="text" placeholder="Name or designation..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="dinoSatSatelliteSearchInput" />
                  </div>
                  <div className="dinoSatFilterField">
                    <label>Severity</label>
                    <select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)} className="dinoSatSatelliteFPSSelect">
                      <option value="all">All</option>
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="moderate">Moderate</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div className="dinoSatFilterField">
                    <label>Sort by</label>
                    <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="dinoSatSatelliteFPSSelect">
                      <option value="distance">Closest first</option>
                      <option value="severity">Most severe</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="dinoSatPanelCard">
              <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faTable} /> Active Proximity Events ({filtered.length})</span></div>
              <div className="dinoSatPanelCardBody">
                {filtered.length === 0 ? (
                  <div className="dinoSatPanelEmpty">No close approaches match the current filter.</div>
                ) : (
                  <div className="dinoSatTableScroll">
                    <table className="dinoSatDataTable">
                      <thead>
                        <tr><th>Severity</th><th>Approach Time</th><th>Distance (AU)</th><th>Distance (LD)</th><th>Distance (km)</th><th>Comet</th><th>Class</th><th>Bearing</th><th></th></tr>
                      </thead>
                      <tbody>
                        {filtered.map((c, i) => (
                          <tr key={i} className={`dinoSatConjunctionTableRow dinoSatConjunctionSev-${c.severity.toLowerCase()}`}>
                            <td><span className={`dinoSatConjunctionSeverity dinoSatConjunctionSev-${c.severity.toLowerCase()}`}>{c.severity}</span></td>
                            <td>{c.approachTime ? formatChartTime(c.approachTime) : "—"}</td>
                            <td><b>{c.distanceAU.toFixed(6)}</b></td>
                            <td>{c.distanceLD?.toFixed(2)}</td>
                            <td>{c.distanceKm.toLocaleString()}</td>
                            <td><button className="dinoSatTableButton" onClick={() => onSelect && onSelect(c.comet)}>{c.comet.name}<small>{c.comet.designation || "—"} · {c.comet.category}</small></button></td>
                            <td>{c.comet.category}</td>
                            <td>{c.relativeBearingDeg}°</td>
                            <td><button className="dinoSatSatelliteSelectButton" onClick={() => onSelect && onSelect(c.comet)}>Inspect</button></td>
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
              <StatTile label="Total Events" value={stats.total} sub="Catalog-wide near Earth" accent="#42a5f5" large />
              <StatTile label="Critical (<0.005 AU)" value={stats.critical} color="#ef4444" accent="#ef4444" sub="Sub-lunar distance" />
              <StatTile label="High (<0.05 AU)" value={stats.high} color="#fb923c" accent="#fb923c" />
              <StatTile label="Moderate (<0.1 AU)" value={stats.moderate} color="#facc15" accent="#facc15" />
              <StatTile label="Low (>0.1 AU)" value={stats.low} color="#84cc16" accent="#84cc16" />
              <StatTile label="Mean Distance" value={stats.avgDistance.toFixed(6)} unit="AU" accent="#42a5f5" />
              <StatTile label="Closest Comet" value={stats.minDistance.toFixed(6)} unit="AU" accent="#ef4444" color="#ef4444" />
            </div>
            <div className="dinoSatPanelCard">
              <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faBookOpen} /> Comet Close Approach Methodology</span></div>
              <div className="dinoSatPanelCardBody">
                <div className="dinoSatBriefingGrid">
                  <div className="dinoSatBriefingItem"><b>Detection</b><p>MOID pre-filter selects candidate comets whose orbital geometry permits a close approach below the threshold; Kepler/Barker propagation then evaluates positions for the current simulation epoch and tests against Earth's analytic position.</p></div>
                  <div className="dinoSatBriefingItem"><b>Severity (Comet-Adjusted)</b><p>Critical: &lt;0.005 AU. High: 0.005-0.05 AU. Moderate: 0.05-0.1 AU. Low: 0.1-threshold. Comet thresholds are looser than asteroid PHA criteria because non-gravitational forces dominate the long-term ephemeris error budget.</p></div>
                  <div className="dinoSatBriefingItem"><b>Limitations</b><p>This is a snapshot using two-body Kepler/Barker propagation. Real comet trajectories are perturbed by outgassing-induced acceleration (A1, A2, A3 parameters) which can shift predicted positions by tens of thousands of km, especially during active phases near perihelion.</p></div>
                  <div className="dinoSatBriefingItem"><b>Update Rate</b><p>Refreshed every {Math.round(PERFORMANCE_CONSTANTS.CLOSE_APPROACH_CHECK_INTERVAL_MS / 1000)} seconds against the most recent propagated positions of the candidate comet set.</p></div>
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
    const totalActive = entries.reduce((s, [, c]) => s + (c.activeCount || 0), 0);
    const totalEarthCrossing = entries.reduce((s, [, c]) => s + (c.earthCrossingCount || 0), 0);
    return {
      totalGroups: entries.length,
      totalTracked,
      totalKnown,
      totalActive,
      totalEarthCrossing,
      coveragePct: totalKnown > 0 ? Math.round((totalTracked / totalKnown) * 100) : 0
    };
  }, [data]);

  return (
    <div className="dinoSatSpaceWeatherDetail">
      <div className="dinoSatSpaceWeatherDetailHeader">
        <span><FontAwesomeIcon icon={faCircleNodes} /> Comet Population Census</span>
        <button className="dinoSatSatelliteCloseButton" onClick={onClose}><FontAwesomeIcon icon={faXmark} /></button>
      </div>
      <div className="dinoSatDossierTabs">
        <div className="dinoSatDossierTabsScroll">
          <button className={`dinoSatDossierTab ${activeTab === "groups" ? "dinoSatDossierTabActive" : ""}`} onClick={() => setActiveTab("groups")}><FontAwesomeIcon icon={faCircleNodes} /> Population Groups</button>
          <button className={`dinoSatDossierTab ${activeTab === "fleet" ? "dinoSatDossierTabActive" : ""}`} onClick={() => setActiveTab("fleet")}><FontAwesomeIcon icon={faNetworkWired} /> Aggregate</button>
          <button className={`dinoSatDossierTab ${activeTab === "compare" ? "dinoSatDossierTabActive" : ""}`} onClick={() => setActiveTab("compare")}><FontAwesomeIcon icon={faTable} /> Comparison Table</button>
        </div>
      </div>
      <div className="dinoSatDossierBody">
        {activeTab === "groups" && (
          <div className="dinoSatDossierTabContent">
            <div className="dinoSatPanelCard">
              <div className="dinoSatPanelCardHeader">
                <span><FontAwesomeIcon icon={faMagnifyingGlass} /> Search</span>
                <button className="dinoSatPassComputeButton" onClick={onRefresh}><FontAwesomeIcon icon={loading ? faSpinner : faSatellite} spin={loading} /> {loading ? "Loading" : "Refresh"}</button>
              </div>
              <div className="dinoSatPanelCardBody">
                <input type="text" placeholder="Search by name or description..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="dinoSatSatelliteSearchInput" />
              </div>
            </div>
            {!data || filteredEntries.length === 0 ? (
              <div className="dinoSatPanelEmpty">{loading ? "Loading population data..." : "No groups match the search."}</div>
            ) : (
              <div className="dinoSatConstellationGridDense">
                {filteredEntries.map(([group, c]) => (
                  <div key={group} className={`dinoSatConstellationCard dinoSatConstellationStatus-${(c.status || "unknown").toLowerCase()}`} onClick={() => setSelectedGroup(group)}>
                    <div className="dinoSatConstellationHeader">
                      <h5>{group}</h5>
                      <span className={`dinoSatConstellationStatusBadge dinoSatConstellationStatus-${(c.status || "unknown").toLowerCase()}`}>{c.status}</span>
                    </div>
                    <small>{c.description}</small>
                    <div className="dinoSatConstellationStats">
                      <div><span>Tracked</span><b>{c.tracked}</b></div>
                      <div><span>Est. Total</span><b>{c.estimatedTotal?.toLocaleString() || "?"}</b></div>
                      <div><span>Coverage</span><b>{c.coveragePct}%</b></div>
                      <div><span>Active</span><b>{c.activeCount}</b></div>
                      <div><span>Avg q</span><b>{c.averageQ} AU</b></div>
                      <div><span>Avg e</span><b>{c.averageE}</b></div>
                    </div>
                    <div className="dinoSatConstellationBar">
                      <div className="dinoSatConstellationBarFill" style={{ width: `${Math.min(100, c.coveragePct)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {selectedGroup && data && data[selectedGroup] && data[selectedGroup].ids && (
              <div className="dinoSatPanelCard">
                <div className="dinoSatPanelCardHeader">
                  <span><FontAwesomeIcon icon={faList} /> {selectedGroup} Members ({data[selectedGroup].ids.length})</span>
                  <button className="dinoSatSatelliteCloseButton" onClick={() => setSelectedGroup(null)}><FontAwesomeIcon icon={faXmark} /></button>
                </div>
                <div className="dinoSatPanelCardBody">
                  <div className="dinoSatTableScroll">
                    <table className="dinoSatDataTable">
                      <thead><tr><th>Designation</th><th>Name</th><th>q (AU)</th><th>e</th><th>i (°)</th><th>M1</th><th>Activity</th></tr></thead>
                      <tbody>
                        {data[selectedGroup].ids.map((m, i) => (
                          <tr key={i}>
                            <td>{m.designation}</td>
                            <td><button className="dinoSatTableButton" onClick={() => onSelect && onSelect(m)}>{m.name}</button></td>
                            <td>{m.q?.toFixed(4)}</td>
                            <td>{m.e?.toFixed(4)}</td>
                            <td>{m.i?.toFixed(2)}</td>
                            <td>{m.m1 !== null && m.m1 !== undefined ? m.m1.toFixed(1) : "—"}</td>
                            <td><span style={{ color: activityColor(m.activityStatus) }}>{m.activityStatus}</span></td>
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
              <StatTile label="Population Groups" value={aggregateStats.totalGroups} accent="#42a5f5" large />
              <StatTile label="Total Tracked" value={aggregateStats.totalTracked.toLocaleString()} sub={`of ~${aggregateStats.totalKnown.toLocaleString()} estimated`} accent="#4ade80" />
              <StatTile label="Catalog Coverage" value={`${aggregateStats.coveragePct}%`} color={aggregateStats.coveragePct > 50 ? "#4ade80" : aggregateStats.coveragePct > 20 ? "#fb923c" : "#ef4444"} accent={aggregateStats.coveragePct > 50 ? "#4ade80" : "#fb923c"} />
              <StatTile label="Active Comets" value={aggregateStats.totalActive.toLocaleString()} sub="Currently observable" color="#4ade80" accent="#4ade80" />
              <StatTile label="Earth-Crossing" value={aggregateStats.totalEarthCrossing.toLocaleString()} sub="q < 1.017 AU" color="#fb923c" accent="#fb923c" />
            </div>
            <div className="dinoSatPanelCard">
              <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faBookOpen} /> Comet Population Group Definitions</span></div>
              <div className="dinoSatPanelCardBody">
                <div className="dinoSatBriefingGrid">
                  <div className="dinoSatBriefingItem"><b>Jupiter-Family Comets (JFC)</b><p>Short-period comets with Tisserand parameter 2 &lt; T_J &lt; 3 and orbital periods under 20 years. Strongly perturbed by Jupiter, sourced primarily from the scattered disk and Kuiper Belt.</p></div>
                  <div className="dinoSatBriefingItem"><b>Halley-Type Comets (HTC)</b><p>Periodic comets with T_J &lt; 2 and periods between 20 and 200 years. Often retrograde or highly inclined, sourced from the inner Oort Cloud.</p></div>
                  <div className="dinoSatBriefingItem"><b>Encke-Type</b><p>Short-period comets dynamically decoupled from Jupiter (a &lt; 4 AU, aphelion inside Jupiter's orbit). Named after 2P/Encke.</p></div>
                  <div className="dinoSatBriefingItem"><b>Long-Period</b><p>Periods exceeding 200 years; sourced from the Oort Cloud. Often appear once historically; many become near-parabolic after a single passage.</p></div>
                  <div className="dinoSatBriefingItem"><b>Hyperbolic</b><p>e &gt; 1, unbound trajectories. Includes interstellar visitors (1I/'Oumuamua, 2I/Borisov) and dynamically excited Oort Cloud comets ejected by planetary perturbations.</p></div>
                  <div className="dinoSatBriefingItem"><b>Sungrazers</b><p>Perihelion below 0.01 AU (within 2 solar radii). Includes the Kreutz family and SOHO-discovered fragments. Most disintegrate at perihelion.</p></div>
                  <div className="dinoSatBriefingItem"><b>Centaur Comets</b><p>Active or transitional comets in the giant-planet region (a between 5.5 and 30 AU). Many are reservoirs feeding the Jupiter-family population.</p></div>
                  <div className="dinoSatBriefingItem"><b>Main-Belt Comets</b><p>Asteroidal orbits with cometary activity. Likely source of Earth's water; rare and scientifically valuable.</p></div>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === "compare" && data && (
          <div className="dinoSatDossierTabContent">
            <div className="dinoSatPanelCard">
              <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faTable} /> Population Comparison Matrix</span></div>
              <div className="dinoSatPanelCardBody">
                <div className="dinoSatTableScroll">
                  <table className="dinoSatDataTable">
                    <thead>
                      <tr><th>Group</th><th>Description</th><th>Status</th><th>Tracked</th><th>Est. Total</th><th>Coverage</th><th>Active</th><th>Earth-X</th><th>Avg q</th><th>Avg e</th></tr>
                    </thead>
                    <tbody>
                      {Object.entries(data).map(([group, c]) => (
                        <tr key={group} className={`dinoSatConstellationStatus-${(c.status || "unknown").toLowerCase()}`}>
                          <td><b>{group}</b></td>
                          <td>{c.description}</td>
                          <td><span className={`dinoSatConstellationStatusBadge dinoSatConstellationStatus-${(c.status || "unknown").toLowerCase()}`}>{c.status}</span></td>
                          <td>{c.tracked}</td>
                          <td>{c.estimatedTotal?.toLocaleString() || "?"}</td>
                          <td>{c.coveragePct}%</td>
                          <td style={{ color: "#4ade80" }}>{c.activeCount}</td>
                          <td style={{ color: "#fb923c" }}>{c.earthCrossingCount}</td>
                          <td>{c.averageQ} AU</td>
                          <td>{c.averageE}</td>
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

const SentryWatchPanel = ({ candidates, loading, onRefresh, onClose, onSelect, methodology }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [sortBy, setSortBy] = useState("perihelion");
  const [activeTab, setActiveTab] = useState("watch");

  const filtered = useMemo(() => {
    if (!candidates) return [];
    let result = candidates;
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(c =>
        (c.name || "").toLowerCase().includes(lower) ||
        (c.designation || "").toLowerCase().includes(lower)
      );
    }
    if (riskFilter !== "all") {
      result = result.filter(c => (c.riskTier || "").toLowerCase() === riskFilter);
    }
    if (sortBy === "perihelion") {
      result = [...result].sort((a, b) => (a.q || 999) - (b.q || 999));
    } else if (sortBy === "moid") {
      result = [...result].sort((a, b) => (a.moidAU || 999) - (b.moidAU || 999));
    } else if (sortBy === "mag") {
      result = [...result].sort((a, b) => (a.peakMag || 99) - (b.peakMag || 99));
    } else if (sortBy === "tp") {
      result = [...result].sort((a, b) => (a.tpJD || Infinity) - (b.tpJD || Infinity));
    }
    return result;
  }, [candidates, searchTerm, riskFilter, sortBy]);

  const stats = useMemo(() => {
    if (!candidates) return null;
    return {
      total: candidates.length,
      imminent: candidates.filter(c => c.riskTier === "Imminent").length,
      high: candidates.filter(c => c.riskTier === "High").length,
      moderate: candidates.filter(c => c.riskTier === "Moderate").length,
      low: candidates.filter(c => c.riskTier === "Low").length,
      sungrazers: candidates.filter(c => c.q !== null && c.q < 0.01).length,
      brightForecast: candidates.filter(c => c.peakMag !== null && c.peakMag < 10).length,
      avgPerihelion: candidates.length > 0 ? candidates.reduce((s, c) => s + (c.q || 0), 0) / candidates.length : 0,
      minPerihelion: candidates.length > 0 ? Math.min(...candidates.map(c => c.q || 999)) : 0
    };
  }, [candidates]);

  return (
    <div className="dinoSatSpaceWeatherDetail">
      <div className="dinoSatSpaceWeatherDetailHeader">
        <span><FontAwesomeIcon icon={faFire} /> Comet Apparition Watch · {candidates?.length || 0} monitored objects</span>
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
                    <input type="text" placeholder="Designation or name..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="dinoSatSatelliteSearchInput" />
                  </div>
                  <div className="dinoSatFilterField">
                    <label>Risk Tier</label>
                    <select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)} className="dinoSatSatelliteFPSSelect">
                      <option value="all">All</option>
                      <option value="imminent">Imminent</option>
                      <option value="high">High</option>
                      <option value="moderate">Moderate</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div className="dinoSatFilterField">
                    <label>Sort by</label>
                    <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="dinoSatSatelliteFPSSelect">
                      <option value="perihelion">Smallest perihelion</option>
                      <option value="moid">Smallest MOID</option>
                      <option value="mag">Brightest forecast</option>
                      <option value="tp">Soonest perihelion</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="dinoSatPanelCard">
              <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faTable} /> Comet Watch ({filtered.length})</span></div>
              <div className="dinoSatPanelCardBody">
                {filtered.length === 0 ? (
                  <div className="dinoSatPanelEmpty">{loading ? "Computing watch list..." : "No comets match the filter."}</div>
                ) : (
                  <div className="dinoSatTableScroll">
                    <table className="dinoSatDataTable">
                      <thead>
                        <tr><th>Risk</th><th>Tier</th><th>Designation</th><th>Name</th><th>Class</th><th>Perihelion Date</th><th>q (AU)</th><th>MOID (AU)</th><th>Peak Mag</th><th>Activity</th><th></th></tr>
                      </thead>
                      <tbody>
                        {filtered.map((c) => (
                          <tr key={c.designation || c.name} className={`dinoSatDecayRisk-${(c.riskTier || "low").toLowerCase()}`}>
                            <td><span className={`dinoSatDecayRiskBadge dinoSatDecayRisk-${(c.riskTier || "low").toLowerCase()}`}>{c.riskTier}</span></td>
                            <td><span className={`dinoSatDecayTierBadge dinoSatDecayTier-${c.tier || "heuristic"}`}>{c.tier === "highConfidence" ? "High Conf" : "Heuristic"}</span></td>
                            <td><b>{c.designation}</b></td>
                            <td>{c.name}</td>
                            <td>{c.category}</td>
                            <td>{c.tpDate}</td>
                            <td>{c.q !== null && c.q !== undefined ? c.q.toFixed(4) : "—"}</td>
                            <td style={{ color: moidColor(c.moidAU) }}>{c.moidAU !== null && c.moidAU !== undefined ? c.moidAU.toFixed(4) : "—"}</td>
                            <td>{c.peakMag !== null && c.peakMag !== undefined ? c.peakMag.toFixed(1) : "—"}</td>
                            <td><span style={{ color: activityColor(c.activityStatus) }}>{c.activityStatus}</span></td>
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
              <StatTile label="Total Monitored" value={stats.total} sub="Comet apparition objects" accent="#42a5f5" large />
              <StatTile label="Sungrazers" value={stats.sungrazers} color="#FFD060" accent="#FFD060" sub="q < 0.01 AU" />
              <StatTile label="Bright Forecast" value={stats.brightForecast} color="#fb923c" accent="#fb923c" sub="m < 10 at perihelion" />
              <StatTile label="Imminent" value={stats.imminent} color="#ef4444" accent="#ef4444" />
              <StatTile label="High" value={stats.high} color="#fb923c" accent="#fb923c" />
              <StatTile label="Moderate" value={stats.moderate} color="#facc15" accent="#facc15" />
              <StatTile label="Low" value={stats.low} color="#84cc16" accent="#84cc16" />
              <StatTile label="Mean Perihelion" value={stats.avgPerihelion.toFixed(3)} unit="AU" accent="#42a5f5" />
              <StatTile label="Smallest Perihelion" value={stats.minPerihelion.toFixed(4)} unit="AU" color="#FFD060" accent="#FFD060" />
            </div>
            <div className="dinoSatPanelCard">
              <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faBookOpen} /> Comet Apparition Methodology</span></div>
              <div className="dinoSatPanelCardBody">
                <div className="dinoSatBriefingGrid">
                  <div className="dinoSatBriefingItem"><b>Apparition Window</b><p>Comet apparitions are defined by perihelion passage timing relative to Earth's geometry. Optimal observation occurs when the comet is on the same side of the sun as Earth and approaches its closest geocentric distance.</p></div>
                  <div className="dinoSatBriefingItem"><b>Magnitude Forecast</b><p>{methodology?.magnitudeFormula || "m = M1 + 5·log10(Δ) + K1·log10(rH)"}: M1 is total magnitude at unit distance, K1 the activity slope, rH heliocentric distance, Δ geocentric distance. Default K1 ≈ 10.</p></div>
                  <div className="dinoSatBriefingItem"><b>Confidence Tiers</b><p><b>High Confidence:</b> {methodology?.highConfidenceCriterion || "Periodic comet with multiple observed apparitions and well-determined non-gravitational parameters"}. <b>Heuristic:</b> Single-apparition comets, near-parabolic, or hyperbolic where ephemeris uncertainty grows rapidly.</p></div>
                  <div className="dinoSatBriefingItem"><b>Risk Tiers</b><p>Imminent: perihelion within 30 days. High: 30-180 days. Moderate: 180-365 days. Low: more than 1 year. Risk tier reflects observation urgency, not impact hazard.</p></div>
                  <div className="dinoSatBriefingItem"><b>Non-Gravitational Forces</b><p>Comets exhibit outgassing-induced acceleration parameterized by A1 (radial), A2 (transverse), A3 (normal). These dominate the long-term ephemeris error budget, especially for active dynamically-new comets.</p></div>
                  <div className="dinoSatBriefingItem"><b>Limitations</b><p>Apparition forecasting uses two-body Kepler/Barker propagation without Yarkovsky or non-gravitational refinement. Predicted positions can deviate significantly from observed positions during active phases.</p></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const FlybyPredictionsTab = ({ comet, observerLocation, onLocationChange, onRequestGeolocation, currentDate }) => {
  const [hours, setHours] = useState(720);
  const [computing, setComputing] = useState(false);
  const [predictions, setPredictions] = useState([]);
  const [magnitudeCurve, setMagnitudeCurve] = useState([]);
  const currentDateRef = useRef(currentDate);

  useEffect(() => { currentDateRef.current = currentDate; }, [currentDate]);

  const compute = useCallback(() => {
    if (!comet || !comet.elements) return;
    setComputing(true);
    setTimeout(() => {
      const now = currentDateRef.current || new Date();
      const points = [];
      const magPoints = [];
      const samples = 240;
      for (let i = 0; i <= samples; i++) {
        const t = new Date(now.getTime() + (i / samples) * hours * 3600000);
        const satPos = propagateComet(comet, t);
        const earthPos = propagateEarth(t);
        if (!satPos || !earthPos) continue;
        const dist = satPos.distanceTo(earthPos) / ORBITAL_CONSTANTS.SCALE_FACTOR;
        const rH = satPos.length() / ORBITAL_CONSTANTS.SCALE_FACTOR;
        points.push({ time: t.toISOString(), value: dist });
        const m = apparentMagnitude(comet.m1, comet.k1, rH, dist);
        if (m !== null) {
          magPoints.push({ time: t.toISOString(), value: m });
        }
      }
      setPredictions(points);
      setMagnitudeCurve(magPoints);
      setComputing(false);
    }, 50);
  }, [comet, hours]);

  useEffect(() => { compute(); }, [compute]);

  if (!comet || !comet.elements) {
    return (
      <div className="dinoSatDossierTabContent">
        <div className="dinoSatPanelEmpty">No orbital elements available for flyby prediction.</div>
      </div>
    );
  }

  const minPoint = predictions.length > 0 ? predictions.reduce((m, p) => p.value < m.value ? p : m, predictions[0]) : null;
  const peakBrightnessPoint = magnitudeCurve.length > 0 ? magnitudeCurve.reduce((m, p) => p.value < m.value ? p : m, magnitudeCurve[0]) : null;

  return (
    <div className="dinoSatDossierTabContent">
      <div className="dinoSatPanelCard">
        <div className="dinoSatPanelCardHeader">
          <span><FontAwesomeIcon icon={faTowerBroadcast} /> Earth Approach & Brightness Forecast</span>
          <button className="dinoSatPassComputeButton" onClick={compute}>
            <FontAwesomeIcon icon={computing ? faSpinner : faRoute} spin={computing} /> {computing ? "Computing" : "Recompute"}
          </button>
        </div>
        <div className="dinoSatPanelCardBody">
          <div className="dinoSatPassControlsRow">
            <div className="dinoSatPassField">
              <label>Latitude</label>
              <input key={`lat-${observerLocation?.lat ?? "x"}`} type="number" placeholder="0.0000" step="0.0001" defaultValue={observerLocation?.lat ?? ""} onBlur={(event) => { const v = parseFloat(event.target.value); if (!isNaN(v)) onLocationChange({ ...(observerLocation || {}), lat: v }); }} />
            </div>
            <div className="dinoSatPassField">
              <label>Longitude</label>
              <input key={`lon-${observerLocation?.lon ?? "x"}`} type="number" placeholder="0.0000" step="0.0001" defaultValue={observerLocation?.lon ?? ""} onBlur={(event) => { const v = parseFloat(event.target.value); if (!isNaN(v)) onLocationChange({ ...(observerLocation || {}), lon: v }); }} />
            </div>
            <div className="dinoSatPassField">
              <label>Altitude (m)</label>
              <input key={`alt-${observerLocation?.alt ?? "x"}`} type="number" placeholder="0" defaultValue={observerLocation?.alt ?? 0} onBlur={(event) => { const v = parseFloat(event.target.value); if (!isNaN(v)) onLocationChange({ ...(observerLocation || {}), alt: v }); }} />
            </div>
            <div className="dinoSatPassField">
              <label>Window (h)</label>
              <input type="number" min="24" max="17520" value={hours} onChange={(event) => setHours(Math.max(24, Math.min(17520, parseInt(event.target.value) || 720)))} />
            </div>
            <div className="dinoSatPassField">
              <label>Quick Set</label>
              <button className="dinoSatPassLocationButton" onClick={onRequestGeolocation}><FontAwesomeIcon icon={faMapLocation} /> My Location</button>
            </div>
          </div>
        </div>
      </div>

      {minPoint && (
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faRoute} /> Closest Approach in Window</span></div>
          <div className="dinoSatPanelCardBody">
            <div className="dinoSatDossierStrip">
              <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Time (UTC)</div><div className="dinoSatDossierCellValue">{formatChartTimeFull(minPoint.time)}</div></div>
              <div className="dinoSatDossierCell" style={{ borderLeftColor: moidColor(minPoint.value) }}><div className="dinoSatDossierCellLabel">Distance</div><div className="dinoSatDossierCellValue" style={{ color: moidColor(minPoint.value) }}>{minPoint.value.toFixed(6)}<span>AU</span></div></div>
              <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Lunar Distances</div><div className="dinoSatDossierCellValue">{(minPoint.value * AU_KM / 384400).toFixed(2)}<span>LD</span></div></div>
              <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Distance (km)</div><div className="dinoSatDossierCellValue">{Math.round(minPoint.value * AU_KM).toLocaleString()}</div></div>
            </div>
          </div>
        </div>
      )}

      {peakBrightnessPoint && (
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faSun} /> Peak Predicted Brightness</span></div>
          <div className="dinoSatPanelCardBody">
            <div className="dinoSatDossierStrip">
              <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Time (UTC)</div><div className="dinoSatDossierCellValue">{formatChartTimeFull(peakBrightnessPoint.time)}</div></div>
              <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Apparent Magnitude</div><div className="dinoSatDossierCellValue">{peakBrightnessPoint.value.toFixed(2)}</div></div>
              <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Visibility</div><div className="dinoSatDossierCellValue">{peakBrightnessPoint.value < 6 ? "Naked eye" : peakBrightnessPoint.value < 10 ? "Binoculars" : peakBrightnessPoint.value < 16 ? "Telescope" : "CCD only"}</div></div>
            </div>
          </div>
        </div>
      )}

      <div className="dinoSatPanelCard">
        <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faChartArea} /> Earth-Comet Distance Over Window</span></div>
        <div className="dinoSatPanelCardBody">
          <ChartCanvas values={predictions} height={200} accent="#42a5f5" colorFn={(v) => moidColor(v)} label="Heliocentric distance to Earth" unit="AU" valueFormatter={(v) => v.toFixed(4)} threshold={0.1} thresholdLabel="Comet close threshold (0.1 AU)" />
        </div>
      </div>

      {magnitudeCurve.length > 0 && (
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faSun} /> Apparent Magnitude Forecast</span></div>
          <div className="dinoSatPanelCardBody">
            <ChartCanvas values={magnitudeCurve} height={200} accent="#FFD060" label={`m = ${comet.m1?.toFixed(1) || "?"} + 5·log10(Δ) + ${comet.k1?.toFixed(1) || "10"}·log10(rH)`} unit="mag" valueFormatter={(v) => v.toFixed(1)} threshold={6} thresholdLabel="Naked eye (m=6)" />
          </div>
        </div>
      )}
    </div>
  );
};

const MissionIntelligenceTab = ({ comet, intelligence, loading, onRefresh }) => {
  if (loading) {
    return (
      <div className="dinoSatDossierTabContent">
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faBrain} /> AI Comet Brief</span></div>
          <div className="dinoSatPanelCardBody">
            <div className="dinoSatStatusDisplay"><FontAwesomeIcon icon={faSpinner} spin /><p>Querying multi-stage AI ensemble for comprehensive comet intelligence...</p></div>
          </div>
        </div>
      </div>
    );
  }
  if (!intelligence) {
    return (
      <div className="dinoSatDossierTabContent">
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faBrain} /> AI Comet Brief</span></div>
          <div className="dinoSatPanelCardBody">
            <div className="dinoSatStatusDisplay"><FontAwesomeIcon icon={faSpinner} spin /><p>Preparing comet intelligence...</p></div>
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
              {intelligence.partialStages && intelligence.partialStages.length > 0 && (<small>Partial stages completed: {intelligence.partialStages.join(", ")}</small>)}
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
                  {s.timedOut && <small style={{ color: "#fb923c" }}>Timed out</small>}
                  {s.truncated && <small style={{ color: "#fb923c" }}>Truncated</small>}
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
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faBrain} /> Discovery & Apparition Brief</span></div>
          <div className="dinoSatPanelCardBody"><p className="dinoSatMissionBriefText">{safeRenderText(intel.missionBrief)}</p></div>
        </div>
      )}

      <div className="dinoSatPanelCard">
        <div className="dinoSatPanelCardHeader"><span>Discovery Provenance</span></div>
        <div className="dinoSatPanelCardBody">
          <div className="dinoSatDossierStrip">
            <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Discoverer</div><div className="dinoSatDossierCellValue">{safeRenderText(intel.operator)}</div></div>
            <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Discovery Date</div><div className="dinoSatDossierCellValue">{safeRenderText(intel.launchDate)}</div></div>
            <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Discovery Survey</div><div className="dinoSatDossierCellValue">{safeRenderText(intel.launchVehicle)}</div></div>
            <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Observatory</div><div className="dinoSatDossierCellValue">{safeRenderText(intel.launchSite)}</div></div>
            <div className="dinoSatDossierCell" style={{ borderLeftColor: intel.missionStatus === "Active" ? "#4ade80" : "#fb923c" }}><div className="dinoSatDossierCellLabel">Comet Status</div><div className="dinoSatDossierCellValue" style={{ color: intel.missionStatus === "Active" ? "#4ade80" : "#fb923c" }}>{safeRenderText(intel.missionStatus)}</div></div>
            <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Provisional Designation</div><div className="dinoSatDossierCellValue">{safeRenderText(intel.internationalDesignator)}</div></div>
          </div>
        </div>
      </div>

      {intel.factSheet && (
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span>Nucleus & Activity Fact Sheet</span></div>
          <div className="dinoSatPanelCardBody">
            <div className="dinoSatDossierStrip">
              <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Nucleus Diameter</div><div className="dinoSatDossierCellValue">{safeRenderText(intel.factSheet.manufacturer)}</div></div>
              <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Composition</div><div className="dinoSatDossierCellValue">{safeRenderText(intel.factSheet.bus)}</div></div>
              <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Estimated Mass</div><div className="dinoSatDossierCellValue">{safeRenderText(intel.factSheet.mass)}</div></div>
              <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Albedo</div><div className="dinoSatDossierCellValue">{safeRenderText(intel.factSheet.power)}</div></div>
              <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Rotation Period</div><div className="dinoSatDossierCellValue">{safeRenderText(intel.factSheet.designLife)}</div></div>
              <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Dust/Gas Production</div><div className="dinoSatDossierCellValue">{safeRenderText(intel.factSheet.propulsion)}</div></div>
              <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Fragmentation</div><div className="dinoSatDossierCellValue">{safeRenderText(intel.factSheet.stabilization)}</div></div>
            </div>
          </div>
        </div>
      )}

      {intel.instruments && intel.instruments.length > 0 && (
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faMicrochip} /> Spacecraft Visits / Mission Targets</span></div>
          <div className="dinoSatPanelCardBody">
            <div className="dinoSatInstrumentList">
              {intel.instruments.map((inst, i) => (<span key={i} className="dinoSatInstrumentChip">{safeRenderText(inst)}</span>))}
            </div>
          </div>
        </div>
      )}

      {intel.scientificContribution && (
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faMicroscope} /> Scientific Significance</span></div>
          <div className="dinoSatPanelCardBody"><p className="dinoSatMissionBriefText">{safeRenderText(intel.scientificContribution)}</p></div>
        </div>
      )}

      {intel.notableEvents && intel.notableEvents.length > 0 && (
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faClock} /> Apparition & Event Timeline</span></div>
          <div className="dinoSatPanelCardBody">
            <div className="dinoSatTimelineList">
              {intel.notableEvents.map((e, i) => (<div key={i} className="dinoSatTimelineItem"><div className="dinoSatTimelineDate">{safeRenderText(e.date)}</div><div className="dinoSatTimelineEvent">{safeRenderText(e.event)}</div></div>))}
            </div>
          </div>
        </div>
      )}

      {intel.constellationContext && (
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faCircleNodes} /> Dynamical Family Context</span></div>
          <div className="dinoSatPanelCardBody"><p className="dinoSatMissionBriefText">{safeRenderText(intel.constellationContext)}</p></div>
        </div>
      )}

      {intel.riskAssessment && (
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faTriangleExclamation} /> Risk Assessment</span></div>
          <div className="dinoSatPanelCardBody">
            <div className="dinoSatRiskGrid">
              <div className="dinoSatRiskItem"><b>Orbit Arc</b><p>{safeRenderText(intel.riskAssessment.tleAgeRisk)}</p></div>
              <div className="dinoSatRiskItem"><b>Fragmentation Risk</b><p>{safeRenderText(intel.riskAssessment.decayRisk)}</p></div>
              <div className="dinoSatRiskItem"><b>Close Approach</b><p>{safeRenderText(intel.riskAssessment.conjunctionRisk)}</p></div>
              <div className="dinoSatRiskItem"><b>Operational</b><p>{safeRenderText(intel.riskAssessment.operationalRisk)}</p></div>
              {intel.riskAssessment.cyberRisk && <div className="dinoSatRiskItem"><b>Mission Window</b><p>{safeRenderText(intel.riskAssessment.cyberRisk)}</p></div>}
              {intel.riskAssessment.regulatoryRisk && <div className="dinoSatRiskItem"><b>Treaty / Policy</b><p>{safeRenderText(intel.riskAssessment.regulatoryRisk)}</p></div>}
            </div>
          </div>
        </div>
      )}

      {intel.geopoliticalSignificance && (
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faGlobe} /> Geopolitical / Cultural Significance</span></div>
          <div className="dinoSatPanelCardBody"><p className="dinoSatMissionBriefText">{safeRenderText(intel.geopoliticalSignificance)}</p></div>
        </div>
      )}

      {intel.commercialContext && (
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faChartColumn} /> Astronomy / Outreach Context</span></div>
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

const ObservationsTab = ({ comet, observation, loading, onRefresh }) => {
  const q = comet?.perihelionAU || 0;
  const e = comet?.eccentricity || 0;
  const aphelion = comet?.aphelionAU;
  const period = comet?.orbitalPeriodYears;
  const m1 = comet?.m1;

  const isInner = q < 1.5;
  const isJFC = comet?.category === "Jupiter-Family";
  const isLongPeriod = comet?.category === "Long-Period" || comet?.category === "Near-Parabolic";
  const isHyperbolic = e > 1;

  let visibilityClass = "Unknown";
  let visibilityColor = "#808080";
  let visibilityNote = "Insufficient orbital data to estimate observability.";

  if (m1 !== null && m1 !== undefined) {
    if (m1 < 6 && isInner) {
      visibilityClass = "Naked eye possible";
      visibilityColor = "#4ade80";
      visibilityNote = "Bright comet with M1 < 6. During favorable apparitions near perihelion it can reach naked-eye visibility for observers in dark sky locations. Coma and tail may be visually striking.";
    } else if (m1 < 10) {
      visibilityClass = "Binocular";
      visibilityColor = "#84cc16";
      visibilityNote = "Moderately bright comet; binoculars or small telescope required during perihelion apparitions. Apparent magnitude typically m 8-12 near peak.";
    } else if (m1 < 16) {
      visibilityClass = "Telescope";
      visibilityColor = "#fb923c";
      visibilityNote = "Telescope required. Visible only in 8-inch or larger amateur instruments under dark skies during favorable apparitions. Apparent magnitude m 12-18.";
    } else {
      visibilityClass = "Specialized";
      visibilityColor = "#a78bfa";
      visibilityNote = "Faint comet requiring large-aperture telescopes, CCD imaging, and tracking. Beyond reach of casual observation.";
    }
  }

  const enrichRef = (label) => {
    if (!label) return "";
    if (label === "JPL SBDB Browser") return "Authoritative orbit elements, physical parameters, and observation arc data for known comets.";
    if (label === "Minor Planet Center") return "IAU-sanctioned catalog with discovery circulars, observation logs, and ephemerides.";
    if (label === "JPL Horizons") return "High-precision ephemeris service for state vectors and topocentric ephemerides at arbitrary epochs.";
    if (label === "CNEOS Close Approach Tables") return "Database of past and predicted close approaches to Earth and other planets.";
    if (label === "Cometary Activity Database") return "Comet activity records, dust/gas production rates, and lightcurve archives.";
    if (label.toLowerCase().includes("wikipedia")) return "Reference article with discovery context, scientific significance, and physical characterization.";
    return "";
  };

  const hostnameOf = (url) => {
    try { return new URL(url).hostname.replace("www.", ""); } catch (error) { return url; }
  };

  const renderOverview = () => (
    <>
      <div className="dinoSatDossierStrip">
        <div className="dinoSatDossierCell" style={{ borderLeftColor: visibilityColor }}><div className="dinoSatDossierCellLabel">Visibility</div><div className="dinoSatDossierCellValue" style={{ color: visibilityColor }}>{visibilityClass}</div></div>
        <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Population</div><div className="dinoSatDossierCellValue">{comet?.category || "—"}</div></div>
        <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Perihelion (q)</div><div className="dinoSatDossierCellValue">{q.toFixed(4)}<span>AU</span></div></div>
        <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Eccentricity</div><div className="dinoSatDossierCellValue">{e.toFixed(4)}</div></div>
        {period !== null && period !== undefined && <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Period</div><div className="dinoSatDossierCellValue">{period.toFixed(2)}<span>years</span></div></div>}
        {aphelion !== null && aphelion !== undefined && <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Aphelion (Q)</div><div className="dinoSatDossierCellValue">{aphelion.toFixed(3)}<span>AU</span></div></div>}
        <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Designation</div><div className="dinoSatDossierCellValue">{comet?.designation || "—"}</div></div>
        <div className="dinoSatDossierCell" style={{ borderLeftColor: activityColor(comet?.activityStatus) }}><div className="dinoSatDossierCellLabel">Activity</div><div className="dinoSatDossierCellValue" style={{ color: activityColor(comet?.activityStatus) }}>{comet?.activityStatus || "Unknown"}</div></div>
        {isHyperbolic && <div className="dinoSatDossierCell" style={{ borderLeftColor: "#E91E63" }}><div className="dinoSatDossierCellLabel">Trajectory</div><div className="dinoSatDossierCellValue" style={{ color: "#E91E63" }}>Hyperbolic</div></div>}
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

      {observation.closeApproaches && observation.closeApproaches.length > 0 && (
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faClock} /> Recorded Close Approaches</span></div>
          <div className="dinoSatPanelCardBody">
            <div className="dinoSatTableScroll">
              <table className="dinoSatDataTable">
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
              </table>
            </div>
          </div>
        </div>
      )}

      {observation.physicalProperties && (
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faAtom} /> Physical Properties</span></div>
          <div className="dinoSatPanelCardBody">
            <div className="dinoSatDossierStrip">
              {observation.physicalProperties.diameter && <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Nucleus Diameter</div><div className="dinoSatDossierCellValue">{observation.physicalProperties.diameter}<span>km</span></div></div>}
              {observation.physicalProperties.albedo && <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Albedo</div><div className="dinoSatDossierCellValue">{observation.physicalProperties.albedo}</div></div>}
              {observation.physicalProperties.rotationPeriod && <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Rotation Period</div><div className="dinoSatDossierCellValue">{observation.physicalProperties.rotationPeriod}<span>hours</span></div></div>}
              {observation.physicalProperties.m1 !== undefined && <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Total Magnitude M1</div><div className="dinoSatDossierCellValue">{observation.physicalProperties.m1?.toFixed(2)}</div></div>}
              {observation.physicalProperties.k1 !== undefined && <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Slope K1</div><div className="dinoSatDossierCellValue">{observation.physicalProperties.k1?.toFixed(2)}</div></div>}
              {observation.physicalProperties.gm && <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">GM</div><div className="dinoSatDossierCellValue">{observation.physicalProperties.gm}<span>km³/s²</span></div></div>}
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

const OrbitArcTab = ({ comet }) => {
  const ageDays = comet.observationArcDays;
  const errorEnvelope1y = ageDays !== null && ageDays !== undefined ? Math.max(500, 50000 / Math.max(1, ageDays / 365)) : null;
  const errorEnvelope10y = ageDays !== null && ageDays !== undefined ? Math.max(5000, 500000 / Math.max(1, ageDays / 365)) : null;
  return (
    <div className="dinoSatDossierTabContent">
      <div className="dinoSatPanelCard">
        <div className="dinoSatPanelCardHeader"><span>Orbit Determination Quality</span></div>
        <div className="dinoSatPanelCardBody">
          <div className="dinoSatDossierStrip">
            <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Epoch</div><div className="dinoSatDossierCellValue">{comet.epochISO || "Unknown"}</div></div>
            <div className="dinoSatDossierCell" style={{ borderLeftColor: orbitArcAgeColor(ageDays) }}><div className="dinoSatDossierCellLabel">Observation Arc</div><div className="dinoSatDossierCellValue" style={{ color: orbitArcAgeColor(ageDays) }}>{ageDays !== null && ageDays !== undefined ? Math.round(ageDays) : "?"}<span>days</span></div></div>
            <div className="dinoSatDossierCell" style={{ borderLeftColor: orbitArcAgeColor(ageDays) }}><div className="dinoSatDossierCellLabel">Quality Class</div><div className="dinoSatDossierCellValue" style={{ color: orbitArcAgeColor(ageDays) }}>{orbitArcAgeLabel(ageDays)}</div></div>
            <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Number of Observations</div><div className="dinoSatDossierCellValue">{comet.numObs || "?"}</div></div>
            <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Position Error +1y</div><div className="dinoSatDossierCellValue">{errorEnvelope1y !== null ? `~${errorEnvelope1y.toFixed(0)}` : "?"}<span>km</span></div></div>
            <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Position Error +10y</div><div className="dinoSatDossierCellValue">{errorEnvelope10y !== null ? `~${errorEnvelope10y.toFixed(0)}` : "?"}<span>km</span></div></div>
            <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Non-Grav A1</div><div className="dinoSatDossierCellValue">{comet.a1 !== null && comet.a1 !== undefined ? comet.a1.toExponential(3) : "—"}</div></div>
            <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Non-Grav A2</div><div className="dinoSatDossierCellValue">{comet.a2 !== null && comet.a2 !== undefined ? comet.a2.toExponential(3) : "—"}</div></div>
            <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Non-Grav A3</div><div className="dinoSatDossierCellValue">{comet.a3 !== null && comet.a3 !== undefined ? comet.a3.toExponential(3) : "—"}</div></div>
          </div>
        </div>
      </div>
      <div className="dinoSatPanelCard">
        <div className="dinoSatPanelCardHeader"><span>Raw Orbital Elements (J2000 Heliocentric Ecliptic)</span></div>
        <div className="dinoSatPanelCardBody">
          <pre className="dinoSatTLEBlock">
{`Epoch JD:        ${comet.elements?.epoch || "?"}
Perihelion (q):  ${comet.elements?.q?.toFixed(8) || (comet.perihelionAU?.toFixed(8) || "?")} AU
Eccentricity:    ${comet.elements?.e?.toFixed(8) || "?"}
Inclination:     ${comet.elements?.i?.toFixed(6) || "?"}°
Long. Asc Node:  ${comet.elements?.om?.toFixed(6) || "?"}°
Arg. Perihelion: ${comet.elements?.w?.toFixed(6) || "?"}°
Time Perihelion: ${comet.elements?.tp || "?"} (JD)
Mean Anomaly:    ${comet.elements?.ma !== undefined && comet.elements?.ma !== null ? comet.elements.ma.toFixed(6) + "°" : "—"}
Semi-major axis: ${comet.elements?.a?.toFixed(8) || (comet.semiMajorAxisAU?.toFixed(8) || "—")} AU`}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default function CometTracker() {
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);
  const [showErrors, setShowErrors] = useState(false);
  const [copiedErrors, setCopiedErrors] = useState(false);
  const [loadingMetadata, setLoadingMetadata] = useState(null);
  const [comets, setComets] = useState([]);
  const [filteredComets, setFilteredComets] = useState([]);
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
  const [showOrbitalZones, setShowOrbitalZones] = useState(true);
  const [showDistanceRings, setShowDistanceRings] = useState(true);
  const [showCometComa, setShowCometComa] = useState(true);
  const [bloomEnabled, setBloomEnabled] = useState(true);
  const [bloomStrength, setBloomStrength] = useState(0.9);
  const [bloomRadius, setBloomRadius] = useState(0.5);
  const [bloomThreshold, setBloomThreshold] = useState(0.22);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [legendCollapsed, setLegendCollapsed] = useState(false);
  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  const [hudVisible, setHudVisible] = useState(false);
  const [detailedComet, setDetailedComet] = useState(null);
  const [selectedComet, setSelectedComet] = useState(null);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [theme, setTheme] = useState("dark");
  const [sceneInitialized, setSceneInitialized] = useState(false);
  const [performanceStats, setPerformanceStats] = useState({ renderTime: 0, memoryUsage: 0, triangles: 0, drawCalls: 0, lines: 0, textures: 0, geometries: 0, visibleComets: 0, culledComets: 0 });
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
  const [closeApproachThreshold, setCloseApproachThreshold] = useState(0.1);
  const [showCloseApproachPanel, setShowCloseApproachPanel] = useState(false);
  const [phaCatalog, setPHACatalog] = useState(null);
  const [phaLoading, setPHALoading] = useState(false);
  const [showPHAPanel, setShowPHAPanel] = useState(false);
  const [sentryCandidates, setSentryCandidates] = useState([]);
  const [sentryMethodology, setSentryMethodology] = useState(null);
  const [sentryLoading, setSentryLoading] = useState(false);
  const [showSentryPanel, setShowSentryPanel] = useState(false);
  const [colorByObservationArc, setColorByObservationArc] = useState(false);

  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const composerRef = useRef(null);
  const bloomPassRef = useRef(null);
  const labelRendererRef = useRef(null);
  const cameraRef = useRef(null);
  const sunRef = useRef(null);
  const earthMarkerRef = useRef(null);
  const cometGroupRef = useRef(null);
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
  const cometInstanceRef = useRef(null);
  const comaInstanceRef = useRef(null);
  const orbitLinesRef = useRef({});
  const trailLinesRef = useRef({});
  const trailBuffersRef = useRef(new Map());
  const cometDataRef = useRef(new Map());
  const labelsRef = useRef({});
  const visibleCometsRef = useRef(new Set());
  const frustumRef = useRef(new THREE.Frustum());
  const tempMatrix = useRef(new THREE.Matrix4());
  const tempColor = useRef(new THREE.Color());
  const tempSphere = useRef(new THREE.Sphere());
  const tempProjMatrix = useRef(new THREE.Matrix4());
  const tempVecRef = useRef(new THREE.Vector3());
  const tempScaleMatrix = useRef(new THREE.Matrix4());

  const cometsRef = useRef([]);
  const isPlayingRef = useRef(true);
  const speedMultiplierRef = useRef(1);
  const bloomEnabledRef = useRef(true);
  const targetFpsRef = useRef(60);
  const showOrbitsRef = useRef(true);
  const showTrailsRef = useRef(true);
  const showLabelsRef = useRef(true);
  const showCometComaRef = useRef(true);
  const colorByObservationArcRef = useRef(false);
  const closeApproachThresholdRef = useRef(0.1);

  useEffect(() => { cometsRef.current = comets; }, [comets]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { speedMultiplierRef.current = speedMultiplier; }, [speedMultiplier]);
  useEffect(() => { bloomEnabledRef.current = bloomEnabled; }, [bloomEnabled]);
  useEffect(() => { targetFpsRef.current = targetFps; }, [targetFps]);
  useEffect(() => { showOrbitsRef.current = showOrbits; }, [showOrbits]);
  useEffect(() => { showTrailsRef.current = showTrails; }, [showTrails]);
  useEffect(() => { showLabelsRef.current = showLabels; }, [showLabels]);
  useEffect(() => { showCometComaRef.current = showCometComa; }, [showCometComa]);
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

  const anyOverlayPanelOpen = hudVisible || !!detailedComet || neoWatchExpanded || showCloseApproachPanel || showPHAPanel || showSentryPanel;

  const closeAllOverlayPanels = useCallback(() => {
    setHudVisible(false);
    setDetailedComet(null);
    setNEOWatchExpanded(false);
    setShowCloseApproachPanel(false);
    setShowPHAPanel(false);
    setShowSentryPanel(false);
  }, []);

  const computeAllPositions = useCallback(() => {
    const date = new Date(simulationDateMsRef.current);
    const sats = cometsRef.current;
    for (let i = 0; i < sats.length; i++) {
      const comet = sats[i];
      if (!comet.active) continue;
      const position = propagateComet(comet, date);
      if (position) {
        const rH = position.length() / ORBITAL_CONSTANTS.SCALE_FACTOR;
        cometDataRef.current.set(comet.id, { position, lastUpdate: Date.now(), rH, activity: activityProxy(rH) });
      }
    }
    const earthPos = propagateEarth(date);
    if (earthPos) {
      cometDataRef.current.set("__earth__", { position: earthPos, lastUpdate: Date.now() });
      if (earthMarkerRef.current) {
        earthMarkerRef.current.position.copy(earthPos);
      }
    }
  }, []);

  const performFrustumCulling = useCallback(() => {
    if (!cameraRef.current) return;
    const camera = cameraRef.current;
    tempProjMatrix.current.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustumRef.current.setFromProjectionMatrix(tempProjMatrix.current);

    const sats = cometsRef.current;
    const candidates = [];
    const MARGIN = PERFORMANCE_CONSTANTS.FRUSTUM_MARGIN;

    for (let i = 0; i < sats.length; i++) {
      const comet = sats[i];
      if (!comet.active) continue;
      const data = cometDataRef.current.get(comet.id);
      if (!data || !data.position) continue;
      if (!Number.isFinite(data.position.x) || !Number.isFinite(data.position.y) || !Number.isFinite(data.position.z)) continue;
      const dist = data.position.distanceTo(camera.position);
      if (dist >= 6000) continue;
      tempSphere.current.set(data.position, 2.0 * MARGIN);
      if (!frustumRef.current.intersectsSphere(tempSphere.current)) continue;
      candidates.push({ id: comet.id, dist });
    }

    candidates.sort((a, b) => a.dist - b.dist);

    const newVisible = new Set();
    const MAX = PERFORMANCE_CONSTANTS.MAX_VISIBLE_COMETS;
    const limit = Math.min(MAX, candidates.length);
    for (let i = 0; i < limit; i++) {
      newVisible.add(candidates[i].id);
    }
    visibleCometsRef.current = newVisible;
  }, []);

  const writeInstanceBuffers = useCallback(() => {
    if (!cometInstanceRef.current || !comaInstanceRef.current) return;
    const visible = visibleCometsRef.current;
    const sats = cometsRef.current;
    let idx = 0;
    for (let i = 0; i < sats.length; i++) {
      const comet = sats[i];
      if (!comet.active) continue;
      if (!visible.has(comet.id)) continue;
      const data = cometDataRef.current.get(comet.id);
      if (!data || !data.position) continue;
      if (!Number.isFinite(data.position.x)) continue;
      tempMatrix.current.makeTranslation(data.position.x, data.position.y, data.position.z);
      cometInstanceRef.current.setMatrixAt(idx, tempMatrix.current);

      const activity = data.activity || 0;
      const comaScale = Math.min(8.0, 1.0 + activity * 0.7);
      tempScaleMatrix.current.makeScale(comaScale, comaScale, comaScale);
      tempScaleMatrix.current.setPosition(data.position.x, data.position.y, data.position.z);
      comaInstanceRef.current.setMatrixAt(idx, tempScaleMatrix.current);

      let baseColor = comet.color;
      if (colorByObservationArcRef.current) { baseColor = orbitArcAgeColor(comet.observationArcDays); }
      tempColor.current.set(baseColor);
      cometInstanceRef.current.setColorAt(idx, tempColor.current);

      const comaTint = activity > 0.5 ? "#FFE0A0" : baseColor;
      tempColor.current.set(comaTint);
      comaInstanceRef.current.setColorAt(idx, tempColor.current);

      data.instanceIndex = idx;
      idx++;
    }
    cometInstanceRef.current.count = idx;
    comaInstanceRef.current.count = showCometComaRef.current ? idx : 0;
    cometInstanceRef.current.instanceMatrix.needsUpdate = true;
    comaInstanceRef.current.instanceMatrix.needsUpdate = true;
    if (cometInstanceRef.current.instanceColor) { cometInstanceRef.current.instanceColor.needsUpdate = true; }
    if (comaInstanceRef.current.instanceColor) { comaInstanceRef.current.instanceColor.needsUpdate = true; }
  }, []);

  const createLabel = useCallback((text, color) => {
    const div = document.createElement("div");
    div.className = "satellite-body-label";
    div.textContent = text;
    div.style.cssText = `color: ${color}; font-size: 11px; font-weight: 700; padding: 2px 6px; background: rgba(0, 0, 0, 0.8); border-radius: 3px; border: 1px solid ${color}; pointer-events: none; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; white-space: nowrap; position: absolute; z-index: 5; transform: translate(-50%, -50%); transition: none;`;
    return new LabelObject(div);
  }, []);

  const createOrbitLine = useCallback((comet) => {
    if (!comet.elements) return null;
    try {
      const orbitPoints = [];
      const segments = 128;
      const e = comet.elements.e;
      const isBound = e < 1;
      const now = new Date(simulationDateMsRef.current);
      const directionSign = (speedMultiplierRef.current < 0) ? -1 : 1;

      if (isBound && comet.orbitalPeriodYears) {
        const periodDays = comet.orbitalPeriodYears * 365.25;
        for (let i = 0; i <= segments; i++) {
          const offset = directionSign * (i / segments) * periodDays * 86400000;
          const t = new Date(now.getTime() + offset);
          const pos = propagateComet(comet, t);
          if (pos) orbitPoints.push(pos);
        }
      } else {
        const q = comet.perihelionAU || (comet.elements.q !== undefined ? comet.elements.q : 1);
        const baseSpan = Math.max(365 * 5, q * 365 * 30);
        const halfSpan = baseSpan * 86400000;
        for (let i = 0; i <= segments; i++) {
          const fraction = (i / segments) * 2 - 1;
          const offset = directionSign * fraction * halfSpan;
          const t = new Date(now.getTime() + offset);
          const pos = propagateComet(comet, t);
          if (pos) orbitPoints.push(pos);
        }
      }

      if (orbitPoints.length < 2) return null;

      const positions = [];
      for (const p of orbitPoints) {
        positions.push(p.x, p.y, p.z);
      }

      const geometry = new LineGeometry();
      geometry.setPositions(positions);

      const material = new LineMaterial({
        color: comet.color,
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

  const createTrailLine = useCallback((comet) => {
    const positions = new Array(PERFORMANCE_CONSTANTS.TRAIL_LENGTH * 3).fill(0);
    const geometry = new LineGeometry();
    geometry.setPositions(positions);
    const material = new LineMaterial({
      color: comet.color,
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

  const updateTrailPositions = useCallback((comet, trail) => {
    const data = cometDataRef.current.get(comet.id);
    if (!data || !data.position) return;
    const pos = data.position;
    if (!Number.isFinite(pos.x) || !Number.isFinite(pos.y) || !Number.isFinite(pos.z)) return;

    let buffer = trailBuffersRef.current.get(comet.id);
    if (!buffer) {
      buffer = [];
      trailBuffersRef.current.set(comet.id, buffer);
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
    if (!cometGroupRef.current) return;
    const sats = cometsRef.current;
    const simNow = simulationDateMsRef.current;

    for (let i = 0; i < sats.length; i++) {
      const comet = sats[i];
      if (!comet.active) continue;

      if (orbitLinesRef.current[comet.id]) {
        const meta = orbitMetaRef.current.get(comet.id);
        const isBound = comet.elements && comet.elements.e < 1;
        const periodMs = isBound && comet.orbitalPeriodYears ? comet.orbitalPeriodYears * 365.25 * 86400000 : Infinity;
        const halfPeriodMs = periodMs / 2;
        const speedDir = Math.sign(speedMultiplierRef.current) || 1;
        const lastDir = meta && meta.lastDirection !== undefined ? meta.lastDirection : speedDir;
        const directionFlipped = speedDir !== lastDir;
        const elapsedMs = meta ? (simNow - meta.createdAtMs) : 0;
        const triggerRebuild = isBound && (
          (speedDir >= 0 && elapsedMs > halfPeriodMs) ||
          (speedDir < 0 && elapsedMs < -halfPeriodMs) ||
          directionFlipped
        );
        if (meta && triggerRebuild) {
          const old = orbitLinesRef.current[comet.id];
          cometGroupRef.current.remove(old);
          old.geometry.dispose();
          old.material.dispose();
          delete orbitLinesRef.current[comet.id];
          orbitMetaRef.current.delete(comet.id);
        }
      }

      if (showOrbitsRef.current && !orbitLinesRef.current[comet.id]) {
        const orbit = createOrbitLine(comet);
        if (orbit) {
          cometGroupRef.current.add(orbit);
          orbitLinesRef.current[comet.id] = orbit;
          orbitMetaRef.current.set(comet.id, { createdAtMs: simNow, lastDirection: Math.sign(speedMultiplierRef.current) || 1 });
        }
      }

      if (showTrailsRef.current && !trailLinesRef.current[comet.id]) {
        const trail = createTrailLine(comet);
        if (trail) {
          cometGroupRef.current.add(trail);
          trailLinesRef.current[comet.id] = trail;
        }
      }

      if (orbitLinesRef.current[comet.id]) {
        orbitLinesRef.current[comet.id].visible = showOrbitsRef.current;
      }

      if (trailLinesRef.current[comet.id]) {
        const trail = trailLinesRef.current[comet.id];
        trail.visible = showTrailsRef.current;
        if (showTrailsRef.current) {
          updateTrailPositions(comet, trail);
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
          cometGroupRef.current.remove(line);
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
          cometGroupRef.current.remove(line);
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

      const data = cometDataRef.current.get(id);
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

  const fetchCometData = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setLoading(true);
    setErrors([]);
    setComets([]);
    cometDataRef.current.clear();
    orbitMetaRef.current.clear();
    trailBuffersRef.current.clear();

    const seenIds = new Set();
    let activeCount = 0;
    let interactive = false;
    const startTime = performance.now();
    const url = `${import.meta.env.VITE_API_BASE_URL}/comet-stream`;

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
        setErrors(prev => [...prev, "Stream connection timed out — server did not respond."]);
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

    eventSource.addEventListener("batch", (event) => {
      try {
        const data = JSON.parse(event.data);
        if (!data.comets || data.comets.length === 0) return;
        const additions = [];
        for (const sat of data.comets) {
          if (seenIds.has(sat.id)) continue;
          seenIds.add(sat.id);
          const isActive = activeCount < PERFORMANCE_CONSTANTS.PRESELECT_COUNT;
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
        setComets(prev => prev.concat(additions));
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
          setErrors(prev => [...prev, `Failed to fetch ${data.source}: ${data.error}.`]);
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
      const r = await fetch(`${import.meta.env.VITE_API_BASE_URL}/comet-watch`);
      const j = await r.json();
      if (j.success) setNEOWatch(j.data);
    } catch (error) {} finally {
      setNEOWatchLoading(false);
    }
  }, []);

  const fetchNEOWatchAI = useCallback(async (force = false) => {
    if (!neoWatch) return;
    if (!force && neoWatchAI) return;
    setNEOWatchAILoading(true);
    try {
      const r = await fetch(`${import.meta.env.VITE_API_BASE_URL}/comet-watch-ai`, {
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

  const fetchMissionIntelligenceFor = useCallback(async (comet, force = false) => {
    if (!comet) return;
    if (!force && missionIntelMap.has(comet.designation)) return;

    if (intelAbortRef.current) {
      try { intelAbortRef.current.abort(); } catch (error) {}
    }
    const controller = new AbortController();
    intelAbortRef.current = controller;

    setMissionIntelLoading(true);
    try {
      const r = await fetch(`${import.meta.env.VITE_API_BASE_URL}/comet-intelligence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comet: enrichComet(comet) }),
        signal: controller.signal
      });
      const j = await r.json();
      if (j.data) {
        setMissionIntelMap(prev => {
          const next = new Map(prev);
          next.set(comet.designation, j.data);
          return next;
        });
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        setMissionIntelMap(prev => {
          const next = new Map(prev);
          next.set(comet.designation, { error: error.message });
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

  const fetchObservationDataFor = useCallback(async (comet, force = false) => {
    if (!comet) return;
    if (!force && observationMap.has(comet.designation)) return;

    if (observationAbortRef.current) {
      try { observationAbortRef.current.abort(); } catch (error) {}
    }
    const controller = new AbortController();
    observationAbortRef.current = controller;

    setObservationLoading(true);
    try {
      const r = await fetch(`${import.meta.env.VITE_API_BASE_URL}/comet-observation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comet: enrichComet(comet) }),
        signal: controller.signal
      });
      const j = await r.json();
      if (j.data) {
        setObservationMap(prev => {
          const next = new Map(prev);
          next.set(comet.designation, j.data);
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
      const r = await fetch(`${import.meta.env.VITE_API_BASE_URL}/comet-population-census`);
      const j = await r.json();
      if (j.success) setPHACatalog(j.populations);
    } catch (error) {} finally {
      setPHALoading(false);
    }
  }, []);

  const fetchSentryWatch = useCallback(async () => {
    setSentryLoading(true);
    try {
      const r = await fetch(`${import.meta.env.VITE_API_BASE_URL}/apparition-watch`);
      const j = await r.json();
      if (j.success) {
        setSentryCandidates(j.candidates || []);
        setSentryMethodology(j.methodology || null);
      }
    } catch (error) {} finally {
      setSentryLoading(false);
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

  const handleVirtualScroll = useCallback((event) => {
    setVirtualScrollOffset(event.target.scrollTop);
  }, []);

  const getVirtualScrollItems = useMemo(() => {
    if (!virtualScrollRef.current) {
      return { visibleItems: filteredComets.slice(0, 20), startIndex: 0, endIndex: 19 };
    }

    const containerHeight = virtualScrollRef.current.clientHeight || 400;
    const itemHeight = PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT;
    const buffer = PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_BUFFER;

    const startIndex = Math.max(0, Math.floor(virtualScrollOffset / itemHeight) - buffer);
    const endIndex = Math.min(
      filteredComets.length - 1,
      Math.ceil((virtualScrollOffset + containerHeight) / itemHeight) + buffer
    );

    const visibleItems = filteredComets.slice(startIndex, endIndex + 1);

    return { visibleItems, startIndex, endIndex };
  }, [filteredComets, virtualScrollOffset]);

  const stripInternalFields = (sat) => {
    const { _lowerName, _lowerCategory, _lowerDesignation, _lowerGroup, ...rest } = sat;
    return rest;
  };

  const exportJSON = useCallback(() => {
    const detailedComets = comets.map(comet => {
      const data = cometDataRef.current.get(comet.id);
      const position = data && data.position ? data.position : { x: 0, y: 0, z: 0 };
      const distance = Math.sqrt(position.x * position.x + position.y * position.y + position.z * position.z);

      return {
        ...stripInternalFields(comet),
        currentPosition: {
          x: position.x.toFixed(2),
          y: position.y.toFixed(2),
          z: position.z.toFixed(2)
        },
        currentHelioDistanceAU: (distance / ORBITAL_CONSTANTS.SCALE_FACTOR).toFixed(6),
        currentActivityProxy: data ? data.activity : null,
        propagationModel: comet.elements && comet.elements.e >= 1 ? "Hyperbolic Kepler" : (comet.elements && Math.abs(comet.elements.e - 1) < 1e-4 ? "Barker (parabolic)" : "Two-body Kepler"),
        hasOrbit: !!comet.elements,
        visible: visibleCometsRef.current.has(comet.id)
      };
    });

    const exportData = {
      comets: detailedComets,
      cometWatch: neoWatch,
      closeApproaches: closeApproaches,
      simulationTime: new Date(simulationDateMsRef.current).toISOString(),
      hudReadouts: {
        activeComets: comets.filter(s => s.active).length,
        actualFps,
        currentTime,
        speedMultiplier,
        performanceStats
      },
      loadingMetadata,
      apiErrors: errors,
      orbitPropagation: {
        keplerCount: comets.filter(s => s.elements && s.elements.e < 1).length,
        hyperbolicCount: comets.filter(s => s.elements && s.elements.e > 1).length,
        nearParabolicCount: comets.filter(s => s.elements && Math.abs(s.elements.e - 1) < 1e-4).length,
        fallbackCount: comets.filter(s => !s.elements).length
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "comet_catalog.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [comets, neoWatch, closeApproaches, actualFps, currentTime, speedMultiplier, performanceStats, loadingMetadata, errors]);

  const exportCSV = useCallback(() => {
    let csv = "ID,Name,Designation,Category,Group,PerihelionAU,Eccentricity,InclinationDeg,RAANDeg,ArgPerihelionDeg,SemiMajorAxisAU,AphelionAU,PeriodYears,PerihelionTimeJD,MeanVelocityKmS,M1,K1,M2,K2,A1,A2,A3,DiameterKm,ActivityStatus,IsBound,MOIDAU,ObservationArcDays,NumObs,EpochISO,PositionX,PositionY,PositionZ,HelioDistanceAU,ActivityProxy,PropagationModel,HasOrbit,Visible\n";

    comets.forEach(comet => {
      const e = enrichComet(comet);
      const data = cometDataRef.current.get(comet.id);
      const position = data && data.position ? data.position : { x: 0, y: 0, z: 0 };
      const distance = Math.sqrt(position.x * position.x + position.y * position.y + position.z * position.z);
      const visible = visibleCometsRef.current.has(comet.id);
      const propModel = e.elements && e.elements.e >= 1 ? "Hyperbolic" : (e.elements && Math.abs(e.elements.e - 1) < 1e-4 ? "Barker" : "Kepler");

      csv += `${e.id},"${e.name}","${e.designation || ""}",${e.category},"${e.group || ""}",${e.perihelionAU || ""},${e.eccentricity || ""},${e.inclination || ""},${e.raan || ""},${e.argOfPerihelion || ""},${e.semiMajorAxisAU || ""},${e.aphelionAU || ""},${e.orbitalPeriodYears || ""},${e.perihelionTime || ""},${e.meanVelocity || ""},${e.m1 !== null && e.m1 !== undefined ? e.m1 : ""},${e.k1 !== null && e.k1 !== undefined ? e.k1 : ""},${e.m2 !== null && e.m2 !== undefined ? e.m2 : ""},${e.k2 !== null && e.k2 !== undefined ? e.k2 : ""},${e.a1 !== null && e.a1 !== undefined ? e.a1 : ""},${e.a2 !== null && e.a2 !== undefined ? e.a2 : ""},${e.a3 !== null && e.a3 !== undefined ? e.a3 : ""},${e.diameter || ""},${e.activityStatus || ""},${!!e.isBound},${e.moidAU !== null && e.moidAU !== undefined ? e.moidAU : ""},${e.observationArcDays || ""},${e.numObs || ""},${e.epochISO || ""},${position.x.toFixed(2)},${position.y.toFixed(2)},${position.z.toFixed(2)},${(distance / ORBITAL_CONSTANTS.SCALE_FACTOR).toFixed(6)},${data ? data.activity : ""},${propModel},${!!e.elements},${visible}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "comet_catalog.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [comets]);

  const exportText = useCallback(() => {
    const header = `# Comet Tracker Data Export\n# Generated: ${new Date().toISOString()}\n# Simulation Time: ${new Date(simulationDateMsRef.current).toISOString()}\n# Total Comets: ${comets.length}\n# Format: Name | Designation | Cat | Group | q(AU) | e | i(deg) | Period(y) | Q(AU) | v(km/s) | M1 | K1 | Diameter(km) | Activity | MOID(AU) | Arc(d)\n#\n`;
    const rows = comets.map(s => {
      const e = enrichComet(s);
      return `${e.name} | ${e.designation || ""} | ${e.category} | ${e.group || ""} | ${e.perihelionAU || ""} | ${e.eccentricity || ""} | ${e.inclination || ""} | ${e.orbitalPeriodYears || ""} | ${e.aphelionAU || ""} | ${e.meanVelocity || ""} | ${e.m1 !== null && e.m1 !== undefined ? e.m1 : ""} | ${e.k1 !== null && e.k1 !== undefined ? e.k1 : ""} | ${e.diameter || ""} | ${e.activityStatus || ""} | ${e.moidAU !== null && e.moidAU !== undefined ? e.moidAU : ""} | ${e.observationArcDays || ""}`;
    }).join("\n");

    const blob = new Blob([header + rows + "\n"], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "comet_catalog.txt";
    a.click();
    URL.revokeObjectURL(url);
  }, [comets]);

  const toggleComet = useCallback((id) => {
    setComets(prev => prev.map(comet =>
      comet.id === id ? { ...comet, active: !comet.active } : comet
    ));
  }, []);

  const selectAllComets = useCallback(() => {
    setComets(prev => prev.map(comet => ({ ...comet, active: true })));
  }, []);

  const deselectAllComets = useCallback(() => {
    setComets(prev => prev.map(comet => ({ ...comet, active: false })));
  }, []);

  const togglePlay = useCallback(() => setIsPlaying(p => !p), []);
  const toggleOrbits = useCallback(() => setShowOrbits(v => !v), []);
  const toggleTrails = useCallback(() => setShowTrails(v => !v), []);
  const toggleLabels = useCallback(() => setShowLabels(v => !v), []);
  const toggleEclipticGrid = useCallback(() => setShowEclipticGrid(v => !v), []);
  const toggleAxisMarkers = useCallback(() => setShowAxisMarkers(v => !v), []);
  const toggleOrbitalZones = useCallback(() => setShowOrbitalZones(v => !v), []);
  const toggleDistanceRings = useCallback(() => setShowDistanceRings(v => !v), []);
  const toggleCometComa = useCallback(() => setShowCometComa(v => !v), []);
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
      try { t.stop(); } catch (error) {}
    }
    activeTweensRef.current = [];
  }, []);

  const zoomToComet = useCallback((id) => {
    const data = cometDataRef.current.get(id);
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

  const openDossier = useCallback((comet) => {
    closeAllOverlayPanels();
    setDetailedComet(comet);
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
    if (!detailedComet) {
      if (intelAbortRef.current) {
        try { intelAbortRef.current.abort(); } catch (error) {}
        intelAbortRef.current = null;
      }
      if (observationAbortRef.current) {
        try { observationAbortRef.current.abort(); } catch (error) {}
        observationAbortRef.current = null;
      }
    }
  }, [detailedComet]);

  useEffect(() => {
    if (!selectedComet) return;
    const exists = comets.some(s => s.id === selectedComet && s.active);
    if (!exists) {
      setSelectedComet(null);
    }
  }, [comets, selectedComet]);

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
      setFilteredComets(comets);
      return;
    }
    const filtered = comets.filter(comet =>
      (comet._lowerName && comet._lowerName.includes(lower)) ||
      (comet._lowerCategory && comet._lowerCategory.includes(lower)) ||
      (comet._lowerDesignation && comet._lowerDesignation.includes(lower)) ||
      (comet._lowerGroup && comet._lowerGroup.includes(lower))
    );
    setFilteredComets(filtered);
  }, [comets, debouncedSearchTerm]);

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

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 16000);
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

    const composer = new EffectComposer(renderer);
    composerRef.current = composer;

    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.9, 0.5, 0.22);
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
    const coronaVertexShader = `
      varying vec3 vNormal;
      varying vec3 vPositionNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPositionNormal = normalize((modelViewMatrix * vec4(position, 1.0)).xyz);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
    const coronaFragmentShader = `
      varying vec3 vNormal;
      varying vec3 vPositionNormal;
      void main() {
        float intensity = pow(0.7 - dot(vNormal, vPositionNormal), 4.0);
        vec3 hotColor = vec3(1.0, 0.85, 0.45);
        vec3 outerColor = vec3(0.9, 0.5, 0.2);
        vec3 coronaColor = mix(hotColor, outerColor, intensity);
        float hdrBoost = 1.5 + intensity * 1.2;
        gl_FragColor = vec4(coronaColor * hdrBoost, 1.0) * intensity * 0.9;
      }
    `;
    const coronaMaterial = new THREE.ShaderMaterial({
      vertexShader: coronaVertexShader,
      fragmentShader: coronaFragmentShader,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false
    });
    const corona = new THREE.Mesh(coronaGeometry, coronaMaterial);
    sunGroup.add(corona);

    const flareGeometry = new THREE.SphereGeometry(SCENE_SUN_RADIUS * 2.5, 64, 64);
    const flareMaterial = new THREE.ShaderMaterial({
      vertexShader: coronaVertexShader,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPositionNormal;
        void main() {
          float intensity = pow(0.5 - dot(vNormal, vPositionNormal), 6.0);
          vec3 flareColor = vec3(1.0, 0.7, 0.3);
          gl_FragColor = vec4(flareColor, 1.0) * intensity * 0.4;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false
    });
    const flare = new THREE.Mesh(flareGeometry, flareMaterial);
    sunGroup.add(flare);

    const sunLight = new THREE.PointLight(0xFFFFFF, 2.5, 0, 0);
    sunGroup.add(sunLight);

    scene.add(sunGroup);
    sunRef.current = sunGroup;

    const earthMarkerGeometry = new THREE.SphereGeometry(0.6, 16, 16);
    const earthMarkerMaterial = new THREE.MeshBasicMaterial({ color: 0x42A5F5 });
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

    const cometGroup = new THREE.Group();
    scene.add(cometGroup);
    cometGroupRef.current = cometGroup;

    const cometGeometry = new THREE.SphereGeometry(0.4, 8, 8);
    const cometMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 1.0 });
    const cometInstance = new THREE.InstancedMesh(cometGeometry, cometMaterial, PERFORMANCE_CONSTANTS.MAX_VISIBLE_COMETS);
    cometInstance.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    cometInstance.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(PERFORMANCE_CONSTANTS.MAX_VISIBLE_COMETS * 3), 3);
    cometInstance.count = 0;
    cometGroup.add(cometInstance);
    cometInstanceRef.current = cometInstance;

    const comaGeometry = new THREE.SphereGeometry(1.0, 12, 12);
    const comaMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.25, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false });
    const comaInstance = new THREE.InstancedMesh(comaGeometry, comaMaterial, PERFORMANCE_CONSTANTS.MAX_VISIBLE_COMETS);
    comaInstance.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    comaInstance.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(PERFORMANCE_CONSTANTS.MAX_VISIBLE_COMETS * 3), 3);
    comaInstance.count = 0;
    cometGroup.add(comaInstance);
    comaInstanceRef.current = comaInstance;

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
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        uniform float time;

        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

          float twinkle = sin(time * 1.5 + position.x * 0.01 + position.y * 0.01) * 0.15 + 0.85;

          gl_PointSize = size * twinkle * (200.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;

        void main() {
          float distance = length(gl_PointCoord - vec2(0.5));
          if (distance > 0.5) discard;

          float alpha = 1.0 - smoothstep(0.0, 0.5, distance);
          alpha *= alpha;

          float coreBrightness = smoothstep(0.2, 0.0, distance) * 1.2;
          vec3 hdrColor = vColor * (1.0 + coreBrightness);

          gl_FragColor = vec4(hdrColor, alpha * 0.9);
        }
      `,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending
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
  }, []);

  useEffect(() => {
    if (sceneInitialized) {
      fetchCometData();
      const interval = setInterval(() => fetchCometData(), 60 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [sceneInitialized, fetchCometData]);

  useEffect(() => {
    if (gridRef.current) gridRef.current.visible = showGrid;
  }, [showGrid]);

  useEffect(() => {
    if (eclipticGridRef.current) eclipticGridRef.current.visible = showEclipticGrid;
  }, [showEclipticGrid]);

  useEffect(() => {
    if (axisMarkersRef.current) axisMarkersRef.current.visible = showAxisMarkers;
  }, [showAxisMarkers]);

  useEffect(() => {
    if (orbitalZonesRef.current) orbitalZonesRef.current.visible = showOrbitalZones;
  }, [showOrbitalZones]);

  useEffect(() => {
    if (distanceRingsRef.current) distanceRingsRef.current.visible = showDistanceRings;
  }, [showDistanceRings]);

  useEffect(() => {
    if (bloomPassRef.current) {
      bloomPassRef.current.enabled = bloomEnabled;
      bloomPassRef.current.strength = bloomStrength;
      bloomPassRef.current.radius = bloomRadius;
      bloomPassRef.current.threshold = bloomThreshold;
    }
  }, [bloomEnabled, bloomStrength, bloomRadius, bloomThreshold]);

  useEffect(() => {
    Object.keys(labelsRef.current).forEach(cometId => {
      const label = labelsRef.current[cometId];
      if (label && label.element) {
        if (!comets.find(s => s.id === cometId && s.active)) {
          if (label.element.parentNode) {
            label.element.parentNode.removeChild(label.element);
          }
          delete labelsRef.current[cometId];
        }
      }
    });

    comets.forEach(comet => {
      if (comet.active && !labelsRef.current[comet.id]) {
        const label = createLabel(comet.name, comet.color);
        labelsRef.current[comet.id] = label;
        if (labelRendererRef.current) {
          labelRendererRef.current.appendChild(label.element);
        }
      }
    });
  }, [comets, createLabel]);

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
            visibleComets: visibleCometsRef.current.size,
            culledComets: Math.max(0, cometsRef.current.filter(s => s.active).length - visibleCometsRef.current.size)
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
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
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
        const newApp = detectCloseApproaches(cometsRef.current, cometDataRef.current, closeApproachThresholdRef.current, new Date(simulationDateMsRef.current));
        setCloseApproaches(newApp);
      }

      TWEEN.update(time);

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

  const enrichedDetailedComet = useMemo(() => {
    return detailedComet ? enrichComet(detailedComet) : null;
  }, [detailedComet]);

  const selectedCometObj = useMemo(() => {
    if (!selectedComet) return null;
    return comets.find(s => s.id === selectedComet) || null;
  }, [comets, selectedComet]);

  const activeComets = useMemo(() => comets.filter(s => s.active).length, [comets]);
  const keplerCount = useMemo(() => comets.filter(s => s.elements && s.elements.e < 1).length, [comets]);
  const hyperbolicCount = useMemo(() => comets.filter(s => s.elements && s.elements.e > 1).length, [comets]);
  const nearParabolicCount = useMemo(() => comets.filter(s => s.elements && Math.abs(s.elements.e - 1) < 1e-4).length, [comets]);
  const activeStatusCount = useMemo(() => comets.filter(s => s.activityStatus === "Active").length, [comets]);
  const earthCrossingCount = useMemo(() => comets.filter(s => s.perihelionAU !== null && s.perihelionAU !== undefined && s.perihelionAU < 1.017).length, [comets]);
  const sungrazerCount = useMemo(() => comets.filter(s => s.perihelionAU !== null && s.perihelionAU !== undefined && s.perihelionAU < 0.01).length, [comets]);

  const orbitArcStats = useMemo(() => {
    const stats = { multiDecade: 0, multiYear: 0, yearClass: 0, shortArc: 0, veryShort: 0, unknown: 0 };
    comets.forEach(s => {
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
  }, [comets]);

  const categoryCounts = useMemo(() => {
    return comets.reduce((acc, comet) => {
      if (comet.active) {
        acc[comet.category] = (acc[comet.category] || 0) + 1;
      }
      return acc;
    }, {});
  }, [comets]);

  const speedLabel = useMemo(() => {
    const match = SPEED_OPTIONS.find(o => o.value === speedMultiplier);
    return match ? match.label : `${speedMultiplier}x`;
  }, [speedMultiplier]);

  const { visibleItems, startIndex } = getVirtualScrollItems;

  const currentMissionIntel = detailedComet ? missionIntelMap.get(detailedComet.designation) : null;
  const currentObservation = detailedComet ? observationMap.get(detailedComet.designation) : null;

  const renderOrbitalDossierContent = () => {
    if (!enrichedDetailedComet) return null;
    const sat = enrichedDetailedComet;
    const advanced = computeAdvancedDerivatives(sat);
    const liveData = cometDataRef.current.get(sat.id);
    const isVisible = visibleCometsRef.current.has(sat.id);
    const ageDays = sat.observationArcDays;
    const arcColor = orbitArcAgeColor(ageDays);
    const eccLabel = sat.eccentricity < 0.1 ? "low-e" : sat.eccentricity < 0.5 ? "moderate" : sat.eccentricity < 0.9 ? "highly elliptical" : sat.eccentricity < 1 ? "near-parabolic" : sat.eccentricity < 1.05 ? "marginally hyperbolic" : "hyperbolic";
    const inclLabel = sat.inclination < 5 ? "low" : sat.inclination < 30 ? "moderate" : sat.inclination < 60 ? "high" : sat.inclination < 90 ? "near-polar" : "retrograde";
    const livePosition = liveData?.position;
    const liveDistanceFromSun = livePosition ? livePosition.length() / ORBITAL_CONSTANTS.SCALE_FACTOR : null;
    const earthData = cometDataRef.current.get("__earth__");
    const earthDistance = livePosition && earthData?.position ? livePosition.distanceTo(earthData.position) / ORBITAL_CONSTANTS.SCALE_FACTOR : null;
    const liveActivity = liveData?.activity;
    const liveApparentMag = liveDistanceFromSun !== null && earthDistance !== null ? apparentMagnitude(sat.m1, sat.k1, liveDistanceFromSun, earthDistance) : null;

    return (
      <div className="dinoSatDossierTabContent">
        <div className="dinoSatStatTileGrid">
          <StatTile label="Status" value={sat.activityStatus || "Active"} sub={`${sat.category} · ${sat.isBound ? "Periodic" : "Single-apparition"}`} color={activityColor(sat.activityStatus)} accent={sat.color} large />
          <StatTile label="Designation" value={sat.designation || "—"} sub={sat.group || "Unclassified"} accent="#42a5f5" />
          <StatTile label="Observation Arc" value={ageDays !== null && ageDays !== undefined ? `${Math.round(ageDays)}d` : "?"} sub={orbitArcAgeLabel(ageDays)} color={arcColor} accent={arcColor} />
          <StatTile label="Perihelion (q)" value={sat.perihelionAU} unit="AU" sub={sat.aphelionAU !== null ? `Aphelion ${sat.aphelionAU} AU` : "Unbound"} accent="#42a5f5" />
          {sat.orbitalPeriodYears !== null && <StatTile label="Period" value={sat.orbitalPeriodYears} unit="years" sub={`${sat.orbitalPeriodDays} days`} accent="#42a5f5" />}
          <StatTile label="Inclination" value={`${sat.inclination}°`} sub={`${inclLabel} · Ω ${sat.raan}°`} accent="#42a5f5" />
          <StatTile label="Eccentricity" value={sat.eccentricity} sub={eccLabel} accent="#42a5f5" />
          {sat.meanVelocity !== null && <StatTile label="Mean Velocity" value={sat.meanVelocity} unit="km/s" sub={`q: ${sat.velocityAtPerihelion} / Q: ${sat.velocityAtAphelion}`} accent="#42a5f5" />}
          {advanced.isSungrazer && <StatTile label="Sungrazer" value="Yes" sub="q < 0.01 AU" color="#FFD060" accent="#FFD060" />}
          {advanced.isInterstellar && <StatTile label="Interstellar" value="Yes" sub="e > 1.05" color="#FF4081" accent="#FF4081" />}
          {sat.moidAU !== null && sat.moidAU !== undefined && <StatTile label="Earth MOID" value={sat.moidAU.toFixed(6)} unit="AU" sub={moidLabel(sat.moidAU)} color={moidColor(sat.moidAU)} accent={moidColor(sat.moidAU)} />}
          {sat.m1 !== null && sat.m1 !== undefined && <StatTile label="Total Magnitude M1" value={sat.m1.toFixed(2)} sub={`Slope K1=${sat.k1?.toFixed(2) || "10"}`} accent="#FFD060" />}
          {liveApparentMag !== null && <StatTile label="Live Apparent Mag" value={liveApparentMag.toFixed(2)} sub={liveApparentMag < 6 ? "Naked eye" : liveApparentMag < 10 ? "Binoculars" : "Telescope"} color="#FFD060" accent="#FFD060" />}
          {sat.diameter && <StatTile label="Nucleus Diameter" value={sat.diameter} unit="km" accent="#42a5f5" />}
          {sat.elements && <StatTile label="Render State" value={isVisible ? "Visible" : "Culled"} sub="Heliocentric Ecliptic" color={isVisible ? "#4ade80" : "#fb923c"} accent={isVisible ? "#4ade80" : "#fb923c"} />}
          {advanced.tisserandJupiter !== null && <StatTile label="Tisserand (J)" value={advanced.tisserandJupiter} sub={tisserandFamilyLabel(advanced.tisserandJupiter)} accent="#42a5f5" />}
          {liveActivity !== undefined && liveActivity !== null && <StatTile label="Activity Proxy" value={liveActivity.toFixed(3)} sub="1/rH^2.5 outgassing" color="#4ade80" accent="#4ade80" />}
        </div>

        <div className="dinoSatDossierGrid">
          <div className="dinoSatPanelCard">
            <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faRulerCombined} /> Cometary Orbital Elements</span></div>
            <div className="dinoSatPanelCardBody">
              <div className="dinosatSatelliteHUDSectionGrid">
                <div className="dinosatSatelliteHUDSectionItem"><span>Perihelion (q)</span><span>{sat.perihelionAU} AU</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Eccentricity (e)</span><span>{sat.eccentricity}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Inclination (i)</span><span>{sat.inclination}°</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Long. Asc. Node (Ω)</span><span>{sat.raan}°</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Arg. Perihelion (ω)</span><span>{sat.argOfPerihelion}°</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Time of Perihelion (Tp)</span><span>{sat.perihelionTime !== null ? `JD ${sat.perihelionTime}` : "—"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Mean Anomaly (M)</span><span>{sat.meanAnomaly !== null ? `${sat.meanAnomaly}°` : "—"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Mean Motion (n)</span><span>{sat.meanMotion !== null ? `${sat.meanMotion} °/d` : "—"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Semi-Major Axis (a)</span><span>{sat.semiMajorAxisAU !== null ? `${sat.semiMajorAxisAU} AU` : "—"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Aphelion (Q)</span><span>{sat.aphelionAU !== null ? `${sat.aphelionAU} AU` : "Unbound"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Aphelion/Perihelion</span><span>{sat.aphelionAU && sat.perihelionAU ? (sat.aphelionAU / sat.perihelionAU).toFixed(3) : "—"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Bound</span><span style={{ color: sat.isBound ? "#4ade80" : "#fb923c" }}>{sat.isBound ? "Yes" : "No"}</span></div>
              </div>
            </div>
          </div>

          <div className="dinoSatPanelCard">
            <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faAtom} /> Derived Orbital Mechanics</span></div>
            <div className="dinoSatPanelCardBody">
              <div className="dinosatSatelliteHUDSectionGrid">
                <div className="dinosatSatelliteHUDSectionItem"><span>Mean Velocity</span><span>{sat.meanVelocity !== null ? `${sat.meanVelocity} km/s` : "—"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Velocity at q</span><span>{sat.velocityAtPerihelion !== null ? `${sat.velocityAtPerihelion} km/s` : "—"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Velocity at Q</span><span>{sat.velocityAtAphelion !== null ? `${sat.velocityAtAphelion} km/s` : "—"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Specific Energy</span><span>{sat.specificEnergy !== null ? `${sat.specificEnergy} km²/s²` : "—"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Angular Momentum</span><span>{sat.angularMomentum !== null ? `${sat.angularMomentum} km²/s` : "—"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Tisserand (Jupiter)</span><span>{advanced.tisserandJupiter !== null ? advanced.tisserandJupiter : "—"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>T_J Family</span><span>{tisserandFamilyLabel(advanced.tisserandJupiter)}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Orbit Circumference</span><span>{advanced.orbitCircumferenceAU !== null ? `${advanced.orbitCircumferenceAU} AU` : "—"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Long. of Perihelion</span><span>{advanced.heliocentricLongPerihelion}°</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Earth-crossing</span><span>{advanced.earthCrossing ? "Yes" : "No"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Mars-crossing</span><span>{advanced.marsCrossing ? "Yes" : "No"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Jupiter-crossing</span><span>{advanced.jupiterCrossing ? "Yes" : "No"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Sungrazer</span><span style={{ color: advanced.isSungrazer ? "#FFD060" : "#5a7068" }}>{advanced.isSungrazer ? "Yes" : "No"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Interstellar</span><span style={{ color: advanced.isInterstellar ? "#FF4081" : "#5a7068" }}>{advanced.isInterstellar ? "Yes" : "No"}</span></div>
              </div>
            </div>
          </div>

          <div className="dinoSatPanelCard">
            <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faSnowflake} /> Activity & Brightness</span></div>
            <div className="dinoSatPanelCardBody">
              <div className="dinosatSatelliteHUDSectionGrid">
                <div className="dinosatSatelliteHUDSectionItem"><span>Total Magnitude M1</span><span>{sat.m1 !== null && sat.m1 !== undefined ? sat.m1.toFixed(2) : "—"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Slope Parameter K1</span><span>{sat.k1 !== null && sat.k1 !== undefined ? sat.k1.toFixed(2) : "—"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Nuclear Magnitude M2</span><span>{sat.m2 !== null && sat.m2 !== undefined ? sat.m2.toFixed(2) : "—"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Nuclear Slope K2</span><span>{sat.k2 !== null && sat.k2 !== undefined ? sat.k2.toFixed(2) : "—"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Non-Grav A1 (radial)</span><span>{sat.a1 !== null && sat.a1 !== undefined ? sat.a1.toExponential(3) : "—"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Non-Grav A2 (transverse)</span><span>{sat.a2 !== null && sat.a2 !== undefined ? sat.a2.toExponential(3) : "—"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Non-Grav A3 (normal)</span><span>{sat.a3 !== null && sat.a3 !== undefined ? sat.a3.toExponential(3) : "—"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Activity Status</span><span style={{ color: activityColor(sat.activityStatus) }}>{sat.activityStatus || "Unknown"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Activity Proxy (1/rH^2.5)</span><span>{liveActivity !== undefined && liveActivity !== null ? liveActivity.toFixed(4) : "—"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Live Apparent Magnitude</span><span>{liveApparentMag !== null ? liveApparentMag.toFixed(2) : "—"}</span></div>
              </div>
            </div>
          </div>

          <div className="dinoSatPanelCard">
            <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faEye} /> Hazard & Approach Geometry</span></div>
            <div className="dinoSatPanelCardBody">
              <div className="dinosatSatelliteHUDSectionGrid">
                <div className="dinosatSatelliteHUDSectionItem"><span>Earth MOID</span><span style={{ color: moidColor(sat.moidAU) }}>{sat.moidAU !== null && sat.moidAU !== undefined ? `${sat.moidAU.toFixed(6)} AU` : "—"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Earth MOID (LD)</span><span>{sat.moidAU !== null && sat.moidAU !== undefined ? (sat.moidAU * AU_KM / 384400).toFixed(2) : "—"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Earth MOID (km)</span><span>{sat.moidAU !== null && sat.moidAU !== undefined ? Math.round(sat.moidAU * AU_KM).toLocaleString() : "—"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Jupiter MOID</span><span>{sat.jupiterMOIDAU !== null && sat.jupiterMOIDAU !== undefined ? `${sat.jupiterMOIDAU.toFixed(4)} AU` : "—"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Hazard Tier</span><span style={{ color: moidColor(sat.moidAU) }}>{moidLabel(sat.moidAU)}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Comet Hazard Note</span><span>Non-grav forces dominate</span></div>
              </div>
            </div>
          </div>

          <div className="dinoSatPanelCard">
            <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faSatellite} /> Identity & Provenance</span></div>
            <div className="dinoSatPanelCardBody">
              <div className="dinosatSatelliteHUDSectionGrid">
                <div className="dinosatSatelliteHUDSectionItem"><span>Name</span><span>{sat.name}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Designation</span><span>{sat.designation || "—"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Population</span><span>{sat.category}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Group</span><span>{sat.group || "—"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Status</span><span style={{ color: activityColor(sat.activityStatus) }}>{sat.activityStatus || "Unknown"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Source</span><span>{sat.source || "JPL SBDB"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Propagation</span><span style={{ color: "#4ade80" }}>{sat.elements && sat.elements.e >= 1 ? "Hyperbolic Kepler" : (sat.elements && Math.abs(sat.elements.e - 1) < 1e-4 ? "Barker (parabolic)" : "Two-body Kepler")}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Has Elements</span><span>{sat.elements ? "Yes" : "No"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Epoch (JD)</span><span>{sat.elements?.epoch !== undefined ? sat.elements.epoch : "—"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Number of Obs</span><span>{sat.numObs || "?"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Apparitions Observed</span><span>{sat.apparitionCount || "?"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Diameter Estimate</span><span>{sat.diameter ? `${sat.diameter} km` : "—"}</span></div>
              </div>
            </div>
          </div>

          {sat.elements && livePosition && (
            <div className="dinoSatPanelCard">
              <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faGauge} /> Live State Vector (Heliocentric Ecliptic)</span></div>
              <div className="dinoSatPanelCardBody">
                <div className="dinosatSatelliteHUDSectionGrid">
                  <div className="dinosatSatelliteHUDSectionItem"><span>Rendering</span><span style={{ color: "#4ade80" }}>Instanced</span></div>
                  <div className="dinosatSatelliteHUDSectionItem"><span>Position Source</span><span style={{ color: "#4ade80" }}>{sat.elements.e >= 1 ? "Hyperbolic Kepler" : (Math.abs(sat.elements.e - 1) < 1e-4 ? "Barker" : "Two-body Kepler")}</span></div>
                  <div className="dinosatSatelliteHUDSectionItem"><span>Visibility</span><span style={{ color: isVisible ? "#4ade80" : "#fb923c" }}>{isVisible ? "Visible" : "Culled"}</span></div>
                  <div className="dinosatSatelliteHUDSectionItem"><span>Coordinate Frame</span><span>Ecliptic J2000</span></div>
                  <div className="dinosatSatelliteHUDSectionItem"><span>X (scene)</span><span>{livePosition.x.toFixed(3)}</span></div>
                  <div className="dinosatSatelliteHUDSectionItem"><span>Y (scene)</span><span>{livePosition.y.toFixed(3)}</span></div>
                  <div className="dinosatSatelliteHUDSectionItem"><span>Z (scene)</span><span>{livePosition.z.toFixed(3)}</span></div>
                  <div className="dinosatSatelliteHUDSectionItem"><span>Heliocentric Distance</span><span>{liveDistanceFromSun ? `${liveDistanceFromSun.toFixed(4)} AU` : "—"}</span></div>
                  <div className="dinosatSatelliteHUDSectionItem"><span>Earth Distance</span><span>{earthDistance ? `${earthDistance.toFixed(4)} AU` : "—"}</span></div>
                  <div className="dinosatSatelliteHUDSectionItem"><span>Earth Distance (LD)</span><span>{earthDistance ? (earthDistance * AU_KM / 384400).toFixed(2) : "—"}</span></div>
                </div>
              </div>
            </div>
          )}

          <div className="dinoSatPanelCard">
            <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faBookOpen} /> Operational Implications</span></div>
            <div className="dinoSatPanelCardBody">
              <div className="dinoSatBriefingGrid">
                <div className="dinoSatBriefingItem"><b>Population Class</b><p>{sat.category} comet at perihelion {sat.perihelionAU} AU. {advanced.earthCrossing ? "Earth-crossing trajectory; perihelion below 1.017 AU." : advanced.marsCrossing ? "Mars-crossing without entering Earth's neighborhood." : "Outer-system orbit clear of inner planets."} {advanced.isSungrazer ? "Sungrazer with perihelion below 0.01 AU; expected to undergo extreme thermal stress at perihelion." : ""}</p></div>
                <div className="dinoSatBriefingItem"><b>Hazard Profile</b><p>{sat.moidAU !== null && sat.moidAU !== undefined && sat.moidAU < 0.05 ? `Earth MOID ${sat.moidAU?.toFixed(6)} AU is comet-close. Non-gravitational acceleration from outgassing dominates ephemeris error.` : sat.moidAU !== null && sat.moidAU !== undefined && sat.moidAU < 0.5 ? "Close-Earth orbit but well clear of impact concern." : "No imminent close-approach concerns."}</p></div>
                <div className="dinoSatBriefingItem"><b>Mission Accessibility</b><p>{sat.isBound && sat.semiMajorAxisAU !== null && sat.semiMajorAxisAU < 4 ? "Short-period comet; favorable for periodic rendezvous and sample-return missions." : sat.semiMajorAxisAU !== null && sat.semiMajorAxisAU > 5 ? "Outer-system; high-Δv mission, gravity assist required." : !sat.isBound ? "Unbound trajectory; flyby-only mission window with single apparition opportunity." : "Moderate Δv; mission window dependent on perihelion-passage timing."}</p></div>
                <div className="dinoSatBriefingItem"><b>Tisserand Classification</b><p>{advanced.tisserandJupiter !== null ? (advanced.tisserandJupiter < 2 ? "Tisserand parameter below 2 indicates Halley-type or long-period dynamics; orbit is decoupled from Jupiter and may be highly inclined or retrograde." : advanced.tisserandJupiter < 3 ? "Tisserand parameter 2-3 indicates Jupiter-family dynamics; orbit is gravitationally coupled to Jupiter and shows significant non-gravitational forces." : "Asteroid-like dynamics decoupled from Jupiter on short timescales.") : "Tisserand parameter unavailable (unbound or undefined a)."}</p></div>
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
              <label>Loading Comet Data...</label>
              <div className="dinoSatSatelliteSideBarLoadingBar">
                <div className="dinoSatSatelliteSideBarLoadingBarAccent" />
              </div>
              <small>Fetching from JPL SBDB, MPC Comet Tracker, CNEOS...</small>
            </div>
          )}

          <div className="dinoSatSatelliteSideBarHeader">
            <h1>
              {!sidebarCollapsed && <small>Comet Tracker</small>}
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
                        <button onClick={(event) => { event.stopPropagation(); copyAllErrors(); }} aria-label="Copy all errors">
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
                <input type="text" placeholder="Search comets..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="dinoSatSatelliteSearchInput" />
                <div className="dinoSatSatelliteSelectControls">
                  <button className="dinoSatSatelliteSelectButton" onClick={selectAllComets}>All</button>
                  <button className="dinoSatSatelliteSelectButton" onClick={deselectAllComets}>None</button>
                  <button className="dinoSatSatelliteSelectButton" onClick={fetchCometData}>Refresh</button>
                </div>
                <div className="dinoSatSatelliteSelectControls">
                  <button className={`dinoSatSatelliteSelectButton ${colorByObservationArc ? "dinoSatSatelliteButtonActive" : ""}`} onClick={() => setColorByObservationArc(v => !v)}>
                    {colorByObservationArc ? "Color: Arc Quality" : "Color: Population"}
                  </button>
                </div>
              </div>

              <div className="dinoSatSatelliteTLEQualityBar">
                <div className="dinoSatTLEQualityCount" style={{ color: "#4ade80" }} title="Multi-decade arc"><b>{orbitArcStats.multiDecade}</b><span>decade+</span></div>
                <div className="dinoSatTLEQualityCount" style={{ color: "#84cc16" }} title="Multi-year arc"><b>{orbitArcStats.multiYear}</b><span>year+</span></div>
                <div className="dinoSatTLEQualityCount" style={{ color: "#facc15" }} title="Year-class arc"><b>{orbitArcStats.yearClass}</b><span>~year</span></div>
                <div className="dinoSatTLEQualityCount" style={{ color: "#fb923c" }} title="Short arc"><b>{orbitArcStats.shortArc}</b><span>short</span></div>
                <div className="dinoSatTLEQualityCount" style={{ color: "#ef4444" }} title="Very short arc"><b>{orbitArcStats.veryShort}</b><span>v.short</span></div>
              </div>

              <div className="dinoSatSatelliteObjectsHeader">
                <span className="dinoSatSatelliteObjectsHeaderIcon"><FontAwesomeIcon icon={faSnowflake} /></span>
                <span>Comets ({comets.filter(s => s.active).length}/{comets.length})</span>
              </div>

              <div
                ref={virtualScrollRef}
                className="dinoSatSatelliteList satellite-list"
                style={{ flex: 1, overflowY: "auto", position: "relative" }}
                onScroll={handleVirtualScroll}
              >
                <div style={{ height: filteredComets.length * PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT, position: "relative" }}>
                  <div style={{ position: "absolute", top: startIndex * PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT, width: "100%" }}>
                    {visibleItems.map((comet) => (
                      <div
                        key={comet.id}
                        className={`dinoSatSatelliteListItem satellite-item ${comet.active ? "dinoSatSatelliteButtonActive" : ""} ${selectedComet === comet.id ? "satellite-selected" : ""}`}
                        style={{ height: PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT, minHeight: PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT }}
                        onClick={() => {
                          if (!comet.active) { toggleComet(comet.id); }
                          setSelectedComet(comet.id);
                          zoomToComet(comet.id);
                        }}
                      >
                        <div className="dinoSatSatelliteIndicator" style={{ backgroundColor: comet.color }} />
                        <div className="dinoSatSatelliteTleBadge" style={{ backgroundColor: orbitArcAgeColor(comet.observationArcDays) }} title={`Arc: ${orbitArcAgeLabel(comet.observationArcDays)}`} />
                        <div className="dinoSatSatelliteName satellite-name">{comet.name}</div>
                        <label className="consoleSwitch">
                          <input type="checkbox" checked={comet.active} onChange={() => { toggleComet(comet.id); }} />
                          <span className="consoleSlider round"></span>
                        </label>
                        <button className="dinoSatSatelliteInfoButton" onClick={(event) => { event.stopPropagation(); openDossier(comet); }} aria-label="Show dossier">
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
          <CometWatchStrip data={neoWatch} loading={neoWatchLoading} expanded={neoWatchExpanded} onToggle={toggleNEOWatchExpanded} />

          {neoWatchExpanded && (
            <CometWatchDetail data={neoWatch} onClose={() => setNEOWatchExpanded(false)} onRequestAIAnalysis={() => fetchNEOWatchAI(true)} aiAnalysis={neoWatchAI} aiLoading={neoWatchAILoading} onSelect={openDossier} />
          )}

          {showCloseApproachPanel && (
            <CloseApproachesPanel approaches={closeApproaches} onSelect={openDossier} onClose={() => setShowCloseApproachPanel(false)} comets={comets} />
          )}

          {showPHAPanel && (
            <PHACatalogPanel data={phaCatalog} loading={phaLoading} onRefresh={fetchPHACatalog} onClose={() => setShowPHAPanel(false)} onSelect={openDossier} />
          )}

          {showSentryPanel && (
            <SentryWatchPanel candidates={sentryCandidates} loading={sentryLoading} onRefresh={fetchSentryWatch} onClose={() => setShowSentryPanel(false)} onSelect={openDossier} methodology={sentryMethodology} />
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

              <select className="dinoSatSatelliteFPSSelect" value={targetFps} onChange={(event) => setTargetFps(Number(event.target.value))} aria-label="Target FPS">
                {FPS_OPTIONS.map(fps => (<option key={fps} value={fps}>{fps} FPS</option>))}
              </select>

              <button className={`dinoSatSatellitePlaybackControlsButton ${hudVisible ? "dinoSatSatelliteButtonActive" : ""}`} onClick={toggleHUD} aria-label="Toggle HUD"><FontAwesomeIcon icon={faChartLine} /> HUD</button>
              <button className={`dinoSatSatellitePlaybackControlsButton ${showCloseApproachPanel ? "dinoSatSatelliteButtonActive" : ""}`} onClick={toggleCloseApproachPanel}><FontAwesomeIcon icon={faTriangleExclamation} /> Close Approaches ({closeApproaches.length})</button>
              <button className={`dinoSatSatellitePlaybackControlsButton ${showPHAPanel ? "dinoSatSatelliteButtonActive" : ""}`} onClick={togglePHAPanel}><FontAwesomeIcon icon={faCircleNodes} /> Population Census</button>
              <button className={`dinoSatSatellitePlaybackControlsButton ${showSentryPanel ? "dinoSatSatelliteButtonActive" : ""}`} onClick={toggleSentryPanel}><FontAwesomeIcon icon={faFire} /> Apparition Watch</button>

              <button className="dinoSatSatellitePlaybackControlsButton" onClick={exportJSON}>JSON</button>
              <button className="dinoSatSatellitePlaybackControlsButton" onClick={exportCSV}>CSV</button>
              <button className="dinoSatSatellitePlaybackControlsButton" onClick={exportText}>TXT</button>
            </div>
          </div>

          <div className="dinoSatMainContent">
            <div className="dinoSatCanvasArea">
              <div ref={mountRef} className="dinoSatSatelliteCanvasContainer" style={{ display: anyOverlayPanelOpen ? "none" : "block" }} />
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
                      <button className="dinoSatSatelliteControlButton" onClick={toggleCometComa}>{showCometComa ? "Hide" : "Show"} Coma</button>
                      <button className="dinoSatSatelliteControlButton" onClick={toggleBloom}>{bloomEnabled ? "Disable" : "Enable"} Bloom</button>
                      <button className="dinoSatSatelliteControlButton" onClick={toggleAxisMarkers}>{showAxisMarkers ? "Hide" : "Show"} Axes</button>
                      <button className="dinoSatSatelliteControlButton" onClick={toggleEclipticGrid}>{showEclipticGrid ? "Hide" : "Show"} Grid</button>
                      <button className="dinoSatSatelliteControlButton" onClick={toggleOrbitalZones}>{showOrbitalZones ? "Hide" : "Show"} Zones</button>
                      <button className="dinoSatSatelliteControlButton" onClick={toggleDistanceRings}>{showDistanceRings ? "Hide" : "Show"} Planets</button>
                    </div>
                    <div className="dinoSatSatelliteBloomControls">
                      <div className="dinoSatSatelliteBloomSlider">
                        <span>CA AU</span>
                        <input type="range" min="0.005" max="1.0" step="0.005" value={closeApproachThreshold} onChange={(event) => setCloseApproachThreshold(parseFloat(event.target.value))} />
                        <span>{closeApproachThreshold.toFixed(3)}</span>
                      </div>
                    </div>
                    {bloomEnabled && (
                      <div className="dinoSatSatelliteBloomControls">
                        <div className="dinoSatSatelliteBloomSlider">
                          <span>Strength</span>
                          <input type="range" min="0" max="5" step="0.1" value={bloomStrength} onChange={(event) => setBloomStrength(parseFloat(event.target.value))} />
                          <span>{bloomStrength.toFixed(1)}</span>
                        </div>
                        <div className="dinoSatSatelliteBloomSlider">
                          <span>Radius</span>
                          <input type="range" min="0" max="2" step="0.05" value={bloomRadius} onChange={(event) => setBloomRadius(parseFloat(event.target.value))} />
                          <span>{bloomRadius.toFixed(2)}</span>
                        </div>
                        <div className="dinoSatSatelliteBloomSlider">
                          <span>Threshold</span>
                          <input type="range" min="0" max="2" step="0.05" value={bloomThreshold} onChange={(event) => setBloomThreshold(parseFloat(event.target.value))} />
                          <span>{bloomThreshold.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="dinoSatRightRailSection">
                <button className="dinoSatRightRailSectionHeader" onClick={() => setLegendCollapsed(c => !c)}>
                  <span>Population Legend</span>
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
                  <StatTile label="Visible Comets" value={performanceStats.visibleComets} color="#4ade80" accent="#4ade80" />
                  <StatTile label="Culled" value={performanceStats.culledComets} color="#fb923c" accent="#fb923c" />
                  <StatTile label="Active / Total" value={`${activeComets} / ${comets.length}`} accent="#42a5f5" />
                  <StatTile label="Close Approaches" value={closeApproaches.length} color={closeApproaches.length > 0 ? "#fb923c" : "#4ade80"} accent={closeApproaches.length > 0 ? "#fb923c" : "#4ade80"} />
                  <StatTile label="Sim Speed" value={speedLabel} accent="#42a5f5" />
                  <StatTile label="Memory" value={performanceStats.memoryUsage} unit="objects" accent="#42a5f5" />
                  <StatTile label="Geometries" value={performanceStats.geometries} accent="#42a5f5" />
                  <StatTile label="Textures" value={performanceStats.textures} accent="#42a5f5" />
                  <StatTile label="Earth Crossers" value={earthCrossingCount} color="#fb923c" accent="#fb923c" />
                  <StatTile label="Sungrazers" value={sungrazerCount} color="#FFD060" accent="#FFD060" />
                  <StatTile label="Active Comets" value={activeStatusCount} color="#4ade80" accent="#4ade80" />
                </div>

                <div className="dinoSatDossierGrid">
                  <div className="dinoSatPanelCard">
                    <div className="dinoSatPanelCardHeader"><span>Coordinate System & Reference Frame</span></div>
                    <div className="dinoSatPanelCardBody">
                      <div className="dinosatSatelliteHUDSectionGrid">
                        <div className="dinosatSatelliteHUDSectionItem"><span>Reference Frame</span><span>Heliocentric Ecliptic J2000</span></div>
                        <div className="dinosatSatelliteHUDSectionItem"><span>Origin</span><span>Sun Center</span></div>
                        <div className="dinosatSatelliteHUDSectionItem"><span>X-Axis</span><span>Vernal Equinox</span></div>
                        <div className="dinosatSatelliteHUDSectionItem"><span>Y-Axis</span><span>Ecliptic North</span></div>
                        <div className="dinosatSatelliteHUDSectionItem"><span>Z-Axis</span><span>90° Ecliptic Longitude</span></div>
                        <div className="dinosatSatelliteHUDSectionItem"><span>Units</span><span>AU (scaled)</span></div>
                        <div className="dinosatSatelliteHUDSectionItem"><span>Scale Factor</span><span>{ORBITAL_CONSTANTS.SCALE_FACTOR}</span></div>
                        <div className="dinosatSatelliteHUDSectionItem"><span>1 AU</span><span>{AU_KM.toLocaleString()} km</span></div>
                        <div className="dinosatSatelliteHUDSectionItem"><span>μ (Sun GM)</span><span>{SUN_GM.toExponential(4)} km³/s²</span></div>
                      </div>
                    </div>
                  </div>

                  <div className="dinoSatPanelCard">
                    <div className="dinoSatPanelCardHeader"><span>Orbital Propagation Status</span></div>
                    <div className="dinoSatPanelCardBody">
                      <div className="dinosatSatelliteHUDSectionGrid">
                        <div className="dinosatSatelliteHUDSectionItem"><span>Two-body Kepler (bound)</span><span style={{ color: "#4ade80" }}>{keplerCount}</span></div>
                        <div className="dinosatSatelliteHUDSectionItem"><span>Hyperbolic Kepler</span><span style={{ color: "#E91E63" }}>{hyperbolicCount}</span></div>
                        <div className="dinosatSatelliteHUDSectionItem"><span>Barker (parabolic)</span><span style={{ color: "#9C27B0" }}>{nearParabolicCount}</span></div>
                        <div className="dinosatSatelliteHUDSectionItem"><span>Active Comets</span><span style={{ color: "#4ade80" }}>{activeStatusCount}</span></div>
                        <div className="dinosatSatelliteHUDSectionItem"><span>Earth Crossers</span><span style={{ color: "#fb923c" }}>{earthCrossingCount}</span></div>
                        <div className="dinosatSatelliteHUDSectionItem"><span>Sungrazers</span><span style={{ color: "#FFD060" }}>{sungrazerCount}</span></div>
                        <div className="dinosatSatelliteHUDSectionItem"><span>Element Errors</span><span style={{ color: errors.length > 0 ? "#ef4444" : "#4ade80" }}>{errors.length}</span></div>
                        <div className="dinosatSatelliteHUDSectionItem"><span>Simulation Time</span><span>{currentTime}</span></div>
                        <div className="dinosatSatelliteHUDSectionItem"><span>Update Frequency</span><span>1/{PERFORMANCE_CONSTANTS.UPDATE_FREQUENCY} frame</span></div>
                        <div className="dinosatSatelliteHUDSectionItem"><span>Frustum Margin</span><span>{PERFORMANCE_CONSTANTS.FRUSTUM_MARGIN}x</span></div>
                        <div className="dinosatSatelliteHUDSectionItem"><span>Trail Length</span><span>{PERFORMANCE_CONSTANTS.TRAIL_LENGTH} samples</span></div>
                      </div>
                    </div>
                  </div>

                  <div className="dinoSatPanelCard">
                    <div className="dinoSatPanelCardHeader"><span>Observation Arc Distribution</span></div>
                    <div className="dinoSatPanelCardBody">
                      <div className="dinosatSatelliteHUDSectionGrid">
                        <div className="dinosatSatelliteHUDSectionItem"><span>Multi-decade (&gt;10y)</span><span style={{ color: "#4ade80" }}>{orbitArcStats.multiDecade}</span></div>
                        <div className="dinosatSatelliteHUDSectionItem"><span>Multi-year (2-10y)</span><span style={{ color: "#84cc16" }}>{orbitArcStats.multiYear}</span></div>
                        <div className="dinosatSatelliteHUDSectionItem"><span>Year-class (6m-2y)</span><span style={{ color: "#facc15" }}>{orbitArcStats.yearClass}</span></div>
                        <div className="dinosatSatelliteHUDSectionItem"><span>Short (1-6m)</span><span style={{ color: "#fb923c" }}>{orbitArcStats.shortArc}</span></div>
                        <div className="dinosatSatelliteHUDSectionItem"><span>Very Short (&lt;1m)</span><span style={{ color: "#ef4444" }}>{orbitArcStats.veryShort}</span></div>
                        <div className="dinosatSatelliteHUDSectionItem"><span>Unknown</span><span>{orbitArcStats.unknown}</span></div>
                      </div>
                    </div>
                  </div>

                  <div className="dinoSatPanelCard">
                    <div className="dinoSatPanelCardHeader"><span>Population Statistics by Class</span></div>
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

                  {neoWatch && (
                    <div className="dinoSatPanelCard">
                      <div className="dinoSatPanelCardHeader"><span>Comet Watch Snapshot</span></div>
                      <div className="dinoSatPanelCardBody">
                        <div className="dinosatSatelliteHUDSectionGrid">
                          <div className="dinosatSatelliteHUDSectionItem"><span>Status</span><span style={{ color: neoWatch.overall?.color }}>{neoWatch.overall?.status}</span></div>
                          <div className="dinosatSatelliteHUDSectionItem"><span>Upcoming Perihelia</span><span>{neoWatch.upcomingPerihelia || 0}</span></div>
                          <div className="dinosatSatelliteHUDSectionItem"><span>Next 30 Days</span><span>{neoWatch.next30Days || 0}</span></div>
                          <div className="dinosatSatelliteHUDSectionItem"><span>Next 365 Days</span><span>{neoWatch.next365Days || 0}</span></div>
                          <div className="dinosatSatelliteHUDSectionItem"><span>Active Comets</span><span style={{ color: "#4ade80" }}>{neoWatch.activeCount || 0}</span></div>
                          <div className="dinosatSatelliteHUDSectionItem"><span>Bright Apparitions</span><span style={{ color: "#fb923c" }}>{neoWatch.brightApparitions || 0}</span></div>
                          <div className="dinosatSatelliteHUDSectionItem"><span>Recent Discoveries</span><span>{neoWatch.recentDiscoveriesCount || 0}</span></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {detailedComet && enrichedDetailedComet && (
            <div ref={detailedPanelRef} className="dinoSatSatelliteDetailedPanel" tabIndex={0}>
              <div className="dinoSatSatelliteHUDPanelHeader">
                <span>
                  Comet Details: {enrichedDetailedComet.name}
                  <small style={{ marginLeft: "12px", color: orbitArcAgeColor(enrichedDetailedComet.observationArcDays) }}>
                    Arc: {orbitArcAgeLabel(enrichedDetailedComet.observationArcDays)}
                  </small>
                </span>
                <button className="dinoSatSatelliteCloseButton" onClick={() => setDetailedComet(null)}><FontAwesomeIcon icon={faXmark} /></button>
              </div>

              <div className="dinoSatDossierTabs">
                <div className="dinoSatDossierTabsScroll">
                  {[
                    { key: "orbital", label: "Orbital", icon: faSnowflake },
                    { key: "intel", label: "AI Brief", icon: faBrain },
                    { key: "observations", label: "Observations", icon: faEye },
                    { key: "passes", label: "Flyby Predictions", icon: faTowerBroadcast },
                    { key: "tle", label: "Orbit Arc", icon: faClock }
                  ].map(tab => (
                    <button
                      key={tab.key}
                      className={`dinoSatDossierTab ${activeDossierTab === tab.key ? "dinoSatDossierTabActive" : ""}`}
                      onClick={() => {
                        setActiveDossierTab(tab.key);
                        if (tab.key === "intel" && !missionIntelMap.has(enrichedDetailedComet.designation)) {
                          fetchMissionIntelligenceFor(enrichedDetailedComet);
                        }
                        if (tab.key === "observations" && !observationMap.has(enrichedDetailedComet.designation)) {
                          fetchObservationDataFor(enrichedDetailedComet);
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
                  <MissionIntelligenceTab comet={enrichedDetailedComet} intelligence={currentMissionIntel} loading={missionIntelLoading && !currentMissionIntel} onRefresh={() => fetchMissionIntelligenceFor(enrichedDetailedComet, true)} />
                )}

                {activeDossierTab === "observations" && (
                  <ObservationsTab comet={enrichedDetailedComet} observation={currentObservation} loading={observationLoading && !currentObservation} onRefresh={() => fetchObservationDataFor(enrichedDetailedComet, true)} />
                )}

                {activeDossierTab === "passes" && (
                  <FlybyPredictionsTab comet={enrichedDetailedComet} observerLocation={observerLocation} onLocationChange={setObserverLocation} onRequestGeolocation={requestGeolocation} currentDate={new Date(simulationDateMsRef.current)} />
                )}

                {activeDossierTab === "tle" && (
                  <OrbitArcTab comet={enrichedDetailedComet} />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}