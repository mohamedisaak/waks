/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin_access from "../admin/access.js";
import type * as admin_actions from "../admin/actions.js";
import type * as admin_applications from "../admin/applications.js";
import type * as admin_financials from "../admin/financials.js";
import type * as admin_jobIngestion from "../admin/jobIngestion.js";
import type * as admin_jobs from "../admin/jobs.js";
import type * as admin_monetization from "../admin/monetization.js";
import type * as admin_organizations from "../admin/organizations.js";
import type * as admin_overview from "../admin/overview.js";
import type * as admin_platformAdmins from "../admin/platformAdmins.js";
import type * as admin_sharedValidators from "../admin/sharedValidators.js";
import type * as admin_siteTraffic from "../admin/siteTraffic.js";
import type * as admin_usersJobseekers from "../admin/usersJobseekers.js";
import type * as analytics from "../analytics.js";
import type * as applications from "../applications.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as integrations from "../integrations.js";
import type * as jobAlerts from "../jobAlerts.js";
import type * as jobIngestion_actions from "../jobIngestion/actions.js";
import type * as jobIngestion_adapters_brightermonday from "../jobIngestion/adapters/brightermonday.js";
import type * as jobIngestion_adapters_fuzu from "../jobIngestion/adapters/fuzu.js";
import type * as jobIngestion_adapters_index from "../jobIngestion/adapters/index.js";
import type * as jobIngestion_adapters_myjobmag from "../jobIngestion/adapters/myjobmag.js";
import type * as jobIngestion_cleanup from "../jobIngestion/cleanup.js";
import type * as jobIngestion_constants from "../jobIngestion/constants.js";
import type * as jobIngestion_extractApplication from "../jobIngestion/extractApplication.js";
import type * as jobIngestion_fetchHtml from "../jobIngestion/fetchHtml.js";
import type * as jobIngestion_heuristics from "../jobIngestion/heuristics.js";
import type * as jobIngestion_parseJobSections from "../jobIngestion/parseJobSections.js";
import type * as jobIngestion_runs from "../jobIngestion/runs.js";
import type * as jobIngestion_seed from "../jobIngestion/seed.js";
import type * as jobIngestion_types from "../jobIngestion/types.js";
import type * as jobIngestion_upsert from "../jobIngestion/upsert.js";
import type * as jobs from "../jobs.js";
import type * as lib_adminAudit from "../lib/adminAudit.js";
import type * as lib_adminListPagination from "../lib/adminListPagination.js";
import type * as lib_employerBillingMode from "../lib/employerBillingMode.js";
import type * as lib_jobPublicVisibility from "../lib/jobPublicVisibility.js";
import type * as lib_jobSeekerAccess from "../lib/jobSeekerAccess.js";
import type * as lib_jobUtils from "../lib/jobUtils.js";
import type * as lib_listingSlots from "../lib/listingSlots.js";
import type * as lib_notificationTypes from "../lib/notificationTypes.js";
import type * as lib_orgEmployerModeration from "../lib/orgEmployerModeration.js";
import type * as lib_platformAdmin from "../lib/platformAdmin.js";
import type * as lib_siteSettingsDoc from "../lib/siteSettingsDoc.js";
import type * as maintenance from "../maintenance.js";
import type * as mpesaPayments from "../mpesaPayments.js";
import type * as notifications_context from "../notifications/context.js";
import type * as notifications_delivery from "../notifications/delivery.js";
import type * as notifications_emailTemplates from "../notifications/emailTemplates.js";
import type * as notifications_enqueue from "../notifications/enqueue.js";
import type * as notifications_preferences from "../notifications/preferences.js";
import type * as notifications_reminders from "../notifications/reminders.js";
import type * as orgWebhooks from "../orgWebhooks.js";
import type * as organizations from "../organizations.js";
import type * as profiles from "../profiles.js";
import type * as siteAnalytics from "../siteAnalytics.js";
import type * as sitePublic from "../sitePublic.js";
import type * as stripePayments from "../stripePayments.js";
import type * as talentPool from "../talentPool.js";
import type * as users from "../users.js";
import type * as webhooks_clerk from "../webhooks/clerk.js";
import type * as webhooks_mpesa from "../webhooks/mpesa.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "admin/access": typeof admin_access;
  "admin/actions": typeof admin_actions;
  "admin/applications": typeof admin_applications;
  "admin/financials": typeof admin_financials;
  "admin/jobIngestion": typeof admin_jobIngestion;
  "admin/jobs": typeof admin_jobs;
  "admin/monetization": typeof admin_monetization;
  "admin/organizations": typeof admin_organizations;
  "admin/overview": typeof admin_overview;
  "admin/platformAdmins": typeof admin_platformAdmins;
  "admin/sharedValidators": typeof admin_sharedValidators;
  "admin/siteTraffic": typeof admin_siteTraffic;
  "admin/usersJobseekers": typeof admin_usersJobseekers;
  analytics: typeof analytics;
  applications: typeof applications;
  crons: typeof crons;
  http: typeof http;
  integrations: typeof integrations;
  jobAlerts: typeof jobAlerts;
  "jobIngestion/actions": typeof jobIngestion_actions;
  "jobIngestion/adapters/brightermonday": typeof jobIngestion_adapters_brightermonday;
  "jobIngestion/adapters/fuzu": typeof jobIngestion_adapters_fuzu;
  "jobIngestion/adapters/index": typeof jobIngestion_adapters_index;
  "jobIngestion/adapters/myjobmag": typeof jobIngestion_adapters_myjobmag;
  "jobIngestion/cleanup": typeof jobIngestion_cleanup;
  "jobIngestion/constants": typeof jobIngestion_constants;
  "jobIngestion/extractApplication": typeof jobIngestion_extractApplication;
  "jobIngestion/fetchHtml": typeof jobIngestion_fetchHtml;
  "jobIngestion/heuristics": typeof jobIngestion_heuristics;
  "jobIngestion/parseJobSections": typeof jobIngestion_parseJobSections;
  "jobIngestion/runs": typeof jobIngestion_runs;
  "jobIngestion/seed": typeof jobIngestion_seed;
  "jobIngestion/types": typeof jobIngestion_types;
  "jobIngestion/upsert": typeof jobIngestion_upsert;
  jobs: typeof jobs;
  "lib/adminAudit": typeof lib_adminAudit;
  "lib/adminListPagination": typeof lib_adminListPagination;
  "lib/employerBillingMode": typeof lib_employerBillingMode;
  "lib/jobPublicVisibility": typeof lib_jobPublicVisibility;
  "lib/jobSeekerAccess": typeof lib_jobSeekerAccess;
  "lib/jobUtils": typeof lib_jobUtils;
  "lib/listingSlots": typeof lib_listingSlots;
  "lib/notificationTypes": typeof lib_notificationTypes;
  "lib/orgEmployerModeration": typeof lib_orgEmployerModeration;
  "lib/platformAdmin": typeof lib_platformAdmin;
  "lib/siteSettingsDoc": typeof lib_siteSettingsDoc;
  maintenance: typeof maintenance;
  mpesaPayments: typeof mpesaPayments;
  "notifications/context": typeof notifications_context;
  "notifications/delivery": typeof notifications_delivery;
  "notifications/emailTemplates": typeof notifications_emailTemplates;
  "notifications/enqueue": typeof notifications_enqueue;
  "notifications/preferences": typeof notifications_preferences;
  "notifications/reminders": typeof notifications_reminders;
  orgWebhooks: typeof orgWebhooks;
  organizations: typeof organizations;
  profiles: typeof profiles;
  siteAnalytics: typeof siteAnalytics;
  sitePublic: typeof sitePublic;
  stripePayments: typeof stripePayments;
  talentPool: typeof talentPool;
  users: typeof users;
  "webhooks/clerk": typeof webhooks_clerk;
  "webhooks/mpesa": typeof webhooks_mpesa;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
