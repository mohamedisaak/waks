import { query } from "../_generated/server";
import { v } from "convex/values";
import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import type { Doc } from "../_generated/dataModel";
import { requirePlatformAdmin } from "../lib/platformAdmin";
import {
  ADMIN_LIST_SORT_CAP,
  paginateSortedArray,
} from "../lib/adminListPagination";
import {
  KES_PRO_MONTHLY_MINOR,
  USD_PRO_MONTHLY_MINOR,
} from "../../lib/billingCatalog";
import { effectiveOrgTier } from "../../lib/orgPlan";

const PAYMENT_SCAN_CAP = 2501;
const ORG_SCAN_CAP = 2501;

const paymentStatusValidator = v.union(
  v.literal("pending"),
  v.literal("success"),
  v.literal("failed")
);

const providerValidator = v.union(v.literal("mpesa"), v.literal("stripe"));

const byProductRow = v.object({
  product: v.string(),
  successCount: v.number(),
  collectedKesMinor: v.number(),
  collectedUsdCents: v.number(),
});

const summaryReturns = v.object({
  rangeStartMs: v.number(),
  rangeEndMs: v.number(),
  collectedKesMinor: v.number(),
  collectedUsdCents: v.number(),
  attemptCounts: v.object({
    mpesa: v.object({
      pending: v.number(),
      success: v.number(),
      failed: v.number(),
    }),
    stripe: v.object({
      pending: v.number(),
      success: v.number(),
      failed: v.number(),
    }),
  }),
  byProduct: v.array(byProductRow),
  estimatedMrr: v.object({
    proOrgCount: v.number(),
    kesMinor: v.number(),
    usdCents: v.number(),
    mpesaProCount: v.number(),
    clerkStripeProCount: v.number(),
    proNoBillingProviderCount: v.number(),
    proNoExpiryCount: v.number(),
    orgScanCapped: v.boolean(),
  }),
  paymentsScanCapped: v.boolean(),
});

const transactionRow = v.object({
  id: v.string(),
  provider: providerValidator,
  clerkOrgId: v.string(),
  product: v.string(),
  amountKesMinor: v.optional(v.number()),
  amountUsdCents: v.optional(v.number()),
  status: paymentStatusValidator,
  createdAt: v.number(),
  externalId: v.optional(v.string()),
});

const activeProOrgRow = v.object({
  _id: v.id("organizations"),
  name: v.string(),
  clerkOrgId: v.string(),
  plan: v.union(v.literal("free"), v.literal("starter"), v.literal("pro")),
  billingProvider: v.optional(
    v.union(v.literal("clerk_stripe"), v.literal("mpesa"))
  ),
  subscriptionExpiresAt: v.optional(v.number()),
});

type PaymentStatus = "pending" | "success" | "failed";

function inRange(createdAt: number, start: number, end: number): boolean {
  return createdAt >= start && createdAt < end;
}

async function loadMpesaPaymentsInRange(
  ctx: Parameters<typeof requirePlatformAdmin>[0],
  rangeStartMs: number,
  rangeEndMs: number,
  statusFilter?: PaymentStatus
) {
  const statuses: PaymentStatus[] =
    statusFilter ? [statusFilter] : ["pending", "success", "failed"];
  const rows: Doc<"mpesaPayments">[] = [];
  let capped = false;

  for (const status of statuses) {
    const batch = await ctx.db
      .query("mpesaPayments")
      .withIndex("by_status_createdAt", (q) => q.eq("status", status))
      .order("desc")
      .take(PAYMENT_SCAN_CAP);
    if (batch.length === PAYMENT_SCAN_CAP) capped = true;
    for (const row of batch) {
      if (inRange(row.createdAt, rangeStartMs, rangeEndMs)) {
        rows.push(row);
      }
    }
  }

  return { rows, capped };
}

async function loadStripePaymentsInRange(
  ctx: Parameters<typeof requirePlatformAdmin>[0],
  rangeStartMs: number,
  rangeEndMs: number,
  statusFilter?: PaymentStatus
) {
  const statuses: PaymentStatus[] =
    statusFilter ? [statusFilter] : ["pending", "success", "failed"];
  const rows: Doc<"stripePayments">[] = [];
  let capped = false;

  for (const status of statuses) {
    const batch = await ctx.db
      .query("stripePayments")
      .withIndex("by_status_createdAt", (q) => q.eq("status", status))
      .order("desc")
      .take(PAYMENT_SCAN_CAP);
    if (batch.length === PAYMENT_SCAN_CAP) capped = true;
    for (const row of batch) {
      if (inRange(row.createdAt, rangeStartMs, rangeEndMs)) {
        rows.push(row);
      }
    }
  }

  return { rows, capped };
}

function bumpProductAggregate(
  map: Map<
    string,
    { successCount: number; collectedKesMinor: number; collectedUsdCents: number }
  >,
  product: string,
  kesMinor: number,
  usdCents: number,
  isSuccess: boolean
) {
  const cur = map.get(product) ?? {
    successCount: 0,
    collectedKesMinor: 0,
    collectedUsdCents: 0,
  };
  if (isSuccess) {
    cur.successCount += 1;
    cur.collectedKesMinor += kesMinor;
    cur.collectedUsdCents += usdCents;
  }
  map.set(product, cur);
}

function countByStatus<T extends { status: PaymentStatus }>(
  rows: readonly T[]
): { pending: number; success: number; failed: number } {
  const counts = { pending: 0, success: 0, failed: 0 };
  for (const row of rows) {
    counts[row.status] += 1;
  }
  return counts;
}

export const summary = query({
  args: {
    viewerClockMs: v.number(),
    rangeStartMs: v.number(),
    rangeEndMs: v.number(),
  },
  returns: summaryReturns,
  handler: async (ctx, args) => {
    await requirePlatformAdmin(ctx);

    const [mpesa, stripe] = await Promise.all([
      loadMpesaPaymentsInRange(
        ctx,
        args.rangeStartMs,
        args.rangeEndMs
      ),
      loadStripePaymentsInRange(
        ctx,
        args.rangeStartMs,
        args.rangeEndMs
      ),
    ]);

    let collectedKesMinor = 0;
    let collectedUsdCents = 0;
    const byProductMap = new Map<
      string,
      {
        successCount: number;
        collectedKesMinor: number;
        collectedUsdCents: number;
      }
    >();

    for (const row of mpesa.rows) {
      const kesMinor = row.amountKes * 100;
      if (row.status === "success") {
        collectedKesMinor += kesMinor;
      }
      bumpProductAggregate(
        byProductMap,
        row.plan,
        row.status === "success" ? kesMinor : 0,
        0,
        row.status === "success"
      );
    }

    for (const row of stripe.rows) {
      if (row.status === "success") {
        collectedUsdCents += row.amountUsdCents;
      }
      bumpProductAggregate(
        byProductMap,
        row.product,
        0,
        row.status === "success" ? row.amountUsdCents : 0,
        row.status === "success"
      );
    }

    const byProduct = [...byProductMap.entries()]
      .map(([product, agg]) => ({
        product,
        successCount: agg.successCount,
        collectedKesMinor: agg.collectedKesMinor,
        collectedUsdCents: agg.collectedUsdCents,
      }))
      .sort((a, b) => b.collectedKesMinor + b.collectedUsdCents - (a.collectedKesMinor + a.collectedUsdCents));

    const orgRows = await ctx.db
      .query("organizations")
      .order("desc")
      .take(ORG_SCAN_CAP);
    const orgScanCapped = orgRows.length === ORG_SCAN_CAP;

    let proOrgCount = 0;
    let kesMinor = 0;
    let usdCents = 0;
    let mpesaProCount = 0;
    let clerkStripeProCount = 0;
    let proNoBillingProviderCount = 0;
    let proNoExpiryCount = 0;

    for (const org of orgRows) {
      const tier = effectiveOrgTier(
        org.plan,
        org.subscriptionExpiresAt,
        args.viewerClockMs
      );
      if (tier !== "pro") continue;

      proOrgCount += 1;
      if (org.subscriptionExpiresAt === undefined) {
        proNoExpiryCount += 1;
      }

      if (org.billingProvider === "mpesa") {
        mpesaProCount += 1;
        kesMinor += KES_PRO_MONTHLY_MINOR;
      } else if (org.billingProvider === "clerk_stripe") {
        clerkStripeProCount += 1;
        usdCents += USD_PRO_MONTHLY_MINOR;
      } else {
        proNoBillingProviderCount += 1;
      }
    }

    return {
      rangeStartMs: args.rangeStartMs,
      rangeEndMs: args.rangeEndMs,
      collectedKesMinor,
      collectedUsdCents,
      attemptCounts: {
        mpesa: countByStatus(mpesa.rows),
        stripe: countByStatus(stripe.rows),
      },
      byProduct,
      estimatedMrr: {
        proOrgCount,
        kesMinor,
        usdCents,
        mpesaProCount,
        clerkStripeProCount,
        proNoBillingProviderCount,
        proNoExpiryCount,
        orgScanCapped,
      },
      paymentsScanCapped: mpesa.capped || stripe.capped,
    };
  },
});

type NormalizedTransaction = {
  id: string;
  provider: "mpesa" | "stripe";
  clerkOrgId: string;
  product: string;
  amountKesMinor?: number;
  amountUsdCents?: number;
  status: PaymentStatus;
  createdAt: number;
  externalId?: string;
};

function normalizeTransactions(
  mpesaRows: Doc<"mpesaPayments">[],
  stripeRows: Doc<"stripePayments">[]
): NormalizedTransaction[] {
  const merged: NormalizedTransaction[] = [];

  for (const row of mpesaRows) {
    merged.push({
      id: `mpesa:${row._id}`,
      provider: "mpesa",
      clerkOrgId: row.clerkOrgId,
      product: row.plan,
      amountKesMinor: row.amountKes * 100,
      status: row.status,
      createdAt: row.createdAt,
      externalId: row.mpesaReceiptNumber ?? row.checkoutRequestId,
    });
  }

  for (const row of stripeRows) {
    merged.push({
      id: `stripe:${row._id}`,
      provider: "stripe",
      clerkOrgId: row.clerkOrgId,
      product: row.product,
      amountUsdCents: row.amountUsdCents,
      status: row.status,
      createdAt: row.createdAt,
      externalId: row.stripeSessionId ?? row.stripePaymentIntentId,
    });
  }

  merged.sort((a, b) => b.createdAt - a.createdAt);
  return merged;
}

export const transactions = query({
  args: {
    paginationOpts: paginationOptsValidator,
    viewerClockMs: v.number(),
    rangeStartMs: v.number(),
    rangeEndMs: v.number(),
    status: v.optional(paymentStatusValidator),
    provider: v.optional(providerValidator),
  },
  returns: paginationResultValidator(transactionRow),
  handler: async (ctx, args) => {
    await requirePlatformAdmin(ctx);

    const loadMpesa = args.provider !== "stripe";
    const loadStripe = args.provider !== "mpesa";

    const [mpesa, stripe] = await Promise.all([
      loadMpesa
        ? loadMpesaPaymentsInRange(
            ctx,
            args.rangeStartMs,
            args.rangeEndMs,
            args.status
          )
        : Promise.resolve({ rows: [], capped: false }),
      loadStripe
        ? loadStripePaymentsInRange(
            ctx,
            args.rangeStartMs,
            args.rangeEndMs,
            args.status
          )
        : Promise.resolve({ rows: [], capped: false }),
    ]);

    const merged = normalizeTransactions(mpesa.rows, stripe.rows);
    const slice =
      merged.length > ADMIN_LIST_SORT_CAP || mpesa.capped || stripe.capped
        ? merged.slice(0, ADMIN_LIST_SORT_CAP)
        : merged;

    return paginateSortedArray(slice, args.paginationOpts);
  },
});

export const activeProOrgs = query({
  args: {
    viewerClockMs: v.number(),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(activeProOrgRow),
  handler: async (ctx, args) => {
    await requirePlatformAdmin(ctx);

    const orgRows = await ctx.db
      .query("organizations")
      .order("desc")
      .take(ORG_SCAN_CAP);

    const active: Doc<"organizations">[] = [];
    for (const org of orgRows) {
      const tier = effectiveOrgTier(
        org.plan,
        org.subscriptionExpiresAt,
        args.viewerClockMs
      );
      if (tier === "pro") active.push(org);
    }

    active.sort((a, b) => b._creationTime - a._creationTime);

    const page = paginateSortedArray(active, args.paginationOpts);
    return {
      ...page,
      page: page.page.map((org) => ({
        _id: org._id,
        name: org.name,
        clerkOrgId: org.clerkOrgId,
        plan: org.plan,
        billingProvider: org.billingProvider,
        subscriptionExpiresAt: org.subscriptionExpiresAt,
      })),
    };
  },
});
