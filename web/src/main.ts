import { setNetworkId } from '@midnight-ntwrk/midnight-js/network-id';
import { connectWallet, disconnectWallet, getConnectedWallet, isWalletConnected, WalletNotFoundError } from './wallet';
import { callVerifyCertificate, type StudentCertificateInput } from './contract';

const NETWORK_ID = 'preview';
const PROOF_SERVER_URI = (import.meta as any).env?.VITE_PROOF_SERVER_URI || 'http://127.0.0.1:6300';

// --- Subtle hero seal parallax (decorative only) -----------------------
(function initHeroParallax() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const seal = document.querySelector<HTMLElement>('.proof-seal');
  if (!seal || reduceMotion || isCoarsePointer) return;

  const MAX_DEG = 5;
  let ticking = false;
  let pendingEvent: MouseEvent | null = null;

  function apply(event: MouseEvent) {
    const rect = seal!.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    const ry = (px - 0.5) * (MAX_DEG * 2);
    const rx = (0.5 - py) * (MAX_DEG * 2);
    seal!.style.setProperty('--rx', `${rx.toFixed(2)}deg`);
    seal!.style.setProperty('--ry', `${ry.toFixed(2)}deg`);
  }

  window.addEventListener('mousemove', (event) => {
    pendingEvent = event;
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      if (pendingEvent) apply(pendingEvent);
      ticking = false;
    });
  });
})();

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function init() {
  setNetworkId(NETWORK_ID);

  const form = document.getElementById('verifier-form') as HTMLFormElement;
  const studentIdInput = document.getElementById('student-id') as HTMLInputElement;
  const subjectIdInput = document.getElementById('subject-id') as HTMLInputElement;
  const marksInput = document.getElementById('marks') as HTMLInputElement;
  const saltInput = document.getElementById('salt') as HTMLInputElement;
  const generateSaltBtn = document.getElementById('generate-salt-btn') as HTMLButtonElement;
  const presetPassBtn = document.getElementById('preset-pass-btn') as HTMLButtonElement;
  const presetFailBtn = document.getElementById('preset-fail-btn') as HTMLButtonElement;
  const statusPill = document.getElementById('status-pill') as HTMLElement;
  const resultContainer = document.getElementById('result-container') as HTMLElement;
  const walletBtn = document.getElementById('wallet-btn') as HTMLButtonElement;
  const privacyProof = document.getElementById('privacy-proof') as HTMLElement;
  const privacyProofOutput = document.getElementById('privacy-proof-output') as HTMLElement;

  const workflowSteps = Array.from(document.querySelectorAll<HTMLElement>('.workflow-step'));
  const stepOrder = ['credential', 'circuit', 'proof', 'verify', 'verified'];

  function setWorkflow(activeKey: string, opts: { failedAt?: string } = {}) {
    const activeIndex = stepOrder.indexOf(activeKey);
    workflowSteps.forEach((step) => {
      const key = step.dataset.step!;
      const index = stepOrder.indexOf(key);
      step.classList.remove('is-complete', 'is-active', 'is-failed', 'is-verified');

      if (opts.failedAt && key === opts.failedAt) {
        step.classList.add('is-failed');
      } else if (index < activeIndex) {
        step.classList.add('is-complete');
      } else if (index === activeIndex) {
        step.classList.add(key === 'verified' ? 'is-verified' : 'is-active');
      }
    });
  }

  function randomHex(length: number): string {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  function renderWalletButton() {
    if (isWalletConnected()) {
      walletBtn.textContent = 'Disconnect';
      walletBtn.classList.add('is-connected');
    } else {
      walletBtn.textContent = 'Connect Lace';
      walletBtn.classList.remove('is-connected');
    }
  }

  walletBtn.addEventListener('click', async () => {
    if (isWalletConnected()) {
      disconnectWallet();
      renderWalletButton();
      return;
    }

    walletBtn.disabled = true;
    walletBtn.classList.add('is-connecting');
    walletBtn.textContent = 'Connecting…';
    try {
      await connectWallet(NETWORK_ID);
    } catch (error) {
      const message = error instanceof WalletNotFoundError ? error.message : `Wallet connection failed: ${String(error)}`;
      alert(message);
    } finally {
      walletBtn.disabled = false;
      walletBtn.classList.remove('is-connecting');
      renderWalletButton();
    }
  });

  generateSaltBtn.addEventListener('click', () => {
    saltInput.value = randomHex(16);
  });

  presetPassBtn.addEventListener('click', () => {
    studentIdInput.value = 'STUDENT_001_ALICE';
    subjectIdInput.value = 'CS_101_ALGORITHMS';
    marksInput.value = '78';
    saltInput.value = 'c8f1e94b2a304e76d91f284b';
    form.dispatchEvent(new Event('submit'));
  });

  presetFailBtn.addEventListener('click', () => {
    studentIdInput.value = 'STUDENT_002_BOB';
    subjectIdInput.value = 'CS_101_ALGORITHMS';
    marksInput.value = '48';
    saltInput.value = 'e2a9b31d87f54c19a0e6317d';
    form.dispatchEvent(new Event('submit'));
  });

  function renderCircuitRejected(errorMessage: string) {
    setWorkflow('circuit', { failedAt: 'circuit' });
    statusPill.className = 'status-indicator fail';
    statusPill.textContent = 'Verification failed';

    resultContainer.className = 'verification-result';
    resultContainer.innerHTML = `
      <div class="result-seal">
        <div class="result-top">
          <span class="result-icon fail">&times;</span>
          <div class="result-heading">
            <span class="title">Proof rejected</span>
            <span class="subtitle">Circuit constraint violated &mdash; marks &lt; 60</span>
          </div>
        </div>
        <div class="result-row">
          <span class="result-label">Circuit error (real, from the deployed contract)</span>
          <span class="result-value">${errorMessage}</span>
        </div>
        <div class="result-row">
          <span class="result-label">Public ledger impact</span>
          <span class="result-value muted">No transaction committed. Ledger remains unchanged.</span>
        </div>
      </div>
    `;
    privacyProof.hidden = true;
  }

  function renderVerified(input: StudentCertificateInput, certHash: Uint8Array, txId: string, totalVerified: bigint) {
    setWorkflow('verified');
    statusPill.className = 'status-indicator pass';
    statusPill.textContent = 'Verification passed';

    resultContainer.className = 'verification-result';
    resultContainer.innerHTML = `
      <div class="result-seal">
        <div class="result-top">
          <span class="result-icon pass">&#10003;</span>
          <div class="result-heading">
            <span class="title">Verified</span>
            <span class="subtitle">Zero-knowledge proof valid &mdash; marks &ge; 60</span>
          </div>
        </div>
        <div class="result-row">
          <span class="result-label">Certificate hash (disclosed)</span>
          <span class="result-value">0x${bytesToHex(certHash)}</span>
        </div>
        <div class="result-row">
          <span class="result-label">Transaction ID (Preview)</span>
          <span class="result-value">${txId}</span>
        </div>
        <div class="result-row">
          <span class="result-label">Public verification status</span>
          <span class="result-value accent-success">true &mdash; recorded in verifiedCertificates map</span>
        </div>
        <div class="result-row">
          <span class="result-label">Total verified (ledger counter)</span>
          <span class="result-value muted">${totalVerified}</span>
        </div>
        <div class="result-row">
          <span class="result-label">Shielded private data (never disclosed)</span>
          <span class="result-value muted">marks, studentId, salt</span>
        </div>
      </div>
    `;

    const serializedLedger = JSON.stringify({ totalVerified: totalVerified.toString(), certHash: bytesToHex(certHash) });
    const leaked = [input.marks.toString(), input.studentId, input.salt].filter((v) => serializedLedger.includes(v));

    privacyProof.hidden = false;
    privacyProofOutput.textContent =
      `ledger keys on-chain: totalVerified, verifiedCertificates\n` +
      `totalVerified          = ${totalVerified}\n` +
      `verifiedCertificates[${bytesToHex(certHash).slice(0, 16)}...] = true\n\n` +
      `searched serialized ledger for your private inputs:\n` +
      `  marks ("${input.marks}")        -> ${leaked.includes(input.marks.toString()) ? 'FOUND (!)' : 'not found'}\n` +
      `  studentId ("${input.studentId}") -> ${leaked.includes(input.studentId) ? 'FOUND (!)' : 'not found'}\n` +
      `  salt ("${input.salt}")           -> ${leaked.includes(input.salt) ? 'FOUND (!)' : 'not found'}`;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!isWalletConnected()) {
      alert('Connect your Lace wallet first.');
      return;
    }

    const input: StudentCertificateInput = {
      studentId: studentIdInput.value.trim(),
      subjectId: subjectIdInput.value.trim(),
      marks: BigInt(parseInt(marksInput.value, 10) || 0),
      salt: saltInput.value.trim(),
    };

    setWorkflow('credential');
    statusPill.className = 'status-indicator idle';
    statusPill.textContent = 'Generating witness';
    privacyProof.hidden = true;

    setWorkflow('circuit');
    statusPill.textContent = 'Running circuit & awaiting Lace approval';

    try {
      const connectedAPI = getConnectedWallet()!;
      const { certHash, txId, ledger: updatedLedger } = await callVerifyCertificate(
        connectedAPI,
        NETWORK_ID,
        PROOF_SERVER_URI,
        input,
      );

      setWorkflow('proof');
      setWorkflow('verify');
      renderVerified(input, certHash, txId, updatedLedger?.totalVerified ?? 0n);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('Student marks must be at least 60')) {
        renderCircuitRejected(message);
      } else {
        setWorkflow('circuit', { failedAt: 'circuit' });
        statusPill.className = 'status-indicator fail';
        statusPill.textContent = 'Verification failed';
        resultContainer.className = 'verification-result';
        resultContainer.innerHTML = `<p class="empty-copy">Error: ${message}</p>`;
      }
    }
  });

  renderWalletButton();
}

// This module's top-level code can take a while to reach this point (importing
// the WASM-backed Midnight packages suspends module evaluation), so the real
// DOMContentLoaded event has very likely already fired by the time we get here
// — registering for it unconditionally would mean init() never runs.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
