import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as THREE from "three";
import * as TWEEN from "three/examples/jsm/libs/tween.module.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faInfoCircle, faTimes, faRedo, 
  faSquareXmark, faSquareCheck, faClone,
  faChartLine, faChevronDown, faChevronUp, faMeteor
} from "@fortawesome/free-solid-svg-icons";
import DinoLabsNav from "../../../helpers/Nav.jsx";
import "../../../styles/helperStyles/Switch.css";
import "../../../styles/mainStyles/DinoSat/DinoSatCatalogs/Asteroids/AsteroidCatalog.css";

export default function AsteroidCatalog() {
  const ASTEROID_TYPE_COLORS = {
    "C-type": "#4a4a4a",
    "S-type": "#CD853F",
    "M-type": "#A9A9A9",
    "V-type": "#8B0000",
    "E-type": "#F5F5DC",
    "P-type": "#800000",
    "D-type": "#654321",
    "A-type": "#FFD700",
    "Q-type": "#DEB887",
    "R-type": "#DC143C",
    "B-type": "#1a1a2e",
    "F-type": "#2d2d44",
    "G-type": "#3d3d5c",
    "K-type": "#8B4513",
    "L-type": "#A0522D",
    "T-type": "#696969",
    "X-type": "#708090",
    "Unknown": "#888888"
  };

  const ORBIT_CLASS_COLORS = {
    "NEA": "#FF6B6B",
    "Aten": "#FF4500",
    "Apollo": "#FFD700",
    "Amor": "#4ECDC4",
    "Atira": "#FF1493",
    "MBA": "#45B7D1",
    "IMB": "#96CEB4",
    "OMB": "#FFEAA7",
    "MMB": "#87CEEB",
    "Trojan": "#DDA0DD",
    "Jupiter Trojan": "#DDA0DD",
    "Hilda": "#9370DB",
    "Centaur": "#98D8C8",
    "TNO": "#F7DC6F",
    "KBO": "#E6E6FA",
    "SDO": "#DEB887",
    "Comet": "#00CED1",
    "Unknown": "#888888"
  };

  const ECCENTRICITY_RANGES = [
    { label: "Circular (0-0.1)", min: 0, max: 0.1 },
    { label: "Low (0.1-0.3)", min: 0.1, max: 0.3 },
    { label: "Moderate (0.3-0.5)", min: 0.3, max: 0.5 },
    { label: "High (0.5-0.7)", min: 0.5, max: 0.7 },
    { label: "Very High (0.7+)", min: 0.7, max: 1.0 }
  ];

  const DIAMETER_RANGES = [
    { label: "Small (0-0.1 km)", min: 0, max: 0.1 },
    { label: "Medium (0.1-1 km)", min: 0.1, max: 1 },
    { label: "Large (1-10 km)", min: 1, max: 10 },
    { label: "Very Large (10-100 km)", min: 10, max: 100 },
    { label: "Giant (100+ km)", min: 100, max: 10000 }
  ];

  const PERIOD_RANGES = [
    { label: "Short (0-2 yr)", min: 0, max: 2 },
    { label: "Medium (2-5 yr)", min: 2, max: 5 },
    { label: "Long (5-12 yr)", min: 5, max: 12 },
    { label: "Very Long (12+ yr)", min: 12, max: 1000 }
  ];

  const SORT_OPTIONS = [
    { label: "Distance (Near to Far)", value: "distance_asc" },
    { label: "Distance (Far to Near)", value: "distance_desc" },
    { label: "Name (A-Z)", value: "name_asc" },
    { label: "Name (Z-A)", value: "name_desc" },
    { label: "Discovery Year (Recent)", value: "year_desc" },
    { label: "Discovery Year (Oldest)", value: "year_asc" },
    { label: "Diameter (Large to Small)", value: "diameter_desc" },
    { label: "Diameter (Small to Large)", value: "diameter_asc" },
    { label: "Asteroid Type", value: "type" },
    { label: "Orbit Class", value: "class" }
  ];

  const FPS_OPTIONS = [30, 60, 120, 144];

  const PERFORMANCE_CONSTANTS = {
    MAX_VISIBLE_ASTEROIDS: 5000,
    UPDATE_FREQUENCY: 1,
    FRUSTUM_MARGIN: 1.2,
    PRESELECT_COUNT: 100,
    VIRTUAL_SCROLL_ITEM_HEIGHT: 50,
    VIRTUAL_SCROLL_BUFFER: 10,
    ASTEROID_SIZE_MULTIPLIER: 2.0,
    SCALE_FACTOR: 30.0
  };

  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);
  const [showErrors, setShowErrors] = useState(false);
  const [copiedErrors, setCopiedErrors] = useState(false);
  const [loadingMetadata, setLoadingMetadata] = useState(null);
  const [asteroids, setAsteroids] = useState([]);
  const [filteredAsteroids, setFilteredAsteroids] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [classFilter, setClassFilter] = useState("All");
  const [eccentricityFilter, setEccentricityFilter] = useState("All");
  const [diameterFilter, setDiameterFilter] = useState("All");
  const [periodFilter, setPeriodFilter] = useState("All");
  const [sortOption, setSortOption] = useState("distance_asc");
  const [targetFps, setTargetFps] = useState(60);
  const [actualFps, setActualFps] = useState(60);
  const [showLabels, setShowLabels] = useState(true);
  const [showEclipticGrid, setShowEclipticGrid] = useState(true);
  const [showOrbitalPlane, setShowOrbitalPlane] = useState(true);
  const [showDistanceRings, setShowDistanceRings] = useState(true);
  const [showAxisMarkers, setShowAxisMarkers] = useState(true);
  const [showPlanetOrbits, setShowPlanetOrbits] = useState(true);
  const [showAsteroidBelt, setShowAsteroidBelt] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [legendCollapsed, setLegendCollapsed] = useState(false);
  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  const [hudVisible, setHudVisible] = useState(false);
  const [detailedAsteroid, setDetailedAsteroid] = useState(null);
  const [selectedAsteroid, setSelectedAsteroid] = useState(null);
  const [theme, setTheme] = useState("dark");
  const [sceneInitialized, setSceneInitialized] = useState(false);
  const [performanceStats, setPerformanceStats] = useState({
    renderTime: 0,
    memoryUsage: 0,
    triangles: 0,
    drawCalls: 0,
    points: 0,
    textures: 0,
    geometries: 0,
    visibleAsteroids: 0,
    culledAsteroids: 0
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
  const labelRendererRef = useRef(null);
  const cameraRef = useRef(null);
  const asteroidGroupRef = useRef(null);
  const frameCountRef = useRef(0);
  const lastFpsTime = useRef(0);
  const actualFpsRef = useRef(60);
  const eclipticGridRef = useRef(null);
  const orbitalPlaneRef = useRef(null);
  const distanceRingsRef = useRef(null);
  const axisMarkersRef = useRef(null);
  const planetOrbitsRef = useRef(null);
  const asteroidBeltRef = useRef(null);
  const hudPanelRef = useRef(null);
  const legendPanelRef = useRef(null);
  const controlsPanelRef = useRef(null);
  const detailedPanelRef = useRef(null);
  const controlsRef = useRef(null);
  const backgroundStarsRef = useRef(null);
  const virtualScrollRef = useRef(null);
  const asteroidInstanceRef = useRef(null);
  const asteroidDataRef = useRef(new Map());
  const labelsRef = useRef({});
  const visibleAsteroidsRef = useRef(new Set());
  const frustumRef = useRef(new THREE.Frustum());
  const tempMatrix = useRef(new THREE.Matrix4());
  const tempQuaternion = useRef(new THREE.Quaternion());
  const tempColor = useRef(new THREE.Color());

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
  }

  const spatialGrid = useMemo(() => new SpatialGrid(100), []);

  const calculateAsteroidPosition = useCallback((asteroid) => {
    let x = asteroid.heliocentricX;
    let y = asteroid.heliocentricY;
    let z = asteroid.heliocentricZ;

    const hasValidPosition = x !== null && x !== undefined && y !== null && y !== undefined && z !== null && z !== undefined && !(x === 0 && y === 0 && z === 0);

    if (!hasValidPosition) {
      const a = asteroid.semiMajorAxis || 2.5;
      const e = asteroid.eccentricity || 0.1;
      const iDeg = asteroid.inclination || 0;
      const omDeg = asteroid.longAscNode || 0;
      const wDeg = asteroid.argPerihelion || 0;
      const mDeg = asteroid.meanAnomaly || asteroid.currentMeanAnomaly || 0;
      
      const i = iDeg * Math.PI / 180;
      const om = omDeg * Math.PI / 180;
      const w = wDeg * Math.PI / 180;
      const M = mDeg * Math.PI / 180;
      
      let E = M;
      for (let iter = 0; iter < 50; iter++) {
        const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
        E = E - dE;
        if (Math.abs(dE) < 1e-8) break;
      }
      
      const cosE = Math.cos(E);
      const sinE = Math.sin(E);
      const nu = Math.atan2(Math.sqrt(1 - e * e) * sinE, cosE - e);
      const r = a * (1 - e * cosE);
      
      const xOrb = r * Math.cos(nu);
      const yOrb = r * Math.sin(nu);
      
      const cosOm = Math.cos(om);
      const sinOm = Math.sin(om);
      const cosW = Math.cos(w);
      const sinW = Math.sin(w);
      const cosI = Math.cos(i);
      const sinI = Math.sin(i);
      
      x = (cosOm * cosW - sinOm * sinW * cosI) * xOrb + (-cosOm * sinW - sinOm * cosW * cosI) * yOrb;
      y = (sinOm * cosW + cosOm * sinW * cosI) * xOrb + (-sinOm * sinW + cosOm * cosW * cosI) * yOrb;
      z = (sinW * sinI) * xOrb + (cosW * sinI) * yOrb;
    }

    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
      return null;
    }

    return { x, y, z };
  }, []);

  const processAsteroidPositions = useCallback((rawAsteroids) => {
    return rawAsteroids.map((asteroid, index) => {
      const pos = calculateAsteroidPosition(asteroid);
      return {
        ...asteroid,
        computedX: pos ? pos.x : null,
        computedY: pos ? pos.y : null,
        computedZ: pos ? pos.z : null,
        color: ASTEROID_TYPE_COLORS[asteroid.asteroidType] || "#888888",
        classColor: ORBIT_CLASS_COLORS[asteroid.orbitClass] || "#888888",
        active: index < PERFORMANCE_CONSTANTS.PRESELECT_COUNT
      };
    });
  }, [calculateAsteroidPosition]);

  const calculateScaledPosition = (x, y, z) => {
    const scale = PERFORMANCE_CONSTANTS.SCALE_FACTOR;
    return new THREE.Vector3(
      x * scale,
      z * scale,
      -y * scale
    );
  };

  const getAsteroidSize = (absoluteMag, diameter) => {
    if (diameter && diameter > 0) {
      const baseSize = 0.8;
      const scaleFactor = 0.4;
      const sizeFactor = Math.log10(diameter + 1) + 1;
      return Math.max(0.15, Math.min(6.0, baseSize * sizeFactor * scaleFactor)) * PERFORMANCE_CONSTANTS.ASTEROID_SIZE_MULTIPLIER;
    }
    if (absoluteMag && !isNaN(absoluteMag)) {
      const baseSize = 1.2;
      const magFactor = Math.max(0.2, (25 - absoluteMag) / 15);
      return Math.max(0.15, Math.min(5.0, baseSize * magFactor)) * PERFORMANCE_CONSTANTS.ASTEROID_SIZE_MULTIPLIER;
    }
    return 0.8 * PERFORMANCE_CONSTANTS.ASTEROID_SIZE_MULTIPLIER;
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
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      sizeAttenuation: false
    });
    const sprite = new THREE.Sprite(material);
    const aspect = canvasWidth / canvasHeight;
    sprite.scale.set(0.035 * aspect, 0.035, 1);
    return sprite;
  };

  const createOrbitalPlane = () => {
    const group = new THREE.Group();
    group.name = "OrbitalPlane";
    return group;
  };

  const createAxisMarkers = () => {
    const group = new THREE.Group();
    group.name = "AxisMarkers";
    const scale = PERFORMANCE_CONSTANTS.SCALE_FACTOR;
    const length = 6 * scale;
    const axisRadius = 2.0;

    const xGeometry = new THREE.CylinderGeometry(axisRadius, axisRadius, length, 8);
    const xMaterial = new THREE.MeshBasicMaterial({ color: 0x7a5555, transparent: true, opacity: 0.8 });
    const xAxis = new THREE.Mesh(xGeometry, xMaterial);
    xAxis.rotation.z = -Math.PI / 2;
    xAxis.position.set(length / 2, 0, 0);
    group.add(xAxis);

    const yGeometry = new THREE.CylinderGeometry(axisRadius, axisRadius, length * 0.25, 8);
    const yMaterial = new THREE.MeshBasicMaterial({ color: 0x557a55, transparent: true, opacity: 0.8 });
    const yAxis = new THREE.Mesh(yGeometry, yMaterial);
    yAxis.position.set(0, (length * 0.25) / 2, 0);
    group.add(yAxis);

    const zGeometry = new THREE.CylinderGeometry(axisRadius, axisRadius, length, 8);
    const zMaterial = new THREE.MeshBasicMaterial({ color: 0x55557a, transparent: true, opacity: 0.8 });
    const zAxis = new THREE.Mesh(zGeometry, zMaterial);
    zAxis.rotation.x = Math.PI / 2;
    zAxis.position.set(0, 0, length / 2);
    group.add(zAxis);

    const xLabel = createTextSprite("Vernal Eq.", 0x8a6a6a);
    xLabel.position.set(length + 8, 3, 0);
    group.add(xLabel);

    const yLabel = createTextSprite("+Z Ecliptic", 0x6a8a6a);
    yLabel.position.set(0, (length * 0.25) + 8, 0);
    group.add(yLabel);

    const zLabel = createTextSprite("+90° Long", 0x6a6a8a);
    zLabel.position.set(0, 3, length + 8);
    group.add(zLabel);

    const sunGeometry = new THREE.SphereGeometry(3, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffdd44, transparent: true, opacity: 0.95 });
    const sunMarker = new THREE.Mesh(sunGeometry, sunMaterial);
    sunMarker.position.set(0, 0, 0);
    group.add(sunMarker);

    const sunGlowGeometry = new THREE.SphereGeometry(5, 16, 16);
    const sunGlowMaterial = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.3 });
    const sunGlow = new THREE.Mesh(sunGlowGeometry, sunGlowMaterial);
    sunGlow.position.set(0, 0, 0);
    group.add(sunGlow);

    const sunSprite = createTextSprite("Sun", 0xffdd44);
    sunSprite.position.set(0, -8, 0);
    group.add(sunSprite);

    return group;
  };

  const createPlanetOrbits = () => {
    const group = new THREE.Group();
    group.name = "PlanetOrbits";
    const scale = PERFORMANCE_CONSTANTS.SCALE_FACTOR;

    const planets = [
      { name: "Mercury", a: 0.387, e: 0.206, color: 0x8c8c8c, labelAngle: 45 },
      { name: "Venus", a: 0.723, e: 0.007, color: 0xe6c87a, labelAngle: 70 },
      { name: "Earth", a: 1.0, e: 0.017, color: 0x4a8aff, labelAngle: 95 },
      { name: "Mars", a: 1.524, e: 0.093, color: 0xc46a4a, labelAngle: 120 },
      { name: "Jupiter", a: 5.203, e: 0.048, color: 0xd4a574, labelAngle: 145 },
      { name: "Saturn", a: 9.537, e: 0.054, color: 0xead6b8, labelAngle: 170 },
      { name: "Uranus", a: 19.191, e: 0.047, color: 0x7ec8e3, labelAngle: 195 },
      { name: "Neptune", a: 30.069, e: 0.009, color: 0x4169e1, labelAngle: 220 }
    ];

    planets.forEach(planet => {
      const points = [];
      const segments = 128;
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const r = (planet.a * (1 - planet.e * planet.e)) / (1 + planet.e * Math.cos(theta));
        const x = r * Math.cos(theta) * scale;
        const z = r * Math.sin(theta) * scale;
        points.push(new THREE.Vector3(x, 0, z));
      }
      const orbitCurve = new THREE.CatmullRomCurve3(points, true);
      const tubeGeometry = new THREE.TubeGeometry(orbitCurve, 128, 1.0, 6, true);
      const tubeMaterial = new THREE.MeshBasicMaterial({
        color: planet.color,
        transparent: true,
        opacity: 0.4
      });
      const orbit = new THREE.Mesh(tubeGeometry, tubeMaterial);
      group.add(orbit);

      const labelAngleRad = planet.labelAngle * Math.PI / 180;
      const labelRadius = planet.a * scale;
      const labelPos = new THREE.Vector3(
        labelRadius * Math.cos(labelAngleRad),
        2,
        labelRadius * Math.sin(labelAngleRad)
      );
      const sprite = createTextSprite(planet.name, planet.color);
      sprite.position.copy(labelPos);
      group.add(sprite);
    });

    return group;
  };

  const createAsteroidBelt = () => {
    const group = new THREE.Group();
    group.name = "AsteroidBelt";
    const scale = PERFORMANCE_CONSTANTS.SCALE_FACTOR;
    const innerRadius = 2.1 * scale;
    const outerRadius = 3.3 * scale;

    const innerRing = [];
    const outerRing = [];
    for (let i = 0; i <= 64; i++) {
      const theta = (i / 64) * Math.PI * 2;
      innerRing.push(new THREE.Vector3(innerRadius * Math.cos(theta), 0, innerRadius * Math.sin(theta)));
      outerRing.push(new THREE.Vector3(outerRadius * Math.cos(theta), 0, outerRadius * Math.sin(theta)));
    }

    const innerTube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(innerRing, true), 64, 0.2, 6, true);
    const outerTube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(outerRing, true), 64, 0.2, 6, true);
    const beltMaterial = new THREE.MeshBasicMaterial({ color: 0x6a5a4a, transparent: true, opacity: 0.35 });

    group.add(new THREE.Mesh(innerTube, beltMaterial));
    group.add(new THREE.Mesh(outerTube, beltMaterial));

    const beltGeometry = new THREE.RingGeometry(innerRadius, outerRadius, 64);
    const beltFillMaterial = new THREE.MeshBasicMaterial({
      color: 0x5a4a3a,
      transparent: true,
      opacity: 0.05,
      side: THREE.DoubleSide
    });
    const beltFill = new THREE.Mesh(beltGeometry, beltFillMaterial);
    beltFill.rotation.x = -Math.PI / 2;
    group.add(beltFill);

    return group;
  };

  const createLabel = useCallback((text, color = "#ffffff") => {
    const div = document.createElement("div");
    div.className = "asteroid-body-label";
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

  const updateSpatialGrid = useCallback(() => {
    spatialGrid.clear();
    asteroids.forEach((asteroid, index) => {
      if (asteroid.active) {
        const data = asteroidDataRef.current.get(asteroid.id);
        if (data && data.position) {
          spatialGrid.add({ asteroid, index }, data.position);
        }
      }
    });
  }, [asteroids, spatialGrid]);

  const performFrustumCulling = useCallback(() => {
    if (!cameraRef.current) return;
    const camera = cameraRef.current;
    const matrix = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustumRef.current.setFromProjectionMatrix(matrix);
    let culledCount = 0;

    asteroids.forEach((asteroid) => {
      if (!asteroid.active) return;
      const data = asteroidDataRef.current.get(asteroid.id);
      if (!data || !data.position) {
        culledCount++;
        return;
      }
      const distance = data.position.distanceTo(camera.position);
      if (distance >= 8000) {
        culledCount++;
      }
    });

    setPerformanceStats(prev => ({
      ...prev,
      culledAsteroids: culledCount
    }));
  }, [asteroids]);

  const updateInstancedMeshes = useCallback(() => {
    if (!asteroidInstanceRef.current) return;
    let instanceIndex = 0;

    asteroids.forEach((asteroid) => {
      if (!asteroid.active || instanceIndex >= PERFORMANCE_CONSTANTS.MAX_VISIBLE_ASTEROIDS) return;

      const x = asteroid.computedX;
      const y = asteroid.computedY;
      const z = asteroid.computedZ;

      if (x === null || x === undefined || y === null || y === undefined || z === null || z === undefined) return;

      const position = calculateScaledPosition(x, y, z);

      asteroidDataRef.current.set(asteroid.id, {
        position: position.clone(),
        lastUpdate: Date.now(),
        instanceIndex
      });

      const asteroidSize = getAsteroidSize(asteroid.absoluteMagnitude, asteroid.diameter);
      const scale = new THREE.Vector3(asteroidSize, asteroidSize, asteroidSize);
      tempMatrix.current.compose(position, tempQuaternion.current, scale);
      asteroidInstanceRef.current.setMatrixAt(instanceIndex, tempMatrix.current);
      tempColor.current.setHex(asteroid.color.replace("#", "0x"));
      asteroidInstanceRef.current.setColorAt(instanceIndex, tempColor.current);
      instanceIndex++;
    });

    if (instanceIndex > 0) {
      asteroidInstanceRef.current.instanceMatrix.needsUpdate = true;
      if (asteroidInstanceRef.current.instanceColor) {
        asteroidInstanceRef.current.instanceColor.needsUpdate = true;
      }
    }
    asteroidInstanceRef.current.count = instanceIndex;
    
    setPerformanceStats(prev => ({
      ...prev,
      visibleAsteroids: instanceIndex
    }));
  }, [asteroids]);

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
    const tempVec = new THREE.Vector3();

    Object.keys(labelsRef.current).forEach(asteroidId => {
      const label = labelsRef.current[asteroidId];
      if (!label || !label.element) return;
      const data = asteroidDataRef.current.get(asteroidId);
      if (!data || !data.position) {
        label.element.style.display = "none";
        return;
      }
      tempVec.copy(data.position);
      tempVec.project(camera);
      const behind = tempVec.z > 1;
      if (!behind) {
        const x = (tempVec.x * 0.5 + 0.5) * width;
        const y = (tempVec.y * -0.5 + 0.5) * height;
        if (x >= -50 && x <= width + 50 && y >= -50 && y <= height + 50) {
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

  const fetchAsteroidData = async () => {
    const startTime = performance.now();
    try {
      const response = await fetch(`${import.meta.env.VITE_API_AUTH_URL}/asteroid-catalog`, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`Backend API returned ${response.status}: ${response.statusText}.`);
      }

      const result = await response.json();

      return {
        asteroids: result.asteroids,
        errors: result.errors || [],
        metadata: {
          ...result.metadata,
          loadTime: performance.now() - startTime
        }
      };
    } catch (error) {
      return {
        asteroids: [],
        errors: [`Backend connection failed: ${error.message}. No real asteroid data available.`],
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

  const copyAllErrors = useCallback(async () => {
    try {
      const errorText = errors.join("\n");
      await navigator.clipboard.writeText(errorText);
      setCopiedErrors(true);
      setTimeout(() => setCopiedErrors(false), 2000);
    } catch (error) {}
  }, [errors]);

  const handleHudMouseDown = useCallback((e) => {
    if (e.target.closest(".asteroid-close-btn")) return;
    e.preventDefault();
    setIsDraggingHud(true);
    setDragStart({ x: e.clientX - hudPosition.x, y: e.clientY - hudPosition.y });
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

  const handleHudMouseUp = useCallback(() => setIsDraggingHud(false), []);

  const handleLegendMouseDown = useCallback((e) => {
    if (e.target.closest(".asteroid-collapse-icon")) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingLegend(true);
    setLegendDragStart({ x: e.clientX - legendPosition.x, y: e.clientY - legendPosition.y });
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

  const handleLegendMouseUp = useCallback(() => setIsDraggingLegend(false), []);

  const handleControlsMouseDown = useCallback((e) => {
    if (e.target.closest(".asteroid-collapse-icon") || e.target.closest(".dinoSatAsteroidControlButton")) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingControls(true);
    setControlsDragStart({ x: e.clientX - controlsPosition.x, y: e.clientY - controlsPosition.y });
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

  const handleControlsMouseUp = useCallback(() => setIsDraggingControls(false), []);

  const handleDetailedMouseDown = useCallback((e) => {
    if (e.target.closest(".asteroid-close-btn")) return;
    e.preventDefault();
    setIsDraggingDetailed(true);
    setDetailedDragStart({ x: e.clientX - detailedPosition.x, y: e.clientY - detailedPosition.y });
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

  const handleDetailedMouseUp = useCallback(() => setIsDraggingDetailed(false), []);

  const handleLegendToggle = useCallback((e) => {
    if (isDraggingLegend) { e.preventDefault(); e.stopPropagation(); return; }
    toggleLegend();
  }, [isDraggingLegend]);

  const handleControlsToggle = useCallback((e) => {
    if (isDraggingControls) { e.preventDefault(); e.stopPropagation(); return; }
    toggleControls();
  }, [isDraggingControls]);

  const handleVirtualScroll = useCallback((e) => setVirtualScrollOffset(e.target.scrollTop), []);

  const getVirtualScrollItems = useMemo(() => {
    if (!virtualScrollRef.current) return { visibleItems: [], startIndex: 0, endIndex: 0 };
    const containerHeight = virtualScrollRef.current.clientHeight || 400;
    const itemHeight = PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT;
    const buffer = PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_BUFFER;
    const startIndex = Math.max(0, Math.floor(virtualScrollOffset / itemHeight) - buffer);
    const endIndex = Math.min(filteredAsteroids.length - 1, Math.ceil((virtualScrollOffset + containerHeight) / itemHeight) + buffer);
    const visibleItems = filteredAsteroids.slice(startIndex, endIndex + 1);
    return { visibleItems, startIndex, endIndex };
  }, [filteredAsteroids, virtualScrollOffset]);

  const exportJSON = useCallback(() => {
    const detailedAsteroids = asteroids.map(asteroid => {
      const data = asteroidDataRef.current.get(asteroid.id);
      const position = data ? data.position : { x: 0, y: 0, z: 0 };
      return {
        ...asteroid,
        renderedPosition: { 
          x: position.x?.toFixed(2), 
          y: position.y?.toFixed(2), 
          z: position.z?.toFixed(2) 
        },
        heliocentricPosition: {
          x: asteroid.computedX,
          y: asteroid.computedY,
          z: asteroid.computedZ
        },
        visible: asteroid.active
      };
    });
    const exportData = {
      asteroids: detailedAsteroids,
      hudReadouts: { activeAsteroids: asteroids.filter(a => a.active).length, actualFps, performanceStats },
      loadingMetadata,
      apiErrors: errors,
      catalogStats: { totalAsteroids: asteroids.length, visibleAsteroids: asteroids.filter(a => a.active).length }
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "asteroid_catalog_data.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [asteroids, actualFps, performanceStats, loadingMetadata, errors]);

  const exportCSV = useCallback(() => {
    const headers = ["ID", "Name", "Designation", "ComputedX_AU", "ComputedY_AU", "ComputedZ_AU", "HelioDistance_AU", "Eccentricity", "SemiMajorAxis_AU", "Perihelion_AU", "Aphelion_AU", "Inclination_deg", "LongAscNode_deg", "ArgPerihelion_deg", "MeanAnomaly_deg", "TrueAnomaly_deg", "OrbitalPeriod_yr", "MeanMotion_deg_day", "AbsoluteMagnitude", "Diameter_km", "Albedo", "RotationPeriod_hr", "SpectralType", "OrbitClass", "IsNEO", "IsPHA", "MOID_AU", "TisserandParameter", "DiscoveryYear", "ObservationCount", "DataArc_days", "Source"];
    let csv = headers.join(",") + "\n";
    asteroids.forEach(ast => {
      const row = [
        ast.id, `"${ast.name}"`, `"${ast.designation || ""}"`,
        ast.computedX || "", ast.computedY || "", ast.computedZ || "", ast.heliocentricDistance || "",
        ast.eccentricity || "", ast.semiMajorAxis || "", ast.perihelion || "", ast.aphelion || "",
        ast.inclination || "", ast.longAscNode || "", ast.argPerihelion || "", ast.meanAnomaly || "", ast.trueAnomaly || "",
        ast.orbitalPeriod || "", ast.meanMotion || "", ast.absoluteMagnitude || "", ast.diameter || "", ast.albedo || "",
        ast.rotationPeriod || "", `"${ast.asteroidType}"`, `"${ast.orbitClass}"`, ast.isNEO, ast.isPHA,
        ast.moid || "", ast.tisserandParameter || "", ast.discoveryYear || "", ast.observationCount || "",
        ast.dataArcDays || "", `"${ast.source || ""}"`
      ];
      csv += row.join(",") + "\n";
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "asteroid_catalog_data.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [asteroids]);

  const fetchCatalogData = useCallback(async () => {
    setLoading(true);
    setErrors([]);
    const { asteroids: rawAsteroids, errors, metadata } = await fetchAsteroidData();
    const processedAsteroids = processAsteroidPositions(rawAsteroids);
    setAsteroids(processedAsteroids);
    setErrors(errors);
    setLoadingMetadata(metadata);
    setLoading(false);
  }, [processAsteroidPositions]);

  const toggleAsteroid = useCallback((id) => {
    setAsteroids(prev => prev.map(asteroid => asteroid.id === id ? { ...asteroid, active: !asteroid.active } : asteroid));
  }, []);

  const selectAllAsteroids = useCallback(() => setAsteroids(prev => prev.map(asteroid => ({ ...asteroid, active: true }))), []);
  const deselectAllAsteroids = useCallback(() => setAsteroids(prev => prev.map(asteroid => ({ ...asteroid, active: false }))), []);

  const clearFilters = useCallback(() => {
    setTypeFilter("All");
    setClassFilter("All");
    setEccentricityFilter("All");
    setDiameterFilter("All");
    setPeriodFilter("All");
    setSearchTerm("");
  }, []);

  const toggleLabels = useCallback(() => setShowLabels(!showLabels), [showLabels]);
  const toggleAxisMarkers = useCallback(() => setShowAxisMarkers(!showAxisMarkers), [showAxisMarkers]);
  const togglePlanetOrbits = useCallback(() => setShowPlanetOrbits(!showPlanetOrbits), [showPlanetOrbits]);
  const toggleAsteroidBelt = useCallback(() => setShowAsteroidBelt(!showAsteroidBelt), [showAsteroidBelt]);
  const toggleSidebar = useCallback(() => setSidebarCollapsed(!sidebarCollapsed), [sidebarCollapsed]);
  const toggleLegend = useCallback(() => setLegendCollapsed(!legendCollapsed), [legendCollapsed]);
  const toggleControls = useCallback(() => setControlsCollapsed(!controlsCollapsed), [controlsCollapsed]);

  const toggleHUD = useCallback(() => {
    setHudVisible(!hudVisible);
    if (!hudVisible) setHudPosition({ x: 0, y: 0 });
  }, [hudVisible]);

  const resetCamera = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.position.set(200, 150, 200);
      cameraRef.current.lookAt(0, 0, 0);
    }
  }, []);

  const zoomToAsteroid = useCallback((id) => {
    const data = asteroidDataRef.current.get(id);
    if (!data || !data.position || !cameraRef.current || !controlsRef.current) return;
    const targetPosition = data.position.clone();
    const currentTarget = controlsRef.current.target.clone();
    const currentCameraPos = cameraRef.current.position.clone();
    const direction = currentCameraPos.clone().sub(currentTarget).normalize();
    const currentDistance = currentCameraPos.distanceTo(currentTarget);
    const desiredCameraPos = targetPosition.clone().add(direction.multiplyScalar(Math.min(currentDistance, 50)));

    new TWEEN.Tween(currentCameraPos)
      .to(desiredCameraPos, 1000)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate(() => cameraRef.current.position.copy(currentCameraPos))
      .start();

    new TWEEN.Tween(currentTarget)
      .to(targetPosition, 1000)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate(() => { controlsRef.current.target.copy(currentTarget); controlsRef.current.update(); })
      .start();
  }, []);

  useEffect(() => {
    document.body.className = `asteroid-theme-${theme}`;
    return () => { document.body.className = ""; };
  }, [theme]);

  useEffect(() => {
    let filtered = asteroids.filter(asteroid => {
      const matchesSearch = asteroid.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (asteroid.fullName && asteroid.fullName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (asteroid.designation && asteroid.designation.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesType = typeFilter === "All" || asteroid.asteroidType === typeFilter;
      const matchesClass = classFilter === "All" || asteroid.orbitClass === classFilter;
      let matchesEccentricity = true;
      if (eccentricityFilter !== "All") {
        const range = ECCENTRICITY_RANGES.find(r => r.label === eccentricityFilter);
        if (range && asteroid.eccentricity !== undefined) {
          matchesEccentricity = asteroid.eccentricity >= range.min && asteroid.eccentricity < range.max;
        }
      }
      let matchesDiameter = true;
      if (diameterFilter !== "All") {
        const range = DIAMETER_RANGES.find(r => r.label === diameterFilter);
        if (range && asteroid.diameter) {
          matchesDiameter = asteroid.diameter >= range.min && asteroid.diameter < range.max;
        }
      }
      let matchesPeriod = true;
      if (periodFilter !== "All") {
        const range = PERIOD_RANGES.find(r => r.label === periodFilter);
        if (range && asteroid.orbitalPeriod) {
          matchesPeriod = asteroid.orbitalPeriod >= range.min && asteroid.orbitalPeriod < range.max;
        }
      }
      return matchesSearch && matchesType && matchesClass && matchesEccentricity && matchesDiameter && matchesPeriod;
    });

    filtered.sort((a, b) => {
      switch (sortOption) {
        case "name_asc": return a.name.localeCompare(b.name);
        case "name_desc": return b.name.localeCompare(a.name);
        case "year_desc": return (b.discoveryYear || 0) - (a.discoveryYear || 0);
        case "year_asc": return (a.discoveryYear || 0) - (b.discoveryYear || 0);
        case "diameter_desc": return (b.diameter || 0) - (a.diameter || 0);
        case "diameter_asc": return (a.diameter || 0) - (b.diameter || 0);
        case "distance_asc": return (a.heliocentricDistance || 999) - (b.heliocentricDistance || 999);
        case "distance_desc": return (b.heliocentricDistance || 0) - (a.heliocentricDistance || 0);
        case "type": return a.asteroidType.localeCompare(b.asteroidType);
        case "class": return (a.orbitClass || "").localeCompare(b.orbitClass || "");
        default: return 0;
      }
    });
    setFilteredAsteroids(filtered);
  }, [asteroids, searchTerm, typeFilter, classFilter, eccentricityFilter, diameterFilter, periodFilter, sortOption]);

  useEffect(() => {
    if (!mountRef.current) return;
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000011, 0.00001);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 20000);
    camera.position.set(200, 150, 200);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000005, 1);
    renderer.shadowMap.enabled = false;
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    const labelRenderer = document.createElement("div");
    labelRenderer.style.cssText = `position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 5;`;
    mountRef.current.appendChild(labelRenderer);
    labelRendererRef.current = labelRenderer;

    const ambientLight = new THREE.AmbientLight(0x404080, 0.6);
    scene.add(ambientLight);

    const orbitalPlane = createOrbitalPlane();
    orbitalPlane.visible = showOrbitalPlane;
    scene.add(orbitalPlane);
    orbitalPlaneRef.current = orbitalPlane;

    const axisMarkers = createAxisMarkers();
    axisMarkers.visible = showAxisMarkers;
    scene.add(axisMarkers);
    axisMarkersRef.current = axisMarkers;

    const planetOrbits = createPlanetOrbits();
    planetOrbits.visible = showPlanetOrbits;
    scene.add(planetOrbits);
    planetOrbitsRef.current = planetOrbits;

    const asteroidBelt = createAsteroidBelt();
    asteroidBelt.visible = showAsteroidBelt;
    scene.add(asteroidBelt);
    asteroidBeltRef.current = asteroidBelt;

    const asteroidGroup = new THREE.Group();
    scene.add(asteroidGroup);
    asteroidGroupRef.current = asteroidGroup;

    const asteroidGeometry = new THREE.IcosahedronGeometry(0.5, 0);
    const asteroidMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.95 });
    const asteroidInstance = new THREE.InstancedMesh(asteroidGeometry, asteroidMaterial, PERFORMANCE_CONSTANTS.MAX_VISIBLE_ASTEROIDS);
    asteroidInstance.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    asteroidInstance.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(PERFORMANCE_CONSTANTS.MAX_VISIBLE_ASTEROIDS * 3), 3);
    asteroidGroup.add(asteroidInstance);
    asteroidInstanceRef.current = asteroidInstance;

    const backgroundStarsGeometry = new THREE.BufferGeometry();
    const backgroundStarCount = 25000;
    const backgroundStarPositions = new Float32Array(backgroundStarCount * 3);
    const backgroundStarColors = new Float32Array(backgroundStarCount * 3);
    const backgroundStarSizes = new Float32Array(backgroundStarCount);

    for (let i = 0; i < backgroundStarCount; i++) {
      const i3 = i * 3;
      const radius = 3000 + Math.random() * 7000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      backgroundStarPositions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      backgroundStarPositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      backgroundStarPositions[i3 + 2] = radius * Math.cos(phi);
      const starType = Math.random();
      let baseColor, intensity, size;
      if (starType < 0.6) { baseColor = { r: 0.8, g: 0.9, b: 1.0 }; intensity = 0.6 + Math.random() * 0.4; size = 0.8 + Math.random() * 0.4; }
      else if (starType < 0.8) { baseColor = { r: 1.0, g: 0.7, b: 0.3 }; intensity = 0.7 + Math.random() * 0.3; size = 1.2 + Math.random() * 0.8; }
      else { baseColor = { r: 1.0, g: 0.4, b: 0.1 }; intensity = 0.8 + Math.random() * 0.2; size = 1.5 + Math.random() * 1.0; }
      backgroundStarColors[i3] = baseColor.r * intensity;
      backgroundStarColors[i3 + 1] = baseColor.g * intensity;
      backgroundStarColors[i3 + 2] = baseColor.b * intensity;
      backgroundStarSizes[i] = size;
    }

    backgroundStarsGeometry.setAttribute("position", new THREE.BufferAttribute(backgroundStarPositions, 3));
    backgroundStarsGeometry.setAttribute("color", new THREE.BufferAttribute(backgroundStarColors, 3));
    backgroundStarsGeometry.setAttribute("size", new THREE.BufferAttribute(backgroundStarSizes, 1));

    const backgroundStarsMaterial = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0.0 } },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        uniform float time;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float twinkle = sin(time * 0.8 + position.x * 0.005 + position.y * 0.005) * 0.3 + 0.7;
          gl_PointSize = size * twinkle * (300.0 / -mvPosition.z);
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
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending
    });

    const backgroundStars = new THREE.Points(backgroundStarsGeometry, backgroundStarsMaterial);
    scene.add(backgroundStars);
    backgroundStarsRef.current = backgroundStars;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.enableTouch = true;
    controls.maxDistance = 5000;
    controls.minDistance = 10;
    controlsRef.current = controls;

    const handleResize = () => {
      if (!mountRef.current) return;
      const newWidth = mountRef.current.clientWidth;
      const newHeight = mountRef.current.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener("resize", handleResize);
    renderer.render(scene, camera);
    setSceneInitialized(true);

    return () => {
      if (mountRef.current && renderer.domElement) mountRef.current.removeChild(renderer.domElement);
      if (mountRef.current && labelRendererRef.current) mountRef.current.removeChild(labelRendererRef.current);
      Object.values(labelsRef.current).forEach(label => {
        if (label && label.element && label.element.parentNode) label.element.parentNode.removeChild(label.element);
      });
      window.removeEventListener("resize", handleResize);
      controls.dispose();
      scene.traverse(child => {
        if (child instanceof THREE.Mesh || child instanceof THREE.InstancedMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) { if (Array.isArray(child.material)) child.material.forEach(mat => mat.dispose()); else child.material.dispose(); }
        }
        if (child instanceof THREE.Points) { if (child.geometry) child.geometry.dispose(); if (child.material) child.material.dispose(); }
      });
      renderer.dispose();
    };
  }, []);

  useEffect(() => { if (sceneInitialized) fetchCatalogData(); }, [sceneInitialized, fetchCatalogData]);

  useEffect(() => { if (eclipticGridRef.current) eclipticGridRef.current.visible = showEclipticGrid; }, [showEclipticGrid]);
  useEffect(() => { if (orbitalPlaneRef.current) orbitalPlaneRef.current.visible = showOrbitalPlane; }, [showOrbitalPlane]);
  useEffect(() => { if (distanceRingsRef.current) distanceRingsRef.current.visible = showDistanceRings; }, [showDistanceRings]);
  useEffect(() => { if (axisMarkersRef.current) axisMarkersRef.current.visible = showAxisMarkers; }, [showAxisMarkers]);
  useEffect(() => { if (planetOrbitsRef.current) planetOrbitsRef.current.visible = showPlanetOrbits; }, [showPlanetOrbits]);
  useEffect(() => { if (asteroidBeltRef.current) asteroidBeltRef.current.visible = showAsteroidBelt; }, [showAsteroidBelt]);

  useEffect(() => {
    Object.keys(labelsRef.current).forEach(asteroidId => {
      const label = labelsRef.current[asteroidId];
      if (label && label.element) {
        if (!asteroids.find(a => a.id === asteroidId && a.active)) {
          if (label.element.parentNode) label.element.parentNode.removeChild(label.element);
          delete labelsRef.current[asteroidId];
        }
      }
    });
    asteroids.forEach(asteroid => {
      if (asteroid.active && !labelsRef.current[asteroid.id]) {
        const label = createLabel(asteroid.name, asteroid.color);
        labelsRef.current[asteroid.id] = label;
        if (labelRendererRef.current) labelRendererRef.current.appendChild(label.element);
      }
    });
  }, [asteroids, createLabel]);

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
      return () => { document.removeEventListener("mousemove", handleGlobalMouseMove); document.removeEventListener("mouseup", handleGlobalMouseUp); };
    }
  }, [isDraggingHud, isDraggingLegend, isDraggingControls, isDraggingDetailed, handleHudMouseMove, handleLegendMouseMove, handleControlsMouseMove, handleDetailedMouseMove, handleHudMouseUp, handleLegendMouseUp, handleControlsMouseUp, handleDetailedMouseUp]);

  useEffect(() => {
    if (!sceneRef.current || !rendererRef.current || !cameraRef.current) return;
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
        lastTime = time;
        frameCountRef.current++;
        if (backgroundStarsRef.current && backgroundStarsRef.current.material) backgroundStarsRef.current.material.uniforms.time.value = time * 0.001;
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
              points: rendererRef.current.info.render.points,
              textures: rendererRef.current.info.memory.textures,
              geometries: rendererRef.current.info.memory.geometries
            }));
          }
        }
        if (asteroids.length > 0) {
          if (frameCountRef.current % PERFORMANCE_CONSTANTS.UPDATE_FREQUENCY === 0) {
            updateInstancedMeshes();
            updateSpatialGrid();
          }
          updateLabels();
        }
        controlsRef.current.update();
        TWEEN.update(time);
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate(performance.now());
    return () => { if (animationId) cancelAnimationFrame(animationId); };
  }, [asteroids, showLabels, targetFps, updateLabels, updateInstancedMeshes, updateSpatialGrid]);

  const activeAsteroids = asteroids.filter(a => a.active).length;
  const typeCounts = asteroids.reduce((acc, asteroid) => { if (asteroid.active) acc[asteroid.asteroidType] = (acc[asteroid.asteroidType] || 0) + 1; return acc; }, {});
  const classCounts = asteroids.reduce((acc, asteroid) => { if (asteroid.active) acc[asteroid.orbitClass] = (acc[asteroid.orbitClass] || 0) + 1; return acc; }, {});
  const { visibleItems, startIndex } = getVirtualScrollItems;

  return (
    <div className="dinoSatPageWrapper">
      <DinoLabsNav activePage={"sat"}/>
      <div className={`dinoSatAsteroidCatalogContainer asteroid-theme-${theme}`}>
        <div className={`dinoSatAsteroidSideBar ${sidebarCollapsed ? "dinoSatAsteroidSideBarCollapsed" : ""}`}>
          {loading && (
            <div className="dinoSatAsteroidSideBarLoadingContainer">
              <label>Loading Asteroid Data...</label>
              <div className="dinoSatAsteroidSideBarLoadingBar"><div className="dinoSatAsteroidSideBarLoadingBarAccent" /></div>
              <small>Fetching From NASA JPL SBDB...</small>
            </div>
          )}
          <div className="dinoSatAsteroidSideBarHeader">
            <h1>{!sidebarCollapsed && <small>Asteroid Catalog</small>}</h1>
            {!sidebarCollapsed && (
              <>
                <div className="dinoSatAsteroidSideBarThemeSelector">
                  <button className={`dinoSatAsteroidSelectButton ${theme === "dark" ? "dinoSatAsteroidButtonActive" : ""}`} onClick={() => setTheme("dark")}>Dark</button>
                  <button className={`dinoSatAsteroidSelectButton ${theme === "neon" ? "dinoSatAsteroidButtonActive" : ""}`} onClick={() => setTheme("neon")}>Neon</button>
                </div>
                <div className="dinoSatAsteroidSideBarThemeSelector">
                  <div className="dinoSatAsteroidSideBarThemeSelectorStatusIndicator">
                    Ready
                    {loadingMetadata && (<div style={{ fontSize: "9px", marginTop: "2px" }}>Sources: {loadingMetadata.successfulSources}/3 | Load: {loadingMetadata.loadTime?.toFixed(0)}ms</div>)}
                  </div>
                </div>
                <div className="dinoSatAsteroidSideBarThemeSelector">
                  {errors.length > 0 && (
                    <div className="dinoSatAsteroidSideBarThemeSelectorErrorIndicator" onClick={() => setShowErrors(!showErrors)} style={{ opacity: showErrors ? 1.0 : "", paddingTop: showErrors ? "" : 0, paddingBottom: showErrors ? "" : 0 }}>
                      <div className="dinoSatAsteroidSideBarThemeSelectorErrorIndicatorHeader">
                        <span>API Errors ({errors.length})</span>
                        <button onClick={(e) => { e.stopPropagation(); copyAllErrors(); }} aria-label="Copy all errors"><FontAwesomeIcon icon={copiedErrors ? faSquareCheck : faClone} size="sm"/></button>
                      </div>
                      {showErrors && (<div className="dinoSatAsteroidSideBarThemeSelectorErrorIndicatorList">{errors.map((error, index) => (<div key={index} style={{ opacity: 0.8 }}>{error}</div>))}</div>)}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          {!sidebarCollapsed && !loading && (
            <>
              <div className="dinoSatAsteroidSearchControls">
                <input type="text" placeholder="Search asteroids..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="dinoSatAsteroidSearchInput"/>
                <div className="dinoSatAsteroidSelectControls">
                  <button className="dinoSatAsteroidSelectButton" onClick={selectAllAsteroids}>Select All</button>
                  <button className="dinoSatAsteroidSelectButton" onClick={deselectAllAsteroids}>Deselect All</button>
                  <button className="dinoSatAsteroidSelectButton" onClick={fetchCatalogData}>Refresh</button>
                </div>
              </div>
              <div className="dinoSatAsteroidObjectsHeader"><span className="dinoSatAsteroidObjectsHeaderIcon"><FontAwesomeIcon icon={faMeteor} /></span><span>Asteroids ({asteroids.filter(a => a.active).length}/{asteroids.length})</span></div>
              <div ref={virtualScrollRef} className="dinoSatAsteroidList asteroid-list" style={{ height: "400px", overflowY: "auto", position: "relative" }} onScroll={handleVirtualScroll}>
                <div style={{ height: filteredAsteroids.length * PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT, position: "relative" }}>
                  <div style={{ position: "absolute", top: startIndex * PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT, width: "100%" }}>
                    {visibleItems.map((asteroid) => (
                      <div key={asteroid.id} className={`dinoSatAsteroidListItem asteroid-item ${asteroid.active ? "dinoSatAsteroidButtonActive" : ""} ${selectedAsteroid === asteroid.id ? "asteroid-selected" : ""}`} style={{ height: PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT, minHeight: PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT }} onClick={() => { if (!asteroid.active) toggleAsteroid(asteroid.id); setSelectedAsteroid(asteroid.id); zoomToAsteroid(asteroid.id); }}>
                        <div className="dinoSatAsteroidIndicator" style={{ backgroundColor: asteroid.color }}/>
                        <div className="dinoSatAsteroidInfo">
                          <div className="dinoSatAsteroidName asteroid-name">{asteroid.name}</div>
                          <div className="dinoSatAsteroidDetails"><small>{asteroid.asteroidType} | {asteroid.orbitClass} | {asteroid.heliocentricDistance?.toFixed(2) || asteroid.semiMajorAxis?.toFixed(2) || "?"} AU</small></div>
                        </div>
                        <label className="consoleSwitch"><input type="checkbox" checked={asteroid.active} onChange={() => toggleAsteroid(asteroid.id)} /><span className="consoleSlider round"></span></label>
                        <button className="dinoSatAsteroidInfoButton" onClick={(e) => { e.stopPropagation(); setDetailedAsteroid(asteroid); setDetailedPosition({ x: 0, y: 0 }); }} aria-label="Show details"><FontAwesomeIcon icon={faInfoCircle} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="dinoSatAsteroidMainView">
          <div className="dinonSatAsteroidViewHeader">
            <div className="dinoSatAsteroidCatalogControls">
              <select className="dinoSatAsteroidFilterSelect" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}><option value="All">All Types</option>{Object.keys(ASTEROID_TYPE_COLORS).map(type => (<option key={type} value={type}>{type}</option>))}</select>
              <select className="dinoSatAsteroidFilterSelect" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}><option value="All">All Classes</option>{Object.keys(ORBIT_CLASS_COLORS).map(cls => (<option key={cls} value={cls}>{cls}</option>))}</select>
              <select className="dinoSatAsteroidFilterSelect" value={eccentricityFilter} onChange={(e) => setEccentricityFilter(e.target.value)}><option value="All">All Eccentricities</option>{ECCENTRICITY_RANGES.map(range => (<option key={range.label} value={range.label}>{range.label}</option>))}</select>
              <select className="dinoSatAsteroidFilterSelect" value={diameterFilter} onChange={(e) => setDiameterFilter(e.target.value)}><option value="All">All Diameters</option>{DIAMETER_RANGES.map(range => (<option key={range.label} value={range.label}>{range.label}</option>))}</select>
              <select className="dinoSatAsteroidFilterSelect" value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)}><option value="All">All Periods</option>{PERIOD_RANGES.map(range => (<option key={range.label} value={range.label}>{range.label}</option>))}</select>
              <select className="dinoSatAsteroidFilterSelect" value={sortOption} onChange={(e) => setSortOption(e.target.value)}>{SORT_OPTIONS.map(option => (<option key={option.value} value={option.value}>{option.label}</option>))}</select>
              <button className="dinoSatAsteroidCatalogControlsButton" onClick={clearFilters}>Clear Filters</button>
              <select className="dinoSatAsteroidFPSSelect" value={targetFps} onChange={(e) => setTargetFps(Number(e.target.value))}>{FPS_OPTIONS.map(fps => (<option key={fps} value={fps}>{fps} FPS</option>))}</select>
              <div className="dinoSatAsteroidCatalogControlsButton" onClick={toggleHUD}><FontAwesomeIcon icon={faChartLine} /> HUD</div>
              <button className="dinoSatAsteroidCatalogControlsButton" onClick={exportJSON}>Export JSON</button>
              <button className="dinoSatAsteroidCatalogControlsButton" onClick={exportCSV}>Export CSV</button>
            </div>
          </div>
          <div ref={mountRef} className="dinoSatAsteroidCanvasContainer" />
          <div ref={legendPanelRef} className={`dinoSatAsteroidLegendPanel ${legendCollapsed ? "asteroid-collapsed" : ""}`} style={{ transform: `translate(${legendPosition.x}px, ${legendPosition.y}px)`, cursor: isDraggingLegend ? "grabbing" : "grab" }} onMouseDown={handleLegendMouseDown} tabIndex={0}>
            <div className="dinoSatAsteroidPanelHeader" onClick={handleLegendToggle}><small>Asteroid Types</small><span className="dinosatAsteroidHeaderIcon"><FontAwesomeIcon icon={legendCollapsed ? faChevronDown : faChevronUp} /></span></div>
            {!legendCollapsed && (<div className="dinoSatAsteroidPanelContent">{Object.entries(ASTEROID_TYPE_COLORS).slice(0, 12).map(([type, color]) => (<div key={type} className="dinoSatAsteroidLegendItem"><div className="dinoSatAsteroidLegendColor" style={{ backgroundColor: color }} /><span>{type}</span></div>))}</div>)}
          </div>
          <div ref={controlsPanelRef} className={`dinoSatAsteroidControlsPanel ${controlsCollapsed ? "asteroid-collapsed" : ""}`} style={{ transform: `translate(${controlsPosition.x}px, ${controlsPosition.y}px)`, cursor: isDraggingControls ? "grabbing" : "grab" }} onMouseDown={handleControlsMouseDown} tabIndex={0}>
            <div className="dinoSatAsteroidPanelHeader" onClick={handleControlsToggle}><span>View Controls</span><span className="dinosatAsteroidHeaderIcon"><FontAwesomeIcon icon={controlsCollapsed ? faChevronDown : faChevronUp} /></span></div>
            {!controlsCollapsed && (
              <div className="dinoSatAsteroidPanelContent">
                <button className="dinoSatAsteroidControlButton" onClick={resetCamera}>Reset Camera</button>
                <button className="dinoSatAsteroidControlButton" onClick={toggleLabels}>{showLabels ? "Hide" : "Show"} Labels</button>
                <button className="dinoSatAsteroidControlButton" onClick={toggleAxisMarkers}>{showAxisMarkers ? "Hide" : "Show"} Axes</button>
                <button className="dinoSatAsteroidControlButton" onClick={togglePlanetOrbits}>{showPlanetOrbits ? "Hide" : "Show"} Planet Orbits</button>
                <button className="dinoSatAsteroidControlButton" onClick={toggleAsteroidBelt}>{showAsteroidBelt ? "Hide" : "Show"} Asteroid Belt</button>
              </div>
            )}
          </div>
          {hudVisible && (
            <div ref={hudPanelRef} className="dinoSatAsteroidHUDPanel" style={{ transform: `translate(calc(-50% + ${hudPosition.x}px), calc(-50% + ${hudPosition.y}px))`, cursor: isDraggingHud ? "grabbing" : "grab" }} onMouseDown={handleHudMouseDown} tabIndex={0}>
              <div className="dinoSatAsteroidHUDPanelHeader"><span>Performance HUD - Drag To Move</span><button className="dinoSatAsteroidCloseButton" onClick={toggleHUD}><FontAwesomeIcon icon={faSquareXmark} /></button></div>
              <div className="dinoSatAsteroidHUDContent">
                <div className="dinosatAsteroidHUDSection">
                  <h4 style={{ marginTop: 0 }}>Coordinate System</h4>
                  <div className="dinosatAsteroidHUDSectionGrid">
                    <div className="dinosatAsteroidHUDSectionItem"><span>Reference Frame:</span><span>Heliocentric Ecliptic</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Epoch:</span><span>J2000.0</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Origin:</span><span>Sun (Solar Barycenter)</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>X-Axis:</span><span>Vernal Equinox</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Z-Axis:</span><span>North Ecliptic Pole</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Units:</span><span>AU (Astronomical Units)</span></div>
                  </div>
                </div>
                <div className="dinosatAsteroidHUDSection">
                  <h4>Performance Metrics</h4>
                  <div className="dinosatAsteroidHUDSectionGrid">
                    <div className="dinosatAsteroidHUDSectionItem"><span>Render Time:</span><span>{performanceStats.renderTime}ms</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Target FPS:</span><span>{targetFps}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Actual FPS:</span><span>{actualFps}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Draw Calls:</span><span>{performanceStats.drawCalls}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Visible Asteroids:</span><span style={{ color: "#00ff00" }}>{performanceStats.visibleAsteroids}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Culled Asteroids:</span><span style={{ color: "#ffaa00" }}>{performanceStats.culledAsteroids}</span></div>
                  </div>
                </div>
                <div className="dinosatAsteroidHUDSection">
                  <h4>Data Status</h4>
                  <div className="dinosatAsteroidHUDSectionGrid">
                    <div className="dinosatAsteroidHUDSectionItem"><span>Active Asteroids:</span><span>{activeAsteroids}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Total Objects:</span><span>{asteroids.length}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Data Source:</span><span>NASA JPL SBDB</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>NEO Count:</span><span style={{ color: "#ffaa00" }}>{loadingMetadata?.neoCount || 0}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>PHA Count:</span><span style={{ color: "#ff4400" }}>{loadingMetadata?.phaCount || 0}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>API Errors:</span><span style={{ color: errors.length > 0 ? "#ff4400" : "#00ff00" }}>{errors.length}</span></div>
                  </div>
                </div>
                <div className="dinosatAsteroidHUDSection">
                  <h4>Orbit Class Distribution</h4>
                  <div className="dinosatAsteroidHUDSectionGrid">
                    {Object.entries(classCounts).slice(0, 8).map(([cls, count]) => (<div key={cls} className="dinosatAsteroidHUDSectionItem"><span style={{ color: ORBIT_CLASS_COLORS[cls] }}>{cls}:</span><span>{count}</span></div>))}
                  </div>
                </div>
              </div>
            </div>
          )}
          {detailedAsteroid && (
            <div ref={detailedPanelRef} className="dinoSatAsteroidDetailedPanel" style={{ transform: `translate(calc(-50% + ${detailedPosition.x}px), calc(-50% + ${detailedPosition.y}px))`, cursor: isDraggingDetailed ? "grabbing" : "grab" }} onMouseDown={handleDetailedMouseDown} tabIndex={0}>
              <div className="dinoSatAsteroidHUDPanelHeader"><span>{detailedAsteroid.name}</span><button className="dinoSatAsteroidCloseButton" onClick={() => setDetailedAsteroid(null)}><FontAwesomeIcon icon={faSquareXmark} /></button></div>
              <div className="dinoSatAsteroidHUDContent">
                <div className="dinosatAsteroidHUDSection">
                  <h4>Identification</h4>
                  <div className="dinosatAsteroidHUDSectionGrid">
                    <div className="dinosatAsteroidHUDSectionItem"><span>Name:</span><span>{detailedAsteroid.name}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Designation:</span><span>{detailedAsteroid.designation || "N/A"}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Full Name:</span><span>{detailedAsteroid.fullName || "N/A"}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Spectral Type:</span><span style={{ color: detailedAsteroid.color }}>{detailedAsteroid.asteroidType}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Orbit Class:</span><span style={{ color: detailedAsteroid.classColor }}>{detailedAsteroid.orbitClass}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Data Source:</span><span>{detailedAsteroid.source}</span></div>
                  </div>
                </div>
                <div className="dinosatAsteroidHUDSection">
                  <h4>Current Heliocentric Position</h4>
                  <div className="dinosatAsteroidHUDSectionGrid">
                    <div className="dinosatAsteroidHUDSectionItem"><span>X (AU):</span><span>{(detailedAsteroid.computedX ?? detailedAsteroid.heliocentricX)?.toFixed(6) || "N/A"}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Y (AU):</span><span>{(detailedAsteroid.computedY ?? detailedAsteroid.heliocentricY)?.toFixed(6) || "N/A"}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Z (AU):</span><span>{(detailedAsteroid.computedZ ?? detailedAsteroid.heliocentricZ)?.toFixed(6) || "N/A"}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Distance (AU):</span><span>{detailedAsteroid.heliocentricDistance?.toFixed(6) || detailedAsteroid.semiMajorAxis?.toFixed(6) || "N/A"}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>True Anomaly:</span><span>{detailedAsteroid.trueAnomaly ? `${detailedAsteroid.trueAnomaly.toFixed(2)}°` : "N/A"}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Current Velocity:</span><span>{detailedAsteroid.currentVelocity ? `${detailedAsteroid.currentVelocity.toFixed(2)} km/s` : "N/A"}</span></div>
                  </div>
                </div>
                <div className="dinosatAsteroidHUDSection">
                  <h4>Orbital Elements (J2000)</h4>
                  <div className="dinosatAsteroidHUDSectionGrid">
                    <div className="dinosatAsteroidHUDSectionItem"><span>Semi-Major Axis (a):</span><span>{detailedAsteroid.semiMajorAxis ? `${detailedAsteroid.semiMajorAxis} AU` : "N/A"}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Eccentricity (e):</span><span>{detailedAsteroid.eccentricity?.toFixed(8) || "N/A"}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Inclination (i):</span><span>{detailedAsteroid.inclination ? `${detailedAsteroid.inclination}°` : "N/A"}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Long. Asc. Node (Ω):</span><span>{detailedAsteroid.longAscNode ? `${detailedAsteroid.longAscNode}°` : "N/A"}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Arg. Perihelion (ω):</span><span>{detailedAsteroid.argPerihelion ? `${detailedAsteroid.argPerihelion}°` : "N/A"}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Mean Anomaly (M):</span><span>{detailedAsteroid.meanAnomaly ? `${detailedAsteroid.meanAnomaly}°` : "N/A"}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Perihelion (q):</span><span>{detailedAsteroid.perihelion ? `${detailedAsteroid.perihelion} AU` : "N/A"}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Aphelion (Q):</span><span>{detailedAsteroid.aphelion ? `${detailedAsteroid.aphelion} AU` : "N/A"}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Orbital Period:</span><span>{detailedAsteroid.orbitalPeriod ? `${detailedAsteroid.orbitalPeriod.toFixed(4)} years` : "N/A"}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Mean Motion (n):</span><span>{detailedAsteroid.meanMotion ? `${detailedAsteroid.meanMotion}°/day` : "N/A"}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Epoch (JD):</span><span>{detailedAsteroid.epochJD || "N/A"}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Time of Perihelion:</span><span>{detailedAsteroid.timePerihelion || "N/A"}</span></div>
                  </div>
                </div>
                <div className="dinosatAsteroidHUDSection">
                  <h4>Physical Properties</h4>
                  <div className="dinosatAsteroidHUDSectionGrid">
                    <div className="dinosatAsteroidHUDSectionItem"><span>Absolute Mag (H):</span><span>{detailedAsteroid.absoluteMagnitude?.toFixed(2) || "N/A"}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Slope Parameter (G):</span><span>{detailedAsteroid.slopeParameter?.toFixed(2) || "N/A"}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Diameter:</span><span>{detailedAsteroid.diameter ? `${detailedAsteroid.diameter} km` : "N/A"}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Measured Diameter:</span><span>{detailedAsteroid.diameterMeasured ? `${detailedAsteroid.diameterMeasured} km` : "Estimated"}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Extent:</span><span>{detailedAsteroid.extent || "N/A"}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Albedo:</span><span>{detailedAsteroid.albedo?.toFixed(4) || "N/A"}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Rotation Period:</span><span>{detailedAsteroid.rotationPeriod ? `${detailedAsteroid.rotationPeriod} hours` : "N/A"}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>B-V Color Index:</span><span>{detailedAsteroid.colorIndexBV?.toFixed(3) || "N/A"}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>U-B Color Index:</span><span>{detailedAsteroid.colorIndexUB?.toFixed(3) || "N/A"}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>IR Color Index:</span><span>{detailedAsteroid.colorIndexIR?.toFixed(3) || "N/A"}</span></div>
                  </div>
                </div>
                <div className="dinosatAsteroidHUDSection">
                  <h4>Derived Properties</h4>
                  <div className="dinosatAsteroidHUDSectionGrid">
                    <div className="dinosatAsteroidHUDSectionItem"><span>Estimated Mass:</span><span>{detailedAsteroid.estimatedMass ? `${detailedAsteroid.estimatedMass.toExponential(2)} kg` : "N/A"}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Surface Gravity:</span><span>{detailedAsteroid.surfaceGravity ? `${detailedAsteroid.surfaceGravity.toExponential(2)} m/s²` : "N/A"}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Escape Velocity:</span><span>{detailedAsteroid.escapeVelocity ? `${detailedAsteroid.escapeVelocity.toFixed(2)} m/s` : "N/A"}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Hill Sphere:</span><span>{detailedAsteroid.hillSphereRadius ? `${detailedAsteroid.hillSphereRadius.toFixed(2)} km` : "N/A"}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Perihelion Velocity:</span><span>{detailedAsteroid.perihelionVelocity ? `${detailedAsteroid.perihelionVelocity} km/s` : "N/A"}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Aphelion Velocity:</span><span>{detailedAsteroid.aphelionVelocity ? `${detailedAsteroid.aphelionVelocity} km/s` : "N/A"}</span></div>
                  </div>
                </div>
                <div className="dinosatAsteroidHUDSection">
                  <h4>Close Approach Data</h4>
                  <div className="dinosatAsteroidHUDSectionGrid">
                    <div className="dinosatAsteroidHUDSectionItem"><span>MOID (Earth):</span><span>{detailedAsteroid.moid ? `${detailedAsteroid.moid} AU` : "N/A"}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>MOID (Lunar Dist):</span><span>{detailedAsteroid.moidLunarDistance ? `${detailedAsteroid.moidLunarDistance.toFixed(2)} LD` : "N/A"}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>MOID (Jupiter):</span><span>{detailedAsteroid.moidJupiter ? `${detailedAsteroid.moidJupiter} AU` : "N/A"}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Tisserand (Jupiter):</span><span>{detailedAsteroid.tisserandParameter?.toFixed(4) || "N/A"}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Near-Earth Object:</span><span style={{ color: detailedAsteroid.isNEO ? "#ffaa00" : "#00ff00" }}>{detailedAsteroid.isNEO ? "Yes" : "No"}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Potentially Hazardous:</span><span style={{ color: detailedAsteroid.isPHA ? "#ff4400" : "#00ff00" }}>{detailedAsteroid.isPHA ? "Yes" : "No"}</span></div>
                  </div>
                </div>
                <div className="dinosatAsteroidHUDSection">
                  <h4>Observation Data</h4>
                  <div className="dinosatAsteroidHUDSectionGrid">
                    <div className="dinosatAsteroidHUDSectionItem"><span>Discovery Year:</span><span>{detailedAsteroid.discoveryYear || "Unknown"}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>First Observation:</span><span>{detailedAsteroid.firstObservation || "Unknown"}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Last Observation:</span><span>{detailedAsteroid.lastObservation || "Unknown"}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Observation Count:</span><span>{detailedAsteroid.observationCount || "Unknown"}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Radar Delay Obs:</span><span>{detailedAsteroid.radarDelayObservations || 0}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Radar Doppler Obs:</span><span>{detailedAsteroid.radarDopplerObservations || 0}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Data Arc:</span><span>{detailedAsteroid.dataArcDays ? `${detailedAsteroid.dataArcDays} days` : "Unknown"}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Condition Code:</span><span>{detailedAsteroid.conditionCode || "Unknown"}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Orbit RMS:</span><span>{detailedAsteroid.orbitRms || "N/A"}</span></div>
                    <div className="dinosatAsteroidHUDSectionItem"><span>Producer:</span><span>{detailedAsteroid.producer || "N/A"}</span></div>
                  </div>
                </div>
                {(detailedAsteroid.uncertaintyE || detailedAsteroid.uncertaintyA) && (
                  <div className="dinosatAsteroidHUDSection">
                    <h4>Orbital Uncertainties (1-σ)</h4>
                    <div className="dinosatAsteroidHUDSectionGrid">
                      <div className="dinosatAsteroidHUDSectionItem"><span>σ(e):</span><span>{detailedAsteroid.uncertaintyE || "N/A"}</span></div>
                      <div className="dinosatAsteroidHUDSectionItem"><span>σ(a):</span><span>{detailedAsteroid.uncertaintyA ? `${detailedAsteroid.uncertaintyA} AU` : "N/A"}</span></div>
                      <div className="dinosatAsteroidHUDSectionItem"><span>σ(i):</span><span>{detailedAsteroid.uncertaintyI ? `${detailedAsteroid.uncertaintyI}°` : "N/A"}</span></div>
                      <div className="dinosatAsteroidHUDSectionItem"><span>σ(Ω):</span><span>{detailedAsteroid.uncertaintyOm ? `${detailedAsteroid.uncertaintyOm}°` : "N/A"}</span></div>
                      <div className="dinosatAsteroidHUDSectionItem"><span>σ(ω):</span><span>{detailedAsteroid.uncertaintyW ? `${detailedAsteroid.uncertaintyW}°` : "N/A"}</span></div>
                      <div className="dinosatAsteroidHUDSectionItem"><span>σ(M):</span><span>{detailedAsteroid.uncertaintyMa ? `${detailedAsteroid.uncertaintyMa}°` : "N/A"}</span></div>
                    </div>
                  </div>
                )}
                {(detailedAsteroid.nonGravA1 || detailedAsteroid.nonGravA2) && (
                  <div className="dinosatAsteroidHUDSection">
                    <h4>Non-Gravitational Parameters</h4>
                    <div className="dinosatAsteroidHUDSectionGrid">
                      <div className="dinosatAsteroidHUDSectionItem"><span>A1:</span><span>{detailedAsteroid.nonGravA1 || "N/A"}</span></div>
                      <div className="dinosatAsteroidHUDSectionItem"><span>A2:</span><span>{detailedAsteroid.nonGravA2 || "N/A"}</span></div>
                      <div className="dinosatAsteroidHUDSectionItem"><span>A3:</span><span>{detailedAsteroid.nonGravA3 || "N/A"}</span></div>
                      <div className="dinosatAsteroidHUDSectionItem"><span>DT:</span><span>{detailedAsteroid.nonGravDT || "N/A"}</span></div>
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