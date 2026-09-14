import type { LedgerEntry } from '@/types/wallet'

/** A ledger entry's amount with its direction: negative when money left the
 * account. The backend stores `amount` unsigned, so rendering it as-is showed
 * an admin deduction, a withdrawal or a buy as a gain. The sign comes from the
 * balance either side of the entry, which is right for every transaction type,
 * including a position close that can go either way. */
export function signedLedgerAmount(entry: LedgerEntry): number {
  const amount = Math.abs(Number(entry.amount))
  return Number(entry.balance_after) < Number(entry.balance_before) ? -amount : amount
}
