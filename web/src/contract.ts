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
 *
 * Proving happens inside the connected wallet (connectedAPI.getProvingProvider),
 * not via a proof server URL. This is deliberate, not just a convenience: a
 * proof server sees witness values (marks/studentId/salt) in the clear (see
 * README, "Deployment" section) — sending those to any server, local or
 * remote, is fine for scripts/deploy.ts (a script the developer runs
 * themselves, self-attesting their own data), but would be a real privacy
 * regression for site visitors submitting their own certificate data. Lace
 * proving keeps that data inside the visitor's own wallet instead.
 */
import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { findDeployedContract } from '@midnight-ntwrk/midnight-js/contracts';
import { createProofProvider } from '@midnight-ntwrk/midnight-js-types';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { toHex, fromHex } from '@midnight-ntwrk/midnight-js-utils';
import { Transaction } from '@midnight-ntwrk/ledger-v8';
import { MidnightBech32m, ShieldedCoinPublicKey, ShieldedEncryptionPublicKey } from '@midnight-ntwrk/wallet-sdk-address-format';
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import * as Cause from 'effect/Cause';
import * as Runtime from 'effect/Runtime';

import { Contract, ledger, type Witnesses, type Ledger } from '../../managed/contract/index.js';
import { BrowserZkConfigProvider } from './browserZkConfigProvider';
import { inMemoryPrivateStateProvider } from './inMemoryPrivateStateProvider';

/**
 * compact-js's promise-based API (CompiledContract, callTx.*) runs its
 * transaction pipeline as an Effect internally, then converts it to a Promise
 * for consumers who don't use Effect directly (us). Effect.runPromise always
 * rejects with a `FiberFailure` on any unhandled failure — Fail or Die alike —
 * because a `Cause` can carry more than a single JS error (parallel failures,
 * interruption, etc). That means the real error we care about (e.g. a Lace
 * DAppConnectorAPIError thrown from our own walletProvider.balanceTx) ends up
 * hidden behind `FiberFailureCauseId` instead of being the rejection value
 * itself. `Cause.squash` is Effect's own way of pulling the real defect/failure
 * back out, so we use that rather than guessing at the wrapper's shape.
 */
// Error/Cause objects mostly carry their real content on non-enumerable
// properties, so plain `JSON.stringify(err)` renders as "{}" and Chrome's
// console shows a collapsed, unreadable object — this walks the exact spots
// Effect and our own wrapping put the real payload and prints each explicitly.
//
// A `Cause`'s actual field is `.error` (see effect/Cause's `Fail<E>` type);
// `failure` is only the key name its own `toJSON()` uses (`{ _tag: 'Fail',
// failure: toJSON(this.error) }`) — which is exactly the shape Chrome's
// console was showing. So: prefer a real `.toJSON()` call when the value is
// Cause-shaped (matches what was seen on screen), falling back to `.failure`/
// `.error` directly for anything else that happens to carry one of those.
function toPlainJSON(value: unknown): unknown {
  if (value && typeof (value as any).toJSON === 'function') {
    return (value as any).toJSON();
  }
  return value;
}

function logFailureDetails(err: unknown): void {
  const rawCause = (err as any)?.cause ?? err;
  const causeJSON = toPlainJSON(rawCause) as any;
  const failure =
    causeJSON?.failure ?? causeJSON?.error ?? (err as any)?.cause?.failure ?? (err as any)?.failure;

  console.error(
    '[CertiProof] failure payload (JSON.stringify(..., null, 2)):',
    JSON.stringify(failure, null, 2),
  );
  if (failure && typeof failure === 'object') {
    const f = failure as Record<string, unknown>;
    console.error('[CertiProof] failure.message:', f.message);
    console.error('[CertiProof] failure.reason:', f.reason);
    console.error('[CertiProof] failure.code:', f.code);
    console.error('[CertiProof] failure.data:', f.data);
  } else if (failure !== undefined) {
    console.error('[CertiProof] failure (non-object):', failure);
  }
}

function unwrapFiberFailure(error: unknown): unknown {
  if (Runtime.isFiberFailure(error)) {
    const cause = (error as any)[Runtime.FiberFailureCauseId];
    console.error('[CertiProof] Effect FiberFailure caught — pretty-printed cause:', Cause.pretty(cause));
    console.error('[CertiProof] Effect FiberFailure — raw cause:', cause);
    logFailureDetails({ cause });
    return unwrapFiberFailure(Cause.squash(cause));
  }

  // Some layers (e.g. midnight-js-contracts' generic "Unexpected error ..."
  // wrapper, which does `new Error(msg, { cause: err })`) attach a *bare*
  // Effect Cause directly as a native Error's `.cause`, without ever routing
  // it through Effect.runPromise — so it never becomes a FiberFailure and the
  // check above misses it entirely. Detect that shape here too.
  const attachedCause = (error as any)?.cause;
  if (Cause.isCause(attachedCause)) {
    console.error('[CertiProof] bare Effect Cause found on error.cause — pretty-printed:', Cause.pretty(attachedCause));
    console.error('[CertiProof] bare Effect Cause — raw:', attachedCause);
    logFailureDetails(error);
    if (Cause.isFailType(attachedCause)) {
      return unwrapFiberFailure(attachedCause.error);
    }
    return unwrapFiberFailure(Cause.squash(attachedCause));
  }

  return error;
}

// import.meta.env.BASE_URL reflects Vite's configured `base` (e.g. '/CertiProof/'
// on GitHub Pages), so this resolves correctly whether served from the domain
// root or a project-page subpath.
const ZK_ASSETS_BASE_URL = `${window.location.origin}${import.meta.env.BASE_URL}managed`;

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
    (c: any) => withCompiledFileAssets(c, ZK_ASSETS_BASE_URL),
  );
}

async function buildProviders(connectedAPI: ConnectedAPI, networkId: string) {
  const zkConfigProvider = new BrowserZkConfigProvider(ZK_ASSETS_BASE_URL);

  const configuration = await connectedAPI.getConfiguration();
  console.log('[CertiProof] wallet configuration:', configuration);
  const { indexerUri, indexerWsUri } = configuration;

  const shieldedAddresses = await connectedAPI.getShieldedAddresses();
  console.log('[CertiProof] shielded addresses:', shieldedAddresses);

  const coinPublicKeyHex = bech32ToHex(shieldedAddresses.shieldedCoinPublicKey, networkId, 'coin');
  const encryptionPublicKeyHex = bech32ToHex(shieldedAddresses.shieldedEncryptionPublicKey, networkId, 'encryption');
  console.log('[CertiProof] decoded coin/encryption public keys (hex):', { coinPublicKeyHex, encryptionPublicKeyHex });

  console.log('[CertiProof] requesting a proving provider from the connected wallet (proving happens in Lace, not a remote server)…');
  let proofProvider;
  try {
    const provingProvider = await connectedAPI.getProvingProvider(zkConfigProvider as any);
    proofProvider = createProofProvider(provingProvider as any);
  } catch (error) {
    console.error('[CertiProof] Lace did not provide a proving provider:', error);
    throw new Error(
      'Your Lace wallet does not support in-wallet proving (getProvingProvider failed). ' +
        'Update the Lace extension to the latest version and try again.',
    );
  }

  return {
    // Type param is a placeholder object, not `null`, despite the contract's real
    // PrivateState<C> being `null` — see the comment at findDeployedContract's call below.
    privateStateProvider: inMemoryPrivateStateProvider<string, Record<string, never>>(),
    zkConfigProvider,
    proofProvider,
    publicDataProvider: indexerPublicDataProvider(indexerUri, indexerWsUri),
    walletProvider: {
      getCoinPublicKey: () => coinPublicKeyHex,
      getEncryptionPublicKey: () => encryptionPublicKeyHex,
      balanceTx: async (tx: any) => {
        console.log('[CertiProof] balanceTx: requesting Lace to balance the unsealed transaction (this should prompt Lace)…');
        try {
          const serializedTx = toHex(tx.serialize());
          const { tx: balancedHex } = await connectedAPI.balanceUnsealedTransaction(serializedTx);
          console.log('[CertiProof] balanceTx: Lace returned a balanced transaction.');
          return Transaction.deserialize('signature', 'proof', 'binding', fromHex(balancedHex));
        } catch (rawError) {
          const realError = unwrapFiberFailure(rawError);
          console.error('[CertiProof] balanceTx failed. Raw error:', rawError);
          console.error('[CertiProof] balanceTx failed. Unwrapped cause:', realError);
          throw realError;
        }
      },
    },
    midnightProvider: {
      submitTx: async (tx: any) => {
        console.log('[CertiProof] submitTx: submitting the balanced transaction via Lace…');
        const serializedTx = toHex(tx.serialize());
        await connectedAPI.submitTransaction(serializedTx);
        console.log('[CertiProof] submitTx: submitted.');
        return tx.identifiers()[0];
      },
    },
  };
}

export async function callVerifyCertificate(
  connectedAPI: ConnectedAPI,
  networkId: string,
  input: StudentCertificateInput,
) {
  console.log('[CertiProof] 1/5 building providers…', { networkId, contractAddress: DEPLOYED_CONTRACT_ADDRESS });
  const providers = await buildProviders(connectedAPI, networkId);
  console.log('[CertiProof] 2/5 providers built. indexer/node/proving all come from the connected wallet.');

  console.log('[CertiProof] 3/5 building compiled contract with witness input:', {
    studentId: input.studentId,
    subjectId: input.subjectId,
    marks: input.marks.toString(),
    salt: input.salt,
  });
  const compiledContract = buildCompiledContract(input);

  console.log('[CertiProof] 4/5 joining deployed contract via findDeployedContract…');
  // midnight-js-contracts' getStates() does `assertDefined(privateStateProvider.get(id))`,
  // where assertDefined is a bare truthiness check (`if (!value) throw`) — so a legitimately
  // `null` private state (this contract's actual type, since it uses no real private state,
  // only witnesses) always fails that check even when correctly set. This contract's witness
  // ignores whatever private state it's handed and always returns fresh values, so a truthy
  // placeholder is functionally identical and sidesteps the library's overly-strict check.
  const deployed = await findDeployedContract(providers as any, {
    contractAddress: DEPLOYED_CONTRACT_ADDRESS,
    compiledContract,
    privateStateId: PRIVATE_STATE_ID,
    initialPrivateState: {},
  } as any);
  console.log('[CertiProof] joined contract at', (deployed as any).deployTxData?.public?.contractAddress);

  console.log('[CertiProof] 5/5 calling verifyCertificate circuit (this runs the local witness, generates a proof, and — via the wallet provider — balances and submits the transaction)…');
  let callResult: any;
  try {
    callResult = await (deployed as any).callTx.verifyCertificate();
  } catch (rawError) {
    // compact-js runs this whole call as an Effect internally and surfaces any
    // failure as a FiberFailure — see unwrapFiberFailure's comment above. Without
    // this, the real cause (e.g. a Lace error thrown from balanceTx) is hidden
    // behind a Cause object instead of being the thing we actually catch here.
    throw unwrapFiberFailure(rawError);
  }
  const certHash: Uint8Array = callResult.private.result;
  const txId: string = callResult.public.txId;
  console.log('[CertiProof] verifyCertificate succeeded. txId:', txId);

  const updatedContractState = await providers.publicDataProvider.queryContractState(DEPLOYED_CONTRACT_ADDRESS);
  const updatedLedger: Ledger | null = updatedContractState ? ledger(updatedContractState.data) : null;
  console.log('[CertiProof] updated ledger:', updatedLedger);

  return { certHash, txId, ledger: updatedLedger };
}
