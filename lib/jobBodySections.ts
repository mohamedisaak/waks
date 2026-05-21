export type JobBodySection = {
  heading: string;
  body: string;
};

const SECTION_HEADER_RE = /^##\s+(.+)$/;
const HOW_TO_APPLY_HEADING_RE =
  /^(how to apply|method of application|application instructions|application process)(?:\s|$)/i;

export function isHowToApplyHeading(heading: string): boolean {
  return HOW_TO_APPLY_HEADING_RE.test(heading.trim());
}

export function hasHowToApplySection(sections: JobBodySection[]): boolean {
  return sections.some(
    (section) => isHowToApplyHeading(section.heading) && section.body.trim().length > 0
  );
}

export function jobHasHowToApplyInstructions(
  description: string,
  requirements?: string
): boolean {
  return hasHowToApplySection(
    collectJobDisplaySections(description, requirements)
  );
}

/** Parse description/requirements stored as `## Heading` markdown sections. */
export function parseMarkdownSections(text: string): JobBodySection[] {
  const trimmed = text.trim();
  if (!trimmed.includes("## ")) {
    return [];
  }

  const sections: JobBodySection[] = [];
  let currentHeading: string | null = null;
  let bodyLines: string[] = [];

  const flush = () => {
    if (currentHeading === null) return;
    const body = bodyLines.join("\n").trim();
    if (body) {
      sections.push({ heading: currentHeading, body });
    }
    bodyLines = [];
  };

  for (const line of trimmed.split("\n")) {
    const match = line.match(SECTION_HEADER_RE);
    if (match) {
      flush();
      currentHeading = match[1]!.trim();
      continue;
    }
    if (currentHeading !== null) {
      bodyLines.push(line);
    }
  }
  flush();

  return sections;
}

export function hasStructuredSections(text: string): boolean {
  return parseMarkdownSections(text).length > 0;
}

export function collectJobDisplaySections(
  description: string,
  requirements?: string
): JobBodySection[] {
  const fromDescription = parseMarkdownSections(description);
  if (fromDescription.length > 0) {
    const fromRequirements = requirements
      ? parseMarkdownSections(requirements)
      : [];
    if (fromRequirements.length > 0) {
      return [...fromDescription, ...fromRequirements];
    }
    return fromDescription;
  }

  const sections: JobBodySection[] = [];
  if (description.trim()) {
    sections.push({ heading: "Job Description", body: description.trim() });
  }
  if (requirements?.trim() && !/^see job description/i.test(requirements)) {
    sections.push({ heading: "Requirements", body: requirements.trim() });
  }
  return sections;
}
