import { v } from "convex/values";

export const adminSortDirectionValidator = v.union(
  v.literal("asc"),
  v.literal("desc")
);

const applicationPipelineStatusValidator = v.union(
  v.literal("pending"),
  v.literal("reviewed"),
  v.literal("shortlisted"),
  v.literal("rejected"),
  v.literal("hired")
);

export const jobStatusValidatorAdmin = v.union(
  v.literal("draft"),
  v.literal("active"),
  v.literal("closed")
);

export const screeningQuestionValidatorAdmin = v.object({
  id: v.string(),
  prompt: v.string(),
  required: v.boolean(),
});

/** Full Convex jobPosting document validator — mirrors schema.jobPostings */
export const jobPostingDocValidator = v.object({
  _id: v.id("jobPostings"),
  _creationTime: v.number(),
  orgId: v.id("organizations"),
  clerkOrgId: v.string(),
  title: v.string(),
  description: v.string(),
  location: v.string(),
  locationType: v.union(
    v.literal("onsite"),
    v.literal("remote"),
    v.literal("hybrid")
  ),
  employmentType: v.union(
    v.literal("full-time"),
    v.literal("part-time"),
    v.literal("contract"),
    v.literal("internship")
  ),
  salaryMin: v.optional(v.number()),
  salaryMax: v.optional(v.number()),
  requirements: v.string(),
  searchBlob: v.optional(v.string()),
  screeningQuestions: v.optional(v.array(screeningQuestionValidatorAdmin)),
  pipelineOrder: v.optional(v.array(applicationPipelineStatusValidator)),
  status: jobStatusValidatorAdmin,
  featured: v.boolean(),
  platformHiddenAt: v.optional(v.number()),
  platformHiddenReason: v.optional(v.string()),
});

export const organizationDocValidator = v.object({
  _id: v.id("organizations"),
  _creationTime: v.number(),
  clerkOrgId: v.string(),
  name: v.string(),
  slug: v.string(),
  logoUrl: v.optional(v.string()),
  plan: v.union(v.literal("free"), v.literal("starter"), v.literal("pro")),
  subscriptionExpiresAt: v.optional(v.number()),
  billingProvider: v.optional(
    v.union(v.literal("clerk_stripe"), v.literal("mpesa"))
  ),
  memberCount: v.number(),
  createdAt: v.number(),
  website: v.optional(v.string()),
  industry: v.optional(v.string()),
  companySize: v.optional(v.string()),
  description: v.optional(v.string()),
  location: v.optional(v.string()),
  linkedin: v.optional(v.string()),
  twitter: v.optional(v.string()),
  phone: v.optional(v.string()),
  platformSuspendedAt: v.optional(v.number()),
  platformSuspendedReason: v.optional(v.string()),
});

export const jobMetricValidator = v.object({
  _id: v.id("jobMetrics"),
  _creationTime: v.number(),
  jobPostingId: v.id("jobPostings"),
  clerkOrgId: v.string(),
  viewCount: v.number(),
  applicationCount: v.number(),
});
