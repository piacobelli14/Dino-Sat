import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlane, faEye, faEyeSlash, faExclamationTriangle, faXmarkSquare, faBell,
  faRefresh, faDownload, faSpinner, faHistory, faLightbulb, faXmark,
  faCheck, faBan, faLayerGroup, faFilter, faSearchPlus, faGlobeAmericas, faChartBar,
  faList, faDatabase, faLocationCrosshairs, faFire, faTag, faRoute, faPlaneDeparture,
  faPlaneArrival, faHelicopter, faMap, faCrosshairs, faBroadcastTower, faChartLine,
  faClock, faSatelliteDish, faShieldHalved, faTachometerAlt, faGaugeHigh,
  faGlobe, faCircleHalfStroke,
  faMagnifyingGlass, faSliders, faBuilding, faMapMarkerAlt, faSquareCheck,
  faTriangleExclamation, faLocationDot, faTimes, faCheckDouble, faBackwardStep, faForwardStep, faHeadphones,
  faMapPin, faPlus, faEdit, faVolumeXmark, faVolumeHigh, faRepeat, faBellSlash, faPlay, faExclamationCircle,
  faCheckCircle, faTrash, faSave
} from "@fortawesome/free-solid-svg-icons";
import Nav from "../../../../helpers/Nav.jsx";
import Dropdown from "../../../../helpers/Dropdown.jsx";
import useAuth from "../../../../UseAuth.jsx";
import ReactEcharts from "echarts-for-react";
import { openDB } from "idb";
import "../../../../styles/mainStyles/Sat/EarthConditions/EarthConditions.css";
import "../../../../styles/mainStyles/Sat/Trackers/WeatherTracker/WeatherTracker.css";
import "../../../../styles/mainStyles/Sat/Trackers/FlightTracker/FlightTracker.css";
import "../../../../styles/helperStyles/LoadingSpinner.css";
import "../../../../styles/helperStyles/Disconnected.css";

const SOURCES = {
  apiBase: import.meta.env.VITE_API_BASE_URL,
  endpoints: {
    snapshot: "/flights/snapshot",
    stats: "/flights/stats",
    aircraft: "/flights/aircraft",
    airports: "/flights/airports",
    trails: "/flights/trails",
    reference: "/flights/reference",
    lookup: "/flights/lookup",
    health: "/flights/health",
    locationSearch: "/location-search",
    reverseGeocode: "/reverse-geocode",
    areas: "/risk/areas",
    alertAnalysis: "/flights/alerts/analysis"
  },
  geocoding: {
    photon: "https://photon.komoot.io/api/",
    nominatim: "https://nominatim.openstreetmap.org/search",
    userAgent: "FlightTracker/1.0",
    minQueryLength: 3,
    debounceMs: 300,
    resultLimit: 6,
    cacheLimit: 100,
    attribution: "Photon · © OpenStreetMap Contributors"
  },
  atc: {
    name: "LiveATC",
    search: "https://www.liveatc.net/search/?icao={icao}"
  },
  assets: {
    maplibreCss: "https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.css",
    maplibreScript: "https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.js",
    deckScript: "https://unpkg.com/deck.gl@9.3.6/dist.min.js",
    deckMapboxScript: "https://unpkg.com/@deck.gl/mapbox@9.3.6/dist.min.js",
    mapkitScript: "https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.js",
    mapkitToken: import.meta.env.VITE_APPLE_MAPS_KEY,
    satelliteTiles: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    labelTiles: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf"
  },
  attributions: [
    "<a href=\"https://opensky-network.org\" target=\"_blank\" rel=\"noopener noreferrer\">The OpenSky Network</a>",
    "<a href=\"https://adsb.fi\" target=\"_blank\" rel=\"noopener noreferrer\">adsb.fi</a>",
    "<a href=\"https://adsb.lol\" target=\"_blank\" rel=\"noopener noreferrer\">adsb.lol</a> (ODbL)",
    "<a href=\"https://ourairports.com\" target=\"_blank\" rel=\"noopener noreferrer\">OurAirports</a>"
  ],
  harvest: {
    base: `${import.meta.env.VITE_API_BASE_URL}/harvest`,
    domain: "flight-tracker",
    trafficProduct: "flight-traffic-global",
    emergencyProduct: "flight-emergencies",
    outcomeProduct: "flight-emergency-outcomes",
    healthRefreshMs: 60 * 1000,
    historyDays: 7,
    historyStepSeconds: 3600,
    exportDays: 90,
    jobPattern: /^flightcensus:/,
    statusColors: { Healthy: "#4ecdc4", Degraded: "#FF9500", Idle: "#919baf", "Needs Schema": "#ff6b6b", Loading: "#919baf" }
  },
  refresh: {
    statsMs: 30 * 1000,
    trailsMs: 20 * 1000,
    referenceMs: 60 * 1000,
    detailMs: 5000,
    animationMs: 1000
  },
  tables: {
    tightAt: 14,
    wrapAt: 28
  },
  persistence: {
    dbName: "FlightTrackerStateDB",
    storeName: "state",
    recordId: "state",
    restoreFlag: "flightTrackerRestoreInFlight",
    restoreSettleMs: 3000,
    saveDebounceMs: 500
  },
  sounds: {
    defaults: { enabled: false, minLevel: "critical", scope: "view", volume: 0.6, mode: "single", snoozeUntil: 0 },
    repeatGapSeconds: 0.8,
    scheduleAheadSeconds: 120,
    topUpSeconds: 20
  },
  map: {
    center: [-40, 30],
    zoom: 2,
    minZoom: 1,
    maxZoom: 16,
    labelZoom: 6,
    trailZoom: 3,
    trailSeconds: 240,
    trailGapSeconds: 120,
    trailAlpha: [25, 190],
    trailClientMinSeconds: 5,
    pathColor: [179, 136, 255],
    pathAlpha: [220, 110],
    pathMax: 400,
    pathStepDegrees: 1,
    trailAppleMax: 300,
    heatmapRadius: [[10, 200], [7, 120], [4, 80], [0, 50]],
    heatmapIntensity: [[8, 2.5], [5, 1.8], [0, 1.2]],
    heatmapThreshold: 0.01,
    heatmapScale: 0.5,
    heatmapGamma: 0.5,
    heatmapGain: 0.7,
    minZoomGlobe: 0,
    globeZoom: 3,
    airportLabelZoom: 5,
    airportZoom: 0,
    airportMediumZoom: 5,
    followZoom: 7,
    maxLabels: 800,
    maxTrails: 1500,
    deadReckonSeconds: 300,
    appleZoomThreshold: 6,
    deckMaxZoomWithApple: 7,
    appleSettleMs: 3000,
    appleLoadTimeoutMs: 10000,
    maxAppleAircraft: 1500,
    maxAppleAirports: 400,
    appleIconSize: 22,
    appleSelectedIconSize: 30
  }
};

const MAP_PROVIDER_APPLE = "apple";

const MAP_PROVIDER_DECKGL = "deckgl";

const apiUrl = (key) => `${SOURCES.apiBase}${SOURCES.endpoints[key]}`;

const DATA_TYPE = {
  LIVE: { label: "LIVE", icon: faBroadcastTower, color: "#4ecdc4", description: "Real-Time Observation" },
  HISTORICAL: { label: "HISTORICAL", icon: faHistory, color: "#919baf", description: "Past Recorded Data" },
  COMPUTED: { label: "COMPUTED", icon: faDatabase, color: "#cdd4e4", description: "Derived from Current Data" }
};

const PANEL_CONTAINER_CLASS = { LIVE: "Live", HISTORICAL: "Historical", COMPUTED: "Computed" };

const CHART_FONT = "Inter, Arial, sans-serif";

const DEFAULT_LAYOUT = { nav: true, header: true, sidebar: true, footer: true };

const LAYOUT_TOGGLES = [["nav", "Nav"], ["header", "Header"], ["sidebar", "Sidebar"], ["footer", "Footer"]];

const EXPANDABLE_SELECTOR = ".satEarthCondTableCard, .satEarthCondChartDescription, .satEarthCondStatusTileGrid, .satEarthCondStatsSummary";

const REFRESH_INTERVAL_OPTIONS = [[2000, "2 Seconds"], [5000, "5 Seconds"], [10000, "10 Seconds"], [30000, "30 Seconds"]];

const CATEGORY_OPTIONS = [["all", "All Categories"], ["airliner", "Airliners"], ["small", "Small Aircraft"], ["light", "Light Aircraft"], ["highPerformance", "High Performance"], ["rotorcraft", "Rotorcraft"], ["surface", "Surface Vehicles"], ["military", "Military"], ["other", "Other"], ["unknown", "Unknown"]];

const LIST_SCOPE_OPTIONS = [["view", "In View"], ["all", "All Tracked"]];

const LIST_SORT_OPTIONS = [["flight", "Callsign"], ["alt", "Altitude"], ["gs", "Ground Speed"], ["posAt", "Last Position"]];

const LIST_LIMIT = 500;

const SOURCE_KEYS = [["opensky", 1], ["adsbfi", 2], ["adsblol", 4], ["airplaneslive", 8]];

const SOURCE_TILES = {
  opensky: { icon: faGlobeAmericas, description: "OpenSky Network can provide a single global state vector pull on an adaptive schedule that spends its daily credit budget evenly until the next UTC midnight reset." },
  adsbfi: { icon: faSatelliteDish, description: "adsb.fi answers point and radius queries from a community receiver network, and the server walks a hexagonal tile sweep at one request every 1.5 seconds with priority for the area you are viewing. Its data is for personal, non-commercial use with a link back to adsb.fi." },
  adsblol: { icon: faBroadcastTower, description: "adsb.lol sweeps the same hexagonal tiles at a slower pace because its rate limits are tighter for servers that do not feed data, and it also provides the worldwide pulls of military and emergency aircraft every few minutes and the route lookups that add departure and arrival airports to airline callsigns." },
  airplaneslive: { icon: faSatelliteDish, description: "airplanes.live answers point and radius queries from its own receiver network at one request every 1.5 seconds, sweeping a different third of the tiles than adsb.fi so the two networks refresh each region sooner and fill in aircraft the other network does not hear." }
};

const EMERGENCY_SQUAWKS = { "7500": "Unlawful Interference", "7600": "Radio Failure", "7700": "General Emergency" };

const LAYER_DEFINITIONS = [
  { id: "aircraft", name: "Aircraft", icon: faPlane, color: "#4ecdc4" },
  { id: "labels", name: "Callsign Labels", icon: faTag, color: "#cdd4e4" },
  { id: "trails", name: "Flight Trails", icon: faRoute, color: "#42a5f5" },
  { id: "paths", name: "Flight Paths", icon: faPlaneDeparture, color: "#b388ff" },
  { id: "airports", name: "Airports", icon: faPlaneArrival, color: "#ffd93d" },
  { id: "heatmap", name: "Traffic Heatmap", icon: faFire, color: "#FF9500" }
];

const DEFAULT_LAYERS = { aircraft: true, labels: true, trails: false, paths: false, airports: true, heatmap: false };

const WORLDWIDE_KEY = "worldwide";

const CUSTOM_LOCATION_LABEL = "Custom Coordinates";

const AIRSPACE_RADIUS_OPTIONS = [[10, "10 NM Radius"], [25, "25 NM Radius"], [50, "50 NM Radius"], [100, "100 NM Radius"], [250, "250 NM Radius"]];

const AIRSPACE_CEILING_OPTIONS = [[0, "All Altitudes"], [18000, "Below 18,000 Ft"], [10000, "Below 10,000 Ft"], [5000, "Below 5,000 Ft"]];

const SOUND_VOLUME_OPTIONS = [[0.3, "Quiet"], [0.6, "Normal"], [1, "Loud"]];

const SNOOZE_OPTIONS = [[15, "15 Minutes"], [30, "30 Minutes"], [60, "1 Hour"], [120, "2 Hours"], [240, "4 Hours"], [480, "8 Hours"], [1440, "24 Hours"]];

const SOUND_LEVEL_LABELS = { notice: "Notice", warning: "Radio Failure", critical: "General Emergency", emergency: "Unlawful Interference" };

const EMERGENCY_SOUND_LEVELS = { "7500": "emergency", "7700": "critical", "7600": "warning" };

const flightSoundLevel = (entry) => EMERGENCY_SOUND_LEVELS[entry.sq] || null;

const flightSoundKey = (entry) => `${entry.hex}|${entry.sq}`;

const flightAlertIdentity = (entry) => entry.hex;

const flightSoundMessage = (entry, ended) => ({
  title: ended ? `${displayName(entry)} Emergency Ended` : `${displayName(entry)} Squawking ${entry.sq}`,
  body: ended ? `The aircraft is no longer squawking ${entry.sq}.` : `${EMERGENCY_SQUAWKS[entry.sq] || "Emergency"} at ${formatAltitude(entry)} near ${formatCoords(entry.lat, entry.lon)}.`
});

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
    if (snoozed) {
      for (const [key, entry] of keys.entries()) if (counts(entry)) prompted.add(key);
      return;
    }
    const kept = queueRef.current.filter((entry) => {
      if (entry.ended) return true;
      const current = keys.get(entry.key);
      if (current && counts(current)) return true;
      if (current) prompted.delete(entry.key);
      return !current;
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
    else showSystemNotification(`${added.length} Event Changes`, added.map((entry) => (entry.message ? entry.message.body : "")).filter(Boolean).slice(0, 4).join("; "), persistent);
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

const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const computeGeodesicCircle = (centerLat, centerLng, radiusKm, segments) => {
  const R = 6371.0;
  const latRad = centerLat * Math.PI / 180;
  const lngRad = centerLng * Math.PI / 180;
  const angularDist = radiusKm / R;
  const ring = [];
  for (let i = 0; i <= segments; i++) {
    const bearing = (i / segments) * 2 * Math.PI;
    const ptLat = Math.asin(Math.sin(latRad) * Math.cos(angularDist) + Math.cos(latRad) * Math.sin(angularDist) * Math.cos(bearing));
    const ptLng = lngRad + Math.atan2(Math.sin(bearing) * Math.sin(angularDist) * Math.cos(latRad), Math.cos(angularDist) - Math.sin(latRad) * Math.sin(ptLat));
    ring.push([ptLng * 180 / Math.PI, ptLat * 180 / Math.PI]);
  }
  return ring;
};

const describeArea = (area) => {
  if (!area) return null;
  const name = area.name && area.name.trim() ? area.name.trim() : null;
  if (area.mode === "point_radius") return name || `${area.latitude.toFixed(3)}°, ${area.longitude.toFixed(3)}° · ${area.radius_km}km`;
  if (area.mode === "bbox") return name || `BBox ${area.min_lat.toFixed(2)}/${area.min_lng.toFixed(2)} → ${area.max_lat.toFixed(2)}/${area.max_lng.toFixed(2)}`;
  return name || "Area";
};

const areaShape = (area) => {
  const name = area.name && area.name.trim() ? area.name.trim() : "Monitored Area";
  if (area.mode === "point_radius") return { ring: computeGeodesicCircle(area.latitude, area.longitude, area.radius_km, 96), centerLng: area.longitude, centerLat: area.latitude, name };
  return {
    ring: [[area.min_lng, area.min_lat], [area.max_lng, area.min_lat], [area.max_lng, area.max_lat], [area.min_lng, area.max_lat], [area.min_lng, area.min_lat]],
    centerLng: (area.min_lng + area.max_lng) / 2,
    centerLat: (area.min_lat + area.max_lat) / 2,
    name
  };
};

const isPointInArea = (lat, lng, area) => {
  if (!area) return true;
  if (lat == null || lng == null) return false;
  if (area.mode === "point_radius") return haversine(area.latitude, area.longitude, lat, lng) <= area.radius_km * 1000;
  if (area.mode === "bbox") return lat >= area.min_lat && lat <= area.max_lat && lng >= area.min_lng && lng <= area.max_lng;
  return true;
};

const areaZoom = (area) => (area.radius_km > 1000 ? 4 : area.radius_km > 500 ? 5 : area.radius_km > 200 ? 6 : area.radius_km > 100 ? 7 : area.radius_km > 50 ? 8 : 9);

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

const pickerZoomToSpan = (zoom) => 360 / Math.pow(2, zoom);

const pickerSpanToZoom = (span) => Math.max(0, Math.min(Math.log2(360 / Math.max(span, 0.0001)), 22));

const distanceNm = (lat1, lon1, lat2, lon2) => {
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2;
  return 3440.065 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const radiusZoom = (radiusNm, lat) => Math.max(3, Math.min(12, Math.log2((360 * 60 * Math.cos((lat * Math.PI) / 180)) / (radiusNm * 3))));

const SEARCH_STATUS_OPTIONS = [["any", "Any Status"], ["airborne", "Airborne"], ["ground", "On Ground"]];

const SEARCH_SPECIAL_OPTIONS = [["any", "Any Aircraft"], ["military", "Military Only"], ["emergency", "Emergency Squawk"], ["route", "Route Known"], ["noRoute", "Route Unknown"]];

const SEARCH_SOURCE_OPTIONS = [["any", "Any Source"], ["adsbfi", "Seen By adsb.fi"], ["airplaneslive", "Seen By airplanes.live"], ["adsblol", "Seen By adsb.lol"], ["opensky", "Seen By OpenSky"]];

const LOOKUP_FIELD_OPTIONS = [["callsign", "Callsign"], ["registration", "Registration"], ["type", "Aircraft Type"]];

const EMPTY_SEARCH = { text: "", airline: null, type: null, origin: null, destination: null, category: "all", status: "any", special: "any", source: "any", altMin: "", altMax: "", speedMin: "", speedMax: "" };

const SEARCH_RESULT_LIMIT = 200;

const TYPEAHEAD_LIMIT = 30;

const HEATMAP_COLORS = [[78, 205, 196, 0], [78, 205, 196, 100], [255, 234, 0, 160], [255, 145, 0, 200], [255, 23, 68, 230], [255, 0, 0, 255]];

const heatmapColor = (t) => {
  const position = Math.max(0, Math.min(1, t)) * (HEATMAP_COLORS.length - 1);
  const index = Math.min(HEATMAP_COLORS.length - 2, Math.floor(position));
  const f = position - index;
  return HEATMAP_COLORS[index].map((c, i) => Math.round(c + (HEATMAP_COLORS[index + 1][i] - c) * f));
};

const zoomStep = (stops, zoom) => (stops.find(([min]) => zoom >= min) || stops[stops.length - 1])[1];

const heatmapKernels = new Map();

const heatmapKernel = (radius) => {
  if (heatmapKernels.has(radius)) return heatmapKernels.get(radius);
  const size = radius * 2 + 1;
  const kernel = new Float32Array(size * size);
  const sigma = radius / 2.5;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const d2 = (x - radius) * (x - radius) + (y - radius) * (y - radius);
      kernel[y * size + x] = d2 > radius * radius ? 0 : Math.exp(-d2 / (2 * sigma * sigma));
    }
  }
  heatmapKernels.set(radius, kernel);
  return kernel;
};

const renderHeatmap = (canvas, map, entries, globe) => {
  const container = map.getContainer();
  const scale = SOURCES.map.heatmapScale;
  const width = Math.max(1, Math.ceil(container.clientWidth * scale));
  const height = Math.max(1, Math.ceil(container.clientHeight * scale));
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  const context = canvas.getContext("2d");
  const zoom = map.getZoom();
  const radius = Math.max(2, Math.round(zoomStep(SOURCES.map.heatmapRadius, zoom) * scale));
  const intensity = zoomStep(SOURCES.map.heatmapIntensity, zoom);
  const kernel = heatmapKernel(radius);
  const size = radius * 2 + 1;
  const grid = new Float32Array(width * height);
  const center = map.getCenter();
  const facing = { lat: center.lat, lon: center.lng };
  for (const entry of entries) {
    if (entry.lat === null || entry.lon === null || entry.lat === undefined || entry.lon === undefined) continue;
    if (globe && !facingViewer(facing, entry.lat, entry.lon)) continue;
    const point = map.project([entry.lon, entry.lat]);
    const px = Math.round(point.x * scale);
    const py = Math.round(point.y * scale);
    if (px < -radius || py < -radius || px > width + radius || py > height + radius) continue;
    const x0 = Math.max(0, px - radius);
    const x1 = Math.min(width - 1, px + radius);
    const y0 = Math.max(0, py - radius);
    const y1 = Math.min(height - 1, py + radius);
    for (let y = y0; y <= y1; y += 1) {
      const row = y * width;
      const krow = (y - py + radius) * size - px + radius;
      for (let x = x0; x <= x1; x += 1) grid[row + x] += kernel[krow + x];
    }
  }
  let max = 0;
  for (let i = 0; i < grid.length; i += 1) if (grid[i] > max) max = grid[i];
  const image = context.createImageData(width, height);
  if (max > 0) {
    const pixels = image.data;
    for (let i = 0; i < grid.length; i += 1) {
      if (!grid[i]) continue;
      const t = Math.min(1, Math.pow(grid[i] / max, SOURCES.map.heatmapGamma) * intensity * SOURCES.map.heatmapGain);
      if (t < SOURCES.map.heatmapThreshold) continue;
      const color = heatmapColor(t);
      const o = i * 4;
      pixels[o] = color[0];
      pixels[o + 1] = color[1];
      pixels[o + 2] = color[2];
      pixels[o + 3] = color[3];
    }
  }
  context.putImageData(image, 0, 0);
};

const ALTITUDE_STOPS = [[0, [255, 145, 0]], [10000, [255, 234, 0]], [20000, [78, 205, 196]], [30000, [66, 165, 245]], [40000, [179, 136, 255]]];

const GROUND_COLOR = [145, 155, 175];

const EMERGENCY_COLOR = [255, 107, 107];

const SELECTED_COLOR = [235, 240, 248];

const AIRPORT_COLOR = [255, 217, 61];

const LEAD_STATUS_TABS = [["new", "New"], ["reviewing", "Reviewing"], ["adopted", "Adopted"], ["dismissed", "Dismissed"], ["all", "All"]];

const LEAD_KINDS = { auth: { label: "Authentication", color: "#ff6b6b" }, key: { label: "API Key", color: "#FF9500" }, api: { label: "API", color: "#42a5f5" }, catalog: { label: "Catalog", color: "#4ecdc4" }, feed: { label: "Feed", color: "#7fe9e1" }, stream: { label: "Stream", color: "#ffd93d" }, host: { label: "New Host", color: "#cdd4e4" } };

const labelFor = (options, value) => (options.find(([v]) => v === value) || [null, ""])[1];

const valueFor = (options, label) => (options.find(([, l]) => l === label) || [options[0][0]])[0];

const csvQuote = (val) => {
  const s = String(val === null || val === undefined ? "" : val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return `"${s}"`;
};

const titleCaseWords = (text) => String(text || "").replace(/[_-]+/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());

const splitWarning = (message) => {
  const text = String(message || "").trim();
  const index = text.indexOf(": ");
  return index > 0 && index <= 80 ? [text.slice(0, index), text.slice(index + 2)] : ["Error", text];
};

const errorText = (error) => String(error && error.message ? error.message : error).replace(/\.$/, "");

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

const leadEvidence = (lead) => {
  const evidence = lead.evidence || {};
  if (evidence.wwwAuthenticate) return `The host answered ${evidence.status} and asked for ${evidence.wwwAuthenticate.split(/\s+/)[0]} credentials.`;
  if (evidence.status) return `The host answered ${evidence.status} without saying which credentials it wants.`;
  if (evidence.excerpt) return `“${evidence.excerpt.slice(0, 220)}${evidence.excerpt.length > 220 ? "…" : ""}”`;
  if (evidence.linkedFrom) return `Linked from ${evidence.linkedFrom}${evidence.text ? ` as “${evidence.text}”` : ""}.`;
  return "—";
};

const categoryGroup = (entry) => {
  if (entry.mil) return "military";
  const cat = entry.cat || "";
  if (["A3", "A4", "A5"].includes(cat)) return "airliner";
  if (cat === "A2") return "small";
  if (["A1", "B1", "B4"].includes(cat)) return "light";
  if (cat === "A6") return "highPerformance";
  if (cat === "A7") return "rotorcraft";
  if (["C1", "C2", "C3"].includes(cat)) return "surface";
  if (cat) return "other";
  return "unknown";
};

const emergencyOf = (entry) => (entry && entry.sq && EMERGENCY_SQUAWKS[entry.sq]) || null;

const altitudeColor = (alt, ground) => {
  if (ground) return GROUND_COLOR;
  if (alt === null || alt === undefined) return GROUND_COLOR;
  if (alt <= ALTITUDE_STOPS[0][0]) return ALTITUDE_STOPS[0][1];
  for (let i = 1; i < ALTITUDE_STOPS.length; i += 1) {
    const [top, topColor] = ALTITUDE_STOPS[i];
    const [bottom, bottomColor] = ALTITUDE_STOPS[i - 1];
    if (alt <= top) {
      const t = (alt - bottom) / (top - bottom);
      return bottomColor.map((c, index) => Math.round(c + (topColor[index] - c) * t));
    }
  }
  return ALTITUDE_STOPS[ALTITUDE_STOPS.length - 1][1];
};

const aircraftColor = (entry, selectedHex) => {
  if (entry.hex === selectedHex) return SELECTED_COLOR;
  if (emergencyOf(entry)) return EMERGENCY_COLOR;
  return altitudeColor(entry.alt, entry.ground);
};

const iconFor = (entry) => {
  if (entry.ground && (entry.gs === null || entry.gs < 40)) return "ground";
  if (entry.cat === "A7") return "heli";
  return "plane";
};

const projectPosition = (entry, nowSeconds) => {
  if (entry.ground || !entry.gs || entry.gs < 40 || entry.trk === null || entry.trk === undefined || !entry.posAt) return [entry.lon, entry.lat];
  const dt = Math.max(0, Math.min(SOURCES.map.deadReckonSeconds, nowSeconds - entry.posAt));
  const distanceNm = (entry.gs * dt) / 3600;
  const rad = (entry.trk * Math.PI) / 180;
  const lat = entry.lat + (distanceNm * Math.cos(rad)) / 60;
  const lon = entry.lon + (distanceNm * Math.sin(rad)) / (60 * Math.max(0.05, Math.cos((entry.lat * Math.PI) / 180)));
  return [lon, lat];
};

const trailRuns = (trail, sinceSeconds) => {
  const runs = [];
  let run = [];
  for (const point of trail || []) {
    if (sinceSeconds && point[3] < sinceSeconds) continue;
    if (run.length && point[3] - run[run.length - 1][3] > SOURCES.map.trailGapSeconds) {
      if (run.length > 1) runs.push(run);
      run = [];
    }
    run.push(point);
  }
  if (run.length > 1) runs.push(run);
  return runs;
};

const mergeTrail = (server, client) => {
  if (!client || !client.length) return server || [];
  if (!server || !server.length) return client;
  const byTime = new Map();
  for (const point of server) byTime.set(point[3], point);
  for (const point of client) byTime.set(point[3], point);
  return Array.from(byTime.values()).sort((a, b) => a[3] - b[3]);
};

const greatCircle = (from, to) => {
  const toRad = Math.PI / 180;
  const lat1 = from[1] * toRad;
  const lon1 = from[0] * toRad;
  const lat2 = to[1] * toRad;
  const lon2 = to[0] * toRad;
  const angle = 2 * Math.asin(Math.sqrt(Math.sin((lat2 - lat1) / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2));
  if (!Number.isFinite(angle) || angle < 1e-6) return [[from, to]];
  const steps = Math.max(2, Math.min(180, Math.ceil(angle / toRad / SOURCES.map.pathStepDegrees)));
  const points = [];
  for (let i = 0; i <= steps; i += 1) {
    const f = i / steps;
    const a = Math.sin((1 - f) * angle) / Math.sin(angle);
    const b = Math.sin(f * angle) / Math.sin(angle);
    const x = a * Math.cos(lat1) * Math.cos(lon1) + b * Math.cos(lat2) * Math.cos(lon2);
    const y = a * Math.cos(lat1) * Math.sin(lon1) + b * Math.cos(lat2) * Math.sin(lon2);
    const z = a * Math.sin(lat1) + b * Math.sin(lat2);
    points.push([Math.atan2(y, x) / toRad, Math.atan2(z, Math.sqrt(x * x + y * y)) / toRad]);
  }
  const pieces = [[points[0]]];
  for (let i = 1; i < points.length; i += 1) {
    if (Math.abs(points[i][0] - points[i - 1][0]) > 180) pieces.push([]);
    pieces[pieces.length - 1].push(points[i]);
  }
  return pieces.filter((piece) => piece.length > 1);
};

const airportCoords = (code, reference, airportIndex) => {
  if (!code) return null;
  const routeAirport = reference && reference.airports ? reference.airports[code] : null;
  if (routeAirport && Number.isFinite(routeAirport[4]) && Number.isFinite(routeAirport[5])) return [routeAirport[5], routeAirport[4]];
  const known = airportIndex ? airportIndex.get(code) : null;
  return known && Number.isFinite(known.lat) && Number.isFinite(known.lon) ? [known.lon, known.lat] : null;
};

const flightPaths = (entries, reference, airportIndex, nowSeconds) => {
  const paths = [];
  for (const entry of entries) {
    if (!entry.orig || !entry.dest) continue;
    const origin = airportCoords(entry.orig, reference, airportIndex);
    const destination = airportCoords(entry.dest, reference, airportIndex);
    if (!origin || !destination) continue;
    const current = projectPosition(entry, nowSeconds);
    greatCircle(origin, current).forEach((path) => paths.push({ path, flown: true, hex: entry.hex }));
    greatCircle(current, destination).forEach((path) => paths.push({ path, flown: false, hex: entry.hex }));
    if (paths.length >= SOURCES.map.pathMax * 4) break;
  }
  return paths;
};

const normalizeLon = (lon) => ((((lon + 180) % 360) + 360) % 360) - 180;

const inBounds = (bounds, lon, lat) => {
  if (!bounds) return true;
  if (lat < bounds.south || lat > bounds.north) return false;
  if (bounds.east - bounds.west >= 360) return true;
  const west = normalizeLon(bounds.west);
  const east = normalizeLon(bounds.east);
  const value = normalizeLon(lon);
  return west <= east ? value >= west && value <= east : value >= west || value <= east;
};

const formatAltitude = (entry) => {
  if (!entry) return "—";
  if (entry.ground) return "Ground";
  if (entry.alt === null || entry.alt === undefined) return "—";
  return `${Number(entry.alt).toLocaleString()} ft`;
};

const formatNumber = (value, unit = "", digits = 0) => (value === null || value === undefined || isNaN(value) ? "—" : `${Number(value).toLocaleString(undefined, { maximumFractionDigits: digits })}${unit}`);

const formatVertical = (value) => (value === null || value === undefined ? "—" : `${value > 0 ? "+" : ""}${Number(value).toLocaleString()} ft/min`);

const formatSeconds = (posAt) => (posAt ? formatRelativeTime(new Date(posAt * 1000).toISOString()) : "—");

const formatCoords = (lat, lon) => (lat === null || lat === undefined || lon === null || lon === undefined ? "—" : `${Number(lat).toFixed(4)}°, ${Number(lon).toFixed(4)}°`);

const formatDuration = (seconds) => {
  if (seconds === null || seconds === undefined || !Number.isFinite(Number(seconds))) return "—";
  const total = Math.max(0, Math.round(Number(seconds)));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  return hours ? `${hours}h ${minutes}m` : minutes ? `${minutes}m ${rest}s` : `${rest}s`;
};

const outcomeText = (item) => {
  if (!item) return "Not Tracked";
  if (item.outcome === "cleared") return item.nextSquawk ? `Returned To ${item.nextSquawk}` : "Returned To Normal";
  if (item.outcome === "changed") return item.nextSquawk ? `Changed To ${item.nextSquawk}` : "Changed Code";
  if (item.outcome === "lost") return item.endedOnGround || item.lastGround ? "Contact Lost On Ground" : "Contact Lost";
  if (item.outcome === "active") return "Still Squawking";
  return "Not Tracked";
};

const nearestAirport = (airports, lat, lon) => {
  if (lat === null || lat === undefined || lon === null || lon === undefined || !airports.length) return null;
  let best = null;
  for (const airport of airports) {
    const d = (airport.lat - lat) ** 2 + ((airport.lon - lon) * Math.cos((lat * Math.PI) / 180)) ** 2;
    if (!best || d < best.d) best = { d, airport };
  }
  return best ? best.airport : null;
};

const numberOrNull = (value) => (value === "" || value === null || value === undefined || !Number.isFinite(Number(value)) ? null : Number(value));

const matchesSearch = (entry, spec) => {
  const text = String(spec.text || "").trim().toUpperCase();
  if (text && ![entry.flight, entry.reg, entry.hex, entry.type, entry.sq].some((value) => value && String(value).toUpperCase().includes(text))) return false;
  if (spec.airline && entry.al !== spec.airline) return false;
  if (spec.type && entry.type !== spec.type) return false;
  if (spec.origin && entry.orig !== spec.origin) return false;
  if (spec.destination && entry.dest !== spec.destination) return false;
  if (spec.category !== "all" && categoryGroup(entry) !== spec.category) return false;
  if (spec.status === "airborne" && entry.ground) return false;
  if (spec.status === "ground" && !entry.ground) return false;
  if (spec.special === "military" && !entry.mil) return false;
  if (spec.special === "emergency" && !emergencyOf(entry)) return false;
  if (spec.special === "route" && !(entry.orig && entry.dest)) return false;
  if (spec.special === "noRoute" && entry.orig && entry.dest) return false;
  if (spec.source !== "any") {
    const bit = (SOURCE_KEYS.find(([key]) => key === spec.source) || [null, 0])[1];
    if (!(entry.src & bit)) return false;
  }
  const altitude = entry.ground ? 0 : entry.alt;
  const altMin = numberOrNull(spec.altMin);
  const altMax = numberOrNull(spec.altMax);
  if ((altMin !== null || altMax !== null) && (altitude === null || altitude === undefined)) return false;
  if (altMin !== null && altitude < altMin) return false;
  if (altMax !== null && altitude > altMax) return false;
  const speedMin = numberOrNull(spec.speedMin);
  const speedMax = numberOrNull(spec.speedMax);
  if ((speedMin !== null || speedMax !== null) && (entry.gs === null || entry.gs === undefined)) return false;
  if (speedMin !== null && entry.gs < speedMin) return false;
  if (speedMax !== null && entry.gs > speedMax) return false;
  return true;
};

const titleCaseName = (text) => String(text || "").toLowerCase().replace(/(^|[\s/(-])([a-z])/g, (match, lead, ch) => `${lead}${ch.toUpperCase()}`);

const airlineLabel = (code, reference) => {
  if (!code) return null;
  const entry = reference && reference.airlines ? reference.airlines[code] : null;
  return entry && entry[0] ? `${entry[0]} (${code})` : code;
};

const typeLabel = (code, reference) => {
  if (!code) return null;
  const desc = reference && reference.types ? reference.types[code] : null;
  return desc ? `${titleCaseName(desc)} (${code})` : code;
};

const airportLabel = (code, reference, airportIndex) => {
  if (!code) return null;
  const routeAirport = reference && reference.airports ? reference.airports[code] : null;
  const known = airportIndex ? airportIndex.get(code) : null;
  const name = (routeAirport && routeAirport[0]) || (known && known.name);
  const city = (routeAirport && routeAirport[2]) || (known && known.city);
  const iata = (routeAirport && routeAirport[1]) || (known && known.iata);
  return name ? `${iata ? `${iata} | ` : ""}${name}${city && !name.includes(city) ? `, ${city}` : ""} (${code})` : code;
};

const routeText = (entry, reference) => {
  if (!entry || !entry.orig || !entry.dest) return null;
  const short = (code) => {
    const airport = reference && reference.airports ? reference.airports[code] : null;
    return (airport && airport[1]) || code;
  };
  return `${short(entry.orig)} → ${short(entry.dest)}`;
};

const facingViewer = (center, lat, lon) => {
  const toRad = Math.PI / 180;
  return Math.sin(center.lat * toRad) * Math.sin(lat * toRad) + Math.cos(center.lat * toRad) * Math.cos(lat * toRad) * Math.cos((lon - center.lon) * toRad) > 0.02;
};

const sourceAlert = (source) => {
  const cooling = source.cooldownUntil && new Date(source.cooldownUntil) > new Date();
  const resume = cooling ? `Resumes ${new Date(source.cooldownUntil).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : null;
  if (source.enabled === false) return { tone: "muted", title: "Source Disabled", text: source.note || "This source is turned off on the server.", meta: null };
  if (source.lastError && source.lastSuccessAt) return { tone: "warning", title: "Backing Off", text: `${source.lastError} Requests resume automatically when the cooldown ends.`, meta: resume };
  if (source.lastError) return { tone: "error", title: "Not Reporting", text: `${source.lastError}${source.note ? ` ${source.note}` : ""}`, meta: resume };
  return null;
};

const SOURCE_ALERT_ICONS = { error: faExclamationTriangle, warning: faClock, muted: faBan };

const renderSourceAlert = (alert, compact) => (alert ? (
  <div className={`satWeatherAlert satWeatherAlert${alert.tone.charAt(0).toUpperCase()}${alert.tone.slice(1)} ${compact ? "satWeatherAlertCompact" : ""}`}>
    <FontAwesomeIcon icon={SOURCE_ALERT_ICONS[alert.tone] || faExclamationTriangle} className="satWeatherAlertIcon" />
    <div className="satWeatherAlertBody">
      <div className="satWeatherAlertHead">
        <span className="satWeatherAlertTitle">{alert.title}</span>
        {alert.meta && <span className="satWeatherAlertMeta">{alert.meta}</span>}
      </div>
      <div className="satWeatherAlertText" title={compact ? alert.text : undefined}>{alert.text}</div>
    </div>
  </div>
) : null);

const sourceStatusLabel = (source) => {
  if (source.enabled === false) return { label: "Disabled", color: "#919baf" };
  const cooling = source.cooldownUntil && new Date(source.cooldownUntil) > new Date();
  if (source.lastError && source.lastSuccessAt) return { label: cooling ? "Cooling Down" : "Recovering", color: "#FF9500" };
  if (source.lastError) return { label: "Error", color: "#ff6b6b" };
  if (source.lastSuccessAt) return { label: "Reporting", color: "#4ecdc4" };
  return { label: "Pending", color: "#919baf" };
};

const displayName = (entry) => (entry ? entry.flight || entry.reg || entry.hex.toUpperCase() : "—");

const sourceNames = (src, sources) => SOURCE_KEYS.filter(([, bit]) => src & bit).map(([key]) => (sources && sources[key] ? sources[key].name : key)).join(", ") || "—";

const ISOLATED_GLOBALS = new Set(["deck", "luma", "loaders", "probe", "maplibregl"]);

const createIsolatedGlobal = (store) => new Proxy(window, {
  get: (target, key) => {
    if (Object.prototype.hasOwnProperty.call(store, key)) return store[key];
    if (ISOLATED_GLOBALS.has(key)) return undefined;
    const value = Reflect.get(target, key);
    return typeof value === "function" && typeof key === "string" && /^[a-z]/.test(key) ? value.bind(target) : value;
  },
  set: (target, key, value) => {
    store[key] = value;
    return true;
  }
});

const evaluateModule = async (url, isolatedGlobal) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`The script ${url} returned status ${response.status}.`);
  const code = await response.text();
  const module = { exports: {} };
  if (isolatedGlobal) new Function("module", "exports", "globalThis", "window", "self", code)(module, module.exports, isolatedGlobal, isolatedGlobal, isolatedGlobal);
  else new Function("module", "exports", code)(module, module.exports);
  return module.exports;
};

const loadCSS = (href, id) => {
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
};

let mapLibrariesPromise = null;

const loadMapDeps = () => {
  if (mapLibrariesPromise) return mapLibrariesPromise;
  mapLibrariesPromise = (async () => {
    loadCSS(SOURCES.assets.maplibreCss, "flight-maplibre-css");
    const store = {};
    const isolated = createIsolatedGlobal(store);
    const [maplibregl, deck] = await Promise.all([evaluateModule(SOURCES.assets.maplibreScript, null), evaluateModule(SOURCES.assets.deckScript, isolated)]);
    store.deck = deck;
    const mapbox = await evaluateModule(SOURCES.assets.deckMapboxScript, isolated);
    const MapboxOverlay = mapbox.MapboxOverlay || (store.deck && store.deck.MapboxOverlay);
    if (!maplibregl || !maplibregl.Map) throw new Error("MapLibre GL did not load.");
    if (!deck || !deck.IconLayer || !MapboxOverlay) throw new Error("Deck.gl did not load.");
    return { maplibregl, deck: { ...deck, MapboxOverlay } };
  })().catch((error) => {
    mapLibrariesPromise = null;
    throw error;
  });
  return mapLibrariesPromise;
};

const PLANE_POINTS = [[32, 2], [36, 10], [36, 24], [60, 36], [60, 41], [36, 34], [35, 50], [43, 56], [43, 60], [32, 57], [21, 60], [21, 56], [29, 50], [28, 34], [4, 41], [4, 36], [28, 24], [28, 10]];

const APPLE_ICON_SVG = {
  plane: `<path d="M${PLANE_POINTS.map(([x, y]) => `${x} ${y}`).join(" L")} Z" />`,
  heli: "<ellipse cx=\"32\" cy=\"30\" rx=\"9\" ry=\"13\" /><rect x=\"30\" y=\"40\" width=\"4\" height=\"20\" /><rect x=\"24\" y=\"56\" width=\"16\" height=\"4\" /><path d=\"M6 8 L58 52 M58 8 L6 52\" stroke=\"currentColor\" stroke-width=\"4\" />",
  ground: "<path d=\"M32 14 L50 32 L32 50 L14 32 Z\" />"
};

const loadMapKitJS = () => new Promise((resolve, reject) => {
  if (window.mapkit && window.__dinoMapkitInitialized) {
    resolve(window.mapkit);
    return;
  }
  const initialize = () => {
    if (!window.__dinoMapkitInitialized) {
      try {
        window.mapkit.init({ authorizationCallback: (done) => done(SOURCES.assets.mapkitToken) });
      } catch (error) {
        if (!/already/i.test(error.message || "")) throw error;
      }
      window.__dinoMapkitInitialized = true;
    }
    resolve(window.mapkit);
  };
  if (document.querySelector("script[src*=\"apple-mapkit\"]")) {
    const check = setInterval(() => {
      if (window.mapkit) {
        clearInterval(check);
        try {
          initialize();
        } catch (error) {
          reject(error);
        }
      }
    }, 100);
    setTimeout(() => {
      clearInterval(check);
      reject(new Error("The MapKit JS load timed out."));
    }, SOURCES.map.appleLoadTimeoutMs);
    return;
  }
  const script = document.createElement("script");
  script.src = SOURCES.assets.mapkitScript;
  script.crossOrigin = "anonymous";
  const timeout = setTimeout(() => reject(new Error("The MapKit JS load timed out.")), SOURCES.map.appleLoadTimeoutMs);
  script.addEventListener("load", () => {
    clearTimeout(timeout);
    try {
      initialize();
    } catch (error) {
      reject(error);
    }
  });
  script.addEventListener("error", () => {
    clearTimeout(timeout);
    reject(new Error("The MapKit JS script failed to load."));
  });
  document.head.appendChild(script);
});

const zoomToSpan = (zoom) => 360 / Math.pow(2, zoom);

const spanToZoom = (span) => Math.max(0, Math.min(Math.log2(360 / Math.max(span, 0.0001)), 22));

const rgb = (color) => `rgb(${color[0]}, ${color[1]}, ${color[2]})`;

const buildIconAtlas = () => {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size * 3;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  PLANE_POINTS.forEach(([x, y], index) => (index ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.translate(size, 0);
  ctx.beginPath();
  ctx.ellipse(32, 30, 9, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(30, 40, 4, 20);
  ctx.fillRect(24, 56, 16, 4);
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(6, 8);
  ctx.lineTo(58, 52);
  ctx.moveTo(58, 8);
  ctx.lineTo(6, 52);
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.translate(size * 2, 0);
  ctx.beginPath();
  ctx.moveTo(32, 14);
  ctx.lineTo(50, 32);
  ctx.lineTo(32, 50);
  ctx.lineTo(14, 32);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  const entry = (x) => ({ x, y: 0, width: size, height: size, anchorX: size / 2, anchorY: size / 2, mask: true });
  return { atlas: canvas.toDataURL(), mapping: { plane: entry(0), heli: entry(size), ground: entry(size * 2) } };
};

const ResponsiveChart = ({ option, className, onExpand }) => {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(() => {
      try {
        chartRef.current?.getEchartsInstance()?.resize();
      } catch (error) {
        return;
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={containerRef} className={`satEarthCondChartWrapper ${onExpand ? "satEarthCondExpandable" : ""}`} onClick={onExpand}>
      <ReactEcharts ref={chartRef} option={option} className={className} autoResize={false} />
    </div>
  );
};

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
  const maplibreRef = useRef(null);
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
    if (libreMapRef.current && maplibreRef.current) {
      if (!libreMarkerRef.current) {
        const element = document.createElement("div");
        element.className = "satEarthCondPickerMarker";
        libreMarkerRef.current = new maplibreRef.current.Marker({ element }).setLngLat([lon, lat]).addTo(libreMapRef.current);
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
    loadMapDeps().then(({ maplibregl }) => {
      maplibreRef.current = maplibregl;
      if (cancelled || !libreContainerRef.current) return;
      const map = new maplibregl.Map({
        container: libreContainerRef.current,
        style: {
          version: 8,
          sources: {
            "satellite-tiles": { type: "raster", tiles: [SOURCES.assets.satelliteTiles], tileSize: 256, maxzoom: 19, attribution: "Tiles Esri" },
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
    loadMapKitJS().then(mapkit => {
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

const Typeahead = ({ label, placeholder, value, options, onChange, wide }) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const selected = value ? options.find((option) => option.value === value) : null;
  const needle = query.trim().toLowerCase();
  const matches = options.filter((option) => !needle || option.label.toLowerCase().includes(needle) || option.value.toLowerCase().includes(needle)).slice(0, TYPEAHEAD_LIMIT);
  return (
    <div className={`satOpField ${wide ? "satOpFieldWide" : ""}`}>
      <label className="satOpLabel">{label}</label>
      {value ? (
        <div className="satFlightTypeaheadChosen">
          <span className="satFlightTypeaheadChosenText" title={selected ? selected.label : value}>{selected ? selected.label : value}</span>
          <button type="button" className="satFlightTypeaheadClear" onClick={() => onChange(null)} aria-label={`Clear ${label}`}>
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
      ) : (
        <div className="satFlightTypeahead">
          <input
            type="text"
            className="satEarthCondInput"
            placeholder={placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
          />
          {open && (
            <div className="satFlightTypeaheadList">
              {matches.length ? matches.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className="satFlightTypeaheadOption"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(option.value);
                    setQuery("");
                    setOpen(false);
                  }}
                >
                  <span className="satFlightTypeaheadOptionLabel">{option.label}</span>
                  <span className="satFlightTypeaheadOptionCount">{option.count.toLocaleString()}</span>
                </button>
              )) : <div className="satFlightTypeaheadEmpty">Nothing in current traffic matches that text.</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
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
      const response = await fetch(`${SOURCES.harvest.base}/leads?${params.toString()}`);
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
      const response = await fetch(`${SOURCES.harvest.base}/leads/${lead.leadId}`, {
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
      const response = await fetch(`${SOURCES.harvest.base}/leads?${params.toString()}`);
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
          <FontAwesomeIcon icon={faSearchPlus} className="satOpSearchBarIcon" />
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
        <div className="satFeedsEmpty">{error}</div>
      ) : loading && leads.length === 0 ? (
        <div className="satFeedsEmpty">Loading Leads</div>
      ) : (
        <FeedsTable columns={["Lead", "Kind", "Hits", "Last Seen", ""]} widths={["auto", "124px", "56px", "88px", "140px"]} rows={rows} emptyText={needle ? "No leads match that text." : "No leads match this filter."} />
      )}
    </FeedsModal>
  );
};

const FlightTracker = () => {
  const navigate = useNavigate();
  const { token, loading: authLoading } = useAuth();

  const [harvestHealth, setHarvestHealth] = useState(null);
  const [harvestHealthError, setHarvestHealthError] = useState(null);
  const [harvestObjects, setHarvestObjects] = useState(0);
  const [censusFrames, setCensusFrames] = useState(null);
  const [emergencyFrames, setEmergencyFrames] = useState(null);
  const [showLeads, setShowLeads] = useState(false);
  const [expandedWarnings, setExpandedWarnings] = useState({});
  const toggleWarning = (key) => setExpandedWarnings((current) => ({ ...current, [key]: !current[key] }));

  const loadHarvestHealth = useCallback(async () => {
    try {
      const [healthResponse, productsResponse] = await Promise.all([
        fetch(`${SOURCES.harvest.base}/health`),
        fetch(`${SOURCES.harvest.base}/products?domain=${SOURCES.harvest.domain}&limit=1`)
      ]);
      const health = await healthResponse.json().catch(() => null);
      const products = productsResponse.ok ? await productsResponse.json().catch(() => null) : null;
      if (!healthResponse.ok || !health) throw new Error(`The harvester health request failed with status ${healthResponse.status}.`);
      setHarvestHealth(health);
      setHarvestObjects(products ? products.total : 0);
      setHarvestHealthError(null);
    } catch (error) {
      setHarvestHealthError(errorText(error));
    }
  }, []);

  useEffect(() => {
    loadHarvestHealth();
    const timer = setInterval(loadHarvestHealth, SOURCES.harvest.healthRefreshMs);
    return () => clearInterval(timer);
  }, [loadHarvestHealth]);

  const harvestSources = useMemo(() => (harvestHealth?.sources || []).filter((source) => source.domain === SOURCES.harvest.domain), [harvestHealth]);

  const harvestStats = useMemo(() => {
    const jobs = (harvestHealth?.queue || []).filter((row) => SOURCES.harvest.jobPattern.test(row.job_type));
    return {
      frames: harvestSources.reduce((sum, source) => sum + (Number(source.frames) || 0), 0),
      due: jobs.reduce((sum, row) => sum + (Number(row.due) || 0), 0),
      running: jobs.reduce((sum, row) => sum + (Number(row.running) || 0), 0),
      sources: harvestSources.length,
      failing: harvestSources.filter((source) => source.enabled && source.error_streak >= 3).length
    };
  }, [harvestHealth, harvestSources]);

  const harvestWarnings = useMemo(() => harvestSources.filter((source) => source.enabled && source.last_error).map((source) => `${source.name}: ${source.last_error}`), [harvestSources]);

  const harvestStatusLabel = harvestHealth?.status === "Needs Schema" || harvestHealth?.status === "Idle"
    ? harvestHealth.status
    : harvestHealth
      ? (harvestStats.failing ? "Degraded" : "Healthy")
      : harvestHealthError ? "Unavailable" : "Loading";

  useEffect(() => {
    let cancelled = false;
    const count = (key) => fetch(`${SOURCES.harvest.base}/products/${encodeURIComponent(key)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => (data && data.product ? data.product.frameCount : 0))
      .catch(() => null);
    Promise.all([count(SOURCES.harvest.trafficProduct), count(SOURCES.harvest.emergencyProduct)]).then(([traffic, emergencies]) => {
      if (cancelled) return;
      setCensusFrames(traffic);
      setEmergencyFrames(emergencies);
    });
    return () => {
      cancelled = true;
    };
  }, [harvestHealth]);

  const exportHarvest = (productKey, format) => {
    const to = new Date();
    const from = new Date(to.getTime() - SOURCES.harvest.exportDays * 86400000);
    const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString(), format });
    window.open(`${SOURCES.harvest.base}/products/${encodeURIComponent(productKey)}/export?${params.toString()}`, "_blank", "noopener");
  };

  const [activeTab, setActiveTab] = useState("map");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [searchQuery, setSearchQuery] = useState("");
  const [layerVisibility, setLayerVisibility] = useState(DEFAULT_LAYERS);
  const [globeMode, setGlobeMode] = useState(false);
  const [globeCenter, setGlobeCenter] = useState(null);
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [showAirborne, setShowAirborne] = useState(true);
  const [showGround, setShowGround] = useState(true);
  const [monochrome, setMonochrome] = useState(false);
  const [serverTrails, setServerTrails] = useState({});
  const [reference, setReference] = useState({ airlines: {}, types: {}, airports: {}, routes: null });
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchSpec, setSearchSpec] = useState(EMPTY_SEARCH);
  const [searchApplied, setSearchApplied] = useState(false);
  const [searchTab, setSearchTab] = useState("filters");
  const [selectedLocation, setSelectedLocation] = useState(WORLDWIDE_KEY);
  const [customLocationLabel, setCustomLocationLabel] = useState(null);
  const [locationQuery, setLocationQuery] = useState("");
  const [locationResults, setLocationResults] = useState([]);
  const [locationSearchStatus, setLocationSearchStatus] = useState("");
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [airspaceRadius, setAirspaceRadius] = useState(50);
  const [airspaceCeiling, setAirspaceCeiling] = useState(0);
  const [orgid] = useState(localStorage.getItem("orgid") || "default_org");
  const [username] = useState(localStorage.getItem("username") || "default_user");
  const [areas, setAreas] = useState([]);
  const [selectedAreaId, setSelectedAreaId] = useState(null);
  const [editingAreaId, setEditingAreaId] = useState(null);
  const [areaFilterActive, setAreaFilterActive] = useState(false);
  const [areaFormData, setAreaFormData] = useState({ ...INITIAL_AREA_FORM });
  const [isGeocodingArea, setIsGeocodingArea] = useState(false);
  const [areaModalOpen, setAreaModalOpen] = useState(false);
  const [areasLoaded, setAreasLoaded] = useState(false);
  const [stateRestored, setStateRestored] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [apiSuccess, setApiSuccess] = useState(null);
  const pendingCameraRef = useRef(null);
  const locationRef = useRef(null);
  const [lookupField, setLookupField] = useState("type");
  const [lookupValue, setLookupValue] = useState("");
  const [lookupState, setLookupState] = useState({ loading: false, message: null, rows: [] });
  const [layoutVisibility, setLayoutVisibility] = useState(DEFAULT_LAYOUT);
  const [expandedView, setExpandedView] = useState(null);
  const [dataVersion, setDataVersion] = useState(0);
  const [feedInfo, setFeedInfo] = useState(null);
  const [feedError, setFeedError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [latency, setLatency] = useState(0);
  const [fullStats, setFullStats] = useState(null);
  const [trafficHistory, setTrafficHistory] = useState([]);
  const [emergencyHistory, setEmergencyHistory] = useState([]);
  const [emergencyOutcomes, setEmergencyOutcomes] = useState([]);
  const [squawkFeed, setSquawkFeed] = useState({ active: [], ended: [] });
  const [airports, setAirports] = useState([]);
  const [airportsError, setAirportsError] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [viewState, setViewState] = useState({ lat: SOURCES.map.center[1], lon: SOURCES.map.center[0], zoom: SOURCES.map.zoom, bounds: null });
  const [animationTick, setAnimationTick] = useState(0);
  const [selectedHex, setSelectedHex] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [selectedError, setSelectedError] = useState(null);
  const [followSelected, setFollowSelected] = useState(false);
  const [hoverInfo, setHoverInfo] = useState(null);
  const [listScope, setListScope] = useState("view");
  const [listSort, setListSort] = useState("flight");
  const [activeProvider, setActiveProvider] = useState(MAP_PROVIDER_DECKGL);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [mapProviderError, setMapProviderError] = useState(null);

  const aircraftRef = useRef(new Map());
  const libsRef = useRef(null);
  const appleTrailsRef = useRef([]);
  const heatCanvasRef = useRef(null);
  const trailBufferRef = useRef(new Map());
  const applePathsRef = useRef([]);
  const feedMetaRef = useRef({ epoch: null, version: 0 });
  const pollingRef = useRef(false);
  const viewRef = useRef(null);
  const deckglMapRef = useRef(null);
  const overlayRef = useRef(null);
  const mapContainerRef = useRef(null);
  const appleMapRef = useRef(null);
  const appleMapContainerRef = useRef(null);
  const deckglMapContainerRef = useRef(null);
  const mapProviderRef = useRef(MAP_PROVIDER_DECKGL);
  const switchingProviderRef = useRef(false);
  const appleMapReadyRef = useRef(false);
  const deckOnlyRef = useRef(false);
  const appleAircraftRef = useRef(new Map());
  const appleAirportsRef = useRef([]);
  const iconAtlasRef = useRef(null);
  const tabContentRef = useRef(null);

  useEffect(() => {
    if (!authLoading && !token) navigate("/login");
  }, [authLoading, token, navigate]);

  useEffect(() => {
    if (!expandedView) return undefined;
    const handleKey = (event) => { if (event.key === "Escape") setExpandedView(null); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [expandedView]);

  const applySnapshot = useCallback((data) => {
    const store = aircraftRef.current;
    const buffer = trailBufferRef.current;
    const cutoff = Date.now() / 1000 - SOURCES.map.trailSeconds;
    if (data.full) store.clear();
    const fields = data.fields || [];
    for (const row of data.rows || []) {
      const entry = {};
      fields.forEach((field, index) => {
        entry[field] = row[index];
      });
      entry.ground = Boolean(entry.ground);
      entry.mil = Boolean(entry.mil);
      store.set(entry.hex, entry);
      if (entry.lat !== null && entry.lon !== null && entry.lat !== undefined && entry.lon !== undefined && entry.posAt) {
        const list = buffer.get(entry.hex) || [];
        const last = list[list.length - 1];
        if (!last || entry.posAt - last[3] >= SOURCES.map.trailClientMinSeconds) {
          list.push([entry.lon, entry.lat, entry.alt, entry.posAt]);
          while (list.length && list[0][3] < cutoff) list.shift();
          buffer.set(entry.hex, list);
        }
      }
    }
    for (const hex of data.removed || []) {
      store.delete(hex);
      buffer.delete(hex);
    }
    if (data.full) for (const hex of buffer.keys()) if (!store.has(hex)) buffer.delete(hex);
    feedMetaRef.current = { epoch: data.epoch, version: data.version };
  }, []);

  const pollSnapshot = useCallback(async () => {
    if (pollingRef.current) return;
    pollingRef.current = true;
    const started = performance.now();
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const meta = feedMetaRef.current;
      if (meta.epoch) {
        params.set("epoch", meta.epoch);
        params.set("since", String(meta.version));
      }
      if (locationRef.current) {
        const { lat, lon, radius } = locationRef.current;
        const dLat = radius / 60;
        const dLon = radius / (60 * Math.max(0.1, Math.cos((lat * Math.PI) / 180)));
        params.set("lat", lat.toFixed(3));
        params.set("lon", lon.toFixed(3));
        params.set("zoom", String(Math.max(6, viewRef.current ? viewRef.current.zoom : 6).toFixed(1)));
        params.set("west", (lon - dLon).toFixed(3));
        params.set("south", Math.max(-85, lat - dLat).toFixed(3));
        params.set("east", (lon + dLon).toFixed(3));
        params.set("north", Math.min(85, lat + dLat).toFixed(3));
      } else if (viewRef.current) {
        params.set("lat", viewRef.current.lat.toFixed(3));
        params.set("lon", viewRef.current.lon.toFixed(3));
        params.set("zoom", viewRef.current.zoom.toFixed(1));
        if (viewRef.current.bounds) {
          params.set("west", viewRef.current.bounds.west.toFixed(3));
          params.set("south", viewRef.current.bounds.south.toFixed(3));
          params.set("east", viewRef.current.bounds.east.toFixed(3));
          params.set("north", viewRef.current.bounds.north.toFixed(3));
        }
      }
      const response = await fetch(`${apiUrl("snapshot")}?${params.toString()}`);
      const data = await response.json().catch(() => null);
      if (!response.ok || !data || !data.success) throw new Error((data && data.message) || `The flight feed returned status ${response.status}.`);
      applySnapshot(data);
      setFeedInfo({ total: data.total, stats: data.stats, sources: data.sources, sweep: data.sweep, updatedAt: data.updatedAt, version: data.version, epoch: data.epoch });
      if (data.squawks) setSquawkFeed({ active: data.squawks.active || [], ended: data.squawks.ended || [] });
      setFeedError(null);
      setLatency(Math.round(performance.now() - started));
      setDataVersion((value) => value + 1);
    } catch (error) {
      setFeedError(`The flight feed could not be reached because of the error "${errorText(error)}".`);
    } finally {
      pollingRef.current = false;
      setLoading(false);
    }
  }, [applySnapshot]);

  useEffect(() => {
    if (authLoading || !token) return undefined;
    pollSnapshot();
    if (!autoRefresh) return undefined;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") pollSnapshot();
    }, refreshInterval);
    return () => clearInterval(timer);
  }, [authLoading, token, autoRefresh, refreshInterval, pollSnapshot]);

  const loadStats = useCallback(async () => {
    try {
      const response = await fetch(apiUrl("stats"));
      const data = await response.json().catch(() => null);
      if (response.ok && data && data.success) setFullStats(data.stats);
    } catch (error) {
      return;
    }
  }, []);

  useEffect(() => {
    if (authLoading || !token) return undefined;
    loadStats();
    const timer = setInterval(loadStats, SOURCES.refresh.statsMs);
    return () => clearInterval(timer);
  }, [authLoading, token, loadStats]);

  const loadHistory = useCallback(async () => {
    const from = new Date(Date.now() - SOURCES.harvest.historyDays * 86400000).toISOString();
    const frames = (key, params) => fetch(`${SOURCES.harvest.base}/products/${encodeURIComponent(key)}/frames?${new URLSearchParams({ from, ...params }).toString()}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => (data && data.frames ? data.frames : []))
      .catch(() => []);
    const [traffic, emergencies, outcomes] = await Promise.all([
      frames(SOURCES.harvest.trafficProduct, { step: String(SOURCES.harvest.historyStepSeconds), limit: "400" }),
      frames(SOURCES.harvest.emergencyProduct, { limit: "300" }),
      frames(SOURCES.harvest.outcomeProduct, { limit: "300" })
    ]);
    setTrafficHistory(traffic);
    setEmergencyHistory(emergencies.slice().reverse());
    setEmergencyOutcomes(outcomes);
  }, []);

  useEffect(() => {
    if (activeTab === "overview") loadHistory();
  }, [activeTab, loadHistory, censusFrames]);

  useEffect(() => {
    if (!layerVisibility.airports || airports.length) return undefined;
    let cancelled = false;
    fetch(apiUrl("airports"))
      .then((response) => response.json().then((data) => ({ response, data })))
      .then(({ response, data }) => {
        if (cancelled) return;
        if (!response.ok || !data.success) throw new Error(data.message || `The airport request returned status ${response.status}.`);
        const fields = data.fields || [];
        setAirports((data.rows || []).map((row) => Object.fromEntries(fields.map((field, index) => [field, row[index]]))));
        setAirportsError(null);
      })
      .catch((error) => {
        if (!cancelled) setAirportsError(`The airport list could not be loaded because of the error "${errorText(error)}".`);
      });
    return () => {
      cancelled = true;
    };
  }, [layerVisibility.airports, airports.length]);

  const loadReference = useCallback(async () => {
    try {
      const response = await fetch(apiUrl("reference"));
      const data = await response.json().catch(() => null);
      if (response.ok && data && data.success) setReference({ airlines: data.airlines || {}, types: data.types || {}, airports: data.airports || {}, routes: data.routes || null, airlineError: data.airlineError || null });
    } catch (error) {
      return;
    }
  }, []);

  useEffect(() => {
    if (authLoading || !token) return undefined;
    loadReference();
    const timer = setInterval(loadReference, SOURCES.refresh.referenceMs);
    return () => clearInterval(timer);
  }, [authLoading, token, loadReference]);

  const setView = useCallback((next) => {
    viewRef.current = next;
    setViewState(next);
  }, []);

  const updateViewFromDeck = useCallback(() => {
    const map = deckglMapRef.current;
    if (!map || !map.getContainer().clientWidth) return;
    const center = map.getCenter();
    const bounds = map.getBounds();
    setView({ lat: center.lat, lon: normalizeLon(center.lng), zoom: map.getZoom(), bounds: { west: bounds.getWest(), east: bounds.getEast(), south: bounds.getSouth(), north: bounds.getNorth() } });
  }, [setView]);

  const updateViewFromApple = useCallback(() => {
    const map = appleMapRef.current;
    if (!map) return;
    const region = map.region;
    const lat = region.center.latitude;
    const lon = region.center.longitude;
    setView({ lat, lon: normalizeLon(lon), zoom: spanToZoom(region.span.latitudeDelta), bounds: { west: lon - region.span.longitudeDelta / 2, east: lon + region.span.longitudeDelta / 2, south: lat - region.span.latitudeDelta / 2, north: lat + region.span.latitudeDelta / 2 } });
  }, [setView]);

  const switchToProvider = useCallback((targetProvider, lat, lng, zoom, pitch, bearing) => {
    if (switchingProviderRef.current || mapProviderRef.current === targetProvider) return;
    switchingProviderRef.current = true;
    mapProviderRef.current = targetProvider;
    setActiveProvider(targetProvider);
    setHoverInfo(null);
    if (targetProvider === MAP_PROVIDER_APPLE) {
      if (appleMapRef.current && window.mapkit) {
        const span = zoomToSpan(zoom);
        appleMapRef.current.setRegionAnimated(new window.mapkit.CoordinateRegion(new window.mapkit.Coordinate(lat, lng), new window.mapkit.CoordinateSpan(span, span)), false);
        appleMapRef.current.rotation = bearing;
      }
      if (appleMapContainerRef.current) appleMapContainerRef.current.style.display = "block";
      if (deckglMapContainerRef.current) deckglMapContainerRef.current.style.display = "none";
    } else {
      if (deckglMapRef.current) {
        deckglMapRef.current.jumpTo({ center: [lng, lat], zoom, pitch, bearing });
        deckglMapRef.current.resize();
      }
      if (appleMapContainerRef.current) appleMapContainerRef.current.style.display = "none";
      if (deckglMapContainerRef.current) deckglMapContainerRef.current.style.display = "block";
    }
    setTimeout(() => {
      switchingProviderRef.current = false;
      if (targetProvider === MAP_PROVIDER_APPLE) {
        updateViewFromApple();
      } else {
        if (deckglMapRef.current) deckglMapRef.current.resize();
        updateViewFromDeck();
      }
    }, 300);
  }, [updateViewFromApple, updateViewFromDeck]);

  const initDeckGlMap = useCallback(() => {
    const libs = libsRef.current;
    if (!deckglMapContainerRef.current || !libs) return null;
    const { maplibregl } = libs;
    const map = new maplibregl.Map({
      container: deckglMapContainerRef.current,
      style: {
        version: 8,
        sources: {
          "satellite-tiles": { type: "raster", tiles: [SOURCES.assets.satelliteTiles], tileSize: 256, maxzoom: 19, attribution: "Tiles Esri" },
          "labels-tiles": { type: "raster", tiles: [SOURCES.assets.labelTiles], tileSize: 256, maxzoom: 19 }
        },
        layers: [
          { id: "satellite-layer", type: "raster", source: "satellite-tiles" },
          { id: "labels-layer", type: "raster", source: "labels-tiles", paint: { "raster-opacity": 0.9 } }
        ],
        glyphs: SOURCES.assets.glyphs
      },
      center: SOURCES.map.center,
      zoom: SOURCES.map.zoom,
      minZoom: SOURCES.map.minZoom,
      maxZoom: SOURCES.map.maxZoom,
      pitch: 0,
      bearing: 0,
      antialias: true,
      attributionControl: false
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(new maplibregl.ScaleControl(), "bottom-left");
    map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: SOURCES.attributions }), "bottom-right");
    map.on("moveend", () => {
      if (mapProviderRef.current !== MAP_PROVIDER_DECKGL) return;
      updateViewFromDeck();
      const c = map.getCenter();
      const z = map.getZoom();
      if (z >= SOURCES.map.appleZoomThreshold && appleMapReadyRef.current && !switchingProviderRef.current && !deckOnlyRef.current) switchToProvider(MAP_PROVIDER_APPLE, c.lat, c.lng, z, map.getPitch(), map.getBearing());
    });
    return map;
  }, [updateViewFromDeck, switchToProvider]);

  const initAppleMap = useCallback((mapkit) => {
    if (!appleMapContainerRef.current) return null;
    const map = new mapkit.Map(appleMapContainerRef.current, {
      mapType: mapkit.Map.MapTypes.Hybrid,
      showsCompass: mapkit.FeatureVisibility.Visible,
      showsZoomControl: true,
      showsScale: mapkit.FeatureVisibility.Visible,
      showsMapTypeControl: false,
      showsUserLocationControl: true,
      showsPointsOfInterest: true,
      isRotationEnabled: true,
      isScrollEnabled: true,
      isZoomEnabled: true,
      padding: new mapkit.Padding(0, 0, 0, 0),
      center: new mapkit.Coordinate(SOURCES.map.center[1], SOURCES.map.center[0]),
      cameraBoundary: null,
      cameraDistance: 50000000,
      colorScheme: mapkit.Map.ColorSchemes.Dark
    });
    map.rotation = 0;
    map.addEventListener("region-change-end", () => {
      if (mapProviderRef.current !== MAP_PROVIDER_APPLE) return;
      updateViewFromApple();
      const lat = map.center.latitude;
      const lng = map.center.longitude;
      const zoom = spanToZoom(map.region.span.latitudeDelta);
      if (zoom < SOURCES.map.appleZoomThreshold && !switchingProviderRef.current) switchToProvider(MAP_PROVIDER_DECKGL, lat, lng, zoom, 0, map.rotation || 0);
    });
    return map;
  }, [updateViewFromApple, switchToProvider]);

  useEffect(() => {
    if (authLoading || !token || !mapContainerRef.current) return undefined;
    let cancelled = false;
    let observer = null;
    const host = mapContainerRef.current;
    const claimWheel = (event) => { event.preventDefault(); };
    host.addEventListener("wheel", claimWheel, { passive: false, capture: true });
    const createDiv = (display) => {
      const d = document.createElement("div");
      Object.assign(d.style, { width: "100%", height: "100%", position: "absolute", top: "0", left: "0", display });
      host.appendChild(d);
      return d;
    };
    appleMapContainerRef.current = createDiv("none");
    deckglMapContainerRef.current = createDiv("block");
    mapProviderRef.current = MAP_PROVIDER_DECKGL;
    setActiveProvider(MAP_PROVIDER_DECKGL);

    const initDeck = () => loadMapDeps().then((libs) => new Promise((resolve, reject) => {
      libsRef.current = libs;
      if (cancelled) {
        resolve();
        return;
      }
      const map = initDeckGlMap();
      if (!map) {
        reject(new Error("The MapLibre map could not be created."));
        return;
      }
      deckglMapRef.current = map;
      if (typeof ResizeObserver !== "undefined") {
        observer = new ResizeObserver(() => {
          if (mapProviderRef.current === MAP_PROVIDER_DECKGL && deckglMapRef.current) deckglMapRef.current.resize();
        });
        observer.observe(host);
      }
      const onReady = () => {
        if (cancelled) {
          resolve();
          return;
        }
        const overlay = new libs.deck.MapboxOverlay({ interleaved: true, layers: [] });
        map.addControl(overlay);
        overlayRef.current = overlay;
        iconAtlasRef.current = buildIconAtlas();
        updateViewFromDeck();
        setMapReady(true);
        resolve();
      };
      if (map.loaded()) onReady();
      else map.on("load", onReady);
    }));

    const initApple = () => loadMapKitJS().then((mapkit) => {
      if (cancelled) return undefined;
      return new Promise((resolve, reject) => {
        let settled = false;
        const map = initAppleMap(mapkit);
        if (!map) {
          reject(new Error("The Apple map could not be created."));
          return;
        }
        const onErr = () => {
          if (settled) return;
          settled = true;
          mapkit.removeEventListener("error", onErr);
          try {
            map.destroy();
          } catch (error) {
            appleMapRef.current = null;
          }
          reject(new Error("MapKit authorization failed."));
        };
        mapkit.addEventListener("error", onErr);
        setTimeout(() => {
          if (settled || cancelled) return;
          settled = true;
          mapkit.removeEventListener("error", onErr);
          appleMapRef.current = map;
          appleMapReadyRef.current = true;
          setAppleAvailable(true);
          resolve();
        }, SOURCES.map.appleSettleMs);
      });
    });

    initDeck().then(() => {
      if (!cancelled) return initApple().catch(() => {
        if (!cancelled) setMapProviderError("Apple Maps is unavailable for close zoom, so only Deck.gl is used.");
      });
      return undefined;
    }).catch((error) => {
      if (!cancelled) setMapError(`The map could not be started because of the error "${errorText(error)}".`);
    });

    return () => {
      cancelled = true;
      if (observer) observer.disconnect();
      if (overlayRef.current && deckglMapRef.current) {
        try {
          deckglMapRef.current.removeControl(overlayRef.current);
        } catch (error) {
          overlayRef.current = null;
        }
      }
      overlayRef.current = null;
      if (appleMapRef.current) {
        try {
          appleMapRef.current.destroy();
        } catch (error) {
          appleMapRef.current = null;
        }
      }
      appleMapRef.current = null;
      appleMapReadyRef.current = false;
      appleAircraftRef.current = new Map();
      appleAirportsRef.current = [];
      applePathsRef.current = [];
      if (deckglMapRef.current) {
        try {
          deckglMapRef.current.remove();
        } catch (error) {
          deckglMapRef.current = null;
        }
      }
      deckglMapRef.current = null;
      host.removeEventListener("wheel", claimWheel, { capture: true });
      host.innerHTML = "";
      appleMapContainerRef.current = null;
      deckglMapContainerRef.current = null;
      mapProviderRef.current = MAP_PROVIDER_DECKGL;
      setAppleAvailable(false);
      setMapReady(false);
    };
  }, [authLoading, token, initDeckGlMap, initAppleMap, updateViewFromDeck]);

  useEffect(() => {
    deckOnlyRef.current = layerVisibility.heatmap || globeMode;
    const deck = deckglMapRef.current;
    if (deck && appleAvailable && !deckOnlyRef.current && mapProviderRef.current === MAP_PROVIDER_DECKGL && deck.getZoom() >= SOURCES.map.appleZoomThreshold) {
      const c = deck.getCenter();
      switchToProvider(MAP_PROVIDER_APPLE, c.lat, c.lng, deck.getZoom(), deck.getPitch(), deck.getBearing());
    }
    if (deck) {
      try {
        deck.setMaxZoom(deckOnlyRef.current || !appleAvailable ? SOURCES.map.maxZoom : SOURCES.map.deckMaxZoomWithApple);
      } catch (error) {
        setMapError(`The map zoom limit could not be updated because of the error "${errorText(error)}".`);
      }
    }
    if (deckOnlyRef.current && mapProviderRef.current === MAP_PROVIDER_APPLE && appleMapRef.current) {
      const map = appleMapRef.current;
      switchToProvider(MAP_PROVIDER_DECKGL, map.center.latitude, map.center.longitude, spanToZoom(map.region.span.latitudeDelta), 0, map.rotation || 0);
    }
  }, [layerVisibility.heatmap, globeMode, appleAvailable, mapReady, switchToProvider]);

  useEffect(() => {
    if (activeTab !== "map" || !mapReady) return undefined;
    if (deckglMapRef.current && mapProviderRef.current === MAP_PROVIDER_DECKGL) deckglMapRef.current.resize();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") setAnimationTick((value) => value + 1);
    }, SOURCES.refresh.animationMs);
    return () => clearInterval(timer);
  }, [activeTab, mapReady]);

  const navigateTo = useCallback((lon, lat, zoom) => {
    if (mapProviderRef.current === MAP_PROVIDER_APPLE && appleMapRef.current && window.mapkit) {
      const span = zoomToSpan(zoom);
      appleMapRef.current.setRegionAnimated(new window.mapkit.CoordinateRegion(new window.mapkit.Coordinate(lat, lon), new window.mapkit.CoordinateSpan(span, span)), true);
      return;
    }
    if (deckglMapRef.current) deckglMapRef.current.flyTo({ center: [lon, lat], zoom, bearing: 0, pitch: 0, speed: 1.4 });
  }, []);

  const fitBox = useCallback((bbox) => {
    const [west, south, east, north] = bbox;
    const span = Math.max(north - south, (east - west) * Math.cos((((north + south) / 2) * Math.PI) / 180), 0.0005);
    const zoom = Math.max(1, Math.min(14, Math.log2(360 / (span * 1.6))));
    navigateTo((west + east) / 2, (south + north) / 2, zoom);
  }, [navigateTo]);

  const userArea = useMemo(() => areas.find((area) => area.area_id === selectedAreaId) || null, [areas, selectedAreaId]);
  const activeAreas = areaFilterActive && areas.length ? areas : null;
  const activeAreasLabel = activeAreas ? (activeAreas.length === 1 ? describeArea(activeAreas[0]) : `My ${activeAreas.length} Areas`) : null;
  const pointInActiveAreas = useCallback((lat, lon) => Boolean(activeAreas) && lat !== null && lat !== undefined && lon !== null && lon !== undefined && activeAreas.some((area) => isPointInArea(lat, lon, area)), [activeAreas]);
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

  const useMapCenterForArea = useCallback(() => {
    setAreaFormData((prev) => ({ ...prev, latitude: viewState.lat.toFixed(6), longitude: viewState.lon.toFixed(6) }));
  }, [viewState.lat, viewState.lon]);

  const useMapViewForArea = useCallback(() => {
    const bounds = viewState.bounds;
    if (!bounds) {
      showNotification("The map bounds are not available yet.", "error");
      return;
    }
    setAreaFormData((prev) => ({
      ...prev,
      min_lat: Math.max(-90, bounds.south).toFixed(6),
      max_lat: Math.min(90, bounds.north).toFixed(6),
      min_lng: Math.max(-180, bounds.west).toFixed(6),
      max_lng: Math.min(180, bounds.east).toFixed(6)
    }));
  }, [viewState.bounds, showNotification]);

  const flyToArea = useCallback((area) => {
    if (!area) return;
    if (area.mode === "point_radius") navigateTo(area.longitude, area.latitude, areaZoom(area));
    else fitBox([area.min_lng, area.min_lat, area.max_lng, area.max_lat]);
  }, [navigateTo, fitBox]);

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
    setTimeout(() => flyToArea(saved), 100);
  }, [areaFormData, editingAreaId, showNotification, saveAreaToBackend, flyToArea]);

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
    flyToArea(area);
  }, [flyToArea]);

  const toggleAreaFilter = useCallback(() => {
    if (!userArea) {
      showNotification("Add a monitored area first.", "error");
      openAreaModal(null);
      return;
    }
    const willActivate = !areaFilterActive;
    setAreaFilterActive(willActivate);
    if (!willActivate) return;
    if (areas.length === 1) {
      flyToArea(areas[0]);
      return;
    }
    const rings = areas.map((area) => areaShape(area).ring);
    const lons = rings.flat().map((point) => point[0]);
    const lats = rings.flat().map((point) => point[1]);
    fitBox([Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)]);
  }, [userArea, areas, areaFilterActive, openAreaModal, showNotification, flyToArea, fitBox]);

  useEffect(() => {
    const map = deckglMapRef.current;
    if (!mapReady || !map) return;
    try {
      if (typeof map.setProjection === "function") map.setProjection({ type: globeMode ? "globe" : "mercator" });
      map.setMinZoom(globeMode ? SOURCES.map.minZoomGlobe : SOURCES.map.minZoom);
    } catch (error) {
      setMapError(`The globe view could not be switched because of the error "${errorText(error)}".`);
    }
    if (!globeMode) return undefined;
    const timer = setTimeout(() => {
      if (deckglMapRef.current && deckglMapRef.current.getZoom() > SOURCES.map.globeZoom) deckglMapRef.current.easeTo({ zoom: SOURCES.map.globeZoom, duration: 800 });
    }, 100);
    return () => clearTimeout(timer);
  }, [mapReady, globeMode]);

  useEffect(() => {
    const map = deckglMapRef.current;
    if (mapReady && map) {
      try {
        for (const layer of ["satellite-layer", "labels-layer"]) {
          map.setPaintProperty(layer, "raster-saturation", monochrome ? -1 : 0);
          map.setPaintProperty(layer, "raster-contrast", monochrome ? 0.15 : 0);
          map.setPaintProperty(layer, "raster-brightness-max", monochrome ? 0.8 : 1);
        }
      } catch (error) {
        setMapError(`The monochrome view could not be switched because of the error "${errorText(error)}".`);
      }
    }
    if (appleMapRef.current && window.mapkit) appleMapRef.current.mapType = monochrome ? window.mapkit.Map.MapTypes.MutedStandard : window.mapkit.Map.MapTypes.Hybrid;
  }, [mapReady, monochrome, appleAvailable]);

  const searchTerm = searchQuery.trim().toUpperCase();

  const activeSearchCount = useMemo(() => Object.entries(searchSpec).filter(([key, value]) => value !== null && value !== "" && value !== EMPTY_SEARCH[key]).length, [searchSpec]);

  const searchMatches = useMemo(() => {
    const list = [];
    for (const entry of aircraftRef.current.values()) if (matchesSearch(entry, searchSpec)) list.push(entry);
    return list;
  }, [dataVersion, searchSpec]);

  const locationActive = selectedLocation !== WORLDWIDE_KEY;
  const locationName = customLocationLabel && customLocationLabel.key === selectedLocation ? customLocationLabel.label : CUSTOM_LOCATION_LABEL;
  const [selectedLat, selectedLon] = locationActive ? selectedLocation.split(",").map(Number) : [null, null];

  useEffect(() => {
    locationRef.current = locationActive ? { lat: selectedLat, lon: selectedLon, radius: airspaceRadius } : null;
  }, [locationActive, selectedLat, selectedLon, airspaceRadius]);

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
    const key = `${result.latitude},${result.longitude}`;
    setCustomLocationLabel({ key, label: result.label });
    setSelectedLocation(key);
    setLocationResults([]);
    setLocationQuery("");
    setLocationSearchStatus("");
  }, []);

  const filteredAircraft = useMemo(() => {
    const list = [];
    const applySpec = searchApplied && activeSearchCount > 0;
    for (const entry of aircraftRef.current.values()) {
      if (activeAreas && !pointInActiveAreas(entry.lat, entry.lon)) continue;
      if (entry.ground ? !showGround : !showAirborne) continue;
      if (emergencyOnly) {
        if (emergencyOf(entry)) list.push(entry);
        continue;
      }
      if (searchTerm.length >= 2 && ![entry.flight, entry.reg, entry.hex, entry.type].some((value) => value && String(value).toUpperCase().includes(searchTerm))) continue;
      if (applySpec && !matchesSearch(entry, searchSpec)) continue;
      if (locationActive) {
        if (distanceNm(selectedLat, selectedLon, entry.lat, entry.lon) > airspaceRadius) continue;
        if (airspaceCeiling && !entry.ground && (entry.alt === null || entry.alt === undefined || entry.alt > airspaceCeiling)) continue;
      }
      list.push(entry);
    }
    return list;
  }, [dataVersion, emergencyOnly, showAirborne, showGround, searchTerm, searchApplied, activeSearchCount, searchSpec, locationActive, selectedLat, selectedLon, airspaceRadius, airspaceCeiling, activeAreas, pointInActiveAreas]);

  const inViewAircraft = useMemo(() => filteredAircraft.filter((entry) => inBounds(viewState.bounds, entry.lon, entry.lat)), [filteredAircraft, viewState]);

  const airportIndex = useMemo(() => new Map(airports.map((airport) => [airport.icao, airport])), [airports]);

  const pathAircraft = useMemo(() => (locationActive ? filteredAircraft : inViewAircraft).slice(0, SOURCES.map.pathMax), [locationActive, filteredAircraft, inViewAircraft]);

  useEffect(() => {
    const map = deckglMapRef.current;
    const host = deckglMapContainerRef.current;
    if (!mapReady || !map || !host || !layerVisibility.heatmap) {
      if (heatCanvasRef.current) {
        heatCanvasRef.current.remove();
        heatCanvasRef.current = null;
      }
      return undefined;
    }
    if (!heatCanvasRef.current || heatCanvasRef.current.parentNode !== host) {
      const canvas = document.createElement("canvas");
      canvas.className = "satFlightHeatmapCanvas";
      host.appendChild(canvas);
      heatCanvasRef.current = canvas;
    }
    let frame = null;
    const draw = () => {
      frame = null;
      if (!heatCanvasRef.current) return;
      try {
        renderHeatmap(heatCanvasRef.current, map, filteredAircraft, globeMode);
      } catch (error) {
        setMapError(`The traffic heatmap could not be drawn because of the error "${errorText(error)}".`);
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    draw();
    map.on("move", schedule);
    map.on("resize", schedule);
    return () => {
      map.off("move", schedule);
      map.off("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [mapReady, layerVisibility.heatmap, filteredAircraft, globeMode]);

  useEffect(() => {
    const map = deckglMapRef.current;
    if (!mapReady || !map || !globeMode) {
      setGlobeCenter(null);
      return undefined;
    }
    let frame = null;
    const update = () => {
      frame = null;
      const center = map.getCenter();
      setGlobeCenter({ lat: center.lat, lon: center.lng });
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    map.on("move", schedule);
    return () => {
      map.off("move", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [mapReady, globeMode]);

  const searchResults = useMemo(() => (searchTerm.length >= 2 ? filteredAircraft.slice(0, 25) : []), [filteredAircraft, searchTerm]);

  useEffect(() => {
    if (!mapReady || !layerVisibility.trails || activeTab !== "map" || viewState.zoom < SOURCES.map.trailZoom) return undefined;
    let cancelled = false;
    const load = () => {
      const bounds = viewRef.current && viewRef.current.bounds;
      const params = new URLSearchParams();
      if (bounds) {
        params.set("west", bounds.west.toFixed(3));
        params.set("south", bounds.south.toFixed(3));
        params.set("east", bounds.east.toFixed(3));
        params.set("north", bounds.north.toFixed(3));
      }
      fetch(`${apiUrl("trails")}?${params.toString()}`)
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => {
          if (!cancelled && data && data.success) setServerTrails(data.trails || {});
        })
        .catch(() => undefined);
    };
    const first = setTimeout(load, 600);
    const timer = setInterval(load, SOURCES.refresh.trailsMs);
    return () => {
      cancelled = true;
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [mapReady, layerVisibility.trails, activeTab, viewState]);

  const allEmergencies = useMemo(() => {
    const list = [];
    for (const entry of aircraftRef.current.values()) if (emergencyOf(entry)) list.push(entry);
    return list;
  }, [dataVersion]);

  const emergencies = useMemo(() => allEmergencies.filter((entry) => {
    if (activeAreas) return pointInActiveAreas(entry.lat, entry.lon);
    if (locationActive) return distanceNm(selectedLat, selectedLon, entry.lat, entry.lon) <= airspaceRadius;
    return true;
  }), [allEmergencies, activeAreas, pointInActiveAreas, locationActive, selectedLat, selectedLon, airspaceRadius]);

  const areaCounts = useMemo(() => {
    const counts = {};
    for (const area of areas) counts[area.area_id] = { aircraft: 0, emergencies: 0 };
    if (!areas.length) return counts;
    for (const entry of aircraftRef.current.values()) {
      if (entry.lat === null || entry.lat === undefined || entry.lon === null || entry.lon === undefined) continue;
      for (const area of areas) {
        if (!isPointInArea(entry.lat, entry.lon, area)) continue;
        counts[area.area_id].aircraft += 1;
        if (emergencyOf(entry)) counts[area.area_id].emergencies += 1;
      }
    }
    return counts;
  }, [areas, dataVersion]);

  const emergencyHexes = useMemo(() => new Set(emergencies.map((entry) => entry.hex)), [emergencies]);
  const soundInScope = (entry) => emergencyHexes.has(entry.hex);
  const soundScopeKey = useMemo(() => emergencies.map((entry) => `${entry.hex}:${entry.sq}`).join("|"), [emergencies]);

  const sounds = useAlertSounds({
    defaults: SOURCES.sounds.defaults,
    ready: stateRestored && areasLoaded && Boolean(feedInfo),
    items: feedInfo ? allEmergencies : null,
    inScope: soundInScope,
    scopeKey: soundScopeKey,
    ignoreLevel: true,
    getKey: flightSoundKey,
    getLevel: flightSoundLevel,
    getId: flightAlertIdentity,
    describe: flightSoundMessage,
    repeatMs: SOURCES.sounds.repeatGapSeconds * 1000,
    aheadSeconds: SOURCES.sounds.scheduleAheadSeconds,
    topUpMs: SOURCES.sounds.topUpSeconds * 1000
  });

  const [ackOpen, setAckOpen] = useState(false);
  const [ackReview, setAckReview] = useState(false);
  const [ackIndex, setAckIndex] = useState(0);
  const [ackAnalyses, setAckAnalyses] = useState({});
  const [ackHistory, setAckHistory] = useState([]);
  const ackQueue = sounds.queue;
  const ackLengthRef = useRef(0);

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
    const source = activeAreas ? (allEmergencies || []).filter((item) => pointInActiveAreas(item.lat, item.lon)) : allEmergencies || [];
    const live = source.map((item) => ({ key: flightSoundKey(item), id: flightAlertIdentity(item), item, level: flightSoundLevel(item) || ALERT_SOUND_LEVELS[0], ended: false, updated: false, at: Date.now(), message: flightSoundMessage(item, false) }));
    const known = new Set(live.map((entry) => entry.key));
    return [...live, ...ackHistory.filter((entry) => !known.has(entry.key) && (!activeAreas || pointInActiveAreas(entry.item.lat, entry.item.lon)))];
  }, [allEmergencies, ackHistory, activeAreas, pointInActiveAreas]);
  const ackList = ackReview ? ackReviewList : ackQueue;

  useEffect(() => {
    if (ackQueue.length > ackLengthRef.current && !ackReview) {
      setAckOpen(true);
      setAckIndex(ackLengthRef.current);
    }
    if (!ackQueue.length && !ackReview) setAckOpen(false);
    ackLengthRef.current = ackQueue.length;
  }, [ackQueue, ackReview]);

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

  useEffect(() => {
    for (const entry of ackQueue) {
      if (entry.ended || ackRequestedRef.current.has(entry.key)) continue;
      ackRequestedRef.current.add(entry.key);
      setAckAnalyses((current) => ({ ...current, [entry.key]: { loading: true } }));
      fetch(`${apiUrl("alertAnalysis")}?hex=${encodeURIComponent(entry.item.hex)}`)
        .then((response) => response.json().catch(() => null).then((data) => {
          if (!response.ok || !data || !data.success) throw new Error((data && data.message) || `The analysis request returned status ${response.status}.`);
          return data;
        }))
        .then((data) => setAckAnalyses((current) => ({ ...current, [entry.key]: { data: data.analysis } })))
        .catch((error) => setAckAnalyses((current) => ({ ...current, [entry.key]: { error: errorText(error) } })));
    }
  }, [ackQueue]);

  useEffect(() => {
    if (!stateRestored || !areas.length) return;
    if (!selectedAreaId || !areas.some((area) => area.area_id === selectedAreaId)) setSelectedAreaId(areas[0].area_id);
  }, [stateRestored, areas, selectedAreaId]);

  const saveStateDebounceRef = useRef(null);
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
        const inOptions = (options) => (value) => options.some(([option]) => option === value);
        pick("activeTab", setActiveTab, (value) => typeof value === "string");
        pick("autoRefresh", setAutoRefresh, (value) => typeof value === "boolean");
        pick("refreshInterval", setRefreshInterval, inOptions(REFRESH_INTERVAL_OPTIONS));
        pick("layerVisibility", (value) => setLayerVisibility({ ...DEFAULT_LAYERS, ...value }), (value) => typeof value === "object");
        pick("globeMode", setGlobeMode, (value) => typeof value === "boolean");
        pick("emergencyOnly", setEmergencyOnly, (value) => typeof value === "boolean");
        pick("showAirborne", setShowAirborne, (value) => typeof value === "boolean");
        pick("showGround", setShowGround, (value) => typeof value === "boolean");
        pick("monochrome", setMonochrome, (value) => typeof value === "boolean");
        pick("customLocationLabel", setCustomLocationLabel, (value) => typeof value === "object");
        pick("selectedLocation", setSelectedLocation, (value) => typeof value === "string");
        pick("airspaceRadius", setAirspaceRadius, inOptions(AIRSPACE_RADIUS_OPTIONS));
        pick("airspaceCeiling", setAirspaceCeiling, inOptions(AIRSPACE_CEILING_OPTIONS));
        pick("listScope", setListScope, inOptions(LIST_SCOPE_OPTIONS));
        pick("listSort", setListSort, inOptions(LIST_SORT_OPTIONS));
        pick("layoutVisibility", (value) => setLayoutVisibility((current) => ({ ...current, ...value })), (value) => typeof value === "object");
        pick("expandedWarnings", setExpandedWarnings, (value) => typeof value === "object");
        pick("selectedAreaId", setSelectedAreaId, (value) => typeof value === "string");
        pick("areaFilterActive", setAreaFilterActive, (value) => typeof value === "boolean");
        pick("sounds", replaceSoundSettings, (value) => typeof value === "object");
        if (saved.camera && Number.isFinite(saved.camera.lat) && Number.isFinite(saved.camera.lon) && Number.isFinite(saved.camera.zoom)) pendingCameraRef.current = saved.camera;
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
    if (!stateRestored) return undefined;
    if (saveStateDebounceRef.current) clearTimeout(saveStateDebounceRef.current);
    saveStateDebounceRef.current = setTimeout(() => {
      saveStateToDB({
        activeTab,
        autoRefresh,
        refreshInterval,
        layerVisibility,
        globeMode,
        emergencyOnly,
        showAirborne,
        showGround,
        monochrome,
        selectedLocation,
        customLocationLabel,
        airspaceRadius,
        airspaceCeiling,
        listScope,
        listSort,
        layoutVisibility,
        expandedWarnings,
        selectedAreaId,
        areaFilterActive,
        sounds: sounds.settings,
        camera: { lat: viewState.lat, lon: viewState.lon, zoom: viewState.zoom }
      });
    }, SOURCES.persistence.saveDebounceMs);
    return () => clearTimeout(saveStateDebounceRef.current);
  }, [stateRestored, activeTab, autoRefresh, refreshInterval, layerVisibility, globeMode, emergencyOnly, showAirborne, showGround, monochrome, selectedLocation, customLocationLabel, airspaceRadius, airspaceCeiling, listScope, listSort, layoutVisibility, expandedWarnings, selectedAreaId, areaFilterActive, sounds.settings, viewState]);

  useEffect(() => {
    if (!mapReady || !stateRestored || !pendingCameraRef.current) return;
    const camera = pendingCameraRef.current;
    pendingCameraRef.current = null;
    if (!locationRef.current) navigateTo(camera.lon, camera.lat, camera.zoom);
  }, [mapReady, stateRestored, navigateTo]);

  const emergencyLog = useMemo(() => {
    const outcomes = new Map();
    for (const frame of emergencyOutcomes) {
      const m = frame.metadata || {};
      const startedAtMs = Date.parse(m.startedAt);
      const endedAtMs = Date.parse(m.endedAt);
      if (!Number.isFinite(startedAtMs) || !Number.isFinite(endedAtMs)) continue;
      outcomes.set(`${m.hex}:${m.squawk}:${Math.round(startedAtMs / 1000)}`, { hex: m.hex, flight: m.flight, registration: m.registration, squawk: m.squawk, reason: m.reason, outcome: m.outcome, nextSquawk: m.nextSquawk, endedOnGround: m.endedOnGround, durationSeconds: m.durationSeconds, startedAtMs, endedAtMs, lat: m.startLatitude, lon: m.startLongitude, alt: m.startAltitudeFt });
    }
    for (const item of squawkFeed.ended) {
      outcomes.set(`${item.hex}:${item.squawk}:${item.startedAt}`, { hex: item.hex, flight: item.flight, registration: item.reg, squawk: item.squawk, reason: item.reason, outcome: item.outcome, nextSquawk: item.nextSquawk, endedOnGround: item.lastGround, durationSeconds: item.durationSeconds, startedAtMs: item.startedAt * 1000, endedAtMs: item.endedAt * 1000, lat: item.startLat, lon: item.startLon, alt: item.startAlt });
    }
    const active = squawkFeed.active.map((item) => ({ hex: item.hex, flight: item.flight, registration: item.reg, squawk: item.squawk, reason: item.reason, outcome: "active", durationSeconds: item.durationSeconds, startedAtMs: item.startedAt * 1000, endedAtMs: Date.now(), lat: item.startLat, lon: item.startLon, alt: item.startAlt }));
    const slack = 600000;
    const used = new Set();
    const rows = [];
    for (const frame of emergencyHistory) {
      const m = frame.metadata || {};
      const at = Date.parse(frame.observedAt);
      let match = null;
      for (const [key, item] of outcomes.entries()) {
        if (item.hex === m.hex && item.squawk === m.squawk && at >= item.startedAtMs - slack && at <= item.endedAtMs + slack) {
          match = item;
          used.add(key);
          break;
        }
      }
      if (!match) match = active.find((item) => item.hex === m.hex && item.squawk === m.squawk && at >= item.startedAtMs - slack) || null;
      rows.push({ at, hex: m.hex, callsign: m.flight || m.registration || String(m.hex || "").toUpperCase(), squawk: m.squawk, reason: m.reason, alt: m.altitudeFt, lat: m.latitude, lon: m.longitude, result: match });
    }
    for (const [key, item] of outcomes.entries()) {
      if (used.has(key)) continue;
      rows.push({ at: item.startedAtMs, hex: item.hex, callsign: item.flight || item.registration || String(item.hex || "").toUpperCase(), squawk: item.squawk, reason: item.reason, alt: item.alt, lat: item.lat, lon: item.lon, result: item });
    }
    for (const item of active) {
      if (rows.some((row) => row.result === item)) continue;
      rows.push({ at: item.startedAtMs, hex: item.hex, callsign: item.flight || item.registration || String(item.hex || "").toUpperCase(), squawk: item.squawk, reason: item.reason, alt: item.alt, lat: item.lat, lon: item.lon, result: item });
    }
    return rows.sort((a, b) => b.at - a.at);
  }, [emergencyHistory, emergencyOutcomes, squawkFeed]);

  const atcLink = (lat, lon) => {
    const airport = nearestAirport(airports, lat, lon);
    return airport ? { value: `${SOURCES.atc.name} ${airport.icao}`, href: SOURCES.atc.search.replace("{icao}", encodeURIComponent(airport.icao)) } : null;
  };

  const selectedAircraft = selectedHex ? (aircraftRef.current.get(selectedHex) || (selectedDetail && selectedDetail.aircraft) || null) : null;

  const selectAircraft = useCallback((hex, fly = false) => {
    setSelectedHex(hex);
    setSelectedDetail(null);
    setSelectedError(null);
    if (!fly) return;
    setActiveTab("map");
    const entry = aircraftRef.current.get(hex);
    if (entry) navigateTo(entry.lon, entry.lat, Math.max(viewRef.current ? viewRef.current.zoom : 0, SOURCES.map.followZoom));
  }, [navigateTo]);

  const clearSelection = useCallback(() => {
    setSelectedHex(null);
    setSelectedDetail(null);
    setSelectedError(null);
    setFollowSelected(false);
  }, []);

  useEffect(() => {
    if (!selectedHex) return undefined;
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(`${apiUrl("aircraft")}/${selectedHex}`);
        const data = await response.json().catch(() => null);
        if (cancelled) return;
        if (!response.ok || !data || !data.success) throw new Error((data && data.message) || `The aircraft request returned status ${response.status}.`);
        setSelectedDetail(data);
        setSelectedError(null);
      } catch (error) {
        if (!cancelled) setSelectedError(errorText(error));
      }
    };
    load();
    const timer = setInterval(load, SOURCES.refresh.detailMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [selectedHex]);

  useEffect(() => {
    if (!followSelected || !selectedAircraft || activeTab !== "map" || switchingProviderRef.current) return;
    const [lon, lat] = projectPosition(selectedAircraft, Date.now() / 1000);
    if (activeProvider === MAP_PROVIDER_APPLE && appleMapRef.current && window.mapkit) {
      appleMapRef.current.setCenterAnimated(new window.mapkit.Coordinate(lat, lon), true);
      return;
    }
    const map = deckglMapRef.current;
    if (map) map.easeTo({ center: [lon, lat], duration: SOURCES.refresh.animationMs * 0.9, easing: (t) => t });
  }, [followSelected, selectedAircraft, animationTick, activeTab, activeProvider]);

  useEffect(() => {
    const overlay = overlayRef.current;
    const dk = libsRef.current && libsRef.current.deck;
    if (!mapReady || !overlay || !dk) return;
    if (activeProvider === MAP_PROVIDER_APPLE) {
      overlay.setProps({ layers: [] });
      return;
    }
    const nowSeconds = Date.now() / 1000;
    const zoom = viewState.zoom;
    const atlas = iconAtlasRef.current;
    const layers = [];
    const globe = globeMode;
    const faceCenter = globeCenter || viewState;
    const onFace = (list) => (globe ? list.filter((item) => facingViewer(faceCenter, item.lat, item.lon)) : list);
    const shared = globe ? { parameters: { depthCompare: "always", cullMode: "none" } } : {};
    const shownAircraft = onFace(filteredAircraft);
    const shownInView = onFace(inViewAircraft);

    if (activeAreas) {
      const holes = activeAreas.map((area) => areaShape(area).ring.slice().reverse());
      layers.push(new dk.SolidPolygonLayer({
        id: "flight-area-mask",
        data: [{ polygon: [[[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]], ...holes] }],
        getPolygon: (d) => d.polygon,
        filled: true,
        getFillColor: [8, 9, 12, 225],
        parameters: globe ? { depthCompare: "always", cullMode: "none" } : undefined
      }));
    }

    if (areaFilterActive && areas.length) {
      const shapes = areas.map((area) => ({ ...areaShape(area), selected: area.area_id === selectedAreaId }));
      layers.push(new dk.SolidPolygonLayer({
        ...shared,
        id: "flight-user-areas",
        data: shapes,
        getPolygon: (d) => d.ring,
        filled: true,
        getFillColor: (d) => (d.selected ? [78, 205, 196, 34] : [78, 205, 196, 14]),
        updateTriggers: { getFillColor: [selectedAreaId] }
      }));
      layers.push(new dk.TextLayer({
        ...shared,
        id: "flight-user-area-labels",
        data: shapes,
        getPosition: (d) => [d.centerLng, d.centerLat],
        getText: (d) => d.name,
        getSize: 11,
        getColor: (d) => (d.selected ? [78, 205, 196, 255] : [170, 180, 200, 220]),
        getTextAnchor: "middle",
        getAlignmentBaseline: "center",
        fontFamily: CHART_FONT,
        fontWeight: 800,
        background: true,
        getBackgroundColor: [8, 9, 12, 200],
        backgroundPadding: [4, 2],
        updateTriggers: { getColor: [selectedAreaId] }
      }));
    }

    if (locationActive) {
      layers.push(new dk.ScatterplotLayer({
        ...shared,
        id: "flight-airspace",
        data: [{ lon: selectedLon, lat: selectedLat }],
        getPosition: (d) => [d.lon, d.lat],
        getRadius: airspaceRadius * 1852,
        radiusUnits: "meters",
        stroked: false,
        filled: true,
        getFillColor: [78, 205, 196, 26],
        updateTriggers: { getRadius: airspaceRadius }
      }));
      layers.push(new dk.ScatterplotLayer({
        ...shared,
        id: "flight-airspace-center",
        data: [{ lon: selectedLon, lat: selectedLat }],
        getPosition: (d) => [d.lon, d.lat],
        getRadius: 5,
        radiusUnits: "pixels",
        stroked: true,
        filled: true,
        getFillColor: [78, 205, 196, 255],
        getLineColor: [8, 9, 12, 255],
        lineWidthUnits: "pixels",
        getLineWidth: 2
      }));
    }


    if (layerVisibility.paths && !layerVisibility.heatmap) {
      const [flownAlpha, remainingAlpha] = SOURCES.map.pathAlpha;
      layers.push(new dk.PathLayer({
        ...shared,
        id: "flight-paths",
        data: flightPaths(pathAircraft, reference, airportIndex, nowSeconds),
        getPath: (d) => d.path,
        getColor: (d) => [...SOURCES.map.pathColor, d.flown ? flownAlpha : remainingAlpha],
        getWidth: (d) => (d.flown ? 2 : 1.5),
        widthUnits: "pixels",
        capRounded: true,
        jointRounded: true
      }));
    }

    if (layerVisibility.trails && !layerVisibility.heatmap && zoom >= SOURCES.map.trailZoom) {
      const segments = [];
      const since = nowSeconds - SOURCES.map.trailSeconds;
      const [alphaMin, alphaMax] = SOURCES.map.trailAlpha;
      const fade = (time) => Math.round(alphaMin + (alphaMax - alphaMin) * Math.max(0, Math.min(1, (time - since) / SOURCES.map.trailSeconds)));
      for (const entry of shownInView) {
        const runs = trailRuns(mergeTrail(serverTrails[entry.hex], trailBufferRef.current.get(entry.hex)), since);
        if (!runs.length) continue;
        const color = altitudeColor(entry.alt, entry.ground);
        runs.forEach((run) => {
          for (let i = 1; i < run.length; i += 1) segments.push({ from: [run[i - 1][0], run[i - 1][1]], to: [run[i][0], run[i][1]], color, alpha: fade(run[i][3]) });
        });
        const last = runs[runs.length - 1][runs[runs.length - 1].length - 1];
        if (nowSeconds - last[3] <= SOURCES.map.trailGapSeconds + SOURCES.map.deadReckonSeconds) segments.push({ from: [last[0], last[1]], to: projectPosition(entry, nowSeconds), color, alpha: alphaMax });
        if (segments.length >= SOURCES.map.maxTrails * 20) break;
      }
      layers.push(new dk.LineLayer({
        ...shared,
        id: "flight-trails",
        data: segments,
        getSourcePosition: (d) => d.from,
        getTargetPosition: (d) => d.to,
        getColor: (d) => [...d.color, d.alpha],
        getWidth: 2,
        widthUnits: "pixels",
        updateTriggers: { getTargetPosition: animationTick }
      }));
    }

    if (layerVisibility.aircraft && !layerVisibility.heatmap && atlas) {
      layers.push(new dk.IconLayer({
        ...shared,
        id: "flight-aircraft-halo",
        data: shownAircraft,
        iconAtlas: atlas.atlas,
        iconMapping: atlas.mapping,
        getIcon: iconFor,
        getPosition: (d) => projectPosition(d, nowSeconds),
        getAngle: (d) => -(d.trk || 0),
        getSize: (d) => (d.hex === selectedHex ? 32 : 24),
        sizeUnits: "pixels",
        getColor: [8, 9, 12, 190],
        updateTriggers: { getPosition: [animationTick, dataVersion], getSize: selectedHex, getAngle: [dataVersion, globe] }
      }));
      layers.push(new dk.IconLayer({
        ...shared,
        id: "flight-aircraft",
        data: shownAircraft,
        iconAtlas: atlas.atlas,
        iconMapping: atlas.mapping,
        getIcon: iconFor,
        getPosition: (d) => projectPosition(d, nowSeconds),
        getAngle: (d) => -(d.trk || 0),
        getSize: (d) => (d.hex === selectedHex ? 26 : 19),
        sizeUnits: "pixels",
        getColor: (d) => [...aircraftColor(d, selectedHex), 255],
        pickable: true,
        autoHighlight: true,
        highlightColor: [235, 240, 248, 120],
        onClick: (info) => {
          if (info.object) selectAircraft(info.object.hex);
          return true;
        },
        onHover: (info) => setHoverInfo(info.object ? { x: info.x, y: info.y, kind: "aircraft", object: info.object } : null),
        updateTriggers: { getPosition: [animationTick, dataVersion], getSize: selectedHex, getColor: [selectedHex, dataVersion], getAngle: [dataVersion, globe] }
      }));
    }

    if (layerVisibility.labels && layerVisibility.aircraft && !layerVisibility.heatmap && zoom >= SOURCES.map.labelZoom) {
      const labeled = shownInView.slice(0, SOURCES.map.maxLabels);
      layers.push(new dk.TextLayer({
        ...shared,
        id: "flight-labels",
        data: labeled,
        getPosition: (d) => projectPosition(d, nowSeconds),
        getText: (d) => displayName(d),
        getSize: 11,
        getColor: (d) => [...aircraftColor(d, selectedHex), 255],
        getPixelOffset: [0, 18],
        fontFamily: CHART_FONT,
        fontWeight: 800,
        background: true,
        getBackgroundColor: [8, 9, 12, 200],
        backgroundPadding: [3, 1],
        updateTriggers: { getPosition: [animationTick, dataVersion], getColor: [selectedHex, dataVersion] }
      }));
    }
    if (layerVisibility.airports && airports.length && zoom >= SOURCES.map.airportZoom) {
      const visibleAirports = onFace(airports.filter((airport) => (airport.size === "large" || zoom >= SOURCES.map.airportMediumZoom) && inBounds(viewState.bounds, airport.lon, airport.lat)));
      layers.push(new dk.ScatterplotLayer({
        ...shared,
        id: "flight-airports",
        data: visibleAirports,
        getPosition: (d) => [d.lon, d.lat],
        getRadius: (d) => (d.size === "large" ? (zoom >= SOURCES.map.airportMediumZoom ? 7 : 5) : 5),
        radiusUnits: "pixels",
        stroked: true,
        filled: true,
        getFillColor: [8, 9, 12, 235],
        getLineColor: [...AIRPORT_COLOR, 255],
        lineWidthUnits: "pixels",
        getLineWidth: 2,
        pickable: true,
        onHover: (info) => setHoverInfo(info.object ? { x: info.x, y: info.y, kind: "airport", object: info.object } : null),
        updateTriggers: { getRadius: zoom >= SOURCES.map.airportMediumZoom }
      }));
      if (zoom >= SOURCES.map.airportLabelZoom) {
        layers.push(new dk.TextLayer({
          ...shared,
          id: "flight-airport-labels",
          data: zoom >= SOURCES.map.airportLabelZoom + 2 ? visibleAirports : visibleAirports.filter((airport) => airport.size === "large"),
          getPosition: (d) => [d.lon, d.lat],
          getText: (d) => d.iata || d.icao || "",
          getSize: 11,
          getColor: [...AIRPORT_COLOR, 255],
          getTextAnchor: "start",
          getAlignmentBaseline: "center",
          getPixelOffset: [11, 0],
          fontFamily: CHART_FONT,
          fontWeight: 800,
          background: true,
          getBackgroundColor: [8, 9, 12, 200],
          backgroundPadding: [3, 1]
        }));
      }
    }

    try {
      overlay.setProps({ layers });
    } catch (error) {
      setMapError(`The map layers could not be drawn because of the error "${errorText(error)}".`);
    }
  }, [mapReady, activeProvider, filteredAircraft, inViewAircraft, animationTick, dataVersion, layerVisibility, selectedHex, selectedDetail, selectedAircraft, airports, viewState, selectAircraft, serverTrails, globeMode, globeCenter, locationActive, selectedLat, selectedLon, airspaceRadius, pathAircraft, reference, airportIndex, activeAreas, areaFilterActive, areas, selectedAreaId]);

  const showAppleHover = useCallback((event, kind, object) => {
    const host = mapContainerRef.current;
    if (!host || !object) return;
    const rect = host.getBoundingClientRect();
    setHoverInfo({ x: event.clientX - rect.left, y: event.clientY - rect.top, kind, object });
  }, []);

  useEffect(() => {
    const map = appleMapRef.current;
    const mk = window.mapkit;
    const store = appleAircraftRef.current;
    const removeAll = () => {
      if (map && store.size) {
        try {
          map.removeAnnotations(Array.from(store.values()).map((item) => item.ann));
        } catch (error) {
          store.clear();
        }
      }
      store.clear();
    };
    if (activeProvider !== MAP_PROVIDER_APPLE || !map || !mk || !layerVisibility.aircraft) {
      removeAll();
      return;
    }
    const nowSeconds = Date.now() / 1000;
    const showLabels = layerVisibility.labels && viewState.zoom >= SOURCES.map.labelZoom;
    const collisionNone = (mk.Annotation.CollisionMode && mk.Annotation.CollisionMode.None) || "none";
    const keep = new Set();
    const added = [];
    for (const entry of inViewAircraft.slice(0, SOURCES.map.maxAppleAircraft)) {
      keep.add(entry.hex);
      const [lon, lat] = projectPosition(entry, nowSeconds);
      const coordinate = new mk.Coordinate(lat, lon);
      let item = store.get(entry.hex);
      if (!item) {
        const el = document.createElement("div");
        el.className = "satFlightAppleAircraft";
        el.innerHTML = "<svg class=\"satFlightAppleAircraftIcon\" viewBox=\"0 0 64 64\" fill=\"currentColor\"></svg><span class=\"satFlightAppleAircraftLabel\"></span>";
        const hex = entry.hex;
        el.addEventListener("click", (event) => {
          event.stopPropagation();
          selectAircraft(hex);
        });
        el.addEventListener("mouseenter", (event) => showAppleHover(event, "aircraft", aircraftRef.current.get(hex)));
        el.addEventListener("mouseleave", () => setHoverInfo(null));
        const ann = new mk.Annotation(coordinate, () => el, { anchorOffset: new DOMPoint(0, -SOURCES.map.appleSelectedIconSize / 2), calloutEnabled: false, animates: false, displayPriority: 1000, collisionMode: collisionNone });
        item = { ann, el, signature: "" };
        store.set(entry.hex, item);
        added.push(ann);
      } else {
        item.ann.coordinate = coordinate;
      }
      const icon = iconFor(entry);
      const color = rgb(aircraftColor(entry, selectedHex));
      const selected = entry.hex === selectedHex;
      const label = showLabels || selected ? displayName(entry) : "";
      const signature = `${icon}|${color}|${Math.round(entry.trk || 0)}|${selected}|${label}`;
      if (signature !== item.signature) {
        item.signature = signature;
        const size = selected ? SOURCES.map.appleSelectedIconSize : SOURCES.map.appleIconSize;
        const svg = item.el.firstChild;
        svg.innerHTML = APPLE_ICON_SVG[icon];
        svg.style.width = `${size}px`;
        svg.style.height = `${size}px`;
        svg.style.color = color;
        svg.style.transform = `rotate(${icon === "ground" ? 0 : Math.round(entry.trk || 0)}deg)`;
        item.el.lastChild.textContent = label;
        item.el.lastChild.style.display = label ? "block" : "none";
        item.el.lastChild.style.color = color;
        item.el.classList.toggle("satFlightAppleAircraftSelected", selected);
      }
    }
    if (added.length) map.addAnnotations(added);
    const stale = [];
    for (const [hex, item] of store.entries()) {
      if (!keep.has(hex)) {
        stale.push(item.ann);
        store.delete(hex);
      }
    }
    if (stale.length) map.removeAnnotations(stale);
  }, [activeProvider, inViewAircraft, animationTick, dataVersion, selectedHex, layerVisibility.aircraft, layerVisibility.labels, viewState, selectAircraft, showAppleHover]);

  useEffect(() => {
    const map = appleMapRef.current;
    const mk = window.mapkit;
    if (map && appleAirportsRef.current.length) {
      try {
        map.removeAnnotations(appleAirportsRef.current);
      } catch (error) {
        appleAirportsRef.current = [];
      }
    }
    appleAirportsRef.current = [];
    if (activeProvider !== MAP_PROVIDER_APPLE || !map || !mk || !layerVisibility.airports || !airports.length) return;
    const visible = airports.filter((airport) => inBounds(viewState.bounds, airport.lon, airport.lat)).sort((a, b) => (a.size === b.size ? 0 : a.size === "large" ? -1 : 1)).slice(0, SOURCES.map.maxAppleAirports);
    const annotations = visible.map((airport) => {
      const el = document.createElement("div");
      el.className = `satFlightAppleAirport ${airport.size === "large" ? "satFlightAppleAirportLarge" : ""}`;
      el.innerHTML = "<span class=\"satFlightAppleAirportDot\"></span><span class=\"satFlightAppleAirportLabel\"></span>";
      el.lastChild.textContent = airport.iata || airport.icao || "";
      el.addEventListener("mouseenter", (event) => showAppleHover(event, "airport", airport));
      el.addEventListener("mouseleave", () => setHoverInfo(null));
      return new mk.Annotation(new mk.Coordinate(airport.lat, airport.lon), () => el, { anchorOffset: new DOMPoint(0, -8), calloutEnabled: false, animates: false, displayPriority: 250 });
    });
    if (annotations.length) map.addAnnotations(annotations);
    appleAirportsRef.current = annotations;
  }, [activeProvider, airports, layerVisibility.airports, viewState, showAppleHover]);

  useEffect(() => {
    const map = appleMapRef.current;
    const mk = window.mapkit;
    if (map && appleTrailsRef.current.length) {
      try {
        map.removeOverlays(appleTrailsRef.current);
      } catch (error) {
        appleTrailsRef.current = [];
      }
    }
    appleTrailsRef.current = [];
    if (activeProvider !== MAP_PROVIDER_APPLE || !map || !mk || !layerVisibility.trails) return;
    const overlays = [];
    const since = Date.now() / 1000 - SOURCES.map.trailSeconds;
    for (const entry of inViewAircraft) {
      const runs = trailRuns(mergeTrail(serverTrails[entry.hex], trailBufferRef.current.get(entry.hex)), since);
      runs.forEach((run, index) => {
        const points = run.map((point) => new mk.Coordinate(point[1], point[0]));
        if (index === runs.length - 1) points.push(new mk.Coordinate(entry.lat, entry.lon));
        overlays.push(new mk.PolylineOverlay(points, { style: new mk.Style({ strokeColor: rgb(altitudeColor(entry.alt, entry.ground)), strokeOpacity: 0.6, lineWidth: 2, lineCap: "round", lineJoin: "round" }) }));
      });
      if (overlays.length >= SOURCES.map.trailAppleMax) break;
    }
    if (overlays.length) map.addOverlays(overlays);
    appleTrailsRef.current = overlays;
  }, [activeProvider, serverTrails, layerVisibility.trails, inViewAircraft, dataVersion]);

  useEffect(() => {
    const map = appleMapRef.current;
    const mk = window.mapkit;
    if (map && applePathsRef.current.length) {
      try {
        map.removeOverlays(applePathsRef.current);
      } catch (error) {
        applePathsRef.current = [];
      }
    }
    applePathsRef.current = [];
    if (activeProvider !== MAP_PROVIDER_APPLE || !map || !mk || !layerVisibility.paths) return;
    const [flownAlpha, remainingAlpha] = SOURCES.map.pathAlpha;
    const overlays = flightPaths(pathAircraft, reference, airportIndex, Date.now() / 1000).map((item) => new mk.PolylineOverlay(item.path.map((point) => new mk.Coordinate(point[1], point[0])), { style: new mk.Style({ strokeColor: rgb(SOURCES.map.pathColor), strokeOpacity: (item.flown ? flownAlpha : remainingAlpha) / 255, lineWidth: item.flown ? 2 : 1.5, lineDash: item.flown ? [] : [6, 6], lineCap: "round", lineJoin: "round" }) }));
    if (overlays.length) map.addOverlays(overlays);
    applePathsRef.current = overlays;
  }, [activeProvider, layerVisibility.paths, pathAircraft, reference, airportIndex, dataVersion]);

  const resetView = useCallback(() => {
    setFollowSelected(false);
    const location = locationRef.current;
    if (location) navigateTo(location.lon, location.lat, radiusZoom(location.radius, location.lat));
    else navigateTo(SOURCES.map.center[0], SOURCES.map.center[1], SOURCES.map.zoom);
  }, [navigateTo]);

  const toggleLayer = (id) => setLayerVisibility((prev) => ({ ...prev, [id]: !prev[id] }));

  const locationFocusRef = useRef(null);

  useEffect(() => {
    if (!mapReady) return;
    const signature = locationActive ? `${selectedLocation}|${airspaceRadius}` : WORLDWIDE_KEY;
    if (locationFocusRef.current === signature) return;
    const previous = locationFocusRef.current;
    locationFocusRef.current = signature;
    if (locationActive) {
      setFollowSelected(false);
      navigateTo(selectedLon, selectedLat, radiusZoom(airspaceRadius, selectedLat));
    } else if (previous && previous !== WORLDWIDE_KEY) {
      resetView();
    }
  }, [mapReady, locationActive, selectedLocation, selectedLat, selectedLon, airspaceRadius, navigateTo, resetView]);

  const appleAirspaceRef = useRef(null);

  useEffect(() => {
    const map = appleMapRef.current;
    const mk = window.mapkit;
    if (map && appleAirspaceRef.current) {
      try {
        map.removeOverlay(appleAirspaceRef.current);
      } catch (error) {
        appleAirspaceRef.current = null;
      }
    }
    appleAirspaceRef.current = null;
    if (activeProvider !== MAP_PROVIDER_APPLE || !map || !mk || !locationActive) return;
    const overlay = new mk.CircleOverlay(new mk.Coordinate(selectedLat, selectedLon), airspaceRadius * 1852, { style: new mk.Style({ strokeOpacity: 0, lineWidth: 0, fillColor: "#4ecdc4", fillOpacity: 0.1 }) });
    map.addOverlay(overlay);
    appleAirspaceRef.current = overlay;
  }, [activeProvider, locationActive, selectedLat, selectedLon, airspaceRadius]);

  useEffect(() => {
    const map = appleMapRef.current;
    const mk = window.mapkit;
    if (!map || !mk || activeProvider !== MAP_PROVIDER_APPLE || !areaFilterActive || !areas.length) return undefined;
    const fillStyle = (color, opacity) => new mk.Style({ fillColor: color, fillOpacity: opacity, strokeOpacity: 0, lineWidth: 0 });
    const overlays = [];
    const annotations = [];
    try {
      const world = [[-85, -180], [-85, 180], [85, 180], [85, -180]].map(([lat, lng]) => new mk.Coordinate(lat, lng));
      const holes = areas.map((area) => areaShape(area).ring.map(([lng, lat]) => new mk.Coordinate(lat, lng)));
      overlays.push(new mk.PolygonOverlay([world, ...holes], { style: fillStyle("#08090c", 0.88) }));
      for (const area of areas) {
        const shape = areaShape(area);
        const isSelected = area.area_id === selectedAreaId;
        overlays.push(new mk.PolygonOverlay([shape.ring.map(([lng, lat]) => new mk.Coordinate(lat, lng))], { style: fillStyle("#4ecdc4", isSelected ? 0.13 : 0.06) }));
        annotations.push(new mk.Annotation(new mk.Coordinate(shape.centerLat, shape.centerLng), () => {
          const element = document.createElement("div");
          element.className = `satFlightAppleAreaLabel${isSelected ? " satFlightAppleAreaLabelSelected" : ""}`;
          element.textContent = shape.name;
          return element;
        }, { calloutEnabled: false, animates: false, displayPriority: 1000 }));
      }
      map.addOverlays(overlays);
      map.addAnnotations(annotations);
    } catch (error) {
      setMapError(`The Apple map areas could not be drawn because of the error "${errorText(error)}".`);
    }
    return () => {
      try {
        map.removeOverlays(overlays);
        map.removeAnnotations(annotations);
      } catch (error) {
        return;
      }
    };
  }, [activeProvider, areaFilterActive, areas, selectedAreaId]);


  const sources = feedInfo?.sources || null;
  const sourceList = sources ? SOURCE_KEYS.map(([key]) => ({ key, ...sources[key] })) : [];
  const trackedTotal = feedInfo ? feedInfo.total : 0;

  const refreshAll = useCallback(() => {
    pollSnapshot();
    loadStats();
    loadHarvestHealth();
    if (activeTab === "overview") loadHistory();
  }, [pollSnapshot, loadStats, loadHarvestHealth, loadHistory, activeTab]);

  const exportData = useCallback(() => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const header = "Hex,Callsign,Registration,Type,Category,Latitude,Longitude,AltitudeFt,GroundSpeedKt,TrackDeg,VerticalRateFpm,Squawk,OnGround,Military,PositionTime,Sources";
    const rows = filteredAircraft.map((entry) => [
      csvQuote(entry.hex), csvQuote(entry.flight || ""), csvQuote(entry.reg || ""), csvQuote(entry.type || ""), csvQuote(entry.cat || ""),
      entry.lat, entry.lon, entry.alt === null ? "" : entry.alt, entry.gs === null ? "" : entry.gs, entry.trk === null ? "" : entry.trk, entry.vr === null ? "" : entry.vr,
      csvQuote(entry.sq || ""), entry.ground ? "true" : "false", entry.mil ? "true" : "false", entry.posAt ? new Date(entry.posAt * 1000).toISOString() : "", csvQuote(sourceNames(entry.src, sources))
    ].join(","));
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `flight-tracker-${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [filteredAircraft, sources]);

  const handleExpandClick = (event) => {
    if (event.target.closest("button, a, input, select, textarea, label, .satWeatherRowSelectable")) return;
    const target = event.target.closest(EXPANDABLE_SELECTOR);
    if (!target) return;
    const panel = target.closest("[class*='satEarthCondPanel']");
    const heading = panel?.querySelector("h4")?.textContent || target.querySelector("h3")?.textContent || "Details";
    setExpandedView({ title: heading, html: target.outerHTML });
  };

  const renderDataTypeBadge = (dataType, size = "normal") => {
    const config = DATA_TYPE[dataType] || DATA_TYPE.LIVE;
    const sizeClass = size === "small" ? "satEarthCondDataTypeBadgeSmall" : "";
    return (
      <span
        className={`satEarthCondDataTypeBadge ${sizeClass}`}
        style={{ backgroundColor: config.color + "20", color: config.color, borderColor: config.color }}
        title={config.description}
      >
        <FontAwesomeIcon icon={config.icon} />
        <span>{config.label}</span>
      </span>
    );
  };

  const getResponsiveOptions = (screenSize) => {
    if (screenSize < 499) return { fontSize: 0, grid: { left: 0, right: 0, bottom: 0, top: 0 } };
    if (screenSize <= 699) return { fontSize: 9, grid: { left: 40, right: 40, bottom: 8, top: 12 } };
    if (screenSize <= 1299) return { fontSize: 10, grid: { left: 40, right: 40, bottom: 35, top: 30 } };
    return { fontSize: 11, grid: { left: 60, right: 60, bottom: 40, top: 40 } };
  };

  const tooltipStyle = { backgroundColor: "#0b0c0f", borderColor: "#3d4354", borderWidth: 2, padding: 10, extraCssText: "border-radius: 4px;", textStyle: { color: "#ebf0f8", fontSize: 11, fontWeight: 700, fontFamily: CHART_FONT } };

  const axisLabel = (fontSize, width) => ({ color: "#919baf", fontSize, fontWeight: 700, fontFamily: CHART_FONT, width, overflow: "truncate", ellipsis: "…", hideOverlap: true });

  const createBarChart = (title, labels, values, unit = "", color = "#4ecdc4", horizontal = false) => {
    if (!values.length) return null;
    const { fontSize, grid } = getResponsiveOptions(window.innerWidth);
    const category = { type: "category", data: labels, axisLabel: axisLabel(fontSize, horizontal ? 80 : 90), axisLine: { lineStyle: { color: "#3d4354", width: 2 } }, axisTick: { lineStyle: { color: "#3d4354" } }, splitLine: { show: false } };
    const value = { type: "value", axisLabel: axisLabel(fontSize, 60), axisLine: { show: false }, splitLine: { lineStyle: { color: "#323746", type: "dashed" } } };
    const option = {
      textStyle: { fontFamily: CHART_FONT },
      tooltip: {
        trigger: "axis",
        ...tooltipStyle,
        formatter: (params) => `<div><div style="font-size:10px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;color:#919baf;margin-bottom:6px">${title}</div>${params.map(p => `<div style="font-weight:700;color:#cdd4e4">${p.name}: <span style="font-weight:800;color:${color}">${Number(p.data).toLocaleString()}${unit}</span></div>`).join("")}</div>`
      },
      xAxis: horizontal ? value : category,
      yAxis: horizontal ? { ...category, inverse: true } : value,
      series: [{ name: title, type: "bar", data: values, itemStyle: { color, borderRadius: 0 }, barMaxWidth: 28 }],
      grid: { ...grid, containLabel: true }
    };
    Object.defineProperty(option, "statsMeta", { value: { values, unit }, enumerable: false });
    return option;
  };

  const createLineChart = (title, labels, seriesList, unit = "") => {
    if (!labels.length) return null;
    const { fontSize, grid } = getResponsiveOptions(window.innerWidth);
    const option = {
      textStyle: { fontFamily: CHART_FONT },
      tooltip: {
        trigger: "axis",
        ...tooltipStyle,
        formatter: (params) => `<div><div style="font-size:10px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;color:#919baf;margin-bottom:6px">${params[0] ? params[0].axisValue : title}</div>${params.map(p => `<div style="font-weight:700;color:#cdd4e4">${p.seriesName}: <span style="font-weight:800;color:${p.color}">${Number(p.data).toLocaleString()}${unit}</span></div>`).join("")}</div>`
      },
      legend: { top: 0, textStyle: { color: "#919baf", fontSize, fontWeight: 700, fontFamily: CHART_FONT } },
      xAxis: { type: "category", data: labels, axisLabel: axisLabel(fontSize, 90), axisLine: { lineStyle: { color: "#3d4354", width: 2 } }, axisTick: { lineStyle: { color: "#3d4354" } }, splitLine: { show: false } },
      yAxis: { type: "value", axisLabel: axisLabel(fontSize, 60), axisLine: { show: false }, splitLine: { lineStyle: { color: "#323746", type: "dashed" } } },
      series: seriesList.map(({ name, data, color }) => ({ name, data, type: "line", smooth: true, showSymbol: false, itemStyle: { color }, lineStyle: { color, width: 2 }, areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: color + "40" }, { offset: 1, color: color + "00" }] } } })),
      grid: { ...grid, containLabel: true }
    };
    Object.defineProperty(option, "statsMeta", { value: { values: seriesList[0] ? seriesList[0].data : [], unit }, enumerable: false });
    return option;
  };

  const renderChartStats = (chartConfig) => {
    const values = chartConfig?.statsMeta?.values || [];
    const unit = chartConfig?.statsMeta?.unit || "";
    const format = (v) => (v === null || v === undefined || isNaN(v) ? "—" : `${Math.round(v).toLocaleString()}${unit}`);
    const has = values.length > 0;
    const stats = [
      ["Points", has ? values.length : "—"],
      ["Min", has ? format(Math.min(...values)) : "—"],
      ["Max", has ? format(Math.max(...values)) : "—"],
      ["Mean", has ? format(values.reduce((a, b) => a + b, 0) / values.length) : "—"],
      ["Total", has ? format(values.reduce((a, b) => a + b, 0)) : "—"]
    ];
    return (
      <div className="satEarthCondStatsSummary">
        {stats.map(([label, value]) => <span key={label}>{label}: {value}</span>)}
      </div>
    );
  };

  const renderChart = (chartConfig) => {
    if (!chartConfig) return <div className="satEarthCondNoChartData">No Data Available</div>;
    return <ResponsiveChart option={chartConfig} className="satEarthCondChart" onExpand={() => setExpandedView({ title: chartConfig.series?.[0]?.name || "Chart", chart: chartConfig })} />;
  };

  const renderTiles = (tiles) => (
    <div className="satEarthCondStatusTileGrid">
      {tiles.map(({ label, value, detail, color, icon }) => (
        <div key={label} className="satEarthCondStatusTile">
          <div className="satEarthCondStatusTileHeader">
            {icon && <FontAwesomeIcon icon={icon} />}
            <span>{label}</span>
          </div>
          <div className="satEarthCondStatusTileValue" style={color ? { color } : undefined}>
            {color && <span className="satEarthCondStatusTileDot" style={{ backgroundColor: color }} />}
            <span>{value}</span>
          </div>
          {detail && <div className="satEarthCondStatusTileDetail" title={detail}>{detail}</div>}
        </div>
      ))}
    </div>
  );

  const renderTable = (title, headers, rows, options = {}) => {
    const cellText = (cell) => {
      const isObject = cell !== null && typeof cell === "object" && !Array.isArray(cell);
      const value = isObject ? cell.value : cell;
      return value === null || value === undefined || value === "" ? "—" : String(value);
    };
    const widths = headers.map((header, column) => rows.reduce((longest, row) => Math.max(longest, cellText(row[column]).length), String(header).length));
    const kindOf = (column) => (widths[column] > SOURCES.tables.wrapAt ? "satWeatherCellWrap" : widths[column] > SOURCES.tables.tightAt ? "satWeatherCellMedium" : "satWeatherCellTight");
    return (
      <div className="satEarthCondTableCard">
        <div className="satEarthCondTableHeader">
          <h3>{title}</h3>
        </div>
        <div className="satEarthCondTableWrapper satWeatherTableWrapper">
          <table className="satEarthCondDataTable satWeatherDataTable">
            <thead><tr>{headers.map((header, column) => <th key={column} className={kindOf(column)}>{header}</th>)}</tr></thead>
            <tbody>
              {rows.length > 0 ? rows.map((row, i) => (
                <tr key={i} className={options.onRowClick ? "satWeatherRowSelectable" : undefined} onClick={options.onRowClick ? () => options.onRowClick(i) : undefined}>
                  {row.map((cell, column) => {
                    const isObject = cell !== null && typeof cell === "object" && !Array.isArray(cell);
                    const text = cellText(cell);
                    if (isObject && cell.href) return <td key={column} className={kindOf(column)}><a className="satWeatherTableLink" href={cell.href} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()}>{text}</a></td>;
                    return <td key={column} className={kindOf(column)} style={isObject && cell.color ? { color: cell.color } : undefined}>{text}</td>;
                  })}
                </tr>
              )) : <tr><td colSpan={headers.length} className="satEarthCondTableNoData">{options.emptyText || "No Data"}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderSection = (label, icon, rows) => (
    <>
      <div className="satEarthCondSectionDivider">
        <div className="satEarthCondSectionDividerLine" />
        <span className="satEarthCondSectionDividerLabel">
          <FontAwesomeIcon icon={icon} />
          {label}
        </span>
        <div className="satEarthCondSectionDividerLine" />
      </div>
      {rows.map((row, rowIndex) => {
        const panels = row.filter(Boolean);
        if (!panels.length) return null;
        const width = panels.length === 1 ? "Single" : panels.length === 2 ? "Double" : "Triple";
        return (
          <div key={`${label}_${rowIndex}`} className="satEarthCondOverviewGrid">
            {panels.map(panel => (
              <div key={panel.title} className={`satEarthCondPanel${width} satEarthCondChartContainer${PANEL_CONTAINER_CLASS[panel.badge] || "Live"}`}>
                <div className="satEarthCondChartHeaderWithBadge">
                  <h4>{panel.title}</h4>
                  {renderDataTypeBadge(panel.badge || "LIVE", "small")}
                </div>
                {panel.content}
                <div className="satEarthCondChartDescription">
                  {panel.axes && (
                    <div className="satEarthCondChartAxesInfo">
                      <span><strong>X-Axis:</strong> {panel.axes[0]}</span>
                      <span><strong>Y-Axis:</strong> {panel.axes[1]}</span>
                    </div>
                  )}
                  <p className="satEarthCondChartDescriptionText">{panel.description}</p>
                </div>
                {panel.axes && renderChartStats(panel.chart)}
              </div>
            ))}
          </div>
        );
      })}
    </>
  );

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

  const flightFields = (entry, detail, route) => {
    const routeAirports = route && route.airports ? route.airports : [];
    const airportName = (airport) => (airport ? `${airport.iata || airport.icao} | ${airport.name || airport.icao}${airport.location && !(airport.name || "").includes(airport.location) ? `, ${airport.location}` : ""}` : null);
    const airline = selectedDetail && selectedDetail.airline && detail ? (selectedDetail.airline.name ? `${selectedDetail.airline.name} (${selectedDetail.airline.icao})` : selectedDetail.airline.icao) : airlineLabel(entry?.al, reference);
    return [
      ["Airline", airline],
      ["From", routeAirports.length ? airportName(routeAirports[0]) : airportLabel(entry?.orig, reference, airportIndex) || null],
      ["To", routeAirports.length > 1 ? airportName(routeAirports[routeAirports.length - 1]) : airportLabel(entry?.dest, reference, airportIndex) || null],
      ["Via", routeAirports.length > 2 ? routeAirports.slice(1, -1).map((airport) => airport.iata || airport.icao).join(", ") : null],
      ["Registration", entry?.reg || detail?.reg],
      ["Type", detail?.desc ? `${titleCaseName(detail.desc)} (${entry?.type || detail?.type})` : typeLabel(entry?.type || detail?.type, reference)],
      ["Operator", detail?.operator ? titleCaseName(detail.operator) : null],
      ["Category", detail ? labelFor(CATEGORY_OPTIONS, detail.category) : entry ? labelFor(CATEGORY_OPTIONS, categoryGroup(entry)) : null],
      ["Altitude", formatAltitude(entry || detail)],
      ["Ground Speed", formatNumber(entry?.gs ?? detail?.gs, " kt")],
      ["Track", formatNumber(entry?.trk ?? detail?.trk, "°")],
      ["Vertical Rate", formatVertical(entry?.vr ?? detail?.vr)],
      ["Squawk", entry?.sq || detail?.sq],
      ["Position", formatCoords(entry?.lat ?? detail?.lat, entry?.lon ?? detail?.lon)],
      ["Region", detail?.region],
      ["Last Position", formatSeconds(entry?.posAt ?? detail?.posAt)],
      ["Sources", detail?.sources ? detail.sources.join(", ") : entry ? sourceNames(entry.src, sources) : null],
      ["ICAO Hex", (entry?.hex || detail?.hex || "").toUpperCase()]
    ];
  };

  const renderDetailCard = () => {
    if (!selectedHex) return null;
    const entry = selectedAircraft;
    const detail = selectedDetail && selectedDetail.aircraft ? selectedDetail.aircraft : null;
    const emergency = emergencyOf(entry || detail);
    const route = selectedDetail && selectedDetail.route ? selectedDetail.route : null;
    const title = displayName(entry || detail || { hex: selectedHex });
    return (
      <div className="satWeatherDetailCard">
        <div className="satWeatherDetailHeader">
          <span className="satWeatherDetailIcon" style={{ color: emergency ? "#ff6b6b" : "#4ecdc4" }}><FontAwesomeIcon icon={entry && entry.cat === "A7" ? faHelicopter : faPlane} /></span>
          <span className="satWeatherDetailTitle" title={title}>{title}</span>
          <button type="button" className={`satWeatherDetailButton ${followSelected ? "satWeatherDetailButtonActive" : ""}`} onClick={() => setFollowSelected((value) => !value)} title={followSelected ? "Stop Following" : "Follow Aircraft"}>
            <FontAwesomeIcon icon={faLocationCrosshairs} />
          </button>
          <button type="button" className="satWeatherDetailButton" onClick={clearSelection} title="Close">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
        {emergency && <div className="satWeatherDetailEmergency">{`Squawk ${entry?.sq || detail?.sq}: ${emergency}`}</div>}
        <div className="satWeatherDetailScroll">
          {selectedError && !entry && <div className="satWeatherDetailError">{`The aircraft details could not be loaded because of the error "${selectedError}".`}</div>}
          {renderDetailFields(flightFields(entry, detail, route))}
        </div>
      </div>
    );
  };

  const renderAckModal = () => {
    if (!ackEntry) return null;
    const position = Math.min(ackIndex, ackList.length - 1);
    const pending = ackPendingKeys.has(ackEntry.key);
    const pendingCount = ackList.filter((item) => ackPendingKeys.has(item.key)).length;
    const analysisState = ackAnalyses[ackEntry.key] || {};
    const analysis = analysisState.data;
    const live = aircraftRef.current.get(ackEntry.item.hex) || null;
    const entry = { ...ackEntry.item, ...(live || {}) };
    const event = squawkFeed.active.find((item) => item.hex === entry.hex) || null;
    const squawk = ackEntry.item.sq;
    const status = ackEntry.ended ? "Ended" : ackEntry.updated ? "Updated" : "New";
    const color = ackEntry.ended ? "#919baf" : "#ff6b6b";
    const atc = atcLink(entry.lat, entry.lon);
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
                <span className="satWeatherAckEvent" style={{ color }}>{`${displayName(entry)} Squawking ${squawk}`}</span>
                <span className={`satWeatherAckStatus satWeatherAckStatus${status}`}>{status}</span>
              </div>
              <div className="satWeatherAckHeadline">{ackEntry.ended ? `The aircraft is no longer squawking ${squawk}.` : `${EMERGENCY_SQUAWKS[squawk] || "Emergency"} | ${[airlineLabel(entry.al, reference), routeText(entry, reference)].filter(Boolean).join(" | ") || "Route Unknown"}`}</div>
            </div>
            <div className="satWeatherAckSectionTitle">Emergency Details</div>
            {renderDetailFields([
              ["Meaning", EMERGENCY_SQUAWKS[squawk] || null],
              ["Squawking Since", event ? formatAbsoluteTime(new Date(event.startedAt * 1000).toISOString()) : null],
              ["Squawking For", event ? formatDuration(event.durationSeconds) : null],
              ["Started At", event ? `${formatCoords(event.startLat, event.startLon)}${event.startAlt !== null && event.startAlt !== undefined ? ` | ${Number(event.startAlt).toLocaleString()} ft` : ""}` : null],
              ["Nearest ATC Audio", atc ? atc.value : null],
              ...flightFields(entry, null, null).map(([label, value]) => (label === "Squawk" ? [label, squawk] : [label, value]))
            ], { columns: 3, skipEmpty: true, wideAt: 26, fullAt: 40 })}
            <div className="satWeatherAckSectionTitle">AI Analysis</div>
            <div className="satWeatherAckAnalysis">
              {ackEntry.ended && <div className="satWeatherAckNote">This emergency has ended, so no analysis is generated for it.</div>}
              {!ackEntry.ended && analysisState.loading && <div className="satWeatherAckNote"><FontAwesomeIcon icon={faSpinner} spin /> Generating Analysis</div>}
              {!ackEntry.ended && analysisState.error && <div className="satWeatherDetailError">{`The AI analysis is unavailable because of the error "${String(analysisState.error).replace(/\.$/, "")}".`}</div>}
              {analysis && (
                <>
                  <p className="satWeatherAckSummary">{analysis.summary}</p>
                  <div className="satWeatherAckColumns">
                    <div className="satWeatherAckBlock">
                      <div className="satWeatherAckBlockTitle">Risks</div>
                      {analysis.threats.map((item, index) => <p key={index}>{item}</p>)}
                    </div>
                    <div className="satWeatherAckBlock">
                      <div className="satWeatherAckBlockTitle">Recommended Actions</div>
                      {analysis.actions.map((item, index) => <p key={index}>{item}</p>)}
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
                  <div className="satWeatherAckFootnote">{`Generated By ${analysis.model} At ${new Date(analysis.generatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} From The Live Flight Data`}</div>
                </>
              )}
            </div>
          </div>
          <div className="satWeatherAckActions">
            <span className="satWeatherAckRemaining">{!pending ? "Already Acknowledged" : pendingCount === 1 ? "Last Alert To Acknowledge" : `${pendingCount - 1} More To Acknowledge`}</span>
            {atc && (
              <a className="satWeatherModalBtnSecondary satFlightAckLinkButton" href={atc.href} target="_blank" rel="noopener noreferrer"><FontAwesomeIcon icon={faHeadphones} /> ATC Audio</a>
            )}
            <button type="button" className="satWeatherModalBtnSecondary" disabled={!live} onClick={() => {
              closeAckModal();
              if (live) selectAircraft(live.hex, true);
            }}><FontAwesomeIcon icon={faLocationCrosshairs} /> View On Map</button>
            <button type="button" className="satWeatherModalBtnPrimary" disabled={!pending} onClick={() => sounds.acknowledge(ackEntry.key)}><FontAwesomeIcon icon={faCheck} /> {pending ? "Acknowledge" : "Acknowledged"}</button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  const renderHoverTooltip = () => {
    if (!hoverInfo || !hoverInfo.object) return null;
    const item = hoverInfo.object;
    const lines = hoverInfo.kind === "airport"
      ? [item.name, [item.icao, item.iata].filter(Boolean).join(" | "), [item.city, item.country].filter(Boolean).join(", ")]
      : [displayName(item), airlineLabel(item.al, reference), routeText(item, reference), [item.type, item.reg].filter(Boolean).join(" | "), `${formatAltitude(item)} | ${formatNumber(item.gs, " kt")}`];
    return (
      <div className="satWeatherTooltip" style={{ left: hoverInfo.x + 14, top: hoverInfo.y + 14 }}>
        {lines.filter(Boolean).map((line, index) => <div key={index} className={index === 0 ? "satWeatherTooltipTitle" : "satWeatherTooltipLine"}>{line}</div>)}
      </div>
    );
  };

  const renderMapView = () => (
    <div className="satWeatherMapView" style={{ display: activeTab === "map" ? "flex" : "none" }}>
      <div className="satWeatherViewHeader">
        <div className="satWeatherHeaderControls">
          {loading && (
            <div className="satWeatherLocationDisplay">
              <FontAwesomeIcon icon={faSpinner} spin className="satWeatherLocationIcon" />
            </div>
          )}
          <div className="satWeatherLocationDisplay">
            <FontAwesomeIcon icon={faLocationCrosshairs} className="satWeatherLocationIcon" />
            <span>{`${viewState.lat.toFixed(2)}°, ${viewState.lon.toFixed(2)}° | Zoom ${viewState.zoom.toFixed(1)}`}</span>
          </div>
          <div className="satWeatherCameraInfo"><span>{`In View: ${inViewAircraft.length.toLocaleString()}`}</span></div>
          <div className="satWeatherCameraInfo"><span>{`Shown: ${filteredAircraft.length.toLocaleString()}`}</span></div>
          <button className={`satWeatherHeaderButton ${showAirborne ? "satWeatherButtonActive" : ""}`} onClick={() => setShowAirborne((value) => !value)} title={showAirborne ? "Hide Aircraft In The Air" : "Show Aircraft In The Air"}>
            <FontAwesomeIcon icon={faPlaneDeparture} /> In Air
          </button>
          <button className={`satWeatherHeaderButton ${showGround ? "satWeatherButtonActive" : ""}`} onClick={() => setShowGround((value) => !value)} title={showGround ? "Hide Aircraft On The Ground" : "Show Aircraft On The Ground"}>
            <FontAwesomeIcon icon={faPlaneArrival} /> On Ground
          </button>
          <button className={`satWeatherHeaderButton ${emergencyOnly ? "satWeatherButtonActive" : ""}`} onClick={() => setEmergencyOnly((value) => !value)} title={emergencyOnly ? "Show All Aircraft" : "Show Only Aircraft Squawking Emergency Codes"}>
            <FontAwesomeIcon icon={faExclamationTriangle} /> {`Emergencies (${emergencies.length})`}
          </button>
          <button className={`satWeatherHeaderButton ${globeMode ? "satWeatherButtonActive" : ""}`} onClick={() => setGlobeMode((value) => !value)} title={globeMode ? "Switch To Flat Map" : "Switch To Globe"}>
            <FontAwesomeIcon icon={faGlobe} /> Globe
          </button>
          <button className={`satWeatherHeaderButton ${monochrome ? "satWeatherButtonActive" : ""}`} onClick={() => setMonochrome((value) => !value)} title={monochrome ? "Switch To Color Map" : "Switch To Monochrome Map"}>
            <FontAwesomeIcon icon={faCircleHalfStroke} /> Monochrome
          </button>
          <button
            className={`satWeatherHeaderButton ${areaFilterActive ? "satWeatherButtonActive" : ""}`}
            onClick={toggleAreaFilter}
            title={userArea ? `${areaFilterActive ? "Disable" : "Enable"} Area Filter` : "Add A Monitored Area"}
          >
            <FontAwesomeIcon icon={faMapPin} />
            {userArea ? `Area Filter: ${areaFilterActive ? "On" : "Off"}` : "Add Area"}
          </button>
          <button className="satWeatherHeaderButton" onClick={resetView} title={locationActive ? "Return To Selected Airspace" : "Reset To Global View"}>
            <FontAwesomeIcon icon={faGlobeAmericas} /> Reset View
          </button>
        </div>
      </div>
      <div className={`satWeatherMapWrapper ${selectedHex ? "satWeatherMapWrapperDetail" : ""}`}>
        <div ref={mapContainerRef} className="satWeatherMapContainer" onMouseLeave={() => setHoverInfo(null)} />
        {emergencies.length > 0 && (
          <button type="button" className="satWeatherModeIndicator satWeatherModeIndicatorAlert" style={{ zIndex: 2000 }} onClick={() => {
            setEmergencyOnly(true);
            selectAircraft(emergencies[0].hex, true);
          }}>
            <span className="satWeatherModePulse" />
            <span>{emergencies.length === 1 ? `${displayName(emergencies[0])} Is Squawking ${emergencies[0].sq}` : `${emergencies.length} Aircraft Are Squawking Emergency Codes`}</span>
          </button>
        )}
        {followSelected && selectedAircraft && emergencies.length === 0 && (
          <div className="satWeatherModeIndicator" style={{ zIndex: 1999 }}>
            <span className="satWeatherModePulse" />
            <span>{`Following ${displayName(selectedAircraft)}`}</span>
          </div>
        )}
        {renderDetailCard()}
        {renderHoverTooltip()}
        <div className="satWeatherLegend">
          <div className="satWeatherLegendTitle">Altitude</div>
          <div className="satWeatherLegendBar" />
          <div className="satWeatherLegendTicks">
            <span>0</span>
            <span>10k</span>
            <span>20k</span>
            <span>30k</span>
            <span>40k+</span>
          </div>
          <div className="satWeatherLegendKeys">
            <span><span className="satWeatherLegendSwatch" style={{ backgroundColor: "#919baf" }} />Ground</span>
            <span><span className="satWeatherLegendSwatch" style={{ backgroundColor: "#ff6b6b" }} />Emergency</span>
          </div>
        </div>
        {activeProvider === MAP_PROVIDER_APPLE && (
          <div className="satFlightAppleAttribution" dangerouslySetInnerHTML={{ __html: SOURCES.attributions.slice(0, 4).join(" | ") }} />
        )}
        {(feedError || mapError) && (
          <div className="satWeatherMapError" style={{ zIndex: 2000 }}>{mapError || feedError}</div>
        )}
        {!mapReady && (
          <div className="satWeatherMapLoadingOverlay" style={{ zIndex: 2001 }}>
            <div className="satWeatherMapLoadingContent">
              <div className="loading-circle" />
              {(mapError || mapProviderError) && <small className="satWeatherMapProviderError">{mapError || mapProviderError}</small>}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderOverviewTab = () => {
    const stats = fullStats;
    const summary = feedInfo?.stats;
    const altitude = stats?.byAltitude || {};
    const categories = CATEGORY_OPTIONS.filter(([key]) => key !== "all" && stats?.byCategory?.[key]);
    const regions = Object.entries(stats?.byRegion || {}).sort((a, b) => b[1] - a[1]);
    const speedLabels = ["0-99", "100-199", "200-299", "300-399", "400-499", "500+"];
    const altitudeChart = createBarChart("Altitude Distribution", ["Ground", "Below 10k", "10k-30k", "Above 30k", "Unknown"], [altitude.ground || 0, altitude.low || 0, altitude.mid || 0, altitude.high || 0, altitude.unknown || 0], "", "#42a5f5");
    const categoryChart = createBarChart("Aircraft Categories", categories.map(([, label]) => label), categories.map(([key]) => stats.byCategory[key]), "", "#4ecdc4");
    const regionChart = createBarChart("Traffic By Region", regions.map(([name]) => name), regions.map(([, count]) => count), "", "#7fe9e1", true);
    const speedChart = createBarChart("Ground Speed Distribution", speedLabels.map((label) => `${label} kt`), stats?.speeds || [], "", "#FF9500");
    const operatorChart = createBarChart("Top Operators", (stats?.topOperators || []).map((item) => item.key), (stats?.topOperators || []).map((item) => item.count), "", "#B388FF", true);
    const typeChart = createBarChart("Top Aircraft Types", (stats?.topTypes || []).map((item) => item.key), (stats?.topTypes || []).map((item) => item.count), "", "#ffd93d", true);
    const historyLabels = trafficHistory.map((frame) => new Date(frame.observedAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric" }));
    const historyChart = createLineChart("Tracked Aircraft", historyLabels, [
      { name: "Tracked", data: trafficHistory.map((frame) => Number(frame.metadata.total) || 0), color: "#4ecdc4" },
      { name: "Airborne", data: trafficHistory.map((frame) => Number(frame.metadata.airborne) || 0), color: "#42a5f5" }
    ]);
    const sourceHistoryChart = createLineChart("Aircraft By Source", historyLabels, [
      { name: "OpenSky", data: trafficHistory.map((frame) => Number(frame.metadata.opensky) || 0), color: "#4ecdc4" },
      { name: "adsb.fi", data: trafficHistory.map((frame) => Number(frame.metadata.adsbfi) || 0), color: "#FF9500" },
      { name: "adsb.lol", data: trafficHistory.map((frame) => Number(frame.metadata.adsblol) || 0), color: "#B388FF" },
      { name: "airplanes.live", data: trafficHistory.map((frame) => Number(frame.metadata.airplaneslive) || 0), color: "#ffd93d" }
    ]);
    const tiles = [
      { label: "Tracked", value: formatNumber(summary?.total ?? stats?.total), detail: "Aircraft With A Recent Position", icon: faPlane },
      { label: "Airborne", value: formatNumber(summary?.airborne ?? stats?.airborne), detail: "Reporting An Altitude In Flight", icon: faGaugeHigh },
      { label: "On Ground", value: formatNumber(summary?.ground ?? stats?.ground), detail: "Taxiing Or Parked With Transponder On", icon: faPlaneArrival },
      { label: "Military", value: formatNumber(summary?.military ?? stats?.military), detail: "Flagged By Receiver Database", icon: faShieldHalved },
      { label: "Emergencies", value: formatNumber(emergencies.length), detail: "Squawking 7500, 7600, Or 7700", icon: faExclamationTriangle, color: emergencies.length ? "#ff6b6b" : "#4ecdc4" },
      { label: "Airlines Flying", value: formatNumber(new Set(Array.from(aircraftRef.current.values()).map((entry) => entry.al).filter(Boolean)).size), detail: "Distinct Airline Codes In Traffic", icon: faBuilding }
    ];
    return (
      <div className="satEarthCondOverviewTab">
        {renderSection("Live Traffic", faBroadcastTower, [
          [{ title: "Traffic Summary", badge: "LIVE", content: renderTiles(tiles), description: "These counts come from the merged live picture across every source. An aircraft is counted once even when several networks report it, and it drops out after ten minutes without a new position." }],
          [
            { title: "Altitude Distribution", badge: "LIVE", chart: altitudeChart, content: renderChart(altitudeChart), axes: ["Altitude Band", "Aircraft"], description: "This chart splits tracked aircraft by barometric altitude. Most airliners cruise above 30,000 feet, so a large high band means long-haul and domestic jet traffic dominates the current picture." },
            { title: "Aircraft Categories", badge: "LIVE", chart: categoryChart, content: renderChart(categoryChart), axes: ["Category", "Aircraft"], description: "Categories come from the ADS-B emitter category each transponder broadcasts. Aircraft that do not broadcast a category are counted as unknown, which is common for older transponders and MLAT positions." }
          ],
          [
            { title: "Traffic By Region", badge: "COMPUTED", chart: regionChart, content: renderChart(regionChart), axes: ["Aircraft", "Region"], description: "Regions are the same boxes the server uses to plan its receiver sweep. Aircraft outside every box are counted as oceanic and remote, and those positions usually come from the OpenSky global pull." },
            { title: "Ground Speed Distribution", badge: "LIVE", chart: speedChart, content: renderChart(speedChart), axes: ["Ground Speed", "Aircraft"], description: "This chart groups airborne aircraft by ground speed in knots. Jet traffic clusters between 400 and 500 knots at cruise, while general aviation and helicopters fill the lower bands." }
          ],
          [
            { title: "Top Operators", badge: "COMPUTED", chart: operatorChart, content: renderChart(operatorChart), axes: ["Aircraft", "ICAO Operator Code"], description: "Operators are read from the three letter ICAO prefix of airline callsigns. Private and military flights that do not use an airline prefix are not included here." },
            { title: "Top Aircraft Types", badge: "COMPUTED", chart: typeChart, content: renderChart(typeChart), axes: ["Aircraft", "ICAO Type Designator"], description: "Type designators come from the receiver networks' aircraft databases. Aircraft that only appear in the OpenSky feed have no type until a regional sweep or a detail lookup fills it in." }
          ]
        ])}
        {renderSection("Recorded History", faHistory, [
          [
            { title: "Tracked Aircraft", badge: "HISTORICAL", chart: historyChart, content: renderChart(historyChart), axes: ["Time", "Aircraft"], description: `The harvester records a traffic census every ten minutes, and this chart shows one point per hour for the last ${SOURCES.harvest.historyDays} days. Gaps mean the server was asleep or no source answered at that time.` },
            { title: "Aircraft By Source", badge: "HISTORICAL", chart: sourceHistoryChart, content: renderChart(sourceHistoryChart), axes: ["Time", "Aircraft"], description: "Each line counts the aircraft a source reported at census time. The lines overlap because the same aircraft is often seen by more than one network." }
          ],
          [
            { title: "Active Emergencies", badge: "LIVE", content: renderTable("Active Emergencies", ["Callsign", "Squawk", "Reason", "Squawking For", "Altitude", "Position", "Last Position", "ATC Audio"], emergencies.map((entry) => {
              const event = squawkFeed.active.find((item) => item.hex === entry.hex);
              return [displayName(entry), { value: entry.sq, color: "#ff6b6b" }, emergencyOf(entry), event ? formatDuration(event.durationSeconds) : null, formatAltitude(entry), formatCoords(entry.lat, entry.lon), formatSeconds(entry.posAt), atcLink(entry.lat, entry.lon)];
            }), { emptyText: "No aircraft are squawking an emergency code right now.", onRowClick: (index) => selectAircraft(emergencies[index].hex, true) }), description: "Squawk 7500 signals unlawful interference, 7600 signals radio failure, and 7700 signals a general emergency. Squawking For counts from the first report the tracker saw with that code. The ATC Audio link opens the LiveATC feeds for the nearest airport, where recent archives can be played. Select a row to open the aircraft on the map." }
          ],
          [
            { title: "Emergency Log", badge: "HISTORICAL", content: renderTable("Emergency Log", ["Started", "Callsign", "Squawk", "Reason", "Duration", "Outcome", "Altitude", "Position", "ATC Audio"], emergencyLog.map((row) => [formatAbsoluteTime(new Date(row.at).toISOString()), row.callsign, { value: row.squawk, color: "#ff6b6b" }, row.reason, row.result ? formatDuration(row.result.durationSeconds) : null, { value: outcomeText(row.result), color: row.result && row.result.outcome === "active" ? "#ff6b6b" : row.result && row.result.outcome === "cleared" ? "#4ecdc4" : undefined }, row.alt === null || row.alt === undefined ? null : `${Number(row.alt).toLocaleString()} ft`, formatCoords(row.lat, row.lon), atcLink(row.lat, row.lon)]), { emptyText: "The harvester has not logged an emergency squawk in this window." }), description: `The harvester logs each emergency squawk once per aircraft and code within six hours, and records how long the code was held and what happened next. Returned To means the transponder went back to a normal code, Changed To means it switched to another emergency code, and Contact Lost means the aircraft dropped out of coverage while still squawking. Durations only cover time the tracker was running. This table covers the last ${SOURCES.harvest.historyDays} days.` }
          ]
        ])}
      </div>
    );
  };

  const renderListTab = () => {
    const base = listScope === "view" ? inViewAircraft : filteredAircraft;
    const sorted = base.slice().sort((a, b) => {
      if (listSort === "flight") return displayName(a).localeCompare(displayName(b));
      const av = a[listSort] === null || a[listSort] === undefined ? -Infinity : a[listSort];
      const bv = b[listSort] === null || b[listSort] === undefined ? -Infinity : b[listSort];
      return bv - av;
    }).slice(0, LIST_LIMIT);
    const rows = sorted.map((entry) => [
      { value: displayName(entry), color: emergencyOf(entry) ? "#ff6b6b" : undefined },
      airlineLabel(entry.al, reference),
      routeText(entry, reference),
      entry.reg,
      entry.type,
      labelFor(CATEGORY_OPTIONS, categoryGroup(entry)),
      formatAltitude(entry),
      formatNumber(entry.gs, " kt"),
      formatNumber(entry.trk, "°"),
      entry.sq,
      formatCoords(entry.lat, entry.lon),
      formatSeconds(entry.posAt),
      sourceNames(entry.src, sources)
    ]);
    return (
      <div className="satEarthCondGlobalTab">
        <div className="satEarthCondMapControls">
          <div className="satEarthCondMapControlGroup" style={{ flex: 1 }}>
            <div className="satEarthCondSearchInputWrapper">
              <FontAwesomeIcon icon={faSearchPlus} className="satEarthCondSearchIcon" />
              <input type="text" placeholder="Callsign, Registration, Type, Or Hex" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="satEarthCondInput satEarthCondSearchInput" />
            </div>
          </div>
          <div className="satEarthCondMapControlGroup">
            <Dropdown
              value={labelFor(LIST_SCOPE_OPTIONS, listScope)}
              onChange={(option) => setListScope(valueFor(LIST_SCOPE_OPTIONS, option))}
              options={LIST_SCOPE_OPTIONS.map(([, label]) => label)}
              placeholder="Scope"
            />
          </div>
          <div className="satEarthCondMapControlGroup">
            <Dropdown
              value={labelFor(LIST_SORT_OPTIONS, listSort)}
              onChange={(option) => setListSort(valueFor(LIST_SORT_OPTIONS, option))}
              options={LIST_SORT_OPTIONS.map(([, label]) => label)}
              placeholder="Sort"
            />
          </div>
        </div>
        {renderTable(`${base.length > LIST_LIMIT ? `Showing ${LIST_LIMIT.toLocaleString()} Of ${base.length.toLocaleString()}` : `${base.length.toLocaleString()}`} Aircraft`, ["Callsign", "Airline", "Route", "Registration", "Type", "Category", "Altitude", "Speed", "Track", "Squawk", "Position", "Last Position", "Sources"], rows, { emptyText: listScope === "view" ? "No aircraft match the filters inside the current map view." : "No aircraft match the current filters.", onRowClick: (index) => selectAircraft(sorted[index].hex, true) })}
      </div>
    );
  };

  const renderSourcesTab = () => {
    const bySource = feedInfo?.stats?.bySource || {};
    const panels = sourceList.map((source) => {
      const status = sourceStatusLabel(source);
      const cooling = source.cooldownUntil && new Date(source.cooldownUntil) > new Date();
      const tiles = [
        { label: "Status", value: status.label, color: status.color, icon: faBroadcastTower },
        { label: "Aircraft Seen", value: formatNumber(bySource[source.key]), detail: "Tracked Aircraft Reported By Source", icon: faPlane },
        { label: "Last Pull", value: formatNumber(source.lastCount), detail: source.lastSuccessAt ? `Succeeded ${formatRelativeTime(source.lastSuccessAt)}` : "No Successful Pull Yet", icon: faClock },
        { label: "Requests", value: formatNumber(source.requests), detail: "Since The Server Started", icon: faChartLine },
        source.key === "opensky"
          ? { label: "Credits Left", value: source.credits === null || source.credits === undefined ? "—" : formatNumber(source.credits), detail: `${source.authenticated ? "Registered" : "Anonymous"} Access | Every ${formatNumber(source.intervalSeconds)} s`, icon: faTachometerAlt }
          : { label: "Queued", value: formatNumber(source.queued), detail: "Requests Waiting For Rate Limit", icon: faTachometerAlt },
        { label: "Cooldown", value: cooling ? "Paused" : "Clear", detail: cooling ? `Resumes ${formatAbsoluteTime(source.cooldownUntil)}` : "No Backoff In Effect", color: cooling ? "#FF9500" : "#4ecdc4", icon: faShieldHalved }
      ];
      return {
        title: source.name || source.key,
        badge: "LIVE",
        content: (
          <>
            {renderSourceAlert(sourceAlert(source), false)}
            {renderTiles(tiles)}
          </>
        ),
        description: `${SOURCE_TILES[source.key] ? SOURCE_TILES[source.key].description : ""} ${source.terms || ""}`.trim()
      };
    });
    const routeInfo = sources && sources.adsblol && sources.adsblol.routes ? sources.adsblol.routes : null;
    const withRoutes = Array.from(aircraftRef.current.values()).filter((entry) => entry.orig && entry.dest).length;
    const coverageTiles = [
      { label: "Sweep Tiles", value: formatNumber(feedInfo?.sweep?.tiles), detail: "Hexagonal Tiles With 250 nm Radius", icon: faGlobeAmericas },
      { label: "Focus Tiles", value: formatNumber(feedInfo?.sweep?.focus), detail: "Priority Requests For Current View", icon: faCrosshairs },
      { label: "Flights With Routes", value: formatNumber(withRoutes), detail: routeInfo && routeInfo.lastError ? routeInfo.lastError : `${formatNumber(routeInfo ? routeInfo.cached : null)} Callsigns Checked`, color: routeInfo && routeInfo.lastError ? "#FF9500" : undefined, icon: faRoute },
      { label: "Airline Names", value: formatNumber(Object.values(reference.airlines || {}).filter((item) => item && item[0]).length), detail: reference.airlineError || "Virtual Radar Server Standing Data", color: reference.airlineError ? "#ff6b6b" : undefined, icon: faBuilding },
      { label: "Airports", value: formatNumber(airports.length), detail: airportsError || "Large And Scheduled Medium Airports", color: airportsError ? "#ff6b6b" : undefined, icon: faPlaneArrival },
      { label: "Close Zoom Map", value: appleAvailable ? "Apple Maps" : mapProviderError ? "Unavailable" : "Loading", detail: mapProviderError || `Switches At Zoom ${SOURCES.map.appleZoomThreshold} Unless The Heatmap Or Globe Is On`, color: appleAvailable ? "#4ecdc4" : mapProviderError ? "#FF9500" : undefined, icon: faMap }
    ];
    const rows = panels.map((panel) => [panel]);
    return (
      <div className="satEarthCondOverviewTab">
        {renderSection("Live Sources", faSatelliteDish, rows.length ? rows : [[{ title: "Sources", badge: "LIVE", content: <div className="satEarthCondNoChartData">Waiting For The First Update</div>, description: "Source status appears after the first flight feed update arrives from the server." }]])}
        {renderSection("Coverage And Overlays", faLayerGroup, [
          [{ title: "Coverage", badge: "COMPUTED", content: renderTiles(coverageTiles), description: "The server only sweeps the receiver networks while someone has this page open, and it stops ten minutes after the last request. Routes and airline names come from Virtual Radar Server standing data, and airports come from OurAirports." }]
        ])}
      </div>
    );
  };

  const renderCurrentTabContent = () => {
    switch (activeTab) {
      case "overview": return renderOverviewTab();
      case "list": return renderListTab();
      case "sources": return renderSourcesTab();
      default: return null;
    }
  };

  const trailSince = Date.now() / 1000 - SOURCES.map.trailSeconds;
  const layerCounts = {
    aircraft: inViewAircraft.length.toLocaleString(),
    labels: viewState.zoom >= SOURCES.map.labelZoom ? Math.min(inViewAircraft.length, SOURCES.map.maxLabels).toLocaleString() : "Zoom In",
    trails: viewState.zoom >= SOURCES.map.trailZoom ? inViewAircraft.filter((entry) => trailRuns(mergeTrail(serverTrails[entry.hex], trailBufferRef.current.get(entry.hex)), trailSince).length).length.toLocaleString() : "Zoom In",
    paths: pathAircraft.filter((entry) => airportCoords(entry.orig, reference, airportIndex) && airportCoords(entry.dest, reference, airportIndex)).length.toLocaleString(),
    airports: airportsError ? "Error" : airports.filter((airport) => (airport.size === "large" || viewState.zoom >= SOURCES.map.airportMediumZoom) && inBounds(viewState.bounds, airport.lon, airport.lat)).length.toLocaleString(),
    heatmap: inViewAircraft.length.toLocaleString()
  };

  const renderControlsPanel = () => (
    <div className="satEarthCondControlsPanel">

      <div className="satWeatherAreaList">
        <div className="satWeatherAreaListHeader">
          <span className="satWeatherAreaListTitle"><FontAwesomeIcon icon={faMapPin} /> Monitored Areas</span>
          <button className="satWeatherAreaListButton" onClick={() => openAreaModal(null)} title="Add Area"><FontAwesomeIcon icon={faPlus} /></button>
        </div>
        {areas.length === 0 ? (
          <div className="satWeatherAreaListEmpty">Add an area to start tracking the aircraft and emergencies inside it.</div>
        ) : (
          <div className="satWeatherAreaListItems">
            {areas.map((area) => {
              const summary = areaCounts[area.area_id] || { aircraft: 0, emergencies: 0 };
              const isSelected = area.area_id === selectedAreaId;
              return (
                <div key={area.area_id} className={`satWeatherAreaListItem${isSelected ? " satWeatherAreaListItemSelected" : ""}`} onClick={() => selectArea(area)}>
                  <span className="satWeatherAreaListItemDot" style={{ backgroundColor: summary.emergencies ? "#ff6b6b" : summary.aircraft ? "#4ecdc4" : "#3d4354" }} />
                  <div className="satWeatherAreaListItemInfo">
                    <span className="satWeatherAreaListItemName">{area.name || describeArea(area)}</span>
                    <span className="satWeatherAreaListItemMeta">{`${summary.aircraft.toLocaleString()} Aircraft · ${summary.emergencies} Emergenc${summary.emergencies === 1 ? "y" : "ies"}`}</span>
                  </div>
                  <button className="satWeatherAreaListButton" onClick={(event) => { event.stopPropagation(); openAreaModal(area); }} title="Edit Area"><FontAwesomeIcon icon={faEdit} /></button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="satEarthCondControlGroupStack">
        <div className="satEarthCondControlGroup">
          <label>Search Places</label>
          <input
            type="text"
            placeholder="City or Place"
            value={locationQuery}
            onChange={(e) => setLocationQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") searchLocations(); }}
            className="satEarthCondInput"
          />
        </div>
        <div className="satEarthCondControlGroup">
          <button onClick={searchLocations} className="satEarthCondBtn satEarthCondBtnSecondary">
            <FontAwesomeIcon icon={faSearchPlus} /> Search
          </button>
          {locationSearchStatus && <div className="satEarthCondLocationSearchStatus">{locationSearchStatus}</div>}
          {locationResults.length > 0 && (
            <div className="satEarthCondLocationResults">
              {locationResults.map(result => (
                <button key={`${result.latitude}_${result.longitude}`} type="button" className="satEarthCondLocationResult" onClick={() => selectSearchResult(result)}>
                  <span className="satEarthCondLocationResultName">{result.label}</span>
                  <span className="satEarthCondLocationResultCoords">{result.latitude.toFixed(3)}, {result.longitude.toFixed(3)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="satEarthCondControlGroup">
          <button onClick={() => setShowLocationPicker(true)} className="satEarthCondBtn satEarthCondBtnSecondary satWeatherBtnElide" title="Choose A Location On The Map Or By Coordinates">
            <FontAwesomeIcon icon={faGlobeAmericas} /> <span>Set Location</span>
          </button>
        </div>
        {locationActive && (
          <div className="satEarthCondControlGroup">
            <div className="satWeatherLocationCurrent" title={`${locationName} | ${selectedLat.toFixed(4)}°, ${selectedLon.toFixed(4)}°`}>
              <span className="satWeatherLocationCurrentName">{locationName}</span>
              <span className="satWeatherLocationCurrentCoords">{`${selectedLat.toFixed(4)}°, ${selectedLon.toFixed(4)}°`}</span>
            </div>
            <button onClick={() => setSelectedLocation(WORLDWIDE_KEY)} className="satEarthCondBtn satEarthCondBtnSecondary">
              <FontAwesomeIcon icon={faXmark} /> Clear Location
            </button>
          </div>
        )}
        <div className="satEarthCondControlGroup">
          <Dropdown
            value={labelFor(AIRSPACE_RADIUS_OPTIONS, airspaceRadius)}
            onChange={(option) => setAirspaceRadius(valueFor(AIRSPACE_RADIUS_OPTIONS, option))}
            options={AIRSPACE_RADIUS_OPTIONS.map(([, label]) => label)}
            placeholder="Airspace Radius"
            className={locationActive ? "" : "satEarthCondDropdownDisabled"}
          />
        </div>
        <div className="satEarthCondControlGroup">
          <Dropdown
            value={labelFor(AIRSPACE_CEILING_OPTIONS, airspaceCeiling)}
            onChange={(option) => setAirspaceCeiling(valueFor(AIRSPACE_CEILING_OPTIONS, option))}
            options={AIRSPACE_CEILING_OPTIONS.map(([, label]) => label)}
            placeholder="Airspace Ceiling"
            className={locationActive ? "" : "satEarthCondDropdownDisabled"}
          />
        </div>
      </div>

      <div className="satEarthCondControlGroupStack">
        <div className="satEarthCondControlGroup">
          <label>Search Flights</label>
          <input
            type="text"
            placeholder="Callsign, Registration, Or Hex"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && searchResults[0]) selectAircraft(searchResults[0].hex, true); }}
            className="satEarthCondInput"
          />
          {searchTerm.length >= 2 && (
            searchResults.length > 0 ? (
              <div className="satEarthCondLocationResults">
                {searchResults.map(entry => (
                  <button key={entry.hex} type="button" className="satEarthCondLocationResult" onClick={() => selectAircraft(entry.hex, true)}>
                    <span className="satEarthCondLocationResultName">{displayName(entry)}</span>
                    <span className="satEarthCondLocationResultCoords">{[routeText(entry, reference), entry.type, entry.reg, formatAltitude(entry)].filter(Boolean).join(" | ")}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="satEarthCondLocationSearchStatus">No tracked aircraft match that search.</div>
            )
          )}
        </div>
        <div className="satEarthCondControlGroup">
          <button onClick={() => setSearchOpen(true)} className={`satEarthCondBtn satEarthCondBtnSecondary satWeatherBtnElide ${searchApplied && activeSearchCount ? "satWeatherBtnActive" : ""}`}>
            <FontAwesomeIcon icon={faSliders} /><span className="satEarthCondHarvestLabel">{activeSearchCount ? `Advanced Search (${activeSearchCount} Filter${activeSearchCount === 1 ? "" : "s"})` : "Advanced Search"}</span>
          </button>
        </div>
      </div>

      <div className="satEarthCondControlGroupStack">
        <div className="satEarthCondControlGroup">
          <label>Map Layers</label>
          <div className="satWeatherLayerList">
            {LAYER_DEFINITIONS.map(layer => (
              <div key={layer.id} className="satWeatherLayerItem" onClick={() => toggleLayer(layer.id)}>
                <span className="satWeatherLayerIcon" style={{ color: layer.color, opacity: layerVisibility[layer.id] ? 1 : 0.4 }}><FontAwesomeIcon icon={layer.icon} /></span>
                <span className="satWeatherLayerName" style={{ opacity: layerVisibility[layer.id] ? 1 : 0.5 }}>{layer.name}</span>
                <span className="satWeatherLayerCount">{layerVisibility[layer.id] ? layerCounts[layer.id] : "Off"}</span>
                <span className="satWeatherLayerToggle"><FontAwesomeIcon icon={layerVisibility[layer.id] ? faEye : faEyeSlash} /></span>
              </div>
            ))}
          </div>
          {layerVisibility.airports && airportsError && (
            <div className="satEarthCondHarvestWarnings">
              <div className={`satEarthCondHarvestWarning ${expandedWarnings.airports ? "satEarthCondHarvestWarningExpanded" : ""}`} onClick={() => toggleWarning("airports")}>
                <FontAwesomeIcon icon={faExclamationTriangle} className="satEarthCondHarvestWarningIcon" />
                <div className="satEarthCondHarvestWarningBody">
                  <span className="satEarthCondHarvestWarningTitle">Airports</span>
                  <span className="satEarthCondHarvestWarningText">{airportsError}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="satEarthCondControlGroupStack">
        <div className="satEarthCondControlGroup">
          <label className="satEarthCondCheckboxLabel">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            <span>Auto Refresh</span>
          </label>
        </div>
      </div>

      <div className="satEarthCondControlGroupStack" style={{ borderBottom: 0 }}>
        <div className="satEarthCondControlGroup">
          <Dropdown
            value={labelFor(REFRESH_INTERVAL_OPTIONS, refreshInterval)}
            onChange={(option) => setRefreshInterval(valueFor(REFRESH_INTERVAL_OPTIONS, option))}
            options={REFRESH_INTERVAL_OPTIONS.map(([, label]) => label)}
            placeholder="Interval"
            className={autoRefresh ? "" : "satEarthCondDropdownDisabled"}
          />
        </div>
      </div>

      <div className="satEarthCondControlGroupStack">
        <div className="satEarthCondHarvestPanel">
          <div className="satEarthCondHarvestTitle">Harvester</div>
          <div className="satEarthCondHarvestRow"><span>Status</span><span style={{ color: SOURCES.harvest.statusColors[harvestStatusLabel] || "#ff6b6b" }}>{harvestStatusLabel}</span></div>
          <div className="satEarthCondHarvestRow"><span>Products</span><span>{harvestObjects.toLocaleString()}</span></div>
          <div className="satEarthCondHarvestRow"><span>Records</span><span>{harvestStats.frames.toLocaleString()}</span></div>
          <div className="satEarthCondHarvestRow"><span>Census Snapshots</span><span>{censusFrames === null ? "—" : censusFrames.toLocaleString()}</span></div>
          <div className="satEarthCondHarvestRow"><span>Emergency Events</span><span>{emergencyFrames === null ? "—" : emergencyFrames.toLocaleString()}</span></div>
          <div className="satEarthCondHarvestRow"><span>Jobs Due</span><span>{harvestStats.due}</span></div>
          <div className="satEarthCondHarvestRow"><span>Jobs Running</span><span>{harvestStats.running}</span></div>
          <div className="satEarthCondHarvestRow"><span>Sources</span><span>{harvestStats.sources}</span></div>
          <div className="satEarthCondHarvestRow"><span>Failing</span><span style={{ color: harvestStats.failing ? "#ff6b6b" : undefined }}>{harvestStats.failing}</span></div>
          <div className="satEarthCondHarvestRow"><span>New Leads</span><span style={{ color: harvestHealth?.leads?.new_leads ? "#ffd93d" : undefined }}>{harvestHealth?.leads ? harvestHealth.leads.new_leads : "—"}</span></div>
          <div className="satEarthCondHarvestRow"><span>Throttle</span><span style={{ color: harvestHealth?.engine?.throttle === "Normal" ? "#4ecdc4" : harvestHealth?.engine?.throttle ? "#FF9500" : undefined }}>{harvestHealth?.engine?.throttle ? `${harvestHealth.engine.throttle} (${harvestHealth.engine.lagMs} ms)` : "—"}</span></div>
          <div className="satEarthCondHarvestRow"><span>Last Tick</span><span>{harvestHealth?.engine?.lastTickAt ? formatRelativeTime(harvestHealth.engine.lastTickAt) : "—"}</span></div>
          {harvestWarnings.length > 0 && (
            <div className="satEarthCondHarvestWarnings">
              {harvestWarnings.map((warning, index) => {
                const [title, text] = splitWarning(warning);
                return (
                  <div key={index} className={`satEarthCondHarvestWarning ${expandedWarnings[warning] ? "satEarthCondHarvestWarningExpanded" : ""}`} onClick={() => toggleWarning(warning)}>
                    <FontAwesomeIcon icon={faExclamationTriangle} className="satEarthCondHarvestWarningIcon" />
                    <div className="satEarthCondHarvestWarningBody">
                      <span className="satEarthCondHarvestWarningTitle">{title}</span>
                      <span className="satEarthCondHarvestWarningText">{text}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="satEarthCondHarvestActions">
            <button className="satEarthCondBtn satEarthCondBtnSecondary" onClick={() => exportHarvest(SOURCES.harvest.trafficProduct, "csv")} disabled={!censusFrames}>
              <FontAwesomeIcon icon={faHistory} /><span className="satEarthCondHarvestLabel">Traffic History</span>
            </button>
            <button className="satEarthCondBtn satEarthCondBtnSecondary" onClick={() => exportHarvest(SOURCES.harvest.emergencyProduct, "csv")} disabled={!emergencyFrames}>
              <FontAwesomeIcon icon={faExclamationTriangle} /><span className="satEarthCondHarvestLabel">Emergency Log</span>
            </button>
            <button className="satEarthCondBtn satEarthCondBtnSecondary" onClick={() => setShowLeads(true)}>
              <FontAwesomeIcon icon={faLightbulb} /><span className="satEarthCondHarvestLabel">Source Leads{harvestHealth?.leads?.new_leads ? ` (${harvestHealth.leads.new_leads} New)` : ""}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="satEarthCondControlActions">
        <button onClick={refreshAll} disabled={loading} className="satEarthCondBtn satEarthCondBtnPrimary">
          {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faRefresh} />} Refresh
        </button>
        <button onClick={exportData} disabled={!filteredAircraft.length} className="satEarthCondBtn satEarthCondBtnSecondary">
          <FontAwesomeIcon icon={faDownload} /> Export
        </button>
      </div>
    </div>
  );

  const searchOptions = useMemo(() => {
    if (!searchOpen) return { airlines: [], types: [], origins: [], destinations: [] };
    const tally = { airlines: new Map(), types: new Map(), origins: new Map(), destinations: new Map() };
    const bump = (map, key) => {
      if (key) map.set(key, (map.get(key) || 0) + 1);
    };
    for (const entry of aircraftRef.current.values()) {
      bump(tally.airlines, entry.al);
      bump(tally.types, entry.type);
      bump(tally.origins, entry.orig);
      bump(tally.destinations, entry.dest);
    }
    const build = (map, labeler) => Array.from(map.entries()).map(([value, count]) => ({ value, count, label: labeler(value) || value })).sort((a, b) => b.count - a.count);
    return {
      airlines: build(tally.airlines, (code) => airlineLabel(code, reference)),
      types: build(tally.types, (code) => typeLabel(code, reference)),
      origins: build(tally.origins, (code) => airportLabel(code, reference, airportIndex)),
      destinations: build(tally.destinations, (code) => airportLabel(code, reference, airportIndex))
    };
  }, [searchOpen, dataVersion, reference, airportIndex]);

  const updateSearch = (key, value) => setSearchSpec((prev) => ({ ...prev, [key]: value }));

  const runLookup = async () => {
    const value = lookupValue.trim();
    if (value.length < 2) {
      setLookupState({ loading: false, message: "Enter at least two characters to search worldwide.", rows: [] });
      return;
    }
    setLookupState({ loading: true, message: null, rows: [] });
    try {
      const response = await fetch(`${apiUrl("lookup")}?${new URLSearchParams({ field: lookupField, value }).toString()}`);
      const data = await response.json().catch(() => null);
      if (!response.ok || !data || !data.success) throw new Error((data && data.message) || `The worldwide lookup returned status ${response.status}.`);
      const fields = data.fields || [];
      const entries = (data.rows || []).map((row) => {
        const entry = Object.fromEntries(fields.map((field, index) => [field, row[index]]));
        entry.ground = Boolean(entry.ground);
        entry.mil = Boolean(entry.mil);
        aircraftRef.current.set(entry.hex, entry);
        return entry;
      });
      setDataVersion((current) => current + 1);
      setLookupState({ loading: false, message: entries.length ? null : "No aircraft with that value are broadcasting anywhere right now.", rows: entries });
    } catch (error) {
      setLookupState({ loading: false, message: `The worldwide lookup failed because of the error "${errorText(error)}".`, rows: [] });
    }
  };

  const renderSearchModal = () => {
    if (!searchOpen) return null;
    const matches = searchMatches.slice().sort((a, b) => displayName(a).localeCompare(displayName(b)));
    const chips = [
      searchSpec.text.trim() ? { key: "text", label: `Text: ${searchSpec.text.trim()}` } : null,
      searchSpec.airline ? { key: "airline", label: airlineLabel(searchSpec.airline, reference) } : null,
      searchSpec.origin ? { key: "origin", label: `From ${searchSpec.origin}` } : null,
      searchSpec.destination ? { key: "destination", label: `To ${searchSpec.destination}` } : null,
      searchSpec.type ? { key: "type", label: typeLabel(searchSpec.type, reference) } : null,
      searchSpec.category !== "all" ? { key: "category", label: labelFor(CATEGORY_OPTIONS, searchSpec.category) } : null,
      searchSpec.status !== "any" ? { key: "status", label: labelFor(SEARCH_STATUS_OPTIONS, searchSpec.status) } : null,
      searchSpec.special !== "any" ? { key: "special", label: labelFor(SEARCH_SPECIAL_OPTIONS, searchSpec.special) } : null,
      searchSpec.source !== "any" ? { key: "source", label: labelFor(SEARCH_SOURCE_OPTIONS, searchSpec.source) } : null,
      searchSpec.altMin !== "" || searchSpec.altMax !== "" ? { key: "altitude", label: `Altitude ${searchSpec.altMin || "0"} To ${searchSpec.altMax || "Any"} Ft` } : null,
      searchSpec.speedMin !== "" || searchSpec.speedMax !== "" ? { key: "speed", label: `Speed ${searchSpec.speedMin || "0"} To ${searchSpec.speedMax || "Any"} Kt` } : null
    ].filter(Boolean);
    const clearChip = (key) => {
      if (key === "altitude") setSearchSpec((prev) => ({ ...prev, altMin: "", altMax: "" }));
      else if (key === "speed") setSearchSpec((prev) => ({ ...prev, speedMin: "", speedMax: "" }));
      else updateSearch(key, EMPTY_SEARCH[key]);
    };
    const resultRow = (entry) => [
      <div className="satOpResultCell">
        <span className="satOpResultPrimary" style={emergencyOf(entry) ? { color: "#ff6b6b" } : undefined}>{displayName(entry)}</span>
        <span className="satOpResultSecondary">{airlineLabel(entry.al, reference) || entry.reg || "Unknown Operator"}</span>
      </div>,
      <span className="satOpResultPlain">{routeText(entry, reference) || "—"}</span>,
      <span className="satOpResultPlain" title={typeLabel(entry.type, reference) || ""}>{entry.type || "—"}</span>,
      <span className="satOpResultPlain">{formatAltitude(entry)}</span>,
      <button type="button" className="satFeedsRowButton" onClick={() => { setSearchOpen(false); selectAircraft(entry.hex, true); }}>Show</button>
    ];
    const columns = ["Flight", "Route", "Type", "Altitude", ""];
    const group = (title, icon, children) => (
      <section className="satOpGroup">
        <div className="satOpGroupTitle"><FontAwesomeIcon icon={icon} /><span>{title}</span></div>
        <div className="satOpGroupGrid">{children}</div>
      </section>
    );
    const dropdownField = (label, options, key, wide) => (
      <div className={`satOpField ${wide ? "satOpFieldWide" : ""}`}>
        <label className="satOpLabel">{label}</label>
        <Dropdown value={labelFor(options, searchSpec[key])} onChange={(option) => updateSearch(key, valueFor(options, option))} options={options.map(([, text]) => text)} placeholder={label} />
      </div>
    );
    const rangeField = (label, minKey, maxKey) => (
      <div className="satOpField">
        <label className="satOpLabel">{label}</label>
        <div className="satOpRange">
          <input type="number" className="satEarthCondInput" placeholder="Min" value={searchSpec[minKey]} onChange={(e) => updateSearch(minKey, e.target.value)} />
          <input type="number" className="satEarthCondInput" placeholder="Max" value={searchSpec[maxKey]} onChange={(e) => updateSearch(maxKey, e.target.value)} />
        </div>
      </div>
    );
    const tabs = [
      { key: "filters", label: activeSearchCount ? `Filters (${activeSearchCount})` : "Filters", icon: faSliders },
      { key: "matches", label: `Matches (${activeSearchCount ? searchMatches.length.toLocaleString() : 0})`, icon: faList },
      { key: "worldwide", label: "Worldwide Lookup", icon: faGlobeAmericas }
    ];
    const footer = (
      <>
        <span className="satOpModalFooterInfo">{activeSearchCount ? `${searchMatches.length.toLocaleString()} Of ${aircraftRef.current.size.toLocaleString()} Tracked Aircraft Match` : "No Filters Set"}</span>
        <div className="satOpModalFooterActions">
          <button type="button" className="satLeadFilter" onClick={() => { setSearchSpec(EMPTY_SEARCH); setSearchApplied(false); }} disabled={!activeSearchCount}>
            <FontAwesomeIcon icon={faXmark} /> Clear
          </button>
          <button type="button" className={`satLeadFilter ${searchApplied ? "satLeadFilterActive" : ""}`} onClick={() => setSearchApplied((value) => !value)} disabled={!activeSearchCount}>
            <FontAwesomeIcon icon={faFilter} /> {searchApplied ? "Filtering Map" : "Filter Map"}
          </button>
        </div>
      </>
    );
    return (
      <FeedsModal title="Find Aircraft" onClose={() => setSearchOpen(false)} className="satOpModal" footer={footer}>
        <div className="satOpSearchBar">
          <FontAwesomeIcon icon={faMagnifyingGlass} className="satOpSearchBarIcon" />
          <input type="text" className="satOpInput" placeholder="Callsign, Registration, Hex, Or Squawk" value={searchSpec.text} onChange={(e) => updateSearch("text", e.target.value)} autoFocus />
        </div>
        {chips.length > 0 && (
          <div className="satOpChipRow">
            {chips.map((chip) => (
              <button key={chip.key} type="button" className="satOpChip" onClick={() => clearChip(chip.key)} title={`Remove ${chip.label}`}>
                <span>{chip.label}</span>
                <FontAwesomeIcon icon={faXmark} />
              </button>
            ))}
          </div>
        )}
        <FeedsTabs tabs={tabs} activeTab={searchTab} onTabChange={setSearchTab} />
        {searchTab === "filters" && (
          <div className="satOpGroups">
            {group("Airline And Route", faRoute, (
              <>
                <Typeahead label="Airline" placeholder="Name Or ICAO Code" value={searchSpec.airline} options={searchOptions.airlines} onChange={(value) => updateSearch("airline", value)} wide />
                <Typeahead label="Departure Airport" placeholder="City, Name, Or Code" value={searchSpec.origin} options={searchOptions.origins} onChange={(value) => updateSearch("origin", value)} />
                <Typeahead label="Arrival Airport" placeholder="City, Name, Or Code" value={searchSpec.destination} options={searchOptions.destinations} onChange={(value) => updateSearch("destination", value)} />
              </>
            ))}
            {group("Aircraft", faPlane, (
              <>
                <Typeahead label="Aircraft Type" placeholder="Model Or Type Code" value={searchSpec.type} options={searchOptions.types} onChange={(value) => updateSearch("type", value)} />
                {dropdownField("Category", CATEGORY_OPTIONS, "category")}
                {dropdownField("Special", SEARCH_SPECIAL_OPTIONS, "special")}
                {dropdownField("Seen By", SEARCH_SOURCE_OPTIONS, "source")}
              </>
            ))}
            {group("Flight State", faGaugeHigh, (
              <>
                {dropdownField("Status", SEARCH_STATUS_OPTIONS, "status", true)}
                {rangeField("Altitude (Ft)", "altMin", "altMax")}
                {rangeField("Ground Speed (Kt)", "speedMin", "speedMax")}
              </>
            ))}
          </div>
        )}
        {searchTab === "matches" && (
          activeSearchCount === 0 ? (
            <div className="satFeedsEmpty">Set at least one filter or type in the search bar to see matching aircraft.</div>
          ) : (
            <>
              <FeedsTable columns={columns} rows={matches.slice(0, SEARCH_RESULT_LIMIT).map(resultRow)} emptyText="No tracked aircraft match these filters." />
              {matches.length > SEARCH_RESULT_LIMIT && <div className="satOpNote">{`Showing the first ${SEARCH_RESULT_LIMIT} of ${matches.length.toLocaleString()} matches. Use Filter Map to see all of them on the map.`}</div>}
            </>
          )
        )}
        {searchTab === "worldwide" && (
          <>
            <div className="satOpNote">This asks adsb.lol for every aircraft broadcasting a callsign, registration, or type anywhere in the world, including areas the sweep has not reached yet.</div>
            <div className="satOpLookup">
              <div className="satOpToolbarField">
                <Dropdown value={labelFor(LOOKUP_FIELD_OPTIONS, lookupField)} onChange={(option) => setLookupField(valueFor(LOOKUP_FIELD_OPTIONS, option))} options={LOOKUP_FIELD_OPTIONS.map(([, label]) => label)} placeholder="Field" />
              </div>
              <input type="text" className="satEarthCondInput" placeholder={lookupField === "type" ? "Type Code Such As B789" : lookupField === "registration" ? "Registration Such As N12345" : "Callsign Such As BAW117"} value={lookupValue} onChange={(e) => setLookupValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") runLookup(); }} />
              <button type="button" className="satLeadFilter" onClick={runLookup} disabled={lookupState.loading}>
                <FontAwesomeIcon icon={lookupState.loading ? faSpinner : faMagnifyingGlass} spin={lookupState.loading} /> Search
              </button>
            </div>
            {lookupState.message && <div className="satLeadNotice">{lookupState.message}</div>}
            {lookupState.rows.length > 0 && <FeedsTable columns={columns} rows={lookupState.rows.map(resultRow)} emptyText="No aircraft matched." />}
          </>
        )}
      </FeedsModal>
    );
  };

  const tabs = [
    { id: "map", label: "Live Map", icon: faGlobeAmericas, badge: 0 },
    { id: "overview", label: "Traffic Overview", icon: faChartBar, badge: 0 },
    { id: "list", label: "Aircraft List", icon: faList, badge: 0 },
    { id: "sources", label: "Sources & Coverage", icon: faDatabase, badge: 0 }
  ];

  return (
    <div className="satEarthCondPage">
      {layoutVisibility.nav && <Nav activePage="flighttracker" />}

      {authLoading ? (
        <div className="satEarthCondGate">
          <div className="loading-wrapper">
            <div className="loading-circle" />
            <label className="loading-title">
              Loading
            </label>
          </div>
        </div>
      ) : (
      <div className={`satEarthCondContainer ${layoutVisibility.nav ? "" : "satEarthCondContainerNoNav"}`}>
        {layoutVisibility.header && (
        <header className="satEarthCondHeader satWeatherHeader">
          <div className="satEarthCondHeaderContent">
            <div className="satEarthCondTitleSection">
              <div className="satEarthCondSubtitle">{activeAreas ? `${activeAreasLabel} | Area Filter On | ${filteredAircraft.length.toLocaleString()} Aircraft | ${emergencies.length} Emergenc${emergencies.length === 1 ? "y" : "ies"}` : locationActive ? `${locationName} | ${selectedLat.toFixed(4)}°, ${selectedLon.toFixed(4)}° | ${labelFor(AIRSPACE_RADIUS_OPTIONS, airspaceRadius)} | ${labelFor(AIRSPACE_CEILING_OPTIONS, airspaceCeiling)}` : "Global Flight Tracker | Worldwide Traffic"}</div>
            </div>
            <div className="satEarthCondHeaderStatus">
              <button
                type="button"
                title={ackHistory.length ? "Review Alerts" : "Show Controls"}
                className={`satEarthCondAlertBtn ${emergencies.length > 0 ? "satEarthCondAlertBtnCritical" : ""}`}
                onClick={() => {
                  if (ackReviewList.length) {
                    openAckReview();
                    return;
                  }
                  setLayoutVisibility((prev) => ({ ...prev, sidebar: true }));
                }}
              >
                <FontAwesomeIcon icon={faBell} />
                {emergencies.length > 0 && <span className="satEarthCondAlertBadge">{emergencies.length}</span>}
              </button>
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
                  className="satEarthCondAlertBtn"
                  onClick={() => sounds.test(sounds.settings.minLevel)}
                >
                  <FontAwesomeIcon icon={faPlay} />
                </button>
              </div>
            </div>
          </div>
        </header>
        )}
        <div className="satEarthCondMainContent">
          {layoutVisibility.sidebar && <aside className="satEarthCondSidebar">{renderControlsPanel()}</aside>}
          {showLeads && <LeadsModal onClose={() => setShowLeads(false)} onChanged={loadHarvestHealth} />}
          {renderSearchModal()}
          <div className="satEarthCondContentArea">
            <nav className="satEarthCondTabs">
              {tabs.map(tab => (
                <button key={tab.id} className={`satEarthCondTab ${activeTab === tab.id ? "satEarthCondTabActive" : ""}`} onClick={() => setActiveTab(tab.id)}>
                  <FontAwesomeIcon icon={tab.icon} />
                  <span>{tab.label}</span>
                  {tab.badge > 0 && <span className="satEarthCondTabBadge">{tab.badge}</span>}
                </button>
              ))}
              <div className="satEarthCondLayoutControls">
                {LAYOUT_TOGGLES.map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    title={`${layoutVisibility[key] ? "Hide" : "Show"} ${label}`}
                    className={`satEarthCondLayoutToggle ${layoutVisibility[key] ? "satEarthCondLayoutToggleActive" : ""}`}
                    onClick={() => setLayoutVisibility(prev => ({ ...prev, [key]: !prev[key] }))}
                  >
                    <FontAwesomeIcon icon={layoutVisibility[key] ? faEye : faEyeSlash} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </nav>
            <div className={`satEarthCondTabContent ${activeTab === "map" ? "satWeatherTabContentMap" : ""}`} ref={tabContentRef} onClick={activeTab === "map" ? undefined : handleExpandClick}>
              {renderMapView()}
              {activeTab !== "map" && (
                feedError && !feedInfo ? (
                  <div className="disconnectedNoResults satEarthCondFullHeight">
                    <div className="disconnectedNoResultCell">
                      <FontAwesomeIcon icon={faExclamationTriangle} size="5x" className="disconnectedNoResultsIcon" />
                      <div className="disconnectedNoResultsText">The flight tracking services could not be reached.</div>
                      <div className="disconnectedNoResultsButtons">
                        <button className="disconnectedNoResultsRefresh" onClick={refreshAll} disabled={loading}>
                          {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faRefresh} />} Refresh
                        </button>
                      </div>
                    </div>
                  </div>
                ) : !feedInfo ? (
                  <div className="satEarthCondLoadingState">
                    <div className="loading-circle" />
                  </div>
                ) : renderCurrentTabContent()
              )}
            </div>
          </div>
        </div>
        {layoutVisibility.footer && (
        <footer className="satEarthCondFooter">
          <div className="satEarthCondFooterContent">
            <span>Last Updated: {feedInfo?.updatedAt ? new Date(feedInfo.updatedAt).toLocaleTimeString() : "—"}</span>
            <span>Latency: {latency}ms</span>
            <span>Tracked: {trackedTotal.toLocaleString()}</span>
            <span>Active Emergencies: {emergencies.length.toLocaleString()}</span>
          </div>
        </footer>
        )}
      </div>
      )}
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
      {renderAckModal()}
      <AreaModal open={areaModalOpen} onClose={() => setAreaModalOpen(false)} title={editingAreaId ? "Edit Monitored Area" : "Add Monitored Area"}>
        <p className="satWeatherModalIntro">
          Monitored areas track every aircraft and emergency squawk inside them, and the area filter limits the map, lists, counts, and alert sounds to them. Choose a point with a radius (a circle around an address or coordinates) or a bounding box (a rectangle).
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
                  bias={{ latitude: viewState.lat, longitude: viewState.lon }}
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
            <button type="button" className="satWeatherModalBtnSecondary" onClick={useMapCenterForArea}><FontAwesomeIcon icon={faLocationCrosshairs} /> Use Current Map Center</button>
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
            <button type="button" className="satWeatherModalBtnSecondary" onClick={useMapViewForArea}><FontAwesomeIcon icon={faMap} /> Use Current Map View</button>
          </>
        )}
        <div className="satWeatherModalActions">
          {editingAreaId && <button className="satWeatherModalBtnDanger" onClick={() => deleteArea(editingAreaId)}><FontAwesomeIcon icon={faTrash} /> Delete Area</button>}
          <button className="satWeatherModalBtnSecondary" onClick={() => setAreaModalOpen(false)}>Cancel</button>
          <button className="satWeatherModalBtnPrimary" onClick={() => handleSaveArea(true)}><FontAwesomeIcon icon={faSave} /> Save Area</button>
        </div>
      </AreaModal>
      {showLocationPicker && (
        <LocationPickerModal
          initialLat={locationActive ? selectedLat : viewState.lat}
          initialLon={locationActive ? selectedLon : viewState.lon}
          initialLabel={locationActive && locationName !== CUSTOM_LOCATION_LABEL ? locationName : null}
          onCancel={() => setShowLocationPicker(false)}
          onConfirm={(choice) => {
            const key = `${choice.lat},${choice.lon}`;
            setCustomLocationLabel({ key, label: choice.label || CUSTOM_LOCATION_LABEL });
            setSelectedLocation(key);
            setShowLocationPicker(false);
          }}
        />
      )}
      {expandedView && (
        <div className="satEarthCondModalOverlay" onClick={() => setExpandedView(null)}>
          <div className="satEarthCondModal" onClick={(event) => event.stopPropagation()}>
            <div className="satEarthCondModalHeader">
              <h4 className="satEarthCondModalTitle">{expandedView.title}</h4>
              <button type="button" className="satEarthCondModalClose" onClick={() => setExpandedView(null)} aria-label="Close">
                <FontAwesomeIcon icon={faXmarkSquare} />
              </button>
            </div>
            <div className="satEarthCondModalBody">
              {expandedView.chart ? (
                <ResponsiveChart
                  option={{
                    ...expandedView.chart,
                    xAxis: { ...expandedView.chart.xAxis, axisLabel: { ...expandedView.chart.xAxis?.axisLabel, overflow: "none", width: undefined } },
                    yAxis: { ...expandedView.chart.yAxis, axisLabel: { ...expandedView.chart.yAxis?.axisLabel, overflow: "none", width: undefined } }
                  }}
                  className="satEarthCondChart satEarthCondChartExpanded"
                />
              ) : (
                <div className="satEarthCondExpandedContent" dangerouslySetInnerHTML={{ __html: expandedView.html }} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlightTracker;