output "vpc_id" {
  value = aws_vpc.main.id
}

output "public_subnet_ids" {
  value = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  value = aws_subnet.private[*].id
}

output "frotend_sg_security_groups" {
  value = aws_security_group.frotend_sg.id
}
output "backend_sg_security_groups" {
    value = aws_security_group.backend_sg.id
}

output "database_sg_security_groups" {
    value = aws_security_group.database_sg.id
}

output "cache_sg_security_groups" {
    value = aws_security_group.cache_sg.id
}

output "rds_subnet_group" {
    value = aws_db_subnet_group.rds_subnet_group.name
}