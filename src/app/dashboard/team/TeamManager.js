"use client";

import { useState } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Globe,
  Image as ImageIcon,
} from "lucide-react";
import MediaPickerModal from "@/components/media/MediaPickerModal";

export default function TeamManager({ siteId, initialTeam }) {
  const [team, setTeam] = useState(initialTeam);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null); // Null for create, object for edit
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [photo, setPhoto] = useState("");
  const [bio, setBio] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [twitterLink, setTwitterLink] = useState("");
  const [linkedinLink, setLinkedinLink] = useState("");
  const [websiteLink, setWebsiteLink] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleCreateClick = () => {
    setSelectedItem(null);
    setName("");
    setRole("");
    setPhoto("");
    setBio("");
    setSortOrder(0);
    setTwitterLink("");
    setLinkedinLink("");
    setWebsiteLink("");
    setError(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (item) => {
    setSelectedItem(item);
    setName(item.name);
    setRole(item.role);
    setPhoto(item.photo || "");
    setBio(item.bio || "");
    setSortOrder(item.sortOrder);

    const social = item.socialLinks || {};
    setTwitterLink(social.twitter || "");
    setLinkedinLink(social.linkedin || "");
    setWebsiteLink(social.website || "");
    setError(null);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const payload = {
      name,
      role,
      photo: photo || null,
      bio: bio || null,
      sortOrder: Number(sortOrder),
      socialLinks: {
        twitter: twitterLink || "",
        linkedin: linkedinLink || "",
        website: websiteLink || "",
      },
    };

    const isEdit = !!selectedItem;
    const endpoint = isEdit
      ? `/api/dashboard/team/${selectedItem.id}`
      : "/api/dashboard/team";
    const method = isEdit ? "PATCH" : "POST";

    try {
      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-site-id": siteId,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save team member");
      }

      const result = await res.json();
      const savedMember = result.data?.teamMember || result.teamMember;

      if (isEdit) {
        setTeam((prev) =>
          prev.map((t) => (t && t.id === selectedItem.id ? savedMember : t)),
        );
      } else {
        setTeam((prev) => [...prev, savedMember]);
      }

      handleModalClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this team member?")) return;

    try {
      const res = await fetch(`/api/dashboard/team/${id}`, {
        method: "DELETE",
        headers: {
          "x-site-id": siteId,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to delete team member");
      }

      setTeam((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and actions */}
      <div className="flex justify-between items-center pb-2 border-b">
        <h2 className="text-lg font-semibold text-gray-700">Manage Profiles</h2>
        <button
          onClick={handleCreateClick}
          className="admin-btn admin-btn-primary shadow-sm"
        >
          <Plus size={16} />
          Add Member
        </button>
      </div>

      {/* Team Cards Grid */}
      {team.length === 0 ? (
        <div className="rounded-xl border bg-white p-8 text-center text-gray-500 shadow-sm">
          No team members registered yet. Click "Add Member" to create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {team.map((item) => {
            if (!item) return null;
            const social = item.socialLinks || {};
            return (
              <div
                key={item.id}
                className="rounded-xl border bg-white p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Photo & Identity */}
                  <div className="flex flex-col items-center text-center space-y-2">
                    {item.photo ? (
                      <img
                        src={item.photo}
                        alt={item.name}
                        className="h-20 w-20 rounded-full object-cover border-2 border-blue-100"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src =
                            "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=100&h=100&q=80"; // fallback
                        }}
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-xl font-bold text-blue-700 uppercase border">
                        {item.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-gray-900 leading-tight">
                        {item.name}
                      </h4>
                      <p className="text-xs text-blue-600 font-medium mt-0.5">
                        {item.role}
                      </p>
                    </div>
                  </div>

                  {/* Bio */}
                  {item.bio && (
                    <p className="text-xs text-gray-600 line-clamp-3 text-center leading-relaxed">
                      {item.bio}
                    </p>
                  )}
                </div>

                {/* Social Links & Row Actions */}
                <div className="mt-5 border-t pt-3 flex items-center justify-between">
                  <div className="flex gap-2 text-gray-400">
                    {social.twitter && (
                      <a
                        href={social.twitter}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-blue-400 transition inline-flex items-center"
                      >
                        <svg
                          className="h-3.5 w-3.5 fill-current"
                          viewBox="0 0 24 24"
                        >
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                      </a>
                    )}
                    {social.linkedin && (
                      <a
                        href={social.linkedin}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-blue-750 transition inline-flex items-center"
                      >
                        <svg
                          className="h-3.5 w-3.5 fill-current"
                          viewBox="0 0 24 24"
                        >
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0h.003z" />
                        </svg>
                      </a>
                    )}
                    {social.website && (
                      <a
                        href={social.website}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-gray-950 transition"
                      >
                        <Globe size={14} />
                      </a>
                    )}
                    {!social.twitter && !social.linkedin && !social.website && (
                      <span className="text-[10px] italic text-gray-400">
                        No social links
                      </span>
                    )}
                  </div>

                  <div className="flex gap-1.5 text-xs text-gray-500 items-center">
                    <span className="bg-gray-100 rounded px-1.5 py-0.5 text-[10px] font-mono">
                      Order: {item.sortOrder}
                    </span>
                    <button
                      onClick={() => handleEditClick(item)}
                      className="p-1 text-gray-500 hover:text-blue-600 rounded hover:bg-gray-100"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1 text-gray-500 hover:text-red-600 rounded hover:bg-gray-100"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Dialog Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border bg-white p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-lg font-bold text-gray-900">
                {selectedItem ? "Edit Member" : "Add Member"}
              </h3>
              <button
                onClick={handleModalClose}
                className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-blue-600 text-sm"
                    placeholder="e.g. Bob Smith"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Role / Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-blue-600 text-sm"
                    placeholder="e.g. Lead Engineer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Photo URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={photo}
                      onChange={(e) => setPhoto(e.target.value)}
                      className="min-w-0 flex-1 rounded-lg border border-gray-200 p-2.5 outline-none focus:border-blue-600 text-sm"
                      placeholder="https://..."
                    />
                    <button
                      type="button"
                      onClick={() => setShowMediaPicker(true)}
                      className="px-3.5 py-2 border rounded-lg hover:bg-gray-50 text-xs font-bold text-gray-650 transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <ImageIcon size={14} />
                      Library
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-blue-600 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-blue-600 text-sm font-sans"
                  placeholder="Tell us about this team member..."
                />
              </div>

              <div className="border-t pt-3 space-y-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Social Channels
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 mb-0.5">
                      Twitter Link
                    </label>
                    <input
                      type="url"
                      value={twitterLink}
                      onChange={(e) => setTwitterLink(e.target.value)}
                      className="w-full rounded border border-gray-200 p-2 text-xs outline-none focus:border-blue-600"
                      placeholder="https://twitter.com/..."
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 mb-0.5">
                      LinkedIn Link
                    </label>
                    <input
                      type="url"
                      value={linkedinLink}
                      onChange={(e) => setLinkedinLink(e.target.value)}
                      className="w-full rounded border border-gray-200 p-2 text-xs outline-none focus:border-blue-600"
                      placeholder="https://linkedin.com/in/..."
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 mb-0.5">
                      Personal Website
                    </label>
                    <input
                      type="url"
                      value={websiteLink}
                      onChange={(e) => setWebsiteLink(e.target.value)}
                      className="w-full rounded border border-gray-200 p-2 text-xs outline-none focus:border-blue-600"
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="px-4 py-2 border text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:bg-blue-300 transition"
                >
                  {isSubmitting ? "Saving..." : "Save Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Media Picker Modal */}
      {showMediaPicker && (
        <MediaPickerModal
          title="Select Photo"
          filter="images"
          onSelect={(media) => {
            setPhoto(media.secureUrl || media.url);
            setShowMediaPicker(false);
          }}
          onClose={() => setShowMediaPicker(false)}
          siteId={siteId}
        />
      )}
    </div>
  );
}

