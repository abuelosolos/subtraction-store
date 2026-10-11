import type { ReactNode } from "react";

export type Column<T> = {
  header: string;
  cell: (row: T) => ReactNode;
  /** Right-align numeric columns. */
  numeric?: boolean;
};

/**
 * Semantic table. From md a normal table; on phones each row becomes a stacked
 * card (the header text is shown beside each value via data-label).
 */
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
    return <p className="admin-card px-4 py-10 text-center text-body text-muted">{empty}</p>;
  }
  return (
    <div className="admin-card overflow-hidden">
      <table className="admin-table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.header} scope="col" className={c.numeric ? "is-numeric" : undefined}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((c) => (
                <td key={c.header} data-label={c.header} className={c.numeric ? "is-numeric" : undefined}>
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
