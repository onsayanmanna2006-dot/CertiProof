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
export const FEEDBACK_FORM_PREFILL_URL: string =
  'https://docs.google.com/forms/d/e/1FAIpQLScYbdkijqY4tb85IpbsIPvle3FNAEOCkibERx-PNFdmMWp2CA/viewform?usp=pp_url&entry.1795451599=%7Baddress%7D&entry.1332191966=%7BtxId%7D';

export function buildFeedbackUrl(walletAddress: string, txId: string): string | null {
  if (!FEEDBACK_FORM_PREFILL_URL) return null;
  // Placeholders may arrive URL-encoded (%7B…%7D), and in many fonts a
  // capital I and lowercase l are indistinguishable when typing {txId}, so
  // match loosely: {address}, and any of {tx}, {txid}, {txId}, {txld}.
  return FEEDBACK_FORM_PREFILL_URL.replace(/(?:\{|%7B)address(?:\}|%7D)/i, encodeURIComponent(walletAddress)).replace(
    /(?:\{|%7B)tx(?:[il]d)?(?:\}|%7D)/i,
    encodeURIComponent(txId),
  );
}
