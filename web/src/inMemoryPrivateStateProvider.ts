/**
 * Minimal in-browser PrivateStateProvider. This demo's contract uses `null`
 * as its private state (all real private data — studentId/marks/salt — is
 * supplied fresh per call via the witness, not persisted state), so this
 * only needs to satisfy the interface, not back a meaningful store.
 * Export/import isn't used by the connect + call-circuit flow, so those are
 * left unimplemented rather than faked.
 */
import type { ContractAddress, SigningKey } from '@midnight-ntwrk/compact-runtime';
import type {
  PrivateStateId,
  PrivateStateProvider,
  PrivateStateExport,
  ExportPrivateStatesOptions,
  ImportPrivateStatesOptions,
  ImportPrivateStatesResult,
  SigningKeyExport,
  ExportSigningKeysOptions,
  ImportSigningKeysOptions,
  ImportSigningKeysResult,
} from '@midnight-ntwrk/midnight-js-types';

export function inMemoryPrivateStateProvider<PSI extends PrivateStateId, PS>(): PrivateStateProvider<PSI, PS> {
  const states = new Map<PSI, PS>();
  const signingKeys = new Map<string, SigningKey>();

  return {
    setContractAddress(): void {
      // No namespacing needed for this single-contract demo.
    },
    async set(privateStateId: PSI, state: PS): Promise<void> {
      states.set(privateStateId, state);
    },
    async get(privateStateId: PSI): Promise<PS | null> {
      return states.has(privateStateId) ? states.get(privateStateId)! : null;
    },
    async remove(privateStateId: PSI): Promise<void> {
      states.delete(privateStateId);
    },
    async clear(): Promise<void> {
      states.clear();
    },
    async setSigningKey(address: ContractAddress, signingKey: SigningKey): Promise<void> {
      signingKeys.set(address, signingKey);
    },
    async getSigningKey(address: ContractAddress): Promise<SigningKey | null> {
      return signingKeys.has(address) ? signingKeys.get(address)! : null;
    },
    async removeSigningKey(address: ContractAddress): Promise<void> {
      signingKeys.delete(address);
    },
    async clearSigningKeys(): Promise<void> {
      signingKeys.clear();
    },
    async exportPrivateStates(_options?: ExportPrivateStatesOptions): Promise<PrivateStateExport> {
      throw new Error('exportPrivateStates is not supported by this in-memory browser provider.');
    },
    async importPrivateStates(
      _exportData: PrivateStateExport,
      _options?: ImportPrivateStatesOptions,
    ): Promise<ImportPrivateStatesResult> {
      throw new Error('importPrivateStates is not supported by this in-memory browser provider.');
    },
    async exportSigningKeys(_options?: ExportSigningKeysOptions): Promise<SigningKeyExport> {
      throw new Error('exportSigningKeys is not supported by this in-memory browser provider.');
    },
    async importSigningKeys(
      _exportData: SigningKeyExport,
      _options?: ImportSigningKeysOptions,
    ): Promise<ImportSigningKeysResult> {
      throw new Error('importSigningKeys is not supported by this in-memory browser provider.');
    },
  };
}
