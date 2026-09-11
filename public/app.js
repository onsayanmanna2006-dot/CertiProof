// Client-side Interactive Simulation of ZK-Certificate-Verifier

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

  // Flow steps
  const stepWitness = document.getElementById('step-witness');
  const stepCircuit = document.getElementById('step-circuit');
  const stepDisclose = document.getElementById('step-disclose');
  const stepLedger = document.getElementById('step-ledger');

  function setStepActive(step) {
    [stepWitness, stepCircuit, stepDisclose, stepLedger].forEach(s => s.classList.remove('active'));
    if (step) step.classList.add('active');
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

    // Visual step 1: Witness
    setStepActive(stepWitness);
    statusPill.className = 'status-pill idle';
    statusPill.textContent = 'Generating Witness...';

    // Visual step 2: ZK Circuit Check
    await new Promise(r => setTimeout(r, 200));
    setStepActive(stepCircuit);

    const isPassing = marks >= 60;

    if (!isPassing) {
      statusPill.className = 'status-pill fail';
      statusPill.textContent = 'VERIFICATION FAILED';

      resultContainer.className = 'result-container';
      resultContainer.innerHTML = `
        <div class="result-box">
          <div class="result-header">
            <span class="badge fail">FAIL: MARKS &lt; 60</span>
            <small style="color: var(--text-muted)">Circuit Assertion Failed</small>
          </div>
          <p style="color: #fca5a5; font-size: 0.9rem; margin-bottom: 0.8rem;">
            ZK Circuit Constraint Violated: <code>assert(cert.marks >= 60)</code> rejected.
          </p>
          <div class="data-row">
            <span class="data-label">Circuit Error Message</span>
            <div class="data-val">"Student marks must be at least 60 to pass verification"</div>
          </div>
          <div class="data-row">
            <span class="data-label">Public Ledger Impact</span>
            <div class="data-val">No transaction committed. Ledger remains unchanged.</div>
          </div>
        </div>
      `;
      return;
    }

    // Visual step 3: Disclose & Ledger
    await new Promise(r => setTimeout(r, 200));
    setStepActive(stepDisclose);

    const payload = `${studentId}:${subjectId}:${marks}:${salt}`;
    const certHash = await sha256(payload);

    await new Promise(r => setTimeout(r, 200));
    setStepActive(stepLedger);

    simulatedTotalVerified += 1;
    statusPill.className = 'status-pill pass';
    statusPill.textContent = 'VERIFICATION PASSED';

    resultContainer.className = 'result-container';
    resultContainer.innerHTML = `
      <div class="result-box">
        <div class="result-header">
          <span class="badge pass">VERIFIED (marks &ge; 60)</span>
          <small style="color: var(--accent-cyan)">Proof Validated</small>
        </div>
        <div class="data-row">
          <span class="data-label">On-Chain Public Certificate Hash (disclose())</span>
          <div class="data-val">0x${certHash}</div>
        </div>
        <div class="data-row">
          <span class="data-label">Public Verification Status</span>
          <div class="data-val" style="color: var(--accent-green)">true (recorded in verifiedCertificates map)</div>
        </div>
        <div class="data-row">
          <span class="data-label">Total Verified Ledger Counter</span>
          <div class="data-val">${simulatedTotalVerified}</div>
        </div>
        <div class="data-row">
          <span class="data-label">Shielded Private Data (Never Disclosed)</span>
          <div class="data-val" style="color: #c084fc">marks = [SHIELDED], studentId = [SHIELDED], salt = [SHIELDED]</div>
        </div>
      </div>
    `;
  });
});
