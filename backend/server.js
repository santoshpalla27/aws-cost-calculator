/**

OpenCost Backend Service - Production Enhanced
Features:
Comprehensive AWS service support
Retry logic with exponential backoff
In-memory caching to reduce API calls
Detailed error responses */
const express = require('express'); const cors = require('cors'); const { PricingClient, GetProductsCommand } = require('@aws-sdk/client-pricing'); const fs = require('fs'); const path = require('path'); const { spawn } = require('child_process'); const multer = require('multer');

const app = express(); const PORT = process.env.PORT || 3001;

app.use(cors()); app.use(express.json());

// Initialize AWS Pricing Client const client = new PricingClient({ region: 'us-east-1', maxAttempts: 3 });

// In-memory cache (expires after 1 hour) const priceCache = new Map(); const CACHE_TTL = 3600000; // 1 hour

// Ensure uploads directory exists if (!fs.existsSync('uploads')) { fs.mkdirSync('uploads'); }

const upload = multer({ dest: 'uploads/' });

// In-memory job store const jobs = {};

// Helper to broadcast to SSE clients const broadcast = (jobId, type, data) => { const job = jobs[jobId]; if (!job) return;

if (type === 'log') {
    job.logs.push(data);
}

const message = `data: ${JSON.stringify({ type, data })}\n\n`;
job.clients.forEach(client => client.write(message));
};

// --- Enhanced AWS Pricing Endpoint with Retry & Cache --- app.post('/api/pricing', async (req, res) => { const { serviceCode, filters, resourceType } = req.body;

if (!serviceCode || !filters) {
    return res.status(400).json({ 
        error: 'Missing serviceCode or filters',
        resourceType: resourceType || 'unknown'
    });
}

try {
    // Generate cache key
    const cacheKey = `${serviceCode}:${JSON.stringify(filters)}`;
    
    // Check cache
    const cached = priceCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        console.log(`[CACHE HIT] ${cacheKey}`);
        return res.json(cached.data);
    }

    console.log(`[API CALL] ${serviceCode} - ${resourceType || 'unknown'}`);

    // Convert filters to AWS format
    const awsFilters = Object.entries(filters).map(([key, value]) => ({
        Type: 'TERM_MATCH',
        Field: key,
        Value: String(value)
    }));

    const command = new GetProductsCommand({
        ServiceCode: serviceCode,
        Filters: awsFilters,
        MaxResults: 1
    });

    const response = await retryWithBackoff(() => client.send(command), 3);

    if (!response.PriceList || response.PriceList.length === 0) {
        console.warn(`[NO PRICING] ${serviceCode} - Filters:`, filters);
        return res.status(404).json({ 
            error: 'No pricing found for criteria',
            serviceCode,
            filters,
            resourceType: resourceType || 'unknown',
            suggestion: 'Check filter values match AWS Pricing API requirements'
        });
    }

    // Parse AWS pricing structure
    const priceItem = JSON.parse(response.PriceList[0]);
    const terms = priceItem.terms?.OnDemand;
    
    if (!terms) {
        return res.status(404).json({ 
            error: 'No OnDemand terms found',
            availableTerms: Object.keys(priceItem.terms || {})
        });
    }

    const termKey = Object.keys(terms)[0];
    const priceDimensions = terms[termKey].priceDimensions;
    const dimensionKey = Object.keys(priceDimensions)[0];
    const pricePerUnit = priceDimensions[dimensionKey].pricePerUnit.USD;

    const result = {
        price: parseFloat(pricePerUnit),
        currency: 'USD',
        unit: priceDimensions[dimensionKey].unit,
        description: priceDimensions[dimensionKey].description,
        serviceCode,
        resourceType: resourceType || 'unknown'
    };

    // Cache the result
    priceCache.set(cacheKey, { data: result, timestamp: Date.now() });

    return res.json(result);

} catch (error) {
    console.error('[AWS PRICING ERROR]', error);
    
    // Detailed error response
    return res.status(500).json({
        error: 'Failed to fetch pricing from AWS',
        details: error.message,
        code: error.Code || error.name,
        serviceCode,
        filters,
        resourceType: resourceType || 'unknown',
        suggestion: 'Verify AWS credentials and service availability'
    });
}
});

// Retry helper with exponential backoff async function retryWithBackoff(fn, maxRetries, delay = 1000) { for (let i = 0; i < maxRetries; i++) { try { return await fn(); } catch (error) { if (i === maxRetries - 1) throw error;

        const waitTime = delay * Math.pow(2, i);
        console.log(`[RETRY ${i + 1}/${maxRetries}] Waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }
}
}

// --- Terraform Plan Generation (SSE) --- app.post('/api/generate-plan', upload.array('files'), (req, res) => { if (!req.files || req.files.length === 0) { return res.status(400).json({ error: 'No files uploaded' }); }

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
        let paths = req.body.paths;
        if (paths && !Array.isArray(paths)) {
            paths = [paths];
        }

        for (let i = 0; i < req.files.length; i++) {
            const file = req.files[i];
            const relativePath = (paths && paths[i]) ? paths[i] : file.originalname;
            const destPath = path.join(workDir, relativePath);

            fs.mkdirSync(path.dirname(destPath), { recursive: true });
            fs.renameSync(file.path, destPath);
        }
        broadcast(jobId, 'log', 'Files uploaded successfully');

        // Detect Terraform root
        let tfRoot = workDir;
        const findTfRoot = (dir) => {
            const files = fs.readdirSync(dir);
            if (files.includes('main.tf')) return dir;

            for (const file of files) {
                const fullPath = path.join(dir, file);
                if (fs.statSync(fullPath).isDirectory()) {
                    const found = findTfRoot(fullPath);
                    if (found) return found;
                }
            }
            return null;
        };

        const detectedRoot = findTfRoot(workDir);
        if (detectedRoot) {
            tfRoot = detectedRoot;
            broadcast(jobId, 'log', `Detected Terraform root: ${path.relative(workDir, tfRoot) || '.'}`);
        }

        const runCommand = (cmd, args) => new Promise((resolve, reject) => {
            broadcast(jobId, 'log', `$ ${cmd} ${args.join(' ')}`);

            const proc = spawn(cmd, args, { cwd: tfRoot });

            proc.stdout.on('data', (data) => {
                data.toString().split('\n').forEach(line => {
                    if (line.trim()) broadcast(jobId, 'log', line.trim());
                });
            });

            proc.stderr.on('data', (data) => {
                data.toString().split('\n').forEach(line => {
                    if (line.trim()) broadcast(jobId, 'log', `[WARN] ${line.trim()}`);
                });
            });

            proc.on('close', (code) => {
                if (code === 0) resolve();
                else reject(new Error(`Command failed with code ${code}`));
            });
        });

        await runCommand('terraform', ['init', '-no-color', '-input=false']);
        await runCommand('terraform', ['plan', '-out=tfplan', '-no-color', '-input=false']);

        // Capture JSON
        let jsonOutput = '';
        const showProc = spawn('terraform', ['show', '-json', 'tfplan'], { cwd: tfRoot });
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
        jobs[jobId].clients.forEach(c => c.end());
        jobs[jobId].clients = [];

        fs.rm(workDir, { recursive: true, force: true }, (err) => {
            if (err) console.error('Cleanup Error:', err);
        });
    }
})();

res.json({ jobId });
});

app.get('/api/jobs/:jobId/stream', (req, res) => { const { jobId } = req.params; const job = jobs[jobId];

if (!job) {
    return res.status(404).json({ error: 'Job not found' });
}

res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');
res.setHeader('Connection', 'keep-alive');

if (job.logs && job.logs.length > 0) {
    job.logs.forEach(log => {
        res.write(`data: ${JSON.stringify({ type: 'log', data: log })}\n\n`);
    });
}

job.clients.push(res);

req.on('close', () => {
    job.clients = job.clients.filter(c => c !== res);
});
});

// Health check with AWS connection test app.get('/health', async (req, res) => { try { // Test AWS connection const testCommand = new GetProductsCommand({ ServiceCode: 'AmazonEC2', Filters: [{ Type: 'TERM_MATCH', Field: 'instanceType', Value: 't2.micro' }], MaxResults: 1 });

    await client.send(testCommand);
    
    res.json({ 
        status: 'ok', 
        service: 'OpenCost Pricing Engine',
        aws: 'connected',
        cache_size: priceCache.size
    });
} catch (error) {
    res.status(503).json({ 
        status: 'degraded', 
        service: 'OpenCost Pricing Engine',
        aws: 'disconnected',
        error: error.message
    });
}
});

app.listen(PORT, () => { console.log(
✅ Server running on http://localhost:${PORT}
); console.log('📊 AWS Pricing API integration active'); console.log('💾 In-memory caching enabled'); });
