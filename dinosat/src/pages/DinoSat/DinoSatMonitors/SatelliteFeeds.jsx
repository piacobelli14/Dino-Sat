import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faInfoCircle, faPlay, faPause, faSatellite, faChartLine,
  faChevronDown, faChevronUp, faXmark, faSquareCheck, faClone,
  faSun, faTriangleExclamation, faGlobe, faEye,
  faTowerBroadcast, faVideo, faImage, faCircleNodes, faSatelliteDish,
  faRoute, faSpinner, faCheckCircle, faXmarkCircle,
  faMagnifyingGlass, faFilter, faSort, faGauge, faShieldHalved,
  faTemperatureHigh, faAtom, faChartArea, faChartColumn, faTable, faList,
  faFlask, faBookOpen, faMicroscope, faLayerGroup, faClock, faBolt,
  faMagnifyingGlassPlus, faMagnifyingGlassMinus, faCompass, faExpand,
  faCompress, faRotate, faCamera, faDownload, faArrowsRotate,
  faArrowLeft, faArrowRight, faPlus, faMinus, faCircleDot, faLink,
  faMaximize, faObjectGroup, faPalette, faBrain
} from "@fortawesome/free-solid-svg-icons";
import DinoLabsNav from "../../../helpers/Nav.jsx";
import "../../../styles/helperStyles/Switch.css";
import "../../../styles/mainStyles/DinoSat/DinoSatMonitors/SatelliteFeeds.css";

const PERFORMANCE_CONSTANTS = {
  VIRTUAL_SCROLL_ITEM_HEIGHT: 56,
  VIRTUAL_SCROLL_BUFFER: 8,
  SEARCH_DEBOUNCE_MS: 200,
  REFRESH_INTERVAL_MS: 60 * 1000,
  ISS_STREAM_RECONNECT_MS: 10000
};

const FEED_TYPE_COLORS = {
  "video": "#ef4444",
  "image": "#42a5f5",
  "image-sequence": "#4ade80",
  "telemetry": "#fb923c"
};

const FEED_TYPE_ICONS = {
  "video": faVideo,
  "image": faImage,
  "image-sequence": faLayerGroup,
  "telemetry": faTowerBroadcast
};

const CATEGORY_COLORS = {
  "Live Stream": "#ef4444",
  "Live Telemetry": "#fb923c",
  "Geostationary Imagery": "#42a5f5",
  "Earth Observation": "#4ade80",
  "Solar Imagery": "#facc15",
  "Deep Space Imagery": "#a78bfa",
  "Mission Footage": "#06b6d4",
  "Curated Imagery": "#ec4899"
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
    <div className={`dinoSatStatTile ${large ? "dinoSatStatTileLarge" : ""}`} style={{ borderLeftColor: accent || "var(--st-accent-primary)" }}>
      <div className="dinoSatStatTileLabel">{label}</div>
      <div className="dinoSatStatTileValue" style={color ? { color } : undefined}>
        {value}
        {unit && <span className="dinoSatStatTileUnit">{unit}</span>}
      </div>
      {sub && <div className="dinoSatStatTileSub">{sub}</div>}
    </div>
  );
};

const SceneToolbarTop = ({ zoom, onZoomChange, onZoomReset, onFitToFrame, onPan, onPanReset, rotation, onRotationChange, onRotationReset }) => {
  return (
    <div className="dinoSatSceneToolbar">
      <div className="dinoSatSceneToolbarGroup">
        <button className="dinoSatSceneToolbarButton" onClick={() => onZoomChange(zoom - 0.2)} title="Zoom out." disabled={zoom <= 0.4}>
          <FontAwesomeIcon icon={faMagnifyingGlassMinus} />
        </button>
        <span className="dinoSatSceneToolbarValue">{Math.round(zoom * 100)}%</span>
        <button className="dinoSatSceneToolbarButton" onClick={() => onZoomChange(zoom + 0.2)} title="Zoom in." disabled={zoom >= 6}>
          <FontAwesomeIcon icon={faMagnifyingGlassPlus} />
        </button>
        <button className="dinoSatSceneToolbarButton" onClick={onZoomReset} title="Reset zoom (1×).">
          <FontAwesomeIcon icon={faCircleDot} />
        </button>
        <button className="dinoSatSceneToolbarButton" onClick={onFitToFrame} title="Fit to frame.">
          <FontAwesomeIcon icon={faMaximize} />
        </button>
      </div>

      <div className="dinoSatSceneToolbarGroup">
        <button className="dinoSatSceneToolbarButton" onClick={() => onPan(-40, 0)} title="Pan left.">
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <button className="dinoSatSceneToolbarButton" onClick={() => onPan(0, -40)} title="Pan up.">
          <FontAwesomeIcon icon={faChevronUp} />
        </button>
        <button className="dinoSatSceneToolbarButton" onClick={() => onPan(0, 40)} title="Pan down.">
          <FontAwesomeIcon icon={faChevronDown} />
        </button>
        <button className="dinoSatSceneToolbarButton" onClick={() => onPan(40, 0)} title="Pan right.">
          <FontAwesomeIcon icon={faArrowRight} />
        </button>
        <button className="dinoSatSceneToolbarButton" onClick={onPanReset} title="Reset pan.">
          <FontAwesomeIcon icon={faCompass} />
        </button>
      </div>

      <div className="dinoSatSceneToolbarGroup">
        <button className="dinoSatSceneToolbarButton" onClick={() => onRotationChange(rotation - 90)} title="Rotate −90°.">
          <FontAwesomeIcon icon={faRotate} flip="horizontal" />
        </button>
        <span className="dinoSatSceneToolbarValue">{rotation}°</span>
        <button className="dinoSatSceneToolbarButton" onClick={() => onRotationChange(rotation + 90)} title="Rotate +90°.">
          <FontAwesomeIcon icon={faRotate} />
        </button>
        <button className="dinoSatSceneToolbarButton" onClick={onRotationReset} title="Reset rotation.">
          <FontAwesomeIcon icon={faCircleDot} />
        </button>
      </div>
    </div>
  );
};

const FeedStatusStrip = ({ metadata, registryLoading, expanded, onToggle, onRefresh }) => {
  if (registryLoading && !metadata) {
    return (
      <div className="dinoSatSpaceWeatherStrip dinoSatSpaceWeatherLoading">
        <FontAwesomeIcon icon={faSpinner} spin /> <span>Discovering live satellite feeds from NASA, NOAA, JMA, ESA, and other public sources...</span>
      </div>
    );
  }
  if (!metadata) {
    return (
      <div className="dinoSatSpaceWeatherStrip dinoSatSpaceWeatherUnavailable">
        <FontAwesomeIcon icon={faTriangleExclamation} /> <span>Feed registry unavailable.</span>
      </div>
    );
  }

  const totalAvailable = metadata.totalAvailable || 0;
  const totalUnavailable = metadata.totalUnavailable || 0;
  const liveCount = (metadata.feedTypeCounts?.video || 0) + (metadata.feedTypeCounts?.telemetry || 0);
  const imageCount = (metadata.feedTypeCounts?.image || 0) + (metadata.feedTypeCounts?.["image-sequence"] || 0);
  const earthObsCount = metadata.categoryCounts?.["Earth Observation"] || 0;
  const solarCount = metadata.categoryCounts?.["Solar Imagery"] || 0;
  const operatorCount = Object.keys(metadata.operatorCounts || {}).length;
  const buildSec = metadata.buildTimeMs ? Math.round(metadata.buildTimeMs / 1000) : null;

  return (
    <div className="dinoSatSpaceWeatherStrip">
      <div className="dinoSatSpaceWeatherStripCells">
        <div className="dinoSatSpaceWeatherCell" style={{ borderLeftColor: "#4ade80" }}>
          <div className="dinoSatSpaceWeatherCellLabel">Status</div>
          <div className="dinoSatSpaceWeatherCellValue" style={{ color: "#4ade80" }}>{totalAvailable} Live<span>{totalUnavailable} unavailable</span></div>
        </div>
        <div className="dinoSatSpaceWeatherCell" style={{ borderLeftColor: "#ef4444" }}>
          <div className="dinoSatSpaceWeatherCellLabel">Live Streams</div>
          <div className="dinoSatSpaceWeatherCellValue">{liveCount}<span>video + telemetry</span></div>
        </div>
        <div className="dinoSatSpaceWeatherCell" style={{ borderLeftColor: "#42a5f5" }}>
          <div className="dinoSatSpaceWeatherCellLabel">Imagery</div>
          <div className="dinoSatSpaceWeatherCellValue">{imageCount}<span>still + sequences</span></div>
        </div>
        <div className="dinoSatSpaceWeatherCell" style={{ borderLeftColor: "#a78bfa" }}>
          <div className="dinoSatSpaceWeatherCellLabel">Earth Obs</div>
          <div className="dinoSatSpaceWeatherCellValue">{earthObsCount}<span>GIBS layers</span></div>
        </div>
        <div className="dinoSatSpaceWeatherCell" style={{ borderLeftColor: "#facc15" }}>
          <div className="dinoSatSpaceWeatherCellLabel">Solar</div>
          <div className="dinoSatSpaceWeatherCellValue">{solarCount}<span>SDO + SOHO</span></div>
        </div>
        <div className="dinoSatSpaceWeatherCell" style={{ borderLeftColor: "#fb923c" }}>
          <div className="dinoSatSpaceWeatherCellLabel">Operators</div>
          <div className="dinoSatSpaceWeatherCellValue">{operatorCount}<span>distinct sources</span></div>
        </div>
        {buildSec !== null && (
          <div className="dinoSatSpaceWeatherCell">
            <div className="dinoSatSpaceWeatherCellLabel">Build Time</div>
            <div className="dinoSatSpaceWeatherCellValue">{buildSec}<span>seconds</span></div>
          </div>
        )}
      </div>

      <button className="dinoSatSpaceWeatherToggle" onClick={onToggle} title={expanded ? "Hide diagnostics." : "Show diagnostics."}>
        {expanded ? "Hide Diagnostics" : "Show Diagnostics"}
        <FontAwesomeIcon icon={expanded ? faChevronUp : faChevronDown} />
      </button>
    </div>
  );
};

const FeedDiagnosticsPanel = ({ metadata, unavailable, onClose, onRefresh, registryLoading }) => {
  const [activeSection, setActiveSection] = useState("overview");
  if (!metadata) return null;

  const sections = [
    { key: "overview", label: "Discovery Overview", icon: faGauge },
    { key: "categories", label: "By Category", icon: faLayerGroup },
    { key: "operators", label: "By Operator", icon: faObjectGroup },
    { key: "unavailable", label: "Unavailable Feeds", icon: faXmarkCircle },
    { key: "methodology", label: "Methodology", icon: faBookOpen }
  ];

  const renderOverview = () => (
    <div className="dinoSatDossierTabContent">
      <div className="dinoSatStatTileGrid">
        <StatTile label="Total Available" value={metadata.totalAvailable || 0} sub={`of ${metadata.totalCandidates || 0} candidates`} color="#4ade80" accent="#4ade80" large />
        <StatTile label="Unavailable" value={metadata.totalUnavailable || 0} sub="failed availability probe" color="#ef4444" accent="#ef4444" />
        <StatTile label="GIBS Layers Discovered" value={metadata.gibsLayerCount || 0} sub="WMTS capabilities" accent="#a78bfa" />
        <StatTile label="SDO Wavelengths" value={metadata.sdoWavelengthCount || 0} sub="latest-image directory" accent="#facc15" />
        <StatTile label="SOHO Products" value={metadata.sohoProductCount || 0} sub="realtime directory" accent="#facc15" />
        <StatTile label="GOES-East Products" value={metadata.goesEastProductCount || 0} sub="STAR directory" accent="#42a5f5" />
        <StatTile label="GOES-West Products" value={metadata.goesWestProductCount || 0} sub="STAR directory" accent="#42a5f5" />
        <StatTile label="YouTube Live" value={metadata.youtubeLiveStreamCount || 0} sub="trusted channels" accent="#ef4444" />
        <StatTile label="Catalog Size" value={metadata.catalogSize || 0} sub="NORAD seeds loaded" accent="#fb923c" />
        <StatTile label="Build Time" value={metadata.buildTimeMs ? `${Math.round(metadata.buildTimeMs / 1000)}` : "—"} unit="s" sub="discovery + probing" accent="#42a5f5" />
        <StatTile label="Built At" value={metadata.builtAt ? formatRelativeTime(metadata.builtAt) : "—"} sub={metadata.builtAt ? formatAbsoluteTime(metadata.builtAt) : ""} accent="#42a5f5" />
      </div>
    </div>
  );

  const renderCategories = () => {
    const entries = Object.entries(metadata.categoryCounts || {}).sort((a, b) => b[1] - a[1]);
    return (
      <div className="dinoSatDossierTabContent">
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faTable} /> Available Feeds by Category</span></div>
          <div className="dinoSatPanelCardBody">
            <div className="dinoSatTableScroll">
              <table className="dinoSatDataTable">
                <thead><tr><th>Category</th><th>Count</th><th>Share</th></tr></thead>
                <tbody>
                  {entries.map(([cat, count]) => (
                    <tr key={cat}>
                      <td><b>{cat}</b></td>
                      <td>{count}</td>
                      <td>{((count / (metadata.totalAvailable || 1)) * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faTable} /> Feed Type Distribution</span></div>
          <div className="dinoSatPanelCardBody">
            <div className="dinoSatTableScroll">
              <table className="dinoSatDataTable">
                <thead><tr><th>Feed Type</th><th>Count</th><th>Share</th></tr></thead>
                <tbody>
                  {Object.entries(metadata.feedTypeCounts || {}).sort((a, b) => b[1] - a[1]).map(([t, count]) => (
                    <tr key={t}>
                      <td><b>{t}</b></td>
                      <td>{count}</td>
                      <td>{((count / (metadata.totalAvailable || 1)) * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderOperators = () => {
    const entries = Object.entries(metadata.operatorCounts || {}).sort((a, b) => b[1] - a[1]);
    return (
      <div className="dinoSatDossierTabContent">
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faTable} /> Discovered Operators ({entries.length})</span></div>
          <div className="dinoSatPanelCardBody">
            <div className="dinoSatTableScroll">
              <table className="dinoSatDataTable">
                <thead><tr><th>Operator</th><th>Feed Count</th><th>Share</th></tr></thead>
                <tbody>
                  {entries.map(([op, count]) => (
                    <tr key={op}>
                      <td><b>{op}</b></td>
                      <td>{count}</td>
                      <td>{((count / (metadata.totalAvailable || 1)) * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderUnavailable = () => (
    <div className="dinoSatDossierTabContent">
      <div className="dinoSatPanelCard">
        <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faXmarkCircle} /> Feeds Failing Availability Probe ({unavailable?.length || 0})</span></div>
        <div className="dinoSatPanelCardBody">
          {(!unavailable || unavailable.length === 0) ? (
            <div className="dinoSatPanelEmpty">No unavailable feeds. All discovered feeds passed the availability probe.</div>
          ) : (
            <div className="dinoSatTableScroll">
              <table className="dinoSatDataTable">
                <thead><tr><th>Feed ID</th><th>Name</th><th>Category</th><th>Reason</th></tr></thead>
                <tbody>
                  {unavailable.map((f, i) => (
                    <tr key={i}>
                      <td><code>{f.id}</code></td>
                      <td>{f.name}</td>
                      <td>{f.category}</td>
                      <td style={{ color: "#ef4444" }}>{f.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderMethodology = () => (
    <div className="dinoSatDossierTabContent">
      <div className="dinoSatPanelCard">
        <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faBookOpen} /> Discovery Methodology</span></div>
        <div className="dinoSatPanelCardBody">
          <div className="dinoSatBriefingGrid">
            <div className="dinoSatBriefingItem">
              <b>NASA GIBS WMTS Capabilities</b>
              <p>The full WMTS capabilities XML is parsed at runtime to discover every available imagery layer published by NASA's Global Imagery Browse Services. Spacecraft platform and instrument are inferred from layer identifier and keyword tokens. Nothing about specific layers is hardcoded; if NASA adds or removes layers, this view reflects the change after the cache TTL elapses.</p>
            </div>
            <div className="dinoSatBriefingItem">
              <b>SDO and SOHO Directory Listings</b>
              <p>The SDO latest-image directory and the SOHO realtime directory are fetched as HTML and scanned for filename and folder patterns. Wavelength and product codes are extracted from these listings, not hardcoded. New wavelengths or products appear automatically once they show up in the directory.</p>
            </div>
            <div className="dinoSatBriefingItem">
              <b>NOAA STAR Directory Walk</b>
              <p>The NOAA NESDIS STAR ABI full-disk directory listings for GOES-East and GOES-West are scanned for product subdirectories. Each discovered subdirectory yields one feed pointing at the 5424×5424 native-resolution endpoint published by NOAA. Product titles are derived from the subdirectory codes.</p>
            </div>
            <div className="dinoSatBriefingItem">
              <b>NASA Image and Video Library</b>
              <p>Multiple thematic searches are issued against the NASA Image and Video Library API to discover archived video assets. Each candidate's MP4 asset URL is resolved via the per-asset metadata endpoint. Videos without resolvable MP4 URLs are dropped.</p>
            </div>
            <div className="dinoSatBriefingItem">
              <b>YouTube Live Search</b>
              <p>The YouTube Data API is queried against a curated allowlist of trusted institutional channels (NASA, NASA Live) for currently-broadcasting live streams. Title and description content is then filtered through include/exclude regex patterns to surface only orbital-camera streams (ISS Earth views, on-orbit hardware) and reject ground-based mission broadcasts (launches, press conferences, mission control).</p>
            </div>
            <div className="dinoSatBriefingItem">
              <b>Availability Probing</b>
              <p>Every discovered feed's primary URL is probed with a HEAD request before being exposed in the registry. HEAD failures fall back to a ranged GET. Feeds that fail both probes are placed in the unavailable list with their failure reason recorded. This prevents the UI from displaying broken thumbnails or hanging loaders.</p>
            </div>
            <div className="dinoSatBriefingItem">
              <b>NORAD Cross-Reference</b>
              <p>A static seed catalog of known operational satellites (ISS, DSCOVR, SDO, SOHO, GOES, Himawari, Terra, Aqua, Suomi NPP, NOAA-20, NOAA-21, Landsat, GCOM, SMAP, CALIPSO, OCO, Aura, Meteosat) is tokenized into a name-to-NORAD index. Each feed's spacecraft and instrument metadata is scored against this index so dossier views can link out to N2YO and Heavens-Above with correct catalog numbers.</p>
            </div>
            <div className="dinoSatBriefingItem">
              <b>Caching Strategy</b>
              <p>The full registry is cached for fifteen minutes and is rebuilt on demand or when the cache expires. Per-source caches have shorter TTLs matched to their refresh cadence: SDO and SOHO at five minutes, Himawari at ten minutes, and GOES directory listings at one hour.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="dinoSatSpaceWeatherDetail">
      <div className="dinoSatSpaceWeatherDetailHeader">
        <span>Feed Registry Diagnostics · {metadata.builtAt ? formatAbsoluteTime(metadata.builtAt) : "Unknown"}</span>
        <button className="dinoSatSatelliteCloseButton" onClick={onClose}><FontAwesomeIcon icon={faXmark} /></button>
      </div>
      <div className="dinoSatDossierTabs">
        <div className="dinoSatDossierTabsScroll">
          {sections.map(section => (
            <button
              key={section.key}
              className={`dinoSatDossierTab ${activeSection === section.key ? "dinoSatDossierTabActive" : ""}`}
              onClick={() => setActiveSection(section.key)}
            >
              <FontAwesomeIcon icon={section.icon} /> {section.label}
            </button>
          ))}
        </div>
      </div>
      <div className="dinoSatDossierBody">
        {activeSection === "overview" && renderOverview()}
        {activeSection === "categories" && renderCategories()}
        {activeSection === "operators" && renderOperators()}
        {activeSection === "unavailable" && renderUnavailable()}
        {activeSection === "methodology" && renderMethodology()}
      </div>
    </div>
  );
};

const FeedViewer = ({ feed, autoRefresh, onAutoRefreshToggle, onClose, onOpenDossier }) => {
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
            setIssTelemetryError("Telemetry stream error.");
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

  const handleMouseDown = useCallback((e) => {
    if (feed?.feedType === "video" || feed?.feedType === "telemetry") return;
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
    <div ref={containerRef} className="dinoSatFeedViewer">
      <div className="dinoSatFeedViewerHeader">
        <div className="dinoSatFeedViewerHeaderInfo">
          <div className="dinoSatFeedViewerHeaderTitle">
            <FontAwesomeIcon icon={FEED_TYPE_ICONS[feed.feedType] || faSatellite} style={{ color: FEED_TYPE_COLORS[feed.feedType] || "#42a5f5" }} />
            <span>{feed.name}</span>
            {feed.isLive && <span className="dinoSatFeedLiveBadge">LIVE</span>}
          </div>
          <div className="dinoSatFeedViewerHeaderMeta">
            <span>{feed.spacecraft}</span>
            <span>{feed.instrument}</span>
            <span>{feed.cadenceLabel}</span>
            {feed.coverageRegime && <span>{feed.coverageRegime}</span>}
            {feed.noradId && <span>NORAD {feed.noradId}</span>}
          </div>
        </div>
        <div className="dinoSatFeedViewerHeaderActions">
          <button className="dinoSatPassComputeButton" onClick={onOpenDossier}>
            <FontAwesomeIcon icon={faInfoCircle} /> Dossier
          </button>
          <button className="dinoSatSatelliteCloseButton" onClick={onClose}>
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
      </div>

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

      <div className="dinoSatFeedViewerStage" onMouseDown={handleMouseDown} style={isDraggingViewer ? { cursor: "grabbing" } : undefined}>
        {feed.feedType === "image" && currentImageUrl && (
          <>
            {imageLoading && !imageError && (
              <div className="dinoSatFeedViewerLoadingOverlay">
                <FontAwesomeIcon icon={faSpinner} spin />
                <small>Fetching imagery from {feed.operator}...</small>
              </div>
            )}
            {imageError && (
              <div className="dinoSatFeedViewerErrorOverlay">
                <div className="dinoSatFeedViewerErrorContent">
                  <FontAwesomeIcon icon={faTriangleExclamation} className="dinoSatFeedViewerErrorIcon" />
                  <p>Source unavailable.</p>
                  <small>The upstream server did not return imagery for this feed.</small>
                  <button className="dinoSatFeedViewerRetryLink" onClick={handleManualRefresh}>Retry</button>
                </div>
              </div>
            )}
            <img
              ref={imageRef}
              key={`${feed.id}-${imageVersion}`}
              src={currentImageUrl}
              alt={feed.name}
              className="dinoSatFeedViewerImage"
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
              <div className="dinoSatFeedViewerLoadingOverlay">
                <FontAwesomeIcon icon={faSpinner} spin />
                <small>Loading frame {sequenceIndex + 1} of {feed.images.length}...</small>
              </div>
            )}
            {imageError && (
              <div className="dinoSatFeedViewerErrorOverlay">
                <div className="dinoSatFeedViewerErrorContent">
                  <FontAwesomeIcon icon={faTriangleExclamation} className="dinoSatFeedViewerErrorIcon" />
                  <p>Frame unavailable.</p>
                  <small>This frame could not be loaded from the archive.</small>
                  <button className="dinoSatFeedViewerRetryLink" onClick={handleManualRefresh}>Retry</button>
                </div>
              </div>
            )}
            <img
              src={currentImageUrl}
              alt={`${feed.name} frame ${sequenceIndex + 1}`}
              className="dinoSatFeedViewerImage"
              style={{ ...filterStyle, ...transformStyle, opacity: imageError ? 0 : 1 }}
              draggable={false}
              onLoad={() => { setImageLoading(false); setImageError(false); }}
              onError={() => { setImageLoading(false); setImageError(true); }}
            />
            <div className="dinoSatFeedSequenceControls">
              <button className="dinoSatSceneToolbarButton" onClick={() => { setSequenceIndex(i => Math.max(0, i - 1)); setImageLoading(true); setImageError(false); }} disabled={sequenceIndex === 0}>
                <FontAwesomeIcon icon={faArrowLeft} />
              </button>
              <span className="dinoSatFeedSequenceLabel">
                Frame {sequenceIndex + 1} / {feed.images.length}
                {feed.images[sequenceIndex]?.date && (<small> · {formatAbsoluteTime(feed.images[sequenceIndex].date)}</small>)}
              </span>
              <button className="dinoSatSceneToolbarButton" onClick={() => { setSequenceIndex(i => Math.min(feed.images.length - 1, i + 1)); setImageLoading(true); setImageError(false); }} disabled={sequenceIndex >= feed.images.length - 1}>
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
            className="dinoSatFeedViewerIframe"
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
            className="dinoSatFeedViewerVideo"
            style={filterStyle}
            onLoadedData={() => { setImageLoading(false); setImageError(false); }}
            onError={() => { setImageLoading(false); setImageError(true); }}
          />
        )}

        {feed.feedType === "telemetry" && feed.id === "iss-position-tracker" && (
          <div className="dinoSatFeedViewerTelemetry">
            {!issTelemetry && !issTelemetryError && (
              <div className="dinoSatStatusDisplay">
                <FontAwesomeIcon icon={faSpinner} spin />
                <p>Connecting to ISS telemetry stream...</p>
              </div>
            )}
            {issTelemetryError && (
              <div className="dinoSatStatusDisplay dinoSatStatusError">
                <FontAwesomeIcon icon={faTriangleExclamation} />
                <p>{issTelemetryError}</p>
              </div>
            )}
            {issTelemetry && issTelemetry.position && (
              <div className="dinoSatStatTileGrid">
                <StatTile label="Latitude" value={issTelemetry.position.latitude.toFixed(4)} unit="°" sub={issTelemetry.position.latitude > 0 ? "Northern hemisphere" : "Southern hemisphere"} accent="#42a5f5" large />
                <StatTile label="Longitude" value={issTelemetry.position.longitude.toFixed(4)} unit="°" sub={issTelemetry.position.longitude > 0 ? "Eastern hemisphere" : "Western hemisphere"} accent="#42a5f5" large />
                <StatTile label="Altitude" value={issTelemetry.position.altitudeKm.toFixed(2)} unit="km" sub="above WGS-84 ellipsoid" accent="#4ade80" />
                <StatTile label="Velocity" value={issTelemetry.position.velocityKmh.toFixed(0)} unit="km/h" sub={`${(issTelemetry.position.velocityKmh / 3600).toFixed(2)} km/s`} accent="#4ade80" />
                <StatTile label="Footprint Radius" value={issTelemetry.position.footprintKm.toFixed(0)} unit="km" sub="visible from station" accent="#a78bfa" />
                <StatTile label="Visibility" value={issTelemetry.position.visibility} sub="solar illumination" color={issTelemetry.position.visibility === "daylight" ? "#facc15" : "#42a5f5"} accent={issTelemetry.position.visibility === "daylight" ? "#facc15" : "#42a5f5"} />
                <StatTile label="Solar Latitude" value={issTelemetry.position.solarLat?.toFixed(2) || "—"} unit="°" sub="subsolar point" accent="#facc15" />
                <StatTile label="Solar Longitude" value={issTelemetry.position.solarLon?.toFixed(2) || "—"} unit="°" sub="subsolar point" accent="#facc15" />
                <StatTile label="Total in Space" value={issTelemetry.totalInSpace || "—"} sub="all spacecraft" accent="#fb923c" />
                <StatTile label="ISS Crew" value={issTelemetry.crew?.length || 0} sub="aboard the station" accent="#ef4444" />
                <StatTile label="Day Number" value={issTelemetry.position.dayNum?.toFixed(2) || "—"} sub="MJD-relative" accent="#a78bfa" />
                <StatTile label="Updated" value={formatRelativeTime(issTelemetry.fetchedAt)} sub={formatAbsoluteTime(issTelemetry.fetchedAt)} accent="#4ade80" />
              </div>
            )}
            {issTelemetry && issTelemetry.crew && issTelemetry.crew.length > 0 && (
              <div className="dinoSatPanelCard">
                <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faList} /> Current ISS Crew</span></div>
                <div className="dinoSatPanelCardBody">
                  <div className="dinoSatInstrumentList">
                    {issTelemetry.crew.map((name, i) => (<span key={i} className="dinoSatInstrumentChip">{name}</span>))}
                  </div>
                </div>
              </div>
            )}
            {issTelemetry && issTelemetry.allPeople && issTelemetry.allPeople.length > 0 && (
              <div className="dinoSatPanelCard">
                <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faList} /> All Humans in Space ({issTelemetry.totalInSpace})</span></div>
                <div className="dinoSatPanelCardBody">
                  <div className="dinoSatTableScroll">
                    <table className="dinoSatDataTable">
                      <thead><tr><th>Name</th><th>Spacecraft</th></tr></thead>
                      <tbody>
                        {issTelemetry.allPeople.map((p, i) => (
                          <tr key={i}><td>{p.name}</td><td>{p.craft}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const FeedDossier = ({ feed, onClose }) => {
  const [activeTab, setActiveTab] = useState("overview");
  if (!feed) return null;

  const tabs = [
    { key: "overview", label: "Overview", icon: faInfoCircle },
    { key: "technical", label: "Technical", icon: faMicroscope },
    { key: "availability", label: "Availability", icon: faGauge },
    { key: "references", label: "References", icon: faLink }
  ];

  const renderOverview = () => (
    <div className="dinoSatDossierTabContent">
      <div className="dinoSatStatTileGrid">
        <StatTile label="Spacecraft" value={feed.spacecraft || "—"} sub={feed.catalogName || ""} accent={CATEGORY_COLORS[feed.category] || "#42a5f5"} large />
        <StatTile label="Operator" value={feed.operator || "—"} accent="#42a5f5" />
        <StatTile label="Instrument" value={feed.instrument || "—"} accent="#a78bfa" />
        <StatTile label="Category" value={feed.category || "—"} color={CATEGORY_COLORS[feed.category]} accent={CATEGORY_COLORS[feed.category] || "#42a5f5"} />
        <StatTile label="Feed Type" value={feed.feedType || "—"} color={FEED_TYPE_COLORS[feed.feedType]} accent={FEED_TYPE_COLORS[feed.feedType] || "#42a5f5"} />
        <StatTile label="Coverage" value={feed.coverageRegime || "—"} accent="#4ade80" />
        <StatTile label="Cadence" value={feed.cadenceLabel || "—"} accent="#4ade80" />
        <StatTile label="Live" value={feed.isLive ? "Yes" : "Archive"} color={feed.isLive ? "#4ade80" : "#fb923c"} accent={feed.isLive ? "#4ade80" : "#fb923c"} />
        {feed.noradId && (<StatTile label="NORAD ID" value={feed.noradId} sub={feed.catalogName || ""} accent="#fb923c" />)}
        {feed.latestTimestamp && (<StatTile label="Latest Frame" value={formatRelativeTime(feed.latestTimestamp)} sub={formatAbsoluteTime(feed.latestTimestamp)} accent="#facc15" />)}
      </div>

      <div className="dinoSatPanelCard">
        <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faBookOpen} /> Description</span></div>
        <div className="dinoSatPanelCardBody">
          <p className="dinoSatMissionBriefText">{safeRenderText(feed.description)}</p>
        </div>
      </div>

      {feed.keywords && feed.keywords.length > 0 && (
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faList} /> Keywords</span></div>
          <div className="dinoSatPanelCardBody">
            <div className="dinoSatInstrumentList">
              {feed.keywords.slice(0, 24).map((k, i) => (<span key={i} className="dinoSatInstrumentChip">{k}</span>))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderTechnical = () => (
    <div className="dinoSatDossierTabContent">
      <div className="dinoSatPanelCard">
        <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faTable} /> Technical Properties</span></div>
        <div className="dinoSatPanelCardBody">
          <div className="dinosatSatelliteHUDSectionGrid">
            <div className="dinosatSatelliteHUDSectionItem"><span>Feed ID</span><span>{feed.id}</span></div>
            <div className="dinosatSatelliteHUDSectionItem"><span>Spacecraft</span><span>{feed.spacecraft}</span></div>
            <div className="dinosatSatelliteHUDSectionItem"><span>Operator</span><span>{feed.operator}</span></div>
            <div className="dinosatSatelliteHUDSectionItem"><span>Instrument</span><span>{feed.instrument}</span></div>
            <div className="dinosatSatelliteHUDSectionItem"><span>Feed Type</span><span>{feed.feedType}</span></div>
            <div className="dinosatSatelliteHUDSectionItem"><span>Category</span><span>{feed.category}</span></div>
            <div className="dinosatSatelliteHUDSectionItem"><span>Coverage Regime</span><span>{feed.coverageRegime || "—"}</span></div>
            <div className="dinosatSatelliteHUDSectionItem"><span>Cadence</span><span>{feed.cadenceLabel || "—"}</span></div>
            <div className="dinosatSatelliteHUDSectionItem"><span>NORAD ID</span><span>{feed.noradId || "—"}</span></div>
            <div className="dinosatSatelliteHUDSectionItem"><span>Catalog Name</span><span>{feed.catalogName || "—"}</span></div>
            <div className="dinosatSatelliteHUDSectionItem"><span>Live</span><span>{feed.isLive ? "Yes" : "No"}</span></div>
            {feed.layerIdentifier && <div className="dinosatSatelliteHUDSectionItem"><span>GIBS Layer</span><span>{feed.layerIdentifier}</span></div>}
            {feed.tileMatrixSets && <div className="dinosatSatelliteHUDSectionItem"><span>Tile Matrix Sets</span><span>{feed.tileMatrixSets.join(", ")}</span></div>}
            {feed.format && <div className="dinosatSatelliteHUDSectionItem"><span>Format</span><span>{feed.format}</span></div>}
            {feed.wavelengthCode && <div className="dinosatSatelliteHUDSectionItem"><span>Wavelength Code</span><span>{feed.wavelengthCode}</span></div>}
            {feed.productCode && <div className="dinosatSatelliteHUDSectionItem"><span>Product Code</span><span>{feed.productCode}</span></div>}
            {feed.platform && <div className="dinosatSatelliteHUDSectionItem"><span>Platform</span><span>{feed.platform}</span></div>}
            {feed.latestTimestamp && <div className="dinosatSatelliteHUDSectionItem"><span>Latest Timestamp</span><span>{formatAbsoluteTime(feed.latestTimestamp)}</span></div>}
          </div>
        </div>
      </div>
    </div>
  );

  const renderAvailability = () => {
    const probedUrl = feed.imageUrl || feed.previewUrl || feed.videoUrl || feed.embedUrl || (feed.images?.[0]?.url) || null;
    return (
      <div className="dinoSatDossierTabContent">
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faGauge} /> Availability Probe Result</span></div>
          <div className="dinoSatPanelCardBody">
            <div className="dinoSatStatTileGrid">
              <StatTile label="Status" value={feed.availability?.ok ? "Available" : "Unavailable"} color={feed.availability?.ok ? "#4ade80" : "#ef4444"} accent={feed.availability?.ok ? "#4ade80" : "#ef4444"} large />
              <StatTile label="HTTP Status" value={feed.availability?.status || "—"} sub={feed.availability?.ok ? "2xx success" : feed.availability?.status >= 400 ? "client/server error" : "no response"} accent="#42a5f5" />
              <StatTile label="Probe Kind" value={feed.availability?.kind || "—"} sub="URL field tested" accent="#42a5f5" />
              <StatTile label="Content Type" value={feed.availability?.contentType?.split(";")[0] || "—"} sub={feed.availability?.contentType?.includes(";") ? feed.availability.contentType.split(";")[1].trim() : ""} accent="#a78bfa" />
              <StatTile label="Content Length" value={feed.availability?.contentLength ? `${(feed.availability.contentLength / 1024).toFixed(1)}` : "—"} unit={feed.availability?.contentLength ? "KB" : ""} sub={feed.availability?.contentLength ? `${feed.availability.contentLength.toLocaleString()} bytes` : "not reported"} accent="#fb923c" />
              <StatTile label="Last Modified" value={feed.availability?.lastModified ? formatRelativeTime(feed.availability.lastModified) : "—"} sub={feed.availability?.lastModified || "not reported by source"} accent="#facc15" />
              <StatTile label="Probed At" value={feed.availability?.checkedAt ? formatRelativeTime(feed.availability.checkedAt) : "—"} sub={feed.availability?.checkedAt ? formatAbsoluteTime(feed.availability.checkedAt) : ""} accent="#4ade80" />
              <StatTile label="Cadence" value={feed.cadenceLabel || "—"} sub="expected refresh interval" accent="#4ade80" />
              <StatTile label="Live Status" value={feed.isLive ? "Active" : "Archive"} color={feed.isLive ? "#4ade80" : "#fb923c"} sub={feed.isLive ? "currently updating" : "static archive"} accent={feed.isLive ? "#4ade80" : "#fb923c"} />
              {feed.availability?.error && (<StatTile label="Error" value={feed.availability.error.substring(0, 24)} color="#ef4444" sub={feed.availability.error.length > 24 ? feed.availability.error.substring(24, 80) : ""} accent="#ef4444" large />)}
            </div>
          </div>
        </div>

        {probedUrl && (
          <div className="dinoSatPanelCard">
            <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faLink} /> Probed Endpoint</span></div>
            <div className="dinoSatPanelCardBody">
              <div className="dinoSatTLEBlock">{probedUrl}</div>
            </div>
          </div>
        )}

        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faBookOpen} /> Probing Methodology</span></div>
          <div className="dinoSatPanelCardBody">
            <div className="dinoSatBriefingGrid">
              <div className="dinoSatBriefingItem">
                <b>HEAD Request</b>
                <p>The primary URL for this feed was probed with an HTTP HEAD request before being added to the registry. HEAD returns headers only without transferring the body, making the check fast and bandwidth-efficient.</p>
              </div>
              <div className="dinoSatBriefingItem">
                <b>Ranged GET Fallback</b>
                <p>If the source rejects HEAD, a ranged GET fetching only the first 1 KB is used as a fallback. This catches sources that return 405 for HEAD but serve content via GET.</p>
              </div>
              <div className="dinoSatBriefingItem">
                <b>Cache TTL</b>
                <p>Probe results are cached for 5 minutes to avoid hammering source servers on repeated registry rebuilds. Probes outside that window will re-check the source.</p>
              </div>
              <div className="dinoSatBriefingItem">
                <b>Trusted Sources</b>
                <p>Feeds from known-stable institutional sources (NASA GIBS, NOAA STAR, JMA NICT, EUMETSAT, NASA SDO/SOHO) bypass the probe to avoid false negatives from servers that block automated availability checks.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderReferences = () => {
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
        desc: "Official NASA GIBS API documentation covering WMTS, WMS, and TWMS endpoints, plus tile coordinate systems and dimension parameters.",
        host: "nasa-gibs.github.io"
      });
    }
    if (feed.id?.startsWith("sdo-")) {
      refCards.push({
        key: "sdo-mission",
        href: "https://sdo.gsfc.nasa.gov/",
        name: "SDO Mission Home",
        desc: "Solar Dynamics Observatory mission home page with current solar imagery, instrument descriptions, and operational status.",
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
        desc: "ESA/NASA Solar and Heliospheric Observatory mission page with realtime imagery, CME tracking, and instrument summaries.",
        host: "soho.nascom.nasa.gov"
      });
    }
    if (feed.id?.startsWith("goes16-") || feed.id?.startsWith("goes18-") || feed.id?.startsWith("goes17-") || feed.id?.startsWith("goes19-")) {
      refCards.push({
        key: "goes-star",
        href: "https://www.star.nesdis.noaa.gov/goes/",
        name: "NOAA STAR GOES Imagery",
        desc: "NOAA NESDIS STAR division portal for GOES-East and GOES-West imagery products with sector views and animation tools.",
        host: "star.nesdis.noaa.gov"
      });
    }
    if (feed.id?.startsWith("eumetsat-")) {
      refCards.push({
        key: "eumetview",
        href: "https://eumetview.eumetsat.int/static-images/latestImages/",
        name: "EUMETView Latest Images",
        desc: "EUMETSAT public catalog of the latest geostationary and polar-orbiter imagery from Meteosat and Metop platforms.",
        host: "eumetview.eumetsat.int"
      });
    }
    if (feed.id === "himawari-fulldisk") {
      refCards.push({
        key: "nict-himawari",
        href: "https://himawari8.nict.go.jp/",
        name: "NICT Himawari Realtime Web",
        desc: "Japan NICT realtime Himawari viewer with zoom, time-lapse, and full-resolution downloads.",
        host: "himawari8.nict.go.jp"
      });
    }
    if (feed.id === "iss-position-tracker") {
      refCards.push({
        key: "wheretheiss",
        href: "https://wheretheiss.at/",
        name: "Where The ISS At?",
        desc: "Public ISS tracking service providing position, velocity, footprint, and visibility classification.",
        host: "wheretheiss.at"
      });
      refCards.push({
        key: "iss-tracker",
        href: "https://www.nasa.gov/spot-the-station/",
        name: "NASA Spot the Station",
        desc: "Official NASA tool for finding upcoming visible passes of the ISS over your location.",
        host: "nasa.gov"
      });
    }
    if (feed.noradId) {
      refCards.push({
        key: "n2yo",
        href: `https://www.n2yo.com/satellite/?s=${feed.noradId}`,
        name: "N2YO Real-Time Tracking",
        desc: "Real-time orbital tracking, pass predictions, ground track visualization, and visibility maps.",
        host: "n2yo.com"
      });
      refCards.push({
        key: "heavens-above",
        href: `https://www.heavens-above.com/orbit.aspx?satid=${feed.noradId}`,
        name: "Heavens-Above Orbit Page",
        desc: "Detailed orbital element history, visual observation guides, and brightness estimates.",
        host: "heavens-above.com"
      });
    }

    return (
      <div className="dinoSatDossierTabContent">
        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faSatelliteDish} /> Sources & References</span></div>
          <div className="dinoSatPanelCardBody">
            {feed.sources && feed.sources.length > 0 && (
              <>
                <h5>Data Sources</h5>
                <div className="dinoSatInstrumentList">
                  {feed.sources.map((s, i) => (<span key={i} className="dinoSatInstrumentChip">{s}</span>))}
                </div>
              </>
            )}
            {refCards.length > 0 && (
              <div className="dinoSatExternalRefGrid" style={{ marginTop: "12px" }}>
                {refCards.map(r => (
                  <a key={r.key} href={r.href} target="_blank" rel="noopener noreferrer" className="dinoSatExternalRefCard">
                    <div className="dinoSatExternalRefName">{r.name}</div>
                    <div className="dinoSatExternalRefDesc">{r.desc}</div>
                    <div className="dinoSatExternalRefUrl">{r.host}</div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="dinoSatSpaceWeatherDetail">
      <div className="dinoSatSpaceWeatherDetailHeader">
        <span>Feed Dossier · {feed.name}</span>
        <button className="dinoSatSatelliteCloseButton" onClick={onClose}><FontAwesomeIcon icon={faXmark} /></button>
      </div>
      <div className="dinoSatDossierTabs">
        <div className="dinoSatDossierTabsScroll">
          {tabs.map(tab => (
            <button key={tab.key} className={`dinoSatDossierTab ${activeTab === tab.key ? "dinoSatDossierTabActive" : ""}`} onClick={() => setActiveTab(tab.key)}>
              <FontAwesomeIcon icon={tab.icon} /> {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="dinoSatDossierBody">
        {activeTab === "overview" && renderOverview()}
        {activeTab === "technical" && renderTechnical()}
        {activeTab === "availability" && renderAvailability()}
        {activeTab === "references" && renderReferences()}
      </div>
    </div>
  );
};

const HUDPanel = ({ metadata, feeds, onClose, onSelect }) => {
  const stats = useMemo(() => {
    if (!feeds) return null;
    const live = feeds.filter(f => f.isLive).length;
    const archive = feeds.length - live;
    const withNorad = feeds.filter(f => f.noradId).length;
    const probed = feeds.filter(f => f.availability?.ok).length;
    return { live, archive, withNorad, probed };
  }, [feeds]);

  return (
    <div className="dinoSatSatelliteHUDPanel" tabIndex={0}>
      <div className="dinoSatSatelliteHUDPanelHeader">
        <span>Feed Telemetry HUD</span>
        <button className="dinoSatSatelliteCloseButton" onClick={onClose}><FontAwesomeIcon icon={faXmark} /></button>
      </div>
      <div className="dinoSatSatelliteHUDContent">
        <div className="dinoSatStatTileGrid">
          <StatTile label="Total Feeds" value={feeds?.length || 0} sub="all available" accent="#42a5f5" large />
          <StatTile label="Live Feeds" value={stats?.live || 0} color="#ef4444" accent="#ef4444" />
          <StatTile label="Archive Feeds" value={stats?.archive || 0} color="#fb923c" accent="#fb923c" />
          <StatTile label="With NORAD ID" value={stats?.withNorad || 0} sub="cross-referenced" accent="#a78bfa" />
          <StatTile label="Availability Probed" value={stats?.probed || 0} color="#4ade80" accent="#4ade80" />
          <StatTile label="Build Time" value={metadata?.buildTimeMs ? `${Math.round(metadata.buildTimeMs / 1000)}` : "—"} unit="s" accent="#42a5f5" />
        </div>

        <div className="dinoSatPanelCard">
          <div className="dinoSatPanelCardHeader"><span><FontAwesomeIcon icon={faTable} /> Recently Refreshed Feeds</span></div>
          <div className="dinoSatPanelCardBody">
            <div className="dinoSatTableScroll">
              <table className="dinoSatDataTable">
                <thead><tr><th>Feed</th><th>Type</th><th>Category</th><th>Last Modified</th><th></th></tr></thead>
                <tbody>
                  {(feeds || []).filter(f => f.availability?.lastModified).sort((a, b) => new Date(b.availability.lastModified).getTime() - new Date(a.availability.lastModified).getTime()).slice(0, 25).map(f => (
                    <tr key={f.id}>
                      <td><b>{f.name}</b></td>
                      <td>{f.feedType}</td>
                      <td>{f.category}</td>
                      <td>{formatRelativeTime(f.availability.lastModified)}</td>
                      <td><button className="dinoSatSatelliteSelectButton" onClick={() => onSelect && onSelect(f)}>View</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function SatelliteFeeds() {
  const [feeds, setFeeds] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [unavailable, setUnavailable] = useState([]);
  const [registryLoading, setRegistryLoading] = useState(true);
  const [errors, setErrors] = useState([]);
  const [showErrors, setShowErrors] = useState(false);
  const [copiedErrors, setCopiedErrors] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterFeedType, setFilterFeedType] = useState("all");
  const [filterLive, setFilterLive] = useState("all");
  const [sortBy, setSortBy] = useState("category");

  const [selectedFeed, setSelectedFeed] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [theme, setTheme] = useState("dark");

  const [diagnosticsExpanded, setDiagnosticsExpanded] = useState(false);
  const [hudVisible, setHudVisible] = useState(false);
  const [dossierFeed, setDossierFeed] = useState(null);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [legendCollapsed, setLegendCollapsed] = useState(false);
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);

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
      setErrors([`Failed to open registry stream: ${error.message}.`]);
      return;
    }
    eventSourceRef.current = eventSource;

    let helloReceived = false;
    const accumulator = [];
    const seen = new Set();

    const connectionTimeout = setTimeout(() => {
      if (!helloReceived) {
        setErrors(prev => [...prev, "Registry stream connection timeout."]);
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
          setFeeds(prev => prev.concat(additions));
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

  const filteredFeeds = useMemo(() => {
    let result = feeds;
    if (debouncedSearchTerm) {
      const lower = debouncedSearchTerm.toLowerCase();
      result = result.filter(f =>
        f.name.toLowerCase().includes(lower) ||
        (f.spacecraft || "").toLowerCase().includes(lower) ||
        (f.operator || "").toLowerCase().includes(lower) ||
        (f.instrument || "").toLowerCase().includes(lower) ||
        (f.category || "").toLowerCase().includes(lower) ||
        String(f.noradId || "").includes(lower)
      );
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
    if (sortBy === "name") {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "category") {
      result = [...result].sort((a, b) => (a.category || "").localeCompare(b.category || "") || a.name.localeCompare(b.name));
    } else if (sortBy === "operator") {
      result = [...result].sort((a, b) => (a.operator || "").localeCompare(b.operator || "") || a.name.localeCompare(b.name));
    } else if (sortBy === "live") {
      result = [...result].sort((a, b) => (b.isLive ? 1 : 0) - (a.isLive ? 1 : 0) || a.name.localeCompare(b.name));
    }
    return result;
  }, [feeds, debouncedSearchTerm, filterCategory, filterFeedType, filterLive, sortBy]);

  const distinctCategories = useMemo(() => {
    const set = new Set();
    feeds.forEach(f => { if (f.category) set.add(f.category); });
    return Array.from(set).sort();
  }, [feeds]);

  const distinctFeedTypes = useMemo(() => {
    const set = new Set();
    feeds.forEach(f => { if (f.feedType) set.add(f.feedType); });
    return Array.from(set).sort();
  }, [feeds]);

  const handleVirtualScroll = useCallback((e) => {
    setVirtualScrollOffset(e.target.scrollTop);
  }, []);

  const getVirtualScrollItems = useMemo(() => {
    if (!virtualScrollRef.current) {
      return { visibleItems: filteredFeeds.slice(0, 20), startIndex: 0 };
    }
    const containerHeight = virtualScrollRef.current.clientHeight || 400;
    const itemHeight = PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT;
    const buffer = PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_BUFFER;
    const startIndex = Math.max(0, Math.floor(virtualScrollOffset / itemHeight) - buffer);
    const endIndex = Math.min(filteredFeeds.length - 1, Math.ceil((virtualScrollOffset + containerHeight) / itemHeight) + buffer);
    return { visibleItems: filteredFeeds.slice(startIndex, endIndex + 1), startIndex };
  }, [filteredFeeds, virtualScrollOffset]);

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
      feeds: feeds,
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
  }, [feeds, metadata, unavailable]);

  const exportCSV = useCallback(() => {
    let csv = "ID,Name,Spacecraft,Operator,Instrument,Category,FeedType,NoradId,IsLive,Coverage,Cadence,Available,HttpStatus\n";
    feeds.forEach(f => {
      csv += `${csvQuote(f.id)},${csvQuote(f.name)},${csvQuote(f.spacecraft)},${csvQuote(f.operator)},${csvQuote(f.instrument)},${csvQuote(f.category)},${csvQuote(f.feedType)},${csvQuote(f.noradId || "")},${f.isLive},${csvQuote(f.coverageRegime)},${csvQuote(f.cadenceLabel)},${f.availability?.ok ? "yes" : "no"},${f.availability?.status || ""}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "satellite_feeds.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [feeds]);

  const copyAllErrors = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(errors.join("\n"));
      setCopiedErrors(true);
      setTimeout(() => setCopiedErrors(false), 2000);
    } catch (error) {}
  }, [errors]);

  const { visibleItems, startIndex } = getVirtualScrollItems;
  const anyOverlayPanelOpen = hudVisible || !!dossierFeed || diagnosticsExpanded;

  return (
    <div className="dinoSatPageWrapper">
      <DinoLabsNav activePage={"sat"} />

      <div className={`dinoSatSatelliteTrackerContainer satellite-theme-${theme}`}>
        <div className={`dinoSatSatelliteSideBar ${sidebarCollapsed ? "dinoSatSatelliteSideBarCollapsed" : ""}`}>
          {registryLoading && feeds.length === 0 && (
            <div className="dinoSatSatelliteSideBarLoadingContainer">
              <label>Discovering Live Feeds...</label>
              <div className="dinoSatSatelliteSideBarLoadingBar">
                <div className="dinoSatSatelliteSideBarLoadingBarAccent" />
              </div>
              <small>NASA · NOAA · JMA · ESA · Space-Track</small>
            </div>
          )}

          <div className="dinoSatSatelliteSideBarHeader">
            <h1>{!sidebarCollapsed && <small>Satellite Feeds</small>}</h1>

            {!sidebarCollapsed && (
              <>
                <div className="dinoSatSatelliteSideBarThemeSelector">
                  <button className={`dinoSatSatelliteSelectButton ${theme === "dark" ? "dinoSatSatelliteButtonActive" : ""}`} onClick={() => setTheme("dark")}>Dark</button>
                  <button className={`dinoSatSatelliteSelectButton ${theme === "neon" ? "dinoSatSatelliteButtonActive" : ""}`} onClick={() => setTheme("neon")}>Neon</button>
                </div>

                <div className="dinoSatSatelliteSideBarThemeSelector">
                  <div className="dinoSatSatelliteSideBarThemeSelectorStatusIndicator">
                    {registryLoading ? "Loading..." : "Ready"}
                    {metadata && (
                      <div style={{ fontSize: "9px", marginTop: "2px" }}>
                        {metadata.totalAvailable} feeds · {metadata.buildTimeMs ? `${Math.round(metadata.buildTimeMs / 1000)}s build` : ""}
                      </div>
                    )}
                  </div>
                </div>

                {errors.length > 0 && (
                  <div className="dinoSatSatelliteSideBarThemeSelector">
                    <div className="dinoSatSatelliteSideBarThemeSelectorErrorIndicator" onClick={() => setShowErrors(!showErrors)} style={{ opacity: showErrors ? 1.0 : "", paddingTop: showErrors ? "" : 0, paddingBottom: showErrors ? "" : 0 }}>
                      <div className="dinoSatSatelliteSideBarThemeSelectorErrorIndicatorHeader">
                        <span>Discovery Warnings ({errors.length})</span>
                        <button onClick={(e) => { e.stopPropagation(); copyAllErrors(); }} aria-label="Copy all errors.">
                          <FontAwesomeIcon icon={copiedErrors ? faSquareCheck : faClone} size="sm" />
                        </button>
                      </div>
                      {showErrors && (
                        <div className="dinoSatSatelliteSideBarThemeSelectorErrorIndicatorList">
                          {errors.map((error, index) => (<div key={index} style={{ opacity: 0.8 }}>{error}</div>))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {!sidebarCollapsed && (
            <>
              <div className="dinoSatSatelliteSearchControls">
                <input type="text" placeholder="Search feeds..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="dinoSatSatelliteSearchInput" />
                <div className="dinoSatSatelliteSelectControls">
                  <button className="dinoSatSatelliteSelectButton" onClick={() => fetchRegistry(true)} disabled={registryLoading}>
                    <FontAwesomeIcon icon={registryLoading ? faSpinner : faArrowsRotate} spin={registryLoading} /> Rebuild
                  </button>
                  <button className="dinoSatSatelliteSelectButton" onClick={exportJSON}>JSON</button>
                  <button className="dinoSatSatelliteSelectButton" onClick={exportCSV}>CSV</button>
                </div>
              </div>

              <div className="dinoSatSatelliteTLEQualityBar">
                <div className="dinoSatTLEQualityCount" style={{ color: "#ef4444" }} title="Video"><b>{feeds.filter(f => f.feedType === "video").length}</b><span>video</span></div>
                <div className="dinoSatTLEQualityCount" style={{ color: "#42a5f5" }} title="Image"><b>{feeds.filter(f => f.feedType === "image").length}</b><span>image</span></div>
                <div className="dinoSatTLEQualityCount" style={{ color: "#4ade80" }} title="Sequences"><b>{feeds.filter(f => f.feedType === "image-sequence").length}</b><span>seq</span></div>
                <div className="dinoSatTLEQualityCount" style={{ color: "#fb923c" }} title="Telemetry"><b>{feeds.filter(f => f.feedType === "telemetry").length}</b><span>tlm</span></div>
                <div className="dinoSatTLEQualityCount" style={{ color: "#4ade80" }} title="Live Feeds"><b>{feeds.filter(f => f.isLive).length}</b><span>live</span></div>
              </div>

              <div className="dinoSatSatelliteObjectsHeader">
                <span className="dinoSatSatelliteObjectsHeaderIcon"><FontAwesomeIcon icon={faSatellite} /></span>
                <span>Feeds ({filteredFeeds.length}/{feeds.length})</span>
              </div>

              <div ref={virtualScrollRef} className="dinoSatSatelliteList satellite-list" style={{ flex: 1, overflowY: "auto", position: "relative" }} onScroll={handleVirtualScroll}>
                <div style={{ height: filteredFeeds.length * PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT, position: "relative" }}>
                  <div style={{ position: "absolute", top: startIndex * PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT, width: "100%" }}>
                    {visibleItems.map((feed) => (
                      <div
                        key={feed.id}
                        className={`dinoSatSatelliteListItem satellite-item ${selectedFeed?.id === feed.id ? "satellite-selected dinoSatSatelliteButtonActive" : ""}`}
                        style={{ height: PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT, minHeight: PERFORMANCE_CONSTANTS.VIRTUAL_SCROLL_ITEM_HEIGHT }}
                        onClick={() => setSelectedFeed(feed)}
                      >
                        <div className="dinoSatSatelliteIndicator" style={{ backgroundColor: FEED_TYPE_COLORS[feed.feedType] || "#42a5f5" }} />
                        <div className="dinoSatSatelliteTleBadge" style={{ backgroundColor: feed.isLive ? "#4ade80" : "#fb923c" }} title={feed.isLive ? "Live" : "Archive"} />
                        <div className="dinoSatSatelliteFeedListBody">
                          <div className="dinoSatSatelliteName satellite-name">{feed.name}</div>
                          <div className="dinoSatSatelliteFeedListMeta">
                            <span>{feed.spacecraft}</span>
                            {feed.noradId && <span>· NORAD {feed.noradId}</span>}
                          </div>
                        </div>
                        <button className="dinoSatSatelliteInfoButton" onClick={(e) => { e.stopPropagation(); openDossier(feed); }} aria-label="Show dossier.">
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

        <div className={`dinoSatSatelliteMainView ${anyOverlayPanelOpen ? "dinoSatPanelOpen" : ""}`}>
          <FeedStatusStrip metadata={metadata} registryLoading={registryLoading && feeds.length === 0} expanded={diagnosticsExpanded} onToggle={toggleDiagnostics} onRefresh={() => fetchRegistry(true)} />

          {diagnosticsExpanded && (
            <FeedDiagnosticsPanel metadata={metadata} unavailable={unavailable} onClose={() => setDiagnosticsExpanded(false)} onRefresh={() => fetchRegistry(true)} registryLoading={registryLoading} />
          )}

          {hudVisible && (
            <HUDPanel metadata={metadata} feeds={feeds} onClose={() => setHudVisible(false)} onSelect={(f) => { setHudVisible(false); setSelectedFeed(f); }} />
          )}

          {dossierFeed && (
            <FeedDossier feed={dossierFeed} onClose={() => setDossierFeed(null)} />
          )}

          <div className="dinonSatSatelliteViewHeader">
            <div className="dinoSatSatellitePlaybackControls">
              <button className={`dinoSatSatellitePlaybackControlsButton ${autoRefresh ? "dinoSatSatelliteButtonActive" : ""}`} onClick={() => setAutoRefresh(v => !v)} aria-label="Toggle auto-refresh.">
                <FontAwesomeIcon icon={autoRefresh ? faPause : faPlay} /> Auto-refresh
              </button>

              <button className={`dinoSatSatellitePlaybackControlsButton ${hudVisible ? "dinoSatSatelliteButtonActive" : ""}`} onClick={toggleHUD}>
                <FontAwesomeIcon icon={faChartLine} /> HUD
              </button>

              <button className={`dinoSatSatellitePlaybackControlsButton ${diagnosticsExpanded ? "dinoSatSatelliteButtonActive" : ""}`} onClick={toggleDiagnostics}>
                <FontAwesomeIcon icon={faGauge} /> Diagnostics
              </button>

              <button className="dinoSatSatellitePlaybackControlsButton" onClick={() => fetchRegistry(true)} disabled={registryLoading}>
                <FontAwesomeIcon icon={registryLoading ? faSpinner : faArrowsRotate} spin={registryLoading} /> Rebuild Registry
              </button>

              <select className="dinoSatSatelliteFPSSelect" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} aria-label="Filter category.">
                <option value="all">All Categories</option>
                {distinctCategories.map(c => (<option key={c} value={c}>{c}</option>))}
              </select>

              <select className="dinoSatSatelliteFPSSelect" value={filterFeedType} onChange={(e) => setFilterFeedType(e.target.value)} aria-label="Filter feed type.">
                <option value="all">All Types</option>
                {distinctFeedTypes.map(t => (<option key={t} value={t}>{t}</option>))}
              </select>

              <select className="dinoSatSatelliteFPSSelect" value={filterLive} onChange={(e) => setFilterLive(e.target.value)} aria-label="Filter live status.">
                <option value="all">Live + Archive</option>
                <option value="live">Live Only</option>
                <option value="archive">Archive Only</option>
              </select>

              <select className="dinoSatSatelliteFPSSelect" value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Sort.">
                <option value="category">Sort: Category</option>
                <option value="name">Sort: Name</option>
                <option value="operator">Sort: Operator</option>
                <option value="live">Sort: Live first</option>
              </select>

              <button className="dinoSatSatellitePlaybackControlsButton" onClick={exportJSON}>JSON</button>
              <button className="dinoSatSatellitePlaybackControlsButton" onClick={exportCSV}>CSV</button>
            </div>
          </div>

          <div className="dinoSatMainContent">
            <div className="dinoSatCanvasArea">
              {!anyOverlayPanelOpen && selectedFeed && (
                <FeedViewer
                  feed={selectedFeed}
                  autoRefresh={autoRefresh}
                  onAutoRefreshToggle={() => setAutoRefresh(v => !v)}
                  onClose={() => setSelectedFeed(null)}
                  onOpenDossier={() => openDossier(selectedFeed)}
                />
              )}

              {!anyOverlayPanelOpen && !selectedFeed && (
                <div className="dinoSatFeedGalleryWrapper">
                  {registryLoading && feeds.length === 0 ? (
                    <div className="dinoSatStatusDisplay">
                      <FontAwesomeIcon icon={faSpinner} spin />
                      <p>Discovering live satellite feeds across NASA GIBS, NOAA STAR, JMA Himawari, ESA SOHO, NASA SDO, NASA EPIC, the NASA Image and Video Library, and the Space-Track satellite catalog. This includes a per-feed availability probe to filter out broken sources.</p>
                    </div>
                  ) : filteredFeeds.length === 0 ? (
                    <div className="dinoSatStatusDisplay">
                      <FontAwesomeIcon icon={faMagnifyingGlass} />
                      <p>No feeds match the current filter. Adjust the search term, category, feed type, or live filter to see more results.</p>
                    </div>
                  ) : (
                    <div className="dinoSatFeedGallery">
                      {filteredFeeds.slice(0, 60).map(feed => (
                        <button key={feed.id} className="dinoSatFeedGalleryCard" onClick={() => setSelectedFeed(feed)}>
                          <div className="dinoSatFeedGalleryThumbWrapper">
                            {(feed.thumbnailUrl || feed.imageUrl || feed.previewUrl || feed.posterUrl) ? (
                              <img src={proxyImageUrl(feed.id, { thumb: true })} alt={feed.name} className="dinoSatFeedGalleryThumb" loading="lazy" onError={(e) => { e.target.style.display = "none"; }} />
                            ) : (
                              <div className="dinoSatFeedGalleryThumbPlaceholder">
                                <FontAwesomeIcon icon={FEED_TYPE_ICONS[feed.feedType] || faSatellite} style={{ color: FEED_TYPE_COLORS[feed.feedType] || "#42a5f5" }} />
                              </div>
                            )}
                            {feed.isLive && <span className="dinoSatFeedGalleryLiveBadge">LIVE</span>}
                            <span className="dinoSatFeedGalleryTypeBadge" style={{ backgroundColor: FEED_TYPE_COLORS[feed.feedType] || "#42a5f5" }}>
                              <FontAwesomeIcon icon={FEED_TYPE_ICONS[feed.feedType] || faSatellite} /> {feed.feedType}
                            </span>
                          </div>
                          <div className="dinoSatFeedGalleryBody">
                            <div className="dinoSatFeedGalleryTitle">{feed.name}</div>
                            <div className="dinoSatFeedGallerySub">
                              <span style={{ color: CATEGORY_COLORS[feed.category] || "#42a5f5" }}>{feed.category}</span>
                              <span>· {feed.spacecraft}</span>
                            </div>
                            <div className="dinoSatFeedGalleryMeta">
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

            <div className="dinoSatRightRail">
              <div className="dinoSatRightRailSection">
                <button className="dinoSatRightRailSectionHeader" onClick={() => setFiltersCollapsed(c => !c)}>
                  <span>Quick Filters</span>
                  <FontAwesomeIcon icon={filtersCollapsed ? faChevronDown : faChevronUp} />
                </button>
                {!filtersCollapsed && (
                  <div className="dinoSatRightRailSectionBody">
                    <div className="dinoSatRailControlGrid">
                      <button className={`dinoSatSatelliteControlButton ${filterLive === "live" ? "dinoSatSatelliteButtonActive" : ""}`} onClick={() => setFilterLive(filterLive === "live" ? "all" : "live")}>
                        <FontAwesomeIcon icon={faBolt} /> Live Only
                      </button>
                      <button className={`dinoSatSatelliteControlButton ${filterFeedType === "video" ? "dinoSatSatelliteButtonActive" : ""}`} onClick={() => setFilterFeedType(filterFeedType === "video" ? "all" : "video")}>
                        <FontAwesomeIcon icon={faVideo} /> Video
                      </button>
                      <button className={`dinoSatSatelliteControlButton ${filterFeedType === "image" ? "dinoSatSatelliteButtonActive" : ""}`} onClick={() => setFilterFeedType(filterFeedType === "image" ? "all" : "image")}>
                        <FontAwesomeIcon icon={faImage} /> Imagery
                      </button>
                      <button className={`dinoSatSatelliteControlButton ${filterFeedType === "image-sequence" ? "dinoSatSatelliteButtonActive" : ""}`} onClick={() => setFilterFeedType(filterFeedType === "image-sequence" ? "all" : "image-sequence")}>
                        <FontAwesomeIcon icon={faLayerGroup} /> Sequences
                      </button>
                      <button className={`dinoSatSatelliteControlButton ${filterFeedType === "telemetry" ? "dinoSatSatelliteButtonActive" : ""}`} onClick={() => setFilterFeedType(filterFeedType === "telemetry" ? "all" : "telemetry")}>
                        <FontAwesomeIcon icon={faTowerBroadcast} /> Telemetry
                      </button>
                      <button className={`dinoSatSatelliteControlButton ${filterCategory === "Solar Imagery" ? "dinoSatSatelliteButtonActive" : ""}`} onClick={() => setFilterCategory(filterCategory === "Solar Imagery" ? "all" : "Solar Imagery")}>
                        <FontAwesomeIcon icon={faSun} /> Solar
                      </button>
                      <button className={`dinoSatSatelliteControlButton ${filterCategory === "Earth Observation" ? "dinoSatSatelliteButtonActive" : ""}`} onClick={() => setFilterCategory(filterCategory === "Earth Observation" ? "all" : "Earth Observation")}>
                        <FontAwesomeIcon icon={faGlobe} /> Earth Obs
                      </button>
                      <button className={`dinoSatSatelliteControlButton ${filterCategory === "Geostationary Imagery" ? "dinoSatSatelliteButtonActive" : ""}`} onClick={() => setFilterCategory(filterCategory === "Geostationary Imagery" ? "all" : "Geostationary Imagery")}>
                        <FontAwesomeIcon icon={faSatelliteDish} /> GEO
                      </button>
                      <button className="dinoSatSatelliteControlButton" onClick={() => { setFilterLive("all"); setFilterCategory("all"); setFilterFeedType("all"); setSearchTerm(""); }}>
                        <FontAwesomeIcon icon={faXmark} /> Clear Filters
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="dinoSatRightRailSection">
                <button className="dinoSatRightRailSectionHeader" onClick={() => setLegendCollapsed(c => !c)}>
                  <span>Legend</span>
                  <FontAwesomeIcon icon={legendCollapsed ? faChevronDown : faChevronUp} />
                </button>
                {!legendCollapsed && (
                  <div className="dinoSatRightRailSectionBody">
                    <h5 style={{ fontSize: "0.55rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--st-text-muted)", marginBottom: "8px" }}>Feed Types</h5>
                    <div className="dinoSatRailLegendList">
                      {Object.entries(FEED_TYPE_COLORS).map(([type, color]) => (
                        <div key={type} className="dinoSatSatelliteLegendItem">
                          <div className="dinoSatSatelliteLegendColor" style={{ backgroundColor: color }} />
                          <span>{type}</span>
                        </div>
                      ))}
                    </div>
                    <h5 style={{ fontSize: "0.55rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--st-text-muted)", margin: "12px 0 8px 0" }}>Categories</h5>
                    <div className="dinoSatRailLegendList">
                      {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
                        <div key={cat} className="dinoSatSatelliteLegendItem">
                          <div className="dinoSatSatelliteLegendColor" style={{ backgroundColor: color }} />
                          <span>{cat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {metadata && (
                <div className="dinoSatRightRailSection">
                  <button className="dinoSatRightRailSectionHeader">
                    <span>Discovery Stats</span>
                    <FontAwesomeIcon icon={faChevronUp} />
                  </button>
                  <div className="dinoSatRightRailSectionBody">
                    <div className="dinosatSatelliteHUDSectionGrid">
                      <div className="dinosatSatelliteHUDSectionItem"><span>Available</span><span style={{ color: "#4ade80" }}>{metadata.totalAvailable}</span></div>
                      <div className="dinosatSatelliteHUDSectionItem"><span>Unavailable</span><span style={{ color: "#ef4444" }}>{metadata.totalUnavailable}</span></div>
                      <div className="dinosatSatelliteHUDSectionItem"><span>GIBS Layers</span><span>{metadata.gibsLayerCount}</span></div>
                      <div className="dinosatSatelliteHUDSectionItem"><span>SDO Wavelengths</span><span>{metadata.sdoWavelengthCount}</span></div>
                      <div className="dinosatSatelliteHUDSectionItem"><span>SOHO Products</span><span>{metadata.sohoProductCount}</span></div>
                      <div className="dinosatSatelliteHUDSectionItem"><span>GOES-East</span><span>{metadata.goesEastProductCount}</span></div>
                      <div className="dinosatSatelliteHUDSectionItem"><span>GOES-West</span><span>{metadata.goesWestProductCount}</span></div>
                      <div className="dinosatSatelliteHUDSectionItem"><span>YouTube Live</span><span>{metadata.youtubeLiveStreamCount}</span></div>
                      <div className="dinosatSatelliteHUDSectionItem"><span>Catalog Seeds</span><span>{metadata.catalogSize || 0}</span></div>
                      <div className="dinosatSatelliteHUDSectionItem"><span>Build Time</span><span>{metadata.buildTimeMs ? `${Math.round(metadata.buildTimeMs / 1000)}s` : "—"}</span></div>
                      <div className="dinosatSatelliteHUDSectionItem"><span>Built</span><span>{metadata.builtAt ? formatRelativeTime(metadata.builtAt) : "—"}</span></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}