# CertiProof Preprod Users

**0 / 50** unique testers verified on Midnight Preprod.

Each row is a distinct wallet whose transaction is a successful `verifyCertificate` call on the CertiProof contract `d040bdc193d2cfcba02e94765c64eaddb16077cf072b556c8a4c440621956752`, checked against the public Preprod indexer by `npm run users` (`scripts/verify-users.ts`).

**How to verify a row yourself:** look up the transaction ID on the Preprod indexer:

```bash
curl -s https://indexer.preprod.midnight.network/api/v3/graphql -H 'content-type: application/json' \
  -d '{"query":"{ transactions(offset: {identifier: \"<TRANSACTION_ID>\"}) { hash block { height timestamp } contractActions { address ... on ContractCall { entryPoint } } } }"}'
```

It should show `address: d040bdc193d2cfcba02e94765c64eaddb16077cf072b556c8a4c440621956752` and `entryPoint: verifyCertificate`.

> The wallet address is reported by the tester's own wallet through the dApp (and entered in the feedback form); it does not appear inside a `verifyCertificate` transaction, since Midnight pays fees in shielded DUST. The transaction ID is the independently checkable on-chain proof.

| # | Wallet address (Preprod) | Transaction ID | Block | Time |
|---|---|---|---|---|
