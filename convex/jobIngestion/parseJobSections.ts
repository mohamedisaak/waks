import type { CheerioAPI, Cheerio } from "cheerio";
import type { Element } from "domhandler";
import { truncateDescription, truncateStructuredMarkdown } from "./heuristics";

export type JobContentSection = {
  heading: string;
  body: string;
};

const REQUIREMENTS_HEADING =
  /^(requirements?|qualifications?|who you are|what we(?:'re| are) looking for|ideal candidate|skills|experience required|preferred attributes)/i;

const APPLY_HEADING = /^(how to apply|method of application|application)/i;

function normalizeHeading(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

function isHeadingElement($: CheerioAPI, el: Element): string | null {
  const tag = el.tagName?.toLowerCase();
  if (tag === "h2" || tag === "h3" || tag === "h4") {
    const text = normalizeHeading($(el).text());
    return text.length > 0 ? text : null;
  }
  if (tag === "p") {
    const strong = $(el).find("strong").first();
    if (strong.length) {
      const strongText = normalizeHeading(strong.text());
      const fullText = normalizeHeading($(el).text());
      if (strongText && (fullText === strongText || fullText.startsWith(strongText))) {
        return strongText;
      }
    }
  }
  return null;
}

function blockToMarkdown($: CheerioAPI, el: Element): string {
  const tag = el.tagName?.toLowerCase();
  const $el = $(el);

  if (tag === "ul" || tag === "ol") {
    return $el
      .find("> li")
      .map((_, li) => {
        const text = normalizeHeading($(li).text());
        return text ? `- ${text}` : "";
      })
      .get()
      .filter(Boolean)
      .join("\n");
  }

  if (tag === "p") {
    const heading = isHeadingElement($, el);
    if (heading) return "";
    const text = normalizeHeading($el.text());
    return text;
  }

  if (tag === "div") {
    const text = normalizeHeading($el.text());
    return text;
  }

  return normalizeHeading($el.text());
}

function parseBlocksIntoSections(
  $: CheerioAPI,
  $root: Cheerio<Element>
): JobContentSection[] {
  const sections: JobContentSection[] = [];
  let currentHeading = "Overview";
  let currentBody: string[] = [];

  const flush = () => {
    const body = currentBody.filter(Boolean).join("\n\n").trim();
    if (body || sections.length === 0) {
      sections.push({ heading: currentHeading, body });
    }
    currentBody = [];
  };

  $root.children().each((_, el) => {
    const heading = isHeadingElement($, el);
    if (heading) {
      flush();
      currentHeading = heading;
      return;
    }
    const block = blockToMarkdown($, el);
    if (block) currentBody.push(block);
  });

  flush();
  return sections.filter((s) => s.body.length > 0 || s.heading !== "Overview");
}

function inferListSectionTitle(items: string[]): string {
  const joined = items.join(" ").toLowerCase();
  if (
    /education|qualification|degree|diploma|bachelor|cpa|acca|cima|certification/.test(
      joined
    )
  ) {
    return "Requirements";
  }
  if (/preferred|ideal|attribute|nice to have/.test(joined)) {
    return "Preferred Attributes";
  }
  if (/responsibilit|duties|you will|role|manage|prepare|assist|support/.test(joined)) {
    return "Key Responsibilities";
  }
  return "Key Responsibilities";
}

function parseProseListsIntoSections($: CheerioAPI, $prose: Cheerio<Element>): JobContentSection[] {
  const sections: JobContentSection[] = [];

  $prose.children().each((_, el) => {
    const tag = el.tagName?.toLowerCase();
    const heading = isHeadingElement($, el);
    if (heading) {
      sections.push({ heading, body: "" });
      return;
    }
    if (tag === "ul" || tag === "ol") {
      const items = $(el)
        .find("> li")
        .map((_, li) => normalizeHeading($(li).text()))
        .get()
        .filter(Boolean);
      if (items.length === 0) return;
      const title = inferListSectionTitle(items);
      const body = items.map((t) => `- ${t}`).join("\n");
      const last = sections[sections.length - 1];
      if (last?.heading === title && last.body) {
        last.body = `${last.body}\n${body}`;
      } else {
        sections.push({ heading: title, body });
      }
      return;
    }
    const block = blockToMarkdown($, el);
    if (block) {
      const last = sections[sections.length - 1];
      if (last) {
        last.body = last.body ? `${last.body}\n\n${block}` : block;
      } else {
        sections.push({ heading: "Job Description", body: block });
      }
    }
  });

  return sections.filter((s) => s.body.trim().length > 0);
}

export function sectionsToMarkdown(sections: JobContentSection[]): string {
  return sections
    .map((s) => `## ${s.heading}\n\n${s.body.trim()}`)
    .join("\n\n")
    .trim();
}

export function partitionSectionsForStorage(sections: JobContentSection[]): {
  description: string;
  requirements: string;
} {
  const requirementSections: JobContentSection[] = [];
  const mainSections: JobContentSection[] = [];

  for (const section of sections) {
    if (REQUIREMENTS_HEADING.test(section.heading)) {
      requirementSections.push(section);
    } else {
      mainSections.push(section);
    }
  }

  const description = truncateStructuredMarkdown(
    sectionsToMarkdown(mainSections),
    6000
  );
  const requirements =
    requirementSections.length > 0
      ? truncateStructuredMarkdown(sectionsToMarkdown(requirementSections), 3500)
      : "";

  return {
    description,
    requirements:
      requirements ||
      (mainSections.length > 0
        ? ""
        : truncateStructuredMarkdown(sectionsToMarkdown(sections), 3500)),
  };
}

export function parseMyJobMagSections($: CheerioAPI): JobContentSection[] {
  const sections: JobContentSection[] = [];

  const $details = $(".job-details").first();
  if ($details.length) {
    sections.push(...parseBlocksIntoSections($, $details));
  }

  const $applyHeading = $("#application-method");
  if ($applyHeading.length) {
    const applyParts: string[] = [];
    $applyHeading.nextAll().each((_, el) => {
      const $el = $(el);
      if ($el.is("#apply-sec, .apply-sec, script, ins, .adsbygoogle")) return false;
      if ($el.is("h2, h3") && !$el.is("#application-method")) return false;
      const block = blockToMarkdown($, el);
      if (block && !/build your cv for free/i.test(block)) {
        applyParts.push(block);
      }
    });
    const body = applyParts.join("\n\n").trim();
    if (body) {
      sections.push({
        heading: "How to Apply",
        body,
      });
    }
  }

  return sections.filter((s) => s.body.trim().length > 0);
}

export function parseBrighterMondaySections($: CheerioAPI): JobContentSection[] {
  const sections: JobContentSection[] = [];

  $("h3").each((_, el) => {
    const text = normalizeHeading($(el).text());
    if (/^job summary$/i.test(text)) {
      const summary = $(el).next("p").first().text().trim();
      if (summary) {
        sections.push({ heading: "Job Summary", body: summary });
      }
    }
  });

  const $prose = $("[class*='description'] .prose, .prose.prose-gray").first();
  if ($prose.length) {
    sections.push(...parseProseListsIntoSections($, $prose));
  } else {
    const $desc = $("[class*='description'], article").first();
    const fallback = normalizeHeading($desc.text());
    if (fallback) {
      sections.push({ heading: "Job Description", body: fallback });
    }
  }

  return sections.filter((s) => s.body.trim().length > 0);
}

export function buildStructuredJobFields(
  sections: JobContentSection[],
  fallbackDescription: string,
  fallbackRequirements?: string
): { description: string; requirements: string } {
  if (sections.length === 0) {
    return {
      description: truncateDescription(fallbackDescription),
      requirements:
        fallbackRequirements ??
        "See job description for requirements.",
    };
  }

  const partitioned = partitionSectionsForStorage(sections);
  return {
    description: partitioned.description || truncateDescription(fallbackDescription),
    requirements:
      partitioned.requirements ||
      fallbackRequirements ||
      (partitioned.description ? "" : "See job description for requirements."),
  };
}
