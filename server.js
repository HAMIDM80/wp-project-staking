const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const tokenTransferRouter = require('./token-transfer');

const RPC_ENDPOINTS = {
    devnet: 'https://api.devnet.solana.com',
    mainnet: 'https://api.mainnet-beta.solana.com',
    testnet: 'https://api.testnet.solana.com'
};

const DEFAULT_NETWORK = process.env.NETWORK || 'devnet';
const SOLANA_RPC = process.env.SOLANA_RPC || RPC_ENDPOINTS[DEFAULT_NETWORK];

console.log('═══════════════════════════════════════════════════════');
console.log('🚀 Backend Server Starting');
console.log('Default Network:', DEFAULT_NETWORK);
console.log('Default RPC:', SOLANA_RPC);
console.log('═══════════════════════════════════════════════════════');

app.use(cors());
app.use(express.json());

app.use(tokenTransferRouter);

app.get('/', (req, res) => {
    res.json({
        message: 'USBC Gold Backend Server',
        status: 'running',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    });
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/config', (req, res) => {
    console.log('📋 [Config] Backend configuration requested');
    const config = {
        programId: 'HfJt6Du4gBcrQK7xieyzEwYndjWeKppEwCuPDCDY69um',
        tokenMint: 'ArNAtLrRe9iA2ysxet7EGW62ffTQEXiyHLtfGtXjCKtb',
        aprRate: 27,
        minDuration: 5,
        maxDuration: 770,
        network: DEFAULT_NETWORK,
        rpcUrl: SOLANA_RPC
    };
    console.log('📋 [Config]', config);
    res.json(config);
});

app.post('/api/webhook/transaction', (req, res) => {
    const { signature, type } = req.body;
    
    if (!signature || !type) {
        console.warn('⚠️  [Webhook] Missing required fields');
        return res.status(400).json({
            error: 'Missing required fields: signature, type'
        });
    }

    console.log(`\n🎣 [Webhook] Transaction notification received`);
    console.log(`   Type: ${type}`);
    console.log(`   Signature: ${signature}`);
    
    res.json({
        success: true,
        message: 'Webhook received',
        signature,
        type,
        timestamp: new Date().toISOString()
    });
});

app.post('/api/rpc', async (req, res) => {
    try {
        const method = req.body?.method || 'unknown';
        console.log(`\n📡 [RPC Proxy] Incoming request`);
        console.log(`   Method: ${method}`);
        console.log(`   Forwarding to: ${SOLANA_RPC}`);
        
        const response = await fetch(SOLANA_RPC, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(req.body)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            console.log(`✅ [RPC Proxy] Success - ${method}`);
        } else {
            console.log(`❌ [RPC Proxy] Failed - ${method}`);
            console.log(`   Status: ${response.status}`);
            console.log(`   Error: ${data?.error?.message || 'unknown'}`);
        }
        
        res.json(data);
    } catch (error) {
        console.error('❌ [RPC Proxy] Error:', error.message);
        res.status(500).json({
            error: 'RPC proxy failed',
            message: error.message,
            rpc: SOLANA_RPC
        });
    }
});

app.get('/api/transactions/:signature', (req, res) => {
    const { signature } = req.params;
    
    console.log(`\n🔍 [Transaction] Explorer link requested`);
    console.log(`   Signature: ${signature}`);
    console.log(`   Network: ${DEFAULT_NETWORK}`);
    
    const clusterParam = DEFAULT_NETWORK === 'devnet' ? 'devnet' : 'mainnet-beta';
    
    res.json({
        signature,
        explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=${clusterParam}`,
        timestamp: new Date().toISOString(),
        network: DEFAULT_NETWORK
    });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
    });
});

app.listen(PORT, () => {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log(`✅ USBC Gold Backend running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Active Network: ${DEFAULT_NETWORK.toUpperCase()}`);
    console.log(`RPC Endpoint: ${SOLANA_RPC}`);
    console.log('\nAvailable Endpoints:');
    console.log('  - GET  /api/health');
    console.log('  - GET  /api/config');
    console.log('  - POST /api/rpc (Solana RPC proxy)');
    console.log('  - POST /api/webhook/transaction');
    console.log('  - GET  /api/transactions/:signature');
    console.log('═══════════════════════════════════════════════════════\n');
});
