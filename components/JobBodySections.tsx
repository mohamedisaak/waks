"use client";

import type { JobBodySection } from "@/lib/jobBodySections";

function SectionBody({ body }: { body: string }) {
  const lines = body
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const bulletLines = lines.filter((l) => /^[-•*]\s/.test(l));
  const proseLines = lines.filter((l) => !/^[-•*]\s/.test(l));

  return (
    <div className="space-y-3">
      {proseLines.map((line, i) => (
        <p key={`p-${i}`} className="text-sm text-muted leading-relaxed">
          {line.replace(/^\*\*(.+)\*\*$/, "$1")}
        </p>
      ))}
      {bulletLines.length > 0 && (
        <ul className="space-y-1.5 text-sm text-muted leading-relaxed list-none">
          {bulletLines.map((line, i) => (
            <li key={`li-${i}`} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#4CAF7D] flex-shrink-0" />
              {line.replace(/^[-•*]\s*/, "")}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function JobBodySections({
  sections,
}: {
  sections: JobBodySection[];
}) {
  if (sections.length === 0) return null;

  return (
    <div className="space-y-6">
      {sections.map((section, i) => (
        <div key={`${section.heading}-${i}`} className="mb-6 last:mb-0">
          <h2 className="text-base font-semibold text-foreground mb-3">
            {section.heading}
          </h2>
          <SectionBody body={section.body} />
        </div>
      ))}
    </div>
  );
}
