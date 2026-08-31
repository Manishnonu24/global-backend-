"use client";

import React, { useState, useEffect } from "react";
import { Loader2, Search, CheckCircle, XCircle, Trash2, ExternalLink, Star, Plus } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";

export default function RecipesDashboard() {
  const { data: session } = useSession();
  const isAdminOrEditor = session?.user?.globalRole === "SUPERADMIN" || session?.user?.globalRole === "ADMIN" || session?.user?.globalRole === "EDITOR";
  
  const [adminRecipes, setAdminRecipes] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [healthyBiteId, setHealthyBiteId] = useState(null);
  const siteId = typeof window !== "undefined" ? localStorage.getItem("x-site-id") : null;

  const fetchAdminRecipes = async () => {
    setAdminLoading(true);
    try {
      const res = await fetch("/api/admin/recipes", { cache: 'no-store' });
      const data = await res.json();
      if (!data.error) setAdminRecipes(data.data.recipes || []);
      
      try {
        const hbRes = await fetch("/api/dashboard/settings", { headers: { "x-site-id": siteId || "" } });
        const hbData = await hbRes.json();
        const hbSettings = hbData.data?.websiteSettings || hbData.websiteSettings || {};
        const hbLink = hbSettings.wellnessBanner?.healthyBite?.recipeLink || "";
        if (hbLink.startsWith("/recipes/")) {
          setHealthyBiteId(hbLink.replace("/recipes/", ""));
        }
      } catch(e) {}
      
    } catch (err) {
      console.error(err);
    } finally {
      setAdminLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminOrEditor) {
      fetchAdminRecipes();
    }
  }, [isAdminOrEditor]);

  const updateStatus = async (id, status) => {
    try {
      const res = await fetch(`/api/admin/recipes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (!res.ok) {
        const err = await res.json();
        alert(`Error: ${err.error || 'Failed to update status'}`);
        return;
      }
      fetchAdminRecipes();
    } catch (err) {
      console.error(err);
      alert('Failed to update status due to network error');
    }
  };

  const deleteRecipe = async (id) => {
    if (!confirm("Are you sure you want to delete this recipe permanently?")) return;
    try {
      await fetch(`/api/admin/recipes/${id}`, { method: "DELETE" });
      fetchAdminRecipes();
    } catch (err) {
      console.error(err);
    }
  };

  const setAsHealthyBite = async (recipe) => {
    if (!confirm(`Set "${recipe.title}" as the Healthy Bite of the Day?`)) return;
    try {
      const fetchRes = await fetch("/api/dashboard/settings", { headers: { "x-site-id": siteId } });
      const resData = await fetchRes.json();
      const fullSettings = resData.data?.websiteSettings || resData.websiteSettings || {};
      
      const tagsString = recipe.tags && recipe.tags.length > 0 ? recipe.tags.map(t => t.name).join(", ") : "High in Protein, Gut Friendly, Quick & Easy";
      const pointsArray = tagsString.split(",").map(t => t.trim()).filter(Boolean);

      const updatedSettings = {
        ...fullSettings,
        wellnessBanner: {
          ...(fullSettings.wellnessBanner || { enabled: true }),
          healthyBite: {
            title: "Healthy Bite of the Day",
            recipeName: recipe.title,
            description: recipe.description || "",
            image: recipe.imageUrl || "",
            difficulty: recipe.difficulty || "Easy",
            category: recipe.category || "General",
            recipeLink: `/recipes/${recipe.id}`,
            time: recipe.cookingTime ? `${recipe.cookingTime} mins` : "15 mins",
            calories: recipe.calories ? `${recipe.calories} kcal` : "320 kcal",
            protein: recipe.nutrition?.protein || "",
            carbs: recipe.nutrition?.carbs || "",
            fat: recipe.nutrition?.fat || "",
            fiber: recipe.nutrition?.fiber || "",
            points: pointsArray,
            contributorName: recipe.contributor?.name || "Unknown User",
            contributorRole: "Community Member",
            contributorAvatar: "",
            ingredients: recipe.ingredients || [""],
            instructions: recipe.steps || [""],
            allergens: recipe.allergens || [""],
            relatedRecipes: "",
            displayEnabled: true,
            showBadges: true
          }
        }
      };

      const saveRes = await fetch("/api/dashboard/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-site-id": siteId },
        body: JSON.stringify(updatedSettings)
      });
      
      if (!saveRes.ok) throw new Error("Failed to save settings");
      setHealthyBiteId(recipe.id);
      alert("Healthy Bite of the Day updated successfully!");
    } catch (err) {
      console.error(err);
      alert("Error setting Healthy Bite of the Day.");
    }
  };

  if (!isAdminOrEditor) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Access Denied</h1>
        <p className="text-slate-500 mt-2">You do not have permission to view the recipe moderation dashboard.</p>
      </div>
    );
  }

  const filteredAdmin = adminRecipes.filter(r => {
    if (statusFilter === "HEALTHY BITE") {
      return r.id === healthyBiteId && r.title.toLowerCase().includes(search.toLowerCase());
    }
    const matchStatus = statusFilter === "ALL" || r.status === statusFilter;
    const matchSearch = r.title.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Recipes Moderation</h1>
          <p className="text-slate-500 text-sm">Review and moderate community recipes</p>
        </div>
        <Link href="/recipes/submit" className="admin-btn admin-btn-primary shadow-sm mt-4 sm:mt-0">
          <Plus size={16} />
          Add Recipe
        </Link>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
          <div className="flex flex-wrap items-center gap-2">
            {["PENDING", "APPROVED", "REJECTED", "ALL", "HEALTHY BITE"].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                  statusFilter === status ? "bg-emerald-500 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search recipes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
            />
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {adminLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-500" /></div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-150">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Recipe</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Contributor</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {filteredAdmin.map(recipe => (
                    <tr key={recipe.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0">
                            {recipe.imageUrl && <img src={recipe.imageUrl} alt="" className="w-full h-full object-cover" />}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white text-sm">{recipe.title}</div>
                            <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                              <Link href={`/recipes/${recipe.id}`} target="_blank" className="hover:text-emerald-500 flex items-center gap-1"><ExternalLink size={12}/> View Page</Link>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">{recipe.contributor?.name || "Unknown User"}</div>
                        <div className="text-xs text-slate-500">{recipe.contributor?.email}</div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 text-[10px] font-bold rounded-md ${
                          recipe.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                          recipe.status === 'REJECTED' ? 'bg-rose-100 text-rose-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {recipe.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          {recipe.status === 'APPROVED' && (
                            <button onClick={() => setAsHealthyBite(recipe)} className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors" title="Set as Healthy Bite">
                              <Star size={18} className={healthyBiteId === recipe.id ? "fill-current" : ""} />
                            </button>
                          )}
                          {recipe.status !== 'APPROVED' && (
                            <button onClick={() => updateStatus(recipe.id, 'APPROVED')} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors" title="Approve">
                              <CheckCircle size={18} />
                            </button>
                          )}
                          {recipe.status !== 'REJECTED' && (
                            <button onClick={() => updateStatus(recipe.id, 'REJECTED')} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="Reject">
                              <XCircle size={18} />
                            </button>
                          )}
                          <button onClick={() => deleteRecipe(recipe.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="Delete">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredAdmin.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-500">No recipes found matching your filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
