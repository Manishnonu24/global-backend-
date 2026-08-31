"use client";

import { useState } from "react";
import { Plus, Edit2, Trash2, X, Star, Image as ImageIcon } from "lucide-react";
import MediaPickerModal from "@/components/media/MediaPickerModal";

export default function TestimonialsList({ siteId, initialTestimonials }) {
  const [testimonials, setTestimonials] = useState(initialTestimonials);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null); // Null for create, object for edit
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  const [clientName, setClientName] = useState("");
  const [clientImage, setClientImage] = useState("");
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [showHide, setShowHide] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleCreateClick = () => {
    setSelectedItem(null);
    setClientName("");
    setClientImage("");
    setRating(5);
    setContent("");
    setShowHide(true);
    setSortOrder(0);
    setError(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (item) => {
    setSelectedItem(item);
    setClientName(item.clientName);
    setClientImage(item.clientImage || "");
    setRating(item.rating);
    setContent(item.content);
    setShowHide(item.showHide);
    setSortOrder(item.sortOrder);
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
      clientName,
      clientImage: clientImage || null,
      rating: Number(rating),
      content,
      showHide,
      sortOrder: Number(sortOrder),
    };

    const isEdit = !!selectedItem;
    const endpoint = isEdit
      ? `/api/dashboard/testimonials/${selectedItem.id}`
      : "/api/dashboard/testimonials";
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
        throw new Error(errorData.error || "Failed to save testimonial");
      }

      const result = await res.json();
      const testimonial = result.data?.testimonial ?? result.testimonial;

      if (isEdit) {
        setTestimonials((prev) =>
          prev.map((t) => (t.id === selectedItem.id ? testimonial : t)),
        );
      } else {
        setTestimonials((prev) => [...prev, testimonial]);
      }

      handleModalClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this testimonial?")) return;

    try {
      const res = await fetch(`/api/dashboard/testimonials/${id}`, {
        method: "DELETE",
        headers: {
          "x-site-id": siteId,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to delete testimonial");
      }

      setTestimonials((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const renderStars = (count) => {
    return (
      <div className="flex gap-0.5 text-yellow-400">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={14}
            fill={i < count ? "currentColor" : "none"}
            className={i < count ? "" : "text-gray-300"}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Bar actions */}
      <div className="flex justify-between items-center pb-2 border-b">
        <h2 className="text-lg font-semibold text-gray-700">
          Manage Testimonials
        </h2>
        <button
          onClick={handleCreateClick}
          className="admin-btn admin-btn-primary shadow-sm"
        >
          <Plus size={16} />
          Add Testimonial
        </button>
      </div>

      {/* Grid List */}
      {testimonials.length === 0 ? (
        <div className="rounded-xl border bg-white p-8 text-center text-gray-500 shadow-sm">
          No testimonials created yet. Click "Add Testimonial" to create your
          first client review.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((item) => (
            <div
              key={item.id}
              className={`rounded-xl border bg-white p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition ${
                !item.showHide ? "opacity-60 bg-gray-50/50" : ""
              }`}
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center gap-3">
                  {item.clientImage ? (
                    <img
                      src={item.clientImage}
                      alt={item.clientName}
                      className="h-10 w-10 rounded-full object-cover border"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src =
                          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80"; // fallback
                      }}
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 uppercase">
                      {item.clientName.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-gray-900">
                      {item.clientName}
                    </h4>
                    {renderStars(item.rating)}
                  </div>
                </div>

                {/* Content */}
                <p className="text-sm text-gray-600 italic line-clamp-4">
                  "{item.content}"
                </p>
              </div>

              {/* Footer */}
              <div className="mt-6 flex items-center justify-between border-t pt-4 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-700">Sort:</span>{" "}
                  {item.sortOrder}
                  <span className="mx-1.5">•</span>
                  <span
                    className={`font-semibold ${
                      item.showHide ? "text-green-600" : "text-gray-500"
                    }`}
                  >
                    {item.showHide ? "Visible" : "Hidden"}
                  </span>
                </div>

                <div className="flex gap-1">
                  <button
                    onClick={() => handleEditClick(item)}
                    className="p-1.5 text-gray-500 hover:text-blue-600 rounded hover:bg-gray-100"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 text-gray-500 hover:text-red-600 rounded hover:bg-gray-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Slide-over or Centered Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border bg-white p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-lg font-bold text-gray-900">
                {selectedItem ? "Edit Testimonial" : "Add Testimonial"}
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
                    Client Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-blue-600 text-sm"
                    placeholder="e.g. John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Client Image URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={clientImage}
                      onChange={(e) => setClientImage(e.target.value)}
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Rating (1-5 Stars)
                  </label>
                  <select
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-blue-600 text-sm bg-white"
                  >
                    <option value="5">5 Stars</option>
                    <option value="4">4 Stars</option>
                    <option value="3">3 Stars</option>
                    <option value="2">2 Stars</option>
                    <option value="1">1 Star</option>
                  </select>
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
                  Testimonial content *
                </label>
                <textarea
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-blue-600 text-sm font-sans"
                  placeholder="Paste client testimonial text here..."
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showHide"
                  checked={showHide}
                  onChange={(e) => setShowHide(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <label
                  htmlFor="showHide"
                  className="text-sm font-semibold text-gray-700"
                >
                  Visible to public clients
                </label>
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
                  {isSubmitting ? "Saving..." : "Save Testimonial"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Media Picker Modal */}
      {showMediaPicker && (
        <MediaPickerModal
          title="Select Client Image"
          filter="images"
          onSelect={(media) => {
            setClientImage(media.secureUrl || media.url);
            setShowMediaPicker(false);
          }}
          onClose={() => setShowMediaPicker(false)}
          siteId={siteId}
        />
      )}
    </div>
  );
}

