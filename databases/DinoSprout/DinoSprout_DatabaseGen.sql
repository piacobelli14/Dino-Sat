DROP TABLE IF EXISTS control_commands CASCADE;
CREATE TABLE control_commands (
    command_id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    component_serial VARCHAR(50) NOT NULL,
    command_type VARCHAR(50) NOT NULL, 
    command_value TEXT,
    priority INT NOT NULL DEFAULT 5,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    executed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    user_id VARCHAR(50),
    manual_override BOOLEAN DEFAULT FALSE,
    safety_check_passed BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_control_commands_timestamp ON control_commands (timestamp);
CREATE INDEX IF NOT EXISTS idx_control_commands_component_serial ON control_commands (component_serial);
CREATE INDEX IF NOT EXISTS idx_control_commands_status ON control_commands (status);
CREATE INDEX IF NOT EXISTS idx_control_commands_priority ON control_commands (priority);

DROP TABLE IF EXISTS component_status CASCADE;
CREATE TABLE component_status (
    status_id SERIAL PRIMARY KEY,
    component_serial VARCHAR(50) NOT NULL UNIQUE,
    component_type VARCHAR(100) NOT NULL,
    current_state VARCHAR(50) NOT NULL DEFAULT 'idle', 
    current_value DECIMAL(10,2),
    target_value DECIMAL(10,2),
    last_command_id INT REFERENCES control_commands(command_id),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    runtime_minutes INT DEFAULT 0,
    manual_mode BOOLEAN DEFAULT FALSE,
    safety_lockout BOOLEAN DEFAULT FALSE,
    error_code VARCHAR(50),
    temperature_c DECIMAL(4,1), 
    power_consumption_w DECIMAL(6,2),
    notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_component_status_component_serial ON component_status (component_serial);
CREATE INDEX IF NOT EXISTS idx_component_status_component_type ON component_status (component_type);
CREATE INDEX IF NOT EXISTS idx_component_status_current_state ON component_status (current_state);
CREATE INDEX IF NOT EXISTS idx_component_status_last_updated ON component_status (last_updated);

DROP TABLE IF EXISTS system_overrides CASCADE;
CREATE TABLE system_overrides (
    override_id SERIAL PRIMARY KEY,
    override_type VARCHAR(50) NOT NULL, 
    component_serial VARCHAR(50),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    reason TEXT NOT NULL,
    enabled_by VARCHAR(50) NOT NULL,
    enabled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    disabled_at TIMESTAMP WITH TIME ZONE,
    disabled_by VARCHAR(50),
    auto_expire_at TIMESTAMP WITH TIME ZONE,
    notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_system_overrides_override_type ON system_overrides (override_type);
CREATE INDEX IF NOT EXISTS idx_system_overrides_component_serial ON system_overrides (component_serial);
CREATE INDEX IF NOT EXISTS idx_system_overrides_enabled ON system_overrides (enabled);

DROP TABLE IF EXISTS control_presets CASCADE;
CREATE TABLE control_presets (
    preset_id SERIAL PRIMARY KEY,
    preset_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    preset_data JSONB NOT NULL, 
    preset_type VARCHAR(50) NOT NULL, 
    created_by VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used TIMESTAMP WITH TIME ZONE,
    active BOOLEAN DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_control_presets_preset_name ON control_presets (preset_name);
CREATE INDEX IF NOT EXISTS idx_control_presets_preset_type ON control_presets (preset_type);

ALTER TABLE electronics_components ADD COLUMN IF NOT EXISTS manual_control_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE electronics_components ADD COLUMN IF NOT EXISTS safety_interlock BOOLEAN DEFAULT FALSE;
ALTER TABLE electronics_components ADD COLUMN IF NOT EXISTS max_runtime_minutes INT DEFAULT NULL;
ALTER TABLE electronics_components ADD COLUMN IF NOT EXISTS cooldown_minutes INT DEFAULT 0;

ALTER TABLE automation_rules ADD COLUMN IF NOT EXISTS manual_override_allowed BOOLEAN DEFAULT TRUE;
ALTER TABLE automation_rules ADD COLUMN IF NOT EXISTS safety_critical BOOLEAN DEFAULT FALSE;

INSERT INTO control_commands (component_serial, command_type, command_value, priority, status, user_id, manual_override, notes) VALUES
('SN-PUMP-456', 'activate', '{"duration_seconds": 300, "flow_rate": 100}', 5, 'completed', 'admin', TRUE, 'Manual pump test'),
('SN-FAN-001', 'set_value', '{"speed_percentage": 75}', 3, 'pending', 'operator1', FALSE, 'Climate adjustment'),
('SN-HEAT-001', 'activate', '{"power_level": 40, "duration_seconds": 1800}', 5, 'executing', 'admin', TRUE, 'Night heating');

INSERT INTO component_status (component_serial, component_type, current_state, current_value, target_value, runtime_minutes, manual_mode, temperature_c, power_consumption_w, notes) VALUES
('SN-PH-123', 'pH Sensor', 'active', 6.1, NULL, 0, FALSE, 25.0, 0.5, 'Reading normally'),
('SN-PUMP-456', 'Pump', 'active', 100.0, 100.0, 45, TRUE, 35.0, 12.0, 'Manual mode active'),
('SN-FAN-001', 'Fan', 'active', 75.0, 75.0, 120, FALSE, 28.0, 45.0, 'Climate control'),
('SN-HEAT-001', 'Heater', 'idle', 0.0, 40.0, 0, FALSE, 22.0, 0.0, 'Standby'),
('SN-PAR-789', 'PAR Sensor', 'active', 320.0, NULL, 0, FALSE, 24.0, 0.25, 'Light monitoring');

INSERT INTO control_presets (preset_name, description, preset_data, preset_type, created_by) VALUES
('Seedling Stage', 'Optimal settings for seedling growth', '{"temperature": 22, "humidity": 80, "light_hours": 18, "ph_target": 6.0}', 'full_system', 'admin'),
('Flowering Boost', 'Enhanced settings for flowering phase', '{"temperature": 26, "humidity": 50, "light_hours": 12, "co2_ppm": 1200}', 'climate', 'operator1'),
('Night Mode', 'Reduced activity settings for night cycle', '{"temperature": 18, "humidity": 60, "all_lights": false}', 'lighting', 'admin');

INSERT INTO system_overrides (override_type, component_serial, reason, enabled_by, notes) VALUES
('manual_control', 'SN-PUMP-456', 'Testing new dosing schedule', 'admin', 'Will disable after testing'),
('maintenance_mode', 'SN-FAN-002', 'Cleaning and inspection', 'technician', 'Scheduled maintenance');

DROP TABLE IF EXISTS crops CASCADE;
CREATE TABLE crops (
    crop_id SERIAL PRIMARY KEY,
    crop_name VARCHAR(100) NOT NULL UNIQUE,
    scientific_name VARCHAR(100),
    variety VARCHAR(100),
    description TEXT,
    target_ph_min DECIMAL(3,1) NOT NULL,
    target_ph_max DECIMAL(3,1) NOT NULL,
    target_ec_min DECIMAL(4,2) NOT NULL,
    target_ec_max DECIMAL(4,2) NOT NULL,
    target_tds_min INT,
    target_tds_max INT,
    light_cycle_vegetative_hours INT NOT NULL,
    light_cycle_flowering_hours INT NOT NULL,
    optimal_water_temperature_min DECIMAL(4,1) NOT NULL,
    optimal_water_temperature_max DECIMAL(4,1) NOT NULL,
    optimal_air_temperature_min DECIMAL(4,1) NOT NULL,
    optimal_air_temperature_max DECIMAL(4,1) NOT NULL,
    optimal_humidity_min DECIMAL(5,2),
    optimal_humidity_max DECIMAL(5,2),
    optimal_vpd_min DECIMAL(4,2),
    optimal_vpd_max DECIMAL(4,2),
    optimal_par_min INT,
    optimal_par_max INT,
    optimal_dli_min DECIMAL(5,2),
    optimal_dli_max DECIMAL(5,2),
    growth_duration_days INT NOT NULL,
    vegetative_duration_days INT,
    flowering_duration_days INT,
    seed_to_harvest_days INT,
    expected_yield_per_plant DECIMAL(6,2),
    yield_unit VARCHAR(50),
    nutrient_requirements TEXT,
    preferred_hydro_system VARCHAR(50),
    root_zone_oxygen_min DECIMAL(4,2),
    root_zone_oxygen_max DECIMAL(4,2),
    co2_optimal_ppm INT,
    pest_resistance_rating INT,
    disease_resistance_rating INT,
    drought_tolerance_rating INT,
    heat_tolerance_rating INT,
    cold_tolerance_rating INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_crops_crop_name ON crops (crop_name);
CREATE INDEX IF NOT EXISTS idx_crops_scientific_name ON crops (scientific_name);
INSERT INTO crops (crop_name, scientific_name, variety, description, target_ph_min, target_ph_max, target_ec_min, target_ec_max, target_tds_min, target_tds_max, light_cycle_vegetative_hours, light_cycle_flowering_hours, optimal_water_temperature_min, optimal_water_temperature_max, optimal_air_temperature_min, optimal_air_temperature_max, optimal_humidity_min, optimal_humidity_max, optimal_vpd_min, optimal_vpd_max, optimal_par_min, optimal_par_max, optimal_dli_min, optimal_dli_max, growth_duration_days, vegetative_duration_days, flowering_duration_days, seed_to_harvest_days, expected_yield_per_plant, yield_unit, nutrient_requirements, preferred_hydro_system, root_zone_oxygen_min, root_zone_oxygen_max, co2_optimal_ppm, pest_resistance_rating, disease_resistance_rating, drought_tolerance_rating, heat_tolerance_rating, cold_tolerance_rating)
VALUES
('Lettuce', 'Lactuca sativa', 'Butterhead', 'Leafy green vegetable, fast-growing', 5.5, 6.5, 1.00, 2.00, 500, 1000, 18, 12, 18.0, 24.0, 20.0, 25.0, 40.00, 60.00, 0.80, 1.20, 200, 400, 14.00, 20.00, 30, 20, 10, 30, 200.00, 'grams', 'High nitrogen in veg, balanced in flower', 'NFT', 6.00, 8.00, 800, 7, 8, 6, 5, 7),
('Tomato', 'Solanum lycopersicum', 'Cherry', 'Fruiting plant, indeterminate', 5.8, 6.8, 2.00, 3.50, 1000, 1750, 18, 12, 20.0, 26.0, 22.0, 28.0, 50.00, 70.00, 1.00, 1.50, 500, 800, 20.00, 40.00, 90, 45, 45, 90, 500.00, 'grams', 'Balanced NPK, high potassium in flower', 'DWC', 5.00, 7.00, 1200, 6, 7, 7, 8, 5),
('Basil', 'Ocimum basilicum', 'Genovese', 'Herb, aromatic', 5.5, 6.5, 1.20, 2.20, 600, 1100, 16, 12, 18.0, 25.0, 20.0, 26.0, 40.00, 60.00, 0.90, 1.30, 300, 500, 16.00, 22.00, 45, 30, 15, 45, 150.00, 'grams', 'Moderate NPK', 'Aeroponics', 6.50, 8.50, 900, 8, 9, 5, 6, 8);

DROP TABLE IF EXISTS crop_stages CASCADE;
CREATE TABLE crop_stages (
    stage_id SERIAL PRIMARY KEY,
    crop_id INT NOT NULL REFERENCES crops(crop_id),
    stage_name VARCHAR(50) NOT NULL,
    duration_days INT NOT NULL,
    target_ph_min DECIMAL(3,1),
    target_ph_max DECIMAL(3,1),
    target_ec_min DECIMAL(4,2),
    target_ec_max DECIMAL(4,2),
    light_hours INT,
    optimal_temperature_min DECIMAL(4,1),
    optimal_temperature_max DECIMAL(4,1),
    optimal_humidity_min DECIMAL(5,2),
    optimal_humidity_max DECIMAL(5,2),
    nutrient_ratio_npk VARCHAR(20),
    co2_ppm INT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_crop_stages_crop_id ON crop_stages (crop_id);
CREATE INDEX IF NOT EXISTS idx_crop_stages_stage_name ON crop_stages (stage_name);
INSERT INTO crop_stages (crop_id, stage_name, duration_days, target_ph_min, target_ph_max, target_ec_min, target_ec_max, light_hours, optimal_temperature_min, optimal_temperature_max, optimal_humidity_min, optimal_humidity_max, nutrient_ratio_npk, co2_ppm, notes)
VALUES
(1, 'Seedling', 10, 5.8, 6.2, 0.80, 1.20, 18, 22.0, 25.0, 60.00, 80.00, '5-5-5', 600, 'High humidity for germination'),
(1, 'Vegetative', 15, 5.5, 6.5, 1.00, 1.80, 18, 20.0, 24.0, 50.00, 70.00, '10-5-5', 800, 'Focus on leaf growth'),
(2, 'Flowering', 45, 5.8, 6.5, 2.50, 3.50, 12, 22.0, 28.0, 40.00, 60.00, '5-10-10', 1200, 'Fruit set stage');

DROP TABLE IF EXISTS growth_cycles CASCADE;
CREATE TABLE growth_cycles (
    cycle_id SERIAL PRIMARY KEY,
    cycle_name VARCHAR(100) NOT NULL UNIQUE,
    start_date DATE NOT NULL,
    end_date DATE,
    crop_type VARCHAR(100) NOT NULL,
    phase VARCHAR(50) NOT NULL,
    number_of_plants INT NOT NULL,
    system_location VARCHAR(100),
    hydro_system_type VARCHAR(50),
    total_area_sqft DECIMAL(6,2),
    planting_density_per_sqft INT,
    notes TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_growth_cycles_cycle_name ON growth_cycles (cycle_name);
CREATE INDEX IF NOT EXISTS idx_growth_cycles_crop_type ON growth_cycles (crop_type);
CREATE INDEX IF NOT EXISTS idx_growth_cycles_status ON growth_cycles (status);
CREATE INDEX IF NOT EXISTS idx_growth_cycles_start_date ON growth_cycles (start_date);
INSERT INTO growth_cycles (cycle_name, start_date, end_date, crop_type, phase, number_of_plants, system_location, hydro_system_type, total_area_sqft, planting_density_per_sqft, notes, status)
VALUES
('Cycle-Lettuce-2025', '2025-08-01', NULL, 'Lettuce', 'Vegetative', 50, 'Greenhouse A', 'NFT', 100.00, 5, 'Initial planting, monitoring EC', 'Active'),
('Cycle-Tomato-2025', '2025-07-15', '2025-10-15', 'Tomato', 'Flowering', 20, 'Greenhouse B', 'DWC', 200.00, 2, 'Pest monitoring, pruning required', 'Active'),
('Cycle-Basil-2025', '2025-08-10', NULL, 'Basil', 'Vegetative', 100, 'Indoor Room C', 'Aeroponics', 50.00, 10, 'High density planting', 'Active');

DROP TABLE IF EXISTS individual_plants CASCADE;
CREATE TABLE individual_plants (
    plant_id SERIAL PRIMARY KEY,
    cycle_id INT NOT NULL REFERENCES growth_cycles(cycle_id),
    plant_number INT NOT NULL,
    transplant_date DATE,
    current_stage VARCHAR(50),
    height_cm DECIMAL(5,2),
    leaf_count INT,
    health_score INT CHECK (health_score BETWEEN 1 AND 10),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_individual_plants_cycle_id ON individual_plants (cycle_id);
CREATE INDEX IF NOT EXISTS idx_individual_plants_current_stage ON individual_plants (current_stage);
INSERT INTO individual_plants (cycle_id, plant_number, transplant_date, current_stage, height_cm, leaf_count, health_score, notes)
VALUES
(1, 1, '2025-08-05', 'Vegetative', 15.00, 8, 9, 'Healthy growth'),
(1, 2, '2025-08-05', 'Vegetative', 14.50, 7, 8, 'Slight yellowing on leaf'),
(2, 1, '2025-07-20', 'Flowering', 50.00, 20, 7, 'Flowers emerging');

DROP TABLE IF EXISTS seeding CASCADE;
CREATE TABLE seeding (
    seed_id SERIAL PRIMARY KEY,
    seed_batch_code VARCHAR(50) NOT NULL UNIQUE,
    crop_type VARCHAR(100) NOT NULL,
    seed_quantity INT NOT NULL,
    seed_source VARCHAR(100) NOT NULL,
    seed_cost DECIMAL(10,2),
    seeding_date DATE NOT NULL,
    germination_expected_date DATE,
    viability_percentage DECIMAL(5,2) NOT NULL,
    storage_conditions TEXT,
    seed_treatment VARCHAR(100),
    scarification_method VARCHAR(100),
    stratification_days INT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_seeding_seed_batch_code ON seeding (seed_batch_code);
CREATE INDEX IF NOT EXISTS idx_seeding_crop_type ON seeding (crop_type);
CREATE INDEX IF NOT EXISTS idx_seeding_seeding_date ON seeding (seeding_date);
INSERT INTO seeding (seed_batch_code, crop_type, seed_quantity, seed_source, seed_cost, seeding_date, germination_expected_date, viability_percentage, storage_conditions, seed_treatment, scarification_method, stratification_days, notes)
VALUES
('BATCH-LETT-001', 'Lettuce', 100, 'Supplier X', 25.00, '2025-08-01', '2025-08-05', 95.00, 'Cool and dry', 'Fungicide', NULL, 0, 'High quality seeds'),
('BATCH-TOM-001', 'Tomato', 50, 'Supplier Y', 40.00, '2025-07-15', '2025-07-20', 90.00, 'Refrigerated', 'None', 'Sandpaper', 0, 'Organic seeds'),
('BATCH-BAS-001', 'Basil', 200, 'Supplier Z', 15.00, '2025-08-10', '2025-08-15', 98.00, 'Room temp', 'Priming', NULL, 0, 'Aromatic variety');

DROP TABLE IF EXISTS germination CASCADE;
CREATE TABLE germination (
    germination_id SERIAL PRIMARY KEY,
    batch_code VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    temperature DECIMAL(4,1) NOT NULL,
    humidity DECIMAL(5,2) NOT NULL,
    light_exposure_hours INT,
    success_rate DECIMAL(5,2),
    failed_seeds_count INT,
    radicle_emergence_rate DECIMAL(5,2),
    hypocotyl_length_avg_cm DECIMAL(4,2),
    notes TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'In Progress',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_germination_batch_code ON germination (batch_code);
CREATE INDEX IF NOT EXISTS idx_germination_start_date ON germination (start_date);
CREATE INDEX IF NOT EXISTS idx_germination_status ON germination (status);
INSERT INTO germination (batch_code, start_date, end_date, temperature, humidity, light_exposure_hours, success_rate, failed_seeds_count, radicle_emergence_rate, hypocotyl_length_avg_cm, notes, status)
VALUES
('BATCH-LETT-001', '2025-08-01', '2025-08-05', 22.0, 80.00, 12, 95.00, 5, 90.00, 2.50, 'Good progress', 'Completed'),
('BATCH-TOM-001', '2025-07-15', NULL, 25.0, 75.00, 14, NULL, NULL, 85.00, 3.00, 'Ongoing', 'In Progress'),
('BATCH-BAS-001', '2025-08-10', '2025-08-15', 24.0, 85.00, 16, 98.00, 4, 95.00, 2.80, 'Excellent', 'Completed');

DROP TABLE IF EXISTS electronics_components CASCADE;
CREATE TABLE electronics_components (
    component_id SERIAL PRIMARY KEY,
    component_type VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    manufacturer VARCHAR(100) NOT NULL,
    serial_number VARCHAR(50) NOT NULL UNIQUE,
    voltage_rating DECIMAL(5,2),
    current_rating DECIMAL(5,2),
    power_consumption_watts DECIMAL(6,2),
    installation_date DATE NOT NULL,
    warranty_expiry_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'Active',
    location VARCHAR(100) NOT NULL,
    cost DECIMAL(10,2),
    supplier VARCHAR(100),
    calibration_frequency_days INT,
    last_calibration_date DATE,
    ip_address VARCHAR(45),
    firmware_version VARCHAR(50),
    manual_control_enabled BOOLEAN DEFAULT TRUE,
    safety_interlock BOOLEAN DEFAULT FALSE,
    max_runtime_minutes INT DEFAULT NULL,
    cooldown_minutes INT DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_electronics_components_serial_number ON electronics_components (serial_number);
CREATE INDEX IF NOT EXISTS idx_electronics_components_component_type ON electronics_components (component_type);
CREATE INDEX IF NOT EXISTS idx_electronics_components_status ON electronics_components (status);
INSERT INTO electronics_components (component_type, model, manufacturer, serial_number, voltage_rating, current_rating, power_consumption_watts, installation_date, warranty_expiry_date, status, location, cost, supplier, calibration_frequency_days, last_calibration_date, ip_address, firmware_version, manual_control_enabled, safety_interlock, max_runtime_minutes, cooldown_minutes, notes)
VALUES
('pH Sensor', 'PH-001', 'Atlas Scientific', 'SN-PH-123', 5.00, 0.10, 0.50, '2025-01-01', '2027-01-01', 'Active', 'Reservoir A', 100.00, 'Supplier Z', 30, '2025-08-01', '192.168.1.10', 'v1.2', TRUE, FALSE, NULL, 0, 'Calibrated monthly'),
('Pump', 'PUMP-001', 'Peristaltic Co', 'SN-PUMP-456', 12.00, 1.00, 12.00, '2025-02-01', '2026-02-01', 'Active', 'Nutrient Tank B', 50.00, 'Supplier W', NULL, NULL, '192.168.1.20', 'v2.0', TRUE, TRUE, 60, 5, 'Dosing pump'),
('PAR Sensor', 'PAR-001', 'Apogee Instruments', 'SN-PAR-789', 5.00, 0.05, 0.25, '2025-03-01', '2028-03-01', 'Active', 'Above Canopy', 150.00, 'Supplier V', 90, '2025-07-01', '192.168.1.30', 'v1.5', TRUE, FALSE, NULL, 0, 'Light measurement'),
('Fan', 'FAN-001', 'AC Infinity', 'SN-FAN-001', 120.00, 0.50, 60.00, '2025-01-15', '2026-01-15', 'Active', 'Exhaust Port A', 80.00, 'Supplier U', NULL, NULL, '192.168.1.40', 'v1.0', TRUE, FALSE, 480, 10, 'Exhaust fan'),
('Heater', 'HEAT-001', 'Inkbird', 'SN-HEAT-001', 120.00, 5.00, 600.00, '2025-02-15', '2026-02-15', 'Active', 'Climate Zone 1', 120.00, 'Supplier T', NULL, NULL, '192.168.1.50', 'v1.1', TRUE, TRUE, 120, 15, 'Space heater');

DROP TABLE IF EXISTS actuators CASCADE;
CREATE TABLE actuators (
    actuator_id SERIAL PRIMARY KEY,
    component_id INT REFERENCES electronics_components(component_id),
    actuator_type VARCHAR(50) NOT NULL,
    control_method VARCHAR(50),
    max_capacity DECIMAL(6,2),
    unit VARCHAR(20),
    notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_actuators_component_id ON actuators (component_id);
CREATE INDEX IF NOT EXISTS idx_actuators_actuator_type ON actuators (actuator_type);
INSERT INTO actuators (component_id, actuator_type, control_method, max_capacity, unit, notes)
VALUES
(2, 'Peristaltic Pump', 'PWM', 100.00, 'ml/min', 'For nutrient dosing'),
(1, 'Valve', 'Solenoid', 50.00, 'l/min', 'Water flow control'),
(4, 'Exhaust Fan', 'Variable Speed', 200.00, 'CFM', 'Climate control'),
(5, 'Space Heater', 'PWM', 600.00, 'watts', 'Temperature control');

DROP TABLE IF EXISTS sensor_readings CASCADE;
CREATE TABLE sensor_readings (
    reading_id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ph_value DECIMAL(3,1),
    ec_value DECIMAL(4,2),
    tds_value INT,
    water_temperature DECIMAL(4,1),
    air_temperature DECIMAL(4,1),
    air_humidity DECIMAL(5,2),
    co2_level_ppm INT,
    water_level_cm INT,
    overflow_detected BOOLEAN DEFAULT FALSE,
    light_intensity_lux INT,
    par_value INT,
    vpd_value DECIMAL(4,2),
    root_zone_temperature DECIMAL(4,1),
    root_zone_oxygen_mgl DECIMAL(4,2),
    wind_speed_mps DECIMAL(4,2),
    component_serial VARCHAR(50),
    notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_timestamp ON sensor_readings (timestamp);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_component_serial ON sensor_readings (component_serial);
INSERT INTO sensor_readings (timestamp, ph_value, ec_value, tds_value, water_temperature, air_temperature, air_humidity, co2_level_ppm, water_level_cm, overflow_detected, light_intensity_lux, par_value, vpd_value, root_zone_temperature, root_zone_oxygen_mgl, wind_speed_mps, component_serial, notes)
VALUES
('2025-08-24 10:00:00+00', 6.0, 1.50, 750, 22.0, 24.0, 50.00, 400, 30, FALSE, 20000, 300, 1.00, 21.5, 7.00, 0.20, 'SN-PH-123', 'Normal reading'),
('2025-08-24 11:00:00+00', 6.2, 2.00, 1000, 23.0, 25.0, 55.00, 450, 28, FALSE, 21000, 350, 1.10, 22.0, 6.80, 0.25, 'SN-PH-123', 'After dosing'),
('2025-08-24 12:00:00+00', 5.9, 1.80, 900, 22.5, 24.5, 52.00, 420, 29, FALSE, 20500, 320, 1.05, 21.8, 7.20, 0.22, 'SN-PAR-789', 'Midday peak');

DROP TABLE IF EXISTS pump_actuations CASCADE;
CREATE TABLE pump_actuations (
    actuation_id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    pump_type VARCHAR(50) NOT NULL,
    duration_seconds INT NOT NULL,
    dose_volume_ml DECIMAL(5,1) NOT NULL,
    reason VARCHAR(100) NOT NULL,
    component_serial VARCHAR(50),
    success BOOLEAN NOT NULL DEFAULT TRUE,
    flow_rate_ml_per_min DECIMAL(5,1),
    notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_pump_actuations_timestamp ON pump_actuations (timestamp);
CREATE INDEX IF NOT EXISTS idx_pump_actuations_pump_type ON pump_actuations (pump_type);
CREATE INDEX IF NOT EXISTS idx_pump_actuations_component_serial ON pump_actuations (component_serial);
INSERT INTO pump_actuations (timestamp, pump_type, duration_seconds, dose_volume_ml, reason, component_serial, success, flow_rate_ml_per_min, notes)
VALUES
('2025-08-24 10:30:00+00', 'Nutrient', 60, 100.0, 'pH adjustment', 'SN-PUMP-456', TRUE, 100.0, 'Successful'),
('2025-08-24 11:30:00+00', 'Water', 30, 50.0, 'Level top-up', 'SN-PUMP-456', TRUE, 100.0, 'No issues'),
('2025-08-24 12:30:00+00', 'Acid', 45, 75.0, 'pH correction', 'SN-PUMP-456', TRUE, 100.0, 'Automated');

DROP TABLE IF EXISTS fan_actuations CASCADE;
CREATE TABLE fan_actuations (
    actuation_id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fan_type VARCHAR(50) NOT NULL,
    duration_seconds INT NOT NULL,
    speed_percentage DECIMAL(5,2) NOT NULL,
    reason VARCHAR(100) NOT NULL,
    component_serial VARCHAR(50),
    success BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_fan_actuations_timestamp ON fan_actuations (timestamp);
CREATE INDEX IF NOT EXISTS idx_fan_actuations_fan_type ON fan_actuations (fan_type);
CREATE INDEX IF NOT EXISTS idx_fan_actuations_component_serial ON fan_actuations (component_serial);
INSERT INTO fan_actuations (timestamp, fan_type, duration_seconds, speed_percentage, reason, component_serial, success, notes)
VALUES
('2025-08-24 13:00:00+00', 'Exhaust', 300, 50.00, 'Humidity control', 'SN-FAN-001', TRUE, 'Reduced humidity'),
('2025-08-24 14:00:00+00', 'Circulation', 600, 70.00, 'Air flow', 'SN-FAN-002', TRUE, 'Prevent stagnation');

DROP TABLE IF EXISTS heater_actuations CASCADE;
CREATE TABLE heater_actuations (
    actuation_id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    duration_seconds INT NOT NULL,
    power_level_percentage DECIMAL(5,2) NOT NULL,
    reason VARCHAR(100) NOT NULL,
    component_serial VARCHAR(50),
    success BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_heater_actuations_timestamp ON heater_actuations (timestamp);
CREATE INDEX IF NOT EXISTS idx_heater_actuations_component_serial ON heater_actuations (component_serial);
INSERT INTO heater_actuations (timestamp, duration_seconds, power_level_percentage, reason, component_serial, success, notes)
VALUES
('2025-08-24 05:00:00+00', 1800, 40.00, 'Night temp drop', 'SN-HEAT-001', TRUE, 'Maintained 20C'),
('2025-08-23 04:00:00+00', 1200, 30.00, 'Cold snap', 'SN-HEAT-001', TRUE, 'Automated activation');

DROP TABLE IF EXISTS light_schedules CASCADE;
CREATE TABLE light_schedules (
    schedule_id SERIAL PRIMARY KEY,
    cycle_name VARCHAR(100),
    phase VARCHAR(50) NOT NULL,
    on_time TIME NOT NULL,
    off_time TIME NOT NULL,
    duration_hours INT NOT NULL,
    intensity_percentage DECIMAL(5,2) NOT NULL DEFAULT 100.00,
    spectrum_type VARCHAR(50),
    active_from DATE NOT NULL,
    active_to DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_light_schedules_cycle_name ON light_schedules (cycle_name);
CREATE INDEX IF NOT EXISTS idx_light_schedules_phase ON light_schedules (phase);
CREATE INDEX IF NOT EXISTS idx_light_schedules_active_from ON light_schedules (active_from);
INSERT INTO light_schedules (cycle_name, phase, on_time, off_time, duration_hours, intensity_percentage, spectrum_type, active_from, active_to, notes)
VALUES
('Cycle-Lettuce-2025', 'Vegetative', '06:00:00', '00:00:00', 18, 100.00, 'Full Spectrum', '2025-08-01', NULL, 'LED grow lights'),
('Cycle-Tomato-2025', 'Flowering', '08:00:00', '20:00:00', 12, 90.00, 'Red Enhanced', '2025-07-15', '2025-10-15', 'Bloom boost'),
('Cycle-Basil-2025', 'Vegetative', '07:00:00', '23:00:00', 16, 95.00, 'Blue Dominant', '2025-08-10', NULL, 'Herb growth');

DROP TABLE IF EXISTS circulation_schedules CASCADE;
CREATE TABLE circulation_schedules (
    schedule_id SERIAL PRIMARY KEY,
    on_duration_minutes INT NOT NULL,
    off_duration_minutes INT NOT NULL,
    daily_cycles INT,
    flow_rate_lpm DECIMAL(5,2),
    active_from DATE NOT NULL,
    active_to DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_circulation_schedules_active_from ON circulation_schedules (active_from);
INSERT INTO circulation_schedules (on_duration_minutes, off_duration_minutes, daily_cycles, flow_rate_lpm, active_from, active_to, notes)
VALUES
(15, 45, 24, 20.00, '2025-08-01', NULL, 'Standard aeration for lettuce'),
(20, 40, 20, 30.00, '2025-07-15', '2025-10-15', 'For tomato cycle'),
(10, 50, 28, 15.00, '2025-08-10', NULL, 'Gentle for basil roots');

DROP TABLE IF EXISTS feeding_schedules CASCADE;
CREATE TABLE feeding_schedules (
    schedule_id SERIAL PRIMARY KEY,
    cycle_name VARCHAR(100),
    nutrient_type VARCHAR(100) NOT NULL,
    dose_frequency_hours INT NOT NULL,
    dose_volume_ml_per_plant DECIMAL(5,2),
    active_from DATE NOT NULL,
    active_to DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_feeding_schedules_cycle_name ON feeding_schedules (cycle_name);
CREATE INDEX IF NOT EXISTS idx_feeding_schedules_nutrient_type ON feeding_schedules (nutrient_type);
CREATE INDEX IF NOT EXISTS idx_feeding_schedules_active_from ON feeding_schedules (active_from);
INSERT INTO feeding_schedules (cycle_name, nutrient_type, dose_frequency_hours, dose_volume_ml_per_plant, active_from, active_to, notes)
VALUES
('Cycle-Lettuce-2025', 'Veg Mix', 24, 5.00, '2025-08-01', NULL, 'Daily dosing'),
('Cycle-Tomato-2025', 'Bloom Mix', 12, 10.00, '2025-07-15', '2025-10-15', 'Twice daily');

DROP TABLE IF EXISTS alerts CASCADE;
CREATE TABLE alerts (
    alert_id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    alert_type VARCHAR(100) NOT NULL,
    severity VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    threshold_value TEXT,
    current_value TEXT,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    notified_users VARCHAR(255),
    notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts (timestamp);
CREATE INDEX IF NOT EXISTS idx_alerts_alert_type ON alerts (alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts (severity);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON alerts (resolved);
INSERT INTO alerts (timestamp, alert_type, severity, description, threshold_value, current_value, resolved, resolved_at, notified_users, notes)
VALUES
('2025-08-24 12:00:00+00', 'Low pH', 'High', 'pH dropped below target', '5.5', '5.3', FALSE, NULL, 'admin,operator1', 'Check nutrients'),
('2025-08-23 09:00:00+00', 'High Temperature', 'Medium', 'Air temp over max', '28C', '30C', TRUE, '2025-08-23 10:00:00+00', 'admin', 'Fan activated'),
('2025-08-24 15:00:00+00', 'Low Water Level', 'Critical', 'Reservoir low', '20cm', '15cm', FALSE, NULL, 'admin', 'Refill needed');

DROP TABLE IF EXISTS configurations CASCADE;
CREATE TABLE configurations (
    config_id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT NOT NULL,
    description TEXT,
    data_type VARCHAR(20),
    min_value DECIMAL(10,2),
    max_value DECIMAL(10,2),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_configurations_config_key ON configurations (config_key);
INSERT INTO configurations (config_key, config_value, description, data_type, min_value, max_value)
VALUES
('ph_target_min', '5.5', 'Minimum target pH', 'decimal', 4.00, 7.00),
('ec_target', '1.5', 'Target EC level', 'decimal', 0.50, 4.00),
('auto_dosing_enabled', 'true', 'Enable automatic nutrient dosing', 'boolean', NULL, NULL);

DROP TABLE IF EXISTS automation_rules CASCADE;
CREATE TABLE automation_rules (
    rule_id SERIAL PRIMARY KEY,
    rule_name VARCHAR(100) NOT NULL UNIQUE,
    trigger_condition TEXT NOT NULL,
    action TEXT NOT NULL,
    priority INT NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    manual_override_allowed BOOLEAN DEFAULT TRUE,
    safety_critical BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_automation_rules_rule_name ON automation_rules (rule_name);
CREATE INDEX IF NOT EXISTS idx_automation_rules_priority ON automation_rules (priority);
CREATE INDEX IF NOT EXISTS idx_automation_rules_active ON automation_rules (active);
INSERT INTO automation_rules (rule_name, trigger_condition, action, priority, active, manual_override_allowed, safety_critical, notes)
VALUES
('pH Low Correction', 'ph_value < target_ph_min', 'Activate acid pump for 30s', 1, TRUE, TRUE, FALSE, 'Auto pH up'),
('High Humidity Vent', 'air_humidity > 70', 'Activate exhaust fan at 80%', 2, TRUE, TRUE, FALSE, 'Prevent mold'),
('Emergency Temperature', 'air_temperature > 35', 'Activate all fans, disable heaters', 1, TRUE, FALSE, TRUE, 'Safety critical');

DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'Operator',
    permissions TEXT,
    phone_number VARCHAR(20),
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
INSERT INTO users (username, email, password_hash, role, permissions, phone_number, last_login)
VALUES
('admin', 'admin@example.com', 'hashedpassword1', 'Admin', 'all', '123-456-7890', '2025-08-24 08:00:00+00'),
('operator1', 'op1@example.com', 'hashedpassword2', 'Operator', 'read,write', '987-654-3210', '2025-08-23 15:00:00+00'),
('technician', 'tech@example.com', 'hashedpassword3', 'Technician', 'maintenance', '555-123-4567', '2025-08-22 10:00:00+00');

DROP TABLE IF EXISTS app_logs CASCADE;
CREATE TABLE app_logs (
    log_id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_name VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    success BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_app_logs_timestamp ON app_logs (timestamp);
CREATE INDEX IF NOT EXISTS idx_app_logs_user_name ON app_logs (user_name);
CREATE INDEX IF NOT EXISTS idx_app_logs_action ON app_logs (action);
INSERT INTO app_logs (timestamp, user_name, action, details, ip_address, success)
VALUES
('2025-08-24 09:00:00+00', 'admin', 'Login', 'Successful login', '192.168.1.100', TRUE),
('2025-08-24 10:00:00+00', 'operator1', 'Update Config', 'Changed pH target', '192.168.1.101', TRUE),
('2025-08-24 11:00:00+00', 'technician', 'Calibration', 'Calibrated pH sensor', '192.168.1.102', TRUE);

DROP TABLE IF EXISTS co2_management CASCADE;
CREATE TABLE co2_management (
    co2_id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    co2_level_ppm INT NOT NULL,
    injection_duration_seconds INT,
    cartridge_status VARCHAR(50) NOT NULL,
    cartridge_remaining_percentage DECIMAL(5,2),
    target_co2_ppm INT,
    notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_co2_management_timestamp ON co2_management (timestamp);
CREATE INDEX IF NOT EXISTS idx_co2_management_cartridge_status ON co2_management (cartridge_status);
INSERT INTO co2_management (timestamp, co2_level_ppm, injection_duration_seconds, cartridge_status, cartridge_remaining_percentage, target_co2_ppm, notes)
VALUES
('2025-08-24 11:00:00+00', 400, 30, 'Active', 80.00, 800, 'Routine injection'),
('2025-08-23 14:00:00+00', 350, 60, 'Active', 75.00, 1200, 'Low level boost'),
('2025-08-24 16:00:00+00', 420, 45, 'Active', 78.00, 900, 'Midday adjustment');

DROP TABLE IF EXISTS maintenance_logs CASCADE;
CREATE TABLE maintenance_logs (
    maintenance_id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    component_serial VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    details TEXT NOT NULL,
    performed_by VARCHAR(50),
    cost DECIMAL(10,2),
    downtime_minutes INT,
    parts_replaced TEXT,
    notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_timestamp ON maintenance_logs (timestamp);
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_component_serial ON maintenance_logs (component_serial);
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_action ON maintenance_logs (action);
INSERT INTO maintenance_logs (timestamp, component_serial, action, details, performed_by, cost, downtime_minutes, parts_replaced, notes)
VALUES
('2025-08-20 13:00:00+00', 'SN-PH-123', 'Calibration', 'Adjusted pH sensor', 'admin', 0.00, 10, NULL, 'Routine'),
('2025-08-15 16:00:00+00', 'SN-PUMP-456', 'Cleaning', 'Cleaned pump tubing', 'operator1', 10.00, 20, 'Tubing', 'Preventive'),
('2025-08-22 09:00:00+00', 'SN-PAR-789', 'Firmware Update', 'Updated to v1.6', 'technician', 0.00, 5, NULL, 'Improved accuracy');

DROP TABLE IF EXISTS harvest_records CASCADE;
CREATE TABLE harvest_records (
    harvest_id SERIAL PRIMARY KEY,
    cycle_name VARCHAR(100),
    harvest_date DATE NOT NULL,
    yield_quantity DECIMAL(10,2) NOT NULL,
    yield_unit VARCHAR(50) NOT NULL,
    quality_rating INT NOT NULL CHECK (quality_rating BETWEEN 1 AND 10),
    waste_quantity DECIMAL(10,2),
    waste_reason TEXT,
    post_harvest_treatment TEXT,
    storage_conditions TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_harvest_records_cycle_name ON harvest_records (cycle_name);
CREATE INDEX IF NOT EXISTS idx_harvest_records_harvest_date ON harvest_records (harvest_date);
INSERT INTO harvest_records (cycle_name, harvest_date, yield_quantity, yield_unit, quality_rating, waste_quantity, waste_reason, post_harvest_treatment, storage_conditions, notes)
VALUES
('Cycle-Lettuce-2025', '2025-09-01', 10000.00, 'grams', 8, 500.00, 'Disease', 'Washing', 'Refrigerated', 'Good yield'),
('Cycle-Tomato-2025', '2025-10-15', 20000.00, 'grams', 7, 1000.00, 'Pests', 'Sorting', 'Room temp', 'Some pests'),
('Cycle-Basil-2025', '2025-09-20', 5000.00, 'grams', 9, 200.00, 'Overgrowth', 'Drying', 'Dark cool place', 'Aromatic');

DROP TABLE IF EXISTS reservoir_management CASCADE;
CREATE TABLE reservoir_management (
    reservoir_id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    volume_liters DECIMAL(6,2) NOT NULL,
    water_change_date DATE,
    nutrient_mix_ratio TEXT,
    cleanliness_status VARCHAR(50),
    biofilm_level VARCHAR(20),
    algae_presence BOOLEAN,
    filter_status VARCHAR(50),
    notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_reservoir_management_timestamp ON reservoir_management (timestamp);
CREATE INDEX IF NOT EXISTS idx_reservoir_management_water_change_date ON reservoir_management (water_change_date);
INSERT INTO reservoir_management (timestamp, volume_liters, water_change_date, nutrient_mix_ratio, cleanliness_status, biofilm_level, algae_presence, filter_status, notes)
VALUES
('2025-08-24 12:00:00+00', 500.00, '2025-08-20', '1:100', 'Clean', 'Low', FALSE, 'Fresh', 'Fresh mix'),
('2025-08-15 10:00:00+00', 450.00, '2025-08-10', '1:150', 'Moderate', 'Medium', TRUE, 'Needs cleaning', 'Needs check'),
('2025-08-24 17:00:00+00', 480.00, '2025-08-20', '1:120', 'Clean', 'None', FALSE, 'Good', 'Stable');

DROP TABLE IF EXISTS nutrient_solutions CASCADE;
CREATE TABLE nutrient_solutions (
    solution_id SERIAL PRIMARY KEY,
    solution_type VARCHAR(100) NOT NULL,
    batch_code VARCHAR(50) NOT NULL UNIQUE,
    preparation_date DATE NOT NULL,
    expiry_date DATE,
    concentration DECIMAL(5,2) NOT NULL,
    volume_ml DECIMAL(6,2) NOT NULL,
    supplier VARCHAR(100),
    cost DECIMAL(10,2),
    n_percentage DECIMAL(5,2),
    p_percentage DECIMAL(5,2),
    k_percentage DECIMAL(5,2),
    micronutrients TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_nutrient_solutions_batch_code ON nutrient_solutions (batch_code);
CREATE INDEX IF NOT EXISTS idx_nutrient_solutions_solution_type ON nutrient_solutions (solution_type);
CREATE INDEX IF NOT EXISTS idx_nutrient_solutions_preparation_date ON nutrient_solutions (preparation_date);
INSERT INTO nutrient_solutions (solution_type, batch_code, preparation_date, expiry_date, concentration, volume_ml, supplier, cost, n_percentage, p_percentage, k_percentage, micronutrients, notes)
VALUES
('NPK Mix', 'NUT-001', '2025-08-01', '2025-11-01', 10.00, 5000.00, 'Supplier A', 50.00, 10.00, 5.00, 5.00, 'Fe, Mn, Zn', 'For lettuce'),
('Bloom Booster', 'NUT-002', '2025-07-15', '2025-10-15', 15.00, 3000.00, 'Supplier B', 60.00, 5.00, 10.00, 10.00, 'Ca, Mg', 'For tomato'),
('Herb Formula', 'NUT-003', '2025-08-10', '2025-11-10', 12.00, 2000.00, 'Supplier C', 30.00, 8.00, 6.00, 6.00, 'B, Cu', 'For basil');

DROP TABLE IF EXISTS nutrient_dosing_logs CASCADE;
CREATE TABLE nutrient_dosing_logs (
    dosing_id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    solution_id INT REFERENCES nutrient_solutions(solution_id),
    dose_volume_ml DECIMAL(5,1) NOT NULL,
    target_ec_after DECIMAL(4,2),
    actual_ec_after DECIMAL(4,2),
    notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_nutrient_dosing_logs_timestamp ON nutrient_dosing_logs (timestamp);
CREATE INDEX IF NOT EXISTS idx_nutrient_dosing_logs_solution_id ON nutrient_dosing_logs (solution_id);
INSERT INTO nutrient_dosing_logs (timestamp, solution_id, dose_volume_ml, target_ec_after, actual_ec_after, notes)
VALUES
('2025-08-24 10:30:00+00', 1, 100.0, 1.50, 1.48, 'Slight under'),
('2025-08-24 11:30:00+00', 2, 150.0, 2.50, 2.52, 'On target');

DROP TABLE IF EXISTS environmental_logs CASCADE;
CREATE TABLE environmental_logs (
    log_id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    air_humidity DECIMAL(5,2),
    co2_level_ppm INT,
    light_intensity_lux INT,
    wind_speed_mps DECIMAL(4,2),
    atmospheric_pressure_hpa DECIMAL(6,2),
    uv_index DECIMAL(4,2),
    notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_environmental_logs_timestamp ON environmental_logs (timestamp);
INSERT INTO environmental_logs (timestamp, air_humidity, co2_level_ppm, light_intensity_lux, wind_speed_mps, atmospheric_pressure_hpa, uv_index, notes)
VALUES
('2025-08-24 13:00:00+00', 55.00, 420, 22000, 0.50, 1013.00, 2.00, 'Stable conditions'),
('2025-08-23 14:00:00+00', 60.00, 380, 18000, 0.30, 1015.00, 1.50, 'Slight wind'),
('2025-08-24 18:00:00+00', 58.00, 410, 20000, 0.40, 1012.00, 1.80, 'Evening log');

DROP TABLE IF EXISTS inventory_supplies CASCADE;
CREATE TABLE inventory_supplies (
    item_id SERIAL PRIMARY KEY,
    item_name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL,
    quantity_in_stock INT NOT NULL,
    unit VARCHAR(50) NOT NULL,
    reorder_threshold INT NOT NULL,
    supplier VARCHAR(100),
    cost_per_unit DECIMAL(10,2),
    last_restock_date DATE,
    expiration_date DATE,
    storage_location VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_inventory_supplies_item_name ON inventory_supplies (item_name);
CREATE INDEX IF NOT EXISTS idx_inventory_supplies_category ON inventory_supplies (category);
CREATE INDEX IF NOT EXISTS idx_inventory_supplies_supplier ON inventory_supplies (supplier);
INSERT INTO inventory_supplies (item_name, category, quantity_in_stock, unit, reorder_threshold, supplier, cost_per_unit, last_restock_date, expiration_date, storage_location, notes)
VALUES
('pH Up', 'Chemicals', 10, 'bottles', 5, 'Supplier C', 15.00, '2025-08-10', '2026-08-10', 'Shelf A', 'Acid adjuster'),
('Seeds - Lettuce', 'Seeds', 200, 'packets', 50, 'Supplier X', 5.00, '2025-07-01', '2027-07-01', 'Cool Storage', 'Backup stock'),
('LED Bulbs', 'Electronics', 50, 'units', 10, 'Supplier D', 20.00, '2025-06-15', NULL, 'Warehouse', 'Spare parts');

DROP TABLE IF EXISTS system_events CASCADE;
CREATE TABLE system_events (
    event_id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    event_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    affected_component VARCHAR(50),
    severity VARCHAR(50),
    resolved BOOLEAN DEFAULT FALSE,
    notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_system_events_timestamp ON system_events (timestamp);
CREATE INDEX IF NOT EXISTS idx_system_events_event_type ON system_events (event_type);
CREATE INDEX IF NOT EXISTS idx_system_events_severity ON system_events (severity);
CREATE INDEX IF NOT EXISTS idx_system_events_resolved ON system_events (resolved);
INSERT INTO system_events (timestamp, event_type, description, affected_component, severity, resolved, notes)
VALUES
('2025-08-24 14:00:00+00', 'Power Outage', 'Brief power loss', 'All', 'High', TRUE, 'Backup generator activated'),
('2025-08-22 15:00:00+00', 'Sensor Failure', 'pH sensor offline', 'SN-PH-123', 'Medium', TRUE, 'Replaced'),
('2025-08-24 19:00:00+00', 'Network Issue', 'Lost connection to controller', 'Main Controller', 'Low', FALSE, 'Investigating');

DROP TABLE IF EXISTS backups CASCADE;
CREATE TABLE backups (
    backup_id SERIAL PRIMARY KEY,
    backup_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    backup_type VARCHAR(50) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    size_bytes BIGINT NOT NULL,
    status VARCHAR(50) NOT NULL,
    encryption_enabled BOOLEAN,
    notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_backups_backup_date ON backups (backup_date);
CREATE INDEX IF NOT EXISTS idx_backups_backup_type ON backups (backup_type);
CREATE INDEX IF NOT EXISTS idx_backups_status ON backups (status);
INSERT INTO backups (backup_date, backup_type, file_path, size_bytes, status, encryption_enabled, notes)
VALUES
('2025-08-24 00:00:00+00', 'Full', '/backups/db-20250824.sql', 1048576, 'Successful', TRUE, 'Daily backup'),
('2025-08-23 00:00:00+00', 'Incremental', '/backups/inc-20250823.sql', 524288, 'Successful', TRUE, 'No issues'),
('2025-08-22 00:00:00+00', 'Full', '/backups/db-20250822.sql', 2097152, 'Successful', TRUE, 'Weekly full');

DROP TABLE IF EXISTS pest_disease_logs CASCADE;
CREATE TABLE pest_disease_logs (
    log_id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    cycle_name VARCHAR(100),
    issue_type VARCHAR(100) NOT NULL,
    severity VARCHAR(50) NOT NULL,
    affected_plants_count INT,
    treatment_applied TEXT,
    treatment_efficacy DECIMAL(5,2),
    resolution_date DATE,
    recurrence_risk INT CHECK (recurrence_risk BETWEEN 1 AND 10),
    notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_pest_disease_logs_timestamp ON pest_disease_logs (timestamp);
CREATE INDEX IF NOT EXISTS idx_pest_disease_logs_cycle_name ON pest_disease_logs (cycle_name);
CREATE INDEX IF NOT EXISTS idx_pest_disease_logs_issue_type ON pest_disease_logs (issue_type);
CREATE INDEX IF NOT EXISTS idx_pest_disease_logs_severity ON pest_disease_logs (severity);
INSERT INTO pest_disease_logs (timestamp, cycle_name, issue_type, severity, affected_plants_count, treatment_applied, treatment_efficacy, resolution_date, recurrence_risk, notes)
VALUES
('2025-08-20 16:00:00+00', 'Cycle-Tomato-2025', 'Aphids', 'Low', 5, 'Insecticide spray', 95.00, '2025-08-22', 3, 'Contained'),
('2025-08-15 17:00:00+00', 'Cycle-Lettuce-2025', 'Mildew', 'Medium', 10, 'Fungicide', 80.00, NULL, 5, 'Monitoring'),
('2025-08-24 20:00:00+00', 'Cycle-Basil-2025', 'Whitefly', 'Low', 3, 'Neem oil', 90.00, '2025-08-26', 2, 'Early detection');

DROP TABLE IF EXISTS calibration_logs CASCADE;
CREATE TABLE calibration_logs (
    calibration_id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    component_serial VARCHAR(50),
    sensor_type VARCHAR(50) NOT NULL,
    before_value TEXT,
    after_value TEXT,
    calibration_solution_used VARCHAR(100),
    performed_by VARCHAR(50),
    accuracy_percentage DECIMAL(5,2),
    notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_calibration_logs_timestamp ON calibration_logs (timestamp);
CREATE INDEX IF NOT EXISTS idx_calibration_logs_component_serial ON calibration_logs (component_serial);
CREATE INDEX IF NOT EXISTS idx_calibration_logs_sensor_type ON calibration_logs (sensor_type);
INSERT INTO calibration_logs (timestamp, component_serial, sensor_type, before_value, after_value, calibration_solution_used, performed_by, accuracy_percentage, notes)
VALUES
('2025-08-20 13:00:00+00', 'SN-PH-123', 'pH', '5.8', '6.0', 'pH 7 buffer', 'admin', 99.50, 'Accurate now'),
('2025-08-10 14:00:00+00', 'SN-PUMP-456', 'Flow', '95 ml/min', '100 ml/min', 'Water test', 'operator1', 98.00, 'Adjusted'),
('2025-08-24 09:00:00+00', 'SN-PAR-789', 'PAR', '290', '300', 'Light standard', 'technician', 99.00, 'Recalibrated');

DROP TABLE IF EXISTS energy_consumption CASCADE;
CREATE TABLE energy_consumption (
    record_id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    component_type VARCHAR(100),
    energy_used_kwh DECIMAL(8,4) NOT NULL,
    duration_hours DECIMAL(5,2) NOT NULL,
    cost DECIMAL(10,2),
    carbon_footprint_kg DECIMAL(6,2),
    notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_energy_consumption_timestamp ON energy_consumption (timestamp);
CREATE INDEX IF NOT EXISTS idx_energy_consumption_component_type ON energy_consumption (component_type);
INSERT INTO energy_consumption (timestamp, component_type, energy_used_kwh, duration_hours, cost, carbon_footprint_kg, notes)
VALUES
('2025-08-24 15:00:00+00', 'Lights', 10.0000, 18.00, 1.50, 5.00, 'Vegetative phase'),
('2025-08-23 16:00:00+00', 'Pumps', 2.5000, 24.00, 0.38, 1.25, 'Continuous'),
('2025-08-24 21:00:00+00', 'Fans', 1.2000, 12.00, 0.18, 0.60, 'Cooling');

DROP TABLE IF EXISTS water_quality_logs CASCADE;
CREATE TABLE water_quality_logs (
    log_id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    orp_value DECIMAL(5,1),
    dissolved_oxygen_mgl DECIMAL(4,2),
    turbidity_ntu DECIMAL(5,2),
    chlorine_ppm DECIMAL(4,2),
    hardness_ppm INT,
    alkalinity_ppm INT,
    notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_water_quality_logs_timestamp ON water_quality_logs (timestamp);
INSERT INTO water_quality_logs (timestamp, orp_value, dissolved_oxygen_mgl, turbidity_ntu, chlorine_ppm, hardness_ppm, alkalinity_ppm, notes)
VALUES
('2025-08-24 17:00:00+00', 250.0, 8.00, 5.00, 0.10, 100, 80, 'Clear water'),
('2025-08-23 18:00:00+00', 220.0, 7.50, 6.00, 0.15, 120, 90, 'Slight cloudiness'),
('2025-08-24 22:00:00+00', 240.0, 7.80, 5.50, 0.12, 110, 85, 'Stable');

DROP TABLE IF EXISTS plant_health_logs CASCADE;
CREATE TABLE plant_health_logs (
    health_id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    plant_id INT REFERENCES individual_plants(plant_id),
    health_score INT CHECK (health_score BETWEEN 1 AND 10),
    leaf_color VARCHAR(50),
    growth_rate_cm_per_day DECIMAL(4,2),
    pest_evidence BOOLEAN,
    disease_symptoms TEXT,
    ai_analysis_score DECIMAL(5,2),
    notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_plant_health_logs_timestamp ON plant_health_logs (timestamp);
CREATE INDEX IF NOT EXISTS idx_plant_health_logs_plant_id ON plant_health_logs (plant_id);
CREATE INDEX IF NOT EXISTS idx_plant_health_logs_health_score ON plant_health_logs (health_score);
INSERT INTO plant_health_logs (timestamp, plant_id, health_score, leaf_color, growth_rate_cm_per_day, pest_evidence, disease_symptoms, ai_analysis_score, notes)
VALUES
('2025-08-24 08:00:00+00', 1, 9, 'Green', 1.50, FALSE, 'None', 9.20, 'Healthy'),
('2025-08-24 08:00:00+00', 2, 8, 'Yellowish', 1.20, TRUE, 'Spots', 7.80, 'Monitor'),
('2025-08-24 08:00:00+00', 3, 7, 'Dark Green', 2.00, FALSE, 'None', 8.50, 'Good growth');

DROP TABLE IF EXISTS image_captures CASCADE;
CREATE TABLE image_captures (
    image_id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    plant_id INT REFERENCES individual_plants(plant_id),
    cycle_id INT REFERENCES growth_cycles(cycle_id),
    image_path VARCHAR(255) NOT NULL,
    camera_id VARCHAR(50),
    analysis_results TEXT,
    notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_image_captures_timestamp ON image_captures (timestamp);
CREATE INDEX IF NOT EXISTS idx_image_captures_plant_id ON image_captures (plant_id);
CREATE INDEX IF NOT EXISTS idx_image_captures_cycle_id ON image_captures (cycle_id);
INSERT INTO image_captures (timestamp, plant_id, cycle_id, image_path, camera_id, analysis_results, notes)
VALUES
('2025-08-24 09:00:00+00', 1, 1, '/images/plant1-20250824.jpg', 'CAM-001', 'Healthy, no issues', 'Daily check'),
('2025-08-24 09:00:00+00', NULL, 2, '/images/cycle2-20250824.jpg', 'CAM-002', 'Flowering stage', 'Overview'),
('2025-08-24 09:00:00+00', 3, 3, '/images/plant3-20250824.jpg', 'CAM-003', 'Pest detection: low', 'AI scan');

DROP TABLE IF EXISTS cost_tracking CASCADE;
CREATE TABLE cost_tracking (
    cost_id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    category VARCHAR(100) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    cycle_id INT REFERENCES growth_cycles(cycle_id),
    notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_cost_tracking_timestamp ON cost_tracking (timestamp);
CREATE INDEX IF NOT EXISTS idx_cost_tracking_category ON cost_tracking (category);
CREATE INDEX IF NOT EXISTS idx_cost_tracking_cycle_id ON cost_tracking (cycle_id);
INSERT INTO cost_tracking (timestamp, category, amount, description, cycle_id, notes)
VALUES
('2025-08-24 10:00:00+00', 'Nutrients', 50.00, 'Purchased NPK mix', 1, 'Monthly supply'),
('2025-08-23 11:00:00+00', 'Energy', 20.00, 'Electricity bill portion', 2, 'Lights and pumps'),
('2025-08-22 12:00:00+00', 'Maintenance', 30.00, 'Parts replacement', 3, 'Filter change');

DROP TABLE IF EXISTS supplier_details CASCADE;
CREATE TABLE supplier_details (
    supplier_id SERIAL PRIMARY KEY,
    supplier_name VARCHAR(100) NOT NULL UNIQUE,
    contact_email VARCHAR(100),
    contact_phone VARCHAR(20),
    address TEXT,
    products_supplied TEXT,
    payment_terms VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_supplier_details_supplier_name ON supplier_details (supplier_name);
INSERT INTO supplier_details (supplier_name, contact_email, contact_phone, address, products_supplied, payment_terms, notes)
VALUES
('Supplier X', 'info@supplierx.com', '111-222-3333', '123 Seed St', 'Seeds', 'Net 30', 'Reliable for organics'),
('Supplier Y', 'sales@suppliery.com', '444-555-6666', '456 Nutrient Ave', 'Nutrients, Chemicals', 'COD', 'Bulk discounts'),
('Supplier Z', 'support@supplierz.com', '777-888-9999', '789 Electronics Blvd', 'Sensors, Pumps', 'Net 60', 'Tech support included');

DROP TABLE IF EXISTS experiment_tracking CASCADE;
CREATE TABLE experiment_tracking (
    experiment_id SERIAL PRIMARY KEY,
    experiment_name VARCHAR(100) NOT NULL UNIQUE,
    start_date DATE NOT NULL,
    end_date DATE,
    description TEXT NOT NULL,
    variables_tested TEXT,
    results TEXT,
    conclusions TEXT,
    cycle_id INT REFERENCES growth_cycles(cycle_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_experiment_tracking_experiment_name ON experiment_tracking (experiment_name);
CREATE INDEX IF NOT EXISTS idx_experiment_tracking_start_date ON experiment_tracking (start_date);
CREATE INDEX IF NOT EXISTS idx_experiment_tracking_cycle_id ON experiment_tracking (cycle_id);
INSERT INTO experiment_tracking (experiment_name, start_date, end_date, description, variables_tested, results, conclusions, cycle_id)
VALUES
('Light Spectrum Test', '2025-08-01', NULL, 'Test red vs blue light on growth', 'Spectrum type, intensity', 'Ongoing', NULL, 1),
('Nutrient Ratio Trial', '2025-07-15', '2025-08-15', 'Vary NPK ratios', 'NPK levels', 'Higher K improved yield', 'Optimal 5-10-10 for flower', 2);

DROP TABLE IF EXISTS yield_predictions CASCADE;
CREATE TABLE yield_predictions (
    prediction_id SERIAL PRIMARY KEY,
    cycle_id INT REFERENCES growth_cycles(cycle_id),
    prediction_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    predicted_yield DECIMAL(10,2),
    unit VARCHAR(50),
    confidence_percentage DECIMAL(5,2),
    model_used VARCHAR(100),
    notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_yield_predictions_cycle_id ON yield_predictions (cycle_id);
CREATE INDEX IF NOT EXISTS idx_yield_predictions_prediction_date ON yield_predictions (prediction_date);
INSERT INTO yield_predictions (cycle_id, prediction_date, predicted_yield, unit, confidence_percentage, model_used, notes)
VALUES
(1, '2025-08-24 12:00:00+00', 12000.00, 'grams', 85.00, 'Linear Regression', 'Based on growth rate'),
(2, '2025-08-24 12:00:00+00', 22000.00, 'grams', 90.00, 'AI Model v1', 'Adjusted for pests'),
(3, '2025-08-24 12:00:00+00', 6000.00, 'grams', 80.00, 'Historical Avg', 'Early stage prediction');

DROP TABLE IF EXISTS pid_settings CASCADE;
CREATE TABLE pid_settings (
    setting_id SERIAL PRIMARY KEY,
    variable VARCHAR(50) NOT NULL UNIQUE,
    target DECIMAL(10,2) NOT NULL,
    kp DECIMAL(10,2) NOT NULL,
    ki DECIMAL(10,2) NOT NULL,
    kd DECIMAL(10,2) NOT NULL,
    enabled BOOLEAN DEFAULT FALSE,
    actuator_id VARCHAR(50),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_pid_settings_variable ON pid_settings (variable);
INSERT INTO pid_settings (variable, target, kp, ki, kd, enabled, actuator_id)
VALUES
('air_temperature', 24.00, 1.00, 0.10, 0.05, FALSE, 'fan_exhaust_primary'),
('water_temperature', 22.00, 0.80, 0.08, 0.04, FALSE, 'heater_main'),
('ph_value', 6.00, 2.00, 0.20, 0.10, FALSE, 'pump_ph_up'),
('ec_value', 1.80, 1.50, 0.15, 0.08, FALSE, 'pump_nutrient_a'),
('co2_level_ppm', 800.00, 1.20, 0.12, 0.06, FALSE, 'valve_co2_injector');

DROP TABLE IF EXISTS water_management CASCADE;
CREATE TABLE water_management (
    water_id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reservoir_level DECIMAL(6,2) NOT NULL,
    water_temperature DECIMAL(4,1),
    ph_value DECIMAL(3,1),
    ec_value DECIMAL(4,2),
    injection_status VARCHAR(50) NOT NULL DEFAULT 'Idle',
    trend_data JSONB,
    notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_water_management_timestamp ON water_management (timestamp);
CREATE INDEX IF NOT EXISTS idx_water_management_injection_status ON water_management (injection_status);
INSERT INTO water_management (timestamp, reservoir_level, water_temperature, ph_value, ec_value, injection_status, trend_data, notes)
VALUES
('2025-08-24 10:00:00+00', 500.00, 22.0, 6.0, 1.50, 'Idle', '{"levels": [500, 498, 496]}', 'Stable'),
('2025-08-24 11:00:00+00', 498.00, 23.0, 6.2, 2.00, 'Injecting', '{"levels": [498, 496, 494]}', 'Dosing active'),
('2025-08-24 12:00:00+00', 496.00, 22.5, 5.9, 1.80, 'Idle', '{"levels": [496, 494, 492]}', 'Post-dosing');

DROP TABLE IF EXISTS soil_management CASCADE;
CREATE TABLE soil_management (
    soil_id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    soil_moisture DECIMAL(5,2),
    soil_ph DECIMAL(3,1),
    soil_ec DECIMAL(4,2),
    soil_temperature DECIMAL(4,1),
    injection_status VARCHAR(50) NOT NULL DEFAULT 'Idle',
    trend_data JSONB,
    notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_soil_management_timestamp ON soil_management (timestamp);
CREATE INDEX IF NOT EXISTS idx_soil_management_injection_status ON soil_management (injection_status);
INSERT INTO soil_management (timestamp, soil_moisture, soil_ph, soil_ec, soil_temperature, injection_status, trend_data, notes)
VALUES
('2025-08-24 10:00:00+00', 45.00, 6.5, 1.20, 20.0, 'Idle', '{"moisture": [45, 44, 43]}', 'Normal'),
('2025-08-24 11:00:00+00', 44.00, 6.6, 1.25, 20.5, 'Adjusting', '{"moisture": [44, 43, 42]}', 'Moisture adjustment'),
('2025-08-24 12:00:00+00', 43.00, 6.4, 1.18, 20.2, 'Idle', '{"moisture": [43, 42, 41]}', 'Stable');

DROP TABLE IF EXISTS fertilizer_management CASCADE;
CREATE TABLE fertilizer_management (
    fertilizer_id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fertilizer_type VARCHAR(100) NOT NULL,
    dose_volume_ml DECIMAL(5,1),
    target_npk VARCHAR(20),
    actual_npk VARCHAR(20),
    injection_status VARCHAR(50) NOT NULL DEFAULT 'Idle',
    trend_data JSONB,
    notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_fertilizer_management_timestamp ON fertilizer_management (timestamp);
CREATE INDEX IF NOT EXISTS idx_fertilizer_management_fertilizer_type ON fertilizer_management (fertilizer_type);
CREATE INDEX IF NOT EXISTS idx_fertilizer_management_injection_status ON fertilizer_management (injection_status);
INSERT INTO fertilizer_management (timestamp, fertilizer_type, dose_volume_ml, target_npk, actual_npk, injection_status, trend_data, notes)
VALUES
('2025-08-24 10:00:00+00', 'NPK Mix', 100.0, '10-5-5', '10-5-5', 'Idle', '{"doses": [100, 95, 90]}', 'Standard dose'),
('2025-08-24 11:00:00+00', 'Bloom Booster', 150.0, '5-10-10', '5-10-9', 'Injecting', '{"doses": [150, 145, 140]}', 'Boosting'),
('2025-08-24 12:00:00+00', 'Herb Formula', 120.0, '8-6-6', '8-6-6', 'Idle', '{"doses": [120, 115, 110]}', 'Herb specific');

DROP TABLE IF EXISTS compost_management CASCADE;
CREATE TABLE compost_management (
    compost_id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    batch_code VARCHAR(50) NOT NULL,
    temperature DECIMAL(4,1),
    moisture DECIMAL(5,2),
    turning_frequency_days INT,
    maturity_level VARCHAR(50),
    injection_status VARCHAR(50) NOT NULL DEFAULT 'Idle',
    trend_data JSONB,
    notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_compost_management_timestamp ON compost_management (timestamp);
CREATE INDEX IF NOT EXISTS idx_compost_management_batch_code ON compost_management (batch_code);
CREATE INDEX IF NOT EXISTS idx_compost_management_maturity_level ON compost_management (maturity_level);
CREATE INDEX IF NOT EXISTS idx_compost_management_injection_status ON compost_management (injection_status);
INSERT INTO compost_management (timestamp, batch_code, temperature, moisture, turning_frequency_days, maturity_level, injection_status, trend_data, notes)
VALUES
('2025-08-24 10:00:00+00', 'COMP-001', 55.0, 60.00, 7, 'Immature', 'Idle', '{"temps": [55, 54, 53]}', 'Starting'),
('2025-08-24 11:00:00+00', 'COMP-002', 58.0, 62.00, 5, 'Maturing', 'Turning', '{"temps": [58, 57, 56]}', 'Active turning'),
('2025-08-24 12:00:00+00', 'COMP-003', 52.0, 58.00, 10, 'Mature', 'Idle', '{"temps": [52, 51, 50]}', 'Ready for use');

DROP TABLE IF EXISTS germination_management CASCADE;
CREATE TABLE germination_management (
    germ_id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    batch_code VARCHAR(50) NOT NULL,
    germination_rate DECIMAL(5,2),
    temperature DECIMAL(4,1),
    humidity DECIMAL(5,2),
    injection_status VARCHAR(50) NOT NULL DEFAULT 'Idle',
    trend_data JSONB,
    notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_germination_management_timestamp ON germination_management (timestamp);
CREATE INDEX IF NOT EXISTS idx_germination_management_batch_code ON germination_management (batch_code);
CREATE INDEX IF NOT EXISTS idx_germination_management_injection_status ON germination_management (injection_status);
INSERT INTO germination_management (timestamp, batch_code, germination_rate, temperature, humidity, injection_status, trend_data, notes)
VALUES
('2025-08-24 10:00:00+00', 'BATCH-LETT-001', 95.00, 22.0, 80.00, 'Idle', '{"rates": [95, 94, 93]}', 'Good'),
('2025-08-24 11:00:00+00', 'BATCH-TOM-001', 90.00, 25.0, 75.00, 'Monitoring', '{"rates": [90, 89, 88]}', 'Ongoing'),
('2025-08-24 12:00:00+00', 'BATCH-BAS-001', 98.00, 24.0, 85.00, 'Idle', '{"rates": [98, 97, 96]}', 'Excellent');