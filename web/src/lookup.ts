/**
 * Wallet-free, read-only view of the CertiProof ledger on Preprod — the
 * relying-party (employer) side of the product. Anyone holding a
 * certificate hash can confirm it was verified without connecting a wallet,
 * because verifiedCertificates is public ledger state.
 *
 * Talks to the public Preprod indexer directly rather than the connected
 * wallet's configured indexer (contract.ts's path), since a verifier isn't
 * expected to have a wallet at all. The indexer serves
 * `Access-Control-Allow-Origin: *`, so this works from GitHub Pages.
 */
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { ledger, type Ledger } from '../../managed/contract/index.js';
import { DEPLOYED_CONTRACT_ADDRESS } from './contract';

const PREPROD_INDEXER_URI = 'https://indexer.preprod.midnight.network/api/v3/graphql';
const PREPROD_INDEXER_WS_URI = 'wss://indexer.preprod.midnight.network/api/v3/graphql/ws';

export class InvalidCertHashError extends Error {
  constructor() {
    super('A certificate hash is 64 hex characters (32 bytes), optionally prefixed with 0x.');
    this.name = 'InvalidCertHashError';
  }
}

export function parseCertHash(input: string): Uint8Array {
  const hex = input.trim().replace(/^0x/i, '');
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new InvalidCertHashError();
  }
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

async function fetchLedger(): Promise<Ledger> {
  const publicDataProvider = indexerPublicDataProvider(PREPROD_INDEXER_URI, PREPROD_INDEXER_WS_URI);
  const contractState = await publicDataProvider.queryContractState(DEPLOYED_CONTRACT_ADDRESS);
  if (!contractState) {
    throw new Error(`No contract state found on Preprod for ${DEPLOYED_CONTRACT_ADDRESS}.`);
  }
  return ledger(contractState.data);
}

export async function lookupCertificate(certHash: Uint8Array): Promise<{ verified: boolean; totalVerified: bigint }> {
  const state = await fetchLedger();
  return {
    verified: state.verifiedCertificates.member(certHash),
    totalVerified: state.totalVerified,
  };
}

export async function fetchTotalVerified(): Promise<bigint> {
  return (await fetchLedger()).totalVerified;
}
