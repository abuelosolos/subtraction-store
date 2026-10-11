import Image from "next/image";
import Link from "next/link";

export function Campaign() {
  return (
    <section aria-labelledby="campaign-heading" className="surface-light">
      <div className="mx-auto grid w-full max-w-frame items-stretch md:grid-cols-2">
        <div className="relative min-h-[28rem] md:min-h-[40rem]">
          <Image
            src="/images/campaign/premium-black.webp"
            alt="Figure in a black hooded jacket with hands raised to the face in a dark room"
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
        <div className="flex flex-col justify-center gap-6 px-[var(--gutter)] py-16 md:px-16 md:py-24">
          <p className="text-caption font-medium uppercase text-muted">The collection</p>
          <h2 id="campaign-heading" className="text-heading-2 font-semibold">
            Premium Black Excellence
          </h2>
          <p className="max-w-[28rem] text-body text-muted">
            What happens when you take color away. Can the fit has to speak for itself?. Does
            silhouette move you when you stop hiding behind a palette.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/collections" className="btn btn-primary btn-lg">
              Explore collection
            </Link>
            <Link href="/story" className="btn btn-ghost btn-lg">
              Our story
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
