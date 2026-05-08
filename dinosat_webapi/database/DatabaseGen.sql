DROP TABLE IF EXISTS access_requests;
CREATE TABLE access_requests 
	(
        request_orgid TEXT,
		request_username TEXT, 
		request_timestamp DATE, 
		request_status TEXT
	); 
DROP INDEX IF EXISTS idx_access_requests; 
CREATE INDEX idx_access_requests ON access_requests (request_orgid, request_status, request_timestamp);

DROP TABLE IF EXISTS organizations;
CREATE TABLE organizations 
	(
    	orgid TEXT,
  		orgname TEXT, 
        orgemail TEXT, 
        orgphone TEXT, 
        orgdescription TEXT,
        orgimage TEXT,  
        created_at DATE,
        slug VARCHAR(32) UNIQUE
  	);
DROP INDEX IF EXISTS idx_organizations; 
CREATE INDEX idx_organizations ON organizations (orgid, created_at);

DROP TABLE IF EXISTS statuses; 
CREATE TABLE statuses 
    (
        software TEXT, 
        status TEXT
    ); 
DROP INDEX IF EXISTS idx_statuses; 
CREATE INDEX idx_statuses ON statuses (software, status);

DROP TABLE IF EXISTS status_updates; 
CREATE TABLE status_updates
    (
        software TEXT, 
        status TEXT, 
        timestamp TIMESTAMP,
        description TEXT, 
        issue_time TIMESTAMP,
        identified BOOL, 
        identified_at TIMESTAMP, 
        resolved BOOL, 
        resolved_at TIMESTAMP, 
        resolution_message TEXT
    ); 
DROP INDEX IF EXISTS idx_status_updates; 
CREATE INDEX idx_status_updates on status_updates (software, status, timestamp, resolved_at); 

DROP TABLE IF EXISTS error_logs; 
CREATE TABLE error_logs 
    (
        software TEXT, 
        route TEXT, 
        status_code INT, 
        message TEXT, 
        timestamp TIMESTAMP, 
        ip_address TEXT
    ); 
DROP INDEX IF EXISTS idx_error_logs; 
CREATE INDEX idx_error_logs ON error_logs (timestamp, status_code);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    username VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL,
    expiration TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS oauth_state_tokens (
    nonce VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    expiration TIMESTAMPTZ NOT NULL
);

DROP TABLE IF EXISTS reset_logs;
CREATE TABLE reset_logs
	(
  		username TEXT, 
        reset_token TEXT, 
        expiration_timestamp TIMESTAMP, 
        timestamp TEXT,
        ip_address TEXT 
  	);
DROP INDEX IF EXISTS idx_reset_logs; 
CREATE INDEX idx_reset_logs ON reset_logs (username, expiration_timestamp);

DROP TABLE IF EXISTS signin_logs;
CREATE TABLE signin_logs
	(
        orgid TEXT, 
  		username TEXT, 
    	signin_timestamp DATE, 
        ip_address TEXT, 
        city TEXT, 
        region TEXT, 
        country TEXT, 
        zip TEXT, 
        lat FLOAT, 
        lon FLOAT, 
        timezone TEXT
  	);
DROP INDEX IF EXISTS idx_signin_logs; 
CREATE INDEX idx_signin_logs ON signin_logs (orgid, username, signin_timestamp);

DROP TABLE IF EXISTS permission_logs;
CREATE TABLE permission_logs
	(
        orgid TEXT, 
  		username TEXT, 
        changed_by TEXT, 
        permission TEXT, 
        old_value TEXT,
        new_value TEXT, 
        timestamp TIMESTAMP, 
        ip_address TEXT
    ); 
DROP INDEX IF EXISTS idx_permission_logs; 
CREATE INDEX idx_permission_logs ON permission_logs (orgid, username, changed_by, timestamp);

DROP TABLE IF EXISTS export_logs;
CREATE TABLE export_logs
	(
        orgid TEXT, 
  		username TEXT, 
        dataset TEXT,
        file_type TEXT, 
        timestamp TIMESTAMP, 
        ip_address TEXT
    ); 
DROP INDEX IF EXISTS idx_export_logs; 
CREATE INDEX idx_export_logs ON export_logs (orgid, username, dataset);

DROP TABLE IF EXISTS users_tokens; 
CREATE TABLE users_tokens 
    (
        username VARCHAR PRIMARY KEY,
        token VARCHAR NOT NULL,
        expiration TIMESTAMP NOT NULL
    );
DROP INDEX IF EXISTS idx_users_tokens; 
CREATE INDEX idx_users_tokens ON users_tokens (username, token);

DROP TABLE IF EXISTS users;
CREATE TABLE users
	(
        orgid TEXT, 
  		username TEXT, 
        email TEXT, 
        phone TEXT,
        first_name TEXT, 
        last_name TEXT, 
        image TEXT,
        role TEXT, 
        salt TEXT, 
        hashed_password TEXT, 
        slug VARCHAR(32) UNIQUE,
        is_admin TEXT, 
        timezone TEXT,
        verified BOOL, 
        verification_token TEXT, 
        created_at DATE,
        twofaenabled BOOL, 
        multifaenabled BOOL, 
        loginnotisenabled BOOL, 
        exportnotisenabled BOOL, 
        datashareenabled BOOL, 
        showpersonalemail BOOL, 
        showpersonalphone BOOL, 
        showteamid BOOL, 
        showteamemail BOOL, 
        showteamphone BOOL, 
        showteamadminstatus BOOL, 
        showteamrole BOOL, 
        idekeybinds JSONB, 
        idezoomlevel FLOAT, 
        idecolortheme TEXT, 
        github_id TEXT, 
        github_username TEXT, 
        github_access_token TEXT,
        github_avatar_url TEXT, 
  	); 
DROP INDEX IF EXISTS idx_users; 
CREATE INDEX idx_users ON users (orgid, username, created_at);

DROP TABLE IF EXISTS admins;
CREATE TABLE admins (
    username TEXT,
    email TEXT,
    roles TEXT,
    salt TEXT,
    hashed_password TEXT
);
DROP INDEX IF EXISTS idx_admins; 
CREATE INDEX idx_admins ON admins (username, email);

INSERT INTO admins 
SELECT username, email, 'CEO, COO, CTO', salt, hashed_password
FROM users 
WHERE username = 'piacobelli';

DROP TABLE IF EXISTS app_configurations;
CREATE TABLE app_configurations (
    config_id TEXT,
    orgid TEXT,
    app_name TEXT,
    app_description TEXT,
    frontend_url TEXT,
    backend_url TEXT,
    custom_domain TEXT,
    is_active BOOL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
DROP INDEX IF EXISTS idx_app_configurations;
CREATE INDEX idx_app_configurations ON app_configurations (orgid, is_active);

DROP TABLE IF EXISTS theme_configurations;
CREATE TABLE theme_configurations (
    theme_id TEXT,
    orgid TEXT,
    theme_name TEXT DEFAULT 'default',
    primary_color TEXT DEFAULT '#3b82f6',
    secondary_color TEXT DEFAULT '#10b981',
    tertiary_color TEXT DEFAULT '#f59e0b',
    quaternary_color TEXT DEFAULT '#ef4444',
    background_color TEXT DEFAULT '#ffffff',
    surface_color TEXT DEFAULT '#f8fafc',
    text_primary TEXT DEFAULT '#1f2937',
    text_secondary TEXT DEFAULT '#6b7280',
    border_color TEXT DEFAULT '#e5e7eb',
    success_color TEXT DEFAULT '#10b981',
    warning_color TEXT DEFAULT '#f59e0b',
    error_color TEXT DEFAULT '#ef4444',
    is_active BOOL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
DROP INDEX IF EXISTS idx_theme_configurations;
CREATE INDEX idx_theme_configurations ON theme_configurations (orgid, is_active);

DROP TABLE IF EXISTS asset_configurations;
CREATE TABLE asset_configurations (
    asset_id TEXT,
    orgid TEXT,
    asset_type TEXT,
    asset_name TEXT,
    asset_url TEXT,
    asset_path TEXT,
    asset_size INTEGER,
    mime_type TEXT,
    is_active BOOL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
DROP INDEX IF EXISTS idx_asset_configurations;
CREATE INDEX idx_asset_configurations ON asset_configurations (orgid, asset_type, is_active);

DROP TABLE IF EXISTS custom_styles;
CREATE TABLE custom_styles (
    style_id TEXT,
    orgid TEXT,
    component_name TEXT,
    css_properties JSONB,
    css_raw TEXT,
    is_active BOOL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
DROP INDEX IF EXISTS idx_custom_styles;
CREATE INDEX idx_custom_styles ON custom_styles (orgid, component_name, is_active);

DROP TABLE IF EXISTS services;
CREATE TABLE services (
    software TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    description TEXT,
    status_page_url TEXT,
    monitoring_url TEXT,
    documentation_url TEXT,
    is_active BOOL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
DROP INDEX IF EXISTS idx_services;
CREATE INDEX idx_services ON services (software, display_name, is_active);

DROP TABLE IF EXISTS incidents CASCADE;
CREATE TABLE incidents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    software TEXT NOT NULL,
    occurred_on DATE NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('major', 'warn', 'maint')),
    title TEXT,
    details TEXT,
    
    status TEXT DEFAULT 'investigating' CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved')),
    resolved BOOL DEFAULT false,
    resolved_at TIMESTAMP,
    resolution_details TEXT,
    
    estimated_affected_users INTEGER,
    actual_affected_users INTEGER,
    estimated_downtime_minutes INTEGER,
    actual_downtime_minutes INTEGER,
    revenue_impact DECIMAL(12,2),
    
    post_mortem_url TEXT,
    post_mortem_summary TEXT,
    post_mortem_published BOOL DEFAULT false,
    post_mortem_published_at TIMESTAMP,
    post_mortem_published_by TEXT,
    
    root_cause TEXT,
    root_cause_category TEXT,
    
    public_summary TEXT,
    internal_notes TEXT,
    
    detected_at TIMESTAMP,
    acknowledged_at TIMESTAMP,
    escalated_at TIMESTAMP,
    first_response_at TIMESTAMP,
    
    time_to_detect_minutes INTEGER,
    time_to_acknowledge_minutes INTEGER,
    time_to_resolve_minutes INTEGER,
    time_to_recovery_minutes INTEGER,
    
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    external_ticket_id TEXT,
    tags TEXT[],
    
    created_by TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (software) REFERENCES services(software)
);

DROP INDEX IF EXISTS idx_incidents_main;
CREATE INDEX idx_incidents_main ON incidents (software, occurred_on, severity, status, resolved);

DROP INDEX IF EXISTS idx_incidents_status;
CREATE INDEX idx_incidents_status ON incidents (status, resolved, created_at);

DROP INDEX IF EXISTS idx_incidents_resolution;
CREATE INDEX idx_incidents_resolution ON incidents (resolved, resolved_at);

DROP INDEX IF EXISTS idx_incidents_postmortem;
CREATE INDEX idx_incidents_postmortem ON incidents (post_mortem_published, post_mortem_published_at);

DROP INDEX IF EXISTS idx_incidents_severity_date;
CREATE INDEX idx_incidents_severity_date ON incidents (severity, occurred_on DESC);

DROP INDEX IF EXISTS idx_incidents_search;
CREATE INDEX idx_incidents_search ON incidents USING gin (to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(details, '') || ' ' || COALESCE(public_summary, '')));

DROP TABLE IF EXISTS incident_updates CASCADE;
CREATE TABLE incident_updates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    incident_id UUID NOT NULL,
    update_type TEXT NOT NULL CHECK (update_type IN ('investigating', 'identified', 'monitoring', 'update', 'resolved', 'postmortem')),
    message TEXT NOT NULL,
    internal_notes TEXT,
    
    notify_users BOOL DEFAULT false,
    notification_channels TEXT[],
    
    previous_status TEXT,
    new_status TEXT,
    
    escalated_to TEXT[],
    escalation_level TEXT,
    
    created_by TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE
);

DROP INDEX IF EXISTS idx_incident_updates_main;
CREATE INDEX idx_incident_updates_main ON incident_updates (incident_id, created_at DESC);

DROP INDEX IF EXISTS idx_incident_updates_type;
CREATE INDEX idx_incident_updates_type ON incident_updates (update_type, created_at DESC);

DROP TABLE IF EXISTS incident_impacts CASCADE;
CREATE TABLE incident_impacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    incident_id UUID NOT NULL,
    affected_component TEXT NOT NULL,
    impact_level TEXT NOT NULL CHECK (impact_level IN ('none', 'minor', 'major', 'critical')),
    impact_description TEXT,
    
    impact_start_time TIMESTAMP,
    impact_end_time TIMESTAMP,
    impact_duration_minutes INTEGER,
    
    affected_users_count INTEGER,
    affected_user_percentage DECIMAL(5,2),
    
    performance_degradation_percentage DECIMAL(5,2),
    error_rate_increase_percentage DECIMAL(5,2),
    
    affected_regions TEXT[],
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE
);

DROP INDEX IF EXISTS idx_incident_impacts_main;
CREATE INDEX idx_incident_impacts_main ON incident_impacts (incident_id, impact_level);

DROP INDEX IF EXISTS idx_incident_impacts_component;
CREATE INDEX idx_incident_impacts_component ON incident_impacts (affected_component, impact_start_time DESC);

DROP TABLE IF EXISTS incident_metrics CASCADE;
CREATE TABLE incident_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    incident_id UUID NOT NULL UNIQUE,
    
    detection_method TEXT,
    detection_time TIMESTAMP,
    first_alert_time TIMESTAMP,
    
    acknowledgment_time TIMESTAMP,
    first_response_time TIMESTAMP,
    escalation_time TIMESTAMP,
    resolution_time TIMESTAMP,
    recovery_time TIMESTAMP,
    verification_time TIMESTAMP,
    
    time_to_detect INTEGER,
    time_to_acknowledge INTEGER,
    time_to_first_response INTEGER,
    time_to_escalate INTEGER,
    time_to_resolve INTEGER,
    time_to_recover INTEGER,
    mttr_minutes INTEGER,
    mtbf_hours INTEGER,
    
    affected_users_count INTEGER,
    max_affected_users INTEGER,
    revenue_impact DECIMAL(12,2),
    sla_breach BOOL DEFAULT false,
    sla_target_minutes INTEGER,
    sla_actual_minutes INTEGER,
    
    downtime_minutes INTEGER,
    partial_downtime_minutes INTEGER,
    availability_percentage DECIMAL(5,2),
    
    updates_sent_count INTEGER,
    first_communication_delay_minutes INTEGER,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE
);

DROP INDEX IF EXISTS idx_incident_metrics_main;
CREATE INDEX idx_incident_metrics_main ON incident_metrics (incident_id);

DROP INDEX IF EXISTS idx_incident_metrics_mttr;
CREATE INDEX idx_incident_metrics_mttr ON incident_metrics (mttr_minutes, created_at DESC);

DROP INDEX IF EXISTS idx_incident_metrics_sla;
CREATE INDEX idx_incident_metrics_sla ON incident_metrics (sla_breach, sla_actual_minutes);

DROP TABLE IF EXISTS incident_templates CASCADE;
CREATE TABLE incident_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_name TEXT NOT NULL,
    template_type TEXT NOT NULL CHECK (template_type IN ('initial', 'update', 'resolution', 'postmortem', 'escalation')),
    severity_level TEXT CHECK (severity_level IN ('major', 'warn', 'maint')),
    
    subject_template TEXT,
    body_template TEXT,
    sms_template TEXT,
    slack_template TEXT,
    
    auto_send BOOL DEFAULT false,
    send_delay_minutes INTEGER DEFAULT 0,
    target_audience TEXT[],
    
    requires_approval BOOL DEFAULT false,
    approval_required_from TEXT[],
    
    is_active BOOL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DROP INDEX IF EXISTS idx_incident_templates_main;
CREATE INDEX idx_incident_templates_main ON incident_templates (template_type, severity_level, is_active);

DROP TABLE IF EXISTS incident_escalation_rules CASCADE;
CREATE TABLE incident_escalation_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rule_name TEXT NOT NULL,
    
    severity_level TEXT NOT NULL CHECK (severity_level IN ('major', 'warn', 'maint')),
    trigger_condition TEXT NOT NULL,
    trigger_value TEXT NOT NULL,
    
    escalation_minutes INTEGER,
    escalation_business_hours_only BOOL DEFAULT false,
    
    notification_channels JSONB,
    escalation_contacts JSONB,
    auto_escalate_status BOOL DEFAULT false,
    escalate_to_status TEXT,
    
    requires_manual_trigger BOOL DEFAULT false,
    max_escalations INTEGER DEFAULT 3,
    
    active_days INTEGER[] DEFAULT '{1,2,3,4,5,6,7}',
    active_hours_start TIME DEFAULT '00:00:00',
    active_hours_end TIME DEFAULT '23:59:59',
    timezone TEXT DEFAULT 'UTC',
    
    is_active BOOL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DROP INDEX IF EXISTS idx_incident_escalation_rules_main;
CREATE INDEX idx_incident_escalation_rules_main ON incident_escalation_rules (severity_level, trigger_condition, is_active);

DROP TABLE IF EXISTS incident_notifications CASCADE;
CREATE TABLE incident_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    incident_id UUID NOT NULL,
    incident_update_id UUID,
    
    notification_type TEXT NOT NULL CHECK (notification_type IN ('email', 'slack', 'sms', 'webhook', 'push')),
    channel TEXT,
    recipient TEXT NOT NULL,
    recipient_type TEXT CHECK (recipient_type IN ('user', 'group', 'role', 'external')),
    
    subject TEXT,
    message TEXT,
    template_used UUID,
    
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    failed_at TIMESTAMP,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    error_message TEXT,
    error_code TEXT,
    
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    delivery_method TEXT,
    scheduled_for TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
    FOREIGN KEY (incident_update_id) REFERENCES incident_updates(id) ON DELETE SET NULL,
    FOREIGN KEY (template_used) REFERENCES incident_templates(id) ON DELETE SET NULL
);

DROP INDEX IF EXISTS idx_incident_notifications_main;
CREATE INDEX idx_incident_notifications_main ON incident_notifications (incident_id, notification_type, status);

DROP INDEX IF EXISTS idx_incident_notifications_delivery;
CREATE INDEX idx_incident_notifications_delivery ON incident_notifications (status, sent_at, delivered_at);

DROP INDEX IF EXISTS idx_incident_notifications_retry;
CREATE INDEX idx_incident_notifications_retry ON incident_notifications (status, retry_count, created_at) WHERE status = 'failed';

DROP TABLE IF EXISTS incident_subscribers CASCADE;
CREATE TABLE incident_subscribers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    email TEXT,
    phone TEXT,
    slack_user_id TEXT,
    webhook_url TEXT,
    
    services TEXT[],
    severity_levels TEXT[] DEFAULT '{major,warn,maint}',
    notification_types TEXT[] DEFAULT '{email}',
    
    immediate_notification BOOL DEFAULT true,
    digest_frequency TEXT CHECK (digest_frequency IN ('none', 'daily', 'weekly')),
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    timezone TEXT DEFAULT 'UTC',
    
    is_active BOOL DEFAULT true,
    subscription_source TEXT,
    confirmation_token TEXT,
    confirmed BOOL DEFAULT false,
    confirmed_at TIMESTAMP,
    
    unsubscribe_token TEXT UNIQUE,
    unsubscribed_at TIMESTAMP,
    unsubscribe_reason TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DROP INDEX IF EXISTS idx_incident_subscribers_main;
CREATE INDEX idx_incident_subscribers_main ON incident_subscribers (email, is_active, confirmed);

DROP INDEX IF EXISTS idx_incident_subscribers_services;
CREATE INDEX idx_incident_subscribers_services ON incident_subscribers USING gin (services);

INSERT INTO services (software, display_name, description) VALUES 
    ('playground', 'Dino Labs Playground', 'Interactive development and testing environment'),
    ('dinosat', 'Dino Sat', 'Satellite data processing and analysis platform'),
    ('dinobrain', 'Dino Brain', 'AI/ML model training and inference service'),
    ('neurostat', 'NeuroStat API', 'Statistical analysis and reporting API')
ON CONFLICT (software) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO incident_templates (template_name, template_type, severity_level, subject_template, body_template, auto_send, target_audience) VALUES 
    ('Major Outage Initial', 'initial', 'major', 
     '[INCIDENT] Major outage affecting {{service_name}}', 
     'We are currently experiencing a major outage affecting {{service_name}}. Our team has been notified and is investigating the issue. We will provide updates as more information becomes available.

Incident ID: {{incident_id}}
Started at: {{start_time}}
Affected service: {{service_name}}

We apologize for any inconvenience and are working to restore service as quickly as possible.',
     true, '{customers,internal}'),
     
    ('Degraded Performance Initial', 'initial', 'warn', 
     '[INCIDENT] Degraded performance on {{service_name}}', 
     'We are currently experiencing degraded performance on {{service_name}}. Our team is investigating the issue and working to restore normal service levels.

Incident ID: {{incident_id}}
Started at: {{start_time}}
Affected service: {{service_name}}
Estimated impact: {{affected_users}} users

We will continue to monitor the situation and provide updates.',
     true, '{customers,internal}'),
     
    ('Maintenance Notice', 'initial', 'maint', 
     '[MAINTENANCE] Scheduled maintenance for {{service_name}}', 
     'We will be performing scheduled maintenance on {{service_name}} starting at {{start_time}}. Expected duration: {{duration}}. Service may be temporarily unavailable during this time.

Maintenance ID: {{incident_id}}
Service: {{service_name}}
Start time: {{start_time}}
Expected duration: {{duration}}

We apologize for any inconvenience.',
     true, '{customers,internal}'),
     
    ('Incident Resolution', 'resolution', null, 
     '[RESOLVED] {{service_name}} incident resolved', 
     'The incident affecting {{service_name}} has been resolved. All systems are now operating normally.

Incident ID: {{incident_id}}
Service: {{service_name}}
Duration: {{duration}}
Resolution: {{resolution_details}}

We apologize for any inconvenience caused and thank you for your patience.',
     true, '{customers,internal}'),
     
    ('Post Mortem Published', 'postmortem', null, 
     '[POST MORTEM] Analysis of {{service_name}} incident available', 
     'We have published a detailed post mortem analysis of the recent {{service_name}} incident.

Incident ID: {{incident_id}}
Service: {{service_name}}
Incident date: {{occurred_on}}
Post mortem URL: {{post_mortem_url}}

This analysis includes the root cause, timeline, impact assessment, and measures we are taking to prevent similar incidents in the future.',
     false, '{customers,internal,stakeholders}'),
     
    ('Executive Escalation', 'escalation', 'major',
     '[URGENT] Major incident requires executive attention - {{service_name}}',
     'A major incident affecting {{service_name}} has been escalated to executive level due to {{escalation_reason}}.

Incident ID: {{incident_id}}
Service: {{service_name}}
Duration: {{duration}}
Affected users: {{affected_users}}
Revenue impact: {{revenue_impact}}

Immediate executive attention and decision-making may be required.',
     false, '{executives}')
ON CONFLICT DO NOTHING;

INSERT INTO incident_escalation_rules (rule_name, severity_level, trigger_condition, trigger_value, escalation_minutes, notification_channels, escalation_contacts) VALUES 
    ('Major Incident Auto-Escalation', 'major', 'time_based', '{"minutes": 15}', 15, 
     '{"email": true, "slack": true, "sms": true}', 
     '[{"type": "role", "value": "oncall_engineer"}, {"type": "role", "value": "engineering_manager"}]'),
     
    ('Critical User Impact Escalation', 'major', 'user_count', '{"threshold": 1000}', 5,
     '{"email": true, "slack": true, "sms": true}',
     '[{"type": "role", "value": "engineering_director"}, {"type": "role", "value": "cto"}]'),
     
    ('Revenue Impact Escalation', 'major', 'revenue_impact', '{"threshold": 10000}', 10,
     '{"email": true, "slack": true}',
     '[{"type": "role", "value": "cto"}, {"type": "role", "value": "ceo"}]'),
     
    ('Degraded Performance Escalation', 'warn', 'time_based', '{"minutes": 30}', 30, 
     '{"email": true, "slack": true}', 
     '[{"type": "role", "value": "support_manager"}, {"type": "role", "value": "engineering_manager"}]'),
     
    ('Extended Maintenance Escalation', 'maint', 'time_based', '{"minutes": 60}', 60, 
     '{"email": true}', 
     '[{"type": "role", "value": "operations_manager"}]')
ON CONFLICT DO NOTHING;

DROP VIEW IF EXISTS active_incidents;
CREATE VIEW active_incidents AS
SELECT 
    i.*,
    s.display_name as service_display_name,
    im.affected_users_count,
    im.mttr_minutes,
    im.downtime_minutes,
    CASE 
        WHEN i.resolved = false THEN EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - i.created_at))/60
        ELSE i.time_to_resolve_minutes
    END as current_duration_minutes
FROM incidents i
LEFT JOIN services s ON i.software = s.software
LEFT JOIN incident_metrics im ON i.id = im.incident_id
WHERE i.resolved = false
ORDER BY i.severity DESC, i.created_at DESC;

DROP VIEW IF EXISTS incident_summary;
CREATE VIEW incident_summary AS
SELECT 
    i.id,
    i.software,
    s.display_name as service_name,
    i.title,
    i.severity,
    i.status,
    i.occurred_on,
    i.resolved,
    i.resolved_at,
    i.time_to_resolve_minutes,
    im.affected_users_count,
    im.revenue_impact,
    im.downtime_minutes,
    COALESCE(update_count.total, 0) as update_count,
    i.post_mortem_published,
    i.created_at,
    i.updated_at
FROM incidents i
LEFT JOIN services s ON i.software = s.software
LEFT JOIN incident_metrics im ON i.id = im.incident_id
LEFT JOIN (
    SELECT incident_id, COUNT(*) as total 
    FROM incident_updates 
    GROUP BY incident_id
) update_count ON i.id = update_count.incident_id
ORDER BY i.created_at DESC;

CREATE OR REPLACE FUNCTION update_incident_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    
    IF NEW.resolved = true AND OLD.resolved = false THEN
        NEW.resolved_at = CURRENT_TIMESTAMP;
        NEW.status = 'resolved';
        
        IF NEW.time_to_resolve_minutes IS NULL THEN
            NEW.time_to_resolve_minutes = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - NEW.created_at))/60;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS incident_timestamp_trigger ON incidents;
CREATE TRIGGER incident_timestamp_trigger
    BEFORE UPDATE ON incidents
    FOR EACH ROW
    EXECUTE FUNCTION update_incident_timestamps();

CREATE OR REPLACE FUNCTION create_incident_metrics()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO incident_metrics (incident_id, detection_time, created_at)
    VALUES (NEW.id, NEW.detected_at, CURRENT_TIMESTAMP);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS incident_metrics_trigger ON incidents;
CREATE TRIGGER incident_metrics_trigger
    AFTER INSERT ON incidents
    FOR EACH ROW
    EXECUTE FUNCTION create_incident_metrics();