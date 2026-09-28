/**
 * Links each successful verification to the user-feedback Google Form, with
 * the user's wallet address and transaction ID pre-filled so a tester only
 * has to answer the questions. Responses feed users/users.csv (see
 * scripts/verify-users.ts) and FEEDBACK.md.
 *
 * To set up: in the Google Form, "⋮ → Get pre-filled link", type the literal
 * placeholders {address} and {txId} into the wallet-address and
 * transaction-ID questions, click "Get link", and paste the result below.
 * Leave it empty to hide the feedback button (copying details still works).
 */
export const FEEDBACK_FORM_PREFILL_URL: string = '';

export function buildFeedbackUrl(walletAddress: string, txId: string): string | null {
  if (!FEEDBACK_FORM_PREFILL_URL) return null;
  return FEEDBACK_FORM_PREFILL_URL.replace('%7Baddress%7D', encodeURIComponent(walletAddress))
    .replace('{address}', encodeURIComponent(walletAddress))
    .replace('%7BtxId%7D', encodeURIComponent(txId))
    .replace('{txId}', encodeURIComponent(txId));
}
