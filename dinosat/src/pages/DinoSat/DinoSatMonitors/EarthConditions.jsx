import React, { useEffect, useRef, useState, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faThermometerHalf, faWind, faEye, faCloudRain, faBolt, faGlobe, faWater,
  faExclamationTriangle, faSquareCheck, faXmarkSquare, faChartLine, faRefresh,
  faDownload, faInfoCircle, faMapMarkerAlt, faClock, faSignal, faShield,
  faRocket, faSatellite, faCloud, faWaveSquare, faTachometerAlt, faBiohazard,
  faPlane, faAnchor, faLeaf, faSun, faGlobeAmericas, faDatabase, faNetworkWired,
  faSatelliteDish, faUserAstronaut, faTemperatureLow, faCloudShowersHeavy,
  faSnowflake, faSmog, faHouseUser, faHelicopter, faRedo, faBell, faHistory,
  faSearchPlus, faMagnet, faTint, faFire, faFilter, faCog, faFlask, faChevronDown, faChevronRight,
  faBroadcastTower, faHourglassHalf, faWaveSquare as faSeismic,
} from "@fortawesome/free-solid-svg-icons";
import DinoLabsNav from "../../../helpers/Nav.jsx";
import ReactEcharts from "echarts-for-react";
import "../../../styles/mainStyles/DinoSat/DinoSatMonitors/EarthConditions.css";

const DATA_TYPE = {
  LIVE: { label: "LIVE", icon: faBroadcastTower, color: "#22c55e", description: "Real-time observation" },
  FORECAST: { label: "FORECAST", icon: faCloudShowersHeavy, color: "#6366f1", description: "Predicted future conditions" },
  TREND: { label: "TREND", icon: faChartLine, color: "#8b5cf6", description: "Calculated trend projection" },
  HISTORICAL: { label: "HISTORICAL", icon: faHistory, color: "#64748b", description: "Past recorded data" },
  COMPUTED: { label: "COMPUTED", icon: faDatabase, color: "#0ea5e9", description: "Derived from current data" },
  PROBABILISTIC: { label: "PROBABILITY", icon: faHourglassHalf, color: "#f59e0b", description: "Statistical likelihood" }
};

const WINDY_OVERLAYS = [
  { id: "radar", name: "Weather Radar", icon: faSatelliteDish, category: "Standard" },
  { id: "satellite", name: "Satellite", icon: faGlobeAmericas, category: "Standard" },
  { id: "wind", name: "Wind", icon: faWind, category: "Standard" },
  { id: "gust", name: "Wind Gusts", icon: faWind, category: "Standard" },
  { id: "rain", name: "Rain & Thunder", icon: faCloudRain, category: "Standard" },
  { id: "thunder", name: "Thunderstorms", icon: faBolt, category: "Standard" },
  { id: "rainAccu", name: "Rain Accumulation", icon: faCloudShowersHeavy, category: "Standard" },
  { id: "temp", name: "Temperature", icon: faThermometerHalf, category: "Standard" },
  { id: "dewpoint", name: "Dew Point", icon: faTint, category: "Standard" },
  { id: "rh", name: "Humidity", icon: faTint, category: "Standard" },
  { id: "pressure", name: "Pressure", icon: faTachometerAlt, category: "Standard" },
  { id: "uvindex", name: "UV Index", icon: faSun, category: "Standard" },
  { id: "clouds", name: "Clouds", icon: faCloud, category: "Aviation" },
  { id: "hclouds", name: "High Clouds", icon: faCloud, category: "Aviation" },
  { id: "mclouds", name: "Medium Clouds", icon: faCloud, category: "Aviation" },
  { id: "lclouds", name: "Low Clouds", icon: faSmog, category: "Aviation" },
  { id: "fog", name: "Fog", icon: faSmog, category: "Aviation" },
  { id: "cloudtop", name: "Cloud Tops", icon: faPlane, category: "Aviation" },
  { id: "cbase", name: "Cloud Base", icon: faHelicopter, category: "Aviation" },
  { id: "visibility", name: "Visibility", icon: faEye, category: "Aviation" },
  { id: "cape", name: "CAPE Index", icon: faBolt, category: "Aviation" },
  { id: "turbulence", name: "Clear Air Turbulence", icon: faPlane, category: "Aviation" },
  { id: "icing", name: "Icing Severity", icon: faSnowflake, category: "Aviation" },
  { id: "deg0", name: "Freezing Altitude", icon: faTemperatureLow, category: "Aviation" },
  { id: "snowAccu", name: "New Snow", icon: faSnowflake, category: "Winter" },
  { id: "snowcover", name: "Snow Depth", icon: faSnowflake, category: "Winter" },
  { id: "ptype", name: "Precipitation Type", icon: faFilter, category: "Winter" },
  { id: "wetbulbtemp", name: "Wet Bulb Temp", icon: faThermometerHalf, category: "Winter" },
  { id: "waves", name: "Waves", icon: faWater, category: "Marine" },
  { id: "swell1", name: "Swell 1", icon: faWater, category: "Marine" },
  { id: "swell2", name: "Swell 2", icon: faWater, category: "Marine" },
  { id: "swell3", name: "Swell 3", icon: faWater, category: "Marine" },
  { id: "wwaves", name: "Wind Waves", icon: faWater, category: "Marine" },
  { id: "sst", name: "Sea Temperature", icon: faThermometerHalf, category: "Marine" },
  { id: "currents", name: "Currents", icon: faAnchor, category: "Marine" },
  { id: "currentsTide", name: "Tidal Currents", icon: faAnchor, category: "Marine" },
  { id: "cosc", name: "CO Concentration", icon: faBiohazard, category: "Air Quality" },
  { id: "tcso2", name: "SO2 Mass", icon: faSmog, category: "Air Quality" },
  { id: "no2", name: "NO2", icon: faSmog, category: "Air Quality" },
  { id: "pm2p5", name: "PM2.5", icon: faSmog, category: "Air Quality" },
  { id: "aod550", name: "Aerosol", icon: faSmog, category: "Air Quality" },
  { id: "gtco3", name: "Ozone Layer", icon: faShield, category: "Air Quality" },
  { id: "go3", name: "Surface Ozone", icon: faShield, category: "Air Quality" },
  { id: "fwi", name: "Fire Weather Index", icon: faFire, category: "Air Quality" },
  { id: "dfm10h", name: "Fuel Moisture", icon: faLeaf, category: "Air Quality" }
];

const VEHICLE_TYPES = {
  HEAVY_LIFT: { name: "Heavy Lift", icon: faRocket, payload: "50,000+ kg" },
  MEDIUM_LIFT: { name: "Medium Lift", icon: faSatellite, payload: "10,000-50,000 kg" },
  SMALL_LIFT: { name: "Small Lift", icon: faRocket, payload: "< 10,000 kg" },
  CREW_RATED: { name: "Crew Rated", icon: faUserAstronaut, payload: "Crew + Cargo" },
  REUSABLE: { name: "Reusable", icon: faRedo, payload: "Variable" }
};

const PROPELLANT_TYPES = {
  RP1_LOX: { name: "RP-1/LOX", toxicity: "LOW", components: ["RP-1", "LOX"] },
  LH2_LOX: { name: "LH2/LOX", toxicity: "LOW", components: ["LH2", "LOX"] },
  HYPERGOLIC: { name: "Hypergolic (N2O4/UDMH)", toxicity: "HIGH", components: ["N2O4", "UDMH"] },
  SOLID: { name: "Solid (APCP)", toxicity: "MODERATE", components: ["APCP", "HCl"] },
  METHANE_LOX: { name: "Methane/LOX", toxicity: "LOW", components: ["CH4", "LOX"] }
};

const SEVERITY_CONFIG = {
  CRITICAL: { color: "#78686a", icon: faExclamationTriangle },
  WARNING: { color: "#706a5a", icon: faExclamationTriangle },
  ADVISORY: { color: "#6a6a78", icon: faInfoCircle },
  INFO: { color: "#5a6a78", icon: faInfoCircle },
  NOMINAL: { color: "#5a7068", icon: faSquareCheck }
};

export default function EarthConditions() {
  const [loading, setLoading] = useState(false);
  const [consolidatedData, setConsolidatedData] = useState(null);
  const [errors, setErrors] = useState([]);
  const [activeTab, setActiveTab] = useState("commandIntegrity");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(60000);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [launchSites, setLaunchSites] = useState({});
  const [selectedSite, setSelectedSite] = useState("28.5721,-80.648");
  const [vehicleType, setVehicleType] = useState("HEAVY_LIFT");
  const [launchTime, setLaunchTime] = useState(new Date().toISOString());
  const [launchAzimuth, setLaunchAzimuth] = useState(90);
  const [dataExportFormat] = useState("json");
  const [alertHistory, setAlertHistory] = useState([]);
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState(new Set());
  const [performanceMetrics, setPerformanceMetrics] = useState({ latency: 0, availability: 100 });
  const [mapCategoryFilter, setMapCategoryFilter] = useState("all");
  const [mapSearchTerm, setMapSearchTerm] = useState("");
  const [mapAltitude] = useState("surface");
  const [alertsFilter, setAlertsFilter] = useState("all");
  const [violationsFilter, setViolationsFilter] = useState("all");
  const [showVehicleConfig, setShowVehicleConfig] = useState(false);
  const [dragCoefficient, setDragCoefficient] = useState("0.35");
  const [vehicleMassOverride, setVehicleMassOverride] = useState("549054");
  const [vehicleThrustOverride, setVehicleThrustOverride] = useState("7607000");
  const [vehicleDiameterOverride, setVehicleDiameterOverride] = useState("3.7");
  const [vehicleIspOverride, setVehicleIspOverride] = useState("282");
  const [propellantType, setPropellantType] = useState("RP1_LOX");
  const [propellantMass, setPropellantMass] = useState("411000");
  const [referenceArea, setReferenceArea] = useState("10.75");
  const [maxQLimit, setMaxQLimit] = useState("40000");
  const [visibilityRequirement, setVisibilityRequirement] = useState("5000");
  const [missionDuration, setMissionDuration] = useState("2");
  const [componentRadLimit, setComponentRadLimit] = useState("100");
  const [tvcCapability, setTvcCapability] = useState("0.05");
  const intervalRef = useRef(null);

  const safeRenderValue = useCallback((value, fallback = "—") => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === "object") {
      return value.value !== undefined ? value.value : JSON.stringify(value);
    }
    return String(value);
  }, []);

  const safeNumber = useCallback((value, fallback = 0) => {
    if (value === null || value === undefined) return fallback;
    const num = parseFloat(value);
    return isNaN(num) ? fallback : num;
  }, []);

  const getAllAlerts = useCallback(() => {
    if (!consolidatedData?.alerts) return [];
    return [...consolidatedData.alerts].sort((a, b) => {
      const order = { CRITICAL: 0, WARNING: 1, ADVISORY: 2, INFO: 3 };
      return (order[a.severity] || 4) - (order[b.severity] || 4);
    });
  }, [consolidatedData]);

  const getAllViolations = useCallback(() => {
    if (!consolidatedData?.violations) return [];
    return [...consolidatedData.violations].sort((a, b) => {
      const order = { CRITICAL: 0, WARNING: 1, ADVISORY: 2, INFO: 3 };
      return (order[a.severity] || 4) - (order[b.severity] || 4);
    });
  }, [consolidatedData]);

  const getConsolidatedDecision = useCallback(() => {
    if (!consolidatedData?.decision) {
      return {
        status: "UNKNOWN",
        confidence: 0,
        primaryReason: "Awaiting telemetry.",
        category: "INIT",
        allReasons: [],
        riskScore: 1.0,
        dataAvailability: 0,
        alertSummary: { critical: 0, warning: 0, total: 0 },
        violationSummary: { critical: 0, warning: 0, total: 0 },
        dataSourceSummary: { total: 0, operational: 0, failed: 0, failedCritical: 0 }
      };
    }
    return consolidatedData.decision;
  }, [consolidatedData]);

  const getModuleData = useCallback((moduleName) => {
    if (!consolidatedData?.detailed_modules) return null;
    return consolidatedData.detailed_modules[moduleName];
  }, [consolidatedData]);

  const renderDataTypeBadge = useCallback((dataType, size = "normal") => {
    const config = DATA_TYPE[dataType] || DATA_TYPE.LIVE;
    const sizeClass = size === "small" ? "dinosatEarthCondDataTypeBadgeSmall" : "";
    return (
      <span
        className={`dinosatEarthCondDataTypeBadge ${sizeClass}`}
        style={{ backgroundColor: config.color + "20", color: config.color, borderColor: config.color }}
        title={config.description}
      >
        <FontAwesomeIcon icon={config.icon} />
        <span>{config.label}</span>
      </span>
    );
  }, []);

  const renderDataTypeIndicator = useCallback((dataType) => {
    const config = DATA_TYPE[dataType] || DATA_TYPE.LIVE;
    return (
      <div className="dinosatEarthCondDataTypeIndicator" style={{ color: config.color }} title={config.description}>
        <FontAwesomeIcon icon={config.icon} />
      </div>
    );
  }, []);

  const fetchLaunchSites = useCallback(async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/launch-sites`);
      if (response.ok) {
        const data = await response.json();
        const rawSites = data.sites || {};

        const sites = {};
        for (const [key, site] of Object.entries(rawSites)) {
          const nameLower = (site.displayName || "").toLowerCase();
          if (nameLower.includes("unknown") || nameLower === "pad" || nameLower.trim() === "") {
            continue;
          }
          sites[key] = site;
        }

        setLaunchSites(sites);
        const siteKeys = Object.keys(sites);
        if (siteKeys.length > 0 && !sites[selectedSite]) {
          setSelectedSite(siteKeys[0]);
        }
      }
    } catch (error) {
      setLaunchSites({
        "28.5721,-80.648": { name: "SLC-40", country: "USA", location: "Cape Canaveral SFS", displayName: "SLC-40 - Cape Canaveral SFS" }
      });
    }
  }, [selectedSite]);

  const fetchConsolidatedEvaluation = useCallback(async () => {
    const startTime = performance.now();
    setLoading(true);
    setErrors([]);

    try {
      const [lat, lon] = selectedSite.split(",").map(Number);

      const requestBody = {
        lat,
        lon,
        vehicleType,
        launchAzimuth,
        propellantType: propellantType,
        propellantMass: propellantMass ? parseFloat(propellantMass) : null
      };

      if (dragCoefficient && !isNaN(parseFloat(dragCoefficient))) {
        requestBody.dragCoefficient = parseFloat(dragCoefficient);
      }
      if (vehicleMassOverride && !isNaN(parseFloat(vehicleMassOverride))) {
        requestBody.vehicleMass = parseFloat(vehicleMassOverride);
      }
      if (vehicleThrustOverride && !isNaN(parseFloat(vehicleThrustOverride))) {
        requestBody.vehicleThrust = parseFloat(vehicleThrustOverride);
      }
      if (vehicleDiameterOverride && !isNaN(parseFloat(vehicleDiameterOverride))) {
        requestBody.vehicleDiameter = parseFloat(vehicleDiameterOverride);
      }
      if (vehicleIspOverride && !isNaN(parseFloat(vehicleIspOverride))) {
        requestBody.vehicleIsp = parseFloat(vehicleIspOverride);
      }
      if (referenceArea && !isNaN(parseFloat(referenceArea))) {
        requestBody.referenceArea = parseFloat(referenceArea);
      }
      if (maxQLimit && !isNaN(parseFloat(maxQLimit))) {
        requestBody.maxQLimit = parseFloat(maxQLimit);
      }
      if (visibilityRequirement && !isNaN(parseFloat(visibilityRequirement))) {
        requestBody.visibilityRequirement = parseFloat(visibilityRequirement);
      }
      if (missionDuration && !isNaN(parseFloat(missionDuration))) {
        requestBody.missionDuration = parseFloat(missionDuration);
      }
      if (componentRadLimit && !isNaN(parseFloat(componentRadLimit))) {
        requestBody.componentRadLimit = parseFloat(componentRadLimit);
      }
      if (tvcCapability && !isNaN(parseFloat(tvcCapability))) {
        requestBody.tvcCapability = parseFloat(tvcCapability);
      }

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/consolidated-evaluation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setConsolidatedData(data);

      setPerformanceMetrics(prev => ({
        ...prev,
        latency: Math.round(performance.now() - startTime),
        availability: 100
      }));

      if (data.alerts && data.alerts.length > 0) {
        setAlertHistory(prev => [
          ...data.alerts.map(a => ({ ...a, receivedAt: new Date().toISOString() })),
          ...prev
        ].slice(0, 200));
      }

    } catch (error) {
      setErrors(prev => [...prev, {
        timestamp: new Date().toISOString(),
        message: error.message,
        severity: "ERROR"
      }]);
      setPerformanceMetrics(prev => ({ ...prev, availability: 0 }));
    } finally {
      setLoading(false);
    }
  }, [selectedSite, vehicleType, launchAzimuth, dragCoefficient, vehicleMassOverride, vehicleThrustOverride, vehicleDiameterOverride, vehicleIspOverride, propellantType, propellantMass, referenceArea, maxQLimit, visibilityRequirement, missionDuration, componentRadLimit, tvcCapability]);

  const acknowledgeAlert = useCallback((alertId) => setAcknowledgedAlerts(prev => new Set([...prev, alertId])), []);
  const acknowledgeAllAlerts = useCallback(() => setAcknowledgedAlerts(prev => new Set([...prev, ...getAllAlerts().map(a => a.id)])), [getAllAlerts]);

  const getResponsiveOptions = useCallback((screenSize) => {
    if (screenSize < 499) return { fontSize: 0, grid: { left: 0, right: 0, bottom: 0, top: 0 }, lineWidth: 0, symbolSize: 0 };
    if (screenSize <= 699) return { fontSize: 9, grid: { left: 40, right: 40, bottom: 8, top: 12 }, lineWidth: 1.5, symbolSize: 4 };
    if (screenSize <= 1299) return { fontSize: 10, grid: { left: 40, right: 40, bottom: 35, top: 30 }, lineWidth: 2, symbolSize: 5 };
    return { fontSize: 11, grid: { left: 60, right: 60, bottom: 40, top: 40 }, lineWidth: 2.5, symbolSize: 6 };
  }, []);

  const createDynamicLineChart = useCallback((title, data, xKey, yKey, unitKey = "", colorOverride = null, isForecast = false) => {
    const screenSize = window.innerWidth;
    const { fontSize, grid, lineWidth, symbolSize } = getResponsiveOptions(screenSize);
    if (!data || !Array.isArray(data) || data.length === 0) return null;
    const chartData = data.map(item => safeNumber(typeof yKey === "function" ? yKey(item) : item[yKey], 0));
    const xAxisData = data.map((item, index) => typeof xKey === "function" ? xKey(item, index) : (item[xKey] !== undefined ? String(item[xKey]) : String(index)));
    const lineStyleType = isForecast ? "dashed" : "solid";
    return {
      tooltip: {
        trigger: "axis", backgroundColor: "rgba(8,8,12,0.95)", borderColor: "rgba(99,102,241,0.2)", textStyle: { color: "#dce1eb", fontSize: 10, fontFamily: "SF Mono, monospace" },
        formatter: (params) => `<div style="padding:4px"><div style="font-size:9px;color:#64748b;margin-bottom:4px">${title}${isForecast ? " (FORECAST)" : " (OBSERVED)"}</div>${params.map(p => `<div>${p.seriesName}: <span style="color:#6366f1">${parseFloat(p.data).toFixed(2)}${unitKey}</span></div>`).join("")}</div>`
      },
      xAxis: { type: "category", data: xAxisData, axisLabel: { color: "rgba(180,190,210,0.9)", fontSize, fontFamily: "SF Mono" }, axisLine: { lineStyle: { color: "rgba(80,90,120,0.3)" } }, splitLine: { show: false } },
      yAxis: { type: "value", axisLabel: { color: "rgba(180,190,210,0.9)", fontSize, fontFamily: "SF Mono" }, splitLine: { lineStyle: { color: "rgba(80,90,120,0.15)", type: "dashed" } } },
      series: [{ name: title, data: chartData, type: "line", smooth: true, itemStyle: { color: colorOverride || "#6366f1" }, lineStyle: { color: colorOverride || "#6366f1", width: lineWidth, type: lineStyleType }, symbol: "circle", symbolSize, showSymbol: false, areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: (colorOverride || "#6366f1") + "50" }, { offset: 1, color: "transparent" }] } } }],
      grid: { ...grid, containLabel: true }
    };
  }, [getResponsiveOptions, safeNumber]);

  const renderDynamicChart = useCallback((chartConfig, className = "dinosatEarthCondChart", dataType = null) => {
    if (!chartConfig) return <div className="dinosatEarthCondNoChartData">No data available.</div>;
    return (
      <div className="dinosatEarthCondChartWrapper">
        <ReactEcharts option={chartConfig} className={className} />
      </div>
    );
  }, []);

  const renderDataTable = useCallback((title, headers, rows, dataType = null) => (
    <div className={`dinosatEarthCondTableCard ${dataType === "FORECAST" || dataType === "TREND" || dataType === "PROBABILISTIC" ? "dinosatEarthCondTableCardForecast" : ""}`}>
      <div className="dinosatEarthCondTableHeader">
        <h3>{title}</h3>
      </div>
      <div className="dinosatEarthCondTableWrapper">
        <table className="dinosatEarthCondDataTable">
          <thead><tr>{headers.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
          <tbody>{rows.length > 0 ? rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{safeRenderValue(cell)}</td>)}</tr>) : <tr><td colSpan={headers.length} className="dinosatEarthCondTableNoData">No data</td></tr>}</tbody>
        </table>
      </div>
    </div>
  ), [safeRenderValue]);
  const renderAlertItem = useCallback((alert, showAcknowledge = true) => {
    const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.INFO;
    const isAcknowledged = acknowledgedAlerts.has(alert.id);
    return (
      <div key={alert.id} className={`dinosatEarthCondAlertItem dinosatEarthCondAlert${alert.severity} ${isAcknowledged ? "dinosatEarthCondAlertAcknowledged" : ""}`}>
        <div className="dinosatEarthCondAlertHeader">
          <div className="dinosatEarthCondAlertIcon" style={{ color: config.color }}><FontAwesomeIcon icon={config.icon} /></div>
          <div className="dinosatEarthCondAlertMeta">
            <span className="dinosatEarthCondAlertSeverity" style={{ color: config.color }}>{alert.severity}</span>
            <span className="dinosatEarthCondAlertCategory">{alert.category}</span>
            <span className="dinosatEarthCondAlertTime">{new Date(alert.timestamp).toLocaleTimeString()}</span>
          </div>
          {showAcknowledge && !isAcknowledged && <button className="dinosatEarthCondAlertAckBtn" onClick={() => acknowledgeAlert(alert.id)}><FontAwesomeIcon icon={faSquareCheck} /></button>}
        </div>
        <div className="dinosatEarthCondAlertMessage">{alert.message}</div>
        {alert.source && <div className="dinosatEarthCondAlertSource">Source: {alert.source}</div>}
      </div>
    );
  }, [acknowledgedAlerts, acknowledgeAlert]);

  const renderViolationItem = useCallback((violation) => {
    const config = SEVERITY_CONFIG[violation.severity] || SEVERITY_CONFIG.INFO;
    return (
      <div key={violation.id} className={`dinosatEarthCondViolationItem dinosatEarthCondViolation${violation.severity}`}>
        <div className="dinosatEarthCondAlertHeaderSplit">
          <span className="dinosatEarthCondAlertHeaderSplitStart">
            <FontAwesomeIcon className="dinosatEarthCondAlertIcon" icon={config.icon} style={{ color: config.color }} />
            <span className="dinosatEarthCondAlertCategory">{violation.parameter}</span>
          </span>
          <span className="dinosatEarthCondAlertSeverity" style={{ color: config.color }}>{violation.severity}</span>
        </div>
        <div className="dinosatEarthCondViolationDetails">
          <div className="dinosatEarthCondViolationValue"><span>Value:</span> <strong>{violation.value}</strong></div>
          <div className="dinosatEarthCondViolationLimit"><span>Limit:</span> <strong>{violation.limit}</strong></div>
        </div>
        {violation.message && <div className="dinosatEarthCondAlertMessagePadded">{violation.message}</div>}
        {violation.recommendedAction && <div className="dinosatEarthCondAlertSource">{violation.recommendedAction}</div>}
      </div>
    );
  }, []);

  const renderDataSourceStatus = useCallback((dataSources) => {
    if (!dataSources?.length) return <div className="dinosatEarthCondNoChartData">No data sources.</div>;
    return (
      <div className="dinosatEarthCondDataSourceGrid">
        {dataSources.map((source, idx) => {
          const statusColor = source.status === "AVAILABLE" || source.status === "OPERATIONAL" ? "#22c55e" : source.status === "DEGRADED" ? "#8b5cf6" : source.status === "FAILED" ? "#7c3aed" : "#64748b";
          return (
            <div key={idx} className="dinosatEarthCondDataSourceItem" style={{ borderLeftColor: statusColor }}>
              <div className="dinosatEarthCondDataSourceHeader">
                <div className="dinosatEarthCondDataSourceIndicator" style={{ backgroundColor: statusColor }} />
                <span className="dinosatEarthCondDataSourceName">{source.name.replace(/_/g, " ")}</span>
                <span className="dinosatEarthCondDataSourceStatus" style={{ color: statusColor }}>{source.status}</span>
              </div>
              <div className="dinosatEarthCondDataSourceMeta">
                <span>Criticality: {source.criticality}</span>
                {source.responseTime && <span>{source.responseTime}ms</span>}
                {source.errorCount > 0 && <span style={{ color: "#7c3aed" }}>err: {source.errorCount}</span>}
              </div>
            </div>
          );
        })}
      </div>
    );
  }, []);

  const renderConfidenceBreakdown = useCallback((decision) => {
    if (!decision) return null;
    const alertSummary = decision.alertSummary || { critical: 0, warning: 0, total: 0 };
    const violationSummary = decision.violationSummary || { critical: 0, warning: 0, total: 0 };
    const dataSourceSummary = decision.dataSourceSummary || { total: 0, operational: 0, failed: 0, failedCritical: 0 };
    return (
      <div className="dinosatEarthCondConfidenceBreakdown">
        <div className="dinosatEarthCondConfidenceSection">
          <h4>Data Sources</h4>
          <div className="dinosatEarthCondConfidenceStats">
            <div className="dinosatEarthCondConfidenceStat">
              <span className="dinosatEarthCondConfidenceLabel">Total</span>
              <span className="dinosatEarthCondConfidenceValue">{dataSourceSummary.total}</span>
            </div>
            <div className="dinosatEarthCondConfidenceStat" style={{ color: "#22c55e" }}>
              <span className="dinosatEarthCondConfidenceLabel">Active</span>
              <span className="dinosatEarthCondConfidenceValue">{dataSourceSummary.operational}</span>
            </div>
            <div className="dinosatEarthCondConfidenceStat" style={{ color: "#7c3aed" }}>
              <span className="dinosatEarthCondConfidenceLabel">Failed</span>
              <span className="dinosatEarthCondConfidenceValue">{dataSourceSummary.failed}</span>
            </div>
            <div className="dinosatEarthCondConfidenceStat" style={{ color: "#7c3aed" }}>
              <span className="dinosatEarthCondConfidenceLabel">Failed Critical</span>
              <span className="dinosatEarthCondConfidenceValue">{dataSourceSummary.failedCritical}</span>
            </div>
          </div>
        </div>
        <div className="dinosatEarthCondConfidenceSection">
          <h4>Alerts</h4>
          <div className="dinosatEarthCondConfidenceStats">
            <div className="dinosatEarthCondConfidenceStat">
              <span className="dinosatEarthCondConfidenceLabel">Total</span>
              <span className="dinosatEarthCondConfidenceValue">{alertSummary.total}</span>
            </div>
            <div className="dinosatEarthCondConfidenceStat" style={{ color: "#7c3aed" }}>
              <span className="dinosatEarthCondConfidenceLabel">Critical</span>
              <span className="dinosatEarthCondConfidenceValue">{alertSummary.critical}</span>
            </div>
            <div className="dinosatEarthCondConfidenceStat" style={{ color: "#8b5cf6" }}>
              <span className="dinosatEarthCondConfidenceLabel">Warning</span>
              <span className="dinosatEarthCondConfidenceValue">{alertSummary.warning}</span>
            </div>
          </div>
        </div>
        <div className="dinosatEarthCondConfidenceSection">
          <h4>Violations</h4>
          <div className="dinosatEarthCondConfidenceStats">
            <div className="dinosatEarthCondConfidenceStat">
              <span className="dinosatEarthCondConfidenceLabel">Total</span>
              <span className="dinosatEarthCondConfidenceValue">{violationSummary.total}</span>
            </div>
            <div className="dinosatEarthCondConfidenceStat" style={{ color: "#7c3aed" }}>
              <span className="dinosatEarthCondConfidenceLabel">Critical</span>
              <span className="dinosatEarthCondConfidenceValue">{violationSummary.critical}</span>
            </div>
            <div className="dinosatEarthCondConfidenceStat" style={{ color: "#8b5cf6" }}>
              <span className="dinosatEarthCondConfidenceLabel">Warning</span>
              <span className="dinosatEarthCondConfidenceValue">{violationSummary.warning}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }, []);

  const exportData = useCallback((format) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const decision = getConsolidatedDecision();
    const allAlerts = getAllAlerts();
    const allViolations = getAllViolations();
    const exportContent = {
      metadata: {
        exportTime: new Date().toISOString(),
        location: selectedSite,
        vehicleType,
        launchTime,
        launchAzimuth,
        dragCoefficient: dragCoefficient || null,
        propellantType: propellantType,
        maxQLimit: maxQLimit || null,
        visibilityRequirement: visibilityRequirement || null,
        missionDuration: missionDuration || null,
        componentRadLimit: componentRadLimit || null,
        tvcCapability: tvcCapability || null
      },
      decision: decision,
      alerts: allAlerts,
      violations: allViolations,
      consolidatedData: consolidatedData,
      performanceMetrics,
      alertHistory
    };
    const content = format === "csv"
      ? [
        "Timestamp,Module,Type,Severity,Parameter,Value,Limit,Message",
        ...allViolations.map(v => `${v.timestamp || ""},${v.source || ""},VIOLATION,${v.severity || ""},${v.parameter || ""},${v.value || ""},${v.limit || ""},"${(v.message || "").replace(/"/g, '""')}"`),
        ...allAlerts.map(a => `${a.timestamp || ""},${a.source || ""},ALERT,${a.severity || ""},${a.category || ""},,,"${(a.message || "").replace(/"/g, '""')}"`)
      ].join("\n")
      : JSON.stringify(exportContent, null, 2);
    const blob = new Blob([content], { type: format === "csv" ? "text/csv" : "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mission-${timestamp}.${format === "csv" ? "csv" : "json"}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [consolidatedData, selectedSite, vehicleType, launchTime, launchAzimuth, performanceMetrics, alertHistory, getConsolidatedDecision, getAllAlerts, getAllViolations, dragCoefficient, propellantType, maxQLimit, visibilityRequirement, missionDuration, componentRadLimit, tvcCapability]);

  const getWindyMapUrl = useCallback((lat, lon, overlay, level = "surface") => `https://embed.windy.com/embed2.html?lat=${lat}&lon=${lon}&detailLat=${lat}&detailLon=${lon}&width=650&height=500&zoom=6&level=${level}&overlay=${overlay}&product=ecmwf&menu=&message=&marker=&calendar=&pressure=&type=map&location=coordinates&detail=&metricWind=kt&metricTemp=c&radarRange=-1&timestamp=${Date.now()}`, []);

  const renderVehicleConfigPanel = () => (
    <div className={`dinosatEarthCondVehicleConfig ${showVehicleConfig ? "dinosatEarthCondVehicleConfigOpen" : ""}`}>
      <button className="dinosatEarthCondVehicleConfigToggle" onClick={() => setShowVehicleConfig(!showVehicleConfig)}>
        <FontAwesomeIcon icon={faCog} />
        <span>Vehicle Config</span>
      </button>
      {showVehicleConfig && (
        <div className="dinosatEarthCondVehicleConfigBody">
          <div className="dinosatEarthCondVehicleConfigNote">Default values based on Falcon 9 Block 5</div>
          <div className="dinosatEarthCondVehicleConfigSection">
            <div className="dinosatEarthCondControlGroupMini">
              <label>Drag Coefficient (Cd)</label>
              <input
                type="number"
                step="0.01"
                min="0.1"
                max="2.0"
                placeholder="0.35"
                value={dragCoefficient}
                onChange={(e) => setDragCoefficient(e.target.value)}
                className="dinosatEarthCondInput"
              />
              <span className="dinosatEarthCondInputHint">Range: 0.2-0.5</span>
            </div>
            <div className="dinosatEarthCondControlGroupMini">
              <label>Reference Area (m²)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                placeholder="10.75"
                value={referenceArea}
                onChange={(e) => setReferenceArea(e.target.value)}
                className="dinosatEarthCondInput"
              />
              <span className="dinosatEarthCondInputHint">π × (d/2)²</span>
            </div>
          </div>
          <div className="dinosatEarthCondVehicleConfigSection">
            <div className="dinosatEarthCondControlGroupMini">
              <label>Mass (kg)</label>
              <input
                type="number"
                step="1000"
                min="0"
                placeholder="549054"
                value={vehicleMassOverride}
                onChange={(e) => setVehicleMassOverride(e.target.value)}
                className="dinosatEarthCondInput"
              />
              <span className="dinosatEarthCondInputHint">Liftoff mass</span>
            </div>
            <div className="dinosatEarthCondControlGroupMini">
              <label>Thrust (N)</label>
              <input
                type="number"
                step="10000"
                min="0"
                placeholder="7607000"
                value={vehicleThrustOverride}
                onChange={(e) => setVehicleThrustOverride(e.target.value)}
                className="dinosatEarthCondInput"
              />
              <span className="dinosatEarthCondInputHint">Sea-level thrust</span>
            </div>
            <div className="dinosatEarthCondControlGroupMini">
              <label>Diameter (m)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                placeholder="3.7"
                value={vehicleDiameterOverride}
                onChange={(e) => setVehicleDiameterOverride(e.target.value)}
                className="dinosatEarthCondInput"
              />
              <span className="dinosatEarthCondInputHint">Body diameter</span>
            </div>
            <div className="dinosatEarthCondControlGroupMini">
              <label>Specific Impulse (s)</label>
              <input
                type="number"
                step="1"
                min="0"
                placeholder="282"
                value={vehicleIspOverride}
                onChange={(e) => setVehicleIspOverride(e.target.value)}
                className="dinosatEarthCondInput"
              />
              <span className="dinosatEarthCondInputHint">ISP at sea level</span>
            </div>
          </div>
          <div className="dinosatEarthCondVehicleConfigSection">
            <div className="dinosatEarthCondControlGroupMini dinosatEarthCondControlGroupWide">
              <label>Propellant Type</label>
              <select
                value={propellantType}
                onChange={(e) => setPropellantType(e.target.value)}
                className="dinosatEarthCondSelect"
              >
                {Object.entries(PROPELLANT_TYPES).map(([key, info]) => (
                  <option key={key} value={key}>{info.name} - {info.toxicity}</option>
                ))}
              </select>
            </div>
            <div className="dinosatEarthCondControlGroupMini">
              <label>Propellant Mass (kg)</label>
              <input
                type="number"
                step="1000"
                min="0"
                placeholder="411000"
                value={propellantMass}
                onChange={(e) => setPropellantMass(e.target.value)}
                className="dinosatEarthCondInput"
              />
              <span className="dinosatEarthCondInputHint">Total load</span>
            </div>
          </div>
          <div className="dinosatEarthCondVehicleConfigSection">


            <div className="dinosatEarthCondControlGroupMini">
              <label>Max Q Limit (Pa)</label>
              <input
                type="number"
                step="1000"
                min="0"
                placeholder="40000"
                value={maxQLimit}
                onChange={(e) => setMaxQLimit(e.target.value)}
                className="dinosatEarthCondInput"
              />
              <span className="dinosatEarthCondInputHint">Vehicle structural limit</span>
            </div>
            <div className="dinosatEarthCondControlGroupMini">
              <label>Visibility Req. (m)</label>
              <input
                type="number"
                step="100"
                min="0"
                placeholder="5000"
                value={visibilityRequirement}
                onChange={(e) => setVisibilityRequirement(e.target.value)}
                className="dinosatEarthCondInput"
              />
              <span className="dinosatEarthCondInputHint">Range safety minimum</span>
            </div>
            <div className="dinosatEarthCondControlGroupMini">
              <label>Mission Duration (h)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                placeholder="2"
                value={missionDuration}
                onChange={(e) => setMissionDuration(e.target.value)}
                className="dinosatEarthCondInput"
              />
              <span className="dinosatEarthCondInputHint">For TID calculation</span>
            </div>
            <div className="dinosatEarthCondControlGroupMini">
              <label>Component Rad Limit (rad)</label>
              <input
                type="number"
                step="10"
                min="0"
                placeholder="100"
                value={componentRadLimit}
                onChange={(e) => setComponentRadLimit(e.target.value)}
                className="dinosatEarthCondInput"
              />
              <span className="dinosatEarthCondInputHint">Electronics tolerance</span>
            </div>
            <div className="dinosatEarthCondControlGroupMini">
              <label>TVC Capability (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                placeholder="0.05"
                value={tvcCapability}
                onChange={(e) => setTvcCapability(e.target.value)}
                className="dinosatEarthCondInput"
              />
              <span className="dinosatEarthCondInputHint">Thrust vector control</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderCommandAndIntegrityTab = () => {
    const moduleDataObj = getModuleData("commandIntegrity");
    const data = moduleDataObj || {};
    const decision = getConsolidatedDecision() || {};
    const allAlerts = getAllAlerts() || [];
    const allViolations = getAllViolations() || [];
    const unacknowledgedAlerts = allAlerts.filter(a => a && !acknowledgedAlerts.has(a.id));
    const filteredAlerts = alertsFilter === "all" ? allAlerts : alertsFilter === "unacknowledged" ? unacknowledgedAlerts : allAlerts.filter(a => a && a.severity === alertsFilter);
    const filteredViolations = violationsFilter === "all" ? allViolations : allViolations.filter(v => v && v.severity === violationsFilter);
    const criticalAlerts = allAlerts.filter(a => a && a.severity === "CRITICAL");
    const warningAlerts = allAlerts.filter(a => a && a.severity === "WARNING");
    const criticalViolations = allViolations.filter(v => v && v.severity === "CRITICAL");
    const warningViolations = allViolations.filter(v => v && v.severity === "WARNING");
    const statusColor = decision.status === "GO" ? "#22c55e" : decision.status === "CONDITIONAL_GO" ? "#8b5cf6" : decision.status === "NO_GO" ? "#7c3aed" : "#64748b";
    const statusIcon = decision.status === "GO" ? faCheckSquare : decision.status === "CONDITIONAL_GO" ? faExclamationTriangle : decision.status === "NO_GO" ? faXmarkSquare : faInfoCircle;
    const moduleStatuses = decision.moduleStatuses || consolidatedData?.module_statuses || [];

    const historicalWeather = data?.historicalWeather;
    const historicalSpaceWeather = data?.historicalSpaceWeather;
    const conjunctionAssessment = data?.conjunctionAssessment;

    const historicalWeatherTimeSeries = historicalWeather?.timeSeries || [];
    const historicalSpaceWeatherTimeSeries = historicalSpaceWeather?.timeSeries || [];

    const windHistoryChart = historicalWeatherTimeSeries.length > 0 ? createDynamicLineChart("Wind Speed (30d)", historicalWeatherTimeSeries.filter(d => d && d.windSpeed !== null && d.windSpeed !== undefined).slice(-168), "timestamp", "windSpeed", " m/s", "#22c55e", false) : null;
    const tempHistoryChart = historicalWeatherTimeSeries.length > 0 ? createDynamicLineChart("Temperature (30d)", historicalWeatherTimeSeries.filter(d => d && d.temperature !== null && d.temperature !== undefined).slice(-168), "timestamp", "temperature", " °C", "#f59e0b", false) : null;
    const pressureHistoryChart = historicalWeatherTimeSeries.length > 0 ? createDynamicLineChart("Pressure (30d)", historicalWeatherTimeSeries.filter(d => d && d.pressure !== null && d.pressure !== undefined).slice(-168), "timestamp", "pressure", " hPa", "#6366f1", false) : null;
    const visibilityHistoryChart = historicalWeatherTimeSeries.length > 0 ? createDynamicLineChart("Visibility (30d)", historicalWeatherTimeSeries.filter(d => d && d.visibility !== null && d.visibility !== undefined).slice(-168), "timestamp", "visibility", " m", "#8b5cf6", false) : null;
    const cloudCoverHistoryChart = historicalWeatherTimeSeries.length > 0 ? createDynamicLineChart("Cloud Cover (30d)", historicalWeatherTimeSeries.filter(d => d && d.cloudCover !== null && d.cloudCover !== undefined).slice(-168), "timestamp", "cloudCover", "%", "#64748b", false) : null;
    const gustHistoryChart = historicalWeatherTimeSeries.length > 0 ? createDynamicLineChart("Wind Gusts (30d)", historicalWeatherTimeSeries.filter(d => d && d.windGusts !== null && d.windGusts !== undefined).slice(-168), "timestamp", "windGusts", " m/s", "#7c3aed", false) : null;
    const humidityHistoryChart = historicalWeatherTimeSeries.length > 0 ? createDynamicLineChart("Humidity (30d)", historicalWeatherTimeSeries.filter(d => d && d.humidity !== null && d.humidity !== undefined).slice(-168), "timestamp", "humidity", "%", "#0ea5e9", false) : null;

    const kpHistoryChart = historicalSpaceWeatherTimeSeries.length > 0 ? createDynamicLineChart("Kp Index History", historicalSpaceWeatherTimeSeries.slice(-100), "timestamp", "value", "", "#7c3aed", false) : null;

    const protonFluxStats = historicalSpaceWeather?.statistics?.protonFlux;
    const electronFluxStats = historicalSpaceWeather?.statistics?.electronFlux;

    const catalogData = conjunctionAssessment?.catalogData;
    const corridorAnalysis = conjunctionAssessment?.corridorAnalysis;
    const launchWindow = conjunctionAssessment?.launchWindow;

    const currentDataPoints = data?.alertManager?.dataPoints || [];
    const getSurfaceValue = (key) => {
      const point = currentDataPoints.find(p => p && p.id === key);
      return point ? point.value : null;
    };

    const surfaceWindSpeed = getSurfaceValue("surface_wind_speed");
    const surfaceWindDir = getSurfaceValue("surface_wind_direction");
    const surfaceWindGusts = getSurfaceValue("surface_wind_gusts");
    const surfaceTemp = getSurfaceValue("surface_temperature");
    const surfaceHumidity = getSurfaceValue("surface_humidity");
    const surfacePressure = getSurfaceValue("surface_pressure");
    const surfaceVisibility = getSurfaceValue("surface_visibility");

    const currentKp = getSurfaceValue("kp_index");
    const protonFlux10 = getSurfaceValue("proton_flux_10mev");
    const protonFlux50 = getSurfaceValue("proton_flux_50mev");
    const protonFlux100 = getSurfaceValue("proton_flux_100mev");
    const electronFlux2 = getSurfaceValue("electron_flux_2mev");
    const xrayFlux = getSurfaceValue("xray_flux");
    const solarWindSpeed = getSurfaceValue("solar_wind_speed");
    const solarWindDensity = getSurfaceValue("solar_wind_density");
    const dstIndex = getSurfaceValue("dst_index");
    const f107Flux = getSurfaceValue("f107_flux");
    const waveHeight = getSurfaceValue("wave_height");

    const vehicleMass = getSurfaceValue("vehicle_mass");
    const vehicleThrust = getSurfaceValue("vehicle_thrust");
    const vehicleDiameter = getSurfaceValue("vehicle_diameter");
    const vehicleIsp = getSurfaceValue("vehicle_isp");

    const trackedObjects = getSurfaceValue("tracked_objects");
    const corridorObjects = getSurfaceValue("corridor_objects");
    const launchWindowMargin = getSurfaceValue("launch_window_margin");

    const windowTimeline = conjunctionAssessment?.windowTimeline || [];
    const windowTimelineChart = windowTimeline.length > 0 ? createDynamicLineChart("Launch Window Status", windowTimeline.slice(0, 48), "timestamp", "status", "", "#22c55e", true) : null;

    return (
      <div className="dinosatEarthCondCommandTab">

        <div className="dinosatEarthCondMainDecision" style={{ borderColor: statusColor }}>
          <div className="dinosatEarthCondDecisionDataType">
            {renderDataTypeBadge("COMPUTED")}
          </div>

          <div className="dinosatEarthCondDecisionContent">
            <div className="dinosatEarthCondDecisionIconStack">
              <h1 style={{ color: statusColor }}>{(decision.status || "UNKNOWN").replace(/_/g, " ")}</h1>
            </div>
            <p className="dinosatEarthCondDecisionReason">{decision.primaryReason || "No reason available"}</p>
            <div className="dinosatEarthCondDecisionMeta">
              <span>Confidence: <strong>{decision.confidence ?? 0}%</strong></span>
              <span>Risk: <strong>{((decision.riskScore || 0) * 100).toFixed(1)}%</strong></span>
              <span>Data Available: <strong>{decision.dataAvailability ?? 0}%</strong></span>
              <span>Category: <strong>{decision.category || "N/A"}</strong></span>
            </div>
            <div className="dinosatEarthCondConfidenceBar"><div className="dinosatEarthCondConfidenceFill" style={{ width: `${decision.confidence ?? 0}%`, backgroundColor: statusColor }} /></div>
          </div>
        </div>

        <div className="dinosatEarthCondSummaryBar">
          <div className="dinosatEarthCondSummaryCards">
            <div className="dinosatEarthCondSummaryCard dinosatEarthCondSummaryCardCritical"><FontAwesomeIcon icon={faExclamationTriangle} /><div className="dinosatEarthCondSummaryCardContent"><span className="dinosatEarthCondSummaryCount">{criticalAlerts.length + criticalViolations.length}</span><span className="dinosatEarthCondSummaryLabel">Critical</span></div></div>
            <div className="dinosatEarthCondSummaryCard dinosatEarthCondSummaryCardWarning"><FontAwesomeIcon icon={faExclamationTriangle} /><div className="dinosatEarthCondSummaryCardContent"><span className="dinosatEarthCondSummaryCount">{warningAlerts.length + warningViolations.length}</span><span className="dinosatEarthCondSummaryLabel">Warning</span></div></div>
            <div className="dinosatEarthCondSummaryCard dinosatEarthCondSummaryCardAdvisory"><FontAwesomeIcon icon={faInfoCircle} /><div className="dinosatEarthCondSummaryCardContent"><span className="dinosatEarthCondSummaryCount">{allAlerts.filter(a => a && a.severity === "ADVISORY").length}</span><span className="dinosatEarthCondSummaryLabel">Advisory</span></div></div>
            <div className="dinosatEarthCondSummaryCard dinosatEarthCondSummaryCardAck"><FontAwesomeIcon icon={faSquareCheck} /><div className="dinosatEarthCondSummaryCardContent"><span className="dinosatEarthCondSummaryCount">{acknowledgedAlerts.size}</span><span className="dinosatEarthCondSummaryLabel">Acknowledged</span></div></div>
          </div>
        </div>

        <div className="dinosatEarthCondOverviewGrid">
          <div className="dinosatEarthCondPanelTriple dinosatEarthCondSystemsPanel">
            <div className="dinosatEarthCondPanelHeaderWithBadge">
              <h3><FontAwesomeIcon icon={faNetworkWired} /> Module Status</h3>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            <div className="dinosatEarthCondSystemsGrid">
              {[
                { key: "commandIntegrity", name: "Command & Integrity", icon: faShield },
                { key: "groundOpsEnvironmental", name: "Ground Environment", icon: faHouseUser },
                { key: "aerodynamicsAscent", name: "Atmospheric Environment", icon: faRocket },
                { key: "electromagneticEnvironment", name: "Electromagnetic Environment", icon: faMagnet },
                { key: "temporalForensics", name: "Temporal Forensics", icon: faClock }
              ].map(module => {
                const moduleStatus = moduleStatuses.find(m => m && m.name === module.name);
                const status = moduleStatus?.status || "PENDING";
                const moduleDataItem = getModuleData(module.key) || {};
                const violations = moduleDataItem?.violations?.length || 0;
                const alerts = moduleDataItem?.alerts?.length || 0;
                const critAlerts = (moduleDataItem?.alerts || []).filter(a => a && a.severity === "CRITICAL").length;
                const modStatusColor = status === "AVAILABLE" ? "rgba(34, 197, 94, 0.6)" : status === "FAILED" ? "rgba(124, 58, 237, 0.6)" : status === "PENDING" ? "rgba(100, 116, 139, 0.6)" : "rgba(139, 92, 246, 0.6)";
                return (
                  <div key={module.key} className="dinosatEarthCondSystemItem">
                    <div className="dinosatEarthCondSystemIndicator" style={{ backgroundColor: modStatusColor }}><FontAwesomeIcon icon={module.icon} /></div>
                    <div className="dinosatEarthCondSystemInfo">
                      <span className="dinosatEarthCondSystemName">{module.name}</span>
                      <span className="dinosatEarthCondSystemStatus" style={{ color: modStatusColor }}>{status}</span>
                    </div>
                    <div className="dinosatEarthCondSystemCounts">
                      {critAlerts > 0 && <span className="dinosatEarthCondCriticalCount">{critAlerts}</span>}
                      {violations > 0 && <span className="dinosatEarthCondViolationCount">{violations}</span>}
                      {alerts > 0 && <span className="dinosatEarthCondAlertCount">{alerts}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="dinosatEarthCondPanelTriple dinosatEarthCondConfidencePanel">
            <div className="dinosatEarthCondPanelHeaderWithBadge">
              <h3><FontAwesomeIcon icon={faChartLine} /> Decision Breakdown</h3>
              {renderDataTypeBadge("COMPUTED", "small")}
            </div>
            {renderConfidenceBreakdown(decision)}
          </div>
          <div className="dinosatEarthCondPanelTriple dinosatEarthCondDataSourcesPanel">
            <div className="dinosatEarthCondPanelHeaderWithBadge">
              <h3><FontAwesomeIcon icon={faDatabase} /> Data Sources ({consolidatedData?.data_sources?.length || 0})</h3>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {consolidatedData?.data_sources && renderDataSourceStatus(consolidatedData.data_sources)}
          </div>
        </div>

        <div className="dinosatEarthCondSectionDivider">
          <div className="dinosatEarthCondSectionDividerLine" />
          <span className="dinosatEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faBell} />
            Active Alerts & Violations
          </span>
          <div className="dinosatEarthCondSectionDividerLine" />
        </div>

        <div className="dinosatEarthCondOverviewGrid">
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondAlertsPanel">
            <div className="dinosatEarthCondPanelHeader">
              <h3><FontAwesomeIcon icon={faBell} /> Alerts ({allAlerts.length})</h3>

              <select value={alertsFilter} onChange={(e) => setAlertsFilter(e.target.value)} className="dinosatEarthCondSelectLimited"><option value="all">All</option><option value="unacknowledged">Unack</option><option value="CRITICAL">Critical</option><option value="WARNING">Warning</option><option value="ADVISORY">Advisory</option></select>

              {renderDataTypeBadge("LIVE", "small")}
            </div>
            <div className="dinosatEarthCondAlertsList">{filteredAlerts.length > 0 ? filteredAlerts.map(a => a && renderAlertItem(a, true)) : <div className="dinosatEarthCondNoAlerts"><FontAwesomeIcon icon={faSquareCheck} /><p>No alerts</p></div>}</div>
          </div>
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondViolationsPanel">
            <div className="dinosatEarthCondPanelHeader">
              <h3><FontAwesomeIcon icon={faExclamationTriangle} /> Violations ({allViolations.length})</h3>

              <select value={violationsFilter} onChange={(e) => setViolationsFilter(e.target.value)} className="dinosatEarthCondSelectLimited"><option value="all">All</option><option value="CRITICAL">Critical</option><option value="WARNING">Warning</option></select>

              {renderDataTypeBadge("LIVE", "small")}
            </div>
            <div className="dinosatEarthCondViolationsList">{filteredViolations.length > 0 ? filteredViolations.map(v => v && renderViolationItem(v)) : <div className="dinosatEarthCondNoAlerts"><FontAwesomeIcon icon={faSquareCheck} /><p>No violations</p></div>}</div>
          </div>
        </div>

        <div className="dinosatEarthCondSectionDivider">
          <div className="dinosatEarthCondSectionDividerLine" />
          <span className="dinosatEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faRocket} />
            Vehicle Configuration & Risk Assessment
          </span>
          <div className="dinosatEarthCondSectionDividerLine" />
        </div>

        <div className="dinosatEarthCondOverviewGrid">
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerLive">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Vehicle Parameters</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderDataTable("Specifications", ["Parameter", "Value", "Unit", "Source"], [
              ["Mass", vehicleMass !== null && vehicleMass !== undefined ? (vehicleMass / 1000).toFixed(1) : "—", "tonnes", vehicleMass !== null && vehicleMass !== undefined ? "OK" : "NO DATA"],
              ["Thrust", vehicleThrust !== null && vehicleThrust !== undefined ? (vehicleThrust / 1000).toFixed(0) : "—", "kN", vehicleThrust !== null && vehicleThrust !== undefined ? "OK" : "NO DATA"],
              ["Diameter", vehicleDiameter !== null && vehicleDiameter !== undefined ? vehicleDiameter.toFixed(1) : "—", "m", vehicleDiameter !== null && vehicleDiameter !== undefined ? "OK" : "NO DATA"],
              ["Specific Impulse", vehicleIsp !== null && vehicleIsp !== undefined ? vehicleIsp.toFixed(0) : "—", "s", vehicleIsp !== null && vehicleIsp !== undefined ? "OK" : "NO DATA"],
              ["T/W Ratio", vehicleMass !== null && vehicleMass !== undefined && vehicleThrust !== null && vehicleThrust !== undefined ? (vehicleThrust / (vehicleMass * 9.81)).toFixed(2) : "—", "", vehicleMass !== null && vehicleMass !== undefined && vehicleThrust !== null && vehicleThrust !== undefined ? "COMPUTED" : "NO DATA"]
            ])}
          </div>
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerComputed">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Risk Assessment</h4>
              {renderDataTypeBadge("COMPUTED", "small")}
            </div>
            <div className="dinosatEarthCondRiskGauge">
              <div className="dinosatEarthCondGaugeValue">{((data?.riskQuant ?? 0) * 100).toFixed(1)}%</div>
              <div className="dinosatEarthCondGaugeLabel">Risk Score</div>
              <div className="dinosatEarthCondGaugeBar">
                <div className="dinosatEarthCondGaugeFill" style={{ width: `${(data?.riskQuant ?? 0) * 100}%`, backgroundColor: (data?.riskQuant ?? 0) > 0.5 ? "#7c3aed" : (data?.riskQuant ?? 0) > 0.3 ? "#8b5cf6" : "#22c55e" }} />
              </div>
              <div className="dinosatEarthCondDataTrust">Data Trust: {((data?.dataTrust ?? 0) * 100).toFixed(1)}%</div>
            </div>
          </div>
        </div>

        <div className="dinosatEarthCondSectionDivider">
          <div className="dinosatEarthCondSectionDividerLine" />
          <span className="dinosatEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faSatellite} />
            Launch Window & Conjunction Assessment
          </span>
          <div className="dinosatEarthCondSectionDividerLine" />
        </div>

        <div className="dinosatEarthCondOverviewGrid">
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerLive">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Launch Window Status</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            <div className="dinosatEarthCondLaunchWindowStatus">
              {renderDataTable("Window Parameters", ["Parameter", "Value", "Unit"], [
                ["Window Duration", launchWindow?.windowDuration !== undefined && launchWindow?.windowDuration !== null ? launchWindow.windowDuration : "—", "min"],
                ["Window Margin", launchWindowMargin !== null && launchWindowMargin !== undefined ? launchWindowMargin : "—", "min"],
                ["Recommended Launch", launchWindow?.recommendedLaunchTime ? new Date(launchWindow.recommendedLaunchTime).toLocaleTimeString() : "—", ""],
                ["Target Inclination", conjunctionAssessment?.targetInclination !== undefined && conjunctionAssessment?.targetInclination !== null ? conjunctionAssessment.targetInclination.toFixed(2) : "—", "deg"]
              ])}
            </div>
          </div>
          {launchWindow?.conjunctionEvents?.length > 0 && (
            <div className="dinosatEarthCondPanelDouble dinosatEarthCondFullWidth dinosatEarthCondChartContainerForecast">
              <div className="dinosatEarthCondChartHeaderWithBadge">
                <h4>Conjunction Events ({launchWindow.conjunctionEvents.length})</h4>
                {renderDataTypeBadge("FORECAST", "small")}
              </div>
              {renderDataTable("Predicted Conjunctions", ["Time", "Object", "Type", "Est. Miss (km)", "Severity"],
                launchWindow.conjunctionEvents.slice(0, 15).map(evt => [
                  evt && evt.time ? new Date(evt.time).toLocaleTimeString() : "—",
                  evt?.object || "—",
                  evt?.type?.replace(/_/g, " ") || "—",
                  evt?.estimatedMissDistance !== null && evt?.estimatedMissDistance !== undefined ? evt.estimatedMissDistance.toFixed(0) : "—",
                  evt?.severity || "—"
                ])
              )}
            </div>
          )}
        </div>
        {windowTimelineChart && (
          <div className="dinosatEarthCondOverviewGrid">
            <div className="dinosatEarthCondPanelDouble dinosatEarthCondFullWidth dinosatEarthCondChartContainerForecast">
              <div className="dinosatEarthCondChartHeaderWithBadge">
                <h4>Launch Window Timeline (24h)</h4>
                {renderDataTypeBadge("FORECAST", "small")}
              </div>
              <div className="dinosatEarthCondForecastNotice">
                <FontAwesomeIcon icon={faInfoCircle} />
                <span>1 = Open window, 0 = Constrained window</span>
              </div>
              {renderDynamicChart(windowTimelineChart, "dinosatEarthCondChart")}
              <div className="dinosatEarthCondChartDescription">
                <div className="dinosatEarthCondChartAxesInfo">
                  <span><strong>X-Axis:</strong> Time (24-hour forecast period)</span>
                  <span><strong>Y-Axis:</strong> Window Status (binary: 0 or 1)</span>
                </div>
                <p className="dinosatEarthCondChartDescriptionText">
                  This chart displays the predicted launch window availability over the next 24 hours based on conjunction analysis and space traffic data. A value of 1 indicates an open window with no conjunction constraints, allowing for safe launch operations. A value of 0 indicates a constrained period where space traffic conflicts or conjunction risks require the window to be closed. Launch controllers use this timeline to identify optimal launch opportunities and plan hold procedures around constrained periods.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="dinosatEarthCondSectionDivider">
          <div className="dinosatEarthCondSectionDividerLine" />
          <span className="dinosatEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faSatellite} />
            Space Traffic & Catalog Data
          </span>
          <div className="dinosatEarthCondSectionDividerLine" />
        </div>

        <div className="dinosatEarthCondOverviewGrid">
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerLive">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Space Catalog Summary</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderDataTable("Tracked Objects", ["Parameter", "Value", "Status"], [
              ["Total Tracked Objects", trackedObjects !== null && trackedObjects !== undefined ? trackedObjects : "—", trackedObjects !== null && trackedObjects !== undefined ? "OK" : "NO DATA"],
              ["Active Satellites", catalogData?.activeSatellites?.totalCount || "—", "OK"],
              ["Space Stations/Crewed", catalogData?.spaceStations?.totalCount || "—", "OK"],
              ["Objects in Corridor", corridorObjects !== null && corridorObjects !== undefined ? corridorObjects : "—", corridorObjects !== null && corridorObjects !== undefined ? (corridorObjects <= 10 ? "NOMINAL" : corridorObjects <= 35 ? "WARNING" : "CRITICAL") : "NO DATA"],
              ["Satellites in Corridor", corridorAnalysis?.activeSatellitesInCorridor || "—", "OK"],
              ["Stations in Corridor", corridorAnalysis?.stationsInCorridor || "—", corridorAnalysis?.stationsInCorridor > 0 ? "WARNING" : "NOMINAL"]
            ])}
          </div>
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerLive">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Corridor Analysis</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderDataTable("Launch Corridor", ["Parameter", "Value", "Unit"], [
              ["Launch Azimuth", corridorAnalysis?.launchAzimuth || "—", "deg"],
              ["Corridor Width", corridorAnalysis?.corridorWidth || "—", "deg"],
              ["Debris in Corridor", corridorAnalysis?.debrisInCorridor ?? 0, ""],
              ["Total Objects", corridorAnalysis?.objectsInCorridor?.length || 0, ""]
            ])}
          </div>
        </div>
        {(catalogData?.activeSatellites?.altitudeDistribution || (catalogData?.spaceStations?.stations && catalogData.spaceStations.stations.length > 0)) && (
          <div className="dinosatEarthCondOverviewGrid">
            {catalogData?.activeSatellites?.altitudeDistribution && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerLive">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Altitude Regime Distribution</h4>
                  {renderDataTypeBadge("LIVE", "small")}
                </div>
                {renderDataTable("Objects by Altitude", ["Regime", "Count", "Description"], [
                  ["LEO (< 2000 km)", catalogData.activeSatellites.altitudeDistribution.leo ?? 0, "Low Earth Orbit"],
                  ["MEO (2000-35000 km)", catalogData.activeSatellites.altitudeDistribution.meo ?? 0, "Medium Earth Orbit"],
                  ["GEO (~36000 km)", catalogData.activeSatellites.altitudeDistribution.geo ?? 0, "Geostationary"],
                  ["HEO (> 36000 km)", catalogData.activeSatellites.altitudeDistribution.heo ?? 0, "High Earth Orbit"]
                ])}
              </div>
            )}
            {catalogData?.spaceStations?.stations?.length > 0 && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondFullWidth dinosatEarthCondChartContainerLive">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Tracked Space Stations & Crewed Vehicles ({catalogData.spaceStations.stations.length})</h4>
                  {renderDataTypeBadge("LIVE", "small")}
                </div>
                {renderDataTable("Crewed Assets", ["Name", "NORAD ID", "Inclination (deg)", "Altitude (km)"],
                  catalogData.spaceStations.stations.slice(0, 15).map(s => [
                    s?.name || "—",
                    s?.noradId || "—",
                    s?.inclination !== null && s?.inclination !== undefined ? s.inclination.toFixed(2) : "—",
                    s?.altitude !== null && s?.altitude !== undefined ? s.altitude.toFixed(0) : "—"
                  ])
                )}
              </div>
            )}
          </div>
        )}
        {((corridorAnalysis?.objectsInCorridor && corridorAnalysis.objectsInCorridor.length > 0) || (corridorAnalysis?.altitudeShells && Object.keys(corridorAnalysis.altitudeShells).length > 0 && Object.entries(corridorAnalysis.altitudeShells).some(([alt, data]) => data && (data.satellites || 0) + (data.debris || 0) + (data.stations || 0) > 0))) && (
          <div className="dinosatEarthCondOverviewGrid">
            {corridorAnalysis?.objectsInCorridor?.length > 0 && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondFullWidth dinosatEarthCondChartContainerLive">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Objects in Launch Corridor ({corridorAnalysis.objectsInCorridor.length})</h4>
                  {renderDataTypeBadge("LIVE", "small")}
                </div>
                {renderDataTable("Corridor Objects", ["Name", "Type", "NORAD ID", "Inc (deg)", "Alt (km)", "Inc Δ (deg)"],
                  corridorAnalysis.objectsInCorridor.slice(0, 20).map(obj => [
                    obj?.name || "—",
                    obj?.type || "—",
                    obj?.noradId || "—",
                    obj?.inclination !== null && obj?.inclination !== undefined ? obj.inclination.toFixed(2) : "—",
                    obj?.altitude !== null && obj?.altitude !== undefined ? obj.altitude.toFixed(0) : "—",
                    obj?.inclinationDelta !== null && obj?.inclinationDelta !== undefined ? obj.inclinationDelta.toFixed(2) : "—"
                  ])
                )}
              </div>
            )}
            {corridorAnalysis?.altitudeShells && Object.keys(corridorAnalysis.altitudeShells).length > 0 && Object.entries(corridorAnalysis.altitudeShells).some(([alt, data]) => data && (data.satellites || 0) + (data.debris || 0) + (data.stations || 0) > 0) && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondFullWidth dinosatEarthCondChartContainerLive">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Corridor Density by Altitude Shell</h4>
                  {renderDataTypeBadge("LIVE", "small")}
                </div>
                {renderDataTable("Altitude Shells", ["Altitude (km)", "Satellites", "Debris", "Stations", "Total", "Density"],
                  Object.entries(corridorAnalysis.altitudeShells)
                    .filter(([alt, data]) => data && (data.satellites || 0) + (data.debris || 0) + (data.stations || 0) > 0)
                    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                    .map(([alt, data]) => [
                      alt,
                      data?.satellites ?? 0,
                      data?.debris ?? 0,
                      data?.stations ?? 0,
                      (data?.satellites ?? 0) + (data?.debris ?? 0) + (data?.stations ?? 0),
                      data?.density !== null && data?.density !== undefined ? data.density.toExponential(2) : "—"
                    ])
                )}
              </div>
            )}
          </div>
        )}

        <div className="dinosatEarthCondSectionDivider">
          <div className="dinosatEarthCondSectionDividerLine" />
          <span className="dinosatEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faBroadcastTower} />
            Current Atmospheric & Marine Conditions
          </span>
          <div className="dinosatEarthCondSectionDividerLine" />
        </div>

        <div className="dinosatEarthCondOverviewGrid">
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerLive">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Surface Conditions</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderDataTable("Current Observations", ["Parameter", "Value", "Unit", "Status"], [
              ["Wind Speed", surfaceWindSpeed !== null && surfaceWindSpeed !== undefined ? surfaceWindSpeed.toFixed(1) : "—", "m/s", surfaceWindSpeed !== null && surfaceWindSpeed !== undefined ? (surfaceWindSpeed <= 10.3 ? "NOMINAL" : surfaceWindSpeed <= 15.4 ? "WARNING" : "CRITICAL") : "NO DATA"],
              ["Wind Direction", surfaceWindDir !== null && surfaceWindDir !== undefined ? Math.round(surfaceWindDir) : "—", "deg", surfaceWindDir !== null && surfaceWindDir !== undefined ? "OK" : "NO DATA"],
              ["Wind Gusts", surfaceWindGusts !== null && surfaceWindGusts !== undefined ? surfaceWindGusts.toFixed(1) : "—", "m/s", surfaceWindGusts !== null && surfaceWindGusts !== undefined ? (surfaceWindGusts <= 13 ? "NOMINAL" : surfaceWindGusts <= 20 ? "WARNING" : "CRITICAL") : "NO DATA"],
              ["Temperature", surfaceTemp !== null && surfaceTemp !== undefined ? surfaceTemp.toFixed(1) : "—", "°C", surfaceTemp !== null && surfaceTemp !== undefined ? (surfaceTemp >= 5 && surfaceTemp <= 35 ? "NOMINAL" : surfaceTemp >= 0 && surfaceTemp <= 38 ? "MARGINAL" : "WARNING") : "NO DATA"],
              ["Humidity", surfaceHumidity !== null && surfaceHumidity !== undefined ? surfaceHumidity.toFixed(0) : "—", "%", surfaceHumidity !== null && surfaceHumidity !== undefined ? (surfaceHumidity >= 20 && surfaceHumidity <= 80 ? "NOMINAL" : "MARGINAL") : "NO DATA"],
              ["Pressure", surfacePressure !== null && surfacePressure !== undefined ? surfacePressure.toFixed(0) : "—", "hPa", surfacePressure !== null && surfacePressure !== undefined ? (surfacePressure >= 995 && surfacePressure <= 1035 ? "NOMINAL" : "MARGINAL") : "NO DATA"],
              ["Visibility", surfaceVisibility !== null && surfaceVisibility !== undefined ? (surfaceVisibility / 1000).toFixed(1) : "—", "km", surfaceVisibility !== null && surfaceVisibility !== undefined ? (surfaceVisibility >= 7400 ? "NOMINAL" : surfaceVisibility >= 3704 ? "WARNING" : "CRITICAL") : "NO DATA"]
            ])}
          </div>
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerLive">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Marine Conditions</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderDataTable("Sea State", ["Parameter", "Value", "Unit", "Status"], [
              ["Wave Height", waveHeight !== null && waveHeight !== undefined ? waveHeight.toFixed(1) : "—", "m", waveHeight !== null && waveHeight !== undefined ? (waveHeight <= 2.5 ? "NOMINAL" : waveHeight <= 4.5 ? "WARNING" : "CRITICAL") : "NO DATA"]
            ])}
          </div>
        </div>

        <div className="dinosatEarthCondSectionDivider">
          <div className="dinosatEarthCondSectionDividerLine" />
          <span className="dinosatEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faBroadcastTower} />
            Current Space Weather
          </span>
          <div className="dinosatEarthCondSectionDividerLine" />
        </div>

        <div className="dinosatEarthCondOverviewGrid">
          <div className="dinosatEarthCondPanelTriple dinosatEarthCondChartContainerLive">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Geomagnetic Activity</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderDataTable("Indices", ["Parameter", "Value", "Unit", "Status"], [
              ["Kp Index", currentKp !== null && currentKp !== undefined ? currentKp.toFixed(1) : "—", "", currentKp !== null && currentKp !== undefined ? (currentKp <= 3 ? "NOMINAL" : currentKp <= 5 ? "WARNING" : "CRITICAL") : "NO DATA"],
              ["Dst Index", dstIndex !== null && dstIndex !== undefined ? dstIndex.toFixed(0) : "—", "nT", dstIndex !== null && dstIndex !== undefined ? (dstIndex >= -40 && dstIndex <= 30 ? "NOMINAL" : dstIndex >= -100 ? "WARNING" : "CRITICAL") : "NO DATA"],
              ["F10.7 Flux", f107Flux !== null && f107Flux !== undefined ? f107Flux.toFixed(0) : "—", "sfu", f107Flux !== null && f107Flux !== undefined ? (f107Flux >= 60 && f107Flux <= 150 ? "NOMINAL" : "MARGINAL") : "NO DATA"]
            ])}
          </div>
          <div className="dinosatEarthCondPanelTriple dinosatEarthCondChartContainerLive">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Solar Particle Flux</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderDataTable("Radiation Environment", ["Parameter", "Value", "Unit", "Status"], [
              ["Proton ≥10 MeV", protonFlux10 !== null && protonFlux10 !== undefined ? protonFlux10.toFixed(2) : "—", "pfu", protonFlux10 !== null && protonFlux10 !== undefined ? (protonFlux10 <= 1 ? "NOMINAL" : protonFlux10 <= 10 ? "WARNING" : "CRITICAL") : "NO DATA"],
              ["Proton ≥50 MeV", protonFlux50 !== null && protonFlux50 !== undefined ? protonFlux50.toFixed(2) : "—", "pfu", protonFlux50 !== null && protonFlux50 !== undefined ? (protonFlux50 <= 0.5 ? "NOMINAL" : protonFlux50 <= 5 ? "WARNING" : "CRITICAL") : "NO DATA"],
              ["Proton ≥100 MeV", protonFlux100 !== null && protonFlux100 !== undefined ? protonFlux100.toFixed(2) : "—", "pfu", protonFlux100 !== null && protonFlux100 !== undefined ? (protonFlux100 <= 0.2 ? "NOMINAL" : protonFlux100 <= 2 ? "WARNING" : "CRITICAL") : "NO DATA"],
              ["Electron ≥2 MeV", electronFlux2 !== null && electronFlux2 !== undefined ? electronFlux2.toFixed(0) : "—", "pfu", electronFlux2 !== null && electronFlux2 !== undefined ? (electronFlux2 <= 1000 ? "NOMINAL" : electronFlux2 <= 10000 ? "WARNING" : "CRITICAL") : "NO DATA"],
              ["X-ray Flux", xrayFlux !== null && xrayFlux !== undefined ? xrayFlux.toExponential(2) : "—", "W/m²", xrayFlux !== null && xrayFlux !== undefined ? (xrayFlux <= 1e-6 ? "NOMINAL" : xrayFlux <= 1e-4 ? "WARNING" : "CRITICAL") : "NO DATA"]
            ])}
          </div>
          <div className="dinosatEarthCondPanelTriple dinosatEarthCondChartContainerLive">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Solar Wind</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderDataTable("Interplanetary Medium", ["Parameter", "Value", "Unit", "Status"], [
              ["Solar Wind Speed", solarWindSpeed !== null && solarWindSpeed !== undefined ? solarWindSpeed.toFixed(0) : "—", "km/s", solarWindSpeed !== null && solarWindSpeed !== undefined ? (solarWindSpeed >= 250 && solarWindSpeed <= 550 ? "NOMINAL" : solarWindSpeed <= 750 ? "WARNING" : "CRITICAL") : "NO DATA"],
              ["Solar Wind Density", solarWindDensity !== null && solarWindDensity !== undefined ? solarWindDensity.toFixed(1) : "—", "p/cm³", solarWindDensity !== null && solarWindDensity !== undefined ? (solarWindDensity >= 0.5 && solarWindDensity <= 12 ? "NOMINAL" : solarWindDensity <= 25 ? "WARNING" : "CRITICAL") : "NO DATA"]
            ])}
          </div>
        </div>

        <div className="dinosatEarthCondSectionDivider">
          <div className="dinosatEarthCondSectionDividerLine" />
          <span className="dinosatEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faHistory} />
            Historical Atmospheric Data (30-Day)
          </span>
          <div className="dinosatEarthCondSectionDividerLine" />
        </div>

        {historicalWeather?.statistics && (
          <div className="dinosatEarthCondOverviewGrid">
            <div className="dinosatEarthCondPanelSingle dinosatEarthCondChartContainerHistorical">
              <div className="dinosatEarthCondChartHeaderWithBadge">
                <h4>Weather Statistics Summary</h4>
                {renderDataTypeBadge("HISTORICAL", "small")}
              </div>
              {renderDataTable("30-Day Statistics", ["Parameter", "Min", "Max", "Mean", "Std Dev", "Unit"], [
                ["Wind Speed", historicalWeather.statistics?.windSpeed?.min !== null && historicalWeather.statistics?.windSpeed?.min !== undefined ? historicalWeather.statistics.windSpeed.min.toFixed(1) : "—", historicalWeather.statistics?.windSpeed?.max !== null && historicalWeather.statistics?.windSpeed?.max !== undefined ? historicalWeather.statistics.windSpeed.max.toFixed(1) : "—", historicalWeather.statistics?.windSpeed?.mean !== null && historicalWeather.statistics?.windSpeed?.mean !== undefined ? historicalWeather.statistics.windSpeed.mean.toFixed(1) : "—", historicalWeather.statistics?.windSpeed?.stdDev !== null && historicalWeather.statistics?.windSpeed?.stdDev !== undefined ? historicalWeather.statistics.windSpeed.stdDev.toFixed(2) : "—", "m/s"],
                ["Temperature", historicalWeather.statistics?.temperature?.min !== null && historicalWeather.statistics?.temperature?.min !== undefined ? historicalWeather.statistics.temperature.min.toFixed(1) : "—", historicalWeather.statistics?.temperature?.max !== null && historicalWeather.statistics?.temperature?.max !== undefined ? historicalWeather.statistics.temperature.max.toFixed(1) : "—", historicalWeather.statistics?.temperature?.mean !== null && historicalWeather.statistics?.temperature?.mean !== undefined ? historicalWeather.statistics.temperature.mean.toFixed(1) : "—", historicalWeather.statistics?.temperature?.stdDev !== null && historicalWeather.statistics?.temperature?.stdDev !== undefined ? historicalWeather.statistics.temperature.stdDev.toFixed(2) : "—", "°C"],
                ["Pressure", historicalWeather.statistics?.pressure?.min !== null && historicalWeather.statistics?.pressure?.min !== undefined ? historicalWeather.statistics.pressure.min.toFixed(0) : "—", historicalWeather.statistics?.pressure?.max !== null && historicalWeather.statistics?.pressure?.max !== undefined ? historicalWeather.statistics.pressure.max.toFixed(0) : "—", historicalWeather.statistics?.pressure?.mean !== null && historicalWeather.statistics?.pressure?.mean !== undefined ? historicalWeather.statistics.pressure.mean.toFixed(0) : "—", historicalWeather.statistics?.pressure?.stdDev !== null && historicalWeather.statistics?.pressure?.stdDev !== undefined ? historicalWeather.statistics.pressure.stdDev.toFixed(1) : "—", "hPa"],
                ["Humidity", historicalWeather.statistics?.humidity?.min !== null && historicalWeather.statistics?.humidity?.min !== undefined ? historicalWeather.statistics.humidity.min.toFixed(0) : "—", historicalWeather.statistics?.humidity?.max !== null && historicalWeather.statistics?.humidity?.max !== undefined ? historicalWeather.statistics.humidity.max.toFixed(0) : "—", historicalWeather.statistics?.humidity?.mean !== null && historicalWeather.statistics?.humidity?.mean !== undefined ? historicalWeather.statistics.humidity.mean.toFixed(0) : "—", historicalWeather.statistics?.humidity?.stdDev !== null && historicalWeather.statistics?.humidity?.stdDev !== undefined ? historicalWeather.statistics.humidity.stdDev.toFixed(1) : "—", "%"],
                ["Cloud Cover", historicalWeather.statistics?.cloudCover?.min !== null && historicalWeather.statistics?.cloudCover?.min !== undefined ? historicalWeather.statistics.cloudCover.min.toFixed(0) : "—", historicalWeather.statistics?.cloudCover?.max !== null && historicalWeather.statistics?.cloudCover?.max !== undefined ? historicalWeather.statistics.cloudCover.max.toFixed(0) : "—", historicalWeather.statistics?.cloudCover?.mean !== null && historicalWeather.statistics?.cloudCover?.mean !== undefined ? historicalWeather.statistics.cloudCover.mean.toFixed(0) : "—", historicalWeather.statistics?.cloudCover?.stdDev !== null && historicalWeather.statistics?.cloudCover?.stdDev !== undefined ? historicalWeather.statistics.cloudCover.stdDev.toFixed(1) : "—", "%"]
              ])}
            </div>
          </div>
        )}
        {(windHistoryChart || gustHistoryChart) && (
          <div className="dinosatEarthCondOverviewGrid">
            {windHistoryChart && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerHistorical">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Wind Speed History</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(windHistoryChart, "dinosatEarthCondChart")}
                <div className="dinosatEarthCondChartDescription">
                  <div className="dinosatEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (30-day observation period)</span>
                    <span><strong>Y-Axis:</strong> Wind Speed (m/s)</span>
                  </div>
                  <p className="dinosatEarthCondChartDescriptionText">
                    This chart displays surface wind speed measurements recorded over the past 30 days at the launch site. Wind speed is a critical launch constraint as excessive winds can affect vehicle stability during liftoff and early ascent phases. The data helps identify diurnal patterns, seasonal trends, and anomalous weather events that may impact launch scheduling decisions.
                  </p>
                </div>
              </div>
            )}
            {gustHistoryChart && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerHistorical">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Wind Gusts History</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(gustHistoryChart, "dinosatEarthCondChart")}
                <div className="dinosatEarthCondChartDescription">
                  <div className="dinosatEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (30-day observation period)</span>
                    <span><strong>Y-Axis:</strong> Wind Gusts (m/s)</span>
                  </div>
                  <p className="dinosatEarthCondChartDescriptionText">
                    This chart shows peak wind gust measurements over the past 30 days. Gusts represent sudden, brief increases in wind speed that can impose dynamic loads on the launch vehicle structure during ground operations and early flight. Gust factors are essential for structural load calculations and determining pad access safety during fueling operations.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
        {(tempHistoryChart || pressureHistoryChart) && (
          <div className="dinosatEarthCondOverviewGrid">
            {tempHistoryChart && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerHistorical">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Temperature History</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(tempHistoryChart, "dinosatEarthCondChart")}
                <div className="dinosatEarthCondChartDescription">
                  <div className="dinosatEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (30-day observation period)</span>
                    <span><strong>Y-Axis:</strong> Temperature (°C)</span>
                  </div>
                  <p className="dinosatEarthCondChartDescriptionText">
                    This chart tracks ambient air temperature variations over the past 30 days. Temperature affects propellant density, material properties, and thermal protection system performance during pre-launch and ascent. Extreme temperatures may require propellant loading adjustments and can impact battery performance, hydraulic systems, and avionics thermal management.
                  </p>
                </div>
              </div>
            )}
            {pressureHistoryChart && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerHistorical">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Pressure History</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(pressureHistoryChart, "dinosatEarthCondChart")}
                <div className="dinosatEarthCondChartDescription">
                  <div className="dinosatEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (30-day observation period)</span>
                    <span><strong>Y-Axis:</strong> Barometric Pressure (hPa)</span>
                  </div>
                  <p className="dinosatEarthCondChartDescriptionText">
                    This chart displays barometric pressure readings over the past 30 days. Atmospheric pressure influences air density calculations critical for aerodynamic modeling and engine performance predictions. Pressure trends also indicate approaching weather systems that may affect launch operations, with rapidly falling pressure often signaling deteriorating conditions.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
        {(cloudCoverHistoryChart || humidityHistoryChart) && (
          <div className="dinosatEarthCondOverviewGrid">
            {cloudCoverHistoryChart && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerHistorical">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Cloud Cover History</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(cloudCoverHistoryChart, "dinosatEarthCondChart")}
                <div className="dinosatEarthCondChartDescription">
                  <div className="dinosatEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (30-day observation period)</span>
                    <span><strong>Y-Axis:</strong> Cloud Cover (%)</span>
                  </div>
                  <p className="dinosatEarthCondChartDescriptionText">
                    This chart shows cloud coverage percentage over the past 30 days. Cloud cover affects optical tracking capabilities, lightning risk assessment, and compliance with visual flight rules for range safety. High cloud cover may trigger cumulus cloud and lightning avoidance rules, potentially causing launch delays or scrubs.
                  </p>
                </div>
              </div>
            )}
            {humidityHistoryChart && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerHistorical">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Humidity History</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(humidityHistoryChart, "dinosatEarthCondChart")}
                <div className="dinosatEarthCondChartDescription">
                  <div className="dinosatEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (30-day observation period)</span>
                    <span><strong>Y-Axis:</strong> Relative Humidity (%)</span>
                  </div>
                  <p className="dinosatEarthCondChartDescriptionText">
                    This chart displays relative humidity measurements over the past 30 days. Humidity levels impact triboelectric charging potential, fog formation probability, and certain material performance characteristics. High humidity combined with temperature variations can lead to condensation on vehicle surfaces and may affect sensitive electronic components.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="dinosatEarthCondSectionDivider">
          <div className="dinosatEarthCondSectionDividerLine" />
          <span className="dinosatEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faHistory} />
            Historical Space Weather
          </span>
          <div className="dinosatEarthCondSectionDividerLine" />
        </div>

        {(historicalSpaceWeather?.statistics?.kpIndex || kpHistoryChart) && (
          <div className="dinosatEarthCondOverviewGrid">
            {historicalSpaceWeather?.statistics?.kpIndex && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerHistorical">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Kp Index Statistics</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDataTable("Geomagnetic History", ["Parameter", "Min", "Max", "Mean", "Current", "Points"], [
                  ["Kp Index", historicalSpaceWeather.statistics.kpIndex.min !== null && historicalSpaceWeather.statistics.kpIndex.min !== undefined ? historicalSpaceWeather.statistics.kpIndex.min.toFixed(1) : "—", historicalSpaceWeather.statistics.kpIndex.max !== null && historicalSpaceWeather.statistics.kpIndex.max !== undefined ? historicalSpaceWeather.statistics.kpIndex.max.toFixed(1) : "—", historicalSpaceWeather.statistics.kpIndex.mean !== null && historicalSpaceWeather.statistics.kpIndex.mean !== undefined ? historicalSpaceWeather.statistics.kpIndex.mean.toFixed(1) : "—", historicalSpaceWeather.statistics.kpIndex.current !== null && historicalSpaceWeather.statistics.kpIndex.current !== undefined ? historicalSpaceWeather.statistics.kpIndex.current.toFixed(1) : "—", historicalSpaceWeather.statistics.kpIndex.dataPoints || "—"]
                ])}
              </div>
            )}
            {kpHistoryChart && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerHistorical">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Kp Index Time Series</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(kpHistoryChart, "dinosatEarthCondChart")}
                <div className="dinosatEarthCondChartDescription">
                  <div className="dinosatEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (recent observation period)</span>
                    <span><strong>Y-Axis:</strong> Kp Index (0-9 scale)</span>
                  </div>
                  <p className="dinosatEarthCondChartDescriptionText">
                    This chart shows the planetary K-index (Kp) measurements over recent observation periods. The Kp index quantifies geomagnetic storm intensity on a 0-9 scale, with higher values indicating increased radiation hazards and potential communication disruptions. Values above 5 indicate geomagnetic storm conditions that may affect spacecraft electronics, GPS accuracy, and high-frequency radio communications critical for launch operations.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
        {(protonFluxStats || electronFluxStats) && (
          <div className="dinosatEarthCondOverviewGrid">
            {protonFluxStats && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerHistorical">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Proton Flux Statistics</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDataTable("Proton History", ["Energy", "Min", "Max", "Mean", "Current", "Unit"], [
                  ["≥10 MeV", protonFluxStats.p10MeV?.min !== null && protonFluxStats.p10MeV?.min !== undefined ? protonFluxStats.p10MeV.min.toFixed(3) : "—", protonFluxStats.p10MeV?.max !== null && protonFluxStats.p10MeV?.max !== undefined ? protonFluxStats.p10MeV.max.toFixed(3) : "—", protonFluxStats.p10MeV?.mean !== null && protonFluxStats.p10MeV?.mean !== undefined ? protonFluxStats.p10MeV.mean.toFixed(3) : "—", protonFluxStats.p10MeV?.current !== null && protonFluxStats.p10MeV?.current !== undefined ? protonFluxStats.p10MeV.current.toFixed(3) : "—", "pfu"],
                  ["≥50 MeV", protonFluxStats.p50MeV?.min !== null && protonFluxStats.p50MeV?.min !== undefined ? protonFluxStats.p50MeV.min.toFixed(3) : "—", protonFluxStats.p50MeV?.max !== null && protonFluxStats.p50MeV?.max !== undefined ? protonFluxStats.p50MeV.max.toFixed(3) : "—", protonFluxStats.p50MeV?.mean !== null && protonFluxStats.p50MeV?.mean !== undefined ? protonFluxStats.p50MeV.mean.toFixed(3) : "—", protonFluxStats.p50MeV?.current !== null && protonFluxStats.p50MeV?.current !== undefined ? protonFluxStats.p50MeV.current.toFixed(3) : "—", "pfu"],
                  ["≥100 MeV", protonFluxStats.p100MeV?.min !== null && protonFluxStats.p100MeV?.min !== undefined ? protonFluxStats.p100MeV.min.toFixed(3) : "—", protonFluxStats.p100MeV?.max !== null && protonFluxStats.p100MeV?.max !== undefined ? protonFluxStats.p100MeV.max.toFixed(3) : "—", protonFluxStats.p100MeV?.mean !== null && protonFluxStats.p100MeV?.mean !== undefined ? protonFluxStats.p100MeV.mean.toFixed(3) : "—", protonFluxStats.p100MeV?.current !== null && protonFluxStats.p100MeV?.current !== undefined ? protonFluxStats.p100MeV.current.toFixed(3) : "—", "pfu"]
                ])}
              </div>
            )}
            {electronFluxStats && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerHistorical">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Electron Flux Statistics</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDataTable("Electron History", ["Parameter", "Min", "Max", "Mean", "Current", "Data Points"], [
                  ["≥2 MeV Flux", electronFluxStats.min !== null && electronFluxStats.min !== undefined ? electronFluxStats.min.toFixed(0) : "—", electronFluxStats.max !== null && electronFluxStats.max !== undefined ? electronFluxStats.max.toFixed(0) : "—", electronFluxStats.mean !== null && electronFluxStats.mean !== undefined ? electronFluxStats.mean.toFixed(0) : "—", electronFluxStats.current !== null && electronFluxStats.current !== undefined ? electronFluxStats.current.toFixed(0) : "—", electronFluxStats.dataPoints || "—"]
                ])}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderGroundEnvironmentTab = () => {
    const data = getModuleData("groundOpsEnvironmental") || {};
    if (!data || Object.keys(data).length === 0) return <div className="dinosatEarthCondLoadingState">No Ground Ops data</div>;

    const historicalSeismic = data.historicalSeismic || {};
    const historicalSeismicTimeSeries = historicalSeismic?.timeSeries || [];
    const seismicChart = historicalSeismicTimeSeries.length > 0 ? createDynamicLineChart("Seismic Activity (30 days)", historicalSeismicTimeSeries, "timestamp", "magnitude", " M", "#7c3aed", false) : null;

    const commandData = getModuleData("commandIntegrity") || {};
    const historicalWeather = commandData?.historicalWeather || {};
    const historicalWeatherTimeSeries = historicalWeather?.timeSeries || [];
    const weatherWindChart = historicalWeatherTimeSeries.length > 0 ? createDynamicLineChart("Historical Wind Speed", historicalWeatherTimeSeries.filter(d => d && d.windSpeed !== null && d.windSpeed !== undefined).slice(-48), "timestamp", "windSpeed", " m/s", "#22c55e", false) : null;
    const weatherTempChart = historicalWeatherTimeSeries.length > 0 ? createDynamicLineChart("Historical Temperature", historicalWeatherTimeSeries.filter(d => d && d.temperature !== null && d.temperature !== undefined).slice(-48), "timestamp", "temperature", " °C", "#8b5cf6", false) : null;
    const weatherPressureChart = historicalWeatherTimeSeries.length > 0 ? createDynamicLineChart("Historical Pressure", historicalWeatherTimeSeries.filter(d => d && d.pressure !== null && d.pressure !== undefined).slice(-48), "timestamp", "pressure", " hPa", "#6366f1", false) : null;

    const radiationEnv = data.radiationEnvironment || {};
    const protonFluxTimeSeries = radiationEnv.protonFluxTimeSeries || [];
    const electronFluxTimeSeries = radiationEnv.electronFluxTimeSeries || [];
    const xrayFluxTimeSeries = radiationEnv.xrayFluxTimeSeries || [];
    const geomagneticTimeSeries = radiationEnv.geomagneticTimeSeries || [];
    const solarWindTimeSeries = radiationEnv.solarWindTimeSeries || [];

    const protonChart = protonFluxTimeSeries.length > 0 ? createDynamicLineChart("Proton Flux (7-day)", protonFluxTimeSeries.filter(d => d && d.energy === ">=10 MeV").slice(-200), "timestamp", "flux", " pfu", "#7c3aed", false) : null;
    const electronChart = electronFluxTimeSeries.length > 0 ? createDynamicLineChart("Electron Flux (7-day)", electronFluxTimeSeries.filter(d => d && d.energy === ">=2 MeV").slice(-200), "timestamp", "flux", " pfu", "#22c55e", false) : null;
    const xrayChart = xrayFluxTimeSeries.length > 0 ? createDynamicLineChart("X-ray Flux (7-day)", xrayFluxTimeSeries.slice(-200), "timestamp", "flux", " W/m²", "#f59e0b", false) : null;
    const geomagChart = geomagneticTimeSeries.length > 0 ? createDynamicLineChart("Geomagnetic Bz (7-day)", geomagneticTimeSeries.slice(-200), "timestamp", "bz", " nT", "#6366f1", false) : null;
    const solarWindChart = solarWindTimeSeries.length > 0 ? createDynamicLineChart("Solar Wind Speed (7-day)", solarWindTimeSeries.slice(-200), "timestamp", "speed", " km/s", "#8b5cf6", false) : null;

    const severeWeather = data.severeWeather || {};
    const lightningMonitoring = data.lightningMonitoring || {};
    const rangeSafety = data.rangeSafety || {};
    const aircraftTracking = rangeSafety.aircraftTracking || {};
    const airspaceRestrictions = rangeSafety.airspaceRestrictions || {};
    const exclusionZones = rangeSafety.exclusionZones || {};
    const atmosphericElectricity = data.padEnvironment?.atmosphericElectricity || {};

    const getThreatColor = (threat) => {
      if (threat === "CRITICAL") return "#7c3aed";
      if (threat === "ELEVATED") return "#8b5cf6";
      if (threat === "GUARDED") return "#f59e0b";
      return "#22c55e";
    };

    const getRangeStatusColor = (status) => {
      if (status === "GO" || status === "CLEAR") return "#22c55e";
      if (status === "NO_GO" || status === "NOT_CLEAR") return "#7c3aed";
      if (status === "HOLD" || status === "UNKNOWN") return "#f59e0b";
      return "#64748b";
    };

    return (
      <div className="dinosatEarthCondModuleTab">
        <div className="dinosatEarthCondSectionDivider">
          <div className="dinosatEarthCondSectionDividerLine" />
          <span className="dinosatEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faBroadcastTower} />
            Pad Environment & Crew Safety
          </span>
          <div className="dinosatEarthCondSectionDividerLine" />
        </div>
        <div className="dinosatEarthCondOverviewGrid">
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerLive">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Pad Environment</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderDataTable("Conditions", ["Parameter", "Value", "Unit"], [
              ["Wind Dir", data.padEnvironment?.windRose?.direction ?? "—", "deg"],
              ["Wind Speed", data.padEnvironment?.windRose?.speed ?? "—", "m/s"],
              ["Gust Factor", data.padEnvironment?.windRose?.gustFactor !== null && data.padEnvironment?.windRose?.gustFactor !== undefined ? data.padEnvironment.windRose.gustFactor.toFixed(2) : "—", ""],
              ["Visibility", data.padEnvironment?.opticalRange?.visibility ?? "—", "m"],
              ["Range Status", data.padEnvironment?.opticalRange?.status ?? "—", ""]
            ])}
          </div>
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerLive">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Crew Safety</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderDataTable("Personnel", ["Parameter", "Value", "Status"], [
              ["Lightning Standoff", data.padEnvironment?.crewSafety?.lightningStandoff !== null && data.padEnvironment?.crewSafety?.lightningStandoff !== undefined ? `${data.padEnvironment.crewSafety.lightningStandoff} nm` : "NO DATA", data.padEnvironment?.crewSafety?.lightningStandoff !== null && data.padEnvironment?.crewSafety?.lightningStandoff !== undefined ? (data.padEnvironment.crewSafety.lightningStandoff >= 10 ? "OK" : "VIOLATION") : "NO DATA"],
              ["Heat Index", `${data.padEnvironment?.crewSafety?.heatIndex ?? "—"} C`, data.padEnvironment?.crewSafety?.workable ? "OK" : "VIOLATION"],
              ["Workable", data.padEnvironment?.crewSafety?.workable ? "YES" : "NO", data.padEnvironment?.crewSafety?.workable ? "OK" : "VIOLATION"]
            ])}
          </div>
        </div>
        <div className="dinosatEarthCondSectionDivider">
          <div className="dinosatEarthCondSectionDividerLine" />
          <span className="dinosatEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faBolt} />
            Electrical Hazards & Lightning
          </span>
          <div className="dinosatEarthCondSectionDividerLine" />
        </div>
        <div className="dinosatEarthCondOverviewGrid">
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerComputed">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Atmospheric Electricity</h4>
              {renderDataTypeBadge("COMPUTED", "small")}
            </div>
            {renderDataTable("Electrostatic Risk", ["Parameter", "Value", "Status"], [
              ["Field Strength", atmosphericElectricity.fieldStrength !== null && atmosphericElectricity.fieldStrength !== undefined ? `${atmosphericElectricity.fieldStrength.toFixed(2)} kV/m` : "—", atmosphericElectricity.fieldStrength !== null && atmosphericElectricity.fieldStrength !== undefined ? (atmosphericElectricity.fieldStrength > 5 ? "WARNING" : "NOMINAL") : "NO DATA"],
              ["Cumulus Electrification", atmosphericElectricity.cumulusElectrification !== null && atmosphericElectricity.cumulusElectrification !== undefined ? `${(atmosphericElectricity.cumulusElectrification * 100).toFixed(1)}%` : "—", atmosphericElectricity.cumulusElectrification !== null && atmosphericElectricity.cumulusElectrification !== undefined ? (atmosphericElectricity.cumulusElectrification > 0.8 ? "CRITICAL" : atmosphericElectricity.cumulusElectrification > 0.5 ? "WARNING" : "NOMINAL") : "NO DATA"],
              ["Triboelectric Risk", atmosphericElectricity.triboelectricRisk !== null && atmosphericElectricity.triboelectricRisk !== undefined ? `${(atmosphericElectricity.triboelectricRisk * 100).toFixed(1)}%` : "—", atmosphericElectricity.triboelectricRisk !== null && atmosphericElectricity.triboelectricRisk !== undefined ? (atmosphericElectricity.triboelectricRisk > 0.6 ? "WARNING" : "NOMINAL") : "NO DATA"],
              ["Anvil Cloud Distance", atmosphericElectricity.anvilCloudDistance !== null && atmosphericElectricity.anvilCloudDistance !== undefined ? `${atmosphericElectricity.anvilCloudDistance} nm` : "—", atmosphericElectricity.anvilCloudDistance !== null && atmosphericElectricity.anvilCloudDistance !== undefined ? (atmosphericElectricity.anvilCloudDistance < 10 ? "WARNING" : "OK") : "NO DATA"],
              ["Precip Static Risk", atmosphericElectricity.precipitationStaticRisk !== null && atmosphericElectricity.precipitationStaticRisk !== undefined ? `${(atmosphericElectricity.precipitationStaticRisk * 100).toFixed(1)}%` : "—", atmosphericElectricity.precipitationStaticRisk !== null && atmosphericElectricity.precipitationStaticRisk !== undefined ? (atmosphericElectricity.precipitationStaticRisk > 0.5 ? "WARNING" : "OK") : "NO DATA"]
            ])}

          </div>

          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerComputed">
            {atmosphericElectricity.cumulusElectrification !== null && atmosphericElectricity.cumulusElectrification !== undefined && (
              <div className="dinosatEarthCondRiskGauge">
                <div className="dinosatEarthCondGaugeValue" style={{ color: atmosphericElectricity.cumulusElectrification > 0.8 ? "#7c3aed" : atmosphericElectricity.cumulusElectrification > 0.5 ? "#8b5cf6" : "#22c55e" }}>
                  {(atmosphericElectricity.cumulusElectrification * 100).toFixed(0)}%
                </div>
                <div className="dinosatEarthCondGaugeLabel">Cumulus Electrification Index</div>
                <div className="dinosatEarthCondGaugeBar">
                  <div className="dinosatEarthCondGaugeFill" style={{
                    width: `${atmosphericElectricity.cumulusElectrification * 100}%`,
                    backgroundColor: atmosphericElectricity.cumulusElectrification > 0.8 ? "#7c3aed" : atmosphericElectricity.cumulusElectrification > 0.5 ? "#8b5cf6" : "#22c55e"
                  }} />
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="dinosatEarthCondOverviewGrid">

          <div className="dinosatEarthCondPanelSingle dinosatEarthCondChartContainerLive">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Lightning Monitoring</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderDataTable("Strike Activity", ["Parameter", "Value", "Status"], [
              ["Field Mill Status", lightningMonitoring.fieldMillStatus || "—", lightningMonitoring.fieldMillStatus === "NOMINAL" ? "OK" : lightningMonitoring.fieldMillStatus === "ELEVATED" ? "WARNING" : "UNKNOWN"],
              ["Strikes (10nm)", lightningMonitoring.currentStrikes10nm !== null && lightningMonitoring.currentStrikes10nm !== undefined ? lightningMonitoring.currentStrikes10nm : "—", lightningMonitoring.currentStrikes10nm !== null && lightningMonitoring.currentStrikes10nm !== undefined ? (lightningMonitoring.currentStrikes10nm > 0 ? "CRITICAL" : "CLEAR") : "NO DATA"],
              ["Strikes (20nm)", lightningMonitoring.currentStrikes20nm !== null && lightningMonitoring.currentStrikes20nm !== undefined ? lightningMonitoring.currentStrikes20nm : "—", lightningMonitoring.currentStrikes20nm !== null && lightningMonitoring.currentStrikes20nm !== undefined ? (lightningMonitoring.currentStrikes20nm > 0 ? "WARNING" : "CLEAR") : "NO DATA"],
              ["Strikes (30nm)", lightningMonitoring.currentStrikes30nm !== null && lightningMonitoring.currentStrikes30nm !== undefined ? lightningMonitoring.currentStrikes30nm : "—", lightningMonitoring.currentStrikes30nm !== null && lightningMonitoring.currentStrikes30nm !== undefined ? (lightningMonitoring.currentStrikes30nm > 0 ? "ADVISORY" : "CLEAR") : "NO DATA"],
              ["Last Strike", lightningMonitoring.lastStrikeTime ? new Date(lightningMonitoring.lastStrikeTime).toLocaleTimeString() : "—", lightningMonitoring.lastStrikeTime ? "DETECTED" : "NONE"],
              ["Density Trend", lightningMonitoring.strikeDensityTrend || "—", lightningMonitoring.strikeDensityTrend === "INCREASING" ? "WARNING" : "OK"]
            ])}
            {lightningMonitoring.recentStrikeHistory?.length > 0 && (
              <div className="dinosatEarthCondTableCard">
                <h3>Recent Strike History</h3>
                <table className="dinosatEarthCondDataTable">
                  <thead><tr><th>Time</th><th>Distance (nm)</th><th>Bearing (°)</th></tr></thead>
                  <tbody>
                    {lightningMonitoring.recentStrikeHistory.slice(0, 10).map((strike, i) => (
                      <tr key={i}>
                        <td>{strike?.time ? new Date(strike.time).toLocaleTimeString() : "—"}</td>
                        <td style={{ color: (strike?.distance ?? 999) < 10 ? "#7c3aed" : (strike?.distance ?? 999) < 20 ? "#8b5cf6" : "#22c55e" }}>{strike?.distance !== null && strike?.distance !== undefined ? strike.distance.toFixed(1) : "—"}</td>
                        <td>{strike?.bearing || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        <div className="dinosatEarthCondSectionDivider">
          <div className="dinosatEarthCondSectionDividerLine" />
          <span className="dinosatEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faPlane} />
            Range Safety & Airspace
          </span>
          <div className="dinosatEarthCondSectionDividerLine" />
        </div>
        <div className="dinosatEarthCondOverviewGrid">
          <div className="dinosatEarthCondPanelSingle dinosatEarthCondChartContainerLive">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Range Status Overview</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            <div className="dinosatEarthCondRangeStatusGrid">
              <div
                className="dinosatEarthCondRangeStatus"
                style={{
                  borderColor: data.padEnvironment?.crewSafety?.workable ? "#22c55e" : "#f59e0b",
                  color: data.padEnvironment?.crewSafety?.workable ? "#22c55e" : "#f59e0b",
                  backgroundColor: data.padEnvironment?.crewSafety?.workable ? "rgba(34, 197, 94, 0.05)" : "rgba(245, 158, 11, 0.05)"
                }}
              >
                <FontAwesomeIcon icon={data.padEnvironment?.crewSafety?.workable ? faSquareCheck : faExclamationTriangle} />
                <span>Crew Ops</span>
              </div>
              <div
                className="dinosatEarthCondRangeStatus"
                style={{
                  borderColor: data.padEnvironment?.opticalRange?.status === "ADEQUATE" ? "#22c55e" : "#f59e0b",
                  color: data.padEnvironment?.opticalRange?.status === "ADEQUATE" ? "#22c55e" : "#f59e0b",
                  backgroundColor: data.padEnvironment?.opticalRange?.status === "ADEQUATE" ? "rgba(34, 197, 94, 0.05)" : "rgba(245, 158, 11, 0.05)"
                }}
              >
                <FontAwesomeIcon icon={data.padEnvironment?.opticalRange?.status === "ADEQUATE" ? faSquareCheck : faExclamationTriangle} />
                <span>Optical</span>
              </div>
              <div
                className="dinosatEarthCondRangeStatus"
                style={{
                  borderColor: data.rangeHazards?.recoveryZone?.recoveryViable ? "#22c55e" : "#f59e0b",
                  color: data.rangeHazards?.recoveryZone?.recoveryViable ? "#22c55e" : "#f59e0b",
                  backgroundColor: data.rangeHazards?.recoveryZone?.recoveryViable ? "rgba(34, 197, 94, 0.05)" : "rgba(245, 158, 11, 0.05)"
                }}
              >
                <FontAwesomeIcon icon={data.rangeHazards?.recoveryZone?.recoveryViable ? faSquareCheck : faExclamationTriangle} />
                <span>Recovery</span>
              </div>
              <div
                className="dinosatEarthCondRangeStatus"
                style={{
                  borderColor: data.rangeHazards?.toxicPlumeCone?.dataAvailable ? "#22c55e" : "#f59e0b",
                  color: data.rangeHazards?.toxicPlumeCone?.dataAvailable ? "#22c55e" : "#f59e0b",
                  backgroundColor: data.rangeHazards?.toxicPlumeCone?.dataAvailable ? "rgba(34, 197, 94, 0.05)" : "rgba(245, 158, 11, 0.05)"
                }}
              >
                <FontAwesomeIcon icon={data.rangeHazards?.toxicPlumeCone?.dataAvailable ? faSquareCheck : faExclamationTriangle} />
                <span>Toxic Plume</span>
              </div>
              <div
                className="dinosatEarthCondRangeStatus"
                style={{
                  borderColor: aircraftTracking.corridorClearStatus === "CLEAR" ? "#22c55e" : aircraftTracking.corridorClearStatus === "NOT_CLEAR" ? "#7c3aed" : "#f59e0b",
                  color: aircraftTracking.corridorClearStatus === "CLEAR" ? "#22c55e" : aircraftTracking.corridorClearStatus === "NOT_CLEAR" ? "#7c3aed" : "#f59e0b",
                  backgroundColor: aircraftTracking.corridorClearStatus === "CLEAR" ? "rgba(34, 197, 94, 0.05)" : aircraftTracking.corridorClearStatus === "NOT_CLEAR" ? "rgba(124, 58, 237, 0.05)" : "rgba(245, 158, 11, 0.05)"
                }}
              >
                <FontAwesomeIcon icon={aircraftTracking.corridorClearStatus === "CLEAR" ? faSquareCheck : aircraftTracking.corridorClearStatus === "NOT_CLEAR" ? faXmarkSquare : faExclamationTriangle} />
                <span>Corridor</span>
              </div>
              <div
                className="dinosatEarthCondRangeStatus"
                style={{
                  borderColor: rangeSafety.overallRangeStatus === "GO" ? "#22c55e" : rangeSafety.overallRangeStatus === "NO_GO" ? "#7c3aed" : "#f59e0b",
                  color: rangeSafety.overallRangeStatus === "GO" ? "#22c55e" : rangeSafety.overallRangeStatus === "NO_GO" ? "#7c3aed" : "#f59e0b",
                  backgroundColor: rangeSafety.overallRangeStatus === "GO" ? "rgba(34, 197, 94, 0.05)" : rangeSafety.overallRangeStatus === "NO_GO" ? "rgba(124, 58, 237, 0.05)" : "rgba(245, 158, 11, 0.05)"
                }}
              >
                <FontAwesomeIcon icon={rangeSafety.overallRangeStatus === "GO" ? faSquareCheck : rangeSafety.overallRangeStatus === "NO_GO" ? faXmarkSquare : faExclamationTriangle} />
                <span>Overall</span>
              </div>
            </div>
            {renderDataTable("Range Clear Status", ["Parameter", "Value", "Status"], [
              ["Range Clear", rangeSafety.rangeClearStatus || "—", rangeSafety.rangeClearStatus === "CLEAR" ? "GO" : rangeSafety.rangeClearStatus === "NOT_CLEAR" ? "NO_GO" : "HOLD"],
              ["Overall Range", rangeSafety.overallRangeStatus || "—", rangeSafety.overallRangeStatus === "GO" ? "GO" : rangeSafety.overallRangeStatus === "NO_GO" ? "NO_GO" : "HOLD"]
            ])}
          </div>
        </div>
        <div className="dinosatEarthCondOverviewGrid">
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerLive">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Aircraft Tracking Summary</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderDataTable("Corridor Status", ["Parameter", "Value", "Status"], [
              ["Corridor Status", aircraftTracking.corridorClearStatus || "—", aircraftTracking.corridorClearStatus === "CLEAR" ? "GO" : aircraftTracking.corridorClearStatus === "NOT_CLEAR" ? "NO_GO" : "UNKNOWN"],
              ["Aircraft in Area", aircraftTracking.aircraftCount !== null && aircraftTracking.aircraftCount !== undefined ? aircraftTracking.aircraftCount : "—", aircraftTracking.aircraftCount !== null && aircraftTracking.aircraftCount !== undefined ? (aircraftTracking.aircraftCount > 20 ? "HIGH_TRAFFIC" : "OK") : "NO DATA"],
              ["Min Distance", aircraftTracking.minAircraftDistance !== null && aircraftTracking.minAircraftDistance !== undefined ? `${aircraftTracking.minAircraftDistance} km` : "—", aircraftTracking.minAircraftDistance !== null && aircraftTracking.minAircraftDistance !== undefined ? (aircraftTracking.minAircraftDistance < 50 ? "WARNING" : "OK") : "NO DATA"],
              ["In Corridor", (aircraftTracking.aircraftInCorridor || []).filter(a => a && a.inFlightCorridor).length, (aircraftTracking.aircraftInCorridor || []).filter(a => a && a.inFlightCorridor).length > 0 ? "CRITICAL" : "CLEAR"]
            ])}
          </div>
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerLive">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Airspace Restrictions</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderDataTable("NOTAMs & TFRs", ["Parameter", "Value", "Status"], [
              ["Active TFRs", airspaceRestrictions.activeTFRs?.length ?? 0, (airspaceRestrictions.activeTFRs?.length ?? 0) > 0 ? "ACTIVE" : "NONE"],
              ["Active NOTAMs", airspaceRestrictions.activeNOTAMs?.length ?? 0, (airspaceRestrictions.activeNOTAMs?.length ?? 0) > 0 ? "ACTIVE" : "NONE"],
              ["Airspace Closure", airspaceRestrictions.airspaceClosureStatus || "—", airspaceRestrictions.airspaceClosureStatus === "CLOSED" ? "ACTIVE" : "OPEN"],
              ["Coordination", airspaceRestrictions.coordinationStatus || "—", airspaceRestrictions.coordinationStatus === "COMPLETE" ? "OK" : "PENDING"]
            ])}
          </div>
        </div>
        {aircraftTracking.aircraftInCorridor?.length > 0 && (
          <div className="dinosatEarthCondOverviewGrid">
            <div className="dinosatEarthCondPanelSingle dinosatEarthCondFullWidth dinosatEarthCondChartContainerLive">
              <div className="dinosatEarthCondChartHeaderWithBadge">
                <h4>Aircraft in Tracking Area ({aircraftTracking.aircraftInCorridor.length})</h4>
                {renderDataTypeBadge("LIVE", "small")}
              </div>
              <div className="dinosatEarthCondTableCard">
                <table className="dinosatEarthCondDataTable">
                  <thead>
                    <tr>
                      <th>Callsign</th>
                      <th>ICAO24</th>
                      <th>Distance (km)</th>
                      <th>Altitude (m)</th>
                      <th>Velocity (m/s)</th>
                      <th>Heading (°)</th>
                      <th>Bearing (°)</th>
                      <th>Bearing Δ (°)</th>
                      <th>Vert Rate</th>
                      <th>In Corridor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aircraftTracking.aircraftInCorridor.slice(0, 25).map((ac, i) => (
                      <tr key={i} style={{ backgroundColor: ac?.inFlightCorridor ? "rgba(124, 58, 237, 0.15)" : "transparent" }}>
                        <td style={{ fontWeight: ac?.inFlightCorridor ? "bold" : "normal" }}>{ac?.callsign || "—"}</td>
                        <td>{ac?.icao24 || "—"}</td>
                        <td style={{ color: (ac?.distance ?? 999) < 50 ? "#7c3aed" : (ac?.distance ?? 999) < 100 ? "#8b5cf6" : "#22c55e" }}>{ac?.distance ?? "—"}</td>
                        <td>{ac?.altitude !== null && ac?.altitude !== undefined ? Math.round(ac.altitude) : "—"}</td>
                        <td>{ac?.velocity !== null && ac?.velocity !== undefined ? Math.round(ac.velocity) : "—"}</td>
                        <td>{ac?.heading !== null && ac?.heading !== undefined ? Math.round(ac.heading) : "—"}</td>
                        <td>{ac?.bearing ?? "—"}</td>
                        <td style={{ color: (ac?.bearingDiff ?? 999) < 15 ? "#7c3aed" : "#22c55e" }}>{ac?.bearingDiff ?? "—"}</td>
                        <td>{ac?.verticalRate !== null && ac?.verticalRate !== undefined ? ac.verticalRate.toFixed(1) : "—"}</td>
                        <td style={{ color: ac?.inFlightCorridor ? "#7c3aed" : "#22c55e", fontWeight: "bold" }}>{ac?.inFlightCorridor ? "YES" : "NO"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        <div className="dinosatEarthCondSectionDivider">
          <div className="dinosatEarthCondSectionDividerLine" />
          <span className="dinosatEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faWater} />
            Maritime & Recovery Operations
          </span>
          <div className="dinosatEarthCondSectionDividerLine" />
        </div>
        <div className="dinosatEarthCondOverviewGrid">
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerLive">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Recovery Zone</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderDataTable("Marine", ["Parameter", "Value", "Status"], [
              ["Wave Height", `${data.rangeHazards?.recoveryZone?.waveHeight ?? "—"} m`, data.rangeHazards?.recoveryZone?.recoveryViable ? "OK" : "VIOLATION"],
              ["Sea State", data.rangeHazards?.recoveryZone?.seaState ?? "—", "INFO"],
              ["Viable", data.rangeHazards?.recoveryZone?.recoveryViable ? "YES" : "NO", data.rangeHazards?.recoveryZone?.recoveryViable ? "OK" : "VIOLATION"]
            ])}
          </div>
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerLive">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Exclusion Zones</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderDataTable("Maritime Status", ["Parameter", "Value", "Status"], [
              ["Vessels in Hazard Area", exclusionZones.vesselsInHazardArea !== null && exclusionZones.vesselsInHazardArea !== undefined ? exclusionZones.vesselsInHazardArea : "—", exclusionZones.vesselsInHazardArea !== null && exclusionZones.vesselsInHazardArea !== undefined ? (exclusionZones.vesselsInHazardArea > 0 ? "WARNING" : "CLEAR") : "NO DATA"],
              ["Hazard Area Clear", exclusionZones.hazardAreaClear || "—", exclusionZones.hazardAreaClear === "CLEAR" ? "GO" : exclusionZones.hazardAreaClear === "NOT_CLEAR" ? "NO_GO" : "UNKNOWN"],
              ["Ships Tracked", exclusionZones.shipTracking?.length ?? 0, (exclusionZones.shipTracking?.length ?? 0) > 0 ? "ACTIVE" : "NONE"]
            ])}
          </div>
        </div>
        {exclusionZones.shipTracking?.length > 0 && (
          <div className="dinosatEarthCondOverviewGrid">
            <div className="dinosatEarthCondPanelSingle dinosatEarthCondFullWidth dinosatEarthCondChartContainerLive">
              <div className="dinosatEarthCondChartHeaderWithBadge">
                <h4>Ship Tracking ({exclusionZones.shipTracking.length})</h4>
                {renderDataTypeBadge("LIVE", "small")}
              </div>
              {renderDataTable("Vessels", ["Name", "MMSI", "Distance (km)", "Bearing (°)", "Speed (kts)", "In Hazard Zone"],
                exclusionZones.shipTracking.slice(0, 20).map(ship => [
                  ship?.name || "—",
                  ship?.mmsi || "—",
                  ship?.distance !== null && ship?.distance !== undefined ? ship.distance.toFixed(1) : "—",
                  ship?.bearing || "—",
                  ship?.speed !== null && ship?.speed !== undefined ? ship.speed.toFixed(1) : "—",
                  ship?.inHazardZone ? "YES" : "NO"
                ])
              )}
            </div>
          </div>
        )}
        <div className="dinosatEarthCondSectionDivider">
          <div className="dinosatEarthCondSectionDividerLine" />
          <span className="dinosatEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faCloudShowersHeavy} />
            Severe Weather Reports (24h)
          </span>
          <div className="dinosatEarthCondSectionDividerLine" />
        </div>
        <div className="dinosatEarthCondOverviewGrid">

          <div className="dinosatEarthCondPanelSingle dinosatEarthCondChartContainerLive">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Threat Assessment</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderDataTable("Report Summary", ["Type", "Count (24h)", "Nearby", "Status"], [
              ["Tornado", severeWeather.reports24h?.tornado?.length ?? 0, (severeWeather.reports24h?.tornado || []).filter(r => r && r.distance <= 300).length, (severeWeather.reports24h?.tornado || []).filter(r => r && r.distance <= 300).length > 0 ? "CRITICAL" : "CLEAR"],
              ["Hail", severeWeather.reports24h?.hail?.length ?? 0, (severeWeather.reports24h?.hail || []).filter(r => r && r.distance <= 300).length, (severeWeather.reports24h?.hail || []).filter(r => r && r.distance <= 300).length > 3 ? "WARNING" : "OK"],
              ["Wind Damage", severeWeather.reports24h?.wind?.length ?? 0, (severeWeather.reports24h?.wind || []).filter(r => r && r.distance <= 300).length, (severeWeather.reports24h?.wind || []).filter(r => r && r.distance <= 300).length > 5 ? "WARNING" : "OK"],
              ["Total Reports", severeWeather.reports24h?.total ?? 0, severeWeather.nearbyReports?.length ?? 0, (severeWeather.nearbyReports?.length ?? 0) > 10 ? "WARNING" : "OK"]
            ])}
          </div>
          {severeWeather.reports24h?.tornado?.length > 0 && (
            <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerLive">
              <div className="dinosatEarthCondChartHeaderWithBadge">
                <h4>Tornado Reports ({severeWeather.reports24h.tornado.length})</h4>
                {renderDataTypeBadge("LIVE", "small")}
              </div>
              {renderDataTable("Tornado Activity", ["Time", "Location", "State", "Distance (km)", "Comments"],
                severeWeather.reports24h.tornado.slice(0, 10).map(r => [
                  r?.time || "—",
                  r?.location || r?.county || "—",
                  r?.state || "—",
                  r?.distance ?? "—",
                  r?.comments ? r.comments.substring(0, 50) : "—"
                ])
              )}
            </div>
          )}
        </div>
        {((severeWeather.reports24h?.hail?.length ?? 0) > 0 || (severeWeather.reports24h?.wind?.length ?? 0) > 0 || (severeWeather.nearbyReports?.length ?? 0) > 0) && (
          <div className="dinosatEarthCondOverviewGrid">
            {severeWeather.reports24h?.hail?.length > 0 && (
              <div className="dinosatEarthCondPanelTriple dinosatEarthCondChartContainerLive">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Hail Reports ({severeWeather.reports24h.hail.length})</h4>
                  {renderDataTypeBadge("LIVE", "small")}
                </div>
                {renderDataTable("Hail Activity", ["Time", "Size", "Location", "State", "Distance (km)"],
                  severeWeather.reports24h.hail.slice(0, 10).map(r => [
                    r?.time || "—",
                    r?.speed || "—",
                    r?.location || r?.county || "—",
                    r?.state || "—",
                    r?.distance ?? "—"
                  ])
                )}
              </div>
            )}
            {severeWeather.reports24h?.wind?.length > 0 && (
              <div className="dinosatEarthCondPanelTriple dinosatEarthCondChartContainerLive">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Wind Damage Reports ({severeWeather.reports24h.wind.length})</h4>
                  {renderDataTypeBadge("LIVE", "small")}
                </div>
                {renderDataTable("Wind Damage", ["Time", "Speed", "Location", "State", "Distance (km)"],
                  severeWeather.reports24h.wind.slice(0, 10).map(r => [
                    r?.time || "—",
                    r?.speed || "—",
                    r?.location || r?.county || "—",
                    r?.state || "—",
                    r?.distance ?? "—"
                  ])
                )}
              </div>
            )}
            {severeWeather.nearbyReports?.length > 0 && (
              <div className="dinosatEarthCondPanelTriple dinosatEarthCondFullWidth dinosatEarthCondChartContainerLive">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Nearby Severe Weather Reports ({severeWeather.nearbyReports.length})</h4>
                  {renderDataTypeBadge("LIVE", "small")}
                </div>
                {renderDataTable("All Nearby Reports (within 300km)", ["Time", "Type", "Location", "State", "Distance (km)", "Comments"],
                  severeWeather.nearbyReports.slice(0, 15).map(r => [
                    r?.time || "—",
                    r?.type || "—",
                    r?.location || r?.county || "—",
                    r?.state || "—",
                    r?.distance ?? "—",
                    r?.comments ? r.comments.substring(0, 40) : "—"
                  ])
                )}
              </div>
            )}
          </div>
        )}
        <div className="dinosatEarthCondSectionDivider">
          <div className="dinosatEarthCondSectionDividerLine" />
          <span className="dinosatEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faFire} />
            Fire Weather & Environmental Hazards
          </span>
          <div className="dinosatEarthCondSectionDividerLine" />
        </div>

        {data.rangeHazards?.fireRisk?.dataAvailable && (
          <div className="dinosatEarthCondOverviewGrid">
            <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerComputed">
              <div className="dinosatEarthCondChartHeaderWithBadge">
                <h4>Fire Weather Index</h4>
                {renderDataTypeBadge("COMPUTED", "small")}
              </div>
              <div className="dinosatEarthCondRiskGauge">
                <div className="dinosatEarthCondGaugeValue">{data.rangeHazards.fireRisk.index ?? "—"}</div>
                <div className="dinosatEarthCondGaugeLabel">{data.rangeHazards.fireRisk.category || "—"}</div>
                <div className="dinosatEarthCondGaugeBar">
                  <div className="dinosatEarthCondGaugeFill" style={{
                    width: `${Math.min(100, ((data.rangeHazards.fireRisk.index ?? 0) / 50) * 100)}%`,
                    backgroundColor: data.rangeHazards.fireRisk.category === "EXTREME" ? "#7c3aed" : data.rangeHazards.fireRisk.category === "VERY_HIGH" ? "#8b5cf6" : data.rangeHazards.fireRisk.category === "HIGH" ? "#f59e0b" : "#22c55e"
                  }} />
                </div>
                <div className="dinosatEarthCondDataTrust">
                  Components: FFMC={data.rangeHazards.fireRisk.components?.ffmc ?? "—"}, DMC={data.rangeHazards.fireRisk.components?.dmc ?? "—"}, DC={data.rangeHazards.fireRisk.components?.dc ?? "—"}
                </div>
              </div>
            </div>

            <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerComputed">
              <div className="dinosatEarthCondChartHeaderWithBadge">
                <h4>Fire Weather Index</h4>
                {renderDataTypeBadge("COMPUTED", "small")}
              </div>
              {data.rangeHazards.fireRisk.components && (
                <div className="dinosatEarthCondTableCard">
                  <h3>FWI Components</h3>
                  <table className="dinosatEarthCondDataTable">
                    <thead><tr><th>Component</th><th>Value</th><th>Description</th></tr></thead>
                    <tbody>
                      <tr><td>FFMC</td><td>{data.rangeHazards.fireRisk.components.ffmc ?? "—"}</td><td>Fine Fuel Moisture Code</td></tr>
                      <tr><td>DMC</td><td>{data.rangeHazards.fireRisk.components.dmc ?? "—"}</td><td>Duff Moisture Code</td></tr>
                      <tr><td>DC</td><td>{data.rangeHazards.fireRisk.components.dc ?? "—"}</td><td>Drought Code</td></tr>
                      <tr><td>ISI</td><td>{data.rangeHazards.fireRisk.components.isi ?? "—"}</td><td>Initial Spread Index</td></tr>
                      <tr><td>BUI</td><td>{data.rangeHazards.fireRisk.components.bui ?? "—"}</td><td>Build Up Index</td></tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
        {data.rangeHazards?.geospatialHazards?.fires?.length > 0 && (
          <div className="dinosatEarthCondOverviewGrid">
            <div className="dinosatEarthCondPanelSingle dinosatEarthCondChartContainerLive">
              <div className="dinosatEarthCondChartHeaderWithBadge">
                <h4>Active Fires Nearby ({data.rangeHazards.geospatialHazards.fires.length})</h4>
                {renderDataTypeBadge("LIVE", "small")}
              </div>
              {renderDataTable("Fire Activity", ["Name", "Distance (km)", "Acres", "Containment", "Status"],
                data.rangeHazards.geospatialHazards.fires.slice(0, 10).map(fire => [
                  fire?.name || "—",
                  fire?.distance !== null && fire?.distance !== undefined ? fire.distance.toFixed(1) : "—",
                  fire?.acres || "—",
                  fire?.containment || "—",
                  fire?.status || "—"
                ])
              )}
            </div>
          </div>
        )}
        {data.rangeHazards?.toxicPlumeCone?.dataAvailable && (
          <div className="dinosatEarthCondOverviewGrid">
            <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerComputed">
              <div className="dinosatEarthCondChartHeaderWithBadge">
                <h4>Toxic Plume Dispersion</h4>
                {renderDataTypeBadge("COMPUTED", "small")}
              </div>
              <div className="dinosatEarthCondForecastNotice">
                <FontAwesomeIcon icon={faInfoCircle} />
                <span>Computed dispersion model based on current wind conditions and propellant type</span>
              </div>
              {renderDataTable("Hazard Analysis", ["Parameter", "Value", "Unit"], [
                ["Toxicity Level", data.rangeHazards.toxicPlumeCone.toxicityLevel || "—", ""],
                ["Evacuation Radius", data.rangeHazards.toxicPlumeCone.evacuationZone ?? "—", "m"],
                ["Wind Direction", data.rangeHazards.toxicPlumeCone.windDirection ?? "—", "deg"],
                ["Downwind Distance", data.rangeHazards.toxicPlumeCone.dispersion?.downwindDistance || "—", "m"],
                ["Crosswind Width", data.rangeHazards.toxicPlumeCone.dispersion?.crosswindWidth || "—", "m"],
                ["Vertical Extent", data.rangeHazards.toxicPlumeCone.dispersion?.verticalExtent || "—", "m"]
              ])}
            </div>

            <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerComputed">
              <div className="dinosatEarthCondChartHeaderWithBadge">
                <h4>Hazard Contours</h4>
                {renderDataTypeBadge("COMPUTED", "small")}
              </div>
              <div className="dinosatEarthCondForecastNotice">
                <FontAwesomeIcon icon={faInfoCircle} />
                <span>Computed dispersion model based on current wind conditions and propellant type</span>
              </div>
              {data.rangeHazards.toxicPlumeCone.hazardContours?.length > 0 && (
                <div className="dinosatEarthCondTableCard">
                  <h3>Hazard Contours</h3>
                  <table className="dinosatEarthCondDataTable">
                    <thead><tr><th>Level</th><th>Distance (m)</th><th>Description</th></tr></thead>
                    <tbody>
                      {data.rangeHazards.toxicPlumeCone.hazardContours.map((contour, i) => (
                        <tr key={i}>
                          <td>{contour?.level || "—"}</td>
                          <td>{contour?.distance ?? "—"}</td>
                          <td>{contour?.description || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
        <div className="dinosatEarthCondSectionDivider">
          <div className="dinosatEarthCondSectionDividerLine" />
          <span className="dinosatEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faSatellite} />
            Current Radiation & Space Environment
          </span>
          <div className="dinosatEarthCondSectionDividerLine" />
        </div>
        <div className="dinosatEarthCondOverviewGrid">
          <div className="dinosatEarthCondPanelTriple dinosatEarthCondChartContainerLive">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Current Radiation Conditions</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderDataTable("Particle Flux", ["Parameter", "Value", "Unit", "Status"], [
              ["Proton ≥10 MeV", radiationEnv.currentConditions?.proton10MeV !== undefined && radiationEnv.currentConditions?.proton10MeV !== null ? radiationEnv.currentConditions.proton10MeV.toFixed(2) : "—", "pfu", radiationEnv.currentConditions?.proton10MeV !== undefined && radiationEnv.currentConditions?.proton10MeV !== null ? (radiationEnv.currentConditions.proton10MeV > 10 ? "WARNING" : "NOMINAL") : "NO DATA"],
              ["Proton ≥50 MeV", radiationEnv.currentConditions?.proton50MeV !== undefined && radiationEnv.currentConditions?.proton50MeV !== null ? radiationEnv.currentConditions.proton50MeV.toFixed(2) : "—", "pfu", radiationEnv.currentConditions?.proton50MeV !== undefined && radiationEnv.currentConditions?.proton50MeV !== null ? (radiationEnv.currentConditions.proton50MeV > 5 ? "WARNING" : "NOMINAL") : "NO DATA"],
              ["Proton ≥100 MeV", radiationEnv.currentConditions?.proton100MeV !== undefined && radiationEnv.currentConditions?.proton100MeV !== null ? radiationEnv.currentConditions.proton100MeV.toFixed(2) : "—", "pfu", radiationEnv.currentConditions?.proton100MeV !== undefined && radiationEnv.currentConditions?.proton100MeV !== null ? (radiationEnv.currentConditions.proton100MeV > 1 ? "WARNING" : "NOMINAL") : "NO DATA"],
              ["Electron ≥2 MeV", radiationEnv.currentConditions?.electron2MeV !== undefined && radiationEnv.currentConditions?.electron2MeV !== null ? radiationEnv.currentConditions.electron2MeV.toFixed(0) : "—", "pfu", radiationEnv.currentConditions?.electron2MeV !== undefined && radiationEnv.currentConditions?.electron2MeV !== null ? (radiationEnv.currentConditions.electron2MeV > 10000 ? "WARNING" : "NOMINAL") : "NO DATA"],
              ["X-ray Short", radiationEnv.currentConditions?.xrayShort !== undefined && radiationEnv.currentConditions?.xrayShort !== null ? radiationEnv.currentConditions.xrayShort.toExponential(2) : "—", "W/m²", "OK"],
              ["X-ray Long", radiationEnv.currentConditions?.xrayLong !== undefined && radiationEnv.currentConditions?.xrayLong !== null ? radiationEnv.currentConditions.xrayLong.toExponential(2) : "—", "W/m²", "OK"]
            ])}
          </div>
          <div className="dinosatEarthCondPanelTriple dinosatEarthCondChartContainerLive">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Geomagnetic & Solar Wind</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderDataTable("Space Environment", ["Parameter", "Value", "Unit", "Status"], [
              ["Bz Component", radiationEnv.currentConditions?.bzComponent !== undefined && radiationEnv.currentConditions?.bzComponent !== null ? radiationEnv.currentConditions.bzComponent.toFixed(1) : "—", "nT", radiationEnv.currentConditions?.bzComponent !== undefined && radiationEnv.currentConditions?.bzComponent !== null ? (radiationEnv.currentConditions.bzComponent < -10 ? "STORM" : "NOMINAL") : "NO DATA"],
              ["Solar Wind Speed", radiationEnv.currentConditions?.solarWindSpeed !== undefined && radiationEnv.currentConditions?.solarWindSpeed !== null ? radiationEnv.currentConditions.solarWindSpeed.toFixed(0) : "—", "km/s", radiationEnv.currentConditions?.solarWindSpeed !== undefined && radiationEnv.currentConditions?.solarWindSpeed !== null ? (radiationEnv.currentConditions.solarWindSpeed > 600 ? "ELEVATED" : "NOMINAL") : "NO DATA"],
              ["Solar Wind Density", radiationEnv.currentConditions?.solarWindDensity !== undefined && radiationEnv.currentConditions?.solarWindDensity !== null ? radiationEnv.currentConditions.solarWindDensity.toFixed(1) : "—", "p/cm³", "OK"],
              ["K-Index Boulder", radiationEnv.currentConditions?.kIndexBoulder !== undefined && radiationEnv.currentConditions?.kIndexBoulder !== null ? radiationEnv.currentConditions.kIndexBoulder.toFixed(0) : "—", "", radiationEnv.currentConditions?.kIndexBoulder !== undefined && radiationEnv.currentConditions?.kIndexBoulder !== null ? (radiationEnv.currentConditions.kIndexBoulder >= 5 ? "STORM" : radiationEnv.currentConditions.kIndexBoulder >= 4 ? "ACTIVE" : "QUIET") : "NO DATA"]
            ])}
          </div>
          {data.rangeHazards?.geospatialHazards?.debris?.length > 0 && (
            <div className="dinosatEarthCondPanelTriple dinosatEarthCondFullWidth dinosatEarthCondChartContainerLive">
              <div className="dinosatEarthCondChartHeaderWithBadge">
                <h4>Corridor Objects (Orbital Debris)</h4>
                {renderDataTypeBadge("LIVE", "small")}
              </div>
              {renderDataTable("Orbital Debris", ["Name", "Inclination (°)", "Expected Inc (°)"],
                data.rangeHazards.geospatialHazards.debris.slice(0, 20).map(obj => [
                  obj?.name || "—",
                  obj?.inclination !== null && obj?.inclination !== undefined ? obj.inclination.toFixed(2) : "—",
                  obj?.expectedInclination !== null && obj?.expectedInclination !== undefined ? obj.expectedInclination.toFixed(2) : "—"
                ])
              )}
            </div>
          )}
        </div>
        <div className="dinosatEarthCondSectionDivider">
          <div className="dinosatEarthCondSectionDividerLine" />
          <span className="dinosatEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faGlobeAmericas} />
            Seismic Activity & Monitoring
          </span>
          <div className="dinosatEarthCondSectionDividerLine" />
        </div>
        {((data.rangeHazards?.geospatialHazards?.earthquakes?.length ?? 0) > 0 || (data.seismicTrends?.recentActivity?.length ?? 0) > 0) && (
          <div className="dinosatEarthCondOverviewGrid">
            {data.rangeHazards?.geospatialHazards?.earthquakes?.length > 0 && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondFullWidth dinosatEarthCondChartContainerLive">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Recent Earthquakes (24h)</h4>
                  {renderDataTypeBadge("LIVE", "small")}
                </div>
                {renderDataTable("Seismic Events (24h)", ["Magnitude", "Distance (km)", "Depth (km)", "Location"],
                  data.rangeHazards.geospatialHazards.earthquakes.slice(0, 10).map(eq => [
                    eq?.magnitude !== null && eq?.magnitude !== undefined ? eq.magnitude.toFixed(1) : "—",
                    eq?.distance !== null && eq?.distance !== undefined ? eq.distance.toFixed(0) : "—",
                    eq?.depth !== null && eq?.depth !== undefined ? eq.depth.toFixed(0) : "—",
                    eq?.location || "—"
                  ])
                )}
              </div>
            )}
            {data.seismicTrends?.recentActivity?.length > 0 && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerHistorical">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Monthly Seismic Activity</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDataTable("Monthly Activity", ["Month", "Events", "Max Magnitude", "Avg Magnitude"],
                  data.seismicTrends.recentActivity.slice(0, 6).map(month => [
                    month?.month || "—",
                    month?.eventCount ?? "—",
                    month?.maxMagnitude !== null && month?.maxMagnitude !== undefined ? month.maxMagnitude.toFixed(1) : "—",
                    month?.averageMagnitude !== null && month?.averageMagnitude !== undefined ? month.averageMagnitude.toFixed(1) : "—"
                  ])
                )}
              </div>
            )}
          </div>
        )}
        {(data.seismicTrends?.magnitudeTrends || (data.seismicTrends?.significantEvents?.length ?? 0) > 0) && (
          <div className="dinosatEarthCondOverviewGrid">
            {data.seismicTrends?.magnitudeTrends && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerHistorical">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Seismic Trends</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDataTable("Trend Analysis", ["Period", "Event Count", "Max Magnitude", "Avg Magnitude"], [
                  ["Last 30 Days", data.seismicTrends.magnitudeTrends.last30Days?.count ?? "—", data.seismicTrends.magnitudeTrends.last30Days?.maxMagnitude !== null && data.seismicTrends.magnitudeTrends.last30Days?.maxMagnitude !== undefined ? data.seismicTrends.magnitudeTrends.last30Days.maxMagnitude.toFixed(1) : "—", data.seismicTrends.magnitudeTrends.last30Days?.averageMagnitude !== null && data.seismicTrends.magnitudeTrends.last30Days?.averageMagnitude !== undefined ? data.seismicTrends.magnitudeTrends.last30Days.averageMagnitude.toFixed(1) : "—"],
                  ["Last 90 Days", data.seismicTrends.magnitudeTrends.last90Days?.count ?? "—", data.seismicTrends.magnitudeTrends.last90Days?.maxMagnitude !== null && data.seismicTrends.magnitudeTrends.last90Days?.maxMagnitude !== undefined ? data.seismicTrends.magnitudeTrends.last90Days.maxMagnitude.toFixed(1) : "—", data.seismicTrends.magnitudeTrends.last90Days?.averageMagnitude !== null && data.seismicTrends.magnitudeTrends.last90Days?.averageMagnitude !== undefined ? data.seismicTrends.magnitudeTrends.last90Days.averageMagnitude.toFixed(1) : "—"]
                ])}
              </div>
            )}
            {data.seismicTrends?.significantEvents?.length > 0 && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondFullWidth dinosatEarthCondChartContainerHistorical">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Significant Seismic Events (M4.5+)</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDataTable("Major Events", ["Time", "Magnitude", "Distance (km)", "Depth (km)", "Location"],
                  data.seismicTrends.significantEvents.slice(0, 10).map(eq => [
                    eq?.timestamp ? new Date(eq.timestamp).toLocaleString() : "—",
                    eq?.magnitude !== null && eq?.magnitude !== undefined ? eq.magnitude.toFixed(1) : "—",
                    eq?.distance ?? "—",
                    eq?.depth !== null && eq?.depth !== undefined ? eq.depth.toFixed(0) : "—",
                    eq?.location || "—"
                  ])
                )}
              </div>
            )}
          </div>
        )}
        {seismicChart && (
          <div className="dinosatEarthCondOverviewGrid">
            <div className="dinosatEarthCondPanelSingle dinosatEarthCondFullWidth dinosatEarthCondChartContainerHistorical">
              <div className="dinosatEarthCondChartHeaderWithBadge">
                <h4>Seismic History (1 year)</h4>
                {renderDataTypeBadge("HISTORICAL", "small")}
              </div>
              {renderDynamicChart(seismicChart, "dinosatEarthCondChart")}
              <div className="dinosatEarthCondChartDescription">
                <div className="dinosatEarthCondChartAxesInfo">
                  <span><strong>X-Axis:</strong> Time (1-year observation period)</span>
                  <span><strong>Y-Axis:</strong> Earthquake Magnitude (Richter scale)</span>
                </div>
                <p className="dinosatEarthCondChartDescriptionText">
                  This chart displays seismic activity recorded within the monitoring radius of the launch site over the past year. Each data point represents an individual earthquake event plotted by its magnitude on the Richter scale. Seismic activity is monitored because ground vibrations can affect launch vehicle structural integrity during pre-launch operations, impact sensitive instrumentation calibration, and potentially damage ground support equipment. Significant seismic events (M4.5+) within close proximity may trigger hold procedures for detailed structural inspections.
                </p>
              </div>
              {historicalSeismic?.statistics && (
                <div className="dinosatEarthCondStatsSummary">
                  <span>Events: {historicalSeismic.statistics.totalEvents ?? 0}</span>
                  <span>Max: M{historicalSeismic.statistics.maxMagnitude !== null && historicalSeismic.statistics.maxMagnitude !== undefined ? historicalSeismic.statistics.maxMagnitude.toFixed(1) : "—"}</span>
                  <span>Avg: M{historicalSeismic.statistics.meanMagnitude !== null && historicalSeismic.statistics.meanMagnitude !== undefined ? historicalSeismic.statistics.meanMagnitude.toFixed(1) : "—"}</span>
                  <span>Significant (M4+): {historicalSeismic.statistics.significantEvents ?? 0}</span>
                  <span>Major (M5+): {historicalSeismic.statistics.majorEvents ?? 0}</span>
                  <span>Nearby (100km): {historicalSeismic.statistics.nearbyEvents ?? 0}</span>
                </div>
              )}
            </div>
          </div>
        )}
        <div className="dinosatEarthCondSectionDivider">
          <div className="dinosatEarthCondSectionDividerLine" />
          <span className="dinosatEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faHistory} />
            Historical Weather (7-Day)
          </span>
          <div className="dinosatEarthCondSectionDividerLine" />
        </div>
        {weatherTempChart && (
          <div className="dinosatEarthCondOverviewGrid">
            <div className="dinosatEarthCondPanelSingle dinosatEarthCondChartContainerHistorical">
              <div className="dinosatEarthCondChartHeaderWithBadge">
                <h4>7-Day Temperature History</h4>
                {renderDataTypeBadge("HISTORICAL", "small")}
              </div>
              {renderDynamicChart(weatherTempChart, "dinosatEarthCondChart")}
              <div className="dinosatEarthCondChartDescription">
                <div className="dinosatEarthCondChartAxesInfo">
                  <span><strong>X-Axis:</strong> Time (7-day observation period)</span>
                  <span><strong>Y-Axis:</strong> Temperature (°C)</span>
                </div>
                <p className="dinosatEarthCondChartDescriptionText">
                  This chart tracks ambient air temperature variations over the past 7 days at the ground operations site. Temperature monitoring is critical for propellant loading operations as it affects fuel density and tank pressurization requirements. Extreme temperatures may require adjustments to propellant mass calculations, impact battery performance and avionics thermal management, and affect the structural properties of composite materials on the launch vehicle. Temperature trends also help predict fog formation and icing conditions.
                </p>
              </div>
              {historicalWeather?.statistics?.temperature && (
                <div className="dinosatEarthCondStatsSummary">
                  <span>min: {historicalWeather.statistics.temperature.min !== null && historicalWeather.statistics.temperature.min !== undefined ? historicalWeather.statistics.temperature.min.toFixed(1) : "—"} °C</span>
                  <span>max: {historicalWeather.statistics.temperature.max !== null && historicalWeather.statistics.temperature.max !== undefined ? historicalWeather.statistics.temperature.max.toFixed(1) : "—"} °C</span>
                  <span>avg: {historicalWeather.statistics.temperature.mean !== null && historicalWeather.statistics.temperature.mean !== undefined ? historicalWeather.statistics.temperature.mean.toFixed(1) : "—"} °C</span>
                </div>
              )}
            </div>
          </div>
        )}

        {weatherWindChart && (
          <div className="dinosatEarthCondOverviewGrid">
            <div className="dinosatEarthCondPanelSingle dinosatEarthCondChartContainerHistorical">
              <div className="dinosatEarthCondChartHeaderWithBadge">
                <h4>7-Day Wind History</h4>
                {renderDataTypeBadge("HISTORICAL", "small")}
              </div>
              {renderDynamicChart(weatherWindChart, "dinosatEarthCondChart")}
              <div className="dinosatEarthCondChartDescription">
                <div className="dinosatEarthCondChartAxesInfo">
                  <span><strong>X-Axis:</strong> Time (7-day observation period)</span>
                  <span><strong>Y-Axis:</strong> Wind Speed (m/s)</span>
                </div>
                <p className="dinosatEarthCondChartDescriptionText">
                  This chart displays surface wind speed measurements recorded over the past 7 days at the ground operations facility. Wind conditions directly impact pad crew safety, crane operations for payload integration, and rollout procedures for mobile launch platforms. Sustained winds above operational limits require work stoppages and may delay vehicle transport. The historical pattern helps identify typical diurnal wind cycles and predict optimal windows for outdoor operations.
                </p>
              </div>
              {historicalWeather?.statistics?.windSpeed && (
                <div className="dinosatEarthCondStatsSummary">
                  <span>min: {historicalWeather.statistics.windSpeed.min !== null && historicalWeather.statistics.windSpeed.min !== undefined ? historicalWeather.statistics.windSpeed.min.toFixed(1) : "—"} m/s</span>
                  <span>max: {historicalWeather.statistics.windSpeed.max !== null && historicalWeather.statistics.windSpeed.max !== undefined ? historicalWeather.statistics.windSpeed.max.toFixed(1) : "—"} m/s</span>
                  <span>avg: {historicalWeather.statistics.windSpeed.mean !== null && historicalWeather.statistics.windSpeed.mean !== undefined ? historicalWeather.statistics.windSpeed.mean.toFixed(1) : "—"} m/s</span>
                  <span>std: {historicalWeather.statistics.windSpeed.stdDev !== null && historicalWeather.statistics.windSpeed.stdDev !== undefined ? historicalWeather.statistics.windSpeed.stdDev.toFixed(1) : "—"} m/s</span>
                </div>
              )}
            </div>
          </div>
        )}

        {weatherPressureChart && (
          <div className="dinosatEarthCondOverviewGrid">
            <div className="dinosatEarthCondPanelSingle dinosatEarthCondChartContainerHistorical">
              <div className="dinosatEarthCondChartHeaderWithBadge">
                <h4>7-Day Pressure History</h4>
                {renderDataTypeBadge("HISTORICAL", "small")}
              </div>
              {renderDynamicChart(weatherPressureChart, "dinosatEarthCondChart")}
              <div className="dinosatEarthCondChartDescription">
                <div className="dinosatEarthCondChartAxesInfo">
                  <span><strong>X-Axis:</strong> Time (7-day observation period)</span>
                  <span><strong>Y-Axis:</strong> Barometric Pressure (hPa)</span>
                </div>
                <p className="dinosatEarthCondChartDescriptionText">
                  This chart displays barometric pressure readings over the past 7 days at the ground operations site. Atmospheric pressure directly affects air density calculations used in aerodynamic modeling and engine performance predictions. Pressure trends serve as key indicators of approaching weather systems—rapidly falling pressure typically signals deteriorating conditions and potential storm activity, while rising pressure generally indicates clearing weather. Ground operations planners use these trends to anticipate weather windows for critical outdoor activities.
                </p>
              </div>
              {historicalWeather?.statistics?.pressure && (
                <div className="dinosatEarthCondStatsSummary">
                  <span>min: {historicalWeather.statistics.pressure.min !== null && historicalWeather.statistics.pressure.min !== undefined ? historicalWeather.statistics.pressure.min.toFixed(0) : "—"} hPa</span>
                  <span>max: {historicalWeather.statistics.pressure.max !== null && historicalWeather.statistics.pressure.max !== undefined ? historicalWeather.statistics.pressure.max.toFixed(0) : "—"} hPa</span>
                  <span>avg: {historicalWeather.statistics.pressure.mean !== null && historicalWeather.statistics.pressure.mean !== undefined ? historicalWeather.statistics.pressure.mean.toFixed(0) : "—"} hPa</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="dinosatEarthCondSectionDivider">
          <div className="dinosatEarthCondSectionDividerLine" />
          <span className="dinosatEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faSatellite} />
            Historical Radiation (7-Day)
          </span>
          <div className="dinosatEarthCondSectionDividerLine" />
        </div>
        {(protonChart || electronChart) && (
          <div className="dinosatEarthCondOverviewGrid">
            {protonChart && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerHistorical">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Proton Flux ≥10 MeV (7-day)</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(protonChart, "dinosatEarthCondChart")}
                <div className="dinosatEarthCondChartDescription">
                  <div className="dinosatEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (7-day observation period)</span>
                    <span><strong>Y-Axis:</strong> Proton Flux (particle flux units, pfu)</span>
                  </div>
                  <p className="dinosatEarthCondChartDescriptionText">
                    This chart displays high-energy proton flux measurements (≥10 MeV) from GOES satellite observations over the past 7 days. Elevated proton flux levels indicate solar energetic particle events that pose radiation hazards to spacecraft electronics and can cause single-event upsets in avionics systems. Flux values exceeding 10 pfu trigger radiation storm warnings and may require launch delays to protect sensitive payload components and ensure crew safety for crewed missions.
                  </p>
                </div>
              </div>
            )}
            {electronChart && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerHistorical">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Electron Flux ≥2 MeV (7-day)</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(electronChart, "dinosatEarthCondChart")}
                <div className="dinosatEarthCondChartDescription">
                  <div className="dinosatEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (7-day observation period)</span>
                    <span><strong>Y-Axis:</strong> Electron Flux (particle flux units, pfu)</span>
                  </div>
                  <p className="dinosatEarthCondChartDescriptionText">
                    This chart shows relativistic electron flux measurements (≥2 MeV) over the past 7 days. High-energy electrons in the radiation belts can cause deep dielectric charging in spacecraft, leading to electrostatic discharge events that damage electronic components. Elevated electron flux is particularly concerning for satellites passing through the outer radiation belt and can affect the operational lifetime of spacecraft electronics. Flux levels above 1000 pfu indicate enhanced radiation belt conditions.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
        {(xrayChart || geomagChart) && (
          <div className="dinosatEarthCondOverviewGrid">
            {xrayChart && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerHistorical">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>X-ray Flux (7-day)</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(xrayChart, "dinosatEarthCondChart")}
                <div className="dinosatEarthCondChartDescription">
                  <div className="dinosatEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (7-day observation period)</span>
                    <span><strong>Y-Axis:</strong> X-ray Flux (W/m²)</span>
                  </div>
                  <p className="dinosatEarthCondChartDescriptionText">
                    This chart displays solar X-ray flux measurements over the past 7 days, which indicate solar flare activity. X-ray flux is classified on a logarithmic scale from A (lowest) through B, C, M, to X (highest) class flares. M-class and X-class flares can cause radio blackouts affecting high-frequency communications used for range safety, ionospheric disturbances impacting GPS accuracy, and are often precursors to solar energetic particle events. Sudden increases in X-ray flux require immediate assessment of communication system integrity.
                  </p>
                </div>
              </div>
            )}
            {geomagChart && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerHistorical">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Geomagnetic Bz (7-day)</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(geomagChart, "dinosatEarthCondChart")}
                <div className="dinosatEarthCondChartDescription">
                  <div className="dinosatEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (7-day observation period)</span>
                    <span><strong>Y-Axis:</strong> Interplanetary Magnetic Field Bz Component (nT)</span>
                  </div>
                  <p className="dinosatEarthCondChartDescriptionText">
                    This chart shows the north-south component (Bz) of the interplanetary magnetic field over the past 7 days. When Bz turns strongly southward (negative values), it allows solar wind energy to couple efficiently into Earth's magnetosphere, triggering geomagnetic storms. Sustained Bz values below -10 nT typically result in significant geomagnetic activity that can affect spacecraft attitude control systems, increase atmospheric drag on low-Earth orbit satellites, and cause GPS positioning errors. This parameter is a key predictor of impending geomagnetic disturbances.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
        {solarWindChart && (
          <div className="dinosatEarthCondOverviewGrid">
            <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerHistorical">
              <div className="dinosatEarthCondChartHeaderWithBadge">
                <h4>Solar Wind Speed (7-day)</h4>
                {renderDataTypeBadge("HISTORICAL", "small")}
              </div>
              {renderDynamicChart(solarWindChart, "dinosatEarthCondChart")}
              <div className="dinosatEarthCondChartDescription">
                <div className="dinosatEarthCondChartAxesInfo">
                  <span><strong>X-Axis:</strong> Time (7-day observation period)</span>
                  <span><strong>Y-Axis:</strong> Solar Wind Speed (km/s)</span>
                </div>
                <p className="dinosatEarthCondChartDescriptionText">
                  This chart displays solar wind velocity measurements over the past 7 days from upstream solar wind monitors. Normal solar wind speeds range from 300-500 km/s, while high-speed streams from coronal holes can exceed 700 km/s. Elevated solar wind speeds increase the dynamic pressure on Earth's magnetosphere, compressing it and enhancing geomagnetic activity. Combined with a southward Bz component, high solar wind speeds significantly increase the probability of geomagnetic storms that can affect spacecraft operations and ground-based systems.
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  };

  const renderAtmosphericEnvrionmentTab = () => {
    const data = getModuleData("aerodynamicsAscent") || {};
    if (!data || Object.keys(data).length === 0) return <div className="dinosatEarthCondLoadingState">No Aerodynamics data</div>;

    const maxQCorridorTrajectory = data.maxQCorridor?.trajectory || [];
    const shearCurtainVerticalProfile = data.shearCurtain?.verticalProfile || [];
    const atmosphericDensityProfile = data.atmosphericDensity?.densityProfile || [];

    const trajectoryChart = maxQCorridorTrajectory.length > 0 ? createDynamicLineChart("Dynamic Pressure", maxQCorridorTrajectory, "altitude", "dynamicPressure", " Pa", "#7c3aed", false) : null;
    const shearChart = shearCurtainVerticalProfile.length > 0 ? createDynamicLineChart("Wind Shear", shearCurtainVerticalProfile, "altitude", "shear", " m/s/km", "#8b5cf6", false) : null;
    const densityChart = atmosphericDensityProfile.length > 0 ? createDynamicLineChart("Atmospheric Density", atmosphericDensityProfile, "altitude", "density", " kg/m³", "#22c55e", false) : null;

    const historicalAtmo = data.historicalAtmospheric || {};
    const historicalAtmoTimeSeries = historicalAtmo?.timeSeries || [];
    const atmoWind10Chart = historicalAtmoTimeSeries.length > 0 ? createDynamicLineChart("30-Day Surface Wind (10m)", historicalAtmoTimeSeries.filter(d => d && d.wind_10m !== null && d.wind_10m !== undefined).slice(-168), "timestamp", "wind_10m", " m/s", "#6366f1", false) : null;
    const atmoWind100Chart = historicalAtmoTimeSeries.length > 0 ? createDynamicLineChart("30-Day Upper Wind (100m)", historicalAtmoTimeSeries.filter(d => d && d.wind_100m !== null && d.wind_100m !== undefined).slice(-168), "timestamp", "wind_100m", " m/s", "#8b5cf6", false) : null;
    const atmoTempChart = historicalAtmoTimeSeries.length > 0 ? createDynamicLineChart("30-Day Surface Temp", historicalAtmoTimeSeries.filter(d => d && d.temp_surface !== null && d.temp_surface !== undefined).slice(-168), "timestamp", "temp_surface", " °C", "#f59e0b", false) : null;
    const atmoGustChart = historicalAtmoTimeSeries.length > 0 ? createDynamicLineChart("30-Day Wind Gusts", historicalAtmoTimeSeries.filter(d => d && d.wind_gusts !== null && d.wind_gusts !== undefined).slice(-168), "timestamp", "wind_gusts", " m/s", "#ef4444", false) : null;

    const criticalLayers = data.shearCurtain?.criticalLayers || [];
    const warningLayers = data.shearCurtain?.warningLayers || [];
    const verticalProfile = data.shearCurtain?.verticalProfile || [];

    const cloudAnalysis = data.cloudAnalysis || {};
    const humidityProfile = data.humidityProfile || {};
    const temperatureInversions = data.temperatureInversions || {};
    const convectiveAnalysis = data.convectiveAnalysis || {};
    const cosmicRayAnalysis = data.cosmicRayAnalysis || {};

    const historicalCloud = cloudAnalysis.historicalCloud || {};
    const historicalHumidity = humidityProfile.historicalHumidity || {};
    const historicalInversions = temperatureInversions.historicalInversions || {};

    const historicalCloudTimeSeries = historicalCloud?.timeSeries || [];
    const historicalHumidityTimeSeries = historicalHumidity?.timeSeries || [];
    const historicalInversionsTimeSeries = historicalInversions?.timeSeries || [];

    const cloudTotalChart = historicalCloudTimeSeries.length > 0 ? createDynamicLineChart("Cloud Cover (30d)", historicalCloudTimeSeries.filter(d => d && d.totalCover !== null && d.totalCover !== undefined).slice(-168), "timestamp", "totalCover", "%", "#64748b", false) : null;
    const cloudLowChart = historicalCloudTimeSeries.length > 0 ? createDynamicLineChart("Low Cloud Cover (30d)", historicalCloudTimeSeries.filter(d => d && d.lowCover !== null && d.lowCover !== undefined).slice(-168), "timestamp", "lowCover", "%", "#8b5cf6", false) : null;
    const precipChart = historicalCloudTimeSeries.length > 0 ? createDynamicLineChart("Precipitation (30d)", historicalCloudTimeSeries.filter(d => d && d.precipitation !== null && d.precipitation !== undefined).slice(-168), "timestamp", "precipitation", " mm", "#0ea5e9", false) : null;

    const surfaceRHChart = historicalHumidityTimeSeries.length > 0 ? createDynamicLineChart("Surface RH (30d)", historicalHumidityTimeSeries.filter(d => d && d.surfaceRH !== null && d.surfaceRH !== undefined).slice(-168), "timestamp", "surfaceRH", "%", "#22c55e", false) : null;
    const dewpointDepressionChart = historicalHumidityTimeSeries.length > 0 ? createDynamicLineChart("Dewpoint Depression (30d)", historicalHumidityTimeSeries.filter(d => d && d.dewpointDepression !== null && d.dewpointDepression !== undefined).slice(-168), "timestamp", "dewpointDepression", " °C", "#f59e0b", false) : null;

    const inversionIndicatorChart = historicalInversionsTimeSeries.length > 0 ? createDynamicLineChart("Inversion Indicator (30d)", historicalInversionsTimeSeries.filter(d => d && d.maxStrength !== null && d.maxStrength !== undefined).slice(-168), "timestamp", "maxStrength", "", "#7c3aed", false) : null;

    const cloudAnalysisLayers = cloudAnalysis?.layers || [];
    const capeChart = cloudAnalysisLayers.length > 0 ? createDynamicLineChart("CAPE Forecast (24h)", cloudAnalysisLayers.filter(d => d && d.cape !== null && d.cape !== undefined), "hour", "cape", " J/kg", "#f59e0b", true) : null;
    const liftedIndexChart = cloudAnalysisLayers.length > 0 ? createDynamicLineChart("Lifted Index (24h)", cloudAnalysisLayers.filter(d => d && d.liftedIndex !== null && d.liftedIndex !== undefined), "hour", "liftedIndex", " °C", "#6366f1", true) : null;

    return (
      <div className="dinosatEarthCondModuleTab">
        <div className="dinosatEarthCondSectionDivider">
          <div className="dinosatEarthCondSectionDividerLine" />
          <span className="dinosatEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faBroadcastTower} />
            Structural Loads & Flight Envelope
          </span>
          <div className="dinosatEarthCondSectionDividerLine" />
        </div>
        <div className="dinosatEarthCondOverviewGrid">
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerComputed">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Structural Load</h4>
              {renderDataTypeBadge("COMPUTED", "small")}
            </div>
            {renderDataTable("Max Q", ["Parameter", "Value", "Limit", "Status"], [
              ["Max Q", data.structuralLoad?.maxQ !== null && data.structuralLoad?.maxQ !== undefined ? `${(data.structuralLoad.maxQ / 1000).toFixed(1)} kPa` : "UNAVAILABLE", `${(parseFloat(maxQLimit) / 1000).toFixed(1)} kPa`, data.structuralLoad?.status || "UNAVAILABLE"],
              ["Max Q Alt", data.structuralLoad?.maxQAltitude !== null && data.structuralLoad?.maxQAltitude !== undefined ? `${Math.round(data.structuralLoad.maxQAltitude / 1000)} km` : "UNAVAILABLE", "Variable", data.structuralLoad?.status === "COMPUTED" ? "Computed" : "UNAVAILABLE"],
              ["Danger Zone", data.maxQCorridor?.dangerZone || "UNAVAILABLE", "SAFE", data.maxQCorridor?.dangerZone === "SAFE" ? "OK" : data.maxQCorridor?.dangerZone === "EXCEEDED" ? "CRITICAL" : "UNAVAILABLE"],
              ["Cd Source", data.flightEnvelope?.dragCoefficient?.source || "NOT AVAILABLE", "Required", data.flightEnvelope?.dragCoefficient?.available ? "OK" : "MISSING"],
              ["Cd Value", data.flightEnvelope?.dragCoefficient?.value !== null && data.flightEnvelope?.dragCoefficient?.value !== undefined ? data.flightEnvelope.dragCoefficient.value.toFixed(3) : "—", "0.2-0.5", data.flightEnvelope?.dragCoefficient?.available ? "OK" : "N/A"]
            ])}
          </div>
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerComputed">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Thermal & Environment</h4>
              {renderDataTypeBadge("COMPUTED", "small")}
            </div>
            {renderDataTable("Heating & Icing", ["Parameter", "Value", "Unit"], [
              ["Max Heat Flux", data.flightEnvelope?.thermalLoads?.maxFlux !== null && data.flightEnvelope?.thermalLoads?.maxFlux !== undefined ? data.flightEnvelope.thermalLoads.maxFlux.toFixed(2) : "—", "MW/m²"],
              ["Stag Point Temp", data.flightEnvelope?.thermalLoads?.stagPoint || "—", "K"],
              ["Freezing Level", data.freezeLine?.height || "—", "m"],
              ["Icing Risk", data.freezeLine?.icingRisk || "—", ""],
              ["Scale Height", data.atmosphericDensity?.scaleHeight !== null && data.atmosphericDensity?.scaleHeight !== undefined ? data.atmosphericDensity.scaleHeight.toFixed(0) : "—", "m"]
            ])}
          </div>
        </div>
        {(trajectoryChart || densityChart) && (
          <div className="dinosatEarthCondOverviewGrid">
            {trajectoryChart && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerComputed">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Pressure Profile</h4>
                  {renderDataTypeBadge("COMPUTED", "small")}
                </div>
                {renderDynamicChart(trajectoryChart, "dinosatEarthCondChart")}
                <div className="dinosatEarthCondChartDescription">
                  <div className="dinosatEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Altitude (m)</span>
                    <span><strong>Y-Axis:</strong> Dynamic Pressure (Pa)</span>
                  </div>
                  <p className="dinosatEarthCondChartDescriptionText">
                    This chart displays the computed dynamic pressure profile along the ascent trajectory. Dynamic pressure (Q) represents the aerodynamic force per unit area acting on the vehicle and is calculated as Q = ½ρv², where ρ is atmospheric density and v is velocity. The maximum dynamic pressure (Max Q) occurs during the transonic region and represents the point of greatest structural stress on the vehicle. Launch commit criteria typically specify Max Q limits to ensure structural integrity throughout the flight envelope.
                  </p>
                </div>
              </div>
            )}
            {densityChart && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerComputed">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Density Profile</h4>
                  {renderDataTypeBadge("COMPUTED", "small")}
                </div>
                {renderDynamicChart(densityChart, "dinosatEarthCondChart")}
                <div className="dinosatEarthCondChartDescription">
                  <div className="dinosatEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Altitude (m)</span>
                    <span><strong>Y-Axis:</strong> Atmospheric Density (kg/m³)</span>
                  </div>
                  <p className="dinosatEarthCondChartDescriptionText">
                    This chart shows the atmospheric density profile versus altitude based on current meteorological conditions. Atmospheric density decreases exponentially with altitude following the barometric formula. Accurate density profiles are essential for aerodynamic load calculations, drag predictions, and trajectory optimization. Deviations from standard atmosphere models due to temperature inversions or weather systems can significantly impact Max Q timing and magnitude.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
        {data.flightEnvelope?.dragCoefficient?.machProfile?.length > 0 && (
          <div className="dinosatEarthCondOverviewGrid">
            <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerComputed">
              <div className="dinosatEarthCondChartHeaderWithBadge">
                <h4>Drag Coefficient Profile</h4>
                {renderDataTypeBadge("COMPUTED", "small")}
              </div>
              {renderDynamicChart(createDynamicLineChart("Cd vs Mach", data.flightEnvelope.dragCoefficient.machProfile, "mach", "cd", "", "#f59e0b", false), "dinosatEarthCondChart")}
              <div className="dinosatEarthCondChartDescription">
                <div className="dinosatEarthCondChartAxesInfo">
                  <span><strong>X-Axis:</strong> Mach Number</span>
                  <span><strong>Y-Axis:</strong> Drag Coefficient (Cd)</span>
                </div>
                <p className="dinosatEarthCondChartDescriptionText">
                  This chart displays the vehicle's drag coefficient as a function of Mach number throughout the flight regime. The drag coefficient typically increases sharply in the transonic region (Mach 0.8-1.2) due to shock wave formation, then gradually decreases at supersonic speeds. This profile is critical for trajectory calculations, propellant consumption predictions, and determining the altitude and timing of maximum dynamic pressure. Accurate Cd modeling ensures proper flight performance margins.
                </p>
              </div>
            </div>
          </div>
        )}
        <div className="dinosatEarthCondSectionDivider">
          <div className="dinosatEarthCondSectionDividerLine" />
          <span className="dinosatEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faWind} />
            Wind Environment & Control Authority
          </span>
          <div className="dinosatEarthCondSectionDividerLine" />
        </div>
        <div className="dinosatEarthCondOverviewGrid">
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerLive">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Control Authority</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderDataTable("Flight Control", ["Parameter", "Value", "Unit"], [
              ["Max Shear", data.controlAuthority?.shearAnalysis !== null && data.controlAuthority?.shearAnalysis !== undefined ? data.controlAuthority.shearAnalysis.toFixed(2) : "—", "m/s/km"],
              ["Gimbal Margin", data.controlAuthority?.gimbalMargin !== null && data.controlAuthority?.gimbalMargin !== undefined ? data.controlAuthority.gimbalMargin.toFixed(2) : "—", "x"],
              ["Jet Stream Speed", data.controlAuthority?.jetStreamData?.speed !== null && data.controlAuthority?.jetStreamData?.speed !== undefined ? data.controlAuthority.jetStreamData.speed.toFixed(1) : "—", "m/s"],
              ["Jet Stream Alt", data.controlAuthority?.jetStreamData?.height !== null && data.controlAuthority?.jetStreamData?.height !== undefined ? `${Math.round(data.controlAuthority.jetStreamData.height)}` : "—", "m"]
            ])}
          </div>
        </div>
        <div className="dinosatEarthCondOverviewGrid">
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerLive">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Wind Shear Analysis</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            <div className="dinosatEarthCondShearSummary">
              <div className="dinosatEarthCondShearStat">
                <span className="dinosatEarthCondShearLabel">Total Layers</span>
                <span className="dinosatEarthCondShearValue">{verticalProfile.length}</span>
              </div>
              <div className="dinosatEarthCondShearStat" style={{ color: criticalLayers.length > 0 ? "#8b5cf6" : "#64748b" }}>
                <span className="dinosatEarthCondShearLabel">Elevated (≥15)</span>
                <span className="dinosatEarthCondShearValue">{criticalLayers.length}</span>
              </div>
              <div className="dinosatEarthCondShearStat" style={{ color: warningLayers.length > 0 ? "#7c3aed" : "#64748b" }}>
                <span className="dinosatEarthCondShearLabel">High (≥25)</span>
                <span className="dinosatEarthCondShearValue">{warningLayers.length}</span>
              </div>
              <div className="dinosatEarthCondShearStat">
                <span className="dinosatEarthCondShearLabel">Max Shear</span>
                <span className="dinosatEarthCondShearValue">{data.controlAuthority?.shearAnalysis !== null && data.controlAuthority?.shearAnalysis !== undefined ? data.controlAuthority.shearAnalysis.toFixed(2) : "—"}</span>
              </div>
            </div>

          </div>
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerLive">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Wind Shear Analysis</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {criticalLayers.length > 0 ? (
              <div className="dinosatEarthCondTableCard">
                <h3>Elevated Shear Layers (≥15 m/s/km)</h3>
                <table className="dinosatEarthCondDataTable">
                  <thead>
                    <tr>
                      <th>Alt (m)</th>
                      <th>Shear</th>
                      <th>Wind</th>
                      <th>ΔH (m)</th>
                      <th>ΔV (m/s)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {criticalLayers.map((l, i) => (
                      <tr key={i} style={{ backgroundColor: l && l.shear >= 25 ? "rgba(124, 58, 237, 0.15)" : "rgba(139, 92, 246, 0.1)" }}>
                        <td>{l && l.altitude !== null && l.altitude !== undefined ? Math.round(l.altitude) : "—"}</td>
                        <td style={{ color: l && l.shear >= 25 ? "#7c3aed" : "#8b5cf6", fontWeight: "bold" }}>{l && l.shear !== null && l.shear !== undefined ? l.shear.toFixed(2) : "—"}</td>
                        <td>{l && l.windSpeed !== null && l.windSpeed !== undefined ? `${l.windSpeed.toFixed(1)} m/s` : "—"}</td>
                        <td>{l && l.heightDiff !== null && l.heightDiff !== undefined ? Math.round(l.heightDiff) : "—"}</td>
                        <td>{l && l.windDiff !== null && l.windDiff !== undefined ? l.windDiff.toFixed(1) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="dinosatEarthCondNoChartData">
                No elevated shear layers detected - all layers below 15 m/s/km threshold.
              </div>
            )}
          </div>
        </div>
        {shearChart && (
          <div className="dinosatEarthCondOverviewGrid">
            <div className="dinosatEarthCondPanelSingle dinosatEarthCondChartContainerLive">
              <div className="dinosatEarthCondChartHeaderWithBadge">
                <h4>Shear Profile Chart</h4>
                {renderDataTypeBadge("LIVE", "small")}
              </div>
              {renderDynamicChart(shearChart, "dinosatEarthCondChart")}
              <div className="dinosatEarthCondChartDescription">
                <div className="dinosatEarthCondChartAxesInfo">
                  <span><strong>X-Axis:</strong> Altitude (m)</span>
                  <span><strong>Y-Axis:</strong> Wind Shear (m/s/km)</span>
                </div>
                <p className="dinosatEarthCondChartDescriptionText">
                  This chart displays the vertical wind shear profile from surface to upper atmosphere levels. Wind shear represents the rate of change in wind velocity with altitude and is calculated as the vector difference in wind speed divided by the altitude difference between measurement levels. High shear values indicate rapid wind changes that can induce structural loads and challenge vehicle control systems during ascent. Shear layers exceeding 15 m/s/km require careful evaluation, while values above 25 m/s/km may exceed control authority margins.
                </p>
              </div>
            </div>
          </div>
        )}
        {verticalProfile.length > 0 && (
          <div className="dinosatEarthCondOverviewGrid">
            <div className="dinosatEarthCondPanelSingle dinosatEarthCondFullWidth dinosatEarthCondChartContainerLive">
              <div className="dinosatEarthCondChartHeaderWithBadge">
                <h4>Full Vertical Shear Profile</h4>
                {renderDataTypeBadge("LIVE", "small")}
              </div>
              <div className="dinosatEarthCondTableCard">
                <table className="dinosatEarthCondDataTable">
                  <thead>
                    <tr>
                      <th>Pressure (hPa)</th>
                      <th>Altitude (m)</th>
                      <th>Shear (m/s/km)</th>
                      <th>Wind Speed (m/s)</th>
                      <th>Wind Dir (°)</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {verticalProfile.map((l, i) => {
                      const shearVal = l?.shear ?? 0;
                      const status = shearVal >= 25 ? "HIGH" : shearVal >= 15 ? "ELEVATED" : shearVal >= 10 ? "MODERATE" : "NOMINAL";
                      const statusColor = shearVal >= 25 ? "#7c3aed" : shearVal >= 15 ? "#8b5cf6" : shearVal >= 10 ? "#6366f1" : "#22c55e";
                      return (
                        <tr key={i}>
                          <td>{l?.pressureLevel || "—"}</td>
                          <td>{l?.altitude !== null && l?.altitude !== undefined ? Math.round(l.altitude) : "—"}</td>
                          <td style={{ color: statusColor, fontWeight: shearVal >= 15 ? "bold" : "normal" }}>{l?.shear !== null && l?.shear !== undefined ? l.shear.toFixed(2) : "—"}</td>
                          <td>{l?.windSpeed !== null && l?.windSpeed !== undefined ? l.windSpeed.toFixed(1) : "—"}</td>
                          <td>{l?.windDirection !== null && l?.windDirection !== undefined ? Math.round(l.windDirection) : "—"}</td>
                          <td style={{ color: statusColor }}>{status}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        <div className="dinosatEarthCondSectionDivider">
          <div className="dinosatEarthCondSectionDividerLine" />
          <span className="dinosatEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faThermometerHalf} />
            Atmospheric Stability & Temperature Structure
          </span>
          <div className="dinosatEarthCondSectionDividerLine" />
        </div>
        <div className="dinosatEarthCondOverviewGrid">
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerLive">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Inversion Summary</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderDataTable("Detection", ["Parameter", "Value", "Status"], [
              ["Total Inversions", temperatureInversions.detected?.length ?? 0, (temperatureInversions.detected?.length ?? 0) > 3 ? "WARNING" : "OK"],
              ["Low-Level Inversions", temperatureInversions.lowLevelInversions?.length ?? 0, (temperatureInversions.lowLevelInversions?.length ?? 0) > 0 ? "ADVISORY" : "CLEAR"],
              ["Strongest Strength", temperatureInversions.strongestInversion?.strength !== null && temperatureInversions.strongestInversion?.strength !== undefined ? temperatureInversions.strongestInversion.strength.toFixed(2) + " C/100m" : "—", (temperatureInversions.strongestInversion?.strength ?? 0) > 2.0 ? "WARNING" : "OK"],
              ["Strongest Base", temperatureInversions.strongestInversion?.baseHeight !== null && temperatureInversions.strongestInversion?.baseHeight !== undefined ? temperatureInversions.strongestInversion.baseHeight.toFixed(0) + " m" : "—", "INFO"],
              ["Stability Index", temperatureInversions.atmosphericStability?.index !== null && temperatureInversions.atmosphericStability?.index !== undefined ? temperatureInversions.atmosphericStability.index.toFixed(2) : "—", (temperatureInversions.atmosphericStability?.index ?? 1) < 0.4 ? "WARNING" : "OK"],
              ["Stability Class", temperatureInversions.atmosphericStability?.classification?.replace(/_/g, " ") || "—", temperatureInversions.atmosphericStability?.classification === "VERY_STABLE" ? "WARNING" : "OK"]
            ])}
          </div>
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerComputed">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Acoustic Propagation Impact</h4>
              {renderDataTypeBadge("COMPUTED", "small")}
            </div>
            {renderDataTable("Sound Propagation", ["Parameter", "Value", "Status"], [
              ["Impacted", temperatureInversions.acousticPropagation?.impacted ? "YES" : "NO", temperatureInversions.acousticPropagation?.impacted ? "ADVISORY" : "CLEAR"],
              ["Channeling", temperatureInversions.acousticPropagation?.channeling || "—", temperatureInversions.acousticPropagation?.channeling === "LIKELY" ? "WARNING" : "OK"],
              ["Enhancement Factor", temperatureInversions.acousticPropagation?.enhancementFactor !== null && temperatureInversions.acousticPropagation?.enhancementFactor !== undefined ? temperatureInversions.acousticPropagation.enhancementFactor.toFixed(2) + "x" : "—", (temperatureInversions.acousticPropagation?.enhancementFactor ?? 0) > 1.5 ? "WARNING" : "OK"]
            ])}
          </div>
        </div>
        <div className="dinosatEarthCondOverviewGrid">
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerComputed">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Exhaust Dispersion Impact</h4>
              {renderDataTypeBadge("COMPUTED", "small")}
            </div>
            {renderDataTable("Plume Dispersion", ["Parameter", "Value", "Status"], [
              ["Impacted", temperatureInversions.exhaustDispersion?.impacted ? "YES" : "NO", temperatureInversions.exhaustDispersion?.impacted ? "WARNING" : "CLEAR"],
              ["Trapping Altitude", temperatureInversions.exhaustDispersion?.trappingAltitude !== null && temperatureInversions.exhaustDispersion?.trappingAltitude !== undefined ? temperatureInversions.exhaustDispersion.trappingAltitude.toFixed(0) + " m" : "—", temperatureInversions.exhaustDispersion?.trappingAltitude && temperatureInversions.exhaustDispersion.trappingAltitude < 1000 ? "WARNING" : "OK"],
              ["Dispersal Rating", temperatureInversions.exhaustDispersion?.dispersalRating || "—", temperatureInversions.exhaustDispersion?.dispersalRating === "POOR" ? "CRITICAL" : temperatureInversions.exhaustDispersion?.dispersalRating === "REDUCED" ? "WARNING" : "OK"]
            ])}
          </div>
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerComputed">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Fog Potential</h4>
              {renderDataTypeBadge("COMPUTED", "small")}
            </div>
            {renderDataTable("Fog Formation", ["Parameter", "Value", "Status"], [
              ["Probability", temperatureInversions.fogPotential?.probability !== null && temperatureInversions.fogPotential?.probability !== undefined ? temperatureInversions.fogPotential.probability.toFixed(0) + "%" : "—", (temperatureInversions.fogPotential?.probability ?? 0) > 50 ? "WARNING" : (temperatureInversions.fogPotential?.probability ?? 0) > 25 ? "ADVISORY" : "OK"],
              ["Fog Type", temperatureInversions.fogPotential?.type?.replace(/_/g, " ") || "—", temperatureInversions.fogPotential?.type ? "POSSIBLE" : "UNLIKELY"],
              ["Formation Conditions", temperatureInversions.fogPotential?.formationConditions || "—", temperatureInversions.fogPotential?.formationConditions === "FAVORABLE" ? "WARNING" : "OK"]
            ])}
          </div>
        </div>
        {temperatureInversions.detected?.length > 0 && (
          <div className="dinosatEarthCondOverviewGrid">
            <div className="dinosatEarthCondPanelSingle dinosatEarthCondFullWidth dinosatEarthCondChartContainerLive">
              <div className="dinosatEarthCondChartHeaderWithBadge">
                <h4>Detected Inversions ({temperatureInversions.detected.length})</h4>
                {renderDataTypeBadge("LIVE", "small")}
              </div>
              <div className="dinosatEarthCondTableCard">
                <table className="dinosatEarthCondDataTable">
                  <thead>
                    <tr>
                      <th>Base Alt (m)</th>
                      <th>Top Alt (m)</th>
                      <th>Base P (hPa)</th>
                      <th>Top P (hPa)</th>
                      <th>Base T (°C)</th>
                      <th>Top T (°C)</th>
                      <th>Strength</th>
                      <th>Thickness (m)</th>
                      <th>ΔT (°C)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {temperatureInversions.detected.map((inv, i) => {
                      const strengthVal = inv?.strength ?? 0;
                      const strengthColor = strengthVal > 2.0 ? "#7c3aed" : strengthVal > 1.0 ? "#8b5cf6" : "#6366f1";
                      return (
                        <tr key={i} style={{ backgroundColor: strengthVal > 2.0 ? "rgba(124, 58, 237, 0.1)" : "transparent" }}>
                          <td>{inv?.baseHeight !== null && inv?.baseHeight !== undefined ? inv.baseHeight.toFixed(0) : "—"}</td>
                          <td>{inv?.topHeight !== null && inv?.topHeight !== undefined ? inv.topHeight.toFixed(0) : "—"}</td>
                          <td>{inv?.basePressure || "—"}</td>
                          <td>{inv?.topPressure || "—"}</td>
                          <td>{inv?.baseTemperature !== null && inv?.baseTemperature !== undefined ? inv.baseTemperature.toFixed(1) : "—"}</td>
                          <td>{inv?.topTemperature !== null && inv?.topTemperature !== undefined ? inv.topTemperature.toFixed(1) : "—"}</td>
                          <td style={{ color: strengthColor, fontWeight: "bold" }}>{inv?.strength !== null && inv?.strength !== undefined ? inv.strength.toFixed(3) : "—"}</td>
                          <td>{inv?.thickness !== null && inv?.thickness !== undefined ? inv.thickness.toFixed(0) : "—"}</td>
                          <td>{inv?.temperatureDelta !== null && inv?.temperatureDelta !== undefined ? inv.temperatureDelta.toFixed(2) : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        {temperatureInversions.lowLevelInversions?.length > 0 && (
          <div className="dinosatEarthCondOverviewGrid">
            <div className="dinosatEarthCondPanelSingle dinosatEarthCondFullWidth dinosatEarthCondChartContainerLive">
              <div className="dinosatEarthCondChartHeaderWithBadge">
                <h4>Low-Level Inversions (below 5000m) - {temperatureInversions.lowLevelInversions.length}</h4>
                {renderDataTypeBadge("LIVE", "small")}
              </div>
              <div className="dinosatEarthCondTableCard">
                <table className="dinosatEarthCondDataTable">
                  <thead>
                    <tr>
                      <th>Base Alt (m)</th>
                      <th>Top Alt (m)</th>
                      <th>Strength (C/100m)</th>
                      <th>Thickness (m)</th>
                      <th>ΔT (°C)</th>
                      <th>Impact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {temperatureInversions.lowLevelInversions.map((inv, i) => {
                      const baseH = inv?.baseHeight ?? 0;
                      const impact = baseH < 1000 ? "HIGH" : baseH < 2000 ? "MODERATE" : "LOW";
                      const impactColor = impact === "HIGH" ? "#7c3aed" : impact === "MODERATE" ? "#8b5cf6" : "#22c55e";
                      return (
                        <tr key={i}>
                          <td>{inv?.baseHeight !== null && inv?.baseHeight !== undefined ? inv.baseHeight.toFixed(0) : "—"}</td>
                          <td>{inv?.topHeight !== null && inv?.topHeight !== undefined ? inv.topHeight.toFixed(0) : "—"}</td>
                          <td style={{ color: (inv?.strength ?? 0) > 2.0 ? "#7c3aed" : "#6366f1", fontWeight: "bold" }}>{inv?.strength !== null && inv?.strength !== undefined ? inv.strength.toFixed(3) : "—"}</td>
                          <td>{inv?.thickness !== null && inv?.thickness !== undefined ? inv.thickness.toFixed(0) : "—"}</td>
                          <td>{inv?.temperatureDelta !== null && inv?.temperatureDelta !== undefined ? inv.temperatureDelta.toFixed(2) : "—"}</td>
                          <td style={{ color: impactColor }}>{impact}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        <div className="dinosatEarthCondSectionDivider">
          <div className="dinosatEarthCondSectionDividerLine" />
          <span className="dinosatEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faCloud} />
            Cloud Analysis & Visibility
          </span>
          <div className="dinosatEarthCondSectionDividerLine" />
        </div>
        <div className="dinosatEarthCondOverviewGrid">
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerLive">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Current Cloud Conditions</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderDataTable("Cloud Cover", ["Parameter", "Value", "Unit", "Status"], [
              ["Total Cover", cloudAnalysis.current?.totalCover !== null && cloudAnalysis.current?.totalCover !== undefined ? cloudAnalysis.current.totalCover : "—", "%", cloudAnalysis.current?.totalCover !== null && cloudAnalysis.current?.totalCover !== undefined ? (cloudAnalysis.current.totalCover <= 25 ? "OPTIMAL" : cloudAnalysis.current.totalCover <= 50 ? "NOMINAL" : cloudAnalysis.current.totalCover <= 75 ? "MARGINAL" : "WARNING") : "NO DATA"],
              ["Low Cloud", cloudAnalysis.current?.lowCover !== null && cloudAnalysis.current?.lowCover !== undefined ? cloudAnalysis.current.lowCover : "—", "%", cloudAnalysis.current?.lowCover !== null && cloudAnalysis.current?.lowCover !== undefined ? (cloudAnalysis.current.lowCover <= 20 ? "OPTIMAL" : cloudAnalysis.current.lowCover <= 40 ? "NOMINAL" : cloudAnalysis.current.lowCover <= 60 ? "MARGINAL" : "WARNING") : "NO DATA"],
              ["Mid Cloud", cloudAnalysis.current?.midCover !== null && cloudAnalysis.current?.midCover !== undefined ? cloudAnalysis.current.midCover : "—", "%", cloudAnalysis.current?.midCover !== null && cloudAnalysis.current?.midCover !== undefined ? "OK" : "NO DATA"],
              ["High Cloud", cloudAnalysis.current?.highCover !== null && cloudAnalysis.current?.highCover !== undefined ? cloudAnalysis.current.highCover : "—", "%", cloudAnalysis.current?.highCover !== null && cloudAnalysis.current?.highCover !== undefined ? "OK" : "NO DATA"],
              ["Cloud Base", cloudAnalysis.current?.cloudBaseHeight !== null && cloudAnalysis.current?.cloudBaseHeight !== undefined ? cloudAnalysis.current.cloudBaseHeight.toFixed(0) : "—", "m", cloudAnalysis.current?.cloudBaseHeight !== null && cloudAnalysis.current?.cloudBaseHeight !== undefined ? (cloudAnalysis.current.cloudBaseHeight >= 1500 ? "OPTIMAL" : cloudAnalysis.current.cloudBaseHeight >= 1000 ? "NOMINAL" : "WARNING") : "NO DATA"],
              ["Weather Code", cloudAnalysis.current?.weatherCode !== null && cloudAnalysis.current?.weatherCode !== undefined ? cloudAnalysis.current.weatherCode : "—", "", cloudAnalysis.current?.weatherCode !== null && cloudAnalysis.current?.weatherCode !== undefined ? (cloudAnalysis.current.weatherCode < 50 ? "OK" : cloudAnalysis.current.weatherCode < 80 ? "PRECIP" : "STORM") : "NO DATA"]
            ])}
          </div>
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerLive">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Cumulus & Visibility</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderDataTable("Cumulus Analysis", ["Parameter", "Value", "Status"], [
              ["Cumulus Penetration Alt", cloudAnalysis.cumulusPenetration?.altitude !== null && cloudAnalysis.cumulusPenetration?.altitude !== undefined ? `${cloudAnalysis.cumulusPenetration.altitude} m` : "—", cloudAnalysis.cumulusPenetration?.risk === "HIGH" ? "CRITICAL" : cloudAnalysis.cumulusPenetration?.risk === "MODERATE" ? "WARNING" : "OK"],
              ["Cumulus Risk", cloudAnalysis.cumulusPenetration?.risk || "—", cloudAnalysis.cumulusPenetration?.risk === "HIGH" ? "CRITICAL" : cloudAnalysis.cumulusPenetration?.risk === "MODERATE" ? "WARNING" : "OK"],
              ["Optical Visibility Impact", cloudAnalysis.opticalVisibility?.impacted ? "YES" : "NO", cloudAnalysis.opticalVisibility?.impacted ? "DEGRADED" : "CLEAR"],
              ["Visibility Degradation", cloudAnalysis.opticalVisibility?.degradation || "—", cloudAnalysis.opticalVisibility?.degradation === "SEVERE" ? "CRITICAL" : cloudAnalysis.opticalVisibility?.degradation === "MODERATE" ? "WARNING" : "OK"]
            ])}
          </div>
        </div>
        {cloudAnalysisLayers.length > 0 && (
          <div className="dinosatEarthCondOverviewGrid">
            <div className="dinosatEarthCondPanelSingle dinosatEarthCondFullWidth dinosatEarthCondChartContainerForecast">
              <div className="dinosatEarthCondChartHeaderWithBadge">
                <h4>24-Hour Cloud Layer Forecast ({cloudAnalysisLayers.length} hours)</h4>
                {renderDataTypeBadge("FORECAST", "small")}
              </div>
              <div className="dinosatEarthCondTableCard dinosatEarthCondTableCardForecast">
                <table className="dinosatEarthCondDataTable">
                  <thead>
                    <tr>
                      <th>Hour</th>
                      <th>Total %</th>
                      <th>Low %</th>
                      <th>Mid %</th>
                      <th>High %</th>
                      <th>Precip mm</th>
                      <th>Precip Prob %</th>
                      <th>Weather</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cloudAnalysisLayers.slice(0, 24).map((layer, i) => {
                      const wCode = layer?.weatherCode ?? 0;
                      const weatherDesc = wCode >= 95 ? "THUNDERSTORM" : wCode >= 80 ? "SHOWERS" : wCode >= 70 ? "SNOW" : wCode >= 61 ? "RAIN" : wCode >= 51 ? "DRIZZLE" : wCode >= 45 ? "FOG" : "CLEAR";
                      const rowColor = wCode >= 95 ? "rgba(124, 58, 237, 0.15)" : wCode >= 61 ? "rgba(99, 102, 241, 0.1)" : "transparent";
                      return (
                        <tr key={i} style={{ backgroundColor: rowColor }}>
                          <td>T+{layer?.hour ?? i}h</td>
                          <td>{layer?.totalCover !== null && layer?.totalCover !== undefined ? layer.totalCover : "—"}</td>
                          <td>{layer?.lowCover !== null && layer?.lowCover !== undefined ? layer.lowCover : "—"}</td>
                          <td>{layer?.midCover !== null && layer?.midCover !== undefined ? layer.midCover : "—"}</td>
                          <td>{layer?.highCover !== null && layer?.highCover !== undefined ? layer.highCover : "—"}</td>
                          <td>{layer?.precipitation !== null && layer?.precipitation !== undefined ? layer.precipitation.toFixed(1) : "—"}</td>
                          <td>{layer?.precipProbability !== null && layer?.precipProbability !== undefined ? layer.precipProbability : "—"}</td>
                          <td style={{ color: wCode >= 95 ? "#7c3aed" : wCode >= 61 ? "#8b5cf6" : "#22c55e" }}>{weatherDesc}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        <div className="dinosatEarthCondSectionDivider">
          <div className="dinosatEarthCondSectionDividerLine" />
          <span className="dinosatEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faTint} />
            Humidity & Moisture Analysis
          </span>
          <div className="dinosatEarthCondSectionDividerLine" />
        </div>
        <div className="dinosatEarthCondOverviewGrid">
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerLive">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Current Humidity</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderDataTable("Surface & Levels", ["Level", "RH %", "Status"], [
              ["Surface", humidityProfile.current?.surface !== null && humidityProfile.current?.surface !== undefined ? humidityProfile.current.surface.toFixed(0) : "—", humidityProfile.current?.surface !== null && humidityProfile.current?.surface !== undefined ? (humidityProfile.current.surface >= 20 && humidityProfile.current.surface <= 80 ? "NOMINAL" : "MARGINAL") : "NO DATA"],
              ["850 hPa", humidityProfile.current?.levels?.["850hPa"] !== undefined ? humidityProfile.current.levels["850hPa"].toFixed(0) : "—", "OK"],
              ["700 hPa", humidityProfile.current?.levels?.["700hPa"] !== undefined ? humidityProfile.current.levels["700hPa"].toFixed(0) : "—", "OK"],
              ["500 hPa", humidityProfile.current?.levels?.["500hPa"] !== undefined ? humidityProfile.current.levels["500hPa"].toFixed(0) : "—", "OK"],
              ["300 hPa", humidityProfile.current?.levels?.["300hPa"] !== undefined ? humidityProfile.current.levels["300hPa"].toFixed(0) : "—", "OK"],
              ["200 hPa", humidityProfile.current?.levels?.["200hPa"] !== undefined ? humidityProfile.current.levels["200hPa"].toFixed(0) : "—", "OK"]
            ])}
          </div>
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerLive">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Precipitation & Moisture</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderDataTable("Precipitation", ["Parameter", "Value", "Unit", "Status"], [
              ["Precip Rate", cloudAnalysis.current?.precipitationRate !== null && cloudAnalysis.current?.precipitationRate !== undefined ? cloudAnalysis.current.precipitationRate.toFixed(2) : "—", "mm/h", cloudAnalysis.current?.precipitationRate !== null && cloudAnalysis.current?.precipitationRate !== undefined ? (cloudAnalysis.current.precipitationRate <= 0.5 ? "OPTIMAL" : cloudAnalysis.current.precipitationRate <= 2 ? "NOMINAL" : cloudAnalysis.current.precipitationRate <= 5 ? "WARNING" : "CRITICAL") : "NO DATA"],
              ["Precipitable Water", cloudAnalysis.current?.precipitableWater !== null && cloudAnalysis.current?.precipitableWater !== undefined ? cloudAnalysis.current.precipitableWater.toFixed(1) : "—", "mm", cloudAnalysis.current?.precipitableWater !== null && cloudAnalysis.current?.precipitableWater !== undefined ? (cloudAnalysis.current.precipitableWater <= 20 ? "OPTIMAL" : cloudAnalysis.current.precipitableWater <= 35 ? "NOMINAL" : "MARGINAL") : "NO DATA"],
              ["Precip Clouds", cloudAnalysis.precipitatingClouds?.detected ? "YES" : "NO", "", cloudAnalysis.precipitatingClouds?.detected ? "ACTIVE" : "CLEAR"],
              ["Precip Type", cloudAnalysis.precipitatingClouds?.type || "—", "", cloudAnalysis.precipitatingClouds?.type ? "DETECTED" : "NONE"],
              ["Precip Intensity", cloudAnalysis.precipitatingClouds?.intensity || "—", "", cloudAnalysis.precipitatingClouds?.intensity === "SEVERE" ? "CRITICAL" : cloudAnalysis.precipitatingClouds?.intensity === "HEAVY" ? "WARNING" : "OK"]
            ])}
          </div>
        </div>
        <div className="dinosatEarthCondOverviewGrid">
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerComputed">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Frost Formation Risk</h4>
              {renderDataTypeBadge("COMPUTED", "small")}
            </div>
            {renderDataTable("Frost Analysis", ["Parameter", "Value", "Status"], [
              ["Risk Index", humidityProfile.frostFormation?.riskIndex !== null && humidityProfile.frostFormation?.riskIndex !== undefined ? humidityProfile.frostFormation.riskIndex.toFixed(2) : "—", humidityProfile.frostFormation?.risk === "HIGH" ? "CRITICAL" : humidityProfile.frostFormation?.risk === "MODERATE" ? "WARNING" : "OK"],
              ["Risk Level", humidityProfile.frostFormation?.risk || "—", humidityProfile.frostFormation?.risk === "HIGH" ? "CRITICAL" : humidityProfile.frostFormation?.risk === "MODERATE" ? "WARNING" : "OK"],
              ["Critical Altitudes", humidityProfile.frostFormation?.criticalAltitudes?.length ?? 0, (humidityProfile.frostFormation?.criticalAltitudes?.length ?? 0) > 0 ? "WARNING" : "CLEAR"]
            ])}
            {humidityProfile.frostFormation?.criticalAltitudes?.length > 0 && (
              <div className="dinosatEarthCondTableCard">
                <table className="dinosatEarthCondDataTable">
                  <thead>
                    <tr><th>Alt (m)</th><th>Pressure</th><th>RH %</th><th>Temp °C</th></tr>
                  </thead>
                  <tbody>
                    {humidityProfile.frostFormation.criticalAltitudes.slice(0, 5).map((alt, i) => (
                      <tr key={i}>
                        <td>{alt?.altitude !== null && alt?.altitude !== undefined ? alt.altitude.toFixed(0) : "—"}</td>
                        <td>{alt?.pressure || "—"} hPa</td>
                        <td>{alt?.humidity !== null && alt?.humidity !== undefined ? alt.humidity.toFixed(0) : "—"}</td>
                        <td>{alt?.temperature !== null && alt?.temperature !== undefined ? alt.temperature.toFixed(1) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerComputed">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Insulation Performance</h4>
              {renderDataTypeBadge("COMPUTED", "small")}
            </div>
            {renderDataTable("Condensation Risk", ["Parameter", "Value", "Status"], [
              ["Dewpoint Depression", humidityProfile.insulationPerformance?.dewpointDepression !== null && humidityProfile.insulationPerformance?.dewpointDepression !== undefined ? humidityProfile.insulationPerformance.dewpointDepression.toFixed(1) : "—", humidityProfile.insulationPerformance?.dewpointDepression !== null && humidityProfile.insulationPerformance?.dewpointDepression !== undefined ? (humidityProfile.insulationPerformance.dewpointDepression >= 5 ? "OPTIMAL" : humidityProfile.insulationPerformance.dewpointDepression >= 3 ? "NOMINAL" : "WARNING") : "NO DATA"],
              ["Concern Level", humidityProfile.insulationPerformance?.concern || "—", humidityProfile.insulationPerformance?.concern === "HIGH" ? "CRITICAL" : humidityProfile.insulationPerformance?.concern === "MODERATE" ? "WARNING" : "OK"],
              ["Condensation Risk", humidityProfile.insulationPerformance?.condensationRisk || "—", humidityProfile.insulationPerformance?.condensationRisk === "ELEVATED" ? "WARNING" : humidityProfile.insulationPerformance?.condensationRisk === "POSSIBLE" ? "MARGINAL" : "OK"]
            ])}
          </div>
        </div>
        {humidityProfile.layers?.length > 0 && (
          <div className="dinosatEarthCondOverviewGrid">
            <div className="dinosatEarthCondPanelSingle dinosatEarthCondFullWidth dinosatEarthCondChartContainerLive">
              <div className="dinosatEarthCondChartHeaderWithBadge">
                <h4>Full Humidity Profile ({humidityProfile.layers.length} levels)</h4>
                {renderDataTypeBadge("LIVE", "small")}
              </div>
              <div className="dinosatEarthCondTableCard">
                <table className="dinosatEarthCondDataTable">
                  <thead>
                    <tr><th>Altitude (m)</th><th>Pressure (hPa)</th><th>RH %</th><th>Temp °C</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {humidityProfile.layers.map((layer, i) => {
                      const rh = layer?.relativeHumidity ?? 50;
                      const status = rh > 85 ? "HIGH" : rh < 30 ? "LOW" : "NOMINAL";
                      const statusColor = rh > 85 ? "#8b5cf6" : rh < 30 ? "#f59e0b" : "#22c55e";
                      return (
                        <tr key={i}>
                          <td>{layer?.height !== null && layer?.height !== undefined ? layer.height.toFixed(0) : "—"}</td>
                          <td>{layer?.pressure || "—"}</td>
                          <td style={{ color: statusColor }}>{layer?.relativeHumidity !== null && layer?.relativeHumidity !== undefined ? layer.relativeHumidity.toFixed(0) : "—"}</td>
                          <td>{layer?.temperature !== null && layer?.temperature !== undefined ? layer.temperature.toFixed(1) : "—"}</td>
                          <td style={{ color: statusColor }}>{status}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        <div className="dinosatEarthCondSectionDivider">
          <div className="dinosatEarthCondSectionDividerLine" />
          <span className="dinosatEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faBolt} />
            Convective Analysis & Electrical Hazards
          </span>
          <div className="dinosatEarthCondSectionDividerLine" />
        </div>
        <div className="dinosatEarthCondOverviewGrid">
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerLive">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Convective Indices</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderDataTable("Stability", ["Parameter", "Value", "Unit", "Status"], [
              ["CAPE", convectiveAnalysis.cape !== null && convectiveAnalysis.cape !== undefined ? convectiveAnalysis.cape.toFixed(0) : "—", "J/kg", convectiveAnalysis.cape !== null && convectiveAnalysis.cape !== undefined ? (convectiveAnalysis.cape < 500 ? "OPTIMAL" : convectiveAnalysis.cape < 1000 ? "NOMINAL" : convectiveAnalysis.cape < 2500 ? "WARNING" : "CRITICAL") : "NO DATA"],
              ["Lifted Index", convectiveAnalysis.liftedIndex !== null && convectiveAnalysis.liftedIndex !== undefined ? convectiveAnalysis.liftedIndex.toFixed(1) : "—", "°C", convectiveAnalysis.liftedIndex !== null && convectiveAnalysis.liftedIndex !== undefined ? (convectiveAnalysis.liftedIndex >= 2 ? "OPTIMAL" : convectiveAnalysis.liftedIndex >= 0 ? "NOMINAL" : convectiveAnalysis.liftedIndex >= -2 ? "MARGINAL" : "WARNING") : "NO DATA"],
              ["Convective Risk", convectiveAnalysis.convectiveRisk || "—", "", convectiveAnalysis.convectiveRisk === "HIGH" ? "CRITICAL" : convectiveAnalysis.convectiveRisk === "ELEVATED" ? "WARNING" : convectiveAnalysis.convectiveRisk === "MODERATE" ? "MARGINAL" : "OK"],
              ["Thunderstorm Potential", convectiveAnalysis.thunderstormPotential?.replace(/_/g, " ") || "—", "", convectiveAnalysis.thunderstormPotential === "WIDESPREAD_SEVERE" ? "CRITICAL" : convectiveAnalysis.thunderstormPotential === "SCATTERED_LIKELY" ? "WARNING" : "OK"]
            ])}
          </div>
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerComputed">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Convective Risk Gauge</h4>
              {renderDataTypeBadge("COMPUTED", "small")}
            </div>
            {convectiveAnalysis.cape !== null && convectiveAnalysis.cape !== undefined ? (
              <div className="dinosatEarthCondRiskGauge">
                <div className="dinosatEarthCondGaugeValue" style={{ color: convectiveAnalysis.cape >= 2500 ? "#7c3aed" : convectiveAnalysis.cape >= 1000 ? "#8b5cf6" : convectiveAnalysis.cape >= 500 ? "#f59e0b" : "#22c55e" }}>
                  {convectiveAnalysis.cape.toFixed(0)}
                </div>
                <div className="dinosatEarthCondGaugeLabel">CAPE (J/kg)</div>
                <div className="dinosatEarthCondGaugeBar">
                  <div className="dinosatEarthCondGaugeFill" style={{
                    width: `${Math.min(100, (convectiveAnalysis.cape / 4000) * 100)}%`,
                    backgroundColor: convectiveAnalysis.cape >= 2500 ? "#7c3aed" : convectiveAnalysis.cape >= 1000 ? "#8b5cf6" : convectiveAnalysis.cape >= 500 ? "#f59e0b" : "#22c55e"
                  }} />
                </div>
                <div className="dinosatEarthCondDataTrust">
                  Risk: {convectiveAnalysis.convectiveRisk || "—"} | Thunderstorm: {convectiveAnalysis.thunderstormPotential?.replace(/_/g, " ") || "—"}
                </div>
              </div>
            ) : (
              <div className="dinosatEarthCondNoChartData">CAPE data unavailable.</div>
            )}
          </div>
        </div>
        <div className="dinosatEarthCondOverviewGrid">
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerComputed">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Static Electricity Risk</h4>
              {renderDataTypeBadge("COMPUTED", "small")}
            </div>
            {renderDataTable("Triboelectric Analysis", ["Parameter", "Value", "Status"], [
              ["Risk Index", humidityProfile.staticElectricity?.riskIndex !== null && humidityProfile.staticElectricity?.riskIndex !== undefined ? humidityProfile.staticElectricity.riskIndex.toFixed(2) : "—", humidityProfile.staticElectricity?.risk === "ELEVATED" ? "WARNING" : humidityProfile.staticElectricity?.risk === "MODERATE" ? "MARGINAL" : "OK"],
              ["Risk Level", humidityProfile.staticElectricity?.risk || "—", humidityProfile.staticElectricity?.risk === "ELEVATED" ? "WARNING" : "OK"],
              ["Concern Layers", humidityProfile.staticElectricity?.concernLayers?.length ?? 0, (humidityProfile.staticElectricity?.concernLayers?.length ?? 0) > 0 ? "ADVISORY" : "CLEAR"]
            ])}
          </div>

          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerComputed">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Static Electricity Risk</h4>
              {renderDataTypeBadge("COMPUTED", "small")}
            </div>
            {humidityProfile.staticElectricity?.concernLayers?.length > 0 && (
              <div className="dinosatEarthCondTableCard">
                <table className="dinosatEarthCondDataTable">
                  <thead>
                    <tr><th>Alt (m)</th><th>Pressure</th><th>RH %</th></tr>
                  </thead>
                  <tbody>
                    {humidityProfile.staticElectricity.concernLayers.slice(0, 5).map((layer, i) => (
                      <tr key={i}>
                        <td>{layer?.altitude !== null && layer?.altitude !== undefined ? layer.altitude.toFixed(0) : "—"}</td>
                        <td>{layer?.pressure || "—"} hPa</td>
                        <td style={{ color: "#f59e0b" }}>{layer?.humidity !== null && layer?.humidity !== undefined ? layer.humidity.toFixed(0) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
        {(capeChart || liftedIndexChart) && (
          <div className="dinosatEarthCondOverviewGrid">
            {capeChart && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerForecast">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>CAPE Forecast (24h)</h4>
                  {renderDataTypeBadge("FORECAST", "small")}
                </div>
                {renderDynamicChart(capeChart, "dinosatEarthCondChart")}
                <div className="dinosatEarthCondChartDescription">
                  <div className="dinosatEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Forecast Hour (T+0 to T+24h)</span>
                    <span><strong>Y-Axis:</strong> CAPE (J/kg)</span>
                  </div>
                  <p className="dinosatEarthCondChartDescriptionText">
                    This chart displays the 24-hour forecast of Convective Available Potential Energy (CAPE). CAPE quantifies the amount of energy available for convection and is a primary indicator of thunderstorm potential. Values below 500 J/kg indicate stable conditions, 500-1000 J/kg suggest marginal instability, 1000-2500 J/kg indicate moderate instability with possible thunderstorms, and values above 2500 J/kg signal high instability with potential for severe convective weather including lightning hazards.
                  </p>
                </div>
              </div>
            )}
            {liftedIndexChart && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerForecast">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Lifted Index Forecast (24h)</h4>
                  {renderDataTypeBadge("FORECAST", "small")}
                </div>
                {renderDynamicChart(liftedIndexChart, "dinosatEarthCondChart")}
                <div className="dinosatEarthCondChartDescription">
                  <div className="dinosatEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Forecast Hour (T+0 to T+24h)</span>
                    <span><strong>Y-Axis:</strong> Lifted Index (°C)</span>
                  </div>
                  <p className="dinosatEarthCondChartDescriptionText">
                    This chart shows the 24-hour forecast of Lifted Index (LI), a measure of atmospheric stability. The Lifted Index compares the temperature of a lifted air parcel to the environmental temperature at 500 hPa. Positive values indicate stable conditions, values near zero suggest marginal stability, and negative values indicate instability. Values below -2°C suggest conditions favorable for thunderstorm development, while values below -6°C indicate severe thunderstorm potential with significant lightning risk.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="dinosatEarthCondSectionDivider">
          <div className="dinosatEarthCondSectionDividerLine" />
          <span className="dinosatEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faSatellite} />
            Cosmic Ray Monitoring
          </span>
          <div className="dinosatEarthCondSectionDividerLine" />
        </div>
        <div className="dinosatEarthCondOverviewGrid">
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerLive">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Neutron Monitor</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderDataTable("Cosmic Ray Analysis", ["Parameter", "Value", "Status"], [
              ["Station", cosmicRayAnalysis.station || "—", cosmicRayAnalysis.status === "AVAILABLE" ? "ACTIVE" : "UNAVAILABLE"],
              ["Neutron Counts", cosmicRayAnalysis.neutronCounts !== null && cosmicRayAnalysis.neutronCounts !== undefined ? cosmicRayAnalysis.neutronCounts.toFixed(0) + " /min" : "—", cosmicRayAnalysis.status === "AVAILABLE" ? "OK" : "NO DATA"],
              ["Deviation", cosmicRayAnalysis.percentDeviation !== null && cosmicRayAnalysis.percentDeviation !== undefined ? (cosmicRayAnalysis.percentDeviation > 0 ? "+" : "") + cosmicRayAnalysis.percentDeviation.toFixed(2) + "%" : "—", cosmicRayAnalysis.percentDeviation !== null && cosmicRayAnalysis.percentDeviation !== undefined ? (Math.abs(cosmicRayAnalysis.percentDeviation) > 3 ? "ADVISORY" : "NOMINAL") : "NO DATA"],
              ["Data Status", cosmicRayAnalysis.status || "NO_DATA", cosmicRayAnalysis.status === "AVAILABLE" ? "OK" : "DEGRADED"]
            ])}
          </div>
          {cosmicRayAnalysis.status === "AVAILABLE" && cosmicRayAnalysis.percentDeviation !== null && cosmicRayAnalysis.percentDeviation !== undefined && (
            <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerComputed">
              <div className="dinosatEarthCondChartHeaderWithBadge">
                <h4>Cosmic Ray Flux Gauge</h4>
                {renderDataTypeBadge("COMPUTED", "small")}
              </div>
              <div className="dinosatEarthCondRiskGauge">
                <div className="dinosatEarthCondGaugeValue" style={{ color: Math.abs(cosmicRayAnalysis.percentDeviation) > 3 ? "#8b5cf6" : "#22c55e" }}>
                  {cosmicRayAnalysis.percentDeviation > 0 ? "+" : ""}{cosmicRayAnalysis.percentDeviation.toFixed(2)}%
                </div>
                <div className="dinosatEarthCondGaugeLabel">Intra-Hour Deviation ({cosmicRayAnalysis.station})</div>
                <div className="dinosatEarthCondGaugeBar">
                  <div className="dinosatEarthCondGaugeFill" style={{
                    width: `${Math.min(100, Math.abs(cosmicRayAnalysis.percentDeviation) * 10)}%`,
                    backgroundColor: Math.abs(cosmicRayAnalysis.percentDeviation) > 3 ? "#8b5cf6" : "#22c55e"
                  }} />
                </div>
                <div className="dinosatEarthCondDataTrust">
                  Count Rate: {cosmicRayAnalysis.neutronCounts !== null && cosmicRayAnalysis.neutronCounts !== undefined ? cosmicRayAnalysis.neutronCounts.toFixed(0) : "—"} counts/min
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="dinosatEarthCondSectionDivider">
          <div className="dinosatEarthCondSectionDividerLine" />
          <span className="dinosatEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faHistory} style={{ color: DATA_TYPE.HISTORICAL.color }} />
            Historical Wind & Temperature (30-Day)
          </span>
          <div className="dinosatEarthCondSectionDividerLine" />
        </div>
        {atmoWind10Chart && (
          <div className="dinosatEarthCondOverviewGrid">
            <div className="dinosatEarthCondPanelSingle dinosatEarthCondChartContainerHistorical">
              <div className="dinosatEarthCondChartHeaderWithBadge">
                <h4>Historical Surface Wind (10m)</h4>
                {renderDataTypeBadge("HISTORICAL", "small")}
              </div>
              {renderDynamicChart(atmoWind10Chart, "dinosatEarthCondChart")}
              <div className="dinosatEarthCondChartDescription">
                <div className="dinosatEarthCondChartAxesInfo">
                  <span><strong>X-Axis:</strong> Time (30-day observation period)</span>
                  <span><strong>Y-Axis:</strong> Wind Speed at 10m (m/s)</span>
                </div>
                <p className="dinosatEarthCondChartDescriptionText">
                  This chart displays surface-level wind speed measurements at 10 meters above ground level over the past 30 days. The 10-meter wind is the standard meteorological reference height and directly impacts ground operations including pad access, crane operations, and personnel safety. Historical patterns help identify typical diurnal cycles, seasonal trends, and the frequency of high-wind events that may constrain launch operations.
                </p>
              </div>
              {historicalAtmo?.statistics?.wind10m && (
                <div className="dinosatEarthCondStatsSummary">
                  <span>min: {historicalAtmo.statistics.wind10m.min !== null && historicalAtmo.statistics.wind10m.min !== undefined ? historicalAtmo.statistics.wind10m.min.toFixed(1) : "—"} m/s</span>
                  <span>max: {historicalAtmo.statistics.wind10m.max !== null && historicalAtmo.statistics.wind10m.max !== undefined ? historicalAtmo.statistics.wind10m.max.toFixed(1) : "—"} m/s</span>
                  <span>avg: {historicalAtmo.statistics.wind10m.mean !== null && historicalAtmo.statistics.wind10m.mean !== undefined ? historicalAtmo.statistics.wind10m.mean.toFixed(1) : "—"} m/s</span>
                  <span>std: {historicalAtmo.statistics.wind10m.stdDev !== null && historicalAtmo.statistics.wind10m.stdDev !== undefined ? historicalAtmo.statistics.wind10m.stdDev.toFixed(1) : "—"} m/s</span>
                </div>
              )}
            </div>
          </div>
        )}
        {atmoWind100Chart && (
          <div className="dinosatEarthCondOverviewGrid">
            <div className="dinosatEarthCondPanelSingle dinosatEarthCondChartContainerHistorical">
              <div className="dinosatEarthCondChartHeaderWithBadge">
                <h4>Historical Upper Wind (100m)</h4>
                {renderDataTypeBadge("HISTORICAL", "small")}
              </div>
              {renderDynamicChart(atmoWind100Chart, "dinosatEarthCondChart")}
              <div className="dinosatEarthCondChartDescription">
                <div className="dinosatEarthCondChartAxesInfo">
                  <span><strong>X-Axis:</strong> Time (30-day observation period)</span>
                  <span><strong>Y-Axis:</strong> Wind Speed at 100m (m/s)</span>
                </div>
                <p className="dinosatEarthCondChartDescriptionText">
                  This chart shows wind speed measurements at 100 meters altitude over the past 30 days. The 100-meter level represents conditions in the boundary layer that the vehicle will encounter immediately after liftoff. These winds are typically stronger than surface winds due to reduced friction and are critical for assessing initial ascent loads, tower clearance dynamics, and early flight control requirements during the first seconds after launch.
                </p>
              </div>
              {historicalAtmo?.statistics?.wind100m && (
                <div className="dinosatEarthCondStatsSummary">
                  <span>min: {historicalAtmo.statistics.wind100m.min !== null && historicalAtmo.statistics.wind100m.min !== undefined ? historicalAtmo.statistics.wind100m.min.toFixed(1) : "—"} m/s</span>
                  <span>max: {historicalAtmo.statistics.wind100m.max !== null && historicalAtmo.statistics.wind100m.max !== undefined ? historicalAtmo.statistics.wind100m.max.toFixed(1) : "—"} m/s</span>
                  <span>avg: {historicalAtmo.statistics.wind100m.mean !== null && historicalAtmo.statistics.wind100m.mean !== undefined ? historicalAtmo.statistics.wind100m.mean.toFixed(1) : "—"} m/s</span>
                </div>
              )}
            </div>
          </div>
        )}
        {atmoGustChart && (
          <div className="dinosatEarthCondOverviewGrid">
            <div className="dinosatEarthCondPanelSingle dinosatEarthCondChartContainerHistorical">
              <div className="dinosatEarthCondChartHeaderWithBadge">
                <h4>Historical Wind Gusts</h4>
                {renderDataTypeBadge("HISTORICAL", "small")}
              </div>
              {renderDynamicChart(atmoGustChart, "dinosatEarthCondChart")}
              <div className="dinosatEarthCondChartDescription">
                <div className="dinosatEarthCondChartAxesInfo">
                  <span><strong>X-Axis:</strong> Time (30-day observation period)</span>
                  <span><strong>Y-Axis:</strong> Wind Gust Speed (m/s)</span>
                </div>
                <p className="dinosatEarthCondChartDescriptionText">
                  This chart displays peak wind gust measurements over the past 30 days. Wind gusts represent sudden, brief increases in wind speed that impose dynamic loads on the vehicle structure during ground operations and early flight. Gust factors (ratio of gust speed to sustained wind) are essential for structural load calculations and determining safe conditions for pad operations, fueling, and launch commit decisions.
                </p>
              </div>
              {historicalAtmo?.statistics?.gustEvents && (
                <div className="dinosatEarthCondStatsSummary">
                  <span>severe gusts (&gt;15 m/s): {historicalAtmo.statistics.gustEvents.count ?? 0}</span>
                  <span>freq: {historicalAtmo.statistics.gustEvents.percentage !== null && historicalAtmo.statistics.gustEvents.percentage !== undefined ? historicalAtmo.statistics.gustEvents.percentage.toFixed(1) : "—"}%</span>
                  <span>max: {historicalAtmo.statistics.gustEvents.maxGust !== null && historicalAtmo.statistics.gustEvents.maxGust !== undefined ? historicalAtmo.statistics.gustEvents.maxGust.toFixed(1) : "—"} m/s</span>
                </div>
              )}
            </div>
          </div>
        )}
        {atmoTempChart && (
          <div className="dinosatEarthCondOverviewGrid">
            <div className="dinosatEarthCondPanelSingle dinosatEarthCondChartContainerHistorical">
              <div className="dinosatEarthCondChartHeaderWithBadge">
                <h4>Historical Surface Temperature</h4>
                {renderDataTypeBadge("HISTORICAL", "small")}
              </div>
              {renderDynamicChart(atmoTempChart, "dinosatEarthCondChart")}
              <div className="dinosatEarthCondChartDescription">
                <div className="dinosatEarthCondChartAxesInfo">
                  <span><strong>X-Axis:</strong> Time (30-day observation period)</span>
                  <span><strong>Y-Axis:</strong> Surface Temperature (°C)</span>
                </div>
                <p className="dinosatEarthCondChartDescriptionText">
                  This chart tracks surface air temperature over the past 30 days. Temperature directly affects atmospheric density calculations used in trajectory modeling and Max Q predictions. It also impacts propellant density for loading calculations, thermal protection system requirements, and ground support equipment operation. Extreme temperatures may trigger additional pre-launch procedures or constraint violations.
                </p>
              </div>
              {historicalAtmo?.statistics?.temperature && (
                <div className="dinosatEarthCondStatsSummary">
                  <span>min: {historicalAtmo.statistics.temperature.min !== null && historicalAtmo.statistics.temperature.min !== undefined ? historicalAtmo.statistics.temperature.min.toFixed(1) : "—"} °C</span>
                  <span>max: {historicalAtmo.statistics.temperature.max !== null && historicalAtmo.statistics.temperature.max !== undefined ? historicalAtmo.statistics.temperature.max.toFixed(1) : "—"} °C</span>
                  <span>avg: {historicalAtmo.statistics.temperature.mean !== null && historicalAtmo.statistics.temperature.mean !== undefined ? historicalAtmo.statistics.temperature.mean.toFixed(1) : "—"} °C</span>
                </div>
              )}
            </div>
          </div>
        )}
        {historicalAtmo?.statistics?.highWindFrequency && (
          <div className="dinosatEarthCondOverviewGrid">
            <div className="dinosatEarthCondPanelSingle dinosatEarthCondChartContainerHistorical">
              <div className="dinosatEarthCondChartHeaderWithBadge">
                <h4>High Wind Activity</h4>
                {renderDataTypeBadge("HISTORICAL", "small")}
              </div>
              {renderDataTable("Wind Stats (100m)", ["Parameter", "Value", "Unit"], [
                ["High Wind Events (>20 m/s)", historicalAtmo.statistics.highWindFrequency.events ?? 0, "count"],
                ["Frequency", `${historicalAtmo.statistics.highWindFrequency.percentage !== null && historicalAtmo.statistics.highWindFrequency.percentage !== undefined ? historicalAtmo.statistics.highWindFrequency.percentage.toFixed(1) : "—"}%`, "of time"],
                ["Max Speed", `${historicalAtmo.statistics.highWindFrequency.maxSpeed !== null && historicalAtmo.statistics.highWindFrequency.maxSpeed !== undefined ? historicalAtmo.statistics.highWindFrequency.maxSpeed.toFixed(1) : "—"}`, "m/s"]
              ])}
            </div>
          </div>
        )}
        <div className="dinosatEarthCondSectionDivider">
          <div className="dinosatEarthCondSectionDividerLine" />
          <span className="dinosatEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faCloud} style={{ color: DATA_TYPE.HISTORICAL.color }} />
            Historical Cloud & Precipitation (30-Day)
          </span>
          <div className="dinosatEarthCondSectionDividerLine" />
        </div>
        {(cloudTotalChart || cloudLowChart) && (
          <div className="dinosatEarthCondOverviewGrid">
            {cloudTotalChart && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerHistorical">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Total Cloud Cover History</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(cloudTotalChart, "dinosatEarthCondChart")}
                <div className="dinosatEarthCondChartDescription">
                  <div className="dinosatEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (30-day observation period)</span>
                    <span><strong>Y-Axis:</strong> Total Cloud Cover (%)</span>
                  </div>
                  <p className="dinosatEarthCondChartDescriptionText">
                    This chart displays total cloud coverage percentage over the past 30 days, combining all cloud layers from surface to high altitude. Cloud cover affects optical tracking system performance, range safety visibility requirements, and compliance with flight rules regarding cumulus cloud penetration. Historical patterns help identify typical clear-sky windows and the probability of meeting visibility constraints for planned launch times.
                  </p>
                </div>
              </div>
            )}

            {cloudLowChart && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerHistorical">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Low Cloud Cover History</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(cloudLowChart, "dinosatEarthCondChart")}
                <div className="dinosatEarthCondChartDescription">
                  <div className="dinosatEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (30-day observation period)</span>
                    <span><strong>Y-Axis:</strong> Low Cloud Cover (%)</span>
                  </div>
                  <p className="dinosatEarthCondChartDescriptionText">
                    This chart shows low-level cloud coverage (below approximately 2000m) over the past 30 days. Low clouds are particularly critical for launch operations as the vehicle must transit through this layer during the initial ascent phase. Low cloud conditions may trigger cumulus cloud avoidance rules, affect optical tracking acquisition, and indicate potential precipitation or icing hazards during the critical first minutes of flight.
                  </p>
                </div>
                {historicalCloud?.statistics?.lowCover && (
                  <div className="dinosatEarthCondStatsSummary">
                    <span>avg: {historicalCloud.statistics.lowCover.mean !== null && historicalCloud.statistics.lowCover.mean !== undefined ? historicalCloud.statistics.lowCover.mean.toFixed(1) : "—"}%</span>
                    <span>freq &gt;50%: {historicalCloud.statistics.lowCover.frequencyAbove50 !== null && historicalCloud.statistics.lowCover.frequencyAbove50 !== undefined ? historicalCloud.statistics.lowCover.frequencyAbove50.toFixed(1) : "—"}%</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {precipChart && (
          <div className="dinosatEarthCondOverviewGrid">
            <div className="dinosatEarthCondPanelSingle dinosatEarthCondChartContainerHistorical">
              <div className="dinosatEarthCondChartHeaderWithBadge">
                <h4>Precipitation History</h4>
                {renderDataTypeBadge("HISTORICAL", "small")}
              </div>
              {renderDynamicChart(precipChart, "dinosatEarthCondChart")}
              <div className="dinosatEarthCondChartDescription">
                <div className="dinosatEarthCondChartAxesInfo">
                  <span><strong>X-Axis:</strong> Time (30-day observation period)</span>
                  <span><strong>Y-Axis:</strong> Precipitation (mm)</span>
                </div>
                <p className="dinosatEarthCondChartDescriptionText">
                  This chart displays precipitation accumulation over the past 30 days. Precipitation is a critical launch constraint as rain can damage thermal protection systems, affect vehicle aerodynamics, and trigger triboelectric charging hazards. Any measurable precipitation within the flight path typically results in launch scrub. Historical patterns help assess seasonal precipitation trends and the likelihood of dry launch windows.
                </p>
              </div>
              {historicalCloud?.statistics?.precipitation && (
                <div className="dinosatEarthCondStatsSummary">
                  <span>total: {historicalCloud.statistics.precipitation.totalMm !== null && historicalCloud.statistics.precipitation.totalMm !== undefined ? historicalCloud.statistics.precipitation.totalMm.toFixed(1) : "—"} mm</span>
                  <span>max/hr: {historicalCloud.statistics.precipitation.maxHourly !== null && historicalCloud.statistics.precipitation.maxHourly !== undefined ? historicalCloud.statistics.precipitation.maxHourly.toFixed(1) : "—"} mm</span>
                  <span>precip hours: {historicalCloud.statistics.precipitation.precipHours ?? 0}</span>
                  <span>freq: {historicalCloud.statistics.precipitation.precipFrequency !== null && historicalCloud.statistics.precipitation.precipFrequency !== undefined ? historicalCloud.statistics.precipitation.precipFrequency.toFixed(1) : "—"}%</span>
                </div>
              )}
            </div>
          </div>
        )}
        {historicalCloud?.statistics?.totalCover && (
          <div className="dinosatEarthCondOverviewGrid">
            <div className="dinosatEarthCondPanelSingle dinosatEarthCondChartContainerHistorical">
              <div className="dinosatEarthCondChartHeaderWithBadge">
                <h4>Cloud Cover Statistics</h4>
                {renderDataTypeBadge("HISTORICAL", "small")}
              </div>
              {renderDataTable("30-Day Cloud Stats", ["Parameter", "Value", "Unit"], [
                ["Min Cover", historicalCloud.statistics.totalCover.min !== null && historicalCloud.statistics.totalCover.min !== undefined ? historicalCloud.statistics.totalCover.min.toFixed(0) : "—", "%"],
                ["Max Cover", historicalCloud.statistics.totalCover.max !== null && historicalCloud.statistics.totalCover.max !== undefined ? historicalCloud.statistics.totalCover.max.toFixed(0) : "—", "%"],
                ["Mean Cover", historicalCloud.statistics.totalCover.mean !== null && historicalCloud.statistics.totalCover.mean !== undefined ? historicalCloud.statistics.totalCover.mean.toFixed(1) : "—", "%"],
                ["Std Dev", historicalCloud.statistics.totalCover.stdDev !== null && historicalCloud.statistics.totalCover.stdDev !== undefined ? historicalCloud.statistics.totalCover.stdDev.toFixed(1) : "—", "%"],
                ["Clear Hours (<25%)", historicalCloud.statistics.totalCover.clearDays ?? 0, "hours"],
                ["Overcast Hours (>75%)", historicalCloud.statistics.totalCover.overcastDays ?? 0, "hours"]
              ])}
            </div>
          </div>
        )}
        <div className="dinosatEarthCondSectionDivider">
          <div className="dinosatEarthCondSectionDividerLine" />
          <span className="dinosatEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faTint} />
            Historical Humidity & Inversions (30-Day)
          </span>
          <div className="dinosatEarthCondSectionDividerLine" />
        </div>
        {(surfaceRHChart || dewpointDepressionChart) && (
          <div className="dinosatEarthCondOverviewGrid">
            {surfaceRHChart && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerHistorical">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Surface Relative Humidity History</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(surfaceRHChart, "dinosatEarthCondChart")}
                <div className="dinosatEarthCondChartDescription">
                  <div className="dinosatEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (30-day observation period)</span>
                    <span><strong>Y-Axis:</strong> Relative Humidity (%)</span>
                  </div>
                  <p className="dinosatEarthCondChartDescriptionText">
                    This chart displays surface-level relative humidity measurements over the past 30 days. Humidity affects triboelectric charging potential during vehicle transit through the atmosphere, condensation formation on cryogenic tank surfaces, and overall atmospheric density calculations. Very low humidity can increase static electricity risks, while high humidity combined with low dewpoint depression indicates fog formation potential.
                  </p>
                </div>
              </div>
            )}

            {dewpointDepressionChart && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerHistorical">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Dewpoint Depression History</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(dewpointDepressionChart, "dinosatEarthCondChart")}
                <div className="dinosatEarthCondChartDescription">
                  <div className="dinosatEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (30-day observation period)</span>
                    <span><strong>Y-Axis:</strong> Dewpoint Depression (°C)</span>
                  </div>
                  <p className="dinosatEarthCondChartDescriptionText">
                    This chart shows dewpoint depression (temperature minus dewpoint) over the past 30 days. Dewpoint depression indicates how close the air is to saturation—smaller values mean higher condensation and fog risk. Values below 2-3°C indicate high fog probability, while larger spreads indicate drier conditions. This metric is critical for assessing visibility forecasts and condensation risks on vehicle surfaces during pre-launch operations.
                  </p>
                </div>
                {historicalHumidity?.statistics?.dewpointDepression && (
                  <div className="dinosatEarthCondStatsSummary">
                    <span>min: {historicalHumidity.statistics.dewpointDepression.min !== null && historicalHumidity.statistics.dewpointDepression.min !== undefined ? historicalHumidity.statistics.dewpointDepression.min.toFixed(1) : "—"} °C</span>
                    <span>avg: {historicalHumidity.statistics.dewpointDepression.mean !== null && historicalHumidity.statistics.dewpointDepression.mean !== undefined ? historicalHumidity.statistics.dewpointDepression.mean.toFixed(1) : "—"} °C</span>
                    <span>fog risk hours: {historicalHumidity.statistics.dewpointDepression.fogRiskHours ?? 0}</span>
                    <span>fog freq: {historicalHumidity.statistics.dewpointDepression.fogRiskFrequency !== null && historicalHumidity.statistics.dewpointDepression.fogRiskFrequency !== undefined ? historicalHumidity.statistics.dewpointDepression.fogRiskFrequency.toFixed(1) : "—"}%</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {historicalHumidity?.statistics?.surfaceRH && (
          <div className="dinosatEarthCondOverviewGrid">
            <div className="dinosatEarthCondPanelSingle dinosatEarthCondChartContainerHistorical">
              <div className="dinosatEarthCondChartHeaderWithBadge">
                <h4>Surface Humidity Statistics</h4>
                {renderDataTypeBadge("HISTORICAL", "small")}
              </div>
              {renderDataTable("30-Day Humidity Stats", ["Parameter", "Value", "Unit"], [
                ["Min RH", historicalHumidity.statistics.surfaceRH.min !== null && historicalHumidity.statistics.surfaceRH.min !== undefined ? historicalHumidity.statistics.surfaceRH.min.toFixed(0) : "—", "%"],
                ["Max RH", historicalHumidity.statistics.surfaceRH.max !== null && historicalHumidity.statistics.surfaceRH.max !== undefined ? historicalHumidity.statistics.surfaceRH.max.toFixed(0) : "—", "%"],
                ["Mean RH", historicalHumidity.statistics.surfaceRH.mean !== null && historicalHumidity.statistics.surfaceRH.mean !== undefined ? historicalHumidity.statistics.surfaceRH.mean.toFixed(1) : "—", "%"],
                ["Std Dev", historicalHumidity.statistics.surfaceRH.stdDev !== null && historicalHumidity.statistics.surfaceRH.stdDev !== undefined ? historicalHumidity.statistics.surfaceRH.stdDev.toFixed(1) : "—", "%"],
                ["High RH Hours (>85%)", historicalHumidity.statistics.surfaceRH.highHumidityHours ?? 0, "hours"],
                ["Low RH Hours (<30%)", historicalHumidity.statistics.surfaceRH.lowHumidityHours ?? 0, "hours"]
              ])}
            </div>
          </div>
        )}
        <div className="dinosatEarthCondOverviewGrid">
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerHistorical">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Inversion Statistics</h4>
              {renderDataTypeBadge("HISTORICAL", "small")}
            </div>
            {renderDataTable("30-Day Inversion Stats", ["Parameter", "Value", "Unit"], [
              ["Frequency", historicalInversions.statistics?.frequency !== null && historicalInversions.statistics?.frequency !== undefined ? historicalInversions.statistics.frequency.toFixed(1) : "0", "% of time"],
              ["Mean Indicator", historicalInversions.statistics?.meanStrength !== null && historicalInversions.statistics?.meanStrength !== undefined ? historicalInversions.statistics.meanStrength.toFixed(2) : "0", "index"],
              ["Max Indicator", historicalInversions.statistics?.maxStrength !== null && historicalInversions.statistics?.maxStrength !== undefined ? historicalInversions.statistics.maxStrength.toFixed(2) : "0", "index"],
              ["Probable Inversions", historicalInversions.statistics?.probableCount ?? historicalInversions.statistics?.strongInversionHours ?? 0, "hours"],
              ["Possible Inversions", historicalInversions.statistics?.possibleCount ?? 0, "hours"]
            ])}
            {historicalInversions.statistics?.note && (
              <div className="dinosatEarthCondDataTrust" style={{ marginTop: "8px", fontSize: "11px", color: "#64748b" }}>
                Note: {historicalInversions.statistics.note}
              </div>
            )}
          </div>
          {inversionIndicatorChart && (
            <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerHistorical">
              <div className="dinosatEarthCondChartHeaderWithBadge">
                <h4>Inversion Indicator History</h4>
                {renderDataTypeBadge("HISTORICAL", "small")}
              </div>
              {renderDynamicChart(inversionIndicatorChart, "dinosatEarthCondChart")}
              <div className="dinosatEarthCondChartDescription">
                <div className="dinosatEarthCondChartAxesInfo">
                  <span><strong>X-Axis:</strong> Time (30-day observation period)</span>
                  <span><strong>Y-Axis:</strong> Inversion Strength Index</span>
                </div>
                <p className="dinosatEarthCondChartDescriptionText">
                  This chart displays the temperature inversion strength indicator over the past 30 days. Temperature inversions occur when temperature increases with altitude rather than decreasing, creating stable atmospheric layers that can trap pollutants and exhaust plumes near the surface. Strong inversions impact acoustic propagation causing enhanced sound levels at distance, affect toxic plume dispersion modeling, and increase fog formation probability. Higher index values indicate stronger inversion conditions.
                </p>
              </div>
            </div>
          )}
        </div>


      </div>
    );
  };

  const renderElectromagneticEnvironmentTab = () => {
    const data = getModuleData("electromagneticEnvironment") || {};
    if (!data || Object.keys(data).length === 0) return <div className="dinosatEarthCondLoadingState">No EM data</div>;

    const kIndexForecast = data.kIndexHorizon?.forecast || [];
    const kpChart = kIndexForecast.length > 0 ? createDynamicLineChart("Kp Index", kIndexForecast, "time", "kp", "", "#6366f1", true) : null;

    const historicalRad = data.historicalRadiation || {};
    const protonTimeSeries = historicalRad?.protonTimeSeries || {};
    const electronTimeSeries = historicalRad?.electronTimeSeries || {};
    const neutronTimeSeries = historicalRad?.neutronTimeSeries || {};
    const xrayTimeSeries = historicalRad?.xrayTimeSeries || {};

    const protonP10 = protonTimeSeries.p10 || [];
    const protonP50 = protonTimeSeries.p50 || [];
    const protonP100 = protonTimeSeries.p100 || [];
    const electronE2 = electronTimeSeries.e2 || [];
    const neutronOulu = neutronTimeSeries.oulu || [];
    const neutronJung = neutronTimeSeries.jung || [];
    const neutronNewk = neutronTimeSeries.newk || [];
    const xrayShort = xrayTimeSeries.short || [];
    const xrayLong = xrayTimeSeries.long || [];

    const proton10Chart = protonP10.length > 0 ? createDynamicLineChart("Proton ≥10 MeV", protonP10, "timestamp", "value", " pfu", "#7c3aed", false) : null;
    const proton50Chart = protonP50.length > 0 ? createDynamicLineChart("Proton ≥50 MeV", protonP50, "timestamp", "value", " pfu", "#8b5cf6", false) : null;
    const proton100Chart = protonP100.length > 0 ? createDynamicLineChart("Proton ≥100 MeV", protonP100, "timestamp", "value", " pfu", "#a78bfa", false) : null;

    const electron2Chart = electronE2.length > 0 ? createDynamicLineChart("Electron ≥2 MeV", electronE2, "timestamp", "value", " pfu", "#10b981", false) : null;

    const neutronOuluChart = neutronOulu.length > 0 ? createDynamicLineChart("Neutron OULU (0.8 GV)", neutronOulu, "timestamp", "value", "%", "#f59e0b", false) : null;
    const neutronJungChart = neutronJung.length > 0 ? createDynamicLineChart("Neutron JUNG (4.5 GV)", neutronJung, "timestamp", "value", "%", "#d97706", false) : null;
    const neutronNewkChart = neutronNewk.length > 0 ? createDynamicLineChart("Neutron NEWK (2.4 GV)", neutronNewk, "timestamp", "value", "%", "#92400e", false) : null;

    const xrayShortChart = xrayShort.length > 0 ? createDynamicLineChart("X-ray 0.05-0.4nm", xrayShort, "timestamp", "value", " W/m²", "#ef4444", false) : null;
    const xrayLongChart = xrayLong.length > 0 ? createDynamicLineChart("X-ray 0.1-0.8nm", xrayLong, "timestamp", "value", " W/m²", "#f97316", false) : null;

    const commandData = getModuleData("commandIntegrity") || {};
    const historicalSpaceWeather = commandData?.historicalSpaceWeather || {};
    const historicalSpaceWeatherTimeSeries = historicalSpaceWeather?.timeSeries || [];
    const spaceWeatherKpChart = historicalSpaceWeatherTimeSeries.length > 0 ? createDynamicLineChart("Historical Kp Index", historicalSpaceWeatherTimeSeries.slice(-48), "timestamp", "value", "", "#7c3aed", false) : null;

    const signalIntegrity = data.signalIntegrity || {};
    const solarFlareActivity = data.solarFlareActivity || {};
    const cmeStatus = data.cmeStatus || {};
    const triboelectricCharging = data.triboelectricCharging || {};
    const geomagnticStormForecast = data.geomagnticStormForecast || {};

    const getSignalStatus = (value, available) => {
      if (!available || value === null || value === undefined) return "NO DATA";
      return "OK";
    };

    const getFlareClassColor = (flareClass) => {
      if (flareClass === "X") return "#7c3aed";
      if (flareClass === "M") return "#8b5cf6";
      if (flareClass === "C") return "#f59e0b";
      if (flareClass === "B") return "#22c55e";
      return "#64748b";
    };

    const getProbabilityColor = (prob) => {
      if (prob >= 50) return "#7c3aed";
      if (prob >= 30) return "#8b5cf6";
      if (prob >= 10) return "#f59e0b";
      return "#22c55e";
    };

    const getTriboRiskColor = (risk) => {
      if (risk >= 0.7) return "#7c3aed";
      if (risk >= 0.5) return "#8b5cf6";
      if (risk >= 0.3) return "#f59e0b";
      return "#22c55e";
    };

    return (
      <div className="dinosatEarthCondModuleTab">
        <div className="dinosatEarthCondSectionDivider">
          <div className="dinosatEarthCondSectionDividerLine" />
          <span className="dinosatEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faBroadcastTower} />
            Signal Integrity & Communications
          </span>
          <div className="dinosatEarthCondSectionDividerLine" />
        </div>
        <div className="dinosatEarthCondOverviewGrid">
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerComputed">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Signal Integrity</h4>
              {renderDataTypeBadge("COMPUTED", "small")}
            </div>
            {renderDataTable("RF", ["Parameter", "Value", "Unit", "Status"], [
              ["GPS Accuracy", signalIntegrity.gpsAccuracy !== null && signalIntegrity.gpsAccuracy !== undefined ? signalIntegrity.gpsAccuracy.toFixed(2) : "—", "m", getSignalStatus(signalIntegrity.gpsAccuracy, signalIntegrity.dataAvailable)],
              ["Telemetry Quality", signalIntegrity.telemetryQuality !== null && signalIntegrity.telemetryQuality !== undefined ? signalIntegrity.telemetryQuality.toFixed(1) : "—", "%", getSignalStatus(signalIntegrity.telemetryQuality, signalIntegrity.dataAvailable)],
              ["TEC", signalIntegrity.tec !== null && signalIntegrity.tec !== undefined ? signalIntegrity.tec.toFixed(1) : "—", "TECU", getSignalStatus(signalIntegrity.tec, signalIntegrity.dataAvailable)],
              ["Scintillation (S4)", signalIntegrity.scintillation !== null && signalIntegrity.scintillation !== undefined ? signalIntegrity.scintillation.toFixed(2) : "—", "S4", getSignalStatus(signalIntegrity.scintillation, signalIntegrity.dataAvailable)]
            ])}
            {signalIntegrity.dataAvailable && (
              <div className="dinosatEarthCondStatsSummary" style={{ color: "#22c55e" }}>
                Signal integrity computed from F10.7 flux and Kp index.
              </div>
            )}
            {!signalIntegrity.dataAvailable && (
              <div className="dinosatEarthCondStatsSummary" style={{ color: "#8b5cf6" }}>
                Awaiting F10.7 and Kp data for signal computation.
              </div>
            )}
          </div>
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerLive">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Band Spectrum</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            <div className="dinosatEarthCondSpectrumGrid">
              {["hf", "lBand", "sBand"].map(band => {
                const status = data.spectrumTrafficLight?.[band] || "UNKNOWN";
                const color = status === "GREEN" ? "#22c55e" : status === "YELLOW" ? "#8b5cf6" : status === "RED" ? "#7c3aed" : "#64748b";
                return (
                  <div key={band} className="dinosatEarthCondSpectrumBand" style={{ borderColor: color }}>
                    <div className="dinosatEarthCondSpectrumIndicator" style={{ backgroundColor: color }} />
                    <span className="dinosatEarthCondSpectrumLabel">{band === "hf" ? "HF" : band === "lBand" ? "L-Band" : "S-Band"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="dinosatEarthCondSectionDivider">
          <div className="dinosatEarthCondSectionDividerLine" />
          <span className="dinosatEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faSun} />
            Solar Activity & Flares
          </span>
          <div className="dinosatEarthCondSectionDividerLine" />
        </div>
        <div className="dinosatEarthCondOverviewGrid">

          <div className="dinosatEarthCondPanelSingle dinosatEarthCondChartContainerForecast">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Flare Probabilities (24h)</h4>
              {renderDataTypeBadge("PROBABILISTIC", "small")}
            </div>
            <div className="dinosatEarthCondForecastNotice">
              <FontAwesomeIcon icon={faInfoCircle} />
              <span>SWPC forecast probabilities for next 24 hours.</span>
            </div>
            {renderDataTable("Probabilities", ["Flare Class", "Probability", "Risk Level"], [
              ["C-class", solarFlareActivity.flareProbabilities?.cClass !== null && solarFlareActivity.flareProbabilities?.cClass !== undefined ? `${solarFlareActivity.flareProbabilities.cClass}%` : "—", solarFlareActivity.flareProbabilities?.cClass !== null && solarFlareActivity.flareProbabilities?.cClass !== undefined ? (solarFlareActivity.flareProbabilities.cClass >= 80 ? "HIGH" : solarFlareActivity.flareProbabilities.cClass >= 50 ? "MODERATE" : "LOW") : "NO DATA"],
              ["M-class", solarFlareActivity.flareProbabilities?.mClass !== null && solarFlareActivity.flareProbabilities?.mClass !== undefined ? `${solarFlareActivity.flareProbabilities.mClass}%` : "—", solarFlareActivity.flareProbabilities?.mClass !== null && solarFlareActivity.flareProbabilities?.mClass !== undefined ? (solarFlareActivity.flareProbabilities.mClass >= 40 ? "HIGH" : solarFlareActivity.flareProbabilities.mClass >= 20 ? "MODERATE" : "LOW") : "NO DATA"],
              ["X-class", solarFlareActivity.flareProbabilities?.xClass !== null && solarFlareActivity.flareProbabilities?.xClass !== undefined ? `${solarFlareActivity.flareProbabilities.xClass}%` : "—", solarFlareActivity.flareProbabilities?.xClass !== null && solarFlareActivity.flareProbabilities?.xClass !== undefined ? (solarFlareActivity.flareProbabilities.xClass >= 10 ? "CRITICAL" : solarFlareActivity.flareProbabilities.xClass >= 5 ? "HIGH" : "LOW") : "NO DATA"],
              ["Proton Event", solarFlareActivity.protonEventProbability !== null && solarFlareActivity.protonEventProbability !== undefined ? `${solarFlareActivity.protonEventProbability}%` : "—", solarFlareActivity.protonEventProbability !== null && solarFlareActivity.protonEventProbability !== undefined ? (solarFlareActivity.protonEventProbability >= 30 ? "HIGH" : solarFlareActivity.protonEventProbability >= 10 ? "MODERATE" : "LOW") : "NO DATA"]
            ])}
          </div>
        </div>
        <div className="dinosatEarthCondOverviewGrid">
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerLive">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Current Solar Activity</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderDataTable("X-ray Flux", ["Parameter", "Value", "Unit", "Status"], [
              ["X-ray (0.1-0.8nm)", solarFlareActivity.currentXrayFluxLong !== null && solarFlareActivity.currentXrayFluxLong !== undefined ? solarFlareActivity.currentXrayFluxLong.toExponential(2) : "—", "W/m²", solarFlareActivity.dataAvailable ? "OK" : "NO DATA"],
              ["X-ray (0.05-0.4nm)", solarFlareActivity.currentXrayFluxShort !== null && solarFlareActivity.currentXrayFluxShort !== undefined ? solarFlareActivity.currentXrayFluxShort.toExponential(2) : "—", "W/m²", solarFlareActivity.dataAvailable ? "OK" : "NO DATA"]
            ])}
          </div>
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerComputed">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Flare Probability Gauge</h4>
              {renderDataTypeBadge("PROBABILISTIC", "small")}
            </div>
            {solarFlareActivity.flareProbabilities?.mClass !== null && solarFlareActivity.flareProbabilities?.mClass !== undefined ? (
              <div className="dinosatEarthCondRiskGauge">
                <div className="dinosatEarthCondGaugeValue" style={{ color: getProbabilityColor(solarFlareActivity.flareProbabilities.mClass) }}>
                  {solarFlareActivity.flareProbabilities.mClass}%
                </div>
                <div className="dinosatEarthCondGaugeLabel">M-class Probability</div>
                <div className="dinosatEarthCondGaugeBar">
                  <div className="dinosatEarthCondGaugeFill" style={{
                    width: `${solarFlareActivity.flareProbabilities.mClass}%`,
                    backgroundColor: getProbabilityColor(solarFlareActivity.flareProbabilities.mClass)
                  }} />
                </div>
                <div className="dinosatEarthCondDataTrust">
                  X-class: {solarFlareActivity.flareProbabilities.xClass !== null && solarFlareActivity.flareProbabilities.xClass !== undefined ? `${solarFlareActivity.flareProbabilities.xClass}%` : "—"} | Proton: {solarFlareActivity.protonEventProbability !== null && solarFlareActivity.protonEventProbability !== undefined ? `${solarFlareActivity.protonEventProbability}%` : "—"}
                </div>
              </div>
            ) : (
              <div className="dinosatEarthCondNoChartData">Flare probability data unavailable.</div>
            )}
          </div>
        </div>
        {solarFlareActivity.activeRegions?.length > 0 && (
          <div className="dinosatEarthCondOverviewGrid">
            <div className="dinosatEarthCondPanelDouble dinosatEarthCondFullWidth dinosatEarthCondChartContainerLive">
              <div className="dinosatEarthCondChartHeaderWithBadge">
                <h4>Active Solar Regions ({solarFlareActivity.activeRegions.length})</h4>
                {renderDataTypeBadge("LIVE", "small")}
              </div>
              {renderDataTable("Sunspot Regions", ["Region", "Location", "Area", "Spots", "Mag Class", "Spot Class"],
                solarFlareActivity.activeRegions.slice(0, 15).map(region => [
                  region?.regionNumber || "—",
                  region?.location || "—",
                  region?.area !== null && region?.area !== undefined ? region.area : "—",
                  region?.numSpots !== null && region?.numSpots !== undefined ? region.numSpots : "—",
                  region?.magClass || "—",
                  region?.spotClass || "—"
                ])
              )}
            </div>
          </div>
        )}
        <div className="dinosatEarthCondSectionDivider">
          <div className="dinosatEarthCondSectionDividerLine" />
          <span className="dinosatEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faGlobeAmericas} />
            Geomagnetic Environment & CME Status
          </span>
          <div className="dinosatEarthCondSectionDividerLine" />
        </div>
        <div className="dinosatEarthCondOverviewGrid">
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerLive">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>CME Status</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderDataTable("Coronal Mass Ejections", ["Parameter", "Value", "Status"], [
              ["Active CMEs", cmeStatus.activeCMEs?.length ?? 0, (cmeStatus.activeCMEs?.length ?? 0) > 0 ? "ACTIVE" : "NONE"],
              ["Arrival Probability", cmeStatus.arrivalProbability !== null && cmeStatus.arrivalProbability !== undefined ? `${cmeStatus.arrivalProbability}%` : "—", cmeStatus.arrivalProbability !== null && cmeStatus.arrivalProbability !== undefined ? (cmeStatus.arrivalProbability >= 60 ? "HIGH" : cmeStatus.arrivalProbability >= 30 ? "MODERATE" : "LOW") : "NO DATA"],
              ["Est. Arrival", cmeStatus.estimatedArrival || "—", cmeStatus.estimatedArrival ? "PREDICTED" : "NONE"],
              ["Active Alerts", cmeStatus.alerts?.length ?? 0, (cmeStatus.alerts?.length ?? 0) > 0 ? "ACTIVE" : "NONE"]
            ])}
            {!cmeStatus.dataAvailable && (
              <div className="dinosatEarthCondStatsSummary" style={{ color: "#22c55e" }}>
                No active CME alerts in past 72 hours
              </div>
            )}
          </div>
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerForecast">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Geomagnetic Storm Forecast</h4>
              {renderDataTypeBadge("PROBABILISTIC", "small")}
            </div>
            <div className="dinosatEarthCondForecastNotice">
              <FontAwesomeIcon icon={faInfoCircle} />
              <span>3-day storm and radio blackout probabilities.</span>
            </div>
            {renderDataTable("Storm Probabilities", ["Type", "Probability", "Risk"], [
              ["Minor Storm (G1-G2)", geomagnticStormForecast.minorStormProb !== null && geomagnticStormForecast.minorStormProb !== undefined ? `${geomagnticStormForecast.minorStormProb}%` : "—", geomagnticStormForecast.minorStormProb !== null && geomagnticStormForecast.minorStormProb !== undefined ? (geomagnticStormForecast.minorStormProb >= 50 ? "HIGH" : geomagnticStormForecast.minorStormProb >= 25 ? "MODERATE" : "LOW") : "NO DATA"],
              ["Major Storm (G3+)", geomagnticStormForecast.majorStormProb !== null && geomagnticStormForecast.majorStormProb !== undefined ? `${geomagnticStormForecast.majorStormProb}%` : "—", geomagnticStormForecast.majorStormProb !== null && geomagnticStormForecast.majorStormProb !== undefined ? (geomagnticStormForecast.majorStormProb >= 30 ? "CRITICAL" : geomagnticStormForecast.majorStormProb >= 10 ? "HIGH" : "LOW") : "NO DATA"],
              ["Radio Blackout (R1-R2)", geomagnticStormForecast.radioBlackoutProbR1R2 !== null && geomagnticStormForecast.radioBlackoutProbR1R2 !== undefined ? `${geomagnticStormForecast.radioBlackoutProbR1R2}%` : "—", geomagnticStormForecast.radioBlackoutProbR1R2 !== null && geomagnticStormForecast.radioBlackoutProbR1R2 !== undefined ? (geomagnticStormForecast.radioBlackoutProbR1R2 >= 50 ? "HIGH" : "LOW") : "NO DATA"],
              ["Radio Blackout (R3+)", geomagnticStormForecast.radioBlackoutProbR3 !== null && geomagnticStormForecast.radioBlackoutProbR3 !== undefined ? `${geomagnticStormForecast.radioBlackoutProbR3}%` : "—", geomagnticStormForecast.radioBlackoutProbR3 !== null && geomagnticStormForecast.radioBlackoutProbR3 !== undefined ? (geomagnticStormForecast.radioBlackoutProbR3 >= 10 ? "CRITICAL" : "LOW") : "NO DATA"]
            ])}
          </div>
        </div>
        {(kpChart || kIndexForecast.length > 0) && (
          <div className="dinosatEarthCondOverviewGrid">
            {kpChart && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerForecast">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Kp Index Forecast</h4>
                  {renderDataTypeBadge("FORECAST", "small")}
                </div>
                <div className="dinosatEarthCondForecastNotice">
                  <FontAwesomeIcon icon={faInfoCircle} />
                  <span>Predicted values for upcoming hours based on NOAA space weather models.</span>
                </div>
                {renderDynamicChart(kpChart, "dinosatEarthCondChart")}
                <div className="dinosatEarthCondChartDescription">
                  <div className="dinosatEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Forecast Time (hours ahead)</span>
                    <span><strong>Y-Axis:</strong> Kp Index (0-9 scale)</span>
                  </div>
                  <p className="dinosatEarthCondChartDescriptionText">
                    This chart displays the forecasted planetary K-index (Kp) for upcoming hours based on NOAA Space Weather Prediction Center models. The Kp index quantifies geomagnetic disturbance on a 0-9 scale, where values 0-3 indicate quiet conditions, 4 indicates unsettled conditions, and 5+ indicates geomagnetic storm levels. Higher Kp values correlate with increased radiation belt activity, GPS accuracy degradation, and potential impacts to spacecraft attitude control and communications systems.
                  </p>
                </div>
                {data.kIndexHorizon?.trend && (
                  <div className="dinosatEarthCondStatsSummary">
                    <span>Trend: {data.kIndexHorizon.trend}</span>
                  </div>
                )}
              </div>
            )}
            {kIndexForecast.length > 0 && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerForecast">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Kp Forecast Table</h4>
                  {renderDataTypeBadge("FORECAST", "small")}
                </div>
                {renderDataTable("Kp Forecast", ["Time", "Kp", "Condition"],
                  kIndexForecast.slice(0, 8).map(f => [
                    f?.time || "—",
                    f?.kp !== null && f?.kp !== undefined ? f.kp.toFixed(1) : "—",
                    f?.condition || "—"
                  ])
                )}
              </div>
            )}
          </div>
        )}
        {cmeStatus.activeCMEs?.length > 0 && (
          <div className="dinosatEarthCondOverviewGrid">
            <div className="dinosatEarthCondPanelSingle dinosatEarthCondFullWidth dinosatEarthCondChartContainerLive">
              <div className="dinosatEarthCondChartHeaderWithBadge">
                <h4>Active CME Detections ({cmeStatus.activeCMEs.length})</h4>
                {renderDataTypeBadge("LIVE", "small")}
              </div>
              {renderDataTable("CME Events", ["Detected", "Description"],
                cmeStatus.activeCMEs.slice(0, 10).map(cme => [
                  cme?.detected ? new Date(cme.detected).toLocaleString() : "—",
                  cme?.description || "—"
                ])
              )}
            </div>
          </div>
        )}
        {cmeStatus.alerts?.length > 0 && (
          <div className="dinosatEarthCondOverviewGrid">
            <div className="dinosatEarthCondPanelSingle dinosatEarthCondFullWidth dinosatEarthCondChartContainerLive">
              <div className="dinosatEarthCondChartHeaderWithBadge">
                <h4>SWPC Space Weather Alerts ({cmeStatus.alerts.length})</h4>
                {renderDataTypeBadge("LIVE", "small")}
              </div>
              {renderDataTable("Alerts", ["Type", "Issue Time", "Message"],
                cmeStatus.alerts.slice(0, 10).map(alert => [
                  alert?.type || "—",
                  alert?.issueTime ? new Date(alert.issueTime).toLocaleString() : "—",
                  alert?.message ? (alert.message.substring(0, 150) + (alert.message.length > 150 ? "..." : "")) : "—"
                ])
              )}
            </div>
          </div>
        )}
        <div className="dinosatEarthCondSectionDivider">
          <div className="dinosatEarthCondSectionDividerLine" />
          <span className="dinosatEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faSatellite} />
            Radiation Environment & Hardening
          </span>
          <div className="dinosatEarthCondSectionDividerLine" />
        </div>
        <div className="dinosatEarthCondOverviewGrid">
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerLive">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Radiation Hardening</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderDataTable("Flux", ["Parameter", "Value", "Status"], [
              ["Proton Flux (≥10 MeV)", data.hardeningLimits?.protonFlux !== null && data.hardeningLimits?.protonFlux !== undefined ? `${data.hardeningLimits.protonFlux.toFixed(2)} pfu` : "—", data.hardeningLimits?.dataAvailable ? "OK" : "NO DATA"],
              ["Electron Flux (≥2 MeV)", data.hardeningLimits?.electronFlux !== null && data.hardeningLimits?.electronFlux !== undefined ? `${data.hardeningLimits.electronFlux.toFixed(2)} pfu` : "—", data.hardeningLimits?.electronFlux !== null && data.hardeningLimits?.electronFlux !== undefined ? "OK" : "NO DATA"],
              ["Neutron Flux", data.hardeningLimits?.neutronFlux !== null && data.hardeningLimits?.neutronFlux !== undefined ? `${data.hardeningLimits.neutronFlux.toFixed(2)}%` : "—", data.hardeningLimits?.neutronFlux !== null && data.hardeningLimits?.neutronFlux !== undefined ? "OK" : "NO DATA"],
              ["Total Ionizing Dose", data.hardeningLimits?.totalIonizingDose !== null && data.hardeningLimits?.totalIonizingDose !== undefined ? `${data.hardeningLimits.totalIonizingDose.toFixed(2)} rad` : "—", data.hardeningLimits?.totalIonizingDose !== null && data.hardeningLimits?.totalIonizingDose !== undefined ? "OK" : "NO DATA"],
              ["TID Risk", data.hardeningLimits?.componentFailureRisk || "—", data.hardeningLimits?.componentFailureRisk ? "OK" : "NO DATA"],
              ["Lightning Risk", data.dischargeRisk?.triggeredLightningRisk || "—", data.dischargeRisk?.triggeredLightningRisk ? "OK" : "NO DATA"]
            ])}
          </div>
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerComputed">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Radiation Dose Gauge</h4>
              {renderDataTypeBadge("COMPUTED", "small")}
            </div>
            {data.radiationDoseGauge?.dataAvailable ? (
              <div className="dinosatEarthCondRiskGauge">
                <div className="dinosatEarthCondGaugeValue">{data.radiationDoseGauge.currentDose !== null && data.radiationDoseGauge.currentDose !== undefined ? data.radiationDoseGauge.currentDose.toFixed(1) : "—"} rad</div>
                <div className="dinosatEarthCondGaugeLabel">Current TID</div>
                <div className="dinosatEarthCondGaugeBar">
                  <div className="dinosatEarthCondGaugeFill" style={{
                    width: `${Math.min(100, ((data.radiationDoseGauge.currentDose ?? 0) / (data.radiationDoseGauge.componentLimit || 1) * 100))}%`,
                    backgroundColor: (data.radiationDoseGauge.safetyMargin ?? 100) < 20 ? "#7c3aed" : (data.radiationDoseGauge.safetyMargin ?? 100) < 50 ? "#8b5cf6" : "#22c55e"
                  }} />
                </div>
                <div className="dinosatEarthCondDataTrust">
                  Limit: {data.radiationDoseGauge.componentLimit ?? "—"} rad | Margin: {data.radiationDoseGauge.safetyMargin !== null && data.radiationDoseGauge.safetyMargin !== undefined ? data.radiationDoseGauge.safetyMargin.toFixed(1) : "—"}%
                </div>
              </div>
            ) : (
              <div className="dinosatEarthCondNoChartData">Radiation dose data unavailable.</div>
            )}
          </div>
        </div>
        <div className="dinosatEarthCondSectionDivider">
          <div className="dinosatEarthCondSectionDividerLine" />
          <span className="dinosatEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faBolt} />
            Triboelectric & Electrostatic Hazards
          </span>
          <div className="dinosatEarthCondSectionDividerLine" />
        </div>
        <div className="dinosatEarthCondOverviewGrid">
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerComputed">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Charging Parameters</h4>
              {renderDataTypeBadge("COMPUTED", "small")}
            </div>
            {renderDataTable("Electrostatic", ["Parameter", "Value", "Unit", "Status"], [
              ["Risk Index", triboelectricCharging.riskIndex !== null && triboelectricCharging.riskIndex !== undefined ? (triboelectricCharging.riskIndex * 100).toFixed(1) : "—", "%", triboelectricCharging.riskIndex !== null && triboelectricCharging.riskIndex !== undefined ? (triboelectricCharging.riskIndex >= 0.7 ? "CRITICAL" : triboelectricCharging.riskIndex >= 0.5 ? "WARNING" : triboelectricCharging.riskIndex >= 0.3 ? "ADVISORY" : "NOMINAL") : "NO DATA"],
              ["Ice Crystal Indicator", triboelectricCharging.iceCrystalIndicator !== null && triboelectricCharging.iceCrystalIndicator !== undefined ? (triboelectricCharging.iceCrystalIndicator * 100).toFixed(1) : "—", "%", triboelectricCharging.iceCrystalIndicator !== null && triboelectricCharging.iceCrystalIndicator !== undefined ? (triboelectricCharging.iceCrystalIndicator >= 0.6 ? "WARNING" : "OK") : "NO DATA"],
              ["Vehicle Charging", triboelectricCharging.vehicleChargingPotential !== null && triboelectricCharging.vehicleChargingPotential !== undefined ? triboelectricCharging.vehicleChargingPotential.toFixed(1) : "—", "kV", triboelectricCharging.vehicleChargingPotential !== null && triboelectricCharging.vehicleChargingPotential !== undefined ? (triboelectricCharging.vehicleChargingPotential >= 20 ? "WARNING" : "OK") : "NO DATA"],
              ["Flight Path Elec.", triboelectricCharging.flightPathElectrification !== null && triboelectricCharging.flightPathElectrification !== undefined ? (triboelectricCharging.flightPathElectrification * 100).toFixed(1) : "—", "%", triboelectricCharging.flightPathElectrification !== null && triboelectricCharging.flightPathElectrification !== undefined ? (triboelectricCharging.flightPathElectrification >= 0.5 ? "WARNING" : "OK") : "NO DATA"]
            ])}
          </div>
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerComputed">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Charging Risk Assessment</h4>
              {renderDataTypeBadge("COMPUTED", "small")}
            </div>
            {triboelectricCharging.dataAvailable ? (
              <div className="dinosatEarthCondRiskGauge">
                <div className="dinosatEarthCondGaugeValue" style={{ color: getTriboRiskColor(triboelectricCharging.riskIndex ?? 0) }}>
                  {triboelectricCharging.riskIndex !== null && triboelectricCharging.riskIndex !== undefined ? (triboelectricCharging.riskIndex * 100).toFixed(0) : "—"}%
                </div>
                <div className="dinosatEarthCondGaugeLabel">Triboelectric Risk Index</div>
                <div className="dinosatEarthCondGaugeBar">
                  <div className="dinosatEarthCondGaugeFill" style={{
                    width: `${(triboelectricCharging.riskIndex ?? 0) * 100}%`,
                    backgroundColor: getTriboRiskColor(triboelectricCharging.riskIndex ?? 0)
                  }} />
                </div>
                <div className="dinosatEarthCondDataTrust">
                  Ice Crystal: {triboelectricCharging.iceCrystalIndicator !== null && triboelectricCharging.iceCrystalIndicator !== undefined ? (triboelectricCharging.iceCrystalIndicator * 100).toFixed(0) + "%" : "—"} | Vehicle: {triboelectricCharging.vehicleChargingPotential !== null && triboelectricCharging.vehicleChargingPotential !== undefined ? triboelectricCharging.vehicleChargingPotential.toFixed(1) + " kV" : "—"}
                </div>
              </div>
            ) : (
              <div className="dinosatEarthCondNoChartData">Triboelectric assessment data unavailable.</div>
            )}
          </div>
        </div>
        <div className="dinosatEarthCondOverviewGrid">
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerLive">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Cloud Layer Analysis</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderDataTable("Cloud Cover", ["Layer", "Coverage", "Status"], [
              ["Low Cloud", triboelectricCharging.cloudLayerAnalysis?.lowCloud !== null && triboelectricCharging.cloudLayerAnalysis?.lowCloud !== undefined ? `${triboelectricCharging.cloudLayerAnalysis.lowCloud}%` : "—", triboelectricCharging.cloudLayerAnalysis?.lowCloud !== null && triboelectricCharging.cloudLayerAnalysis?.lowCloud !== undefined ? (triboelectricCharging.cloudLayerAnalysis.lowCloud >= 70 ? "WARNING" : "OK") : "NO DATA"],
              ["Mid Cloud", triboelectricCharging.cloudLayerAnalysis?.midCloud !== null && triboelectricCharging.cloudLayerAnalysis?.midCloud !== undefined ? `${triboelectricCharging.cloudLayerAnalysis.midCloud}%` : "—", triboelectricCharging.cloudLayerAnalysis?.midCloud !== null && triboelectricCharging.cloudLayerAnalysis?.midCloud !== undefined ? (triboelectricCharging.cloudLayerAnalysis.midCloud >= 70 ? "WARNING" : "OK") : "NO DATA"],
              ["High Cloud", triboelectricCharging.cloudLayerAnalysis?.highCloud !== null && triboelectricCharging.cloudLayerAnalysis?.highCloud !== undefined ? `${triboelectricCharging.cloudLayerAnalysis.highCloud}%` : "—", triboelectricCharging.cloudLayerAnalysis?.highCloud !== null && triboelectricCharging.cloudLayerAnalysis?.highCloud !== undefined ? (triboelectricCharging.cloudLayerAnalysis.highCloud >= 60 ? "ADVISORY" : "OK") : "NO DATA"],
              ["Precipitable Water", triboelectricCharging.cloudLayerAnalysis?.precipitableWater !== null && triboelectricCharging.cloudLayerAnalysis?.precipitableWater !== undefined ? `${triboelectricCharging.cloudLayerAnalysis.precipitableWater} mm` : "—", triboelectricCharging.cloudLayerAnalysis?.precipitableWater !== null && triboelectricCharging.cloudLayerAnalysis?.precipitableWater !== undefined ? "OK" : "NO DATA"]
            ])}
          </div>
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerLive">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Atmospheric Profile (Ice Formation)</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {renderDataTable("Temperature & Humidity", ["Level", "Temp (°C)", "RH (%)", "Status"], [
              ["850 hPa", triboelectricCharging.atmosphericProfile?.temp850 !== null && triboelectricCharging.atmosphericProfile?.temp850 !== undefined ? triboelectricCharging.atmosphericProfile.temp850.toFixed(1) : "—", triboelectricCharging.atmosphericProfile?.rh850 !== null && triboelectricCharging.atmosphericProfile?.rh850 !== undefined ? triboelectricCharging.atmosphericProfile.rh850.toFixed(0) : "—", triboelectricCharging.atmosphericProfile?.temp850 !== null && triboelectricCharging.atmosphericProfile?.temp850 !== undefined ? "OK" : "NO DATA"],
              ["700 hPa", triboelectricCharging.atmosphericProfile?.temp700 !== null && triboelectricCharging.atmosphericProfile?.temp700 !== undefined ? triboelectricCharging.atmosphericProfile.temp700.toFixed(1) : "—", triboelectricCharging.atmosphericProfile?.rh700 !== null && triboelectricCharging.atmosphericProfile?.rh700 !== undefined ? triboelectricCharging.atmosphericProfile.rh700.toFixed(0) : "—", triboelectricCharging.atmosphericProfile?.temp700 !== null && triboelectricCharging.atmosphericProfile?.temp700 !== undefined ? (triboelectricCharging.atmosphericProfile.temp700 < 0 && triboelectricCharging.atmosphericProfile.temp700 > -40 ? "ICE RISK" : "OK") : "NO DATA"],
              ["500 hPa", triboelectricCharging.atmosphericProfile?.temp500 !== null && triboelectricCharging.atmosphericProfile?.temp500 !== undefined ? triboelectricCharging.atmosphericProfile.temp500.toFixed(1) : "—", triboelectricCharging.atmosphericProfile?.rh500 !== null && triboelectricCharging.atmosphericProfile?.rh500 !== undefined ? triboelectricCharging.atmosphericProfile.rh500.toFixed(0) : "—", triboelectricCharging.atmosphericProfile?.temp500 !== null && triboelectricCharging.atmosphericProfile?.temp500 !== undefined ? "OK" : "NO DATA"]
            ])}
          </div>
        </div>
        <div className="dinosatEarthCondSectionDivider">
          <div className="dinosatEarthCondSectionDividerLine" />
          <span className="dinosatEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faHistory} />
            Historical Geomagnetic Data (7-Day)
          </span>
          <div className="dinosatEarthCondSectionDividerLine" />
        </div>
        {spaceWeatherKpChart && (
          <div className="dinosatEarthCondOverviewGrid">
            <div className="dinosatEarthCondPanelSingle dinosatEarthCondChartContainerHistorical">
              <div className="dinosatEarthCondChartHeaderWithBadge">
                <h4>Kp Index History</h4>
                {renderDataTypeBadge("HISTORICAL", "small")}
              </div>
              {renderDynamicChart(spaceWeatherKpChart, "dinosatEarthCondChart")}
              <div className="dinosatEarthCondChartDescription">
                <div className="dinosatEarthCondChartAxesInfo">
                  <span><strong>X-Axis:</strong> Time (7-day observation period)</span>
                  <span><strong>Y-Axis:</strong> Kp Index (0-9 scale)</span>
                </div>
                <p className="dinosatEarthCondChartDescriptionText">
                  This chart displays historical Kp index measurements over the past 7 days. The Kp index is a global geomagnetic activity indicator derived from ground-based magnetometer networks worldwide. Tracking Kp history helps identify geomagnetic storm patterns, assess the persistence of disturbed conditions, and correlate space weather events with observed effects on spacecraft systems. Sustained elevated Kp values indicate prolonged periods of enhanced radiation belt activity and increased risk to sensitive electronics.
                </p>
              </div>
              {historicalSpaceWeather?.statistics?.kpIndex && (
                <div className="dinosatEarthCondStatsSummary">
                  <span>min: {historicalSpaceWeather.statistics.kpIndex.min !== null && historicalSpaceWeather.statistics.kpIndex.min !== undefined ? historicalSpaceWeather.statistics.kpIndex.min.toFixed(1) : "—"}</span>
                  <span>max: {historicalSpaceWeather.statistics.kpIndex.max !== null && historicalSpaceWeather.statistics.kpIndex.max !== undefined ? historicalSpaceWeather.statistics.kpIndex.max.toFixed(1) : "—"}</span>
                  <span>avg: {historicalSpaceWeather.statistics.kpIndex.mean !== null && historicalSpaceWeather.statistics.kpIndex.mean !== undefined ? historicalSpaceWeather.statistics.kpIndex.mean.toFixed(1) : "—"}</span>
                  <span>current: {historicalSpaceWeather.statistics.kpIndex.current !== null && historicalSpaceWeather.statistics.kpIndex.current !== undefined ? historicalSpaceWeather.statistics.kpIndex.current.toFixed(1) : "—"}</span>
                </div>
              )}
            </div>
          </div>
        )}
        <div className="dinosatEarthCondSectionDivider">
          <div className="dinosatEarthCondSectionDividerLine" />
          <span className="dinosatEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faSatellite} />
            Historical Particle Radiation (7-Day)
          </span>
          <div className="dinosatEarthCondSectionDividerLine" />
        </div>
        <div className="dinosatEarthCondOverviewGrid">
          <div className="dinosatEarthCondPanelSingle dinosatEarthCondFullWidth dinosatEarthCondChartContainerHistorical">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Radiation History Summary</h4>
              {renderDataTypeBadge("HISTORICAL", "small")}
            </div>
            <div className="dinosatEarthCondRadiationSummaryGrid">
              <div className="dinosatEarthCondRadiationGroup">
                <div className="dinosatEarthCondRadiationGroupHeader">Protons (GOES Primary)</div>
                <div className="dinosatEarthCondRadiationGroupStats">
                  <div className="dinosatEarthCondRadiationStat">
                    <span className="dinosatEarthCondRadiationLabel">≥10 MeV</span>
                    <span className="dinosatEarthCondRadiationValue">{historicalRad?.statistics?.proton10MeV?.dataPoints ?? 0} pts</span>
                    {historicalRad?.statistics?.proton10MeV && (
                      <span className="dinosatEarthCondRadiationRange">{historicalRad.statistics.proton10MeV.min !== null && historicalRad.statistics.proton10MeV.min !== undefined ? historicalRad.statistics.proton10MeV.min.toFixed(2) : "—"} - {historicalRad.statistics.proton10MeV.max !== null && historicalRad.statistics.proton10MeV.max !== undefined ? historicalRad.statistics.proton10MeV.max.toFixed(2) : "—"} pfu</span>
                    )}
                  </div>
                  <div className="dinosatEarthCondRadiationStat">
                    <span className="dinosatEarthCondRadiationLabel">≥50 MeV</span>
                    <span className="dinosatEarthCondRadiationValue">{historicalRad?.statistics?.proton50MeV?.dataPoints ?? 0} pts</span>
                    {historicalRad?.statistics?.proton50MeV && (
                      <span className="dinosatEarthCondRadiationRange">{historicalRad.statistics.proton50MeV.min !== null && historicalRad.statistics.proton50MeV.min !== undefined ? historicalRad.statistics.proton50MeV.min.toFixed(2) : "—"} - {historicalRad.statistics.proton50MeV.max !== null && historicalRad.statistics.proton50MeV.max !== undefined ? historicalRad.statistics.proton50MeV.max.toFixed(2) : "—"} pfu</span>
                    )}
                  </div>
                  <div className="dinosatEarthCondRadiationStat">
                    <span className="dinosatEarthCondRadiationLabel">≥100 MeV</span>
                    <span className="dinosatEarthCondRadiationValue">{historicalRad?.statistics?.proton100MeV?.dataPoints ?? 0} pts</span>
                    {historicalRad?.statistics?.proton100MeV && (
                      <span className="dinosatEarthCondRadiationRange">{historicalRad.statistics.proton100MeV.min !== null && historicalRad.statistics.proton100MeV.min !== undefined ? historicalRad.statistics.proton100MeV.min.toFixed(2) : "—"} - {historicalRad.statistics.proton100MeV.max !== null && historicalRad.statistics.proton100MeV.max !== undefined ? historicalRad.statistics.proton100MeV.max.toFixed(2) : "—"} pfu</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="dinosatEarthCondRadiationGroup">
                <div className="dinosatEarthCondRadiationGroupHeader">Electrons (GOES Primary)</div>
                <div className="dinosatEarthCondRadiationGroupStats">
                  <div className="dinosatEarthCondRadiationStat">
                    <span className="dinosatEarthCondRadiationLabel">≥2 MeV (Integral)</span>
                    <span className="dinosatEarthCondRadiationValue">{historicalRad?.statistics?.electron2MeV?.dataPoints ?? 0} pts</span>
                    {historicalRad?.statistics?.electron2MeV && (
                      <span className="dinosatEarthCondRadiationRange">{historicalRad.statistics.electron2MeV.min !== null && historicalRad.statistics.electron2MeV.min !== undefined ? historicalRad.statistics.electron2MeV.min.toFixed(0) : "—"} - {historicalRad.statistics.electron2MeV.max !== null && historicalRad.statistics.electron2MeV.max !== undefined ? historicalRad.statistics.electron2MeV.max.toFixed(0) : "—"} pfu</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="dinosatEarthCondRadiationGroup">
                <div className="dinosatEarthCondRadiationGroupHeader">Neutrons (NMDB Cosmic Ray Monitors)</div>
                <div className="dinosatEarthCondRadiationGroupStats">
                  <div className="dinosatEarthCondRadiationStat">
                    <span className="dinosatEarthCondRadiationLabel">OULU (0.8 GV)</span>
                    <span className="dinosatEarthCondRadiationValue">{historicalRad?.statistics?.neutronOulu?.dataPoints ?? 0} pts</span>
                    {historicalRad?.statistics?.neutronOulu && (
                      <span className="dinosatEarthCondRadiationRange">{historicalRad.statistics.neutronOulu.min !== null && historicalRad.statistics.neutronOulu.min !== undefined ? historicalRad.statistics.neutronOulu.min.toFixed(1) : "—"} - {historicalRad.statistics.neutronOulu.max !== null && historicalRad.statistics.neutronOulu.max !== undefined ? historicalRad.statistics.neutronOulu.max.toFixed(1) : "—"}%</span>
                    )}
                  </div>
                  <div className="dinosatEarthCondRadiationStat">
                    <span className="dinosatEarthCondRadiationLabel">JUNG (4.5 GV)</span>
                    <span className="dinosatEarthCondRadiationValue">{historicalRad?.statistics?.neutronJung?.dataPoints ?? 0} pts</span>
                    {historicalRad?.statistics?.neutronJung && (
                      <span className="dinosatEarthCondRadiationRange">{historicalRad.statistics.neutronJung.min !== null && historicalRad.statistics.neutronJung.min !== undefined ? historicalRad.statistics.neutronJung.min.toFixed(1) : "—"} - {historicalRad.statistics.neutronJung.max !== null && historicalRad.statistics.neutronJung.max !== undefined ? historicalRad.statistics.neutronJung.max.toFixed(1) : "—"}%</span>
                    )}
                  </div>
                  <div className="dinosatEarthCondRadiationStat">
                    <span className="dinosatEarthCondRadiationLabel">NEWK (2.4 GV)</span>
                    <span className="dinosatEarthCondRadiationValue">{historicalRad?.statistics?.neutronNewk?.dataPoints ?? 0} pts</span>
                    {historicalRad?.statistics?.neutronNewk && (
                      <span className="dinosatEarthCondRadiationRange">{historicalRad.statistics.neutronNewk.min !== null && historicalRad.statistics.neutronNewk.min !== undefined ? historicalRad.statistics.neutronNewk.min.toFixed(1) : "—"} - {historicalRad.statistics.neutronNewk.max !== null && historicalRad.statistics.neutronNewk.max !== undefined ? historicalRad.statistics.neutronNewk.max.toFixed(1) : "—"}%</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="dinosatEarthCondRadiationGroup">
                <div className="dinosatEarthCondRadiationGroupHeader">X-ray Flux (GOES)</div>
                <div className="dinosatEarthCondRadiationGroupStats">
                  <div className="dinosatEarthCondRadiationStat">
                    <span className="dinosatEarthCondRadiationLabel">Short (0.05-0.4nm)</span>
                    <span className="dinosatEarthCondRadiationValue">{historicalRad?.statistics?.xrayShort?.dataPoints ?? 0} pts</span>
                    {historicalRad?.statistics?.xrayShort && (
                      <span className="dinosatEarthCondRadiationRange">{historicalRad.statistics.xrayShort.min !== null && historicalRad.statistics.xrayShort.min !== undefined ? historicalRad.statistics.xrayShort.min.toExponential(1) : "—"} - {historicalRad.statistics.xrayShort.max !== null && historicalRad.statistics.xrayShort.max !== undefined ? historicalRad.statistics.xrayShort.max.toExponential(1) : "—"} W/m²</span>
                    )}
                  </div>
                  <div className="dinosatEarthCondRadiationStat">
                    <span className="dinosatEarthCondRadiationLabel">Long (0.1-0.8nm)</span>
                    <span className="dinosatEarthCondRadiationValue">{historicalRad?.statistics?.xrayLong?.dataPoints ?? 0} pts</span>
                    {historicalRad?.statistics?.xrayLong && (
                      <>
                        <span className="dinosatEarthCondRadiationRange">{historicalRad.statistics.xrayLong.min !== null && historicalRad.statistics.xrayLong.min !== undefined ? historicalRad.statistics.xrayLong.min.toExponential(1) : "—"} - {historicalRad.statistics.xrayLong.max !== null && historicalRad.statistics.xrayLong.max !== undefined ? historicalRad.statistics.xrayLong.max.toExponential(1) : "—"} W/m²</span>
                        {(historicalRad.statistics.xrayLong.mClassEvents ?? 0) > 0 && (
                          <span className="dinosatEarthCondRadiationRange">M-class events: {historicalRad.statistics.xrayLong.mClassEvents}</span>
                        )}
                        {(historicalRad.statistics.xrayLong.xClassEvents ?? 0) > 0 && (
                          <span className="dinosatEarthCondRadiationRange">X-class events: {historicalRad.statistics.xrayLong.xClassEvents}</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {(proton10Chart || proton50Chart) && (
          <div className="dinosatEarthCondOverviewGrid">
            {proton10Chart && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerHistorical">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Proton ≥10 MeV History</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(proton10Chart, "dinosatEarthCondChart")}
                <div className="dinosatEarthCondChartDescription">
                  <div className="dinosatEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (7-day observation period)</span>
                    <span><strong>Y-Axis:</strong> Proton Flux ≥10 MeV (pfu)</span>
                  </div>
                  <p className="dinosatEarthCondChartDescriptionText">
                    This chart displays the flux of solar energetic protons with energies ≥10 MeV measured by GOES satellites over the past 7 days. This energy threshold is commonly used for solar proton event (SPE) detection. Flux values exceeding 10 pfu indicate an S1 (Minor) radiation storm, with higher levels triggering more severe classifications. These protons can cause single-event upsets in spacecraft electronics, degrade solar panel performance, and pose radiation hazards during EVA operations.
                  </p>
                </div>
                {historicalRad?.statistics?.proton10MeV && (
                  <div className="dinosatEarthCondStatsSummary">
                    <span>min: {historicalRad.statistics.proton10MeV.min !== null && historicalRad.statistics.proton10MeV.min !== undefined ? historicalRad.statistics.proton10MeV.min.toFixed(2) : "—"} pfu</span>
                    <span>max: {historicalRad.statistics.proton10MeV.max !== null && historicalRad.statistics.proton10MeV.max !== undefined ? historicalRad.statistics.proton10MeV.max.toFixed(2) : "—"} pfu</span>
                    <span>avg: {historicalRad.statistics.proton10MeV.mean !== null && historicalRad.statistics.proton10MeV.mean !== undefined ? historicalRad.statistics.proton10MeV.mean.toFixed(2) : "—"} pfu</span>
                    <span>n={historicalRad.statistics.proton10MeV.dataPoints ?? 0}</span>
                  </div>
                )}
              </div>
            )}
            {proton50Chart && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerHistorical">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Proton ≥50 MeV History</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(proton50Chart, "dinosatEarthCondChart")}
                <div className="dinosatEarthCondChartDescription">
                  <div className="dinosatEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (7-day observation period)</span>
                    <span><strong>Y-Axis:</strong> Proton Flux ≥50 MeV (pfu)</span>
                  </div>
                  <p className="dinosatEarthCondChartDescriptionText">
                    This chart shows the flux of higher-energy solar protons (≥50 MeV) over the past 7 days. These more energetic protons have greater penetrating power and can affect electronics behind shielding that would stop lower-energy particles. Elevated ≥50 MeV flux is particularly concerning for crewed missions and sensitive payloads. The ≥50 MeV channel provides early indication of the hardness spectrum of solar particle events.
                  </p>
                </div>
                {historicalRad?.statistics?.proton50MeV && (
                  <div className="dinosatEarthCondStatsSummary">
                    <span>min: {historicalRad.statistics.proton50MeV.min !== null && historicalRad.statistics.proton50MeV.min !== undefined ? historicalRad.statistics.proton50MeV.min.toFixed(2) : "—"} pfu</span>
                    <span>max: {historicalRad.statistics.proton50MeV.max !== null && historicalRad.statistics.proton50MeV.max !== undefined ? historicalRad.statistics.proton50MeV.max.toFixed(2) : "—"} pfu</span>
                    <span>avg: {historicalRad.statistics.proton50MeV.mean !== null && historicalRad.statistics.proton50MeV.mean !== undefined ? historicalRad.statistics.proton50MeV.mean.toFixed(2) : "—"} pfu</span>
                    <span>n={historicalRad.statistics.proton50MeV.dataPoints ?? 0}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {(proton100Chart || electron2Chart) && (
          <div className="dinosatEarthCondOverviewGrid">
            {proton100Chart && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerHistorical">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Proton ≥100 MeV History</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(proton100Chart, "dinosatEarthCondChart")}
                <div className="dinosatEarthCondChartDescription">
                  <div className="dinosatEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (7-day observation period)</span>
                    <span><strong>Y-Axis:</strong> Proton Flux ≥100 MeV (pfu)</span>
                  </div>
                  <p className="dinosatEarthCondChartDescriptionText">
                    This chart displays the flux of very high-energy protons (≥100 MeV) over the past 7 days. These extremely energetic particles can penetrate substantial shielding and pose the greatest radiation threat to astronauts and sensitive electronics. Ground-level enhancement (GLE) events, where solar protons are detected by surface neutron monitors, require ≥100 MeV protons. Elevated flux at this energy indicates the most severe solar particle events.
                  </p>
                </div>
                {historicalRad?.statistics?.proton100MeV && (
                  <div className="dinosatEarthCondStatsSummary">
                    <span>min: {historicalRad.statistics.proton100MeV.min !== null && historicalRad.statistics.proton100MeV.min !== undefined ? historicalRad.statistics.proton100MeV.min.toFixed(2) : "—"} pfu</span>
                    <span>max: {historicalRad.statistics.proton100MeV.max !== null && historicalRad.statistics.proton100MeV.max !== undefined ? historicalRad.statistics.proton100MeV.max.toFixed(2) : "—"} pfu</span>
                    <span>avg: {historicalRad.statistics.proton100MeV.mean !== null && historicalRad.statistics.proton100MeV.mean !== undefined ? historicalRad.statistics.proton100MeV.mean.toFixed(2) : "—"} pfu</span>
                    <span>n={historicalRad.statistics.proton100MeV.dataPoints ?? 0}</span>
                  </div>
                )}
              </div>
            )}
            {electron2Chart && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerHistorical">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Electron ≥2 MeV History (Integral)</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(electron2Chart, "dinosatEarthCondChart")}
                <div className="dinosatEarthCondChartDescription">
                  <div className="dinosatEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (7-day observation period)</span>
                    <span><strong>Y-Axis:</strong> Electron Flux ≥2 MeV (pfu)</span>
                  </div>
                  <p className="dinosatEarthCondChartDescriptionText">
                    This chart shows relativistic electron flux (≥2 MeV) measured by GOES satellites over the past 7 days. High-energy electrons in the outer radiation belt can cause deep dielectric charging in spacecraft, where charge accumulates in insulating materials and discharges destructively. Flux levels above 1000 pfu indicate enhanced electron belt conditions, while sustained levels above 10000 pfu present significant risk of electrostatic discharge damage to spacecraft components.
                  </p>
                </div>
                {historicalRad?.statistics?.electron2MeV && (
                  <div className="dinosatEarthCondStatsSummary">
                    <span>min: {historicalRad.statistics.electron2MeV.min !== null && historicalRad.statistics.electron2MeV.min !== undefined ? historicalRad.statistics.electron2MeV.min.toFixed(0) : "—"} pfu</span>
                    <span>max: {historicalRad.statistics.electron2MeV.max !== null && historicalRad.statistics.electron2MeV.max !== undefined ? historicalRad.statistics.electron2MeV.max.toFixed(0) : "—"} pfu</span>
                    <span>avg: {historicalRad.statistics.electron2MeV.mean !== null && historicalRad.statistics.electron2MeV.mean !== undefined ? historicalRad.statistics.electron2MeV.mean.toFixed(0) : "—"} pfu</span>
                    <span>n={historicalRad.statistics.electron2MeV.dataPoints ?? 0}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {(neutronJungChart || neutronNewkChart) && (
          <div className="dinosatEarthCondOverviewGrid">
            {neutronJungChart && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerHistorical">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Neutron JUNG History (4.5 GV cutoff)</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(neutronJungChart, "dinosatEarthCondChart")}
                <div className="dinosatEarthCondChartDescription">
                  <div className="dinosatEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (7-day observation period)</span>
                    <span><strong>Y-Axis:</strong> Neutron Count Rate (% deviation from baseline)</span>
                  </div>
                  <p className="dinosatEarthCondChartDescriptionText">
                    This chart displays neutron monitor data from the Jungfraujoch (JUNG) station in Switzerland over the past 7 days. With a geomagnetic cutoff rigidity of 4.5 GV, JUNG responds to higher-energy cosmic rays and solar particles. Neutron monitors detect secondary particles produced when cosmic rays interact with Earth's atmosphere. Sudden increases (Forbush decreases in reverse) indicate ground-level enhancement events from solar particle storms, while gradual decreases indicate galactic cosmic ray modulation by interplanetary disturbances.
                  </p>
                </div>
                {historicalRad?.statistics?.neutronJung && (
                  <div className="dinosatEarthCondStatsSummary">
                    <span>min: {historicalRad.statistics.neutronJung.min !== null && historicalRad.statistics.neutronJung.min !== undefined ? historicalRad.statistics.neutronJung.min.toFixed(1) : "—"}%</span>
                    <span>max: {historicalRad.statistics.neutronJung.max !== null && historicalRad.statistics.neutronJung.max !== undefined ? historicalRad.statistics.neutronJung.max.toFixed(1) : "—"}%</span>
                    <span>avg: {historicalRad.statistics.neutronJung.mean !== null && historicalRad.statistics.neutronJung.mean !== undefined ? historicalRad.statistics.neutronJung.mean.toFixed(1) : "—"}%</span>
                    <span>σ: {historicalRad.statistics.neutronJung.stdDev !== null && historicalRad.statistics.neutronJung.stdDev !== undefined ? historicalRad.statistics.neutronJung.stdDev.toFixed(2) : "—"}%</span>
                    <span>n={historicalRad.statistics.neutronJung.dataPoints ?? 0}</span>
                    <span>coverage: {historicalRad.statistics.neutronJung.coverage || "—"}</span>
                  </div>
                )}
              </div>
            )}
            {neutronNewkChart && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerHistorical">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Neutron NEWK History (2.4 GV cutoff)</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(neutronNewkChart, "dinosatEarthCondChart")}
                <div className="dinosatEarthCondChartDescription">
                  <div className="dinosatEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (7-day observation period)</span>
                    <span><strong>Y-Axis:</strong> Neutron Count Rate (% deviation from baseline)</span>
                  </div>
                  <p className="dinosatEarthCondChartDescriptionText">
                    This chart shows neutron monitor data from the Newark (NEWK) station over the past 7 days. With a lower geomagnetic cutoff rigidity of 2.4 GV compared to JUNG, NEWK is sensitive to a broader range of cosmic ray energies. Comparing data from stations with different cutoff rigidities helps characterize the energy spectrum of solar particle events. Significant deviations from baseline indicate space weather disturbances that affect the radiation environment throughout the magnetosphere.
                  </p>
                </div>
                {historicalRad?.statistics?.neutronNewk && (
                  <div className="dinosatEarthCondStatsSummary">
                    <span>min: {historicalRad.statistics.neutronNewk.min !== null && historicalRad.statistics.neutronNewk.min !== undefined ? historicalRad.statistics.neutronNewk.min.toFixed(1) : "—"}%</span>
                    <span>max: {historicalRad.statistics.neutronNewk.max !== null && historicalRad.statistics.neutronNewk.max !== undefined ? historicalRad.statistics.neutronNewk.max.toFixed(1) : "—"}%</span>
                    <span>avg: {historicalRad.statistics.neutronNewk.mean !== null && historicalRad.statistics.neutronNewk.mean !== undefined ? historicalRad.statistics.neutronNewk.mean.toFixed(1) : "—"}%</span>
                    <span>σ: {historicalRad.statistics.neutronNewk.stdDev !== null && historicalRad.statistics.neutronNewk.stdDev !== undefined ? historicalRad.statistics.neutronNewk.stdDev.toFixed(2) : "—"}%</span>
                    <span>n={historicalRad.statistics.neutronNewk.dataPoints ?? 0}</span>
                    <span>coverage: {historicalRad.statistics.neutronNewk.coverage || "—"}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {(xrayShortChart || xrayLongChart) && (
          <div className="dinosatEarthCondOverviewGrid">
            {xrayShortChart && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerHistorical">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>X-ray Short (0.05-0.4nm) History</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(xrayShortChart, "dinosatEarthCondChart")}
                <div className="dinosatEarthCondChartDescription">
                  <div className="dinosatEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (7-day observation period)</span>
                    <span><strong>Y-Axis:</strong> X-ray Flux 0.05-0.4nm (W/m²)</span>
                  </div>
                  <p className="dinosatEarthCondChartDescriptionText">
                    This chart displays solar X-ray flux in the short wavelength band (0.05-0.4nm) over the past 7 days. This harder X-ray channel responds to the hottest coronal plasma during solar flares and provides information about the impulsive phase of flare events. The ratio between short and long wavelength X-ray channels helps characterize flare temperature and intensity. Elevated short-wavelength flux indicates significant solar activity with potential for associated particle events.
                  </p>
                </div>
                {historicalRad?.statistics?.xrayShort && (
                  <div className="dinosatEarthCondStatsSummary">
                    <span>min: {historicalRad.statistics.xrayShort.min !== null && historicalRad.statistics.xrayShort.min !== undefined ? historicalRad.statistics.xrayShort.min.toExponential(2) : "—"} W/m²</span>
                    <span>max: {historicalRad.statistics.xrayShort.max !== null && historicalRad.statistics.xrayShort.max !== undefined ? historicalRad.statistics.xrayShort.max.toExponential(2) : "—"} W/m²</span>
                    <span>avg: {historicalRad.statistics.xrayShort.mean !== null && historicalRad.statistics.xrayShort.mean !== undefined ? historicalRad.statistics.xrayShort.mean.toExponential(2) : "—"} W/m²</span>
                    <span>n={historicalRad.statistics.xrayShort.dataPoints ?? 0}</span>
                  </div>
                )}
              </div>
            )}
            {xrayLongChart && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerHistorical">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>X-ray Long (0.1-0.8nm) History</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(xrayLongChart, "dinosatEarthCondChart")}
                <div className="dinosatEarthCondChartDescription">
                  <div className="dinosatEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (7-day observation period)</span>
                    <span><strong>Y-Axis:</strong> X-ray Flux 0.1-0.8nm (W/m²)</span>
                  </div>
                  <p className="dinosatEarthCondChartDescriptionText">
                    This chart shows solar X-ray flux in the long wavelength band (0.1-0.8nm) over the past 7 days. This channel is used for the standard solar flare classification system: A, B, C, M, and X classes based on peak flux levels. M-class flares (≥10⁻⁵ W/m²) can cause brief HF radio blackouts, while X-class flares (≥10⁻⁴ W/m²) may cause significant ionospheric disturbances affecting GPS and communications. Flare events are identified as spikes in this time series.
                  </p>
                </div>
                {historicalRad?.statistics?.xrayLong && (
                  <div className="dinosatEarthCondStatsSummary">
                    <span>min: {historicalRad.statistics.xrayLong.min !== null && historicalRad.statistics.xrayLong.min !== undefined ? historicalRad.statistics.xrayLong.min.toExponential(2) : "—"} W/m²</span>
                    <span>max: {historicalRad.statistics.xrayLong.max !== null && historicalRad.statistics.xrayLong.max !== undefined ? historicalRad.statistics.xrayLong.max.toExponential(2) : "—"} W/m²</span>
                    <span>avg: {historicalRad.statistics.xrayLong.mean !== null && historicalRad.statistics.xrayLong.mean !== undefined ? historicalRad.statistics.xrayLong.mean.toExponential(2) : "—"} W/m²</span>
                    <span>n={historicalRad.statistics.xrayLong.dataPoints ?? 0}</span>
                    {(historicalRad.statistics.xrayLong.mClassEvents ?? 0) > 0 && <span>M-class: {historicalRad.statistics.xrayLong.mClassEvents}</span>}
                    {(historicalRad.statistics.xrayLong.xClassEvents ?? 0) > 0 && <span>X-class: {historicalRad.statistics.xrayLong.xClassEvents}</span>}
                  </div>
                )}
              </div>
            )}
          </div>
        )}



      </div>
    );
  };

  const renderTemporalForensicsTab = () => {
    const data = getModuleData("temporalForensics") || {};
    if (!data || Object.keys(data).length === 0) return <div className="dinosatEarthCondLoadingState">No Temporal data</div>;

    const windSpeedForecast = data.probabilityCone?.windSpeed?.forecast || [];
    const precipForecast = data.probabilityCone?.precipitation?.forecast || [];
    const kpIndexForecast = data.probabilityCone?.kpIndex?.forecast || [];

    const windForecastChart = windSpeedForecast.length > 0 ? createDynamicLineChart("Wind Forecast", windSpeedForecast, "time", "mean", " m/s", "#22c55e", true) : null;
    const precipForecastChart = precipForecast.length > 0 ? createDynamicLineChart("Precipitation Probability", precipForecast, "time", "probability", "%", "#6366f1", true) : null;
    const kpForecastChart = kpIndexForecast.length > 0 ? createDynamicLineChart("Kp Forecast", kpIndexForecast, "time", "mean", "", "#7c3aed", true) : null;

    const violationsObj = data.probabilisticOutcomes?.violations || {};
    const violationsEntries = Object.entries(violationsObj);
    const weatherFronts = data.sensorValidation?.weatherFronts || [];
    const driftAlerts = data.sensorValidation?.drift || [];
    const dataQuality = data.sensorValidation?.dataQuality || [];

    const coastalMesoscale = data.coastalMesoscale || {};
    const acousticPropagation = data.acousticPropagation || {};
    const radiationEnvironment = data.radiationEnvironment || {};
    const extendedForecasts = data.extendedForecasts || {};

    const historicalGradients = coastalMesoscale.historicalGradients || [];
    const marineLayerData = coastalMesoscale.marineLayerData || [];
    const soundSpeedProfile = acousticPropagation.soundSpeedProfile || [];
    const geomagneticData = extendedForecasts.geomagnetic || [];
    const differentialElectrons = radiationEnvironment.differentialElectrons || [];
    const differentialProtons = radiationEnvironment.differentialProtons || [];
    const historicalRadiation = radiationEnvironment.historicalRadiation || [];
    const atmosphericForecast = extendedForecasts.atmospheric || [];
    const marineForecast = extendedForecasts.marineForecast || [];

    const landSeaGradientChart = historicalGradients.length > 0 ? createDynamicLineChart("Land-Sea Temp Gradient", historicalGradients.slice(-48), "timestamp", "gradient", " °C", "#f59e0b", false) : null;
    const marineLayerChart = marineLayerData.length > 0 ? createDynamicLineChart("Marine Layer Depth", marineLayerData.slice(-48), "timestamp", "depth", " m", "#0ea5e9", false) : null;

    const soundSpeedChart = soundSpeedProfile.length > 0 ? createDynamicLineChart("Sound Speed Profile", soundSpeedProfile, "altitude", "soundSpeed", " m/s", "#8b5cf6", false) : null;

    const geomagneticChart = geomagneticData.length > 0 ? createDynamicLineChart("Geomagnetic History (Kp)", geomagneticData.slice(-100), "timestamp", "value", "", "#7c3aed", false) : null;

    const diffElectronChart = differentialElectrons.length > 0 ? createDynamicLineChart("Differential Electrons", differentialElectrons.slice(-100), "timestamp", (d) => {
      if (!d) return 0;
      const keys = Object.keys(d).filter(k => k.startsWith("flux_"));
      return keys.length > 0 && d[keys[0]] !== null && d[keys[0]] !== undefined ? d[keys[0]] : 0;
    }, " e/cm²-s-sr-keV", "#22c55e", false) : null;

    const diffProtonChart = differentialProtons.length > 0 ? createDynamicLineChart("Differential Protons", differentialProtons.slice(-100), "timestamp", (d) => {
      if (!d) return 0;
      const keys = Object.keys(d).filter(k => k.startsWith("flux_"));
      return keys.length > 0 && d[keys[0]] !== null && d[keys[0]] !== undefined ? d[keys[0]] : 0;
    }, " p/cm²-s-sr-MeV", "#f59e0b", false) : null;

    const radiationBeltChart = historicalRadiation.length > 0 ? createDynamicLineChart("Radiation Belt Electrons (7d)", historicalRadiation.slice(-200), "timestamp", "flux", " e/cm²-s-sr", "#7c3aed", false) : null;

    const extAtmoTempChart = atmosphericForecast.length > 0 ? createDynamicLineChart("Extended Temperature Forecast", atmosphericForecast.filter(d => d && d.temperature !== null && d.temperature !== undefined).slice(0, 72), "timestamp", "temperature", " °C", "#f59e0b", true) : null;
    const extAtmoPrecipChart = atmosphericForecast.length > 0 ? createDynamicLineChart("Extended Precip Probability", atmosphericForecast.filter(d => d && d.precipitationProb !== null && d.precipitationProb !== undefined).slice(0, 72), "timestamp", "precipitationProb", "%", "#6366f1", true) : null;

    const extMarineWaveChart = marineForecast.length > 0 ? createDynamicLineChart("Wave Height Forecast (72h)", marineForecast.filter(d => d && d.waveHeight !== null && d.waveHeight !== undefined).slice(0, 72), "timestamp", "waveHeight", " m", "#0ea5e9", true) : null;
    const extMarineSSTChart = marineForecast.length > 0 ? createDynamicLineChart("Sea Surface Temp Forecast", marineForecast.filter(d => d && d.seaSurfaceTemperature !== null && d.seaSurfaceTemperature !== undefined).slice(0, 72), "timestamp", "seaSurfaceTemperature", " °C", "#22c55e", true) : null;

    const getProbabilityColor = (prob) => {
      const p = prob ?? 0;
      if (p >= 0.5) return "#7c3aed";
      if (p >= 0.3) return "#8b5cf6";
      if (p >= 0.1) return "#6366f1";
      return "#22c55e";
    };

    const getRiskColor = (risk) => {
      const r = risk ?? 0;
      if (r >= 0.7) return "#7c3aed";
      if (r >= 0.5) return "#8b5cf6";
      if (r >= 0.3) return "#f59e0b";
      return "#22c55e";
    };

    return (
      <div className="dinosatEarthCondModuleTab">
        <div className="dinosatEarthCondSectionDivider">
          <div className="dinosatEarthCondSectionDividerLine" />
          <span className="dinosatEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faHourglassHalf} />
            Probabilistic Violation Forecasts
          </span>
          <div className="dinosatEarthCondSectionDividerLine" />
        </div>
        <div className="dinosatEarthCondOverviewGrid">
          <div className="dinosatEarthCondPanelSingle dinosatEarthCondFullWidth dinosatEarthCondChartContainerForecast">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Probabilistic Violation Forecast</h4>
              {renderDataTypeBadge("PROBABILISTIC", "small")}
            </div>
            <div className="dinosatEarthCondForecastNotice dinosatEarthCondForecastNoticeProbabilistic">
              <FontAwesomeIcon icon={faHourglassHalf} />
              <span>These values represent statistical probabilities of future constraint violations, not current measurements. Time offsets (T+1h, T+2h, etc.) indicate hours from now.</span>
            </div>
            {violationsEntries.length > 0 ? (
              <div className="dinosatEarthCondTableCard dinosatEarthCondTableCardForecast">
                <table className="dinosatEarthCondDataTable dinosatEarthCondDataTableForecast">
                  <thead>
                    <tr>
                      <th>Time Offset</th>
                      <th>Combined Prob</th>
                      <th>Primary Risk</th>
                      <th>Wind Prob</th>
                      <th>Kp Prob</th>
                      <th>Precip Prob</th>
                      <th>Proj. Wind</th>
                      <th>Proj. Kp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {violationsEntries.map(([time, v]) => (
                      <tr key={time} className="dinosatEarthCondForecastRow">
                        <td className="dinosatEarthCondTimeOffset">
                          <FontAwesomeIcon icon={faClock} style={{ marginRight: "4px", color: "#6366f1" }} />
                          {time}
                        </td>
                        <td style={{ color: getProbabilityColor(v?.probability), fontWeight: "bold" }}>
                          {v?.probability !== null && v?.probability !== undefined ? `${(v.probability * 100).toFixed(1)}%` : "—"}
                        </td>
                        <td>
                          <span className={`dinosatEarthCondRiskType dinosatEarthCondRiskType${v?.type || "NOMINAL"}`}>
                            {v?.type?.replace(/_/g, " ") || "—"}
                          </span>
                        </td>
                        <td style={{ color: getProbabilityColor(v?.windComponent) }}>
                          {v?.windComponent !== undefined && v?.windComponent !== null ? `${(v.windComponent * 100).toFixed(1)}%` : "—"}
                        </td>
                        <td style={{ color: getProbabilityColor(v?.kpComponent) }}>
                          {v?.kpComponent !== undefined && v?.kpComponent !== null ? `${(v.kpComponent * 100).toFixed(1)}%` : "—"}
                        </td>
                        <td style={{ color: getProbabilityColor(v?.precipComponent) }}>
                          {v?.precipComponent !== undefined && v?.precipComponent !== null ? `${(v.precipComponent * 100).toFixed(1)}%` : "—"}
                        </td>
                        <td className="dinosatEarthCondProjectedValue">{v?.projectedWind !== null && v?.projectedWind !== undefined ? `${v.projectedWind} m/s` : "—"}</td>
                        <td className="dinosatEarthCondProjectedValue">{v?.projectedKp !== null && v?.projectedKp !== undefined ? v.projectedKp.toFixed(2) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="dinosatEarthCondNoChartData">No violation forecast data - awaiting API response.</div>
            )}
          </div>
        </div>
        <div className="dinosatEarthCondSectionDivider">
          <div className="dinosatEarthCondSectionDividerLine" />
          <span className="dinosatEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faChartLine} />
            Trend Analysis
          </span>
          <div className="dinosatEarthCondSectionDividerLine" />
        </div>
        <div className="dinosatEarthCondOverviewGrid">
          <div className="dinosatEarthCondPanelSingle dinosatEarthCondChartContainerTrend">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Parameter Trends</h4>
              {renderDataTypeBadge("TREND", "small")}
            </div>
            <div className="dinosatEarthCondForecastNotice">
              <FontAwesomeIcon icon={faChartLine} />
              <span>Current values with calculated rate of change and projected direction</span>
            </div>
            {renderDataTable("Parameters", ["Parameter", "Rate (Trend)", "Direction", "Current (Live)"], [
              ["Wind Speed", data.trendLines?.wind?.derivative !== null && data.trendLines?.wind?.derivative !== undefined ? `${data.trendLines.wind.derivative.toFixed(3)} m/s/h` : "—", data.trendLines?.wind?.forecast ?? "—", data.trendLines?.wind?.currentValue !== null && data.trendLines?.wind?.currentValue !== undefined ? `${data.trendLines.wind.currentValue.toFixed(1)} m/s` : "—"],
              ["Kp Index", data.trendLines?.kp?.derivative !== null && data.trendLines?.kp?.derivative !== undefined ? `${data.trendLines.kp.derivative.toFixed(3)} /h` : "—", data.trendLines?.kp?.derivative !== null && data.trendLines?.kp?.derivative !== undefined ? (data.trendLines.kp.derivative > 0.1 ? "INCREASING" : data.trendLines.kp.derivative < -0.1 ? "DECREASING" : "STABLE") : "—", data.trendLines?.kp?.currentValue !== null && data.trendLines?.kp?.currentValue !== undefined ? data.trendLines.kp.currentValue.toFixed(1) : "—"],
              ["Wind Shear", data.trendLines?.shear?.derivative !== null && data.trendLines?.shear?.derivative !== undefined ? `${data.trendLines.shear.derivative.toFixed(3)} /h` : "—", data.trendLines?.shear?.forecast ?? "—", "—"]
            ])}
          </div>
        </div>

        <div className="dinosatEarthCondSectionDivider">
          <div className="dinosatEarthCondSectionDividerLine" />
          <span className="dinosatEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faCloudShowersHeavy} />
            Weather Fronts & Boundaries
          </span>
          <div className="dinosatEarthCondSectionDividerLine" />
        </div>
        <div className="dinosatEarthCondOverviewGrid">
          <div className="dinosatEarthCondPanelSingle dinosatEarthCondFullWidth dinosatEarthCondChartContainerForecast">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Weather Fronts & Boundaries ({weatherFronts.length})</h4>
              {renderDataTypeBadge("FORECAST", "small")}
            </div>
            <div className="dinosatEarthCondForecastNotice">
              <FontAwesomeIcon icon={faCloudShowersHeavy} />
              <span>Predicted weather boundaries that may affect launch conditions</span>
            </div>
            {weatherFronts.length > 0 ? (
              <div className="dinosatEarthCondTableCard dinosatEarthCondTableCardForecast">
                <table className="dinosatEarthCondDataTable">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Type</th>
                      <th>Intensity</th>
                      <th>Temp Δ</th>
                      <th>Wind Dir Δ</th>
                      <th>Pressure Δ</th>
                      <th>Indicators</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weatherFronts.map((front, i) => {
                      const intensityColor = front?.intensity === "STRONG" ? "#7c3aed" : front?.intensity === "MODERATE" ? "#8b5cf6" : "#6366f1";
                      return (
                        <tr key={i} className="dinosatEarthCondForecastRow">
                          <td className="dinosatEarthCondTimeOffset">
                            <FontAwesomeIcon icon={faClock} style={{ marginRight: "4px", color: "#6366f1" }} />
                            {front?.time || "—"}
                          </td>
                          <td>{front?.type?.replace(/_/g, " ") || "—"}</td>
                          <td style={{ color: intensityColor, fontWeight: "bold" }}>{front?.intensity || "—"}</td>
                          <td>{front?.tempChange !== undefined && front?.tempChange !== null ? `${front.tempChange.toFixed(1)}°C` : "—"}</td>
                          <td>{front?.windDirChange !== undefined && front?.windDirChange !== null ? `${front.windDirChange}°` : "—"}</td>
                          <td>{front?.pressureChange !== undefined && front?.pressureChange !== null ? `${front.pressureChange.toFixed(1)} hPa` : "—"}</td>
                          <td className="dinosatEarthCondIndicatorsList">{front?.indicators?.join(", ") || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="dinosatEarthCondNoChartData">
                <FontAwesomeIcon icon={faSquareCheck} style={{ color: "#22c55e", marginRight: "8px" }} />
                No significant weather fronts or boundaries detected in forecast period.
              </div>
            )}
          </div>
        </div>
        <div className="dinosatEarthCondSectionDivider">
          <div className="dinosatEarthCondSectionDividerLine" />
          <span className="dinosatEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faWater} style={{ color: "#0ea5e9" }} />
            Coastal Mesoscale - Current Analysis
          </span>
          <div className="dinosatEarthCondSectionDividerLine" />
        </div>
        <div className="dinosatEarthCondOverviewGrid">
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerLive">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Sea Breeze Front</h4>
              {renderDataTypeBadge("COMPUTED", "small")}
            </div>
            {coastalMesoscale.seaBreezeFront ? (
              <>
                <div className="dinosatEarthCondRiskGauge">
                  <div className="dinosatEarthCondGaugeValue" style={{ color: getProbabilityColor((coastalMesoscale.seaBreezeFront.probability ?? 0) / 100) }}>
                    {coastalMesoscale.seaBreezeFront.probability !== null && coastalMesoscale.seaBreezeFront.probability !== undefined ? coastalMesoscale.seaBreezeFront.probability.toFixed(0) : "—"}%
                  </div>
                  <div className="dinosatEarthCondGaugeLabel">Sea Breeze Probability</div>
                  <div className="dinosatEarthCondGaugeBar">
                    <div className="dinosatEarthCondGaugeFill" style={{
                      width: `${coastalMesoscale.seaBreezeFront.probability ?? 0}%`,
                      backgroundColor: getProbabilityColor((coastalMesoscale.seaBreezeFront.probability ?? 0) / 100)
                    }} />
                  </div>
                </div>
                {renderDataTable("Front Status", ["Parameter", "Value"], [
                  ["Expected Timing", coastalMesoscale.seaBreezeFront.expectedTiming || "—"],
                  ["Front Position", coastalMesoscale.seaBreezeFront.frontPosition || "—"]
                ])}
              </>
            ) : (
              <div className="dinosatEarthCondNoChartData">No sea breeze front data available.</div>
            )}
          </div>
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerLive">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Land-Sea Temperature Gradient</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {coastalMesoscale.landSeaGradient ? (
              <>
                <div className="dinosatEarthCondRiskGauge">
                  <div className="dinosatEarthCondGaugeValue" style={{ color: Math.abs(coastalMesoscale.landSeaGradient.value ?? 0) > 5 ? "#f59e0b" : "#22c55e" }}>
                    {coastalMesoscale.landSeaGradient.value !== null && coastalMesoscale.landSeaGradient.value !== undefined ? ((coastalMesoscale.landSeaGradient.value > 0 ? "+" : "") + coastalMesoscale.landSeaGradient.value.toFixed(1)) : "—"}°C
                  </div>
                  <div className="dinosatEarthCondGaugeLabel">Gradient (Land - Sea)</div>
                </div>
                {renderDataTable("Temperatures", ["Parameter", "Value", "Unit"], [
                  ["Land Temperature", coastalMesoscale.landSeaGradient.landTemp !== null && coastalMesoscale.landSeaGradient.landTemp !== undefined ? coastalMesoscale.landSeaGradient.landTemp.toFixed(1) : "—", "°C"],
                  ["Sea Temperature", coastalMesoscale.landSeaGradient.seaTemp !== null && coastalMesoscale.landSeaGradient.seaTemp !== undefined ? coastalMesoscale.landSeaGradient.seaTemp.toFixed(1) : "—", "°C"],
                  ["Gradient", coastalMesoscale.landSeaGradient.value !== null && coastalMesoscale.landSeaGradient.value !== undefined ? coastalMesoscale.landSeaGradient.value.toFixed(2) : "—", "°C"]
                ])}
              </>
            ) : (
              <div className="dinosatEarthCondNoChartData">No land-sea gradient data available.</div>
            )}
          </div>
        </div>
        <div className="dinosatEarthCondOverviewGrid">
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerComputed">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Thermal Circulation</h4>
              {renderDataTypeBadge("COMPUTED", "small")}
            </div>
            {coastalMesoscale.thermalCirculation ? (
              <>
                <div className="dinosatEarthCondRiskGauge">
                  <div className="dinosatEarthCondGaugeValue" style={{ color: (coastalMesoscale.thermalCirculation.strength ?? 0) > 0.5 ? "#8b5cf6" : "#22c55e" }}>
                    {coastalMesoscale.thermalCirculation.strength !== null && coastalMesoscale.thermalCirculation.strength !== undefined ? ((coastalMesoscale.thermalCirculation.strength * 100).toFixed(0)) : "—"}%
                  </div>
                  <div className="dinosatEarthCondGaugeLabel">{coastalMesoscale.thermalCirculation.type || "Thermal Circulation"}</div>
                  <div className="dinosatEarthCondGaugeBar">
                    <div className="dinosatEarthCondGaugeFill" style={{
                      width: `${(coastalMesoscale.thermalCirculation.strength ?? 0) * 100}%`,
                      backgroundColor: (coastalMesoscale.thermalCirculation.strength ?? 0) > 0.5 ? "#8b5cf6" : "#22c55e"
                    }} />
                  </div>
                </div>
                {renderDataTable("Circulation Parameters", ["Parameter", "Value"], [
                  ["Circulation Type", coastalMesoscale.thermalCirculation.type || "—"],
                  ["Strength Index", coastalMesoscale.thermalCirculation.strength !== null && coastalMesoscale.thermalCirculation.strength !== undefined ? coastalMesoscale.thermalCirculation.strength.toFixed(3) : "—"],
                  ["Driving Gradient", `${coastalMesoscale.thermalCirculation.gradient !== null && coastalMesoscale.thermalCirculation.gradient !== undefined ? coastalMesoscale.thermalCirculation.gradient.toFixed(1) : "—"} °C`]
                ])}
              </>
            ) : (
              <div className="dinosatEarthCondNoChartData">No thermal circulation data available.</div>
            )}
          </div>
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerComputed">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Onshore Flow & Convergence</h4>
              {renderDataTypeBadge("COMPUTED", "small")}
            </div>
            {coastalMesoscale.onshoreFlow ? (
              <>
                {renderDataTable("Flow Parameters", ["Parameter", "Value", "Unit", "Status"], [
                  ["Onshore Flow Intensity", coastalMesoscale.onshoreFlow.intensity !== null && coastalMesoscale.onshoreFlow.intensity !== undefined ? coastalMesoscale.onshoreFlow.intensity.toFixed(1) : "—", "m/s", (coastalMesoscale.onshoreFlow.intensity ?? 0) > 8 ? "STRONG" : (coastalMesoscale.onshoreFlow.intensity ?? 0) > 4 ? "MODERATE" : "WEAK"],
                  ["Convergence Index", coastalMesoscale.onshoreFlow.convergenceIndex !== null && coastalMesoscale.onshoreFlow.convergenceIndex !== undefined ? coastalMesoscale.onshoreFlow.convergenceIndex.toFixed(3) : "—", "", (coastalMesoscale.onshoreFlow.convergenceIndex ?? 0) > 0.5 ? "ELEVATED" : "NOMINAL"]
                ])}
                {(coastalMesoscale.onshoreFlow.convergenceIndex ?? 0) > 0 && (
                  <div className="dinosatEarthCondRiskGauge">
                    <div className="dinosatEarthCondGaugeValue" style={{ color: (coastalMesoscale.onshoreFlow.convergenceIndex ?? 0) > 0.5 ? "#8b5cf6" : "#22c55e" }}>
                      {coastalMesoscale.onshoreFlow.convergenceIndex !== null && coastalMesoscale.onshoreFlow.convergenceIndex !== undefined ? ((coastalMesoscale.onshoreFlow.convergenceIndex * 100).toFixed(0)) : "—"}%
                    </div>
                    <div className="dinosatEarthCondGaugeLabel">Convergence Index</div>
                    <div className="dinosatEarthCondGaugeBar">
                      <div className="dinosatEarthCondGaugeFill" style={{
                        width: `${(coastalMesoscale.onshoreFlow.convergenceIndex ?? 0) * 100}%`,
                        backgroundColor: (coastalMesoscale.onshoreFlow.convergenceIndex ?? 0) > 0.5 ? "#8b5cf6" : "#22c55e"
                      }} />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="dinosatEarthCondNoChartData">No onshore flow data available.</div>
            )}
          </div>
        </div>
        {((coastalMesoscale.convergenceZones && coastalMesoscale.convergenceZones.length > 0) || landSeaGradientChart) && (
          <div className="dinosatEarthCondOverviewGrid">
            {coastalMesoscale.convergenceZones?.length > 0 && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerComputed">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Convergence Zones ({coastalMesoscale.convergenceZones.length})</h4>
                  {renderDataTypeBadge("COMPUTED", "small")}
                </div>
                {renderDataTable("Detected Zones", ["Type", "Index", "Location"],
                  coastalMesoscale.convergenceZones.map(zone => [
                    zone?.type?.replace(/_/g, " ") || "—",
                    zone?.index !== null && zone?.index !== undefined ? zone.index.toFixed(3) : "—",
                    zone?.location || "—"
                  ])
                )}
              </div>
            )}
            {landSeaGradientChart && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerHistorical">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Land-Sea Gradient History (48h)</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(landSeaGradientChart, "dinosatEarthCondChart")}
                <div className="dinosatEarthCondChartDescription">
                  <div className="dinosatEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (48-hour observation period)</span>
                    <span><strong>Y-Axis:</strong> Temperature Gradient (°C)</span>
                  </div>
                  <p className="dinosatEarthCondChartDescriptionText">
                    This chart displays the temperature differential between land and sea surfaces over the past 48 hours. The land-sea gradient is a primary driver of coastal mesoscale circulations including sea breezes and land breezes. Larger positive gradients indicate warmer land relative to sea, promoting onshore flow development. Understanding gradient evolution helps predict wind shift timing and intensity changes that may affect launch operations at coastal facilities.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
        {marineLayerChart && (
          <div className="dinosatEarthCondOverviewGrid">
            <div className="dinosatEarthCondPanelSingle dinosatEarthCondChartContainerHistorical">
              <div className="dinosatEarthCondChartHeaderWithBadge">
                <h4>Marine Layer Depth History (48h)</h4>
                {renderDataTypeBadge("HISTORICAL", "small")}
              </div>
              {renderDynamicChart(marineLayerChart, "dinosatEarthCondChart")}
              <div className="dinosatEarthCondChartDescription">
                <div className="dinosatEarthCondChartAxesInfo">
                  <span><strong>X-Axis:</strong> Time (48-hour observation period)</span>
                  <span><strong>Y-Axis:</strong> Marine Layer Depth (m)</span>
                </div>
                <p className="dinosatEarthCondChartDescriptionText">
                  This chart tracks the vertical extent of the marine layer over the past 48 hours. The marine layer is a cool, moist air mass that forms over ocean surfaces and can extend inland at coastal launch sites. Marine layer depth affects visibility conditions, low-level wind shear characteristics, and temperature inversion strength. Deeper marine layers may indicate persistent low cloud conditions and reduced visibility that could impact optical tracking systems and launch commit criteria.
                </p>
              </div>
            </div>
          </div>
        )}
        {marineLayerData.length > 0 && (
          <div className="dinosatEarthCondOverviewGrid">
            <div className="dinosatEarthCondPanelSingle dinosatEarthCondFullWidth dinosatEarthCondChartContainerHistorical">
              <div className="dinosatEarthCondChartHeaderWithBadge">
                <h4>Marine Layer Profile ({marineLayerData.length} hours)</h4>
                {renderDataTypeBadge("HISTORICAL", "small")}
              </div>
              {renderDataTable("Marine Layer Data", ["Time", "Depth (m)", "Inversion Strength", "Surface T (°C)", "850hPa T (°C)"],
                marineLayerData.slice(-24).map(ml => [
                  ml?.timestamp ? new Date(ml.timestamp).toLocaleTimeString() : "—",
                  ml?.depth !== null && ml?.depth !== undefined ? ml.depth.toFixed(0) : "—",
                  ml?.inversionStrength !== null && ml?.inversionStrength !== undefined ? ml.inversionStrength.toFixed(2) : "—",
                  ml?.surfaceTemp !== null && ml?.surfaceTemp !== undefined ? ml.surfaceTemp.toFixed(1) : "—",
                  ml?.temp850hPa !== null && ml?.temp850hPa !== undefined ? ml.temp850hPa.toFixed(1) : "—"
                ])
              )}
            </div>
          </div>
        )}
        <div className="dinosatEarthCondSectionDivider">
          <div className="dinosatEarthCondSectionDividerLine" />
          <span className="dinosatEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faWaveSquare} style={{ color: "#8b5cf6" }} />
            Acoustic Propagation Analysis
          </span>
          <div className="dinosatEarthCondSectionDividerLine" />
        </div>
        <div className="dinosatEarthCondOverviewGrid">
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerComputed">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Community Noise Risk</h4>
              {renderDataTypeBadge("COMPUTED", "small")}
            </div>
            {acousticPropagation.communityNoiseRisk ? (
              <>
                {acousticPropagation.communityNoiseRisk.factors && (
                  <div className="dinosatEarthCondTableCard">
                    <h3>Contributing Factors</h3>
                    <table className="dinosatEarthCondDataTable">
                      <thead><tr><th>Factor</th><th>Contribution</th></tr></thead>
                      <tbody>
                        <tr><td>Ducting</td><td>{acousticPropagation.communityNoiseRisk.factors.ductingContribution !== null && acousticPropagation.communityNoiseRisk.factors.ductingContribution !== undefined ? (acousticPropagation.communityNoiseRisk.factors.ductingContribution * 100).toFixed(1) : "—"}%</td></tr>
                        <tr><td>Focusing</td><td>{acousticPropagation.communityNoiseRisk.factors.focusingContribution !== null && acousticPropagation.communityNoiseRisk.factors.focusingContribution !== undefined ? (acousticPropagation.communityNoiseRisk.factors.focusingContribution * 100).toFixed(1) : "—"}%</td></tr>
                        <tr><td>Wind</td><td>{acousticPropagation.communityNoiseRisk.factors.windContribution !== null && acousticPropagation.communityNoiseRisk.factors.windContribution !== undefined ? (acousticPropagation.communityNoiseRisk.factors.windContribution * 100).toFixed(1) : "—"}%</td></tr>
                        <tr><td>Inversion</td><td>{acousticPropagation.communityNoiseRisk.factors.inversionContribution !== null && acousticPropagation.communityNoiseRisk.factors.inversionContribution !== undefined ? (acousticPropagation.communityNoiseRisk.factors.inversionContribution * 100).toFixed(1) : "—"}%</td></tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <div className="dinosatEarthCondNoChartData">No community noise risk data available.</div>
            )}
          </div>
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerComputed">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Community Noise Risk</h4>
              {renderDataTypeBadge("COMPUTED", "small")}
            </div>
            {acousticPropagation.communityNoiseRisk ? (
              <>
                <div className="dinosatEarthCondRiskGauge">
                  <div className="dinosatEarthCondGaugeValue" style={{ color: getRiskColor(acousticPropagation.communityNoiseRisk.index) }}>
                    {acousticPropagation.communityNoiseRisk.index !== null && acousticPropagation.communityNoiseRisk.index !== undefined ? ((acousticPropagation.communityNoiseRisk.index * 100).toFixed(0)) : "—"}%
                  </div>
                  <div className="dinosatEarthCondGaugeLabel">Community Noise Risk Index</div>
                  <div className="dinosatEarthCondGaugeBar">
                    <div className="dinosatEarthCondGaugeFill" style={{
                      width: `${(acousticPropagation.communityNoiseRisk.index ?? 0) * 100}%`,
                      backgroundColor: getRiskColor(acousticPropagation.communityNoiseRisk.index)
                    }} />
                  </div>
                </div>
              </>
            ) : (
              <div className="dinosatEarthCondNoChartData">No community noise risk data available.</div>
            )}
          </div>
        </div>
        <div className="dinosatEarthCondOverviewGrid">
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerComputed">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Refraction Analysis</h4>
              {renderDataTypeBadge("COMPUTED", "small")}
            </div>
            {acousticPropagation.refraction ? (
              renderDataTable("Refraction Parameters", ["Parameter", "Value", "Status"], [
                ["Refraction Coefficient", acousticPropagation.refraction.coefficient !== null && acousticPropagation.refraction.coefficient !== undefined ? acousticPropagation.refraction.coefficient.toFixed(3) : "—", (acousticPropagation.refraction.coefficient ?? 1) > 1.1 || (acousticPropagation.refraction.coefficient ?? 1) < 0.9 ? "SIGNIFICANT" : "NOMINAL"],
                ["Sound Speed Gradient", `${acousticPropagation.refraction.gradient !== null && acousticPropagation.refraction.gradient !== undefined ? acousticPropagation.refraction.gradient.toFixed(2) : "—"} m/s/km`, Math.abs(acousticPropagation.refraction.gradient ?? 0) > 10 ? "STRONG" : "MODERATE"],
                ["Inversion Detected", acousticPropagation.refraction.inversionDetected ? "YES" : "NO", acousticPropagation.refraction.inversionDetected ? "PRESENT" : "ABSENT"],
                ["Inversion Altitude", acousticPropagation.refraction.inversionAltitude ? `${acousticPropagation.refraction.inversionAltitude} m` : "—", acousticPropagation.refraction.inversionAltitude ? "DETECTED" : "—"]
              ])
            ) : (
              <div className="dinosatEarthCondNoChartData">No refraction data available.</div>
            )}
          </div>
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerComputed">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Acoustic Ducting</h4>
              {renderDataTypeBadge("COMPUTED", "small")}
            </div>
            {acousticPropagation.ductingProbability !== null && acousticPropagation.ductingProbability !== undefined ? (
              <>
                <div className="dinosatEarthCondRiskGauge">
                  <div className="dinosatEarthCondGaugeValue" style={{ color: (acousticPropagation.ductingProbability ?? 0) > 50 ? "#8b5cf6" : "#22c55e" }}>
                    {acousticPropagation.ductingProbability.toFixed(0)}%
                  </div>
                  <div className="dinosatEarthCondGaugeLabel">Ducting Probability</div>
                  <div className="dinosatEarthCondGaugeBar">
                    <div className="dinosatEarthCondGaugeFill" style={{
                      width: `${acousticPropagation.ductingProbability ?? 0}%`,
                      backgroundColor: (acousticPropagation.ductingProbability ?? 0) > 50 ? "#8b5cf6" : "#22c55e"
                    }} />
                  </div>
                </div>
              </>
            ) : (
              <div className="dinosatEarthCondNoChartData">No ducting probability data available.</div>
            )}
          </div>
        </div>
        <div className="dinosatEarthCondOverviewGrid">
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerComputed">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Sonic Boom Footprint</h4>
              {renderDataTypeBadge("COMPUTED", "small")}
            </div>
            {acousticPropagation.sonicBoomFootprint ? (
              <>
                {renderDataTable("Sonic Boom", ["Parameter", "Value"], [
                  ["Amplification", acousticPropagation.sonicBoomFootprint.amplification || "—"],
                  ["Atmospheric Conditions", acousticPropagation.sonicBoomFootprint.atmosphericConditions?.replace(/_/g, " ") || "—"]
                ])}
              </>
            ) : (
              <div className="dinosatEarthCondNoChartData">No sonic boom footprint data available.</div>
            )}
          </div>

          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerComputed">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Sonic Boom Footprint</h4>
              {renderDataTypeBadge("COMPUTED", "small")}
            </div>
            {acousticPropagation.sonicBoomFootprint ? (
              <>
                <div className="dinosatEarthCondRiskGauge">
                  <div className="dinosatEarthCondGaugeValue" style={{ color: (acousticPropagation.sonicBoomFootprint.focusFactor ?? 0) > 1.3 ? "#8b5cf6" : "#22c55e" }}>
                    {acousticPropagation.sonicBoomFootprint.focusFactor !== null && acousticPropagation.sonicBoomFootprint.focusFactor !== undefined ? acousticPropagation.sonicBoomFootprint.focusFactor.toFixed(2) : "—"}x
                  </div>
                  <div className="dinosatEarthCondGaugeLabel">Focus Factor</div>
                </div>
              </>
            ) : (
              <div className="dinosatEarthCondNoChartData">No sonic boom footprint data available.</div>
            )}
          </div>
        </div>
        {((acousticPropagation.shadowZones && acousticPropagation.shadowZones.length > 0) || soundSpeedChart) && (
          <div className="dinosatEarthCondOverviewGrid">
            {acousticPropagation.shadowZones?.length > 0 && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerComputed">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Shadow Zones ({acousticPropagation.shadowZones.length})</h4>
                  {renderDataTypeBadge("COMPUTED", "small")}
                </div>
                {renderDataTable("Acoustic Shadow Zones", ["Distance (km)", "Type", "Intensity"],
                  acousticPropagation.shadowZones.map(zone => [
                    zone?.distance !== null && zone?.distance !== undefined ? zone.distance.toFixed(1) : "—",
                    zone?.type?.replace(/_/g, " ") || "—",
                    zone?.intensity || "—"
                  ])
                )}
              </div>
            )}
            {soundSpeedChart && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerComputed">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Sound Speed vs Altitude</h4>
                  {renderDataTypeBadge("COMPUTED", "small")}
                </div>
                {renderDynamicChart(soundSpeedChart, "dinosatEarthCondChart")}
                <div className="dinosatEarthCondChartDescription">
                  <div className="dinosatEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Altitude (m)</span>
                    <span><strong>Y-Axis:</strong> Sound Speed (m/s)</span>
                  </div>
                  <p className="dinosatEarthCondChartDescriptionText">
                    This chart displays the vertical profile of sound speed through the atmosphere. Sound speed varies with temperature and humidity, creating layers that can bend, focus, or trap acoustic energy. Temperature inversions create sound speed minima that act as acoustic waveguides, potentially channeling launch noise toward populated areas. This profile is essential for predicting sonic boom propagation patterns and community noise impact assessment during launch operations.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
        {soundSpeedProfile.length > 0 && (
          <div className="dinosatEarthCondOverviewGrid">
            <div className="dinosatEarthCondPanelDouble dinosatEarthCondFullWidth dinosatEarthCondChartContainerComputed">
              <div className="dinosatEarthCondChartHeaderWithBadge">
                <h4>Sound Speed Profile ({soundSpeedProfile.length} levels)</h4>
                {renderDataTypeBadge("COMPUTED", "small")}
              </div>
              {renderDataTable("Vertical Profile", ["Altitude (m)", "Pressure (hPa)", "Temperature (°C)", "Sound Speed (m/s)"],
                soundSpeedProfile.map(level => [
                  level?.altitude !== null && level?.altitude !== undefined ? level.altitude.toFixed(0) : "0",
                  level?.pressureLevel || "Surface",
                  level?.temperature !== null && level?.temperature !== undefined ? level.temperature.toFixed(1) : "—",
                  level?.soundSpeed !== null && level?.soundSpeed !== undefined ? level.soundSpeed.toFixed(1) : "—"
                ])
              )}
            </div>
          </div>
        )}
        <div className="dinosatEarthCondSectionDivider">
          <div className="dinosatEarthCondSectionDividerLine" />
          <span className="dinosatEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faSatellite} />
            Current Radiation & Magnetosphere
          </span>
          <div className="dinosatEarthCondSectionDividerLine" />
        </div>
        <div className="dinosatEarthCondOverviewGrid">
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerLive">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Magnetopause Status</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {radiationEnvironment.magnetopause ? (
              <>
                {renderDataTable("Magnetosphere", ["Parameter", "Value", "Unit"], [
                  ["Standoff Distance", radiationEnvironment.magnetopause.standoffDistance !== null && radiationEnvironment.magnetopause.standoffDistance !== undefined ? radiationEnvironment.magnetopause.standoffDistance.toFixed(2) : "—", "Re"],
                  ["Solar Wind Density", radiationEnvironment.magnetopause.solarWindDensity !== null && radiationEnvironment.magnetopause.solarWindDensity !== undefined ? radiationEnvironment.magnetopause.solarWindDensity.toFixed(1) : "—", "p/cm³"],
                  ["Solar Wind Speed", radiationEnvironment.magnetopause.solarWindSpeed !== null && radiationEnvironment.magnetopause.solarWindSpeed !== undefined ? radiationEnvironment.magnetopause.solarWindSpeed.toFixed(0) : "—", "km/s"],
                  ["Dynamic Pressure", radiationEnvironment.magnetopause.dynamicPressure !== null && radiationEnvironment.magnetopause.dynamicPressure !== undefined ? radiationEnvironment.magnetopause.dynamicPressure.toFixed(4) : "—", "nPa"]
                ])}
              </>
            ) : (
              <div className="dinosatEarthCondNoChartData">No magnetopause data available.</div>
            )}
          </div>
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerLive">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Magnetopause Status</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {radiationEnvironment.magnetopause ? (
              <>
                <div className="dinosatEarthCondRiskGauge">
                  <div className="dinosatEarthCondGaugeValue" style={{ color: (radiationEnvironment.magnetopause.standoffDistance ?? 12) < 8 ? "#7c3aed" : "#22c55e" }}>
                    {radiationEnvironment.magnetopause.standoffDistance !== null && radiationEnvironment.magnetopause.standoffDistance !== undefined ? radiationEnvironment.magnetopause.standoffDistance.toFixed(1) : "—"} Re
                  </div>
                  <div className="dinosatEarthCondGaugeLabel">Magnetopause Standoff Distance</div>
                  <div className="dinosatEarthCondGaugeBar">
                    <div className="dinosatEarthCondGaugeFill" style={{
                      width: `${Math.min(100, ((radiationEnvironment.magnetopause.standoffDistance ?? 0) / 12) * 100)}%`,
                      backgroundColor: (radiationEnvironment.magnetopause.standoffDistance ?? 12) < 8 ? "#7c3aed" : (radiationEnvironment.magnetopause.standoffDistance ?? 12) < 10 ? "#8b5cf6" : "#22c55e"
                    }} />
                  </div>
                </div>
              </>
            ) : (
              <div className="dinosatEarthCondNoChartData">No magnetopause data available.</div>
            )}
          </div>
        </div>
        <div className="dinosatEarthCondOverviewGrid">
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerLive">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Radiation Belt Flux</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {radiationEnvironment.radiationBeltFlux ? (
              <>
                {renderDataTable("Flux Data", ["Parameter", "Value"], [
                  ["Current Flux", radiationEnvironment.radiationBeltFlux.currentFlux !== null && radiationEnvironment.radiationBeltFlux.currentFlux !== undefined ? radiationEnvironment.radiationBeltFlux.currentFlux.toExponential(2) : "—"],
                  ["Timestamp", radiationEnvironment.radiationBeltFlux.timestamp ? new Date(radiationEnvironment.radiationBeltFlux.timestamp).toLocaleString() : "—"]
                ])}
              </>
            ) : (
              <div className="dinosatEarthCondNoChartData">No radiation belt flux data available.</div>
            )}
          </div>
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerLive">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Radiation Belt Flux</h4>
              {renderDataTypeBadge("LIVE", "small")}
            </div>
            {radiationEnvironment.radiationBeltFlux ? (
              <>
                <div className="dinosatEarthCondRiskGauge">
                  <div className="dinosatEarthCondGaugeValue" style={{ color: (radiationEnvironment.radiationBeltFlux.currentFlux ?? 0) > 10000 ? "#7c3aed" : "#22c55e" }}>
                    {radiationEnvironment.radiationBeltFlux.currentFlux !== null && radiationEnvironment.radiationBeltFlux.currentFlux !== undefined ? radiationEnvironment.radiationBeltFlux.currentFlux.toExponential(2) : "—"}
                  </div>
                  <div className="dinosatEarthCondGaugeLabel">Electron Flux (e/cm²-s-sr)</div>
                </div>
              </>
            ) : (
              <div className="dinosatEarthCondNoChartData">No radiation belt flux data available.</div>
            )}
          </div>
        </div>
        <div className="dinosatEarthCondOverviewGrid">
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerComputed">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Single Event Upset Rate</h4>
              {renderDataTypeBadge("COMPUTED", "small")}
            </div>
            {radiationEnvironment.seuRate ? (
              <>
                {renderDataTable("SEU Analysis", ["Parameter", "Value"], [
                  ["Rate", `${((radiationEnvironment.seuRate.rate ?? 0) * 100).toFixed(3)}% /day`],
                  ["Bz Minimum", `${radiationEnvironment.seuRate.bzMin !== null && radiationEnvironment.seuRate.bzMin !== undefined ? radiationEnvironment.seuRate.bzMin.toFixed(1) : "—"} nT`],
                  ["Multiplier", `${radiationEnvironment.seuRate.multiplier !== null && radiationEnvironment.seuRate.multiplier !== undefined ? radiationEnvironment.seuRate.multiplier.toFixed(2) : "—"}x`]
                ])}
              </>
            ) : (
              <div className="dinosatEarthCondNoChartData">No SEU rate data available - IMF Bz stable.</div>
            )}
          </div>
          <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerComputed">
            <div className="dinosatEarthCondChartHeaderWithBadge">
              <h4>Single Event Upset Rate</h4>
              {renderDataTypeBadge("COMPUTED", "small")}
            </div>
            {radiationEnvironment.seuRate ? (
              <>
                <div className="dinosatEarthCondRiskGauge">
                  <div className="dinosatEarthCondGaugeValue" style={{ color: (radiationEnvironment.seuRate.rate ?? 0) > 0.05 ? "#7c3aed" : "#22c55e" }}>
                    {((radiationEnvironment.seuRate.rate ?? 0) * 100).toFixed(2)}%
                  </div>
                  <div className="dinosatEarthCondGaugeLabel">SEU Rate (/day)</div>
                </div>
              </>
            ) : (
              <div className="dinosatEarthCondNoChartData">No SEU rate data available - IMF Bz stable.</div>
            )}
          </div>
        </div>
        <div className="dinosatEarthCondSectionDivider">
          <div className="dinosatEarthCondSectionDividerLine" />
          <span className="dinosatEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faHistory} />
            Historical Radiation Data (7-Day)
          </span>
          <div className="dinosatEarthCondSectionDividerLine" />
        </div>
        {(diffElectronChart || radiationBeltChart) && (
          <div className="dinosatEarthCondOverviewGrid">
            {diffElectronChart && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerHistorical">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Differential Electron Flux</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(diffElectronChart, "dinosatEarthCondChart")}
                <div className="dinosatEarthCondChartDescription">
                  <div className="dinosatEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (7-day observation period)</span>
                    <span><strong>Y-Axis:</strong> Electron Flux (e/cm²-s-sr-keV)</span>
                  </div>
                  <p className="dinosatEarthCondChartDescriptionText">
                    This chart displays differential electron flux measurements from space weather monitoring satellites over the past 7 days. Differential flux represents electron intensity at specific energy levels, providing insight into radiation belt dynamics and solar energetic particle events. Elevated electron flux can cause spacecraft charging, sensor interference, and increased single event upset rates in avionics systems during ascent through the radiation belts.
                  </p>
                </div>
              </div>
            )}
            {radiationBeltChart && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerHistorical">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Radiation Belt Electron History (7d)</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(radiationBeltChart, "dinosatEarthCondChart")}
                <div className="dinosatEarthCondChartDescription">
                  <div className="dinosatEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (7-day observation period)</span>
                    <span><strong>Y-Axis:</strong> Electron Flux (e/cm²-s-sr)</span>
                  </div>
                  <p className="dinosatEarthCondChartDescriptionText">
                    This chart shows the integrated electron flux in Earth's radiation belts over the past 7 days. The Van Allen radiation belts contain trapped energetic particles that pose hazards to spacecraft electronics and astronaut health. Monitoring flux variations helps identify geomagnetic storm impacts and predict radiation exposure during orbital insertion. Enhanced belt populations following solar events may require trajectory modifications or launch delays for crewed missions.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
        {differentialElectrons.length > 0 && (
          <div className="dinosatEarthCondOverviewGrid">
            <div className="dinosatEarthCondPanelSingle dinosatEarthCondFullWidth dinosatEarthCondChartContainerHistorical">
              <div className="dinosatEarthCondChartHeaderWithBadge">
                <h4>Differential Electron Channels ({differentialElectrons.length} points)</h4>
                {renderDataTypeBadge("HISTORICAL", "small")}
              </div>
              {(() => {
                const sample = differentialElectrons[differentialElectrons.length - 1];
                const fluxKeys = Object.keys(sample || {}).filter(k => k.startsWith("flux_"));
                const headers = ["Timestamp", ...fluxKeys.map(k => k.replace("flux_", "").replace(/_/g, "-"))];
                const rows = differentialElectrons.slice(-20).map(d => [
                  d?.timestamp ? new Date(d.timestamp).toLocaleTimeString() : "—",
                  ...fluxKeys.map(k => d && d[k] !== null && d[k] !== undefined ? d[k].toExponential(2) : "—")
                ]);
                return renderDataTable("Electron Flux by Channel", headers, rows);
              })()}
            </div>
          </div>
        )}
        {diffProtonChart && (
          <div className="dinosatEarthCondOverviewGrid">
            <div className="dinosatEarthCondPanelSingle dinosatEarthCondChartContainerHistorical">
              <div className="dinosatEarthCondChartHeaderWithBadge">
                <h4>Differential Proton Flux</h4>
                {renderDataTypeBadge("HISTORICAL", "small")}
              </div>
              {renderDynamicChart(diffProtonChart, "dinosatEarthCondChart")}
              <div className="dinosatEarthCondChartDescription">
                <div className="dinosatEarthCondChartAxesInfo">
                  <span><strong>X-Axis:</strong> Time (7-day observation period)</span>
                  <span><strong>Y-Axis:</strong> Proton Flux (p/cm²-s-sr-MeV)</span>
                </div>
                <p className="dinosatEarthCondChartDescriptionText">
                  This chart displays differential proton flux measurements over the past 7 days. Solar energetic protons pose significant radiation hazards during solar particle events, penetrating spacecraft shielding and causing total ionizing dose accumulation in sensitive electronics. Proton flux monitoring is critical for crew safety assessment on crewed missions and for predicting degradation rates of solar panels and optical sensors during extended operations.
                </p>
              </div>
            </div>
          </div>
        )}
        {differentialProtons.length > 0 && (
          <div className="dinosatEarthCondOverviewGrid">
            <div className="dinosatEarthCondPanelSingle dinosatEarthCondFullWidth dinosatEarthCondChartContainerHistorical">
              <div className="dinosatEarthCondChartHeaderWithBadge">
                <h4>Differential Proton Channels ({differentialProtons.length} points)</h4>
                {renderDataTypeBadge("HISTORICAL", "small")}
              </div>
              {(() => {
                const sample = differentialProtons[differentialProtons.length - 1];
                const fluxKeys = Object.keys(sample || {}).filter(k => k.startsWith("flux_"));
                const headers = ["Timestamp", ...fluxKeys.map(k => k.replace("flux_", "").replace(/_/g, "-").replace(/p/, ""))];
                const rows = differentialProtons.slice(-20).map(d => [
                  d?.timestamp ? new Date(d.timestamp).toLocaleTimeString() : "—",
                  ...fluxKeys.map(k => d && d[k] !== null && d[k] !== undefined ? d[k].toExponential(2) : "—")
                ]);
                return renderDataTable("Proton Flux by Channel", headers, rows);
              })()}
            </div>
          </div>
        )}
        <div className="dinosatEarthCondSectionDivider">
          <div className="dinosatEarthCondSectionDividerLine" />
          <span className="dinosatEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faCloudShowersHeavy} style={{ color: DATA_TYPE.FORECAST.color }} />
            Extended Atmospheric Forecasts (72h)
          </span>
          <div className="dinosatEarthCondSectionDividerLine" />
        </div>
        {(windForecastChart || precipForecastChart) && (
          <div className="dinosatEarthCondOverviewGrid">
            {windForecastChart && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerForecast">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Wind Forecast</h4>
                  {renderDataTypeBadge("FORECAST", "small")}
                </div>
                <div className="dinosatEarthCondForecastNotice">
                  <FontAwesomeIcon icon={faClock} />
                  <span>Predicted wind speeds for upcoming hours</span>
                </div>
                {renderDynamicChart(windForecastChart, "dinosatEarthCondChart")}
                <div className="dinosatEarthCondChartDescription">
                  <div className="dinosatEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (forecast period)</span>
                    <span><strong>Y-Axis:</strong> Wind Speed (m/s)</span>
                  </div>
                  <p className="dinosatEarthCondChartDescriptionText">
                    This chart displays probabilistic wind speed forecasts for the upcoming hours. Wind speed is a primary launch constraint affecting vehicle stability during liftoff and early ascent. The forecast helps mission planners identify optimal launch windows and anticipate potential holds due to wind exceedances. Ensemble model outputs provide uncertainty bounds to support risk-informed decision making for launch commit criteria evaluation.
                  </p>
                </div>
              </div>
            )}
            {precipForecastChart && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerForecast">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Precipitation Forecast</h4>
                  {renderDataTypeBadge("FORECAST", "small")}
                </div>
                <div className="dinosatEarthCondForecastNotice">
                  <FontAwesomeIcon icon={faClock} />
                  <span>Probability of precipitation for upcoming hours</span>
                </div>
                {renderDynamicChart(precipForecastChart, "dinosatEarthCondChart")}
                <div className="dinosatEarthCondChartDescription">
                  <div className="dinosatEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (forecast period)</span>
                    <span><strong>Y-Axis:</strong> Precipitation Probability (%)</span>
                  </div>
                  <p className="dinosatEarthCondChartDescriptionText">
                    This chart shows the probability of precipitation occurrence over the forecast period. Precipitation is a critical launch constraint due to triboelectric charging risks, lightning potential, and visibility impacts. Even light rain can trigger launch scrubs due to flight termination system antenna performance degradation. The probabilistic format helps identify windows with lowest precipitation risk for launch scheduling optimization.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
        {(atmosphericForecast.length > 0 || extAtmoTempChart) && (
          <div className="dinosatEarthCondOverviewGrid">
            {atmosphericForecast.length > 0 && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerForecast">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Extended Wind Speed (72h)</h4>
                  {renderDataTypeBadge("FORECAST", "small")}
                </div>
                {renderDynamicChart(createDynamicLineChart("Extended Wind Speed", atmosphericForecast.filter(d => d && d.windSpeed !== null && d.windSpeed !== undefined).slice(0, 72), "timestamp", "windSpeed", " m/s", "#22c55e", true), "dinosatEarthCondChart")}
                <div className="dinosatEarthCondChartDescription">
                  <div className="dinosatEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (72-hour forecast period)</span>
                    <span><strong>Y-Axis:</strong> Wind Speed (m/s)</span>
                  </div>
                  <p className="dinosatEarthCondChartDescriptionText">
                    This chart provides an extended 72-hour wind speed forecast for long-range launch planning. Extended forecasts enable mission planners to identify favorable weather windows days in advance and coordinate ground operations scheduling. While uncertainty increases with forecast lead time, this data supports strategic decisions about propellant loading schedules, crew timelines, and range asset positioning for upcoming launch attempts.
                  </p>
                </div>
              </div>
            )}
            {extAtmoTempChart && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerForecast">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Extended Temperature (72h)</h4>
                  {renderDataTypeBadge("FORECAST", "small")}
                </div>
                {renderDynamicChart(extAtmoTempChart, "dinosatEarthCondChart")}
                <div className="dinosatEarthCondChartDescription">
                  <div className="dinosatEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (72-hour forecast period)</span>
                    <span><strong>Y-Axis:</strong> Temperature (°C)</span>
                  </div>
                  <p className="dinosatEarthCondChartDescriptionText">
                    This chart displays the 72-hour temperature forecast for the launch site. Temperature affects propellant density calculations, battery performance, and thermal protection system requirements. Extended temperature forecasts help predict sea breeze timing based on land-sea gradient evolution and support planning for temperature-sensitive ground operations such as cryogenic propellant loading and payload processing activities.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
        {extAtmoPrecipChart && (
          <div className="dinosatEarthCondOverviewGrid">
            <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerForecast">
              <div className="dinosatEarthCondChartHeaderWithBadge">
                <h4>Extended Precip Probability (72h)</h4>
                {renderDataTypeBadge("FORECAST", "small")}
              </div>
              {renderDynamicChart(extAtmoPrecipChart, "dinosatEarthCondChart")}
              <div className="dinosatEarthCondChartDescription">
                <div className="dinosatEarthCondChartAxesInfo">
                  <span><strong>X-Axis:</strong> Time (72-hour forecast period)</span>
                  <span><strong>Y-Axis:</strong> Precipitation Probability (%)</span>
                </div>
                <p className="dinosatEarthCondChartDescriptionText">
                  This chart shows extended precipitation probability forecasts over the next 72 hours. Long-range precipitation forecasts support strategic launch scheduling and help identify backup launch windows. The extended outlook enables coordination with range safety, tracking assets, and recovery forces that require advance notice for positioning. Higher probability periods may trigger contingency planning for launch delays or scrubs.
                </p>
              </div>
            </div>
          </div>
        )}
        {atmosphericForecast.length > 0 && (
          <div className="dinosatEarthCondOverviewGrid">
            <div className="dinosatEarthCondPanelSingle dinosatEarthCondFullWidth dinosatEarthCondChartContainerForecast">
              <div className="dinosatEarthCondChartHeaderWithBadge">
                <h4>Extended Atmospheric Forecast Table ({atmosphericForecast.length} hours)</h4>
                {renderDataTypeBadge("FORECAST", "small")}
              </div>
              {renderDataTable("72-Hour Forecast", ["Time", "Temp (°C)", "Wind (m/s)", "Precip Prob (%)"],
                atmosphericForecast.slice(0, 24).map(d => [
                  d?.timestamp ? new Date(d.timestamp).toLocaleTimeString() : "—",
                  d?.temperature !== null && d?.temperature !== undefined ? d.temperature.toFixed(1) : "—",
                  d?.windSpeed !== null && d?.windSpeed !== undefined ? d.windSpeed.toFixed(1) : "—",
                  d?.precipitationProb !== null && d?.precipitationProb !== undefined ? d.precipitationProb.toFixed(0) : "—"
                ])
              )}
            </div>
          </div>
        )}
        <div className="dinosatEarthCondSectionDivider">
          <div className="dinosatEarthCondSectionDividerLine" />
          <span className="dinosatEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faWater} />
            Extended Marine Forecasts (72h)
          </span>
          <div className="dinosatEarthCondSectionDividerLine" />
        </div>
        {(extMarineWaveChart || extMarineSSTChart) && (
          <div className="dinosatEarthCondOverviewGrid">
            {extMarineWaveChart && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerForecast">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Extended Wave Height (72h)</h4>
                  {renderDataTypeBadge("FORECAST", "small")}
                </div>
                {renderDynamicChart(extMarineWaveChart, "dinosatEarthCondChart")}
                <div className="dinosatEarthCondChartDescription">
                  <div className="dinosatEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (72-hour forecast period)</span>
                    <span><strong>Y-Axis:</strong> Significant Wave Height (m)</span>
                  </div>
                  <p className="dinosatEarthCondChartDescriptionText">
                    This chart displays the 72-hour significant wave height forecast for downrange recovery zones. Wave height is a critical constraint for booster recovery operations, crew capsule splashdown, and ship-based tracking asset positioning. Extended marine forecasts enable advance planning for recovery vessel deployment and help identify windows suitable for drone ship landing attempts or crew return operations.
                  </p>
                </div>
              </div>
            )}
            {extMarineSSTChart && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerForecast">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Sea Surface Temperature (72h)</h4>
                  {renderDataTypeBadge("FORECAST", "small")}
                </div>
                {renderDynamicChart(extMarineSSTChart, "dinosatEarthCondChart")}
                <div className="dinosatEarthCondChartDescription">
                  <div className="dinosatEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (72-hour forecast period)</span>
                    <span><strong>Y-Axis:</strong> Sea Surface Temperature (°C)</span>
                  </div>
                  <p className="dinosatEarthCondChartDescriptionText">
                    This chart shows the 72-hour sea surface temperature forecast. Sea surface temperature influences coastal weather patterns, marine layer development, and fog formation probability. SST gradients drive coastal circulation patterns that affect launch site winds. For crew recovery operations, SST data supports crew survival time calculations and thermal protection requirements in the event of an off-nominal water landing.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
        {marineForecast.length > 0 && (
          <div className="dinosatEarthCondOverviewGrid">
            <div className="dinosatEarthCondPanelSingle dinosatEarthCondFullWidth dinosatEarthCondChartContainerForecast">
              <div className="dinosatEarthCondChartHeaderWithBadge">
                <h4>Extended Marine Forecast Table ({marineForecast.length} hours)</h4>
                {renderDataTypeBadge("FORECAST", "small")}
              </div>
              {renderDataTable("72-Hour Marine Forecast", ["Time", "Wave Height (m)", "Wave Dir (°)", "Period (s)", "SST (°C)"],
                marineForecast.slice(0, 24).map(d => [
                  d?.timestamp ? new Date(d.timestamp).toLocaleTimeString() : "—",
                  d?.waveHeight !== null && d?.waveHeight !== undefined ? d.waveHeight.toFixed(1) : "—",
                  d?.waveDirection !== null && d?.waveDirection !== undefined ? d.waveDirection.toFixed(0) : "—",
                  d?.wavePeriod !== null && d?.wavePeriod !== undefined ? d.wavePeriod.toFixed(1) : "—",
                  d?.seaSurfaceTemperature !== null && d?.seaSurfaceTemperature !== undefined ? d.seaSurfaceTemperature.toFixed(1) : "—"
                ])
              )}
            </div>
          </div>
        )}
        <div className="dinosatEarthCondSectionDivider">
          <div className="dinosatEarthCondSectionDividerLine" />
          <span className="dinosatEarthCondSectionDividerLabel">
            <FontAwesomeIcon icon={faSatellite} />
            Geomagnetic Forecast & History
          </span>
          <div className="dinosatEarthCondSectionDividerLine" />
        </div>
        {(kpForecastChart || geomagneticChart) && (
          <div className="dinosatEarthCondOverviewGrid">
            {kpForecastChart && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerForecast">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Kp Index Forecast</h4>
                  {renderDataTypeBadge("FORECAST", "small")}
                </div>
                <div className="dinosatEarthCondForecastNotice">
                  <FontAwesomeIcon icon={faClock} />
                  <span>Predicted geomagnetic activity for upcoming hours</span>
                </div>
                {renderDynamicChart(kpForecastChart, "dinosatEarthCondChart")}
                <div className="dinosatEarthCondChartDescription">
                  <div className="dinosatEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (forecast period)</span>
                    <span><strong>Y-Axis:</strong> Kp Index (0-9 scale)</span>
                  </div>
                  <p className="dinosatEarthCondChartDescriptionText">
                    This chart displays the forecast planetary K-index for upcoming hours. The Kp forecast enables prediction of geomagnetic storm impacts on spacecraft systems and communication links. Values above 5 indicate storm conditions that may cause GPS degradation, HF radio blackouts, and increased radiation exposure during polar crossings. Launch planners use Kp forecasts to assess single event upset risks and communication reliability during critical mission phases.
                  </p>
                </div>
              </div>
            )}
            {geomagneticChart && (
              <div className="dinosatEarthCondPanelDouble dinosatEarthCondChartContainerHistorical">
                <div className="dinosatEarthCondChartHeaderWithBadge">
                  <h4>Geomagnetic History (Kp)</h4>
                  {renderDataTypeBadge("HISTORICAL", "small")}
                </div>
                {renderDynamicChart(geomagneticChart, "dinosatEarthCondChart")}
                <div className="dinosatEarthCondChartDescription">
                  <div className="dinosatEarthCondChartAxesInfo">
                    <span><strong>X-Axis:</strong> Time (recent observation period)</span>
                    <span><strong>Y-Axis:</strong> Kp Index (0-9 scale)</span>
                  </div>
                  <p className="dinosatEarthCondChartDescriptionText">
                    This chart shows historical Kp index measurements from recent observation periods. The Kp index quantifies disturbances in Earth's magnetic field caused by solar wind interactions. Historical patterns help identify recurring geomagnetic activity cycles and validate forecast accuracy. Sustained elevated Kp values indicate ongoing storm conditions that may have cumulative effects on spacecraft systems and require extended monitoring before launch clearance.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
        {geomagneticData.length > 0 && (
          <div className="dinosatEarthCondOverviewGrid">
            <div className="dinosatEarthCondPanelSingle dinosatEarthCondFullWidth dinosatEarthCondChartContainerHistorical">
              <div className="dinosatEarthCondChartHeaderWithBadge">
                <h4>Geomagnetic History Table ({geomagneticData.length} points)</h4>
                {renderDataTypeBadge("HISTORICAL", "small")}
              </div>
              {renderDataTable("Kp Index History", ["Timestamp", "Kp Value", "Status"],
                geomagneticData.slice(-24).map(d => [
                  d?.timestamp ? new Date(d.timestamp).toLocaleString() : "—",
                  d?.value !== null && d?.value !== undefined ? d.value.toFixed(1) : "—",
                  d?.value !== null && d?.value !== undefined ? ((d.value ?? 0) >= 5 ? "STORM" : (d.value ?? 0) >= 4 ? "ACTIVE" : "QUIET") : "—"
                ])
              )}
            </div>
          </div>
        )}

      </div>
    );
  };

  const renderGlobalAnalysisTab = () => {
    const [lat, lon] = selectedSite.split(",").map(Number);
    const filteredOverlays = WINDY_OVERLAYS.filter(o => (mapCategoryFilter === "all" || o.category === mapCategoryFilter) && (mapSearchTerm === "" || o.name.toLowerCase().includes(mapSearchTerm.toLowerCase())));

    const getMapDescription = (overlayId) => {
      const descriptions = {
        wind: "This map displays surface wind speed and direction patterns across the region. Wind vectors indicate flow direction while color intensity represents wind magnitude. Surface winds are critical for launch commit criteria evaluation, affecting vehicle stability during liftoff and early ascent phases. The visualization helps identify approaching frontal boundaries, sea breeze development, and synoptic-scale flow patterns.",
        gust: "This map shows wind gust intensity and distribution. Gusts represent sudden, brief increases in wind speed that impose dynamic structural loads on launch vehicles during ground operations and early flight. Peak gust values are often the limiting factor for pad access during fueling operations and can trigger launch holds even when sustained winds are within limits.",
        rain: "This map displays precipitation intensity and coverage. Precipitation is a critical launch constraint due to triboelectric charging risks, potential for triggered lightning, and visibility degradation. Even light rain can cause launch scrubs due to flight termination system antenna performance impacts and concerns about vehicle thermal protection system integrity.",
        clouds: "This map shows cloud cover percentage and distribution. Cloud coverage affects optical tracking system performance, lightning risk assessment, and compliance with flight safety visual observation requirements. Thick cloud layers may indicate embedded convection or icing conditions that pose hazards during ascent through the atmosphere.",
        pressure: "This map displays sea level pressure patterns and gradients. Pressure distribution drives large-scale atmospheric circulation and helps identify approaching weather systems. Tight pressure gradients indicate strong wind potential, while pressure trends provide insight into evolving weather conditions that may impact launch windows.",
        temp: "This map shows surface temperature distribution across the region. Temperature affects propellant density calculations, material properties, and thermal protection system performance. Temperature gradients between land and water drive coastal circulation patterns including sea breezes that can significantly impact launch site wind conditions.",
        dewpoint: "This map displays dewpoint temperature distribution. Dewpoint indicates atmospheric moisture content and helps predict fog formation, cloud development, and precipitation potential. High dewpoint values combined with cooling temperatures can lead to rapid visibility degradation and condensation on vehicle surfaces.",
        rh: "This map shows relative humidity distribution. Humidity levels impact triboelectric charging potential, fog formation probability, and material performance characteristics. High humidity environments increase corrosion concerns for ground support equipment and may affect sensitive electronic components during extended pad operations.",
        cape: "This map displays Convective Available Potential Energy (CAPE) values. CAPE quantifies atmospheric instability and thunderstorm development potential. Higher CAPE values indicate greater energy available for convective updrafts, correlating with severe weather risk including lightning, hail, and strong downdrafts that pose significant launch hazards.",
        visibility: "This map shows visibility conditions across the region. Visibility is critical for optical tracking systems, range safety observations, and pilot visual flight rules compliance. Reduced visibility from fog, haze, or precipitation can trigger launch constraints and affect emergency landing site availability for abort scenarios.",
        snow: "This map displays snowfall accumulation and intensity. Snow accumulation on launch infrastructure can delay pad operations and affect vehicle thermal conditioning. Snow events also impact road access for personnel and equipment, potentially causing cascading delays to launch preparation timelines.",
        freezingLevel: "This map shows the altitude of the freezing level across the region. The freezing level is critical for icing hazard assessment during vehicle ascent. Aircraft icing conditions near the freezing level can affect chase plane operations and may indicate supercooled water droplets that pose risks to vehicle surfaces.",
        thunder: "This map displays thunderstorm probability and lightning activity. Lightning is one of the most critical launch constraints, with strict standoff distances required from observed and forecast electrical activity. Triggered lightning from vehicle exhaust plumes can occur even in conditions that appear marginally safe, requiring conservative constraint application.",
        turbulence: "This map shows atmospheric turbulence intensity at various altitudes. Turbulence affects vehicle structural loads during ascent and can impact guidance system performance. Clear air turbulence near jet streams and mechanical turbulence from terrain features must be evaluated for trajectory planning and structural load certification.",
        icing: "This map displays aircraft icing potential. Icing conditions pose hazards to launch vehicles during ascent through cloud layers containing supercooled water droplets. Ice accumulation can affect aerodynamic characteristics, add mass, and potentially damage thermal protection systems or sensor surfaces.",
        waves: "This map shows ocean wave height and direction. Wave conditions are critical for booster recovery operations, crew capsule splashdown safety, and positioning of ship-based tracking assets. Significant wave height constraints typically limit drone ship landing attempts and determine recovery vessel operational windows.",
        swell: "This map displays ocean swell patterns and periods. Long-period swells from distant storms can create hazardous conditions for maritime operations even under calm local winds. Swell direction and period affect ship motion characteristics important for precision landing platform stability and crew recovery operations.",
        sst: "This map shows sea surface temperature distribution. SST influences coastal weather patterns, marine layer development, and fog formation probability. Temperature gradients between ocean currents drive localized weather phenomena. For crew missions, SST data supports survival time calculations for water landing contingencies.",
        currentsTide: "This map displays ocean current patterns and tidal flows. Current information is essential for splashdown location prediction, recovery vessel positioning, and debris drift calculations. Strong currents can complicate recovery operations and affect the accuracy of impact point predictions for expended stages.",
        airQuality: "This map shows air quality index values. Air quality affects personnel health during extended outdoor operations and may indicate atmospheric conditions relevant to visibility and precipitation. Smoke from wildfires can significantly degrade visibility and air quality at launch facilities in affected regions.",
        pm25: "This map displays fine particulate matter (PM2.5) concentrations. PM2.5 affects respiratory health for ground crews and can indicate smoke plumes or industrial emissions that may impact visibility. Elevated particulate levels may require respiratory protection for personnel during extended pad operations.",
        dust: "This map shows dust and sand concentration in the atmosphere. Dust storms can severely reduce visibility, damage sensitive equipment, and pose abrasion hazards to vehicle surfaces. Desert launch sites must monitor dust conditions carefully for both personnel safety and hardware protection during ground operations.",
        satellite: "This satellite imagery shows current cloud patterns and weather system organization. Satellite observations provide synoptic-scale context for understanding regional weather evolution and help validate numerical forecast model performance. Visible and infrared channels reveal cloud thickness, convective development, and frontal boundaries.",
        radar: "This radar imagery displays precipitation intensity and movement. Radar is essential for tracking convective cells, estimating precipitation rates, and identifying hazardous weather approaching the launch site. Doppler capabilities reveal wind patterns within precipitation that may indicate rotation or severe downdrafts.",
        windAnimation: "This animated wind visualization shows atmospheric flow patterns over time. Wind animations help identify convergence zones, frontal passages, and circulation features that may affect launch operations. The temporal evolution of wind patterns supports forecaster assessment of weather system movement and intensification trends.",
        cosc: "This map displays CO (carbon monoxide) concentrations from satellite observations. CO serves as a tracer for combustion emissions and atmospheric transport patterns. Elevated CO may indicate biomass burning events that could affect air quality and visibility at the launch site.",
        so2: "This map shows sulfur dioxide concentrations. SO2 is a volcanic emission tracer and industrial pollutant indicator. Volcanic SO2 plumes can pose aviation hazards and affect atmospheric chemistry. Monitoring helps identify potential volcanic activity that could impact flight corridors.",
        no2: "This map displays nitrogen dioxide concentrations. NO2 indicates combustion sources and photochemical smog potential. Urban and industrial NO2 plumes affect air quality and may correlate with haze conditions that reduce visibility at launch facilities.",
        gtco3: "This map shows total column ozone distribution. Ozone levels affect UV radiation exposure and atmospheric chemistry. Ozone hole monitoring is relevant for high-latitude launch sites and polar-crossing trajectories where reduced ozone provides less protection from solar UV radiation."
      };
      return descriptions[overlayId] || "This map displays environmental data relevant to launch operations. The visualization supports weather assessment and constraint evaluation for mission planning and real-time launch decision support.";
    };

    return (
      <div className="dinosatEarthCondGlobalTab">
        <div className="dinosatEarthCondMapControls">
          <div className="dinosatEarthCondMapControlGroup" style={{ flex: 1 }}>
            <label className="dinosatEarthCondMapControlLabel">Search</label>
            <div className="dinosatEarthCondSearchInputWrapper">
              <FontAwesomeIcon icon={faSearchPlus} className="dinosatEarthCondSearchIcon" />
              <input type="text" placeholder="Find layer" value={mapSearchTerm} onChange={(e) => setMapSearchTerm(e.target.value)} className="dinosatEarthCondInput dinosatEarthCondSearchInput" />
            </div>
          </div>
          <div className="dinosatEarthCondMapControlGroup">
            <label className="dinosatEarthCondMapControlLabel">Category</label>
            <select value={mapCategoryFilter} onChange={(e) => setMapCategoryFilter(e.target.value)} className="dinosatEarthCondSelect">
              <option value="all">All</option>
              <option value="Standard">Standard</option>
              <option value="Aviation">Aviation</option>
              <option value="Marine">Marine</option>
              <option value="Air Quality">Air Quality</option>
              <option value="Winter">Winter</option>
            </select>
          </div>
        </div>
        <div className="dinosatEarthCondMapsGrid">
          {filteredOverlays.map(o => (
            <div key={o.id} className="dinosatEarthCondMapCard">
              <div className="dinosatEarthCondMapTitle">
                <FontAwesomeIcon icon={o.icon} className="dinosatEarthCondMapTitleIcon" />
                {o.name}
              </div>
              <div className="dinosatEarthCondMapIframeContainer">
                <iframe src={getWindyMapUrl(lat, lon, o.id, mapAltitude)} title={o.name} className="dinosatEarthCondMapIframe" allow="geolocation" loading="lazy" scrolling="no" />
              </div>
              <div className="dinosatEarthCondChartDescriptionMaps">
                <p className="dinosatEarthCondChartDescriptionText">
                  {getMapDescription(o.id)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCurrentTabContent = () => {
    switch (activeTab) {
      case "global": return renderGlobalAnalysisTab();
      case "commandIntegrity": return renderCommandAndIntegrityTab();
      case "aerodynamicsAscent": return renderAtmosphericEnvrionmentTab();
      case "electromagneticEnvironment": return renderElectromagneticEnvironmentTab();
      case "groundOpsEnvironmental": return renderGroundEnvironmentTab();
      case "temporalForensics": return renderTemporalForensicsTab();
      default: return renderCommandAndIntegrityTab();
    }
  };

  const renderControlsPanel = () => (
    <div className="dinosatEarthCondControlsPanel">

      <div className="dinosatEarthCondControlGroupStack">

        <div className="dinosatEarthCondControlGroup">
          <label>Launch Site</label>
          <select value={selectedSite} onChange={(e) => setSelectedSite(e.target.value)} className="dinosatEarthCondSelect">
            {Object.entries(launchSites).map(([coords, site]) => <option key={coords} value={coords}>{site.displayName}</option>)}
          </select>
        </div>
        <div className="dinosatEarthCondControlGroup">
          <label>Vehicle Type</label>
          <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} className="dinosatEarthCondSelect">
            {Object.entries(VEHICLE_TYPES).map(([type, info]) => <option key={type} value={type}>{info.name}</option>)}
          </select>
        </div>
        <div className="dinosatEarthCondControlGroup">
          <label>Launch Time</label>
          <input type="datetime-local" value={launchTime.slice(0, 16)} onChange={(e) => setLaunchTime(new Date(e.target.value).toISOString())} className="dinosatEarthCondInput" />
        </div>
      </div>

      <div className="dinosatEarthCondControlGroupStack">
        <div className="dinosatEarthCondControlGroupSlider">
          <label>Azimuth
            <span className="dinosatEarthCondSliderValue">{launchAzimuth}°</span>
          </label>
          <div className="dinosatEarthCondSliderGroup">
            <input type="range" min="0" max="360" value={launchAzimuth} onChange={(e) => setLaunchAzimuth(Number(e.target.value))} className="dinosatEarthCondSlider" />
          </div>
        </div>
      </div>

      <div className="dinosatEarthCondControlGroupStack">
        {renderVehicleConfigPanel()}
      </div>


      <div className="dinosatEarthCondControlGroupStack">
        <div className="dinosatEarthCondControlGroup">
          <label className="dinosatEarthCondCheckboxLabel">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            <span>Auto Refresh</span>
          </label>
        </div>

        <div className="dinosatEarthCondControlGroup">
          <label className="dinosatEarthCondCheckboxLabel">
            <input type="checkbox" checked={alertsEnabled} onChange={(e) => setAlertsEnabled(e.target.checked)} />
            <span>Alerts Enabled</span>
          </label>
        </div>
      </div>

      <div className="dinosatEarthCondControlGroupStack" style={{ borderBottom: 0 }}>
        <div className="dinosatEarthCondControlGroup">
          <label>Interval</label>
          <select value={refreshInterval} onChange={(e) => setRefreshInterval(Number(e.target.value))} className="dinosatEarthCondSelect" disabled={!autoRefresh}>
            <option value={30000}>30s</option>
            <option value={60000}>1m</option>
            <option value={300000}>5m</option>
            <option value={600000}>10m</option>
          </select>
        </div>
      </div>

      <div className="dinosatEarthCondControlActions">
        <button onClick={fetchConsolidatedEvaluation} disabled={loading} className="dinosatEarthCondBtn dinosatEarthCondBtnPrimary">
          <FontAwesomeIcon icon={faRefresh} /> {loading ? "Loading..." : "Refresh"}
        </button>
        <button onClick={() => exportData(dataExportFormat)} className="dinosatEarthCondBtn dinosatEarthCondBtnSecondary">
          <FontAwesomeIcon icon={faDownload} /> Export
        </button>
      </div>
    </div>
  );

  useEffect(() => { fetchLaunchSites(); }, [fetchLaunchSites]);
  useEffect(() => { fetchConsolidatedEvaluation(); }, []);
  useEffect(() => {
    if (autoRefresh) intervalRef.current = setInterval(fetchConsolidatedEvaluation, refreshInterval);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, refreshInterval, fetchConsolidatedEvaluation]);

  const allAlerts = getAllAlerts();
  const allViolations = getAllViolations();
  const criticalCount = allAlerts.filter(a => a.severity === "CRITICAL").length + allViolations.filter(v => v.severity === "CRITICAL").length;
  const warningCount = allAlerts.filter(a => a.severity === "WARNING").length + allViolations.filter(v => v.severity === "WARNING").length;
  const decision = getConsolidatedDecision();

  return (
    <div className="dinosatEarthCondPage">
      <DinoLabsNav activePage={"sat"} />


      <div className="dinosatEarthCondContainer">
        <header className="dinosatEarthCondHeader">
          <div className="dinosatEarthCondHeaderContent">
            <div className="dinosatEarthCondTitleSection">
              <div className="dinosatEarthCondSubtitle">{launchSites[selectedSite]?.name} | {VEHICLE_TYPES[vehicleType]?.name} | {launchAzimuth}°</div>
            </div>
            <div className="dinosatEarthCondHeaderStatus">
              <div className={`dinosatEarthCondHeaderDecision dinosatEarthCondDecision${decision.status.replace(/_/g, "")}`}>
                <FontAwesomeIcon icon={decision.status === "GO" ? faCheckSquare : decision.status === "NO_GO" ? faXmarkSquare : faExclamationTriangle} />
                <span>{decision.status.replace(/_/g, " ")}</span>
              </div>
              <button className={`dinosatEarthCondAlertBtn ${criticalCount > 0 ? "dinosatEarthCondAlertBtnCritical" : warningCount > 0 ? "dinosatEarthCondAlertBtnWarning" : ""}`} onClick={() => setActiveTab("commandIntegrity")}>
                <FontAwesomeIcon icon={faBell} />
                {(criticalCount + warningCount) > 0 && <span className="dinosatEarthCondAlertBadge">{criticalCount + warningCount}</span>}
              </button>
            </div>
          </div>
        </header>
        <div className="dinosatEarthCondMainContent">
          <aside className="dinosatEarthCondSidebar">{renderControlsPanel()}</aside>
          <div className="dinosatEarthCondContentArea">
            <nav className="dinosatEarthCondTabs">
              {[
                { id: "commandIntegrity", label: "Command & Integrity", icon: faShield },
                { id: "groundOpsEnvironmental", label: "Ground Environment", icon: faHouseUser },
                { id: "aerodynamicsAscent", label: "Atmospheric Environment", icon: faRocket },
                { id: "electromagneticEnvironment", label: "Electromagnetic Environment", icon: faMagnet },
                { id: "temporalForensics", label: "Temporal Forensics", icon: faClock },
                { id: "global", label: "Weather Maps", icon: faGlobeAmericas },
              ].map(tab => {
                let badge = 0;
                if (tab.id === "commandIntegrity") {
                  badge = criticalCount + warningCount;
                } else if (tab.id !== "global") {
                  const moduleDataObj = getModuleData(tab.id);
                  if (moduleDataObj) {
                    badge = (moduleDataObj.violations?.length || 0) + (moduleDataObj.alerts?.filter(a => a.severity === "CRITICAL" || a.severity === "WARNING").length || 0);
                  }
                }
                return (
                  <button key={tab.id} className={`dinosatEarthCondTab ${activeTab === tab.id ? "dinosatEarthCondTabActive" : ""}`} onClick={() => setActiveTab(tab.id)}>
                    <FontAwesomeIcon icon={tab.icon} />
                    <span>{tab.label}</span>
                    {badge > 0 && <span className="dinosatEarthCondTabBadge">{badge}</span>}
                  </button>
                );
              })}
            </nav>
            <div className="dinosatEarthCondTabContent">
              {loading && !consolidatedData ? (
                <div className="dinosatEarthCondLoadingState">
                  <div className="dinosatEarthCondLoadingSpinner"><FontAwesomeIcon icon={faDatabase} size="3x" /></div>
                  <h2>Initializing</h2>
                  <p>Establishing telemetry links...</p>
                </div>
              ) : errors.length > 0 && !consolidatedData ? (
                <div className="dinosatEarthCondErrorState">
                  <FontAwesomeIcon icon={faExclamationTriangle} size="2x" />
                  <h2>Connection Error</h2>
                  <button onClick={fetchConsolidatedEvaluation} className="dinosatEarthCondBtn dinosatEarthCondBtnPrimary">
                    {loading ? "Loading..." : "Refresh"}
                  </button>
                </div>
              ) : renderCurrentTabContent()}
            </div>
          </div>
        </div>
        <footer className="dinosatEarthCondFooter">
          <div className="dinosatEarthCondFooterContent">
            <span>Last Updated: {new Date().toLocaleTimeString()}</span>
            <span>Latency: {performanceMetrics.latency}ms</span>
            <span>Modules: {consolidatedData?.module_statuses?.length || 0}/5</span>
            <span>Alerts: {allAlerts.length}</span>
            <span>Violations: {allViolations.length}</span>
            <span>Decision: {decision.status}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}