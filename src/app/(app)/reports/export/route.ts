import { NextResponse, type NextRequest } from "next/server";
import { startOfMonth } from "date-fns";
import { getSession } from "@/lib/auth/session";
import { toCSV, type CsvValue } from "@/lib/csv";
import {
  getAgeingReport,
  getCollectionsReport,
  getPortfolioReport,
} from "@/lib/reports";

function fmtDate(d: Date): string {
  return new Date(d).toISOString().slice(0, 10);
}

function csvResponse(name: string, csv: string): NextResponse {
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user || (user.role !== "ADMIN" && user.role !== "STAFF")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "ageing";
  const today = fmtDate(new Date());

  if (type === "ageing") {
    const rep = await getAgeingReport();
    const headers = [
      "Agreement",
      "Customer",
      "Franchisee",
      "Outstanding",
      "Overdue",
      "Days past due",
      "Bucket",
    ];
    const rows: CsvValue[][] = rep.rows.map((r) => [
      r.agreementNo,
      r.customer,
      r.franchisee,
      r.outstanding.toFixed(2),
      r.overdue.toFixed(2),
      r.daysPastDue,
      r.bucket,
    ]);
    return csvResponse(`hlf-ageing-${today}.csv`, toCSV(headers, rows));
  }

  if (type === "collections") {
    const from = searchParams.get("from")
      ? new Date(searchParams.get("from")!)
      : startOfMonth(new Date());
    const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : new Date();
    const rep = await getCollectionsReport(from, to);
    const headers = ["Receipt", "Date", "Agreement", "Customer", "Franchisee", "Mode", "Amount"];
    const rows: CsvValue[][] = rep.rows.map((r) => [
      r.receiptNo,
      fmtDate(r.paidAt),
      r.agreementNo,
      r.customer,
      r.franchisee,
      r.mode,
      r.amount.toFixed(2),
    ]);
    return csvResponse(
      `hlf-collections-${fmtDate(rep.from)}_to_${fmtDate(rep.to)}.csv`,
      toCSV(headers, rows),
    );
  }

  if (type === "portfolio") {
    const rep = await getPortfolioReport();
    const headers = ["Group", "Key", "Loans", "Disbursed", "Outstanding"];
    const rows: CsvValue[][] = [
      ...rep.byFranchisee.map((f): CsvValue[] => [
        "Franchisee",
        `${f.code} ${f.name}`,
        f.loans,
        f.disbursed.toFixed(2),
        f.outstanding.toFixed(2),
      ]),
      ...rep.byType.map((t): CsvValue[] => [
        "Vehicle type",
        t.type.replaceAll("_", " "),
        t.loans,
        t.disbursed.toFixed(2),
        t.outstanding.toFixed(2),
      ]),
    ];
    return csvResponse(`hlf-portfolio-${today}.csv`, toCSV(headers, rows));
  }

  return new NextResponse("Unknown report type", { status: 400 });
}
