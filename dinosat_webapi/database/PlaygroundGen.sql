
DROP TABLE IF EXISTS ide_edit_logs; 
CREATE TABLE ide_edit_logs (
    orgid TEXT, 
    username TEXT, 
    language TEXT,
    script_name TEXT, 
    timestamp TIMESTAMP, 
    ip_address TEXT
); 
DROP INDEX IF EXISTS idx_ide_edit_logs; 
CREATE INDEX idx_ide_edit_logs ON ide_edit_logs (orgid, username, language, script_name);

DROP TABLE IF EXISTS calendar_events;
CREATE TABLE calendar_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    orgid TEXT,
    username TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    location TEXT,
    attendees TEXT[],
    reminder_minutes INTEGER DEFAULT 15,
    color TEXT DEFAULT '#3B82F6',
    event_type TEXT DEFAULT 'event',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DROP INDEX IF EXISTS idx_calendar_events;
CREATE INDEX idx_calendar_events ON calendar_events (orgid, username, start_date, end_date);

DROP INDEX IF EXISTS idx_calendar_events_date_range;
CREATE INDEX idx_calendar_events_date_range ON calendar_events (username, start_date, end_date) WHERE orgid IS NULL;

DROP INDEX IF EXISTS idx_calendar_events_org_date_range;
CREATE INDEX idx_calendar_events_org_date_range ON calendar_events (orgid, start_date, end_date) WHERE orgid IS NOT NULL;

DROP TABLE IF EXISTS database_connections;
CREATE TABLE database_connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    orgid TEXT,
    username TEXT NOT NULL,
    connection_name TEXT NOT NULL,
    host TEXT NOT NULL,
    port INTEGER DEFAULT 5432,
    database_name TEXT NOT NULL,
    db_username TEXT NOT NULL,
    db_password_encrypted TEXT NOT NULL,
    ssl_mode TEXT DEFAULT 'require',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_connected_at TIMESTAMP
);

DROP INDEX IF EXISTS idx_database_connections;
CREATE INDEX idx_database_connections ON database_connections (orgid, username);

DROP INDEX IF EXISTS idx_database_connections_name;
CREATE INDEX idx_database_connections_name ON database_connections (username, connection_name);

