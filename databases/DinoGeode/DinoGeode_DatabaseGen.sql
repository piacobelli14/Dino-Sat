CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DROP TABLE IF EXISTS expedition_reports CASCADE;
DROP TABLE IF EXISTS expedition_logistics CASCADE;
DROP TABLE IF EXISTS expedition_risk_assessments CASCADE;
DROP TABLE IF EXISTS expedition_weather_data CASCADE;
DROP TABLE IF EXISTS expedition_equipment CASCADE;
DROP TABLE IF EXISTS expedition_planning CASCADE;
DROP TABLE IF EXISTS expedition_locations CASCADE;
DROP TABLE IF EXISTS expeditions CASCADE;
DROP TABLE IF EXISTS specimens CASCADE;

CREATE TABLE expeditions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'cancelled', 'postponed')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    leader_name VARCHAR(255) NOT NULL,
    participants TEXT[], 
    budget DECIMAL(12, 2),
    actual_cost DECIMAL(12, 2),
    objectives TEXT NOT NULL,
    location_general VARCHAR(255) NOT NULL,
    expedition_type VARCHAR(50) DEFAULT 'research' CHECK (expedition_type IN ('research', 'collection', 'survey', 'educational', 'commercial')),
    difficulty_level VARCHAR(20) DEFAULT 'moderate' CHECK (difficulty_level IN ('easy', 'moderate', 'difficult', 'extreme')),
    duration_days INTEGER GENERATED ALWAYS AS (end_date - start_date + 1) STORED,
    max_participants INTEGER DEFAULT 10,
    min_participants INTEGER DEFAULT 2,
    required_permits TEXT[],
    insurance_required BOOLEAN DEFAULT true,
    emergency_contact VARCHAR(500),
    base_camp_location VARCHAR(255),
    transportation_method VARCHAR(255),
    accommodation_type VARCHAR(255),
    communication_plan TEXT,
    evacuation_plan TEXT,
    success_criteria TEXT[],
    deliverables TEXT[],
    tags TEXT[],
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255) NOT NULL,
    last_modified_by VARCHAR(255),
    archived BOOLEAN DEFAULT false,
    public_visibility BOOLEAN DEFAULT false,
    collaboration_allowed BOOLEAN DEFAULT false,
    data_sharing_agreement TEXT,
    funding_source VARCHAR(255),
    institutional_affiliation VARCHAR(255),
    research_permit_numbers TEXT[],
    environmental_impact_assessment TEXT,
    indigenous_land_permissions TEXT,
    specimen_collection_permitted BOOLEAN DEFAULT true,
    max_specimen_quota INTEGER DEFAULT 100,
    export_permits_required TEXT[],
    customs_documentation TEXT,
    quarantine_requirements TEXT,
    total_locations INTEGER DEFAULT 0,
    total_specimens_collected INTEGER DEFAULT 0,
    total_team_members INTEGER DEFAULT 0,
    total_equipment_items INTEGER DEFAULT 0,
    completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),

    CHECK (start_date <= end_date),
    CHECK (min_participants <= max_participants),
    CHECK (budget IS NULL OR budget >= 0),
    CHECK (actual_cost IS NULL OR actual_cost >= 0)
);

CREATE TABLE expedition_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expedition_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    elevation_meters INTEGER,
    location_type VARCHAR(50) NOT NULL DEFAULT 'target_site' CHECK (location_type IN (
        'target_site', 'base_camp', 'waypoint', 'hazard', 'water_source', 
        'parking', 'shelter', 'emergency_point', 'research_station', 'equipment_cache'
    )),
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    geological_interest TEXT,
    expected_minerals TEXT[],
    rock_formations TEXT[],
    access_notes TEXT,
    access_difficulty VARCHAR(20) DEFAULT 'moderate' CHECK (access_difficulty IN ('easy', 'moderate', 'difficult', 'technical')),
    access_method VARCHAR(255),
    permits_required TEXT[],
    landowner_contact VARCHAR(500),
    access_restrictions TEXT,
    seasonal_accessibility TEXT,
    weather_concerns TEXT[],
    safety_hazards TEXT[],
    emergency_procedures TEXT,
    recommended_equipment TEXT[],
    estimated_time_hours DECIMAL(4, 1),
    optimal_visit_time VARCHAR(255),
    alternative_routes TEXT[],
    parking_coordinates JSONB, 
    water_availability BOOLEAN DEFAULT false,
    shelter_available BOOLEAN DEFAULT false,
    cell_coverage BOOLEAN DEFAULT false,
    radio_coverage BOOLEAN DEFAULT false,
    satellite_required BOOLEAN DEFAULT false,
    visited BOOLEAN DEFAULT false,
    visit_date DATE,
    visit_duration_hours DECIMAL(4, 1),
    specimens_collected INTEGER DEFAULT 0,
    photos_taken INTEGER DEFAULT 0,
    samples_taken INTEGER DEFAULT 0,
    notes_field TEXT,
    weather_during_visit VARCHAR(255),
    team_members_present TEXT[],
    success_rating INTEGER CHECK (success_rating BETWEEN 1 AND 10),
    would_return BOOLEAN,
    recommended_improvements TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255) NOT NULL,
    gps_accuracy_meters DECIMAL(6, 2),
    elevation_accuracy_meters DECIMAL(6, 2),
    coordinates_verified BOOLEAN DEFAULT false,
    mapping_source VARCHAR(255),
    topographic_map_reference VARCHAR(255),
    geological_map_reference VARCHAR(255),
    land_use_designation VARCHAR(255),
    conservation_status VARCHAR(255),
    cultural_significance TEXT,
    archaeological_considerations TEXT,
    flora_fauna_notes TEXT,
    environmental_sensitivity_rating INTEGER CHECK (environmental_sensitivity_rating BETWEEN 1 AND 10),
    leave_no_trace_considerations TEXT,
    restoration_required BOOLEAN DEFAULT false,
    post_visit_monitoring TEXT,
    
    CHECK (latitude BETWEEN -90 AND 90),
    CHECK (longitude BETWEEN -180 AND 180),
    CHECK (specimens_collected >= 0),
    CHECK (photos_taken >= 0),
    CHECK (samples_taken >= 0)
);

CREATE TABLE expedition_planning (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expedition_id UUID NOT NULL,
    planning_phase VARCHAR(20) DEFAULT 'initial' CHECK (planning_phase IN ('initial', 'detailed', 'final', 'approved')),
    weather_forecast TEXT,
    weather_backup_plan TEXT,
    seasonal_considerations TEXT,
    permits_status JSONB DEFAULT '{}', 
    permits_expiry_dates JSONB DEFAULT '{}', 
    permits_contact_info JSONB DEFAULT '{}', 
    transportation_plan TEXT,
    transportation_backup TEXT,
    vehicle_requirements TEXT[],
    fuel_requirements TEXT,
    accommodation_plan TEXT,
    accommodation_backup TEXT,
    meal_planning TEXT,
    water_sourcing_plan TEXT,
    waste_management_plan TEXT,
    communication_equipment TEXT[],
    emergency_contacts JSONB DEFAULT '{}',
    medical_considerations TEXT,
    medical_supplies_required TEXT[],
    evacuation_procedures TEXT,
    insurance_coverage TEXT,
    risk_assessment_completed BOOLEAN DEFAULT false,
    risk_mitigation_strategies TEXT[],
    contingency_plans JSONB DEFAULT '{}',
    budget_breakdown JSONB DEFAULT '{}',
    funding_secured BOOLEAN DEFAULT false,
    timeline_milestones JSONB DEFAULT '{}', 
    pre_expedition_checklist JSONB DEFAULT '{}',
    team_briefing_scheduled BOOLEAN DEFAULT false,
    team_briefing_date DATE,
    equipment_check_date DATE,
    final_go_no_go_date DATE NOT NULL,
    weather_threshold_conditions TEXT,
    cancellation_criteria TEXT[],
    postponement_procedures TEXT,
    stakeholder_notifications TEXT[],
    media_contact_plan TEXT,
    social_media_guidelines TEXT,
    documentation_requirements TEXT,
    data_collection_protocols TEXT,
    specimen_handling_procedures TEXT,
    chain_of_custody_requirements TEXT,
    export_documentation_needed TEXT[],
    customs_preparation TEXT,
    quarantine_protocols TEXT,
    post_expedition_procedures TEXT,
    debrief_schedule TEXT,
    report_deadlines JSONB DEFAULT '{}', 
    data_processing_timeline TEXT,
    specimen_processing_plan TEXT,
    results_dissemination_plan TEXT,
    follow_up_expedition_potential BOOLEAN DEFAULT false,
    lessons_learned_documentation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    approved_by VARCHAR(255),
    approved_date DATE,
    version_number INTEGER DEFAULT 1 CHECK (version_number >= 1),
    planning_coordinator VARCHAR(255) NOT NULL
);

CREATE TABLE expedition_equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expedition_id UUID NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'geological', 'safety', 'navigation', 'communication', 'camping', 
        'photography', 'transportation', 'medical', 'research', 'documentation'
    )),
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    quantity_required INTEGER NOT NULL DEFAULT 1,
    quantity_available INTEGER NOT NULL DEFAULT 0,
    quantity_packed INTEGER DEFAULT 0,
    unit_weight_kg DECIMAL(8, 3),
    total_weight_kg DECIMAL(10, 3) GENERATED ALWAYS AS (unit_weight_kg * quantity_required) STORED,
    unit_cost DECIMAL(10, 2),
    total_cost DECIMAL(12, 2) GENERATED ALWAYS AS (unit_cost * quantity_required) STORED,
    source VARCHAR(20) DEFAULT 'owned' CHECK (source IN ('owned', 'rented', 'purchased', 'borrowed', 'sponsored')),
    supplier_contact VARCHAR(500),
    rental_return_date DATE,
    insurance_value DECIMAL(10, 2),
    insurance_coverage BOOLEAN DEFAULT false,
    serial_numbers TEXT[],
    condition VARCHAR(20) DEFAULT 'good' CHECK (condition IN ('new', 'good', 'fair', 'poor', 'needs_repair')),
    last_maintenance_date DATE,
    next_maintenance_due DATE,
    calibration_due_date DATE,
    operating_manual_available BOOLEAN DEFAULT false,
    training_required BOOLEAN DEFAULT false,
    trained_operators TEXT[],
    priority VARCHAR(20) DEFAULT 'important' CHECK (priority IN ('essential', 'important', 'nice_to_have', 'backup')),
    alternatives TEXT[],
    weight_limit_constraints TEXT,
    size_constraints TEXT,
    power_requirements TEXT,
    battery_life_hours DECIMAL(6, 1),
    charging_requirements TEXT,
    environmental_limitations TEXT[],
    temperature_range VARCHAR(100),
    waterproof_rating VARCHAR(50),
    shock_resistance VARCHAR(100),
    field_tested BOOLEAN DEFAULT false,
    field_test_results TEXT,
    packing_instructions TEXT,
    transport_restrictions TEXT[],
    customs_classification VARCHAR(100),
    export_restrictions BOOLEAN DEFAULT false,
    hazardous_materials BOOLEAN DEFAULT false,
    safety_precautions TEXT[],
    disposal_requirements TEXT,
    assigned_team_member VARCHAR(255),
    check_in_date DATE,
    check_out_date DATE,
    location_last_seen VARCHAR(255),
    inventory_verified BOOLEAN DEFAULT false,
    inventory_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255) NOT NULL,
    
    CHECK (quantity_required > 0),
    CHECK (quantity_available >= 0),
    CHECK (quantity_packed >= 0),
    CHECK (quantity_packed <= quantity_available),
    CHECK (unit_weight_kg IS NULL OR unit_weight_kg >= 0),
    CHECK (unit_cost IS NULL OR unit_cost >= 0),
    CHECK (insurance_value IS NULL OR insurance_value >= 0),
    CHECK (battery_life_hours IS NULL OR battery_life_hours > 0)
);

CREATE TABLE expedition_weather_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expedition_id UUID NOT NULL,
    location_id UUID,
    observation_date DATE NOT NULL,
    observation_time TIME NOT NULL,
    data_source VARCHAR(20) NOT NULL DEFAULT 'observation' CHECK (data_source IN (
        'observation', 'forecast', 'historical', 'satellite', 'weather_station'
    )),
    temperature_celsius DECIMAL(4, 1) NOT NULL,
    temperature_feels_like DECIMAL(4, 1),
    humidity_percent INTEGER CHECK (humidity_percent BETWEEN 0 AND 100),
    barometric_pressure_mb DECIMAL(6, 1),
    wind_speed_kmh DECIMAL(5, 1) CHECK (wind_speed_kmh >= 0),
    wind_direction_degrees INTEGER CHECK (wind_direction_degrees BETWEEN 0 AND 360),
    wind_gust_kmh DECIMAL(5, 1) CHECK (wind_gust_kmh >= 0),
    precipitation_mm DECIMAL(6, 1) CHECK (precipitation_mm >= 0),
    precipitation_type VARCHAR(20) DEFAULT 'none' CHECK (precipitation_type IN (
        'none', 'rain', 'snow', 'sleet', 'hail', 'mixed'
    )),
    cloud_cover_percent INTEGER CHECK (cloud_cover_percent BETWEEN 0 AND 100),
    visibility_km DECIMAL(4, 1) CHECK (visibility_km >= 0),
    uv_index INTEGER CHECK (uv_index BETWEEN 0 AND 15),
    weather_conditions TEXT[],
    severe_weather_warnings TEXT[],
    air_quality_index INTEGER,
    pollen_count VARCHAR(50),
    sunrise_time TIME,
    sunset_time TIME,
    moon_phase VARCHAR(50),
    tidal_information TEXT,
    avalanche_risk VARCHAR(20) CHECK (avalanche_risk IN ('low', 'moderate', 'considerable', 'high', 'extreme')),
    fire_danger_rating VARCHAR(20) CHECK (fire_danger_rating IN ('low', 'moderate', 'high', 'extreme')),
    lightning_risk VARCHAR(20) CHECK (lightning_risk IN ('low', 'moderate', 'high')),
    flash_flood_risk VARCHAR(20) CHECK (flash_flood_risk IN ('low', 'moderate', 'high')),
    heat_index DECIMAL(4, 1),
    wind_chill DECIMAL(4, 1),
    dew_point DECIMAL(4, 1),
    atmospheric_stability TEXT,
    field_conditions_impact TEXT,
    safety_implications TEXT[],
    activity_recommendations TEXT[],
    equipment_considerations TEXT[],
    travel_advisories TEXT[],
    observer_name VARCHAR(255),
    observation_quality VARCHAR(20) DEFAULT 'good' CHECK (observation_quality IN ('excellent', 'good', 'fair', 'poor')),
    observation_notes TEXT,
    forecast_accuracy INTEGER CHECK (forecast_accuracy BETWEEN 1 AND 10),
    data_verified BOOLEAN DEFAULT false,
    verification_source VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE expedition_risk_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expedition_id UUID NOT NULL,
    assessment_type VARCHAR(20) DEFAULT 'detailed' CHECK (assessment_type IN ('preliminary', 'detailed', 'ongoing', 'post_incident')),
    assessment_date DATE NOT NULL,
    assessor_name VARCHAR(255) NOT NULL,
    assessor_qualifications TEXT,
    review_date DATE NOT NULL,
    approval_status VARCHAR(20) DEFAULT 'draft' CHECK (approval_status IN (
        'draft', 'pending_review', 'approved', 'rejected', 'requires_revision'
    )),
    approved_by VARCHAR(255),
    approval_date DATE,
    environmental_risks JSONB DEFAULT '{}',
    operational_risks JSONB DEFAULT '{}',
    human_risks JSONB DEFAULT '{}',
    regulatory_risks JSONB DEFAULT '{}',
    scientific_risks JSONB DEFAULT '{}',
    specific_hazards JSONB DEFAULT '[]', 
    mitigation_strategies JSONB DEFAULT '{}',
    emergency_procedures JSONB DEFAULT '{}',
    
    overall_risk_rating INTEGER CHECK (overall_risk_rating BETWEEN 1 AND 25),
    risk_acceptability VARCHAR(30) DEFAULT 'requires_further_assessment' CHECK (risk_acceptability IN (
        'acceptable', 'acceptable_with_controls', 'unacceptable', 'requires_further_assessment'
    )),
    go_no_go_criteria TEXT[],
    continuous_monitoring_required BOOLEAN DEFAULT true,
    reassessment_triggers TEXT[],
    
    insurance_implications TEXT,
    legal_liability_considerations TEXT,
    stakeholder_communication_plan TEXT,
    media_contingency_plans TEXT,
    
    lessons_from_previous_expeditions TEXT[],
    external_expert_consultations TEXT[],
    peer_review_completed BOOLEAN DEFAULT false,
    peer_reviewers TEXT[],
    
    post_expedition_review_scheduled BOOLEAN DEFAULT false,
    incident_reporting_procedures TEXT,
    near_miss_reporting_encouraged BOOLEAN DEFAULT true,
    
    notes TEXT,
    attachments TEXT[],
    reference_materials TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    version_number INTEGER DEFAULT 1 CHECK (version_number >= 1)
);

CREATE TABLE expedition_logistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expedition_id UUID NOT NULL,
    
    transportation_details JSONB DEFAULT '{}',
    accommodation_details JSONB DEFAULT '{}',
    provisions JSONB DEFAULT '{}',
    communication_plan JSONB DEFAULT '{}',
    medical_logistics JSONB DEFAULT '{}',
    documentation JSONB DEFAULT '{}',
    equipment_logistics JSONB DEFAULT '{}',
    financial_logistics JSONB DEFAULT '{}',
    timeline_coordination JSONB DEFAULT '{}',
    contingency_logistics JSONB DEFAULT '{}',
    
    logistics_coordinator VARCHAR(255) NOT NULL,
    coordination_contact_info VARCHAR(500),
    last_review_date DATE,
    next_review_scheduled DATE,
    stakeholder_sign_offs JSONB DEFAULT '{}',
    
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    version_number INTEGER DEFAULT 1 CHECK (version_number >= 1)
);

CREATE TABLE expedition_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expedition_id UUID NOT NULL,
    report_type VARCHAR(20) NOT NULL CHECK (report_type IN (
        'preliminary', 'interim', 'final', 'incident', 'scientific', 'financial', 'environmental'
    )),
    report_title VARCHAR(500) NOT NULL,
    report_date DATE NOT NULL,
    report_period_start DATE NOT NULL,
    report_period_end DATE NOT NULL,
    author_name VARCHAR(255) NOT NULL,
    author_role VARCHAR(255),
    contributors TEXT[],
    review_status VARCHAR(20) DEFAULT 'draft' CHECK (review_status IN ('draft', 'peer_review', 'approved', 'published')),
    reviewed_by TEXT[],
    approved_by VARCHAR(255),
    publication_date DATE,
    
    executive_summary TEXT,
    key_findings TEXT[],
    major_achievements TEXT[],
    challenges_encountered TEXT[],
    recommendations TEXT[],
    
    objectives_assessment JSONB DEFAULT '[]',
    scientific_results JSONB DEFAULT '{}',
    locations_summary JSONB DEFAULT '[]',
    team_performance JSONB DEFAULT '{}',
    equipment_performance JSONB DEFAULT '{}',
    financial_summary JSONB DEFAULT '{}',
    risk_management_review JSONB DEFAULT '{}',
    environmental_impact JSONB DEFAULT '{}',
    data_specimens_summary JSONB DEFAULT '{}',
    future_recommendations JSONB DEFAULT '{}',
    appendices JSONB DEFAULT '{}',
    
    distribution_list TEXT[],
    confidentiality_level VARCHAR(20) DEFAULT 'internal' CHECK (confidentiality_level IN ('public', 'internal', 'restricted', 'confidential')),
    retention_period_years INTEGER DEFAULT 7,
    archive_location VARCHAR(255),
    
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    final_report BOOLEAN DEFAULT false,
    successor_expedition_planned BOOLEAN DEFAULT false,
    successor_expedition_id UUID,
    
    CHECK (report_period_start <= report_period_end),
    CHECK (retention_period_years > 0)
);

CREATE TABLE specimens (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, 
    specimen_id VARCHAR(50) NOT NULL UNIQUE,
    mineral_name VARCHAR(255) NOT NULL,
    location_found TEXT NOT NULL,
    date_collected DATE NOT NULL,
    photo_filename VARCHAR(500),
    notes TEXT,
    gps_latitude DECIMAL(10, 8),
    gps_longitude DECIMAL(11, 8),
    location_description TEXT,
    elevation_meters INTEGER,
    formation_host_rock VARCHAR(255),
    crystal_system VARCHAR(50),
    hardness VARCHAR(20),
    color_description VARCHAR(255),
    luster_description VARCHAR(255),
    associated_minerals TEXT,
    length_cm DECIMAL(8, 3),
    width_cm DECIMAL(8, 3),
    height_cm DECIMAL(8, 3),
    weight_grams DECIMAL(10, 3),
    size_description VARCHAR(255),
    collection_method VARCHAR(255),
    weather_conditions VARCHAR(255),
    collector_name VARCHAR(255),
    collection_site_type VARCHAR(100),
    access_permission VARCHAR(255),
    streak_color VARCHAR(100),
    transparency VARCHAR(50),
    fluorescence VARCHAR(100),
    magnetism VARCHAR(50),
    specific_gravity DECIMAL(4, 2),
    cleavage_description VARCHAR(255),
    fracture_description VARCHAR(255),
    condition_rating VARCHAR(50),
    cleaning_method VARCHAR(255),
    treatment_applied VARCHAR(255),
    damage_notes TEXT,
    storage_location VARCHAR(255),
    storage_container VARCHAR(255),
    display_status VARCHAR(50),
    loan_status VARCHAR(50),
    insurance_value DECIMAL(10, 2),
    identification_confidence VARCHAR(50),
    identified_by VARCHAR(255),
    identification_date DATE,
    verification_needed BOOLEAN DEFAULT FALSE,
    research_notes TEXT,
    photo_count INTEGER DEFAULT 0,
    video_filename VARCHAR(500),
    sketch_filename VARCHAR(500),
    additional_files TEXT,
    acquisition_method VARCHAR(100),
    acquisition_cost DECIMAL(10, 2),
    acquisition_date DATE,
    previous_owner VARCHAR(255),
    data_completeness_score INTEGER,
    data_quality_rating VARCHAR(20),
    needs_review BOOLEAN DEFAULT FALSE,
    review_notes TEXT,
    created_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    modified_by VARCHAR(255),
    record_version INTEGER DEFAULT 1,
    comments JSONB DEFAULT '[]'::JSONB,
    photo_checksum VARCHAR(64),
    
    expedition_id UUID,
    expedition_location_id UUID,

    CHECK (gps_latitude BETWEEN -90 AND 90),
    CHECK (gps_longitude BETWEEN -180 AND 180),
    CHECK (data_completeness_score BETWEEN 0 AND 100),
    CHECK (specific_gravity > 0),
    CHECK (weight_grams >= 0),
    CHECK (length_cm >= 0),
    CHECK (width_cm >= 0),
    CHECK (height_cm >= 0),
    CHECK (photo_count >= 0),
    CHECK (insurance_value IS NULL OR insurance_value >= 0),
    CHECK (acquisition_cost IS NULL OR acquisition_cost >= 0),
    CHECK (record_version >= 1)
);

CREATE INDEX idx_specimens_mineral_name ON specimens(mineral_name);
CREATE INDEX idx_specimens_date_collected ON specimens(date_collected);
CREATE INDEX idx_specimens_location ON specimens(location_found);
CREATE INDEX idx_specimens_collector ON specimens(collector_name);
CREATE INDEX idx_specimens_crystal_system ON specimens(crystal_system);
CREATE INDEX idx_specimens_specimen_id ON specimens(specimen_id);
CREATE INDEX idx_specimens_created_timestamp ON specimens(created_timestamp);
CREATE INDEX idx_specimens_gps_coords ON specimens(gps_latitude, gps_longitude);
CREATE INDEX idx_specimens_flags ON specimens(needs_review, verification_needed);
CREATE INDEX idx_specimens_ident ON specimens(identified_by, identification_date);
CREATE INDEX idx_specimens_expedition_id ON specimens(expedition_id);
CREATE INDEX idx_specimens_expedition_location_id ON specimens(expedition_location_id);

CREATE INDEX idx_expeditions_status ON expeditions(status);
CREATE INDEX idx_expeditions_dates ON expeditions(start_date, end_date);
CREATE INDEX idx_expeditions_leader ON expeditions(leader_name);
CREATE INDEX idx_expeditions_created_at ON expeditions(created_at);
CREATE INDEX idx_expeditions_priority ON expeditions(priority);
CREATE INDEX idx_expeditions_type ON expeditions(expedition_type);
CREATE INDEX idx_expeditions_archived ON expeditions(archived);

CREATE INDEX idx_expedition_locations_expedition_id ON expedition_locations(expedition_id);
CREATE INDEX idx_expedition_locations_coords ON expedition_locations(latitude, longitude);
CREATE INDEX idx_expedition_locations_type ON expedition_locations(location_type);
CREATE INDEX idx_expedition_locations_priority ON expedition_locations(priority);
CREATE INDEX idx_expedition_locations_visited ON expedition_locations(visited);

CREATE INDEX idx_expedition_equipment_expedition_id ON expedition_equipment(expedition_id);
CREATE INDEX idx_expedition_equipment_category ON expedition_equipment(category);
CREATE INDEX idx_expedition_equipment_priority ON expedition_equipment(priority);

CREATE INDEX idx_expedition_weather_expedition_id ON expedition_weather_data(expedition_id);
CREATE INDEX idx_expedition_weather_location_id ON expedition_weather_data(location_id);
CREATE INDEX idx_expedition_weather_date ON expedition_weather_data(observation_date);

CREATE INDEX idx_expedition_reports_expedition_id ON expedition_reports(expedition_id);
CREATE INDEX idx_expedition_reports_type ON expedition_reports(report_type);
CREATE INDEX idx_expedition_reports_date ON expedition_reports(report_date);
CREATE INDEX idx_expedition_reports_status ON expedition_reports(review_status);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_expeditions_updated_at BEFORE UPDATE ON expeditions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expedition_locations_updated_at BEFORE UPDATE ON expedition_locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expedition_planning_updated_at BEFORE UPDATE ON expedition_planning FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expedition_equipment_updated_at BEFORE UPDATE ON expedition_equipment FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expedition_weather_data_updated_at BEFORE UPDATE ON expedition_weather_data FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expedition_risk_assessments_updated_at BEFORE UPDATE ON expedition_risk_assessments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expedition_logistics_updated_at BEFORE UPDATE ON expedition_logistics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expedition_reports_updated_at BEFORE UPDATE ON expedition_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION update_expedition_counters()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE expeditions SET 
        total_locations = (SELECT COUNT(*) FROM expedition_locations WHERE expedition_id = COALESCE(NEW.expedition_id, OLD.expedition_id)),
        total_specimens_collected = (SELECT COUNT(*) FROM specimens WHERE expedition_id = COALESCE(NEW.expedition_id, OLD.expedition_id)),
        total_equipment_items = (SELECT COUNT(*) FROM expedition_equipment WHERE expedition_id = COALESCE(NEW.expedition_id, OLD.expedition_id)),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = COALESCE(NEW.expedition_id, OLD.expedition_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

CREATE TRIGGER update_expedition_counters_locations AFTER INSERT OR UPDATE OR DELETE ON expedition_locations 
    FOR EACH ROW EXECUTE FUNCTION update_expedition_counters();
CREATE TRIGGER update_expedition_counters_equipment AFTER INSERT OR UPDATE OR DELETE ON expedition_equipment 
    FOR EACH ROW EXECUTE FUNCTION update_expedition_counters();
CREATE TRIGGER update_expedition_counters_specimens AFTER INSERT OR UPDATE OR DELETE ON specimens 
    FOR EACH ROW EXECUTE FUNCTION update_expedition_counters();

CREATE OR REPLACE VIEW specimen_summary AS
SELECT 
    s.specimen_id,
    s.mineral_name,
    s.location_found,
    s.date_collected,
    s.collector_name,
    e.name AS expedition_name,
    el.name AS expedition_location_name,
    CASE 
        WHEN s.length_cm IS NOT NULL AND s.width_cm IS NOT NULL AND s.height_cm IS NOT NULL
        THEN CAST(s.length_cm AS TEXT) || ' x ' || CAST(s.width_cm AS TEXT) || ' x ' || CAST(s.height_cm AS TEXT) || ' cm'
        ELSE s.size_description
    END AS dimensions,
    s.weight_grams,
    s.crystal_system,
    s.hardness,
    s.created_timestamp
FROM specimens s
LEFT JOIN expeditions e ON s.expedition_id = e.id
LEFT JOIN expedition_locations el ON s.expedition_location_id = el.id
ORDER BY s.date_collected DESC;

CREATE OR REPLACE VIEW specimen_locations AS
SELECT 
    s.specimen_id,
    s.mineral_name,
    s.gps_latitude,
    s.gps_longitude,
    s.location_found,
    s.date_collected,
    e.name AS expedition_name,
    e.status AS expedition_status
FROM specimens s
LEFT JOIN expeditions e ON s.expedition_id = e.id
WHERE s.gps_latitude IS NOT NULL AND s.gps_longitude IS NOT NULL;

CREATE OR REPLACE VIEW collection_stats AS
SELECT 
    COUNT(*) AS total_specimens,
    COUNT(DISTINCT s.mineral_name) AS unique_minerals,
    COUNT(DISTINCT s.collector_name) AS collectors,
    COUNT(DISTINCT s.expedition_id) AS expeditions_with_specimens,
    MIN(s.date_collected) AS earliest_specimen,
    MAX(s.date_collected) AS latest_specimen,
    AVG(s.weight_grams) AS avg_weight_grams,
    SUM(CASE WHEN s.photo_filename IS NOT NULL THEN 1 ELSE 0 END) AS specimens_with_photos
FROM specimens s;

CREATE OR REPLACE VIEW expedition_summary AS
SELECT 
    e.id,
    e.name,
    e.status,
    e.start_date,
    e.end_date,
    e.leader_name,
    e.location_general,
    e.total_locations,
    e.total_specimens_collected,
    e.total_equipment_items,
    e.completion_percentage,
    COALESCE(e.actual_cost, e.budget) AS budget_amount,
    COUNT(DISTINCT er.id) AS total_reports,
    MAX(er.report_date) AS latest_report_date
FROM expeditions e
LEFT JOIN expedition_reports er ON e.id = er.expedition_id
GROUP BY e.id, e.name, e.status, e.start_date, e.end_date, e.leader_name, 
         e.location_general, e.total_locations, e.total_specimens_collected, 
         e.total_equipment_items, e.completion_percentage, e.actual_cost, e.budget
ORDER BY e.start_date DESC;

CREATE OR REPLACE VIEW active_expeditions AS
SELECT * FROM expedition_summary 
WHERE status IN ('planning', 'active')
ORDER BY start_date ASC;

CREATE OR REPLACE VIEW location_summary AS
SELECT 
    el.id,
    el.expedition_id,
    e.name AS expedition_name,
    el.name AS location_name,
    el.latitude,
    el.longitude,
    el.location_type,
    el.priority,
    el.visited,
    el.specimens_collected,
    el.photos_taken,
    el.success_rating,
    COUNT(s.id) AS linked_specimens
FROM expedition_locations el
JOIN expeditions e ON el.expedition_id = e.id
LEFT JOIN specimens s ON el.id = s.expedition_location_id
GROUP BY el.id, e.name, el.name, el.latitude, el.longitude, 
         el.location_type, el.priority, el.visited, el.specimens_collected, 
         el.photos_taken, el.success_rating;

INSERT INTO expeditions (
    name, description, status, start_date, end_date, leader_name, 
    participants, budget, objectives, location_general, expedition_type,
    difficulty_level, emergency_contact, created_by
) VALUES
(
    'Colorado Quartz Survey 2024',
    'Comprehensive survey of quartz formations in the Colorado Rockies with focus on crystal quality and geological context.',
    'completed',
    '2024-06-15',
    '2024-06-22',
    'Dr. Sarah Johnson',
    ARRAY['Mike Chen', 'Lisa Rodriguez', 'Tom Wilson'],
    15000.00,
    'Document quartz crystal formations, collect high-quality specimens, and create detailed geological maps of the survey area.',
    'Colorado Rockies',
    'research',
    'moderate',
    'Emergency Services: 911, Local Ranger Station: (970) 555-0123',
    'app_user'
),
(
    'Utah Fossil Expedition',
    'Search for Triassic period fossils in Utah desert regions with paleontological team.',
    'completed',
    '2024-07-10',
    '2024-07-18',
    'Prof. David Kim',
    ARRAY['Anna White', 'Carlos Santos', 'Elena Martinez'],
    12000.00,
    'Locate and document Triassic fossils, create stratigraphic sections, and collect samples for laboratory analysis.',
    'Utah Desert',
    'research',
    'difficult',
    'Emergency Services: 911, Field Station: (435) 555-0156',
    'app_user'
),
(
    'Montana Mineral Collecting Trip',
    'Educational expedition for mineral collecting in Montana sapphire regions.',
    'planning',
    '2024-09-15',
    '2024-09-20',
    'Jennifer Adams',
    ARRAY['Student Group A', 'Graduate Assistant'],
    8000.00,
    'Educational mineral collecting experience, field geology training, and specimen documentation.',
    'Montana Sapphire Fields',
    'educational',
    'easy',
    'Emergency Services: 911, University Field Office: (406) 555-0189',
    'app_user'
);

INSERT INTO expedition_locations (
    expedition_id, name, description, latitude, longitude, elevation_meters,
    location_type, priority, geological_interest, expected_minerals,
    access_difficulty, created_by
) VALUES
(
    (SELECT id FROM expeditions WHERE name = 'Colorado Quartz Survey 2024'),
    'Crystal Peak Base Camp',
    'Main base camp location with good vehicle access and facilities.',
    39.7392000,
    -104.9903000,
    2100,
    'base_camp',
    'high',
    'Central access point for survey operations',
    ARRAY['Quartz', 'Feldspar', 'Mica'],
    'easy',
    'app_user'
),
(
    (SELECT id FROM expeditions WHERE name = 'Colorado Quartz Survey 2024'),
    'North Ridge Outcrop',
    'Large quartz crystal formation exposed on north-facing ridge.',
    39.7500000,
    -104.9800000,
    2350,
    'target_site',
    'high',
    'Exceptional smoky quartz crystals up to 15cm in length',
    ARRAY['Smoky Quartz', 'Clear Quartz', 'Amazonite'],
    'moderate',
    'app_user'
),
(
    (SELECT id FROM expeditions WHERE name = 'Colorado Quartz Survey 2024'),
    'Emergency Shelter Point',
    'Pre-positioned emergency shelter and supply cache.',
    39.7450000,
    -104.9750000,
    2280,
    'emergency_point',
    'critical',
    'Safety waypoint with emergency supplies',
    ARRAY[]::integer[],
    'moderate',
    'app_user'
);

INSERT INTO expedition_equipment (
    expedition_id, category, item_name, description, quantity_required,
    quantity_available, unit_weight_kg, unit_cost, source, priority, created_by
) VALUES
(
    (SELECT id FROM expeditions WHERE name = 'Colorado Quartz Survey 2024'),
    'geological',
    'Geological Hammers',
    'Professional geological hammers for specimen extraction',
    4,
    4,
    0.6,
    85.00,
    'owned',
    'essential',
    'app_user'
),
(
    (SELECT id FROM expeditions WHERE name = 'Colorado Quartz Survey 2024'),
    'safety',
    'First Aid Kits',
    'Comprehensive wilderness first aid kits',
    2,
    2,
    1.2,
    150.00,
    'owned',
    'essential',
    'app_user'
),
(
    (SELECT id FROM expeditions WHERE name = 'Colorado Quartz Survey 2024'),
    'documentation',
    'Field Notebooks',
    'Waterproof field data recording notebooks',
    6,
    8,
    0.3,
    25.00,
    'owned',
    'important',
    'app_user'
);

UPDATE specimens 
SET expedition_id = (SELECT id FROM expeditions WHERE name = 'Colorado Quartz Survey 2024'),
    expedition_location_id = (SELECT id FROM expedition_locations WHERE name = 'North Ridge Outcrop')
WHERE specimen_id = 'DL-001';

INSERT INTO specimens (
    specimen_id, mineral_name, location_found, date_collected,
    photo_filename, notes,
    gps_latitude, gps_longitude, location_description, elevation_meters,
    formation_host_rock, crystal_system, hardness, color_description, luster_description,
    associated_minerals,
    length_cm, width_cm, height_cm, weight_grams, size_description,
    collection_method, weather_conditions, collector_name, collection_site_type, access_permission,
    streak_color, transparency, fluorescence, magnetism, specific_gravity,
    cleavage_description, fracture_description, condition_rating, cleaning_method, treatment_applied, damage_notes,
    storage_location, storage_container, display_status, loan_status, insurance_value,
    identification_confidence, identified_by, identification_date, verification_needed,
    research_notes, photo_count, video_filename, sketch_filename, additional_files,
    acquisition_method, acquisition_cost, acquisition_date, previous_owner,
    data_completeness_score, data_quality_rating, needs_review, review_notes,
    created_timestamp, modified_timestamp, created_by, modified_by, record_version, photo_checksum,
    expedition_id, expedition_location_id
) VALUES
(
    'DL-001',
    'Quartz (Clear Crystal Cluster)',
    'Crystal Creek Trail, Arkansas Crystal Mountains',
    DATE '2024-07-15',
    'DL-001_quartz_cluster.jpg',
    'Found in pegmatite pocket ~3 ft below surface. Clear–translucent hexagonal crystals up to 2". Minor inclusions; mostly excellent terminations.',
    34.54120000, -93.27310000,
    'South-facing slope near creek bend; loose gravel with pegmatite boulders.',
    320,
    'Pegmatite',
    'Hexagonal',
    '7',
    'Clear to translucent',
    'Vitreous',
    'Feldspar, mica',
    11.400, 8.100, 7.100, 952.500, 'Miniature cabinet',
    'Hand excavation with small pick and brush',
    'Sunny, light breeze',
    'Field Team',
    'Natural outcrop',
    'Public access (permit on file)',
    'White',
    'Transparent',
    'Non-fluorescent',
    'Non-magnetic',
    2.65,
    'No cleavage',
    'Conchoidal',
    'Excellent',
    'Water wash only',
    'None',
    'Tiny chip on one termination',
    'Cabinet A / Drawer 3',
    'Padded tray',
    'In storage',
    'Not on loan',
    500.00,
    'Certain',
    'J. Doe',
    DATE '2024-07-20',
    FALSE,
    'Compare inclusions with ref. sample QZ-12.',
    4,
    'DL-001_overview.mp4',
    'DL-001_sketch.png',
    'ref_report_QZ12.pdf',
    'Field collecting',
    0.00,
    DATE '2024-07-15',
    'N/A',
    90,
    'Excellent',
    FALSE,
    'Ready for display rotation.',
    NOW(), NOW(),
    'app_user',
    'app_user',
    1,
    '',
    (SELECT id FROM expeditions WHERE name = 'Colorado Quartz Survey 2024'),
    (SELECT id FROM expedition_locations WHERE name = 'North Ridge Outcrop')
),
(
    'DL-002',
    'Pyrite (Fool''s Gold)',
    'Abandoned Mine Shaft, Colorado Rockies',
    DATE '2024-08-03',
    'DL-002_pyrite_cubes.jpg',
    'Perfect cubic crystals with brilliant metallic luster in quartz matrix. No oxidation; striated faces present.',
    39.73920000, -105.01780000,
    'Old vein exposure in adit wall; stable footing; minimal groundwater.',
    2740,
    'Hydrothermal quartz vein',
    'Cubic',
    '6-6.5',
    'Brassy yellow',
    'Metallic',
    'Quartz, chalcopyrite traces',
    5.300, 4.600, 3.800, 362.900, 'Thumbnail',
    'Matrix extraction with chisel',
    'Overcast, cool',
    'Field Team',
    'Mine',
    'Private permission obtained',
    'Greenish-black',
    'Opaque',
    'Weak blue under LW-UV',
    'Weakly magnetic',
    5.02,
    'Poor/indistinct',
    'Uneven',
    'Very good',
    'Mechanical scrub + mild detergent',
    'Paraloid B-72 consolidation on micro-fractures',
    'Minor scrape on matrix edge',
    'Cabinet B / Drawer 1',
    'Small specimen box',
    'In storage',
    'Not on loan',
    850.00,
    'Probable',
    'A. Smith',
    DATE '2024-08-05',
    FALSE,
    'Check for trace As/Co with handheld XRF next session.',
    3,
    'DL-002_spin.mp4',
    'DL-002_face_grid.png',
    'xrf_plan.txt',
    'Field collecting',
    0.00,
    DATE '2024-08-03',
    'N/A',
    85,
    'Good',
    TRUE,
    'Revisit site for larger matrix piece.',
    NOW(), NOW(),
    'app_user',
    'app_user',
    1,
    '',
    (SELECT id FROM expeditions WHERE name = 'Colorado Quartz Survey 2024'),
    (SELECT id FROM expedition_locations WHERE name = 'North Ridge Outcrop')
),
(
    'DL-003',
    'Amethyst (Purple Quartz Geode)',
    'Private quarry, Thunder Bay area, Ontario',
    DATE '2024-06-22',
    'DL-003_amethyst_geode.jpg',
    'Partial geode; deep purple crystals line interior. Agate banding on exterior; phantom growth zones on select crystals.',
    48.38090000, -89.24770000,
    'Talus near basalt flow margin; geode half in situ; careful extraction.',
    415,
    'Basalt vesicle/gas bubble',
    'Hexagonal',
    '7',
    'Purple gradient',
    'Vitreous',
    'Agate, chalcedony',
    15.700, 12.200, 7.900, 1678.300, 'Cabinet',
    'Found loose on quarry floor',
    'Partly cloudy, humid',
    'Field Team Expedition',
    'Quarry',
    'Private permission obtained',
    'White',
    'Translucent',
    'Weak violet LW-UV',
    'Non-magnetic',
    2.65,
    'None observed',
    'Conchoidal to uneven',
    'Good',
    'Water rinse + soft brush',
    'None',
    'Minor natural pitting on outer rind',
    'Display Case 2 / Shelf 1',
    'Custom foam cradle',
    'On display',
    'Not on loan',
    1200.00,
    'Certain',
    'K. Lee',
    DATE '2024-06-25',
    FALSE,
    'Consider thin section for zoning study.',
    6,
    'DL-003_showcase.mp4',
    'DL-003_cross_section.png',
    'geochem_report_stub.pdf',
    'Field collecting',
    0.00,
    DATE '2024-06-22',
    'N/A',
    92,
    'Excellent',
    FALSE,
    'Rotate off display during high UV demos.',
    NOW(), NOW(),
    'app_user',
    'app_user',
    1,
    '',
    NULL, 
    NULL
);
