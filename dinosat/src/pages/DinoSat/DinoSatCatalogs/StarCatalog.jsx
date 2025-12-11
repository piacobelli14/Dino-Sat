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
import "../../../styles/mainStyles/DinoSat/DinoSatCatalogs/Stars/StarCatalog.css";

export default function StarCatalog() {
  const SPECTRAL_COLORS = {
    "O": "#9bb0ff",
    "B": "#aabfff", 
    "A": "#cad7ff",
    "F": "#f8f7ff",
    "G": "#fff4ea",
    "K": "#ffd2a1",
    "M": "#ffad51",
    "L": "#ff6600",
    "T": "#cc3300",
    "Y": "#990000",
    "C": "#ff8c69",
    "S": "#ff69b4",
    "WD": "#ffffff",
    "Unknown": "#888888"
  };

  const MAGNITUDE_RANGES = [
    { label: "Brightest (-2 to 0)", min: -2, max: 0 },
    { label: "Very Bright (0 to 2)", min: 0, max: 2 },
    { label: "Bright (2 to 4)", min: 2, max: 4 },
    { label: "Moderate (4 to 6)", min: 4, max: 6 },
    { label: "Faint (6 to 8)", min: 6, max: 8 },
    { label: "Very Faint (8+)", min: 8, max: 20 }
  ];

  const DISTANCE_RANGES = [
    { label: "Very Close (0-10 ly)", min: 0, max: 10 },
    { label: "Close (10-50 ly)", min: 10, max: 50 },
    { label: "Moderate (50-100 ly)", min: 50, max: 100 },
    { label: "Far (100-500 ly)", min: 100, max: 500 },
    { label: "Very Far (500+ ly)", min: 500, max: 10000 }
  ];

  const SORT_OPTIONS = [
    { label: "Name (A-Z)", value: "name_asc" },
    { label: "Name (Z-A)", value: "name_desc" },
    { label: "Brightness (Bright to Faint)", value: "magnitude_asc" },
    { label: "Brightness (Faint to Bright)", value: "magnitude_desc" },
    { label: "Distance (Near to Far)", value: "distance_asc" },
    { label: "Distance (Far to Near)", value: "distance_desc" },
    { label: "Spectral Type", value: "spectral" }
  ];

  const FPS_OPTIONS = [30, 60, 120, 144];

  const PERFORMANCE_CONSTANTS = {
    MAX_VISIBLE_STARS: 5000,
    LOD_DISTANCES: [100, 500, 2000, 10000],
    BATCH_SIZE: 1000,
    UPDATE_FREQUENCY: 1,
    LABEL_DISTANCE_THRESHOLD: 200,
    FRUSTUM_MARGIN: 1.2,
    PRESELECT_COUNT: 100,
    VIRTUAL_SCROLL_ITEM_HEIGHT: 50,
    VIRTUAL_SCROLL_BUFFER: 10,
    STAR_SIZE_MULTIPLIER: 2.0
  };

  const CATALOG_CONSTANTS = {
    PARSEC_TO_LY: 3.26156,
    LY_TO_KM: 9.461e12,
    SUN_MAGNITUDE: 4.83,
    DEFAULT_PARALLAX: 0.001,
    MAX_DISTANCE: 10000,
    MIN_MAGNITUDE: -3,
    MAX_MAGNITUDE: 20
  };

  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);
  const [showErrors, setShowErrors] = useState(false);
  const [copiedErrors, setCopiedErrors] = useState(false);
  const [loadingMetadata, setLoadingMetadata] = useState(null);
  const [stars, setStars] = useState([]);
  const [filteredStars, setFilteredStars] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [spectralFilter, setSpectralFilter] = useState("All");
  const [magnitudeFilter, setMagnitudeFilter] = useState("All");
  const [distanceFilter, setDistanceFilter] = useState("All");
  const [sortOption, setSortOption] = useState("magnitude_asc");
  const [targetFps, setTargetFps] = useState(60);
  const [actualFps, setActualFps] = useState(60);
  const [showLabels, setShowLabels] = useState(true);
  const [showConnections, setShowConnections] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [legendCollapsed, setLegendCollapsed] = useState(false);
  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  const [hudVisible, setHudVisible] = useState(false);
  const [detailedStar, setDetailedStar] = useState(null);
  const [selectedStar, setSelectedStar] = useState(null);
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
    visibleStars: 0,
    culledStars: 0
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
  const starGroupRef = useRef(null);
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
  const starInstanceRef = useRef(null);
  const starDataRef = useRef(new Map());
  const labelsRef = useRef({});
  const visibleStarsRef = useRef(new Set());
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

  const calculateStarPosition = (ra, dec, distance) => {
    const raRad = (ra * Math.PI) / 180;
    const decRad = (dec * Math.PI) / 180;
    
    const x = distance * Math.cos(decRad) * Math.cos(raRad);
    const y = distance * Math.sin(decRad);
    const z = distance * Math.cos(decRad) * Math.sin(raRad);
    
    return new THREE.Vector3(x, y, z);
  };

  const getStarSize = (magnitude) => {
    const baseMagnitude = 6.0;
    const baseSize = 1.0;
    const scaleFactor = 0.5;
    
    const sizeFactor = Math.pow(2.512, baseMagnitude - magnitude);
    return Math.max(0.2, Math.min(5.0, baseSize * sizeFactor * scaleFactor)) * PERFORMANCE_CONSTANTS.STAR_SIZE_MULTIPLIER;
  };

  const getSpectralClass = (bv, spectralType) => {
    if (spectralType && spectralType.length > 0) {
      const firstChar = spectralType.charAt(0).toUpperCase();
      if (SPECTRAL_COLORS[firstChar]) {
        return firstChar;
      }
    }
    
    if (typeof bv === "number" && !isNaN(bv)) {
      if (bv < -0.3) return "O";
      if (bv < -0.02) return "B";
      if (bv < 0.3) return "A";
      if (bv < 0.58) return "F";
      if (bv < 0.81) return "G";
      if (bv < 1.4) return "K";
      return "M";
    }
    
    return "Unknown";
  };

  const createLabel = useCallback((text, color = "#ffffff") => {
    const div = document.createElement("div");
    div.className = "star-body-label";
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
    
    stars.forEach((star, index) => {
      if (star.active) {
        const data = starDataRef.current.get(star.id);
        if (data && data.position) {
          spatialGrid.add({ star, index }, data.position);
        }
      }
    });
  }, [stars, spatialGrid]);

  const performFrustumCulling = useCallback(() => {
    if (!cameraRef.current) return;

    const camera = cameraRef.current;
    const matrix = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustumRef.current.setFromProjectionMatrix(matrix);
    
    const newVisibleStars = new Set();
    let visibleCount = 0;
    let culledCount = 0;

    stars.forEach((star) => {
      if (!star.active) return;

      const data = starDataRef.current.get(star.id);
      if (!data || !data.position) return;

      const distance = data.position.distanceTo(camera.position);
      const sphere = new THREE.Sphere(data.position, 2.0 * PERFORMANCE_CONSTANTS.FRUSTUM_MARGIN);
      
      if (frustumRef.current.intersectsSphere(sphere) && distance < 5000) {
        newVisibleStars.add(star.id);
        visibleCount++;
        
        if (visibleCount >= PERFORMANCE_CONSTANTS.MAX_VISIBLE_STARS) {
          return;
        }
      } else {
        culledCount++;
      }
    });

    visibleStarsRef.current = newVisibleStars;

    setPerformanceStats(prev => ({
      ...prev,
      visibleStars: visibleCount,
      culledStars: culledCount
    }));
  }, [stars]);

  const updateInstancedMeshes = useCallback(() => {
    if (!starInstanceRef.current) return;

    let instanceIndex = 0;
    
    stars.forEach((star) => {
      if (!star.active || instanceIndex >= PERFORMANCE_CONSTANTS.MAX_VISIBLE_STARS) return;

      const position = calculateStarPosition(star.ra, star.dec, star.distance);
      
      starDataRef.current.set(star.id, {
        position: position.clone(),
        lastUpdate: Date.now(),
        instanceIndex
      });

      if (visibleStarsRef.current.has(star.id)) {
        const starSize = getStarSize(star.magnitude);
        const scale = new THREE.Vector3(starSize, starSize, starSize);
        
        tempMatrix.current.compose(position, tempQuaternion.current, scale);
        starInstanceRef.current.setMatrixAt(instanceIndex, tempMatrix.current);

        tempColor.current.setHex(star.color.replace("#", "0x"));
        starInstanceRef.current.setColorAt(instanceIndex, tempColor.current);

        instanceIndex++;
      }
    });

    if (instanceIndex > 0) {
      starInstanceRef.current.instanceMatrix.needsUpdate = true;
      if (starInstanceRef.current.instanceColor) {
        starInstanceRef.current.instanceColor.needsUpdate = true;
      }
    }

    starInstanceRef.current.count = instanceIndex;
  }, [stars]);

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

    Object.keys(labelsRef.current).forEach(starId => {
      const label = labelsRef.current[starId];
      if (!label || !label.element) return;

      const data = starDataRef.current.get(starId);
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

  const fetchStarData = async () => {
    const startTime = performance.now();
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_AUTH_URL}/star-catalog`, {
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
      
      const processedStars = result.stars.map((star, index) => ({
        ...star,
        color: SPECTRAL_COLORS[star.spectralClass] || "#888888",
        active: index < PERFORMANCE_CONSTANTS.PRESELECT_COUNT
      }));

      return {
        stars: processedStars,
        errors: result.errors || [],
        metadata: {
          ...result.metadata,
          loadTime: performance.now() - startTime
        }
      };

    } catch (error) {
      return {
        stars: [],
        errors: [`Backend connection failed: ${error.message}. No real star data available.`],
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
    if (e.target.closest(".star-close-btn")) return;
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
    if (e.target.closest(".star-collapse-icon")) return;
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
    if (e.target.closest(".star-collapse-icon") || 
        e.target.closest(".dinoSatStarControlButton")) return;
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
    if (e.target.closest(".star-close-btn") || 
        e.target.closest(".star-model-viewer")) return;
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
      filteredStars.length - 1,
      Math.ceil((virtualScrollOffset + containerHeight) / itemHeight) + buffer
    );

    const visibleItems = filteredStars.slice(startIndex, endIndex + 1);

    return { visibleItems, startIndex, endIndex };
  }, [filteredStars, virtualScrollOffset]);

  const exportJSON = useCallback(() => {
    const detailedStars = stars.map(star => {
      const data = starDataRef.current.get(star.id);
      const position = data ? data.position : { x: 0, y: 0, z: 0 };
      const distance = Math.sqrt(position.x * position.x + position.y * position.y + position.z * position.z);

      return {
        ...star,
        currentPosition: {
          x: position.x.toFixed(2),
          y: position.y.toFixed(2),
          z: position.z.toFixed(2)
        },
        currentDistance: distance.toFixed(2),
        visible: visibleStarsRef.current.has(star.id)
      };
    });

    const exportData = {
      stars: detailedStars,
      hudReadouts: {
        activeStars: stars.filter(s => s.active).length,
        actualFps,
        performanceStats
      },
      loadingMetadata,
      apiErrors: errors,
      catalogStats: {
        totalStars: stars.length,
        visibleStars: visibleStarsRef.current.size,
        spectralDistribution: Object.fromEntries(
          Object.keys(SPECTRAL_COLORS).map(type => [
            type, 
            stars.filter(s => s.spectralClass === type).length
          ])
        )
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "star_catalog_data.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [stars, actualFps, performanceStats, loadingMetadata, errors]);

  const exportCSV = useCallback(() => {
    let csv = "ID,Name,Designation,RA,Dec,Magnitude,Distance,SpectralClass,BV,Temperature,Luminosity,Radius,Mass,Age,Metallicity,Color,Active,Source,PositionX,PositionY,PositionZ,CurrentDistance,Visible\n";

    stars.forEach(star => {
      const data = starDataRef.current.get(star.id);
      const position = data ? data.position : { x: 0, y: 0, z: 0 };
      const distance = Math.sqrt(position.x * position.x + position.y * position.y + position.z * position.z);
      const visible = visibleStarsRef.current.has(star.id);

      csv += `${star.id},"${star.name}","${star.designation || ""}",${star.ra},${star.dec},${star.magnitude},${star.distance},${star.spectralClass},${star.bv || ""},${star.temperature || ""},${star.luminosity || ""},${star.radius || ""},${star.mass || ""},${star.age || ""},${star.metallicity || ""},${star.color},${star.active},"${star.source || ""}",${position.x.toFixed(2)},${position.y.toFixed(2)},${position.z.toFixed(2)},${distance.toFixed(2)},${visible}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "star_catalog_data.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [stars]);

  const fetchCatalogData = useCallback(async () => {
    setLoading(true);
    setErrors([]);
    const { stars, errors, metadata } = await fetchStarData();
    setStars(stars);
    setErrors(errors);
    setLoadingMetadata(metadata);
    setLoading(false);
  }, []);

  const toggleStar = useCallback((id) => {
    setStars(prev => prev.map(star =>
      star.id === id ? { ...star, active: !star.active } : star
    ));
  }, []);

  const selectAllStars = useCallback(() => {
    setStars(prev => prev.map(star => ({ ...star, active: true })));
  }, []);

  const deselectAllStars = useCallback(() => {
    setStars(prev => prev.map(star => ({ ...star, active: false })));
  }, []);

  const clearFilters = useCallback(() => {
    setSpectralFilter("All");
    setMagnitudeFilter("All");
    setDistanceFilter("All");
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

  const zoomToStar = useCallback((id) => {
    const data = starDataRef.current.get(id);
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
    document.body.className = `star-theme-${theme}`;
    return () => {
      document.body.className = "";
    };
  }, [theme]);

  useEffect(() => {
    let filtered = stars.filter(star => {
      const matchesSearch = star.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           star.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           star.spectralClass.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSpectral = spectralFilter === "All" || star.spectralClass === spectralFilter;
      
      let matchesMagnitude = true;
      if (magnitudeFilter !== "All") {
        const range = MAGNITUDE_RANGES.find(r => r.label === magnitudeFilter);
        if (range) {
          matchesMagnitude = star.magnitude >= range.min && star.magnitude <= range.max;
        }
      }
      
      let matchesDistance = true;
      if (distanceFilter !== "All") {
        const range = DISTANCE_RANGES.find(r => r.label === distanceFilter);
        if (range) {
          matchesDistance = star.distance >= range.min && star.distance <= range.max;
        }
      }
      
      return matchesSearch && matchesSpectral && matchesMagnitude && matchesDistance;
    });

    if (sortOption !== "none") {
      filtered.sort((a, b) => {
        switch (sortOption) {
          case "name_asc":
            return a.name.localeCompare(b.name);
          case "name_desc":
            return b.name.localeCompare(a.name);
          case "magnitude_asc":
            return a.magnitude - b.magnitude;
          case "magnitude_desc":
            return b.magnitude - a.magnitude;
          case "distance_asc":
            return a.distance - b.distance;
          case "distance_desc":
            return b.distance - a.distance;
          case "spectral":
            return a.spectralClass.localeCompare(b.spectralClass);
          default:
            return 0;
        }
      });
    }

    setFilteredStars(filtered);
  }, [stars, searchTerm, spectralFilter, magnitudeFilter, distanceFilter, sortOption]);

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

    const starGroup = new THREE.Group();
    scene.add(starGroup);
    starGroupRef.current = starGroup;

    const starGeometry = new THREE.SphereGeometry(0.5, 8, 8);
    const starMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.95
    });
    const starInstance = new THREE.InstancedMesh(
      starGeometry, 
      starMaterial, 
      PERFORMANCE_CONSTANTS.MAX_VISIBLE_STARS
    );
    starInstance.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    starInstance.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(PERFORMANCE_CONSTANTS.MAX_VISIBLE_STARS * 3), 3
    );
    starGroup.add(starInstance);
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
    Object.keys(labelsRef.current).forEach(starId => {
      const label = labelsRef.current[starId];
      if (label && label.element) {
        if (!stars.find(s => s.id === starId && s.active)) {
          if (label.element.parentNode) {
            label.element.parentNode.removeChild(label.element);
          }
          delete labelsRef.current[starId];
        }
      }
    });

    stars.forEach(star => {
      if (star.active && !labelsRef.current[star.id]) {
        const label = createLabel(star.name, star.color);
        labelsRef.current[star.id] = label;
        if (labelRendererRef.current) {
          labelRendererRef.current.appendChild(label.element);
        }
      }
    });
  }, [stars, createLabel]);

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

        if (stars.length > 0) {
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
    stars, showLabels, targetFps, updateLabels, performFrustumCulling, 
    updateInstancedMeshes, updateSpatialGrid
  ]);

  useEffect(() => {
    if (!detailedStar || !detailedPanelRef.current) return;

    const container = detailedPanelRef.current.querySelector(".star-model-viewer");
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

    const starGroup = new THREE.Group();

    const starSize = getStarSize(detailedStar.magnitude) * 2;
    const starGeometry = new THREE.SphereGeometry(starSize, 32, 32);
    const starMaterial = new THREE.MeshPhongMaterial({
      color: detailedStar.color,
      shininess: 100,
      emissive: detailedStar.color,
      emissiveIntensity: 0.3
    });
    const starMesh = new THREE.Mesh(starGeometry, starMaterial);
    starGroup.add(starMesh);

    const coronaGeometry = new THREE.SphereGeometry(starSize * 1.5, 16, 16);
    const coronaMaterial = new THREE.MeshBasicMaterial({
      color: detailedStar.color,
      transparent: true,
      opacity: 0.2,
      side: THREE.BackSide
    });
    const corona = new THREE.Mesh(coronaGeometry, coronaMaterial);
    starGroup.add(corona);

    const glowGeometry = new THREE.SphereGeometry(starSize * 2.5, 12, 12);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: detailedStar.color,
      transparent: true,
      opacity: 0.1,
      side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    starGroup.add(glow);
    scene.add(starGroup);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = true;
    controls.enablePan = false;

    let animationId;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      starGroup.rotation.y += 0.005;
      glow.rotation.x += 0.003;
      corona.rotation.z += 0.002;
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
  }, [detailedStar]);

  const activeStars = stars.filter(s => s.active).length;
  const spectralCounts = stars.reduce((acc, star) => {
    if (star.active) {
      acc[star.spectralClass] = (acc[star.spectralClass] || 0) + 1;
    }
    return acc;
  }, {});

  const { visibleItems, startIndex } = getVirtualScrollItems;

  return (
    <div className="dinoSatPageWrapper">
      <DinoLabsNav activePage={"sat"}/>

      <div className={`dinoSatStarCatalogContainer star-theme-${theme}`}>
        <div className={`dinoSatStarSideBar ${sidebarCollapsed ? "dinoSatStarSideBarCollapsed" : ""}`}>
          {loading && (
            <div className="dinoSatStarSideBarLoadingContainer">
              <label>Loading Star Data...</label>
              <div className="dinoSatStarSideBarLoadingBar">
                <div className="dinoSatStarSideBarLoadingBarAccent" />
              </div>
              <small>Fetching From Astronomical APIs...</small>
            </div>
          )}

          <div className="dinoSatStarSideBarHeader">
            <h1>
              {!sidebarCollapsed && <small>Star Catalog</small>}
            </h1>

            {!sidebarCollapsed && (
              <>
                <div className="dinoSatStarSideBarThemeSelector">
                  <button
                    className={`dinoSatStarSelectButton ${theme === "dark" ? "dinoSatStarButtonActive" : ""}`}
                    onClick={() => setTheme("dark")}
                  >
                    Dark
                  </button>
                  <button
                    className={`dinoSatStarSelectButton ${theme === "neon" ? "dinoSatStarButtonActive" : ""}`}
                    onClick={() => setTheme("neon")}
                  >
                    Neon
                  </button>
                </div>

                <div className="dinoSatStarSideBarThemeSelector">
                  <div className="dinoSatStarSideBarThemeSelectorStatusIndicator">
                    Ready
                    {loadingMetadata && (
                      <div style={{ fontSize: "9px", marginTop: "2px" }}>
                        Quality: {loadingMetadata.dataQuality} | Load: {loadingMetadata.loadTime?.toFixed(0)}ms
                      </div>
                    )}
                  </div>
                </div>

                <div className="dinoSatStarSideBarThemeSelector">
                  {errors.length > 0 && (
                    <div 
                      className="dinoSatStarSideBarThemeSelectorErrorIndicator" 
                      onClick={() => setShowErrors(!showErrors)} 
                      style={{ 
                        opacity: showErrors ? 1.0 : "", 
                        "paddingTop": showErrors ? "" : 0,  
                        "paddingBottom": showErrors ? "" : 0 
                      }}
                    >
                      <div className="dinoSatStarSideBarThemeSelectorErrorIndicatorHeader">
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
                        <div className="dinoSatStarSideBarThemeSelectorErrorIndicatorList">
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
              <div className="dinoSatStarSearchControls">
                <input
                  type="text"
                  placeholder="Search stars..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="dinoSatStarSearchInput"
                />
                <div className="dinoSatStarSelectControls">
                  <button className="dinoSatStarSelectButton" onClick={selectAllStars}>
                    Select All
                  </button>
                  <button className="dinoSatStarSelectButton" onClick={deselectAllStars}>
                    Deselect All
                  </button>
                  <button className="dinoSatStarSelectButton" onClick={fetchCatalogData}>
                    Refresh Data
                  </button>
                </div>
              </div>

              <div className="dinoSatStarObjectsHeader">
                <span className="dinoSatStarObjectsHeaderIcon">
                  <FontAwesomeIcon icon={faStar} />
                </span>
                <span>Stars ({stars.filter(s => s.active).length}/{stars.length})</span>
              </div>

              <div 
                ref={virtualScrollRef}
                className="dinoSatStarList star-list"
                style={{
                  height: "400px",
                  overflowY: "auto",
                  position: "relative"
                }}
                onScroll={handleVirtualScroll}
              >
                <div 
                  style={{ 
                    height: filteredStars.length * PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT,
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
                    {visibleItems.map((star, index) => (
                      <div
                        key={star.id}
                        className={`dinoSatStarListItem star-item ${star.active ? "dinoSatStarButtonActive" : ""} ${selectedStar === star.id ? "star-selected" : ""}`}
                        style={{ 
                          height: PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT,
                          minHeight: PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT 
                        }}
                        onClick={() => {
                          if (!star.active) {
                            toggleStar(star.id);
                          }
                          setSelectedStar(star.id);
                          zoomToStar(star.id);
                        }}
                      >
                        <div
                          className="dinoSatStarIndicator"
                          style={{ backgroundColor: star.color }}
                        />
                        <div className="dinoSatStarInfo">
                          <div className="dinoSatStarName star-name">
                            {star.name}
                          </div>
                          <div className="dinoSatStarDetails">
                            <small>
                              {star.spectralClass} | Mag: {star.magnitude.toFixed(1)} | {star.distance.toFixed(1)} ly
                            </small>
                          </div>
                        </div>
                        <label className="consoleSwitch">
                          <input 
                            type="checkbox" 
                            checked={star.active} 
                            onChange={() => { toggleStar(star.id); }} 
                          />
                          <span className="consoleSlider round"></span>
                        </label>
                        <button
                          className="dinoSatStarInfoButton"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailedStar(star);
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

        <div className="dinoSatStarMainView">
          <div className="dinonSatStarViewHeader">
            <div className="dinoSatStarCatalogControls">
              <select 
                className="dinoSatStarFilterSelect"
                value={spectralFilter}
                onChange={(e) => setSpectralFilter(e.target.value)}
                aria-label="Filter by spectral type"
              >
                <option value="All">All Types</option>
                {Object.keys(SPECTRAL_COLORS).map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>

              <select 
                className="dinoSatStarFilterSelect"
                value={magnitudeFilter}
                onChange={(e) => setMagnitudeFilter(e.target.value)}
                aria-label="Filter by magnitude"
              >
                <option value="All">All Magnitudes</option>
                {MAGNITUDE_RANGES.map(range => (
                  <option key={range.label} value={range.label}>{range.label}</option>
                ))}
              </select>

              <select 
                className="dinoSatStarFilterSelect"
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
                className="dinoSatStarFilterSelect"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                aria-label="Sort by"
              >
                {SORT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>

              <button className="dinoSatStarCatalogControlsButton" onClick={clearFilters} aria-label="Clear filters">
                Clear Filters
              </button>

              <select 
                className="dinoSatStarFPSSelect" 
                value={targetFps} 
                onChange={(e) => setTargetFps(Number(e.target.value))} 
                aria-label="Target FPS"
              >
                {FPS_OPTIONS.map(fps => (
                  <option key={fps} value={fps}>{fps} FPS</option>
                ))}
              </select>

              <div className="dinoSatStarCatalogControlsButton" onClick={toggleHUD} aria-label="Toggle HUD">
                <FontAwesomeIcon icon={faChartLine} /> HUD
              </div>

              <button className="dinoSatStarCatalogControlsButton" onClick={exportJSON} aria-label="Export JSON">
                Export JSON
              </button>

              <button className="dinoSatStarCatalogControlsButton" onClick={exportCSV} aria-label="Export CSV">
                Export CSV
              </button>
            </div>
          </div>

          <div ref={mountRef} className="dinoSatStarCanvasContainer" />

          <div
            ref={legendPanelRef}
            className={`dinoSatStarLegendPanel ${legendCollapsed ? "star-collapsed" : ""}`}
            style={{
              transform: `translate(${legendPosition.x}px, ${legendPosition.y}px)`,
              cursor: isDraggingLegend ? "grabbing" : "grab"
            }}
            onMouseDown={handleLegendMouseDown}
            tabIndex={0}
          >
            <div className="dinoSatStarPanelHeader" onClick={handleLegendToggle}>
              <small>Spectral Types</small>
              <span className="dinosatStarHeaderIcon">
                <FontAwesomeIcon icon={legendCollapsed ? faChevronDown : faChevronUp} />
              </span>
            </div>
            {!legendCollapsed && (
              <div className="dinoSatStarPanelContent">
                {Object.entries(SPECTRAL_COLORS).map(([type, color]) => (
                  <div key={type} className="dinoSatStarLegendItem">
                    <div className="dinoSatStarLegendColor" style={{ backgroundColor: color }} />
                    <span>{type}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            ref={controlsPanelRef}
            className={`dinoSatStarControlsPanel ${controlsCollapsed ? "star-collapsed" : ""}`}
            style={{
              transform: `translate(${controlsPosition.x}px, ${controlsPosition.y}px)`,
              cursor: isDraggingControls ? "grabbing" : "grab"
            }}
            onMouseDown={handleControlsMouseDown}
            tabIndex={0}
          >
            <div className="dinoSatStarPanelHeader" onClick={handleControlsToggle}>
              <span>3D Controls</span>
              <span className="dinosatStarHeaderIcon">
                <FontAwesomeIcon icon={controlsCollapsed ? faChevronDown : faChevronUp} />
              </span>
            </div>
            {!controlsCollapsed && (
              <div className="dinoSatStarPanelContent">
                <button className="dinoSatStarControlButton" onClick={resetCamera} aria-label="Reset camera">
                  Reset Camera
                </button>
                <button className="dinoSatStarControlButton" onClick={toggleLabels} aria-label={showLabels ? "Hide labels" : "Show labels"}>
                  {showLabels ? "Hide" : "Show"} Labels
                </button>
              </div>
            )}
          </div>

          {hudVisible && (
            <div
              ref={hudPanelRef}
              className="dinoSatStarHUDPanel"
              style={{
                transform: `translate(calc(-50% + ${hudPosition.x}px), calc(-50% + ${hudPosition.y}px))`,
                cursor: isDraggingHud ? "grabbing" : "grab"
              }}
              onMouseDown={handleHudMouseDown}
              tabIndex={0}
            >
              <div className="dinoSatStarHUDPanelHeader">
                <span>Performance HUD - Drag To Move</span>
                <button className="dinoSatStarCloseButton" onClick={toggleHUD} aria-label="Close HUD">
                  <FontAwesomeIcon icon={faXmarkSquare} />
                </button>
              </div>
              <div className="dinoSatStarHUDContent">
                <div className="dinosatStarHUDSection">
                  <h4 style={{ "marginTop": 0 }}>Performance Metrics</h4>
                  <div className="dinosatStarHUDSectionGrid">
                    <div className="dinosatStarHUDSectionItem">
                      <span>Render Time:</span>
                      <span>{performanceStats.renderTime}ms</span>
                    </div>
                    <div className="dinosatStarHUDSectionItem">
                      <span>Target FPS:</span>
                      <span>{targetFps}</span>
                    </div>
                    <div className="dinosatStarHUDSectionItem">
                      <span>Actual FPS:</span>
                      <span>{actualFps}</span>
                    </div>
                    <div className="dinosatStarHUDSectionItem">
                      <span>Draw Calls:</span>
                      <span>{performanceStats.drawCalls}</span>
                    </div>
                    <div className="dinosatStarHUDSectionItem">
                      <span>Points:</span>
                      <span>{performanceStats.points.toLocaleString()}</span>
                    </div>
                    <div className="dinosatStarHUDSectionItem">
                      <span>Memory Usage:</span>
                      <span>{performanceStats.memoryUsage} objects</span>
                    </div>
                    <div className="dinosatStarHUDSectionItem">
                      <span>Visible Stars:</span>
                      <span style={{ color: "#00ff00" }}>{performanceStats.visibleStars}</span>
                    </div>
                    <div className="dinosatStarHUDSectionItem">
                      <span>Culled Stars:</span>
                      <span style={{ color: "#ffaa00" }}>{performanceStats.culledStars}</span>
                    </div>
                  </div>
                </div>

                <div className="dinosatStarHUDSection">
                  <h4>Optimization Status</h4>
                  <div className="dinosatStarHUDSectionGrid">
                    <div className="dinosatStarHUDSectionItem">
                      <span>Instanced Rendering:</span>
                      <span style={{ color: "#00ff00" }}>Active</span>
                    </div>
                    <div className="dinosatStarHUDSectionItem">
                      <span>Frustum Culling:</span>
                      <span style={{ color: "#00ff00" }}>Active</span>
                    </div>
                    <div className="dinosatStarHUDSectionItem">
                      <span>LOD System:</span>
                      <span style={{ color: "#00ff00" }}>Active</span>
                    </div>
                    <div className="dinosatStarHUDSectionItem">
                      <span>Virtual Scrolling:</span>
                      <span style={{ color: "#00ff00" }}>Active</span>
                    </div>
                    <div className="dinosatStarHUDSectionItem">
                      <span>Spatial Partitioning:</span>
                      <span style={{ color: "#00ff00" }}>Active</span>
                    </div>
                    <div className="dinosatStarHUDSectionItem">
                      <span>Label Pooling:</span>
                      <span style={{ color: "#00ff00" }}>Active</span>
                    </div>
                  </div>
                </div>

                <div className="dinosatStarHUDSection">
                  <h4>Data Status</h4>
                  <div className="dinosatStarHUDSectionGrid">
                    <div className="dinosatStarHUDSectionItem">
                      <span>Active Stars:</span>
                      <span>{activeStars}</span>
                    </div>
                    <div className="dinosatStarHUDSectionItem">
                      <span>Total Objects:</span>
                      <span>{stars.length}</span>
                    </div>
                    <div className="dinosatStarHUDSectionItem">
                      <span>Preselected Count:</span>
                      <span>{PERFORMANCE_CONSTANTS.PRESELECT_COUNT}</span>
                    </div>
                    <div className="dinosatStarHUDSectionItem">
                      <span>Data Sources:</span>
                      <span>Astronomical APIs</span>
                    </div>
                    <div className="dinosatStarHUDSectionItem">
                      <span>API Errors:</span>
                      <span style={{ color: errors.length > 0 ? "#ff4400" : "#00ff00" }}>
                        {errors.length}
                      </span>
                    </div>
                    <div className="dinosatStarHUDSectionItem">
                      <span>Filtered Results:</span>
                      <span>{filteredStars.length}</span>
                    </div>
                    <div className="dinosatStarHUDSectionItem">
                      <span>Architecture:</span>
                      <span style={{ color: "#00ff00" }}>Optimized</span>
                    </div>
                  </div>
                </div>

                <div className="dinosatStarHUDSection">
                  <h4>Catalog Statistics</h4>
                  <div className="dinosatStarHUDSectionGrid">
                    <div className="dinosatStarHUDSectionItem">
                      <span>Active O-Type:</span>
                      <span>{spectralCounts["O"] || 0}</span>
                    </div>
                    <div className="dinosatStarHUDSectionItem">
                      <span>Active B-Type:</span>
                      <span>{spectralCounts["B"] || 0}</span>
                    </div>
                    <div className="dinosatStarHUDSectionItem">
                      <span>Active A-Type:</span>
                      <span>{spectralCounts["A"] || 0}</span>
                    </div>
                    <div className="dinosatStarHUDSectionItem">
                      <span>Active F-Type:</span>
                      <span>{spectralCounts["F"] || 0}</span>
                    </div>
                    <div className="dinosatStarHUDSectionItem">
                      <span>Active G-Type:</span>
                      <span>{spectralCounts["G"] || 0}</span>
                    </div>
                    <div className="dinosatStarHUDSectionItem">
                      <span>Active K-Type:</span>
                      <span>{spectralCounts["K"] || 0}</span>
                    </div>
                    <div className="dinosatStarHUDSectionItem">
                      <span>Active M-Type:</span>
                      <span>{spectralCounts["M"] || 0}</span>
                    </div>
                    <div className="dinosatStarHUDSectionItem">
                      <span>Other Types:</span>
                      <span>{Object.keys(spectralCounts).filter(k => !["O","B","A","F","G","K","M"].includes(k)).reduce((sum, k) => sum + spectralCounts[k], 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {detailedStar && (
            <div
              ref={detailedPanelRef}
              className="dinoSatStarDetailedPanel"
              style={{
                transform: `translate(calc(-50% + ${detailedPosition.x}px), calc(-50% + ${detailedPosition.y}px))`,
                cursor: isDraggingDetailed ? "grabbing" : "grab"
              }}
              onMouseDown={handleDetailedMouseDown}
              tabIndex={0}
            >
              <div className="dinoSatStarHUDPanelHeader">
                <span>{detailedStar.name}</span>
                <button className="dinoSatStarCloseButton" onClick={() => setDetailedStar(null)} aria-label="Close details">
                  <FontAwesomeIcon icon={faXmarkSquare} />
                </button>
              </div>
              <div className="dinoSatStarHUDContent">
                <div className="star-model-viewer"></div>

                <div className="dinosatStarHUDSection">
                  <h4>Basic Information</h4>
                  <div className="dinosatStarHUDSectionGrid">
                    <div className="dinosatStarHUDSectionItem">
                      <span>Name:</span>
                      <span>{detailedStar.name}</span>
                    </div>
                    <div className="dinosatStarHUDSectionItem">
                      <span>Designation:</span>
                      <span>{detailedStar.designation || "Unknown"}</span>
                    </div>
                    <div className="dinosatStarHUDSectionItem">
                      <span>Spectral Class:</span>
                      <span>{detailedStar.spectralClass}</span>
                    </div>
                    <div className="dinosatStarHUDSectionItem">
                      <span>Data Source:</span>
                      <span>{detailedStar.source}</span>
                    </div>
                  </div>
                </div>

                <div className="dinosatStarHUDSection">
                  <h4>Observational Data</h4>
                  <div className="dinosatStarHUDSectionGrid">
                    <div className="dinosatStarHUDSectionItem">
                      <span>Right Ascension:</span>
                      <span>{detailedStar.ra.toFixed(4)}°</span>
                    </div>
                    <div className="dinosatStarHUDSectionItem">
                      <span>Declination:</span>
                      <span>{detailedStar.dec.toFixed(4)}°</span>
                    </div>
                    <div className="dinosatStarHUDSectionItem">
                      <span>Apparent Magnitude:</span>
                      <span>{detailedStar.magnitude.toFixed(2)}</span>
                    </div>
                    <div className="dinosatStarHUDSectionItem">
                      <span>Distance:</span>
                      <span>{detailedStar.distance.toFixed(2)} ly</span>
                    </div>
                    <div className="dinosatStarHUDSectionItem">
                      <span>B-V Color Index:</span>
                      <span>{detailedStar.bv ? detailedStar.bv.toFixed(3) : "Unknown"}</span>
                    </div>
                    <div className="dinosatStarHUDSectionItem">
                      <span>Parallax:</span>
                      <span>{detailedStar.parallax ? detailedStar.parallax.toFixed(4) + " arcsec" : "Unknown"}</span>
                    </div>
                  </div>
                </div>

                <div className="dinosatStarHUDSection">
                  <h4>Physical Properties</h4>
                  <div className="dinosatStarHUDSectionGrid">
                    <div className="dinosatStarHUDSectionItem">
                      <span>Temperature:</span>
                      <span>{detailedStar.temperature ? `${detailedStar.temperature} K` : "Unknown"}</span>
                    </div>
                    <div className="dinosatStarHUDSectionItem">
                      <span>Luminosity:</span>
                      <span>{detailedStar.luminosity ? `${detailedStar.luminosity.toFixed(2)} L☉` : "Unknown"}</span>
                    </div>
                    <div className="dinosatStarHUDSectionItem">
                      <span>Radius:</span>
                      <span>{detailedStar.radius ? `${detailedStar.radius.toFixed(2)} R☉` : "Unknown"}</span>
                    </div>
                    <div className="dinosatStarHUDSectionItem">
                      <span>Mass:</span>
                      <span>{detailedStar.mass ? `${detailedStar.mass.toFixed(2)} M☉` : "Unknown"}</span>
                    </div>
                    <div className="dinosatStarHUDSectionItem">
                      <span>Age:</span>
                      <span>{detailedStar.age ? `${detailedStar.age.toFixed(1)} Gyr` : "Unknown"}</span>
                    </div>
                    <div className="dinosatStarHUDSectionItem">
                      <span>Metallicity:</span>
                      <span>{detailedStar.metallicity ? detailedStar.metallicity.toFixed(2) : "Unknown"}</span>
                    </div>
                  </div>
                </div>

                <div className="dinosatStarHUDSection">
                  <h4>Catalog Data</h4>
                  <div className="dinosatStarHUDSectionGrid">
                    <div className="dinosatStarHUDSectionItem">
                      <span>Rendering Method:</span>
                      <span style={{ color: "#00ff00" }}>Instanced</span>
                    </div>
                    <div className="dinosatStarHUDSectionItem">
                      <span>Position Source:</span>
                      <span style={{ color: "#00ff00" }}>Astrometric</span>
                    </div>
                    <div className="dinosatStarHUDSectionItem">
                      <span>Visibility:</span>
                      <span style={{ color: visibleStarsRef.current.has(detailedStar.id) ? "#00ff00" : "#ff4400" }}>
                        {visibleStarsRef.current.has(detailedStar.id) ? "Visible" : "Culled"}
                      </span>
                    </div>
                    <div className="dinosatStarHUDSectionItem">
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