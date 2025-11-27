-- Sample data for InfraCost Analyzer Pro

-- Insert sample users
INSERT INTO users (email, password, role, is_active) VALUES
('admin@infracostanalyzer.com', '$2b$12$example_hash_for_admin_password', 'admin', true),
('user@infracostanalyzer.com', '$2b$12$example_hash_for_user_password', 'user', true);

-- Insert sample cost report
INSERT INTO cost_reports (name, description, data, total_monthly_cost) VALUES
('Sample Cost Report', 'This is a sample cost report for demonstration purposes', 
'{
  "totalMonthlyCost": 1250.75,
  "totalHourlyCost": 1.71,
  "resources": [
    {
      "name": "aws_instance.web_server",
      "type": "aws_instance",
      "monthlyCost": 50.25,
      "hourlyCost": 0.07,
      "details": {}
    },
    {
      "name": "aws_db_instance.production_db",
      "type": "aws_db_instance",
      "monthlyCost": 120.50,
      "hourlyCost": 0.16,
      "details": {}
    }
  ],
  "services": [
    {
      "name": "EC2",
      "monthlyCost": 50.25,
      "resources": [
        {
          "name": "aws_instance.web_server",
          "type": "aws_instance",
          "monthlyCost": 50.25,
          "hourlyCost": 0.07
        }
      ]
    },
    {
      "name": "RDS",
      "monthlyCost": 120.50,
      "resources": [
        {
          "name": "aws_db_instance.production_db",
          "type": "aws_db_instance",
          "monthlyCost": 120.50,
          "hourlyCost": 0.16
        }
      ]
    }
  ]
}', 1250.75);

-- Insert sample terraform run
INSERT INTO terraform_runs (user_id, name, description, terraform_config, cost_result, total_monthly_cost, status) 
SELECT 
  id,
  'Sample Terraform Run',
  'This is a sample Terraform cost estimation run',
  '{
    "source": "files",
    "terraformFiles": {
      "main.tf": "resource \"aws_instance\" \"web\" {\n  ami           = \"ami-0c55b159cbfafe1d0\"\n  instance_type = \"t3.micro\"\n}"
    }
  }',
  '{
    "totalMonthlyCost": 1250.75,
    "totalHourlyCost": 1.71,
    "resources": [
      {
        "name": "aws_instance.web",
        "type": "aws_instance",
        "monthlyCost": 50.25,
        "hourlyCost": 0.07,
        "details": {}
      }
    ],
    "services": [
      {
        "name": "EC2",
        "monthlyCost": 50.25,
        "resources": [
          {
            "name": "aws_instance.web",
            "type": "aws_instance",
            "monthlyCost": 50.25,
            "hourlyCost": 0.07
          }
        ]
      }
    ]
  }',
  1250.75,
  'completed'
FROM users WHERE email = 'user@infracostanalyzer.com';

-- Insert sample AWS calculation
INSERT INTO aws_calculations (user_id, service_type, calculation_params, result, total_monthly_cost)
SELECT 
  id,
  'ec2',
  '{
    "instanceType": "t3.micro",
    "region": "us-east-1",
    "os": "linux",
    "purchaseOption": "on-demand",
    "quantity": 2,
    "hoursPerMonth": 730
  }',
  '{
    "monthlyCost": 22.96,
    "hourlyCost": 0.0314,
    "breakdown": {
      "instanceCost": 22.96,
      "ebsCost": 0,
      "dataTransferCost": 0
    }
  }',
  22.96
FROM users WHERE email = 'user@infracostanalyzer.com';

-- Insert sample audit log
INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
SELECT 
  id,
  'login',
  'user',
  id::text,
  '{"success": true}',
  '127.0.0.1',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
FROM users WHERE email = 'admin@infracostanalyzer.com';