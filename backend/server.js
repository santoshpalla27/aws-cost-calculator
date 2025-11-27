/**
 * OpenCost Backend Service
 * 
 * Usage:
 * 1. Install dependencies: npm install express cors @aws-sdk/client-pricing dotenv multer
 * 2. Set AWS Credentials in .env or environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION)
 * 3. Run: node server.js
 */

const express = require('express');
const cors = require('cors');
const { PricingClient, GetProductsCommand } = require('@aws-sdk/client-pricing');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize AWS Pricing Client
const client = new PricingClient({ region: 'us-east-1' });

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

const upload = multer({ dest: 'uploads/' });

// In-memory job store
const jobs = {};

// Helper to broadcast to SSE clients
const broadcast = (jobId, type, data) => {
    const job = jobs[jobId];
    if (!job) return;
    const message = `data: ${JSON.stringify({ type, data })}\n\n`;
    job.clients.forEach(client => client.write(message));
};

// --- AWS Pricing Endpoint ---
app.post('/api/pricing', async (req, res) => {
    const { serviceCode, filters } = req.body;

    if (!serviceCode || !filters) {
        return res.status(400).json({ error: 'Missing serviceCode or filters' });
    }

    try {
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

        const priceItem = JSON.parse(response.PriceList[0]);
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

// --- Terraform Plan Generation (Async SSE) ---
app.post('/api/generate-plan', upload.array('files'), (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
    }

    const jobId = `job-${Date.now()}`;
    const workDir = path.join(__dirname, 'uploads', jobId);
    fs.mkdirSync(workDir);

    // Initialize job
    jobs[jobId] = {
        id: jobId,
        status: 'pending',
        logs: [],
        clients: [],
        result: null
    };

    // Start background processing
    (async () => {
        try {
            // Move files
            for (const file of req.files) {
                const destPath = path.join(workDir, file.originalname);
                fs.renameSync(file.path, destPath);
            }
            broadcast(jobId, 'log', 'Files uploaded successfully.');

            const runCommand = (cmd, args) => new Promise((resolve, reject) => {
                broadcast(jobId, 'log', `Running: ${cmd} ${args.join(' ')}`);

                const proc = spawn(cmd, args, { cwd: workDir });

                proc.stdout.on('data', (data) => {
                    const lines = data.toString().split('\n');
                    lines.forEach(line => {
                        if (line.trim()) broadcast(jobId, 'log', line.trim());
                    });
                });

                proc.stderr.on('data', (data) => {
                    const lines = data.toString().split('\n');
                    lines.forEach(line => {
                        if (line.trim()) broadcast(jobId, 'log', `[STDERR] ${line.trim()}`);
                    });
                });

                proc.on('close', (code) => {
                    if (code === 0) resolve();
                    else reject(new Error(`Command failed with code ${code}`));
                });
            });

            await runCommand('terraform', ['init', '-no-color']);
            await runCommand('terraform', ['plan', '-out=tfplan', '-no-color']);

            // Capture JSON output separately
            let jsonOutput = '';
            const showProc = spawn('terraform', ['show', '-json', 'tfplan'], { cwd: workDir });

            showProc.stdout.on('data', (data) => jsonOutput += data.toString());

            await new Promise((resolve, reject) => {
                showProc.on('close', (code) => {
                    if (code === 0) resolve();
                    else reject(new Error(`Show failed with code ${code}`));
                });
            });

            const plan = JSON.parse(jsonOutput);
            jobs[jobId].status = 'completed';
            jobs[jobId].result = plan;
            broadcast(jobId, 'complete', plan);

        } catch (error) {
            console.error(`Job ${jobId} failed:`, error);
            jobs[jobId].status = 'failed';
            broadcast(jobId, 'error', error.message);
        } finally {
            // Cleanup clients
            jobs[jobId].clients.forEach(c => c.end());
            jobs[jobId].clients = [];

            // Cleanup files
            fs.rm(workDir, { recursive: true, force: true }, (err) => {
                if (err) console.error('Cleanup Error:', err);
            });
        }
    })();

    res.json({ jobId });
});

app.get('/api/jobs/:jobId/stream', (req, res) => {
    const { jobId } = req.params;
    const job = jobs[jobId];

    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }

    // SSE Headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Add client to job
    job.clients.push(res);

    // Remove client on close
    req.on('close', () => {
        job.clients = job.clients.filter(c => c !== res);
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'OpenCost Pricing Engine' });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Ensure AWS Credentials are configured in your environment.');
});
