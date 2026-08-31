import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkSitePermission } from "@/lib/apiAuth";

export async function GET(req) {
  const auth = await checkSitePermission(req, "EDITOR");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const submissions = await prisma.contactFormSubmission.findMany({
      where: { siteId: auth.siteId },
      orderBy: { createdAt: "desc" }
    });

    // Generate CSV string
    const headers = ["ID", "Name", "Email", "Phone", "Message", "Status", "Notes", "Created At"];
    const rows = submissions.map(sub => [
      sub.id,
      sub.name.replace(/"/g, '""'),
      sub.email.replace(/"/g, '""'),
      (sub.phone || "").replace(/"/g, '""'),
      sub.message.replace(/"/g, '""'),
      sub.status,
      (sub.notes || "").replace(/"/g, '""'),
      sub.createdAt.toISOString()
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(val => `"${val}"`).join(","))
    ].join("\n");

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="submissions_site_${auth.siteId}.csv"`
      }
    });
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error", message: err.message }, { status: 500 });
  }
}
