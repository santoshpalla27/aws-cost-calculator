#!/bin/bash
export DB_ENDPOINT=${db_endpoint}

# Update system packages
apt-get update
apt-get upgrade -y

# Install necessary packages
apt-get install -y nginx git

# Start and enable nginx
systemctl start nginx
systemctl enable nginx

# Create a simple index.html
cat > /var/www/html/index.html << EOF
<!DOCTYPE html>
<html>
<head>
    <title>My Application</title>
</head>
<body>
    <h1>Welcome to My Application!</h1>
    <p>Database Endpoint: $DB_ENDPOINT</p>
</body>
</html>
EOF

# Restart nginx to apply changes
systemctl restart nginx

# Install Docker
apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add ubuntu user to docker group
usermod -aG docker ubuntu

echo "Setup completed!"