import React, { useEffect, useMemo, useState, useCallback } from "react";
import DinoLabsNav from "../../helpers/Nav.jsx";
import { showDialog } from "../../helpers/Alert.jsx";
import "../../styles/mainStyles/DinoGeode/DinoGeodeAddSpecimen.css";
import { supabase, PHOTO_BUCKET } from "../../lib/supabaseClientDinoGeode.js";
import "../../styles/helperStyles/Checkbox.css"; 
import "../../styles/helperStyles/Slider.css"; 
import "../../styles/helperStyles/Switch.css"; 
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass,
  faImages,
  faChevronRight,
  faClipboard,
  faLocationDot,
  faFlask,
  faRulerCombined,
  faKitMedical,
  faBoxArchive,
  faCheckDouble,
  faCartShopping,
  faChartBar,
  faClock,
  faCircleInfo
} from "@fortawesome/free-solid-svg-icons";

const REQUIRED = ["specimen_id", "mineral_name", "location_found", "date_collected"];

const INITIAL_FORM_STATE = {
  specimen_id: "",
  mineral_name: "",
  location_found: "",
  date_collected: "",
  photo_filename: "",
  notes: "",
  gps_latitude: "",
  gps_longitude: "",
  location_description: "",
  elevation_meters: "",
  formation_host_rock: "",
  crystal_system: "",
  hardness: "",
  color_description: "",
  luster_description: "",
  streak_color: "",
  transparency: "",
  fluorescence: "",
  magnetism: "",
  specific_gravity: "",
  cleavage_description: "",
  fracture_description: "",
  associated_minerals: "",
  length_cm: "",
  width_cm: "",
  height_cm: "",
  weight_grams: "",
  size_description: "",
  collection_method: "",
  weather_conditions: "",
  collector_name: "",
  collection_site_type: "",
  access_permission: "",
  condition_rating: "",
  cleaning_method: "",
  treatment_applied: "",
  damage_notes: "",
  storage_location: "",
  storage_container: "",
  display_status: "",
  loan_status: "",
  insurance_value: "",
  identification_confidence: "",
  identified_by: "",
  identification_date: "",
  verification_needed: "false",
  acquisition_method: "",
  acquisition_cost: "",
  acquisition_date: "",
  previous_owner: "",
  data_completeness_score: "50",
  data_quality_rating: "",
  needs_review: "false",
  review_notes: "",
  created_by: "",
  modified_by: "",
  record_version: "1",
  photo_checksum: "",
  video_filename: "",
  sketch_filename: "",
  additional_files: "",
  photo_count: "",
  research_notes: ""
};

const SECTIONS = [
  {
    title: "Basic Identification",
    data: [
      { name: "specimen_id", label: "Specimen ID (Required)", description: "Enter a unique identifier for the specimen, such as DL-001." },
      { name: "mineral_name", label: "Mineral Name (Required)", description: "Specify the primary mineral name, such as Quartz or Calcite." },
      { name: "location_found", label: "Location Found (Required)", description: "Provide the exact location where the specimen was found." },
      { name: "date_collected", label: "Date Collected (YYYY-MM-DD, required)", type: "date", description: "Enter the date when the specimen was collected in YYYY-MM-DD format." },
      { name: "collector_name", label: "Collector Name", description: "Enter the name of the person who collected the specimen." }
    ]
  },
  {
    title: "Location Details",
    data: [
      {
        type: "row",
        items: [
          { name: "gps_latitude", label: "GPS Latitude (decimal)", type: "numeric", description: "Enter the latitude coordinate in decimal format." },
          { name: "gps_longitude", label: "GPS Longitude (decimal)", type: "numeric", description: "Enter the longitude coordinate in decimal format." }
        ]
      },
      { name: "location_description", label: "Location Description", type: "multiline", description: "Describe the collection location in detail." },
      { name: "elevation_meters", label: "Elevation (m, integer)", type: "numeric", description: "Enter elevation (m) as an integer." },
      { name: "formation_host_rock", label: "Formation Host Rock", description: "Specify the geological formation or host rock of the specimen." },
      { name: "collection_site_type", label: "Collection Site Type", description: "Type of environment (quarry, riverbed, etc.)." },
      { name: "access_permission", label: "Access Permission", description: "Permission details for site access." },
      { name: "weather_conditions", label: "Weather Conditions", description: "Weather during collection." },
      { name: "collection_method", label: "Collection Method", description: "Method used to extract the specimen." }
    ]
  },
  {
    title: "Physical Properties",
    data: [
      {
        name: "crystal_system",
        label: "Crystal System",
        type: "dropdown",
        description: "Select the crystal system.",
        options: [
          { label: "Cubic", value: "cubic" },
          { label: "Tetragonal", value: "tetragonal" },
          { label: "Orthorhombic", value: "orthorhombic" },
          { label: "Hexagonal", value: "hexagonal" },
          { label: "Trigonal", value: "trigonal" },
          { label: "Monoclinic", value: "monoclinic" },
          { label: "Triclinic", value: "triclinic" },
          { label: "Amorphous", value: "amorphous" }
        ]
      },
      { name: "hardness", label: "Hardness", description: "Mineral hardness (Mohs)." },
      { name: "color_description", label: "Color Description", description: "Describe the color." },
      {
        name: "luster_description",
        label: "Luster",
        type: "dropdown",
        description: "Select luster type.",
        options: [
          { label: "Vitreous", value: "vitreous" },
          { label: "Metallic", value: "metallic" },
          { label: "Pearly", value: "pearly" },
          { label: "Resinous", value: "resinous" },
          { label: "Silky", value: "silky" },
          { label: "Greasy", value: "greasy" },
          { label: "Dull", value: "dull" },
          { label: "Earthy", value: "earthy" },
          { label: "Adamantine", value: "adamantine" }
        ]
      },
      { name: "streak_color", label: "Streak Color", description: "Color of powdered mineral." },
      {
        name: "transparency",
        label: "Transparency",
        type: "dropdown",
        description: "Select transparency.",
        options: [
          { label: "Transparent", value: "transparent" },
          { label: "Translucent", value: "translucent" },
          { label: "Opaque", value: "opaque" }
        ]
      },
      { name: "fluorescence", label: "Fluorescence", description: "Fluorescence under UV (if any)." },
      {
        name: "magnetism",
        label: "Magnetism",
        type: "dropdown",
        description: "Magnetic response.",
        options: [
          { label: "Non-magnetic", value: "non-magnetic" },
          { label: "Weakly magnetic", value: "weakly-magnetic" },
          { label: "Magnetic", value: "magnetic" },
          { label: "Strongly magnetic", value: "strongly-magnetic" }
        ]
      },
      { name: "specific_gravity", label: "Specific Gravity (decimal)", type: "numeric", description: "Specific gravity (decimal)." },
      { name: "cleavage_description", label: "Cleavage", description: "How it breaks along a plane." },
      { name: "fracture_description", label: "Fracture", description: "How it breaks irregularly." }
    ]
  },
  {
    title: "Dimensions and Associations",
    data: [
      { name: "associated_minerals", label: "Associated Minerals", type: "multiline", description: "Other minerals found with it." },
      {
        type: "row",
        items: [
          { name: "length_cm", label: "Length (cm)", type: "numeric", description: "Length in cm." },
          { name: "width_cm", label: "Width (cm)", type: "numeric", description: "Width in cm." },
          { name: "height_cm", label: "Height (cm)", type: "numeric", description: "Height in cm." }
        ]
      },
      { name: "weight_grams", label: "Weight (g)", type: "numeric", description: "Weight in grams." },
      { name: "size_description", label: "Size Description", description: "General size description." }
    ]
  },
  {
    title: "Condition and Treatment",
    data: [
      { name: "condition_rating", label: "Condition Rating", description: "Overall condition." },
      { name: "cleaning_method", label: "Cleaning Method", description: "How it was cleaned." },
      { name: "treatment_applied", label: "Treatment Applied", description: "Any treatments applied." },
      { name: "damage_notes", label: "Damage Notes", type: "multiline", description: "Any damage/imperfections." }
    ]
  },
  {
    title: "Storage and Status",
    data: [
      { name: "storage_location", label: "Storage Location", description: "Where it's stored." },
      { name: "storage_container", label: "Storage Container", description: "Container used." },
      { name: "display_status", label: "Display Status", description: "On display or in storage." },
      { name: "loan_status", label: "Loan Status", description: "Loan status." },
      { name: "insurance_value", label: "Insurance Value (decimal)", type: "numeric", description: "Appraised value." }
    ]
  },
  {
    title: "Identification",
    data: [
      { name: "identification_confidence", label: "Identification Confidence", description: "Confidence level." },
      { name: "identified_by", label: "Identified By", description: "Who identified it." },
      { name: "identification_date", label: "Identification Date (YYYY-MM-DD)", type: "date", description: "Date of identification." },
      { name: "verification_needed", label: "Verification Needed", type: "toggle", description: " " }
    ]
  },
  {
    title: "Acquisition",
    data: [
      { name: "acquisition_method", label: "Acquisition Method", description: "Found, purchased, etc." },
      { name: "acquisition_cost", label: "Acquisition Cost (decimal)", type: "numeric", description: "Cost to acquire." },
      { name: "acquisition_date", label: "Acquisition Date (YYYY-MM-DD)", type: "date", description: "Date acquired." },
      { name: "previous_owner", label: "Previous Owner", description: "Previous owner (if any)." }
    ]
  },
  {
    title: "Media and Notes",
    data: [
      { name: "notes", label: "Notes", type: "multiline", description: "General notes." },
      { name: "research_notes", label: "Research Notes", type: "multiline", description: "Research notes." },
      { name: "review_notes", label: "Review Notes", type: "multiline", description: "Internal review notes." },
      { name: "photo_count", label: "Photo Count (integer)", type: "numeric", description: "Number of photos." },
      { name: "video_filename", label: "Video Filename", description: "Video file name." },
      { name: "sketch_filename", label: "Sketch Filename", description: "Sketch file name." },
      { name: "additional_files", label: "Additional Files", description: "List any additional files." }
    ]
  },
  {
    title: "Data Quality",
    data: [
      { name: "data_completeness_score", label: "Data Completeness Score", type: "slider", min: 0, max: 100, step: 1, description: "Completeness score." },
      { name: "data_quality_rating", label: "Data Quality Rating", description: "Overall data quality." },
      { name: "needs_review", label: "Needs Review", type: "toggle", description: " " }
    ]
  },
  {
    title: "Audit",
    data: [
      { name: "created_by", label: "Created By", description: "User who created record." },
      { name: "modified_by", label: "Modified By", description: "User who last modified." },
      { name: "record_version", label: "Record Version (integer)", type: "numeric", description: "Version number." }
    ]
  }
];

const FIELD_TYPES = (() => {
  const numeric = new Set();
  const dates = new Set();
  const bools = new Set();
  const visit = (item) => {
    if (item.type === "numeric" || item.type === "slider") numeric.add(item.name);
    if (item.type === "date") dates.add(item.name);
    if (item.type === "checkbox" || item.type === "toggle") bools.add(item.name);
  };
  SECTIONS.forEach((s) =>
    s.data.forEach((it) => {
      if (it.type === "row") it.items.forEach(visit);
      else visit(it);
    })
  );
  return { numeric, dates, bools };
})();

async function sha256Base64(file) {
  try {
    const buf = await file.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", buf);
    const bytes = new Uint8Array(digest);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  } catch {
    return "";
  }
}

export default function AddSpecimen() {
  const [form, setForm] = useState({ ...INITIAL_FORM_STATE });
  const [query, setQuery] = useState("");
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [computingChecksum, setComputingChecksum] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SECTIONS;
    return SECTIONS.map((sec) => ({
      ...sec,
      data: sec.data.filter((it) => {
        if (it.type === "row") {
          return it.items.some(
            (sub) =>
              (sub.label && sub.label.toLowerCase().includes(q)) ||
              (sub.name && sub.name.toLowerCase().includes(q))
          );
        }
        return (it.label && it.label.toLowerCase().includes(q)) || (it.name && it.name.toLowerCase().includes(q));
      })
    })).filter((sec) => sec.data.length > 0);
  }, [query]);

  const handleChange = useCallback((name, value) => {
    setForm((prev) => ({ ...prev, [name]: String(value) }));
  }, []);

  const onPickImage = async (file) => {
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    await showDialog({ title: "Image", message: "The image has been selected successfully." });
  };

  const handleFileInputChange = (e) => {
    const file = e.currentTarget.files?.[0];
    if (file) void onPickImage(file);
  };

  const computeChecksumIfNeeded = async () => {
    if (!imageFile) {
      setForm((prev) => ({ ...prev, photo_checksum: "" }));
      return "";
    }
    setComputingChecksum(true);
    try {
      const sum = await sha256Base64(imageFile);
      setForm((prev) => ({ ...prev, photo_checksum: sum }));
      return sum;
    } finally {
      setComputingChecksum(false);
    }
  };

  const resetForm = () => {
    setForm({ ...INITIAL_FORM_STATE });
    setImageFile(null);
    setImagePreview(null);
  };

  const buildCoercedPayload = (src) => {
    const out = {};
    for (const key in src) {
      const raw = src[key];
      if (FIELD_TYPES.numeric.has(key)) {
        out[key] = raw === "" || raw === null || raw === undefined ? null : Number(raw);
        continue;
      }
      if (FIELD_TYPES.dates.has(key)) {
        out[key] = raw ? raw : null;
        continue;
      }
      if (FIELD_TYPES.bools.has(key)) {
        if (raw === "" || raw === null || raw === undefined) out[key] = null;
        else out[key] = raw === true || raw === "true";
        continue;
      }
      out[key] = raw ?? null;
    }
    return out;
  };

  const promptForNewIdAndRetry = async (payload) => {
    const suggestion = form.specimen_id ? `${form.specimen_id}-2` : "";
    const values = await showDialog({
      title: "Duplicate Specimen ID",
      message: 'That specimen_id already exists. Enter a new unique ID (e.g. append "-2").',
      showCancel: true,
      inputs: [
        {
          name: "specimen_id",
          type: "text",
          defaultValue: suggestion,
          attributes: { placeholder: "e.g. DL-001-2" }
        }
      ]
    });
    if (!values) return false;

    const newId = (values.specimen_id || "").trim();
    if (!newId) {
      await showDialog({ title: "Missing ID", message: "Specimen ID cannot be empty." });
      return false;
    }

    setForm((prev) => ({ ...prev, specimen_id: newId }));

    const { error: insertErr2 } = await supabase
      .from("specimens")
      .insert({ ...payload, specimen_id: newId });

    if (insertErr2) {
      if (insertErr2.code === "23505" || /duplicate key value/i.test(insertErr2.message || "")) {
        return await promptForNewIdAndRetry(payload);
      }
      throw insertErr2;
    }

    await showDialog({ title: "Saved", message: "Your specimen has been saved successfully." });
    resetForm();
    return true;
  };

  const submit = async () => {
    if (submitting) return;

    setSubmitting(true);
    try {
      await computeChecksumIfNeeded();

      let photoPath = form.photo_filename || "";
      if (imageFile) {
        const safeId = (form.specimen_id || "unknown").replace(/[^a-zA-Z0-9_\-]/g, "_");
        const filePath = `${safeId}/${Date.now()}-${imageFile.name}`;
        const { error: uploadErr } = await supabase
          .storage
          .from(PHOTO_BUCKET)
          .upload(filePath, imageFile, { upsert: false, contentType: imageFile.type || "application/octet-stream" });
        if (uploadErr) throw new Error(`Photo upload failed: ${uploadErr.message}`);
        photoPath = filePath;
      }

      const payload = buildCoercedPayload({ ...form, photo_filename: photoPath });

      const { error: insertErr } = await supabase.from("specimens").insert(payload);
      if (insertErr) {
        if (insertErr.code === "23505" || /duplicate key value/i.test(insertErr.message || "")) {
          const ok = await promptForNewIdAndRetry(payload);
          if (!ok) {
            return;
          }
          return;
        }

        if (/invalid input syntax for type date/i.test(insertErr.message || "")) {
          await showDialog({
            title: "Save Failed",
            message: "One of your date fields is not a valid date (expected YYYY-MM-DD)."
          });
          return;
        }

        throw new Error(insertErr.message || "Unknown error while saving.");
      }

      await showDialog({ title: "Saved", message: "Your specimen has been saved successfully." });
      resetForm();
    } catch (e) {
      await showDialog({ title: "Save Failed", message: e?.message || String(e) });
    } finally {
      setSubmitting(false);
    }
  };

  const getSectionIcon = (title) => {
    switch (title) {
      case "Basic Identification": return faClipboard;
      case "Location Details": return faLocationDot;
      case "Physical Properties": return faFlask;
      case "Dimensions and Associations": return faRulerCombined;
      case "Condition and Treatment": return faKitMedical;
      case "Storage and Status": return faBoxArchive;
      case "Identification": return faCheckDouble;
      case "Acquisition": return faCartShopping;
      case "Media and Notes": return faImages;
      case "Data Quality": return faChartBar;
      case "Audit": return faClock;
      default: return faCircleInfo;
    }
  };

  const renderField = (item, value, required) => {
    const desc = item.description || "Please provide the required information for this field.";

    if (item.type === "checkbox") {
      return (
        <div className="dinoGeodeAddSpecimenInputWrapper">
          <div className="dinoGeodeAddSpecimenLabelRow">
            <label className="dinoGeodeAddSpecimenLabel">{item.label}</label>
            {required && <span className="dinoGeodeAddSpecimenRequired">*</span>}
          </div>
          <div className="dinoGeodeAddSpecimenInputSpecial">
            <input
              type="checkbox"
              className="dinolabsSettingsCheckbox"
              checked={value === "true"}
              onChange={(e) => handleChange(item.name, e.target.checked)}
            />
          </div>
          <div className="dinoGeodeAddSpecimenDescRow">
            <span className="dinoGeodeAddSpecimenDescText">{desc}</span>
          </div>
        </div>
      );
    }

    if (item.type === "toggle") {
      return (
        <div className="dinoGeodeAddSpecimenInputWrapper">
          <div className="dinoGeodeAddSpecimenLabelRow">
            <label className="dinoGeodeAddSpecimenLabel">{item.label}</label>
            {required && <span className="dinoGeodeAddSpecimenRequired">*</span>}
          </div>
          <div className="dinoGeodeAddSpecimenInputSpecial">
            <label className="consoleSwitch">
              <input
                type="checkbox"
                checked={value === "true"}
                onChange={(e) => handleChange(item.name, e.target.checked)}
              />
              <span className="consoleSlider round"></span>
            </label>
          </div>
          <div className="dinoGeodeAddSpecimenDescRow">
            <span className="dinoGeodeAddSpecimenDescText">{desc}</span>
          </div>
        </div>
      );
    }

    if (item.type === "slider") {
      const min = item.min ?? 0;
      const max = item.max ?? 100;
      const step = item.step ?? 1;
      const num = Number(value || 0);

      return (
        <div className="dinoGeodeAddSpecimenInputWrapper">
          <div className="dinoGeodeAddSpecimenLabelRow">
            <label className="dinoGeodeAddSpecimenLabel">{item.label}</label>
          </div>
          <input
            type="range"
            className="dinolabsSettingsSlider"
            min={min}
            max={max}
            step={step}
            value={Number.isNaN(num) ? 0 : num}
            onChange={(e) => handleChange(item.name, e.target.value)}
          />
          <div className="dinoGeodeAddSpecimenDescRow">
            <span className="dinoGeodeAddSpecimenDescText">{desc}</span>
          </div>
        </div>
      );
    }

    if (item.type === "dropdown") {
      return (
        <div className="dinoGeodeAddSpecimenInputWrapper">
          <div className="dinoGeodeAddSpecimenLabelRow">
            <label className="dinoGeodeAddSpecimenLabel">{item.label}</label>
            {required && <span className="dinoGeodeAddSpecimenRequired">*</span>}
          </div>
          <select
            className="dinoGeodeAddSpecimenSelect"
            value={value}
            onChange={(e) => handleChange(item.name, e.target.value)}
          >
            <option value="">Select…</option>
            {(item.options || []).map((op) => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))}
          </select>
          <div className="dinoGeodeAddSpecimenDescRow">
            <span className="dinoGeodeAddSpecimenDescText">{desc}</span>
          </div>
        </div>
      );
    }

    if (item.type === "date") {
      return (
        <div className="dinoGeodeAddSpecimenInputWrapper">
          <div className="dinoGeodeAddSpecimenLabelRow">
            <label className="dinoGeodeAddSpecimenLabel">{item.label}</label>
            {required && <span className="dinoGeodeAddSpecimenRequired">*</span>}
          </div>
          <input
            className="dinoGeodeAddSpecimenInput"
            type="date"
            value={value}
            onChange={(e) => handleChange(item.name, e.target.value)}
          />
          <div className="dinoGeodeAddSpecimenDescRow">
            <span className="dinoGeodeAddSpecimenDescText">{desc}</span>
          </div>
        </div>
      );
    }

    const isNumeric = item.type === "numeric";
    const isMultiline = item.type === "multiline";

    return (
      <div className="dinoGeodeAddSpecimenInputWrapper">
        <div className="dinoGeodeAddSpecimenLabelRow">
          <label className="dinoGeodeAddSpecimenLabel">{item.label}</label>
          {required && <span className="dinoGeodeAddSpecimenRequired">*</span>}
        </div>
        {isMultiline ? (
          <textarea
            className="dinoGeodeAddSpecimenTextarea"
            value={value}
            onChange={(e) => handleChange(item.name, e.target.value)}
            rows={5}
          />
        ) : (
          <input
            className="dinoGeodeAddSpecimenInput"
            type={isNumeric ? "number" : "text"}
            value={value}
            onChange={(e) => handleChange(item.name, e.target.value)}
          />
        )}
        
        <div className="dinoGeodeAddSpecimenDescRow">
          <span className="dinoGeodeAddSpecimenDescText">{desc}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="dinoSatPageWrapper">
      <DinoLabsNav activePage={"geode"}/>
      <div className="dinoGeodeAddSpecimenContainer">
        <header className="dinoGeodeAddSpecimenHeader">
          <div className="dinoGeodeAddSpecimenTitleBar">
            <div className="dinoGeodeAddSpecimenTitleLeft">
              <div className="dinoGeodeAddSpecimenLogoWrapper"> 
                <img src="/DinoGeodeLogo.png" alt="" className="dinoGeodeAddSpecimenLogo" />
              </div>
              <h1 className="dinoGeodeAddSpecimenTitle">Add Specimen</h1>
            </div>

            <div className="dinoGeodeAddSpecimenSearchBox">
              <input
                className="dinoGeodeAddSpecimenSearchInput"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search fields by name or label…"
              />
            </div>

          </div>
        </header>

        <main className="dinoGeodeAddSpecimenContent">
          {filteredSections.map((sec) => (
            <section key={sec.title} className="dinoGeodeAddSpecimenSection">
              <div className="dinoGeodeAddSpecimenSectionHeader">
                <div className="dinoGeodeAddSpecimenSectionIcon">
                  <FontAwesomeIcon icon={getSectionIcon(sec.title)} />
                </div>
                <h2 className="dinoGeodeAddSpecimenSectionTitle">{sec.title}</h2>
              </div>

              {sec.data.map((it, idx) => (
                <div key={it.name || sec.title + "-" + idx} className="dinoGeodeAddSpecimenCard">
                  {it.type === "row" ? (
                    <div className="dinoGeodeAddSpecimenRowGrid">
                      {it.items.map((sub) => (
                        <div key={sub.name} className="dinoGeodeAddSpecimenRowCol">
                          {renderField(sub, form[sub.name] || "", REQUIRED.includes(sub.name))}
                        </div>
                      ))}
                    </div>
                  ) : (
                    renderField(it, form[it.name] || "", REQUIRED.includes(it.name))
                  )}
                </div>
              ))}
            </section>
          ))}
          {filteredSections.length === 0 && (
            <div className="dinoGeodeAddSpecimenEmpty">No fields match "{query}"</div>
          )}
        </main>

        <footer className="dinoGeodeAddSpecimenFooter">
          <div className="dinoGeodeAddSpecimenButtonRow">
            <input
              id="dinoGeodeAddSpecimenFileInput"
              type="file"
              accept="image/*"
              className="dinoGeodeAddSpecimenHiddenInput"
              onChange={handleFileInputChange}
            />
            <input
              id="dinoGeodeAddSpecimenCameraInput"
              type="file"
              accept="image/*"
              capture="environment"
              className="dinoGeodeAddSpecimenHiddenInput"
              onChange={handleFileInputChange}
            />

            <button
              className="dinoGeodeAddSpecimenButton dinoGeodeAddSpecimenButtonTeal"
              onClick={() => document.getElementById("dinoGeodeAddSpecimenFileInput").click()}
            >
              <FontAwesomeIcon icon={faImages} />
              <span>Pick Image</span>
            </button>
          
            <button className="dinoGeodeAddSpecimenButton dinoGeodeAddSpecimenButtonPurple" onClick={submit} disabled={submitting}>
              <span>{submitting ? "Submitting…" : "Submit"}</span>
              <FontAwesomeIcon icon={faChevronRight} />
            </button>
          </div>

          {imagePreview && (
            <div className="dinoGeodeAddSpecimenPreviewWrap">
              <img src={imagePreview} alt="Preview" className="dinoGeodeAddSpecimenPreviewImg" />
              <div className="dinoGeodeAddSpecimenPreviewMeta">
                <span className="dinoGeodeAddSpecimenPreviewName">{imageFile ? imageFile.name : "selected-image"}</span>
                <span className="dinoGeodeAddSpecimenPreviewHashLabel">Checksum (SHA-256, Base64):</span>
                <code className="dinoGeodeAddSpecimenPreviewHash">{form.photo_checksum || "Not computed yet."}</code>
              </div>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}
