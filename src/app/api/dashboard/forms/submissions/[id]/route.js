import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkSitePermission } from "@/lib/apiAuth";
import { apiSuccess } from "@/core/errors";

export async function PUT(req, context) {
  const params = await context.params;
  const id = params?.id;
  const auth = await checkSitePermission(req, "EDITOR");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const { status, notes } = body;

    const submission = await prisma.contactFormSubmission.findFirst({
      where: { id, siteId: auth.siteId }
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    const updated = await prisma.contactFormSubmission.update({
      where: { id },
      data: {
        status: status !== undefined ? status : submission.status,
        notes: notes !== undefined ? notes : submission.notes
      }
    });

    return NextResponse.json(apiSuccess({ submission: updated }));
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error", message: err.message }, { status: 500 });
  }
}

export async function DELETE(req, context) {
  const params = await context.params;
  const id = params?.id;
  const auth = await checkSitePermission(req, "EDITOR");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const submission = await prisma.contactFormSubmission.findFirst({
      where: { id, siteId: auth.siteId }
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    await prisma.contactFormSubmission.delete({ where: { id } });

    return NextResponse.json(apiSuccess({ message: "Submission deleted successfully" }));
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error", message: err.message }, { status: 500 });
  }
}
