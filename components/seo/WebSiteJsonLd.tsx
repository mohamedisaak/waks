import { absoluteUrl } from "@/lib/siteUrl";

export default function WebSiteJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Waks",
    url: absoluteUrl("/"),
    description:
      "Find and apply to jobs across East Africa. Browse roles in Kenya, Uganda, Tanzania, and remote opportunities.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: absoluteUrl("/jobs?search={search_term_string}"),
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
