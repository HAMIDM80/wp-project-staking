const express = require('express');
const fetch = require('node-fetch');
require('dotenv').config();

const router = express.Router();

const RPC_ENDPOINTS = {
    devnet: 'https://api.devnet.solana.com',
    mainnet: 'https://api.mainnet-beta.solana.com',
    testnet: 'https://api.testnet.solana.com'
};

const DEFAULT_NETWORK = process.env.NETWORK || 'mainnet';
const SOLANA_RPC = process.env.SOLANA_RPC || RPC_ENDPOINTS[DEFAULT_NETWORK];

const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const ASSOCIATED_TOKEN_PROGRAM_ID = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';

async function callRPC(method, params = []) {
    try {
        console.log(`\n📡 RPC Call: ${method}`);
        
        const response = await fetch(SOLANA_RPC, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: Date.now(),
                method,
                params
            }),
            timeout: 30000
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(`RPC Error: ${data.error.message}`);
        }

        console.log(`✅ ${method} successful`);
        return data.result;
    } catch (error) {
        console.error(`❌ RPC Error (${method}):`, error.message);
        throw error;
    }
}

router.post('/api/transfer-tokens', async (req, res) => {
    try {
        const { user_id, wallet_address, token_amount, order_id, token_mint, programId } = req.body;

        console.log('\n' + '='.repeat(60));
        console.log('💰 Token Transfer Request');
        console.log('='.repeat(60));
        console.log(`User ID: ${user_id}`);
        console.log(`Wallet: ${wallet_address}`);
        console.log(`Amount: ${token_amount}`);
        console.log(`Order ID: ${order_id}`);
        console.log(`Token Mint: ${token_mint}`);
        console.log('='.repeat(60));

        if (!user_id || !wallet_address || !token_amount || !token_mint) {
            console.warn('⚠️ Missing required parameters');
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters',
                timestamp: new Date().toISOString()
            });
        }

        const treasuryWallet = process.env.TREASURY_WALLET || '';
        if (!treasuryWallet) {
            console.warn('⚠️ Treasury wallet not configured');
            return res.status(500).json({
                success: false,
                message: 'Server configuration error'
            });
        }

        console.log(`\n🏦 Treasury Wallet: ${treasuryWallet}`);

        const latestBlockhash = await callRPC('getLatestBlockhash', [{ commitment: 'finalized' }]);
        console.log(`📦 Latest Blockhash: ${latestBlockhash.value.blockhash}`);

        const signature = await transferTokens(
            wallet_address,
            token_amount,
            token_mint,
            treasuryWallet,
            latestBlockhash.value.blockhash
        );

        console.log(`\n✅ Transfer successful: ${signature}`);

        res.json({
            success: true,
            message: 'Tokens transferred successfully',
            signature,
            user_id,
            order_id,
            token_amount,
            timestamp: new Date().toISOString(),
            network: DEFAULT_NETWORK
        });

    } catch (error) {
        console.error('\n❌ Transfer error:', error.message);
        
        res.status(500).json({
            success: false,
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

async function transferTokens(destinationWallet, amount, tokenMint, treasuryWallet, blockhash) {
    console.log(`\n🔄 Starting token transfer:`);
    console.log(`   From: Treasury`);
    console.log(`   To: ${destinationWallet}`);
    console.log(`   Amount: ${amount}`);

    const mockSignature = 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(7);
    console.log(`\n📝 Mock Signature: ${mockSignature}`);

    console.log(`\n✅ Token Transfer Simulated`);
    console.log(`   - Tokens would be transferred from treasury to ${destinationWallet}`);
    console.log(`   - Amount: ${amount}`);
    console.log(`   - Token: ${tokenMint}`);

    return mockSignature;
}

router.post('/api/claim-reward', async (req, res) => {
    try {
        const { user_id, wallet_address, lock_signature } = req.body;

        console.log('\n' + '='.repeat(60));
        console.log('🎁 Claim Reward Request');
        console.log('='.repeat(60));
        console.log(`User ID: ${user_id}`);
        console.log(`Wallet: ${wallet_address}`);
        console.log(`Lock Signature: ${lock_signature}`);

        if (!user_id || !wallet_address || !lock_signature) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters'
            });
        }

        const rewardAmount = process.env.REWARD_AMOUNT || 100;
        console.log(`💰 Reward Amount: ${rewardAmount}`);

        const claimSignature = 'claim_' + Date.now() + '_' + Math.random().toString(36).substring(7);
        console.log(`\n📝 Claim Signature: ${claimSignature}`);

        res.json({
            success: true,
            message: 'Reward claimed successfully',
            signature: claimSignature,
            reward_amount: rewardAmount,
            user_id,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Claim error:', error.message);
        
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

router.get('/api/transfer-status/:signature', async (req, res) => {
    try {
        const { signature } = req.params;

        console.log(`\n🔍 Checking transfer status: ${signature}`);

        const status = await callRPC('getSignatureStatus', [signature, { searchTransactionHistory: true }]);

        if (status && status.value && status.value[0]) {
            const tx = status.value[0];
            
            console.log(`\n📊 Transaction Status:`);
            console.log(`   Confirmation Status: ${tx.confirmationStatus}`);
            console.log(`   Confirmed: ${tx.confirmationStatus === 'finalized'}`);

            res.json({
                success: true,
                signature,
                status: {
                    confirmed: tx.confirmationStatus === 'finalized',
                    confirmation_status: tx.confirmationStatus,
                    slot: tx.slot,
                    error: tx.err ? JSON.stringify(tx.err) : null
                },
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }
    } catch (error) {
        console.error('❌ Status check error:', error.message);
        
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

router.post('/api/verify-wallet', async (req, res) => {
    try {
        const { wallet_address } = req.body;

        console.log(`\n✓ Verifying wallet: ${wallet_address}`);

        if (!wallet_address || !/^[A-Za-z0-9]{32,44}$/.test(wallet_address)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid wallet address format'
            });
        }

        const accountInfo = await callRPC('getAccountInfo', [wallet_address]);

        if (accountInfo && accountInfo.value) {
            console.log(`✅ Wallet verified`);
            
            res.json({
                success: true,
                wallet: wallet_address,
                exists: true,
                balance_lamports: accountInfo.value.lamports,
                owner: accountInfo.value.owner,
                timestamp: new Date().toISOString()
            });
        } else {
            res.json({
                success: true,
                wallet: wallet_address,
                exists: false,
                message: 'Wallet address is valid but does not have SOL balance yet',
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('❌ Verification error:', error.message);
        
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

console.log('\n' + '='.repeat(60));
console.log('📝 Token Transfer API Routes Registered');
console.log('Available Endpoints:');
console.log('  - POST /api/transfer-tokens');
console.log('  - POST /api/claim-reward');
console.log('  - GET  /api/transfer-status/:signature');
console.log('  - POST /api/verify-wallet');
console.log('='.repeat(60) + '\n');

module.exports = router;
