export type JobSourceSite = "brightermonday" | "myjobmag" | "fuzu";

export const JOB_SOURCE_SITES: JobSourceSite[] = [
  "brightermonday",
  "myjobmag",
  "fuzu",
];

export const SOURCE_DISPLAY_NAMES: Record<JobSourceSite, string> = {
  brightermonday: "BrighterMonday",
  myjobmag: "MyJobMag",
  fuzu: "Fuzu",
};
