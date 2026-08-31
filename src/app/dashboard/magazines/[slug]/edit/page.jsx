import React from "react";
import prisma from "@/lib/prisma";
import MagazineEditor from "../../MagazineEditor";
import { requireAuth } from "@/lib/requireAuth";
import { notFound } from "next/navigation";

export const metadata = {
  title: "Edit Magazine | Global Backend Admin",
};

export default async function EditMagazinePage({ params }) {
  const user = await requireAuth();
  if (!user) return null;

  const { slug } = await params;
  const magazine = await prisma.magazine.findUnique({
    where: { slug },
  });

  if (!magazine) {
    notFound();
  }

  return <MagazineEditor initialData={magazine} />;
}
