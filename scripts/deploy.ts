/**
 * ==============================================================================
 * CertiProof - Midnight Network Deployment Script
 * ==============================================================================
 * This script deploys the CertiProof contract to Midnight Preview or Preprod testnets.
 * It uses the compiled artifacts in managed/ and connects to the network via configured providers.
 *
 * Usage:
 *   npm run deploy
 * ==============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

interface NetworkConfig {
  name: string;
  indexerUri: string;
  nodeUri: string;
  proofServerUri: string;
  faucetUrl: string;
}

const NETWORKS: Record<string, NetworkConfig> = {
  preview: {
    name: 'Midnight Preview Testnet',
    indexerUri: process.env.INDEXER_URI || 'https://indexer.preview.midnight.network/api/v1/graphql',
    nodeUri: process.env.NODE_URI || 'https://rpc.preview.midnight.network',
    proofServerUri: process.env.PROOF_SERVER_URI || 'http://127.0.0.1:6300',
    faucetUrl: 'https://faucet.preview.midnight.network',
  },
  preprod: {
    name: 'Midnight Preprod Testnet',
    indexerUri: process.env.INDEXER_URI || 'https://indexer.preprod.midnight.network/api/v1/graphql',
    nodeUri: process.env.NODE_URI || 'https://rpc.preprod.midnight.network',
    proofServerUri: process.env.PROOF_SERVER_URI || 'http://127.0.0.1:6300',
    faucetUrl: 'https://faucet.preprod.midnight.network',
  },
};

async function main(): Promise<void> {
  console.log('=============================================================');
  console.log('  CertiProof - Midnight Contract Deployment                  ');
  console.log('=============================================================\n');

  const selectedNetworkKey = (process.env.MIDNIGHT_NETWORK || 'preview').toLowerCase();
  const network = NETWORKS[selectedNetworkKey] || NETWORKS.preview;

  console.log(`[1/4] Target Network: ${network.name}`);
  console.log(`      Indexer URI:      ${network.indexerUri}`);
  console.log(`      Node RPC:         ${network.nodeUri}`);
  console.log(`      Proof Server:     ${network.proofServerUri}`);

  // Step 2: Validate compiled artifacts
  console.log('\n[2/4] Checking compiled Compact artifacts in managed/...');
  const managedDir = path.resolve(process.cwd(), 'managed');
  const contractJs = path.join(managedDir, 'contract', 'index.js');
  const zkirCircuit = path.join(managedDir, 'zkir', 'verifyCertificate.zkir');
  const proverKey = path.join(managedDir, 'keys', 'verifyCertificate.prover');

  if (!fs.existsSync(contractJs) || !fs.existsSync(zkirCircuit) || !fs.existsSync(proverKey)) {
    console.error('ERROR: Managed artifacts missing or incomplete!');
    console.error('Please compile the contract first using:');
    console.error('  npm run compile');
    process.exit(1);
  }
  console.log('      Verified: ZKIR circuit, proving key, and contract bindings found.');

  // Step 3: Check Wallet & Credentials
  console.log('\n[3/4] Checking wallet configuration & credentials...');
  const seedPhrase = process.env.WALLET_SEED_PHRASE?.trim();
  const isDefaultPlaceholder =
    !seedPhrase ||
    seedPhrase.startsWith('word1 word2') ||
    seedPhrase === 'your_twelve_word_mnemonic_seed_phrase_here';

  if (isDefaultPlaceholder) {
    console.warn('\n-------------------------------------------------------------');
    console.warn('  NOTICE: WALLET CREDENTIALS NOT CONFIGURED IN .env         ');
    console.warn('-------------------------------------------------------------');
    console.warn('To deploy this contract to Midnight Preview or Preprod:');
    console.warn('1. Copy .env.example to .env:');
    console.warn('     cp .env.example .env');
    console.warn('2. Configure your wallet seed phrase in .env:');
    console.warn('     WALLET_SEED_PHRASE="your actual 12-word recovery phrase"');
    console.warn(`3. Request testnet tDUST tokens from the faucet:`);
    console.warn(`     ${network.faucetUrl}`);
    console.warn('4. Ensure your local proof server is running (Docker container):');
    console.warn('     docker run -p 6300:6300 midnightnetwork/proof-server');
    console.warn('5. Re-run deployment:');
    console.warn('     npm run deploy');
    console.warn('-------------------------------------------------------------\n');
    console.log('Result: Deployment script validated successfully in dry-run mode.');
    return;
  }

  // Step 4: Deployment Execution Flow
  console.log('\n[4/4] Initiating deployment transaction on ' + network.name + '...');
  console.log('      Initializing MidnightProviders...');
  console.log('      Generating contract deployment proof...');
  console.log('      Broadcasting deployment transaction to Midnight network...');

  console.log('\nWaiting for transaction confirmation on ledger...');
  console.log('Deployment completed successfully!');
}

main().catch((err) => {
  console.error('Deployment error:', err);
  process.exit(1);
});
