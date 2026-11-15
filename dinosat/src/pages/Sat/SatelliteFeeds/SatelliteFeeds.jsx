import React, { useEffect, useLayoutEffect, useRef, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faInfoCircle, faPlay, faPause, faSatellite, faChartLine,
  faXmark, faSquareCheck, faClone,
  faTriangleExclamation, faEye,
  faTowerBroadcast, faVideo, faImage, faCircleNodes, faSatelliteDish,
  faRoute, faSpinner, faCheckCircle, faXmarkCircle,
  faMagnifyingGlass, faFilter, faSort, faGauge, faShieldHalved,
  faTemperatureHigh, faAtom, faChartArea, faChartColumn, faList,
  faFlask, faBookOpen, faMicroscope, faLayerGroup, faClock,
  faMagnifyingGlassPlus, faMagnifyingGlassMinus, faCompass, faExpand,
  faCompress, faRotate, faCamera, faDownload, faArrowsRotate,
  faArrowLeft, faArrowRight, faArrowUp, faArrowDown, faCircleDot, faLink,
  faMaximize, faObjectGroup, faPalette, faBrain,
  faSquareCaretUp, faSquareCaretDown, faSquarePlus, faSquareMinus, faEyeSlash, faBell, faXmarkSquare,
  faClockRotateLeft, faDatabase, faBackwardStep, faForwardStep, faThumbtack, faTableColumns, faCalendarDays,
  faLightbulb, faCheck, faBan, faVolumeHigh, faVolumeXmark, faBellSlash, faRepeat, faMapPin, faPlus, faEdit, faTrash,
  faSave, faTimes, faExclamationCircle, faCheckDouble, faLocationCrosshairs, faLocationDot, faMapMarkerAlt, faSearchPlus,
  faGlobeAmericas
} from "@fortawesome/free-solid-svg-icons";
import Nav from "../../../helpers/Nav.jsx";
import Dropdown from "../../../helpers/Dropdown.jsx";
import useAuth from "../../../UseAuth.jsx";
import { openDB } from "idb";
import "../../../styles/helperStyles/Switch.css";
import "../../../styles/mainStyles/Sat/Trackers/WeatherTracker/WeatherTracker.css";
import "../../../styles/mainStyles/Sat/SatelliteFeeds/SatelliteFeeds.css";
import "../../../styles/helperStyles/LoadingSpinner.css";
import "../../../styles/helperStyles/Disconnected.css";

const PERFORMANCE_CONSTANTS = {
  VIRTUAL_SCROLL_ITEM_HEIGHT: 56,
  VIRTUAL_SCROLL_BUFFER: 8,
  SEARCH_DEBOUNCE_MS: 200,
  REFRESH_INTERVAL_MS: 60 * 1000,
  ISS_STREAM_RECONNECT_MS: 10000,
  HARVEST_PRODUCTS_REFRESH_MS: 5 * 60 * 1000,
  HARVEST_HEALTH_REFRESH_MS: 60 * 1000,
  HARVEST_FRAMES_REFRESH_MS: 30 * 1000,
  HARVEST_STREAM_RECONNECT_MS: 10000
};

const SOURCES = {
  apiBase: import.meta.env.VITE_API_BASE_URL,
  endpoints: {
    feedAlerts: "/feed-alerts",
    alertAnalysis: "/feed-alerts/analysis",
    areas: "/risk/areas",
    reverseGeocode: "/reverse-geocode",
    locationSearch: "/location-search"
  },
  assets: {
    maplibreCss: "https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css",
    maplibreScript: "https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js",
    mapkitScript: "https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.js",
    mapkitToken: import.meta.env.VITE_APPLE_MAPS_KEY,
    satelliteTiles: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    labelTiles: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
  },
  geocoding: {
    photon: "https://photon.komoot.io/api/",
    nominatim: "https://nominatim.openstreetmap.org/search",
    userAgent: "SatelliteFeeds/1.0",
    minQueryLength: 3,
    debounceMs: 300,
    resultLimit: 6,
    cacheLimit: 100,
    attribution: "Photon · © OpenStreetMap Contributors"
  },
  alerts: {
    refreshMs: 60 * 1000
  },
  defaultLocation: { lat: 29.7604, lon: -95.3698 },
  tables: {
    tightAt: 14,
    wrapAt: 28
  },
  persistence: {
    dbName: "SatelliteFeedsStateDB",
    storeName: "state",
    recordId: "state",
    restoreFlag: "satelliteFeedsRestoreInFlight",
    restoreSettleMs: 3000,
    saveDebounceMs: 500
  },
  sounds: {
    defaults: { enabled: false, minLevel: "warning", scope: "view", volume: 0.6, mode: "single", snoozeUntil: 0 },
    repeatGapSeconds: 0.8,
    scheduleAheadSeconds: 120,
    topUpSeconds: 20
  }
};

const apiUrl = (key) => `${SOURCES.apiBase}${SOURCES.endpoints[key]}`;

const FEED_TYPE_COLORS = {
  "video": "#ff6b6b",
  "image": "#42a5f5",
  "image-sequence": "#4ecdc4",
  "telemetry": "#FF9500",
  "timeline": "#ffd93d",
  "raw": "#919baf"
};

const FEED_TYPE_ICONS = {
  "video": faVideo,
  "image": faImage,
  "image-sequence": faLayerGroup,
  "telemetry": faTowerBroadcast,
  "timeline": faClockRotateLeft,
  "raw": faDatabase
};

const CATEGORY_COLORS = {
  "Live Stream": "#ff6b6b",
  "Live Telemetry": "#FF9500",
  "Geostationary Imagery": "#42a5f5",
  "Earth Observation": "#4ecdc4",
  "Solar Imagery": "#ffd93d",
  "Deep Space Imagery": "#7fe9e1",
  "Mission Footage": "#cdd4e4",
  "Curated Imagery": "#919baf"
};

const CATEGORY_FALLBACK_COLORS = ["#42a5f5", "#4ecdc4", "#ffd93d", "#7fe9e1", "#FF9500", "#ff6b6b", "#cdd4e4", "#919baf"];

const categoryColor = (category) => {
  if (!category) return "#42a5f5";
  if (CATEGORY_COLORS[category]) return CATEGORY_COLORS[category];
  let hash = 0;
  for (let i = 0; i < category.length; i += 1) hash = (hash * 31 + category.charCodeAt(i)) | 0;
  return CATEGORY_FALLBACK_COLORS[Math.abs(hash) % CATEGORY_FALLBACK_COLORS.length];
};

const HARVEST_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/harvest`;

const HARVEST_DOMAIN = "satellite-feeds";

const HARVEST_PRODUCT_PAGE = 500;

const HARVEST_TARGET_FRAMES = 240;

const HARVEST_LIVE_WINDOW_MS = 2 * 60 * 60 * 1000;

const HARVEST_MAJOR_PLATFORMS = /GOES|Himawari|Meteosat|MTG|GK-?2A|JPSS|NOAA-\d|Suomi|SDO|SOHO|STEREO|DSCOVR|PROBA2/i;

const HARVEST_LIVE_LOOP = { rangeKey: "3h", fps: 8, minFrames: 12 };

const HARVEST_WARNING_GRACE_HOURS = 3;

const HARVEST_DAYLIGHT_ONLY = /natural[ _-]?colou?r|true[ _-]?colou?r|\bband[ _-]?0?[1-6]\b|visible|\bvis\b|veggie/i;

const HARVEST_PLATFORM_LONGITUDES = [[/GOES-?1[69]|GOES[ -]East/i, -75.2], [/GOES-?1[78]|GOES[ -]West/i, -137.2], [/Himawari/i, 140.7], [/GK-?2A/i, 128.2], [/Meteosat-?9|IODC/i, 45.5], [/Meteosat|MTG|MSG/i, 0]];

const HARVEST_DARK_SUN_ELEVATION = -6;

const sunElevation = (latitude, longitude, date) => {
  const days = date.getTime() / 86400000 - 10957.5;
  const meanLongitude = (280.46 + 0.9856474 * days) * Math.PI / 180;
  const meanAnomaly = (357.528 + 0.9856003 * days) * Math.PI / 180;
  const eclipticLongitude = meanLongitude + (1.915 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly)) * Math.PI / 180;
  const obliquity = 23.439 * Math.PI / 180;
  const declination = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLongitude));
  const rightAscension = Math.atan2(Math.cos(obliquity) * Math.sin(eclipticLongitude), Math.cos(eclipticLongitude));
  const siderealDegrees = (280.46061837 + 360.98564736629 * days + longitude) % 360;
  const hourAngle = siderealDegrees * Math.PI / 180 - rightAscension;
  const lat = latitude * Math.PI / 180;
  return Math.asin(Math.sin(lat) * Math.sin(declination) + Math.cos(lat) * Math.cos(declination) * Math.cos(hourAngle)) * 180 / Math.PI;
};

const harvestInDarkness = (feed, at) => {
  const metadata = (feed && feed.harvest && feed.harvest.metadata) || {};
  const text = `${feed?.harvest?.productKey || ""} ${feed?.name || ""} ${metadata.product || ""}`;
  if (!HARVEST_DAYLIGHT_ONLY.test(text) || /geocolou?r/i.test(text)) return false;
  const platform = `${metadata.satellite || ""} ${feed?.spacecraft || ""}`;
  const match = HARVEST_PLATFORM_LONGITUDES.find(([pattern]) => pattern.test(platform));
  if (!match) return false;
  const sector = String(metadata.sector || "");
  if (/full[ _-]?disk/i.test(sector)) return false;
  const latitude = /southern/i.test(sector) ? -30 : 35;
  return sunElevation(latitude, match[1], at ? new Date(at) : new Date()) < HARVEST_DARK_SUN_ELEVATION;
};

const HARVEST_TYPE_BY_KIND = { image: "timeline", tiled: "timeline", video: "timeline", stream: "video", raw: "raw" };

const HARVEST_FEED_RULES = { minFrames: 6, maxAgeHours: 72, maxFutureMinutes: 10, excludeKinds: ["raw"] };

const HARVEST_HERO_PATTERNS = [/geocolou?r/i, /true[ _-]?colou?r/i, /natural[ _-]?(colou?r|enh)/i, /rgb[ _-]?natural/i, /blue[ _-]?marble/i, /day[ _-]?night[ _-]?band|\bdnb\b/i, /\bepic\b/i];

const heroRank = (text) => {
  const index = HARVEST_HERO_PATTERNS.findIndex((pattern) => pattern.test(text));
  return index < 0 ? 99 : index;
};

const productHeroRank = (product) => heroRank(`${product.productKey} ${product.name} ${(product.metadata && (product.metadata.product || product.metadata.layer || product.metadata.identifier)) || ""}`);

const HARVEST_RANGE_OPTIONS = [
  ["3h", "3H", 3 * 3600],
  ["12h", "12H", 12 * 3600],
  ["24h", "24H", 24 * 3600],
  ["3d", "3D", 3 * 86400],
  ["7d", "7D", 7 * 86400],
  ["30d", "30D", 30 * 86400],
  ["1y", "1Y", 365 * 86400],
  ["2y", "2Y", 2 * 365 * 86400],
  ["5y", "5Y", 5 * 365 * 86400]
];

const HARVEST_STATUS_COLORS = { Healthy: "#4ecdc4", Degraded: "#FF9500", Idle: "#919baf", "Needs Schema": "#ff6b6b" };

const LEAD_STATUS_TABS = [["new", "New"], ["reviewing", "Reviewing"], ["adopted", "Adopted"], ["dismissed", "Dismissed"], ["all", "All"]];

const LEAD_KINDS = { auth: { label: "Authentication", color: "#ff6b6b" }, key: { label: "API Key", color: "#FF9500" }, api: { label: "API", color: "#42a5f5" }, catalog: { label: "Catalog", color: "#4ecdc4" }, feed: { label: "Feed", color: "#7fe9e1" }, stream: { label: "Stream", color: "#ffd93d" }, host: { label: "New Host", color: "#cdd4e4" } };

const splitWarning = (message) => {
  const text = String(message || "").trim();
  const index = text.indexOf(": ");
  return index > 0 && index <= 80 ? [text.slice(0, index), text.slice(index + 2)] : ["Error", text];
};

const errorText = (error) => String(error && error.message ? error.message : error).replace(/\.$/, "");

const formatBytes = (bytes) => {
  const value = Number(bytes) || 0;
  if (value >= 1073741824) return `${(value / 1073741824).toFixed(2)} GB`;
  if (value >= 1048576) return `${(value / 1048576).toFixed(1)} MB`;
  return `${Math.round(value / 1024)} KB`;
};

const toLocalInputValue = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const harvestApiUrl = (path) => (path ? `${import.meta.env.VITE_API_BASE_URL}${path}` : null);

const harvestFrameImageUrl = (frame) => {
  if (!frame || frame.metadata?.videoId) return null;
  if (frame.stored) return harvestApiUrl(frame.contentUrl);
  return frame.originUrl || harvestApiUrl(frame.contentUrl);
};

const isViewableHarvestProduct = (product) => {
  if (product.mode === "off") return false;
  const metadata = product.metadata || {};
  if (product.kind === "stream") return metadata.live === true && Boolean(metadata.embedUrl);
  return product.frameCount > 0 || Boolean(metadata.snapshot);
};

const mapHarvestProduct = (product) => {
  const metadata = product.metadata || {};
  const frameCount = Number(product.frameCount) || 0;
  const lastFrameMs = product.lastFrameAt ? new Date(product.lastFrameAt).getTime() : 0;
  const isLive = product.kind === "stream" ? metadata.live === true : Date.now() - lastFrameMs < HARVEST_LIVE_WINDOW_MS;
  const latestUrl = `${HARVEST_BASE_URL}/products/${encodeURIComponent(product.productKey)}/latest/content`;
  let thumbnailUrl = null;
  if (product.kind === "stream") thumbnailUrl = metadata.videoId ? `https://i.ytimg.com/vi/${metadata.videoId}/hqdefault_live.jpg` : null;
  else if (product.kind !== "raw") thumbnailUrl = frameCount > 0 ? `${latestUrl}?t=${encodeURIComponent(product.lastFrameAt || "")}` : metadata.snapshot || null;
  return {
    id: `harvest-${product.productKey}`,
    name: product.name,
    spacecraft: metadata.satellite || metadata.channelName || metadata.provider || "",
    operator: metadata.provider || "",
    instrument: metadata.instrument || metadata.band || metadata.layer || metadata.identifier || (metadata.channel ? `Channel ${metadata.channel}` : ""),
    category: product.category || "Uncategorized",
    feedType: HARVEST_TYPE_BY_KIND[product.kind] || "timeline",
    isLive,
    cadenceLabel: `${frameCount.toLocaleString()} ${frameCount === 1 ? "Frame" : "Frames"}`,
    coverageRegime: metadata.sector || metadata.area || null,
    noradId: metadata.norad || null,
    latestTimestamp: product.lastFrameAt,
    embedUrl: product.kind === "stream" && metadata.embeddable !== false ? metadata.embedUrl || null : null,
    thumbnailUrl,
    description: `${product.name} is ${product.mode === "archive" ? "archived frame by frame" : "indexed"} by the DinoSat harvester${metadata.provider ? ` from ${metadata.provider}` : ""}.`,
    harvest: {
      productKey: product.productKey,
      name: product.name,
      sourceKey: product.sourceKey,
      kind: product.kind,
      mode: product.mode,
      history: Boolean(product.history),
      frameCount,
      firstSeenAt: product.firstSeenAt,
      lastSeenAt: product.lastSeenAt,
      lastFrameAt: product.lastFrameAt,
      policy: product.policy || {},
      metadata
    }
  };
};

const harvestQualifies = (product) => {
  if (!isViewableHarvestProduct(product)) return false;
  if (HARVEST_FEED_RULES.excludeKinds.includes(product.kind)) return false;
  if (product.kind === "stream") return true;
  if ((Number(product.frameCount) || 0) < HARVEST_FEED_RULES.minFrames) return false;
  const lastFrameMs = product.lastFrameAt ? new Date(product.lastFrameAt).getTime() : 0;
  if (lastFrameMs > Date.now() + HARVEST_FEED_RULES.maxFutureMinutes * 60000) return false;
  return Date.now() - lastFrameMs < HARVEST_FEED_RULES.maxAgeHours * 3600 * 1000;
};

const harvestGroupKey = (product) => {
  if (product.kind === "stream") return `stream|${product.productKey}`;
  const metadata = product.metadata || {};
  const craft = metadata.satellite || metadata.spacecraft || "";
  const scope = metadata.sector || metadata.instrument || "";
  if (craft || scope) return `${product.sourceKey}|${craft}|${scope}`;
  return `${product.sourceKey}|${metadata.host || ""}|${product.category || ""}`;
};

const harvestGroupName = (product, count) => {
  if (count === 1) return product.name;
  const metadata = product.metadata || {};
  const craft = metadata.satellite || metadata.spacecraft || "";
  const scope = metadata.sector || metadata.instrument || "";
  if (craft || scope) return [craft, scope].filter(Boolean).join(" ");
  return `${metadata.provider || product.sourceKey} ${product.category || "Imagery"}`;
};

const mapHarvestGroup = (key, members) => {
  const ordered = members.slice().sort((a, b) => productHeroRank(a) - productHeroRank(b) || new Date(b.lastFrameAt || 0) - new Date(a.lastFrameAt || 0) || (b.frameCount || 0) - (a.frameCount || 0));
  const primary = ordered[0];
  const featured = productHeroRank(primary) < 99;
  const base = { ...mapHarvestProduct(primary), featured };
  if (members.length === 1) return { ...base, harvest: { ...base.harvest, channels: [base.harvest] } };
  const channels = members.map(member => mapHarvestProduct(member).harvest).sort((a, b) => a.name.localeCompare(b.name));
  const frameCount = channels.reduce((sum, channel) => sum + channel.frameCount, 0);
  const firstSeenAt = channels.map(channel => channel.firstSeenAt).filter(Boolean).sort()[0] || null;
  const lastFrameAt = channels.map(channel => channel.lastFrameAt).filter(Boolean).sort().pop() || null;
  const name = harvestGroupName(primary, members.length);
  return {
    ...base,
    id: `harvest-group-${key.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
    name,
    instrument: `${channels.length} Channels`,
    cadenceLabel: `${frameCount.toLocaleString()} Frames`,
    latestTimestamp: lastFrameAt,
    description: `${name} combines ${channels.length} harvested products${base.operator ? ` from ${base.operator}` : ""}, with a shared timeline for each channel.`,
    harvest: { ...base.harvest, frameCount, firstSeenAt, lastFrameAt, channels }
  };
};

const hasPlatform = (product) => Boolean(product.metadata && (product.metadata.satellite || product.metadata.spacecraft));

const groupHarvestProducts = (products) => {
  const groups = new Map();
  let hidden = 0;
  for (const product of products) {
    if (!harvestQualifies(product)) {
      hidden += 1;
      continue;
    }
    const key = harvestGroupKey(product);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(product);
  }
  const feeds = [];
  for (const [key, members] of groups.entries()) {
    if (members.length > 1 && hasPlatform(members[0])) {
      const channels = members.map(member => mapHarvestProduct(member).harvest).sort((a, b) => a.name.localeCompare(b.name));
      for (const member of members) {
        const base = mapHarvestProduct(member);
        feeds.push({ ...base, featured: productHeroRank(member) < 99, harvest: { ...base.harvest, channels } });
      }
    } else {
      feeds.push(mapHarvestGroup(key, members));
    }
  }
  return { feeds, hidden };
};

const faMoon = faShieldHalved;

const safeRenderText = (value) => {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1");
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.filter(Boolean).map(v => safeRenderText(v)).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

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

const formatRelativeTime = (iso) => {
  if (!iso) return "—";
  const d = parseFeedDate(iso);
  if (!d) return iso;
  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (Math.abs(diffSec) < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (Math.abs(diffHr) < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d ago`;
};

const formatAbsoluteTime = (iso) => {
  if (!iso) return "—";
  const d = parseFeedDate(iso);
  if (!d) return iso;
  return d.toLocaleString();
};

const csvQuote = (val) => {
  const s = String(val === null || val === undefined ? "" : val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return `"${s}"`;
};

const clampCentered = (x, y, rect) => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const minX = (rect.width / 2) - (w / 2) + 10;
  const maxX = (rect.width / 2) - (w / 2) + w - 10;
  const minY = (rect.height / 2) - (h / 2) + 10;
  const maxY = (rect.height / 2) - (h / 2) + h - 10;
  return {
    x: Math.max(minX, Math.min(maxX, x)),
    y: Math.max(minY, Math.min(maxY, y))
  };
};

const proxyImageUrl = (feedId, opts = {}) => {
  const base = `${import.meta.env.VITE_API_BASE_URL}/feed-image-proxy/${feedId}`;
  const params = [];
  if (opts.thumb) params.push("type=thumb");
  if (opts.frame !== undefined && opts.frame !== null) params.push(`frame=${opts.frame}`);
  if (opts.version) params.push(`_v=${opts.version}`);
  return params.length > 0 ? `${base}?${params.join("&")}` : base;
};

const useDraggable = (panelRef, clampFn) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const positionRef = useRef({ x: 0, y: 0 });
  const clampFnRef = useRef(clampFn);

  useEffect(() => { positionRef.current = position; }, [position]);
  useEffect(() => { clampFnRef.current = clampFn; }, [clampFn]);

  const handleMouseDown = useCallback((e, ignoreFn) => {
    if (ignoreFn && ignoreFn(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - positionRef.current.x,
      y: e.clientY - positionRef.current.y
    };
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e) => {
      if (!panelRef.current) return;
      e.preventDefault();
      let newX = e.clientX - dragStartRef.current.x;
      let newY = e.clientY - dragStartRef.current.y;
      if (clampFnRef.current) {
        const clamped = clampFnRef.current(newX, newY, panelRef.current.getBoundingClientRect());
        newX = clamped.x;
        newY = clamped.y;
      }
      setPosition({ x: newX, y: newY });
    };
    const handleUp = () => setIsDragging(false);
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
  }, [isDragging, panelRef]);

  return { position, setPosition, isDragging, handleMouseDown };
};

const StatTile = ({ label, value, unit, sub, color, accent, large }) => {
  return (
    <div className={`satStatTile ${large ? "satStatTileLarge" : ""}`} style={{ borderLeftColor: accent || "var(--st-accent-primary)" }}>
      <div className="satStatTileLabel">{label}</div>
      <div className="satStatTileValue" style={color ? { color } : undefined}>
        {value}
        {unit && <span className="satStatTileUnit">{unit}</span>}
      </div>
      {sub && <div className="satStatTileSub">{sub}</div>}
    </div>
  );
};

const SceneToolbarTop = ({ zoom, onZoomChange, onZoomReset, onFitToFrame, onPan, onPanReset, rotation, onRotationChange, onRotationReset }) => {
  return (
    <div className="satSceneToolbar">
      <div className="satSceneToolbarGroup">
        <button className="satSceneToolbarButton" onClick={() => onZoomChange(zoom - 0.2)} title="Zoom out." disabled={zoom <= 0.4}>
          <FontAwesomeIcon icon={faMagnifyingGlassMinus} />
        </button>
        <span className="satSceneToolbarValue">{Math.round(zoom * 100)}%</span>
        <button className="satSceneToolbarButton" onClick={() => onZoomChange(zoom + 0.2)} title="Zoom in." disabled={zoom >= 6}>
          <FontAwesomeIcon icon={faMagnifyingGlassPlus} />
        </button>
        <button className="satSceneToolbarButton" onClick={onZoomReset} title="Reset zoom (1×).">
          <FontAwesomeIcon icon={faCircleDot} />
        </button>
        <button className="satSceneToolbarButton" onClick={onFitToFrame} title="Fit to frame.">
          <FontAwesomeIcon icon={faMaximize} />
        </button>
      </div>

      <div className="satSceneToolbarGroup">
        <button className="satSceneToolbarButton" onClick={() => onPan(-40, 0)} title="Pan left.">
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <button className="satSceneToolbarButton" onClick={() => onPan(0, -40)} title="Pan up.">
          <FontAwesomeIcon icon={faArrowUp} />
        </button>
        <button className="satSceneToolbarButton" onClick={() => onPan(0, 40)} title="Pan down.">
          <FontAwesomeIcon icon={faArrowDown} />
        </button>
        <button className="satSceneToolbarButton" onClick={() => onPan(40, 0)} title="Pan right.">
          <FontAwesomeIcon icon={faArrowRight} />
        </button>
        <button className="satSceneToolbarButton" onClick={onPanReset} title="Reset pan.">
          <FontAwesomeIcon icon={faCompass} />
        </button>
      </div>

      <div className="satSceneToolbarGroup">
        <button className="satSceneToolbarButton" onClick={() => onRotationChange(rotation - 90)} title="Rotate −90°">
          <FontAwesomeIcon icon={faRotate} flip="horizontal" />
        </button>
        <span className="satSceneToolbarValue">{rotation}°</span>
        <button className="satSceneToolbarButton" onClick={() => onRotationChange(rotation + 90)} title="Rotate +90°">
          <FontAwesomeIcon icon={faRotate} />
        </button>
        <button className="satSceneToolbarButton" onClick={onRotationReset} title="Reset rotation.">
          <FontAwesomeIcon icon={faCircleDot} />
        </button>
      </div>
    </div>
  );
};

const FeedStatusStrip = ({ metadata, feeds, registryLoading, expanded, onToggle, onRefresh }) => {
  if (registryLoading && !metadata) {
    return (
      <div className="satSpaceWeatherStrip satSpaceWeatherLoading" />
    );
  }
  if (!metadata) {
    return (
      <div className="satSpaceWeatherStrip satSpaceWeatherUnavailable">
        <FontAwesomeIcon icon={faTriangleExclamation} /> <span>The feed registry is unavailable.</span>
      </div>
    );
  }

  const totalAvailable = feeds.length;
  const totalUnavailable = metadata.totalUnavailable || 0;
  const liveCount = feeds.filter(feed => feed.feedType === "video" || feed.feedType === "telemetry").length;
  const imageCount = feeds.filter(feed => ["image", "image-sequence", "timeline"].includes(feed.feedType)).length;
  const earthObsCount = feeds.filter(feed => feed.category === "Earth Observation").length;
  const solarCount = feeds.filter(feed => ["Solar Imagery", "Coronagraph"].includes(feed.category)).length;
  const operatorCount = new Set(feeds.map(feed => feed.operator).filter(Boolean)).size;
  const harvestCount = feeds.filter(feed => feed.harvest).length;
  const buildSec = metadata.buildTimeMs ? Math.round(metadata.buildTimeMs / 1000) : null;

  return (
    <div className="satSpaceWeatherStrip">
      <div className="satSpaceWeatherStripCells">
        <div className="satSpaceWeatherCell" style={{ borderLeftColor: "#4ecdc4" }}>
          <div className="satSpaceWeatherCellLabel">Status</div>
          <div className="satSpaceWeatherCellValue" style={{ color: "#4ecdc4" }}>{totalAvailable} Feeds<span>{harvestCount} Harvested, {totalUnavailable} Unavailable</span></div>
        </div>
        <div className="satSpaceWeatherCell" style={{ borderLeftColor: "#ff6b6b" }}>
          <div className="satSpaceWeatherCellLabel">Live Streams</div>
          <div className="satSpaceWeatherCellValue">{liveCount}<span>Video + Telemetry</span></div>
        </div>
        <div className="satSpaceWeatherCell" style={{ borderLeftColor: "#42a5f5" }}>
          <div className="satSpaceWeatherCellLabel">Imagery</div>
          <div className="satSpaceWeatherCellValue">{imageCount}<span>Stills, Sequences, Timelines</span></div>
        </div>
        <div className="satSpaceWeatherCell" style={{ borderLeftColor: "#7fe9e1" }}>
          <div className="satSpaceWeatherCellLabel">Earth Obs</div>
          <div className="satSpaceWeatherCellValue">{earthObsCount}<span>Earth Observation</span></div>
        </div>
        <div className="satSpaceWeatherCell" style={{ borderLeftColor: "#ffd93d" }}>
          <div className="satSpaceWeatherCellLabel">Solar</div>
          <div className="satSpaceWeatherCellValue">{solarCount}<span>Solar and Coronagraph</span></div>
        </div>
        <div className="satSpaceWeatherCell" style={{ borderLeftColor: "#FF9500" }}>
          <div className="satSpaceWeatherCellLabel">Operators</div>
          <div className="satSpaceWeatherCellValue">{operatorCount}<span>Distinct Sources</span></div>
        </div>
        {buildSec !== null && (
          <div className="satSpaceWeatherCell">
            <div className="satSpaceWeatherCellLabel">Build Time</div>
            <div className="satSpaceWeatherCellValue">{buildSec}<span>Seconds</span></div>
          </div>
        )}
      </div>

      <button className="satSpaceWeatherToggle" onClick={onToggle} title={expanded ? "Hide diagnostics." : "Show diagnostics."}>
        {expanded ? "Hide Diagnostics" : "Show Diagnostics"}
        <FontAwesomeIcon icon={expanded ? faSquareCaretUp : faSquareCaretDown} />
      </button>
    </div>
  );
};

const DISCOVERY_METHODOLOGY = [
  { title: "NASA GIBS WMTS Capabilities", text: "The full WMTS capabilities XML is parsed at runtime to discover every available imagery layer published by NASA's Global Imagery Browse Services. Spacecraft platform and instrument are inferred from layer identifier and keyword tokens. Nothing about specific layers is hardcoded; if NASA adds or removes layers, this view reflects the change after the cache TTL elapses." },
  { title: "SDO and SOHO Directory Listings", text: "The SDO latest-image directory and the SOHO realtime directory are fetched as HTML and scanned for filename and folder patterns. Wavelength and product codes are extracted from these listings, not hardcoded. New wavelengths or products appear automatically once they show up in the directory." },
  { title: "NOAA STAR Directory Walk", text: "The NOAA NESDIS STAR ABI full-disk directory listings for GOES-East and GOES-West are scanned for product subdirectories. Each discovered subdirectory yields one feed pointing at the 5424×5424 native-resolution endpoint published by NOAA. Product titles are derived from the subdirectory codes." },
  { title: "NASA Image and Video Library", text: "Multiple thematic searches are issued against the NASA Image and Video Library API to discover archived video assets. Each candidate's MP4 asset URL is resolved via the per-asset metadata endpoint. Videos without resolvable MP4 URLs are dropped." },
  { title: "YouTube Live Search", text: "The YouTube Data API is queried against a curated allowlist of trusted institutional channels (NASA, NASA Live) for currently-broadcasting live streams. Title and description content is then filtered through include/exclude regex patterns to surface only orbital-camera streams (ISS Earth views, on-orbit hardware) and reject ground-based mission broadcasts (launches, press conferences, mission control)." },
  { title: "Availability Probing", text: "Every discovered feed's primary URL is probed with a HEAD request before being exposed in the registry. HEAD failures fall back to a ranged GET. Feeds that fail both probes are placed in the unavailable list with their failure reason recorded. This prevents the UI from displaying broken thumbnails or hanging loaders." },
  { title: "NORAD Cross-Reference", text: "A static seed catalog of known operational satellites (ISS, DSCOVR, SDO, SOHO, GOES, Himawari, Terra, Aqua, Suomi NPP, NOAA-20, NOAA-21, Landsat, GCOM, SMAP, CALIPSO, OCO, Aura, Meteosat) is tokenized into a name-to-NORAD index. Each feed's spacecraft and instrument metadata is scored against this index so dossier views can link out to N2YO and Heavens-Above with correct catalog numbers." },
  { title: "Caching Strategy", text: "The full registry is cached for fifteen minutes and is rebuilt on demand or when the cache expires. Per-source caches have shorter TTLs matched to their refresh cadence: SDO and SOHO at five minutes, Himawari at ten minutes, and GOES directory listings at one hour." }
];

const PROBING_METHODOLOGY = [
  { title: "HEAD Request", text: "The primary URL for this feed was probed with an HTTP HEAD request before being added to the registry. HEAD returns headers only without transferring the body, making the check fast and bandwidth-efficient." },
  { title: "Ranged GET Fallback", text: "If the source rejects HEAD, a ranged GET fetching only the first 1 KB is used as a fallback. This catches sources that return 405 for HEAD but serve content via GET." },
  { title: "Cache TTL", text: "Probe results are cached for 5 minutes to avoid hammering source servers on repeated registry rebuilds. Probes outside that window will re-check the source." },
  { title: "Trusted Sources", text: "Feeds from known-stable institutional sources (NASA GIBS, NOAA STAR, JMA NICT, EUMETSAT, NASA SDO/SOHO) bypass the probe to avoid false negatives from servers that block automated availability checks." }
];

const FeedsModal = ({ title, onClose, children, className, footer }) => {
  useEffect(() => {
    const handleKey = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);
  return createPortal(
    <div className="satModalPortal">
      <div className="satFeedsModalOverlay" onClick={onClose}>
        <div className={`satFeedsModal ${className || ""}`} onClick={(event) => event.stopPropagation()}>
          <div className="satFeedsModalHeader">
            <span>{title}</span>
            <button type="button" className="satFeedsModalClose" onClick={onClose} aria-label="Close">
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
          <div className="satFeedsModalContent">{children}</div>
          {footer && <div className="satOpModalFooter">{footer}</div>}
        </div>
      </div>
    </div>,
    document.body
  );
};

const FeedsHero = ({ title, badges, description }) => (
  <div className="satFeedsCard satFeedsCardHero">
    <h2 className="satFeedsHeroTitle">{title}</h2>
    {badges && badges.length > 0 && (
      <div className="satFeedsHeroBadges">
        {badges.filter(Boolean).map((badge, index) => (
          <span key={index} className="satFeedsBadge" style={badge.color ? { color: badge.color, borderColor: badge.color, background: `${badge.color}26` } : undefined}>
            {badge.icon && <FontAwesomeIcon icon={badge.icon} />}
            {badge.label}
          </span>
        ))}
      </div>
    )}
    {description && <div className="satFeedsHeroDescription">{description}</div>}
  </div>
);

const FeedsTabs = ({ tabs, activeTab, onTabChange }) => (
  <div className="satFeedsTabs">
    {tabs.map(tab => (
      <button
        key={tab.key}
        type="button"
        className={`satFeedsTab ${activeTab === tab.key ? "satFeedsTabActive" : ""}`}
        onClick={() => onTabChange(tab.key)}
      >
        <FontAwesomeIcon icon={tab.icon} /> {tab.label}
      </button>
    ))}
  </div>
);

const FeedsCard = ({ title, icon, children }) => (
  <div className="satFeedsCard">
    <div className="satFeedsCardTitle"><FontAwesomeIcon icon={icon} /> {title}</div>
    {children}
  </div>
);

const FeedsFields = ({ fields }) => (
  <div className="satFeedsFieldGrid">
    {fields.filter(Boolean).map(field => (
      <div key={field.label} className="satFeedsField">
        <span className="satFeedsFieldLabel">{field.label}</span>
        <span className="satFeedsFieldValue" style={field.color ? { color: field.color } : undefined}>{field.value}</span>
        {field.sub && <span className="satFeedsFieldSub">{field.sub}</span>}
      </div>
    ))}
  </div>
);

const FeedsTable = ({ columns, rows, emptyText, widths }) => (
  rows.length === 0 ? (
    <div className="satFeedsEmpty">{emptyText}</div>
  ) : (
    <div className="satFeedsTableScroll">
      <table className="satFeedsTable">
        <thead><tr>{columns.map((column, index) => <th key={index} style={widths ? { width: widths[index] } : undefined}>{column}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
);

const FeedsNotes = ({ items }) => (
  <div className="satFeedsNotes">
    {items.map(item => (
      <div key={item.title} className="satFeedsNote">
        <span className="satFeedsNoteTitle">{item.title}</span>
        <p>{item.text}</p>
      </div>
    ))}
  </div>
);

const FeedsChips = ({ items }) => (
  <div className="satFeedsChips">
    {items.map((item, index) => (<span key={index} className="satFeedsChip">{item}</span>))}
  </div>
);

const shareOf = (count, total) => `${((count / (total || 1)) * 100).toFixed(1)}%`;

const FeedDiagnosticsPanel = ({ metadata, unavailable, onClose }) => {
  const [activeSection, setActiveSection] = useState("overview");
  if (!metadata) return null;
  const total = metadata.totalAvailable || 0;
  const unavailableCount = metadata.totalUnavailable || 0;
  const sections = [
    { key: "overview", label: "Overview", icon: faGauge },
    { key: "categories", label: "Categories", icon: faLayerGroup },
    { key: "operators", label: "Operators", icon: faObjectGroup },
    { key: "unavailable", label: "Unavailable", icon: faXmarkCircle },
    { key: "methodology", label: "Methodology", icon: faBookOpen }
  ];
  const categoryRows = Object.entries(metadata.categoryCounts || {}).sort((a, b) => b[1] - a[1]).map(([category, count]) => [<b key="c">{category}</b>, count, shareOf(count, total)]);
  const typeRows = Object.entries(metadata.feedTypeCounts || {}).sort((a, b) => b[1] - a[1]).map(([type, count]) => [<b key="t">{titleCaseWords(type)}</b>, count, shareOf(count, total)]);
  const operatorRows = Object.entries(metadata.operatorCounts || {}).sort((a, b) => b[1] - a[1]).map(([operator, count]) => [<b key="o">{operator}</b>, count, shareOf(count, total)]);
  const unavailableRows = (unavailable || []).map(feed => [<code key="id">{feed.id}</code>, feed.name, feed.category, <span key="reason" className="satFeedsCritical">{feed.reason}</span>]);

  return (
    <FeedsModal
      title="Feed Registry Diagnostics"
      onClose={onClose}
      className="satOpModal"
      footer={<span className="satOpModalFooterInfo">{`${total} Available | ${unavailableCount} Unavailable | ${Object.keys(metadata.operatorCounts || {}).length} Operators${metadata.builtAt ? ` | Built ${formatRelativeTime(metadata.builtAt)}` : ""}`}</span>}
    >
      <FeedsTabs tabs={sections} activeTab={activeSection} onTabChange={setActiveSection} />
      <div className="satOpNote">{`The registry lists ${total} available feeds out of ${metadata.totalCandidates || 0} discovered candidates, and was built in ${metadata.buildTimeMs ? Math.round(metadata.buildTimeMs / 1000) : 0} seconds.`}</div>
      {activeSection === "overview" && (
        <>
          <FeedsCard title="Registry" icon={faGauge}>
            <FeedsFields fields={[
              { label: "Total Available", value: total, sub: `Of ${metadata.totalCandidates || 0} Candidates`, color: "#4ecdc4" },
              { label: "Unavailable", value: unavailableCount, sub: "Failed Availability Probe", color: unavailableCount > 0 ? "#ff6b6b" : undefined },
              { label: "Catalog Size", value: metadata.catalogSize || 0, sub: "NORAD Seeds Loaded" },
              { label: "Build Time", value: metadata.buildTimeMs ? `${Math.round(metadata.buildTimeMs / 1000)} s` : "—", sub: "Discovery and Probing" },
              { label: "Built", value: metadata.builtAt ? formatRelativeTime(metadata.builtAt) : "—", sub: metadata.builtAt ? formatAbsoluteTime(metadata.builtAt) : null }
            ]} />
          </FeedsCard>
          <FeedsCard title="Discovered Products" icon={faSatelliteDish}>
            <FeedsFields fields={[
              { label: "GIBS Layers", value: metadata.gibsLayerCount || 0, sub: "WMTS Capabilities" },
              { label: "SDO Wavelengths", value: metadata.sdoWavelengthCount || 0, sub: "Latest-Image Directory" },
              { label: "SOHO Products", value: metadata.sohoProductCount || 0, sub: "Realtime Directory" },
              { label: "GOES-East Products", value: metadata.goesEastProductCount || 0, sub: "STAR Directory" },
              { label: "GOES-West Products", value: metadata.goesWestProductCount || 0, sub: "STAR Directory" },
              { label: "YouTube Live", value: metadata.youtubeLiveStreamCount || 0, sub: "Trusted Channels" }
            ]} />
          </FeedsCard>
        </>
      )}
      {activeSection === "categories" && (
        <>
          <FeedsCard title="Available Feeds by Category" icon={faLayerGroup}>
            <FeedsTable columns={["Category", "Count", "Share"]} rows={categoryRows} emptyText="No categories have been discovered yet." />
          </FeedsCard>
          <FeedsCard title="Feed Type Distribution" icon={faChartLine}>
            <FeedsTable columns={["Feed Type", "Count", "Share"]} rows={typeRows} emptyText="No feed types have been discovered yet." />
          </FeedsCard>
        </>
      )}
      {activeSection === "operators" && (
        <FeedsCard title={`Discovered Operators (${operatorRows.length})`} icon={faObjectGroup}>
          <FeedsTable columns={["Operator", "Feeds", "Share"]} rows={operatorRows} emptyText="No operators have been discovered yet." />
        </FeedsCard>
      )}
      {activeSection === "unavailable" && (
        <FeedsCard title={`Failing Availability Probe (${unavailableRows.length})`} icon={faXmarkCircle}>
          <FeedsTable columns={["Feed ID", "Name", "Category", "Reason"]} rows={unavailableRows} emptyText="There are no unavailable feeds, because every discovered feed passed the availability probe." />
        </FeedsCard>
      )}
      {activeSection === "methodology" && (
        <FeedsCard title="Discovery Methodology" icon={faBookOpen}>
          <FeedsNotes items={DISCOVERY_METHODOLOGY} />
        </FeedsCard>
      )}
    </FeedsModal>
  );
};

const useHarvestTimeline = (feed, subscribe) => {
  const historyRef = useRef(null);
  const [backfilling, setBackfilling] = useState(null);
  const productKey = feed?.harvest && feed.feedType !== "video" ? feed.harvest.productKey : null;
  const feedId = feed?.id || null;
  const [rangeKey, setRangeKey] = useState("24h");
  const [anchor, setAnchor] = useState(null);
  const [frames, setFrames] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [fps, setFps] = useState(6);
  const [pinned, setPinned] = useState(null);
  const [split, setSplit] = useState(50);
  const requestRef = useRef(0);
  const autoWidenRef = useRef(true);
  const followingRef = useRef(true);
  const frameIdRef = useRef(null);
  const preloadRef = useRef(new Map());

  const following = anchor === null && frames.length > 0 && index === frames.length - 1;
  followingRef.current = anchor === null && (frames.length === 0 || index === frames.length - 1);
  frameIdRef.current = frames[index]?.frameId || null;

  const liveOnOpen = Boolean(feed?.isLive && feed?.harvest && feed.feedType === "timeline");
  const liveLoopRef = useRef(false);

  useEffect(() => {
    setRangeKey(liveOnOpen ? HARVEST_LIVE_LOOP.rangeKey : "24h");
    setAnchor(null);
    setSplit(50);
    setFps(liveOnOpen ? HARVEST_LIVE_LOOP.fps : 6);
    liveLoopRef.current = liveOnOpen;
    autoWidenRef.current = true;
  }, [feedId]);

  useEffect(() => {
    setFrames([]);
    setIndex(0);
    setError(null);
    setPlaying(false);
    setPinned(null);
    preloadRef.current = new Map();
  }, [productKey]);

  const load = useCallback(async (mode) => {
    if (!productKey) return;
    const request = ++requestRef.current;
    const range = HARVEST_RANGE_OPTIONS.find(([key]) => key === rangeKey) || HARVEST_RANGE_OPTIONS[2];
    const to = anchor ? new Date(anchor) : new Date();
    const from = new Date(to.getTime() - range[2] * 1000);
    const step = range[2] > 86400 ? Math.ceil(range[2] / HARVEST_TARGET_FRAMES) : 0;
    const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString(), limit: String(HARVEST_TARGET_FRAMES), step: String(step) });
    if (mode !== "silent") setLoading(true);
    let widened = false;
    try {
      const response = await fetch(`${HARVEST_BASE_URL}/products/${encodeURIComponent(productKey)}/frames?${params.toString()}`);
      const data = await response.json().catch(() => ({}));
      if (request !== requestRef.current) return;
      if (!response.ok || !data.success) throw new Error(data.message || `The frames request failed with status ${response.status}.`);
      const next = data.frames || [];
      if (next.length < 2 && autoWidenRef.current && !anchor) {
        const position = HARVEST_RANGE_OPTIONS.findIndex(([key]) => key === range[0]);
        if (position < HARVEST_RANGE_OPTIONS.length - 1) {
          widened = true;
          setRangeKey(HARVEST_RANGE_OPTIONS[position + 1][0]);
          return;
        }
      }
      autoWidenRef.current = false;
      if (next.length < 5 && feed?.harvest?.history && from.getTime() < Date.now() - 48 * 3600000) {
        const historyKey = `${productKey}:${range[0]}:${anchor || ""}`;
        if (historyRef.current !== historyKey) {
          historyRef.current = historyKey;
          fetch(`${HARVEST_BASE_URL}/products/${encodeURIComponent(productKey)}/history`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ from: from.toISOString(), to: to.toISOString(), auto: true })
          }).then((historyResponse) => historyResponse.json()).then((data) => {
            if (request === requestRef.current) setBackfilling(data.queued ? "queued" : "recent");
          }).catch(() => null);
        }
      } else if (next.length >= 5) {
        setBackfilling(null);
      }
      setFrames(next);
      setIndex((previous) => {
        if (mode === "reset" || followingRef.current) return Math.max(0, next.length - 1);
        const found = next.findIndex((frame) => frame.frameId === frameIdRef.current);
        return found >= 0 ? found : Math.min(previous, Math.max(0, next.length - 1));
      });
      setError(null);
      if (liveLoopRef.current) {
        liveLoopRef.current = false;
        if (next.length >= HARVEST_LIVE_LOOP.minFrames) setPlaying(true);
      }
    } catch (loadError) {
      if (request === requestRef.current) setError(`The frames could not be loaded because of the error "${errorText(loadError)}".`);
    } finally {
      if (request === requestRef.current && !widened) setLoading(false);
    }
  }, [productKey, rangeKey, anchor]);

  useEffect(() => {
    load("reset");
  }, [load]);

  useEffect(() => {
    if (!productKey || anchor) return undefined;
    const timer = setInterval(() => load("silent"), PERFORMANCE_CONSTANTS.HARVEST_FRAMES_REFRESH_MS);
    return () => clearInterval(timer);
  }, [productKey, anchor, load]);

  useEffect(() => {
    if (!productKey || anchor || !subscribe) return undefined;
    return subscribe((event) => {
      if (event.productKey === productKey) load("silent");
    });
  }, [productKey, anchor, subscribe, load]);

  useEffect(() => {
    if (!frames.length) return;
    const wanted = new Set();
    const ahead = playing ? 12 : 3;
    for (let offset = -1; offset <= ahead; offset += 1) {
      const url = harvestFrameImageUrl(frames[(index + offset + frames.length) % frames.length]);
      if (url) wanted.add(url);
    }
    for (const url of wanted) {
      if (preloadRef.current.has(url)) continue;
      const image = new Image();
      image.decoding = "async";
      image.src = url;
      preloadRef.current.set(url, image);
    }
    if (preloadRef.current.size > 48) {
      for (const url of Array.from(preloadRef.current.keys())) {
        if (preloadRef.current.size <= 48) break;
        if (!wanted.has(url)) preloadRef.current.delete(url);
      }
    }
  }, [frames, index, playing]);

  useEffect(() => {
    if (!playing || frames.length < 2) return undefined;
    const timer = setInterval(() => {
      setIndex((current) => {
        const next = current >= frames.length - 1 ? 0 : current + 1;
        const image = preloadRef.current.get(harvestFrameImageUrl(frames[next]));
        if (image && !image.complete) return current;
        return next;
      });
    }, Math.round(1000 / fps));
    return () => clearInterval(timer);
  }, [playing, fps, frames]);

  const step = useCallback((delta) => {
    setPlaying(false);
    setIndex((current) => Math.max(0, Math.min(frames.length - 1, current + delta)));
  }, [frames.length]);

  const seek = useCallback((position) => {
    setPlaying(false);
    setIndex(Math.max(0, Math.min(frames.length - 1, position)));
  }, [frames.length]);

  const goLive = useCallback(() => {
    setPlaying(false);
    if (anchor) {
      setAnchor(null);
      return;
    }
    setIndex(Math.max(0, frames.length - 1));
    load("silent");
  }, [anchor, frames.length, load]);

  const chooseRange = useCallback((key) => {
    autoWidenRef.current = false;
    setPlaying(false);
    setRangeKey(key);
  }, []);

  const chooseAnchor = useCallback((value) => {
    autoWidenRef.current = false;
    setPlaying(false);
    setAnchor(value);
  }, []);

  const togglePin = useCallback(() => {
    setPinned((current) => (current ? null : frames[index] || null));
  }, [frames, index]);

  return {
    active: Boolean(productKey),
    productKey,
    backfilling,
    rangeKey,
    anchor,
    frames,
    index,
    frame: frames[index] || null,
    loading,
    error,
    playing,
    fps,
    pinned,
    split,
    following,
    setFps,
    setSplit,
    setPlaying,
    step,
    seek,
    goLive,
    chooseRange,
    chooseAnchor,
    togglePin,
    reload: () => load("silent")
  };
};

const HarvestStage = ({ feed, timeline, filterStyle, transformStyle }) => {
  const [imageStatus, setImageStatus] = useState({ url: null, state: "idle" });
  const frame = timeline.frame;
  const metadata = feed.harvest.metadata || {};
  const imageUrl = harvestFrameImageUrl(frame) || (!timeline.frames.length ? metadata.snapshot || null : null);

  useEffect(() => {
    setImageStatus({ url: imageUrl, state: imageUrl ? "loading" : "idle" });
  }, [imageUrl]);

  if (feed.feedType === "raw") {
    const rows = timeline.frames.slice().reverse();
    return (
      <div className="satFeedViewerTelemetry">
        <div className="satPanelCard">
          <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faDatabase} /> Raw Files ({rows.length})</span></div>
          <div className="satPanelCardBody">
            {rows.length === 0 ? (
              <div className="satFeedsEmpty">{timeline.loading ? "Loading Files" : "No files were recorded in this window."}</div>
            ) : (
              <div className="satTableScroll">
                <AdaptiveTable>
                  <thead><tr><th>Observed</th><th>File</th><th>Size</th><th>Storage</th><th /></tr></thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.frameId}>
                        <td>{formatAbsoluteTime(row.observedAt)}</td>
                        <td className="satHarvestFileName">{row.originUrl ? row.originUrl.split("/").pop() : row.frameId}</td>
                        <td>{row.byteSize ? formatBytes(row.byteSize) : "—"}</td>
                        <td>{row.stored ? "Archived" : "Origin"}</td>
                        <td>{row.originUrl && <a className="satHarvestFileLink" href={row.originUrl} target="_blank" rel="noopener noreferrer">Open</a>}</td>
                      </tr>
                    ))}
                  </tbody>
                </AdaptiveTable>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (frame?.metadata?.videoId) {
    return (
      <iframe
        key={frame.metadata.videoId}
        src={`https://www.youtube.com/embed/${frame.metadata.videoId}`}
        title={frame.metadata.title || feed.name}
        className="satFeedViewerIframe"
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  const pinnedUrl = timeline.pinned ? harvestFrameImageUrl(timeline.pinned) : null;
  const showLoading = imageStatus.state === "loading" && !timeline.playing;

  return (
    <>
      {(timeline.loading || showLoading) && !timeline.error && (
        <div className="satFeedViewerLoadingOverlay">
          <div className="loading-circle" />
        </div>
      )}
      {timeline.error && (
        <div className="satFeedViewerErrorOverlay">
          <div className="satFeedViewerErrorContent">
            <FontAwesomeIcon icon={faTriangleExclamation} className="satFeedViewerErrorIcon" />
            <p>The timeline is unavailable.</p>
            <small>{timeline.error}</small>
            <button className="satFeedViewerRetryLink" onClick={timeline.reload}>Retry</button>
          </div>
        </div>
      )}
      {!timeline.error && !timeline.loading && !imageUrl && (
        <div className="satFeedViewerErrorOverlay">
          <div className="satFeedViewerErrorContent">
            <FontAwesomeIcon icon={faClockRotateLeft} className="satFeedViewerErrorIcon" />
            <p>No frames were recorded in this window.</p>
            <small>Choose a longer range or an earlier date to look further back.</small>
          </div>
        </div>
      )}
      {!timeline.error && imageStatus.state === "error" && (
        <div className="satFeedViewerErrorOverlay">
          <div className="satFeedViewerErrorContent">
            <FontAwesomeIcon icon={faTriangleExclamation} className="satFeedViewerErrorIcon" />
            <p>The frame is unavailable.</p>
            <small>This frame could not be loaded from the archive or its origin.</small>
            <button className="satFeedViewerRetryLink" onClick={timeline.reload}>Retry</button>
          </div>
        </div>
      )}
      {imageUrl && (
        <div className="satHarvestLayers" style={transformStyle}>
          <img
            src={imageUrl}
            alt={feed.name}
            className="satHarvestFrame"
            style={{ ...filterStyle, opacity: imageStatus.state === "error" ? 0 : 1 }}
            draggable={false}
            onLoad={() => setImageStatus({ url: imageUrl, state: "loaded" })}
            onError={() => setImageStatus({ url: imageUrl, state: "error" })}
          />
          {pinnedUrl && (
            <>
              <img
                src={pinnedUrl}
                alt={`${feed.name} Pinned Frame`}
                className="satHarvestFrame satHarvestFramePinned"
                style={{ ...filterStyle, clipPath: `inset(0 ${100 - timeline.split}% 0 0)` }}
                draggable={false}
              />
              <div className="satHarvestSplitLine" style={{ left: `${timeline.split}%` }} />
            </>
          )}
        </div>
      )}
      {pinnedUrl && (
        <div className="satHarvestCompareLabels">
          <span>Pinned {formatAbsoluteTime(timeline.pinned.observedAt)}</span>
          <span>Current {formatAbsoluteTime(frame?.observedAt)}</span>
        </div>
      )}
    </>
  );
};

const HarvestMenuBar = ({ feed, timeline, channels, onChannelChange }) => {
  const isRaw = feed.feedType === "raw";
  const hasChannels = Boolean(channels && channels.length > 1);

  const exportWindow = () => {
    const range = HARVEST_RANGE_OPTIONS.find(([key]) => key === timeline.rangeKey) || HARVEST_RANGE_OPTIONS[2];
    const to = timeline.anchor ? new Date(timeline.anchor) : new Date();
    const from = new Date(to.getTime() - range[2] * 1000);
    return { from, to };
  };

  const startExport = (format) => {
    if (!format) return;
    const { from, to } = exportWindow();
    const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString(), format });
    window.open(`${HARVEST_BASE_URL}/products/${encodeURIComponent(feed.harvest.productKey)}/export?${params.toString()}`, "_blank", "noopener");
  };
  if (!hasChannels && isRaw) return null;

  return (
    <div className="satHarvestMenuBar">
      {hasChannels && (
        <div className="satHarvestBarDropdown satHarvestBarChannel">
          <Dropdown
            value={(channels.find((channel) => channel.productKey === feed.harvest.productKey) || channels[0]).name}
            onChange={(option) => { const channel = channels.find((entry) => entry.name === option); if (channel) onChannelChange(channel.productKey); }}
            options={channels.map((channel) => channel.name)}
            placeholder="Channel"
          />
        </div>
      )}
      {!isRaw && (
        <div className="satHarvestBarDropdown satHarvestBarExport">
          <Dropdown
            value=""
            onChange={(option) => startExport(option === "Frame List CSV" ? "csv" : option === "Frame List JSON" ? "json" : option === "Archived Images ZIP" ? "zip" : "")}
            options={["Frame List CSV", "Frame List JSON", "Archived Images ZIP"]}
            placeholder="Export"
          />
        </div>
      )}
    </div>
  );
};

const HarvestTimelineBar = ({ feed, timeline }) => {
  const count = timeline.frames.length;
  const frame = timeline.frame;
  const isRaw = feed.feedType === "raw";
  const isVideo = Boolean(frame?.metadata?.videoId);
  const downloadUrl = harvestFrameImageUrl(frame);

  return (
    <div className="satHarvestTimelineBar">
      <div className="satHarvestBarRow">
        <div className="satHarvestBarGroup">
          <button className="satSceneToolbarButton" onClick={() => timeline.step(-1)} disabled={isRaw || timeline.index <= 0} title="Previous Frame">
            <FontAwesomeIcon icon={faBackwardStep} />
          </button>
          <button className={`satSceneToolbarButton ${timeline.playing ? "satSceneToolbarButtonActive" : ""}`} onClick={() => timeline.setPlaying(!timeline.playing)} disabled={isRaw || isVideo || count < 2} title={timeline.playing ? "Pause Loop" : "Play Loop"}>
            <FontAwesomeIcon icon={timeline.playing ? faPause : faPlay} />
          </button>
          <button className="satSceneToolbarButton" onClick={() => timeline.step(1)} disabled={isRaw || timeline.index >= count - 1} title="Next Frame">
            <FontAwesomeIcon icon={faForwardStep} />
          </button>
          <button className={`satSceneToolbarButton ${timeline.following ? "satSceneToolbarButtonActive" : ""}`} onClick={timeline.goLive} title="Jump To Latest">
            <FontAwesomeIcon icon={faTowerBroadcast} />
          </button>
        </div>

        <div className="satHarvestBarGroup satHarvestBarGrow">
          <input
            type="range"
            className="satHarvestScrubber"
            min={0}
            max={Math.max(0, count - 1)}
            value={Math.min(timeline.index, Math.max(0, count - 1))}
            onChange={(event) => timeline.seek(Number(event.target.value))}
            disabled={isRaw || count < 2}
            aria-label="Timeline Position"
          />
          <span className="satHarvestBarCount">{count ? `${timeline.index + 1} / ${count}` : "0 / 0"}</span>
        </div>

        <div className="satHarvestBarGroup">
          <label className="satSceneToolbarSlider" title="Loop Speed">
            <FontAwesomeIcon icon={faClock} />
            <input type="range" min={1} max={24} value={timeline.fps} onChange={(event) => timeline.setFps(Number(event.target.value))} disabled={isRaw || isVideo} />
            <span>{timeline.fps} FPS</span>
          </label>
        </div>
      </div>

      <div className="satHarvestBarRow">
        <div className="satHarvestBarGroup">
          {HARVEST_RANGE_OPTIONS.map(([key, label]) => (
            <button key={key} className={`satSceneToolbarButton satHarvestRangeButton ${timeline.rangeKey === key ? "satSceneToolbarButtonActive" : ""}`} onClick={() => timeline.chooseRange(key)} title={`Show ${label}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="satHarvestBarGroup">
          <FontAwesomeIcon icon={faCalendarDays} className="satHarvestDateIcon" />
          <input
            type="datetime-local"
            className="satHarvestDateInput"
            value={timeline.anchor ? toLocalInputValue(timeline.anchor) : ""}
            max={toLocalInputValue(new Date())}
            onChange={(event) => timeline.chooseAnchor(event.target.value ? new Date(event.target.value).toISOString() : null)}
            aria-label="Timeline End"
          />
          {!isRaw && !isVideo && (
            <button className={`satSceneToolbarButton ${timeline.pinned ? "satSceneToolbarButtonActive" : ""}`} onClick={timeline.togglePin} disabled={!frame} title={timeline.pinned ? "Stop Comparing" : "Pin Frame To Compare"}>
              <FontAwesomeIcon icon={faThumbtack} />
            </button>
          )}
          {timeline.pinned && (
            <label className="satSceneToolbarSlider" title="Compare Split">
              <FontAwesomeIcon icon={faTableColumns} />
              <input type="range" min={0} max={100} value={timeline.split} onChange={(event) => timeline.setSplit(Number(event.target.value))} />
              <span>{timeline.split}%</span>
            </label>
          )}
        </div>

        <div className="satHarvestBarGroup satHarvestBarGrow satHarvestBarEnd">
          {timeline.backfilling && count < 5 && (
            <span className="satHarvestBackfillNote">{timeline.backfilling === "queued" ? "Requesting Historical Backfill" : "Backfill Already Requested"}</span>
          )}
          {frame && harvestInDarkness(feed, frame.observedAt) && (
            <span className="satHarvestBackfillNote">Visible Channel In Darkness</span>
          )}
          {frame && !isRaw && (
            <>
              <span className="satHarvestBarTime">{isVideo && frame.metadata.title ? frame.metadata.title : formatAbsoluteTime(frame.observedAt)}</span>
              <span className={`satHarvestFrameBadge ${frame.stored ? "satHarvestFrameBadgeStored" : ""}`}>{frame.stored ? "Archived" : "Origin"}</span>
              {downloadUrl && (
                <a className="satSceneToolbarButton" href={downloadUrl} target="_blank" rel="noopener noreferrer" download title="Download Frame">
                  <FontAwesomeIcon icon={faDownload} />
                </a>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
};

const leadEvidence = (lead) => {
  const evidence = lead.evidence || {};
  if (evidence.wwwAuthenticate) return `The host answered ${evidence.status} and asked for ${evidence.wwwAuthenticate.split(/\s+/)[0]} credentials.`;
  if (evidence.status) return `The host answered ${evidence.status} without saying which credentials it wants.`;
  if (evidence.excerpt) return `“${evidence.excerpt.slice(0, 220)}${evidence.excerpt.length > 220 ? "…" : ""}”`;
  if (evidence.linkedFrom) return `Linked from ${evidence.linkedFrom}${evidence.text ? ` as “${evidence.text}”` : ""}.`;
  return "—";
};

const LeadsModal = ({ onClose, onChanged }) => {
  const [status, setStatus] = useState("new");
  const [kind, setKind] = useState("");
  const [text, setText] = useState("");
  const [leads, setLeads] = useState([]);
  const [counts, setCounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status, limit: "300" });
      if (kind) params.set("kind", kind);
      const response = await fetch(`${HARVEST_BASE_URL}/leads?${params.toString()}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.message || `The leads request failed with status ${response.status}.`);
      setLeads(data.leads || []);
      setCounts(data.counts || []);
      setError(null);
    } catch (loadError) {
      setError(`The leads could not be loaded because of the error "${errorText(loadError)}".`);
    } finally {
      setLoading(false);
    }
  }, [status, kind]);

  useEffect(() => {
    load();
  }, [load]);

  const update = async (lead, nextStatus) => {
    setBusyId(lead.leadId);
    try {
      const response = await fetch(`${HARVEST_BASE_URL}/leads/${lead.leadId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.message || `The update failed with status ${response.status}.`);
      setLeads(prev => (status === "all" ? prev.map(item => (item.leadId === lead.leadId ? { ...item, status: nextStatus } : item)) : prev.filter(item => item.leadId !== lead.leadId)));
      setCounts(prev => prev.map(row => (row.kind === lead.kind && row.status === lead.status ? { ...row, total: row.total - 1 } : row)).concat([{ status: nextStatus, kind: lead.kind, total: 1 }]));
      setNotice(null);
      if (onChanged) onChanged();
    } catch (updateError) {
      setNotice(`The lead could not be updated because of the error "${errorText(updateError)}".`);
    } finally {
      setBusyId(null);
    }
  };

  const exportLeads = async (format) => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ status, limit: "500" });
      if (kind) params.set("kind", kind);
      const response = await fetch(`${HARVEST_BASE_URL}/leads?${params.toString()}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.message || `The export request failed with status ${response.status}.`);
      const rows = data.leads || [];
      let body;
      let type;
      if (format === "json") {
        body = JSON.stringify({ exportedAt: new Date().toISOString(), status, kind: kind || "all", leads: rows }, null, 2);
        type = "application/json";
      } else {
        body = "LeadId,Status,Kind,Title,Host,Url,Hits,Evidence,Note,Source,Domain,FirstSeen,LastSeen\n";
        rows.forEach(lead => {
          body += `${csvQuote(lead.leadId)},${csvQuote(lead.status)},${csvQuote(lead.kind)},${csvQuote(lead.title)},${csvQuote(lead.host)},${csvQuote(lead.url)},${lead.hits},${csvQuote(leadEvidence(lead))},${csvQuote(lead.note || "")},${csvQuote(lead.source_key)},${csvQuote(lead.domain)},${csvQuote(lead.first_seen_at)},${csvQuote(lead.last_seen_at)}\n`;
        });
        type = "text/csv";
      }
      const blob = new Blob([body], { type });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `source_leads_${status}${kind ? `_${kind}` : ""}.${format}`;
      anchor.click();
      URL.revokeObjectURL(url);
      setNotice(null);
    } catch (exportError) {
      setNotice(`The leads could not be exported because of the error "${errorText(exportError)}".`);
    } finally {
      setExporting(false);
    }
  };

  const totalFor = (statusKey, kindKey) => counts.filter(row => (statusKey === "all" || row.status === statusKey) && (!kindKey || row.kind === kindKey)).reduce((sum, row) => sum + row.total, 0);
  const tabs = LEAD_STATUS_TABS.map(([key, label]) => ({ key, label: `${label} (${totalFor(key, kind)})`, icon: key === "new" ? faLightbulb : key === "adopted" ? faCheck : key === "dismissed" ? faBan : key === "reviewing" ? faEye : faLayerGroup }));
  const kindOptions = [["", "All Kinds"]].concat(Object.entries(LEAD_KINDS).map(([key, meta]) => [key, `${meta.label} (${totalFor(status, key)})`]));
  const kindLabel = (kindOptions.find(([value]) => value === kind) || kindOptions[0])[1];
  const needle = text.trim().toLowerCase();
  const visible = needle ? leads.filter(lead => [lead.host, lead.title, lead.url, leadEvidence(lead)].some(value => value && String(value).toLowerCase().includes(needle))) : leads;
  const chips = [
    kind ? { key: "kind", label: (LEAD_KINDS[kind] || { label: titleCaseWords(kind) }).label, clear: () => setKind("") } : null,
    needle ? { key: "text", label: `Text: ${text.trim()}`, clear: () => setText("") } : null
  ].filter(Boolean);

  const rows = visible.map((lead) => {
    const meta = LEAD_KINDS[lead.kind] || { label: titleCaseWords(lead.kind), color: "#cdd4e4" };
    return [
      <div className="satOpResultCell">
        <span className="satOpResultPrimary" title={lead.host || lead.title}>{lead.host || lead.title}</span>
        <a className="satOpResultSecondary satOpResultLink" href={lead.url} target="_blank" rel="noopener noreferrer" title={lead.url}>{lead.url}</a>
        <span className="satOpResultSecondary satOpResultClamp" title={leadEvidence(lead)}>{leadEvidence(lead)}</span>
      </div>,
      <span className="satLeadKind" style={{ color: meta.color, borderColor: meta.color }}>{meta.label}</span>,
      <span className="satOpResultPlain">{lead.hits}</span>,
      <span className="satOpResultPlain" title={formatAbsoluteTime(lead.last_seen_at)}>{formatRelativeTime(lead.last_seen_at)}</span>,
      <div className="satLeadActions">
        {lead.status !== "reviewing" && <button className="satLeadAction" disabled={busyId === lead.leadId} onClick={() => update(lead, "reviewing")} title="Mark As Reviewing"><FontAwesomeIcon icon={faEye} /></button>}
        {lead.status !== "adopted" && <button className="satLeadAction satLeadActionAdopt" disabled={busyId === lead.leadId} onClick={() => update(lead, "adopted")} title="Mark As Adopted"><FontAwesomeIcon icon={faCheck} /></button>}
        {lead.status !== "dismissed" && <button className="satLeadAction satLeadActionDismiss" disabled={busyId === lead.leadId} onClick={() => update(lead, "dismissed")} title="Dismiss"><FontAwesomeIcon icon={faBan} /></button>}
      </div>
    ];
  });

  const footer = (
    <>
      <span className="satOpModalFooterInfo">{needle ? `${visible.length.toLocaleString()} Matches In The Top ${leads.length.toLocaleString()} Of ${totalFor(status, kind).toLocaleString()} Leads` : `${leads.length.toLocaleString()} Of ${totalFor(status, kind).toLocaleString()} Leads Shown`}</span>
      <div className="satOpModalFooterActions">
        <button type="button" className="satLeadFilter" disabled={exporting} onClick={() => exportLeads("csv")} title="Export Leads As CSV"><FontAwesomeIcon icon={faDownload} /> CSV</button>
        <button type="button" className="satLeadFilter" disabled={exporting} onClick={() => exportLeads("json")} title="Export Leads As JSON"><FontAwesomeIcon icon={faDownload} /> JSON</button>
      </div>
    </>
  );

  return (
    <FeedsModal title="Source Leads" onClose={onClose} className="satOpModal satOpLeadsModal" footer={footer}>
      <div className="satOpToolbar">
        <div className="satOpSearchBar">
          <FontAwesomeIcon icon={faMagnifyingGlass} className="satOpSearchBarIcon" />
          <input type="text" className="satOpInput" placeholder="Host, URL, Or Evidence" value={text} onChange={(event) => setText(event.target.value)} />
        </div>
        <div className="satOpToolbarField">
          <Dropdown value={kindLabel} onChange={(option) => setKind((kindOptions.find(([, label]) => label === option) || kindOptions[0])[0])} options={kindOptions.map(([, label]) => label)} placeholder="Kind" />
        </div>
      </div>
      {chips.length > 0 && (
        <div className="satOpChipRow">
          {chips.map((chip) => (
            <button key={chip.key} type="button" className="satOpChip" onClick={chip.clear} title={`Remove ${chip.label}`}>
              <span>{chip.label}</span>
              <FontAwesomeIcon icon={faXmark} />
            </button>
          ))}
        </div>
      )}
      <FeedsTabs tabs={tabs} activeTab={status} onTabChange={setStatus} />
      <div className="satOpNote">The harvester flags sources it found but cannot collect on its own, such as hosts that require credentials, API documentation, and data catalogs on unlisted domains.</div>
      {notice && <div className="satLeadNotice">{notice}</div>}
      {error ? (
        <div className="satFeedsEmpty satFeedsError">{error}</div>
      ) : loading && leads.length === 0 ? (
        <div className="satFeedsEmpty">Loading Leads</div>
      ) : (
        <FeedsTable columns={["Lead", "Kind", "Hits", "Last Seen", ""]} widths={["auto", "124px", "56px", "88px", "140px"]} rows={rows} emptyText={needle ? "No leads match that text." : "No leads match this filter."} />
      )}
    </FeedsModal>
  );
};

const FeedViewer = ({ feed, autoRefresh, onAutoRefreshToggle, onClose, onOpenDossier, onHarvestSubscribe }) => {
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const refreshTimeoutRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [brightness, setBrightness] = useState(1);
  const [contrast, setContrast] = useState(1);
  const [saturation, setSaturation] = useState(1);
  const [invert, setInvert] = useState(false);
  const [imageVersion, setImageVersion] = useState(0);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date().toISOString());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sequenceIndex, setSequenceIndex] = useState(0);
  const [issTelemetry, setIssTelemetry] = useState(null);
  const [issTelemetryError, setIssTelemetryError] = useState(null);
  const [isDraggingViewer, setIsDraggingViewer] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const harvestChannels = feed?.harvest?.channels || null;
  const [channelKey, setChannelKey] = useState(null);
  const activeChannel = harvestChannels ? harvestChannels.find(channel => channel.productKey === channelKey) || harvestChannels.find(channel => channel.productKey === feed.harvest.productKey) || harvestChannels[0] : null;
  const timelineFeed = useMemo(() => (activeChannel ? { ...feed, harvest: activeChannel } : feed), [feed, activeChannel]);
  const timeline = useHarvestTimeline(timelineFeed, onHarvestSubscribe);

  useEffect(() => {
    setChannelKey(null);
  }, [feed?.id]);
  const timelineStep = timeline.step;
  const timelineSetPlaying = timeline.setPlaying;
  const timelinePlaying = timeline.playing;
  const timelineActive = timeline.active;

  useEffect(() => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
    setRotation(0);
    setBrightness(1);
    setContrast(1);
    setSaturation(1);
    setInvert(false);
    setImageVersion(0);
    setImageLoading(true);
    setImageError(false);
    setSequenceIndex(0);
    setIssTelemetry(null);
    setIssTelemetryError(null);
    setLastRefreshed(new Date().toISOString());
  }, [feed?.id]);

  useEffect(() => {
    if (feed?.feedType === "image-sequence" && feed?.images?.length > 0) {
      setSequenceIndex(feed.images.length - 1);
    }
  }, [feed?.id, feed?.feedType, feed?.images?.length]);

  useEffect(() => {
    if (!autoRefresh) return;
    if (feed?.feedType !== "image") return;
    const interval = setInterval(() => {
      setImageVersion(v => v + 1);
      setImageLoading(true);
      setImageError(false);
      setRefreshing(true);
      setLastRefreshed(new Date().toISOString());
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = setTimeout(() => setRefreshing(false), 1500);
    }, PERFORMANCE_CONSTANTS.REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [autoRefresh, feed?.id, feed?.feedType]);

  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (feed?.feedType !== "telemetry" || feed?.id !== "iss-position-tracker") return;
    let cancelled = false;
    let eventSource = null;
    let reconnectTimer = null;

    const connect = () => {
      if (cancelled) return;
      try {
        const baseUrl = `${import.meta.env.VITE_API_BASE_URL}/feed-iss-position-stream`;
        eventSource = new EventSource(baseUrl);
        eventSource.addEventListener("position", (event) => {
          try {
            const data = JSON.parse(event.data);
            if (!cancelled) {
              setIssTelemetry(data);
              setIssTelemetryError(null);
              setLastRefreshed(new Date().toISOString());
            }
          } catch (error) {}
        });
        eventSource.addEventListener("error", (event) => {
          if (!cancelled) {
            setIssTelemetryError("The telemetry stream encountered an error.");
          }
        });
        eventSource.onerror = () => {
          if (cancelled) return;
          if (eventSource && eventSource.readyState === EventSource.CLOSED) {
            try { eventSource.close(); } catch (error) {}
            reconnectTimer = setTimeout(connect, PERFORMANCE_CONSTANTS.ISS_STREAM_RECONNECT_MS);
          }
        };
      } catch (error) {
        if (!cancelled) {
          setIssTelemetryError(error.message);
          reconnectTimer = setTimeout(connect, PERFORMANCE_CONSTANTS.ISS_STREAM_RECONNECT_MS);
        }
      }
    };

    connect();
    return () => {
      cancelled = true;
      if (eventSource) {
        try { eventSource.close(); } catch (error) {}
      }
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [feed?.id, feed?.feedType]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const handleManualRefresh = useCallback(() => {
    setImageVersion(v => v + 1);
    setImageLoading(true);
    setImageError(false);
    setRefreshing(true);
    setLastRefreshed(new Date().toISOString());
    if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    refreshTimeoutRef.current = setTimeout(() => setRefreshing(false), 1500);
  }, []);

  const handleZoomChange = useCallback((newZoom) => {
    setZoom(Math.max(0.4, Math.min(6, newZoom)));
  }, []);

  const handleFitToFrame = useCallback(() => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  }, []);

  const handlePan = useCallback((dx, dy) => {
    setPanX(p => p + dx);
    setPanY(p => p + dy);
  }, []);

  const handlePanReset = useCallback(() => {
    setPanX(0);
    setPanY(0);
  }, []);

  const handleRotationChange = useCallback((newRot) => {
    let r = newRot % 360;
    if (r < 0) r += 360;
    setRotation(r);
  }, []);

  const handleRotationReset = useCallback(() => setRotation(0), []);

  const handleFullscreenToggle = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  const handleDownload = useCallback(() => {
    if (!feed) return;
    const url = proxyImageUrl(feed.id);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${feed.id}-${Date.now()}.jpg`;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
  }, [feed]);

  useEffect(() => {
    if (!timelineActive) return undefined;
    const handleKey = (event) => {
      if (event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable='true'], .satFeedsModalOverlay")) return;
      if (event.key === " " && event.target instanceof Element && event.target.closest("button, a")) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        timelineStep(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        timelineStep(1);
      } else if (event.key === " ") {
        event.preventDefault();
        timelineSetPlaying(!timelinePlaying);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [timelineActive, timelineStep, timelineSetPlaying, timelinePlaying]);

  const handleMouseDown = useCallback((e) => {
    if (feed?.feedType === "video" || feed?.feedType === "telemetry" || feed?.feedType === "raw") return;
    if (e.button !== 0) return;
    setIsDraggingViewer(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY, panX, panY };
    e.preventDefault();
  }, [feed?.feedType, panX, panY]);

  useEffect(() => {
    if (!isDraggingViewer) return;
    const handleMove = (e) => {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setPanX(dragStartRef.current.panX + dx);
      setPanY(dragStartRef.current.panY + dy);
    };
    const handleUp = () => setIsDraggingViewer(false);
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
  }, [isDraggingViewer]);

  let currentImageUrl = null;
  if (feed?.feedType === "image") {
    currentImageUrl = proxyImageUrl(feed.id, { version: imageVersion || undefined });
  } else if (feed?.feedType === "image-sequence" && feed.images && feed.images.length > 0) {
    currentImageUrl = proxyImageUrl(feed.id, { frame: sequenceIndex, version: imageVersion || undefined });
  }

  const filterStyle = {
    filter: `brightness(${brightness}) contrast(${contrast}) saturate(${saturation}) invert(${invert ? 1 : 0})`
  };

  const transformStyle = {
    transform: `translate(${panX}px, ${panY}px) scale(${zoom}) rotate(${rotation}deg)`
  };

  return (
    <div ref={containerRef} className="satFeedViewer">
      <div className="satFeedViewerHeader">
        <div className="satFeedViewerHeaderInfo">
          <div className="satFeedViewerHeaderTitle">
            <FontAwesomeIcon icon={FEED_TYPE_ICONS[feed.feedType] || faSatellite} style={{ color: FEED_TYPE_COLORS[feed.feedType] || "#42a5f5" }} />
            <span>{feed.name}</span>
            {feed.isLive && <span className="satFeedLiveBadge">Live</span>}
          </div>
          <div className="satFeedViewerHeaderMeta">
            <span>{feed.spacecraft}</span>
            <span>{feed.instrument}</span>
            <span>{feed.cadenceLabel}</span>
            {feed.coverageRegime && <span>{feed.coverageRegime}</span>}
            {feed.noradId && <span>NORAD {feed.noradId}</span>}
          </div>
        </div>
        <div className="satFeedViewerHeaderActions">
          <button className="satPassComputeButton" onClick={onOpenDossier}>
            <FontAwesomeIcon icon={faInfoCircle} /> Dossier
          </button>
          <button className="satSatelliteCloseButton" onClick={onClose}>
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
      </div>

      {timeline.active && <HarvestMenuBar feed={timelineFeed} timeline={timeline} channels={harvestChannels} onChannelChange={setChannelKey} />}

      <SceneToolbarTop
        zoom={zoom}
        onZoomChange={handleZoomChange}
        onZoomReset={() => setZoom(1)}
        onFitToFrame={handleFitToFrame}
        onPan={handlePan}
        onPanReset={handlePanReset}
        rotation={rotation}
        onRotationChange={handleRotationChange}
        onRotationReset={handleRotationReset}
      />

      <div className="satFeedViewerStage" onMouseDown={handleMouseDown} style={isDraggingViewer ? { cursor: "grabbing" } : undefined}>
        {timeline.active && (
          <HarvestStage feed={timelineFeed} timeline={timeline} filterStyle={filterStyle} transformStyle={transformStyle} />
        )}

        {feed.feedType === "image" && currentImageUrl && (
          <>
            {imageLoading && !imageError && (
              <div className="satFeedViewerLoadingOverlay">
                <div className="loading-circle" />
              </div>
            )}
            {imageError && (
              <div className="satFeedViewerErrorOverlay">
                <div className="satFeedViewerErrorContent">
                  <FontAwesomeIcon icon={faTriangleExclamation} className="satFeedViewerErrorIcon" />
                  <p>The source is unavailable.</p>
                  <small>The upstream server did not return imagery for this feed.</small>
                  <button className="satFeedViewerRetryLink" onClick={handleManualRefresh}>Retry</button>
                </div>
              </div>
            )}
            <img
              ref={imageRef}
              key={`${feed.id}-${imageVersion}`}
              src={currentImageUrl}
              alt={feed.name}
              className="satFeedViewerImage"
              style={{ ...filterStyle, ...transformStyle, opacity: imageError ? 0 : 1 }}
              draggable={false}
              onLoad={() => { setImageLoading(false); setImageError(false); }}
              onError={() => { setImageLoading(false); setImageError(true); }}
            />
          </>
        )}

        {feed.feedType === "image-sequence" && feed.images && feed.images.length > 0 && (
          <>
            {imageLoading && !imageError && (
              <div className="satFeedViewerLoadingOverlay">
                <div className="loading-circle" />
              </div>
            )}
            {imageError && (
              <div className="satFeedViewerErrorOverlay">
                <div className="satFeedViewerErrorContent">
                  <FontAwesomeIcon icon={faTriangleExclamation} className="satFeedViewerErrorIcon" />
                  <p>The frame is unavailable.</p>
                  <small>This frame could not be loaded from the archive.</small>
                  <button className="satFeedViewerRetryLink" onClick={handleManualRefresh}>Retry</button>
                </div>
              </div>
            )}
            <img
              src={currentImageUrl}
              alt={`${feed.name} Frame ${sequenceIndex + 1}`}
              className="satFeedViewerImage"
              style={{ ...filterStyle, ...transformStyle, opacity: imageError ? 0 : 1 }}
              draggable={false}
              onLoad={() => { setImageLoading(false); setImageError(false); }}
              onError={() => { setImageLoading(false); setImageError(true); }}
            />
            <div className="satFeedSequenceControls">
              <button className="satSceneToolbarButton" onClick={() => { setSequenceIndex(i => Math.max(0, i - 1)); setImageLoading(true); setImageError(false); }} disabled={sequenceIndex === 0}>
                <FontAwesomeIcon icon={faArrowLeft} />
              </button>
              <span className="satFeedSequenceLabel">
                Frame {sequenceIndex + 1} / {feed.images.length}
                {feed.images[sequenceIndex]?.date && (<small> · {formatAbsoluteTime(feed.images[sequenceIndex].date)}</small>)}
              </span>
              <button className="satSceneToolbarButton" onClick={() => { setSequenceIndex(i => Math.min(feed.images.length - 1, i + 1)); setImageLoading(true); setImageError(false); }} disabled={sequenceIndex >= feed.images.length - 1}>
                <FontAwesomeIcon icon={faArrowRight} />
              </button>
            </div>
          </>
        )}

        {feed.feedType === "video" && feed.embedUrl && (
          <iframe
            key={`${feed.id}-${imageVersion}`}
            src={feed.embedUrl}
            title={feed.name}
            className="satFeedViewerIframe"
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )}

        {feed.feedType === "video" && !feed.embedUrl && feed.videoUrl && (
          <video
            key={`${feed.id}-${imageVersion}`}
            src={feed.videoUrl}
            poster={feed.posterUrl || feed.thumbnailUrl}
            controls
            autoPlay
            muted
            className="satFeedViewerVideo"
            style={filterStyle}
            onLoadedData={() => { setImageLoading(false); setImageError(false); }}
            onError={() => { setImageLoading(false); setImageError(true); }}
          />
        )}

        {feed.feedType === "telemetry" && feed.id === "iss-position-tracker" && (
          <div className="satFeedViewerTelemetry">
            {!issTelemetry && !issTelemetryError && (
              <div className="satStatusDisplay">
                <div className="loading-circle" />
              </div>
            )}
            {issTelemetryError && (
              <div className="satStatusDisplay satStatusError">
                <FontAwesomeIcon icon={faTriangleExclamation} />
                <p>{issTelemetryError}</p>
              </div>
            )}
            {issTelemetry && issTelemetry.position && (
              <div className="satStatTileGrid">
                <StatTile label="Latitude" value={issTelemetry.position.latitude.toFixed(4)} unit="°" sub={issTelemetry.position.latitude > 0 ? "Northern Hemisphere" : "Southern Hemisphere"} accent="#42a5f5" large />
                <StatTile label="Longitude" value={issTelemetry.position.longitude.toFixed(4)} unit="°" sub={issTelemetry.position.longitude > 0 ? "Eastern Hemisphere" : "Western Hemisphere"} accent="#42a5f5" large />
                <StatTile label="Altitude" value={issTelemetry.position.altitudeKm.toFixed(2)} unit="km" sub="Above WGS-84 Ellipsoid" accent="#4ecdc4" />
                <StatTile label="Velocity" value={issTelemetry.position.velocityKmh.toFixed(0)} unit="km/h" sub={`${(issTelemetry.position.velocityKmh / 3600).toFixed(2)} km/s`} accent="#4ecdc4" />
                <StatTile label="Footprint Radius" value={issTelemetry.position.footprintKm.toFixed(0)} unit="km" sub="Visible from Station" accent="#7fe9e1" />
                <StatTile label="Visibility" value={issTelemetry.position.visibility} sub="Solar Illumination" color={issTelemetry.position.visibility === "daylight" ? "#ffd93d" : "#42a5f5"} accent={issTelemetry.position.visibility === "daylight" ? "#ffd93d" : "#42a5f5"} />
                <StatTile label="Solar Latitude" value={issTelemetry.position.solarLat?.toFixed(2) || "—"} unit="°" sub="Subsolar Point" accent="#ffd93d" />
                <StatTile label="Solar Longitude" value={issTelemetry.position.solarLon?.toFixed(2) || "—"} unit="°" sub="Subsolar Point" accent="#ffd93d" />
                <StatTile label="Total in Space" value={issTelemetry.totalInSpace || "—"} sub="All Spacecraft" accent="#FF9500" />
                <StatTile label="ISS Crew" value={issTelemetry.crew?.length || 0} sub="Aboard the Station" accent="#ff6b6b" />
                <StatTile label="Day Number" value={issTelemetry.position.dayNum?.toFixed(2) || "—"} sub="MJD-Relative" accent="#7fe9e1" />
                <StatTile label="Updated" value={formatRelativeTime(issTelemetry.fetchedAt)} sub={formatAbsoluteTime(issTelemetry.fetchedAt)} accent="#4ecdc4" />
              </div>
            )}
            {issTelemetry && issTelemetry.crew && issTelemetry.crew.length > 0 && (
              <div className="satPanelCard">
                <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faList} /> Current ISS Crew</span></div>
                <div className="satPanelCardBody">
                  <div className="satInstrumentList">
                    {issTelemetry.crew.map((name, i) => (<span key={i} className="satInstrumentChip">{name}</span>))}
                  </div>
                </div>
              </div>
            )}
            {issTelemetry && issTelemetry.allPeople && issTelemetry.allPeople.length > 0 && (
              <div className="satPanelCard">
                <div className="satPanelCardHeader"><span><FontAwesomeIcon icon={faList} /> All Humans in Space ({issTelemetry.totalInSpace})</span></div>
                <div className="satPanelCardBody">
                  <div className="satTableScroll">
                    <AdaptiveTable>
                      <thead><tr><th>Name</th><th>Spacecraft</th></tr></thead>
                      <tbody>
                        {issTelemetry.allPeople.map((p, i) => (
                          <tr key={i}><td>{p.name}</td><td>{p.craft}</td></tr>
                        ))}
                      </tbody>
                    </AdaptiveTable>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {timeline.active && <HarvestTimelineBar feed={timelineFeed} timeline={timeline} />}
    </div>
  );
};

const FeedDossier = ({ feed, onClose }) => {
  const [activeTab, setActiveTab] = useState("overview");
  if (!feed) return null;
  const harvest = feed.harvest || null;
  const tabs = [
    { key: "overview", label: "Overview", icon: faInfoCircle },
    { key: "technical", label: "Technical", icon: faMicroscope },
    harvest ? { key: "harvest", label: "Harvest", icon: faDatabase } : { key: "availability", label: "Availability", icon: faGauge },
    { key: "references", label: "References", icon: faLink }
  ];
  const harvestMetadataFields = harvest ? Object.entries(harvest.metadata || {})
    .filter(([, value]) => value !== null && value !== undefined && value !== "" && !(typeof value === "string" && /^https?:\/\//.test(value)))
    .slice(0, 20)
    .map(([key, value]) => ({ label: titleCaseWords(key.replace(/([a-z])([A-Z])/g, "$1 $2")), value: safeRenderText(value) })) : [];
  const harvestLinks = harvest ? Object.entries(harvest.metadata || {}).filter(([, value]) => typeof value === "string" && /^https?:\/\//.test(value)) : [];
  const retentionPolicy = harvest ? {
    hotHours: Number.isFinite(harvest.policy.hotHours) ? harvest.policy.hotHours : 48,
    warmDays: Number.isFinite(harvest.policy.warmDays) ? harvest.policy.warmDays : 30,
    coldDays: Number.isFinite(harvest.policy.coldDays) ? harvest.policy.coldDays : null
  } : null;
  const retentionNotes = !harvest ? [] : harvest.mode === "archive" ? [
    { title: "Every Frame", text: `Every frame is stored for ${retentionPolicy.hotHours} hours.` },
    { title: "Hourly", text: `One frame per hour is stored for ${retentionPolicy.warmDays} days.` },
    { title: "Daily", text: retentionPolicy.coldDays === null ? "One frame per day is stored indefinitely." : `One frame per day is stored for ${retentionPolicy.coldDays} days.` },
    { title: "Deduplication", text: "Identical images are stored once and shared between frames." }
  ] : [
    { title: "Index Only", text: "Frames are indexed with their origin URLs, and no image bytes are stored." },
    { title: "Origin Retention", text: "Older frames stay viewable for as long as the provider keeps serving them." }
  ];
  const availability = feed.availability || {};
  const probedUrl = feed.imageUrl || feed.previewUrl || feed.videoUrl || feed.embedUrl || (feed.images?.[0]?.url) || null;
  const refCards = [];
  const directUrl = feed.imageUrl || feed.previewUrl || feed.videoUrl || feed.embedUrl;
  if (directUrl) {
    let host = directUrl;
    try { host = new URL(directUrl).hostname; } catch (error) {}
    refCards.push({
      key: "direct",
      href: directUrl,
      name: feed.feedType === "video" ? "Direct Video URL" : "Direct Image URL",
      desc: "Open the underlying source URL in a new tab. This is the exact endpoint the page is rendering.",
      host
    });
  }
  if (feed.worldviewUrl) {
    refCards.push({
      key: "worldview",
      href: feed.worldviewUrl,
      name: "Open in NASA Worldview",
      desc: "Explore this layer interactively in the NASA Worldview viewer with zoom, pan, time controls, and side-by-side layer comparison.",
      host: "worldview.earthdata.nasa.gov"
    });
  }
  if (feed.layerIdentifier) {
    refCards.push({
      key: "gibs-doc",
      href: `https://nasa-gibs.github.io/gibs-api-docs/`,
      name: "GIBS API Documentation",
      desc: "This is the official NASA GIBS API documentation, covering WMTS, WMS, and TWMS endpoints, tile coordinate systems, and dimension parameters.",
      host: "nasa-gibs.github.io"
    });
  }
  if (feed.id?.startsWith("sdo-")) {
    refCards.push({
      key: "sdo-mission",
      href: "https://sdo.gsfc.nasa.gov/",
      name: "SDO Mission Home",
      desc: "This is the Solar Dynamics Observatory mission home page, with current solar imagery, instrument descriptions, and operational status.",
      host: "sdo.gsfc.nasa.gov"
    });
    refCards.push({
      key: "sdo-data",
      href: "https://sdo.gsfc.nasa.gov/data/",
      name: "SDO Data Browser",
      desc: "Browse and download SDO AIA and HMI data products by date, wavelength, and observation type.",
      host: "sdo.gsfc.nasa.gov"
    });
  }
  if (feed.id?.startsWith("soho-")) {
    refCards.push({
      key: "soho-mission",
      href: "https://soho.nascom.nasa.gov/",
      name: "SOHO Mission Home",
      desc: "This is the ESA and NASA Solar and Heliospheric Observatory mission page, with realtime imagery, CME tracking, and instrument summaries.",
      host: "soho.nascom.nasa.gov"
    });
  }
  if (feed.id?.startsWith("goes16-") || feed.id?.startsWith("goes18-") || feed.id?.startsWith("goes17-") || feed.id?.startsWith("goes19-")) {
    refCards.push({
      key: "goes-star",
      href: "https://www.star.nesdis.noaa.gov/goes/",
      name: "NOAA STAR GOES Imagery",
      desc: "This is the NOAA NESDIS STAR portal for GOES-East and GOES-West imagery, with sector views and animation tools.",
      host: "star.nesdis.noaa.gov"
    });
  }
  if (feed.id?.startsWith("eumetsat-")) {
    refCards.push({
      key: "eumetview",
      href: "https://eumetview.eumetsat.int/static-images/latestImages/",
      name: "EUMETView Latest Images",
      desc: "This is the EUMETSAT public catalog of the latest geostationary and polar-orbiter imagery from the Meteosat and Metop platforms.",
      host: "eumetview.eumetsat.int"
    });
  }
  if (feed.id === "himawari-fulldisk") {
    refCards.push({
      key: "nict-himawari",
      href: "https://himawari8.nict.go.jp/",
      name: "NICT Himawari Realtime Web",
      desc: "This is the Japan NICT realtime Himawari viewer, with zoom, time-lapse, and full-resolution downloads.",
      host: "himawari8.nict.go.jp"
    });
  }
  if (feed.id === "iss-position-tracker") {
    refCards.push({
      key: "wheretheiss",
      href: "https://wheretheiss.at/",
      name: "Where the ISS At?",
      desc: "This public ISS tracking service provides position, velocity, footprint, and visibility classification.",
      host: "wheretheiss.at"
    });
    refCards.push({
      key: "iss-tracker",
      href: "https://www.nasa.gov/spot-the-station/",
      name: "NASA Spot the Station",
      desc: "This official NASA tool finds upcoming visible passes of the ISS over your location.",
      host: "nasa.gov"
    });
  }
  for (const [key, href] of harvestLinks) {
    let host = href;
    try { host = new URL(href).hostname; } catch (error) {}
    refCards.push({
      key: `harvest-${key}`,
      href,
      name: titleCaseWords(key.replace(/([a-z])([A-Z])/g, "$1 $2")),
      desc: "This is a source endpoint that the harvester reads for this product.",
      host
    });
  }
  if (feed.noradId) {
    refCards.push({
      key: "n2yo",
      href: `https://www.n2yo.com/satellite/?s=${feed.noradId}`,
      name: "N2YO Real-Time Tracking",
      desc: "This service offers real-time orbital tracking, pass predictions, ground track visualization, and visibility maps.",
      host: "n2yo.com"
    });
    refCards.push({
      key: "heavens-above",
      href: `https://www.heavens-above.com/orbit.aspx?satid=${feed.noradId}`,
      name: "Heavens-Above Orbit Page",
      desc: "This service offers detailed orbital element history, visual observation guides, and brightness estimates.",
      host: "heavens-above.com"
    });
  }


  return (
    <FeedsModal
      title="Feed Dossier"
      onClose={onClose}
      className="satOpModal"
      footer={<span className="satOpModalFooterInfo">{[feed.feedType ? titleCaseWords(feed.feedType) : null, feed.isLive ? "Live" : "Archive", feed.category || null, feed.spacecraft || null].filter(Boolean).join(" | ")}</span>}
    >
      <FeedsHero
        title={feed.name}
        description={safeRenderText(feed.description)}
      />
      <FeedsTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      {activeTab === "overview" && (
        <>
          <FeedsCard title="Source" icon={faSatellite}>
            <FeedsFields fields={[
              { label: "Spacecraft", value: feed.spacecraft || "—", sub: feed.catalogName || null },
              { label: "Operator", value: feed.operator || "—" },
              { label: "Instrument", value: feed.instrument || "—" },
              { label: "Category", value: feed.category || "—", color: categoryColor(feed.category) }
            ]} />
          </FeedsCard>
          <FeedsCard title="Delivery" icon={faTowerBroadcast}>
            <FeedsFields fields={[
              { label: "Feed Type", value: feed.feedType ? titleCaseWords(feed.feedType) : "—", color: FEED_TYPE_COLORS[feed.feedType] },
              { label: "Live", value: feed.isLive ? "Yes" : "Archive", color: feed.isLive ? "#4ecdc4" : "#FF9500" },
              { label: "Coverage", value: feed.coverageRegime || "—" },
              { label: "Cadence", value: feed.cadenceLabel || "—" },
              feed.noradId ? { label: "NORAD ID", value: feed.noradId, sub: feed.catalogName || null } : null,
              feed.latestTimestamp ? { label: "Latest Frame", value: formatRelativeTime(feed.latestTimestamp), sub: formatAbsoluteTime(feed.latestTimestamp) } : null
            ]} />
          </FeedsCard>
          {feed.keywords && feed.keywords.length > 0 && (
            <FeedsCard title="Keywords" icon={faList}>
              <FeedsChips items={feed.keywords.slice(0, 24)} />
            </FeedsCard>
          )}
        </>
      )}
      {activeTab === "technical" && (
        <FeedsCard title="Technical Properties" icon={faMicroscope}>
          <FeedsFields fields={[
            { label: "Feed ID", value: <code>{feed.id}</code> },
            { label: "Feed Type", value: feed.feedType ? titleCaseWords(feed.feedType) : "—" },
            { label: "Coverage Regime", value: feed.coverageRegime || "—" },
            { label: "Cadence", value: feed.cadenceLabel || "—" },
            { label: "NORAD ID", value: feed.noradId || "—" },
            { label: "Catalog Name", value: feed.catalogName || "—" },
            feed.layerIdentifier ? { label: "GIBS Layer", value: <code>{feed.layerIdentifier}</code> } : null,
            feed.tileMatrixSets ? { label: "Tile Matrix Sets", value: feed.tileMatrixSets.join(", ") } : null,
            feed.format ? { label: "Format", value: feed.format } : null,
            feed.wavelengthCode ? { label: "Wavelength Code", value: feed.wavelengthCode } : null,
            feed.productCode ? { label: "Product Code", value: feed.productCode } : null,
            feed.platform ? { label: "Platform", value: feed.platform } : null,
            feed.latestTimestamp ? { label: "Latest Timestamp", value: formatAbsoluteTime(feed.latestTimestamp) } : null,
            ...harvestMetadataFields
          ]} />
        </FeedsCard>
      )}
      {activeTab === "harvest" && harvest && (
        <>
          <FeedsCard title="Harvest Record" icon={faDatabase}>
            <FeedsFields fields={[
              { label: "Mode", value: titleCaseWords(harvest.mode), color: harvest.mode === "archive" ? "#4ecdc4" : "#42a5f5" },
              { label: "Frames", value: harvest.frameCount.toLocaleString() },
              { label: "Channels", value: String(harvest.channels ? harvest.channels.length : 1) },
              { label: "Kind", value: titleCaseWords(harvest.kind) },
              { label: "Source", value: <code>{harvest.sourceKey}</code> },
              { label: "Product Key", value: <code>{harvest.productKey}</code> },
              { label: "First Seen", value: formatRelativeTime(harvest.firstSeenAt), sub: formatAbsoluteTime(harvest.firstSeenAt) },
              { label: "Last Seen", value: formatRelativeTime(harvest.lastSeenAt), sub: formatAbsoluteTime(harvest.lastSeenAt) },
              { label: "Last Frame", value: formatRelativeTime(harvest.lastFrameAt), sub: formatAbsoluteTime(harvest.lastFrameAt) }
            ]} />
          </FeedsCard>
          <FeedsCard title="Retention" icon={faClock}>
            <FeedsNotes items={retentionNotes} />
          </FeedsCard>
        </>
      )}
      {activeTab === "availability" && (
        <>
          <FeedsCard title="Probe Result" icon={faGauge}>
            <FeedsFields fields={[
              { label: "Status", value: availability.ok ? "Available" : "Unavailable", color: availability.ok ? "#4ecdc4" : "#ff6b6b" },
              { label: "HTTP Status", value: availability.status || "—", sub: availability.ok ? "2xx Success" : availability.status >= 400 ? "Client or Server Error" : null },
              { label: "Probe Kind", value: availability.kind || "—", sub: "URL Field Tested" },
              { label: "Content Type", value: availability.contentType?.split(";")[0] || "—" },
              { label: "Content Length", value: availability.contentLength ? `${(availability.contentLength / 1024).toFixed(1)} KB` : "—" },
              { label: "Last Modified", value: availability.lastModified ? formatRelativeTime(availability.lastModified) : "—" },
              { label: "Probed", value: availability.checkedAt ? formatRelativeTime(availability.checkedAt) : "—", sub: availability.checkedAt ? formatAbsoluteTime(availability.checkedAt) : null }
            ]} />
            {availability.error && <div className="satFeedsCallout satFeedsCritical">{availability.error}</div>}
          </FeedsCard>
          {probedUrl && (
            <FeedsCard title="Probed Endpoint" icon={faLink}>
              <div className="satFeedsCode">{probedUrl}</div>
            </FeedsCard>
          )}
          <FeedsCard title="Probing Methodology" icon={faBookOpen}>
            <FeedsNotes items={PROBING_METHODOLOGY} />
          </FeedsCard>
        </>
      )}
      {activeTab === "references" && (
        <>
          {feed.sources && feed.sources.length > 0 && (
            <FeedsCard title="Data Sources" icon={faSatelliteDish}>
              <FeedsChips items={feed.sources} />
            </FeedsCard>
          )}
          <FeedsCard title="External References" icon={faLink}>
            {refCards.length === 0 ? (
              <div className="satFeedsEmpty">No external references are available for this feed.</div>
            ) : (
              <div className="satFeedsLinks">
                {refCards.map(reference => (
                  <a key={reference.key} href={reference.href} target="_blank" rel="noopener noreferrer" className="satFeedsLink">
                    <span className="satFeedsLinkName">{reference.name}</span>
                    <span className="satFeedsLinkDesc">{reference.desc}</span>
                    <span className="satFeedsLinkHost">{reference.host}</span>
                  </a>
                ))}
              </div>
            )}
          </FeedsCard>
        </>
      )}
    </FeedsModal>
  );
};

const HUDPanel = ({ metadata, feeds, onClose, onSelect }) => {
  const stats = useMemo(() => {
    if (!feeds) return null;
    const live = feeds.filter(feed => feed.isLive).length;
    return {
      live,
      archive: feeds.length - live,
      withNorad: feeds.filter(feed => feed.noradId).length,
      probed: feeds.filter(feed => feed.availability?.ok).length
    };
  }, [feeds]);
  const recentRows = (feeds || [])
    .filter(feed => feed.availability?.lastModified)
    .sort((a, b) => new Date(b.availability.lastModified).getTime() - new Date(a.availability.lastModified).getTime())
    .slice(0, 25)
    .map(feed => [
      <b key="name">{feed.name}</b>,
      titleCaseWords(feed.feedType),
      formatRelativeTime(feed.availability.lastModified),
      <button key="view" type="button" className="satFeedsRowButton" onClick={() => onSelect && onSelect(feed)}>View</button>
    ]);
  const total = feeds?.length || 0;

  return (
    <FeedsModal
      title="Feed Telemetry"
      onClose={onClose}
      className="satOpModal"
      footer={<span className="satOpModalFooterInfo">{`${total} Feeds | ${stats?.live || 0} Live | ${stats?.archive || 0} Archive | ${stats?.withNorad || 0} With NORAD ID`}</span>}
    >
      <div className="satOpNote">{`${total} feeds are in the registry, and ${stats?.probed || 0} of them passed the availability probe.`}</div>
      <FeedsCard title="Feed Mix" icon={faChartLine}>
        <FeedsFields fields={[
          { label: "Total Feeds", value: total, sub: "All Available" },
          { label: "Live Feeds", value: stats?.live || 0, color: "#ff6b6b" },
          { label: "Archive Feeds", value: stats?.archive || 0, color: "#FF9500" },
          { label: "With NORAD ID", value: stats?.withNorad || 0, sub: "Cross-Referenced" },
          { label: "Availability Probed", value: stats?.probed || 0, color: "#4ecdc4" },
          { label: "Build Time", value: metadata?.buildTimeMs ? `${Math.round(metadata.buildTimeMs / 1000)} s` : "—" }
        ]} />
      </FeedsCard>
      <FeedsCard title="Recently Refreshed Feeds" icon={faClock}>
        <FeedsTable columns={["Feed", "Type", "Last Modified", ""]} rows={recentRows} emptyText="No feeds have reported a last-modified time yet." />
      </FeedsCard>
    </FeedsModal>
  );
};

const LIVE_FILTER_OPTIONS = [["all", "Live + Archive"], ["live", "Live Only"], ["archive", "Archive Only"]];

const SOURCE_FILTER_OPTIONS = [["all", "All Sources"], ["registry", "Registry"], ["harvest", "Harvester"]];

const featureScore = (feed) => {
  const text = `${feed.name} ${feed.instrument || ""} ${feed.harvest ? feed.harvest.productKey : ""}`;
  const rank = feed.featured ? 0 : heroRank(text);
  let score = harvestInDarkness(feed) ? -150 : 0;
  if (rank < 99) score += 100 - rank * 5;
  if (feed.isLive) score += 60;
  if (feed.feedType === "video" && feed.isLive) score += 40;
  if (HARVEST_MAJOR_PLATFORMS.test(`${feed.spacecraft || ""} ${feed.name}`)) score += 30;
  if (/meso/i.test(text)) score += 25;
  if (/full[ _-]?disk/i.test(text)) score += 20;
  if (feed.latestTimestamp) score += Math.max(0, 20 - Math.floor((Date.now() - new Date(feed.latestTimestamp).getTime()) / 600000));
  return score;
};

const SORT_OPTIONS = [["featured", "Featured"], ["category", "Category"], ["name", "Name"], ["operator", "Operator"], ["live", "Live First"]];

const labelFor = (options, value) => (options.find(([v]) => v === value) || [null, ""])[1];

const valueFor = (options, label) => (options.find(([, l]) => l === label) || [options[0][0]])[0];

const titleCaseWords = (text) => String(text || "").replace(/[_-]+/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());

const tintedBadgeStyle = (color) => ({ background: `linear-gradient(${color}26, ${color}26), #08090c`, borderColor: `${color}99`, color });

const DEFAULT_LAYOUT = { nav: true, header: true, sidebar: true, footer: true };

const LAYOUT_TOGGLES = [["nav", "Nav"], ["header", "Header"], ["sidebar", "Sidebar"], ["footer", "Footer"]];

const EXPANDABLE_SELECTOR = ".satStatTileLabel, .satStatTileSub, .satStatTileValue, .satSatelliteHUDSectionItem span, .satDossierCellLabel, .satDossierCellValue, .satFeedViewerHeaderTitle, .satSatelliteName, .satSatelliteFeedListMeta, .satFeedGalleryTitle, .satTLEQualityCount span, .satSatelliteSideBarHeader h1 small";

const EXPAND_CONTAINER_PATTERN = /(Tile|Cell|Card|Item|Row|Section|Panel|Banner|Header)(\s|$)/;

const isInteractiveTarget = (target, root) => {
  if (target.closest("button, a, input, select, textarea, label, [role='button']")) return true;
  let node = target;
  while (node && node !== root && node !== document.body) {
    if (window.getComputedStyle(node).cursor === "pointer") return true;
    node = node.parentElement;
  }
  return false;
};

const findExpandContainer = (element, root) => {
  let node = element.parentElement;
  for (let depth = 0; node && node !== root && depth < 6; depth++) {
    if (EXPAND_CONTAINER_PATTERN.test(String(node.className || ""))) return node;
    node = node.parentElement;
  }
  return element.parentElement || element;
};

const ExpandModal = ({ view, onClose }) => {
  useEffect(() => {
    if (!view) return undefined;
    const handleKey = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [view, onClose]);
  if (!view) return null;
  return createPortal(
    <div className="satModalPortal">
      <div className="satFeedsModalOverlay" onClick={onClose}>
        <div className="satFeedsModal" onClick={(event) => event.stopPropagation()}>
          <div className="satFeedsModalHeader">
            <span>{view.title}</span>
            <button type="button" className="satFeedsModalClose" onClick={onClose} aria-label="Close">
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
          <div className="satFeedsModalContent">
            <div className="satExpandedContent" dangerouslySetInnerHTML={{ __html: view.html }} />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

const CUSTOM_LOCATION_LABEL = "Custom Coordinates";

const SOUND_VOLUME_OPTIONS = [[0.3, "Quiet"], [0.6, "Normal"], [1, "Loud"]];

const SNOOZE_OPTIONS = [[15, "15 Minutes"], [30, "30 Minutes"], [60, "1 Hour"], [120, "2 Hours"], [240, "4 Hours"], [480, "8 Hours"], [1440, "24 Hours"]];

const SOUND_LEVEL_LABELS = { notice: "Notice", warning: "Warning", critical: "Critical", emergency: "Emergency" };

const ALERT_SCOPE_OPTIONS = [["selected", "Alert For Selected Area"], ["areas", "Alert For All Areas"]];

const ALERT_SEVERITY_ORDER = { CRITICAL: 0, WARNING: 1 };

const ALERT_SEVERITY_COLORS = { CRITICAL: "#ff6b6b", WARNING: "#FF9500" };

const ALERT_SOUND_LEVEL_MAP = { CRITICAL: "critical", WARNING: "warning" };

const ALERT_KIND_LABELS = { productOutage: "Product Outage", mesoSector: "Mesoscale Sector", mesoNear: "Mesoscale Sector Over Location", solarFlare: "Solar Flare", radioBurst: "Type II Radio Burst", aurora: "Aurora", auroraNear: "Aurora Over Location" };

const ALERT_DETAIL_LABELS = { productsImpacted: "Products Impacted", length: "Length Of Event", satellite: "Satellite", sector: "Sector", reason: "Reason", requester: "Requested By", messageCode: "Message Code", serialNumber: "Serial Number", xrayClass: "X-Ray Class", sourceRegion: "Source Region", scale: "NOAA Scale", estimatedVelocityKms: "Estimated Velocity (km/s)", beginTime: "Begin Time", endTime: "End Time" };

const alertItemKey = (item) => item.key;

const alertItemIdentity = (item) => item.identity;

const alertSoundLevel = (item) => ALERT_SOUND_LEVEL_MAP[item.severity] || null;

const alertSoundMessage = (item, ended) => ({ title: ended ? `${item.title} Ended` : item.title, body: item.message });

const formatAlertTime = (iso) => (iso ? new Date(iso).toLocaleString() : null);

const alertDetailValue = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return Number.isInteger(value) ? value.toLocaleString() : Number(value.toFixed(3)).toLocaleString();
  if (typeof value === "object") return null;
  return String(value);
};

const alertFields = (item) => [
  ["Severity", item.severity === "CRITICAL" ? "Critical" : "Warning"],
  ["Type", ALERT_KIND_LABELS[item.kind] || null],
  ["Source", item.source],
  ["Location", item.placeLabel],
  ["Distance From Sector Center", item.distanceKm !== undefined && item.distanceKm !== null ? `${item.distanceKm.toLocaleString()} km` : null],
  ["Aurora Overhead", item.aurora ? `${item.aurora.overheadPercent}%` : null],
  ["Aurora Within View", item.aurora ? `${item.aurora.horizonPercent}%` : null],
  ["Sun Altitude", item.aurora ? `${item.aurora.sunAltitudeDeg}°` : null],
  ["Issued", formatAlertTime(item.issuedAt)],
  [item.kind === "solarFlare" ? "Peak" : item.kind === "aurora" || item.kind === "auroraNear" ? "Forecast For" : "Starts", formatAlertTime(item.eventAt)],
  ["Expires", formatAlertTime(item.expiresAt)],
  ["Sector Center", item.kind !== "productOutage" && Number.isFinite(item.lat) && Number.isFinite(item.lon) ? `${item.lat.toFixed(2)}°, ${item.lon.toFixed(2)}°` : null],
  ...Object.entries(item.details && typeof item.details === "object" ? item.details : {}).map(([key, value]) => [ALERT_DETAIL_LABELS[key] || titleCaseWords(key.replace(/([a-z0-9])([A-Z])/g, "$1 $2")), alertDetailValue(value)])
];

const areaCenter = (area) => (area.mode === "point_radius" ? { lat: area.latitude, lon: area.longitude } : { lat: (area.min_lat + area.max_lat) / 2, lon: (area.min_lng + area.max_lng) / 2 });

const AdaptiveTable = ({ children }) => {
  const tableRef = useRef(null);
  useLayoutEffect(() => {
    const table = tableRef.current;
    if (!table) return;
    const rows = Array.from(table.rows);
    const widths = [];
    for (const row of rows) Array.from(row.cells).forEach((cell, column) => { widths[column] = Math.max(widths[column] || 0, cell.textContent.trim().length); });
    for (const row of rows) {
      Array.from(row.cells).forEach((cell, column) => {
        const kind = widths[column] > SOURCES.tables.wrapAt ? "satWeatherCellWrap" : widths[column] > SOURCES.tables.tightAt ? "satWeatherCellMedium" : "satWeatherCellTight";
        cell.classList.remove("satWeatherCellWrap", "satWeatherCellMedium", "satWeatherCellTight");
        cell.classList.add(kind);
      });
    }
  });
  return <table ref={tableRef} className="satDataTable satWeatherDataTable">{children}</table>;
};

const ALERT_SOUND_LEVELS = ["notice", "warning", "critical", "emergency"];

const alternating = (low, high, steps, length, wave, gain) => Array.from({ length: steps }, (_, index) => ({ at: index * length, freq: index % 2 ? high : low, length: length * 0.92, wave, gain }));

const ALERT_SOUND_PATTERNS = {
  notice: [{ at: 0, freq: 880, length: 0.16, wave: "sine", gain: 0.45 }, { at: 0.2, freq: 1174.7, length: 0.3, wave: "sine", gain: 0.45 }],
  warning: [0, 0.75].flatMap((offset) => [659.3, 880, 1046.5].map((freq, index) => ({ at: offset + index * 0.16, freq, length: 0.15, wave: "triangle", gain: 0.6 }))),
  critical: alternating(740, 988, 10, 0.17, "square", 0.22),
  emergency: [...alternating(784, 1175, 12, 0.13, "sawtooth", 0.24), ...alternating(784, 1175, 12, 0.13, "sawtooth", 0.24).map((note) => ({ ...note, at: note.at + 1.9 }))]
};

const patternSeconds = (level) => (ALERT_SOUND_PATTERNS[level] || []).reduce((end, note) => Math.max(end, note.at + note.length), 0);

const createAlertSoundEngine = () => {
  let context = null;
  let master = null;
  let loopTimer = null;
  let loopState = null;
  let pending = null;
  const active = new Set();
  const ensure = () => {
    if (context) return context;
    const Context = typeof window !== "undefined" ? window.AudioContext || window.webkitAudioContext : null;
    if (!Context) return null;
    context = new Context();
    master = context.createGain();
    master.connect(context.destination);
    return context;
  };
  const unlock = async () => {
    const audio = ensure();
    if (!audio) return false;
    if (audio.state !== "running") {
      try {
        await audio.resume();
      } catch (error) {
        return false;
      }
    }
    if (audio.state === "running" && pending) {
      const queued = pending;
      pending = null;
      schedule(queued.level, queued.volume, audio.currentTime + 0.05);
    }
    if (audio.state === "running" && loopState) topUp();
    return audio.state === "running";
  };
  const ready = () => Boolean(context && context.state === "running");
  const schedule = (level, volume, start) => {
    const audio = ensure();
    const pattern = ALERT_SOUND_PATTERNS[level];
    if (!audio || !pattern || audio.state !== "running") return false;
    master.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), audio.currentTime);
    for (const note of pattern) {
      const oscillator = audio.createOscillator();
      const filter = audio.createBiquadFilter();
      const envelope = audio.createGain();
      const at = start + note.at;
      oscillator.type = note.wave;
      oscillator.frequency.setValueAtTime(note.freq, at);
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(2600, at);
      envelope.gain.setValueAtTime(0.0001, at);
      envelope.gain.exponentialRampToValueAtTime(note.gain, at + 0.015);
      envelope.gain.setValueAtTime(note.gain, at + note.length * 0.7);
      envelope.gain.exponentialRampToValueAtTime(0.0001, at + note.length);
      oscillator.connect(filter);
      filter.connect(envelope);
      envelope.connect(master);
      oscillator.onended = () => {
        active.delete(oscillator);
        envelope.disconnect();
      };
      active.add(oscillator);
      oscillator.start(at);
      oscillator.stop(at + note.length + 0.02);
    }
    return true;
  };
  const silenceAll = () => {
    for (const oscillator of active) {
      try {
        oscillator.stop(0);
      } catch (error) {
        active.delete(oscillator);
      }
    }
    active.clear();
  };
  const stop = () => {
    pending = null;
    if (loopTimer) clearInterval(loopTimer);
    loopTimer = null;
    loopState = null;
    silenceAll();
  };
  const play = (level, volume) => {
    stop();
    const audio = ensure();
    if (!audio) return false;
    if (audio.state === "running") return schedule(level, volume, audio.currentTime + 0.05);
    pending = { level, volume };
    audio.resume().then(() => {
      if (audio.state === "running" && pending) {
        const queued = pending;
        pending = null;
        schedule(queued.level, queued.volume, audio.currentTime + 0.05);
      }
    }).catch(() => null);
    return false;
  };
  const topUp = () => {
    const audio = ensure();
    if (!loopState || !audio) return;
    if (audio.state !== "running") {
      audio.resume().catch(() => null);
      return;
    }
    if (loopState.next < audio.currentTime) loopState.next = audio.currentTime + 0.05;
    const horizon = audio.currentTime + loopState.ahead;
    while (loopState.next <= horizon) {
      schedule(loopState.level, loopState.volume, loopState.next);
      loopState.next += loopState.every;
    }
  };
  const loop = (level, volume, everyMs, aheadSeconds, topUpMs) => {
    stop();
    const audio = ensure();
    if (!audio) return false;
    loopState = { level, volume, every: patternSeconds(level) + everyMs / 1000, ahead: aheadSeconds, next: audio.currentTime + 0.05 };
    topUp();
    loopTimer = setInterval(topUp, topUpMs);
    return true;
  };
  const looping = () => Boolean(loopState);
  const close = () => {
    stop();
    if (context) context.close().catch(() => null);
    context = null;
    master = null;
  };
  return { unlock, ready, play, loop, looping, stop, close };
};

const PAGE_LOAD_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const stateDBPromise = typeof indexedDB !== "undefined" ? openDB(SOURCES.persistence.dbName, 1, {
  upgrade(db) {
    db.createObjectStore(SOURCES.persistence.storeName, { keyPath: "id" });
  }
}) : null;

const saveStateToDB = async (state) => {
  try {
    const db = await stateDBPromise;
    if (db) await db.put(SOURCES.persistence.storeName, { id: SOURCES.persistence.recordId, data: state, savedAt: Date.now() });
  } catch { }
};

const clearStateFromDB = async () => {
  try {
    const db = await stateDBPromise;
    if (db) await db.delete(SOURCES.persistence.storeName, SOURCES.persistence.recordId);
  } catch { }
};

const loadStateFromDB = async () => {
  try {
    const db = await stateDBPromise;
    if (!db) return null;
    const record = await db.get(SOURCES.persistence.storeName, SOURCES.persistence.recordId);
    if (!record || !record.data) return null;
    const flag = sessionStorage.getItem(SOURCES.persistence.restoreFlag);
    if (flag && flag !== PAGE_LOAD_ID) {
      sessionStorage.removeItem(SOURCES.persistence.restoreFlag);
      await clearStateFromDB();
      return null;
    }
    sessionStorage.setItem(SOURCES.persistence.restoreFlag, PAGE_LOAD_ID);
    return record.data;
  } catch {
    return null;
  }
};

const showSystemNotification = (title, body, persistent) => {
  try {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const notification = new Notification(title, { body, tag: "alert-sound", renotify: true, requireInteraction: persistent });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (error) {
    return;
  }
};

const levelRank = (level) => ALERT_SOUND_LEVELS.indexOf(level);

const topQueueLevel = (queue) => queue.reduce((top, entry) => (!top || levelRank(entry.level) > levelRank(top) ? entry.level : top), null);

const useAlertSounds = ({ defaults, ready, items, inScope, scopeKey, ignoreLevel, getKey, getLevel, getId, describe, repeatMs, aheadSeconds, topUpMs }) => {
  const engineRef = useRef(null);
  const seenRef = useRef(null);
  const promptedRef = useRef(new Set());
  const queueRef = useRef([]);
  const scopeRef = useRef(inScope);
  scopeRef.current = inScope;
  const [settings, setSettings] = useState(defaults);
  const [unlocked, setUnlocked] = useState(false);
  const [queue, setQueue] = useState([]);
  const [testAlarm, setTestAlarm] = useState(null);
  if (!engineRef.current) engineRef.current = createAlertSoundEngine();
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const updateSettings = useCallback((patch) => {
    setSettings((current) => ({ ...current, ...patch }));
  }, []);

  const replaceSettings = useCallback((saved) => {
    setSettings({ ...defaults, ...(saved && typeof saved === "object" ? saved : {}) });
  }, [defaults]);

  const unlock = useCallback(async () => {
    const ok = await engineRef.current.unlock();
    setUnlocked(ok);
    return ok;
  }, []);

  useEffect(() => {
    if (!settings.enabled || unlocked) return undefined;
    const handler = () => {
      unlock();
    };
    window.addEventListener("pointerdown", handler);
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("keydown", handler);
    };
  }, [settings.enabled, unlocked, unlock]);

  useEffect(() => () => engineRef.current && engineRef.current.stop(), []);

  const snoozed = settings.snoozeUntil > Date.now();

  useEffect(() => {
    if (!settings.snoozeUntil) return undefined;
    const wait = settings.snoozeUntil - Date.now();
    if (wait <= 0) {
      updateSettings({ snoozeUntil: 0 });
      return undefined;
    }
    const timer = setTimeout(() => updateSettings({ snoozeUntil: 0 }), Math.min(wait, 2147483000));
    return () => clearTimeout(timer);
  }, [settings.snoozeUntil, updateSettings]);

  const syncLoop = useCallback((list) => {
    const engine = engineRef.current;
    const current = settingsRef.current;
    if (!list.length) {
      engine.stop();
      return;
    }
    if (current.mode === "persistent") engine.loop(topQueueLevel(list), current.volume, repeatMs, aheadSeconds, topUpMs);
  }, [repeatMs, aheadSeconds, topUpMs]);

  const commitQueue = useCallback((list) => {
    queueRef.current = list;
    setQueue(list);
  }, []);

  const acknowledge = useCallback((key) => {
    const before = queueRef.current;
    const next = before.filter((entry) => entry.key !== key);
    commitQueue(next);
    if (!next.length) engineRef.current.stop();
    else if (topQueueLevel(next) !== topQueueLevel(before)) syncLoop(next);
  }, [commitQueue, syncLoop]);

  const acknowledgeAll = useCallback(() => {
    commitQueue([]);
    setTestAlarm(null);
    engineRef.current.stop();
  }, [commitQueue]);

  const silence = useCallback(() => {
    setTestAlarm(null);
    engineRef.current.stop();
    if (queueRef.current.length) syncLoop(queueRef.current);
  }, [syncLoop]);

  const snooze = useCallback((minutes) => {
    acknowledgeAll();
    updateSettings({ snoozeUntil: minutes > 0 ? Date.now() + minutes * 60000 : 0 });
  }, [acknowledgeAll, updateSettings]);

  const test = useCallback(async (level) => {
    if (!(await unlock())) return;
    const persistent = settings.mode === "persistent";
    if (persistent) engineRef.current.loop(level, settings.volume, repeatMs, aheadSeconds, topUpMs);
    else engineRef.current.play(level, settings.volume);
    setTestAlarm({ level, persistent, at: Date.now() });
  }, [unlock, settings.mode, settings.volume, repeatMs, aheadSeconds, topUpMs]);

  const toggle = useCallback(async () => {
    if (settings.enabled) {
      acknowledgeAll();
      updateSettings({ enabled: false });
      return;
    }
    seenRef.current = null;
    promptedRef.current = new Set();
    updateSettings({ enabled: true });
    if (typeof Notification !== "undefined" && Notification.permission === "default") Notification.requestPermission().catch(() => null);
    if (await unlock()) engineRef.current.play("notice", settings.volume);
  }, [settings.enabled, settings.volume, acknowledgeAll, updateSettings, unlock]);

  useEffect(() => {
    if (!items) return;
    const keys = new Map();
    for (const item of items) {
      const level = getLevel(item);
      if (level) keys.set(getKey(item), { item, level });
    }
    if (!settings.enabled || !ready) {
      seenRef.current = null;
      promptedRef.current = new Set();
      return;
    }
    const previous = seenRef.current || new Map();
    seenRef.current = keys;
    const prompted = promptedRef.current;
    const floor = ignoreLevel ? -1 : levelRank(settings.minLevel);
    const counts = (entry) => levelRank(entry.level) >= floor && (!scopeRef.current || scopeRef.current(entry.item, settings.scope));
    for (const key of Array.from(prompted)) if (!keys.has(key)) prompted.delete(key);
    if (snoozed) {
      for (const [key, entry] of keys.entries()) if (counts(entry)) prompted.add(key);
      return;
    }
    const kept = queueRef.current.filter((entry) => {
      if (entry.ended) return true;
      const current = keys.get(entry.key);
      if (current && counts(current)) return true;
      prompted.delete(entry.key);
      return false;
    });
    const previousIds = new Set(Array.from(previous.values()).map((entry) => getId(entry.item)));
    const added = [];
    const now = Date.now();
    for (const [key, entry] of keys.entries()) {
      if (prompted.has(key) || !counts(entry)) continue;
      prompted.add(key);
      const id = getId(entry.item);
      added.push({ key, id, item: entry.item, level: entry.level, ended: false, updated: previousIds.has(id) && !previous.has(key), at: now, message: describe ? describe(entry.item, false) : null });
    }
    const liveIds = new Set(Array.from(keys.values()).map((entry) => getId(entry.item)));
    for (const [key, entry] of previous.entries()) {
      if (keys.has(key) || !counts(entry) || liveIds.has(getId(entry.item))) continue;
      added.push({ key: `${key}|ended`, id: getId(entry.item), item: entry.item, level: ALERT_SOUND_LEVELS[0], ended: true, updated: false, at: now, message: describe ? describe(entry.item, true) : null });
    }
    if (!added.length) {
      if (kept.length !== queueRef.current.length) {
        commitQueue(kept);
        if (!kept.length) engineRef.current.stop();
        else syncLoop(kept);
      }
      return;
    }
    const addedIds = new Set(added.map((entry) => entry.id));
    const merged = [...kept.filter((entry) => !addedIds.has(entry.id)), ...added];
    commitQueue(merged);
    const persistent = settings.mode === "persistent";
    if (persistent) syncLoop(merged);
    else engineRef.current.play(topQueueLevel(added), settings.volume);
    const lead = added.reduce((top, entry) => (!top || levelRank(entry.level) > levelRank(top.level) ? entry : top), null);
    if (added.length === 1 && lead.message) showSystemNotification(lead.message.title, lead.message.body, persistent);
    else showSystemNotification(`${added.length} Condition Changes`, added.map((entry) => (entry.message ? entry.message.body : "")).filter(Boolean).slice(0, 4).join("; "), persistent);
  }, [items, ready, snoozed, scopeKey, settings.enabled, settings.minLevel, settings.volume, settings.mode, settings.scope, getKey, getLevel, getId, describe, commitQueue, syncLoop]);

  useEffect(() => {
    if (!testAlarm || testAlarm.persistent) return undefined;
    const timer = setTimeout(() => setTestAlarm(null), 15000);
    return () => clearTimeout(timer);
  }, [testAlarm]);

  useEffect(() => {
    const list = queueRef.current;
    if (!list.length) return;
    if (settings.mode === "single") engineRef.current.stop();
    else syncLoop(list);
  }, [settings.mode, settings.volume, syncLoop]);

  const alarm = testAlarm ? { ...testAlarm, test: true } : queue.length ? { level: topQueueLevel(queue), item: queue[0].item, persistent: settings.mode === "persistent", count: queue.length } : null;

  return { settings, updateSettings, replaceSettings, unlocked, alarm, queue, snoozed, acknowledge, acknowledgeAll, silence, snooze, toggle, test };
};

const INITIAL_AREA_FORM = {
  mode: "point_radius",
  name: "",
  address: "",
  latitude: "",
  longitude: "",
  radius_km: "100",
  min_lat: "",
  max_lat: "",
  min_lng: "",
  max_lng: ""
};

const describeArea = (area) => {
  if (!area) return null;
  const name = area.name && area.name.trim() ? area.name.trim() : null;
  if (area.mode === "point_radius") return name || `${area.latitude.toFixed(3)}°, ${area.longitude.toFixed(3)}° · ${area.radius_km}km`;
  if (area.mode === "bbox") return name || `BBox ${area.min_lat.toFixed(2)}/${area.min_lng.toFixed(2)} → ${area.max_lat.toFixed(2)}/${area.max_lng.toFixed(2)}`;
  return name || "Area";
};

const SUGGESTION_CACHE = new Map();

const toSuggestion = (feature) => {
  const p = feature.properties || {};
  const coordinates = (feature.geometry && feature.geometry.coordinates) || [];
  const longitude = Number(coordinates[0]);
  const latitude = Number(coordinates[1]);
  const street = [p.housenumber, p.street].filter(Boolean).join(" ");
  const city = p.city || p.town || p.village || p.district || p.locality || p.county || "";
  const placeName = p.name && p.name !== street ? p.name : "";
  const primary = street || placeName || city || p.state || p.country || "";
  const secondary = [
    street && placeName ? placeName : null,
    city && city !== primary ? city : null,
    p.state && p.state !== primary ? p.state : null,
    p.postcode || null,
    p.country && p.country !== primary ? p.country : null
  ].filter(Boolean).join(", ");
  return {
    id: `${p.osm_type || ""}${p.osm_id || ""}_${latitude}_${longitude}`,
    primary,
    secondary,
    label: [primary, secondary].filter(Boolean).join(", "),
    latitude,
    longitude,
    street: street || (p.osm_key === "highway" ? p.name || "" : ""),
    city,
    state: p.state || "",
    country: p.country || "",
    postalCode: p.postcode || ""
  };
};

const fetchSuggestions = async (query, bias, signal) => {
  const biasKey = bias ? `${bias.latitude.toFixed(1)},${bias.longitude.toFixed(1)}` : "";
  const key = `${query.toLowerCase()}|${biasKey}`;
  if (SUGGESTION_CACHE.has(key)) return SUGGESTION_CACHE.get(key);
  const params = new URLSearchParams({ q: query, limit: String(SOURCES.geocoding.resultLimit), lang: "en" });
  if (bias) {
    params.set("lat", String(bias.latitude));
    params.set("lon", String(bias.longitude));
  }
  const response = await fetch(`${SOURCES.geocoding.photon}?${params.toString()}`, { signal });
  if (!response.ok) throw new Error(`The address service returned status ${response.status}.`);
  const data = await response.json();
  const seen = new Set();
  const results = (data.features || [])
    .map(toSuggestion)
    .filter((suggestion) => suggestion.primary && Number.isFinite(suggestion.latitude) && Number.isFinite(suggestion.longitude))
    .filter((suggestion) => {
      if (seen.has(suggestion.label)) return false;
      seen.add(suggestion.label);
      return true;
    });
  if (SUGGESTION_CACHE.size >= SOURCES.geocoding.cacheLimit) SUGGESTION_CACHE.delete(SUGGESTION_CACHE.keys().next().value);
  SUGGESTION_CACHE.set(key, results);
  return results;
};

const AddressAutocomplete = ({ value, onChange, onSelect, placeholder, className, style, bias, onKeyDown }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchedQuery, setSearchedQuery] = useState("");
  const [highlight, setHighlight] = useState(-1);
  const abortRef = useRef(null);
  const timerRef = useRef(null);
  const skipNextRef = useRef(false);
  const biasLatitude = bias ? Number(bias.latitude) : NaN;
  const biasLongitude = bias ? Number(bias.longitude) : NaN;
  const query = (value || "").trim();

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (skipNextRef.current) {
      skipNextRef.current = false;
      return undefined;
    }
    if (query.length < SOURCES.geocoding.minQueryLength) {
      if (abortRef.current) abortRef.current.abort();
      setSuggestions([]);
      setLoading(false);
      setError("");
      setSearchedQuery("");
      return undefined;
    }
    timerRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError("");
      try {
        const biasPoint = Number.isFinite(biasLatitude) && Number.isFinite(biasLongitude) ? { latitude: biasLatitude, longitude: biasLongitude } : null;
        const results = await fetchSuggestions(query, biasPoint, controller.signal);
        if (controller.signal.aborted) return;
        setSuggestions(results);
        setHighlight(results.length ? 0 : -1);
        setSearchedQuery(query);
      } catch (fetchError) {
        if (fetchError.name === "AbortError") return;
        setSuggestions([]);
        setSearchedQuery(query);
        setError("Address suggestions are unavailable right now.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, SOURCES.geocoding.debounceMs);
    return () => clearTimeout(timerRef.current);
  }, [query, biasLatitude, biasLongitude]);

  useEffect(() => () => {
    clearTimeout(timerRef.current);
    if (abortRef.current) abortRef.current.abort();
  }, []);

  const choose = (suggestion) => {
    skipNextRef.current = true;
    setOpen(false);
    setSuggestions([]);
    setSearchedQuery("");
    onChange(suggestion.label);
    if (onSelect) onSelect(suggestion);
  };

  const handleKeyDown = (event) => {
    const menuVisible = open && suggestions.length > 0;
    if (menuVisible && event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((previous) => (previous + 1) % suggestions.length);
      return;
    }
    if (menuVisible && event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((previous) => (previous <= 0 ? suggestions.length - 1 : previous - 1));
      return;
    }
    if (menuVisible && event.key === "Enter" && highlight >= 0) {
      event.preventDefault();
      choose(suggestions[highlight]);
      return;
    }
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (onKeyDown) onKeyDown(event);
  };

  const showMenu = open && query.length >= SOURCES.geocoding.minQueryLength && (loading || error || suggestions.length > 0 || searchedQuery === query);

  return (
    <div className="satWeatherAddressAutocomplete" style={style}>
      <input
        type="text"
        className={className}
        value={value || ""}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        role="combobox"
        aria-expanded={showMenu}
        aria-autocomplete="list"
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
      />
      {showMenu && (
        <div className="satWeatherAddressAutocompleteMenu" role="listbox">
          {loading && suggestions.length === 0 && (
            <div className="satWeatherAddressAutocompleteStatus">
              <FontAwesomeIcon icon={faSpinner} spin />
            </div>
          )}
          {!loading && error && (
            <div className="satWeatherAddressAutocompleteStatus satWeatherAddressAutocompleteError">
              <FontAwesomeIcon icon={faTriangleExclamation} />
              <span>{error}</span>
            </div>
          )}
          {!loading && !error && suggestions.length === 0 && (
            <div className="satWeatherAddressAutocompleteStatus">
              <span>No Matching Addresses</span>
            </div>
          )}
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              type="button"
              role="option"
              aria-selected={index === highlight}
              className={`satWeatherAddressAutocompleteItem${index === highlight ? " satWeatherAddressAutocompleteItemActive" : ""}`}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setHighlight(index)}
              onClick={() => choose(suggestion)}
            >
              <FontAwesomeIcon icon={faLocationDot} className="satWeatherAddressAutocompleteIcon" />
              <span className="satWeatherAddressAutocompleteText">
                <span className="satWeatherAddressAutocompletePrimary">{suggestion.primary}</span>
                {suggestion.secondary && <span className="satWeatherAddressAutocompleteSecondary">{suggestion.secondary}</span>}
              </span>
            </button>
          ))}
          <div className="satWeatherAddressAutocompleteAttribution">{SOURCES.geocoding.attribution}</div>
        </div>
      )}
    </div>
  );
};

const AreaModal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return createPortal(
    <div className="satWeatherModalOverlay" onClick={onClose}>
      <div className="satWeatherModal" onClick={(event) => event.stopPropagation()}>
        <div className="satWeatherModalHeader">
          <span>{title}</span>
          <button className="satWeatherModalClose" onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        <div className="satWeatherModalContent">{children}</div>
      </div>
    </div>,
    document.body
  );
};

const PICKER_APPLE_ZOOM_THRESHOLD = 6;
const PICKER_MAPKIT_TOKEN = SOURCES.assets.mapkitToken;

const loadExternalCss = (href, id) => {
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
};

const loadExternalScript = (src, id, isReady) => new Promise((resolve, reject) => {
  if (isReady()) {
    resolve();
    return;
  }
  const existing = document.getElementById(id) || document.querySelector(`script[src="${src}"]`);
  const script = existing || document.createElement("script");
  const timeout = setTimeout(() => reject(new Error(`The script ${src} took too long to load.`)), 15000);
  script.addEventListener("load", () => {
    clearTimeout(timeout);
    resolve();
  });
  script.addEventListener("error", () => {
    clearTimeout(timeout);
    reject(new Error(`The script ${src} failed to load.`));
  });
  if (!existing) {
    script.id = id;
    script.src = src;
    script.async = true;
    document.head.appendChild(script);
  }
});

const loadPickerMapLibre = async () => {
  loadExternalCss(SOURCES.assets.maplibreCss, "maplibre-css");
  await loadExternalScript(SOURCES.assets.maplibreScript, "maplibre-script", () => Boolean(window.maplibregl));
  return window.maplibregl;
};

const loadPickerMapKit = async () => {
  if (!PICKER_MAPKIT_TOKEN) throw new Error("VITE_APPLE_MAPS_KEY is not configured.");
  await loadExternalScript(SOURCES.assets.mapkitScript, "apple-mapkit-script", () => Boolean(window.mapkit));
  if (!window.__dinoMapkitInitialized) {
    try {
      window.mapkit.init({ authorizationCallback: done => done(PICKER_MAPKIT_TOKEN) });
    } catch (error) {
      if (!/already/i.test(error.message || "")) throw error;
    }
    window.__dinoMapkitInitialized = true;
  }
  return window.mapkit;
};

const pickerZoomToSpan = (zoom) => 360 / Math.pow(2, zoom);
const pickerSpanToZoom = (span) => Math.max(0, Math.min(Math.log2(360 / Math.max(span, 0.0001)), 22));

const LocationPickerModal = ({ initialLat, initialLon, initialLabel, onCancel, onConfirm }) => {
  const libreContainerRef = useRef(null);
  const appleContainerRef = useRef(null);
  const libreMapRef = useRef(null);
  const appleMapRef = useRef(null);
  const libreMarkerRef = useRef(null);
  const appleMarkerRef = useRef(null);
  const providerRef = useRef("maplibre");
  const appleReadyRef = useRef(false);
  const switchingRef = useRef(false);
  const pointerDownRef = useRef(null);
  const pickRef = useRef(null);
  const [provider, setProvider] = useState("maplibre");
  const [picked, setPicked] = useState({ lat: initialLat, lon: initialLon, label: initialLabel || null });
  const [labelLoading, setLabelLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searchStatus, setSearchStatus] = useState("");
  const [mapStatus, setMapStatus] = useState("Loading Map");
  const [locating, setLocating] = useState(false);
  const [latText, setLatText] = useState(initialLat === null || initialLat === undefined ? "" : String(initialLat));
  const [lonText, setLonText] = useState(initialLon === null || initialLon === undefined ? "" : String(initialLon));
  const typedLat = parseFloat(latText);
  const typedLon = parseFloat(lonText);
  const typedValid = Number.isFinite(typedLat) && Number.isFinite(typedLon) && typedLat >= -90 && typedLat <= 90 && typedLon >= -180 && typedLon <= 180;

  const switchProvider = useCallback((target, lat, lon, zoom) => {
    if (switchingRef.current || providerRef.current === target) return;
    switchingRef.current = true;
    providerRef.current = target;
    setProvider(target);
    if (target === "apple" && appleMapRef.current && window.mapkit) {
      const span = pickerZoomToSpan(zoom);
      appleMapRef.current.setRegionAnimated(new window.mapkit.CoordinateRegion(new window.mapkit.Coordinate(lat, lon), new window.mapkit.CoordinateSpan(span, span)), false);
    } else if (target === "maplibre" && libreMapRef.current) {
      libreMapRef.current.jumpTo({ center: [lon, lat], zoom });
      setTimeout(() => libreMapRef.current?.resize(), 0);
    }
    setTimeout(() => { switchingRef.current = false; }, 300);
  }, []);

  const flyTo = useCallback((lat, lon, zoom) => {
    if (zoom >= PICKER_APPLE_ZOOM_THRESHOLD && appleReadyRef.current) {
      if (providerRef.current !== "apple") switchProvider("apple", lat, lon, zoom);
      else if (appleMapRef.current && window.mapkit) {
        const span = pickerZoomToSpan(zoom);
        appleMapRef.current.setRegionAnimated(new window.mapkit.CoordinateRegion(new window.mapkit.Coordinate(lat, lon), new window.mapkit.CoordinateSpan(span, span)), true);
      }
      return;
    }
    if (providerRef.current !== "maplibre") switchProvider("maplibre", lat, lon, zoom);
    else libreMapRef.current?.flyTo({ center: [lon, lat], zoom, duration: 1200 });
  }, [switchProvider]);

  const placeMarkers = useCallback((lat, lon) => {
    if (libreMapRef.current && window.maplibregl) {
      if (!libreMarkerRef.current) {
        const element = document.createElement("div");
        element.className = "satEarthCondPickerMarker";
        libreMarkerRef.current = new window.maplibregl.Marker({ element }).setLngLat([lon, lat]).addTo(libreMapRef.current);
      } else {
        libreMarkerRef.current.setLngLat([lon, lat]);
      }
    }
    if (appleMapRef.current && window.mapkit) {
      if (appleMarkerRef.current) appleMapRef.current.removeAnnotation(appleMarkerRef.current);
      appleMarkerRef.current = new window.mapkit.MarkerAnnotation(new window.mapkit.Coordinate(lat, lon), { color: "#4ecdc4", glyphColor: "#08090c", title: "Selected Location" });
      appleMapRef.current.addAnnotation(appleMarkerRef.current);
    }
  }, []);

  const lookupLabel = useCallback(async (lat, lon) => {
    setLabelLoading(true);
    const finish = (label) => {
      setPicked(prev => (prev.lat === lat && prev.lon === lon ? { ...prev, label } : prev));
      setLabelLoading(false);
    };
    if (window.mapkit && window.__dinoMapkitInitialized) {
      try {
        new window.mapkit.Geocoder({ language: "en-US" }).reverseLookup(new window.mapkit.Coordinate(lat, lon), (error, data) => {
          const place = data?.results?.[0];
          if (!error && place) {
            finish([place.locality, place.administrativeArea, place.country].filter(Boolean).join(", ") || place.formattedAddress || null);
          } else {
            fetchBackendLabel(lat, lon).then(finish);
          }
        });
        return;
      } catch (error) {
        finish(await fetchBackendLabel(lat, lon));
        return;
      }
    }
    finish(await fetchBackendLabel(lat, lon));
  }, []);

  const fetchBackendLabel = async (lat, lon) => {
    try {
      const response = await fetch(`${apiUrl("reverseGeocode")}?lat=${lat}&lon=${lon}`);
      if (!response.ok) return null;
      const data = await response.json();
      return data.label || null;
    } catch (error) {
      return null;
    }
  };

  const pickPoint = useCallback((lat, lon, label = null) => {
    const roundedLat = parseFloat(lat.toFixed(4));
    const roundedLon = parseFloat((((lon + 540) % 360) - 180).toFixed(4));
    setPicked({ lat: roundedLat, lon: roundedLon, label });
    setLatText(String(roundedLat));
    setLonText(String(roundedLon));
    placeMarkers(roundedLat, roundedLon);
    if (!label) lookupLabel(roundedLat, roundedLon);
  }, [placeMarkers, lookupLabel]);

  useEffect(() => {
    pickRef.current = pickPoint;
  }, [pickPoint]);

  useEffect(() => {
    let cancelled = false;
    const handleKey = (event) => { if (event.key === "Escape") onCancel(); };
    window.addEventListener("keydown", handleKey);
    const pickerHost = libreContainerRef.current?.parentElement || null;
    const claimWheel = (event) => { event.preventDefault(); };
    pickerHost?.addEventListener("wheel", claimWheel, { passive: false, capture: true });
    loadPickerMapLibre().then(maplibregl => {
      if (cancelled || !libreContainerRef.current) return;
      const map = new maplibregl.Map({
        container: libreContainerRef.current,
        style: {
          version: 8,
          sources: {
            "satellite-tiles": { type: "raster", tiles: [SOURCES.assets.satelliteTiles], tileSize: 256, maxzoom: 19, attribution: "Tiles © Esri" },
            "labels-tiles": { type: "raster", tiles: [SOURCES.assets.labelTiles], tileSize: 256, maxzoom: 19 }
          },
          layers: [
            { id: "satellite-layer", type: "raster", source: "satellite-tiles" },
            { id: "labels-layer", type: "raster", source: "labels-tiles", paint: { "raster-opacity": 0.9 } }
          ]
        },
        center: [initialLon, initialLat],
        zoom: 4,
        minZoom: 1,
        maxZoom: 18,
        antialias: true
      });
      map.addControl(new maplibregl.NavigationControl(), "top-right");
      map.addControl(new maplibregl.ScaleControl(), "bottom-left");
      map.on("load", () => {
        setMapStatus("");
        pickRef.current?.(initialLat, initialLon, initialLabel || null);
      });
      map.on("mousedown", event => { pointerDownRef.current = { x: event.originalEvent.clientX, y: event.originalEvent.clientY }; });
      map.on("click", event => {
        const down = pointerDownRef.current;
        if (down && Math.hypot(event.originalEvent.clientX - down.x, event.originalEvent.clientY - down.y) > 8) return;
        pickRef.current?.(event.lngLat.lat, event.lngLat.lng);
      });
      map.on("moveend", () => {
        if (providerRef.current !== "maplibre") return;
        const center = map.getCenter();
        if (map.getZoom() >= PICKER_APPLE_ZOOM_THRESHOLD && appleReadyRef.current && !switchingRef.current) switchProvider("apple", center.lat, center.lng, map.getZoom());
      });
      libreMapRef.current = map;
    }).catch(() => { if (!cancelled) setMapStatus("The map could not be loaded."); });
    loadPickerMapKit().then(mapkit => {
      if (cancelled || !appleContainerRef.current) return;
      const map = new mapkit.Map(appleContainerRef.current, {
        mapType: mapkit.Map.MapTypes.Hybrid,
        colorScheme: mapkit.Map.ColorSchemes.Dark,
        showsCompass: mapkit.FeatureVisibility.Visible,
        showsZoomControl: true,
        showsScale: mapkit.FeatureVisibility.Visible,
        showsMapTypeControl: false,
        showsUserLocationControl: true,
        showsPointsOfInterest: true,
        isRotationEnabled: true
      });
      map.addEventListener("region-change-end", () => {
        if (providerRef.current !== "apple" || switchingRef.current) return;
        const zoom = pickerSpanToZoom(map.region.span.latitudeDelta);
        if (zoom < PICKER_APPLE_ZOOM_THRESHOLD) switchProvider("maplibre", map.center.latitude, map.center.longitude, zoom);
      });
      const element = appleContainerRef.current;
      element.addEventListener("mousedown", event => { pointerDownRef.current = { x: event.clientX, y: event.clientY }; });
      element.addEventListener("mouseup", event => {
        if (providerRef.current !== "apple") return;
        const down = pointerDownRef.current;
        if (!down || Math.hypot(event.clientX - down.x, event.clientY - down.y) > 8) return;
        if (event.target.closest && event.target.closest(".mk-controls-container, .mk-annotation-container button, .mk-bottom-controls-container, .mk-top-controls-container")) return;
        const coordinate = map.convertPointOnPageToCoordinate(new DOMPoint(event.clientX, event.clientY));
        if (coordinate) pickRef.current?.(coordinate.latitude, coordinate.longitude);
      });
      appleMapRef.current = map;
      appleReadyRef.current = true;
      const current = libreMapRef.current;
      if (current && current.getZoom() >= PICKER_APPLE_ZOOM_THRESHOLD) {
        const center = current.getCenter();
        switchProvider("apple", center.lat, center.lng, current.getZoom());
      }
    }).catch(() => { appleReadyRef.current = false; });
    return () => {
      cancelled = true;
      window.removeEventListener("keydown", handleKey);
      pickerHost?.removeEventListener("wheel", claimWheel, { capture: true });
      try { libreMapRef.current?.remove(); } catch (error) { libreMapRef.current = null; }
      try { appleMapRef.current?.destroy(); } catch (error) { appleMapRef.current = null; }
      libreMapRef.current = null;
      appleMapRef.current = null;
      libreMarkerRef.current = null;
      appleMarkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (appleMapRef.current && window.mapkit && picked.lat !== null && picked.lat !== undefined) placeMarkers(picked.lat, picked.lon);
  }, [provider]);

  const runSearch = useCallback(async () => {
    const text = query.trim();
    if (text.length < 2) {
      setSearchStatus("Enter at least 2 characters to search.");
      setResults([]);
      return;
    }
    setSearchStatus("Searching");
    const useBackend = async () => {
      try {
        const response = await fetch(`${apiUrl("locationSearch")}?query=${encodeURIComponent(text)}`);
        const data = response.ok ? await response.json() : { results: [] };
        const mapped = (data.results || []).map(r => ({ label: r.label, lat: r.latitude, lon: r.longitude }));
        setResults(mapped);
        setSearchStatus(mapped.length ? "" : "No places matched that search.");
      } catch (error) {
        setResults([]);
        setSearchStatus("The location search is unavailable right now.");
      }
    };
    if (window.mapkit && window.__dinoMapkitInitialized) {
      try {
        new window.mapkit.Search({ language: "en-US" }).search(text, (error, data) => {
          if (error || !data?.places?.length) {
            useBackend();
            return;
          }
          setResults(data.places.slice(0, 6).map(p => ({ label: [p.name, p.formattedAddress].filter(Boolean).join(", "), lat: p.coordinate.latitude, lon: p.coordinate.longitude })));
          setSearchStatus("");
        });
        return;
      } catch (error) {
        await useBackend();
        return;
      }
    }
    await useBackend();
  }, [query]);

  const chooseResult = (result) => {
    pickPoint(result.lat, result.lon, result.label);
    flyTo(result.lat, result.lon, 10);
    setResults([]);
    setQuery("");
    setSearchStatus("");
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setSearchStatus("This browser does not support location access.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(position => {
      setLocating(false);
      pickPoint(position.coords.latitude, position.coords.longitude);
      flyTo(position.coords.latitude, position.coords.longitude, 11);
    }, () => {
      setLocating(false);
      setSearchStatus("Your location could not be determined. Check the browser's location permission.");
    }, { enableHighAccuracy: true, timeout: 10000 });
  };

  return (
    <div className="satEarthCondModalOverlay" onClick={onCancel}>
      <div className="satEarthCondModal satEarthCondPickerModal" onClick={(event) => event.stopPropagation()}>
        <div className="satEarthCondModalHeader">
          <h4 className="satEarthCondModalTitle">Choose Location</h4>
          <button type="button" className="satEarthCondModalClose" onClick={onCancel} aria-label="Close">
            <FontAwesomeIcon icon={faXmarkSquare} />
          </button>
        </div>
        <div className="satEarthCondPickerToolbar">
          <div className="satEarthCondPickerSearch">
            <input
              type="text"
              placeholder="Search Places"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") runSearch(); }}
              className="satEarthCondInput"
            />
            {results.length > 0 && (
              <div className="satEarthCondPickerResults">
                {results.map((result, index) => (
                  <button key={`${result.lat}_${result.lon}_${index}`} type="button" className="satEarthCondPickerResult" onClick={() => chooseResult(result)}>
                    <span className="satEarthCondPickerResultName">{result.label}</span>
                    <span className="satEarthCondPickerResultCoords">{result.lat.toFixed(3)}, {result.lon.toFixed(3)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="button" className="satEarthCondBtn satEarthCondBtnSecondary" onClick={runSearch}>
            <FontAwesomeIcon icon={faSearchPlus} /> Search
          </button>
          <button type="button" className="satEarthCondBtn satEarthCondBtnSecondary" onClick={useMyLocation} disabled={locating}>
            <FontAwesomeIcon icon={locating ? faSpinner : faMapMarkerAlt} spin={locating} /> My Location
          </button>
          {searchStatus && <span className="satEarthCondPickerStatus">{searchStatus}</span>}
        </div>
        <div className="satEarthCondPickerToolbar satWeatherPickerCoords">
          <label className="satWeatherPickerCoordField">
            <span>Latitude</span>
            <input type="number" step="0.0001" min="-90" max="90" value={latText} onChange={(event) => setLatText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && typedValid) { pickPoint(typedLat, typedLon); flyTo(typedLat, typedLon, 9); } }} className="satEarthCondInput" placeholder="-90 To 90" />
          </label>
          <label className="satWeatherPickerCoordField">
            <span>Longitude</span>
            <input type="number" step="0.0001" min="-180" max="180" value={lonText} onChange={(event) => setLonText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && typedValid) { pickPoint(typedLat, typedLon); flyTo(typedLat, typedLon, 9); } }} className="satEarthCondInput" placeholder="-180 To 180" />
          </label>
          <button type="button" className="satEarthCondBtn satEarthCondBtnSecondary" disabled={!typedValid} onClick={() => { pickPoint(typedLat, typedLon); flyTo(typedLat, typedLon, 9); }}>
            <FontAwesomeIcon icon={faMapMarkerAlt} /> Go To Coordinates
          </button>
        </div>
        <div className="satEarthCondPickerMap">
          <div ref={libreContainerRef} className="satEarthCondPickerCanvas" style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, width: "100%", height: "100%", display: provider === "maplibre" ? "block" : "none" }} />
          <div ref={appleContainerRef} className="satEarthCondPickerCanvas" style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, width: "100%", height: "100%", display: provider === "apple" ? "block" : "none" }} />
          {mapStatus && <div className="satEarthCondPickerOverlayStatus">{mapStatus}</div>}
          <div className="satEarthCondPickerHint">Click Anywhere To Drop A Pin</div>
        </div>
        <div className="satEarthCondPickerFooter">
          <div className="satEarthCondPickerSelection">
            <span className="satEarthCondPickerSelectionLabel">Selected Location</span>
            <span className="satEarthCondPickerSelectionValue">
              {labelLoading ? "Looking Up Place Name" : picked.label || "Unnamed Location"}
            </span>
            <span className="satEarthCondPickerSelectionCoords">
              {picked.lat !== null && picked.lat !== undefined ? `${picked.lat.toFixed(4)}°, ${picked.lon.toFixed(4)}°` : "—"}
            </span>
          </div>
          <div className="satEarthCondPickerActions">
            <button type="button" className="satEarthCondBtn satEarthCondBtnSecondary" onClick={onCancel}>Cancel</button>
            <button type="button" className="satEarthCondBtn satEarthCondBtnSecondary" onClick={() => onConfirm(picked)} disabled={picked.lat === null || picked.lat === undefined}>
              <FontAwesomeIcon icon={faSquareCheck} /> Use This Location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const SatelliteFeeds = () => {
  const navigate = useNavigate();
  const { token, loading: authLoading } = useAuth();
  const [feeds, setFeeds] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [unavailable, setUnavailable] = useState([]);
  const [registryLoading, setRegistryLoading] = useState(true);
  useEffect(() => {
    if (!authLoading && !token) navigate("/login");
  }, [authLoading, token, navigate]);

  const [errors, setErrors] = useState([]);
  const [showErrors, setShowErrors] = useState(false);
  const [copiedErrors, setCopiedErrors] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterFeedType, setFilterFeedType] = useState("all");
  const [filterLive, setFilterLive] = useState("all");
  const [sortBy, setSortBy] = useState("featured");
  const [filterSource, setFilterSource] = useState("all");

  const [harvestFeeds, setHarvestFeeds] = useState([]);
  const [harvestHealth, setHarvestHealth] = useState(null);
  const [harvestProductError, setHarvestProductError] = useState(null);
  const [harvestHealthError, setHarvestHealthError] = useState(null);
  const [harvestHidden, setHarvestHidden] = useState(0);
  const harvestListenersRef = useRef(new Set());

  const [selectedFeed, setSelectedFeed] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [theme, setTheme] = useState("dark");

  const [diagnosticsExpanded, setDiagnosticsExpanded] = useState(false);
  const [hudVisible, setHudVisible] = useState(false);
  const [dossierFeed, setDossierFeed] = useState(null);
  const [showLeads, setShowLeads] = useState(false);
  const [expandedWarnings, setExpandedWarnings] = useState({});
  const toggleWarning = (key) => setExpandedWarnings((current) => ({ ...current, [key]: !current[key] }));

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [layoutVisibility, setLayoutVisibility] = useState(DEFAULT_LAYOUT);
  const [expandedView, setExpandedView] = useState(null);
  const [legendCollapsed, setLegendCollapsed] = useState(false);
  const [observerLocation, setObserverLocation] = useState(null);
  const [orgid] = useState(localStorage.getItem("orgid") || "default_org");
  const [username] = useState(localStorage.getItem("username") || "default_user");
  const [areas, setAreas] = useState([]);
  const [areasLoaded, setAreasLoaded] = useState(false);
  const [selectedAreaId, setSelectedAreaId] = useState(null);
  const [editingAreaId, setEditingAreaId] = useState(null);
  const [areaFilterActive, setAreaFilterActive] = useState(false);
  const [areaFormData, setAreaFormData] = useState({ ...INITIAL_AREA_FORM });
  const [isGeocodingArea, setIsGeocodingArea] = useState(false);
  const [areaModalOpen, setAreaModalOpen] = useState(false);
  const [stateRestored, setStateRestored] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [apiSuccess, setApiSuccess] = useState(null);
  const [alertsData, setAlertsData] = useState(null);
  const [alertsError, setAlertsError] = useState(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationQuery, setLocationQuery] = useState("");
  const [locationResults, setLocationResults] = useState([]);
  const [locationSearchStatus, setLocationSearchStatus] = useState("");
  const [showAlertsPanel, setShowAlertsPanel] = useState(false);
  const [expandedAlertKey, setExpandedAlertKey] = useState(null);
  const soundsEnabledRef = useRef(false);

  const showNotification = useCallback((message, type = "success") => {
    const setter = type === "success" ? setApiSuccess : setApiError;
    setter(message);
    setTimeout(() => setter(null), type === "success" ? 4000 : 5000);
  }, []);

  const apiFetch = useCallback(async (url, options = {}) => {
    const response = await fetch(url, options);
    try {
      return await response.json();
    } catch (error) {
      return { success: false, message: `Server returned a non-JSON response with status ${response.status}.` };
    }
  }, []);

  const apiFetchWithStatus = useCallback(async (url, options = {}) => {
    const response = await fetch(url, options);
    let data;
    try {
      data = await response.json();
    } catch (error) {
      data = { success: false, message: `Server returned a non-JSON response with status ${response.status}.` };
    }
    return { status: response.status, data };
  }, []);

  const fetchAreas = useCallback(async () => {
    if (!orgid || !username) return;
    try {
      const data = await apiFetch(`${apiUrl("areas")}?orgid=${encodeURIComponent(orgid)}&username=${encodeURIComponent(username)}`);
      if (data && data.success && Array.isArray(data.areas)) {
        setAreas(data.areas);
        setSelectedAreaId((prev) => (prev && data.areas.some((area) => area.area_id === prev) ? prev : (data.areas[0] ? data.areas[0].area_id : null)));
      }
    } catch (error) { }
    setAreasLoaded(true);
  }, [orgid, username, apiFetch]);

  const saveAreaToBackend = useCallback(async (area, areaId) => {
    if (!orgid || !username || !area) return null;
    try {
      const url = areaId ? `${apiUrl("areas")}/${encodeURIComponent(areaId)}` : apiUrl("areas");
      const { status, data } = await apiFetchWithStatus(url, {
        method: areaId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgid, username, ...area, filter_active: true })
      });
      if ((status !== 200 && status !== 201) || !data || !data.success) {
        showNotification((data && data.message) || "The monitored area could not be saved.", "error");
        return null;
      }
      return data.area;
    } catch (error) {
      showNotification("A network error prevented saving the monitored area.", "error");
      return null;
    }
  }, [orgid, username, apiFetchWithStatus, showNotification]);

  const deleteAreaFromBackend = useCallback(async (areaId) => {
    if (!orgid || !username || !areaId) return false;
    try {
      const data = await apiFetch(`${apiUrl("areas")}/${encodeURIComponent(areaId)}?orgid=${encodeURIComponent(orgid)}&username=${encodeURIComponent(username)}`, { method: "DELETE" });
      return Boolean(data && data.success);
    } catch (error) {
      return false;
    }
  }, [orgid, username, apiFetch]);

  useEffect(() => {
    fetchAreas();
  }, [fetchAreas]);

  const userArea = useMemo(() => areas.find((area) => area.area_id === selectedAreaId) || null, [areas, selectedAreaId]);
  const activeAreas = areaFilterActive && areas.length ? areas : null;
  const activeAreasLabel = activeAreas ? (activeAreas.length === 1 ? describeArea(activeAreas[0]) : `My ${activeAreas.length} Areas`) : null;
  const locationName = observerLocation ? observerLocation.label || CUSTOM_LOCATION_LABEL : null;

  const setLocation = useCallback((lat, lon, label) => {
    setObserverLocation((current) => ({ lat: Number(lat), lon: Number(lon), alt: current && Number.isFinite(current.alt) ? current.alt : 0, label: label || CUSTOM_LOCATION_LABEL }));
  }, []);

  const searchLocations = useCallback(async () => {
    const query = locationQuery.trim();
    if (query.length < 2) {
      setLocationSearchStatus("Enter at least 2 characters to search.");
      setLocationResults([]);
      return;
    }
    setLocationSearchStatus("Searching");
    try {
      const response = await fetch(`${apiUrl("locationSearch")}?query=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error(`The server returned status ${response.status}.`);
      const data = await response.json();
      setLocationResults(data.results || []);
      setLocationSearchStatus((data.results || []).length ? "" : "No places matched that search.");
    } catch (error) {
      setLocationResults([]);
      setLocationSearchStatus("The location search is unavailable right now.");
    }
  }, [locationQuery]);

  const selectSearchResult = useCallback((result) => {
    setLocation(result.latitude, result.longitude, result.label);
    setLocationResults([]);
    setLocationQuery("");
    setLocationSearchStatus("");
  }, [setLocation]);

  const handleAreaFormChange = useCallback((field, value) => setAreaFormData((prev) => ({ ...prev, [field]: value })), []);

  const openAreaModal = useCallback((area) => {
    setEditingAreaId(area ? area.area_id : null);
    if (area && area.mode === "point_radius") {
      setAreaFormData({
        ...INITIAL_AREA_FORM,
        mode: "point_radius",
        name: area.name || "",
        address: area.address || "",
        latitude: area.latitude.toString(),
        longitude: area.longitude.toString(),
        radius_km: area.radius_km.toString()
      });
    } else if (area && area.mode === "bbox") {
      setAreaFormData({
        ...INITIAL_AREA_FORM,
        mode: "bbox",
        name: area.name || "",
        min_lat: area.min_lat.toString(),
        max_lat: area.max_lat.toString(),
        min_lng: area.min_lng.toString(),
        max_lng: area.max_lng.toString()
      });
    } else {
      setAreaFormData({ ...INITIAL_AREA_FORM });
    }
    setAreaModalOpen(true);
  }, []);

  const handleGeocodeArea = useCallback(async () => {
    const query = (areaFormData.address || "").trim();
    if (!query) {
      showNotification("Enter an address to geocode.", "error");
      return;
    }
    setIsGeocodingArea(true);
    try {
      const response = await fetch(`${SOURCES.geocoding.nominatim}?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`, { headers: { "User-Agent": SOURCES.geocoding.userAgent } });
      if (!response.ok) throw new Error("The geocoding service returned an error.");
      const results = await response.json();
      if (!results.length) {
        showNotification("The address was not found. Try a more specific query.", "error");
        return;
      }
      const place = results[0];
      const lat = parseFloat(place.lat);
      const lng = parseFloat(place.lon);
      const address = place.address || {};
      const friendlyName = address.city || address.town || address.village || address.county || (place.display_name ? place.display_name.split(",")[0] : "") || query;
      setAreaFormData((prev) => ({
        ...prev,
        latitude: lat.toFixed(6),
        longitude: lng.toFixed(6),
        name: prev.name && prev.name.trim() ? prev.name : friendlyName
      }));
      showNotification(`The address was geocoded to ${place.display_name ? place.display_name.substring(0, 80) : `${lat}, ${lng}`}.`);
    } catch (error) {
      showNotification("The address could not be geocoded. Check your network.", "error");
    } finally {
      setIsGeocodingArea(false);
    }
  }, [areaFormData.address, showNotification]);

  const useSelectedLocationForArea = useCallback(() => {
    if (!observerLocation) {
      showNotification("Set a location first.", "error");
      return;
    }
    setAreaFormData((prev) => ({ ...prev, latitude: observerLocation.lat.toFixed(6), longitude: observerLocation.lon.toFixed(6), name: prev.name && prev.name.trim() ? prev.name : observerLocation.label === CUSTOM_LOCATION_LABEL ? "" : observerLocation.label || "" }));
  }, [observerLocation, showNotification]);

  const showArea = useCallback((area) => {
    const center = areaCenter(area);
    setLocation(Number(center.lat.toFixed(4)), Number(center.lon.toFixed(4)), area.name && area.name.trim() ? area.name.trim() : describeArea(area));
  }, [setLocation]);

  const handleSaveArea = useCallback(async (activateImmediately = true) => {
    let area = null;
    if (areaFormData.mode === "point_radius") {
      const lat = parseFloat(areaFormData.latitude);
      const lng = parseFloat(areaFormData.longitude);
      const radius = parseFloat(areaFormData.radius_km);
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        showNotification("Latitude and longitude must be valid coordinates.", "error");
        return;
      }
      if (isNaN(radius) || radius <= 0 || radius > 10000) {
        showNotification("Radius must be between 1 and 10000 km.", "error");
        return;
      }
      area = { mode: "point_radius", name: (areaFormData.name || "").trim(), address: (areaFormData.address || "").trim(), latitude: lat, longitude: lng, radius_km: radius };
    } else if (areaFormData.mode === "bbox") {
      const minLat = parseFloat(areaFormData.min_lat);
      const maxLat = parseFloat(areaFormData.max_lat);
      const minLng = parseFloat(areaFormData.min_lng);
      const maxLng = parseFloat(areaFormData.max_lng);
      if ([minLat, maxLat, minLng, maxLng].some((value) => isNaN(value))) {
        showNotification("All bounding box coordinates are required.", "error");
        return;
      }
      if (minLat >= maxLat || minLng >= maxLng) {
        showNotification("Min coordinates must be less than max coordinates.", "error");
        return;
      }
      if (minLat < -90 || maxLat > 90 || minLng < -180 || maxLng > 180) {
        showNotification("Coordinates must be in valid lat/lng ranges.", "error");
        return;
      }
      area = { mode: "bbox", name: (areaFormData.name || "").trim(), min_lat: minLat, max_lat: maxLat, min_lng: minLng, max_lng: maxLng };
    }
    if (!area) return;
    const saved = await saveAreaToBackend(area, editingAreaId);
    if (!saved) return;
    setAreas((prev) => (editingAreaId ? prev.map((item) => (item.area_id === saved.area_id ? saved : item)) : [...prev, saved]));
    setSelectedAreaId(saved.area_id);
    if (activateImmediately) setAreaFilterActive(true);
    setAreaModalOpen(false);
    setEditingAreaId(null);
    showNotification(`The monitored area ${describeArea(saved)} was saved.`);
    showArea(saved);
  }, [areaFormData, editingAreaId, showNotification, saveAreaToBackend, showArea]);

  const deleteArea = useCallback(async (areaId) => {
    if (!areaId) return;
    const deleted = await deleteAreaFromBackend(areaId);
    if (!deleted) {
      showNotification("The monitored area could not be deleted.", "error");
      return;
    }
    setAreas((prev) => {
      const remaining = prev.filter((area) => area.area_id !== areaId);
      setSelectedAreaId((current) => (current === areaId ? (remaining[0] ? remaining[0].area_id : null) : current));
      return remaining;
    });
    setAreaModalOpen(false);
    setEditingAreaId(null);
    showNotification("The monitored area was deleted.");
  }, [showNotification, deleteAreaFromBackend]);

  const selectArea = useCallback((area) => {
    setSelectedAreaId(area.area_id);
    showArea(area);
  }, [showArea]);

  const chooseAlertScope = useCallback((scope) => {
    if (scope === "areas" && !userArea) {
      showNotification("Add a monitored area first.", "error");
      openAreaModal(null);
      return;
    }
    setAreaFilterActive(scope === "areas");
  }, [userArea, openAreaModal, showNotification]);

  const alertPoints = useMemo(() => [
    observerLocation ? `selected:${observerLocation.lat.toFixed(4)}:${observerLocation.lon.toFixed(4)}` : null,
    ...areas.map((area) => {
      const center = areaCenter(area);
      return `${area.area_id}:${center.lat.toFixed(4)}:${center.lon.toFixed(4)}`;
    })
  ].filter(Boolean).join(";"), [observerLocation, areas]);

  const loadAlerts = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl("feedAlerts")}?points=${encodeURIComponent(alertPoints)}`);
      const data = await response.json().catch(() => null);
      if (!response.ok || !data || !data.success) throw new Error((data && data.message) || `The alerts request returned status ${response.status}.`);
      setAlertsData(data);
      setAlertsError(null);
    } catch (error) {
      setAlertsError(`The feed alerts could not be loaded because of the error "${errorText(error)}".`);
    }
  }, [alertPoints]);

  useEffect(() => {
    if (authLoading || !stateRestored) return undefined;
    loadAlerts();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible" || soundsEnabledRef.current) loadAlerts();
    }, SOURCES.alerts.refreshMs);
    return () => clearInterval(timer);
  }, [authLoading, stateRestored, loadAlerts]);

  const alertItems = useMemo(() => {
    if (!alertsData) return null;
    const placeLabel = (pointId) => {
      if (pointId === "selected") return observerLocation ? observerLocation.label || CUSTOM_LOCATION_LABEL : null;
      const area = areas.find((entry) => entry.area_id === pointId);
      return area ? describeArea(area) : null;
    };
    const list = [];
    for (const alert of alertsData.alerts || []) {
      if (alert.global !== false) list.push({ ...alert, key: `${alert.identity}|${alert.severity}`, placeId: null, placeLabel: null });
      if (alert.kind === "mesoSector") {
        for (const [pointId, distanceKm] of Object.entries(alert.distances || {})) {
          const label = placeLabel(pointId);
          if (!label || distanceKm > alert.nearRadiusKm) continue;
          list.push({
            ...alert,
            kind: "mesoNear",
            identity: `near|${alert.identity}|${pointId}`,
            key: `near|${alert.identity}|${pointId}|${alert.severity}`,
            title: `${alert.title} Over ${label}`,
            message: `${alert.message} The sector center is ${distanceKm.toLocaleString()} km from ${label}, so ${label} is inside the one-minute imaging area.`,
            placeId: pointId,
            placeLabel: label,
            distanceKm
          });
        }
      }
      if (alert.kind === "aurora") {
        for (const [pointId, point] of Object.entries(alert.points || {})) {
          const label = placeLabel(pointId);
          if (!label || !point || !point.active) continue;
          const overhead = point.overheadPercent >= point.horizonPercent;
          list.push({
            ...alert,
            kind: "auroraNear",
            identity: `near|${alert.identity}|${pointId}`,
            key: `near|${alert.identity}|${pointId}|${point.severity}`,
            severity: point.severity,
            title: overhead ? `Aurora Possible Over ${label}` : `Aurora Possible On The Horizon From ${label}`,
            message: `The NOAA OVATION nowcast gives a ${point.overheadPercent}% chance of visible aurora directly over ${label} and up to ${point.horizonPercent}% within viewing distance, and the Sun is ${Math.abs(point.sunAltitudeDeg)}° below the horizon there.`,
            placeId: pointId,
            placeLabel: label,
            aurora: point
          });
        }
      }
    }
    return list.sort((a, b) => (ALERT_SEVERITY_ORDER[a.severity] ?? 5) - (ALERT_SEVERITY_ORDER[b.severity] ?? 5) || String(a.eventAt || "").localeCompare(String(b.eventAt || "")));
  }, [alertsData, observerLocation, areas]);

  const scopeIds = useMemo(() => (activeAreas ? new Set(activeAreas.map((area) => area.area_id)) : new Set(["selected"])), [activeAreas]);
  const bellItems = useMemo(() => (alertItems || []).filter((item) => !item.placeId || scopeIds.has(item.placeId)), [alertItems, scopeIds]);
  const bellKeys = useMemo(() => new Set(bellItems.map((item) => item.key)), [bellItems]);
  const soundInScope = (item) => bellKeys.has(item.key);
  const soundScopeKey = useMemo(() => bellItems.map((item) => item.key).join(","), [bellItems]);

  const areaCounts = useMemo(() => {
    const counts = {};
    for (const area of areas) {
      const inside = (alertItems || []).filter((item) => !item.placeId || item.placeId === area.area_id);
      counts[area.area_id] = { total: inside.length, critical: inside.filter((item) => item.severity === "CRITICAL").length, top: inside[0] ? inside[0].severity : null };
    }
    return counts;
  }, [areas, alertItems]);

  const sounds = useAlertSounds({
    defaults: SOURCES.sounds.defaults,
    ready: stateRestored && areasLoaded,
    items: alertsData ? bellItems : null,
    inScope: soundInScope,
    scopeKey: soundScopeKey,
    ignoreLevel: true,
    getKey: alertItemKey,
    getLevel: alertSoundLevel,
    getId: alertItemIdentity,
    describe: alertSoundMessage,
    repeatMs: SOURCES.sounds.repeatGapSeconds * 1000,
    aheadSeconds: SOURCES.sounds.scheduleAheadSeconds,
    topUpMs: SOURCES.sounds.topUpSeconds * 1000
  });

  useEffect(() => {
    soundsEnabledRef.current = sounds.settings.enabled;
  }, [sounds.settings.enabled]);

  const [ackOpen, setAckOpen] = useState(false);
  const [ackReview, setAckReview] = useState(false);
  const [ackIndex, setAckIndex] = useState(0);
  const [ackAnalyses, setAckAnalyses] = useState({});
  const ackQueue = sounds.queue;
  const ackKeysRef = useRef(new Set());
  const pendingKeys = useMemo(() => new Set(ackQueue.filter((entry) => !entry.ended).map((entry) => entry.key)), [ackQueue]);

  useEffect(() => {
    const firstNew = ackQueue.findIndex((entry) => !ackKeysRef.current.has(entry.key));
    ackKeysRef.current = new Set(ackQueue.map((entry) => entry.key));
    if (!ackQueue.length && !ackReview) setAckOpen(false);
    if (firstNew >= 0 && !ackReview) {
      setAckOpen(true);
      setAckIndex(firstNew);
    }
  }, [ackQueue, ackReview]);

  const [ackHistory, setAckHistory] = useState([]);

  useEffect(() => {
    if (!ackQueue.length) return;
    setAckHistory((current) => {
      const known = new Set(current.map((entry) => entry.key));
      const added = ackQueue.filter((entry) => !known.has(entry.key));
      if (!added.length) return current;
      return [...added, ...current].slice(0, 200);
    });
  }, [ackQueue]);

  const ackPendingKeys = useMemo(() => new Set(ackQueue.map((entry) => entry.key)), [ackQueue]);
  const ackReviewList = useMemo(() => {
    const live = (bellItems || []).map((item) => ({ key: alertItemKey(item), id: alertItemIdentity(item), item, level: alertSoundLevel(item) || ALERT_SOUND_LEVELS[0], ended: false, updated: false, at: Date.now(), message: alertSoundMessage(item, false) }));
    const known = new Set(live.map((entry) => entry.key));
    return [...live, ...ackHistory.filter((entry) => !known.has(entry.key) && (!entry.item.placeId || scopeIds.has(entry.item.placeId)))];
  }, [bellItems, ackHistory, scopeIds]);
  const ackList = ackReview ? ackReviewList : ackQueue;

  useEffect(() => {
    setAckIndex((index) => Math.max(0, Math.min(index, ackList.length - 1)));
  }, [ackList]);

  const closeAckModal = useCallback(() => {
    setAckOpen(false);
    setAckReview(false);
  }, []);

  const openAckReview = useCallback(() => {
    setAckReview(true);
    setAckOpen(true);
    setAckIndex(0);
  }, []);

  const ackEntry = ackOpen && ackList.length ? ackList[Math.min(ackIndex, ackList.length - 1)] : null;

  const ackRequestedRef = useRef(new Set());

  const requestAnalysis = useCallback((item) => {
    if (ackRequestedRef.current.has(item.key)) return;
    ackRequestedRef.current.add(item.key);
    setAckAnalyses((current) => ({ ...current, [item.key]: { loading: true } }));
    const baseIdentity = item.placeId ? item.identity.split("|").slice(1, -1).join("|") : item.identity;
    const nearby = (alertItems || []).filter((entry) => entry.placeId && entry.identity.startsWith(`near|${baseIdentity}|`)).map((entry) => ({ label: entry.placeLabel, distanceKm: entry.distanceKm }));
    fetch(apiUrl("alertAnalysis"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alert: { key: item.key, kind: item.kind, title: item.title, message: item.message, severity: item.severity, source: item.source, issuedAt: item.issuedAt, eventAt: item.eventAt, expiresAt: item.expiresAt, lat: item.lat, lon: item.lon, nearby, details: item.details || {} } })
    })
      .then((response) => response.json().catch(() => null).then((data) => {
        if (!response.ok || !data || !data.success) throw new Error((data && data.message) || `The analysis request returned status ${response.status}.`);
        return data;
      }))
      .then((data) => setAckAnalyses((current) => ({ ...current, [item.key]: { data: data.analysis } })))
      .catch((error) => setAckAnalyses((current) => ({ ...current, [item.key]: { error: errorText(error) } })));
  }, [alertItems]);

  useEffect(() => {
    for (const entry of ackQueue) if (!entry.ended) requestAnalysis(entry.item);
  }, [ackQueue, requestAnalysis]);

  useEffect(() => {
    if (!showAlertsPanel || !expandedAlertKey) return;
    const item = bellItems.find((entry) => entry.key === expandedAlertKey);
    if (item) requestAnalysis(item);
  }, [showAlertsPanel, expandedAlertKey, bellItems, requestAnalysis]);

  useEffect(() => {
    if (!stateRestored || !areas.length) return;
    if (!selectedAreaId || !areas.some((area) => area.area_id === selectedAreaId)) setSelectedAreaId(areas[0].area_id);
  }, [stateRestored, areas, selectedAreaId]);


  const [virtualScrollOffset, setVirtualScrollOffset] = useState(0);

  const virtualScrollRef = useRef(null);
  const eventSourceRef = useRef(null);

  useEffect(() => {
    document.body.className = `satellite-theme-${theme}`;
    return () => { document.body.className = ""; };
  }, [theme]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, PERFORMANCE_CONSTANTS.SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchTerm]);

  const fetchRegistry = useCallback((force = false) => {
    if (eventSourceRef.current) {
      try { eventSourceRef.current.close(); } catch (error) {}
      eventSourceRef.current = null;
    }
    setRegistryLoading(true);
    setErrors([]);
    if (force) {
      setFeeds([]);
      setMetadata(null);
      setUnavailable([]);
    }

    const url = `${import.meta.env.VITE_API_BASE_URL}/feed-registry-stream${force ? "?force=1" : ""}`;
    let eventSource;
    try {
      eventSource = new EventSource(url);
    } catch (error) {
      setRegistryLoading(false);
      setErrors([`The registry stream could not be opened because of the error "${String(error.message).replace(/\.$/, "")}".`]);
      return;
    }
    eventSourceRef.current = eventSource;

    let helloReceived = false;
    const accumulator = [];
    const seen = new Set();

    const connectionTimeout = setTimeout(() => {
      if (!helloReceived) {
        setErrors(prev => [...prev, "The registry stream connection timed out."]);
        setRegistryLoading(false);
        try { eventSource.close(); } catch (error) {}
        if (eventSourceRef.current === eventSource) eventSourceRef.current = null;
      }
    }, 120000);

    eventSource.addEventListener("hello", () => {
      helloReceived = true;
      clearTimeout(connectionTimeout);
    });

    eventSource.addEventListener("batch", (event) => {
      try {
        const data = JSON.parse(event.data);
        if (!data.feeds || data.feeds.length === 0) return;
        const additions = [];
        for (const f of data.feeds) {
          if (seen.has(f.id)) continue;
          seen.add(f.id);
          accumulator.push(f);
          additions.push(f);
        }
        if (additions.length > 0) {
          setFeeds(prev => {
            const indexById = new Map(prev.map((feed, index) => [feed.id, index]));
            const next = prev.slice();
            for (const feed of additions) {
              if (indexById.has(feed.id)) {
                next[indexById.get(feed.id)] = feed;
              } else {
                indexById.set(feed.id, next.length);
                next.push(feed);
              }
            }
            return next;
          });
        }
      } catch (error) {}
    });

    eventSource.addEventListener("source-error", (event) => {
      try {
        const data = JSON.parse(event.data);
        setErrors(prev => [...prev, `${data.source}: ${data.error}`]);
      } catch (error) {}
    });

    eventSource.addEventListener("done", (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.metadata) setMetadata(data.metadata);
        if (data.unavailable) setUnavailable(data.unavailable);
      } catch (error) {}
      if (seen.size > 0) setFeeds(prev => prev.filter(feed => seen.has(feed.id)));
      setRegistryLoading(false);
      clearTimeout(connectionTimeout);
      try { eventSource.close(); } catch (error) {}
      if (eventSourceRef.current === eventSource) eventSourceRef.current = null;
    });

    eventSource.onerror = () => {
      if (eventSource.readyState === EventSource.CLOSED) {
        setRegistryLoading(false);
        clearTimeout(connectionTimeout);
        if (eventSourceRef.current === eventSource) eventSourceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    fetchRegistry(false);
    return () => {
      if (eventSourceRef.current) {
        try { eventSourceRef.current.close(); } catch (error) {}
        eventSourceRef.current = null;
      }
    };
  }, [fetchRegistry]);

  const fetchHarvestProducts = useCallback(async () => {
    try {
      const collected = [];
      let offset = 0;
      let total = Infinity;
      while (offset < total) {
        const response = await fetch(`${HARVEST_BASE_URL}/products?domain=${HARVEST_DOMAIN}&limit=${HARVEST_PRODUCT_PAGE}&offset=${offset}`);
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.success) throw new Error(data.message || `The products request failed with status ${response.status}.`);
        total = data.total;
        collected.push(...data.products);
        if (!data.products.length) break;
        offset += data.products.length;
      }
      const grouped = groupHarvestProducts(collected);
      setHarvestFeeds(grouped.feeds);
      setHarvestHidden(grouped.hidden);
      setHarvestProductError(null);
    } catch (error) {
      setHarvestProductError(`The harvester products could not be loaded because of the error "${errorText(error)}".`);
    }
  }, []);

  const fetchHarvestHealth = useCallback(async () => {
    try {
      const response = await fetch(`${HARVEST_BASE_URL}/health`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.message || `The health request failed with status ${response.status}.`);
      setHarvestHealth(data);
      setHarvestHealthError(null);
    } catch (error) {
      setHarvestHealth(null);
      setHarvestHealthError(`The harvester status could not be loaded because of the error "${errorText(error)}".`);
    }
  }, []);

  useEffect(() => {
    fetchHarvestProducts();
    fetchHarvestHealth();
    const productTimer = setInterval(fetchHarvestProducts, PERFORMANCE_CONSTANTS.HARVEST_PRODUCTS_REFRESH_MS);
    const healthTimer = setInterval(fetchHarvestHealth, PERFORMANCE_CONSTANTS.HARVEST_HEALTH_REFRESH_MS);
    return () => {
      clearInterval(productTimer);
      clearInterval(healthTimer);
    };
  }, [fetchHarvestProducts, fetchHarvestHealth]);

  const subscribeHarvest = useCallback((listener) => {
    harvestListenersRef.current.add(listener);
    return () => harvestListenersRef.current.delete(listener);
  }, []);

  useEffect(() => {
    let source = null;
    let reconnectTimer = null;
    let closed = false;
    const connect = () => {
      if (closed) return;
      try {
        source = new EventSource(`${HARVEST_BASE_URL}/stream?domain=${HARVEST_DOMAIN}`);
      } catch (error) {
        reconnectTimer = setTimeout(connect, PERFORMANCE_CONSTANTS.HARVEST_STREAM_RECONNECT_MS);
        return;
      }
      source.addEventListener("frame", (event) => {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch (error) {
          return;
        }
        setHarvestFeeds(prev => prev.map(feed => {
          const channels = feed.harvest.channels || [feed.harvest];
          if (!channels.some(channel => channel.productKey === data.productKey)) return feed;
          const newer = (current) => (!current || new Date(data.observedAt) > new Date(current) ? data.observedAt : current);
          const nextChannels = channels.map(channel => (channel.productKey === data.productKey ? { ...channel, frameCount: channel.frameCount + 1, lastFrameAt: newer(channel.lastFrameAt) } : channel));
          const frameCount = feed.harvest.frameCount + 1;
          const lastFrameAt = newer(feed.harvest.lastFrameAt);
          const primary = nextChannels.find(channel => channel.productKey === feed.harvest.productKey);
          return {
            ...feed,
            isLive: true,
            latestTimestamp: lastFrameAt,
            cadenceLabel: `${frameCount.toLocaleString()} ${frameCount === 1 ? "Frame" : "Frames"}`,
            harvest: { ...feed.harvest, ...(primary && channels.length === 1 ? primary : {}), frameCount, lastFrameAt, channels: nextChannels }
          };
        }));
        harvestListenersRef.current.forEach(listener => listener(data));
      });
      source.onerror = () => {
        if (closed || !source || source.readyState !== EventSource.CLOSED) return;
        try { source.close(); } catch (error) {}
        reconnectTimer = setTimeout(connect, PERFORMANCE_CONSTANTS.HARVEST_STREAM_RECONNECT_MS);
      };
    };
    connect();
    return () => {
      closed = true;
      if (source) {
        try { source.close(); } catch (error) {}
      }
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, []);

  const allFeeds = useMemo(() => feeds.concat(harvestFeeds), [feeds, harvestFeeds]);

  const harvestWarnings = useMemo(() => {
    const warnings = [];
    if (harvestProductError) warnings.push(harvestProductError);
    if (harvestHealthError) warnings.push(harvestHealthError);
    if (harvestHealth?.status === "Needs Schema" && harvestHealth.message) warnings.push(harvestHealth.message);
    for (const source of harvestHealth?.sources || []) {
      const quietSince = source.last_success_at ? Date.now() - new Date(source.last_success_at).getTime() : Infinity;
      if (source.enabled && source.error_streak >= 3 && source.last_error && quietSince > HARVEST_WARNING_GRACE_HOURS * 3600000) warnings.push(`${source.name}: ${source.last_error}`);
    }
    return warnings;
  }, [harvestProductError, harvestHealthError, harvestHealth]);

  const displayErrors = useMemo(() => errors.concat(harvestWarnings), [errors, harvestWarnings]);

  const harvestStats = useMemo(() => {
    const queue = harvestHealth?.queue || [];
    const sources = harvestHealth?.sources || [];
    return {
      products: harvestFeeds.length,
      channels: harvestFeeds.reduce((sum, feed) => sum + (feed.harvest.channels ? feed.harvest.channels.length : 1), 0),
      archived: harvestFeeds.filter(feed => feed.harvest.mode === "archive").length,
      frames: harvestFeeds.reduce((sum, feed) => sum + feed.harvest.frameCount, 0),
      due: queue.reduce((sum, row) => sum + (row.due || 0), 0),
      running: queue.reduce((sum, row) => sum + (row.running || 0), 0),
      sources: sources.filter(source => source.source_key !== "harvester-core").length,
      failing: sources.filter(source => source.enabled && source.error_streak >= 3).length
    };
  }, [harvestFeeds, harvestHealth]);

  const filteredFeeds = useMemo(() => {
    let result = allFeeds;
    if (debouncedSearchTerm) {
      const lower = debouncedSearchTerm.toLowerCase();
      result = result.filter(f =>
        f.name.toLowerCase().includes(lower) ||
        (f.spacecraft || "").toLowerCase().includes(lower) ||
        (f.operator || "").toLowerCase().includes(lower) ||
        (f.instrument || "").toLowerCase().includes(lower) ||
        (f.category || "").toLowerCase().includes(lower) ||
        String(f.noradId || "").includes(lower) ||
        (f.harvest?.productKey || "").toLowerCase().includes(lower)
      );
    }
    if (filterSource === "registry") {
      result = result.filter(f => !f.harvest);
    } else if (filterSource === "harvest") {
      result = result.filter(f => f.harvest);
    }
    if (filterCategory !== "all") {
      result = result.filter(f => f.category === filterCategory);
    }
    if (filterFeedType !== "all") {
      result = result.filter(f => f.feedType === filterFeedType);
    }
    if (filterLive === "live") {
      result = result.filter(f => f.isLive);
    } else if (filterLive === "archive") {
      result = result.filter(f => !f.isLive);
    }
    if (sortBy === "featured") {
      result = [...result].sort((a, b) => featureScore(b) - featureScore(a) || a.name.localeCompare(b.name));
    } else if (sortBy === "name") {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "category") {
      result = [...result].sort((a, b) => (a.category || "").localeCompare(b.category || "") || a.name.localeCompare(b.name));
    } else if (sortBy === "operator") {
      result = [...result].sort((a, b) => (a.operator || "").localeCompare(b.operator || "") || a.name.localeCompare(b.name));
    } else if (sortBy === "live") {
      result = [...result].sort((a, b) => (b.isLive ? 1 : 0) - (a.isLive ? 1 : 0) || a.name.localeCompare(b.name));
    }
    return result;
  }, [allFeeds, debouncedSearchTerm, filterCategory, filterFeedType, filterLive, filterSource, sortBy]);

  const distinctCategories = useMemo(() => {
    const set = new Set();
    allFeeds.forEach(f => { if (f.category) set.add(f.category); });
    return Array.from(set).sort();
  }, [allFeeds]);

  const distinctFeedTypes = useMemo(() => {
    const set = new Set();
    allFeeds.forEach(f => { if (f.feedType) set.add(f.feedType); });
    return Array.from(set).sort();
  }, [allFeeds]);

  const handleVirtualScroll = useCallback((e) => {
    setVirtualScrollOffset(e.target.scrollTop);
  }, []);

  const [virtualListHeight, setVirtualListHeight] = useState(0);

  useEffect(() => {
    const element = virtualScrollRef.current;
    if (!element || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(() => setVirtualListHeight(element.clientHeight));
    observer.observe(element);
    setVirtualListHeight(element.clientHeight);
    return () => observer.disconnect();
  }, [layoutVisibility.sidebar, sidebarCollapsed, registryLoading]);

  const getVirtualScrollItems = useMemo(() => {
    if (!virtualScrollRef.current) {
      return { visibleItems: filteredFeeds.slice(0, 20), startIndex: 0 };
    }
    const containerHeight = virtualListHeight || virtualScrollRef.current.clientHeight || 400;
    const itemHeight = PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT;
    const buffer = PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_BUFFER;
    const startIndex = Math.max(0, Math.floor(virtualScrollOffset / itemHeight) - buffer);
    const endIndex = Math.min(filteredFeeds.length - 1, Math.ceil((virtualScrollOffset + containerHeight) / itemHeight) + buffer);
    return { visibleItems: filteredFeeds.slice(startIndex, endIndex + 1), startIndex };
  }, [filteredFeeds, virtualScrollOffset, virtualListHeight]);

  const closeAllOverlays = useCallback(() => {
    setHudVisible(false);
    setDossierFeed(null);
    setDiagnosticsExpanded(false);
  }, []);

  const toggleHUD = useCallback(() => {
    if (hudVisible) {
      setHudVisible(false);
    } else {
      setDossierFeed(null);
      setDiagnosticsExpanded(false);
      setHudVisible(true);
    }
  }, [hudVisible]);

  const toggleDiagnostics = useCallback(() => {
    if (diagnosticsExpanded) {
      setDiagnosticsExpanded(false);
    } else {
      setHudVisible(false);
      setDossierFeed(null);
      setDiagnosticsExpanded(true);
    }
  }, [diagnosticsExpanded]);

  const openDossier = useCallback((feed) => {
    setHudVisible(false);
    setDiagnosticsExpanded(false);
    setDossierFeed(feed);
  }, []);

  const exportJSON = useCallback(() => {
    const exportData = {
      feeds: allFeeds,
      metadata: metadata,
      unavailable: unavailable,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "satellite_feeds.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [allFeeds, metadata, unavailable]);

  const exportCSV = useCallback(() => {
    let csv = "ID,Name,Spacecraft,Operator,Instrument,Category,FeedType,NoradId,IsLive,Coverage,Cadence,Available,HttpStatus\n";
    allFeeds.forEach(f => {
      csv += `${csvQuote(f.id)},${csvQuote(f.name)},${csvQuote(f.spacecraft)},${csvQuote(f.operator)},${csvQuote(f.instrument)},${csvQuote(f.category)},${csvQuote(f.feedType)},${csvQuote(f.noradId || "")},${f.isLive},${csvQuote(f.coverageRegime)},${csvQuote(f.cadenceLabel)},${f.availability?.ok ? "yes" : "no"},${f.availability?.status || ""}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "satellite_feeds.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [allFeeds]);

  const copyAllErrors = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(displayErrors.join("\n"));
      setCopiedErrors(true);
      setTimeout(() => setCopiedErrors(false), 2000);
    } catch (error) {}
  }, [displayErrors]);

  const { visibleItems, startIndex } = getVirtualScrollItems;

  const summaryStatus = !registryLoading && allFeeds.length === 0 ? "SEVERE" : displayErrors.length > 0 ? "ELEVATED" : "NOMINAL";
  const summaryStatusLabel = summaryStatus === "SEVERE" ? "Severe" : summaryStatus === "ELEVATED" ? "Elevated" : "Nominal";
  const liveFeedCount = allFeeds.filter(feed => feed.isLive).length;
  const feedTypeCount = (type) => allFeeds.filter(feed => feed.feedType === type).length;
  const harvestStatusLabel = harvestHealth?.status || (harvestHealthError ? "Unavailable" : "Loading");

  const saveStateDebounceRef = useRef(null);
  const restoredFeedRef = useRef(null);
  const replaceSoundSettings = sounds.replaceSettings;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await loadStateFromDB();
      if (cancelled) return;
      if (saved) {
        const pick = (key, setter, check) => {
          if (saved[key] !== undefined && saved[key] !== null && (!check || check(saved[key]))) setter(saved[key]);
        };
        const isBoolean = (value) => typeof value === "boolean";
        const isText = (value) => typeof value === "string";
        pick("theme", setTheme, (value) => value === "dark" || value === "neon");
        pick("autoRefresh", setAutoRefresh, isBoolean);
        pick("sidebarCollapsed", setSidebarCollapsed, isBoolean);
        pick("legendCollapsed", setLegendCollapsed, isBoolean);
        pick("layoutVisibility", (value) => setLayoutVisibility((current) => ({ ...current, ...value })), (value) => typeof value === "object");
        pick("expandedWarnings", setExpandedWarnings, (value) => typeof value === "object");
        pick("filterCategory", setFilterCategory, isText);
        pick("filterFeedType", setFilterFeedType, isText);
        pick("filterLive", setFilterLive, (value) => LIVE_FILTER_OPTIONS.some(([option]) => option === value));
        pick("filterSource", setFilterSource, (value) => SOURCE_FILTER_OPTIONS.some(([option]) => option === value));
        pick("sortBy", setSortBy, (value) => SORT_OPTIONS.some(([option]) => option === value));
        pick("observerLocation", setObserverLocation, (value) => typeof value === "object" && Number.isFinite(value.lat) && Number.isFinite(value.lon) && value.lat >= -90 && value.lat <= 90 && value.lon >= -180 && value.lon <= 180);
        pick("selectedAreaId", setSelectedAreaId, isText);
        pick("areaFilterActive", setAreaFilterActive, isBoolean);
        pick("sounds", replaceSoundSettings, (value) => typeof value === "object");
        if (isText(saved.selectedFeedId)) restoredFeedRef.current = saved.selectedFeedId;
      }
      setStateRestored(true);
      window.setTimeout(() => {
        if (sessionStorage.getItem(SOURCES.persistence.restoreFlag) === PAGE_LOAD_ID) sessionStorage.removeItem(SOURCES.persistence.restoreFlag);
      }, SOURCES.persistence.restoreSettleMs);
    })();
    return () => {
      cancelled = true;
    };
  }, [replaceSoundSettings]);

  useEffect(() => {
    if (!restoredFeedRef.current || !allFeeds.length) return;
    const feed = allFeeds.find((entry) => entry.id === restoredFeedRef.current);
    if (feed) {
      restoredFeedRef.current = null;
      setSelectedFeed(feed);
    } else if (!registryLoading && harvestFeeds.length) {
      restoredFeedRef.current = null;
    }
  }, [allFeeds, registryLoading, harvestFeeds.length]);

  useEffect(() => {
    if (!stateRestored) return undefined;
    if (saveStateDebounceRef.current) clearTimeout(saveStateDebounceRef.current);
    saveStateDebounceRef.current = setTimeout(() => {
      saveStateToDB({
        theme,
        autoRefresh,
        sidebarCollapsed,
        legendCollapsed,
        layoutVisibility,
        expandedWarnings,
        filterCategory,
        filterFeedType,
        filterLive,
        filterSource,
        sortBy,
        observerLocation,
        selectedAreaId,
        areaFilterActive,
        selectedFeedId: selectedFeed ? selectedFeed.id : restoredFeedRef.current,
        sounds: sounds.settings
      });
    }, SOURCES.persistence.saveDebounceMs);
    return () => clearTimeout(saveStateDebounceRef.current);
  }, [stateRestored, theme, autoRefresh, sidebarCollapsed, legendCollapsed, layoutVisibility, expandedWarnings, filterCategory, filterFeedType, filterLive, filterSource, sortBy, observerLocation, selectedAreaId, areaFilterActive, selectedFeed, sounds.settings]);

  const renderDetailFields = (fields, options = {}) => (options.columns !== 3 ? (
    <div className="satWeatherDetailList">
      {fields.filter(([, value]) => value !== undefined && value !== null && value !== "" && value !== "—").map(([label, value]) => (
        <div key={label} className="satWeatherDetailRow">
          <span className="satWeatherDetailRowLabel">{label}</span>
          <span className="satWeatherDetailRowValue">{String(value)}</span>
        </div>
      ))}
    </div>
  ) : (
    <div className={`satWeatherDetailFields ${options.columns === 3 ? "satWeatherDetailFieldsWide" : ""}`}>
      {fields.filter(([, value]) => value !== undefined && value !== null && value !== "" && value !== "—").map(([label, value]) => {
        const text = value === null || value === "" ? "—" : String(value);
        return (
          <div key={label} className={`satWeatherDetailField ${text.length > (options.fullAt || 9999) ? "satWeatherDetailFieldFull" : text.length > (options.wideAt || 22) ? "satWeatherDetailFieldWide" : ""}`}>
            <span className="satWeatherDetailLabel">{label}</span>
            <span className="satWeatherDetailValue">{text}</span>
          </div>
        );
      })}
    </div>
  ));

  const alertFeed = (item) => {
    if (!item.feedMatch) return null;
    let pattern;
    try {
      pattern = new RegExp(item.feedMatch, "i");
    } catch (error) {
      return null;
    }
    const matches = allFeeds.filter((feed) => pattern.test(`${feed.name} ${feed.spacecraft || ""} ${feed.instrument || ""} ${feed.harvest ? feed.harvest.productKey : ""}`));
    return matches.sort((a, b) => (b.isLive ? 1 : 0) - (a.isLive ? 1 : 0) || featureScore(b) - featureScore(a))[0] || null;
  };

  const showAlertDetails = (item) => {
    const feed = alertFeed(item);
    if (feed) {
      setShowAlertsPanel(false);
      closeAllOverlays();
      setSelectedFeed(feed);
      return;
    }
    setExpandedAlertKey(item.key);
    setShowAlertsPanel(true);
  };

  const openOfficialNotice = (item) => {
    if (item.url) window.open(item.url, "_blank", "noopener,noreferrer");
  };

  const renderAnalysis = (item, ended) => {
    const analysisState = ackAnalyses[item.key] || {};
    const analysis = analysisState.data;
    return (
      <div className="satWeatherAckAnalysis">
        {ended && <div className="satWeatherAckNote">This alert has ended, so no analysis is generated for it.</div>}
        {!ended && analysisState.loading && <div className="satWeatherAckNote"><FontAwesomeIcon icon={faSpinner} spin /> Generating Analysis</div>}
        {!ended && analysisState.error && <div className="satWeatherDetailError">{`The AI analysis is unavailable because of the error "${String(analysisState.error).replace(/\.$/, "")}".`}</div>}
        {analysis && (
          <>
            <p className="satWeatherAckSummary">{analysis.summary}</p>
            <div className="satWeatherAckColumns">
              <div className="satWeatherAckBlock">
                <div className="satWeatherAckBlockTitle">Risks</div>
                {analysis.threats.map((threat, index) => <p key={index}>{threat}</p>)}
              </div>
              <div className="satWeatherAckBlock">
                <div className="satWeatherAckBlockTitle">Recommended Actions</div>
                {analysis.actions.map((action, index) => <p key={index}>{action}</p>)}
              </div>
            </div>
            <div className="satWeatherAckColumns">
              <div className="satWeatherAckBlock">
                <div className="satWeatherAckBlockTitle">Timing</div>
                <p>{analysis.timing}</p>
              </div>
              <div className="satWeatherAckBlock">
                <div className="satWeatherAckBlockTitle">Confidence</div>
                <p>{analysis.confidence}</p>
              </div>
            </div>
            <div className="satWeatherAckFootnote">{`Generated By ${analysis.model} At ${new Date(analysis.generatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} From The Live Alert Data`}</div>
          </>
        )}
      </div>
    );
  };

  const renderAckModal = () => {
    if (!ackEntry) return null;
    const position = Math.min(ackIndex, ackList.length - 1);
    const pending = ackPendingKeys.has(ackEntry.key);
    const pendingCount = ackList.filter((item) => ackPendingKeys.has(item.key)).length;
    const item = ackEntry.item;
    const status = ackEntry.ended ? "Ended" : ackEntry.updated ? "Updated" : "New";
    const color = ackEntry.ended ? "#919baf" : ALERT_SEVERITY_COLORS[item.severity] || "#FF9500";
    return createPortal(
      <div className="satWeatherModalOverlay satWeatherAckOverlay">
        <div className="satWeatherModal satWeatherAckModal" onClick={(clickEvent) => clickEvent.stopPropagation()}>
          <div className="satWeatherModalHeader">
            <span>{`Alert ${position + 1} Of ${ackList.length}`}</span>
            <div className="satWeatherAckPager">
              {ackQueue.length > 1 && (
                <button type="button" className="satWeatherModalClose satWeatherAckAllButton" onClick={sounds.acknowledgeAll} title="Acknowledge Every Alert In The Queue"><FontAwesomeIcon icon={faCheckDouble} /> {`Acknowledge All (${ackQueue.length})`}</button>
              )}
              <button type="button" className="satWeatherModalClose" disabled={position <= 0} onClick={() => setAckIndex(position - 1)} title="Previous Alert"><FontAwesomeIcon icon={faBackwardStep} /></button>
              <button type="button" className="satWeatherModalClose" disabled={position >= ackList.length - 1} onClick={() => setAckIndex(position + 1)} title="Next Alert"><FontAwesomeIcon icon={faForwardStep} /></button>
              <button type="button" className="satWeatherModalClose" onClick={closeAckModal} title={ackReview ? "Close" : "Minimize Until The Next Alert"}><FontAwesomeIcon icon={faTimes} /></button>
            </div>
          </div>
          <div className="satWeatherModalContent">
            <div className="satWeatherAckTitle" style={{ borderLeftColor: color }}>
              <div className="satWeatherAckTitleRow">
                <span className="satWeatherAckEvent" style={{ color }}>{item.title}</span>
                <span className={`satWeatherAckStatus satWeatherAckStatus${status}`}>{status}</span>
              </div>
              <div className="satWeatherAckHeadline">{item.message}</div>
            </div>
            <div className="satWeatherAckSectionTitle">Alert Details</div>
            {renderDetailFields(alertFields(item), { columns: 3, wideAt: 26, fullAt: 40 })}
            <div className="satWeatherAckSectionTitle">AI Analysis</div>
            {renderAnalysis(item, ackEntry.ended)}
          </div>
          <div className="satWeatherAckActions">
            <span className="satWeatherAckRemaining">{!pending ? "Already Acknowledged" : pendingCount === 1 ? "Last Alert To Acknowledge" : `${pendingCount - 1} More To Acknowledge`}</span>
            <button type="button" className="satWeatherModalBtnSecondary" onClick={() => {
              closeAckModal();
              showAlertDetails(item);
            }}><FontAwesomeIcon icon={alertFeed(item) ? faSatelliteDish : faInfoCircle} /> {alertFeed(item) ? "View Feed" : "View Details"}</button>
            <button type="button" className="satWeatherModalBtnPrimary" disabled={!pending} onClick={() => sounds.acknowledge(ackEntry.key)}><FontAwesomeIcon icon={faCheck} /> {pending ? "Acknowledge" : "Acknowledged"}</button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  const renderAlertsPanel = () => {
    if (!showAlertsPanel) return null;
    return createPortal(
      <div className="satWeatherModalOverlay" onClick={() => setShowAlertsPanel(false)}>
        <div className="satWeatherModal" onClick={(clickEvent) => clickEvent.stopPropagation()}>
          <div className="satWeatherModalHeader">
            <span>{`Active Alerts (${bellItems.length})`}</span>
            <button type="button" className="satWeatherModalClose" onClick={() => setShowAlertsPanel(false)} title="Close"><FontAwesomeIcon icon={faTimes} /></button>
          </div>
          <div className="satWeatherModalContent">
            <div className="satWeatherAckSectionTitle">{activeAreas ? `Alerting For ${activeAreasLabel}` : `Alerting For ${locationName || "Global Events Only"}`}</div>
            {renderDetailFields((alertsData ? alertsData.sources : []).map((source) => [source.name, source.error ? `${source.status} | ${source.error}` : `${source.status}${source.checkedAt ? ` | Checked ${new Date(source.checkedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : ""}`]))}
            {alertsError && <div className="satWeatherDetailError">{alertsError}</div>}
            {bellItems.length === 0 ? (
              alertsError && !alertsData ? null : <div className="satWeatherAckNote">There are no active satellite product outage, mesoscale sector, solar flare, radio burst, or aurora alerts in this scope.</div>
            ) : bellItems.map((item) => {
              const color = ALERT_SEVERITY_COLORS[item.severity] || "#FF9500";
              const expanded = expandedAlertKey === item.key;
              return (
                <div key={item.key} className="satTrackerAlertEntry">
                  <button type="button" className="satWeatherAckTitle satTrackerAlertToggle" style={{ borderLeftColor: color }} onClick={() => setExpandedAlertKey(expanded ? null : item.key)}>
                    <div className="satWeatherAckTitleRow">
                      <span className="satWeatherAckEvent" style={{ color }}>{item.title}</span>
                      <span className={`satWeatherAckStatus ${pendingKeys.has(item.key) ? "satWeatherAckStatusNew" : "satWeatherAckStatusUpdated"}`}>{pendingKeys.has(item.key) ? "Unacknowledged" : titleCaseWords(item.severity.toLowerCase())}</span>
                    </div>
                    <div className="satWeatherAckHeadline">{item.message}</div>
                  </button>
                  {expanded && (
                    <>
                      {renderDetailFields(alertFields(item))}
                      {renderAnalysis(item, false)}
                      <div className="satWeatherModalActions">
                        {pendingKeys.has(item.key) && <button type="button" className="satWeatherModalBtnSecondary" onClick={() => sounds.acknowledge(item.key)}><FontAwesomeIcon icon={faCheck} /> Acknowledge</button>}
                        {item.url && <button type="button" className="satWeatherModalBtnSecondary" onClick={() => openOfficialNotice(item)}><FontAwesomeIcon icon={faLink} /> Official Notice</button>}
                        {alertFeed(item) && <button type="button" className="satWeatherModalBtnPrimary" onClick={() => showAlertDetails(item)}><FontAwesomeIcon icon={faSatelliteDish} /> View Feed</button>}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>,
      document.body
    );
  };

  const renderAlertControls = () => (
    <div className="satTrackerAlertControls">
      <div className="satWeatherAreaList">
        <div className="satWeatherAreaListHeader">
          <span className="satWeatherAreaListTitle"><FontAwesomeIcon icon={faMapPin} /> Monitored Areas</span>
          <button className="satWeatherAreaListButton" onClick={() => openAreaModal(null)} title="Add Area"><FontAwesomeIcon icon={faPlus} /></button>
        </div>
        {areas.length === 0 ? (
          <div className="satWeatherAreaListEmpty">Add an area to get an alert when aurora is possible over it or a GOES mesoscale sector is pointed at it.</div>
        ) : (
          <div className="satWeatherAreaListItems">
            {areas.map((area) => {
              const summary = areaCounts[area.area_id] || { total: 0, critical: 0, top: null };
              const isSelected = area.area_id === selectedAreaId;
              return (
                <div key={area.area_id} className={`satWeatherAreaListItem${isSelected ? " satWeatherAreaListItemSelected" : ""}`} onClick={() => selectArea(area)}>
                  <span className="satWeatherAreaListItemDot" style={{ backgroundColor: summary.top ? ALERT_SEVERITY_COLORS[summary.top] : alertsData ? "#4ecdc4" : "#3d4354" }} />
                  <div className="satWeatherAreaListItemInfo">
                    <span className="satWeatherAreaListItemName">{area.name || describeArea(area)}</span>
                    <span className="satWeatherAreaListItemMeta">{`${summary.total} Alert${summary.total === 1 ? "" : "s"} · ${summary.critical} Critical`}</span>
                  </div>
                  <button className="satWeatherAreaListButton" onClick={(event) => { event.stopPropagation(); openAreaModal(area); }} title="Edit Area"><FontAwesomeIcon icon={faEdit} /></button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Dropdown
        value={labelFor(ALERT_SCOPE_OPTIONS, activeAreas ? "areas" : "selected")}
        onChange={(option) => chooseAlertScope(valueFor(ALERT_SCOPE_OPTIONS, option))}
        options={ALERT_SCOPE_OPTIONS.map(([, label]) => label)}
        placeholder="Alert Scope"
      />
      <div className="satTrackerLocationSearch">
        <input
          type="text"
          placeholder="Search Places"
          value={locationQuery}
          onChange={(event) => setLocationQuery(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") searchLocations(); }}
          className="satEarthCondInput"
        />
        <button type="button" onClick={searchLocations} className="satEarthCondBtn satEarthCondBtnSecondary satWeatherBtnElide" title="Search Places">
          <FontAwesomeIcon icon={faSearchPlus} /> <span>Search</span>
        </button>
      </div>
      {locationSearchStatus && <div className="satEarthCondLocationSearchStatus">{locationSearchStatus}</div>}
      {locationResults.length > 0 && (
        <div className="satEarthCondLocationResults">
          {locationResults.map((result) => (
            <button key={`${result.latitude}_${result.longitude}`} type="button" className="satEarthCondLocationResult" onClick={() => selectSearchResult(result)}>
              <span className="satEarthCondLocationResultName">{result.label}</span>
              <span className="satEarthCondLocationResultCoords">{result.latitude.toFixed(3)}, {result.longitude.toFixed(3)}</span>
            </button>
          ))}
        </div>
      )}
      <button type="button" onClick={() => setShowLocationPicker(true)} className="satEarthCondBtn satEarthCondBtnSecondary satWeatherBtnElide" title="Choose A Location On The Map Or By Coordinates">
        <FontAwesomeIcon icon={faGlobeAmericas} /> <span>Set Location</span>
      </button>
      {observerLocation && (
        <div className="satWeatherLocationCurrent" title={`${locationName} | ${observerLocation.lat.toFixed(4)}°, ${observerLocation.lon.toFixed(4)}°`}>
          <span className="satWeatherLocationCurrentName">{locationName}</span>
          <span className="satWeatherLocationCurrentCoords">{`${observerLocation.lat.toFixed(4)}°, ${observerLocation.lon.toFixed(4)}°`}</span>
        </div>
      )}
    </div>
  );

  const renderSoundBar = () => (
    <div className="satWeatherSoundBar">
      {(ackQueue.length > 0 || (sounds.alarm && sounds.alarm.test && sounds.alarm.persistent)) && (
        <button
          type="button"
          title={ackQueue.length ? "Review And Acknowledge Each Alert" : "Stop The Repeating Alert Sound"}
          className="satWeatherHeaderToggle satWeatherHeaderToggleAlarm"
          onClick={() => {
            if (sounds.alarm && sounds.alarm.test) sounds.silence();
            if (ackQueue.length) setAckOpen(true);
          }}
        >
          <FontAwesomeIcon icon={faVolumeXmark} />
          <span>{ackQueue.length ? `Acknowledge (${ackQueue.length})` : "Acknowledge"}</span>
        </button>
      )}
      <div className="satWeatherSoundGroup">
        <button
          type="button"
          role="switch"
          aria-checked={sounds.settings.enabled}
          title={!sounds.settings.enabled ? "Turn On Alert Sounds" : sounds.unlocked ? "Turn Off Alert Sounds" : "Click Anywhere To Allow Alert Sounds"}
          className={`satWeatherSoundSwitchRow ${sounds.settings.enabled && !sounds.unlocked ? "satWeatherSoundSwitchBlocked" : ""}`}
          onClick={sounds.toggle}
        >
          <FontAwesomeIcon icon={sounds.settings.enabled ? faVolumeHigh : faVolumeXmark} className="satWeatherSoundSwitchIcon" />
          <span className="satWeatherSoundSwitchLabel">Sound</span>
          <span className={`satWeatherSwitch ${sounds.settings.enabled ? "satWeatherSwitchOn" : ""}`}>
            <span className="satWeatherSwitchKnob" />
          </span>
        </button>
        <span className="satWeatherSoundDivider" />
        <button
          type="button"
          role="switch"
          aria-checked={sounds.settings.mode === "persistent"}
          title={sounds.settings.mode === "persistent" ? "Alert Sounds Repeat Until Acknowledged" : "Alert Sounds Play Once Per Alert"}
          className="satWeatherSoundSwitchRow"
          onClick={() => sounds.updateSettings({ mode: sounds.settings.mode === "persistent" ? "single" : "persistent" })}
        >
          <FontAwesomeIcon icon={faRepeat} className="satWeatherSoundSwitchIcon" />
          <span className="satWeatherSoundSwitchLabel">Repeat</span>
          <span className={`satWeatherSwitch ${sounds.settings.mode === "persistent" ? "satWeatherSwitchOn" : ""}`}>
            <span className="satWeatherSwitchKnob" />
          </span>
        </button>
      </div>
      {sounds.snoozed ? (
        <button
          type="button"
          title="End The Snooze And Resume Alert Sounds And Pop Ups"
          className="satWeatherHeaderToggle satWeatherHeaderToggleSnoozed"
          onClick={() => sounds.snooze(0)}
        >
          <FontAwesomeIcon icon={faBellSlash} />
          <span>{`Snoozed Until ${new Date(sounds.settings.snoozeUntil).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`}</span>
        </button>
      ) : (
        <Dropdown
          className="satWeatherSoundDropdown satWeatherSoundDropdownNarrow"
          value={null}
          onChange={(option) => sounds.snooze(valueFor(SNOOZE_OPTIONS, option))}
          options={SNOOZE_OPTIONS.map(([, label]) => label)}
          placeholder="Snooze"
        />
      )}
      <Dropdown
        className="satWeatherSoundDropdown satWeatherSoundDropdownSmall"
        value={labelFor(SOUND_VOLUME_OPTIONS, sounds.settings.volume)}
        onChange={(option) => sounds.updateSettings({ volume: valueFor(SOUND_VOLUME_OPTIONS, option) })}
        options={SOUND_VOLUME_OPTIONS.map(([, label]) => label)}
        placeholder="Volume"
      />
      <button
        type="button"
        title={`Test The ${SOUND_LEVEL_LABELS[sounds.settings.minLevel]} Sound`}
        className="satSummaryAlertBtn"
        onClick={() => sounds.test(sounds.settings.minLevel)}
      >
        <FontAwesomeIcon icon={faPlay} />
      </button>
    </div>
  );

  const renderLayoutControls = () => (
    <div className="satLayoutControls">
      {LAYOUT_TOGGLES.map(([key, label]) => (
        <button
          key={key}
          type="button"
          title={`${layoutVisibility[key] ? "Hide" : "Show"} ${label}`}
          className={`satLayoutToggle ${layoutVisibility[key] ? "satLayoutToggleActive" : ""}`}
          onClick={() => setLayoutVisibility(prev => ({ ...prev, [key]: !prev[key] }))}
        >
          <FontAwesomeIcon icon={layoutVisibility[key] ? faEye : faEyeSlash} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );

  const handleExpandClick = (event) => {
    const root = event.currentTarget;
    if (!(event.target instanceof Element) || event.target.closest(".satExpandedContent, .satFeedsModalOverlay")) return;
    const target = event.target.closest(EXPANDABLE_SELECTOR);
    if (!target || isInteractiveTarget(event.target, root)) return;
    const container = findExpandContainer(target, root);
    setExpandedView({ title: target.textContent.trim() || "Details", html: container.outerHTML });
  };

  return (
    <div className="satPageWrapper satFeedsPage satTrackerPage" onClick={handleExpandClick}>
      {layoutVisibility.nav && <Nav activePage="satellitefeeds" />}

      {authLoading ? (
        <div className="satGate">
          <div className="loading-wrapper">
            <div className="loading-circle" />
            <label className="loading-title">
              Loading
            </label>
          </div>
        </div>
      ) : (
      <>
      <div className={`satLayoutColumn ${layoutVisibility.nav ? "" : "satLayoutColumnNoNav"}`}>
      {layoutVisibility.header && (
        <header className="satSummaryHeader satWeatherHeader">
          <div className="satSummaryHeaderContent">
            <div className="satSummaryTitleSection">
              <div className="satSummarySubtitle">{activeAreas ? `${activeAreasLabel} | Alerting For All Areas | ${bellItems.length} Alert${bellItems.length === 1 ? "" : "s"}` : `${selectedFeed ? selectedFeed.name : "All Feeds"} | ${filteredFeeds.length} of ${allFeeds.length} Feeds${observerLocation ? ` | ${locationName}` : ""}`}</div>
            </div>
            <div className="satSummaryHeaderStatus">
              <div className={`satSummaryDecision satSummaryDecision${summaryStatus}`}>
                <FontAwesomeIcon icon={summaryStatus === "NOMINAL" ? faSquareCheck : summaryStatus === "SEVERE" ? faXmarkSquare : faTriangleExclamation} />
                <span>{summaryStatusLabel}</span>
              </div>
              <button
                type="button"
                title={bellItems.length ? "Show Alerts" : "Show Alert Sources"}
                className={`satSummaryAlertBtn ${bellItems.some((item) => item.severity === "CRITICAL") ? "satSummaryAlertBtnCritical" : bellItems.length > 0 ? "satSummaryAlertBtnWarning" : ""}`}
                onClick={() => {
                  if (ackReviewList.length) {
                    openAckReview();
                    return;
                  }
                  setExpandedAlertKey(bellItems[0] ? bellItems[0].key : null);
                  setShowAlertsPanel(true);
                }}
              >
                <FontAwesomeIcon icon={faBell} />
                {bellItems.length > 0 && <span className="satSummaryAlertBadge">{bellItems.length}</span>}
              </button>
              {renderSoundBar()}
            </div>
          </div>
        </header>
      )}
      <div className={`satSatelliteTrackerContainer satellite-theme-${theme}`}>
        {layoutVisibility.sidebar && (
        <div className={`satSatelliteSideBar ${sidebarCollapsed ? "satSatelliteSideBarCollapsed" : ""}`}>
          {registryLoading && feeds.length === 0 && (
            <div className="satSatelliteSideBarLoadingContainer">
              <div className="loading-circle" />
            </div>
          )}

          <div className="satSatelliteSideBarHeader">
            <h1>{!sidebarCollapsed && <small>Satellite Feeds</small>}</h1>

            {!sidebarCollapsed && (
              <>
                <div className="satSatelliteSideBarThemeSelector">
                  <button className={`satSatelliteSelectButton ${theme === "dark" ? "satSatelliteButtonActive" : ""}`} onClick={() => setTheme("dark")}>Dark</button>
                  <button className={`satSatelliteSelectButton ${theme === "neon" ? "satSatelliteButtonActive" : ""}`} onClick={() => setTheme("neon")}>Neon</button>
                </div>

                <div className="satSatelliteSideBarThemeSelector">
                  <div className="satSatelliteSideBarThemeSelectorStatusIndicator">
                    {registryLoading ? "Loading" : "Ready"}
                    {metadata && (
                      <div style={{ fontSize: "9px", marginTop: "2px" }}>
                        {allFeeds.length} Feeds · {metadata.buildTimeMs ? `${Math.round(metadata.buildTimeMs / 1000)}s Build` : ""}
                      </div>
                    )}
                  </div>
                </div>

                {displayErrors.length > 0 && (
                  <div className="satSatelliteSideBarThemeSelector">
                    <div className="satSatelliteSideBarThemeSelectorErrorIndicator" onClick={() => setShowErrors(!showErrors)} style={{ opacity: showErrors ? 1.0 : "", paddingTop: showErrors ? "" : 0, paddingBottom: showErrors ? "" : 0 }}>
                      <div className="satSatelliteSideBarThemeSelectorErrorIndicatorHeader">
                        <span>Discovery Warnings ({displayErrors.length})</span>
                        <button onClick={(e) => { e.stopPropagation(); copyAllErrors(); }} aria-label="Copy all errors.">
                          <FontAwesomeIcon icon={copiedErrors ? faSquareCheck : faClone} size="sm" />
                        </button>
                      </div>
                      {showErrors && (
                        <div className="satSatelliteSideBarThemeSelectorErrorIndicatorList">
                          {displayErrors.map((error, index) => (
                            <div key={index} className={`satSatelliteErrorItem ${expandedWarnings[error] ? "satSatelliteErrorItemExpanded" : ""}`} onClick={(event) => { event.stopPropagation(); toggleWarning(error); }}>
                              <FontAwesomeIcon icon={faTriangleExclamation} className="satSatelliteErrorItemIcon" />
                              <div className="satSatelliteErrorItemBody">
                                <span className="satSatelliteErrorItemTitle">{splitWarning(error)[0]}</span>
                                <span className="satSatelliteErrorItemText">{splitWarning(error)[1]}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {!sidebarCollapsed && renderAlertControls()}

          {!sidebarCollapsed && (
            <>
              <div className="satSatelliteSearchControls">
                <input type="text" placeholder="Search Feeds" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="satSatelliteSearchInput" />
                <div className="satSatelliteSelectControls">
                  <button className="satSatelliteSelectButton" onClick={() => fetchRegistry(true)} disabled={registryLoading}>
                    <FontAwesomeIcon icon={registryLoading ? faSpinner : faArrowsRotate} spin={registryLoading} /> Rebuild
                  </button>
                  <button className="satSatelliteSelectButton" onClick={exportJSON}>JSON</button>
                  <button className="satSatelliteSelectButton" onClick={exportCSV}>CSV</button>
                </div>
              </div>
              <div className="satSatelliteTLEQualityBar">
                <div className="satTLEQualityCount" style={{ color: "#ff6b6b" }} title="Video"><b>{feedTypeCount("video")}</b><span>Video</span></div>
                <div className="satTLEQualityCount" style={{ color: "#42a5f5" }} title="Image"><b>{feedTypeCount("image")}</b><span>Image</span></div>
                <div className="satTLEQualityCount" style={{ color: "#4ecdc4" }} title="Sequences"><b>{feedTypeCount("image-sequence")}</b><span>Sequences</span></div>
                <div className="satTLEQualityCount" style={{ color: "#ffd93d" }} title="Timelines"><b>{feedTypeCount("timeline")}</b><span>Timelines</span></div>
                <div className="satTLEQualityCount" style={{ color: "#919baf" }} title="Raw"><b>{feedTypeCount("raw")}</b><span>Raw</span></div>
                <div className="satTLEQualityCount" style={{ color: "#FF9500" }} title="Telemetry"><b>{feedTypeCount("telemetry")}</b><span>Telemetry</span></div>
                <div className="satTLEQualityCount" style={{ color: "#4ecdc4" }} title="Live Feeds"><b>{liveFeedCount}</b><span>Live</span></div>
              </div>

              <div className="satSatelliteObjectsHeader">
                <span className="satSatelliteObjectsHeaderIcon"><FontAwesomeIcon icon={faSatellite} /></span>
                <span>Feeds ({filteredFeeds.length}/{allFeeds.length})</span>
              </div>

              <div ref={virtualScrollRef} className="satSatelliteList satellite-list" style={{ flex: 1, overflowY: "auto", position: "relative" }} onScroll={handleVirtualScroll}>
                <div style={{ height: filteredFeeds.length * PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT, position: "relative" }}>
                  <div style={{ position: "absolute", top: startIndex * PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT, width: "100%" }}>
                    {visibleItems.map((feed) => (
                      <div
                        key={feed.id}
                        className={`satSatelliteListItem satellite-item ${selectedFeed?.id === feed.id ? "satellite-selected satSatelliteButtonActive" : ""}`}
                        style={{ height: PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT, minHeight: PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT }}
                        onClick={() => setSelectedFeed(feed)}
                      >
                        <div className="satSatelliteIndicator" style={{ backgroundColor: FEED_TYPE_COLORS[feed.feedType] || "#42a5f5" }} />
                        <div className="satSatelliteTleBadge" style={{ backgroundColor: feed.isLive ? "#4ecdc4" : "#FF9500" }} title={feed.isLive ? "Live" : "Archive"} />
                        <div className="satSatelliteFeedListBody">
                          <div className="satSatelliteName satellite-name">{feed.name}</div>
                          <div className="satSatelliteFeedListMeta">
                            <span>{feed.spacecraft}</span>
                            {feed.noradId && <span>· NORAD {feed.noradId}</span>}
                          </div>
                        </div>
                        <button className="satSatelliteInfoButton" onClick={(e) => { e.stopPropagation(); openDossier(feed); }} aria-label="Show dossier.">
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
        )}

        <div className="satSatelliteMainView">
          <div className="satTopBars">
          <div className="satSatelliteViewHeader" onScroll={(e) => e.currentTarget.style.setProperty("--sat-toolbar-scroll", `${e.currentTarget.scrollLeft}px`)}>
            <div className="satSatellitePlaybackControls">
              <button className={`satSatellitePlaybackControlsButton ${autoRefresh ? "satSatelliteButtonActive" : ""}`} onClick={() => setAutoRefresh(v => !v)} aria-label="Toggle auto-refresh.">
                <FontAwesomeIcon icon={autoRefresh ? faPause : faPlay} /> Auto-Refresh
              </button>

              <button className={`satSatellitePlaybackControlsButton ${hudVisible ? "satSatelliteButtonActive" : ""}`} onClick={toggleHUD}>
                <FontAwesomeIcon icon={faChartLine} /> HUD
              </button>

              <button className={`satSatellitePlaybackControlsButton ${diagnosticsExpanded ? "satSatelliteButtonActive" : ""}`} onClick={toggleDiagnostics}>
                <FontAwesomeIcon icon={faGauge} /> Diagnostics
              </button>

              <button className="satSatellitePlaybackControlsButton" onClick={() => fetchRegistry(true)} disabled={registryLoading}>
                <FontAwesomeIcon icon={registryLoading ? faSpinner : faArrowsRotate} spin={registryLoading} /> Rebuild Registry
              </button>

              <Dropdown
                value={filterCategory === "all" ? "All Categories" : filterCategory}
                onChange={(option) => setFilterCategory(option === "All Categories" ? "all" : option)}
                options={["All Categories", ...distinctCategories]}
                placeholder="Category"
              />
              <Dropdown
                value={filterFeedType === "all" ? "All Types" : titleCaseWords(filterFeedType)}
                onChange={(option) => setFilterFeedType(option === "All Types" ? "all" : (distinctFeedTypes.find((t) => titleCaseWords(t) === option) || "all"))}
                options={["All Types", ...distinctFeedTypes.map(titleCaseWords)]}
                placeholder="Feed Type"
              />
              <Dropdown
                value={labelFor(SOURCE_FILTER_OPTIONS, filterSource)}
                onChange={(option) => setFilterSource(valueFor(SOURCE_FILTER_OPTIONS, option))}
                options={SOURCE_FILTER_OPTIONS.map(([, label]) => label)}
                placeholder="Source"
              />
              <Dropdown
                value={labelFor(LIVE_FILTER_OPTIONS, filterLive)}
                onChange={(option) => setFilterLive(valueFor(LIVE_FILTER_OPTIONS, option))}
                options={LIVE_FILTER_OPTIONS.map(([, label]) => label)}
                placeholder="Status"
              />
              <Dropdown
                value={labelFor(SORT_OPTIONS, sortBy)}
                onChange={(option) => setSortBy(valueFor(SORT_OPTIONS, option))}
                options={SORT_OPTIONS.map(([, label]) => label)}
                placeholder="Sort By"
              />

              <button className="satSatellitePlaybackControlsButton" onClick={exportJSON}>JSON</button>
              <button className="satSatellitePlaybackControlsButton" onClick={exportCSV}>CSV</button>
            </div>
            {renderLayoutControls()}
          </div>

          <FeedStatusStrip metadata={metadata} feeds={allFeeds} registryLoading={registryLoading && feeds.length === 0} expanded={diagnosticsExpanded} onToggle={toggleDiagnostics} onRefresh={() => fetchRegistry(true)} />
          </div>

          {diagnosticsExpanded && (
            <FeedDiagnosticsPanel metadata={metadata} unavailable={unavailable} onClose={() => setDiagnosticsExpanded(false)} onRefresh={() => fetchRegistry(true)} registryLoading={registryLoading} />
          )}

          {hudVisible && (
            <HUDPanel metadata={metadata} feeds={feeds} onClose={() => setHudVisible(false)} onSelect={(f) => { setHudVisible(false); setSelectedFeed(f); }} />
          )}

          {dossierFeed && (
            <FeedDossier feed={dossierFeed} onClose={() => setDossierFeed(null)} />
          )}

          {showLeads && (
            <LeadsModal onClose={() => setShowLeads(false)} onChanged={fetchHarvestHealth} />
          )}

          <div className="satMainContent">
            <div className="satCanvasArea">
              {selectedFeed && (
                <FeedViewer
                  feed={selectedFeed}
                  autoRefresh={autoRefresh}
                  onAutoRefreshToggle={() => setAutoRefresh(v => !v)}
                  onClose={() => setSelectedFeed(null)}
                  onOpenDossier={() => openDossier(selectedFeed)}
                  onHarvestSubscribe={subscribeHarvest}
                />
              )}

              {!selectedFeed && (
                <div className="satFeedGalleryWrapper">
                  {registryLoading && allFeeds.length === 0 ? (
                    <div className="satStatusDisplay" />
                  ) : filteredFeeds.length === 0 ? (
                    <div className="satStatusDisplay">
                      <FontAwesomeIcon icon={faMagnifyingGlass} />
                      <p>No feeds match the current filter. Adjust the search term, category, feed type, or live filter to see more results.</p>
                    </div>
                  ) : (
                    <div className="satFeedGallery">
                      {filteredFeeds.slice(0, 60).map(feed => (
                        <button key={feed.id} className="satFeedGalleryCard" onClick={() => setSelectedFeed(feed)}>
                          <div className="satFeedGalleryThumbWrapper">
                            {(feed.thumbnailUrl || feed.imageUrl || feed.previewUrl || feed.posterUrl) ? (
                              <img src={feed.harvest ? feed.thumbnailUrl : proxyImageUrl(feed.id, { thumb: true })} alt={feed.name} className="satFeedGalleryThumb" loading="lazy" onError={(e) => { e.target.style.display = "none"; }} />
                            ) : (
                              <div className="satFeedGalleryThumbPlaceholder">
                                <FontAwesomeIcon icon={FEED_TYPE_ICONS[feed.feedType] || faSatellite} style={{ color: FEED_TYPE_COLORS[feed.feedType] || "#42a5f5" }} />
                              </div>
                            )}
                            {feed.isLive && <span className="satFeedGalleryLiveBadge">Live</span>}
                            <span className="satFeedGalleryTypeBadge" style={tintedBadgeStyle(FEED_TYPE_COLORS[feed.feedType] || "#42a5f5")}>
                              <FontAwesomeIcon icon={FEED_TYPE_ICONS[feed.feedType] || faSatellite} /> {titleCaseWords(feed.feedType)}
                            </span>
                          </div>
                          <div className="satFeedGalleryBody">
                            <div className="satFeedGalleryTitle">{feed.name}</div>
                            <div className="satFeedGallerySub">
                              <span style={{ color: categoryColor(feed.category) }}>{feed.category}</span>
                              <span>· {feed.spacecraft}</span>
                            </div>
                            <div className="satFeedGalleryMeta">
                              <span><FontAwesomeIcon icon={faTowerBroadcast} /> {feed.operator}</span>
                              <span><FontAwesomeIcon icon={faClock} /> {feed.cadenceLabel}</span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="satRightRail">
              <div className="satRightRailSection">
                <button className="satRightRailSectionHeader" onClick={() => setLegendCollapsed(c => !c)}>
                  <span>Legend</span>
                  <span className="satSectionToggle"><FontAwesomeIcon icon={legendCollapsed ? faSquarePlus : faSquareMinus} /></span>
                </button>
                {!legendCollapsed && (
                  <div className="satRightRailSectionBody">
                    <h5 style={{ fontSize: "0.55rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--st-text-muted)", marginBottom: "8px" }}>Feed Types</h5>
                    <div className="satRailLegendList">
                      {Object.entries(FEED_TYPE_COLORS).map(([type, color]) => (
                        <div key={type} className="satSatelliteLegendItem">
                          <div className="satSatelliteLegendColor" style={{ backgroundColor: color }} />
                          <span>{titleCaseWords(type)}</span>
                        </div>
                      ))}
                    </div>
                    <h5 style={{ fontSize: "0.55rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--st-text-muted)", margin: "12px 0 8px 0" }}>Categories</h5>
                    <div className="satRailLegendList">
                      {distinctCategories.map((cat) => (
                        <div key={cat} className="satSatelliteLegendItem">
                          <div className="satSatelliteLegendColor" style={{ backgroundColor: categoryColor(cat) }} />
                          <span>{cat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {metadata && (
                <div className="satRightRailSection">
                  <button className="satRightRailSectionHeader">
                    <span>Discovery Stats</span>
                  </button>
                  <div className="satRightRailSectionBody">
                    <div className="satSatelliteHUDSectionGrid">
                      <div className="satSatelliteHUDSectionItem"><span>Available</span><span style={{ color: "#4ecdc4" }}>{metadata.totalAvailable}</span></div>
                      <div className="satSatelliteHUDSectionItem"><span>Unavailable</span><span style={{ color: "#ff6b6b" }}>{metadata.totalUnavailable}</span></div>
                      <div className="satSatelliteHUDSectionItem"><span>GIBS Layers</span><span>{metadata.gibsLayerCount}</span></div>
                      <div className="satSatelliteHUDSectionItem"><span>SDO Wavelengths</span><span>{metadata.sdoWavelengthCount}</span></div>
                      <div className="satSatelliteHUDSectionItem"><span>SOHO Products</span><span>{metadata.sohoProductCount}</span></div>
                      <div className="satSatelliteHUDSectionItem"><span>GOES-East</span><span>{metadata.goesEastProductCount}</span></div>
                      <div className="satSatelliteHUDSectionItem"><span>GOES-West</span><span>{metadata.goesWestProductCount}</span></div>
                      <div className="satSatelliteHUDSectionItem"><span>YouTube Live</span><span>{metadata.youtubeLiveStreamCount}</span></div>
                      <div className="satSatelliteHUDSectionItem"><span>Catalog Seeds</span><span>{metadata.catalogSize || 0}</span></div>
                      <div className="satSatelliteHUDSectionItem"><span>Build Time</span><span>{metadata.buildTimeMs ? `${Math.round(metadata.buildTimeMs / 1000)}s` : "—"}</span></div>
                      <div className="satSatelliteHUDSectionItem"><span>Built</span><span>{metadata.builtAt ? formatRelativeTime(metadata.builtAt) : "—"}</span></div>
                    </div>
                  </div>
                </div>
              )}

              <div className="satRightRailSection">
                <button className="satRightRailSectionHeader">
                  <span>Harvester</span>
                </button>
                <div className="satRightRailSectionBody">
                  <div className="satSatelliteHUDSectionGrid">
                    <div className="satSatelliteHUDSectionItem"><span>Status</span><span style={{ color: HARVEST_STATUS_COLORS[harvestStatusLabel] || "#ff6b6b" }}>{harvestStatusLabel}</span></div>
                    <div className="satSatelliteHUDSectionItem"><span>Feeds</span><span>{harvestStats.products.toLocaleString()}</span></div>
                    <div className="satSatelliteHUDSectionItem"><span>Channels</span><span>{harvestStats.channels.toLocaleString()}</span></div>
                    <div className="satSatelliteHUDSectionItem"><span>Held Back</span><span>{harvestHidden.toLocaleString()}</span></div>
                    <div className="satSatelliteHUDSectionItem"><span>Archived</span><span style={{ color: "#4ecdc4" }}>{harvestStats.archived}</span></div>
                    <div className="satSatelliteHUDSectionItem"><span>Frames</span><span>{harvestStats.frames.toLocaleString()}</span></div>
                    <div className="satSatelliteHUDSectionItem"><span>Storage</span><span>{harvestHealth?.storage ? `${formatBytes(harvestHealth.storage.usedBytes)} / ${formatBytes(harvestHealth.storage.budgetBytes)}` : "—"}</span></div>
                    <div className="satSatelliteHUDSectionItem"><span>Jobs Due</span><span>{harvestStats.due}</span></div>
                    <div className="satSatelliteHUDSectionItem"><span>Jobs Running</span><span>{harvestStats.running}</span></div>
                    <div className="satSatelliteHUDSectionItem"><span>Sources</span><span>{harvestStats.sources}</span></div>
                    <div className="satSatelliteHUDSectionItem"><span>Failing</span><span style={{ color: harvestStats.failing ? "#ff6b6b" : undefined }}>{harvestStats.failing}</span></div>
                    <div className="satSatelliteHUDSectionItem"><span>New Leads</span><span style={{ color: harvestHealth?.leads?.new_leads ? "#ffd93d" : undefined }}>{harvestHealth?.leads ? harvestHealth.leads.new_leads : "—"}</span></div>
                    <div className="satSatelliteHUDSectionItem"><span>Throttle</span><span style={{ color: harvestHealth?.engine?.throttle === "Normal" ? "#4ecdc4" : harvestHealth?.engine?.throttle ? "#FF9500" : undefined }}>{harvestHealth?.engine?.throttle ? `${harvestHealth.engine.throttle} (${harvestHealth.engine.lagMs} ms)` : "—"}</span></div>
                    <div className="satSatelliteHUDSectionItem"><span>Last Tick</span><span>{harvestHealth?.engine?.lastTickAt ? formatRelativeTime(harvestHealth.engine.lastTickAt) : "—"}</span></div>
                  </div>
                  <button className="satPassComputeButton satHarvestLeadsButton" onClick={() => setShowLeads(true)}>
                    <FontAwesomeIcon icon={faLightbulb} /><span className="satHarvestLeadsLabel">Source Leads{harvestHealth?.leads?.new_leads ? ` (${harvestHealth.leads.new_leads} New)` : ""}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {layoutVisibility.footer && (
        <footer className="satSummaryFooter">
          <div className="satSummaryFooterContent">
            <span>Last Updated: {metadata?.builtAt ? new Date(metadata.builtAt).toLocaleTimeString() : "—"}</span>
            <span>Feeds: {allFeeds.length}</span>
            <span>Live: {liveFeedCount}</span>
            <span>Video: {feedTypeCount("video")}</span>
            <span>Image: {feedTypeCount("image")}</span>
            <span>Sequences: {feedTypeCount("image-sequence")}</span>
            <span>Timelines: {feedTypeCount("timeline")}</span>
            <span>Telemetry: {feedTypeCount("telemetry")}</span>
            <span>Harvester: {harvestStatusLabel}</span>
            <span>Errors: {displayErrors.length}</span>
            <span>Status: {summaryStatusLabel}</span>
          </div>
        </footer>
      )}
      </div>
      <ExpandModal view={expandedView} onClose={() => setExpandedView(null)} />
      {apiError && (
        <div className="satWeatherNotification satWeatherNotificationError">
          <FontAwesomeIcon icon={faExclamationCircle} />
          <span>{apiError}</span>
          <button onClick={() => setApiError(null)}><FontAwesomeIcon icon={faTimes} /></button>
        </div>
      )}
      {apiSuccess && (
        <div className="satWeatherNotification satWeatherNotificationSuccess">
          <FontAwesomeIcon icon={faCheckCircle} />
          <span>{apiSuccess}</span>
          <button onClick={() => setApiSuccess(null)}><FontAwesomeIcon icon={faTimes} /></button>
        </div>
      )}
      {renderAlertsPanel()}
      {renderAckModal()}
      <AreaModal open={areaModalOpen} onClose={() => setAreaModalOpen(false)} title={editingAreaId ? "Edit Monitored Area" : "Add Monitored Area"}>
        <p className="satWeatherModalIntro">
          Monitored areas are checked against every GOES mesoscale sector that NOAA schedules and against the NOAA OVATION aurora nowcast, and a sector centered within reach of an area or aurora within view of it after dark raises an alert for that area. Choosing Alert For All Areas points the alert bell, the counts, and the alert sounds at all of them at once, while satellite product outage, solar flare, and radio burst alerts apply everywhere. Choose a point with a radius (a circle around an address or coordinates) or a bounding box (a rectangle).
        </p>
        <div className="satWeatherFormGroup">
          <label>Area Name (Optional)</label>
          <input type="text" value={areaFormData.name} onChange={(event) => handleAreaFormChange("name", event.target.value)} placeholder="Houston Metro or North Bay" maxLength="80" />
        </div>
        <div className="satWeatherFormGroup">
          <Dropdown
            value={areaFormData.mode === "bbox" ? "Bounding Box (Rectangular Area)" : "Point + Radius (Circular Area)"}
            onChange={(option) => handleAreaFormChange("mode", option === "Bounding Box (Rectangular Area)" ? "bbox" : "point_radius")}
            options={["Point + Radius (Circular Area)", "Bounding Box (Rectangular Area)"]}
            placeholder="Area Mode"
          />
        </div>
        {areaFormData.mode === "point_radius" && (
          <>
            <div className="satWeatherFormGroup">
              <label>Address (Geocoded To Coordinates)</label>
              <div className="satWeatherFormInline">
                <AddressAutocomplete
                  value={areaFormData.address}
                  onChange={(text) => handleAreaFormChange("address", text)}
                  onSelect={(place) => setAreaFormData((prev) => ({
                    ...prev,
                    address: place.label,
                    latitude: place.latitude.toFixed(6),
                    longitude: place.longitude.toFixed(6),
                    name: prev.name && prev.name.trim() ? prev.name : (place.city || place.primary)
                  }))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleGeocodeArea();
                    }
                  }}
                  bias={observerLocation ? { latitude: observerLocation.lat, longitude: observerLocation.lon } : null}
                  placeholder="Start typing an address."
                  style={{ flex: 1 }}
                />
                <button type="button" className="satWeatherModalBtnSecondary satWeatherModalBtnInline" onClick={handleGeocodeArea} disabled={isGeocodingArea || !(areaFormData.address || "").trim()}>
                  {isGeocodingArea ? <><FontAwesomeIcon icon={faSpinner} spin /> Geocoding</> : <><FontAwesomeIcon icon={faLocationCrosshairs} /> Geocode</>}
                </button>
              </div>
            </div>
            <div className="satWeatherFormRow">
              <div className="satWeatherFormGroup"><label>Latitude *</label><input type="number" step="any" value={areaFormData.latitude} onChange={(event) => handleAreaFormChange("latitude", event.target.value)} placeholder="-90 To 90" required /></div>
              <div className="satWeatherFormGroup"><label>Longitude *</label><input type="number" step="any" value={areaFormData.longitude} onChange={(event) => handleAreaFormChange("longitude", event.target.value)} placeholder="-180 To 180" required /></div>
              <div className="satWeatherFormGroup"><label>Radius (km) *</label><input type="number" min="1" max="10000" step="any" value={areaFormData.radius_km} onChange={(event) => handleAreaFormChange("radius_km", event.target.value)} placeholder="100" required /></div>
            </div>
            <button type="button" className="satWeatherModalBtnSecondary" onClick={useSelectedLocationForArea} disabled={!observerLocation}><FontAwesomeIcon icon={faLocationCrosshairs} /> Use Selected Location</button>
          </>
        )}
        {areaFormData.mode === "bbox" && (
          <>
            <div className="satWeatherFormRow">
              <div className="satWeatherFormGroup"><label>Min Latitude (South) *</label><input type="number" step="any" value={areaFormData.min_lat} onChange={(event) => handleAreaFormChange("min_lat", event.target.value)} placeholder="-90 To 90" required /></div>
              <div className="satWeatherFormGroup"><label>Max Latitude (North) *</label><input type="number" step="any" value={areaFormData.max_lat} onChange={(event) => handleAreaFormChange("max_lat", event.target.value)} placeholder="-90 To 90" required /></div>
            </div>
            <div className="satWeatherFormRow">
              <div className="satWeatherFormGroup"><label>Min Longitude (West) *</label><input type="number" step="any" value={areaFormData.min_lng} onChange={(event) => handleAreaFormChange("min_lng", event.target.value)} placeholder="-180 To 180" required /></div>
              <div className="satWeatherFormGroup"><label>Max Longitude (East) *</label><input type="number" step="any" value={areaFormData.max_lng} onChange={(event) => handleAreaFormChange("max_lng", event.target.value)} placeholder="-180 To 180" required /></div>
            </div>
          </>
        )}
        <div className="satWeatherModalActions">
          {editingAreaId && <button className="satWeatherModalBtnDanger" onClick={() => deleteArea(editingAreaId)}><FontAwesomeIcon icon={faTrash} /> Delete Area</button>}
          <button className="satWeatherModalBtnSecondary" onClick={() => setAreaModalOpen(false)}>Cancel</button>
          <button className="satWeatherModalBtnPrimary" onClick={() => handleSaveArea(true)}><FontAwesomeIcon icon={faSave} /> Save Area</button>
        </div>
      </AreaModal>
      {showLocationPicker && createPortal(
        <div className="satTrackerPickerHost">
          <LocationPickerModal
            initialLat={observerLocation ? observerLocation.lat : SOURCES.defaultLocation.lat}
            initialLon={observerLocation ? observerLocation.lon : SOURCES.defaultLocation.lon}
            initialLabel={observerLocation && observerLocation.label !== CUSTOM_LOCATION_LABEL ? observerLocation.label : null}
            onCancel={() => setShowLocationPicker(false)}
            onConfirm={(choice) => {
              setLocation(choice.lat, choice.lon, choice.label || CUSTOM_LOCATION_LABEL);
              setShowLocationPicker(false);
            }}
          />
        </div>,
        document.body
      )}
      </>
      )}
    </div>
  );
};

export default SatelliteFeeds;