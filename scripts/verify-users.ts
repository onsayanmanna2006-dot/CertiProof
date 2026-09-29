/**
 * Builds USERS.md — the list of real Preprod testers — from the feedback
 * form's responses, checking every submitted transaction on-chain.
 *
 * Input: users/users.csv, the Google Form responses exported as CSV
 * (Sheets → File → Download → CSV). The wallet-address and transaction-ID
 * columns are found by header name ("wallet" / "transaction").
 *
 * A row counts as a verified user only if its transaction ID resolves on the
 * public Preprod indexer to a SUCCESSful `verifyCertificate` call on the
 * CertiProof contract. Duplicate wallets and reused transaction IDs are
 * reported but counted once, so the total can't be inflated by one person
 * submitting the form repeatedly.
 *
 * Why the transaction, not the address, is the on-chain proof: the wallet
 * address itself never appears in a verifyCertificate transaction (fees are
 * paid in shielded DUST, often sponsored by the wallet), so the address is
 * what the tester's wallet reported to the dApp, and the transaction ID is
 * what anyone can independently check.
 *
 *   npm run users
 */
import fs from 'node:fs';
import path from 'node:path';

const CONTRACT_ADDRESS = 'd040bdc193d2cfcba02e94765c64eaddb16077cf072b556c8a4c440621956752';
const INDEXER_URI = 'https://indexer.preprod.midnight.network/api/v3/graphql';
const ROOT = path.resolve(import.meta.dirname, '..');
const CSV_PATH = path.join(ROOT, 'users', 'users.csv');
const OUT_PATH = path.join(ROOT, 'USERS.md');
const TARGET_USERS = 70;

interface OnChainTx {
  hash: string;
  timestamp: number;
  height: number;
}

type RowStatus = 'verified' | 'duplicate-wallet' | 'duplicate-tx' | 'not-found' | 'wrong-contract' | 'failed' | 'invalid';

interface Row {
  line: number;
  wallet: string;
  txId: string;
  status: RowStatus;
  tx?: OnChainTx;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      if (row.some((f) => f.trim() !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  row.push(field);
  if (row.some((f) => f.trim() !== '')) rows.push(row);
  return rows;
}

function findColumn(header: string[], keyword: string): number {
  const index = header.findIndex((h) => h.toLowerCase().includes(keyword));
  if (index === -1) {
    throw new Error(`users.csv has no column whose header contains "${keyword}". Headers: ${header.join(' | ')}`);
  }
  return index;
}

async function fetchTx(txId: string): Promise<{ tx: OnChainTx; status: RowStatus } | { status: RowStatus }> {
  const query = `{ transactions(offset: {identifier: "${txId}"}) {
    hash block { height timestamp }
    ... on RegularTransaction { transactionResult { status } }
    contractActions { address ... on ContractCall { entryPoint } }
  } }`;
  const response = await fetch(INDEXER_URI, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!response.ok) throw new Error(`Indexer returned HTTP ${response.status} for ${txId}`);
  const body = (await response.json()) as any;
  const found = body.data?.transactions?.[0];
  if (!found) return { status: 'not-found' };

  const tx: OnChainTx = { hash: found.hash, height: found.block.height, timestamp: found.block.timestamp };
  const isOurCall = (found.contractActions ?? []).some(
    (a: any) => a.address === CONTRACT_ADDRESS && a.entryPoint === 'verifyCertificate',
  );
  if (!isOurCall) return { tx, status: 'wrong-contract' };
  if (found.transactionResult?.status !== 'SUCCESS') return { tx, status: 'failed' };
  return { tx, status: 'verified' };
}

const STATUS_LABEL: Record<RowStatus, string> = {
  verified: '✅ verified',
  'duplicate-wallet': '⚠️ same wallet as an earlier row',
  'duplicate-tx': '⚠️ transaction already listed',
  'not-found': '❌ transaction not found on Preprod',
  'wrong-contract': '❌ not a CertiProof verifyCertificate call',
  failed: '❌ transaction did not succeed',
  invalid: '❌ missing or malformed wallet / transaction ID',
};

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    throw new Error(`Missing ${path.relative(ROOT, CSV_PATH)} — export the feedback form responses as CSV and save them there.`);
  }
  const [header, ...records] = parseCsv(fs.readFileSync(CSV_PATH, 'utf8'));
  const walletCol = findColumn(header, 'wallet');
  const txCol = findColumn(header, 'transaction');

  const seenWallets = new Set<string>();
  const seenTxs = new Set<string>();
  // A transaction has several identifiers but one hash, so de-duplicate on
  // the hash too — otherwise submitting both identifiers of one transaction
  // under two wallets would count twice.
  const seenTxHashes = new Set<string>();
  const rows: Row[] = [];

  for (const [i, record] of records.entries()) {
    const wallet = (record[walletCol] ?? '').trim();
    const txId = (record[txCol] ?? '').trim().replace(/^0x/i, '').toLowerCase();
    const row: Row = { line: i + 2, wallet, txId, status: 'invalid' };
    rows.push(row);

    if (!wallet || !/^[0-9a-f]{64,}$/.test(txId)) continue;
    if (seenTxs.has(txId)) {
      row.status = 'duplicate-tx';
      continue;
    }
    seenTxs.add(txId);

    const result = await fetchTx(txId);
    row.status = result.status;
    if ('tx' in result) row.tx = result.tx;

    if (row.tx && seenTxHashes.has(row.tx.hash)) {
      row.status = 'duplicate-tx';
    } else if (row.tx) {
      seenTxHashes.add(row.tx.hash);
    }

    if (row.status === 'verified') {
      if (seenWallets.has(wallet)) row.status = 'duplicate-wallet';
      else seenWallets.add(wallet);
    }
    console.log(`row ${row.line}: ${STATUS_LABEL[row.status]}  ${wallet.slice(0, 24)}…  ${txId.slice(0, 16)}…`);
  }

  const verified = rows.filter((r) => r.status === 'verified');
  const problems = rows.filter((r) => r.status !== 'verified');
  const date = (ms: number) => new Date(ms).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';

  const md = [
    '# CertiProof Preprod Users',
    '',
    `**${verified.length} / ${TARGET_USERS}** unique testers verified on Midnight Preprod.`,
    '',
    `Each row is a distinct wallet whose transaction is a successful \`verifyCertificate\` call on the CertiProof contract \`${CONTRACT_ADDRESS}\`, checked against the public Preprod indexer by \`npm run users\` (\`scripts/verify-users.ts\`).`,
    '',
    '**How to verify a row yourself:** look up the transaction ID on the Preprod indexer:',
    '',
    '```bash',
    `curl -s ${INDEXER_URI} -H 'content-type: application/json' \\`,
    `  -d '{"query":"{ transactions(offset: {identifier: \\"<TRANSACTION_ID>\\"}) { hash block { height timestamp } contractActions { address ... on ContractCall { entryPoint } } } }"}'`,
    '```',
    '',
    `It should show \`address: ${CONTRACT_ADDRESS}\` and \`entryPoint: verifyCertificate\`.`,
    '',
    '> The wallet address is reported by the tester\'s own wallet through the dApp (and entered in the feedback form); it does not appear inside a `verifyCertificate` transaction, since Midnight pays fees in shielded DUST. The transaction ID is the independently checkable on-chain proof.',
    '',
    '| # | Wallet address (Preprod) | Transaction ID | Block | Time |',
    '|---|---|---|---|---|',
    ...verified.map((r, i) => `| ${i + 1} | \`${r.wallet}\` | \`${r.txId}\` | ${r.tx!.height} | ${date(r.tx!.timestamp)} |`),
    '',
  ];
  if (problems.length > 0) {
    md.push(
      '## Excluded responses',
      '',
      'Form responses that are not counted above, and why:',
      '',
      '| CSV row | Wallet address | Transaction ID | Reason |',
      '|---|---|---|---|',
      ...problems.map((r) => `| ${r.line} | \`${r.wallet || '—'}\` | \`${r.txId || '—'}\` | ${STATUS_LABEL[r.status]} |`),
      '',
    );
  }
  fs.writeFileSync(OUT_PATH, md.join('\n'));
  console.log(`\n${verified.length} verified unique users (${problems.length} excluded) → ${path.relative(ROOT, OUT_PATH)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
