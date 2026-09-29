import './polyfills';
import { setNetworkId } from '@midnight-ntwrk/midnight-js/network-id';
import { connectWallet, disconnectWallet, getConnectedWallet, isWalletConnected, WalletNotFoundError } from './wallet';
import { callVerifyCertificate, VerifyCertificateError, type StudentCertificateInput } from './contract';
import { fetchTotalVerified, InvalidCertHashError, lookupCertificate, parseCertHash } from './lookup';
import { buildFeedbackUrl } from './feedback';

const NETWORK_ID = 'preprod';

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

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

// contract.ts's callVerifyCertificate throws VerifyCertificateError with an
// already fully-unwrapped `.failure` (see unwrapToRealFailure there) — no
// need to re-derive it here from an opaque wrapped message or walk `.cause`
// ourselves. We just need to recognize the specific failure shapes worth a
// tailored message.
interface WalletApiFailure {
  type: 'DAppConnectorAPIError';
  code?: string;
  reason?: string;
  message?: string;
}

function isWalletApiFailure(value: unknown): value is WalletApiFailure {
  return typeof value === 'object' && value !== null && (value as any).type === 'DAppConnectorAPIError';
}

interface InsufficientFundsFailure {
  _tag: string; // e.g. 'Wallet.InsufficientFunds'
  message?: string;
  tokenType?: string;
}

function isInsufficientFundsFailure(value: unknown): value is InsufficientFundsFailure {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as any)._tag === 'string' &&
    (value as any)._tag.includes('InsufficientFunds')
  );
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
  const heroStat = document.getElementById('hero-stat') as HTMLElement;
  const heroStatValue = document.getElementById('hero-stat-value') as HTMLElement;
  const checkForm = document.getElementById('check-form') as HTMLFormElement;
  const checkHashInput = document.getElementById('check-hash') as HTMLInputElement;
  const checkBtn = document.getElementById('check-btn') as HTMLButtonElement;
  const checkResult = document.getElementById('check-result') as HTMLElement;

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
      walletBtn.textContent = 'Connect Wallet';
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
    // Fresh salt per run, so every tester commits their own distinct
    // certificate hash rather than re-verifying one shared sample.
    saltInput.value = randomHex(12);
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

  function renderWalletActionNeeded(reason: string) {
    setWorkflow('circuit', { failedAt: 'circuit' });
    statusPill.className = 'status-indicator fail';
    statusPill.textContent = 'Action needed in your wallet';

    resultContainer.className = 'verification-result';
    resultContainer.innerHTML = `
      <div class="result-seal">
        <div class="result-top">
          <span class="result-icon fail">&#33;</span>
          <div class="result-heading">
            <span class="title">Your wallet needs your attention</span>
            <span class="subtitle">${reason}</span>
          </div>
        </div>
        <div class="result-row">
          <span class="result-label">What to do</span>
          <span class="result-value">Unlock your wallet (or approve/retry the request it's showing), then click "Generate ZK Proof" again.</span>
        </div>
      </div>
    `;
    privacyProof.hidden = true;
  }

  function renderVerified(
    input: StudentCertificateInput,
    certHash: Uint8Array,
    txId: string,
    totalVerified: bigint,
    walletAddress: string | null,
  ) {
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
          <span class="result-label">Transaction ID (Preprod)</span>
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
        ${
          walletAddress
            ? `<div class="result-row">
          <span class="result-label">Your wallet address (Preprod)</span>
          <span class="result-value">${escapeHtml(walletAddress)}</span>
        </div>`
            : ''
        }
      </div>
      ${renderNextSteps(certHash, txId, walletAddress)}
    `;
    wireNextSteps(certHash, txId, walletAddress);
    showTotalVerified(totalVerified);

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

  function renderNextSteps(certHash: Uint8Array, txId: string, walletAddress: string | null): string {
    const feedbackUrl = walletAddress ? buildFeedbackUrl(walletAddress, txId) : null;
    return `
      <div class="next-steps">
        <h3>Thanks for testing CertiProof on Preprod!</h3>
        <p>Your transaction is on-chain. Share quick feedback &mdash; your wallet address and transaction ID are filled in for you.</p>
        <div class="next-steps-actions">
          ${feedbackUrl ? `<a class="cta-primary" href="${escapeHtml(feedbackUrl)}" target="_blank" rel="noopener">Share feedback (1 min)</a>` : ''}
          <button type="button" class="secondary-btn" id="copy-details-btn">Copy wallet &amp; tx ID</button>
          <button type="button" class="secondary-btn" id="check-this-btn">Check this certificate as an employer</button>
        </div>
      </div>
    `;
  }

  function wireNextSteps(certHash: Uint8Array, txId: string, walletAddress: string | null) {
    const copyBtn = document.getElementById('copy-details-btn') as HTMLButtonElement;
    copyBtn.addEventListener('click', async () => {
      const details = `Wallet address: ${walletAddress ?? '(not available)'}\nTransaction ID: ${txId}`;
      try {
        await navigator.clipboard.writeText(details);
        copyBtn.textContent = 'Copied!';
      } catch {
        copyBtn.textContent = 'Copy failed — select the text above';
      }
    });

    (document.getElementById('check-this-btn') as HTMLButtonElement).addEventListener('click', () => {
      checkHashInput.value = `0x${bytesToHex(certHash)}`;
      document.getElementById('check')!.scrollIntoView({ behavior: 'smooth', block: 'start' });
      checkForm.requestSubmit();
    });
  }

  function showTotalVerified(total: bigint) {
    heroStatValue.textContent = total.toString();
    heroStat.hidden = false;
  }

  async function getWalletAddress(): Promise<string | null> {
    try {
      const { unshieldedAddress } = await getConnectedWallet()!.getUnshieldedAddress();
      return unshieldedAddress;
    } catch (error) {
      console.warn('[CertiProof] could not read the wallet address:', error);
      return null;
    }
  }

  checkForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    checkResult.hidden = false;
    checkResult.className = 'check-result';

    let certHash: Uint8Array;
    try {
      certHash = parseCertHash(checkHashInput.value);
    } catch (error) {
      checkResult.classList.add('is-fail');
      checkResult.textContent = error instanceof InvalidCertHashError ? error.message : String(error);
      return;
    }

    checkBtn.disabled = true;
    checkResult.textContent = 'Reading the public Preprod ledger…';
    try {
      const { verified, totalVerified } = await lookupCertificate(certHash);
      showTotalVerified(totalVerified);
      checkResult.classList.add(verified ? 'is-pass' : 'is-fail');
      checkResult.innerHTML = verified
        ? `<strong>&#10003; Verified on-chain.</strong> This certificate was proven to meet the requirement (marks &ge; 60) by a zero-knowledge proof. The student's marks, ID and salt are not stored anywhere on-chain.`
        : `<strong>&times; Not found.</strong> No verified certificate with this hash exists on the CertiProof Preprod contract. Check the hash was copied in full.`;
    } catch (error) {
      console.error('[CertiProof] certificate lookup failed:', error);
      checkResult.classList.add('is-fail');
      checkResult.textContent = `Could not reach the Preprod indexer: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      checkBtn.disabled = false;
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!isWalletConnected()) {
      alert('Connect your Midnight wallet first.');
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
    statusPill.textContent = 'Running circuit & awaiting wallet approval';
    // Testers said verifying "takes some time" with no sign of progress, so
    // show how long it's been and why: the proof is built on their device.
    const startedAt = Date.now();
    const showElapsed = () => {
      const seconds = Math.round((Date.now() - startedAt) / 1000);
      resultContainer.className = 'verification-result';
      resultContainer.innerHTML = `<p class="empty-copy">Working&hellip; ${seconds}s. Your zero-knowledge proof is being generated on your own device and then submitted to Preprod &mdash; this can take a minute or two. Approve the request in your wallet when it pops up, and keep this tab open.</p>`;
    };
    showElapsed();
    const elapsedTimer = window.setInterval(showElapsed, 1000);

    try {
      const connectedAPI = getConnectedWallet()!;
      const { certHash, txId, ledger: updatedLedger } = await callVerifyCertificate(
        connectedAPI,
        NETWORK_ID,
        input,
      );

      const walletAddress = await getWalletAddress();

      window.clearInterval(elapsedTimer);
      setWorkflow('proof');
      setWorkflow('verify');
      renderVerified(input, certHash, txId, updatedLedger?.totalVerified ?? 0n, walletAddress);
    } catch (error) {
      window.clearInterval(elapsedTimer);
      console.error('[CertiProof] verifyCertificate failed:', error);

      // contract.ts already fully unwraps FiberFailure/Cause/wrapper layers
      // (see unwrapToRealFailure) before throwing VerifyCertificateError, so
      // `.failure` here is the real, structured failure — no re-derivation.
      const failure = error instanceof VerifyCertificateError ? error.failure : error;
      const message = error instanceof Error ? error.message : String(error);

      if (message.includes('Student marks must be at least 60')) {
        renderCircuitRejected(message);
      } else if (isInsufficientFundsFailure(failure)) {
        const token = (failure.tokenType || 'funds').toUpperCase();
        renderWalletActionNeeded(
          `Insufficient ${token} to pay transaction fees` +
            (failure.message ? `: ${failure.message}` : '.') +
            ' DUST accrues automatically over time from NIGHT you hold — check your DUST balance in your wallet and retry once it\'s non-zero.',
        );
      } else if (isWalletApiFailure(failure)) {
        const detail = [failure.code, failure.reason || failure.message].filter(Boolean).join(': ');
        renderWalletActionNeeded(detail || message);
      } else {
        setWorkflow('circuit', { failedAt: 'circuit' });
        statusPill.className = 'status-indicator fail';
        statusPill.textContent = 'Verification failed';
        resultContainer.className = 'verification-result';
        // Usually a dropped connection to the wallet, proof server or Preprod
        // node — say so plainly instead of showing only the raw error.
        resultContainer.innerHTML = `<p class="empty-copy"><strong>Something went wrong while talking to your wallet or the Preprod network.</strong> Check your internet connection, make sure your wallet is unlocked, set to Preprod and fully synced, then click "Generate ZK Proof" again.</p><p class="empty-copy">Details: ${message}</p>`;
      }
    }
  });

  renderWalletButton();

  fetchTotalVerified()
    .then(showTotalVerified)
    .catch((error) => console.warn('[CertiProof] could not load the live verified count:', error));
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
