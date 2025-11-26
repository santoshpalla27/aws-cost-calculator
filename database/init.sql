-- InfraCost Analyzer Pro Database Schema
-- PostgreSQL 15+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'user', 'viewer');
CREATE TYPE report_type AS ENUM ('terraform', 'aws_calculator');
CREATE TYPE calculation_type AS ENUM ('ec2', 'rds', 's3', 'eks');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role user_role DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Refresh tokens table
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token VARCHAR(500) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);

-- Cost reports table
CREATE TABLE cost_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type report_type NOT NULL,
    name VARCHAR(255) NOT NULL,
    data JSONB NOT NULL,
    total_monthly_cost DECIMAL(10, 2) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cost_reports_user_id ON cost_reports(user_id);
CREATE INDEX idx_cost_reports_type ON cost_reports(type);
CREATE INDEX idx_cost_reports_created_at ON cost_reports(created_at);
CREATE INDEX idx_cost_reports_cost ON cost_reports(total_monthly_cost);

-- Terraform runs table
CREATE TABLE terraform_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    report_id UUID REFERENCES cost_reports(id) ON DELETE SET NULL,
    source_type VARCHAR(20) NOT NULL, -- 'files', 'git', 'plan_json'
    git_url VARCHAR(500),
    git_branch VARCHAR(100),
    plan_json JSONB,
    infracost_output JSONB,
    total_monthly_cost DECIMAL(10, 2),
    total_hourly_cost DECIMAL(10, 4),
    resource_count INTEGER,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    error_message TEXT,
    execution_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX idx_terraform_runs_user_id ON terraform_runs(user_id);
CREATE INDEX idx_terraform_runs_status ON terraform_runs(status);
CREATE INDEX idx_terraform_runs_created_at ON terraform_runs(created_at);

-- AWS calculations table
CREATE TABLE aws_calculations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    report_id UUID REFERENCES cost_reports(id) ON DELETE SET NULL,
    calculation_type calculation_type NOT NULL,
    input_parameters JSONB NOT NULL,
    result JSONB NOT NULL,
    total_monthly_cost DECIMAL(10, 2) NOT NULL,
    total_hourly_cost DECIMAL(10, 4),
    region VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_aws_calculations_user_id ON aws_calculations(user_id);
CREATE INDEX idx_aws_calculations_type ON aws_calculations(calculation_type);
CREATE INDEX idx_aws_calculations_created_at ON aws_calculations(created_at);

-- Audit logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Saved configurations table
CREATE TABLE saved_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    config_type VARCHAR(50) NOT NULL, -- 'terraform', 'ec2', 'rds', 's3', 'eks'
    configuration JSONB NOT NULL,
    tags VARCHAR(50)[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_saved_configs_user_id ON saved_configurations(user_id);
CREATE INDEX idx_saved_configs_type ON saved_configurations(config_type);
CREATE INDEX idx_saved_configs_tags ON saved_configurations USING GIN(tags);

-- Cost alerts table
CREATE TABLE cost_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    threshold_amount DECIMAL(10, 2) NOT NULL,
    comparison_operator VARCHAR(10) NOT NULL, -- 'gt', 'gte', 'lt', 'lte', 'eq'
    alert_type VARCHAR(50) NOT NULL, -- 'monthly', 'daily', 'per_resource'
    is_active BOOLEAN DEFAULT TRUE,
    last_triggered_at TIMESTAMP,
    notification_emails VARCHAR(255)[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cost_alerts_user_id ON cost_alerts(user_id);
CREATE INDEX idx_cost_alerts_active ON cost_alerts(is_active);

-- Functions and Triggers

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS \$\$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
\$\$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_configurations_updated_at BEFORE UPDATE ON saved_configurations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cost_alerts_updated_at BEFORE UPDATE ON cost_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views

-- Monthly cost summary view
CREATE VIEW monthly_cost_summary AS
SELECT 
    user_id,
    DATE_TRUNC('month', created_at) AS month,
    COUNT(*) AS report_count,
    SUM(total_monthly_cost) AS total_cost,
    AVG(total_monthly_cost) AS avg_cost,
    MAX(total_monthly_cost) AS max_cost,
    MIN(total_monthly_cost) AS min_cost
FROM cost_reports
GROUP BY user_id, DATE_TRUNC('month', created_at);

-- User activity view
CREATE VIEW user_activity_summary AS
SELECT 
    u.id AS user_id,
    u.email,
    u.role,
    COUNT(DISTINCT cr.id) AS total_reports,
    COUNT(DISTINCT tr.id) AS terraform_runs,
    COUNT(DISTINCT ac.id) AS aws_calculations,
    SUM(cr.total_monthly_cost) AS total_estimated_cost,
    MAX(cr.created_at) AS last_activity
FROM users u
LEFT JOIN cost_reports cr ON u.id = cr.user_id
LEFT JOIN terraform_runs tr ON u.id = tr.user_id
LEFT JOIN aws_calculations ac ON u.id = ac.user_id
GROUP BY u.id, u.email, u.role;

-- Cost by service type view
CREATE VIEW cost_by_service AS
SELECT 
    user_id,
    calculation_type AS service,
    COUNT(*) AS calculation_count,
    SUM(total_monthly_cost) AS total_cost,
    AVG(total_monthly_cost) AS avg_cost,
    DATE_TRUNC('month', created_at) AS month
FROM aws_calculations
GROUP BY user_id, calculation_type, DATE_TRUNC('month', created_at);

-- Comments
COMMENT ON TABLE users IS 'Application users with role-based access control';
COMMENT ON TABLE cost_reports IS 'Stored cost analysis reports';
COMMENT ON TABLE terraform_runs IS 'History of Terraform cost estimations';
COMMENT ON TABLE aws_calculations IS 'History of AWS calculator runs';
COMMENT ON TABLE audit_logs IS 'Audit trail for all system actions';
COMMENT ON TABLE saved_configurations IS 'User-saved infrastructure configurations';
COMMENT ON TABLE cost_alerts IS 'Cost threshold alerts and notifications';