export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatHourlyPrice(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let value = bytes;
  
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
}

export function getResourceTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    aws_instance: '🖥️',
    aws_db_instance: '🗄️',
    aws_ebs_volume: '💾',
    aws_lb: '⚖️',
    aws_alb: '⚖️',
    aws_elb: '⚖️',
    aws_nat_gateway: '🌐',
    aws_eip: '📍',
    aws_s3_bucket: '🪣',
    aws_lambda_function: 'λ',
  };
  return icons[type] || '📦';
}

export function getResourceTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    aws_instance: 'EC2 Instance',
    aws_db_instance: 'RDS Database',
    aws_ebs_volume: 'EBS Volume',
    aws_lb: 'Load Balancer',
    aws_alb: 'Application LB',
    aws_elb: 'Classic LB',
    aws_nat_gateway: 'NAT Gateway',
    aws_eip: 'Elastic IP',
    aws_s3_bucket: 'S3 Bucket',
    aws_lambda_function: 'Lambda Function',
  };
  return labels[type] || type;
}