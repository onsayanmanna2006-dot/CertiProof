/**
 * Builds the Midnight providers bag for the browser, backed by the connected
 * Lace wallet, and joins the already-deployed verifyCertificate contract so
 * its circuit can be called for real from this page.
 *
 * Mirrors the exact working shape already proven by scripts/deploy.ts on
 * this SDK generation (compact-js@2.5.0 / midnight-js@4.0.4): the same
 * CompiledContract.make/withWitnesses/withCompiledFileAssets pipeline, the
 * same providers bag shape, just backed by Lace instead of a headless
 * seed-derived wallet.
 *
 * Targets Preview, not Preprod: three attempts to deploy fresh to Preprod
 * from this machine (8GB RAM) hit unbounded memory growth during wallet
 * sync (crashed at ~2GB, then ~3.3GB, then ~5GB before OOMing) — see the
 * README's "Contract Address" section. Preview's deployment predates that
 * and is proven working, so the frontend targets it instead for now.
 */
import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { findDeployedContract } from '@midnight-ntwrk/midnight-js/contracts';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { toHex, fromHex } from '@midnight-ntwrk/midnight-js-utils';
import { Transaction } from '@midnight-ntwrk/ledger-v8';
import { MidnightBech32m, ShieldedCoinPublicKey, ShieldedEncryptionPublicKey } from '@midnight-ntwrk/wallet-sdk-address-format';
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';

import { Contract, ledger, type Witnesses, type Ledger } from '../../managed/contract/index.js';
import { BrowserZkConfigProvider } from './browserZkConfigProvider';
import { inMemoryPrivateStateProvider } from './inMemoryPrivateStateProvider';

// Deployed on Midnight Preview via `npm run deploy` (scripts/deploy.ts). See README "Contract Address".
export const DEPLOYED_CONTRACT_ADDRESS = 'b8cc902ddf2ce0a12911ce303840c2b3b2d2bf596ddca4dc0357315db856b469';

export const PRIVATE_STATE_ID = 'certiproofPrivateState';

export interface StudentCertificateInput {
  studentId: string;
  subjectId: string;
  marks: bigint;
  salt: string;
}

function stringToBytes32(str: string): Uint8Array {
  const bytes = new Uint8Array(32);
  bytes.set(new TextEncoder().encode(str).slice(0, 32));
  return bytes;
}

function bech32ToHex(bech32Address: string, networkId: string, kind: 'coin' | 'encryption'): string {
  const parsed = MidnightBech32m.parse(bech32Address);
  if (kind === 'coin') {
    return ShieldedCoinPublicKey.codec.decode(networkId, parsed).toHexString();
  }
  return ShieldedEncryptionPublicKey.codec.decode(networkId, parsed).toHexString();
}

function buildCompiledContract(input: StudentCertificateInput) {
  const witnesses: Witnesses<null> = {
    getStudentCertificate: (context) => [
      context.privateState,
      {
        studentId: stringToBytes32(input.studentId),
        subjectId: stringToBytes32(input.subjectId),
        marks: input.marks,
        salt: stringToBytes32(input.salt),
      },
    ],
  };

  const withWitnesses = CompiledContract.withWitnesses as any;
  const withCompiledFileAssets = CompiledContract.withCompiledFileAssets as any;
  return (CompiledContract.make('certiproof', Contract) as any).pipe(
    (c: any) => withWitnesses(c, witnesses),
    (c: any) => withCompiledFileAssets(c, `${window.location.origin}/managed`),
  );
}

async function buildProviders(connectedAPI: ConnectedAPI, networkId: string, proofServerUri: string) {
  const zkConfigProvider = new BrowserZkConfigProvider(`${window.location.origin}/managed`);
  const { indexerUri, indexerWsUri } = await connectedAPI.getConfiguration();
  const shieldedAddresses = await connectedAPI.getShieldedAddresses();

  const coinPublicKeyHex = bech32ToHex(shieldedAddresses.shieldedCoinPublicKey, networkId, 'coin');
  const encryptionPublicKeyHex = bech32ToHex(shieldedAddresses.shieldedEncryptionPublicKey, networkId, 'encryption');

  return {
    privateStateProvider: inMemoryPrivateStateProvider<string, null>(),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(proofServerUri, zkConfigProvider),
    publicDataProvider: indexerPublicDataProvider(indexerUri, indexerWsUri),
    walletProvider: {
      getCoinPublicKey: () => coinPublicKeyHex,
      getEncryptionPublicKey: () => encryptionPublicKeyHex,
      balanceTx: async (tx: any) => {
        const serializedTx = toHex(tx.serialize());
        const { tx: balancedHex } = await connectedAPI.balanceUnsealedTransaction(serializedTx);
        return Transaction.deserialize('signature', 'proof', 'binding', fromHex(balancedHex));
      },
    },
    midnightProvider: {
      submitTx: async (tx: any) => {
        const serializedTx = toHex(tx.serialize());
        await connectedAPI.submitTransaction(serializedTx);
        return tx.identifiers()[0];
      },
    },
  };
}

export async function callVerifyCertificate(
  connectedAPI: ConnectedAPI,
  networkId: string,
  proofServerUri: string,
  input: StudentCertificateInput,
) {
  const providers = await buildProviders(connectedAPI, networkId, proofServerUri);
  const compiledContract = buildCompiledContract(input);

  const deployed = await findDeployedContract(providers as any, {
    contractAddress: DEPLOYED_CONTRACT_ADDRESS,
    compiledContract,
    privateStateId: PRIVATE_STATE_ID,
    initialPrivateState: null,
  } as any);

  const callResult = await (deployed as any).callTx.verifyCertificate();
  const certHash: Uint8Array = callResult.private.result;
  const txId: string = callResult.public.txId;

  const updatedContractState = await providers.publicDataProvider.queryContractState(DEPLOYED_CONTRACT_ADDRESS);
  const updatedLedger: Ledger | null = updatedContractState ? ledger(updatedContractState.data) : null;

  return { certHash, txId, ledger: updatedLedger };
}
