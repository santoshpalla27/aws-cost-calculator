-- Migration: Create cost_reports table
-- Description: Create the cost reports table to store cost analysis results

CREATE TABLE cost_reports (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    data JSONB,
    total_monthly_cost DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cost_reports_created_at ON cost_reports(created_at);

-- Create trigger to automatically update the updated_at column
CREATE TRIGGER update_cost_reports_updated_at BEFORE UPDATE ON cost_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();