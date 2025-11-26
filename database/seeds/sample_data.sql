-- Sample data for development and testing

-- Insert sample admin user
-- Password: Admin@123
INSERT INTO users (email, password, first_name, last_name, role) VALUES
('admin@infracost.com', '\$2a\$10\$rYvLpqN1D2O5pI3LxKxVN.GqvS8qrLJ3HYFvKHkEy2cXk8xH7RzCi', 'Admin', 'User', 'admin');

-- Insert sample regular user
-- Password: User@123
INSERT INTO users (email, password, first_name, last_name, role) VALUES
('user@infracost.com', '\$2a\$10\$5H3QHXL8jFP8LnJdqXJ8.eZvCgYqLK8yZqXJDH6xY9jQm8L6K7H9i', 'John', 'Doe', 'user');

-- Insert sample cost reports
INSERT INTO cost_reports (user_id, type, name, data, total_monthly_cost) VALUES
(
    (SELECT id FROM users WHERE email = 'user@infracost.com'),
    'terraform',
    'Production Infrastructure',
    '{"resources": [{"name": "aws_instance.web", "type": "aws_instance", "monthlyCost": 45.50}]}',
    45.50
);

-- Insert sample AWS calculations
INSERT INTO aws_calculations (user_id, calculation_type, input_parameters, result, total_monthly_cost, region) VALUES
(
    (SELECT id FROM users WHERE email = 'user@infracost.com'),
    'ec2',
    '{"instanceType": "t3.medium", "region": "us-east-1"}',
    '{"instanceCost": {"monthly": 30.40}, "totalMonthlyCost": 30.40}',
    30.40,
    'us-east-1'
);