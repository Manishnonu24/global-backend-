// src/app/pages/[pageId]/edit/page.js
import PageEditorClient from "@/app/dashboard/pages/[pageId]/edit/pageEditorClient";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { requireAuth } from "@/lib/requireAuth";
import { getSiteForUser } from "@/lib/getSiteForUser";

function resolveFrontendUrlForRequest(value, requestHost) {
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  if (requestHost) {
    return `${protocol}://${requestHost}`;
  }
  return value || "http://localhost:3000";
}

export default async function PageEditorPage({ params, searchParams }) {
  const { pageId } = await params;
  const { mode } = await searchParams || {};

  if (!pageId) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Page Editor — Missing pageId</h1>
        <p>
          Use /pages/[pageId]/edit or include ?pageId=&lt;id&gt; to open the
          editor.
        </p>
      </div>
    );
  }

  // Verify auth and site ownership
  const user = await requireAuth();
  const site = await getSiteForUser(user);

  const page = await prisma.page.findFirst({
    where: { id: pageId, deletedAt: null },
    select: { id: true, title: true, slug: true, siteId: true },
  });

  if (!page) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Page Editor</h1>
        <p>Page not found for id: {pageId}</p>
      </div>
    );
  }

  // Ensure the page belongs to the user&apos;s active site
  if (site && page.siteId !== site.id) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Page Editor — Access Denied</h1>
        <p>This page does not belong to your active site.</p>
      </div>
    );
  }

  const settings = await prisma.globalSettings.findUnique({
    where: { siteId: page.siteId },
    select: { websiteSettings: true },
  });
  const requestHeaders = await headers();
  const frontendUrl = resolveFrontendUrlForRequest(
    settings?.websiteSettings?.domain || process.env.FRONTEND_URL,
    requestHeaders.get("host"),
  );

  // render the client editor and pass siteId
  return (
    <PageEditorClient
      pageId={page.id}
      siteId={page.siteId}
      pageTitle={page.title}
      frontendUrl={frontendUrl}
      mode={mode}
    />
  );
}
