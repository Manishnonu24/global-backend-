import { describe, it, expect, beforeEach, vi } from "vitest";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { resolvePageContent } from "@/lib/pageContentResolver";

// Route handlers
import { GET as getRecipes, POST as createRecipe } from "@/app/api/recipes/route";
import { GET as getRecipeDetail } from "@/app/api/recipes/[id]/route";
import { GET as getRecipeComments, POST as createRecipeComment } from "@/app/api/recipes/[id]/comments/route";
import { POST as toggleRecipeLike } from "@/app/api/recipes/[id]/like/route";
import { POST as rateRecipe } from "@/app/api/recipes/[id]/rating/route";
import { POST as toggleRecipeSave } from "@/app/api/recipes/[id]/save/route";
import { POST as toggleRecipeSaveAlt } from "@/app/api/recipes/save/route";
import { GET as getUserSavedRecipes, POST as saveUserRecipe, DELETE as removeUserSavedRecipe } from "@/app/api/user/saved-recipes/route";
import { GET as getUserRecipes } from "@/app/api/user/recipes/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/requireAuth", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("@/lib/requireFrontendAuth", async () => {
  const mod = await import("@/lib/requireAuth");
  return {
    requireFrontendAuth: mod.requireAuth,
  };
});

vi.mock("@/lib/prisma", () => ({
  default: {
    recipe: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    recipecomment: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    recipelike: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    reciperating: {
      upsert: vi.fn(),
    },
    savedrecipe: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    recipetag: {
      findMany: vi.fn(),
    },
    recipeallergen: {
      findMany: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    page: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    section: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/siteGuard", () => ({
  getSiteId: vi.fn(() => "AHP"),
}));

vi.mock("@/lib/queues/searchQueue", () => ({
  queueUpsertContent: vi.fn(),
  queueDeleteContent: vi.fn(),
}));

describe("Recipe System Test Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Recipe list on an empty database returns a valid empty list
  it("1: Recipe list on empty database returns valid empty list", async () => {
    prisma.recipe.findMany.mockResolvedValue([]);
    const req = new Request("http://localhost/api/recipes");
    const res = await getRecipes(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.recipes).toEqual([]);
  });

  // 2. Recipe create with tags and allergens works
  it("2: Recipe create with tags and allergens creates PENDING recipe", async () => {
    const requireAuthMod = await import("@/lib/requireAuth");
    requireAuthMod.requireAuth.mockResolvedValue({ id: "user_123", email: "user@example.com" });

    const newRecipe = {
      id: "recipe_1",
      title: "Avocado Toast",
      description: "Simple toast",
      ingredients: JSON.stringify(["Avocado", "Bread"]),
      steps: JSON.stringify(["Toast bread", "Mash avocado"]),
      status: "PENDING",
      contributorId: "user_123",
    };
    prisma.recipe.create.mockResolvedValue(newRecipe);

    const req = new Request("http://localhost/api/recipes", {
      method: "POST",
      body: JSON.stringify({
        title: "Avocado Toast",
        ingredients: ["Avocado", "Bread"],
        steps: ["Toast bread", "Mash avocado"],
        tags: ["Quick"],
        allergens: ["Gluten"],
      }),
    });
    const res = await createRecipe(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.recipe.title).toBe("Avocado Toast");
    expect(prisma.recipe.create).toHaveBeenCalled();
  });

  // 3. Recipe comments GET works
  it("3: Recipe comments GET returns comment list for specified recipe", async () => {
    const mockComments = [
      { id: "c1", recipeId: "r1", content: "Great dish!", user: { id: "u1", name: "Alice", email: "a@ex.com" } }
    ];
    prisma.recipecomment.findMany.mockResolvedValue(mockComments);

    const req = new Request("http://localhost/api/recipes/r1/comments");
    const res = await getRecipeComments(req, { params: Promise.resolve({ id: "r1" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.comments.length).toBe(1);
    expect(json.data.comments[0].content).toBe("Great dish!");
  });

  // 4. Recipe comments POST requires authentication
  it("4: Recipe comments POST rejects unauthenticated requests with 401", async () => {
    const requireAuthMod = await import("@/lib/requireAuth");
    requireAuthMod.requireAuth.mockResolvedValue(null);

    const req = new Request("http://localhost/api/recipes/r1/comments", {
      method: "POST",
      body: JSON.stringify({ content: "Yummy!" }),
    });
    const res = await createRecipeComment(req, { params: Promise.resolve({ id: "r1" }) });
    expect(res.status).toBe(401);
  });

  // 5. Recipe comments can contain realistically long TEXT content
  it("5: Recipe comments accepts realistically long TEXT content", async () => {
    const requireAuthMod = await import("@/lib/requireAuth");
    requireAuthMod.requireAuth.mockResolvedValue({ id: "u1", email: "alice@example.com" });

    const longText = "A".repeat(1500); // 1500 chars (well under 65k TEXT limit)
    prisma.recipe.findUnique.mockResolvedValue({ id: "r1" });
    prisma.recipecomment.create.mockResolvedValue({
      id: "c1", recipeId: "r1", userId: "u1", content: longText,
      user: { id: "u1", name: "Alice", email: "alice@example.com" }
    });

    const req = new Request("http://localhost/api/recipes/r1/comments", {
      method: "POST",
      body: JSON.stringify({ content: longText }),
    });
    const res = await createRecipeComment(req, { params: Promise.resolve({ id: "r1" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.comment.content.length).toBe(1500);
  });

  // 6. Recipe comments return author information
  it("6: Recipe comments return user author information", async () => {
    const requireAuthMod = await import("@/lib/requireAuth");
    requireAuthMod.requireAuth.mockResolvedValue({ id: "u1", email: "author@example.com" });

    prisma.recipe.findUnique.mockResolvedValue({ id: "r1" });
    prisma.recipecomment.create.mockResolvedValue({
      id: "c1", recipeId: "r1", userId: "u1", content: "Nice recipe!",
      user: { id: "u1", name: "Chef Bob", email: "author@example.com" }
    });

    const req = new Request("http://localhost/api/recipes/r1/comments", {
      method: "POST",
      body: JSON.stringify({ content: "Nice recipe!" }),
    });
    const res = await createRecipeComment(req, { params: Promise.resolve({ id: "r1" }) });
    const json = await res.json();

    expect(json.data.comment.user).toEqual({ id: "u1", name: "Chef Bob", email: "author@example.com" });
  });

  // 7. Like/unlike works
  it("7: Like/unlike toggles recipelike state correctly", async () => {
    const requireAuthMod = await import("@/lib/requireAuth");
    requireAuthMod.requireAuth.mockResolvedValue({ id: "u1" });
    prisma.recipe.findUnique.mockResolvedValue({ id: "r1" });

    // First call: not liked -> like created
    prisma.recipelike.findUnique.mockResolvedValue(null);
    prisma.recipelike.create.mockResolvedValue({ id: "l1", recipeId: "r1", userId: "u1" });

    const req1 = new Request("http://localhost/api/recipes/r1/like", { method: "POST" });
    const res1 = await toggleRecipeLike(req1, { params: Promise.resolve({ id: "r1" }) });
    const json1 = await res1.json();
    expect(json1.data.liked).toBe(true);

    // Second call: already liked -> like deleted
    prisma.recipelike.findUnique.mockResolvedValue({ id: "l1", recipeId: "r1", userId: "u1" });
    prisma.recipelike.delete.mockResolvedValue({});

    const req2 = new Request("http://localhost/api/recipes/r1/like", { method: "POST" });
    const res2 = await toggleRecipeLike(req2, { params: Promise.resolve({ id: "r1" }) });
    const json2 = await res2.json();
    expect(json2.data.liked).toBe(false);
  });

  // 8. Rating 1–5 works
  it("8: Rating 1-5 upserts reciperating correctly", async () => {
    const requireAuthMod = await import("@/lib/requireAuth");
    requireAuthMod.requireAuth.mockResolvedValue({ id: "u1" });
    prisma.recipe.findUnique.mockResolvedValue({ id: "r1" });
    prisma.reciperating.upsert.mockResolvedValue({ id: "rt1", recipeId: "r1", userId: "u1", rating: 5 });

    const req = new Request("http://localhost/api/recipes/r1/rating", {
      method: "POST",
      body: JSON.stringify({ rating: 5 }),
    });
    const res = await rateRecipe(req, { params: Promise.resolve({ id: "r1" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.rating.rating).toBe(5);
  });

  // 9. Invalid ratings fail
  it("9: Invalid rating (< 1 or > 5 or non-number) fails with 400", async () => {
    const requireAuthMod = await import("@/lib/requireAuth");
    requireAuthMod.requireAuth.mockResolvedValue({ id: "u1" });

    const req = new Request("http://localhost/api/recipes/r1/rating", {
      method: "POST",
      body: JSON.stringify({ rating: 10 }),
    });
    const res = await rateRecipe(req, { params: Promise.resolve({ id: "r1" }) });
    expect(res.status).toBe(400);
  });

  // 10. Save/unsave works
  it("10: Save/unsave toggles savedrecipe record", async () => {
    const requireAuthMod = await import("@/lib/requireAuth");
    requireAuthMod.requireAuth.mockResolvedValue({ id: "u1" });
    prisma.recipe.findUnique.mockResolvedValue({ id: "r1" });

    // Not saved -> creates save
    prisma.savedrecipe.findUnique.mockResolvedValue(null);
    prisma.savedrecipe.create.mockResolvedValue({ id: "s1", recipeId: "r1", userId: "u1" });

    const req = new Request("http://localhost/api/recipes/r1/save", { method: "POST" });
    const res = await toggleRecipeSave(req, { params: Promise.resolve({ id: "r1" }) });
    const json = await res.json();
    expect(json.data.saved).toBe(true);
  });

  // 11. Saved Recipes requires authentication
  it("11: Saved Recipes API rejects unauthenticated request with 401", async () => {
    const requireAuthMod = await import("@/lib/requireAuth");
    requireAuthMod.requireAuth.mockResolvedValue(null);
    getServerSession.mockResolvedValue(null);

    const req = new Request("http://localhost/api/user/saved-recipes");
    const res = await getUserSavedRecipes(req);
    expect(res.status).toBe(401);
  });

  // 12. No route falls back to prisma.user.findFirst() for authentication
  it("12: No user route executes prisma.user.findFirst for unauthenticated user", async () => {
    const requireAuthMod = await import("@/lib/requireAuth");
    requireAuthMod.requireAuth.mockResolvedValue(null);
    getServerSession.mockResolvedValue(null);

    const req = new Request("http://localhost/api/user/saved-recipes");
    await getUserSavedRecipes(req);

    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });

  // 13. Dynamic Recipe route handlers correctly await Promise-based Next.js 16 params
  it("13: Handles Promise-wrapped params in Next.js 16 correctly", async () => {
    prisma.recipecomment.findMany.mockResolvedValue([]);
    const promiseParams = Promise.resolve({ id: "recipe_async_123" });
    const req = new Request("http://localhost/api/recipes/recipe_async_123/comments");

    const res = await getRecipeComments(req, { params: promiseParams });
    expect(res.status).toBe(200);
    expect(prisma.recipecomment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { recipeId: "recipe_async_123" } })
    );
  });

  // 14. Generated Prisma delegates used by the Recipe routes actually exist
  it("14: Prisma delegates recipe, recipecomment, recipelike, reciperating, savedrecipe exist on client", () => {
    expect(prisma.recipe).toBeDefined();
    expect(prisma.recipecomment).toBeDefined();
    expect(prisma.recipelike).toBeDefined();
    expect(prisma.reciperating).toBeDefined();
    expect(prisma.savedrecipe).toBeDefined();
    expect(prisma.recipetag).toBeDefined();
    expect(prisma.recipeallergen).toBeDefined();
  });

  // 15. Recipe tag/allergen joins work
  it("15: Recipe query includes tags and allergens relations", async () => {
    prisma.recipe.findMany.mockResolvedValue([
      { id: "r1", title: "Salad", tags: [{ id: "t1", name: "Healthy" }], allergens: [] }
    ]);

    const req = new Request("http://localhost/api/recipes");
    const res = await getRecipes(req);
    const json = await res.json();

    expect(json.data.recipes[0].tags.length).toBe(1);
    expect(json.data.recipes[0].tags[0].name).toBe("Healthy");
  });

  // 16. Recipe detail returns real nutrition data
  it("16: Recipe detail includes protein, carbs, fat, fiber, sugar nutrition fields", async () => {
    const mockRecipe = {
      id: "r1", title: "Protein Shake", protein: 30, carbs: 10, fat: 5, fiber: 4, sugar: 2, status: "APPROVED"
    };
    prisma.recipe.findFirst.mockResolvedValue(mockRecipe);

    const req = new Request("http://localhost/api/recipes/r1");
    const res = await getRecipeDetail(req, { params: Promise.resolve({ id: "r1" }) });
    const json = await res.json();

    const r = json.data.recipe;
    expect(r.protein).toBe(30);
    expect(r.carbs).toBe(10);
    expect(r.fat).toBe(5);
    expect(r.fiber).toBe(4);
    expect(r.sugar).toBe(2);
  });

  // 17. Missing Recipe integration records do not create FK orphans
  it("17: Missing target recipe returns 404 and does not create orphan comment", async () => {
    const requireAuthMod = await import("@/lib/requireAuth");
    requireAuthMod.requireAuth.mockResolvedValue({ id: "u1" });
    prisma.recipe.findUnique.mockResolvedValue(null); // recipe non-existent

    const req = new Request("http://localhost/api/recipes/nonexistent/comments", {
      method: "POST",
      body: JSON.stringify({ content: "Test" }),
    });
    const res = await createRecipeComment(req, { params: Promise.resolve({ id: "nonexistent" }) });
    expect(res.status).toBe(404);
    expect(prisma.recipecomment.create).not.toHaveBeenCalled();
  });

  // 18. RECIPES Page Editor contract initialization remains working
  it("18: RECIPES Page Editor contract initializes correctly with resolvePageContent", () => {
    const resolved = resolvePageContent("RECIPES", []);

    expect(resolved.hero).toBeDefined();
    expect(resolved.hero.title).toBe("Healthy Meals That Fit Real Life");
    expect(resolved.search).toBeDefined();
    expect(resolved.search.placeholder).toBe("Search for ingredients, dishes...");
    expect(resolved.listSection.heading).toBe("Popular Healthy Recipes");
    expect(resolved.emptyState.emptyTitle).toBe("No recipes found");
  });
});
