import { seo } from "@/lib/seo";

function JsonLdScript({ value }: { value: unknown }) {
  return (
    <script
      type="application/ld+json"
      // react-doctor-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(value) }}
    />
  );
}

export function WebSiteJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: seo.siteName,
    url: seo.siteUrl,
    description: seo.description,
    inLanguage: "en",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${seo.siteUrl}/?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return <JsonLdScript value={jsonLd} />;
}

export function OrganizationJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: seo.siteName,
    url: seo.siteUrl,
    email: seo.contactEmail,
    logo: `${seo.siteUrl}/favicon-96x96.png`,
    contactPoint: [
      {
        "@type": "ContactPoint",
        email: seo.contactEmail,
        contactType: "customer support",
      },
      {
        "@type": "ContactPoint",
        email: seo.salesEmail,
        contactType: "sales",
      },
    ],
    sameAs: ["https://github.com/carbonelldev/commitglow"],
  };

  return <JsonLdScript value={jsonLd} />;
}

export function SoftwareApplicationJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: seo.siteName,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web",
    url: seo.siteUrl,
    description: seo.description,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    inLanguage: "en",
  };

  return <JsonLdScript value={jsonLd} />;
}

type FAQItem = { question: string; answer: string };

export function FAQPageJsonLd({ items }: { items: FAQItem[] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return <JsonLdScript value={jsonLd} />;
}
