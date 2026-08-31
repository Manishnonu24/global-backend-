"use client";

import { useRef, useMemo, useState, useEffect, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import CharacterCount from "@tiptap/extension-character-count";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";

import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Pilcrow,
  List,
  ListOrdered,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link as LinkIcon,
  Unlink,
  Image as ImageIcon,
  Table as TableIcon,
  Highlighter,
  Palette,
  Undo2,
  Redo2,
  Minus,
  Code2,
  Eraser,
  Check,
  X,
  Maximize2,
  Minimize2,
  FileCode,
  Plus,
  Trash2,
  ChevronDown,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Block-JSON → HTML converter
// Handles legacy BlockNote JSON so older posts render cleanly without data loss.
// ---------------------------------------------------------------------------
function blocksToHtml(blocks) {
  if (!Array.isArray(blocks)) return "";

  const renderInline = (contentArr) => {
    if (!contentArr) return "";
    return contentArr
      .map((node) => {
        if (typeof node === "string") return node;
        if (node.type === "text") {
          let text = node.text || "";
          const s = node.styles || {};
          if (s.bold) text = `<strong>${text}</strong>`;
          if (s.italic) text = `<em>${text}</em>`;
          if (s.underline) text = `<u>${text}</u>`;
          if (s.strike) text = `<s>${text}</s>`;
          if (s.code) text = `<code>${text}</code>`;
          return text;
        }
        if (node.type === "link") {
          const inner = renderInline(node.content);
          return `<a href="${node.href || "#"}">${inner}</a>`;
        }
        return node.text || "";
      })
      .join("");
  };

  return blocks
    .map((block) => {
      const inner = renderInline(block.content);
      const children =
        block.children && block.children.length
          ? blocksToHtml(block.children)
          : "";

      switch (block.type) {
        case "heading": {
          const level = block.props?.level || 1;
          return `<h${level}>${inner}</h${level}>`;
        }
        case "paragraph":
          return inner ? `<p>${inner}</p>` : "<p></p>";
        case "bulletListItem":
          return `<ul><li>${inner}${children}</li></ul>`;
        case "numberedListItem":
          return `<ol><li>${inner}${children}</li></ol>`;
        case "checkListItem":
          return `<ul data-type="taskList"><li data-checked="${Boolean(block.props?.checked)}">${inner}</li></ul>`;
        case "image":
          return `<img src="${block.props?.url || ""}" alt="${block.props?.caption || ""}" />`;
        case "quote":
          return `<blockquote><p>${inner}</p></blockquote>`;
        case "code":
          return `<pre><code>${inner}</code></pre>`;
        case "table": {
          const rows = (block.content?.rows || [])
            .map(
              (row) =>
                `<tr>${(row.cells || []).map((cell) => `<td>${renderInline(cell)}</td>`).join("")}</tr>`
            )
            .join("");
          return `<table><tbody>${rows}</tbody></table>`;
        }
        default:
          return inner ? `<p>${inner}</p>` : "";
      }
    })
    .join("\n");
}

// ---------------------------------------------------------------------------
// Resolve initial HTML content from either BlockNote JSON or HTML string
// ---------------------------------------------------------------------------
function resolveInitialHtml(initialContent, fallbackHtml) {
  if (initialContent) {
    try {
      const parsed = JSON.parse(initialContent);
      if (Array.isArray(parsed)) {
        const html = blocksToHtml(parsed);
        if (html) return html;
      }
    } catch {
      // Raw HTML string
      return initialContent;
    }
  }
  return fallbackHtml || "";
}

const PRESET_COLORS = [
  "#000000",
  "#475569",
  "#dc2626",
  "#ea580c",
  "#d97706",
  "#16a34a",
  "#0d9488",
  "#2563eb",
  "#7c3aed",
  "#db2777",
];

const PRESET_HIGHLIGHTS = [
  "#fef08a", // yellow
  "#bbf7d0", // green
  "#bae6fd", // blue
  "#fbcfe8", // pink
  "#fed7aa", // orange
  "#e2e8f0", // gray
];

// ---------------------------------------------------------------------------
// Main TipTap BlockEditor Component
// ---------------------------------------------------------------------------
export default function BlockEditor({
  initialContent,
  fallbackHtml,
  onChangeHtml,
  onChangeJson,
  placeholder = "Start writing your content...",
}) {
  const [isDark, setIsDark] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isSourceMode, setIsSourceMode] = useState(false);
  const [rawHtmlSource, setRawHtmlSource] = useState("");
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [tableMenuOpen, setTableMenuOpen] = useState(false);
  const [colorMenuOpen, setColorMenuOpen] = useState(false);
  const [highlightMenuOpen, setHighlightMenuOpen] = useState(false);

  const initialHtml = useMemo(
    () => resolveInitialHtml(initialContent, fallbackHtml),
    [initialContent, fallbackHtml]
  );

  const isInitialMount = useRef(true);

  // Dark mode listener
  useEffect(() => {
    if (typeof document === "undefined") return;
    setIsDark(document.documentElement.classList.contains("dark"));

    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // Initialize TipTap Editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
        codeBlock: {
          HTMLAttributes: {
            class: "rounded-lg bg-slate-900 text-slate-100 p-4 font-mono text-sm my-4 overflow-x-auto",
          },
        },
        blockquote: {
          HTMLAttributes: {
            class: "border-l-4 border-indigo-500 pl-4 italic text-slate-600 dark:text-slate-300 my-4",
          },
        },
        bulletList: {
          HTMLAttributes: {
            class: "list-disc pl-6 my-3 space-y-1",
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: "list-decimal pl-6 my-3 space-y-1",
          },
        },
        link: {
          openOnClick: false,
          HTMLAttributes: {
            class: "text-indigo-600 dark:text-indigo-400 underline font-medium hover:text-indigo-800 transition",
            target: "_blank",
            rel: "noopener noreferrer",
          },
        },
        underline: {},
      }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Image.configure({
        allowBase64: true,
        HTMLAttributes: {
          class: "rounded-xl max-w-full h-auto my-4 shadow-sm border border-slate-200 dark:border-slate-800",
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: "border-collapse table-auto w-full my-4 text-sm border border-slate-300 dark:border-slate-700",
        },
      }),
      TableRow,
      TableHeader.configure({
        HTMLAttributes: {
          class: "border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 font-semibold p-2.5 text-left",
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: "border border-slate-300 dark:border-slate-700 p-2.5",
        },
      }),
      CharacterCount,
    ],
    content: initialHtml,
    editorProps: {
      attributes: {
        class:
          "tiptap ProseMirror focus:outline-none min-h-[360px] p-6 text-slate-800 dark:text-slate-100 text-[15px] leading-relaxed",
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      if (onChangeHtml) onChangeHtml(html);
      if (onChangeJson) onChangeJson(html);
    },
    immediatelyRender: false,
  });

  // Handle external initial content updates
  useEffect(() => {
    if (editor && initialHtml && isInitialMount.current) {
      isInitialMount.current = false;
      const currentHtml = editor.getHTML();
      if (currentHtml === "<p></p>" || !currentHtml) {
        editor.commands.setContent(initialHtml, false);
      }
    }
  }, [editor, initialHtml]);

  // Toggle Source View Mode
  const handleToggleSource = useCallback(() => {
    if (!editor) return;
    if (!isSourceMode) {
      setRawHtmlSource(editor.getHTML());
      setIsSourceMode(true);
    } else {
      editor.commands.setContent(rawHtmlSource, true);
      const updated = editor.getHTML();
      if (onChangeHtml) onChangeHtml(updated);
      if (onChangeJson) onChangeJson(updated);
      setIsSourceMode(false);
    }
  }, [editor, isSourceMode, rawHtmlSource, onChangeHtml, onChangeJson]);

  // Link Dialog Handlers
  const handleOpenLinkModal = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href || "";
    setLinkUrl(previousUrl);
    setLinkModalOpen(true);
  }, [editor]);

  const handleApplyLink = useCallback(() => {
    if (!editor) return;
    if (linkUrl === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      const validUrl = linkUrl.startsWith("http") || linkUrl.startsWith("/") || linkUrl.startsWith("mailto:")
        ? linkUrl
        : `https://${linkUrl}`;
      editor.chain().focus().extendMarkRange("link").setLink({ href: validUrl }).run();
    }
    setLinkModalOpen(false);
  }, [editor, linkUrl]);

  // Image Dialog Handlers
  const handleApplyImage = useCallback(() => {
    if (!editor || !imageUrl) return;
    editor.chain().focus().setImage({ src: imageUrl, alt: imageAlt || undefined }).run();
    setImageUrl("");
    setImageAlt("");
    setImageModalOpen(false);
  }, [editor, imageUrl, imageAlt]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center p-12 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-900/50">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent" />
        <span className="ml-3 text-xs font-medium text-slate-500">Loading editor...</span>
      </div>
    );
  }

  const charCount = editor.storage.characterCount.characters();
  const wordCount = editor.storage.characterCount.words();

  return (
    <div
      className={`tiptap-editor-wrapper relative flex flex-col rounded-2xl border transition-all ${
        isFullScreen
          ? "fixed inset-0 z-50 rounded-none border-none bg-white dark:bg-slate-900 overflow-hidden"
          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-xs"
      }`}
    >
      {/* ─── Sticky Toolbar ─── */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-0.5 border-b border-slate-200/90 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-2 rounded-t-2xl">
        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5 pr-1 border-r border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={15} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 size={15} />
          </button>
        </div>

        {/* Paragraph & Headings */}
        <div className="flex items-center gap-0.5 px-1 border-r border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => editor.chain().focus().setParagraph().run()}
            className={`p-1.5 rounded-lg transition text-xs font-semibold px-2 ${
              editor.isActive("paragraph") && !editor.isActive("heading")
                ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
            }`}
            title="Normal Paragraph"
          >
            <Pilcrow size={14} className="inline mr-1" /> P
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`p-1.5 rounded-lg transition ${
              editor.isActive("heading", { level: 1 })
                ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
            }`}
            title="Heading 1"
          >
            <Heading1 size={15} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-1.5 rounded-lg transition ${
              editor.isActive("heading", { level: 2 })
                ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
            }`}
            title="Heading 2"
          >
            <Heading2 size={15} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`p-1.5 rounded-lg transition ${
              editor.isActive("heading", { level: 3 })
                ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
            }`}
            title="Heading 3"
          >
            <Heading3 size={15} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
            className={`p-1.5 rounded-lg transition ${
              editor.isActive("heading", { level: 4 })
                ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
            }`}
            title="Heading 4"
          >
            <Heading4 size={15} />
          </button>
        </div>

        {/* Text Formats: Bold, Italic, Underline, Strikethrough, Code */}
        <div className="flex items-center gap-0.5 px-1 border-r border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded-lg transition ${
              editor.isActive("bold")
                ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
            }`}
            title="Bold (Ctrl+B)"
          >
            <Bold size={15} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded-lg transition ${
              editor.isActive("italic")
                ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
            }`}
            title="Italic (Ctrl+I)"
          >
            <Italic size={15} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-1.5 rounded-lg transition ${
              editor.isActive("underline")
                ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
            }`}
            title="Underline (Ctrl+U)"
          >
            <UnderlineIcon size={15} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`p-1.5 rounded-lg transition ${
              editor.isActive("strike")
                ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
            }`}
            title="Strikethrough"
          >
            <Strikethrough size={15} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`p-1.5 rounded-lg transition ${
              editor.isActive("code")
                ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
            }`}
            title="Inline Code"
          >
            <Code size={15} />
          </button>
        </div>

        {/* Text Alignment */}
        <div className="flex items-center gap-0.5 px-1 border-r border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            className={`p-1.5 rounded-lg transition ${
              editor.isActive({ textAlign: "left" })
                ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
            }`}
            title="Align Left"
          >
            <AlignLeft size={15} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            className={`p-1.5 rounded-lg transition ${
              editor.isActive({ textAlign: "center" })
                ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
            }`}
            title="Align Center"
          >
            <AlignCenter size={15} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            className={`p-1.5 rounded-lg transition ${
              editor.isActive({ textAlign: "right" })
                ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
            }`}
            title="Align Right"
          >
            <AlignRight size={15} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign("justify").run()}
            className={`p-1.5 rounded-lg transition ${
              editor.isActive({ textAlign: "justify" })
                ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
            }`}
            title="Align Justify"
          >
            <AlignJustify size={15} />
          </button>
        </div>

        {/* Lists & Quotes */}
        <div className="flex items-center gap-0.5 px-1 border-r border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded-lg transition ${
              editor.isActive("bulletList")
                ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
            }`}
            title="Bullet List"
          >
            <List size={15} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded-lg transition ${
              editor.isActive("orderedList")
                ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
            }`}
            title="Numbered List"
          >
            <ListOrdered size={15} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-1.5 rounded-lg transition ${
              editor.isActive("blockquote")
                ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
            }`}
            title="Blockquote"
          >
            <Quote size={15} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={`p-1.5 rounded-lg transition ${
              editor.isActive("codeBlock")
                ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
            }`}
            title="Code Block"
          >
            <Code2 size={15} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
            title="Horizontal Divider"
          >
            <Minus size={15} />
          </button>
        </div>

        {/* Links, Images, Tables, Color, Highlight */}
        <div className="flex items-center gap-0.5 px-1 border-r border-slate-200 dark:border-slate-800 relative">
          <button
            type="button"
            onClick={handleOpenLinkModal}
            className={`p-1.5 rounded-lg transition ${
              editor.isActive("link")
                ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
            }`}
            title="Insert Link"
          >
            <LinkIcon size={15} />
          </button>
          {editor.isActive("link") && (
            <button
              type="button"
              onClick={() => editor.chain().focus().unsetLink().run()}
              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
              title="Remove Link"
            >
              <Unlink size={15} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setImageModalOpen(true)}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
            title="Insert Image"
          >
            <ImageIcon size={15} />
          </button>

          {/* Table Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setTableMenuOpen((p) => !p)}
              className={`p-1.5 rounded-lg transition flex items-center gap-0.5 ${
                editor.isActive("table")
                  ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
              }`}
              title="Table Operations"
            >
              <TableIcon size={15} />
              <ChevronDown size={10} />
            </button>
            {tableMenuOpen && (
              <div
                className="absolute left-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-1.5 z-30 space-y-1 text-xs"
                onMouseLeave={() => setTableMenuOpen(false)}
              >
                {!editor.isActive("table") ? (
                  <button
                    type="button"
                    onClick={() => {
                      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
                      setTableMenuOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200"
                  >
                    <Plus size={13} /> Insert Table (3×3)
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => { editor.chain().focus().addRowAfter().run(); setTableMenuOpen(false); }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200"
                    >
                      <Plus size={13} /> Add Row Below
                    </button>
                    <button
                      type="button"
                      onClick={() => { editor.chain().focus().deleteRow().run(); setTableMenuOpen(false); }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200"
                    >
                      <Trash2 size={13} /> Delete Row
                    </button>
                    <button
                      type="button"
                      onClick={() => { editor.chain().focus().addColumnAfter().run(); setTableMenuOpen(false); }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200"
                    >
                      <Plus size={13} /> Add Column Right
                    </button>
                    <button
                      type="button"
                      onClick={() => { editor.chain().focus().deleteColumn().run(); setTableMenuOpen(false); }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200"
                    >
                      <Trash2 size={13} /> Delete Column
                    </button>
                    <div className="border-t border-slate-200 dark:border-slate-700 my-1" />
                    <button
                      type="button"
                      onClick={() => { editor.chain().focus().deleteTable().run(); setTableMenuOpen(false); }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 flex items-center gap-2 text-rose-600"
                    >
                      <Trash2 size={13} /> Remove Entire Table
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Text Color Picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setColorMenuOpen((p) => !p)}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition flex items-center gap-0.5"
              title="Text Color"
            >
              <Palette size={15} />
            </button>
            {colorMenuOpen && (
              <div
                className="absolute left-0 mt-2 p-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-30 flex items-center gap-1.5 flex-wrap w-44"
                onMouseLeave={() => setColorMenuOpen(false)}
              >
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      editor.chain().focus().setColor(c).run();
                      setColorMenuOpen(false);
                    }}
                    style={{ backgroundColor: c }}
                    className="w-6 h-6 rounded-full border border-slate-300 dark:border-slate-600 hover:scale-110 transition shadow-xs"
                    title={c}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().unsetColor().run();
                    setColorMenuOpen(false);
                  }}
                  className="text-[10px] text-slate-500 dark:text-slate-400 hover:underline w-full text-center mt-1"
                >
                  Reset Color
                </button>
              </div>
            )}
          </div>

          {/* Highlight Picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setHighlightMenuOpen((p) => !p)}
              className={`p-1.5 rounded-lg transition flex items-center gap-0.5 ${
                editor.isActive("highlight")
                  ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-bold"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
              }`}
              title="Highlight Text"
            >
              <Highlighter size={15} />
            </button>
            {highlightMenuOpen && (
              <div
                className="absolute left-0 mt-2 p-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-30 flex items-center gap-1.5 flex-wrap w-44"
                onMouseLeave={() => setHighlightMenuOpen(false)}
              >
                {PRESET_HIGHLIGHTS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => {
                      editor.chain().focus().toggleHighlight({ color: h }).run();
                      setHighlightMenuOpen(false);
                    }}
                    style={{ backgroundColor: h }}
                    className="w-6 h-6 rounded-md border border-slate-300 dark:border-slate-600 hover:scale-110 transition shadow-xs"
                    title={h}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().unsetHighlight().run();
                    setHighlightMenuOpen(false);
                  }}
                  className="text-[10px] text-slate-500 dark:text-slate-400 hover:underline w-full text-center mt-1"
                >
                  Clear Highlight
                </button>
              </div>
            )}
          </div>

          {/* Clear Formatting */}
          <button
            type="button"
            onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
            title="Clear Formatting"
          >
            <Eraser size={15} />
          </button>
        </div>

        {/* View Controls: Source View & Fullscreen */}
        <div className="flex items-center gap-0.5 ml-auto">
          <button
            type="button"
            onClick={handleToggleSource}
            className={`p-1.5 rounded-lg transition text-xs font-semibold flex items-center gap-1 px-2 ${
              isSourceMode
                ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-bold"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
            }`}
            title="Toggle HTML Source"
          >
            <FileCode size={14} /> {isSourceMode ? "Visual" : "HTML"}
          </button>
          <button
            type="button"
            onClick={() => setIsFullScreen((p) => !p)}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
            title={isFullScreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullScreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      {/* ─── Editor Surface / Source Area ─── */}
      <div className={`editor-content-area flex-1 overflow-y-auto ${isFullScreen ? "h-[calc(100vh-80px)]" : "max-h-[750px]"}`}>
        {isSourceMode ? (
          <textarea
            value={rawHtmlSource}
            onChange={(e) => setRawHtmlSource(e.target.value)}
            className="w-full h-full min-h-[380px] p-6 font-mono text-xs leading-relaxed bg-slate-900 text-emerald-400 focus:outline-none resize-none"
            placeholder="Edit raw HTML source code here..."
          />
        ) : (
          <EditorContent editor={editor} />
        )}
      </div>

      {/* ─── Status Footer ─── */}
      <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 px-4 py-2 bg-slate-50/50 dark:bg-slate-900/50 text-[11px] text-slate-400">
        <div className="flex items-center gap-3">
          <span>{wordCount.toLocaleString("en-US")} words</span>
          <span>•</span>
          <span>{charCount.toLocaleString("en-US")} characters</span>
        </div>
        <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
          TipTap WYSIWYG
        </div>
      </div>

      {/* ─── Link Modal ─── */}
      {linkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <LinkIcon size={16} className="text-indigo-600" /> Insert or Edit Link
              </h3>
              <button
                type="button"
                onClick={() => setLinkModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={16} />
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Destination URL
              </label>
              <input
                type="text"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com or /blogs/my-post"
                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2.5 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleApplyLink();
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setLinkModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyLink}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-xs"
              >
                Apply Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Image Modal ─── */}
      {imageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <ImageIcon size={16} className="text-indigo-600" /> Insert Image
              </h3>
              <button
                type="button"
                onClick={() => setImageModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Image URL
                </label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.webp or S3 link"
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2.5 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Alt Text (Optional)
                </label>
                <input
                  type="text"
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  placeholder="Descriptive image title for SEO & accessibility"
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2.5 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleApplyImage();
                    }
                  }}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setImageModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyImage}
                disabled={!imageUrl}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition shadow-xs"
              >
                Insert Image
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
