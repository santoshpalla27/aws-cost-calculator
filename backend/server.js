/**
 * OpenCost Backend Service
 * 
 * Usage:
 * 1. Install dependencies: npm install express cors @aws-sdk/client-pricing dotenv
 * 2. Set AWS Credentials in .env or environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION)
 * 3. Run: node server.js
 */

const express = require('express');
const cors = require('cors');
const { PricingClient, GetProductsCommand } = require('@aws-sdk/client-pricing');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize AWS Pricing Client (Endpoint is usually us-east-1 or ap-south-1 for global pricing)
const client = new PricingClient({ region: 'us-east-1' });

app.post('/api/pricing', async (req, res) => {
    const { serviceCode, filters } = req.body;

    if (!serviceCode || !filters) {
        return res.status(400).json({ error: 'Missing serviceCode or filters' });
    }

    try {
        // Convert filters object to AWS Filters array format
        const awsFilters = Object.entries(filters).map(([key, value]) => ({
            Type: 'TERM_MATCH',
            Field: key,
            Value: value
        }));

        const command = new GetProductsCommand({
            ServiceCode: serviceCode,
            Filters: awsFilters,
            MaxResults: 1
        });

        const response = await client.send(command);

        if (!response.PriceList || response.PriceList.length === 0) {
            return res.status(404).json({ error: 'No pricing found for criteria' });
        }

        // Parse the weird stringified JSON AWS returns
        const priceItem = JSON.parse(response.PriceList[0]);

        // Navigate the complex OnDemand pricing structure
        // structure: terms -> OnDemand -> [SKU.OfferTermCode] -> priceDimensions -> [key] -> pricePerUnit -> USD
        const terms = priceItem.terms?.OnDemand;
        if (!terms) {
            return res.status(404).json({ error: 'No OnDemand terms found' });
        }

        const termKey = Object.keys(terms)[0];
        const priceDimensions = terms[termKey].priceDimensions;
        const dimensionKey = Object.keys(priceDimensions)[0];
        const pricePerUnit = priceDimensions[dimensionKey].pricePerUnit.USD;

        return res.json({
            price: parseFloat(pricePerUnit),
            currency: 'USD',
            unit: priceDimensions[dimensionKey].unit
        });

    } catch (error) {
        console.error('AWS Pricing API Error:', error);
        return res.status(500).json({
            error: 'Failed to fetch pricing',
            details: error.message
        });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'OpenCost Pricing Engine' });
});

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

app.post('/api/generate-plan', upload.array('files'), async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
    }

    const workDir = path.join(__dirname, 'uploads', `job-${Date.now()}`);
    fs.mkdirSync(workDir);

    try {
        // Move files to workDir
        for (const file of req.files) {
            const destPath = path.join(workDir, file.originalname);
            fs.renameSync(file.path, destPath);
        }

        // Execute Terraform commands
        const execPromise = (cmd) => new Promise((resolve, reject) => {
            exec(cmd, { cwd: workDir }, (error, stdout, stderr) => {
                if (error) reject({ error, stderr });
                else resolve(stdout);
            });
        });

        await execPromise('terraform init');
        await execPromise('terraform plan -out=tfplan');
        const jsonOutput = await execPromise('terraform show -json tfplan');

        const plan = JSON.parse(jsonOutput);
        res.json(plan);

    } catch (error) {
        console.error('Terraform Execution Error:', error);
        res.status(500).json({
            error: 'Failed to generate plan',
            details: error.stderr || error.message
        });
    } finally {
        // Cleanup
        fs.rm(workDir, { recursive: true, force: true }, (err) => {
            if (err) console.error('Cleanup Error:', err);
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Ensure AWS Credentials are configured in your environment.');
});
