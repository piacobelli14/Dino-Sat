import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as THREE from "three";
import * as TWEEN from "three/examples/jsm/libs/tween.module.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faInfoCircle, faTh, faTimes, faPlay, faPause, faRedo, faBorderAll, 
  faPlus, faSquarePlus, faBars, faSquareXmark, faMeteor, faChartLine, 
  faChevronDown, faChevronUp, faXmarkSquare, faSquareCheck, faClone 
} from "@fortawesome/free-solid-svg-icons";
import DinoLabsNav from "../../../helpers/Nav.jsx";
import "../../../styles/helperStyles/Switch.css";
import "../../../styles/mainStyles/DinoSat/DinoSatTrackers/Comets/CometTracker.css";

export default function CometTracker() {
  const CATEGORY_COLORS = {
    "Short-period": "#4ECDC4",
    "Intermediate-period": "#FF9500",
    "Long-period": "#FF6B6B",
    "Sungrazer": "#FFE66D",
    "Hyperbolic": "#A8E6CF"
  };

  const SPEED_OPTIONS = [
    { label: "-10 years/sec", value: -10 },
    { label: "-5 years/sec", value: -5 },
    { label: "-1 year/sec", value: -1 },
    { label: "Real-time", value: 0.0000000317 },
    { label: "1 year/sec", value: 1 },
    { label: "5 years/sec", value: 5 },
    { label: "10 years/sec", value: 10 },
  ];

  const FPS_OPTIONS = [30, 60, 120, 144];

  const PERFORMANCE_CONSTANTS = {
    MAX_VISIBLE_COMETS: 3000,
    LOD_DISTANCES: [50, 200, 1000, 5000],
    BATCH_SIZE: 500,
    UPDATE_FREQUENCY: 2,
    LABEL_DISTANCE_THRESHOLD: 300,
    FRUSTUM_MARGIN: 1.5,
    PRESELECT_COUNT: 50,
    VIRTUAL_SCROLL_ITEM_HEIGHT: 45,
    VIRTUAL_SCROLL_BUFFER: 5,
    TRAIL_LENGTH: 30
  };

  const ORBITAL_CONSTANTS = {
    J2000_EPOCH: 2451545.0,
    AU_TO_KM: 149597870.7,
    SECONDS_PER_DAY: 86400.0,
    DAYS_PER_YEAR: 365.25,
    GAUSS_K: 0.01720209895,
    TWO_PI: Math.PI * 2.0,
    PI_HALF: Math.PI / 2.0,
    DEG_TO_RAD: Math.PI / 180.0,
    RAD_TO_DEG: 180.0 / Math.PI
  };

  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);
  const [showErrors, setShowErrors] = useState(false);
  const [copiedErrors, setCopiedErrors] = useState(false);
  const [loadingMetadata, setLoadingMetadata] = useState(null);
  const [comets, setComets] = useState([]);
  const [filteredComets, setFilteredComets] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [targetFps, setTargetFps] = useState(60);
  const [actualFps, setActualFps] = useState(60);
  const [currentTime, setCurrentTime] = useState("");
  const [isPlaying, setIsPlaying] = useState(true);
  const [showOrbits, setShowOrbits] = useState(true);
  const [showTrails, setShowTrails] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showFoci, setShowFoci] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [legendCollapsed, setLegendCollapsed] = useState(false);
  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  const [hudVisible, setHudVisible] = useState(false);
  const [detailedComet, setDetailedComet] = useState(null);
  const [selectedComet, setSelectedComet] = useState(null);
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
  const labelRendererRef = useRef(null);
  const cameraRef = useRef(null);
  const cometGroupRef = useRef(null);
  const simulationTime = useRef(0);
  const frameCountRef = useRef(0);
  const lastFpsTime = useRef(0);
  const actualFpsRef = useRef(60);
  const gridRef = useRef(null);
  const hudPanelRef = useRef(null);
  const legendPanelRef = useRef(null);
  const controlsPanelRef = useRef(null);
  const detailedPanelRef = useRef(null);
  const controlsRef = useRef(null);
  const starsRef = useRef(null);
  const virtualScrollRef = useRef(null);
  const cometInstanceRef = useRef(null);
  const glowInstanceRef = useRef(null);
  const orbitLinesRef = useRef({});
  const trailLinesRef = useRef({});
  const fociRef = useRef({});
  const cometDataRef = useRef(new Map());
  const labelsRef = useRef({});
  const visibleCometsRef = useRef(new Set());
  const frustumRef = useRef(new THREE.Frustum());
  const tempMatrix = useRef(new THREE.Matrix4());
  const tempVector = useRef(new THREE.Vector3());
  const tempQuaternion = useRef(new THREE.Quaternion());
  const tempColor = useRef(new THREE.Color());
  const spatialGridRef = useRef(new Map());

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

  const toRadians = (degrees) => degrees * ORBITAL_CONSTANTS.DEG_TO_RAD;

  const toDegrees = (radians) => radians * ORBITAL_CONSTANTS.RAD_TO_DEG;

  const julianDate = (date = new Date()) => {
    const a = Math.floor((14 - (date.getMonth() + 1)) / 12);
    const y = date.getFullYear() + 4800 - a;
    const m = (date.getMonth() + 1) + 12 * a - 3;
    
    const jdn = date.getDate() + Math.floor((153 * m + 2) / 5) + 365 * y + 
               Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
    
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    const milliseconds = date.getMilliseconds();
    
    const dayFraction = (hours - 12) / 24.0 + minutes / 1440.0 + 
                       (seconds + milliseconds / 1000.0) / 86400.0;
    
    return jdn + dayFraction;
  };

  const utcToTdb = (utcJd) => {
    const t = (utcJd - ORBITAL_CONSTANTS.J2000_EPOCH) / 36525.0;
    const deltaT = 69.184 + 51.2 * t + 24.4 * t * t + 5.0 * t * t * t;
    return utcJd + deltaT / ORBITAL_CONSTANTS.SECONDS_PER_DAY;
  };

  const solveKeplerElliptical = (meanAnomaly, eccentricity, tolerance = 1e-12) => {
    let E = meanAnomaly;
    let deltaE = 1.0;
    let iterations = 0;
    const maxIterations = 50;
    
    while (Math.abs(deltaE) > tolerance && iterations < maxIterations) {
      const f = E - eccentricity * Math.sin(E) - meanAnomaly;
      const fPrime = 1.0 - eccentricity * Math.cos(E);
      deltaE = f / fPrime;
      E = E - deltaE;
      iterations++;
    }
    
    return E;
  };

  const solveKeplerHyperbolic = (meanAnomaly, eccentricity, tolerance = 1e-12) => {
    let F = Math.sign(meanAnomaly) * Math.log(2.0 * Math.abs(meanAnomaly) / eccentricity + 1.8);
    let deltaF = 1.0;
    let iterations = 0;
    const maxIterations = 50;
    
    while (Math.abs(deltaF) > tolerance && iterations < maxIterations) {
      const f = eccentricity * Math.sinh(F) - F - meanAnomaly;
      const fPrime = eccentricity * Math.cosh(F) - 1.0;
      deltaF = f / fPrime;
      F = F - deltaF;
      iterations++;
    }
    
    return F;
  };

  const orbitalElementsToCartesian = (elements, julianDateTdb) => {
    const { a, e, i, omega, w, meanAnomaly0, epoch, n } = elements;
    
    const incRad = toRadians(i);
    const omegaRad = toRadians(omega);
    const wRad = toRadians(w);
    
    const deltaT = julianDateTdb - epoch;
    const meanAnomaly = meanAnomaly0 + n * deltaT;
    
    let anomaly, nu, r;
    
    if (e < 1.0) {
      anomaly = solveKeplerElliptical(meanAnomaly, e);
      nu = 2.0 * Math.atan2(
        Math.sqrt(1.0 + e) * Math.sin(anomaly / 2.0),
        Math.sqrt(1.0 - e) * Math.cos(anomaly / 2.0)
      );
      r = a * (1.0 - e * Math.cos(anomaly));
    } else {
      anomaly = solveKeplerHyperbolic(meanAnomaly, e);
      nu = 2.0 * Math.atan2(
        Math.sqrt(e + 1.0) * Math.sinh(anomaly / 2.0),
        Math.sqrt(e - 1.0) * Math.cosh(anomaly / 2.0)
      );
      r = a * (e * Math.cosh(anomaly) - 1.0);
    }
    
    const cosNu = Math.cos(nu);
    const sinNu = Math.sin(nu);
    
    const xOrb = r * cosNu;
    const yOrb = r * sinNu;
    const zOrb = 0.0;
    
    const cosOmega = Math.cos(omegaRad);
    const sinOmega = Math.sin(omegaRad);
    const cosW = Math.cos(wRad);
    const sinW = Math.sin(wRad);
    const cosI = Math.cos(incRad);
    const sinI = Math.sin(incRad);
    
    const P11 = cosOmega * cosW - sinOmega * sinW * cosI;
    const P12 = -cosOmega * sinW - sinOmega * cosW * cosI;
    const P13 = sinOmega * sinI;
    
    const P21 = sinOmega * cosW + cosOmega * sinW * cosI;
    const P22 = -sinOmega * sinW + cosOmega * cosW * cosI;
    const P23 = -cosOmega * sinI;
    
    const P31 = sinW * sinI;
    const P32 = cosW * sinI;
    const P33 = cosI;
    
    const x = P11 * xOrb + P12 * yOrb + P13 * zOrb;
    const y = P21 * xOrb + P22 * yOrb + P23 * zOrb;
    const z = P31 * xOrb + P32 * yOrb + P33 * zOrb;
    
    return new THREE.Vector3(x, y, z);
  };

  const computeCometPosition = (comet, currentJD) => {
    const earthRadius = 6.371;
    
    if (comet.eccentricity >= 1.0) {
      const hyperbolicRadius = comet.perihelion * 10;
      const hyperbolicVelocity = 0.01;
      const phase = (comet.id.charCodeAt(0) % 100) * 0.1;
      const angle = (simulationTime.current * hyperbolicVelocity) + phase;
      
      const x = hyperbolicRadius * Math.cos(angle);
      const y = 0;
      const z = hyperbolicRadius * Math.sin(angle);
      const position = new THREE.Vector3(x, y, z);
      
      const inclinationRad = toRadians(comet.inclination);
      position.applyAxisAngle(new THREE.Vector3(1, 0, 0), inclinationRad);
      
      const raanRad = toRadians(comet.longitudeOfAscendingNode);
      position.applyAxisAngle(new THREE.Vector3(0, 1, 0), raanRad);
      
      return position;
    }
    
    const orbitRadius = earthRadius + (comet.perihelion * 5);
    const period = typeof comet.period === "number" && comet.period > 0 ? comet.period : 10;
    const angularVelocity = (ORBITAL_CONSTANTS.TWO_PI) / (period * 100);
    const phase = (comet.id.charCodeAt(0) % 100) * 0.1;
    const angle = (simulationTime.current * angularVelocity) + phase;

    const x = orbitRadius * Math.cos(angle);
    const y = 0;
    const z = orbitRadius * Math.sin(angle);
    const position = new THREE.Vector3(x, y, z);
    
    const inclinationRad = toRadians(comet.inclination);
    position.applyAxisAngle(new THREE.Vector3(1, 0, 0), inclinationRad);
    
    const raanRad = toRadians(comet.longitudeOfAscendingNode);
    position.applyAxisAngle(new THREE.Vector3(0, 1, 0), raanRad);
    
    return position;
  };

  const applyOrbitalScaling = (position, scaleFactor = 1.0) => {
    const distance = position.length();
    if (distance === 0) return position;
    
    const maxDisplayDistance = 300;
    const minDisplayDistance = 5;
    
    if (distance > 50) {
      const scaledDistance = minDisplayDistance + (maxDisplayDistance - minDisplayDistance) * Math.log10(distance / 50) / Math.log10(100);
      return position.normalize().multiplyScalar(scaledDistance);
    }
    
    return position.clone().multiplyScalar(scaleFactor);
  };

  const generateOrbitPoints = (elements, segments = 128) => {
    const points = [];
    const { perihelion, eccentricity, inclination, longitudeOfAscendingNode } = elements;
    const earthRadius = 6.371;
    
    if (eccentricity >= 1.0) {
      const hyperbolicRadius = perihelion * 10;
      
      for (let j = 0; j <= segments; j++) {
        const angle = (j / segments) * ORBITAL_CONSTANTS.TWO_PI;
        const x = hyperbolicRadius * Math.cos(angle);
        const y = 0;
        const z = hyperbolicRadius * Math.sin(angle);
        const orbitPoint = new THREE.Vector3(x, y, z);
        
        const inclinationRad = toRadians(inclination);
        orbitPoint.applyAxisAngle(new THREE.Vector3(1, 0, 0), inclinationRad);
        
        const raanRad = toRadians(longitudeOfAscendingNode);
        orbitPoint.applyAxisAngle(new THREE.Vector3(0, 1, 0), raanRad);
        
        points.push(orbitPoint);
      }
    } else {
      const orbitRadius = earthRadius + (perihelion * 5);
      
      for (let j = 0; j <= segments; j++) {
        const angle = (j / segments) * ORBITAL_CONSTANTS.TWO_PI;
        const x = orbitRadius * Math.cos(angle);
        const y = 0;
        const z = orbitRadius * Math.sin(angle);
        const orbitPoint = new THREE.Vector3(x, y, z);
        
        const inclinationRad = toRadians(inclination);
        orbitPoint.applyAxisAngle(new THREE.Vector3(1, 0, 0), inclinationRad);
        
        const raanRad = toRadians(longitudeOfAscendingNode);
        orbitPoint.applyAxisAngle(new THREE.Vector3(0, 1, 0), raanRad);
        
        points.push(orbitPoint);
      }
    }
    
    return points;
  };

  const createLabel = useCallback((text, color = "#ffffff") => {
    const div = document.createElement("div");
    div.className = "comet-body-label";
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

  const createOrbitLine = useCallback((comet) => {
    const orbitalElements = {
      perihelion: comet.perihelion,
      eccentricity: comet.eccentricity,
      inclination: comet.inclination,
      longitudeOfAscendingNode: comet.longitudeOfAscendingNode
    };
    
    const orbitPoints = generateOrbitPoints(orbitalElements);
    
    if (orbitPoints.length > 0) {
      const orbitGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
      const orbitMaterial = new THREE.LineBasicMaterial({
        color: comet.color,
        transparent: true,
        opacity: 0.6,
        linewidth: 1
      });
      const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
      orbitLine.visible = showOrbits;
      return orbitLine;
    }
    return null;
  }, [showOrbits]);

  const createTrailLine = useCallback((comet) => {
    const trailPositions = new Float32Array(PERFORMANCE_CONSTANTS.TRAIL_LENGTH * 3);
    const trailColors = new Float32Array(PERFORMANCE_CONSTANTS.TRAIL_LENGTH * 3);
    const trailGeometry = new THREE.BufferGeometry();
    trailGeometry.setAttribute("position", new THREE.BufferAttribute(trailPositions, 3));
    trailGeometry.setAttribute("color", new THREE.BufferAttribute(trailColors, 3));

    const color = new THREE.Color(comet.color);
    for (let i = 0; i < PERFORMANCE_CONSTANTS.TRAIL_LENGTH; i++) {
      const idx = i * 3;
      const currentPos = computeCometPosition(comet, 0);
      
      trailPositions[idx] = currentPos.x;
      trailPositions[idx + 1] = currentPos.y;
      trailPositions[idx + 2] = currentPos.z;
      
      const fade = Math.pow((PERFORMANCE_CONSTANTS.TRAIL_LENGTH - i) / PERFORMANCE_CONSTANTS.TRAIL_LENGTH, 1.5);
      trailColors[idx] = color.r * fade;
      trailColors[idx + 1] = color.g * fade;
      trailColors[idx + 2] = color.b * fade;
    }

    const trailMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      linewidth: 2,
      blending: THREE.AdditiveBlending
    });

    const trailLine = new THREE.Line(trailGeometry, trailMaterial);
    trailLine.visible = showTrails;
    return trailLine;
  }, [showTrails]);

  const createFocusPoint = useCallback((comet) => {
    const focusGeometry = new THREE.SphereGeometry(1.5, 8, 8);
    const focusMaterial = new THREE.MeshBasicMaterial({
      color: "#FFD700",
      transparent: true,
      opacity: 0.8,
      emissive: "#FFD700",
      emissiveIntensity: 0.3
    });
    
    const focusPoint = new THREE.Mesh(focusGeometry, focusMaterial);
    focusPoint.position.set(0, 0, 0);
    focusPoint.visible = showFoci;
    
    const glowGeometry = new THREE.SphereGeometry(3.0, 8, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: "#FFD700",
      transparent: true,
      opacity: 0.2,
      side: THREE.BackSide
    });
    
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.set(0, 0, 0);
    glow.visible = showFoci;
    
    const focusGroup = new THREE.Group();
    focusGroup.add(focusPoint);
    focusGroup.add(glow);
    focusGroup.visible = showFoci;
    
    return focusGroup;
  }, [showFoci]);

  const updateSpatialGrid = useCallback(() => {
    spatialGrid.clear();
    
    comets.forEach((comet, index) => {
      if (comet.active) {
        const data = cometDataRef.current.get(comet.id);
        if (data && data.position) {
          spatialGrid.add({ comet, index }, data.position);
        }
      }
    });
  }, [comets, spatialGrid]);

  const performFrustumCulling = useCallback(() => {
    if (!cameraRef.current) return;

    const camera = cameraRef.current;
    const matrix = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustumRef.current.setFromProjectionMatrix(matrix);
    
    const newVisibleComets = new Set();
    let visibleCount = 0;
    let culledCount = 0;

    comets.forEach((comet) => {
      if (!comet.active) return;

      const data = cometDataRef.current.get(comet.id);
      if (!data || !data.position) return;

      const distance = data.position.distanceTo(camera.position);
      const sphere = new THREE.Sphere(data.position, 2.0 * PERFORMANCE_CONSTANTS.FRUSTUM_MARGIN);
      
      if (frustumRef.current.intersectsSphere(sphere) && distance < 3000) {
        newVisibleComets.add(comet.id);
        visibleCount++;
        
        if (visibleCount >= PERFORMANCE_CONSTANTS.MAX_VISIBLE_COMETS) {
          return;
        }
      } else {
        culledCount++;
      }
    });

    visibleCometsRef.current = newVisibleComets;

    setPerformanceStats(prev => ({
      ...prev,
      visibleComets: visibleCount,
      culledComets: culledCount
    }));
  }, [comets]);

  const updateInstancedMeshes = useCallback(() => {
    if (!cometInstanceRef.current || !glowInstanceRef.current) return;

    const currentJD = julianDate(new Date(Date.now() + simulationTime.current * ORBITAL_CONSTANTS.DAYS_PER_YEAR * 86400000));
    const currentTdb = utcToTdb(currentJD);
    let instanceIndex = 0;
    
    comets.forEach((comet) => {
      if (!comet.active || instanceIndex >= PERFORMANCE_CONSTANTS.MAX_VISIBLE_COMETS) return;

      const position = computeCometPosition(comet, currentTdb);
      
      cometDataRef.current.set(comet.id, {
        position: position.clone(),
        lastUpdate: Date.now(),
        instanceIndex
      });

      if (visibleCometsRef.current.has(comet.id)) {
        tempMatrix.current.makeTranslation(position.x, position.y, position.z);
        cometInstanceRef.current.setMatrixAt(instanceIndex, tempMatrix.current);
        glowInstanceRef.current.setMatrixAt(instanceIndex, tempMatrix.current);

        tempColor.current.setHex(comet.color.replace("#", "0x"));
        cometInstanceRef.current.setColorAt(instanceIndex, tempColor.current);

        instanceIndex++;
      }
    });

    if (instanceIndex > 0) {
      cometInstanceRef.current.instanceMatrix.needsUpdate = true;
      glowInstanceRef.current.instanceMatrix.needsUpdate = true;
      if (cometInstanceRef.current.instanceColor) {
        cometInstanceRef.current.instanceColor.needsUpdate = true;
      }
    }

    cometInstanceRef.current.count = instanceIndex;
    glowInstanceRef.current.count = instanceIndex;
  }, [comets]);

  const updateOrbitsAndTrails = useCallback(() => {
    comets.forEach((comet) => {
      if (!comet.active) return;

      if (showOrbits && !orbitLinesRef.current[comet.id]) {
        const orbitLine = createOrbitLine(comet);
        if (orbitLine) {
          cometGroupRef.current.add(orbitLine);
          orbitLinesRef.current[comet.id] = orbitLine;
        }
      }

      if (showTrails && !trailLinesRef.current[comet.id]) {
        const trailLine = createTrailLine(comet);
        if (trailLine) {
          cometGroupRef.current.add(trailLine);
          trailLinesRef.current[comet.id] = trailLine;
        }
      }

      if (showFoci && !fociRef.current[comet.id]) {
        const focusPoint = createFocusPoint(comet);
        if (focusPoint) {
          cometGroupRef.current.add(focusPoint);
          fociRef.current[comet.id] = focusPoint;
        }
      }

      if (orbitLinesRef.current[comet.id]) {
        orbitLinesRef.current[comet.id].visible = showOrbits;
      }

      if (trailLinesRef.current[comet.id]) {
        trailLinesRef.current[comet.id].visible = showTrails;
        
        if (showTrails && trailLinesRef.current[comet.id]) {
          trailLinesRef.current[comet.id].visible = showTrails;
          
          if (showTrails && frameCountRef.current % 2 === 0) {
            const trail = trailLinesRef.current[comet.id];
            const positions = trail.geometry.attributes.position.array;
            const colors = trail.geometry.attributes.color.array;
            const color = new THREE.Color(comet.color);

            const earthRadius = 6.371;
            const period = typeof comet.period === "number" && comet.period > 0 ? comet.period : 10;
            const angularVelocity = (ORBITAL_CONSTANTS.TWO_PI) / (period * 100);
            const phase = (comet.id.charCodeAt(0) % 100) * 0.1;
            const inclinationRad = toRadians(comet.inclination);
            const raanRad = toRadians(comet.longitudeOfAscendingNode);

            if (comet.eccentricity >= 1.0) {
              const hyperbolicRadius = comet.perihelion * 10;
              const hyperbolicVelocity = 0.01;

              for (let i = 0; i < PERFORMANCE_CONSTANTS.TRAIL_LENGTH; i++) {
                const trailAngle = (simulationTime.current * hyperbolicVelocity) + phase - (i * 0.02);
                const trailX = hyperbolicRadius * Math.cos(trailAngle);
                const trailY = 0;
                const trailZ = hyperbolicRadius * Math.sin(trailAngle);
                const trailPoint = new THREE.Vector3(trailX, trailY, trailZ);
                
                trailPoint.applyAxisAngle(new THREE.Vector3(1, 0, 0), inclinationRad);
                trailPoint.applyAxisAngle(new THREE.Vector3(0, 1, 0), raanRad);

                const idx = i * 3;
                positions[idx] = trailPoint.x;
                positions[idx + 1] = trailPoint.y;
                positions[idx + 2] = trailPoint.z;

                const fade = Math.pow((PERFORMANCE_CONSTANTS.TRAIL_LENGTH - i) / PERFORMANCE_CONSTANTS.TRAIL_LENGTH, 1.5);
                colors[idx] = color.r * fade;
                colors[idx + 1] = color.g * fade;
                colors[idx + 2] = color.b * fade;
              }
            } else {
              const orbitRadius = earthRadius + (comet.perihelion * 5);

              for (let i = 0; i < PERFORMANCE_CONSTANTS.TRAIL_LENGTH; i++) {
                const trailAngle = (simulationTime.current * angularVelocity) + phase - (i * 0.02);
                const trailX = orbitRadius * Math.cos(trailAngle);
                const trailY = 0;
                const trailZ = orbitRadius * Math.sin(trailAngle);
                const trailPoint = new THREE.Vector3(trailX, trailY, trailZ);
                
                trailPoint.applyAxisAngle(new THREE.Vector3(1, 0, 0), inclinationRad);
                trailPoint.applyAxisAngle(new THREE.Vector3(0, 1, 0), raanRad);

                const idx = i * 3;
                positions[idx] = trailPoint.x;
                positions[idx + 1] = trailPoint.y;
                positions[idx + 2] = trailPoint.z;

                const fade = Math.pow((PERFORMANCE_CONSTANTS.TRAIL_LENGTH - i) / PERFORMANCE_CONSTANTS.TRAIL_LENGTH, 1.5);
                colors[idx] = color.r * fade;
                colors[idx + 1] = color.g * fade;
                colors[idx + 2] = color.b * fade;
              }
            }

            trail.geometry.attributes.position.needsUpdate = true;
            trail.geometry.attributes.color.needsUpdate = true;
            trail.geometry.setDrawRange(0, PERFORMANCE_CONSTANTS.TRAIL_LENGTH);
          }
        }
      }

      if (fociRef.current[comet.id]) {
        fociRef.current[comet.id].visible = showFoci;
      }
    });

    Object.keys(orbitLinesRef.current).forEach(cometId => {
      const comet = comets.find(c => c.id === cometId);
      if (!comet || !comet.active) {
        const orbitLine = orbitLinesRef.current[cometId];
        if (orbitLine) {
          cometGroupRef.current.remove(orbitLine);
          orbitLine.geometry.dispose();
          orbitLine.material.dispose();
          delete orbitLinesRef.current[cometId];
        }
      }
    });

    Object.keys(trailLinesRef.current).forEach(cometId => {
      const comet = comets.find(c => c.id === cometId);
      if (!comet || !comet.active) {
        const trailLine = trailLinesRef.current[cometId];
        if (trailLine) {
          cometGroupRef.current.remove(trailLine);
          trailLine.geometry.dispose();
          trailLine.material.dispose();
          delete trailLinesRef.current[cometId];
        }
      }
    });

    Object.keys(fociRef.current).forEach(cometId => {
      const comet = comets.find(c => c.id === cometId);
      if (!comet || !comet.active) {
        const focusPoint = fociRef.current[cometId];
        if (focusPoint) {
          cometGroupRef.current.remove(focusPoint);
          focusPoint.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
          });
          delete fociRef.current[cometId];
        }
      }
    });
  }, [comets, showOrbits, showTrails, showFoci, createOrbitLine, createTrailLine, createFocusPoint]);

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

    Object.keys(labelsRef.current).forEach(cometId => {
      const label = labelsRef.current[cometId];
      if (!label || !label.element) return;

      const data = cometDataRef.current.get(cometId);
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

  const fetchRealCometData = async () => {
    const startTime = performance.now();
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_AUTH_URL}/all-comet-data`, {
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
      
      const processedComets = result.comets.map((comet, index) => ({
        ...comet,
        color: CATEGORY_COLORS[comet.category] || "#888888",
        active: index < PERFORMANCE_CONSTANTS.PRESELECT_COUNT
      }));

      return {
        comets: processedComets,
        errors: result.errors || [],
        metadata: {
          ...result.metadata,
          loadTime: performance.now() - startTime
        }
      };

    } catch (error) {
      return {
        comets: [],
        errors: [`Backend connection failed: ${error.message}. No real comet data available.`],
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
      setTimeout(() => {
        setCopiedErrors(false);
      }, 2000);
    } catch (error) {}
  }, [errors]);

  const handleHudMouseDown = useCallback((e) => {
    if (e.target.closest(".comet-close-btn")) return;
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
    if (e.target.closest(".comet-collapse-icon")) return;
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
    if (e.target.closest(".comet-collapse-icon") || 
        e.target.closest(".dinoSatCometControlButton") || 
        e.target.closest(".comet-trail-slider")) return;
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
    if (e.target.closest(".comet-close-btn") || 
        e.target.closest(".comet-model-viewer")) return;
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
      filteredComets.length - 1,
      Math.ceil((virtualScrollOffset + containerHeight) / itemHeight) + buffer
    );

    const visibleItems = filteredComets.slice(startIndex, endIndex + 1);

    return { visibleItems, startIndex, endIndex };
  }, [filteredComets, virtualScrollOffset]);

  const exportJSON = useCallback(() => {
    const detailedComets = comets.map(comet => {
      const data = cometDataRef.current.get(comet.id);
      const position = data ? data.position : { x: 0, y: 0, z: 0 };
      const distance = Math.sqrt(position.x * position.x + position.y * position.y + position.z * position.z);

      return {
        ...comet,
        currentPosition: {
          x: position.x.toFixed(2),
          y: position.y.toFixed(2),
          z: position.z.toFixed(2)
        },
        currentDistance: distance.toFixed(2),
        visible: visibleCometsRef.current.has(comet.id)
      };
    });

    const exportData = {
      comets: detailedComets,
      hudReadouts: {
        activeComets: comets.filter(c => c.active).length,
        actualFps,
        currentTime,
        speedMultiplier,
        performanceStats
      },
      loadingMetadata,
      apiErrors: errors,
      orbitPropagation: {
        ellipticalCount: comets.filter(c => c.eccentricity < 1.0).length,
        hyperbolicCount: comets.filter(c => c.eccentricity >= 1.0).length,
        fallbackCount: 0
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "comet_data_optimized.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [comets, actualFps, currentTime, speedMultiplier, performanceStats, loadingMetadata, errors]);

  const exportCSV = useCallback(() => {
    let csv = "ID,Name,Category,Perihelion,Aphelion,Eccentricity,Inclination,Period,Magnitude,Diameter,Albedo,RotationPeriod,SemiMajorAxis,ArgumentOfPerihelion,LongitudeOfAscendingNode,MeanAnomaly,Color,Active,Source,PositionX,PositionY,PositionZ,CurrentDistance,Visible\n";

    comets.forEach(comet => {
      const data = cometDataRef.current.get(comet.id);
      const position = data ? data.position : { x: 0, y: 0, z: 0 };
      const distance = Math.sqrt(position.x * position.x + position.y * position.y + position.z * position.z);
      const visible = visibleCometsRef.current.has(comet.id);

      csv += `${comet.id},"${comet.name}",${comet.category},${comet.perihelion},${typeof comet.aphelion === "number" ? comet.aphelion : "Hyperbolic"},${comet.eccentricity},${comet.inclination},${typeof comet.period === "number" ? comet.period : "Hyperbolic"},${comet.magnitude || ""},${comet.diameter || ""},${comet.albedo || ""},${comet.rotationPeriod || ""},${typeof comet.semiMajorAxis === "number" ? comet.semiMajorAxis : "Hyperbolic"},${comet.argumentOfPerihelion || ""},${comet.longitudeOfAscendingNode || ""},${comet.meanAnomaly || ""},${comet.color},${comet.active},"${comet.source || ""}",${position.x.toFixed(2)},${position.y.toFixed(2)},${position.z.toFixed(2)},${distance.toFixed(2)},${visible}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "comet_data_optimized.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [comets]);

  const exportFITS = useCallback(() => {
    const fitsHeader = `SIMPLE  =                    T / file does conform to FITS standard
BITPIX  =                   16 / number of bits per data pixel
NAXIS   =                    2 / number of data axes
NAXIS1  =                  100 / length of data axis 1
NAXIS2  =                  ${comets.length} / length of data axis 2
EXTEND  =                    T / FITS dataset may contain extensions
COMMENT   Optimized Comet Data from APIs
COMMENT   Generated by High-Performance Comet Tracker
ORIGIN  = "Optimized Comet Tracker v2.0"
DATE    = "${new Date().toISOString()}"
END`;

    let fitsData = fitsHeader.padEnd(2880, " ");
    
    comets.forEach(comet => {
      const row = [
        typeof comet.perihelion === "number" ? comet.perihelion : 0,
        comet.eccentricity || 0,
        comet.inclination || 0,
        typeof comet.period === "number" ? comet.period : 0,
        comet.magnitude || 0,
        comet.diameter || 0,
        comet.albedo || 0,
        typeof comet.semiMajorAxis === "number" ? comet.semiMajorAxis : 0
      ].map(val => val.toString().padEnd(12)).join("").padEnd(100);
      fitsData += row;
    });

    const blob = new Blob([fitsData], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "comet_data_optimized.fits";
    a.click();
    URL.revokeObjectURL(url);
  }, [comets]);

  const fetchCometData = useCallback(async () => {
    setLoading(true);
    setErrors([]);
    const { comets, errors, metadata } = await fetchRealCometData();
    setComets(comets);
    setErrors(errors);
    setLoadingMetadata(metadata);
    setLoading(false);
  }, []);

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

  const togglePlay = useCallback(() => setIsPlaying(!isPlaying), [isPlaying]);

  const toggleOrbits = useCallback(() => setShowOrbits(!showOrbits), [showOrbits]);

  const toggleTrails = useCallback(() => setShowTrails(!showTrails), [showTrails]);

  const toggleLabels = useCallback(() => setShowLabels(!showLabels), [showLabels]);

  const toggleFoci = useCallback(() => setShowFoci(!showFoci), [showFoci]);

  const toggleGrid = useCallback(() => setShowGrid(!showGrid), [showGrid]);

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

  const zoomToComet = useCallback((id) => {
    const data = cometDataRef.current.get(id);
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
    document.body.className = `comet-theme-${theme}`;
    return () => {
      document.body.className = "";
    };
  }, [theme]);

  useEffect(() => {
    const filtered = comets.filter(comet =>
      comet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comet.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredComets(filtered);
  }, [comets, searchTerm]);

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000011, 0.00002);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 8000);
    camera.position.set(150, 80, 150);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance"
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000008, 1);
    renderer.shadowMap.enabled = false;
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

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

    const ambientLight = new THREE.AmbientLight(0x404060, 0.4);
    scene.add(ambientLight);

    const polarGrid = new THREE.PolarGridHelper(200, 16, 8, 64, 0x444444, 0x111111);
    polarGrid.visible = showGrid;
    scene.add(polarGrid);
    gridRef.current = polarGrid;

    const cometGroup = new THREE.Group();
    scene.add(cometGroup);
    cometGroupRef.current = cometGroup;

    const cometGeometry = new THREE.SphereGeometry(0.5, 8, 8);
    const cometMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.95
    });
    const cometInstance = new THREE.InstancedMesh(
      cometGeometry, 
      cometMaterial, 
      PERFORMANCE_CONSTANTS.MAX_VISIBLE_COMETS
    );
    cometInstance.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    cometInstance.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(PERFORMANCE_CONSTANTS.MAX_VISIBLE_COMETS * 3), 3
    );
    cometGroup.add(cometInstance);
    cometInstanceRef.current = cometInstance;

    const glowGeometry = new THREE.SphereGeometry(1.5, 8, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide
    });
    const glowInstance = new THREE.InstancedMesh(
      glowGeometry, 
      glowMaterial, 
      PERFORMANCE_CONSTANTS.MAX_VISIBLE_COMETS
    );
    glowInstance.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    cometGroup.add(glowInstance);
    glowInstanceRef.current = glowInstance;

    const starsGeometry = new THREE.BufferGeometry();
    const starCount = 15000;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      const radius = 1500 + Math.random() * 3000;
      const theta = Math.random() * ORBITAL_CONSTANTS.TWO_PI;
      const phi = Math.random() * Math.PI;

      starPositions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPositions[i3 + 2] = radius * Math.cos(phi);

      const starType = Math.random();
      let baseColor, intensity, size;

      if (starType < 0.7) {
        baseColor = { r: 0.8, g: 0.9, b: 1.0 };
        intensity = 0.7 + Math.random() * 0.3;
        size = 1.0 + Math.random() * 0.5;
      } else if (starType < 0.85) {
        baseColor = { r: 1.0, g: 0.6, b: 0.2 };
        intensity = 0.8 + Math.random() * 0.2;
        size = 2.0 + Math.random() * 1.0;
      } else {
        baseColor = { r: 0.9, g: 0.9, b: 1.0 };
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
      
          float twinkle = sin(time * 1.5 + position.x * 0.01 + position.y * 0.01) * 0.2 + 0.8;
      
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
      
          gl_FragColor = vec4(vColor, alpha);
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
    };

    window.addEventListener("resize", handleResize);
    renderer.render(scene, camera);
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

      Object.values(fociRef.current).forEach(focus => {
        if (focus) {
          focus.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
          });
        }
      });

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
      fetchCometData();
    }
  }, [sceneInitialized, fetchCometData]);

  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.visible = showGrid;
    }
  }, [showGrid]);

  useEffect(() => {
    Object.keys(labelsRef.current).forEach(cometId => {
      const label = labelsRef.current[cometId];
      if (label && label.element) {
        if (!comets.find(c => c.id === cometId && c.active)) {
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

        const startDate = new Date(2000, 0, 1);
        const displayTime = new Date(startDate.getTime() + simulationTime.current * ORBITAL_CONSTANTS.DAYS_PER_YEAR * 86400000);
        setCurrentTime(displayTime.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric"
        }));

        if (isPlaying && comets.length > 0) {
          if (frameCountRef.current % PERFORMANCE_CONSTANTS.UPDATE_FREQUENCY === 0) {
            updateInstancedMeshes();
            performFrustumCulling();
            updateSpatialGrid();
            updateOrbitsAndTrails();
          }

          if (frameCountRef.current % PERFORMANCE_CONSTANTS.UPDATE_FREQUENCY === 0) {
            updateLabels();
          }
        }

        controlsRef.current.update();
        TWEEN.update(time);
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate(performance.now());

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [
    comets, showTrails, showOrbits, showLabels, showFoci,
    isPlaying, speedMultiplier, targetFps, updateLabels, performFrustumCulling, 
    updateInstancedMeshes, updateSpatialGrid, updateOrbitsAndTrails
  ]);

  useEffect(() => {
    if (!detailedComet || !detailedPanelRef.current) return;

    const container = detailedPanelRef.current.querySelector(".comet-model-viewer");
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

    const cometGroup = new THREE.Group();

    const nucleusGeometry = new THREE.SphereGeometry(1, 16, 16);
    const nucleusMaterial = new THREE.MeshPhongMaterial({
      color: detailedComet.color,
      shininess: 10,
      roughness: 0.8
    });
    const nucleus = new THREE.Mesh(nucleusGeometry, nucleusMaterial);
    cometGroup.add(nucleus);

    const comaGeometry = new THREE.SphereGeometry(3, 16, 16);
    const comaMaterial = new THREE.MeshBasicMaterial({
      color: detailedComet.color,
      transparent: true,
      opacity: 0.2
    });
    const coma = new THREE.Mesh(comaGeometry, comaMaterial);
    cometGroup.add(coma);

    const glowGeometry = new THREE.SphereGeometry(6, 12, 12);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: detailedComet.color,
      transparent: true,
      opacity: 0.1,
      side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    cometGroup.add(glow);
    scene.add(cometGroup);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = true;
    controls.enablePan = false;

    let animationId;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      cometGroup.rotation.y += 0.01;
      glow.rotation.x += 0.005;
      coma.rotation.z += 0.003;
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
  }, [detailedComet]);

  const activeComets = comets.filter(c => c.active).length;
  const ellipticalCount = comets.filter(c => c.eccentricity < 1.0).length;
  const hyperbolicCount = comets.filter(c => c.eccentricity >= 1.0).length;

  const categoryCounts = comets.reduce((acc, comet) => {
    if (comet.active) {
      acc[comet.category] = (acc[comet.category] || 0) + 1;
    }
    return acc;
  }, {});

  const { visibleItems, startIndex } = getVirtualScrollItems;

  return (
    <div className="dinoSatPageWrapper">
      <DinoLabsNav activePage={"sat"}/>

      <div className={`dinoSatCometTrackerContainer comet-theme-${theme}`}>
        <div className={`dinoSatCometSideBar ${sidebarCollapsed ? "dinoSatCometSideBarCollapsed" : ""}`}>
          {loading && (
            <div className="dinoSatCometSideBarLoadingContainer">
              <label>Loading Comet Data...</label>
              <div className="dinoSatCometSideBarLoadingBar">
                <div className="dinoSatCometSideBarLoadingBarAccent" />
              </div>
              <small>Fetching From NASA SBDB APIs...</small>
            </div>
          )}

          <div className="dinoSatCometSideBarHeader">
            <h1>
              {!sidebarCollapsed && <small>Comet Tracker</small>}
            </h1>

            {!sidebarCollapsed && (
              <>
                <div className="dinoSatCometSideBarThemeSelector">
                  <button
                    className={`dinoSatCometSelectButton ${theme === "dark" ? "dinoSatCometButtonActive" : ""}`}
                    onClick={() => setTheme("dark")}
                  >
                    Dark
                  </button>
                  <button
                    className={`dinoSatCometSelectButton ${theme === "neon" ? "dinoSatCometButtonActive" : ""}`}
                    onClick={() => setTheme("neon")}
                  >
                    Neon
                  </button>
                </div>

                <div className="dinoSatCometSideBarThemeSelector">
                  <div className="dinoSatCometSideBarThemeSelectorStatusIndicator">
                    Ready
                    {loadingMetadata && (
                      <div style={{ fontSize: "9px", marginTop: "2px" }}>
                        Quality: {loadingMetadata.dataQuality} | Load: {loadingMetadata.loadTime?.toFixed(0)}ms
                      </div>
                    )}
                  </div>
                </div>

                <div className="dinoSatCometSideBarThemeSelector">
                  {errors.length > 0 && (
                    <div 
                      className="dinoSatCometSideBarThemeSelectorErrorIndicator" 
                      onClick={() => setShowErrors(!showErrors)} 
                      style={{ 
                        opacity: showErrors ? 1.0 : "", 
                        "paddingTop": showErrors ? "" : 0,  
                        "paddingBottom": showErrors ? "" : 0 
                      }}
                    >
                      <div className="dinoSatCometSideBarThemeSelectorErrorIndicatorHeader">
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
                        <div className="dinoSatCometSideBarThemeSelectorErrorIndicatorList">
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
              <div className="dinoSatCometSearchControls">
                <input
                  type="text"
                  placeholder="Search comets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="dinoSatCometSearchInput"
                />
                <div className="dinoSatCometSelectControls">
                  <button className="dinoSatCometSelectButton" onClick={selectAllComets}>
                    Select All
                  </button>
                  <button className="dinoSatCometSelectButton" onClick={deselectAllComets}>
                    Deselect All
                  </button>
                  <button className="dinoSatCometSelectButton" onClick={fetchCometData}>
                    Refresh Data
                  </button>
                </div>
              </div>

              <div className="dinoSatCometObjectsHeader">
                <span className="dinoSatCometObjectsHeaderIcon">
                  <FontAwesomeIcon icon={faMeteor} />
                </span>
                <span>Comets ({comets.filter(c => c.active).length}/{comets.length})</span>
              </div>

              <div 
                ref={virtualScrollRef}
                className="dinoSatCometList comet-list"
                style={{
                  height: "400px",
                  overflowY: "auto",
                  position: "relative"
                }}
                onScroll={handleVirtualScroll}
              >
                <div 
                  style={{ 
                    height: filteredComets.length * PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT,
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
                    {visibleItems.map((comet, index) => (
                      <div
                        key={comet.id}
                        className={`dinoSatCometListItem comet-item ${comet.active ? "dinoSatCometButtonActive" : ""} ${selectedComet === comet.id ? "comet-selected" : ""}`}
                        style={{ 
                          height: PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT,
                          minHeight: PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT 
                        }}
                        onClick={() => {
                          if (!comet.active) {
                            toggleComet(comet.id);
                          }
                          setSelectedComet(comet.id);
                          zoomToComet(comet.id);
                        }}
                      >
                        <div
                          className="dinoSatCometIndicator"
                          style={{ backgroundColor: comet.color }}
                        />
                        <div className="dinoSatCometName comet-name">
                          {comet.name}
                        </div>
                        <label className="consoleSwitch">
                          <input 
                            type="checkbox" 
                            checked={comet.active} 
                            onChange={() => { toggleComet(comet.id); }} 
                          />
                          <span className="consoleSlider round"></span>
                        </label>
                        <button
                          className="dinoSatCometInfoButton"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailedComet(comet);
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

        <div className="dinoSatCometMainView">
          <div className="dinonSatCometViewHeader">
            <div className="dinoSatCometPlaybackControls">
              <button className="dinoSatCometPlaybackControlsButton" onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"}>
                <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
              </button>

              {SPEED_OPTIONS.map(option => (
                <button
                  key={option.label}
                  className={`dinoSatCometPlaybackControlsSpeedButton ${speedMultiplier === option.value ? "dinoSatCometButtonActive" : ""}`}
                  onClick={() => changeSpeed(option.value)}
                  aria-label={option.label}
                >
                  {option.label}
                </button>
              ))}

              <select 
                className="dinoSatCometFPSSelect" 
                value={targetFps} 
                onChange={(e) => setTargetFps(Number(e.target.value))} 
                aria-label="Target FPS"
              >
                {FPS_OPTIONS.map(fps => (
                  <option key={fps} value={fps}>{fps} FPS</option>
                ))}
              </select>

              <div className="dinoSatCometPlaybackControlsButton" onClick={toggleHUD} aria-label="Toggle HUD">
                <FontAwesomeIcon icon={faChartLine} /> HUD
              </div>

              <button className="dinoSatCometPlaybackControlsButton" onClick={exportJSON} aria-label="Export JSON">
                Export JSON
              </button>

              <button className="dinoSatCometPlaybackControlsButton" onClick={exportCSV} aria-label="Export CSV">
                Export CSV
              </button>

              <button className="dinoSatCometPlaybackControlsButton" onClick={exportFITS} aria-label="Export FITS">
                Export FITS
              </button>
            </div>
          </div>

          <div ref={mountRef} className="dinoSatCometCanvasContainer" />

          <div
            ref={legendPanelRef}
            className={`dinoSatCometLegendPanel ${legendCollapsed ? "comet-collapsed" : ""}`}
            style={{
              transform: `translate(${legendPosition.x}px, ${legendPosition.y}px)`,
              cursor: isDraggingLegend ? "grabbing" : "grab"
            }}
            onMouseDown={handleLegendMouseDown}
            tabIndex={0}
          >
            <div className="dinoSatCometPanelHeader" onClick={handleLegendToggle}>
              <small>Legend</small>
              <span className="dinosatCometHeaderIcon">
                <FontAwesomeIcon icon={legendCollapsed ? faChevronDown : faChevronUp} />
              </span>
            </div>
            {!legendCollapsed && (
              <div className="dinoSatCometPanelContent">
                {Object.entries(CATEGORY_COLORS).map(([category, color]) => (
                  <div key={category} className="dinoSatCometLegendItem">
                    <div className="dinoSatCometLegendColor" style={{ backgroundColor: color }} />
                    <span>{category}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            ref={controlsPanelRef}
            className={`dinoSatCometControlsPanel ${controlsCollapsed ? "comet-collapsed" : ""}`}
            style={{
              transform: `translate(${controlsPosition.x}px, ${controlsPosition.y}px)`,
              cursor: isDraggingControls ? "grabbing" : "grab"
            }}
            onMouseDown={handleControlsMouseDown}
            tabIndex={0}
          >
            <div className="dinoSatCometPanelHeader" onClick={handleControlsToggle}>
              <span>3D Controls</span>
              <span className="dinosatCometHeaderIcon">
                <FontAwesomeIcon icon={controlsCollapsed ? faChevronDown : faChevronUp} />
              </span>
            </div>
            {!controlsCollapsed && (
              <div className="dinoSatCometPanelContent">
                <button className="dinoSatCometControlButton" onClick={resetCamera} aria-label="Reset camera">
                  Reset Camera
                </button>
                <button className="dinoSatCometControlButton" onClick={toggleOrbits} aria-label={showOrbits ? "Hide orbits" : "Show orbits"}>
                  {showOrbits ? "Hide" : "Show"} Orbits
                </button>
                <button className="dinoSatCometControlButton" onClick={toggleTrails} aria-label={showTrails ? "Hide trails" : "Show trails"}>
                  {showTrails ? "Hide" : "Show"} Trails
                </button>
                <button className="dinoSatCometControlButton" onClick={toggleLabels} aria-label={showLabels ? "Hide labels" : "Show labels"}>
                  {showLabels ? "Hide" : "Show"} Labels
                </button>
                <button className="dinoSatCometControlButton" onClick={toggleFoci} aria-label={showFoci ? "Hide foci" : "Show foci"}>
                  {showFoci ? "Hide" : "Show"} Foci
                </button>
              </div>
            )}
          </div>

          {hudVisible && (
            <div
              ref={hudPanelRef}
              className="dinoSatCometHUDPanel"
              style={{
                transform: `translate(calc(-50% + ${hudPosition.x}px), calc(-50% + ${hudPosition.y}px))`,
                cursor: isDraggingHud ? "grabbing" : "grab"
              }}
              onMouseDown={handleHudMouseDown}
              tabIndex={0}
            >
              <div className="dinoSatCometHUDPanelHeader">
                <span>Performance HUD - Drag To Move</span>
                <button className="dinoSatCometCloseButton" onClick={toggleHUD} aria-label="Close HUD">
                  <FontAwesomeIcon icon={faXmarkSquare} />
                </button>
              </div>
              <div className="dinoSatCometHUDContent">
                <div className="dinosatCometHUDSection">
                  <h4 style={{ "marginTop": 0 }}>Performance Metrics</h4>
                  <div className="dinosatCometHUDSectionGrid">
                    <div className="dinosatCometHUDSectionItem">
                      <span>Render Time:</span>
                      <span>{performanceStats.renderTime}ms</span>
                    </div>
                    <div className="dinosatCometHUDSectionItem">
                      <span>Target FPS:</span>
                      <span>{targetFps}</span>
                    </div>
                    <div className="dinosatCometHUDSectionItem">
                      <span>Actual FPS:</span>
                      <span>{actualFps}</span>
                    </div>
                    <div className="dinosatCometHUDSectionItem">
                      <span>Draw Calls:</span>
                      <span>{performanceStats.drawCalls}</span>
                    </div>
                    <div className="dinosatCometHUDSectionItem">
                      <span>Triangles:</span>
                      <span>{performanceStats.triangles.toLocaleString()}</span>
                    </div>
                    <div className="dinosatCometHUDSectionItem">
                      <span>Memory Usage:</span>
                      <span>{performanceStats.memoryUsage} objects</span>
                    </div>
                    <div className="dinosatCometHUDSectionItem">
                      <span>Visible Comets:</span>
                      <span style={{ color: "#00ff00" }}>{performanceStats.visibleComets}</span>
                    </div>
                    <div className="dinosatCometHUDSectionItem">
                      <span>Culled Comets:</span>
                      <span style={{ color: "#ffaa00" }}>{performanceStats.culledComets}</span>
                    </div>
                  </div>
                </div>

                <div className="dinosatCometHUDSection">
                  <h4>Optimization Status</h4>
                  <div className="dinosatCometHUDSectionGrid">
                    <div className="dinosatCometHUDSectionItem">
                      <span>Instanced Rendering:</span>
                      <span style={{ color: "#00ff00" }}>Active</span>
                    </div>
                    <div className="dinosatCometHUDSectionItem">
                      <span>Frustum Culling:</span>
                      <span style={{ color: "#00ff00" }}>Active</span>
                    </div>
                    <div className="dinosatCometHUDSectionItem">
                      <span>LOD System:</span>
                      <span style={{ color: "#00ff00" }}>Active</span>
                    </div>
                    <div className="dinosatCometHUDSectionItem">
                      <span>Virtual Scrolling:</span>
                      <span style={{ color: "#00ff00" }}>Active</span>
                    </div>
                    <div className="dinosatCometHUDSectionItem">
                      <span>Spatial Partitioning:</span>
                      <span style={{ color: "#00ff00" }}>Active</span>
                    </div>
                    <div className="dinosatCometHUDSectionItem">
                      <span>Label Pooling:</span>
                      <span style={{ color: "#00ff00" }}>Active</span>
                    </div>
                  </div>
                </div>

                <div className="dinosatCometHUDSection">
                  <h4>Orbital Propagation Status</h4>
                  <div className="dinosatCometHUDSectionGrid">
                    <div className="dinosatCometHUDSectionItem">
                      <span>Elliptical Comets:</span>
                      <span style={{ color: "#00ff00" }}>{ellipticalCount}</span>
                    </div>
                    <div className="dinosatCometHUDSectionItem">
                      <span>Hyperbolic Comets:</span>
                      <span style={{ color: "#ffaa00" }}>{hyperbolicCount}</span>
                    </div>
                    <div className="dinosatCometHUDSectionItem">
                      <span>Processing Errors:</span>
                      <span style={{ color: errors.length > 0 ? "#ff4400" : "#00ff00" }}>
                        {errors.length}
                      </span>
                    </div>
                    <div className="dinosatCometHUDSectionItem">
                      <span>Position Data:</span>
                      <span style={{ color: "#00ff00" }}>Orbital Elements</span>
                    </div>
                    <div className="dinosatCometHUDSectionItem">
                      <span>Max Rendering:</span>
                      <span style={{ color: "#00ff00" }}>{PERFORMANCE_CONSTANTS.MAX_VISIBLE_COMETS}</span>
                    </div>
                    <div className="dinosatCometHUDSectionItem">
                      <span>Data Source:</span>
                      <span style={{ color: "#00ff00" }}>NASA SBDB</span>
                    </div>
                  </div>
                </div>

                <div className="dinosatCometHUDSection">
                  <h4>Data Status</h4>
                  <div className="dinosatCometHUDSectionGrid">
                    <div className="dinosatCometHUDSectionItem">
                      <span>Active Comets:</span>
                      <span>{activeComets}</span>
                    </div>
                    <div className="dinosatCometHUDSectionItem">
                      <span>Total Objects:</span>
                      <span>{comets.length}</span>
                    </div>
                    <div className="dinosatCometHUDSectionItem">
                      <span>Preselected Count:</span>
                      <span>{PERFORMANCE_CONSTANTS.PRESELECT_COUNT}</span>
                    </div>
                    <div className="dinosatCometHUDSectionItem">
                      <span>Data Sources:</span>
                      <span>NASA SBDB</span>
                    </div>
                    <div className="dinosatCometHUDSectionItem">
                      <span>API Errors:</span>
                      <span style={{ color: errors.length > 0 ? "#ff4400" : "#00ff00" }}>
                        {errors.length}
                      </span>
                    </div>
                    <div className="dinosatCometHUDSectionItem">
                      <span>Speed Multiplier:</span>
                      <span>{speedMultiplier}x</span>
                    </div>
                    <div className="dinosatCometHUDSectionItem">
                      <span>Simulation Time:</span>
                      <span>{currentTime}</span>
                    </div>
                    <div className="dinosatCometHUDSectionItem">
                      <span>Architecture:</span>
                      <span style={{ color: "#00ff00" }}>Optimized</span>
                    </div>
                  </div>
                </div>

                <div className="dinosatCometHUDSection">
                  <h4>Fleet Statistics</h4>
                  <div className="dinosatCometHUDSectionGrid">
                    <div className="dinosatCometHUDSectionItem">
                      <span>Active Short-Period:</span>
                      <span>{categoryCounts["Short-period"] || 0}</span>
                    </div>
                    <div className="dinosatCometHUDSectionItem">
                      <span>Active Intermediate-Period:</span>
                      <span>{categoryCounts["Intermediate-period"] || 0}</span>
                    </div>
                    <div className="dinosatCometHUDSectionItem">
                      <span>Active Long-Period:</span>
                      <span>{categoryCounts["Long-period"] || 0}</span>
                    </div>
                    <div className="dinosatCometHUDSectionItem">
                      <span>Active Hyperbolic:</span>
                      <span>{categoryCounts["Hyperbolic"] || 0}</span>
                    </div>
                    <div className="dinosatCometHUDSectionItem">
                      <span>Active Sungrazers:</span>
                      <span>{categoryCounts["Sungrazer"] || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {detailedComet && (
            <div
              ref={detailedPanelRef}
              className="dinoSatCometDetailedPanel"
              style={{
                transform: `translate(calc(-50% + ${detailedPosition.x}px), calc(-50% + ${detailedPosition.y}px))`,
                cursor: isDraggingDetailed ? "grabbing" : "grab"
              }}
              onMouseDown={handleDetailedMouseDown}
              tabIndex={0}
            >
              <div className="dinoSatCometHUDPanelHeader">
                <span>{detailedComet.name}</span>
                <button className="dinoSatCometCloseButton" onClick={() => setDetailedComet(null)} aria-label="Close details">
                  <FontAwesomeIcon icon={faXmarkSquare} />
                </button>
              </div>
              <div className="dinoSatCometHUDContent">
                <div className="comet-model-viewer"></div>

                <div className="dinosatCometHUDSection">
                  <h4>Basic Information</h4>
                  <div className="dinosatCometHUDSectionGrid">
                    <div className="dinosatCometHUDSectionItem">
                      <span>Name:</span>
                      <span>{detailedComet.name}</span>
                    </div>
                    <div className="dinosatCometHUDSectionItem">
                      <span>Category:</span>
                      <span>{detailedComet.category}</span>
                    </div>
                    <div className="dinosatCometHUDSectionItem">
                      <span>Data Source:</span>
                      <span>{detailedComet.source}</span>
                    </div>
                  </div>
                </div>

                <div className="dinosatCometHUDSection">
                  <h4>Orbital Parameters</h4>
                  <div className="dinosatCometHUDSectionGrid">
                    <div className="dinosatCometHUDSectionItem">
                      <span>Perihelion Distance:</span>
                      <span>{detailedComet.perihelion} AU</span>
                    </div>
                    <div className="dinosatCometHUDSectionItem">
                      <span>Aphelion Distance:</span>
                      <span>{typeof detailedComet.aphelion === "number" ? `${detailedComet.aphelion} AU` : detailedComet.aphelion}</span>
                    </div>
                    <div className="dinosatCometHUDSectionItem">
                      <span>Semi-Major Axis:</span>
                      <span>{typeof detailedComet.semiMajorAxis === "number" ? `${detailedComet.semiMajorAxis} AU` : detailedComet.semiMajorAxis}</span>
                    </div>
                    <div className="dinosatCometHUDSectionItem">
                      <span>Eccentricity:</span>
                      <span>{detailedComet.eccentricity}</span>
                    </div>
                    <div className="dinosatCometHUDSectionItem">
                      <span>Inclination:</span>
                      <span>{detailedComet.inclination}°</span>
                    </div>
                    <div className="dinosatCometHUDSectionItem">
                      <span>Orbital Period:</span>
                      <span>{typeof detailedComet.period === "number" ? `${detailedComet.period} years` : detailedComet.period}</span>
                    </div>
                    <div className="dinosatCometHUDSectionItem">
                      <span>Arg of Perihelion:</span>
                      <span>{detailedComet.argumentOfPerihelion}°</span>
                    </div>
                    <div className="dinosatCometHUDSectionItem">
                      <span>Long of Asc Node:</span>
                      <span>{detailedComet.longitudeOfAscendingNode}°</span>
                    </div>
                    <div className="dinosatCometHUDSectionItem">
                      <span>Mean Anomaly:</span>
                      <span>{detailedComet.meanAnomaly}°</span>
                    </div>
                  </div>
                </div>

                <div className="dinosatCometHUDSection">
                  <h4>Physical Properties</h4>
                  <div className="dinosatCometHUDSectionGrid">
                    <div className="dinosatCometHUDSectionItem">
                      <span>Absolute Magnitude:</span>
                      <span>{detailedComet.magnitude}</span>
                    </div>
                    {detailedComet.diameter && (
                      <div className="dinosatCometHUDSectionItem">
                        <span>Diameter:</span>
                        <span>{detailedComet.diameter} km</span>
                      </div>
                    )}
                    <div className="dinosatCometHUDSectionItem">
                      <span>Albedo:</span>
                      <span>{detailedComet.albedo}</span>
                    </div>
                    {detailedComet.rotationPeriod && (
                      <div className="dinosatCometHUDSectionItem">
                        <span>Rotation Period:</span>
                        <span>{detailedComet.rotationPeriod.toFixed(1)} hours</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="dinosatCometHUDSection">
                  <h4>Performance Data</h4>
                  <div className="dinosatCometHUDSectionGrid">
                    <div className="dinosatCometHUDSectionItem">
                      <span>Rendering Method:</span>
                      <span style={{ color: "#00ff00" }}>Instanced</span>
                    </div>
                    <div className="dinosatCometHUDSectionItem">
                      <span>Position Source:</span>
                      <span style={{ color: "#00ff00" }}>Orbital Elements</span>
                    </div>
                    <div className="dinosatCometHUDSectionItem">
                      <span>Visibility:</span>
                      <span style={{ color: visibleCometsRef.current.has(detailedComet.id) ? "#00ff00" : "#ff4400" }}>
                        {visibleCometsRef.current.has(detailedComet.id) ? "Visible" : "Culled"}
                      </span>
                    </div>
                    <div className="dinosatCometHUDSectionItem">
                      <span>Coordinate Frame:</span>
                      <span>Heliocentric Ecliptic</span>
                    </div>
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