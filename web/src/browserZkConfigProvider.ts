/**
 * Browser counterpart of @midnight-ntwrk/midnight-js-node-zk-config-provider's
 * NodeZkConfigProvider: same directory layout (keys/*.prover, keys/*.verifier,
 * zkir/*.bzkir), same interface, but fetched over HTTP from same-origin static
 * files instead of read from the local filesystem.
 */
import {
  ZKConfigProvider,
  createProverKey,
  createVerifierKey,
  createZKIR,
  type ProverKey,
  type VerifierKey,
  type ZKIR,
} from '@midnight-ntwrk/midnight-js-types';

const KEY_DIR = 'keys';
const PROVER_EXT = '.prover';
const VERIFIER_EXT = '.verifier';
const ZKIR_DIR = 'zkir';
const ZKIR_EXT = '.bzkir';

export class BrowserZkConfigProvider<K extends string> extends ZKConfigProvider<K> {
  constructor(private readonly baseUrl: string) {
    super();
  }

  private async fetchFile(subDir: string, circuitId: string, ext: string): Promise<Uint8Array> {
    const url = `${this.baseUrl}/${subDir}/${circuitId}${ext}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ZK asset ${url}: ${response.status} ${response.statusText}`);
    }
    return new Uint8Array(await response.arrayBuffer());
  }

  getProverKey(circuitId: K): Promise<ProverKey> {
    return this.fetchFile(KEY_DIR, circuitId, PROVER_EXT).then(createProverKey);
  }

  getVerifierKey(circuitId: K): Promise<VerifierKey> {
    return this.fetchFile(KEY_DIR, circuitId, VERIFIER_EXT).then(createVerifierKey);
  }

  getZKIR(circuitId: K): Promise<ZKIR> {
    return this.fetchFile(ZKIR_DIR, circuitId, ZKIR_EXT).then(createZKIR);
  }
}
