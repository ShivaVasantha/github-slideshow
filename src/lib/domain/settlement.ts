import { round2, toNumber } from "../money";
import type { LedgerEntry, Settlement } from "@prisma/client";

/**
 * A franchisee's co-lending money position, derived from the ledger and any
 * pay-outs already made.
 *
 * - collectedForThem: their share of borrower collections received by head office
 * - settledToDate:     total already paid out to them
 * - netPayable:        collectedForThem − settledToDate (what we owe them now)
 * - deployedCapital:   their capital still in the field (disbursed − collected)
 */
export interface FranchiseePosition {
  disbursedByThem: number;
  collectedForThem: number;
  deployedCapital: number;
  headOfficeDisbursed: number;
  headOfficeCollected: number;
  settledToDate: number;
  netPayable: number;
}

export function franchiseePosition(
  ledger: Pick<LedgerEntry, "direction" | "franchiseeAmount" | "headOfficeAmount">[],
  settlements: Pick<Settlement, "amount">[],
): FranchiseePosition {
  let disbursedByThem = 0;
  let collectedForThem = 0;
  let headOfficeDisbursed = 0;
  let headOfficeCollected = 0;

  for (const e of ledger) {
    if (e.direction === "DISBURSEMENT") {
      disbursedByThem = round2(disbursedByThem + toNumber(e.franchiseeAmount));
      headOfficeDisbursed = round2(headOfficeDisbursed + toNumber(e.headOfficeAmount));
    } else {
      collectedForThem = round2(collectedForThem + toNumber(e.franchiseeAmount));
      headOfficeCollected = round2(headOfficeCollected + toNumber(e.headOfficeAmount));
    }
  }

  const settledToDate = round2(
    settlements.reduce((s, x) => s + toNumber(x.amount), 0),
  );

  return {
    disbursedByThem,
    collectedForThem,
    deployedCapital: round2(disbursedByThem - collectedForThem),
    headOfficeDisbursed,
    headOfficeCollected,
    settledToDate,
    netPayable: round2(collectedForThem - settledToDate),
  };
}
