FROM python:3.11-slim

# Install system dependencies
RUN apt-get update &amp;&amp; apt-get install -y \
    git \
    curl \
    unzip \
    gnupg \
    software-properties-common \
    &amp;&amp; rm -rf /var/lib/apt/lists/*

# Install Terraform
RUN curl -fsSL https://apt.releases.hashicorp.com/gpg | apt-key add - \
    &amp;&amp; apt-add-repository "deb [arch=amd64] https://apt.releases.hashicorp.com \$(lsb_release -cs) main" \
    &amp;&amp; apt-get update \
    &amp;&amp; apt-get install -y terraform

# Install Infracost
RUN curl -fsSL https://raw.githubusercontent.com/infracost/infracost/master/scripts/install.sh | sh

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]