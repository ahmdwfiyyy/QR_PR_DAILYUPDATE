import type { ReactNode } from "react";
import { fmtDate, money } from "../api/format";
import type { Dataset, Item } from "../api/types";
import { Badge, tableHead, td, th } from "./ui";

export type Column = {
  key: keyof Item;
  label: string;
  wide?: boolean; // wraps instead of staying on one line
  numeric?: boolean;
  small?: boolean;
  render?: (item: Item) => ReactNode;
};

const PR_COLUMNS: Column[] = [
  { key: "doc_no", label: "PR No" },
  { key: "doc_date", label: "Created", render: (r) => fmtDate(r.doc_date) },
  { key: "description", label: "Remarks", wide: true },
  { key: "category", label: "Category" },
  { key: "buyer", label: "Buyer" },
  { key: "requestor", label: "Requestor" },
  { key: "department", label: "Dept" },
  { key: "total_price", label: "Total price", numeric: true, render: (r) => (r.total_price === null ? "" : money(r.total_price, r.currency)) },
  { key: "vendor", label: "Vendor recommended", wide: true },
  { key: "aging_days", label: "Aging", numeric: true },
];

const QR_COLUMNS: Column[] = [
  { key: "doc_no", label: "QR No" },
  { key: "doc_date", label: "QR date", render: (r) => fmtDate(r.doc_date) },
  { key: "expenditure_type", label: "Type" },
  { key: "category", label: "Category" },
  { key: "description", label: "Description", wide: true },
  { key: "buyer", label: "Buyer" },
  { key: "requestor", label: "Requestor" },
  { key: "approver", label: "Current approver", wide: true, small: true },
  { key: "vendor", label: "Quoted vendors", wide: true, small: true },
  { key: "last_operate", label: "Last operate" },
  { key: "aging_days", label: "Elapsed", numeric: true },
];

export const columnsFor = (dataset: Dataset) => (dataset === "PR" ? PR_COLUMNS : QR_COLUMNS);

/** Item list. Rows older than `agedDays` get a red day count; NEW marks items not in the previous upload. */
export default function ItemTable({
  columns,
  rows,
  agedDays,
  showNew = true,
}: {
  columns: Column[];
  rows: Item[];
  agedDays: number;
  showNew?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className={tableHead}>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={`${th} whitespace-nowrap ${c.numeric ? "text-right" : "text-left"}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-blue-50">
          {rows.map((r) => {
            const aged = (r.aging_days ?? 0) > agedDays;
            return (
              <tr key={r.doc_no} className="align-top transition hover:bg-brand-ice/50">
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`${td} ${c.wide ? "min-w-56 max-w-96" : "whitespace-nowrap"} ${c.small ? "text-xs text-slate-500" : ""} ${
                      c.numeric ? "text-right tabular-nums" : ""
                    } ${c.key === "aging_days" ? (aged ? "font-extrabold text-brand-red" : "font-semibold") : ""} ${
                      c.key === "doc_no" ? "font-bold text-brand-navy" : ""
                    }`}
                  >
                    {c.render ? c.render(r) : (r[c.key] as ReactNode)}
                    {showNew && c.key === "doc_no" && r.is_new && (
                      <span className="ml-2 align-middle">
                        <Badge tone="blue">New</Badge>
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-slate-400">
                No matching items
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
