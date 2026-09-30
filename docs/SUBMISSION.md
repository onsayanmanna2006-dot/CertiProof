# Submission Checklist

Everything a reviewer needs, in one place.

| Requirement | Where | Status |
|---|---|---|
| Public GitHub repository with updated documentation | https://github.com/onsayanmanna2006-dot/CertiProof ([README](../README.md), [tester guide](TRY-IT.md)) | ✅ |
| Live demo link | https://onsayanmanna2006-dot.github.io/CertiProof/ | ✅ |
| Same MVP from Level 4, extended | Level 5: employer **Check a certificate**, **Share feedback**, on-chain privacy proof. Round 1 feedback: **progress counter** and clearer **connection errors**. See [README → What the live demo does](../README.md#preprod-users--feedback). | ✅ |
| Preprod users with wallet addresses, verifiable on-chain | [USERS.md](../USERS.md), where each row has a transaction ID checked on the Preprod indexer by `npm run users` | 🟡 44 so far (target 70) |
| Feedback loop documented | [FEEDBACK.md](../FEEDBACK.md): how the loop works, Round 0 and Round 1, and each change linked to its commit | ✅ (updated as responses arrive) |
| Demo video showing full MVP functionality | Script: [DEMO-VIDEO.md](DEMO-VIDEO.md) | 🟡 to be recorded |
| Minimum 30 meaningful commits | [Commit history](https://github.com/onsayanmanna2006-dot/CertiProof/commits/main) | ✅ |

**Wallet note:** the demo and testers use the **1AM wallet** because Lace doesn't generate DUST on Preprod (NIGHT arrives from the faucet, DUST stays 0). The dApp uses the standard Midnight DApp Connector API and works with any compatible wallet.
