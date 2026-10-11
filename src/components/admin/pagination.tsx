import Link from "next/link";

/** Previous / Next with a range summary; buttons keep a real hit area. */
export function Pagination({
  page,
  pages,
  total,
  pageSize,
  hrefFor,
}: {
  page: number;
  pages: number;
  total: number;
  pageSize: number;
  hrefFor: (page: number) => string;
}) {
  if (pages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4 text-body">
      <p className="text-muted">
        {from}-{to} of {total}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={hrefFor(page - 1)} className="btn btn-outline">Previous</Link>
        ) : (
          <span className="btn btn-outline" aria-disabled="true">Previous</span>
        )}
        {page < pages ? (
          <Link href={hrefFor(page + 1)} className="btn btn-outline">Next</Link>
        ) : (
          <span className="btn btn-outline" aria-disabled="true">Next</span>
        )}
      </div>
    </nav>
  );
}
