# RDS Instance Example

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "mydb"
}

variable "db_username" {
  description = "Database username"
  type        = string
  default     = "admin"
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "allocated_storage" {
  description = "Allocated storage in GB"
  type        = number
  default     = 20
}

# VPC for RDS
resource "aws_vpc" "rds_vpc" {
  cidr_block           = "10.1.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "RDS-VPC"
  }
}

# Subnets
resource "aws_subnet" "rds_subnet" {
  count = 2

  vpc_id                  = aws_vpc.rds_vpc.id
  cidr_block              = "10.1.${count.index}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = false

  tags = {
    Name = "RDS-Subnet-${count.index}"
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

# Subnet Group
resource "aws_db_subnet_group" "rds_subnet_group" {
  name       = "rds-subnet-group"
  subnet_ids = aws_subnet.rds_subnet[*].id

  tags = {
    Name = "RDS Subnet Group"
  }
}

# Security Group
resource "aws_security_group" "rds_sg" {
  name        = "rds-security-group"
  description = "Security group for RDS instance"
  vpc_id      = aws_vpc.rds_vpc.id

  ingress {
    description = "PostgreSQL from VPC"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.rds_vpc.cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# RDS Instance
resource "aws_db_instance" "rds_instance" {
  identifier             = "example-rds-instance"
  db_name                = var.db_name
  engine                 = "postgres"
  engine_version         = "13.7"
  instance_class         = var.db_instance_class
  allocated_storage      = var.allocated_storage
  max_allocated_storage  = 100
  storage_type           = "gp2"
  publicly_accessible    = false
  db_subnet_group_name   = aws_db_subnet_group.rds_subnet_group.name
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  username               = var.db_username
  password               = var.db_password
  skip_final_snapshot    = true
  backup_retention_period = 7

  tags = {
    Name = "Example RDS Instance"
  }
}

output "db_endpoint" {
  description = "Connection endpoint for the RDS instance"
  value       = aws_db_instance.rds_instance.endpoint
}

output "db_name" {
  description = "Name of the database"
  value       = aws_db_instance.rds_instance.db_name
}