"use client";

import { useState, useEffect, useCallback } from "react";
import { UsersRound, Trash2, Plus, Users, CheckSquare, Square, AlertTriangle, UserPlus, X, Check, Search, Calendar, Filter, UserCheck, UserMinus } from "lucide-react";

export default function ListsPage() {
  const [lists, setLists] = useState([]);
  const [allSubscribers, setAllSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newList, setNewList] = useState({ 
    name: "", 
    firstName: "", 
    lastName: "", 
    email: "", 
    status: "active", 
    tags: "", 
    source: "" 
  });
  const [siteId, setSiteId] = useState(() =>
    typeof window !== "undefined" ? (localStorage.getItem("x-site-id") || process.env.NEXT_PUBLIC_SITE_ID || "") : ""
  );
  const [saveError, setSaveError] = useState(null);

  // Bulk select state
  const [selected, setSelected] = useState(new Set());
  const [selectedSubIds, setSelectedSubIds] = useState([]);

  const handleSelectAllSubs = (e) => {
    if (e.target.checked) {
      setSelectedSubIds(allSubscribers.map(s => s.id));
    } else {
      setSelectedSubIds([]);
    }
  };

  const handleSelectOneSub = (id) => {
    if (selectedSubIds.includes(id)) {
      setSelectedSubIds(selectedSubIds.filter(i => i !== id));
    } else {
      setSelectedSubIds([...selectedSubIds, id]);
    }
  };
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [totalSubscribers, setTotalSubscribers] = useState(0);

  // Member management modal state
  const [activeListId, setActiveListId] = useState(null);
  const [activeListName, setActiveListName] = useState("");
  const [listMembers, setListMembers] = useState(new Set());
  const [modalLoading, setModalLoading] = useState(false);

  // Quick Add Subscriber inside Modal state
  const [quickSub, setQuickSub] = useState({ name: "", email: "" });
  const [quickSubError, setQuickSubError] = useState(null);

  // Modal Filter & Bulk Selection State
  const [modalSearch, setModalSearch] = useState("");
  const [modalDatePreset, setModalDatePreset] = useState("all"); // "all" | "today" | "7days" | "30days" | "custom"
  const [modalStartDate, setModalStartDate] = useState("");
  const [modalEndDate, setModalEndDate] = useState("");
  const [bulkMemberLoading, setBulkMemberLoading] = useState(false);

  const fetchLists = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    try {
      const [resLists, resSubs] = await Promise.all([
        fetch("/api/crm/lists", { headers: { "x-site-id": siteId } }),
        fetch("/api/crm/subscribers?take=1", { headers: { "x-site-id": siteId } })
      ]);

      if (resLists.ok && resSubs.ok) {
        const dataLists = await resLists.json().catch(() => ({}));
        const dataSubs = await resSubs.json().catch(() => ({}));

        if (dataLists.success) {
          setLists(dataLists.data?.lists || []);
          setSelected(new Set());
        }
        if (dataSubs.success) {
          setTotalSubscribers(dataSubs.data?.total || 0);
        }
      }
    } catch (err) {
      console.error("fetchLists failed:", err);
    }
    setLoading(false);
  }, [siteId]);

  const fetchAllSubscribers = useCallback(async () => {
    if (!siteId) return;
    try {
      const res = await fetch("/api/crm/subscribers?take=500", {
        headers: { "x-site-id": siteId }
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.success) {
          setAllSubscribers(data.data?.subscribers || []);
        }
      }
    } catch (err) {
      console.error("Failed to load subscribers:", err);
    }
  }, [siteId]);

  useEffect(() => {
    if (siteId) {
      const timer = setTimeout(() => {
        fetchLists();
        fetchAllSubscribers();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [siteId, fetchLists, fetchAllSubscribers]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaveError(null);
    if (!siteId) return setSaveError("Site ID not loaded yet. Please wait.");
    try {
      let listId = null;
      // 1. Create List if name provided
      if (newList.name) {
        const res = await fetch("/api/crm/lists", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-site-id": siteId
          },
          body: JSON.stringify({ name: newList.name, description: "" })
        });
        const data = await res.json();
        if (data.success && data.data?.list) {
          listId = data.data.list.id;
        } else {
          return setSaveError(data.error || "Failed to create list.");
        }
      }

      // 2. Create Subscriber if email provided
      if (newList.email) {
        const resSub = await fetch("/api/crm/subscribers", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-site-id": siteId },
          body: JSON.stringify({
            name: `${newList.firstName} ${newList.lastName}`.trim(),
            email: newList.email,
            status: newList.status,
            tags: newList.tags,
            source: newList.source
          })
        });
        const dataSub = await resSub.json();
        if (dataSub.success && dataSub.data?.subscriber) {
          const subId = dataSub.data.subscriber.id;
          
          // 3. Link Subscriber to List
          if (listId) {
            await fetch(`/api/crm/lists/${listId}/members`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-site-id": siteId },
              body: JSON.stringify({ subscriberId: subId })
            });
          }
        } else {
          return setSaveError(dataSub.error || "Failed to create subscriber.");
        }
      }

      setNewList({ name: "", firstName: "", lastName: "", email: "", status: "active", tags: "", source: "" });
      setShowAddForm(false);
      fetchLists();
      fetchAllSubscribers();
    } catch (err) {
      console.error(err);
      setSaveError("Network error: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this subscriber list? Subscribers will not be deleted.")) return;
    try {
      const res = await fetch(`/api/crm/lists/${id}`, {
        method: "DELETE",
        headers: { "x-site-id": siteId }
      });
      const data = await res.json();
      if (data.success) {
        fetchLists();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Bulk select helpers
  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === lists.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(lists.map(l => l.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} selected list(s)? Subscribers inside them will NOT be deleted.`)) return;
    setBulkDeleting(true);
    try {
      await Promise.all(
        [...selected].map(id =>
          fetch(`/api/crm/lists/${id}`, { method: "DELETE", headers: { "x-site-id": siteId } })
        )
      );
      await fetchLists();
    } catch (err) {
      console.error(err);
    }
    setBulkDeleting(false);
  };

  // Modal actions
  const getFilteredModalSubscribers = () => {
    return allSubscribers.filter((sub) => {
      // 1. Search term filter
      if (modalSearch.trim()) {
        const q = modalSearch.toLowerCase().trim();
        const nameMatch = (sub.name || "").toLowerCase().includes(q);
        const emailMatch = (sub.email || "").toLowerCase().includes(q);
        if (!nameMatch && !emailMatch) return false;
      }

      // 2. Date filter
      if (modalDatePreset !== "all") {
        const rawDate = sub.createdAt || sub.date;
        if (rawDate) {
          const subDate = new Date(rawDate);
          const now = new Date();

          if (modalDatePreset === "today") {
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            if (subDate < startOfToday) return false;
          } else if (modalDatePreset === "7days") {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(now.getDate() - 7);
            if (subDate < sevenDaysAgo) return false;
          } else if (modalDatePreset === "30days") {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(now.getDate() - 30);
            if (subDate < thirtyDaysAgo) return false;
          } else if (modalDatePreset === "custom") {
            if (modalStartDate) {
              const start = new Date(modalStartDate);
              if (subDate < start) return false;
            }
            if (modalEndDate) {
              const end = new Date(modalEndDate);
              end.setHours(23, 59, 59, 999);
              if (subDate > end) return false;
            }
          }
        }
      }

      return true;
    });
  };

  const handleBulkSelectFiltered = async (select = true) => {
    const filtered = getFilteredModalSubscribers();
    const targetIds = filtered.map((s) => s.id);
    if (targetIds.length === 0 || !activeListId) return;

    setBulkMemberLoading(true);
    try {
      if (select) {
        await fetch(`/api/crm/lists/${activeListId}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-site-id": siteId },
          body: JSON.stringify({ subscriberIds: targetIds })
        });
        setListMembers((prev) => {
          const next = new Set(prev);
          targetIds.forEach((id) => next.add(id));
          return next;
        });
      } else {
        await fetch(`/api/crm/lists/${activeListId}/members`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json", "x-site-id": siteId },
          body: JSON.stringify({ subscriberIds: targetIds })
        });
        setListMembers((prev) => {
          const next = new Set(prev);
          targetIds.forEach((id) => next.delete(id));
          return next;
        });
      }
      fetchLists();
    } catch (err) {
      console.error("Bulk member action failed:", err);
    }
    setBulkMemberLoading(false);
  };

  const handleBulkSelectAllSubscribers = async (select = true) => {
    const targetIds = allSubscribers.map((s) => s.id);
    if (targetIds.length === 0 || !activeListId) return;

    setBulkMemberLoading(true);
    try {
      if (select) {
        await fetch(`/api/crm/lists/${activeListId}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-site-id": siteId },
          body: JSON.stringify({ subscriberIds: targetIds })
        });
        setListMembers(new Set(targetIds));
      } else {
        await fetch(`/api/crm/lists/${activeListId}/members`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json", "x-site-id": siteId },
          body: JSON.stringify({ subscriberIds: targetIds })
        });
        setListMembers(new Set());
      }
      fetchLists();
    } catch (err) {
      console.error("Bulk select all subscribers failed:", err);
    }
    setBulkMemberLoading(false);
  };

  const openManageMembersModal = async (list) => {
    setActiveListId(list.id);
    setActiveListName(list.name);
    setModalLoading(true);
    setQuickSub({ name: "", email: "" });
    setQuickSubError(null);
    setModalSearch("");
    setModalDatePreset("all");
    setModalStartDate("");
    setModalEndDate("");
    try {
      const res = await fetch(`/api/crm/lists/${list.id}/members`, {
        headers: { "x-site-id": siteId }
      });
      const data = await res.json();
      if (data.success) {
        const memberIds = new Set(data.data.members.map(m => m.id));
        setListMembers(memberIds);
      }
    } catch (err) {
      console.error(err);
    }
    setModalLoading(false);
  };

  const handleToggleMember = async (subscriberId) => {
    const isMember = listMembers.has(subscriberId);
    try {
      if (isMember) {
        // Remove member
        const res = await fetch(`/api/crm/lists/${activeListId}/members?subscriberId=${subscriberId}`, {
          method: "DELETE",
          headers: { "x-site-id": siteId }
        });
        const data = await res.json().catch(() => ({}));
        if (data.success) {
          setListMembers(prev => {
            const next = new Set(prev);
            next.delete(subscriberId);
            return next;
          });
          fetchLists(); // Update counts in list view
        }
      } else {
        // Add member
        const res = await fetch(`/api/crm/lists/${activeListId}/members`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-site-id": siteId
          },
          body: JSON.stringify({ subscriberId })
        });
        const data = await res.json().catch(() => ({}));
        if (data.success) {
          setListMembers(prev => {
            const next = new Set(prev);
            next.add(subscriberId);
            return next;
          });
          fetchLists(); // Update counts in list view
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Quick Add Subscriber directly in modal
  const handleQuickAddSubscriber = async (e) => {
    e.preventDefault();
    setQuickSubError(null);
    if (!quickSub.email || !quickSub.email.includes("@")) {
      return setQuickSubError("Please provide a valid email.");
    }
    try {
      // 1. Create Subscriber
      const res = await fetch("/api/crm/subscribers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-site-id": siteId
        },
        body: JSON.stringify({
          name: quickSub.name,
          email: quickSub.email,
          status: "active",
          tags: "list-quick-add"
        })
      });
      const data = await res.json().catch(() => ({}));
      if (data.success && data.data?.subscriber) {
        const newSubId = data.data.subscriber.id;
        
        // 2. Add to active list
        const resAdd = await fetch(`/api/crm/lists/${activeListId}/members`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-site-id": siteId
          },
          body: JSON.stringify({ subscriberId: newSubId })
        });
        const dataAdd = await resAdd.json().catch(() => ({}));
        if (dataAdd.success) {
          // Refresh lists
          setQuickSub({ name: "", email: "" });
          await fetchAllSubscribers();
          setListMembers(prev => {
            const next = new Set(prev);
            next.add(newSubId);
            return next;
          });
          fetchLists();
        }
      } else {
        setQuickSubError(data.error || "Failed to create subscriber.");
      }
    } catch (err) {
      console.error(err);
      setQuickSubError("Error: " + err.message);
    }
  };

  return (
    <div className="space-y-6 w-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Subscriber Lists
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Segment your audiences into clean marketing lists. Total subscribers on site: <span className="font-bold text-slate-800 dark:text-slate-200">{totalSubscribers}</span>
          </p>
        </div>

        <button
          onClick={() => { setShowAddForm(!showAddForm); setSaveError(null); }}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          <Plus size={14} /> New List
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleCreate} className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl space-y-4 max-w-xl">
          <h3 className="text-sm font-bold">New Subscriber List</h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="List Name (Optional - leaves empty to just add subscriber)"
              value={newList.name}
              onChange={(e) => setNewList({ ...newList, name: e.target.value })}
              className="p-2 border rounded text-xs dark:bg-slate-900 w-full"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="First Name"
                value={newList.firstName}
                onChange={(e) => setNewList({ ...newList, firstName: e.target.value })}
                className="p-2 border rounded text-xs dark:bg-slate-900 w-full"
              />
              <input
                type="text"
                placeholder="Last Name"
                value={newList.lastName}
                onChange={(e) => setNewList({ ...newList, lastName: e.target.value })}
                className="p-2 border rounded text-xs dark:bg-slate-900 w-full"
              />
            </div>
            <input
              type="email"
              placeholder="Email Address"
              required={!newList.name}
              value={newList.email}
              onChange={(e) => setNewList({ ...newList, email: e.target.value })}
              className="p-2 border rounded text-xs dark:bg-slate-900 w-full"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={newList.status}
                onChange={(e) => setNewList({ ...newList, status: e.target.value })}
                className="p-2 border rounded text-xs dark:bg-slate-900 w-full"
              >
                <option value="active">Active</option>
                <option value="unsubscribed">Unsubscribed</option>
              </select>
              <input
                type="text"
                placeholder="Tags/Segments (comma separated)"
                value={newList.tags}
                onChange={(e) => setNewList({ ...newList, tags: e.target.value })}
                className="p-2 border rounded text-xs dark:bg-slate-900 w-full"
              />
            </div>
            <input
              type="text"
              placeholder="Source (e.g. Organic, Ads)"
              value={newList.source}
              onChange={(e) => setNewList({ ...newList, source: e.target.value })}
              className="p-2 border rounded text-xs dark:bg-slate-900 w-full"
            />
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded text-xs font-semibold hover:bg-indigo-700 transition">
              Create
            </button>
            <button
              type="button"
              onClick={() => { setShowAddForm(false); setSaveError(null); }}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded text-xs font-semibold"
            >
              Cancel
            </button>
            {saveError && <p className="text-red-500 text-xs font-semibold">{saveError}</p>}
          </div>
        </form>
      )}

      {/* Bulk Actions Bar */}
      {!loading && lists.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-indigo-600 font-semibold transition"
          >
            {selected.size === lists.length
              ? <CheckSquare size={14} className="text-indigo-600" />
              : <Square size={14} />}
            {selected.size === lists.length ? "Deselect All" : "Select All"}
          </button>
          <span className="text-xs text-slate-400">{selected.size > 0 ? `${selected.size} selected` : `${lists.length} total`}</span>
          {selected.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition disabled:opacity-60"
            >
              <Trash2 size={12} />
              {bulkDeleting ? "Deleting..." : `Delete ${selected.size} Selected`}
            </button>
          )}
          {lists.length > 1 && selected.size === 0 && (
            <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
              <AlertTriangle size={11} /> Select lists to bulk-delete duplicates
            </span>
          )}
        </div>
      )}

      {/* Grid of lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400 col-span-full">Loading lists...</div>
        ) : lists.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 col-span-full">No lists created yet. Click &quot;New List&quot; to add one.</div>
        ) : (
          lists.map((list) => (
            <div
              key={list.id}
              className={`p-4 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl flex flex-col justify-between hover:shadow-sm transition ${selected.has(list.id) ? "ring-2 ring-indigo-500 border-indigo-400" : ""}`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleSelect(list.id)}
                      className="text-slate-400 hover:text-indigo-600 transition"
                    >
                      {selected.has(list.id)
                        ? <CheckSquare size={14} className="text-indigo-600" />
                        : <Square size={14} />}
                    </button>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">{list.name}</h3>
                  </div>
                  <div className="flex p-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded">
                    <UsersRound size={12} />
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 min-h-8">
                  {list.description || "No description provided."}
                </p>
                <div className="flex items-center gap-1 mt-3 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                  <Users size={12} />
                  <span>{list._count?.subscribers || 0} Contacts</span>
                </div>
              </div>

              <div className="flex gap-2 justify-end items-center mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => openManageMembersModal(list)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 text-white rounded text-[11px] font-semibold hover:bg-indigo-700 transition"
                >
                  <UserPlus size={11} /> Manage Members
                </button>
                <button
                  onClick={() => handleDelete(list.id)}
                  className="p-1 bg-red-50 text-red-650 rounded hover:bg-red-100 transition"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Global Subscribers Table */}
      <div className="mt-8 border-t pt-8 dark:border-slate-700">
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">
          All Subscribers Directory
        </h2>
        <div className="admin-card-noPad bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm border dark:border-slate-700">
          <div className="overflow-x-auto">
            <table className="admin-table w-full text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b dark:border-slate-700 text-xs text-slate-500 uppercase">
                <tr>
                  <th style={{ width: "40px" }} className="p-3">
                    <input 
                      type="checkbox" 
                      onChange={handleSelectAllSubs} 
                      checked={allSubscribers.length > 0 && selectedSubIds.length === allSubscribers.length}
                    />
                  </th>
                  <th className="p-3">First Name</th>
                  <th className="p-3">Last Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Tags/Segments</th>
                  <th className="p-3">Last active</th>
                  <th className="p-3">Source</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                {allSubscribers.map((item) => {
                  const nameParts = (item.name || "Anonymous").split(" ");
                  const firstName = nameParts[0];
                  const lastName = nameParts.slice(1).join(" ") || "-";
                  
                  return (
                    <tr key={item.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition ${selectedSubIds.includes(item.id) ? "bg-slate-50 dark:bg-slate-800/50" : ""}`}>
                      <td className="p-3">
                        <input 
                          type="checkbox" 
                          checked={selectedSubIds.includes(item.id)}
                          onChange={() => handleSelectOneSub(item.id)}
                        />
                      </td>
                      <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{firstName}</td>
                      <td className="p-3 font-medium text-slate-600 dark:text-slate-300">{lastName}</td>
                      <td className="p-3 text-xs text-slate-500 dark:text-slate-400">{item.email}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full ${
                          item.status === "active"
                            ? "bg-green-100 text-green-700"
                            : item.status === "unsubscribed" ? "bg-slate-100 text-slate-600" : "bg-red-100 text-red-700"
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="p-3">
                        {item.tags ? (
                          <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-semibold rounded">
                            {item.tags}
                          </span>
                        ) : "-"}
                      </td>
                      <td className="p-3 text-xs text-slate-500">
                        {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : new Date(item.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-[10px] uppercase font-bold text-slate-400">
                        {item.source || "Organic"}
                      </td>
                      <td className="p-3 text-right">
                        <button className="p-1.5 text-red-500 hover:bg-red-50 rounded transition">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Manage Members Modal Overlay */}
      {activeListId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/40">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Add / Remove Members</h3>
                <p className="text-slate-500 text-xs">Managing List: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{activeListName}</span></p>
              </div>
              <button
                onClick={() => { setActiveListId(null); setActiveListName(""); }}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Create and Add Form */}
            <form onSubmit={handleQuickAddSubscriber} className="p-3.5 bg-indigo-50/40 dark:bg-slate-900/40 border-b dark:border-slate-700 space-y-2">
              <p className="text-[10px] font-extrabold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider">Quick Create & Add New Subscriber</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={quickSub.name}
                  onChange={(e) => setQuickSub({ ...quickSub, name: e.target.value })}
                  className="p-2 border rounded-lg text-xs dark:bg-slate-950 dark:border-slate-700 w-1/3 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  required
                  value={quickSub.email}
                  onChange={(e) => setQuickSub({ ...quickSub, email: e.target.value })}
                  className="p-2 border rounded-lg text-xs dark:bg-slate-950 dark:border-slate-700 flex-1 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
                <button
                  type="submit"
                  className="px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  <Plus size={14} /> Add Subscriber
                </button>
              </div>
              {quickSubError && <p className="text-red-500 text-[11px] font-semibold">{quickSubError}</p>}
            </form>

            {/* Filter & Selection Controls Section */}
            <div className="p-3.5 bg-slate-100/70 dark:bg-slate-900/70 border-b dark:border-slate-700 space-y-3">
              <div className="flex flex-wrap gap-2.5 items-center justify-between">
                {/* Search Bar */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filter by name or email..."
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 border dark:border-slate-700 rounded-lg text-xs dark:bg-slate-950 focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                  {modalSearch && (
                    <button onClick={() => setModalSearch("")} className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600">
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Date Filter Dropdown */}
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-slate-400 shrink-0" />
                  <select
                    value={modalDatePreset}
                    onChange={(e) => setModalDatePreset(e.target.value)}
                    className="p-1.5 border dark:border-slate-700 rounded-lg text-xs dark:bg-slate-950 text-slate-800 dark:text-slate-200 outline-none font-medium cursor-pointer"
                  >
                    <option value="all">All Dates</option>
                    <option value="today">Registered Today</option>
                    <option value="7days">Last 7 Days</option>
                    <option value="30days">Last 30 Days</option>
                    <option value="custom">Custom Date Range</option>
                  </select>
                </div>
              </div>

              {/* Custom Date Pickers (Shown when "Custom Date Range" is selected) */}
              {modalDatePreset === "custom" && (
                <div className="flex items-center gap-3 pt-1 text-xs">
                  <div className="flex items-center gap-1.5 flex-1">
                    <span className="text-slate-500 text-[11px] font-semibold">From:</span>
                    <input
                      type="date"
                      value={modalStartDate}
                      onChange={(e) => setModalStartDate(e.target.value)}
                      className="p-1.5 border dark:border-slate-700 rounded-lg text-xs dark:bg-slate-950 w-full"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 flex-1">
                    <span className="text-slate-500 text-[11px] font-semibold">To:</span>
                    <input
                      type="date"
                      value={modalEndDate}
                      onChange={(e) => setModalEndDate(e.target.value)}
                      className="p-1.5 border dark:border-slate-700 rounded-lg text-xs dark:bg-slate-950 w-full"
                    />
                  </div>
                  {(modalStartDate || modalEndDate) && (
                    <button
                      onClick={() => { setModalStartDate(""); setModalEndDate(""); }}
                      className="text-slate-400 hover:text-slate-600 text-[11px] underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}

              {/* Bulk Select Action Bar (Select All with Filter vs Without Filter) */}
              {(() => {
                const filteredSubs = getFilteredModalSubscribers();
                const isFiltered = modalSearch.trim() !== "" || modalDatePreset !== "all";
                return (
                  <div className="flex flex-wrap items-center justify-between pt-1 gap-2 border-t dark:border-slate-800">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      Showing <strong className="text-slate-900 dark:text-white font-bold">{filteredSubs.length}</strong> of {allSubscribers.length} subscribers
                      {isFiltered && <span className="text-indigo-600 dark:text-indigo-400 ml-1">(filtered)</span>}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Option A: Select All / Deselect All WITH FILTER */}
                      {isFiltered && (
                        <div className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/40 p-1 rounded-lg border border-indigo-200 dark:border-indigo-800">
                          <button
                            type="button"
                            disabled={bulkMemberLoading || filteredSubs.length === 0}
                            onClick={() => handleBulkSelectFiltered(true)}
                            className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-bold transition flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                            title="Add only subscribers matching current filter"
                          >
                            <UserCheck size={12} /> Select Filtered ({filteredSubs.length})
                          </button>
                          <button
                            type="button"
                            disabled={bulkMemberLoading || filteredSubs.length === 0}
                            onClick={() => handleBulkSelectFiltered(false)}
                            className="px-2 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded text-[11px] font-semibold transition flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                            title="Remove subscribers matching current filter"
                          >
                            <UserMinus size={12} /> Deselect Filtered
                          </button>
                        </div>
                      )}

                      {/* Option B: Select All / Deselect All WITHOUT FILTER (Global All) */}
                      <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-800 p-1 rounded-lg">
                        <button
                          type="button"
                          disabled={bulkMemberLoading || allSubscribers.length === 0}
                          onClick={() => handleBulkSelectAllSubscribers(true)}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold transition flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                          title="Add ALL registered subscribers regardless of filter"
                        >
                          <CheckSquare size={12} /> Select All ({allSubscribers.length})
                        </button>
                        <button
                          type="button"
                          disabled={bulkMemberLoading || listMembers.size === 0}
                          onClick={() => handleBulkSelectAllSubscribers(false)}
                          className="px-2 py-1 bg-slate-300 dark:bg-slate-700 hover:bg-red-500 hover:text-white text-slate-700 dark:text-slate-200 rounded text-[11px] font-semibold transition flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                          title="Remove all members from this list"
                        >
                          <Square size={12} /> Deselect All
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Content - List of existing subscribers */}
            <div className="p-4 overflow-y-auto flex-1 space-y-2 min-h-[220px]">
              {modalLoading || bulkMemberLoading ? (
                <div className="text-center p-8 text-xs text-slate-400 flex flex-col items-center gap-2">
                  <div className="w-5 h-5 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
                  <span>{bulkMemberLoading ? "Updating list members in bulk..." : "Loading current list members..."}</span>
                </div>
              ) : (() => {
                const filteredSubs = getFilteredModalSubscribers();
                if (allSubscribers.length === 0) {
                  return (
                    <div className="text-center p-8 text-xs text-slate-400">
                      No subscribers registered yet. Use the form above to add one instantly!
                    </div>
                  );
                }

                if (filteredSubs.length === 0) {
                  return (
                    <div className="text-center p-8 text-xs text-slate-400 flex flex-col items-center gap-1">
                      <Filter size={20} className="text-slate-300 mb-1" />
                      <span>No subscribers match your search or date filter.</span>
                      <button
                        onClick={() => { setModalSearch(""); setModalDatePreset("all"); setModalStartDate(""); setModalEndDate(""); }}
                        className="text-indigo-600 font-semibold hover:underline mt-1"
                      >
                        Reset Filters
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="divide-y divide-slate-100 dark:divide-slate-700">
                    {filteredSubs.map((sub) => {
                      const isMember = listMembers.has(sub.id);
                      const regDateStr = (sub.createdAt || sub.date)
                        ? new Date(sub.createdAt || sub.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : "";

                      return (
                        <div
                          key={sub.id}
                          onClick={() => handleToggleMember(sub.id)}
                          className={`py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 px-3 rounded-lg transition border border-transparent ${
                            isMember ? "bg-indigo-50/30 dark:bg-indigo-950/10" : ""
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition ${
                              isMember ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                            }`}>
                              {isMember && <Check size={10} strokeWidth={3} />}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{sub.name || "Anonymous"}</p>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                <span className="font-mono">{sub.email}</span>
                                {regDateStr && (
                                  <>
                                    <span>•</span>
                                    <span>Reg: {regDateStr}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                            isMember ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                          }`}>
                            {isMember ? "Added" : "+ Add"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 flex justify-between items-center">
              <div className="text-[11px] text-slate-500 font-semibold px-2">
                Total Members in List: <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{listMembers.size}</strong>
              </div>
              <button
                onClick={() => { setActiveListId(null); setActiveListName(""); }}
                className="px-5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
