import { PrismaClient } from "../generated/prisma/index.js";

const globalForPrisma = globalThis;

if (globalForPrisma.prisma && (!globalForPrisma.prisma.notificationalert || !globalForPrisma.prisma.emaillog)) {
  console.log("🔄 Next.js dev cache has an out-of-sync Prisma instance (missing notificationAlert or emaillog). Recreating client...");
  globalForPrisma.prisma = undefined;
}

let databaseUrl = process.env.DATABASE_URL || "";
// Default connection limit of 25 provides solid concurrency for Next.js SSR and middleware queries.
const connectionLimit = parseInt(process.env.DATABASE_CONNECTION_LIMIT, 10) || 25;
if (databaseUrl) {
  if (!databaseUrl.includes("connection_limit")) {
    const separator = databaseUrl.includes("?") ? "&" : "?";
    databaseUrl = `${databaseUrl}${separator}connection_limit=${connectionLimit}`;
  }
  if (!databaseUrl.includes("connect_timeout")) {
    databaseUrl = `${databaseUrl}&connect_timeout=10`;
  }
  if (!databaseUrl.includes("pool_timeout")) {
    databaseUrl = `${databaseUrl}&pool_timeout=10`;
  }
}

const prismaOptions = databaseUrl
  ? {
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    }
  : {};

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient(prismaOptions);

const delegateAliases = {
  adAnalytic: "adanalytic",
  adCampaign: "adcampaign",
  adZone: "adzone",
  apiKey: "apikey",
  auditLog: "auditlog",
  campaignLog: "campaignlog",
  componentContent: "componentcontent",
  contactFormSubmission: "contactformsubmission",
  contentVersion: "contentversion",
  cookieConsentLog: "cookieconsentlog",
  emailCampaign: "emailcampaign",
  emailLog: "emaillog",
  emailTemplate: "emailtemplate",
  frontendProject: "frontendproject",
  globalSettings: "globalsettings",
  importBatch: "importbatch",
  importRecord: "importrecord",
  integrationManifest: "integrationmanifest",
  ipBlock: "ipblock",
  legalPage: "legalpage",
  loginHistory: "loginhistory",
  mediaFolder: "mediafolder",
  notificationAlert: "notificationalert",
  passwordReset: "passwordreset",
  pushNotification: "pushnotification",
  recentlyViewed: "recentlyviewed",
  recipeAllergen: "recipeallergen",
  recipeComment: "recipecomment",
  recipeLike: "recipelike",
  recipeRating: "reciperating",
  recipeTag: "recipetag",
  savedArticle: "savedarticle",
  savedRecipe: "savedrecipe",
  siteUser: "siteuser",
  subscriberList: "subscriberlist",
  subscriberListMember: "subscriberlistmember",
  syncedRoute: "syncedroute",
  systemErrorLog: "systemerrorlog",
  teamMember: "teammember",
  visitorLog: "visitorlog",
  webhookEvent: "webhookevent",
  webhookSubscription: "webhooksubscription",
};

for (const [alias, delegate] of Object.entries(delegateAliases)) {
  if (prisma[delegate] && !prisma[alias]) {
    Object.defineProperty(prisma, alias, {
      configurable: true,
      get() {
        return prisma[delegate];
      },
    });
  }
}

globalForPrisma.prisma = prisma;

export default prisma;
