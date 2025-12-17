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
  faInfoCircle, faTh, faTimes, faPlay, faPause, faRedo, faBorderAll, 
  faPlus, faSquarePlus, faBars, faSquareXmark, faSatellite, faChartLine, 
  faChevronDown, faChevronUp, faXmarkSquare, faSquareCheck, faClone 
} from "@fortawesome/free-solid-svg-icons";
import * as satelliteJs from 'satellite.js';
import DinoLabsNav from "../../../helpers/Nav.jsx";
import "../../../styles/helperStyles/Switch.css";
import "../../../styles/mainStyles/DinoSat/DinoSatTrackers/Satellites/SatelliteTracker.css";

export default function SatelliteTracker() {
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
    { label: "-10 hours/sec", value: -10 },
    { label: "-5 hours/sec", value: -5 },
    { label: "-1 hour/sec", value: -1 },
    { label: "Real-time", value: 0.0000000317 },
    { label: "1 hour/sec", value: 1 },
    { label: "5 hours/sec", value: 5 },
    { label: "10 hours/sec", value: 10 },
  ];

  const FPS_OPTIONS = [30, 60, 120, 144];

  const PERFORMANCE_CONSTANTS = {
    MAX_VISIBLE_SATELLITES: 8000,
    LOD_DISTANCES: [50, 200, 1000, 5000],
    BATCH_SIZE: 500,
    UPDATE_FREQUENCY: 2,
    LABEL_DISTANCE_THRESHOLD: 300,
    FRUSTUM_MARGIN: 1.5,
    PRESELECT_COUNT: 100,
    VIRTUAL_SCROLL_ITEM_HEIGHT: 40,
    VIRTUAL_SCROLL_BUFFER: 10,
    TRAIL_LENGTH: 30
  };

  const ORBITAL_CONSTANTS = {
    EARTH_RADIUS_KM: 6378.137,
    EARTH_RADIUS_M: 6378137.0,
    EARTH_FLATTENING: 1.0 / 298.257223563,
    EARTH_GM: 3.986004418e14,
    EARTH_ANGULAR_VELOCITY: 7.2921159e-5,
    SPEED_OF_LIGHT: 299792458.0,
    ASTRONOMICAL_UNIT: 149597870.7,
    SOLAR_RADIUS: 696000.0,
    SOLAR_GM: 1.327e11,
    LUNAR_GM: 4.903e3,
    J2: 1.08262668e-3,
    J3: -2.53265648e-6,
    J4: -1.61962159e-6,
    MINUTES_PER_DAY: 1440.0,
    SECONDS_PER_DAY: 86400.0,
    JULIAN_DATE_J2000: 2451545.0,
    JULIAN_DATE_1900: 2415020.0,
    TWO_PI: Math.PI * 2.0,
    PI_HALF: Math.PI / 2.0,
    DEG_TO_RAD: Math.PI / 180.0,
    RAD_TO_DEG: 180.0 / Math.PI,
    SCALE_FACTOR: 200
  };

  const BLOOM_PARAMS = {
    strength: 0.6,
    radius: 0.3,
    threshold: 0.3
  };

  const NON_BLOOM_LAYER = 1;

  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);
  const [showErrors, setShowErrors] = useState(false);
  const [copiedErrors, setCopiedErrors] = useState(false);
  const [loadingMetadata, setLoadingMetadata] = useState(null);
  const [satellites, setSatellites] = useState([]);
  const [earthRotationData, setEarthRotationData] = useState(null);
  const [filteredSatellites, setFilteredSatellites] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
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
  const [speedMultiplier, setSpeedMultiplier] = useState(0.0000000317);
  const [theme, setTheme] = useState("dark");
  const [sceneInitialized, setSceneInitialized] = useState(false);
  const [performanceStats, setPerformanceStats] = useState({
    renderTime: 0,
    memoryUsage: 0,
    triangles: 0,
    drawCalls: 0,
    lines: 0,
    textures: 0,
    geometries: 0,
    visibleSatellites: 0,
    culledSatellites: 0
  });

  const [hudPosition, setHudPosition] = useState({ x: 0, y: 0 });
  const [isDraggingHud, setIsDraggingHud] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [legendPosition, setLegendPosition] = useState({ x: 0, y: 0 });
  const [isDraggingLegend, setIsDraggingLegend] = useState(false);
  const [legendDragStart, setLegendDragStart] = useState({ x: 0, y: 0 });
  const [controlsPosition, setControlsPosition] = useState({ x: 0, y: 0 });
  const [isDraggingControls, setIsDraggingControls] = useState(false);
  const [controlsDragStart, setControlsDragStart] = useState({ x: 0, y: 0 });
  const [detailedPosition, setDetailedPosition] = useState({ x: 0, y: 0 });
  const [isDraggingDetailed, setIsDraggingDetailed] = useState(false);
  const [detailedDragStart, setDetailedDragStart] = useState({ x: 0, y: 0 });
  const [virtualScrollOffset, setVirtualScrollOffset] = useState(0);

  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const composerRef = useRef(null);
  const bloomPassRef = useRef(null);
  const labelRendererRef = useRef(null);
  const cameraRef = useRef(null);
  const earthRef = useRef(null);
  const satelliteGroupRef = useRef(null);
  const simulationTime = useRef(0);
  const frameCountRef = useRef(0);
  const lastFpsTime = useRef(0);
  const actualFpsRef = useRef(60);
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

  const satelliteInstanceRef = useRef(null);
  const glowInstanceRef = useRef(null);
  const orbitLinesRef = useRef({});
  const trailLinesRef = useRef({});
  const satelliteDataRef = useRef(new Map());
  const labelsRef = useRef({});
  const visibleSatellitesRef = useRef(new Set());
  const frustumRef = useRef(new THREE.Frustum());
  const tempMatrix = useRef(new THREE.Matrix4());
  const tempVector = useRef(new THREE.Vector3());
  const tempQuaternion = useRef(new THREE.Quaternion());
  const tempColor = useRef(new THREE.Color());
  const spatialGridRef = useRef(new Map());
  const sunPositionRef = useRef(new THREE.Vector3(1000000, 500000, 1000000));
  const sensorConeRef = useRef(null);
  const sensorFootprintRef = useRef(null);
  const sensorLineRef = useRef(null);
  const sensorGroupRef = useRef(null);
  const sunLightRef = useRef(null);
  const groundTrackRef = useRef(null);

  class CSS2DObject extends THREE.Object3D {
    constructor(element) {
      super();
      this.element = element;
      this.element.style.position = "absolute";
      this.element.style.userSelect = "none";
      this.element.style.zIndex = "5";
    }
  }

  class SpatialGrid {
    constructor(cellSize = 50) {
      this.cellSize = cellSize;
      this.grid = new Map();
    }

    clear() {
      this.grid.clear();
    }

    add(object, position) {
      const key = this.getKey(position);
      if (!this.grid.has(key)) {
        this.grid.set(key, []);
      }
      this.grid.get(key).push(object);
    }

    getKey(position) {
      const x = Math.floor(position.x / this.cellSize);
      const y = Math.floor(position.y / this.cellSize);
      const z = Math.floor(position.z / this.cellSize);
      return `${x},${y},${z}`;
    }

    query(position, radius) {
      const results = [];
      const cellRadius = Math.ceil(radius / this.cellSize);
      const centerKey = this.getKey(position);
      const [cx, cy, cz] = centerKey.split(",").map(Number);

      for (let x = cx - cellRadius; x <= cx + cellRadius; x++) {
        for (let y = cy - cellRadius; y <= cy + cellRadius; y++) {
          for (let z = cz - cellRadius; z <= cz + cellRadius; z++) {
            const key = `${x},${y},${z}`;
            if (this.grid.has(key)) {
              results.push(...this.grid.get(key));
            }
          }
        }
      }
      return results;
    }
  }

  const spatialGrid = useMemo(() => new SpatialGrid(100), []);

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
    const earthRadius = 6.371;
    const gridRadius = 250;
    const radialSegments = 24;

    for (let i = 0; i < radialSegments; i++) {
      const angle = (i / radialSegments) * Math.PI * 2;
      const points = [
        new THREE.Vector3(earthRadius * Math.cos(angle), 0, earthRadius * Math.sin(angle)),
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
    const earthRadius = 6.371;
    const axisLength = 200;
    const axisRadius = 0.1;

    const xGeometry = new THREE.CylinderGeometry(axisRadius, axisRadius, axisLength, 8);
    const xMaterial = new THREE.MeshBasicMaterial({ color: 0x6a9a9a, transparent: true, opacity: 0.7 });
    const xAxis = new THREE.Mesh(xGeometry, xMaterial);
    xAxis.rotation.z = -Math.PI / 2;
    xAxis.position.set(axisLength / 2 + earthRadius, 0, 0);
    group.add(xAxis);

    const yGeometry = new THREE.CylinderGeometry(axisRadius, axisRadius, axisLength, 8);
    const yMaterial = new THREE.MeshBasicMaterial({ color: 0x6a9a6a, transparent: true, opacity: 0.7 });
    const yAxis = new THREE.Mesh(yGeometry, yMaterial);
    yAxis.position.set(0, axisLength / 2 + earthRadius, 0);
    group.add(yAxis);

    const zGeometry = new THREE.CylinderGeometry(axisRadius, axisRadius, axisLength, 8);
    const zMaterial = new THREE.MeshBasicMaterial({ color: 0x6a6a9a, transparent: true, opacity: 0.7 });
    const zAxis = new THREE.Mesh(zGeometry, zMaterial);
    zAxis.rotation.x = Math.PI / 2;
    zAxis.position.set(0, 0, axisLength / 2 + earthRadius);
    group.add(zAxis);

    const xLabel = createTextSprite("X (Vernal Eq.)", 0x8ababa);
    xLabel.position.set(axisLength + earthRadius + 12, 2, 0);
    group.add(xLabel);

    const yLabel = createTextSprite("Y (90E Long)", 0x8aba8a);
    yLabel.position.set(0, axisLength + earthRadius + 12, 0);
    group.add(yLabel);

    const zLabel = createTextSprite("Z (North Pole)", 0x8a8aba);
    zLabel.position.set(0, 2, axisLength + earthRadius + 12);
    group.add(zLabel);

    const originLabel = createTextSprite("Earth Center", 0x999999);
    originLabel.position.set(0, -earthRadius - 4, 0);
    group.add(originLabel);

    return group;
  };

  const createAltitudeBands = () => {
    const group = new THREE.Group();
    group.name = "AltitudeBands";
    const earthRadius = 6.371;
    const scaleFactor = 200;

    const bands = [
      { name: "LEO (200-2000 km)", innerRadius: earthRadius + (200/scaleFactor), outerRadius: earthRadius + (2000/scaleFactor), color: 0x4ECDC4 },
      { name: "MEO (2000-20000 km)", innerRadius: earthRadius + (2000/scaleFactor), outerRadius: earthRadius + (20000/scaleFactor), color: 0xFF9500 },
      { name: "GEO (35786 km)", innerRadius: earthRadius + (35000/scaleFactor), outerRadius: earthRadius + (36500/scaleFactor), color: 0xFF6B6B }
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
    const earthRadius = 6.371;
    const scaleFactor = 200;

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
      const radius = earthRadius + (dist.km / scaleFactor);
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

  const julianDateFromElements = (epochYear, epochDay) => {
    let year = epochYear;
    if (year < 57) {
      year += 2000;
    } else {
      year += 1900;
    }
    
    const janFirst = new Date(year, 0, 1);
    const janFirstJD = dateToJulianDate(janFirst);
    
    return janFirstJD + epochDay - 1.0;
  };

  const dateToJulianDate = (date) => {
    const a = Math.floor((14 - (date.getMonth() + 1)) / 12);
    const y = date.getFullYear() + 4800 - a;
    const m = (date.getMonth() + 1) + 12 * a - 3;
    
    return date.getDate() + Math.floor((153 * m + 2) / 5) + 365 * y + 
           Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045 +
           (date.getHours() + date.getMinutes() / 60.0 + date.getSeconds() / 3600.0) / 24.0;
  };

  const parseTLE = (line1, line2) => {
    if (!line1 || !line2 || line1.length !== 69 || line2.length !== 69) {
      throw new Error("Invalid TLE Format");
    }
    
    if (line1.charAt(0) !== "1" || line2.charAt(0) !== "2") {
      throw new Error("Invalid TLE Line Indicators");
    }
    
    const noradId = parseInt(line1.substring(2, 7));
    const epochYear = parseInt(line1.substring(18, 20));
    const epochDay = parseFloat(line1.substring(20, 32));
    const ndot = parseFloat(line1.substring(33, 43));
    const nddot6 = line1.substring(44, 50);
    const bstar6 = line1.substring(53, 59);
    const nddotExp = parseInt(line1.substring(50, 52));
    const bstarExp = parseInt(line1.substring(59, 61));
    
    const nddot = parseFloat(nddot6) * Math.pow(10, nddotExp - 5);
    const bstar = parseFloat(bstar6) * Math.pow(10, bstarExp - 5);
    
    const inclination = parseFloat(line2.substring(8, 16));
    const raan = parseFloat(line2.substring(17, 25));
    const eccentricity = parseFloat("0." + line2.substring(26, 33));
    const argPerigee = parseFloat(line2.substring(34, 42));
    const meanAnomaly = parseFloat(line2.substring(43, 51));
    const meanMotion = parseFloat(line2.substring(52, 63));
    
    return {
      noradId,
      epochYear,
      epochDay,
      epochJD: julianDateFromElements(epochYear, epochDay),
      inclination: inclination * ORBITAL_CONSTANTS.DEG_TO_RAD,
      raan: raan * ORBITAL_CONSTANTS.DEG_TO_RAD,
      eccentricity,
      argPerigee: argPerigee * ORBITAL_CONSTANTS.DEG_TO_RAD,
      meanAnomaly: meanAnomaly * ORBITAL_CONSTANTS.DEG_TO_RAD,
      meanMotion: meanMotion * ORBITAL_CONSTANTS.TWO_PI / ORBITAL_CONSTANTS.MINUTES_PER_DAY,
      ndot: ndot * ORBITAL_CONSTANTS.TWO_PI / (ORBITAL_CONSTANTS.MINUTES_PER_DAY * ORBITAL_CONSTANTS.MINUTES_PER_DAY),
      nddot: nddot * ORBITAL_CONSTANTS.TWO_PI / (ORBITAL_CONSTANTS.MINUTES_PER_DAY * ORBITAL_CONSTANTS.MINUTES_PER_DAY * ORBITAL_CONSTANTS.MINUTES_PER_DAY),
      bstar
    };
  };

  const validateTLEChecksum = (line) => {
    let checksum = 0;
    for (let i = 0; i < 68; i++) {
      const char = line.charAt(i);
      if (char >= "0" && char <= "9") {
        checksum += parseInt(char);
      } else if (char === "-") {
        checksum += 1;
      }
    }
    const expectedChecksum = parseInt(line.charAt(68));
    return (checksum % 10) === expectedChecksum;
  };

  const solveKeplerNewtonRaphson = (meanAnomaly, eccentricity, tolerance = 1e-14, maxIterations = 50) => {
    let E = meanAnomaly;
    
    for (let i = 0; i < maxIterations; i++) {
      const sinE = Math.sin(E);
      const cosE = Math.cos(E);
      const f = E - eccentricity * sinE - meanAnomaly;
      const fp = 1.0 - eccentricity * cosE;
      
      if (Math.abs(f) < tolerance) break;
      
      E = E - f / fp;
    }
    
    return E;
  };

  const computeTrueAnomaly = (eccentricAnomaly, eccentricity) => {
    const sinE = Math.sin(eccentricAnomaly);
    const cosE = Math.cos(eccentricAnomaly);
    
    const beta = eccentricity / (1.0 + Math.sqrt(1.0 - eccentricity * eccentricity));
    const sinNu = (Math.sqrt(1.0 - eccentricity * eccentricity) * sinE) / (1.0 - eccentricity * cosE);
    const cosNu = (cosE - eccentricity) / (1.0 - eccentricity * cosE);
    
    return Math.atan2(sinNu, cosNu);
  };

  const computeOrbitPosition = (satellite, currentJD) => {
    if (satellite.tle && satellite.tle.line1 && satellite.tle.line2) {
      try {
        const satrec = satelliteJs.twoline2satrec(satellite.tle.line1, satellite.tle.line2);
        const now = new Date(Date.now() + simulationTime.current * 60000);
        const positionAndVelocity = satelliteJs.propagate(satrec, now);
        const positionEci = positionAndVelocity.position;
        
        if (positionEci) {
          const earthRadius = 6.371;
          const sceneOrbitRadius = earthRadius + (satellite.altitude / ORBITAL_CONSTANTS.SCALE_FACTOR);
          const distanceKm = Math.sqrt(positionEci.x * positionEci.x + positionEci.y * positionEci.y + positionEci.z * positionEci.z);
          const scaleFactor = sceneOrbitRadius / distanceKm;
          
          return new THREE.Vector3(
            positionEci.x * scaleFactor,
            positionEci.z * scaleFactor,
            -positionEci.y * scaleFactor
          );
        }
      } catch (e) {}
    }

    const earthRadius = 6.371;
    const orbitRadius = earthRadius + (satellite.altitude / ORBITAL_CONSTANTS.SCALE_FACTOR);
    const angularVelocity = (2 * Math.PI) / satellite.period;
    const phase = (satellite.id.charCodeAt(0) % 100) * 0.1;
    const angle = (simulationTime.current * angularVelocity) + phase;

    const x = orbitRadius * Math.cos(angle);
    const y = 0;
    const z = orbitRadius * Math.sin(angle);
    const position = new THREE.Vector3(x, y, z);
    
    const argPerigeeRad = ((satellite.argOfPerigee || 0) * Math.PI) / 180;
    position.applyAxisAngle(new THREE.Vector3(0, 1, 0), argPerigeeRad);
    
    const inclinationRad = (satellite.inclination * Math.PI) / 180;
    position.applyAxisAngle(new THREE.Vector3(1, 0, 0), inclinationRad);
    
    const raanRad = (satellite.raan * Math.PI) / 180;
    position.applyAxisAngle(new THREE.Vector3(0, 1, 0), raanRad);
    
    return position;
  };

  const checkEclipse = (satellitePosition) => {
    const sunPosition = sunPositionRef.current;
    const earthRadius = 6.371;
    
    const sunDir = sunPosition.clone().normalize();
    const satPos = satellitePosition.clone();
    
    const projectionLength = satPos.dot(sunDir);
    
    if (projectionLength < 0) {
      const closestPointOnAxis = sunDir.clone().multiplyScalar(projectionLength);
      const perpDistance = satPos.clone().sub(closestPointOnAxis).length();
      
      const satDistance = satPos.length();
      const sunDistance = sunPosition.length();
      const sunRadius = 696000 / 1000;
      const umbraAngle = Math.atan(sunRadius / sunDistance);
      const umbraRadius = earthRadius - Math.abs(projectionLength) * Math.tan(umbraAngle);
      const penumbraRadius = earthRadius + Math.abs(projectionLength) * Math.tan(umbraAngle);
      
      if (perpDistance < umbraRadius) {
        return { inShadow: true, shadowFactor: 0.15 };
      } else if (perpDistance < penumbraRadius) {
        const t = (perpDistance - umbraRadius) / (penumbraRadius - umbraRadius);
        return { inShadow: true, shadowFactor: 0.15 + (0.85 * t) };
      }
    }
    
    return { inShadow: false, shadowFactor: 1.0 };
  };

  const updateSensorFootprint = useCallback((satelliteId) => {
    if (!sensorGroupRef.current || !satelliteGroupRef.current) return;
    
    if (!satelliteId) {
      sensorGroupRef.current.visible = false;
      return;
    }
    
    const data = satelliteDataRef.current.get(satelliteId);
    const satellite = satellites.find(s => s.id === satelliteId);
    
    if (!data || !data.position || !satellite) {
      sensorGroupRef.current.visible = false;
      return;
    }
    
    const position = data.position;
    const earthRadius = 6.371;
    const earthCenter = new THREE.Vector3(0, 0, 0);
    const dist = position.distanceTo(earthCenter);
    
    if (dist <= earthRadius) {
      sensorGroupRef.current.visible = false;
      return;
    }
    
    const alpha = Math.acos(earthRadius / dist);
    const coneRadius = earthRadius * Math.sin(alpha);
    const coneHeight = dist - (earthRadius * Math.cos(alpha));
    
    const direction = position.clone().normalize().negate();
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    
    sensorGroupRef.current.position.copy(position);
    sensorGroupRef.current.quaternion.copy(quaternion);
    
    if (sensorLineRef.current) {
      sensorLineRef.current.scale.set(1, coneHeight, 1);
      sensorLineRef.current.position.set(0, -coneHeight / 2, 0);
      sensorLineRef.current.material.color.set(satellite.color);
    }
    
    if (sensorFootprintRef.current) {
      sensorFootprintRef.current.position.set(0, -coneHeight - 0.02, 0);
      sensorFootprintRef.current.scale.set(coneRadius, coneRadius, 1);
      sensorFootprintRef.current.material.color.set(satellite.color);
    }
    
    if (sensorConeRef.current) {
      sensorConeRef.current.geometry.dispose();
      sensorConeRef.current.geometry = new THREE.ConeGeometry(coneRadius * 0.3, coneHeight, 32, 1, true);
      sensorConeRef.current.position.set(0, -coneHeight / 2, 0);
      sensorConeRef.current.material.color.set(satellite.color);
    }
    
    sensorGroupRef.current.visible = true;
  }, [satellites]);

  const updateGroundTrack = useCallback((satelliteId) => {
    if (!groundTrackRef.current) return;
    
    if (!satelliteId) {
      groundTrackRef.current.visible = false;
      return;
    }
    
    const satellite = satellites.find(s => s.id === satelliteId);
    if (!satellite || !satellite.tle || !satellite.tle.line1 || !satellite.tle.line2) {
      groundTrackRef.current.visible = false;
      return;
    }
    
    try {
      const satrec = satelliteJs.twoline2satrec(satellite.tle.line1, satellite.tle.line2);
      const positions = [];
      const earthRadius = 6.371;
      const groundOffset = 0.02;
      const now = new Date(Date.now() + simulationTime.current * 60000);
      const trackDuration = satellite.period * 1.5;
      const numPoints = 200;
      
      for (let i = 0; i < numPoints; i++) {
        const timeOffset = (i / numPoints) * trackDuration - (trackDuration * 0.25);
        const pointTime = new Date(now.getTime() + timeOffset * 60000);
        const positionAndVelocity = satelliteJs.propagate(satrec, pointTime);
        const positionEci = positionAndVelocity.position;
        
        if (positionEci) {
          const gmst = satelliteJs.gstime(pointTime);
          const positionGd = satelliteJs.eciToGeodetic(positionEci, gmst);
          
          const lat = positionGd.latitude;
          const lng = positionGd.longitude;
          
          const x = (earthRadius + groundOffset) * Math.cos(lat) * Math.cos(lng);
          const y = (earthRadius + groundOffset) * Math.sin(lat);
          const z = -(earthRadius + groundOffset) * Math.cos(lat) * Math.sin(lng);
          
          if (positions.length >= 3) {
            const prevX = positions[positions.length - 3];
            const prevZ = positions[positions.length - 1];
            const dist = Math.sqrt((x - prevX) * (x - prevX) + (z - prevZ) * (z - prevZ));
            if (dist > earthRadius * 0.5) {
              positions.push(NaN, NaN, NaN);
            }
          }
          
          positions.push(x, y, z);
        }
      }
      
      if (positions.length >= 6) {
        const cleanPositions = [];
        for (let i = 0; i < positions.length; i += 3) {
          if (!isNaN(positions[i])) {
            cleanPositions.push(positions[i], positions[i + 1], positions[i + 2]);
          }
        }
        
        if (cleanPositions.length >= 6) {
          groundTrackRef.current.geometry.setPositions(cleanPositions);
          groundTrackRef.current.computeLineDistances();
          groundTrackRef.current.material.color.set(satellite.color);
          groundTrackRef.current.visible = true;
        } else {
          groundTrackRef.current.visible = false;
        }
      } else {
        groundTrackRef.current.visible = false;
      }
    } catch (e) {
      groundTrackRef.current.visible = false;
    }
  }, [satellites]);


  const createLabel = useCallback((text, color = "#ffffff") => {
    const div = document.createElement("div");
    div.className = "satellite-body-label";
    div.textContent = text;
    div.style.cssText = `
      color: ${color};
      font-size: 11px;
      font-weight: 500;
      padding: 2px 6px;
      background: rgba(0, 0, 0, 0.8);
      border-radius: 3px;
      border: 1px solid ${color};
      pointer-events: none;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      white-space: nowrap;
      position: absolute;
      z-index: 5;
      transform: translate(-50%, -50%);
      transition: none;
    `;
    return new CSS2DObject(div);
  }, []);

  const createOrbitLine = useCallback((satellite) => {
    if (!satellite.tle || !satellite.tle.line1 || !satellite.tle.line2) {
      return null;
    }

    try {
      const satrec = satelliteJs.twoline2satrec(satellite.tle.line1, satellite.tle.line2);
      const orbitPoints = [];
      const segments = 64;
      const periodMinutes = satellite.period;
      const now = new Date(Date.now() + simulationTime.current * 60000);
      
      const earthRadius = 6.371;
      const sceneOrbitRadius = earthRadius + (satellite.altitude / ORBITAL_CONSTANTS.SCALE_FACTOR);

      for (let i = 0; i <= segments; i++) {
        const timeOffset = (i / segments) * periodMinutes;
        const pointTime = new Date(now.getTime() + timeOffset * 60000);
        const positionAndVelocity = satelliteJs.propagate(satrec, pointTime);
        const positionEci = positionAndVelocity.position;

        if (positionEci) {
          const distanceKm = Math.sqrt(positionEci.x * positionEci.x + positionEci.y * positionEci.y + positionEci.z * positionEci.z);
          const scaleFactor = sceneOrbitRadius / distanceKm;
          
          orbitPoints.push(new THREE.Vector3(
            positionEci.x * scaleFactor,
            positionEci.z * scaleFactor,
            -positionEci.y * scaleFactor
          ));
        }
      }

      if (orbitPoints.length < 2) return null;

      const positions = [];
      orbitPoints.forEach(point => {
        positions.push(point.x, point.y, point.z);
      });

      const orbitGeometry = new LineGeometry();
      orbitGeometry.setPositions(positions);

      const orbitMaterial = new LineMaterial({
        color: satellite.color,
        transparent: true,
        opacity: 0.7,
        linewidth: 2.5,
        resolution: new THREE.Vector2(window.innerWidth, window.innerHeight)
      });

      const orbitLine = new Line2(orbitGeometry, orbitMaterial);
      orbitLine.computeLineDistances();
      orbitLine.visible = showOrbits;
      return orbitLine;
    } catch (e) {
      return null;
    }
  }, [showOrbits]);

  const createTrailLine = useCallback((satellite) => {
    const positions = new Array(PERFORMANCE_CONSTANTS.TRAIL_LENGTH * 3).fill(0);

    const trailGeometry = new LineGeometry();
    trailGeometry.setPositions(positions);

    const trailMaterial = new LineMaterial({
      color: satellite.color,
      transparent: true,
      opacity: 0.9,
      linewidth: 3,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight)
    });

    const trailLine = new Line2(trailGeometry, trailMaterial);
    trailLine.computeLineDistances();
    trailLine.visible = showTrails;
    return trailLine;
  }, [showTrails]);

  const updateTrailPositions = useCallback((satellite, trail) => {
    if (!satellite.tle || !satellite.tle.line1 || !satellite.tle.line2) return;

    try {
      const satrec = satelliteJs.twoline2satrec(satellite.tle.line1, satellite.tle.line2);
      const positions = [];
      const now = new Date(Date.now() + simulationTime.current * 60000);
      
      const earthRadius = 6.371;
      const sceneOrbitRadius = earthRadius + (satellite.altitude / ORBITAL_CONSTANTS.SCALE_FACTOR);
      const trailMinutes = satellite.period / 4;

      for (let i = 0; i < PERFORMANCE_CONSTANTS.TRAIL_LENGTH; i++) {
        const timeOffset = -(i / PERFORMANCE_CONSTANTS.TRAIL_LENGTH) * trailMinutes;
        const pointTime = new Date(now.getTime() + timeOffset * 60000);
        const positionAndVelocity = satelliteJs.propagate(satrec, pointTime);
        const positionEci = positionAndVelocity.position;

        if (positionEci) {
          const distanceKm = Math.sqrt(positionEci.x * positionEci.x + positionEci.y * positionEci.y + positionEci.z * positionEci.z);
          const scaleFactor = sceneOrbitRadius / distanceKm;

          positions.push(
            positionEci.x * scaleFactor,
            positionEci.z * scaleFactor,
            -positionEci.y * scaleFactor
          );
        }
      }

      if (positions.length >= 6) {
        trail.geometry.setPositions(positions);
        trail.computeLineDistances();
      }
    } catch (e) {}
  }, []);

  const updateSpatialGrid = useCallback(() => {
    spatialGrid.clear();
    
    satellites.forEach((satellite, index) => {
      if (satellite.active) {
        const data = satelliteDataRef.current.get(satellite.id);
        if (data && data.position) {
          spatialGrid.add({ satellite, index }, data.position);
        }
      }
    });
  }, [satellites, spatialGrid]);

  const performFrustumCulling = useCallback(() => {
    if (!cameraRef.current) return;

    const camera = cameraRef.current;
    const matrix = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustumRef.current.setFromProjectionMatrix(matrix);
    
    const newVisibleSatellites = new Set();
    let visibleCount = 0;
    let culledCount = 0;

    satellites.forEach((satellite) => {
      if (!satellite.active) return;

      const data = satelliteDataRef.current.get(satellite.id);
      if (!data || !data.position) return;

      const distance = data.position.distanceTo(camera.position);
      const sphere = new THREE.Sphere(data.position, 2.0 * PERFORMANCE_CONSTANTS.FRUSTUM_MARGIN);
      
      if (frustumRef.current.intersectsSphere(sphere) && distance < 3000) {
        newVisibleSatellites.add(satellite.id);
        visibleCount++;
        
        if (visibleCount >= PERFORMANCE_CONSTANTS.MAX_VISIBLE_SATELLITES) {
          return;
        }
      } else {
        culledCount++;
      }
    });

    visibleSatellitesRef.current = newVisibleSatellites;

    setPerformanceStats(prev => ({
      ...prev,
      visibleSatellites: visibleCount,
      culledSatellites: culledCount
    }));
  }, [satellites]);

  const updateInstancedMeshes = useCallback(() => {
    if (!satelliteInstanceRef.current || !glowInstanceRef.current) return;

    const currentJD = dateToJulianDate(new Date(Date.now() + simulationTime.current * 60000));
    let instanceIndex = 0;
    
    satellites.forEach((satellite) => {
      if (!satellite.active || instanceIndex >= PERFORMANCE_CONSTANTS.MAX_VISIBLE_SATELLITES) return;

      const position = computeOrbitPosition(satellite, currentJD);
      
      const eclipseResult = checkEclipse(position);
      
      satelliteDataRef.current.set(satellite.id, {
        position: position.clone(),
        lastUpdate: Date.now(),
        instanceIndex,
        inShadow: eclipseResult.inShadow,
        shadowFactor: eclipseResult.shadowFactor
      });

      if (visibleSatellitesRef.current.has(satellite.id)) {
        tempMatrix.current.makeTranslation(position.x, position.y, position.z);
        satelliteInstanceRef.current.setMatrixAt(instanceIndex, tempMatrix.current);
        glowInstanceRef.current.setMatrixAt(instanceIndex, tempMatrix.current);

        const baseColor = new THREE.Color(satellite.color);
        const hdrBoost = 1.0 + eclipseResult.shadowFactor * 2.0;
        const finalColor = baseColor.multiplyScalar(hdrBoost * eclipseResult.shadowFactor);
        satelliteInstanceRef.current.setColorAt(instanceIndex, finalColor);

        instanceIndex++;
      }
    });

    if (instanceIndex > 0) {
      satelliteInstanceRef.current.instanceMatrix.needsUpdate = true;
      glowInstanceRef.current.instanceMatrix.needsUpdate = true;
      if (satelliteInstanceRef.current.instanceColor) {
        satelliteInstanceRef.current.instanceColor.needsUpdate = true;
      }
    }

    satelliteInstanceRef.current.count = instanceIndex;
    glowInstanceRef.current.count = instanceIndex;
  }, [satellites]);

  const updateOrbitsAndTrails = useCallback(() => {
    satellites.forEach((satellite) => {
      if (!satellite.active) return;

      if (showOrbits && !orbitLinesRef.current[satellite.id] && satellite.category !== "Deep Space") {
        const orbitLine = createOrbitLine(satellite);
        if (orbitLine) {
          satelliteGroupRef.current.add(orbitLine);
          orbitLinesRef.current[satellite.id] = orbitLine;
        }
      }

      if (showTrails && !trailLinesRef.current[satellite.id] && satellite.category !== "Deep Space") {
        const trailLine = createTrailLine(satellite);
        satelliteGroupRef.current.add(trailLine);
        trailLinesRef.current[satellite.id] = trailLine;
      }

      if (orbitLinesRef.current[satellite.id]) {
        orbitLinesRef.current[satellite.id].visible = showOrbits;
      }

      if (trailLinesRef.current[satellite.id]) {
        trailLinesRef.current[satellite.id].visible = showTrails;
        
        if (showTrails && frameCountRef.current % 4 === 0) {
          const trail = trailLinesRef.current[satellite.id];
          if (trail) {
            updateTrailPositions(satellite, trail);
          }
        }
      }
    });

    Object.keys(orbitLinesRef.current).forEach(satelliteId => {
      const satellite = satellites.find(s => s.id === satelliteId);
      if (!satellite || !satellite.active) {
        const orbitLine = orbitLinesRef.current[satelliteId];
        if (orbitLine) {
          satelliteGroupRef.current.remove(orbitLine);
          orbitLine.geometry.dispose();
          orbitLine.material.dispose();
          delete orbitLinesRef.current[satelliteId];
        }
      }
    });

    Object.keys(trailLinesRef.current).forEach(satelliteId => {
      const satellite = satellites.find(s => s.id === satelliteId);
      if (!satellite || !satellite.active) {
        const trailLine = trailLinesRef.current[satelliteId];
        if (trailLine) {
          satelliteGroupRef.current.remove(trailLine);
          trailLine.geometry.dispose();
          trailLine.material.dispose();
          delete trailLinesRef.current[satelliteId];
        }
      }
    });
  }, [satellites, showOrbits, showTrails, createOrbitLine, createTrailLine]);

  const updateLabels = useCallback(() => {
    if (!cameraRef.current || !labelRendererRef.current || !showLabels) {
      Object.values(labelsRef.current).forEach(label => {
        if (label && label.element) {
          label.element.style.display = "none";
        }
      });
      return;
    }

    const camera = cameraRef.current;
    const width = mountRef.current?.clientWidth || 800;
    const height = mountRef.current?.clientHeight || 600;

    const tempVector = new THREE.Vector3();

    Object.keys(labelsRef.current).forEach(satelliteId => {
      const label = labelsRef.current[satelliteId];
      if (!label || !label.element) return;

      const data = satelliteDataRef.current.get(satelliteId);
      if (!data || !data.position) {
        label.element.style.display = "none";
        return;
      }

      const distance = data.position.distanceTo(camera.position);

      tempVector.copy(data.position);
      tempVector.project(camera);

      const behind = tempVector.z > 1;

      if (!behind && showLabels) {
        const x = (tempVector.x * 0.5 + 0.5) * width;
        const y = (tempVector.y * -0.5 + 0.5) * height;

        if (x >= -100 && x <= width + 100 && y >= -100 && y <= height + 100) {
          label.element.style.left = `${Math.round(x)}px`;
          label.element.style.top = `${Math.round(y)}px`;
          label.element.style.display = "block";
        } else {
          label.element.style.display = "none";
        }
      } else {
        label.element.style.display = "none";
      }
    });
  }, [showLabels]);

  const fetchRealSatelliteData = async () => {
    const startTime = performance.now();
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_AUTH_URL}/all-satellite-data`, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`Backend API returned ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      const processedSatellites = result.satellites.map((satellite, index) => ({
        ...satellite,
        color: CATEGORY_COLORS[satellite.category] || "#888888",
        active: index < PERFORMANCE_CONSTANTS.PRESELECT_COUNT
      }));

      return {
        satellites: processedSatellites,
        earthRotation: result.earthRotation,
        errors: result.errors || [],
        metadata: {
          ...result.metadata,
          loadTime: performance.now() - startTime
        }
      };

    } catch (error) {
      return {
        satellites: [],
        earthRotation: null,
        errors: [`Backend connection failed: ${error.message}. No real satellite data available.`],
        metadata: {
          totalSources: 0,
          successfulSources: 0,
          loadTime: performance.now() - startTime,
          dataQuality: "No Data",
          queryTime: new Date().toISOString()
        }
      };
    }
  };

  const fetchSatelliteData = useCallback(async () => {
    setLoading(true);
    setErrors([]);
    const { satellites, earthRotation, errors, metadata } = await fetchRealSatelliteData();
    
    const processedSatellites = satellites.map(satellite => {
      return {
        ...satellite,
        hasTLE: !!(satellite.tle && satellite.tle.line1 && satellite.tle.line2),
        propagationModel: satellite.hasTLE ? (satellite.period > 225 ? "SDP4" : "SGP4") : "None"
      };
    });
    
    setSatellites(processedSatellites);
    setEarthRotationData(earthRotation);
    setErrors(errors);
    setLoadingMetadata(metadata);
    setLoading(false);
  }, []);

  const copyAllErrors = useCallback(async () => {
    try {
      const errorText = errors.join("\n");
      await navigator.clipboard.writeText(errorText);
      setCopiedErrors(true);
      setTimeout(() => {
        setCopiedErrors(false);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy errors:", err);
    }
  }, [errors]);

  const handleHudMouseDown = useCallback((e) => {
    if (e.target.closest(".satellite-close-btn")) return;
    e.preventDefault();
    setIsDraggingHud(true);
    setDragStart({
      x: e.clientX - hudPosition.x,
      y: e.clientY - hudPosition.y
    });
  }, [hudPosition]);

  const handleHudMouseMove = useCallback((e) => {
    if (!isDraggingHud || !hudPanelRef.current) return;
    e.preventDefault();
    let newX = e.clientX - dragStart.x;
    let newY = e.clientY - dragStart.y;

    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;
    const panelRect = hudPanelRef.current.getBoundingClientRect();

    const minX = (panelRect.width / 2) - (winWidth / 2) + 10;
    const maxX = (panelRect.width / 2) - (winWidth / 2) + winWidth - 10;
    const minY = (panelRect.height / 2) - (winHeight / 2) + 10;
    const maxY = (panelRect.height / 2) - (winHeight / 2) + winHeight - 10;

    newX = Math.max(minX, Math.min(maxX, newX));
    newY = Math.max(minY, Math.min(maxY, newY));

    setHudPosition({ x: newX, y: newY });
  }, [isDraggingHud, dragStart]);

  const handleHudMouseUp = useCallback(() => {
    setIsDraggingHud(false);
  }, []);

  const handleLegendMouseDown = useCallback((e) => {
    if (e.target.closest(".satellite-collapse-icon")) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingLegend(true);
    setLegendDragStart({
      x: e.clientX - legendPosition.x,
      y: e.clientY - legendPosition.y
    });
  }, [legendPosition]);

  const handleLegendMouseMove = useCallback((e) => {
    if (!isDraggingLegend || !legendPanelRef.current) return;
    e.preventDefault();
    let newX = e.clientX - legendDragStart.x;
    let newY = e.clientY - legendDragStart.y;

    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;
    const panelRect = legendPanelRef.current.getBoundingClientRect();

    const minX = -10;
    const maxX = winWidth - panelRect.width - 30;
    const minY = -60;
    const maxY = winHeight - panelRect.height - 20;

    newX = Math.max(minX, Math.min(maxX, newX));
    newY = Math.max(minY, Math.min(maxY, newY));

    setLegendPosition({ x: newX, y: newY });
  }, [isDraggingLegend, legendDragStart]);

  const handleLegendMouseUp = useCallback(() => {
    setIsDraggingLegend(false);
  }, []);

  const handleControlsMouseDown = useCallback((e) => {
    if (e.target.closest(".satellite-collapse-icon") || 
        e.target.closest(".dinoSatSatelliteControlButton") || 
        e.target.closest(".satellite-trail-slider") ||
        e.target.closest(".dinoSatSatelliteBloomControls")) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingControls(true);
    setControlsDragStart({
      x: e.clientX - controlsPosition.x,
      y: e.clientY - controlsPosition.y
    });
  }, [controlsPosition]);

  const handleControlsMouseMove = useCallback((e) => {
    if (!isDraggingControls || !controlsPanelRef.current) return;
    e.preventDefault();
    let newX = e.clientX - controlsDragStart.x;
    let newY = e.clientY - controlsDragStart.y;

    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;
    const panelRect = controlsPanelRef.current.getBoundingClientRect();

    const minX = 10 - winWidth + panelRect.width + 20;
    const maxX = winWidth - panelRect.width - 20 - (winWidth - panelRect.width - 30);
    const minY = -60;
    const maxY = winHeight - panelRect.height - 20;

    newX = Math.max(minX, Math.min(maxX, newX));
    newY = Math.max(minY, Math.min(maxY, newY));

    setControlsPosition({ x: newX, y: newY });
  }, [isDraggingControls, controlsDragStart]);

  const handleControlsMouseUp = useCallback(() => {
    setIsDraggingControls(false);
  }, []);

  const handleDetailedMouseDown = useCallback((e) => {
    if (e.target.closest(".satellite-close-btn") || 
        e.target.closest(".dinoSatSatelliteModelViewer")) return;
    e.preventDefault();
    setIsDraggingDetailed(true);
    setDetailedDragStart({
      x: e.clientX - detailedPosition.x,
      y: e.clientY - detailedPosition.y
    });
  }, [detailedPosition]);

  const handleDetailedMouseMove = useCallback((e) => {
    if (!isDraggingDetailed || !detailedPanelRef.current) return;
    e.preventDefault();
    let newX = e.clientX - detailedDragStart.x;
    let newY = e.clientY - detailedDragStart.y;

    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;
    const panelRect = detailedPanelRef.current.getBoundingClientRect();

    const minX = (panelRect.width / 2) - (winWidth / 2) + 10;
    const maxX = (panelRect.width / 2) - (winWidth / 2) + winWidth - 10;
    const minY = (panelRect.height / 2) - (winHeight / 2) + 10;
    const maxY = (panelRect.height / 2) - (winHeight / 2) + winHeight - 10;

    newX = Math.max(minX, Math.min(maxX, newX));
    newY = Math.max(minY, Math.min(maxY, newY));

    setDetailedPosition({ x: newX, y: newY });
  }, [isDraggingDetailed, detailedDragStart]);

  const handleDetailedMouseUp = useCallback(() => {
    setIsDraggingDetailed(false);
  }, []);

  const handleLegendToggle = useCallback((e) => {
    if (isDraggingLegend) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    toggleLegend();
  }, [isDraggingLegend]);

  const handleControlsToggle = useCallback((e) => {
    if (isDraggingControls) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    toggleControls();
  }, [isDraggingControls]);

  const handleVirtualScroll = useCallback((e) => {
    const scrollTop = e.target.scrollTop;
    setVirtualScrollOffset(scrollTop);
  }, []);

  const getVirtualScrollItems = useMemo(() => {
    if (!virtualScrollRef.current) return { visibleItems: [], startIndex: 0, endIndex: 0 };

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
      const position = data ? data.position : { x: 0, y: 0, z: 0 };
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
        hasTLE: !!satellite.tle,
        visible: visibleSatellitesRef.current.has(satellite.id)
      };
    });

    const exportData = {
      satellites: detailedSatellites,
      earthRotation: earthRotationData,
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
    a.download = "satellite_data_optimized.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [satellites, earthRotationData, actualFps, currentTime, speedMultiplier, performanceStats, loadingMetadata, errors]);

  const exportCSV = useCallback(() => {
    let csv = "ID,Name,Category,Altitude,Inclination,Period,Status,Color,Active,Source,Group,NORAD ID,Apogee,Perigee,Eccentricity,RAAN,Mean Anomaly,Velocity,Mean Motion,Epoch Year,Epoch Day,PositionX,PositionY,PositionZ,CurrentDistance,PropagationModel,HasTLE,Visible\n";

    satellites.forEach(satellite => {
      const data = satelliteDataRef.current.get(satellite.id);
      const position = data ? data.position : { x: 0, y: 0, z: 0 };
      const distance = Math.sqrt(position.x * position.x + position.y * position.y + position.z * position.z);
      const visible = visibleSatellitesRef.current.has(satellite.id);

      csv += `${satellite.id},"${satellite.name}",${satellite.category},${satellite.altitude},${satellite.inclination},${satellite.period},${satellite.status},${satellite.color},${satellite.active},"${satellite.source || ""}","${satellite.group || ""}",${satellite.noradId},${satellite.apogee || ""},${satellite.perigee || ""},${satellite.eccentricity || ""},${satellite.raan || ""},${satellite.meanAnomaly || ""},${satellite.velocity || ""},${satellite.meanMotion || ""},${satellite.epochYear || ""},${satellite.epochDay || ""},${position.x.toFixed(2)},${position.y.toFixed(2)},${position.z.toFixed(2)},${distance.toFixed(2)},${satellite.propagationModel || "None"},${satellite.hasTLE || false},${visible}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "satellite_data_optimized.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [satellites]);

  const exportFITS = useCallback(() => {
    const fitsHeader = `SIMPLE  =                    T / file does conform to FITS standard
BITPIX  =                   16 / number of bits per data pixel
NAXIS   =                    2 / number of data axes
NAXIS1  =                  100 / length of data axis 1
NAXIS2  =                  ${satellites.length} / length of data axis 2
EXTEND  =                    T / FITS dataset may contain extensions
COMMENT   Optimized Satellite Data from APIs
COMMENT   Generated by High-Performance Satellite Tracker
ORIGIN  = "Optimized Satellite Tracker v2.0"
DATE    = "${new Date().toISOString()}"
END`;

    let fitsData = fitsHeader.padEnd(2880, " ");
    
    satellites.forEach(satellite => {
      const row = [
        satellite.altitude || 0,
        satellite.inclination || 0,
        satellite.period || 0,
        satellite.eccentricity || 0,
        satellite.raan || 0,
        satellite.meanAnomaly || 0,
        satellite.velocity || 0,
        satellite.meanMotion || 0
      ].map(val => val.toString().padEnd(12)).join("").padEnd(100);
      fitsData += row;
    });

    const blob = new Blob([fitsData], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "satellite_data_optimized.fits";
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

  const togglePlay = useCallback(() => setIsPlaying(!isPlaying), [isPlaying]);
  const toggleOrbits = useCallback(() => setShowOrbits(!showOrbits), [showOrbits]);
  const toggleTrails = useCallback(() => setShowTrails(!showTrails), [showTrails]);
  const toggleLabels = useCallback(() => setShowLabels(!showLabels), [showLabels]);
  const toggleGrid = useCallback(() => setShowGrid(!showGrid), [showGrid]);
  const toggleEquatorialGrid = useCallback(() => setShowEquatorialGrid(!showEquatorialGrid), [showEquatorialGrid]);
  const toggleAxisMarkers = useCallback(() => setShowAxisMarkers(!showAxisMarkers), [showAxisMarkers]);
  const toggleAltitudeBands = useCallback(() => setShowAltitudeBands(!showAltitudeBands), [showAltitudeBands]);
  const toggleDistanceRings = useCallback(() => setShowDistanceRings(!showDistanceRings), [showDistanceRings]);
  const toggleBloom = useCallback(() => setBloomEnabled(!bloomEnabled), [bloomEnabled]);
  const toggleSidebar = useCallback(() => setSidebarCollapsed(!sidebarCollapsed), [sidebarCollapsed]);
  const toggleLegend = useCallback(() => setLegendCollapsed(!legendCollapsed), [legendCollapsed]);
  const toggleControls = useCallback(() => setControlsCollapsed(!controlsCollapsed), [controlsCollapsed]);

  const toggleHUD = useCallback(() => {
    setHudVisible(!hudVisible);
    if (!hudVisible) {
      setHudPosition({ x: 0, y: 0 });
    }
  }, [hudVisible]);

  const resetCamera = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.position.set(150, 80, 150);
      cameraRef.current.lookAt(0, 0, 0);
    }
  }, []);

  const changeSpeed = useCallback((speed) => setSpeedMultiplier(speed), []);

  const zoomToSatellite = useCallback((id) => {
    const data = satelliteDataRef.current.get(id);
    if (!data || !data.position || !cameraRef.current || !controlsRef.current) return;

    const targetPosition = data.position.clone();
    const currentTarget = controlsRef.current.target.clone();
    const currentCameraPos = cameraRef.current.position.clone();
    const direction = currentCameraPos.clone().sub(currentTarget).normalize();
    const currentDistance = currentCameraPos.distanceTo(currentTarget);
    const desiredCameraPos = targetPosition.clone().add(direction.multiplyScalar(currentDistance));

    new TWEEN.Tween(currentCameraPos)
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

    new TWEEN.Tween(currentTarget)
      .to(targetPosition, 1000)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate(() => {
        controlsRef.current.target.copy(currentTarget);
        controlsRef.current.update();
      })
      .start();
  }, []);

  useEffect(() => {
    document.body.className = `satellite-theme-${theme}`;
    return () => {
      document.body.className = "";
    };
  }, [theme]);

  useEffect(() => {
    const filtered = satellites.filter(satellite =>
      satellite.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      satellite.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (satellite.group && satellite.group.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredSatellites(filtered);
  }, [satellites, searchTerm]);

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
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    const composer = new EffectComposer(renderer);
    composerRef.current = composer;

    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      BLOOM_PARAMS.strength,
      BLOOM_PARAMS.radius,
      BLOOM_PARAMS.threshold
    );
    bloomPassRef.current = bloomPass;
    composer.addPass(bloomPass);

    const labelRenderer = document.createElement("div");
    labelRenderer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 5;
    `;
    mountRef.current.appendChild(labelRenderer);
    labelRendererRef.current = labelRenderer;

    const ambientLight = new THREE.AmbientLight(0x606065, 0.5);
    scene.add(ambientLight);

    const earthGroup = new THREE.Group();

    const earthGeometry = new THREE.SphereGeometry(6.371, 32, 32);
    const earthMaterial = new THREE.MeshPhongMaterial({
      color: 0x4488DD,
      shininess: 10,
      transparent: false
    });
    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    earthGroup.add(earth);

    const landGeometry = new THREE.SphereGeometry(6.372, 16, 16);
    const landMaterial = new THREE.MeshPhongMaterial({
      color: 0x228B22,
      transparent: true,
      opacity: 0.7
    });
    const landMasses = new THREE.Mesh(landGeometry, landMaterial);
    earthGroup.add(landMasses);

    const cloudGeometry = new THREE.SphereGeometry(6.375, 16, 16);
    const cloudMaterial = new THREE.MeshPhongMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.25
    });
    const clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
    earthGroup.add(clouds);

    const atmosphereGeometry = new THREE.SphereGeometry(6.42, 64, 64);
    const atmosphereVertexShader = `
      varying vec3 vNormal;
      varying vec3 vPositionNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPositionNormal = normalize((modelViewMatrix * vec4(position, 1.0)).xyz);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
    const atmosphereFragmentShader = `
      varying vec3 vNormal;
      varying vec3 vPositionNormal;
      void main() {
        float intensity = pow(0.6 - dot(vNormal, vPositionNormal), 3.0);
        vec3 innerColor = vec3(0.85, 0.9, 0.95);
        vec3 outerColor = vec3(0.4, 0.5, 0.6);
        vec3 atmosphereColor = mix(innerColor, outerColor, intensity);
        float hdrBoost = 1.0 + intensity * 0.8;
        gl_FragColor = vec4(atmosphereColor * hdrBoost, 1.0) * intensity * 0.7;
      }
    `;
    const atmosphereMaterial = new THREE.ShaderMaterial({
      vertexShader: atmosphereVertexShader,
      fragmentShader: atmosphereFragmentShader,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    earthGroup.add(atmosphere);

    const innerAtmosphereGeometry = new THREE.SphereGeometry(6.375, 64, 64);
    const innerAtmosphereVertexShader = `
      varying vec3 vNormal;
      varying vec3 vSunDirection;
      varying float vIntensity;
      uniform vec3 sunPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vSunDirection = normalize(sunPosition - worldPosition.xyz);
        float sunDot = dot(vNormal, vSunDirection);
        vIntensity = max(0.0, sunDot);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
    const innerAtmosphereFragmentShader = `
      varying vec3 vNormal;
      varying vec3 vSunDirection;
      varying float vIntensity;
      void main() {
        float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 3.0);
        vec3 dayColorInner = vec3(0.9, 0.92, 0.95);
        vec3 dayColorOuter = vec3(0.5, 0.55, 0.6);
        vec3 sunsetColor = vec3(1.0, 0.7, 0.4);
        vec3 nightColor = vec3(0.03, 0.04, 0.06);
        float terminator = smoothstep(-0.1, 0.3, vIntensity);
        vec3 dayColor = mix(dayColorOuter, dayColorInner, fresnel);
        vec3 twilightColor = mix(sunsetColor, dayColor, smoothstep(0.0, 0.25, vIntensity));
        vec3 color = mix(nightColor, twilightColor, terminator);
        float hdrBoost = 1.0 + vIntensity * 0.8;
        float alpha = fresnel * 0.35 * (0.3 + 0.7 * vIntensity);
        gl_FragColor = vec4(color * hdrBoost, alpha);
      }
    `;
    const innerAtmosphereMaterial = new THREE.ShaderMaterial({
      vertexShader: innerAtmosphereVertexShader,
      fragmentShader: innerAtmosphereFragmentShader,
      uniforms: {
        sunPosition: { value: sunPositionRef.current }
      },
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
      transparent: true,
      depthWrite: false
    });
    const innerAtmosphere = new THREE.Mesh(innerAtmosphereGeometry, innerAtmosphereMaterial);
    earthGroup.add(innerAtmosphere);

    const sunLight = new THREE.DirectionalLight(0xFFFFFF, 1.5);
    sunLight.position.copy(sunPositionRef.current.clone().normalize().multiplyScalar(100));
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    scene.add(earthGroup);
    earthRef.current = earthGroup;

    const polarGrid = new THREE.PolarGridHelper(300, 16, 8, 64, 0x444448, 0x222225);
    polarGrid.visible = showGrid;
    scene.add(polarGrid);
    gridRef.current = polarGrid;

    const equatorialGrid = createEquatorialGrid();
    equatorialGrid.visible = showEquatorialGrid;
    scene.add(equatorialGrid);
    equatorialGridRef.current = equatorialGrid;

    const axisMarkers = createAxisMarkers();
    axisMarkers.visible = showAxisMarkers;
    scene.add(axisMarkers);
    axisMarkersRef.current = axisMarkers;

    const altitudeBands = createAltitudeBands();
    altitudeBands.visible = showAltitudeBands;
    scene.add(altitudeBands);
    altitudeBandsRef.current = altitudeBands;

    const distanceRings = createDistanceRings();
    distanceRings.visible = showDistanceRings;
    scene.add(distanceRings);
    distanceRingsRef.current = distanceRings;

    const satelliteGroup = new THREE.Group();
    scene.add(satelliteGroup);
    satelliteGroupRef.current = satelliteGroup;

    const satelliteGeometry = new THREE.SphereGeometry(0.5, 8, 8);
    const satelliteMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 1.0
    });
    const satelliteInstance = new THREE.InstancedMesh(
      satelliteGeometry, 
      satelliteMaterial, 
      PERFORMANCE_CONSTANTS.MAX_VISIBLE_SATELLITES
    );
    satelliteInstance.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    satelliteInstance.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(PERFORMANCE_CONSTANTS.MAX_VISIBLE_SATELLITES * 3), 3
    );
    satelliteGroup.add(satelliteInstance);
    satelliteInstanceRef.current = satelliteInstance;

    const glowGeometry = new THREE.SphereGeometry(1.2, 8, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.2,
      side: THREE.BackSide
    });
    const glowInstance = new THREE.InstancedMesh(
      glowGeometry, 
      glowMaterial, 
      PERFORMANCE_CONSTANTS.MAX_VISIBLE_SATELLITES
    );
    glowInstance.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    satelliteGroup.add(glowInstance);
    glowInstanceRef.current = glowInstance;

    const sensorGroup = new THREE.Group();
    sensorGroup.visible = false;
    scene.add(sensorGroup);
    sensorGroupRef.current = sensorGroup;

    const sensorLineMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide
    });
    const sensorLineGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1, 8);
    const sensorLine = new THREE.Mesh(sensorLineGeometry, sensorLineMaterial);
    sensorGroup.add(sensorLine);
    sensorLineRef.current = sensorLine;

    const sensorConeMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const sensorConeGeometry = new THREE.ConeGeometry(0.5, 1, 32, 1, true);
    const sensorCone = new THREE.Mesh(sensorConeGeometry, sensorConeMaterial);
    sensorGroup.add(sensorCone);
    sensorConeRef.current = sensorCone;

    const sensorFootprintMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const sensorFootprintGeometry = new THREE.RingGeometry(0.92, 1.0, 64);
    const sensorFootprint = new THREE.Mesh(sensorFootprintGeometry, sensorFootprintMaterial);
    sensorFootprint.rotation.x = Math.PI / 2;
    sensorGroup.add(sensorFootprint);
    sensorFootprintRef.current = sensorFootprint;

    const sensorFootprintFillMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const sensorFootprintFillGeometry = new THREE.CircleGeometry(1.0, 64);
    const sensorFootprintFill = new THREE.Mesh(sensorFootprintFillGeometry, sensorFootprintFillMaterial);
    sensorFootprintFill.rotation.x = Math.PI / 2;
    sensorFootprint.add(sensorFootprintFill);

    const groundTrackPositions = new Array(200 * 3).fill(0);
    const groundTrackGeometry = new LineGeometry();
    groundTrackGeometry.setPositions(groundTrackPositions);
    const groundTrackMaterial = new LineMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
      linewidth: 2,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight)
    });
    const groundTrack = new Line2(groundTrackGeometry, groundTrackMaterial);
    groundTrack.computeLineDistances();
    groundTrack.visible = false;
    scene.add(groundTrack);
    groundTrackRef.current = groundTrack;

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
      uniforms: {
        time: { value: 0.0 }
      },
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
      
      if (groundTrackRef.current && groundTrackRef.current.material && groundTrackRef.current.material.resolution) {
        groundTrackRef.current.material.resolution.set(newWidth, newHeight);
      }
    };

    window.addEventListener("resize", handleResize);
    composer.render();
    setSceneInitialized(true);

    return () => {
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      if (mountRef.current && labelRendererRef.current) {
        mountRef.current.removeChild(labelRendererRef.current);
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

      if (sensorGroupRef.current) {
        sensorGroupRef.current.traverse(child => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        });
      }

      if (groundTrackRef.current) {
        groundTrackRef.current.geometry.dispose();
        groundTrackRef.current.material.dispose();
      }

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
  }, [createLabel, showGrid]);

  useEffect(() => {
    if (sceneInitialized) {
      fetchSatelliteData();
    }
  }, [sceneInitialized, fetchSatelliteData]);

  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.visible = showGrid;
    }
  }, [showGrid]);

  useEffect(() => {
    if (equatorialGridRef.current) {
      equatorialGridRef.current.visible = showEquatorialGrid;
    }
  }, [showEquatorialGrid]);

  useEffect(() => {
    if (axisMarkersRef.current) {
      axisMarkersRef.current.visible = showAxisMarkers;
    }
  }, [showAxisMarkers]);

  useEffect(() => {
    if (altitudeBandsRef.current) {
      altitudeBandsRef.current.visible = showAltitudeBands;
    }
  }, [showAltitudeBands]);

  useEffect(() => {
    if (distanceRingsRef.current) {
      distanceRingsRef.current.visible = showDistanceRings;
    }
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
    const handleGlobalMouseMove = (e) => {
      if (isDraggingHud) handleHudMouseMove(e);
      if (isDraggingLegend) handleLegendMouseMove(e);
      if (isDraggingControls) handleControlsMouseMove(e);
      if (isDraggingDetailed) handleDetailedMouseMove(e);
    };

    const handleGlobalMouseUp = () => {
      if (isDraggingHud) handleHudMouseUp();
      if (isDraggingLegend) handleLegendMouseUp();
      if (isDraggingControls) handleControlsMouseUp();
      if (isDraggingDetailed) handleDetailedMouseUp();
    };

    if (isDraggingHud || isDraggingLegend || isDraggingControls || isDraggingDetailed) {
      document.addEventListener("mousemove", handleGlobalMouseMove);
      document.addEventListener("mouseup", handleGlobalMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleGlobalMouseMove);
        document.removeEventListener("mouseup", handleGlobalMouseUp);
      };
    }
  }, [
    isDraggingHud, isDraggingLegend, isDraggingControls, isDraggingDetailed, 
    handleHudMouseMove, handleLegendMouseMove, handleControlsMouseMove, handleDetailedMouseMove, 
    handleHudMouseUp, handleLegendMouseUp, handleControlsMouseUp, handleDetailedMouseUp
  ]);

  useEffect(() => {
    if (!sceneRef.current || !composerRef.current || !cameraRef.current) return;

    let animationId;
    let lastTime = performance.now();
    let fpsCounter = 0;
    let fpsInterval = 1000 / targetFps;
    let then = performance.now();

    const animate = (time) => {
      animationId = requestAnimationFrame(animate);

      const deltaTime = time - lastTime;
      const elapsed = time - then;

      if (elapsed > fpsInterval) {
        then = time - (elapsed % fpsInterval);
        const actualDelta = deltaTime / 1000;
        lastTime = time;
        frameCountRef.current++;

        if (starsRef.current && starsRef.current.material) {
          starsRef.current.material.uniforms.time.value = time * 0.001;
        }

        fpsCounter++;
        if (time - lastFpsTime.current >= 1000) {
          actualFpsRef.current = Math.round(fpsCounter * 1000 / (time - lastFpsTime.current));
          setActualFps(actualFpsRef.current);
          fpsCounter = 0;
          lastFpsTime.current = time;

          if (rendererRef.current && rendererRef.current.info) {
            setPerformanceStats(prev => ({
              ...prev,
              renderTime: Math.round(deltaTime * 100) / 100,
              memoryUsage: rendererRef.current.info.memory.geometries + rendererRef.current.info.memory.textures,
              triangles: rendererRef.current.info.render.triangles,
              drawCalls: rendererRef.current.info.render.calls,
              lines: rendererRef.current.info.render.lines,
              textures: rendererRef.current.info.memory.textures,
              geometries: rendererRef.current.info.memory.geometries
            }));
          }
        }

        if (isPlaying) {
          simulationTime.current += actualDelta * speedMultiplier;
        }

        const currentDate = new Date();
        currentDate.setMinutes(currentDate.getMinutes() + simulationTime.current);
        setCurrentTime(currentDate.toLocaleString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        }));

        if (isPlaying && satellites.length > 0) {
          if (earthRef.current && earthRotation && earthRotationData) {
            const currentJD = dateToJulianDate(currentDate);
            const t = (currentJD - ORBITAL_CONSTANTS.JULIAN_DATE_J2000) / 36525.0;
            let gmst = earthRotationData.gmst + 360.98564736629 * (currentJD - earthRotationData.julianDate) * ORBITAL_CONSTANTS.DEG_TO_RAD;
            gmst = gmst % (2 * Math.PI);
            if (gmst < 0) gmst += 2 * Math.PI;
            earthRef.current.rotation.y = gmst;

            const sunAngle = gmst + Math.PI;
            const sunDistance = 1000000;
            sunPositionRef.current.set(
              sunDistance * Math.cos(sunAngle),
              sunDistance * 0.4,
              sunDistance * Math.sin(sunAngle)
            );

            if (sunLightRef.current) {
              sunLightRef.current.position.copy(sunPositionRef.current.clone().normalize().multiplyScalar(100));
            }
          }

          if (frameCountRef.current % PERFORMANCE_CONSTANTS.UPDATE_FREQUENCY === 0) {
            updateInstancedMeshes();
            performFrustumCulling();
            updateSpatialGrid();
            updateOrbitsAndTrails();
          }

          if (frameCountRef.current % PERFORMANCE_CONSTANTS.UPDATE_FREQUENCY === 0) {
            updateLabels();
          }

          if (selectedSatellite) {
            updateSensorFootprint(selectedSatellite);
            if (frameCountRef.current % 10 === 0) {
              updateGroundTrack(selectedSatellite);
            }
          } else {
            updateSensorFootprint(null);
            updateGroundTrack(null);
          }
        }

        controlsRef.current.update();
        TWEEN.update(time);
        
        if (bloomEnabled) {
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
      }
    };

    animate(performance.now());

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [
    satellites, earthRotation, earthRotationData, showTrails, showOrbits, showLabels, 
    isPlaying, speedMultiplier, targetFps, bloomEnabled, updateLabels, performFrustumCulling, 
    updateInstancedMeshes, updateSpatialGrid, updateOrbitsAndTrails, selectedSatellite, 
    updateSensorFootprint, updateGroundTrack
  ]);

  useEffect(() => {
    if (!detailedSatellite || !detailedPanelRef.current) return;

    const container = detailedPanelRef.current.querySelector(".dinoSatSatelliteModelViewer");
    if (!container) return;

    container.innerHTML = "";
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 15);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(10, 5, 10);
    scene.add(dirLight);

    const satelliteGroup = new THREE.Group();

    const ballGeometry = new THREE.SphereGeometry(2, 16, 16);
    const ballMaterial = new THREE.MeshBasicMaterial({
      color: detailedSatellite.color,
      emissive: detailedSatellite.color,
      emissiveIntensity: 1.0
    });
    const ball = new THREE.Mesh(ballGeometry, ballMaterial);
    satelliteGroup.add(ball);

    const glowGeometry = new THREE.SphereGeometry(4, 12, 12);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: detailedSatellite.color,
      transparent: true,
      opacity: 0.2,
      side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    satelliteGroup.add(glow);
    scene.add(satelliteGroup);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = true;
    controls.enablePan = false;

    let animationId;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      satelliteGroup.rotation.y += 0.01;
      glow.rotation.x += 0.005;
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
      controls.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [detailedSatellite]);

  const activeSatellites = satellites.filter(s => s.active).length;
  const sgp4Count = satellites.filter(s => s.propagationModel === "SGP4").length;
  const sdp4Count = satellites.filter(s => s.propagationModel === "SDP4").length;

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

  const categoryCounts = satellites.reduce((acc, satellite) => {
    if (satellite.active) {
      acc[satellite.category] = (acc[satellite.category] || 0) + 1;
    }
    return acc;
  }, {});

  const { visibleItems, startIndex } = getVirtualScrollItems;

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
              <small>Fetching from CelesTrak, IERS APIs...</small>
            </div>
          )}

          <div className="dinoSatSatelliteSideBarHeader">
            <h1>
              {!sidebarCollapsed && <small>Satellite Tracker</small>}
            </h1>

            {!sidebarCollapsed && (
              <>
                <div className="dinoSatSatelliteSideBarThemeSelector">
                  <button
                    className={`dinoSatSatelliteSelectButton ${theme === "dark" ? "dinoSatSatelliteButtonActive" : ""}`}
                    onClick={() => setTheme("dark")}
                  >
                    Dark
                  </button>
                  <button
                    className={`dinoSatSatelliteSelectButton ${theme === "neon" ? "dinoSatSatelliteButtonActive" : ""}`}
                    onClick={() => setTheme("neon")}
                  >
                    Neon
                  </button>
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
                        "paddingTop": showErrors ? "" : 0,  
                        "paddingBottom": showErrors ? "" : 0 
                      }}
                    >
                      <div className="dinoSatSatelliteSideBarThemeSelectorErrorIndicatorHeader">
                        <span>API Errors ({errors.length})</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyAllErrors();
                          }}
                          onMouseEnter={(e) => e.target.style.opacity = "1"}
                          onMouseLeave={(e) => e.target.style.opacity = "0.7"}
                          aria-label="Copy all errors"
                        >
                          <FontAwesomeIcon 
                            icon={copiedErrors ? faSquareCheck : faClone} 
                            size="sm"
                          />
                        </button>
                      </div>
                      {showErrors && (
                        <div className="dinoSatSatelliteSideBarThemeSelectorErrorIndicatorList">
                          {errors.map((error, index) => (
                            <div key={index} style={{ opacity: 0.8 }}>
                              {error}
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

          {!sidebarCollapsed && !loading && (
            <>
              <div className="dinoSatSatelliteSearchControls">
                <input
                  type="text"
                  placeholder="Search satellites..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="dinoSatSatelliteSearchInput"
                />
                <div className="dinoSatSatelliteSelectControls">
                  <button className="dinoSatSatelliteSelectButton" onClick={selectAllSatellites}>
                    Select All
                  </button>
                  <button className="dinoSatSatelliteSelectButton" onClick={deselectAllSatellites}>
                    Deselect All
                  </button>
                  <button className="dinoSatSatelliteSelectButton" onClick={fetchSatelliteData}>
                    Refresh Data
                  </button>
                </div>
              </div>

              <div className="dinoSatSatelliteObjectsHeader">
                <span className="dinoSatSatelliteObjectsHeaderIcon">
                  <FontAwesomeIcon icon={faSatellite} />
                </span>
                <span>Satellites ({satellites.filter(s => s.active).length}/{satellites.length})</span>
              </div>

              <div 
                ref={virtualScrollRef}
                className="dinoSatSatelliteList satellite-list"
                style={{
                  height: "400px",
                  overflowY: "auto",
                  position: "relative"
                }}
                onScroll={handleVirtualScroll}
              >
                <div 
                  style={{ 
                    height: filteredSatellites.length * PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT,
                    position: "relative"
                  }}
                >
                  <div 
                    style={{
                      position: "absolute",
                      top: startIndex * PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT,
                      width: "100%"
                    }}
                  >
                    {visibleItems.map((satellite, index) => (
                      <div
                        key={satellite.id}
                        className={`dinoSatSatelliteListItem satellite-item ${satellite.active ? "dinoSatSatelliteButtonActive" : ""} ${selectedSatellite === satellite.id ? "satellite-selected" : ""}`}
                        style={{ 
                          height: PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT,
                          minHeight: PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT 
                        }}
                        onClick={() => {
                          if (!satellite.active) {
                            toggleSatellite(satellite.id);
                          }
                          setSelectedSatellite(satellite.id);
                          zoomToSatellite(satellite.id);
                        }}
                      >
                        <div
                          className="dinoSatSatelliteIndicator"
                          style={{ backgroundColor: satellite.color }}
                        />
                        <div className="dinoSatSatelliteName satellite-name">
                          {satellite.name}
                        </div>
                        <label className="consoleSwitch">
                          <input 
                            type="checkbox" 
                            checked={satellite.active} 
                            onChange={() => { toggleSatellite(satellite.id); }} 
                          />
                          <span className="consoleSlider round"></span>
                        </label>
                        <button
                          className="dinoSatSatelliteInfoButton"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailedSatellite(satellite);
                            setDetailedPosition({ x: 0, y: 0 });
                          }}
                          aria-label="Show details"
                        >
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

        <div className="dinoSatSatelliteMainView">
          <div className="dinonSatSatelliteViewHeader">
            <div className="dinoSatSatellitePlaybackControls">
              <button className="dinoSatSatellitePlaybackControlsButton" onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"}>
                <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
              </button>

              {SPEED_OPTIONS.map(option => (
                <button
                  key={option.label}
                  className={`dinoSatSatellitePlaybackControlsSpeedButton ${speedMultiplier === option.value ? "dinoSatSatelliteButtonActive" : ""}`}
                  onClick={() => changeSpeed(option.value)}
                  aria-label={option.label}
                >
                  {option.label}
                </button>
              ))}

              <select 
                className="dinoSatSatelliteFPSSelect" 
                value={targetFps} 
                onChange={(e) => setTargetFps(Number(e.target.value))} 
                aria-label="Target FPS"
              >
                {FPS_OPTIONS.map(fps => (
                  <option key={fps} value={fps}>{fps} FPS</option>
                ))}
              </select>

              <div className="dinoSatSatellitePlaybackControlsButton" onClick={toggleHUD} aria-label="Toggle HUD">
                <FontAwesomeIcon icon={faChartLine} /> HUD
              </div>

              <button className="dinoSatSatellitePlaybackControlsButton" onClick={exportJSON} aria-label="Export JSON">
                Export JSON
              </button>

              <button className="dinoSatSatellitePlaybackControlsButton" onClick={exportCSV} aria-label="Export CSV">
                Export CSV
              </button>

              <button className="dinoSatSatellitePlaybackControlsButton" onClick={exportFITS} aria-label="Export FITS">
                Export FITS
              </button>
            </div>
          </div>

          <div ref={mountRef} className="dinoSatSatelliteCanvasContainer" />

          <div
            ref={legendPanelRef}
            className={`dinoSatSatelliteLegendPanel ${legendCollapsed ? "satellite-collapsed" : ""}`}
            style={{
              transform: `translate(${legendPosition.x}px, ${legendPosition.y}px)`,
              cursor: isDraggingLegend ? "grabbing" : "grab"
            }}
            onMouseDown={handleLegendMouseDown}
            tabIndex={0}
          >
            <div className="dinoSatSatellitePanelHeader" onClick={handleLegendToggle}>
              <small>Legend</small>
              <span className="dinosatSatelliteHeaderIcon">
                <FontAwesomeIcon icon={legendCollapsed ? faChevronDown : faChevronUp} />
              </span>
            </div>
            {!legendCollapsed && (
              <div className="dinoSatSatellitePanelContent">
                {Object.entries(CATEGORY_COLORS).map(([category, color]) => (
                  <div key={category} className="dinoSatSatelliteLegendItem">
                    <div className="dinoSatSatelliteLegendColor" style={{ backgroundColor: color }} />
                    <span>{category}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            ref={controlsPanelRef}
            className={`dinoSatSatelliteControlsPanel ${controlsCollapsed ? "satellite-collapsed" : ""}`}
            style={{
              transform: `translate(${controlsPosition.x}px, ${controlsPosition.y}px)`,
              cursor: isDraggingControls ? "grabbing" : "grab"
            }}
            onMouseDown={handleControlsMouseDown}
            tabIndex={0}
          >
            <div className="dinoSatSatellitePanelHeader" onClick={handleControlsToggle}>
              <span>3D Controls</span>
              <span className="dinosatSatelliteHeaderIcon">
                <FontAwesomeIcon icon={controlsCollapsed ? faChevronDown : faChevronUp} />
              </span>
            </div>
            {!controlsCollapsed && (
              <div className="dinoSatSatellitePanelContent">
                <button className="dinoSatSatelliteControlButton" onClick={resetCamera}>Reset Camera</button>
                <button className="dinoSatSatelliteControlButton" onClick={toggleOrbits}>{showOrbits ? "Hide" : "Show"} Orbits</button>
                <button className="dinoSatSatelliteControlButton" onClick={toggleTrails}>{showTrails ? "Hide" : "Show"} Trails</button>
                <button className="dinoSatSatelliteControlButton" onClick={toggleLabels}>{showLabels ? "Hide" : "Show"} Labels</button>
                <button className="dinoSatSatelliteControlButton" onClick={toggleBloom}>{bloomEnabled ? "Disable" : "Enable"} Bloom</button>
                <button className="dinoSatSatelliteControlButton" onClick={toggleAxisMarkers}>{showAxisMarkers ? "Hide" : "Show"} Axes</button>
                <button className="dinoSatSatelliteControlButton" onClick={toggleEquatorialGrid}>{showEquatorialGrid ? "Hide" : "Show"} Grid</button>
                <button className="dinoSatSatelliteControlButton" onClick={toggleAltitudeBands}>{showAltitudeBands ? "Hide" : "Show"} Alt Bands</button>
                <button className="dinoSatSatelliteControlButton" onClick={toggleDistanceRings}>{showDistanceRings ? "Hide" : "Show"} Dist Rings</button>
                {bloomEnabled && (
                  <div className="dinoSatSatelliteBloomControls">
                    <div className="dinoSatSatelliteBloomSlider">
                      <span>Strength</span>
                      <input type="range" min="0" max="5" step="0.1" value={bloomStrength} onChange={(e) => setBloomStrength(parseFloat(e.target.value))} onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} />
                      <span>{bloomStrength.toFixed(1)}</span>
                    </div>
                    <div className="dinoSatSatelliteBloomSlider">
                      <span>Radius</span>
                      <input type="range" min="0" max="2" step="0.05" value={bloomRadius} onChange={(e) => setBloomRadius(parseFloat(e.target.value))} onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} />
                      <span>{bloomRadius.toFixed(2)}</span>
                    </div>
                    <div className="dinoSatSatelliteBloomSlider">
                      <span>Threshold</span>
                      <input type="range" min="0" max="2" step="0.05" value={bloomThreshold} onChange={(e) => setBloomThreshold(parseFloat(e.target.value))} onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} />
                      <span>{bloomThreshold.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {hudVisible && (
            <div
              ref={hudPanelRef}
              className="dinoSatSatelliteHUDPanel"
              style={{
                transform: `translate(calc(-50% + ${hudPosition.x}px), calc(-50% + ${hudPosition.y}px))`,
                cursor: isDraggingHud ? "grabbing" : "grab"
              }}
              onMouseDown={handleHudMouseDown}
              tabIndex={0}
            >
              <div className="dinoSatSatelliteHUDPanelHeader">
                <span>Performance HUD - Drag to Move</span>
                <button className="dinoSatSatelliteCloseButton" onClick={toggleHUD}><FontAwesomeIcon icon={faXmarkSquare} /></button>
              </div>
              <div className="dinoSatSatelliteHUDContent">
                <div className="dinosatSatelliteHUDSection">
                  <h4>Coordinate System</h4>
                  <div className="dinosatSatelliteHUDSectionGrid">
                    <div className="dinosatSatelliteHUDSectionItem"><span>Reference Frame:</span><span>ECI J2000.0</span></div>
                    <div className="dinosatSatelliteHUDSectionItem"><span>Origin:</span><span>Earth Center</span></div>
                    <div className="dinosatSatelliteHUDSectionItem"><span>X-Axis:</span><span>Vernal Equinox</span></div>
                    <div className="dinosatSatelliteHUDSectionItem"><span>Y-Axis:</span><span>90E Longitude</span></div>
                    <div className="dinosatSatelliteHUDSectionItem"><span>Z-Axis:</span><span>North Pole</span></div>
                    <div className="dinosatSatelliteHUDSectionItem"><span>Units:</span><span>km (scaled)</span></div>
                  </div>
                </div>
                <div className="dinosatSatelliteHUDSection">
                  <h4>Post-Processing</h4>
                  <div className="dinosatSatelliteHUDSectionGrid">
                    <div className="dinosatSatelliteHUDSectionItem"><span>Bloom:</span><span style={{ color: bloomEnabled ? "#4ECDC4" : "#888888" }}>{bloomEnabled ? "Enabled" : "Disabled"}</span></div>
                    <div className="dinosatSatelliteHUDSectionItem"><span>Bloom Strength:</span><span>{bloomStrength.toFixed(2)}</span></div>
                    <div className="dinosatSatelliteHUDSectionItem"><span>Bloom Radius:</span><span>{bloomRadius.toFixed(2)}</span></div>
                    <div className="dinosatSatelliteHUDSectionItem"><span>Bloom Threshold:</span><span>{bloomThreshold.toFixed(2)}</span></div>
                  </div>
                </div>
                <div className="dinosatSatelliteHUDSection">
                  <h4>Performance Metrics</h4>
                  <div className="dinosatSatelliteHUDSectionGrid">
                    <div className="dinosatSatelliteHUDSectionItem"><span>Render Time:</span><span>{performanceStats.renderTime}ms</span></div>
                    <div className="dinosatSatelliteHUDSectionItem"><span>Target FPS:</span><span>{targetFps}</span></div>
                    <div className="dinosatSatelliteHUDSectionItem"><span>Actual FPS:</span><span>{actualFps}</span></div>
                    <div className="dinosatSatelliteHUDSectionItem"><span>Draw Calls:</span><span>{performanceStats.drawCalls}</span></div>
                    <div className="dinosatSatelliteHUDSectionItem"><span>Triangles:</span><span>{performanceStats.triangles.toLocaleString()}</span></div>
                    <div className="dinosatSatelliteHUDSectionItem"><span>Memory Usage:</span><span>{performanceStats.memoryUsage} objects</span></div>
                    <div className="dinosatSatelliteHUDSectionItem"><span>Visible Satellites:</span><span style={{ color: "#00ff00" }}>{performanceStats.visibleSatellites}</span></div>
                    <div className="dinosatSatelliteHUDSectionItem"><span>Culled Satellites:</span><span style={{ color: "#ffaa00" }}>{performanceStats.culledSatellites}</span></div>
                  </div>
                </div>
                <div className="dinosatSatelliteHUDSection">
                  <h4>3D Reference Elements</h4>
                  <div className="dinosatSatelliteHUDSectionGrid">
                    <div className="dinosatSatelliteHUDSectionItem"><span>Axis Markers:</span><span style={{ color: showAxisMarkers ? "#00ff00" : "#888888" }}>{showAxisMarkers ? "Visible" : "Hidden"}</span></div>
                    <div className="dinosatSatelliteHUDSectionItem"><span>Equatorial Grid:</span><span style={{ color: showEquatorialGrid ? "#00ff00" : "#888888" }}>{showEquatorialGrid ? "Visible" : "Hidden"}</span></div>
                    <div className="dinosatSatelliteHUDSectionItem"><span>Altitude Bands:</span><span style={{ color: showAltitudeBands ? "#00ff00" : "#888888" }}>{showAltitudeBands ? "Visible" : "Hidden"}</span></div>
                    <div className="dinosatSatelliteHUDSectionItem"><span>Distance Rings:</span><span style={{ color: showDistanceRings ? "#00ff00" : "#888888" }}>{showDistanceRings ? "Visible" : "Hidden"}</span></div>
                  </div>
                </div>
                <div className="dinosatSatelliteHUDSection">
                  <h4>Orbital Propagation Status</h4>
                  <div className="dinosatSatelliteHUDSectionGrid">
                    <div className="dinosatSatelliteHUDSectionItem"><span>SGP4 Satellites:</span><span style={{ color: "#00ff00" }}>{sgp4Count}</span></div>
                    <div className="dinosatSatelliteHUDSectionItem"><span>SDP4 Deep Space:</span><span style={{ color: "#ffaa00" }}>{sdp4Count}</span></div>
                    <div className="dinosatSatelliteHUDSectionItem"><span>TLE Processing Errors:</span><span style={{ color: errors.length > 0 ? "#ff4400" : "#00ff00" }}>{errors.length}</span></div>
                    <div className="dinosatSatelliteHUDSectionItem"><span>Earth Rotation:</span><span style={{ color: earthRotationData ? "#00ff00" : "#ff4400" }}>{earthRotationData ? "IERS Data" : "Failed"}</span></div>
                  </div>
                </div>
                <div className="dinosatSatelliteHUDSection">
                  <h4>Data Status</h4>
                  <div className="dinosatSatelliteHUDSectionGrid">
                    <div className="dinosatSatelliteHUDSectionItem"><span>Active Satellites:</span><span>{activeSatellites}</span></div>
                    <div className="dinosatSatelliteHUDSectionItem"><span>Total Objects:</span><span>{satellites.length}</span></div>
                    <div className="dinosatSatelliteHUDSectionItem"><span>Data Sources:</span><span>CelesTrak, IERS</span></div>
                    <div className="dinosatSatelliteHUDSectionItem"><span>Speed Multiplier:</span><span>{speedMultiplier}x</span></div>
                    <div className="dinosatSatelliteHUDSectionItem"><span>Simulation Time:</span><span>{currentTime}</span></div>
                  </div>
                </div>
                <div className="dinosatSatelliteHUDSection">
                  <h4>Fleet Statistics</h4>
                  <div className="dinosatSatelliteHUDSectionGrid">
                    <div className="dinosatSatelliteHUDSectionItem"><span>Active LEO:</span><span>{categoryCounts["LEO"] || 0}</span></div>
                    <div className="dinosatSatelliteHUDSectionItem"><span>Active MEO:</span><span>{categoryCounts["MEO"] || 0}</span></div>
                    <div className="dinosatSatelliteHUDSectionItem"><span>Active GEO:</span><span>{categoryCounts["GEO"] || 0}</span></div>
                    <div className="dinosatSatelliteHUDSectionItem"><span>Deep Space:</span><span>{categoryCounts["Deep Space"] || 0}</span></div>
                  </div>
                </div>
                <div className="dinosatSatelliteHUDSection">
                  <h4>Eclipse Physics</h4>
                  <div className="dinosatSatelliteHUDSectionGrid">
                    <div className="dinosatSatelliteHUDSectionItem"><span>Satellites Sunlit:</span><span style={{ color: "#00ff00" }}>{eclipseStats.sunlit}</span></div>
                    <div className="dinosatSatelliteHUDSectionItem"><span>Satellites In Shadow:</span><span style={{ color: "#ff8800" }}>{eclipseStats.inShadow}</span></div>
                    <div className="dinosatSatelliteHUDSectionItem"><span>Shadow Model:</span><span style={{ color: "#00ff00" }}>Umbra/Penumbra</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {detailedSatellite && (
            <div
              ref={detailedPanelRef}
              className="dinoSatSatelliteDetailedPanel"
              style={{
                transform: `translate(calc(-50% + ${detailedPosition.x}px), calc(-50% + ${detailedPosition.y}px))`,
                cursor: isDraggingDetailed ? "grabbing" : "grab"
              }}
              onMouseDown={handleDetailedMouseDown}
              tabIndex={0}
            >
              <div className="dinoSatSatelliteHUDPanelHeader">
                <span>{detailedSatellite.name}</span>
                <button className="dinoSatSatelliteCloseButton" onClick={() => setDetailedSatellite(null)}><FontAwesomeIcon icon={faXmarkSquare} /></button>
              </div>
              <div className="dinoSatSatelliteHUDContent">
                <div className="dinoSatSatelliteModelViewer"></div>
                <div className="dinosatSatelliteHUDSection">
                  <h4>Basic Information</h4>
                  <div className="dinosatSatelliteHUDSectionGrid">
                    <div className="dinosatSatelliteHUDSectionItem"><span>Name:</span><span>{detailedSatellite.name}</span></div>
                    <div className="dinosatSatelliteHUDSectionItem"><span>NORAD ID:</span><span>{detailedSatellite.noradId}</span></div>
                    <div className="dinosatSatelliteHUDSectionItem"><span>Category:</span><span>{detailedSatellite.category}</span></div>
                    <div className="dinosatSatelliteHUDSectionItem"><span>Status:</span><span style={{ color: detailedSatellite.status === "Active" ? "#00ff00" : "#ff4400" }}>{detailedSatellite.status}</span></div>
                    <div className="dinosatSatelliteHUDSectionItem"><span>Propagation Model:</span><span style={{ color: detailedSatellite.hasTLE ? "#00ff00" : "#ffaa00" }}>{detailedSatellite.propagationModel || "No TLE"}</span></div>
                    <div className="dinosatSatelliteHUDSectionItem"><span>Data Source:</span><span>{detailedSatellite.source}</span></div>
                  </div>
                </div>
                <div className="dinosatSatelliteHUDSection">
                  <h4>Orbital Parameters</h4>
                  <div className="dinosatSatelliteHUDSectionGrid">
                    <div className="dinosatSatelliteHUDSectionItem"><span>Altitude:</span><span>{detailedSatellite.altitude} km</span></div>
                    <div className="dinosatSatelliteHUDSectionItem"><span>Apogee:</span><span>{detailedSatellite.apogee} km</span></div>
                    <div className="dinosatSatelliteHUDSectionItem"><span>Perigee:</span><span>{detailedSatellite.perigee} km</span></div>
                    <div className="dinosatSatelliteHUDSectionItem"><span>Inclination:</span><span>{detailedSatellite.inclination}</span></div>
                    <div className="dinosatSatelliteHUDSectionItem"><span>Orbital Period:</span><span>{detailedSatellite.period.toFixed(2)} minutes</span></div>
                    <div className="dinosatSatelliteHUDSectionItem"><span>Eccentricity:</span><span>{detailedSatellite.eccentricity}</span></div>
                    <div className="dinosatSatelliteHUDSectionItem"><span>RAAN:</span><span>{detailedSatellite.raan}</span></div>
                    <div className="dinosatSatelliteHUDSectionItem"><span>Arg of Perigee:</span><span>{detailedSatellite.argOfPerigee}</span></div>
                    <div className="dinosatSatelliteHUDSectionItem"><span>Mean Anomaly:</span><span>{detailedSatellite.meanAnomaly}</span></div>
                    <div className="dinosatSatelliteHUDSectionItem"><span>Mean Semi-Major Axis:</span><span>{detailedSatellite.semiMajorAxis} km</span></div>
                    <div className="dinosatSatelliteHUDSectionItem"><span>Velocity:</span><span>{detailedSatellite.velocity} km/s</span></div>
                    <div className="dinosatSatelliteHUDSectionItem"><span>Mean Motion:</span><span>{detailedSatellite.meanMotion} rev/day</span></div>
                  </div>
                </div>
                <div className="dinosatSatelliteHUDSection">
                  <h4>Sensor Coverage</h4>
                  <div className="dinosatSatelliteHUDSectionGrid">
                    <div className="dinosatSatelliteHUDSectionItem"><span>Horizon Distance:</span><span>{Math.round(Math.sqrt(Math.pow(6371 + detailedSatellite.altitude, 2) - Math.pow(6371, 2)))} km</span></div>
                    <div className="dinosatSatelliteHUDSectionItem"><span>Footprint Radius:</span><span>{Math.round(6371 * Math.acos(6371 / (6371 + detailedSatellite.altitude)) * 180 / Math.PI * 111)} km</span></div>
                    <div className="dinosatSatelliteHUDSectionItem"><span>Coverage Area:</span><span>{(Math.PI * Math.pow(6371 * Math.acos(6371 / (6371 + detailedSatellite.altitude)), 2) / 1000000).toFixed(2)} M km2</span></div>
                    <div className="dinosatSatelliteHUDSectionItem"><span>Earth Coverage:</span><span>{((1 - Math.cos(Math.acos(6371 / (6371 + detailedSatellite.altitude)))) / 2 * 100).toFixed(2)}%</span></div>
                  </div>
                </div>
                {detailedSatellite.hasTLE && (
                  <div className="dinosatSatelliteHUDSection">
                    <h4>Performance Data</h4>
                    <div className="dinosatSatelliteHUDSectionGrid">
                      <div className="dinosatSatelliteHUDSectionItem"><span>Rendering Method:</span><span style={{ color: "#00ff00" }}>Instanced</span></div>
                      <div className="dinosatSatelliteHUDSectionItem"><span>Position Source:</span><span style={{ color: "#00ff00" }}>SGP4/SDP4</span></div>
                      <div className="dinosatSatelliteHUDSectionItem"><span>Visibility:</span><span style={{ color: visibleSatellitesRef.current.has(detailedSatellite.id) ? "#00ff00" : "#ff4400" }}>{visibleSatellitesRef.current.has(detailedSatellite.id) ? "Visible" : "Culled"}</span></div>
                      <div className="dinosatSatelliteHUDSectionItem"><span>Coordinate Frame:</span><span>ECI J2000.0</span></div>
                      <div className="dinosatSatelliteHUDSectionItem"><span>Eclipse Status:</span><span style={{ color: satelliteDataRef.current.get(detailedSatellite.id)?.inShadow ? "#ff8800" : "#00ff00" }}>{satelliteDataRef.current.get(detailedSatellite.id)?.inShadow ? "In Shadow" : "Sunlit"}</span></div>
                      <div className="dinosatSatelliteHUDSectionItem"><span>Illumination:</span><span>{Math.round((satelliteDataRef.current.get(detailedSatellite.id)?.shadowFactor || 1.0) * 100)}%</span></div>
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