import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Font roles: see docs/design-system.md. Variables are mapped to --font-sans,
// --font-brand, --font-display and --font-accent in globals.css. Files are
// self-hosted in src/fonts (see OFL-NOTE.md).
const inter = localFont({
  src: "../fonts/Inter-latin-wght.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});

const spaceGrotesk = localFont({
  src: "../fonts/SpaceGrotesk-latin-wght.woff2",
  variable: "--font-space-grotesk",
  weight: "300 700",
  display: "swap",
});

const bebasNeue = localFont({
  src: "../fonts/BebasNeue-latin-400.woff2",
  variable: "--font-bebas-neue",
  weight: "400",
  display: "swap",
});

const dmSans = localFont({
  src: "../fonts/DMSans-latin-opsz.woff2",
  variable: "--font-dm-sans",
  weight: "100 1000",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SUBTRACTION.",
  description: "Premium black excellence. What happens when you take color away.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} ${bebasNeue.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
