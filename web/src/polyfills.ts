/**
 * Several Midnight packages (wallet-sdk-address-format, midnight-js-utils,
 * midnight-js-indexer-public-data-provider) reference the bare `Buffer`
 * global directly, which browsers don't provide. Must be imported first,
 * before any module that transitively imports those packages, so the
 * global exists by the time they need it.
 */
import { Buffer } from 'buffer';

if (typeof globalThis.Buffer === 'undefined') {
  globalThis.Buffer = Buffer;
}
