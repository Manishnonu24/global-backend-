import { NextResponse } from "next/server";
import { checkSitePermission } from "@/lib/apiAuth";
import { settingsService } from "@/services/settings.service";
import { apiSuccess } from "@/core/errors";

export async function GET(req) {
  const auth = await checkSitePermission(req, "ADMIN");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const config = await settingsService.getSettingsField(
      auth.siteId,
      "performanceConfig",
    );
    return NextResponse.json(
      apiSuccess({
        performanceConfig: config || {
          lazyLoading: true,
          lazyLoadImages: true,
          lazyLoadVideos: true,
          compressImagesOnUpload: true,
          browserCachingDays: 7,
          minifyHtml: false,
          deferNonEssentialScripts: true,
        },
      }),
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Internal Server Error", message: err.message },
      { status: 500 },
    );
  }
}

export async function PUT(req) {
  const auth = await checkSitePermission(req, "ADMIN");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const {
      lazyLoading,
      lazyLoadImages,
      lazyLoadVideos,
      compressImagesOnUpload,
      browserCachingDays,
      minifyHtml,
      deferNonEssentialScripts,
    } = body;

    const currentConfig =
      (await settingsService.getSettingsField(
        auth.siteId,
        "performanceConfig",
      )) || {};
    const updatedConfig = {
      lazyLoading:
        lazyLoading !== undefined
          ? !!lazyLoading
          : (currentConfig.lazyLoading ?? true),
      lazyLoadImages:
        lazyLoadImages !== undefined
          ? !!lazyLoadImages
          : (currentConfig.lazyLoadImages ?? true),
      lazyLoadVideos:
        lazyLoadVideos !== undefined
          ? !!lazyLoadVideos
          : (currentConfig.lazyLoadVideos ?? true),
      compressImagesOnUpload:
        compressImagesOnUpload !== undefined
          ? !!compressImagesOnUpload
          : (currentConfig.compressImagesOnUpload ?? true),
      browserCachingDays:
        browserCachingDays !== undefined
          ? parseInt(browserCachingDays, 10) || 7
          : (currentConfig.browserCachingDays ?? 7),
      minifyHtml:
        minifyHtml !== undefined
          ? !!minifyHtml
          : (currentConfig.minifyHtml ?? false),
      deferNonEssentialScripts:
        deferNonEssentialScripts !== undefined
          ? !!deferNonEssentialScripts
          : (currentConfig.deferNonEssentialScripts ?? true),
    };

    const config = await settingsService.updateSettingsField(
      auth.siteId,
      "performanceConfig",
      updatedConfig,
      auth.user.id,
    );

    return NextResponse.json(apiSuccess({ performanceConfig: config }));
  } catch (err) {
    return NextResponse.json(
      { error: "Internal Server Error", message: err.message },
      { status: 500 },
    );
  }
}
