import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Space_Mono } from "next/font/google";
// @ts-ignore -- Next.js handles global CSS side-effect imports at build time
import "./globals.css";
import { seo } from "@/lib/seo";
import { WebSiteJsonLd, OrganizationJsonLd, SoftwareApplicationJsonLd } from "@/components/json-ld";

const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk" });
const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-mono" });

export const metadata: Metadata = {
  metadataBase: new URL(seo.siteUrl),
  title: seo.title,
  description: seo.description,
  keywords: [...seo.keywords],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" }
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  },
  robots: seo.robots,
  openGraph: {
    type: "website",
    siteName: seo.siteName,
    title: seo.title.default,
    description: seo.description,
    url: seo.siteUrl,
    locale: "en_US",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: seo.siteName,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: seo.twitter.site,
    creator: seo.twitter.creator,
    title: seo.title.default,
    description: seo.description,
    images: ["/opengraph-image.png"],
  },
  alternates: {
    canonical: seo.siteUrl,
  },
  category: "technology",
  creator: seo.siteName,
  publisher: seo.siteName,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#030305",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${grotesk.variable} ${mono.variable}`}>
      <head>
        <WebSiteJsonLd />
        <OrganizationJsonLd />
        <SoftwareApplicationJsonLd />
      </head>
      <body className="font-[var(--font-grotesk)] antialiased">{children}</body>
    </html>
  );
}
