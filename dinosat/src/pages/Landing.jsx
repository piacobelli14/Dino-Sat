import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlane, faCloudBolt, faSatellite, faMeteor, faSnowflake, faGlobe, faUserPlus,
  faRightToBracket, faGauge, faExclamationCircle
} from "@fortawesome/free-solid-svg-icons";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass";
import * as satelliteJs from "satellite.js";
import Nav from "../helpers/Nav.jsx";
import useAuth from "../UseAuth.jsx";
import "../styles/mainStyles/Sat/Trackers/WeatherTracker/WeatherTracker.css";
import "../styles/mainStyles/Landing.css";
import "../styles/helperStyles/LoadingSpinner.css";

const SOURCES = {
  apiBase: import.meta.env.VITE_API_BASE_URL,
  endpoints: {
    summary: "/landing/summary",
    demo: "/landing/demo"
  },
  routes: {
    register: "/register",
    login: "/login"
  },
  assets: {
    satelliteTiles: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
  },
  refreshMs: {
    summary: 60 * 1000,
    summaryPending: 3 * 1000,
    demoPending: 3 * 1000,
    flights: 15 * 1000,
    weather: 60 * 1000,
    satellites: 15 * 60 * 1000,
    asteroids: 30 * 60 * 1000,
    comets: 30 * 60 * 1000
  },
  view: {
    center: [-96, 38],
    globeZoom: 0.95,
    flatZoom: 2.6
  },
  layout: {
    copyFraction: 0.4,
    copyMaxPx: 600,
    overlayAbovePx: 1000
  },
  earthTexture: {
    textureZoom: 3,
    tileSize: 256
  },
  scene: {
    maxInstances: 2000,
    satelliteStepMs: 1000,
    heliocentricStepMs: 60 * 1000,
    earth: { camera: [150, 80, 150], far: 8000, fog: 0.00002, exposure: 1.2, bloom: [0.6, 0.3, 0.3], stars: [8000, 1500, 3000], maxDistance: 2000, minDistance: 10 },
    asteroids: { camera: [180, 100, 180], far: 16000, fog: 0.000005, exposure: 1.3, bloom: [0.8, 0.4, 0.25], stars: [10000, 3000, 6000], maxDistance: 6000, minDistance: 6 },
    comets: { camera: [180, 100, 180], far: 16000, fog: 0.000005, exposure: 1.3, bloom: [0.9, 0.5, 0.22], stars: [10000, 3000, 6000], maxDistance: 6000, minDistance: 6 }
  }
};

const FLIGHT_SOURCES = {
  apiBase: import.meta.env.VITE_API_BASE_URL,
  endpoints: {
    snapshot: "/flights/snapshot"
  },
  snapshotMs: 5000,
  assets: {
    maplibreCss: "https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.css",
    maplibreScript: "https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.js",
    deckScript: "https://unpkg.com/deck.gl@9.3.6/dist.min.js",
    deckMapboxScript: "https://unpkg.com/@deck.gl/mapbox@9.3.6/dist.min.js",
    satelliteTiles: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    labelTiles: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf"
  },
  attributions: [
    "<a href=\"https://opensky-network.org\" target=\"_blank\" rel=\"noopener noreferrer\">The OpenSky Network</a>",
    "<a href=\"https://adsb.fi\" target=\"_blank\" rel=\"noopener noreferrer\">adsb.fi</a>",
    "<a href=\"https://adsb.lol\" target=\"_blank\" rel=\"noopener noreferrer\">adsb.lol</a> (ODbL)",
    "<a href=\"https://ourairports.com\" target=\"_blank\" rel=\"noopener noreferrer\">OurAirports</a>"
  ],
  refresh: {
    animationMs: 1000
  },
  map: {
    minZoom: 1,
    maxZoom: 16,
    labelZoom: 6,
    minZoomGlobe: 0,
    maxLabels: 800,
    deadReckonSeconds: 300
  }
};

const WEATHER_SOURCES = {
  apiBase: import.meta.env.VITE_API_BASE_URL,
  endpoints: {
    radar: "/weather/radar",
    alerts: "/weather/alerts",
    storms: "/weather/storms",
    reports: "/weather/reports",
    tropical: "/weather/tropical"
  },
  layersMs: 60 * 1000,
  assets: {
    maplibreCss: "https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.css",
    maplibreScript: "https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.js",
    deckScript: "https://unpkg.com/deck.gl@9.3.6/dist.min.js",
    deckMapboxScript: "https://unpkg.com/@deck.gl/mapbox@9.3.6/dist.min.js",
    satelliteTiles: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    labelTiles: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf"
  },
  attributions: [
    "<a href=\"https://mesonet.agron.iastate.edu\" target=\"_blank\" rel=\"noopener noreferrer\">Iowa Environmental Mesonet</a>",
    "<a href=\"https://www.weather.gov\" target=\"_blank\" rel=\"noopener noreferrer\">NWS</a>",
    "<a href=\"https://www.spc.noaa.gov\" target=\"_blank\" rel=\"noopener noreferrer\">SPC</a>",
    "<a href=\"https://www.nhc.noaa.gov\" target=\"_blank\" rel=\"noopener noreferrer\">NHC</a>",
    "Weather data by <a href=\"https://www.rainviewer.com\" target=\"_blank\" rel=\"noopener noreferrer\">RainViewer</a>",
    "<a href=\"https://open-meteo.com\" target=\"_blank\" rel=\"noopener noreferrer\">Open-Meteo</a>",
    "<a href=\"https://realearth.ssec.wisc.edu\" target=\"_blank\" rel=\"noopener noreferrer\">SSEC RealEarth</a>",
    "<a href=\"https://www.earthdata.nasa.gov/engage/open-data-services-software/earthdata-developer-portal/gibs-api\" target=\"_blank\" rel=\"noopener noreferrer\">NASA GIBS</a>"
  ],
  map: {
    minZoom: 1,
    maxZoom: 14,
    minZoomGlobe: 0,
    stormLabelZoom: 7,
    trailSpacingPx: 7,
    trailMaxDots: 400,
    stormAllZoom: 6,
    stormMinSeverity: 2,
    stormVectorMinutes: [15, 30, 45, 60],
    reportLabelZoom: 6,
    tropicalLabelZoom: 3,
    maxAlertsDrawn: 2500
  }
};

const DEMOS = [
  {
    key: "flights",
    counterLabel: "Aircraft",
    route: "/flight-tracker",
    label: "Flights",
    icon: faPlane,
    viewer: "map",
    title: "Global Flight Tracker",
    description: "Every aircraft is a real flight reporting its position right now, colored by altitude. The full tracker adds search, emergencies, trails and airport data.",
    stats: [["Tracked", "total"], ["In The Air", "airborne"], ["On The Ground", "ground"], ["Emergencies", "emergencies"]]
  },
  {
    key: "weather",
    counterLabel: "Alerts",
    route: "/weather-tracker",
    label: "Weather",
    icon: faCloudBolt,
    viewer: "map",
    title: "National Weather Tracker",
    description: "Live radar with every warning, storm cell and storm report in effect right now. The full tracker adds live radar, storm cells, local forecasts and alert sounds.",
    stats: [["Active Alerts", "total"], ["Warnings", "warnings"], ["Tornado Warnings", "tornadoWarnings"], ["Storm Cells", "stormCells"]]
  },
  {
    key: "satellites",
    counterLabel: "Satellites",
    route: "/satellite-tracker",
    label: "Satellites",
    icon: faSatellite,
    viewer: "earth",
    title: "Satellite Tracker",
    description: "Every dot is a satellite in its real orbit around the Earth, moving in real time. Drag to rotate and scroll to zoom. The full tracker adds orbits, passes and conjunctions.",
    stats: [["Catalogued", "total"], ["Low Earth Orbit", "lowEarth"], ["Geostationary", "geostationary"], ["Shown Here", "shown"]]
  },
  {
    key: "asteroids",
    counterLabel: "Asteroids",
    route: "/asteroid-tracker",
    label: "Asteroids",
    icon: faMeteor,
    viewer: "helio",
    title: "Asteroid Tracker",
    description: "Every dot is an asteroid where it is around the Sun today. Drag to rotate and scroll to zoom. The full tracker adds close approaches and impact risk.",
    stats: [["Catalogued", "total"], ["Near Earth", "nearEarth"], ["Hazardous", "hazardous"], ["Shown Here", "shown"]]
  },
  {
    key: "comets",
    counterLabel: "Comets",
    route: "/comet-tracker",
    label: "Comets",
    icon: faSnowflake,
    viewer: "helio",
    title: "Comet Tracker",
    description: "Every dot is a comet where it is around the Sun today. Drag to rotate and scroll to zoom. The full tracker adds brightness, apparitions and observing windows.",
    stats: [["Catalogued", "total"], ["Periodic", "periodic"], ["Near The Sun", "nearSun"], ["Shown Here", "shown"]]
  }
];

const SCENE_EARTH_RADIUS = 6.371;
const EARTH_RADIUS_KM = 6378.137;
const SCENE_SUN_RADIUS = 4.0;
const NON_BLOOM_LAYER = 1;
const EARTH_CONSTANTS = { DEG_TO_RAD: Math.PI / 180.0, SCALE_FACTOR: 200 };
const HELIO_CONSTANTS = { DEG_TO_RAD: Math.PI / 180.0, SCALE_FACTOR: 12.0 };

const formatCount = (value) => (value === null || value === undefined || Number.isNaN(Number(value)) ? "—" : Number(value).toLocaleString());

const errorText = (error) => (error && error.message ? error.message : String(error));

const julianDate = (date) => date.getTime() / 86400000 + 2440587.5;

const solveKepler = (meanAnomaly, eccentricity) => {
  let value = eccentricity < 0.8 ? meanAnomaly : Math.PI;
  for (let step = 0; step < 40; step += 1) {
    const delta = (value - eccentricity * Math.sin(value) - meanAnomaly) / (1 - eccentricity * Math.cos(value));
    value -= delta;
    if (Math.abs(delta) < 1e-9) break;
  }
  return value;
};

const heliocentric = (elements, jd) => {
  const rad = Math.PI / 180;
  const a = Number(elements.a);
  const e = Number(elements.e);
  if (!(a > 0) || !(e >= 0) || e >= 1) return null;
  const motion = 0.01720209895 / Math.pow(a, 1.5);
  let mean;
  if (elements.ma !== null && elements.ma !== undefined && Number.isFinite(Number(elements.epoch))) mean = Number(elements.ma) * rad + motion * (jd - Number(elements.epoch));
  else if (Number.isFinite(Number(elements.tp))) mean = motion * (jd - Number(elements.tp));
  else return null;
  mean = ((mean % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const anomaly = solveKepler(mean, e);
  const px = a * (Math.cos(anomaly) - e);
  const py = a * Math.sqrt(1 - e * e) * Math.sin(anomaly);
  const w = Number(elements.w || 0) * rad;
  const om = Number(elements.om || 0) * rad;
  const inc = Number(elements.i || 0) * rad;
  const x = (Math.cos(om) * Math.cos(w) - Math.sin(om) * Math.sin(w) * Math.cos(inc)) * px + (-Math.cos(om) * Math.sin(w) - Math.sin(om) * Math.cos(w) * Math.cos(inc)) * py;
  const y = (Math.sin(om) * Math.cos(w) + Math.cos(om) * Math.sin(w) * Math.cos(inc)) * px + (-Math.sin(om) * Math.sin(w) + Math.cos(om) * Math.cos(w) * Math.cos(inc)) * py;
  const z = Math.sin(w) * Math.sin(inc) * px + Math.cos(w) * Math.sin(inc) * py;
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return null;
  return { x, y, z, distance: Math.sqrt(x * x + y * y + z * z) };
};

const earthPosition = (jd) => {
  const rad = Math.PI / 180;
  const centuries = (jd - 2451545.0) / 36525.0;
  const mean = (280.46646 + 36000.76983 * centuries) * rad;
  const anomaly = (357.52911 + 35999.05029 * centuries) * rad;
  const longitude = mean + (1.914602 - 0.004817 * centuries) * Math.sin(anomaly) * rad + (0.019993 - 0.000101 * centuries) * Math.sin(2 * anomaly) * rad;
  const distance = 1.00014 - 0.01671 * Math.cos(anomaly) - 0.00014 * Math.cos(2 * anomaly);
  return { x: -distance * Math.cos(longitude), y: -distance * Math.sin(longitude), distance };
};

let earthTextureRequest = null;

const createEarthTextSprite = (text, color) => {
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

const createEarthAxisMarkers = () => {
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

  const xLabel = createEarthTextSprite("X (Vernal Eq.)", 0x8ababa);
  xLabel.position.set(axisLength + SCENE_EARTH_RADIUS + 12, 2, 0);
  group.add(xLabel);

  const yLabel = createEarthTextSprite("Y (90E Long)", 0x8aba8a);
  yLabel.position.set(0, axisLength + SCENE_EARTH_RADIUS + 12, 0);
  group.add(yLabel);

  const zLabel = createEarthTextSprite("Z (North Pole)", 0x8a8aba);
  zLabel.position.set(0, 2, axisLength + SCENE_EARTH_RADIUS + 12);
  group.add(zLabel);

  const originLabel = createEarthTextSprite("Earth Center", 0x999999);
  originLabel.position.set(0, -SCENE_EARTH_RADIUS - 4, 0);
  group.add(originLabel);

  return group;
};

const createAltitudeBands = () => {
  const group = new THREE.Group();
  group.name = "AltitudeBands";
  const scaleFactor = EARTH_CONSTANTS.SCALE_FACTOR;

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
    const label = createEarthTextSprite(band.name, band.color);
    label.position.set(labelRadius * Math.cos(labelAngle), 1, labelRadius * Math.sin(labelAngle));
    group.add(label);
  });

  return group;
};

const createEarthDistanceRings = () => {
  const group = new THREE.Group();
  group.name = "DistanceRings";
  const scaleFactor = EARTH_CONSTANTS.SCALE_FACTOR;

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
    const label = createEarthTextSprite(dist.label, isGeo ? 0xFF6B6B : 0x7a8a9a);
    label.position.set(radius * Math.cos(labelAngle), 0.5, radius * Math.sin(labelAngle));
    group.add(label);
  });

  return group;
};

const computeSunDirectionECI = (date) => {
  const targetJD = julianDate(date);
  const T = (targetJD - 2451545.0) / 36525.0;
  const L = (280.46646 + 36000.76983 * T) * EARTH_CONSTANTS.DEG_TO_RAD;
  const g = (357.52911 + 35999.05029 * T) * EARTH_CONSTANTS.DEG_TO_RAD;
  const lambda = L + (1.914602 - 0.004817 * T) * Math.sin(g) * EARTH_CONSTANTS.DEG_TO_RAD
    + (0.019993 - 0.000101 * T) * Math.sin(2 * g) * EARTH_CONSTANTS.DEG_TO_RAD;
  const obliquity = (23.4393 - 0.0130042 * T) * EARTH_CONSTANTS.DEG_TO_RAD;
  const x = Math.cos(lambda);
  const y = Math.cos(obliquity) * Math.sin(lambda);
  const z = Math.sin(obliquity) * Math.sin(lambda);
  return { x, y, z };
};

const eciToScene = (eci) => {
  const distKm = Math.sqrt(eci.x * eci.x + eci.y * eci.y + eci.z * eci.z);
  if (distKm <= 0 || !Number.isFinite(distKm)) {
    return null;
  }
  const altKm = distKm - EARTH_RADIUS_KM;
  const sceneR = SCENE_EARTH_RADIUS + altKm / EARTH_CONSTANTS.SCALE_FACTOR;
  const scale = sceneR / distKm;
  return new THREE.Vector3(eci.x * scale, eci.z * scale, -eci.y * scale);
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

const createDistanceRings = () => {
  const group = new THREE.Group();
  group.name = "DistanceRings";
  const scaleFactor = HELIO_CONSTANTS.SCALE_FACTOR;

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

const createAsteroidZones = () => {
  const group = new THREE.Group();
  group.name = "OrbitalZones";
  const scaleFactor = HELIO_CONSTANTS.SCALE_FACTOR;

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

const createCometZones = () => {
  const group = new THREE.Group();
  group.name = "OrbitalZones";
  const scaleFactor = HELIO_CONSTANTS.SCALE_FACTOR;

  const zones = [
    { name: "Inner System (Sungrazer Perihelia)", innerRadius: 0.005 * scaleFactor, outerRadius: 0.39 * scaleFactor, color: 0xFFD060 },
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

const loadEarthTexture = () => {
  if (earthTextureRequest) return earthTextureRequest;
  earthTextureRequest = new Promise((resolve, reject) => {
    const { textureZoom, tileSize } = SOURCES.earthTexture;
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

const createStars = (count, near, span) => {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const radius = near + Math.random() * span;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i3 + 2] = radius * Math.cos(phi);
    const starType = Math.random();
    let baseColor, intensity, size;
    if (starType < 0.5) { baseColor = { r: 0.9, g: 0.95, b: 1.0 }; intensity = 0.7 + Math.random() * 0.3; size = 1.0 + Math.random() * 0.5; }
    else if (starType < 0.7) { baseColor = { r: 1.0, g: 0.95, b: 0.85 }; intensity = 0.75 + Math.random() * 0.25; size = 1.2 + Math.random() * 0.8; }
    else if (starType < 0.85) { baseColor = { r: 1.0, g: 0.7, b: 0.4 }; intensity = 0.8 + Math.random() * 0.2; size = 1.8 + Math.random() * 1.0; }
    else { baseColor = { r: 0.95, g: 0.92, b: 1.0 }; intensity = 0.6 + Math.random() * 0.3; size = 0.5 + Math.random() * 0.3; }
    colors[i3] = baseColor.r * intensity;
    colors[i3 + 1] = baseColor.g * intensity;
    colors[i3 + 2] = baseColor.b * intensity;
    sizes[i] = size;
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0.0 } },
    vertexShader: `attribute float size; varying vec3 vColor; uniform float time; void main() { vColor = color; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); float twinkle = sin(time * 1.5 + position.x * 0.01 + position.y * 0.01) * 0.15 + 0.85; gl_PointSize = size * twinkle * (200.0 / -mvPosition.z); gl_Position = projectionMatrix * mvPosition; }`,
    fragmentShader: `varying vec3 vColor; void main() { float distance = length(gl_PointCoord - vec2(0.5)); if (distance > 0.5) discard; float alpha = 1.0 - smoothstep(0.0, 0.5, distance); alpha *= alpha; float coreBrightness = smoothstep(0.2, 0.0, distance) * 1.2; vec3 hdrColor = vColor * (1.0 + coreBrightness); gl_FragColor = vec4(hdrColor, alpha * 0.9); }`,
    transparent: true, vertexColors: true, blending: THREE.AdditiveBlending
  });
  return new THREE.Points(geometry, material);
};

const createStage = (mount, options) => {
  const width = mount.clientWidth;
  const height = mount.clientHeight;
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050508, options.fog);
  const camera = new THREE.PerspectiveCamera(45, width && height ? width / height : 1, 0.1, options.far);
  camera.position.set(options.camera[0], options.camera[1], options.camera[2]);
  camera.lookAt(0, 0, 0);
  camera.layers.enableAll();
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x030305, 1);
  renderer.shadowMap.enabled = false;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = options.exposure;
  mount.appendChild(renderer.domElement);
  const claimWheel = (event) => { event.preventDefault(); };
  mount.addEventListener("wheel", claimWheel, { passive: false, capture: true });
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), options.bloom[0], options.bloom[1], options.bloom[2]);
  composer.addPass(bloomPass);
  const stars = createStars(options.stars[0], options.stars[1], options.stars[2]);
  scene.add(stars);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = false;
  controls.enableTouch = true;
  controls.maxDistance = options.maxDistance;
  controls.minDistance = options.minDistance;
  let inset = 0;
  let onFrame = null;
  const applySize = () => {
    const newWidth = mount.clientWidth;
    const newHeight = mount.clientHeight;
    if (!newWidth || !newHeight) return;
    camera.aspect = newWidth / newHeight;
    if (inset) camera.setViewOffset(newWidth, newHeight, -inset / 2, 0, newWidth, newHeight);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    renderer.setSize(newWidth, newHeight);
    composer.setSize(newWidth, newHeight);
    bloomPass.resolution.set(newWidth, newHeight);
  };
  const observer = new ResizeObserver(applySize);
  observer.observe(mount);
  let frame = null;
  const loop = (time) => {
    frame = requestAnimationFrame(loop);
    controls.update();
    stars.material.uniforms.time.value = time * 0.001;
    if (onFrame) onFrame(time);
    if (renderer.domElement.width > 0 && renderer.domElement.height > 0) composer.render();
  };
  frame = requestAnimationFrame(loop);
  return {
    scene,
    camera,
    renderer,
    setInset: (value) => { inset = value; applySize(); },
    setFrame: (handler) => { onFrame = handler; },
    dispose: () => {
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      mount.removeEventListener("wheel", claimWheel, { capture: true });
      controls.dispose();
      scene.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        const materials = Array.isArray(child.material) ? child.material : child.material ? [child.material] : [];
        for (const material of materials) {
          if (material.map) material.map.dispose();
          material.dispose();
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    }
  };
};

const createInstances = (scene, bodyRadius, glowRadius, capacity) => {
  const group = new THREE.Group();
  scene.add(group);
  const body = new THREE.InstancedMesh(new THREE.SphereGeometry(bodyRadius, 8, 8), new THREE.MeshBasicMaterial({ transparent: true, opacity: 1.0 }), capacity);
  body.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  body.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
  body.count = 0;
  body.frustumCulled = false;
  group.add(body);
  const glow = new THREE.InstancedMesh(new THREE.SphereGeometry(glowRadius, 8, 8), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.2, side: THREE.BackSide }), capacity);
  glow.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  glow.count = 0;
  glow.frustumCulled = false;
  group.add(glow);
  const matrix = new THREE.Matrix4();
  const color = new THREE.Color();
  const write = (items) => {
    const count = Math.min(items.length, capacity);
    for (let index = 0; index < count; index++) {
      const item = items[index];
      matrix.makeTranslation(item.position.x, item.position.y, item.position.z);
      body.setMatrixAt(index, matrix);
      glow.setMatrixAt(index, matrix);
      color.set(item.color);
      body.setColorAt(index, color);
    }
    body.count = count;
    glow.count = count;
    body.instanceMatrix.needsUpdate = true;
    glow.instanceMatrix.needsUpdate = true;
    if (body.instanceColor) body.instanceColor.needsUpdate = true;
    glow.computeBoundingSphere();
  };
  return { glow, write };
};

const useSceneHover = (wrapperRef, stageRef, pickRef) => {
  const [hover, setHover] = useState(null);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const onMove = (event) => {
    const stage = stageRef.current;
    const pick = pickRef.current;
    if (!stage || !pick || !pick.glow.count) return;
    const bounds = wrapperRef.current.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    raycaster.setFromCamera(new THREE.Vector2((x / bounds.width) * 2 - 1, -(y / bounds.height) * 2 + 1), stage.camera);
    const hit = raycaster.intersectObject(pick.glow, false)[0];
    const item = hit && hit.instanceId !== undefined ? pick.items[hit.instanceId] : null;
    setHover(item ? { x, y, title: item.title, line: item.line } : null);
  };
  return [hover, onMove, () => setHover(null)];
};

const SceneFrame = ({ wrapperRef, hostRef, hover, onMove, onLeave, error }) => (
  <div className="landingMapWrapper" ref={wrapperRef} onMouseMove={onMove} onMouseLeave={onLeave}>
    <div ref={hostRef} className="landingSceneHost" />
    {hover && (
      <div className="landingTooltip" style={{ left: hover.x + 14, top: hover.y + 14 }}>
        <div className="landingTooltipTitle">{hover.title}</div>
        {hover.line && <div className="landingTooltipLine">{hover.line}</div>}
      </div>
    )}
    {error && (
      <div className="landingViewerOverlay">
        <div className="landingErrorBox"><FontAwesomeIcon icon={faExclamationCircle} /><span>{error}</span></div>
      </div>
    )}
  </div>
);

const EarthScene = ({ records, inset }) => {
  const wrapperRef = useRef(null);
  const hostRef = useRef(null);
  const stageRef = useRef(null);
  const pickRef = useRef(null);
  const recordsRef = useRef(records);
  const [error, setError] = useState(null);
  const [hover, onMove, onLeave] = useSceneHover(wrapperRef, stageRef, pickRef);

  useEffect(() => {
    recordsRef.current = records;
  }, [records]);

  useEffect(() => {
    const mount = hostRef.current;
    if (!mount) return undefined;
    let stage = null;
    try {
      stage = createStage(mount, SOURCES.scene.earth);
    } catch (reason) {
      setError(`The 3D viewer could not start because of the error "${errorText(reason)}".`);
      return undefined;
    }
    stageRef.current = stage;
    const { scene, renderer } = stage;
    const sunPosition = new THREE.Vector3(1000000, 0, 0);
    scene.add(new THREE.AmbientLight(0x606065, 0.5));
    const earthGroup = new THREE.Group();
    const earthMaterial = new THREE.MeshPhongMaterial({ color: 0x4488DD, shininess: 10, transparent: false });
    earthGroup.add(new THREE.Mesh(new THREE.SphereGeometry(SCENE_EARTH_RADIUS, 96, 64), earthMaterial));
    applyEarthTexture(earthMaterial, renderer, false);
    earthGroup.add(new THREE.Mesh(new THREE.SphereGeometry(SCENE_EARTH_RADIUS + 0.05, 64, 64), new THREE.ShaderMaterial({
      vertexShader: `varying vec3 vNormal; varying vec3 vPositionNormal; void main() { vNormal = normalize(normalMatrix * normal); vPositionNormal = normalize((modelViewMatrix * vec4(position, 1.0)).xyz); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying vec3 vNormal; varying vec3 vPositionNormal; void main() { float intensity = pow(0.6 - dot(vNormal, vPositionNormal), 3.0); vec3 innerColor = vec3(0.85, 0.9, 0.95); vec3 outerColor = vec3(0.4, 0.5, 0.6); vec3 atmosphereColor = mix(innerColor, outerColor, intensity); float hdrBoost = 1.0 + intensity * 0.8; gl_FragColor = vec4(atmosphereColor * hdrBoost, 1.0) * intensity * 0.7; }`,
      blending: THREE.AdditiveBlending, side: THREE.BackSide, transparent: true, depthWrite: false
    })));
    earthGroup.add(new THREE.Mesh(new THREE.SphereGeometry(SCENE_EARTH_RADIUS + 0.004, 64, 64), new THREE.ShaderMaterial({
      vertexShader: `varying vec3 vNormal; varying vec3 vSunDirection; varying float vIntensity; uniform vec3 sunPosition; void main() { vNormal = normalize(normalMatrix * normal); vec4 worldPosition = modelMatrix * vec4(position, 1.0); vSunDirection = normalize(sunPosition - worldPosition.xyz); float sunDot = dot(vNormal, vSunDirection); vIntensity = max(0.0, sunDot); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying vec3 vNormal; varying vec3 vSunDirection; varying float vIntensity; void main() { float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 3.0); vec3 dayColorInner = vec3(0.9, 0.92, 0.95); vec3 dayColorOuter = vec3(0.5, 0.55, 0.6); vec3 sunsetColor = vec3(1.0, 0.7, 0.4); vec3 nightColor = vec3(0.03, 0.04, 0.06); float terminator = smoothstep(-0.1, 0.3, vIntensity); vec3 dayColor = mix(dayColorOuter, dayColorInner, fresnel); vec3 twilightColor = mix(sunsetColor, dayColor, smoothstep(0.0, 0.25, vIntensity)); vec3 color = mix(nightColor, twilightColor, terminator); float hdrBoost = 1.0 + vIntensity * 0.8; float alpha = fresnel * 0.35 * (0.3 + 0.7 * vIntensity); gl_FragColor = vec4(color * hdrBoost, alpha); }`,
      uniforms: { sunPosition: { value: sunPosition } },
      blending: THREE.AdditiveBlending, side: THREE.FrontSide, transparent: true, depthWrite: false
    })));
    const sunLight = new THREE.DirectionalLight(0xFFFFFF, 1.5);
    scene.add(sunLight);
    scene.add(earthGroup);
    scene.add(createEquatorialGrid());
    scene.add(createEarthAxisMarkers());
    scene.add(createAltitudeBands());
    scene.add(createEarthDistanceRings());
    const instances = createInstances(scene, 0.5, 1.2, SOURCES.scene.maxInstances);
    pickRef.current = { glow: instances.glow, items: [] };
    let lastStep = -Infinity;
    stage.setFrame((time) => {
      if (time - lastStep < SOURCES.scene.satelliteStepMs) return;
      lastStep = time;
      const now = new Date();
      earthGroup.rotation.y = satelliteJs.gstime(now);
      const sun = computeSunDirectionECI(now);
      sunPosition.set(sun.x * 1000000, sun.z * 1000000, -sun.y * 1000000);
      sunLight.position.copy(sunPosition.clone().normalize().multiplyScalar(100));
      const items = [];
      for (const { satellite, record } of recordsRef.current) {
        try {
          const result = satelliteJs.propagate(record, now);
          if (!result || !result.position) continue;
          const position = eciToScene(result.position);
          if (!position || !Number.isFinite(position.x)) continue;
          const distance = Math.sqrt(result.position.x * result.position.x + result.position.y * result.position.y + result.position.z * result.position.z);
          items.push({ position, color: satellite.color || "#4ecdc4", title: satellite.name, line: `Altitude ${Math.round(distance - EARTH_RADIUS_KM).toLocaleString()} Km` });
        } catch (reason) {
          continue;
        }
      }
      instances.write(items);
      pickRef.current.items = items;
    });
    return () => {
      stageRef.current = null;
      pickRef.current = null;
      stage.dispose();
    };
  }, []);

  useEffect(() => {
    if (stageRef.current) stageRef.current.setInset(inset);
  }, [inset]);

  return <SceneFrame wrapperRef={wrapperRef} hostRef={hostRef} hover={hover} onMove={onMove} onLeave={onLeave} error={error} />;
};

const HelioScene = ({ objects, kind, inset }) => {
  const wrapperRef = useRef(null);
  const hostRef = useRef(null);
  const stageRef = useRef(null);
  const pickRef = useRef(null);
  const instancesRef = useRef(null);
  const earthRef = useRef(null);
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);
  const [tick, setTick] = useState(0);
  const [hover, onMove, onLeave] = useSceneHover(wrapperRef, stageRef, pickRef);

  useEffect(() => {
    const mount = hostRef.current;
    if (!mount) return undefined;
    let stage = null;
    try {
      stage = createStage(mount, SOURCES.scene[kind]);
    } catch (reason) {
      setError(`The 3D viewer could not start because of the error "${errorText(reason)}".`);
      return undefined;
    }
    stageRef.current = stage;
    const { scene, renderer } = stage;
    scene.add(new THREE.AmbientLight(0x303035, 0.4));
    const sunGroup = new THREE.Group();
    sunGroup.add(new THREE.Mesh(new THREE.SphereGeometry(SCENE_SUN_RADIUS, 64, 64), new THREE.MeshBasicMaterial({ color: 0xFFD060 })));
    const coronaVertexShader = `varying vec3 vNormal; varying vec3 vPositionNormal; void main() { vNormal = normalize(normalMatrix * normal); vPositionNormal = normalize((modelViewMatrix * vec4(position, 1.0)).xyz); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
    const coronaFragmentShader = `varying vec3 vNormal; varying vec3 vPositionNormal; void main() { float intensity = pow(0.7 - dot(vNormal, vPositionNormal), 4.0); vec3 hotColor = vec3(1.0, 0.85, 0.45); vec3 outerColor = vec3(0.9, 0.5, 0.2); vec3 coronaColor = mix(hotColor, outerColor, intensity); float hdrBoost = 1.5 + intensity * 1.2; gl_FragColor = vec4(coronaColor * hdrBoost, 1.0) * intensity * 0.9; }`;
    sunGroup.add(new THREE.Mesh(new THREE.SphereGeometry(SCENE_SUN_RADIUS * 1.4, 64, 64), new THREE.ShaderMaterial({ vertexShader: coronaVertexShader, fragmentShader: coronaFragmentShader, blending: THREE.AdditiveBlending, side: THREE.BackSide, transparent: true, depthWrite: false })));
    const flareMaterial = new THREE.ShaderMaterial({ vertexShader: coronaVertexShader, fragmentShader: `varying vec3 vNormal; varying vec3 vPositionNormal; void main() { float intensity = pow(0.5 - dot(vNormal, vPositionNormal), 6.0); vec3 flareColor = vec3(1.0, 0.7, 0.3); gl_FragColor = vec4(flareColor, 1.0) * intensity * 0.4; }`, blending: THREE.AdditiveBlending, side: THREE.BackSide, transparent: true, depthWrite: false });
    sunGroup.add(new THREE.Mesh(new THREE.SphereGeometry(SCENE_SUN_RADIUS * 2.5, 64, 64), flareMaterial));
    sunGroup.add(new THREE.PointLight(0xFFFFFF, 2.5, 0, 0));
    scene.add(sunGroup);
    const earthMaterial = new THREE.MeshPhongMaterial({ color: 0x42A5F5, emissive: 0x42A5F5, emissiveIntensity: 0.35, shininess: 10 });
    applyEarthTexture(earthMaterial, renderer, true);
    const earthMarker = new THREE.Mesh(new THREE.SphereGeometry(0.6, 64, 48), earthMaterial);
    earthMarker.add(new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 16), new THREE.MeshBasicMaterial({ color: 0x42A5F5, transparent: true, opacity: 0.3, side: THREE.BackSide })));
    scene.add(earthMarker);
    earthRef.current = earthMarker;
    scene.add(createEclipticGrid());
    scene.add(createAxisMarkers());
    scene.add(kind === "comets" ? createCometZones() : createAsteroidZones());
    scene.add(createDistanceRings());
    const instances = createInstances(scene, 0.4, 1.0, SOURCES.scene.maxInstances);
    instancesRef.current = instances;
    pickRef.current = { glow: instances.glow, items: [] };
    setReady(true);
    return () => {
      stageRef.current = null;
      pickRef.current = null;
      instancesRef.current = null;
      earthRef.current = null;
      stage.dispose();
    };
  }, [kind]);

  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), SOURCES.scene.heliocentricStepMs);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!ready || !instancesRef.current || !pickRef.current) return;
    const jd = julianDate(new Date());
    const scale = HELIO_CONSTANTS.SCALE_FACTOR;
    const earth = earthPosition(jd);
    if (earthRef.current) earthRef.current.position.set(earth.x * scale, 0, -earth.y * scale);
    const items = [];
    for (const object of objects) {
      const place = heliocentric(object.elements, jd);
      if (!place) continue;
      items.push({ position: new THREE.Vector3(place.x * scale, place.z * scale, -place.y * scale), color: object.color || "#4ecdc4", title: object.name, line: `${place.distance.toFixed(2)} AU From The Sun` });
    }
    instancesRef.current.write(items);
    pickRef.current.items = items;
  }, [ready, objects, tick]);

  useEffect(() => {
    if (ready && stageRef.current) stageRef.current.setInset(inset);
  }, [ready, inset]);

  return <SceneFrame wrapperRef={wrapperRef} hostRef={hostRef} hover={hover} onMove={onMove} onLeave={onLeave} error={error} />;
};

const FlightDemo = (() => {
  const SOURCES = FLIGHT_SOURCES;

  const EMPTY_REFERENCE = { airlines: {}, types: {}, airports: {}, routes: null };

  const CHART_FONT = "Inter, Arial, sans-serif";

  const EMERGENCY_SQUAWKS = { "7500": "Unlawful Interference", "7600": "Radio Failure", "7700": "General Emergency" };

  const ALTITUDE_STOPS = [[0, [255, 145, 0]], [10000, [255, 234, 0]], [20000, [78, 205, 196]], [30000, [66, 165, 245]], [40000, [179, 136, 255]]];

  const GROUND_COLOR = [145, 155, 175];

  const EMERGENCY_COLOR = [255, 107, 107];

  const SELECTED_COLOR = [235, 240, 248];

  const errorText = (error) => String(error && error.message ? error.message : error).replace(/\.$/, "");

  const emergencyOf = (entry) => (entry && entry.sq && EMERGENCY_SQUAWKS[entry.sq]) || null;

  const altitudeColor = (alt, ground) => {
    if (ground) return GROUND_COLOR;
    if (alt === null || alt === undefined) return GROUND_COLOR;
    if (alt <= ALTITUDE_STOPS[0][0]) return ALTITUDE_STOPS[0][1];
    for (let i = 1; i < ALTITUDE_STOPS.length; i += 1) {
      const [top, topColor] = ALTITUDE_STOPS[i];
      const [bottom, bottomColor] = ALTITUDE_STOPS[i - 1];
      if (alt <= top) {
        const t = (alt - bottom) / (top - bottom);
        return bottomColor.map((c, index) => Math.round(c + (topColor[index] - c) * t));
      }
    }
    return ALTITUDE_STOPS[ALTITUDE_STOPS.length - 1][1];
  };

  const aircraftColor = (entry, selectedHex) => {
    if (entry.hex === selectedHex) return SELECTED_COLOR;
    if (emergencyOf(entry)) return EMERGENCY_COLOR;
    return altitudeColor(entry.alt, entry.ground);
  };

  const iconFor = (entry) => {
    if (entry.ground && (entry.gs === null || entry.gs < 40)) return "ground";
    if (entry.cat === "A7") return "heli";
    return "plane";
  };

  const projectPosition = (entry, nowSeconds) => {
    if (entry.ground || !entry.gs || entry.gs < 40 || entry.trk === null || entry.trk === undefined || !entry.posAt) return [entry.lon, entry.lat];
    const dt = Math.max(0, Math.min(SOURCES.map.deadReckonSeconds, nowSeconds - entry.posAt));
    const distanceNm = (entry.gs * dt) / 3600;
    const rad = (entry.trk * Math.PI) / 180;
    const lat = entry.lat + (distanceNm * Math.cos(rad)) / 60;
    const lon = entry.lon + (distanceNm * Math.sin(rad)) / (60 * Math.max(0.05, Math.cos((entry.lat * Math.PI) / 180)));
    return [lon, lat];
  };

  const normalizeLon = (lon) => ((((lon + 180) % 360) + 360) % 360) - 180;

  const inBounds = (bounds, lon, lat) => {
    if (!bounds) return true;
    if (lat < bounds.south || lat > bounds.north) return false;
    if (bounds.east - bounds.west >= 360) return true;
    const west = normalizeLon(bounds.west);
    const east = normalizeLon(bounds.east);
    const value = normalizeLon(lon);
    return west <= east ? value >= west && value <= east : value >= west || value <= east;
  };

  const formatAltitude = (entry) => {
    if (!entry) return "—";
    if (entry.ground) return "Ground";
    if (entry.alt === null || entry.alt === undefined) return "—";
    return `${Number(entry.alt).toLocaleString()} ft`;
  };

  const formatNumber = (value, unit = "", digits = 0) => (value === null || value === undefined || isNaN(value) ? "—" : `${Number(value).toLocaleString(undefined, { maximumFractionDigits: digits })}${unit}`);

  const airlineLabel = (code, reference) => {
    if (!code) return null;
    const entry = reference && reference.airlines ? reference.airlines[code] : null;
    return entry && entry[0] ? `${entry[0]} (${code})` : code;
  };

  const routeText = (entry, reference) => {
    if (!entry || !entry.orig || !entry.dest) return null;
    const short = (code) => {
      const airport = reference && reference.airports ? reference.airports[code] : null;
      return (airport && airport[1]) || code;
    };
    return `${short(entry.orig)} → ${short(entry.dest)}`;
  };

  const facingViewer = (center, lat, lon) => {
    const toRad = Math.PI / 180;
    return Math.sin(center.lat * toRad) * Math.sin(lat * toRad) + Math.cos(center.lat * toRad) * Math.cos(lat * toRad) * Math.cos((lon - center.lon) * toRad) > 0.02;
  };

  const displayName = (entry) => (entry ? entry.flight || entry.reg || entry.hex.toUpperCase() : "—");

  const ISOLATED_GLOBALS = new Set(["deck", "luma", "loaders", "probe", "maplibregl"]);

  const createIsolatedGlobal = (store) => new Proxy(window, {
    get: (target, key) => {
      if (Object.prototype.hasOwnProperty.call(store, key)) return store[key];
      if (ISOLATED_GLOBALS.has(key)) return undefined;
      const value = Reflect.get(target, key);
      return typeof value === "function" && typeof key === "string" && /^[a-z]/.test(key) ? value.bind(target) : value;
    },
    set: (target, key, value) => {
      store[key] = value;
      return true;
    }
  });

  const evaluateModule = async (url, isolatedGlobal) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`The script ${url} returned status ${response.status}.`);
    const code = await response.text();
    const module = { exports: {} };
    if (isolatedGlobal) new Function("module", "exports", "globalThis", "window", "self", code)(module, module.exports, isolatedGlobal, isolatedGlobal, isolatedGlobal);
    else new Function("module", "exports", code)(module, module.exports);
    return module.exports;
  };

  const loadCSS = (href, id) => {
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  };

  let mapLibrariesPromise = null;

  const loadMapDeps = () => {
    if (mapLibrariesPromise) return mapLibrariesPromise;
    mapLibrariesPromise = (async () => {
      loadCSS(SOURCES.assets.maplibreCss, "flight-maplibre-css");
      const store = {};
      const isolated = createIsolatedGlobal(store);
      const [maplibregl, deck] = await Promise.all([evaluateModule(SOURCES.assets.maplibreScript, null), evaluateModule(SOURCES.assets.deckScript, isolated)]);
      store.deck = deck;
      const mapbox = await evaluateModule(SOURCES.assets.deckMapboxScript, isolated);
      const MapboxOverlay = mapbox.MapboxOverlay || (store.deck && store.deck.MapboxOverlay);
      if (!maplibregl || !maplibregl.Map) throw new Error("MapLibre GL did not load.");
      if (!deck || !deck.IconLayer || !MapboxOverlay) throw new Error("Deck.gl did not load.");
      return { maplibregl, deck: { ...deck, MapboxOverlay } };
    })().catch((error) => {
      mapLibrariesPromise = null;
      throw error;
    });
    return mapLibrariesPromise;
  };

  const PLANE_POINTS = [[32, 2], [36, 10], [36, 24], [60, 36], [60, 41], [36, 34], [35, 50], [43, 56], [43, 60], [32, 57], [21, 60], [21, 56], [29, 50], [28, 34], [4, 41], [4, 36], [28, 24], [28, 10]];

  const buildIconAtlas = () => {
    const size = 64;
    const canvas = document.createElement("canvas");
    canvas.width = size * 3;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    PLANE_POINTS.forEach(([x, y], index) => (index ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.translate(size, 0);
    ctx.beginPath();
    ctx.ellipse(32, 30, 9, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(30, 40, 4, 20);
    ctx.fillRect(24, 56, 16, 4);
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(6, 8);
    ctx.lineTo(58, 52);
    ctx.moveTo(58, 8);
    ctx.lineTo(6, 52);
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.translate(size * 2, 0);
    ctx.beginPath();
    ctx.moveTo(32, 14);
    ctx.lineTo(50, 32);
    ctx.lineTo(32, 50);
    ctx.lineTo(14, 32);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    const entry = (x) => ({ x, y: 0, width: size, height: size, anchorX: size / 2, anchorY: size / 2, mask: true });
    return { atlas: canvas.toDataURL(), mapping: { plane: entry(0), heli: entry(size), ground: entry(size * 2) } };
  };

  const FlightDemo = ({ globeMode, inset, view }) => {
    const mapContainerRef = useRef(null);
    const deckglMapRef = useRef(null);
    const overlayRef = useRef(null);
    const libsRef = useRef(null);
    const iconAtlasRef = useRef(null);
    const [mapReady, setMapReady] = useState(false);
    const [mapError, setMapError] = useState(null);
    const [viewState, setViewState] = useState({ lat: view.center[1], lon: view.center[0], zoom: globeMode ? view.globeZoom : view.flatZoom, bounds: null });
    const [globeCenter, setGlobeCenter] = useState(null);
    const [animationTick, setAnimationTick] = useState(0);
    const [hoverInfo, setHoverInfo] = useState(null);
    const selectedHex = null;
    const reference = EMPTY_REFERENCE;
    const aircraftRef = useRef(new Map());
    const feedMetaRef = useRef({ epoch: null, version: 0 });
    const pollingRef = useRef(false);
    const [dataVersion, setDataVersion] = useState(0);

    const applySnapshot = useCallback((data) => {
      const store = aircraftRef.current;
      if (data.full) store.clear();
      const fields = data.fields || [];
      for (const row of data.rows || []) {
        const entry = {};
        fields.forEach((field, index) => {
          entry[field] = row[index];
        });
        entry.ground = Boolean(entry.ground);
        entry.mil = Boolean(entry.mil);
        store.set(entry.hex, entry);
      }
      for (const hex of data.removed || []) store.delete(hex);
      feedMetaRef.current = { epoch: data.epoch, version: data.version };
    }, []);

    const pollSnapshot = useCallback(async () => {
      if (pollingRef.current) return;
      pollingRef.current = true;
      try {
        const params = new URLSearchParams();
        const meta = feedMetaRef.current;
        if (meta.epoch) {
          params.set("epoch", meta.epoch);
          params.set("since", String(meta.version));
        }
        const response = await fetch(`${SOURCES.apiBase}${SOURCES.endpoints.snapshot}?${params.toString()}`);
        const data = await response.json().catch(() => null);
        if (!response.ok || !data || !data.success) throw new Error((data && data.message) || `The flight feed returned status ${response.status}.`);
        applySnapshot(data);
        setMapError(null);
        setDataVersion((value) => value + 1);
      } catch (error) {
        setMapError(`The flight feed could not be reached because of the error "${errorText(error)}".`);
      } finally {
        pollingRef.current = false;
      }
    }, [applySnapshot]);

    useEffect(() => {
      pollSnapshot();
      const timer = setInterval(pollSnapshot, SOURCES.snapshotMs);
      return () => clearInterval(timer);
    }, [pollSnapshot]);

    const filteredAircraft = useMemo(() => Array.from(aircraftRef.current.values()).filter((entry) => entry.lat !== null && entry.lon !== null && entry.lat !== undefined && entry.lon !== undefined), [dataVersion]);

    const inViewAircraft = useMemo(() => filteredAircraft.filter((entry) => inBounds(viewState.bounds, entry.lon, entry.lat)), [filteredAircraft, viewState]);

    const updateViewFromDeck = useCallback(() => {
      const map = deckglMapRef.current;
      if (!map || !map.getContainer().clientWidth) return;
      const center = map.getCenter();
      const bounds = map.getBounds();
      setViewState({ lat: center.lat, lon: normalizeLon(center.lng), zoom: map.getZoom(), bounds: { west: bounds.getWest(), east: bounds.getEast(), south: bounds.getSouth(), north: bounds.getNorth() } });
    }, []);

    useEffect(() => {
      if (!mapContainerRef.current) return undefined;
      let cancelled = false;
      let observer = null;
      const host = mapContainerRef.current;
      const claimWheel = (event) => { event.preventDefault(); };
      host.addEventListener("wheel", claimWheel, { passive: false, capture: true });
      const div = document.createElement("div");
      Object.assign(div.style, { width: "100%", height: "100%", position: "absolute", top: "0", left: "0" });
      host.appendChild(div);
      loadMapDeps().then((libs) => {
        libsRef.current = libs;
        if (cancelled) return;
        const { maplibregl } = libs;
        const map = new maplibregl.Map({
          container: div,
          style: {
            version: 8,
            sources: {
              "satellite-tiles": { type: "raster", tiles: [SOURCES.assets.satelliteTiles], tileSize: 256, maxzoom: 19, attribution: "Tiles Esri" },
              "labels-tiles": { type: "raster", tiles: [SOURCES.assets.labelTiles], tileSize: 256, maxzoom: 19 }
            },
            layers: [
              { id: "satellite-layer", type: "raster", source: "satellite-tiles" },
              { id: "labels-layer", type: "raster", source: "labels-tiles", paint: { "raster-opacity": 0.9 } }
            ],
            glyphs: SOURCES.assets.glyphs
          },
          center: view.center,
          zoom: globeMode ? view.globeZoom : view.flatZoom,
          minZoom: globeMode ? SOURCES.map.minZoomGlobe : SOURCES.map.minZoom,
          maxZoom: SOURCES.map.maxZoom,
          pitch: 0,
          bearing: 0,
          antialias: true,
          attributionControl: false
        });
        map.addControl(new maplibregl.NavigationControl(), "top-right");
        map.addControl(new maplibregl.ScaleControl(), "bottom-left");
        map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: SOURCES.attributions }), "bottom-right");
        map.on("moveend", updateViewFromDeck);
        deckglMapRef.current = map;
        if (typeof ResizeObserver !== "undefined") {
          observer = new ResizeObserver(() => {
            if (deckglMapRef.current) deckglMapRef.current.resize();
          });
          observer.observe(host);
        }
        const onReady = () => {
          if (cancelled) return;
          const overlay = new libs.deck.MapboxOverlay({ interleaved: true, layers: [] });
          map.addControl(overlay);
          overlayRef.current = overlay;
          iconAtlasRef.current = buildIconAtlas();
          updateViewFromDeck();
          setMapReady(true);
        };
        if (map.loaded()) onReady();
        else map.on("load", onReady);
      }).catch((error) => {
        if (!cancelled) setMapError(`The map could not be started because of the error "${errorText(error)}".`);
      });
      return () => {
        cancelled = true;
        if (observer) observer.disconnect();
        host.removeEventListener("wheel", claimWheel, { capture: true });
        overlayRef.current = null;
        if (deckglMapRef.current) {
          try {
            deckglMapRef.current.remove();
          } catch (error) {
            deckglMapRef.current = null;
          }
        }
        deckglMapRef.current = null;
        if (div.parentNode === host) host.removeChild(div);
        setMapReady(false);
      };
    }, [updateViewFromDeck]);

    useEffect(() => {
      if (!mapReady) return undefined;
      const timer = setInterval(() => {
        if (document.visibilityState === "visible") setAnimationTick((value) => value + 1);
      }, SOURCES.refresh.animationMs);
      return () => clearInterval(timer);
    }, [mapReady]);

    useEffect(() => {
      const map = deckglMapRef.current;
      if (!mapReady || !map) return;
      map.setPadding({ left: inset, right: 0, top: 0, bottom: 0 });
    }, [mapReady, inset]);

    useEffect(() => {
      const map = deckglMapRef.current;
      if (!mapReady || !map) return undefined;
      try {
        map.setMinZoom(globeMode ? SOURCES.map.minZoomGlobe : SOURCES.map.minZoom);
        map.stop();
        map.jumpTo({ center: view.center, zoom: globeMode ? view.globeZoom : view.flatZoom });
        if (typeof map.setProjection === "function") map.setProjection({ type: globeMode ? "globe" : "mercator" });
      } catch (error) {
        setMapError(`The globe view could not be switched because of the error "${errorText(error)}".`);
      }
      return undefined;
    }, [mapReady, globeMode, view]);

    useEffect(() => {
      const map = deckglMapRef.current;
      if (!mapReady || !map || !globeMode) {
        setGlobeCenter(null);
        return undefined;
      }
      let frame = null;
      const update = () => {
        frame = null;
        const center = map.getCenter();
        setGlobeCenter({ lat: center.lat, lon: center.lng });
      };
      const schedule = () => {
        if (!frame) frame = requestAnimationFrame(update);
      };
      map.on("move", schedule);
      return () => {
        map.off("move", schedule);
        if (frame) cancelAnimationFrame(frame);
      };
    }, [mapReady, globeMode]);

    useEffect(() => {
      const overlay = overlayRef.current;
      const dk = libsRef.current && libsRef.current.deck;
      if (!mapReady || !overlay || !dk) return;
      const nowSeconds = Date.now() / 1000;
      const zoom = viewState.zoom;
      const atlas = iconAtlasRef.current;
      const layers = [];
      const globe = globeMode;
      const faceCenter = globeCenter || viewState;
      const onFace = (list) => (globe ? list.filter((item) => facingViewer(faceCenter, item.lat, item.lon)) : list);
      const shared = globe ? { parameters: { depthCompare: "always", cullMode: "none" } } : {};
      const shownAircraft = onFace(filteredAircraft);
      const shownInView = onFace(inViewAircraft);

      if (atlas) {
        layers.push(new dk.IconLayer({
          ...shared,
          id: "flight-aircraft-halo",
          data: shownAircraft,
          iconAtlas: atlas.atlas,
          iconMapping: atlas.mapping,
          getIcon: iconFor,
          getPosition: (d) => projectPosition(d, nowSeconds),
          getAngle: (d) => -(d.trk || 0),
          getSize: (d) => (d.hex === selectedHex ? 32 : 24),
          sizeUnits: "pixels",
          getColor: [8, 9, 12, 190],
          updateTriggers: { getPosition: [animationTick, dataVersion], getSize: selectedHex, getAngle: [dataVersion, globe] }
        }));
        layers.push(new dk.IconLayer({
          ...shared,
          id: "flight-aircraft",
          data: shownAircraft,
          iconAtlas: atlas.atlas,
          iconMapping: atlas.mapping,
          getIcon: iconFor,
          getPosition: (d) => projectPosition(d, nowSeconds),
          getAngle: (d) => -(d.trk || 0),
          getSize: (d) => (d.hex === selectedHex ? 26 : 19),
          sizeUnits: "pixels",
          getColor: (d) => [...aircraftColor(d, selectedHex), 255],
          pickable: true,
          autoHighlight: true,
          highlightColor: [235, 240, 248, 120],
          onHover: (info) => setHoverInfo(info.object ? { x: info.x, y: info.y, kind: "aircraft", object: info.object } : null),
          updateTriggers: { getPosition: [animationTick, dataVersion], getSize: selectedHex, getColor: [selectedHex, dataVersion], getAngle: [dataVersion, globe] }
        }));
      }

      if (zoom >= SOURCES.map.labelZoom) {
        const labeled = shownInView.slice(0, SOURCES.map.maxLabels);
        layers.push(new dk.TextLayer({
          ...shared,
          id: "flight-labels",
          data: labeled,
          getPosition: (d) => projectPosition(d, nowSeconds),
          getText: (d) => displayName(d),
          getSize: 11,
          getColor: (d) => [...aircraftColor(d, selectedHex), 255],
          getPixelOffset: [0, 18],
          fontFamily: CHART_FONT,
          fontWeight: 800,
          background: true,
          getBackgroundColor: [8, 9, 12, 200],
          backgroundPadding: [3, 1],
          updateTriggers: { getPosition: [animationTick, dataVersion], getColor: [selectedHex, dataVersion] }
        }));
      }
      try {
        overlay.setProps({ layers });
      } catch (error) {
        setMapError(`The map layers could not be drawn because of the error "${errorText(error)}".`);
      }
    }, [mapReady, filteredAircraft, inViewAircraft, animationTick, dataVersion, viewState, globeMode, globeCenter]);

    const renderHoverTooltip = () => {
      if (!hoverInfo || !hoverInfo.object) return null;
      const item = hoverInfo.object;
      const lines = [displayName(item), airlineLabel(item.al, reference), routeText(item, reference), [item.type, item.reg].filter(Boolean).join(" | "), `${formatAltitude(item)} | ${formatNumber(item.gs, " kt")}`];
      return (
        <div className="satWeatherTooltip" style={{ left: hoverInfo.x + 14, top: hoverInfo.y + 14 }}>
          {lines.filter(Boolean).map((line, index) => <div key={index} className={index === 0 ? "satWeatherTooltipTitle" : "satWeatherTooltipLine"}>{line}</div>)}
        </div>
      );
    };

    return (
      <div className="satWeatherMapWrapper">
        <div ref={mapContainerRef} className="satWeatherMapContainer" onMouseLeave={() => setHoverInfo(null)} />
        {renderHoverTooltip()}
        {mapError && (
          <div className="landingViewerOverlay" style={{ paddingLeft: inset }}>
            <div className="landingErrorBox"><FontAwesomeIcon icon={faExclamationCircle} /><span>{mapError}</span></div>
          </div>
        )}
      </div>
    );
  };

  return FlightDemo;
})();

const WeatherDemo = (() => {
  const SOURCES = WEATHER_SOURCES;

  const CHART_FONT = "Inter, Arial, sans-serif";


  const SEVERE_EVENTS = new Set(["Tornado Warning", "Severe Thunderstorm Warning", "Flash Flood Warning", "Extreme Wind Warning", "Snow Squall Warning", "Special Marine Warning", "Tornado Watch", "Severe Thunderstorm Watch", "Severe Weather Statement", "Flash Flood Statement", "Dust Storm Warning"]);

  const WARNING_CODES = { "Tornado Warning": "TOR", "Severe Thunderstorm Warning": "SVR", "Flash Flood Warning": "FFW", "Extreme Wind Warning": "EWW", "Snow Squall Warning": "SQW", "Special Marine Warning": "SMW", "Dust Storm Warning": "DSW" };

  const MAP_WARNING_EVENTS = new Set(["Tornado Warning", "Severe Thunderstorm Warning", "Flash Flood Warning", "Extreme Wind Warning", "Snow Squall Warning", "Special Marine Warning", "Dust Storm Warning"]);


  const REPORT_STYLES = {
    T: { color: [255, 107, 107], letter: "T" },
    C: { color: [255, 184, 108], letter: "F" },
    W: { color: [255, 121, 198], letter: "W" },
    H: { color: [111, 207, 151], letter: "H" },
    G: { color: [66, 165, 245], letter: "G" },
    D: { color: [66, 165, 245], letter: "D" },
    M: { color: [66, 165, 245], letter: "M" },
    N: { color: [100, 181, 246], letter: "N" },
    O: { color: [100, 181, 246], letter: "N" },
    B: { color: [66, 165, 245], letter: "B" },
    F: { color: [72, 190, 170], letter: "F" },
    E: { color: [72, 190, 170], letter: "E" },
    R: { color: [100, 181, 246], letter: "R" },
    S: { color: [179, 136, 255], letter: "S" },
    X: { color: [179, 136, 255], letter: "S" },
    Z: { color: [179, 136, 255], letter: "Z" },
    s: { color: [129, 212, 250], letter: "I" },
    4: { color: [129, 212, 250], letter: "I" },
    5: { color: [129, 212, 250], letter: "I" },
    L: { color: [255, 217, 61], letter: "L" },
    U: { color: [188, 143, 110], letter: "U" }
  };

  const DEFAULT_REPORT_STYLE = { color: [145, 155, 175], letter: "?" };

  const STORM_COLORS = { 4: [255, 107, 107], 3: [255, 149, 0], 2: [255, 217, 61], 1: [78, 205, 196], 0: [170, 180, 200] };

  const STORM_SEVERITY_LABELS = { 4: "Tornado Vortex Signature", 3: "Mesocyclone Or Large Hail", 2: "Severe Hail", 1: "Strong Cell", 0: "Ordinary Cell" };

  const TROPICAL_COLORS = { TD: [66, 165, 245], SD: [66, 165, 245], TS: [78, 205, 196], SS: [78, 205, 196], HU: [255, 149, 0], MH: [255, 107, 107], PT: [170, 180, 200], PC: [170, 180, 200] };

  const TROPICAL_LABELS = { TD: "Tropical Depression", SD: "Subtropical Depression", TS: "Tropical Storm", SS: "Subtropical Storm", HU: "Hurricane", MH: "Major Hurricane", PT: "Post-Tropical Cyclone", PC: "Potential Tropical Cyclone" };

  const projectMotion = (lat, lon, towardDeg, distanceNm) => {
    const rad = (towardDeg * Math.PI) / 180;
    return [lon + (distanceNm * Math.sin(rad)) / (60 * Math.max(0.05, Math.cos((lat * Math.PI) / 180))), lat + (distanceNm * Math.cos(rad)) / 60];
  };

  const trailDots = (paths, zoom, spacingPx) => {
    const step = (spacingPx * 360) / (256 * Math.pow(2, zoom));
    const dots = [];
    for (const item of paths) {
      const path = item.path;
      if (!path || path.length < 2) continue;
      let total = 0;
      const lengths = [];
      for (let i = 1; i < path.length; i += 1) {
        const scale = Math.cos((path[i][1] * Math.PI) / 180);
        const length = Math.hypot((path[i][0] - path[i - 1][0]) * scale, path[i][1] - path[i - 1][1]);
        lengths.push(length);
        total += length;
      }
      const count = Math.min(SOURCES.map.trailMaxDots, Math.max(2, Math.floor(total / step)));
      let segment = 0;
      let walked = 0;
      for (let n = 0; n <= count; n += 1) {
        const target = (total * n) / count;
        while (segment < lengths.length - 1 && walked + lengths[segment] < target) {
          walked += lengths[segment];
          segment += 1;
        }
        const t = lengths[segment] ? Math.min(1, (target - walked) / lengths[segment]) : 0;
        const a = path[segment];
        const b = path[segment + 1];
        dots.push({ item, position: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], progress: count ? n / count : 0 });
      }
    }
    return dots;
  };

  const trailLayer = (dk, shared, id, dots, getColor, options = {}) => {
    const { radius = 1.75, alpha = 200, fade = 0.6 } = options;
    return new dk.ScatterplotLayer({ ...shared, id, data: dots, getPosition: (d) => d.position, getRadius: radius, radiusUnits: "pixels", filled: true, stroked: false, getFillColor: (d) => [...getColor(d.item), Math.round(alpha * (1 - fade * d.progress))] });
  };

  const declutter = (map, items, getLngLat, getPriority, getBox) => {
    if (!map || items.length < 2) return items;
    const width = map.getCanvas().clientWidth;
    const height = map.getCanvas().clientHeight;
    const cellSize = 64;
    const cells = new Map();
    const kept = new Set();
    const ranked = items.map((item, index) => ({ item, index, priority: getPriority(item) })).sort((a, b) => b.priority - a.priority || a.index - b.index);
    for (const { item } of ranked) {
      const lngLat = getLngLat(item);
      if (!lngLat || !Number.isFinite(Number(lngLat[0])) || !Number.isFinite(Number(lngLat[1])) || Math.abs(Number(lngLat[1])) > 90) continue;
      const point = map.project(lngLat);
      if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
      if (point.x < -cellSize || point.y < -cellSize || point.x > width + cellSize || point.y > height + cellSize) {
        kept.add(item);
        continue;
      }
      const [dx0, dy0, dx1, dy1] = getBox(item);
      const box = [point.x + dx0, point.y + dy0, point.x + dx1, point.y + dy1];
      const keys = [];
      for (let cx = Math.floor(box[0] / cellSize); cx <= Math.floor(box[2] / cellSize); cx += 1) {
        for (let cy = Math.floor(box[1] / cellSize); cy <= Math.floor(box[3] / cellSize); cy += 1) keys.push(`${cx}:${cy}`);
      }
      const hit = keys.some((key) => (cells.get(key) || []).some((other) => box[0] < other[2] && box[2] > other[0] && box[1] < other[3] && box[3] > other[1]));
      if (hit) continue;
      keys.forEach((key) => {
        if (!cells.has(key)) cells.set(key, []);
        cells.get(key).push(box);
      });
      kept.add(item);
    }
    return items.filter((item) => kept.has(item));
  };

  const labelBox = (text, offsetX) => [offsetX - 2, -8, offsetX + String(text || "").length * 6.2 + 8, 8];

  const pointInRing = (lon, lat, ring) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };

  const alertMatchesFilter = (alert, filter) => {
    if (filter === "all") return true;
    if (filter === "severe") return SEVERE_EVENTS.has(alert.event);
    if (filter === "warnings") return /Warning$|Emergency$/.test(alert.event);
    return /Warning$|Watch$|Emergency$/.test(alert.event);
  };

  const hexToRgb = (hex) => {
    const value = String(hex || "").replace("#", "");
    if (value.length !== 6) return [192, 192, 192];
    return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)];
  };

  const reportStyle = (report) => REPORT_STYLES[report.type] || DEFAULT_REPORT_STYLE;

  const TROPICAL_POINT_CLASSES = { D: "TD", S: "TS", H: "HU", M: "MH" };

  const ICON_SCALE = 3;

  const ICON_GLASS = "#0b0c0f";

  const iconCache = new Map();

  const colorHex = (color) => `#${color.slice(0, 3).map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`;

  const makeIcon = (key, size, body) => {
    if (iconCache.has(key)) return iconCache.get(key);
    const pixels = size * ICON_SCALE;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${pixels}" height="${pixels}" viewBox="0 0 ${size} ${size}"><defs><filter id="g" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.1"/></filter></defs>${body}</svg>`;
    const icon = { id: key, url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, width: pixels, height: pixels, anchorX: pixels / 2, anchorY: pixels / 2 };
    iconCache.set(key, icon);
    return icon;
  };

  const glassShape = (shape, stroke, tint, width) => `<g filter="url(#g)" opacity="0.85">${shape.replace("/>", ` fill="#000" stroke="#000" stroke-width="${width + 2}" stroke-linejoin="round"/>`)}</g>${shape.replace("/>", ` fill="${ICON_GLASS}" fill-opacity="0.78"/>`)}${shape.replace("/>", ` fill="${stroke}" fill-opacity="${tint}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round"/>`)}`;

  const iconLetter = (letter, size, color) => `<text x="${size / 2}" y="${size / 2}" dy="0.36em" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${(size * 0.42).toFixed(1)}" font-weight="700" fill="${color}">${letter}</text>`;

  const reportIcon = (report, near) => {
    const style = reportStyle(report);
    const stroke = colorHex(style.color);
    const tornado = report.type === "T";
    if (!near) {
      const size = tornado ? 12 : 10;
      const c = size / 2;
      return makeIcon(`report-dot-${stroke}-${size}`, size, glassShape(`<circle cx="${c}" cy="${c}" r="${c - 2.25}"/>`, stroke, 0.35, 1.5));
    }
    const size = 22;
    return makeIcon(`report-badge-${stroke}-${style.letter}-${tornado ? 1 : 0}`, size, `${glassShape(`<circle cx="11" cy="11" r="7.5"/>`, stroke, 0.16, tornado ? 2 : 1.5)}${iconLetter(style.letter, size, stroke)}`);
  };

  const reportIconSize = (report, near) => (near ? 22 : report.type === "T" ? 12 : 10);

  const stormShape = (cell) => {
    if (cell.tvs) return "tvs";
    if (cell.meso) return "meso";
    if (cell.maxSize) return "hail";
    return "cell";
  };

  const stormIcon = (cell) => {
    const shape = stormShape(cell);
    const stroke = colorHex(STORM_COLORS[cell.severity]);
    const size = 20;
    if (shape === "tvs") return makeIcon(`storm-tvs-${stroke}`, size, glassShape(`<path d="M4 5.5 L16 5.5 L10 16 Z"/>`, stroke, 0.3, 1.75));
    if (shape === "hail") return makeIcon(`storm-hail-${stroke}`, size, glassShape(`<path d="M10 4 L16 14.5 L4 14.5 Z"/>`, stroke, 0.24, 1.75));
    if (shape === "meso") return makeIcon(`storm-meso-${stroke}`, size, `${glassShape(`<circle cx="10" cy="10" r="6.25"/>`, stroke, 0.12, 1.75)}<circle cx="10" cy="10" r="2.5" fill="${stroke}" fill-opacity="0.85"/>`);
    return makeIcon(`storm-cell-${stroke}`, size, glassShape(`<circle cx="10" cy="10" r="4"/>`, stroke, 0.2, 1.5));
  };

  const stormIconSize = (cell, near) => {
    const base = stormShape(cell) === "cell" ? 16 : 20;
    return near ? base : Math.round(base * 0.8);
  };

  const anchorCache = new WeakMap();

  const ringArea = (ring) => {
    let area = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) area += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
    return area / 2;
  };

  const alertAnchor = (alert) => {
    if (anchorCache.has(alert)) return anchorCache.get(alert);
    let best = null;
    let bestArea = 0;
    for (const polygon of alert.polygons || []) {
      const ring = polygon && polygon[0];
      if (!ring || ring.length < 3) continue;
      const area = Math.abs(ringArea(ring));
      if (area >= bestArea) {
        bestArea = area;
        best = ring;
      }
    }
    let anchor = null;
    if (best) {
      const signed = ringArea(best);
      let x = 0;
      let y = 0;
      for (let i = 0, j = best.length - 1; i < best.length; j = i, i += 1) {
        const cross = best[j][0] * best[i][1] - best[i][0] * best[j][1];
        x += (best[j][0] + best[i][0]) * cross;
        y += (best[j][1] + best[i][1]) * cross;
      }
      anchor = signed ? [x / (6 * signed), y / (6 * signed)] : best[0];
      if (!pointInRing(anchor[0], anchor[1], best)) anchor = best.reduce((sum, point) => [sum[0] + point[0] / best.length, sum[1] + point[1] / best.length], [0, 0]);
    }
    anchorCache.set(alert, anchor);
    return anchor;
  };

  const liftColor = (hex) => {
    const color = hexToRgb(hex);
    return Math.max(...color) >= 180 ? colorHex(color) : colorHex(color.map((value) => value + (255 - value) * 0.45));
  };

  const warningIcon = (alert, strong) => {
    const stroke = liftColor(alert.color || "#c0c0c0");
    const code = WARNING_CODES[alert.event] || "WRN";
    const size = 28;
    return makeIcon(`warning-${code}-${stroke}-${strong ? 1 : 0}`, size, `${glassShape(`<circle cx="14" cy="14" r="10.5"/>`, stroke, strong ? 0.3 : 0.16, strong ? 2 : 1.5)}${iconLetter(code, size, stroke).replace(`font-size="${(size * 0.42).toFixed(1)}"`, 'font-size="7.5"')}`);
  };

  const tropicalIcon = (classification) => {
    const color = TROPICAL_COLORS[classification] || [170, 180, 200];
    const stroke = colorHex(color);
    const size = 30;
    const arms = "M15 9.5 C15 4.5 19.5 2 25 3 M15 20.5 C15 25.5 10.5 28 5 27";
    const halo = `<g filter="url(#g)" opacity="0.85"><path d="${arms}" fill="none" stroke="#000" stroke-width="4.5" stroke-linecap="round"/><circle cx="15" cy="15" r="7.5" fill="#000"/></g>`;
    const armPath = `<path d="${arms}" fill="none" stroke="${stroke}" stroke-width="2.25" stroke-linecap="round"/>`;
    const core = (tint) => `<circle cx="15" cy="15" r="5.75" fill="${ICON_GLASS}" fill-opacity="0.8"/><circle cx="15" cy="15" r="5.75" fill="${stroke}" fill-opacity="${tint}" stroke="${stroke}" stroke-width="2"/>`;
    if (classification === "HU" || classification === "MH") return makeIcon(`tropical-${classification}`, size, `${halo}${armPath}${core(0.55)}`);
    if (classification === "TS" || classification === "SS") return makeIcon(`tropical-${classification}`, size, `${halo}${armPath}${core(0.12)}`);
    return makeIcon(`tropical-${classification || "other"}`, size, `<g filter="url(#g)" opacity="0.85"><circle cx="15" cy="15" r="7.5" fill="#000"/></g>${core(0.12)}`);
  };

  const tropicalClassFromWind = (knots) => {
    if (!Number.isFinite(knots)) return null;
    if (knots >= 96) return "MH";
    if (knots >= 64) return "HU";
    if (knots >= 34) return "TS";
    return "TD";
  };

  const tropicalSegmentColor = (properties) => {
    const type = String(properties.STORMTYPE || "").toUpperCase();
    if (type === "HU" || type === "MH") return TROPICAL_COLORS[Number(properties.SS) >= 3 || type === "MH" ? "MH" : "HU"];
    return TROPICAL_COLORS[type] || [145, 155, 175];
  };

  const tropicalPointColor = (properties) => {
    const byWind = tropicalClassFromWind(Number(properties.MAXWIND));
    const byLabel = TROPICAL_POINT_CLASSES[String(properties.DVLBL || "").charAt(0).toUpperCase()];
    return TROPICAL_COLORS[byWind || byLabel] || TROPICAL_COLORS.PT;
  };

  const titleCaseName = (text) => String(text || "").toLowerCase().replace(/(^|[\s/(-])([a-z])/g, (match, lead, ch) => `${lead}${ch.toUpperCase()}`);

  const threatLabel = (alert) => {
    if (!alert) return null;
    if (alert.threat === "emergency") return alert.event === "Tornado Warning" ? "Tornado Emergency" : alert.event === "Flash Flood Warning" ? "Flash Flood Emergency" : "Emergency";
    if (alert.threat === "considerable") return alert.event === "Tornado Warning" ? "Particularly Dangerous Situation" : "Considerable Damage Threat";
    return null;
  };

  const hazardSummary = (alert) => [
    alert.tornadoDetection ? `Tornado ${titleCaseName(alert.tornadoDetection)}` : null,
    alert.maxHail ? `${alert.maxHail}" Hail` : null,
    alert.maxWind ? `${String(alert.maxWind).replace(/MPH/i, "Mph")} Wind` : null,
    alert.floodThreat ? `${titleCaseName(alert.floodThreat)} Flood Threat` : null
  ].filter(Boolean).join(" | ");

  const formatClock = (iso) => {
    if (!iso) return "—";
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  const stormLabel = (cell) => `${cell.nexrad || ""} ${cell.storm || ""}`.trim() || "Storm Cell";

  const errorText = (error) => String(error && error.message ? error.message : error).replace(/\.$/, "");

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

  const formatAbsoluteTime = (iso) => {
    if (!iso) return "—";
    const d = parseFeedDate(iso);
    if (!d) return iso;
    return d.toLocaleString();
  };

  const normalizeLon = (lon) => ((((lon + 180) % 360) + 360) % 360) - 180;


  const facingViewer = (center, lat, lon) => {
    const toRad = Math.PI / 180;
    return Math.sin(center.lat * toRad) * Math.sin(lat * toRad) + Math.cos(center.lat * toRad) * Math.cos(lat * toRad) * Math.cos((lon - center.lon) * toRad) > 0.02;
  };

  const ISOLATED_GLOBALS = new Set(["deck", "luma", "loaders", "probe", "maplibregl"]);

  const createIsolatedGlobal = (store) => new Proxy(window, {
    get: (target, key) => {
      if (Object.prototype.hasOwnProperty.call(store, key)) return store[key];
      if (ISOLATED_GLOBALS.has(key)) return undefined;
      const value = Reflect.get(target, key);
      return typeof value === "function" && typeof key === "string" && /^[a-z]/.test(key) ? value.bind(target) : value;
    },
    set: (target, key, value) => {
      store[key] = value;
      return true;
    }
  });

  const evaluateModule = async (url, isolatedGlobal) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`The script ${url} returned status ${response.status}.`);
    const code = await response.text();
    const module = { exports: {} };
    if (isolatedGlobal) new Function("module", "exports", "globalThis", "window", "self", code)(module, module.exports, isolatedGlobal, isolatedGlobal, isolatedGlobal);
    else new Function("module", "exports", code)(module, module.exports);
    return module.exports;
  };

  const loadCSS = (href, id) => {
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  };

  let mapLibrariesPromise = null;

  const loadMapDeps = () => {
    if (mapLibrariesPromise) return mapLibrariesPromise;
    mapLibrariesPromise = (async () => {
      loadCSS(SOURCES.assets.maplibreCss, "flight-maplibre-css");
      const store = {};
      const isolated = createIsolatedGlobal(store);
      const [maplibregl, deck] = await Promise.all([evaluateModule(SOURCES.assets.maplibreScript, null), evaluateModule(SOURCES.assets.deckScript, isolated)]);
      store.deck = deck;
      const mapbox = await evaluateModule(SOURCES.assets.deckMapboxScript, isolated);
      const MapboxOverlay = mapbox.MapboxOverlay || (store.deck && store.deck.MapboxOverlay);
      if (!maplibregl || !maplibregl.Map) throw new Error("MapLibre GL did not load.");
      if (!deck || !deck.IconLayer || !MapboxOverlay) throw new Error("Deck.gl did not load.");
      return { maplibregl, deck: { ...deck, MapboxOverlay } };
    })().catch((error) => {
      mapLibrariesPromise = null;
      throw error;
    });
    return mapLibrariesPromise;
  };

  const layerKey = (url) => {
    let hash = 0;
    for (const char of String(url)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    return hash.toString(36);
  };

  const firstLayerAfter = (map, prefixes) => {
    const layers = (map.getStyle() && map.getStyle().layers) || [];
    for (const prefix of prefixes) {
      const match = layers.find((layer) => layer.id.startsWith(prefix));
      if (match) return match.id;
    }
    return map.getLayer("labels-layer") ? "labels-layer" : undefined;
  };

  const syncRasterLayers = (map, registry, prefix, items, beforePrefixes, paint) => {
    const wanted = new Map(items.map((item) => [`${prefix}${layerKey(item.url)}`, item]));
    for (const id of Array.from(registry)) {
      if (wanted.has(id)) continue;
      if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource(id)) map.removeSource(id);
      registry.delete(id);
    }
    for (const [id, item] of wanted.entries()) {
      if (registry.has(id)) continue;
      map.addSource(id, { type: "raster", tiles: [item.url], tileSize: item.tileSize || 256, maxzoom: item.maxZoom || 10, minzoom: 0, attribution: item.attribution || undefined });
      map.addLayer({ id, type: "raster", source: id, minzoom: item.minZoom || 0, paint: { "raster-opacity": 0, "raster-fade-duration": 0, ...paint } }, firstLayerAfter(map, beforePrefixes));
      registry.add(id);
    }
    return Array.from(wanted.keys());
  };

  const WeatherDemo = ({ globeMode, inset, view }) => {
    const mapContainerRef = useRef(null);
    const deckglMapRef = useRef(null);
    const overlayRef = useRef(null);
    const libsRef = useRef(null);
    const radarLayersRef = useRef(new Set());
    const radarOrderRef = useRef([]);
    const [mapReady, setMapReady] = useState(false);
    const [mapError, setMapError] = useState(null);
    const [viewState, setViewState] = useState({ lat: view.center[1], lon: view.center[0], zoom: globeMode ? view.globeZoom : view.flatZoom, bounds: null });
    const [globeCenter, setGlobeCenter] = useState(null);
    const [hoverInfo, setHoverInfo] = useState(null);
    const selectedAlert = null;
    const selectedCell = null;
    const radarOpacity = 0.8;
    const [data, setData] = useState({});

    useEffect(() => {
      let cancelled = false;
      const load = () => Object.keys(SOURCES.endpoints).forEach(async (key) => {
        try {
          const query = key === "radar" ? "?product=composite" : "";
          const response = await fetch(`${SOURCES.apiBase}${SOURCES.endpoints[key]}${query}`);
          const body = await response.json().catch(() => null);
          if (!body) throw new Error(`The server returned an unreadable response with status ${response.status}`);
          if (!response.ok || !body.success) throw new Error(body.message || `The server returned status ${response.status}`);
          if (!cancelled) setData((current) => ({ ...current, [key]: body }));
        } catch (error) {
          if (!cancelled && key === "radar") setMapError(`The radar frames could not be loaded because of the error "${errorText(error)}".`);
        }
      });
      load();
      const timer = setInterval(load, SOURCES.layersMs);
      return () => {
        cancelled = true;
        clearInterval(timer);
      };
    }, []);

    const radarData = data && data.radar ? data.radar : null;
    const frameIndex = radarData ? radarData.frames.length - 1 : 0;
    const alerts = data && data.alerts ? data.alerts.alerts || [] : [];
    const mapCells = data && data.storms ? data.storms.cells || [] : [];
    const mapReports = data && data.reports ? data.reports.reports || [] : [];
    const mapTropicalStorms = data && data.tropical ? data.tropical.storms || [] : [];
    const mapTropicalFeatures = data && data.tropical ? data.tropical.features || [] : [];

    const mapAlerts = useMemo(() => alerts.filter((alert) => alertMatchesFilter(alert, "warningsWatches")), [alerts]);

    const hoveredAlertId = hoverInfo && hoverInfo.kind === "alert" && hoverInfo.object ? hoverInfo.object.id : null;
    const hoveredAlert = useMemo(() => (hoveredAlertId ? alerts.find((alert) => alert.id === hoveredAlertId) || null : null), [hoveredAlertId, alerts]);

    const updateViewFromMap = useCallback(() => {
      const map = deckglMapRef.current;
      if (!map) return;
      const center = map.getCenter();
      const bounds = map.getBounds();
      setViewState({ lat: center.lat, lon: normalizeLon(center.lng), zoom: map.getZoom(), bounds: { west: bounds.getWest(), east: bounds.getEast(), south: bounds.getSouth(), north: bounds.getNorth() } });
    }, []);

    useEffect(() => {
      if (!mapContainerRef.current) return undefined;
      let cancelled = false;
      let observer = null;
      const host = mapContainerRef.current;
      const claimWheel = (event) => { event.preventDefault(); };
      host.addEventListener("wheel", claimWheel, { passive: false, capture: true });
      const div = document.createElement("div");
      Object.assign(div.style, { width: "100%", height: "100%", position: "absolute", top: "0", left: "0" });
      host.appendChild(div);
      loadMapDeps().then((libs) => {
        libsRef.current = libs;
        if (cancelled) return;
        const { maplibregl } = libs;
        const map = new maplibregl.Map({
          container: div,
          style: {
            version: 8,
            sources: {
              "satellite-tiles": { type: "raster", tiles: [SOURCES.assets.satelliteTiles], tileSize: 256, maxzoom: 19, attribution: "Tiles Esri" },
              "labels-tiles": { type: "raster", tiles: [SOURCES.assets.labelTiles], tileSize: 256, maxzoom: 19 }
            },
            layers: [
              { id: "satellite-layer", type: "raster", source: "satellite-tiles" },
              { id: "labels-layer", type: "raster", source: "labels-tiles", paint: { "raster-opacity": 0.9 } }
            ],
            glyphs: SOURCES.assets.glyphs
          },
          center: view.center,
          zoom: globeMode ? view.globeZoom : view.flatZoom,
          minZoom: globeMode ? SOURCES.map.minZoomGlobe : SOURCES.map.minZoom,
          maxZoom: SOURCES.map.maxZoom,
          pitch: 0,
          bearing: 0,
          antialias: true,
          attributionControl: false
        });
        map.addControl(new maplibregl.NavigationControl(), "top-right");
        map.addControl(new maplibregl.ScaleControl({ unit: "imperial" }), "bottom-left");
        map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: SOURCES.attributions }), "bottom-right");
        map.on("moveend", updateViewFromMap);
        deckglMapRef.current = map;
        if (typeof ResizeObserver !== "undefined") {
          observer = new ResizeObserver(() => {
            if (deckglMapRef.current) deckglMapRef.current.resize();
          });
          observer.observe(host);
        }
        const onReady = () => {
          if (cancelled) return;
          const overlay = new libs.deck.MapboxOverlay({ interleaved: true, layers: [] });
          map.addControl(overlay);
          overlayRef.current = overlay;
          updateViewFromMap();
          setMapReady(true);
        };
        if (map.loaded()) onReady();
        else map.on("load", onReady);
      }).catch((error) => {
        if (!cancelled) setMapError(`The map could not be started because of the error "${errorText(error)}".`);
      });
      return () => {
        cancelled = true;
        if (observer) observer.disconnect();
        host.removeEventListener("wheel", claimWheel, { capture: true });
        overlayRef.current = null;
        radarLayersRef.current = new Set();
        radarOrderRef.current = [];
        if (deckglMapRef.current) {
          try {
            deckglMapRef.current.remove();
          } catch (error) {
            deckglMapRef.current = null;
          }
        }
        deckglMapRef.current = null;
        if (div.parentNode === host) host.removeChild(div);
        setMapReady(false);
      };
    }, [updateViewFromMap]);

    useEffect(() => {
      const map = deckglMapRef.current;
      if (!mapReady || !map) return;
      map.setPadding({ left: inset, right: 0, top: 0, bottom: 0 });
    }, [mapReady, inset]);

    useEffect(() => {
      const map = deckglMapRef.current;
      if (!mapReady || !map) return undefined;
      try {
        map.setMinZoom(globeMode ? SOURCES.map.minZoomGlobe : SOURCES.map.minZoom);
        map.stop();
        map.jumpTo({ center: view.center, zoom: globeMode ? view.globeZoom : view.flatZoom });
        if (typeof map.setProjection === "function") map.setProjection({ type: globeMode ? "globe" : "mercator" });
      } catch (error) {
        setMapError(`The globe view could not be switched because of the error "${errorText(error)}".`);
      }
      return undefined;
    }, [mapReady, globeMode, view]);

    useEffect(() => {
      const map = deckglMapRef.current;
      if (!mapReady || !map || !globeMode) { setGlobeCenter(null); return undefined; }
      let frame = null;
      const update = () => { frame = null; const center = map.getCenter(); setGlobeCenter({ lat: center.lat, lon: center.lng }); };
      const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
      map.on("move", schedule);
      return () => {
        map.off("move", schedule);
        if (frame) cancelAnimationFrame(frame);
      };
    }, [mapReady, globeMode]);

    useEffect(() => {
      const map = deckglMapRef.current;
      if (!mapReady || !map) return;
      try {
        const frames = radarData ? radarData.frames.map((frame) => ({ url: frame.url, tileSize: radarData.tileSize, maxZoom: radarData.maxZoom, attribution: radarData.attribution })) : [];
        radarOrderRef.current = syncRasterLayers(map, radarLayersRef.current, "wx-radar-", frames, [], { "raster-resampling": "nearest" });
      } catch (error) {
        setMapError(`The radar layers could not be drawn because of the error "${errorText(error)}".`);
      }
    }, [mapReady, radarData]);

    useEffect(() => {
      const map = deckglMapRef.current;
      if (!mapReady || !map) return;
      try {
        radarOrderRef.current.forEach((id, index) => {
          if (map.getLayer(id)) map.setPaintProperty(id, "raster-opacity", index === frameIndex ? radarOpacity : 0);
        });
      } catch (error) {
        setMapError(`The radar frame could not be shown because of the error "${errorText(error)}".`);
      }
    }, [mapReady, radarData, frameIndex, radarOpacity]);

    useEffect(() => {
      const overlay = overlayRef.current;
      const dk = libsRef.current && libsRef.current.deck;
      if (!mapReady || !overlay || !dk) return;
      const zoom = viewState.zoom;
      const globe = globeMode;
      const faceCenter = globeCenter || viewState;
      const onFace = (list, lat, lon) => (globe ? list.filter((item) => facingViewer(faceCenter, lat(item), lon(item))) : list);
      const shared = globe ? { parameters: { depthCompare: "always", cullMode: "none" } } : {};
      const layers = [];
      const hover = (kind) => (info) => setHoverInfo(info.object ? { x: info.x, y: info.y, kind, object: info.object } : null);

      if (mapAlerts.length) {
        const drawn = mapAlerts.filter((alert) => alert.shape === "polygon" && MAP_WARNING_EVENTS.has(alert.event)).slice(0, SOURCES.map.maxAlertsDrawn);
        const strong = (alert) => alert.event === "Tornado Warning" || Boolean(alert.threat);
        const focus = [selectedAlert, hoveredAlert].filter((alert, index, list) => alert && alert.polygons && list.findIndex((other) => other && other.id === alert.id) === index);
        if (focus.length) {
          const areas = [];
          focus.forEach((alert) => alert.polygons.forEach((polygon) => areas.push({ alert, polygon })));
          layers.push(new dk.PolygonLayer({
            ...shared,
            id: "wx-alert-area",
            data: areas,
            getPolygon: (d) => d.polygon,
            filled: true,
            stroked: false,
            getFillColor: (d) => [...hexToRgb(d.alert.color), selectedAlert && d.alert.id === selectedAlert.id ? 70 : 45],
            updateTriggers: { getFillColor: [selectedAlert && selectedAlert.id, hoveredAlert && hoveredAlert.id] }
          }));
        }
        const badges = drawn.map((alert) => ({ alert, position: alertAnchor(alert) })).filter((badge) => badge.position);
        layers.push(new dk.IconLayer({
          ...shared,
          id: "wx-alerts",
          data: onFace(badges, (d) => d.position[1], (d) => d.position[0]),
          getPosition: (d) => d.position,
          getIcon: (d) => warningIcon(d.alert, strong(d.alert)),
          getSize: (d) => (strong(d.alert) ? 30 : 26),
          sizeUnits: "pixels",
          pickable: true,
          autoHighlight: true,
          highlightColor: [235, 240, 248, 70],
          onHover: (info) => setHoverInfo(info.object ? { x: info.x, y: info.y, kind: "alert", object: info.object.alert } : null)
        }));
      }

      if (mapTropicalFeatures.length) {
        const cones = [];
        const tracks = [];
        const past = [];
        const points = [];
        for (const feature of mapTropicalFeatures) {
          if (feature.kind === "track") (feature.path ? [feature.path] : feature.paths || []).forEach((path) => tracks.push({ feature, path }));
          if (feature.kind === "past") (feature.path ? [feature.path] : feature.paths || []).forEach((path) => past.push({ feature, path }));
          if (feature.kind === "cone" && feature.polygons) feature.polygons.forEach((polygon) => cones.push({ feature, polygon }));
          if (feature.kind === "points" && feature.point) points.push(feature);
        }
        const shownPoints = onFace(points, (d) => d.point[1], (d) => d.point[0]);
        layers.push(new dk.PolygonLayer({ ...shared, id: "wx-tropical-cone", data: cones, getPolygon: (d) => d.polygon, filled: true, stroked: false, getFillColor: [235, 240, 248, 30] }));
        layers.push(trailLayer(dk, shared, "wx-tropical-past", trailDots(past, zoom, SOURCES.map.trailSpacingPx), (item) => tropicalSegmentColor(item.feature.properties), { radius: 1.5, alpha: 150, fade: 0 }));
        layers.push(trailLayer(dk, shared, "wx-tropical-track", trailDots(tracks, zoom, SOURCES.map.trailSpacingPx), () => [235, 240, 248], { radius: 1.75, alpha: 200, fade: 0.55 }));
        layers.push(new dk.ScatterplotLayer({
          ...shared,
          id: "wx-tropical-points",
          data: shownPoints,
          getPosition: (d) => d.point,
          getRadius: 3.5,
          radiusUnits: "pixels",
          filled: true,
          stroked: false,
          getFillColor: (d) => [...tropicalPointColor(d.properties), 235],
          pickable: true,
          autoHighlight: true,
          highlightColor: [235, 240, 248, 120],
          onHover: hover("tropicalPoint")
        }));
      }

      if (mapTropicalStorms.length) {
        const storms = onFace(mapTropicalStorms.filter((storm) => Number.isFinite(storm.lat) && Number.isFinite(storm.lon)), (d) => d.lat, (d) => d.lon);
        layers.push(new dk.IconLayer({
          ...shared,
          id: "wx-tropical-storms",
          data: storms,
          getPosition: (d) => [d.lon, d.lat],
          getIcon: (d) => tropicalIcon(d.classification),
          getSize: 30,
          sizeUnits: "pixels",
          pickable: true,
          onHover: hover("tropical")
        }));
        if (zoom >= SOURCES.map.tropicalLabelZoom) {
          layers.push(new dk.TextLayer({
            ...shared,
            id: "wx-tropical-labels",
            data: storms,
            getPosition: (d) => [d.lon, d.lat],
            getText: (d) => `${d.name || d.id}${d.intensity ? ` ${d.intensity} Kt` : ""}`,
            getSize: 11,
            getColor: (d) => [...(TROPICAL_COLORS[d.classification] || [205, 212, 228]), 255],
            getTextAnchor: "start",
            getAlignmentBaseline: "center",
            getPixelOffset: [18, 0],
            fontFamily: CHART_FONT,
            fontWeight: 800,
            background: true,
            getBackgroundColor: [8, 9, 12, 210],
            backgroundPadding: [3, 1]
          }));
        }
      }

      if (mapReports.length) {
        const shown = onFace(mapReports, (d) => d.lat, (d) => d.lon);
        const near = zoom >= SOURCES.map.reportLabelZoom;
        const ordered = shown.slice().sort((x, y) => (x.type === "T") - (y.type === "T"));
        layers.push(new dk.IconLayer({
          ...shared,
          id: "wx-reports",
          data: ordered,
          getPosition: (d) => [d.lon, d.lat],
          getIcon: (d) => reportIcon(d, near),
          getSize: (d) => reportIconSize(d, near),
          sizeUnits: "pixels",
          pickable: true,
          autoHighlight: true,
          highlightColor: [235, 240, 248, 70],
          onHover: hover("report"),
          updateTriggers: { getIcon: near, getSize: near }
        }));
      }

      if (mapCells.length) {
        const near = zoom >= SOURCES.map.stormAllZoom;
        const shown = onFace(near ? mapCells : mapCells.filter((cell) => cell.severity >= SOURCES.map.stormMinSeverity || (selectedCell && cell.id === selectedCell.id)), (d) => d.lat, (d) => d.lon);
        const tracked = (cell) => cell.severity >= SOURCES.map.stormMinSeverity || (selectedCell && cell.id === selectedCell.id);
        const vectors = [];
        for (const cell of shown) {
          if (!tracked(cell) || cell.drct === null || cell.sknt === null || !cell.sknt) continue;
          const toward = (cell.drct + 180) % 360;
          const minutes = SOURCES.map.stormVectorMinutes[SOURCES.map.stormVectorMinutes.length - 1];
          vectors.push({ cell, path: [[cell.lon, cell.lat], projectMotion(cell.lat, cell.lon, toward, (cell.sknt * minutes) / 60)] });
        }
        layers.push(trailLayer(dk, shared, "wx-storm-vectors", trailDots(vectors, zoom, SOURCES.map.trailSpacingPx - 1).filter((dot) => dot.progress > 0.12), (item) => STORM_COLORS[item.cell.severity], { radius: 1.6, alpha: 220, fade: 0.75 }));
        if (selectedCell && shown.some((cell) => cell.id === selectedCell.id)) {
          layers.push(new dk.ScatterplotLayer({
            ...shared,
            id: "wx-storm-selected",
            data: [selectedCell],
            getPosition: (d) => [d.lon, d.lat],
            getRadius: (d) => stormIconSize(d, near) / 2 + 4,
            radiusUnits: "pixels",
            stroked: true,
            filled: true,
            getFillColor: [235, 240, 248, 30],
            getLineColor: [235, 240, 248, 170],
            lineWidthUnits: "pixels",
            getLineWidth: 1.5
          }));
        }
        const orderedCells = shown.slice().sort((x, y) => x.severity - y.severity);
        layers.push(new dk.IconLayer({
          ...shared,
          id: "wx-storm-cells",
          data: orderedCells,
          getPosition: (d) => [d.lon, d.lat],
          getIcon: (d) => stormIcon(d),
          getSize: (d) => stormIconSize(d, near),
          sizeUnits: "pixels",
          pickable: true,
          autoHighlight: true,
          highlightColor: [235, 240, 248, 70],
          onHover: hover("storm"),
          updateTriggers: { getSize: near }
        }));
        if (zoom >= SOURCES.map.stormLabelZoom) {
          layers.push(new dk.TextLayer({
            ...shared,
            id: "wx-storm-labels",
            data: declutter(deckglMapRef.current, shown.filter((cell) => cell.severity >= 1), (d) => [d.lon, d.lat], (d) => d.severity * 1000 + (d.maxSize || 0), (d) => labelBox(`${d.storm || ""}${d.maxSize ? ` ${d.maxSize}"` : ""}${d.tvs ? " TVS" : d.meso ? " Meso" : ""}`, 16)),
            getPosition: (d) => [d.lon, d.lat],
            getText: (d) => `${d.storm || ""}${d.maxSize ? ` ${d.maxSize}"` : ""}${d.tvs ? " TVS" : d.meso ? " Meso" : ""}`,
            getSize: 10,
            getColor: (d) => [...STORM_COLORS[d.severity], 255],
            getTextAnchor: "start",
            getAlignmentBaseline: "center",
            getPixelOffset: [16, 0],
            fontFamily: CHART_FONT,
            fontWeight: 800,
            background: true,
            getBackgroundColor: [8, 9, 12, 210],
            backgroundPadding: [3, 1]
          }));
        }
      }

      try {
        overlay.setProps({ layers });
      } catch (error) {
        setMapError(`The map layers could not be drawn because of the error "${errorText(error)}".`);
      }
    }, [mapReady, mapAlerts, hoveredAlert, mapCells, mapReports, mapTropicalStorms, mapTropicalFeatures, viewState, globeMode, globeCenter]);

    const renderHoverTooltip = () => {
      if (!hoverInfo || !hoverInfo.object) return null;
      const item = hoverInfo.object;
      let lines = [];
      if (hoverInfo.kind === "alert") lines = [item.event, item.areaDesc ? String(item.areaDesc).slice(0, 120) : null, `Expires ${formatClock(item.expires || item.ends)}`, hazardSummary(item) || threatLabel(item)];
      else if (hoverInfo.kind === "storm") lines = [`Storm ${stormLabel(item)}`, STORM_SEVERITY_LABELS[item.severity], [item.maxSize ? `${item.maxSize}" Hail` : null, item.maxDbz !== null ? `${item.maxDbz} dBZ` : null, item.top !== null ? `Top ${item.top} Kft` : null].filter(Boolean).join(" | ")];
      else if (hoverInfo.kind === "report") lines = [titleCaseName(item.typeText), [item.magnitude ? `${item.magnitude}${item.unit ? ` ${titleCaseName(item.unit)}` : ""}` : null, titleCaseName(item.city), item.state].filter(Boolean).join(" | "), formatAbsoluteTime(item.valid)];
      else if (hoverInfo.kind === "tropical") lines = [`${TROPICAL_LABELS[item.classification] || "Tropical Cyclone"} ${item.name || ""}`.trim(), [item.intensity !== null ? `${item.intensity} Kt` : null, item.pressure !== null ? `${item.pressure} Mb` : null].filter(Boolean).join(" | ")];
      else if (hoverInfo.kind === "tropicalPoint") lines = ["Forecast Position", [item.properties.FLDATELBL || item.properties.DATELBL || null, item.properties.TAU !== undefined ? `${item.properties.TAU} Hour Forecast` : null].filter(Boolean).join(" | "), item.properties.MAXWIND ? `${item.properties.MAXWIND} Kt` : null];
      return (
        <div className="satWeatherTooltip" style={{ left: hoverInfo.x + 14, top: hoverInfo.y + 14 }}>
          {lines.filter(Boolean).map((line, index) => <div key={index} className={index === 0 ? "satWeatherTooltipTitle" : "satWeatherTooltipLine"}>{line}</div>)}
        </div>
      );
    };

    return (
      <div className="satWeatherMapWrapper">
        <div ref={mapContainerRef} className="satWeatherMapContainer" onMouseLeave={() => setHoverInfo(null)} />
        {renderHoverTooltip()}
        {mapError && (
          <div className="landingViewerOverlay" style={{ paddingLeft: inset }}>
            <div className="landingErrorBox"><FontAwesomeIcon icon={faExclamationCircle} /><span>{mapError}</span></div>
          </div>
        )}
      </div>
    );
  };

  return WeatherDemo;
})();

const Landing = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [active, setActive] = useState(DEMOS[0].key);
  const [summary, setSummary] = useState(null);
  const [demos, setDemos] = useState({});
  const [globe, setGlobe] = useState(false);

  const demo = DEMOS.find((entry) => entry.key === active);
  const state = demos[active] || { data: null, error: null, loading: true };
  const data = state.data;

  const loadSummary = useCallback(async () => {
    try {
      const response = await fetch(`${SOURCES.apiBase}${SOURCES.endpoints.summary}`);
      const body = await response.json();
      if (response.ok && body.success) {
        setSummary(body);
        return Array.isArray(body.pending) && body.pending.length > 0;
      }
    } catch (error) {
      return true;
    }
    return true;
  }, []);

  const pendingTimers = useRef({});

  useEffect(() => () => Object.values(pendingTimers.current).forEach((timer) => clearTimeout(timer)), []);

  const loadDemo = useCallback(async (key) => {
    setDemos((current) => ({ ...current, [key]: { data: current[key] ? current[key].data : null, error: null, loading: true } }));
    try {
      const response = await fetch(`${SOURCES.apiBase}${SOURCES.endpoints.demo}/${key}`);
      const body = await response.json().catch(() => null);
      if (!response.ok || !body || !body.success) throw new Error(body && body.message ? body.message : `The demo data request returned status ${response.status}.`);
      if (body.pending) {
        clearTimeout(pendingTimers.current[key]);
        pendingTimers.current[key] = setTimeout(() => loadDemo(key), SOURCES.refreshMs.demoPending);
        return;
      }
      setDemos((current) => ({ ...current, [key]: { data: body, error: null, loading: false } }));
    } catch (error) {
      setDemos((current) => ({ ...current, [key]: { data: current[key] ? current[key].data : null, error: errorText(error), loading: false } }));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer = null;
    const cycle = async () => {
      const pending = await loadSummary();
      if (cancelled) return;
      timer = setTimeout(cycle, pending ? SOURCES.refreshMs.summaryPending : SOURCES.refreshMs.summary);
    };
    cycle();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [loadSummary]);

  useEffect(() => {
    DEMOS.forEach((entry) => { if (entry.key !== DEMOS[0].key) loadDemo(entry.key); });
  }, [loadDemo]);

  useEffect(() => {
    loadDemo(active);
    const timer = setInterval(() => loadDemo(active), SOURCES.refreshMs[active]);
    return () => clearInterval(timer);
  }, [active, loadDemo]);

  const satelliteRecords = useMemo(() => {
    const list = demos.satellites && demos.satellites.data ? demos.satellites.data.satellites : [];
    const records = [];
    for (const satellite of list) {
      try {
        records.push({ satellite, record: satelliteJs.twoline2satrec(satellite.line1, satellite.line2) });
      } catch (error) {
        continue;
      }
    }
    return records;
  }, [demos.satellites]);

  const updatedLabel = data && data.updatedAt ? new Date(data.updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" }) : "—";

  const [inset, setInset] = useState(0);

  useEffect(() => {
    const measure = () => setInset(window.innerWidth >= SOURCES.layout.overlayAbovePx ? Math.round(Math.min(SOURCES.layout.copyMaxPx, window.innerWidth * SOURCES.layout.copyFraction)) : 0);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const openPrimary = () => navigate(token ? demo.route : SOURCES.routes.register);

  return (
    <div className="landingPage">
      <Nav activePage="landing" />

      <div className="landingScene">
        <div className="landingViewer">
          {active === "flights" && <FlightDemo globeMode={globe} inset={inset} view={SOURCES.view} />}
          {active === "weather" && <WeatherDemo globeMode={globe} inset={inset} view={SOURCES.view} />}
          {demo.viewer === "earth" && <EarthScene records={satelliteRecords} inset={inset} />}
          {demo.viewer === "helio" && <HelioScene key={active} objects={data && data.objects ? data.objects : []} kind={active} inset={inset} />}
          {!data && (
            <div className="landingViewerOverlay" style={{ paddingLeft: inset }}>
              {state.error ? <div className="landingErrorBox"><FontAwesomeIcon icon={faExclamationCircle} /><span>{state.error}</span></div> : <div className="loading-circle" />}
            </div>
          )}
        </div>

        <div className="landingCopy" style={inset ? { width: inset } : undefined}>
          <h1 className="landingHeadline">Earth And Space <span className="landingHeadlineAccent">Tracked Live</span></h1>
          <p className="landingLead">{demo.description}</p>
          <div className="landingActions">
            <button className="landingButton landingButtonSolid" onClick={openPrimary}>
              <FontAwesomeIcon icon={token ? faGauge : faUserPlus} /> <span>{token ? "Open Full Tracker" : "Create An Account"}</span>
            </button>
            {!token && (
              <button className="landingButton landingButtonGhost" onClick={() => navigate(SOURCES.routes.login)}>
                <FontAwesomeIcon icon={faRightToBracket} /> <span>Sign In</span>
              </button>
            )}
            {demo.viewer === "map" && (
              <button className={`landingButton landingButtonGhost ${globe ? "landingButtonOn" : ""}`} onClick={() => setGlobe((value) => !value)} title={globe ? "Switch To Flat Map" : "Switch To Globe"}>
                <FontAwesomeIcon icon={faGlobe} /> <span>Globe</span>
              </button>
            )}
          </div>
          <div className="landingStats">
            {demo.stats.map(([label, key]) => (
              <div key={key} className="landingStat">
                <span className="landingStatValue">{formatCount(data && data.stats ? data.stats[key] : null)}</span>
                <span className="landingStatLabel">{label}</span>
              </div>
            ))}
          </div>
          <span className="landingUpdated">{state.error && data ? "Showing The Last Good Data" : `Live Data Updated ${updatedLabel}`}</span>
        </div>

        <div className="landingDock">
          {DEMOS.map((entry) => (
            <button key={entry.key} className={`landingDockTab ${active === entry.key ? "landingDockTabActive" : ""}`} onClick={() => setActive(entry.key)}>
              <FontAwesomeIcon icon={entry.icon} />
              <span className="landingDockLabel">{entry.label}</span>
              <span className="landingDockCount">{formatCount(demos[entry.key] && demos[entry.key].data ? demos[entry.key].data.count : summary && summary.counts ? summary.counts[entry.key] : null)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Landing;