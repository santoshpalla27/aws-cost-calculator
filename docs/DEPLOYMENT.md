# InfraCost Analyzer Pro - Deployment Guide

## Production Deployment

This guide covers deploying InfraCost Analyzer Pro to production environments.

## Docker Compose Deployment

### Prerequisites

- Docker Engine 20.10.0 or later
- Docker Compose v2.12.0 or later
- At least 4GB of RAM
- 10GB of free disk space

### Production Configuration

1. Create a production environment file:

```bash
cp .env.example .env.production
```

2. Configure the production settings:

```bash
# .env.production
NODE_ENV=production
JWT_SECRET=your-super-secure-production-jwt-key-change-it
JWT_EXPIRES_IN=24h

# Database (use managed database service in production)
POSTGRES_HOST=managed-db-host.example.com
POSTGRES_PORT=5432
POSTGRES_USER=your_db_user
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=infracost_analyzer_prod

# AWS credentials
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1

# Infracost
INFRACOST_API_KEY=your_infracost_api_key

# Logging
LOG_LEVEL=info
```

3. Use the production Docker Compose file:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Kubernetes Deployment

For Kubernetes deployment, you can use the provided Helm chart or create your own manifests.

### Sample Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: infracost-analyzer-api-gateway
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
      - name: api-gateway
        image: your-registry/api-gateway:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: infracost-secrets
              key: jwt-secret
        # ... other environment variables
---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway-service
spec:
  selector:
    app: api-gateway
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: LoadBalancer
```

## Environment-Specific Configurations

### Database

- Use a managed PostgreSQL service (RDS, Cloud SQL, etc.)
- Enable backups and point-in-time recovery
- Configure read replicas if needed
- Use connection pooling (PgBouncer)

### Storage

- For file uploads and temporary storage, use cloud storage (S3, GCS)
- Configure proper IAM roles and policies

### Caching

- Use managed Redis (ElastiCache, Cloud Memorystore)
- Configure for high availability

### Security

- Use TLS/SSL for all connections
- Enable authentication for all services
- Regular security scanning
- Implement proper firewall rules

## Monitoring and Logging

### Application Metrics

- Configure application-level metrics collection
- Set up health checks
- Monitor resource usage

### Logging

- Centralized logging (ELK stack, CloudWatch, etc.)
- Structured logging format
- Retention policies

### Alerts

- Set up alerts for critical metrics
- Error rate monitoring
- Resource exhaustion alerts

## Backup and Recovery

### Database Backup

- Daily backups with point-in-time recovery
- Store backups in geographically distributed locations
- Test backup restoration regularly

### Configuration Backup

- Version control all configuration files
- Backup environment-specific configurations

## Scaling

### Horizontal Scaling

- API Gateway: Statelesss, can be scaled based on traffic
- Auth Service: Statelesss, can be scaled based on auth requests
- Terraform Cost Engine: CPU and memory intensive, scale based on concurrency needs
- AWS Pricing Service: Relatively lightweight
- Reports Service: I/O intensive for PDF generation

### Resource Allocation

- Terraform Cost Engine: Requires sufficient CPU and memory for Terraform operations
- Reports Service: Requires memory for PDF generation
- Frontend: Can be served via CDN for better performance

## Security Best Practices

1. Keep all services updated
2. Use secrets management (AWS Secrets Manager, HashiCorp Vault)
3. Implement network segmentation
4. Regular security audits
5. Use least-privilege access principles
6. Enable audit logging