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
  faChartLine, faChevronDown, faChevronUp, faStar,
  faGlobe, faArrowLeft, faRocket, faCompass,
  faEarthAmericas, faSun, faCircle
} from "@fortawesome/free-solid-svg-icons";
import DinoLabsNav from "../../../helpers/Nav.jsx";
import "../../../styles/helperStyles/Switch.css";
import "../../../styles/mainStyles/DinoSat/DinoSatCatalogs/Exoplanets/ExoplanetCatalog.css";

export default function ExoplanetCatalog() {
  const PLANET_TYPE_COLORS = {
    "Rocky": "#8B4513",
    "Super-Earth": "#CD853F",
    "Mini-Neptune": "#4169E1",
    "Gas Giant": "#FF6347",
    "Ice Giant": "#00CED1",
    "Hot Jupiter": "#FFD700",
    "Terrestrial": "#228B22",
    "Ocean World": "#0077BE",
    "Lava World": "#DC143C",
    "Desert World": "#D2B48C",
    "Unknown": "#888888"
  };

  const DISCOVERY_METHOD_COLORS = {
    "Transit": "#FF6B6B",
    "Radial Velocity": "#4ECDC4",
    "Direct Imaging": "#45B7D1",
    "Microlensing": "#96CEB4",
    "Astrometry": "#FFEAA7",
    "Transit Timing Variation": "#DDA0DD",
    "Pulsar Timing": "#98D8C8",
    "Orbital Brightness Modulation": "#F7DC6F",
    "Eclipse Timing Variation": "#E6B0AA",
    "Disk Kinematics": "#AED6F1",
    "Pulsation Timing Variation": "#D7BDE2",
    "Unknown": "#888888"
  };

  const SPECTRAL_TYPE_COLORS = {
    "O": "#9bb0ff",
    "B": "#aabfff",
    "A": "#cad7ff",
    "F": "#f8f7ff",
    "G": "#fff4ea",
    "K": "#ffd2a1",
    "M": "#ffcc6f",
    "L": "#ff8c00",
    "T": "#ff4500",
    "Y": "#8b0000",
    "Unknown": "#888888"
  };

  const SPECTRAL_TYPE_SIZES = {
    "O": 2.5,
    "B": 2.2,
    "A": 1.8,
    "F": 1.5,
    "G": 1.2,
    "K": 1.0,
    "M": 0.7,
    "L": 0.5,
    "T": 0.4,
    "Y": 0.3,
    "Unknown": 1.0
  };

  const RADIUS_RANGES = [
    { label: "Sub-Earth (0-0.8 R⊕)", min: 0, max: 0.8 },
    { label: "Earth-like (0.8-1.2 R⊕)", min: 0.8, max: 1.2 },
    { label: "Super-Earth (1.2-2.5 R⊕)", min: 1.2, max: 2.5 },
    { label: "Mini-Neptune (2.5-4 R⊕)", min: 2.5, max: 4 },
    { label: "Neptune-like (4-6 R⊕)", min: 4, max: 6 },
    { label: "Sub-Saturn (6-10 R⊕)", min: 6, max: 10 },
    { label: "Jupiter-like (10+ R⊕)", min: 10, max: 100 }
  ];

  const DISTANCE_RANGES = [
    { label: "Very Close (0-25 ly)", min: 0, max: 25 },
    { label: "Close (25-100 ly)", min: 25, max: 100 },
    { label: "Moderate (100-500 ly)", min: 100, max: 500 },
    { label: "Far (500-2000 ly)", min: 500, max: 2000 },
    { label: "Very Far (2000+ ly)", min: 2000, max: 100000 }
  ];

  const PERIOD_RANGES = [
    { label: "Ultra-Short (<1 day)", min: 0, max: 1 },
    { label: "Short (1-10 days)", min: 1, max: 10 },
    { label: "Medium (10-100 days)", min: 10, max: 100 },
    { label: "Earth-like (100-500 days)", min: 100, max: 500 },
    { label: "Long (500-5000 days)", min: 500, max: 5000 },
    { label: "Very Long (5000+ days)", min: 5000, max: 1000000 }
  ];

  const SORT_OPTIONS = [
    { label: "Distance (Near to Far)", value: "distance_asc" },
    { label: "Distance (Far to Near)", value: "distance_desc" },
    { label: "Name (A-Z)", value: "name_asc" },
    { label: "Name (Z-A)", value: "name_desc" },
    { label: "Discovery Year (Recent)", value: "year_desc" },
    { label: "Discovery Year (Oldest)", value: "year_asc" },
    { label: "Radius (Large to Small)", value: "radius_desc" },
    { label: "Radius (Small to Large)", value: "radius_asc" },
    { label: "ESI (Most Earth-like)", value: "esi_desc" },
    { label: "Planet Type", value: "type" },
    { label: "Discovery Method", value: "method" }
  ];

  const FPS_OPTIONS = [30, 60, 120, 144];

  const NOTABLE_TOURS = [
    { id: "trappist-1", name: "TRAPPIST-1", description: "7 Earth-sized planets" },
    { id: "proxima-centauri", name: "Proxima Centauri", description: "Nearest exoplanet" },
    { id: "kepler-90", name: "Kepler-90", description: "8-planet system" },
    { id: "55-cancri", name: "55 Cancri", description: "5-planet system" },
    { id: "tau-ceti", name: "Tau Ceti", description: "Sun-like nearby star" },
    { id: "toi-700", name: "TOI-700", description: "TESS Earth-sized HZ planet" }
  ];

  const PERFORMANCE_CONSTANTS = {
    MAX_VISIBLE_PLANETS: 5000,
    UPDATE_FREQUENCY: 1,
    FRUSTUM_MARGIN: 1.2,
    PRESELECT_COUNT: 100,
    VIRTUAL_SCROLL_ITEM_HEIGHT: 50,
    VIRTUAL_SCROLL_BUFFER: 10,
    PLANET_SIZE_MULTIPLIER: 2.0,
    SCALE_FACTOR: 0.15,
    LOG_BASE: 10,
    SYSTEM_VIEW_SCALE: 50,
    ORBIT_SEGMENTS: 128
  };

  const BLOOM_PARAMS = {
    strength: 0.6,
    radius: 0.3,
    threshold: 0.3
  };

  const NON_BLOOM_LAYER = 1;

  const EARTH_RADIUS_KM = 6371;
  const JUPITER_RADIUS_KM = 69911;

  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [errors, setErrors] = useState([]);
  const [showErrors, setShowErrors] = useState(false);
  const [copiedErrors, setCopiedErrors] = useState(false);
  const [loadingMetadata, setLoadingMetadata] = useState(null);
  const [planets, setPlanets] = useState([]);
  const [filteredPlanets, setFilteredPlanets] = useState([]);
  const [notableSystems, setNotableSystems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [methodFilter, setMethodFilter] = useState("All");
  const [radiusFilter, setRadiusFilter] = useState("All");
  const [distanceFilter, setDistanceFilter] = useState("All");
  const [periodFilter, setPeriodFilter] = useState("All");
  const [spectralFilter, setSpectralFilter] = useState("All");
  const [sortOption, setSortOption] = useState("distance_asc");
  const [targetFps, setTargetFps] = useState(60);
  const [actualFps, setActualFps] = useState(60);
  const [showLabels, setShowLabels] = useState(true);
  const [showEquatorialGrid, setShowEquatorialGrid] = useState(true);
  const [showCelestialPlane, setShowCelestialPlane] = useState(true);
  const [showDistanceShells, setShowDistanceShells] = useState(true);
  const [showAxisMarkers, setShowAxisMarkers] = useState(true);
  const [showGalacticPlane, setShowGalacticPlane] = useState(false);
  const [showConstellationBounds, setShowConstellationBounds] = useState(false);
  const [showStarColors, setShowStarColors] = useState(true);
  const [showOrbits, setShowOrbits] = useState(true);
  const [showHabitableZone, setShowHabitableZone] = useState(true);
  const [showComparisonGhosts, setShowComparisonGhosts] = useState(false);
  const [animateOrbits, setAnimateOrbits] = useState(true);
  const [bloomEnabled, setBloomEnabled] = useState(true);
  const [bloomStrength, setBloomStrength] = useState(BLOOM_PARAMS.strength);
  const [bloomRadius, setBloomRadius] = useState(BLOOM_PARAMS.radius);
  const [bloomThreshold, setBloomThreshold] = useState(BLOOM_PARAMS.threshold);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [legendCollapsed, setLegendCollapsed] = useState(false);
  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  const [toursCollapsed, setToursCollapsed] = useState(true);
  const [hudVisible, setHudVisible] = useState(false);
  const [detailedPlanet, setDetailedPlanet] = useState(null);
  const [selectedPlanet, setSelectedPlanet] = useState(null);
  const [systemViewPlanet, setSystemViewPlanet] = useState(null);
  const [viewMode, setViewMode] = useState("galaxy");
  const [theme, setTheme] = useState("dark");
  const [sceneInitialized, setSceneInitialized] = useState(false);
  const [orbitTime, setOrbitTime] = useState(0);
  const [performanceStats, setPerformanceStats] = useState({
    renderTime: 0,
    memoryUsage: 0,
    triangles: 0,
    drawCalls: 0,
    points: 0,
    textures: 0,
    geometries: 0,
    visiblePlanets: 0,
    culledPlanets: 0
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
  const planetGroupRef = useRef(null);
  const systemGroupRef = useRef(null);
  const frameCountRef = useRef(0);
  const lastFpsTime = useRef(0);
  const actualFpsRef = useRef(60);
  const equatorialGridRef = useRef(null);
  const celestialPlaneRef = useRef(null);
  const distanceShellsRef = useRef(null);
  const axisMarkersRef = useRef(null);
  const galacticPlaneRef = useRef(null);
  const constellationBoundsRef = useRef(null);
  const hudPanelRef = useRef(null);
  const legendPanelRef = useRef(null);
  const controlsPanelRef = useRef(null);
  const detailedPanelRef = useRef(null);
  const controlsRef = useRef(null);
  const backgroundStarsRef = useRef(null);
  const virtualScrollRef = useRef(null);
  const planetInstanceRef = useRef(null);
  const starInstanceRef = useRef(null);
  const planetDataRef = useRef(new Map());
  const labelsRef = useRef({});
  const visiblePlanetsRef = useRef(new Set());
  const frustumRef = useRef(new THREE.Frustum());
  const tempMatrix = useRef(new THREE.Matrix4());
  const tempQuaternion = useRef(new THREE.Quaternion());
  const tempColor = useRef(new THREE.Color());
  const orbitLinesRef = useRef([]);
  const habitableZoneRef = useRef(null);
  const systemStarRef = useRef(null);
  const systemPlanetsRef = useRef([]);
  const comparisonGhostsRef = useRef({ earth: null, jupiter: null });
  const orbitTimeRef = useRef(0);
  const systemScaleRef = useRef(PERFORMANCE_CONSTANTS.SYSTEM_VIEW_SCALE);

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

  const solveKepler = useCallback((M, e, tolerance = 1e-8, maxIter = 100) => {
    let E = M;
    for (let i = 0; i < maxIter; i++) {
      const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
      E -= dE;
      if (Math.abs(dE) < tolerance) break;
    }
    return E;
  }, []);

  const getOrbitalPosition = useCallback((a, e, i, omega, time, period) => {
    if (!a || !period || period <= 0) return new THREE.Vector3(a || 1, 0, 0);
    
    const ecc = e || 0;
    const inc = (i || 0) * Math.PI / 180;
    const w = (omega || 0) * Math.PI / 180;
    
    const M = (2 * Math.PI * time / period) % (2 * Math.PI);
    const E = solveKepler(M, ecc);
    
    const x = a * (Math.cos(E) - ecc);
    const y = a * Math.sqrt(1 - ecc * ecc) * Math.sin(E);
    
    const xRot = x * Math.cos(w) - y * Math.sin(w);
    const yRot = x * Math.sin(w) + y * Math.cos(w);
    
    const xFinal = xRot;
    const yFinal = yRot * Math.cos(inc);
    const zFinal = yRot * Math.sin(inc);
    
    return new THREE.Vector3(xFinal, zFinal, yFinal);
  }, [solveKepler]);

  const createOrbitLine = useCallback((a, e, i, omega, color, scale) => {
    if (!a || a <= 0) return null;
    
    const dynamicScale = scale || PERFORMANCE_CONSTANTS.SYSTEM_VIEW_SCALE;
    const ecc = e || 0;
    const inc = (i || 0) * Math.PI / 180;
    const w = (omega || 0) * Math.PI / 180;
    
    const points = [];
    const segments = PERFORMANCE_CONSTANTS.ORBIT_SEGMENTS;
    
    for (let j = 0; j <= segments; j++) {
      const theta = (j / segments) * 2 * Math.PI;
      const r = a * (1 - ecc * ecc) / (1 + ecc * Math.cos(theta));
      
      const x = r * Math.cos(theta);
      const y = r * Math.sin(theta);
      
      const xRot = x * Math.cos(w) - y * Math.sin(w);
      const yRot = x * Math.sin(w) + y * Math.cos(w);
      
      const xFinal = xRot;
      const yFinal = yRot * Math.cos(inc);
      const zFinal = yRot * Math.sin(inc);
      
      points.push(new THREE.Vector3(
        xFinal * dynamicScale,
        zFinal * dynamicScale,
        yFinal * dynamicScale
      ));
    }
    
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: color || 0x4488ff,
      transparent: true,
      opacity: 0.6
    });
    
    return new THREE.Line(geometry, material);
  }, []);

  const createHabitableZoneRing = useCallback((innerRadius, outerRadius, scale) => {
    if (!innerRadius || !outerRadius) return null;
    
    const dynamicScale = scale || PERFORMANCE_CONSTANTS.SYSTEM_VIEW_SCALE;
    const innerScaled = innerRadius * dynamicScale;
    const outerScaled = outerRadius * dynamicScale;
    
    const geometry = new THREE.RingGeometry(innerScaled, outerScaled, 64);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide
    });
    
    const ring = new THREE.Mesh(geometry, material);
    ring.rotation.x = -Math.PI / 2;
    
    return ring;
  }, []);

  const createGasGiantShader = useCallback(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        baseColor: { value: new THREE.Color(0xff6347) },
        bandColor: { value: new THREE.Color(0xffaa77) }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 baseColor;
        uniform vec3 bandColor;
        varying vec2 vUv;
        varying vec3 vNormal;
        void main() {
          float bands = sin(vUv.y * 20.0 + time * 0.5) * 0.5 + 0.5;
          bands = smoothstep(0.3, 0.7, bands);
          vec3 color = mix(baseColor, bandColor, bands);
          float light = dot(vNormal, normalize(vec3(1.0, 1.0, 1.0))) * 0.5 + 0.5;
          float hdrBoost = 1.5;
          gl_FragColor = vec4(color * light * hdrBoost, 1.0);
        }
      `
    });
  }, []);

  const createLavaWorldShader = useCallback(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec2 vUv;
        varying vec3 vNormal;
        
        float noise(vec2 p) {
          return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }
        
        void main() {
          vec3 darkRock = vec3(0.15, 0.1, 0.1);
          vec3 lavaGlow = vec3(1.0, 0.3, 0.0);
          
          float n = noise(vUv * 10.0 + time * 0.1);
          float cracks = smoothstep(0.4, 0.5, n);
          
          vec3 color = mix(darkRock, lavaGlow, cracks * 0.8);
          float light = dot(vNormal, normalize(vec3(1.0, 1.0, 1.0))) * 0.3 + 0.7;
          float hdrBoost = 1.0 + cracks * 3.0;
          
          gl_FragColor = vec4(color * light * hdrBoost, 1.0);
        }
      `
    });
  }, []);

  const createOceanWorldShader = useCallback(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        
        void main() {
          vec3 deepOcean = vec3(0.0, 0.2, 0.5);
          vec3 shallowOcean = vec3(0.0, 0.5, 0.7);
          
          float wave = sin(vUv.x * 30.0 + time) * sin(vUv.y * 30.0 + time * 0.7) * 0.5 + 0.5;
          vec3 color = mix(deepOcean, shallowOcean, wave * 0.3);
          
          vec3 viewDir = normalize(vViewPosition);
          float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 3.0);
          color += vec3(0.3, 0.5, 0.7) * fresnel * 0.5;
          
          float light = dot(vNormal, normalize(vec3(1.0, 1.0, 1.0))) * 0.5 + 0.5;
          float hdrBoost = 1.2 + fresnel * 0.5;
          gl_FragColor = vec4(color * light * hdrBoost, 1.0);
        }
      `
    });
  }, []);

  const createIceGiantShader = useCallback(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec2 vUv;
        varying vec3 vNormal;
        
        void main() {
          vec3 iceBlue = vec3(0.4, 0.7, 0.9);
          vec3 deepBlue = vec3(0.1, 0.3, 0.6);
          
          float bands = sin(vUv.y * 15.0 + time * 0.3) * 0.5 + 0.5;
          vec3 color = mix(deepBlue, iceBlue, bands * 0.5);
          
          float light = dot(vNormal, normalize(vec3(1.0, 1.0, 1.0))) * 0.5 + 0.5;
          float hdrBoost = 1.3;
          gl_FragColor = vec4(color * light * hdrBoost, 1.0);
        }
      `
    });
  }, []);

  const getPlanetMaterial = useCallback((planetType, isSystemView = false) => {
    if (!isSystemView) {
      return new THREE.MeshBasicMaterial({
        color: PLANET_TYPE_COLORS[planetType] || "#888888",
        transparent: true,
        opacity: 0.95
      });
    }
    
    switch (planetType) {
      case "Gas Giant":
      case "Hot Jupiter":
        return createGasGiantShader();
      case "Lava World":
        return createLavaWorldShader();
      case "Ocean World":
        return createOceanWorldShader();
      case "Ice Giant":
        return createIceGiantShader();
      default:
        return new THREE.MeshStandardMaterial({
          color: PLANET_TYPE_COLORS[planetType] || "#888888",
          roughness: 0.8,
          metalness: 0.1
        });
    }
  }, [createGasGiantShader, createLavaWorldShader, createOceanWorldShader, createIceGiantShader]);

  const calculateScaledDistance = useCallback((distanceLy) => {
    if (!distanceLy || distanceLy <= 0) return 1;
    const logDist = Math.log10(distanceLy + 1);
    return logDist * PERFORMANCE_CONSTANTS.SCALE_FACTOR * 100;
  }, []);

  const calculatePlanetPosition = useCallback((ra, dec, distanceLy) => {
    const raRad = (ra * Math.PI) / 180;
    const decRad = (dec * Math.PI) / 180;
    const scaledDistance = calculateScaledDistance(distanceLy);
    const x = scaledDistance * Math.cos(decRad) * Math.cos(raRad);
    const y = scaledDistance * Math.sin(decRad);
    const z = -scaledDistance * Math.cos(decRad) * Math.sin(raRad);
    return new THREE.Vector3(x, y, z);
  }, [calculateScaledDistance]);

  const getPlanetSize = (radius) => {
    if (!radius || isNaN(radius)) radius = 1.0;
    const baseSize = 0.8;
    const scaleFactor = 0.4;
    const sizeFactor = Math.log10(radius + 1) + 1;
    return Math.max(0.15, Math.min(6.0, baseSize * sizeFactor * scaleFactor)) * PERFORMANCE_CONSTANTS.PLANET_SIZE_MULTIPLIER;
  };

  const getSystemPlanetSize = (radiusRe) => {
    if (!radiusRe || isNaN(radiusRe)) radiusRe = 1.0;
    return Math.max(0.3, Math.min(5.0, radiusRe * 0.5));
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
    const colorHex = typeof color === "number" ? `#${color.toString(16).padStart(6, "0")}` : color;
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
    sprite.layers.set(NON_BLOOM_LAYER);
    return sprite;
  };

  const createEquatorialGrid = () => {
    const group = new THREE.Group();
    group.name = "EquatorialGrid";
    const gridColor = 0x3a4550;
    const majorGridColor = 0x4a5a68;

    const distances = [10, 25, 50, 100, 250, 500, 1000, 2500];
    distances.forEach((dist, idx) => {
      const scaledRadius = calculateScaledDistance(dist);
      const segments = 128;
      const points = [];
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(
          scaledRadius * Math.cos(theta),
          0,
          scaledRadius * Math.sin(theta)
        ));
      }
      const tubeRadius = idx % 2 === 0 ? 0.12 : 0.05;
      const tubeGeometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, true), 128, tubeRadius, 6, true);
      const tubeMaterial = new THREE.MeshBasicMaterial({
        color: idx % 2 === 0 ? majorGridColor : gridColor,
        transparent: true,
        opacity: idx % 2 === 0 ? 0.5 : 0.3
      });
      const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
      group.add(tube);
    });

    for (let angle = 0; angle < 360; angle += 30) {
      const angleRad = (angle * Math.PI) / 180;
      const innerRadius = calculateScaledDistance(5);
      const outerRadius = calculateScaledDistance(3000);
      const points = [
        new THREE.Vector3(innerRadius * Math.cos(angleRad), 0, innerRadius * Math.sin(angleRad)),
        new THREE.Vector3(outerRadius * Math.cos(angleRad), 0, outerRadius * Math.sin(angleRad))
      ];
      const tubeRadius = angle % 90 === 0 ? 0.12 : 0.05;
      const tubeGeometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, false), 32, tubeRadius, 6, false);
      const tubeMaterial = new THREE.MeshBasicMaterial({
        color: angle % 90 === 0 ? majorGridColor : gridColor,
        transparent: true,
        opacity: angle % 90 === 0 ? 0.4 : 0.25
      });
      const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
      group.add(tube);
    }

    return group;
  };

  const createCelestialPlane = () => {
    const group = new THREE.Group();
    group.name = "CelestialPlane";
    const outerRadius = calculateScaledDistance(3000);

    const planeGeometry = new THREE.RingGeometry(calculateScaledDistance(5), outerRadius, 128);
    const planeMaterial = new THREE.MeshBasicMaterial({
      color: 0x4a5a68,
      transparent: true,
      opacity: 0.06,
      side: THREE.DoubleSide
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    group.add(plane);

    return group;
  };

  const createDistanceShells = () => {
    const group = new THREE.Group();
    group.name = "DistanceShells";
    const distances = [10, 50, 100, 500, 1000];
    const labels = ["10 ly", "50 ly", "100 ly", "500 ly", "1000 ly"];
    const colors = [0x4a8a4a, 0x6a8a5a, 0x8a8a5a, 0x8a7a5a, 0x8a6a5a];

    distances.forEach((dist, index) => {
      const scaledRadius = calculateScaledDistance(dist);
      const points = [];
      for (let i = 0; i <= 64; i++) {
        const theta = (i / 64) * Math.PI * 2;
        points.push(new THREE.Vector3(
          scaledRadius * Math.cos(theta),
          0,
          scaledRadius * Math.sin(theta)
        ));
      }
      const tubeGeometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, true), 64, 0.12, 6, true);
      const tubeMaterial = new THREE.MeshBasicMaterial({
        color: colors[index],
        transparent: true,
        opacity: 0.5
      });
      const ring = new THREE.Mesh(tubeGeometry, tubeMaterial);
      group.add(ring);

      const angle = (index * 25 + 10) * Math.PI / 180;
      const labelPosition = new THREE.Vector3(
        (scaledRadius + 3) * Math.cos(angle),
        2,
        (scaledRadius + 3) * Math.sin(angle)
      );
      const sprite = createTextSprite(labels[index], colors[index]);
      sprite.position.copy(labelPosition);
      group.add(sprite);
    });

    return group;
  };

  const createAxisMarkers = () => {
    const group = new THREE.Group();
    group.name = "AxisMarkers";
    const length = calculateScaledDistance(2000);
    const axisRadius = 0.15;

    const xGeometry = new THREE.CylinderGeometry(axisRadius, axisRadius, length, 8);
    const xMaterial = new THREE.MeshBasicMaterial({ color: 0x7a5555, transparent: true, opacity: 0.8 });
    const xAxis = new THREE.Mesh(xGeometry, xMaterial);
    xAxis.rotation.z = -Math.PI / 2;
    xAxis.position.set(length / 2, 0, 0);
    group.add(xAxis);

    const yGeometry = new THREE.CylinderGeometry(axisRadius, axisRadius, length * 0.3, 8);
    const yMaterial = new THREE.MeshBasicMaterial({ color: 0x557a55, transparent: true, opacity: 0.8 });
    const yAxis = new THREE.Mesh(yGeometry, yMaterial);
    yAxis.position.set(0, (length * 0.3) / 2, 0);
    group.add(yAxis);

    const zGeometry = new THREE.CylinderGeometry(axisRadius, axisRadius, length, 8);
    const zMaterial = new THREE.MeshBasicMaterial({ color: 0x55557a, transparent: true, opacity: 0.8 });
    const zAxis = new THREE.Mesh(zGeometry, zMaterial);
    zAxis.rotation.x = Math.PI / 2;
    zAxis.position.set(0, 0, length / 2);
    group.add(zAxis);

    const xLabel = createTextSprite("RA 0h", 0x8a6a6a);
    xLabel.position.set(length + 8, 3, 0);
    group.add(xLabel);

    const yLabel = createTextSprite("+Dec (N. Celestial Pole)", 0x6a8a6a);
    yLabel.position.set(0, (length * 0.3) + 8, 0);
    group.add(yLabel);

    const zLabel = createTextSprite("RA 6h", 0x6a6a8a);
    zLabel.position.set(0, 3, length + 8);
    group.add(zLabel);

    const sunGeometry = new THREE.SphereGeometry(3, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffdd44, transparent: true, opacity: 0.95 });
    const sunMarker = new THREE.Mesh(sunGeometry, sunMaterial);
    sunMarker.position.set(0, 0, 0);
    sunMarker.material.color.multiplyScalar(3.0);
    group.add(sunMarker);

    const sunGlowGeometry = new THREE.SphereGeometry(5, 16, 16);
    const sunGlowMaterial = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.3 });
    const sunGlow = new THREE.Mesh(sunGlowGeometry, sunGlowMaterial);
    sunGlow.position.set(0, 0, 0);
    sunGlow.material.color.multiplyScalar(2.0);
    group.add(sunGlow);

    const sunSprite = createTextSprite("Sol (Origin)", 0xffdd44);
    sunSprite.position.set(0, -8, 0);
    group.add(sunSprite);

    return group;
  };

  const createGalacticPlane = () => {
    const group = new THREE.Group();
    group.name = "GalacticPlane";
    const outerRadius = calculateScaledDistance(3000);

    const planeGeometry = new THREE.RingGeometry(calculateScaledDistance(10), outerRadius, 64);
    const planeMaterial = new THREE.MeshBasicMaterial({
      color: 0x8a6a8a,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.rotation.z = 62.87 * Math.PI / 180;
    plane.rotation.y = 282.86 * Math.PI / 180;
    group.add(plane);

    const ringPoints = [];
    for (let i = 0; i <= 64; i++) {
      const theta = (i / 64) * Math.PI * 2;
      ringPoints.push(new THREE.Vector3(
        outerRadius * Math.cos(theta),
        0,
        outerRadius * Math.sin(theta)
      ));
    }
    const ringGeometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ringPoints, true), 64, 0.05, 6, true);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x8a6a8a,
      transparent: true,
      opacity: 0.4
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.rotation.z = 62.87 * Math.PI / 180;
    ring.rotation.y = 282.86 * Math.PI / 180;
    group.add(ring);

    return group;
  };

  const createConstellationBounds = () => {
    const group = new THREE.Group();
    group.name = "ConstellationBounds";
    const majorConstellations = [
      { name: "Cygnus", ra: 310, dec: 45 },
      { name: "Lyra", ra: 285, dec: 35 },
      { name: "Aquila", ra: 295, dec: 5 },
      { name: "Sagittarius", ra: 285, dec: -25 },
      { name: "Scorpius", ra: 255, dec: -35 },
      { name: "Centaurus", ra: 200, dec: -45 },
      { name: "Orion", ra: 85, dec: 5 },
      { name: "Ursa Major", ra: 165, dec: 55 },
      { name: "Draco", ra: 260, dec: 65 },
      { name: "Pegasus", ra: 345, dec: 20 }
    ];

    majorConstellations.forEach(constellation => {
      const position = calculatePlanetPosition(constellation.ra, constellation.dec, 800);
      const sprite = createTextSprite(constellation.name, 0x6a7a8a);
      sprite.position.copy(position);
      group.add(sprite);
    });

    return group;
  };

  const createLabel = useCallback((text, color = "#ffffff") => {
    const div = document.createElement("div");
    div.className = "exoplanet-body-label";
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
    planets.forEach((planet, index) => {
      if (planet.active) {
        const data = planetDataRef.current.get(planet.id);
        if (data && data.position) {
          spatialGrid.add({ planet, index }, data.position);
        }
      }
    });
  }, [planets, spatialGrid]);

  const performFrustumCulling = useCallback(() => {
    if (!cameraRef.current) return;
    const camera = cameraRef.current;
    const matrix = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustumRef.current.setFromProjectionMatrix(matrix);
    let culledCount = 0;

    planets.forEach((planet) => {
      if (!planet.active) return;
      const data = planetDataRef.current.get(planet.id);
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
      culledPlanets: culledCount
    }));
  }, [planets]);

  const updateInstancedMeshes = useCallback(() => {
    if (!planetInstanceRef.current || !starInstanceRef.current) return;
    if (viewMode !== "galaxy") return;
    
    let planetIndex = 0;
    let starIndex = 0;
    const processedHosts = new Set();

    planets.forEach((planet) => {
      if (!planet.active || planetIndex >= PERFORMANCE_CONSTANTS.MAX_VISIBLE_PLANETS) return;

      const position = calculatePlanetPosition(planet.ra, planet.dec, planet.distance);

      planetDataRef.current.set(planet.id, {
        position: position.clone(),
        lastUpdate: Date.now(),
        instanceIndex: planetIndex
      });

      const planetSize = getPlanetSize(planet.planetRadius);
      const scale = new THREE.Vector3(planetSize, planetSize, planetSize);
      tempMatrix.current.compose(position, tempQuaternion.current, scale);
      planetInstanceRef.current.setMatrixAt(planetIndex, tempMatrix.current);
      tempColor.current.setStyle(planet.color);
      planetInstanceRef.current.setColorAt(planetIndex, tempColor.current);
      planetIndex++;

      if (showStarColors && !processedHosts.has(planet.hostName) && starIndex < PERFORMANCE_CONSTANTS.MAX_VISIBLE_PLANETS) {
        processedHosts.add(planet.hostName);
        const starColor = planet.starColor || SPECTRAL_TYPE_COLORS["Unknown"];
        const spectralClass = planet.hostSpectralClass || "Unknown";
        const starSize = (SPECTRAL_TYPE_SIZES[spectralClass] || 1.0) * 1.5;
        const starScale = new THREE.Vector3(starSize, starSize, starSize);
        tempMatrix.current.compose(position, tempQuaternion.current, starScale);
        starInstanceRef.current.setMatrixAt(starIndex, tempMatrix.current);
        tempColor.current.setStyle(starColor);
        starInstanceRef.current.setColorAt(starIndex, tempColor.current);
        starIndex++;
      }
    });

    if (planetIndex > 0) {
      planetInstanceRef.current.instanceMatrix.needsUpdate = true;
      if (planetInstanceRef.current.instanceColor) {
        planetInstanceRef.current.instanceColor.needsUpdate = true;
      }
    }
    planetInstanceRef.current.count = planetIndex;

    if (starIndex > 0) {
      starInstanceRef.current.instanceMatrix.needsUpdate = true;
      if (starInstanceRef.current.instanceColor) {
        starInstanceRef.current.instanceColor.needsUpdate = true;
      }
    }
    starInstanceRef.current.count = starIndex;
    
    setPerformanceStats(prev => ({
      ...prev,
      visiblePlanets: planetIndex
    }));
  }, [planets, calculatePlanetPosition, showStarColors, viewMode]);

  const updateLabels = useCallback(() => {
    if (!cameraRef.current || !labelRendererRef.current || !showLabels || viewMode !== "galaxy") {
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

    Object.keys(labelsRef.current).forEach(planetId => {
      const label = labelsRef.current[planetId];
      if (!label || !label.element) return;
      const data = planetDataRef.current.get(planetId);
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
  }, [showLabels, viewMode]);

  const clearSystemView = useCallback(() => {
    if (!systemGroupRef.current) return;
    
    while (systemGroupRef.current.children.length > 0) {
      const child = systemGroupRef.current.children[0];
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
      systemGroupRef.current.remove(child);
    }
    
    orbitLinesRef.current = [];
    habitableZoneRef.current = null;
    systemStarRef.current = null;
    systemPlanetsRef.current = [];
    comparisonGhostsRef.current = { earth: null, jupiter: null };
  }, []);

  const setupSystemView = useCallback((planet) => {
    if (!systemGroupRef.current || !sceneRef.current) return;
    
    clearSystemView();
    
    const systemPlanets = planets.filter(p => p.hostName === planet.hostName);
    const spectralClass = planet.hostSpectralClass || "Unknown";
    const starColor = planet.starColor || SPECTRAL_TYPE_COLORS[spectralClass];
    
    const innermostOrbit = Math.min(...systemPlanets.map(p => p.semiMajorAxis || 999).filter(a => a > 0));
    const outermostOrbit = Math.max(...systemPlanets.map(p => p.semiMajorAxis || 0));
    
    let dynamicScale = PERFORMANCE_CONSTANTS.SYSTEM_VIEW_SCALE;
    if (innermostOrbit < 0.1) {
      dynamicScale = 200;
    } else if (innermostOrbit < 0.5) {
      dynamicScale = 100;
    } else {
      dynamicScale = 50;
    }
    
    systemScaleRef.current = dynamicScale;
    
    const hostRadiusSolar = planet.hostRadius || 1.0;
    const hostRadiusAU = hostRadiusSolar * 0.00465;
    const scaledStarRadius = hostRadiusAU * dynamicScale;
    const minStarSize = 1.5;
    const maxStarSize = Math.max(minStarSize, innermostOrbit * dynamicScale * 0.3);
    const starSize = Math.max(minStarSize, Math.min(maxStarSize, scaledStarRadius * 10));
    
    const starGeometry = new THREE.SphereGeometry(starSize, 32, 32);
    const starMaterial = new THREE.MeshBasicMaterial({
      color: starColor,
      transparent: true,
      opacity: 0.95
    });
    starMaterial.color.multiplyScalar(3.0);
    const star = new THREE.Mesh(starGeometry, starMaterial);
    star.position.set(0, 0, 0);
    systemGroupRef.current.add(star);
    systemStarRef.current = star;
    
    const starGlowGeometry = new THREE.SphereGeometry(starSize * 1.3, 16, 16);
    const starGlowMaterial = new THREE.MeshBasicMaterial({
      color: starColor,
      transparent: true,
      opacity: 0.2
    });
    starGlowMaterial.color.multiplyScalar(2.0);
    const starGlow = new THREE.Mesh(starGlowGeometry, starGlowMaterial);
    systemGroupRef.current.add(starGlow);
    
    const starLabel = createTextSprite(planet.hostName, starColor);
    starLabel.position.set(0, starSize + 3, 0);
    systemGroupRef.current.add(starLabel);
    
    if (showHabitableZone && planet.habitableZone) {
      const hzRing = createHabitableZoneRing(
        planet.habitableZone.innerEdge,
        planet.habitableZone.outerEdge,
        dynamicScale
      );
      if (hzRing) {
        systemGroupRef.current.add(hzRing);
        habitableZoneRef.current = hzRing;
      }
      
      if (planet.habitableZone.conservativeInner && planet.habitableZone.conservativeOuter) {
        const conservativeRing = createHabitableZoneRing(
          planet.habitableZone.conservativeInner,
          planet.habitableZone.conservativeOuter,
          dynamicScale
        );
        if (conservativeRing) {
          conservativeRing.material.color.setHex(0x00ff00);
          conservativeRing.material.opacity = 0.25;
          systemGroupRef.current.add(conservativeRing);
        }
      }
    }
    
    systemPlanets.forEach((p, idx) => {
      const a = p.semiMajorAxis || (idx + 1) * 0.5;
      const e = p.eccentricity || 0;
      const i = p.inclination || 0;
      const w = p.omega || 0;
      
      if (showOrbits) {
        const orbitLine = createOrbitLine(a, e, i, w, p.color, dynamicScale);
        if (orbitLine) {
          systemGroupRef.current.add(orbitLine);
          orbitLinesRef.current.push(orbitLine);
        }
      }
      
      const planetSize = getSystemPlanetSize(p.planetRadius);
      const planetGeometry = new THREE.SphereGeometry(planetSize, 32, 32);
      const planetMaterial = getPlanetMaterial(p.planetType, true);
      const planetMesh = new THREE.Mesh(planetGeometry, planetMaterial);
      
      const initialPos = getOrbitalPosition(
        a * dynamicScale,
        e, i, w, 0, p.orbitalPeriod || 365
      );
      planetMesh.position.copy(initialPos);
      planetMesh.userData = {
        planet: p,
        a: a * dynamicScale,
        e, i, w,
        period: p.orbitalPeriod || 365
      };
      
      systemGroupRef.current.add(planetMesh);
      systemPlanetsRef.current.push(planetMesh);
      
      const planetLabel = createTextSprite(p.name, p.color);
      planetLabel.position.copy(initialPos);
      planetLabel.position.y += planetSize + 1;
      planetLabel.userData = { parentMesh: planetMesh, offset: planetSize + 1 };
      systemGroupRef.current.add(planetLabel);
    });
    
    if (showComparisonGhosts) {
      const comparisonDistance = outermostOrbit * dynamicScale + 20;
      
      const earthGeometry = new THREE.SphereGeometry(0.5, 16, 16);
      const earthMaterial = new THREE.MeshBasicMaterial({
        color: 0x4488ff,
        transparent: true,
        opacity: 0.4,
        wireframe: true
      });
      const earthGhost = new THREE.Mesh(earthGeometry, earthMaterial);
      earthGhost.position.set(-comparisonDistance, 0, 0);
      systemGroupRef.current.add(earthGhost);
      comparisonGhostsRef.current.earth = earthGhost;
      
      const earthGhostLabel = createTextSprite("Earth Scale (1 R⊕)", 0x4488ff);
      earthGhostLabel.position.set(-comparisonDistance, 2, 0);
      systemGroupRef.current.add(earthGhostLabel);
      
      const jupiterGeometry = new THREE.SphereGeometry(5.5, 16, 16);
      const jupiterMaterial = new THREE.MeshBasicMaterial({
        color: 0xff8844,
        transparent: true,
        opacity: 0.4,
        wireframe: true
      });
      const jupiterGhost = new THREE.Mesh(jupiterGeometry, jupiterMaterial);
      jupiterGhost.position.set(-comparisonDistance - 15, 0, 0);
      systemGroupRef.current.add(jupiterGhost);
      comparisonGhostsRef.current.jupiter = jupiterGhost;
      
      const jupiterGhostLabel = createTextSprite("Jupiter Scale (11 R⊕)", 0xff8844);
      jupiterGhostLabel.position.set(-comparisonDistance - 15, 8, 0);
      systemGroupRef.current.add(jupiterGhostLabel);
    }
    
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    ambientLight.name = "systemAmbient";
    systemGroupRef.current.add(ambientLight);
    
    const pointLight = new THREE.PointLight(new THREE.Color(starColor), 1, 500);
    pointLight.position.set(0, 0, 0);
    pointLight.name = "systemPointLight";
    systemGroupRef.current.add(pointLight);
    
  }, [planets, showOrbits, showHabitableZone, showComparisonGhosts, clearSystemView, createOrbitLine, createHabitableZoneRing, getOrbitalPosition, getPlanetMaterial]);

  const updateSystemView = useCallback((deltaTime) => {
    if (viewMode !== "system" || !systemGroupRef.current || !animateOrbits) return;
    
    orbitTimeRef.current += deltaTime * 0.001;
    
    systemPlanetsRef.current.forEach(mesh => {
      if (!mesh.userData) return;
      const { a, e, i, w, period } = mesh.userData;
      const pos = getOrbitalPosition(a, e, i, w, orbitTimeRef.current * 10, period);
      mesh.position.copy(pos);
      
      if (mesh.material && mesh.material.uniforms && mesh.material.uniforms.time) {
        mesh.material.uniforms.time.value = orbitTimeRef.current;
      }
    });
    
    systemGroupRef.current.children.forEach(child => {
      if (child.userData && child.userData.parentMesh) {
        const parentPos = child.userData.parentMesh.position;
        child.position.set(parentPos.x, parentPos.y + child.userData.offset, parentPos.z);
      }
    });
  }, [viewMode, animateOrbits, getOrbitalPosition]);

  const enterSystemView = useCallback((planet) => {
    if (!planet) return;
    
    setSystemViewPlanet(planet);
    setViewMode("system");
    
    if (planetGroupRef.current) planetGroupRef.current.visible = false;
    if (planetInstanceRef.current) planetInstanceRef.current.visible = false;
    if (starInstanceRef.current) starInstanceRef.current.visible = false;
    if (equatorialGridRef.current) equatorialGridRef.current.visible = false;
    if (celestialPlaneRef.current) celestialPlaneRef.current.visible = false;
    if (distanceShellsRef.current) distanceShellsRef.current.visible = false;
    if (axisMarkersRef.current) axisMarkersRef.current.visible = false;
    if (galacticPlaneRef.current) galacticPlaneRef.current.visible = false;
    if (constellationBoundsRef.current) constellationBoundsRef.current.visible = false;
    if (backgroundStarsRef.current) backgroundStarsRef.current.visible = false;
    
    Object.values(labelsRef.current).forEach(label => {
      if (label && label.element) {
        label.element.style.display = "none";
      }
    });
    
    setupSystemView(planet);
    
    if (systemGroupRef.current) systemGroupRef.current.visible = true;
    
    if (cameraRef.current && controlsRef.current) {
      const systemPlanets = planets.filter(p => p.hostName === planet.hostName);
      const outermostOrbit = systemPlanets.length > 0 
        ? Math.max(...systemPlanets.map(p => p.semiMajorAxis || 1))
        : 1;
      const viewDistance = Math.max(30, outermostOrbit * systemScaleRef.current * 2.5);
      
      new TWEEN.Tween(cameraRef.current.position)
        .to({ x: viewDistance * 0.7, y: viewDistance * 0.5, z: viewDistance * 0.7 }, 1000)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();
      
      new TWEEN.Tween(controlsRef.current.target)
        .to({ x: 0, y: 0, z: 0 }, 1000)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate(() => controlsRef.current.update())
        .start();
    }
    
    orbitTimeRef.current = 0;
  }, [planets, setupSystemView]);

  const exitSystemView = useCallback(() => {
    setViewMode("galaxy");
    setSystemViewPlanet(null);
    
    clearSystemView();
    
    if (systemGroupRef.current) systemGroupRef.current.visible = false;
    
    if (planetGroupRef.current) planetGroupRef.current.visible = true;
    if (planetInstanceRef.current) planetInstanceRef.current.visible = true;
    if (starInstanceRef.current) starInstanceRef.current.visible = true;
    if (equatorialGridRef.current) equatorialGridRef.current.visible = showEquatorialGrid;
    if (celestialPlaneRef.current) celestialPlaneRef.current.visible = showCelestialPlane;
    if (distanceShellsRef.current) distanceShellsRef.current.visible = showDistanceShells;
    if (axisMarkersRef.current) axisMarkersRef.current.visible = showAxisMarkers;
    if (galacticPlaneRef.current) galacticPlaneRef.current.visible = showGalacticPlane;
    if (constellationBoundsRef.current) constellationBoundsRef.current.visible = showConstellationBounds;
    if (backgroundStarsRef.current) backgroundStarsRef.current.visible = true;
    
    if (cameraRef.current && controlsRef.current) {
      new TWEEN.Tween(cameraRef.current.position)
        .to({ x: 200, y: 150, z: 200 }, 1000)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();
      
      new TWEEN.Tween(controlsRef.current.target)
        .to({ x: 0, y: 0, z: 0 }, 1000)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate(() => controlsRef.current.update())
        .start();
    }
  }, [clearSystemView, showEquatorialGrid, showCelestialPlane, showDistanceShells, showAxisMarkers, showGalacticPlane, showConstellationBounds]);

  const fetchPlanetData = async () => {
    const startTime = performance.now();
    try {
      setLoadingProgress(10);
      
      const response = await fetch(`${import.meta.env.VITE_API_AUTH_URL}/exoplanet-catalog?all=true`, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        }
      });

      setLoadingProgress(70);

      if (!response.ok) {
        throw new Error(`Backend API returned ${response.status}: ${response.statusText}.`);
      }

      const result = await response.json();
      
      setLoadingProgress(90);

      return {
        planets: result.planets,
        errors: result.errors || [],
        metadata: {
          ...result.metadata,
          loadTime: performance.now() - startTime
        }
      };
    } catch (error) {
      return {
        planets: [],
        errors: [`Backend connection failed: ${error.message}. No real exoplanet data available.`],
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

  const fetchNotableSystems = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_AUTH_URL}/notable-systems`, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) return [];

      const result = await response.json();
      return result.systems || [];
    } catch (error) {
      return [];
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
    if (e.target.closest(".exoplanet-close-btn")) return;
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
    if (e.target.closest(".exoplanet-collapse-icon")) return;
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
    if (e.target.closest(".exoplanet-collapse-icon") || e.target.closest(".dinoSatExoplanetControlButton") || e.target.closest(".dinoSatExoplanetBloomControls")) return;
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
    if (e.target.closest(".exoplanet-close-btn")) return;
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
    const endIndex = Math.min(filteredPlanets.length - 1, Math.ceil((virtualScrollOffset + containerHeight) / itemHeight) + buffer);
    const visibleItems = filteredPlanets.slice(startIndex, endIndex + 1);
    return { visibleItems, startIndex, endIndex };
  }, [filteredPlanets, virtualScrollOffset]);

  const goToTour = useCallback((tourId) => {
    const system = notableSystems.find(s => s.id === tourId);
    if (system && system.planets && system.planets.length > 0) {
      const planet = system.planets[0];
      if (!planet.active) {
        togglePlanet(planet.id);
      }
      setSelectedPlanet(planet.id);
      enterSystemView(planet);
    }
  }, [notableSystems, enterSystemView]);

  const showEarthCandidates = useCallback(() => {
    setTypeFilter("All");
    setMethodFilter("All");
    setRadiusFilter("Earth-like (0.8-1.2 R⊕)");
    setDistanceFilter("All");
    setPeriodFilter("All");
    setSpectralFilter("All");
    setSortOption("esi_desc");
  }, []);

  const exportJSON = useCallback(() => {
    const detailedPlanets = planets.map(planet => {
      const data = planetDataRef.current.get(planet.id);
      const position = data ? data.position : { x: 0, y: 0, z: 0 };
      return {
        ...planet,
        renderedPosition: { 
          x: position.x?.toFixed(2), 
          y: position.y?.toFixed(2), 
          z: position.z?.toFixed(2) 
        },
        equatorialCoordinates: {
          ra: planet.ra,
          dec: planet.dec,
          distance: planet.distance
        },
        visible: planet.active
      };
    });
    const exportData = {
      exoplanets: detailedPlanets,
      hudReadouts: { activePlanets: planets.filter(p => p.active).length, actualFps, performanceStats },
      loadingMetadata,
      apiErrors: errors,
      catalogStats: { totalPlanets: planets.length, visiblePlanets: planets.filter(p => p.active).length }
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "exoplanet_catalog_data.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [planets, actualFps, performanceStats, loadingMetadata, errors]);

  const exportCSV = useCallback(() => {
    const headers = ["ID", "Name", "HostName", "RA_deg", "Dec_deg", "Distance_ly", "DiscoveryMethod", "DiscoveryYear", "OrbitalPeriod_days", "SemiMajorAxis_AU", "Eccentricity", "PlanetRadius_Re", "PlanetMass_Me", "EquilibriumTemp_K", "Insolation_Se", "ESI", "HostTemp_K", "HostRadius_Rs", "HostMass_Ms", "HostSpectralType", "NumPlanets", "PlanetType", "Habitability"];
    let csv = headers.join(",") + "\n";
    planets.forEach(p => {
      const row = [
        p.id, `"${p.name}"`, `"${p.hostName || ""}"`,
        p.ra || "", p.dec || "", p.distance || "",
        `"${p.discoveryMethod}"`, p.discoveryYear || "",
        p.orbitalPeriod || "", p.semiMajorAxis || "", p.eccentricity || "",
        p.planetRadius || "", p.planetMass || "",
        p.equilibriumTemp || "", p.insolation || "", p.earthSimilarityIndex || "",
        p.hostTemp || "", p.hostRadius || "", p.hostMass || "", `"${p.hostSpectralType || ""}"`,
        p.numPlanets || "",
        `"${p.planetType}"`, `"${p.habitability || ""}"`
      ];
      csv += row.join(",") + "\n";
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "exoplanet_catalog_data.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [planets]);

  const fetchCatalogData = useCallback(async () => {
    setLoading(true);
    setLoadingProgress(0);
    setErrors([]);
    
    const planetDataPromise = fetchPlanetData();
    const systemsDataPromise = fetchNotableSystems();
    
    const [planetData, systemsData] = await Promise.all([planetDataPromise, systemsDataPromise]);
    
    setLoadingProgress(100);
    setPlanets(planetData.planets);
    setErrors(planetData.errors);
    setLoadingMetadata(planetData.metadata);
    setNotableSystems(systemsData);
    setLoading(false);
  }, []);

  const togglePlanet = useCallback((id) => {
    setPlanets(prev => prev.map(planet => planet.id === id ? { ...planet, active: !planet.active } : planet));
  }, []);

  const selectAllPlanets = useCallback(() => setPlanets(prev => prev.map(planet => ({ ...planet, active: true }))), []);
  const deselectAllPlanets = useCallback(() => setPlanets(prev => prev.map(planet => ({ ...planet, active: false }))), []);

  const clearFilters = useCallback(() => {
    setTypeFilter("All");
    setMethodFilter("All");
    setRadiusFilter("All");
    setDistanceFilter("All");
    setPeriodFilter("All");
    setSpectralFilter("All");
    setSearchTerm("");
  }, []);

  const toggleLabels = useCallback(() => setShowLabels(!showLabels), [showLabels]);
  const toggleEquatorialGrid = useCallback(() => setShowEquatorialGrid(!showEquatorialGrid), [showEquatorialGrid]);
  const toggleCelestialPlane = useCallback(() => setShowCelestialPlane(!showCelestialPlane), [showCelestialPlane]);
  const toggleDistanceShells = useCallback(() => setShowDistanceShells(!showDistanceShells), [showDistanceShells]);
  const toggleAxisMarkers = useCallback(() => setShowAxisMarkers(!showAxisMarkers), [showAxisMarkers]);
  const toggleGalacticPlane = useCallback(() => setShowGalacticPlane(!showGalacticPlane), [showGalacticPlane]);
  const toggleConstellationBounds = useCallback(() => setShowConstellationBounds(!showConstellationBounds), [showConstellationBounds]);
  const toggleStarColors = useCallback(() => setShowStarColors(!showStarColors), [showStarColors]);
  const toggleOrbits = useCallback(() => setShowOrbits(!showOrbits), [showOrbits]);
  const toggleHabitableZone = useCallback(() => setShowHabitableZone(!showHabitableZone), [showHabitableZone]);
  const toggleComparisonGhosts = useCallback(() => setShowComparisonGhosts(!showComparisonGhosts), [showComparisonGhosts]);
  const toggleAnimateOrbits = useCallback(() => setAnimateOrbits(!animateOrbits), [animateOrbits]);
  const toggleBloom = useCallback(() => setBloomEnabled(!bloomEnabled), [bloomEnabled]);
  const toggleSidebar = useCallback(() => setSidebarCollapsed(!sidebarCollapsed), [sidebarCollapsed]);
  const toggleLegend = useCallback(() => setLegendCollapsed(!legendCollapsed), [legendCollapsed]);
  const toggleControls = useCallback(() => setControlsCollapsed(!controlsCollapsed), [controlsCollapsed]);
  const toggleTours = useCallback(() => setToursCollapsed(!toursCollapsed), [toursCollapsed]);

  const toggleHUD = useCallback(() => {
    setHudVisible(!hudVisible);
    if (!hudVisible) setHudPosition({ x: 0, y: 0 });
  }, [hudVisible]);

  const resetCamera = useCallback(() => {
    if (cameraRef.current) {
      if (viewMode === "galaxy") {
        cameraRef.current.position.set(200, 150, 200);
        cameraRef.current.lookAt(0, 0, 0);
      } else {
        cameraRef.current.position.set(100, 75, 100);
        cameraRef.current.lookAt(0, 0, 0);
      }
    }
  }, [viewMode]);

  const zoomToPlanet = useCallback((id) => {
    if (viewMode !== "galaxy") return;
    const data = planetDataRef.current.get(id);
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
  }, [viewMode]);

  useEffect(() => {
    document.body.className = `exoplanet-theme-${theme}`;
    return () => { document.body.className = ""; };
  }, [theme]);

  useEffect(() => {
    let filtered = planets.filter(planet => {
      const matchesSearch = planet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (planet.hostName && planet.hostName.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesType = typeFilter === "All" || planet.planetType === typeFilter;
      const matchesMethod = methodFilter === "All" || planet.discoveryMethod === methodFilter;
      const matchesSpectral = spectralFilter === "All" || planet.hostSpectralClass === spectralFilter;
      let matchesRadius = true;
      if (radiusFilter !== "All") {
        const range = RADIUS_RANGES.find(r => r.label === radiusFilter);
        if (range && planet.planetRadius) {
          matchesRadius = planet.planetRadius >= range.min && planet.planetRadius < range.max;
        }
      }
      let matchesDistance = true;
      if (distanceFilter !== "All") {
        const range = DISTANCE_RANGES.find(r => r.label === distanceFilter);
        if (range && planet.distance) {
          matchesDistance = planet.distance >= range.min && planet.distance < range.max;
        }
      }
      let matchesPeriod = true;
      if (periodFilter !== "All") {
        const range = PERIOD_RANGES.find(r => r.label === periodFilter);
        if (range && planet.orbitalPeriod) {
          matchesPeriod = planet.orbitalPeriod >= range.min && planet.orbitalPeriod < range.max;
        }
      }
      return matchesSearch && matchesType && matchesMethod && matchesRadius && matchesDistance && matchesPeriod && matchesSpectral;
    });

    filtered.sort((a, b) => {
      switch (sortOption) {
        case "name_asc": return a.name.localeCompare(b.name);
        case "name_desc": return b.name.localeCompare(a.name);
        case "year_desc": return (b.discoveryYear || 0) - (a.discoveryYear || 0);
        case "year_asc": return (a.discoveryYear || 0) - (b.discoveryYear || 0);
        case "radius_desc": return (b.planetRadius || 0) - (a.planetRadius || 0);
        case "radius_asc": return (a.planetRadius || 0) - (b.planetRadius || 0);
        case "distance_asc": return (a.distance || 99999) - (b.distance || 99999);
        case "distance_desc": return (b.distance || 0) - (a.distance || 0);
        case "esi_desc": return (b.earthSimilarityIndex || 0) - (a.earthSimilarityIndex || 0);
        case "type": return a.planetType.localeCompare(b.planetType);
        case "method": return (a.discoveryMethod || "").localeCompare(b.discoveryMethod || "");
        default: return 0;
      }
    });
    setFilteredPlanets(filtered);
  }, [planets, searchTerm, typeFilter, methodFilter, radiusFilter, distanceFilter, periodFilter, spectralFilter, sortOption]);

  useEffect(() => {
    if (!mountRef.current) return;
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050508, 0.00002);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 20000);
    camera.position.set(200, 150, 200);
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

    const equatorialGrid = createEquatorialGrid();
    equatorialGrid.visible = showEquatorialGrid;
    scene.add(equatorialGrid);
    equatorialGridRef.current = equatorialGrid;

    const celestialPlane = createCelestialPlane();
    celestialPlane.visible = showCelestialPlane;
    scene.add(celestialPlane);
    celestialPlaneRef.current = celestialPlane;

    const distanceShells = createDistanceShells();
    distanceShells.visible = showDistanceShells;
    scene.add(distanceShells);
    distanceShellsRef.current = distanceShells;

    const axisMarkers = createAxisMarkers();
    axisMarkers.visible = showAxisMarkers;
    scene.add(axisMarkers);
    axisMarkersRef.current = axisMarkers;

    const galacticPlane = createGalacticPlane();
    galacticPlane.visible = showGalacticPlane;
    scene.add(galacticPlane);
    galacticPlaneRef.current = galacticPlane;

    const constellationBounds = createConstellationBounds();
    constellationBounds.visible = showConstellationBounds;
    scene.add(constellationBounds);
    constellationBoundsRef.current = constellationBounds;

    const planetGroup = new THREE.Group();
    scene.add(planetGroup);
    planetGroupRef.current = planetGroup;

    const systemGroup = new THREE.Group();
    systemGroup.visible = false;
    scene.add(systemGroup);
    systemGroupRef.current = systemGroup;

    const planetGeometry = new THREE.IcosahedronGeometry(0.5, 1);
    const planetMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.95 });
    const planetInstance = new THREE.InstancedMesh(planetGeometry, planetMaterial, PERFORMANCE_CONSTANTS.MAX_VISIBLE_PLANETS);
    planetInstance.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    planetInstance.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(PERFORMANCE_CONSTANTS.MAX_VISIBLE_PLANETS * 3), 3);
    planetGroup.add(planetInstance);
    planetInstanceRef.current = planetInstance;

    const starGeometry = new THREE.SphereGeometry(0.5, 8, 8);
    const starMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.7 });
    const starInstance = new THREE.InstancedMesh(starGeometry, starMaterial, PERFORMANCE_CONSTANTS.MAX_VISIBLE_PLANETS);
    starInstance.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    starInstance.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(PERFORMANCE_CONSTANTS.MAX_VISIBLE_PLANETS * 3), 3);
    planetGroup.add(starInstance);
    starInstanceRef.current = starInstance;

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
      if (starType < 0.5) { baseColor = { r: 0.9, g: 0.95, b: 1.0 }; intensity = 0.7 + Math.random() * 0.3; size = 1.0 + Math.random() * 0.5; }
      else if (starType < 0.7) { baseColor = { r: 1.0, g: 0.95, b: 0.85 }; intensity = 0.75 + Math.random() * 0.25; size = 1.2 + Math.random() * 0.8; }
      else if (starType < 0.85) { baseColor = { r: 1.0, g: 0.7, b: 0.4 }; intensity = 0.8 + Math.random() * 0.2; size = 1.8 + Math.random() * 1.0; }
      else { baseColor = { r: 0.95, g: 0.92, b: 1.0 }; intensity = 0.6 + Math.random() * 0.3; size = 0.5 + Math.random() * 0.3; }
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
      composer.setSize(newWidth, newHeight);
      bloomPass.resolution.set(newWidth, newHeight);
    };

    window.addEventListener("resize", handleResize);
    composer.render();
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
      composer.dispose();
      renderer.dispose();
    };
  }, []);

  useEffect(() => { if (sceneInitialized) fetchCatalogData(); }, [sceneInitialized, fetchCatalogData]);

  useEffect(() => { if (equatorialGridRef.current && viewMode === "galaxy") equatorialGridRef.current.visible = showEquatorialGrid; }, [showEquatorialGrid, viewMode]);
  useEffect(() => { if (celestialPlaneRef.current && viewMode === "galaxy") celestialPlaneRef.current.visible = showCelestialPlane; }, [showCelestialPlane, viewMode]);
  useEffect(() => { if (distanceShellsRef.current && viewMode === "galaxy") distanceShellsRef.current.visible = showDistanceShells; }, [showDistanceShells, viewMode]);
  useEffect(() => { if (axisMarkersRef.current && viewMode === "galaxy") axisMarkersRef.current.visible = showAxisMarkers; }, [showAxisMarkers, viewMode]);
  useEffect(() => { if (galacticPlaneRef.current && viewMode === "galaxy") galacticPlaneRef.current.visible = showGalacticPlane; }, [showGalacticPlane, viewMode]);
  useEffect(() => { if (constellationBoundsRef.current && viewMode === "galaxy") constellationBoundsRef.current.visible = showConstellationBounds; }, [showConstellationBounds, viewMode]);

  useEffect(() => {
    if (bloomPassRef.current) {
      bloomPassRef.current.enabled = bloomEnabled;
      bloomPassRef.current.strength = bloomStrength;
      bloomPassRef.current.radius = bloomRadius;
      bloomPassRef.current.threshold = bloomThreshold;
    }
  }, [bloomEnabled, bloomStrength, bloomRadius, bloomThreshold]);

  useEffect(() => {
    Object.keys(labelsRef.current).forEach(planetId => {
      const label = labelsRef.current[planetId];
      if (label && label.element) {
        if (!planets.find(p => p.id === planetId && p.active)) {
          if (label.element.parentNode) label.element.parentNode.removeChild(label.element);
          delete labelsRef.current[planetId];
        }
      }
    });
    planets.forEach(planet => {
      if (planet.active && !labelsRef.current[planet.id]) {
        const label = createLabel(planet.name, planet.color);
        labelsRef.current[planet.id] = label;
        if (labelRendererRef.current) labelRendererRef.current.appendChild(label.element);
      }
    });
  }, [planets, createLabel]);

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
        if (backgroundStarsRef.current && backgroundStarsRef.current.material && viewMode === "galaxy") {
          backgroundStarsRef.current.material.uniforms.time.value = time * 0.001;
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
              points: rendererRef.current.info.render.points,
              textures: rendererRef.current.info.memory.textures,
              geometries: rendererRef.current.info.memory.geometries
            }));
          }
        }
        if (viewMode === "galaxy" && planets.length > 0) {
          if (frameCountRef.current % PERFORMANCE_CONSTANTS.UPDATE_FREQUENCY === 0) {
            updateInstancedMeshes();
            updateSpatialGrid();
          }
          updateLabels();
        }
        if (viewMode === "system") {
          updateSystemView(deltaTime);
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
  }, [planets, showLabels, targetFps, viewMode, bloomEnabled, updateLabels, updateInstancedMeshes, updateSpatialGrid, updateSystemView]);

  const activePlanets = planets.filter(p => p.active).length;
  const typeCounts = planets.reduce((acc, planet) => { if (planet.active) acc[planet.planetType] = (acc[planet.planetType] || 0) + 1; return acc; }, {});
  const methodCounts = planets.reduce((acc, planet) => { if (planet.active) acc[planet.discoveryMethod] = (acc[planet.discoveryMethod] || 0) + 1; return acc; }, {});
  const spectralCounts = planets.reduce((acc, planet) => { if (planet.active) acc[planet.hostSpectralClass || "Unknown"] = (acc[planet.hostSpectralClass || "Unknown"] || 0) + 1; return acc; }, {});
  const { visibleItems, startIndex } = getVirtualScrollItems;

  return (
    <div className="dinoSatPageWrapper">
      <DinoLabsNav activePage={"sat"}/>
      <div className={`dinoSatExoplanetCatalogContainer exoplanet-theme-${theme}`}>
        <div className={`dinoSatExoplanetSideBar ${sidebarCollapsed ? "dinoSatExoplanetSideBarCollapsed" : ""}`}>
          {loading && (
            <div className="dinoSatExoplanetSideBarLoadingContainer">
              <label>Loading Exoplanet Data...</label>
              <div className="dinoSatExoplanetSideBarLoadingBar">
                <div className="dinoSatExoplanetSideBarLoadingBarAccent" />
              </div>
              <small>{loadingProgress < 70 ? "Fetching from NASA Exoplanet Archive..." : loadingProgress < 90 ? "Processing data..." : "Initializing view..."}</small>
            </div>
          )}
          <div className="dinoSatExoplanetSideBarHeader">
            <h1>{!sidebarCollapsed && <small>Exoplanet Catalog</small>}</h1>
            {!sidebarCollapsed && (
              <>
                <div className="dinoSatExoplanetSideBarThemeSelector">
                  <button className={`dinoSatExoplanetSelectButton ${theme === "dark" ? "dinoSatExoplanetButtonActive" : ""}`} onClick={() => setTheme("dark")}>Dark</button>
                  <button className={`dinoSatExoplanetSelectButton ${theme === "neon" ? "dinoSatExoplanetButtonActive" : ""}`} onClick={() => setTheme("neon")}>Neon</button>
                </div>
                <div className="dinoSatExoplanetSideBarThemeSelector">
                  <div className="dinoSatExoplanetSideBarThemeSelectorStatusIndicator">
                    Ready
                  </div>
                </div>
                {viewMode === "system" && (
                  <div className="dinoSatExoplanetSideBarThemeSelector">
                    <button className="dinoSatExoplanetSelectButton" onClick={exitSystemView} style={{ width: "100%" }}>
                      Return to Galaxy View
                    </button>
                  </div>
                )}
                <div className="dinoSatExoplanetSideBarThemeSelector">
                  {errors.length > 0 && (
                    <div className="dinoSatExoplanetSideBarThemeSelectorErrorIndicator" onClick={() => setShowErrors(!showErrors)} style={{ opacity: showErrors ? 1.0 : "", paddingTop: showErrors ? "" : 0, paddingBottom: showErrors ? "" : 0 }}>
                      <div className="dinoSatExoplanetSideBarThemeSelectorErrorIndicatorHeader">
                        <span>API Errors ({errors.length})</span>
                        <button onClick={(e) => { e.stopPropagation(); copyAllErrors(); }} aria-label="Copy all errors"><FontAwesomeIcon icon={copiedErrors ? faSquareCheck : faClone} size="sm"/></button>
                      </div>
                      {showErrors && (<div className="dinoSatExoplanetSideBarThemeSelectorErrorIndicatorList">{errors.map((error, index) => (<div key={index} style={{ opacity: 0.8 }}>{error}</div>))}</div>)}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          {!sidebarCollapsed && !loading && (
            <>
              <div className="dinoSatExoplanetSearchControls">
                <input type="text" placeholder="Search exoplanets..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="dinoSatExoplanetSearchInput"/>
                <div className="dinoSatExoplanetSelectControls">
                  <button className="dinoSatExoplanetSelectButton" onClick={selectAllPlanets}>Select All</button>
                  <button className="dinoSatExoplanetSelectButton" onClick={deselectAllPlanets}>Deselect All</button>
                  <button className="dinoSatExoplanetSelectButton" onClick={fetchCatalogData}>Refresh</button>
                </div>
              </div>
              <div className="dinoSatExoplanetObjectsHeader" onClick={toggleTours} style={{ cursor: "pointer" }}>
                <span className="dinoSatExoplanetObjectsHeaderIcon"><FontAwesomeIcon icon={faRocket} /></span>
                <span>Notable Systems & Tours</span>
                <span style={{ marginLeft: "auto" }}><FontAwesomeIcon icon={toursCollapsed ? faChevronDown : faChevronUp} /></span>
              </div>
              {!toursCollapsed && (
                <div className="dinoSatExoplanetList">
                  {NOTABLE_TOURS.map(tour => (
                    <button key={tour.id} className="dinoSatExoplanetTourButton" onClick={() => goToTour(tour.id)}>
                      <span className="dinoSatExoplanetTourName">{tour.name}</span>
                      <span className="dinoSatExoplanetTourDesc">{tour.description}</span>
                    </button>
                  ))}
                  <button className="dinoSatExoplanetTourButton" onClick={showEarthCandidates} style={{ borderColor: "#4CAF50" }}>
                    <span className="dinoSatExoplanetTourName"><FontAwesomeIcon icon={faEarthAmericas} /> Earth 2.0 Candidates</span>
                    <span className="dinoSatExoplanetTourDesc">Earth-sized planets in Habitable Zones</span>
                  </button>
                </div>
              )}
              <div className="dinoSatExoplanetObjectsHeader"><span className="dinoSatExoplanetObjectsHeaderIcon"><FontAwesomeIcon icon={faStar} /></span><span>Exoplanets ({planets.filter(p => p.active).length}/{planets.length})</span></div>
              <div ref={virtualScrollRef} className="dinoSatExoplanetList exoplanet-list" style={{ height: "400px", overflowY: "auto", position: "relative" }} onScroll={handleVirtualScroll}>
                <div style={{ height: filteredPlanets.length * PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT, position: "relative" }}>
                  <div style={{ position: "absolute", top: startIndex * PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT, width: "100%" }}>
                    {visibleItems.map((planet) => (
                      <div key={planet.id} className={`dinoSatExoplanetListItem exoplanet-item ${planet.active ? "dinoSatExoplanetButtonActive" : ""} ${selectedPlanet === planet.id ? "exoplanet-selected" : ""}`} style={{ height: PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT, minHeight: PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT }} onClick={() => { if (!planet.active) togglePlanet(planet.id); setSelectedPlanet(planet.id); if (viewMode === "galaxy") zoomToPlanet(planet.id); }}>
                        <div className="dinoSatExoplanetIndicator" style={{ backgroundColor: planet.color }}/>
                        <div className="dinoSatExoplanetInfo">
                          <div className="dinoSatExoplanetName exoplanet-name">{planet.name}</div>
                          <div className="dinoSatExoplanetDetails">
                            <small>
                              {planet.planetType} | {planet.discoveryMethod} | {planet.distance?.toFixed(1) || "?"} ly
                              {planet.earthSimilarityIndex && <span style={{ color: "#4CAF50" }}> | ESI: {planet.earthSimilarityIndex.toFixed(2)}</span>}
                            </small>
                          </div>
                        </div>
                        <label className="consoleSwitch"><input type="checkbox" checked={planet.active} onChange={() => togglePlanet(planet.id)} /><span className="consoleSlider round"></span></label>
                        <button className="dinoSatExoplanetInfoButton" onClick={(e) => { e.stopPropagation(); enterSystemView(planet); }} aria-label="Enter system view" title="View System"><FontAwesomeIcon icon={faGlobe} /></button>
                        <button className="dinoSatExoplanetInfoButton" onClick={(e) => { e.stopPropagation(); setDetailedPlanet(planet); setDetailedPosition({ x: 0, y: 0 }); }} aria-label="Show details"><FontAwesomeIcon icon={faInfoCircle} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="dinoSatExoplanetMainView">
          <div className="dinonSatExoplanetViewHeader">
            <div className="dinoSatExoplanetCatalogControls">
              <select className="dinoSatExoplanetFilterSelect" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}><option value="All">All Types</option>{Object.keys(PLANET_TYPE_COLORS).map(type => (<option key={type} value={type}>{type}</option>))}</select>
              <select className="dinoSatExoplanetFilterSelect" value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}><option value="All">All Methods</option>{Object.keys(DISCOVERY_METHOD_COLORS).map(method => (<option key={method} value={method}>{method}</option>))}</select>
              <select className="dinoSatExoplanetFilterSelect" value={spectralFilter} onChange={(e) => setSpectralFilter(e.target.value)}><option value="All">All Stars</option>{Object.keys(SPECTRAL_TYPE_COLORS).filter(s => s !== "Unknown").map(type => (<option key={type} value={type}>{type}-type Star</option>))}</select>
              <select className="dinoSatExoplanetFilterSelect" value={radiusFilter} onChange={(e) => setRadiusFilter(e.target.value)}><option value="All">All Radii</option>{RADIUS_RANGES.map(range => (<option key={range.label} value={range.label}>{range.label}</option>))}</select>
              <select className="dinoSatExoplanetFilterSelect" value={distanceFilter} onChange={(e) => setDistanceFilter(e.target.value)}><option value="All">All Distances</option>{DISTANCE_RANGES.map(range => (<option key={range.label} value={range.label}>{range.label}</option>))}</select>
              <select className="dinoSatExoplanetFilterSelect" value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)}><option value="All">All Periods</option>{PERIOD_RANGES.map(range => (<option key={range.label} value={range.label}>{range.label}</option>))}</select>
              <select className="dinoSatExoplanetFilterSelect" value={sortOption} onChange={(e) => setSortOption(e.target.value)}>{SORT_OPTIONS.map(option => (<option key={option.value} value={option.value}>{option.label}</option>))}</select>
              <button className="dinoSatExoplanetCatalogControlsButton" onClick={clearFilters}>Clear Filters</button>
              <select className="dinoSatExoplanetFPSSelect" value={targetFps} onChange={(e) => setTargetFps(Number(e.target.value))}>{FPS_OPTIONS.map(fps => (<option key={fps} value={fps}>{fps} FPS</option>))}</select>
              <div className="dinoSatExoplanetCatalogControlsButton" onClick={toggleHUD}><FontAwesomeIcon icon={faChartLine} /> HUD</div>
              <button className="dinoSatExoplanetCatalogControlsButton" onClick={exportJSON}>Export JSON</button>
              <button className="dinoSatExoplanetCatalogControlsButton" onClick={exportCSV}>Export CSV</button>
            </div>
          </div>
          <div ref={mountRef} className="dinoSatExoplanetCanvasContainer" />
          <div ref={legendPanelRef} className={`dinoSatExoplanetLegendPanel ${legendCollapsed ? "exoplanet-collapsed" : ""}`} style={{ transform: `translate(${legendPosition.x}px, ${legendPosition.y}px)`, cursor: isDraggingLegend ? "grabbing" : "grab" }} onMouseDown={handleLegendMouseDown} tabIndex={0}>
            <div className="dinoSatExoplanetPanelHeader" onClick={handleLegendToggle}><small>Legend</small><span className="dinosatExoplanetHeaderIcon"><FontAwesomeIcon icon={legendCollapsed ? faChevronDown : faChevronUp} /></span></div>
            {!legendCollapsed && (
              <div className="dinoSatExoplanetPanelContent">
                <small>Planet Types</small>
                {Object.entries(PLANET_TYPE_COLORS).slice(0, 10).map(([type, color]) => (<div key={type} className="dinoSatExoplanetLegendItem"><div className="dinoSatExoplanetLegendColor" style={{ backgroundColor: color }} /><span>{type}</span></div>))}
                <small>Star Spectral Types</small>
                {Object.entries(SPECTRAL_TYPE_COLORS).filter(([t]) => t !== "Unknown").map(([type, color]) => (<div key={type} className="dinoSatExoplanetLegendItem"><div className="dinoSatExoplanetLegendColor" style={{ backgroundColor: color, borderRadius: "50%" }} /><span>{type}-type</span></div>))}
              </div>
            )}
          </div>
          <div ref={controlsPanelRef} className={`dinoSatExoplanetControlsPanel ${controlsCollapsed ? "exoplanet-collapsed" : ""}`} style={{ transform: `translate(${controlsPosition.x}px, ${controlsPosition.y}px)`, cursor: isDraggingControls ? "grabbing" : "grab" }} onMouseDown={handleControlsMouseDown} tabIndex={0}>
            <div className="dinoSatExoplanetPanelHeader" onClick={handleControlsToggle}><span>View Controls</span><span className="dinosatExoplanetHeaderIcon"><FontAwesomeIcon icon={controlsCollapsed ? faChevronDown : faChevronUp} /></span></div>
            {!controlsCollapsed && (
              <div className="dinoSatExoplanetPanelContent">
                <button className="dinoSatExoplanetControlButton" onClick={resetCamera}>Reset Camera</button>
                <button className="dinoSatExoplanetControlButton" onClick={toggleLabels}>{showLabels ? "Hide" : "Show"} Labels</button>
                <button className="dinoSatExoplanetControlButton" onClick={toggleStarColors}>{showStarColors ? "Hide" : "Show"} Star Colors</button>
                <button className="dinoSatExoplanetControlButton" onClick={toggleBloom}>{bloomEnabled ? "Disable" : "Enable"} Bloom</button>
                {viewMode === "galaxy" && (
                  <>
                    <button className="dinoSatExoplanetControlButton" onClick={toggleEquatorialGrid}>{showEquatorialGrid ? "Hide" : "Show"} Equatorial Grid</button>
                    <button className="dinoSatExoplanetControlButton" onClick={toggleCelestialPlane}>{showCelestialPlane ? "Hide" : "Show"} Celestial Plane</button>
                    <button className="dinoSatExoplanetControlButton" onClick={toggleDistanceShells}>{showDistanceShells ? "Hide" : "Show"} Distance Rings</button>
                    <button className="dinoSatExoplanetControlButton" onClick={toggleAxisMarkers}>{showAxisMarkers ? "Hide" : "Show"} Axes</button>
                    <button className="dinoSatExoplanetControlButton" onClick={toggleGalacticPlane}>{showGalacticPlane ? "Hide" : "Show"} Galactic Plane</button>
                    <button className="dinoSatExoplanetControlButton" onClick={toggleConstellationBounds}>{showConstellationBounds ? "Hide" : "Show"} Constellations</button>
                  </>
                )}
                {viewMode === "system" && (
                  <>
                    <button className="dinoSatExoplanetControlButton" onClick={toggleOrbits}>{showOrbits ? "Hide" : "Show"} Orbits</button>
                    <button className="dinoSatExoplanetControlButton" onClick={toggleHabitableZone}>{showHabitableZone ? "Hide" : "Show"} Habitable Zone</button>
                    <button className="dinoSatExoplanetControlButton" onClick={toggleComparisonGhosts}>{showComparisonGhosts ? "Hide" : "Show"} Size Comparison</button>
                    <button className="dinoSatExoplanetControlButton" onClick={toggleAnimateOrbits}>{animateOrbits ? "Pause" : "Play"} Orbits</button>
                  </>
                )}
                {bloomEnabled && (
                  <div className="dinoSatExoplanetBloomControls">
                    <div className="dinoSatExoplanetBloomSlider">
                      <span>Strength</span>
                      <input type="range" min="0" max="5" step="0.1" value={bloomStrength} onChange={(e) => setBloomStrength(parseFloat(e.target.value))} onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} />
                      <span>{bloomStrength.toFixed(1)}</span>
                    </div>
                    <div className="dinoSatExoplanetBloomSlider">
                      <span>Radius</span>
                      <input type="range" min="0" max="2" step="0.05" value={bloomRadius} onChange={(e) => setBloomRadius(parseFloat(e.target.value))} onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} />
                      <span>{bloomRadius.toFixed(2)}</span>
                    </div>
                    <div className="dinoSatExoplanetBloomSlider">
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
            <div ref={hudPanelRef} className="dinoSatExoplanetHUDPanel" style={{ transform: `translate(calc(-50% + ${hudPosition.x}px), calc(-50% + ${hudPosition.y}px))`, cursor: isDraggingHud ? "grabbing" : "grab" }} onMouseDown={handleHudMouseDown} tabIndex={0}>
              <div className="dinoSatExoplanetHUDPanelHeader"><span>Performance HUD</span><button className="dinoSatExoplanetCloseButton" onClick={toggleHUD}><FontAwesomeIcon icon={faSquareXmark} /></button></div>
              <div className="dinoSatExoplanetHUDContent">
                <div className="dinosatExoplanetHUDSection">
                  <h4 style={{ marginTop: 0 }}>View Mode: {viewMode === "galaxy" ? "Galaxy Map" : "System View"}</h4>
                  <div className="dinosatExoplanetHUDSectionGrid">
                    <div className="dinosatExoplanetHUDSectionItem"><span>Reference Frame:</span><span>{viewMode === "galaxy" ? "Equatorial J2000" : "Host-Centric"}</span></div>
                    <div className="dinosatExoplanetHUDSectionItem"><span>Origin:</span><span>{viewMode === "galaxy" ? "Sol (Solar System)" : systemViewPlanet?.hostName || "N/A"}</span></div>
                    <div className="dinosatExoplanetHUDSectionItem"><span>Units:</span><span>{viewMode === "galaxy" ? "Light-Years (log)" : "AU (linear)"}</span></div>
                  </div>
                </div>
                <div className="dinosatExoplanetHUDSection">
                  <h4>Post-Processing</h4>
                  <div className="dinosatExoplanetHUDSectionGrid">
                    <div className="dinosatExoplanetHUDSectionItem"><span>Bloom:</span><span style={{ color: bloomEnabled ? "#4ECDC4" : "#888888" }}>{bloomEnabled ? "Enabled" : "Disabled"}</span></div>
                    <div className="dinosatExoplanetHUDSectionItem"><span>Bloom Strength:</span><span>{bloomStrength.toFixed(2)}</span></div>
                    <div className="dinosatExoplanetHUDSectionItem"><span>Bloom Radius:</span><span>{bloomRadius.toFixed(2)}</span></div>
                    <div className="dinosatExoplanetHUDSectionItem"><span>Bloom Threshold:</span><span>{bloomThreshold.toFixed(2)}</span></div>
                  </div>
                </div>
                <div className="dinosatExoplanetHUDSection">
                  <h4>Performance Metrics</h4>
                  <div className="dinosatExoplanetHUDSectionGrid">
                    <div className="dinosatExoplanetHUDSectionItem"><span>Render Time:</span><span>{performanceStats.renderTime}ms</span></div>
                    <div className="dinosatExoplanetHUDSectionItem"><span>Target FPS:</span><span>{targetFps}</span></div>
                    <div className="dinosatExoplanetHUDSectionItem"><span>Actual FPS:</span><span>{actualFps}</span></div>
                    <div className="dinosatExoplanetHUDSectionItem"><span>Draw Calls:</span><span>{performanceStats.drawCalls}</span></div>
                    <div className="dinosatExoplanetHUDSectionItem"><span>Visible Planets:</span><span style={{ color: "#00ff00" }}>{performanceStats.visiblePlanets}</span></div>
                  </div>
                </div>
                <div className="dinosatExoplanetHUDSection">
                  <h4>Data Status</h4>
                  <div className="dinosatExoplanetHUDSectionGrid">
                    <div className="dinosatExoplanetHUDSectionItem"><span>Active Planets:</span><span>{activePlanets}</span></div>
                    <div className="dinosatExoplanetHUDSectionItem"><span>Total Objects:</span><span>{planets.length}</span></div>
                    <div className="dinosatExoplanetHUDSectionItem"><span>Data Source:</span><span>NASA Exoplanet Archive</span></div>
                    <div className="dinosatExoplanetHUDSectionItem"><span>Habitable Zone:</span><span style={{ color: "#00ff00" }}>{loadingMetadata?.habitableCount || 0}</span></div>
                  </div>
                </div>
                <div className="dinosatExoplanetHUDSection">
                  <h4>Spectral Distribution</h4>
                  <div className="dinosatExoplanetHUDSectionGrid">
                    {Object.entries(spectralCounts).slice(0, 8).map(([type, count]) => (<div key={type} className="dinosatExoplanetHUDSectionItem"><span style={{ color: SPECTRAL_TYPE_COLORS[type] || "#888" }}>{type}-type:</span><span>{count}</span></div>))}
                  </div>
                </div>
              </div>
            </div>
          )}
          {detailedPlanet && (
            <div ref={detailedPanelRef} className="dinoSatExoplanetDetailedPanel" style={{ transform: `translate(calc(-50% + ${detailedPosition.x}px), calc(-50% + ${detailedPosition.y}px))`, cursor: isDraggingDetailed ? "grabbing" : "grab" }} onMouseDown={handleDetailedMouseDown} tabIndex={0}>
              <div className="dinoSatExoplanetHUDPanelHeader"><span>{detailedPlanet.name}</span><button className="dinoSatExoplanetCloseButton" onClick={() => setDetailedPlanet(null)}><FontAwesomeIcon icon={faSquareXmark} /></button></div>
              <div className="dinoSatExoplanetHUDContent">
                <div className="dinosatExoplanetHUDSection">
                  <h4>Identification</h4>
                  <div className="dinosatExoplanetHUDSectionGrid">
                    <div className="dinosatExoplanetHUDSectionItem"><span>Planet Name:</span><span>{detailedPlanet.name}</span></div>
                    <div className="dinosatExoplanetHUDSectionItem"><span>Host Star:</span><span style={{ color: detailedPlanet.starColor }}>{detailedPlanet.hostName || "N/A"}</span></div>
                    <div className="dinosatExoplanetHUDSectionItem"><span>Planet Type:</span><span style={{ color: detailedPlanet.color }}>{detailedPlanet.planetType}</span></div>
                    <div className="dinosatExoplanetHUDSectionItem"><span>Discovery Method:</span><span style={{ color: detailedPlanet.methodColor }}>{detailedPlanet.discoveryMethod}</span></div>
                    <div className="dinosatExoplanetHUDSectionItem"><span>Discovery Year:</span><span>{detailedPlanet.discoveryYear || "Unknown"}</span></div>
                    <div className="dinosatExoplanetHUDSectionItem"><span>ESI:</span><span style={{ color: detailedPlanet.earthSimilarityIndex > 0.8 ? "#00ff00" : detailedPlanet.earthSimilarityIndex > 0.5 ? "#ffff00" : "#ff4400" }}>{detailedPlanet.earthSimilarityIndex?.toFixed(4) || "N/A"}</span></div>
                  </div>
                </div>
                <div className="dinosatExoplanetHUDSection">
                  <h4>Celestial Position (J2000)</h4>
                  <div className="dinosatExoplanetHUDSectionGrid">
                    <div className="dinosatExoplanetHUDSectionItem"><span>Right Ascension:</span><span>{detailedPlanet.ra?.toFixed(6)}°</span></div>
                    <div className="dinosatExoplanetHUDSectionItem"><span>Declination:</span><span>{detailedPlanet.dec?.toFixed(6)}°</span></div>
                    <div className="dinosatExoplanetHUDSectionItem"><span>Distance:</span><span>{detailedPlanet.distance?.toFixed(2)} ly</span></div>
                    <div className="dinosatExoplanetHUDSectionItem"><span>Distance (pc):</span><span>{detailedPlanet.distancePc?.toFixed(2) || (detailedPlanet.distance / 3.26156)?.toFixed(2)} pc</span></div>
                  </div>
                </div>
                <div className="dinosatExoplanetHUDSection">
                  <h4>Orbital Properties</h4>
                  <div className="dinosatExoplanetHUDSectionGrid">
                    <div className="dinosatExoplanetHUDSectionItem"><span>Orbital Period:</span><span>{detailedPlanet.orbitalPeriod ? `${detailedPlanet.orbitalPeriod.toFixed(4)} days` : "N/A"}</span></div>
                    <div className="dinosatExoplanetHUDSectionItem"><span>Semi-Major Axis:</span><span>{detailedPlanet.semiMajorAxis ? `${detailedPlanet.semiMajorAxis.toFixed(6)} AU` : "N/A"}</span></div>
                    <div className="dinosatExoplanetHUDSectionItem"><span>Eccentricity:</span><span>{detailedPlanet.eccentricity?.toFixed(6) || "N/A"}</span></div>
                    <div className="dinosatExoplanetHUDSectionItem"><span>Inclination:</span><span>{detailedPlanet.inclination ? `${detailedPlanet.inclination.toFixed(4)}°` : "N/A"}</span></div>
                  </div>
                </div>
                <div className="dinosatExoplanetHUDSection">
                  <h4>Physical Properties</h4>
                  <div className="dinosatExoplanetHUDSectionGrid">
                    <div className="dinosatExoplanetHUDSectionItem"><span>Planet Radius:</span><span>{detailedPlanet.planetRadius ? `${detailedPlanet.planetRadius.toFixed(4)} R⊕` : "N/A"}</span></div>
                    <div className="dinosatExoplanetHUDSectionItem"><span>Planet Mass:</span><span>{detailedPlanet.planetMass ? `${detailedPlanet.planetMass.toFixed(4)} M⊕` : "N/A"}</span></div>
                    <div className="dinosatExoplanetHUDSectionItem"><span>Density:</span><span>{detailedPlanet.planetDensity ? `${detailedPlanet.planetDensity.toFixed(4)} g/cm³` : "N/A"}</span></div>
                    <div className="dinosatExoplanetHUDSectionItem"><span>Surface Gravity:</span><span>{detailedPlanet.surfaceGravity ? `${detailedPlanet.surfaceGravity.toFixed(4)} m/s²` : "N/A"}</span></div>
                    <div className="dinosatExoplanetHUDSectionItem"><span>Equilibrium Temp:</span><span>{detailedPlanet.equilibriumTemp ? `${detailedPlanet.equilibriumTemp.toFixed(0)} K` : "N/A"}</span></div>
                    <div className="dinosatExoplanetHUDSectionItem"><span>Insolation Flux:</span><span>{detailedPlanet.insolation ? `${detailedPlanet.insolation.toFixed(4)} S⊕` : "N/A"}</span></div>
                  </div>
                </div>
                <div className="dinosatExoplanetHUDSection">
                  <h4>Host Star Properties</h4>
                  <div className="dinosatExoplanetHUDSectionGrid">
                    <div className="dinosatExoplanetHUDSectionItem"><span>Spectral Type:</span><span style={{ color: detailedPlanet.starColor }}>{detailedPlanet.hostSpectralType || "N/A"} ({detailedPlanet.hostSpectralClass})</span></div>
                    <div className="dinosatExoplanetHUDSectionItem"><span>Effective Temp:</span><span>{detailedPlanet.hostTemp ? `${detailedPlanet.hostTemp} K` : "N/A"}</span></div>
                    <div className="dinosatExoplanetHUDSectionItem"><span>Stellar Radius:</span><span>{detailedPlanet.hostRadius ? `${detailedPlanet.hostRadius.toFixed(4)} R☉` : "N/A"}</span></div>
                    <div className="dinosatExoplanetHUDSectionItem"><span>Stellar Mass:</span><span>{detailedPlanet.hostMass ? `${detailedPlanet.hostMass.toFixed(4)} M☉` : "N/A"}</span></div>
                    <div className="dinosatExoplanetHUDSectionItem"><span>Luminosity:</span><span>{detailedPlanet.hostLuminosity ? `${detailedPlanet.hostLuminosity.toFixed(4)} L☉` : "N/A"}</span></div>
                    <div className="dinosatExoplanetHUDSectionItem"><span>Age:</span><span>{detailedPlanet.hostAge ? `${detailedPlanet.hostAge.toFixed(2)} Gyr` : "N/A"}</span></div>
                  </div>
                </div>
                {detailedPlanet.habitableZone && (
                  <div className="dinosatExoplanetHUDSection">
                    <h4>Habitable Zone</h4>
                    <div className="dinosatExoplanetHUDSectionGrid">
                      <div className="dinosatExoplanetHUDSectionItem"><span>Inner Edge:</span><span>{detailedPlanet.habitableZone.innerEdge} AU</span></div>
                      <div className="dinosatExoplanetHUDSectionItem"><span>Outer Edge:</span><span>{detailedPlanet.habitableZone.outerEdge} AU</span></div>
                      <div className="dinosatExoplanetHUDSectionItem"><span>Conservative Inner:</span><span>{detailedPlanet.habitableZone.conservativeInner} AU</span></div>
                      <div className="dinosatExoplanetHUDSectionItem"><span>Conservative Outer:</span><span>{detailedPlanet.habitableZone.conservativeOuter} AU</span></div>
                      <div className="dinosatExoplanetHUDSectionItem"><span>Planet Position:</span><span style={{ color: detailedPlanet.habitability?.includes("HZ") ? "#00ff00" : "#ff4400" }}>{detailedPlanet.semiMajorAxis?.toFixed(4)} AU</span></div>
                    </div>
                  </div>
                )}
                <div className="dinosatExoplanetHUDSection">
                  <h4>System Properties</h4>
                  <div className="dinosatExoplanetHUDSectionGrid">
                    <div className="dinosatExoplanetHUDSectionItem"><span>Number of Stars:</span><span>{detailedPlanet.numStars || "N/A"}</span></div>
                    <div className="dinosatExoplanetHUDSectionItem"><span>Number of Planets:</span><span>{detailedPlanet.numPlanets || "N/A"}</span></div>
                    <div className="dinosatExoplanetHUDSectionItem"><span>Habitability:</span><span style={{ color: detailedPlanet.habitability?.includes("HZ") ? "#00ff00" : detailedPlanet.habitability === "Potentially Habitable" ? "#ffff00" : "#ff4400" }}>{detailedPlanet.habitability || "Unknown"}</span></div>
                  </div>
                </div>
                <div className="dinosatExoplanetHUDSection">
                  <button className="dinoSatExoplanetControlButton" onClick={() => { enterSystemView(detailedPlanet); setDetailedPlanet(null); }} style={{ width: "100%", marginTop: "8px" }}>
                    <FontAwesomeIcon icon={faGlobe} /> Enter System View
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}