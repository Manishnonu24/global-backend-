"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, Heart, ExternalLink } from "lucide-react";

export default function SavedRecipes() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        const res = await fetch("/api/user/saved-recipes");
        const data = await res.json();
        const list = data?.data?.recipes || data?.recipes || [];
        setRecipes(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecipes();
  }, []);

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Heart className="text-rose-500 fill-rose-500" /> Saved Recipes
        </h1>
        <p className="text-slate-500 text-sm mt-1">Your personal cookbook of favorites</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-rose-500" /></div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
          <p className="text-slate-500 mb-4">You haven't saved any recipes yet.</p>
          <Link href="/recipes" className="text-rose-500 font-bold hover:underline">Browse community recipes</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {recipes.map(recipe => (
            <Link href={`/recipes/${recipe.id}`} key={recipe.id} className="group bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-md transition">
              <div className="h-40 bg-slate-100 dark:bg-slate-700">
                {recipe.imageUrl && <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-cover" />}
              </div>
              <div className="p-4">
                <h3 className="font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-rose-500 transition-colors">
                  {recipe.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{recipe.description}</p>
                <div className="mt-4 flex items-center justify-between text-xs font-bold text-slate-400">
                  <span>By {recipe.contributor?.name || "Community"}</span>
                  <ExternalLink size={14} className="text-rose-500 opacity-0 group-hover:opacity-100 transition" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
