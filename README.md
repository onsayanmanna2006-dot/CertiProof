# CertiProof

[![CI](https://github.com/onsayanmanna2006-dot/CertiProof/actions/workflows/ci.yml/badge.svg)](https://github.com/onsayanmanna2006-dot/CertiProof/actions/workflows/ci.yml)

> **Privacy-Preserving Student Certificate Verification Using Zero-Knowledge Proofs on the Midnight Network**

Built with Midnight's **Compact language** (toolchain `0.30.0`, language `0.22.0`, ledger `8.0.2`, compact-runtime `0.15.0`), zero-knowledge circuits, private witnesses, and controlled disclosure (`disclose()`).

> **Why toolchain 0.30.0?** This is the newest Compact toolchain whose generated `compact-runtime` version (`0.15.0`) has a matching, non-beta `midnight-js` deployment SDK release (`@midnight-ntwrk/midnight-js@4.0.4`) — the same combination used by Midnight's own actively-maintained [`example-counter`](https://github.com/midnightntwrk/example-counter) reference app. The newest toolchain (`0.34.0`) targets `compact-runtime@0.19.0`, which currently only has a pre-release (`5.0.0-beta.x`) JS SDK — riskier for a real deployment.

---

## Project Overview

In traditional educational credential systems, verifying an academic prerequisite (such as proving a student achieved marks $\ge 60$ in a course) requires sharing an entire transcript. This unnecessarily reveals confidential student records, exact scores, and personal identifiers to third-party employers, recruiters, or background checking services.

**CertiProof** solves this by using zero-knowledge proofs. A student generates a cryptographic proof locally on their device using a private witness. The Compact smart contract evaluates the zero-knowledge constraint (`marks >= 60`) and commits only a unique certificate digest to the public Midnight ledger. Relying parties can verify qualification without ever learning the student's exact numerical score or private identity.

---

## Product Idea

> "ZK-Certificate-Verifier (CertiProof) is a privacy-preserving student credential verification system. It allows students to prove that they satisfy a requirement, such as achieving a minimum score in a course, without publicly revealing their exact marks or other private certificate information. The project uses Midnight's Compact language, zero-knowledge circuits, private witnesses, and controlled disclosure through `disclose()` to demonstrate how educational credentials can be verified while protecting student privacy."

---

## Why Zero-Knowledge Proofs?

1. **Confidentiality & Compliance**: Protects sensitive academic records in compliance with FERPA, GDPR, and student privacy laws.
2. **Data Minimization**: Third parties only receive verifiable proof that the student met the criteria, rather than full academic histories.
3. **Tamper-Proof Integrity**: Cryptographic certificate commitments (`persistentHash`) anchored on the Midnight ledger prevent credential fabrication.
4. **Anti-Bias Protection**: Prevents employers from unfairly ranking or filtering candidates when only minimum qualification is required.

---

## How CertiProof Works

```text
Student enters private certificate information (ID, Marks, Salt)
                             ↓
             Private witness is created off-chain
                             ↓
             ZK circuit checks constraint: marks >= 60
                             ↓
             Zero-Knowledge Proof is generated
                             ↓
         Only necessary information is disclosed:
          • disclose(certHash)
          • disclose(true)
                             ↓
   Public verification state is updated on Midnight ledger:
    • verifiedCertificates[certHash] = true
    • totalVerified += 1
                             ↓
  Verifier / Employer confirms the credential on blockchain!
```

---

## Public State vs Private Witness

| Information | Public/Private | Reason |
| :--- | :--- | :--- |
| **Certificate verification status** | **Public** | Verifiers and relying parties need to confirm that the credential was verified. |
| **Certificate hash (`persistentHash`)** | **Public** | Uniquely identifies the credential on-chain without revealing private details. |
| **Total verified counter (`Counter`)** | **Public** | Public aggregate count of total credentials verified. |
| **Exact student marks** | **Private** | Personal educational information; qualifying ($\ge 60$) does not require revealing the score. |
| **Student ID** | **Private** | Personal identifier; kept confidential to prevent cross-service identity correlation. |
| **Certificate salt / entropy** | **Private** | High-entropy blinding factor preventing brute-force dictionary pre-image attacks. |

Zero-knowledge verification allows the system to verify a statement without unnecessarily revealing the underlying private information.

---

## Privacy Model

CertiProof's entire value proposition rests on what a third-party observer — anyone reading the public Midnight ledger, an indexer, a block explorer, or an employer given only the certificate hash — can and cannot learn.

### What an observer CAN learn

* **That a specific credential passed verification.** Given a `certHash`, the observer can query `verifiedCertificates[certHash]` and see `true`.
* **That the credential meets the qualification bar.** Because `assert(cert.marks >= 60, ...)` runs inside the ZK circuit before any disclosure, a `true` entry is cryptographic proof the underlying (hidden) marks satisfied `marks >= 60` — no partial or approximate score leaks.
* **The total number of credentials verified system-wide**, via the public `totalVerified` counter.
* **The existence and timing of the verification transaction** (transaction ID, block, gas/fee), since Midnight's ledger structure, like other blockchains, exposes transaction metadata.

### What an observer CANNOT learn

* **The student's exact marks.** `cert.marks` never leaves the private witness; it is consumed only inside the circuit's constraint check and is never passed to `disclose()`.
* **The student's identity.** `cert.studentId` stays private — the public ledger only ever sees the opaque `certHash`, which cannot be reversed to recover the student ID without already knowing the private salt.
* **The specific subject/course.** `cert.subjectId` is likewise private and never disclosed.
* **Whether a *failing* attempt was ever made.** A circuit call that fails the `assert` never reaches the disclosure step, so there is no on-chain record correlating a student with an unqualified attempt.
* **A pre-image of `certHash` via brute force.** `cert.salt` is a high-entropy blinding factor mixed into `persistentHash<StudentCertificate>(cert)`, so an observer cannot dictionary-attack plausible `(studentId, subjectId, marks)` triples to match a given public hash.

In short: the chain proves *"someone met the bar"* and gives that claim a stable public identifier, without ever revealing *who* or *by how much*.

---

## How disclose() Is Used

In Compact, privacy is strictly guarded by default. Values originating from private witnesses are treated as private. Attempting to write witness-derived values to the public ledger without explicit approval triggers a compile-time exception. `disclose()` signals intentional, audited release of data to public ledger state.

### Implementation in `src/CertiProof.compact`:

```compact
// 1. ZK Circuit enforces qualification constraint
assert(cert.marks >= 60, "Student marks must be at least 60 to pass verification");

// 2. Derive cryptographic certificate hash
const certHash = persistentHash<StudentCertificate>(cert);

// 3. Controlled disclosure to the public ledger:
verifiedCertificates.insert(disclose(certHash), disclose(true));
totalVerified.increment(1);

return disclose(certHash);
```

### Key Rationale:
* **Why is `certHash` disclosed?**  
  Third parties need an immutable, public identifier to verify that this specific credential exists and passed verification.
* **Why is `true` disclosed?**  
  The ledger mapping `verifiedCertificates` records the boolean verification flag.
* **What information remains private?**  
  `cert.marks`, `cert.studentId`, `cert.subjectId`, and `cert.salt` are **never** wrapped in `disclose()`. They stay strictly in client-side witness evaluation.
* **Why would disclosing private marks be undesirable?**  
  Exposing exact marks destroys student privacy and violates data protection standards when only binary qualification is required.

---

## Project Structure

```text
CertiProof/
├── src/
│   ├── CertiProof.compact               # Primary Compact smart contract
│   └── CertificateVerifier.compact      # Alias contract definition
├── managed/                             # Real compiler-generated artifacts
│   ├── zkir/                            # Zero-Knowledge Intermediate Representation
│   │   ├── verifyCertificate.zkir       # Textual ZKIR circuit definition
│   │   └── verifyCertificate.bzkir      # Binary ZKIR bytecode
│   ├── keys/                            # Proving and verification keys
│   │   ├── verifyCertificate.prover     # Client proving key
│   │   └── verifyCertificate.verifier   # On-chain verifier key
│   ├── contract/                        # Auto-generated TypeScript bindings
│   │   ├── index.d.ts                   # Contract interfaces & types
│   │   ├── index.js                     # Contract logic module
│   │   └── index.js.map                 # Source map
│   └── compiler/                        # Build manifests & metadata
│       └── contract-info.json
├── tests/
│   ├── CertiProof.test.ts               # Primary Vitest unit & ZK circuit test suite
│   └── CertificateVerifier.test.ts      # Verifier test suite
├── scripts/
│   ├── config.ts                        # Network configuration (Preview / Preprod)
│   └── deploy.ts                        # Real Midnight SDK deployment script
├── web/                                 # Real browser dApp (Vite)
│   ├── index.html                       # Verification interface
│   ├── styles.css                       # Dark-mode styles
│   ├── public/managed/                  # zk keys/zkir served statically for the browser
│   └── src/
│       ├── main.ts                      # DOM wiring + submit flow
│       ├── wallet.ts                    # Lace connect/disconnect (DApp Connector API)
│       ├── contract.ts                  # Providers + findDeployedContract + callTx
│       ├── browserZkConfigProvider.ts   # Fetch-based ZK asset loader (browser analogue of NodeZkConfigProvider)
│       └── inMemoryPrivateStateProvider.ts
├── screenshots/                         # Verification screenshot guidelines
│   └── README.md
├── package.json                         # Node.js project manifest & scripts
├── package-lock.json                    # Lockfile with resolved dependencies
├── tsconfig.json                        # TypeScript configuration
├── .gitignore                           # Excludes .env and secrets
└── .env.example                         # Environment configuration template
```

---

## Toolchain & Requirements

* **Node.js**: `v20+` or `v22+` or `v24+` (`v24.21.0` tested)
* **npm**: `v10+` or `v11+` (`v11.19.0` tested)
* **Compact Compiler**: `compact` CLI, pinned to toolchain `0.30.0` (Language version `0.22.0`, Ledger version `8.0.2`, Compact Runtime `0.15.0`)
* **Docker**: required to run the local ZK proof server for deployment

Install the Compact CLI and select the matching toolchain:
```bash
compact update 0.30.0
compact compile --version        # 0.30.0
compact compile --runtime-version # 0.15.0
```

---

## Quickstart Commands

### 1. Install Dependencies
```bash
npm install
```

### 2. Compile the Compact Contract
```bash
npm run compile
```
*Compiles `src/CertiProof.compact` and generates circuits, proving keys, and contract bindings in `managed/`.*

### 3. Run Automated Tests
```bash
npm test
```
*Executes all Vitest unit and circuit tests against `@midnight-ntwrk/compact-runtime`.*

### 4. Run the Real Browser dApp
```bash
npm run dev:web
```
Open the printed URL in a browser with the **Lace wallet extension** installed, connected to
**Preview**, and funded (see faucet link below). Proving happens inside Lace itself
(`connectedAPI.getProvingProvider`) — no local proof server needed for the web app; the frontend
calls the real deployed circuit, not a simulation.

```bash
npm run build:web   # production build to dist/, used by the GitHub Pages workflow
```

---

## Test Suite Coverage

The test suite covers:
1. **Passing Verification**: Students with marks $\ge 60$ pass verification and produce a valid 32-byte hash.
2. **Failing Verification**: Students with marks $< 60$ trigger circuit assertion failure (`assert(cert.marks >= 60)`).
3. **Public Ledger State Updates**: Asserts that `totalVerified` increments and `verifiedCertificates` records the hash.
4. **Privacy Non-Disclosure**: Confirms that student marks, student ID, and salt are **never** present in public ledger state. This isn't only asserted in the test suite — the web dApp (`web/`) demonstrates it live: after a real submitted transaction, it re-queries the Preview indexer for the contract's public ledger and renders an "On-chain privacy proof" panel that lists the ledger's actual fields (`totalVerified`, `verifiedCertificates`) and explicitly searches the serialized ledger for the marks/studentId/salt you entered, showing they're not found.
5. **Deterministic Hashing**: Proves identical credentials yield deterministic `persistentHash` commitments.
6. **Boundary Conditions**: Tests boundary values (marks = 59 fails; marks = 60 passes).

---

## Deployment to Midnight Preview/Preprod

`scripts/deploy.ts` performs a **real** deployment using Midnight's official SDK generation
(`@midnight-ntwrk/midnight-js@4.0.4` + `wallet-sdk-facade`/`wallet-sdk-hd`/`wallet-sdk-dust-wallet`),
the same stack used by Midnight's own `example-counter` reference app. It derives an HD wallet from
a seed, waits for it to sync and hold funds, registers NIGHT for DUST (fee token) generation,
generates a real deployment proof via the local proof server, and submits the transaction.

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Generate a 32-byte hex wallet seed and put it in `.env` as `WALLET_SEED_HEX`:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
3. Run `npm run deploy` once to print the wallet's unshielded address, then fund it from the faucet:
   * Preview Faucet: [https://faucet.preview.midnight.network](https://faucet.preview.midnight.network)
   * Preprod Faucet: [https://faucet.preprod.midnight.network](https://faucet.preprod.midnight.network)
4. Start the local proof server — needed for `npm run deploy` specifically (a script the developer runs themselves against their own data); required even for public testnets since it sees witness values in the clear locally. Not needed for the web app (`web/`), which proves inside Lace instead — see "Run the Real Browser dApp" above:
   ```bash
   docker run -p 6300:6300 midnightnetwork/proof-server
   ```
5. Re-run deployment once funded (defaults to Preview; set `MIDNIGHT_NETWORK=preprod` to target Preprod):
   ```bash
   MIDNIGHT_NETWORK=preprod npm run deploy
   ```
   The script waits for sync, waits for DUST generation, deploys the contract, calls
   `verifyCertificate` once against it, and prints the on-chain contract address and transaction ID.

---

## Contract Address

**Deployed on Midnight Preview** (this is what the live demo and web dApp target):

* **Contract address:** `b8cc902ddf2ce0a12911ce303840c2b3b2d2bf596ddca4dc0357315db856b469`
* **Transaction ID:** `00ee7f921068aefefe44573aae98362c8d9332996172db63f0053aac44494b3934`

Deployed via `npm run deploy` using the real Midnight SDK deployment flow described above.

### Preprod

**Deployed:**

* **Contract address:** `d040bdc193d2cfcba02e94765c64eaddb16077cf072b556c8a4c440621956752`
* **Transaction ID:** `00b70dd5bcc0475c8721ea8dd5461b5e39451bac6f7bffbc70b6473fc59bc2e332`

Verifiable on-chain via the Preprod indexer/explorer.

**How it got deployed — a standalone Node wallet never worked for this:**

A headless Node wallet (`scripts/deploy.ts`, the same approach used for the Preview deployment
above) hit **unbounded memory growth during wallet sync** against Preprod's chain history, every
time it was tried:
* Locally (8GB RAM): crashed at ~2GB, then ~3.3GB, then ~5GB across three attempts with
  increasing heap limits — never converging, just crashing higher each time.
* On a GitHub Actions runner (16GB RAM, via `.github/workflows/deploy-preprod.yml`, which runs
  the same `npm run deploy` flow with a `proof-server` service container standing in for the
  local Docker proof server): ran for **33 minutes**, grew to **~10GB**, and still hadn't finished
  syncing before hitting the same OOM.

Growing the heap only delayed the crash, never fixed it — confirming this is a real bug in this
SDK generation's Preprod wallet sync (`wallet-sdk-shielded`/`wallet-sdk-dust-wallet`), not a
resource shortfall. `.github/workflows/deploy-preprod.yml` is left in the repo as-is (still useful
for Preview-scale networks) but isn't how the Preprod deployment above actually happened.

**What worked instead:** `web/deploy-preprod.html` + `web/src/deployPreprod.ts` — a small dev-only
page that deploys by proving and submitting entirely inside a connected browser wallet, the same
technique `web/src/contract.ts` already uses for circuit calls. This sidesteps the problem
entirely: the wallet extension syncs its own state to show a balance anyway, so there's no separate
Node wallet sync to OOM. Not part of the public demo (not linked from `index.html`, not built for
GitHub Pages — only reachable via `npm run dev:web`).

Getting this working also surfaced a **separate, unrelated bug**: Lace wasn't generating DUST
(Midnight's fee token) from held NIGHT on Preprod at all — confirmed against multiple independent
reports of the same issue, DUST balance stayed at a genuine `0` cap (not just `0` balance) after
holding funded NIGHT for 3+ days. Switching to the **1AM wallet** (also DApp-Connector-compatible,
so `deploy-preprod.html` needed no code changes) worked immediately — its explicit "Generate DUST"
registration step is functionally the same as `scripts/deploy.ts`'s
`registerNightUtxosForDustGeneration` call, just exposed in the UI where Lace didn't expose an
equivalent for Preprod.

---

## Live Demo

`https://onsayanmanna2006-dot.github.io/CertiProof/` — deployed automatically on every push to `main`
via `.github/workflows/deploy-pages.yml`, which builds `web/` with Vite and publishes `dist/` to
GitHub Pages. Requires the Lace wallet extension (Preview, funded) to actually submit a transaction —
proving happens inside Lace, no local proof server needed; without a connected wallet the page still
loads and explains what's needed.

---

## Demo Video

[https://youtu.be/_aA2fj_iEwo](https://youtu.be/_aA2fj_iEwo) — a screen recording of: connecting
Lace, submitting a passing certificate (Lace approval prompts, real transaction ID), and the
on-chain privacy proof panel.

---

## Screenshots

Placeholders for capture outputs (see `screenshots/README.md`):

### Successful Compilation
![Successful Compact Compilation](screenshots/compile-success.png)

### Contract Deployment
![Contract Deployment](screenshots/deployment.png)

### Test Suite (3+ Tests Passing)
![Test Suite Output](screenshots/test-success.png)

*Capture with `npm test`, which currently reports 12/12 tests passing across `tests/CertiProof.test.ts` and `tests/CertificateVerifier.test.ts`.*

---

## License

Apache-2.0
