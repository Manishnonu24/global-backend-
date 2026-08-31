import { draftMode } from "next/headers";

export async function isExplicitCmsPreview(searchParams) {
  const draft = await draftMode();
  const params = await Promise.resolve(searchParams);

  const value = Array.isArray(params?.cmsPreview)
    ? params.cmsPreview[0]
    : params?.cmsPreview;

  return draft.isEnabled && value === "1";
}
