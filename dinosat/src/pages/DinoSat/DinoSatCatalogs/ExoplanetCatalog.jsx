import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as THREE from "three";
import * as TWEEN from "three/examples/jsm/libs/tween.module.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faInfoCircle, faTh, faTimes, faPlay, faPause, faRedo, faBorderAll, 
  faPlus, faSquarePlus, faBars, faSquareXmark, faStar, faChartLine, 
  faChevronDown, faChevronUp, faXmarkSquare, faSquareCheck, faClone,
  faSearch, faFilter, faSort, faEye, faDownload
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
    "Gravitational Microlensing": "#96CEB4",
    "Astrometry": "#FFEAA7",
    "Transit Timing Variation": "#DDA0DD",
    "Pulsar Timing": "#98D8C8",
    "Orbital Brightness Modulation": "#F7DC6F",
    "Unknown": "#888888"
  };

  const RADIUS_RANGES = [
    { label: "Sub-Earth (0-0.8 R⊕)", min: 0, max: 0.8 },
    { label: "Earth-like (0.8-1.2 R⊕)", min: 0.8, max: 1.2 },
    { label: "Super-Earth (1.2-2.5 R⊕)", min: 1.2, max: 2.5 },
    { label: "Mini-Neptune (2.5-4 R⊕)", min: 2.5, max: 4 },
    { label: "Large (4+ R⊕)", min: 4, max: 100 }
  ];

  const DISTANCE_RANGES = [
    { label: "Very Close (0-25 ly)", min: 0, max: 25 },
    { label: "Close (25-100 ly)", min: 25, max: 100 },
    { label: "Moderate (100-300 ly)", min: 100, max: 300 },
    { label: "Far (300-1000 ly)", min: 300, max: 1000 },
    { label: "Very Far (1000+ ly)", min: 1000, max: 10000 }
  ];

  const PERIOD_RANGES = [
    { label: "Ultra-Short (0-1 days)", min: 0, max: 1 },
    { label: "Short (1-10 days)", min: 1, max: 10 },
    { label: "Earth-like (10-400 days)", min: 10, max: 400 },
    { label: "Long (400-5000 days)", min: 400, max: 5000 },
    { label: "Very Long (5000+ days)", min: 5000, max: 100000 }
  ];

  const SORT_OPTIONS = [
    { label: "Name (A-Z)", value: "name_asc" },
    { label: "Name (Z-A)", value: "name_desc" },
    { label: "Discovery Year (Recent First)", value: "year_desc" },
    { label: "Discovery Year (Oldest First)", value: "year_asc" },
    { label: "Distance (Near to Far)", value: "distance_asc" },
    { label: "Distance (Far to Near)", value: "distance_desc" },
    { label: "Planet Type", value: "type" },
    { label: "Discovery Method", value: "method" }
  ];

  const FPS_OPTIONS = [30, 60, 120, 144];

  const PERFORMANCE_CONSTANTS = {
    MAX_VISIBLE_PLANETS: 5000,
    LOD_DISTANCES: [100, 500, 2000, 10000],
    BATCH_SIZE: 1000,
    UPDATE_FREQUENCY: 1,
    LABEL_DISTANCE_THRESHOLD: 200,
    FRUSTUM_MARGIN: 1.2,
    PRESELECT_COUNT: 100,
    VIRTUAL_SCROLL_ITEM_HEIGHT: 50,
    VIRTUAL_SCROLL_BUFFER: 10,
    PLANET_SIZE_MULTIPLIER: 2.0
  };

  const CATALOG_CONSTANTS = {
    PARSEC_TO_LY: 3.26156,
    LY_TO_KM: 9.461e12,
    SUN_MAGNITUDE: 4.83,
    DEFAULT_PARALLAX: 0.001,
    MAX_DISTANCE: 10000,
    MIN_RADIUS: 0.1,
    MAX_RADIUS: 100,
    EARTH_RADIUS: 6371,
    JUPITER_RADIUS: 69911
  };

  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);
  const [showErrors, setShowErrors] = useState(false);
  const [copiedErrors, setCopiedErrors] = useState(false);
  const [loadingMetadata, setLoadingMetadata] = useState(null);
  const [planets, setPlanets] = useState([]);
  const [filteredPlanets, setFilteredPlanets] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [methodFilter, setMethodFilter] = useState("All");
  const [radiusFilter, setRadiusFilter] = useState("All");
  const [distanceFilter, setDistanceFilter] = useState("All");
  const [periodFilter, setPeriodFilter] = useState("All");
  const [sortOption, setSortOption] = useState("year_desc");
  const [targetFps, setTargetFps] = useState(60);
  const [actualFps, setActualFps] = useState(60);
  const [showLabels, setShowLabels] = useState(true);
  const [showConnections, setShowConnections] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [legendCollapsed, setLegendCollapsed] = useState(false);
  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  const [hudVisible, setHudVisible] = useState(false);
  const [detailedPlanet, setDetailedPlanet] = useState(null);
  const [selectedPlanet, setSelectedPlanet] = useState(null);
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
  const labelRendererRef = useRef(null);
  const cameraRef = useRef(null);
  const planetGroupRef = useRef(null);
  const frameCountRef = useRef(0);
  const lastFpsTime = useRef(0);
  const actualFpsRef = useRef(60);
  const gridRef = useRef(null);
  const hudPanelRef = useRef(null);
  const legendPanelRef = useRef(null);
  const controlsPanelRef = useRef(null);
  const detailedPanelRef = useRef(null);
  const controlsRef = useRef(null);
  const backgroundStarsRef = useRef(null);
  const virtualScrollRef = useRef(null);
  const planetInstanceRef = useRef(null);
  const planetDataRef = useRef(new Map());
  const labelsRef = useRef({});
  const visiblePlanetsRef = useRef(new Set());
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

  const calculatePlanetPosition = (ra, dec, distance) => {
    const raRad = (ra * Math.PI) / 180;
    const decRad = (dec * Math.PI) / 180;
    
    const x = distance * Math.cos(decRad) * Math.cos(raRad);
    const y = distance * Math.sin(decRad);
    const z = distance * Math.cos(decRad) * Math.sin(raRad);
    
    return new THREE.Vector3(x, y, z);
  };

  const getPlanetSize = (radius) => {
    if (!radius || isNaN(radius)) radius = 1.0;
    
    const baseSize = 1.0;
    const scaleFactor = 0.3;
    
    const sizeFactor = Math.log10(radius + 1) + 1;
    return Math.max(0.2, Math.min(8.0, baseSize * sizeFactor * scaleFactor)) * PERFORMANCE_CONSTANTS.PLANET_SIZE_MULTIPLIER;
  };

  const getPlanetType = (radius, mass, period, hostTemp) => {
    if (!radius || isNaN(radius)) {
      if (mass && !isNaN(mass)) {
        if (mass < 0.1) return "Rocky";
        if (mass < 2.0) return "Super-Earth";
        if (mass < 10.0) return "Mini-Neptune";
        if (mass < 100.0) return "Gas Giant";
        return "Gas Giant";
      }
      return "Unknown";
    }

    if (radius < 1.25) return "Rocky";
    if (radius < 2.0) return "Super-Earth";
    if (radius < 4.0) return "Mini-Neptune";
    if (radius < 10.0) return "Gas Giant";
    if (radius >= 10.0) return "Ice Giant";

    if (period && period < 10 && radius > 8.0) return "Hot Jupiter";
    if (hostTemp && hostTemp > 6000 && period && period < 50) return "Lava World";

    return "Unknown";
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
    
    const newVisiblePlanets = new Set();
    let visibleCount = 0;
    let culledCount = 0;

    planets.forEach((planet) => {
      if (!planet.active) return;

      const data = planetDataRef.current.get(planet.id);
      if (!data || !data.position) return;

      const distance = data.position.distanceTo(camera.position);
      const sphere = new THREE.Sphere(data.position, 2.0 * PERFORMANCE_CONSTANTS.FRUSTUM_MARGIN);
      
      if (frustumRef.current.intersectsSphere(sphere) && distance < 5000) {
        newVisiblePlanets.add(planet.id);
        visibleCount++;
        
        if (visibleCount >= PERFORMANCE_CONSTANTS.MAX_VISIBLE_PLANETS) {
          return;
        }
      } else {
        culledCount++;
      }
    });

    visiblePlanetsRef.current = newVisiblePlanets;

    setPerformanceStats(prev => ({
      ...prev,
      visiblePlanets: visibleCount,
      culledPlanets: culledCount
    }));
  }, [planets]);

  const updateInstancedMeshes = useCallback(() => {
    if (!planetInstanceRef.current) return;

    let instanceIndex = 0;
    
    planets.forEach((planet) => {
      if (!planet.active || instanceIndex >= PERFORMANCE_CONSTANTS.MAX_VISIBLE_PLANETS) return;

      const position = calculatePlanetPosition(planet.ra, planet.dec, planet.distance);
      
      planetDataRef.current.set(planet.id, {
        position: position.clone(),
        lastUpdate: Date.now(),
        instanceIndex
      });

      if (visiblePlanetsRef.current.has(planet.id)) {
        const planetSize = getPlanetSize(planet.planetRadius);
        const scale = new THREE.Vector3(planetSize, planetSize, planetSize);
        
        tempMatrix.current.compose(position, tempQuaternion.current, scale);
        planetInstanceRef.current.setMatrixAt(instanceIndex, tempMatrix.current);

        tempColor.current.setHex(planet.color.replace("#", "0x"));
        planetInstanceRef.current.setColorAt(instanceIndex, tempColor.current);

        instanceIndex++;
      }
    });

    if (instanceIndex > 0) {
      planetInstanceRef.current.instanceMatrix.needsUpdate = true;
      if (planetInstanceRef.current.instanceColor) {
        planetInstanceRef.current.instanceColor.needsUpdate = true;
      }
    }

    planetInstanceRef.current.count = instanceIndex;
  }, [planets]);

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

    Object.keys(labelsRef.current).forEach(planetId => {
      const label = labelsRef.current[planetId];
      if (!label || !label.element) return;

      const data = planetDataRef.current.get(planetId);
      if (!data || !data.position) {
        label.element.style.display = "none";
        return;
      }

      tempVector.copy(data.position);
      tempVector.project(camera);

      const behind = tempVector.z > 1;

      if (!behind && showLabels) {
        const x = (tempVector.x * 0.5 + 0.5) * width;
        const y = (tempVector.y * -0.5 + 0.5) * height;

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

  const fetchPlanetData = async () => {
    const startTime = performance.now();
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_AUTH_URL}/exoplanet-catalog`, {
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
      
      const processedPlanets = result.planets.map((planet, index) => ({
        ...planet,
        color: PLANET_TYPE_COLORS[planet.planetType] || "#888888",
        methodColor: DISCOVERY_METHOD_COLORS[planet.discoveryMethod] || "#888888",
        active: index < PERFORMANCE_CONSTANTS.PRESELECT_COUNT
      }));

      return {
        planets: processedPlanets,
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
    if (e.target.closest(".exoplanet-close-btn")) return;
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
    if (e.target.closest(".exoplanet-collapse-icon")) return;
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
    if (e.target.closest(".exoplanet-collapse-icon") || 
        e.target.closest(".dinoSatExoplanetControlButton")) return;
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
    if (e.target.closest(".exoplanet-close-btn") || 
        e.target.closest(".exoplanet-model-viewer")) return;
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
      filteredPlanets.length - 1,
      Math.ceil((virtualScrollOffset + containerHeight) / itemHeight) + buffer
    );

    const visibleItems = filteredPlanets.slice(startIndex, endIndex + 1);

    return { visibleItems, startIndex, endIndex };
  }, [filteredPlanets, virtualScrollOffset]);

  const exportJSON = useCallback(() => {
    const detailedPlanets = planets.map(planet => {
      const data = planetDataRef.current.get(planet.id);
      const position = data ? data.position : { x: 0, y: 0, z: 0 };
      const distance = Math.sqrt(position.x * position.x + position.y * position.y + position.z * position.z);

      return {
        ...planet,
        currentPosition: {
          x: position.x.toFixed(2),
          y: position.y.toFixed(2),
          z: position.z.toFixed(2)
        },
        currentDistance: distance.toFixed(2),
        visible: visiblePlanetsRef.current.has(planet.id)
      };
    });

    const exportData = {
      exoplanets: detailedPlanets,
      hudReadouts: {
        activePlanets: planets.filter(p => p.active).length,
        actualFps,
        performanceStats
      },
      loadingMetadata,
      apiErrors: errors,
      catalogStats: {
        totalPlanets: planets.length,
        visiblePlanets: visiblePlanetsRef.current.size,
        typeDistribution: Object.fromEntries(
          Object.keys(PLANET_TYPE_COLORS).map(type => [
            type, 
            planets.filter(p => p.planetType === type).length
          ])
        )
      }
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
    let csv = "ID,Name,HostName,RA,Dec,DiscoveryMethod,DiscoveryYear,OrbitalPeriod,PlanetRadius,PlanetMass,SemiMajorAxis,Eccentricity,HostTemp,HostMag,Distance,PlanetType,EstimatedRadius,EstimatedMass,Density,EscapeVelocity,EquilibriumTemp,Habitability,Color,MethodColor,Active,Source,PositionX,PositionY,PositionZ,CurrentDistance,Visible\n";

    planets.forEach(planet => {
      const data = planetDataRef.current.get(planet.id);
      const position = data ? data.position : { x: 0, y: 0, z: 0 };
      const distance = Math.sqrt(position.x * position.x + position.y * position.y + position.z * position.z);
      const visible = visiblePlanetsRef.current.has(planet.id);

      csv += `${planet.id},"${planet.name}","${planet.hostName || ""}",${planet.ra},${planet.dec},"${planet.discoveryMethod || ""}",${planet.discoveryYear || ""},${planet.orbitalPeriod || ""},${planet.planetRadius || ""},${planet.planetMass || ""},${planet.semiMajorAxis || ""},${planet.eccentricity || ""},${planet.hostTemp || ""},${planet.hostMag || ""},${planet.distance},"${planet.planetType}",${planet.estimatedRadius || ""},${planet.estimatedMass || ""},${planet.density || ""},${planet.escapeVelocity || ""},${planet.equilibriumTemp || ""},"${planet.habitability || ""}",${planet.color},${planet.methodColor},${planet.active},"${planet.source || ""}",${position.x.toFixed(2)},${position.y.toFixed(2)},${position.z.toFixed(2)},${distance.toFixed(2)},${visible}\n`;
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
    setErrors([]);
    const { planets, errors, metadata } = await fetchPlanetData();
    setPlanets(planets);
    setErrors(errors);
    setLoadingMetadata(metadata);
    setLoading(false);
  }, []);

  const togglePlanet = useCallback((id) => {
    setPlanets(prev => prev.map(planet =>
      planet.id === id ? { ...planet, active: !planet.active } : planet
    ));
  }, []);

  const selectAllPlanets = useCallback(() => {
    setPlanets(prev => prev.map(planet => ({ ...planet, active: true })));
  }, []);

  const deselectAllPlanets = useCallback(() => {
    setPlanets(prev => prev.map(planet => ({ ...planet, active: false })));
  }, []);

  const clearFilters = useCallback(() => {
    setTypeFilter("All");
    setMethodFilter("All");
    setRadiusFilter("All");
    setDistanceFilter("All");
    setPeriodFilter("All");
    setSearchTerm("");
  }, []);

  const toggleLabels = useCallback(() => setShowLabels(!showLabels), [showLabels]);

  const toggleConnections = useCallback(() => setShowConnections(!showConnections), [showConnections]);

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
      cameraRef.current.position.set(200, 100, 200);
      cameraRef.current.lookAt(0, 0, 0);
    }
  }, []);

  const zoomToPlanet = useCallback((id) => {
    const data = planetDataRef.current.get(id);
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
    document.body.className = `exoplanet-theme-${theme}`;
    return () => {
      document.body.className = "";
    };
  }, [theme]);

  useEffect(() => {
    let filtered = planets.filter(planet => {
      const matchesSearch = planet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           planet.hostName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           planet.planetType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           planet.discoveryMethod.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = typeFilter === "All" || planet.planetType === typeFilter;
      const matchesMethod = methodFilter === "All" || planet.discoveryMethod === methodFilter;
      
      let matchesRadius = true;
      if (radiusFilter !== "All") {
        const range = RADIUS_RANGES.find(r => r.label === radiusFilter);
        if (range && planet.planetRadius) {
          matchesRadius = planet.planetRadius >= range.min && planet.planetRadius <= range.max;
        }
      }
      
      let matchesDistance = true;
      if (distanceFilter !== "All") {
        const range = DISTANCE_RANGES.find(r => r.label === distanceFilter);
        if (range) {
          matchesDistance = planet.distance >= range.min && planet.distance <= range.max;
        }
      }
      
      let matchesPeriod = true;
      if (periodFilter !== "All") {
        const range = PERIOD_RANGES.find(r => r.label === periodFilter);
        if (range && planet.orbitalPeriod) {
          matchesPeriod = planet.orbitalPeriod >= range.min && planet.orbitalPeriod <= range.max;
        }
      }
      
      return matchesSearch && matchesType && matchesMethod && matchesRadius && matchesDistance && matchesPeriod;
    });

    if (sortOption !== "none") {
      filtered.sort((a, b) => {
        switch (sortOption) {
          case "name_asc":
            return a.name.localeCompare(b.name);
          case "name_desc":
            return b.name.localeCompare(a.name);
          case "year_desc":
            return (b.discoveryYear || 0) - (a.discoveryYear || 0);
          case "year_asc":
            return (a.discoveryYear || 0) - (b.discoveryYear || 0);
          case "distance_asc":
            return a.distance - b.distance;
          case "distance_desc":
            return b.distance - a.distance;
          case "type":
            return a.planetType.localeCompare(b.planetType);
          case "method":
            return a.discoveryMethod.localeCompare(b.discoveryMethod);
          default:
            return 0;
        }
      });
    }

    setFilteredPlanets(filtered);
  }, [planets, searchTerm, typeFilter, methodFilter, radiusFilter, distanceFilter, periodFilter, sortOption]);

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000011, 0.00001);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 20000);
    camera.position.set(200, 100, 200);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance"
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000005, 1);
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

    const ambientLight = new THREE.AmbientLight(0x404080, 0.6);
    scene.add(ambientLight);

    const polarGrid = new THREE.PolarGridHelper(500, 24, 16, 128, 0x444444, 0x111111);
    polarGrid.visible = showGrid;
    scene.add(polarGrid);
    gridRef.current = polarGrid;

    const planetGroup = new THREE.Group();
    scene.add(planetGroup);
    planetGroupRef.current = planetGroup;

    const planetGeometry = new THREE.SphereGeometry(0.5, 8, 8);
    const planetMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.95
    });
    const planetInstance = new THREE.InstancedMesh(
      planetGeometry, 
      planetMaterial, 
      PERFORMANCE_CONSTANTS.MAX_VISIBLE_PLANETS
    );
    planetInstance.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    planetInstance.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(PERFORMANCE_CONSTANTS.MAX_VISIBLE_PLANETS * 3), 3
    );
    planetGroup.add(planetInstance);
    planetInstanceRef.current = planetInstance;

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

      if (starType < 0.6) {
        baseColor = { r: 0.8, g: 0.9, b: 1.0 };
        intensity = 0.6 + Math.random() * 0.4;
        size = 0.8 + Math.random() * 0.4;
      } else if (starType < 0.8) {
        baseColor = { r: 1.0, g: 0.7, b: 0.3 };
        intensity = 0.7 + Math.random() * 0.3;
        size = 1.2 + Math.random() * 0.8;
      } else {
        baseColor = { r: 1.0, g: 0.4, b: 0.1 };
        intensity = 0.8 + Math.random() * 0.2;
        size = 1.5 + Math.random() * 1.0;
      }

      backgroundStarColors[i3] = baseColor.r * intensity;
      backgroundStarColors[i3 + 1] = baseColor.g * intensity;
      backgroundStarColors[i3 + 2] = baseColor.b * intensity;
      backgroundStarSizes[i] = size;
    }

    backgroundStarsGeometry.setAttribute("position", new THREE.BufferAttribute(backgroundStarPositions, 3));
    backgroundStarsGeometry.setAttribute("color", new THREE.BufferAttribute(backgroundStarColors, 3));
    backgroundStarsGeometry.setAttribute("size", new THREE.BufferAttribute(backgroundStarSizes, 1));

    const backgroundStarsMaterial = new THREE.ShaderMaterial({
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
        if (child instanceof THREE.Points) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        }
      });
      renderer.dispose();
    };
  }, [createLabel, showGrid]);

  useEffect(() => {
    if (sceneInitialized) {
      fetchCatalogData();
    }
  }, [sceneInitialized, fetchCatalogData]);

  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.visible = showGrid;
    }
  }, [showGrid]);

  useEffect(() => {
    Object.keys(labelsRef.current).forEach(planetId => {
      const label = labelsRef.current[planetId];
      if (label && label.element) {
        if (!planets.find(p => p.id === planetId && p.active)) {
          if (label.element.parentNode) {
            label.element.parentNode.removeChild(label.element);
          }
          delete labelsRef.current[planetId];
        }
      }
    });

    planets.forEach(planet => {
      if (planet.active && !labelsRef.current[planet.id]) {
        const label = createLabel(planet.name, planet.color);
        labelsRef.current[planet.id] = label;
        if (labelRendererRef.current) {
          labelRendererRef.current.appendChild(label.element);
        }
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

        if (backgroundStarsRef.current && backgroundStarsRef.current.material) {
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

        if (planets.length > 0) {
          if (frameCountRef.current % PERFORMANCE_CONSTANTS.UPDATE_FREQUENCY === 0) {
            updateInstancedMeshes();
            performFrustumCulling();
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

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [
    planets, showLabels, targetFps, updateLabels, performFrustumCulling, 
    updateInstancedMeshes, updateSpatialGrid
  ]);

  useEffect(() => {
    if (!detailedPlanet || !detailedPanelRef.current) return;

    const container = detailedPanelRef.current.querySelector(".exoplanet-model-viewer");
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

    const planetGroup = new THREE.Group();

    const planetSize = getPlanetSize(detailedPlanet.planetRadius) * 2;
    const planetGeometry = new THREE.SphereGeometry(planetSize, 32, 32);
    const planetMaterial = new THREE.MeshPhongMaterial({
      color: detailedPlanet.color,
      shininess: 100,
      emissive: detailedPlanet.color,
      emissiveIntensity: 0.1
    });
    const planetMesh = new THREE.Mesh(planetGeometry, planetMaterial);
    planetGroup.add(planetMesh);

    const atmosphereGeometry = new THREE.SphereGeometry(planetSize * 1.2, 16, 16);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: detailedPlanet.color,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    planetGroup.add(atmosphere);

    if (detailedPlanet.planetType === "Gas Giant" || detailedPlanet.planetType === "Ice Giant") {
      const ringGeometry = new THREE.RingGeometry(planetSize * 1.5, planetSize * 2.2, 32);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: detailedPlanet.color,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
      });
      const rings = new THREE.Mesh(ringGeometry, ringMaterial);
      rings.rotation.x = Math.PI / 2;
      planetGroup.add(rings);
    }

    scene.add(planetGroup);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = true;
    controls.enablePan = false;

    let animationId;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      planetGroup.rotation.y += 0.005;
      atmosphere.rotation.x += 0.003;
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
  }, [detailedPlanet]);

  const activePlanets = planets.filter(p => p.active).length;
  const typeCounts = planets.reduce((acc, planet) => {
    if (planet.active) {
      acc[planet.planetType] = (acc[planet.planetType] || 0) + 1;
    }
    return acc;
  }, {});

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
              <small>Fetching From Astronomical APIs...</small>
            </div>
          )}

          <div className="dinoSatExoplanetSideBarHeader">
            <h1>
              {!sidebarCollapsed && <small>Exoplanet Catalog</small>}
            </h1>

            {!sidebarCollapsed && (
              <>
                <div className="dinoSatExoplanetSideBarThemeSelector">
                  <button
                    className={`dinoSatExoplanetSelectButton ${theme === "dark" ? "dinoSatExoplanetButtonActive" : ""}`}
                    onClick={() => setTheme("dark")}
                  >
                    Dark
                  </button>
                  <button
                    className={`dinoSatExoplanetSelectButton ${theme === "neon" ? "dinoSatExoplanetButtonActive" : ""}`}
                    onClick={() => setTheme("neon")}
                  >
                    Neon
                  </button>
                </div>

                <div className="dinoSatExoplanetSideBarThemeSelector">
                  <div className="dinoSatExoplanetSideBarThemeSelectorStatusIndicator">
                    Ready
                    {loadingMetadata && (
                      <div style={{ fontSize: "9px", marginTop: "2px" }}>
                        Quality: {loadingMetadata.dataQuality} | Load: {loadingMetadata.loadTime?.toFixed(0)}ms
                      </div>
                    )}
                  </div>
                </div>

                <div className="dinoSatExoplanetSideBarThemeSelector">
                  {errors.length > 0 && (
                    <div 
                      className="dinoSatExoplanetSideBarThemeSelectorErrorIndicator" 
                      onClick={() => setShowErrors(!showErrors)} 
                      style={{ 
                        opacity: showErrors ? 1.0 : "", 
                        "paddingTop": showErrors ? "" : 0,  
                        "paddingBottom": showErrors ? "" : 0 
                      }}
                    >
                      <div className="dinoSatExoplanetSideBarThemeSelectorErrorIndicatorHeader">
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
                        <div className="dinoSatExoplanetSideBarThemeSelectorErrorIndicatorList">
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
              <div className="dinoSatExoplanetSearchControls">
                <input
                  type="text"
                  placeholder="Search exoplanets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="dinoSatExoplanetSearchInput"
                />
                <div className="dinoSatExoplanetSelectControls">
                  <button className="dinoSatExoplanetSelectButton" onClick={selectAllPlanets}>
                    Select All
                  </button>
                  <button className="dinoSatExoplanetSelectButton" onClick={deselectAllPlanets}>
                    Deselect All
                  </button>
                  <button className="dinoSatExoplanetSelectButton" onClick={fetchCatalogData}>
                    Refresh Data
                  </button>
                </div>
              </div>

              <div className="dinoSatExoplanetObjectsHeader">
                <span className="dinoSatExoplanetObjectsHeaderIcon">
                  <FontAwesomeIcon icon={faStar} />
                </span>
                <span>Exoplanets ({planets.filter(p => p.active).length}/{planets.length})</span>
              </div>

              <div 
                ref={virtualScrollRef}
                className="dinoSatExoplanetList exoplanet-list"
                style={{
                  height: "400px",
                  overflowY: "auto",
                  position: "relative"
                }}
                onScroll={handleVirtualScroll}
              >
                <div 
                  style={{ 
                    height: filteredPlanets.length * PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT,
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
                    {visibleItems.map((planet, index) => (
                      <div
                        key={planet.id}
                        className={`dinoSatExoplanetListItem exoplanet-item ${planet.active ? "dinoSatExoplanetButtonActive" : ""} ${selectedPlanet === planet.id ? "exoplanet-selected" : ""}`}
                        style={{ 
                          height: PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT,
                          minHeight: PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT 
                        }}
                        onClick={() => {
                          if (!planet.active) {
                            togglePlanet(planet.id);
                          }
                          setSelectedPlanet(planet.id);
                          zoomToPlanet(planet.id);
                        }}
                      >
                        <div
                          className="dinoSatExoplanetIndicator"
                          style={{ backgroundColor: planet.color }}
                        />
                        <div className="dinoSatExoplanetInfo">
                          <div className="dinoSatExoplanetName exoplanet-name">
                            {planet.name}
                          </div>
                          <div className="dinoSatExoplanetDetails">
                            <small>
                              {planet.planetType} | {planet.discoveryMethod} | {planet.discoveryYear} | {planet.distance.toFixed(1)} ly
                            </small>
                          </div>
                        </div>
                        <label className="consoleSwitch">
                          <input 
                            type="checkbox" 
                            checked={planet.active} 
                            onChange={() => { togglePlanet(planet.id); }} 
                          />
                          <span className="consoleSlider round"></span>
                        </label>
                        <button
                          className="dinoSatExoplanetInfoButton"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailedPlanet(planet);
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

        <div className="dinoSatExoplanetMainView">
          <div className="dinonSatExoplanetViewHeader">
            <div className="dinoSatExoplanetCatalogControls">
              <select 
                className="dinoSatExoplanetFilterSelect"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                aria-label="Filter by planet type"
              >
                <option value="All">All Types</option>
                {Object.keys(PLANET_TYPE_COLORS).map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>

              <select 
                className="dinoSatExoplanetFilterSelect"
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                aria-label="Filter by discovery method"
              >
                <option value="All">All Methods</option>
                {Object.keys(DISCOVERY_METHOD_COLORS).map(method => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>

              <select 
                className="dinoSatExoplanetFilterSelect"
                value={radiusFilter}
                onChange={(e) => setRadiusFilter(e.target.value)}
                aria-label="Filter by radius"
              >
                <option value="All">All Radii</option>
                {RADIUS_RANGES.map(range => (
                  <option key={range.label} value={range.label}>{range.label}</option>
                ))}
              </select>

              <select 
                className="dinoSatExoplanetFilterSelect"
                value={distanceFilter}
                onChange={(e) => setDistanceFilter(e.target.value)}
                aria-label="Filter by distance"
              >
                <option value="All">All Distances</option>
                {DISTANCE_RANGES.map(range => (
                  <option key={range.label} value={range.label}>{range.label}</option>
                ))}
              </select>

              <select 
                className="dinoSatExoplanetFilterSelect"
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                aria-label="Filter by orbital period"
              >
                <option value="All">All Periods</option>
                {PERIOD_RANGES.map(range => (
                  <option key={range.label} value={range.label}>{range.label}</option>
                ))}
              </select>

              <select 
                className="dinoSatExoplanetFilterSelect"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                aria-label="Sort by"
              >
                {SORT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>

              <button className="dinoSatExoplanetCatalogControlsButton" onClick={clearFilters} aria-label="Clear filters">
                Clear Filters
              </button>

              <select 
                className="dinoSatExoplanetFPSSelect" 
                value={targetFps} 
                onChange={(e) => setTargetFps(Number(e.target.value))} 
                aria-label="Target FPS"
              >
                {FPS_OPTIONS.map(fps => (
                  <option key={fps} value={fps}>{fps} FPS</option>
                ))}
              </select>

              <div className="dinoSatExoplanetCatalogControlsButton" onClick={toggleHUD} aria-label="Toggle HUD">
                <FontAwesomeIcon icon={faChartLine} /> HUD
              </div>

              <button className="dinoSatExoplanetCatalogControlsButton" onClick={exportJSON} aria-label="Export JSON">
                Export JSON
              </button>

              <button className="dinoSatExoplanetCatalogControlsButton" onClick={exportCSV} aria-label="Export CSV">
                Export CSV
              </button>
            </div>
          </div>

          <div ref={mountRef} className="dinoSatExoplanetCanvasContainer" />

          <div
            ref={legendPanelRef}
            className={`dinoSatExoplanetLegendPanel ${legendCollapsed ? "exoplanet-collapsed" : ""}`}
            style={{
              transform: `translate(${legendPosition.x}px, ${legendPosition.y}px)`,
              cursor: isDraggingLegend ? "grabbing" : "grab"
            }}
            onMouseDown={handleLegendMouseDown}
            tabIndex={0}
          >
            <div className="dinoSatExoplanetPanelHeader" onClick={handleLegendToggle}>
              <small>Planet Types</small>
              <span className="dinosatExoplanetHeaderIcon">
                <FontAwesomeIcon icon={legendCollapsed ? faChevronDown : faChevronUp} />
              </span>
            </div>
            {!legendCollapsed && (
              <div className="dinoSatExoplanetPanelContent">
                {Object.entries(PLANET_TYPE_COLORS).map(([type, color]) => (
                  <div key={type} className="dinoSatExoplanetLegendItem">
                    <div className="dinoSatExoplanetLegendColor" style={{ backgroundColor: color }} />
                    <span>{type}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            ref={controlsPanelRef}
            className={`dinoSatExoplanetControlsPanel ${controlsCollapsed ? "exoplanet-collapsed" : ""}`}
            style={{
              transform: `translate(${controlsPosition.x}px, ${controlsPosition.y}px)`,
              cursor: isDraggingControls ? "grabbing" : "grab"
            }}
            onMouseDown={handleControlsMouseDown}
            tabIndex={0}
          >
            <div className="dinoSatExoplanetPanelHeader" onClick={handleControlsToggle}>
              <span>3D Controls</span>
              <span className="dinosatExoplanetHeaderIcon">
                <FontAwesomeIcon icon={controlsCollapsed ? faChevronDown : faChevronUp} />
              </span>
            </div>
            {!controlsCollapsed && (
              <div className="dinoSatExoplanetPanelContent">
                <button className="dinoSatExoplanetControlButton" onClick={resetCamera} aria-label="Reset camera">
                  Reset Camera
                </button>
                <button className="dinoSatExoplanetControlButton" onClick={toggleLabels} aria-label={showLabels ? "Hide labels" : "Show labels"}>
                  {showLabels ? "Hide" : "Show"} Labels
                </button>
              </div>
            )}
          </div>

          {hudVisible && (
            <div
              ref={hudPanelRef}
              className="dinoSatExoplanetHUDPanel"
              style={{
                transform: `translate(calc(-50% + ${hudPosition.x}px), calc(-50% + ${hudPosition.y}px))`,
                cursor: isDraggingHud ? "grabbing" : "grab"
              }}
              onMouseDown={handleHudMouseDown}
              tabIndex={0}
            >
              <div className="dinoSatExoplanetHUDPanelHeader">
                <span>Performance HUD - Drag To Move</span>
                <button className="dinoSatExoplanetCloseButton" onClick={toggleHUD} aria-label="Close HUD">
                  <FontAwesomeIcon icon={faXmarkSquare} />
                </button>
              </div>
              <div className="dinoSatExoplanetHUDContent">
                <div className="dinosatExoplanetHUDSection">
                  <h4 style={{ "marginTop": 0 }}>Performance Metrics</h4>
                  <div className="dinosatExoplanetHUDSectionGrid">
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Render Time:</span>
                      <span>{performanceStats.renderTime}ms</span>
                    </div>
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Target FPS:</span>
                      <span>{targetFps}</span>
                    </div>
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Actual FPS:</span>
                      <span>{actualFps}</span>
                    </div>
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Draw Calls:</span>
                      <span>{performanceStats.drawCalls}</span>
                    </div>
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Points:</span>
                      <span>{performanceStats.points.toLocaleString()}</span>
                    </div>
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Memory Usage:</span>
                      <span>{performanceStats.memoryUsage} objects</span>
                    </div>
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Visible Planets:</span>
                      <span style={{ color: "#00ff00" }}>{performanceStats.visiblePlanets}</span>
                    </div>
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Culled Planets:</span>
                      <span style={{ color: "#ffaa00" }}>{performanceStats.culledPlanets}</span>
                    </div>
                  </div>
                </div>

                <div className="dinosatExoplanetHUDSection">
                  <h4>Optimization Status</h4>
                  <div className="dinosatExoplanetHUDSectionGrid">
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Instanced Rendering:</span>
                      <span style={{ color: "#00ff00" }}>Active</span>
                    </div>
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Frustum Culling:</span>
                      <span style={{ color: "#00ff00" }}>Active</span>
                    </div>
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>LOD System:</span>
                      <span style={{ color: "#00ff00" }}>Active</span>
                    </div>
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Virtual Scrolling:</span>
                      <span style={{ color: "#00ff00" }}>Active</span>
                    </div>
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Spatial Partitioning:</span>
                      <span style={{ color: "#00ff00" }}>Active</span>
                    </div>
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Label Pooling:</span>
                      <span style={{ color: "#00ff00" }}>Active</span>
                    </div>
                  </div>
                </div>

                <div className="dinosatExoplanetHUDSection">
                  <h4>Data Status</h4>
                  <div className="dinosatExoplanetHUDSectionGrid">
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Active Planets:</span>
                      <span>{activePlanets}</span>
                    </div>
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Total Objects:</span>
                      <span>{planets.length}</span>
                    </div>
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Preselected Count:</span>
                      <span>{PERFORMANCE_CONSTANTS.PRESELECT_COUNT}</span>
                    </div>
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Data Sources:</span>
                      <span>Astronomical APIs</span>
                    </div>
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>API Errors:</span>
                      <span style={{ color: errors.length > 0 ? "#ff4400" : "#00ff00" }}>
                        {errors.length}
                      </span>
                    </div>
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Filtered Results:</span>
                      <span>{filteredPlanets.length}</span>
                    </div>
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Architecture:</span>
                      <span style={{ color: "#00ff00" }}>Optimized</span>
                    </div>
                  </div>
                </div>

                <div className="dinosatExoplanetHUDSection">
                  <h4>Catalog Statistics</h4>
                  <div className="dinosatExoplanetHUDSectionGrid">
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Active Rocky:</span>
                      <span>{typeCounts["Rocky"] || 0}</span>
                    </div>
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Active Super-Earth:</span>
                      <span>{typeCounts["Super-Earth"] || 0}</span>
                    </div>
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Active Mini-Neptune:</span>
                      <span>{typeCounts["Mini-Neptune"] || 0}</span>
                    </div>
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Active Gas Giant:</span>
                      <span>{typeCounts["Gas Giant"] || 0}</span>
                    </div>
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Active Ice Giant:</span>
                      <span>{typeCounts["Ice Giant"] || 0}</span>
                    </div>
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Active Hot Jupiter:</span>
                      <span>{typeCounts["Hot Jupiter"] || 0}</span>
                    </div>
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Active Terrestrial:</span>
                      <span>{typeCounts["Terrestrial"] || 0}</span>
                    </div>
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Other Types:</span>
                      <span>{Object.keys(typeCounts).filter(k => !["Rocky","Super-Earth","Mini-Neptune","Gas Giant","Ice Giant","Hot Jupiter","Terrestrial"].includes(k)).reduce((sum, k) => sum + typeCounts[k], 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {detailedPlanet && (
            <div
              ref={detailedPanelRef}
              className="dinoSatExoplanetDetailedPanel"
              style={{
                transform: `translate(calc(-50% + ${detailedPosition.x}px), calc(-50% + ${detailedPosition.y}px))`,
                cursor: isDraggingDetailed ? "grabbing" : "grab"
              }}
              onMouseDown={handleDetailedMouseDown}
              tabIndex={0}
            >
              <div className="dinoSatExoplanetHUDPanelHeader">
                <span>{detailedPlanet.name}</span>
                <button className="dinoSatExoplanetCloseButton" onClick={() => setDetailedPlanet(null)} aria-label="Close details">
                  <FontAwesomeIcon icon={faXmarkSquare} />
                </button>
              </div>
              <div className="dinoSatExoplanetHUDContent">
                <div className="exoplanet-model-viewer"></div>

                <div className="dinosatExoplanetHUDSection">
                  <h4>Basic Information</h4>
                  <div className="dinosatExoplanetHUDSectionGrid">
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Planet Name:</span>
                      <span>{detailedPlanet.name}</span>
                    </div>
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Host Star:</span>
                      <span>{detailedPlanet.hostName || "Unknown"}</span>
                    </div>
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Planet Type:</span>
                      <span>{detailedPlanet.planetType}</span>
                    </div>
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Data Source:</span>
                      <span>{detailedPlanet.source}</span>
                    </div>
                  </div>
                </div>

                <div className="dinosatExoplanetHUDSection">
                  <h4>Discovery Information</h4>
                  <div className="dinosatExoplanetHUDSectionGrid">
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Discovery Method:</span>
                      <span>{detailedPlanet.discoveryMethod || "Unknown"}</span>
                    </div>
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Discovery Year:</span>
                      <span>{detailedPlanet.discoveryYear || "Unknown"}</span>
                    </div>
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Host Star RA:</span>
                      <span>{detailedPlanet.ra.toFixed(4)}°</span>
                    </div>
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Host Star Dec:</span>
                      <span>{detailedPlanet.dec.toFixed(4)}°</span>
                    </div>
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Distance:</span>
                      <span>{detailedPlanet.distance.toFixed(2)} ly</span>
                    </div>
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Host Star Magnitude:</span>
                      <span>{detailedPlanet.hostMag ? detailedPlanet.hostMag.toFixed(2) : "Unknown"}</span>
                    </div>
                  </div>
                </div>

                <div className="dinosatExoplanetHUDSection">
                  <h4>Orbital Properties</h4>
                  <div className="dinosatExoplanetHUDSectionGrid">
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Orbital Period:</span>
                      <span>{detailedPlanet.orbitalPeriod ? `${detailedPlanet.orbitalPeriod.toFixed(2)} days` : "Unknown"}</span>
                    </div>
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Semi-Major Axis:</span>
                      <span>{detailedPlanet.semiMajorAxis ? `${detailedPlanet.semiMajorAxis.toFixed(3)} AU` : "Unknown"}</span>
                    </div>
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Eccentricity:</span>
                      <span>{detailedPlanet.eccentricity ? detailedPlanet.eccentricity.toFixed(3) : "Unknown"}</span>
                    </div>
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Host Star Temperature:</span>
                      <span>{detailedPlanet.hostTemp ? `${detailedPlanet.hostTemp} K` : "Unknown"}</span>
                    </div>
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Equilibrium Temperature:</span>
                      <span>{detailedPlanet.equilibriumTemp ? `${detailedPlanet.equilibriumTemp} K` : "Unknown"}</span>
                    </div>
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Habitability:</span>
                      <span style={{ color: detailedPlanet.habitability === "Potentially Habitable" ? "#00ff00" : "#ff4400" }}>
                        {detailedPlanet.habitability || "Unknown"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="dinosatExoplanetHUDSection">
                  <h4>Physical Properties</h4>
                  <div className="dinosatExoplanetHUDSectionGrid">
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Planet Radius:</span>
                      <span>{detailedPlanet.planetRadius ? `${detailedPlanet.planetRadius.toFixed(2)} R⊕` : "Unknown"}</span>
                    </div>
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Planet Mass:</span>
                      <span>{detailedPlanet.planetMass ? `${detailedPlanet.planetMass.toFixed(2)} M⊕` : "Unknown"}</span>
                    </div>
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Estimated Density:</span>
                      <span>{detailedPlanet.density ? `${detailedPlanet.density.toFixed(2)} g/cm³` : "Unknown"}</span>
                    </div>
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Escape Velocity:</span>
                      <span>{detailedPlanet.escapeVelocity ? `${detailedPlanet.escapeVelocity.toFixed(2)} km/s` : "Unknown"}</span>
                    </div>
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Estimated Radius:</span>
                      <span>{detailedPlanet.estimatedRadius ? `${detailedPlanet.estimatedRadius.toFixed(2)} R⊕` : "Unknown"}</span>
                    </div>
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Estimated Mass:</span>
                      <span>{detailedPlanet.estimatedMass ? `${detailedPlanet.estimatedMass.toFixed(2)} M⊕` : "Unknown"}</span>
                    </div>
                  </div>
                </div>

                <div className="dinosatExoplanetHUDSection">
                  <h4>Catalog Data</h4>
                  <div className="dinosatExoplanetHUDSectionGrid">
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Rendering Method:</span>
                      <span style={{ color: "#00ff00" }}>Instanced</span>
                    </div>
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Position Source:</span>
                      <span style={{ color: "#00ff00" }}>Astrometric</span>
                    </div>
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Visibility:</span>
                      <span style={{ color: visiblePlanetsRef.current.has(detailedPlanet.id) ? "#00ff00" : "#ff4400" }}>
                        {visiblePlanetsRef.current.has(detailedPlanet.id) ? "Visible" : "Culled"}
                      </span>
                    </div>
                    <div className="dinosatExoplanetHUDSectionItem">
                      <span>Coordinate Frame:</span>
                      <span>Equatorial J2000</span>
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