# Demo Video Script (about 4 minutes)

A shot-by-shot plan for recording the full-MVP demo. Record the screen with QuickTime (File → New Screen Recording) or OBS, with your voice.

**Before you press record**
- 1AM is open, on **PREPROD**, fully synced, and has **DUST above 0**.
- Open these tabs: the [live demo](https://onsayanmanna2006-dot.github.io/CertiProof/), [USERS.md](../USERS.md) and [FEEDBACK.md](../FEEDBACK.md) on GitHub.
- Close other tabs and notifications.

| # | Time | Show on screen | What to say |
|---|---|---|---|
| 1 | 0:00–0:20 | Live demo home page | "This is CertiProof. A student proves they scored at least 60 without showing their marks, using a zero-knowledge proof on the Midnight Preprod network." |
| 2 | 0:20–0:40 | Click **Connect Wallet**, approve in 1AM | "I connect my Midnight wallet. I use 1AM because Lace doesn't generate DUST on Preprod yet. The app works with any Midnight wallet." |
| 3 | 0:40–1:40 | Enter marks **79**, click **Generate ZK Proof**, approve in 1AM, let the **seconds counter** run | "The proof is made on my own computer. Testers said it felt slow, so we added this live counter that explains what's happening." |
| 4 | 1:40–2:10 | Result: **Verified ✓**, transaction ID, wallet address, privacy proof | "It's verified on-chain. Here is the transaction ID. And here the app re-reads the public ledger: my marks, ID and salt are not on the blockchain. Only the certificate hash is." |
| 5 | 2:10–2:30 | Enter marks **59**, click **Generate ZK Proof** | "59 is one mark below 60, so the circuit rejects it and nothing goes on-chain." |
| 6 | 2:30–2:55 | Click **Check this certificate as an employer** (or paste the hash into **Check a certificate**) | "An employer can check a certificate with no wallet at all. The page reads the Preprod ledger directly." |
| 7 | 2:55–3:10 | Click **Share feedback**: the form opens with wallet and tx ID pre-filled | "Every tester can send feedback in one click. Their wallet and transaction are filled in automatically." |
| 8 | 3:10–3:40 | GitHub: **USERS.md**, then copy one transaction ID and show the indexer check from USERS.md (optional) | "These are our real Preprod testers. Every row was checked on-chain by our script, and anyone can verify a transaction ID." |
| 9 | 3:40–4:00 | GitHub: **FEEDBACK.md** Round 1 | "Here is our feedback loop: what testers said, the average score, and the changes we shipped because of it. Thanks for watching!" |

**After recording:** upload to YouTube as **Unlisted**, then add the link to the README. Recorded: https://youtu.be/CWl-8QiWuvI
