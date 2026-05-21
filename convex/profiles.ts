import { mutation, query, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { throwIfJobSeekerSuspended } from "./lib/jobSeekerAccess";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function requireAuth(ctx: MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  await throwIfJobSeekerSuspended(ctx, identity.tokenIdentifier);
  return identity;
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await ctx.db
      .query("profiles")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
  },
});

export const upsertProfile = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }
    return await ctx.db.insert("profiles", {
      tokenIdentifier: identity.tokenIdentifier,
      ...args,
    });
  },
});

// ─── Experiences ──────────────────────────────────────────────────────────────

export const listMyExperiences = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return await ctx.db
      .query("experiences")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .order("desc")
      .take(50);
  },
});

export const addExperience = mutation({
  args: {
    title: v.string(),
    company: v.string(),
    startDate: v.string(),
    endDate: v.optional(v.string()),
    isCurrent: v.boolean(),
    location: v.optional(v.string()),
    description: v.optional(v.string()),
    bullets: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    return await ctx.db.insert("experiences", {
      tokenIdentifier: identity.tokenIdentifier,
      ...args,
    });
  },
});

export const updateExperience = mutation({
  args: {
    id: v.id("experiences"),
    title: v.string(),
    company: v.string(),
    startDate: v.string(),
    endDate: v.optional(v.string()),
    isCurrent: v.boolean(),
    location: v.optional(v.string()),
    description: v.optional(v.string()),
    bullets: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    const { id, ...fields } = args;
    const doc = await ctx.db.get(id);
    if (!doc || doc.tokenIdentifier !== identity.tokenIdentifier) {
      throw new Error("Not found or unauthorized");
    }
    await ctx.db.patch(id, fields);
  },
});

export const deleteExperience = mutation({
  args: { id: v.id("experiences") },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    const doc = await ctx.db.get(args.id);
    if (!doc || doc.tokenIdentifier !== identity.tokenIdentifier) {
      throw new Error("Not found or unauthorized");
    }
    await ctx.db.delete(args.id);
  },
});

// ─── Educations ───────────────────────────────────────────────────────────────

export const listMyEducations = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return await ctx.db
      .query("educations")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .order("desc")
      .take(20);
  },
});

export const addEducation = mutation({
  args: {
    school: v.string(),
    degree: v.optional(v.string()),
    field: v.optional(v.string()),
    startYear: v.optional(v.number()),
    endYear: v.optional(v.number()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    return await ctx.db.insert("educations", {
      tokenIdentifier: identity.tokenIdentifier,
      ...args,
    });
  },
});

export const updateEducation = mutation({
  args: {
    id: v.id("educations"),
    school: v.string(),
    degree: v.optional(v.string()),
    field: v.optional(v.string()),
    startYear: v.optional(v.number()),
    endYear: v.optional(v.number()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    const { id, ...fields } = args;
    const doc = await ctx.db.get(id);
    if (!doc || doc.tokenIdentifier !== identity.tokenIdentifier) {
      throw new Error("Not found or unauthorized");
    }
    await ctx.db.patch(id, fields);
  },
});

export const deleteEducation = mutation({
  args: { id: v.id("educations") },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    const doc = await ctx.db.get(args.id);
    if (!doc || doc.tokenIdentifier !== identity.tokenIdentifier) {
      throw new Error("Not found or unauthorized");
    }
    await ctx.db.delete(args.id);
  },
});

// ─── Certifications ───────────────────────────────────────────────────────────

export const listMyCertifications = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return await ctx.db
      .query("certifications")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .order("desc")
      .take(20);
  },
});

export const addCertification = mutation({
  args: {
    name: v.string(),
    issuer: v.string(),
    issueDate: v.optional(v.string()),
    credentialUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    return await ctx.db.insert("certifications", {
      tokenIdentifier: identity.tokenIdentifier,
      ...args,
    });
  },
});

export const updateCertification = mutation({
  args: {
    id: v.id("certifications"),
    name: v.string(),
    issuer: v.string(),
    issueDate: v.optional(v.string()),
    credentialUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    const { id, ...fields } = args;
    const doc = await ctx.db.get(id);
    if (!doc || doc.tokenIdentifier !== identity.tokenIdentifier) {
      throw new Error("Not found or unauthorized");
    }
    await ctx.db.patch(id, fields);
  },
});

export const deleteCertification = mutation({
  args: { id: v.id("certifications") },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    const doc = await ctx.db.get(args.id);
    if (!doc || doc.tokenIdentifier !== identity.tokenIdentifier) {
      throw new Error("Not found or unauthorized");
    }
    await ctx.db.delete(args.id);
  },
});

// ─── Profile Files ────────────────────────────────────────────────────────────

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const addProfileFile = mutation({
  args: {
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    return await ctx.db.insert("profileFiles", {
      tokenIdentifier: identity.tokenIdentifier,
      ...args,
    });
  },
});

export const listMyFiles = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return await ctx.db
      .query("profileFiles")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .order("desc")
      .take(10);
  },
});

export const getFileUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const getMyProfileSummary = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    const experienceCount = await ctx.db
      .query("experiences")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .take(100);

    const educationCount = await ctx.db
      .query("educations")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .take(100);

    const latestFile = await ctx.db
      .query("profileFiles")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .order("desc")
      .first();

    return {
      name: user?.name ?? "",
      email: user?.email ?? "",
      headline: profile?.headline,
      location: profile?.location,
      skills: profile?.skills ?? [],
      phone: profile?.phone,
      experienceCount: experienceCount.length,
      educationCount: educationCount.length,
      latestFile: latestFile ?? null,
    };
  },
});

export const deleteProfileFile = mutation({
  args: { id: v.id("profileFiles") },
  handler: async (ctx, args) => {
    const identity = await requireAuth(ctx);
    const doc = await ctx.db.get(args.id);
    if (!doc || doc.tokenIdentifier !== identity.tokenIdentifier) {
      throw new Error("Not found or unauthorized");
    }
    await ctx.storage.delete(doc.storageId);
    await ctx.db.delete(args.id);
  },
});
