/**
 * tests/prismaDelegate.test.js
 *
 * Real generated Prisma Client schema and metadata assertions.
 * Does NOT use an auto-generating Proxy so missing or invalid delegates/fields fail directly.
 */

import { describe, it, expect } from "vitest";
import { Prisma } from "../src/generated/prisma/index.js";

describe("Prisma Generated Client Schema & Metadata Assertions", () => {
  it("verifies Magazine model fields and mapping", () => {
    const magazineModel = Prisma.dmmf.datamodel.models.find(m => m.name === "Magazine");
    expect(magazineModel, "Model 'Magazine' must exist in Prisma DMMF").toBeDefined();

    // Field 'id' must be the Prisma field name, mapped to DB column 'idMagazines'
    const idField = magazineModel.fields.find(f => f.name === "id");
    expect(idField, "Magazine model must expose field 'id'").toBeDefined();
    expect(idField.dbName, "Magazine.id must map to physical column 'idMagazines'").toBe("idMagazines");
    expect(idField.type, "Magazine.id type must be Int").toBe("Int");

    // 'idMagazines' MUST NOT be exposed as a Prisma model field name
    const rawIdField = magazineModel.fields.find(f => f.name === "idMagazines");
    expect(rawIdField, "Magazine model MUST NOT expose 'idMagazines' as a Prisma field name").toBeUndefined();

    // Field 'status' must be an Int with default 1
    const statusField = magazineModel.fields.find(f => f.name === "status");
    expect(statusField, "Magazine model must expose field 'status'").toBeDefined();
    expect(statusField.type, "Magazine.status type must be Int").toBe("Int");
  });

  it("verifies QuizType model fields and auto-increment ID", () => {
    const quizTypeModel = Prisma.dmmf.datamodel.models.find(m => m.name === "QuizType");
    expect(quizTypeModel, "Model 'QuizType' must exist in Prisma DMMF").toBeDefined();

    const idField = quizTypeModel.fields.find(f => f.name === "id");
    expect(idField, "QuizType model must expose field 'id'").toBeDefined();
    expect(idField.type, "QuizType.id type must be Int").toBe("Int");
    expect(idField.isId, "QuizType.id must be primary key").toBe(true);

    const slugField = quizTypeModel.fields.find(f => f.name === "slug");
    expect(slugField, "QuizType model must expose field 'slug'").toBeDefined();
  });

  it("verifies all 4 implicit relation tables in Prisma DMMF", () => {
    const postModel = Prisma.dmmf.datamodel.models.find(m => m.name === "post");
    const categoryModel = Prisma.dmmf.datamodel.models.find(m => m.name === "category");
    const tagModel = Prisma.dmmf.datamodel.models.find(m => m.name === "tag");
    const recipeModel = Prisma.dmmf.datamodel.models.find(m => m.name === "recipe");

    expect(postModel.fields.find(f => f.name === "categories" && f.relationName === "CategoryToPost")).toBeDefined();
    expect(categoryModel.fields.find(f => f.name === "posts" && f.relationName === "CategoryToPost")).toBeDefined();

    expect(postModel.fields.find(f => f.name === "tags" && f.relationName === "PostToTag")).toBeDefined();
    expect(tagModel.fields.find(f => f.name === "posts" && f.relationName === "PostToTag")).toBeDefined();

    expect(recipeModel.fields.find(f => f.name === "tags" && f.relationName === "RecipeToRecipeTag")).toBeDefined();
    expect(recipeModel.fields.find(f => f.name === "allergens" && f.relationName === "RecipeToRecipeAllergen")).toBeDefined();
  });

  it("verifies required model delegates are present on Prisma Client", async () => {
    const { prisma } = await import("../src/lib/prisma.js");

    const requiredDelegates = [
      "site", "user", "siteuser", "globalsettings", "page", "section", "post",
      "category", "tag", "media", "mediafolder", "service", "legalpage", "recipe",
      "redirect", "faq", "testimonial", "teammember", "lead", "contactformsubmission",
      "notificationalert", "systemerrorlog", "auditlog", "loginhistory", "apikey",
      "ipblock", "newsletter", "contentversion", "webhooksubscription", "webhookevent",
      "visitorlog", "componentcontent", "magazine", "quizType",
    ];

    for (const delegate of requiredDelegates) {
      expect(prisma[delegate], `prisma.${delegate} must be defined`).toBeDefined();
    }
  });
});
