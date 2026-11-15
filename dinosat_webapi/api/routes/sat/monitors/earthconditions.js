const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const router = express.Router();

const CACHE_DURATION = 300000;

const API_ENDPOINTS = {
  OPEN_METEO_FORECAST: "https://api.open-meteo.com/v1/forecast",
  OPEN_METEO_ARCHIVE: "https://archive-api.open-meteo.com/v1/archive",
  OPEN_METEO_MARINE: "https://marine-api.open-meteo.com/v1/marine",
  OPEN_METEO_ENSEMBLE: "https://ensemble-api.open-meteo.com/v1/ensemble",
  SWPC_KP_JSON: "https://services.swpc.noaa.gov/json/planetary_k_index_1m.json",
  SWPC_PROTONS: "https://services.swpc.noaa.gov/json/goes/primary/integral-protons-1-day.json",
  SWPC_ELECTRONS: "https://services.swpc.noaa.gov/json/goes/primary/integral-electrons-1-day.json",
  SWPC_XRAY_FLUX: "https://services.swpc.noaa.gov/json/goes/primary/xrays-1-day.json",
  SWPC_GEOSPACE: "https://services.swpc.noaa.gov/products/geospace/propagated-solar-wind-1-hour.json",
  SWPC_DST: "https://services.swpc.noaa.gov/products/kyoto-dst.json",
  SWPC_F107: "https://services.swpc.noaa.gov/json/f107_cm_flux.json",
  SWPC_SOLAR_WIND: "https://services.swpc.noaa.gov/products/solar-wind/mag-1-day.json",
  SWPC_SOLAR_WIND_PLASMA: "https://services.swpc.noaa.gov/products/solar-wind/plasma-1-day.json",
  SWPC_AP_INDEX: "https://services.swpc.noaa.gov/json/planetary_ap_index.json",
  SWPC_NEUTRON_DATA: "https://services.swpc.noaa.gov/json/goes/primary/neutrons-1-day.json",
  SWPC_SOLAR_CYCLE: "https://services.swpc.noaa.gov/json/solar-cycle/observed-solar-cycle-indices.json",
  SWPC_27DAY_OUTLOOK: "https://services.swpc.noaa.gov/text/27-day-outlook.txt",
  SWPC_XRAYS_7DAY: "https://services.swpc.noaa.gov/json/goes/primary/xrays-7-day.json",
  SWPC_SOLAR_PROBS: "https://services.swpc.noaa.gov/products/noaa-scales.json",
  SWPC_ALERTS: "https://services.swpc.noaa.gov/products/alerts.json",
  SWPC_3DAY_FORECAST: "https://services.swpc.noaa.gov/text/3-day-forecast.txt",
  SWPC_3DAY_GEOMAG: "https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json",
  SWPC_ENLIL_CME: "https://services.swpc.noaa.gov/products/animations/enlil.json",
  SWPC_SOLAR_REGIONS: "https://services.swpc.noaa.gov/json/solar_regions.json",
  SWPC_PROTONS_7DAY: "https://services.swpc.noaa.gov/json/goes/primary/integral-protons-7-day.json",
  SWPC_ELECTRONS_7DAY: "https://services.swpc.noaa.gov/json/goes/primary/integral-electrons-7-day.json",
  SWPC_MAG_7DAY: "https://services.swpc.noaa.gov/products/solar-wind/mag-7-day.json",
  SWPC_PLASMA_7DAY: "https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json",
  SWPC_ACE_MAG: "https://services.swpc.noaa.gov/products/solar-wind/mag-2-hour.json",
  SWPC_ACE_PLASMA: "https://services.swpc.noaa.gov/products/solar-wind/plasma-2-hour.json",
  SWPC_ACE_EPAM: "https://services.swpc.noaa.gov/json/ace/epam/ace_epam_1h.json",
  SWPC_DIFF_ELECTRONS: "https://services.swpc.noaa.gov/json/goes/primary/differential-electrons-1-day.json",
  SWPC_DIFF_PROTONS: "https://services.swpc.noaa.gov/json/goes/primary/differential-protons-1-day.json",
  SWPC_MAGNETOMETERS: "https://services.swpc.noaa.gov/json/goes/primary/magnetometers-1-day.json",
  AMSAT_TLE: "https://www.amsat.org/tle/current/nasa.all",
  USGS_EARTHQUAKE_DAY: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson",
  USGS_EARTHQUAKE_WEEK: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson",
  USGS_EARTHQUAKE_MONTH: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_month.geojson",
  USGS_EARTHQUAKE_QUERY: "https://earthquake.usgs.gov/fdsnws/event/1/query",
  SWPC_ELECTRONS_6HR: "https://services.swpc.noaa.gov/json/goes/primary/integral-electrons-6-hour.json",
  SWPC_XRAYS: "https://services.swpc.noaa.gov/json/goes/primary/xrays-1-day.json",
  SWPC_SOLAR_WIND_MAG: "https://services.swpc.noaa.gov/products/solar-wind/mag-1-day.json",
  USGS_EARTHQUAKES: "https://earthquake.usgs.gov/fdsnws/event/1/query",
  USGS_EARTHQUAKES_FEED: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson",
  NOAA_SPC_REPORTS_TODAY: "https://www.spc.noaa.gov/climo/reports/today_raw.csv",
  NOAA_SPC_REPORTS_YESTERDAY: "https://www.spc.noaa.gov/climo/reports/yesterday_raw.csv",
  NOAA_SPC_FILTERED_TORN: "https://www.spc.noaa.gov/climo/reports/today_torn.csv",
  NOAA_SPC_FILTERED_HAIL: "https://www.spc.noaa.gov/climo/reports/today_hail.csv",
  NOAA_SPC_FILTERED_WIND: "https://www.spc.noaa.gov/climo/reports/today_wind.csv",
  SWPC_K_INDEX_1MIN: "https://services.swpc.noaa.gov/json/planetary_k_index_1m.json",
  SWPC_BOULDER_K: "https://services.swpc.noaa.gov/json/boulder_k_index_1m.json",
  NMDB_REALTIME: "https://www.nmdb.eu/rt/realtime.txt",
  RTSW_1M: "https://services.swpc.noaa.gov/json/rtsw/rtsw_",
  NOMINATIM_REVERSE: "https://nominatim.openstreetmap.org/reverse",
  NWS_ALERTS_ACTIVE: "https://api.weather.gov/alerts/active",
  METEOALARM_FEEDS: "https://feeds.meteoalarm.org/api/v1/warnings/feeds-",
  OPEN_METEO_AIR_QUALITY: "https://air-quality-api.open-meteo.com/v1/air-quality",
  PURPLEAIR_SENSORS: "https://api.purpleair.com/v1/sensors",
  NOAA_TIDE_STATIONS: "https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json",
  NOAA_TIDES_DATAGETTER: "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter",
  WORLDTIDES: "https://www.worldtides.info/api/v3",
  USGS_WATERDATA: "https://api.waterdata.usgs.gov/ogcapi/v0/collections",
  OPEN_METEO_FLOOD: "https://flood-api.open-meteo.com/v1/flood",
  NHC_CURRENT_STORMS: "https://www.nhc.noaa.gov/CurrentStorms.json",
  GDACS_EVENT_LIST: "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH",
  AVIATIONWEATHER_METAR: "https://aviationweather.gov/api/data/metar",
  SWPC_OVATION: "https://services.swpc.noaa.gov/json/ovation_aurora_latest.json",
  OPEN_METEO_GEOCODING: "https://geocoding-api.open-meteo.com/v1/search",
  GEMINI_GENERATE: "https://generativelanguage.googleapis.com/v1beta/models/",
  NMDB_HELP: "https://www.nmdb.eu/nest/help.php",
  SWPC_KP_3HOUR: "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json",
  FAA_TFR_LIST: "https://tfr.faa.gov/tfr2/list.json",
  FAA_NOTAMS: "https://external-api.faa.gov/notamapi/v1/notams",
  ADSB_LOL: "https://api.adsb.lol/v2/lat/",
  ADSB_AIRPLANES_LIVE: "https://api.airplanes.live/v2/point/",
  ADSB_ONE: "https://api.adsb.one/v2/point/",
  SWPC_SOLAR_PROBABILITIES: "https://services.swpc.noaa.gov/json/solar_probabilities.json",
  SWPC_SGAS: "https://services.swpc.noaa.gov/text/sgas.txt",
  NMDB_GRAPH: "https://www.nmdb.eu/nest/draw_graph.php"
};

const API_KEY_ENV = {
  openMeteo: "OPEN_METEO_API_KEY",
  purpleAir: "PURPLEAIR_API_KEY",
  purpleAirSensor: "PURPLEAIR_SENSOR_INDEX",
  worldTides: "WORLDTIDES_API_KEY",
  usgs: "USGS_API_KEY",
  gemini: "GEMINI_API_KEY",
  geminiModel: "GEMINI_MODEL",
  userAgent: "WEATHER_API_USER_AGENT",
  interpretationRefreshMinutes: "INTERPRETATION_REFRESH_MINUTES"
};

const DEFAULT_USER_AGENT = "DinoSat-Earth-Conditions/1.0";

const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash";

const AREA_EVALUATION = {
  cacheMs: 240000,
  precision: 2,
  cacheLimit: 200
};

const ALERT_ANALYSIS = {
  name: "Gemini",
  modelEnv: "EARTH_CONDITIONS_ANALYSIS_MODEL",
  thinkingEnv: "EARTH_CONDITIONS_ANALYSIS_THINKING",
  defaultModel: "gemini-3.5-flash-lite",
  defaultThinking: "low",
  temperature: 0.3,
  maxOutputTokens: 1200,
  timeoutMs: 25000,
  cacheMs: 1800000,
  retryAfterMs: 60000,
  cacheLimit: 400,
  instructions: "You are a senior environmental hazards analyst briefing a member of the public about one active condition alert raised by a live environmental monitoring dashboard for a specific location. Use only the alert data and location provided and never invent facts, places, numbers, causes, or times. Write in plain, calm, direct language. The summary must be 2 to 4 complete sentences that say what the alert means, where it applies, how serious it is, and what is driving it based on the values provided. List the specific risks the condition creates for people, property, travel, outdoor activity, aviation, communications, or equipment as relevant, and say clearly when something cannot be known from the data. List concrete protective or monitoring actions in priority order. The timing field must be one complete sentence about when the alert was raised and how long the condition is likely to matter based only on the data. The confidence field must be one complete sentence explaining how reliable the alert is based on its source and the values. Every list item must be a complete sentence that ends with a period."
};

const HOST_CONCURRENCY_LIMITS = { "open-meteo.com": 2, "nmdb.eu": 1 };
const cache = new Map();
const serviceHealth = new Map();
const circuitBreakers = new Map();
const sharedParameterRegistry = new Set();
const sharedParameterValues = new Map();
const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_TIMEOUT = 30000;

const ALERT_SEVERITY = {
  CRITICAL: { level: 5, weight: 1.0, color: "RED", audioAlert: true, riskContribution: 0.25, confidencePenalty: 0.15 },
  WARNING: { level: 4, weight: 0.7, color: "YELLOW", audioAlert: true, riskContribution: 0.08, confidencePenalty: 0.05 },
  ADVISORY: { level: 3, weight: 0.4, color: "ORANGE", audioAlert: false, riskContribution: 0.02, confidencePenalty: 0.015 },
  INFO: { level: 2, weight: 0.2, color: "BLUE", audioAlert: false, riskContribution: 0.003, confidencePenalty: 0.002 },
  NOMINAL: { level: 1, weight: 0.05, color: "GREEN", audioAlert: false, riskContribution: 0.0, confidencePenalty: 0.0 }
};

const DATA_CRITICALITY = {
  PRIMARY: { weight: 1.0, failureImpact: "SEVERE", violationMultiplier: 2.0 },
  SAFETY_CRITICAL: { weight: 0.9, failureImpact: "SEVERE", violationMultiplier: 1.8 },
  OPERATIONAL: { weight: 0.7, failureImpact: "ELEVATED", violationMultiplier: 1.4 },
  INFORMATIONAL: { weight: 0.4, failureImpact: "DEGRADED", violationMultiplier: 1.0 },
  SUPPLEMENTARY: { weight: 0.2, failureImpact: "MINIMAL", violationMultiplier: 0.6 }
};

const INDUSTRY_LIMITS = {
  us_aqi: { unit: "", optimal: { min: 0, max: 50 }, nominal: { min: 0, max: 100 }, marginal: { min: 0, max: 100 }, warning: { min: 0, max: 150 }, critical: { min: 0, max: 200 }, source: "US EPA AQI" },
  pm2_5: { unit: "ug/m3", optimal: { min: 0, max: 9 }, nominal: { min: 0, max: 35.4 }, marginal: { min: 0, max: 35.4 }, warning: { min: 0, max: 55.4 }, critical: { min: 0, max: 125.4 }, source: "US EPA 2024 PM2.5 Breakpoints" },
  uv_index: { unit: "", optimal: { min: 0, max: 2 }, nominal: { min: 0, max: 5 }, marginal: { min: 0, max: 7 }, warning: { min: 0, max: 10 }, critical: { min: 0, max: 11 }, source: "WHO Global Solar UV Index" },
  wet_bulb_globe_temperature: { unit: "C", optimal: { min: -50, max: 25.6 }, nominal: { min: -50, max: 27.7 }, marginal: { min: -50, max: 27.7 }, warning: { min: -50, max: 29.4 }, critical: { min: -50, max: 31.1 }, source: "US Military WBGT Heat Categories" },
  surface_wind_speed: { unit: "m/s", optimal: { min: 0, max: 8 }, nominal: { min: 0, max: 10.3 }, marginal: { min: 0, max: 12.9 }, warning: { min: 0, max: 15.4 }, critical: { min: 0, max: 20.6 }, source: "NASA-STD-8719.24" },
  surface_wind_gusts: { unit: "m/s", optimal: { min: 0, max: 10 }, nominal: { min: 0, max: 13 }, marginal: { min: 0, max: 16 }, warning: { min: 0, max: 20 }, critical: { min: 0, max: 25 }, source: "NASA-STD-8719.24" },
  surface_visibility: { unit: "m", optimal: { min: 9260, max: Infinity }, nominal: { min: 7400, max: Infinity }, marginal: { min: 5556, max: Infinity }, warning: { min: 3704, max: Infinity }, critical: { min: 1852, max: Infinity }, source: "FAA-AST" },
  surface_temperature: { unit: "C", optimal: { min: 10, max: 30 }, nominal: { min: 5, max: 35 }, marginal: { min: 0, max: 38 }, warning: { min: -5, max: 42 }, critical: { min: -10, max: 48 }, source: "Range-Safety" },
  surface_humidity: { unit: "%", optimal: { min: 30, max: 70 }, nominal: { min: 20, max: 80 }, marginal: { min: 15, max: 85 }, warning: { min: 10, max: 90 }, critical: { min: 5, max: 95 }, source: "NASA-KSC" },
  surface_pressure: { unit: "hPa", optimal: { min: 1005, max: 1025 }, nominal: { min: 995, max: 1035 }, marginal: { min: 985, max: 1045 }, warning: { min: 970, max: 1050 }, critical: { min: 950, max: 1060 }, source: "ICAO" },
  kp_index: { unit: "", optimal: { min: 0, max: 2 }, nominal: { min: 0, max: 3 }, marginal: { min: 0, max: 4 }, warning: { min: 0, max: 5 }, critical: { min: 0, max: 7 }, source: "NOAA-SWPC" },
  proton_flux_10mev: { unit: "pfu", optimal: { min: 0, max: 0.5 }, nominal: { min: 0, max: 1 }, marginal: { min: 0, max: 5 }, warning: { min: 0, max: 10 }, critical: { min: 0, max: 100 }, source: "NOAA-SWPC" },
  proton_flux_50mev: { unit: "pfu", optimal: { min: 0, max: 0.1 }, nominal: { min: 0, max: 0.5 }, marginal: { min: 0, max: 1 }, warning: { min: 0, max: 5 }, critical: { min: 0, max: 50 }, source: "NOAA-SWPC" },
  proton_flux_100mev: { unit: "pfu", optimal: { min: 0, max: 0.05 }, nominal: { min: 0, max: 0.2 }, marginal: { min: 0, max: 0.5 }, warning: { min: 0, max: 2 }, critical: { min: 0, max: 20 }, source: "NOAA-SWPC" },
  electron_flux_2mev: { unit: "pfu", optimal: { min: 0, max: 500 }, nominal: { min: 0, max: 1000 }, marginal: { min: 0, max: 5000 }, warning: { min: 0, max: 10000 }, critical: { min: 0, max: 100000 }, source: "NOAA-SWPC" },
  total_electron_content: { unit: "TECU", optimal: { min: 0, max: 25 }, nominal: { min: 0, max: 40 }, marginal: { min: 0, max: 55 }, warning: { min: 0, max: 70 }, critical: { min: 0, max: 100 }, source: "NOAA-SWPC" },
  scintillation_s4: { unit: "S4", optimal: { min: 0, max: 0.2 }, nominal: { min: 0, max: 0.3 }, marginal: { min: 0, max: 0.4 }, warning: { min: 0, max: 0.6 }, critical: { min: 0, max: 0.9 }, source: "ITU-R" },
  gps_accuracy: { unit: "m", optimal: { min: 0, max: 1.5 }, nominal: { min: 0, max: 2.5 }, marginal: { min: 0, max: 4 }, warning: { min: 0, max: 6 }, critical: { min: 0, max: 10 }, source: "FAA-WAAS" },
  radio_link_quality: { unit: "%", optimal: { min: 95, max: 100 }, nominal: { min: 85, max: 100 }, marginal: { min: 75, max: 100 }, warning: { min: 60, max: 100 }, critical: { min: 40, max: 100 }, source: "CCSDS" },
  wind_shear: { unit: "m/s/km", optimal: { min: 0, max: 15 }, nominal: { min: 0, max: 25 }, marginal: { min: 0, max: 32 }, warning: { min: 0, max: 40 }, critical: { min: 0, max: 55 }, source: "NASA-STD-8719.24" },
  wave_height: { unit: "m", optimal: { min: 0, max: 1.5 }, nominal: { min: 0, max: 2.5 }, marginal: { min: 0, max: 3.5 }, warning: { min: 0, max: 4.5 }, critical: { min: 0, max: 6 }, source: "USCG" },
  heat_index: { unit: "C", optimal: { min: -Infinity, max: 27 }, nominal: { min: -Infinity, max: 32 }, marginal: { min: -Infinity, max: 38 }, warning: { min: -Infinity, max: 42 }, critical: { min: -Infinity, max: 50 }, source: "OSHA" },
  lightning_standoff: { unit: "nm", optimal: { min: 20, max: Infinity }, nominal: { min: 15, max: Infinity }, marginal: { min: 10, max: Infinity }, warning: { min: 5, max: Infinity }, critical: { min: 0.1, max: Infinity }, source: "NASA-STD-8719.24" },
  freezing_level: { unit: "m", optimal: { min: 3000, max: Infinity }, nominal: { min: 2000, max: Infinity }, marginal: { min: 1000, max: Infinity }, warning: { min: 500, max: Infinity }, critical: { min: 200, max: Infinity }, source: "FAA-AC" },
  fire_risk_index: { unit: "", optimal: { min: 0, max: 10 }, nominal: { min: 0, max: 20 }, marginal: { min: 0, max: 35 }, warning: { min: 0, max: 50 }, critical: { min: 0, max: 80 }, source: "NFDRS" },
  data_reliability: { unit: "", optimal: { min: 0.9, max: 1 }, nominal: { min: 0.8, max: 1 }, marginal: { min: 0.7, max: 1 }, warning: { min: 0.55, max: 1 }, critical: { min: 0.4, max: 1 }, source: "ISO-25010" },
  wind_forecast_t1h: { unit: "m/s", optimal: { min: 0, max: 9 }, nominal: { min: 0, max: 11 }, marginal: { min: 0, max: 14 }, warning: { min: 0, max: 17 }, critical: { min: 0, max: 22 }, source: "NASA-STD-8719.24" },
  wind_forecast_t2h: { unit: "m/s", optimal: { min: 0, max: 9 }, nominal: { min: 0, max: 11 }, marginal: { min: 0, max: 14 }, warning: { min: 0, max: 17 }, critical: { min: 0, max: 22 }, source: "NASA-STD-8719.24" },
  wind_forecast_t3h: { unit: "m/s", optimal: { min: 0, max: 9 }, nominal: { min: 0, max: 11 }, marginal: { min: 0, max: 14 }, warning: { min: 0, max: 17 }, critical: { min: 0, max: 22 }, source: "NASA-STD-8719.24" },
  wind_forecast_t6h: { unit: "m/s", optimal: { min: 0, max: 9 }, nominal: { min: 0, max: 11 }, marginal: { min: 0, max: 14 }, warning: { min: 0, max: 17 }, critical: { min: 0, max: 22 }, source: "NASA-STD-8719.24" },
  wind_forecast_t12h: { unit: "m/s", optimal: { min: 0, max: 9 }, nominal: { min: 0, max: 11 }, marginal: { min: 0, max: 14 }, warning: { min: 0, max: 17 }, critical: { min: 0, max: 22 }, source: "NASA-STD-8719.24" },
  wind_forecast_t24h: { unit: "m/s", optimal: { min: 0, max: 9 }, nominal: { min: 0, max: 11 }, marginal: { min: 0, max: 14 }, warning: { min: 0, max: 17 }, critical: { min: 0, max: 22 }, source: "NASA-STD-8719.24" },
  precip_prob_t1h: { unit: "%", optimal: { min: 0, max: 10 }, nominal: { min: 0, max: 25 }, marginal: { min: 0, max: 40 }, warning: { min: 0, max: 60 }, critical: { min: 0, max: 85 }, source: "NASA-KSC" },
  precip_prob_t2h: { unit: "%", optimal: { min: 0, max: 10 }, nominal: { min: 0, max: 25 }, marginal: { min: 0, max: 40 }, warning: { min: 0, max: 60 }, critical: { min: 0, max: 85 }, source: "NASA-KSC" },
  precip_prob_t3h: { unit: "%", optimal: { min: 0, max: 10 }, nominal: { min: 0, max: 25 }, marginal: { min: 0, max: 40 }, warning: { min: 0, max: 60 }, critical: { min: 0, max: 85 }, source: "NASA-KSC" },
  precip_prob_t6h: { unit: "%", optimal: { min: 0, max: 15 }, nominal: { min: 0, max: 30 }, marginal: { min: 0, max: 50 }, warning: { min: 0, max: 70 }, critical: { min: 0, max: 90 }, source: "NASA-KSC" },
  precip_prob_t12h: { unit: "%", optimal: { min: 0, max: 15 }, nominal: { min: 0, max: 30 }, marginal: { min: 0, max: 50 }, warning: { min: 0, max: 70 }, critical: { min: 0, max: 90 }, source: "NASA-KSC" },
  precip_prob_t24h: { unit: "%", optimal: { min: 0, max: 20 }, nominal: { min: 0, max: 35 }, marginal: { min: 0, max: 55 }, warning: { min: 0, max: 75 }, critical: { min: 0, max: 95 }, source: "NASA-KSC" },
  kp_trend_derivative: { unit: "/h", optimal: { min: -0.2, max: 0.2 }, nominal: { min: -0.5, max: 0.5 }, marginal: { min: -0.8, max: 0.8 }, warning: { min: -1.2, max: 1.2 }, critical: { min: -2, max: 2 }, source: "NOAA-SWPC" },
  wind_trend_derivative: { unit: "m/s/h", optimal: { min: -0.5, max: 0.5 }, nominal: { min: -1, max: 1 }, marginal: { min: -1.5, max: 1.5 }, warning: { min: -2.5, max: 2.5 }, critical: { min: -4, max: 4 }, source: "NWS" },
  shear_trend_derivative: { unit: "/h", optimal: { min: -0.5, max: 0.5 }, nominal: { min: -1, max: 1 }, marginal: { min: -2, max: 2 }, warning: { min: -3, max: 3 }, critical: { min: -5, max: 5 }, source: "NASA-MSFC" },
  surface_wind_direction: { unit: "deg", optimal: { min: 0, max: 360 }, nominal: { min: 0, max: 360 }, marginal: { min: 0, max: 360 }, warning: { min: 0, max: 360 }, critical: { min: 0, max: 360 }, source: "RANGE" },
  nearby_earthquakes: { unit: "", optimal: { min: 0, max: 2 }, nominal: { min: 0, max: 5 }, marginal: { min: 0, max: 8 }, warning: { min: 0, max: 12 }, critical: { min: 0, max: 20 }, source: "USGS" },
  tracked_objects: { unit: "", optimal: { min: 0, max: 25000 }, nominal: { min: 0, max: 30000 }, marginal: { min: 0, max: 35000 }, warning: { min: 0, max: 40000 }, critical: { min: 0, max: 50000 }, source: "JSpOC" },
  solar_wind_speed: { unit: "km/s", optimal: { min: 300, max: 450 }, nominal: { min: 250, max: 550 }, marginal: { min: 200, max: 650 }, warning: { min: 150, max: 750 }, critical: { min: 100, max: 1000 }, source: "NOAA-SWPC" },
  solar_wind_density: { unit: "p/cm3", optimal: { min: 1, max: 8 }, nominal: { min: 0.5, max: 12 }, marginal: { min: 0.2, max: 18 }, warning: { min: 0.1, max: 25 }, critical: { min: 0.05, max: 40 }, source: "NOAA-SWPC" },
  dst_index: { unit: "nT", optimal: { min: -20, max: 20 }, nominal: { min: -40, max: 30 }, marginal: { min: -60, max: 40 }, warning: { min: -100, max: 50 }, critical: { min: -250, max: 70 }, source: "NOAA-SWPC" },
  f107_flux: { unit: "sfu", optimal: { min: 70, max: 120 }, nominal: { min: 60, max: 150 }, marginal: { min: 50, max: 180 }, warning: { min: 40, max: 220 }, critical: { min: 30, max: 300 }, source: "NOAA-SWPC" },
  xray_flux: { unit: "W/m2", optimal: { min: 1e-9, max: 1e-7 }, nominal: { min: 1e-10, max: 1e-6 }, marginal: { min: 1e-11, max: 1e-5 }, warning: { min: 1e-12, max: 1e-4 }, critical: { min: 1e-13, max: 1e-3 }, source: "NOAA-SWPC" },
  ap_index: { unit: "nT", optimal: { min: 0, max: 7 }, nominal: { min: 0, max: 15 }, marginal: { min: 0, max: 27 }, warning: { min: 0, max: 50 }, critical: { min: 0, max: 100 }, source: "NOAA-SWPC" },
  solar_flux_10cm: { unit: "sfu", optimal: { min: 70, max: 120 }, nominal: { min: 60, max: 150 }, marginal: { min: 50, max: 180 }, warning: { min: 40, max: 220 }, critical: { min: 30, max: 300 }, source: "NOAA-SWPC" },
  neutron_flux: { unit: "counts/min", optimal: { min: 4000, max: 6000 }, nominal: { min: 3500, max: 6500 }, marginal: { min: 3000, max: 7000 }, warning: { min: 2500, max: 7500 }, critical: { min: 2000, max: 8000 }, source: "NOAA-SWPC" },
  cosmic_ray_intensity: { unit: "percent", optimal: { min: 90, max: 110 }, nominal: { min: 85, max: 115 }, marginal: { min: 80, max: 120 }, warning: { min: 75, max: 125 }, critical: { min: 70, max: 130 }, source: "NOAA-SWPC" },
  seismic_magnitude_max_24h: { unit: "magnitude", optimal: { min: 0, max: 3.0 }, nominal: { min: 0, max: 4.0 }, marginal: { min: 0, max: 5.0 }, warning: { min: 0, max: 6.0 }, critical: { min: 0, max: 8.0 }, source: "USGS" },
  atmospheric_stability: { unit: "index", optimal: { min: 0.8, max: 1.0 }, nominal: { min: 0.6, max: 1.0 }, marginal: { min: 0.4, max: 1.0 }, warning: { min: 0.2, max: 1.0 }, critical: { min: 0.0, max: 1.0 }, source: "METEO" },
  cloud_cover_optical: { unit: "percent", optimal: { min: 0, max: 25 }, nominal: { min: 0, max: 50 }, marginal: { min: 0, max: 75 }, warning: { min: 0, max: 90 }, critical: { min: 0, max: 100 }, source: "METEO" },
  cloud_cover_low: { unit: "%", optimal: { min: 0, max: 20 }, nominal: { min: 0, max: 40 }, marginal: { min: 0, max: 60 }, warning: { min: 0, max: 80 }, critical: { min: 0, max: 100 }, source: "NASA-STD-8719.24" },
  cloud_cover_mid: { unit: "%", optimal: { min: 0, max: 30 }, nominal: { min: 0, max: 50 }, marginal: { min: 0, max: 70 }, warning: { min: 0, max: 85 }, critical: { min: 0, max: 100 }, source: "NASA-STD-8719.24" },
  cloud_cover_high: { unit: "%", optimal: { min: 0, max: 50 }, nominal: { min: 0, max: 70 }, marginal: { min: 0, max: 85 }, warning: { min: 0, max: 95 }, critical: { min: 0, max: 100 }, source: "FAA-VFR" },
  cloud_cover_total: { unit: "%", optimal: { min: 0, max: 25 }, nominal: { min: 0, max: 50 }, marginal: { min: 0, max: 75 }, warning: { min: 0, max: 90 }, critical: { min: 0, max: 100 }, source: "NASA-STD-8719.24" },
  cloud_base_height: { unit: "m", optimal: { min: 1500, max: Infinity }, nominal: { min: 1000, max: Infinity }, marginal: { min: 600, max: Infinity }, warning: { min: 300, max: Infinity }, critical: { min: 100, max: Infinity }, source: "FAA-VFR" },
  precipitable_water: { unit: "mm", optimal: { min: 0, max: 20 }, nominal: { min: 0, max: 35 }, marginal: { min: 0, max: 50 }, warning: { min: 0, max: 65 }, critical: { min: 0, max: 100 }, source: "NWS-RAOB" },
  relative_humidity_850hpa: { unit: "%", optimal: { min: 20, max: 65 }, nominal: { min: 15, max: 75 }, marginal: { min: 10, max: 85 }, warning: { min: 5, max: 92 }, critical: { min: 0, max: 100 }, source: "NASA-KSC" },
  relative_humidity_700hpa: { unit: "%", optimal: { min: 15, max: 60 }, nominal: { min: 10, max: 70 }, marginal: { min: 5, max: 80 }, warning: { min: 0, max: 90 }, critical: { min: 0, max: 100 }, source: "NASA-KSC" },
  relative_humidity_500hpa: { unit: "%", optimal: { min: 10, max: 55 }, nominal: { min: 5, max: 65 }, marginal: { min: 0, max: 75 }, warning: { min: 0, max: 85 }, critical: { min: 0, max: 100 }, source: "NASA-KSC" },
  relative_humidity_300hpa: { unit: "%", optimal: { min: 5, max: 40 }, nominal: { min: 0, max: 50 }, marginal: { min: 0, max: 65 }, warning: { min: 0, max: 80 }, critical: { min: 0, max: 100 }, source: "NASA-KSC" },
  dewpoint_depression_surface: { unit: "C", optimal: { min: 5, max: Infinity }, nominal: { min: 3, max: Infinity }, marginal: { min: 2, max: Infinity }, warning: { min: 1, max: Infinity }, critical: { min: 0.5, max: Infinity }, source: "FAA-AC" },
  temperature_inversion_strength: { unit: "C/100m", optimal: { min: -Infinity, max: 0.5 }, nominal: { min: -Infinity, max: 1.0 }, marginal: { min: -Infinity, max: 2.0 }, warning: { min: -Infinity, max: 3.5 }, critical: { min: -Infinity, max: 6.0 }, source: "NWS-RAOB" },
  inversion_base_height: { unit: "m", optimal: { min: 2000, max: Infinity }, nominal: { min: 1000, max: Infinity }, marginal: { min: 500, max: Infinity }, warning: { min: 200, max: Infinity }, critical: { min: 50, max: Infinity }, source: "NWS-RAOB" },
  inversion_thickness: { unit: "m", optimal: { min: 0, max: 200 }, nominal: { min: 0, max: 400 }, marginal: { min: 0, max: 700 }, warning: { min: 0, max: 1200 }, critical: { min: 0, max: 2500 }, source: "NWS-RAOB" },
  fog_probability: { unit: "%", optimal: { min: 0, max: 10 }, nominal: { min: 0, max: 25 }, marginal: { min: 0, max: 45 }, warning: { min: 0, max: 65 }, critical: { min: 0, max: 90 }, source: "NWS" },
  precipitation_rate: { unit: "mm/h", optimal: { min: 0, max: 0.5 }, nominal: { min: 0, max: 2 }, marginal: { min: 0, max: 5 }, warning: { min: 0, max: 10 }, critical: { min: 0, max: 25 }, source: "NASA-STD-8719.24" },
  convective_available_potential_energy: { unit: "J/kg", optimal: { min: 0, max: 500 }, nominal: { min: 0, max: 1000 }, marginal: { min: 0, max: 1500 }, warning: { min: 0, max: 2500 }, critical: { min: 0, max: 4000 }, source: "NWS-SPC" },
  lifted_index: { unit: "C", optimal: { min: 2, max: Infinity }, nominal: { min: 0, max: Infinity }, marginal: { min: -2, max: Infinity }, warning: { min: -4, max: Infinity }, critical: { min: -6, max: Infinity }, source: "NWS-SPC" },
  static_electricity_risk: { unit: "index", optimal: { min: 0, max: 0.2 }, nominal: { min: 0, max: 0.4 }, marginal: { min: 0, max: 0.6 }, warning: { min: 0, max: 0.8 }, critical: { min: 0, max: 1.0 }, source: "NASA-KSC" },
  frost_formation_risk: { unit: "index", optimal: { min: 0, max: 0.15 }, nominal: { min: 0, max: 0.3 }, marginal: { min: 0, max: 0.5 }, warning: { min: 0, max: 0.75 }, critical: { min: 0, max: 1.0 }, source: "NASA-KSC" },
  cumulus_penetration_altitude: { unit: "m", optimal: { min: 6000, max: Infinity }, nominal: { min: 4500, max: Infinity }, marginal: { min: 3000, max: Infinity }, warning: { min: 2000, max: Infinity }, critical: { min: 1000, max: Infinity }, source: "FAA-AC" },
  xray_flux_short: { unit: "W/m2", optimal: { min: 0, max: 1e-8 }, nominal: { min: 0, max: 1e-7 }, marginal: { min: 0, max: 1e-6 }, warning: { min: 0, max: 1e-5 }, critical: { min: 0, max: 1e-4 }, source: "NOAA-SWPC-GOES" },
  xray_flux_long: { unit: "W/m2", optimal: { min: 0, max: 1e-7 }, nominal: { min: 0, max: 1e-6 }, marginal: { min: 0, max: 1e-5 }, warning: { min: 0, max: 1e-4 }, critical: { min: 0, max: 1e-3 }, source: "NOAA-SWPC-GOES" },
  solar_flare_prob_m: { unit: "%", optimal: { min: 0, max: 10 }, nominal: { min: 0, max: 25 }, marginal: { min: 0, max: 40 }, warning: { min: 0, max: 60 }, critical: { min: 0, max: 85 }, source: "NOAA-SWPC" },
  solar_flare_prob_x: { unit: "%", optimal: { min: 0, max: 1 }, nominal: { min: 0, max: 5 }, marginal: { min: 0, max: 10 }, warning: { min: 0, max: 25 }, critical: { min: 0, max: 50 }, source: "NOAA-SWPC" },
  solar_flare_prob_c: { unit: "%", optimal: { min: 0, max: 30 }, nominal: { min: 0, max: 50 }, marginal: { min: 0, max: 70 }, warning: { min: 0, max: 85 }, critical: { min: 0, max: 99 }, source: "NOAA-SWPC" },
  proton_event_prob: { unit: "%", optimal: { min: 0, max: 5 }, nominal: { min: 0, max: 15 }, marginal: { min: 0, max: 30 }, warning: { min: 0, max: 50 }, critical: { min: 0, max: 80 }, source: "NOAA-SWPC" },
  triboelectric_risk_index: { unit: "index", optimal: { min: 0, max: 0.15 }, nominal: { min: 0, max: 0.3 }, marginal: { min: 0, max: 0.5 }, warning: { min: 0, max: 0.7 }, critical: { min: 0, max: 1.0 }, source: "NASA-TP-2006-214601" },
  ice_crystal_indicator: { unit: "index", optimal: { min: 0, max: 0.2 }, nominal: { min: 0, max: 0.4 }, marginal: { min: 0, max: 0.6 }, warning: { min: 0, max: 0.8 }, critical: { min: 0, max: 1.0 }, source: "NASA-STD-8719.24" },
  cme_arrival_probability: { unit: "%", optimal: { min: 0, max: 10 }, nominal: { min: 0, max: 25 }, marginal: { min: 0, max: 45 }, warning: { min: 0, max: 65 }, critical: { min: 0, max: 90 }, source: "NOAA-SWPC-ENLIL" },
  geomagnetic_storm_prob_minor: { unit: "%", optimal: { min: 0, max: 15 }, nominal: { min: 0, max: 30 }, marginal: { min: 0, max: 50 }, warning: { min: 0, max: 70 }, critical: { min: 0, max: 90 }, source: "NOAA-SWPC" },
  geomagnetic_storm_prob_major: { unit: "%", optimal: { min: 0, max: 5 }, nominal: { min: 0, max: 15 }, marginal: { min: 0, max: 30 }, warning: { min: 0, max: 50 }, critical: { min: 0, max: 80 }, source: "NOAA-SWPC" },
  radio_blackout_prob_r1r2: { unit: "%", optimal: { min: 0, max: 20 }, nominal: { min: 0, max: 40 }, marginal: { min: 0, max: 60 }, warning: { min: 0, max: 80 }, critical: { min: 0, max: 95 }, source: "NOAA-SWPC" },
  radio_blackout_prob_r3: { unit: "%", optimal: { min: 0, max: 5 }, nominal: { min: 0, max: 15 }, marginal: { min: 0, max: 30 }, warning: { min: 0, max: 50 }, critical: { min: 0, max: 80 }, source: "NOAA-SWPC" },
  electric_field_strength: { unit: "kV/m", optimal: { min: -1.5, max: 1.5 }, nominal: { min: -3, max: 3 }, marginal: { min: -5, max: 5 }, warning: { min: -8, max: 8 }, critical: { min: -15, max: 15 }, source: "NASA-KSC-LPLWS" },
  lightning_strikes_10nm: { unit: "", optimal: { min: 0, max: 0 }, nominal: { min: 0, max: 1 }, marginal: { min: 0, max: 3 }, warning: { min: 0, max: 5 }, critical: { min: 0, max: 10 }, source: "NOAA-NLDN" },
  lightning_strikes_20nm: { unit: "", optimal: { min: 0, max: 0 }, nominal: { min: 0, max: 3 }, marginal: { min: 0, max: 8 }, warning: { min: 0, max: 15 }, critical: { min: 0, max: 30 }, source: "NOAA-NLDN" },
  lightning_strikes_30nm: { unit: "", optimal: { min: 0, max: 2 }, nominal: { min: 0, max: 8 }, marginal: { min: 0, max: 20 }, warning: { min: 0, max: 40 }, critical: { min: 0, max: 80 }, source: "NOAA-NLDN" },
  anvil_cloud_distance: { unit: "nm", optimal: { min: 20, max: Infinity }, nominal: { min: 10, max: Infinity }, marginal: { min: 5, max: Infinity }, warning: { min: 3, max: Infinity }, critical: { min: 0, max: Infinity }, source: "NASA-STD-8719.24" },
  cumulus_electrification_index: { unit: "index", optimal: { min: 0, max: 0.2 }, nominal: { min: 0, max: 0.4 }, marginal: { min: 0, max: 0.6 }, warning: { min: 0, max: 0.8 }, critical: { min: 0, max: 1.0 }, source: "NASA-KSC-ABFM" },
  active_tfr_count: { unit: "", optimal: { min: 0, max: 1 }, nominal: { min: 0, max: 3 }, marginal: { min: 0, max: 5 }, warning: { min: 0, max: 8 }, critical: { min: 0, max: 15 }, source: "FAA-TFR" },
  active_notam_count: { unit: "", optimal: { min: 0, max: 5 }, nominal: { min: 0, max: 15 }, marginal: { min: 0, max: 30 }, warning: { min: 0, max: 50 }, critical: { min: 0, max: 100 }, source: "FAA-NOTAM" },
  airspace_closure_status: { unit: "index", optimal: { min: 1, max: 1 }, nominal: { min: 0.8, max: 1 }, marginal: { min: 0.5, max: 1 }, warning: { min: 0.3, max: 1 }, critical: { min: 0, max: 1 }, source: "FAA-ARTCC" },
  k_index_boulder: { unit: "", optimal: { min: 0, max: 2 }, nominal: { min: 0, max: 3 }, marginal: { min: 0, max: 4 }, warning: { min: 0, max: 5 }, critical: { min: 0, max: 9 }, source: "NOAA-SWPC" },
  goes_proton_gt10mev: { unit: "pfu", optimal: { min: 0, max: 1 }, nominal: { min: 0, max: 10 }, marginal: { min: 0, max: 100 }, warning: { min: 0, max: 1000 }, critical: { min: 0, max: 100000 }, source: "NOAA-GOES" },
  goes_proton_gt50mev: { unit: "pfu", optimal: { min: 0, max: 0.1 }, nominal: { min: 0, max: 1 }, marginal: { min: 0, max: 10 }, warning: { min: 0, max: 100 }, critical: { min: 0, max: 10000 }, source: "NOAA-GOES" },
  goes_proton_gt100mev: { unit: "pfu", optimal: { min: 0, max: 0.01 }, nominal: { min: 0, max: 0.1 }, marginal: { min: 0, max: 1 }, warning: { min: 0, max: 10 }, critical: { min: 0, max: 1000 }, source: "NOAA-GOES" },
  goes_electron_gt2mev: { unit: "pfu", optimal: { min: 0, max: 100 }, nominal: { min: 0, max: 1000 }, marginal: { min: 0, max: 10000 }, warning: { min: 0, max: 100000 }, critical: { min: 0, max: 1000000 }, source: "NOAA-GOES" },
  bz_component: { unit: "nT", optimal: { min: -5, max: 5 }, nominal: { min: -10, max: 10 }, marginal: { min: -15, max: 15 }, warning: { min: -20, max: 20 }, critical: { min: -50, max: 50 }, source: "NOAA-SWPC-ACE" },
  convective_inhibition: { unit: "J/kg", optimal: { min: -50, max: 0 }, nominal: { min: -100, max: 0 }, marginal: { min: -200, max: 0 }, warning: { min: -400, max: 0 }, critical: { min: -1000, max: 0 }, source: "NWS-SPC" },
  severe_weather_reports_24h: { unit: "", optimal: { min: 0, max: 2 }, nominal: { min: 0, max: 5 }, marginal: { min: 0, max: 10 }, warning: { min: 0, max: 20 }, critical: { min: 0, max: 50 }, source: "NOAA-SPC" },
  hail_reports_24h: { unit: "", optimal: { min: 0, max: 0 }, nominal: { min: 0, max: 2 }, marginal: { min: 0, max: 5 }, warning: { min: 0, max: 10 }, critical: { min: 0, max: 25 }, source: "NOAA-SPC" },
  tornado_reports_24h: { unit: "", optimal: { min: 0, max: 0 }, nominal: { min: 0, max: 0 }, marginal: { min: 0, max: 1 }, warning: { min: 0, max: 2 }, critical: { min: 0, max: 5 }, source: "NOAA-SPC" },
  wind_damage_reports_24h: { unit: "", optimal: { min: 0, max: 1 }, nominal: { min: 0, max: 3 }, marginal: { min: 0, max: 8 }, warning: { min: 0, max: 15 }, critical: { min: 0, max: 30 }, source: "NOAA-SPC" },
  land_sea_temp_gradient: { unit: "C", optimal: { min: -3, max: 3 }, nominal: { min: -5, max: 5 }, marginal: { min: -8, max: 8 }, warning: { min: -12, max: 12 }, critical: { min: -18, max: 18 }, source: "NOAA-NDBC" },
  sea_surface_temperature: { unit: "C", optimal: { min: 15, max: 28 }, nominal: { min: 10, max: 32 }, marginal: { min: 5, max: 35 }, warning: { min: 0, max: 38 }, critical: { min: -2, max: 42 }, source: "Open-Meteo-Marine" },
  sea_breeze_front_probability: { unit: "%", optimal: { min: 0, max: 20 }, nominal: { min: 0, max: 40 }, marginal: { min: 0, max: 60 }, warning: { min: 0, max: 80 }, critical: { min: 0, max: 100 }, source: "Mesoscale-Calc" },
  coastal_convergence_index: { unit: "index", optimal: { min: 0, max: 0.2 }, nominal: { min: 0, max: 0.4 }, marginal: { min: 0, max: 0.6 }, warning: { min: 0, max: 0.8 }, critical: { min: 0, max: 1.0 }, source: "Mesoscale-Calc" },
  marine_layer_depth: { unit: "m", optimal: { min: 0, max: 300 }, nominal: { min: 0, max: 600 }, marginal: { min: 0, max: 1000 }, warning: { min: 0, max: 1500 }, critical: { min: 0, max: 2500 }, source: "Open-Meteo-Marine" },
  onshore_flow_intensity: { unit: "m/s", optimal: { min: 0, max: 6 }, nominal: { min: 0, max: 10 }, marginal: { min: 0, max: 15 }, warning: { min: 0, max: 22 }, critical: { min: 0, max: 30 }, source: "Mesoscale-Calc" },
  thermal_circulation_strength: { unit: "index", optimal: { min: 0, max: 0.25 }, nominal: { min: 0, max: 0.45 }, marginal: { min: 0, max: 0.65 }, warning: { min: 0, max: 0.85 }, critical: { min: 0, max: 1.0 }, source: "Mesoscale-Calc" },
  sound_speed_surface: { unit: "m/s", optimal: { min: 330, max: 350 }, nominal: { min: 320, max: 360 }, marginal: { min: 310, max: 370 }, warning: { min: 300, max: 380 }, critical: { min: 290, max: 400 }, source: "Acoustic-Calc" },
  sound_speed_gradient: { unit: "m/s/km", optimal: { min: -5, max: 5 }, nominal: { min: -10, max: 10 }, marginal: { min: -20, max: 20 }, warning: { min: -35, max: 35 }, critical: { min: -60, max: 60 }, source: "Acoustic-Calc" },
  acoustic_shadow_zone_distance: { unit: "km", optimal: { min: 15, max: Infinity }, nominal: { min: 10, max: Infinity }, marginal: { min: 5, max: Infinity }, warning: { min: 2, max: Infinity }, critical: { min: 0.5, max: Infinity }, source: "Acoustic-Calc" },
  acoustic_duct_probability: { unit: "%", optimal: { min: 0, max: 15 }, nominal: { min: 0, max: 35 }, marginal: { min: 0, max: 55 }, warning: { min: 0, max: 75 }, critical: { min: 0, max: 95 }, source: "Acoustic-Calc" },
  refraction_coefficient: { unit: "", optimal: { min: 0.9, max: 1.1 }, nominal: { min: 0.8, max: 1.3 }, marginal: { min: 0.6, max: 1.6 }, warning: { min: 0.4, max: 2.0 }, critical: { min: 0.2, max: 3.0 }, source: "Acoustic-Calc" },
  magnetopause_standoff: { unit: "Re", optimal: { min: 9, max: 12 }, nominal: { min: 7, max: 14 }, marginal: { min: 5, max: 16 }, warning: { min: 4, max: 18 }, critical: { min: 3, max: 25 }, source: "NOAA-SWPC" },
  radiation_belt_electron_flux: { unit: "e/cm2-s-sr", optimal: { min: 0, max: 1e4 }, nominal: { min: 0, max: 1e5 }, marginal: { min: 0, max: 1e6 }, warning: { min: 0, max: 1e7 }, critical: { min: 0, max: 1e8 }, source: "NOAA-GOES" },
  galactic_cosmic_ray_index: { unit: "%", optimal: { min: 95, max: 105 }, nominal: { min: 90, max: 110 }, marginal: { min: 85, max: 115 }, warning: { min: 80, max: 120 }, critical: { min: 70, max: 130 }, source: "NOAA-SWPC-Oulu" },
  heliospheric_current_sheet_tilt: { unit: "deg", optimal: { min: 0, max: 20 }, nominal: { min: 0, max: 40 }, marginal: { min: 0, max: 55 }, warning: { min: 0, max: 70 }, critical: { min: 0, max: 90 }, source: "WSO-Stanford" },
  differential_electron_40_75keV: { unit: "e/cm2-s-sr-keV", optimal: { min: 0, max: 1e4 }, nominal: { min: 0, max: 5e4 }, marginal: { min: 0, max: 1e5 }, warning: { min: 0, max: 5e5 }, critical: { min: 0, max: 1e6 }, source: "NOAA-GOES-EPEAD" },
  differential_electron_75_150keV: { unit: "e/cm2-s-sr-keV", optimal: { min: 0, max: 5e3 }, nominal: { min: 0, max: 2e4 }, marginal: { min: 0, max: 5e4 }, warning: { min: 0, max: 2e5 }, critical: { min: 0, max: 5e5 }, source: "NOAA-GOES-EPEAD" },
  differential_electron_150_275keV: { unit: "e/cm2-s-sr-keV", optimal: { min: 0, max: 2e3 }, nominal: { min: 0, max: 1e4 }, marginal: { min: 0, max: 3e4 }, warning: { min: 0, max: 1e5 }, critical: { min: 0, max: 3e5 }, source: "NOAA-GOES-EPEAD" },
  differential_electron_275_475keV: { unit: "e/cm2-s-sr-keV", optimal: { min: 0, max: 1e3 }, nominal: { min: 0, max: 5e3 }, marginal: { min: 0, max: 2e4 }, warning: { min: 0, max: 5e4 }, critical: { min: 0, max: 2e5 }, source: "NOAA-GOES-EPEAD" },
  differential_electron_80_165keV: { unit: "e/cm2-s-sr-keV", optimal: { min: 0, max: 5e3 }, nominal: { min: 0, max: 2e4 }, marginal: { min: 0, max: 5e4 }, warning: { min: 0, max: 2e5 }, critical: { min: 0, max: 5e5 }, source: "NOAA-GOES-EPEAD" },
  differential_electron_165_500keV: { unit: "e/cm2-s-sr-keV", optimal: { min: 0, max: 2e3 }, nominal: { min: 0, max: 1e4 }, marginal: { min: 0, max: 3e4 }, warning: { min: 0, max: 1e5 }, critical: { min: 0, max: 3e5 }, source: "NOAA-GOES-EPEAD" },
  differential_electron_gt500keV: { unit: "e/cm2-s-sr-keV", optimal: { min: 0, max: 500 }, nominal: { min: 0, max: 2e3 }, marginal: { min: 0, max: 1e4 }, warning: { min: 0, max: 5e4 }, critical: { min: 0, max: 2e5 }, source: "NOAA-GOES-EPEAD" },
  differential_proton_1_2MeV: { unit: "p/cm2-s-sr-MeV", optimal: { min: 0, max: 0.5 }, nominal: { min: 0, max: 2 }, marginal: { min: 0, max: 10 }, warning: { min: 0, max: 50 }, critical: { min: 0, max: 200 }, source: "NOAA-GOES-EPEAD" },
  differential_proton_1p9_2p3MeV: { unit: "p/cm2-s-sr-MeV", optimal: { min: 0, max: 0.1 }, nominal: { min: 0, max: 0.5 }, marginal: { min: 0, max: 2 }, warning: { min: 0, max: 10 }, critical: { min: 0, max: 50 }, source: "NOAA-GOES-EPEAD" },
  differential_proton_2p3_6p5MeV: { unit: "p/cm2-s-sr-MeV", optimal: { min: 0, max: 0.05 }, nominal: { min: 0, max: 0.2 }, marginal: { min: 0, max: 1 }, warning: { min: 0, max: 5 }, critical: { min: 0, max: 25 }, source: "NOAA-GOES-EPEAD" },
  differential_proton_6p5_12MeV: { unit: "p/cm2-s-sr-MeV", optimal: { min: 0, max: 0.01 }, nominal: { min: 0, max: 0.05 }, marginal: { min: 0, max: 0.2 }, warning: { min: 0, max: 1 }, critical: { min: 0, max: 5 }, source: "NOAA-GOES-EPEAD" },
  differential_proton_12_23MeV: { unit: "p/cm2-s-sr-MeV", optimal: { min: 0, max: 0.005 }, nominal: { min: 0, max: 0.02 }, marginal: { min: 0, max: 0.1 }, warning: { min: 0, max: 0.5 }, critical: { min: 0, max: 2 }, source: "NOAA-GOES-EPEAD" },
  differential_proton_23_38MeV: { unit: "p/cm2-s-sr-MeV", optimal: { min: 0, max: 0.002 }, nominal: { min: 0, max: 0.01 }, marginal: { min: 0, max: 0.05 }, warning: { min: 0, max: 0.2 }, critical: { min: 0, max: 1 }, source: "NOAA-GOES-EPEAD" },
  differential_proton_38_82MeV: { unit: "p/cm2-s-sr-MeV", optimal: { min: 0, max: 0.001 }, nominal: { min: 0, max: 0.005 }, marginal: { min: 0, max: 0.02 }, warning: { min: 0, max: 0.1 }, critical: { min: 0, max: 0.5 }, source: "NOAA-GOES-EPEAD" },
  differential_proton_84_200MeV: { unit: "p/cm2-s-sr-MeV", optimal: { min: 0, max: 0.0005 }, nominal: { min: 0, max: 0.002 }, marginal: { min: 0, max: 0.01 }, warning: { min: 0, max: 0.05 }, critical: { min: 0, max: 0.2 }, source: "NOAA-GOES-EPEAD" }
};


const FLARE_CLASS_THRESHOLDS = {
  A: 1e-8,
  B: 1e-7,
  C: 1e-6,
  M: 1e-5,
  X: 1e-4
};

const EVALUATION_STATE = {
  isRunning: false,
  lastEvaluation: null,
  pendingRequests: []
};


const DISPLAY_SMALL_WORDS = new Set(["a", "an", "the", "and", "or", "nor", "but", "of", "in", "on", "at", "to", "for", "by", "with", "vs", "from", "per", "as", "into", "over"]);
const DISPLAY_UNITS = new Set(["km", "m", "mm", "cm", "ms", "min", "nm", "kt", "kts", "s", "h", "hr", "hrs", "mb", "ppb", "ppm", "kg", "g", "mi", "ft", "mph", "kph", "deg", "pfu", "nt", "hz", "khz", "mhz", "db", "w", "kw"]);
const DISPLAY_IDENTIFIERS = { pm2_5: "PM2.5", pm10: "PM10", us_aqi: "US AQI", european_aqi: "European AQI", uv_index: "UV Index", kp_index: "Kp Index", dst_index: "Dst Index", f107_flux: "F10.7 Flux", nmdb: "NMDB", tle: "TLE", metar: "METAR", nhc: "NHC", gdacs: "GDACS", spc: "SPC", nws: "NWS", swpc: "SWPC", usgs: "USGS", noaa: "NOAA", ovation: "OVATION", cape: "CAPE", li: "LI", fwi: "FWI", hf: "HF", tfr: "TFR", notam: "NOTAM", ais: "AIS", sst: "SST" };

function capitalizeDisplayWord(core) {
  return core.split("-").map(part => (part ? part.charAt(0).toUpperCase() + part.slice(1) : part)).join("-");
}

function formatDisplayText(text) {
  if (text === null || text === undefined) return text;
  let value = String(text).replace(/\s+/g, " ").trim();
  if (!value) return value;
  value = value.replace(/(?<![\w.\/-])(?:[a-z][a-z0-9]*(?:_[a-z0-9]+)+|nmdb|tle|metar|nhc|gdacs|spc|nws|swpc|usgs|noaa|ovation|cape|fwi|tfr|notam|sst)(?![\w.\/-])/gi, match => DISPLAY_IDENTIFIERS[match.toLowerCase()] || match.replace(/_/g, " "));
  if (/[.!?]["')\]]?$/.test(value)) return value.charAt(0).toUpperCase() + value.slice(1);
  if (value.split(" ").length >= 5 && /\b(is|are|was|were|has|have|had|could|can|will|may|might|should|would|does|did|returned|reported)\b/i.test(value) && !/:/.test(value)) {
    return `${value.charAt(0).toUpperCase()}${value.slice(1)}.`;
  }
  const words = value.split(" ");
  return words.map((word, index) => {
    if (/[A-Za-z0-9]\.[A-Za-z]|:\/\/|\/[A-Za-z]/.test(word)) return word;
    const match = word.match(/^([^A-Za-z]*)([A-Za-z][A-Za-z'’-]*)(.*)$/);
    if (!match) return word;
    const [, lead, core, trail] = match;
    const lower = core.toLowerCase();
    const previous = index > 0 ? words[index - 1] : "";
    if (/^[0-9]/.test(trail)) return word;
    if (/^\d/.test(lead) && DISPLAY_UNITS.has(lower)) return word;
    if (core === lower && DISPLAY_UNITS.has(lower) && /\d$/.test(previous)) return word;
    if (core.length > 1 && core === core.toUpperCase()) return word;
    if (/[A-Z]/.test(core.slice(1))) return word;
    if (index > 0 && DISPLAY_SMALL_WORDS.has(lower) && !/[:\-–(]$/.test(previous) && !lead) return lower + trail;
    return lead + capitalizeDisplayWord(core) + trail;
  }).join(" ");
}

function displayReasonSentence(reason) {
  const text = formatDisplayText(reason);
  if (!text) return "No error message was provided.";
  return /[.!?]["')\]]?$/.test(text) ? text : `The reported error was "${text}".`;
}

class AlertManager {
  constructor() {
    this.alerts = [];
    this.violations = [];
    this.dataSourceStatus = new Map();
    this.dataPoints = new Map();
    this.anomalies = [];
    this.historicalData = new Map();
  }

  reset() {
    this.alerts = [];
    this.violations = [];
    this.dataSourceStatus.clear();
    this.dataPoints = new Map();
    this.anomalies = [];
    this.historicalData = new Map();
  }

  registerDataSource(sourceName, criticality, description) {
    this.dataSourceStatus.set(sourceName, {
      name: sourceName,
      criticality: criticality,
      description: formatDisplayText(description),
      status: "PENDING",
      lastUpdate: null,
      responseTime: null,
      errorCount: 0,
      dataQuality: null,
      rawData: null
    });
  }

  updateDataSourceStatus(sourceName, status, responseTime = null, errorMessage = null) {
    const source = this.dataSourceStatus.get(sourceName);
    if (source) {
      source.status = status;
      source.lastUpdate = new Date().toISOString();
      source.responseTime = responseTime;
      if (status === "FAILED" || status === "DEGRADED") {
        source.errorCount++;
        const cleanMessage = errorMessage ? formatDisplayText(errorMessage) : "Unknown Error";
        source.lastError = cleanMessage;
        const severity = source.criticality === "PRIMARY" || source.criticality === "SAFETY_CRITICAL" ? "WARNING" : source.criticality === "OPERATIONAL" ? "ADVISORY" : "INFO";
        this.addAlert(
          `The ${formatDisplayText(sourceName)} data source ${status === "FAILED" ? "failed" : "is degraded"}. ${displayReasonSentence(errorMessage || "Unknown Error")}`,
          severity,
          "DATA_SOURCE",
          sourceName,
          { errorMessage: cleanMessage, errorCount: source.errorCount, criticality: source.criticality }
        );
      }
      if (responseTime !== null && responseTime > 5000) {
        this.addAlert(
          `The ${formatDisplayText(sourceName)} data source took ${responseTime} ms to respond, which is above the 5000 ms threshold.`,
          responseTime > 10000 ? "WARNING" : "ADVISORY",
          "LATENCY",
          sourceName,
          { responseTime, threshold: 5000 }
        );
      }
    }
  }

  registerHistoricalData(parameterId, timeSeriesData) {
    if (!this.historicalData.has(parameterId)) {
      this.historicalData.set(parameterId, []);
    }
    const existing = this.historicalData.get(parameterId);
    this.historicalData.set(parameterId, [...existing, ...timeSeriesData]);
  }

  isValidNumber(value) {
    return value !== null && value !== undefined && typeof value === "number" && 
           !isNaN(value) && isFinite(value);
  }

  isValidParameterValue(pointId, value) {
    if (!this.isValidNumber(value)) {
      return false;
    }
    
    if (pointId === 'xray_flux' || pointId === 'xray_flux_short' || pointId === 'xray_flux_long') {
      if (value < 1e-10) {
        return false;
      }
    }
    
    const positiveOnlyParams = ['proton_flux_10mev', 'proton_flux_50mev', 'proton_flux_100mev'];
    if (positiveOnlyParams.includes(pointId) && value <= 0) {
      return false;
    }
    
    if (pointId.includes('proton_flux') && (value < 0 || value > 1e6)) {
      return false;
    }
    
    if (pointId.includes('electron_flux') && (value < 0 || value > 1e8)) {
      return false;
    }
    
    return true;
  }

  evaluateAgainstIndustryLimits(pointId, value, unit, source, criticality) {
    if (!this.isValidParameterValue(pointId, value)) {
      return null;
    }
    
    const limits = INDUSTRY_LIMITS[pointId];
    if (!limits) {
      return this.evaluateStatistically(pointId, value, unit, source, criticality);
    }
    
    const criticalityInfo = DATA_CRITICALITY[criticality] || DATA_CRITICALITY.INFORMATIONAL;
    const multiplier = criticalityInfo.violationMultiplier;
    
    if (value < limits.critical.min || value > limits.critical.max) {
      return this.createViolation(pointId, value, unit, source, criticality, "CRITICAL", limits.critical, limits.source, multiplier);
    }
    if (value < limits.warning.min || value > limits.warning.max) {
      return this.createViolation(pointId, value, unit, source, criticality, "WARNING", limits.warning, limits.source, multiplier);
    }
    if (value < limits.marginal.min || value > limits.marginal.max) {
      return this.createViolation(pointId, value, unit, source, criticality, "ADVISORY", limits.marginal, limits.source, multiplier);
    }
    if (value < limits.nominal.min || value > limits.nominal.max) {
      return this.createViolation(pointId, value, unit, source, criticality, "INFO", limits.nominal, limits.source, multiplier);
    }
    if (value < limits.optimal.min || value > limits.optimal.max) {
      return this.createViolation(pointId, value, unit, source, criticality, "NOMINAL", limits.optimal, limits.source, multiplier);
    }
    
    return null;
  }

  evaluateStatistically(pointId, value, unit, source, criticality) {
    const existingPoints = Array.from(this.dataPoints.values())
      .filter(p => p.source === source && this.isValidNumber(p.value));
    
    if (existingPoints.length < 3) {
      return null;
    }
    
    const values = existingPoints.map(p => p.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    if (stdDev === 0) return null;
    
    const zScore = Math.abs((value - mean) / stdDev);
    const criticalityInfo = DATA_CRITICALITY[criticality] || DATA_CRITICALITY.INFORMATIONAL;
    const multiplier = criticalityInfo.violationMultiplier;
    
    if (zScore > 3.5) {
      return this.createViolation(pointId, value, unit, source, criticality, "CRITICAL", 
        { min: mean - 3.5 * stdDev, max: mean + 3.5 * stdDev }, "Statistical-3.5σ", multiplier);
    }
    if (zScore > 2.5) {
      return this.createViolation(pointId, value, unit, source, criticality, "WARNING", 
        { min: mean - 2.5 * stdDev, max: mean + 2.5 * stdDev }, "Statistical-2.5σ", multiplier);
    }
    if (zScore > 2.0) {
      return this.createViolation(pointId, value, unit, source, criticality, "ADVISORY", 
        { min: mean - 2.0 * stdDev, max: mean + 2.0 * stdDev }, "Statistical-2σ", multiplier);
    }
    if (zScore > 1.5) {
      return this.createViolation(pointId, value, unit, source, criticality, "INFO", 
        { min: mean - 1.5 * stdDev, max: mean + 1.5 * stdDev }, "Statistical-1.5σ", multiplier);
    }
    
    return null;
  }

  createViolation(pointId, value, unit, source, criticality, severity, limitRange, limitSource, multiplier) {
    let formattedValue;
    if (Math.abs(value) < 0.001) {
      formattedValue = value.toExponential(3);
    } else {
      formattedValue = value.toFixed(3);
    }
    
    const isBelow = value < limitRange.min;
    const isAbove = value > limitRange.max;
    
    if (value >= limitRange.min && value <= limitRange.max) {
      return null;
    }
    
    let deviation, deviationPct, limitValue, violationDirection;
    
    if (isBelow) {
      deviation = limitRange.min - value;
      limitValue = limitRange.min;
      violationDirection = "below";
      
      if (limitRange.min < 0) {
        const distance = Math.abs(value - limitRange.min);
        const referenceValue = Math.abs(limitRange.min);
        deviationPct = referenceValue > 0 ? (distance / referenceValue) * 100 : 0;
      } else {
        deviationPct = limitRange.min > 0 ? (deviation / limitRange.min) * 100 : 0;
      }
    } else if (isAbove) {
      deviation = value - limitRange.max;
      limitValue = limitRange.max;
      violationDirection = "exceeds";
      
      if (limitRange.max <= 0) {
        return null;
      }
      
      deviationPct = (deviation / limitRange.max) * 100;
    } else {
      return null;
    }
    
    deviationPct = Math.max(0, Math.abs(deviationPct));
    
    deviationPct = Math.round(deviationPct * 10) / 10;
    
    let formattedLimit;
    if (Math.abs(limitValue) < 0.001) {
      formattedLimit = limitValue.toExponential(3);
    } else {
      formattedLimit = limitValue.toFixed(6);
    }
    
    return {
      id: `${pointId}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      parameter: formatDisplayText(pointId),
      parameterId: pointId,
      value: `${formattedValue} ${unit}`,
      rawValue: value,
      limit: isBelow ? `> ${formattedLimit} ${unit}` : `< ${formattedLimit} ${unit}`,
      limitRange: limitRange,
      deviation: parseFloat(deviation.toFixed(6)),
      deviationPercent: deviationPct,
      severity: severity,
      severityInfo: ALERT_SEVERITY[severity],
      source: source,
      criticality: criticality,
      criticalityInfo: DATA_CRITICALITY[criticality],
      limitSource: limitSource,
      multiplier: multiplier,
      effectiveWeight: (ALERT_SEVERITY[severity]?.weight || 0.1) * multiplier,
      timestamp: new Date().toISOString(),
      message: `${formatDisplayText(pointId)} is ${formattedValue} ${unit}, which ${violationDirection === "below" ? "is below" : "exceeds"} the ${severity.toLowerCase()} threshold by ${deviationPct.toFixed(1)}%.`,
      recommendedAction: this.getRecommendedAction(severity, pointId)
    };
  }

  getRecommendedAction(severity, pointId) {
    const actions = {
      CRITICAL: "Hazardous conditions are present, so take protective action and monitor closely.",
      WARNING: "Conditions are deteriorating, so increase monitoring frequency and watch the trend.",
      ADVISORY: "Conditions are notable, so continue monitoring for changes.",
      INFO: "This observation is logged for reference.",
      NOMINAL: "Conditions are within the acceptable range."
    };
    return actions[severity] || "Continue monitoring.";
  }

  registerDataPoint(pointId, value, unit, source, criticality, customLimits = null) {
    if (!this.isValidParameterValue(pointId, value)) {
      return null;
    }

    let shouldUpdateGlobal = true;

    if (isParameterRegistered(pointId)) {
      const existing = sharedParameterValues.get(pointId);
      const diff = Math.abs(existing.value - value);
      const isSignificant = existing.value !== 0 ? (diff / Math.abs(existing.value)) > 0.05 : (value !== 0);
      
      const weights = { "PRIMARY": 5, "SAFETY_CRITICAL": 4, "OPERATIONAL": 3, "INFORMATIONAL": 2, "SUPPLEMENTARY": 1 };
      const newWeight = weights[criticality] || 0;
      const oldWeight = weights[existing.criticality] || 0;

      if (newWeight <= oldWeight) {
        shouldUpdateGlobal = false;
        if (isSignificant && existing.source !== source) {
          this.addAlert(
            `Data conflict for ${pointId}: ${source}=${value} vs ${existing.source}=${existing.value}`,
            "INFO",
            "DATA_INTEGRITY",
            source,
            { parameter: pointId, newValue: value, oldValue: existing.value, newSource: source, oldSource: existing.source }
          );
        }
      }
    }

    if (shouldUpdateGlobal) {
      registerParameterGlobally(pointId, value, source, criticality);
    }
    
    const dataPoint = {
      id: pointId,
      value: value,
      unit: unit,
      source: source,
      criticality: criticality,
      customLimits: customLimits,
      timestamp: new Date().toISOString(),
      quality: this.assessDataQuality(pointId, value),
      status: "NOMINAL",
      violation: null
    };
    
    const violation = this.evaluateAgainstIndustryLimits(pointId, value, unit, source, criticality);
    if (violation) {
      dataPoint.status = violation.severity;
      dataPoint.violation = violation;
      this.violations.push(violation);
    }
    
    if (customLimits && !violation) {
      const customViolation = this.checkCustomLimits(pointId, value, customLimits, unit, source, criticality);
      if (customViolation) {
        dataPoint.status = customViolation.severity;
        dataPoint.violation = customViolation;
        this.violations.push(customViolation);
      }
    }
    
    this.dataPoints.set(pointId, dataPoint);
    return dataPoint;
  }

  assessDataQuality(pointId, value) {
    if (!this.isValidNumber(value)) return 0;
    
    const limits = INDUSTRY_LIMITS[pointId];
    if (!limits) return 0.85;
    
    if (value >= limits.optimal.min && value <= limits.optimal.max) return 1.0;
    if (value >= limits.nominal.min && value <= limits.nominal.max) return 0.9;
    if (value >= limits.marginal.min && value <= limits.marginal.max) return 0.75;
    if (value >= limits.warning.min && value <= limits.warning.max) return 0.5;
    if (value >= limits.critical.min && value <= limits.critical.max) return 0.25;
    
    return 0.1;
  }

  checkCustomLimits(pointId, value, limits, unit, source, criticality) {
    if (!this.isValidNumber(value)) return null;
    
    const { nominal, warning, critical } = limits;
    const criticalityInfo = DATA_CRITICALITY[criticality] || DATA_CRITICALITY.INFORMATIONAL;
    const multiplier = criticalityInfo.violationMultiplier;
    
    if (critical) {
      if (value < critical.min || value > critical.max) {
        return this.createViolation(pointId, value, unit, source, criticality, "CRITICAL", critical, "Custom", multiplier);
      }
    }
    if (warning) {
      if (value < warning.min || value > warning.max) {
        return this.createViolation(pointId, value, unit, source, criticality, "WARNING", warning, "Custom", multiplier);
      }
    }
    if (nominal) {
      if (value < nominal.min || value > nominal.max) {
        return this.createViolation(pointId, value, unit, source, criticality, "ADVISORY", nominal, "Custom", multiplier);
      }
    }
    
    return null;
  }

  addAlert(message, severity, category, source, details = {}) {
    const alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message: formatDisplayText(message),
      severity: severity,
      severityInfo: ALERT_SEVERITY[severity] || ALERT_SEVERITY.INFO,
      category: category,
      source: source,
      details: details,
      timestamp: new Date().toISOString(),
      acknowledged: false
    };
    this.alerts.push(alert);
    return alert;
  }

  calculateConfidence() {
    const dataSourceArray = Array.from(this.dataSourceStatus.values());
    const dataPointArray = Array.from(this.dataPoints.values());
    
    if (dataSourceArray.length === 0) {
      return { confidence: 0, breakdown: {}, factors: [] };
    }
    
    let totalWeight = 0;
    let weightedScore = 0;
    const factors = [];
    
    for (const source of dataSourceArray) {
      const criticalityInfo = DATA_CRITICALITY[source.criticality] || DATA_CRITICALITY.INFORMATIONAL;
      const weight = criticalityInfo.weight;
      totalWeight += weight;
      
      let sourceScore = 0;
      if (source.status === "AVAILABLE" || source.status === "OPERATIONAL") {
        sourceScore = 1.0;
      } else if (source.status === "DEGRADED") {
        sourceScore = 0.5;
      } else if (source.status === "PENDING") {
        sourceScore = 0.3;
      } else {
        sourceScore = 0;
      }
      
      if (source.responseTime) {
        const responseTimePenalty = Math.min(source.responseTime / 10000, 0.3);
        sourceScore = Math.max(0, sourceScore - responseTimePenalty);
      }
      
      if (source.errorCount > 0) {
        const errorPenalty = Math.min(source.errorCount * 0.1, 0.5);
        sourceScore = Math.max(0, sourceScore - errorPenalty);
      }
      
      weightedScore += sourceScore * weight;
      factors.push({
        source: source.name,
        criticality: source.criticality,
        status: source.status,
        weight: weight,
        score: sourceScore,
        contribution: sourceScore * weight
      });
    }
    
    let dataQualityScore = 0;
    let dataQualityWeight = 0;
    for (const point of dataPointArray) {
      const criticalityInfo = DATA_CRITICALITY[point.criticality] || DATA_CRITICALITY.INFORMATIONAL;
      const weight = criticalityInfo.weight;
      dataQualityWeight += weight;
      dataQualityScore += point.quality * weight;
    }
    
    const sourceConfidence = totalWeight > 0 ? weightedScore / totalWeight : 0;
    const dataConfidence = dataQualityWeight > 0 ? dataQualityScore / dataQualityWeight : 0;
    
    const violationPenalty = this.calculateViolationPenalty();
    const alertPenalty = this.calculateAlertPenalty();
    
    const rawConfidence = (sourceConfidence * 0.4 + dataConfidence * 0.6);
    const finalConfidence = Math.max(0, Math.min(1, rawConfidence - violationPenalty - alertPenalty));
    
    return {
      confidence: Math.round(finalConfidence * 100),
      rawConfidence: rawConfidence,
      sourceConfidence: sourceConfidence,
      dataConfidence: dataConfidence,
      violationPenalty: violationPenalty,
      alertPenalty: alertPenalty,
      factors: factors,
      breakdown: {
        dataSourcesTotal: dataSourceArray.length,
        dataSourcesOperational: dataSourceArray.filter(s => s.status === "AVAILABLE" || s.status === "OPERATIONAL").length,
        dataSourcesFailed: dataSourceArray.filter(s => s.status === "FAILED").length,
        dataSourcesDegraded: dataSourceArray.filter(s => s.status === "DEGRADED").length,
        dataPointsTotal: dataPointArray.length,
        dataPointsNominal: dataPointArray.filter(p => p.status === "NOMINAL").length,
        dataPointsInfo: dataPointArray.filter(p => p.status === "INFO").length,
        dataPointsAdvisory: dataPointArray.filter(p => p.status === "ADVISORY").length,
        dataPointsWarning: dataPointArray.filter(p => p.status === "WARNING").length,
        dataPointsCritical: dataPointArray.filter(p => p.status === "CRITICAL").length,
        violationsTotal: this.violations.length,
        violationsCritical: this.violations.filter(v => v.severity === "CRITICAL").length,
        violationsWarning: this.violations.filter(v => v.severity === "WARNING").length,
        violationsAdvisory: this.violations.filter(v => v.severity === "ADVISORY").length,
        violationsInfo: this.violations.filter(v => v.severity === "INFO").length,
        violationsNominal: this.violations.filter(v => v.severity === "NOMINAL").length,
        alertsTotal: this.alerts.length,
        alertsCritical: this.alerts.filter(a => a.severity === "CRITICAL").length,
        alertsWarning: this.alerts.filter(a => a.severity === "WARNING").length,
        alertsAdvisory: this.alerts.filter(a => a.severity === "ADVISORY").length
      }
    };
  }

  calculateViolationPenalty() {
    let penalty = 0;
    for (const violation of this.violations) {
      if (violation.severity === "NOMINAL") continue;
      const severityInfo = ALERT_SEVERITY[violation.severity] || ALERT_SEVERITY.INFO;
      penalty += severityInfo.confidencePenalty * violation.multiplier;
    }
    return Math.min(penalty, 0.6);
  }

  calculateAlertPenalty() {
    let penalty = 0;
    for (const alert of this.alerts) {
      const severityInfo = ALERT_SEVERITY[alert.severity] || ALERT_SEVERITY.INFO;
      penalty += severityInfo.confidencePenalty * 0.5;
    }
    return Math.min(penalty, 0.35);
  }

  calculateConditionsStatus() {
    const confidence = this.calculateConfidence();
    const criticalViolations = this.violations.filter(v => v.severity === "CRITICAL");
    const warningViolations = this.violations.filter(v => v.severity === "WARNING");
    const advisoryViolations = this.violations.filter(v => v.severity === "ADVISORY");
    const infoViolations = this.violations.filter(v => v.severity === "INFO");
    const nominalViolations = this.violations.filter(v => v.severity === "NOMINAL");
    
    const criticalAlerts = this.alerts.filter(a => a.severity === "CRITICAL");
    const warningAlerts = this.alerts.filter(a => a.severity === "WARNING");
    const advisoryAlerts = this.alerts.filter(a => a.severity === "ADVISORY");
    
    const failedCriticalSources = Array.from(this.dataSourceStatus.values())
      .filter(s => s.status === "FAILED" && (s.criticality === "PRIMARY" || s.criticality === "SAFETY_CRITICAL"));
    const failedOperationalSources = Array.from(this.dataSourceStatus.values())
      .filter(s => s.status === "FAILED" && s.criticality === "OPERATIONAL");
    const allFailedSources = Array.from(this.dataSourceStatus.values()).filter(s => s.status === "FAILED");
    
    let status = "NOMINAL";
    let category = "NOMINAL";
    let reasons = [];
    
    if (criticalViolations.length > 0) {
      status = "SEVERE";
      category = "CRITICAL_VIOLATION";
      reasons.push(`${criticalViolations.length} critical parameter violation${criticalViolations.length === 1 ? "" : "s"} detected`);
    }
    
    if (failedCriticalSources.length > 0) {
      status = "SEVERE";
      category = category === "NOMINAL" ? "DATA_INTEGRITY" : category;
      reasons.push(`${failedCriticalSources.length} primary or safety-critical data source${failedCriticalSources.length === 1 ? "" : "s"} failed`);
    }
    
    if (criticalAlerts.length > 0) {
      status = "SEVERE";
      category = category === "NOMINAL" ? "CRITICAL_ALERT" : category;
      reasons.push(`${criticalAlerts.length} critical alert${criticalAlerts.length === 1 ? "" : "s"} active`);
    }
    
    if (confidence.confidence < 40) {
      status = "SEVERE";
      category = category === "NOMINAL" ? "LOW_CONFIDENCE" : category;
      reasons.push(`System confidence ${confidence.confidence}% below minimum threshold of 40%`);
    }
    
    if (status === "NOMINAL") {
      const riskScore = this.calculateOverallRisk();
      
      if (riskScore >= 0.50) {
        status = "SEVERE";
        category = "RISK_ACCUMULATION";
        reasons.push(`Cumulative hazard index ${(riskScore * 100).toFixed(1)}% exceeds the 50% threshold`);
      } else if (warningViolations.length >= 5) {
        status = "SEVERE";
        category = "WARNING_ACCUMULATION";
        reasons.push(`${warningViolations.length} warning-level violations exceed maximum of 4`);
      } else if (warningViolations.length > 0 || warningAlerts.length > 0 || failedOperationalSources.length > 0 || allFailedSources.length > 0 || advisoryViolations.length >= 5) {
        status = "ELEVATED";
        category = "ELEVATED_CONDITIONS";
        if (warningViolations.length > 0) {
          reasons.push(`${warningViolations.length} warning violation${warningViolations.length === 1 ? "" : "s"} require monitoring`);
        }
        if (warningAlerts.length > 0) {
          reasons.push(`${warningAlerts.length} warning alert${warningAlerts.length === 1 ? "" : "s"} active`);
        }
        if (allFailedSources.length > 0) {
          reasons.push(`${allFailedSources.length} data source${allFailedSources.length === 1 ? "" : "s"} unavailable`);
        }
        if (advisoryViolations.length >= 5) {
          reasons.push(`${advisoryViolations.length} advisory violations warrant attention`);
        }
      } else if (advisoryViolations.length > 0 || infoViolations.length > 0 || nominalViolations.length > 0) {
        status = "NOMINAL";
        category = "NOMINAL_WITH_OBSERVATIONS";
        const totalMinor = advisoryViolations.length + infoViolations.length + nominalViolations.length;
        reasons.push(`Conditions nominal with ${totalMinor} minor observation${totalMinor === 1 ? "" : "s"} logged`);
      } else {
        reasons.push("All parameters are within their optimal ranges.");
      }
    }
    
    const overallRisk = this.calculateOverallRisk();
    
    return {
      status: status,
      confidence: confidence.confidence,
      category: category,
      primaryReason: formatDisplayText(reasons[0] || "The system status could not be determined."),
      allReasons: reasons.map(formatDisplayText),
      riskScore: overallRisk,
      confidenceBreakdown: confidence.breakdown,
      confidenceFactors: confidence.factors,
      violationSummary: {
        critical: criticalViolations.length,
        warning: warningViolations.length,
        advisory: advisoryViolations.length,
        info: infoViolations.length,
        nominal: nominalViolations.length,
        total: this.violations.length
      },
      alertSummary: {
        critical: criticalAlerts.length,
        warning: warningAlerts.length,
        advisory: advisoryAlerts.length,
        total: this.alerts.length
      },
      dataSourceSummary: {
        total: this.dataSourceStatus.size,
        operational: Array.from(this.dataSourceStatus.values()).filter(s => s.status === "AVAILABLE" || s.status === "OPERATIONAL").length,
        failed: allFailedSources.length,
        degraded: Array.from(this.dataSourceStatus.values()).filter(s => s.status === "DEGRADED").length
      },
      timestamp: new Date().toISOString()
    };
  }

  calculateOverallRisk() {
    const dataPointArray = Array.from(this.dataPoints.values());
    const dataSourceArray = Array.from(this.dataSourceStatus.values());
    
    let survivalProbability = 1.0 - 0.03;
    
    for (const violation of this.violations) {
      if (violation.severity === "NOMINAL") continue;
      const severityInfo = ALERT_SEVERITY[violation.severity] || ALERT_SEVERITY.INFO;
      const probabilityOfFailure = Math.min(0.99, (severityInfo.riskContribution * violation.multiplier) / 1.5);
      survivalProbability *= (1.0 - probabilityOfFailure);
    }
    
    for (const alert of this.alerts) {
      const severityInfo = ALERT_SEVERITY[alert.severity] || ALERT_SEVERITY.INFO;
      const alertRisk = severityInfo.riskContribution * 0.4;
      survivalProbability *= (1.0 - alertRisk);
    }
    
    for (const source of dataSourceArray) {
      let sourceRisk = 0;
      if (source.status === "FAILED") {
        const criticalityInfo = DATA_CRITICALITY[source.criticality] || DATA_CRITICALITY.INFORMATIONAL;
        sourceRisk = criticalityInfo.weight * 0.05;
      } else if (source.status === "DEGRADED") {
        const criticalityInfo = DATA_CRITICALITY[source.criticality] || DATA_CRITICALITY.INFORMATIONAL;
        sourceRisk = criticalityInfo.weight * 0.02;
      }
      if (sourceRisk > 0) survivalProbability *= (1.0 - sourceRisk);
    }
    
    for (const point of dataPointArray) {
      if (point.quality < 0.5) {
        const criticalityInfo = DATA_CRITICALITY[point.criticality] || DATA_CRITICALITY.INFORMATIONAL;
        const qualityRisk = (1 - point.quality) * criticalityInfo.weight * 0.01;
        survivalProbability *= (1.0 - qualityRisk);
      }
    }
    
    return parseFloat((1.0 - survivalProbability).toFixed(4));
  }

  getFullReport() {
    for (const [name, source] of this.dataSourceStatus) {
      if (source.status === "PENDING") this.updateDataSourceStatus(name, "FAILED", 0, "No data was returned for this source before the evaluation finished");
    }
    const conditionsStatus = this.calculateConditionsStatus();
    return {
      decision: conditionsStatus,
      alerts: this.alerts,
      violations: this.violations,
      dataSources: Array.from(this.dataSourceStatus.values()),
      dataPoints: Array.from(this.dataPoints.values()),
      historicalData: Object.fromEntries(this.historicalData),
      summary: {
        totalAlerts: this.alerts.length,
        totalViolations: this.violations.length,
        totalDataSources: this.dataSourceStatus.size,
        totalDataPoints: this.dataPoints.size,
        overallStatus: conditionsStatus.status,
        overallConfidence: conditionsStatus.confidence,
        overallRisk: conditionsStatus.riskScore
      }
    };
  }
}

function resetSharedRegistry() {
  sharedParameterRegistry.clear();
  sharedParameterValues.clear();
}

function isParameterRegistered(pointId) {
  return sharedParameterRegistry.has(pointId);
}

function registerParameterGlobally(pointId, value, source, criticality) {
  sharedParameterRegistry.add(pointId);
  sharedParameterValues.set(pointId, { value, source, criticality, timestamp: Date.now() });
  return true;
}

const HOST_SLOTS = new Map();
const IN_FLIGHT_REQUESTS = new Map();

function hostGroup(url) {
  try {
    const host = new URL(url).hostname;
    return Object.keys(HOST_CONCURRENCY_LIMITS).find(suffix => host === suffix || host.endsWith(`.${suffix}`)) || null;
  } catch (error) {
    return null;
  }
}

async function acquireHostSlot(group) {
  const limit = HOST_CONCURRENCY_LIMITS[group];
  const state = HOST_SLOTS.get(group) || { active: 0, queue: [] };
  HOST_SLOTS.set(group, state);
  if (state.active >= limit) await new Promise(resolve => state.queue.push(resolve));
  state.active++;
  return () => {
    state.active--;
    const next = state.queue.shift();
    if (next) next();
  };
}

function openMeteoRequestUrl(url) {
  const apiKey = envValue(API_KEY_ENV.openMeteo);
  if (!apiKey) return url;
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith("open-meteo.com") || parsed.hostname.startsWith("customer-")) return url;
    parsed.hostname = `customer-${parsed.hostname}`;
    parsed.searchParams.set("apikey", apiKey);
    return parsed.toString();
  } catch (error) {
    return url;
  }
}

const SWPC_PRODUCT_COLUMNS = {
  "noaa-planetary-k-index.json": ["time_tag", "kp", "a_running", "station_count"],
  "noaa-planetary-k-index-forecast.json": ["time_tag", "kp", "observed", "noaa_scale"],
  "kyoto-dst.json": ["time_tag", "dst"]
};

function normalizeSwpcProduct(url, data) {
  if (!Array.isArray(data) || !data.length || typeof data[0] !== "object" || Array.isArray(data[0]) || data[0] === null) return data;
  const file = url.split("?")[0].split("/").pop();
  const columns = SWPC_PRODUCT_COLUMNS[file] || Object.keys(data[0]);
  const rows = data.map(record => {
    const lower = Object.fromEntries(Object.entries(record).map(([key, value]) => [key.toLowerCase(), value]));
    return columns.map(column => lower[column.toLowerCase()] ?? null);
  });
  return [columns, ...rows];
}

const RTSW_SPAN_HOURS = { "5-minute": 0.1, "2-hour": 2, "6-hour": 6, "1-day": 24, "3-day": 72, "7-day": 168 };

function pickField(record, candidates) {
  for (const key of candidates) if (record[key] !== undefined && record[key] !== null) return record[key];
  return null;
}

async function fetchRtswCompat(kind, span, headers, timeout, retries) {
  const rtswUrl = `${API_ENDPOINTS.RTSW_1M}${kind === "mag" ? "mag" : "wind"}_1m.json`;
  const result = await performApiRequest(rtswUrl, headers, Math.max(timeout, 15000), retries);
  if (result.error || !Array.isArray(result.data)) {
    return result.error ? result : { ...result, data: null, error: "The real-time solar wind feed was in an unrecognized format." };
  }
  const isActive = (r) => r.active === true || r.active === "true" || r.active === 1;
  const records = result.data.filter(r => r && typeof r === "object" && r.time_tag);
  const active = records.filter(isActive);
  const chosen = (active.length ? active : records).slice().sort((a, b) => String(a.time_tag).localeCompare(String(b.time_tag)));
  const cutoff = Date.now() - (RTSW_SPAN_HOURS[span] || 24) * 3600000;
  const seen = new Set();
  const rows = [];
  for (const r of chosen) {
    const time = new Date(String(r.time_tag).endsWith("Z") ? r.time_tag : `${r.time_tag}Z`).getTime();
    if (!isFinite(time) || time < cutoff || seen.has(r.time_tag)) continue;
    seen.add(r.time_tag);
    rows.push(kind === "mag"
      ? [r.time_tag, pickField(r, ["bx_gsm", "bx"]), pickField(r, ["by_gsm", "by"]), pickField(r, ["bz_gsm", "bz"]), pickField(r, ["lon_gsm"]), pickField(r, ["lat_gsm"]), pickField(r, ["bt"])]
      : [r.time_tag, pickField(r, ["proton_density", "density"]), pickField(r, ["proton_speed", "speed", "bulk_speed"]), pickField(r, ["proton_temperature", "temperature"])]);
  }
  const header = kind === "mag" ? ["time_tag", "bx_gsm", "by_gsm", "bz_gsm", "lon_gsm", "lat_gsm", "bt"] : ["time_tag", "density", "speed", "temperature"];
  return { ...result, data: [header, ...rows] };
}

async function makeApiRequestWithBackoff(url, headers = {}, timeout = 10000, retries = 3) {
  const solarWind = url.match(/services\.swpc\.noaa\.gov\/products\/solar-wind\/(mag|plasma)-([a-z0-9-]+)\.json/);
  if (solarWind) return fetchRtswCompat(solarWind[1], solarWind[2], headers, timeout, retries);
  const requestUrl = openMeteoRequestUrl(url);
  if (!IN_FLIGHT_REQUESTS.has(requestUrl)) {
    const pending = (async () => {
      const group = hostGroup(requestUrl);
      const release = group ? await acquireHostSlot(group) : null;
      try {
        const isOpenMeteo = group === "open-meteo.com";
        let result = await performApiRequest(requestUrl, headers, isOpenMeteo ? Math.max(timeout, 20000) : timeout, retries);
        for (let attempt = 0; isOpenMeteo && attempt < 4 && result.status === 429 && /concurrent/i.test(result.error || ""); attempt++) {
          await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1500 * (attempt + 1)));
          result = await performApiRequest(requestUrl, headers, Math.max(timeout, 20000), 0);
        }
        return result;
      } finally {
        if (release) release();
      }
    })();
    IN_FLIGHT_REQUESTS.set(requestUrl, pending);
    pending.finally(() => IN_FLIGHT_REQUESTS.delete(requestUrl));
  }
  let result = await IN_FLIGHT_REQUESTS.get(requestUrl);
  if (/services\.swpc\.noaa\.gov\/json\/goes\/primary\//.test(url) && (result.error || (Array.isArray(result.data) && result.data.length === 0))) {
    const secondary = await makeApiRequestWithBackoff(url.replace("/goes/primary/", "/goes/secondary/"), headers, timeout, retries);
    if (!secondary.error && Array.isArray(secondary.data) && secondary.data.length > 0) {
      result = secondary;
    }
  }
  if (result && !result.error && /services\.swpc\.noaa\.gov\/products\//.test(url)) return { ...result, data: normalizeSwpcProduct(url, result.data) };
  return result;
}

const RATE_LIMIT_COOLDOWNS = new Map();

function rateLimitCooldownUntil(reason) {
  const now = new Date();
  if (/daily/i.test(reason || "")) return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  if (/hourly/i.test(reason || "")) return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours() + 1);
  if (/minutely|minute/i.test(reason || "")) return now.getTime() + 60000;
  return null;
}

async function performApiRequest(url, headers = {}, timeout = 10000, retries = 3) {
  const serviceName = new URL(url).hostname;
  const cacheKey = url;
  const startTime = Date.now();
  
  const cachedData = getCachedData(cacheKey);
  if (cachedData) {
    trackApiHealth(serviceName, true, 0);
    return { data: cachedData, error: null, status: 200, responseTime: 0, cached: true };
  }
  
  const cooldown = RATE_LIMIT_COOLDOWNS.get(serviceName);
  if (cooldown && cooldown.until > Date.now()) {
    return { data: null, error: `The service rejected the request because of a rate limit and replied "${String(cooldown.reason).replace(/\.$/, "")}".`, status: 429, responseTime: 0 };
  }
  
  if (isCircuitBreakerOpen(serviceName)) {
    trackApiHealth(serviceName, false, 0);
    return { data: null, error: `Requests to ${serviceName} are paused because its circuit breaker is open.`, status: 0, responseTime: 0 };
  }
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000) + Math.random() * 200;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      const axiosConfig = {
        headers: { "User-Agent": "DinoSat-Earth-Conditions/1.0", "Accept": "application/json,text/plain,*/*", ...headers },
        timeout,
        validateStatus: status => status < 500 || status === 429
      };
      
      if (serviceName.includes("noaa.gov") || serviceName.includes("celestrak") || serviceName.includes("oulu.fi")) {
        axiosConfig.httpsAgent = new (require("https")).Agent({ rejectUnauthorized: false });
      }
      
      const response = await axios.get(url, axiosConfig);
      const responseTime = Date.now() - startTime;
      
      if (response.status === 429) {
        const reason = typeof response.data === "object" && response.data ? (response.data.reason || response.data.message || response.data.error) : null;
        const cooldownUntil = rateLimitCooldownUntil(reason);
        if (cooldownUntil) {
          RATE_LIMIT_COOLDOWNS.set(serviceName, { until: cooldownUntil, reason });
          trackApiHealth(serviceName, false, responseTime);
          return { data: null, error: `The service rejected the request because of a rate limit and replied "${String(reason).replace(/\.$/, "")}".`, status: 429, responseTime };
        }
        if (attempt === retries) {
          trackApiHealth(serviceName, false, responseTime);
          return { data: null, error: reason ? `The service rejected the request because of a rate limit and replied "${String(reason).replace(/\.$/, "")}".` : "The service rejected the request because of a rate limit.", status: 429, responseTime };
        }
        const retryAfterSeconds = parseFloat(response.headers?.["retry-after"]);
        const waitMs = isFinite(retryAfterSeconds) ? Math.min(retryAfterSeconds * 1000, 10000) : 2000 * (attempt + 1);
        await new Promise(resolve => setTimeout(resolve, waitMs));
        continue;
      }
      
      if (response.status === 200) {
        trackApiHealth(serviceName, true, responseTime);
        recordCircuitBreakerSuccess(serviceName);
        setCachedData(cacheKey, response.data);
        return { data: response.data, error: null, status: response.status, responseTime, cached: false };
      }
      
      if (response.status === 400) {
        trackApiHealth(serviceName, false, responseTime);
        const reason = typeof response.data === "object" && response.data ? (response.data.reason || response.data.message || response.data.error) : null;
        return { data: null, error: reason ? `HTTP 400 Bad Request: ${reason}` : "HTTP 400 Bad Request", status: 400, responseTime };
      }
      
      if (response.status === 404 || response.status === 401 || response.status === 403) {
        trackApiHealth(serviceName, false, responseTime);
        return { data: null, error: `HTTP ${response.status}`, status: response.status, responseTime };
      }
      
      if (response.status >= 400) {
        if (attempt === retries) {
          trackApiHealth(serviceName, false, responseTime);
          return { data: null, error: `HTTP ${response.status}`, status: response.status, responseTime };
        }
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      if (attempt === retries) {
        trackApiHealth(serviceName, false, responseTime);
        recordCircuitBreakerFailure(serviceName);
        return { data: null, error: error.message, status: 0, responseTime };
      }
    }
  }
  
  const responseTime = Date.now() - startTime;
  trackApiHealth(serviceName, false, responseTime);
  return { data: null, error: "All retry attempts were exhausted.", status: 0, responseTime };
}

function getCachedData(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) return cached.data;
  return null;
}

function setCachedData(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

function getCircuitBreaker(service) {
  if (!circuitBreakers.has(service)) {
    circuitBreakers.set(service, { state: "CLOSED", failures: 0, lastFailure: null, nextAttempt: null });
  }
  return circuitBreakers.get(service);
}

function recordCircuitBreakerFailure(service) {
  const breaker = getCircuitBreaker(service);
  breaker.failures++;
  breaker.lastFailure = Date.now();
  if (breaker.failures >= CIRCUIT_BREAKER_THRESHOLD) {
    breaker.state = "OPEN";
    breaker.nextAttempt = Date.now() + CIRCUIT_BREAKER_TIMEOUT;
  }
}

function recordCircuitBreakerSuccess(service) {
  const breaker = getCircuitBreaker(service);
  breaker.failures = 0;
  breaker.state = "CLOSED";
  breaker.lastFailure = null;
  breaker.nextAttempt = null;
}

function isCircuitBreakerOpen(service) {
  const breaker = getCircuitBreaker(service);
  if (breaker.state === "OPEN") {
    if (Date.now() > breaker.nextAttempt) {
      breaker.state = "HALF_OPEN";
      return false;
    }
    return true;
  }
  return false;
}

function trackApiHealth(service, success, responseTime) {
  if (!serviceHealth.has(service)) {
    serviceHealth.set(service, { success: 0, total: 0, avgResponseTime: 0, lastUpdate: new Date() });
  }
  const stats = serviceHealth.get(service);
  stats.total++;
  if (success) stats.success++;
  stats.avgResponseTime = Math.round((stats.avgResponseTime + responseTime) / 2);
  stats.lastUpdate = new Date();
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371.0088;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + 
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const LONG_CACHE = new Map();

function envValue(name) {
  const value = process.env[name];
  return value !== undefined && value !== null && String(value).trim() !== "" ? String(value).trim() : null;
}

function contactUserAgent() {
  return envValue(API_KEY_ENV.userAgent) || DEFAULT_USER_AGENT;
}

async function withLongCache(key, ttlMs, producer) {
  const entry = LONG_CACHE.get(key);
  if (entry && Date.now() - entry.time < ttlMs) return entry.value;
  const value = await producer();
  if (value !== null && value !== undefined) LONG_CACHE.set(key, { value, time: Date.now() });
  return value;
}

function roundCoord(value, step = 0.1) {
  return (Math.round(value / step) * step).toFixed(2);
}

function isFiniteNumber(value) {
  return value !== null && value !== undefined && typeof value === "number" && isFinite(value);
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : parseFloat(value);
  return isFinite(parsed) ? parsed : null;
}

function bearingBetween(lat1, lon1, lat2, lon2) {
  const toRad = Math.PI / 180;
  const y = Math.sin((lon2 - lon1) * toRad) * Math.cos(lat2 * toRad);
  const x = Math.cos(lat1 * toRad) * Math.sin(lat2 * toRad) - Math.sin(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.cos((lon2 - lon1) * toRad);
  return Math.round(((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360);
}

function pointInRing(lat, lon, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [latI, lonI] = ring[i];
    const [latJ, lonJ] = ring[j];
    const intersects = ((lonI > lon) !== (lonJ > lon)) && (lat < (latJ - latI) * (lon - lonI) / (lonJ - lonI) + latI);
    if (intersects) inside = !inside;
  }
  return inside;
}

const US_COUNTRY_CODES = new Set(["us", "pr", "vi", "gu", "as", "mp", "um"]);

const METEOALARM_COUNTRIES = {
  at: "austria", be: "belgium", ba: "bosnia-herzegovina", bg: "bulgaria", hr: "croatia", cy: "cyprus", cz: "czechia",
  dk: "denmark", ee: "estonia", fi: "finland", fr: "france", de: "germany", gr: "greece", hu: "hungary", is: "iceland",
  ie: "ireland", il: "israel", it: "italy", lv: "latvia", lt: "lithuania", lu: "luxembourg", mt: "malta", md: "moldova",
  me: "montenegro", nl: "netherlands", mk: "republic-of-north-macedonia", no: "norway", pl: "poland", pt: "portugal",
  ro: "romania", rs: "serbia", sk: "slovakia", si: "slovenia", es: "spain", se: "sweden", ch: "switzerland",
  gb: "united-kingdom", ua: "ukraine"
};

async function reverseGeocode(lat, lon) {
  return withLongCache(`reverse_${roundCoord(lat, 0.05)}_${roundCoord(lon, 0.05)}`, 24 * 3600000, async () => {
    const url = `${API_ENDPOINTS.NOMINATIM_REVERSE}?format=jsonv2&lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}&zoom=10&accept-language=en`;
    const res = await makeApiRequestWithBackoff(url, { "User-Agent": contactUserAgent() }, 10000, 1);
    if (res.status !== 200 || !res.data?.address) return null;
    const a = res.data.address;
    return {
      countryCode: (a.country_code || "").toLowerCase(),
      country: a.country || null,
      names: [a.state, a.region, a.state_district, a.county, a.city, a.town, a.village, a.municipality, a.province].filter(Boolean)
    };
  });
}

const CAP_SEVERITY_MAP = { Extreme: "CRITICAL", Severe: "WARNING", Moderate: "ADVISORY", Minor: "INFO", Unknown: "INFO" };

async function fetchOfficialWarnings(lat, lon, alertManager) {
  const output = { coverage: "UNKNOWN", provider: null, region: null, warnings: [], matchMethod: null };
  alertManager.registerDataSource("official_warnings", "SAFETY_CRITICAL", "Official watches and warnings from national weather services");
  const place = await reverseGeocode(lat, lon);
  output.region = place ? place.country : null;
  const countryCode = place?.countryCode || null;

  if (!countryCode || US_COUNTRY_CODES.has(countryCode)) {
    const url = `${API_ENDPOINTS.NWS_ALERTS_ACTIVE}?point=${lat.toFixed(4)},${lon.toFixed(4)}&status=actual`;
    const res = await makeApiRequestWithBackoff(url, { "User-Agent": contactUserAgent(), "Accept": "application/geo+json" }, 12000, 1);
    if (res.status === 200 && Array.isArray(res.data?.features)) {
      output.coverage = "COVERED";
      output.provider = "National Weather Service";
      output.matchMethod = "Point";
      output.warnings = res.data.features.map(f => f.properties || {}).map(p => ({
        id: p.id,
        event: p.event,
        severity: p.severity || "Unknown",
        urgency: p.urgency || "Unknown",
        certainty: p.certainty || "Unknown",
        headline: p.headline || p.event,
        area: p.areaDesc,
        onset: p.onset || p.effective,
        expires: p.ends || p.expires,
        sender: p.senderName,
        description: p.description,
        instruction: p.instruction
      }));
      alertManager.updateDataSourceStatus("official_warnings", "AVAILABLE", res.responseTime);
    } else if (!countryCode) {
      output.coverage = "UNKNOWN";
      alertManager.updateDataSourceStatus("official_warnings", "DEGRADED", res.responseTime, "Location country could not be determined");
    } else {
      alertManager.updateDataSourceStatus("official_warnings", "FAILED", res.responseTime, res.error || "National Weather Service alerts is unavailable.");
    }
  } else if (METEOALARM_COUNTRIES[countryCode]) {
    const slug = METEOALARM_COUNTRIES[countryCode];
    const res = await makeApiRequestWithBackoff(`${API_ENDPOINTS.METEOALARM_FEEDS}${slug}`, { "User-Agent": contactUserAgent() }, 15000, 1);
    if (res.status === 200 && Array.isArray(res.data?.warnings)) {
      output.coverage = "COVERED";
      output.provider = "MeteoAlarm";
      const names = (place.names || []).map(n => n.toLowerCase());
      const now = Date.now();
      const seen = new Set();
      let usedPolygon = false;
      for (const warning of res.data.warnings) {
        const infos = warning?.alert?.info || [];
        const info = infos.find(i => /^en/i.test(i.language || "")) || infos[0];
        if (!info) continue;
        const expires = info.expires ? new Date(info.expires).getTime() : null;
        if (expires !== null && expires < now) continue;
        let matched = false;
        let areaLabel = null;
        for (const area of info.area || []) {
          const polygons = Array.isArray(area.polygon) ? area.polygon : area.polygon ? [area.polygon] : [];
          for (const poly of polygons) {
            const ring = String(poly).trim().split(/\s+/).map(pair => pair.split(",").map(Number)).filter(p => p.length === 2 && p.every(isFinite));
            if (ring.length > 2 && pointInRing(lat, lon, ring)) { matched = true; usedPolygon = true; areaLabel = area.areaDesc; }
          }
          const desc = (area.areaDesc || "").toLowerCase();
          if (!matched && desc && names.some(n => desc.includes(n) || n.includes(desc))) { matched = true; areaLabel = area.areaDesc; }
          if (matched) break;
        }
        if (!matched) continue;
        const key = `${info.event}_${info.onset}_${areaLabel}`;
        if (seen.has(key)) continue;
        seen.add(key);
        output.warnings.push({
          id: warning?.alert?.identifier || key,
          event: info.event,
          severity: info.severity || "Unknown",
          urgency: info.urgency || "Unknown",
          certainty: info.certainty || "Unknown",
          headline: info.headline || info.event,
          area: areaLabel,
          onset: info.onset || info.effective,
          expires: info.expires,
          sender: info.senderName,
          description: info.description,
          instruction: info.instruction
        });
      }
      output.matchMethod = usedPolygon ? "Polygon" : "Region Name";
      alertManager.updateDataSourceStatus("official_warnings", "AVAILABLE", res.responseTime);
    } else {
      alertManager.updateDataSourceStatus("official_warnings", "FAILED", res.responseTime, res.error || "MeteoAlarm feed is unavailable.");
    }
  } else {
    output.coverage = "NOT_COVERED";
    output.provider = null;
    alertManager.updateDataSourceStatus("official_warnings", "AVAILABLE", 0);
  }

  const severityOrder = { Extreme: 0, Severe: 1, Moderate: 2, Minor: 3, Unknown: 4 };
  output.warnings.sort((a, b) => (severityOrder[a.severity] ?? 5) - (severityOrder[b.severity] ?? 5));
  for (const w of output.warnings) {
    alertManager.addAlert(`${w.event}: ${w.headline || w.area || "An official warning is in effect."}`, CAP_SEVERITY_MAP[w.severity] || "INFO", "OFFICIAL_WARNING", "official_warnings", { provider: output.provider, area: w.area, expires: w.expires });
  }
  alertManager.registerDataPoint("official_warnings_active", output.warnings.length, "", "official_warnings", "INFORMATIONAL");
  return output;
}

function dewPointComfort(dewPoint) {
  if (!isFiniteNumber(dewPoint)) return null;
  if (dewPoint < 10) return "DRY";
  if (dewPoint < 13) return "COMFORTABLE";
  if (dewPoint < 16) return "SLIGHTLY HUMID";
  if (dewPoint < 18) return "HUMID";
  if (dewPoint < 21) return "MUGGY";
  if (dewPoint < 24) return "OPPRESSIVE";
  return "MISERABLE";
}

function wetBulbGlobeShade(temperature, humidity) {
  if (!isFiniteNumber(temperature) || !isFiniteNumber(humidity)) return null;
  const vapor = (humidity / 100) * 6.105 * Math.exp((17.27 * temperature) / (237.7 + temperature));
  return 0.567 * temperature + 0.393 * vapor + 3.94;
}

function windChill(temperature, windKmh) {
  if (!isFiniteNumber(temperature) || !isFiniteNumber(windKmh) || temperature > 10 || windKmh <= 4.8) return null;
  const v = Math.pow(windKmh, 0.16);
  return 13.12 + 0.6215 * temperature - 11.37 * v + 0.3965 * temperature * v;
}

function wbgtCategory(wbgt) {
  if (!isFiniteNumber(wbgt)) return null;
  if (wbgt < 25.6) return "LOW";
  if (wbgt < 27.8) return "MODERATE";
  if (wbgt < 29.4) return "ELEVATED";
  if (wbgt < 31.1) return "HIGH";
  return "EXTREME";
}

async function fetchComfortConditions(lat, lon, alertManager) {
  const output = { dataAvailable: false, timezone: null, utcOffsetSeconds: 0, temperature: null, humidity: null, dewPoint: null, apparentTemperature: null, windSpeedKmh: null, windChill: null, wbgt: null, wbgtCategory: null, dewPointComfort: null, pressure: null, pressureChange3h: null, pressureTendency: null, isDay: null, cloudCover: null };
  alertManager.registerDataSource("comfort_conditions", "OPERATIONAL", "Comfort and heat stress conditions from Open-Meteo");
  const url = `${API_ENDPOINTS.OPEN_METEO_FORECAST}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,dew_point_2m,apparent_temperature,wind_speed_10m,surface_pressure,is_day,cloud_cover&hourly=surface_pressure&past_hours=4&forecast_hours=1&wind_speed_unit=kmh&timezone=auto`;
  const res = await makeApiRequestWithBackoff(url, {}, 10000, 2);
  if (res.status !== 200 || !res.data?.current) {
    alertManager.updateDataSourceStatus("comfort_conditions", "FAILED", res.responseTime, res.error || "Comfort conditions is unavailable.");
    return output;
  }
  alertManager.updateDataSourceStatus("comfort_conditions", "AVAILABLE", res.responseTime);
  const cur = res.data.current;
  output.dataAvailable = true;
  output.timezone = res.data.timezone || null;
  output.utcOffsetSeconds = res.data.utc_offset_seconds || 0;
  output.temperature = toNumber(cur.temperature_2m);
  output.humidity = toNumber(cur.relative_humidity_2m);
  output.dewPoint = toNumber(cur.dew_point_2m);
  output.apparentTemperature = toNumber(cur.apparent_temperature);
  output.windSpeedKmh = toNumber(cur.wind_speed_10m);
  output.pressure = toNumber(cur.surface_pressure);
  output.isDay = cur.is_day === 1;
  output.cloudCover = toNumber(cur.cloud_cover);
  const chill = windChill(output.temperature, output.windSpeedKmh);
  output.windChill = chill !== null ? parseFloat(chill.toFixed(1)) : null;
  const wbgt = wetBulbGlobeShade(output.temperature, output.humidity);
  output.wbgt = wbgt !== null ? parseFloat(wbgt.toFixed(1)) : null;
  output.wbgtCategory = wbgtCategory(output.wbgt);
  output.dewPointComfort = dewPointComfort(output.dewPoint);
  const pressures = (res.data.hourly?.surface_pressure || []).filter(isFiniteNumber);
  if (pressures.length >= 4 && isFiniteNumber(output.pressure)) {
    const change = output.pressure - pressures[pressures.length - 4];
    output.pressureChange3h = parseFloat(change.toFixed(1));
    const abs = Math.abs(change);
    output.pressureTendency = abs < 1 ? "STEADY" : abs < 3 ? (change > 0 ? "RISING" : "FALLING") : (change > 0 ? "RISING RAPIDLY" : "FALLING RAPIDLY");
    if (change <= -3) alertManager.addAlert(`Pressure is falling rapidly at ${output.pressureChange3h} hPa over 3 hours, which often precedes a strong storm.`, "ADVISORY", "PRESSURE", "comfort_conditions", { change });
  }
  if (output.wbgt !== null) alertManager.registerDataPoint("wet_bulb_globe_temperature", output.wbgt, "C", "comfort_conditions", "SAFETY_CRITICAL");
  if (output.apparentTemperature !== null) alertManager.registerDataPoint("apparent_temperature", output.apparentTemperature, "C", "comfort_conditions", "OPERATIONAL");
  return output;
}

function pm25ToAqi(pm) {
  if (!isFiniteNumber(pm) || pm < 0) return null;
  const table = [[0, 9.0, 0, 50], [9.1, 35.4, 51, 100], [35.5, 55.4, 101, 150], [55.5, 125.4, 151, 200], [125.5, 225.4, 201, 300], [225.5, 325.4, 301, 500]];
  const c = Math.floor(pm * 10) / 10;
  for (const [cl, ch, il, ih] of table) {
    if (c >= cl && c <= ch) return Math.round(((ih - il) / (ch - cl)) * (c - cl) + il);
  }
  return 500;
}

function aqiCategory(aqi) {
  if (!isFiniteNumber(aqi)) return null;
  if (aqi <= 50) return "GOOD";
  if (aqi <= 100) return "MODERATE";
  if (aqi <= 150) return "UNHEALTHY FOR SENSITIVE GROUPS";
  if (aqi <= 200) return "UNHEALTHY";
  if (aqi <= 300) return "VERY UNHEALTHY";
  return "HAZARDOUS";
}

function uvCategory(uv) {
  if (!isFiniteNumber(uv)) return null;
  if (uv < 3) return "LOW";
  if (uv < 6) return "MODERATE";
  if (uv < 8) return "HIGH";
  if (uv < 11) return "VERY HIGH";
  return "EXTREME";
}

async function fetchAirQuality(lat, lon, alertManager) {
  const output = { dataAvailable: false, usAqi: null, usAqiCategory: null, europeanAqi: null, pm25: null, pm10: null, ozone: null, nitrogenDioxide: null, sulphurDioxide: null, carbonMonoxide: null, dust: null, uvIndex: null, uvIndexClearSky: null, uvCategory: null, uvMaxToday: null, pollen: {}, hourly: [] };
  alertManager.registerDataSource("air_quality", "SAFETY_CRITICAL", "Air quality and UV from the Open-Meteo CAMS air quality model");
  const current = "us_aqi,european_aqi,pm2_5,pm10,ozone,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide,dust,uv_index,uv_index_clear_sky,alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen";
  const url = `${API_ENDPOINTS.OPEN_METEO_AIR_QUALITY}?latitude=${lat}&longitude=${lon}&current=${current}&hourly=us_aqi,pm2_5,uv_index&forecast_days=2&timezone=auto`;
  const res = await makeApiRequestWithBackoff(url, {}, 10000, 2);
  if (res.status !== 200 || !res.data?.current) {
    alertManager.updateDataSourceStatus("air_quality", "FAILED", res.responseTime, res.error || "Air quality data is unavailable.");
    return output;
  }
  alertManager.updateDataSourceStatus("air_quality", "AVAILABLE", res.responseTime);
  const c = res.data.current;
  output.dataAvailable = true;
  output.usAqi = toNumber(c.us_aqi);
  output.usAqiCategory = aqiCategory(output.usAqi);
  output.europeanAqi = toNumber(c.european_aqi);
  output.pm25 = toNumber(c.pm2_5);
  output.pm10 = toNumber(c.pm10);
  output.ozone = toNumber(c.ozone);
  output.nitrogenDioxide = toNumber(c.nitrogen_dioxide);
  output.sulphurDioxide = toNumber(c.sulphur_dioxide);
  output.carbonMonoxide = toNumber(c.carbon_monoxide);
  output.dust = toNumber(c.dust);
  output.uvIndex = toNumber(c.uv_index);
  output.uvIndexClearSky = toNumber(c.uv_index_clear_sky);
  output.uvCategory = uvCategory(output.uvIndex);
  output.pollen = {
    alder: toNumber(c.alder_pollen), birch: toNumber(c.birch_pollen), grass: toNumber(c.grass_pollen),
    mugwort: toNumber(c.mugwort_pollen), olive: toNumber(c.olive_pollen), ragweed: toNumber(c.ragweed_pollen)
  };
  const h = res.data.hourly || {};
  const times = h.time || [];
  const nowMs = Date.now();
  for (let i = 0; i < times.length; i++) {
    output.hourly.push({ time: times[i], usAqi: toNumber(h.us_aqi?.[i]), pm25: toNumber(h.pm2_5?.[i]), uvIndex: toNumber(h.uv_index?.[i]) });
  }
  const localHour = new Date(nowMs + (res.data.utc_offset_seconds || 0) * 1000).toISOString().slice(0, 13);
  const todayPrefix = localHour.slice(0, 10);
  const todayUv = output.hourly.filter(p => p.time.startsWith(todayPrefix) && isFiniteNumber(p.uvIndex)).map(p => p.uvIndex);
  output.uvMaxToday = todayUv.length ? Math.max(...todayUv) : null;
  output.hourly = output.hourly.filter(p => p.time.slice(0, 13) >= localHour).slice(0, 36);
  if (output.usAqi !== null) alertManager.registerDataPoint("us_aqi", output.usAqi, "", "air_quality", "SAFETY_CRITICAL");
  if (output.pm25 !== null) alertManager.registerDataPoint("pm2_5", output.pm25, "ug/m3", "air_quality", "SAFETY_CRITICAL");
  if (output.uvIndex !== null) alertManager.registerDataPoint("uv_index", output.uvIndex, "", "air_quality", "OPERATIONAL");
  return output;
}

async function fetchPurpleAir(lat, lon, alertManager) {
  const apiKey = envValue(API_KEY_ENV.purpleAir);
  const output = { configured: Boolean(apiKey), dataAvailable: false, sensors: [], nearest: null };
  if (!apiKey) return output;
  alertManager.registerDataSource("purpleair_sensors", "OPERATIONAL", "PurpleAir community air quality sensors");
  const fields = "name,pm2.5_10minute,humidity,temperature,latitude,longitude,last_seen,confidence";
  const sensorIndex = envValue(API_KEY_ENV.purpleAirSensor);
  let rows = [];
  let responseTime = 0;
  if (sensorIndex) {
    const res = await makeApiRequestWithBackoff(`${API_ENDPOINTS.PURPLEAIR_SENSORS}/${encodeURIComponent(sensorIndex)}?fields=${fields}`, { "X-API-Key": apiKey }, 10000, 1);
    responseTime = res.responseTime;
    if (res.status === 200 && res.data?.sensor) rows = [res.data.sensor];
    else { alertManager.updateDataSourceStatus("purpleair_sensors", "FAILED", responseTime, res.error || "PurpleAir sensor is unavailable."); return output; }
  } else {
    const box = 0.15;
    const url = `${API_ENDPOINTS.PURPLEAIR_SENSORS}?fields=${fields}&location_type=0&max_age=3600&nwlng=${(lon - box).toFixed(4)}&nwlat=${(lat + box).toFixed(4)}&selng=${(lon + box).toFixed(4)}&selat=${(lat - box).toFixed(4)}`;
    const res = await makeApiRequestWithBackoff(url, { "X-API-Key": apiKey }, 10000, 1);
    responseTime = res.responseTime;
    if (res.status === 200 && Array.isArray(res.data?.data) && Array.isArray(res.data?.fields)) {
      rows = res.data.data.map(r => Object.fromEntries(res.data.fields.map((f, i) => [f, r[i]])));
    } else { alertManager.updateDataSourceStatus("purpleair_sensors", "FAILED", responseTime, res.error || "PurpleAir sensors are unavailable."); return output; }
  }
  alertManager.updateDataSourceStatus("purpleair_sensors", "AVAILABLE", responseTime);
  output.dataAvailable = true;
  output.sensors = rows.map(r => {
    const raw = toNumber(r["pm2.5_10minute"]);
    const rh = toNumber(r.humidity);
    const corrected = raw !== null && rh !== null && raw < 343 ? Math.max(0, 0.524 * raw - 0.0862 * rh + 5.75) : raw;
    const sLat = toNumber(r.latitude);
    const sLon = toNumber(r.longitude);
    return {
      index: r.sensor_index ?? sensorIndex,
      name: r.name || "PurpleAir Sensor",
      rawPm25: raw,
      correctedPm25: corrected !== null ? parseFloat(corrected.toFixed(1)) : null,
      aqi: pm25ToAqi(corrected),
      humidity: rh,
      distanceKm: sLat !== null && sLon !== null ? parseFloat(calculateDistance(lat, lon, sLat, sLon).toFixed(1)) : null,
      lastSeen: r.last_seen ? new Date(r.last_seen * 1000).toISOString() : null,
      confidence: toNumber(r.confidence)
    };
  }).sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0)).slice(0, 10);
  output.nearest = output.sensors[0] || null;
  return output;
}

const ASTRO_RAD = Math.PI / 180;
const ASTRO_DAY_MS = 86400000;
const ASTRO_J1970 = 2440588;
const ASTRO_J2000 = 2451545;
const ASTRO_OBLIQUITY = ASTRO_RAD * 23.4397;
const ASTRO_J0 = 0.0009;

const toJulian = (date) => date.valueOf() / ASTRO_DAY_MS - 0.5 + ASTRO_J1970;
const fromJulian = (j) => new Date((j + 0.5 - ASTRO_J1970) * ASTRO_DAY_MS);
const toDays = (date) => toJulian(date) - ASTRO_J2000;
const rightAscension = (l, b) => Math.atan2(Math.sin(l) * Math.cos(ASTRO_OBLIQUITY) - Math.tan(b) * Math.sin(ASTRO_OBLIQUITY), Math.cos(l));
const declination = (l, b) => Math.asin(Math.sin(b) * Math.cos(ASTRO_OBLIQUITY) + Math.cos(b) * Math.sin(ASTRO_OBLIQUITY) * Math.sin(l));
const azimuthOf = (H, phi, dec) => Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi));
const altitudeOf = (H, phi, dec) => Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
const siderealTime = (d, lw) => ASTRO_RAD * (280.16 + 360.9856235 * d) - lw;
const astroRefraction = (h) => { const hh = h < 0 ? 0 : h; return 0.0002967 / Math.tan(hh + 0.00312536 / (hh + 0.08901179)); };
const solarMeanAnomaly = (d) => ASTRO_RAD * (357.5291 + 0.98560028 * d);
const eclipticLongitude = (M) => M + ASTRO_RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)) + ASTRO_RAD * 102.9372 + Math.PI;
const sunCoords = (d) => { const M = solarMeanAnomaly(d); const L = eclipticLongitude(M); return { dec: declination(L, 0), ra: rightAscension(L, 0) }; };

function sunPosition(date, lat, lng) {
  const lw = ASTRO_RAD * -lng;
  const phi = ASTRO_RAD * lat;
  const d = toDays(date);
  const c = sunCoords(d);
  const H = siderealTime(d, lw) - c.ra;
  return { azimuth: azimuthOf(H, phi, c.dec), altitude: altitudeOf(H, phi, c.dec) };
}

function sunTimes(date, lat, lng) {
  const lw = ASTRO_RAD * -lng;
  const phi = ASTRO_RAD * lat;
  const d = toDays(date);
  const n = Math.round(d - ASTRO_J0 - lw / (2 * Math.PI));
  const ds = ASTRO_J0 + lw / (2 * Math.PI) + n;
  const M = solarMeanAnomaly(ds);
  const L = eclipticLongitude(M);
  const dec = declination(L, 0);
  const transit = (a) => ASTRO_J2000 + a + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
  const Jnoon = transit(ds);
  const result = { solarNoon: fromJulian(Jnoon) };
  const definitions = [[-0.833, "sunrise", "sunset"], [-6, "dawn", "dusk"], [-12, "nauticalDawn", "nauticalDusk"], [-18, "nightEnd", "night"], [6, "goldenHourEnd", "goldenHour"]];
  for (const [angle, rise, set] of definitions) {
    const w = Math.acos((Math.sin(angle * ASTRO_RAD) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec)));
    const Jset = transit(ASTRO_J0 + (w + lw) / (2 * Math.PI) + n);
    const Jrise = Jnoon - (Jset - Jnoon);
    result[rise] = isNaN(Jrise) ? null : fromJulian(Jrise);
    result[set] = isNaN(Jset) ? null : fromJulian(Jset);
  }
  return result;
}

function moonCoords(d) {
  const L = ASTRO_RAD * (218.316 + 13.176396 * d);
  const M = ASTRO_RAD * (134.963 + 13.064993 * d);
  const F = ASTRO_RAD * (93.272 + 13.229350 * d);
  const l = L + ASTRO_RAD * 6.289 * Math.sin(M);
  const b = ASTRO_RAD * 5.128 * Math.sin(F);
  return { ra: rightAscension(l, b), dec: declination(l, b), dist: 385001 - 20905 * Math.cos(M) };
}

function moonPosition(date, lat, lng) {
  const lw = ASTRO_RAD * -lng;
  const phi = ASTRO_RAD * lat;
  const d = toDays(date);
  const c = moonCoords(d);
  const H = siderealTime(d, lw) - c.ra;
  const h = altitudeOf(H, phi, c.dec);
  return { azimuth: azimuthOf(H, phi, c.dec), altitude: h + astroRefraction(h), distance: c.dist };
}

function moonIllumination(date) {
  const d = toDays(date);
  const s = sunCoords(d);
  const m = moonCoords(d);
  const sdist = 149598000;
  const phi = Math.acos(Math.sin(s.dec) * Math.sin(m.dec) + Math.cos(s.dec) * Math.cos(m.dec) * Math.cos(s.ra - m.ra));
  const inc = Math.atan2(sdist * Math.sin(phi), m.dist - sdist * Math.cos(phi));
  const angle = Math.atan2(Math.cos(s.dec) * Math.sin(s.ra - m.ra), Math.sin(s.dec) * Math.cos(m.dec) - Math.cos(s.dec) * Math.sin(m.dec) * Math.cos(s.ra - m.ra));
  return { fraction: (1 + Math.cos(inc)) / 2, phase: 0.5 + 0.5 * inc * (angle < 0 ? -1 : 1) / Math.PI };
}

function moonTimes(startOfDay, lat, lng) {
  const hc = 0.133 * ASTRO_RAD;
  const later = (h) => new Date(startOfDay.valueOf() + h * 3600000);
  let h0 = moonPosition(startOfDay, lat, lng).altitude - hc;
  let rise = null;
  let set = null;
  let ye = 0;
  for (let i = 1; i <= 24; i += 2) {
    const h1 = moonPosition(later(i), lat, lng).altitude - hc;
    const h2 = moonPosition(later(i + 1), lat, lng).altitude - hc;
    const a = (h0 + h2) / 2 - h1;
    const b = (h2 - h0) / 2;
    const xe = -b / (2 * a);
    ye = (a * xe + b) * xe + h1;
    const disc = b * b - 4 * a * h1;
    let roots = 0;
    let x1 = 0;
    let x2 = 0;
    if (disc >= 0) {
      const dx = Math.sqrt(disc) / (Math.abs(a) * 2);
      x1 = xe - dx;
      x2 = xe + dx;
      if (Math.abs(x1) <= 1) roots++;
      if (Math.abs(x2) <= 1) roots++;
      if (x1 < -1) x1 = x2;
    }
    if (roots === 1) {
      if (h0 < 0) rise = i + x1;
      else set = i + x1;
    } else if (roots === 2) {
      rise = i + (ye < 0 ? x2 : x1);
      set = i + (ye < 0 ? x1 : x2);
    }
    if (rise !== null && set !== null) break;
    h0 = h2;
  }
  return { rise: rise !== null ? later(rise) : null, set: set !== null ? later(set) : null, alwaysUp: rise === null && set === null && ye > 0, alwaysDown: rise === null && set === null && ye <= 0 };
}

function moonPhaseName(phase) {
  const p = ((phase % 1) + 1) % 1;
  if (p < 0.0339 || p > 0.9661) return "NEW MOON";
  if (Math.abs(p - 0.25) < 0.0339) return "FIRST QUARTER";
  if (Math.abs(p - 0.5) < 0.0339) return "FULL MOON";
  if (Math.abs(p - 0.75) < 0.0339) return "LAST QUARTER";
  if (p < 0.25) return "WAXING CRESCENT";
  if (p < 0.5) return "WAXING GIBBOUS";
  if (p < 0.75) return "WANING GIBBOUS";
  return "WANING CRESCENT";
}

function computeSunMoon(lat, lon, utcOffsetSeconds) {
  const now = new Date();
  const localNow = new Date(now.valueOf() + utcOffsetSeconds * 1000);
  const localMidnightUtc = new Date(Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate()) - utcOffsetSeconds * 1000);
  const localNoonUtc = new Date(localMidnightUtc.valueOf() + 12 * 3600000);
  const times = sunTimes(localNoonUtc, lat, lon);
  const position = sunPosition(now, lat, lon);
  const moonPos = moonPosition(now, lat, lon);
  const illumination = moonIllumination(now);
  const mt = moonTimes(localMidnightUtc, lat, lon);
  const iso = (d) => (d instanceof Date && !isNaN(d.valueOf()) ? d.toISOString() : null);
  const dayLengthHours = times.sunrise && times.sunset ? (times.sunset - times.sunrise) / 3600000 : null;
  const yesterdayTimes = sunTimes(new Date(localNoonUtc.valueOf() - ASTRO_DAY_MS), lat, lon);
  const yesterdayLength = yesterdayTimes.sunrise && yesterdayTimes.sunset ? (yesterdayTimes.sunset - yesterdayTimes.sunrise) / 3600000 : null;
  const sunAltitudeDeg = position.altitude / ASTRO_RAD;
  return {
    dataAvailable: true,
    sunrise: iso(times.sunrise),
    sunset: iso(times.sunset),
    solarNoon: iso(times.solarNoon),
    civilDawn: iso(times.dawn),
    civilDusk: iso(times.dusk),
    astronomicalDawn: iso(times.nightEnd),
    astronomicalDusk: iso(times.night),
    goldenHourMorningEnd: iso(times.goldenHourEnd),
    goldenHourEveningStart: iso(times.goldenHour),
    dayLengthHours: dayLengthHours !== null ? parseFloat(dayLengthHours.toFixed(3)) : null,
    dayLengthChangeMinutes: dayLengthHours !== null && yesterdayLength !== null ? parseFloat(((dayLengthHours - yesterdayLength) * 60).toFixed(1)) : null,
    sunAltitude: parseFloat(sunAltitudeDeg.toFixed(1)),
    sunAzimuth: parseFloat((((position.azimuth / ASTRO_RAD) + 180) % 360).toFixed(1)),
    skyState: sunAltitudeDeg > 0 ? "DAYLIGHT" : sunAltitudeDeg > -6 ? "CIVIL TWILIGHT" : sunAltitudeDeg > -12 ? "NAUTICAL TWILIGHT" : sunAltitudeDeg > -18 ? "ASTRONOMICAL TWILIGHT" : "NIGHT",
    moonPhase: parseFloat(illumination.phase.toFixed(3)),
    moonPhaseName: moonPhaseName(illumination.phase),
    moonIllumination: parseFloat((illumination.fraction * 100).toFixed(1)),
    moonrise: iso(mt.rise),
    moonset: iso(mt.set),
    moonAlwaysUp: mt.alwaysUp,
    moonAlwaysDown: mt.alwaysDown,
    moonAltitude: parseFloat((moonPos.altitude / ASTRO_RAD).toFixed(1)),
    moonDistanceKm: Math.round(moonPos.distance)
  };
}

async function fetchGardenConditions(lat, lon, alertManager) {
  const output = { dataAvailable: false, soilTemperature0cm: null, soilTemperature6cm: null, soilTemperature18cm: null, soilMoisture0to1cm: null, soilMoisture1to3cm: null, soilMoisture3to9cm: null, soilMoisture9to27cm: null, evapotranspiration7d: null, precipitation7d: null, waterBalance7d: null, frostNights7d: 0, firstFrostDate: null, minTemperature7d: null, daily: [] };
  alertManager.registerDataSource("garden_soil", "INFORMATIONAL", "Soil temperature, soil moisture and evapotranspiration from Open-Meteo");
  const hourly = "soil_temperature_0cm,soil_temperature_6cm,soil_temperature_18cm,soil_moisture_0_to_1cm,soil_moisture_1_to_3cm,soil_moisture_3_to_9cm,soil_moisture_9_to_27cm";
  const url = `${API_ENDPOINTS.OPEN_METEO_FORECAST}?latitude=${lat}&longitude=${lon}&hourly=${hourly}&daily=temperature_2m_min,temperature_2m_max,precipitation_sum,et0_fao_evapotranspiration&forecast_days=7&timezone=auto`;
  const res = await makeApiRequestWithBackoff(url, {}, 10000, 2);
  if (res.status !== 200 || !res.data?.hourly) {
    alertManager.updateDataSourceStatus("garden_soil", "FAILED", res.responseTime, res.error || "Soil data is unavailable.");
    return output;
  }
  alertManager.updateDataSourceStatus("garden_soil", "AVAILABLE", res.responseTime);
  output.dataAvailable = true;
  const h = res.data.hourly;
  const localHour = new Date(Date.now() + (res.data.utc_offset_seconds || 0) * 1000).toISOString().slice(0, 13);
  let idx = (h.time || []).findIndex(t => t.slice(0, 13) === localHour);
  if (idx < 0) idx = 0;
  output.soilTemperature0cm = toNumber(h.soil_temperature_0cm?.[idx]);
  output.soilTemperature6cm = toNumber(h.soil_temperature_6cm?.[idx]);
  output.soilTemperature18cm = toNumber(h.soil_temperature_18cm?.[idx]);
  output.soilMoisture0to1cm = toNumber(h.soil_moisture_0_to_1cm?.[idx]);
  output.soilMoisture1to3cm = toNumber(h.soil_moisture_1_to_3cm?.[idx]);
  output.soilMoisture3to9cm = toNumber(h.soil_moisture_3_to_9cm?.[idx]);
  output.soilMoisture9to27cm = toNumber(h.soil_moisture_9_to_27cm?.[idx]);
  const d = res.data.daily || {};
  const days = d.time || [];
  let et = 0;
  let pr = 0;
  for (let i = 0; i < days.length; i++) {
    const tmin = toNumber(d.temperature_2m_min?.[i]);
    const tmax = toNumber(d.temperature_2m_max?.[i]);
    const etDay = toNumber(d.et0_fao_evapotranspiration?.[i]);
    const prDay = toNumber(d.precipitation_sum?.[i]);
    if (etDay !== null) et += etDay;
    if (prDay !== null) pr += prDay;
    if (tmin !== null && tmin <= 0) {
      output.frostNights7d++;
      if (!output.firstFrostDate) output.firstFrostDate = days[i];
    }
    if (tmin !== null && (output.minTemperature7d === null || tmin < output.minTemperature7d)) output.minTemperature7d = tmin;
    output.daily.push({ date: days[i], minTemperature: tmin, maxTemperature: tmax, evapotranspiration: etDay, precipitation: prDay, waterBalance: etDay !== null && prDay !== null ? parseFloat((prDay - etDay).toFixed(1)) : null });
  }
  output.evapotranspiration7d = parseFloat(et.toFixed(1));
  output.precipitation7d = parseFloat(pr.toFixed(1));
  output.waterBalance7d = parseFloat((pr - et).toFixed(1));
  if (output.frostNights7d > 0) alertManager.addAlert(`Frost is forecast on ${output.frostNights7d} of the next 7 nights, starting ${output.firstFrostDate}.`, "ADVISORY", "FROST", "garden_soil", { nights: output.frostNights7d });
  return output;
}

function formatCoopsDate(date) {
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`;
}

async function fetchTides(lat, lon, countryCode, alertManager) {
  const output = { dataAvailable: false, provider: null, station: null, extremes: [], series: [], latestObserved: null, nextHigh: null, nextLow: null, trend: null };
  const isUs = !countryCode || US_COUNTRY_CODES.has(countryCode);
  const worldTidesKey = envValue(API_KEY_ENV.worldTides);
  if (isUs) {
    alertManager.registerDataSource("tide_predictions", "INFORMATIONAL", "NOAA CO-OPS tide predictions and water levels");
    const stations = await withLongCache("coops_tide_stations", 24 * 3600000, async () => {
      const res = await makeApiRequestWithBackoff(`${API_ENDPOINTS.NOAA_TIDE_STATIONS}?type=tidepredictions`, {}, 20000, 1);
      return res.status === 200 && Array.isArray(res.data?.stations) ? res.data.stations.map(s => ({ id: s.id, name: s.name, state: s.state, lat: toNumber(s.lat), lon: toNumber(s.lng) })).filter(s => s.lat !== null && s.lon !== null) : null;
    });
    if (!stations) {
      alertManager.updateDataSourceStatus("tide_predictions", "FAILED", 0, "NOAA tide station list is unavailable.");
      return output;
    }
    let nearest = null;
    for (const s of stations) {
      const dist = calculateDistance(lat, lon, s.lat, s.lon);
      if (!nearest || dist < nearest.distanceKm) nearest = { ...s, distanceKm: dist };
    }
    if (!nearest || nearest.distanceKm > 150) {
      alertManager.updateDataSourceStatus("tide_predictions", "AVAILABLE", 0);
      output.provider = "NOAA CO-OPS";
      return output;
    }
    const begin = formatCoopsDate(new Date(Date.now() - 6 * 3600000));
    const base = `${API_ENDPOINTS.NOAA_TIDES_DATAGETTER}?station=${nearest.id}&product=predictions&datum=MLLW&time_zone=gmt&units=metric&format=json&application=DinoSat_Earth_Conditions&begin_date=${begin}&range=54`;
    const [hilo, hourly, observed] = await Promise.all([
      makeApiRequestWithBackoff(`${base}&interval=hilo`, {}, 12000, 1),
      makeApiRequestWithBackoff(`${base}&interval=h`, {}, 12000, 1),
      makeApiRequestWithBackoff(`${API_ENDPOINTS.NOAA_TIDES_DATAGETTER}?station=${nearest.id}&product=water_level&datum=MLLW&time_zone=gmt&units=metric&format=json&application=DinoSat_Earth_Conditions&date=latest`, {}, 8000, 0)
    ]);
    if (hilo.status !== 200 || !Array.isArray(hilo.data?.predictions)) {
      alertManager.updateDataSourceStatus("tide_predictions", "FAILED", hilo.responseTime, hilo.error || "Tide predictions are unavailable.");
      return output;
    }
    alertManager.updateDataSourceStatus("tide_predictions", "AVAILABLE", hilo.responseTime);
    output.provider = "NOAA CO-OPS";
    output.station = { id: nearest.id, name: nearest.state ? `${nearest.name}, ${nearest.state}` : nearest.name, distanceKm: parseFloat(nearest.distanceKm.toFixed(1)), datum: "MLLW" };
    output.extremes = hilo.data.predictions.map(p => ({ time: new Date(`${p.t.replace(" ", "T")}:00Z`).toISOString(), type: p.type === "H" ? "HIGH" : "LOW", height: toNumber(p.v) }));
    output.series = Array.isArray(hourly.data?.predictions) ? hourly.data.predictions.map(p => ({ time: new Date(`${p.t.replace(" ", "T")}:00Z`).toISOString(), height: toNumber(p.v) })) : [];
    const obs = observed.data?.data?.[0];
    if (obs) output.latestObserved = { time: new Date(`${obs.t.replace(" ", "T")}:00Z`).toISOString(), height: toNumber(obs.v) };
  } else if (worldTidesKey) {
    alertManager.registerDataSource("tide_predictions", "INFORMATIONAL", "WorldTides global tide predictions");
    const url = `${API_ENDPOINTS.WORLDTIDES}?heights&extremes&lat=${lat}&lon=${lon}&days=2&step=3600&key=${encodeURIComponent(worldTidesKey)}`;
    const res = await makeApiRequestWithBackoff(url, {}, 12000, 1);
    if (res.status !== 200 || !Array.isArray(res.data?.extremes)) {
      alertManager.updateDataSourceStatus("tide_predictions", "FAILED", res.responseTime, res.data?.error || res.error || "WorldTides is unavailable.");
      return output;
    }
    alertManager.updateDataSourceStatus("tide_predictions", "AVAILABLE", res.responseTime);
    output.provider = "WorldTides";
    output.station = { id: res.data.station || "Model", name: res.data.station || "Nearest Tidal Model Point", distanceKm: toNumber(res.data.responseLat) !== null && toNumber(res.data.responseLon) !== null ? parseFloat(calculateDistance(lat, lon, toNumber(res.data.responseLat), toNumber(res.data.responseLon)).toFixed(1)) : null, datum: res.data.responseDatum || "Default" };
    output.extremes = res.data.extremes.map(p => ({ time: new Date(p.dt * 1000).toISOString(), type: String(p.type).toUpperCase() === "HIGH" ? "HIGH" : "LOW", height: toNumber(p.height) }));
    output.series = (res.data.heights || []).map(p => ({ time: new Date(p.dt * 1000).toISOString(), height: toNumber(p.height) }));
  } else {
    return output;
  }
  output.dataAvailable = output.extremes.length > 0;
  const now = Date.now();
  output.nextHigh = output.extremes.find(e => e.type === "HIGH" && new Date(e.time).getTime() > now) || null;
  output.nextLow = output.extremes.find(e => e.type === "LOW" && new Date(e.time).getTime() > now) || null;
  if (output.nextHigh && output.nextLow) output.trend = new Date(output.nextHigh.time) < new Date(output.nextLow.time) ? "RISING" : "FALLING";
  output.series = output.series.filter(p => new Date(p.time).getTime() >= now - 3 * 3600000).slice(0, 48);
  output.extremes = output.extremes.filter(e => new Date(e.time).getTime() >= now - 6 * 3600000).slice(0, 8);
  return output;
}

async function fetchRiverGauges(lat, lon, countryCode, alertManager) {
  const output = { dataAvailable: false, gauges: [] };
  if (countryCode && !US_COUNTRY_CODES.has(countryCode)) return output;
  alertManager.registerDataSource("usgs_river_gauges", "OPERATIONAL", "USGS river gauges from the Water Data OGC API");
  const box = 0.4;
  const bbox = `${(lon - box).toFixed(4)},${(lat - box).toFixed(4)},${(lon + box).toFixed(4)},${(lat + box).toFixed(4)}`;
  const key = envValue(API_KEY_ENV.usgs);
  const keyParam = key ? `&api_key=${encodeURIComponent(key)}` : "";
  const base = API_ENDPOINTS.USGS_WATERDATA;
  const [stage, flow, locations] = await Promise.all([
    makeApiRequestWithBackoff(`${base}/latest-continuous/items?f=json&bbox=${bbox}&parameter_code=00065&limit=200${keyParam}`, {}, 15000, 1),
    makeApiRequestWithBackoff(`${base}/latest-continuous/items?f=json&bbox=${bbox}&parameter_code=00060&limit=200${keyParam}`, {}, 15000, 1),
    makeApiRequestWithBackoff(`${base}/monitoring-locations/items?f=json&bbox=${bbox}&site_type_code=ST&limit=500&properties=monitoring_location_name${keyParam}`, {}, 15000, 1)
  ]);
  if (stage.status !== 200 && flow.status !== 200) {
    alertManager.updateDataSourceStatus("usgs_river_gauges", "FAILED", stage.responseTime, stage.error || "USGS water data is unavailable.");
    return output;
  }
  alertManager.updateDataSourceStatus("usgs_river_gauges", "AVAILABLE", Math.max(stage.responseTime || 0, flow.responseTime || 0));
  const names = new Map((locations.data?.features || []).map(f => [f.id || f.properties?.id, f.properties?.monitoring_location_name]));
  const gauges = new Map();
  const ingest = (features, field) => {
    for (const f of features || []) {
      const p = f.properties || {};
      const id = p.monitoring_location_id;
      if (!id) continue;
      const coords = f.geometry?.coordinates;
      const entry = gauges.get(id) || { id, name: names.get(id) || id, stage: null, stageUnit: null, flow: null, flowUnit: null, time: null, distanceKm: null };
      entry[field] = toNumber(p.value);
      entry[`${field}Unit`] = p.unit_of_measure || null;
      entry.time = p.time || entry.time;
      if (Array.isArray(coords) && coords.length >= 2) entry.distanceKm = parseFloat(calculateDistance(lat, lon, coords[1], coords[0]).toFixed(1));
      gauges.set(id, entry);
    }
  };
  ingest(stage.data?.features, "stage");
  ingest(flow.data?.features, "flow");
  output.gauges = [...gauges.values()].filter(g => g.distanceKm !== null).sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 10);
  output.dataAvailable = output.gauges.length > 0;
  return output;
}

async function fetchFloodForecast(lat, lon, alertManager) {
  const output = { dataAvailable: false, currentDischarge: null, peakDischarge: null, peakDate: null, trend: null, peakRatio: null, series: [] };
  alertManager.registerDataSource("river_discharge_forecast", "INFORMATIONAL", "GloFAS river discharge forecast from the Open-Meteo flood API");
  const url = `${API_ENDPOINTS.OPEN_METEO_FLOOD}?latitude=${lat}&longitude=${lon}&daily=river_discharge,river_discharge_median,river_discharge_max,river_discharge_min&past_days=7&forecast_days=30`;
  const res = await makeApiRequestWithBackoff(url, {}, 15000, 1);
  if (res.status !== 200 || !res.data?.daily) {
    alertManager.updateDataSourceStatus("river_discharge_forecast", "FAILED", res.responseTime, res.error || "Flood forecast is unavailable.");
    return output;
  }
  alertManager.updateDataSourceStatus("river_discharge_forecast", "AVAILABLE", res.responseTime);
  const d = res.data.daily;
  const today = new Date().toISOString().slice(0, 10);
  for (let i = 0; i < (d.time || []).length; i++) {
    output.series.push({ date: d.time[i], discharge: toNumber(d.river_discharge?.[i]), median: toNumber(d.river_discharge_median?.[i]), max: toNumber(d.river_discharge_max?.[i]), min: toNumber(d.river_discharge_min?.[i]), isForecast: d.time[i] > today });
  }
  const todayEntry = output.series.find(p => p.date === today) || output.series.find(p => p.isForecast);
  output.currentDischarge = todayEntry ? (todayEntry.discharge ?? todayEntry.median) : null;
  const future = output.series.filter(p => p.isForecast && isFiniteNumber(p.median ?? p.discharge));
  if (future.length) {
    const peak = future.reduce((best, p) => ((p.median ?? p.discharge) > (best.median ?? best.discharge) ? p : best), future[0]);
    output.peakDischarge = peak.median ?? peak.discharge;
    output.peakDate = peak.date;
    if (isFiniteNumber(output.currentDischarge) && output.currentDischarge > 0) {
      output.peakRatio = parseFloat((output.peakDischarge / output.currentDischarge).toFixed(2));
      output.trend = output.peakRatio > 1.25 ? "RISING" : output.peakRatio < 0.9 ? "FALLING" : "STEADY";
    }
  }
  output.dataAvailable = output.series.some(p => isFiniteNumber(p.discharge) || isFiniteNumber(p.median));
  if (output.peakRatio !== null && output.peakRatio >= 2) alertManager.addAlert(`River discharge near this location is forecast to reach ${output.peakRatio} times its current level by ${output.peakDate}.`, "ADVISORY", "FLOOD", "river_discharge_forecast", { peakRatio: output.peakRatio });
  return output;
}

const NHC_CLASSIFICATIONS = { TD: "Tropical Depression", STD: "Subtropical Depression", TS: "Tropical Storm", STS: "Subtropical Storm", HU: "Hurricane", MH: "Major Hurricane", PTC: "Potential Tropical Cyclone", PC: "Post-Tropical Cyclone", TY: "Typhoon" };
const GDACS_TYPES = { EQ: "Earthquake", TC: "Tropical Cyclone", FL: "Flood", VO: "Volcano", WF: "Wildfire", DR: "Drought", TS: "Tsunami" };

async function fetchTropicalAndGlobalHazards(lat, lon, alertManager) {
  const output = { storms: [], events: [], nearestStormKm: null };
  alertManager.registerDataSource("nhc_active_storms", "SAFETY_CRITICAL", "National Hurricane Center active tropical cyclones");
  alertManager.registerDataSource("gdacs_events", "OPERATIONAL", "GDACS global disaster alerts");
  const from = new Date(Date.now() - 14 * ASTRO_DAY_MS).toISOString().slice(0, 10);
  const to = new Date(Date.now() + ASTRO_DAY_MS).toISOString().slice(0, 10);
  const [nhc, gdacs] = await Promise.all([
    makeApiRequestWithBackoff(API_ENDPOINTS.NHC_CURRENT_STORMS, {}, 12000, 1),
    makeApiRequestWithBackoff(`${API_ENDPOINTS.GDACS_EVENT_LIST}?eventlist=EQ;TC;FL;VO;WF;DR&fromdate=${from}&todate=${to}&alertlevel=Green;Orange;Red`, {}, 15000, 1)
  ]);
  if (nhc.status === 200 && nhc.data) {
    alertManager.updateDataSourceStatus("nhc_active_storms", "AVAILABLE", nhc.responseTime);
    for (const s of nhc.data.activeStorms || []) {
      const sLat = toNumber(s.latitudeNumeric);
      const sLon = toNumber(s.longitudeNumeric);
      const distanceKm = sLat !== null && sLon !== null ? Math.round(calculateDistance(lat, lon, sLat, sLon)) : null;
      output.storms.push({ id: s.id, name: s.name, classification: NHC_CLASSIFICATIONS[s.classification] || s.classification, intensityKt: toNumber(s.intensity), pressureMb: toNumber(s.pressure), movement: s.movementDir !== undefined && s.movementSpeed !== undefined ? `${s.movementDir}° at ${s.movementSpeed} mph` : null, distanceKm, bearing: sLat !== null ? bearingBetween(lat, lon, sLat, sLon) : null, lastUpdate: s.lastUpdate || null, advisoryUrl: s.publicAdvisory?.url || null });
    }
    output.storms.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    output.nearestStormKm = output.storms[0]?.distanceKm ?? null;
    for (const s of output.storms) {
      if (s.distanceKm !== null && s.distanceKm < 500) alertManager.addAlert(`${s.classification} ${s.name} is ${s.distanceKm} km from this location.`, s.distanceKm < 250 ? "CRITICAL" : "WARNING", "TROPICAL_CYCLONE", "nhc_active_storms", { distanceKm: s.distanceKm });
      else if (s.distanceKm !== null && s.distanceKm < 1000) alertManager.addAlert(`${s.classification} ${s.name} is ${s.distanceKm} km from this location.`, "ADVISORY", "TROPICAL_CYCLONE", "nhc_active_storms", { distanceKm: s.distanceKm });
    }
  } else {
    alertManager.updateDataSourceStatus("nhc_active_storms", "FAILED", nhc.responseTime, nhc.error || "NHC feed is unavailable.");
  }
  if (gdacs.status === 200 && Array.isArray(gdacs.data?.features)) {
    alertManager.updateDataSourceStatus("gdacs_events", "AVAILABLE", gdacs.responseTime);
    for (const f of gdacs.data.features) {
      const p = f.properties || {};
      const coords = f.geometry?.coordinates;
      if (!Array.isArray(coords) || coords.length < 2) continue;
      const distanceKm = Math.round(calculateDistance(lat, lon, coords[1], coords[0]));
      const level = String(p.alertlevel || "").toUpperCase();
      if (distanceKm > 2500 && level !== "RED") continue;
      output.events.push({ id: `${p.eventtype}_${p.eventid}`, type: GDACS_TYPES[p.eventtype] || p.eventtype, name: p.name || p.eventname || GDACS_TYPES[p.eventtype], alertLevel: level || "GREEN", country: p.country || null, severity: p.severitydata?.severitytext || null, distanceKm, fromDate: p.fromdate || null, isCurrent: String(p.iscurrent).toLowerCase() === "true", reportUrl: p.url?.report || null });
    }
    output.events.sort((a, b) => a.distanceKm - b.distanceKm);
    output.events = output.events.slice(0, 25);
    for (const ev of output.events) {
      if (ev.alertLevel === "RED" && ev.distanceKm < 1000) alertManager.addAlert(`GDACS red alert: ${ev.type} ${ev.name} is ${ev.distanceKm} km away.`, "WARNING", "GLOBAL_HAZARD", "gdacs_events", { distanceKm: ev.distanceKm });
      else if (ev.alertLevel === "ORANGE" && ev.distanceKm < 500) alertManager.addAlert(`GDACS orange alert: ${ev.type} ${ev.name} is ${ev.distanceKm} km away.`, "ADVISORY", "GLOBAL_HAZARD", "gdacs_events", { distanceKm: ev.distanceKm });
    }
  } else {
    alertManager.updateDataSourceStatus("gdacs_events", "FAILED", gdacs.responseTime, gdacs.error || "GDACS feed is unavailable.");
  }
  return output;
}

async function fetchNearestObservation(lat, lon, alertManager) {
  const output = { dataAvailable: false, station: null };
  alertManager.registerDataSource("metar_observation", "OPERATIONAL", "Nearest airport METAR observation from the Aviation Weather Center");
  const box = 1.5;
  const url = `${API_ENDPOINTS.AVIATIONWEATHER_METAR}?bbox=${(lat - box).toFixed(2)},${(lon - box).toFixed(2)},${(lat + box).toFixed(2)},${(lon + box).toFixed(2)}&format=json&hours=2`;
  const res = await makeApiRequestWithBackoff(url, {}, 12000, 1);
  if (res.status !== 200 || !Array.isArray(res.data)) {
    alertManager.updateDataSourceStatus("metar_observation", "FAILED", res.responseTime, res.error || "METAR data is unavailable.");
    return output;
  }
  alertManager.updateDataSourceStatus("metar_observation", "AVAILABLE", res.responseTime);
  const latest = new Map();
  for (const m of res.data) {
    if (!m.icaoId || !isFiniteNumber(m.lat) || !isFiniteNumber(m.lon)) continue;
    const prev = latest.get(m.icaoId);
    if (!prev || (m.obsTime || 0) > (prev.obsTime || 0)) latest.set(m.icaoId, m);
  }
  let best = null;
  for (const m of latest.values()) {
    const dist = calculateDistance(lat, lon, m.lat, m.lon);
    if (!best || dist < best.dist) best = { m, dist };
  }
  if (!best) return output;
  const m = best.m;
  const visibilityMiles = typeof m.visib === "string" ? parseFloat(m.visib.replace("+", "")) : toNumber(m.visib);
  const ceiling = (m.clouds || []).filter(c => ["BKN", "OVC", "OVX"].includes(c.cover) && isFiniteNumber(c.base)).map(c => c.base).sort((a, b) => a - b)[0];
  output.dataAvailable = true;
  output.station = {
    id: m.icaoId,
    name: m.name || m.icaoId,
    distanceKm: parseFloat(best.dist.toFixed(1)),
    observedAt: m.obsTime ? new Date(m.obsTime * 1000).toISOString() : null,
    temperature: toNumber(m.temp),
    dewPoint: toNumber(m.dewp),
    windDirection: m.wdir === "VRB" ? null : toNumber(m.wdir),
    windSpeed: isFiniteNumber(toNumber(m.wspd)) ? parseFloat((toNumber(m.wspd) * 0.514444).toFixed(1)) : null,
    windGust: isFiniteNumber(toNumber(m.wgst)) ? parseFloat((toNumber(m.wgst) * 0.514444).toFixed(1)) : null,
    visibilityKm: isFiniteNumber(visibilityMiles) ? parseFloat((visibilityMiles * 1.609344).toFixed(1)) : null,
    pressure: toNumber(m.altim),
    ceilingFt: ceiling !== undefined ? ceiling : null,
    weather: m.wxString || null,
    flightCategory: m.fltCat || null,
    raw: m.rawOb || null
  };
  return output;
}

async function fetchAuroraVisibility(lat, lon, alertManager) {
  const output = { dataAvailable: false, localProbability: null, horizonProbability: null, observationTime: null, forecastTime: null, isDark: null, sunAltitude: null, outlook: null };
  alertManager.registerDataSource("aurora_ovation", "INFORMATIONAL", "NOAA SWPC OVATION aurora forecast");
  const res = await makeApiRequestWithBackoff(API_ENDPOINTS.SWPC_OVATION, {}, 15000, 1);
  if (res.status !== 200 || !Array.isArray(res.data?.coordinates)) {
    alertManager.updateDataSourceStatus("aurora_ovation", "FAILED", res.responseTime, res.error || "OVATION forecast is unavailable.");
    return output;
  }
  alertManager.updateDataSourceStatus("aurora_ovation", "AVAILABLE", res.responseTime);
  const grid = new Map();
  for (const [gLon, gLat, value] of res.data.coordinates) grid.set(`${gLon}_${gLat}`, value);
  const lookup = (la, lo) => grid.get(`${((Math.round(lo) % 360) + 360) % 360}_${Math.round(la)}`) ?? 0;
  output.localProbability = lookup(lat, lon);
  const direction = lat >= 0 ? 1 : -1;
  let horizon = 0;
  for (let dLat = 0; dLat <= 9; dLat++) {
    for (let dLon = -3; dLon <= 3; dLon++) {
      const la = lat + direction * dLat;
      if (Math.abs(la) > 90) continue;
      horizon = Math.max(horizon, lookup(la, lon + dLon));
    }
  }
  output.horizonProbability = horizon;
  output.observationTime = res.data["Observation Time"] || null;
  output.forecastTime = res.data["Forecast Time"] || null;
  const sunAlt = sunPosition(new Date(), lat, lon).altitude / ASTRO_RAD;
  output.sunAltitude = parseFloat(sunAlt.toFixed(1));
  output.isDark = sunAlt < -12;
  const best = Math.max(output.localProbability, horizon * 0.6);
  output.outlook = !output.isDark ? "TOO BRIGHT" : best >= 50 ? "EXCELLENT" : best >= 25 ? "GOOD" : best >= 10 ? "POSSIBLE" : "UNLIKELY";
  output.dataAvailable = true;
  alertManager.registerDataPoint("aurora_probability", output.localProbability, "%", "aurora_ovation", "INFORMATIONAL");
  if (output.isDark && best >= 25) alertManager.addAlert(`Aurora may be visible tonight with a ${Math.round(best)}% viewing probability.`, "INFO", "AURORA", "aurora_ovation", { local: output.localProbability, horizon });
  return output;
}

async function fetchPrecipitationNowcast(lat, lon, alertManager) {
  const output = { dataAvailable: false, series: [], startsInMinutes: null, endsInMinutes: null, raining: false, totalNext2h: null, peakRateMmH: null, summary: null };
  alertManager.registerDataSource("precipitation_nowcast", "OPERATIONAL", "15-minute precipitation forecast from Open-Meteo");
  const url = `${API_ENDPOINTS.OPEN_METEO_FORECAST}?latitude=${lat}&longitude=${lon}&minutely_15=precipitation,rain,snowfall&forecast_minutely_15=12&past_minutely_15=1&timezone=GMT`;
  const res = await makeApiRequestWithBackoff(url, {}, 10000, 2);
  if (res.status !== 200 || !res.data?.minutely_15) {
    alertManager.updateDataSourceStatus("precipitation_nowcast", "FAILED", res.responseTime, res.error || "Nowcast is unavailable.");
    return output;
  }
  alertManager.updateDataSourceStatus("precipitation_nowcast", "AVAILABLE", res.responseTime);
  const m = res.data.minutely_15;
  const now = Date.now();
  for (let i = 0; i < (m.time || []).length; i++) {
    const t = new Date(`${m.time[i]}Z`).getTime();
    const amount = toNumber(m.precipitation?.[i]) ?? 0;
    output.series.push({ time: new Date(t).toISOString(), minutesFromNow: Math.round((t - now) / 60000), precipitation: amount, rateMmH: parseFloat((amount * 4).toFixed(2)), snowfall: toNumber(m.snowfall?.[i]) ?? 0 });
  }
  output.series = output.series.filter(p => p.minutesFromNow > -15).slice(0, 9);
  const wet = (p) => p.precipitation >= 0.1;
  output.raining = output.series.length > 0 && wet(output.series[0]);
  if (output.raining) {
    const dry = output.series.find(p => !wet(p));
    output.endsInMinutes = dry ? Math.max(0, dry.minutesFromNow) : null;
  } else {
    const first = output.series.find(wet);
    output.startsInMinutes = first ? Math.max(0, first.minutesFromNow) : null;
  }
  output.totalNext2h = parseFloat(output.series.reduce((s, p) => s + p.precipitation, 0).toFixed(1));
  output.peakRateMmH = output.series.length ? Math.max(...output.series.map(p => p.rateMmH)) : null;
  const snowing = output.series.some(p => p.snowfall > 0);
  const kind = snowing ? "Snow" : "Rain";
  if (output.raining) output.summary = output.endsInMinutes !== null ? `${kind} is falling now and should stop in about ${output.endsInMinutes} minutes.` : `${kind} is falling now and should continue for at least 2 hours.`;
  else if (output.startsInMinutes !== null) output.summary = `${kind} is expected to start in about ${output.startsInMinutes} minutes.`;
  else output.summary = "No precipitation is expected in the next 2 hours.";
  output.dataAvailable = output.series.length > 0;
  if (!output.raining && output.startsInMinutes !== null && output.startsInMinutes <= 30 && output.peakRateMmH >= 2) alertManager.addAlert(output.summary, "ADVISORY", "NOWCAST", "precipitation_nowcast", { startsInMinutes: output.startsInMinutes });
  return output;
}

const AGREEMENT_MODELS = [["ecmwf_ifs025", "ECMWF IFS"], ["gfs_seamless", "NOAA GFS"], ["icon_seamless", "DWD ICON"], ["gem_seamless", "Canada GEM"]];

async function fetchModelAgreement(lat, lon, alertManager) {
  const output = { dataAvailable: false, models: [], spreadSeries: [], meanSpread24h: null, meanSpread72h: null, confidence: null, precipitationAgreement: null };
  alertManager.registerDataSource("model_agreement", "INFORMATIONAL", "Multi-model forecast comparison from Open-Meteo");
  const models = AGREEMENT_MODELS.map(m => m[0]).join(",");
  const url = `${API_ENDPOINTS.OPEN_METEO_FORECAST}?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation,wind_speed_10m&models=${models}&forecast_days=3&wind_speed_unit=ms&timezone=GMT`;
  const res = await makeApiRequestWithBackoff(url, {}, 15000, 1);
  if (res.status !== 200 || !res.data?.hourly) {
    alertManager.updateDataSourceStatus("model_agreement", "FAILED", res.responseTime, res.error || "Model comparison is unavailable.");
    return output;
  }
  alertManager.updateDataSourceStatus("model_agreement", "AVAILABLE", res.responseTime);
  const h = res.data.hourly;
  const times = h.time || [];
  const nowHour = new Date().toISOString().slice(0, 13);
  const startIdx = Math.max(0, times.findIndex(t => t.slice(0, 13) >= nowHour));
  for (const [key, label] of AGREEMENT_MODELS) {
    const temps = (h[`temperature_2m_${key}`] || []).slice(startIdx, startIdx + 72).map(toNumber);
    const precip = (h[`precipitation_${key}`] || []).slice(startIdx, startIdx + 72).map(toNumber);
    const wind = (h[`wind_speed_10m_${key}`] || []).slice(startIdx, startIdx + 72).map(toNumber);
    const valid = temps.filter(isFiniteNumber);
    if (!valid.length) continue;
    output.models.push({ key, label, high24h: Math.max(...temps.slice(0, 24).filter(isFiniteNumber)), low24h: Math.min(...temps.slice(0, 24).filter(isFiniteNumber)), precip72h: parseFloat(precip.filter(isFiniteNumber).reduce((a, b) => a + b, 0).toFixed(1)), maxWind72h: wind.filter(isFiniteNumber).length ? parseFloat(Math.max(...wind.filter(isFiniteNumber)).toFixed(1)) : null, temps });
  }
  if (output.models.length < 2) return output;
  for (let i = 0; i < 72; i++) {
    const values = output.models.map(m => m.temps[i]).filter(isFiniteNumber);
    if (values.length < 2 || !times[startIdx + i]) continue;
    output.spreadSeries.push({ time: `${times[startIdx + i]}:00Z`, spread: parseFloat((Math.max(...values) - Math.min(...values)).toFixed(2)), mean: parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)) });
  }
  const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
  output.meanSpread24h = parseFloat((mean(output.spreadSeries.slice(0, 24).map(p => p.spread)) ?? 0).toFixed(2));
  output.meanSpread72h = parseFloat((mean(output.spreadSeries.map(p => p.spread)) ?? 0).toFixed(2));
  output.confidence = output.meanSpread72h < 1.5 ? "HIGH" : output.meanSpread72h < 3 ? "MODERATE" : "LOW";
  const wetModels = output.models.filter(m => m.precip72h >= 1).length;
  output.precipitationAgreement = wetModels === 0 ? "ALL DRY" : wetModels === output.models.length ? "ALL WET" : "SPLIT";
  output.models = output.models.map(({ temps, ...rest }) => ({ ...rest, high24h: parseFloat(rest.high24h.toFixed(1)), low24h: parseFloat(rest.low24h.toFixed(1)) }));
  output.dataAvailable = true;
  alertManager.registerDataPoint("model_temperature_spread", output.meanSpread72h, "C", "model_agreement", "INFORMATIONAL");
  return output;
}

async function fetchClimateNormals(lat, lon, alertManager) {
  const output = { dataAvailable: false, date: null, normalHigh: null, normalLow: null, normalPrecip: null, recordHigh: null, recordHighYear: null, recordLow: null, recordLowYear: null, forecastHigh: null, forecastLow: null, highDeparture: null, lowDeparture: null, yearsOfRecord: null };
  alertManager.registerDataSource("climate_normals", "INFORMATIONAL", "ERA5 reanalysis climate normals and records from Open-Meteo");
  const forecast = await makeApiRequestWithBackoff(`${API_ENDPOINTS.OPEN_METEO_FORECAST}?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min&forecast_days=1&timezone=auto`, {}, 10000, 2);
  const todayLocal = forecast.data?.daily?.time?.[0] || new Date().toISOString().slice(0, 10);
  output.date = todayLocal;
  output.forecastHigh = toNumber(forecast.data?.daily?.temperature_2m_max?.[0]);
  output.forecastLow = toNumber(forecast.data?.daily?.temperature_2m_min?.[0]);
  const history = await withLongCache(`climate_${roundCoord(lat)}_${roundCoord(lon)}`, 24 * 3600000, async () => {
    const end = new Date(Date.now() - 6 * ASTRO_DAY_MS).toISOString().slice(0, 10);
    const res = await makeApiRequestWithBackoff(`${API_ENDPOINTS.OPEN_METEO_ARCHIVE}?latitude=${lat}&longitude=${lon}&start_date=1940-01-01&end_date=${end}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`, {}, 60000, 1);
    return res.status === 200 && res.data?.daily?.time ? res.data.daily : null;
  });
  if (!history) {
    alertManager.updateDataSourceStatus("climate_normals", "FAILED", 0, "Historical archive is unavailable.");
    return output;
  }
  alertManager.updateDataSourceStatus("climate_normals", "AVAILABLE", 0);
  const monthDay = todayLocal.slice(5, 10);
  const target = new Date(`2001-${monthDay}T00:00:00Z`);
  const dayOfYear = (md) => Math.round((new Date(`2001-${md}T00:00:00Z`) - new Date("2001-01-01T00:00:00Z")) / ASTRO_DAY_MS);
  const targetDoy = monthDay === "02-29" ? dayOfYear("02-28") : Math.round((target - new Date("2001-01-01T00:00:00Z")) / ASTRO_DAY_MS);
  const highs = [];
  const lows = [];
  const precip = [];
  const years = new Set();
  for (let i = 0; i < history.time.length; i++) {
    const t = history.time[i];
    const year = parseInt(t.slice(0, 4));
    const md = t.slice(5, 10);
    const tmax = toNumber(history.temperature_2m_max[i]);
    const tmin = toNumber(history.temperature_2m_min[i]);
    if (md === monthDay) {
      years.add(year);
      if (tmax !== null && (output.recordHigh === null || tmax > output.recordHigh)) { output.recordHigh = tmax; output.recordHighYear = year; }
      if (tmin !== null && (output.recordLow === null || tmin < output.recordLow)) { output.recordLow = tmin; output.recordLowYear = year; }
    }
    if (year >= 1991 && year <= 2020 && md !== "02-29") {
      let diff = Math.abs(dayOfYear(md) - targetDoy);
      diff = Math.min(diff, 365 - diff);
      if (diff <= 7) {
        if (tmax !== null) highs.push(tmax);
        if (tmin !== null) lows.push(tmin);
        const p = toNumber(history.precipitation_sum[i]);
        if (p !== null) precip.push(p);
      }
    }
  }
  const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
  const round1 = (v) => (v !== null ? parseFloat(v.toFixed(1)) : null);
  output.normalHigh = round1(avg(highs));
  output.normalLow = round1(avg(lows));
  output.normalPrecip = avg(precip) !== null ? parseFloat(avg(precip).toFixed(2)) : null;
  output.highDeparture = output.forecastHigh !== null && output.normalHigh !== null ? round1(output.forecastHigh - output.normalHigh) : null;
  output.lowDeparture = output.forecastLow !== null && output.normalLow !== null ? round1(output.forecastLow - output.normalLow) : null;
  output.yearsOfRecord = years.size;
  output.dataAvailable = output.normalHigh !== null;
  if (output.forecastHigh !== null && output.recordHigh !== null && output.forecastHigh >= output.recordHigh) alertManager.addAlert(`Today's forecast high of ${output.forecastHigh}°C would tie or break the ${output.recordHighYear} record of ${output.recordHigh}°C.`, "ADVISORY", "RECORD", "climate_normals", {});
  if (output.forecastLow !== null && output.recordLow !== null && output.forecastLow <= output.recordLow) alertManager.addAlert(`Today's forecast low of ${output.forecastLow}°C would tie or break the ${output.recordLowYear} record of ${output.recordLow}°C.`, "ADVISORY", "RECORD", "climate_normals", {});
  return output;
}

async function searchLocations(query) {
  const url = `${API_ENDPOINTS.OPEN_METEO_GEOCODING}?name=${encodeURIComponent(query)}&count=8&language=en&format=json`;
  const res = await makeApiRequestWithBackoff(url, {}, 8000, 1);
  if (res.status !== 200) return null;
  return (res.data?.results || []).map(r => ({
    name: r.name,
    label: [r.name, r.admin1, r.country].filter(Boolean).join(", "),
    latitude: r.latitude,
    longitude: r.longitude,
    country: r.country || null,
    timezone: r.timezone || null
  }));
}

const INTERPRETATION_CACHE = new Map();
const INTERPRETATION_CACHE_LIMIT = 3000;
const INTERPRETATION_CHUNK_SIZE = 15;

const INTERPRETATION_INSTRUCTIONS = "You write the interpretive description shown beneath each panel of a live environmental conditions dashboard. For each panel you receive its title, a reference description of what the panel measures, and the values it is currently displaying. Write one paragraph of 3 to 5 complete sentences, never fewer than 3, that interprets the current values for someone at the given location: explain what the numbers mean right now, point out anything notable, unusual, or near a threshold, and give a practical implication when there is one. Use only the values provided, never invent data, and keep units as given. If the panel shows no data, say briefly that no data is currently available and what the panel would show. Do not use markdown, lists, headings, or quotation marks around the paragraph. Every sentence must be complete and end with punctuation.";

function interpretationRefreshMs() {
  const minutes = parseInt(envValue(API_KEY_ENV.interpretationRefreshMinutes) || "30", 10);
  return Math.max(1, isFinite(minutes) ? minutes : 30) * 60000;
}

function sentenceCount(text) {
  return (String(text || "").trim().match(/[.!?](?=\s|$)/g) || []).length;
}

async function requestGeminiInterpretations(location, panels, strict = false) {
  const apiKey = envValue(API_KEY_ENV.gemini);
  const model = envValue(API_KEY_ENV.geminiModel) || DEFAULT_GEMINI_MODEL;
  const payload = {
    location: location?.label ? `${location.label} (${location.latitude}, ${location.longitude})` : `${location?.latitude}, ${location?.longitude}`,
    panels: panels.map((p, index) => ({ id: String(index), title: p.title, reference: p.reference, currentValues: p.content }))
  };
  const response = await axios.post(`${API_ENDPOINTS.GEMINI_GENERATE}${encodeURIComponent(model)}:generateContent`, {
    systemInstruction: { parts: [{ text: strict ? `${INTERPRETATION_INSTRUCTIONS} A previous attempt returned paragraphs that were too short. Each paragraph must contain at least 3 full sentences.` : INTERPRETATION_INSTRUCTIONS }] },
    contents: [{ role: "user", parts: [{ text: JSON.stringify(payload) }] }],
    generationConfig: {
      temperature: 0.4,
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: { interpretations: { type: "ARRAY", items: { type: "OBJECT", properties: { id: { type: "STRING" }, text: { type: "STRING" } }, required: ["id", "text"] } } },
        required: ["interpretations"]
      }
    }
  }, { headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey }, timeout: 60000 });
  const text = response.data?.candidates?.[0]?.content?.parts?.map(part => part.text || "").join("") || "";
  const parsed = JSON.parse(text);
  const byId = new Map((parsed.interpretations || []).map(item => [String(item.id), String(item.text || "").trim()]));
  return panels.map((p, index) => {
    const value = byId.get(String(index));
    return value && sentenceCount(value) >= 2 ? value : null;
  });
}

async function generateInterpretations(location, panels) {
  const now = Date.now();
  const refreshMs = interpretationRefreshMs();
  const locationKey = `${roundCoord(Number(location?.latitude) || 0, 0.01)}_${roundCoord(Number(location?.longitude) || 0, 0.01)}`;
  const results = {};
  const pending = [];
  for (const panel of panels) {
    const cacheKey = `${locationKey}|${panel.key}`;
    const hash = crypto.createHash("sha1").update(`${panel.title}|${panel.content}`).digest("hex");
    const cached = INTERPRETATION_CACHE.get(cacheKey);
    if (cached && (cached.hash === hash || now - cached.time < refreshMs)) {
      results[panel.key] = cached.text;
      continue;
    }
    pending.push({ ...panel, cacheKey, hash });
  }
  const chunks = [];
  for (let i = 0; i < pending.length; i += INTERPRETATION_CHUNK_SIZE) chunks.push(pending.slice(i, i + INTERPRETATION_CHUNK_SIZE));
  const failures = [];
  await Promise.all(chunks.map(async chunk => {
    try {
      const texts = await requestGeminiInterpretations(location, chunk);
      const retryIndexes = texts.map((text, index) => (text ? null : index)).filter(index => index !== null);
      if (retryIndexes.length) {
        const retried = await requestGeminiInterpretations(location, retryIndexes.map(index => chunk[index]), true).catch(() => []);
        retryIndexes.forEach((chunkIndex, retryIndex) => { if (retried[retryIndex]) texts[chunkIndex] = retried[retryIndex]; });
      }
      chunk.forEach((panel, index) => {
        const text = texts[index];
        if (!text) return;
        INTERPRETATION_CACHE.set(panel.cacheKey, { hash: panel.hash, text, time: Date.now() });
        results[panel.key] = text;
      });
    } catch (error) {
      failures.push(error.response?.data?.error?.message || error.message);
    }
  }));
  while (INTERPRETATION_CACHE.size > INTERPRETATION_CACHE_LIMIT) INTERPRETATION_CACHE.delete(INTERPRETATION_CACHE.keys().next().value);
  return { results, failures };
}

const NMDB_HELP_URL = API_ENDPOINTS.NMDB_HELP;

async function fetchNmdbStationCatalog() {
  return withLongCache("nmdb_station_catalog", 24 * 3600000, async () => {
    const res = await makeApiRequestWithBackoff(NMDB_HELP_URL, {}, 20000, 1);
    if (res.status !== 200 || typeof res.data !== "string") return null;
    const text = res.data.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");
    const catalog = {};
    for (const match of text.matchAll(/\b([A-Z][A-Z0-9]{2,5})\s*=\s*([^=()|]+?)\s*\(R=([\d.]*),\s*Alt=(-?[\d.]*)\s*m\)/g)) {
      const cutoff = parseFloat(match[3]);
      if (!isFinite(cutoff)) continue;
      catalog[match[1]] = { name: match[2].trim(), cutoff, altitude: isFinite(parseFloat(match[4])) ? parseFloat(match[4]) : null };
    }
    return Object.keys(catalog).length ? catalog : null;
  });
}

async function fetchNmdbActiveStations() {
  const res = await makeApiRequestWithBackoff(API_ENDPOINTS.NMDB_REALTIME, {}, 15000, 1);
  const active = new Set();
  if (res.status === 200 && typeof res.data === "string") {
    for (const line of res.data.split("\n")) {
      const parts = line.trim().split(";");
      if (parts.length >= 3 && /^\d{4}-\d{2}-\d{2}/.test(parts[0]) && isFinite(parseFloat(parts[2]))) active.add(parts[1].trim().toUpperCase());
    }
  }
  return active;
}

function estimateVerticalCutoffRigidity(lat, lon) {
  const toRad = Math.PI / 180;
  const poleLat = 80.8 * toRad;
  const poleLon = -72.7 * toRad;
  const sinMagLat = Math.sin(lat * toRad) * Math.sin(poleLat) + Math.cos(lat * toRad) * Math.cos(poleLat) * Math.cos(lon * toRad - poleLon);
  const magLat = Math.asin(Math.max(-1, Math.min(1, sinMagLat)));
  return parseFloat((14.5 * Math.pow(Math.cos(magLat), 4)).toFixed(2));
}

function parseNmdbAscii(text, codes) {
  const known = new Set(codes);
  const series = Object.fromEntries(codes.map(code => [code, []]));
  const lines = String(text || "").replace(/<[^>]*>/g, "\n").split(/\r?\n/);
  let columns = null;
  for (const line of lines) {
    if (/^\s*\d{4}-\d{2}-\d{2}/.test(line)) continue;
    const tokens = line.trim().split(/[;\s]+/).map(token => token.toUpperCase());
    const found = tokens.filter(token => known.has(token));
    if (found.length) {
      columns = found;
      break;
    }
  }
  if (!columns) return series;
  for (const line of lines) {
    const match = line.match(/^\s*(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2})?)/);
    if (!match) continue;
    const timestamp = `${match[1]} ${match[2]}`;
    const values = line.slice(line.indexOf(match[2]) + match[2].length).split(/[;\s]+/).filter(token => token !== "");
    columns.forEach((code, index) => {
      const raw = String(values[index] ?? "").replace(",", ".");
      const value = parseFloat(raw);
      if (raw !== "" && isFinite(value) && value >= 0) series[code].push({ timestamp, value });
    });
  }
  for (const code of Object.keys(series)) {
    const hours = new Map();
    for (const point of series[code]) {
      const hour = `${String(point.timestamp).slice(0, 13)}:00:00`;
      const bucket = hours.get(hour) || { sum: 0, count: 0 };
      bucket.sum += point.value;
      bucket.count += 1;
      hours.set(hour, bucket);
    }
    series[code] = [...hours.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([timestamp, bucket]) => ({ timestamp, value: bucket.sum / bucket.count }));
  }
  return series;
}

async function overviewSystem(lat, lon) {
  
  const startTime = Date.now();
  const alertManager = new AlertManager();
  
  const result = {
    status: "NO_DATA",
    timestamp: new Date().toISOString(),
    conditionsStatus: "UNKNOWN",
    riskQuant: null,
    dataTrust: null,
    bigBoard: { color: "GRAY", message: "INITIALIZING" },
    systemHeartbeat: {},
    conditionsDecision: { status: "UNKNOWN", confidence: 0, primaryReason: "Processing", category: "INITIALIZING" },
    violations: [],
    alerts: [],
    alertManager: null,
    historicalWeather: { timeSeries: [], statistics: {} },
    historicalSpaceWeather: { timeSeries: [], statistics: {} },
    orbitalEnvironment: { status: "PENDING", catalogData: {}, overheadAnalysis: {}, historicalTracking: [] }
  };
  
  const calcStdDev = (arr) => {
    if (arr.length < 2) return null;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const variance = arr.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / arr.length;
    return Math.sqrt(variance);
  };
  
  try {
    alertManager.registerDataSource("surface_weather", "PRIMARY", "Surface weather from Open-Meteo");
    alertManager.registerDataSource("historical_weather", "OPERATIONAL", "30-day historical weather data");
    alertManager.registerDataSource("space_weather_kp", "SAFETY_CRITICAL", "Geomagnetic Kp index from SWPC");
    alertManager.registerDataSource("space_weather_protons", "SAFETY_CRITICAL", "Solar proton flux from GOES");
    alertManager.registerDataSource("space_weather_electrons", "OPERATIONAL", "Solar electron flux from GOES");
    alertManager.registerDataSource("space_weather_xrays", "OPERATIONAL", "Solar X-ray flux from GOES");
    alertManager.registerDataSource("solar_wind", "OPERATIONAL", "Solar wind parameters from SWPC");
    alertManager.registerDataSource("dst_index", "OPERATIONAL", "Dst geomagnetic index");
    alertManager.registerDataSource("f107_flux", "INFORMATIONAL", "F10.7 solar radio flux");
    alertManager.registerDataSource("marine_conditions", "OPERATIONAL", "Marine conditions");
    alertManager.registerDataSource("solar_cycle", "INFORMATIONAL", "Solar cycle data");
    alertManager.registerDataSource("satellite_catalog", "INFORMATIONAL", "Satellite catalog from AMSAT TLE");
    alertManager.registerDataSource("space_station_tracking", "INFORMATIONAL", "Space station tracking from AMSAT TLE");
    
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 30);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    const historicalUrl = `${API_ENDPOINTS.OPEN_METEO_ARCHIVE}?latitude=${lat}&longitude=${lon}&start_date=${startDateStr}&end_date=${endDateStr}&hourly=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation,cloud_cover,weather_code&timezone=UTC`;
    const historicalRes = await makeApiRequestWithBackoff(historicalUrl, {}, 20000, 2);
    
    if (historicalRes.status === 200 && historicalRes.data?.hourly) {
      alertManager.updateDataSourceStatus("historical_weather", "AVAILABLE", historicalRes.responseTime);
      const h = historicalRes.data.hourly;
      const timeSeriesData = [];
      
      for (let i = 0; i < (h.time?.length || 0); i++) {
        timeSeriesData.push({
          timestamp: h.time[i],
          temperature: h.temperature_2m?.[i] ?? null,
          humidity: h.relative_humidity_2m?.[i] ?? null,
          pressure: h.surface_pressure?.[i] ?? null,
          windSpeed: h.wind_speed_10m?.[i] ?? null,
          windDirection: h.wind_direction_10m?.[i] ?? null,
          windGusts: h.wind_gusts_10m?.[i] ?? null,
          visibility: null,
          precipitation: h.precipitation?.[i] ?? null,
          cloudCover: h.cloud_cover?.[i] ?? null,
          weatherCode: h.weather_code?.[i] ?? null
        });
      }
      
      result.historicalWeather.timeSeries = timeSeriesData;
      alertManager.registerHistoricalData("historical_weather", timeSeriesData);
      
      const windSpeeds = timeSeriesData.filter(d => d.windSpeed !== null && !isNaN(d.windSpeed)).map(d => d.windSpeed);
      const temperatures = timeSeriesData.filter(d => d.temperature !== null && !isNaN(d.temperature)).map(d => d.temperature);
      const pressures = timeSeriesData.filter(d => d.pressure !== null && !isNaN(d.pressure)).map(d => d.pressure);
      const humidityData = timeSeriesData.filter(d => d.humidity !== null && !isNaN(d.humidity)).map(d => d.humidity);
      const cloudData = timeSeriesData.filter(d => d.cloudCover !== null && !isNaN(d.cloudCover)).map(d => d.cloudCover);
      const gustData = timeSeriesData.filter(d => d.windGusts !== null && !isNaN(d.windGusts)).map(d => d.windGusts);
      
      if (windSpeeds.length > 0) {
        result.historicalWeather.statistics.windSpeed = {
          min: Math.min(...windSpeeds),
          max: Math.max(...windSpeeds),
          mean: windSpeeds.reduce((a, b) => a + b, 0) / windSpeeds.length,
          stdDev: calcStdDev(windSpeeds)
        };
        
        if (result.historicalWeather.statistics.windSpeed.stdDev > 5) {
          alertManager.addAlert("Historical wind data shows high variability.", "INFO", "WEATHER", "historical_weather", 
            { stdDev: result.historicalWeather.statistics.windSpeed.stdDev });
        }
      }
      
      if (temperatures.length > 0) {
        result.historicalWeather.statistics.temperature = {
          min: Math.min(...temperatures),
          max: Math.max(...temperatures),
          mean: temperatures.reduce((a, b) => a + b, 0) / temperatures.length,
          stdDev: calcStdDev(temperatures)
        };
      }
      
      if (pressures.length > 0) {
        result.historicalWeather.statistics.pressure = {
          min: Math.min(...pressures),
          max: Math.max(...pressures),
          mean: pressures.reduce((a, b) => a + b, 0) / pressures.length,
          stdDev: calcStdDev(pressures)
        };
      }
      
      if (humidityData.length > 0) {
        result.historicalWeather.statistics.humidity = {
          min: Math.min(...humidityData),
          max: Math.max(...humidityData),
          mean: humidityData.reduce((a, b) => a + b, 0) / humidityData.length,
          stdDev: calcStdDev(humidityData)
        };
      }
      
      if (cloudData.length > 0) {
        const averageCloudCover = cloudData.reduce((a, b) => a + b, 0) / cloudData.length;
        result.historicalWeather.statistics.cloudCover = {
          min: Math.min(...cloudData),
          max: Math.max(...cloudData),
          mean: averageCloudCover,
          stdDev: calcStdDev(cloudData)
        };
        
        alertManager.registerDataPoint("cloud_cover_optical", averageCloudCover, "percent", "historical_weather", "INFORMATIONAL");
      }
      
      if (gustData.length > 0) {
        result.historicalWeather.statistics.windGusts = {
          min: Math.min(...gustData),
          max: Math.max(...gustData),
          mean: gustData.reduce((a, b) => a + b, 0) / gustData.length,
          stdDev: calcStdDev(gustData)
        };
      }
      
      const stormEvents = timeSeriesData.filter(d => d.weatherCode !== null && [95, 96, 99].includes(d.weatherCode)).length;
      if (stormEvents > 0) {
        alertManager.addAlert(`${stormEvents} thunderstorm events in historical data`, "INFO", "WEATHER", "historical_weather",
          { stormEvents, analysisWindow: "30 Days" });
      }
      
      const stabilityValues = [];
      for (let i = 1; i < timeSeriesData.length; i++) {
        const curr = timeSeriesData[i];
        const prev = timeSeriesData[i - 1];
        if (curr.temperature !== null && prev.temperature !== null && curr.windSpeed !== null) {
          const tempGradient = curr.temperature - prev.temperature;
          const stability = curr.windSpeed > 0 ? Math.max(0, Math.min(1, 0.5 + (tempGradient / 10))) : 0.5;
          stabilityValues.push(stability);
        }
      }
      
      if (stabilityValues.length > 0) {
        const averageStability = stabilityValues.reduce((a, b) => a + b, 0) / stabilityValues.length;
        alertManager.registerDataPoint("historical_stability_index", averageStability, "index", "historical_weather", "INFORMATIONAL");
      }
      
    } else {
      alertManager.updateDataSourceStatus("historical_weather", "FAILED", historicalRes.responseTime, historicalRes.error || "Historical weather is unavailable.");
    }
    
    const surfaceUrl = `${API_ENDPOINTS.OPEN_METEO_FORECAST}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility,dew_point_2m,weather_code&wind_speed_unit=ms&timezone=UTC`;
    const surfaceRes = await makeApiRequestWithBackoff(surfaceUrl, {}, 10000, 2);
    
    if (surfaceRes.status === 200 && surfaceRes.data?.current) {
      alertManager.updateDataSourceStatus("surface_weather", "AVAILABLE", surfaceRes.responseTime);
      const cur = surfaceRes.data.current;
      
      alertManager.registerDataPoint("surface_wind_speed", cur.wind_speed_10m, "m/s", "surface_weather", "PRIMARY");
      alertManager.registerDataPoint("surface_wind_direction", cur.wind_direction_10m, "deg", "surface_weather", "OPERATIONAL");
      alertManager.registerDataPoint("surface_wind_gusts", cur.wind_gusts_10m, "m/s", "surface_weather", "SAFETY_CRITICAL");
      alertManager.registerDataPoint("surface_temperature", cur.temperature_2m, "C", "surface_weather", "INFORMATIONAL");
      alertManager.registerDataPoint("surface_humidity", cur.relative_humidity_2m, "%", "surface_weather", "INFORMATIONAL");
      alertManager.registerDataPoint("surface_pressure", cur.surface_pressure, "hPa", "surface_weather", "INFORMATIONAL");
      alertManager.registerDataPoint("surface_visibility", cur.visibility, "m", "surface_weather", "SAFETY_CRITICAL");
      
      result.systemHeartbeat["surface_weather"] = "OPERATIONAL";
      
      if ([95, 96, 99].includes(cur.weather_code)) {
        alertManager.addAlert("An active thunderstorm is present at this location.", "CRITICAL", "WEATHER", "surface_weather", { weatherCode: cur.weather_code });
      } else if ([80, 81, 82].includes(cur.weather_code)) {
        alertManager.addAlert("Heavy precipitation has been detected.", "WARNING", "WEATHER", "surface_weather", { weatherCode: cur.weather_code });
      } else if ([61, 63, 65, 66, 67].includes(cur.weather_code)) {
        alertManager.addAlert("Rain is falling at this location.", "ADVISORY", "WEATHER", "surface_weather", { weatherCode: cur.weather_code });
      } else if ([51, 53, 55, 56, 57].includes(cur.weather_code)) {
        alertManager.addAlert("Drizzle is present.", "INFO", "WEATHER", "surface_weather", { weatherCode: cur.weather_code });
      }
    } else {
      alertManager.updateDataSourceStatus("surface_weather", "FAILED", surfaceRes.responseTime, surfaceRes.error || "No data was received.");
      result.systemHeartbeat["surface_weather"] = "FAILED";
    }
    
    const kpUrl = API_ENDPOINTS.SWPC_KP_3HOUR;
    const kpRes = await makeApiRequestWithBackoff(kpUrl, {}, 5000, 2);
    let currentKp = null;
    let kpHistory = [];
    
    if (kpRes.status === 200 && Array.isArray(kpRes.data) && kpRes.data.length > 1) {
      for (let i = 1; i < kpRes.data.length; i++) {
        const entry = kpRes.data[i];
        if (Array.isArray(entry) && entry.length >= 2) {
          const timestamp = entry[0];
          const rawKp = entry[1];
          const kpValue = typeof rawKp === 'string' ? parseFloat(rawKp) : rawKp;
          
          if (timestamp && !isNaN(kpValue) && kpValue >= 0 && kpValue <= 9) {
            kpHistory.push({ timestamp, value: kpValue });
          }
        }
      }
      
      if (kpHistory.length > 0) {
        currentKp = kpHistory[kpHistory.length - 1].value;
        alertManager.updateDataSourceStatus("space_weather_kp", "AVAILABLE", kpRes.responseTime);
        alertManager.registerDataPoint("kp_index", currentKp, "", "space_weather_kp", "SAFETY_CRITICAL");
        result.historicalSpaceWeather.timeSeries = kpHistory;
        alertManager.registerHistoricalData("kp_index_history", kpHistory);
        
        const kpValues = kpHistory.map(d => d.value);
        result.historicalSpaceWeather.statistics.kpIndex = {
          min: Math.min(...kpValues),
          max: Math.max(...kpValues),
          mean: kpValues.reduce((a, b) => a + b, 0) / kpValues.length,
          current: currentKp,
          dataPoints: kpValues.length
        };
        
        const recentHighKpEvents = kpHistory.filter(d => d.value >= 5).length;
        if (recentHighKpEvents > 0) {
          alertManager.addAlert(`${recentHighKpEvents} recent Kp>=5 events detected`, "INFO", "SPACE_WEATHER", "space_weather_kp",
            { highKpEvents: recentHighKpEvents });
        }
      } else {
        alertManager.updateDataSourceStatus("space_weather_kp", "FAILED", kpRes.responseTime, "Kp data format unrecognized or no valid values");
        result.systemHeartbeat["space_weather"] = "FAILED";
      }
    } else {
      alertManager.updateDataSourceStatus("space_weather_kp", "FAILED", kpRes.responseTime, kpRes.error || "Geomagnetic data is unavailable.");
      result.systemHeartbeat["space_weather"] = "FAILED";
    }
    
    const solarCycleRes = await makeApiRequestWithBackoff(API_ENDPOINTS.SWPC_SOLAR_CYCLE, {}, 5000, 1);
    
    if (solarCycleRes.status === 200 && Array.isArray(solarCycleRes.data) && solarCycleRes.data.length > 0) {
      const solarCycleTimeSeries = [];
      
      for (const entry of solarCycleRes.data) {
        if (entry) {
          const timestamp = entry["time-tag"] || entry.time_tag || entry.timeyear || entry.date || null;
          const ssnRaw = entry.ssn ?? entry.SSN ?? entry.sunspot_number ?? null;
          const ssn = ssnRaw !== null ? parseFloat(ssnRaw) : NaN;
          
          if (timestamp && !isNaN(ssn) && ssn >= 0) {
            const f107Raw = entry["f10.7"] ?? entry.f107 ?? entry["F10.7"] ?? null;
            solarCycleTimeSeries.push({
              timestamp: timestamp,
              sunspotNumber: ssn,
              f107: f107Raw !== null ? parseFloat(f107Raw) : null
            });
          }
        }
      }
      
      if (solarCycleTimeSeries.length > 0) {
        alertManager.updateDataSourceStatus("solar_cycle", "AVAILABLE", solarCycleRes.responseTime);
        const recentEntries = solarCycleTimeSeries.slice(-365);
        alertManager.registerHistoricalData("solar_cycle_history", recentEntries);
        const recentSSN = solarCycleTimeSeries[solarCycleTimeSeries.length - 1].sunspotNumber;
        
        if (recentSSN > 150) {
          alertManager.addAlert(`High solar activity: ${recentSSN} sunspots`, "INFO", "SPACE_WEATHER", "solar_cycle",
            { sunspotNumber: recentSSN });
        }
      } else {
        alertManager.updateDataSourceStatus("solar_cycle", "FAILED", solarCycleRes.responseTime, "No valid solar cycle data found in response");
      }
    } else {
      alertManager.updateDataSourceStatus("solar_cycle", "DEGRADED", solarCycleRes.responseTime, solarCycleRes.error || "Solar cycle data is unavailable.");
    }
    
    let protonFlux10 = null, protonFlux50 = null, protonFlux100 = null;
    const protonRes = await makeApiRequestWithBackoff(API_ENDPOINTS.SWPC_PROTONS, {}, 5000, 2);
    const protonTimeSeries = { p10: [], p50: [], p100: [] };
    
    if (protonRes.status === 200 && Array.isArray(protonRes.data) && protonRes.data.length > 0) {
      const p10Data = [];
      const p50Data = [];
      const p100Data = [];
      
      for (const entry of protonRes.data) {
        if (!entry || !entry.time_tag) continue;
        const timestamp = entry.time_tag;
        const flux = parseFloat(entry.flux);
        
        if (isNaN(flux) || flux < 0) continue;
        
        if (entry.energy === ">=10 MeV" || entry.energy === ">=10MeV") {
          p10Data.push({ timestamp, value: flux });
        } else if (entry.energy === ">=50 MeV" || entry.energy === ">=50MeV") {
          p50Data.push({ timestamp, value: flux });
        } else if (entry.energy === ">=100 MeV" || entry.energy === ">=100MeV") {
          p100Data.push({ timestamp, value: flux });
        }
      }
      
      if (p10Data.length > 0) {
        protonFlux10 = p10Data[p10Data.length - 1].value;
        alertManager.updateDataSourceStatus("space_weather_protons", "AVAILABLE", protonRes.responseTime);
        alertManager.registerDataPoint("proton_flux_10mev", protonFlux10, "pfu", "space_weather_protons", "SAFETY_CRITICAL");
        
        for (const reading of p10Data) {
          protonTimeSeries.p10.push({ timestamp: reading.timestamp, value: reading.value });
        }
        alertManager.registerHistoricalData("proton_flux_10mev_history", protonTimeSeries.p10);
      } else {
        alertManager.updateDataSourceStatus("space_weather_protons", "FAILED", protonRes.responseTime, "No valid proton flux data");
      }
      
      if (p50Data.length > 0) {
        protonFlux50 = p50Data[p50Data.length - 1].value;
        alertManager.registerDataPoint("proton_flux_50mev", protonFlux50, "pfu", "space_weather_protons", "SAFETY_CRITICAL");
        for (const reading of p50Data) {
          protonTimeSeries.p50.push({ timestamp: reading.timestamp, value: reading.value });
        }
        alertManager.registerHistoricalData("proton_flux_50mev_history", protonTimeSeries.p50);
      }
      
      if (p100Data.length > 0) {
        protonFlux100 = p100Data[p100Data.length - 1].value;
        alertManager.registerDataPoint("proton_flux_100mev", protonFlux100, "pfu", "space_weather_protons", "SAFETY_CRITICAL");
        for (const reading of p100Data) {
          protonTimeSeries.p100.push({ timestamp: reading.timestamp, value: reading.value });
        }
        alertManager.registerHistoricalData("proton_flux_100mev_history", protonTimeSeries.p100);
      }
      
      result.historicalSpaceWeather.statistics.protonFlux = {
        p10MeV: p10Data.length > 0 ? {
          min: Math.min(...p10Data.map(d => d.value)),
          max: Math.max(...p10Data.map(d => d.value)),
          mean: p10Data.reduce((a, b) => a + b.value, 0) / p10Data.length,
          current: protonFlux10
        } : null,
        p50MeV: p50Data.length > 0 ? {
          min: Math.min(...p50Data.map(d => d.value)),
          max: Math.max(...p50Data.map(d => d.value)),
          mean: p50Data.reduce((a, b) => a + b.value, 0) / p50Data.length,
          current: protonFlux50
        } : null,
        p100MeV: p100Data.length > 0 ? {
          min: Math.min(...p100Data.map(d => d.value)),
          max: Math.max(...p100Data.map(d => d.value)),
          mean: p100Data.reduce((a, b) => a + b.value, 0) / p100Data.length,
          current: protonFlux100
        } : null
      };
    } else {
      alertManager.updateDataSourceStatus("space_weather_protons", "FAILED", protonRes.responseTime, protonRes.error || "Proton data is unavailable.");
    }
    
    let electronFlux = null;
    const electronRes = await makeApiRequestWithBackoff(API_ENDPOINTS.SWPC_ELECTRONS, {}, 5000, 1);
    const electronTimeSeries = [];
    
    if (electronRes.status === 200 && Array.isArray(electronRes.data) && electronRes.data.length > 0) {
      for (const entry of electronRes.data) {
        if (!entry || !entry.time_tag) continue;
        
        if (entry.energy === ">=2 MeV" || entry.energy === ">=2MeV") {
          const flux = parseFloat(entry.flux);
          if (!isNaN(flux) && flux >= 0) {
            electronTimeSeries.push({ timestamp: entry.time_tag, value: flux });
          }
        }
      }
      
      if (electronTimeSeries.length > 0) {
        electronFlux = electronTimeSeries[electronTimeSeries.length - 1].value;
        alertManager.updateDataSourceStatus("space_weather_electrons", "AVAILABLE", electronRes.responseTime);
        alertManager.registerDataPoint("electron_flux_2mev", electronFlux, "pfu", "space_weather_electrons", "OPERATIONAL");
        
        alertManager.registerHistoricalData("electron_flux_history", electronTimeSeries);
        
        const values = electronTimeSeries.map(d => d.value);
        result.historicalSpaceWeather.statistics.electronFlux = {
          min: Math.min(...values),
          max: Math.max(...values),
          mean: values.reduce((a, b) => a + b, 0) / values.length,
          current: electronFlux,
          dataPoints: values.length
        };
      } else {
        alertManager.updateDataSourceStatus("space_weather_electrons", "FAILED", electronRes.responseTime, "No valid electron flux data");
      }
    } else {
      alertManager.updateDataSourceStatus("space_weather_electrons", "FAILED", electronRes.responseTime, electronRes.error || "Electron data is unavailable.");
    }
    
    const xrayUrl = API_ENDPOINTS.SWPC_XRAY_FLUX;
    const xrayRes = await makeApiRequestWithBackoff(xrayUrl, {}, 5000, 1);
    
    if (xrayRes.status === 200 && Array.isArray(xrayRes.data) && xrayRes.data.length > 0) {
      let validXrayEntry = null;
      
      for (let i = xrayRes.data.length - 1; i >= 0; i--) {
        const entry = xrayRes.data[i];
        if (entry && entry.flux !== undefined && entry.flux !== null) {
          const flux = parseFloat(entry.flux);
          if (!isNaN(flux) && flux >= 1e-9) {
            validXrayEntry = { timestamp: entry.time_tag, value: flux };
            break;
          }
        }
      }
      
      if (validXrayEntry) {
        alertManager.updateDataSourceStatus("space_weather_xrays", "AVAILABLE", xrayRes.responseTime);
        alertManager.registerDataPoint("xray_flux", validXrayEntry.value, "W/m2", "space_weather_xrays", "OPERATIONAL");
      } else {
        alertManager.updateDataSourceStatus("space_weather_xrays", "DEGRADED", xrayRes.responseTime, "All X-ray flux values below detection threshold");
      }
    } else {
      alertManager.updateDataSourceStatus("space_weather_xrays", "FAILED", xrayRes.responseTime, xrayRes.error || "X-ray data is unavailable.");
    }
    
    const solarWindMagUrl = API_ENDPOINTS.SWPC_SOLAR_WIND;
    const solarWindMagRes = await makeApiRequestWithBackoff(solarWindMagUrl, {}, 5000, 1);
    const solarWindTimeSeries = [];
    
    if (solarWindMagRes.status === 200 && Array.isArray(solarWindMagRes.data) && solarWindMagRes.data.length > 1) {
      for (let i = 1; i < solarWindMagRes.data.length; i++) {
        const entry = solarWindMagRes.data[i];
        if (Array.isArray(entry) && entry.length >= 7) {
          const timestamp = entry[0];
          const bx = parseFloat(entry[1]);
          const by = parseFloat(entry[2]);
          const bz = parseFloat(entry[3]);
          const bt = parseFloat(entry[6]);
          if (!isNaN(bt) && bt > 0) {
            solarWindTimeSeries.push({ timestamp, bx, by, bz, bt });
          }
        }
      }
      
      if (solarWindTimeSeries.length > 0) {
        alertManager.registerHistoricalData("solar_wind_magnetic_history", solarWindTimeSeries);
      }
    }
    
    const solarWindPlasmaUrl = API_ENDPOINTS.SWPC_SOLAR_WIND_PLASMA;
    const solarWindPlasmaRes = await makeApiRequestWithBackoff(solarWindPlasmaUrl, {}, 5000, 1);
    const solarWindPlasmaTimeSeries = [];
    
    if (solarWindPlasmaRes.status === 200 && Array.isArray(solarWindPlasmaRes.data) && solarWindPlasmaRes.data.length > 1) {
      for (let i = 1; i < solarWindPlasmaRes.data.length; i++) {
        const entry = solarWindPlasmaRes.data[i];
        if (Array.isArray(entry) && entry.length >= 3) {
          const timestamp = entry[0];
          const density = parseFloat(entry[1]);
          const speed = parseFloat(entry[2]);
          if (!isNaN(density) && !isNaN(speed) && density > 0 && speed > 0) {
            solarWindPlasmaTimeSeries.push({ timestamp, density, speed });
          }
        }
      }
      
      if (solarWindPlasmaTimeSeries.length > 0) {
        alertManager.updateDataSourceStatus("solar_wind", "AVAILABLE", solarWindPlasmaRes.responseTime);
        const latest = solarWindPlasmaTimeSeries[solarWindPlasmaTimeSeries.length - 1];
        alertManager.registerDataPoint("solar_wind_speed", latest.speed, "km/s", "solar_wind", "OPERATIONAL");
        alertManager.registerDataPoint("solar_wind_density", latest.density, "p/cm3", "solar_wind", "OPERATIONAL");
        alertManager.registerHistoricalData("solar_wind_plasma_history", solarWindPlasmaTimeSeries);
      } else {
        alertManager.updateDataSourceStatus("solar_wind", "FAILED", solarWindPlasmaRes.responseTime, "No valid plasma data");
      }
    } else {
      alertManager.updateDataSourceStatus("solar_wind", "FAILED", solarWindPlasmaRes.responseTime, solarWindPlasmaRes.error || "Solar wind plasma is unavailable.");
    }
    
    const dstUrl = API_ENDPOINTS.SWPC_DST;
    const dstRes = await makeApiRequestWithBackoff(dstUrl, {}, 5000, 1);
    const dstTimeSeries = [];
    
    if (dstRes.status === 200 && Array.isArray(dstRes.data) && dstRes.data.length > 1) {
      for (let i = 1; i < dstRes.data.length; i++) {
        const entry = dstRes.data[i];
        if (Array.isArray(entry) && entry.length >= 2) {
          const timestamp = entry[0];
          const dstValue = parseFloat(entry[1]);
          if (!isNaN(dstValue)) {
            dstTimeSeries.push({ timestamp, value: dstValue });
          }
        }
      }
      
      if (dstTimeSeries.length > 0) {
        alertManager.updateDataSourceStatus("dst_index", "AVAILABLE", dstRes.responseTime);
        const latest = dstTimeSeries[dstTimeSeries.length - 1];
        alertManager.registerDataPoint("dst_index", latest.value, "nT", "dst_index", "OPERATIONAL");
        alertManager.registerHistoricalData("dst_index_history", dstTimeSeries);
      } else {
        alertManager.updateDataSourceStatus("dst_index", "FAILED", dstRes.responseTime, "No valid Dst data");
      }
    } else {
      alertManager.updateDataSourceStatus("dst_index", "FAILED", dstRes.responseTime, dstRes.error || "Dst index is unavailable.");
    }
    
    const f107Url = API_ENDPOINTS.SWPC_F107;
    const f107Res = await makeApiRequestWithBackoff(f107Url, {}, 5000, 1);
    const f107TimeSeries = [];
    
    if (f107Res.status === 200 && Array.isArray(f107Res.data) && f107Res.data.length > 0) {
      for (const entry of f107Res.data) {
        if (entry && entry.flux !== undefined) {
          const flux = parseFloat(entry.flux);
          const timestamp = entry.time_tag || entry.date;
          if (!isNaN(flux) && flux > 0) {
            f107TimeSeries.push({ timestamp, value: flux });
          }
        }
      }
      
      if (f107TimeSeries.length > 0) {
        alertManager.updateDataSourceStatus("f107_flux", "AVAILABLE", f107Res.responseTime);
        const latest = f107TimeSeries[f107TimeSeries.length - 1];
        alertManager.registerDataPoint("f107_flux", latest.value, "sfu", "f107_flux", "INFORMATIONAL");
        alertManager.registerDataPoint("solar_flux_10cm", latest.value, "sfu", "f107_flux", "INFORMATIONAL");
        alertManager.registerHistoricalData("f107_flux_history", f107TimeSeries);
      } else {
        alertManager.updateDataSourceStatus("f107_flux", "FAILED", f107Res.responseTime, "No valid F10.7 data");
      }
    } else {
      alertManager.updateDataSourceStatus("f107_flux", "FAILED", f107Res.responseTime, f107Res.error || "F10.7 flux is unavailable.");
    }
    
    const marineUrl = `${API_ENDPOINTS.OPEN_METEO_MARINE}?latitude=${lat}&longitude=${lon}&cell_selection=sea&hourly=wave_height&timezone=UTC`;
    const marineRes = await makeApiRequestWithBackoff(marineUrl, {}, 10000, 2);
    
    if (marineRes.status === 200 && marineRes.data?.hourly) {
      alertManager.updateDataSourceStatus("marine_conditions", "AVAILABLE", marineRes.responseTime);
      const idx = new Date().getUTCHours();
      if (marineRes.data.hourly.wave_height && marineRes.data.hourly.wave_height[idx] !== null) {
        const waveHeight = marineRes.data.hourly.wave_height[idx];
        alertManager.registerDataPoint("wave_height", waveHeight, "m", "marine_conditions", "OPERATIONAL");
      }
      result.systemHeartbeat["marine"] = "OPERATIONAL";
    } else {
      alertManager.updateDataSourceStatus("marine_conditions", "FAILED", marineRes.responseTime, marineRes.error || "Marine data is unavailable.");
      result.systemHeartbeat["marine"] = "FAILED";
    }

    const orbitalStartTime = Date.now();
    
    let activeSatellites = [];
    let spaceStations = [];
    let totalTrackedObjects = 0;
    let catalogTimeSeries = [];
    
    const tleRes = await makeApiRequestWithBackoff(API_ENDPOINTS.AMSAT_TLE, {}, 30000, 2);
    
    if (tleRes.status === 200 && typeof tleRes.data === "string" && tleRes.data.length > 1000) {
      alertManager.updateDataSourceStatus("satellite_catalog", "AVAILABLE", tleRes.responseTime);
      alertManager.updateDataSourceStatus("space_station_tracking", "AVAILABLE", tleRes.responseTime);
      
      const lines = tleRes.data.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      
      for (let i = 0; i < lines.length - 2; i++) {
        const line0 = lines[i];
        const line1 = lines[i + 1];
        const line2 = lines[i + 2];
        
        if (line1.startsWith('1 ') && line2.startsWith('2 ') && !line0.startsWith('1 ') && !line0.startsWith('2 ')) {
          const name = line0.trim();
          
          const noradIdMatch = line1.match(/^1\s+(\d+)/);
          const noradId = noradIdMatch ? noradIdMatch[1] : null;
          
          if (!noradId) continue;
          
          const inclination = parseFloat(line2.substring(8, 16).trim()) || 0;
          const raan = parseFloat(line2.substring(17, 25).trim()) || 0;
          const eccentricityStr = line2.substring(26, 33).trim();
          const eccentricity = parseFloat('0.' + eccentricityStr) || 0;
          const argOfPerigee = parseFloat(line2.substring(34, 42).trim()) || 0;
          const meanAnomaly = parseFloat(line2.substring(43, 51).trim()) || 0;
          const meanMotion = parseFloat(line2.substring(52, 63).trim()) || 0;
          
          const bstarStr = line1.substring(53, 61).trim();
          let bstar = 0;
          if (bstarStr.length > 0) {
            const mantissa = parseFloat(bstarStr.substring(0, bstarStr.length - 2)) || 0;
            const exponent = parseInt(bstarStr.substring(bstarStr.length - 2)) || 0;
            bstar = mantissa * Math.pow(10, exponent - 5);
          }
          
          let semiMajorAxis = 0;
          let perigee = 0;
          let apogee = 0;
          if (meanMotion > 0) {
            const mu = 398600.4418;
            const periodSeconds = 86400 / meanMotion;
            semiMajorAxis = Math.pow((mu * Math.pow(periodSeconds / (2 * Math.PI), 2)), 1/3);
            const earthRadius = 6371;
            perigee = semiMajorAxis * (1 - eccentricity) - earthRadius;
            apogee = semiMajorAxis * (1 + eccentricity) - earthRadius;
          }
          
          const satObj = {
            name: name,
            noradId: noradId,
            inclination: inclination,
            meanMotion: meanMotion,
            eccentricity: eccentricity,
            perigee: Math.max(0, perigee),
            apogee: Math.max(0, apogee),
            semiMajorAxis: semiMajorAxis,
            raan: raan,
            argOfPerigee: argOfPerigee,
            meanAnomaly: meanAnomaly,
            bstar: bstar
          };
          
          const nameUpper = name.toUpperCase();
          if (nameUpper.includes('ISS') || nameUpper.includes('ZARYA') || nameUpper.includes('TIANGONG') || 
              nameUpper.includes('CSS') || nameUpper.includes('TIANHE') || nameUpper.includes('DRAGON') ||
              nameUpper.includes('CREW') || nameUpper.includes('SOYUZ') || nameUpper.includes('PROGRESS') ||
              nameUpper.includes('CYGNUS') || nameUpper.includes('STARLINER') || nameUpper.includes('WENTIAN') ||
              nameUpper.includes('MENGTIAN') || nameUpper.includes('SHENZHOU')) {
            satObj.priority = "HIGH";
            spaceStations.push(satObj);
          } else {
            activeSatellites.push(satObj);
          }
          
          i += 2;
        }
      }
      
      totalTrackedObjects = activeSatellites.length + spaceStations.length;
      
      const inclinationDistribution = {};
      const altitudeDistribution = { leo: 0, meo: 0, geo: 0, heo: 0 };
      
      for (const sat of activeSatellites) {
        const incBin = Math.floor(sat.inclination / 10) * 10;
        inclinationDistribution[incBin] = (inclinationDistribution[incBin] || 0) + 1;
        
        const avgAlt = (sat.perigee + sat.apogee) / 2;
        if (avgAlt < 2000) altitudeDistribution.leo++;
        else if (avgAlt < 35000) altitudeDistribution.meo++;
        else if (avgAlt >= 35000 && avgAlt <= 36000) altitudeDistribution.geo++;
        else altitudeDistribution.heo++;
      }
      
      result.orbitalEnvironment.catalogData.activeSatellites = {
        totalCount: activeSatellites.length,
        inclinationDistribution: inclinationDistribution,
        altitudeDistribution: altitudeDistribution,
        timestamp: new Date().toISOString()
      };
      
      result.orbitalEnvironment.catalogData.spaceStations = {
        totalCount: spaceStations.length,
        stations: spaceStations.map(s => ({
          name: s.name,
          noradId: s.noradId,
          inclination: s.inclination,
          altitude: (s.perigee + s.apogee) / 2
        })),
        timestamp: new Date().toISOString()
      };
      
      for (const [incBin, count] of Object.entries(inclinationDistribution)) {
        catalogTimeSeries.push({
          timestamp: new Date().toISOString(),
          category: "inclination_distribution",
          bin: parseInt(incBin),
          count: count
        });
      }
      
      for (const [regime, count] of Object.entries(altitudeDistribution)) {
        catalogTimeSeries.push({
          timestamp: new Date().toISOString(),
          category: "altitude_regime",
          regime: regime.toUpperCase(),
          count: count
        });
      }
      
    } else {
      const errMsg = tleRes.error || "TLE catalog is unavailable.";
      alertManager.updateDataSourceStatus("satellite_catalog", "FAILED", tleRes.responseTime, errMsg);
      alertManager.updateDataSourceStatus("space_station_tracking", "FAILED", tleRes.responseTime, errMsg);
    }
    
    if (totalTrackedObjects > 0) {
      alertManager.registerDataPoint("tracked_objects", totalTrackedObjects, "", "satellite_catalog", "INFORMATIONAL");
    }
    
    alertManager.registerHistoricalData("space_catalog_distribution", catalogTimeSeries);
    
    const observerLatitude = Math.abs(lat);
    const groundTrackLatitudeLimit = (inclination) => Math.min(inclination, 180 - inclination);
    const overheadAnalysis = {
      observerLatitude: lat,
      satellitesReachingLatitude: 0,
      stationsReachingLatitude: 0,
      stations: []
    };
    
    for (const sat of activeSatellites) {
      if (groundTrackLatitudeLimit(sat.inclination) >= observerLatitude) {
        overheadAnalysis.satellitesReachingLatitude++;
      }
    }
    
    for (const station of spaceStations) {
      const reachesLatitude = groundTrackLatitudeLimit(station.inclination) >= observerLatitude;
      if (reachesLatitude) {
        overheadAnalysis.stationsReachingLatitude++;
      }
      overheadAnalysis.stations.push({
        name: station.name,
        noradId: station.noradId,
        inclination: station.inclination,
        altitude: (station.perigee + station.apogee) / 2,
        reachesLatitude: reachesLatitude
      });
    }
    
    if (totalTrackedObjects > 0) {
      alertManager.registerDataPoint("satellites_reaching_latitude", overheadAnalysis.satellitesReachingLatitude, "", "satellite_catalog", "INFORMATIONAL");
      alertManager.registerDataPoint("stations_reaching_latitude", overheadAnalysis.stationsReachingLatitude, "", "space_station_tracking", "INFORMATIONAL");
    }
    
    result.orbitalEnvironment.status = "COMPLETE";
    result.orbitalEnvironment.overheadAnalysis = overheadAnalysis;
    result.orbitalEnvironment.historicalTracking = catalogTimeSeries;
    result.orbitalEnvironment.processingTimeMs = Date.now() - orbitalStartTime;
    
    result.systemHeartbeat["orbital_environment"] = totalTrackedObjects > 0 ? "OPERATIONAL" : "FAILED";
    
    const fullReport = alertManager.getFullReport();
    result.conditionsDecision = fullReport.decision;
    result.conditionsStatus = fullReport.decision.status;
    result.riskQuant = parseFloat(fullReport.decision.riskScore.toFixed(4));
    result.dataTrust = parseFloat((fullReport.decision.confidence / 100).toFixed(4));
    result.violations = fullReport.violations;
    result.alerts = fullReport.alerts;
    
    if (result.conditionsStatus === "NOMINAL") {
      result.bigBoard = { color: "GREEN", message: "Conditions are nominal." };
    } else if (result.conditionsStatus === "ELEVATED") {
      result.bigBoard = { color: "YELLOW", message: "Conditions are elevated, so monitor closely." };
    } else {
      result.bigBoard = { color: "RED", message: fullReport.decision.primaryReason };
    }
    
    result.alertManager = { dataSources: fullReport.dataSources, dataPoints: fullReport.dataPoints, summary: fullReport.summary, confidenceBreakdown: fullReport.decision.confidenceBreakdown, historicalData: fullReport.historicalData };
    result.status = "AVAILABLE";
    
  } catch (error) {
    alertManager.addAlert(`Critical error in Overview module: ${error.message}`, "CRITICAL", "SYSTEM", "overview", { errorStack: error.stack });
    const fullReport = alertManager.getFullReport();
    result.status = "CRITICAL_FAILURE";
    result.bigBoard = { color: "RED", message: "A critical system failure occurred." };
    result.conditionsDecision = { status: "UNKNOWN", confidence: 0, primaryReason: `The system evaluation failed. ${displayReasonSentence(error.message)}`, category: "SYSTEM_ERROR" };
    result.conditionsStatus = "UNKNOWN";
    result.violations = fullReport.violations;
    result.alerts = fullReport.alerts;
    result.alertManager = { dataSources: fullReport.dataSources, dataPoints: fullReport.dataPoints, summary: fullReport.summary, historicalData: fullReport.historicalData };
  }
  
  return result;
}

async function groundEnvironmentSystem(lat, lon) {
  const startTime = Date.now();
  const alertManager = new AlertManager();
  
  const VISIBILITY_REDUCED_THRESHOLD_M = 5000;
  const AIR_TRAFFIC_RADIUS_KM = 150;
  const VESSEL_TRACKING_BOX_DEG = 2;
  
  const result = {
    status: "NO_DATA",
    timestamp: new Date().toISOString(),
    localEnvironment: { windRose: { direction: null, speed: null, gustFactor: null }, visibility: { visibility: null, threshold: VISIBILITY_REDUCED_THRESHOLD_M, status: "UNKNOWN" }, outdoorSafety: { lightningStandoff: null, heatIndex: null, outdoorSafe: null }, atmosphericElectricity: { fieldStrength: null, cumulusElectrification: null, triboelectricRisk: null, anvilCloudDistance: null, precipitationStaticRisk: null } },
    lightningMonitoring: { currentStrikes10nm: null, currentStrikes20nm: null, currentStrikes30nm: null, recentStrikeHistory: [], electricFieldTimeSeries: [], cumulusElectrificationHistory: [], lastStrikeTime: null, strikeDensityTrend: null, activityStatus: "UNKNOWN", dataMode: "UNKNOWN" },
    airTraffic: { aircraft: [], aircraftCount: 0, minAircraftDistance: null, searchRadiusKm: AIR_TRAFFIC_RADIUS_KM, trackingTimeSeries: [] },
    airspaceRestrictions: { activeTFRs: [], activeNOTAMs: [], airspaceClosureStatus: "UNKNOWN" },
    localHazards: { geospatialHazards: { earthquakes: [], fires: [] }, seaConditions: { waveHeight: null, seaState: null }, fireRisk: { index: null, category: null, dataAvailable: false, components: null } },
    severeWeather: { reports24h: { tornado: [], hail: [], wind: [], total: 0 }, nearbyReports: [], historicalReports: [], threatAssessment: "UNKNOWN" },
    radiationEnvironment: { protonFluxTimeSeries: [], electronFluxTimeSeries: [], xrayFluxTimeSeries: [], geomagneticTimeSeries: [], solarWindTimeSeries: [], currentConditions: {} },
    violations: [],
    alerts: [],
    alertManager: null,
    historicalSeismic: { timeSeries: [], statistics: {} },
    seismicTrends: { recentActivity: [], significantEvents: [], magnitudeTrends: {} }
  };
  
  try {
    alertManager.registerDataSource("surface_conditions", "PRIMARY", "Surface weather conditions");
    alertManager.registerDataSource("fire_assessment", "OPERATIONAL", "Fire weather index computed from weather data");
    alertManager.registerDataSource("historical_weather_fwi", "OPERATIONAL", "Historical weather for FWI calculation");
    alertManager.registerDataSource("seismic_data", "OPERATIONAL", "USGS earthquake data");
    alertManager.registerDataSource("historical_seismic", "INFORMATIONAL", "Extended seismic history");
    alertManager.registerDataSource("marine_conditions", "OPERATIONAL", "Marine conditions");
    alertManager.registerDataSource("aircraft_tracking", "SAFETY_CRITICAL", "Community ADS-B aircraft tracking comes from adsb.lol, with airplanes.live and adsb.one as fallbacks.");
    alertManager.registerDataSource("severe_weather_reports", "OPERATIONAL", "NOAA Storm Prediction Center severe weather reports");
    alertManager.registerDataSource("atmospheric_stability", "OPERATIONAL", "Atmospheric convective parameters");
    alertManager.registerDataSource("radiation_environment", "OPERATIONAL", "GOES particle and X-ray flux data");
    alertManager.registerDataSource("geomagnetic_indices", "OPERATIONAL", "Geomagnetic K-index and solar wind data");
    alertManager.registerDataSource("lightning_data", "INFORMATIONAL", "Lightning activity estimated from current thunderstorm and instability conditions");
    alertManager.registerDataSource("tfr_notam_data", "SAFETY_CRITICAL", "FAA TFR and NOTAM restrictions");
    
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 14);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    const historicalWeatherUrl = `${API_ENDPOINTS.OPEN_METEO_ARCHIVE}?latitude=${lat}&longitude=${lon}&start_date=${startDateStr}&end_date=${endDateStr}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_mean,wind_speed_10m_max,wind_gusts_10m_max&timezone=UTC`;
    const historicalWeatherRes = await makeApiRequestWithBackoff(historicalWeatherUrl, {}, 15000, 2);
    
    let historicalDailyData = [];
    if (historicalWeatherRes.status === 200 && historicalWeatherRes.data?.daily) {
      alertManager.updateDataSourceStatus("historical_weather_fwi", "AVAILABLE", historicalWeatherRes.responseTime);
      const d = historicalWeatherRes.data.daily;
      for (let i = 0; i < (d.time?.length || 0); i++) {
        historicalDailyData.push({
          date: d.time[i],
          tempMax: d.temperature_2m_max?.[i],
          tempMin: d.temperature_2m_min?.[i],
          tempMean: d.temperature_2m_max?.[i] !== null && d.temperature_2m_min?.[i] !== null ? (d.temperature_2m_max[i] + d.temperature_2m_min[i]) / 2 : null,
          precip: d.precipitation_sum?.[i] || 0,
          humidity: d.relative_humidity_2m_mean?.[i],
          windSpeedMax: d.wind_speed_10m_max?.[i],
          windGustsMax: d.wind_gusts_10m_max?.[i]
        });
      }
    } else {
      alertManager.updateDataSourceStatus("historical_weather_fwi", "FAILED", historicalWeatherRes.responseTime, historicalWeatherRes.error || "Historical weather is unavailable.");
    }
    
    const surfaceUrl = `${API_ENDPOINTS.OPEN_METEO_FORECAST}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,dew_point_2m,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility,weather_code,cloud_cover,precipitation&hourly=temperature_2m,relative_humidity_2m,dew_point_2m,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility,weather_code,cloud_cover,precipitation,cape,convective_inhibition,lifted_index,freezing_level_height&forecast_days=2&wind_speed_unit=ms&timezone=UTC`;
    const surfaceRes = await makeApiRequestWithBackoff(surfaceUrl, {}, 10000, 2);
    let windSpeed = null;
    let temperature = null;
    let humidity = null;
    let dewPoint = null;
    let hasLightningData = false;
    let currentCAPE = null;
    let currentCIN = null;
    let currentLI = null;
    let cloudCover = null;
    let precipitation = null;
    let surfacePressure = null;
    let freezingLevel = null;
    
    if (surfaceRes.status === 200 && surfaceRes.data?.current) {
      alertManager.updateDataSourceStatus("surface_conditions", "AVAILABLE", surfaceRes.responseTime);
      const cur = surfaceRes.data.current;
      
      result.localEnvironment.windRose.direction = cur.wind_direction_10m;
      result.localEnvironment.windRose.speed = cur.wind_speed_10m;
      windSpeed = cur.wind_speed_10m;
      temperature = cur.temperature_2m;
      humidity = cur.relative_humidity_2m;
      dewPoint = cur.dew_point_2m;
      cloudCover = cur.cloud_cover;
      precipitation = cur.precipitation;
      surfacePressure = cur.surface_pressure;
      
      if (cur.wind_gusts_10m !== null && cur.wind_speed_10m !== null && cur.wind_speed_10m > 0) {
        result.localEnvironment.windRose.gustFactor = cur.wind_gusts_10m / cur.wind_speed_10m;
      }
      
      if (cur.wind_speed_10m !== null) alertManager.registerDataPoint("surface_wind_speed", cur.wind_speed_10m, "m/s", "surface_conditions", "PRIMARY");
      if (cur.wind_direction_10m !== null) alertManager.registerDataPoint("surface_wind_direction", cur.wind_direction_10m, "deg", "surface_conditions", "OPERATIONAL");
      if (cur.wind_gusts_10m !== null) alertManager.registerDataPoint("surface_wind_gusts", cur.wind_gusts_10m, "m/s", "surface_conditions", "SAFETY_CRITICAL");
      
      result.localEnvironment.visibility.visibility = cur.visibility;
      if (cur.visibility !== null) {
        result.localEnvironment.visibility.status = cur.visibility >= VISIBILITY_REDUCED_THRESHOLD_M ? "GOOD" : "REDUCED";
        alertManager.registerDataPoint("surface_visibility", cur.visibility, "m", "surface_conditions", "SAFETY_CRITICAL");
      }
      
      if (temperature !== null && humidity !== null) {
        let heatIndex = temperature;
        
        if (temperature >= 26.7 && humidity >= 40) {
          const T = temperature;
          const RH = humidity;
          heatIndex = -8.78469475556 + 1.61139411 * T + 2.33854883889 * RH - 0.14611605 * T * RH - 0.012308094 * T * T - 0.0164248277778 * RH * RH + 0.002211732 * T * T * RH + 0.00072546 * T * RH * RH - 0.000003582 * T * T * RH * RH;
        }
        
        result.localEnvironment.outdoorSafety.heatIndex = parseFloat(heatIndex.toFixed(1));
        result.localEnvironment.outdoorSafety.outdoorSafe = heatIndex < 40;
        alertManager.registerDataPoint("heat_index", heatIndex, "C", "surface_conditions", "OPERATIONAL");
      }
      
      if (temperature !== null && dewPoint !== null) {
        const dewpointDepression = temperature - dewPoint;
        alertManager.registerDataPoint("dewpoint_depression_surface", dewpointDepression, "C", "surface_conditions", "OPERATIONAL");
      }
      
      if ([95, 96, 99].includes(cur.weather_code)) {
        result.localEnvironment.outdoorSafety.lightningStandoff = 0;
        result.lightningMonitoring.activityStatus = "ELEVATED";
        hasLightningData = true;
        alertManager.addAlert("Thunderstorm conditions indicate lightning near this location.", "CRITICAL", "WEATHER", "surface_conditions", { weatherCode: cur.weather_code });
        alertManager.registerDataPoint("lightning_standoff", 0, "nm", "surface_conditions", "PRIMARY");
      } else {
        result.localEnvironment.outdoorSafety.lightningStandoff = null;
        result.lightningMonitoring.activityStatus = "NOMINAL";
      }
      
      if (surfaceRes.data.hourly) {
        const hourly = surfaceRes.data.hourly;
        const currentHour = new Date().getUTCHours();
        
        if (hourly.cape && hourly.cape[currentHour] !== null) {
          currentCAPE = hourly.cape[currentHour];
          alertManager.registerDataPoint("convective_available_potential_energy", currentCAPE, "J/kg", "atmospheric_stability", "OPERATIONAL");
          alertManager.updateDataSourceStatus("atmospheric_stability", "AVAILABLE", surfaceRes.responseTime);
        }
        
        if (hourly.convective_inhibition && hourly.convective_inhibition[currentHour] !== null) {
          currentCIN = hourly.convective_inhibition[currentHour];
          alertManager.registerDataPoint("convective_inhibition", currentCIN, "J/kg", "atmospheric_stability", "OPERATIONAL");
        }
        
        if (hourly.lifted_index && hourly.lifted_index[currentHour] !== null) {
          currentLI = hourly.lifted_index[currentHour];
          alertManager.registerDataPoint("lifted_index", currentLI, "C", "atmospheric_stability", "OPERATIONAL");
        }
        
        if (hourly.freezing_level_height && hourly.freezing_level_height[currentHour] !== null) {
          freezingLevel = hourly.freezing_level_height[currentHour];
          alertManager.registerDataPoint("freezing_level", freezingLevel, "m", "atmospheric_stability", "OPERATIONAL");
        }
        
        let cumulusElectrificationIndex = 0;
        if (currentCAPE !== null && currentCAPE > 0) {
          cumulusElectrificationIndex = Math.min(1.0, currentCAPE / 3000);
          if (currentLI !== null && currentLI < 0) {
            cumulusElectrificationIndex = Math.min(1.0, cumulusElectrificationIndex + Math.abs(currentLI) / 10);
          }
          if (humidity !== null && humidity > 70) {
            cumulusElectrificationIndex = Math.min(1.0, cumulusElectrificationIndex * 1.2);
          }
        }
        result.localEnvironment.atmosphericElectricity.cumulusElectrification = parseFloat(cumulusElectrificationIndex.toFixed(3));
        alertManager.registerDataPoint("cumulus_electrification_index", cumulusElectrificationIndex, "index", "atmospheric_stability", "SAFETY_CRITICAL");
        
        let triboelectricRisk = 0;
        if (humidity !== null && humidity < 30) {
          triboelectricRisk = (30 - humidity) / 30 * 0.5;
        }
        if (windSpeed !== null && windSpeed > 10) {
          triboelectricRisk = Math.min(1.0, triboelectricRisk + (windSpeed - 10) / 20 * 0.3);
        }
        if (temperature !== null && temperature < 0) {
          triboelectricRisk = Math.min(1.0, triboelectricRisk + 0.2);
        }
        result.localEnvironment.atmosphericElectricity.triboelectricRisk = parseFloat(triboelectricRisk.toFixed(3));
        
        let fieldStrengthEstimate = 0.1;
        if (currentCAPE !== null && currentCAPE > 0) {
          fieldStrengthEstimate += (currentCAPE / 1000) * 0.5;
        }
        if (cloudCover !== null && cloudCover > 70) {
          fieldStrengthEstimate += (cloudCover - 70) / 30 * 0.3;
        }
        if (humidity !== null && humidity > 80) {
          fieldStrengthEstimate += (humidity - 80) / 20 * 0.2;
        }
        if (currentLI !== null && currentLI < 0) {
          fieldStrengthEstimate += Math.abs(currentLI) * 0.1;
        }
        if ([95, 96, 99].includes(cur.weather_code)) {
          fieldStrengthEstimate = Math.max(fieldStrengthEstimate, 3.0);
        }
        result.localEnvironment.atmosphericElectricity.fieldStrength = parseFloat(fieldStrengthEstimate.toFixed(2));
        alertManager.registerDataPoint("atmospheric_field_strength", fieldStrengthEstimate, "kV/m", "atmospheric_stability", "SAFETY_CRITICAL");
        
        let precipStaticRisk = 0;
        if (precipitation !== null && precipitation > 0) {
          precipStaticRisk += Math.min(0.4, precipitation / 10);
        }
        if (windSpeed !== null && windSpeed > 5) {
          precipStaticRisk += Math.min(0.3, (windSpeed - 5) / 20);
        }
        if (humidity !== null) {
          if (humidity < 40) {
            precipStaticRisk += 0.2;
          } else if (humidity > 90) {
            precipStaticRisk += 0.1;
          }
        }
        if (temperature !== null && temperature < 0 && precipitation !== null && precipitation > 0) {
          precipStaticRisk += 0.2;
        }
        result.localEnvironment.atmosphericElectricity.precipitationStaticRisk = parseFloat(Math.min(1.0, precipStaticRisk).toFixed(3));
        alertManager.registerDataPoint("precipitation_static_risk", precipStaticRisk, "index", "atmospheric_stability", "OPERATIONAL");
        
        let anvilDistance = null;
        if ([95, 96, 99].includes(cur.weather_code)) {
          anvilDistance = 10;
        } else if (currentCAPE !== null && currentCAPE > 1000 && cloudCover !== null && cloudCover > 60) {
          const baseDistance = 50;
          const capeReduction = Math.min(40, (currentCAPE - 1000) / 100);
          anvilDistance = Math.max(5, baseDistance - capeReduction);
          if (currentLI !== null && currentLI < -4) {
            anvilDistance = Math.max(5, anvilDistance - 10);
          }
        } else if (currentCAPE !== null && currentCAPE > 500 && cloudCover !== null && cloudCover > 40) {
          anvilDistance = 75;
        } else if (cloudCover !== null && cloudCover > 50 && currentLI !== null && currentLI < 0) {
          anvilDistance = 100;
        } else {
          anvilDistance = 150;
        }
        result.localEnvironment.atmosphericElectricity.anvilCloudDistance = anvilDistance;
        alertManager.registerDataPoint("anvil_cloud_distance", anvilDistance, "nm", "atmospheric_stability", "SAFETY_CRITICAL");
        
        const capeTimeSeries = [];
        for (let i = 0; i < Math.min(48, hourly.time?.length || 0); i++) {
          if (hourly.cape && hourly.cape[i] !== null) {
            capeTimeSeries.push({
              timestamp: new Date(hourly.time[i]).getTime(),
              value: hourly.cape[i],
              unit: "J/kg"
            });
          }
        }
        if (capeTimeSeries.length > 0) {
          alertManager.registerHistoricalData("cape_forecast", capeTimeSeries);
        }
        
        const liTimeSeries = [];
        for (let i = 0; i < Math.min(48, hourly.time?.length || 0); i++) {
          if (hourly.lifted_index && hourly.lifted_index[i] !== null) {
            liTimeSeries.push({
              timestamp: new Date(hourly.time[i]).getTime(),
              value: hourly.lifted_index[i],
              unit: "C"
            });
          }
        }
        if (liTimeSeries.length > 0) {
          alertManager.registerHistoricalData("lifted_index_forecast", liTimeSeries);
        }
        
        if (cumulusElectrificationIndex > 0.8) {
          alertManager.addAlert(`High cumulus electrification potential: ${(cumulusElectrificationIndex * 100).toFixed(0)}%`, "WARNING", "LIGHTNING", "atmospheric_stability", { index: cumulusElectrificationIndex, cape: currentCAPE, liftedIndex: currentLI });
        } else if (cumulusElectrificationIndex > 0.5) {
          alertManager.addAlert(`Elevated cumulus electrification potential: ${(cumulusElectrificationIndex * 100).toFixed(0)}%`, "ADVISORY", "LIGHTNING", "atmospheric_stability", { index: cumulusElectrificationIndex, cape: currentCAPE, liftedIndex: currentLI });
        }
      }
    } else {
      alertManager.updateDataSourceStatus("surface_conditions", "FAILED", surfaceRes.responseTime, surfaceRes.error || "Surface conditions is unavailable.");
      alertManager.updateDataSourceStatus("atmospheric_stability", "FAILED", surfaceRes.responseTime, "Atmospheric stability data is unavailable.");
    }
    
    const thunderstormNow = Boolean(surfaceRes.data?.current && [95, 96, 99].includes(surfaceRes.data.current.weather_code));
    const convectiveSetup = currentCAPE !== null && currentCAPE > 2000 && currentLI !== null && currentLI < -4;
    result.lightningMonitoring.dataMode = "ESTIMATED";
    result.lightningMonitoring.basis = thunderstormNow ? "THUNDERSTORM REPORTED" : convectiveSetup ? "UNSTABLE ATMOSPHERE" : "NO CONVECTIVE SIGNAL";
    result.lightningMonitoring.activityStatus = thunderstormNow ? "ELEVATED" : convectiveSetup ? "WATCH" : "NOMINAL";
    if (surfaceRes.status === 200 && surfaceRes.data?.current) {
      alertManager.updateDataSourceStatus("lightning_data", "AVAILABLE", surfaceRes.responseTime);
    } else {
      alertManager.updateDataSourceStatus("lightning_data", "FAILED", surfaceRes.responseTime, "Current weather needed to estimate lightning activity was is unavailable.");
    }
    if (thunderstormNow) alertManager.addAlert("A thunderstorm is being reported at this location, so lightning is likely nearby.", "WARNING", "LIGHTNING", "lightning_data", {});
    
    const tfrUrl = `${API_ENDPOINTS.FAA_TFR_LIST}`;
    const tfrRes = await makeApiRequestWithBackoff(tfrUrl, {}, 12000, 2);
    
    if (tfrRes.status === 200 && tfrRes.data) {
      alertManager.updateDataSourceStatus("tfr_notam_data", "AVAILABLE", tfrRes.responseTime);
      
      const activeTFRs = [];
      const tfrs = Array.isArray(tfrRes.data) ? tfrRes.data : (tfrRes.data.tfrs || tfrRes.data.features || []);
      
      for (const tfr of tfrs) {
        let tfrLat, tfrLon, tfrName, tfrType, tfrStart, tfrEnd;
        
        if (tfr.properties) {
          tfrLat = tfr.properties.lat || tfr.geometry?.coordinates?.[1];
          tfrLon = tfr.properties.lon || tfr.geometry?.coordinates?.[0];
          tfrName = tfr.properties.name || tfr.properties.notam || tfr.properties.description;
          tfrType = tfr.properties.type || tfr.properties.reason;
          tfrStart = tfr.properties.effective || tfr.properties.startDate;
          tfrEnd = tfr.properties.expire || tfr.properties.endDate;
        } else {
          tfrLat = tfr.lat || tfr.latitude;
          tfrLon = tfr.lon || tfr.longitude;
          tfrName = tfr.name || tfr.notam || tfr.description;
          tfrType = tfr.type || tfr.reason;
          tfrStart = tfr.effective || tfr.startDate;
          tfrEnd = tfr.expire || tfr.endDate;
        }
        
        if (tfrLat !== undefined && tfrLon !== undefined) {
          const dist = calculateDistance(lat, lon, parseFloat(tfrLat), parseFloat(tfrLon));
          
          if (dist <= 500) {
            activeTFRs.push({
              name: tfrName || "TFR",
              type: tfrType || "UNKNOWN",
              lat: parseFloat(tfrLat),
              lon: parseFloat(tfrLon),
              distance: Math.round(dist),
              effective: tfrStart,
              expire: tfrEnd,
              active: true
            });
          }
        }
      }
      
      activeTFRs.sort((a, b) => a.distance - b.distance);
      result.airspaceRestrictions.activeTFRs = activeTFRs.slice(0, 20);
      
      if (activeTFRs.length > 0 && activeTFRs[0].distance < 50) {
        result.airspaceRestrictions.airspaceClosureStatus = "RESTRICTED";
        alertManager.addAlert(`TFR active within 50km: ${activeTFRs[0].name} at ${activeTFRs[0].distance}km`, "WARNING", "AIRSPACE", "tfr_notam_data", { tfr: activeTFRs[0] });
      } else if (activeTFRs.length > 0) {
        result.airspaceRestrictions.airspaceClosureStatus = "OPEN";
      } else {
        result.airspaceRestrictions.airspaceClosureStatus = "OPEN";
      }
      
      alertManager.registerDataPoint("active_tfrs", activeTFRs.length, "", "tfr_notam_data", "SAFETY_CRITICAL");
    } else {
      const faaNotamUrl = `${API_ENDPOINTS.FAA_NOTAMS}?locationLongitude=${lon}&locationLatitude=${lat}&locationRadius=100`;
      const notamRes = await makeApiRequestWithBackoff(faaNotamUrl, {}, 10000, 1);
      
      if (notamRes.status === 200 && notamRes.data) {
        alertManager.updateDataSourceStatus("tfr_notam_data", "DEGRADED", notamRes.responseTime, "TFR unavailable, NOTAM only");
        const notams = Array.isArray(notamRes.data) ? notamRes.data : (notamRes.data.items || notamRes.data.notams || []);
        
        const activeNOTAMs = notams.slice(0, 20).map(n => ({
          id: n.id || n.notamId || n.key,
          text: n.text || n.message || n.traditionalMessage,
          type: n.type || n.classification,
          effective: n.effectiveStart || n.startDate,
          expire: n.effectiveEnd || n.endDate,
          location: n.location || n.facilityDesignator
        }));
        
        result.airspaceRestrictions.activeNOTAMs = activeNOTAMs;
        result.airspaceRestrictions.airspaceClosureStatus = activeNOTAMs.length > 0 ? "CHECK_NOTAMS" : "OPEN";
        alertManager.registerDataPoint("active_notams", activeNOTAMs.length, "", "tfr_notam_data", "OPERATIONAL");
      } else {
        alertManager.updateDataSourceStatus("tfr_notam_data", "FAILED", tfrRes.responseTime, "FAA TFR/NOTAM data unavailable");
        result.airspaceRestrictions.airspaceClosureStatus = "UNKNOWN";
        result.airspaceRestrictions.activeTFRs = [];
        result.airspaceRestrictions.activeNOTAMs = [];
      }
    }
    
    
    const protons7dayRes = await makeApiRequestWithBackoff(API_ENDPOINTS.SWPC_PROTONS_7DAY, {}, 12000, 2);
    if (protons7dayRes.status === 200 && Array.isArray(protons7dayRes.data)) {
      alertManager.updateDataSourceStatus("radiation_environment", "AVAILABLE", protons7dayRes.responseTime);
      const protonTimeSeries = [];
      let latestProton10 = null;
      let latestProton50 = null;
      let latestProton100 = null;
      
      for (const entry of protons7dayRes.data) {
        if (entry.time_tag && entry.energy) {
          const ts = new Date(entry.time_tag).getTime();
          if (!isNaN(ts)) {
            const flux = parseFloat(entry.flux);
            if (!isNaN(flux) && flux > 0) {
              protonTimeSeries.push({
                timestamp: ts,
                energy: entry.energy,
                flux: flux,
                satellite: entry.satellite || "GOES"
              });
              
              if (entry.energy === ">=10 MeV") latestProton10 = flux;
              else if (entry.energy === ">=50 MeV") latestProton50 = flux;
              else if (entry.energy === ">=100 MeV") latestProton100 = flux;
            }
          }
        }
      }
      
      result.radiationEnvironment.protonFluxTimeSeries = protonTimeSeries.slice(-2000);
      alertManager.registerHistoricalData("proton_flux_7day", protonTimeSeries.slice(-2000));
      
      if (latestProton10 !== null) {
        alertManager.registerDataPoint("goes_proton_gt10mev", latestProton10, "pfu", "radiation_environment", "SAFETY_CRITICAL");
        result.radiationEnvironment.currentConditions.proton10MeV = latestProton10;
      }
      if (latestProton50 !== null) {
        alertManager.registerDataPoint("goes_proton_gt50mev", latestProton50, "pfu", "radiation_environment", "SAFETY_CRITICAL");
        result.radiationEnvironment.currentConditions.proton50MeV = latestProton50;
      }
      if (latestProton100 !== null) {
        alertManager.registerDataPoint("goes_proton_gt100mev", latestProton100, "pfu", "radiation_environment", "SAFETY_CRITICAL");
        result.radiationEnvironment.currentConditions.proton100MeV = latestProton100;
      }
    }
    
    const electrons7dayRes = await makeApiRequestWithBackoff(API_ENDPOINTS.SWPC_ELECTRONS_7DAY, {}, 12000, 2);
    if (electrons7dayRes.status === 200 && Array.isArray(electrons7dayRes.data)) {
      const electronTimeSeries = [];
      let latestElectron2 = null;
      
      for (const entry of electrons7dayRes.data) {
        if (entry.time_tag && entry.energy) {
          const ts = new Date(entry.time_tag).getTime();
          if (!isNaN(ts)) {
            const flux = parseFloat(entry.flux);
            if (!isNaN(flux) && flux > 0) {
              electronTimeSeries.push({
                timestamp: ts,
                energy: entry.energy,
                flux: flux,
                satellite: entry.satellite || "GOES"
              });
              
              if (entry.energy === ">=2 MeV") latestElectron2 = flux;
            }
          }
        }
      }
      
      result.radiationEnvironment.electronFluxTimeSeries = electronTimeSeries.slice(-2000);
      alertManager.registerHistoricalData("electron_flux_7day", electronTimeSeries.slice(-2000));
      
      if (latestElectron2 !== null) {
        alertManager.registerDataPoint("goes_electron_gt2mev", latestElectron2, "pfu", "radiation_environment", "OPERATIONAL");
        result.radiationEnvironment.currentConditions.electron2MeV = latestElectron2;
      }
    }
    
    const xray7dayRes = await makeApiRequestWithBackoff(API_ENDPOINTS.SWPC_XRAYS_7DAY, {}, 12000, 2);
    if (xray7dayRes.status === 200 && Array.isArray(xray7dayRes.data)) {
      const xrayTimeSeries = [];
      let latestXrayShort = null;
      let latestXrayLong = null;
      
      for (const entry of xray7dayRes.data) {
        if (entry.time_tag) {
          const ts = new Date(entry.time_tag).getTime();
          if (!isNaN(ts)) {
            const flux = parseFloat(entry.flux);
            if (!isNaN(flux) && flux > 1e-10) {
              xrayTimeSeries.push({
                timestamp: ts,
                wavelength: entry.energy || entry.wavelength,
                flux: flux,
                satellite: entry.satellite || "GOES"
              });
              
              if (entry.energy === "0.05-0.4nm" || entry.wavelength === "short") latestXrayShort = flux;
              else if (entry.energy === "0.1-0.8nm" || entry.wavelength === "long") latestXrayLong = flux;
            }
          }
        }
      }
      
      result.radiationEnvironment.xrayFluxTimeSeries = xrayTimeSeries.slice(-2000);
      alertManager.registerHistoricalData("xray_flux_7day", xrayTimeSeries.slice(-2000));
      
      if (latestXrayShort !== null && latestXrayShort > 1e-10) {
        alertManager.registerDataPoint("xray_flux_short", latestXrayShort, "W/m2", "radiation_environment", "OPERATIONAL");
        result.radiationEnvironment.currentConditions.xrayShort = latestXrayShort;
      }
      if (latestXrayLong !== null && latestXrayLong > 1e-10) {
        alertManager.registerDataPoint("xray_flux_long", latestXrayLong, "W/m2", "radiation_environment", "OPERATIONAL");
        result.radiationEnvironment.currentConditions.xrayLong = latestXrayLong;
      }
    }
    
    const xrayPrimaryUrl = API_ENDPOINTS.SWPC_XRAY_FLUX;
    const xrayPrimaryRes = await makeApiRequestWithBackoff(xrayPrimaryUrl, {}, 10000, 1);
    if (xrayPrimaryRes.status === 200 && Array.isArray(xrayPrimaryRes.data) && xrayPrimaryRes.data.length > 0) {
      for (let i = xrayPrimaryRes.data.length - 1; i >= 0; i--) {
        const entry = xrayPrimaryRes.data[i];
        if (entry.flux !== null && entry.flux !== undefined) {
          const flux = parseFloat(entry.flux);
          if (!isNaN(flux) && flux > 1e-10) {
            if (entry.energy === "0.05-0.4nm" && result.radiationEnvironment.currentConditions.xrayShort === undefined) {
              result.radiationEnvironment.currentConditions.xrayShort = flux;
              alertManager.registerDataPoint("xray_flux_short", flux, "W/m2", "radiation_environment", "OPERATIONAL");
            } else if (entry.energy === "0.1-0.8nm" && result.radiationEnvironment.currentConditions.xrayLong === undefined) {
              result.radiationEnvironment.currentConditions.xrayLong = flux;
              alertManager.registerDataPoint("xray_flux_long", flux, "W/m2", "radiation_environment", "OPERATIONAL");
            }
          }
        }
      }
    }
    
    const mag7dayRes = await makeApiRequestWithBackoff(API_ENDPOINTS.SWPC_MAG_7DAY, {}, 12000, 2);
    if (mag7dayRes.status === 200 && Array.isArray(mag7dayRes.data) && mag7dayRes.data.length > 1) {
      const geomagTimeSeries = [];
      let latestBz = null;
      
      for (let i = 1; i < mag7dayRes.data.length; i++) {
        const entry = mag7dayRes.data[i];
        if (Array.isArray(entry) && entry.length >= 4) {
          const ts = new Date(entry[0]).getTime();
          if (!isNaN(ts)) {
            const bz = parseFloat(entry[3]);
            if (!isNaN(bz)) {
              geomagTimeSeries.push({
                timestamp: ts,
                bz: bz,
                bt: parseFloat(entry[6]) || null
              });
              latestBz = bz;
            }
          }
        }
      }
      
      result.radiationEnvironment.geomagneticTimeSeries = geomagTimeSeries.slice(-2000);
      alertManager.registerHistoricalData("geomagnetic_bz_7day", geomagTimeSeries.slice(-2000));
      alertManager.updateDataSourceStatus("geomagnetic_indices", "AVAILABLE", mag7dayRes.responseTime);
      
      if (latestBz !== null) {
        alertManager.registerDataPoint("bz_component", latestBz, "nT", "geomagnetic_indices", "OPERATIONAL");
        result.radiationEnvironment.currentConditions.bzComponent = latestBz;
      }
    }
    
    const plasma7dayRes = await makeApiRequestWithBackoff(API_ENDPOINTS.SWPC_PLASMA_7DAY, {}, 12000, 2);
    if (plasma7dayRes.status === 200 && Array.isArray(plasma7dayRes.data) && plasma7dayRes.data.length > 1) {
      const solarWindTimeSeries = [];
      let latestSpeed = null;
      let latestDensity = null;
      
      for (let i = 1; i < plasma7dayRes.data.length; i++) {
        const entry = plasma7dayRes.data[i];
        if (Array.isArray(entry) && entry.length >= 3) {
          const ts = new Date(entry[0]).getTime();
          if (!isNaN(ts)) {
            const density = parseFloat(entry[1]);
            const speed = parseFloat(entry[2]);
            if (!isNaN(speed) && speed > 0) {
              solarWindTimeSeries.push({
                timestamp: ts,
                speed: speed,
                density: !isNaN(density) ? density : null
              });
              latestSpeed = speed;
              if (!isNaN(density)) latestDensity = density;
            }
          }
        }
      }
      
      result.radiationEnvironment.solarWindTimeSeries = solarWindTimeSeries.slice(-2000);
      alertManager.registerHistoricalData("solar_wind_7day", solarWindTimeSeries.slice(-2000));
      
      if (latestSpeed !== null) {
        alertManager.registerDataPoint("solar_wind_speed", latestSpeed, "km/s", "geomagnetic_indices", "OPERATIONAL");
        result.radiationEnvironment.currentConditions.solarWindSpeed = latestSpeed;
      }
      if (latestDensity !== null) {
        alertManager.registerDataPoint("solar_wind_density", latestDensity, "p/cm3", "geomagnetic_indices", "OPERATIONAL");
        result.radiationEnvironment.currentConditions.solarWindDensity = latestDensity;
      }
    }
    
    if (result.radiationEnvironment.currentConditions.solarWindSpeed === undefined || result.radiationEnvironment.currentConditions.solarWindDensity === undefined) {
      const plasmaRtUrl = API_ENDPOINTS.SWPC_PLASMA_7DAY;
      const plasmaRtRes = await makeApiRequestWithBackoff(plasmaRtUrl, {}, 10000, 1);
      
      if (plasmaRtRes.status === 200 && Array.isArray(plasmaRtRes.data) && plasmaRtRes.data.length > 1) {
        for (let i = plasmaRtRes.data.length - 1; i >= 1; i--) {
          const entry = plasmaRtRes.data[i];
          if (Array.isArray(entry) && entry.length >= 3) {
            const density = parseFloat(entry[1]);
            const speed = parseFloat(entry[2]);
            
            if (result.radiationEnvironment.currentConditions.solarWindSpeed === undefined && !isNaN(speed) && speed > 0) {
              result.radiationEnvironment.currentConditions.solarWindSpeed = speed;
              alertManager.registerDataPoint("solar_wind_speed", speed, "km/s", "geomagnetic_indices", "OPERATIONAL");
            }
            if (result.radiationEnvironment.currentConditions.solarWindDensity === undefined && !isNaN(density) && density > 0) {
              result.radiationEnvironment.currentConditions.solarWindDensity = density;
              alertManager.registerDataPoint("solar_wind_density", density, "p/cm3", "geomagnetic_indices", "OPERATIONAL");
            }
            
            if (result.radiationEnvironment.currentConditions.solarWindSpeed !== undefined && result.radiationEnvironment.currentConditions.solarWindDensity !== undefined) {
              break;
            }
          }
        }
      }
    }
    
    const kIndexRes = await makeApiRequestWithBackoff(API_ENDPOINTS.SWPC_BOULDER_K, {}, 10000, 2);
    if (kIndexRes.status === 200 && Array.isArray(kIndexRes.data)) {
      const kIndexTimeSeries = [];
      let latestK = null;
      
      for (const entry of kIndexRes.data) {
        if (entry.time_tag && entry.k_index !== undefined) {
          const ts = new Date(entry.time_tag).getTime();
          if (!isNaN(ts)) {
            const k = parseFloat(entry.k_index);
            if (!isNaN(k)) {
              kIndexTimeSeries.push({
                timestamp: ts,
                kIndex: k
              });
              latestK = k;
            }
          }
        }
      }
      
      alertManager.registerHistoricalData("k_index_boulder", kIndexTimeSeries);
      
      if (latestK !== null) {
        alertManager.registerDataPoint("k_index_boulder", latestK, "", "geomagnetic_indices", "OPERATIONAL");
        result.radiationEnvironment.currentConditions.kIndexBoulder = latestK;
      }
    }
    
    const spcTodayRes = await makeApiRequestWithBackoff(API_ENDPOINTS.NOAA_SPC_REPORTS_TODAY, {}, 10000, 2);
    if (spcTodayRes.status === 200 && typeof spcTodayRes.data === "string") {
      alertManager.updateDataSourceStatus("severe_weather_reports", "AVAILABLE", spcTodayRes.responseTime);
      const lines = spcTodayRes.data.split("\n");
      const tornadoReports = [];
      const hailReports = [];
      const windReports = [];
      let currentSection = null;
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("Time,")) continue;
        if (trimmed === "" || trimmed.startsWith("#")) continue;
        
        if (trimmed.toLowerCase().includes("tornado")) {
          currentSection = "tornado";
          continue;
        } else if (trimmed.toLowerCase().includes("hail")) {
          currentSection = "hail";
          continue;
        } else if (trimmed.toLowerCase().includes("wind")) {
          currentSection = "wind";
          continue;
        }
        
        const parts = trimmed.split(",");
        if (parts.length >= 7) {
          const reportLat = parseFloat(parts[5]);
          const reportLon = parseFloat(parts[6]);
          
          if (!isNaN(reportLat) && !isNaN(reportLon)) {
            const dist = calculateDistance(lat, lon, reportLat, reportLon);
            const report = {
              time: parts[0],
              speed: parts[1] || null,
              location: parts[2] || null,
              county: parts[3] || null,
              state: parts[4] || null,
              lat: reportLat,
              lon: reportLon,
              distance: Math.round(dist),
              comments: parts[7] || null
            };
            
            if (currentSection === "tornado" || trimmed.toLowerCase().includes("tornado")) {
              tornadoReports.push(report);
            } else if (currentSection === "hail" || trimmed.toLowerCase().includes("hail")) {
              hailReports.push(report);
            } else if (currentSection === "wind") {
              windReports.push(report);
            }
          }
        }
      }
      
      result.severeWeather.reports24h.tornado = tornadoReports;
      result.severeWeather.reports24h.hail = hailReports;
      result.severeWeather.reports24h.wind = windReports;
      result.severeWeather.reports24h.total = tornadoReports.length + hailReports.length + windReports.length;
      
      const SEVERE_WEATHER_RADIUS_KM = 300;
      const nearbyTornado = tornadoReports.filter(r => r.distance <= SEVERE_WEATHER_RADIUS_KM);
      const nearbyHail = hailReports.filter(r => r.distance <= SEVERE_WEATHER_RADIUS_KM);
      const nearbyWind = windReports.filter(r => r.distance <= SEVERE_WEATHER_RADIUS_KM);
      
      result.severeWeather.nearbyReports = [...nearbyTornado, ...nearbyHail, ...nearbyWind].sort((a, b) => a.distance - b.distance);
      
      alertManager.registerDataPoint("tornado_reports_24h", nearbyTornado.length, "", "severe_weather_reports", "SAFETY_CRITICAL");
      alertManager.registerDataPoint("hail_reports_24h", nearbyHail.length, "", "severe_weather_reports", "OPERATIONAL");
      alertManager.registerDataPoint("wind_damage_reports_24h", nearbyWind.length, "", "severe_weather_reports", "OPERATIONAL");
      alertManager.registerDataPoint("severe_weather_reports_24h", result.severeWeather.nearbyReports.length, "", "severe_weather_reports", "OPERATIONAL");
      
      if (nearbyTornado.length > 0) {
        const closestTornado = nearbyTornado.reduce((a, b) => a.distance < b.distance ? a : b);
        alertManager.addAlert(`Tornado reported within ${SEVERE_WEATHER_RADIUS_KM}km: ${closestTornado.distance}km away at ${closestTornado.location || closestTornado.county}`, "CRITICAL", "SEVERE_WEATHER", "severe_weather_reports", { reports: nearbyTornado, closest: closestTornado });
        result.severeWeather.threatAssessment = "CRITICAL";
      } else if (nearbyHail.length > 3 || nearbyWind.length > 5) {
        alertManager.addAlert(`Multiple severe weather reports within ${SEVERE_WEATHER_RADIUS_KM}km: ${nearbyHail.length} hail, ${nearbyWind.length} wind`, "WARNING", "SEVERE_WEATHER", "severe_weather_reports", { hailCount: nearbyHail.length, windCount: nearbyWind.length });
        result.severeWeather.threatAssessment = "ELEVATED";
      } else if (result.severeWeather.nearbyReports.length > 0) {
        result.severeWeather.threatAssessment = "GUARDED";
      } else {
        result.severeWeather.threatAssessment = "NOMINAL";
      }
    } else {
      alertManager.updateDataSourceStatus("severe_weather_reports", "FAILED", spcTodayRes.responseTime, spcTodayRes.error || "SPC reports are unavailable.");
    }
    
    const adsbRadiusNm = Math.min(250, Math.round(AIR_TRAFFIC_RADIUS_KM * 0.539957));
    const adsbEndpoints = [
      `${API_ENDPOINTS.ADSB_LOL}${lat.toFixed(4)}/lon/${lon.toFixed(4)}/dist/${adsbRadiusNm}`,
      `${API_ENDPOINTS.ADSB_AIRPLANES_LIVE}${lat.toFixed(4)}/${lon.toFixed(4)}/${adsbRadiusNm}`,
      `${API_ENDPOINTS.ADSB_ONE}${lat.toFixed(4)}/${lon.toFixed(4)}/${adsbRadiusNm}`
    ];
    let aircraftRes = null;
    for (const endpoint of adsbEndpoints) {
      aircraftRes = await makeApiRequestWithBackoff(endpoint, {}, 12000, 1);
      if (aircraftRes.status === 200 && Array.isArray(aircraftRes.data?.ac)) break;
    }
    
    if (aircraftRes.status === 200 && Array.isArray(aircraftRes.data?.ac)) {
      alertManager.updateDataSourceStatus("aircraft_tracking", "AVAILABLE", aircraftRes.responseTime);
      const aircraftNearby = [];
      let minDistance = Infinity;
      
      for (const plane of aircraftRes.data.ac) {
        const icao24 = plane.hex || null;
        const callsign = plane.flight ? String(plane.flight).trim() : (plane.r || "UNKNOWN");
        const acLon = typeof plane.lon === "number" ? plane.lon : plane.lastPosition?.lon ?? null;
        const acLat = typeof plane.lat === "number" ? plane.lat : plane.lastPosition?.lat ?? null;
        const onGround = plane.alt_baro === "ground";
        const altitude = typeof plane.alt_baro === "number" ? plane.alt_baro * 0.3048 : typeof plane.alt_geom === "number" ? plane.alt_geom * 0.3048 : null;
        const velocity = typeof plane.gs === "number" ? plane.gs * 0.514444 : null;
        const heading = typeof plane.track === "number" ? plane.track : null;
        const verticalRate = typeof plane.baro_rate === "number" ? plane.baro_rate * 0.00508 : typeof plane.geom_rate === "number" ? plane.geom_rate * 0.00508 : null;
        
        if (onGround || acLat === null || acLon === null) continue;
        
        const dist = calculateDistance(lat, lon, acLat, acLon);
        if (dist > AIR_TRAFFIC_RADIUS_KM) continue;
        
        if (dist < minDistance) minDistance = dist;
        
        const acBearingRad = Math.atan2(
          Math.sin((acLon - lon) * Math.PI / 180) * Math.cos(acLat * Math.PI / 180),
          Math.cos(lat * Math.PI / 180) * Math.sin(acLat * Math.PI / 180) - Math.sin(lat * Math.PI / 180) * Math.cos(acLat * Math.PI / 180) * Math.cos((acLon - lon) * Math.PI / 180)
        );
        const acBearing = ((acBearingRad * 180 / Math.PI) + 360) % 360;
        
        aircraftNearby.push({
          icao24: icao24,
          callsign: callsign,
          latitude: acLat,
          longitude: acLon,
          altitude: altitude,
          velocity: velocity,
          heading: heading,
          verticalRate: verticalRate,
          distance: Math.round(dist),
          bearing: Math.round(acBearing),
          timestamp: Date.now()
        });
      }
      
      aircraftNearby.sort((a, b) => a.distance - b.distance);
      result.airTraffic.aircraft = aircraftNearby.slice(0, 50);
      result.airTraffic.aircraftCount = aircraftNearby.length;
      result.airTraffic.minAircraftDistance = minDistance === Infinity ? null : Math.round(minDistance);
      
      alertManager.registerDataPoint("aircraft_nearby", aircraftNearby.length, "", "aircraft_tracking", "INFORMATIONAL");
      
      if (aircraftNearby.length > 20) {
        alertManager.addAlert(`Air traffic density is high, with ${aircraftNearby.length} aircraft within ${AIR_TRAFFIC_RADIUS_KM} km.`, "INFO", "AIR_TRAFFIC", "aircraft_tracking", { count: aircraftNearby.length, minDistance: minDistance });
      }
      
      const trackingEntry = {
        timestamp: Date.now(),
        aircraftCount: aircraftNearby.length,
        minDistance: minDistance === Infinity ? null : minDistance
      };
      result.airTraffic.trackingTimeSeries.push(trackingEntry);
      alertManager.registerHistoricalData("aircraft_tracking", [trackingEntry]);
    } else {
      alertManager.updateDataSourceStatus("aircraft_tracking", "FAILED", aircraftRes.responseTime, aircraftRes.error || "All three aircraft feeds (adsb.lol, airplanes.live, and adsb.one) were unavailable.");
    }
    
    if (temperature !== null && humidity !== null && windSpeed !== null && historicalDailyData.length >= 7) {
      const T = temperature;
      const H = humidity;
      const W = windSpeed * 3.6;
      
      let mo = 0;
      if (H < 100) {
        if (H <= 22) {
          mo = 0.942 * Math.pow(H, 0.679) + 11 * Math.exp((H - 100) / 10);
        } else if (H <= 76) {
          mo = 2.22 * Math.pow(H, 0.356) + 0.28 * H - 0.11 * T + 0.01;
        } else {
          mo = 21.06 + 0.0023 * Math.pow(100 - H, 2) + 0.0172 * T;
        }
      } else {
        mo = 147.2 * (101 - H) / (59.5 + T);
      }
      
      let ffmcValue = 59.5 * (250 - mo) / (147.2 + mo);
      ffmcValue = Math.max(0, Math.min(101, ffmcValue));
      
      let dmcValue = 6;
      for (let i = Math.max(0, historicalDailyData.length - 7); i < historicalDailyData.length; i++) {
        const day = historicalDailyData[i];
        if (day.tempMean === null || day.humidity === null) continue;
        
        const dayTemp = Math.max(-1.1, day.tempMean);
        const dayRH = day.humidity;
        const dayPrecip = day.precip || 0;
        
        if (dayPrecip > 1.5) {
          const re = 0.92 * dayPrecip - 1.27;
          let mo_dmc = 20.0 + Math.exp(5.6348 - dmcValue / 43.43);
          if (dmcValue <= 33) {
            const b = 100.0 / (0.5 + 0.3 * dmcValue);
            mo_dmc = mo_dmc + 1000.0 * re / (48.77 + b * re);
          } else if (dmcValue <= 65) {
            const b = 14.0 - 1.3 * Math.log(dmcValue);
            mo_dmc = mo_dmc + 1000.0 * re / (48.77 + b * re);
          } else {
            const b = 6.2 * Math.log(dmcValue) - 17.2;
            mo_dmc = mo_dmc + 1000.0 * re / (48.77 + b * re);
          }
          dmcValue = 244.72 - 43.43 * Math.log(mo_dmc - 20.0);
          if (dmcValue < 0) dmcValue = 0;
        }
        
        if (dayTemp > -1.1) {
          const k = 1.894 * (dayTemp + 1.1) * (100 - dayRH) * 0.0001;
          dmcValue = dmcValue + 100.0 * k;
        }
      }
      dmcValue = Math.max(0, dmcValue);
      
      let dcValue = 15;
      for (let i = Math.max(0, historicalDailyData.length - 14); i < historicalDailyData.length; i++) {
        const day = historicalDailyData[i];
        if (day.tempMean === null) continue;
        
        const dayTemp = day.tempMean;
        const dayPrecip = day.precip || 0;
        
        if (dayPrecip > 2.8) {
          const rd = 0.83 * dayPrecip - 1.27;
          const qo = 800.0 * Math.exp(-dcValue / 400.0);
          const qr = qo + 3.937 * rd;
          dcValue = 400.0 * Math.log(800.0 / qr);
          if (dcValue < 0) dcValue = 0;
        }
        
        if (dayTemp > -2.8) {
          const v = 0.36 * (dayTemp + 2.8) + 0.0001;
          dcValue = dcValue + 0.5 * v;
        }
      }
      dcValue = Math.max(0, dcValue);
      
      let buiValue = 0;
      if (dmcValue <= 0.4 * dcValue) {
        buiValue = 0.8 * dmcValue * dcValue / (dmcValue + 0.4 * dcValue);
      } else {
        buiValue = dmcValue - (1.0 - 0.8 * dcValue / (dmcValue + 0.4 * dcValue)) * (0.92 + Math.pow(0.0114 * dmcValue, 1.7));
      }
      buiValue = Math.max(0, buiValue);
      
      let m = 147.2 * (101 - ffmcValue) / (59.5 + ffmcValue);
      let fW = Math.exp(0.05039 * W);
      let fF = 91.9 * Math.exp(-0.1386 * m) * (1 + Math.pow(m, 5.31) / 49300000);
      let isiValue = 0.208 * fW * fF;
      
      let fwiValue = 0;
      if (buiValue <= 80) {
        fwiValue = 0.1 * isiValue * (0.626 * Math.pow(buiValue, 0.809) + 2);
      } else {
        fwiValue = 0.1 * isiValue * (1000 / (25 + 108.64 * Math.exp(-0.023 * buiValue)));
      }
      fwiValue = Math.max(0, Math.min(100, fwiValue));
      
      result.localHazards.fireRisk.index = parseFloat(fwiValue.toFixed(1));
      result.localHazards.fireRisk.dataAvailable = true;
      result.localHazards.fireRisk.components = {
        ffmc: parseFloat(ffmcValue.toFixed(1)),
        dmc: parseFloat(dmcValue.toFixed(1)),
        dc: parseFloat(dcValue.toFixed(1)),
        isi: parseFloat(isiValue.toFixed(2)),
        bui: parseFloat(buiValue.toFixed(1))
      };
      
      if (fwiValue < 10) {
        result.localHazards.fireRisk.category = "LOW";
      } else if (fwiValue < 20) {
        result.localHazards.fireRisk.category = "MODERATE";
      } else if (fwiValue < 35) {
        result.localHazards.fireRisk.category = "HIGH";
      } else if (fwiValue < 50) {
        result.localHazards.fireRisk.category = "VERY_HIGH";
      } else {
        result.localHazards.fireRisk.category = "EXTREME";
      }
      
      alertManager.registerDataPoint("fire_risk_index", fwiValue, "", "fire_assessment", "OPERATIONAL");
      alertManager.updateDataSourceStatus("fire_assessment", "AVAILABLE", 0);
      
      if (result.localHazards.fireRisk.category === "EXTREME") {
        alertManager.addAlert(`Extreme fire weather conditions: FWI ${fwiValue.toFixed(1)}`, "CRITICAL", "FIRE", "fire_assessment", { fwi: fwiValue, category: "EXTREME", components: result.localHazards.fireRisk.components });
      } else if (result.localHazards.fireRisk.category === "VERY_HIGH") {
        alertManager.addAlert(`Very high fire weather risk: FWI ${fwiValue.toFixed(1)}`, "WARNING", "FIRE", "fire_assessment", { fwi: fwiValue, category: "VERY_HIGH", components: result.localHazards.fireRisk.components });
      } else if (result.localHazards.fireRisk.category === "HIGH") {
        alertManager.addAlert(`Elevated fire weather risk: FWI ${fwiValue.toFixed(1)}`, "ADVISORY", "FIRE", "fire_assessment", { fwi: fwiValue, category: "HIGH", components: result.localHazards.fireRisk.components });
      }
    } else if (temperature !== null && humidity !== null && windSpeed !== null) {
      alertManager.updateDataSourceStatus("fire_assessment", "DEGRADED", 0, "Insufficient historical weather data for full FWI calculation");
    } else {
      alertManager.updateDataSourceStatus("fire_assessment", "FAILED", 0, "Insufficient current weather data for FWI calculation");
    }
    
    const seismicEndDate = new Date();
    const seismicStartDate = new Date(seismicEndDate);
    seismicStartDate.setFullYear(seismicStartDate.getFullYear() - 1);
    const seismicStartStr = seismicStartDate.toISOString().split('.')[0];
    const seismicEndStr = seismicEndDate.toISOString().split('.')[0];
    
    const SEISMIC_SEARCH_RADIUS_KM = 1000;
    const latOffset = SEISMIC_SEARCH_RADIUS_KM / 111.0;
    const lonOffset = SEISMIC_SEARCH_RADIUS_KM / (111.0 * Math.cos(lat * Math.PI / 180));
    const minLat = (lat - latOffset).toFixed(4);
    const maxLat = (lat + latOffset).toFixed(4);
    const minLon = (lon - lonOffset).toFixed(4);
    const maxLon = (lon + lonOffset).toFixed(4);
    
    const yearlyQuakeUrl = `${API_ENDPOINTS.USGS_EARTHQUAKE_QUERY}?format=geojson&starttime=${seismicStartStr}&endtime=${seismicEndStr}&minmagnitude=2.5&minlatitude=${minLat}&maxlatitude=${maxLat}&minlongitude=${minLon}&maxlongitude=${maxLon}&orderby=time&limit=5000`;
    const yearlyQuakeRes = await makeApiRequestWithBackoff(yearlyQuakeUrl, {}, 20000, 2);
    const seismicTimeSeries = [];
    
    if (yearlyQuakeRes.status === 200 && yearlyQuakeRes.data?.features) {
      alertManager.updateDataSourceStatus("historical_seismic", "AVAILABLE", yearlyQuakeRes.responseTime);
      for (const f of yearlyQuakeRes.data.features) {
        const eqLat = f.geometry.coordinates[1];
        const eqLon = f.geometry.coordinates[0];
        const dist = calculateDistance(lat, lon, eqLat, eqLon);
        if (dist <= SEISMIC_SEARCH_RADIUS_KM) {
          seismicTimeSeries.push({
            timestamp: f.properties.time,
            magnitude: f.properties.mag,
            distance: Math.round(dist),
            depth: f.geometry.coordinates[2],
            location: f.properties.place,
            id: f.id,
            significance: f.properties.sig
          });
        }
      }
      
      if (seismicTimeSeries.length > 0) {
        result.historicalSeismic.timeSeries = seismicTimeSeries.sort((a, b) => a.timestamp - b.timestamp);
        alertManager.registerHistoricalData("seismic_events", seismicTimeSeries);
        
        const magnitudes = seismicTimeSeries.map(s => s.magnitude).filter(m => m !== null && !isNaN(m));
        if (magnitudes.length > 0) {
          result.historicalSeismic.statistics = {
            totalEvents: seismicTimeSeries.length,
            minMagnitude: Math.min(...magnitudes),
            maxMagnitude: Math.max(...magnitudes),
            meanMagnitude: magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length,
            significantEvents: seismicTimeSeries.filter(s => s.magnitude >= 4.0).length,
            majorEvents: seismicTimeSeries.filter(s => s.magnitude >= 5.0).length,
            nearbyEvents: seismicTimeSeries.filter(s => s.distance < 100).length,
            searchRadiusKm: SEISMIC_SEARCH_RADIUS_KM
          };
        } else {
          result.historicalSeismic.statistics = {
            totalEvents: seismicTimeSeries.length,
            minMagnitude: 0,
            maxMagnitude: 0,
            meanMagnitude: 0,
            significantEvents: 0,
            majorEvents: 0,
            nearbyEvents: 0,
            searchRadiusKm: SEISMIC_SEARCH_RADIUS_KM
          };
        }
        
        const monthlyBins = {};
        for (const eq of seismicTimeSeries) {
          const date = new Date(eq.timestamp);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          if (!monthlyBins[monthKey]) {
            monthlyBins[monthKey] = [];
          }
          monthlyBins[monthKey].push(eq);
        }
        
        result.seismicTrends.recentActivity = Object.entries(monthlyBins)
          .sort(([a], [b]) => b.localeCompare(a))
          .slice(0, 12)
          .map(([month, events]) => ({
            month,
            eventCount: events.length,
            maxMagnitude: events.length > 0 ? Math.max(...events.map(e => e.magnitude)) : 0,
            averageMagnitude: events.length > 0 ? events.reduce((sum, e) => sum + e.magnitude, 0) / events.length : 0
          }));
        
        result.seismicTrends.significantEvents = seismicTimeSeries.filter(s => s.magnitude >= 4.5).slice(-10);
        
        const last30Days = seismicTimeSeries.filter(s => Date.now() - s.timestamp < 30 * 24 * 60 * 60 * 1000);
        const last90Days = seismicTimeSeries.filter(s => Date.now() - s.timestamp < 90 * 24 * 60 * 60 * 1000);
        
        result.seismicTrends.magnitudeTrends = {
          last30Days: {
            count: last30Days.length,
            maxMagnitude: last30Days.length > 0 ? Math.max(...last30Days.map(e => e.magnitude)) : 0,
            averageMagnitude: last30Days.length > 0 ? last30Days.reduce((sum, e) => sum + e.magnitude, 0) / last30Days.length : 0
          },
          last90Days: {
            count: last90Days.length,
            maxMagnitude: last90Days.length > 0 ? Math.max(...last90Days.map(e => e.magnitude)) : 0,
            averageMagnitude: last90Days.length > 0 ? last90Days.reduce((sum, e) => sum + e.magnitude, 0) / last90Days.length : 0
          }
        };
        
        if (result.historicalSeismic.statistics.maxMagnitude >= 5.0) {
          alertManager.registerDataPoint("seismic_magnitude_max_24h", result.historicalSeismic.statistics.maxMagnitude, "magnitude", "historical_seismic", "SAFETY_CRITICAL");
        }
        
        if (result.seismicTrends.magnitudeTrends.last30Days.count > 50) {
          alertManager.addAlert(`High seismic activity: ${result.seismicTrends.magnitudeTrends.last30Days.count} events within ${SEISMIC_SEARCH_RADIUS_KM}km in last 30 days`, "ADVISORY", "SEISMIC", "historical_seismic", 
            { recentEvents: result.seismicTrends.magnitudeTrends.last30Days.count, maxMagnitude: result.seismicTrends.magnitudeTrends.last30Days.maxMagnitude, searchRadiusKm: SEISMIC_SEARCH_RADIUS_KM });
        }
        
        if (result.seismicTrends.magnitudeTrends.last30Days.maxMagnitude >= 4.5) {
          alertManager.addAlert(`Significant earthquake activity: M${result.seismicTrends.magnitudeTrends.last30Days.maxMagnitude.toFixed(1)} within ${SEISMIC_SEARCH_RADIUS_KM}km in last 30 days`, "WARNING", "SEISMIC", "historical_seismic", 
            { maxMagnitude: result.seismicTrends.magnitudeTrends.last30Days.maxMagnitude, searchRadiusKm: SEISMIC_SEARCH_RADIUS_KM });
        }
      }
    } else {
      alertManager.updateDataSourceStatus("historical_seismic", "FAILED", yearlyQuakeRes.responseTime, yearlyQuakeRes.error || "The historical seismic query failed.");
    }
    
    const earthquakeRes = await makeApiRequestWithBackoff(API_ENDPOINTS.USGS_EARTHQUAKE_DAY, {}, 8000, 1);
    
    if (earthquakeRes.status === 200 && earthquakeRes.data?.features) {
      alertManager.updateDataSourceStatus("seismic_data", "AVAILABLE", earthquakeRes.responseTime);
      const nearbyQuakes = earthquakeRes.data.features.map(f => {
        const eqLat = f.geometry.coordinates[1];
        const eqLon = f.geometry.coordinates[0];
        const dist = calculateDistance(lat, lon, eqLat, eqLon);
        return { id: f.id, magnitude: f.properties.mag, location: f.properties.place, distance: Math.round(dist), depth: f.geometry.coordinates[2], time: f.properties.time };
      }).filter(q => q.distance <= SEISMIC_SEARCH_RADIUS_KM).sort((a, b) => a.distance - b.distance).slice(0, 10);
      
      result.localHazards.geospatialHazards.earthquakes = nearbyQuakes;
      alertManager.registerDataPoint("nearby_earthquakes", nearbyQuakes.length, "", "seismic_data", "INFORMATIONAL");
      
      const significantQuakes = nearbyQuakes.filter(q => q.magnitude >= 4.0 && q.distance < 200);
      if (significantQuakes.length > 0) {
        alertManager.addAlert(`${significantQuakes.length} significant earthquake(s) M4.0+ within 200km in last 24h`, "WARNING", "SEISMIC", "seismic_data", { earthquakes: significantQuakes });
      } else if (nearbyQuakes.length > 5) {
        alertManager.addAlert(`${nearbyQuakes.length} seismic events detected within ${SEISMIC_SEARCH_RADIUS_KM}km in last 24h`, "INFO", "SEISMIC", "seismic_data", { count: nearbyQuakes.length, searchRadiusKm: SEISMIC_SEARCH_RADIUS_KM });
      }
    } else {
      alertManager.updateDataSourceStatus("seismic_data", "FAILED", earthquakeRes.responseTime, earthquakeRes.error || "Seismic data is unavailable.");
    }
    
    const marineUrl = `${API_ENDPOINTS.OPEN_METEO_MARINE}?latitude=${lat}&longitude=${lon}&cell_selection=sea&hourly=wave_height,wave_direction,wave_period&forecast_days=3&timezone=UTC`;
    const marineRes = await makeApiRequestWithBackoff(marineUrl, {}, 10000, 2);
    
    if (marineRes.status === 200 && marineRes.data?.hourly) {
      alertManager.updateDataSourceStatus("marine_conditions", "AVAILABLE", marineRes.responseTime);
      const idx = new Date().getUTCHours();
      const waveHeight = marineRes.data.hourly.wave_height ? marineRes.data.hourly.wave_height[idx] : null;
      
      if (waveHeight !== null) {
        result.localHazards.seaConditions.waveHeight = waveHeight;
        if (waveHeight < 0.5) result.localHazards.seaConditions.seaState = "CALM";
        else if (waveHeight < 1.5) result.localHazards.seaConditions.seaState = "SLIGHT";
        else if (waveHeight < 3) result.localHazards.seaConditions.seaState = "MODERATE";
        else if (waveHeight < 5) result.localHazards.seaConditions.seaState = "ROUGH";
        else result.localHazards.seaConditions.seaState = "VERY_ROUGH";
        
        alertManager.registerDataPoint("wave_height", waveHeight, "m", "marine_conditions", "OPERATIONAL");
      }
      
      const waveTimeSeries = [];
      for (let i = 0; i < Math.min(72, marineRes.data.hourly.time?.length || 0); i++) {
        if (marineRes.data.hourly.wave_height && marineRes.data.hourly.wave_height[i] !== null) {
          waveTimeSeries.push({
            timestamp: new Date(marineRes.data.hourly.time[i]).getTime(),
            waveHeight: marineRes.data.hourly.wave_height[i],
            waveDirection: marineRes.data.hourly.wave_direction ? marineRes.data.hourly.wave_direction[i] : null,
            wavePeriod: marineRes.data.hourly.wave_period ? marineRes.data.hourly.wave_period[i] : null
          });
        }
      }
      if (waveTimeSeries.length > 0) {
        alertManager.registerHistoricalData("wave_forecast", waveTimeSeries);
      }
    } else {
      alertManager.updateDataSourceStatus("marine_conditions", "FAILED", marineRes.responseTime, marineRes.error || "Marine data is unavailable.");
    }
    
    const safeIntegration = (promise, label, fallback) => promise.catch(error => {
      alertManager.addAlert(`The ${label.toLowerCase()} integration could not be loaded. ${displayReasonSentence(error.message)}`, "INFO", "SYSTEM_INTEGRATION", "integrations", {});
      return fallback;
    });
    const place = await safeIntegration(reverseGeocode(lat, lon), "Location lookup", null);
    const countryCode = place?.countryCode || null;
    result.locationRegion = place ? { country: place.country, countryCode, names: place.names } : null;
    const [officialWarnings, comfort, airQuality, purpleAir, garden, tides, riverGauges, floodForecast, tropicalHazards, nearestObservation] = await Promise.all([
      safeIntegration(fetchOfficialWarnings(lat, lon, alertManager), "Official warnings", { coverage: "UNKNOWN", provider: null, region: null, warnings: [], matchMethod: null }),
      safeIntegration(fetchComfortConditions(lat, lon, alertManager), "Comfort conditions", { dataAvailable: false, timezone: null, utcOffsetSeconds: 0 }),
      safeIntegration(fetchAirQuality(lat, lon, alertManager), "Air quality", { dataAvailable: false, hourly: [], pollen: {} }),
      safeIntegration(fetchPurpleAir(lat, lon, alertManager), "PurpleAir sensors", { configured: false, dataAvailable: false, sensors: [], nearest: null }),
      safeIntegration(fetchGardenConditions(lat, lon, alertManager), "Garden conditions", { dataAvailable: false, daily: [] }),
      safeIntegration(fetchTides(lat, lon, countryCode, alertManager), "Tides", { dataAvailable: false, extremes: [], series: [] }),
      safeIntegration(fetchRiverGauges(lat, lon, countryCode, alertManager), "River gauges", { dataAvailable: false, gauges: [] }),
      safeIntegration(fetchFloodForecast(lat, lon, alertManager), "Flood forecast", { dataAvailable: false, series: [] }),
      safeIntegration(fetchTropicalAndGlobalHazards(lat, lon, alertManager), "Tropical and global hazards", { storms: [], events: [], nearestStormKm: null }),
      safeIntegration(fetchNearestObservation(lat, lon, alertManager), "Nearest observation", { dataAvailable: false, station: null })
    ]);
    result.officialWarnings = officialWarnings;
    result.comfort = comfort;
    result.airQuality = airQuality;
    result.purpleAir = purpleAir;
    result.garden = garden;
    result.tides = tides;
    result.riverGauges = riverGauges;
    result.floodForecast = floodForecast;
    result.tropicalHazards = tropicalHazards;
    result.nearestObservation = nearestObservation;
    result.locationTimezone = comfort.timezone || null;
    result.sunMoon = computeSunMoon(lat, lon, comfort.utcOffsetSeconds || 0);

    if (alertManager.dataSourceStatus.get("geomagnetic_indices")?.status === "PENDING") alertManager.updateDataSourceStatus("geomagnetic_indices", "FAILED", 0, "Solar wind magnetic field data was is unavailable.");
    const fullReport = alertManager.getFullReport();
    result.violations = fullReport.violations;
    result.alerts = fullReport.alerts;
    result.alertManager = { dataSources: fullReport.dataSources, dataPoints: fullReport.dataPoints, summary: fullReport.summary, decision: fullReport.decision, historicalData: fullReport.historicalData };
    result.status = "AVAILABLE";
  } catch (error) {
    alertManager.addAlert(`Critical error in Local Conditions & Hazards module: ${error.message}`, "CRITICAL", "SYSTEM", "ground_environment", { errorStack: error.stack });
    const fullReport = alertManager.getFullReport();
    result.status = "FAILED";
    result.violations = fullReport.violations;
    result.alerts = fullReport.alerts;
    result.alertManager = { dataSources: fullReport.dataSources, dataPoints: fullReport.dataPoints, summary: fullReport.summary, historicalData: fullReport.historicalData };
  }
  
  return result;
}

async function atmosphericEnvironmentSystem(lat, lon) {
  const startTime = Date.now();
  const alertManager = new AlertManager();
  
  const CRITICAL_SHEAR_THRESHOLD = 15;
  const WARNING_SHEAR_THRESHOLD = 25;
  
  const estimateAltitudeFromPressure = (pressureHPa) => {
    return 44330 * (1 - Math.pow(pressureHPa / 1013.25, 0.1903));
  };
  
  const result = {
    status: "NO_DATA",
    timestamp: new Date().toISOString(),
    windShearAnalysis: { maxShear: null, jetStreamData: null },
    atmosphericDensity: { densityProfile: [], scaleHeight: null },
    shearProfile: { verticalProfile: [], criticalLayers: [], warningLayers: [] },
    freezeLine: { height: null, icingRisk: null },
    cloudAnalysis: {
      current: { totalCover: null, lowCover: null, midCover: null, highCover: null, cloudBaseHeight: null, precipitableWater: null, precipitationRate: null, weatherCode: null },
      layers: [],
      cumulusPenetration: { altitude: null, risk: null },
      precipitatingClouds: { detected: false, type: null, intensity: null },
      opticalVisibility: { impacted: false, degradation: null },
      historicalCloud: { timeSeries: [], statistics: {} }
    },
    humidityProfile: {
      current: { surface: null, levels: {} },
      layers: [],
      frostFormation: { risk: null, riskIndex: null, criticalAltitudes: [] },
      staticElectricity: { risk: null, riskIndex: null, concernLayers: [] },
      condensation: { concern: null, dewpointDepression: null, condensationRisk: null },
      historicalHumidity: { timeSeries: [], statistics: {} }
    },
    temperatureInversions: {
      detected: [],
      lowLevelInversions: [],
      strongestInversion: null,
      strongestLowLevelInversion: null,
      acousticPropagation: { impacted: false, channeling: null, enhancementFactor: null },
      pollutantDispersion: { impacted: false, trappingAltitude: null, dispersalRating: null },
      fogPotential: { probability: null, type: null, formationConditions: null },
      atmosphericStability: { index: null, classification: null },
      historicalInversions: { timeSeries: [], statistics: { frequency: 0, meanStrength: 0, maxStrength: 0, strongInversionHours: 0, meanBaseHeight: null } }
    },
    convectiveAnalysis: {
      cape: null,
      liftedIndex: null,
      convectiveRisk: null,
      thunderstormPotential: null
    },
    cosmicRayAnalysis: {
      station: null,
      neutronCounts: null,
      percentDeviation: null,
      status: "NO_DATA"
    },
    violations: [],
    alerts: [],
    alertManager: null,
    historicalAtmospheric: { timeSeries: [], statistics: {} }
  };
  
  try {
    alertManager.registerDataSource("atmospheric_profile", "PRIMARY", "Multi-level atmospheric data");
    alertManager.registerDataSource("historical_atmospheric", "OPERATIONAL", "30-day atmospheric history");
    alertManager.registerDataSource("cloud_analysis", "SAFETY_CRITICAL", "Cloud layer and precipitation data");
    alertManager.registerDataSource("humidity_profile", "OPERATIONAL", "Multi-level humidity and moisture data");
    alertManager.registerDataSource("temperature_inversions", "OPERATIONAL", "Temperature inversion detection");
    alertManager.registerDataSource("historical_cloud", "INFORMATIONAL", "30-day cloud cover history");
    alertManager.registerDataSource("historical_humidity", "INFORMATIONAL", "30-day humidity history");
    alertManager.registerDataSource("convective_indices", "SAFETY_CRITICAL", "Atmospheric stability indices");
    alertManager.registerDataSource("cosmic_ray_monitoring", "INFORMATIONAL", "Ground-level neutron monitoring");
    
    const archiveEndDate = new Date();
    archiveEndDate.setDate(archiveEndDate.getDate() - 6);
    const archiveStartDate = new Date(archiveEndDate);
    archiveStartDate.setDate(archiveStartDate.getDate() - 30);
    const startDateStr = archiveStartDate.toISOString().split('T')[0];
    const endDateStr = archiveEndDate.toISOString().split('T')[0];
    
    const historicalAtmoUrl = `${API_ENDPOINTS.OPEN_METEO_ARCHIVE}?latitude=${lat}&longitude=${lon}&start_date=${startDateStr}&end_date=${endDateStr}&hourly=temperature_2m,relative_humidity_2m,dewpoint_2m,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,precipitation,wind_speed_10m,wind_speed_100m,wind_direction_10m,wind_direction_100m,wind_gusts_10m,surface_pressure,weather_code&timezone=UTC`;    
    const historicalAtmoRes = await makeApiRequestWithBackoff(historicalAtmoUrl, {}, 30000, 2);
    
    if (historicalAtmoRes.status === 200 && historicalAtmoRes.data?.hourly) {
      alertManager.updateDataSourceStatus("historical_atmospheric", "AVAILABLE", historicalAtmoRes.responseTime);
      const h = historicalAtmoRes.data.hourly;
      const timeSeriesData = [];
      const cloudTimeSeries = [];
      const humidityTimeSeries = [];
      const inversionTimeSeries = [];
      
      for (let i = 0; i < (h.time?.length || 0); i++) {
        const dataPoint = { timestamp: h.time[i] };
        const cloudPoint = { timestamp: h.time[i] };
        const humidityPoint = { timestamp: h.time[i] };
        
        if (h.temperature_2m && h.temperature_2m[i] !== null) dataPoint.temp_surface = h.temperature_2m[i];
        if (h.wind_speed_10m && h.wind_speed_10m[i] !== null) dataPoint.wind_10m = h.wind_speed_10m[i];
        if (h.wind_speed_100m && h.wind_speed_100m[i] !== null) dataPoint.wind_100m = h.wind_speed_100m[i];
        if (h.wind_direction_10m && h.wind_direction_10m[i] !== null) dataPoint.wind_dir_10m = h.wind_direction_10m[i];
        if (h.wind_gusts_10m && h.wind_gusts_10m[i] !== null) dataPoint.wind_gusts = h.wind_gusts_10m[i];
        if (h.surface_pressure && h.surface_pressure[i] !== null) dataPoint.pressure = h.surface_pressure[i];
        
        if (h.cloud_cover && h.cloud_cover[i] !== null) cloudPoint.totalCover = h.cloud_cover[i];
        if (h.cloud_cover_low && h.cloud_cover_low[i] !== null) cloudPoint.lowCover = h.cloud_cover_low[i];
        if (h.cloud_cover_mid && h.cloud_cover_mid[i] !== null) cloudPoint.midCover = h.cloud_cover_mid[i];
        if (h.cloud_cover_high && h.cloud_cover_high[i] !== null) cloudPoint.highCover = h.cloud_cover_high[i];
        if (h.precipitation && h.precipitation[i] !== null) cloudPoint.precipitation = h.precipitation[i];
        if (h.weather_code && h.weather_code[i] !== null) cloudPoint.weatherCode = h.weather_code[i];
        
        if (h.relative_humidity_2m && h.relative_humidity_2m[i] !== null) humidityPoint.surfaceRH = h.relative_humidity_2m[i];
        if (h.dewpoint_2m && h.dewpoint_2m[i] !== null) humidityPoint.surfaceDewpoint = h.dewpoint_2m[i];
        if (h.temperature_2m && h.temperature_2m[i] !== null) humidityPoint.surfaceTemp = h.temperature_2m[i];
        
        if (humidityPoint.surfaceTemp !== undefined && humidityPoint.surfaceDewpoint !== undefined) {
          humidityPoint.dewpointDepression = humidityPoint.surfaceTemp - humidityPoint.surfaceDewpoint;
        }
        
        let inversionIndicator = 0;
        if (dataPoint.wind_10m !== undefined && dataPoint.wind_100m !== undefined) {
          const windShear10to100 = Math.abs(dataPoint.wind_100m - dataPoint.wind_10m);
          if (windShear10to100 < 1 && humidityPoint.dewpointDepression !== undefined && humidityPoint.dewpointDepression < 3) {
            inversionIndicator = 0.5 + (3 - humidityPoint.dewpointDepression) * 0.3;
          }
        }
        
        inversionTimeSeries.push({
          timestamp: h.time[i],
          maxStrength: inversionIndicator,
          baseHeight: inversionIndicator > 0 ? 100 : null,
          indicator: inversionIndicator > 0.5 ? "PROBABLE" : inversionIndicator > 0 ? "POSSIBLE" : "UNLIKELY"
        });
        
        timeSeriesData.push(dataPoint);
        cloudTimeSeries.push(cloudPoint);
        humidityTimeSeries.push(humidityPoint);
      }
      
      result.historicalAtmospheric.timeSeries = timeSeriesData;
      result.cloudAnalysis.historicalCloud.timeSeries = cloudTimeSeries;
      result.humidityProfile.historicalHumidity.timeSeries = humidityTimeSeries;
      result.temperatureInversions.historicalInversions.timeSeries = inversionTimeSeries;
      
      alertManager.registerHistoricalData("historical_atmospheric", timeSeriesData);
      alertManager.registerHistoricalData("historical_cloud", cloudTimeSeries);
      alertManager.registerHistoricalData("historical_humidity", humidityTimeSeries);
      alertManager.registerHistoricalData("historical_inversions", inversionTimeSeries);
      alertManager.updateDataSourceStatus("historical_cloud", "AVAILABLE", historicalAtmoRes.responseTime);
      alertManager.updateDataSourceStatus("historical_humidity", "AVAILABLE", historicalAtmoRes.responseTime);
      
      const wind10Values = timeSeriesData.filter(d => d.wind_10m !== null && d.wind_10m !== undefined).map(d => d.wind_10m);
      const wind100Values = timeSeriesData.filter(d => d.wind_100m !== null && d.wind_100m !== undefined).map(d => d.wind_100m);
      const tempValues = timeSeriesData.filter(d => d.temp_surface !== null && d.temp_surface !== undefined).map(d => d.temp_surface);
      const gustValues = timeSeriesData.filter(d => d.wind_gusts !== null && d.wind_gusts !== undefined).map(d => d.wind_gusts);
      
      if (wind10Values.length > 0) {
        const wind10Mean = wind10Values.reduce((a, b) => a + b, 0) / wind10Values.length;
        result.historicalAtmospheric.statistics.wind10m = {
          min: Math.min(...wind10Values),
          max: Math.max(...wind10Values),
          mean: wind10Mean,
          stdDev: Math.sqrt(wind10Values.reduce((acc, val) => acc + Math.pow(val - wind10Mean, 2), 0) / wind10Values.length)
        };
      }
      
      if (wind100Values.length > 0) {
        const wind100Mean = wind100Values.reduce((a, b) => a + b, 0) / wind100Values.length;
        result.historicalAtmospheric.statistics.wind100m = {
          min: Math.min(...wind100Values),
          max: Math.max(...wind100Values),
          mean: wind100Mean,
          stdDev: Math.sqrt(wind100Values.reduce((acc, val) => acc + Math.pow(val - wind100Mean, 2), 0) / wind100Values.length)
        };
        
        const highWindEvents = wind100Values.filter(w => w > 20).length;
        result.historicalAtmospheric.statistics.highWindFrequency = {
          events: highWindEvents,
          percentage: (highWindEvents / wind100Values.length) * 100,
          maxSpeed: Math.max(...wind100Values)
        };
      }
      
      if (tempValues.length > 0) {
        result.historicalAtmospheric.statistics.temperature = {
          min: Math.min(...tempValues),
          max: Math.max(...tempValues),
          mean: tempValues.reduce((a, b) => a + b, 0) / tempValues.length
        };
      }
      
      if (gustValues.length > 0) {
        const severeGustEvents = gustValues.filter(g => g > 15).length;
        result.historicalAtmospheric.statistics.gustEvents = {
          count: severeGustEvents,
          percentage: (severeGustEvents / gustValues.length) * 100,
          maxGust: Math.max(...gustValues)
        };
        
        if (severeGustEvents > gustValues.length * 0.1) {
          alertManager.addAlert(`Frequent gust events: ${severeGustEvents} occurrences (${((severeGustEvents / gustValues.length) * 100).toFixed(1)}%)`, "ADVISORY", "ATMOSPHERIC", "historical_atmospheric", 
            { gustEvents: severeGustEvents, maxGust: Math.max(...gustValues) });
        }
      }
      
      const totalCoverValues = cloudTimeSeries.filter(d => d.totalCover !== null && d.totalCover !== undefined).map(d => d.totalCover);
      const lowCoverValues = cloudTimeSeries.filter(d => d.lowCover !== null && d.lowCover !== undefined).map(d => d.lowCover);
      const midCoverValues = cloudTimeSeries.filter(d => d.midCover !== null && d.midCover !== undefined).map(d => d.midCover);
      const highCoverValues = cloudTimeSeries.filter(d => d.highCover !== null && d.highCover !== undefined).map(d => d.highCover);
      const precipValues = cloudTimeSeries.filter(d => d.precipitation !== null && d.precipitation !== undefined).map(d => d.precipitation);
      
      if (totalCoverValues.length > 0) {
        const totalCoverMean = totalCoverValues.reduce((a, b) => a + b, 0) / totalCoverValues.length;
        result.cloudAnalysis.historicalCloud.statistics.totalCover = {
          min: Math.min(...totalCoverValues),
          max: Math.max(...totalCoverValues),
          mean: totalCoverMean,
          stdDev: Math.sqrt(totalCoverValues.reduce((acc, val) => acc + Math.pow(val - totalCoverMean, 2), 0) / totalCoverValues.length),
          clearDays: totalCoverValues.filter(v => v < 25).length,
          overcastDays: totalCoverValues.filter(v => v > 75).length
        };
      }
      
      if (lowCoverValues.length > 0) {
        result.cloudAnalysis.historicalCloud.statistics.lowCover = {
          min: Math.min(...lowCoverValues),
          max: Math.max(...lowCoverValues),
          mean: lowCoverValues.reduce((a, b) => a + b, 0) / lowCoverValues.length,
          frequencyAbove50: (lowCoverValues.filter(v => v > 50).length / lowCoverValues.length) * 100
        };
      }
      
      if (midCoverValues.length > 0) {
        result.cloudAnalysis.historicalCloud.statistics.midCover = {
          min: Math.min(...midCoverValues),
          max: Math.max(...midCoverValues),
          mean: midCoverValues.reduce((a, b) => a + b, 0) / midCoverValues.length
        };
      }
      
      if (highCoverValues.length > 0) {
        result.cloudAnalysis.historicalCloud.statistics.highCover = {
          min: Math.min(...highCoverValues),
          max: Math.max(...highCoverValues),
          mean: highCoverValues.reduce((a, b) => a + b, 0) / highCoverValues.length
        };
      }
      
      if (precipValues.length > 0) {
        const precipEvents = precipValues.filter(v => v > 0).length;
        result.cloudAnalysis.historicalCloud.statistics.precipitation = {
          totalMm: precipValues.reduce((a, b) => a + b, 0),
          maxHourly: Math.max(...precipValues),
          precipHours: precipEvents,
          precipFrequency: (precipEvents / precipValues.length) * 100
        };
      }
      
      const surfaceRHValues = humidityTimeSeries.filter(d => d.surfaceRH !== null && d.surfaceRH !== undefined).map(d => d.surfaceRH);
      const dewpointDepressionValues = humidityTimeSeries.filter(d => d.dewpointDepression !== null && d.dewpointDepression !== undefined).map(d => d.dewpointDepression);
      
      if (surfaceRHValues.length > 0) {
        const surfaceRHMean = surfaceRHValues.reduce((a, b) => a + b, 0) / surfaceRHValues.length;
        result.humidityProfile.historicalHumidity.statistics.surfaceRH = {
          min: Math.min(...surfaceRHValues),
          max: Math.max(...surfaceRHValues),
          mean: surfaceRHMean,
          stdDev: Math.sqrt(surfaceRHValues.reduce((acc, val) => acc + Math.pow(val - surfaceRHMean, 2), 0) / surfaceRHValues.length),
          highHumidityHours: surfaceRHValues.filter(v => v > 85).length,
          lowHumidityHours: surfaceRHValues.filter(v => v < 30).length
        };
      }
      
      if (dewpointDepressionValues.length > 0) {
        const fogRiskHours = dewpointDepressionValues.filter(v => v < 3).length;
        result.humidityProfile.historicalHumidity.statistics.dewpointDepression = {
          min: Math.min(...dewpointDepressionValues),
          max: Math.max(...dewpointDepressionValues),
          mean: dewpointDepressionValues.reduce((a, b) => a + b, 0) / dewpointDepressionValues.length,
          fogRiskHours: fogRiskHours,
          fogRiskFrequency: (fogRiskHours / dewpointDepressionValues.length) * 100
        };
      }
      
      const inversionIndicators = inversionTimeSeries.filter(d => d.maxStrength > 0).map(d => d.maxStrength);
      const probableInversions = inversionTimeSeries.filter(d => d.indicator === "PROBABLE");
      const possibleInversions = inversionTimeSeries.filter(d => d.indicator === "POSSIBLE");
      
      result.temperatureInversions.historicalInversions.statistics = {
        frequency: inversionTimeSeries.length > 0 ? ((probableInversions.length + possibleInversions.length) / inversionTimeSeries.length) * 100 : 0,
        meanStrength: inversionIndicators.length > 0 ? inversionIndicators.reduce((a, b) => a + b, 0) / inversionIndicators.length : 0,
        maxStrength: inversionIndicators.length > 0 ? Math.max(...inversionIndicators) : 0,
        strongInversionHours: probableInversions.length,
        meanBaseHeight: probableInversions.length > 0 ? 100 : null,
        probableCount: probableInversions.length,
        possibleCount: possibleInversions.length,
        note: "Estimated From Surface Data (Low Dewpoint Depression and Calm Winds)"
      };
      
    } else {
      alertManager.updateDataSourceStatus("historical_atmospheric", "FAILED", historicalAtmoRes.responseTime, historicalAtmoRes.error || "Historical API is unavailable.");
      alertManager.updateDataSourceStatus("historical_cloud", "FAILED", historicalAtmoRes.responseTime, "Historical cloud data is unavailable.");
      alertManager.updateDataSourceStatus("historical_humidity", "FAILED", historicalAtmoRes.responseTime, "Historical humidity data is unavailable.");
      
      result.temperatureInversions.historicalInversions.statistics = {
        frequency: 0,
        meanStrength: 0,
        maxStrength: 0,
        strongInversionHours: 0,
        meanBaseHeight: null,
        note: "Historical Data Unavailable"
      };
    }
    
    const cloudUrl = `${API_ENDPOINTS.OPEN_METEO_FORECAST}?latitude=${lat}&longitude=${lon}&hourly=cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,precipitation,precipitation_probability,weather_code,cape,lifted_index&current=cloud_cover,precipitation,weather_code&timezone=UTC&forecast_days=1`;
    const cloudRes = await makeApiRequestWithBackoff(cloudUrl, {}, 15000, 2);
    
    if (cloudRes.status === 200 && cloudRes.data) {
      alertManager.updateDataSourceStatus("cloud_analysis", "AVAILABLE", cloudRes.responseTime);
      const h = cloudRes.data.hourly;
      const c = cloudRes.data.current;
      const idx = new Date().getUTCHours();
      
      if (c) {
        result.cloudAnalysis.current.totalCover = c.cloud_cover;
        result.cloudAnalysis.current.precipitationRate = c.precipitation;
        result.cloudAnalysis.current.weatherCode = c.weather_code;
      }
      
      if (h) {
        if (h.cloud_cover) result.cloudAnalysis.current.totalCover = h.cloud_cover[idx];
        if (h.cloud_cover_low) result.cloudAnalysis.current.lowCover = h.cloud_cover_low[idx];
        if (h.cloud_cover_mid) result.cloudAnalysis.current.midCover = h.cloud_cover_mid[idx];
        if (h.cloud_cover_high) result.cloudAnalysis.current.highCover = h.cloud_cover_high[idx];
        if (h.precipitation) result.cloudAnalysis.current.precipitationRate = h.precipitation[idx];
        if (h.weather_code) result.cloudAnalysis.current.weatherCode = h.weather_code[idx];
        if (h.cape) result.convectiveAnalysis.cape = h.cape[idx];
        if (h.lifted_index) result.convectiveAnalysis.liftedIndex = h.lifted_index[idx];
        
        if (result.cloudAnalysis.current.totalCover !== null) {
          alertManager.registerDataPoint("cloud_cover_total", result.cloudAnalysis.current.totalCover, "%", "cloud_analysis", "SAFETY_CRITICAL");
        }
        if (result.cloudAnalysis.current.lowCover !== null) {
          alertManager.registerDataPoint("cloud_cover_low", result.cloudAnalysis.current.lowCover, "%", "cloud_analysis", "SAFETY_CRITICAL");
        }
        if (result.cloudAnalysis.current.midCover !== null) {
          alertManager.registerDataPoint("cloud_cover_mid", result.cloudAnalysis.current.midCover, "%", "cloud_analysis", "OPERATIONAL");
        }
        if (result.cloudAnalysis.current.highCover !== null) {
          alertManager.registerDataPoint("cloud_cover_high", result.cloudAnalysis.current.highCover, "%", "cloud_analysis", "OPERATIONAL");
        }
        if (result.cloudAnalysis.current.precipitationRate !== null) {
          alertManager.registerDataPoint("precipitation_rate", result.cloudAnalysis.current.precipitationRate, "mm/h", "cloud_analysis", "SAFETY_CRITICAL");
        }
        
        if (result.convectiveAnalysis.cape !== null) {
          alertManager.registerDataPoint("convective_available_potential_energy", result.convectiveAnalysis.cape, "J/kg", "convective_indices", "SAFETY_CRITICAL");
          alertManager.updateDataSourceStatus("convective_indices", "AVAILABLE", cloudRes.responseTime);
          
          if (result.convectiveAnalysis.cape < 500) {
            result.convectiveAnalysis.convectiveRisk = "LOW";
            result.convectiveAnalysis.thunderstormPotential = "UNLIKELY";
          } else if (result.convectiveAnalysis.cape < 1000) {
            result.convectiveAnalysis.convectiveRisk = "MODERATE";
            result.convectiveAnalysis.thunderstormPotential = "ISOLATED_POSSIBLE";
          } else if (result.convectiveAnalysis.cape < 2500) {
            result.convectiveAnalysis.convectiveRisk = "ELEVATED";
            result.convectiveAnalysis.thunderstormPotential = "SCATTERED_LIKELY";
            alertManager.addAlert(`Elevated CAPE (${result.convectiveAnalysis.cape} J/kg) indicates thunderstorm potential`, "WARNING", "CONVECTIVE", "convective_indices", { cape: result.convectiveAnalysis.cape });
          } else {
            result.convectiveAnalysis.convectiveRisk = "HIGH";
            result.convectiveAnalysis.thunderstormPotential = "WIDESPREAD_SEVERE";
            alertManager.addAlert(`High CAPE (${result.convectiveAnalysis.cape} J/kg) indicates severe thunderstorm potential`, "CRITICAL", "CONVECTIVE", "convective_indices", { cape: result.convectiveAnalysis.cape });
          }
        }
        
        if (result.convectiveAnalysis.liftedIndex !== null) {
          alertManager.registerDataPoint("lifted_index", result.convectiveAnalysis.liftedIndex, "C", "convective_indices", "SAFETY_CRITICAL");
        }
        
        const weatherCode = result.cloudAnalysis.current.weatherCode;
        if (weatherCode !== null) {
          if (weatherCode >= 95) {
            result.cloudAnalysis.precipitatingClouds.detected = true;
            result.cloudAnalysis.precipitatingClouds.type = "THUNDERSTORM";
            result.cloudAnalysis.precipitatingClouds.intensity = weatherCode >= 99 ? "SEVERE" : "MODERATE";
            alertManager.addAlert(`Active thunderstorm detected (code ${weatherCode})`, "CRITICAL", "WEATHER", "cloud_analysis", { weatherCode });
          } else if (weatherCode >= 80) {
            result.cloudAnalysis.precipitatingClouds.detected = true;
            result.cloudAnalysis.precipitatingClouds.type = "RAIN_SHOWERS";
            result.cloudAnalysis.precipitatingClouds.intensity = weatherCode >= 82 ? "HEAVY" : "MODERATE";
          } else if (weatherCode >= 70) {
            result.cloudAnalysis.precipitatingClouds.detected = true;
            result.cloudAnalysis.precipitatingClouds.type = "SNOW";
            result.cloudAnalysis.precipitatingClouds.intensity = weatherCode >= 75 ? "HEAVY" : "LIGHT";
          } else if (weatherCode >= 61) {
            result.cloudAnalysis.precipitatingClouds.detected = true;
            result.cloudAnalysis.precipitatingClouds.type = "RAIN";
            result.cloudAnalysis.precipitatingClouds.intensity = weatherCode >= 65 ? "HEAVY" : weatherCode >= 63 ? "MODERATE" : "LIGHT";
          } else if (weatherCode >= 51) {
            result.cloudAnalysis.precipitatingClouds.detected = true;
            result.cloudAnalysis.precipitatingClouds.type = "DRIZZLE";
            result.cloudAnalysis.precipitatingClouds.intensity = "LIGHT";
          } else if (weatherCode >= 45) {
            result.cloudAnalysis.precipitatingClouds.detected = false;
            result.cloudAnalysis.precipitatingClouds.type = "FOG";
            result.cloudAnalysis.precipitatingClouds.intensity = weatherCode === 48 ? "DEPOSITING_RIME" : "GENERAL";
          }
        }
        
        if (result.cloudAnalysis.current.lowCover !== null && result.cloudAnalysis.current.lowCover > 50) {
          result.cloudAnalysis.opticalVisibility.impacted = true;
          result.cloudAnalysis.opticalVisibility.degradation = result.cloudAnalysis.current.lowCover > 80 ? "SEVERE" : "MODERATE";
        }
        
        for (let hour = 0; hour < Math.min(24, h.cloud_cover?.length || 0); hour++) {
          result.cloudAnalysis.layers.push({
            hour: hour,
            timestamp: h.time ? h.time[hour] : null,
            totalCover: h.cloud_cover ? h.cloud_cover[hour] : null,
            lowCover: h.cloud_cover_low ? h.cloud_cover_low[hour] : null,
            midCover: h.cloud_cover_mid ? h.cloud_cover_mid[hour] : null,
            highCover: h.cloud_cover_high ? h.cloud_cover_high[hour] : null,
            precipitation: h.precipitation ? h.precipitation[hour] : null,
            precipProbability: h.precipitation_probability ? h.precipitation_probability[hour] : null,
            weatherCode: h.weather_code ? h.weather_code[hour] : null,
            cape: h.cape ? h.cape[hour] : null,
            liftedIndex: h.lifted_index ? h.lifted_index[hour] : null
          });
        }
      }
    } else {
      alertManager.updateDataSourceStatus("cloud_analysis", "FAILED", cloudRes.responseTime, cloudRes.error || "Cloud data is unavailable.");
      alertManager.updateDataSourceStatus("convective_indices", "FAILED", cloudRes.responseTime, "CAPE/LI data unavailable");
    }
    
    const upperLevels = [1000, 925, 850, 700, 500, 300, 250, 200, 150, 100, 70, 50, 30, 20, 10];
    const upperParams = upperLevels.map(l => `temperature_${l}hPa,geopotential_height_${l}hPa,wind_speed_${l}hPa,wind_direction_${l}hPa,relative_humidity_${l}hPa`).join(",");
    const upperUrl = `${API_ENDPOINTS.OPEN_METEO_FORECAST}?latitude=${lat}&longitude=${lon}&hourly=${upperParams},temperature_2m,relative_humidity_2m,dewpoint_2m&current=temperature_2m,relative_humidity_2m,dewpoint_2m&wind_speed_unit=ms&timezone=UTC&forecast_days=1`;
    const upperRes = await makeApiRequestWithBackoff(upperUrl, {}, 20000, 2);
    
    let atmosphericProfile = [];
    let windProfile = [];
    let humidityLevels = [];
    
    if (upperRes.status === 200 && upperRes.data?.hourly) {
      alertManager.updateDataSourceStatus("atmospheric_profile", "AVAILABLE", upperRes.responseTime);
      alertManager.updateDataSourceStatus("humidity_profile", "AVAILABLE", upperRes.responseTime);
      alertManager.updateDataSourceStatus("temperature_inversions", "AVAILABLE", upperRes.responseTime);
      
      const h = upperRes.data.hourly;
      const c = upperRes.data.current;
      const idx = new Date().getUTCHours();
      
      if (c) {
        result.humidityProfile.current.surface = c.relative_humidity_2m;
        const surfaceTemp = c.temperature_2m;
        const surfaceDewpoint = c.dewpoint_2m;
        
        if (surfaceTemp !== null && surfaceDewpoint !== null) {
          const dewpointDepression = surfaceTemp - surfaceDewpoint;
          result.humidityProfile.condensation.dewpointDepression = dewpointDepression;
          alertManager.registerDataPoint("dewpoint_depression_surface", dewpointDepression, "C", "humidity_profile", "OPERATIONAL");
          
          if (dewpointDepression < 3) {
            result.humidityProfile.condensation.concern = "HIGH";
            result.humidityProfile.condensation.condensationRisk = "ELEVATED";
            alertManager.addAlert(`Low dewpoint depression (${dewpointDepression.toFixed(1)}°C) increases the risk of condensation and fog.`, "WARNING", "HUMIDITY", "humidity_profile", { dewpointDepression });
          } else if (dewpointDepression < 5) {
            result.humidityProfile.condensation.concern = "MODERATE";
            result.humidityProfile.condensation.condensationRisk = "POSSIBLE";
          } else {
            result.humidityProfile.condensation.concern = "LOW";
            result.humidityProfile.condensation.condensationRisk = "UNLIKELY";
          }
          
          if (dewpointDepression < 2.5 && surfaceTemp > 0) {
            const fogProb = Math.min(100, Math.max(0, (2.5 - dewpointDepression) * 40));
            result.temperatureInversions.fogPotential.probability = fogProb;
            alertManager.registerDataPoint("fog_probability", fogProb, "%", "temperature_inversions", "OPERATIONAL");
            
            if (fogProb > 50) {
              result.temperatureInversions.fogPotential.type = "RADIATION_FOG";
              result.temperatureInversions.fogPotential.formationConditions = "FAVORABLE";
              alertManager.addAlert(`High fog probability (${fogProb.toFixed(0)}%) based on dewpoint depression`, "ADVISORY", "VISIBILITY", "temperature_inversions", { fogProbability: fogProb, dewpointDepression });
            }
          }
        }
      }
      
      let frostRiskIndex = 0;
      let staticRiskIndex = 0;
      const frostCriticalAltitudes = [];
      const staticConcernLayers = [];
      
      upperLevels.forEach((lvl) => {
        const heightKey = `geopotential_height_${lvl}hPa`;
        const tempKey = `temperature_${lvl}hPa`;
        const windKey = `wind_speed_${lvl}hPa`;
        const windDirKey = `wind_direction_${lvl}hPa`;
        const rhKey = `relative_humidity_${lvl}hPa`;
        
        let height = null;
        if (h[heightKey] && h[heightKey][idx] !== null && h[heightKey][idx] !== undefined) {
          height = h[heightKey][idx];
        } else {
          height = estimateAltitudeFromPressure(lvl);
        }
        
        const temperature = h[tempKey] ? h[tempKey][idx] : null;
        const windSpeed = h[windKey] ? h[windKey][idx] : null;
        const windDirection = h[windDirKey] ? h[windDirKey][idx] : null;
        const relativeHumidity = h[rhKey] ? h[rhKey][idx] : null;
        
        if (height !== null && temperature !== null) {
          const P = lvl * 100;
          const T = temperature + 273.15;
          const rho = P / (287.05 * T);
          atmosphericProfile.push({ height, pressure: lvl, temperature, density: rho });
          
          if (windSpeed !== null && windDirection !== null) {
            windProfile.push({ height, pressure: lvl, speed: windSpeed, direction: windDirection });
          }
          
          if (relativeHumidity !== null) {
            humidityLevels.push({ height, pressure: lvl, relativeHumidity, temperature });
            result.humidityProfile.current.levels[`${lvl}hPa`] = relativeHumidity;
            
            const levelParamId = `relative_humidity_${lvl}hpa`;
            if (INDUSTRY_LIMITS[levelParamId]) {
              alertManager.registerDataPoint(levelParamId, relativeHumidity, "%", "humidity_profile", "OPERATIONAL");
            }
            
            if (relativeHumidity > 85 && temperature < 0) {
              frostRiskIndex += 0.15;
              frostCriticalAltitudes.push({ altitude: height, pressure: lvl, humidity: relativeHumidity, temperature });
            }
            
            if (relativeHumidity < 30 && height < 5000) {
              staticRiskIndex += 0.1;
              staticConcernLayers.push({ altitude: height, pressure: lvl, humidity: relativeHumidity });
            }
          }
        }
      });
      
      frostRiskIndex = Math.min(1.0, frostRiskIndex);
      staticRiskIndex = Math.min(1.0, staticRiskIndex);
      
      result.humidityProfile.frostFormation.riskIndex = frostRiskIndex;
      result.humidityProfile.frostFormation.risk = frostRiskIndex > 0.6 ? "HIGH" : frostRiskIndex > 0.3 ? "MODERATE" : "LOW";
      result.humidityProfile.frostFormation.criticalAltitudes = frostCriticalAltitudes;
      alertManager.registerDataPoint("frost_formation_risk", frostRiskIndex, "index", "humidity_profile", "OPERATIONAL");
      
      if (frostRiskIndex > 0.5) {
        alertManager.addAlert(`Elevated frost formation risk (index ${frostRiskIndex.toFixed(2)}) at ${frostCriticalAltitudes.length} altitude layers`, "WARNING", "FROST", "humidity_profile", { riskIndex: frostRiskIndex, criticalLayers: frostCriticalAltitudes.length });
      }
      
      result.humidityProfile.staticElectricity.riskIndex = staticRiskIndex;
      result.humidityProfile.staticElectricity.risk = staticRiskIndex > 0.5 ? "ELEVATED" : staticRiskIndex > 0.2 ? "MODERATE" : "LOW";
      result.humidityProfile.staticElectricity.concernLayers = staticConcernLayers;
      alertManager.registerDataPoint("static_electricity_risk", staticRiskIndex, "index", "humidity_profile", "OPERATIONAL");
      
      if (staticRiskIndex > 0.4) {
        alertManager.addAlert(`Low humidity at lower altitudes increases static electricity risk (index ${staticRiskIndex.toFixed(2)})`, "ADVISORY", "STATIC", "humidity_profile", { riskIndex: staticRiskIndex, concernLayers: staticConcernLayers.length });
      }
      
      result.humidityProfile.layers = humidityLevels;
      
      const sortedProfile = [...atmosphericProfile].sort((a, b) => a.height - b.height);
      const detectedInversions = [];
      let strongestInversion = null;
      let maxInversionStrength = 0;
      
      for (let i = 1; i < sortedProfile.length; i++) {
        const lower = sortedProfile[i - 1];
        const upper = sortedProfile[i];
        const deltaH = upper.height - lower.height;
        const deltaT = upper.temperature - lower.temperature;
        
        if (deltaH > 0 && deltaT > 0) {
          const inversionStrength = (deltaT / deltaH) * 100;
          const inversionThickness = deltaH;
          
          const inversionData = {
            baseHeight: lower.height,
            topHeight: upper.height,
            basePressure: lower.pressure,
            topPressure: upper.pressure,
            baseTemperature: lower.temperature,
            topTemperature: upper.temperature,
            strength: parseFloat(inversionStrength.toFixed(3)),
            thickness: inversionThickness,
            temperatureDelta: deltaT
          };
          
          detectedInversions.push(inversionData);
          
          if (inversionStrength > maxInversionStrength) {
            maxInversionStrength = inversionStrength;
            strongestInversion = inversionData;
          }
        }
      }
      
      result.temperatureInversions.detected = detectedInversions;
      result.temperatureInversions.strongestInversion = strongestInversion;
      
      const LOW_LEVEL_INVERSION_CEILING = 5000;
      const lowLevelInversions = detectedInversions.filter(inv => inv.baseHeight < LOW_LEVEL_INVERSION_CEILING);
      const strongestLowLevelInversion = lowLevelInversions.length > 0 ? 
        lowLevelInversions.reduce((max, inv) => inv.strength > max.strength ? inv : max, lowLevelInversions[0]) : null;
      
      result.temperatureInversions.lowLevelInversions = lowLevelInversions;
      result.temperatureInversions.strongestLowLevelInversion = strongestLowLevelInversion;
      
      if (strongestLowLevelInversion) {
        alertManager.registerDataPoint("temperature_inversion_strength", strongestLowLevelInversion.strength, "C/100m", "temperature_inversions", "OPERATIONAL");
        alertManager.registerDataPoint("inversion_base_height", strongestLowLevelInversion.baseHeight, "m", "temperature_inversions", "OPERATIONAL");
        alertManager.registerDataPoint("inversion_thickness", strongestLowLevelInversion.thickness, "m", "temperature_inversions", "OPERATIONAL");
      } else if (strongestInversion) {
        result.temperatureInversions.atmosphericStability.index = 0.85;
        result.temperatureInversions.atmosphericStability.classification = "NEUTRAL_UPPER";
        alertManager.registerDataPoint("atmospheric_stability", 0.85, "index", "temperature_inversions", "INFORMATIONAL");
      }
      
      const inversionForAnalysis = strongestLowLevelInversion || null;
      
      if (inversionForAnalysis) {
        if (strongestInversion.strength > 1.0) {
          result.temperatureInversions.acousticPropagation.impacted = true;
          result.temperatureInversions.acousticPropagation.channeling = "LIKELY";
          result.temperatureInversions.acousticPropagation.enhancementFactor = 1.0 + (strongestInversion.strength * 0.5);
          alertManager.addAlert(`Strong temperature inversion (${strongestInversion.strength.toFixed(2)} C/100m) may enhance acoustic propagation`, "ADVISORY", "ACOUSTIC", "temperature_inversions", { strength: strongestInversion.strength, baseHeight: strongestInversion.baseHeight });
        }
        
        if (strongestInversion.baseHeight < 2000) {
          result.temperatureInversions.pollutantDispersion.impacted = true;
          result.temperatureInversions.pollutantDispersion.trappingAltitude = strongestInversion.baseHeight;
          result.temperatureInversions.pollutantDispersion.dispersalRating = strongestInversion.strength > 2.0 ? "POOR" : strongestInversion.strength > 1.0 ? "REDUCED" : "MODERATE";
          
          if (strongestInversion.strength > 2.0) {
            alertManager.addAlert(`Low-level inversion at ${strongestInversion.baseHeight}m may trap pollutants near the surface.`, "WARNING", "DISPERSION", "temperature_inversions", { trappingAltitude: strongestInversion.baseHeight, strength: strongestInversion.strength });
          }
        }
        
        let stabilityIndex = 1.0;
        if (detectedInversions.length > 0) {
          const avgStrength = detectedInversions.reduce((a, b) => a + b.strength, 0) / detectedInversions.length;
          stabilityIndex = Math.max(0, 1.0 - (avgStrength * 0.3) - (detectedInversions.length * 0.05));
        }
        
        result.temperatureInversions.atmosphericStability.index = parseFloat(stabilityIndex.toFixed(3));
        alertManager.registerDataPoint("atmospheric_stability", stabilityIndex, "index", "temperature_inversions", "OPERATIONAL");
        
        if (stabilityIndex > 0.8) {
          result.temperatureInversions.atmosphericStability.classification = "UNSTABLE";
        } else if (stabilityIndex > 0.6) {
          result.temperatureInversions.atmosphericStability.classification = "SLIGHTLY_UNSTABLE";
        } else if (stabilityIndex > 0.4) {
          result.temperatureInversions.atmosphericStability.classification = "NEUTRAL";
        } else if (stabilityIndex > 0.2) {
          result.temperatureInversions.atmosphericStability.classification = "SLIGHTLY_STABLE";
        } else {
          result.temperatureInversions.atmosphericStability.classification = "VERY_STABLE";
          alertManager.addAlert(`Very stable atmospheric conditions (index ${stabilityIndex.toFixed(2)}) may affect dispersion`, "ADVISORY", "STABILITY", "temperature_inversions", { stabilityIndex });
        }
      }
      
    } else {
      alertManager.updateDataSourceStatus("atmospheric_profile", "FAILED", upperRes.responseTime, upperRes.error || "Atmospheric profile is unavailable.");
      alertManager.updateDataSourceStatus("humidity_profile", "FAILED", upperRes.responseTime, "Humidity profile is unavailable.");
      alertManager.updateDataSourceStatus("temperature_inversions", "FAILED", upperRes.responseTime, "Inversion detection is unavailable.");
    }
    
    const precipWaterUrl = `${API_ENDPOINTS.OPEN_METEO_FORECAST}?latitude=${lat}&longitude=${lon}&hourly=precipitation_probability,precipitation,snowfall,rain,showers,visibility&current=precipitation,visibility&timezone=UTC&forecast_days=1`;
    const precipWaterRes = await makeApiRequestWithBackoff(precipWaterUrl, {}, 15000, 2);
    
    if (precipWaterRes.status === 200 && precipWaterRes.data?.hourly) {
      const h = precipWaterRes.data.hourly;
      const idx = new Date().getUTCHours();
      
      let precipSum = 0;
      for (let i = 0; i < Math.min(24, h.precipitation?.length || 0); i++) {
        if (h.precipitation && h.precipitation[i] !== null) {
          precipSum += h.precipitation[i];
        }
      }
      
      result.cloudAnalysis.current.precipitableWater = parseFloat(precipSum.toFixed(2));
      alertManager.registerDataPoint("precipitable_water", precipSum, "mm", "cloud_analysis", "OPERATIONAL");
      
      if (h.visibility && h.visibility[idx] !== null) {
        const visibilityM = h.visibility[idx];
        if (visibilityM < 5000) {
          result.cloudAnalysis.opticalVisibility.impacted = true;
          result.cloudAnalysis.opticalVisibility.degradation = visibilityM < 1000 ? "SEVERE" : visibilityM < 3000 ? "MODERATE" : "LIGHT";
        }
      }
    }

    try {
      const neutronRes = await makeApiRequestWithBackoff(API_ENDPOINTS.NMDB_REALTIME, {}, 15000, 2);
      if (neutronRes.status === 200 && typeof neutronRes.data === 'string') {
        const lines = neutronRes.data.split('\n');
        const stationData = {};
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const parts = trimmed.split(';');
          if (parts.length >= 3) {
            const station = parts[1];
            const countRate = parseFloat(parts[2]);
            if (!isNaN(countRate) && countRate > 0) {
              if (!stationData[station]) stationData[station] = [];
              stationData[station].push(countRate);
            }
          }
        }
        
        const stationCatalog = await fetchNmdbStationCatalog();
        const locationCutoff = estimateVerticalCutoffRigidity(lat, lon);
        const reportingStations = Object.keys(stationData).filter(station => stationData[station].length >= 10);
        const rankedStations = [...reportingStations].sort((x, y) => {
          const dx = stationCatalog?.[x] ? Math.abs(stationCatalog[x].cutoff - locationCutoff) : Infinity;
          const dy = stationCatalog?.[y] ? Math.abs(stationCatalog[y].cutoff - locationCutoff) : Infinity;
          return dx - dy || stationData[y].length - stationData[x].length;
        });
        const selectedStation = rankedStations[0] || null;
        const stationValues = selectedStation ? stationData[selectedStation] : [];
        if (selectedStation && stationCatalog?.[selectedStation]) {
          result.cosmicRayAnalysis.stationName = stationCatalog[selectedStation].name;
          result.cosmicRayAnalysis.cutoffRigidity = stationCatalog[selectedStation].cutoff;
          result.cosmicRayAnalysis.locationCutoff = locationCutoff;
        }
        
        if (selectedStation && stationValues.length > 0) {
          const mean = stationValues.reduce((a, b) => a + b, 0) / stationValues.length;
          const recentValues = stationValues.slice(-10);
          const recentMean = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;
          const stdDev = Math.sqrt(stationValues.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / stationValues.length);
          const coefficientOfVariation = (stdDev / mean) * 100;
          const intraHourDeviation = ((recentMean - mean) / mean) * 100;
          const gcrIndex = 100 + intraHourDeviation;
          
          result.cosmicRayAnalysis.station = selectedStation;
          result.cosmicRayAnalysis.neutronCounts = Math.round(mean);
          result.cosmicRayAnalysis.percentDeviation = parseFloat(intraHourDeviation.toFixed(2));
          result.cosmicRayAnalysis.status = "AVAILABLE";
          
          alertManager.registerDataPoint("neutron_count_rate", mean, "counts/min", "cosmic_ray_monitoring", "INFORMATIONAL");
          alertManager.registerDataPoint("galactic_cosmic_ray_index", gcrIndex, "%", "cosmic_ray_monitoring", "INFORMATIONAL");
          alertManager.updateDataSourceStatus("cosmic_ray_monitoring", "AVAILABLE", neutronRes.responseTime);
          
          if (Math.abs(intraHourDeviation) > 3 || coefficientOfVariation > 2) {
            const direction = intraHourDeviation < 0 ? "decreasing" : "increasing";
            alertManager.addAlert(`Cosmic ray flux ${direction} (${intraHourDeviation > 0 ? '+' : ''}${intraHourDeviation.toFixed(1)}% intra-hour variation at ${selectedStation})`, "ADVISORY", "RADIATION", "cosmic_ray_monitoring", { station: selectedStation, deviation: intraHourDeviation, cv: coefficientOfVariation });
          }
        } else {
          alertManager.updateDataSourceStatus("cosmic_ray_monitoring", "DEGRADED", neutronRes.responseTime, "Insufficient station data in realtime feed");
        }
      } else {
        alertManager.updateDataSourceStatus("cosmic_ray_monitoring", "FAILED", neutronRes.responseTime || 0, neutronRes.error || "The NMDB request failed.");
      }
    } catch (error) {
      alertManager.updateDataSourceStatus("cosmic_ray_monitoring", "FAILED", 0, error.message);
    }
    
    const cumulusPenetrationAlt = atmosphericProfile.length > 0 ? 
      atmosphericProfile.filter(l => l.temperature < -10).sort((a, b) => a.height - b.height)[0]?.height || 6000 : null;
    
    if (cumulusPenetrationAlt !== null) {
      result.cloudAnalysis.cumulusPenetration.altitude = cumulusPenetrationAlt;
      alertManager.registerDataPoint("cumulus_penetration_altitude", cumulusPenetrationAlt, "m", "cloud_analysis", "OPERATIONAL");
      
      if (cumulusPenetrationAlt < 3000) {
        result.cloudAnalysis.cumulusPenetration.risk = "HIGH";
        alertManager.addAlert(`Low cumulus penetration altitude (${cumulusPenetrationAlt}m) increases convective hazard`, "WARNING", "CUMULUS", "cloud_analysis", { altitude: cumulusPenetrationAlt });
      } else if (cumulusPenetrationAlt < 4500) {
        result.cloudAnalysis.cumulusPenetration.risk = "MODERATE";
      } else {
        result.cloudAnalysis.cumulusPenetration.risk = "LOW";
      }
    }
    
    if (result.cloudAnalysis.current.lowCover !== null && result.cloudAnalysis.current.lowCover > 25) {
      const estimatedCloudBase = 125 * (result.humidityProfile.condensation.dewpointDepression || 5);
      result.cloudAnalysis.current.cloudBaseHeight = Math.max(100, Math.min(3000, estimatedCloudBase));
      alertManager.registerDataPoint("cloud_base_height", result.cloudAnalysis.current.cloudBaseHeight, "m", "cloud_analysis", "OPERATIONAL");
    }
    
    if (windProfile.length > 1) {
      const sortedWindProfile = [...windProfile].sort((a, b) => a.height - b.height);
      let maxShear = 0;
      let criticalAlt = 0;
      let jetStream = null;
      
      for (let i = 1; i < sortedWindProfile.length; i++) {
        const cur = sortedWindProfile[i];
        const prev = sortedWindProfile[i - 1];
        const dz = cur.height - prev.height;
        const du = cur.speed - prev.speed;
        
        if (dz > 0) {
          const shear = Math.abs(du / dz * 1000);
          if (shear > maxShear) { maxShear = shear; criticalAlt = cur.height; }
          
          if (cur.speed > 30 && cur.height > 7000) {
            jetStream = { height: cur.height, speed: cur.speed, direction: cur.direction };
          }
          
          const layerData = { 
            altitude: cur.height, 
            shear: parseFloat(shear.toFixed(2)), 
            windSpeed: cur.speed,
            windDirection: cur.direction,
            pressureLevel: cur.pressure,
            heightDiff: dz,
            windDiff: Math.abs(du),
            lowerAlt: prev.height,
            upperAlt: cur.height
          };
          
          result.shearProfile.verticalProfile.push(layerData);
        }
      }
      
      result.windShearAnalysis.maxShear = parseFloat(maxShear.toFixed(2));
      result.windShearAnalysis.maxShearAltitude = criticalAlt;
      result.windShearAnalysis.jetStreamData = jetStream;
      alertManager.registerDataPoint("wind_shear", maxShear, "m/s/km", "atmospheric_profile", "SAFETY_CRITICAL");
      
      result.shearProfile.criticalLayers = result.shearProfile.verticalProfile.filter(l => l.shear >= CRITICAL_SHEAR_THRESHOLD);
      result.shearProfile.warningLayers = result.shearProfile.verticalProfile.filter(l => l.shear >= WARNING_SHEAR_THRESHOLD);
      
      if (result.shearProfile.warningLayers.length > 0) {
        alertManager.addAlert(`${result.shearProfile.warningLayers.length} high shear layer(s) detected (>25 m/s/km)`, "WARNING", "WIND_SHEAR", "atmospheric_profile", { layers: result.shearProfile.warningLayers });
      } else if (result.shearProfile.criticalLayers.length > 0) {
        alertManager.addAlert(`${result.shearProfile.criticalLayers.length} elevated shear layer(s) detected (>15 m/s/km)`, "ADVISORY", "WIND_SHEAR", "atmospheric_profile", { layers: result.shearProfile.criticalLayers });
      }
      
      if (jetStream) {
        alertManager.addAlert(`Jet stream detected at ${jetStream.height}m with ${jetStream.speed.toFixed(1)} m/s`, "ADVISORY", "WIND_SHEAR", "atmospheric_profile", { jetStream });
      }
    }
    
    if (atmosphericProfile.length > 0) {
      for (const level of atmosphericProfile) {
        if (level.temperature <= 0) {
          result.freezeLine.height = level.height;
          alertManager.registerDataPoint("freezing_level", level.height, "m", "atmospheric_profile", "OPERATIONAL");
          result.freezeLine.icingRisk = level.height < 1000 ? "HIGH" : level.height < 3000 ? "MODERATE" : "LOW";
          
          if (result.freezeLine.icingRisk === "HIGH") {
            alertManager.addAlert(`Low freezing level at ${level.height}m increases icing risk`, "ADVISORY", "ICING", "atmospheric_profile", { freezingLevel: level.height });
          }
          break;
        }
      }
      
      result.atmosphericDensity.densityProfile = atmosphericProfile.map(l => ({ altitude: l.height, density: l.density, temperature: l.temperature, pressure: l.pressure }));
      
      if (atmosphericProfile.length > 1) {
        const surface = atmosphericProfile[0];
        const upper = atmosphericProfile[atmosphericProfile.length - 1];
        const deltaH = upper.height - surface.height;
        const densityRatio = Math.log(surface.density / upper.density);
        if (densityRatio > 0) result.atmosphericDensity.scaleHeight = deltaH / densityRatio;
      }
    }
    
    const fullReport = alertManager.getFullReport();
    result.violations = fullReport.violations;
    result.alerts = fullReport.alerts;
    result.alertManager = { dataSources: fullReport.dataSources, dataPoints: fullReport.dataPoints, summary: fullReport.summary, decision: fullReport.decision, historicalData: fullReport.historicalData };
    result.status = "AVAILABLE";
  } catch (error) {
    alertManager.addAlert(`Critical error in Atmospheric Environment module: ${error.message}`, "CRITICAL", "SYSTEM", "atmospheric_environment", { errorStack: error.stack });
    const fullReport = alertManager.getFullReport();
    result.status = "FAILED";
    result.violations = fullReport.violations;
    result.alerts = fullReport.alerts;
    result.alertManager = { dataSources: fullReport.dataSources, dataPoints: fullReport.dataPoints, summary: fullReport.summary, historicalData: fullReport.historicalData };
  }
  
  return result;
}

async function electromagneticEnvironmentSystem(lat, lon) {
  const startTime = Date.now();
  const alertManager = new AlertManager();
  
  const result = {
    status: "NO_DATA",
    timestamp: new Date().toISOString(),
    signalIntegrity: { scintillation: null, tec: null, gpsAccuracy: null, radioLinkQuality: null, dataAvailable: false },
    radiationLevels: { protonFlux: null, electronFlux: null, neutronFlux: null, dataAvailable: false },
    dischargeRisk: { electricField: null, flashDensity: null, lightningRisk: null },
    spectrumTrafficLight: { hf: "UNKNOWN", lBand: "UNKNOWN", sBand: "UNKNOWN" },
    kIndexHorizon: { forecast: [], trend: null },
    solarFlareActivity: { currentXrayFlux: null, currentXrayFluxShort: null, currentXrayFluxLong: null, flareClass: null, flareProbabilities: { cClass: null, mClass: null, xClass: null }, protonEventProbability: null, activeRegions: [], dataAvailable: false },
    cmeStatus: { activeCMEs: [], arrivalProbability: null, estimatedArrival: null, alerts: [], dataAvailable: false },
    atmosphericCharging: { riskIndex: null, iceCrystalIndicator: null, cloudLayerAnalysis: { lowCloud: null, midCloud: null, highCloud: null, precipitableWater: null }, atmosphericProfile: { temp850: null, temp700: null, temp500: null, rh850: null, rh700: null, rh500: null }, dataAvailable: false },
    geomagnticStormForecast: { minorStormProb: null, majorStormProb: null, radioBlackoutProbR1R2: null, radioBlackoutProbR3: null, dataAvailable: false },
    violations: [],
    alerts: [],
    alertManager: null,
    historicalRadiation: { protonTimeSeries: { p10: [], p50: [], p100: [] }, electronTimeSeries: { e2: [] }, neutronTimeSeries: { oulu: [], jung: [], newk: [] }, xrayTimeSeries: { short: [], long: [] }, statistics: {} }
  };
  
  try {
    alertManager.registerDataSource("geomagnetic_kp", "SAFETY_CRITICAL", "Planetary K-index from SWPC");
    alertManager.registerDataSource("kp_forecast", "OPERATIONAL", "Kp forecast from SWPC");
    alertManager.registerDataSource("solar_protons", "SAFETY_CRITICAL", "Solar proton flux from GOES");
    alertManager.registerDataSource("solar_electrons", "OPERATIONAL", "Electron flux from GOES");
    alertManager.registerDataSource("neutron_monitors", "OPERATIONAL", "Cosmic ray neutron monitors from NMDB");
    alertManager.registerDataSource("weather_lightning", "PRIMARY", "Lightning/precipitation data");
    alertManager.registerDataSource("radiation_environment", "SAFETY_CRITICAL", "Space radiation environment");
    alertManager.registerDataSource("signal_integrity", "OPERATIONAL", "RF signal integrity assessment");
    alertManager.registerDataSource("f107_flux", "OPERATIONAL", "F10.7 solar radio flux for ionospheric modeling");
    alertManager.registerDataSource("xray_flux_monitor", "SAFETY_CRITICAL", "GOES X-ray flux for solar flare detection");
    alertManager.registerDataSource("solar_event_forecasts", "SAFETY_CRITICAL", "SWPC solar event probability forecasts");
    alertManager.registerDataSource("swpc_alerts", "PRIMARY", "SWPC space weather alerts and warnings");
    alertManager.registerDataSource("triboelectric_assessment", "OPERATIONAL", "Triboelectric charging conditions from atmospheric profile");
    alertManager.registerDataSource("atmospheric_profile", "OPERATIONAL", "Multi-level atmospheric data for charging assessment");
    alertManager.registerDataSource("flare_probabilities", "SAFETY_CRITICAL", "Solar flare class probabilities from SWPC JSON");
    
    const kpRes = await makeApiRequestWithBackoff(API_ENDPOINTS.SWPC_KP_JSON, {}, 5000, 2);
    let currentKp = null;
    let kpHistory = [];
    
    if (kpRes.status === 200 && Array.isArray(kpRes.data) && kpRes.data.length > 0) {
      for (let i = kpRes.data.length - 1; i >= Math.max(0, kpRes.data.length - 50); i--) {
        const entry = kpRes.data[i];
        let kpValue = null;
        
        if (Array.isArray(entry) && entry.length >= 2) kpValue = parseFloat(entry[1]);
        else if (typeof entry === "object" && entry !== null) {
          if (entry.kp !== undefined) {
            kpValue = parseFloat(entry.kp);
          } else if (entry.estimated_kp !== undefined) {
            kpValue = parseFloat(entry.estimated_kp);
          } else if (entry.kp_index !== undefined) {
            kpValue = parseFloat(entry.kp_index);
          } else if (entry.value !== undefined) {
            kpValue = parseFloat(entry.value);
          }
        }
        
        if (!isNaN(kpValue) && kpValue >= 0 && kpValue <= 9) {
          if (currentKp === null) currentKp = kpValue;
          kpHistory.unshift(kpValue);
        }
      }
      
      if (currentKp !== null && kpHistory.length > 0) {
        alertManager.updateDataSourceStatus("geomagnetic_kp", "AVAILABLE", kpRes.responseTime);
        alertManager.registerDataPoint("kp_index", currentKp, "", "geomagnetic_kp", "SAFETY_CRITICAL");
      } else {
        alertManager.updateDataSourceStatus("geomagnetic_kp", "FAILED", kpRes.responseTime, "Kp format unrecognized");
      }
    } else {
      alertManager.updateDataSourceStatus("geomagnetic_kp", "FAILED", kpRes.responseTime, kpRes.error || "Geomagnetic data is unavailable.");
    }
    
    const kpForecastRes = await makeApiRequestWithBackoff(API_ENDPOINTS.SWPC_3DAY_GEOMAG, {}, 8000, 2);
    
    if (kpForecastRes.status === 200 && Array.isArray(kpForecastRes.data) && kpForecastRes.data.length > 1) {
      const forecastData = kpForecastRes.data.slice(1);
      let minorStormCount = 0;
      let majorStormCount = 0;
      let totalPeriods = 0;
      const kpForecastValues = [];
      
      for (const entry of forecastData) {
        if (Array.isArray(entry) && entry.length >= 2) {
          const kpForecast = parseFloat(entry[1]);
          if (!isNaN(kpForecast) && kpForecast >= 0 && kpForecast <= 9) {
            totalPeriods++;
            kpForecastValues.push(kpForecast);
            if (kpForecast >= 5) minorStormCount++;
            if (kpForecast >= 7) majorStormCount++;
          }
        }
      }
      
      if (kpForecastValues.length >= 8) {
        result.kIndexHorizon.forecast = kpForecastValues.slice(0, 8).map((kp, idx) => ({
          time: `T+${idx * 3}h`,
          kp: parseFloat(kp.toFixed(1)),
          condition: kp < 3 ? "QUIET" : kp < 5 ? "UNSETTLED" : "DISTURBED"
        }));
        
        const recentSlice = kpForecastValues.slice(4, 8);
        const earlierSlice = kpForecastValues.slice(0, 4);
        const avgRecent = recentSlice.reduce((a, b) => a + b, 0) / recentSlice.length;
        const avgEarlier = earlierSlice.reduce((a, b) => a + b, 0) / earlierSlice.length;
        
        result.kIndexHorizon.trend = avgRecent > avgEarlier + 0.3 ? "INCREASING" : avgRecent < avgEarlier - 0.3 ? "DECREASING" : "STABLE";
        
        if (result.kIndexHorizon.trend === "INCREASING") {
          alertManager.addAlert("The geomagnetic activity trend is increasing.", "ADVISORY", "SPACE_WEATHER", "kp_forecast", { trend: result.kIndexHorizon.trend, recentAvg: avgRecent, earlierAvg: avgEarlier });
        }
        
        alertManager.updateDataSourceStatus("kp_forecast", "AVAILABLE", kpForecastRes.responseTime);
      } else if (kpForecastValues.length > 0) {
        result.kIndexHorizon.forecast = kpForecastValues.map((kp, idx) => ({
          time: `T+${idx * 3}h`,
          kp: parseFloat(kp.toFixed(1)),
          condition: kp < 3 ? "QUIET" : kp < 5 ? "UNSETTLED" : "DISTURBED"
        }));
        result.kIndexHorizon.trend = "STABLE";
        alertManager.updateDataSourceStatus("kp_forecast", "DEGRADED", kpForecastRes.responseTime, `Only ${kpForecastValues.length} forecast periods available`);
      } else {
        alertManager.updateDataSourceStatus("kp_forecast", "FAILED", kpForecastRes.responseTime, "No valid Kp forecast values parsed");
      }
      
      if (totalPeriods > 0) {
        result.geomagnticStormForecast.minorStormProb = parseFloat(((minorStormCount / totalPeriods) * 100).toFixed(1));
        result.geomagnticStormForecast.majorStormProb = parseFloat(((majorStormCount / totalPeriods) * 100).toFixed(1));
        alertManager.registerDataPoint("geomagnetic_storm_prob_minor", result.geomagnticStormForecast.minorStormProb, "%", "solar_event_forecasts", "SAFETY_CRITICAL");
        alertManager.registerDataPoint("geomagnetic_storm_prob_major", result.geomagnticStormForecast.majorStormProb, "%", "solar_event_forecasts", "SAFETY_CRITICAL");
        result.geomagnticStormForecast.dataAvailable = true;
      }
    } else {
      alertManager.updateDataSourceStatus("kp_forecast", "FAILED", kpForecastRes.responseTime, kpForecastRes.error || "Kp forecast is unavailable.");
      
      if (kpHistory.length >= 8) {
        result.kIndexHorizon.forecast = kpHistory.slice(-8).map((kp, idx) => ({
          time: `T+${idx * 3}h`,
          kp: parseFloat(kp.toFixed(1)),
          condition: kp < 3 ? "QUIET" : kp < 5 ? "UNSETTLED" : "DISTURBED"
        }));
        result.kIndexHorizon.trend = "STABLE";
      }
    }
    
    let protonFlux10 = null, protonFlux50 = null, protonFlux100 = null;
    const swpcProtons7DayUrl = API_ENDPOINTS.SWPC_PROTONS_7DAY;
    const protonRes = await makeApiRequestWithBackoff(swpcProtons7DayUrl, {}, 10000, 2);
    
    if (protonRes.status === 200 && Array.isArray(protonRes.data) && protonRes.data.length > 0) {
      const p10Data = [];
      const p50Data = [];
      const p100Data = [];
      
      const timestamps = protonRes.data.filter(e => e && e.time_tag).map(e => e.time_tag).sort();
      
      for (const entry of protonRes.data) {
        if (!entry || !entry.time_tag) continue;
        const timestamp = entry.time_tag;
        const flux = parseFloat(entry.flux);
        
        if (isNaN(flux) || flux < 0) continue;
        
        if (entry.energy === ">=10 MeV" || entry.energy === ">=10MeV") {
          p10Data.push({ timestamp, value: flux });
        } else if (entry.energy === ">=50 MeV" || entry.energy === ">=50MeV") {
          p50Data.push({ timestamp, value: flux });
        } else if (entry.energy === ">=100 MeV" || entry.energy === ">=100MeV") {
          p100Data.push({ timestamp, value: flux });
        }
      }
      
      if (p10Data.length > 0) {
        protonFlux10 = p10Data[p10Data.length - 1].value;
        alertManager.updateDataSourceStatus("solar_protons", "AVAILABLE", protonRes.responseTime);
        alertManager.registerDataPoint("proton_flux_10mev", protonFlux10, "pfu", "solar_protons", "SAFETY_CRITICAL");
        result.radiationLevels.protonFlux = parseFloat(protonFlux10.toFixed(2));
        result.radiationLevels.dataAvailable = true;
        result.historicalRadiation.protonTimeSeries.p10 = p10Data;
        alertManager.registerHistoricalData("proton_flux_10mev_history", p10Data);
        
        const values = p10Data.map(d => d.value);
        result.historicalRadiation.statistics.proton10MeV = {
          min: Math.min(...values),
          max: Math.max(...values),
          mean: values.reduce((a, b) => a + b, 0) / values.length,
          current: protonFlux10,
          dataPoints: values.length
        };
        
        const solarParticleEvents = values.filter(v => v > 10).length;
        if (solarParticleEvents > 0) {
          alertManager.addAlert(`${solarParticleEvents} solar particle event(s) detected`, "ADVISORY", "SPACE_WEATHER", "solar_protons", { solarParticleEvents, threshold: 10 });
        }
      } else {
        alertManager.updateDataSourceStatus("solar_protons", "FAILED", protonRes.responseTime, "No valid proton flux data");
      }
      
      if (p50Data.length > 0) {
        protonFlux50 = p50Data[p50Data.length - 1].value;
        alertManager.registerDataPoint("proton_flux_50mev", protonFlux50, "pfu", "solar_protons", "SAFETY_CRITICAL");
        result.historicalRadiation.protonTimeSeries.p50 = p50Data;
        alertManager.registerHistoricalData("proton_flux_50mev_history", p50Data);
        
        const values = p50Data.map(d => d.value);
        result.historicalRadiation.statistics.proton50MeV = {
          min: Math.min(...values),
          max: Math.max(...values),
          mean: values.reduce((a, b) => a + b, 0) / values.length,
          current: protonFlux50,
          dataPoints: values.length
        };
      }
      
      if (p100Data.length > 0) {
        protonFlux100 = p100Data[p100Data.length - 1].value;
        alertManager.registerDataPoint("proton_flux_100mev", protonFlux100, "pfu", "solar_protons", "SAFETY_CRITICAL");
        result.historicalRadiation.protonTimeSeries.p100 = p100Data;
        alertManager.registerHistoricalData("proton_flux_100mev_history", p100Data);
        
        const values = p100Data.map(d => d.value);
        result.historicalRadiation.statistics.proton100MeV = {
          min: Math.min(...values),
          max: Math.max(...values),
          mean: values.reduce((a, b) => a + b, 0) / values.length,
          current: protonFlux100,
          dataPoints: values.length
        };
      }
    } else {
      alertManager.updateDataSourceStatus("solar_protons", "FAILED", protonRes.responseTime, protonRes.error || "Proton data is unavailable.");
    }
    
    let electronFlux2 = null;
    const swpcElectrons7DayUrl = API_ENDPOINTS.SWPC_ELECTRONS_7DAY;
    const electronRes = await makeApiRequestWithBackoff(swpcElectrons7DayUrl, {}, 10000, 2);
    
    if (electronRes.status === 200 && Array.isArray(electronRes.data) && electronRes.data.length > 0) {
      const e2Data = [];
      
      const timestamps = electronRes.data.filter(e => e && e.time_tag).map(e => e.time_tag).sort();
      const sampleEnergies = [...new Set(electronRes.data.slice(0, 50).map(e => e.energy).filter(Boolean))];
      
      for (const entry of electronRes.data) {
        if (!entry || !entry.time_tag) continue;
        const timestamp = entry.time_tag;
        const flux = parseFloat(entry.flux);
        
        if (isNaN(flux) || flux < 0) continue;
        
        const energy = (entry.energy || "").toLowerCase().replace(/\s+/g, "");
        
        if (energy.includes("2mev") || energy === ">=2mev" || energy === ">2mev" || energy === ">=2 mev") {
          e2Data.push({ timestamp, value: flux });
        }
      }
      
      if (e2Data.length > 0) {
        electronFlux2 = e2Data[e2Data.length - 1].value;
        alertManager.updateDataSourceStatus("solar_electrons", "AVAILABLE", electronRes.responseTime);
        alertManager.registerDataPoint("electron_flux_2mev", electronFlux2, "pfu", "solar_electrons", "OPERATIONAL");
        result.radiationLevels.electronFlux = parseFloat(electronFlux2.toFixed(2));
        result.historicalRadiation.electronTimeSeries.e2 = e2Data;
        alertManager.registerHistoricalData("electron_flux_2mev_history", e2Data);
        
        const evalues = e2Data.map(d => d.value);
        result.historicalRadiation.statistics.electron2MeV = {
          min: Math.min(...evalues),
          max: Math.max(...evalues),
          mean: evalues.reduce((a, b) => a + b, 0) / evalues.length,
          current: electronFlux2,
          dataPoints: evalues.length
        };
        
        const enhancements = evalues.filter(v => v > 1000).length;
        if (enhancements > evalues.length * 0.1) {
          alertManager.addAlert(`Electron flux enhancements: ${enhancements} events (${((enhancements / evalues.length) * 100).toFixed(1)}%)`, "ADVISORY", "SPACE_WEATHER", "solar_electrons", { enhancements, percentage: (enhancements / evalues.length) * 100 });
        }
      } else {
        const sampleEnergiesLog = electronRes.data.slice(0, 20).map(e => e.energy).filter(Boolean);
        const uniqueEnergies = [...new Set(sampleEnergiesLog)];
        alertManager.updateDataSourceStatus("solar_electrons", "DEGRADED", electronRes.responseTime, `No 2MeV data. Available: ${uniqueEnergies.join(", ")}`);
      }
    } else {
      alertManager.updateDataSourceStatus("solar_electrons", "FAILED", electronRes.responseTime, electronRes.error || "Electron data is unavailable.");
    }
    
    const xrayRes = await makeApiRequestWithBackoff(API_ENDPOINTS.SWPC_XRAYS_7DAY, {}, 10000, 2);
    let currentXrayShort = null;
    let currentXrayLong = null;
    const xrayShortData = [];
    const xrayLongData = [];
    
    if (xrayRes.status === 200 && Array.isArray(xrayRes.data) && xrayRes.data.length > 0) {
      for (const entry of xrayRes.data) {
        if (!entry || !entry.time_tag) continue;
        const timestamp = entry.time_tag;
        const flux = parseFloat(entry.flux);
        
        if (isNaN(flux) || flux <= 0) continue;
        
        const wavelength = (entry.energy || entry.wavelength || "").toLowerCase();
        
        if (wavelength.includes("0.05-0.4") || wavelength.includes("short") || wavelength === "0.05-0.4nm") {
          xrayShortData.push({ timestamp, value: flux });
        } else if (wavelength.includes("0.1-0.8") || wavelength.includes("long") || wavelength === "0.1-0.8nm") {
          xrayLongData.push({ timestamp, value: flux });
        }
      }
      
      if (xrayShortData.length > 0) {
        currentXrayShort = xrayShortData[xrayShortData.length - 1].value;
        alertManager.registerDataPoint("xray_flux_short", currentXrayShort, "W/m2", "xray_flux_monitor", "SAFETY_CRITICAL");
        result.solarFlareActivity.currentXrayFluxShort = currentXrayShort;
        result.historicalRadiation.xrayTimeSeries.short = xrayShortData;
        alertManager.registerHistoricalData("xray_flux_short_history", xrayShortData);
        
        const xsvalues = xrayShortData.map(d => d.value);
        result.historicalRadiation.statistics.xrayShort = {
          min: Math.min(...xsvalues),
          max: Math.max(...xsvalues),
          mean: xsvalues.reduce((a, b) => a + b, 0) / xsvalues.length,
          current: currentXrayShort,
          dataPoints: xsvalues.length
        };
      }
      
      if (xrayLongData.length > 0) {
        currentXrayLong = xrayLongData[xrayLongData.length - 1].value;
        alertManager.registerDataPoint("xray_flux_long", currentXrayLong, "W/m2", "xray_flux_monitor", "SAFETY_CRITICAL");
        result.solarFlareActivity.currentXrayFluxLong = currentXrayLong;
        result.solarFlareActivity.currentXrayFlux = currentXrayLong;
        result.historicalRadiation.xrayTimeSeries.long = xrayLongData;
        alertManager.registerHistoricalData("xray_flux_long_history", xrayLongData);
        
        const xlvalues = xrayLongData.map(d => d.value);
        result.historicalRadiation.statistics.xrayLong = {
          min: Math.min(...xlvalues),
          max: Math.max(...xlvalues),
          mean: xlvalues.reduce((a, b) => a + b, 0) / xlvalues.length,
          current: currentXrayLong,
          dataPoints: xlvalues.length
        };
        
        let flareClass = "A";
        if (currentXrayLong >= FLARE_CLASS_THRESHOLDS.X) flareClass = "X";
        else if (currentXrayLong >= FLARE_CLASS_THRESHOLDS.M) flareClass = "M";
        else if (currentXrayLong >= FLARE_CLASS_THRESHOLDS.C) flareClass = "C";
        else if (currentXrayLong >= FLARE_CLASS_THRESHOLDS.B) flareClass = "B";
        result.solarFlareActivity.flareClass = flareClass;
        
        if (flareClass === "X") {
          alertManager.addAlert(`X-class solar flare in progress (${currentXrayLong.toExponential(2)} W/m²)`, "CRITICAL", "SPACE_WEATHER", "xray_flux_monitor", { flareClass, flux: currentXrayLong });
        } else if (flareClass === "M") {
          alertManager.addAlert(`M-class solar flare in progress (${currentXrayLong.toExponential(2)} W/m²)`, "WARNING", "SPACE_WEATHER", "xray_flux_monitor", { flareClass, flux: currentXrayLong });
        } else if (flareClass === "C") {
          alertManager.addAlert(`C-class solar flare activity (${currentXrayLong.toExponential(2)} W/m²)`, "ADVISORY", "SPACE_WEATHER", "xray_flux_monitor", { flareClass, flux: currentXrayLong });
        }
        
        const mClassEvents = xlvalues.filter(v => v >= FLARE_CLASS_THRESHOLDS.M).length;
        const xClassEvents = xlvalues.filter(v => v >= FLARE_CLASS_THRESHOLDS.X).length;
        result.historicalRadiation.statistics.xrayLong.mClassEvents = mClassEvents;
        result.historicalRadiation.statistics.xrayLong.xClassEvents = xClassEvents;
        
        alertManager.updateDataSourceStatus("xray_flux_monitor", "AVAILABLE", xrayRes.responseTime);
        result.solarFlareActivity.dataAvailable = true;
      } else {
        alertManager.updateDataSourceStatus("xray_flux_monitor", "DEGRADED", xrayRes.responseTime, "No long-wave X-ray data parsed");
      }
    } else {
      alertManager.updateDataSourceStatus("xray_flux_monitor", "FAILED", xrayRes.responseTime, xrayRes.error || "X-ray flux data is unavailable.");
    }
    
    const solarProbUrl = API_ENDPOINTS.SWPC_SOLAR_PROBABILITIES;
    const solarProbRes = await makeApiRequestWithBackoff(solarProbUrl, {}, 8000, 2);
    
    if (solarProbRes.status === 200 && Array.isArray(solarProbRes.data) && solarProbRes.data.length > 0) {
      const latestProb = solarProbRes.data[0];
      
      if (latestProb.c_class_1_day !== undefined) {
        result.solarFlareActivity.flareProbabilities.cClass = parseInt(latestProb.c_class_1_day);
        alertManager.registerDataPoint("solar_flare_prob_c", result.solarFlareActivity.flareProbabilities.cClass, "%", "flare_probabilities", "OPERATIONAL");
      }
      
      if (latestProb.m_class_1_day !== undefined) {
        result.solarFlareActivity.flareProbabilities.mClass = parseInt(latestProb.m_class_1_day);
        alertManager.registerDataPoint("solar_flare_prob_m", result.solarFlareActivity.flareProbabilities.mClass, "%", "flare_probabilities", "SAFETY_CRITICAL");
        
        if (result.solarFlareActivity.flareProbabilities.mClass >= 40) {
          alertManager.addAlert(`Elevated M-class flare probability: ${result.solarFlareActivity.flareProbabilities.mClass}%`, "WARNING", "SPACE_WEATHER", "flare_probabilities", { probability: result.solarFlareActivity.flareProbabilities.mClass, class: "M" });
        }
      }
      
      if (latestProb.x_class_1_day !== undefined) {
        result.solarFlareActivity.flareProbabilities.xClass = parseInt(latestProb.x_class_1_day);
        alertManager.registerDataPoint("solar_flare_prob_x", result.solarFlareActivity.flareProbabilities.xClass, "%", "flare_probabilities", "SAFETY_CRITICAL");
        
        if (result.solarFlareActivity.flareProbabilities.xClass >= 10) {
          alertManager.addAlert(`X-class flare probability: ${result.solarFlareActivity.flareProbabilities.xClass}%`, "CRITICAL", "SPACE_WEATHER", "flare_probabilities", { probability: result.solarFlareActivity.flareProbabilities.xClass, class: "X" });
        }
      }
      
      if (latestProb["10mev_protons_1_day"] !== undefined) {
        result.solarFlareActivity.protonEventProbability = parseInt(latestProb["10mev_protons_1_day"]);
        alertManager.registerDataPoint("proton_event_prob", result.solarFlareActivity.protonEventProbability, "%", "flare_probabilities", "SAFETY_CRITICAL");
        
        if (result.solarFlareActivity.protonEventProbability >= 30) {
          alertManager.addAlert(`Solar Proton Event probability: ${result.solarFlareActivity.protonEventProbability}%`, "WARNING", "SPACE_WEATHER", "flare_probabilities", { probability: result.solarFlareActivity.protonEventProbability });
        }
      }
      
      alertManager.updateDataSourceStatus("flare_probabilities", "AVAILABLE", solarProbRes.responseTime);
    } else {
      alertManager.updateDataSourceStatus("flare_probabilities", "DEGRADED", solarProbRes.responseTime, "JSON endpoint unavailable, trying text fallback");
      
      const rsgaUrl = API_ENDPOINTS.SWPC_SGAS;
      const rsgaRes = await makeApiRequestWithBackoff(rsgaUrl, {}, 8000, 2);
      
      if (rsgaRes.status === 200 && typeof rsgaRes.data === "string" && rsgaRes.data.length > 0) {
        const rsgaText = rsgaRes.data;
        
        const cPatterns = [/Class\s+C\s+(\d+)/im, /C[\-\s]*class[:\s]+(\d+)/im];
        const mPatterns = [/Class\s+M\s+(\d+)/im, /M[\-\s]*class[:\s]+(\d+)/im];
        const xPatterns = [/Class\s+X\s+(\d+)/im, /X[\-\s]*class[:\s]+(\d+)/im];
        const protonPatterns = [/Proton\s+(\d+)/im, /10\s*MeV\s+protons?\s+(\d+)/im];
        
        for (const pattern of cPatterns) {
          const match = rsgaText.match(pattern);
          if (match && result.solarFlareActivity.flareProbabilities.cClass === null) {
            result.solarFlareActivity.flareProbabilities.cClass = parseInt(match[1]);
            alertManager.registerDataPoint("solar_flare_prob_c", result.solarFlareActivity.flareProbabilities.cClass, "%", "flare_probabilities", "OPERATIONAL");
            break;
          }
        }
        
        for (const pattern of mPatterns) {
          const match = rsgaText.match(pattern);
          if (match && result.solarFlareActivity.flareProbabilities.mClass === null) {
            result.solarFlareActivity.flareProbabilities.mClass = parseInt(match[1]);
            alertManager.registerDataPoint("solar_flare_prob_m", result.solarFlareActivity.flareProbabilities.mClass, "%", "flare_probabilities", "SAFETY_CRITICAL");
            if (result.solarFlareActivity.flareProbabilities.mClass >= 40) {
              alertManager.addAlert(`Elevated M-class flare probability: ${result.solarFlareActivity.flareProbabilities.mClass}%`, "WARNING", "SPACE_WEATHER", "flare_probabilities", { probability: result.solarFlareActivity.flareProbabilities.mClass, class: "M" });
            }
            break;
          }
        }
        
        for (const pattern of xPatterns) {
          const match = rsgaText.match(pattern);
          if (match && result.solarFlareActivity.flareProbabilities.xClass === null) {
            result.solarFlareActivity.flareProbabilities.xClass = parseInt(match[1]);
            alertManager.registerDataPoint("solar_flare_prob_x", result.solarFlareActivity.flareProbabilities.xClass, "%", "flare_probabilities", "SAFETY_CRITICAL");
            if (result.solarFlareActivity.flareProbabilities.xClass >= 10) {
              alertManager.addAlert(`X-class flare probability: ${result.solarFlareActivity.flareProbabilities.xClass}%`, "CRITICAL", "SPACE_WEATHER", "flare_probabilities", { probability: result.solarFlareActivity.flareProbabilities.xClass, class: "X" });
            }
            break;
          }
        }
        
        for (const pattern of protonPatterns) {
          const match = rsgaText.match(pattern);
          if (match && result.solarFlareActivity.protonEventProbability === null) {
            result.solarFlareActivity.protonEventProbability = parseInt(match[1]);
            alertManager.registerDataPoint("proton_event_prob", result.solarFlareActivity.protonEventProbability, "%", "flare_probabilities", "SAFETY_CRITICAL");
            if (result.solarFlareActivity.protonEventProbability >= 30) {
              alertManager.addAlert(`Solar Proton Event probability: ${result.solarFlareActivity.protonEventProbability}%`, "WARNING", "SPACE_WEATHER", "flare_probabilities", { probability: result.solarFlareActivity.protonEventProbability });
            }
            break;
          }
        }
        
        if (result.solarFlareActivity.flareProbabilities.mClass !== null || result.solarFlareActivity.flareProbabilities.xClass !== null) {
          alertManager.updateDataSourceStatus("flare_probabilities", "AVAILABLE", rsgaRes.responseTime);
        } else {
          alertManager.updateDataSourceStatus("flare_probabilities", "DEGRADED", rsgaRes.responseTime, "Could not parse flare probabilities from RSGA");
        }
      } else {
        alertManager.updateDataSourceStatus("flare_probabilities", "FAILED", solarProbRes.responseTime, "All flare probability sources is unavailable.");
      }
    }
    
    const scalesRes = await makeApiRequestWithBackoff(API_ENDPOINTS.SWPC_SOLAR_PROBS, {}, 8000, 2);
    
    if (scalesRes.status === 200 && scalesRes.data) {
      const scales = scalesRes.data;
      
      if (scales["0"] && scales["0"].R) {
        const rScale = scales["0"].R;
        if (rScale.MinorProb !== undefined && result.geomagnticStormForecast.radioBlackoutProbR1R2 === null) {
          result.geomagnticStormForecast.radioBlackoutProbR1R2 = parseFloat(rScale.MinorProb) || 0;
          alertManager.registerDataPoint("radio_blackout_prob_r1r2", result.geomagnticStormForecast.radioBlackoutProbR1R2, "%", "solar_event_forecasts", "OPERATIONAL");
        }
        if (rScale.MajorProb !== undefined && result.geomagnticStormForecast.radioBlackoutProbR3 === null) {
          result.geomagnticStormForecast.radioBlackoutProbR3 = parseFloat(rScale.MajorProb) || 0;
          alertManager.registerDataPoint("radio_blackout_prob_r3", result.geomagnticStormForecast.radioBlackoutProbR3, "%", "solar_event_forecasts", "SAFETY_CRITICAL");
        }
      }
      
      if (scales["0"] && scales["0"].S) {
        const sScale = scales["0"].S;
        if (sScale.Prob !== undefined && result.solarFlareActivity.protonEventProbability === null) {
          result.solarFlareActivity.protonEventProbability = parseFloat(sScale.Prob) || 0;
          alertManager.registerDataPoint("proton_event_prob", result.solarFlareActivity.protonEventProbability, "%", "solar_event_forecasts", "SAFETY_CRITICAL");
        }
      }
      
      alertManager.updateDataSourceStatus("solar_event_forecasts", "AVAILABLE", scalesRes.responseTime);
    } else {
      alertManager.updateDataSourceStatus("solar_event_forecasts", "DEGRADED", scalesRes.responseTime, "Could not parse NOAA scales data");
    }
    
    const solarRegionsRes = await makeApiRequestWithBackoff(API_ENDPOINTS.SWPC_SOLAR_REGIONS, {}, 8000, 2);
    
    if (solarRegionsRes.status === 200 && Array.isArray(solarRegionsRes.data) && solarRegionsRes.data.length > 0) {
      for (const region of solarRegionsRes.data) {
        if (region && region.Region) {
          result.solarFlareActivity.activeRegions.push({
            regionNumber: region.Region,
            location: region.Location || null,
            area: region.Area !== undefined ? parseInt(region.Area) : null,
            numSpots: region.NumSpots !== undefined ? parseInt(region.NumSpots) : null,
            magClass: region.MagClass || null,
            spotClass: region.SpotClass || null
          });
        }
      }
    }
    
    const alertsRes = await makeApiRequestWithBackoff(API_ENDPOINTS.SWPC_ALERTS, {}, 8000, 2);
    
    if (alertsRes.status === 200 && Array.isArray(alertsRes.data) && alertsRes.data.length > 0) {
      const now = Date.now();
      const alertWindow = 72 * 60 * 60 * 1000;
      
      for (const alert of alertsRes.data) {
        if (!alert || !alert.message) continue;
        
        const alertTime = alert.issue_datetime ? new Date(alert.issue_datetime).getTime() : 0;
        if (now - alertTime > alertWindow) continue;
        
        const msgLower = alert.message.toLowerCase();
        
        if (msgLower.includes("cme") || msgLower.includes("coronal mass ejection")) {
          result.cmeStatus.alerts.push({
            type: "CME",
            issueTime: alert.issue_datetime,
            message: alert.message.substring(0, 500),
            productId: alert.product_id || null
          });
          
          const arrivalPatterns = [
            /arrival[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]?\d{0,4})/i,
            /arrive[s]?\s+(?:on\s+)?(\d{1,2}[\/\-]\d{1,2})/i,
            /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*)/i,
            /expected\s+(\d{1,2}[\/\-]\d{1,2})/i,
            /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/i
          ];
          
          for (const pattern of arrivalPatterns) {
            const arrivalMatch = alert.message.match(pattern);
            if (arrivalMatch && !result.cmeStatus.estimatedArrival) {
              result.cmeStatus.estimatedArrival = arrivalMatch[1];
              break;
            }
          }
          
          if (msgLower.includes("expected") || msgLower.includes("likely") || msgLower.includes("will arrive")) {
            result.cmeStatus.arrivalProbability = result.cmeStatus.arrivalProbability !== null ? Math.max(result.cmeStatus.arrivalProbability, 60) : 60;
          } else if (msgLower.includes("possible") || msgLower.includes("may arrive")) {
            result.cmeStatus.arrivalProbability = result.cmeStatus.arrivalProbability !== null ? Math.max(result.cmeStatus.arrivalProbability, 40) : 40;
          } else if (msgLower.includes("earth-directed") || msgLower.includes("earthward")) {
            result.cmeStatus.arrivalProbability = result.cmeStatus.arrivalProbability !== null ? Math.max(result.cmeStatus.arrivalProbability, 50) : 50;
          }
          
          result.cmeStatus.activeCMEs.push({
            detected: alert.issue_datetime,
            description: alert.message.substring(0, 200)
          });
        }
        
        if (msgLower.includes("proton event") || msgLower.includes("solar radiation storm") || msgLower.includes("s1") || msgLower.includes("s2") || msgLower.includes("s3")) {
          result.cmeStatus.alerts.push({
            type: "SPE",
            issueTime: alert.issue_datetime,
            message: alert.message.substring(0, 500),
            productId: alert.product_id || null
          });
          
          alertManager.addAlert("A Solar Proton Event warning is in effect.", "WARNING", "SPACE_WEATHER", "swpc_alerts", { alertType: "SPE", issueTime: alert.issue_datetime });
        }
        
        if (msgLower.includes("geomagnetic storm") || msgLower.includes("g1") || msgLower.includes("g2") || msgLower.includes("g3") || msgLower.includes("g4") || msgLower.includes("g5")) {
          result.cmeStatus.alerts.push({
            type: "GEOMAGNETIC",
            issueTime: alert.issue_datetime,
            message: alert.message.substring(0, 500),
            productId: alert.product_id || null
          });
        }
      }
      
      if (result.cmeStatus.alerts.length > 0 || result.cmeStatus.activeCMEs.length > 0) {
        result.cmeStatus.dataAvailable = true;
        alertManager.updateDataSourceStatus("swpc_alerts", "AVAILABLE", alertsRes.responseTime);
        
        if (result.cmeStatus.arrivalProbability !== null) {
          alertManager.registerDataPoint("cme_arrival_probability", result.cmeStatus.arrivalProbability, "%", "swpc_alerts", "PRIMARY");
        }
        
        const cmeAlertCount = result.cmeStatus.alerts.filter(a => a.type === "CME").length;
        if (cmeAlertCount > 0) {
          alertManager.addAlert(`${cmeAlertCount} CME alert(s) in past 72 hours`, cmeAlertCount > 2 ? "WARNING" : "ADVISORY", "SPACE_WEATHER", "swpc_alerts", { cmeAlertCount });
        }
      } else {
        alertManager.updateDataSourceStatus("swpc_alerts", "AVAILABLE", alertsRes.responseTime);
      }
    } else {
      alertManager.updateDataSourceStatus("swpc_alerts", "DEGRADED", alertsRes.responseTime, alertsRes.error || "The SWPC alerts could not be retrieved.");
    }
    
    const atmosUrl = `${API_ENDPOINTS.OPEN_METEO_FORECAST}?latitude=${lat}&longitude=${lon}&hourly=temperature_850hPa,temperature_700hPa,temperature_500hPa,relative_humidity_850hPa,relative_humidity_700hPa,relative_humidity_500hPa,cloud_cover_low,cloud_cover_mid,cloud_cover_high,precipitation,freezing_level_height,cape&current=precipitation,weather_code,cloud_cover&daily=precipitation_sum&timezone=UTC&forecast_days=2`;
    const atmosRes = await makeApiRequestWithBackoff(atmosUrl, {}, 10000, 2);
    
    let triboDataAvailable = false;
    let temp850 = null, temp700 = null, temp500 = null;
    let rh850 = null, rh700 = null, rh500 = null;
    let cloudLow = null, cloudMid = null, cloudHigh = null;
    let freezingLevel = null;
    let cape = null;
    let currentPrecip = null;
    let currentWeatherCode = null;
    
    if (atmosRes.status === 200 && atmosRes.data) {
      alertManager.updateDataSourceStatus("atmospheric_profile", "AVAILABLE", atmosRes.responseTime);
      
      if (atmosRes.data.current) {
        currentPrecip = atmosRes.data.current.precipitation;
        currentWeatherCode = atmosRes.data.current.weather_code;
      }
      
      if (atmosRes.data.hourly) {
        const hourly = atmosRes.data.hourly;
        const currentHourIndex = new Date().getUTCHours();
        const idx = Math.min(currentHourIndex, (hourly.time || []).length - 1);
        
        if (hourly.temperature_850hPa && hourly.temperature_850hPa[idx] !== undefined) {
          temp850 = hourly.temperature_850hPa[idx];
          result.atmosphericCharging.atmosphericProfile.temp850 = temp850;
        }
        if (hourly.temperature_700hPa && hourly.temperature_700hPa[idx] !== undefined) {
          temp700 = hourly.temperature_700hPa[idx];
          result.atmosphericCharging.atmosphericProfile.temp700 = temp700;
        }
        if (hourly.temperature_500hPa && hourly.temperature_500hPa[idx] !== undefined) {
          temp500 = hourly.temperature_500hPa[idx];
          result.atmosphericCharging.atmosphericProfile.temp500 = temp500;
        }
        if (hourly.relative_humidity_850hPa && hourly.relative_humidity_850hPa[idx] !== undefined) {
          rh850 = hourly.relative_humidity_850hPa[idx];
          result.atmosphericCharging.atmosphericProfile.rh850 = rh850;
        }
        if (hourly.relative_humidity_700hPa && hourly.relative_humidity_700hPa[idx] !== undefined) {
          rh700 = hourly.relative_humidity_700hPa[idx];
          result.atmosphericCharging.atmosphericProfile.rh700 = rh700;
        }
        if (hourly.relative_humidity_500hPa && hourly.relative_humidity_500hPa[idx] !== undefined) {
          rh500 = hourly.relative_humidity_500hPa[idx];
          result.atmosphericCharging.atmosphericProfile.rh500 = rh500;
        }
        if (hourly.cloud_cover_low && hourly.cloud_cover_low[idx] !== undefined) {
          cloudLow = hourly.cloud_cover_low[idx];
          result.atmosphericCharging.cloudLayerAnalysis.lowCloud = cloudLow;
        }
        if (hourly.cloud_cover_mid && hourly.cloud_cover_mid[idx] !== undefined) {
          cloudMid = hourly.cloud_cover_mid[idx];
          result.atmosphericCharging.cloudLayerAnalysis.midCloud = cloudMid;
        }
        if (hourly.cloud_cover_high && hourly.cloud_cover_high[idx] !== undefined) {
          cloudHigh = hourly.cloud_cover_high[idx];
          result.atmosphericCharging.cloudLayerAnalysis.highCloud = cloudHigh;
        }
        if (hourly.freezing_level_height && hourly.freezing_level_height[idx] !== undefined) {
          freezingLevel = hourly.freezing_level_height[idx];
        }
        if (hourly.cape && hourly.cape[idx] !== undefined) {
          cape = hourly.cape[idx];
        }
        
        triboDataAvailable = true;
      }
    } else {
      alertManager.updateDataSourceStatus("atmospheric_profile", "FAILED", atmosRes.responseTime, atmosRes.error || "Atmospheric data is unavailable.");
    }
    
    const pwUrl = `${API_ENDPOINTS.OPEN_METEO_ENSEMBLE}?latitude=${lat}&longitude=${lon}&hourly=precipitation&models=icon_seamless&forecast_days=1`;
    const pwRes = await makeApiRequestWithBackoff(pwUrl, {}, 8000, 1);
    
    let precipitableWater = null;
    
    if (pwRes.status === 200 && pwRes.data && pwRes.data.hourly) {
      const precip = pwRes.data.hourly.precipitation;
      if (Array.isArray(precip) && precip.length > 0) {
        const validPrecip = precip.filter(p => p !== null && p !== undefined);
        if (validPrecip.length > 0) {
          const avgPrecip = validPrecip.reduce((a, b) => a + b, 0) / validPrecip.length;
          precipitableWater = Math.round(avgPrecip * 10 + 15);
          result.atmosphericCharging.cloudLayerAnalysis.precipitableWater = precipitableWater;
        }
      }
    }
    
    if (precipitableWater === null && rh850 !== null && rh700 !== null && rh500 !== null) {
      const avgRh = (rh850 + rh700 + rh500) / 3;
      precipitableWater = Math.round(avgRh * 0.5 + 10);
      result.atmosphericCharging.cloudLayerAnalysis.precipitableWater = precipitableWater;
    }
    
    if (triboDataAvailable) {
      let iceCrystalIndex = 0;
      
      if (temp700 !== null && temp700 < 0 && temp700 > -40) {
        iceCrystalIndex += 0.3;
        if (temp700 > -20 && temp700 < -10) {
          iceCrystalIndex += 0.2;
        }
      }
      if (temp500 !== null && temp500 < -10 && temp500 > -50) {
        iceCrystalIndex += 0.2;
      }
      if (rh700 !== null && rh700 > 70) {
        iceCrystalIndex += 0.15;
      }
      if (rh500 !== null && rh500 > 60) {
        iceCrystalIndex += 0.1;
      }
      if (cloudMid !== null && cloudMid > 50) {
        iceCrystalIndex += 0.05;
      }
      
      iceCrystalIndex = Math.min(1.0, iceCrystalIndex);
      
      let triboRisk = 0;
      
      if (currentPrecip !== null && currentPrecip > 0) {
        triboRisk += Math.min(0.3, currentPrecip * 0.05);
      }
      
      if (cloudHigh !== null && cloudHigh > 60) {
        triboRisk += 0.1;
      }
      if (cloudMid !== null && cloudMid > 70) {
        triboRisk += 0.15;
      }
      
      triboRisk += iceCrystalIndex * 0.3;
      
      if (cape !== null && cape > 1000) {
        triboRisk += Math.min(0.2, (cape - 1000) / 5000);
      }
      
      if (currentWeatherCode !== null) {
        if ([95, 96, 99].includes(currentWeatherCode)) {
          triboRisk += 0.4;
        } else if ([80, 81, 82].includes(currentWeatherCode)) {
          triboRisk += 0.2;
        } else if ([71, 73, 75, 77, 85, 86].includes(currentWeatherCode)) {
          triboRisk += 0.15;
        }
      }
      
      triboRisk = Math.min(1.0, triboRisk);
      
      result.atmosphericCharging.iceCrystalIndicator = parseFloat(iceCrystalIndex.toFixed(2));
      result.atmosphericCharging.riskIndex = parseFloat(triboRisk.toFixed(2));
      result.atmosphericCharging.dataAvailable = true;
      
      alertManager.registerDataPoint("ice_crystal_indicator", iceCrystalIndex, "index", "triboelectric_assessment", "OPERATIONAL");
      alertManager.registerDataPoint("triboelectric_risk_index", triboRisk, "index", "triboelectric_assessment", "OPERATIONAL");
      alertManager.updateDataSourceStatus("triboelectric_assessment", "AVAILABLE", 0);
      
      if (triboRisk > 0.7) {
        alertManager.addAlert(`High triboelectric charging risk: ${(triboRisk * 100).toFixed(0)}%`, "WARNING", "ELECTROSTATIC", "triboelectric_assessment", { riskIndex: triboRisk, iceCrystal: iceCrystalIndex });
      } else if (triboRisk > 0.5) {
        alertManager.addAlert(`Moderate triboelectric charging risk: ${(triboRisk * 100).toFixed(0)}%`, "ADVISORY", "ELECTROSTATIC", "triboelectric_assessment", { riskIndex: triboRisk, iceCrystal: iceCrystalIndex });
      }

    } else {
      alertManager.updateDataSourceStatus("triboelectric_assessment", "FAILED", 0, "Insufficient atmospheric data for triboelectric assessment");
    }
    
    let neutronJung = null, neutronNewk = null;
    const jungData = [];
    const newkData = [];
    
    const neutronStart = Date.now();
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (7 * 24 * 60 * 60 * 1000));
    const nmdbStationUrl = (code) => `${API_ENDPOINTS.NMDB_GRAPH}?wget=1&stations[]=${code}&output=ascii&tabchoice=revori&dtype=corr_for_pressure&date_choice=bydate&start_year=${startDate.getUTCFullYear()}&start_month=${String(startDate.getUTCMonth() + 1).padStart(2, "0")}&start_day=${String(startDate.getUTCDate()).padStart(2, "0")}&start_hour=${startDate.getUTCHours()}&start_min=0&end_year=${endDate.getUTCFullYear()}&end_month=${String(endDate.getUTCMonth() + 1).padStart(2, "0")}&end_day=${String(endDate.getUTCDate()).padStart(2, "0")}&end_hour=${endDate.getUTCHours()}&end_min=59&tresolution=30&force=1&yunits=0`;
    const [stationCatalog, activeStations] = await Promise.all([fetchNmdbStationCatalog(), fetchNmdbActiveStations()]);
    const locationCutoff = estimateVerticalCutoffRigidity(lat, lon);
    const stationSeries = {};
    const windowHours = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 3600000));
    const stationCoverage = (code) => Math.min(100, ((stationSeries[code] || []).length / windowHours) * 100);
    const stationIsRecent = (code) => {
      const series = stationSeries[code] || [];
      if (!series.length) return false;
      return Date.now() - new Date(`${String(series[series.length - 1].timestamp).replace(" ", "T")}Z`).getTime() <= 6 * 3600000;
    };
    const stationIsGood = (code) => stationIsRecent(code) && stationCoverage(code) >= 75;
    const stationScore = (code) => (stationIsRecent(code) ? 1000 : 0) + stationCoverage(code);
    const chooseStation = async (ranked, limit) => {
      let best = null;
      for (const code of ranked.slice(0, limit)) {
        if (!stationSeries[code]) {
          const res = await makeApiRequestWithBackoff(nmdbStationUrl(code), {}, 30000, 1);
          stationSeries[code] = res.status === 200 && typeof res.data === "string" ? (parseNmdbAscii(res.data, [code])[code] || []) : [];
        }
        if (!best || stationScore(code) > stationScore(best)) best = code;
        if (stationIsGood(code)) return code;
      }
      return best;
    };
    const candidates = stationCatalog ? Object.keys(stationCatalog).filter(code => !activeStations.size || activeStations.has(code)) : [];
    const localRanked = [...candidates].sort((x, y) => Math.abs(stationCatalog[x].cutoff - locationCutoff) - Math.abs(stationCatalog[y].cutoff - locationCutoff));
    const primaryCode = candidates.length ? await chooseStation(localRanked, 6) : null;
    const polarRanked = candidates.filter(code => code !== primaryCode).sort((x, y) => stationCatalog[x].cutoff - stationCatalog[y].cutoff);
    const secondaryCode = polarRanked.length ? await chooseStation(polarRanked, 6) : null;
    const discoveryError = !stationCatalog ? "The NMDB station catalog could not be loaded." : !candidates.length ? "No active neutron monitor stations were found in the NMDB realtime feed." : "No neutron monitor station returned data for the last 7 days.";
    const nmdbRes = { status: primaryCode && (stationSeries[primaryCode] || []).length ? 200 : 0, data: "", responseTime: Date.now() - neutronStart, error: discoveryError };
    
    if (nmdbRes.status === 200) {
      const toPercentOfMean = (series) => {
        const mean = series.length ? series.reduce((sum, point) => sum + point.value, 0) / series.length : 0;
        return mean > 0 ? series.map(point => ({ timestamp: point.timestamp, value: parseFloat(((point.value / mean) * 100).toFixed(3)) })) : [];
      };
      jungData.push(...toPercentOfMean(stationSeries[primaryCode]));
      if (secondaryCode) newkData.push(...toPercentOfMean(stationSeries[secondaryCode] || []));
      const describeCatalogStation = (code) => code ? { code, name: stationCatalog[code].name, cutoff: stationCatalog[code].cutoff, altitude: stationCatalog[code].altitude, coverage: parseFloat(stationCoverage(code).toFixed(1)) } : null;
      result.historicalRadiation.neutronStations = {
        locationCutoff,
        activeStationCount: candidates.length,
        primary: { ...describeCatalogStation(primaryCode), role: "Closest Cutoff to Location" },
        secondary: secondaryCode ? { ...describeCatalogStation(secondaryCode), role: "Polar Reference" } : null
      };
      
      const expectedPoints = 7 * 24;
      let neutronDataAvailable = false;
      
      if (jungData.length > 0) {
        neutronJung = jungData[jungData.length - 1].value;
        alertManager.registerDataPoint("neutron_jung", neutronJung, "percent_baseline", "neutron_monitors", "OPERATIONAL");
        result.radiationLevels.neutronFlux = parseFloat(neutronJung.toFixed(2));
        result.historicalRadiation.neutronTimeSeries.jung = jungData;
        alertManager.registerHistoricalData("neutron_jung_history", jungData);
        neutronDataAvailable = true;
        
        const njvalues = jungData.map(d => d.value);
        const njmean = njvalues.reduce((a, b) => a + b, 0) / njvalues.length;
        const njvariance = njvalues.reduce((sum, v) => sum + Math.pow(v - njmean, 2), 0) / njvalues.length;
        const njstdDev = Math.sqrt(njvariance);
        
        result.historicalRadiation.statistics.neutronJung = {
          min: Math.min(...njvalues),
          max: Math.max(...njvalues),
          mean: njmean,
          stdDev: njstdDev,
          current: neutronJung,
          dataPoints: njvalues.length,
          expectedPoints: expectedPoints,
          coverage: ((njvalues.length / expectedPoints) * 100).toFixed(1) + "%",
          station: primaryCode,
          cutoffRigidity: "4.5 GV",
          baselineNote: "Values are a percentage of each station's reference baseline."
        };
        
        const jforbushThreshold = njmean - (2 * njstdDev);
        const jrecentValues = njvalues.slice(-6);
        const jrecentMean = jrecentValues.reduce((a, b) => a + b, 0) / jrecentValues.length;
        if (jrecentMean < jforbushThreshold) {
          alertManager.addAlert(`${primaryCode}: Potential Forbush decrease detected (${jrecentMean.toFixed(1)}% vs baseline ${njmean.toFixed(1)}%)`, "ADVISORY", "SPACE_WEATHER", "neutron_monitors", { station: "JUNG", current: jrecentMean, baseline: njmean, threshold: jforbushThreshold });
        }
      }
      
      if (newkData.length > 0) {
        neutronNewk = newkData[newkData.length - 1].value;
        alertManager.registerDataPoint("neutron_newk", neutronNewk, "percent_baseline", "neutron_monitors", "OPERATIONAL");
        result.historicalRadiation.neutronTimeSeries.newk = newkData;
        alertManager.registerHistoricalData("neutron_newk_history", newkData);
        neutronDataAvailable = true;
        
        const nnvalues = newkData.map(d => d.value);
        const nnmean = nnvalues.reduce((a, b) => a + b, 0) / nnvalues.length;
        const nnvariance = nnvalues.reduce((sum, v) => sum + Math.pow(v - nnmean, 2), 0) / nnvalues.length;
        const nnstdDev = Math.sqrt(nnvariance);
        
        result.historicalRadiation.statistics.neutronNewk = {
          min: Math.min(...nnvalues),
          max: Math.max(...nnvalues),
          mean: nnmean,
          stdDev: nnstdDev,
          current: neutronNewk,
          dataPoints: nnvalues.length,
          expectedPoints: expectedPoints,
          coverage: ((nnvalues.length / expectedPoints) * 100).toFixed(1) + "%",
          station: secondaryCode,
          cutoffRigidity: "2.4 GV",
          baselineNote: "Values are a percentage of each station's reference baseline."
        };
        
        const nforbushThreshold = nnmean - (2 * nnstdDev);
        const nrecentValues = nnvalues.slice(-6);
        const nrecentMean = nrecentValues.reduce((a, b) => a + b, 0) / nrecentValues.length;
        if (nrecentMean < nforbushThreshold) {
          alertManager.addAlert(`${secondaryCode}: Potential Forbush decrease detected (${nrecentMean.toFixed(1)}% vs baseline ${nnmean.toFixed(1)}%)`, "ADVISORY", "SPACE_WEATHER", "neutron_monitors", { station: "NEWK", current: nrecentMean, baseline: nnmean, threshold: nforbushThreshold });
        }
      }
      
      if (neutronDataAvailable) {
        const spanHours = windowHours;
        const chosenStations = [primaryCode, secondaryCode].filter(Boolean);
        const coverages = chosenStations.map(code => [code, stationCoverage(code)]);
        const latestTime = (series) => series.length ? new Date(`${String(series[series.length - 1].timestamp).replace(" ", "T")}Z`).getTime() : 0;
        const staleStations = [[primaryCode, jungData], [secondaryCode, newkData]].filter(([code]) => code).filter(([, series]) => Date.now() - latestTime(series) > 6 * 3600000).map(([code]) => code);
        const lowStations = coverages.filter(([, coverage]) => coverage < 75);
        const totalPoints = jungData.length + newkData.length;
        const totalExpected = spanHours * 2;
        const overallCoverage = totalExpected > 0 ? Math.min(100, (totalPoints / totalExpected) * 100) : 0;
        const describeStation = (code, series) => series.length ? `${code} returned ${series.length} of ${spanHours} hourly values between ${series[0].timestamp} and ${series[series.length - 1].timestamp} UTC` : `${code} returned no values`;
        const stationSeriesByCode = { [primaryCode]: jungData, [secondaryCode]: newkData };
        if (!staleStations.length && !lowStations.length) {
          alertManager.updateDataSourceStatus("neutron_monitors", "AVAILABLE", nmdbRes.responseTime);
        } else {
          const affected = [...new Set([...staleStations, ...lowStations.map(([code]) => code)])];
          alertManager.updateDataSourceStatus("neutron_monitors", "DEGRADED", nmdbRes.responseTime, `Neutron monitor data is incomplete because ${affected.map(code => describeStation(code, stationSeriesByCode[code] || [])).join(" and ")}, and none of the ${Object.keys(stationSeries).length} active stations checked reported more completely.`);
        }
        
        result.historicalRadiation.statistics.neutronSummary = {
          totalDataPoints: totalPoints,
          expectedDataPoints: totalExpected,
          overallCoverage: overallCoverage.toFixed(1) + "%",
          stationsReporting: [jungData.length > 0 ? primaryCode : null, newkData.length > 0 ? secondaryCode : null].filter(Boolean),
          note: "Neutron monitor values use station-specific baselines and should not be directly compared across stations. Use for trend analysis within each station."
        };
        
        if (jungData.length > 0 && newkData.length > 0) {
          const jungValues = jungData.slice(-24).map(d => d.value);
          const ouluValues = newkData.slice(-24).map(d => d.value);
          
          if (jungValues.length >= 12 && ouluValues.length >= 12) {
            const jungRecent = jungValues.slice(-6);
            const jungEarlier = jungValues.slice(0, 6);
            const ouluRecent = ouluValues.slice(-6);
            const ouluEarlier = ouluValues.slice(0, 6);
            
            const jungTrend = (jungRecent.reduce((a, b) => a + b, 0) / jungRecent.length) - (jungEarlier.reduce((a, b) => a + b, 0) / jungEarlier.length);
            const ouluTrend = (ouluRecent.reduce((a, b) => a + b, 0) / ouluRecent.length) - (ouluEarlier.reduce((a, b) => a + b, 0) / ouluEarlier.length);
            
            if ((jungTrend < -2 && ouluTrend < -2) || (jungTrend > 2 && ouluTrend > 2)) {
              const direction = jungTrend < 0 ? "decreasing" : "increasing";
              alertManager.addAlert(`Correlated cosmic ray ${direction} trend across multiple stations`, jungTrend < -3 ? "WARNING" : "ADVISORY", "SPACE_WEATHER", "neutron_monitors", { jungTrend: jungTrend.toFixed(2), ouluTrend: ouluTrend.toFixed(2) });
            }
          }
        }
      } else {
        alertManager.updateDataSourceStatus("neutron_monitors", "FAILED", nmdbRes.responseTime, "NMDB response received but no valid neutron counts parsed");
      }
    } else {
      alertManager.updateDataSourceStatus("neutron_monitors", "FAILED", nmdbRes.responseTime, nmdbRes.error || "NMDB neutron monitor data is unavailable.");
    }
    
    if (protonFlux10 !== null || electronFlux2 !== null) {
      alertManager.updateDataSourceStatus("radiation_environment", "AVAILABLE", 0);
    } else {
      alertManager.updateDataSourceStatus("radiation_environment", "FAILED", 0, "Insufficient particle flux data");
    }
    
    let f107Flux = null;
    const f107Res = await makeApiRequestWithBackoff(API_ENDPOINTS.SWPC_F107, {}, 5000, 1);
    
    if (f107Res.status === 200 && Array.isArray(f107Res.data) && f107Res.data.length > 0) {
      for (let i = f107Res.data.length - 1; i >= 0; i--) {
        const entry = f107Res.data[i];
        if (entry && entry.flux !== undefined) {
          const flux = parseFloat(entry.flux);
          if (!isNaN(flux) && flux > 0) {
            f107Flux = flux;
            break;
          }
        }
      }
      
      if (f107Flux !== null) {
        alertManager.updateDataSourceStatus("f107_flux", "AVAILABLE", f107Res.responseTime);
        alertManager.registerDataPoint("f107_flux", f107Flux, "sfu", "f107_flux", "OPERATIONAL");
      } else {
        alertManager.updateDataSourceStatus("f107_flux", "DEGRADED", f107Res.responseTime, "No valid F10.7 flux values");
      }
    } else {
      alertManager.updateDataSourceStatus("f107_flux", "FAILED", f107Res.responseTime, f107Res.error || "F10.7 flux is unavailable.");
    }
    
    let signalIntegrityComputed = false;
    
    if (f107Flux !== null && currentKp !== null) {
      const latRad = Math.abs(lat) * Math.PI / 180;
      const latFactor = 1.0 + 0.3 * Math.cos(latRad);
      const tecBase = 0.15 * f107Flux + 5;
      const tecKpContribution = currentKp * 2.5;
      const tec = (tecBase + tecKpContribution) * latFactor;
      result.signalIntegrity.tec = parseFloat(tec.toFixed(1));
      alertManager.registerDataPoint("total_electron_content", tec, "TECU", "signal_integrity", "OPERATIONAL");
      
      const s4Base = 0.05 + (currentKp / 9) * 0.4;
      const s4LatBoost = Math.abs(lat) > 60 ? 0.15 : (Math.abs(lat) > 45 ? 0.08 : 0);
      const s4ProtonBoost = protonFlux10 !== null ? Math.min(0.1, protonFlux10 / 100) : 0;
      const s4 = Math.min(0.9, s4Base + s4LatBoost + s4ProtonBoost);
      result.signalIntegrity.scintillation = parseFloat(s4.toFixed(2));
      alertManager.registerDataPoint("scintillation_s4", s4, "S4", "signal_integrity", "OPERATIONAL");
      
      const gpsBaseAccuracy = 1.5;
      const gpsKpDegradation = currentKp * 0.4;
      const gpsTecDegradation = Math.max(0, (tec - 30) * 0.05);
      const gpsScintDegradation = s4 > 0.3 ? (s4 - 0.3) * 5 : 0;
      const gpsAccuracy = gpsBaseAccuracy + gpsKpDegradation + gpsTecDegradation + gpsScintDegradation;
      result.signalIntegrity.gpsAccuracy = parseFloat(Math.min(10, gpsAccuracy).toFixed(2));
      alertManager.registerDataPoint("gps_accuracy", result.signalIntegrity.gpsAccuracy, "m", "signal_integrity", "OPERATIONAL");
      
      const radioLinkBase = 98;
      const radioLinkKpPenalty = currentKp * 2;
      const radioLinkScintPenalty = s4 > 0.4 ? (s4 - 0.4) * 30 : 0;
      const radioLinkProtonPenalty = protonFlux10 !== null && protonFlux10 > 10 ? Math.min(15, (protonFlux10 - 10) * 0.5) : 0;
      const radioLinkQuality = Math.max(40, radioLinkBase - radioLinkKpPenalty - radioLinkScintPenalty - radioLinkProtonPenalty);
      result.signalIntegrity.radioLinkQuality = parseFloat(radioLinkQuality.toFixed(1));
      alertManager.registerDataPoint("radio_link_quality", radioLinkQuality, "%", "signal_integrity", "OPERATIONAL");
      
      result.signalIntegrity.dataAvailable = true;
      signalIntegrityComputed = true;
      alertManager.updateDataSourceStatus("signal_integrity", "AVAILABLE", 0);
    } else if (currentKp !== null) {
      const s4 = 0.05 + (currentKp / 9) * 0.4;
      result.signalIntegrity.scintillation = parseFloat(s4.toFixed(2));
      alertManager.registerDataPoint("scintillation_s4", s4, "S4", "signal_integrity", "OPERATIONAL");
      
      const gpsAccuracy = 1.5 + currentKp * 0.5;
      result.signalIntegrity.gpsAccuracy = parseFloat(Math.min(10, gpsAccuracy).toFixed(2));
      alertManager.registerDataPoint("gps_accuracy", result.signalIntegrity.gpsAccuracy, "m", "signal_integrity", "OPERATIONAL");
      
      const radioLinkQuality = Math.max(60, 98 - currentKp * 3);
      result.signalIntegrity.radioLinkQuality = parseFloat(radioLinkQuality.toFixed(1));
      alertManager.registerDataPoint("radio_link_quality", radioLinkQuality, "%", "signal_integrity", "OPERATIONAL");
      
      result.signalIntegrity.dataAvailable = true;
      signalIntegrityComputed = true;
      alertManager.updateDataSourceStatus("signal_integrity", "DEGRADED", 0, "TEC unavailable - using Kp-only model");
    } else {
      alertManager.updateDataSourceStatus("signal_integrity", "FAILED", 0, "Insufficient space weather data for signal integrity computation");
    }
    
    if (currentKp !== null) {
      result.spectrumTrafficLight.hf = currentKp < 3 ? "GREEN" : currentKp < 5 ? "YELLOW" : "RED";
      result.spectrumTrafficLight.sBand = currentKp < 6 ? "GREEN" : currentKp < 8 ? "YELLOW" : "RED";
      result.spectrumTrafficLight.lBand = currentKp < 4 ? "GREEN" : currentKp < 6 ? "YELLOW" : "RED";
      
      if (result.spectrumTrafficLight.hf === "RED") {
        alertManager.addAlert("HF communications are severely degraded.", "WARNING", "COMMS", "geomagnetic_kp", { band: "HF", kp: currentKp });
      } else if (result.spectrumTrafficLight.hf === "YELLOW") {
        alertManager.addAlert("HF communications may be affected.", "ADVISORY", "COMMS", "geomagnetic_kp", { band: "HF", kp: currentKp });
      }
    }
    
    const weatherUrl = `${API_ENDPOINTS.OPEN_METEO_FORECAST}?latitude=${lat}&longitude=${lon}&current=weather_code,precipitation&timezone=UTC`;
    const weatherRes = await makeApiRequestWithBackoff(weatherUrl, {}, 5000, 1);
    
    if (weatherRes.status === 200 && weatherRes.data?.current) {
      alertManager.updateDataSourceStatus("weather_lightning", "AVAILABLE", weatherRes.responseTime);
      const weatherCode = weatherRes.data.current.weather_code;
      const precipitation = weatherRes.data.current.precipitation;
      
      if ([95, 96, 99].includes(weatherCode)) {
        result.dischargeRisk.lightningRisk = "HIGH";
        alertManager.addAlert("An active thunderstorm with lightning has been detected.", "CRITICAL", "WEATHER", "weather_lightning", { weatherCode });
      } else if ([80, 81, 82].includes(weatherCode)) {
        result.dischargeRisk.lightningRisk = "MODERATE";
        alertManager.addAlert("Heavy showers may produce lightning.", "WARNING", "WEATHER", "weather_lightning", { weatherCode });
      } else if (precipitation !== null && precipitation > 2) {
        result.dischargeRisk.lightningRisk = "MODERATE";
      } else {
        result.dischargeRisk.lightningRisk = "LOW";
      }
    } else {
      alertManager.updateDataSourceStatus("weather_lightning", "FAILED", weatherRes.responseTime, weatherRes.error || "Weather data is unavailable.");
    }
    
    result.aurora = await fetchAuroraVisibility(lat, lon, alertManager).catch(error => ({ dataAvailable: false, error: error.message }));

    const fullReport = alertManager.getFullReport();
    result.violations = fullReport.violations;
    result.alerts = fullReport.alerts;
    result.alertManager = { dataSources: fullReport.dataSources, dataPoints: fullReport.dataPoints, summary: fullReport.summary, decision: fullReport.decision, historicalData: fullReport.historicalData };
    result.status = "AVAILABLE";
  } catch (error) {
    alertManager.addAlert(`Critical error in Space Weather module: ${error.message}`, "CRITICAL", "SYSTEM", "em_environment", { errorStack: error.stack });
    const fullReport = alertManager.getFullReport();
    result.status = "FAILED";
    result.violations = fullReport.violations;
    result.alerts = fullReport.alerts;
    result.alertManager = { dataSources: fullReport.dataSources, dataPoints: fullReport.dataPoints, summary: fullReport.summary, historicalData: fullReport.historicalData };
  }
  
  return result;
}

async function temporalForensicsSystem(lat, lon) {
  const startTime = Date.now();
  const alertManager = new AlertManager();
  
  const result = {
    status: "NO_DATA",
    timestamp: new Date().toISOString(),
    probabilisticOutcomes: { violations: {}, trends: [] },
    probabilityCone: { windSpeed: { forecast: [], confidence: [] }, precipitation: { forecast: [], confidence: [] }, kpIndex: { forecast: [], confidence: [] } },
    trendLines: { wind: { derivative: null, forecast: null, currentValue: null }, kp: { derivative: null, forecast: null, currentValue: null }, shear: { derivative: null, forecast: null } },
    sensorValidation: { drift: [], reliability: null, weatherFronts: [], dataQuality: [] },
    violations: [],
    alerts: [],
    alertManager: null,
    extendedForecasts: { atmospheric: [], geomagnetic: [], marineForecast: [] },
    coastalMesoscale: { seaBreezeFront: null, landSeaGradient: null, convergenceZones: [], thermalCirculation: null, onshoreFlow: null, marineLayerData: [], historicalGradients: [] },
    acousticPropagation: { soundSpeedProfile: [], refraction: null, shadowZones: [], ductingProbability: null, historicalProfiles: [] },
    radiationEnvironment: { differentialElectrons: [], differentialProtons: [], magnetopause: null, radiationBeltFlux: null, galacticCosmicRays: null, historicalRadiation: [] }
  };
  
  try {
    alertManager.registerDataSource("ensemble_forecast", "OPERATIONAL", "Ensemble weather forecast");
    alertManager.registerDataSource("hourly_forecast", "OPERATIONAL", "Hourly weather forecast");
    alertManager.registerDataSource("upper_air_forecast", "OPERATIONAL", "Upper atmosphere forecast");
    alertManager.registerDataSource("kp_history", "OPERATIONAL", "Historical Kp data");
    alertManager.registerDataSource("extended_marine", "OPERATIONAL", "Extended marine forecast");
    alertManager.registerDataSource("geomagnetic_forecast", "OPERATIONAL", "Geomagnetic forecast data");
    alertManager.registerDataSource("coastal_mesoscale", "INFORMATIONAL", "Coastal mesoscale effects");
    alertManager.registerDataSource("acoustic_propagation", "INFORMATIONAL", "Acoustic propagation modeling");
    alertManager.registerDataSource("differential_particles", "INFORMATIONAL", "Differential particle flux data");
    alertManager.registerDataSource("magnetosphere_state", "OPERATIONAL", "Magnetosphere state data");
    
    const ensembleUrl = `${API_ENDPOINTS.OPEN_METEO_ENSEMBLE}?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,wind_speed_10m,precipitation&models=gfs_seamless&forecast_days=3&timezone=UTC`;
    const ensembleRes = await makeApiRequestWithBackoff(ensembleUrl, {}, 20000, 2);
    let ensembleData = null;
    
    if (ensembleRes.status === 200 && ensembleRes.data?.hourly) {
      alertManager.updateDataSourceStatus("ensemble_forecast", "AVAILABLE", ensembleRes.responseTime);
      ensembleData = ensembleRes.data.hourly;
      
      const memberSeries = (prefix) => Object.keys(ensembleData).filter(key => key === prefix || key.startsWith(`${prefix}_member`)).map(key => ensembleData[key]);
      const temperatureMembers = memberSeries("temperature_2m");
      const windMembers = memberSeries("wind_speed_10m");
      const precipitationMembers = memberSeries("precipitation");
      const memberMean = (series, i) => {
        const values = series.map(s => s?.[i]).filter(v => v !== null && v !== undefined && isFinite(v));
        return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
      };
      const extendedAtmospheric = [];
      for (let i = 0; i < Math.min(72, ensembleData.time?.length || 0); i++) {
        const precipitationValues = precipitationMembers.map(s => s?.[i]).filter(v => v !== null && v !== undefined && isFinite(v));
        extendedAtmospheric.push({
          timestamp: ensembleData.time[i],
          temperature: memberMean(temperatureMembers, i),
          windSpeed: memberMean(windMembers, i),
          precipitationProb: precipitationValues.length ? Math.round((precipitationValues.filter(v => v >= 0.1).length / precipitationValues.length) * 100) : null
        });
      }
      result.extendedForecasts.atmospheric = extendedAtmospheric;
      alertManager.registerHistoricalData("atmospheric_forecast_extended", extendedAtmospheric);
      
      const windSpeeds = extendedAtmospheric.filter(d => d.windSpeed !== null).map(d => d.windSpeed);
      if (windSpeeds.length > 24) {
        const first24h = windSpeeds.slice(0, 24);
        const second24h = windSpeeds.slice(24, 48);
        const avg24h = first24h.reduce((a, b) => a + b, 0) / first24h.length;
        const avg48h = second24h.length > 0 ? second24h.reduce((a, b) => a + b, 0) / second24h.length : avg24h;
        
        if (avg48h > avg24h + 2) {
          alertManager.addAlert("Wind speeds are forecast to increase significantly in the next 24-48 hours.", "ADVISORY", "FORECAST", "ensemble_forecast",
            { avg24h: avg24h.toFixed(1), avg48h: avg48h.toFixed(1) });
        }
      }
      
      const precipEvents = extendedAtmospheric.filter(d => d.precipitationProb !== null && d.precipitationProb > 50).length;
      if (precipEvents > extendedAtmospheric.length * 0.3) {
        alertManager.addAlert(`High precipitation probability in extended forecast: ${precipEvents} hours >50%`, "ADVISORY", "FORECAST", "ensemble_forecast",
          { precipEvents, totalHours: extendedAtmospheric.length });
      }
    } else {
      alertManager.updateDataSourceStatus("ensemble_forecast", "FAILED", ensembleRes.responseTime, ensembleRes.error || "Ensemble forecast is unavailable.");
    }
    
    const surfaceUrl = `${API_ENDPOINTS.OPEN_METEO_FORECAST}?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure&hourly=temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation_probability,surface_pressure,relative_humidity_2m,dewpoint_2m,visibility&forecast_days=2&timezone=UTC`;
    const surfaceRes = await makeApiRequestWithBackoff(surfaceUrl, {}, 10000, 2);
    let currentData = null;
    let hourlyData = null;
    
    if (surfaceRes.status === 200) {
      alertManager.updateDataSourceStatus("hourly_forecast", "AVAILABLE", surfaceRes.responseTime);
      currentData = surfaceRes.data.current;
      hourlyData = surfaceRes.data.hourly;
    } else {
      alertManager.updateDataSourceStatus("hourly_forecast", "FAILED", surfaceRes.responseTime, surfaceRes.error || "Hourly forecast is unavailable.");
    }
    
    const levels = [1000, 925, 850, 700, 500, 300, 250, 200];
    const params = levels.map(l => `wind_speed_${l}hPa,wind_direction_${l}hPa,temperature_${l}hPa`).join(",");
    const upperUrl = `${API_ENDPOINTS.OPEN_METEO_FORECAST}?latitude=${lat}&longitude=${lon}&hourly=${params}&wind_speed_unit=ms&timezone=UTC&forecast_days=2`;
    const upperRes = await makeApiRequestWithBackoff(upperUrl, {}, 15000, 2);
    let windShearData = [];
    let upperAirData = null;
    
    if (upperRes.status === 200 && upperRes.data?.hourly) {
      alertManager.updateDataSourceStatus("upper_air_forecast", "AVAILABLE", upperRes.responseTime);
      upperAirData = upperRes.data.hourly;
      const h = upperRes.data.hourly;
      
      for (let timeIdx = 0; timeIdx < Math.min(48, h.wind_speed_1000hPa?.length || 0); timeIdx++) {
        let shearAtTime = 0;
        let validLayers = 0;
        
        for (let i = 1; i < levels.length; i++) {
          const currentLevel = levels[i];
          const prevLevel = levels[i - 1];
          const currentSpeed = h[`wind_speed_${currentLevel}hPa`] ? h[`wind_speed_${currentLevel}hPa`][timeIdx] : null;
          const prevSpeed = h[`wind_speed_${prevLevel}hPa`] ? h[`wind_speed_${prevLevel}hPa`][timeIdx] : null;
          
          if (currentSpeed !== null && prevSpeed !== null) {
            const altDiff = Math.log(prevLevel / currentLevel) * 8000;
            const speedDiff = Math.abs(currentSpeed - prevSpeed);
            if (altDiff > 0) { shearAtTime += speedDiff / (altDiff / 1000); validLayers++; }
          }
        }
        
        if (validLayers > 0) windShearData.push({ time: timeIdx, shear: shearAtTime / validLayers, timestamp: h.time ? h.time[timeIdx] : null });
      }
      
      if (windShearData.length > 0) {
        alertManager.registerHistoricalData("wind_shear_forecast", windShearData);
      }
    } else {
      alertManager.updateDataSourceStatus("upper_air_forecast", "FAILED", upperRes.responseTime, upperRes.error || "Upper air forecast is unavailable.");
    }
    
    const kpRes = await makeApiRequestWithBackoff(API_ENDPOINTS.SWPC_KP_JSON, {}, 5000, 2);
    let kpHistory = [];
    let currentKp = null;
    
    if (kpRes.status === 200 && Array.isArray(kpRes.data) && kpRes.data.length > 0) {
      for (let i = Math.max(0, kpRes.data.length - 100); i < kpRes.data.length; i++) {
        const entry = kpRes.data[i];
        let kpValue = null;
        let timestamp = null;
        
        if (Array.isArray(entry) && entry.length >= 2) {
          timestamp = entry[0];
          kpValue = parseFloat(entry[1]);
        } else if (typeof entry === "object" && entry !== null) {
          timestamp = entry.time_tag || entry.timestamp || null;
          const rawValue = entry.kp_index ?? entry.estimated_kp ?? entry.kp ?? entry.value;
          if (rawValue !== undefined) kpValue = parseFloat(rawValue);
        }
        
        if (!isNaN(kpValue) && kpValue >= 0 && kpValue <= 9) { 
          kpHistory.push({ timestamp, value: kpValue }); 
          currentKp = kpValue; 
        }
      }
      
      if (kpHistory.length > 0) {
        alertManager.updateDataSourceStatus("kp_history", "AVAILABLE", kpRes.responseTime);
        alertManager.updateDataSourceStatus("geomagnetic_forecast", "AVAILABLE", kpRes.responseTime);
        result.extendedForecasts.geomagnetic = kpHistory;
        alertManager.registerHistoricalData("kp_extended_history", kpHistory);
        
        const last24hKp = kpHistory.filter(k => Date.now() - new Date(k.timestamp).getTime() < 24 * 60 * 60 * 1000);
        const kpValues = last24hKp.map(k => k.value);
        
        if (kpValues.length > 8) {
          const avgKp = kpValues.reduce((a, b) => a + b, 0) / kpValues.length;
          const maxKp = Math.max(...kpValues);
          const minKp = Math.min(...kpValues);
          
          if (maxKp - minKp > 3) {
            alertManager.addAlert(`High Kp variability in last 24h: range ${minKp.toFixed(1)}-${maxKp.toFixed(1)}`, "ADVISORY", "SPACE_WEATHER", "kp_history",
              { minKp, maxKp, avgKp: avgKp.toFixed(1), variability: (maxKp - minKp).toFixed(1) });
          }
        }
      } else {
        alertManager.updateDataSourceStatus("kp_history", "FAILED", kpRes.responseTime, "No valid Kp values found in response");
        alertManager.updateDataSourceStatus("geomagnetic_forecast", "FAILED", kpRes.responseTime, "No valid Kp values for geomagnetic forecast");
      }
    } else {
      alertManager.updateDataSourceStatus("kp_history", "FAILED", kpRes.responseTime, kpRes.error || "Kp history is unavailable.");
      alertManager.updateDataSourceStatus("geomagnetic_forecast", "FAILED", kpRes.responseTime, kpRes.error || "Geomagnetic forecast is unavailable.");
    }
    
    const marineExtendedUrl = `${API_ENDPOINTS.OPEN_METEO_MARINE}?latitude=${lat}&longitude=${lon}&cell_selection=sea&hourly=wave_height,wave_direction,wave_period,sea_surface_temperature&forecast_days=3&timezone=UTC`;
    const marineExtendedRes = await makeApiRequestWithBackoff(marineExtendedUrl, {}, 15000, 2);
    let seaSurfaceTemp = null;
    
    if (marineExtendedRes.status === 200 && marineExtendedRes.data?.hourly) {
      alertManager.updateDataSourceStatus("extended_marine", "AVAILABLE", marineExtendedRes.responseTime);
      const h = marineExtendedRes.data.hourly;
      const marineForecast = [];
      
      for (let i = 0; i < Math.min(72, h.time?.length || 0); i++) {
        marineForecast.push({
          timestamp: h.time[i],
          waveHeight: h.wave_height?.[i],
          waveDirection: h.wave_direction?.[i],
          wavePeriod: h.wave_period?.[i],
          seaSurfaceTemperature: h.sea_surface_temperature?.[i]
        });
        if (i === 0 && h.sea_surface_temperature?.[i] !== null && h.sea_surface_temperature?.[i] !== undefined) {
          seaSurfaceTemp = h.sea_surface_temperature[i];
        }
      }
      
      result.extendedForecasts.marineForecast = marineForecast;
      alertManager.registerHistoricalData("marine_forecast_extended", marineForecast);
      
      if (seaSurfaceTemp !== null) {
        alertManager.registerDataPoint("sea_surface_temperature", seaSurfaceTemp, "C", "extended_marine", "INFORMATIONAL");
      }
      
      const waveHeights = marineForecast.filter(d => d.waveHeight !== null).map(d => d.waveHeight);
      if (waveHeights.length > 0) {
        const maxWaves = Math.max(...waveHeights);
        const avgWaves = waveHeights.reduce((a, b) => a + b, 0) / waveHeights.length;
        
        if (maxWaves > 4) {
          alertManager.addAlert(`High waves forecast: max ${maxWaves.toFixed(1)}m in 72h period`, "WARNING", "MARINE", "extended_marine",
            { maxWaves, avgWaves: avgWaves.toFixed(1) });
        }
      }
    } else {
      alertManager.updateDataSourceStatus("extended_marine", "FAILED", marineExtendedRes.responseTime, marineExtendedRes.error || "Extended marine forecast is unavailable.");
    }
    
    if (seaSurfaceTemp === null) {
      const offsets = [[-0.75, 0], [0.75, 0], [0, -0.75], [0, 0.75]];
      for (const [dLat, dLon] of offsets) {
        const probeLat = Math.max(-89, Math.min(89, lat + dLat));
        const probeLon = ((lon + dLon + 540) % 360) - 180;
        const probeRes = await makeApiRequestWithBackoff(`${API_ENDPOINTS.OPEN_METEO_MARINE}?latitude=${probeLat.toFixed(2)}&longitude=${probeLon.toFixed(2)}&cell_selection=sea&hourly=sea_surface_temperature&forecast_days=1&timezone=UTC`, {}, 15000, 1);
        const probeValue = probeRes.data?.hourly?.sea_surface_temperature?.find(v => v !== null && v !== undefined);
        if (probeValue !== undefined) {
          seaSurfaceTemp = probeValue;
          result.coastalMesoscale.seaSurfaceSource = { latitude: probeRes.data.latitude ?? probeLat, longitude: probeRes.data.longitude ?? probeLon, distanceKm: Math.round(calculateDistance(lat, lon, probeRes.data.latitude ?? probeLat, probeRes.data.longitude ?? probeLon)) };
          alertManager.registerDataPoint("sea_surface_temperature", seaSurfaceTemp, "C", "extended_marine", "INFORMATIONAL");
          break;
        }
      }
    }
    
    let landTemp = null;
    let coastalConvergenceIndex = 0;
    let seaBreezeProbability = 0;
    let onshoreFlowIntensity = 0;
    let thermalCirculationStrength = 0;
    let marineLayerDepth = null;
    
    if (currentData && currentData.temperature_2m !== null && currentData.temperature_2m !== undefined) {
      landTemp = currentData.temperature_2m;
    }
    
    if (landTemp !== null && seaSurfaceTemp !== null) {
      const landSeaGradient = landTemp - seaSurfaceTemp;
      result.coastalMesoscale.landSeaGradient = {
        value: parseFloat(landSeaGradient.toFixed(2)),
        landTemp: landTemp,
        seaTemp: seaSurfaceTemp,
        timestamp: new Date().toISOString()
      };
      alertManager.registerDataPoint("land_sea_temp_gradient", landSeaGradient, "C", "coastal_mesoscale", "INFORMATIONAL");
      
      const hourOfDay = new Date().getUTCHours();
      const isDaytime = hourOfDay >= 10 && hourOfDay <= 18;
      
      if (isDaytime && landSeaGradient > 3) {
        seaBreezeProbability = Math.min(100, 20 + (landSeaGradient - 3) * 15);
        thermalCirculationStrength = Math.min(1.0, (landSeaGradient - 3) / 12);
      } else if (!isDaytime && landSeaGradient < -2) {
        seaBreezeProbability = Math.min(60, 10 + Math.abs(landSeaGradient + 2) * 10);
        thermalCirculationStrength = Math.min(0.6, Math.abs(landSeaGradient + 2) / 10);
      }
      
      if (currentData.wind_direction_10m !== null && currentData.wind_direction_10m !== undefined) {
        const windDir = currentData.wind_direction_10m;
        const isOnshore = (windDir >= 180 && windDir <= 360) || windDir <= 90;
        if (isOnshore && currentData.wind_speed_10m !== null) {
          onshoreFlowIntensity = currentData.wind_speed_10m;
          if (landSeaGradient > 2) {
            coastalConvergenceIndex = Math.min(1.0, (onshoreFlowIntensity / 10) * (landSeaGradient / 8));
          }
        }
      }
      
      alertManager.registerDataPoint("sea_breeze_front_probability", seaBreezeProbability, "%", "coastal_mesoscale", "INFORMATIONAL");
      alertManager.registerDataPoint("coastal_convergence_index", coastalConvergenceIndex, "index", "coastal_mesoscale", "INFORMATIONAL");
      alertManager.registerDataPoint("onshore_flow_intensity", onshoreFlowIntensity, "m/s", "coastal_mesoscale", "INFORMATIONAL");
      alertManager.registerDataPoint("thermal_circulation_strength", thermalCirculationStrength, "index", "coastal_mesoscale", "INFORMATIONAL");
      
      result.coastalMesoscale.seaBreezeFront = {
        probability: seaBreezeProbability,
        expectedTiming: isDaytime ? "Active" : "Inactive (Nighttime)",
        frontPosition: seaBreezeProbability > 50 ? "Advancing Inland" : "Coastal Zone",
        timestamp: new Date().toISOString()
      };
      
      result.coastalMesoscale.thermalCirculation = {
        strength: thermalCirculationStrength,
        type: landSeaGradient > 0 ? "Sea Breeze" : "Land Breeze",
        gradient: landSeaGradient
      };
      
      result.coastalMesoscale.onshoreFlow = {
        intensity: onshoreFlowIntensity,
        convergenceIndex: coastalConvergenceIndex
      };
      
      if (seaBreezeProbability > 60) {
        alertManager.addAlert(`Sea breeze front likely (${seaBreezeProbability.toFixed(0)}% probability) - potential convergence zone`, "ADVISORY", "MESOSCALE", "coastal_mesoscale",
          { probability: seaBreezeProbability, gradient: landSeaGradient, timing: isDaytime ? "Daytime Active" : "Weakening" });
      }
      
      if (coastalConvergenceIndex > 0.5) {
        alertManager.addAlert(`Coastal convergence zone detected (index: ${coastalConvergenceIndex.toFixed(2)}) - enhanced convection risk`, "WARNING", "MESOSCALE", "coastal_mesoscale",
          { convergenceIndex: coastalConvergenceIndex, onshoreFlow: onshoreFlowIntensity });
        result.coastalMesoscale.convergenceZones.push({
          index: coastalConvergenceIndex,
          type: "SEA_BREEZE_CONVERGENCE",
          location: "Coastal Zone",
          timestamp: new Date().toISOString()
        });
      }
      
      alertManager.updateDataSourceStatus("coastal_mesoscale", "AVAILABLE", Date.now() - startTime);
    } else {
      alertManager.updateDataSourceStatus("coastal_mesoscale", "DEGRADED", Date.now() - startTime, landTemp === null && seaSurfaceTemp === null ? "Both the land temperature and the sea surface temperature were unavailable." : landTemp === null ? "The land temperature from the hourly forecast was unavailable." : "The sea surface temperature from the marine forecast was unavailable for this location.");
    }
    
    if (hourlyData && hourlyData.temperature_2m && seaSurfaceTemp !== null) {
      const gradientHistory = [];
      for (let i = 0; i < Math.min(48, hourlyData.temperature_2m.length); i++) {
        if (hourlyData.temperature_2m[i] !== null) {
          const gradient = hourlyData.temperature_2m[i] - seaSurfaceTemp;
          gradientHistory.push({
            timestamp: hourlyData.time ? hourlyData.time[i] : null,
            landTemp: hourlyData.temperature_2m[i],
            seaTemp: seaSurfaceTemp,
            gradient: parseFloat(gradient.toFixed(2))
          });
        }
      }
      result.coastalMesoscale.historicalGradients = gradientHistory;
      alertManager.registerHistoricalData("land_sea_gradient_history", gradientHistory);
    }
    
    if (upperAirData && upperAirData.temperature_850hPa && hourlyData && hourlyData.temperature_2m) {
      const marineLayerHistory = [];
      for (let i = 0; i < Math.min(48, hourlyData.temperature_2m.length); i++) {
        const surfaceTemp = hourlyData.temperature_2m[i];
        const temp850 = upperAirData.temperature_850hPa ? upperAirData.temperature_850hPa[i] : null;
        if (surfaceTemp !== null && temp850 !== null) {
          const inversionStrength = temp850 - surfaceTemp;
          if (inversionStrength > 0) {
            const estimatedDepth = Math.min(1500, inversionStrength * 150);
            marineLayerHistory.push({
              timestamp: hourlyData.time ? hourlyData.time[i] : null,
              depth: estimatedDepth,
              inversionStrength: inversionStrength,
              surfaceTemp: surfaceTemp,
              temp850hPa: temp850
            });
            if (i === 0) {
              marineLayerDepth = estimatedDepth;
              alertManager.registerDataPoint("marine_layer_depth", marineLayerDepth, "m", "coastal_mesoscale", "INFORMATIONAL");
            }
          }
        }
      }
      result.coastalMesoscale.marineLayerData = marineLayerHistory;
      alertManager.registerHistoricalData("marine_layer_history", marineLayerHistory);
    }
    
    let soundSpeedSurface = null;
    let soundSpeedGradient = null;
    let acousticDuctProb = 0;
    let shadowZoneDistance = null;
    let refractionCoeff = 1.0;
    
    if (currentData && currentData.temperature_2m !== null && hourlyData && hourlyData.relative_humidity_2m) {
      const T = currentData.temperature_2m;
      const RH = hourlyData.relative_humidity_2m[0] || 50;
      
      const TK = T + 273.15;
      const es = 6.112 * Math.exp((17.67 * T) / (T + 243.5));
      const e = (RH / 100) * es;
      const h = e / (currentData.surface_pressure || 1013.25);
      soundSpeedSurface = 331.3 * Math.sqrt(TK / 273.15) * (1 + 0.16 * h);
      
      alertManager.registerDataPoint("sound_speed_surface", soundSpeedSurface, "m/s", "acoustic_propagation", "INFORMATIONAL");
      
      result.acousticPropagation.soundSpeedProfile.push({
        altitude: 0,
        temperature: T,
        humidity: RH,
        soundSpeed: parseFloat(soundSpeedSurface.toFixed(2)),
        timestamp: new Date().toISOString()
      });
    }
    
    if (upperAirData && soundSpeedSurface !== null) {
      const altitudes = [0, 1500, 3000, 5500, 9000, 12000];
      const pressureLevels = [1000, 850, 700, 500, 300, 200];
      let prevSoundSpeed = soundSpeedSurface;
      let prevAlt = 0;
      let totalGradient = 0;
      let gradientCount = 0;
      let inversionDetected = false;
      let inversionAltitude = null;
      
      for (let i = 1; i < pressureLevels.length; i++) {
        const level = pressureLevels[i];
        const tempKey = `temperature_${level}hPa`;
        if (upperAirData[tempKey] && upperAirData[tempKey][0] !== null) {
          const T = upperAirData[tempKey][0];
          const TK = T + 273.15;
          const soundSpeed = 331.3 * Math.sqrt(TK / 273.15);
          const alt = altitudes[i];
          const altDiff = alt - prevAlt;
          
          if (altDiff > 0) {
            const gradient = (soundSpeed - prevSoundSpeed) / (altDiff / 1000);
            totalGradient += gradient;
            gradientCount++;
            
            if (soundSpeed > prevSoundSpeed && !inversionDetected) {
              inversionDetected = true;
              inversionAltitude = alt;
            }
          }
          
          result.acousticPropagation.soundSpeedProfile.push({
            altitude: alt,
            temperature: T,
            soundSpeed: parseFloat(soundSpeed.toFixed(2)),
            pressureLevel: level
          });
          
          prevSoundSpeed = soundSpeed;
          prevAlt = alt;
        }
      }
      
      if (gradientCount > 0) {
        soundSpeedGradient = totalGradient / gradientCount;
        alertManager.registerDataPoint("sound_speed_gradient", soundSpeedGradient, "m/s/km", "acoustic_propagation", "INFORMATIONAL");
        
        if (soundSpeedGradient < -5) {
          acousticDuctProb = Math.min(95, 20 + Math.abs(soundSpeedGradient + 5) * 8);
          refractionCoeff = 1.0 + (Math.abs(soundSpeedGradient) / 30);
          shadowZoneDistance = Math.max(2, 15 - Math.abs(soundSpeedGradient) * 0.8);
        } else if (soundSpeedGradient > 5) {
          acousticDuctProb = Math.min(80, 15 + (soundSpeedGradient - 5) * 6);
          refractionCoeff = 1.0 - (soundSpeedGradient / 40);
          shadowZoneDistance = 20 + soundSpeedGradient * 0.5;
        } else {
          acousticDuctProb = 10;
          shadowZoneDistance = 15;
          refractionCoeff = 1.0;
        }
        
        if (inversionDetected && inversionAltitude !== null) {
          acousticDuctProb = Math.min(95, acousticDuctProb + 20);
        }
        
        alertManager.registerDataPoint("acoustic_duct_probability", acousticDuctProb, "%", "acoustic_propagation", "INFORMATIONAL");
        alertManager.registerDataPoint("acoustic_shadow_zone_distance", shadowZoneDistance, "km", "acoustic_propagation", "INFORMATIONAL");
        alertManager.registerDataPoint("refraction_coefficient", refractionCoeff, "", "acoustic_propagation", "INFORMATIONAL");
        
        result.acousticPropagation.refraction = {
          coefficient: parseFloat(refractionCoeff.toFixed(3)),
          gradient: parseFloat(soundSpeedGradient.toFixed(2)),
          inversionDetected: inversionDetected,
          inversionAltitude: inversionAltitude
        };
        
        result.acousticPropagation.ductingProbability = acousticDuctProb;
        
        result.acousticPropagation.shadowZones.push({
          distance: shadowZoneDistance,
          type: soundSpeedGradient < 0 ? "DOWNWARD_REFRACTION" : "UPWARD_REFRACTION",
          intensity: Math.abs(soundSpeedGradient) > 15 ? "STRONG" : Math.abs(soundSpeedGradient) > 8 ? "MODERATE" : "WEAK"
        });
        
        alertManager.updateDataSourceStatus("acoustic_propagation", "AVAILABLE", Date.now() - startTime);
      }
    }
    
    if (result.acousticPropagation.soundSpeedProfile.length > 0) {
      alertManager.registerHistoricalData("acoustic_sound_speed_profile", result.acousticPropagation.soundSpeedProfile);
    }
    
    const diffElectronsRes = await makeApiRequestWithBackoff(API_ENDPOINTS.SWPC_DIFF_ELECTRONS, {}, 8000, 2);
    const diffProtonsRes = await makeApiRequestWithBackoff(API_ENDPOINTS.SWPC_DIFF_PROTONS, {}, 8000, 2);
    
    const electronChannels = {};
    if (diffElectronsRes.status === 200 && Array.isArray(diffElectronsRes.data) && diffElectronsRes.data.length > 0) {
      for (const entry of diffElectronsRes.data) {
        if (!entry || !entry.time_tag || entry.flux === null || entry.flux === undefined) continue;
        
        let channelKey = null;
        const energy = entry.energy || "";
        const channel = entry.channel || "";
        
        if (channel.toUpperCase() === "E1" || /40.*75/i.test(energy) || /^E1$/i.test(channel)) {
          channelKey = "e_40_75keV";
        } else if (channel.toUpperCase() === "E2" || /75.*150/i.test(energy) || /^E2$/i.test(channel)) {
          channelKey = "e_75_150keV";
        } else if (channel.toUpperCase() === "E3" || /150.*275/i.test(energy) || /^E3$/i.test(channel)) {
          channelKey = "e_150_275keV";
        } else if (channel.toUpperCase() === "E4" || /275.*475/i.test(energy) || /^E4$/i.test(channel)) {
          channelKey = "e_275_475keV";
        } else if (/80.*165|115.*165|^80|^115/i.test(energy)) {
          channelKey = "e_80_165keV";
        } else if (/165.*500|^165/i.test(energy)) {
          channelKey = "e_165_500keV";
        } else if (/^[\d]+\s*keV$/i.test(energy)) {
          const keV = parseInt(energy);
          if (keV >= 40 && keV < 80) channelKey = "e_40_75keV";
          else if (keV >= 80 && keV < 165) channelKey = "e_80_165keV";
          else if (keV >= 165 && keV < 500) channelKey = "e_165_500keV";
          else if (keV >= 500) channelKey = "e_gt500keV";
        }
        
        if (channelKey) {
          if (!electronChannels[channelKey]) electronChannels[channelKey] = [];
          electronChannels[channelKey].push({ timestamp: entry.time_tag, flux: parseFloat(entry.flux), satellite: entry.satellite });
        }
      }
    }
    
    const protonChannels = {};
    if (diffProtonsRes.status === 200 && Array.isArray(diffProtonsRes.data) && diffProtonsRes.data.length > 0) {
      for (const entry of diffProtonsRes.data) {
        if (!entry || !entry.time_tag || entry.flux === null || entry.flux === undefined) continue;
        
        let channelKey = null;
        const energy = entry.energy || "";
        const channel = (entry.channel || "").toUpperCase();
        
        if (channel === "P1" || /1020.*1860|1\.0.*1\.9/i.test(energy)) {
          channelKey = "p_1_2MeV";
        } else if (channel === "P2A" || /1900.*2300|1\.9.*2\.3/i.test(energy)) {
          channelKey = "p_1p9_2p3MeV";
        } else if (channel === "P2B" || /2310.*6480|2\.3.*6\.5/i.test(energy)) {
          channelKey = "p_2p3_6p5MeV";
        } else if (channel === "P3" || /6510.*11640|6\.5.*11/i.test(energy)) {
          channelKey = "p_6p5_12MeV";
        } else if (channel === "P4" || /11640.*23270|11.*23/i.test(energy)) {
          channelKey = "p_12_23MeV";
        } else if (channel === "P5" || /23270.*38100|23.*38/i.test(energy)) {
          channelKey = "p_23_38MeV";
        } else if (channel === "P6" || /38.*82|38100.*81900/i.test(energy)) {
          channelKey = "p_38_82MeV";
        } else if (channel === "P7" || /84.*200|83700.*98500/i.test(energy)) {
          channelKey = "p_84_200MeV";
        }
        
        if (channelKey) {
          if (!protonChannels[channelKey]) protonChannels[channelKey] = [];
          protonChannels[channelKey].push({ timestamp: entry.time_tag, flux: parseFloat(entry.flux), satellite: entry.satellite });
        }
      }
    }
    
    const allTimestamps = new Set();
    for (const ch of Object.values(electronChannels)) {
      ch.forEach(e => allTimestamps.add(e.timestamp));
    }
    for (const ch of Object.values(protonChannels)) {
      ch.forEach(p => allTimestamps.add(p.timestamp));
    }
    
    const sortedTimestamps = [...allTimestamps].sort().slice(-200);
    const electronChannelKeys = Object.keys(electronChannels);
    const protonChannelKeys = Object.keys(protonChannels);
    
    let diffElectronHistory = [];
    let diffProtonHistory = [];
    
    if (sortedTimestamps.length > 0 && (electronChannelKeys.length > 0 || protonChannelKeys.length > 0)) {
      for (const ts of sortedTimestamps) {
        if (electronChannelKeys.length > 0) {
          const electronPoint = { timestamp: ts };
          let hasElectronData = false;
          for (const ch of electronChannelKeys) {
            const match = electronChannels[ch].find(e => e.timestamp === ts);
            electronPoint[`flux_${ch.replace('e_', '')}`] = match ? match.flux : null;
            if (match) hasElectronData = true;
          }
          if (hasElectronData) diffElectronHistory.push(electronPoint);
        }
        
        if (protonChannelKeys.length > 0) {
          const protonPoint = { timestamp: ts };
          let hasProtonData = false;
          for (const ch of protonChannelKeys) {
            const match = protonChannels[ch].find(p => p.timestamp === ts);
            protonPoint[`flux_${ch.replace('p_', '')}`] = match ? match.flux : null;
            if (match) hasProtonData = true;
          }
          if (hasProtonData) diffProtonHistory.push(protonPoint);
        }
      }
      
      if (diffElectronHistory.length > 0) {
        result.radiationEnvironment.differentialElectrons = diffElectronHistory;
        alertManager.registerHistoricalData("differential_electron_flux_history", diffElectronHistory);
        
        const latestElectron = diffElectronHistory[diffElectronHistory.length - 1];
        const electronFluxKeys = Object.keys(latestElectron).filter(k => k.startsWith("flux_"));
        for (const fk of electronFluxKeys) {
          if (latestElectron[fk] !== null && !isNaN(latestElectron[fk])) {
            const paramName = `differential_electron_${fk.replace("flux_", "")}`;
            alertManager.registerDataPoint(paramName, latestElectron[fk], "e/cm2-s-sr-keV", "differential_particles", "INFORMATIONAL");
          }
        }
      }
      
      if (diffProtonHistory.length > 0) {
        result.radiationEnvironment.differentialProtons = diffProtonHistory;
        alertManager.registerHistoricalData("differential_proton_flux_history", diffProtonHistory);
        
        const latestProton = diffProtonHistory[diffProtonHistory.length - 1];
        const protonFluxKeys = Object.keys(latestProton).filter(k => k.startsWith("flux_"));
        for (const fk of protonFluxKeys) {
          if (latestProton[fk] !== null && !isNaN(latestProton[fk])) {
            const paramName = `differential_proton_${fk.replace("flux_", "")}`;
            alertManager.registerDataPoint(paramName, latestProton[fk], "p/cm2-s-sr-MeV", "differential_particles", "INFORMATIONAL");
          }
        }
      }
      
      alertManager.updateDataSourceStatus("differential_particles", "AVAILABLE", Math.max(diffElectronsRes.responseTime || 0, diffProtonsRes.responseTime || 0));
    } else {
      alertManager.updateDataSourceStatus("differential_particles", "DEGRADED", Math.max(diffElectronsRes.responseTime || 0, diffProtonsRes.responseTime || 0), "Could not parse differential particle data");
    }
    
    const plasmaRes = await makeApiRequestWithBackoff(API_ENDPOINTS.SWPC_SOLAR_WIND_PLASMA, {}, 8000, 2);
    let solarWindDensity = null;
    let solarWindSpeed = null;
    
    if (plasmaRes.status === 200 && Array.isArray(plasmaRes.data) && plasmaRes.data.length > 1) {
      for (let i = plasmaRes.data.length - 1; i >= 1; i--) {
        const entry = plasmaRes.data[i];
        if (Array.isArray(entry) && entry.length >= 3) {
          if (entry[1] !== null && solarWindDensity === null) solarWindDensity = parseFloat(entry[1]);
          if (entry[2] !== null && solarWindSpeed === null) solarWindSpeed = parseFloat(entry[2]);
          if (solarWindDensity !== null && solarWindSpeed !== null) break;
        }
      }
      
      if (solarWindDensity !== null && solarWindSpeed !== null) {
        const dynamicPressure = 1.6726e-6 * solarWindDensity * Math.pow(solarWindSpeed, 2);
        const magnetopauseStandoff = 10.22 * Math.pow(dynamicPressure, -1/6.6);
        
        alertManager.registerDataPoint("magnetopause_standoff", magnetopauseStandoff, "Re", "magnetosphere_state", "INFORMATIONAL");
        result.radiationEnvironment.magnetopause = {
          standoffDistance: parseFloat(magnetopauseStandoff.toFixed(2)),
          solarWindDensity: solarWindDensity,
          solarWindSpeed: solarWindSpeed,
          dynamicPressure: parseFloat(dynamicPressure.toFixed(4)),
          timestamp: new Date().toISOString()
        };
        
        if (magnetopauseStandoff < 7) {
          alertManager.addAlert(`Magnetopause compressed to ${magnetopauseStandoff.toFixed(1)} Re - elevated radiation belt flux expected`, "WARNING", "SPACE_WEATHER", "magnetosphere_state",
            { standoff: magnetopauseStandoff, pressure: dynamicPressure });
        }
        
        alertManager.updateDataSourceStatus("magnetosphere_state", "AVAILABLE", plasmaRes.responseTime);
      }
    } else {
      alertManager.updateDataSourceStatus("magnetosphere_state", "DEGRADED", plasmaRes.responseTime, "Solar wind plasma data is unavailable.");
    }
    
    const electrons7dayRes = await makeApiRequestWithBackoff(API_ENDPOINTS.SWPC_ELECTRONS_7DAY, {}, 10000, 2);
    let radiationBeltHistory = [];
    
    if (electrons7dayRes.status === 200 && Array.isArray(electrons7dayRes.data)) {
      for (let i = 0; i < electrons7dayRes.data.length; i++) {
        const entry = electrons7dayRes.data[i];
        if (entry && entry.time_tag && entry.flux !== undefined && entry.flux !== null) {
          radiationBeltHistory.push({
            timestamp: entry.time_tag,
            flux: entry.flux,
            energy: entry.energy || ">2MeV"
          });
        }
      }
      
      if (radiationBeltHistory.length > 0) {
        result.radiationEnvironment.historicalRadiation = radiationBeltHistory;
        alertManager.registerHistoricalData("radiation_belt_electron_flux_7day", radiationBeltHistory);
        
        const latestFlux = radiationBeltHistory[radiationBeltHistory.length - 1].flux;
        if (latestFlux !== null) {
          alertManager.registerDataPoint("radiation_belt_electron_flux", latestFlux, "e/cm2-s-sr", "magnetosphere_state", "INFORMATIONAL");
          result.radiationEnvironment.radiationBeltFlux = {
            currentFlux: latestFlux,
            timestamp: radiationBeltHistory[radiationBeltHistory.length - 1].timestamp
          };
        }
      }
    }
    
    const magRes = await makeApiRequestWithBackoff(API_ENDPOINTS.SWPC_SOLAR_WIND_MAG, {}, 8000, 2);
    let bzHistory = [];
    
    if (magRes.status === 200 && Array.isArray(magRes.data) && magRes.data.length > 1) {
      for (let i = 1; i < magRes.data.length; i++) {
        const entry = magRes.data[i];
        if (Array.isArray(entry) && entry.length >= 4 && entry[3] !== null) {
          bzHistory.push({
            timestamp: entry[0],
            bz: parseFloat(entry[3])
          });
        }
      }
      
      if (bzHistory.length > 0) {
        alertManager.registerHistoricalData("imf_bz_history", bzHistory);
      }
    }
    
    if (ensembleData && ensembleData.wind_speed_10m) {
      const forecastHours = [1, 2, 3, 6, 12, 24];
      forecastHours.forEach((hour) => {
        if (ensembleData.wind_speed_10m[hour] !== undefined) {
          const windValue = ensembleData.wind_speed_10m[hour];
          const baseWind = Array.isArray(windValue) ? windValue[0] : windValue;
          result.probabilityCone.windSpeed.forecast.push({ 
            time: `T+${hour}h`, 
            mean: baseWind, 
            source: "Open-Meteo Ensemble" 
          });
        }
      });
    }
    
    if (hourlyData && hourlyData.precipitation_probability) {
      const forecastHours = [1, 2, 3, 6, 12, 24];
      forecastHours.forEach(hour => {
        if (hourlyData.precipitation_probability[hour] !== undefined) {
          const precipProb = hourlyData.precipitation_probability[hour];
          result.probabilityCone.precipitation.forecast.push({ 
            time: `T+${hour}h`, 
            probability: precipProb, 
            intensity: precipProb > 70 ? "HEAVY" : precipProb > 30 ? "MODERATE" : "LIGHT" 
          });
        }
      });
    }
    
    if (kpHistory.length >= 12) {
      const recentWindow = Math.min(12, kpHistory.length);
      const recent = kpHistory.slice(-recentWindow);
      const earlierWindow = Math.min(12, kpHistory.length - recentWindow);
      const earlier = earlierWindow > 0 ? kpHistory.slice(-(recentWindow + earlierWindow), -recentWindow) : recent;
      
      const recentAvg = recent.reduce((a, b) => a + b.value, 0) / recent.length;
      const earlierAvg = earlier.reduce((a, b) => a + b.value, 0) / earlier.length;
      const kpDerivative = (recentAvg - earlierAvg) / recentWindow;
      
      result.trendLines.kp.derivative = parseFloat(kpDerivative.toFixed(3));
      result.trendLines.kp.currentValue = currentKp;
      
      if (currentKp !== null) {
        const forecast = [
          { time: "T+1h", value: parseFloat(Math.max(0, Math.min(9, currentKp + kpDerivative)).toFixed(2)) },
          { time: "T+3h", value: parseFloat(Math.max(0, Math.min(9, currentKp + 3 * kpDerivative)).toFixed(2)) },
          { time: "T+6h", value: parseFloat(Math.max(0, Math.min(9, currentKp + 6 * kpDerivative)).toFixed(2)) },
          { time: "T+12h", value: parseFloat(Math.max(0, Math.min(9, currentKp + 12 * kpDerivative)).toFixed(2)) }
        ];
        result.trendLines.kp.forecast = forecast;
        result.probabilityCone.kpIndex.forecast = forecast.map(f => ({ time: f.time, mean: f.value }));
      }
      
      alertManager.registerDataPoint("kp_trend_derivative", kpDerivative, "/h", "kp_history", "INFORMATIONAL");
    }
    
    if (hourlyData && hourlyData.wind_speed_10m) {
      const windValues = hourlyData.wind_speed_10m.slice(0, 24);
      
      if (windValues.length > 2) {
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
        let validCount = 0;
        
        windValues.forEach((wind, idx) => {
          if (wind !== null && !isNaN(wind)) { sumX += idx; sumY += wind; sumXY += idx * wind; sumXX += idx * idx; validCount++; }
        });
        
        if (validCount > 0 && (validCount * sumXX - sumX * sumX) !== 0) {
          const windSlope = (validCount * sumXY - sumX * sumY) / (validCount * sumXX - sumX * sumX);
          result.trendLines.wind.derivative = parseFloat(windSlope.toFixed(3));
          result.trendLines.wind.forecast = windSlope > 0.2 ? "INCREASING" : windSlope < -0.2 ? "DECREASING" : "STABLE";
          result.trendLines.wind.currentValue = currentData?.wind_speed_10m || null;
          alertManager.registerDataPoint("wind_trend_derivative", windSlope, "m/s/h", "hourly_forecast", "INFORMATIONAL");
        }
      }
    }
    
    if (windShearData.length > 2) {
      let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
      const n = windShearData.length;
      
      windShearData.forEach((data, idx) => { sumX += idx; sumY += data.shear; sumXY += idx * data.shear; sumXX += idx * idx; });
      
      if (n > 0 && (n * sumXX - sumX * sumX) !== 0) {
        const shearSlope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        result.trendLines.shear.derivative = parseFloat(shearSlope.toFixed(3));
        result.trendLines.shear.forecast = shearSlope > 1.0 ? "INCREASING" : shearSlope < -1.0 ? "DECREASING" : "STABLE";
        alertManager.registerDataPoint("shear_trend_derivative", shearSlope, "/h", "upper_air_forecast", "INFORMATIONAL");
      }
    }
    
    const timeHorizons = ["T+10m", "T+30m", "T+1h", "T+2h", "T+6h", "T+12h"];
    const WIND_CRITICAL = 15.4;
    const WIND_WARNING = 10.3;
    const KP_CRITICAL = 5;
    const KP_WARNING = 4;
    
    timeHorizons.forEach((timeStep) => {
      let windProb = 0;
      let kpProb = 0;
      let precipProb = 0;
      let violationType = null;
      let riskFactors = [];
      
      const hoursAhead = timeStep === "T+10m" ? 0.17 : timeStep === "T+30m" ? 0.5 : timeStep === "T+1h" ? 1 : timeStep === "T+2h" ? 2 : timeStep === "T+6h" ? 6 : 12;
      
      const currentWindSpeed = currentData?.wind_speed_10m;
      if (currentWindSpeed !== null && currentWindSpeed !== undefined) {
        const windDerivative = result.trendLines.wind.derivative || 0;
        const projectedWind = currentWindSpeed + (windDerivative * hoursAhead);
        
        if (projectedWind > WIND_CRITICAL) {
          windProb = Math.min(0.95, 0.5 + ((projectedWind - WIND_CRITICAL) / 10));
          riskFactors.push({ type: "WIND_CRITICAL", value: projectedWind, threshold: WIND_CRITICAL });
        } else if (projectedWind > WIND_WARNING) {
          windProb = Math.min(0.4, ((projectedWind - WIND_WARNING) / (WIND_CRITICAL - WIND_WARNING)) * 0.4);
          riskFactors.push({ type: "WIND_WARNING", value: projectedWind, threshold: WIND_WARNING });
        } else {
          windProb = Math.max(0, (projectedWind / WIND_WARNING) * 0.1);
        }
      }
      
      if (currentKp !== null) {
        const kpDerivative = result.trendLines.kp.derivative || 0;
        const projectedKp = currentKp + (kpDerivative * hoursAhead);
        
        if (projectedKp > KP_CRITICAL) {
          kpProb = Math.min(0.95, 0.5 + ((projectedKp - KP_CRITICAL) / 4));
          riskFactors.push({ type: "KP_CRITICAL", value: projectedKp, threshold: KP_CRITICAL });
        } else if (projectedKp > KP_WARNING) {
          kpProb = Math.min(0.4, ((projectedKp - KP_WARNING) / (KP_CRITICAL - KP_WARNING)) * 0.4);
          riskFactors.push({ type: "KP_WARNING", value: projectedKp, threshold: KP_WARNING });
        } else {
          kpProb = Math.max(0, (projectedKp / KP_WARNING) * 0.1);
        }
      }
      
      const precipForecast = result.probabilityCone.precipitation.forecast.find(f => 
        (timeStep.includes("1h") && f.time === "T+1h") || 
        (timeStep.includes("2h") && (f.time === "T+2h")) ||
        (timeStep.includes("6h") && (f.time === "T+6h")) ||
        (timeStep.includes("12h") && (f.time === "T+12h"))
      );
      if (precipForecast) {
        precipProb = (precipForecast.probability / 100) * 0.6;
        if (precipForecast.probability > 50) {
          riskFactors.push({ type: "PRECIPITATION", value: precipForecast.probability, threshold: 50 });
        }
      }
      
      const combinedProb = Math.min(0.95, 1 - ((1 - windProb) * (1 - kpProb) * (1 - precipProb)));
      
      if (windProb >= kpProb && windProb >= precipProb && windProb > 0.1) {
        violationType = "WIND_SPEED";
      } else if (kpProb >= windProb && kpProb >= precipProb && kpProb > 0.1) {
        violationType = "GEOMAGNETIC";
      } else if (precipProb > 0.1) {
        violationType = "PRECIPITATION";
      } else {
        violationType = "NOMINAL";
      }
      
      result.probabilisticOutcomes.violations[timeStep] = { 
        probability: parseFloat(combinedProb.toFixed(3)), 
        type: violationType,
        windComponent: parseFloat(windProb.toFixed(3)),
        kpComponent: parseFloat(kpProb.toFixed(3)),
        precipComponent: parseFloat(precipProb.toFixed(3)),
        riskFactors: riskFactors,
        projectedWind: currentWindSpeed !== null && currentWindSpeed !== undefined ? parseFloat((currentWindSpeed + (result.trendLines.wind.derivative || 0) * hoursAhead).toFixed(2)) : null,
        projectedKp: currentKp !== null ? parseFloat((currentKp + (result.trendLines.kp.derivative || 0) * hoursAhead).toFixed(2)) : null
      };
      
      if (combinedProb > 0.3) {
        alertManager.addAlert(
          `There is a ${Math.round(combinedProb * 100)}% probability of ${violationType.replace(/_/g, " ").toLowerCase()} hazard conditions at ${timeStep}.`,
          combinedProb > 0.7 ? "WARNING" : combinedProb > 0.5 ? "ADVISORY" : "INFO",
          "FORECAST",
          "ensemble_forecast",
          { timeHorizon: timeStep, probability: combinedProb, type: violationType, riskFactors }
        );
      }
    });
    
    const TEMP_CHANGE_THRESHOLD = 1.5;
    const WIND_DIR_CHANGE_THRESHOLD = 25;
    const PRESSURE_CHANGE_THRESHOLD = 2;
    const HUMIDITY_CHANGE_THRESHOLD = 15;
    
    if (hourlyData && hourlyData.temperature_2m && hourlyData.wind_direction_10m) {
      const temps = hourlyData.temperature_2m.slice(0, 48);
      const windDirs = hourlyData.wind_direction_10m.slice(0, 48);
      const pressures = hourlyData.surface_pressure ? hourlyData.surface_pressure.slice(0, 48) : [];
      const humidity = hourlyData.relative_humidity_2m ? hourlyData.relative_humidity_2m.slice(0, 48) : [];
      const windSpeeds = hourlyData.wind_speed_10m ? hourlyData.wind_speed_10m.slice(0, 48) : [];
      const gusts = hourlyData.wind_gusts_10m ? hourlyData.wind_gusts_10m.slice(0, 48) : [];
      
      for (let i = 1; i < Math.min(temps.length, windDirs.length, 40); i++) {
        if (temps[i] === null || temps[i - 1] === null || windDirs[i] === null || windDirs[i - 1] === null) continue;
        
        const tempChange = Math.abs(temps[i] - temps[i - 1]);
        const windDirChange = Math.abs(windDirs[i] - windDirs[i - 1]);
        const adjustedWindChange = windDirChange > 180 ? 360 - windDirChange : windDirChange;
        const pressureChange = pressures[i] !== undefined && pressures[i - 1] !== undefined ? Math.abs(pressures[i] - pressures[i - 1]) : 0;
        const humidityChange = humidity[i] !== undefined && humidity[i - 1] !== undefined ? Math.abs(humidity[i] - humidity[i - 1]) : 0;
        const windSpeedChange = windSpeeds[i] !== undefined && windSpeeds[i - 1] !== undefined ? Math.abs(windSpeeds[i] - windSpeeds[i - 1]) : 0;
        
        let frontType = null;
        let intensity = "WEAK";
        let indicators = [];
        
        if (tempChange > TEMP_CHANGE_THRESHOLD) {
          indicators.push(`Temp Δ${tempChange.toFixed(1)}°C`);
        }
        if (adjustedWindChange > WIND_DIR_CHANGE_THRESHOLD) {
          indicators.push(`Wind Dir Δ${Math.round(adjustedWindChange)}°`);
        }
        if (pressureChange > PRESSURE_CHANGE_THRESHOLD) {
          indicators.push(`Pressure Δ${pressureChange.toFixed(1)}hPa`);
        }
        if (humidityChange > HUMIDITY_CHANGE_THRESHOLD) {
          indicators.push(`Humidity Δ${Math.round(humidityChange)}%`);
        }
        
        if (indicators.length >= 2) {
          if (tempChange > 3 || adjustedWindChange > 60 || pressureChange > 4) {
            intensity = "STRONG";
          } else if (tempChange > 2 || adjustedWindChange > 40 || pressureChange > 3) {
            intensity = "MODERATE";
          }
          
          if (tempChange > TEMP_CHANGE_THRESHOLD && pressureChange > 1) {
            frontType = temps[i] < temps[i - 1] ? "COLD_FRONT" : "WARM_FRONT";
          } else if (adjustedWindChange > WIND_DIR_CHANGE_THRESHOLD) {
            frontType = "WIND_SHIFT";
          } else if (pressureChange > PRESSURE_CHANGE_THRESHOLD) {
            frontType = "PRESSURE_CHANGE";
          } else {
            frontType = "ATMOSPHERIC_BOUNDARY";
          }
          
          const frontData = { 
            time: `T+${i}h`, 
            type: frontType, 
            intensity,
            indicators,
            tempChange: parseFloat(tempChange.toFixed(2)),
            windDirChange: Math.round(adjustedWindChange),
            pressureChange: parseFloat(pressureChange.toFixed(2)),
            humidityChange: Math.round(humidityChange),
            beforeTemp: temps[i - 1],
            afterTemp: temps[i],
            beforeWindDir: windDirs[i - 1],
            afterWindDir: windDirs[i]
          };
          result.sensorValidation.weatherFronts.push(frontData);
          
          const alertSeverity = intensity === "STRONG" ? "WARNING" : intensity === "MODERATE" ? "ADVISORY" : "INFO";
          alertManager.addAlert(
            `${intensity} ${frontType.replace(/_/g, " ").toLowerCase()} expected at ${frontData.time}: ${indicators.join(", ")}`,
            alertSeverity,
            "WEATHER",
            "hourly_forecast",
            frontData
          );
        }
      }
    }
    
    result.sensorValidation.drift = [];
    result.sensorValidation.dataQuality = [];
    
    if (kpHistory.length > 6) {
      const recentKp = kpHistory.slice(-12).map(k => k.value);
      const mean = recentKp.reduce((a, b) => a + b) / recentKp.length;
      const variance = recentKp.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / recentKp.length;
      const stdDev = Math.sqrt(variance);
      
      result.sensorValidation.dataQuality.push({
        sensor: "KP_INDEX",
        mean: parseFloat(mean.toFixed(2)),
        variance: parseFloat(variance.toFixed(3)),
        stdDev: parseFloat(stdDev.toFixed(3)),
        samples: recentKp.length,
        status: variance > 2 ? "HIGH_VARIANCE" : variance > 1 ? "MODERATE_VARIANCE" : "STABLE"
      });
      
      if (variance > 1.5) {
        result.sensorValidation.drift.push({ 
          sensor: "KP_INDEX", 
          type: "HIGH_VARIANCE", 
          severity: variance > 3 ? "HIGH" : "MODERATE", 
          variance: parseFloat(variance.toFixed(3)),
          stdDev: parseFloat(stdDev.toFixed(3)),
          description: `Kp variance ${variance.toFixed(2)} indicates geomagnetic instability`
        });
        alertManager.addAlert(
          `Geomagnetic instability detected: Kp variance ${variance.toFixed(2)}`,
          variance > 3 ? "WARNING" : "ADVISORY",
          "DATA_QUALITY",
          "kp_history",
          { variance, stdDev, mean }
        );
      }
    }
    
    if (hourlyData && hourlyData.wind_speed_10m && hourlyData.wind_gusts_10m) {
      const winds = hourlyData.wind_speed_10m.slice(0, 12).filter(w => w !== null);
      const gusts = hourlyData.wind_gusts_10m.slice(0, 12).filter(g => g !== null);
      
      if (winds.length > 0 && gusts.length > 0) {
        const avgWind = winds.reduce((a, b) => a + b, 0) / winds.length;
        const avgGust = gusts.reduce((a, b) => a + b, 0) / gusts.length;
        const gustFactor = avgWind > 0 ? avgGust / avgWind : 1;
        
        const windVariance = winds.reduce((acc, val) => acc + Math.pow(val - avgWind, 2), 0) / winds.length;
        
        result.sensorValidation.dataQuality.push({
          sensor: "SURFACE_WIND",
          mean: parseFloat(avgWind.toFixed(2)),
          variance: parseFloat(windVariance.toFixed(3)),
          gustFactor: parseFloat(gustFactor.toFixed(2)),
          samples: winds.length,
          status: gustFactor > 2 ? "GUSTY" : gustFactor > 1.5 ? "VARIABLE" : "STEADY"
        });
        
        if (gustFactor > 1.8) {
          result.sensorValidation.drift.push({
            sensor: "SURFACE_WIND",
            type: "HIGH_GUST_FACTOR",
            severity: gustFactor > 2.5 ? "HIGH" : "MODERATE",
            gustFactor: parseFloat(gustFactor.toFixed(2)),
            description: `Gust factor ${gustFactor.toFixed(2)} indicates turbulent conditions`
          });
        }
        
        if (windVariance > 4) {
          result.sensorValidation.drift.push({
            sensor: "SURFACE_WIND",
            type: "HIGH_VARIABILITY",
            severity: windVariance > 8 ? "HIGH" : "MODERATE",
            variance: parseFloat(windVariance.toFixed(3)),
            description: `Wind variance ${windVariance.toFixed(2)} indicates unstable conditions`
          });
        }
      }
    }
    
    if (hourlyData && hourlyData.surface_pressure) {
      const pressures = hourlyData.surface_pressure.slice(0, 12).filter(p => p !== null);
      
      if (pressures.length > 2) {
        const avgPressure = pressures.reduce((a, b) => a + b, 0) / pressures.length;
        const pressureTrend = pressures[pressures.length - 1] - pressures[0];
        
        result.sensorValidation.dataQuality.push({
          sensor: "SURFACE_PRESSURE",
          mean: parseFloat(avgPressure.toFixed(1)),
          trend: parseFloat(pressureTrend.toFixed(2)),
          samples: pressures.length,
          status: Math.abs(pressureTrend) > 3 ? "RAPIDLY_CHANGING" : Math.abs(pressureTrend) > 1.5 ? "CHANGING" : "STABLE"
        });
        
        if (Math.abs(pressureTrend) > 2) {
          result.sensorValidation.drift.push({
            sensor: "SURFACE_PRESSURE",
            type: pressureTrend > 0 ? "RISING_RAPIDLY" : "FALLING_RAPIDLY",
            severity: Math.abs(pressureTrend) > 4 ? "HIGH" : "MODERATE",
            trend: parseFloat(pressureTrend.toFixed(2)),
            description: `Pressure ${pressureTrend > 0 ? "rising" : "falling"} ${Math.abs(pressureTrend).toFixed(1)} hPa over forecast period`
          });
        }
      }
    }
    
    const availableSources = [ensembleData !== null, hourlyData !== null, windShearData.length > 0, kpHistory.length > 0, seaSurfaceTemp !== null, result.acousticPropagation.soundSpeedProfile.length > 0, diffElectronHistory.length > 0];
    const availableCount = availableSources.filter(Boolean).length;
    
    if (availableCount > 0) {
      result.sensorValidation.reliability = parseFloat((availableCount / availableSources.length).toFixed(2));
      alertManager.registerDataPoint("data_reliability", result.sensorValidation.reliability, "", "ensemble_forecast", "INFORMATIONAL");
    }
    
    const [nowcast, modelAgreement, climateNormals] = await Promise.all([
      fetchPrecipitationNowcast(lat, lon, alertManager).catch(error => ({ dataAvailable: false, series: [], error: error.message })),
      fetchModelAgreement(lat, lon, alertManager).catch(error => ({ dataAvailable: false, models: [], spreadSeries: [], error: error.message })),
      fetchClimateNormals(lat, lon, alertManager).catch(error => ({ dataAvailable: false, error: error.message }))
    ]);
    result.nowcast = nowcast;
    result.modelAgreement = modelAgreement;
    result.climateNormals = climateNormals;

    if (alertManager.dataSourceStatus.get("acoustic_propagation")?.status === "PENDING") alertManager.updateDataSourceStatus("acoustic_propagation", "FAILED", 0, "Upper-air data needed for acoustic modeling was is unavailable.");
    const fullReport = alertManager.getFullReport();
    result.violations = fullReport.violations;
    result.alerts = fullReport.alerts;
    result.alertManager = { dataSources: fullReport.dataSources, dataPoints: fullReport.dataPoints, summary: fullReport.summary, decision: fullReport.decision, historicalData: fullReport.historicalData };
    result.status = "AVAILABLE";
  } catch (error) {
    alertManager.addAlert(`Critical error in Forecast & Outlook module: ${error.message}`, "CRITICAL", "SYSTEM", "temporal_forensics", { errorStack: error.stack });
    const fullReport = alertManager.getFullReport();
    result.status = "FAILED";
    result.violations = fullReport.violations;
    result.alerts = fullReport.alerts;
    result.alertManager = { dataSources: fullReport.dataSources, dataPoints: fullReport.dataPoints, summary: fullReport.summary, historicalData: fullReport.historicalData };
  }
  
  return result;
}

const EVALUATION_SNAPSHOTS = new Map();

const EVALUATION_SNAPSHOT_LIMIT = 200;

function recordEvaluationSnapshot(lat, lon, result) {
  if (!result || !result.decision) return;
  const points = {};
  for (const [pointId, entry] of sharedParameterValues.entries()) {
    if (entry && typeof entry.value === "number" && Number.isFinite(entry.value)) points[pointId] = entry.value;
  }
  const key = `${Number(lat).toFixed(2)},${Number(lon).toFixed(2)}`;
  EVALUATION_SNAPSHOTS.delete(key);
  EVALUATION_SNAPSHOTS.set(key, {
    lat: Number(lat),
    lon: Number(lon),
    at: Date.now(),
    status: result.decision.status,
    riskScore: result.decision.riskScore,
    confidence: result.decision.confidence,
    dataAvailability: result.decision.dataAvailability,
    points
  });
  while (EVALUATION_SNAPSHOTS.size > EVALUATION_SNAPSHOT_LIMIT) EVALUATION_SNAPSHOTS.delete(EVALUATION_SNAPSHOTS.keys().next().value);
}

async function singleConditionsEvaluation(lat, lon) {
  if (EVALUATION_STATE.isRunning) {
    return new Promise((resolve, reject) => {
      EVALUATION_STATE.pendingRequests.push({ lat, lon, resolve, reject });
    });
  }
  
  EVALUATION_STATE.isRunning = true;
  resetSharedRegistry();
  let result = null;
  
  try {
    result = await consolidatedConditionsEvaluation(lat, lon);
    EVALUATION_STATE.lastEvaluation = result;
    recordEvaluationSnapshot(lat, lon, result);
    return result;
  } finally {
    EVALUATION_STATE.isRunning = false;
    const pending = EVALUATION_STATE.pendingRequests;
    EVALUATION_STATE.pendingRequests = [];
    const deferred = [];
    for (const request of pending) {
      if (result && request.lat === lat && request.lon === lon) request.resolve(result);
      else deferred.push(request);
    }
    for (const request of deferred) {
      singleConditionsEvaluation(request.lat, request.lon).then(request.resolve, request.reject);
    }
  }
}

async function consolidatedConditionsEvaluation(lat, lon) {
  const startTime = Date.now();
  
  const [overviewResult, atmosphericResult, emResult, groundResult, temporalResult] = await Promise.all([
    overviewSystem(lat, lon),
    atmosphericEnvironmentSystem(lat, lon),
    electromagneticEnvironmentSystem(lat, lon),
    groundEnvironmentSystem(lat, lon),
    temporalForensicsSystem(lat, lon)
  ]);
  
  const allAlerts = [...overviewResult.alerts, ...atmosphericResult.alerts, ...emResult.alerts, ...groundResult.alerts, ...temporalResult.alerts];
  const allViolations = [...overviewResult.violations, ...atmosphericResult.violations, ...emResult.violations, ...groundResult.violations, ...temporalResult.violations];
  const allDataSources = [...(overviewResult.alertManager?.dataSources || []), ...(atmosphericResult.alertManager?.dataSources || []), ...(emResult.alertManager?.dataSources || []), ...(groundResult.alertManager?.dataSources || []), ...(temporalResult.alertManager?.dataSources || [])];
  
  const criticalAlerts = allAlerts.filter(a => a.severity === "CRITICAL");
  const warningAlerts = allAlerts.filter(a => a.severity === "WARNING");
  const advisoryAlerts = allAlerts.filter(a => a.severity === "ADVISORY");
  const infoAlerts = allAlerts.filter(a => a.severity === "INFO");
  
  const criticalViolations = allViolations.filter(v => v.severity === "CRITICAL");
  const warningViolations = allViolations.filter(v => v.severity === "WARNING");
  const advisoryViolations = allViolations.filter(v => v.severity === "ADVISORY");
  const infoViolations = allViolations.filter(v => v.severity === "INFO");
  
  const failedSafetyCriticalSources = allDataSources.filter(s => s.status === "FAILED" && (s.criticality === "PRIMARY" || s.criticality === "SAFETY_CRITICAL"));
  const failedOperationalSources = allDataSources.filter(s => s.status === "FAILED" && s.criticality === "OPERATIONAL");
  const allFailedSources = allDataSources.filter(s => s.status === "FAILED");
  const degradedSources = allDataSources.filter(s => s.status === "DEGRADED");
  
  const operationalSourceCount = allDataSources.filter(s => s.status === "AVAILABLE" || s.status === "OPERATIONAL").length;
  const totalSourceCount = allDataSources.length;
  const dataAvailability = totalSourceCount > 0 ? operationalSourceCount / totalSourceCount : 0;
  
  let survivalChance = 1.0 - 0.03; 
  
  for (const v of allViolations) {
    if (v.severity === "NOMINAL") continue;
    const severityInfo = ALERT_SEVERITY[v.severity] || ALERT_SEVERITY.INFO;
    const vRisk = Math.min(0.90, (severityInfo.riskContribution * (v.multiplier || 1)) / 2);
    survivalChance *= (1.0 - vRisk);
  }
  
  for (const a of allAlerts) {
    const severityInfo = ALERT_SEVERITY[a.severity] || ALERT_SEVERITY.INFO;
    const aRisk = severityInfo.riskContribution * 0.2;
    survivalChance *= (1.0 - aRisk);
  }
  
  for (const s of failedSafetyCriticalSources) {
    survivalChance *= (1.0 - 0.03);
  }
  for (const s of failedOperationalSources) {
    survivalChance *= (1.0 - 0.01);
  }
  for (const s of degradedSources) {
    survivalChance *= (1.0 - 0.005);
  }
  
  if (dataAvailability < 1.0) {
    const availabilityRisk = (1 - dataAvailability) * 0.10;
    survivalChance *= (1.0 - availabilityRisk);
  }
  
  const riskScore = Math.min(1.0, Math.max(0, 1.0 - survivalChance));
  const confidence = Math.round((1.0 - riskScore) * 100);
  
  let status = "NOMINAL";
  let category = "NOMINAL";
  let reasons = [];
  
  if (criticalViolations.length > 0) {
    status = "SEVERE";
    category = "CRITICAL_VIOLATION";
    reasons.push(`${criticalViolations.length} critical parameter violation${criticalViolations.length === 1 ? "" : "s"} detected`);
  }
  
  if (criticalAlerts.length > 0) {
    status = "SEVERE";
    category = category === "NOMINAL" ? "CRITICAL_ALERT" : category;
    reasons.push(`${criticalAlerts.length} critical alert${criticalAlerts.length === 1 ? "" : "s"} active`);
  }
  
  if (failedSafetyCriticalSources.length >= 2) {
    status = "SEVERE";
    category = category === "NOMINAL" ? "DATA_INTEGRITY" : category;
    const sourceNames = failedSafetyCriticalSources.map(s => s.name).slice(0, 3).join(", ");
    reasons.push(`Multiple safety-critical data sources failed: ${sourceNames}${failedSafetyCriticalSources.length > 3 ? ` (+${failedSafetyCriticalSources.length - 3} more)` : ""}`);
  }
  
  const moduleStatuses = [
    { name: "Overview", status: overviewResult.status },
    { name: "Atmospheric Environment", status: atmosphericResult.status },
    { name: "Space Weather", status: emResult.status },
    { name: "Local Conditions & Hazards", status: groundResult.status },
    { name: "Forecast & Outlook", status: temporalResult.status }
  ];
  
  const failedModules = moduleStatuses.filter(m => m.status === "FAILED" || m.status === "CRITICAL_FAILURE");
  if (failedModules.length > 0) {
    status = "SEVERE";
    category = category === "NOMINAL" ? "MODULE_FAILURE" : category;
    reasons.push(`Monitoring modules failed: ${failedModules.map(m => m.name).join(", ")}`);
  }
  
  if (dataAvailability < 0.4) {
    status = "SEVERE";
    category = category === "NOMINAL" ? "INSUFFICIENT_DATA" : category;
    reasons.push(`Only ${Math.round(dataAvailability * 100)}% data sources operational (minimum 40%)`);
  }
  
  if (status === "NOMINAL") {
    if (riskScore >= 0.50) {
      status = "SEVERE";
      category = "RISK_ACCUMULATION";
      reasons.push(`Cumulative hazard index ${(riskScore * 100).toFixed(1)}% exceeds the 50% threshold`);
    } else if (warningViolations.length >= 5) {
      status = "SEVERE";
      category = "WARNING_ACCUMULATION";
      reasons.push(`${warningViolations.length} warning-level violations exceed maximum of 4`);
    } else if (riskScore >= 0.25 || warningViolations.length >= 2 || warningAlerts.length >= 2 || failedSafetyCriticalSources.length > 0 || advisoryViolations.length >= 6 || degradedSources.length >= 3) {
      status = "ELEVATED";
      category = "ELEVATED_CONDITIONS";
      if (riskScore >= 0.25) reasons.push(`Hazard index ${(riskScore * 100).toFixed(1)}% warrants caution`);
      if (warningViolations.length >= 2) reasons.push(`${warningViolations.length} warning violations require monitoring`);
      if (warningAlerts.length >= 2) reasons.push(`${warningAlerts.length} warning alerts active`);
      if (failedSafetyCriticalSources.length > 0) reasons.push(`${failedSafetyCriticalSources.length} safety-critical data source(s) unavailable`);
      if (advisoryViolations.length >= 6) reasons.push(`${advisoryViolations.length} advisory violations warrant attention`);
      if (degradedSources.length >= 3) reasons.push(`${degradedSources.length} data sources operating in degraded mode`);
    } else if (advisoryViolations.length > 0 || infoViolations.length > 0 || advisoryAlerts.length > 0 || warningViolations.length > 0 || warningAlerts.length > 0 || allFailedSources.length > 0) {
      status = "NOMINAL";
      category = "NOMINAL_WITH_OBSERVATIONS";
      const totalMinor = advisoryViolations.length + infoViolations.length;
      const totalWarnings = warningViolations.length + warningAlerts.length;
      if (totalWarnings > 0) {
        reasons.push(`Conditions nominal with ${totalWarnings} warning(s) and ${totalMinor} observation(s) logged`);
      } else {
        reasons.push(`Conditions nominal with ${totalMinor} minor observation(s) logged`);
      }
    } else {
      reasons.push("All parameters are within their optimal ranges.");
    }
  }
  
  if (confidence < 35 && status === "NOMINAL") {
    status = "ELEVATED";
    category = "LOW_CONFIDENCE";
    reasons.unshift(`System confidence ${confidence}% below optimal threshold`);
  }
  
  const processingTime = Date.now() - startTime;
  const moduleResults = [overviewResult, atmosphericResult, emResult, groundResult, temporalResult];
  for (const moduleResult of moduleResults) {
    if (moduleResult.alertManager) {
      if (moduleResult.alertManager.summary) {
        moduleResult.alertManager.summary.overallRisk = riskScore;
        moduleResult.alertManager.summary.overallConfidence = confidence;
        moduleResult.alertManager.summary.riskScore = riskScore;
        moduleResult.alertManager.summary.confidence = confidence;
      }
      if (moduleResult.alertManager.decision) {
        moduleResult.alertManager.decision.riskScore = riskScore;
        moduleResult.alertManager.decision.confidence = confidence;
      }
    }
  }
  
  const decision = {
    status,
    confidence,
    riskScore,
    category,
    primaryReason: formatDisplayText(reasons[0] || "The system status could not be determined."),
    allReasons: reasons.map(formatDisplayText),
    dataAvailability: Math.round(dataAvailability * 100),
    moduleStatuses,
    alertSummary: { critical: criticalAlerts.length, warning: warningAlerts.length, advisory: advisoryAlerts.length, info: infoAlerts.length, total: allAlerts.length },
    violationSummary: { critical: criticalViolations.length, warning: warningViolations.length, advisory: advisoryViolations.length, info: infoViolations.length, total: allViolations.length },
    dataSourceSummary: { total: totalSourceCount, operational: operationalSourceCount, failed: allFailedSources.length, degraded: degradedSources.length, failedCritical: failedSafetyCriticalSources.length },
    timestamp: new Date().toISOString(),
    processingTimeMs: processingTime
  };
  
  const summary = {
    status,
    riskScore,
    confidence,
    overallRisk: riskScore,
    overallConfidence: confidence,
    totalAlerts: allAlerts.length,
    totalViolations: allViolations.length,
    totalDataSources: totalSourceCount,
    dataAvailability: Math.round(dataAvailability * 100)
  };
  
  
  return { 
    decision, 
    riskScore,
    confidence,
    summary,
    modules: { 
      overview: overviewResult, 
      atmosphericEnvironment: atmosphericResult, 
      electromagneticEnvironment: emResult, 
      groundEnvironment: groundResult, 
      temporalForensics: temporalResult 
    }, 
    alerts: allAlerts, 
    violations: allViolations, 
    dataSources: allDataSources 
  };
}

router.post("/consolidated-evaluation", async (req, res) => {
  try {
    const { lat, lon } = req.body;
    
    if (lat === undefined || lon === undefined || lat === null || lon === null || isNaN(lat) || isNaN(lon)) return res.status(400).json({ error: "Invalid Request", message: "A valid latitude and longitude are required." });
    
    const result = await sharedEvaluation(lat, lon);
    rememberAreaEvaluation(lat, lon, result);
    const bigBoard = { color: result.decision.status === "NOMINAL" ? "GREEN" : result.decision.status === "ELEVATED" ? "YELLOW" : "RED", status: result.decision.status, message: result.decision.primaryReason, confidence: `${result.decision.confidence}%`, risk: `${Math.round(result.decision.riskScore * 100)}%` };
    
    res.json({
      module: "CONSOLIDATED_CONDITIONS_EVALUATION",
      bigBoard,
      decision: result.decision,
      executive_summary: { conditions_status: result.decision.status, confidence: `${result.decision.confidence}%`, hazard_index: `${Math.round(result.decision.riskScore * 100)}%`, data_availability: `${result.decision.dataAvailability}%`, critical_issues: result.decision.alertSummary.critical + result.decision.violationSummary.critical, warning_issues: result.decision.alertSummary.warning + result.decision.violationSummary.warning, advisory_issues: result.decision.alertSummary.advisory + result.decision.violationSummary.advisory, total_observations: result.decision.alertSummary.total + result.decision.violationSummary.total, primary_concern: result.decision.primaryReason },
      module_statuses: result.decision.moduleStatuses,
      alerts: result.alerts,
      violations: result.violations,
      data_sources: result.dataSources,
      detailed_modules: result.modules,
      metadata: { timestamp: result.decision.timestamp, processing_time_ms: result.decision.processingTimeMs, industry_standards_applied: Object.keys(INDUSTRY_LIMITS).length }
    });
  } catch (error) {
    res.status(500).json({ error: "Consolidated Evaluation Failed", message: displayReasonSentence(error.message), bigBoard: { color: "RED", status: "UNKNOWN", message: "The system evaluation failed." } });
  }
});

const AREA_RESULT_CACHE = new Map();

const EVALUATIONS_IN_FLIGHT = new Map();

const ANALYSIS_CACHE = new Map();

const EVALUATION_MODULE_KEYS = ["overview", "groundEnvironment", "atmosphericEnvironment", "electromagneticEnvironment", "temporalForensics"];

function areaCacheKey(lat, lon) {
  return `${Number(lat).toFixed(AREA_EVALUATION.precision)},${Number(lon).toFixed(AREA_EVALUATION.precision)}`;
}

function primitiveDetails(details) {
  return Object.fromEntries(Object.entries(details && typeof details === "object" ? details : {}).filter(([key, value]) => key !== "errorStack" && (typeof value === "number" || typeof value === "boolean" || (typeof value === "string" && value.length <= 300))));
}

function summarizeEvaluation(result) {
  const modules = result && result.modules ? result.modules : {};
  const alerts = [];
  const violations = [];
  for (const moduleKey of EVALUATION_MODULE_KEYS) {
    const moduleResult = modules[moduleKey] || {};
    for (const alert of moduleResult.alerts || []) {
      if (!alert || !alert.message) continue;
      alerts.push({ message: alert.message, severity: alert.severity, category: alert.category, source: alert.source, details: primitiveDetails(alert.details), timestamp: alert.timestamp, module: moduleKey });
    }
    for (const violation of moduleResult.violations || []) {
      if (!violation || !violation.parameterId) continue;
      violations.push({ parameter: violation.parameter, parameterId: violation.parameterId, value: violation.value, limit: violation.limit, deviationPercent: violation.deviationPercent, severity: violation.severity, source: violation.source, criticality: violation.criticality, limitSource: violation.limitSource, message: violation.message, recommendedAction: violation.recommendedAction, timestamp: violation.timestamp, module: moduleKey });
    }
  }
  const decision = result && result.decision ? result.decision : {};
  return { status: decision.status || "UNKNOWN", primaryReason: decision.primaryReason || null, riskScore: decision.riskScore ?? null, confidence: decision.confidence ?? null, alerts, violations, evaluatedAt: new Date().toISOString() };
}

function sharedEvaluation(lat, lon) {
  const key = areaCacheKey(lat, lon);
  if (EVALUATIONS_IN_FLIGHT.has(key)) return EVALUATIONS_IN_FLIGHT.get(key);
  const pending = singleConditionsEvaluation(lat, lon);
  EVALUATIONS_IN_FLIGHT.set(key, pending);
  pending.catch(() => null).finally(() => {
    if (EVALUATIONS_IN_FLIGHT.get(key) === pending) EVALUATIONS_IN_FLIGHT.delete(key);
  });
  return pending;
}

function rememberAreaEvaluation(lat, lon, result) {
  const summary = summarizeEvaluation(result);
  const key = areaCacheKey(lat, lon);
  AREA_RESULT_CACHE.delete(key);
  AREA_RESULT_CACHE.set(key, { at: Date.now(), summary });
  while (AREA_RESULT_CACHE.size > AREA_EVALUATION.cacheLimit) AREA_RESULT_CACHE.delete(AREA_RESULT_CACHE.keys().next().value);
  return summary;
}

router.post("/earth-conditions/area-alerts", async (req, res) => {
  const lat = toNumber(req.body?.lat);
  const lon = toNumber(req.body?.lon);
  if (lat === null || lon === null || lat < -90 || lat > 90 || lon < -180 || lon > 180) return res.status(400).json({ success: false, message: "A valid latitude and longitude are required." });
  const cached = AREA_RESULT_CACHE.get(areaCacheKey(lat, lon));
  if (cached && Date.now() - cached.at < AREA_EVALUATION.cacheMs) return res.json({ success: true, cached: true, ...cached.summary, evaluatedAt: new Date(cached.at).toISOString() });
  try {
    const result = await sharedEvaluation(lat, lon);
    res.json({ success: true, cached: false, ...rememberAreaEvaluation(lat, lon, result) });
  } catch (error) {
    res.status(500).json({ success: false, message: `The area evaluation failed. ${displayReasonSentence(error.message)}` });
  }
});

async function requestAlertAnalysis(payload) {
  const apiKey = envValue(API_KEY_ENV.gemini);
  const model = envValue(ALERT_ANALYSIS.modelEnv) || ALERT_ANALYSIS.defaultModel;
  const thinkingLevel = envValue(ALERT_ANALYSIS.thinkingEnv) || ALERT_ANALYSIS.defaultThinking;
  const body = (withThinking) => ({
    systemInstruction: { parts: [{ text: ALERT_ANALYSIS.instructions }] },
    contents: [{ role: "user", parts: [{ text: JSON.stringify(payload) }] }],
    generationConfig: {
      temperature: ALERT_ANALYSIS.temperature,
      maxOutputTokens: ALERT_ANALYSIS.maxOutputTokens,
      ...(withThinking && thinkingLevel ? { thinkingConfig: { thinkingLevel } } : {}),
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          summary: { type: "STRING" },
          threats: { type: "ARRAY", items: { type: "STRING" } },
          actions: { type: "ARRAY", items: { type: "STRING" } },
          timing: { type: "STRING" },
          confidence: { type: "STRING" }
        },
        required: ["summary", "threats", "actions", "timing", "confidence"]
      }
    }
  });
  const url = `${API_ENDPOINTS.GEMINI_GENERATE}${encodeURIComponent(model)}:generateContent`;
  const options = { headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey }, timeout: ALERT_ANALYSIS.timeoutMs };
  let response;
  try {
    response = await axios.post(url, body(true), options);
  } catch (error) {
    const message = String(error?.response?.data?.error?.message || "");
    if (!(error?.response?.status === 400 && /thinking/i.test(message))) throw error;
    response = await axios.post(url, body(false), options);
  }
  const raw = (response.data?.candidates?.[0]?.content?.parts || []).map((part) => part.text || "").join("");
  const parsed = JSON.parse(raw.replace(/```json\s*/g, "").replace(/```/g, "").trim());
  const list = (value) => (Array.isArray(value) ? value : []).map((item) => String(item).trim()).filter(Boolean);
  return {
    summary: String(parsed.summary || "").trim(),
    threats: list(parsed.threats),
    actions: list(parsed.actions),
    timing: String(parsed.timing || "").trim(),
    confidence: String(parsed.confidence || "").trim(),
    model,
    generatedAt: new Date().toISOString()
  };
}

router.post("/earth-conditions/alerts/analysis", async (req, res) => {
  if (!envValue(API_KEY_ENV.gemini)) return res.status(503).json({ success: false, message: "The AI analysis is unavailable because GEMINI_API_KEY is not configured." });
  const item = req.body?.item && typeof req.body.item === "object" ? req.body.item : null;
  const location = req.body?.location && typeof req.body.location === "object" ? req.body.location : {};
  const lat = toNumber(location.latitude);
  const lon = toNumber(location.longitude);
  if (!item || !item.message || !item.severity || lat === null || lon === null) return res.status(400).json({ success: false, message: "An alert with a message, a severity, and a location is required." });
  const text = (value, limit = 400) => (value === null || value === undefined || value === "" ? null : String(value).slice(0, limit));
  const payload = {
    alertType: item.kind === "violation" ? "Threshold Violation" : "Condition Alert",
    message: text(item.message, 600),
    severity: text(item.severity, 20),
    category: text(item.category, 60),
    source: item.source ? formatDisplayText(String(item.source).slice(0, 80)) : null,
    module: text(item.moduleName, 80),
    parameter: text(item.parameter, 120),
    value: text(item.value, 80),
    limit: text(item.limit, 80),
    deviationPercent: toNumber(item.deviationPercent),
    limitReference: text(item.limitSource, 120),
    recommendedAction: text(item.recommendedAction, 300),
    details: primitiveDetails(item.details),
    raisedAt: text(item.timestamp, 40),
    location: { label: text(location.label, 160), latitude: lat, longitude: lon, monitoredAreas: Array.isArray(location.areas) ? location.areas.slice(0, 10).map((name) => String(name).slice(0, 80)) : [] }
  };
  const key = `${areaCacheKey(lat, lon)}|${crypto.createHash("sha1").update(String(item.key || `${payload.alertType}|${payload.category}|${payload.parameter}|${payload.source}|${payload.message}`)).digest("hex")}|${payload.severity}`;
  const cached = ANALYSIS_CACHE.get(key);
  if (cached && cached.result && Date.now() - cached.at < ALERT_ANALYSIS.cacheMs) return res.json({ success: true, analysis: cached.result, cached: true });
  if (cached && cached.failedAt && Date.now() - cached.failedAt < ALERT_ANALYSIS.retryAfterMs) return res.status(502).json({ success: false, message: `The AI analysis could not be generated by ${ALERT_ANALYSIS.name}. ${cached.reason}` });
  try {
    const loading = cached && cached.loading ? cached.loading : requestAlertAnalysis(payload);
    if (!cached || !cached.loading) ANALYSIS_CACHE.set(key, { loading });
    const result = await loading;
    ANALYSIS_CACHE.set(key, { result, at: Date.now() });
    while (ANALYSIS_CACHE.size > ALERT_ANALYSIS.cacheLimit) ANALYSIS_CACHE.delete(ANALYSIS_CACHE.keys().next().value);
    res.json({ success: true, analysis: result, cached: false });
  } catch (error) {
    const reason = displayReasonSentence(error?.response?.data?.error?.message || error.message || "The request failed.");
    ANALYSIS_CACHE.set(key, { failedAt: Date.now(), reason });
    res.status(502).json({ success: false, message: `The AI analysis could not be generated by ${ALERT_ANALYSIS.name}. ${reason}` });
  }
});

router.post("/single-module-evaluation", async (req, res) => {
  try {
    const { lat, lon, module = "overview" } = req.body;
    
    if (lat === undefined || lon === undefined || lat === null || lon === null || isNaN(lat) || isNaN(lon)) return res.status(400).json({ error: "Invalid Request", message: "A valid latitude and longitude are required." });
    
    resetSharedRegistry();
    
    let result;
    switch (module.toLowerCase()) {
      case "overview":
        result = await overviewSystem(lat, lon);
        break;
      case "atmospheric":
        result = await atmosphericEnvironmentSystem(lat, lon);
        break;
      case "electromagnetic":
        result = await electromagneticEnvironmentSystem(lat, lon);
        break;
      case "ground":
        result = await groundEnvironmentSystem(lat, lon);
        break;
      case "temporal":
        result = await temporalForensicsSystem(lat, lon);
        break;
      default:
        return res.status(400).json({ error: "Invalid Module", message: "The module must be one of overview, atmospheric, electromagnetic, ground, or temporal." });
    }
    
    res.json({
      module: module.toUpperCase(),
      result,
      metadata: { timestamp: result.timestamp, module_name: module }
    });
  } catch (error) {
    res.status(500).json({ error: `${formatDisplayText(String(req.body.module || "Unknown"))} Module Failed`, message: displayReasonSentence(error.message) });
  }
});

router.get("/reverse-geocode", async (req, res) => {
  try {
    const lat = toNumber(req.query.lat);
    const lon = toNumber(req.query.lon);
    if (lat === null || lon === null || lat < -90 || lat > 90 || lon < -180 || lon > 180) return res.status(400).json({ error: "Invalid Request", message: "A valid latitude and longitude are required." });
    const url = `${API_ENDPOINTS.NOMINATIM_REVERSE}?format=jsonv2&lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}&zoom=12&accept-language=en`;
    const result = await makeApiRequestWithBackoff(url, { "User-Agent": contactUserAgent() }, 10000, 1);
    const a = result.data?.address;
    if (result.status !== 200 || !a) return res.json({ label: null });
    const locality = a.city || a.town || a.village || a.municipality || a.hamlet || a.county || null;
    const label = [locality, a.state || a.region, a.country].filter(Boolean).join(", ") || result.data.display_name || null;
    res.json({ label });
  } catch (error) {
    res.status(500).json({ error: "Reverse Geocoding Failed", message: displayReasonSentence(error.message) });
  }
});

router.get("/location-search", async (req, res) => {
  try {
    const query = String(req.query.query || "").trim();
    if (query.length < 2) return res.status(400).json({ error: "Invalid Request", message: "A search query of at least 2 characters is required." });
    const results = await searchLocations(query);
    if (results === null) return res.status(502).json({ error: "Location Search Failed", message: "The geocoding service could not be reached." });
    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: "Location Search Failed", message: displayReasonSentence(error.message) });
  }
});

router.post("/earth-conditions/interpretations", async (req, res) => {
  try {
    if (!envValue(API_KEY_ENV.gemini)) return res.status(503).json({ error: "Interpretations Unavailable", message: "GEMINI_API_KEY is not configured." });
    const location = req.body?.location || {};
    const panels = Array.isArray(req.body?.panels) ? req.body.panels.slice(0, 200).filter(p => p && typeof p.key === "string" && p.key.trim() !== "").map(p => ({
      key: p.key,
      title: String(p.title || "Panel").slice(0, 200),
      reference: String(p.reference || "").slice(0, 1500),
      content: String(p.content || "").slice(0, 2000)
    })) : [];
    if (!panels.length) return res.status(400).json({ error: "Invalid Request", message: "At least one panel is required." });
    const { results, failures } = await generateInterpretations(location, panels);
    res.json({ interpretations: results, failures });
  } catch (error) {
    res.status(500).json({ error: "Interpretations Failed", message: displayReasonSentence(error.message) });
  }
});

router.get("/earth-conditions/health", (req, res) => {
  const systemStatus = Array.from(serviceHealth.entries()).reduce((acc, [service, stats]) => { const successRate = stats.total > 0 ? stats.success / stats.total : 0; acc[service] = successRate > 0.7 ? "HEALTHY" : "DEGRADED"; return acc; }, {});
  res.json({
    status: Object.values(systemStatus).every(s => s === "HEALTHY") ? "OPERATIONAL" : "DEGRADED",
    timestamp: new Date().toISOString(),
    version: "31.0.0-EARTH-CONDITIONS",
    modules: { overview: "SUMMARY_DOMAIN", atmospheric_environment: "ATMOSPHERE_DOMAIN", electromagnetic_environment: "SPACE_WEATHER_DOMAIN", ground_environment: "SURFACE_DOMAIN", temporal_forensics: "PREDICTIVE_DOMAIN" },
    services: systemStatus,
    metrics: { cacheEntries: cache.size, uptime: Math.floor(process.uptime()), moduleCount: 5, dataSourcesActive: Object.keys(API_ENDPOINTS).length, industryLimitsConfigured: Object.keys(INDUSTRY_LIMITS).length },
    orbitalCapabilities: { satelliteCatalog: "AMSAT-TLE", spaceStationTracking: "AMSAT-TLE-Filtered", overheadCoverage: "Inclination-Latitude-Based" },
    atmosphericCapabilities: { cloudAnalysis: "GOES-METAR-EQUIVALENT", humidityProfiles: "RADIOSONDE-EQUIVALENT", temperatureInversions: "MULTI-LEVEL-DETECTION", convectiveIndices: "CAPE-LI-AVAILABLE" }
  });
});


module.exports = router;

module.exports.evaluationSnapshots = (since = 0) => Array.from(EVALUATION_SNAPSHOTS.values()).filter((snapshot) => snapshot.at > since);