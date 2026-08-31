import { NextResponse } from "next/server";
import { securityService } from "@/services/security.service";
import { checkSitePermission } from "@/lib/apiAuth";
import { handleApiError, apiSuccess } from "@/core/errors";

export async function POST(req) {
  try {
    const auth = await checkSitePermission(req, "ADMIN");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { ip } = await req.json();
    if (!ip) {
      return NextResponse.json({ error: "ip address is required" }, { status: 400 });
    }

    const ipBlocklist = await securityService.blockIp(auth.siteId, ip, auth.user.id);

    return NextResponse.json(apiSuccess({ message: `IP ${ip} blocked successfully`, ipBlocklist }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req) {
  try {
    const auth = await checkSitePermission(req, "ADMIN");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const ip = searchParams.get("ip");

    if (!ip) {
      return NextResponse.json({ error: "ip parameter is required" }, { status: 400 });
    }

    const updatedBlocklist = await securityService.unblockIp(auth.siteId, ip, auth.user.id);

    return NextResponse.json(apiSuccess({ message: `IP ${ip} unblocked successfully`, ipBlocklist: updatedBlocklist }));
  } catch (err) {
    return handleApiError(err);
  }
}
