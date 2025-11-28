Security Best Practices
Never commit credentials to git
Use IAM roles when running on AWS (EC2, ECS, Lambda)
Use temporary credentials when possible
Rotate credentials regularly
Limit IAM permissions to only what's needed (Pricing, Cost Explorer - read-only)
Required IAM Permissions
Create an IAM policy with minimal permissions:

{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "pricing:GetProducts",
        "ec2:DescribeInstanceTypes",
        "ec2:DescribeImages",
        "ec2:DescribeAvailabilityZones",
        "rds:DescribeDBInstances",
        "rds:DescribeDBEngineVersions",
        "ce:GetCostAndUsage"
      ],
      "Resource": "*"
    }
  ]
}