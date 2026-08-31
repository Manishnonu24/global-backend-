#!/usr/bin/env node

/**
 * scaffold-page-content.js
 * 
 * Usage:
 *   node scripts/scaffold-page-content.js <PageName> --fields=name:type,name:type
 * 
 * Example:
 *   node scripts/scaffold-page-content.js About --fields=heroHeading:text,heroImage:image,heroDescription:textarea
 * 
 * Valid types: text, textarea, image
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const pageName = args[0];
const fieldsArg = args.find(a => a.startsWith('--fields='));

if (!pageName || !fieldsArg) {
  console.error('Usage: node scripts/scaffold-page-content.js <PageName> --fields=name:type,...');
  console.error('Example: node scripts/scaffold-page-content.js About --fields=heroHeading:text,heroImage:image,heroDescription:textarea');
  process.exit(1);
}

const fieldsString = fieldsArg.split('=')[1];
const fields = fieldsString.split(',').map(f => {
  const [name, type] = f.split(':');
  return { name, type };
});

const validTypes = ['text', 'textarea', 'image'];

for (const field of fields) {
  if (!validTypes.includes(field.type)) {
    console.error(`Error: Invalid field type "${field.type}" for field "${field.name}".`);
    console.error(`Valid types are: ${validTypes.join(', ')}`);
    process.exit(1);
  }
}

// 1. Generate defaultContent object
const defaultContentObj = fields.reduce((acc, field) => {
  acc[field.name] = '';
  return acc;
}, {});

const defaultContentCode = `export const ${pageName.toLowerCase()}DefaultContent = ${JSON.stringify(defaultContentObj, null, 2)};`;

// 2. Generate Form Component file
const formComponentName = `${pageName}PageContentForm`;
const hasImage = fields.some(f => f.type === 'image');
const hasText = fields.some(f => f.type === 'text');
const hasTextarea = fields.some(f => f.type === 'textarea');

const imports = [
  'import { useState, useEffect } from "react";',
  'import { Save } from "lucide-react";',
  hasText ? 'import TextField from "./contentFields/TextField";' : '',
  hasTextarea ? 'import TextAreaField from "./contentFields/TextAreaField";' : '',
  hasImage ? 'import ImageField from "./contentFields/ImageField";' : '',
].filter(Boolean).join('\n');

const fieldsJsx = fields.map(f => {
  const label = f.name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  if (f.type === 'text') {
    return `        <TextField label="${label}" value={fields.${f.name}} onChange={(v) => handleChange("${f.name}", v)} />`;
  }
  if (f.type === 'textarea') {
    return `        <TextAreaField label="${label}" value={fields.${f.name}} onChange={(v) => handleChange("${f.name}", v)} />`;
  }
  if (f.type === 'image') {
    return `        <ImageField label="${label}" value={fields.${f.name}} onChange={(v) => handleChange("${f.name}", v)} siteId={siteId} />`;
  }
}).join('\n');

const formComponentCode = `"use client";

${imports}

export default function ${formComponentName}({
  pageId,
  siteId,
  fetchWithAuth,
  onSaved,
}) {
  const [fields, setFields] = useState(${JSON.stringify(defaultContentObj, null, 4)});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const res = await fetchWithAuth(\`/api/dashboard/pages/\${pageId}/page-content\`);
        if (res.ok) {
          const data = await res.json();
          if (data.data) {
            setFields((prev) => ({ ...prev, ...data.data }));
          }
        }
      } catch (err) {
        console.error("Failed to load content", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [pageId, fetchWithAuth]);

  const handleChange = (field, value) => {
    setFields((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetchWithAuth(\`/api/dashboard/pages/\${pageId}/page-content\`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: fields }),
      });
      if (res.ok) {
        if (onSaved) onSaved();
      } else {
        alert("Failed to save content.");
      }
    } catch (err) {
      alert("Error saving content.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-xs text-gray-400 p-4">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
${fieldsJsx}
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-sm disabled:opacity-50"
        >
          <Save size={12} />
          {saving ? "Saving..." : "Save Content"}
        </button>
      </div>
    </div>
  );
}
`;

console.log('--- Default Content ---');
console.log(defaultContentCode);
console.log('\n--- Wiring Snippet for pageEditorClient.js ---');
console.log(`import ${formComponentName} from "./${formComponentName}";`);
console.log(`"/some-route": { label: "${pageName} Hero", FormComponent: ${formComponentName} },`);
console.log('\n--- Form Component ---');
console.log(`// Save this to src/app/dashboard/pages/[pageId]/edit/${formComponentName}.js`);
console.log(formComponentCode);
