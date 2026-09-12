// Client-side interactive simulation of ZK-Certificate-Verifier

// --- Subtle hero seal parallax (decorative only) -----------------------
(function initHeroParallax() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const seal = document.querySelector('.proof-seal');
  if (!seal || reduceMotion || isCoarsePointer) return;

  const MAX_DEG = 5;
  let ticking = false;
  let pendingEvent = null;

  function apply(event) {
    const rect = seal.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    const ry = (px - 0.5) * (MAX_DEG * 2);
    const rx = (0.5 - py) * (MAX_DEG * 2);
    seal.style.setProperty('--rx', `${rx.toFixed(2)}deg`);
    seal.style.setProperty('--ry', `${ry.toFixed(2)}deg`);
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

async function sha256(message) {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

let simulatedTotalVerified = 0;

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('verifier-form');
  const studentIdInput = document.getElementById('student-id');
  const subjectIdInput = document.getElementById('subject-id');
  const marksInput = document.getElementById('marks');
  const saltInput = document.getElementById('salt');
  const generateSaltBtn = document.getElementById('generate-salt-btn');
  const presetPassBtn = document.getElementById('preset-pass-btn');
  const presetFailBtn = document.getElementById('preset-fail-btn');
  const statusPill = document.getElementById('status-pill');
  const resultContainer = document.getElementById('result-container');

  const workflowSteps = Array.from(document.querySelectorAll('.workflow-step'));
  const stepOrder = ['credential', 'circuit', 'proof', 'verify', 'verified'];

  function setWorkflow(activeKey, opts = {}) {
    const activeIndex = stepOrder.indexOf(activeKey);
    workflowSteps.forEach((step) => {
      const key = step.dataset.step;
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

  function randomHex(length) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

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

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const studentId = studentIdInput.value.trim();
    const subjectId = subjectIdInput.value.trim();
    const marks = parseInt(marksInput.value, 10);
    const salt = saltInput.value.trim();

    setWorkflow('credential');
    statusPill.className = 'status-indicator idle';
    statusPill.textContent = 'Generating witness';

    await new Promise(r => setTimeout(r, 200));
    setWorkflow('circuit');

    const isPassing = marks >= 60;

    if (!isPassing) {
      await new Promise(r => setTimeout(r, 250));
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
            <span class="result-label">Circuit error</span>
            <span class="result-value">assert(cert.marks &ge; 60) &mdash; "Student marks must be at least 60 to pass verification"</span>
          </div>
          <div class="result-row">
            <span class="result-label">Public ledger impact</span>
            <span class="result-value muted">No transaction committed. Ledger remains unchanged.</span>
          </div>
        </div>
      `;
      return;
    }

    await new Promise(r => setTimeout(r, 220));
    setWorkflow('proof');

    const payload = `${studentId}:${subjectId}:${marks}:${salt}`;
    const certHash = await sha256(payload);

    await new Promise(r => setTimeout(r, 220));
    setWorkflow('verify');

    await new Promise(r => setTimeout(r, 220));
    setWorkflow('verified');

    simulatedTotalVerified += 1;
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
          <span class="result-value">0x${certHash}</span>
        </div>
        <div class="result-row">
          <span class="result-label">Public verification status</span>
          <span class="result-value accent-success">true &mdash; recorded in verifiedCertificates map</span>
        </div>
        <div class="result-row">
          <span class="result-label">Total verified (ledger counter)</span>
          <span class="result-value muted">${simulatedTotalVerified}</span>
        </div>
        <div class="result-row">
          <span class="result-label">Shielded private data (never disclosed)</span>
          <span class="result-value muted">marks, studentId, salt</span>
        </div>
      </div>
    `;
  });
});
