"use client";

import { useEffect } from "react";

import { clearCart } from "@/lib/cart-store";

/** Renders nothing; empties the local cart once the server has confirmed payment. */
export function ClearCart() {
  useEffect(() => {
    clearCart();
  }, []);
  return null;
}
