-- Migration: Create terraform_runs table
-- Description: Create the terraform runs table to track Terraform cost estimations

CREATE TABLE terraform_runs (
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

CREATE INDEX idx_terraform_runs_user_id ON terraform_runs(user_id);
CREATE INDEX idx_terraform_runs_created_at ON terraform_runs(created_at);

-- Create trigger to automatically update the updated_at column
CREATE TRIGGER update_terraform_runs_updated_at BEFORE UPDATE ON terraform_runs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();