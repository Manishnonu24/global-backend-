import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkSitePermission } from "@/lib/apiAuth";

export async function GET(req) {
  const auth = await checkSitePermission(req, "EDITOR");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const subscribers = await prisma.newsletter.findMany({
      where: { siteId: auth.siteId },
      orderBy: { createdAt: "desc" },
    });

    // Generate CSV string
    const headers = ["ID", "Email", "Status", "Subscribed At"];
    const rows = subscribers.map((sub) => [
      sub.id,
      sub.email.replace(/"/g, '""'),
      sub.status,
      sub.createdAt.toISOString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((val) => `"${val}"`).join(",")),
    ].join("\n");

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="newsletter_subscribers_site_${auth.siteId}.csv"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error", message: err.message }, { status: 500 });
  }
}
