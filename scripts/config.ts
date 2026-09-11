/**
 * Network configuration for CertiProof deployment to Midnight testnets.
 * Mirrors the configuration shape used by the official midnight-ntwrk/example-counter
 * CLI, pinned to the same SDK generation (midnight-js 4.0.4 / compact-runtime 0.15.0).
 */
import path from 'node:path';
import { setNetworkId } from '@midnight-ntwrk/midnight-js/network-id';

export const currentDir = path.resolve(new URL(import.meta.url).pathname, '..');

export const contractConfig = {
  privateStateStoreName: 'certiproof-private-state',
  zkConfigPath: path.resolve(currentDir, '..', 'managed'),
};

export interface Config {
  readonly indexer: string;
  readonly indexerWS: string;
  readonly node: string;
  readonly proofServer: string;
  readonly faucetUrl: string;
}

export class PreviewConfig implements Config {
  indexer = process.env.INDEXER_URI || 'https://indexer.preview.midnight.network/api/v3/graphql';
  indexerWS = process.env.INDEXER_WS_URI || 'wss://indexer.preview.midnight.network/api/v3/graphql/ws';
  node = process.env.NODE_URI || 'https://rpc.preview.midnight.network';
  proofServer = process.env.PROOF_SERVER_URI || 'http://127.0.0.1:6300';
  faucetUrl = 'https://faucet.preview.midnight.network';
  constructor() {
    setNetworkId('preview');
  }
}

export class PreprodConfig implements Config {
  indexer = process.env.INDEXER_URI || 'https://indexer.preprod.midnight.network/api/v3/graphql';
  indexerWS = process.env.INDEXER_WS_URI || 'wss://indexer.preprod.midnight.network/api/v3/graphql/ws';
  node = process.env.NODE_URI || 'https://rpc.preprod.midnight.network';
  proofServer = process.env.PROOF_SERVER_URI || 'http://127.0.0.1:6300';
  faucetUrl = 'https://faucet.preprod.midnight.network';
  constructor() {
    setNetworkId('preprod');
  }
}

export function resolveConfig(network: string): Config {
  return network.toLowerCase() === 'preprod' ? new PreprodConfig() : new PreviewConfig();
}
