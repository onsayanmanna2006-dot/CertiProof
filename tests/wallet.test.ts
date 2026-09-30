import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { connectWallet, disconnectWallet, isWalletConnected, WalletNotFoundError } from '../web/src/wallet.js';

// wallet.ts reads `window.midnight`, which the wallet extension injects.
const fakeWindow = globalThis as unknown as { window: { midnight?: Record<string, unknown> } };

function fakeWallet() {
  return { apiVersion: '4.0.1', connect: vi.fn(async () => ({ fake: 'connectedAPI' })) };
}

describe('connectWallet (Round 1 feedback: "Try to improve connectivity")', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fakeWindow.window = {};
    disconnectWallet();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('connects at once when the wallet is already injected', async () => {
    const wallet = fakeWallet();
    fakeWindow.window.midnight = { mnLace: wallet };

    await connectWallet('preprod');

    expect(wallet.connect).toHaveBeenCalledWith('preprod');
    expect(isWalletConnected()).toBe(true);
  });

  it('waits for a wallet extension that injects itself a moment late', async () => {
    const wallet = fakeWallet();
    const pending = connectWallet('preprod');

    await vi.advanceTimersByTimeAsync(1000);
    fakeWindow.window.midnight = { oneAm: wallet };
    await vi.advanceTimersByTimeAsync(400);

    await pending;
    expect(wallet.connect).toHaveBeenCalledWith('preprod');
    expect(isWalletConnected()).toBe(true);
  });

  it('gives up with WalletNotFoundError when no wallet appears', async () => {
    const pending = connectWallet('preprod');
    const assertion = expect(pending).rejects.toBeInstanceOf(WalletNotFoundError);

    await vi.advanceTimersByTimeAsync(3500);

    await assertion;
    expect(isWalletConnected()).toBe(false);
  });

  it('ignores wallets with an incompatible connector API version', async () => {
    fakeWindow.window.midnight = { old: { ...fakeWallet(), apiVersion: '1.0.0' } };
    const pending = connectWallet('preprod');
    const assertion = expect(pending).rejects.toBeInstanceOf(WalletNotFoundError);

    await vi.advanceTimersByTimeAsync(3500);

    await assertion;
  });
});
