import React, { useEffect, useMemo, useState, useCallback } from "react";
import DinoLabsNav from "../../helpers/Nav.jsx";
import { showDialog } from "../../helpers/Alert.jsx";
import "../../styles/mainStyles/DinoGeode/DinoGeodeBrowseSpecimen.css";
import { supabase, PHOTO_BUCKET } from "../../lib/supabaseClientDinoGeode.js";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBook, faBoxArchive, faCartShopping, faChartBar, faCheck, faCheckDouble, faClipboard, faClock, faClockRotateLeft, faCloudArrowUp, faComments, faDatabase, faFileCsv, faFileLines, faFilter, faFlask, faGem, faImage, faImages, faInfoCircle, faKitMedical, faLocationDot, faPlus, faRulerCombined, faSliders, faSquare, faSquareCheck, faXmark, faXmarkSquare } from "@fortawesome/free-solid-svg-icons";

const PREDEFINED_TAGS = [
  { id: "quarry", label: "Quarry", category: "location", color: "#8B5CF6" },
  { id: "riverbed", label: "Riverbed", category: "location", color: "#06B6D4" },
  { id: "mountain", label: "Mountain", category: "location", color: "#059669" },
  { id: "beach", label: "Beach", category: "location", color: "#F59E0B" },
  { id: "cave", label: "Cave", category: "location", color: "#374151" },
  { id: "quartz", label: "Quartz", category: "mineral", color: "#EC4899" },
  { id: "calcite", label: "Calcite", category: "mineral", color: "#10B981" },
  { id: "fluorite", label: "Fluorite", category: "mineral", color: "#3B82F6" },
  { id: "pyrite", label: "Pyrite", category: "mineral", color: "#F59E0B" },
  { id: "amethyst", label: "Amethyst", category: "mineral", color: "#8B5CF6" },
  { id: "field-trip", label: "Field Trip", category: "expedition", color: "#059669" },
  { id: "research", label: "Research", category: "expedition", color: "#1E40AF" },
  { id: "personal", label: "Personal Collection", category: "expedition", color: "#7C3AED" },
  { id: "purchase", label: "Purchase", category: "expedition", color: "#DC2626" },
  { id: "gift", label: "Gift", category: "expedition", color: "#059669" }
];

const SECTIONS_CONFIG = [
  { title: "Basic Identification", fields: ["specimen_id", "mineral_name", "location_found", "date_collected", "collector_name"] },
  { title: "Location Details", fields: ["gps_latitude", "gps_longitude", "location_description", "elevation_meters", "formation_host_rock", "collection_site_type", "access_permission", "weather_conditions", "collection_method"] },
  { title: "Physical Properties", fields: ["crystal_system", "hardness", "color_description", "luster_description", "streak_color", "transparency", "fluorescence", "magnetism", "specific_gravity", "cleavage_description", "fracture_description"] },
  { title: "Dimensions and Associations", fields: ["associated_minerals", "length_cm", "width_cm", "height_cm", "weight_grams", "size_description"] },
  { title: "Condition and Treatment", fields: ["condition_rating", "cleaning_method", "treatment_applied", "damage_notes"] },
  { title: "Storage and Status", fields: ["storage_location", "storage_container", "display_status", "loan_status", "insurance_value"] },
  { title: "Identification", fields: ["identification_confidence", "identified_by", "identification_date", "verification_needed"] },
  { title: "Acquisition", fields: ["acquisition_method", "acquisition_cost", "acquisition_date", "previous_owner"] },
  { title: "Media and Notes", fields: ["notes", "research_notes", "review_notes", "photo_count", "video_filename", "sketch_filename", "additional_files"] },
  { title: "Data Quality", fields: ["data_completeness_score", "data_quality_rating", "needs_review"] },
  { title: "Audit", fields: ["created_by", "modified_by", "record_version"] },
  { title: "Comments", fields: [] }
];

function safeParseJSON(text, fallback) {
  try {
    const v = JSON.parse(text);
    return v;
  } catch {
    return fallback;
  }
}

export default function BrowseSpecimen() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");
  const [tagsFilter, setTagsFilter] = useState([]);
  const [advOpen, setAdvOpen] = useState(false);
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [view, setView] = useState("list");
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkPhotos, setBulkPhotos] = useState([]);
  const [exporting, setExporting] = useState({ summary: false, detailed: false, scientific: false });
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [newComment, setNewComment] = useState("");
  const [csvConfig, setCsvConfig] = useState({
    includeMultiSelect: true,
    includeComments: true,
    includePhotoHashes: true,
    includeGeoData: true,
    includeAuditTrail: true,
    dateFormat: "iso",
    delimiter: ",",
    encoding: "utf8"
  });

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("specimens")
        .select("*")
        .order("date_collected", { ascending: false });
      if (error) {
        await showDialog({
          title: "Database Error",
          message: "Failed to load specimens from database. Please check your connection."
        });
        setItems([]);
        return;
      }
      const parsed = (data || []).map((row) => ({
        ...row,
        comments:
          typeof row.comments === "string" ? safeParseJSON(row.comments, []) : row.comments || []
      }));
      setItems(parsed);
    } catch (e) {
      await showDialog({
        title: "Connection Error",
        message: "Unable to connect to database. Please check your internet connection."
      });
      setItems([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const formatFieldName = (field) =>
    field
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  const getIconForSection = (title) => {
    switch (title) {
      case "Basic Identification": return <FontAwesomeIcon icon={faClipboard} />;
      case "Location Details": return <FontAwesomeIcon icon={faLocationDot} />;
      case "Physical Properties": return <FontAwesomeIcon icon={faFlask} />;
      case "Dimensions and Associations": return <FontAwesomeIcon icon={faRulerCombined} />;
      case "Condition and Treatment": return <FontAwesomeIcon icon={faKitMedical} />;
      case "Storage and Status": return <FontAwesomeIcon icon={faBoxArchive} />;
      case "Identification": return <FontAwesomeIcon icon={faCheckDouble} />;
      case "Acquisition": return <FontAwesomeIcon icon={faCartShopping} />;
      case "Media and Notes": return <FontAwesomeIcon icon={faImages} />;
      case "Data Quality": return <FontAwesomeIcon icon={faChartBar} />;
      case "Audit": return <FontAwesomeIcon icon={faClock} />;
      case "Comments": return <FontAwesomeIcon icon={faComments} />;
      default: return <FontAwesomeIcon icon={faInfoCircle} />;
    }
  };

  const publicUrlFor = (path) =>
    path ? supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path)?.data?.publicUrl || null : null;

  const groupByMonth = (specimens) => {
    const withDate = specimens.filter((s) => s.date_collected);
    const sorted = [...withDate].sort(
      (a, b) => new Date(b.date_collected).getTime() - new Date(a.date_collected).getTime()
    );
    const groups = {};
    sorted.forEach((s) => {
      const d = new Date(s.date_collected);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });
    return Object.entries(groups).map(([title, data]) => ({ title, data }));
  };

  const filtered = useMemo(() => {
    let result = items;

    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter((s) => {
        const text = [
          s.mineral_name || "",
          s.specimen_id || "",
          s.location_found || "",
          s.notes || "",
          s.collector_name || "",
          s.associated_minerals || ""
        ]
          .map((v) => v.toLowerCase())
          .join(" | ");
        return text.includes(q);
      });
    }

    if (tagsFilter.length > 0) {
      result = result.filter((s) =>
        tagsFilter.some((tagId) => {
          const tag = PREDEFINED_TAGS.find((t) => t.id === tagId);
          if (!tag) return false;
          const mineralMatch =
            tag.category === "mineral" &&
            (s.mineral_name || "").toLowerCase().includes(tag.label.toLowerCase());
          const locationMatch =
            tag.category === "location" &&
            (s.location_found || "").toLowerCase().includes(tag.label.toLowerCase());
          return mineralMatch || locationMatch;
        })
      );
    }

    if (dateStart || dateEnd) {
      result = result.filter((s) => {
        if (!s.date_collected) return false;
        const d = new Date(s.date_collected);
        if (dateStart) {
          const ds = new Date(dateStart);
          if (d < ds) return false;
        }
        if (dateEnd) {
          const de = new Date(dateEnd);
          if (d > de) return false;
        }
        return true;
      });
    }

    return result;
  }, [items, query, tagsFilter, dateStart, dateEnd]);

  useEffect(() => {
    if (!selected) return;
    if (!filtered.find((f) => f.specimen_id === selected.specimen_id)) {
      setSelected(null);
    }
  }, [filtered, selected]);

  const toggleSelect = (specimen) => {
    if (!selecting) {
      setSelected(specimen);
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const key = specimen.specimen_id || "";
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const formatDateForCSV = (dateString, format) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    switch (format) {
      case "us": return date.toLocaleDateString("en-US");
      case "eu": return date.toLocaleDateString("en-GB");
      default: return date.toISOString().split("T")[0];
    }
  };

  const generateAdvancedCSV = async (specimens, config) => {
    const { delimiter, dateFormat, includeComments, includePhotoHashes, includeGeoData, includeAuditTrail, includeMultiSelect } =
      config;

    let headers = ["specimen_id", "mineral_name", "location_found", "date_collected", "collector_name"];
    const extra = [];

    if (includeGeoData) extra.push("gps_latitude", "gps_longitude", "elevation_meters", "location_description");
    extra.push(
      "crystal_system",
      "hardness",
      "color_description",
      "luster_description",
      "streak_color",
      "transparency"
    );
    extra.push("length_cm", "width_cm", "height_cm", "weight_grams", "specific_gravity");
    extra.push("condition_rating", "storage_location", "insurance_value");

    if (includeAuditTrail) extra.push("created_by", "modified_by", "record_version", "created_at", "updated_at");
    if (includePhotoHashes) extra.push("photo_checksum", "photo_count");
    if (includeComments) extra.push("comments_count", "latest_comment", "all_comments");
    if (includeMultiSelect) extra.push("tags", "associated_minerals_list", "additional_files_list");

    headers = headers.concat(extra);
    let csv = headers.join(delimiter) + "\n";

    for (const s of specimens) {
      const row = [];
      for (const h of headers) {
        let value = "";
        if (h.includes("date") && s[h]) value = formatDateForCSV(s[h], dateFormat);
        else if (h === "comments_count") value = (s.comments?.length || 0).toString();
        else if (h === "latest_comment") {
          const latest = [...(s.comments || [])].sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
          )[0];
          value = latest?.text || "";
        } else if (h === "all_comments")
          value = s.comments?.map((c) => `${c.created_at}: ${c.text}`).join(" | ") || "";
        else if (h === "tags") {
          value = PREDEFINED_TAGS.filter(
            (tag) =>
              (s.mineral_name || "").toLowerCase().includes(tag.label.toLowerCase()) ||
              (s.location_found || "").toLowerCase().includes(tag.label.toLowerCase())
          )
            .map((t) => t.label)
            .join(" | ");
        } else if (h === "associated_minerals_list")
          value = s.associated_minerals?.split(/[,;]/).map((m) => m.trim()).join(" | ") || "";
        else if (h === "additional_files_list") {
          value = [s.video_filename, s.sketch_filename, s.additional_files].filter(Boolean).join(" | ");
        } else value = s[h]?.toString() || "";

        const escaped =
          value.includes(delimiter) || value.includes('"') || value.includes("\n")
            ? `"${value.replace(/"/g, '""')}"`
            : value;
        row.push(escaped);
      }
      csv += row.join(delimiter) + "\n";
    }
    return csv;
  };

  const exportCSV = async () => {
    if (selectedIds.size === 0) {
      await showDialog({ title: "No Selection", message: "Please select specimens to export." });
      return;
    }

    const res = await showDialog({
      title: "CSV Export",
      message: "Choose options, then press OK.",
      showCancel: true,
      inputs: [
        {
          name: "dateFormat",
          type: "select",
          defaultValue: csvConfig.dateFormat,
          options: [
            { label: "ISO (YYYY-MM-DD)", value: "iso" },
            { label: "US (MM/DD/YYYY)", value: "us" },
            { label: "EU (DD/MM/YYYY)", value: "eu" }
          ]
        },
        {
          name: "delimiter",
          type: "select",
          defaultValue: csvConfig.delimiter,
          options: [
            { label: "Comma (,)", value: "," },
            { label: "Semicolon (;)", value: ";" },
            { label: "Tab (\\t)", value: "\t" }
          ]
        }
      ]
    });
    if (!res) return;

    const cfg = { ...csvConfig, dateFormat: res.dateFormat, delimiter: res.delimiter };
    setCsvConfig(cfg);

    const selectedList = filtered.filter((s) => selectedIds.has(s.specimen_id || ""));
    const csv = await generateAdvancedCSV(selectedList, cfg);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const name = `specimens_export_${Date.now()}.csv`;

    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    await showDialog({ title: "Export Complete", message: `Saved ${selectedList.length} rows to ${name}.` });
    setSelecting(false);
    setSelectedIds(new Set());
  };

  const sectionsForFormat = (format) => {
    switch (format) {
      case "summary": return SECTIONS_CONFIG.slice(0, 3);
      case "scientific":
        return SECTIONS_CONFIG.filter((section) =>
          ["Basic Identification", "Physical Properties", "Dimensions and Associations", "Identification", "Data Quality"].includes(
            section.title
          )
        );
      case "detailed":
      default: return SECTIONS_CONFIG;
    }
  };

  const generateEnhancedHTML = (s, format) => {
    const tags = PREDEFINED_TAGS.filter(
      (tag) =>
        (s.mineral_name || "").toLowerCase().includes(tag.label.toLowerCase()) ||
        (s.location_found || "").toLowerCase().includes(tag.label.toLowerCase())
    );
    const imageUrl = s.photo_filename && online ? publicUrlFor(s.photo_filename) : null;
    const secs = sectionsForFormat(format)
      .map((sec) => ({
        title: sec.title,
        data: sec.fields
          .filter((f) => s[f] != null && s[f] !== "")
          .map((f) => ({ key: f, value: String(s[f]).slice(0, 1000) }))
      }))
      .filter((sec) => sec.data.length > 0);

    const titleFor = () => {
      switch (format) {
        case "summary": return "Specimen Summary Report";
        case "detailed": return "Complete Specimen Documentation";
        case "scientific": return "Scientific Analysis Report";
        default: return "Specimen Report";
      }
    };

    return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${titleFor()} - ${s.specimen_id || ""}</title>
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Inter,Arial,sans-serif;background:#f3f4f6;margin:0;padding:20px;color:#111827}
    .container{max-width:880px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.15)}
    .header{background:linear-gradient(90deg,#4b5563,#6b7280);color:#fff;padding:20px;text-align:center}
    .header h1{margin:0 0 6px;font-weight:800}
    .info{padding:16px;background:#f9fafb;border-bottom:1px solid #edf2f7;text-align:center}
    .name{font-size:20px;font-weight:700;color:#111827}
    .chip{display:inline-block;margin-top:6px;background:#e5e7eb;border-radius:999px;padding:4px 10px;color:#374151;font-weight:600}
    .tags{margin-top:10px;white-space:nowrap;overflow:auto}
    .tag{display:inline-block;color:#fff;font-weight:700;padding:4px 8px;border-radius:14px;margin:2px;font-size:12px}
    .meta{padding:16px;background:#f8fafc;border-bottom:1px solid #e5e7eb}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}
    .item{background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:10px}
    .il{font-size:11px;color:#6b7280;font-weight:800;text-transform:uppercase}
    .iv{font-size:14px;color:#111827;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .image{padding:0 16px 16px;text-align:center}
    img{max-width:100%;height:auto;border-radius:8px;border:1px solid #e5e7eb}
    .section{padding:0 16px 18px}
    .st{background:linear-gradient(90deg,#4b5563,#6b7280);color:#fff;padding:8px 12px;border-radius:6px;font-weight:800;margin:14px 0}
    .fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}
    .field{background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:12px}
    .fl{font-weight:800;color:#4b5563;font-size:11px;text-transform:uppercase;margin-bottom:4px}
    .fv{color:#111827;font-size:14px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .footer{background:linear-gradient(135deg,#374151,#1f2937);color:#fff;font-size:12px;text-align:center;padding:14px}
    @media print{body{background:#fff;padding:0}.container{box-shadow:none;border-radius:0}}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${titleFor()}</h1>
      <div>Generated ${new Date().toLocaleDateString()}</div>
    </div>
    <div class="info">
      <div class="name">${s.mineral_name || "Unknown Mineral"}</div>
      <div class="chip">ID: ${s.specimen_id || "N/A"}</div>
      ${tags.length
        ? `<div class="tags">${tags
          .map((t) => `<span class="tag" style="background:${t.color}">${t.label}</span>`)
          .join("")}</div>`
        : ""
      }
    </div>
    <div class="meta">
      <div class="grid">
        <div class="item"><div class="il">Collection Date</div><div class="iv">${s.date_collected || "Unknown"}</div></div>
        <div class="item"><div class="il">Location</div><div class="iv">${s.location_found || "Unknown"}</div></div>
        <div class="item"><div class="il">Collector</div><div class="iv">${s.collector_name || "Unknown"}</div></div>
        <div class="item"><div class="il">GPS</div><div class="iv">${s.gps_latitude && s.gps_longitude ? `${s.gps_latitude}, ${s.gps_longitude}` : "Not recorded"
      }</div></div>
      </div>
    </div>
    ${imageUrl ? `<div class="image"><img src="${imageUrl}" alt="Specimen Photo" /></div>` : ""}
    ${secs
        .map(
          (sec) => `
      <div class="section">
        <div class="st">${sec.title}</div>
        <div class="fields">
          ${sec.data
              .map(
                (f) => `
            <div class="field">
              <div class="fl">${formatFieldName(f.key)}</div>
              <div class="fv">${f.value}</div>
            </div>`
              )
              .join("")}
        </div>
      </div>`
        )
        .join("")}
    <div class="footer">DinoGeode Specimen Management • Report: ${format} • ${new Date().toLocaleString()}</div>
  </div>
</body>
</html>`;
  };

  const generateScientificHTML = async (s, opts) => {
    const imageUrl = s.photo_filename && online && opts.includeImages ? publicUrlFor(s.photo_filename) : null;

    const metadataTable = (() => {
      const basic = ["specimen_id", "date_collected", "location_found", "collector_name"];
      const extended = basic.concat(["gps_latitude", "gps_longitude", "elevation_meters", "formation_host_rock", "collection_method"]);
      const complete = extended.concat(["weather_conditions", "access_permission", "collection_site_type", "data_quality_rating"]);
      const fields = opts.metadataLevel === "basic" ? basic : opts.metadataLevel === "complete" ? complete : extended;
      const rows = fields
        .map((f) => `<tr><td>${formatFieldName(f)}</td><td>${s[f] || "Not recorded"}</td></tr>`)
        .join("");
      return `
        <table class="metadata-table">
          <thead><tr><th>Property</th><th>Value</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>`;
    })();

    const physicalPropertiesTable = (() => {
      const props = [
        "crystal_system",
        "hardness",
        "color_description",
        "luster_description",
        "streak_color",
        "transparency",
        "specific_gravity",
        "cleavage_description",
        "fracture_description",
        "length_cm",
        "width_cm",
        "height_cm",
        "weight_grams"
      ];
      const items = props
        .map(
          (p) => `
        <div class="property-item">
          <div class="property-label">${formatFieldName(p)}</div>
          <div class="property-value">${s[p] || "Not measured"}</div>
        </div>`
        )
        .join("");
      return `<div class="properties-grid">${items}</div>`;
    })();

    const analysisSection = (() => {
      const confidence = s.identification_confidence || "Not assessed";
      const completeness = s.data_completeness_score || "50";
      return `
        <div class="analysis-section">
          <h4>Identification Analysis</h4>
          <p><strong>Identification Confidence:</strong> ${confidence}</p>
          <p><strong>Data Completeness:</strong> ${completeness}%</p>
          ${s.identified_by ? `<p><strong>Identified By:</strong> ${s.identified_by}</p>` : ""}
          ${s.identification_date ? `<p><strong>Identification Date:</strong> ${s.identification_date}</p>` : ""}
          ${String(s.verification_needed) === "true" ? "<p><em>Note: This specimen requires third-party verification.</em></p>" : ""}
          ${s.notes ? `<h4>General Observations</h4><p>${s.notes}</p>` : ""}
          ${s.research_notes ? `<h4>Research Notes</h4><p>${s.research_notes}</p>` : ""}
        </div>`;
    })();

    return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Scientific Analysis Report - ${s.specimen_id || ""}</title>
  <style>
    body{font-family:"Times New Roman",serif;margin:20px;background:#fff;color:#000;line-height:1.6;font-size:12pt}
    .header{text-align:center;border-bottom:2px solid #000;padding-bottom:16px;margin-bottom:24px}
    .header h1{font-size:18pt;margin:0 0 8px}
    .header h2{font-size:14pt;margin:0 0 4px;font-weight:400;font-style:italic}
    .overview{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:24px}
    .specimen-image{text-align:center}
    .specimen-image img{max-width:100%;max-height:300px;border:1px solid #ccc}
    .specimen-details{padding:16px;border:1px solid #ccc;background:#f9f9f9}
    .detail{margin-bottom:6px}
    .dl{font-weight:700;display:inline-block;min-width:120px}
    .section{margin-bottom:24px}
    .st{font-size:14pt;font-weight:700;border-bottom:1px solid #000;padding-bottom:4px;margin-bottom:10px}
    .metadata-table{width:100%;border-collapse:collapse;margin-bottom:12px;font-size:10pt}
    .metadata-table th,.metadata-table td{border:1px solid #000;padding:6px;text-align:left}
    .metadata-table th{background:#e0e0e0}
    .properties-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
    .property-item{border:1px solid #ccc;padding:8px;background:#f9f9f9}
    .property-label{font-weight:700;font-size:9pt;color:#666;text-transform:uppercase;margin-bottom:4px}
    .property-value{font-size:11pt}
    .analysis-section{background:#f0f8ff;border:1px solid #b0c4de;padding:12px}
    .comments{border:1px solid #ddd;padding:12px;background:#fafafa}
    .comment{border-bottom:1px solid #eee;padding:6px 0;font-size:10pt}
    .comment-date{font-weight:700;color:#666}
    .footer{margin-top:28px;border-top:1px solid #ccc;padding-top:10px;font-size:10pt;color:#666;text-align:center}
    @media print{.section{page-break-inside:avoid}}
  </style>
</head>
<body>
  <div class="header">
    <h1>Scientific Specimen Analysis Report</h1>
    <h2>${s.mineral_name || "Unknown Mineral"}</h2>
    <div>Specimen ID: ${s.specimen_id || "N/A"}</div>
    <div>Analysis Date: ${new Date().toLocaleDateString()}</div>
  </div>

  <div class="overview">
    ${imageUrl
        ? `<div class="specimen-image">
            <img src="${imageUrl}" alt="Specimen Photo" />
            <p><strong>Figure 1:</strong> Specimen ${s.specimen_id || ""}</p>
            ${opts.includePhotoHashes && s.photo_checksum ? `<p><em>Image Hash: ${s.photo_checksum}</em></p>` : ""}
          </div>`
        : ""
      }
    <div class="specimen-details">
      <div class="detail"><span class="dl">Mineral:</span> ${s.mineral_name || "Unknown"}</div>
      <div class="detail"><span class="dl">Collection Date:</span> ${s.date_collected || "Unknown"}</div>
      <div class="detail"><span class="dl">Location:</span> ${s.location_found || "Unknown"}</div>
      <div class="detail"><span class="dl">Collector:</span> ${s.collector_name || "Unknown"}</div>
      ${s.gps_latitude && s.gps_longitude
        ? `<div class="detail"><span class="dl">Coordinates:</span> ${s.gps_latitude}, ${s.gps_longitude}</div>`
        : ""
      }
    </div>
  </div>

  <div class="section">
    <div class="st">Collection Metadata</div>
    ${metadataTable}
  </div>

  <div class="section">
    <div class="st">Physical Properties</div>
    ${physicalPropertiesTable}
  </div>

  <div class="section">
    <div class="st">Analysis & Observations</div>
    ${analysisSection}
  </div>

  ${s.comments && s.comments.length
        ? `<div class="section">
           <div class="st">Research Notes & Comments</div>
           <div class="comments">
             ${s.comments
          .map(
            (c) =>
              `<div class="comment"><div class="comment-date">${new Date(c.created_at).toLocaleDateString()}</div><div>${c.text}</div></div>`
          )
          .join("")}
           </div>
         </div>`
        : ""
      }

  <div class="footer">
    DinoGeode Specimen Management System • Scientific Report • ${new Date().toLocaleString()}
  </div>
</body>
</html>`;
  };

  const exportSpecimen = async (format) => {
    if (!selected) return;
    setExporting((p) => ({ ...p, [format]: true }));
    try {
      const html =
        format === "scientific"
          ? await generateScientificHTML(selected, { includeImages: true, includePhotoHashes: true, metadataLevel: "extended" })
          : generateEnhancedHTML(selected, format);

      const win = window.open("", "_blank");
      if (!win) {
        await showDialog({ title: "Popup Blocked", message: "Allow pop-ups to print/export the report." });
        return;
      }
      win.document.write(html);
      win.document.close();
      setTimeout(() => {
        try {
          win.focus();
          win.print();
        } catch { }
      }, 600);
    } catch (e) {
      await showDialog({ title: "Export Failed", message: e?.message || String(e) });
    } finally {
      setExporting((p) => ({ ...p, [format]: false }));
    }
  };

  const addComment = async () => {
    if (!selected || !newComment.trim()) return;
    const next = [...(selected.comments || []), { id: Date.now().toString(), text: newComment.trim(), created_at: new Date().toISOString() }];
    try {
      const { error } = await supabase.from("specimens").update({ comments: next }).eq("specimen_id", selected.specimen_id);
      if (error) throw new Error(error.message);
      setItems((prev) =>
        prev.map((it) => (it.specimen_id === selected.specimen_id ? { ...it, comments: next } : it))
      );
      setSelected((s) => ({ ...s, comments: next }));
      setNewComment("");
      await showDialog({ title: "Comment Added", message: "Your comment has been saved." });
    } catch (e) {
      await showDialog({ title: "Save Failed", message: e?.message || String(e) });
    }
  };

  const onBulkImportPick = async (files) => {
    if (!files || files.length === 0) return;
    try {
      const processed = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const buf = await f.arrayBuffer();
        const digest = await crypto.subtle.digest("SHA-256", buf);
        const b = Array.from(new Uint8Array(digest))
          .map((x) => x.toString(16).padStart(2, "0"))
          .join("");
        processed.push({ name: f.name, size: f.size, hash: b.slice(0, 16) });
      }
      setBulkPhotos(processed);
      await showDialog({
        title: "Bulk Import Ready",
        message: `Processed ${processed.length} photo(s). (Hashes computed)`,
      });
    } catch (e) {
      await showDialog({ title: "Import Error", message: e?.message || String(e) });
    }
  };

  const timeline = useMemo(() => groupByMonth(filtered), [filtered]);

  return (

    <div className="dinoSatPageWrapper">
      <DinoLabsNav activePage={"geode"}/>
      <div className="dinoGeodeSpecimenBrowserContainer">
        <main className="dinoGeodeSpecimenBrowserMain">
          <aside className="dinoGeodeSpecimenBrowserSidebar">
            <div className="dinoGeodeSpecimenBrowserSidebarHeader">
              <div className="dinoGeodeSpecimenBrowserTitleLeft">
                <img className="dinoGeodeSpecimenBrowserLogo" src="/DinoGeodeLogo.png" alt="Logo" />
                <h1 className="dinoGeodeSpecimenBrowserTitle">Specimen Browser</h1>
              </div>

              <div className="dinoGeodeSpecimenBrowserBanner">
                <span className="dinoGeodeSpecimenBrowserBannerText">
                  <FontAwesomeIcon icon={faDatabase} /> {items.length} records
                </span>
                <span className="dinoGeodeSpecimenBrowserBannerText">
                  <FontAwesomeIcon icon={faFilter} /> {filtered.length} filtered
                </span>
              </div>

              <div className="dinoGeodeSpecimenBrowserHeaderActions">
                <button
                  className="dinoGeodeSpecimenBrowserButton"
                  onClick={() => setAdvOpen((o) => !o)}
                  aria-label="Advanced Search"
                >
                  <FontAwesomeIcon icon={faSliders} />
                  Advanced
                </button>
              </div>
            </div>

            <div className="dinoGeodeSpecimenBrowserSearchBox">
              <input
                className="dinoGeodeSpecimenBrowserSearchInput"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search specimens…"
              />
            </div>

            <div className="dinoGeodeSpecimenBrowserTagSelector">
              <div className="dinoGeodeSpecimenBrowserTagRow">
                {PREDEFINED_TAGS.map((t) => {
                  const active = tagsFilter.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      className={`dinoGeodeSpecimenBrowserTag ${active ? "dinoGeodeSpecimenBrowserTagActive" : ""}`}
                      style={{ backgroundColor: t.color }}
                      onClick={() =>
                        setTagsFilter((prev) =>
                          prev.includes(t.id) ? prev.filter((x) => x !== t.id) : [...prev, t.id]
                        )
                      }
                    >
                      <span className="dinoGeodeSpecimenBrowserTagText">{t.label}</span>
                      {active && <FontAwesomeIcon icon={faCheck} className="dinoGeodeSpecimenBrowserTagCheck" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {advOpen && (
              <div className="dinoGeodeSpecimenBrowserAdvanced">
                <div className="dinoGeodeSpecimenBrowserAdvRow">
                  <div className="dinoGeodeSpecimenBrowserAdvLabel">Date Range:</div>
                  <div className="dinoGeodeSpecimenBrowserDateRow">
                    <input
                      className="dinoGeodeSpecimenBrowserDateInput"
                      type="date"
                      value={dateStart}
                      onChange={(e) => setDateStart(e.target.value)}
                      placeholder="Start"
                    />
                    <input
                      className="dinoGeodeSpecimenBrowserDateInput"
                      type="date"
                      value={dateEnd}
                      onChange={(e) => setDateEnd(e.target.value)}
                      placeholder="End"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="dinoGeodeSpecimenBrowserActions">
              <input
                id="dinoGeodeSpecimenBrowserBulk"
                type="file"
                accept="image/*"
                className="dinoGeodeSpecimenBrowserHiddenInput"
                multiple
                onChange={(e) => onBulkImportPick(e.target.files)}
              />
              <button
                className="dinoGeodeSpecimenBrowserButton dinoGeodeSpecimenBrowserButtonTeal"
                onClick={() => setView((v) => (v === "list" ? "timeline" : "list"))}
              >
                <FontAwesomeIcon icon={faClockRotateLeft} />
                <span>{view === "list" ? "Timeline" : "List"}</span>
              </button>
              <button
                className={`dinoGeodeSpecimenBrowserButton ${selecting ? "dinoGeodeSpecimenBrowserButtonRed" : "dinoGeodeSpecimenBrowserButtonIndigo"}`}
                onClick={() => {
                  setSelecting((s) => !s);
                  setSelectedIds(new Set());
                }}
              >
                <FontAwesomeIcon icon={selecting ? faXmarkSquare : faSquareCheck} />
                <span>{selecting ? "Cancel" : "Select"}</span>
              </button>
              {selecting && (
                <button className="dinoGeodeSpecimenBrowserButton dinoGeodeSpecimenBrowserButtonGreen" onClick={exportCSV}>

                  <FontAwesomeIcon icon={faFileCsv} />
                  <span>Export CSV ({selectedIds.size})</span>
                </button>
              )}
            </div>

            <div className="dinoGeodeSpecimenBrowserList">
              {view === "list" ? (
                filtered.length ? (
                  filtered.map((s) => {
                    const active = selected?.specimen_id === s.specimen_id;
                    const picked = selectedIds.has(s.specimen_id || "");
                    return (
                      <button
                        key={s.specimen_id || Math.random()}
                        className={`dinoGeodeSpecimenBrowserRow ${active ? "dinoGeodeSpecimenBrowserRowActive" : ""}`}
                        onClick={() => toggleSelect(s)}
                      >
                        {selecting && (
                          <FontAwesomeIcon icon={picked ? faSquareCheck : faSquare} className="dinoGeodeSpecimenBrowserPick" />
                        )}
                        <div className="dinoGeodeSpecimenBrowserRowMain">
                          <div className={`dinoGeodeSpecimenBrowserRowTitle ${active ? "dinoGeodeSpecimenBrowserRowTitleOn" : ""}`}>
                            {s.mineral_name || "(unnamed)"}
                          </div>
                          <div className={`dinoGeodeSpecimenBrowserRowSub ${active ? "dinoGeodeSpecimenBrowserRowSubOn" : ""}`}>
                            {s.specimen_id || "—"}
                          </div>
                          <div className="dinoGeodeSpecimenBrowserSync">

                            <FontAwesomeIcon icon={faCloudArrowUp} className="dinoGeodeSpecimenBrowserSyncIcon" />
                            <span>Database</span>
                          </div>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="dinoGeodeSpecimenBrowserEmpty">No database specimens match current filters.</div>
                )
              ) : timeline.length ? (
                timeline.map((sec) => (
                  <div key={sec.title} className="dinoGeodeSpecimenBrowserTimeSection">
                    <div className="dinoGeodeSpecimenBrowserTimeHeader">{sec.title}</div>
                    {sec.data.map((s) => {
                      const active = selected?.specimen_id === s.specimen_id;
                      const picked = selectedIds.has(s.specimen_id || "");
                      return (
                        <button
                          key={s.specimen_id || Math.random()}
                          className={`dinoGeodeSpecimenBrowserRow ${active ? "dinoGeodeSpecimenBrowserRowActive" : ""}`}
                          onClick={() => toggleSelect(s)}
                        >
                          {selecting && (
                            <FontAwesomeIcon icon={picked ? faSquareCheck : faSquare} className="dinoGeodeSpecimenBrowserPick" />
                          )}
                          <div className="dinoGeodeSpecimenBrowserRowMain">
                            <div className={`dinoGeodeSpecimenBrowserRowTitle ${active ? "dinoGeodeSpecimenBrowserRowTitleOn" : ""}`}>
                              {s.mineral_name || "(unnamed)"}
                            </div>
                            <div className={`dinoGeodeSpecimenBrowserRowSub ${active ? "dinoGeodeSpecimenBrowserRowSubOn" : ""}`}>
                              {s.specimen_id || "—"}
                            </div>
                            <div className="dinoGeodeSpecimenBrowserSync">
                              <FontAwesomeIcon icon={faCloudArrowUp} className="dinoGeodeSpecimenBrowserSyncIcon" />
                              <span>Database</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))
              ) : (
                <div className="dinoGeodeSpecimenBrowserEmpty">No database specimens match current filters.</div>
              )}
            </div>

            {!!bulkPhotos.length && (
              <div className="dinoGeodeSpecimenBrowserBulkWrap">
                <div className="dinoGeodeSpecimenBrowserBulkTitle">
                  <FontAwesomeIcon icon={faImages} /> Bulk Photos ({bulkPhotos.length})
                </div>
                <div className="dinoGeodeSpecimenBrowserBulkList">
                  {bulkPhotos.map((p, i) => (
                    <div key={i} className="dinoGeodeSpecimenBrowserBulkItem">
                      <FontAwesomeIcon icon={faImage} />
                      <span className="dinoGeodeSpecimenBrowserBulkName">{p.name}</span>
                      <span className="dinoGeodeSpecimenBrowserBulkHash">#{p.hash}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>

          <section className="dinoGeodeSpecimenBrowserContent">
            {!selected ? (
              <div className="dinoGeodeSpecimenBrowserEmpty">
                <FontAwesomeIcon icon={faGem} className="dinoGeodeSpecimenBrowserEmptyIcon" />
                <div className="dinoGeodeSpecimenBrowserEmptyTitle">No Specimen Selected</div>
                <div className="dinoGeodeSpecimenBrowserEmptyText">Select a specimen from the list to view details and export options.</div>
              </div>
            ) : (
              <div className="dinoGeodeSpecimenBrowserDetail">
                <div className="dinoGeodeSpecimenBrowserDetailHead">
                  <div className="dinoGeodeSpecimenBrowserSpecInfo">
                    <div className="dinoGeodeSpecimenBrowserSpecText">
                      <div className="dinoGeodeSpecimenBrowserSpecName">{selected.mineral_name || "Unknown Mineral"}</div>
                      <div className="dinoGeodeSpecimenBrowserSpecId">ID: {selected.specimen_id}</div>
                    </div>
                  </div>
                  <div className="dinoGeodeSpecimenBrowserExportRow">
                    <button
                      className={`dinoGeodeSpecimenBrowserButton dinoGeodeSpecimenBrowserButtonBlue ${exporting.summary ? "dinoGeodeSpecimenBrowserButtonBusy" : ""}`}
                      onClick={() => exportSpecimen("summary")}
                      disabled={exporting.summary}
                    >
                      <FontAwesomeIcon icon={faFileLines} />
                      <span>Summary</span>
                    </button>
                    <button
                      className={`dinoGeodeSpecimenBrowserButton dinoGeodeSpecimenBrowserButtonTeal ${exporting.detailed ? "dinoGeodeSpecimenBrowserButtonBusy" : ""}`}
                      onClick={() => exportSpecimen("detailed")}
                      disabled={exporting.detailed}
                    >
                      <FontAwesomeIcon icon={faBook} />
                      <span>Enhanced</span>
                    </button>
                    <button
                      className={`dinoGeodeSpecimenBrowserButton dinoGeodeSpecimenBrowserButtonGreen ${exporting.scientific ? "dinoGeodeSpecimenBrowserButtonBusy" : ""}`}
                      onClick={() => exportSpecimen("scientific")}
                      disabled={exporting.scientific}
                    >
                      <FontAwesomeIcon icon={faFlask} />
                      <span>Scientific</span>
                    </button>
                  </div>
                </div>

                <div className="dinoGeodeSpecimenBrowserDetailBody">
                  {selected.photo_filename && (
                    <div className="dinoGeodeSpecimenBrowserImageWrap">
                      <img className="dinoGeodeSpecimenBrowserImage" src={publicUrlFor(selected.photo_filename)} alt="" />
                    </div>
                  )}

                  <div className="dinoGeodeSpecimenBrowserSections">
                    {SECTIONS_CONFIG
                      .map((sec) => ({
                        title: sec.title,
                        data: sec.fields
                          .filter((f) => selected[f] != null && selected[f] !== "")
                          .map((f) => ({ key: f, value: String(selected[f]) }))
                      }))
                      .filter((sec) => sec.data.length > 0)
                      .map((sec) => (
                        <div className="dinoGeodeSpecimenBrowserSec" key={sec.title}>
                          <div className="dinoGeodeSpecimenBrowserSecHead">
                            <div className="dinoGeodeSpecimenBrowserSecIcon">
                              {getIconForSection(sec.title)}
                            </div>
                            <div className="dinoGeodeSpecimenBrowserSecTitle">{sec.title}</div>
                          </div>
                          <div className="dinoGeodeSpecimenBrowserFields">
                            {sec.data.map((row) => (
                              <div className="dinoGeodeSpecimenBrowserCell" key={row.key}>
                                <div className="dinoGeodeSpecimenBrowserCellKey">{formatFieldName(row.key)}</div>
                                <div className="dinoGeodeSpecimenBrowserCellVal">{row.value}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>

                  <div className="dinoGeodeSpecimenBrowserComments">
                    <div className="dinoGeodeSpecimenBrowserCommentsTitle">
                      <FontAwesomeIcon icon={faComments} /> Comments
                    </div>

                    {(selected.comments || []).length ? (
                      <div className="dinoGeodeSpecimenBrowserCommentList">
                        {selected.comments.map((c) => (
                          <div className="dinoGeodeSpecimenBrowserComment" key={c.id}>
                            <div className="dinoGeodeSpecimenBrowserCommentText">{c.text}</div>
                            <div className="dinoGeodeSpecimenBrowserCommentDate">
                              <FontAwesomeIcon icon={faClock} /> {new Date(c.created_at).toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="dinoGeodeSpecimenBrowserEmpty">No comments yet.</div>
                    )}

                    <div className="dinoGeodeSpecimenBrowserAddComment">
                      <input
                        className="dinoGeodeSpecimenBrowserCommentInput"
                        placeholder="Add a comment…"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") addComment();
                        }}
                      />
                      <button className="dinoGeodeSpecimenBrowserButton dinoGeodeSpecimenBrowserButtonIndigo" onClick={addComment}>

                        <FontAwesomeIcon icon={faPlus} />
                      </button>
                    </div>
                  </div>

                  <div className="dinoGeodeSpecimenBrowserFootNote">
                    <FontAwesomeIcon icon={faDatabase} /> Database Record — Last Updated: {new Date().toLocaleString()}
                  </div>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}