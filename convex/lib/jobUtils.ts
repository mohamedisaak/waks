/** Full-text corpus for Convex search indexes (title + JD + requirements). */
export function buildJobSearchBlob(input: {
  title: string;
  description: string;
  requirements: string;
}) {
  return [input.title, input.description, input.requirements].join("\n").trim();
}
