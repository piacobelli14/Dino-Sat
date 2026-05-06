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
  faMeteor
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
  "S": "#c08040",
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
  if (moidAU < 0.002) return "#ef4444";
  if (moidAU < 0.01) return "#fb923c";
  if (moidAU < 0.05) return "#facc15";
  if (moidAU < 0.2) return "#84cc16";
  return "#4ade80";
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
  if (torino === 0) return "#4ade80";
  if (torino === 1) return "#84cc16";
  if (torino <= 4) return "#facc15";
  if (torino <= 7) return "#fb923c";
  return "#ef4444";
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
  const x = r * Math.cos(lambda);
  const y = r * Math.sin(lambda);
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

const NEOWatchStrip = ({ data, loading, expanded, onToggle }) => {
  if (loading && !data) {
    return (
      <div className="dinoSatSpaceWeatherStrip dinoSatSpaceWeatherLoading">
        <FontAwesomeIcon icon={faSpinner} spin /> <span>Loading NEO close-approach feed...</span>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="dinoSatSpaceWeatherStrip dinoSatSpaceWeatherUnavailable">
        <FontAwesomeIcon icon={faTriangleExclamation} /> <span>NEO close-approach data unavailable</span>
      </div>
    );
  }

  const overall = data.overall || { status: "Quiet", color: "#4ade80", severity: 0 };
  const next7 = data.next7Days;
  const next30 = data.next30Days;
  const next365 = data.next365Days;
  const phaCount = data.totalPHACount;
  const sentryCount = data.sentryRiskCount;
  const closestUpcoming = data.closestUpcoming;
  const recentDiscoveries = data.recentDiscoveriesCount;

  return (
    <div className="dinoSatSpaceWeatherStrip">
      <div className="dinoSatSpaceWeatherStripCells">
        <div className="dinoSatSpaceWeatherCell" style={{ borderLeftColor: overall.color }}>
          <div className="dinoSatSpaceWeatherCellLabel">Status</div>
          <div className="dinoSatSpaceWeatherCellValue" style={{ color: overall.color }}>{overall.status}</div>
        </div>

        {next7 !== undefined && (
          <div className="dinoSatSpaceWeatherCell" style={{ borderLeftColor: next7 > 5 ? "#fb923c" : "#4ade80" }}>
            <div className="dinoSatSpaceWeatherCellLabel">Next 7 Days</div>
            <div className="dinoSatSpaceWeatherCellValue">{next7}<span>close approaches</span></div>
          </div>
        )}

        {next30 !== undefined && (
          <div className="dinoSatSpaceWeatherCell" style={{ borderLeftColor: "#42a5f5" }}>
            <div className="dinoSatSpaceWeatherCellLabel">Next 30 Days</div>
            <div className="dinoSatSpaceWeatherCellValue">{next30}<span>tracked passes</span></div>
          </div>
        )}

        {next365 !== undefined && (
          <div className="dinoSatSpaceWeatherCell" style={{ borderLeftColor: "#9c27b0" }}>
            <div className="dinoSatSpaceWeatherCellLabel">Next 365 Days</div>
            <div className="dinoSatSpaceWeatherCellValue">{next365}<span>annual passes</span></div>
          </div>
        )}

        {phaCount !== undefined && (
          <div className="dinoSatSpaceWeatherCell" style={{ borderLeftColor: "#ef4444" }}>
            <div className="dinoSatSpaceWeatherCellLabel">PHA Catalog</div>
            <div className="dinoSatSpaceWeatherCellValue">{phaCount}<span>potentially hazardous</span></div>
          </div>
        )}

        {sentryCount !== undefined && (
          <div className="dinoSatSpaceWeatherCell" style={{ borderLeftColor: sentryCount > 0 ? "#fb923c" : "#4ade80" }}>
            <div className="dinoSatSpaceWeatherCellLabel">Sentry Risk</div>
            <div className="dinoSatSpaceWeatherCellValue">{sentryCount}<span>impact-monitoring</span></div>
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
    <div className="dinoSatDossierTabContent">
      <div className="dinoSatStatTileGrid">
        <StatTile label="Overall Status" value={data.overall?.status || "Quiet"} sub={`Severity ${data.overall?.severity || 0}/6`} color={data.overall?.color} accent={data.overall?.color} large />
        <StatTile label="Next 7 Days" value={data.next7Days || 0} sub="Close approaches" accent="#42a5f5" />
        <StatTile label="Next 30 Days" value={data.next30Days || 0} sub="Tracked passes" accent="#42a5f5" />
        <StatTile label="Next 365 Days" value={data.next365Days || 0} sub="Annual passes" accent="#9c27b0" />
        <StatTile label="PHA Catalog" value={data.totalPHACount || 0} sub="MOID < 0.05 AU, H < 22" color="#ef4444" accent="#ef4444" />
        <StatTile label="Sentry Risk" value={data.sentryRiskCount || 0} sub="Impact-monitoring" color={(data.sentryRiskCount || 0) > 0 ? "#fb923c" : "#4ade80"} accent="#fb923c" />
        <StatTile label="Recent Discoveries" value={data.recentDiscoveriesCount || 0} sub="Past 30 days" accent="#42a5f5" />
        {data.closestUpcoming && (
          <StatTile label="Closest Upcoming" value={data.closestUpcoming.distLD?.toFixed(2)} unit="LD" sub={data.closestUpcoming.name} color={moidColor(data.closestUpcoming.distAU)} accent={moidColor(data.closestUpcoming.distAU)} />
        )}
      </div>

      {data.upcomingPasses && data.upcomingPasses.length > 0 && (
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faClock} /> Imminent Approaches (Next 7 Days)</span></div>
          <div className="dinoSatPanelCardBody">
            <div className="dinoSatTableScroll">
              <table className="dinoSatDataTable">
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
                      <td>{p.isPHA ? <span style={{ color: "#ef4444" }}>Yes</span> : "No"}</td>
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
        <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faClock} /> All Upcoming Close Approaches</span></div>
        <div className="dinoSatPanelCardBody">
          {!data.upcomingPasses || data.upcomingPasses.length === 0 ? (
            <div className="dinoSatPanelEmpty">No upcoming approaches in the configured window.</div>
          ) : (
            <div className="dinoSatTableScroll">
              <table className="dinoSatDataTable">
                <thead><tr><th>Severity</th><th>Date (UTC)</th><th>Object</th><th>LD</th><th>AU</th><th>km</th><th>v_rel km/s</th><th>H</th><th>PHA</th></tr></thead>
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
                      <td>{p.h !== null ? p.h.toFixed(1) : "—"}</td>
                      <td>{p.isPHA ? <span style={{ color: "#ef4444" }}>Yes</span> : "No"}</td>
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

  const renderSentry = () => (
    <div className="dinoSatDossierTabContent">
      <div className="dinoSatPanelCard">
        <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faTriangleExclamation} /> CNEOS Sentry Impact Risk Table</span></div>
        <div className="dinoSatPanelCardBody">
          {!data.sentryObjects || data.sentryObjects.length === 0 ? (
            <div className="dinoSatPanelEmpty">No Sentry risk data available.</div>
          ) : (
            <div className="dinoSatTableScroll">
              <table className="dinoSatDataTable">
                <thead><tr><th>Designation</th><th>Year Range</th><th>Potential Impacts</th><th>Cumulative IP</th><th>Palermo</th><th>Torino</th><th>Diameter</th><th>H</th></tr></thead>
                <tbody>
                  {data.sentryObjects.map((s, i) => (
                    <tr key={i}>
                      <td><b>{s.des}</b></td>
                      <td>{s.range}</td>
                      <td>{s.nImp}</td>
                      <td>{s.ipScientific}</td>
                      <td style={{ color: parseFloat(s.psCum) > -3 ? "#fb923c" : "#5a7068" }}>{s.psCum}</td>
                      <td style={{ color: torinoColor(parseInt(s.tsMax)) }}>{s.tsMax}</td>
                      <td>{s.diameter ? `${s.diameter} km` : "—"}</td>
                      <td>{s.h !== null && s.h !== undefined ? s.h.toFixed(1) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <div className="dinoSatPanelCard">
        <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faBookOpen} /> Sentry Methodology</span></div>
        <div className="dinoSatPanelCardBody">
          <div className="dinoSatBriefingGrid">
            <div className="dinoSatBriefingItem"><b>Sentry System</b><p>NASA JPL CNEOS Sentry is the automated impact-monitoring system that performs continuous orbit propagation and Monte Carlo sampling of orbital uncertainty regions to compute impact probabilities for the next 100 years.</p></div>
            <div className="dinoSatBriefingItem"><b>Palermo Scale</b><p>Logarithmic scale comparing impact likelihood to background risk. Values below -2 are routine; values above 0 indicate hazard exceeding the background impact rate.</p></div>
            <div className="dinoSatBriefingItem"><b>Torino Scale</b><p>0-10 integer scale combining impact probability and kinetic energy. 0 means no hazard; 1 routine; 2-4 meriting attention; 5-7 threatening; 8-10 certain collision.</p></div>
            <div className="dinoSatBriefingItem"><b>Removal</b><p>Objects are removed from Sentry once additional observations refine the orbit and impact possibility falls below detection threshold. Most listed objects exit the table within months.</p></div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDiscoveries = () => (
    <div className="dinoSatDossierTabContent">
      <div className="dinoSatPanelCard">
        <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faMeteor} /> Recent Discoveries</span></div>
        <div className="dinoSatPanelCardBody">
          {!data.recentDiscoveries || data.recentDiscoveries.length === 0 ? (
            <div className="dinoSatPanelEmpty">No recent discovery data available.</div>
          ) : (
            <div className="dinoSatTableScroll">
              <table className="dinoSatDataTable">
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
        <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faShieldHalved} /> Hazard Domain Risk Matrix</span></div>
        <div className="dinoSatPanelCardBody">
          <div className="dinoSatRiskMatrix">
            <div className="dinoSatRiskMatrixRow dinoSatRiskMatrixHeader">
              <div>Domain</div><div>Imminent Impact</div><div>Sentry Risk</div><div>PHA Density</div><div>Low Δv</div><div>Survey Gap</div>
            </div>
            <div className="dinoSatRiskMatrixRow">
              <div>Planetary Defense</div>
              <div className={`dinoSatRiskCell ${(data.next7Days || 0) > 10 ? "dinoSatRiskHigh" : (data.next7Days || 0) > 3 ? "dinoSatRiskMod" : "dinoSatRiskLow"}`}>{(data.next7Days || 0) > 10 ? "HIGH" : (data.next7Days || 0) > 3 ? "MOD" : "LOW"}</div>
              <div className={`dinoSatRiskCell ${(data.sentryRiskCount || 0) > 5 ? "dinoSatRiskHigh" : (data.sentryRiskCount || 0) > 0 ? "dinoSatRiskMod" : "dinoSatRiskLow"}`}>{(data.sentryRiskCount || 0) > 5 ? "HIGH" : (data.sentryRiskCount || 0) > 0 ? "MOD" : "LOW"}</div>
              <div className={`dinoSatRiskCell ${(data.totalPHACount || 0) > 2500 ? "dinoSatRiskHigh" : "dinoSatRiskMod"}`}>{(data.totalPHACount || 0) > 2500 ? "HIGH" : "MOD"}</div>
              <div className="dinoSatRiskCell dinoSatRiskLow">N/A</div>
              <div className="dinoSatRiskCell dinoSatRiskMod">MOD</div>
            </div>
            <div className="dinoSatRiskMatrixRow">
              <div>Mission Targets</div>
              <div className="dinoSatRiskCell dinoSatRiskLow">LOW</div>
              <div className="dinoSatRiskCell dinoSatRiskLow">LOW</div>
              <div className="dinoSatRiskCell dinoSatRiskLow">LOW</div>
              <div className="dinoSatRiskCell dinoSatRiskHigh">HIGH</div>
              <div className="dinoSatRiskCell dinoSatRiskMod">MOD</div>
            </div>
            <div className="dinoSatRiskMatrixRow">
              <div>Resource Prospecting</div>
              <div className="dinoSatRiskCell dinoSatRiskLow">N/A</div>
              <div className="dinoSatRiskCell dinoSatRiskLow">N/A</div>
              <div className="dinoSatRiskCell dinoSatRiskLow">N/A</div>
              <div className="dinoSatRiskCell dinoSatRiskHigh">HIGH</div>
              <div className="dinoSatRiskCell dinoSatRiskMod">MOD</div>
            </div>
            <div className="dinoSatRiskMatrixRow">
              <div>Earth Observation</div>
              <div className={`dinoSatRiskCell ${(data.next7Days || 0) > 10 ? "dinoSatRiskMod" : "dinoSatRiskLow"}`}>{(data.next7Days || 0) > 10 ? "MOD" : "LOW"}</div>
              <div className="dinoSatRiskCell dinoSatRiskLow">LOW</div>
              <div className="dinoSatRiskCell dinoSatRiskLow">LOW</div>
              <div className="dinoSatRiskCell dinoSatRiskLow">N/A</div>
              <div className="dinoSatRiskCell dinoSatRiskLow">LOW</div>
            </div>
            <div className="dinoSatRiskMatrixRow">
              <div>Scientific Survey</div>
              <div className="dinoSatRiskCell dinoSatRiskLow">N/A</div>
              <div className="dinoSatRiskCell dinoSatRiskLow">N/A</div>
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
          <p>Querying multi-stage AI ensemble for NEO operational analysis...</p>
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
              <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faGauge} /> Current Hazard Posture</span></div>
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
        <span>NEO Watch Operations Center · {new Date(data.timestamp).toLocaleString()}</span>
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
    <div className="dinoSatSpaceWeatherDetail">
      <div className="dinoSatSpaceWeatherDetailHeader">
        <span><FontAwesomeIcon icon={faTriangleExclamation} /> Close Approaches Watch · {approaches.length} active proximity events</span>
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
                        <tr><th>Severity</th><th>Distance (AU)</th><th>Distance (LD)</th><th>Distance (km)</th><th>Object</th><th>Class</th><th>Bearing</th><th></th></tr>
                      </thead>
                      <tbody>
                        {filtered.map((c, i) => (
                          <tr key={i} className={`dinoSatConjunctionTableRow dinoSatConjunctionSev-${c.severity.toLowerCase()}`}>
                            <td><span className={`dinoSatConjunctionSeverity dinoSatConjunctionSev-${c.severity.toLowerCase()}`}>{c.severity}</span></td>
                            <td><b>{c.distanceAU.toFixed(6)}</b></td>
                            <td>{c.distanceLD?.toFixed(2)}</td>
                            <td>{c.distanceKm.toLocaleString()}</td>
                            <td><button className="dinoSatTableButton" onClick={() => onSelect && onSelect(c.asteroid)}>{c.asteroid.name}<small>{c.asteroid.designation || "—"} · {c.asteroid.category}</small></button></td>
                            <td>{c.asteroid.category}</td>
                            <td>{c.relativeBearingDeg}°</td>
                            <td><button className="dinoSatSatelliteSelectButton" onClick={() => onSelect && onSelect(c.asteroid)}>Inspect</button></td>
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
              <StatTile label="Critical (<0.0027 AU)" value={stats.critical} color="#ef4444" accent="#ef4444" sub="Sub-lunar distance" />
              <StatTile label="High (<0.01 AU)" value={stats.high} color="#fb923c" accent="#fb923c" />
              <StatTile label="Moderate (<0.025 AU)" value={stats.moderate} color="#facc15" accent="#facc15" />
              <StatTile label="Low (>0.025 AU)" value={stats.low} color="#84cc16" accent="#84cc16" />
              <StatTile label="Mean Distance" value={stats.avgDistance.toFixed(6)} unit="AU" accent="#42a5f5" />
              <StatTile label="Closest Object" value={stats.minDistance.toFixed(6)} unit="AU" accent="#ef4444" color="#ef4444" />
            </div>
            <div className="dinoSatPanelCard">
              <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faBookOpen} /> Close Approach Methodology</span></div>
              <div className="dinoSatPanelCardBody">
                <div className="dinoSatBriefingGrid">
                  <div className="dinoSatBriefingItem"><b>Detection</b><p>Catalog-wide MOID pre-filter selects candidate asteroids whose orbital geometry permits a close approach below the threshold; positions are then propagated for the current simulation epoch and tested against Earth's analytic position.</p></div>
                  <div className="dinoSatBriefingItem"><b>Severity</b><p>Critical: &lt;0.0027 AU (sub-lunar distance, &lt;1 LD). High: 0.0027-0.01 AU. Moderate: 0.01-0.025 AU. Low: 0.025-threshold. The lunar distance reference (LD = 0.00257 AU) is the natural break point for "very close" passes.</p></div>
                  <div className="dinoSatBriefingItem"><b>Limitations</b><p>This is a snapshot using two-body Kepler propagation. True close-approach analysis requires N-body integration with planetary perturbations and orbital uncertainty propagation per CNEOS Sentry standards.</p></div>
                  <div className="dinoSatBriefingItem"><b>Update Rate</b><p>Refreshed every {Math.round(PERFORMANCE_CONSTANTS.CLOSE_APPROACH_CHECK_INTERVAL_MS / 1000)} seconds against the most recent propagated positions of the candidate set, regardless of which subset of the catalog is currently rendered.</p></div>
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
    <div className="dinoSatSpaceWeatherDetail">
      <div className="dinoSatSpaceWeatherDetailHeader">
        <span><FontAwesomeIcon icon={faCircleNodes} /> Asteroid Population Census</span>
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
                      <div><span>PHAs</span><b>{c.phaCount}</b></div>
                      <div><span>Avg a</span><b>{c.averageA} AU</b></div>
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
                      <thead><tr><th>Designation</th><th>Name</th><th>a (AU)</th><th>e</th><th>i (°)</th><th>H</th><th>PHA</th></tr></thead>
                      <tbody>
                        {data[selectedGroup].ids.map((m, i) => (
                          <tr key={i}>
                            <td>{m.designation}</td>
                            <td><button className="dinoSatTableButton" onClick={() => onSelect && onSelect(m)}>{m.name}</button></td>
                            <td>{m.a?.toFixed(3)}</td>
                            <td>{m.e?.toFixed(4)}</td>
                            <td>{m.i?.toFixed(2)}</td>
                            <td>{m.h !== null && m.h !== undefined ? m.h.toFixed(1) : "—"}</td>
                            <td>{m.isPHA ? <span style={{ color: "#ef4444" }}>Yes</span> : "No"}</td>
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
              <StatTile label="NEO Count" value={aggregateStats.totalNEO.toLocaleString()} sub="Earth-approaching" color="#fb923c" accent="#fb923c" />
              <StatTile label="PHA Count" value={aggregateStats.totalPHA.toLocaleString()} sub="MOID < 0.05 AU, H < 22" color="#ef4444" accent="#ef4444" />
            </div>
            <div className="dinoSatPanelCard">
              <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faBookOpen} /> Population Group Definitions</span></div>
              <div className="dinoSatPanelCardBody">
                <div className="dinoSatBriefingGrid">
                  <div className="dinoSatBriefingItem"><b>Atira</b><p>Inner Earth Object: orbit entirely interior to Earth's (aphelion &lt; 0.983 AU). Difficult to detect, must be observed at sub-solar elongations near twilight.</p></div>
                  <div className="dinoSatBriefingItem"><b>Aten</b><p>Earth-crossing with semi-major axis &lt; 1.0 AU. Spends most of its orbit interior to Earth's; aphelion exceeds 0.983 AU.</p></div>
                  <div className="dinoSatBriefingItem"><b>Apollo</b><p>Earth-crossing with semi-major axis &gt; 1.0 AU. Largest near-Earth class; perihelion below 1.017 AU.</p></div>
                  <div className="dinoSatBriefingItem"><b>Amor</b><p>Mars-crossing or near-Earth without crossing Earth's orbit. Perihelion between 1.017 and 1.3 AU.</p></div>
                  <div className="dinoSatBriefingItem"><b>Main Belt</b><p>Between Mars and Jupiter (~2.06-3.27 AU). Inner, middle, and outer subdivisions track different dynamical and compositional populations.</p></div>
                  <div className="dinoSatBriefingItem"><b>Trojans</b><p>Locked at Jupiter's L4 and L5 Lagrange points, ±60° ahead and behind Jupiter. Stable for billions of years.</p></div>
                  <div className="dinoSatBriefingItem"><b>Centaurs</b><p>Unstable orbits between Jupiter and Neptune. Many are former Kuiper Belt objects en route to becoming Jupiter-family comets.</p></div>
                  <div className="dinoSatBriefingItem"><b>TNOs / KBOs</b><p>Trans-Neptunian region beyond Neptune's orbit. Includes Plutinos in 3:2 resonance, classical KBOs, and scattered-disk objects.</p></div>
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
                      <tr><th>Group</th><th>Description</th><th>Status</th><th>Tracked</th><th>Est. Total</th><th>Coverage</th><th>NEO</th><th>PHA</th><th>Avg a</th><th>Avg e</th></tr>
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
                          <td style={{ color: "#fb923c" }}>{c.neoCount}</td>
                          <td style={{ color: "#ef4444" }}>{c.phaCount}</td>
                          <td>{c.averageA} AU</td>
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
    <div className="dinoSatSpaceWeatherDetail">
      <div className="dinoSatSpaceWeatherDetailHeader">
        <span><FontAwesomeIcon icon={faFire} /> Sentry Impact Risk Watch · {candidates?.length || 0} monitored objects</span>
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
                    <label>Risk Level</label>
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
                      <option value="palermo">Palermo descending</option>
                      <option value="torino">Torino descending</option>
                      <option value="ip">Impact probability</option>
                      <option value="diameter">Largest first</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="dinoSatPanelCard">
              <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faTable} /> Sentry Risk Objects ({filtered.length})</span></div>
              <div className="dinoSatPanelCardBody">
                {filtered.length === 0 ? (
                  <div className="dinoSatPanelEmpty">{loading ? "Computing risk objects..." : "No objects match the filter."}</div>
                ) : (
                  <div className="dinoSatTableScroll">
                    <table className="dinoSatDataTable">
                      <thead>
                        <tr><th>Risk</th><th>Tier</th><th>Designation</th><th>Year Range</th><th>Impacts</th><th>Cum. IP</th><th>Palermo</th><th>Torino</th><th>Diameter</th><th>H</th><th></th></tr>
                      </thead>
                      <tbody>
                        {filtered.map((c) => (
                          <tr key={c.des} className={`dinoSatDecayRisk-${(c.decayRisk || "low").toLowerCase()}`}>
                            <td><span className={`dinoSatDecayRiskBadge dinoSatDecayRisk-${(c.decayRisk || "low").toLowerCase()}`}>{c.decayRisk}</span></td>
                            <td><span className={`dinoSatDecayTierBadge dinoSatDecayTier-${c.tier || "heuristic"}`}>{c.tier === "highConfidence" ? "High Conf" : "Heuristic"}</span></td>
                            <td><b>{c.des}</b></td>
                            <td>{c.range}</td>
                            <td>{c.nImp}</td>
                            <td>{c.ipScientific}</td>
                            <td style={{ color: parseFloat(c.psCum) > -3 ? "#fb923c" : "#5a7068" }}>{c.psCum}</td>
                            <td style={{ color: torinoColor(parseInt(c.tsMax)) }}>{c.tsMax}</td>
                            <td>{c.diameter ? `${c.diameter} km` : "—"}</td>
                            <td>{c.h !== null && c.h !== undefined ? c.h.toFixed(1) : "—"}</td>
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
              <StatTile label="Total Monitored" value={stats.total} sub="Sentry impact-monitoring objects" accent="#42a5f5" large />
              <StatTile label="Torino > 0" value={stats.torinoNonZero} color="#fb923c" accent="#fb923c" sub="Meriting attention" />
              <StatTile label="Palermo > 0" value={stats.palermoAboveZero} color="#ef4444" accent="#ef4444" sub="Above background risk" />
              <StatTile label="Imminent" value={stats.imminent} color="#ef4444" accent="#ef4444" />
              <StatTile label="High" value={stats.high} color="#fb923c" accent="#fb923c" />
              <StatTile label="Moderate" value={stats.moderate} color="#facc15" accent="#facc15" />
              <StatTile label="Low" value={stats.low} color="#84cc16" accent="#84cc16" />
              <StatTile label="Mean Diameter" value={stats.avgDiameter.toFixed(3)} unit="km" accent="#42a5f5" />
              <StatTile label="Largest Object" value={stats.maxDiameter.toFixed(3)} unit="km" color="#ef4444" accent="#ef4444" />
            </div>
            <div className="dinoSatPanelCard">
              <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faBookOpen} /> Sentry Methodology</span></div>
              <div className="dinoSatPanelCardBody">
                <div className="dinoSatBriefingGrid">
                  <div className="dinoSatBriefingItem"><b>Impact Probability</b><p>The cumulative impact probability is the sum of all virtual impactor probabilities over the 100-year prediction window. Even small values are noteworthy because the analytical floor is roughly 1e-10.</p></div>
                  <div className="dinoSatBriefingItem"><b>Palermo Scale</b><p>{methodology?.palermoFormulation || "log10(P_impact / (E_impact × T))"}: positive values mean impact likelihood exceeds the integrated background risk over the time window.</p></div>
                  <div className="dinoSatBriefingItem"><b>Torino Scale</b><p>0-10 integer combining impact probability and kinetic energy. Most listed objects are 0-1, occasionally rising to 2-4 before re-observation eliminates the impact possibility.</p></div>
                  <div className="dinoSatBriefingItem"><b>Confidence Tiers</b><p><b>High Confidence:</b> {methodology?.highConfidenceCriterion || "Diameter > 0.14 km AND Torino > 0"} — these objects pose detectable hazard and warrant active observation campaigns. <b>Heuristic:</b> Smaller or lower-Torino objects on the watch list, retained pending orbit refinement.</p></div>
                  <div className="dinoSatBriefingItem"><b>Risk Tiers</b><p>Imminent: closest virtual impactor within 10 years. High: 10-30 years. Moderate: 30-60 years. Low: 60-100 years. These are based on the impact-window center, not probability.</p></div>
                  <div className="dinoSatBriefingItem"><b>Limitations</b><p>Sentry uses linearized covariance propagation and Monte Carlo sampling of orbital uncertainty. Yarkovsky thermal drift is included for objects where it is constrained. Objects exit Sentry once observation arc grows enough to eliminate the impact possibility.</p></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const FlybyPredictionsTab = ({ asteroid, observerLocation, onLocationChange, onRequestGeolocation, currentDate }) => {
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
      <div className="dinoSatDossierTabContent">
        <div className="dinoSatPanelEmpty">No orbital elements available for flyby prediction.</div>
      </div>
    );
  }

  const minPoint = predictions.length > 0 ? predictions.reduce((m, p) => p.value < m.value ? p : m, predictions[0]) : null;

  return (
    <div className="dinoSatDossierTabContent">
      <div className="dinoSatPanelCard">
        <div className="dinoSatPanelCardHeader">
          <span><FontAwesomeIcon icon={faTowerBroadcast} /> Earth Approach Prediction</span>
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
              <input type="number" min="24" max="8760" value={hours} onChange={(event) => setHours(Math.max(24, Math.min(8760, parseInt(event.target.value) || 168)))} />
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

      <div className="dinoSatPanelCard">
        <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faChartArea} /> Earth-Object Distance Over Window</span></div>
        <div className="dinoSatPanelCardBody">
          <ChartCanvas values={predictions} height={200} accent="#42a5f5" colorFn={(v) => moidColor(v)} label="Heliocentric distance to Earth" unit="AU" valueFormatter={(v) => v.toFixed(4)} threshold={0.05} thresholdLabel="PHA threshold (0.05 AU)" />
        </div>
      </div>
    </div>
  );
};

const MissionIntelligenceTab = ({ asteroid, intelligence, loading, onRefresh }) => {
  if (loading) {
    return (
      <div className="dinoSatDossierTabContent">
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faBrain} /> AI Object Brief</span></div>
          <div className="dinoSatPanelCardBody">
            <div className="dinoSatStatusDisplay"><FontAwesomeIcon icon={faSpinner} spin /><p>Querying multi-stage AI ensemble for comprehensive object intelligence...</p></div>
          </div>
        </div>
      </div>
    );
  }
  if (!intelligence) {
    return (
      <div className="dinoSatDossierTabContent">
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faBrain} /> AI Object Brief</span></div>
          <div className="dinoSatPanelCardBody">
            <div className="dinoSatStatusDisplay"><FontAwesomeIcon icon={faSpinner} spin /><p>Preparing object intelligence...</p></div>
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
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faBrain} /> Discovery & Mission Brief</span></div>
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
            <div className="dinoSatDossierCell" style={{ borderLeftColor: intel.missionStatus === "Active" ? "#4ade80" : "#fb923c" }}><div className="dinoSatDossierCellLabel">Object Status</div><div className="dinoSatDossierCellValue" style={{ color: intel.missionStatus === "Active" ? "#4ade80" : "#fb923c" }}>{safeRenderText(intel.missionStatus)}</div></div>
            <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Provisional Designation</div><div className="dinoSatDossierCellValue">{safeRenderText(intel.internationalDesignator)}</div></div>
          </div>
        </div>
      </div>

      {intel.factSheet && (
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span>Physical Properties Fact Sheet</span></div>
          <div className="dinoSatPanelCardBody">
            <div className="dinoSatDossierStrip">
              <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Spectral Type</div><div className="dinoSatDossierCellValue">{safeRenderText(intel.factSheet.manufacturer)}</div></div>
              <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Composition</div><div className="dinoSatDossierCellValue">{safeRenderText(intel.factSheet.bus)}</div></div>
              <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Estimated Mass</div><div className="dinoSatDossierCellValue">{safeRenderText(intel.factSheet.mass)}</div></div>
              <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Albedo</div><div className="dinoSatDossierCellValue">{safeRenderText(intel.factSheet.power)}</div></div>
              <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Rotation Period</div><div className="dinoSatDossierCellValue">{safeRenderText(intel.factSheet.designLife)}</div></div>
              <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Pole Direction</div><div className="dinoSatDossierCellValue">{safeRenderText(intel.factSheet.propulsion)}</div></div>
              <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Binary System</div><div className="dinoSatDossierCellValue">{safeRenderText(intel.factSheet.stabilization)}</div></div>
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
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faCircleNodes} /> Population Family Context</span></div>
          <div className="dinoSatPanelCardBody"><p className="dinoSatMissionBriefText">{safeRenderText(intel.constellationContext)}</p></div>
        </div>
      )}

      {intel.riskAssessment && (
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faTriangleExclamation} /> Risk Assessment</span></div>
          <div className="dinoSatPanelCardBody">
            <div className="dinoSatRiskGrid">
              <div className="dinoSatRiskItem"><b>Orbit Arc</b><p>{safeRenderText(intel.riskAssessment.tleAgeRisk)}</p></div>
              <div className="dinoSatRiskItem"><b>Impact Risk</b><p>{safeRenderText(intel.riskAssessment.decayRisk)}</p></div>
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
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faGlobe} /> Geopolitical / Defense Significance</span></div>
          <div className="dinoSatPanelCardBody"><p className="dinoSatMissionBriefText">{safeRenderText(intel.geopoliticalSignificance)}</p></div>
        </div>
      )}

      {intel.commercialContext && (
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faChartColumn} /> Commercial / Resource Context</span></div>
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
  let visibilityNote = "Insufficient orbital data to estimate observability.";

  const h = asteroid?.h;
  if (h !== null && h !== undefined) {
    if (h < 18 && isInner) {
      visibilityClass = "Naked eye possible";
      visibilityColor = "#4ade80";
      visibilityNote = "Bright NEO with absolute magnitude H<18. During favorable close approaches it can reach naked-eye visibility (V mag < 6) for observers in dark sky locations.";
    } else if (h < 22 && (isInner || isMainBelt)) {
      visibilityClass = "Binocular";
      visibilityColor = "#84cc16";
      visibilityNote = "Moderately bright object; binoculars or small telescope required during opposition or close approaches. Apparent magnitude typically V 8-12.";
    } else if (h < 26) {
      visibilityClass = "Telescope";
      visibilityColor = "#fb923c";
      visibilityNote = "Telescope required. Visible only in 8-inch or larger amateur instruments under dark skies during favorable apparitions. Apparent magnitude V 12-18.";
    } else {
      visibilityClass = "Specialized";
      visibilityColor = "#a78bfa";
      visibilityNote = "Faint object requiring large-aperture telescopes, CCD imaging, and tracking. Beyond reach of casual observation.";
    }
  }

  const enrichRef = (label) => {
    if (!label) return "";
    if (label === "JPL SBDB Browser") return "Authoritative orbit elements, physical parameters, and observation arc data for known small bodies.";
    if (label === "Minor Planet Center") return "IAU-sanctioned catalog with discovery circulars, observation logs, and ephemerides.";
    if (label === "JPL Horizons") return "High-precision ephemeris service for state vectors and topocentric ephemerides at arbitrary epochs.";
    if (label === "CNEOS Close Approach Tables") return "Database of past and predicted close approaches to Earth and other planets.";
    if (label === "CNEOS Sentry") return "Automated impact-monitoring system tracking objects with non-zero impact probability over the next century.";
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
        <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Population</div><div className="dinoSatDossierCellValue">{asteroid?.category || "—"}</div></div>
        <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Semi-Major Axis</div><div className="dinoSatDossierCellValue">{a.toFixed(3)}<span>AU</span></div></div>
        <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Period</div><div className="dinoSatDossierCellValue">{period.toFixed(2)}<span>years</span></div></div>
        <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Perihelion</div><div className="dinoSatDossierCellValue">{perihelion.toFixed(3)}<span>AU</span></div></div>
        <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Aphelion</div><div className="dinoSatDossierCellValue">{aphelion.toFixed(3)}<span>AU</span></div></div>
        <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Designation</div><div className="dinoSatDossierCellValue">{asteroid?.designation || "—"}</div></div>
        {isPHA && <div className="dinoSatDossierCell" style={{ borderLeftColor: "#ef4444" }}><div className="dinoSatDossierCellLabel">Hazard Class</div><div className="dinoSatDossierCellValue" style={{ color: "#ef4444" }}>PHA</div></div>}
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
              {observation.physicalProperties.diameter && <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Diameter</div><div className="dinoSatDossierCellValue">{observation.physicalProperties.diameter}<span>km</span></div></div>}
              {observation.physicalProperties.albedo && <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Albedo</div><div className="dinoSatDossierCellValue">{observation.physicalProperties.albedo}</div></div>}
              {observation.physicalProperties.rotationPeriod && <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Rotation Period</div><div className="dinoSatDossierCellValue">{observation.physicalProperties.rotationPeriod}<span>hours</span></div></div>}
              {observation.physicalProperties.spectralType && <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Spectral Type</div><div className="dinoSatDossierCellValue">{observation.physicalProperties.spectralType}</div></div>}
              {observation.physicalProperties.h !== undefined && <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Absolute Magnitude H</div><div className="dinoSatDossierCellValue">{observation.physicalProperties.h?.toFixed(2)}</div></div>}
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

const OrbitArcTab = ({ asteroid }) => {
  const ageDays = asteroid.observationArcDays;
  const errorEnvelope1y = ageDays !== null && ageDays !== undefined ? Math.max(100, 10000 / Math.max(1, ageDays / 365)) : null;
  const errorEnvelope10y = ageDays !== null && ageDays !== undefined ? Math.max(1000, 100000 / Math.max(1, ageDays / 365)) : null;
  return (
    <div className="dinoSatDossierTabContent">
      <div className="dinoSatPanelCard">
        <div className="dinoSatPanelCardHeader"><span>Orbit Determination Quality</span></div>
        <div className="dinoSatPanelCardBody">
          <div className="dinoSatDossierStrip">
            <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Epoch</div><div className="dinoSatDossierCellValue">{asteroid.epochISO || "Unknown"}</div></div>
            <div className="dinoSatDossierCell" style={{ borderLeftColor: orbitArcAgeColor(ageDays) }}><div className="dinoSatDossierCellLabel">Observation Arc</div><div className="dinoSatDossierCellValue" style={{ color: orbitArcAgeColor(ageDays) }}>{ageDays !== null && ageDays !== undefined ? Math.round(ageDays) : "?"}<span>days</span></div></div>
            <div className="dinoSatDossierCell" style={{ borderLeftColor: orbitArcAgeColor(ageDays) }}><div className="dinoSatDossierCellLabel">Quality Class</div><div className="dinoSatDossierCellValue" style={{ color: orbitArcAgeColor(ageDays) }}>{orbitArcAgeLabel(ageDays)}</div></div>
            <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Number of Observations</div><div className="dinoSatDossierCellValue">{asteroid.numObs || "?"}</div></div>
            <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Position Error +1y</div><div className="dinoSatDossierCellValue">{errorEnvelope1y !== null ? `~${errorEnvelope1y.toFixed(0)}` : "?"}<span>km</span></div></div>
            <div className="dinoSatDossierCell"><div className="dinoSatDossierCellLabel">Position Error +10y</div><div className="dinoSatDossierCellValue">{errorEnvelope10y !== null ? `~${errorEnvelope10y.toFixed(0)}` : "?"}<span>km</span></div></div>
          </div>
        </div>
      </div>
      <div className="dinoSatPanelCard">
        <div className="dinoSatPanelCardHeader"><span>Raw Orbital Elements (J2000 Heliocentric Ecliptic)</span></div>
        <div className="dinoSatPanelCardBody">
          <pre className="dinoSatTLEBlock">
{`Epoch JD:        ${asteroid.elements?.epoch || "?"}
Semi-major axis: ${asteroid.elements?.a?.toFixed(8) || "?"} AU
Eccentricity:    ${asteroid.elements?.e?.toFixed(8) || "?"}
Inclination:     ${asteroid.elements?.i?.toFixed(6) || "?"}°
Long. Asc Node:  ${asteroid.elements?.om?.toFixed(6) || "?"}°
Arg. Perihelion: ${asteroid.elements?.w?.toFixed(6) || "?"}°
Mean Anomaly:    ${asteroid.elements?.ma?.toFixed(6) || "?"}°`}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default function AsteroidCatalog() {
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);
  const [showErrors, setShowErrors] = useState(false);
  const [copiedErrors, setCopiedErrors] = useState(false);
  const [loadingMetadata, setLoadingMetadata] = useState(null);
  const [asteroids, setAsteroids] = useState([]);
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
  const [showOrbitalZones, setShowOrbitalZones] = useState(true);
  const [showDistanceRings, setShowDistanceRings] = useState(true);
  const [bloomEnabled, setBloomEnabled] = useState(true);
  const [bloomStrength, setBloomStrength] = useState(0.8);
  const [bloomRadius, setBloomRadius] = useState(0.4);
  const [bloomThreshold, setBloomThreshold] = useState(0.25);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [legendCollapsed, setLegendCollapsed] = useState(false);
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
      if (colorByObservationArcRef.current) { baseColor = orbitArcAgeColor(asteroid.observationArcDays); }
      tempColor.current.set(baseColor);
      asteroidInstanceRef.current.setColorAt(idx, tempColor.current);
      data.instanceIndex = idx;
      idx++;
    }
    asteroidInstanceRef.current.count = idx;
    glowInstanceRef.current.count = idx;
    asteroidInstanceRef.current.instanceMatrix.needsUpdate = true;
    glowInstanceRef.current.instanceMatrix.needsUpdate = true;
    if (asteroidInstanceRef.current.instanceColor) { asteroidInstanceRef.current.instanceColor.needsUpdate = true; }
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
    const url = `${import.meta.env.VITE_API_AUTH_URL}/asteroid-stream`;

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

    eventSource.addEventListener("batch", (event) => {
      try {
        const data = JSON.parse(event.data);
        if (!data.asteroids || data.asteroids.length === 0) return;
        const additions = [];
        for (const sat of data.asteroids) {
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
      const r = await fetch(`${import.meta.env.VITE_API_AUTH_URL}/neo-watch`);
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
      const r = await fetch(`${import.meta.env.VITE_API_AUTH_URL}/neo-watch-ai`, {
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
      try { intelAbortRef.current.abort(); } catch (error) {}
    }
    const controller = new AbortController();
    intelAbortRef.current = controller;

    setMissionIntelLoading(true);
    try {
      const r = await fetch(`${import.meta.env.VITE_API_AUTH_URL}/asteroid-intelligence`, {
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
      try { observationAbortRef.current.abort(); } catch (error) {}
    }
    const controller = new AbortController();
    observationAbortRef.current = controller;

    setObservationLoading(true);
    try {
      const r = await fetch(`${import.meta.env.VITE_API_AUTH_URL}/asteroid-observation`, {
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
      const r = await fetch(`${import.meta.env.VITE_API_AUTH_URL}/asteroid-population-census`);
      const j = await r.json();
      if (j.success) setPHACatalog(j.populations);
    } catch (error) {} finally {
      setPHALoading(false);
    }
  }, []);

  const fetchSentryWatch = useCallback(async () => {
    setSentryLoading(true);
    try {
      const r = await fetch(`${import.meta.env.VITE_API_AUTH_URL}/sentry-watch`);
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
      return { visibleItems: filteredAsteroids.slice(0, 20), startIndex: 0, endIndex: 19 };
    }

    const containerHeight = virtualScrollRef.current.clientHeight || 400;
    const itemHeight = PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT;
    const buffer = PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_BUFFER;

    const startIndex = Math.max(0, Math.floor(virtualScrollOffset / itemHeight) - buffer);
    const endIndex = Math.min(
      filteredAsteroids.length - 1,
      Math.ceil((virtualScrollOffset + containerHeight) / itemHeight) + buffer
    );

    const visibleItems = filteredAsteroids.slice(startIndex, endIndex + 1);

    return { visibleItems, startIndex, endIndex };
  }, [filteredAsteroids, virtualScrollOffset]);

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
      try { t.stop(); } catch (error) {}
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
    if (!detailedAsteroid) {
      if (intelAbortRef.current) {
        try { intelAbortRef.current.abort(); } catch (error) {}
        intelAbortRef.current = null;
      }
      if (observationAbortRef.current) {
        try { observationAbortRef.current.abort(); } catch (error) {}
        observationAbortRef.current = null;
      }
    }
  }, [detailedAsteroid]);

  useEffect(() => {
    if (!selectedAsteroid) return;
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
      fetchAsteroidData();
      const interval = setInterval(() => fetchAsteroidData(), 60 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [sceneInitialized, fetchAsteroidData]);

  useEffect(() => { if (gridRef.current) gridRef.current.visible = showGrid; }, [showGrid]);
  useEffect(() => { if (eclipticGridRef.current) eclipticGridRef.current.visible = showEclipticGrid; }, [showEclipticGrid]);
  useEffect(() => { if (axisMarkersRef.current) axisMarkersRef.current.visible = showAxisMarkers; }, [showAxisMarkers]);
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
      <div className="dinoSatDossierTabContent">
        <div className="dinoSatStatTileGrid">
          <StatTile label="Status" value={sat.status || "Active"} sub={`${sat.category} · Two-body Kepler`} color="#4ade80" accent={sat.color} large />
          <StatTile label="Designation" value={sat.designation || "—"} sub={sat.group || "Unclassified"} accent="#42a5f5" />
          <StatTile label="Observation Arc" value={ageDays !== null && ageDays !== undefined ? `${Math.round(ageDays)}d` : "?"} sub={orbitArcAgeLabel(ageDays)} color={arcColor} accent={arcColor} />
          <StatTile label="Semi-Major Axis" value={sat.semiMajorAxisAU} unit="AU" sub={`${sat.perihelionAU} q / ${sat.aphelionAU} Q`} accent="#42a5f5" />
          <StatTile label="Period" value={sat.orbitalPeriodYears} unit="years" sub={`${sat.orbitalPeriodDays} days`} accent="#42a5f5" />
          <StatTile label="Inclination" value={`${sat.inclination}°`} sub={`${inclLabel} · Ω ${sat.raan}°`} accent="#42a5f5" />
          <StatTile label="Eccentricity" value={sat.eccentricity} sub={eccLabel} accent="#42a5f5" />
          <StatTile label="Mean Velocity" value={sat.meanVelocity} unit="km/s" sub={`q: ${sat.velocityAtPerihelion} / Q: ${sat.velocityAtAphelion}`} accent="#42a5f5" />
          {sat.isPHA && <StatTile label="Hazard Class" value="PHA" sub="Potentially Hazardous" color="#ef4444" accent="#ef4444" />}
          {sat.moidAU !== null && sat.moidAU !== undefined && <StatTile label="Earth MOID" value={sat.moidAU.toFixed(6)} unit="AU" sub={moidLabel(sat.moidAU)} color={moidColor(sat.moidAU)} accent={moidColor(sat.moidAU)} />}
          {sat.h !== null && sat.h !== undefined && <StatTile label="Absolute Mag H" value={sat.h.toFixed(2)} sub="Asteroid magnitude" accent="#42a5f5" />}
          {sat.diameter && <StatTile label="Estimated Diameter" value={sat.diameter} unit="km" accent="#42a5f5" />}
          {sat.elements && <StatTile label="Render State" value={isVisible ? "Visible" : "Culled"} sub="Heliocentric Ecliptic" color={isVisible ? "#4ade80" : "#fb923c"} accent={isVisible ? "#4ade80" : "#fb923c"} />}
          {advanced.tisserandJupiter && <StatTile label="Tisserand (J)" value={advanced.tisserandJupiter} sub={advanced.tisserandJupiter < 3 ? "Comet-like" : "Asteroid-like"} accent="#42a5f5" />}
        </div>

        <div className="dinoSatDossierGrid">
          <div className="dinoSatPanelCard">
            <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faRulerCombined} /> Keplerian Elements</span></div>
            <div className="dinoSatPanelCardBody">
              <div className="dinosatSatelliteHUDSectionGrid">
                <div className="dinosatSatelliteHUDSectionItem"><span>Semi-Major Axis (a)</span><span>{sat.semiMajorAxisAU} AU</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Eccentricity (e)</span><span>{sat.eccentricity}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Inclination (i)</span><span>{sat.inclination}°</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Long. Asc. Node (Ω)</span><span>{sat.raan}°</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Arg. Perihelion (ω)</span><span>{sat.argOfPerihelion}°</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Mean Anomaly (M)</span><span>{sat.meanAnomaly}°</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Mean Motion (n)</span><span>{sat.meanMotion} °/d</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Perihelion (q)</span><span>{sat.perihelionAU} AU</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Aphelion (Q)</span><span>{sat.aphelionAU} AU</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Aphelion/Perihelion</span><span>{sat.aphelionAU && sat.perihelionAU ? (sat.aphelionAU / sat.perihelionAU).toFixed(3) : "—"}</span></div>
              </div>
            </div>
          </div>

          <div className="dinoSatPanelCard">
            <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faAtom} /> Derived Orbital Mechanics</span></div>
            <div className="dinoSatPanelCardBody">
              <div className="dinosatSatelliteHUDSectionGrid">
                <div className="dinosatSatelliteHUDSectionItem"><span>Mean Velocity</span><span>{sat.meanVelocity} km/s</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Velocity at q</span><span>{sat.velocityAtPerihelion} km/s</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Velocity at Q</span><span>{sat.velocityAtAphelion} km/s</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Specific Energy</span><span>{sat.specificEnergy} km²/s²</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Angular Momentum</span><span>{sat.angularMomentum} km²/s</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Tisserand (Jupiter)</span><span>{advanced.tisserandJupiter}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Orbit Circumference</span><span>{advanced.orbitCircumferenceAU} AU</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Long. of Perihelion</span><span>{advanced.heliocentricLongPerihelion}°</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Earth-crossing</span><span>{advanced.earthCrossing ? "Yes" : "No"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Mars-crossing</span><span>{advanced.marsCrossing ? "Yes" : "No"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Jupiter-crossing</span><span>{advanced.jupiterCrossing ? "Yes" : "No"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>PHA Status</span><span style={{ color: advanced.isPHA ? "#ef4444" : "#4ade80" }}>{advanced.isPHA ? "Yes" : "No"}</span></div>
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
                <div className="dinosatSatelliteHUDSectionItem"><span>PHA Threshold</span><span>MOID &lt; 0.05 AU AND H &lt; 22</span></div>
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
                <div className="dinosatSatelliteHUDSectionItem"><span>Status</span><span style={{ color: "#4ade80" }}>{sat.status || "Active"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Source</span><span>{sat.source || "JPL SBDB"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Propagation</span><span style={{ color: "#4ade80" }}>Two-body Kepler</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Has Elements</span><span>{sat.elements ? "Yes" : "No"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Epoch (JD)</span><span>{sat.elements?.epoch !== undefined ? sat.elements.epoch : "—"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Number of Obs</span><span>{sat.numObs || "?"}</span></div>
                <div className="dinosatSatelliteHUDSectionItem"><span>Absolute Magnitude</span><span>{sat.h !== null && sat.h !== undefined ? sat.h.toFixed(2) : "—"}</span></div>
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
                  <div className="dinosatSatelliteHUDSectionItem"><span>Position Source</span><span style={{ color: "#4ade80" }}>Two-body Kepler</span></div>
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
                <div className="dinoSatBriefingItem"><b>Population Class</b><p>{sat.category} object at semi-major axis {sat.semiMajorAxisAU} AU. {advanced.earthCrossing ? "Earth-crossing trajectory; perihelion below 1.017 AU." : advanced.marsCrossing ? "Mars-crossing without entering Earth's neighborhood." : "Outer-system orbit clear of inner planets."}</p></div>
                <div className="dinoSatBriefingItem"><b>Hazard Profile</b><p>{sat.isPHA ? `Classified as Potentially Hazardous. MOID ${sat.moidAU?.toFixed(6)} AU, absolute magnitude ${sat.h?.toFixed(1)}. Subject to enhanced observation campaigns.` : sat.moidAU !== null && sat.moidAU !== undefined && sat.moidAU < 0.2 ? "Close-Earth orbit but does not meet PHA threshold." : "No imminent close-approach concerns."}</p></div>
                <div className="dinoSatBriefingItem"><b>Mission Accessibility</b><p>{advanced.tisserandJupiter > 3 && sat.semiMajorAxisAU < 2 ? "Low-Δv accessibility from Earth; favorable for sample return or rendezvous missions." : sat.semiMajorAxisAU > 5 ? "Outer-system; high-Δv mission, gravity assist required." : "Moderate Δv; mission window dependent on synodic alignment."}</p></div>
                <div className="dinoSatBriefingItem"><b>Tisserand Classification</b><p>{advanced.tisserandJupiter < 3 ? "Tisserand parameter below 3 indicates comet-like dynamics; orbit is gravitationally coupled to Jupiter and may show non-gravitational forces." : "Asteroid-like dynamics decoupled from Jupiter perturbations on short timescales."}</p></div>
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
              <label>Loading Asteroid Data...</label>
              <div className="dinoSatSatelliteSideBarLoadingBar">
                <div className="dinoSatSatelliteSideBarLoadingBarAccent" />
              </div>
              <small>Fetching from JPL SBDB, NeoWs, MPC, CNEOS Sentry...</small>
            </div>
          )}

          <div className="dinoSatSatelliteSideBarHeader">
            <h1>
              {!sidebarCollapsed && <small>Asteroid Tracker</small>}
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
                <input type="text" placeholder="Search asteroids..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="dinoSatSatelliteSearchInput" />
                <div className="dinoSatSatelliteSelectControls">
                  <button className="dinoSatSatelliteSelectButton" onClick={selectAllAsteroids}>All</button>
                  <button className="dinoSatSatelliteSelectButton" onClick={deselectAllAsteroids}>None</button>
                  <button className="dinoSatSatelliteSelectButton" onClick={fetchAsteroidData}>Refresh</button>
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
                <span className="dinoSatSatelliteObjectsHeaderIcon"><FontAwesomeIcon icon={faMeteor} /></span>
                <span>Asteroids ({asteroids.filter(s => s.active).length}/{asteroids.length})</span>
              </div>

              <div
                ref={virtualScrollRef}
                className="dinoSatSatelliteList satellite-list"
                style={{ flex: 1, overflowY: "auto", position: "relative" }}
                onScroll={handleVirtualScroll}
              >
                <div style={{ height: filteredAsteroids.length * PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT, position: "relative" }}>
                  <div style={{ position: "absolute", top: startIndex * PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT, width: "100%" }}>
                    {visibleItems.map((asteroid) => (
                      <div
                        key={asteroid.id}
                        className={`dinoSatSatelliteListItem satellite-item ${asteroid.active ? "dinoSatSatelliteButtonActive" : ""} ${selectedAsteroid === asteroid.id ? "satellite-selected" : ""}`}
                        style={{ height: PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT, minHeight: PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT }}
                        onClick={() => {
                          if (!asteroid.active) { toggleAsteroid(asteroid.id); }
                          setSelectedAsteroid(asteroid.id);
                          zoomToAsteroid(asteroid.id);
                        }}
                      >
                        <div className="dinoSatSatelliteIndicator" style={{ backgroundColor: asteroid.color }} />
                        <div className="dinoSatSatelliteTleBadge" style={{ backgroundColor: orbitArcAgeColor(asteroid.observationArcDays) }} title={`Arc: ${orbitArcAgeLabel(asteroid.observationArcDays)}`} />
                        <div className="dinoSatSatelliteName satellite-name">{asteroid.name}</div>
                        <label className="consoleSwitch">
                          <input type="checkbox" checked={asteroid.active} onChange={() => { toggleAsteroid(asteroid.id); }} />
                          <span className="consoleSlider round"></span>
                        </label>
                        <button className="dinoSatSatelliteInfoButton" onClick={(event) => { event.stopPropagation(); openDossier(asteroid); }} aria-label="Show dossier">
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
          <NEOWatchStrip data={neoWatch} loading={neoWatchLoading} expanded={neoWatchExpanded} onToggle={toggleNEOWatchExpanded} />

          {neoWatchExpanded && (
            <NEOWatchDetail data={neoWatch} onClose={() => setNEOWatchExpanded(false)} onRequestAIAnalysis={() => fetchNEOWatchAI(true)} aiAnalysis={neoWatchAI} aiLoading={neoWatchAILoading} onSelect={openDossier} />
          )}

          {showCloseApproachPanel && (
            <CloseApproachesPanel approaches={closeApproaches} onSelect={openDossier} onClose={() => setShowCloseApproachPanel(false)} asteroids={asteroids} />
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
              <button className={`dinoSatSatellitePlaybackControlsButton ${showSentryPanel ? "dinoSatSatelliteButtonActive" : ""}`} onClick={toggleSentryPanel}><FontAwesomeIcon icon={faFire} /> Sentry Watch</button>

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
                      <button className="dinoSatSatelliteControlButton" onClick={toggleBloom}>{bloomEnabled ? "Disable" : "Enable"} Bloom</button>
                      <button className="dinoSatSatelliteControlButton" onClick={toggleAxisMarkers}>{showAxisMarkers ? "Hide" : "Show"} Axes</button>
                      <button className="dinoSatSatelliteControlButton" onClick={toggleEclipticGrid}>{showEclipticGrid ? "Hide" : "Show"} Grid</button>
                      <button className="dinoSatSatelliteControlButton" onClick={toggleOrbitalZones}>{showOrbitalZones ? "Hide" : "Show"} Zones</button>
                      <button className="dinoSatSatelliteControlButton" onClick={toggleDistanceRings}>{showDistanceRings ? "Hide" : "Show"} Planets</button>
                    </div>
                    <div className="dinoSatSatelliteBloomControls">
                      <div className="dinoSatSatelliteBloomSlider">
                        <span>CA AU</span>
                        <input type="range" min="0.005" max="0.5" step="0.005" value={closeApproachThreshold} onChange={(event) => setCloseApproachThreshold(parseFloat(event.target.value))} />
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
                  <StatTile label="Visible Asteroids" value={performanceStats.visibleAsteroids} color="#4ade80" accent="#4ade80" />
                  <StatTile label="Culled" value={performanceStats.culledAsteroids} color="#fb923c" accent="#fb923c" />
                  <StatTile label="Active / Total" value={`${activeAsteroids} / ${asteroids.length}`} accent="#42a5f5" />
                  <StatTile label="Close Approaches" value={closeApproaches.length} color={closeApproaches.length > 0 ? "#fb923c" : "#4ade80"} accent={closeApproaches.length > 0 ? "#fb923c" : "#4ade80"} />
                  <StatTile label="Sim Speed" value={speedLabel} accent="#42a5f5" />
                  <StatTile label="Memory" value={performanceStats.memoryUsage} unit="objects" accent="#42a5f5" />
                  <StatTile label="Geometries" value={performanceStats.geometries} accent="#42a5f5" />
                  <StatTile label="Textures" value={performanceStats.textures} accent="#42a5f5" />
                  <StatTile label="NEO Count" value={neoCount} color="#fb923c" accent="#fb923c" />
                  <StatTile label="PHA Count" value={phaCount} color="#ef4444" accent="#ef4444" />
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
                        <div className="dinosatSatelliteHUDSectionItem"><span>Two-body Kepler</span><span style={{ color: "#4ade80" }}>{keplerCount}</span></div>
                        <div className="dinosatSatelliteHUDSectionItem"><span>NEO Asteroids</span><span style={{ color: "#fb923c" }}>{neoCount}</span></div>
                        <div className="dinosatSatelliteHUDSectionItem"><span>PHAs</span><span style={{ color: "#ef4444" }}>{phaCount}</span></div>
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
                      <div className="dinoSatPanelCardHeader"><span>NEO Watch Snapshot</span></div>
                      <div className="dinoSatPanelCardBody">
                        <div className="dinosatSatelliteHUDSectionGrid">
                          <div className="dinosatSatelliteHUDSectionItem"><span>Status</span><span style={{ color: neoWatch.overall?.color }}>{neoWatch.overall?.status}</span></div>
                          <div className="dinosatSatelliteHUDSectionItem"><span>Next 7 Days</span><span>{neoWatch.next7Days || 0}</span></div>
                          <div className="dinosatSatelliteHUDSectionItem"><span>Next 30 Days</span><span>{neoWatch.next30Days || 0}</span></div>
                          <div className="dinosatSatelliteHUDSectionItem"><span>PHA Catalog</span><span style={{ color: "#ef4444" }}>{neoWatch.totalPHACount || 0}</span></div>
                          <div className="dinosatSatelliteHUDSectionItem"><span>Sentry Risk</span><span style={{ color: (neoWatch.sentryRiskCount || 0) > 0 ? "#fb923c" : "#4ade80" }}>{neoWatch.sentryRiskCount || 0}</span></div>
                          <div className="dinosatSatelliteHUDSectionItem"><span>Recent Discoveries</span><span>{neoWatch.recentDiscoveriesCount || 0}</span></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {detailedAsteroid && enrichedDetailedAsteroid && (
            <div ref={detailedPanelRef} className="dinoSatSatelliteDetailedPanel" tabIndex={0}>
              <div className="dinoSatSatelliteHUDPanelHeader">
                <span>
                  Asteroid Details: {enrichedDetailedAsteroid.name}
                  <small style={{ marginLeft: "12px", color: orbitArcAgeColor(enrichedDetailedAsteroid.observationArcDays) }}>
                    Arc: {orbitArcAgeLabel(enrichedDetailedAsteroid.observationArcDays)}
                  </small>
                </span>
                <button className="dinoSatSatelliteCloseButton" onClick={() => setDetailedAsteroid(null)}><FontAwesomeIcon icon={faXmark} /></button>
              </div>

              <div className="dinoSatDossierTabs">
                <div className="dinoSatDossierTabsScroll">
                  {[
                    { key: "orbital", label: "Orbital", icon: faMeteor },
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

              <div className="dinoSatSatelliteHUDContent dinoSatDossierBody">
                {activeDossierTab === "orbital" && renderOrbitalDossierContent()}

                {activeDossierTab === "intel" && (
                  <MissionIntelligenceTab asteroid={enrichedDetailedAsteroid} intelligence={currentMissionIntel} loading={missionIntelLoading && !currentMissionIntel} onRefresh={() => fetchMissionIntelligenceFor(enrichedDetailedAsteroid, true)} />
                )}

                {activeDossierTab === "observations" && (
                  <ObservationsTab asteroid={enrichedDetailedAsteroid} observation={currentObservation} loading={observationLoading && !currentObservation} onRefresh={() => fetchObservationDataFor(enrichedDetailedAsteroid, true)} />
                )}

                {activeDossierTab === "passes" && (
                  <FlybyPredictionsTab asteroid={enrichedDetailedAsteroid} observerLocation={observerLocation} onLocationChange={setObserverLocation} onRequestGeolocation={requestGeolocation} currentDate={new Date(simulationDateMsRef.current)} />
                )}

                {activeDossierTab === "tle" && (
                  <OrbitArcTab asteroid={enrichedDetailedAsteroid} />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}