import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as THREE from "three";
import * as TWEEN from "three/examples/jsm/libs/tween.module.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faInfoCircle, faTimes, faRedo, 
  faSquareXmark, faSquareCheck, faClone,
  faChartLine, faChevronDown, faChevronUp, faMeteor
} from "@fortawesome/free-solid-svg-icons";
import DinoLabsNav from "../../../helpers/Nav.jsx";
import "../../../styles/helperStyles/Switch.css";
import "../../../styles/mainStyles/DinoSat/DinoSatCatalogs/Comets/CometCatalog.css";

export default function CometCatalog() {
  const COMET_TYPE_COLORS = {
    "Jupiter-family": "#4ECDC4",
    "Halley-type": "#4169E1",
    "Long-period": "#9370DB",
    "Encke-type": "#FFD700",
    "Chiron-type": "#00CED1",
    "Hyperbolic": "#FF69B4",
    "Parabolic": "#32CD32",
    "Unknown": "#888888"
  };

  const ORBIT_CLASS_COLORS = {
    "COM": "#6B9FFF",
    "CTc": "#4ECDC4",
    "ETc": "#45B7D1",
    "HTC": "#96CEB4",
    "JFc": "#FFEAA7",
    "JFC": "#DDA0DD",
    "PAR": "#98D8C8",
    "HYP": "#F7DC6F",
    "Unknown": "#888888"
  };

  const ECCENTRICITY_RANGES = [
    { label: "Circular (0-0.2)", min: 0, max: 0.2 },
    { label: "Elliptical (0.2-0.6)", min: 0.2, max: 0.6 },
    { label: "Highly Elliptical (0.6-0.9)", min: 0.6, max: 0.9 },
    { label: "Near-Parabolic (0.9-1.0)", min: 0.9, max: 1.0 },
    { label: "Hyperbolic (1.0+)", min: 1.0, max: 10 }
  ];

  const PERIHELION_RANGES = [
    { label: "Sun-grazing (0-0.1 AU)", min: 0, max: 0.1 },
    { label: "Inner Solar System (0.1-1 AU)", min: 0.1, max: 1 },
    { label: "Near Earth (1-2 AU)", min: 1, max: 2 },
    { label: "Outer (2-5 AU)", min: 2, max: 5 },
    { label: "Distant (5+ AU)", min: 5, max: 1000 }
  ];

  const PERIOD_RANGES = [
    { label: "Encke-type (0-3.3 yr)", min: 0, max: 3.3 },
    { label: "Jupiter-family (3.3-20 yr)", min: 3.3, max: 20 },
    { label: "Halley-type (20-200 yr)", min: 20, max: 200 },
    { label: "Long-period (200+ yr)", min: 200, max: 100000 },
    { label: "Non-periodic", min: -1, max: 0 }
  ];

  const SORT_OPTIONS = [
    { label: "Perihelion (Near to Far)", value: "perihelion_asc" },
    { label: "Perihelion (Far to Near)", value: "perihelion_desc" },
    { label: "Name (A-Z)", value: "name_asc" },
    { label: "Name (Z-A)", value: "name_desc" },
    { label: "Discovery Year (Recent)", value: "year_desc" },
    { label: "Discovery Year (Oldest)", value: "year_asc" },
    { label: "Comet Type", value: "type" },
    { label: "Orbit Class", value: "class" }
  ];

  const FPS_OPTIONS = [30, 60, 120, 144];

  const PERFORMANCE_CONSTANTS = {
    MAX_VISIBLE_COMETS: 5000,
    UPDATE_FREQUENCY: 1,
    FRUSTUM_MARGIN: 1.2,
    PRESELECT_COUNT: 100,
    VIRTUAL_SCROLL_ITEM_HEIGHT: 50,
    VIRTUAL_SCROLL_BUFFER: 10,
    COMET_SIZE_MULTIPLIER: 2.0,
    SCALE_FACTOR: 30.0,
    PARABOLIC_EPSILON: 1e-6,
    ACTIVITY_THRESHOLD: 5.0,
    MAX_TAIL_LENGTH: 25.0,
    TAIL_PARTICLE_COUNT: 64,
    MIN_HELIOCENTRIC_DISTANCE: 0.25,
    MIN_SCALED_DISTANCE: 10
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
  const [comets, setComets] = useState([]);
  const [filteredComets, setFilteredComets] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [classFilter, setClassFilter] = useState("All");
  const [eccentricityFilter, setEccentricityFilter] = useState("All");
  const [perihelionFilter, setPerihelionFilter] = useState("All");
  const [periodFilter, setPeriodFilter] = useState("All");
  const [sortOption, setSortOption] = useState("perihelion_asc");
  const [targetFps, setTargetFps] = useState(60);
  const [actualFps, setActualFps] = useState(60);
  const [showLabels, setShowLabels] = useState(true);
  const [showEclipticGrid, setShowEclipticGrid] = useState(true);
  const [showOrbitalPlane, setShowOrbitalPlane] = useState(true);
  const [showDistanceRings, setShowDistanceRings] = useState(true);
  const [showAxisMarkers, setShowAxisMarkers] = useState(true);
  const [showPlanetOrbits, setShowPlanetOrbits] = useState(true);
  const [showKuiperBelt, setShowKuiperBelt] = useState(false);
  const [showCometOrbits, setShowCometOrbits] = useState(false);
  const [showTails, setShowTails] = useState(true);
  const [bloomEnabled, setBloomEnabled] = useState(true);
  const [bloomStrength, setBloomStrength] = useState(BLOOM_PARAMS.strength);
  const [bloomRadius, setBloomRadius] = useState(BLOOM_PARAMS.radius);
  const [bloomThreshold, setBloomThreshold] = useState(BLOOM_PARAMS.threshold);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [legendCollapsed, setLegendCollapsed] = useState(false);
  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  const [hudVisible, setHudVisible] = useState(false);
  const [detailedComet, setDetailedComet] = useState(null);
  const [selectedComet, setSelectedComet] = useState(null);
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
    visibleComets: 0,
    culledComets: 0
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
  const cometGroupRef = useRef(null);
  const frameCountRef = useRef(0);
  const lastFpsTime = useRef(0);
  const actualFpsRef = useRef(60);
  const eclipticGridRef = useRef(null);
  const orbitalPlaneRef = useRef(null);
  const distanceRingsRef = useRef(null);
  const axisMarkersRef = useRef(null);
  const planetOrbitsRef = useRef(null);
  const kuiperBeltRef = useRef(null);
  const hudPanelRef = useRef(null);
  const legendPanelRef = useRef(null);
  const controlsPanelRef = useRef(null);
  const detailedPanelRef = useRef(null);
  const controlsRef = useRef(null);
  const backgroundStarsRef = useRef(null);
  const virtualScrollRef = useRef(null);
  const cometNucleiRef = useRef(null);
  const cometComaRef = useRef(null);
  const ionTailsRef = useRef(null);
  const dustTailsRef = useRef(null);
  const cometDataRef = useRef(new Map());
  const labelsRef = useRef({});
  const visibleCometsRef = useRef(new Set());
  const frustumRef = useRef(new THREE.Frustum());
  const tempMatrix = useRef(new THREE.Matrix4());
  const tempQuaternion = useRef(new THREE.Quaternion());
  const tempColor = useRef(new THREE.Color());
  const dummyObject = useRef(new THREE.Object3D());
  const timeRef = useRef(0);

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
    clear() { this.grid.clear(); }
    add(object, position) {
      const key = this.getKey(position);
      if (!this.grid.has(key)) this.grid.set(key, []);
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

  const ionTailVertexShader = `
    attribute float tailPosition;
    attribute float activity;
    attribute vec3 tailDirection;
    varying float vTailPosition;
    varying float vActivity;
    varying vec3 vWorldPos;
    
    void main() {
      vTailPosition = tailPosition;
      vActivity = activity;
      
      vec3 pos = position;
      vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      float intensitySize = max(1.0, (1.0 - tailPosition * 0.7) * activity * 12.0 * (300.0 / length(gl_Position.xyz)));
      gl_PointSize = intensitySize;
    }
  `;

  const ionTailFragmentShader = `
    varying float vTailPosition;
    varying float vActivity;
    varying vec3 vWorldPos;
    uniform vec3 baseColor;
    uniform float time;
    
    void main() {
      float dist = length(gl_PointCoord - vec2(0.5));
      if (dist > 0.5) discard;
      
      float glow = 1.0 - smoothstep(0.0, 0.5, dist);
      glow = pow(glow, 1.5);
      
      float tailFade = 1.0 - pow(vTailPosition, 0.6);
      
      float flicker = 0.85 + 0.15 * sin(time * 3.0 + vTailPosition * 10.0);
      
      vec3 ionColor = mix(baseColor, vec3(0.4, 0.6, 1.0), 0.7);
      float hdrBoost = 1.0 + (1.0 - vTailPosition) * vActivity * 2.0;
      
      float alpha = glow * tailFade * vActivity * flicker * 0.8;
      gl_FragColor = vec4(ionColor * hdrBoost, alpha);
    }
  `;

  const dustTailVertexShader = `
    attribute float tailPosition;
    attribute float activity;
    attribute float curveOffset;
    varying float vTailPosition;
    varying float vActivity;
    varying float vCurve;
    
    void main() {
      vTailPosition = tailPosition;
      vActivity = activity;
      vCurve = curveOffset;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      
      float size = (1.0 - tailPosition * 0.5) * activity * 16.0;
      size *= (1.0 + tailPosition * 0.5);
      gl_PointSize = max(1.0, size * (300.0 / length(gl_Position.xyz)));
    }
  `;

  const dustTailFragmentShader = `
    varying float vTailPosition;
    varying float vActivity;
    varying float vCurve;
    uniform vec3 baseColor;
    uniform float time;
    
    void main() {
      float dist = length(gl_PointCoord - vec2(0.5));
      if (dist > 0.5) discard;
      
      float glow = 1.0 - smoothstep(0.0, 0.5, dist);
      glow = pow(glow, 1.2);
      
      float tailFade = 1.0 - pow(vTailPosition, 0.8);
      
      vec3 dustColor = mix(baseColor, vec3(1.0, 0.95, 0.8), 0.6);
      float hdrBoost = 1.0 + (1.0 - vTailPosition) * vActivity * 1.5;
      
      float alpha = glow * tailFade * vActivity * 0.5;
      gl_FragColor = vec4(dustColor * hdrBoost, alpha);
    }
  `;

  const comaVertexShader = `
    attribute float activity;
    varying float vActivity;
    
    void main() {
      vActivity = activity;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = max(3.0, activity * 35.0 * (300.0 / length(gl_Position.xyz)));
    }
  `;

  const comaFragmentShader = `
    varying float vActivity;
    uniform vec3 baseColor;
    uniform float time;
    
    void main() {
      float dist = length(gl_PointCoord - vec2(0.5));
      if (dist > 0.5) discard;
      
      float glow = 1.0 - smoothstep(0.0, 0.5, dist);
      glow = pow(glow, 0.8);
      
      float pulse = 0.9 + 0.1 * sin(time * 2.0);
      
      vec3 comaColor = mix(vec3(1.0), baseColor, 0.3);
      float hdrBoost = 1.0 + vActivity * 2.5;
      
      float alpha = glow * vActivity * pulse * 0.9;
      gl_FragColor = vec4(comaColor * hdrBoost, alpha);
    }
  `;

  const sanitizeEccentricity = (e) => {
    if (!Number.isFinite(e) || e < 0) return 0.1;
    if (Math.abs(e - 1.0) < PERFORMANCE_CONSTANTS.PARABOLIC_EPSILON) {
      return 1.0 + PERFORMANCE_CONSTANTS.PARABOLIC_EPSILON;
    }
    return e;
  };

  const solveParabolicAnomaly = (M, q) => {
    const W = (3 / 2) * M;
    const Y = Math.cbrt(W + Math.sqrt(W * W + 1));
    const tanHalfNu = Y - 1 / Y;
    const nu = 2 * Math.atan(tanHalfNu);
    const r = q * (1 + tanHalfNu * tanHalfNu);
    return { nu, r };
  };

  const calculateCometPosition = useCallback((comet) => {
    let x = comet.heliocentricX;
    let y = comet.heliocentricY;
    let z = comet.heliocentricZ;

    const hasValidPosition = x !== null && x !== undefined && y !== null && y !== undefined && z !== null && z !== undefined && !(x === 0 && y === 0 && z === 0);

    if (!hasValidPosition) {
      const a = comet.semiMajorAxis || (comet.perihelion ? comet.perihelion * 2 : 2.5);
      const rawE = comet.eccentricity || 0.5;
      const isParabolic = Math.abs(rawE - 1.0) < PERFORMANCE_CONSTANTS.PARABOLIC_EPSILON;
      const e = sanitizeEccentricity(rawE);
      const iDeg = comet.inclination || 0;
      const omDeg = comet.longAscNode || 0;
      const wDeg = comet.argPerihelion || 0;
      const mDeg = comet.meanAnomaly || comet.currentMeanAnomaly || 0;
      const q = comet.perihelion;

      const i = iDeg * Math.PI / 180;
      const om = omDeg * Math.PI / 180;
      const w = wDeg * Math.PI / 180;
      const M = mDeg * Math.PI / 180;

      let nu, r;

      if (isParabolic && Number.isFinite(q) && q > 0) {
        const parabolicResult = solveParabolicAnomaly(M, q);
        nu = parabolicResult.nu;
        r = parabolicResult.r;
      } else if (e > 1) {
        let H = M;
        for (let iter = 0; iter < 50; iter++) {
          const sinhH = Math.sinh(H);
          const coshH = Math.cosh(H);
          const denom = e * coshH - 1;
          if (Math.abs(denom) < 1e-12) { H = H + (M > 0 ? 0.1 : -0.1); continue; }
          const dH = (e * sinhH - H - M) / denom;
          H = H - dH;
          if (Math.abs(dH) < 1e-8) break;
        }
        const tanhHalfNu = Math.sqrt((e + 1) / (e - 1)) * Math.tanh(H / 2);
        nu = 2 * Math.atan(tanhHalfNu);
        r = q * (1 + e) / (1 + e * Math.cos(nu));
      } else {
        let E = M;
        for (let iter = 0; iter < 50; iter++) {
          const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
          E = E - dE;
          if (Math.abs(dE) < 1e-8) break;
        }
        const cosE = Math.cos(E);
        const sinE = Math.sin(E);
        nu = Math.atan2(Math.sqrt(1 - e * e) * sinE, cosE - e);
        r = a * (1 - e * cosE);
      }

      if (!Number.isFinite(r) || r <= 0) r = q || a * (1 - e);

      if (!Number.isFinite(r) || r < PERFORMANCE_CONSTANTS.MIN_HELIOCENTRIC_DISTANCE) return null;

      const xOrb = r * Math.cos(nu);
      const yOrb = r * Math.sin(nu);

      const cosOm = Math.cos(om), sinOm = Math.sin(om);
      const cosW = Math.cos(w), sinW = Math.sin(w);
      const cosI = Math.cos(i), sinI = Math.sin(i);

      x = (cosOm * cosW - sinOm * sinW * cosI) * xOrb + (-cosOm * sinW - sinOm * cosW * cosI) * yOrb;
      y = (sinOm * cosW + cosOm * sinW * cosI) * xOrb + (-sinOm * sinW + cosOm * cosW * cosI) * yOrb;
      z = (sinW * sinI) * xOrb + (cosW * sinI) * yOrb;
    }

    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return null;
    
    const distance = Math.sqrt(x * x + y * y + z * z);
    if (!Number.isFinite(distance) || distance < PERFORMANCE_CONSTANTS.MIN_HELIOCENTRIC_DISTANCE) return null;
    
    return { x, y, z };
  }, []);

  const processCometPositions = useCallback((rawComets) => {
    const seen = new Set();
    const uniqueComets = [];
    
    for (const comet of rawComets) {
      const key = (comet.designation || comet.name || comet.id).toLowerCase().replace(/[^a-z0-9]/g, "");
      if (seen.has(key)) continue;
      seen.add(key);
      uniqueComets.push(comet);
    }
    
    return uniqueComets.map((comet, index) => {
      const pos = calculateCometPosition(comet);
      return {
        ...comet,
        computedX: pos ? pos.x : null,
        computedY: pos ? pos.y : null,
        computedZ: pos ? pos.z : null,
        color: COMET_TYPE_COLORS[comet.cometType] || "#888888",
        classColor: ORBIT_CLASS_COLORS[comet.orbitClass] || "#888888",
        active: index < PERFORMANCE_CONSTANTS.PRESELECT_COUNT
      };
    });
  }, [calculateCometPosition]);

  const calculateScaledPosition = (x, y, z) => {
    const scale = PERFORMANCE_CONSTANTS.SCALE_FACTOR;
    return new THREE.Vector3(x * scale, z * scale, -y * scale);
  };

  const getCometSize = (absoluteMag, diameter) => {
    if (diameter && diameter > 0) {
      const baseSize = 0.8;
      const scaleFactor = 0.4;
      const sizeFactor = Math.log10(diameter + 1) + 1;
      return Math.max(0.15, Math.min(6.0, baseSize * sizeFactor * scaleFactor)) * PERFORMANCE_CONSTANTS.COMET_SIZE_MULTIPLIER;
    }
    if (absoluteMag && !isNaN(absoluteMag)) {
      const baseSize = 1.2;
      const magFactor = Math.max(0.2, (20 - absoluteMag) / 10);
      return Math.max(0.15, Math.min(5.0, baseSize * magFactor)) * PERFORMANCE_CONSTANTS.COMET_SIZE_MULTIPLIER;
    }
    return 0.8 * PERFORMANCE_CONSTANTS.COMET_SIZE_MULTIPLIER;
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

  const createOrbitalPlane = () => {
    const group = new THREE.Group();
    group.name = "OrbitalPlane";
    return group;
  };

  const createAxisMarkers = () => {
    const group = new THREE.Group();
    group.name = "AxisMarkers";
    const scale = PERFORMANCE_CONSTANTS.SCALE_FACTOR;
    const length = 35 * scale;
    const axisRadius = 0.15;

    const xGeometry = new THREE.CylinderGeometry(axisRadius, axisRadius, length, 8);
    const xMaterial = new THREE.MeshBasicMaterial({ color: 0x5a8a8a, transparent: true, opacity: 0.8 });
    const xAxis = new THREE.Mesh(xGeometry, xMaterial);
    xAxis.rotation.z = -Math.PI / 2;
    xAxis.position.set(length / 2, 0, 0);
    group.add(xAxis);

    const yGeometry = new THREE.CylinderGeometry(axisRadius, axisRadius, length * 0.15, 8);
    const yMaterial = new THREE.MeshBasicMaterial({ color: 0x557a55, transparent: true, opacity: 0.8 });
    const yAxis = new THREE.Mesh(yGeometry, yMaterial);
    yAxis.position.set(0, (length * 0.15) / 2, 0);
    group.add(yAxis);

    const zGeometry = new THREE.CylinderGeometry(axisRadius, axisRadius, length, 8);
    const zMaterial = new THREE.MeshBasicMaterial({ color: 0x55557a, transparent: true, opacity: 0.8 });
    const zAxis = new THREE.Mesh(zGeometry, zMaterial);
    zAxis.rotation.x = Math.PI / 2;
    zAxis.position.set(0, 0, -length / 2);
    group.add(zAxis);

    const xLabel = createTextSprite("Vernal Eq.", 0x7aaaaa);
    xLabel.position.set(length + 12, 3, 0);
    group.add(xLabel);

    const yLabel = createTextSprite("+Z Ecliptic", 0x6a8a6a);
    yLabel.position.set(0, (length * 0.15) + 12, 0);
    group.add(yLabel);

    const zLabel = createTextSprite("+90° Long", 0x6a6a8a);
    zLabel.position.set(0, 3, -length - 12);
    group.add(zLabel);

    const sunGeometry = new THREE.SphereGeometry(3, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffee88, transparent: true, opacity: 1.0 });
    const sunMarker = new THREE.Mesh(sunGeometry, sunMaterial);
    sunMarker.position.set(0, 0, 0);
    sunMarker.material.color.multiplyScalar(3.0);
    group.add(sunMarker);

    const sunGlowGeometry = new THREE.SphereGeometry(5, 16, 16);
    const sunGlowMaterial = new THREE.MeshBasicMaterial({ color: 0xffcc44, transparent: true, opacity: 0.5 });
    const sunGlow = new THREE.Mesh(sunGlowGeometry, sunGlowMaterial);
    sunGlow.position.set(0, 0, 0);
    sunGlow.material.color.multiplyScalar(2.0);
    group.add(sunGlow);

    const sunSprite = createTextSprite("Sun", 0xffdd44);
    sunSprite.position.set(0, -10, 0);
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
      { name: "Mars", a: 1.524, e: 0.093, color: 0xc4864a, labelAngle: 120 },
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
        const z = -r * Math.sin(theta) * scale;
        points.push(new THREE.Vector3(x, 0, z));
      }
      const orbitCurve = new THREE.CatmullRomCurve3(points, true);
      const tubeGeometry = new THREE.TubeGeometry(orbitCurve, 128, 0.12, 6, true);
      const tubeMaterial = new THREE.MeshBasicMaterial({ color: planet.color, transparent: true, opacity: 0.4 });
      const orbit = new THREE.Mesh(tubeGeometry, tubeMaterial);
      group.add(orbit);

      const labelAngleRad = planet.labelAngle * Math.PI / 180;
      const labelRadius = planet.a * scale;
      const labelPos = new THREE.Vector3(labelRadius * Math.cos(labelAngleRad), 2, -labelRadius * Math.sin(labelAngleRad));
      const sprite = createTextSprite(planet.name, planet.color);
      sprite.position.copy(labelPos);
      group.add(sprite);
    });

    return group;
  };

  const createKuiperBelt = () => {
    const group = new THREE.Group();
    group.name = "KuiperBelt";
    const scale = PERFORMANCE_CONSTANTS.SCALE_FACTOR;
    const innerRadius = 30 * scale;
    const outerRadius = 50 * scale;

    const innerRing = [], outerRing = [];
    for (let i = 0; i <= 64; i++) {
      const theta = (i / 64) * Math.PI * 2;
      innerRing.push(new THREE.Vector3(innerRadius * Math.cos(theta), 0, -innerRadius * Math.sin(theta)));
      outerRing.push(new THREE.Vector3(outerRadius * Math.cos(theta), 0, -outerRadius * Math.sin(theta)));
    }

    const innerTube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(innerRing, true), 64, 0.05, 6, true);
    const outerTube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(outerRing, true), 64, 0.05, 6, true);
    const beltMaterial = new THREE.MeshBasicMaterial({ color: 0x5a6a8a, transparent: true, opacity: 0.35 });

    group.add(new THREE.Mesh(innerTube, beltMaterial));
    group.add(new THREE.Mesh(outerTube, beltMaterial));

    const beltGeometry = new THREE.RingGeometry(innerRadius, outerRadius, 64);
    const beltFillMaterial = new THREE.MeshBasicMaterial({ color: 0x4a5a7a, transparent: true, opacity: 0.05, side: THREE.DoubleSide });
    const beltFill = new THREE.Mesh(beltGeometry, beltFillMaterial);
    beltFill.rotation.x = -Math.PI / 2;
    group.add(beltFill);

    const labelSprite = createTextSprite("Kuiper Belt", 0x6a7a9a);
    labelSprite.position.set(40 * scale, 3, 0);
    group.add(labelSprite);

    return group;
  };

  const createLabel = useCallback((text, color = "#ffffff") => {
    const div = document.createElement("div");
    div.className = "comet-body-label";
    div.textContent = text;
    div.style.cssText = `color: ${color}; font-size: 11px; font-weight: 500; padding: 2px 6px; background: rgba(0, 0, 0, 0.8); border-radius: 3px; border: 1px solid ${color}; pointer-events: none; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; white-space: nowrap; position: absolute; z-index: 5; transform: translate(-50%, -50%); transition: none;`;
    return new CSS2DObject(div);
  }, []);

  const updateSpatialGrid = useCallback(() => {
    spatialGrid.clear();
    comets.forEach((comet, index) => {
      if (comet.active) {
        const data = cometDataRef.current.get(comet.id);
        if (data && data.position) spatialGrid.add({ comet, index }, data.position);
      }
    });
  }, [comets, spatialGrid]);

  const performFrustumCulling = useCallback(() => {
    if (!cameraRef.current) return;
    const camera = cameraRef.current;
    const matrix = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustumRef.current.setFromProjectionMatrix(matrix);
    let culledCount = 0;

    comets.forEach((comet) => {
      if (!comet.active) return;
      const data = cometDataRef.current.get(comet.id);
      if (!data || !data.position) { culledCount++; return; }
      const distance = data.position.distanceTo(camera.position);
      if (distance >= 20000) culledCount++;
    });

    setPerformanceStats(prev => ({ ...prev, culledComets: culledCount }));
  }, [comets]);

  const createCometTailSystems = useCallback(() => {
    if (!cometGroupRef.current) return;
    
    if (cometNucleiRef.current) cometGroupRef.current.remove(cometNucleiRef.current);
    if (cometComaRef.current) cometGroupRef.current.remove(cometComaRef.current);
    if (ionTailsRef.current) cometGroupRef.current.remove(ionTailsRef.current);
    if (dustTailsRef.current) cometGroupRef.current.remove(dustTailsRef.current);

    const maxComets = PERFORMANCE_CONSTANTS.MAX_VISIBLE_COMETS;
    const tailParticles = PERFORMANCE_CONSTANTS.TAIL_PARTICLE_COUNT;
    
    const nucleiGeometry = new THREE.BufferGeometry();
    const nucleiPositions = new Float32Array(maxComets * 3);
    const nucleiColors = new Float32Array(maxComets * 3);
    const nucleiSizes = new Float32Array(maxComets);
    nucleiGeometry.setAttribute("position", new THREE.BufferAttribute(nucleiPositions, 3));
    nucleiGeometry.setAttribute("color", new THREE.BufferAttribute(nucleiColors, 3));
    nucleiGeometry.setAttribute("size", new THREE.BufferAttribute(nucleiSizes, 1));
    
    const nucleiMaterial = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float glow = 1.0 - smoothstep(0.0, 0.5, dist);
          float coreBrightness = smoothstep(0.3, 0.0, dist) * 2.0;
          vec3 hdrColor = vColor * (1.0 + coreBrightness * 3.0);
          gl_FragColor = vec4(hdrColor, glow);
        }
      `,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    cometNucleiRef.current = new THREE.Points(nucleiGeometry, nucleiMaterial);
    cometGroupRef.current.add(cometNucleiRef.current);

    const comaGeometry = new THREE.BufferGeometry();
    const comaPositions = new Float32Array(maxComets * 3);
    const comaColors = new Float32Array(maxComets * 3);
    const comaActivity = new Float32Array(maxComets);
    comaGeometry.setAttribute("position", new THREE.BufferAttribute(comaPositions, 3));
    comaGeometry.setAttribute("color", new THREE.BufferAttribute(comaColors, 3));
    comaGeometry.setAttribute("activity", new THREE.BufferAttribute(comaActivity, 1));
    
    const comaMaterial = new THREE.ShaderMaterial({
      uniforms: { baseColor: { value: new THREE.Color(1, 1, 1) }, time: { value: 0 } },
      vertexShader: comaVertexShader,
      fragmentShader: comaFragmentShader,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    cometComaRef.current = new THREE.Points(comaGeometry, comaMaterial);
    cometGroupRef.current.add(cometComaRef.current);

    const ionGeometry = new THREE.BufferGeometry();
    const ionPositions = new Float32Array(maxComets * tailParticles * 3);
    const ionColors = new Float32Array(maxComets * tailParticles * 3);
    const ionTailPos = new Float32Array(maxComets * tailParticles);
    const ionActivity = new Float32Array(maxComets * tailParticles);
    ionGeometry.setAttribute("position", new THREE.BufferAttribute(ionPositions, 3));
    ionGeometry.setAttribute("color", new THREE.BufferAttribute(ionColors, 3));
    ionGeometry.setAttribute("tailPosition", new THREE.BufferAttribute(ionTailPos, 1));
    ionGeometry.setAttribute("activity", new THREE.BufferAttribute(ionActivity, 1));
    
    const ionMaterial = new THREE.ShaderMaterial({
      uniforms: { baseColor: { value: new THREE.Color(0.3, 0.5, 1.0) }, time: { value: 0 } },
      vertexShader: ionTailVertexShader,
      fragmentShader: ionTailFragmentShader,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    ionTailsRef.current = new THREE.Points(ionGeometry, ionMaterial);
    cometGroupRef.current.add(ionTailsRef.current);

    const dustGeometry = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(maxComets * tailParticles * 3);
    const dustColors = new Float32Array(maxComets * tailParticles * 3);
    const dustTailPos = new Float32Array(maxComets * tailParticles);
    const dustActivity = new Float32Array(maxComets * tailParticles);
    const dustCurve = new Float32Array(maxComets * tailParticles);
    dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
    dustGeometry.setAttribute("color", new THREE.BufferAttribute(dustColors, 3));
    dustGeometry.setAttribute("tailPosition", new THREE.BufferAttribute(dustTailPos, 1));
    dustGeometry.setAttribute("activity", new THREE.BufferAttribute(dustActivity, 1));
    dustGeometry.setAttribute("curveOffset", new THREE.BufferAttribute(dustCurve, 1));
    
    const dustMaterial = new THREE.ShaderMaterial({
      uniforms: { baseColor: { value: new THREE.Color(1.0, 0.9, 0.7) }, time: { value: 0 } },
      vertexShader: dustTailVertexShader,
      fragmentShader: dustTailFragmentShader,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    dustTailsRef.current = new THREE.Points(dustGeometry, dustMaterial);
    cometGroupRef.current.add(dustTailsRef.current);
  }, []);

  const updateCometTails = useCallback((time) => {
    if (!cometNucleiRef.current || !cometComaRef.current || !ionTailsRef.current || !dustTailsRef.current) return;
    
    const nucleiGeom = cometNucleiRef.current.geometry;
    const comaGeom = cometComaRef.current.geometry;
    const ionGeom = ionTailsRef.current.geometry;
    const dustGeom = dustTailsRef.current.geometry;
    
    const nucleiPos = nucleiGeom.attributes.position.array;
    const nucleiCol = nucleiGeom.attributes.color.array;
    const nucleiSize = nucleiGeom.attributes.size.array;
    
    const comaPos = comaGeom.attributes.position.array;
    const comaCol = comaGeom.attributes.color.array;
    const comaAct = comaGeom.attributes.activity.array;
    
    const ionPos = ionGeom.attributes.position.array;
    const ionCol = ionGeom.attributes.color.array;
    const ionTailP = ionGeom.attributes.tailPosition.array;
    const ionAct = ionGeom.attributes.activity.array;
    
    const dustPos = dustGeom.attributes.position.array;
    const dustCol = dustGeom.attributes.color.array;
    const dustTailP = dustGeom.attributes.tailPosition.array;
    const dustAct = dustGeom.attributes.activity.array;
    const dustCurveArr = dustGeom.attributes.curveOffset.array;
    
    const tailParticles = PERFORMANCE_CONSTANTS.TAIL_PARTICLE_COUNT;
    const maxTailLen = PERFORMANCE_CONSTANTS.MAX_TAIL_LENGTH;
    
    let cometIndex = 0;
    const processedIds = new Set();
    
    comets.forEach((comet) => {
      if (!comet.active || cometIndex >= PERFORMANCE_CONSTANTS.MAX_VISIBLE_COMETS) return;
      if (processedIds.has(comet.id)) return;
      processedIds.add(comet.id);
      
      const x = comet.computedX;
      const y = comet.computedY;
      const z = comet.computedZ;
      if (x === null || y === null || z === null) return;
      
      const position = calculateScaledPosition(x, y, z);
      
      if (position.length() < PERFORMANCE_CONSTANTS.MIN_SCALED_DISTANCE) return;
      
      cometDataRef.current.set(comet.id, { position: position.clone(), lastUpdate: Date.now() });
      
      const activity = comet.activityFactor || 0;
      const tailLen = comet.tailLength || 0;
      const ionIntensity = comet.ionTailIntensity || 0;
      const dustIntensity = comet.dustTailIntensity || 0;
      const isActive = comet.isActive || false;
      const baseSize = getCometSize(comet.absoluteMagnitude, comet.diameter);
      
      const colorHex = comet.color.replace("#", "0x");
      tempColor.current.setHex(colorHex);
      const r = tempColor.current.r, g = tempColor.current.g, b = tempColor.current.b;
      
      const ni = cometIndex * 3;
      nucleiPos[ni] = position.x;
      nucleiPos[ni + 1] = position.y;
      nucleiPos[ni + 2] = position.z;
      nucleiCol[ni] = Math.min(1, r + 0.5);
      nucleiCol[ni + 1] = Math.min(1, g + 0.5);
      nucleiCol[ni + 2] = Math.min(1, b + 0.5);
      nucleiSize[cometIndex] = baseSize * 2;
      
      comaPos[ni] = position.x;
      comaPos[ni + 1] = position.y;
      comaPos[ni + 2] = position.z;
      comaCol[ni] = r;
      comaCol[ni + 1] = g;
      comaCol[ni + 2] = b;
      comaAct[cometIndex] = activity;
      
      const sunDir = position.clone().normalize();
      
      const perpDir = new THREE.Vector3(-sunDir.z, 0, sunDir.x).normalize();
      
      if (showTails && isActive && ionIntensity > 0.001) {
        for (let p = 0; p < tailParticles; p++) {
          const idx = (cometIndex * tailParticles + p) * 3;
          const t = p / (tailParticles - 1);
          
          const ionLength = maxTailLen * tailLen * ionIntensity * 3.0 * (0.8 + 0.4 * Math.sin(time * 0.5 + p * 0.1));
          
          const waveAmp = 0.3 * t * ionIntensity;
          const waveX = Math.sin(time * 2 + t * 8) * waveAmp;
          const waveY = Math.cos(time * 2.5 + t * 8) * waveAmp;
          
          ionPos[idx] = position.x + sunDir.x * t * ionLength + perpDir.x * waveX;
          ionPos[idx + 1] = position.y + sunDir.y * t * ionLength + waveY;
          ionPos[idx + 2] = position.z + sunDir.z * t * ionLength + perpDir.z * waveX;
          
          ionCol[idx] = 0.3 + r * 0.2 * ionIntensity;
          ionCol[idx + 1] = 0.5 + g * 0.2 * ionIntensity;
          ionCol[idx + 2] = Math.min(1.0, 0.7 + ionIntensity * 0.3);
          
          ionTailP[cometIndex * tailParticles + p] = t;
          ionAct[cometIndex * tailParticles + p] = ionIntensity;
        }
        
        for (let p = 0; p < tailParticles; p++) {
          const idx = (cometIndex * tailParticles + p) * 3;
          const t = p / (tailParticles - 1);
          
          const dustLength = maxTailLen * tailLen * dustIntensity * 2.0;
          
          const curveAmount = t * t * 8 * dustIntensity;
          
          const spread = t * 2 * dustIntensity;
          const spreadX = (Math.sin(p * 1.618 + time * 0.3) * 0.5) * spread;
          const spreadY = (Math.cos(p * 2.718 + time * 0.2) * 0.3) * spread;
          const spreadZ = (Math.sin(p * 3.14 + time * 0.4) * 0.5) * spread;
          
          dustPos[idx] = position.x + sunDir.x * t * dustLength + perpDir.x * curveAmount + spreadX;
          dustPos[idx + 1] = position.y + sunDir.y * t * dustLength + spreadY;
          dustPos[idx + 2] = position.z + sunDir.z * t * dustLength + perpDir.z * curveAmount + spreadZ;
          
          dustCol[idx] = Math.min(1.0, 0.8 + dustIntensity * 0.2);
          dustCol[idx + 1] = 0.9 + g * 0.05 * dustIntensity;
          dustCol[idx + 2] = 0.7 + b * 0.1 * dustIntensity;
          
          dustTailP[cometIndex * tailParticles + p] = t;
          dustAct[cometIndex * tailParticles + p] = dustIntensity;
          dustCurveArr[cometIndex * tailParticles + p] = curveAmount;
        }
      } else {
        for (let p = 0; p < tailParticles; p++) {
          const idx = (cometIndex * tailParticles + p) * 3;
          ionPos[idx] = 0; ionPos[idx + 1] = -99999; ionPos[idx + 2] = 0;
          dustPos[idx] = 0; dustPos[idx + 1] = -99999; dustPos[idx + 2] = 0;
          ionAct[cometIndex * tailParticles + p] = 0;
          dustAct[cometIndex * tailParticles + p] = 0;
        }
      }
      
      cometIndex++;
    });
    
    for (let i = cometIndex; i < PERFORMANCE_CONSTANTS.MAX_VISIBLE_COMETS; i++) {
      const ni = i * 3;
      nucleiPos[ni] = 0; nucleiPos[ni + 1] = -99999; nucleiPos[ni + 2] = 0;
      comaPos[ni] = 0; comaPos[ni + 1] = -99999; comaPos[ni + 2] = 0;
      nucleiSize[i] = 0;
      comaAct[i] = 0;
      
      for (let p = 0; p < tailParticles; p++) {
        const idx = (i * tailParticles + p) * 3;
        ionPos[idx] = 0; ionPos[idx + 1] = -99999; ionPos[idx + 2] = 0;
        dustPos[idx] = 0; dustPos[idx + 1] = -99999; dustPos[idx + 2] = 0;
      }
    }
    
    cometNucleiRef.current.material.uniforms.time.value = time;
    cometComaRef.current.material.uniforms.time.value = time;
    ionTailsRef.current.material.uniforms.time.value = time;
    dustTailsRef.current.material.uniforms.time.value = time;
    
    nucleiGeom.attributes.position.needsUpdate = true;
    nucleiGeom.attributes.color.needsUpdate = true;
    nucleiGeom.attributes.size.needsUpdate = true;
    
    comaGeom.attributes.position.needsUpdate = true;
    comaGeom.attributes.color.needsUpdate = true;
    comaGeom.attributes.activity.needsUpdate = true;
    
    ionGeom.attributes.position.needsUpdate = true;
    ionGeom.attributes.color.needsUpdate = true;
    ionGeom.attributes.tailPosition.needsUpdate = true;
    ionGeom.attributes.activity.needsUpdate = true;
    
    dustGeom.attributes.position.needsUpdate = true;
    dustGeom.attributes.color.needsUpdate = true;
    dustGeom.attributes.tailPosition.needsUpdate = true;
    dustGeom.attributes.activity.needsUpdate = true;
    dustGeom.attributes.curveOffset.needsUpdate = true;
    
    setPerformanceStats(prev => ({ ...prev, visibleComets: cometIndex }));
  }, [comets, showTails]);

  const updateLabels = useCallback(() => {
    if (!cameraRef.current || !labelRendererRef.current || !showLabels) {
      Object.values(labelsRef.current).forEach(label => {
        if (label && label.element) label.element.style.display = "none";
      });
      return;
    }

    const camera = cameraRef.current;
    const width = mountRef.current?.clientWidth || 800;
    const height = mountRef.current?.clientHeight || 600;
    const tempVec = new THREE.Vector3();

    Object.keys(labelsRef.current).forEach(cometId => {
      const label = labelsRef.current[cometId];
      if (!label || !label.element) return;
      const data = cometDataRef.current.get(cometId);
      if (!data || !data.position) { label.element.style.display = "none"; return; }
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
        } else { label.element.style.display = "none"; }
      } else { label.element.style.display = "none"; }
    });
  }, [showLabels]);

  const fetchCometData = async () => {
    const startTime = performance.now();
    try {
      const response = await fetch(`${import.meta.env.VITE_API_AUTH_URL}/comet-catalog`, {
        method: "GET",
        headers: { "Accept": "application/json", "Content-Type": "application/json" }
      });
      if (!response.ok) throw new Error(`Backend API returned ${response.status}: ${response.statusText}.`);
      const result = await response.json();
      return { comets: result.comets, errors: result.errors || [], metadata: { ...result.metadata, loadTime: performance.now() - startTime } };
    } catch (error) {
      return { comets: [], errors: [`Backend connection failed: ${error.message}. No real comet data available.`], metadata: { totalSources: 0, successfulSources: 0, loadTime: performance.now() - startTime, dataQuality: "No Data", queryTime: new Date().toISOString() } };
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
    if (e.target.closest(".comet-close-btn")) return;
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
    if (e.target.closest(".comet-collapse-icon")) return;
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
    if (e.target.closest(".comet-collapse-icon") || e.target.closest(".dinoSatCometControlButton") || e.target.closest(".dinoSatCometBloomControls")) return;
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
    if (e.target.closest(".comet-close-btn")) return;
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

  const handleLegendToggle = useCallback((e) => { if (isDraggingLegend) { e.preventDefault(); e.stopPropagation(); return; } toggleLegend(); }, [isDraggingLegend]);
  const handleControlsToggle = useCallback((e) => { if (isDraggingControls) { e.preventDefault(); e.stopPropagation(); return; } toggleControls(); }, [isDraggingControls]);
  const handleVirtualScroll = useCallback((e) => setVirtualScrollOffset(e.target.scrollTop), []);

  const getVirtualScrollItems = useMemo(() => {
    if (!virtualScrollRef.current) return { visibleItems: [], startIndex: 0, endIndex: 0 };
    const containerHeight = virtualScrollRef.current.clientHeight || 400;
    const itemHeight = PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT;
    const buffer = PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_BUFFER;
    const startIndex = Math.max(0, Math.floor(virtualScrollOffset / itemHeight) - buffer);
    const endIndex = Math.min(filteredComets.length - 1, Math.ceil((virtualScrollOffset + containerHeight) / itemHeight) + buffer);
    const visibleItems = filteredComets.slice(startIndex, endIndex + 1);
    return { visibleItems, startIndex, endIndex };
  }, [filteredComets, virtualScrollOffset]);

  const exportJSON = useCallback(() => {
    const detailedComets = comets.map(comet => {
      const data = cometDataRef.current.get(comet.id);
      const position = data ? data.position : { x: 0, y: 0, z: 0 };
      return { ...comet, renderedPosition: { x: position.x?.toFixed(2), y: position.y?.toFixed(2), z: position.z?.toFixed(2) }, heliocentricPosition: { x: comet.computedX, y: comet.computedY, z: comet.computedZ }, visible: comet.active };
    });
    const exportData = { comets: detailedComets, hudReadouts: { activeComets: comets.filter(c => c.active).length, actualFps, performanceStats }, loadingMetadata, apiErrors: errors, catalogStats: { totalComets: comets.length, visibleComets: comets.filter(c => c.active).length } };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "comet_catalog_data.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [comets, actualFps, performanceStats, loadingMetadata, errors]);

  const exportCSV = useCallback(() => {
    const headers = ["ID", "Name", "Designation", "ComputedX_AU", "ComputedY_AU", "ComputedZ_AU", "HelioDistance_AU", "Eccentricity", "SemiMajorAxis_AU", "Perihelion_AU", "Aphelion_AU", "Inclination_deg", "LongAscNode_deg", "ArgPerihelion_deg", "MeanAnomaly_deg", "TrueAnomaly_deg", "OrbitalPeriod_yr", "MeanMotion_deg_day", "AbsoluteMagnitude", "TotalMag_M1", "TotalMag_M2", "NuclearMag_K1", "NuclearMag_K2", "Diameter_km", "Albedo", "RotationPeriod_hr", "CometType", "OrbitClass", "IsNEO", "IsPHA", "MOID_AU", "TisserandParameter", "DiscoveryYear", "ObservationCount", "DataArc_days", "NonGrav_A1", "NonGrav_A2", "NonGrav_A3", "RA_deg", "Dec_deg", "Source"];
    let csv = headers.join(",") + "\n";
    comets.forEach(comet => {
      const row = [comet.id, `"${comet.name}"`, `"${comet.designation || ""}"`, comet.computedX || "", comet.computedY || "", comet.computedZ || "", comet.heliocentricDistance || "", comet.eccentricity || "", comet.semiMajorAxis || "", comet.perihelion || "", comet.aphelion || "", comet.inclination || "", comet.longAscNode || "", comet.argPerihelion || "", comet.meanAnomaly || "", comet.trueAnomaly || "", comet.orbitalPeriod || "", comet.meanMotion || "", comet.absoluteMagnitude || "", comet.totalMagnitudeM1 || "", comet.totalMagnitudeM2 || "", comet.nuclearMagnitudeK1 || "", comet.nuclearMagnitudeK2 || "", comet.diameter || "", comet.albedo || "", comet.rotationPeriod || "", `"${comet.cometType}"`, `"${comet.orbitClass}"`, comet.isNEO, comet.isPHA, comet.moid || "", comet.tisserandParameter || "", comet.discoveryYear || "", comet.observationCount || "", comet.dataArcDays || "", comet.nonGravA1 || "", comet.nonGravA2 || "", comet.nonGravA3 || "", comet.rightAscension || "", comet.declination || "", `"${comet.source || ""}"`];
      csv += row.join(",") + "\n";
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "comet_catalog_data.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [comets]);

  const fetchCatalogData = useCallback(async () => {
    setLoading(true);
    setErrors([]);
    const { comets: rawComets, errors, metadata } = await fetchCometData();
    const processedComets = processCometPositions(rawComets);
    setComets(processedComets);
    setErrors(errors);
    setLoadingMetadata(metadata);
    setLoading(false);
  }, [processCometPositions]);

  const toggleComet = useCallback((id) => { setComets(prev => prev.map(comet => comet.id === id ? { ...comet, active: !comet.active } : comet)); }, []);
  const selectAllComets = useCallback(() => setComets(prev => prev.map(comet => ({ ...comet, active: true }))), []);
  const deselectAllComets = useCallback(() => setComets(prev => prev.map(comet => ({ ...comet, active: false }))), []);
  const clearFilters = useCallback(() => { setTypeFilter("All"); setClassFilter("All"); setEccentricityFilter("All"); setPerihelionFilter("All"); setPeriodFilter("All"); setSearchTerm(""); }, []);
  const toggleLabels = useCallback(() => setShowLabels(!showLabels), [showLabels]);
  const toggleOrbitalPlane = useCallback(() => setShowOrbitalPlane(!showOrbitalPlane), [showOrbitalPlane]);
  const toggleAxisMarkers = useCallback(() => setShowAxisMarkers(!showAxisMarkers), [showAxisMarkers]);
  const togglePlanetOrbits = useCallback(() => setShowPlanetOrbits(!showPlanetOrbits), [showPlanetOrbits]);
  const toggleKuiperBelt = useCallback(() => setShowKuiperBelt(!showKuiperBelt), [showKuiperBelt]);
  const toggleCometOrbits = useCallback(() => setShowCometOrbits(!showCometOrbits), [showCometOrbits]);
  const toggleTails = useCallback(() => setShowTails(!showTails), [showTails]);
  const toggleBloom = useCallback(() => setBloomEnabled(!bloomEnabled), [bloomEnabled]);
  const toggleSidebar = useCallback(() => setSidebarCollapsed(!sidebarCollapsed), [sidebarCollapsed]);
  const toggleLegend = useCallback(() => setLegendCollapsed(!legendCollapsed), [legendCollapsed]);
  const toggleControls = useCallback(() => setControlsCollapsed(!controlsCollapsed), [controlsCollapsed]);
  const toggleHUD = useCallback(() => { setHudVisible(!hudVisible); if (!hudVisible) setHudPosition({ x: 0, y: 0 }); }, [hudVisible]);

  const resetCamera = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.position.set(800, 600, 800);
      cameraRef.current.lookAt(0, 0, 0);
    }
  }, []);

  const zoomToComet = useCallback((id) => {
    const data = cometDataRef.current.get(id);
    if (!data || !data.position || !cameraRef.current || !controlsRef.current) return;
    const targetPosition = data.position.clone();
    const currentTarget = controlsRef.current.target.clone();
    const currentCameraPos = cameraRef.current.position.clone();
    const direction = currentCameraPos.clone().sub(currentTarget).normalize();
    const currentDistance = currentCameraPos.distanceTo(currentTarget);
    const desiredCameraPos = targetPosition.clone().add(direction.multiplyScalar(Math.min(currentDistance, 50)));

    new TWEEN.Tween(currentCameraPos).to(desiredCameraPos, 1000).easing(TWEEN.Easing.Quadratic.Out).onUpdate(() => cameraRef.current.position.copy(currentCameraPos)).start();
    new TWEEN.Tween(currentTarget).to(targetPosition, 1000).easing(TWEEN.Easing.Quadratic.Out).onUpdate(() => { controlsRef.current.target.copy(currentTarget); controlsRef.current.update(); }).start();
  }, []);

  useEffect(() => { document.body.className = `comet-theme-${theme}`; return () => { document.body.className = ""; }; }, [theme]);

  useEffect(() => {
    let filtered = comets.filter(comet => {
      const matchesSearch = comet.name.toLowerCase().includes(searchTerm.toLowerCase()) || (comet.fullName && comet.fullName.toLowerCase().includes(searchTerm.toLowerCase())) || (comet.designation && comet.designation.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesType = typeFilter === "All" || comet.cometType === typeFilter;
      const matchesClass = classFilter === "All" || comet.orbitClass === classFilter;
      let matchesEccentricity = true;
      if (eccentricityFilter !== "All") { const range = ECCENTRICITY_RANGES.find(r => r.label === eccentricityFilter); if (range && comet.eccentricity !== undefined) matchesEccentricity = comet.eccentricity >= range.min && comet.eccentricity < range.max; }
      let matchesPerihelion = true;
      if (perihelionFilter !== "All") { const range = PERIHELION_RANGES.find(r => r.label === perihelionFilter); if (range && comet.perihelion) matchesPerihelion = comet.perihelion >= range.min && comet.perihelion < range.max; }
      let matchesPeriod = true;
      if (periodFilter !== "All") { const range = PERIOD_RANGES.find(r => r.label === periodFilter); if (range) { if (range.min === -1) matchesPeriod = !comet.orbitalPeriod || comet.orbitalPeriod <= 0 || comet.eccentricity >= 1; else matchesPeriod = comet.orbitalPeriod >= range.min && comet.orbitalPeriod < range.max; } }
      return matchesSearch && matchesType && matchesClass && matchesEccentricity && matchesPerihelion && matchesPeriod;
    });

    filtered.sort((a, b) => {
      switch (sortOption) {
        case "name_asc": return a.name.localeCompare(b.name);
        case "name_desc": return b.name.localeCompare(a.name);
        case "year_desc": return (b.discoveryYear || 0) - (a.discoveryYear || 0);
        case "year_asc": return (a.discoveryYear || 0) - (b.discoveryYear || 0);
        case "perihelion_asc": return (a.perihelion || 999) - (b.perihelion || 999);
        case "perihelion_desc": return (b.perihelion || 0) - (a.perihelion || 0);
        case "type": return a.cometType.localeCompare(b.cometType);
        case "class": return (a.orbitClass || "").localeCompare(b.orbitClass || "");
        default: return 0;
      }
    });
    setFilteredComets(filtered);
  }, [comets, searchTerm, typeFilter, classFilter, eccentricityFilter, perihelionFilter, periodFilter, sortOption]);

  useEffect(() => {
    if (!mountRef.current) return;
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050508, 0.00002);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 50000);
    camera.position.set(800, 600, 800);
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

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      BLOOM_PARAMS.strength,
      BLOOM_PARAMS.radius,
      BLOOM_PARAMS.threshold
    );
    bloomPassRef.current = bloomPass;
    composer.addPass(bloomPass);

    const labelRenderer = document.createElement("div");
    labelRenderer.style.cssText = `position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 5;`;
    mountRef.current.appendChild(labelRenderer);
    labelRendererRef.current = labelRenderer;

    const ambientLight = new THREE.AmbientLight(0x606065, 0.5);
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

    const kuiperBelt = createKuiperBelt();
    kuiperBelt.visible = showKuiperBelt;
    scene.add(kuiperBelt);
    kuiperBeltRef.current = kuiperBelt;

    const cometGroup = new THREE.Group();
    scene.add(cometGroup);
    cometGroupRef.current = cometGroup;

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
      else if (starType < 0.8) { baseColor = { r: 1.0, g: 0.9, b: 0.7 }; intensity = 0.7 + Math.random() * 0.3; size = 1.2 + Math.random() * 0.8; }
      else { baseColor = { r: 1.0, g: 0.8, b: 0.6 }; intensity = 0.8 + Math.random() * 0.2; size = 1.5 + Math.random() * 1.0; }
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
          float coreBrightness = smoothstep(0.2, 0.0, distance) * 1.5;
          vec3 hdrColor = vColor * (1.0 + coreBrightness);
          gl_FragColor = vec4(hdrColor, alpha);
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
    controls.maxDistance = 15000;
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
    };

    window.addEventListener("resize", handleResize);
    composer.render();
    setSceneInitialized(true);

    return () => {
      if (mountRef.current && renderer.domElement) mountRef.current.removeChild(renderer.domElement);
      if (mountRef.current && labelRendererRef.current) mountRef.current.removeChild(labelRendererRef.current);
      Object.values(labelsRef.current).forEach(label => { if (label && label.element && label.element.parentNode) label.element.parentNode.removeChild(label.element); });
      window.removeEventListener("resize", handleResize);
      controls.dispose();
      scene.traverse(child => {
        if (child instanceof THREE.Mesh || child instanceof THREE.InstancedMesh) { if (child.geometry) child.geometry.dispose(); if (child.material) { if (Array.isArray(child.material)) child.material.forEach(mat => mat.dispose()); else child.material.dispose(); } }
        if (child instanceof THREE.Points) { if (child.geometry) child.geometry.dispose(); if (child.material) child.material.dispose(); }
      });
      composer.dispose();
      renderer.dispose();
    };
  }, []);

  useEffect(() => { if (sceneInitialized) { createCometTailSystems(); fetchCatalogData(); } }, [sceneInitialized, fetchCatalogData, createCometTailSystems]);

  useEffect(() => { if (eclipticGridRef.current) eclipticGridRef.current.visible = showEclipticGrid; }, [showEclipticGrid]);
  useEffect(() => { if (orbitalPlaneRef.current) orbitalPlaneRef.current.visible = showOrbitalPlane; }, [showOrbitalPlane]);
  useEffect(() => { if (distanceRingsRef.current) distanceRingsRef.current.visible = showDistanceRings; }, [showDistanceRings]);
  useEffect(() => { if (axisMarkersRef.current) axisMarkersRef.current.visible = showAxisMarkers; }, [showAxisMarkers]);
  useEffect(() => { if (planetOrbitsRef.current) planetOrbitsRef.current.visible = showPlanetOrbits; }, [showPlanetOrbits]);
  useEffect(() => { if (kuiperBeltRef.current) kuiperBeltRef.current.visible = showKuiperBelt; }, [showKuiperBelt]);

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
        if (!comets.find(c => c.id === cometId && c.active)) {
          if (label.element.parentNode) label.element.parentNode.removeChild(label.element);
          delete labelsRef.current[cometId];
        }
      }
    });
    comets.forEach(comet => {
      if (comet.active && !labelsRef.current[comet.id]) {
        const label = createLabel(comet.name, comet.color);
        labelsRef.current[comet.id] = label;
        if (labelRendererRef.current) labelRendererRef.current.appendChild(label.element);
      }
    });
  }, [comets, createLabel]);

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
        lastTime = time;
        frameCountRef.current++;
        timeRef.current = time * 0.001;
        
        if (backgroundStarsRef.current && backgroundStarsRef.current.material) backgroundStarsRef.current.material.uniforms.time.value = timeRef.current;
        
        fpsCounter++;
        if (time - lastFpsTime.current >= 1000) {
          actualFpsRef.current = Math.round(fpsCounter * 1000 / (time - lastFpsTime.current));
          setActualFps(actualFpsRef.current);
          fpsCounter = 0;
          lastFpsTime.current = time;
          if (rendererRef.current && rendererRef.current.info) {
            setPerformanceStats(prev => ({ ...prev, renderTime: Math.round(deltaTime * 100) / 100, memoryUsage: rendererRef.current.info.memory.geometries + rendererRef.current.info.memory.textures, triangles: rendererRef.current.info.render.triangles, drawCalls: rendererRef.current.info.render.calls, points: rendererRef.current.info.render.points, textures: rendererRef.current.info.memory.textures, geometries: rendererRef.current.info.memory.geometries }));
          }
        }
        
        if (comets.length > 0) {
          if (frameCountRef.current % PERFORMANCE_CONSTANTS.UPDATE_FREQUENCY === 0) {
            updateCometTails(timeRef.current);
            updateSpatialGrid();
          }
          updateLabels();
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
    return () => { if (animationId) cancelAnimationFrame(animationId); };
  }, [comets, showLabels, showTails, targetFps, bloomEnabled, updateLabels, updateCometTails, updateSpatialGrid]);

  const activeComets = comets.filter(c => c.active).length;
  const typeCounts = comets.reduce((acc, comet) => { if (comet.active) acc[comet.cometType] = (acc[comet.cometType] || 0) + 1; return acc; }, {});
  const classCounts = comets.reduce((acc, comet) => { if (comet.active) acc[comet.orbitClass] = (acc[comet.orbitClass] || 0) + 1; return acc; }, {});
  const { visibleItems, startIndex } = getVirtualScrollItems;

  return (
    <div className="dinoSatPageWrapper">
      <DinoLabsNav activePage={"sat"}/>
      <div className={`dinoSatCometCatalogContainer comet-theme-${theme}`}>
        <div className={`dinoSatCometSideBar ${sidebarCollapsed ? "dinoSatCometSideBarCollapsed" : ""}`}>
          {loading && (
            <div className="dinoSatCometSideBarLoadingContainer">
              <label>Loading Comet Data...</label>
              <div className="dinoSatCometSideBarLoadingBar"><div className="dinoSatCometSideBarLoadingBarAccent" /></div>
              <small>Fetching From NASA JPL SBDB...</small>
            </div>
          )}
          <div className="dinoSatCometSideBarHeader">
            <h1>{!sidebarCollapsed && <small>Comet Catalog</small>}</h1>
            {!sidebarCollapsed && (
              <>
                <div className="dinoSatCometSideBarThemeSelector">
                  <button className={`dinoSatCometSelectButton ${theme === "dark" ? "dinoSatCometButtonActive" : ""}`} onClick={() => setTheme("dark")}>Dark</button>
                  <button className={`dinoSatCometSelectButton ${theme === "neon" ? "dinoSatCometButtonActive" : ""}`} onClick={() => setTheme("neon")}>Neon</button>
                </div>
                <div className="dinoSatCometSideBarThemeSelector">
                  <div className="dinoSatCometSideBarThemeSelectorStatusIndicator">
                    Ready
                  </div>
                </div>
                <div className="dinoSatCometSideBarThemeSelector">
                  {errors.length > 0 && (
                    <div className="dinoSatCometSideBarThemeSelectorErrorIndicator" onClick={() => setShowErrors(!showErrors)} style={{ opacity: showErrors ? 1.0 : "", paddingTop: showErrors ? "" : 0, paddingBottom: showErrors ? "" : 0 }}>
                      <div className="dinoSatCometSideBarThemeSelectorErrorIndicatorHeader">
                        <span>API Errors ({errors.length})</span>
                        <button onClick={(e) => { e.stopPropagation(); copyAllErrors(); }} aria-label="Copy all errors"><FontAwesomeIcon icon={copiedErrors ? faSquareCheck : faClone} size="sm"/></button>
                      </div>
                      {showErrors && (<div className="dinoSatCometSideBarThemeSelectorErrorIndicatorList">{errors.map((error, index) => (<div key={index} style={{ opacity: 0.8 }}>{error}</div>))}</div>)}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          {!sidebarCollapsed && !loading && (
            <>
              <div className="dinoSatCometSearchControls">
                <input type="text" placeholder="Search comets..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="dinoSatCometSearchInput"/>
                <div className="dinoSatCometSelectControls">
                  <button className="dinoSatCometSelectButton" onClick={selectAllComets}>Select All</button>
                  <button className="dinoSatCometSelectButton" onClick={deselectAllComets}>Deselect All</button>
                  <button className="dinoSatCometSelectButton" onClick={fetchCatalogData}>Refresh</button>
                </div>
              </div>
              <div className="dinoSatCometObjectsHeader"><span className="dinoSatCometObjectsHeaderIcon"><FontAwesomeIcon icon={faMeteor} /></span><span>Comets ({comets.filter(c => c.active).length}/{comets.length})</span></div>
              <div ref={virtualScrollRef} className="dinoSatCometList comet-list" style={{ height: "400px", overflowY: "auto", position: "relative" }} onScroll={handleVirtualScroll}>
                <div style={{ height: filteredComets.length * PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT, position: "relative" }}>
                  <div style={{ position: "absolute", top: startIndex * PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT, width: "100%" }}>
                    {visibleItems.map((comet) => (
                      <div key={comet.id} className={`dinoSatCometListItem comet-item ${comet.active ? "dinoSatCometButtonActive" : ""} ${selectedComet === comet.id ? "comet-selected" : ""}`} style={{ height: PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT, minHeight: PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT }} onClick={() => { if (!comet.active) toggleComet(comet.id); setSelectedComet(comet.id); zoomToComet(comet.id); }}>
                        <div className="dinoSatCometIndicator" style={{ backgroundColor: comet.color }}/>
                        <div className="dinoSatCometInfo">
                          <div className="dinoSatCometName comet-name">{comet.name}</div>
                          <div className="dinoSatCometDetails"><small>{comet.cometType} | q={comet.perihelion?.toFixed(2) || "?"} AU | {comet.heliocentricDistance?.toFixed(2) || "?"} AU</small></div>
                        </div>
                        <label className="consoleSwitch"><input type="checkbox" checked={comet.active} onChange={() => toggleComet(comet.id)} /><span className="consoleSlider round"></span></label>
                        <button className="dinoSatCometInfoButton" onClick={(e) => { e.stopPropagation(); setDetailedComet(comet); setDetailedPosition({ x: 0, y: 0 }); }} aria-label="Show details"><FontAwesomeIcon icon={faInfoCircle} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="dinoSatCometMainView">
          <div className="dinonSatCometViewHeader">
            <div className="dinoSatCometCatalogControls">
              <select className="dinoSatCometFilterSelect" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}><option value="All">All Types</option>{Object.keys(COMET_TYPE_COLORS).map(type => (<option key={type} value={type}>{type}</option>))}</select>
              <select className="dinoSatCometFilterSelect" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}><option value="All">All Classes</option>{Object.keys(ORBIT_CLASS_COLORS).map(cls => (<option key={cls} value={cls}>{cls}</option>))}</select>
              <select className="dinoSatCometFilterSelect" value={eccentricityFilter} onChange={(e) => setEccentricityFilter(e.target.value)}><option value="All">All Eccentricities</option>{ECCENTRICITY_RANGES.map(range => (<option key={range.label} value={range.label}>{range.label}</option>))}</select>
              <select className="dinoSatCometFilterSelect" value={perihelionFilter} onChange={(e) => setPerihelionFilter(e.target.value)}><option value="All">All Perihelions</option>{PERIHELION_RANGES.map(range => (<option key={range.label} value={range.label}>{range.label}</option>))}</select>
              <select className="dinoSatCometFilterSelect" value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)}><option value="All">All Periods</option>{PERIOD_RANGES.map(range => (<option key={range.label} value={range.label}>{range.label}</option>))}</select>
              <select className="dinoSatCometFilterSelect" value={sortOption} onChange={(e) => setSortOption(e.target.value)}>{SORT_OPTIONS.map(option => (<option key={option.value} value={option.value}>{option.label}</option>))}</select>
              <button className="dinoSatCometCatalogControlsButton" onClick={clearFilters}>Clear Filters</button>
              <select className="dinoSatCometFPSSelect" value={targetFps} onChange={(e) => setTargetFps(Number(e.target.value))}>{FPS_OPTIONS.map(fps => (<option key={fps} value={fps}>{fps} FPS</option>))}</select>
              <div className="dinoSatCometCatalogControlsButton" onClick={toggleHUD}><FontAwesomeIcon icon={faChartLine} /> HUD</div>
              <button className="dinoSatCometCatalogControlsButton" onClick={exportJSON}>Export JSON</button>
              <button className="dinoSatCometCatalogControlsButton" onClick={exportCSV}>Export CSV</button>
            </div>
          </div>
          <div ref={mountRef} className="dinoSatCometCanvasContainer" />
          <div ref={legendPanelRef} className={`dinoSatCometLegendPanel ${legendCollapsed ? "comet-collapsed" : ""}`} style={{ transform: `translate(${legendPosition.x}px, ${legendPosition.y}px)`, cursor: isDraggingLegend ? "grabbing" : "grab" }} onMouseDown={handleLegendMouseDown} tabIndex={0}>
            <div className="dinoSatCometPanelHeader" onClick={handleLegendToggle}><small>Comet Types</small><span className="dinosatCometHeaderIcon"><FontAwesomeIcon icon={legendCollapsed ? faChevronDown : faChevronUp} /></span></div>
            {!legendCollapsed && (<div className="dinoSatCometPanelContent">{Object.entries(COMET_TYPE_COLORS).map(([type, color]) => (<div key={type} className="dinoSatCometLegendItem"><div className="dinoSatCometLegendColor" style={{ backgroundColor: color }} /><span>{type}</span></div>))}</div>)}
          </div>
          <div ref={controlsPanelRef} className={`dinoSatCometControlsPanel ${controlsCollapsed ? "comet-collapsed" : ""}`} style={{ transform: `translate(${controlsPosition.x}px, ${controlsPosition.y}px)`, cursor: isDraggingControls ? "grabbing" : "grab" }} onMouseDown={handleControlsMouseDown} tabIndex={0}>
            <div className="dinoSatCometPanelHeader" onClick={handleControlsToggle}><span>View Controls</span><span className="dinosatCometHeaderIcon"><FontAwesomeIcon icon={controlsCollapsed ? faChevronDown : faChevronUp} /></span></div>
            {!controlsCollapsed && (
              <div className="dinoSatCometPanelContent">
                <button className="dinoSatCometControlButton" onClick={resetCamera}>Reset Camera</button>
                <button className="dinoSatCometControlButton" onClick={toggleLabels}>{showLabels ? "Hide" : "Show"} Labels</button>
                <button className="dinoSatCometControlButton" onClick={toggleTails}>{showTails ? "Hide" : "Show"} Tails</button>
                <button className="dinoSatCometControlButton" onClick={toggleBloom}>{bloomEnabled ? "Disable" : "Enable"} Bloom</button>
                <button className="dinoSatCometControlButton" onClick={toggleAxisMarkers}>{showAxisMarkers ? "Hide" : "Show"} Axes</button>
                <button className="dinoSatCometControlButton" onClick={togglePlanetOrbits}>{showPlanetOrbits ? "Hide" : "Show"} Planet Orbits</button>
                <button className="dinoSatCometControlButton" onClick={toggleKuiperBelt}>{showKuiperBelt ? "Hide" : "Show"} Kuiper Belt</button>
                {bloomEnabled && (
                  <div className="dinoSatCometBloomControls">
                    <div className="dinoSatCometBloomSlider">
                      <span>Strength</span>
                      <input type="range" min="0" max="5" step="0.1" value={bloomStrength} onChange={(e) => setBloomStrength(parseFloat(e.target.value))} onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} />
                      <span>{bloomStrength.toFixed(1)}</span>
                    </div>
                    <div className="dinoSatCometBloomSlider">
                      <span>Radius</span>
                      <input type="range" min="0" max="2" step="0.05" value={bloomRadius} onChange={(e) => setBloomRadius(parseFloat(e.target.value))} onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} />
                      <span>{bloomRadius.toFixed(2)}</span>
                    </div>
                    <div className="dinoSatCometBloomSlider">
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
            <div ref={hudPanelRef} className="dinoSatCometHUDPanel" style={{ transform: `translate(calc(-50% + ${hudPosition.x}px), calc(-50% + ${hudPosition.y}px))`, cursor: isDraggingHud ? "grabbing" : "grab" }} onMouseDown={handleHudMouseDown} tabIndex={0}>
              <div className="dinoSatCometHUDPanelHeader"><span>Performance HUD - Drag To Move</span><button className="dinoSatCometCloseButton" onClick={toggleHUD}><FontAwesomeIcon icon={faSquareXmark} /></button></div>
              <div className="dinoSatCometHUDContent">
                <div className="dinosatCometHUDSection">
                  <h4 style={{ marginTop: 0 }}>Coordinate System</h4>
                  <div className="dinosatCometHUDSectionGrid">
                    <div className="dinosatCometHUDSectionItem"><span>Reference Frame:</span><span>Heliocentric Ecliptic</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>Epoch:</span><span>J2000.0</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>Origin:</span><span>Sun (Solar Barycenter)</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>X-Axis:</span><span>Vernal Equinox</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>Z-Axis:</span><span>North Ecliptic Pole</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>Units:</span><span>AU (Astronomical Units)</span></div>
                  </div>
                </div>
                <div className="dinosatCometHUDSection">
                  <h4>Post-Processing</h4>
                  <div className="dinosatCometHUDSectionGrid">
                    <div className="dinosatCometHUDSectionItem"><span>Bloom:</span><span style={{ color: bloomEnabled ? "#4ECDC4" : "#888888" }}>{bloomEnabled ? "Enabled" : "Disabled"}</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>Bloom Strength:</span><span>{bloomStrength.toFixed(2)}</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>Bloom Radius:</span><span>{bloomRadius.toFixed(2)}</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>Bloom Threshold:</span><span>{bloomThreshold.toFixed(2)}</span></div>
                  </div>
                </div>
                <div className="dinosatCometHUDSection">
                  <h4>Performance Metrics</h4>
                  <div className="dinosatCometHUDSectionGrid">
                    <div className="dinosatCometHUDSectionItem"><span>Render Time:</span><span>{performanceStats.renderTime}ms</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>Target FPS:</span><span>{targetFps}</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>Actual FPS:</span><span>{actualFps}</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>Draw Calls:</span><span>{performanceStats.drawCalls}</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>Visible Comets:</span><span style={{ color: "#00ff00" }}>{performanceStats.visibleComets}</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>Culled Comets:</span><span style={{ color: "#ffaa00" }}>{performanceStats.culledComets}</span></div>
                  </div>
                </div>
                <div className="dinosatCometHUDSection">
                  <h4>Data Status</h4>
                  <div className="dinosatCometHUDSectionGrid">
                    <div className="dinosatCometHUDSectionItem"><span>Active Comets:</span><span>{activeComets}</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>Total Objects:</span><span>{comets.length}</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>Data Source:</span><span>NASA JPL SBDB</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>NEO Count:</span><span style={{ color: "#ffaa00" }}>{loadingMetadata?.neoCount || 0}</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>Active Tails:</span><span style={{ color: "#4ECDC4" }}>{loadingMetadata?.activeCount || 0}</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>API Errors:</span><span style={{ color: errors.length > 0 ? "#ff8844" : "#00ff00" }}>{errors.length}</span></div>
                  </div>
                </div>
                <div className="dinosatCometHUDSection">
                  <h4>Earth Position (Ecliptic)</h4>
                  <div className="dinosatCometHUDSectionGrid">
                    <div className="dinosatCometHUDSectionItem"><span>X:</span><span>{loadingMetadata?.earthPosition?.x?.toFixed(4) || "N/A"} AU</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>Y:</span><span>{loadingMetadata?.earthPosition?.y?.toFixed(4) || "N/A"} AU</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>Z:</span><span>{loadingMetadata?.earthPosition?.z?.toFixed(4) || "N/A"} AU</span></div>
                  </div>
                </div>
                <div className="dinosatCometHUDSection">
                  <h4>Comet Type Distribution</h4>
                  <div className="dinosatCometHUDSectionGrid">
                    {Object.entries(typeCounts).slice(0, 8).map(([type, count]) => (<div key={type} className="dinosatCometHUDSectionItem"><span style={{ color: COMET_TYPE_COLORS[type] }}>{type}:</span><span>{count}</span></div>))}
                  </div>
                </div>
              </div>
            </div>
          )}
          {detailedComet && (
            <div ref={detailedPanelRef} className="dinoSatCometDetailedPanel" style={{ transform: `translate(calc(-50% + ${detailedPosition.x}px), calc(-50% + ${detailedPosition.y}px))`, cursor: isDraggingDetailed ? "grabbing" : "grab" }} onMouseDown={handleDetailedMouseDown} tabIndex={0}>
              <div className="dinoSatCometHUDPanelHeader"><span>{detailedComet.name}</span><button className="dinoSatCometCloseButton" onClick={() => setDetailedComet(null)}><FontAwesomeIcon icon={faSquareXmark} /></button></div>
              <div className="dinoSatCometHUDContent">
                <div className="dinosatCometHUDSection">
                  <h4>Identification</h4>
                  <div className="dinosatCometHUDSectionGrid">
                    <div className="dinosatCometHUDSectionItem"><span>Name:</span><span>{detailedComet.name}</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>Designation:</span><span>{detailedComet.designation || "N/A"}</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>Full Name:</span><span>{detailedComet.fullName || "N/A"}</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>Comet Type:</span><span style={{ color: detailedComet.color }}>{detailedComet.cometType}</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>Orbit Class:</span><span style={{ color: detailedComet.classColor }}>{detailedComet.orbitClass}</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>Data Source:</span><span>{detailedComet.source}</span></div>
                  </div>
                </div>
                <div className="dinosatCometHUDSection">
                  <h4>Observational Data (Geocentric)</h4>
                  <div className="dinosatCometHUDSectionGrid">
                    <div className="dinosatCometHUDSectionItem"><span>Right Ascension:</span><span>{detailedComet.rightAscensionHMS || "N/A"}</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>Declination:</span><span>{detailedComet.declinationDMS || "N/A"}</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>RA (deg):</span><span>{detailedComet.rightAscension?.toFixed(4) || "N/A"}</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>Dec (deg):</span><span>{detailedComet.declination?.toFixed(4) || "N/A"}</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>Geocentric Dist:</span><span>{detailedComet.geocentricDistance?.toFixed(4) || "N/A"} AU</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>Elongation:</span><span>{detailedComet.elongation?.toFixed(1) || "N/A"}</span></div>
                  </div>
                </div>
                <div className="dinosatCometHUDSection">
                  <h4>Activity and Tail Data</h4>
                  <div className="dinosatCometHUDSectionGrid">
                    <div className="dinosatCometHUDSectionItem"><span>Currently Active:</span><span style={{ color: detailedComet.isActive ? "#4ECDC4" : "#888888" }}>{detailedComet.isActive ? "Yes" : "No"}</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>Activity Factor:</span><span>{(detailedComet.activityFactor * 100)?.toFixed(1) || "0"}%</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>Tail Length:</span><span>{detailedComet.tailLength?.toFixed(3) || "0"} AU</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>Ion Tail Intensity:</span><span>{(detailedComet.ionTailIntensity * 100)?.toFixed(1) || "0"}%</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>Dust Tail Intensity:</span><span>{(detailedComet.dustTailIntensity * 100)?.toFixed(1) || "0"}%</span></div>
                  </div>
                </div>
                <div className="dinosatCometHUDSection">
                  <h4>Current Heliocentric Position</h4>
                  <div className="dinosatCometHUDSectionGrid">
                    <div className="dinosatCometHUDSectionItem"><span>X (AU):</span><span>{(detailedComet.computedX ?? detailedComet.heliocentricX)?.toFixed(6) || "N/A"}</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>Y (AU):</span><span>{(detailedComet.computedY ?? detailedComet.heliocentricY)?.toFixed(6) || "N/A"}</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>Z (AU):</span><span>{(detailedComet.computedZ ?? detailedComet.heliocentricZ)?.toFixed(6) || "N/A"}</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>Distance (AU):</span><span>{detailedComet.heliocentricDistance?.toFixed(6) || "N/A"}</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>True Anomaly:</span><span>{detailedComet.trueAnomaly ? `${detailedComet.trueAnomaly.toFixed(2)}` : "N/A"}</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>Current Velocity:</span><span>{detailedComet.currentVelocity ? `${detailedComet.currentVelocity.toFixed(2)} km/s` : "N/A"}</span></div>
                  </div>
                </div>
                <div className="dinosatCometHUDSection">
                  <h4>Orbital Elements (J2000)</h4>
                  <div className="dinosatCometHUDSectionGrid">
                    <div className="dinosatCometHUDSectionItem"><span>Semi-Major Axis (a):</span><span>{detailedComet.semiMajorAxis ? `${detailedComet.semiMajorAxis} AU` : detailedComet.eccentricity >= 1 ? "N/A (Hyperbolic)" : "N/A"}</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>Eccentricity (e):</span><span>{detailedComet.eccentricity?.toFixed(8) || "N/A"}</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>Perihelion (q):</span><span>{detailedComet.perihelion ? `${detailedComet.perihelion} AU` : "N/A"}</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>Aphelion (Q):</span><span>{detailedComet.aphelion ? `${detailedComet.aphelion} AU` : detailedComet.eccentricity >= 1 ? "Infinity (Hyperbolic)" : "N/A"}</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>Inclination (i):</span><span>{detailedComet.inclination ? `${detailedComet.inclination}` : "N/A"}</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>Long. Asc. Node:</span><span>{detailedComet.longAscNode ? `${detailedComet.longAscNode}` : "N/A"}</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>Arg. Perihelion:</span><span>{detailedComet.argPerihelion ? `${detailedComet.argPerihelion}` : "N/A"}</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>Mean Anomaly (M):</span><span>{detailedComet.meanAnomaly ? `${detailedComet.meanAnomaly}` : "N/A"}</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>Time of Perihelion:</span><span>{detailedComet.timePerihelionJD ? `JD ${detailedComet.timePerihelionJD}` : "N/A"}</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>Orbital Period:</span><span>{detailedComet.orbitalPeriod ? `${detailedComet.orbitalPeriod.toFixed(4)} years` : detailedComet.eccentricity >= 1 ? "Non-periodic" : "N/A"}</span></div>
                  </div>
                </div>
                <div className="dinosatCometHUDSection">
                  <h4>Physical Properties</h4>
                  <div className="dinosatCometHUDSectionGrid">
                    <div className="dinosatCometHUDSectionItem"><span>Absolute Mag (H):</span><span>{detailedComet.absoluteMagnitude?.toFixed(2) || "N/A"}</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>Diameter:</span><span>{detailedComet.diameter ? `${detailedComet.diameter} km` : "N/A"}</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>Albedo:</span><span>{detailedComet.albedo?.toFixed(4) || "N/A"}</span></div>
                  </div>
                </div>
                <div className="dinosatCometHUDSection">
                  <h4>Close Approach and Dynamics</h4>
                  <div className="dinosatCometHUDSectionGrid">
                    <div className="dinosatCometHUDSectionItem"><span>MOID (Earth):</span><span>{detailedComet.moid ? `${detailedComet.moid} AU` : "N/A"}</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>Tisserand (Jupiter):</span><span>{detailedComet.tisserandParameter?.toFixed(4) || "N/A"}</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>Near-Earth Object:</span><span style={{ color: detailedComet.isNEO ? "#ffaa00" : "#00ff00" }}>{detailedComet.isNEO ? "Yes" : "No"}</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>Potentially Hazardous:</span><span style={{ color: detailedComet.isPHA ? "#ff8844" : "#00ff00" }}>{detailedComet.isPHA ? "Yes" : "No"}</span></div>
                  </div>
                </div>
                <div className="dinosatCometHUDSection">
                  <h4>Observation Data</h4>
                  <div className="dinosatCometHUDSectionGrid">
                    <div className="dinosatCometHUDSectionItem"><span>Discovery Year:</span><span>{detailedComet.discoveryYear || "Unknown"}</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>First Observation:</span><span>{detailedComet.firstObservation || "Unknown"}</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>Last Observation:</span><span>{detailedComet.lastObservation || "Unknown"}</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>Observation Count:</span><span>{detailedComet.observationCount || "Unknown"}</span></div>
                    <div className="dinosatCometHUDSectionItem"><span>Data Arc:</span><span>{detailedComet.dataArcDays ? `${detailedComet.dataArcDays} days` : "Unknown"}</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}