import type { ReactNode } from "react";

export type Column<T> = {
  header: string;
  cell: (row: T) => ReactNode;
  /** Right-align numeric columns. */
  numeric?: boolean;
};

/** Semantic table built from existing hairline/divider tokens. */
export function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  empty = "Nothing to show.",
}: {
  caption: string;
  columns: readonly Column<T>[];
  rows: readonly T[];
  rowKey: (row: T) => string | number;
  empty?: string;
}) {
  if (rows.length === 0) {
    return <p className="border-y border-line/30 py-10 text-center text-body text-muted">{empty}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-body">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-y border-line/30">
            {columns.map((c) => (
              <th
                key={c.header}
                scope="col"
                className={`px-3 py-3 text-caption font-medium uppercase text-muted ${c.numeric ? "text-right" : ""}`}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line/30 border-b border-line/30">
          {rows.map((row) => (
            <tr key={rowKey(row)} className="hover:bg-ink/5">
              {columns.map((c) => (
                <td key={c.header} className={`px-3 py-3 align-top ${c.numeric ? "text-right" : ""}`}>
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
