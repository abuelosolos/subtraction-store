export function SectionHeading({
  id,
  title,
  linkLabel,
  linkHref = "#",
}: {
  id?: string;
  title: string;
  linkLabel?: string;
  linkHref?: string;
}) {
  return (
    <div className="mb-8 flex items-end justify-between gap-6">
      <h2 id={id} className="text-heading-3 font-semibold">{title}</h2>
      {linkLabel ? (
        <a href={linkHref} className="shrink-0 text-body font-medium underline underline-offset-4">
          {linkLabel}
        </a>
      ) : null}
    </div>
  );
}
