-- Migration: Create aws_calculations table
-- Description: Create the AWS calculations table to store manual cost calculations

CREATE TABLE aws_calculations (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    service_type VARCHAR(50) NOT NULL,
    calculation_params JSONB,
    result JSONB,
    total_monthly_cost DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_aws_calculations_user_id ON aws_calculations(user_id);
CREATE INDEX idx_aws_calculations_service_type ON aws_calculations(service_type);
CREATE INDEX idx_aws_calculations_created_at ON aws_calculations(created_at);

-- Create trigger to automatically update the updated_at column
CREATE TRIGGER update_aws_calculations_updated_at BEFORE UPDATE ON aws_calculations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();