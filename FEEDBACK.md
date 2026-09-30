# CertiProof Feedback Loop

How CertiProof collects feedback from real Preprod testers, turns it into changes, and records what changed.

- **Feedback form:** https://docs.google.com/forms/d/e/1FAIpQLScYbdkijqY4tb85IpbsIPvle3FNAEOCkibERx-PNFdmMWp2CA/viewform
- **Verified tester list:** [USERS.md](USERS.md)
- **Try it yourself:** [docs/TRY-IT.md](docs/TRY-IT.md)

---

## How the loop works

```text
 1. Tester verifies a certificate on Preprod (live demo, 1AM wallet)
                         │
                         ▼
 2. dApp shows their wallet address + transaction ID and a
    "Share feedback" button that pre-fills both into the form
                         │
                         ▼
 3. Responses are exported to users/users.csv (kept private, gitignored)
                         │
          ┌──────────────┴──────────────┐
          ▼                             ▼
 4a. `npm run users` checks every     4b. Feedback is grouped into themes
     transaction on-chain and             (bug / confusing / feature idea)
     regenerates USERS.md                 and each theme gets a decision
                                          (fix now / later / won't do)
                                        │
                                        ▼
                         5. Fixes ship as normal commits; each one is
                            logged below with the feedback that caused it
                                        │
                                        ▼
                         6. Live demo redeploys on push (GitHub Pages),
                            so the next tester sees the change
```

**What the form asks** (every question is optional except the first two, which the dApp fills in):

1. Your Preprod wallet address *(pre-filled)*
2. Transaction ID *(pre-filled)*
3. How easy was it to verify a certificate? (1 = very hard, 5 = very easy)
4. Did anything confuse you or go wrong?
5. Would you use something like this for real certificates? (Yes / Maybe / No)
6. What one thing should we add or change?

The form doesn't ask for names or emails. Raw responses stay in `users/users.csv`, which is gitignored; only wallet addresses and transaction IDs are published, in `USERS.md`.

---

## Iteration log

Each entry: what we heard or saw → what we changed → where.

### Round 0: internal testing on Preprod (2026-09-28)

Found while testing the Level 4 MVP end to end on Preprod, before outside testers.

| # | What we saw | What we changed | Commit |
|---|---|---|---|
| 1 | Lace can't pay fees on Preprod: it doesn't generate DUST there, so every transaction failed with insufficient funds. | Made the dApp wallet-agnostic (any Midnight DApp-Connector wallet), recommended the 1AM wallet, and explained why in the README. | `0acd0b2`, `87f1983` |
| 2 | 1AM's "Approve" button stays disabled while the wallet is still syncing, and the first sync can time out ("Wallet init timed out after 60s"). | Added a "wait until 1AM shows synced" step and a troubleshooting table to the tester guide. | `2562cff` |
| 3 | Every tester using the "Passing sample" button produced the **same** certificate hash, so on-chain it looked like one certificate verified repeatedly. | The sample now uses a fresh random salt each run, so every tester commits their own distinct certificate hash. | `2562cff` |
| 4 | An employer had no way to check a certificate without a wallet or the command line, which is half of the product's promise. | Added **Check a certificate**: paste a hash and it reads the public Preprod ledger directly, with no wallet needed. | `2562cff` |
| 5 | Testers had to copy their wallet address and transaction ID by hand to report back. | After verifying, the dApp shows the wallet address and a **Share feedback** button that pre-fills both into the form. | `2562cff` |

### Round 1: outside testers (2026-09-29 → 2026-09-30)

Summary of the real form responses exported on 2026-09-30. Every tester's transaction was checked on-chain by `npm run users` (see [USERS.md](USERS.md)).

| Metric | Value |
|---|---|
| Verified testers (see USERS.md) | **51 / 50 ✅** (all 51 responses verified on-chain, 0 excluded) |
| Average ease-of-use score (1–5) | **4.54** (50 answered: 33 × 5, 12 × 4, 4 × 3, 1 × 2) |
| "Would use it for real" (Yes / Maybe / No) | 28 / 18 / 5 |
| Reported something confusing or broken | 0 (every answer was "no" / "NA") |

| Theme | How many testers | Example (quoted) | Decision | Commit |
|---|---|---|---|---|
| Couldn't switch 1AM to Preprod | 1 | 1AM popup: "Gateway sign-in failed" (new wallet still on MAIN, still "INITIALIZING…") | Wallet-side issue, not CertiProof. Tester guide now says to wait for 1AM to finish initializing before switching to Preprod, plus a troubleshooting row. | `aa33019` |
| Verification feels slow | 1 (ease 3) | "it's take some time" | **Fixed now.** Proof generation happens on the tester's device and can't be skipped, so the dApp now shows a live seconds counter and explains what is happening and that it can take a minute or two. | `2ad8e82` |
| Connection problems | 1 (ease 4) | "Try to improve connectivity" | **Fixed now.** The dApp waits up to 3 s for the wallet extension to load instead of failing at once, and a wallet/network error now says in plain words what to check (internet, wallet unlocked, Preprod, synced) and to retry. | `2ad8e82` |
| Site didn't work properly | 1 (ease 2) | "website not work properly" | **Can't reproduce yet:** no details given, and this tester's transaction did verify on-chain. The clearer error message above should make the next report specific. Ask for a screenshot next round. | — |
| Positive / no change needed | 19 | "ui ux is good and website is usefull", "Nothing, this website is perfect." | Nothing to change. | — |
| Not sure they'd use it for real | 23 (18 Maybe, 5 No) | none gave a reason | **Later:** add a question to the form asking *why not*, so Round 2 can act on it. | — |

**What we learned:** almost every tester could verify without help (45 of 50 scored 4 or 5). The weak points are **waiting time** and **connection reliability**, not the ZK flow itself, so Round 1's fixes target exactly those two things.
