import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlane, faCloudBolt, faSatellite, faMeteor, faSnowflake, faGlobe, faUserPlus,
  faRightToBracket, faGauge, faExclamationCircle
} from "@fortawesome/free-solid-svg-icons";
import * as satelliteJs from "satellite.js";
import Nav from "../helpers/Nav.jsx";
import useAuth from "../UseAuth.jsx";
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
    maplibreCss: "https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.css",
    maplibreScript: "https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.js",
    satelliteTiles: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    labelTiles: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
  },
  refreshMs: {
    summary: 60 * 1000,
    summaryPending: 5 * 1000,
    flights: 15 * 1000,
    weather: 60 * 1000,
    satellites: 15 * 60 * 1000,
    asteroids: 30 * 60 * 1000,
    comets: 30 * 60 * 1000
  },
  map: {
    center: [-40, 30],
    zoom: 1.1,
    minZoom: 0,
    maxZoom: 9,
    views: {
      flights: { center: [-40, 30], zoom: 1.1 },
      weather: { center: [-96, 38], zoom: 2.6 },
      satellites: { center: [-40, 20], zoom: 0.9 }
    }
  },
  layout: {
    copyFraction: 0.4,
    copyMaxPx: 600,
    overlayAbovePx: 1000
  },
  orbit: {
    satelliteStepMs: 1000,
    redrawMs: 60 * 1000,
    hoverRadius: 10,
    labelGap: 22,
    rangeAu: { asteroids: 6, comets: 40 },
    planets: [
      { name: "Mercury", au: 0.387 },
      { name: "Venus", au: 0.723 },
      { name: "Earth", au: 1 },
      { name: "Mars", au: 1.524 },
      { name: "Jupiter", au: 5.203 },
      { name: "Saturn", au: 9.537 },
      { name: "Uranus", au: 19.19 },
      { name: "Neptune", au: 30.07 }
    ]
  },
  altitudeColors: [[10000, "#ff9100"], [20000, "#ffea00"], [30000, "#4ecdc4"], [40000, "#42a5f5"], [Infinity, "#b388ff"]],
  groundColor: "#919baf"
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
    description: "Every dot is an aircraft reporting its position right now. The full tracker adds search, emergencies, trails and airport data.",
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
    description: "Every dot is a warning in effect right now. The full tracker adds live radar, storm cells, local forecasts and alert sounds.",
    stats: [["Active Alerts", "total"], ["Warnings", "warnings"], ["Tornado Warnings", "tornadoWarnings"], ["Storm Cells", "stormCells"]]
  },
  {
    key: "satellites",
    counterLabel: "Satellites",
    route: "/satellite-tracker",
    label: "Satellites",
    icon: faSatellite,
    viewer: "map",
    title: "Satellite Tracker",
    description: "Every dot is a satellite over the point on the ground beneath it, moving in real time. The full tracker adds orbits, passes and conjunctions.",
    stats: [["Catalogued", "total"], ["Low Earth Orbit", "lowEarth"], ["Geostationary", "geostationary"], ["Shown Here", "shown"]]
  },
  {
    key: "asteroids",
    counterLabel: "Asteroids",
    route: "/asteroid-tracker",
    label: "Asteroids",
    icon: faMeteor,
    viewer: "orbit",
    title: "Asteroid Tracker",
    description: "Every dot is an asteroid where it is around the Sun today, seen from above. The full tracker adds close approaches and impact risk.",
    stats: [["Catalogued", "total"], ["Near Earth", "nearEarth"], ["Hazardous", "hazardous"], ["Shown Here", "shown"]]
  },
  {
    key: "comets",
    counterLabel: "Comets",
    route: "/comet-tracker",
    label: "Comets",
    icon: faSnowflake,
    viewer: "orbit",
    title: "Comet Tracker",
    description: "Every dot is a comet where it is around the Sun today, seen from above. The full tracker adds brightness, apparitions and observing windows.",
    stats: [["Catalogued", "total"], ["Periodic", "periodic"], ["Near The Sun", "nearSun"], ["Shown Here", "shown"]]
  }
];

const EMPTY_POINTS = { type: "FeatureCollection", features: [] };

const formatCount = (value) => (value === null || value === undefined || Number.isNaN(Number(value)) ? "—" : Number(value).toLocaleString());

const errorText = (error) => (error && error.message ? error.message : String(error));

const altitudeColor = (altitude, ground) => {
  if (ground) return SOURCES.groundColor;
  if (altitude === null || altitude === undefined) return SOURCES.altitudeColors[2][1];
  return SOURCES.altitudeColors.find(([limit]) => altitude < limit)[1];
};

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
  return { x, y, distance: Math.sqrt(x * x + y * y + z * z) };
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

const loadCss = (href, id) => {
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
};

let mapLibraryRequest = null;

const loadMapLibrary = () => {
  if (mapLibraryRequest) return mapLibraryRequest;
  mapLibraryRequest = (async () => {
    loadCss(SOURCES.assets.maplibreCss, "flight-maplibre-css");
    const response = await fetch(SOURCES.assets.maplibreScript);
    if (!response.ok) throw new Error(`The script ${SOURCES.assets.maplibreScript} returned status ${response.status}.`);
    const code = await response.text();
    const module = { exports: {} };
    new Function("module", "exports", code)(module, module.exports);
    if (!module.exports || !module.exports.Map) throw new Error("MapLibre GL did not load.");
    return module.exports;
  })().catch((error) => {
    mapLibraryRequest = null;
    throw error;
  });
  return mapLibraryRequest;
};

const DemoMap = ({ points, globe, view, inset }) => {
  const hostRef = useRef(null);
  const mapRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    let cancelled = false;
    let observer = null;
    const claimWheel = (event) => { event.preventDefault(); };
    host.addEventListener("wheel", claimWheel, { passive: false, capture: true });
    loadMapLibrary().then((maplibregl) => {
      if (cancelled) return;
      const map = new maplibregl.Map({
        container: host,
        style: {
          version: 8,
          sources: {
            "landing-imagery": { type: "raster", tiles: [SOURCES.assets.satelliteTiles], tileSize: 256, maxzoom: 19, attribution: "Tiles © Esri" },
            "landing-labels": { type: "raster", tiles: [SOURCES.assets.labelTiles], tileSize: 256, maxzoom: 19 }
          },
          layers: [
            { id: "landing-imagery-layer", type: "raster", source: "landing-imagery" },
            { id: "landing-labels-layer", type: "raster", source: "landing-labels", paint: { "raster-opacity": 0.9 } }
          ]
        },
        center: SOURCES.map.center,
        zoom: SOURCES.map.zoom,
        minZoom: SOURCES.map.minZoom,
        maxZoom: SOURCES.map.maxZoom,
        antialias: true,
        attributionControl: false
      });
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl(), "top-right");
      map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
      if (typeof ResizeObserver !== "undefined") {
        observer = new ResizeObserver(() => {
          if (mapRef.current) mapRef.current.resize();
        });
        observer.observe(host);
      }
      map.on("load", () => {
        if (cancelled) return;
        map.addSource("landing-points", { type: "geojson", data: EMPTY_POINTS });
        map.addLayer({ id: "landing-points-glow", type: "circle", source: "landing-points", paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 0, 4, 6, 10], "circle-color": ["get", "color"], "circle-opacity": 0.2, "circle-blur": 1 } });
        map.addLayer({ id: "landing-points-core", type: "circle", source: "landing-points", paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 0, 1.8, 6, 4.5], "circle-color": ["get", "color"], "circle-opacity": 0.95, "circle-blur": 0.15, "circle-stroke-width": 0.75, "circle-stroke-color": "rgba(8, 9, 12, 0.7)" } });
        map.on("mousemove", "landing-points-core", (event) => {
          const feature = event.features && event.features[0];
          if (!feature) return;
          map.getCanvas().style.cursor = "pointer";
          setHover({ x: event.point.x, y: event.point.y, title: feature.properties.title, line: feature.properties.line });
        });
        map.on("mouseleave", "landing-points-core", () => {
          map.getCanvas().style.cursor = "";
          setHover(null);
        });
        setReady(true);
      });
    }).catch((reason) => {
      if (!cancelled) setError(`The map could not be started because of the error "${errorText(reason)}".`);
    });
    return () => {
      cancelled = true;
      if (observer) observer.disconnect();
      host.removeEventListener("wheel", claimWheel, { capture: true });
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (reason) {
          mapRef.current = null;
        }
      }
      mapRef.current = null;
      setReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const source = map.getSource("landing-points");
    if (!source) return;
    source.setData({
      type: "FeatureCollection",
      features: points.map((point) => ({ type: "Feature", geometry: { type: "Point", coordinates: [point.lon, point.lat] }, properties: { title: point.title, line: point.line, color: point.color } }))
    });
  }, [ready, points]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    try {
      if (typeof map.setProjection === "function") map.setProjection({ type: globe ? "globe" : "mercator" });
    } catch (reason) {
      setError(`The globe view could not be switched because of the error "${errorText(reason)}".`);
    }
  }, [ready, globe]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !view) return;
    setHover(null);
    map.easeTo({ center: view.center, zoom: view.zoom, padding: { left: inset, right: 0, top: 0, bottom: 0 }, duration: 900 });
  }, [ready, view, inset]);

  return (
    <div className="landingMapWrapper">
      <div ref={hostRef} className="landingMapHost" onMouseLeave={() => setHover(null)} />
      {hover && (
        <div className="landingTooltip" style={{ left: hover.x + 14, top: hover.y + 14 }}>
          <div className="landingTooltipTitle">{hover.title}</div>
          {hover.line && <div className="landingTooltipLine">{hover.line}</div>}
        </div>
      )}
      {!ready && (
        <div className="landingViewerOverlay">
          {error ? <div className="landingErrorBox"><FontAwesomeIcon icon={faExclamationCircle} /><span>{error}</span></div> : <div className="loading-circle" />}
        </div>
      )}
    </div>
  );
};

const OrbitPlot = ({ objects, rangeAu, inset }) => {
  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const plottedRef = useRef([]);
  const [hover, setHover] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), SOURCES.orbit.redrawMs);
    return () => clearInterval(timer);
  }, []);

  const draw = useCallback(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return;
    const width = wrapper.clientWidth;
    const height = wrapper.clientHeight;
    if (!width || !height) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const context = canvas.getContext("2d");
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    context.fillStyle = "#08090c";
    context.fillRect(0, 0, width, height);
    const centerX = inset + (width - inset) / 2;
    const centerY = height / 2;
    const reach = Math.min(width - inset, height) / 2 - 22;
    const project = (x, y, distance) => {
      const flat = Math.sqrt(x * x + y * y) || 1e-9;
      const radius = Math.sqrt(Math.min(distance, rangeAu) / rangeAu) * reach;
      return { px: centerX + (x / flat) * radius, py: centerY - (y / flat) * radius };
    };
    context.font = "700 10px Inter, Arial, sans-serif";
    context.textBaseline = "middle";
    let labelled = -Infinity;
    for (const planet of SOURCES.orbit.planets) {
      if (planet.au > rangeAu) continue;
      const radius = Math.sqrt(planet.au / rangeAu) * reach;
      context.beginPath();
      context.arc(centerX, centerY, radius, 0, Math.PI * 2);
      context.strokeStyle = planet.name === "Earth" ? "rgba(66, 165, 245, 0.35)" : "rgba(145, 155, 175, 0.16)";
      context.lineWidth = 1;
      context.stroke();
      if (planet.name !== "Earth" && radius - labelled >= SOURCES.orbit.labelGap) {
        labelled = radius;
        context.fillStyle = "rgba(145, 155, 175, 0.75)";
        context.fillText(planet.name, centerX + radius * 0.7071 + 5, centerY + radius * 0.7071 + 5);
      }
    }
    const jd = julianDate(new Date());
    const plotted = [];
    for (const object of objects) {
      const position = heliocentric(object.elements, jd);
      if (!position) continue;
      const point = project(position.x, position.y, position.distance);
      context.beginPath();
      context.arc(point.px, point.py, object.hazardous ? 2.4 : 1.7, 0, Math.PI * 2);
      context.fillStyle = object.color || "#aab4c8";
      context.globalAlpha = 0.9;
      context.fill();
      plotted.push({ px: point.px, py: point.py, title: object.name, line: `${position.distance.toFixed(2)} AU From The Sun` });
    }
    context.globalAlpha = 1;
    context.beginPath();
    context.arc(centerX, centerY, 5, 0, Math.PI * 2);
    context.shadowColor = "rgba(255, 217, 61, 0.8)";
    context.shadowBlur = 14;
    context.fillStyle = "#ffd93d";
    context.fill();
    context.shadowBlur = 0;
    const earth = earthPosition(jd);
    const earthPoint = project(earth.x, earth.y, earth.distance);
    context.beginPath();
    context.arc(earthPoint.px, earthPoint.py, 3.5, 0, Math.PI * 2);
    context.fillStyle = "#42a5f5";
    context.fill();
    context.fillStyle = "#cdd4e4";
    context.fillText("Earth", earthPoint.px + 7, earthPoint.py);
    plotted.push({ px: earthPoint.px, py: earthPoint.py, title: "Earth", line: `${earth.distance.toFixed(2)} AU From The Sun` });
    plottedRef.current = plotted;
  }, [objects, rangeAu, inset]);

  useEffect(() => {
    draw();
    const wrapper = wrapperRef.current;
    if (!wrapper || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(draw);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [draw, tick]);

  const onMove = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    let best = null;
    let bestDistance = SOURCES.orbit.hoverRadius * SOURCES.orbit.hoverRadius;
    for (const point of plottedRef.current) {
      const distance = (point.px - x) * (point.px - x) + (point.py - y) * (point.py - y);
      if (distance < bestDistance) {
        best = point;
        bestDistance = distance;
      }
    }
    setHover(best ? { x, y, title: best.title, line: best.line } : null);
  };

  return (
    <div className="landingMapWrapper" ref={wrapperRef} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <canvas ref={canvasRef} className="landingOrbitCanvas" />
      {hover && (
        <div className="landingTooltip" style={{ left: hover.x + 14, top: hover.y + 14 }}>
          <div className="landingTooltipTitle">{hover.title}</div>
          <div className="landingTooltipLine">{hover.line}</div>
        </div>
      )}
    </div>
  );
};

const Landing = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [active, setActive] = useState(DEMOS[0].key);
  const [summary, setSummary] = useState(null);
  const [demos, setDemos] = useState({});
  const [globe, setGlobe] = useState(true);
  const [satellitePoints, setSatellitePoints] = useState([]);

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

  const loadDemo = useCallback(async (key) => {
    setDemos((current) => ({ ...current, [key]: { data: current[key] ? current[key].data : null, error: null, loading: true } }));
    try {
      const response = await fetch(`${SOURCES.apiBase}${SOURCES.endpoints.demo}/${key}`);
      const body = await response.json().catch(() => null);
      if (!response.ok || !body || !body.success) throw new Error(body && body.message ? body.message : `The demo data request returned status ${response.status}.`);
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

  useEffect(() => {
    if (active !== "satellites" || !satelliteRecords.length) return undefined;
    const update = () => {
      const now = new Date();
      const gmst = satelliteJs.gstime(now);
      const next = [];
      for (const { satellite, record } of satelliteRecords) {
        try {
          const result = satelliteJs.propagate(record, now);
          if (!result || !result.position) continue;
          const geodetic = satelliteJs.eciToGeodetic(result.position, gmst);
          const lat = geodetic.latitude * 180 / Math.PI;
          const lon = geodetic.longitude * 180 / Math.PI;
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
          next.push({ lat, lon, color: satellite.color || "#4ecdc4", title: satellite.name, line: `Altitude ${Math.round(geodetic.height).toLocaleString()} Km` });
        } catch (error) {
          continue;
        }
      }
      setSatellitePoints(next);
    };
    update();
    const timer = setInterval(update, SOURCES.orbit.satelliteStepMs);
    return () => clearInterval(timer);
  }, [active, satelliteRecords]);

  const mapPoints = useMemo(() => {
    if (active === "satellites") return satellitePoints;
    if (!data) return [];
    if (active === "flights") {
      return (data.rows || []).map((row) => ({
        lat: row[0],
        lon: row[1],
        color: altitudeColor(row[3], row[4] === 1),
        title: row[5] || "Unidentified Aircraft",
        line: row[4] === 1 ? "On The Ground" : row[3] === null ? "Altitude Not Reported" : `Altitude ${Number(row[3]).toLocaleString()} Ft`
      }));
    }
    if (active === "weather") {
      const warnings = (data.warnings || []).map((warning) => ({ lat: warning.lat, lon: warning.lon, color: warning.color, title: warning.event, line: warning.area }));
      const tropical = (data.tropical || []).map((storm) => ({ lat: storm.lat, lon: storm.lon, color: "#ff6b6b", title: storm.name || "Tropical Cyclone", line: storm.intensity !== null && storm.intensity !== undefined ? `${storm.intensity} Kt Winds` : null }));
      return [...warnings, ...tropical];
    }
    return [];
  }, [active, data, satellitePoints]);

  const mapView = useMemo(() => SOURCES.map.views[active] || null, [active]);

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
          {demo.viewer === "map" ? (
            <DemoMap points={mapPoints} globe={globe} view={mapView} inset={inset} />
          ) : (
            <OrbitPlot objects={data && data.objects ? data.objects : []} rangeAu={SOURCES.orbit.rangeAu[active]} inset={inset} />
          )}
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
              <span className="landingDockCount">{formatCount(summary && summary.counts ? summary.counts[entry.key] : null)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Landing;