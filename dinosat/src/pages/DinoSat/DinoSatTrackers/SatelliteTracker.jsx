import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as THREE from "three";
import * as TWEEN from "three/examples/jsm/libs/tween.module.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faInfoCircle, faTh, faTimes, faPlay, faPause, faRedo, faBorderAll, 
  faPlus, faSquarePlus, faBars, faSquareXmark, faSatellite, faChartLine, 
  faChevronDown, faChevronUp, faXmarkSquare, faSquareCheck, faClone 
} from "@fortawesome/free-solid-svg-icons";
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
    "Scientific": "#EF5350"
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
    MAX_VISIBLE_SATELLITES: 3000,
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
    RAD_TO_DEG: 180.0 / Math.PI
  };

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
  const labelRendererRef = useRef(null);
  const cameraRef = useRef(null);
  const earthRef = useRef(null);
  const satelliteGroupRef = useRef(null);
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
    const earthRadius = 6.371;
    const orbitRadius = earthRadius + (satellite.altitude / 100);
    const angularVelocity = (2 * Math.PI) / satellite.period;
    const phase = (satellite.id.charCodeAt(0) % 100) * 0.1;
    const angle = (simulationTime.current * angularVelocity) + phase;

    const x = orbitRadius * Math.cos(angle);
    const y = 0;
    const z = orbitRadius * Math.sin(angle);
    const position = new THREE.Vector3(x, y, z);
    
    const inclinationRad = (satellite.inclination * Math.PI) / 180;
    position.applyAxisAngle(new THREE.Vector3(1, 0, 0), inclinationRad);
    
    const raanRad = (satellite.raan * Math.PI) / 180;
    position.applyAxisAngle(new THREE.Vector3(0, 1, 0), raanRad);
    
    return position;
  };

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
    const orbitPoints = [];
    const segments = 64;
    const earthRadius = 6.371;
    const orbitRadius = earthRadius + (satellite.altitude / 100);
    const inclinationRad = (satellite.inclination * Math.PI) / 180;
    const raanRad = (satellite.raan * Math.PI) / 180;

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * (2 * Math.PI);
      const x = orbitRadius * Math.cos(angle);
      const y = 0;
      const z = orbitRadius * Math.sin(angle);
      const orbitPoint = new THREE.Vector3(x, y, z);
      
      orbitPoint.applyAxisAngle(new THREE.Vector3(1, 0, 0), inclinationRad);
      orbitPoint.applyAxisAngle(new THREE.Vector3(0, 1, 0), raanRad);
      
      orbitPoints.push(orbitPoint);
    }

    const orbitGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
    const orbitMaterial = new THREE.LineBasicMaterial({
      color: satellite.color,
      transparent: true,
      opacity: 0.6,
      linewidth: 1
    });
    const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
    orbitLine.visible = showOrbits;
    return orbitLine;
  }, [showOrbits]);

  const createTrailLine = useCallback((satellite) => {
    const trailPositions = new Float32Array(PERFORMANCE_CONSTANTS.TRAIL_LENGTH * 3);
    const trailColors = new Float32Array(PERFORMANCE_CONSTANTS.TRAIL_LENGTH * 3);
    const trailGeometry = new THREE.BufferGeometry();
    trailGeometry.setAttribute("position", new THREE.BufferAttribute(trailPositions, 3));
    trailGeometry.setAttribute("color", new THREE.BufferAttribute(trailColors, 3));

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
      
      satelliteDataRef.current.set(satellite.id, {
        position: position.clone(),
        lastUpdate: Date.now(),
        instanceIndex
      });

      if (visibleSatellitesRef.current.has(satellite.id)) {
        tempMatrix.current.makeTranslation(position.x, position.y, position.z);
        satelliteInstanceRef.current.setMatrixAt(instanceIndex, tempMatrix.current);
        glowInstanceRef.current.setMatrixAt(instanceIndex, tempMatrix.current);

        tempColor.current.setHex(satellite.color.replace("#", "0x"));
        satelliteInstanceRef.current.setColorAt(instanceIndex, tempColor.current);

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
        satelliteGroupRef.current.add(orbitLine);
        orbitLinesRef.current[satellite.id] = orbitLine;
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
          const positions = trail.geometry.attributes.position.array;
          const colors = trail.geometry.attributes.color.array;
          const color = new THREE.Color(satellite.color);

          const earthRadius = 6.371;
          const orbitRadius = earthRadius + (satellite.altitude / 100);
          const angularVelocity = (2 * Math.PI) / satellite.period;
          const phase = (satellite.id.charCodeAt(0) % 100) * 0.1;
          const inclinationRad = (satellite.inclination * Math.PI) / 180;
          const raanRad = (satellite.raan * Math.PI) / 180;

          for (let i = 0; i < PERFORMANCE_CONSTANTS.TRAIL_LENGTH; i++) {
            const trailAngle = (simulationTime.current * angularVelocity) + phase - (i * 0.05);
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

          trail.geometry.attributes.position.needsUpdate = true;
          trail.geometry.attributes.color.needsUpdate = true;
          trail.geometry.setDrawRange(0, PERFORMANCE_CONSTANTS.TRAIL_LENGTH);
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
        e.target.closest(".satellite-trail-slider")) return;
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
      cameraRef.current.position.set(100, 50, 100);
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
    scene.fog = new THREE.FogExp2(0x000011, 0.00002);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 8000);
    camera.position.set(100, 50, 100);
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

    const cloudGeometry = new THREE.SphereGeometry(6.38, 16, 16);
    const cloudMaterial = new THREE.MeshPhongMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.3
    });
    const clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
    earthGroup.add(clouds);

    const atmosphereGeometry = new THREE.SphereGeometry(6.8, 16, 16);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x87CEEB,
      transparent: true,
      opacity: 0.25,
      side: THREE.BackSide
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    earthGroup.add(atmosphere);

    const sunLight = new THREE.DirectionalLight(0xFFFFFF, 1.5);
    sunLight.position.set(100, 50, 100);
    earthGroup.add(sunLight);

    scene.add(earthGroup);
    earthRef.current = earthGroup;

    const polarGrid = new THREE.PolarGridHelper(150, 16, 8, 64, 0x444444, 0x111111);
    polarGrid.visible = showGrid;
    scene.add(polarGrid);
    gridRef.current = polarGrid;

    const satelliteGroup = new THREE.Group();
    scene.add(satelliteGroup);
    satelliteGroupRef.current = satelliteGroup;

    const satelliteGeometry = new THREE.SphereGeometry(0.8, 8, 8);
    const satelliteMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.95
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

    const glowGeometry = new THREE.SphereGeometry(2.4, 8, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.15,
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
    satellites, earthRotation, earthRotationData, showTrails, showOrbits, showLabels, 
    isPlaying, speedMultiplier, targetFps, updateLabels, performFrustumCulling, 
    updateInstancedMeshes, updateSpatialGrid, updateOrbitsAndTrails
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
                <button className="dinoSatSatelliteControlButton" onClick={resetCamera} aria-label="Reset camera">
                  Reset Camera
                </button>
                <button className="dinoSatSatelliteControlButton" onClick={toggleOrbits} aria-label={showOrbits ? "Hide orbits" : "Show orbits"}>
                  {showOrbits ? "Hide" : "Show"} Orbits
                </button>
                <button className="dinoSatSatelliteControlButton" onClick={toggleTrails} aria-label={showTrails ? "Hide trails" : "Show trails"}>
                  {showTrails ? "Hide" : "Show"} Trails
                </button>
                <button className="dinoSatSatelliteControlButton" onClick={toggleLabels} aria-label={showLabels ? "Hide labels" : "Show labels"}>
                  {showLabels ? "Hide" : "Show"} Labels
                </button>
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
                <button className="dinoSatSatelliteCloseButton" onClick={toggleHUD} aria-label="Close HUD">
                  <FontAwesomeIcon icon={faXmarkSquare} />
                </button>
              </div>
              <div className="dinoSatSatelliteHUDContent">
                <div className="dinosatSatelliteHUDSection">
                  <h4 style={{ "marginTop": 0 }}>Performance Metrics</h4>
                  <div className="dinosatSatelliteHUDSectionGrid">
                    <div className="dinosatSatelliteHUDSectionItem">
                      <span>Render Time:</span>
                      <span>{performanceStats.renderTime}ms</span>
                    </div>
                    <div className="dinosatSatelliteHUDSectionItem">
                      <span>Target FPS:</span>
                      <span>{targetFps}</span>
                    </div>
                    <div className="dinosatSatelliteHUDSectionItem">
                      <span>Actual FPS:</span>
                      <span>{actualFps}</span>
                    </div>
                    <div className="dinosatSatelliteHUDSectionItem">
                      <span>Draw Calls:</span>
                      <span>{performanceStats.drawCalls}</span>
                    </div>
                    <div className="dinosatSatelliteHUDSectionItem">
                      <span>Triangles:</span>
                      <span>{performanceStats.triangles.toLocaleString()}</span>
                    </div>
                    <div className="dinosatSatelliteHUDSectionItem">
                      <span>Memory Usage:</span>
                      <span>{performanceStats.memoryUsage} objects</span>
                    </div>
                    <div className="dinosatSatelliteHUDSectionItem">
                      <span>Visible Satellites:</span>
                      <span style={{ color: "#00ff00" }}>{performanceStats.visibleSatellites}</span>
                    </div>
                    <div className="dinosatSatelliteHUDSectionItem">
                      <span>Culled Satellites:</span>
                      <span style={{ color: "#ffaa00" }}>{performanceStats.culledSatellites}</span>
                    </div>
                  </div>
                </div>

                <div className="dinosatSatelliteHUDSection">
                  <h4>Optimization Status</h4>
                  <div className="dinosatSatelliteHUDSectionGrid">
                    <div className="dinosatSatelliteHUDSectionItem">
                      <span>Instanced Rendering:</span>
                      <span style={{ color: "#00ff00" }}>Active</span>
                    </div>
                    <div className="dinosatSatelliteHUDSectionItem">
                      <span>Frustum Culling:</span>
                      <span style={{ color: "#00ff00" }}>Active</span>
                    </div>
                    <div className="dinosatSatelliteHUDSectionItem">
                      <span>LOD System:</span>
                      <span style={{ color: "#00ff00" }}>Active</span>
                    </div>
                    <div className="dinosatSatelliteHUDSectionItem">
                      <span>Virtual Scrolling:</span>
                      <span style={{ color: "#00ff00" }}>Active</span>
                    </div>
                    <div className="dinosatSatelliteHUDSectionItem">
                      <span>Spatial Partitioning:</span>
                      <span style={{ color: "#00ff00" }}>Active</span>
                    </div>
                    <div className="dinosatSatelliteHUDSectionItem">
                      <span>Label Pooling:</span>
                      <span style={{ color: "#00ff00" }}>Active</span>
                    </div>
                  </div>
                </div>

                <div className="dinosatSatelliteHUDSection">
                  <h4>Orbital Propagation Status</h4>
                  <div className="dinosatSatelliteHUDSectionGrid">
                    <div className="dinosatSatelliteHUDSectionItem">
                      <span>SGP4 Satellites:</span>
                      <span style={{ color: "#00ff00" }}>{sgp4Count}</span>
                    </div>
                    <div className="dinosatSatelliteHUDSectionItem">
                      <span>SDP4 Deep Space:</span>
                      <span style={{ color: "#ffaa00" }}>{sdp4Count}</span>
                    </div>
                    <div className="dinosatSatelliteHUDSectionItem">
                      <span>TLE Processing Errors:</span>
                      <span style={{ color: errors.length > 0 ? "#ff4400" : "#00ff00" }}>
                        {errors.length}
                      </span>
                    </div>
                    <div className="dinosatSatelliteHUDSectionItem">
                      <span>Earth Rotation:</span>
                      <span style={{ color: earthRotationData ? "#00ff00" : "#ff4400" }}>
                        {earthRotationData ? "IERS Data" : "Failed"}
                      </span>
                    </div>
                    <div className="dinosatSatelliteHUDSectionItem">
                      <span>Position Data:</span>
                      <span style={{ color: "#00ff00" }}>SGP4/SDP4</span>
                    </div>
                    <div className="dinosatSatelliteHUDSectionItem">
                      <span>Max Rendering:</span>
                      <span style={{ color: "#00ff00" }}>{PERFORMANCE_CONSTANTS.MAX_VISIBLE_SATELLITES}</span>
                    </div>
                  </div>
                </div>

                <div className="dinosatSatelliteHUDSection">
                  <h4>Data Status</h4>
                  <div className="dinosatSatelliteHUDSectionGrid">
                    <div className="dinosatSatelliteHUDSectionItem">
                      <span>Active Satellites:</span>
                      <span>{activeSatellites}</span>
                    </div>
                    <div className="dinosatSatelliteHUDSectionItem">
                      <span>Total Objects:</span>
                      <span>{satellites.length}</span>
                    </div>
                    <div className="dinosatSatelliteHUDSectionItem">
                      <span>Preselected Count:</span>
                      <span>{PERFORMANCE_CONSTANTS.PRESELECT_COUNT}</span>
                    </div>
                    <div className="dinosatSatelliteHUDSectionItem">
                      <span>Data Sources:</span>
                      <span>CelesTrak, IERS</span>
                    </div>
                    <div className="dinosatSatelliteHUDSectionItem">
                      <span>API Errors:</span>
                      <span style={{ color: errors.length > 0 ? "#ff4400" : "#00ff00" }}>
                        {errors.length}
                      </span>
                    </div>
                    <div className="dinosatSatelliteHUDSectionItem">
                      <span>Speed Multiplier:</span>
                      <span>{speedMultiplier}x</span>
                    </div>
                    <div className="dinosatSatelliteHUDSectionItem">
                      <span>Simulation Time:</span>
                      <span>{currentTime}</span>
                    </div>
                    <div className="dinosatSatelliteHUDSectionItem">
                      <span>Architecture:</span>
                      <span style={{ color: "#00ff00" }}>Optimized</span>
                    </div>
                  </div>
                </div>

                <div className="dinosatSatelliteHUDSection">
                  <h4>Fleet Statistics</h4>
                  <div className="dinosatSatelliteHUDSectionGrid">
                    <div className="dinosatSatelliteHUDSectionItem">
                      <span>Active LEO:</span>
                      <span>{categoryCounts["LEO"] || 0}</span>
                    </div>
                    <div className="dinosatSatelliteHUDSectionItem">
                      <span>Active MEO:</span>
                      <span>{categoryCounts["MEO"] || 0}</span>
                    </div>
                    <div className="dinosatSatelliteHUDSectionItem">
                      <span>Active GEO:</span>
                      <span>{categoryCounts["GEO"] || 0}</span>
                    </div>
                    <div className="dinosatSatelliteHUDSectionItem">
                      <span>Deep Space:</span>
                      <span>{categoryCounts["Deep Space"] || 0}</span>
                    </div>
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
                <button className="dinoSatSatelliteCloseButton" onClick={() => setDetailedSatellite(null)} aria-label="Close details">
                  <FontAwesomeIcon icon={faXmarkSquare} />
                </button>
              </div>
              <div className="dinoSatSatelliteHUDContent">
                <div className="dinoSatSatelliteModelViewer"></div>

                <div className="dinosatSatelliteHUDSection">
                  <h4>Basic Information</h4>
                  <div className="dinosatSatelliteHUDSectionGrid">
                    <div className="dinosatSatelliteHUDSectionItem">
                      <span>Name:</span>
                      <span>{detailedSatellite.name}</span>
                    </div>
                    <div className="dinosatSatelliteHUDSectionItem">
                      <span>NORAD ID:</span>
                      <span>{detailedSatellite.noradId}</span>
                    </div>
                    <div className="dinosatSatelliteHUDSectionItem">
                      <span>Category:</span>
                      <span>{detailedSatellite.category}</span>
                    </div>
                    <div className="dinosatSatelliteHUDSectionItem">
                      <span>Status:</span>
                      <span style={{ color: detailedSatellite.status === "Active" ? "#00ff00" : "#ff4400" }}>
                        {detailedSatellite.status}
                      </span>
                    </div>
                    <div className="dinosatSatelliteHUDSectionItem">
                      <span>Propagation Model:</span>
                      <span style={{ color: detailedSatellite.hasTLE ? "#00ff00" : "#ffaa00" }}>
                        {detailedSatellite.propagationModel || "No TLE"}
                      </span>
                    </div>
                    <div className="dinosatSatelliteHUDSectionItem">
                      <span>Data Source:</span>
                      <span>{detailedSatellite.source}</span>
                    </div>
                  </div>
                </div>

                <div className="dinosatSatelliteHUDSection">
                  <h4>Orbital Parameters</h4>
                  <div className="dinosatSatelliteHUDSectionGrid">
                    <div className="dinosatSatelliteHUDSectionItem">
                      <span>Altitude:</span>
                      <span>{detailedSatellite.altitude} km</span>
                    </div>
                    <div className="dinosatSatelliteHUDSectionItem">
                      <span>Apogee:</span>
                      <span>{detailedSatellite.apogee} km</span>
                    </div>
                    <div className="dinosatSatelliteHUDSectionItem">
                      <span>Perigee:</span>
                      <span>{detailedSatellite.perigee} km</span>
                    </div>
                    <div className="dinosatSatelliteHUDSectionItem">
                      <span>Inclination:</span>
                      <span>{detailedSatellite.inclination}°</span>
                    </div>
                    <div className="dinosatSatelliteHUDSectionItem">
                      <span>Orbital Period:</span>
                      <span>{detailedSatellite.period.toFixed(2)} minutes</span>
                    </div>
                    <div className="dinosatSatelliteHUDSectionItem">
                      <span>Eccentricity:</span>
                      <span>{detailedSatellite.eccentricity}</span>
                    </div>
                    <div className="dinosatSatelliteHUDSectionItem">
                      <span>RAAN:</span>
                      <span>{detailedSatellite.raan}°</span>
                    </div>
                    <div className="dinosatSatelliteHUDSectionItem">
                      <span>Arg of Perigee:</span>
                      <span>{detailedSatellite.argOfPerigee}°</span>
                    </div>
                    <div className="dinosatSatelliteHUDSectionItem">
                      <span>Mean Anomaly:</span>
                      <span>{detailedSatellite.meanAnomaly}°</span>
                    </div>
                    <div className="dinosatSatelliteHUDSectionItem">
                      <span>Semi-Major Axis:</span>
                      <span>{detailedSatellite.semiMajorAxis} km</span>
                    </div>
                    <div className="dinosatSatelliteHUDSectionItem">
                      <span>Velocity:</span>
                      <span>{detailedSatellite.velocity} km/s</span>
                    </div>
                    <div className="dinosatSatelliteHUDSectionItem">
                      <span>Mean Motion:</span>
                      <span>{detailedSatellite.meanMotion} rev/day</span>
                    </div>
                    <div className="dinosatSatelliteHUDSectionItem">
                      <span>Epoch Year:</span>
                      <span>{detailedSatellite.epochYear}</span>
                    </div>
                    <div className="dinosatSatelliteHUDSectionItem">
                      <span>Epoch Day:</span>
                      <span>{detailedSatellite.epochDay}</span>
                    </div>
                  </div>
                </div>

                {detailedSatellite.hasTLE && (
                  <div className="dinosatSatelliteHUDSection">
                    <h4>Performance Data</h4>
                    <div className="dinosatSatelliteHUDSectionGrid">
                      <div className="dinosatSatelliteHUDSectionItem">
                        <span>Rendering Method:</span>
                        <span style={{ color: "#00ff00" }}>Instanced</span>
                      </div>
                      <div className="dinosatSatelliteHUDSectionItem">
                        <span>Position Source:</span>
                        <span style={{ color: "#00ff00" }}>SGP4/SDP4</span>
                      </div>
                      <div className="dinosatSatelliteHUDSectionItem">
                        <span>Visibility:</span>
                        <span style={{ color: visibleSatellitesRef.current.has(detailedSatellite.id) ? "#00ff00" : "#ff4400" }}>
                          {visibleSatellitesRef.current.has(detailedSatellite.id) ? "Visible" : "Culled"}
                        </span>
                      </div>
                      <div className="dinosatSatelliteHUDSectionItem">
                        <span>Coordinate Frame:</span>
                        <span>ECI J2000.0</span>
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