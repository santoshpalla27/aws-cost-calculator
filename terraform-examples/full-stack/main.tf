# Full Stack Application Example

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.small"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

# VPC
resource "aws_vpc" "main_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "Main-VPC"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main_igw" {
  vpc_id = aws_vpc.main_vpc.id

  tags = {
    Name = "Main-IGW"
  }
}

# Public Subnet
resource "aws_subnet" "public_subnet" {
  vpc_id                  = aws_vpc.main_vpc.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true

  tags = {
    Name = "Public-Subnet"
  }
}

# Private Subnet
resource "aws_subnet" "private_subnet" {
  vpc_id            = aws_vpc.main_vpc.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = data.aws_availability_zones.available.names[0]

  tags = {
    Name = "Private-Subnet"
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

# Route Table
resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.main_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main_igw.id
  }

  tags = {
    Name = "Public-Route-Table"
  }
}

# Route Table Association
resource "aws_route_table_association" "public_assoc" {
  subnet_id      = aws_subnet.public_subnet.id
  route_table_id = aws_route_table.public_rt.id
}

# Security Groups
resource "aws_security_group" "web_sg" {
  name        = "web-security-group"
  description = "Security group for web servers"
  vpc_id      = aws_vpc.main_vpc.id

  ingress {
    description = "HTTP from Internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS from Internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "SSH from home"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "db_sg" {
  name        = "db-security-group"
  description = "Security group for database"
  vpc_id      = aws_vpc.main_vpc.id

  ingress {
    description = "PostgreSQL from Web Servers"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    security_groups = [aws_security_group.web_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# EC2 Instance
resource "aws_instance" "web_server" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name              = var.key_name
  vpc_security_group_ids = [aws_security_group.web_sg.id]
  subnet_id              = aws_subnet.public_subnet.id

  user_data = base64encode(templatefile("${path.module}/user_data.sh", {
    db_endpoint = aws_db_instance.app_db.endpoint
  }))

  tags = {
    Name = "Web-Server"
  }

  depends_on = [aws_internet_gateway.main_igw]
}

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]  # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-focal-20.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

variable "key_name" {
  description = "Name of the AWS key pair"
  type        = string
  default     = ""
}

# RDS Instance
resource "aws_db_instance" "app_db" {
  identifier             = "app-database"
  db_name                = "appdb"
  engine                 = "postgres"
  engine_version         = "13.7"
  instance_class         = var.db_instance_class
  allocated_storage      = 20
  max_allocated_storage  = 100
  storage_type           = "gp2"
  publicly_accessible    = false
  db_subnet_group_name   = aws_db_subnet_group.app_subnet_group.name
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  username               = "admin"
  password               = var.db_password
  skip_final_snapshot    = true
  backup_retention_period = 7

  tags = {
    Name = "Application Database"
  }
}

# DB Subnet Group
resource "aws_db_subnet_group" "app_subnet_group" {
  name       = "app-db-subnet-group"
  subnet_ids = [aws_subnet.private_subnet.id]

  tags = {
    Name = "App DB Subnet Group"
  }
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

# S3 Bucket
resource "aws_s3_bucket" "app_assets" {
  bucket = "my-app-assets-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name = "App Assets Bucket"
  }
}

resource "aws_s3_bucket_versioning" "app_assets_versioning" {
  bucket = aws_s3_bucket.app_assets.id
  versioning_configuration {
    status = "Enabled"
  }
}

data "aws_caller_identity" "current" {}

output "web_server_public_ip" {
  description = "Public IP of the web server"
  value       = aws_instance.web_server.public_ip
}

output "db_endpoint" {
  description = "Endpoint for the database"
  value       = aws_db_instance.app_db.endpoint
}

output "s3_bucket_name" {
  description = "Name of the S3 bucket"
  value       = aws_s3_bucket.app_assets.id
}