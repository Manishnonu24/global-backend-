"use client";

import { useState, useEffect } from "react";
import { Users, Upload, Plus, Trash2, Mail, Tag, Filter } from "lucide-react";

export default function SubscribersPage() {
  const [subscribers, setSubscribers] = useState([]);
  const [lists, setLists] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [newSub, setNewSub] = useState({ name: "", email: "", status: "active", tags: "" });
  const [showAddForm, setShowAddForm] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [selectedListId, setSelectedListId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(subscribers.map(s => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  useEffect(() => {
    const id = localStorage.getItem("x-site-id") || process.env.NEXT_PUBLIC_SITE_ID || "";
    setSiteId(id);
  }, []);

  useEffect(() => {
    if (siteId) {
      fetchSubscribers();
      fetchLists();
    }
  }, [search, statusFilter, siteId]);

  const fetchSubscribers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/crm/subscribers?search=${search}&status=${statusFilter}`, {
        headers: { "x-site-id": siteId }
      });
      const data = await res.json();
      if (!data.error) {
        setSubscribers(data.data?.subscribers || []);
        setTotal(data.data?.total || 0);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const fetchLists = async () => {
    try {
      const res = await fetch("/api/crm/lists", {
        headers: { "x-site-id": siteId }
      });
      const data = await res.json();
      if (!data.error) {
        setLists(data.data?.lists || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/crm/subscribers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-site-id": siteId
        },
        body: JSON.stringify(newSub)
      });
      const data = await res.json();
      if (!data.error) {
        setNewSub({ name: "", email: "", status: "active", tags: "" });
        setShowAddForm(false);
        fetchSubscribers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this subscriber?")) return;
    try {
      const res = await fetch(`/api/crm/subscribers/${id}`, {
        method: "DELETE",
        headers: { "x-site-id": siteId }
      });
      const data = await res.json();
      if (data.success) {
        fetchSubscribers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCsvUpload = async (e) => {
    e.preventDefault();
    if (!csvFile) return alert("Please select a CSV file first");

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const lines = text.split("\n");
      const headers = lines[0].split(",");
      
      const emailIdx = headers.findIndex(h => h.toLowerCase().includes("email"));
      const nameIdx = headers.findIndex(h => h.toLowerCase().includes("name"));

      if (emailIdx === -1) {
        alert("CSV must contain an 'email' column header");
        return;
      }

      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i]) continue;
        const cols = lines[i].split(",");
        rows.push({
          email: cols[emailIdx]?.trim(),
          name: nameIdx !== -1 ? cols[nameIdx]?.trim() : null
        });
      }

      try {
        const res = await fetch("/api/crm/subscribers/import", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-site-id": siteId
          },
          body: JSON.stringify({
            listId: selectedListId || null,
            subscribers: rows
          })
        });
        const data = await res.json();
        if (data.success) {
          alert(`Successfully imported ${data.data.count} subscribers!`);
          setCsvFile(null);
          fetchSubscribers();
        }
      } catch (err) {
        console.error(err);
      }
    };
    reader.readAsText(csvFile);
  };

  return (
    <div className="space-y-6 w-full">
      <div className="admin-page-header">
        <div className="admin-page-header-left">
          <h1 className="admin-page-title">
            Subscriber Directory
          </h1>
          <p className="admin-caption mt-1">
            Total Contacts: <span className="font-semibold" style={{ color: "var(--admin-text, #0f172a)" }}>{total}</span>
          </p>
        </div>

        <div className="admin-page-header-actions">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="admin-btn"
            style={{ fontSize: "11px", padding: "6px 12px", background: "var(--admin-crm-accent)", color: "#fff" }}
          >
            <Plus size={14} /> Add Contact
          </button>
        </div>
      </div>

      {showAddForm && (
        <form onSubmit={handleAdd} className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl space-y-4 max-w-xl">
          <h3 className="text-sm font-bold">New Subscriber</h3>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Name"
              value={newSub.name}
              onChange={(e) => setNewSub({ ...newSub, name: e.target.value })}
              className="p-2 border rounded text-xs dark:bg-slate-900 w-full"
            />
            <input
              type="email"
              placeholder="Email"
              required
              value={newSub.email}
              onChange={(e) => setNewSub({ ...newSub, email: e.target.value })}
              className="p-2 border rounded text-xs dark:bg-slate-900 w-full"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Tags (comma-separated)"
              value={newSub.tags}
              onChange={(e) => setNewSub({ ...newSub, tags: e.target.value })}
              className="p-2 border rounded text-xs dark:bg-slate-900 w-full"
            />
            <select
              value={newSub.status}
              onChange={(e) => setNewSub({ ...newSub, status: e.target.value })}
              className="p-2 border rounded text-xs dark:bg-slate-900 w-full"
            >
              <option value="active">Active</option>
              <option value="unsubscribed">Unsubscribed</option>
              <option value="bounced">Bounced</option>
              <option value="spam">Spam</option>
            </select>
          </div>
          <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded text-xs font-semibold">
            Save Subscriber
          </button>
        </form>
      )}

      {/* CSV Import card */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl max-w-xl space-y-3">
        <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Upload size={14} /> Import from CSV File
        </h3>
        <p className="text-[10px] text-slate-400">CSV file must include at least an <code>email</code> column header.</p>
        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setCsvFile(e.target.files[0])}
            className="text-xs"
          />
          <select
            value={selectedListId}
            onChange={(e) => setSelectedListId(e.target.value)}
            className="p-1.5 border rounded text-xs dark:bg-slate-900"
          >
            <option value="">No list (import only)</option>
            {lists.map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
          <button onClick={handleCsvUpload} className="px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded hover:bg-slate-700">
            Upload & Import
          </button>
        </div>
      </div>

      {/* Filter and search */}
      <div className="flex flex-wrap gap-3 items-center bg-white dark:bg-slate-800 p-3 rounded-lg border dark:border-slate-700">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="p-2 border rounded text-xs w-full dark:bg-slate-900"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2 border rounded text-xs dark:bg-slate-900"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="unsubscribed">Unsubscribed</option>
            <option value="bounced">Bounced</option>
            <option value="spam">Spam</option>
          </select>
        </div>
      </div>

      {/* Directory Table */}
      <div className="admin-card-noPad">
        {loading ? (
          <div className="p-8 text-center admin-caption">Loading directory...</div>
        ) : subscribers.length === 0 ? (
          <div className="p-8 flex flex-col items-center justify-center text-center w-full admin-caption">No subscribers match the query parameters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: "40px" }}>
                    <input 
                      type="checkbox" 
                      onChange={handleSelectAll} 
                      checked={subscribers.length > 0 && selectedIds.length === subscribers.length}
                    />
                  </th>
                  <th>First Name</th>
                  <th>Last Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Tags/Segments</th>
                  <th>Last active</th>
                  <th>Source</th>
                  <th className="text-right" style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((item) => {
                  const nameParts = (item.name || "Anonymous").split(" ");
                  const firstName = nameParts[0];
                  const lastName = nameParts.slice(1).join(" ") || "-";
                  
                  return (
                    <tr key={item.id} className={selectedIds.includes(item.id) ? "bg-slate-50 dark:bg-slate-800/50" : ""}>
                      <td>
                        <input 
                          type="checkbox" 
                          checked={selectedIds.includes(item.id)}
                          onChange={() => handleSelectOne(item.id)}
                        />
                      </td>
                      <td>
                        <span className="font-semibold" style={{ color: "var(--admin-text, #0f172a)" }}>{firstName}</span>
                      </td>
                      <td>
                        <span className="font-medium" style={{ color: "var(--admin-text, #0f172a)" }}>{lastName}</span>
                      </td>
                      <td>
                        <p className="admin-caption" style={{ fontSize: "12px", color: "var(--admin-text, #0f172a)" }}>{item.email}</p>
                      </td>
                      <td>
                        <span className={`admin-badge ${
                          item.status === "active"
                            ? "admin-badge-success"
                            : item.status === "unsubscribed" ? "admin-badge-neutral" : "admin-badge-error"
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td>
                        {item.tags ? (
                          <span className="admin-badge admin-badge-neutral" style={{ fontSize: "10px" }}>
                            <Tag size={10} className="mr-1" /> {item.tags}
                          </span>
                        ) : "-"}
                      </td>
                      <td className="admin-caption" style={{ fontSize: "11px" }}>
                        {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : new Date(item.createdAt).toLocaleDateString()}
                      </td>
                      <td className="admin-caption uppercase tracking-wider font-semibold" style={{ fontSize: "10px" }}>
                        {item.source || "Organic"}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="admin-btn"
                          style={{ padding: "4px", color: "var(--admin-error)" }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
