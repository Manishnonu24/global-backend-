import React from "react";
import MagazineEditor from "../MagazineEditor";
import { requireAuth } from "@/lib/requireAuth";

export const metadata = {
  title: "New Magazine | Global Backend Admin",
};

export default async function NewMagazinePage() {
  const user = await requireAuth();
  if (!user) return null;

  return <MagazineEditor />;
}
