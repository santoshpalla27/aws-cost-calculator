-- Database initialization script for InfraCost Analyzer Pro

-- Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS infracost_analyzer;

-- Use the database
\c infracost_analyzer;

-- Enable extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create cost_reports table
CREATE TABLE IF NOT EXISTS cost_reports (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    data JSONB,
    total_monthly_cost DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create terraform_runs table
CREATE TABLE IF NOT EXISTS terraform_runs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    terraform_config JSONB,
    cost_result JSONB,
    total_monthly_cost DECIMAL(10, 2),
    status VARCHAR(50) DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create aws_calculations table
CREATE TABLE IF NOT EXISTS aws_calculations (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    service_type VARCHAR(50) NOT NULL,
    calculation_params JSONB,
    result JSONB,
    total_monthly_cost DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_cost_reports_created_at ON cost_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_terraform_runs_user_id ON terraform_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_terraform_runs_created_at ON terraform_runs(created_at);
CREATE INDEX IF NOT EXISTS idx_aws_calculations_user_id ON aws_calculations(user_id);
CREATE INDEX IF NOT EXISTS idx_aws_calculations_service_type ON aws_calculations(service_type);
CREATE INDEX IF NOT EXISTS idx_aws_calculations_created_at ON aws_calculations(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update the updated_at column
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cost_reports_updated_at BEFORE UPDATE ON cost_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_terraform_runs_updated_at BEFORE UPDATE ON terraform_runs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_aws_calculations_updated_at BEFORE UPDATE ON aws_calculations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();