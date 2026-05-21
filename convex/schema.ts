import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const applicationStatusValidator = v.union(
  v.literal("pending"),
  v.literal("reviewed"),
  v.literal("shortlisted"),
  v.literal("rejected"),
  v.literal("hired")
);

const screeningQuestionValidator = v.object({
  id: v.string(),
  prompt: v.string(),
  required: v.boolean(),
});

const sponsoredPlacementSlotValidator = v.union(
  v.literal("home_hero"),
  v.literal("jobs_rail"),
  v.literal("jobs_inline")
);

const aiUsageThisMonthValidator = v.object({
  coverLetters: v.number(),
  profileGenerations: v.number(),
  resumeParses: v.number(),
});

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    clerkUserId: v.string(),
    name: v.string(),
    email: v.string(),
    platformSuspendedAt: v.optional(v.number()),
    platformSuspendedReason: v.optional(v.string()),
    /** Start of the current AI quota period (Unix ms). */
    aiUsagePeriodStart: v.optional(v.number()),
    aiUsageThisMonth: v.optional(aiUsageThisMonthValidator),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_clerk_user_id", ["clerkUserId"]),

  organizations: defineTable({
    clerkOrgId: v.string(),
    name: v.string(),
    slug: v.string(),
    logoUrl: v.optional(v.string()),
    plan: v.union(v.literal("free"), v.literal("starter"), v.literal("pro")),
    /** Unix ms — when paid access ends (cards + M-Pesa). Ongoing subscriptions omit this until synced from Clerk items / PSP webhooks. */
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
    /** Platform-admin suspension: hides org jobs from public listings and blocks new publishes. */
    platformSuspendedAt: v.optional(v.number()),
    platformSuspendedReason: v.optional(v.string()),
    /** Unused paid listing slots (each allows one extra concurrent active job). */
    listingCredits: v.optional(v.number()),
    /**
     * When true, org may run unlimited concurrent active jobs (grandfathered Starter/Pro).
     * When false, new per-job billing applies even if plan is pro.
     */
    legacyUnlimitedListings: v.optional(v.boolean()),
  })
    .index("by_clerk_org_id", ["clerkOrgId"])
    .index("by_name", ["name"]),

  jobPostings: defineTable({
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
    /** Combined title/description/requirements — maintained for full-text discovery. Optional for legacy rows until backfilled. */
    searchBlob: v.optional(v.string()),
    screeningQuestions: v.optional(v.array(screeningQuestionValidator)),
    /** Pro: display order for hiring pipeline statuses (Kanban columns). Defaults to lexical stage order client-side when absent. */
    pipelineOrder: v.optional(v.array(applicationStatusValidator)),
    status: v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("closed")
    ),
    featured: v.boolean(),
    /** Whether this active job consumes the free slot or a paid listing credit. */
    listingSlotKind: v.optional(
      v.union(v.literal("free"), v.literal("paid"))
    ),
    /** Admin-only hide from public job board (employers keep dashboard access). */
    platformHiddenAt: v.optional(v.number()),
    platformHiddenReason: v.optional(v.string()),
    /** `employer` = posted on Waks; `aggregated` = ingested from external boards. */
    sourceKind: v.optional(
      v.union(v.literal("employer"), v.literal("aggregated"))
    ),
    sourceSite: v.optional(v.string()),
    externalJobId: v.optional(v.string()),
    /** User-facing apply destination (direct link/email when found, else listing URL). */
    externalUrl: v.optional(v.string()),
    /** Original scraped detail page on the aggregator site. */
    sourceListingUrl: v.optional(v.string()),
    /** When true, user must apply on the aggregator; show board name in UI. */
    applyViaSource: v.optional(v.boolean()),
    companyName: v.optional(v.string()),
    scrapedAt: v.optional(v.number()),
  })
    .index("by_org", ["orgId"])
    .index("by_clerk_org_id", ["clerkOrgId"])
    .index("by_status", ["status"])
    .index("by_org_and_status", ["clerkOrgId", "status"])
    .index("by_source_and_external_id", ["sourceSite", "externalJobId"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["status", "locationType", "employmentType"],
    })
    .searchIndex("search_blob", {
      searchField: "searchBlob",
      filterFields: ["status", "locationType", "employmentType"],
    }),

  applications: defineTable({
    jobPostingId: v.id("jobPostings"),
    applicantName: v.string(),
    applicantEmail: v.string(),
    phone: v.optional(v.string()),
    coverLetter: v.optional(v.string()),
    resumeStorageId: v.optional(v.id("_storage")),
    tokenIdentifier: v.optional(v.string()),
    screeningAnswers: v.optional(
      v.array(
        v.object({
          questionId: v.string(),
          answer: v.string(),
        })
      )
    ),
    tags: v.optional(v.array(v.string())),
    withdrawn: v.optional(v.boolean()),
    scheduledInterviewAt: v.optional(v.number()),
    firstOpenedByEmployerAt: v.optional(v.number()),
    status: v.union(
      v.literal("pending"),
      v.literal("reviewed"),
      v.literal("shortlisted"),
      v.literal("rejected"),
      v.literal("hired")
    ),
  })
    .index("by_job", ["jobPostingId"])
    .index("by_job_and_status", ["jobPostingId", "status"])
    .index("by_token", ["tokenIdentifier"]),

  applicationStatusHistory: defineTable({
    applicationId: v.id("applications"),
    fromStatus: v.optional(applicationStatusValidator),
    toStatus: applicationStatusValidator,
    actorTokenIdentifier: v.optional(v.string()),
  }).index("by_application", ["applicationId"]),

  applicationNotes: defineTable({
    applicationId: v.id("applications"),
    clerkOrgId: v.string(),
    authorTokenIdentifier: v.string(),
    body: v.string(),
    parentNoteId: v.optional(v.id("applicationNotes")),
    mentionedEmails: v.optional(v.array(v.string())),
  }).index("by_application", ["applicationId"]),

  notificationPreferences: defineTable({
    tokenIdentifier: v.string(),
    emailEnabled: v.boolean(),
    emailUnsubscribedAt: v.optional(v.number()),
    whatsappOptIn: v.boolean(),
    whatsappPhone: v.optional(v.string()),
    whatsappOptInAt: v.optional(v.number()),
  }).index("by_token", ["tokenIdentifier"]),

  notificationOutbox: defineTable({
    applicationId: v.optional(v.id("applications")),
    dedupeKey: v.string(),
    eventType: v.union(
      v.literal("application_submitted"),
      v.literal("status_reviewed"),
      v.literal("status_shortlisted"),
      v.literal("status_rejected"),
      v.literal("status_hired"),
      v.literal("employer_viewed"),
      v.literal("interview_scheduled"),
      v.literal("interview_reminder"),
      v.literal("note_mention")
    ),
    channel: v.union(
      v.literal("email"),
      v.literal("whatsapp"),
      v.literal("in_app")
    ),
    payload: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("sent"),
      v.literal("failed"),
      v.literal("skipped")
    ),
    attempts: v.number(),
    scheduledFor: v.number(),
    lastError: v.optional(v.string()),
    sentAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_status_and_scheduled", ["status", "scheduledFor"])
    .index("by_dedupe", ["dedupeKey"]),

  profiles: defineTable({
    tokenIdentifier: v.string(),
    headline: v.optional(v.string()),
    summary: v.optional(v.string()),
    bio: v.optional(v.string()),
    location: v.optional(v.string()),
    yearsOfExperience: v.optional(v.number()),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
    linkedin: v.optional(v.string()),
    github: v.optional(v.string()),
    skills: v.optional(v.array(v.string())),
    openToWork: v.optional(v.boolean()),
  }).index("by_token", ["tokenIdentifier"]),

  experiences: defineTable({
    tokenIdentifier: v.string(),
    title: v.string(),
    company: v.string(),
    startDate: v.string(),
    endDate: v.optional(v.string()),
    isCurrent: v.boolean(),
    location: v.optional(v.string()),
    description: v.optional(v.string()),
    bullets: v.optional(v.array(v.string())),
  }).index("by_token", ["tokenIdentifier"]),

  educations: defineTable({
    tokenIdentifier: v.string(),
    school: v.string(),
    degree: v.optional(v.string()),
    field: v.optional(v.string()),
    startYear: v.optional(v.number()),
    endYear: v.optional(v.number()),
    description: v.optional(v.string()),
  }).index("by_token", ["tokenIdentifier"]),

  certifications: defineTable({
    tokenIdentifier: v.string(),
    name: v.string(),
    issuer: v.string(),
    issueDate: v.optional(v.string()),
    credentialUrl: v.optional(v.string()),
  }).index("by_token", ["tokenIdentifier"]),

  profileFiles: defineTable({
    tokenIdentifier: v.string(),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
  }).index("by_token", ["tokenIdentifier"]),

  jobMetrics: defineTable({
    jobPostingId: v.id("jobPostings"),
    clerkOrgId: v.string(),
    viewCount: v.number(),
    applicationCount: v.number(),
  }).index("by_job", ["jobPostingId"]),

  savedJobAlerts: defineTable({
    tokenIdentifier: v.string(),
    name: v.string(),
    search: v.optional(v.string()),
    locationSubstring: v.optional(v.string()),
    locationType: v.optional(
      v.union(v.literal("onsite"), v.literal("remote"), v.literal("hybrid"))
    ),
    employmentType: v.optional(
      v.union(
        v.literal("full-time"),
        v.literal("part-time"),
        v.literal("contract"),
        v.literal("internship")
      )
    ),
    notifyDaily: v.boolean(),
    notifyWeekly: v.boolean(),
    /** Highest job `_creationTime` already included in a notification (watermark). */
    lastWatermark: v.optional(v.number()),
    updatedAt: v.number(),
  }).index("by_token", ["tokenIdentifier"]),

  jobSeekerNotifications: defineTable({
    tokenIdentifier: v.string(),
    title: v.string(),
    body: v.string(),
    kind: v.optional(
      v.union(v.literal("job_alert"), v.literal("application"))
    ),
    applicationId: v.optional(v.id("applications")),
    savedJobAlertId: v.optional(v.id("savedJobAlerts")),
    linkPath: v.optional(v.string()),
    read: v.boolean(),
  }).index("by_token", ["tokenIdentifier"]),

  talentPoolCandidates: defineTable({
    clerkOrgId: v.string(),
    applicationId: v.optional(v.id("applications")),
    tokenIdentifier: v.optional(v.string()),
    applicantEmail: v.string(),
    applicantName: v.string(),
    note: v.optional(v.string()),
    savedFromJobPostingId: v.optional(v.id("jobPostings")),
  }).index("by_org", ["clerkOrgId"]),

  organizationWebhooks: defineTable({
    clerkOrgId: v.string(),
    url: v.string(),
    signingSecret: v.optional(v.string()),
    enabled: v.boolean(),
    eventTypes: v.array(v.literal("application.created")),
  }).index("by_org", ["clerkOrgId"]),

  /** Tracks Lipa na M-Pesa STK attempts; Convex subscription grants on verified success callbacks. */
  mpesaPayments: defineTable({
    issuerTokenIdentifier: v.string(),
    clerkOrgId: v.string(),
    /** Billing SKU — subscriptions (`pro_monthly`, legacy `starter`/`pro`) and listing packs. */
    plan: v.union(
      v.literal("pro_monthly"),
      v.literal("listing_single"),
      v.literal("listing_pack_5"),
      v.literal("starter"),
      v.literal("pro")
    ),
    amountKes: v.number(),
    phoneNumber: v.string(),
    checkoutRequestId: v.optional(v.string()),
    /** Set when Daraja acknowledges STK initiation; used to delay treating stkquery negatives as failures. */
    stkPromptSentAt: v.optional(v.number()),
    mpesaReceiptNumber: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("success"),
      v.literal("failed")
    ),
    createdAt: v.number(),
  })
    .index("by_checkoutRequestId", ["checkoutRequestId"])
    .index("by_issuerTokenIdentifier", ["issuerTokenIdentifier"])
    .index("by_status_createdAt", ["status", "createdAt"]),

  /** Tracks Stripe Checkout Sessions for one-time listing credit purchases. */
  stripePayments: defineTable({
    issuerTokenIdentifier: v.string(),
    clerkOrgId: v.string(),
    product: v.union(v.literal("listing_single"), v.literal("listing_pack_5")),
    credits: v.number(),
    amountUsdCents: v.number(),
    stripeSessionId: v.optional(v.string()),
    stripePaymentIntentId: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("success"),
      v.literal("failed")
    ),
    createdAt: v.number(),
  })
    .index("by_stripeSessionId", ["stripeSessionId"])
    .index("by_issuerTokenIdentifier", ["issuerTokenIdentifier"])
    .index("by_status_createdAt", ["status", "createdAt"]),

  /** Convex-side platform admins (in addition to env bootstrap allowlist). */
  platformAdmins: defineTable({
    clerkUserId: v.string(),
    addedAt: v.number(),
    addedByClerkUserId: v.optional(v.string()),
  }).index("by_clerk_user_id", ["clerkUserId"]),

  adminAuditLog: defineTable({
    actorTokenIdentifier: v.optional(v.string()),
    action: v.string(),
    targetTable: v.optional(v.string()),
    targetId: v.optional(v.string()),
    payload: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_created", ["createdAt"]),

  /** Single-document site config (marketing + ad toggles); key is always GlobalKey. */
  siteSettings: defineTable({
    key: v.literal("global"),
    /** Third-party ads (e.g. AdSense) */
    adsenseEnabled: v.boolean(),
    adsenseClientSlot: v.optional(v.string()),
    jobsRailAdsEnabled: v.boolean(),
    homepageAdsEnabled: v.boolean(),
    /** When false, all employers get Pro access and unlimited job slots (launch mode). */
    employerBillingEnabled: v.optional(v.boolean()),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  siteAnalyticsDailyPath: defineTable({
    path: v.string(),
    dayStartUtcMs: v.number(),
    views: v.number(),
  })
    .index("by_path_and_day", ["path", "dayStartUtcMs"])
    .index("by_day_and_path", ["dayStartUtcMs", "path"]),

  jobIngestionRuns: defineTable({
    status: v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed")
    ),
    requestedBy: v.string(),
    sources: v.array(v.string()),
    maxPagesPerSource: v.number(),
    dryRun: v.boolean(),
    stats: v.object({
      found: v.number(),
      inserted: v.number(),
      updated: v.number(),
      skipped: v.number(),
      errors: v.number(),
    }),
    log: v.array(v.string()),
    /** JSON cursor: { sourceIndex, page } */
    cursor: v.optional(v.string()),
    startedAt: v.number(),
    finishedAt: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  }).index("by_started", ["startedAt"]),

  sponsoredPlacements: defineTable({
    slotKey: sponsoredPlacementSlotValidator,
    title: v.string(),
    imageUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    href: v.string(),
    sponsorLabel: v.optional(v.string()),
    priority: v.number(),
    active: v.boolean(),
    startAt: v.optional(v.number()),
    endAt: v.optional(v.number()),
    impressionCount: v.number(),
    clickCount: v.number(),
  })
    .index("by_slot", ["slotKey"])
    .index("by_active_slot", ["active", "slotKey"]),
});
