const path = require("path");
const crypto = require("crypto");
const { encodePng, PermanentError, HttpStatusError, parseTimestamp, parseAnyDate, pathTimeRange, expandPeriod, titleCase, slug, IMAGE_EXTENSIONS, parseAutoindex, s3NodeUrl, createLeafScanner, decodeXml, tagText, tagTexts, tagBlocks, attrValue } = require("../../../engine");

const fill = (template, values) => template.replace(/\{(\w+)\}/g, (match, key) => (values[key] === undefined ? match : String(values[key])));

const SETTINGS = {
  domain: "satellite-feeds",

  starCdn: {
    root: "https://cdn.star.nesdis.noaa.gov",
    sectors: {
      FD: "Full Disk",
      CONUS: "CONUS",
      PACUS: "PACUS",
      M1: "Mesoscale 1",
      M2: "Mesoscale 2",
      car: "Caribbean",
      cam: "Central America",
      can: "Canada",
      eep: "Eastern East Pacific",
      eus: "Eastern United States",
      ga: "Gulf of America",
      gm: "Gulf of Mexico",
      mex: "Mexico",
      na: "North Atlantic",
      ne: "Northeast",
      nr: "Northern Rockies",
      nsa: "Northern South America",
      pnw: "Pacific Northwest",
      pr: "Puerto Rico",
      psw: "Pacific Southwest",
      sp: "Southern Plains",
      sr: "Southern Rockies",
      ssa: "Southern South America",
      taw: "Tropical Atlantic",
      tpw: "Tropical Pacific",
      umv: "Upper Mississippi Valley",
      smv: "Southern Mississippi Valley",
      se: "Southeast",
      cgl: "Great Lakes",
      wus: "Western United States",
      ak: "Alaska",
      cak: "Central Alaska",
      sea: "Southeastern Alaska",
      hi: "Hawaii",
      np: "Northern Pacific",
      sp_pac: "Southern Pacific"
    },
    bands: {
      GEOCOLOR: "GeoColor",
      AirMass: "Air Mass",
      Sandwich: "Sandwich",
      DayNightCloudMicroCombo: "Day Night Cloud Micro Combo",
      FireTemperature: "Fire Temperature",
      Dust: "Dust",
      DMW: "Derived Motion Winds",
      EXTENT3: "GLM Flash Extent Density",
      "EXTENT": "GLM Flash Extent"
    },
    hosts: { "cdn.star.nesdis.noaa.gov": 1000 },
    sources: [{
        sourceKey: "noaa-star-cdn",
        name: "NOAA STAR GOES Imagery",
        config: {
          satellites: ["GOES19", "GOES18"],
          targetPx: 2048,
          archive: ["star-goes19-abi-fd-geocolor", "star-goes18-abi-fd-geocolor", "star-goes19-abi-conus-geocolor", "star-goes18-abi-pacus-geocolor"]
        }
      }],
    intervals: { roots: 21600 }
  },

  swpc: {
    base: "https://services.swpc.noaa.gov",
    index: "https://services.swpc.noaa.gov/products/animations/",
    names: {
      "lasco-c2": "SOHO LASCO C2 Coronagraph",
      "lasco-c3": "SOHO LASCO C3 Coronagraph",
      "ccor1": "GOES-19 CCOR-1 Coronagraph",
      "ccor1-diff": "GOES-19 CCOR-1 Difference Coronagraph",
      "ccor2": "SWFO-L1 CCOR-2 Coronagraph",
      "ccor2-diff": "SWFO-L1 CCOR-2 Difference Coronagraph",
      "sdo-hmii": "SDO HMI Intensitygram",
      "enlil": "WSA-ENLIL Solar Wind Model",
      "ovation_north_24h": "OVATION Aurora Forecast (North)",
      "ovation_south_24h": "OVATION Aurora Forecast (South)"
    },
    categories: [
      [/suvi|sdo|hmi/, "Solar Imagery"],
      [/lasco|ccor/, "Coronagraph"],
      [/ovation/, "Aurora"],
      [/enlil/, "Space Weather Model"],
      [/tec|glotec|ctipe|wam|d-rap|geospace|geoelectric/, "Ionosphere and Geospace"]
    ],
    hosts: { "services.swpc.noaa.gov": 750 },
    sources: [{
        sourceKey: "noaa-swpc-imagery",
        name: "NOAA SWPC Space Weather Imagery",
        config: {
          archive: ["suvi-primary-195", "suvi-primary-304", "lasco-c2", "lasco-c3", "ccor1", "ovation_north_24h"]
        }
      }],
    intervals: { index: 600 }
  },

  noaaBuckets: {
    sectorLabels: { F: "Full Disk", C: "CONUS", M: "Mesoscale", M1: "Mesoscale 1", M2: "Mesoscale 2" },
    sources: [
      {
        sourceKey: "noaa-goes19-raw",
        name: "GOES-19 Raw Data",
        classifier: "goes19",
        config: {
          bucket: "noaa-goes19",
          families: ["^ABI-L2-CMIP[FCM]$", "^ABI-L2-MCMIP[FC]$", "^ABI-L1b-Rad[FC]$", "^SUVI-L1b-", "^GLM-L2-LCFA$"],
          lookbackHours: 3,
          render: [{ sector: "F", band: 13 }, { sector: "F", band: 8 }, { sector: "C", band: 13 }]
        }
      },
      {
        sourceKey: "noaa-goes18-raw",
        name: "GOES-18 Raw Data",
        classifier: "goes18",
        config: {
          bucket: "noaa-goes18",
          families: ["^ABI-L2-CMIP[FCM]$", "^ABI-L2-MCMIP[FC]$", "^ABI-L1b-Rad[FC]$", "^GLM-L2-LCFA$"],
          lookbackHours: 3,
          render: [{ sector: "F", band: 13 }, { sector: "C", band: 13 }]
        }
      },
      {
        sourceKey: "noaa-himawari9-raw",
        name: "Himawari-9 Raw Data",
        classifier: "himawari",
        config: { bucket: "noaa-himawari9", families: ["^AHI-L1b-FLDK$", "^AHI-L2-FLDK-"], lookbackHours: 2 }
      },
      {
        sourceKey: "noaa-gk2a-raw",
        name: "GK2A Raw Data",
        classifier: "gk2a",
        config: { bucket: "noaa-gk2a-pds", families: ["^AMI$", "^L1B$", "^FD$"], lookbackHours: 2 }
      }
    ],
    hosts: {
      "noaa-goes19.s3.amazonaws.com": 250,
      "noaa-goes18.s3.amazonaws.com": 250,
      "noaa-himawari9.s3.amazonaws.com": 250,
      "noaa-gk2a-pds.s3.amazonaws.com": 250
    },
    intervals: { roots: 3600 }
  },

  gibs: {
    wms: "https://gibs.earthdata.nasa.gov/wms/{projection}/best/wms.cgi",
    wmts: "https://gibs.earthdata.nasa.gov/wmts/{projection}/best/1.0.0/WMTSCapabilities.xml",
    snppNotice: "Suomi NPP deliveries end on November 1, 2026, so this layer should be replaced by its NOAA-20 or NOAA-21 equivalent.",
    categoryRules: [
      [/CorrectedReflectance|TrueColor|Bands\d|SurfaceReflectance/i, "Earth Observation"],
      [/Fires|Thermal_Anomalies|FireTemp/i, "Fires"],
      [/Aerosol|AOD|Dust|Smoke/i, "Aerosols"],
      [/Cloud/i, "Clouds"],
      [/Snow|Sea_Ice|Ice/i, "Cryosphere"],
      [/Chlorophyll|Ocean|SST|Sea_Surface/i, "Oceans"],
      [/Precipitation|IMERG|Rain/i, "Precipitation"],
      [/Night|DayNightBand|Black_Marble/i, "Night Lights"],
      [/Vegetation|NDVI|EVI|Land_Surface/i, "Land"],
      [/Water_Vapor|Humidity|Temperature/i, "Atmosphere"]
    ],
    hosts: { "gibs.earthdata.nasa.gov": 500 },
    sources: [{ sourceKey: "nasa-gibs", name: "NASA GIBS", config: { projections: ["epsg4326"], archive: [] } }],
    backfillFrames: 30,
    intervals: { capabilities: 43200 }
  },

  eumetview: {
    defaultBase: "https://view.eumetsat.int/geoserver",
    capabilitiesPath: "wms?service=WMS&request=GetCapabilities&version=1.3.0",
    forecastPattern: "\\b(GEPS|GDPS|RDPS|HRDPS|REPS|CAPS|RDWPS|GDWPS|GIOPS|RIOPS|CIOPS|WCPS|ICON|COSMO|GFS|NAM|HRRR|NBM|forecast|prognos\\w*|vorhersage|druckfl\\w*|geopotential|percentile|ensemble|model)\\b",
    maxFutureMinutes: 10,
    categoryRules: [
      [/rgb|truecolo|natural|airmass|dust|convection|fog|snow/i, "Geostationary Imagery"],
      [/ir\d|wv\d|vis\d|nir\d|hrv/i, "Geostationary Channels"],
      [/fire|frp/i, "Fires"],
      [/cloud|clm|cth|ctt/i, "Clouds"],
      [/precip|rain|mpe/i, "Precipitation"],
      [/lightning|li_/i, "Lightning"]
    ],
    hosts: { "view.eumetsat.int": 1000, "nowcoast.noaa.gov": 1000, "geo.weather.gc.ca": 1000, "maps.dwd.de": 1000 },
    sources: [
        {
          sourceKey: "eumetsat-eumetview",
          name: "EUMETSAT EUMETView",
          config: {
            archive: ["^msg_fes:rgb_naturalenhncd$", "^msg_fes:ir108$", "^msg_iodc:rgb_naturalenhncd$", "^mtg_fd:rgb_truecolour$"],
            workspaces: ["msg_fes", "msg_iodc", "mtg_fd"],
            backfillFrames: 12
          }
        },
        {
          sourceKey: "noaa-nowcoast",
          name: "NOAA nowCOAST",
          config: { base: "https://nowcoast.noaa.gov/geoserver", prefix: "nowcoast", provider: "NOAA nowCOAST", archive: [], backfillFrames: 12 }
        },
        {
          sourceKey: "eccc-geomet",
          name: "ECCC GeoMet",
          config: {
            base: "https://geo.weather.gc.ca/geomet",
            capabilities: "https://geo.weather.gc.ca/geomet?lang=en&service=WMS&version=1.3.0&request=GetCapabilities",
            map: "https://geo.weather.gc.ca/geomet?lang=en",
            prefix: "geomet",
            provider: "Environment and Climate Change Canada",
            geoserver: false,
            archive: [],
            backfillFrames: 12
          }
        },
        {
          sourceKey: "dwd-geoserver",
          name: "DWD GeoServer",
          config: { base: "https://maps.dwd.de/geoserver", prefix: "dwd", provider: "Deutscher Wetterdienst", archive: [], backfillFrames: 12 }
        }
      ],
    intervals: { capabilities: 21600, recent: 900 }
  },

  helioviewer: {
    api: "https://api.helioviewer.org/v2",
    hosts: { "api.helioviewer.org": 2000 },
    sources: [{ sourceKey: "helioviewer", name: "Helioviewer", config: { archive: [], backfillHours: 24 } }],
    intervals: { sources: 3600, status: 900 }
  },

  epic: {
    base: "https://epic.gsfc.nasa.gov",
    collectionNames: { natural: "DSCOVR EPIC Natural Color", enhanced: "DSCOVR EPIC Enhanced Color", aerosol: "DSCOVR EPIC Aerosol", cloud: "DSCOVR EPIC Cloud Fraction" },
    hosts: { "epic.gsfc.nasa.gov": 1000 },
    sources: [{ sourceKey: "nasa-epic", name: "NASA DSCOVR EPIC", config: { collections: ["natural", "enhanced"], archive: [], backfillDaysPerRun: 14 } }],
    intervals: { latest: 1800, catalog: 3600 }
  },

  satnogs: {
    api: "https://network.satnogs.org/api/observations/",
    observationPage: "https://network.satnogs.org/observations/{id}/",
    hosts: { "network.satnogs.org": 61000 },
    sources: [{
        sourceKey: "satnogs-network",
        name: "SatNOGS Network",
        config: {
          satellites: [
            { norad: 57166, name: "Meteor-M2-3", signal: "LRPT" },
            { norad: 59051, name: "Meteor-M2-4", signal: "LRPT" }
          ],
          archive: []
        }
      }],
    intervals: { recent: 3600, backfill: 7200 }
  },

  youtubeLive: {
    livePage: "https://www.youtube.com/channel/{channelId}/live",
    oembed: "https://www.youtube.com/oembed?format=json&url={watchUrl}",
    watch: "https://www.youtube.com/watch?v={videoId}",
    uploadsFeed: "https://www.youtube.com/feeds/videos.xml?channel_id={channelId}",
    embed: "https://www.youtube.com/embed/{videoId}",
    liveThumbnail: "https://i.ytimg.com/vi/{videoId}/hqdefault_live.jpg",
    thumbnail: "https://i.ytimg.com/vi/{videoId}/hqdefault.jpg",
    include: /\b(iss|international space station|earth view|earth viewing|hd earth|live from space|on[\s-]?orbit|live earth|view from space|spacewalk|eva|cupola|nadir|orbital view)\b/i,
    exclude: /\b(launch|liftoff|countdown|coverage|press|briefing|conference|mission control|prelaunch|pre[\s-]?launch|post[\s-]?launch|interview|recap|review|highlight|replay|webinar|town hall|q\s*&\s*a|trailer|teaser|announcement|rocket|booster|stage[\s-]?separation|deployment|abort)\b/i,
    hosts: { "www.youtube.com": 5000 },
    sources: [{
        sourceKey: "youtube-orbital",
        name: "YouTube Orbital Streams",
        config: {
          channels: [
            { channelId: "UCLA_DiR1FfKNvjuUpBHmylQ", name: "NASA" },
            { channelId: "UCmheCYT4HlbFi943lpH009Q", name: "NASA Live" }
          ]
        }
      }],
    intervals: { live: 600, uploads: 3600 }
  },

  slider: {
    viewer: "https://rammb-slider.cira.colostate.edu/?sat={satellite}&sec={sector}&p[0]={product}",
    dataRoot: "https://slider.cira.colostate.edu/data/",
    serverPattern: "^rammb-slider\\d+$",
    serverProbe: 16,
    imageryPath: "slider/output/imagery",
    tileTemplates: [
      "{dataRoot}{server}/{imageryPath}/{y}/{m}/{d}/{satellite}---{sector}/{product}/{stamp}/00/000_000.png",
      "https://slider.cira.colostate.edu/data/imagery/{y}/{m}/{d}/{satellite}---{sector}/{product}/{stamp}/00/000_000.png",
      "https://rammb-slider.cira.colostate.edu/data/imagery/{y}/{m}/{d}/{satellite}---{sector}/{product}/{stamp}/00/000_000.png",
      "https://slider.cira.colostate.edu/data/imagery/{y}{m}{d}/{satellite}---{sector}/{product}/{stamp}/00/000_000.png",
      "https://rammb-slider.cira.colostate.edu/data/imagery/{y}{m}{d}/{satellite}---{sector}/{product}/{stamp}/00/000_000.png"
    ],
    templateRecheckHours: 24,
    heroPattern: "geocolou?r|true_?colou?r|natural_?colou?r|rgb_natural|sandwich|day_night_band|^band_02$|^band_13$|^band_03$",
    sectorIntervals: [["^meso", 120], ["conus|pacus|japan|korea|ela|target|regional|local", 300], ["full_disk|hemisphere|disk", 600]],
    defaultHeroInterval: 600,
    channelInterval: 3600,
    api: "https://slider.cira.colostate.edu/data",
    categoryRules: [
      [/^band_|^cira_cloud_free_band|^spm_/i, "Geostationary Channels"],
      [/glm|lightning/i, "Lightning"],
      [/fire|hot_spot/i, "Fires"],
      [/cloud|snow_fog|cvd/i, "Clouds"],
      [/tpw|precipitable|vapor|airmass|water/i, "Atmosphere"],
      [/dust|ash|aerosol|smoke/i, "Aerosols"],
      [/snow|ice|cryo/i, "Cryosphere"],
      [/sst|ocean/i, "Oceans"],
      [/rain|precip/i, "Precipitation"]
    ],
    hosts: { "slider.cira.colostate.edu": 750, "rammb-slider.cira.colostate.edu": 500 },
    sources: [{
        sourceKey: "cira-slider",
        name: "CIRA SLIDER",
        config: { backfillFrames: 48, intervalSeconds: 900, maxSectors: 80, archive: ["slider-goes-19-full-disk-cira-geocolor", "slider-goes-18-full-disk-cira-geocolor", "slider-himawari-full-disk-cira-geocolor"] }
      }],
    intervals: { discover: 21600 }
  },

  nict: {
    base: "https://himawari8.nict.go.jp",
    products: [
      { code: "D531106", productKey: "nict-himawari-true-color", name: "Himawari True Color Full Disk", archive: true },
      { code: "D531107", productKey: "nict-himawari-infrared", name: "Himawari Infrared Full Disk", archive: false }
    ],
    hosts: { "himawari8.nict.go.jp": 1000 },
    sources: [{ sourceKey: "nict-himawari", name: "NICT Himawari Real-Time Web", config: { backfillHours: 6 } }],
    intervals: { latest: 600 }
  },

  rainviewer: {
    api: "https://api.rainviewer.com/public/weather-maps.json",
    defaultTileHost: "https://tilecache.rainviewer.com",
    hosts: { "api.rainviewer.com": 2000, "tilecache.rainviewer.com": 500 },
    sources: [{ sourceKey: "rainviewer-public", name: "RainViewer Public Maps", config: {} }],
    intervals: { maps: 600 }
  },

  solarArchives: {
    roots: {
      sdo: "https://sdo.gsfc.nasa.gov/assets/img/browse/{y}/{m}/{d}/",
      soho: "https://soho.nascom.nasa.gov/data/REPROCESSING/Completed/{y}/{instrument}/{y}{m}{d}/",
      stereo: "https://stereo-ssc.nascom.nasa.gov/browse/{y}/{m}/{d}/ahead/",
      proba2: "https://proba2.sidc.be/swap/data/qlviewer/{y}/{m}/{d}/",
      jsoc: "https://jsoc1.stanford.edu/data/hmi/images/{y}/{m}/{d}/"
    },
    sdoChannels: { "0094": "AIA 94 Å", "0131": "AIA 131 Å", "0171": "AIA 171 Å", "0193": "AIA 193 Å", "0211": "AIA 211 Å", "0304": "AIA 304 Å", "0335": "AIA 335 Å", "1600": "AIA 1600 Å", "1700": "AIA 1700 Å", "4500": "AIA 4500 Å", HMIB: "HMI Magnetogram", HMIBC: "HMI Colorized Magnetogram", HMID: "HMI Dopplergram", HMII: "HMI Intensitygram", HMIIC: "HMI Colorized Intensitygram", HMIIF: "HMI Flattened Intensitygram", "211193171": "AIA 211, 193, 171 Composite", "304211171": "AIA 304, 211, 171 Composite", "094335193": "AIA 94, 335, 193 Composite" },
    jsocTypes: { Ic_flat: "HMI Flattened Continuum", Ic: "HMI Continuum", M: "HMI Magnetogram", M_color: "HMI Colorized Magnetogram", Mmag: "HMI Magnetogram" },
    hosts: { "sdo.gsfc.nasa.gov": 1000, "soho.nascom.nasa.gov": 1000, "stereo-ssc.nascom.nasa.gov": 1000, "proba2.sidc.be": 1500, "jsoc1.stanford.edu": 1500 },
    sources: [
        { sourceKey: "nasa-sdo-browse", name: "NASA SDO Browse Archive", config: { spec: "sdo", targetPx: 1024, archive: ["sdo-0193", "sdo-0304", "sdo-hmiic"] } },
        { sourceKey: "soho-lasco-archive", name: "SOHO LASCO Archive", config: { spec: "soho", targetPx: 1024, instruments: ["c2", "c3"], archive: [] } },
        { sourceKey: "stereo-browse", name: "STEREO Browse Archive", config: { spec: "stereo", targetPx: 1024, archive: [] } },
        { sourceKey: "proba2-swap", name: "PROBA2 SWAP Quicklook", config: { spec: "proba2", archive: [] } },
        { sourceKey: "jsoc-hmi", name: "Stanford JSOC HMI Images", config: { spec: "jsoc", targetPx: 1024, archive: [] } }
      ],
    intervals: { roots: 3600 }
  },

  iswa: {
    api: "https://iswa.ccmc.gsfc.nasa.gov/api",
    maxDataId: 4000,
    scanBatch: 400,
    recentFiles: 24,
    feedIntervalSeconds: 1800,
    activeWithinDays: 14,
    imagePattern: "\\.(png|jpe?g|gif|webp)$",
    regionCategories: { solar: "Solar Imagery", heliosphere: "Space Weather Model", "inner heliosphere": "Space Weather Model", magnetosphere: "Space Weather Model", ionosphere: "Ionosphere and Geospace", thermosphere: "Ionosphere and Geospace", "radiation belts": "Space Weather Imagery" },
    hosts: { "iswa.ccmc.gsfc.nasa.gov": 250, "iswa.gsfc.nasa.gov": 250 },
    sources: [{ sourceKey: "nasa-ccmc-iswa", name: "NASA CCMC ISWA", config: {} }],
    intervals: { scan: 900 }
  },

  frontier: {
    seeds: [
      "https://cdn.star.nesdis.noaa.gov/",
      "https://services.swpc.noaa.gov/images/",
      "https://sdo.gsfc.nasa.gov/assets/img/browse/",
      "https://soho.nascom.nasa.gov/data/REPROCESSING/Completed/",
      "https://soho.nascom.nasa.gov/data/realtime/",
      "https://stereo-ssc.nascom.nasa.gov/browse/",
      "https://proba2.sidc.be/swap/data/qlviewer/",
      "https://jsoc1.stanford.edu/data/hmi/images/",
      "https://www.ssd.noaa.gov/PS/TROP/",
      "https://tropic.ssec.wisc.edu/real-time/",
      "https://www.ospo.noaa.gov/Products/",
      "https://mag.ncep.noaa.gov/data/",
      "https://data.ngdc.noaa.gov/platforms/solar-space-observing-satellites/goes/",
      "https://gong2.nso.edu/HA/haf/",
      "https://soleil.i4ds.ch/solarradio/data/2002-20yy_Callisto/",
      "https://earth-search.aws.element84.com/v1",
      "https://landsatlook.usgs.gov/stac-server",
      "https://sohowww.nascom.nasa.gov/data/realtime-images.html",
      "https://umbra.nascom.nasa.gov/images/latest.html"
    ],
    allow: ["noaa.gov", "nasa.gov", "colostate.edu", "stanford.edu", "sidc.be", "eumetsat.int", "esa.int", "nict.go.jp", "jma.go.jp", "wisc.edu", "nso.edu", "i4ds.ch", "usgs.gov", "element84.com", "weather.gc.ca", "dwd.de", "bom.gov.au", "metoffice.gov.uk", "meteofrance.com", "kma.go.kr", "ucar.edu", "nsidc.org", "copernicus.eu"],
    deny: ["/rammb-slider\\d+/", "s3\\.amazonaws\\.com/\\?", "/(GOES16|GOES17)/", "/iswa_data_tree/", "/(about|mission|team|contact|news|people|staff|history|education|outreach|press|events|jobs|careers|policy|privacy|accessibility|foia|operations|prelaunch|sitemap|search|login|account|gallery/(firstlight|ultrahd|copyright|print))(/|\\.|$)"],
    htmlFollow: "/(data|images?|img|imagery|browse|archive|realtime|real-time|latest|products?|movies|quicklook|ql|synoptic|level\\d|l[0-9][a-z]?|daily|hourly|\\d{4})(/|$)",
    leadIgnoreHosts: ["twitter.com", "x.com", "facebook.com", "instagram.com", "linkedin.com", "youtube.com", "youtu.be", "flickr.com", "pinterest.com", "reddit.com", "tumblr.com", "bsky.app", "threads.net", "tiktok.com", "constantcontactpages.com", "space.com", "hindustantimes.com", "spaceweather.com", "wikipedia.org", "nasaprs.com"],
    maxDepth: 10,
    maxNodes: 50000,
    dateWindow: 3,
    indexDays: 3650,
    minRevisitSeconds: 600,
    maxRevisitSeconds: 86400
  },

  interpreters: [
    { match: "^https://cdn\\.star\\.nesdis\\.noaa\\.gov/", adapter: "starCdn", spec: "goes", skip: "^(thumbnails?|archive|old|test|tmp|DATA)$" },
    { match: "^https://sdo\\.gsfc\\.nasa\\.gov/assets/img/browse/", adapter: "solarArchives", spec: "sdo" },
    { match: "^https://soho\\.nascom\\.nasa\\.gov/data/REPROCESSING/", adapter: "solarArchives", spec: "soho" },
    { match: "^https://stereo-ssc\\.nascom\\.nasa\\.gov/browse/", adapter: "solarArchives", spec: "stereo" },
    { match: "^https://proba2\\.sidc\\.be/swap/data/qlviewer/", adapter: "solarArchives", spec: "proba2" },
    { match: "^https://jsoc1\\.stanford\\.edu/data/hmi/images/", adapter: "solarArchives", spec: "jsoc" }
  ]
};

const starCdn = (() => {
  const S = SETTINGS.starCdn;



  const labelSatellite = (value) => {
    const match = String(value).match(/^GOES(\d{2})$/i);
    return match ? `GOES-${match[1]}` : titleCase(value);
  };

  const labelBand = (value) => {
    if (S.bands[value]) return S.bands[value];
    if (/^\d{1,2}$/.test(value)) return `Band ${parseInt(value, 10)}`;
    return titleCase(value);
  };

  const parseVariant = (name) => {
    const match = name.match(/-(\d+)x(\d+)\.(jpe?g|png)$/i);
    return match ? { width: parseInt(match[1], 10), height: parseInt(match[2], 10) } : null;
  };

  const variantRank = (variant, targetPx) => {
    if (!variant) return 0;
    const largest = Math.max(variant.width, variant.height);
    return largest <= targetPx ? largest : targetPx - largest;
  };

  const crawlSpec = (config) => ({
    format: "autoindex",
    roots: (config.satellites || ["GOES19", "GOES18"]).flatMap((satellite) => (config.instruments || ["ABI", "GLM"]).map((instrument) => `${S.root}/${satellite}/${instrument}/`)),
    maxDepth: 6,
    maxNodes: config.maxNodes || 1500,
    revisit: { minSeconds: 180, maxSeconds: 3600 },
    maxArchivePerVisit: 48,
    follow: (entry) => !/^(thumbnails?|archive|old|test|tmp|DATA)$/i.test(entry.name),
    classify: (entry) => {
      if (!IMAGE_EXTENSIONS.test(entry.name) || /latest|thumbnail/i.test(entry.name)) return null;
      const observedAt = parseTimestamp(entry.name, ["star-julian"]);
      if (!observedAt) return null;
      const segments = entry.segments.slice(0, -1);
      if (segments.length < 3) return null;
      const [satellite, instrument, ...rest] = segments;
      const band = rest[rest.length - 1];
      const sectorParts = rest.slice(0, -1).filter((part) => !/^(SECTOR|MESO)$/i.test(part));
      const sectorLabel = sectorParts.map((part) => S.sectors[part] || titleCase(part)).join(" ") || "Imagery";
      const productKey = `star-${slug([satellite, instrument, ...sectorParts, band].join("-"))}`;
      const variant = parseVariant(entry.name);
      const archive = (config.archive || []).includes(productKey);
      return {
        rank: variantRank(variant, config.targetPx || 2048),
        product: {
          productKey,
          name: `${labelSatellite(satellite)} ${instrument.toUpperCase()} ${sectorLabel} ${labelBand(band)}`,
          category: "Geostationary Imagery",
          kind: "image",
          mode: archive ? "archive" : "index",
          metadata: { provider: "NOAA NESDIS STAR", satellite: labelSatellite(satellite), instrument, sector: sectorLabel, band: labelBand(band), directory: entry.url.slice(0, entry.url.lastIndexOf("/") + 1) }
        },
        frame: {
          observedAt,
          originUrl: entry.url,
          byteSize: entry.size,
          mimeType: /\.png$/i.test(entry.name) ? "image/png" : "image/jpeg",
          width: variant ? variant.width : null,
          height: variant ? variant.height : null
        }
      };
    }
  });

  return {
    key: "star-cdn",
    domain: SETTINGS.domain,
    hosts: S.hosts,
    sources: S.sources,
    schedules: (source) => [{ scheduleKey: `${source.sourceKey}:roots`, jobType: "crawl-roots", payload: { specKey: "goes" }, intervalSeconds: S.intervals.roots }],
    crawlSpecs: { goes: crawlSpec },
    handlers: {}
  };
})();

const swpc = (() => {
  const S = SETTINGS.swpc;



  const nameFor = (stem) => {
    if (S.names[stem]) return S.names[stem];
    const suvi = stem.match(/^suvi-(primary|secondary)-(\w+)$/);
    if (suvi) return `SUVI ${suvi[1] === "primary" ? "Primary" : "Secondary"} ${/^\d+$/.test(suvi[2]) ? `${parseInt(suvi[2], 10)} Å` : titleCase(suvi[2])}`;
    return titleCase(stem.replace(/[-_]/g, " "));
  };

  const categoryFor = (stem) => (S.categories.find(([pattern]) => pattern.test(stem)) || [null, "Space Weather Imagery"])[1];

  const entryUrl = (item) => {
    if (!item) return null;
    if (typeof item === "string") return item;
    return item.url || item.image || item.href || null;
  };

  const entryTime = (item, url) => {
    if (item && typeof item === "object") {
      const direct = parseAnyDate(item.time_tag || item.timeTag || item.time || item.date);
      if (direct) return direct;
    }
    return parseTimestamp(url);
  };

  return {
    key: "swpc",
    domain: SETTINGS.domain,
    hosts: S.hosts,
    sources: S.sources,
    schedules: (source) => [{ scheduleKey: `${source.sourceKey}:index`, jobType: "swpc:index", intervalSeconds: S.intervals.index }],
    handlers: {
      index: async (job, context) => {
        const listing = await context.http.text(S.index);
        const entries = parseAutoindex(listing.text, S.index);
        const jsonFiles = entries.filter((entry) => !entry.isDir && entry.name.endsWith(".json")).map((entry) => entry.url);
        for (const dir of entries.filter((entry) => entry.isDir).slice(0, 40)) {
          const sub = await context.http.text(dir.url);
          for (const entry of parseAutoindex(sub.text, dir.url)) if (!entry.isDir && entry.name.endsWith(".json")) jsonFiles.push(entry.url);
        }
        await context.queue.enqueue(jsonFiles.map((url) => ({
          dedupeKey: `swpc:product:${url}`,
          jobType: "swpc:product",
          sourceKey: context.sourceKey,
          priority: 4,
          payload: { url }
        })), { onConflict: "keep" });
        return { summary: { products: jsonFiles.length } };
      },
      product: async (job, context) => {
        const { url } = job.payload;
        const stem = url.split("/").pop().replace(/\.json$/, "");
        const result = await context.http.json(url);
        const items = Array.isArray(result.data) ? result.data : [];
        const productKey = `swpc-${slug(stem)}`;
        const archive = (context.config.archive || []).includes(stem);
        const product = {
          productKey,
          name: nameFor(stem),
          category: categoryFor(stem),
          kind: "image",
          mode: archive ? "archive" : "index",
          metadata: { provider: "NOAA SWPC", manifest: url, rollingWindow: true }
        };
        const candidates = [];
        for (const item of items) {
          const path = entryUrl(item);
          if (!path || !/\.(png|jpe?g|gif)$/i.test(path)) continue;
          const absolute = new URL(path, S.base).toString();
          const observedAt = entryTime(item, absolute);
          if (!observedAt) continue;
          candidates.push({ product, frame: { observedAt, originUrl: absolute } });
        }
        const summary = await context.ingest(candidates, { maxArchivePerVisit: 400 });
        return { summary };
      }
    }
  };
})();

const noaaBuckets = (() => {
  const S = SETTINGS.noaaBuckets;


  const inWindow = (segments, lookbackHours) => {
    const range = pathTimeRange(segments);
    if (!range) return true;
    const now = Date.now();
    return range.end.getTime() >= now - lookbackHours * 3600000 && range.start.getTime() <= now + 3600000;
  };

  const goesClassify = (satellite, config) => (entry) => {
    const match = entry.name.match(/^OR_(ABI|SUVI|GLM|EXIS|SEIS|MAG)-(L1b|L2)-([A-Za-z0-9]+?)(F|C|M1|M2|M)?(?:-M(\d)(?:C(\d{2}))?)?_G(\d{2})_/);
    if (!match) return null;
    const observedAt = parseTimestamp(entry.name, ["goes-scan"]);
    if (!observedAt) return null;
    const [, instrument, level, family, sector, , channel] = match;
    const channelPart = channel ? `c${channel}` : "";
    const productKey = `${satellite}-${slug([instrument, level, family + (sector || ""), channelPart].filter(Boolean).join("-"))}`;
    const label = `${titleCase(satellite.replace("goes", "GOES-"))} ${instrument} ${level.toUpperCase()} ${family}${sector ? ` ${S.sectorLabels[sector] || sector}` : ""}${channel ? ` Band ${parseInt(channel, 10)}` : ""}`;
    const candidate = {
      product: {
        productKey,
        name: label.replace(/Goes-/i, "GOES-"),
        category: "Raw Satellite Data",
        kind: "raw",
        mode: "index",
        metadata: { provider: "NOAA Open Data Dissemination", bucket: config.bucket, instrument, level, family, sector: sector || null, channel: channel ? parseInt(channel, 10) : null }
      },
      frame: { observedAt, originUrl: entry.url, byteSize: entry.size, mimeType: "application/x-netcdf" }
    };
    const band = channel ? parseInt(channel, 10) : null;
    const renderable = instrument === "ABI" && level === "L2" && family === "CMIP" && band && (config.render || []).some((rule) => rule.sector === (sector || "") && rule.band === band);
    if (renderable && (entry.size || 0) <= (config.maxRenderBytes || 64 * 1024 * 1024)) {
      candidate.process = {
        processor: "goes-cmi",
        sourceUrl: entry.url,
        options: { band },
        targetProduct: {
          productKey: `${satellite}-render-${slug(`${sector || "x"}-c${channel}`)}`,
          name: `${label.replace(/Goes-/i, "GOES-").replace(/ ABI L2 CMIP/, " ABI")} (DinoSat Render)`,
          category: "Geostationary Imagery",
          kind: "image",
          mode: "archive",
          metadata: { provider: "DinoSat Renderer", source: productKey, band }
        }
      };
    }
    return candidate;
  };

  const himawariClassify = (config) => (entry) => {
    const match = entry.name.match(/^HS_(H\d{2})_\d{8}_\d{4}_B(\d{2})_(FLDK|JP\d{2}|R\d{3})_R(\d{2})_S(\d{2})(\d{2})/);
    if (!match) return null;
    const observedAt = parseTimestamp(entry.name, ["ymd-hms"]);
    if (!observedAt) return null;
    const [, satelliteCode, band, area, , segment, total] = match;
    const satellite = `himawari${parseInt(satelliteCode.slice(1), 10)}`;
    return {
      product: {
        productKey: `${satellite}-ahi-l1b-${slug(area)}-b${band}`,
        name: `Himawari-${parseInt(satelliteCode.slice(1), 10)} AHI L1B ${area === "FLDK" ? "Full Disk" : area} Band ${parseInt(band, 10)}`,
        category: "Raw Satellite Data",
        kind: "raw",
        mode: "index",
        metadata: { provider: "JMA via NOAA Open Data Dissemination", bucket: config.bucket, band: parseInt(band, 10), area }
      },
      frame: { observedAt, originUrl: entry.url, byteSize: entry.size, mimeType: "application/octet-stream", metadata: { files: [`S${segment}${total}`] } }
    };
  };

  const gk2aClassify = (config) => (entry) => {
    const match = entry.name.match(/^gk2a_ami_(le\d\w?)_([a-z]{2}\d{3})_([a-z]{2})(\d{3})(ge|lc)_(\d{12})/i);
    if (!match) return null;
    const observedAt = parseTimestamp(entry.name, ["ymdhm"]);
    if (!observedAt) return null;
    const [, level, channel, area] = match;
    return {
      product: {
        productKey: `gk2a-ami-${slug(level)}-${slug(area)}-${slug(channel)}`,
        name: `GK2A AMI ${level.toUpperCase()} ${area.toUpperCase() === "FD" ? "Full Disk" : area.toUpperCase()} ${channel.toUpperCase()}`,
        category: "Raw Satellite Data",
        kind: "raw",
        mode: "index",
        metadata: { provider: "KMA via NOAA Open Data Dissemination", bucket: config.bucket, channel: channel.toUpperCase(), area: area.toUpperCase() }
      },
      frame: { observedAt, originUrl: entry.url, byteSize: entry.size, mimeType: "application/x-netcdf" }
    };
  };

  const bucketSpec = (classifierFor) => (config, source) => ({
    format: "s3",
    roots: [s3NodeUrl(config.bucket, "")],
    maxDepth: 7,
    maxNodes: config.maxNodes || 800,
    pagesPerVisit: 4,
    revisit: { minSeconds: 300, maxSeconds: 7200 },
    maxArchivePerVisit: 0,
    maxProcessPerVisit: 6,
    follow: (entry, depth) => {
      if (depth === 1) return (config.families || []).some((pattern) => new RegExp(pattern).test(entry.name));
      return inWindow(entry.segments || [], config.lookbackHours || 3);
    },
    classify: classifierFor(config, source)
  });


  const CLASSIFIERS = {
    goes19: (config) => goesClassify("goes19", config),
    goes18: (config) => goesClassify("goes18", config),
    himawari: (config) => himawariClassify(config),
    gk2a: (config) => gk2aClassify(config)
  };

  const crawlSpecs = {};
  for (const source of S.sources) crawlSpecs[source.sourceKey] = bucketSpec(CLASSIFIERS[source.classifier]);

  return {
    key: "noaa-open-data",
    domain: SETTINGS.domain,
    hosts: S.hosts,
    sources: S.sources.map((source) => ({ sourceKey: source.sourceKey, name: source.name, config: source.config })),
    schedules: (source) => [{ scheduleKey: `${source.sourceKey}:roots`, jobType: "crawl-roots", payload: { specKey: source.sourceKey }, intervalSeconds: S.intervals.roots }],
    crawlSpecs,
    handlers: {},
    classifiers: { goesClassify, himawariClassify, gk2aClassify, inWindow }
  };
})();

const gibs = (() => {
  const S = SETTINGS.gibs;


  const categoryFor = (identifier) => (S.categoryRules.find(([pattern]) => pattern.test(identifier)) || [null, "Earth Observation"])[1];

  const snapshotUrl = (projection, identifier, date, format) => {
    const bbox = projection === "epsg4326" ? "-90,-180,90,180" : "-20037508.34,-20037508.34,20037508.34,20037508.34";
    const crs = projection === "epsg4326" ? "EPSG:4326" : "EPSG:3857";
    const [width, height] = projection === "epsg4326" ? [1024, 512] : [1024, 1024];
    const params = new URLSearchParams({ SERVICE: "WMS", REQUEST: "GetMap", VERSION: "1.3.0", LAYERS: identifier, CRS: crs, BBOX: bbox, WIDTH: String(width), HEIGHT: String(height), FORMAT: format && format.includes("png") ? "image/png" : "image/jpeg", TIME: date });
    return `${fill(S.wms, { projection })}?${params.toString()}`;
  };

  return {
    key: "gibs",
    domain: SETTINGS.domain,
    hosts: S.hosts,
    sources: S.sources,
    schedules: (source) => [{ scheduleKey: `${source.sourceKey}:capabilities`, jobType: "gibs:capabilities", intervalSeconds: S.intervals.capabilities }],
    handlers: {
      history: async (job, context) => {
        const row = await context.store.getProduct(job.payload.productKey);
        const meta = (row && row.metadata) || {};
        if (!meta.identifier || !meta.projection) return { summary: { skipped: "The product does not carry a GIBS layer identifier." } };
        const window = historyDays(job.payload, 30);
        const definition = { productKey: row.product_key, name: row.name, category: row.category, kind: row.kind, mode: "index", metadata: meta };
        const candidates = window.days.map((day) => ({
          product: definition,
          frame: { observedAt: day.date, originUrl: snapshotUrl(meta.projection, meta.identifier, day.iso, (meta.formats || [])[0] || "image/jpeg"), mimeType: (meta.formats || [])[0] && meta.formats[0].includes("png") ? "image/png" : "image/jpeg" }
        }));
        const summary = await context.ingest(candidates, { maxArchivePerVisit: 0 });
        return { summary, ...historyContinuation(job, window.nextTo) };
      },
      capabilities: async (job, context) => {
        let total = 0;
        for (const projection of context.config.projections || ["epsg4326"]) {
          const url = fill(S.wmts, { projection });
          let pending = [];
          const flush = async () => {
            if (!pending.length) return;
            const batch = pending;
            pending = [];
            await context.ingest(batch, { maxArchivePerVisit: 20 });
          };
          let flushChain = Promise.resolve();
          const scanner = createLeafScanner("Layer", (section) => {
            const identifier = tagText(section, "Identifier");
            if (!identifier) return;
            const title = tagText(section, "Title") || titleCase(identifier);
            const formats = tagTexts(section, "Format");
            const defaultTime = tagText(section, "Default");
            const periods = tagTexts(section, "Value").filter((value) => value.includes("/")).slice(-24);
            const resource = (section.match(/<ResourceURL[^>]*>/) || [""])[0];
            const tileMatrixSets = Array.from(new Set(tagTexts(section, "TileMatrixSet"))).slice(0, 8);
            const productKey = `gibs-${projection}-${slug(identifier)}`;
            const observedAt = parseAnyDate(defaultTime);
            const metadata = {
              provider: "NASA GIBS",
              projection,
              identifier,
              formats,
              template: attrValue(resource, "template"),
              tileMatrixSets,
              timeDefault: defaultTime,
              timePeriods: periods,
              deprecation: /SNPP|Suomi/i.test(identifier) ? S.snppNotice : null
            };
            const product = {
              productKey,
              name: title,
              category: categoryFor(identifier),
              kind: "tiled",
              mode: (context.config.archive || []).includes(identifier) ? "archive" : "index",
              metadata
            };
            const wanted = context.config.backfillFrames || S.backfillFrames;
            const times = [];
            for (let i = periods.length - 1; i >= 0 && times.length < wanted; i -= 1) times.unshift(...expandPeriod(periods[i], wanted - times.length));
            if (defaultTime && !times.includes(defaultTime)) times.push(defaultTime);
            const frames = times.map((time) => ({ time, observedAt: parseAnyDate(time) })).filter((item) => item.observedAt);
            if (frames.length) {
              for (const item of frames) pending.push({ product, frame: { observedAt: item.observedAt, originUrl: snapshotUrl(projection, identifier, item.time, formats[0]) } });
            } else if (!observedAt) {
              pending.push({ product: { ...product, metadata: { ...metadata, static: true, snapshot: snapshotUrl(projection, identifier, "default", formats[0]).replace("&TIME=default", "") } } });
            }
            total += 1;
            if (pending.length >= 200) flushChain = flushChain.then(flush).then(() => new Promise((resolve) => setImmediate(resolve)));
          }, 256 * 1024);
          await context.http.stream(url, (text) => scanner.push(text), { accept: "application/xml" });
          scanner.end();
          await flushChain;
          await flush();
        }
        return { summary: { layers: total } };
      }
    }
  };
})();

const eumetview = (() => {
  const S = SETTINGS.eumetview;

  const baseOf = (config) => (config.base || S.defaultBase).replace(/\/$/, "");

  const capabilitiesUrl = (config) => config.capabilities || `${baseOf(config)}/${S.capabilitiesPath}`;

  const mapEndpoint = (config) => config.map || `${baseOf(config)}/wms`;


  const categoryFor = (name) => (S.categoryRules.find(([pattern]) => pattern.test(name)) || [null, "Earth Observation"])[1];

  const parseLayer = (section) => {
    const name = tagText(section, "Name");
    if (!name) return null;
    const bbox = {
      west: parseFloat(tagText(section, "westBoundLongitude")),
      east: parseFloat(tagText(section, "eastBoundLongitude")),
      south: parseFloat(tagText(section, "southBoundLatitude")),
      north: parseFloat(tagText(section, "northBoundLatitude"))
    };
    const dimension = (section.match(/<Dimension\b[^>]*name="time"[^>]*>([\s\S]*?)<\/Dimension>/i) || section.match(/<Dimension\b[^>]*name="time"[^>]*\/>/i) || [null]);
    const dimensionTag = dimension[0] ? dimension[0].match(/<Dimension\b[^>]*>/i)[0] : "";
    const values = dimension[1] ? dimension[1].split(",").map((value) => value.trim()).filter(Boolean) : [];
    return {
      name,
      title: tagText(section, "Title") || titleCase(name.split(":").pop()),
      bbox: Object.values(bbox).every(Number.isFinite) ? bbox : null,
      defaultTime: attrValue(dimensionTag, "default"),
      times: values.filter((value) => !value.includes("/")).slice(-48),
      ranges: values.filter((value) => value.includes("/")).slice(-4)
    };
  };

  const mapUrl = (layer, time, config = {}) => {
    const bbox = layer.bbox || { west: -80, east: 80, south: -80, north: 80 };
    const width = 1024;
    const height = Math.max(256, Math.min(1024, Math.round(width * (bbox.north - bbox.south) / Math.max(1, bbox.east - bbox.west))));
    const params = new URLSearchParams({
      service: "WMS",
      version: "1.3.0",
      request: "GetMap",
      layers: layer.name,
      styles: "",
      crs: "EPSG:4326",
      bbox: `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`,
      width: String(width),
      height: String(height),
      format: "image/png"
    });
    if (time) params.set("time", time);
    const endpoint = mapEndpoint(config);
    return `${endpoint}${endpoint.includes("?") ? "&" : "?"}${params.toString()}`;
  };

  const isArchived = (config, name) => (config.archive || []).some((pattern) => new RegExp(pattern, "i").test(name));

  const forecastPattern = new RegExp(S.forecastPattern, "i");

  const isForecast = (text) => forecastPattern.test(String(text || "").replace(/[_:.-]+/g, " "));

  const retireForecasts = async (context) => {
    let retired = 0;
    for (const product of await context.store.listProducts({ sourceKey: context.sourceKey })) {
      const future = product.last_frame_at && new Date(product.last_frame_at).getTime() > Date.now() + S.maxFutureMinutes * 60000;
      if (Number(product.frame_count) > 0 && (future || isForecast(`${(product.metadata && product.metadata.layer) || ""} ${product.name}`))) {
        retired += await context.store.pruneForeignFrames(product.product_key, "none:");
      }
    }
    return retired;
  };

  const candidatesFor = (layer, config) => {
    if (isForecast(`${layer.name} ${layer.title}`)) return [];
    const archived = isArchived(config, layer.name);
    const product = {
      productKey: `${config.prefix || "eumetview"}-${slug(layer.name)}`,
      name: layer.title,
      category: categoryFor(layer.name),
      kind: "image",
      mode: archived ? "archive" : "index",
      metadata: { provider: config.provider || "EUMETSAT EUMETView", layer: layer.name, bbox: layer.bbox, timeRanges: layer.ranges, wms: mapEndpoint(config) }
    };
    const wanted = config.backfillFrames || 12;
    const expanded = [];
    for (let i = layer.ranges.length - 1; i >= 0 && expanded.length < wanted; i -= 1) expanded.unshift(...expandPeriod(layer.ranges[i], wanted - expanded.length));
    const times = Array.from(new Set([...layer.times, ...expanded, layer.defaultTime].filter(Boolean))).sort((a, b) => (parseAnyDate(a) || 0) - (parseAnyDate(b) || 0)).slice(-wanted);
    const candidates = [];
    const horizon = Date.now() + S.maxFutureMinutes * 60000;
    for (const time of times) {
      const observedAt = parseAnyDate(time);
      if (observedAt && observedAt.getTime() <= horizon) candidates.push({ product, frame: { observedAt, originUrl: mapUrl(layer, time, config), mimeType: "image/png" } });
    }
    if (!candidates.length) candidates.push({ product: { ...product, metadata: { ...product.metadata, static: true, snapshot: mapUrl(layer, null, config) } } });
    return candidates;
  };

  const scanCapabilities = async (context, url, onLayer) => {
    const scanner = createLeafScanner("Layer", (section) => {
      const layer = parseLayer(section);
      if (layer) onLayer(layer);
    }, 512 * 1024);
    await context.http.stream(url, (text) => scanner.push(text), { accept: "application/xml" });
    return scanner.end();
  };

  return {
    key: "eumetview",
    domain: SETTINGS.domain,
    hosts: S.hosts,
    sources: S.sources,
    schedules: (source) => [
      { scheduleKey: `${source.sourceKey}:capabilities`, jobType: "eumetview:capabilities", intervalSeconds: S.intervals.capabilities },
      { scheduleKey: `${source.sourceKey}:recent`, jobType: "eumetview:recent", intervalSeconds: S.intervals.recent }
    ],
    startupJobs: () => [{ jobType: "eumetview:retire", payload: {} }, { jobType: "eumetview:capabilities", payload: {} }],
    handlers: {
      retire: async (job, context) => ({ summary: { retired: await retireForecasts(context) } }),
      capabilities: async (job, context) => {
        let pending = [];
        let layers = 0;
        const flushes = [];
        const workspaces = new Set();
        const collect = (workspace) => (layer) => {
          const named = workspace && !layer.name.includes(":") ? { ...layer, name: `${workspace}:${layer.name}` } : layer;
          if (named.name.includes(":")) workspaces.add(named.name.split(":")[0]);
          layers += 1;
          pending.push(...candidatesFor(named, context.config));
          if (pending.length >= 200) {
            const batch = pending;
            pending = [];
            flushes.push(context.ingest(batch, { maxArchivePerVisit: 24 }));
          }
        };
        const cursorKey = `eumetview:workspaces:${context.sourceKey}`;
        let degraded = false;
        try {
          await scanCapabilities(context, capabilitiesUrl(context.config), collect(null));
        } catch (error) {
          const retryable = !(error instanceof HttpStatusError) || error.status >= 500;
          const known = (await context.cursors.get(cursorKey)) || {};
          const fallback = Array.from(new Set([...(context.config.workspaces || []), ...(known.workspaces || [])]));
          if (!retryable || !fallback.length || context.config.capabilities) throw error;
          degraded = true;
          let scanned = 0;
          for (const workspace of fallback) {
            await context.heartbeat();
            try {
              await scanCapabilities(context, `${baseOf(context.config)}/${workspace}/${S.capabilitiesPath}`, collect(workspace));
              scanned += 1;
            } catch (workspaceError) {
              if (workspaceError instanceof HttpStatusError && workspaceError.status < 500) continue;
            }
          }
          if (!scanned) throw error;
        }
        await Promise.all(flushes);
        if (pending.length) await context.ingest(pending, { maxArchivePerVisit: 24 });
        if (!degraded && workspaces.size) await context.cursors.set(cursorKey, { workspaces: Array.from(workspaces).sort(), updatedAt: new Date().toISOString() });
        return { summary: { layers, degraded, workspaces: workspaces.size, retired: await retireForecasts(context) } };
      },
      recent: async (job, context) => {
        if (context.config.geoserver === false) return { summary: { layers: 0, fetchQueued: 0 } };
        const archived = await context.store.listProducts({ sourceKey: context.sourceKey, mode: "archive" });
        let fetchQueued = 0;
        let attempted = 0;
        let unavailable = 0;
        let lastError = null;
        for (const product of archived) {
          const layerName = product.metadata && product.metadata.layer;
          if (!layerName || !layerName.includes(":")) continue;
          const [workspace, name] = layerName.split(":");
          const candidates = [];
          attempted += 1;
          try {
            await scanCapabilities(context, `${baseOf(context.config)}/${workspace}/${name}/${S.capabilitiesPath}`, (layer) => {
              if (layer.name === layerName || layer.name === name) candidates.push(...candidatesFor({ ...layer, name: layerName }, { ...context.config, archive: [".*"] }));
            });
          } catch (error) {
            if (error instanceof HttpStatusError && error.status < 500) throw error;
            unavailable += 1;
            lastError = error;
            continue;
          }
          const summary = await context.ingest(candidates, { maxArchivePerVisit: 24 });
          fetchQueued += summary.fetchQueued;
        }
        if (attempted && unavailable === attempted) throw lastError;
        return { summary: { layers: archived.length, unavailable, fetchQueued } };
      }
    },
    helpers: { parseLayer, mapUrl, candidatesFor }
  };
})();

const helioviewer = (() => {
  const S = SETTINGS.helioviewer;

  const imageScaleFor = (path) => {
    const joined = path.join(" ").toUpperCase();
    if (/LASCO.*C3/.test(joined)) return 56;
    if (/LASCO.*C2/.test(joined)) return 11.5;
    if (/COR2/.test(joined)) return 28;
    if (/COR1/.test(joined)) return 7.5;
    if (/CCOR/.test(joined)) return 24;
    return 2.42;
  };

  const collectSources = (node, path, out) => {
    if (!node || typeof node !== "object") return;
    if (Number.isFinite(node.sourceId)) {
      out.push({ ...node, path });
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      if (child && typeof child === "object") collectSources(child, [...path, key], out);
    }
  };

  const layerPath = (path) => {
    if (path.length >= 4) return path.slice(0, 4);
    if (path.length === 3) return [path[0], path[1], path[1], path[2]];
    return path;
  };

  const screenshotUrl = (source, date) => {
    const params = new URLSearchParams({
      date: date.toISOString().replace(/\.\d{3}Z$/, "Z"),
      imageScale: String(imageScaleFor(source.path)),
      layers: `[${layerPath(source.path).join(",")},1,100]`,
      x0: "0",
      y0: "0",
      width: "1024",
      height: "1024",
      display: "true",
      watermark: "false"
    });
    return `${S.api}/takeScreenshot/?${params.toString()}`;
  };

  return {
    key: "helioviewer",
    domain: SETTINGS.domain,
    hosts: S.hosts,
    sources: S.sources,
    schedules: (source) => [
      { scheduleKey: `${source.sourceKey}:sources`, jobType: "helioviewer:sources", intervalSeconds: S.intervals.sources },
      { scheduleKey: `${source.sourceKey}:status`, jobType: "helioviewer:status", intervalSeconds: S.intervals.status }
    ],
    handlers: {
      sources: async (job, context) => {
        const result = await context.http.json(`${S.api}/getDataSources/?verbose=true`);
        const sources = [];
        collectSources(result.data, [], sources);
        const candidates = [];
        const backfillHours = context.config.backfillHours || 24;
        for (const source of sources) {
          const latest = parseAnyDate(source.end);
          if (!latest) continue;
          const archived = (context.config.archive || []).includes(source.sourceId);
          const product = {
            productKey: `helioviewer-${source.sourceId}-${slug(source.nickname || source.path.join(" "))}`,
            name: source.nickname || source.path.join(" "),
            category: "Solar Imagery",
            kind: "image",
            mode: archived ? "archive" : "index",
            metadata: { provider: "Helioviewer", sourceId: source.sourceId, path: source.path, layer: layerPath(source.path), start: source.start, end: source.end, imageScale: imageScaleFor(source.path) }
          };
          const stale = Date.now() - latest.getTime() > 7 * 86400000;
          const hours = stale ? 1 : backfillHours;
          const anchor = new Date(Math.floor(latest.getTime() / 3600000) * 3600000);
          for (let h = 0; h < hours; h += 1) {
            const date = h === 0 ? latest : new Date(anchor.getTime() - (h - 1) * 3600000);
            candidates.push({ product, frame: { observedAt: date, originUrl: screenshotUrl(source, date), mimeType: "image/png", metadata: { approximate: h > 0 } } });
          }
        }
        const summary = await context.ingest(candidates, { maxArchivePerVisit: 48 });
        return { summary: { ...summary, sources: sources.length } };
      },
      status: async (job, context) => {
        const result = await context.http.json(`${S.api}/getStatus/`);
        await context.cursors.set("helioviewer:status", { checkedAt: new Date().toISOString(), instruments: result.data || {} });
        const lagging = Object.entries(result.data || {}).filter(([, info]) => info && Number(info.secondsBehind) > 6 * 3600).map(([name]) => name);
        if (lagging.length) await context.events.warn(`Helioviewer data is more than six hours behind for ${lagging.slice(0, 6).join(", ")}.`, { sourceKey: context.sourceKey });
        return { summary: { lagging: lagging.length } };
      }
    },
    helpers: { collectSources, screenshotUrl, imageScaleFor, layerPath }
  };
})();

const epic = (() => {
  const S = SETTINGS.epic;


  const candidatesFor = (collection, items, config) => {
    const product = {
      productKey: `epic-${collection}`,
      name: S.collectionNames[collection] || `DSCOVR EPIC ${collection}`,
      category: "Deep Space Earth Imagery",
      kind: "image",
      mode: (config.archive || []).includes(collection) ? "archive" : "index",
      policy: { indexDays: null },
      metadata: { provider: "NASA EPIC", collection }
    };
    const candidates = [];
    for (const item of Array.isArray(items) ? items : []) {
      const observedAt = parseAnyDate(item.date);
      if (!observedAt || !item.image) continue;
      const y = observedAt.getUTCFullYear();
      const m = String(observedAt.getUTCMonth() + 1).padStart(2, "0");
      const d = String(observedAt.getUTCDate()).padStart(2, "0");
      const root = `${S.base}/archive/${collection}/${y}/${m}/${d}`;
      candidates.push({
        product,
        frame: {
          observedAt,
          originUrl: `${root}/jpg/${item.image}.jpg`,
          mimeType: "image/jpeg",
          metadata: { png: `${root}/png/${item.image}.png`, thumb: `${root}/thumbs/${item.image}.jpg`, centroid: item.centroid_coordinates || null, caption: item.caption || null }
        }
      });
    }
    return candidates;
  };

  return {
    key: "epic",
    domain: SETTINGS.domain,
    hosts: S.hosts,
    sources: S.sources,
    schedules: (source) => [
      { scheduleKey: `${source.sourceKey}:latest`, jobType: "epic:latest", intervalSeconds: S.intervals.latest },
      { scheduleKey: `${source.sourceKey}:catalog`, jobType: "epic:catalog", intervalSeconds: S.intervals.catalog }
    ],
    handlers: {
      latest: async (job, context) => {
        const summaries = {};
        for (const collection of context.config.collections || ["natural"]) {
          const result = await context.http.json(`${S.base}/api/${collection}`);
          const candidates = candidatesFor(collection, result.data, context.config);
          summaries[collection] = await context.ingest(candidates);
          const newest = candidates.reduce((max, candidate) => Math.max(max, candidate.frame.observedAt.getTime()), 0);
          if (!newest || Date.now() - newest > 3 * 86400000) {
            const since = newest ? new Date(newest).toISOString().slice(0, 10) : "an unknown date";
            await context.events.warn(`EPIC ${collection} imagery is delayed because the newest image is from ${since}.`, { sourceKey: context.sourceKey });
          }
        }
        return { summary: summaries };
      },
      catalog: async (job, context) => {
        const jobs = [];
        for (const collection of context.config.collections || ["natural"]) {
          const result = await context.http.json(`${S.base}/api/${collection}/all`);
          const dates = (Array.isArray(result.data) ? result.data : []).map((item) => item.date).filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)).sort().reverse();
          if (!dates.length) continue;
          const cursorKey = `epic:${collection}:backfill`;
          const cursor = (await context.cursors.get(cursorKey)) || {};
          const perRun = context.config.backfillDaysPerRun || 14;
          const newer = cursor.newest ? dates.filter((date) => date > cursor.newest) : dates.slice(0, 3);
          const older = cursor.oldest ? dates.filter((date) => date < cursor.oldest).slice(0, perRun) : dates.slice(3, 3 + perRun);
          const selected = [...newer, ...older];
          for (const date of selected) {
            jobs.push({ dedupeKey: `epic:day:${collection}:${date}`, jobType: "epic:day", sourceKey: context.sourceKey, priority: 7, payload: { collection, date } });
          }
          const processed = [...selected, cursor.newest, cursor.oldest].filter(Boolean).sort();
          await context.cursors.set(cursorKey, { newest: processed[processed.length - 1], oldest: processed[0], total: dates.length, updatedAt: new Date().toISOString() });
        }
        await context.queue.enqueue(jobs, { onConflict: "keep" });
        return { summary: { days: jobs.length } };
      },
      history: async (job, context) => {
        const window = historyDays(job.payload, 30);
        const jobs = window.days.map((day) => ({ dedupeKey: `epic:day:natural:${day.iso}`, jobType: "epic:day", sourceKey: context.sourceKey, priority: 8, payload: { collection: "natural", date: day.iso } }));
        await context.queue.enqueue(jobs, { onConflict: "keep" });
        return { summary: { queuedDays: jobs.length }, ...historyContinuation(job, window.nextTo) };
      },
      day: async (job, context) => {
        const { collection, date } = job.payload;
        const result = await context.http.json(`${S.base}/api/${collection}/date/${date}`);
        const summary = await context.ingest(candidatesFor(collection, result.data, context.config));
        return { summary };
      }
    },
    helpers: { candidatesFor }
  };
})();

const satnogs = (() => {
  const S = SETTINGS.satnogs;

  const nextLink = (header) => {
    const match = String(header || "").match(/<([^>]+)>\s*;\s*rel="next"/);
    return match ? match[1] : null;
  };

  const listFrom = (data) => (Array.isArray(data) ? data : Array.isArray(data && data.results) ? data.results : []);

  const candidatesFor = (satellite, observations, config) => {
    const imagery = {
      productKey: `satnogs-${satellite.norad}-imagery`,
      name: `${satellite.name} Decoded Imagery (SatNOGS)`,
      category: "Direct Broadcast",
      kind: "image",
      mode: (config.archive || []).includes(satellite.norad) ? "archive" : "index",
      policy: { indexDays: null },
      metadata: { provider: "SatNOGS Network", norad: satellite.norad, satellite: satellite.name, signal: satellite.signal || "LRPT" }
    };
    const waterfall = {
      productKey: `satnogs-${satellite.norad}-waterfall`,
      name: `${satellite.name} Waterfalls (SatNOGS)`,
      category: "Direct Broadcast",
      kind: "image",
      mode: "index",
      policy: { indexDays: 90 },
      metadata: { provider: "SatNOGS Network", norad: satellite.norad, satellite: satellite.name }
    };
    const candidates = [];
    for (const observation of observations) {
      const observedAt = parseAnyDate(observation.start);
      if (!observedAt) continue;
      const station = { observationId: observation.id, station: observation.station_name || null, stationId: observation.ground_station || null, end: observation.end || null, page: fill(S.observationPage, { id: observation.id }) };
      const images = (observation.demoddata || []).map((item) => item.payload_demod || item.url || item).filter((url) => typeof url === "string" && IMAGE_EXTENSIONS.test(url));
      if (images.length) candidates.push({ product: imagery, frame: { observedAt, originUrl: images[0], metadata: { ...station, images: images.slice(0, 12) } } });
      if (observation.waterfall) candidates.push({ product: waterfall, frame: { observedAt, originUrl: observation.waterfall, mimeType: "image/png", metadata: station } });
    }
    return candidates;
  };

  const fetchPage = async (context, url) => {
    const result = await context.http.request(url, { accept: "application/json", maxBytes: 4 * 1024 * 1024 });
    const data = JSON.parse(result.body.toString("utf8"));
    return { observations: listFrom(data), next: nextLink(result.headers.get("link")) || (data && data.next) || null };
  };

  const satelliteFor = (config, norad) => (config.satellites || []).find((satellite) => satellite.norad === norad);

  return {
    key: "satnogs",
    domain: SETTINGS.domain,
    hosts: S.hosts,
    sources: S.sources,
    schedules: (source) => [
      ...source.config.satellites.map((satellite) => ({ scheduleKey: `${source.sourceKey}:recent:${satellite.norad}`, jobType: "satnogs:recent", payload: { norad: satellite.norad }, intervalSeconds: S.intervals.recent })),
      ...source.config.satellites.map((satellite) => ({ scheduleKey: `${source.sourceKey}:backfill:${satellite.norad}`, jobType: "satnogs:backfill", payload: { norad: satellite.norad }, intervalSeconds: S.intervals.backfill }))
    ],
    handlers: {
      recent: async (job, context) => {
        const satellite = satelliteFor(context.config, job.payload.norad);
        if (!satellite) return null;
        const url = `${S.api}?format=json&status=good&satellite__norad_cat_id=${satellite.norad}`;
        const page = await fetchPage(context, url);
        const cursorKey = `satnogs:${satellite.norad}:backfill`;
        const cursor = (await context.cursors.get(cursorKey)) || {};
        if (!cursor.next && page.next && !cursor.exhausted) await context.cursors.set(cursorKey, { next: page.next, pages: 0 });
        const summary = await context.ingest(candidatesFor(satellite, page.observations, context.config));
        return { summary };
      },
      backfill: async (job, context) => {
        const satellite = satelliteFor(context.config, job.payload.norad);
        if (!satellite) return null;
        const cursorKey = `satnogs:${satellite.norad}:backfill`;
        const cursor = (await context.cursors.get(cursorKey)) || {};
        if (!cursor.next || cursor.exhausted) return { summary: { exhausted: Boolean(cursor.exhausted) } };
        const page = await fetchPage(context, cursor.next);
        const summary = await context.ingest(candidatesFor(satellite, page.observations, context.config));
        await context.cursors.set(cursorKey, { next: page.next, pages: (cursor.pages || 0) + 1, exhausted: !page.next, updatedAt: new Date().toISOString() });
        return { summary };
      }
    },
    helpers: { candidatesFor, nextLink }
  };
})();

const youtubeLive = (() => {
  const S = SETTINGS.youtubeLive;


  const isOrbital = (title) => S.include.test(title || "") && !S.exclude.test(title || "");

  const parseLivePage = (html) => {
    const canonical = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1] || "";
    const videoId = (canonical.match(/[?&]v=([A-Za-z0-9_-]{11})/) || [])[1] || null;
    const live = /"isLiveNow":\s*true/.test(html) || /"isLive":\s*true/.test(html);
    const title = decodeXml((html.match(/<meta name="title" content="([^"]*)"/) || html.match(/<meta property="og:title" content="([^"]*)"/) || [])[1] || "");
    const recognized = /ytInitial(Data|PlayerResponse)/.test(html);
    return { videoId, live: Boolean(videoId && live), title, recognized };
  };

  const parseFeed = (xml) => tagBlocks(xml, "entry").map((block) => ({
    videoId: tagText(block.inner, "videoId"),
    title: tagText(block.inner, "title"),
    published: parseAnyDate(tagText(block.inner, "published")),
    thumbnail: attrValue((block.inner.match(/<media:thumbnail[^>]*>/) || [""])[0], "url")
  })).filter((entry) => entry.videoId && entry.published);

  const channelFor = (config, channelId) => (config.channels || []).find((channel) => channel.channelId === channelId);

  return {
    key: "youtube",
    domain: SETTINGS.domain,
    hosts: S.hosts,
    sources: S.sources,
    schedules: (source) => [
      ...source.config.channels.map((channel) => ({ scheduleKey: `${source.sourceKey}:live:${channel.channelId}`, jobType: "youtube:live", payload: { channelId: channel.channelId }, intervalSeconds: S.intervals.live })),
      ...source.config.channels.map((channel) => ({ scheduleKey: `${source.sourceKey}:uploads:${channel.channelId}`, jobType: "youtube:uploads", payload: { channelId: channel.channelId }, intervalSeconds: S.intervals.uploads }))
    ],
    handlers: {
      live: async (job, context) => {
        const channel = channelFor(context.config, job.payload.channelId);
        if (!channel) return null;
        const page = await context.http.text(fill(S.livePage, { channelId: channel.channelId }), {
          maxBytes: 4 * 1024 * 1024,
          accept: "text/html",
          headers: { "Accept-Language": "en-US,en;q=0.9", Cookie: "CONSENT=YES+cb" }
        });
        const parsed = parseLivePage(page.text || "");
        if (!parsed.recognized) {
          await context.events.warn(`The live page for ${channel.name} could not be parsed, so live detection is paused for this cycle.`, { sourceKey: context.sourceKey });
          return { summary: { recognized: false } };
        }
        const liveProduct = {
          productKey: `youtube-${channel.channelId.toLowerCase()}-live`,
          name: `${channel.name} Orbital Live Stream`,
          category: "Live Video",
          kind: "stream",
          mode: "index"
        };
        if (!parsed.live || !isOrbital(parsed.title)) {
          await context.ingest([{ product: { ...liveProduct, metadata: { provider: "YouTube", channelId: channel.channelId, channelName: channel.name, live: false, checkedAt: new Date().toISOString() } } }]);
          return { summary: { live: parsed.live, orbital: false } };
        }
        let embeddable = true;
        let title = parsed.title;
        try {
          const oembed = await context.http.json(fill(S.oembed, { watchUrl: encodeURIComponent(fill(S.watch, { videoId: parsed.videoId })) }));
          title = (oembed.data && oembed.data.title) || title;
        } catch (error) {
          if (error instanceof HttpStatusError && [401, 403, 404].includes(error.status)) embeddable = false;
          else throw error;
        }
        const now = new Date();
        const observedAt = new Date(Math.floor(now.getTime() / 600000) * 600000);
        const summary = await context.ingest([{
          product: { ...liveProduct, metadata: { provider: "YouTube", channelId: channel.channelId, channelName: channel.name, live: true, videoId: parsed.videoId, title, embeddable, embedUrl: fill(S.embed, { videoId: parsed.videoId }), checkedAt: now.toISOString() } },
          frame: { observedAt, originUrl: fill(S.liveThumbnail, { videoId: parsed.videoId }), mimeType: "image/jpeg", metadata: { videoId: parsed.videoId, title, embeddable } }
        }]);
        return { summary };
      },
      uploads: async (job, context) => {
        const channel = channelFor(context.config, job.payload.channelId);
        if (!channel) return null;
        const feed = await context.http.text(fill(S.uploadsFeed, { channelId: channel.channelId }), { accept: "application/atom+xml" });
        const product = {
          productKey: `youtube-${channel.channelId.toLowerCase()}-uploads`,
          name: `${channel.name} Orbital Uploads`,
          category: "Video Archive",
          kind: "video",
          mode: "index",
          metadata: { provider: "YouTube", channelId: channel.channelId, channelName: channel.name }
        };
        const candidates = parseFeed(feed.text || "")
          .filter((entry) => isOrbital(entry.title))
          .map((entry) => ({ product, frame: { observedAt: entry.published, originUrl: entry.thumbnail || fill(S.thumbnail, { videoId: entry.videoId }), mimeType: "image/jpeg", metadata: { videoId: entry.videoId, title: entry.title, watchUrl: fill(S.watch, { videoId: entry.videoId }) } } }));
        const summary = await context.ingest(candidates);
        return { summary };
      }
    },
    helpers: { parseLivePage, parseFeed, isOrbital }
  };
})();

const goesCmi = (() => {
  let h5wasmModule = null;
  let loadError = null;

  const loadH5wasm = async () => {
    if (h5wasmModule) return h5wasmModule;
    if (loadError) return null;
    try {
      const imported = await import("h5wasm/node");
      const module = imported.default || imported;
      await module.ready;
      h5wasmModule = module;
      return module;
    } catch (error) {
      loadError = error;
      return null;
    }
  };

  const available = async () => ((await loadH5wasm())
    ? true
    : "Raw rendering is unavailable because the h5wasm package is not installed.");

  const attrNumber = (dataset, name, fallback) => {
    const attribute = dataset.attrs && dataset.attrs[name];
    if (!attribute) return fallback;
    const value = attribute.value;
    const number = Array.isArray(value) || ArrayBuffer.isView(value) ? Number(value[0]) : Number(value);
    return Number.isFinite(number) ? number : fallback;
  };

  const attrString = (dataset, name) => {
    const attribute = dataset.attrs && dataset.attrs[name];
    return attribute ? String(attribute.value) : "";
  };

  const isInfraredBand = (band) => band >= 7;

  const safeUnlink = (fs, filePath) => {
    try {
      fs.unlink(filePath);
      return true;
    } catch (error) {
      return false;
    }
  };

  const toByte = (value, band, range) => {
    if (isInfraredBand(band)) {
      const low = range.low || 180;
      const high = range.high || 320;
      const normalized = 1 - (value - low) / (high - low);
      return Math.max(0, Math.min(255, Math.round(normalized * 255)));
    }
    const reflectance = Math.max(0, Math.min(1, value));
    return Math.round(Math.sqrt(reflectance) * 255);
  };

  const renderBlocks = ({ height, width, readRows, scale, offset, fill, unsigned, band, targetPx, range, onProgress }) => {
    const factor = Math.max(1, Math.ceil(Math.max(height, width) / targetPx));
    const outWidth = Math.floor(width / factor);
    const outHeight = Math.floor(height / factor);
    const pixels = new Uint8Array(outWidth * outHeight);
    const sums = new Float64Array(outWidth);
    const counts = new Uint32Array(outWidth);
    for (let outRow = 0; outRow < outHeight; outRow += 1) {
      sums.fill(0);
      counts.fill(0);
      const rowStart = outRow * factor;
      const block = readRows(rowStart, rowStart + factor);
      for (let r = 0; r < factor; r += 1) {
        const rowOffset = r * width;
        for (let outCol = 0; outCol < outWidth; outCol += 1) {
          const colStart = outCol * factor;
          for (let c = 0; c < factor; c += 1) {
            let raw = block[rowOffset + colStart + c];
            if (raw === undefined || raw === fill) continue;
            if (unsigned && raw < 0) raw += 65536;
            if (unsigned && raw === (fill < 0 ? fill + 65536 : fill)) continue;
            sums[outCol] += raw * scale + offset;
            counts[outCol] += 1;
          }
        }
      }
      const base = outRow * outWidth;
      for (let outCol = 0; outCol < outWidth; outCol += 1) {
        pixels[base + outCol] = counts[outCol] ? toByte(sums[outCol] / counts[outCol], band, range) : 0;
      }
      if (onProgress && outRow % 128 === 0) onProgress(outRow / outHeight);
    }
    return { width: outWidth, height: outHeight, pixels, factor };
  };

  const run = async ({ payload, http, heartbeat, config }) => {
    const h5wasm = await loadH5wasm();
    if (!h5wasm) throw new PermanentError("Raw rendering is unavailable because the h5wasm package is not installed.");
    const download = await http.request(payload.sourceUrl, { maxBytes: config.maxRawBytes, accept: "application/x-netcdf,application/octet-stream,*/*" });
    const virtualPath = path.posix.join("/", `cmi-${crypto.randomBytes(6).toString("hex")}.nc`);
    h5wasm.FS.writeFile(virtualPath, new Uint8Array(download.body.buffer, download.body.byteOffset, download.body.byteLength));
    let file = null;
    try {
      file = new h5wasm.File(virtualPath, "r");
      const dataset = file.get("CMI");
      if (!dataset || !dataset.shape || dataset.shape.length !== 2) throw new PermanentError("The raw file did not contain a two-dimensional CMI dataset.");
      const [height, width] = dataset.shape;
      const band = Number(payload.options && payload.options.band) || 13;
      let lastBeat = Date.now();
      const rendered = renderBlocks({
        height,
        width,
        band,
        targetPx: (payload.options && payload.options.targetPx) || config.renderTargetPx,
        range: (payload.options && payload.options.range) || {},
        scale: attrNumber(dataset, "scale_factor", 1),
        offset: attrNumber(dataset, "add_offset", 0),
        fill: attrNumber(dataset, "_FillValue", -1),
        unsigned: attrString(dataset, "_Unsigned").toLowerCase() === "true",
        readRows: (start, end) => dataset.slice([[start, Math.min(end, height)], []]),
        onProgress: () => {
          if (Date.now() - lastBeat > 60000) {
            lastBeat = Date.now();
            heartbeat().catch(() => null);
          }
        }
      });
      return {
        buffer: encodePng(rendered.width, rendered.height, rendered.pixels, 1),
        mimeType: "image/png",
        width: rendered.width,
        height: rendered.height,
        metadata: { band, sourceWidth: width, sourceHeight: height, downsampleFactor: rendered.factor, sourceBytes: download.body.length }
      };
    } finally {
      if (file) file.close();
      safeUnlink(h5wasm.FS, virtualPath);
    }
  };

  return { available, run, renderBlocks, toByte };
})();

const pad2 = (value) => String(value).padStart(2, "0");

const utcParts = (date) => ({
  y: String(date.getUTCFullYear()),
  m: pad2(date.getUTCMonth() + 1),
  d: pad2(date.getUTCDate()),
  hms: `${pad2(date.getUTCHours())}${pad2(date.getUTCMinutes())}${pad2(date.getUTCSeconds())}`
});

const recentDays = (date, count) => Array.from({ length: count }, (_, offset) => new Date(date.getTime() - offset * 86400000));

const slider = (() => {
  const S = SETTINGS.slider;


  const categoryFor = (product) => (S.categoryRules.find(([pattern]) => pattern.test(product)) || [null, "Geostationary Imagery"])[1];

  const satelliteLabel = (value) => {
    const goes = value.match(/^goes-?(\d+)$/i);
    if (goes) return `GOES-${goes[1]}`;
    const himawari = value.match(/^himawari-?(\d+)$/i);
    if (himawari) return `Himawari-${himawari[1]}`;
    const meteosat = value.match(/^meteosat-?(\d+)$/i);
    if (meteosat) return `Meteosat-${meteosat[1]}`;
    if (/^jpss$/i.test(value)) return "JPSS";
    if (/^gk-?2a$/i.test(value)) return "GK-2A";
    return titleCase(value.replace(/-/g, " "));
  };

  const productLabel = (value) => titleCase(value.replace(/^abi_/, "").replace(/_/g, " ")).replace(/\bCira\b/g, "CIRA").replace(/\bGeocolor\b/g, "GeoColor").replace(/\bGlm\b/g, "GLM").replace(/\bRgb\b/g, "RGB").replace(/\bTpw\b/g, "TPW").replace(/\bSst\b/g, "SST").replace(/\bGeo(debra|dust|fire|proxy|sst|snow)\b/gi, (match, suffix) => `Geo${suffix.charAt(0).toUpperCase()}${suffix.slice(1).toLowerCase()}`);

  const timestampFrom = (value) => parseTimestamp(String(value), ["ymdhm"]);

  const tileUrl = (template, values) => {
    const stamp = String(values.stamp);
    return fill(template, { ...values, dataRoot: S.dataRoot, imageryPath: S.imageryPath, y: stamp.slice(0, 4), m: stamp.slice(4, 6), d: stamp.slice(6, 8) });
  };

  const heroPattern = new RegExp(S.heroPattern, "i");

  const refreshSeconds = (sector, product) => {
    if (!heroPattern.test(product)) return S.channelInterval;
    const match = S.sectorIntervals.find(([pattern]) => new RegExp(pattern, "i").test(sector));
    return match ? match[1] : S.defaultHeroInterval;
  };

  const resolveTemplate = async (context, values) => {
    const cursorKey = `slider:template:${values.satellite}---${values.sector}`;
    const cached = await context.cursors.get(cursorKey);
    if (cached && cached.template && Date.now() - new Date(cached.checkedAt).getTime() < S.templateRecheckHours * 3600000) return cached.template;
    for (const template of S.tileTemplates) {
      if (template.includes("{server}") && !values.server) continue;
      const url = tileUrl(template, values);
      const result = await context.http.probe(url).catch(() => null);
      if (result && result.ok && /^image\//i.test(result.contentType || "image/")) {
        await context.cursors.set(cursorKey, { template, checkedAt: new Date().toISOString(), sample: url });
        return template;
      }
    }
    await context.cursors.set(cursorKey, { template: null, checkedAt: new Date().toISOString() });
    return null;
  };

  const listDirectories = async (context, url) => {
    const listing = await context.http.text(url, { accept: "text/html" });
    return parseAutoindex(listing.text, url).filter((entry) => entry.isDir).map((entry) => entry.name.replace(/\/$/, ""));
  };

  const listOrEmpty = async (context, url) => {
    try {
      return await listDirectories(context, url);
    } catch (error) {
      if (error instanceof HttpStatusError && [403, 404].includes(error.status)) return [];
      throw error;
    }
  };

  const findServers = async (context) => {
    const pattern = new RegExp(S.serverPattern);
    const listed = (await listOrEmpty(context, S.dataRoot)).filter((name) => pattern.test(name));
    if (listed.length) return listed;
    return Array.from({ length: S.serverProbe }, (_, index) => `rammb-slider${index + 1}`);
  };

  return {
    key: "slider",
    domain: SETTINGS.domain,
    hosts: S.hosts,
    sources: S.sources,
    schedules: (source) => [{ scheduleKey: `${source.sourceKey}:discover`, jobType: "slider:discover", intervalSeconds: S.intervals.discover }],
    startupJobs: () => [{ jobType: "slider:discover", payload: {} }],
    handlers: {
      history: async (job, context) => {
        const row = await context.store.getProduct(job.payload.productKey);
        const meta = (row && row.metadata) || {};
        const satellite = meta.satelliteId;
        const sector = meta.sectorId;
        const product = meta.product;
        if (!satellite || !sector || !product) return { summary: { skipped: "The product does not carry raw SLIDER identifiers yet, so run it again after the next refresh." } };
        const template = await resolveTemplate(context, { satellite, sector, product, server: meta.server, stamp: "20260101000000" });
        if (!template) return { summary: { skipped: "No working tile address is known for this satellite and sector." } };
        const window = historyDays(job.payload, 3);
        const definition = { productKey: row.product_key, name: row.name, category: row.category, kind: row.kind, mode: "index", metadata: meta };
        const candidates = [];
        let daysWithData = 0;
        for (const day of window.days) {
          await context.heartbeat();
          let text = null;
          try {
            const result = await context.http.json(`${S.api}/json/${satellite}/${sector}/${product}/${day.ymd}_by_hour.json`);
            text = JSON.stringify(result.data || {});
          } catch (error) {
            if (error instanceof HttpStatusError && [403, 404].includes(error.status)) continue;
            throw error;
          }
          const stamps = Array.from(new Set(text.match(/\d{14}/g) || []));
          if (stamps.length) daysWithData += 1;
          for (const stamp of stamps) {
            const observedAt = timestampFrom(stamp);
            if (observedAt && observedAt >= new Date(job.payload.from) && observedAt <= new Date(job.payload.to)) {
              candidates.push({ product: definition, frame: { observedAt, originUrl: tileUrl(template, { satellite, sector, product, server: meta.server, stamp }), mimeType: "image/png" } });
            }
          }
        }
        const summary = await context.ingest(candidates, { maxArchivePerVisit: 0 });
        summary.daysWithData = daysWithData;
        return { summary, ...historyContinuation(job, window.nextTo) };
      },
      discover: async (job, context) => {
        const jobs = [];
        const seen = new Set();
        const servers = await findServers(context);
        for (const server of servers) {
          for (const day of recentDays(new Date(), 2)) {
            const { y, m, d } = utcParts(day);
            const dayUrl = `${S.dataRoot}${server}/${S.imageryPath}/${y}/${m}/${d}/`;
            const sectors = await listOrEmpty(context, dayUrl);
            if (!sectors.length) continue;
            for (const sectorDir of sectors.slice(0, context.config.maxSectors || 80)) {
              const [satellite, sector] = sectorDir.split("---");
              if (!satellite || !sector || seen.has(sectorDir)) continue;
              seen.add(sectorDir);
              await context.heartbeat();
              const products = await listOrEmpty(context, `${dayUrl}${sectorDir}/`);
              for (const product of products) {
                jobs.push({ dedupeKey: `slider:product:${satellite}:${sector}:${product}`, jobType: "slider:product", sourceKey: context.sourceKey, priority: 4, payload: { satellite, sector, product, server } });
              }
            }
            break;
          }
        }
        await context.queue.enqueue(jobs, { onConflict: "earliest" });
        return { summary: { sectors: seen.size, products: jobs.length } };
      },
      product: async (job, context) => {
        const { satellite, sector, product, server } = job.payload;
        const { data } = await context.http.json(`${S.api}/json/${satellite}/${sector}/${product}/latest_times.json`);
        const stamps = (Array.isArray(data && data.timestamps_int) ? data.timestamps_int : Array.isArray(data && data.timestamps) ? data.timestamps : []).map((value) => String(value)).filter((value) => /^\d{14}$/.test(value)).sort();
        if (!stamps.length) return { summary: { stamps: 0 }, requeue: context.config.intervalSeconds || 3600 };
        const template = await resolveTemplate(context, { satellite, sector, product, server, stamp: stamps[stamps.length - 1] });
        if (!template) {
          await context.store.pruneForeignFrames(`slider-${slug(satellite)}-${slug(sector)}-${slug(product)}`, "none:");
          await context.events.warn(`No SLIDER tile address returned an image for ${satellite} ${sector}, so its products were skipped.`, { sourceKey: context.sourceKey });
          return { summary: { stamps: stamps.length, template: null }, requeue: 6 * 3600 };
        }
        const productKey = `slider-${slug(satellite)}-${slug(sector)}-${slug(product)}`;
        const definition = {
          productKey,
          name: `${satelliteLabel(satellite)} ${titleCase(sector.replace(/_/g, " "))} ${productLabel(product)}`,
          category: categoryFor(product),
          kind: "image",
          mode: (context.config.archive || []).includes(productKey) ? "archive" : "index",
          metadata: { provider: "CIRA RAMMB SLIDER", satellite: satelliteLabel(satellite), sector: titleCase(sector.replace(/_/g, " ")), product, satelliteId: satellite, sectorId: sector, server: server || null, zoom: 0, viewer: fill(S.viewer, { satellite, sector, product }) }
        };
        const candidates = [];
        for (const stamp of stamps.slice(-(context.config.backfillFrames || 24))) {
          const observedAt = timestampFrom(stamp);
          if (observedAt) candidates.push({ product: definition, frame: { observedAt, originUrl: tileUrl(template, { satellite, sector, product, server, stamp }), mimeType: "image/png" } });
        }
        const summary = await context.ingest(candidates, { maxArchivePerVisit: 24 });
        const sample = tileUrl(template, { satellite, sector, product, server, stamp: stamps[stamps.length - 1] });
        const cut = sample.indexOf("/", sample.indexOf("/data/") + 6);
        if (cut > 0) summary.pruned = await context.store.pruneForeignFrames(productKey, sample.slice(0, cut + 1));
        return { summary, requeue: refreshSeconds(sector, product) };
      }
    }
  };
})();

const nict = (() => {
  const S = SETTINGS.nict;

  const tileUrl = (code, date) => {
    const { y, m, d, hms } = utcParts(date);
    return `${S.base}/img/${code}/1d/550/${y}/${m}/${d}/${hms}_0_0.png`;
  };

  return {
    key: "nict",
    domain: SETTINGS.domain,
    hosts: S.hosts,
    sources: S.sources,
    schedules: (source) => [{ scheduleKey: `${source.sourceKey}:latest`, jobType: "nict:latest", intervalSeconds: S.intervals.latest }],
    handlers: {
      history: async (job, context) => {
        const item = S.products.find((entry) => entry.productKey === job.payload.productKey);
        if (!item) return { summary: { skipped: "The product is not a NICT Himawari product." } };
        const row = await context.store.getProduct(job.payload.productKey);
        const window = historyDays(job.payload, 6);
        const definition = { productKey: item.productKey, name: item.name, category: "Geostationary Imagery", kind: "image", mode: "index", metadata: (row && row.metadata) || { provider: "NICT" } };
        const candidates = [];
        for (const day of window.days) {
          for (let minutes = 0; minutes < 1440; minutes += 10) {
            const observedAt = new Date(day.date.getTime() + minutes * 60000);
            if (observedAt >= new Date(job.payload.from) && observedAt <= new Date(job.payload.to)) {
              candidates.push({ product: definition, frame: { observedAt, originUrl: tileUrl(item.code, observedAt), mimeType: "image/png" } });
            }
          }
        }
        const summary = await context.ingest(candidates, { maxArchivePerVisit: 0 });
        return { summary, ...historyContinuation(job, window.nextTo) };
      },
      latest: async (job, context) => {
        const candidates = [];
        for (const item of S.products) {
          let data;
          try {
            data = (await context.http.json(`${S.base}/img/${item.code}/latest.json`)).data;
          } catch (error) {
            if (error instanceof HttpStatusError && error.status === 404) continue;
            throw error;
          }
          const latest = parseAnyDate(data.date);
          if (!latest) continue;
          const product = {
            productKey: item.productKey,
            name: item.name,
            category: "Geostationary Imagery",
            kind: "image",
            mode: item.archive ? "archive" : "index",
            metadata: { provider: "NICT Himawari Real-Time Web", satellite: "Himawari-9", code: item.code, tileSize: 550 }
          };
          const steps = Math.max(1, Math.round((context.config.backfillHours || 6) * 6));
          for (let step = 0; step < steps; step += 1) {
            const observedAt = new Date(latest.getTime() - step * 600000);
            candidates.push({ product, frame: { observedAt, originUrl: tileUrl(item.code, observedAt), mimeType: "image/png", width: 550, height: 550 } });
          }
        }
        return { summary: await context.ingest(candidates, { maxArchivePerVisit: 12 }) };
      }
    }
  };
})();

const rainviewer = (() => {
  const S = SETTINGS.rainviewer;

  return {
    key: "rainviewer",
    domain: SETTINGS.domain,
    hosts: S.hosts,
    sources: S.sources,
    schedules: (source) => [{ scheduleKey: `${source.sourceKey}:maps`, jobType: "rainviewer:maps", intervalSeconds: S.intervals.maps }],
    handlers: {
      maps: async (job, context) => {
        const { data } = await context.http.json(S.api);
        const host = String(data.host || S.defaultTileHost).replace(/\/$/, "");
        const candidates = [];
        const radar = { productKey: "rainviewer-global-radar", name: "Global Radar Composite", category: "Precipitation", kind: "image", mode: "archive", metadata: { provider: "RainViewer", coverage: "World", zoom: 0, colorScheme: 2, license: "Personal and educational use" } };
        for (const frame of (data.radar && data.radar.past) || []) {
          if (!frame || !frame.path || !frame.time) continue;
          candidates.push({ product: radar, frame: { observedAt: new Date(frame.time * 1000), originUrl: `${host}${frame.path}/512/0/0/0/2/1_1.png`, mimeType: "image/png", width: 512, height: 512 } });
        }
        const infrared = { productKey: "rainviewer-global-infrared", name: "Global Infrared Satellite Composite", category: "Geostationary Imagery", kind: "image", mode: "archive", metadata: { provider: "RainViewer", coverage: "World", zoom: 0, license: "Personal and educational use" } };
        for (const frame of (data.satellite && data.satellite.infrared) || []) {
          if (!frame || !frame.path || !frame.time) continue;
          candidates.push({ product: infrared, frame: { observedAt: new Date(frame.time * 1000), originUrl: `${host}${frame.path}/512/0/0/0/0/0_0.png`, mimeType: "image/png", width: 512, height: 512 } });
        }
        return { summary: await context.ingest(candidates, { maxArchivePerVisit: 24 }) };
      }
    }
  };
})();

const solarArchives = (() => {
  const S = SETTINGS.solarArchives;

  const sizeRank = (size, targetPx) => (size <= targetPx ? size : targetPx - size);

  const dayRoots = (template) => (date) => recentDays(date, 2).map((day) => template(utcParts(day)));


  const sdoSpec = (config) => ({
    format: "autoindex",
    roots: dayRoots((parts) => fill(S.roots.sdo, parts)),
    maxDepth: 1,
    maxNodes: 40,
    revisit: { minSeconds: 300, maxSeconds: 3600 },
    maxArchivePerVisit: 24,
    follow: () => false,
    classify: (entry) => {
      const match = entry.name.match(/^(\d{8})_(\d{6})_(\d{3,4})_([0-9A-Za-z]+)\.jpg$/i);
      if (!match) return null;
      const observedAt = parseTimestamp(entry.name, ["ymd-hms"]);
      if (!observedAt) return null;
      const size = parseInt(match[3], 10);
      const channel = match[4].toUpperCase();
      const productKey = `sdo-${slug(channel)}`;
      return {
        rank: sizeRank(size, config.targetPx || 1024),
        product: {
          productKey,
          name: `SDO ${S.sdoChannels[channel] || channel}`,
          category: "Solar Imagery",
          kind: "image",
          mode: (config.archive || []).includes(productKey) ? "archive" : "index",
          metadata: { provider: "NASA SDO", spacecraft: "SDO", instrument: /^HMI/.test(channel) ? "HMI" : "AIA", channel, browse: entry.url.slice(0, entry.url.lastIndexOf("/") + 1) }
        },
        frame: { observedAt, originUrl: entry.url, byteSize: entry.size, mimeType: "image/jpeg", width: size, height: size }
      };
    }
  });

  const sohoSpec = (config) => ({
    format: "autoindex",
    roots: (date) => recentDays(date, 2).flatMap((day) => (config.instruments || ["c2", "c3"]).map((instrument) => {
      const { y, m, d } = utcParts(day);
      return fill(S.roots.soho, { y, m, d, instrument });
    })),
    maxDepth: 1,
    maxNodes: 40,
    revisit: { minSeconds: 600, maxSeconds: 7200 },
    maxArchivePerVisit: 24,
    follow: () => false,
    classify: (entry) => {
      const match = entry.name.match(/^(\d{8})_(\d{4})_(c2|c3|eit\d{3})_(\d{3,4})\.(jpg|gif|png)$/i);
      if (!match) return null;
      const observedAt = parseTimestamp(entry.name, ["ymd-hms"]);
      if (!observedAt) return null;
      const size = parseInt(match[4], 10);
      const instrument = match[3].toLowerCase();
      const productKey = `soho-${instrument}`;
      return {
        rank: sizeRank(size, config.targetPx || 1024),
        product: {
          productKey,
          name: /^c/.test(instrument) ? `SOHO LASCO ${instrument.toUpperCase()}` : `SOHO EIT ${instrument.slice(3)} Å`,
          category: /^c/.test(instrument) ? "Coronagraph" : "Solar Imagery",
          kind: "image",
          mode: (config.archive || []).includes(productKey) ? "archive" : "index",
          metadata: { provider: "NASA SOHO", spacecraft: "SOHO", instrument: /^c/.test(instrument) ? "LASCO" : "EIT", detector: instrument.toUpperCase() }
        },
        frame: { observedAt, originUrl: entry.url, byteSize: entry.size, mimeType: /\.png$/i.test(entry.name) ? "image/png" : /\.gif$/i.test(entry.name) ? "image/gif" : "image/jpeg", width: size, height: size }
      };
    }
  });

  const stereoSpec = (config) => ({
    format: "autoindex",
    roots: dayRoots((parts) => fill(S.roots.stereo, parts)),
    maxDepth: 3,
    maxNodes: 120,
    revisit: { minSeconds: 900, maxSeconds: 7200 },
    maxArchivePerVisit: 24,
    follow: (entry) => !/^(thumb|thumbs|dir|small)$/i.test(entry.name),
    classify: (entry) => {
      if (!IMAGE_EXTENSIONS.test(entry.name)) return null;
      const observedAt = parseTimestamp(entry.name, ["ymd-hms"]);
      if (!observedAt) return null;
      const segments = entry.segments.slice(0, -1);
      const aheadIndex = segments.indexOf("ahead");
      if (aheadIndex < 0) return null;
      const rest = segments.slice(aheadIndex + 1);
      const sizeDir = rest.length > 1 && /^\d{3,4}$/.test(rest[rest.length - 1]) ? rest[rest.length - 1] : null;
      const parts = sizeDir ? rest.slice(0, -1) : rest;
      if (!parts.length) return null;
      const size = sizeDir ? parseInt(sizeDir, 10) : null;
      const productKey = `stereo-a-${slug(parts.join("-"))}`;
      const instrument = parts[0].toUpperCase();
      return {
        rank: size ? sizeRank(size, config.targetPx || 1024) : 0,
        product: {
          productKey,
          name: `STEREO-A ${instrument}${parts[1] ? ` ${parts[1]}` : ""}${/^EUVI$/.test(instrument) && parts[1] ? " Å" : ""}`,
          category: /^COR/.test(instrument) ? "Coronagraph" : /^HI/.test(instrument) ? "Heliosphere" : "Solar Imagery",
          kind: "image",
          mode: (config.archive || []).includes(productKey) ? "archive" : "index",
          metadata: { provider: "NASA STEREO Science Center", spacecraft: "STEREO-A", instrument, channel: parts[1] || null }
        },
        frame: { observedAt, originUrl: entry.url, byteSize: entry.size, mimeType: /\.png$/i.test(entry.name) ? "image/png" : "image/jpeg", width: size, height: size }
      };
    }
  });

  const proba2Spec = (config) => ({
    format: "autoindex",
    roots: dayRoots((parts) => fill(S.roots.proba2, parts)),
    maxDepth: 1,
    maxNodes: 40,
    revisit: { minSeconds: 600, maxSeconds: 7200 },
    maxArchivePerVisit: 24,
    follow: () => false,
    classify: (entry) => {
      if (!IMAGE_EXTENSIONS.test(entry.name)) return null;
      const observedAt = parseTimestamp(entry.name, ["ymd-hms", "ymdhm"]);
      if (!observedAt) return null;
      const productKey = "proba2-swap-174";
      return {
        rank: 0,
        product: {
          productKey,
          name: "PROBA2 SWAP 174 Å",
          category: "Solar Imagery",
          kind: "image",
          mode: (config.archive || []).includes(productKey) ? "archive" : "index",
          metadata: { provider: "Royal Observatory of Belgium", spacecraft: "PROBA2", instrument: "SWAP", channel: "174" }
        },
        frame: { observedAt, originUrl: entry.url, byteSize: entry.size, mimeType: /\.png$/i.test(entry.name) ? "image/png" : "image/jpeg" }
      };
    }
  });


  const jsocSpec = (config) => ({
    format: "autoindex",
    roots: dayRoots((parts) => fill(S.roots.jsoc, parts)),
    maxDepth: 1,
    maxNodes: 40,
    revisit: { minSeconds: 600, maxSeconds: 7200 },
    maxArchivePerVisit: 24,
    follow: () => false,
    classify: (entry) => {
      const match = entry.name.match(/^(\d{8})_(\d{6})_([A-Za-z_]+?)_(\d+)(k?)\.jpg$/);
      if (!match) return null;
      const observedAt = parseTimestamp(entry.name, ["ymd-hms"]);
      if (!observedAt) return null;
      const size = parseInt(match[4], 10) * (match[5] ? 1024 : 1);
      const type = match[3];
      const productKey = `jsoc-hmi-${slug(type)}`;
      return {
        rank: sizeRank(size, config.targetPx || 1024),
        product: {
          productKey,
          name: `SDO ${S.jsocTypes[type] || `HMI ${type}`}`,
          category: "Solar Imagery",
          kind: "image",
          mode: (config.archive || []).includes(productKey) ? "archive" : "index",
          metadata: { provider: "Stanford JSOC", spacecraft: "SDO", instrument: "HMI", series: type }
        },
        frame: { observedAt, originUrl: entry.url, byteSize: entry.size, mimeType: "image/jpeg", width: size, height: size }
      };
    }
  });

  return {
    key: "solar-archives",
    domain: SETTINGS.domain,
    hosts: S.hosts,
    sources: S.sources,
    schedules: (source) => [{ scheduleKey: `${source.sourceKey}:roots`, jobType: "crawl-roots", payload: { specKey: source.config.spec }, intervalSeconds: S.intervals.roots }],
    crawlSpecs: { sdo: sdoSpec, soho: sohoSpec, stereo: stereoSpec, proba2: proba2Spec, jsoc: jsocSpec },
    handlers: {
      history: async (job, context) => {
        const spec = context.config.spec;
        if (!spec || !S.roots[spec]) return { summary: { skipped: "The source does not map to a crawlable archive." } };
        const window = historyDays(job.payload, 5);
        const jobs = [];
        for (const day of window.days) {
          const parts = { y: day.iso.slice(0, 4), m: day.iso.slice(5, 7), d: day.iso.slice(8, 10) };
          const urls = spec === "soho"
            ? (context.config.instruments || ["c2", "c3"]).map((instrument) => fill(S.roots.soho, { ...parts, instrument }))
            : [fill(S.roots[spec], parts)];
          for (const url of urls) {
            jobs.push({ dedupeKey: `crawl:hist:${spec}:${day.ymd}:${jobs.length}`, jobType: "crawl", sourceKey: context.sourceKey, priority: 8, payload: { specKey: spec, url, depth: 0 } });
          }
        }
        await context.queue.enqueue(jobs, { onConflict: "keep" });
        return { summary: { queuedCrawls: jobs.length }, ...historyContinuation(job, window.nextTo) };
      }
    }
  };
})();



const iswa = (() => {
  const S = SETTINGS.iswa;
  const imagePattern = new RegExp(S.imagePattern, "i");

  const cleanName = (description, dataId) => {
    const parts = String(description || "").split(/\s+-\s+/).map((part) => part.trim()).filter(Boolean);
    return parts.slice(0, 2).join(" - ") || `ISWA Feed ${dataId}`;
  };

  const categoryFor = (feed) => S.regionCategories[String(feed.region || "").toLowerCase()] || (String(feed.category || "").toLowerCase() === "model" ? "Space Weather Model" : "Space Weather Imagery");

  return {
    key: "iswa",
    domain: SETTINGS.domain,
    hosts: S.hosts,
    sources: S.sources,
    schedules: (source) => [{ scheduleKey: `${source.sourceKey}:scan`, jobType: "iswa:scan", intervalSeconds: S.intervals.scan }],
    handlers: {
      scan: async (job, context) => {
        const cursorKey = "iswa:scan";
        const cursor = (await context.cursors.get(cursorKey)) || { next: 1 };
        const start = cursor.next > S.maxDataId ? 1 : cursor.next;
        const end = Math.min(S.maxDataId, start + S.scanBatch - 1);
        const cutoff = Date.now() - S.activeWithinDays * 86400000;
        const jobs = [];
        let found = 0;
        for (let dataId = start; dataId <= end; dataId += 1) {
          if (dataId % 50 === 0) await context.heartbeat();
          let feed = null;
          try {
            const { data } = await context.http.json(`${S.api}/info?dataID=${dataId}`);
            feed = data && Array.isArray(data.datafeeds) ? data.datafeeds[0] : null;
          } catch (error) {
            if (error instanceof HttpStatusError && [400, 404, 500].includes(error.status)) continue;
            throw error;
          }
          if (!feed) continue;
          found += 1;
          const updated = parseAnyDate(feed.lastUpdateTime);
          if (String(feed.mode || "").toLowerCase() !== "active" || !updated || updated.getTime() < cutoff) continue;
          jobs.push({
            dedupeKey: `iswa:feed:${dataId}`,
            jobType: "iswa:feed",
            sourceKey: context.sourceKey,
            priority: 4,
            payload: { dataId, description: feed.description, region: feed.region, category: feed.category, datatree: feed.datatree, grace: feed.maxGracePeriod }
          });
        }
        await context.queue.enqueue(jobs, { onConflict: "keep" });
        await context.cursors.set(cursorKey, { next: end + 1, updatedAt: new Date().toISOString() });
        return { summary: { scanned: end - start + 1, found, active: jobs.length } };
      },
      history: async (job, context) => {
        const row = await context.store.getProduct(job.payload.productKey);
        const dataId = row && row.metadata ? row.metadata.dataId : null;
        if (!dataId) return { summary: { skipped: "The product does not carry an ISWA data identifier." } };
        const window = historyDays(job.payload, 2);
        const definition = { productKey: row.product_key, name: row.name, category: row.category, kind: row.kind, mode: "index", metadata: row.metadata };
        const candidates = [];
        for (const day of window.days) {
          await context.heartbeat();
          let files = [];
          try {
            const { data } = await context.http.json(`${S.api}/between?dataID=${dataId}&time.min=${day.iso}T00:00:00.0Z&time.max=${day.iso}T23:59:59.0Z`);
            files = data && Array.isArray(data.files) ? data.files : [];
          } catch (error) {
            if (error instanceof HttpStatusError && [400, 404, 500].includes(error.status)) continue;
            throw error;
          }
          for (const file of files) {
            if (!file || !file.url || !imagePattern.test(file.url.split("?")[0])) continue;
            const observedAt = parseAnyDate(file.timestamp);
            if (observedAt) candidates.push({ product: definition, frame: { observedAt, originUrl: file.url, mimeType: /\.png$/i.test(file.url) ? "image/png" : "image/jpeg" } });
          }
        }
        const summary = await context.ingest(candidates, { maxArchivePerVisit: 0 });
        return { summary, ...historyContinuation(job, window.nextTo) };
      },
      feed: async (job, context) => {
        const { dataId } = job.payload;
        const { data } = await context.http.json(`${S.api}/recent?dataID=${dataId}&n=${S.recentFiles}`);
        const files = (data && Array.isArray(data.files) ? data.files : []).filter((file) => file && file.url && imagePattern.test(file.url.split("?")[0]));
        if (!files.length) return { summary: { images: 0 } };
        const product = {
          productKey: `iswa-${dataId}`,
          name: cleanName(job.payload.description, dataId),
          category: categoryFor(job.payload),
          kind: "image",
          mode: "index",
          metadata: { provider: "NASA CCMC ISWA", dataId, region: job.payload.region || null, feedCategory: job.payload.category || null, datatree: job.payload.datatree || null }
        };
        const candidates = [];
        for (const file of files) {
          const observedAt = parseAnyDate(file.timestamp);
          if (observedAt) candidates.push({ product, frame: { observedAt, originUrl: file.url, mimeType: /\.png$/i.test(file.url) ? "image/png" : /\.gif$/i.test(file.url) ? "image/gif" : "image/jpeg" } });
        }
        const summary = await context.ingest(candidates);
        const grace = Number(job.payload.grace) || 0;
        return { summary, requeue: Math.max(600, Math.min(S.feedIntervalSeconds, grace ? Math.round(grace / 4) : S.feedIntervalSeconds)) };
      }
    }
  };
})();

const historyDays = (payload, batchDays) => {
  const from = new Date(payload.from);
  const to = new Date(payload.to);
  const days = [];
  let cursor = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
  const floor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  while (cursor >= floor && days.length < batchDays) {
    days.push({ ymd: cursor.toISOString().slice(0, 10).replace(/-/g, ""), iso: cursor.toISOString().slice(0, 10), date: new Date(cursor) });
    cursor = new Date(cursor.getTime() - 86400000);
  }
  const nextTo = cursor >= floor ? new Date(cursor.getTime() + 86399999).toISOString() : null;
  return { days, nextTo };
};

const historyContinuation = (job, nextTo) => (nextTo ? { requeue: { dedupeKey: `${job.dedupe_key}:c${Date.now()}`, jobType: job.job_type, sourceKey: job.source_key, priority: 8, payload: { ...job.payload, to: nextTo } } } : {});

const ADAPTERS = { starCdn, swpc, noaaBuckets, gibs, eumetview, helioviewer, epic, satnogs, youtubeLive, slider, nict, rainviewer, solarArchives };

const interpreters = SETTINGS.interpreters.map((entry) => ({
  match: new RegExp(entry.match, "i"),
  classify: ADAPTERS[entry.adapter].crawlSpecs[entry.spec]({ archive: [] }).classify,
  follow: entry.skip ? (item) => !new RegExp(entry.skip, "i").test(item.name) : undefined
}));

const frontier = SETTINGS.frontier;

module.exports = {
  domain: SETTINGS.domain,
  adapters: [starCdn, swpc, noaaBuckets, gibs, eumetview, helioviewer, epic, satnogs, youtubeLive, slider, nict, rainviewer, solarArchives, iswa],
  processors: { "goes-cmi": goesCmi },
  interpreters,
  frontier
};