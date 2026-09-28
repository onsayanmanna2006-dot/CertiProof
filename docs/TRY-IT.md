# Try CertiProof in about 5 minutes

CertiProof lets a student prove they passed an exam (marks 60 or more) **without showing their marks**. It uses zero-knowledge proofs on the Midnight blockchain's test network, **Preprod**. Everything is test money, so nothing costs real money.

**Live app:** https://onsayanmanna2006-dot.github.io/CertiProof/

---

## What you need

- A computer with **Google Chrome** (the wallet is a Chrome extension; phones won't work)
- About 5 minutes

## Steps

**1. Install the 1AM wallet**
Search for **"1AM wallet"** in the Chrome Web Store and add it to Chrome. Create a new wallet and **write down the recovery phrase** somewhere safe. Never share it with anyone, including us.

**2. Switch 1AM to Preprod**
In the 1AM wallet settings, choose the **Preprod** network.

**3. Wait until the wallet has synced**
Open the 1AM wallet tab and leave it open until it stops showing "Initializing…" or "syncing". The first time can take a few minutes. If you skip this, the **Approve** button stays grey later.

**4. Open CertiProof and connect**
Go to the live app (link above) and click **Connect Wallet**, then approve the connection in 1AM.

**5. Verify a certificate**
Click **Passing sample · score 78** (or type your own made-up details; **don't use your real student ID**). Then approve the transaction in 1AM. 1AM normally pays the fee for you ("sponsored by ProofStation").

**6. See the result**
You'll see **Verified ✓**, a **Transaction ID**, and your **wallet address**. Scroll down to the privacy proof: your marks, ID and salt are *not* on the blockchain.

**7. Send feedback (1 minute)**
Click **Share feedback**. Your wallet address and transaction ID are already filled in; just answer the short questions and submit. That's what counts you as a CertiProof tester. (If the button doesn't appear, use the form directly: https://docs.google.com/forms/d/e/1FAIpQLScYbdkijqY4tb85IpbsIPvle3FNAEOCkibERx-PNFdmMWp2CA/viewform and paste your wallet address and transaction ID.)

**8. (Optional) Try the employer side**
Click **Check this certificate as an employer**, or paste any certificate hash into **Check a certificate** at the bottom of the page. It confirms the certificate on-chain without a wallet.

---

## If something goes wrong

| Problem | Fix |
|---|---|
| "Could not find a Midnight wallet" | Make sure 1AM is installed and enabled, then reload the page. |
| Approve button is grey / "Wallet is still syncing" | Wait for 1AM to finish syncing, then click **Generate ZK Proof** again. |
| "Wallet init timed out" in 1AM | Reload the 1AM tab. If it keeps happening, turn the extension off and on at `chrome://extensions`. |
| "Insufficient DUST" or asks for funds | Get free test tokens at https://faucet.preprod.midnight.network and register them for DUST generation in 1AM, then try again. |
| Using Lace instead of 1AM | Lace doesn't generate DUST on Preprod yet, so please use 1AM. |

**What's shared:** your wallet address and transaction ID are published in the project's tester list ([USERS.md](../USERS.md)). Both are public on the test network anyway. Nothing else about you is published.
