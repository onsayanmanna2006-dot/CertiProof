/**
 * One-off dev tool: deploys a fresh CertiProof contract instance to Preprod
 * by proving and submitting entirely inside the connected Lace wallet —
 * mirrors scripts/deploy.ts's deployContract call, but backed by Lace's own
 * wallet/sync instead of a headless Node wallet.
 *
 * Why this exists: scripts/deploy.ts (a standalone Node wallet) OOMs syncing
 * against Preprod's chain history — confirmed even on a 16GB GitHub Actions
 * runner (ran ~33 minutes, grew to ~10GB, still hadn't finished). Lace
 * already has to sync its own wallet state to show your balance, so reusing
 * that connection sidesteps the problem instead of fighting it with more
 * memory. See README's "Preprod" section for the full story.
 *
 * Not part of the public demo: this page is not linked from index.html and
 * is not included in the production build (only index.html is built for
 * GitHub Pages) — it only exists via `npm run dev:web`.
 */
import './polyfills';
import { setNetworkId } from '@midnight-ntwrk/midnight-js/network-id';
import { deployContract } from '@midnight-ntwrk/midnight-js/contracts';
import { connectWallet, disconnectWallet, getConnectedWallet, isWalletConnected, WalletNotFoundError } from './wallet';
import { buildProviders, buildCompiledContract, PRIVATE_STATE_ID } from './contract';

const NETWORK_ID = 'preprod';

const logEl = document.getElementById('log') as HTMLElement;
const connectBtn = document.getElementById('connect-btn') as HTMLButtonElement;
const deployBtn = document.getElementById('deploy-btn') as HTMLButtonElement;

function log(line: string) {
  const timestamp = new Date().toISOString().split('T')[1].replace('Z', '');
  logEl.textContent = (logEl.textContent === 'Not connected.' ? '' : logEl.textContent + '\n') + `[${timestamp}] ${line}`;
  console.log('[deploy-preprod]', line);
}

function init() {
  setNetworkId(NETWORK_ID);

  connectBtn.addEventListener('click', async () => {
    if (isWalletConnected()) {
      disconnectWallet();
      connectBtn.textContent = 'Connect Lace (Preprod)';
      deployBtn.disabled = true;
      log('Disconnected.');
      return;
    }

    connectBtn.disabled = true;
    log('Connecting to Lace (make sure it is switched to Preprod)…');
    try {
      const api = await connectWallet(NETWORK_ID);
      const configuration = await api.getConfiguration();
      log(`Connected. Indexer: ${configuration.indexerUri}`);
      connectBtn.textContent = 'Disconnect';
      deployBtn.disabled = false;
    } catch (error) {
      const message = error instanceof WalletNotFoundError ? error.message : `Connection failed: ${String(error)}`;
      log(`ERROR: ${message}`);
    } finally {
      connectBtn.disabled = false;
    }
  });

  deployBtn.addEventListener('click', async () => {
    const connectedAPI = getConnectedWallet();
    if (!connectedAPI) {
      log('ERROR: connect Lace first.');
      return;
    }

    deployBtn.disabled = true;
    try {
      log('Building providers from the connected wallet (indexer/proving all come from Lace)…');
      const providers = await buildProviders(connectedAPI, NETWORK_ID);

      log('Building compiled contract binding…');
      const compiledContract = buildCompiledContract({
        studentId: 'STUDENT_001_ALICE',
        subjectId: 'CS_101_ALGORITHMS',
        marks: 78n,
        salt: 'preprod_deploy_demo_salt',
      });

      log('Deploying — Lace should prompt you to approve the deployment transaction…');
      const deployed = await deployContract(providers as any, {
        compiledContract,
        privateStateId: PRIVATE_STATE_ID,
        initialPrivateState: {},
      } as any);

      const contractAddress = (deployed as any).deployTxData.public.contractAddress;
      const txId = (deployed as any).deployTxData.public.txId;
      log('DEPLOYMENT SUCCESSFUL');
      log(`Contract address: ${contractAddress}`);
      log(`Transaction ID:   ${txId}`);
      log('Copy the contract address above into README.md and web/src/contract.ts if you want the public demo to target this deployment.');
    } catch (error) {
      log(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
      console.error('[deploy-preprod] full error:', error);
    } finally {
      deployBtn.disabled = false;
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
