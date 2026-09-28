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

### Round 1: outside testers

_Filled in as responses arrive. The summary below is updated from the real form responses:_

| Metric | Value |
|---|---|
| Verified testers (see USERS.md) | 0 / 50 |
| Average ease-of-use score | – |
| "Would use it for real" (Yes / Maybe / No) | – |

| Theme | How many testers | Example (quoted) | Decision | Commit |
|---|---|---|---|---|
| | | | | |
