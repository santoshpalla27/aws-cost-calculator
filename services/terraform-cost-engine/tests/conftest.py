import pytest
import tempfile
import os
import shutil

@pytest.fixture
def temp_directory():
    """Create a temporary directory for testing"""
    temp_dir = tempfile.mkdtemp()
    yield temp_dir
    shutil.rmtree(temp_dir)

@pytest.fixture
def sample_terraform_config():
    """Sample Terraform configuration for testing"""
    return {
        'main.tf': '''
resource "aws_instance" "test" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
  
  tags = {
    Name = "test-instance"
  }
}
'''
    }