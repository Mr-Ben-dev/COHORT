/**
 * Map technical wallet/prove errors to user-facing copy.
 * Never include stack traces, witnesses, or patient facts.
 */
export function humanError(err: unknown): string {
  const raw = err && typeof err === "object" && "publicMessage" in err
    ? String((err as { publicMessage?: string }).publicMessage || "")
    : err instanceof Error
      ? err.message
      : String(err || "");
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code?: string }).code || "")
      : "";
  const text = `${code} ${raw}`.toLowerCase();

  if (/insufficient_dust|insufficient funds|dust balance is 0/.test(text)) {
    return "Your wallet needs more DUST to complete this verification.";
  }
  if (/reject/.test(text)) {
    return "The wallet declined this request. You can try again when you are ready.";
  }
  if (/wallet_unavailable|no midnight dapp connector|install 1am/.test(text)) {
    return "No Midnight wallet was found. Install 1AM to continue. COHORT will not create a fake wallet.";
  }
  if (/wallet_no_proving|getprovingprovider|lace/.test(text)) {
    return "This wallet cannot generate the proof in-browser. Use 1AM for this check. COHORT will not send your facts to a hosted prover.";
  }
  if (/timed out|timeout/.test(text)) {
    return "The wallet timed out. Reload 1AM, hard-refresh this page, then try again.";
  }
  if (/extension context invalidated/.test(text)) {
    return "The wallet extension was reloaded. Hard-refresh this page, then connect again.";
  }
  if (/unsupported_criteria|typed-subset preview failed|unknown trial/.test(text)) {
    return "This check does not match the typed trial rules, so no proof was submitted.";
  }
  if (/tx_unconfirmed/.test(text)) {
    return "The network has not confirmed this transaction yet. COHORT will not mark it verified.";
  }
  if (/indexer/.test(text)) {
    return "Public chain state could not be read from the Midnight indexer. Try again in a moment.";
  }
  if (/private_field/.test(text)) {
    return "Private health facts stay on this device. They were not sent.";
  }
  if (/proving_failed|submission failed/.test(text)) {
    return "The private proof did not complete. Nothing fake was recorded. You can start again.";
  }
  return "Something went wrong. COHORT will not show a fake success.";
}
