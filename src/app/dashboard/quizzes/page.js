"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  HelpCircle, Plus, Pencil, Trash2, X, Check,
  ChevronDown, ChevronUp, BarChart2, Loader2,
  Layers, Tag, AlertCircle, FolderOpen,
  Settings, Eye, EyeOff, Home, Save, MonitorSmartphone,
} from "lucide-react";
import MediaPickerModal from "@/components/media/MediaPickerModal";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function slugify(str) {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function emptyQuestion(category = "general-wellness") {
  return { category, question: "", options: ["", "", "", ""], correctAnswer: "0", explanation: "" };
}

function emptyType() {
  return {
    slug: "", title: "", subtitle: "", description: "",
    category: "", categoryColor: "#0f7c85",
    imageUrl: "", icon: "📋",
    estimatedMinutes: 5, difficulty: "Beginner",
  };
}

const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"];
const ICONS = ["📋", "💪", "🏃", "🧘", "🌸", "🫀", "🍎", "💤", "🧬", "🌱", "⚡", "🔬", "✨", "🌙", "🧠", "🥗", "🌿"];
const COLORS = ["#0f7c85", "#27ae60", "#1fb9fb", "#8e44ad", "#f39c12", "#e05248", "#6366f1", "#e67e22", "#16a085"];

// ─── Option Row ───────────────────────────────────────────────────────────────

function OptionRow({ index, value, isCorrect, onChange, onCorrect, onRemove, canRemove }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onCorrect(index)}
        className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isCorrect ? "bg-green-500 border-green-500 text-white" : "border-slate-300 hover:border-green-400"
          }`}
      >
        {isCorrect && <Check size={12} />}
      </button>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(index, e.target.value)}
        placeholder={`Option ${index + 1}`}
        className="flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-450 focus:bg-white transition"
      />
      <span className={`text-[10px] font-bold w-14 text-right ${isCorrect ? "text-green-600" : "text-slate-400"}`}>
        {isCorrect ? "✓ Correct" : `Option ${index + 1}`}
      </span>
      {canRemove && (
        <button type="button" onClick={() => onRemove(index)} className="shrink-0 p-1 text-slate-300 hover:text-red-500 transition">
          <X size={14} />
        </button>
      )}
    </div>
  );
}

// ─── Question Form ────────────────────────────────────────────────────────────

function QuestionForm({ initial, fixedCategory, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial || emptyQuestion(fixedCategory));

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setOption = (i, val) => {
    const opts = [...form.options]; opts[i] = val; setField("options", opts);
  };
  const addOption = () => {
    if (form.options.length >= 6) return;
    setField("options", [...form.options, ""]);
  };
  const removeOption = (i) => {
    if (form.options.length <= 2) return;
    const opts = form.options.filter((_, idx) => idx !== i);
    const nc = parseInt(form.correctAnswer) === i ? "0"
      : parseInt(form.correctAnswer) > i ? String(parseInt(form.correctAnswer) - 1)
        : form.correctAnswer;
    setForm((f) => ({ ...f, options: opts, correctAnswer: nc }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const filled = form.options.filter((o) => o.trim());
    if (filled.length < 2) { alert("Provide at least 2 options."); return; }
    onSave({ ...form, options: filled });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
          Question <span className="text-red-500">*</span>
        </label>
        <textarea value={form.question} onChange={(e) => setField("question", e.target.value)} required rows={3}
          placeholder="Type your question here…"
          className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition resize-none" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Answer Options <span className="text-red-500">*</span>
          </label>
          <span className="text-[10px] text-slate-400">Click ○ to mark correct</span>
        </div>
        <div className="space-y-2">
          {form.options.map((opt, i) => (
            <OptionRow key={i} index={i} value={opt}
              isCorrect={form.correctAnswer === String(i)}
              onChange={setOption}
              onCorrect={(idx) => setField("correctAnswer", String(idx))}
              onRemove={removeOption}
              canRemove={form.options.length > 2} />
          ))}
        </div>
        {form.options.length < 6 && (
          <button type="button" onClick={addOption}
            className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition">
            <Plus size={13} /> Add Option
          </button>
        )}
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
          Explanation <span className="text-slate-300">(optional)</span>
        </label>
        <textarea value={form.explanation} onChange={(e) => setField("explanation", e.target.value)} rows={2}
          placeholder="Why is the correct answer right?"
          className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition resize-none" />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition">
          Cancel
        </button>
        <button type="submit" disabled={saving}
          className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded-xl shadow-sm transition flex items-center gap-1.5">
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          {saving ? "Saving…" : "Save Question"}
        </button>
      </div>
    </form>
  );
}

// ─── Quiz Type Form ───────────────────────────────────────────────────────────

function QuizTypeForm({ initial, isEdit, onSave, onCancel, saving, siteId }) {
  const [form, setForm] = useState(initial || emptyType());
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const autoSlug = !isEdit;

  const setField = (k, v) => setForm((f) => {
    const next = { ...f, [k]: v };
    if (k === "title" && autoSlug) next.slug = slugify(v);
    return next;
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title || !form.slug || !form.description) { alert("Title, slug, and description are required."); return; }
    onSave(form);
  };

  const handleSelectImage = (media) => {
    setField("imageUrl", media.secureUrl || media.url);
    setShowMediaPicker(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Title <span className="text-red-500">*</span>
          </label>
          <input type="text" value={form.title} onChange={(e) => setField("title", e.target.value)} required
            placeholder="e.g. Sleep Quality Assessment"
            className="w-full min-w-0 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition" />
        </div>
        <div className="min-w-0">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Slug <span className="text-red-500">*</span>
          </label>
          <input type="text" value={form.slug} onChange={(e) => setField("slug", e.target.value)}
            disabled={isEdit} required placeholder="sleep-quality"
            className="w-full min-w-0 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition disabled:opacity-50 disabled:cursor-not-allowed font-mono" />
          {!isEdit && <p className="text-[10px] text-slate-400 mt-1">Auto-generated from title. Must be unique.</p>}
        </div>
      </div>

      <div className="min-w-0">
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
          Subtitle
        </label>
        <input type="text" value={form.subtitle || ""} onChange={(e) => setField("subtitle", e.target.value)}
          placeholder="e.g. Discover how well you're truly sleeping"
          className="w-full min-w-0 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition" />
      </div>

      <div className="min-w-0">
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea value={form.description} onChange={(e) => setField("description", e.target.value)} rows={2} required
          placeholder="Brief description shown on the quiz card…"
          className="w-full min-w-0 px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition resize-none" />
      </div>

      <div className="min-w-0">
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
          Cover Image <span className="text-slate-300">(optional)</span>
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input type="text" value={form.imageUrl || ""} onChange={(e) => setField("imageUrl", e.target.value)}
            placeholder="Paste image URL..."
            className="flex-1 min-w-0 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition" />
          <button type="button" onClick={() => setShowMediaPicker(true)}
            className="w-full sm:w-auto justify-center px-4 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition flex items-center gap-1.5 shrink-0">
            <Plus size={14} /> Upload / Select
          </button>
        </div>
        {form.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={form.imageUrl} alt="preview" className="mt-2 h-24 w-full object-cover rounded-xl border border-slate-200" />
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="min-w-0">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Category Label</label>
          <input type="text" value={form.category || ""} onChange={(e) => setField("category", e.target.value)}
            placeholder="e.g. Sleep"
            className="w-full min-w-0 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition" />
        </div>
        <div className="min-w-0">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Difficulty</label>
          <select value={form.difficulty} onChange={(e) => setField("difficulty", e.target.value)}
            className="w-full min-w-0 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 transition cursor-pointer">
            {DIFFICULTIES.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div className="min-w-0">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Est. Minutes</label>
          <input type="number" min={1} max={60} value={form.estimatedMinutes}
            onChange={(e) => setField("estimatedMinutes", e.target.value)}
            className="w-full min-w-0 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Accent Color</label>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setField("categoryColor", c)}
                className={`w-6 h-6 rounded-full border-2 transition ${form.categoryColor === c ? "border-slate-600 scale-110" : "border-transparent"}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Icon</label>
        <div className="flex flex-wrap gap-2">
          {ICONS.map((em) => (
            <button key={em} type="button" onClick={() => setField("icon", em)}
              className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center border-2 transition ${form.icon === em ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-slate-300"
                }`}>
              {em}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition">
          Cancel
        </button>
        <button type="submit" disabled={saving}
          className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded-xl shadow-sm transition flex items-center gap-1.5">
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          {saving ? "Saving…" : isEdit ? "Update Type" : "Create Type"}
        </button>
      </div>

      {showMediaPicker && (
        <MediaPickerModal
          siteId={siteId}
          onSelect={handleSelectImage}
          onClose={() => setShowMediaPicker(false)}
        />
      )}
    </form>
  );
}

// ─── Question Row ─────────────────────────────────────────────────────────────

function QuestionRow({ quiz, onEdit, onDelete, deleting }) {
  const [expanded, setExpanded] = useState(false);
  const correctIdx = parseInt(quiz.correctAnswer);
  const correctLabel = quiz.options[correctIdx] ?? "—";

  return (
    <div className="bg-white border border-slate-100 rounded-xl overflow-hidden transition hover:shadow-sm">
      <div className="flex items-start gap-3 px-4 py-3 cursor-pointer" onClick={() => setExpanded((e) => !e)}>
        <div className="shrink-0 mt-0.5 w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500">
          <HelpCircle size={13} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2">{quiz.question}</p>
          <div className="flex flex-wrap items-center gap-3 mt-1">
            <span className="text-[11px] text-slate-400">{quiz.options.length} options</span>
            <span className="flex items-center gap-1 text-[11px] text-green-600 font-semibold">
              <Check size={10} /> {correctLabel}
            </span>
            {quiz.playCount > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <BarChart2 size={10} /> {quiz.playCount} plays
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={(e) => { e.stopPropagation(); onEdit(quiz); }}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition" title="Edit">
            <Pencil size={13} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(quiz.id); }}
            disabled={deleting === quiz.id}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-40 transition" title="Delete">
            {deleting === quiz.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
          </button>
          <span className="p-1 text-slate-300">{expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}</span>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-slate-100 px-4 pb-3 pt-2.5 space-y-2 bg-slate-50/60">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {quiz.options.map((opt, i) => (
              <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs border ${i === correctIdx ? "bg-green-50 border-green-200 text-green-800 font-semibold" : "bg-white border-slate-100 text-slate-600"
                }`}>
                {i === correctIdx ? <Check size={11} className="text-green-500 shrink-0" /> : <span className="w-3 h-3 rounded-full border-2 border-slate-300 shrink-0" />}
                {opt}
              </div>
            ))}
          </div>
          {quiz.explanation && (
            <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-800 leading-relaxed">
              <span className="font-bold">Explanation: </span>{quiz.explanation}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Quiz Type Card (Redesigned Grid Card) ───────────────────────────────────

function QuizTypeCard({
  type, questionCount, allQuestions, onEditType, onDeleteType, onToggleActive, onManageQuestions
}) {
  const color = type.categoryColor || "#6366f1";
  const hasImage = !!type.imageUrl;

  // Calculate total plays across questions belonging to this category
  const totalPlays = useMemo(() => {
    const pool = allQuestions.filter((q) =>
      type.slug === "general-wellness"
        ? !q.category || q.category === "general-wellness"
        : q.category === type.slug
    );
    return pool.reduce((sum, q) => sum + (q.playCount || 0), 0);
  }, [allQuestions, type.slug]);

  return (
    <div className={`bg-white border rounded-[24px] overflow-hidden flex flex-col transition-all duration-300 hover:shadow-md ${type.isActive ? "border-slate-200/60" : "border-slate-200 opacity-70 bg-slate-50/50"
      }`}>
      {/* Top Cover Image / Fallback placeholder */}
      <div className="relative h-[160px] w-full overflow-hidden bg-slate-100 shrink-0">
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={type.imageUrl} alt={type.title} className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl"
            style={{ background: `linear-gradient(135deg, ${color}22 0%, ${color}0a 100%)` }}>
            {type.icon || "📋"}
          </div>
        )}

        {/* Overlay Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <span className="text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded bg-white text-slate-800 shadow-sm border border-slate-100">
            {type.category || "General"}
          </span>
        </div>

        <div className="absolute bottom-3 left-3 text-white flex items-center gap-1.5 text-[10px] font-bold bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 6v6l4 2" />
          </svg>
          <span>{type.estimatedMinutes} Mins Read</span>
        </div>

        {/* Visibility Toggle Button */}
        <div className="absolute top-3 right-3 flex gap-1">
          <button onClick={(e) => { e.stopPropagation(); onToggleActive(type); }}
            className="w-7 h-7 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-slate-600 hover:bg-white hover:text-indigo-600 shadow-sm transition border border-slate-100"
            title={type.isActive ? "Hide from frontend" : "Show on frontend"}>
            {type.isActive ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-heading font-extrabold text-[15px] text-slate-800 leading-snug line-clamp-1">
            {type.title}
          </h3>
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0"
            style={{ background: color + "1a", color }}>
            {questionCount} Qs
          </span>
        </div>

        <p className="text-slate-500 text-[12.5px] leading-relaxed line-clamp-2 flex-1 mb-4">
          {type.description || type.subtitle}
        </p>

        <div className="flex items-center gap-3 mb-4 text-[11px] text-slate-400">
          {totalPlays > 0 && (
            <span className="flex items-center gap-1">
              <BarChart2 size={12} /> {totalPlays} plays
            </span>
          )}
          <span className="inline-block px-1.5 py-0.5 bg-slate-100 rounded text-[9px] font-semibold tracking-wider text-slate-500 uppercase">
            {type.difficulty}
          </span>
        </div>

        {/* Footer Actions */}
        <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button onClick={(e) => { e.stopPropagation(); onEditType(type); }}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition" title="Edit Settings">
              <Settings size={14} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDeleteType(type.id); }}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition" title="Delete Quiz Type">
              <Trash2 size={14} />
            </button>
          </div>

          <button
            onClick={() => onManageQuestions(type)}
            className="px-3.5 py-1.5 text-xs font-bold text-white rounded-xl shadow-xs transition hover:brightness-95"
            style={{ backgroundColor: color }}
          >
            Manage Questions
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Questions Management Modal ──────────────────────────────────────────────

function QuestionsManagementModal({
  type, questions, onSaveQuestion, onDeleteQuestion, deleting, saving, onClose
}) {
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const handleEdit = (q) => {
    setEditTarget(q);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditTarget(null);
  };

  const handleSave = async (form) => {
    await onSaveQuestion(form, editTarget?.id || null);
    handleCancelForm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden animate-fade-in my-8">

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-heading font-extrabold text-slate-800 text-lg">
              Manage Questions
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-semibold">
              {type.title} &middot; {questions.length} questions
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition flex items-center gap-1"
              >
                <Plus size={14} /> Add Question
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {showForm && (
            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 shadow-inner">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                  {editTarget ? "Edit Question" : "New Question"}
                </h4>
                <button onClick={handleCancelForm} className="p-1 rounded-lg text-slate-400 hover:bg-slate-200 transition">
                  <X size={14} />
                </button>
              </div>
              <QuestionForm
                initial={editTarget ? {
                  category: type.slug,
                  question: editTarget.question,
                  options: editTarget.options,
                  correctAnswer: editTarget.correctAnswer,
                  explanation: editTarget.explanation || "",
                } : emptyQuestion(type.slug)}
                fixedCategory={type.slug}
                onSave={handleSave}
                onCancel={handleCancelForm}
                saving={saving}
              />
            </div>
          )}

          {questions.length === 0 && !showForm ? (
            <div className="flex flex-col items-center py-16 text-center text-slate-400">
              <FolderOpen size={44} className="mb-3 opacity-30 text-indigo-500" />
              <p className="text-sm font-semibold">No questions in this quiz type yet</p>
              <button onClick={() => setShowForm(true)} className="mt-4 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition">
                + Add your first question
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((q) => (
                <QuestionRow
                  key={q.id}
                  quiz={q}
                  onEdit={handleEdit}
                  onDelete={onDeleteQuestion}
                  deleting={deleting}
                />
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end shrink-0">
          <button onClick={onClose} className="px-5 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Home Page Panel ─────────────────────────────────────────────────────────

function HomePagePanel({ allQuestions, quizTypes }) {
  const [selected, setSelected] = useState(new Set());
  const [origCat, setOrigCat] = useState({});
  const [autoRotateDaily, setAutoRotateDaily] = useState(true);
  const [dailyQuestionCount, setDailyQuestionCount] = useState("5");
  const [rotating, setRotating] = useState(false);
  const [rotateMsg, setRotateMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load existing home-page questions and settings on mount
  useEffect(() => {
    fetch("/api/dashboard/quizzes/home-page")
      .then((r) => r.json())
      .then((data) => {
        if (data.questions && Array.isArray(data.questions)) {
          setSelected(new Set(data.questions.map((q) => q.id)));
        } else if (Array.isArray(data)) {
          setSelected(new Set(data.map((q) => q.id)));
        }
        if (data.settings) {
          if (data.settings.autoRotateDaily !== undefined) {
            setAutoRotateDaily(data.settings.autoRotateDaily);
          }
          if (data.settings.dailyQuestionCount) {
            setDailyQuestionCount(String(data.settings.dailyQuestionCount));
          }
        }
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  // Build origCat map from allQuestions
  useEffect(() => {
    const map = {};
    allQuestions.forEach((q) => {
      if (q.category !== "home-page") map[q.id] = q.category || "general-wellness";
    });
    setOrigCat((prev) => ({ ...map, ...prev }));
  }, [allQuestions]);

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/quizzes/home-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionIds: [...selected],
          autoRotateDaily,
          dailyQuestionCount: parseInt(dailyQuestionCount, 10),
          sourceCategories: origCat,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const handleRotateNow = async () => {
    setRotating(true);
    setRotateMsg("");
    try {
      const res = await fetch("/api/dashboard/quizzes/home-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "rotate_now",
          dailyQuestionCount: parseInt(dailyQuestionCount, 10)
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (Array.isArray(data.questionIds)) {
          setSelected(new Set(data.questionIds));
        }
        setRotateMsg(`✨ Successfully selected ${dailyQuestionCount} random daily questions!`);
        setTimeout(() => setRotateMsg(""), 4000);
      }
    } catch (e) {
      alert("Failed to rotate questions: " + e.message);
    } finally {
      setRotating(false);
    }
  };

  // Group non-home-page questions by quiz type for display
  const typeMap = useMemo(() => {
    const pool = allQuestions.filter((q) => q.category !== "home-page");
    const map = {};
    quizTypes.forEach((t) => {
      map[t.slug] = pool.filter((q) =>
        t.slug === "general-wellness"
          ? !q.category || q.category === "general-wellness"
          : q.category === t.slug
      );
    });
    allQuestions.filter((q) => q.category === "home-page" && selected.has(q.id)).forEach((q) => {
      const src = origCat[q.id] || "general-wellness";
      if (!map[src]) map[src] = [];
      if (!map[src].find((x) => x.id === q.id)) map[src].push(q);
    });
    return map;
  }, [allQuestions, quizTypes, origCat, selected]);

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 size={24} className="animate-spin text-indigo-500" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Daily Rotation Control Panel Banner */}
      <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-emerald-500/10 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-600 text-white font-bold shrink-0 text-base shadow-sm">
            🎲
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                Daily Question Auto-Rotation
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                24h Auto-Sync Active
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
              Questions automatically change every 24 hours at 12:00 AM UTC. Random selection is picked daily across all quiz categories.
            </p>
            {rotateMsg && (
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1 animate-in fade-in duration-200">
                {rotateMsg}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto shrink-0 justify-end">
          {/* Question Count Dropdown Menu */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3.5 py-2 rounded-xl border border-indigo-200 dark:border-indigo-900/60 shadow-sm">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Daily Questions:</span>
            <select
              value={dailyQuestionCount}
              onChange={(e) => setDailyQuestionCount(e.target.value)}
              className="text-xs font-extrabold bg-transparent text-indigo-600 dark:text-emerald-400 focus:outline-none cursor-pointer pr-1"
            >
              <option value="1" className="text-slate-900 bg-white">1 Question</option>
              <option value="2" className="text-slate-900 bg-white">2 Questions</option>
              <option value="3" className="text-slate-900 bg-white">3 Questions</option>
              <option value="5" className="text-slate-900 bg-white">5 Questions (Default)</option>
              <option value="8" className="text-slate-900 bg-white">8 Questions</option>
              <option value="10" className="text-slate-900 bg-white">10 Questions</option>
              <option value="15" className="text-slate-900 bg-white">15 Questions</option>
              <option value="20" className="text-slate-900 bg-white">20 Questions</option>
              <option value="100" className="text-slate-900 bg-white">All Questions</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer shadow-sm">
            <input
              type="checkbox"
              checked={autoRotateDaily}
              onChange={(e) => setAutoRotateDaily(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
            />
            Auto-Rotate Every 24h
          </label>

          <button
            onClick={handleRotateNow}
            disabled={rotating}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition cursor-pointer shadow-sm disabled:opacity-60"
          >
            {rotating ? <Loader2 size={13} className="animate-spin" /> : "🎲 Rotate Questions Now"}
          </button>
        </div>
      </div>

      {/* Header strip */}
      <div className="bg-gradient-to-r from-[#0f7c85]/10 to-transparent border border-[#0f7c85]/20 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start gap-4">
        <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
          <div className="p-2 sm:p-2.5 rounded-xl bg-[#0f7c85]/10 text-[#0f7c85] shrink-0 mt-0.5">
            <MonitorSmartphone size={18} className="sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-slate-800 text-[14px] sm:text-[15px]">Home Page Quiz Widget</h3>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-relaxed break-words">
              Select specific questions below or rely on <strong>Daily Auto-Rotation</strong> for fresh questions every day.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
          <span className="text-[11px] sm:text-xs font-bold px-3 py-1.5 rounded-full bg-[#0f7c85]/10 text-[#0f7c85]">
            {selected.size} selected
          </span>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition w-full sm:w-auto justify-center ${saved
                ? "bg-green-500 text-white"
                : "bg-[#0f7c85] hover:bg-[#0c6b73] text-white disabled:opacity-60"
              }`}
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <Check size={13} /> : <Save size={13} />}
            {saving ? "Saving…" : saved ? "Saved!" : "Apply Changes"}
          </button>
        </div>
      </div>

      {/* Question groups */}
      {quizTypes.map((type) => {
        const qs = typeMap[type.slug] || [];
        if (qs.length === 0) return null;
        const color = type.categoryColor || "#6366f1";
        return (
          <div key={type.slug} className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-xs">
            {/* Type header */}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100"
              style={{ background: color + "0a" }}>
              <span className="text-lg">{type.icon || "📋"}</span>
              <span className="text-sm font-bold text-slate-700">{type.title}</span>
              <span className="ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: color + "22", color }}>
                {qs.filter((q) => selected.has(q.id)).length} / {qs.length} selected
              </span>
            </div>

            {/* Questions */}
            <div className="divide-y divide-slate-50">
              {qs.map((q) => {
                const isChecked = selected.has(q.id);
                return (
                  <label
                    key={q.id}
                    className={`flex items-start gap-3 px-5 py-3.5 cursor-pointer transition-colors ${isChecked ? "bg-[#0f7c85]/05" : "hover:bg-slate-50"
                      }`}
                  >
                    {/* Custom checkbox */}
                    <div
                      onClick={() => toggle(q.id)}
                      className={`mt-0.5 shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${isChecked
                          ? "bg-[#0f7c85] border-[#0f7c85]"
                          : "border-slate-300 hover:border-[#0f7c85]"
                        }`}
                    >
                      {isChecked && <Check size={11} className="text-white" />}
                    </div>

                    <div className="flex-1 min-w-0" onClick={() => toggle(q.id)}>
                      <p className="text-sm font-medium text-slate-800 leading-snug line-clamp-2">
                        {q.question}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {q.options.length} options &middot; correct: {q.options[parseInt(q.correctAnswer)] ?? "?"}
                      </p>
                    </div>

                    {isChecked && (
                      <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#0f7c85]/10 text-[#0f7c85] mt-0.5">
                        ✓ On Home
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}

      {quizTypes.every((t) => (typeMap[t.slug] || []).length === 0) && (
        <div className="text-center py-16 text-slate-400">
          <HelpCircle size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-semibold">No questions available</p>
          <p className="text-xs mt-1">Add questions to your quiz types first, then select them here.</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function QuizzesAdminPage() {
  const [activeTab, setActiveTab] = useState("types"); // "types" | "home-page"
  const [quizTypes, setQuizTypes] = useState([]);
  const [allQuestions, setAllQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Type modal
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editTypeTarget, setEditTypeTarget] = useState(null);
  const [savingType, setSavingType] = useState(false);
  const [deletingType, setDeletingType] = useState(null);

  // Question form/management modal states
  const [activeManageType, setActiveManageType] = useState(null);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [deletingQuestion, setDeletingQuestion] = useState(null);

  const [search, setSearch] = useState("");

  const siteId = typeof window !== "undefined" ? localStorage.getItem("x-site-id") : null;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [typesRes, questionsRes] = await Promise.all([
        fetch("/api/dashboard/quiz-types"),
        fetch("/api/dashboard/quizzes"),
      ]);
      if (!typesRes.ok) throw new Error("Failed to load quiz types");
      if (!questionsRes.ok) throw new Error("Failed to load questions");
      setQuizTypes(await typesRes.json());
      setAllQuestions(await questionsRes.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Quiz Type CRUD ──

  const handleSaveType = async (form) => {
    setSavingType(true);
    try {
      const isEdit = !!editTypeTarget;
      const url = isEdit ? `/api/dashboard/quiz-types/${editTypeTarget.id}` : "/api/dashboard/quiz-types";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Save failed"); }
      setShowTypeModal(false);
      setEditTypeTarget(null);
      load();
    } catch (e) { alert(e.message); }
    finally { setSavingType(false); }
  };

  const handleDeleteType = async (id) => {
    if (!confirm("Delete this quiz type? Questions inside it will remain but become unlinked.")) return;
    setDeletingType(id);
    try {
      const res = await fetch(`/api/dashboard/quiz-types/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      load();
    } catch (e) { alert(e.message); }
    finally { setDeletingType(null); }
  };

  const handleToggleActive = async (type) => {
    try {
      await fetch(`/api/dashboard/quiz-types/${type.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...type, isActive: !type.isActive }),
      });
      load();
    } catch { /* ignore */ }
  };

  // ── Question CRUD ──

  const handleSaveQuestion = async (form, editId) => {
    setSavingQuestion(true);
    try {
      const isEdit = !!editId;
      const url = isEdit ? `/api/dashboard/quizzes/${editId}` : "/api/dashboard/quizzes";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Save failed"); }
      load();
    } catch (e) { alert(e.message); }
    finally { setSavingQuestion(false); }
  };

  const handleDeleteQuestion = async (id) => {
    if (!confirm("Delete this question? Associated analytics will also be removed.")) return;
    setDeletingQuestion(id);
    try {
      const res = await fetch(`/api/dashboard/quizzes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      load();
    } catch (e) { alert(e.message); }
    finally { setDeletingQuestion(null); }
  };

  // ── Derived data ──

  const questionsByType = useMemo(() => {
    const sq = search
      ? allQuestions.filter((q) => q.question.toLowerCase().includes(search.toLowerCase()))
      : allQuestions;
    const map = {};
    for (const t of quizTypes) {
      map[t.slug] = sq.filter((q) =>
        t.slug === "general-wellness"
          ? !q.category || q.category === "general-wellness"
          : q.category === t.slug
      );
    }
    return map;
  }, [allQuestions, quizTypes, search]);

  const totalPlays = allQuestions.reduce((s, q) => s + (q.playCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Quiz Manager</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage quiz types and questions.{" "}
            <a href="/quizzes" target="_blank" className="text-indigo-600 hover:underline">
              View on frontend →
            </a>
          </p>
        </div>
        {activeTab === "types" && (
          <button onClick={() => { setEditTypeTarget(null); setShowTypeModal(true); }}
            className="admin-btn admin-btn-primary shadow-md shadow-indigo-600/10">
            <Plus size={14} /> New Quiz Type
          </button>
        )}
      </div>

      {/* ── Tab Switcher ── */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {[
          { id: "types", label: "Quiz Types & Questions", icon: <Layers size={14} /> },
          { id: "home-page", label: "Home Page Quiz", icon: <Home size={14} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === tab.id
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
              }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {[
          { icon: <Layers size={18} />, label: "Quiz Types", value: quizTypes.length, color: "indigo" },
          { icon: <HelpCircle size={18} />, label: "Questions", value: allQuestions.length, color: "green" },
          { icon: <BarChart2 size={18} />, label: "Total Plays", value: totalPlays, color: "amber" },
        ].map((m) => (
          <div key={m.label} className="bg-white border border-slate-100 rounded-2xl p-4 md:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className={`p-2.5 rounded-xl bg-${m.color}-50 text-${m.color}-600 shrink-0`}>{m.icon}</div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{m.label}</div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900">{m.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quiz Type Modal */}
      {showTypeModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 bg-black/30 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl p-4 sm:p-6 relative my-6 sm:my-8">
            <div className="flex items-start sm:items-center justify-between mb-5 gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-bold text-slate-800 truncate">
                  {editTypeTarget ? "Edit Quiz Type" : "Create Quiz Type"}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed break-words">
                  This controls what appears on the public quizzes page
                </p>
              </div>
              <button onClick={() => { setShowTypeModal(false); setEditTypeTarget(null); }}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition">
                <X size={16} />
              </button>
            </div>
            <QuizTypeForm
              siteId={siteId}
              initial={editTypeTarget ? {
                slug: editTypeTarget.slug,
                title: editTypeTarget.title,
                subtitle: editTypeTarget.subtitle || "",
                description: editTypeTarget.description,
                category: editTypeTarget.category,
                categoryColor: editTypeTarget.categoryColor,
                imageUrl: editTypeTarget.imageUrl || "",
                icon: editTypeTarget.icon || "📋",
                estimatedMinutes: editTypeTarget.estimatedMinutes,
                difficulty: editTypeTarget.difficulty,
              } : undefined}
              isEdit={!!editTypeTarget}
              onSave={handleSaveType}
              onCancel={() => { setShowTypeModal(false); setEditTypeTarget(null); }}
              saving={savingType}
            />
          </div>
        </div>
      )}

      {/* Search */}
      <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
        placeholder="Search questions across all types…"
        className="w-full max-w-sm px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-xs transition" />

      {/* States */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-indigo-500" />
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700 text-sm font-medium">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {!loading && !error && quizTypes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-center">
          <Tag size={40} className="mb-3 opacity-30" />
          <p className="text-sm font-semibold">No quiz types yet</p>
          <button onClick={() => setShowTypeModal(true)}
            className="mt-4 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition">
            + Create your first quiz type
          </button>
        </div>
      )}

      {/* Tab content */}
      {activeTab === "home-page" && !loading && (
        <HomePagePanel allQuestions={allQuestions} quizTypes={quizTypes} />
      )}



      {activeTab === "types" && (
        <>
          {/* Type cards Grid */}
          {!loading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
              {quizTypes.map((type) => (
                <QuizTypeCard
                  key={type.id}
                  type={type}
                  allQuestions={allQuestions}
                  questionCount={(questionsByType[type.slug] || []).length}
                  onEditType={(t) => { setEditTypeTarget(t); setShowTypeModal(true); }}
                  onDeleteType={handleDeleteType}
                  onToggleActive={handleToggleActive}
                  onManageQuestions={(t) => setActiveManageType(t)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Questions Management Modal */}
      {activeManageType && (
        <QuestionsManagementModal
          type={activeManageType}
          questions={questionsByType[activeManageType.slug] || []}
          onSaveQuestion={handleSaveQuestion}
          onDeleteQuestion={handleDeleteQuestion}
          deleting={deletingQuestion}
          saving={savingQuestion}
          onClose={() => setActiveManageType(null)}
        />
      )}
    </div>
  );
}
