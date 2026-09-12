/**
 * ==============================================================================
 * CertiProof - Midnight Network Deployment Script
 * ==============================================================================
 * Deploys the compiled verifyCertificate contract to Midnight Preview/Preprod.
 *
 * This performs a REAL on-chain deployment: it derives a wallet from the
 * configured seed phrase, waits for it to sync and hold spendable funds,
 * registers NIGHT for DUST generation (Midnight's fee token), generates a
 * deployment proof via the local proof server, and submits the deployment
 * transaction. On success it prints the deployed contract's on-chain address.
 *
 * Usage:
 *   npm run deploy
 * ==============================================================================
 */
import { Buffer } from 'node:buffer';
import * as Rx from 'rxjs';
import { WebSocket } from 'ws';
import dotenv from 'dotenv';

dotenv.config();

// Required for GraphQL subscriptions (wallet sync) to work in Node.js
// @ts-expect-error: needed to enable WebSocket usage through Apollo
globalThis.WebSocket = WebSocket;

import * as ledgerLib from '@midnight-ntwrk/ledger-v8';
import { unshieldedToken } from '@midnight-ntwrk/ledger-v8';
import { deployContract } from '@midnight-ntwrk/midnight-js/contracts';
import { getNetworkId } from '@midnight-ntwrk/midnight-js/network-id';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import { DustWallet } from '@midnight-ntwrk/wallet-sdk-dust-wallet';
import { HDWallet, Roles } from '@midnight-ntwrk/wallet-sdk-hd';
import { ShieldedWallet } from '@midnight-ntwrk/wallet-sdk-shielded';
import {
  createKeystore,
  InMemoryTransactionHistoryStorage,
  PublicKey,
  UnshieldedWallet,
  type UnshieldedKeystore,
} from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import { CompiledContract } from '@midnight-ntwrk/compact-js';

import { Contract, ledger, type Witnesses } from '../managed/contract/index.js';
import { contractConfig, resolveConfig, type Config } from './config.js';

interface WalletContext {
  wallet: WalletFacade;
  shieldedSecretKeys: ledgerLib.ZswapSecretKeys;
  dustSecretKey: ledgerLib.DustSecretKey;
  unshieldedKeystore: UnshieldedKeystore;
}

function stringToBytes32(str: string): Uint8Array {
  const bytes = new Uint8Array(32);
  bytes.set(new TextEncoder().encode(str).slice(0, 32));
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function withStatus<T>(message: string, fn: () => Promise<T>): Promise<T> {
  process.stdout.write(`  … ${message}\n`);
  try {
    const result = await fn();
    process.stdout.write(`  ✓ ${message}\n`);
    return result;
  } catch (e) {
    process.stdout.write(`  ✗ ${message}\n`);
    throw e;
  }
}

function deriveKeysFromSeed(seed: string) {
  const hdWallet = HDWallet.fromSeed(Buffer.from(seed, 'hex'));
  if (hdWallet.type !== 'seedOk') {
    throw new Error('Failed to initialize HDWallet from seed. Check WALLET_SEED_HEX in .env.');
  }
  const derivationResult = hdWallet.hdWallet
    .selectAccount(0)
    .selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust])
    .deriveKeysAt(0);
  if (derivationResult.type !== 'keysDerived') {
    throw new Error('Failed to derive keys from seed.');
  }
  hdWallet.hdWallet.clear();
  return derivationResult.keys;
}

function buildProviderConfig({ indexer, indexerWS, node, proofServer }: Config) {
  const shared = {
    networkId: getNetworkId(),
    indexerClientConnection: { indexerHttpUrl: indexer, indexerWsUrl: indexerWS },
  };
  return {
    shielded: { ...shared, provingServerUrl: new URL(proofServer), relayURL: new URL(node.replace(/^http/, 'ws')) },
    unshielded: { ...shared, txHistoryStorage: new InMemoryTransactionHistoryStorage() },
    dust: {
      ...shared,
      costParameters: { additionalFeeOverhead: 300_000_000_000_000n, feeBlocksMargin: 5 },
      provingServerUrl: new URL(proofServer),
      relayURL: new URL(node.replace(/^http/, 'ws')),
    },
  };
}

async function buildWalletAndWaitForFunds(config: Config, seed: string): Promise<WalletContext> {
  const { wallet, shieldedSecretKeys, dustSecretKey, unshieldedKeystore } = await withStatus(
    'Building wallet from seed',
    async () => {
      const keys = deriveKeysFromSeed(seed);
      const shieldedSecretKeys = ledgerLib.ZswapSecretKeys.fromSeed(keys[Roles.Zswap]);
      const dustSecretKey = ledgerLib.DustSecretKey.fromSeed(keys[Roles.Dust]);
      const unshieldedKeystore = createKeystore(keys[Roles.NightExternal], getNetworkId());
      const cfg = buildProviderConfig(config);
      const wallet = await WalletFacade.init({
        configuration: { ...cfg.shielded, ...cfg.unshielded, ...cfg.dust },
        shielded: (c) => ShieldedWallet(c).startWithSecretKeys(shieldedSecretKeys),
        unshielded: (c) => UnshieldedWallet(c).startWithPublicKey(PublicKey.fromKeyStore(unshieldedKeystore)),
        dust: (c) =>
          DustWallet(c).startWithSecretKey(dustSecretKey, ledgerLib.LedgerParameters.initialParameters().dust),
      });
      await wallet.start(shieldedSecretKeys, dustSecretKey);
      return { wallet, shieldedSecretKeys, dustSecretKey, unshieldedKeystore };
    },
  );

  console.log(`\n  Unshielded address (fund via faucet if balance is 0):`);
  console.log(`  ${unshieldedKeystore.getBech32Address()}`);
  console.log(`  Faucet: ${config.faucetUrl}\n`);

  const syncedState = await withStatus('Syncing wallet with network', () =>
    Rx.firstValueFrom(wallet.state().pipe(Rx.filter((s) => s.isSynced))),
  );

  const balance = syncedState.unshielded.balances[unshieldedToken().raw] ?? 0n;
  console.log(`  Unshielded balance: ${balance.toLocaleString()} tNight`);

  if (balance === 0n) {
    await withStatus('Waiting for incoming tNight from faucet', () =>
      Rx.firstValueFrom(
        wallet.state().pipe(
          Rx.throttleTime(10_000),
          Rx.filter((s) => s.isSynced),
          Rx.map((s) => s.unshielded.balances[unshieldedToken().raw] ?? 0n),
          Rx.filter((b) => b > 0n),
        ),
      ),
    );
  }

  await registerForDustGeneration(wallet, unshieldedKeystore);
  return { wallet, shieldedSecretKeys, dustSecretKey, unshieldedKeystore };
}

async function registerForDustGeneration(wallet: WalletFacade, unshieldedKeystore: UnshieldedKeystore): Promise<void> {
  const state = await Rx.firstValueFrom(wallet.state().pipe(Rx.filter((s) => s.isSynced)));
  if (state.dust.availableCoins.length > 0 && state.dust.balance(new Date()) > 0n) {
    console.log(`  DUST already available (${state.dust.balance(new Date()).toLocaleString()})`);
    return;
  }
  const nightUtxos = state.unshielded.availableCoins.filter(
    (coin: any) => coin.meta?.registeredForDustGeneration !== true,
  );
  if (nightUtxos.length > 0) {
    await withStatus(`Registering ${nightUtxos.length} NIGHT UTXO(s) for DUST generation`, async () => {
      const recipe = await wallet.registerNightUtxosForDustGeneration(
        nightUtxos,
        unshieldedKeystore.getPublicKey(),
        (payload) => unshieldedKeystore.signData(payload),
      );
      const finalized = await wallet.finalizeRecipe(recipe);
      await wallet.submitTransaction(finalized);
    });
  }
  await withStatus('Waiting for DUST to generate (fee token)', () =>
    Rx.firstValueFrom(
      wallet.state().pipe(
        Rx.throttleTime(5_000),
        Rx.filter((s) => s.isSynced),
        Rx.filter((s) => s.dust.balance(new Date()) > 0n),
      ),
    ),
  );
}

/**
 * Bridges wallet-sdk-facade to the midnight-js contract API. Manually signs
 * intents with the correct proof marker because wallet-sdk-facade@3.0.0's
 * signRecipe hardcodes 'pre-proof', which fails for proven transactions.
 */
async function createWalletAndMidnightProvider(ctx: WalletContext) {
  const state = await Rx.firstValueFrom(ctx.wallet.state().pipe(Rx.filter((s) => s.isSynced)));
  const signFn = (payload: Uint8Array) => ctx.unshieldedKeystore.signData(payload);
  const signIntents = (tx: { intents?: Map<number, any> }, proofMarker: 'proof' | 'pre-proof') => {
    if (!tx.intents) return;
    for (const segment of tx.intents.keys()) {
      const intent = tx.intents.get(segment);
      if (!intent) continue;
      const cloned = ledgerLib.Intent.deserialize(
        'signature',
        proofMarker,
        'pre-binding',
        intent.serialize(),
      );
      const sig = signFn(cloned.signatureData(segment));
      if (cloned.fallibleUnshieldedOffer) {
        cloned.fallibleUnshieldedOffer = cloned.fallibleUnshieldedOffer.addSignatures(
          cloned.fallibleUnshieldedOffer.inputs.map(() => sig),
        );
      }
      if (cloned.guaranteedUnshieldedOffer) {
        cloned.guaranteedUnshieldedOffer = cloned.guaranteedUnshieldedOffer.addSignatures(
          cloned.guaranteedUnshieldedOffer.inputs.map(() => sig),
        );
      }
      tx.intents.set(segment, cloned);
    }
  };
  return {
    getCoinPublicKey: () => state.shielded.coinPublicKey.toHexString(),
    getEncryptionPublicKey: () => state.shielded.encryptionPublicKey.toHexString(),
    async balanceTx(tx: any, ttl?: Date) {
      const recipe = await ctx.wallet.balanceUnboundTransaction(
        tx,
        { shieldedSecretKeys: ctx.shieldedSecretKeys, dustSecretKey: ctx.dustSecretKey },
        { ttl: ttl ?? new Date(Date.now() + 30 * 60 * 1000) },
      );
      signIntents(recipe.baseTransaction, 'proof');
      if (recipe.balancingTransaction) signIntents(recipe.balancingTransaction, 'pre-proof');
      return ctx.wallet.finalizeRecipe(recipe);
    },
    submitTx: (tx: any) => ctx.wallet.submitTransaction(tx),
  };
}

async function configureProviders(ctx: WalletContext, config: Config) {
  const walletAndMidnightProvider = await createWalletAndMidnightProvider(ctx);
  const zkConfigProvider = new NodeZkConfigProvider(contractConfig.zkConfigPath);
  const accountId = walletAndMidnightProvider.getCoinPublicKey();
  const storagePassword = `${Buffer.from(accountId, 'hex').toString('base64')}!`;
  return {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: contractConfig.privateStateStoreName,
      accountId,
      privateStoragePasswordProvider: () => storagePassword,
    }),
    publicDataProvider: indexerPublicDataProvider(config.indexer, config.indexerWS),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(config.proofServer, zkConfigProvider),
    walletProvider: walletAndMidnightProvider,
    midnightProvider: walletAndMidnightProvider,
  };
}

async function main(): Promise<void> {
  console.log('=============================================================');
  console.log('  CertiProof - Midnight Contract Deployment');
  console.log('=============================================================\n');

  const network = (process.env.MIDNIGHT_NETWORK || 'preview').toLowerCase();
  const config = resolveConfig(network);
  console.log(`[1/4] Target network: ${network}`);
  console.log(`      Indexer:      ${config.indexer}`);
  console.log(`      Node:         ${config.node}`);
  console.log(`      Proof server: ${config.proofServer}\n`);

  const seed = process.env.WALLET_SEED_HEX?.trim();
  if (!seed || seed.length !== 64) {
    console.error('ERROR: WALLET_SEED_HEX is missing or invalid in .env.');
    console.error('Set a 32-byte hex-encoded wallet seed (64 hex characters).');
    console.error('Generate one and fund it via the faucet before deploying:');
    console.error(`  ${config.faucetUrl}`);
    process.exit(1);
  }

  console.log('[2/4] Preparing wallet...');
  const walletCtx = await buildWalletAndWaitForFunds(config, seed);

  console.log('\n[3/4] Configuring providers and compiling contract binding...');
  const providers = await configureProviders(walletCtx, config);

  const studentId = stringToBytes32(process.env.DEMO_STUDENT_ID || 'STUDENT_001_ALICE');
  const subjectId = stringToBytes32(process.env.DEMO_SUBJECT_ID || 'CS_101_ALGORITHMS');
  const marks = BigInt(process.env.DEMO_MARKS || '78');
  const salt = stringToBytes32(process.env.DEMO_SALT || 'random_entropy_salt_49821');

  const witnesses: Witnesses<null> = {
    getStudentCertificate: (context) => [context.privateState, { studentId, subjectId, marks, salt }],
  };

  const withWitnesses = CompiledContract.withWitnesses as any;
  const withCompiledFileAssets = CompiledContract.withCompiledFileAssets as any;
  const compiledContract = (CompiledContract.make('certiproof', Contract) as any).pipe(
    (c: any) => withWitnesses(c, witnesses),
    (c: any) => withCompiledFileAssets(c, contractConfig.zkConfigPath),
  );

  console.log('\n[4/4] Deploying verifyCertificate contract to the network...');
  const deployed = await withStatus('Generating deployment proof and submitting transaction', () =>
    deployContract(providers as any, {
      compiledContract,
      privateStateId: 'certiproofPrivateState',
      initialPrivateState: null,
    } as any),
  );

  const contractAddress = deployed.deployTxData.public.contractAddress;
  console.log('\n=============================================================');
  console.log('  DEPLOYMENT SUCCESSFUL');
  console.log('=============================================================');
  console.log(`  Contract address: ${contractAddress}`);
  console.log(`  Transaction ID:   ${deployed.deployTxData.public.txId}`);
  console.log('=============================================================\n');

  console.log('Calling verifyCertificate once to demonstrate the deployed contract...');
  try {
    const callResult = await (deployed as any).callTx.verifyCertificate();
    const certHash = callResult.public.result ?? callResult.private?.result;
    if (certHash) {
      console.log(`  Certificate hash (public, disclosed): ${bytesToHex(certHash)}`);
    }

    const state = await providers.publicDataProvider.queryContractState(contractAddress);
    if (state) {
      const currentLedger = ledger(state.data);
      console.log(`  totalVerified on-chain: ${currentLedger.totalVerified}`);
    }
  } catch (e) {
    console.warn('\n  Warning: demo verifyCertificate call failed (contract is still deployed above):');
    console.warn(`  ${(e as Error).message}`);
  }

  await walletCtx.wallet.stop();
  process.exit(0);
}

main().catch((err) => {
  console.error('\nDeployment failed:', err);
  process.exit(1);
});
