import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEye, faEyeSlash, faExclamationTriangle, faXmarkSquare, faBell,
  faRefresh, faDownload, faSpinner, faHistory, faLightbulb, faXmark,
  faCheck, faBan, faLayerGroup, faSearchPlus, faGlobeAmericas, faChartBar,
  faList, faDatabase, faLocationCrosshairs, faBroadcastTower, faChartLine,
  faClock, faSatelliteDish, faShieldHalved, faTachometerAlt, faGlobe, faCircleHalfStroke,
  faMapMarkerAlt, faSquareCheck, faBolt, faFlag, faHurricane, faCloudRain, faTowerBroadcast,
  faSatellite, faPlay, faPause, faForwardStep, faBackwardStep, faTornado, faCloudBolt,
  faWind, faDroplet, faTemperatureHalf, faMap, faVolumeHigh, faVolumeXmark, faBellSlash, faRepeat, faMapPin, faPlus, faEdit, faTrash, faSave,
  faLocationDot, faTriangleExclamation, faTimes, faCheckCircle, faExclamationCircle, faCheckDouble, faSun, faMoon, faCloud,
  faCloudSun, faCloudMoon, faSmog, faCloudShowersHeavy, faSnowflake
} from "@fortawesome/free-solid-svg-icons";
import Nav from "../../../../helpers/Nav.jsx";
import Dropdown from "../../../../helpers/Dropdown.jsx";
import useAuth from "../../../../UseAuth.jsx";
import ReactEcharts from "echarts-for-react";
import { openDB } from "idb";
import "../../../../styles/mainStyles/Sat/EarthConditions/EarthConditions.css";
import "../../../../styles/mainStyles/Sat/Trackers/WeatherTracker/WeatherTracker.css";
import "../../../../styles/helperStyles/LoadingSpinner.css";
import "../../../../styles/helperStyles/Disconnected.css";

const SOURCES = {
  apiBase: import.meta.env.VITE_API_BASE_URL,
  endpoints: {
    radar: "/weather/radar",
    sites: "/weather/radar/sites",
    overlays: "/weather/overlays",
    alerts: "/weather/alerts",
    alertDetail: "/weather/alerts/detail",
    alertPoints: "/weather/alerts/points",
    alertAnalysis: "/weather/alerts/analysis",
    storms: "/weather/storms",
    reports: "/weather/reports",
    outlooks: "/weather/outlooks",
    tropical: "/weather/tropical",
    point: "/weather/point",
    snapshot: "/weather/snapshot",
    snapshotAnalysis: "/weather/snapshot/analysis",
    health: "/weather/health",
    locationSearch: "/location-search",
    reverseGeocode: "/reverse-geocode",
    areas: "/risk/areas"
  },
  geocoding: {
    photon: "https://photon.komoot.io/api/",
    nominatim: "https://nominatim.openstreetmap.org/search",
    userAgent: "WeatherTracker/1.0",
    minQueryLength: 3,
    debounceMs: 300,
    resultLimit: 6,
    cacheLimit: 100,
    attribution: "Photon · © OpenStreetMap Contributors"
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
    "<a href=\"https://mesonet.agron.iastate.edu\" target=\"_blank\" rel=\"noopener noreferrer\">Iowa Environmental Mesonet</a>",
    "<a href=\"https://www.weather.gov\" target=\"_blank\" rel=\"noopener noreferrer\">NWS</a>",
    "<a href=\"https://www.spc.noaa.gov\" target=\"_blank\" rel=\"noopener noreferrer\">SPC</a>",
    "<a href=\"https://www.nhc.noaa.gov\" target=\"_blank\" rel=\"noopener noreferrer\">NHC</a>",
    "Weather data by <a href=\"https://www.rainviewer.com\" target=\"_blank\" rel=\"noopener noreferrer\">RainViewer</a>",
    "<a href=\"https://open-meteo.com\" target=\"_blank\" rel=\"noopener noreferrer\">Open-Meteo</a>",
    "<a href=\"https://realearth.ssec.wisc.edu\" target=\"_blank\" rel=\"noopener noreferrer\">SSEC RealEarth</a>",
    "<a href=\"https://www.earthdata.nasa.gov/engage/open-data-services-software/earthdata-developer-portal/gibs-api\" target=\"_blank\" rel=\"noopener noreferrer\">NASA GIBS</a>"
  ],
  harvest: {
    base: `${import.meta.env.VITE_API_BASE_URL}/harvest`,
    domain: "weather-tracker",
    censusProduct: "weather-census-national",
    warningProduct: "weather-warning-log",
    healthRefreshMs: 60 * 1000,
    historyDays: 7,
    historyStepSeconds: 3600,
    exportDays: 90,
    jobPattern: /^weathercensus:/,
    statusColors: { Healthy: "#4ecdc4", Degraded: "#FF9500", Idle: "#919baf", "Needs Schema": "#ff6b6b", Loading: "#919baf" }
  },
  refresh: {
    radarMs: 60 * 1000,
    stormsMs: 120 * 1000,
    reportsMs: 300 * 1000,
    outlooksMs: 900 * 1000,
    tropicalMs: 900 * 1000,
    pointMs: 600 * 1000,
    snapshotMs: 600 * 1000,
    snapshotRetryMs: 20 * 1000,
    overlaysMs: 300 * 1000,
    healthMs: 60 * 1000,
    pendingZonesMs: 15 * 1000
  },
  tables: {
    tightAt: 14,
    wrapAt: 28
  },
  persistence: {
    dbName: "WeatherTrackerStateDB",
    storeName: "state",
    recordId: "state",
    restoreFlag: "weatherTrackerRestoreInFlight",
    restoreSettleMs: 3000,
    saveDebounceMs: 500
  },
  sounds: {
    defaults: { enabled: false, minLevel: "warning", scope: "view", volume: 0.6, mode: "single", snoozeUntil: 0 },
    repeatGapSeconds: 0.8,
    scheduleAheadSeconds: 120,
    pointCheckWaitSeconds: 8,
    topUpSeconds: 20
  },
  playback: {
    speeds: [[900, "Slow Playback"], [500, "Normal Playback"], [250, "Fast Playback"]],
    dwellFrames: 3
  },
  map: {
    center: [-96, 38],
    zoom: 3.6,
    minZoom: 1,
    maxZoom: 14,
    minZoomGlobe: 0,
    globeZoom: 0.6,
    globeLatitude: 51.89,
    focusZoom: 8,
    satelliteOpacity: 0.65,
    rainfallOpacity: 0.7,
    stormLabelZoom: 7,
    radarTileFailureLimit: 12,
    trailSpacingPx: 7,
    trailMaxDots: 400,
    stormAllZoom: 6,
    stormMinSeverity: 2,
    stormVectorMinutes: [15, 30, 45, 60],
    reportLabelZoom: 6,
    siteLabelZoom: 5,
    tropicalLabelZoom: 3,
    maxAlertsDrawn: 2500,
    appleLoadTimeoutMs: 10000
  }
};

const apiUrl = (key) => `${SOURCES.apiBase}${SOURCES.endpoints[key]}`;

const DATA_TYPE = {
  LIVE: { label: "LIVE", icon: faBroadcastTower, color: "#4ecdc4", description: "Real-Time Observation" },
  HISTORICAL: { label: "HISTORICAL", icon: faHistory, color: "#919baf", description: "Past Recorded Data" },
  COMPUTED: { label: "COMPUTED", icon: faDatabase, color: "#cdd4e4", description: "Derived from Current Data" },
  FORECAST: { label: "FORECAST", icon: faClock, color: "#B388FF", description: "Model Forecast Data" }
};

const PANEL_CONTAINER_CLASS = { LIVE: "Live", HISTORICAL: "Historical", COMPUTED: "Computed", FORECAST: "Computed" };

const CHART_FONT = "Inter, Arial, sans-serif";

const DEFAULT_LAYOUT = { nav: true, header: true, sidebar: true, footer: true };

const LAYOUT_TOGGLES = [["nav", "Nav"], ["header", "Header"], ["sidebar", "Sidebar"], ["footer", "Footer"]];

const EXPANDABLE_SELECTOR = ".satEarthCondTableCard, .satEarthCondChartDescription, .satEarthCondStatusTileGrid, .satEarthCondStatsSummary";

const REFRESH_INTERVAL_OPTIONS = [[60000, "1 Minute"], [120000, "2 Minutes"], [300000, "5 Minutes"]];

const RADAR_PRODUCT_OPTIONS = [["composite", "US Composite Reflectivity"], ["global", "Global Composite Reflectivity"], ["reflectivity", "Single Site Reflectivity"], ["velocity", "Single Site Velocity"], ["stormRelative", "Single Site Storm Relative Velocity"], ["echoTops", "Single Site Echo Tops"]];

const SINGLE_SITE_PRODUCTS = new Set(["reflectivity", "velocity", "stormRelative", "echoTops"]);

const RADAR_OPACITY_OPTIONS = [[0.5, "50% Radar Opacity"], [0.65, "65% Radar Opacity"], [0.8, "80% Radar Opacity"], [1, "100% Radar Opacity"]];

const SATELLITE_CHANNEL_OPTIONS = [["ch13", "Infrared (Band 13)"], ["ch02", "Visible (Band 2)"], ["ch09", "Water Vapor (Band 9)"]];

const RAINFALL_PERIOD_OPTIONS = [["p1h", "Rainfall Past Hour"], ["p24h", "Rainfall Past 24 Hours"], ["p48h", "Rainfall Past 48 Hours"], ["p72h", "Rainfall Past 72 Hours"]];

const OUTLOOK_KIND_OPTIONS = [["categorical", "Categorical Outlook"], ["tornado", "Tornado Probability"], ["hail", "Hail Probability"], ["wind", "Wind Probability"]];

const ALERT_FILTER_OPTIONS = [["warningsWatches", "Warnings And Watches"], ["warnings", "Warnings Only"], ["severe", "Severe Weather Only"], ["all", "All Alerts"]];

const AREA_RADIUS_OPTIONS = [[25, "25 Mile Radius"], [50, "50 Mile Radius"], [100, "100 Mile Radius"], [200, "200 Mile Radius"], [400, "400 Mile Radius"]];

const SEVERE_EVENTS = new Set(["Tornado Warning", "Severe Thunderstorm Warning", "Flash Flood Warning", "Extreme Wind Warning", "Snow Squall Warning", "Special Marine Warning", "Tornado Watch", "Severe Thunderstorm Watch", "Severe Weather Statement", "Flash Flood Statement", "Dust Storm Warning"]);

const WARNING_CODES = { "Tornado Warning": "TOR", "Severe Thunderstorm Warning": "SVR", "Flash Flood Warning": "FFW", "Extreme Wind Warning": "EWW", "Snow Squall Warning": "SQW", "Special Marine Warning": "SMW", "Dust Storm Warning": "DSW" };

const SOUND_LEVEL_OPTIONS = [["notice", "Watches And Up"], ["warning", "Warnings And Up"], ["critical", "Tornado And Extreme Wind"], ["emergency", "Emergencies Only"]];

const SOUND_SCOPE_OPTIONS = [["areas", "My Areas"], ["area", "Selected Area"], ["view", "Map View"], ["national", "Nationwide"]];

const SOUND_VOLUME_OPTIONS = [[0.3, "Quiet"], [0.6, "Normal"], [1, "Loud"]];
const SNOOZE_OPTIONS = [[15, "15 Minutes"], [30, "30 Minutes"], [60, "1 Hour"], [120, "2 Hours"], [240, "4 Hours"], [480, "8 Hours"], [1440, "24 Hours"]];

const SOUND_LEVEL_LABELS = { notice: "Watch", warning: "Warning", critical: "Critical Warning", emergency: "Emergency" };

const SOUND_WARNING_EVENTS = new Set(["Severe Thunderstorm Warning", "Flash Flood Warning", "Snow Squall Warning", "Special Marine Warning", "Dust Storm Warning", "Hurricane Warning", "Storm Surge Warning", "Blizzard Warning", "Ice Storm Warning"]);

const SOUND_CRITICAL_EVENTS = new Set(["Tornado Warning", "Extreme Wind Warning", "Tsunami Warning"]);

const SOUND_NOTICE_EVENTS = new Set(["Tornado Watch", "Severe Thunderstorm Watch", "Hurricane Watch", "Flash Flood Watch"]);

const weatherSoundLevel = (alert) => {
  if (alert.threat === "emergency") return "emergency";
  if (SOUND_CRITICAL_EVENTS.has(alert.event) || alert.threat === "considerable") return "critical";
  if (SOUND_WARNING_EVENTS.has(alert.event) || /Warning$/.test(alert.event)) return "warning";
  if (SOUND_NOTICE_EVENTS.has(alert.event) || /Watch$/.test(alert.event)) return "notice";
  return null;
};

const weatherSoundMessage = (alert, ended) => ({
  title: ended ? `${alert.event} Ended` : `${alert.messageType === "Update" ? "Updated" : "New"} ${alert.event}`,
  body: String(alert.areaDesc || "").split(";").slice(0, 3).join(";") || "Weather Tracker"
});

const weatherAlertIdentity = (alert) => {
  const match = /\/[A-Z]\.[A-Z]{3}\.([A-Z]{4})\.([A-Z]{2})\.([A-Z])\.(\d{4})\./.exec(String(alert.vtec || ""));
  return match ? match.slice(1).join(".") : alert.id;
};

const weatherSoundKey = (alert) => [alert.id, alert.sent, alert.expires, alert.event, alert.threat, alert.messageType].join("|");

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

const useAlertSounds = ({ defaults, ready, items, inScope, scopeKey, getKey, getLevel, getId, describe, repeatMs, aheadSeconds, topUpMs }) => {
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
    const floor = levelRank(settings.minLevel);
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
    const added = [];
    const now = Date.now();
    for (const [key, entry] of keys.entries()) {
      if (prompted.has(key) || !counts(entry)) continue;
      prompted.add(key);
      added.push({ key, id: getId(entry.item), item: entry.item, level: entry.level, ended: false, at: now, message: describe ? describe(entry.item, false) : null });
    }
    const liveIds = new Set(Array.from(keys.values()).map((entry) => getId(entry.item)));
    for (const [key, entry] of previous.entries()) {
      if (keys.has(key) || !counts(entry) || liveIds.has(getId(entry.item))) continue;
      added.push({ key: `${key}|ended`, id: getId(entry.item), item: entry.item, level: ALERT_SOUND_LEVELS[0], ended: true, at: now, message: describe ? describe(entry.item, true) : null });
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
    else showSystemNotification(`${added.length} Alert Changes`, added.map((entry) => (entry.message ? entry.message.title : "")).filter(Boolean).slice(0, 4).join("; "), persistent);
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

const AREA_HIGHLIGHT_COLORS = { emergency: "#ff6b6b", critical: "#ff6b6b", warning: "#FF9500", notice: "#ffd93d" };

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

const alertInMonitoredArea = (alert, area) => {
  if (!area || !alert.polygons || !alert.polygons.length) return false;
  if (area.mode === "point_radius") return alertInArea(alert, area.latitude, area.longitude, area.radius_km * 0.621371);
  if (alert.bbox && (alert.bbox[2] < area.min_lng || alert.bbox[0] > area.max_lng || alert.bbox[3] < area.min_lat || alert.bbox[1] > area.max_lat)) return false;
  if (alert.polygons.some((polygon) => (polygon[0] || []).some((point) => isPointInArea(point[1], point[0], area)))) return true;
  const probes = [[area.min_lng, area.min_lat], [area.max_lng, area.min_lat], [area.max_lng, area.max_lat], [area.min_lng, area.max_lat], [(area.min_lng + area.max_lng) / 2, (area.min_lat + area.max_lat) / 2]];
  return probes.some(([lng, lat]) => pointInPolygons(lng, lat, alert.polygons));
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

const parseOfficialText = (text) => {
  const blocks = String(text || "").replace(/\r/g, "").split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
  return blocks.map((block) => {
    const items = [];
    for (const rawLine of block.split("\n")) {
      const line = rawLine.trim();
      if (!line) continue;
      if (/^[-*•]\s+/.test(line) || !items.length) items.push(line);
      else items[items.length - 1] = `${items[items.length - 1]} ${line}`;
    }
    const first = items[0] || "";
    const section = /^(?:[-*•]\s*)?([A-Z][A-Z0-9 /&'()-]{1,40}?)\s*\.{2,}\s*(.*)$/.exec(first);
    const clean = (value) => value.replace(/^[-*•]\s+/, "").replace(/^([^.]{3,80}?)\s*\.{3,}\s*/, "$1: ").replace(/\s*\.{3,}\s*/g, "… ").replace(/\s{2,}/g, " ").trim();
    if (section) {
      const lead = clean(section[2]);
      const rest = items.slice(1).map(clean).filter(Boolean);
      return { label: section[1].trim(), text: lead, bullets: rest };
    }
    if (items.length > 1 && items.every((item) => /^[-*•]\s+/.test(item))) return { label: null, text: "", bullets: items.map(clean) };
    return { label: null, text: clean(items.join(" ")), bullets: [] };
  });
};

const linkify = (text) => String(text || "").split(/(https?:\/\/[^\s]+)/g).map((part, index) => (/^https?:\/\//.test(part)
  ? <a key={index} className="satWeatherTableLink" href={part.replace(/[.,;)]+$/, "").replace(/^http:/, "https:")} target="_blank" rel="noopener noreferrer">{part.replace(/[.,;)]+$/, "")}</a>
  : <React.Fragment key={index}>{part}</React.Fragment>));

const OfficialText = ({ title, text }) => {
  const sections = parseOfficialText(text);
  if (!sections.length) return null;
  return (
    <div className="satWeatherOfficial">
      <div className="satWeatherDetailTextTitle">{title}</div>
      {sections.map((section, index) => (
        <div key={index} className={`satWeatherOfficialRow ${section.label ? "" : "satWeatherOfficialRowPlain"}`}>
          {section.label && <div className="satWeatherOfficialLabel">{titleCaseName(section.label)}</div>}
          <div className="satWeatherOfficialBody">
            {section.text && <p>{linkify(section.text)}</p>}
            {section.bullets.map((item, bullet) => <p key={bullet}>{linkify(item)}</p>)}
          </div>
        </div>
      ))}
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

const MAP_WARNING_EVENTS = new Set(["Tornado Warning", "Severe Thunderstorm Warning", "Flash Flood Warning", "Extreme Wind Warning", "Snow Squall Warning", "Special Marine Warning", "Dust Storm Warning"]);

const LAYER_DEFINITIONS = [
  { id: "radar", name: "Radar", icon: faSatelliteDish, color: "#4ecdc4" },
  { id: "alerts", name: "Warnings And Alerts", icon: faExclamationTriangle, color: "#ff6b6b" },
  { id: "storms", name: "Storm Cells", icon: faBolt, color: "#ffd93d" },
  { id: "reports", name: "Storm Reports", icon: faFlag, color: "#42a5f5" },
  { id: "tropical", name: "Tropical Cyclones", icon: faHurricane, color: "#B388FF" },
  { id: "outlook", name: "Convective Outlook", icon: faLayerGroup, color: "#7fe9e1" },
  { id: "satellite", name: "Satellite", icon: faSatellite, color: "#cdd4e4" },
  { id: "rainfall", name: "Rainfall Totals", icon: faCloudRain, color: "#42a5f5" },
  { id: "sites", name: "Radar Sites", icon: faTowerBroadcast, color: "#919baf" }
];

const DEFAULT_LAYERS = { radar: true, alerts: true, storms: true, reports: true, tropical: true, outlook: false, satellite: false, rainfall: false, sites: false };

const RADAR_LEGENDS = {
  reflectivity: { title: "Reflectivity (dBZ)", stops: ["#04e9e7", "#019ff4", "#0300f4", "#02fd02", "#01c501", "#008e00", "#fdf802", "#e5bc00", "#fd9500", "#fd0000", "#d40000", "#bc0000", "#f800fd", "#9854c6", "#fdfdfd"], ticks: ["5", "20", "35", "50", "65", "75"] },
  universalBlue: { title: "Reflectivity (dBZ)", stops: ["#087fdb", "#1c47e8", "#6e0dc6", "#c80f86", "#c06487", "#d2883b", "#fac431", "#fefb02", "#fe9a58", "#fe5f05", "#fd341c", "#bebebe", "#d3d3d3"], ticks: ["10", "25", "40", "55", "70"] },
  velocity: { title: "Radial Velocity (Kt)", stops: ["#00ff90", "#00d000", "#008c00", "#335533", "#777777", "#553333", "#8c0000", "#d00000", "#ff4d80"], ticks: ["Toward", "0", "Away"] },
  echoTops: { title: "Echo Tops (Kft)", stops: ["#6f6f6f", "#00c8ff", "#00ff00", "#ffff00", "#ff8c00", "#ff0000", "#ff00ff"], ticks: ["5", "25", "45", "65"] }
};

const REPORT_STYLES = {
  T: { color: [255, 107, 107], letter: "T" },
  C: { color: [255, 184, 108], letter: "F" },
  W: { color: [255, 121, 198], letter: "W" },
  H: { color: [111, 207, 151], letter: "H" },
  G: { color: [66, 165, 245], letter: "G" },
  D: { color: [66, 165, 245], letter: "D" },
  M: { color: [66, 165, 245], letter: "M" },
  N: { color: [100, 181, 246], letter: "N" },
  O: { color: [100, 181, 246], letter: "N" },
  B: { color: [66, 165, 245], letter: "B" },
  F: { color: [72, 190, 170], letter: "F" },
  E: { color: [72, 190, 170], letter: "E" },
  R: { color: [100, 181, 246], letter: "R" },
  S: { color: [179, 136, 255], letter: "S" },
  X: { color: [179, 136, 255], letter: "S" },
  Z: { color: [179, 136, 255], letter: "Z" },
  s: { color: [129, 212, 250], letter: "I" },
  4: { color: [129, 212, 250], letter: "I" },
  5: { color: [129, 212, 250], letter: "I" },
  L: { color: [255, 217, 61], letter: "L" },
  U: { color: [188, 143, 110], letter: "U" }
};

const DEFAULT_REPORT_STYLE = { color: [145, 155, 175], letter: "?" };

const STORM_COLORS = { 4: [255, 107, 107], 3: [255, 149, 0], 2: [255, 217, 61], 1: [78, 205, 196], 0: [170, 180, 200] };

const STORM_SEVERITY_LABELS = { 4: "Tornado Vortex Signature", 3: "Mesocyclone Or Large Hail", 2: "Severe Hail", 1: "Strong Cell", 0: "Ordinary Cell" };

const TROPICAL_COLORS = { TD: [66, 165, 245], SD: [66, 165, 245], TS: [78, 205, 196], SS: [78, 205, 196], HU: [255, 149, 0], MH: [255, 107, 107], PT: [170, 180, 200], PC: [170, 180, 200] };

const TROPICAL_LABELS = { TD: "Tropical Depression", SD: "Subtropical Depression", TS: "Tropical Storm", SS: "Subtropical Storm", HU: "Hurricane", MH: "Major Hurricane", PT: "Post-Tropical Cyclone", PC: "Potential Tropical Cyclone" };

const WEATHER_CODES = { 0: "Clear", 1: "Mostly Clear", 2: "Partly Cloudy", 3: "Overcast", 45: "Fog", 48: "Freezing Fog", 51: "Light Drizzle", 53: "Drizzle", 55: "Heavy Drizzle", 56: "Freezing Drizzle", 57: "Heavy Freezing Drizzle", 61: "Light Rain", 63: "Rain", 65: "Heavy Rain", 66: "Freezing Rain", 67: "Heavy Freezing Rain", 71: "Light Snow", 73: "Snow", 75: "Heavy Snow", 77: "Snow Grains", 80: "Light Showers", 81: "Showers", 82: "Violent Showers", 85: "Snow Showers", 86: "Heavy Snow Showers", 95: "Thunderstorm", 96: "Thunderstorm With Hail", 99: "Severe Thunderstorm With Hail" };

const SNAPSHOT_RAIN_CODES = [51, 53, 55, 56, 57, 61, 63, 66, 80, 81];

const SNAPSHOT_HEAVY_RAIN_CODES = [65, 67, 82];

const SNAPSHOT_SNOW_CODES = [71, 73, 75, 77, 85, 86];

const snapshotIcon = (code, isDay) => {
  if (code === 0 || code === 1) return isDay ? faSun : faMoon;
  if (code === 2) return isDay ? faCloudSun : faCloudMoon;
  if (code === 45 || code === 48) return faSmog;
  if (SNAPSHOT_RAIN_CODES.includes(code)) return faCloudRain;
  if (SNAPSHOT_HEAVY_RAIN_CODES.includes(code)) return faCloudShowersHeavy;
  if (SNAPSHOT_SNOW_CODES.includes(code)) return faSnowflake;
  if (code >= 95) return faCloudBolt;
  return faCloud;
};

const UV_LEVELS = [[3, "Low", "#4ecdc4"], [6, "Moderate", "#ffd93d"], [8, "High", "#FF9500"], [11, "Very High", "#ff6b6b"], [Infinity, "Extreme", "#B388FF"]];

const AQI_LEVELS = [[51, "Good", "#4ecdc4"], [101, "Moderate", "#ffd93d"], [151, "Unhealthy For Sensitive Groups", "#FF9500"], [201, "Unhealthy", "#ff6b6b"], [301, "Very Unhealthy", "#B388FF"], [Infinity, "Hazardous", "#c2185b"]];

const AQI_GUIDANCE = {
  Good: "Air quality is satisfactory and poses little or no risk.",
  Moderate: "Air quality is acceptable, but unusually sensitive people should consider limiting prolonged outdoor exertion.",
  "Unhealthy For Sensitive Groups": "People with heart or lung disease, older adults, and children should reduce prolonged or heavy outdoor exertion.",
  Unhealthy: "Everyone may begin to feel health effects, and sensitive groups should avoid prolonged outdoor exertion.",
  "Very Unhealthy": "Everyone should avoid prolonged outdoor exertion because the risk of health effects is increased.",
  Hazardous: "This is a health emergency, and everyone should avoid all outdoor exertion."
};

const AQI_POLLUTANTS = [["us_aqi_pm2_5", "PM2.5", "pm2_5", "µg/m³"], ["us_aqi_pm10", "PM10", "pm10", "µg/m³"], ["us_aqi_ozone", "Ozone", "ozone", "µg/m³"], ["us_aqi_nitrogen_dioxide", "Nitrogen Dioxide", "nitrogen_dioxide", "µg/m³"], ["us_aqi_sulphur_dioxide", "Sulfur Dioxide", "sulphur_dioxide", "µg/m³"], ["us_aqi_carbon_monoxide", "Carbon Monoxide", "carbon_monoxide", "µg/m³"]];

const POLLEN_TYPES = [["alder_pollen", "Alder"], ["birch_pollen", "Birch"], ["grass_pollen", "Grass"], ["mugwort_pollen", "Mugwort"], ["olive_pollen", "Olive"], ["ragweed_pollen", "Ragweed"]];

const COMPASS_POINTS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];

const BEAUFORT_LEVELS = [[1, "Calm"], [4, "Light Air"], [8, "Light Breeze"], [13, "Gentle Breeze"], [19, "Moderate Breeze"], [25, "Fresh Breeze"], [32, "Strong Breeze"], [39, "Near Gale"], [47, "Gale"], [55, "Strong Gale"], [64, "Storm"], [73, "Violent Storm"], [Infinity, "Hurricane Force"]];

const VISIBILITY_LEVELS = [[0.25, "Dense Fog", "Visibility is dangerously low, so allow extra distance and time when traveling."], [1, "Fog", "Fog is limiting visibility to about a mile or less."], [3, "Mist", "Haze or mist is noticeably reducing visibility."], [6, "Hazy", "Light haze is softening distant views."], [10, "Clear", "Visibility is good."], [Infinity, "Perfectly Clear", "It is perfectly clear right now."]];

const TEMPERATURE_STOPS = [[0, [126, 87, 194]], [32, [66, 165, 245]], [50, [78, 205, 196]], [65, [165, 214, 111]], [75, [255, 217, 61]], [85, [255, 149, 0]], [95, [255, 107, 107]], [110, [194, 24, 91]]];

const levelFor = (levels, value) => levels.find(([limit]) => value < limit) || levels[levels.length - 1];

const compassPoint = (degrees) => COMPASS_POINTS[Math.round((((Number(degrees) % 360) + 360) % 360) / 22.5) % 16];

const temperatureColor = (value) => {
  const stops = TEMPERATURE_STOPS;
  if (value <= stops[0][0]) return `rgb(${stops[0][1].join(", ")})`;
  for (let index = 1; index < stops.length; index += 1) {
    if (value <= stops[index][0]) {
      const [lowTemp, lowColor] = stops[index - 1];
      const [highTemp, highColor] = stops[index];
      const fraction = (value - lowTemp) / (highTemp - lowTemp);
      return `rgb(${lowColor.map((channel, part) => Math.round(channel + (highColor[part] - channel) * fraction)).join(", ")})`;
    }
  }
  return `rgb(${stops[stops.length - 1][1].join(", ")})`;
};

const temperatureGradient = (low, high) => `linear-gradient(90deg, ${[0, 0.33, 0.66, 1].map((step) => `${temperatureColor(low + (high - low) * step)} ${Math.round(step * 100)}%`).join(", ")})`;

const localClock = (text) => {
  if (!text) return "—";
  const hours = Number(text.slice(11, 13));
  return `${hours % 12 || 12}:${text.slice(14, 16)} ${hours < 12 ? "AM" : "PM"}`;
};

const localHourLabel = (text) => {
  const hours = Number(text.slice(11, 13));
  return `${hours % 12 || 12} ${hours < 12 ? "AM" : "PM"}`;
};

const localWeekday = (dateText) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(`${dateText}T00:00:00Z`).getUTCDay()];

const localDateLabel = (dateText) => new Date(`${dateText}T00:00:00Z`).toLocaleDateString([], { timeZone: "UTC", weekday: "long", month: "short", day: "numeric" });

const utcToLocalText = (iso, offsetSeconds) => (iso ? new Date(Date.parse(iso) + offsetSeconds * 1000).toISOString().slice(0, 16) : null);

const durationText = (seconds) => `${Math.floor(seconds / 3600)}H ${Math.round((seconds % 3600) / 60)}M`;

const WindCompass = ({ direction, size = 84 }) => {
  const center = size / 2;
  const radius = size / 2 - 13;
  const ticks = Array.from({ length: 36 }, (_, index) => index * 10);
  const needle = radius - 7;
  return (
    <svg className="satWeatherSnapCompass" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={center} cy={center} r={radius} fill="#0d0f13" stroke="#323746" strokeWidth="2" />
      {ticks.map((angle) => {
        const major = angle % 90 === 0;
        const inner = radius - (major ? 7 : 4);
        const rad = (angle - 90) * Math.PI / 180;
        return <line key={angle} x1={center + Math.cos(rad) * inner} y1={center + Math.sin(rad) * inner} x2={center + Math.cos(rad) * (radius - 1)} y2={center + Math.sin(rad) * (radius - 1)} stroke={major ? "#919baf" : "#3d4354"} strokeWidth={major ? 2 : 1} />;
      })}
      {[["N", 0], ["E", 90], ["S", 180], ["W", 270]].map(([label, angle]) => {
        const rad = (angle - 90) * Math.PI / 180;
        return <text key={label} x={center + Math.cos(rad) * (radius + 8)} y={center + Math.sin(rad) * (radius + 8)} fill="#919baf" fontSize="9" fontWeight="800" textAnchor="middle" dominantBaseline="central">{label}</text>;
      })}
      {direction !== null && direction !== undefined && (
        <g transform={`rotate(${direction} ${center} ${center})`}>
          <line x1={center} y1={center - needle} x2={center} y2={center + needle - 7} stroke="#4ecdc4" strokeWidth="2.5" />
          <polygon points={`${center},${center + needle + 2} ${center - 5},${center + needle - 8} ${center + 5},${center + needle - 8}`} fill="#4ecdc4" />
          <circle cx={center} cy={center - needle} r="3" fill="#0d0f13" stroke="#4ecdc4" strokeWidth="2" />
        </g>
      )}
      <circle cx={center} cy={center} r="2.5" fill="#ebf0f8" />
    </svg>
  );
};

const MoonPhaseGlyph = ({ phase, size = 72 }) => {
  const radius = size / 2 - 2;
  const center = size / 2;
  const waxing = phase < 0.5;
  const terminator = Math.cos(phase * 2 * Math.PI) * radius;
  const litSweep = waxing ? 1 : 0;
  const innerSweep = waxing ? (phase < 0.25 ? 0 : 1) : (phase < 0.75 ? 0 : 1);
  const path = `M ${center} ${center - radius} A ${radius} ${radius} 0 0 ${litSweep} ${center} ${center + radius} A ${Math.abs(terminator)} ${radius} 0 0 ${innerSweep} ${center} ${center - radius} Z`;
  return (
    <svg className="satWeatherSnapMoonGlyph" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={center} cy={center} r={radius} fill="#23262f" stroke="#3d4354" strokeWidth="1" />
      {phase > 0.02 && phase < 0.98 && <path d={path} fill="#e6e9f0" />}
    </svg>
  );
};

const WORLDWIDE_KEY = "worldwide";

const CUSTOM_LOCATION_LABEL = "Custom Coordinates";

const PICKER_APPLE_ZOOM_THRESHOLD = 6;

const pickerZoomToSpan = (zoom) => 360 / Math.pow(2, zoom);

const pickerSpanToZoom = (span) => Math.max(0, Math.min(Math.log2(360 / Math.max(span, 0.0001)), 22));

const distanceMi = (lat1, lon1, lat2, lon2) => {
  const toRad = Math.PI / 180;
  const a = Math.sin(((lat2 - lat1) * toRad) / 2) ** 2 + Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(((lon2 - lon1) * toRad) / 2) ** 2;
  return 7917.6 * Math.asin(Math.min(1, Math.sqrt(a)));
};

const radiusZoom = (radiusMi, lat) => Math.max(3, Math.min(12, Math.log2((360 * 69 * Math.cos((lat * Math.PI) / 180)) / (radiusMi * 3))));

const projectMotion = (lat, lon, towardDeg, distanceNm) => {
  const rad = (towardDeg * Math.PI) / 180;
  return [lon + (distanceNm * Math.sin(rad)) / (60 * Math.max(0.05, Math.cos((lat * Math.PI) / 180))), lat + (distanceNm * Math.cos(rad)) / 60];
};

const trailDots = (paths, zoom, spacingPx) => {
  const step = (spacingPx * 360) / (256 * Math.pow(2, zoom));
  const dots = [];
  for (const item of paths) {
    const path = item.path;
    if (!path || path.length < 2) continue;
    let total = 0;
    const lengths = [];
    for (let i = 1; i < path.length; i += 1) {
      const scale = Math.cos((path[i][1] * Math.PI) / 180);
      const length = Math.hypot((path[i][0] - path[i - 1][0]) * scale, path[i][1] - path[i - 1][1]);
      lengths.push(length);
      total += length;
    }
    const count = Math.min(SOURCES.map.trailMaxDots, Math.max(2, Math.floor(total / step)));
    let segment = 0;
    let walked = 0;
    for (let n = 0; n <= count; n += 1) {
      const target = (total * n) / count;
      while (segment < lengths.length - 1 && walked + lengths[segment] < target) {
        walked += lengths[segment];
        segment += 1;
      }
      const t = lengths[segment] ? Math.min(1, (target - walked) / lengths[segment]) : 0;
      const a = path[segment];
      const b = path[segment + 1];
      dots.push({ item, position: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], progress: count ? n / count : 0 });
    }
  }
  return dots;
};

const trailLayer = (dk, shared, id, dots, getColor, options = {}) => {
  const { radius = 1.75, alpha = 200, fade = 0.6 } = options;
  return new dk.ScatterplotLayer({ ...shared, id, data: dots, getPosition: (d) => d.position, getRadius: radius, radiusUnits: "pixels", filled: true, stroked: false, getFillColor: (d) => [...getColor(d.item), Math.round(alpha * (1 - fade * d.progress))] });
};

const declutter = (map, items, getLngLat, getPriority, getBox) => {
  if (!map || items.length < 2) return items;
  const width = map.getCanvas().clientWidth;
  const height = map.getCanvas().clientHeight;
  const cellSize = 64;
  const cells = new Map();
  const kept = new Set();
  const ranked = items.map((item, index) => ({ item, index, priority: getPriority(item) })).sort((a, b) => b.priority - a.priority || a.index - b.index);
  for (const { item } of ranked) {
    const lngLat = getLngLat(item);
    if (!lngLat || !Number.isFinite(Number(lngLat[0])) || !Number.isFinite(Number(lngLat[1])) || Math.abs(Number(lngLat[1])) > 90) continue;
    const point = map.project(lngLat);
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
    if (point.x < -cellSize || point.y < -cellSize || point.x > width + cellSize || point.y > height + cellSize) {
      kept.add(item);
      continue;
    }
    const [dx0, dy0, dx1, dy1] = getBox(item);
    const box = [point.x + dx0, point.y + dy0, point.x + dx1, point.y + dy1];
    const keys = [];
    for (let cx = Math.floor(box[0] / cellSize); cx <= Math.floor(box[2] / cellSize); cx += 1) {
      for (let cy = Math.floor(box[1] / cellSize); cy <= Math.floor(box[3] / cellSize); cy += 1) keys.push(`${cx}:${cy}`);
    }
    const hit = keys.some((key) => (cells.get(key) || []).some((other) => box[0] < other[2] && box[2] > other[0] && box[1] < other[3] && box[3] > other[1]));
    if (hit) continue;
    keys.forEach((key) => {
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key).push(box);
    });
    kept.add(item);
  }
  return items.filter((item) => kept.has(item));
};

const labelBox = (text, offsetX) => [offsetX - 2, -8, offsetX + String(text || "").length * 6.2 + 8, 8];

const pointInRing = (lon, lat, ring) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

const pointInPolygons = (lon, lat, polygons) => (polygons || []).some((polygon) => polygon[0] && pointInRing(lon, lat, polygon[0]) && !polygon.slice(1).some((hole) => pointInRing(lon, lat, hole)));

const alertInArea = (alert, lat, lon, radiusMi) => {
  if (!alert.polygons || !alert.polygons.length) return false;
  if (alert.bbox) {
    const padLat = radiusMi / 69;
    const padLon = radiusMi / (69 * Math.max(0.1, Math.cos((lat * Math.PI) / 180)));
    if (lat + padLat < alert.bbox[1] || lat - padLat > alert.bbox[3] || lon + padLon < alert.bbox[0] || lon - padLon > alert.bbox[2]) return false;
  }
  if (pointInPolygons(lon, lat, alert.polygons)) return true;
  return alert.polygons.some((polygon) => (polygon[0] || []).some((point) => distanceMi(lat, lon, point[1], point[0]) <= radiusMi));
};

const alertMatchesFilter = (alert, filter) => {
  if (filter === "all") return true;
  if (filter === "severe") return SEVERE_EVENTS.has(alert.event);
  if (filter === "warnings") return /Warning$|Emergency$/.test(alert.event);
  return /Warning$|Watch$|Emergency$/.test(alert.event);
};

const hexToRgb = (hex) => {
  const value = String(hex || "").replace("#", "");
  if (value.length !== 6) return [192, 192, 192];
  return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)];
};

const reportStyle = (report) => REPORT_STYLES[report.type] || DEFAULT_REPORT_STYLE;

const TROPICAL_POINT_CLASSES = { D: "TD", S: "TS", H: "HU", M: "MH" };

const ICON_SCALE = 3;

const ICON_GLASS = "#0b0c0f";

const iconCache = new Map();

const colorHex = (color) => `#${color.slice(0, 3).map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`;

const makeIcon = (key, size, body) => {
  if (iconCache.has(key)) return iconCache.get(key);
  const pixels = size * ICON_SCALE;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${pixels}" height="${pixels}" viewBox="0 0 ${size} ${size}"><defs><filter id="g" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.1"/></filter></defs>${body}</svg>`;
  const icon = { id: key, url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, width: pixels, height: pixels, anchorX: pixels / 2, anchorY: pixels / 2 };
  iconCache.set(key, icon);
  return icon;
};

const glassShape = (shape, stroke, tint, width) => `<g filter="url(#g)" opacity="0.85">${shape.replace("/>", ` fill="#000" stroke="#000" stroke-width="${width + 2}" stroke-linejoin="round"/>`)}</g>${shape.replace("/>", ` fill="${ICON_GLASS}" fill-opacity="0.78"/>`)}${shape.replace("/>", ` fill="${stroke}" fill-opacity="${tint}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round"/>`)}`;

const iconLetter = (letter, size, color) => `<text x="${size / 2}" y="${size / 2}" dy="0.36em" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${(size * 0.42).toFixed(1)}" font-weight="700" fill="${color}">${letter}</text>`;

const reportIcon = (report, near) => {
  const style = reportStyle(report);
  const stroke = colorHex(style.color);
  const tornado = report.type === "T";
  if (!near) {
    const size = tornado ? 12 : 10;
    const c = size / 2;
    return makeIcon(`report-dot-${stroke}-${size}`, size, glassShape(`<circle cx="${c}" cy="${c}" r="${c - 2.25}"/>`, stroke, 0.35, 1.5));
  }
  const size = 22;
  return makeIcon(`report-badge-${stroke}-${style.letter}-${tornado ? 1 : 0}`, size, `${glassShape(`<circle cx="11" cy="11" r="7.5"/>`, stroke, 0.16, tornado ? 2 : 1.5)}${iconLetter(style.letter, size, stroke)}`);
};

const reportIconSize = (report, near) => (near ? 22 : report.type === "T" ? 12 : 10);

const stormShape = (cell) => {
  if (cell.tvs) return "tvs";
  if (cell.meso) return "meso";
  if (cell.maxSize) return "hail";
  return "cell";
};

const stormIcon = (cell) => {
  const shape = stormShape(cell);
  const stroke = colorHex(STORM_COLORS[cell.severity]);
  const size = 20;
  if (shape === "tvs") return makeIcon(`storm-tvs-${stroke}`, size, glassShape(`<path d="M4 5.5 L16 5.5 L10 16 Z"/>`, stroke, 0.3, 1.75));
  if (shape === "hail") return makeIcon(`storm-hail-${stroke}`, size, glassShape(`<path d="M10 4 L16 14.5 L4 14.5 Z"/>`, stroke, 0.24, 1.75));
  if (shape === "meso") return makeIcon(`storm-meso-${stroke}`, size, `${glassShape(`<circle cx="10" cy="10" r="6.25"/>`, stroke, 0.12, 1.75)}<circle cx="10" cy="10" r="2.5" fill="${stroke}" fill-opacity="0.85"/>`);
  return makeIcon(`storm-cell-${stroke}`, size, glassShape(`<circle cx="10" cy="10" r="4"/>`, stroke, 0.2, 1.5));
};

const stormIconSize = (cell, near) => {
  const base = stormShape(cell) === "cell" ? 16 : 20;
  return near ? base : Math.round(base * 0.8);
};

const anchorCache = new WeakMap();

const ringArea = (ring) => {
  let area = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) area += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  return area / 2;
};

const alertAnchor = (alert) => {
  if (anchorCache.has(alert)) return anchorCache.get(alert);
  let best = null;
  let bestArea = 0;
  for (const polygon of alert.polygons || []) {
    const ring = polygon && polygon[0];
    if (!ring || ring.length < 3) continue;
    const area = Math.abs(ringArea(ring));
    if (area >= bestArea) {
      bestArea = area;
      best = ring;
    }
  }
  let anchor = null;
  if (best) {
    const signed = ringArea(best);
    let x = 0;
    let y = 0;
    for (let i = 0, j = best.length - 1; i < best.length; j = i, i += 1) {
      const cross = best[j][0] * best[i][1] - best[i][0] * best[j][1];
      x += (best[j][0] + best[i][0]) * cross;
      y += (best[j][1] + best[i][1]) * cross;
    }
    anchor = signed ? [x / (6 * signed), y / (6 * signed)] : best[0];
    if (!pointInRing(anchor[0], anchor[1], best)) anchor = best.reduce((sum, point) => [sum[0] + point[0] / best.length, sum[1] + point[1] / best.length], [0, 0]);
  }
  anchorCache.set(alert, anchor);
  return anchor;
};

const liftColor = (hex) => {
  const color = hexToRgb(hex);
  return Math.max(...color) >= 180 ? colorHex(color) : colorHex(color.map((value) => value + (255 - value) * 0.45));
};

const warningIcon = (alert, strong) => {
  const stroke = liftColor(alert.color || "#c0c0c0");
  const code = WARNING_CODES[alert.event] || "WRN";
  const size = 28;
  return makeIcon(`warning-${code}-${stroke}-${strong ? 1 : 0}`, size, `${glassShape(`<circle cx="14" cy="14" r="10.5"/>`, stroke, strong ? 0.3 : 0.16, strong ? 2 : 1.5)}${iconLetter(code, size, stroke).replace(`font-size="${(size * 0.42).toFixed(1)}"`, 'font-size="7.5"')}`);
};

const tropicalIcon = (classification) => {
  const color = TROPICAL_COLORS[classification] || [170, 180, 200];
  const stroke = colorHex(color);
  const size = 30;
  const arms = "M15 9.5 C15 4.5 19.5 2 25 3 M15 20.5 C15 25.5 10.5 28 5 27";
  const halo = `<g filter="url(#g)" opacity="0.85"><path d="${arms}" fill="none" stroke="#000" stroke-width="4.5" stroke-linecap="round"/><circle cx="15" cy="15" r="7.5" fill="#000"/></g>`;
  const armPath = `<path d="${arms}" fill="none" stroke="${stroke}" stroke-width="2.25" stroke-linecap="round"/>`;
  const core = (tint) => `<circle cx="15" cy="15" r="5.75" fill="${ICON_GLASS}" fill-opacity="0.8"/><circle cx="15" cy="15" r="5.75" fill="${stroke}" fill-opacity="${tint}" stroke="${stroke}" stroke-width="2"/>`;
  if (classification === "HU" || classification === "MH") return makeIcon(`tropical-${classification}`, size, `${halo}${armPath}${core(0.55)}`);
  if (classification === "TS" || classification === "SS") return makeIcon(`tropical-${classification}`, size, `${halo}${armPath}${core(0.12)}`);
  return makeIcon(`tropical-${classification || "other"}`, size, `<g filter="url(#g)" opacity="0.85"><circle cx="15" cy="15" r="7.5" fill="#000"/></g>${core(0.12)}`);
};

const tropicalClassFromWind = (knots) => {
  if (!Number.isFinite(knots)) return null;
  if (knots >= 96) return "MH";
  if (knots >= 64) return "HU";
  if (knots >= 34) return "TS";
  return "TD";
};

const tropicalSegmentColor = (properties) => {
  const type = String(properties.STORMTYPE || "").toUpperCase();
  if (type === "HU" || type === "MH") return TROPICAL_COLORS[Number(properties.SS) >= 3 || type === "MH" ? "MH" : "HU"];
  return TROPICAL_COLORS[type] || [145, 155, 175];
};

const tropicalPointColor = (properties) => {
  const byWind = tropicalClassFromWind(Number(properties.MAXWIND));
  const byLabel = TROPICAL_POINT_CLASSES[String(properties.DVLBL || "").charAt(0).toUpperCase()];
  return TROPICAL_COLORS[byWind || byLabel] || TROPICAL_COLORS.PT;
};

const titleCaseName = (text) => String(text || "").toLowerCase().replace(/(^|[\s/(-])([a-z])/g, (match, lead, ch) => `${lead}${ch.toUpperCase()}`);

const threatLabel = (alert) => {
  if (!alert) return null;
  if (alert.threat === "emergency") return alert.event === "Tornado Warning" ? "Tornado Emergency" : alert.event === "Flash Flood Warning" ? "Flash Flood Emergency" : "Emergency";
  if (alert.threat === "considerable") return alert.event === "Tornado Warning" ? "Particularly Dangerous Situation" : "Considerable Damage Threat";
  return null;
};

const hazardSummary = (alert) => [
  alert.tornadoDetection ? `Tornado ${titleCaseName(alert.tornadoDetection)}` : null,
  alert.maxHail ? `${alert.maxHail}" Hail` : null,
  alert.maxWind ? `${String(alert.maxWind).replace(/MPH/i, "Mph")} Wind` : null,
  alert.floodThreat ? `${titleCaseName(alert.floodThreat)} Flood Threat` : null
].filter(Boolean).join(" | ");

const formatDuration = (seconds) => {
  if (seconds === null || seconds === undefined || !Number.isFinite(Number(seconds))) return "—";
  const total = Math.max(0, Math.round(Number(seconds)));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
};

const formatUntil = (iso) => {
  if (!iso) return "—";
  const ms = Date.parse(iso) - Date.now();
  if (!Number.isFinite(ms)) return "—";
  if (ms <= 0) return "Expired";
  return `In ${formatDuration(ms / 1000)}`;
};

const formatClock = (iso) => {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

const stormLabel = (cell) => `${cell.nexrad || ""} ${cell.storm || ""}`.trim() || "Storm Cell";
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


const formatNumber = (value, unit = "", digits = 0) => (value === null || value === undefined || isNaN(value) ? "—" : `${Number(value).toLocaleString(undefined, { maximumFractionDigits: digits })}${unit}`);

const formatCoords = (lat, lon) => (lat === null || lat === undefined || lon === null || lon === undefined ? "—" : `${Number(lat).toFixed(4)}°, ${Number(lon).toFixed(4)}°`);

const globeZoomAt = (lat) => Math.max(SOURCES.map.minZoomGlobe, SOURCES.map.globeZoom + Math.log2(Math.cos((Math.max(-80, Math.min(80, lat)) * Math.PI) / 180) / Math.cos((SOURCES.map.globeLatitude * Math.PI) / 180)));

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
        <div className="satFeedsEmpty satFeedsError">{error}</div>
      ) : loading && leads.length === 0 ? (
        <div className="satFeedsEmpty">Loading Leads</div>
      ) : (
        <FeedsTable columns={["Lead", "Kind", "Hits", "Last Seen", ""]} widths={["auto", "124px", "56px", "88px", "140px"]} rows={rows} emptyText={needle ? "No leads match that text." : "No leads match this filter."} />
      )}
    </FeedsModal>
  );
};

const fetchApi = async (key, params) => {
  const query = params ? `?${new URLSearchParams(params).toString()}` : "";
  const response = await fetch(`${apiUrl(key)}${query}`);
  const data = await response.json().catch(() => null);
  if (!data) throw new Error(`The server returned an unreadable response with status ${response.status}`);
  if (!response.ok || !data.success) throw new Error(data.message || `The server returned status ${response.status}`);
  return data;
};

const layerKey = (url) => {
  let hash = 0;
  for (const char of String(url)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash.toString(36);
};

const firstLayerAfter = (map, prefixes) => {
  const layers = (map.getStyle() && map.getStyle().layers) || [];
  for (const prefix of prefixes) {
    const match = layers.find((layer) => layer.id.startsWith(prefix));
    if (match) return match.id;
  }
  return map.getLayer("labels-layer") ? "labels-layer" : undefined;
};

const syncRasterLayers = (map, registry, prefix, items, beforePrefixes, paint) => {
  const wanted = new Map(items.map((item) => [`${prefix}${layerKey(item.url)}`, item]));
  for (const id of Array.from(registry)) {
    if (wanted.has(id)) continue;
    if (map.getLayer(id)) map.removeLayer(id);
    if (map.getSource(id)) map.removeSource(id);
    registry.delete(id);
  }
  for (const [id, item] of wanted.entries()) {
    if (registry.has(id)) continue;
    map.addSource(id, { type: "raster", tiles: [item.url], tileSize: item.tileSize || 256, maxzoom: item.maxZoom || 10, minzoom: 0, attribution: item.attribution || undefined });
    map.addLayer({ id, type: "raster", source: id, minzoom: item.minZoom || 0, paint: { "raster-opacity": 0, "raster-fade-duration": 0, ...paint } }, firstLayerAfter(map, beforePrefixes));
    registry.add(id);
  }
  return Array.from(wanted.keys());
};

const WeatherTracker = () => {
  const navigate = useNavigate();
  const { token, loading: authLoading } = useAuth();

  const [harvestHealth, setHarvestHealth] = useState(null);
  const [harvestHealthError, setHarvestHealthError] = useState(null);
  const [harvestObjects, setHarvestObjects] = useState(0);
  const [censusFrames, setCensusFrames] = useState(null);
  const [warningFrames, setWarningFrames] = useState(null);
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
    Promise.all([count(SOURCES.harvest.censusProduct), count(SOURCES.harvest.warningProduct)]).then(([census, warnings]) => {
      if (cancelled) return;
      setCensusFrames(census);
      setWarningFrames(warnings);
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
  const [refreshInterval, setRefreshInterval] = useState(60000);
  const [layerVisibility, setLayerVisibility] = useState(DEFAULT_LAYERS);
  const [globeMode, setGlobeMode] = useState(false);
  const [monochrome, setMonochrome] = useState(false);
  const [radarProduct, setRadarProduct] = useState("composite");
  const [radarSite, setRadarSite] = useState(null);
  const [radarOpacity, setRadarOpacity] = useState(0.8);
  const [satelliteChannel, setSatelliteChannel] = useState("ch13");
  const [rainfallPeriod, setRainfallPeriod] = useState("p24h");
  const [outlookKind, setOutlookKind] = useState("categorical");
  const [alertFilter, setAlertFilter] = useState("warningsWatches");
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(500);
  const [radarData, setRadarData] = useState(null);
  const [radarError, setRadarError] = useState(null);
  const [sites, setSites] = useState([]);
  const [sitesError, setSitesError] = useState(null);
  const [overlays, setOverlays] = useState(null);
  const [overlaysError, setOverlaysError] = useState(null);
  const [alertsData, setAlertsData] = useState(null);
  const [alertsError, setAlertsError] = useState(null);
  const [stormsData, setStormsData] = useState(null);
  const [stormsError, setStormsError] = useState(null);
  const [reportsData, setReportsData] = useState(null);
  const [reportsError, setReportsError] = useState(null);
  const [outlookData, setOutlookData] = useState(null);
  const [outlookError, setOutlookError] = useState(null);
  const [tropicalData, setTropicalData] = useState(null);
  const [tropicalError, setTropicalError] = useState(null);
  const [pointData, setPointData] = useState(null);
  const [pointError, setPointError] = useState(null);
  const [snapshotData, setSnapshotData] = useState(null);
  const [snapshotError, setSnapshotError] = useState(null);
  const [snapshotAnalysis, setSnapshotAnalysis] = useState({ data: null, loading: false, error: null });
  const [healthData, setHealthData] = useState(null);
  const [censusHistory, setCensusHistory] = useState([]);
  const [warningLog, setWarningLog] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(WORLDWIDE_KEY);
  const [customLocationLabel, setCustomLocationLabel] = useState(null);
  const [orgid] = useState(localStorage.getItem("orgid") || "default_org");
  const [username] = useState(localStorage.getItem("username") || "default_user");
  const [areas, setAreas] = useState([]);
  const [selectedAreaId, setSelectedAreaId] = useState(null);
  const [editingAreaId, setEditingAreaId] = useState(null);
  const [areaFilterActive, setAreaFilterActive] = useState(false);
  const [areaFormData, setAreaFormData] = useState({ ...INITIAL_AREA_FORM });
  const [isGeocodingArea, setIsGeocodingArea] = useState(false);
  const [areaModalOpen, setAreaModalOpen] = useState(false);
  const [areaPointAlerts, setAreaPointAlerts] = useState({});
  const [pointAlertList, setPointAlertList] = useState([]);
  const [areaPointStatus, setAreaPointStatus] = useState(null);
  const [areasLoaded, setAreasLoaded] = useState(false);
  const [pointWaitOver, setPointWaitOver] = useState(false);
  const pointRequestRef = useRef(0);
  const pointAppliedRef = useRef(0);
  const mountedRef = useRef(true);
  const [stateRestored, setStateRestored] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [apiSuccess, setApiSuccess] = useState(null);
  const [locationQuery, setLocationQuery] = useState("");
  const [locationResults, setLocationResults] = useState([]);
  const [locationSearchStatus, setLocationSearchStatus] = useState("");
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [areaRadius, setAreaRadius] = useState(100);
  const [layoutVisibility, setLayoutVisibility] = useState(DEFAULT_LAYOUT);
  const [expandedView, setExpandedView] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [viewState, setViewState] = useState({ lat: SOURCES.map.center[1], lon: SOURCES.map.center[0], zoom: SOURCES.map.zoom, bounds: null });
  const [selected, setSelected] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [selectedError, setSelectedError] = useState(null);
  const [hoverInfo, setHoverInfo] = useState(null);
  const [latency, setLatency] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const libsRef = useRef(null);
  const viewRef = useRef(null);
  const deckglMapRef = useRef(null);
  const overlayRef = useRef(null);
  const mapContainerRef = useRef(null);
  const mapHostRef = useRef(null);
  const radarLayersRef = useRef(new Set());
  const radarOrderRef = useRef([]);
  const satelliteLayersRef = useRef(new Set());
  const rainfallLayersRef = useRef(new Set());
  const tabContentRef = useRef(null);
  const locationRef = useRef(null);
  const radarSeriesRef = useRef(null);
  const playingRef = useRef(false);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    if (!authLoading && !token) navigate("/login");
  }, [authLoading, token, navigate]);


  useEffect(() => {
    if (!expandedView) return undefined;
    const handleKey = (event) => { if (event.key === "Escape") setExpandedView(null); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [expandedView]);

  const locationActive = selectedLocation !== WORLDWIDE_KEY;
  const locationName = customLocationLabel && customLocationLabel.key === selectedLocation ? customLocationLabel.label : CUSTOM_LOCATION_LABEL;
  const [selectedLat, selectedLon] = locationActive ? selectedLocation.split(",").map(Number) : [null, null];

  useEffect(() => {
    locationRef.current = locationActive ? { lat: selectedLat, lon: selectedLon, radius: areaRadius } : null;
  }, [locationActive, selectedLat, selectedLon, areaRadius]);

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

  const referencePoint = locationActive ? { lat: selectedLat, lon: selectedLon } : { lat: viewState.lat, lon: viewState.lon };

  const sortedSites = useMemo(() => sites.map((site) => ({ ...site, distance: distanceMi(referencePoint.lat, referencePoint.lon, site.lat, site.lon) })).sort((a, b) => a.distance - b.distance), [sites, referencePoint.lat, referencePoint.lon]);

  const siteLabel = (site) => (site ? `${site.id} | ${titleCaseName(site.name)}` : "");

  const singleSite = SINGLE_SITE_PRODUCTS.has(radarProduct);

  const loadSites = useCallback(async () => {
    try {
      const data = await fetchApi("sites");
      setSites(data.sites || []);
      setSitesError(null);
    } catch (error) {
      setSitesError(`The radar site list could not be loaded because of the error "${errorText(error)}".`);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !token) return;
    if ((singleSite || layerVisibility.sites) && !sites.length) loadSites();
  }, [authLoading, token, singleSite, layerVisibility.sites, sites.length, loadSites]);

  useEffect(() => {
    if (singleSite && !radarSite && sortedSites.length) setRadarSite(sortedSites[0].id);
  }, [singleSite, sortedSites, radarSite]);

  useEffect(() => {
    if (!locationActive || !sites.length) return;
    const nearest = sites.map((site) => ({ id: site.id, distance: distanceMi(selectedLat, selectedLon, site.lat, site.lon) })).sort((a, b) => a.distance - b.distance)[0];
    if (nearest) setRadarSite(nearest.id);
    const inConus = selectedLat >= 20 && selectedLat <= 55 && selectedLon >= -130 && selectedLon <= -60;
    setRadarProduct((current) => (current === "composite" && !inConus ? "global" : current === "global" && inConus ? "composite" : current));
  }, [locationActive, selectedLat, selectedLon, sites]);

  const loadRadar = useCallback(async () => {
    if (SINGLE_SITE_PRODUCTS.has(radarProduct) && !radarSite) return;
    const started = performance.now();
    try {
      const params = { product: radarProduct };
      if (SINGLE_SITE_PRODUCTS.has(radarProduct)) params.site = radarSite;
      const data = await fetchApi("radar", params);
      const series = `${data.product}|${data.radar || ""}`;
      if (radarSeriesRef.current !== series || !playingRef.current) setFrameIndex(data.frames.length - 1);
      radarSeriesRef.current = series;
      setRadarData(data);
      setRadarError(null);
      setLatency(Math.round(performance.now() - started));
    } catch (error) {
      setRadarError(`The radar frames could not be loaded because of the error "${errorText(error)}".`);
    }
  }, [radarProduct, radarSite]);

  useEffect(() => {
    if (authLoading || !token || !layerVisibility.radar) return undefined;
    loadRadar();
    if (!autoRefresh) return undefined;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") loadRadar();
    }, Math.min(refreshInterval, SOURCES.refresh.radarMs));
    return () => clearInterval(timer);
  }, [authLoading, token, layerVisibility.radar, autoRefresh, refreshInterval, loadRadar]);

  const loadOverlays = useCallback(async () => {
    try {
      const data = await fetchApi("overlays");
      setOverlays(data);
      setOverlaysError(null);
    } catch (error) {
      setOverlaysError(`The satellite and rainfall layers could not be loaded because of the error "${errorText(error)}".`);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !token || !(layerVisibility.satellite || layerVisibility.rainfall)) return undefined;
    loadOverlays();
    const timer = setInterval(loadOverlays, SOURCES.refresh.overlaysMs);
    return () => clearInterval(timer);
  }, [authLoading, token, layerVisibility.satellite, layerVisibility.rainfall, loadOverlays]);

  const loadAlerts = useCallback(async () => {
    const started = performance.now();
    try {
      const data = await fetchApi("alerts");
      setAlertsData(data);
      setAlertsError(data.error ? `The alert list may be stale because the last refresh failed with the error "${String(data.error).replace(/\.$/, "")}".` : null);
      setLatency(Math.round(performance.now() - started));
    } catch (error) {
      setAlertsError(`The active alerts could not be loaded because of the error "${errorText(error)}".`);
    }
  }, []);

  const soundsEnabledRef = useRef(false);

  const hasPendingZones = Boolean(alertsData && alertsData.pendingZones > 0);

  useEffect(() => {
    if (authLoading || !token) return undefined;
    loadAlerts();
    if (!autoRefresh) return undefined;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible" || soundsEnabledRef.current) loadAlerts();
    }, hasPendingZones ? SOURCES.refresh.pendingZonesMs : refreshInterval);
    return () => clearInterval(timer);
  }, [authLoading, token, autoRefresh, refreshInterval, hasPendingZones, loadAlerts]);

  const loadStorms = useCallback(async () => {
    try {
      const data = await fetchApi("storms");
      setStormsData(data);
      setStormsError(data.error ? `The storm cells may be stale because the last refresh failed with the error "${String(data.error).replace(/\.$/, "")}".` : null);
    } catch (error) {
      setStormsError(`The storm cells could not be loaded because of the error "${errorText(error)}".`);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !token) return undefined;
    loadStorms();
    if (!autoRefresh) return undefined;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") loadStorms();
    }, Math.max(refreshInterval, SOURCES.refresh.stormsMs));
    return () => clearInterval(timer);
  }, [authLoading, token, autoRefresh, refreshInterval, loadStorms]);

  const loadReports = useCallback(async () => {
    try {
      const data = await fetchApi("reports");
      setReportsData(data);
      setReportsError(data.error ? `The storm reports may be stale because the last refresh failed with the error "${String(data.error).replace(/\.$/, "")}".` : null);
    } catch (error) {
      setReportsError(`The storm reports could not be loaded because of the error "${errorText(error)}".`);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !token) return undefined;
    loadReports();
    if (!autoRefresh) return undefined;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") loadReports();
    }, Math.max(refreshInterval, SOURCES.refresh.reportsMs));
    return () => clearInterval(timer);
  }, [authLoading, token, autoRefresh, refreshInterval, loadReports]);

  const loadOutlook = useCallback(async () => {
    try {
      const data = await fetchApi("outlooks", { kind: outlookKind });
      setOutlookData(data);
      setOutlookError(null);
    } catch (error) {
      setOutlookError(`The convective outlook could not be loaded because of the error "${errorText(error)}".`);
    }
  }, [outlookKind]);

  useEffect(() => {
    if (authLoading || !token || !layerVisibility.outlook) return undefined;
    loadOutlook();
    const timer = setInterval(loadOutlook, SOURCES.refresh.outlooksMs);
    return () => clearInterval(timer);
  }, [authLoading, token, layerVisibility.outlook, loadOutlook]);

  const loadTropical = useCallback(async () => {
    try {
      const data = await fetchApi("tropical");
      setTropicalData(data);
      setTropicalError(null);
    } catch (error) {
      setTropicalError(`The tropical cyclones could not be loaded because of the error "${errorText(error)}".`);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !token) return undefined;
    loadTropical();
    const timer = setInterval(loadTropical, SOURCES.refresh.tropicalMs);
    return () => clearInterval(timer);
  }, [authLoading, token, loadTropical]);

  const loadPoint = useCallback(async () => {
    const location = locationRef.current;
    if (!location) {
      setPointData(null);
      return;
    }
    try {
      const data = await fetchApi("point", { lat: location.lat.toFixed(4), lon: location.lon.toFixed(4) });
      setPointData(data);
      setPointError(null);
    } catch (error) {
      setPointError(`The local forecast could not be loaded because of the error "${errorText(error)}".`);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !token) return undefined;
    setPointData(null);
    if (!locationActive) return undefined;
    loadPoint();
    const timer = setInterval(loadPoint, SOURCES.refresh.pointMs);
    return () => clearInterval(timer);
  }, [authLoading, token, locationActive, selectedLat, selectedLon, loadPoint]);

  const loadHealth = useCallback(async () => {
    try {
      const response = await fetch(apiUrl("health"));
      const data = await response.json().catch(() => null);
      if (response.ok && data && data.success) setHealthData(data);
    } catch (error) {
      return;
    }
  }, []);

  useEffect(() => {
    if (authLoading || !token) return undefined;
    loadHealth();
    const timer = setInterval(loadHealth, SOURCES.refresh.healthMs);
    return () => clearInterval(timer);
  }, [authLoading, token, loadHealth]);

  const loadHistory = useCallback(async () => {
    const from = new Date(Date.now() - SOURCES.harvest.historyDays * 86400000).toISOString();
    const frames = (key, params) => fetch(`${SOURCES.harvest.base}/products/${encodeURIComponent(key)}/frames?${new URLSearchParams({ from, ...params }).toString()}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => (data && data.frames ? data.frames : []))
      .catch(() => []);
    const [census, warnings] = await Promise.all([
      frames(SOURCES.harvest.censusProduct, { step: String(SOURCES.harvest.historyStepSeconds), limit: "400" }),
      frames(SOURCES.harvest.warningProduct, { limit: "300" })
    ]);
    setCensusHistory(census);
    setWarningLog(warnings.slice().reverse());
  }, []);

  useEffect(() => {
    if (activeTab === "overview") loadHistory();
  }, [activeTab, loadHistory, censusFrames]);

  const setView = useCallback((next) => {
    viewRef.current = next;
    setViewState(next);
  }, []);

  const updateViewFromMap = useCallback(() => {
    const map = deckglMapRef.current;
    if (!map) return;
    const center = map.getCenter();
    const bounds = map.getBounds();
    setView({ lat: center.lat, lon: normalizeLon(center.lng), zoom: map.getZoom(), bounds: { west: bounds.getWest(), east: bounds.getEast(), south: bounds.getSouth(), north: bounds.getNorth() } });
  }, [setView]);

  const initMap = useCallback(() => {
    const libs = libsRef.current;
    if (!mapHostRef.current || !libs) return null;
    const { maplibregl } = libs;
    const map = new maplibregl.Map({
      container: mapHostRef.current,
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
    map.addControl(new maplibregl.ScaleControl({ unit: "imperial" }), "bottom-left");
    map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: SOURCES.attributions }), "bottom-right");
    map.on("moveend", updateViewFromMap);
    return map;
  }, [updateViewFromMap]);

  useEffect(() => {
    if (authLoading || !token || !mapContainerRef.current) return undefined;
    let cancelled = false;
    let observer = null;
    const host = mapContainerRef.current;
    const claimWheel = (event) => { event.preventDefault(); };
    host.addEventListener("wheel", claimWheel, { passive: false, capture: true });
    const div = document.createElement("div");
    Object.assign(div.style, { width: "100%", height: "100%", position: "absolute", top: "0", left: "0" });
    host.appendChild(div);
    mapHostRef.current = div;
    loadMapDeps().then((libs) => {
      libsRef.current = libs;
      if (cancelled) return;
      const map = initMap();
      if (!map) throw new Error("The MapLibre map could not be created.");
      deckglMapRef.current = map;
      if (typeof ResizeObserver !== "undefined") {
        observer = new ResizeObserver(() => {
          if (deckglMapRef.current) deckglMapRef.current.resize();
        });
        observer.observe(host);
      }
      const onReady = () => {
        if (cancelled) return;
        const overlay = new libs.deck.MapboxOverlay({ interleaved: true, layers: [] });
        map.addControl(overlay);
        overlayRef.current = overlay;
        let tileFailures = 0;
        map.on("error", (event) => {
          const source = String((event && event.sourceId) || "");
          if (!source.startsWith("wx-radar-")) return;
          tileFailures += 1;
          if (tileFailures >= SOURCES.map.radarTileFailureLimit) setRadarError(`${tileFailures} radar tiles in a row could not be loaded from the Iowa Environmental Mesonet, so the radar may be incomplete.`);
        });
        map.on("sourcedata", (event) => {
          if (!event || !event.tile || !String(event.sourceId || "").startsWith("wx-radar-")) return;
          if (tileFailures >= SOURCES.map.radarTileFailureLimit) setRadarError(null);
          tileFailures = 0;
        });
        updateViewFromMap();
        setMapReady(true);
      };
      if (map.loaded()) onReady();
      else map.on("load", onReady);
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
      if (deckglMapRef.current) {
        try {
          deckglMapRef.current.remove();
        } catch (error) {
          deckglMapRef.current = null;
        }
      }
      deckglMapRef.current = null;
      radarLayersRef.current = new Set();
      satelliteLayersRef.current = new Set();
      rainfallLayersRef.current = new Set();
      host.removeEventListener("wheel", claimWheel, { capture: true });
      host.innerHTML = "";
      mapHostRef.current = null;
      setMapReady(false);
    };
  }, [authLoading, token, initMap, updateViewFromMap]);

  useEffect(() => {
    if (activeTab === "map" && mapReady && deckglMapRef.current) deckglMapRef.current.resize();
  }, [activeTab, mapReady]);

  const navigateTo = useCallback((lon, lat, zoom) => {
    if (deckglMapRef.current) deckglMapRef.current.flyTo({ center: [lon, lat], zoom, bearing: 0, pitch: 0, speed: 1.4 });
  }, []);

  const fitBox = useCallback((bbox) => {
    const map = deckglMapRef.current;
    if (!map || !bbox) return;
    try {
      map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: 80, maxZoom: SOURCES.map.focusZoom + 1, duration: 900 });
    } catch (error) {
      navigateTo((bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2, SOURCES.map.focusZoom);
    }
  }, [navigateTo]);

  const userArea = useMemo(() => areas.find((area) => area.area_id === selectedAreaId) || null, [areas, selectedAreaId]);
  const activeAreas = areaFilterActive && areas.length ? areas : null;
  const activeAreasLabel = activeAreas ? (activeAreas.length === 1 ? describeArea(activeAreas[0]) : `My ${activeAreas.length} Areas`) : null;

  const snapshotTarget = useMemo(() => {
    if (locationActive) return { lat: selectedLat, lon: selectedLon, label: locationName };
    if (!userArea) return null;
    const lat = userArea.mode === "point_radius" ? Number(userArea.latitude) : (Number(userArea.min_lat) + Number(userArea.max_lat)) / 2;
    const lon = userArea.mode === "point_radius" ? Number(userArea.longitude) : (Number(userArea.min_lng) + Number(userArea.max_lng)) / 2;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { lat, lon, label: userArea.name && userArea.name.trim() ? userArea.name.trim() : describeArea(userArea) };
  }, [locationActive, selectedLat, selectedLon, locationName, userArea]);
  const snapshotTargetRef = useRef(null);
  snapshotTargetRef.current = snapshotTarget;
  const snapshotLat = snapshotTarget ? snapshotTarget.lat : null;
  const snapshotLon = snapshotTarget ? snapshotTarget.lon : null;

  const loadSnapshot = useCallback(async () => {
    const target = snapshotTargetRef.current;
    if (!target) {
      setSnapshotData(null);
      return;
    }
    try {
      const data = await fetchApi("snapshot", { lat: target.lat.toFixed(4), lon: target.lon.toFixed(4) });
      const latest = snapshotTargetRef.current;
      if (!latest || latest.lat !== target.lat || latest.lon !== target.lon) return;
      setSnapshotData(data);
      setSnapshotError(null);
    } catch (error) {
      setSnapshotError(`The local weather could not be loaded because of the error "${errorText(error)}".`);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !token) return undefined;
    setSnapshotData(null);
    setSnapshotError(null);
    if (snapshotLat === null || activeTab !== "snapshot") return undefined;
    loadSnapshot();
    const timer = setInterval(loadSnapshot, SOURCES.refresh.snapshotMs);
    return () => clearInterval(timer);
  }, [authLoading, token, snapshotLat, snapshotLon, activeTab, loadSnapshot]);

  const snapshotAnalysisKeyRef = useRef(null);

  useEffect(() => {
    if (!snapshotData || activeTab !== "snapshot" || snapshotLat === null) return undefined;
    const key = `${snapshotLat.toFixed(4)},${snapshotLon.toFixed(4)}|${snapshotData.updatedAt}`;
    if (snapshotAnalysisKeyRef.current === key) return undefined;
    snapshotAnalysisKeyRef.current = key;
    let cancelled = false;
    setSnapshotAnalysis((current) => ({ ...current, loading: true, error: null }));
    fetchApi("snapshotAnalysis", { lat: snapshotLat.toFixed(4), lon: snapshotLon.toFixed(4) })
      .then((data) => {
        if (!cancelled) setSnapshotAnalysis({ data: data.analysis, loading: false, error: null });
      })
      .catch((error) => {
        if (!cancelled) setSnapshotAnalysis((current) => ({ data: current.data, loading: false, error: `The AI briefing is unavailable because of the error "${errorText(error)}".` }));
      });
    return () => {
      cancelled = true;
      if (snapshotAnalysisKeyRef.current === key) snapshotAnalysisKeyRef.current = null;
    };
  }, [snapshotData, activeTab, snapshotLat, snapshotLon]);

  useEffect(() => {
    setSnapshotAnalysis({ data: null, loading: false, error: null });
  }, [snapshotLat, snapshotLon]);

  useEffect(() => {
    if (!snapshotData || !snapshotData.averagesPending || activeTab !== "snapshot") return undefined;
    const timer = setTimeout(loadSnapshot, SOURCES.refresh.snapshotRetryMs);
    return () => clearTimeout(timer);
  }, [snapshotData, activeTab, loadSnapshot]);

  const pointInActiveAreas = useCallback((lat, lon) => Boolean(activeAreas) && activeAreas.some((area) => isPointInArea(lat, lon, area)), [activeAreas]);
  const alertMatchesArea = useCallback((alert, area) => alertInMonitoredArea(alert, area) || Boolean(areaPointAlerts[area.area_id] && areaPointAlerts[area.area_id].has(alert.id)), [areaPointAlerts]);
  const alertInActiveAreas = useCallback((alert) => Boolean(activeAreas) && activeAreas.some((area) => alertMatchesArea(alert, area)), [activeAreas, alertMatchesArea]);

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

  useEffect(() => {
    if (!areas.length) {
      setAreaPointAlerts({});
      setPointAlertList([]);
      setAreaPointStatus(null);
      return undefined;
    }
    const requestId = pointRequestRef.current + 1;
    pointRequestRef.current = requestId;
    const stale = () => !mountedRef.current || requestId < pointAppliedRef.current;
    const centers = areas.map((area) => ({ id: area.area_id, lat: area.mode === "point_radius" ? area.latitude : (area.min_lat + area.max_lat) / 2, lon: area.mode === "point_radius" ? area.longitude : (area.min_lng + area.max_lng) / 2 }));
    const key = (center) => `${Number(center.lat.toFixed(4))},${Number(center.lon.toFixed(4))}`;
    fetchApi("alertPoints", { points: centers.map(key).join(";") })
      .then((data) => {
        if (stale()) return;
        pointAppliedRef.current = requestId;
        const next = {};
        const found = new Map();
        for (const center of centers) {
          const list = (data.points && data.points[key(center)]) || [];
          next[center.id] = new Set(list.map((alert) => (typeof alert === "string" ? alert : alert.id)));
          for (const alert of list) if (alert && typeof alert === "object" && !found.has(alert.id)) found.set(alert.id, alert);
        }
        setAreaPointAlerts(next);
        setPointAlertList(Array.from(found.values()));
        setAreaPointStatus({ at: Date.now(), error: data.error || null });
      })
      .catch((error) => {
        if (stale()) return;
        pointAppliedRef.current = requestId;
        setAreaPointStatus({ at: Date.now(), error: errorText(error) });
      });
    return undefined;
  }, [areas, alertsData]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!areasLoaded || !alertsData || pointWaitOver) return undefined;
    const timer = setTimeout(() => setPointWaitOver(true), SOURCES.sounds.pointCheckWaitSeconds * 1000);
    return () => clearTimeout(timer);
  }, [areasLoaded, alertsData, pointWaitOver]);

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
    if (!mapReady || !map) return undefined;
    try {
      map.setMinZoom(globeMode ? SOURCES.map.minZoomGlobe : SOURCES.map.minZoom);
      if (globeMode && map.getZoom() > globeZoomAt(map.getCenter().lat)) {
        map.stop();
        map.jumpTo({ zoom: globeZoomAt(map.getCenter().lat) });
      }
      if (typeof map.setProjection === "function") map.setProjection({ type: globeMode ? "globe" : "mercator" });
    } catch (error) {
      setMapError(`The globe view could not be switched because of the error "${errorText(error)}".`);
    }
    return undefined;
  }, [mapReady, globeMode]);

  const [globeCenter, setGlobeCenter] = useState(null);
  useEffect(() => {
    const map = deckglMapRef.current;
    if (!mapReady || !map || !globeMode) { setGlobeCenter(null); return undefined; }
    let frame = null;
    const update = () => { frame = null; const center = map.getCenter(); setGlobeCenter({ lat: center.lat, lon: center.lng }); };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    map.on("move", schedule);
    return () => { map.off("move", schedule); if (frame) cancelAnimationFrame(frame); };
  }, [mapReady, globeMode]);

  useEffect(() => {
    const map = deckglMapRef.current;
    if (!mapReady || !map) return;
    try {
      for (const layer of ["satellite-layer", "labels-layer"]) {
        map.setPaintProperty(layer, "raster-saturation", monochrome ? -1 : 0);
        map.setPaintProperty(layer, "raster-contrast", monochrome ? 0.15 : 0);
        map.setPaintProperty(layer, "raster-brightness-max", monochrome ? 0.8 : 1);
      }
    } catch (error) {
      setMapError(`The monochrome view could not be switched because of the error "${errorText(error)}".`);
    }
  }, [mapReady, monochrome]);

  useEffect(() => {
    const map = deckglMapRef.current;
    if (!mapReady || !map) return;
    try {
      const frames = layerVisibility.radar && radarData ? radarData.frames.map((frame) => ({ url: frame.url, tileSize: radarData.tileSize, maxZoom: radarData.maxZoom, attribution: radarData.attribution })) : [];
      radarOrderRef.current = syncRasterLayers(map, radarLayersRef.current, "wx-radar-", frames, [], { "raster-resampling": "nearest" });
    } catch (error) {
      setMapError(`The radar layers could not be drawn because of the error "${errorText(error)}".`);
    }
  }, [mapReady, radarData, layerVisibility.radar]);

  useEffect(() => {
    const map = deckglMapRef.current;
    if (!mapReady || !map) return;
    try {
      radarOrderRef.current.forEach((id, index) => {
        if (map.getLayer(id)) map.setPaintProperty(id, "raster-opacity", index === frameIndex ? radarOpacity : 0);
      });
    } catch (error) {
      setMapError(`The radar frame could not be shown because of the error "${errorText(error)}".`);
    }
  }, [mapReady, radarData, layerVisibility.radar, frameIndex, radarOpacity]);

  useEffect(() => {
    const map = deckglMapRef.current;
    if (!mapReady || !map) return;
    try {
      const channel = overlays && overlays.satellite ? overlays.satellite[satelliteChannel] : null;
      const items = layerVisibility.satellite && channel ? channel.layers.map((item) => ({ url: item.url, maxZoom: item.maxZoom, minZoom: item.minZoom, attribution: overlays.attribution })) : [];
      const ids = syncRasterLayers(map, satelliteLayersRef.current, "wx-sat-", items, ["wx-rain-", "wx-radar-"], {});
      ids.forEach((id) => map.setPaintProperty(id, "raster-opacity", SOURCES.map.satelliteOpacity));
      const period = overlays && overlays.rainfall ? overlays.rainfall[rainfallPeriod] : null;
      const rain = layerVisibility.rainfall && period ? period.layers.map((item) => ({ url: item.url, maxZoom: item.maxZoom, minZoom: item.minZoom, attribution: overlays.attribution })) : [];
      const rainIds = syncRasterLayers(map, rainfallLayersRef.current, "wx-rain-", rain, ["wx-radar-"], {});
      rainIds.forEach((id) => map.setPaintProperty(id, "raster-opacity", SOURCES.map.rainfallOpacity));
    } catch (error) {
      setMapError(`The satellite or rainfall layer could not be drawn because of the error "${errorText(error)}".`);
    }
  }, [mapReady, overlays, satelliteChannel, rainfallPeriod, layerVisibility.satellite, layerVisibility.rainfall]);

  const frames = radarData && layerVisibility.radar ? radarData.frames : [];
  const currentFrame = frames[Math.min(frameIndex, frames.length - 1)] || null;

  useEffect(() => {
    if (!playing || frames.length < 2) return undefined;
    const last = frames.length - 1;
    const delay = frameIndex === last ? playbackSpeed * SOURCES.playback.dwellFrames : playbackSpeed;
    const timer = setTimeout(() => setFrameIndex((index) => (index >= last ? 0 : index + 1)), delay);
    return () => clearTimeout(timer);
  }, [playing, frameIndex, frames.length, playbackSpeed]);

  useEffect(() => {
    if (frames.length && frameIndex > frames.length - 1) setFrameIndex(frames.length - 1);
  }, [frames.length, frameIndex]);
  const alerts = alertsData ? alertsData.alerts || [] : [];
  const cells = stormsData ? stormsData.cells || [] : [];
  const reports = reportsData ? reportsData.reports || [] : [];
  const tropicalStorms = tropicalData ? tropicalData.storms || [] : [];
  const tropicalFeatures = tropicalData ? tropicalData.features || [] : [];

  const allAlerts = useMemo(() => {
    if (!pointAlertList.length) return alerts;
    const known = new Set(alerts.map((alert) => alert.id));
    const extra = pointAlertList.filter((alert) => !known.has(alert.id));
    return extra.length ? [...alerts, ...extra] : alerts;
  }, [alerts, pointAlertList]);

  const filteredAlerts = useMemo(() => alerts.filter((alert) => alertMatchesFilter(alert, alertFilter)), [alerts, alertFilter]);

  const areaAlerts = useMemo(() => {
    if (activeAreas) return allAlerts.filter(alertInActiveAreas);
    return locationActive ? alerts.filter((alert) => alertInArea(alert, selectedLat, selectedLon, areaRadius)) : alerts;
  }, [alerts, allAlerts, activeAreas, alertInActiveAreas, locationActive, selectedLat, selectedLon, areaRadius]);

  const areaFilteredAlerts = useMemo(() => areaAlerts.filter((alert) => alertMatchesFilter(alert, alertFilter)), [areaAlerts, alertFilter]);

  const areaCells = useMemo(() => {
    if (activeAreas) return cells.filter((cell) => pointInActiveAreas(cell.lat, cell.lon));
    return locationActive ? cells.filter((cell) => distanceMi(selectedLat, selectedLon, cell.lat, cell.lon) <= areaRadius) : cells;
  }, [cells, activeAreas, pointInActiveAreas, locationActive, selectedLat, selectedLon, areaRadius]);

  const areaReports = useMemo(() => {
    if (activeAreas) return reports.filter((report) => pointInActiveAreas(report.lat, report.lon));
    return locationActive ? reports.filter((report) => distanceMi(selectedLat, selectedLon, report.lat, report.lon) <= areaRadius) : reports;
  }, [reports, activeAreas, pointInActiveAreas, locationActive, selectedLat, selectedLon, areaRadius]);

  const areaAlertCounts = useMemo(() => {
    const counts = {};
    for (const area of areas) {
      const inside = allAlerts.filter((alert) => alertMatchesFilter(alert, alertFilter) && alertMatchesArea(alert, area));
      const levels = inside.map(weatherSoundLevel).filter(Boolean);
      const top = ALERT_SOUND_LEVELS.slice().reverse().find((level) => levels.includes(level)) || null;
      counts[area.area_id] = { total: inside.length, warnings: inside.filter((alert) => /Warning$/.test(alert.event)).length, top };
    }
    return counts;
  }, [areas, allAlerts, alertFilter, alertMatchesArea]);

  const boxInView = (bbox) => {
    const bounds = viewState.bounds;
    if (!bounds || !bbox) return Boolean(bbox);
    if (bbox[3] < bounds.south || bbox[1] > bounds.north) return false;
    if (bounds.east - bounds.west >= 360) return true;
    return !(bbox[2] < bounds.west || bbox[0] > bounds.east);
  };

  const mapAlerts = useMemo(() => (activeAreas ? allAlerts.filter((alert) => alertMatchesFilter(alert, alertFilter) && alertInActiveAreas(alert)) : filteredAlerts), [allAlerts, alertFilter, filteredAlerts, activeAreas, alertInActiveAreas]);

  const mapCells = activeAreas ? areaCells : cells;

  const mapReports = activeAreas ? areaReports : reports;

  const mapTropicalStorms = useMemo(() => {
    if (!activeAreas) return tropicalStorms;
    return tropicalStorms.filter((storm) => pointInActiveAreas(storm.lat, storm.lon) || tropicalFeatures.some((feature) => feature.storm === storm.id && ((feature.point && pointInActiveAreas(feature.point[1], feature.point[0])) || (feature.polygons || []).some((polygon) => (polygon[0] || []).some((point) => pointInActiveAreas(point[1], point[0]))))));
  }, [tropicalStorms, tropicalFeatures, activeAreas, pointInActiveAreas]);

  const mapTropicalFeatures = useMemo(() => {
    if (!activeAreas) return tropicalFeatures;
    const kept = new Set(mapTropicalStorms.map((storm) => storm.id));
    return tropicalFeatures.filter((feature) => kept.has(feature.storm));
  }, [tropicalFeatures, mapTropicalStorms, activeAreas]);

  const alertsInView = useMemo(() => (activeAreas ? mapAlerts : mapAlerts.filter((alert) => boxInView(alert.bbox))), [mapAlerts, activeAreas, viewState]);

  const cellsInView = useMemo(() => mapCells.filter((cell) => inBounds(viewState.bounds, cell.lon, cell.lat)), [mapCells, viewState]);

  const reportsInView = useMemo(() => mapReports.filter((report) => inBounds(viewState.bounds, report.lon, report.lat)), [mapReports, viewState]);

  const polygonsInActiveAreas = useCallback((polygons) => Boolean(activeAreas) && activeAreas.some((area) => {
    if ((polygons || []).some((polygon) => (polygon[0] || []).some((point) => isPointInArea(point[1], point[0], area)))) return true;
    const shape = areaShape(area);
    return pointInPolygons(shape.centerLng, shape.centerLat, polygons || []);
  }), [activeAreas]);

  const mapOutlookFeatures = useMemo(() => {
    const features = outlookData && outlookData.features ? outlookData.features : [];
    return activeAreas ? features.filter((feature) => polygonsInActiveAreas(feature.polygons)) : features;
  }, [outlookData, activeAreas, polygonsInActiveAreas]);

  const mapSites = useMemo(() => (activeAreas ? sites.filter((site) => pointInActiveAreas(site.lat, site.lon)) : sites), [sites, activeAreas, pointInActiveAreas]);

  const sitesInView = useMemo(() => mapSites.filter((site) => inBounds(viewState.bounds, site.lon, site.lat)), [mapSites, viewState]);

  const tornadoAlerts = useMemo(() => areaAlerts.filter((alert) => alert.event === "Tornado Warning" || alert.threat === "emergency"), [areaAlerts]);

  const soundInScope = (alert, scope) => {
    if (activeAreas) return alertInActiveAreas(alert);
    if (scope === "national") return true;
    if (scope === "areas") return areas.some((area) => alertMatchesArea(alert, area));
    if (scope === "area" && activeAreas) return alertInActiveAreas(alert);
    if (scope === "area" && locationActive) return alertInArea(alert, selectedLat, selectedLon, areaRadius);
    return boxInView(alert.bbox);
  };

  const soundScopeKey = [
    areaFilterActive ? areas.map((area) => `${area.area_id}:${area.updated_at || ""}`).join(",") : "",
    locationActive ? `${selectedLat},${selectedLon},${areaRadius}` : "",
    viewState.bounds ? ["west", "south", "east", "north"].map((key) => viewState.bounds[key].toFixed(2)).join(",") : ""
  ].join("|");

  const sounds = useAlertSounds({
    defaults: SOURCES.sounds.defaults,
    ready: stateRestored && areasLoaded && Boolean(alertsData) && (!areas.length || Boolean(areaPointStatus) || pointWaitOver),
    items: alertsData ? allAlerts : null,
    inScope: soundInScope,
    scopeKey: soundScopeKey,
    getKey: weatherSoundKey,
    getLevel: weatherSoundLevel,
    getId: weatherAlertIdentity,
    describe: weatherSoundMessage,
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
  const [ackDetails, setAckDetails] = useState({});
  const [ackAnalyses, setAckAnalyses] = useState({});
  const ackQueue = sounds.queue;
  const ackLengthRef = useRef(0);

  useEffect(() => {
    if (ackQueue.length > ackLengthRef.current && !ackReview) {
      setAckOpen(true);
      setAckIndex(ackLengthRef.current);
    }
    if (!ackQueue.length && !ackReview) setAckOpen(false);
    ackLengthRef.current = ackQueue.length;
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
    const source = activeAreas ? (allAlerts || []).filter(alertInActiveAreas) : allAlerts || [];
    const live = source.map((item) => ({ key: weatherSoundKey(item), id: weatherAlertIdentity(item), item, level: weatherSoundLevel(item) || ALERT_SOUND_LEVELS[0], ended: false, updated: false, at: Date.now(), message: weatherSoundMessage(item, false) }));
    const known = new Set(live.map((entry) => entry.key));
    return [...live, ...ackHistory.filter((entry) => !known.has(entry.key) && (!activeAreas || alertInActiveAreas(entry.item)))];
  }, [allAlerts, ackHistory, activeAreas, alertInActiveAreas]);
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

  useEffect(() => {
    for (const entry of ackQueue) {
      const alertId = entry.item && entry.item.id;
      if (!alertId) continue;
      if (!ackRequestedRef.current.has(`detail|${entry.key}`)) {
        ackRequestedRef.current.add(`detail|${entry.key}`);
        setAckDetails((current) => ({ ...current, [entry.key]: { loading: true } }));
        fetchApi("alertDetail", { id: alertId })
          .then((data) => setAckDetails((current) => ({ ...current, [entry.key]: { data: data.alert } })))
          .catch((error) => setAckDetails((current) => ({ ...current, [entry.key]: { error: errorText(error) } })));
      }
      if (!entry.ended && !ackRequestedRef.current.has(`analysis|${entry.key}`)) {
        ackRequestedRef.current.add(`analysis|${entry.key}`);
        setAckAnalyses((current) => ({ ...current, [entry.key]: { loading: true } }));
        fetchApi("alertAnalysis", { id: alertId })
          .then((data) => setAckAnalyses((current) => ({ ...current, [entry.key]: { data: data.analysis } })))
          .catch((error) => setAckAnalyses((current) => ({ ...current, [entry.key]: { error: errorText(error) } })));
      }
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
        pick("refreshInterval", setRefreshInterval, (value) => Number.isFinite(value) && value > 0);
        pick("layerVisibility", (value) => setLayerVisibility({ ...DEFAULT_LAYERS, ...value }), (value) => typeof value === "object");
        pick("globeMode", setGlobeMode, (value) => typeof value === "boolean");
        pick("monochrome", setMonochrome, (value) => typeof value === "boolean");
        pick("radarProduct", setRadarProduct, inOptions(RADAR_PRODUCT_OPTIONS));
        pick("radarSite", setRadarSite, (value) => typeof value === "string");
        pick("radarOpacity", setRadarOpacity, inOptions(RADAR_OPACITY_OPTIONS));
        pick("satelliteChannel", setSatelliteChannel, inOptions(SATELLITE_CHANNEL_OPTIONS));
        pick("rainfallPeriod", setRainfallPeriod, inOptions(RAINFALL_PERIOD_OPTIONS));
        pick("outlookKind", setOutlookKind, inOptions(OUTLOOK_KIND_OPTIONS));
        pick("alertFilter", setAlertFilter, inOptions(ALERT_FILTER_OPTIONS));
        pick("playing", setPlaying, (value) => typeof value === "boolean");
        pick("playbackSpeed", setPlaybackSpeed, (value) => Number.isFinite(value) && value > 0);
        pick("customLocationLabel", setCustomLocationLabel, (value) => typeof value === "object");
        pick("selectedAreaId", setSelectedAreaId, (value) => typeof value === "string");
        pick("areaFilterActive", setAreaFilterActive, (value) => typeof value === "boolean");
        pick("selectedLocation", setSelectedLocation, (value) => typeof value === "string");
        pick("areaRadius", setAreaRadius, inOptions(AREA_RADIUS_OPTIONS));
        pick("layoutVisibility", (value) => setLayoutVisibility((current) => ({ ...current, ...value })), (value) => typeof value === "object");
        pick("expandedWarnings", setExpandedWarnings, (value) => typeof value === "object");
        pick("sounds", replaceSoundSettings, (value) => typeof value === "object");
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
        monochrome,
        radarProduct,
        radarSite,
        radarOpacity,
        satelliteChannel,
        rainfallPeriod,
        outlookKind,
        alertFilter,
        playing,
        playbackSpeed,
        selectedLocation,
        customLocationLabel,
        areaRadius,
        layoutVisibility,
        expandedWarnings,
        selectedAreaId,
        areaFilterActive,
        sounds: sounds.settings
      });
    }, SOURCES.persistence.saveDebounceMs);
    return () => clearTimeout(saveStateDebounceRef.current);
  }, [stateRestored, activeTab, autoRefresh, refreshInterval, layerVisibility, globeMode, monochrome, radarProduct, radarSite, radarOpacity, satelliteChannel, rainfallPeriod, outlookKind, alertFilter, playing, playbackSpeed, selectedLocation, customLocationLabel, areaRadius, layoutVisibility, expandedWarnings, selectedAreaId, areaFilterActive, sounds.settings]);

  const scopedAlertStats = useMemo(() => {
    if (!alertsData) return null;
    const list = activeAreas ? areaFilteredAlerts : filteredAlerts;
    const byEvent = {};
    for (const alert of list) {
      if (!byEvent[alert.event]) byEvent[alert.event] = { event: alert.event, count: 0, color: alert.color, rank: alert.rank || 0 };
      byEvent[alert.event].count += 1;
    }
    return {
      total: list.length,
      warnings: list.filter((alert) => /Warning$/.test(alert.event)).length,
      watches: list.filter((alert) => /Watch$/.test(alert.event)).length,
      tornadoWarnings: list.filter((alert) => alert.event === "Tornado Warning").length,
      observedTornadoes: list.filter((alert) => alert.tornadoDetection && /OBSERVED/i.test(alert.tornadoDetection)).length,
      emergencies: list.filter((alert) => alert.threat === "emergency").length,
      severeWarnings: list.filter((alert) => alert.event === "Severe Thunderstorm Warning").length,
      considerable: list.filter((alert) => alert.threat === "considerable").length,
      flashFloodWarnings: list.filter((alert) => alert.event === "Flash Flood Warning").length,
      byEvent: Object.values(byEvent).sort((a, b) => a.rank - b.rank)
    };
  }, [alertsData, activeAreas, areaFilteredAlerts, filteredAlerts]);

  const scopedStormStats = useMemo(() => {
    if (!activeAreas) return stormsData ? stormsData.stats : null;
    const hail = areaCells.map((cell) => cell.maxSize).filter((value) => value !== null && value !== undefined);
    return {
      total: areaCells.length,
      severe: areaCells.filter((cell) => cell.severity >= 2).length,
      radars: new Set(areaCells.map((cell) => cell.nexrad).filter(Boolean)).size,
      maxHail: hail.length ? Math.max(...hail) : null,
      mesocyclones: areaCells.filter((cell) => cell.meso).length,
      tornadic: areaCells.filter((cell) => cell.tvs).length
    };
  }, [activeAreas, areaCells, stormsData]);

  const scopedReportStats = useMemo(() => {
    if (!activeAreas) return reportsData ? reportsData.stats : null;
    const byType = {};
    for (const report of areaReports) byType[report.typeText] = (byType[report.typeText] || 0) + 1;
    return {
      total: areaReports.length,
      tornadoes: areaReports.filter((report) => report.type === "T").length,
      hail: areaReports.filter((report) => report.type === "H").length,
      wind: areaReports.filter((report) => report.type === "G" || report.type === "D").length,
      byType: Object.entries(byType).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count)
    };
  }, [activeAreas, areaReports, reportsData]);

  const scopedCells = activeAreas ? areaCells : cells;

  const selectedAlert = selected && selected.kind === "alert" ? alerts.find((alert) => alert.id === selected.id) || null : null;
  const selectedCell = selected && selected.kind === "storm" ? cells.find((cell) => cell.id === selected.id) || null : null;
  const selectedReport = selected && selected.kind === "report" ? reports.find((report) => report.id === selected.id) || null : null;
  const selectedTropical = selected && selected.kind === "tropical" ? tropicalStorms.find((storm) => storm.id === selected.id) || null : null;
  const selectedSite = selected && selected.kind === "site" ? sites.find((site) => site.id === selected.id) || null : null;

  const select = useCallback((kind, id, focus) => {
    setSelected({ kind, id });
    setSelectedDetail(null);
    setSelectedError(null);
    if (!focus) return;
    setActiveTab("map");
    if (focus.bbox) fitBox(focus.bbox);
    else if (focus.lat !== undefined && focus.lon !== undefined) navigateTo(focus.lon, focus.lat, Math.max(viewRef.current ? viewRef.current.zoom : 0, focus.zoom || SOURCES.map.focusZoom));
  }, [fitBox, navigateTo]);

  const clearSelection = useCallback(() => {
    setSelected(null);
    setSelectedDetail(null);
    setSelectedError(null);
  }, []);

  useEffect(() => {
    if (!selected || selected.kind !== "alert") return undefined;
    let cancelled = false;
    fetchApi("alertDetail", { id: selected.id })
      .then((data) => {
        if (!cancelled) setSelectedDetail(data.alert);
      })
      .catch((error) => {
        if (!cancelled) setSelectedError(errorText(error));
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const toggleLayer = (id) => setLayerVisibility((prev) => ({ ...prev, [id]: !prev[id] }));

  const chooseSite = useCallback((id) => {
    setRadarSite(id);
    setRadarProduct((current) => (SINGLE_SITE_PRODUCTS.has(current) ? current : "reflectivity"));
  }, []);

  const hoveredAlertId = hoverInfo && hoverInfo.kind === "alert" && hoverInfo.object ? hoverInfo.object.id : null;
  const hoveredAlert = useMemo(() => (hoveredAlertId ? alerts.find((alert) => alert.id === hoveredAlertId) || null : null), [hoveredAlertId, alerts]);

  useEffect(() => {
    const overlay = overlayRef.current;
    const dk = libsRef.current && libsRef.current.deck;
    if (!mapReady || !overlay || !dk) return;
    const zoom = viewState.zoom;
    const globe = globeMode;
    const faceCenter = globeCenter || viewState;
    const onFace = (list, lat, lon) => (globe ? list.filter((item) => facingViewer(faceCenter, lat(item), lon(item))) : list);
    const shared = globe ? { parameters: { depthCompare: "always", cullMode: "none" } } : {};
    const layers = [];
    const hover = (kind) => (info) => setHoverInfo(info.object ? { x: info.x, y: info.y, kind, object: info.object } : null);

    if (activeAreas) {
      const holes = activeAreas.map((area) => areaShape(area).ring.slice().reverse());
      layers.push(new dk.SolidPolygonLayer({
        id: "wx-area-mask",
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
        id: "wx-user-areas",
        data: shapes,
        getPolygon: (d) => d.ring,
        filled: true,
        getFillColor: (d) => (d.selected ? [78, 205, 196, 34] : [78, 205, 196, 14]),
        updateTriggers: { getFillColor: [selectedAreaId] }
      }));
      layers.push(new dk.TextLayer({
        ...shared,
        id: "wx-user-area-labels",
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

    if (layerVisibility.outlook && outlookData && outlookData.features) {
      const polygons = [];
      mapOutlookFeatures.forEach((feature) => feature.polygons.forEach((polygon) => polygons.push({ feature, polygon })));
      layers.push(new dk.PolygonLayer({
        ...shared,
        id: "wx-outlook",
        data: polygons,
        getPolygon: (d) => d.polygon,
        filled: true,
        stroked: false,
        getFillColor: (d) => [...hexToRgb(d.feature.fill), 48],
        pickable: true,
        onHover: hover("outlook")
      }));
    }

    if (layerVisibility.alerts) {
      const drawn = mapAlerts.filter((alert) => alert.shape === "polygon" && MAP_WARNING_EVENTS.has(alert.event)).slice(0, SOURCES.map.maxAlertsDrawn);
      const strong = (alert) => alert.event === "Tornado Warning" || Boolean(alert.threat);
      const focus = [selectedAlert, hoveredAlert].filter((alert, index, list) => alert && alert.polygons && list.findIndex((other) => other && other.id === alert.id) === index);
      if (focus.length) {
        const areas = [];
        focus.forEach((alert) => alert.polygons.forEach((polygon) => areas.push({ alert, polygon })));
        layers.push(new dk.PolygonLayer({
          ...shared,
          id: "wx-alert-area",
          data: areas,
          getPolygon: (d) => d.polygon,
          filled: true,
          stroked: false,
          getFillColor: (d) => [...hexToRgb(d.alert.color), selectedAlert && d.alert.id === selectedAlert.id ? 70 : 45],
          updateTriggers: { getFillColor: [selectedAlert && selectedAlert.id, hoveredAlert && hoveredAlert.id] }
        }));
      }
      const badges = drawn.map((alert) => ({ alert, position: alertAnchor(alert) })).filter((badge) => badge.position);
      layers.push(new dk.IconLayer({
        ...shared,
        id: "wx-alerts",
        data: onFace(badges, (d) => d.position[1], (d) => d.position[0]),
        getPosition: (d) => d.position,
        getIcon: (d) => warningIcon(d.alert, strong(d.alert)),
        getSize: (d) => (strong(d.alert) ? 30 : 26),
        sizeUnits: "pixels",
        pickable: true,
        autoHighlight: true,
        highlightColor: [235, 240, 248, 70],
        onClick: (info) => {
          if (info.object) select("alert", info.object.alert.id);
          return true;
        },
        onHover: (info) => setHoverInfo(info.object ? { x: info.x, y: info.y, kind: "alert", object: info.object.alert } : null)
      }));
    }

    if (locationActive) {
      layers.push(new dk.ScatterplotLayer({
        ...shared,
        id: "wx-area",
        data: [{ lon: selectedLon, lat: selectedLat }],
        getPosition: (d) => [d.lon, d.lat],
        getRadius: areaRadius * 1609.34,
        radiusUnits: "meters",
        stroked: false,
        filled: true,
        getFillColor: [78, 205, 196, 26],
        updateTriggers: { getRadius: areaRadius }
      }));
      layers.push(new dk.ScatterplotLayer({
        ...shared,
        id: "wx-area-center",
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

    if (layerVisibility.tropical && mapTropicalFeatures.length) {
      const cones = [];
      const tracks = [];
      const past = [];
      const points = [];
      for (const feature of mapTropicalFeatures) {
        if (feature.kind === "track") (feature.path ? [feature.path] : feature.paths || []).forEach((path) => tracks.push({ feature, path }));
        if (feature.kind === "past") (feature.path ? [feature.path] : feature.paths || []).forEach((path) => past.push({ feature, path }));
        if (feature.kind === "cone" && feature.polygons) feature.polygons.forEach((polygon) => cones.push({ feature, polygon }));
        if (feature.kind === "points" && feature.point) points.push(feature);
      }
      const shownPoints = onFace(points, (d) => d.point[1], (d) => d.point[0]);
      layers.push(new dk.PolygonLayer({ ...shared, id: "wx-tropical-cone", data: cones, getPolygon: (d) => d.polygon, filled: true, stroked: false, getFillColor: [235, 240, 248, 30] }));
      layers.push(trailLayer(dk, shared, "wx-tropical-past", trailDots(past, zoom, SOURCES.map.trailSpacingPx), (item) => tropicalSegmentColor(item.feature.properties), { radius: 1.5, alpha: 150, fade: 0 }));
      layers.push(trailLayer(dk, shared, "wx-tropical-track", trailDots(tracks, zoom, SOURCES.map.trailSpacingPx), () => [235, 240, 248], { radius: 1.75, alpha: 200, fade: 0.55 }));
      layers.push(new dk.ScatterplotLayer({
        ...shared,
        id: "wx-tropical-points",
        data: shownPoints,
        getPosition: (d) => d.point,
        getRadius: 3.5,
        radiusUnits: "pixels",
        filled: true,
        stroked: false,
        getFillColor: (d) => [...tropicalPointColor(d.properties), 235],
        pickable: true,
        autoHighlight: true,
        highlightColor: [235, 240, 248, 120],
        onHover: hover("tropicalPoint")
      }));
    }

    if (layerVisibility.tropical && mapTropicalStorms.length) {
      const storms = onFace(mapTropicalStorms.filter((storm) => Number.isFinite(storm.lat) && Number.isFinite(storm.lon)), (d) => d.lat, (d) => d.lon);
      layers.push(new dk.IconLayer({
        ...shared,
        id: "wx-tropical-storms",
        data: storms,
        getPosition: (d) => [d.lon, d.lat],
        getIcon: (d) => tropicalIcon(d.classification),
        getSize: 30,
        sizeUnits: "pixels",
        pickable: true,
        onClick: (info) => {
          if (info.object) select("tropical", info.object.id);
          return true;
        },
        onHover: hover("tropical")
      }));
      if (zoom >= SOURCES.map.tropicalLabelZoom) {
        layers.push(new dk.TextLayer({
          ...shared,
          id: "wx-tropical-labels",
          data: storms,
          getPosition: (d) => [d.lon, d.lat],
          getText: (d) => `${d.name || d.id}${d.intensity ? ` ${d.intensity} Kt` : ""}`,
          getSize: 11,
          getColor: (d) => [...(TROPICAL_COLORS[d.classification] || [205, 212, 228]), 255],
          getTextAnchor: "start",
          getAlignmentBaseline: "center",
          getPixelOffset: [18, 0],
          fontFamily: CHART_FONT,
          fontWeight: 800,
          background: true,
          getBackgroundColor: [8, 9, 12, 210],
          backgroundPadding: [3, 1]
        }));
      }
    }

    if (layerVisibility.reports && mapReports.length) {
      const shown = onFace(mapReports, (d) => d.lat, (d) => d.lon);
      const near = zoom >= SOURCES.map.reportLabelZoom;
      const ordered = shown.slice().sort((x, y) => (x.type === "T") - (y.type === "T"));
      layers.push(new dk.IconLayer({
        ...shared,
        id: "wx-reports",
        data: ordered,
        getPosition: (d) => [d.lon, d.lat],
        getIcon: (d) => reportIcon(d, near),
        getSize: (d) => reportIconSize(d, near),
        sizeUnits: "pixels",
        pickable: true,
        autoHighlight: true,
        highlightColor: [235, 240, 248, 70],
        onClick: (info) => {
          if (info.object) select("report", info.object.id);
          return true;
        },
        onHover: hover("report"),
        updateTriggers: { getIcon: near, getSize: near }
      }));
    }

    if (layerVisibility.storms && mapCells.length) {
      const near = zoom >= SOURCES.map.stormAllZoom;
      const shown = onFace(near ? mapCells : mapCells.filter((cell) => cell.severity >= SOURCES.map.stormMinSeverity || (selectedCell && cell.id === selectedCell.id)), (d) => d.lat, (d) => d.lon);
      const tracked = (cell) => cell.severity >= SOURCES.map.stormMinSeverity || (selectedCell && cell.id === selectedCell.id);
      const vectors = [];
      for (const cell of shown) {
        if (!tracked(cell) || cell.drct === null || cell.sknt === null || !cell.sknt) continue;
        const toward = (cell.drct + 180) % 360;
        const minutes = SOURCES.map.stormVectorMinutes[SOURCES.map.stormVectorMinutes.length - 1];
        vectors.push({ cell, path: [[cell.lon, cell.lat], projectMotion(cell.lat, cell.lon, toward, (cell.sknt * minutes) / 60)] });
      }
      layers.push(trailLayer(dk, shared, "wx-storm-vectors", trailDots(vectors, zoom, SOURCES.map.trailSpacingPx - 1).filter((dot) => dot.progress > 0.12), (item) => STORM_COLORS[item.cell.severity], { radius: 1.6, alpha: 220, fade: 0.75 }));
      if (selectedCell && shown.some((cell) => cell.id === selectedCell.id)) {
        layers.push(new dk.ScatterplotLayer({
          ...shared,
          id: "wx-storm-selected",
          data: [selectedCell],
          getPosition: (d) => [d.lon, d.lat],
          getRadius: (d) => stormIconSize(d, near) / 2 + 4,
          radiusUnits: "pixels",
          stroked: true,
          filled: true,
          getFillColor: [235, 240, 248, 30],
          getLineColor: [235, 240, 248, 170],
          lineWidthUnits: "pixels",
          getLineWidth: 1.5
        }));
      }
      const orderedCells = shown.slice().sort((x, y) => x.severity - y.severity);
      layers.push(new dk.IconLayer({
        ...shared,
        id: "wx-storm-cells",
        data: orderedCells,
        getPosition: (d) => [d.lon, d.lat],
        getIcon: (d) => stormIcon(d),
        getSize: (d) => stormIconSize(d, near),
        sizeUnits: "pixels",
        pickable: true,
        autoHighlight: true,
        highlightColor: [235, 240, 248, 70],
        onClick: (info) => {
          if (info.object) select("storm", info.object.id);
          return true;
        },
        onHover: hover("storm"),
        updateTriggers: { getSize: near }
      }));
      if (zoom >= SOURCES.map.stormLabelZoom) {
        layers.push(new dk.TextLayer({
          ...shared,
          id: "wx-storm-labels",
          data: declutter(deckglMapRef.current, shown.filter((cell) => cell.severity >= 1), (d) => [d.lon, d.lat], (d) => d.severity * 1000 + (d.maxSize || 0), (d) => labelBox(`${d.storm || ""}${d.maxSize ? ` ${d.maxSize}"` : ""}${d.tvs ? " TVS" : d.meso ? " Meso" : ""}`, 16)),
          getPosition: (d) => [d.lon, d.lat],
          getText: (d) => `${d.storm || ""}${d.maxSize ? ` ${d.maxSize}"` : ""}${d.tvs ? " TVS" : d.meso ? " Meso" : ""}`,
          getSize: 10,
          getColor: (d) => [...STORM_COLORS[d.severity], 255],
          getTextAnchor: "start",
          getAlignmentBaseline: "center",
          getPixelOffset: [16, 0],
          fontFamily: CHART_FONT,
          fontWeight: 800,
          background: true,
          getBackgroundColor: [8, 9, 12, 210],
          backgroundPadding: [3, 1]
        }));
      }
    }

    if (layerVisibility.sites && mapSites.length) {
      const shown = onFace(mapSites, (d) => d.lat, (d) => d.lon);
      layers.push(new dk.ScatterplotLayer({
        ...shared,
        id: "wx-sites",
        data: shown,
        getPosition: (d) => [d.lon, d.lat],
        getRadius: (d) => (d.id === radarSite && singleSite ? 7 : 4.5),
        radiusUnits: "pixels",
        stroked: true,
        filled: true,
        getFillColor: (d) => (d.id === radarSite && singleSite ? [78, 205, 196, 255] : [145, 155, 175, 230]),
        getLineColor: [8, 9, 12, 255],
        lineWidthUnits: "pixels",
        getLineWidth: 1.5,
        pickable: true,
        onClick: (info) => {
          if (info.object) select("site", info.object.id);
          return true;
        },
        onHover: hover("site"),
        updateTriggers: { getRadius: [radarSite, singleSite], getFillColor: [radarSite, singleSite] }
      }));
      if (zoom >= SOURCES.map.siteLabelZoom) {
        layers.push(new dk.TextLayer({
          ...shared,
          id: "wx-site-labels",
          data: shown,
          getPosition: (d) => [d.lon, d.lat],
          getText: (d) => d.id,
          getSize: 10,
          getColor: (d) => (d.id === radarSite && singleSite ? [78, 205, 196, 255] : [205, 212, 228, 255]),
          getTextAnchor: "start",
          getAlignmentBaseline: "center",
          getPixelOffset: [9, 0],
          fontFamily: CHART_FONT,
          fontWeight: 800,
          background: true,
          getBackgroundColor: [8, 9, 12, 200],
          backgroundPadding: [3, 1],
          updateTriggers: { getColor: [radarSite, singleSite] }
        }));
      }
    }

    overlay.setProps({ layers });
  }, [mapReady, viewState, globeMode, globeCenter, areaFilterActive, activeAreas, areas, selectedAreaId, layerVisibility, outlookData, mapOutlookFeatures, mapSites, mapAlerts, alertFilter, selectedAlert, hoveredAlert, selectedCell, selected, locationActive, selectedLat, selectedLon, areaRadius, mapTropicalFeatures, mapTropicalStorms, mapReports, mapCells, sites, radarSite, singleSite, select]);

  const resetView = useCallback(() => {
    const location = locationRef.current;
    const cap = (zoom, lat) => (globeMode ? Math.min(zoom, globeZoomAt(lat)) : zoom);
    if (location) navigateTo(location.lon, location.lat, cap(radiusZoom(location.radius, location.lat), location.lat));
    else navigateTo(SOURCES.map.center[0], SOURCES.map.center[1], cap(SOURCES.map.zoom, SOURCES.map.center[1]));
  }, [navigateTo, globeMode]);

  const locationFocusRef = useRef(null);

  useEffect(() => {
    if (!mapReady) return;
    const signature = locationActive ? `${selectedLocation}|${areaRadius}` : WORLDWIDE_KEY;
    if (locationFocusRef.current === signature) return;
    const previous = locationFocusRef.current;
    locationFocusRef.current = signature;
    if (locationActive) navigateTo(selectedLon, selectedLat, globeMode ? Math.min(radiusZoom(areaRadius, selectedLat), globeZoomAt(selectedLat)) : radiusZoom(areaRadius, selectedLat));
    else if (previous && previous !== WORLDWIDE_KEY) resetView();
  }, [mapReady, locationActive, selectedLocation, selectedLat, selectedLon, areaRadius, navigateTo, resetView, globeMode]);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      layerVisibility.radar ? loadRadar() : null,
      loadAlerts(),
      loadStorms(),
      loadReports(),
      loadTropical(),
      layerVisibility.outlook ? loadOutlook() : null,
      locationActive ? loadPoint() : null,
      loadHealth(),
      loadHarvestHealth(),
      activeTab === "overview" ? loadHistory() : null
    ].filter(Boolean));
    setRefreshing(false);
  }, [layerVisibility.radar, layerVisibility.outlook, loadRadar, loadAlerts, loadStorms, loadReports, loadTropical, loadOutlook, locationActive, loadPoint, loadHealth, loadHarvestHealth, activeTab, loadHistory]);

  const exportData = useCallback(() => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const header = "Event,Severity,Certainty,Urgency,Headline,Areas,Sent,Onset,Expires,MaxHailInches,MaxWind,TornadoDetection,DamageThreat,Sender,AlertId";
    const rows = areaFilteredAlerts.map((alert) => [
      csvQuote(alert.event), csvQuote(alert.severity || ""), csvQuote(alert.certainty || ""), csvQuote(alert.urgency || ""), csvQuote(alert.headline || ""), csvQuote(alert.areaDesc || ""),
      csvQuote(alert.sent || ""), csvQuote(alert.onset || ""), csvQuote(alert.expires || ""), alert.maxHail === null || alert.maxHail === undefined ? "" : alert.maxHail, csvQuote(alert.maxWind || ""),
      csvQuote(alert.tornadoDetection || ""), csvQuote(alert.tornadoThreat || alert.stormThreat || alert.floodThreat || ""), csvQuote(alert.sender || ""), csvQuote(alert.id)
    ].join(","));
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `weather-alerts-${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [areaFilteredAlerts]);

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

  const createBarChart = (title, labels, values, unit = "", color = "#4ecdc4", horizontal = false, colors = null) => {
    if (!values.length) return null;
    const { fontSize, grid } = getResponsiveOptions(window.innerWidth);
    const category = { type: "category", data: labels, axisLabel: axisLabel(fontSize, horizontal ? 110 : 90), axisLine: { lineStyle: { color: "#3d4354", width: 2 } }, axisTick: { lineStyle: { color: "#3d4354" } }, splitLine: { show: false } };
    const value = { type: "value", axisLabel: axisLabel(fontSize, 60), axisLine: { show: false }, splitLine: { lineStyle: { color: "#323746", type: "dashed" } } };
    const option = {
      textStyle: { fontFamily: CHART_FONT },
      tooltip: {
        trigger: "axis",
        ...tooltipStyle,
        formatter: (params) => `<div><div style="font-size:10px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;color:#919baf;margin-bottom:6px">${title}</div>${params.map(p => `<div style="font-weight:700;color:#cdd4e4">${p.name}: <span style="font-weight:800;color:${colors ? colors[p.dataIndex] : color}">${Number(p.data).toLocaleString()}${unit}</span></div>`).join("")}</div>`
      },
      xAxis: horizontal ? value : category,
      yAxis: horizontal ? { ...category, inverse: true } : value,
      series: [{ name: title, type: "bar", data: values, itemStyle: { color: colors ? (params) => colors[params.dataIndex] : color, borderRadius: 0 }, barMaxWidth: 28 }],
      grid: { ...grid, containLabel: true }
    };
    Object.defineProperty(option, "statsMeta", { value: { values, unit }, enumerable: false });
    return option;
  };

  const createLineChart = (title, labels, seriesList, unit = "", bars = false) => {
    if (!labels.length) return null;
    const { fontSize, grid } = getResponsiveOptions(window.innerWidth);
    const option = {
      textStyle: { fontFamily: CHART_FONT },
      tooltip: {
        trigger: "axis",
        ...tooltipStyle,
        formatter: (params) => `<div><div style="font-size:10px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;color:#919baf;margin-bottom:6px">${params[0] ? params[0].axisValue : title}</div>${params.map(p => `<div style="font-weight:700;color:#cdd4e4">${p.seriesName}: <span style="font-weight:800;color:${p.color}">${p.data === null || p.data === undefined ? "—" : Number(p.data).toLocaleString(undefined, { maximumFractionDigits: 2 })}${unit}</span></div>`).join("")}</div>`
      },
      legend: { top: 0, textStyle: { color: "#919baf", fontSize, fontWeight: 700, fontFamily: CHART_FONT } },
      xAxis: { type: "category", data: labels, axisLabel: axisLabel(fontSize, 90), axisLine: { lineStyle: { color: "#3d4354", width: 2 } }, axisTick: { lineStyle: { color: "#3d4354" } }, splitLine: { show: false } },
      yAxis: seriesList.some((series) => series.axis === 1)
        ? [0, 1].map((index) => ({ type: "value", axisLabel: axisLabel(fontSize, 60), axisLine: { show: false }, splitLine: { show: index === 0, lineStyle: { color: "#323746", type: "dashed" } } }))
        : { type: "value", axisLabel: axisLabel(fontSize, 60), axisLine: { show: false }, splitLine: { lineStyle: { color: "#323746", type: "dashed" } } },
      series: seriesList.map(({ name, data, color, axis, bar }) => (bar || bars
        ? { name, data, type: "bar", yAxisIndex: axis || 0, itemStyle: { color, borderRadius: 0 }, barMaxWidth: 16 }
        : { name, data, type: "line", yAxisIndex: axis || 0, smooth: true, showSymbol: false, itemStyle: { color }, lineStyle: { color, width: 2 }, areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: color + "40" }, { offset: 1, color: color + "00" }] } } })),
      grid: { ...grid, containLabel: true }
    };
    Object.defineProperty(option, "statsMeta", { value: { values: seriesList[0] ? seriesList[0].data.filter((v) => v !== null && v !== undefined) : [], unit }, enumerable: false });
    return option;
  };

  const renderChartStats = (chartConfig) => {
    const values = chartConfig?.statsMeta?.values || [];
    const unit = chartConfig?.statsMeta?.unit || "";
    const format = (v) => (v === null || v === undefined || isNaN(v) ? "—" : `${Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}${unit}`);
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

  const alertRow = (alert) => [
    { value: alert.event, color: alert.color },
    alert.severity,
    alert.areaDesc,
    formatClock(alert.sent),
    formatUntil(alert.expires || alert.ends),
    hazardSummary(alert) || threatLabel(alert),
    alert.sender
  ];

  const focusAlert = (alert) => select("alert", alert.id, alert.bbox ? { bbox: alert.bbox } : null);

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

  const renderAckModal = () => {
    if (!ackEntry) return null;
    const position = Math.min(ackIndex, ackList.length - 1);
    const pending = ackPendingKeys.has(ackEntry.key);
    const pendingCount = ackList.filter((item) => ackPendingKeys.has(item.key)).length;
    const detailState = ackDetails[ackEntry.key] || {};
    const analysisState = ackAnalyses[ackEntry.key] || {};
    const alert = { ...ackEntry.item, ...(detailState.data || {}) };
    const banner = threatLabel(alert);
    const status = ackEntry.ended ? "Ended" : alert.messageType === "Update" ? "Updated" : alert.messageType === "Cancel" ? "Cancelled" : "New";
    const analysis = analysisState.data;
    const onMap = alerts.find((item) => item.id === alert.id) || null;
    return createPortal(
      <div className="satWeatherModalOverlay satWeatherAckOverlay">
        <div className="satWeatherModal satWeatherAckModal" onClick={(event) => event.stopPropagation()}>
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
            <div className="satWeatherAckTitle" style={{ borderLeftColor: alert.color || "#ff6b6b" }}>
              <div className="satWeatherAckTitleRow">
                <span className="satWeatherAckEvent" style={{ color: liftColor(alert.color || "#ff6b6b") }}>{alert.event}</span>
                <span className={`satWeatherAckStatus satWeatherAckStatus${status}`}>{status}</span>
              </div>
              {(alert.nwsHeadline || alert.headline) && <div className="satWeatherAckHeadline">{alert.nwsHeadline || alert.headline}</div>}
              {banner && <div className="satWeatherDetailEmergency">{banner}</div>}
            </div>
            <div className="satWeatherAckSectionTitle">Alert Details</div>
            {renderDetailFields([
              ["Severity", alert.severity],
              ["Certainty", alert.certainty],
              ["Urgency", alert.urgency],
              ["Issued", alert.sent ? formatAbsoluteTime(alert.sent) : null],
              ["Effective", alert.effective ? formatAbsoluteTime(alert.effective) : null],
              ["Onset", alert.onset ? formatAbsoluteTime(alert.onset) : null],
              ["Expires", alert.expires ? `${formatAbsoluteTime(alert.expires)} (${formatUntil(alert.expires)})` : null],
              ["Ends", alert.ends ? formatAbsoluteTime(alert.ends) : null],
              ["Message Type", alert.messageType],
              ["Category", alert.category],
              ["Response", alert.response],
              ["Issued By", alert.sender],
              ["Maximum Hail", alert.maxHail ? `${alert.maxHail} In` : null],
              ["Maximum Wind", alert.maxWind ? String(alert.maxWind).replace(/MPH/i, "Mph") : null],
              ["Tornado Detection", alert.tornadoDetection ? titleCaseName(alert.tornadoDetection) : null],
              ["Tornado Damage Threat", alert.tornadoThreat ? titleCaseName(alert.tornadoThreat) : null],
              ["Storm Damage Threat", alert.stormThreat ? titleCaseName(alert.stormThreat) : null],
              ["Flood Detection", alert.floodDetection ? titleCaseName(alert.floodDetection) : null],
              ["Flood Damage Threat", alert.floodThreat ? titleCaseName(alert.floodThreat) : null],
              ["Areas", alert.areaDesc],
              ["Storm Motion", alert.eventMotion ? titleCaseName(alert.eventMotion) : null],
              ["VTEC", alert.vtec]
            ], { columns: 3, skipEmpty: true, wideAt: 26, fullAt: 40 })}
            <div className="satWeatherAckSectionTitle">AI Analysis</div>
            <div className="satWeatherAckAnalysis">
              {ackEntry.ended && <div className="satWeatherAckNote">This alert has ended, so no analysis is generated for it.</div>}
              {!ackEntry.ended && analysisState.loading && <div className="satWeatherAckNote"><FontAwesomeIcon icon={faSpinner} spin /> Generating Analysis</div>}
              {!ackEntry.ended && analysisState.error && <div className="satWeatherDetailError">{`The AI analysis is unavailable because of the error "${String(analysisState.error).replace(/\.$/, "")}".`}</div>}
              {analysis && (
                <>
                  <p className="satWeatherAckSummary">{analysis.summary}</p>
                  <div className="satWeatherAckColumns">
                    <div className="satWeatherAckBlock">
                      <div className="satWeatherAckBlockTitle">Threats</div>
                      {analysis.threats.map((item, index) => <p key={index}>{item}</p>)}
                    </div>
                    <div className="satWeatherAckBlock">
                      <div className="satWeatherAckBlockTitle">Protective Actions</div>
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
                  <div className="satWeatherAckFootnote">{`Generated By ${analysis.model} At ${formatClock(analysis.generatedAt)} From The Official Alert Text`}</div>
                </>
              )}
            </div>
            <div className="satWeatherAckSectionTitle">Official Text</div>
            {detailState.loading && <div className="satWeatherAckNote"><FontAwesomeIcon icon={faSpinner} spin /> Loading The Full Alert Text</div>}
            {detailState.error && <div className="satWeatherDetailError">{`The full alert text could not be loaded because of the error "${String(detailState.error).replace(/\.$/, "")}".`}</div>}
            {alert.description && (
              <OfficialText title="Description" text={alert.description} />
            )}
            {alert.instruction && (
              <OfficialText title="Instructions" text={alert.instruction} />
            )}
          </div>
          <div className="satWeatherAckActions">
            <span className="satWeatherAckRemaining">{!pending ? "Already Acknowledged" : pendingCount === 1 ? "Last Alert To Acknowledge" : `${pendingCount - 1} More To Acknowledge`}</span>
            <button type="button" className="satWeatherModalBtnSecondary" disabled={!onMap} onClick={() => {
              closeAckModal();
              if (onMap) focusAlert(onMap);
            }}><FontAwesomeIcon icon={faLocationCrosshairs} /> View On Map</button>
            <button type="button" className="satWeatherModalBtnPrimary" disabled={!pending} onClick={() => sounds.acknowledge(ackEntry.key)}><FontAwesomeIcon icon={faCheck} /> {pending ? "Acknowledge" : "Acknowledged"}</button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  const renderDetailCard = () => {
    if (!selected) return null;
    let icon = faExclamationTriangle;
    let color = "#4ecdc4";
    let title = "Details";
    let banner = null;
    let body = null;
    let focus = null;
    if (selected.kind === "alert") {
      const alert = selectedDetail || selectedAlert;
      if (!alert) return null;
      icon = alert.event === "Tornado Warning" ? faTornado : /Thunderstorm/.test(alert.event) ? faCloudBolt : /Flood/.test(alert.event) ? faDroplet : /Wind/.test(alert.event) ? faWind : faExclamationTriangle;
      color = alert.color || "#ff6b6b";
      title = alert.event;
      banner = threatLabel(alert);
      focus = selectedAlert && selectedAlert.bbox ? () => fitBox(selectedAlert.bbox) : null;
      body = (
        <>
          {alert.headline && <div className="satWeatherDetailHeadline">{alert.headline}</div>}
          {renderDetailFields([
            ["Severity", [alert.severity, alert.certainty, alert.urgency].filter(Boolean).join(" | ")],
            ["Hazards", hazardSummary(alert) || null],
            ["Issued", formatAbsoluteTime(alert.sent)],
            ["Onset", alert.onset ? formatAbsoluteTime(alert.onset) : null],
            ["Expires", alert.expires ? `${formatAbsoluteTime(alert.expires)} (${formatUntil(alert.expires)})` : null],
            ["Areas", alert.areaDesc],
            ["Issued By", alert.sender],
            ["Message Type", alert.messageType]
          ])}
          {selectedError && <div className="satWeatherDetailError">{`The full alert text could not be loaded because of the error "${selectedError}".`}</div>}
          {!selectedDetail && !selectedError && <div className="satWeatherDetailNote">Loading The Full Alert Text</div>}
          {selectedDetail && selectedDetail.description && (
            <OfficialText title="Description" text={selectedDetail.description} />
          )}
          {selectedDetail && selectedDetail.instruction && (
            <OfficialText title="Instructions" text={selectedDetail.instruction} />
          )}
        </>
      );
    } else if (selected.kind === "storm") {
      const cell = selectedCell;
      if (!cell) return null;
      icon = faBolt;
      color = `rgb(${STORM_COLORS[cell.severity].join(", ")})`;
      title = `Storm ${stormLabel(cell)}`;
      banner = cell.tvs ? "Tornado Vortex Signature Detected" : cell.meso ? "Mesocyclone Detected" : null;
      focus = () => navigateTo(cell.lon, cell.lat, Math.max(viewRef.current ? viewRef.current.zoom : 0, SOURCES.map.focusZoom));
      const toward = cell.drct === null ? null : (cell.drct + 180) % 360;
      body = renderDetailFields([
        ["Classification", STORM_SEVERITY_LABELS[cell.severity]],
        ["Radar", cell.nexrad],
        ["Hail Probability", cell.poh === null ? null : `${cell.poh}%`],
        ["Severe Hail Probability", cell.posh === null ? null : `${cell.posh}%`],
        ["Maximum Hail Size", cell.maxSize ? `${cell.maxSize} In` : null],
        ["Maximum Reflectivity", cell.maxDbz === null ? null : `${cell.maxDbz} dBZ${cell.maxDbzHeight !== null ? ` At ${cell.maxDbzHeight} Kft` : ""}`],
        ["Echo Top", cell.top === null ? null : `${cell.top} Kft`],
        ["Vertically Integrated Liquid", cell.vil === null ? null : `${cell.vil} Kg/M²`],
        ["Motion", toward === null || !cell.sknt ? "Stationary Or Unknown" : `Toward ${Math.round(toward)}° At ${cell.sknt} Kt`],
        ["Mesocyclone", cell.meso || "None"],
        ["Tornado Vortex Signature", cell.tvs || "None"],
        ["Position", formatCoords(cell.lat, cell.lon)],
        ["Scan Time", cell.valid ? formatAbsoluteTime(cell.valid) : null]
      ]);
    } else if (selected.kind === "report") {
      const report = selectedReport;
      if (!report) return null;
      icon = faFlag;
      color = `rgb(${reportStyle(report).color.join(", ")})`;
      title = titleCaseName(report.typeText);
      focus = () => navigateTo(report.lon, report.lat, Math.max(viewRef.current ? viewRef.current.zoom : 0, SOURCES.map.focusZoom));
      body = (
        <>
          {renderDetailFields([
            ["Magnitude", report.magnitude ? `${report.magnitude}${report.unit ? ` ${titleCaseName(report.unit)}` : ""}` : null],
            ["Qualifier", report.qualifier === "M" ? "Measured" : report.qualifier === "E" ? "Estimated" : report.qualifier === "U" ? "Unknown" : report.qualifier],
            ["Location", [titleCaseName(report.city), report.county ? `${titleCaseName(report.county)} County` : null, report.state].filter(Boolean).join(", ")],
            ["Reported By", report.source ? titleCaseName(report.source) : null],
            ["Office", report.wfo],
            ["Time", formatAbsoluteTime(report.valid)],
            ["Position", formatCoords(report.lat, report.lon)]
          ])}
          {report.remark && (
            <div className="satWeatherDetailText">
              <div className="satWeatherDetailTextTitle">Remarks</div>
              <div className="satWeatherDetailTextBody">{report.remark}</div>
            </div>
          )}
        </>
      );
    } else if (selected.kind === "tropical") {
      const storm = selectedTropical;
      if (!storm) return null;
      icon = faHurricane;
      color = `rgb(${(TROPICAL_COLORS[storm.classification] || [205, 212, 228]).join(", ")})`;
      title = `${TROPICAL_LABELS[storm.classification] || "Tropical Cyclone"} ${storm.name || ""}`.trim();
      focus = () => navigateTo(storm.lon, storm.lat, 5);
      body = renderDetailFields([
        ["Maximum Wind", storm.intensity === null ? null : `${storm.intensity} Kt (${Math.round(storm.intensity * 1.15078)} Mph)`],
        ["Pressure", storm.pressure === null ? null : `${storm.pressure} Mb`],
        ["Movement", storm.movementDir === null ? null : `Toward ${storm.movementDir}° At ${storm.movementSpeed} Mph`],
        ["Position", formatCoords(storm.lat, storm.lon)],
        ["Advisory", storm.advisory && storm.advisory.number ? `Number ${Number(storm.advisory.number)}` : null],
        ["Last Update", storm.lastUpdate ? formatAbsoluteTime(storm.lastUpdate) : null],
        ["Storm ID", storm.id ? storm.id.toUpperCase() : null]
      ]);
    } else if (selected.kind === "site") {
      const site = selectedSite;
      if (!site) return null;
      icon = faTowerBroadcast;
      title = `Radar ${site.id}`;
      focus = () => navigateTo(site.lon, site.lat, SOURCES.map.focusZoom);
      body = (
        <>
          {renderDetailFields([
            ["Name", titleCaseName(site.name)],
            ["Type", site.type ? titleCaseName(site.type) : null],
            ["Position", formatCoords(site.lat, site.lon)],
            ["Distance", `${Math.round(distanceMi(referencePoint.lat, referencePoint.lon, site.lat, site.lon)).toLocaleString()} Mi From ${locationActive ? locationName : "Map Center"}`]
          ])}
          <button type="button" className="satEarthCondBtn satEarthCondBtnSecondary satWeatherDetailAction" onClick={() => chooseSite(site.id)}>
            <FontAwesomeIcon icon={faSatelliteDish} /> {radarSite === site.id && singleSite ? "Showing This Radar" : "Show This Radar"}
          </button>
        </>
      );
    }
    return (
      <div className="satWeatherDetailCard">
        <div className="satWeatherDetailHeader">
          <span className="satWeatherDetailIcon" style={{ color }}><FontAwesomeIcon icon={icon} /></span>
          <span className="satWeatherDetailTitle" title={title}>{title}</span>
          {focus && (
            <button type="button" className="satWeatherDetailButton" onClick={focus} title="Zoom To">
              <FontAwesomeIcon icon={faLocationCrosshairs} />
            </button>
          )}
          <button type="button" className="satWeatherDetailButton" onClick={clearSelection} title="Close">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
        {banner && <div className="satWeatherDetailEmergency">{banner}</div>}
        <div className="satWeatherDetailScroll">{body}</div>
      </div>
    );
  };

  const renderHoverTooltip = () => {
    if (!hoverInfo || !hoverInfo.object) return null;
    const item = hoverInfo.object;
    let lines = [];
    if (hoverInfo.kind === "alert") lines = [item.event, item.areaDesc ? String(item.areaDesc).slice(0, 120) : null, `Expires ${formatClock(item.expires || item.ends)}`, hazardSummary(item) || threatLabel(item)];
    else if (hoverInfo.kind === "storm") lines = [`Storm ${stormLabel(item)}`, STORM_SEVERITY_LABELS[item.severity], [item.maxSize ? `${item.maxSize}" Hail` : null, item.maxDbz !== null ? `${item.maxDbz} dBZ` : null, item.top !== null ? `Top ${item.top} Kft` : null].filter(Boolean).join(" | ")];
    else if (hoverInfo.kind === "report") lines = [titleCaseName(item.typeText), [item.magnitude ? `${item.magnitude}${item.unit ? ` ${titleCaseName(item.unit)}` : ""}` : null, titleCaseName(item.city), item.state].filter(Boolean).join(" | "), formatAbsoluteTime(item.valid)];
    else if (hoverInfo.kind === "tropical") lines = [`${TROPICAL_LABELS[item.classification] || "Tropical Cyclone"} ${item.name || ""}`.trim(), [item.intensity !== null ? `${item.intensity} Kt` : null, item.pressure !== null ? `${item.pressure} Mb` : null].filter(Boolean).join(" | ")];
    else if (hoverInfo.kind === "tropicalPoint") lines = ["Forecast Position", [item.properties.FLDATELBL || item.properties.DATELBL || null, item.properties.TAU !== undefined ? `${item.properties.TAU} Hour Forecast` : null].filter(Boolean).join(" | "), item.properties.MAXWIND ? `${item.properties.MAXWIND} Kt` : null];
    else if (hoverInfo.kind === "site") lines = [`Radar ${item.id}`, titleCaseName(item.name)];
    else if (hoverInfo.kind === "outlook") lines = [item.feature.label2 || item.feature.label, item.feature.valid ? `Valid ${formatAbsoluteTime(item.feature.valid)}` : null];
    return (
      <div className="satWeatherTooltip" style={{ left: hoverInfo.x + 14, top: hoverInfo.y + 14 }}>
        {lines.filter(Boolean).map((line, index) => <div key={index} className={index === 0 ? "satWeatherTooltipTitle" : "satWeatherTooltipLine"}>{line}</div>)}
      </div>
    );
  };

  const legend = radarData && layerVisibility.radar ? RADAR_LEGENDS[radarData.legend] || RADAR_LEGENDS.reflectivity : null;

  const cycleSpeed = () => {
    const index = SOURCES.playback.speeds.findIndex(([value]) => value === playbackSpeed);
    setPlaybackSpeed(SOURCES.playback.speeds[(index + 1) % SOURCES.playback.speeds.length][0]);
  };

  const topAlert = tornadoAlerts[0] || null;

  const renderMapView = () => (
    <div className="satWeatherMapView" style={{ display: activeTab === "map" ? "flex" : "none" }}>
      <div className="satWeatherViewHeader">
        <div className="satWeatherHeaderControls">
          {refreshing && (
            <div className="satWeatherLocationDisplay">
              <FontAwesomeIcon icon={faSpinner} spin className="satWeatherLocationIcon" />
            </div>
          )}
          <div className="satWeatherLocationDisplay">
            <FontAwesomeIcon icon={faLocationCrosshairs} className="satWeatherLocationIcon" />
            <span>{`${viewState.lat.toFixed(2)}°, ${viewState.lon.toFixed(2)}° | Zoom ${viewState.zoom.toFixed(1)}`}</span>
          </div>
          <div className="satWeatherCameraInfo"><span>{`Alerts In View: ${alertsInView.length.toLocaleString()}`}</span></div>
          <div className="satWeatherCameraInfo"><span>{`Cells In View: ${cellsInView.length.toLocaleString()}`}</span></div>
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
          <button className="satWeatherHeaderButton" onClick={resetView} title={locationActive ? "Return To Selected Area" : "Reset To National View"}>
            <FontAwesomeIcon icon={faGlobeAmericas} /> Reset View
          </button>
        </div>
      </div>
      <div className={`satWeatherMapWrapper ${selected ? "satWeatherMapWrapperDetail" : ""}`}>
        <div ref={mapContainerRef} className="satWeatherMapContainer" onMouseLeave={() => setHoverInfo(null)} />
        {topAlert && (
          <button type="button" className="satWeatherModeIndicator satWeatherModeIndicatorAlert" style={{ zIndex: 2000 }} onClick={() => focusAlert(topAlert)}>
            <span className="satWeatherModePulse" />
            <span>{tornadoAlerts.length === 1 ? `${threatLabel(topAlert) || topAlert.event} | ${String(topAlert.areaDesc || "").split(";")[0]}` : `${tornadoAlerts.length} Tornado Warnings ${locationActive ? "In This Area" : "Active"}`}</span>
          </button>
        )}
        {renderDetailCard()}
        {renderHoverTooltip()}
        {legend && (
          <div className="satWeatherLegend">
            <div className="satWeatherLegendTitle">{legend.title}</div>
            <div className="satWeatherLegendBar" style={{ background: `linear-gradient(to right, ${legend.stops.join(", ")})` }} />
            <div className="satWeatherLegendTicks">
              {legend.ticks.map((tick) => <span key={tick}>{tick}</span>)}
            </div>
            <div className="satWeatherLegendSource">{radarData.label}{radarData.radar && SINGLE_SITE_PRODUCTS.has(radarData.product) ? ` | ${radarData.radar}` : ""}</div>
          </div>
        )}
        {layerVisibility.radar && frames.length > 0 && (
          <div className="satWeatherPlayback">
            <button type="button" className="satWeatherPlaybackButton" onClick={() => { setPlaying(false); setFrameIndex((index) => Math.max(0, index - 1)); }} title="Previous Frame">
              <FontAwesomeIcon icon={faBackwardStep} />
            </button>
            <button type="button" className={`satWeatherPlaybackButton ${playing ? "satWeatherPlaybackButtonActive" : ""}`} onClick={() => setPlaying((value) => !value)} title={playing ? "Pause" : "Play"}>
              <FontAwesomeIcon icon={playing ? faPause : faPlay} />
            </button>
            <button type="button" className="satWeatherPlaybackButton" onClick={() => { setPlaying(false); setFrameIndex((index) => Math.min(frames.length - 1, index + 1)); }} title="Next Frame">
              <FontAwesomeIcon icon={faForwardStep} />
            </button>
            <input type="range" className="satWeatherPlaybackSlider" min={0} max={frames.length - 1} step={1} value={Math.min(frameIndex, frames.length - 1)} onChange={(event) => { setPlaying(false); setFrameIndex(Number(event.target.value)); }} />
            <span className="satWeatherPlaybackTime">{currentFrame ? `${formatClock(currentFrame.time)} | ${formatRelativeTime(currentFrame.time)}` : "—"}</span>
            <button type="button" className="satWeatherPlaybackSpeed" onClick={cycleSpeed} title="Change Playback Speed">{labelFor(SOURCES.playback.speeds, playbackSpeed).replace(" Playback", "")}</button>
          </div>
        )}
        {(radarError || mapError) && (
          <div className="satWeatherMapError" style={{ zIndex: 2000 }}>{mapError || radarError}</div>
        )}
        {!mapReady && (
          <div className="satWeatherMapLoadingOverlay" style={{ zIndex: 2001 }}>
            <div className="satWeatherMapLoadingContent">
              <div className="loading-circle" />
              {mapError && <small className="satWeatherMapProviderError">{mapError}</small>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
  const renderLocalConditions = () => {
    if (!locationActive) {
      return [[{ title: "Local Conditions", badge: "LIVE", content: <div className="satEarthCondNoChartData">Choose A Location To See Local Conditions</div>, description: "Pick a place in the sidebar to see its current conditions, a precipitation nowcast, the hourly forecast, and every alert covering that exact point." }]];
    }
    const forecast = pointData ? pointData.forecast : null;
    const current = forecast ? forecast.current || {} : {};
    const minutely = forecast ? forecast.minutely_15 || {} : {};
    const hourly = forecast ? forecast.hourly || {} : {};
    const pointAlerts = pointData ? pointData.alerts || [] : [];
    const localTiles = [
      { label: "Temperature", value: formatNumber(current.temperature_2m, " °F", 1), detail: `Humidity ${formatNumber(current.relative_humidity_2m, "%")}`, icon: faTemperatureHalf },
      { label: "Conditions", value: WEATHER_CODES[current.weather_code] || "—", detail: `Cloud Cover ${formatNumber(current.cloud_cover, "%")}`, icon: faCloudRain },
      { label: "Wind", value: formatNumber(current.wind_speed_10m, " Mph"), detail: `Gusts ${formatNumber(current.wind_gusts_10m, " Mph")} From ${formatNumber(current.wind_direction_10m, "°")}`, icon: faWind },
      { label: "Precipitation", value: formatNumber(current.precipitation, " In", 2), detail: "Current Hour", icon: faDroplet },
      { label: "Pressure", value: formatNumber(current.surface_pressure, " hPa", 1), detail: "Surface Pressure", icon: faTachometerAlt },
      { label: "Alerts Here", value: formatNumber(pointAlerts.length), detail: pointAlerts[0] ? pointAlerts[0].event : "No Active Alerts At This Point", color: pointAlerts.length ? pointAlerts[0].color : "#4ecdc4", icon: faExclamationTriangle }
    ];
    const nowcastLabels = (minutely.time || []).map((time) => new Date(time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
    const nowcastChart = createLineChart("Precipitation Nowcast", nowcastLabels, [{ name: "Precipitation", data: minutely.precipitation || [], color: "#42a5f5", bar: true }], " In");
    const hourlyLabels = (hourly.time || []).map((time) => new Date(time).toLocaleString([], { weekday: "short", hour: "numeric" }));
    const hourlyChart = createLineChart("Hourly Precipitation", hourlyLabels, [
      { name: "Chance", data: hourly.precipitation_probability || [], color: "#4ecdc4" },
      { name: "Amount (In)", data: hourly.precipitation || [], color: "#42a5f5", axis: 1, bar: true }
    ], "");
    const instabilityChart = createLineChart("Instability", hourlyLabels, [
      { name: "CAPE (J/Kg)", data: hourly.cape || [], color: "#FF9500" },
      { name: "Lifted Index", data: hourly.lifted_index || [], color: "#B388FF", axis: 1 }
    ], "");
    const gustChart = createLineChart("Temperature And Gusts", hourlyLabels, [
      { name: "Temperature (°F)", data: hourly.temperature_2m || [], color: "#ffd93d" },
      { name: "Gusts (Mph)", data: hourly.wind_gusts_10m || [], color: "#7fe9e1", axis: 1 }
    ], "");
    return [
      [{ title: `Conditions At ${locationName}`, badge: "LIVE", content: pointError && !pointData ? <div className="satEarthCondNoChartData">{pointError}</div> : renderTiles(localTiles), description: `Current conditions come from the Open-Meteo best-match model blend for ${selectedLat.toFixed(3)}°, ${selectedLon.toFixed(3)}°. ${pointData && pointData.forecastError ? `The last forecast refresh failed with the error "${String(pointData.forecastError).replace(/\.$/, "")}".` : ""}`.trim() }],
      [
        { title: "Precipitation Nowcast", badge: "FORECAST", chart: nowcastChart, content: renderChart(nowcastChart), axes: ["Time", "Inches Per 15 Minutes"], description: "Precipitation in 15-minute steps for the next four hours. In North America this comes from the HRRR model, and elsewhere it is interpolated from hourly data." },
        { title: "Hourly Precipitation", badge: "FORECAST", chart: hourlyChart, content: renderChart(hourlyChart), axes: ["Time", "Percent And Inches"], description: "The chance of precipitation and the expected amount for each of the next 48 hours." }
      ],
      [
        { title: "Instability", badge: "FORECAST", chart: instabilityChart, content: renderChart(instabilityChart), axes: ["Time", "J/Kg And Index"], description: "Convective available potential energy measures how much energy a rising parcel of air can gain, and values above 1,000 J/Kg support strong storms. A negative lifted index means the atmosphere is unstable." },
        { title: "Temperature And Gusts", badge: "FORECAST", chart: gustChart, content: renderChart(gustChart), axes: ["Time", "°F And Mph"], description: "Hourly temperature and the strongest expected wind gust for the next 48 hours." }
      ],
      [{ title: `Alerts Covering ${locationName}`, badge: "LIVE", content: renderTable("Alerts At This Point", ["Alert", "Severity", "Areas", "Issued", "Expires", "Hazards", "Issued By"], pointAlerts.map(alertRow), { emptyText: pointData && pointData.alertsError ? `The point alert lookup failed with the error "${String(pointData.alertsError).replace(/\.$/, "")}".` : "No National Weather Service alerts cover this exact point right now.", onRowClick: (index) => { const match = alerts.find((alert) => alert.id === pointAlerts[index].id); if (match) focusAlert(match); } }), description: "This asks the National Weather Service which active alerts contain the selected point, which is more precise than the area radius used elsewhere on the page. Select a row to open the alert on the map." }]
    ];
  };

  const renderSnapshotScale = (value, max, gradient, label) => (
    <div className="satWeatherSnapScale" title={label}>
      <div className="satWeatherSnapScaleTrack" style={{ background: gradient }} />
      <span className="satWeatherSnapScaleMarker" style={{ left: `${Math.max(0, Math.min(100, (value / max) * 100))}%` }} />
    </div>
  );

  const renderSnapshotMetric = (value, label, color) => (
    <div className="satWeatherSnapMetric">
      <span className="satWeatherSnapMetricValue" style={color ? { color } : undefined}>{value}</span>
      {label && <span className="satWeatherSnapMetricLabel">{label}</span>}
    </div>
  );

  const renderSnapshotInsight = (key) => {
    const card = snapshotAnalysis.data && snapshotAnalysis.data.cards ? snapshotAnalysis.data.cards[key] : null;
    if (!card && !snapshotAnalysis.loading) return null;
    return (
      <div className="satWeatherSnapInsight">
        <div className="satWeatherSnapInsightTitle"><FontAwesomeIcon icon={faLightbulb} /> AI Insight</div>
        {card ? (
          <>
            {card.insight && <p>{card.insight}</p>}
            {card.action && <p className="satWeatherSnapInsightAction"><FontAwesomeIcon icon={faCheck} /> <span>{card.action}</span></p>}
          </>
        ) : <p className="satWeatherSnapInsightPending"><FontAwesomeIcon icon={faSpinner} spin /> Generating Insight</p>}
      </div>
    );
  };

  const renderSnapshotBriefing = () => {
    const briefing = snapshotAnalysis.data;
    return (
      <div className="satWeatherSnapBriefing">
        <div className="satWeatherSnapInsightTitle"><FontAwesomeIcon icon={faLightbulb} /> AI Briefing</div>
        {snapshotAnalysis.error && !briefing && <div className="satWeatherDetailError">{snapshotAnalysis.error}</div>}
        {!briefing && !snapshotAnalysis.error && <p className="satWeatherSnapInsightPending"><FontAwesomeIcon icon={faSpinner} spin /> Generating The Briefing</p>}
        {briefing && (
          <>
            {briefing.headline && <p className="satWeatherSnapBriefingHeadline">{briefing.headline}</p>}
            {briefing.summary && <p className="satWeatherSnapText">{briefing.summary}</p>}
            {briefing.actions.length > 0 && (
              <div className="satWeatherSnapActions">
                <div className="satWeatherSnapActionsTitle">Action Points</div>
                {briefing.actions.map((action, index) => (
                  <div key={index} className="satWeatherSnapAction">
                    <span className="satWeatherSnapActionIndex">{index + 1}</span>
                    <span>{action}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="satWeatherSnapUpdated">{`Generated By ${briefing.model} At ${formatClock(briefing.generatedAt)} From The Live Forecast`}</div>
          </>
        )}
      </div>
    );
  };

  const renderSnapshotCard = ({ head, scale, text, visual, rows }) => (
    <div className="satWeatherSnapCard">
      <div className="satWeatherSnapHead">{head}</div>
      {scale !== undefined && <div className="satWeatherSnapScaleSlot">{scale}</div>}
      <p className="satWeatherSnapText satWeatherSnapTextFixed" title={text}>{text}</p>
      {visual !== undefined && <div className="satWeatherSnapVisual">{visual}</div>}
      <div className="satWeatherDetailList satWeatherSnapRows">
        {rows.map(([label, entry]) => (
          <div key={label} className="satWeatherDetailRow">
            <span className="satWeatherDetailRowLabel" title={label}>{label}</span>
            <span className="satWeatherDetailRowValue" title={entry === null || entry === undefined || entry === "" ? "—" : String(entry)}>{entry === null || entry === undefined || entry === "" ? "—" : String(entry)}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSnapshotTrend = (label, entries, format, color, fixedMax, hideRange) => {
    const values = entries.map((entry) => entry.value).filter((entry) => entry !== null && entry !== undefined && !isNaN(entry));
    if (!values.length) return <div className="satEarthCondNoChartData">No Hourly Data Available</div>;
    const low = Math.min(...values);
    const high = fixedMax !== undefined ? fixedMax : Math.max(...values);
    const floor = fixedMax !== undefined ? 0 : Math.min(low, high - 1);
    return (
      <div className="satWeatherSnapTrend">
        <div className="satWeatherSnapTrendHeader">
          <span>{label}</span>
          {!hideRange && <span>{`${format(Math.min(...values))} To ${format(Math.max(...values))}`}</span>}
        </div>
        <div className="satWeatherSnapTrendBars">
          {entries.map((entry) => (
            <span key={entry.time} className="satWeatherSnapTrendSlot" title={`${entry.label} | ${entry.value === null || entry.value === undefined ? "—" : format(entry.value)}`}>
              <span className="satWeatherSnapTrendBar" style={{ height: `${entry.value === null || entry.value === undefined ? 0 : Math.max(4, ((entry.value - floor) / Math.max(0.0001, high - floor)) * 100)}%`, background: typeof color === "function" ? color(entry.value) : color }} />
            </span>
          ))}
        </div>
        <div className="satWeatherSnapTrendAxis">
          <span>{entries[0].label}</span>
          <span>{entries[Math.floor(entries.length / 2)].label}</span>
          <span>{entries[entries.length - 1].label}</span>
        </div>
      </div>
    );
  };

  const renderSnapshotTab = () => {
    if (!snapshotTarget) {
      return (
        <div className="satEarthCondOverviewTab">
          {renderSection("Local Weather", faCloudSun, [[{ title: "Local Weather", badge: "LIVE", content: <div className="satEarthCondNoChartData">Choose A Location Or A Monitored Area To See Its Local Weather</div>, description: "Pick a place or select a monitored area in the sidebar to see its current conditions, the hourly and ten-day forecast, air quality, the sun and moon, and how today compares with the long-term average." }]])}
        </div>
      );
    }
    if (!snapshotData) {
      return (
        <div className="satEarthCondOverviewTab">
          {renderSection(`Local Weather For ${snapshotTarget.label}`, faCloudSun, [[{ title: "Local Weather", badge: "LIVE", content: snapshotError ? <div className="satWeatherDetailError">{snapshotError}</div> : <div className="satEarthCondLoadingState"><div className="loading-circle" /></div>, description: "The snapshot combines the Open-Meteo forecast, the Open-Meteo air quality forecast, a 30-year reanalysis average, and National Weather Service alerts for this exact point." }]])}
        </div>
      );
    }
    const forecast = snapshotData.forecast || {};
    const offset = Number(forecast.utc_offset_seconds) || 0;
    const current = forecast.current || {};
    const hourly = forecast.hourly || {};
    const daily = forecast.daily || {};
    const minutely = forecast.minutely_15 || {};
    const air = snapshotData.airQuality ? snapshotData.airQuality.current || {} : null;
    const astro = snapshotData.astronomy || { sun: {}, moon: {} };
    const averages = snapshotData.averages;
    const pointAlerts = snapshotData.alerts || [];
    const nowText = current.time || utcToLocalText(new Date().toISOString(), offset);
    const todayText = nowText.slice(0, 10);
    const hourTimes = hourly.time || [];
    const hourIndex = Math.max(0, hourTimes.findIndex((time) => time.slice(0, 13) === nowText.slice(0, 13)));
    const dayTimes = daily.time || [];
    const todayIndex = Math.max(0, dayTimes.indexOf(todayText));
    const value = (series, index) => (series && series[index] !== undefined && series[index] !== null ? Number(series[index]) : null);
    const trendEntries = (series, from, count) => hourTimes.slice(Math.max(0, from), Math.max(0, from) + count).map((time, step) => ({ time, label: Math.max(0, from) + step === hourIndex ? "Now" : localHourLabel(time), value: value(series, Math.max(0, from) + step) }));
    const todayHigh = value(daily.temperature_2m_max, todayIndex);
    const todayLow = value(daily.temperature_2m_min, todayIndex);
    const conditionText = WEATHER_CODES[current.weather_code] || "—";
    const gustText = value(daily.wind_gusts_10m_max, todayIndex) !== null ? ` Wind gusts reach ${Math.round(value(daily.wind_gusts_10m_max, todayIndex))} mph.` : "";
    const rainText = value(daily.precipitation_probability_max, todayIndex) >= 30 ? ` There is a ${Math.round(value(daily.precipitation_probability_max, todayIndex))}% chance of precipitation.` : "";
    const summaryText = `${WEATHER_CODES[value(daily.weather_code, todayIndex)] || conditionText} today with a high of ${todayHigh !== null ? Math.round(todayHigh) : "—"}° and a low of ${todayLow !== null ? Math.round(todayLow) : "—"}°.${rainText}${gustText}`;

    const hero = (
      <div className="satWeatherSnapHero">
        <div className="satWeatherSnapHeroMain">
          <FontAwesomeIcon icon={snapshotIcon(current.weather_code, current.is_day)} className="satWeatherSnapHeroIcon" />
          <div className="satWeatherSnapHeroReadout">
            <span className="satWeatherSnapHeroTemp">{formatNumber(current.temperature_2m, "°")}</span>
            <span className="satWeatherSnapHeroCondition">{conditionText}</span>
            <span className="satWeatherSnapHeroRange">{`H: ${formatNumber(todayHigh, "°")} | L: ${formatNumber(todayLow, "°")} | Feels Like ${formatNumber(current.apparent_temperature, "°")}`}</span>
          </div>
        </div>
        <div className="satWeatherSnapHeroSide">
          <p className="satWeatherSnapText">{summaryText}</p>
          {pointAlerts.length > 0 ? (
            <button type="button" className="satWeatherSnapAlertStrip" style={{ borderLeftColor: pointAlerts[0].color || "#ff6b6b" }} onClick={() => { const match = alerts.find((alert) => alert.id === pointAlerts[0].id); if (match) focusAlert(match); }}>
              <FontAwesomeIcon icon={faExclamationTriangle} style={{ color: pointAlerts[0].color || "#ff6b6b" }} />
              <span>{pointAlerts.length === 1 ? pointAlerts[0].event : `${pointAlerts[0].event} And ${pointAlerts.length - 1} More`}</span>
            </button>
          ) : (
            <div className="satWeatherSnapQuiet"><FontAwesomeIcon icon={faCheckCircle} /> No Active Alerts At This Point</div>
          )}
          <div className="satWeatherSnapUpdated">{`Local Time ${localClock(nowText)} | ${forecast.timezone_abbreviation || forecast.timezone || ""} | Updated ${formatRelativeTime(snapshotData.updatedAt)}`}</div>
        </div>
      </div>
    );

    const hourEntries = [];
    for (let index = hourIndex; index < Math.min(hourTimes.length, hourIndex + 25); index += 1) {
      hourEntries.push({ kind: "hour", time: hourTimes[index], label: index === hourIndex ? "Now" : localHourLabel(hourTimes[index]), icon: snapshotIcon(value(hourly.weather_code, index), value(hourly.is_day, index)), temp: index === hourIndex ? current.temperature_2m : value(hourly.temperature_2m, index), chance: value(hourly.precipitation_probability, index) });
    }
    const windowEnd = hourEntries.length ? hourEntries[hourEntries.length - 1].time : null;
    for (const [key, label, icon] of [["sunrise", "Sunrise", faSun], ["sunset", "Sunset", faMoon]]) {
      for (const time of daily[key] || []) {
        if (time > nowText && windowEnd && time < windowEnd) hourEntries.push({ kind: "sun", time, label: localClock(time), icon, temp: null, note: label });
      }
    }
    hourEntries.sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));
    const hourlyStrip = (
      <div className="satWeatherSnapHourly">
        {hourEntries.map((entry) => (
          <div key={`${entry.kind}_${entry.time}`} className={`satWeatherSnapHour ${entry.kind === "sun" ? "satWeatherSnapHourSun" : ""}`}>
            <span className="satWeatherSnapHourLabel">{entry.label}</span>
            <FontAwesomeIcon icon={entry.icon} className="satWeatherSnapHourIcon" />
            <span className="satWeatherSnapHourChance">{entry.kind === "hour" && entry.chance >= 20 ? `${Math.round(entry.chance)}%` : " "}</span>
            <span className="satWeatherSnapHourTemp">{entry.kind === "sun" ? entry.note : formatNumber(entry.temp, "°")}</span>
          </div>
        ))}
      </div>
    );

    const dayIndices = dayTimes.map((time, index) => index).filter((index) => index >= todayIndex).slice(0, 10);
    const weekLow = Math.min(...dayIndices.map((index) => value(daily.temperature_2m_min, index)).filter((entry) => entry !== null));
    const weekHigh = Math.max(...dayIndices.map((index) => value(daily.temperature_2m_max, index)).filter((entry) => entry !== null));
    const span = Math.max(1, weekHigh - weekLow);
    const tenDay = (
      <div className="satWeatherSnapDays">
        {dayIndices.map((index) => {
          const low = value(daily.temperature_2m_min, index);
          const high = value(daily.temperature_2m_max, index);
          const chance = value(daily.precipitation_probability_max, index);
          const isToday = index === todayIndex;
          return (
            <div key={dayTimes[index]} className="satWeatherSnapDay" title={`${localDateLabel(dayTimes[index])} | ${WEATHER_CODES[value(daily.weather_code, index)] || "—"}`}>
              <span className="satWeatherSnapDayName">{isToday ? "Today" : localWeekday(dayTimes[index])}</span>
              <span className="satWeatherSnapDayIcon">
                <FontAwesomeIcon icon={snapshotIcon(value(daily.weather_code, index), 1)} />
                <small>{chance >= 20 ? `${Math.round(chance)}%` : " "}</small>
              </span>
              <span className="satWeatherSnapDayLow">{formatNumber(low, "°")}</span>
              <span className="satWeatherSnapRange">
                {low !== null && high !== null && <span className="satWeatherSnapRangeFill" style={{ left: `${((low - weekLow) / span) * 100}%`, width: `${Math.max(2, ((high - low) / span) * 100)}%`, background: temperatureGradient(low, high) }} />}
                {isToday && current.temperature_2m !== undefined && <span className="satWeatherSnapRangeDot" style={{ left: `${Math.max(0, Math.min(100, ((current.temperature_2m - weekLow) / span) * 100))}%` }} />}
              </span>
              <span className="satWeatherSnapDayHigh">{formatNumber(high, "°")}</span>
            </div>
          );
        })}
      </div>
    );

    const steps = (minutely.time || []).map((time, index) => ({ time, amount: value(minutely.precipitation, index) || 0 }));
    const firstWet = steps.findIndex((step) => step.amount > 0);
    const wetNow = steps.length && steps[0].amount > 0;
    const firstDry = wetNow ? steps.findIndex((step) => step.amount === 0) : -1;
    const maxAmount = Math.max(0.01, ...steps.map((step) => step.amount));
    const nextHourText = !steps.length ? "The precipitation nowcast is unavailable for this place." : wetNow ? (firstDry > 0 ? `Precipitation is falling now and should end around ${localClock(steps[firstDry].time)}.` : "Precipitation is falling now and should continue for at least the next two hours.") : firstWet > 0 ? `Precipitation should begin around ${localClock(steps[firstWet].time)}.` : "No precipitation is expected in the next two hours.";
    const nextHour = (
      <div className="satWeatherSnapNowcast">
        <p className="satWeatherSnapText">{nextHourText}</p>
        <div className="satWeatherSnapNowcastBars">
          {steps.map((step) => (
            <div key={step.time} className="satWeatherSnapNowcastSlot" title={`${localClock(step.time)} | ${step.amount.toFixed(2)} In`}>
              <span className="satWeatherSnapNowcastBar" style={{ height: `${step.amount > 0 ? Math.max(8, (step.amount / maxAmount) * 100) : 0}%` }} />
            </div>
          ))}
        </div>
        <div className="satWeatherSnapNowcastAxis">{steps.filter((step, index) => index % 2 === 0).map((step, index) => <span key={step.time}>{index === 0 ? "Now" : localClock(step.time)}</span>)}</div>
        {renderSnapshotTrend("Precipitation Chance Next 12 Hours", trendEntries(hourly.precipitation_probability, hourIndex, 12), (entry) => `${Math.round(entry)}%`, "#42a5f5", 100)}
        {renderDetailFields([
          ["Expected Next 2 Hours", `${steps.reduce((sum, step) => sum + step.amount, 0).toFixed(2)} In`],
          ["Heaviest 15 Minutes", steps.length && maxAmount > 0.01 ? `${maxAmount.toFixed(2)} In At ${localClock(steps.find((step) => step.amount === maxAmount).time)}` : "None"],
          ["Cloud Cover Now", formatNumber(current.cloud_cover, "%")]
        ])}
      </div>
    );

    const aqi = air && air.us_aqi !== null && air.us_aqi !== undefined ? Number(air.us_aqi) : null;
    const aqiLevel = aqi !== null && !isNaN(aqi) ? levelFor(AQI_LEVELS, aqi) : null;
    const primary = air ? AQI_POLLUTANTS.filter(([key]) => air[key] !== null && air[key] !== undefined).sort((a, b) => air[b[0]] - air[a[0]])[0] : null;
    const pollen = air ? POLLEN_TYPES.filter(([key]) => air[key] !== null && air[key] !== undefined && air[key] > 0).map(([key, label]) => `${label} ${Math.round(air[key])}`) : [];
    const pollutantRow = (label) => {
      const entry = AQI_POLLUTANTS.find((item) => item[1] === label);
      return [label, air && air[entry[2]] !== null && air[entry[2]] !== undefined ? `${formatNumber(air[entry[2]], ` ${entry[3]}`, 1)} | AQI ${formatNumber(air[entry[0]])}` : null];
    };
    const airHourly = snapshotData.airQuality && snapshotData.airQuality.hourly ? snapshotData.airQuality.hourly : null;
    const airCard = renderSnapshotCard({
      head: renderSnapshotMetric(aqiLevel ? Math.round(aqi) : "—", aqiLevel ? aqiLevel[1] : "Unavailable", aqiLevel ? aqiLevel[2] : undefined),
      scale: aqiLevel ? renderSnapshotScale(Math.min(aqi, 300), 300, "linear-gradient(90deg, #4ecdc4 0%, #ffd93d 25%, #FF9500 42%, #ff6b6b 58%, #B388FF 80%, #c2185b 100%)", `US AQI ${Math.round(aqi)}`) : null,
      text: aqiLevel ? `${AQI_GUIDANCE[aqiLevel[1]]}${primary ? ` The main pollutant is ${primary[1]}.` : ""}${pollen.length ? ` Pollen: ${pollen.join(", ")}.` : ""}` : "The air quality forecast is unavailable for this place right now.",
      visual: aqiLevel && airHourly ? renderSnapshotTrend("Next 24 Hours", (airHourly.time || []).slice(0, 24).map((time, index) => ({ time, label: index === 0 ? "Now" : localHourLabel(time), value: airHourly.us_aqi ? airHourly.us_aqi[index] : null })), (entry) => `AQI ${Math.round(entry)}`, (entry) => levelFor(AQI_LEVELS, entry || 0)[2]) : <div className="satWeatherDetailError">{snapshotData.airQualityError ? `The air quality forecast failed with the error "${String(snapshotData.airQualityError).replace(/\.$/, "")}".` : "No air quality forecast covers this place."}</div>,
      rows: [pollutantRow("PM2.5"), pollutantRow("PM10"), pollutantRow("Ozone"), pollutantRow("Nitrogen Dioxide")]
    });

    const uv = Number(current.uv_index) || 0;
    const uvLevel = levelFor(UV_LEVELS, uv);
    const todayHours = hourTimes.map((time, index) => [time, value(hourly.uv_index, index)]).filter(([time, level]) => time.slice(0, 10) === todayText && level !== null);
    const protectHours = todayHours.filter(([, level]) => level >= 3);
    const remainingProtect = protectHours.filter(([time]) => time >= nowText.slice(0, 13));
    const peakHour = todayHours.length ? todayHours.reduce((best, entry) => (entry[1] > best[1] ? entry : best), todayHours[0]) : null;
    const hourAfter = (time) => localHourLabel(`${time.slice(0, 11)}${String((Number(time.slice(11, 13)) + 1) % 24).padStart(2, "0")}:00`);
    const uvCard = renderSnapshotCard({
      head: renderSnapshotMetric(Math.round(uv), uvLevel[1], uvLevel[2]),
      scale: renderSnapshotScale(Math.min(uv, 11), 11, "linear-gradient(90deg, #4ecdc4 0%, #ffd93d 30%, #FF9500 55%, #ff6b6b 75%, #B388FF 100%)", `UV Index ${uv.toFixed(1)}`),
      text: remainingProtect.length ? `Use sun protection until ${hourAfter(remainingProtect[remainingProtect.length - 1][0])}.` : uv >= 3 ? "Use sun protection now." : "The UV index stays low for the rest of the day.",
      visual: renderSnapshotTrend("Next 24 Hours", trendEntries(hourly.uv_index, hourIndex, 24), (entry) => entry.toFixed(0), (entry) => levelFor(UV_LEVELS, entry || 0)[2], 11),
      rows: [
        ["Maximum Today", formatNumber(value(daily.uv_index_max, todayIndex), "", 1)],
        ["Category Today", levelFor(UV_LEVELS, value(daily.uv_index_max, todayIndex) || 0)[1]],
        ["Peak Time Today", peakHour && peakHour[1] > 0 ? localHourLabel(peakHour[0]) : "None"],
        ["Protection Window", protectHours.length ? `${localHourLabel(protectHours[0][0])} To ${hourAfter(protectHours[protectHours.length - 1][0])}` : "None"]
      ]
    });

    const sunriseToday = (daily.sunrise || [])[todayIndex];
    const sunsetToday = (daily.sunset || [])[todayIndex];
    const sunriseTomorrow = (daily.sunrise || [])[todayIndex + 1];
    const nextSun = sunriseToday && nowText < sunriseToday ? ["Sunrise", sunriseToday] : sunsetToday && nowText < sunsetToday ? ["Sunset", sunsetToday] : ["Sunrise", sunriseTomorrow];
    const dayProgress = sunriseToday && sunsetToday ? Math.max(0, Math.min(1, (Date.parse(`${nowText}Z`) - Date.parse(`${sunriseToday}Z`)) / (Date.parse(`${sunsetToday}Z`) - Date.parse(`${sunriseToday}Z`)))) : 0;
    const daylightToday = value(daily.daylight_duration, todayIndex);
    const daylightYesterday = value(daily.daylight_duration, todayIndex - 1);
    const sunCard = renderSnapshotCard({
      head: renderSnapshotMetric(nextSun[1] ? localClock(nextSun[1]) : "—", nextSun[0]),
      scale: (
        <div className="satWeatherSnapDaylight" title="Daylight Progress">
          <span className="satWeatherSnapDaylightFill" style={{ width: `${dayProgress * 100}%` }} />
        </div>
      ),
      text: `First light is at ${localClock(utcToLocalText(astro.sun.firstLight, offset))} and last light is at ${localClock(utcToLocalText(astro.sun.lastLight, offset))}, with the Sun ${astro.sun.noonAltitude !== null && astro.sun.noonAltitude !== undefined ? `${Math.round(astro.sun.noonAltitude)}° high` : "highest"} at ${localClock(utcToLocalText(astro.sun.solarNoon, offset))}.`,
      visual: renderSnapshotTrend("Daylight Next 24 Hours", trendEntries(hourly.is_day, hourIndex, 24), (entry) => (entry ? "Day" : "Night"), (entry) => (entry ? "#ffd93d" : "#3d4354"), 1, true),
      rows: [
        ["Sunrise", localClock(sunriseToday)],
        ["Sunset", localClock(sunsetToday)],
        ["Daylight", daylightToday !== null ? durationText(daylightToday) : null],
        ["Change From Yesterday", daylightToday !== null && daylightYesterday !== null ? `${daylightToday >= daylightYesterday ? "+" : "-"}${Math.round(Math.abs(daylightToday - daylightYesterday) / 6) / 10} Min` : null]
      ]
    });

    const windSpeed = Number(current.wind_speed_10m) || 0;
    const windDirection = current.wind_direction_10m !== undefined && current.wind_direction_10m !== null ? Number(current.wind_direction_10m) : null;
    const windCard = renderSnapshotCard({
      head: (
        <>
          <WindCompass direction={windDirection} />
          {renderSnapshotMetric(`${Math.round(windSpeed)} Mph`, levelFor(BEAUFORT_LEVELS, windSpeed)[1])}
        </>
      ),
      scale: renderSnapshotScale(Math.min(windSpeed, 50), 50, "linear-gradient(90deg, #4ecdc4 0%, #7fe9e1 30%, #ffd93d 55%, #FF9500 75%, #ff6b6b 100%)", `${Math.round(windSpeed)} Mph`),
      text: `${windDirection !== null ? `The wind is blowing from the ${compassPoint(windDirection)}` : "The wind direction is unavailable"}${current.wind_gusts_10m !== undefined && current.wind_gusts_10m !== null ? ` with gusts to ${Math.round(current.wind_gusts_10m)} mph` : ""}.`,
      visual: renderSnapshotTrend("Gusts Next 24 Hours", trendEntries(hourly.wind_gusts_10m, hourIndex, 24), (entry) => `${Math.round(entry)} Mph`, "#7fe9e1"),
      rows: [
        ["Gusts", formatNumber(current.wind_gusts_10m, " Mph")],
        ["Direction", windDirection !== null ? `${Math.round(windDirection)}° ${compassPoint(windDirection)}` : null],
        ["Strongest Gust Today", formatNumber(value(daily.wind_gusts_10m_max, todayIndex), " Mph")],
        ["Prevailing Today", value(daily.wind_direction_10m_dominant, todayIndex) !== null ? `From The ${compassPoint(value(daily.wind_direction_10m_dominant, todayIndex))}` : null]
      ]
    });

    const sumRange = (series, from, to) => (series || []).slice(Math.max(0, from), Math.max(0, to)).reduce((sum, entry) => sum + (Number(entry) || 0), 0);
    const lastDay = sumRange(hourly.precipitation, hourIndex - 24, hourIndex);
    const nextDay = sumRange(hourly.precipitation, hourIndex, hourIndex + 24);
    const snowNext = sumRange(hourly.snowfall, hourIndex, hourIndex + 24);
    const precipitationCard = renderSnapshotCard({
      head: renderSnapshotMetric(`${lastDay.toFixed(2)} In`, "In The Last 24 Hours"),
      scale: renderSnapshotScale(Math.min(nextDay, 2), 2, "linear-gradient(90deg, #3d4354 0%, #42a5f5 100%)", `${nextDay.toFixed(2)} In Next 24 Hours`),
      text: nextDay >= 0.01 ? `${nextDay.toFixed(2)} in is expected in the next 24 hours.` : "No measurable precipitation is expected in the next 24 hours.",
      visual: renderSnapshotTrend("Chance Next 24 Hours", trendEntries(hourly.precipitation_probability, hourIndex, 24), (entry) => `${Math.round(entry)}%`, "#42a5f5", 100),
      rows: [
        ["Chance Today", formatNumber(value(daily.precipitation_probability_max, todayIndex), "%")],
        ["Expected Today", formatNumber(value(daily.precipitation_sum, todayIndex), " In", 2)],
        ["Snow Next 24 Hours", snowNext >= 0.1 ? `${snowNext.toFixed(1)} In` : "None"],
        ["Ten-Day Total", `${sumRange(daily.precipitation_sum, todayIndex, todayIndex + 10).toFixed(2)} In`]
      ]
    });

    const feels = Number(current.apparent_temperature);
    const actual = Number(current.temperature_2m);
    const feelsGap = feels - actual;
    const feelsCard = renderSnapshotCard({
      head: renderSnapshotMetric(formatNumber(feels, "°"), `Actual ${formatNumber(actual, "°")}`, isNaN(feels) ? undefined : temperatureColor(feels)),
      scale: isNaN(feels) ? null : renderSnapshotScale(Math.max(0, Math.min(feels, 110)), 110, temperatureGradient(0, 110), `Feels Like ${Math.round(feels)}°`),
      text: isNaN(feelsGap) ? "The feels-like temperature is unavailable." : feelsGap >= 2 ? "Humidity is making it feel warmer than the actual temperature." : feelsGap <= -2 ? (windSpeed >= 5 ? "Wind is making it feel colder than the actual temperature." : "Dry air is making it feel colder than the actual temperature.") : "It feels about the same as the actual temperature.",
      visual: renderSnapshotTrend("Next 24 Hours", trendEntries(hourly.apparent_temperature, hourIndex, 24), (entry) => `${Math.round(entry)}°`, (entry) => temperatureColor(entry || 0)),
      rows: [
        ["Actual Temperature", formatNumber(actual, "°")],
        ["Difference", isNaN(feelsGap) ? null : `${feelsGap >= 0 ? "+" : ""}${Math.round(feelsGap)}°`],
        ["Feels Like High Today", formatNumber(value(daily.apparent_temperature_max, todayIndex), "°")],
        ["Feels Like Low Today", formatNumber(value(daily.apparent_temperature_min, todayIndex), "°")]
      ]
    });

    const humidityValues = trendEntries(hourly.relative_humidity_2m, hourIndex, 24).map((entry) => entry.value).filter((entry) => entry !== null);
    const dewPoint = Number(current.dew_point_2m);
    const humidityCard = renderSnapshotCard({
      head: renderSnapshotMetric(formatNumber(current.relative_humidity_2m, "%"), "Relative Humidity"),
      scale: renderSnapshotScale(Number(current.relative_humidity_2m) || 0, 100, "linear-gradient(90deg, #3d4354 0%, #42a5f5 100%)", "Relative Humidity"),
      text: `The dew point is ${formatNumber(dewPoint, "°")} right now${dewPoint >= 70 ? ", which feels oppressive." : dewPoint >= 60 ? ", which feels sticky." : dewPoint >= 50 ? ", which feels comfortable." : ", which feels dry."}`,
      visual: renderSnapshotTrend("Next 24 Hours", trendEntries(hourly.relative_humidity_2m, hourIndex, 24), (entry) => `${Math.round(entry)}%`, "#42a5f5", 100),
      rows: [
        ["Dew Point", formatNumber(dewPoint, "°")],
        ["Lowest Next 24 Hours", humidityValues.length ? formatNumber(Math.min(...humidityValues), "%") : null],
        ["Highest Next 24 Hours", humidityValues.length ? formatNumber(Math.max(...humidityValues), "%") : null],
        ["Average Next 24 Hours", humidityValues.length ? formatNumber(humidityValues.reduce((sum, entry) => sum + entry, 0) / humidityValues.length, "%") : null]
      ]
    });

    const visibilityUnit = (forecast.current_units && forecast.current_units.visibility) || "m";
    const toMiles = (entry) => (entry === null || entry === undefined ? null : Number(entry) / (visibilityUnit === "ft" ? 5280 : 1609.344));
    const visibilityMiles = toMiles(current.visibility);
    const visibilityLevel = visibilityMiles !== null ? levelFor(VISIBILITY_LEVELS, visibilityMiles) : null;
    const visibilityTrend = trendEntries(hourly.visibility, hourIndex, 24).map((entry) => ({ ...entry, value: entry.value === null ? null : Math.min(10, toMiles(entry.value)) }));
    const lowestVisibility = visibilityTrend.map((entry) => entry.value).filter((entry) => entry !== null);
    const spread = current.temperature_2m !== undefined && current.dew_point_2m !== undefined ? current.temperature_2m - current.dew_point_2m : null;
    const visibilityCard = renderSnapshotCard({
      head: renderSnapshotMetric(visibilityMiles !== null ? `${visibilityMiles >= 10 ? Math.round(visibilityMiles) : visibilityMiles.toFixed(1)} Mi` : "—", visibilityLevel ? visibilityLevel[1] : "Unavailable"),
      scale: visibilityMiles !== null ? renderSnapshotScale(Math.min(visibilityMiles, 10), 10, "linear-gradient(90deg, #919baf 0%, #cdd4e4 50%, #42a5f5 100%)", `${visibilityMiles.toFixed(1)} Mi`) : null,
      text: visibilityLevel ? visibilityLevel[2] : "Visibility is unavailable for this place.",
      visual: renderSnapshotTrend("Next 24 Hours", visibilityTrend, (entry) => `${entry >= 10 ? "10+" : entry.toFixed(1)} Mi`, "#cdd4e4", 10),
      rows: [
        ["Lowest Next 24 Hours", lowestVisibility.length ? `${Math.min(...lowestVisibility).toFixed(1)} Mi` : null],
        ["Cloud Cover", formatNumber(current.cloud_cover, "%")],
        ["Dew Point Spread", spread !== null ? `${Math.round(spread)}°` : null],
        ["Fog Risk", spread === null ? null : spread <= 3 ? "Elevated" : spread <= 6 ? "Possible" : "Low"]
      ]
    });

    const pressureNow = Number(current.pressure_msl);
    const pressureBefore = value(hourly.pressure_msl, hourIndex - 3);
    const pressureEarlier = value(hourly.pressure_msl, hourIndex - 12);
    const pressureTrend = pressureBefore === null || isNaN(pressureNow) ? null : pressureNow - pressureBefore;
    const inches = isNaN(pressureNow) ? null : pressureNow * 0.02953;
    const trendWord = pressureTrend === null ? null : pressureTrend > 0.5 ? "Rising" : pressureTrend < -0.5 ? "Falling" : "Steady";
    const pressureCard = renderSnapshotCard({
      head: renderSnapshotMetric(inches !== null ? `${inches.toFixed(2)} InHg` : "—", trendWord || "Unavailable"),
      scale: inches !== null ? renderSnapshotScale(Math.max(0, inches - 28.5), 2.5, "linear-gradient(90deg, #ff6b6b 0%, #ffd93d 40%, #4ecdc4 60%, #42a5f5 100%)", `${pressureNow.toFixed(1)} hPa`) : null,
      text: trendWord === "Falling" ? "Falling pressure often comes ahead of clouds, wind, and rain." : trendWord === "Rising" ? "Rising pressure usually brings clearing and calmer weather." : trendWord === "Steady" ? "Steady pressure suggests little change in the weather soon." : "The pressure trend is unavailable.",
      visual: renderSnapshotTrend("Last 12 Hours To Next 12 Hours", trendEntries(hourly.pressure_msl, hourIndex - 12, 25), (entry) => `${entry.toFixed(1)} hPa`, "#B388FF"),
      rows: [
        ["Sea Level", formatNumber(pressureNow, " hPa", 1)],
        ["Station", formatNumber(current.surface_pressure, " hPa", 1)],
        ["Change Over 3 Hours", pressureTrend === null ? null : `${pressureTrend >= 0 ? "+" : ""}${pressureTrend.toFixed(1)} hPa`],
        ["Change Over 12 Hours", pressureEarlier === null || isNaN(pressureNow) ? null : `${pressureNow - pressureEarlier >= 0 ? "+" : ""}${(pressureNow - pressureEarlier).toFixed(1)} hPa`]
      ]
    });

    const moon = astro.moon || {};
    const daysUntil = (iso) => (iso ? Math.max(0, Math.round((Date.parse(iso) - Date.now()) / 86400000)) : null);
    const moonCard = renderSnapshotCard({
      head: (
        <>
          {moon.phase !== undefined && <MoonPhaseGlyph phase={moon.phase} size={64} />}
          {renderSnapshotMetric(moon.phaseName || "—", moon.illumination !== undefined ? `${moon.illumination}% Illuminated` : null)}
        </>
      ),
      text: moon.phase !== undefined ? `The Moon is ${moon.phase < 0.5 ? "waxing" : "waning"} and ${moon.illumination}% lit${moon.nextFullMoon ? `, and the next full moon is in ${daysUntil(moon.nextFullMoon)} days` : ""}.` : "The Moon data is unavailable.",
      rows: [
        ["Moonrise", moon.moonrise ? localClock(utcToLocalText(moon.moonrise, offset)) : "No Moonrise Today"],
        ["Moonset", moon.moonset ? localClock(utcToLocalText(moon.moonset, offset)) : "No Moonset Today"],
        ["Next Full Moon", moon.nextFullMoon ? localDateLabel(utcToLocalText(moon.nextFullMoon, offset).slice(0, 10)) : null],
        ["Next New Moon", moon.nextNewMoon ? localDateLabel(utcToLocalText(moon.nextNewMoon, offset).slice(0, 10)) : null],
        ["Moon Age", moon.ageDays !== undefined ? `${moon.ageDays} Days` : null],
        ["Distance", moon.distanceKm ? `${moon.distanceKm.toLocaleString()} km` : null]
      ]
    });

    const highGap = averages && todayHigh !== null ? Math.round(todayHigh - averages.normalHigh) : null;
    const averagesCard = renderSnapshotCard({
      head: renderSnapshotMetric(highGap === null ? "—" : `${highGap > 0 ? "+" : ""}${highGap}°`, highGap === null ? (snapshotData.averagesError ? "Unavailable" : "Building Average") : highGap > 0 ? "Above Average High" : highGap < 0 ? "Below Average High" : "At Average High", highGap === null ? undefined : highGap > 2 ? "#FF9500" : highGap < -2 ? "#42a5f5" : undefined),
      text: averages ? (highGap === null ? "Today's forecast high is unavailable." : `Today's forecast high of ${Math.round(todayHigh)}° is ${highGap === 0 ? "right at" : `${Math.abs(highGap)}° ${highGap > 0 ? "above" : "below"}`} the average high of ${Math.round(averages.normalHigh)}° for this date.`) : snapshotData.averagesError ? "The long-term averages could not be built for this place." : "The 30-year average for this date is being built and will appear shortly.",
      visual: snapshotData.averagesError && !averages ? <div className="satWeatherDetailError">{`The long-term averages failed with the error "${String(snapshotData.averagesError).replace(/\.$/, "")}".`}</div> : undefined,
      rows: [
        ["Average High", averages ? `${Math.round(averages.normalHigh)}°` : null],
        ["Average Low", averages ? `${Math.round(averages.normalLow)}°` : null],
        ["Record High", averages && averages.recordHigh ? `${Math.round(averages.recordHigh.value)}° In ${averages.recordHigh.year}` : null],
        ["Record Low", averages && averages.recordLow ? `${Math.round(averages.recordLow.value)}° In ${averages.recordLow.year}` : null],
        ["Chance Of A Wet Day", averages && averages.wetDayPercent !== null ? `${averages.wetDayPercent}%` : null],
        ["Period", averages ? averages.years : null]
      ]
    });

    const chartSlice = (series) => (series || []).slice(hourIndex, hourIndex + 48);
    const hourChart = createLineChart("Next 48 Hours", hourTimes.slice(hourIndex, hourIndex + 48).map((time) => `${localWeekday(time.slice(0, 10))} ${localHourLabel(time)}`), [
      { name: "Temperature (°F)", data: chartSlice(hourly.temperature_2m), color: "#ffd93d" },
      { name: "Feels Like (°F)", data: chartSlice(hourly.apparent_temperature), color: "#FF9500" },
      { name: "Precipitation Chance (%)", data: chartSlice(hourly.precipitation_probability), color: "#42a5f5", axis: 1, bar: true }
    ], "");

    return (
      <div className="satEarthCondOverviewTab satWeatherSnapTab">
        {renderSection(`Right Now In ${snapshotTarget.label}`, faCloudSun, [
          [{ title: localDateLabel(todayText), badge: "LIVE", content: <>{hero}{renderSnapshotBriefing()}</>, description: `Current conditions come from the Open-Meteo best-match model blend for ${snapshotTarget.lat.toFixed(3)}°, ${snapshotTarget.lon.toFixed(3)}°, and alerts come from the National Weather Service for this exact point. ${snapshotData.forecastError ? `The last forecast refresh failed with the error "${String(snapshotData.forecastError).replace(/\.$/, "")}".` : ""}`.trim() }],
          [{ title: "Hourly Forecast", badge: "FORECAST", content: <>{hourlyStrip}{renderSnapshotInsight("hourly")}</>, description: "The next 24 hours with the chance of precipitation when it is 20% or higher, plus sunrise and sunset." }],
          [
            { title: "10-Day Forecast", badge: "FORECAST", content: <>{tenDay}{renderSnapshotInsight("tenDay")}</>, description: "Each bar spans the day's low to high on a scale shared by all ten days, colored by temperature. The dot on today's bar marks the current temperature." },
            { title: "Next Two Hours", badge: "FORECAST", content: <>{nextHour}{renderSnapshotInsight("nextHours")}</>, description: "Precipitation in 15-minute steps. In North America this comes from the HRRR model, and elsewhere it is interpolated from hourly data." }
          ]
        ])}
        {renderSection("Conditions", faTemperatureHalf, [
          [
            { title: "Air Quality", badge: "FORECAST", content: <>{airCard}{renderSnapshotInsight("airQuality")}</>, description: "The United States Air Quality Index from the Copernicus Atmosphere Monitoring Service forecast. Pollen counts are only modeled for Europe." },
            { title: "UV Index", badge: "FORECAST", content: <>{uvCard}{renderSnapshotInsight("uv")}</>, description: "The World Health Organization UV index. Sun protection is recommended whenever the index is 3 or higher." },
            { title: "Sunrise And Sunset", badge: "COMPUTED", content: <>{sunCard}{renderSnapshotInsight("sun")}</>, description: "Sunrise and sunset come from the forecast service. First and last light mark civil twilight, when the Sun is 6° below the horizon." }
          ],
          [
            { title: "Wind", badge: "LIVE", content: <>{windCard}{renderSnapshotInsight("wind")}</>, description: "Sustained wind and gusts at 10 meters. The arrow points the way the wind is blowing, and the label uses the Beaufort scale." },
            { title: "Precipitation", badge: "FORECAST", content: <>{precipitationCard}{renderSnapshotInsight("precipitation")}</>, description: "Rain and melted snow totals. The last 24 hours come from the model's recent analysis rather than a rain gauge." },
            { title: "Feels Like", badge: "LIVE", content: <>{feelsCard}{renderSnapshotInsight("feelsLike")}</>, description: "The apparent temperature combines air temperature, humidity, wind, and sunshine to estimate how the air feels on skin." }
          ],
          [
            { title: "Humidity", badge: "LIVE", content: <>{humidityCard}{renderSnapshotInsight("humidity")}</>, description: "Relative humidity is how close the air is to saturation. The dew point is a better guide to how muggy it feels." },
            { title: "Visibility", badge: "LIVE", content: <>{visibilityCard}{renderSnapshotInsight("visibility")}</>, description: "How far away objects can be clearly seen, which drops in fog, haze, smoke, and heavy precipitation." },
            { title: "Pressure", badge: "LIVE", content: <>{pressureCard}{renderSnapshotInsight("pressure")}</>, description: "Sea-level pressure and its change over the last three hours. Falling pressure often comes ahead of unsettled weather." }
          ],
          [
            { title: "Moon", badge: "COMPUTED", content: <>{moonCard}{renderSnapshotInsight("moon")}</>, description: "The phase, rise, and set times are computed for this place from a lunar position model and are accurate to within a few minutes." },
            { title: "Averages", badge: "HISTORICAL", content: <>{averagesCard}{renderSnapshotInsight("averages")}</>, description: averages ? `Averages use ERA5 reanalysis from ${averages.years} over a ${averages.windowDays}-day window centered on today at ${averages.gridLat}°, ${averages.gridLon}°. Records cover this exact date in that period.` : "Averages use ERA5 reanalysis from 1991 to 2020 around today's date." }
          ],
          [{ title: "Next 48 Hours", badge: "FORECAST", chart: hourChart, content: renderChart(hourChart), axes: ["Time", "°F And Percent"], description: "Hourly temperature, feels-like temperature, and the chance of precipitation for the next two days." }],
          [{ title: `Alerts Covering ${snapshotTarget.label}`, badge: "LIVE", content: renderTable("Alerts At This Point", ["Alert", "Severity", "Areas", "Issued", "Expires", "Hazards", "Issued By"], pointAlerts.map(alertRow), { emptyText: snapshotData.alertsError ? `The point alert lookup failed with the error "${String(snapshotData.alertsError).replace(/\.$/, "")}".` : "No National Weather Service alerts cover this exact point right now.", onRowClick: (index) => { const match = alerts.find((alert) => alert.id === pointAlerts[index].id); if (match) focusAlert(match); } }), description: "Every active National Weather Service alert that contains the selected point. Select a row to open the alert on the map." }]
        ])}
      </div>
    );
  };

  const renderOverviewTab = () => {
    const stats = scopedAlertStats;
    const stormStats = scopedStormStats;
    const reportStats = scopedReportStats;
    const summaryTiles = [
      { label: "Active Alerts", value: formatNumber(stats?.total), detail: `${formatNumber(stats?.warnings)} Warnings | ${formatNumber(stats?.watches)} Watches`, icon: faExclamationTriangle },
      { label: "Tornado Warnings", value: formatNumber(stats?.tornadoWarnings), detail: `${formatNumber(stats?.observedTornadoes)} Observed | ${formatNumber(stats?.emergencies)} Emergencies`, color: stats?.tornadoWarnings ? "#ff1744" : "#4ecdc4", icon: faTornado },
      { label: "Severe Thunderstorm Warnings", value: formatNumber(stats?.severeWarnings), detail: `${formatNumber(stats?.considerable)} With Elevated Damage Threat`, color: stats?.severeWarnings ? "#FFA500" : "#4ecdc4", icon: faCloudBolt },
      { label: "Flash Flood Warnings", value: formatNumber(stats?.flashFloodWarnings), detail: "Issued By Local Forecast Offices", color: stats?.flashFloodWarnings ? "#ff6b6b" : "#4ecdc4", icon: faDroplet },
      { label: "Storm Cells", value: formatNumber(stormStats?.total), detail: `${formatNumber(stormStats?.severe)} Severe | Tracked By ${formatNumber(stormStats?.radars)} Radars`, icon: faBolt },
      { label: "Largest Hail", value: stormStats?.maxHail ? `${stormStats.maxHail} In` : "—", detail: `${formatNumber(stormStats?.mesocyclones)} Mesocyclones | ${formatNumber(stormStats?.tornadic)} Vortex Signatures`, icon: faCloudRain },
      { label: "Storm Reports", value: formatNumber(reportStats?.total), detail: `${formatNumber(reportStats?.tornadoes)} Tornado | ${formatNumber(reportStats?.hail)} Hail | ${formatNumber(reportStats?.wind)} Wind`, icon: faFlag },
      { label: "Tropical Cyclones", value: formatNumber(mapTropicalStorms.length), detail: mapTropicalStorms.length ? mapTropicalStorms.map((storm) => storm.name).filter(Boolean).join(", ") : "None Active", icon: faHurricane }
    ];
    const byEvent = (stats?.byEvent || []).slice(0, 15);
    const eventChart = createBarChart("Active Alerts By Type", byEvent.map((item) => item.event), byEvent.map((item) => item.count), "", "#4ecdc4", true, byEvent.map((item) => item.color));
    const reportTypes = (reportStats?.byType || []).slice(0, 12);
    const reportChart = createBarChart("Storm Reports By Type", reportTypes.map((item) => titleCaseName(item.type)), reportTypes.map((item) => item.count), "", "#42a5f5", true);
    const severityCounts = [4, 3, 2, 1, 0].map((level) => scopedCells.filter((cell) => cell.severity === level).length);
    const cellChart = createBarChart("Storm Cells By Severity", [4, 3, 2, 1, 0].map((level) => STORM_SEVERITY_LABELS[level]), severityCounts, "", "#ffd93d", true, [4, 3, 2, 1, 0].map((level) => `rgb(${STORM_COLORS[level].join(", ")})`));
    const hailBuckets = [[0.75, 1], [1, 1.5], [1.5, 2], [2, 3], [3, 99]];
    const hailChart = createBarChart("Hail Size Distribution", ["0.75 To 1 In", "1 To 1.5 In", "1.5 To 2 In", "2 To 3 In", "Over 3 In"], hailBuckets.map(([low, high]) => scopedCells.filter((cell) => cell.maxSize !== null && cell.maxSize >= low && cell.maxSize < high).length), "", "#00c853");
    const historyLabels = censusHistory.map((frame) => new Date(frame.observedAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric" }));
    const alertHistoryChart = createLineChart("Warnings Over Time", historyLabels, [
      { name: "Warnings", data: censusHistory.map((frame) => Number(frame.metadata.warnings) || 0), color: "#ff6b6b" },
      { name: "Watches", data: censusHistory.map((frame) => Number(frame.metadata.watches) || 0), color: "#ffd93d" },
      { name: "Tornado Warnings", data: censusHistory.map((frame) => Number(frame.metadata.tornadoWarnings) || 0), color: "#B388FF" }
    ]);
    const stormHistoryChart = createLineChart("Storm Cells Over Time", historyLabels, [
      { name: "Storm Cells", data: censusHistory.map((frame) => Number(frame.metadata.stormCells) || 0), color: "#4ecdc4" },
      { name: "Severe Cells", data: censusHistory.map((frame) => Number(frame.metadata.severeCells) || 0), color: "#FF9500" }
    ]);
    return (
      <div className="satEarthCondOverviewTab">
        {renderSection("National Summary", faBroadcastTower, [
          [{ title: "Severe Weather Summary", badge: "LIVE", content: renderTiles(summaryTiles), description: "Counts cover every active National Weather Service alert, every storm cell the NEXRAD network is tracking, and Local Storm Reports from the last 24 hours across the United States." }],
          [
            { title: "Active Alerts By Type", badge: "LIVE", chart: eventChart, content: renderChart(eventChart), axes: ["Alerts", "Alert Type"], description: "The fifteen most important alert types in effect, ordered by National Weather Service priority and drawn in the official hazard map colors." },
            { title: "Storm Reports By Type", badge: "LIVE", chart: reportChart, content: renderChart(reportChart), axes: ["Reports", "Report Type"], description: `Local Storm Reports filed by spotters, emergency managers, and the public over the last ${reportsData ? reportsData.hours : 24} hours.` }
          ],
          [
            { title: "Storm Cells By Severity", badge: "COMPUTED", chart: cellChart, content: renderChart(cellChart), axes: ["Cells", "Classification"], description: "Each radar identifies storm cells every few minutes. A cell is classed by its most dangerous signal, from a tornado vortex signature down to an ordinary cell." },
            { title: "Hail Size Distribution", badge: "COMPUTED", chart: hailChart, content: renderChart(hailChart), axes: ["Hail Size", "Cells"], description: "Maximum expected hail size estimated by the radar hail detection algorithm for each cell. Hail of one inch or larger is considered severe." }
          ]
        ])}
        {renderSection("Local Conditions", faMapMarkerAlt, renderLocalConditions())}
        {renderSection("Recorded History", faHistory, [
          [
            { title: "Warnings Over Time", badge: "HISTORICAL", chart: alertHistoryChart, content: renderChart(alertHistoryChart), axes: ["Time", "Alerts"], description: `The harvester records a national severe weather census every ten minutes. This chart covers the last ${SOURCES.harvest.historyDays} days at hourly resolution.` },
            { title: "Storm Cells Over Time", badge: "HISTORICAL", chart: stormHistoryChart, content: renderChart(stormHistoryChart), axes: ["Time", "Cells"], description: "The number of storm cells tracked by the radar network and how many of them showed a severe signature." }
          ],
          [{ title: "Warning Log", badge: "HISTORICAL", content: renderTable("Warning Log", ["Issued", "Warning", "Areas", "Hazards", "Issued By"], warningLog.map((frame) => [formatAbsoluteTime(frame.metadata.sent || frame.observedAt), { value: frame.metadata.event, color: frame.metadata.threat === "emergency" ? "#ff1744" : undefined }, frame.metadata.areaDesc, [frame.metadata.tornadoDetection ? `Tornado ${titleCaseName(frame.metadata.tornadoDetection)}` : null, frame.metadata.maxHail ? `${frame.metadata.maxHail}" Hail` : null, frame.metadata.maxWind ? `${frame.metadata.maxWind} Wind` : null].filter(Boolean).join(" | "), frame.metadata.sender]), { emptyText: "The harvester has not logged a warning in this window." }), description: `The harvester logs every tornado, severe thunderstorm, flash flood, and other high-impact warning once when it is issued. This table covers the last ${SOURCES.harvest.historyDays} days.` }]
        ])}
      </div>
    );
  };

  const renderAlertsTab = () => {
    const list = areaFilteredAlerts;
    const limit = 500;
    return (
      <div className="satEarthCondOverviewTab">
        {renderSection(activeAreas ? `Alerts In ${activeAreasLabel}` : locationActive ? `Alerts Within ${areaRadius} Miles Of ${locationName}` : "Active Alerts", faExclamationTriangle, [
          [{ title: `${labelFor(ALERT_FILTER_OPTIONS, alertFilter)} (${list.length.toLocaleString()})`, badge: "LIVE", content: renderTable("Active Alerts", ["Alert", "Severity", "Areas", "Issued", "Expires", "Hazards", "Issued By"], list.slice(0, limit).map(alertRow), { emptyText: locationActive ? "No alerts of this kind touch the selected area." : "No alerts of this kind are active.", onRowClick: (index) => focusAlert(list[index]) }), description: `${list.length > limit ? `Showing the first ${limit} of ${list.length.toLocaleString()} alerts. ` : ""}Alerts are ordered by National Weather Service priority, so tornado warnings always come first. Change the Alert Types filter in the sidebar to include advisories and statements. Select a row to open the full alert text on the map.` }]
        ])}
      </div>
    );
  };

  const renderStormsTab = () => {
    const cellList = areaCells.slice(0, 500);
    const reportList = areaReports.slice(0, 500);
    return (
      <div className="satEarthCondOverviewTab">
        {renderSection(activeAreas ? `Storm Cells In ${activeAreasLabel}` : locationActive ? `Storm Cells Within ${areaRadius} Miles` : "Storm Cells", faBolt, [
          [{ title: `Tracked Storm Cells (${areaCells.length.toLocaleString()})`, badge: "LIVE", content: renderTable("Storm Cells", ["Storm", "Classification", "Hail Size", "Severe Hail", "Max Reflectivity", "Echo Top", "Motion", "Scan Time"], cellList.map((cell) => [
            { value: stormLabel(cell), color: `rgb(${STORM_COLORS[cell.severity].join(", ")})` },
            STORM_SEVERITY_LABELS[cell.severity],
            cell.maxSize ? `${cell.maxSize} In` : null,
            cell.posh === null ? null : `${cell.posh}%`,
            cell.maxDbz === null ? null : `${cell.maxDbz} dBZ`,
            cell.top === null ? null : `${cell.top} Kft`,
            cell.drct === null || !cell.sknt ? null : `${Math.round((cell.drct + 180) % 360)}° At ${cell.sknt} Kt`,
            cell.valid ? formatClock(cell.valid) : null
          ]), { emptyText: stormsError || "No storm cells are being tracked here right now.", onRowClick: (index) => select("storm", cellList[index].id, { lat: cellList[index].lat, lon: cellList[index].lon }) }), description: "Storm cell attributes from every NEXRAD radar, updated with each volume scan. Motion is the direction the cell is heading. Select a row to open the cell on the map." }]
        ])}
        {renderSection(activeAreas ? `Storm Reports In ${activeAreasLabel}` : locationActive ? `Storm Reports Within ${areaRadius} Miles` : "Local Storm Reports", faFlag, [
          [{ title: `Reports In The Last ${reportsData ? reportsData.hours : 24} Hours (${areaReports.length.toLocaleString()})`, badge: "LIVE", content: renderTable("Storm Reports", ["Time", "Type", "Magnitude", "Location", "State", "Source", "Remarks"], reportList.map((report) => [
            formatAbsoluteTime(report.valid),
            { value: titleCaseName(report.typeText), color: `rgb(${reportStyle(report).color.join(", ")})` },
            report.magnitude ? `${report.magnitude}${report.unit ? ` ${titleCaseName(report.unit)}` : ""}` : null,
            titleCaseName(report.city),
            report.state,
            report.source ? titleCaseName(report.source) : null,
            report.remark
          ]), { emptyText: reportsError || "No storm reports were filed here in this window.", onRowClick: (index) => select("report", reportList[index].id, { lat: reportList[index].lat, lon: reportList[index].lon }) }), description: "Local Storm Reports collected by National Weather Service offices from trained spotters, emergency managers, and the public. Select a row to open the report on the map." }]
        ])}
        {renderSection("Tropical Cyclones", faHurricane, [
          [{ title: `Active Tropical Cyclones (${mapTropicalStorms.length})`, badge: "LIVE", content: renderTable("Tropical Cyclones", ["Name", "Classification", "Maximum Wind", "Pressure", "Movement", "Position", "Last Update"], mapTropicalStorms.map((storm) => [
            { value: storm.name, color: `rgb(${(TROPICAL_COLORS[storm.classification] || [205, 212, 228]).join(", ")})` },
            TROPICAL_LABELS[storm.classification] || storm.classification,
            storm.intensity === null ? null : `${storm.intensity} Kt`,
            storm.pressure === null ? null : `${storm.pressure} Mb`,
            storm.movementDir === null ? null : `${storm.movementDir}° At ${storm.movementSpeed} Mph`,
            formatCoords(storm.lat, storm.lon),
            storm.lastUpdate ? formatAbsoluteTime(storm.lastUpdate) : null
          ]), { emptyText: tropicalError || "The National Hurricane Center is not tracking any active cyclones.", onRowClick: (index) => select("tropical", mapTropicalStorms[index].id, { lat: mapTropicalStorms[index].lat, lon: mapTropicalStorms[index].lon, zoom: 5 }) }), description: "Active Atlantic, Eastern Pacific, and Central Pacific cyclones from the National Hurricane Center, with the forecast cone, forecast track, and past track drawn on the map." }]
        ])}
      </div>
    );
  };

  const SOURCE_DESCRIPTIONS = {
    nws: "Active alerts and the zone shapes used to draw alerts that are not issued as polygons.",
    iem: "Radar frames, the radar site list, satellite and rainfall tiles, storm cell attributes, and Local Storm Reports.",
    rainviewer: "The global radar composite used outside the United States.",
    spc: "The day one convective outlook.",
    nhc: "Active tropical cyclones and their forecast cones and tracks.",
    openMeteo: "The local conditions and forecast for the selected location."
  };

  const renderSourcesTab = () => {
    const sourceMap = healthData ? healthData.sources || {} : {};
    const panels = Object.entries(sourceMap).map(([key, source]) => {
      const status = sourceStatusLabel(source);
      const cooling = source.cooldownUntil && new Date(source.cooldownUntil) > new Date();
      const tiles = [
        { label: "Status", value: status.label, color: status.color, icon: faBroadcastTower },
        { label: "Last Result", value: formatNumber(source.lastCount), detail: source.lastSuccessAt ? `Succeeded ${formatRelativeTime(source.lastSuccessAt)}` : "No Successful Request Yet", icon: faClock },
        { label: "Requests", value: formatNumber(source.requests), detail: "Since The Server Started", icon: faChartLine },
        { label: "Queued", value: formatNumber(source.queued), detail: "Requests Waiting For Rate Limit", icon: faTachometerAlt },
        { label: "Cooldown", value: cooling ? "Paused" : "Clear", detail: cooling ? `Resumes ${formatAbsoluteTime(source.cooldownUntil)}` : "No Backoff In Effect", color: cooling ? "#FF9500" : "#4ecdc4", icon: faShieldHalved }
      ];
      return [{ title: source.name || key, badge: "LIVE", content: <>{renderSourceAlert(sourceAlert(source), false)}{renderTiles(tiles)}</>, description: `${SOURCE_DESCRIPTIONS[key] || ""} ${source.terms || ""}`.trim() }];
    });
    const coverageTiles = [
      { label: "Radar Product", value: radarData ? radarData.label : "—", detail: radarData && radarData.radar ? `Radar ${radarData.radar} | ${radarData.frames.length} Frames` : radarData ? `${radarData.frames.length} Frames Every ${radarData.stepMinutes} Minutes` : radarError || "Loading", color: radarError ? "#ff6b6b" : undefined, icon: faSatelliteDish },
      { label: "Alert Shapes", value: formatNumber(alerts.filter((alert) => alert.polygons && alert.polygons.length).length), detail: alertsData && alertsData.pendingZones ? `${formatNumber(alertsData.pendingZones)} Zone Shapes Still Loading` : "All Alert Shapes Loaded", color: alertsData && alertsData.pendingZones ? "#FF9500" : undefined, icon: faMap },
      { label: "Zone Cache", value: formatNumber(healthData?.zones?.cached), detail: `${formatNumber(healthData?.zones?.queued)} Waiting`, icon: faDatabase },
      { label: "Storm Scan", value: stormsData && stormsData.valid ? formatRelativeTime(stormsData.valid) : "—", detail: "Latest Storm Attribute Update", icon: faBolt },
      { label: "Radar Sites", value: formatNumber(sites.length), detail: sitesError || "NEXRAD And TDWR Sites", color: sitesError ? "#ff6b6b" : undefined, icon: faTowerBroadcast },
      { label: "Outlook", value: outlookData ? labelFor(OUTLOOK_KIND_OPTIONS, outlookData.kind) : "Off", detail: outlookError || (outlookData ? `${outlookData.features.length} Risk Areas` : "Turn On The Outlook Layer"), color: outlookError ? "#ff6b6b" : undefined, icon: faLayerGroup }
    ];
    return (
      <div className="satEarthCondOverviewTab">
        {renderSection("Live Sources", faSatelliteDish, panels.length ? panels : [[{ title: "Sources", badge: "LIVE", content: <div className="satEarthCondNoChartData">Waiting For The First Update</div>, description: "Source status appears after the server answers its first request." }]])}
        {renderSection("Coverage And Overlays", faLayerGroup, [
          [{ title: "Coverage", badge: "COMPUTED", content: renderTiles(coverageTiles), description: "Radar frames and tiles load directly from the Iowa Environmental Mesonet and RainViewer. Alerts, storm cells, reports, outlooks, and cyclones are cached on the server so every viewer shares the same requests." }]
        ])}
      </div>
    );
  };

  const renderCurrentTabContent = () => {
    switch (activeTab) {
      case "overview": return renderOverviewTab();
      case "snapshot": return renderSnapshotTab();
      case "alerts": return renderAlertsTab();
      case "storms": return renderStormsTab();
      case "sources": return renderSourcesTab();
      default: return null;
    }
  };

  const layerCounts = {
    radar: radarData ? `${frames.length} Frames` : radarError ? "Error" : "—",
    alerts: alertsError && !alertsData ? "Error" : areaFilteredAlerts.length.toLocaleString(),
    storms: stormsError && !stormsData ? "Error" : cellsInView.length.toLocaleString(),
    reports: reportsError && !reportsData ? "Error" : reportsInView.length.toLocaleString(),
    tropical: tropicalError && !tropicalData ? "Error" : mapTropicalStorms.length.toLocaleString(),
    outlook: outlookError ? "Error" : outlookData ? mapOutlookFeatures.length.toLocaleString() : "—",
    satellite: overlaysError ? "Error" : overlays ? "GOES" : "—",
    rainfall: overlaysError ? "Error" : overlays ? "MRMS" : "—",
    sites: sitesError ? "Error" : sitesInView.length.toLocaleString()
  };

  const sidebarErrors = [
    ["Radar", radarError],
    ["Alerts", alertsError],
    ["Storm Cells", stormsError],
    ["Storm Reports", reportsError],
    ["Tropical Cyclones", tropicalError],
    ["Convective Outlook", layerVisibility.outlook ? outlookError : null],
    ["Satellite And Rainfall", layerVisibility.satellite || layerVisibility.rainfall ? overlaysError : null],
    ["Radar Sites", singleSite || layerVisibility.sites ? sitesError : null],
    ["Local Forecast", locationActive ? pointError : null]
  ].filter(([, message]) => message);

  const renderControlsPanel = () => (
    <div className="satEarthCondControlsPanel">
      <div className="satWeatherAreaList">
        <div className="satWeatherAreaListHeader">
          <span className="satWeatherAreaListTitle"><FontAwesomeIcon icon={faMapPin} /> Monitored Areas</span>
          <button className="satWeatherAreaListButton" onClick={() => openAreaModal(null)} title="Add Area"><FontAwesomeIcon icon={faPlus} /></button>
        </div>
        {areas.length > 0 && areaPointStatus && (
          <div className={`satWeatherAreaListStatus ${areaPointStatus.error ? "satWeatherAreaListStatusError" : ""}`}>
            {areaPointStatus.error ? `The National Weather Service check for your areas failed with the error "${String(areaPointStatus.error).replace(/\.$/, "")}".` : `Checked With The National Weather Service At ${formatClock(new Date(areaPointStatus.at).toISOString())}`}
          </div>
        )}
        {areas.length === 0 ? (
          <div className="satWeatherAreaListEmpty">Add an area to start tracking the alerts inside it.</div>
        ) : (
          <div className="satWeatherAreaListItems">
            {areas.map((area) => {
              const summary = areaAlertCounts[area.area_id] || {};
              const isSelected = area.area_id === selectedAreaId;
              return (
                <div key={area.area_id} className={`satWeatherAreaListItem${isSelected ? " satWeatherAreaListItemSelected" : ""}`} onClick={() => selectArea(area)}>
                  <span className="satWeatherAreaListItemDot" style={{ backgroundColor: summary.top ? AREA_HIGHLIGHT_COLORS[summary.top] : "#3d4354" }} />
                  <div className="satWeatherAreaListItemInfo">
                    <span className="satWeatherAreaListItemName">{area.name || describeArea(area)}</span>
                    <span className="satWeatherAreaListItemMeta">{summary.total || 0} Alert{summary.total === 1 ? "" : "s"} · {summary.warnings || 0} Warning{summary.warnings === 1 ? "" : "s"}</span>
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
            value={labelFor(AREA_RADIUS_OPTIONS, areaRadius)}
            onChange={(option) => setAreaRadius(valueFor(AREA_RADIUS_OPTIONS, option))}
            options={AREA_RADIUS_OPTIONS.map(([, label]) => label)}
            placeholder="Area Radius"
            className={locationActive ? "" : "satEarthCondDropdownDisabled"}
          />
        </div>
      </div>

      <div className="satEarthCondControlGroupStack">
        <div className="satEarthCondControlGroup">
          <Dropdown
            value={labelFor(RADAR_PRODUCT_OPTIONS, radarProduct)}
            onChange={(option) => setRadarProduct(valueFor(RADAR_PRODUCT_OPTIONS, option))}
            options={RADAR_PRODUCT_OPTIONS.map(([, label]) => label)}
            placeholder="Radar Product"
          />
        </div>
        <div className="satEarthCondControlGroup">
          <Dropdown
            value={siteLabel(sortedSites.find((site) => site.id === radarSite)) || (sitesError ? "Sites Unavailable" : "Nearest Radar")}
            onChange={(option) => {
              const match = sortedSites.find((site) => siteLabel(site) === option);
              if (match) setRadarSite(match.id);
            }}
            options={sortedSites.slice(0, 60).map(siteLabel)}
            placeholder="Radar Site"
            className={singleSite ? "" : "satEarthCondDropdownDisabled"}
          />
        </div>
        <div className="satEarthCondControlGroup">
          <Dropdown
            value={labelFor(RADAR_OPACITY_OPTIONS, radarOpacity)}
            onChange={(option) => setRadarOpacity(valueFor(RADAR_OPACITY_OPTIONS, option))}
            options={RADAR_OPACITY_OPTIONS.map(([, label]) => label)}
            placeholder="Radar Opacity"
          />
        </div>
        <div className="satEarthCondControlGroup">
          <Dropdown
            value={labelFor(ALERT_FILTER_OPTIONS, alertFilter)}
            onChange={(option) => setAlertFilter(valueFor(ALERT_FILTER_OPTIONS, option))}
            options={ALERT_FILTER_OPTIONS.map(([, label]) => label)}
            placeholder="Alert Types"
          />
        </div>
        <div className="satEarthCondControlGroup">
          <Dropdown
            value={labelFor(SATELLITE_CHANNEL_OPTIONS, satelliteChannel)}
            onChange={(option) => setSatelliteChannel(valueFor(SATELLITE_CHANNEL_OPTIONS, option))}
            options={SATELLITE_CHANNEL_OPTIONS.map(([, label]) => label)}
            placeholder="Satellite Channel"
            className={layerVisibility.satellite ? "" : "satEarthCondDropdownDisabled"}
          />
        </div>
        <div className="satEarthCondControlGroup">
          <Dropdown
            value={labelFor(RAINFALL_PERIOD_OPTIONS, rainfallPeriod)}
            onChange={(option) => setRainfallPeriod(valueFor(RAINFALL_PERIOD_OPTIONS, option))}
            options={RAINFALL_PERIOD_OPTIONS.map(([, label]) => label)}
            placeholder="Rainfall Period"
            className={layerVisibility.rainfall ? "" : "satEarthCondDropdownDisabled"}
          />
        </div>
        <div className="satEarthCondControlGroup">
          <Dropdown
            value={labelFor(OUTLOOK_KIND_OPTIONS, outlookKind)}
            onChange={(option) => setOutlookKind(valueFor(OUTLOOK_KIND_OPTIONS, option))}
            options={OUTLOOK_KIND_OPTIONS.map(([, label]) => label)}
            placeholder="Outlook Type"
            className={layerVisibility.outlook ? "" : "satEarthCondDropdownDisabled"}
          />
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
          {sidebarErrors.length > 0 && (
            <div className="satEarthCondHarvestWarnings">
              {sidebarErrors.map(([label, message]) => (
                <div key={label} className={`satEarthCondHarvestWarning ${expandedWarnings[label] ? "satEarthCondHarvestWarningExpanded" : ""}`} onClick={() => toggleWarning(label)}>
                  <FontAwesomeIcon icon={faExclamationTriangle} className="satEarthCondHarvestWarningIcon" />
                  <div className="satEarthCondHarvestWarningBody">
                    <span className="satEarthCondHarvestWarningTitle">{label}</span>
                    <span className="satEarthCondHarvestWarningText">{message}</span>
                  </div>
                </div>
              ))}
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
          <div className="satEarthCondHarvestRow"><span>Logged Warnings</span><span>{warningFrames === null ? "—" : warningFrames.toLocaleString()}</span></div>
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
            <button className="satEarthCondBtn satEarthCondBtnSecondary" onClick={() => exportHarvest(SOURCES.harvest.censusProduct, "csv")} disabled={!censusFrames}>
              <FontAwesomeIcon icon={faHistory} /><span className="satEarthCondHarvestLabel">Census History</span>
            </button>
            <button className="satEarthCondBtn satEarthCondBtnSecondary" onClick={() => exportHarvest(SOURCES.harvest.warningProduct, "csv")} disabled={!warningFrames}>
              <FontAwesomeIcon icon={faExclamationTriangle} /><span className="satEarthCondHarvestLabel">Warning Log</span>
            </button>
            <button className="satEarthCondBtn satEarthCondBtnSecondary" onClick={() => setShowLeads(true)}>
              <FontAwesomeIcon icon={faLightbulb} /><span className="satEarthCondHarvestLabel">Source Leads{harvestHealth?.leads?.new_leads ? ` (${harvestHealth.leads.new_leads} New)` : ""}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="satEarthCondControlActions">
        <button onClick={refreshAll} disabled={refreshing} className="satEarthCondBtn satEarthCondBtnPrimary">
          {refreshing ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faRefresh} />} Refresh
        </button>
        <button onClick={exportData} disabled={!areaFilteredAlerts.length} className="satEarthCondBtn satEarthCondBtnSecondary">
          <FontAwesomeIcon icon={faDownload} /> Export
        </button>
      </div>
    </div>
  );

  const tabs = [
    { id: "map", label: "Live Radar", icon: faSatelliteDish, badge: 0 },
    { id: "snapshot", label: "Local Weather", icon: faCloudSun, badge: 0 },
    { id: "overview", label: "Storm Overview", icon: faChartBar, badge: 0 },
    { id: "alerts", label: "Alerts", icon: faExclamationTriangle, badge: areaFilteredAlerts.length },
    { id: "storms", label: "Storm Data", icon: faList, badge: 0 },
    { id: "sources", label: "Sources & Coverage", icon: faDatabase, badge: 0 }
  ];

  const bellCritical = tornadoAlerts.length > 0;
  const bellWarning = areaFilteredAlerts.length > 0 || sidebarErrors.length > 0 || harvestWarnings.length > 0;
  const bellCount = areaFilteredAlerts.length;
  const dataReady = Boolean(alertsData || stormsData || reportsData);
  const allFailed = !dataReady && alertsError && stormsError && reportsError;

  return (
    <div className="satEarthCondPage">
      {layoutVisibility.nav && <Nav activePage="weathertracker" />}

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
              <div className="satEarthCondSubtitle">{activeAreas ? `${activeAreasLabel} | Area Filter On | ${areaFilteredAlerts.length.toLocaleString()} Alert${areaFilteredAlerts.length === 1 ? "" : "s"}` : locationActive ? `${locationName} | ${selectedLat.toFixed(4)}°, ${selectedLon.toFixed(4)}° | ${labelFor(AREA_RADIUS_OPTIONS, areaRadius)}` : "National Weather Radar | Warnings, Storms, And Reports"}</div>
            </div>
            <div className="satEarthCondHeaderStatus">
              <button
                type="button"
                title={bellCritical ? "Show Tornado Warnings" : "Show Alerts"}
                className={`satEarthCondAlertBtn ${bellCritical ? "satEarthCondAlertBtnCritical" : bellWarning ? "satEarthCondAlertBtnWarning" : ""}`}
                onClick={() => {
                  if (ackReviewList.length) {
                    openAckReview();
                    return;
                  }
                  if (bellCritical) {
                    focusAlert(tornadoAlerts[0]);
                    return;
                  }
                  if (areaFilteredAlerts.length) {
                    setActiveTab("alerts");
                    return;
                  }
                  setLayoutVisibility((prev) => ({ ...prev, sidebar: true }));
                }}
              >
                <FontAwesomeIcon icon={faBell} />
                {bellCount > 0 && <span className="satEarthCondAlertBadge">{bellCount}</span>}
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
                  className="satWeatherSoundDropdown"
                  value={labelFor(SOUND_LEVEL_OPTIONS, sounds.settings.minLevel)}
                  onChange={(option) => sounds.updateSettings({ minLevel: valueFor(SOUND_LEVEL_OPTIONS, option) })}
                  options={SOUND_LEVEL_OPTIONS.map(([, label]) => label)}
                  placeholder="Sound Level"
                />
                <Dropdown
                  className="satWeatherSoundDropdown satWeatherSoundDropdownNarrow"
                  value={labelFor(SOUND_SCOPE_OPTIONS, sounds.settings.scope)}
                  onChange={(option) => sounds.updateSettings({ scope: valueFor(SOUND_SCOPE_OPTIONS, option) })}
                  options={SOUND_SCOPE_OPTIONS.map(([, label]) => label)}
                  placeholder="Sound Area"
                />
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
                allFailed ? (
                  <div className="disconnectedNoResults satEarthCondFullHeight">
                    <div className="disconnectedNoResultCell">
                      <FontAwesomeIcon icon={faExclamationTriangle} size="5x" className="disconnectedNoResultsIcon" />
                      <div className="disconnectedNoResultsText">The weather services could not be reached.</div>
                      <div className="disconnectedNoResultsButtons">
                        <button className="disconnectedNoResultsRefresh" onClick={refreshAll} disabled={refreshing}>
                          {refreshing ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faRefresh} />} Refresh
                        </button>
                      </div>
                    </div>
                  </div>
                ) : !dataReady ? (
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
            <span>Last Updated: {alertsData?.updatedAt ? new Date(alertsData.updatedAt).toLocaleTimeString() : "—"}</span>
            <span>Latency: {latency}ms</span>
            <span>Active Alerts: {(scopedAlertStats?.total || 0).toLocaleString()}</span>
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
          Monitored areas track every weather alert inside them, and alert sounds can follow them. Choose a point with a radius (a circle around an address or coordinates) or a bounding box (a rectangle).
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
                    yAxis: Array.isArray(expandedView.chart.yAxis) ? expandedView.chart.yAxis : { ...expandedView.chart.yAxis, axisLabel: { ...expandedView.chart.yAxis?.axisLabel, overflow: "none", width: undefined } }
                  }}
                  className="satEarthCondChart satEarthCondChartExpanded"
                />
              ) : (
                <div className="satEarthCondExpandedContent satWeatherExpandedContent" dangerouslySetInnerHTML={{ __html: expandedView.html }} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeatherTracker;