"use client";

import { useState } from "react";
import { Plus, Edit2, Trash2, X, ChevronDown, ChevronUp } from "lucide-react";

export default function FaqManager({ siteId, initialFaqs, pages = [] }) {
  const [faqs, setFaqs] = useState(initialFaqs);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null); // Null for create, object for edit

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [pageId, setPageId] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [showHide, setShowHide] = useState(true);
  const [schemaMarkup, setSchemaMarkup] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [expandedFaqId, setExpandedFaqId] = useState(null);

  const handleCreateClick = () => {
    setSelectedItem(null);
    setQuestion("");
    setAnswer("");
    setPageId("");
    setSortOrder(0);
    setShowHide(true);
    setSchemaMarkup(false);
    setError(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (item) => {
    setSelectedItem(item);
    setQuestion(item.question);
    setAnswer(item.answer);
    setPageId(item.pageId || item.page?.id || "");
    setSortOrder(item.sortOrder);
    setShowHide(item.showHide);
    setSchemaMarkup(item.schemaMarkup);
    setError(null);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
  };

  const toggleExpand = (id) => {
    setExpandedFaqId(expandedFaqId === id ? null : id);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const payload = {
      question,
      answer,
      pageId: pageId || null,
      sortOrder: Number(sortOrder),
      showHide,
      schemaMarkup,
    };

    const isEdit = !!selectedItem;
    const endpoint = isEdit
      ? `/api/dashboard/faq/${selectedItem.id}`
      : "/api/dashboard/faq";
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
        throw new Error(errorData.error || "Failed to save FAQ");
      }

      const result = await res.json();
      const faq = result.data?.faq ?? result.faq;

      if (isEdit) {
        setFaqs((prev) =>
          prev.map((f) => (f.id === selectedItem.id ? faq : f)),
        );
      } else {
        setFaqs((prev) => [...prev, faq]);
      }

      handleModalClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this FAQ?")) return;

    try {
      const res = await fetch(`/api/dashboard/faq/${id}`, {
        method: "DELETE",
        headers: {
          "x-site-id": siteId,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to delete FAQ");
      }

      setFaqs((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Action panel */}
      <div className="flex justify-between items-center pb-2 border-b">
        <h2 className="text-lg font-semibold text-gray-700">FAQ Listings</h2>
        <button
          onClick={handleCreateClick}
          className="admin-btn admin-btn-primary shadow-sm"
        >
          <Plus size={16} />
          Add FAQ
        </button>
      </div>

      {/* FAQs List Table */}
      {faqs.length === 0 ? (
        <div className="rounded-xl border bg-white p-8 text-center text-gray-500 shadow-sm">
          No FAQs configured yet. Click "Add FAQ" to start setting up questions.
        </div>
      ) : (
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 font-semibold text-gray-700">
                    Question
                  </th>
                  <th className="px-6 py-4 font-semibold text-gray-700">
                    Assigned Page
                  </th>
                  <th className="px-6 py-4 font-semibold text-gray-700">
                    Order
                  </th>
                  <th className="px-6 py-4 font-semibold text-gray-700">
                    Settings
                  </th>
                  <th className="px-6 py-4 font-semibold text-gray-700 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {faqs.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-gray-50/50 transition ${
                      !item.showHide ? "opacity-60 bg-gray-50/30" : ""
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-2">
                        <button
                          onClick={() => toggleExpand(item.id)}
                          className="mt-1 text-gray-400 hover:text-gray-900"
                        >
                          {expandedFaqId === item.id ? (
                            <ChevronUp size={16} />
                          ) : (
                            <ChevronDown size={16} />
                          )}
                        </button>
                        <div className="space-y-1">
                          <p className="font-semibold text-gray-900 leading-relaxed">
                            {item.question}
                          </p>
                          {expandedFaqId === item.id && (
                            <p className="text-gray-600 bg-gray-50 p-3 rounded-lg border text-xs leading-relaxed whitespace-pre-wrap max-w-xl">
                              {item.answer}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                      {item.page ? (
                        <span className="font-mono bg-slate-100 text-slate-800 text-xs px-2 py-0.5 rounded border">
                          {item.page.slug}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">
                          Global / All Pages
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-700 whitespace-nowrap">
                      {item.sortOrder}
                    </td>
                    <td className="px-6 py-4 space-y-1 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            item.showHide ? "bg-green-500" : "bg-amber-500 animate-pulse"
                          }`}
                        />
                        <span className={`text-xs ${item.showHide ? "text-gray-600" : "text-amber-700 font-bold"}`}>
                          {item.showHide ? "Visible (Approved)" : "Pending Approval"}
                        </span>
                      </div>
                      {item.schemaMarkup && (
                        <div className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 rounded px-1.5 py-0.5 w-fit font-medium">
                          JSON-LD SEO
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => handleEditClick(item)}
                        className="p-2 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-gray-100 inline-flex"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-gray-500 hover:text-red-600 rounded-lg hover:bg-gray-100 inline-flex"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Dialog Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border bg-white p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-lg font-bold text-gray-900">
                {selectedItem ? "Edit FAQ" : "Add FAQ"}
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
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Question *
                </label>
                <input
                  type="text"
                  required
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-blue-600 text-sm"
                  placeholder="e.g. What is the return policy?"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Answer *
                </label>
                <textarea
                  required
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-blue-600 text-sm font-sans"
                  placeholder="Provide the detailed answer to the question..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Assign to Page
                  </label>
                  <select
                    value={pageId}
                    onChange={(e) => setPageId(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-blue-600 text-sm bg-white"
                  >
                    <option value="">Global / All Pages</option>
                    {pages.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.slug})
                      </option>
                    ))}
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

              <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2">
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

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="schemaMarkup"
                    checked={schemaMarkup}
                    onChange={(e) => setSchemaMarkup(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <label
                    htmlFor="schemaMarkup"
                    className="text-sm font-semibold text-gray-700"
                  >
                    Enable SEO Schema
                  </label>
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
                  {isSubmitting ? "Saving..." : "Save FAQ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

