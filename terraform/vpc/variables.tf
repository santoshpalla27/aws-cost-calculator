variable "project_name" {
  description = "project name"
  default = "4-tier-project"
  type = string
}

variable "cidr_block" {
  description = "this is an aws vpc cidr"  
  type = string
}

variable "public_subnet_cidr" {
  description = "public subnet cidrs"
  type = list(string)
}

variable "private_subnet_cidr" {
  description = "private subnet cidrs"
  type = list(string)
}

variable "availability_zone" {
  description = "value of availability zone"
  type = list(string)
}

