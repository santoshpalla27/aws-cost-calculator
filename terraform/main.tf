provider "aws" {
  region = "us-east-1"
}

module "vpc" {
  source = "./vpc"
  cidr_block = "10.0.0.0/16"
  public_subnet_cidr = ["10.0.1.0/24" , "10.0.2.0/24","10.0.3.0/24" , "10.0.4.0/24"]
  private_subnet_cidr = ["10.0.5.0/24" , "10.0.6.0/24","10.0.7.0/24" , "10.0.8.0/24"]
  availability_zone = ["us-east-1a", "us-east-1b","us-east-1c" , "us-east-1d"] 
}

# IAM Role for EC2 to describe EC2 instances
resource "aws_iam_role" "ec2_describe_role" {
  name = "ec2-describe-instances-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "EC2-Describe-Instances-Role"
  }
}

# Policy allowing EC2 instances to describe other EC2 instances
resource "aws_iam_policy" "ec2_describe_policy" {
  name        = "ec2-describe-instances-policy"
  description = "Allow EC2 instances to describe other EC2 instances"
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ec2:DescribeInstances",
          "ec2:DescribeTags",
          "rds:DescribeDBInstances",
          "rds:DescribeDBClusters"
        ]
        Resource = "*"
      }
    ]
  })
}

# Attach the policy to the role
resource "aws_iam_role_policy_attachment" "ec2_describe_policy_attach" {
  role       = aws_iam_role.ec2_describe_role.name
  policy_arn = aws_iam_policy.ec2_describe_policy.arn
}

# Create the instance profile
resource "aws_iam_instance_profile" "ec2_describe_profile" {
  name = "ec2-describe-instances-profile"
  role = aws_iam_role.ec2_describe_role.name
}

# Output the instance profile name (to use when launching instances)
output "instance_profile_name" {
  value = aws_iam_instance_profile.ec2_describe_profile.name
}


# module "ec2-frotend" {
#   source = "./ec2"
#   ami = "ami-08b5b3a93ed654d19"
#   instance_type = "t2.micro"
#   key_name = "santosh"
#   security_group_id = module.vpc.frotend_sg_security_groups
#   subnet_id = module.vpc.public_subnet_ids[0]
#   name = "frotend"
#   depends_on = [ module.ec2-backend ]
#   user_data = <<-EOF
#               #!/bin/bash
#               sudo yum install ansible git -y
#               git clone https://github.com/santoshpalla27/4-tier-project.git
#               cd 4-tier-project/ansible
#               /usr/bin/ansible-playbook frontend.yaml
#               EOF
#   instance_profile_name = aws_iam_instance_profile.ec2_describe_profile.name
# }











# asg for frontend

resource "aws_security_group" "alb_sg" {
  name        = "alb-sg"
  description = "Security group for Application Load Balancer"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
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

# Launch template
resource "aws_launch_template" "asg_launch_template" {
  name_prefix   = "frontend-lunch-template-"
  image_id      = "ami-08b5b3a93ed654d19"  # Replace with your desired AMI
  instance_type = "t2.micro"
  key_name      = "santosh"  # Replace with your key pair

  network_interfaces {
    associate_public_ip_address = true
    security_groups             = [module.vpc.frotend_sg_security_groups]
  }

  iam_instance_profile {
    name = aws_iam_instance_profile.ec2_describe_profile.name
  }

  user_data = base64encode(<<-EOF
              #!/bin/bash
              sudo yum install ansible git -y
              git clone https://github.com/santoshpalla27/4-tier-project.git
              cd 4-tier-project/ansible
              /usr/bin/ansible-playbook frontend.yaml
              EOF
  )

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "frontend-asg-instance"
    }
  }
}

resource "aws_lb" "main" {
  name               = "frontend-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = module.vpc.public_subnet_ids
  
  enable_deletion_protection = false
  
  tags = {
    Name = "main-alb"
  }
}

# ALB Target Group  Target Group should have the Application Port (the internal port your app listens on)
resource "aws_lb_target_group" "main" {
  name     = "main-tg"
  port     = 80
  protocol = "HTTP"
  vpc_id   = module.vpc.vpc_id
  
  health_check {
    enabled             = true
    interval            = 30
    path                = "/dummy-health"
    port                = "traffic-port"
    healthy_threshold   = 3
    unhealthy_threshold = 3
    timeout             = 5
    protocol            = "HTTP"
    matcher             = "200"
  }
}

# ALB Listener  ✅ Listener should have the Traffic Port (e.g., 80 or 443)
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"
  
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.main.arn
  }
}


# Auto Scaling Group
resource "aws_autoscaling_group" "main" {
  name = "main-asg"
  min_size             = 2
  max_size             = 5
  desired_capacity     = 2
  vpc_zone_identifier  = module.vpc.public_subnet_ids
  health_check_type    = "EC2"
  health_check_grace_period = 300
  force_delete         = true
  depends_on = [ module.ec2-backend ]
  target_group_arns    = [aws_lb_target_group.main.arn]

  launch_template {
    id      = aws_launch_template.asg_launch_template.id
    version = "$Latest"
  }

  tag {
    key                 = "frontend-asg-instance"
    value               = "asg-instance"
    propagate_at_launch = true
  }
}

# Scale Up Policy
resource "aws_autoscaling_policy" "scale_up" {
  name                   = "scale-up"
  scaling_adjustment     = 1
  adjustment_type        = "ChangeInCapacity"
  cooldown               = 300
  autoscaling_group_name = aws_autoscaling_group.main.name
}

# CloudWatch Alarm to trigger Scale Up Policy with 70% CPU threshold
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "high-cpu-usage"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 120
  statistic           = "Average"
  threshold           = 70  

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.main.name
  }

  alarm_description = "Scale up if CPU usage is above 70% for 4 minutes"
  alarm_actions     = [aws_autoscaling_policy.scale_up.arn]
}

# Scale Down Policy
resource "aws_autoscaling_policy" "scale_down" {
  name                   = "scale-down"
  scaling_adjustment     = -1
  adjustment_type        = "ChangeInCapacity"
  cooldown               = 300
  autoscaling_group_name = aws_autoscaling_group.main.name
}

# CloudWatch Alarm to trigger Scale Down Policy
resource "aws_cloudwatch_metric_alarm" "low_cpu" {
  alarm_name          = "low-cpu-usage"
  comparison_operator = "LessThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 120
  statistic           = "Average"
  threshold           = 40

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.main.name
  }

  alarm_description = "Scale down if CPU usage is below 40% for 4 minutes"
  alarm_actions     = [aws_autoscaling_policy.scale_down.arn]
}

# Output the ALB DNS name
output "alb_dns_name" {
  description = "The DNS name of the load balancer"
  value       = aws_lb.main.dns_name
}














module "ec2-backend" {
  source = "./ec2"
  ami = "ami-08b5b3a93ed654d19"
  instance_type = "t2.micro"
  key_name = "santosh"
  security_group_id = module.vpc.backend_sg_security_groups
  subnet_id = module.vpc.private_subnet_ids[0]
  name = "backend"
  depends_on = [ aws_db_instance.database , module.cache-ec2 ,  ]
  user_data = <<-EOF
              #!/bin/bash
              sudo yum install ansible git -y
              git clone https://github.com/santoshpalla27/4-tier-project.git
              cd 4-tier-project/ansible
              /usr/bin/ansible-playbook backend.yaml 
              EOF
   instance_profile_name = aws_iam_instance_profile.ec2_describe_profile.name
}

module "cache-ec2" {
  source = "./ec2"
  count = 4
  ami = "ami-08b5b3a93ed654d19"
  instance_type = "t2.micro"
  key_name = "santosh"
  security_group_id = module.vpc.cache_sg_security_groups
  subnet_id = module.vpc.private_subnet_ids[count.index % 2]
  name = "cache${count.index}"
  instance_profile_name = aws_iam_instance_profile.ec2_describe_profile.name
  user_data = <<-EOF
              #!/bin/bash
              sudo yum install ansible git -y
              git clone https://github.com/santoshpalla27/4-tier-project.git
              cd 4-tier-project/ansible
              /usr/bin/ansible-playbook redis.yaml
              EOF
}



resource "aws_db_instance" "database" {
  identifier = "database"
  allocated_storage = 20
  storage_type = "gp2"
  engine = "mysql"
  engine_version = "8.0"
  instance_class = "db.t3.micro"
  username = "admin"
  password = "admin123"
  multi_az = false
  publicly_accessible = false
  skip_final_snapshot = true
  vpc_security_group_ids = [module.vpc.database_sg_security_groups]
  db_subnet_group_name = module.vpc.rds_subnet_group
  tags = {
    Name = "database"
  }
}




