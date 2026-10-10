import type { Metadata } from "next";
import { Suspense } from "react";

import { db } from "@/db";
import { AddressBook } from "@/components/account/address-book";
import { getSavedAddresses, MAX_SAVED_ADDRESSES } from "@/lib/addresses";
import { COUNTRIES, countryName } from "@/lib/customer";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Addresses | SUBTRACTION.",
  robots: { index: false },
};

export default function AddressesPage() {
  return (
    <section aria-labelledby="addresses-heading">
      <h1 id="addresses-heading" className="text-heading-2 font-semibold">Addresses</h1>
      <div className="pt-8">
        <Suspense fallback={<p role="status" className="text-body text-muted">Loading your addresses</p>}>
          <Addresses />
        </Suspense>
      </div>
    </section>
  );
}

async function Addresses() {
  const user = await requireUser("/account/addresses");
  const addresses = await getSavedAddresses(db, user.id);
  const countries = COUNTRIES.map((code) => ({ code, name: countryName(code) })).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  return (
    <AddressBook
      addresses={addresses}
      countries={countries}
      defaultName={user.name}
      defaultPhone={user.phone ?? ""}
      limit={MAX_SAVED_ADDRESSES}
    />
  );
}
