/**
 * Lace wallet connect/disconnect via the Midnight DApp Connector API.
 *
 * Lace injects itself under `window.midnight[<name>]` (there is no single
 * fixed key — a wallet can inject multiple API versions), analogous to how
 * MetaMask-style wallets inject `window.ethereum`. There is no wallet-side
 * "disconnect" call in this API: disconnecting is purely an app-level reset
 * of the cached connection.
 */
import semver from 'semver';
import type { ConnectedAPI, InitialAPI } from '@midnight-ntwrk/dapp-connector-api';

const COMPATIBLE_CONNECTOR_API_VERSION = '4.x';

declare global {
  interface Window {
    midnight?: Record<string, InitialAPI>;
  }
}

export class WalletNotFoundError extends Error {
  constructor() {
    super('Could not find the Midnight Lace wallet. Is the extension installed and enabled?');
    this.name = 'WalletNotFoundError';
  }
}

function getFirstCompatibleWallet(): InitialAPI | undefined {
  if (!window.midnight) return undefined;
  return Object.values(window.midnight).find(
    (wallet): wallet is InitialAPI =>
      !!wallet && typeof wallet === 'object' && 'apiVersion' in wallet && semver.satisfies(wallet.apiVersion, COMPATIBLE_CONNECTOR_API_VERSION),
  );
}

let connectedAPI: ConnectedAPI | undefined;

export function getConnectedWallet(): ConnectedAPI | undefined {
  return connectedAPI;
}

export async function connectWallet(networkId: string): Promise<ConnectedAPI> {
  const initialAPI = getFirstCompatibleWallet();
  if (!initialAPI) {
    throw new WalletNotFoundError();
  }
  const api = await initialAPI.connect(networkId);
  connectedAPI = api;
  return api;
}

export function disconnectWallet(): void {
  connectedAPI = undefined;
}

export function isWalletConnected(): boolean {
  return connectedAPI !== undefined;
}
