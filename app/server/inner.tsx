"use client";

import { Preloaded, usePreloadedQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function ServerDemoClient({
  preloaded,
}: {
  preloaded: Preloaded<typeof api.jobs.listActive>;
}) {
  const page = usePreloadedQuery(preloaded);
  return (
    <div className="flex flex-col gap-4 bg-slate-200 dark:bg-slate-800 p-4 rounded-md">
      <h2 className="text-xl font-bold">Reactive client-loaded data</h2>
      <p className="text-sm text-muted">
        First page from <code>jobs.listActive</code> ({page.page.length} jobs).
      </p>
      <code>
        <pre className="text-xs overflow-x-auto">{JSON.stringify(page.page, null, 2)}</pre>
      </code>
    </div>
  );
}
