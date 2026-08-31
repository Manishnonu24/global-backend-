import JSZip from "jszip";

export const TABLE_ENTITY_MAP = {
  pages: "pages",
  page: "pages",
  tbl_pages: "pages",
  posts: "posts",
  post: "posts",
  blogs: "posts",
  blog: "posts",
  articles: "posts",
  services: "services",
  service: "services",
  testimonials: "testimonials",
  testimonial: "testimonials",
  faqs: "faqs",
  faq: "faqs",
  teammembers: "teamMembers",
  team_members: "teamMembers",
  teammember: "teamMembers",
  team: "teamMembers",
  legalpages: "legalPages",
  legal_pages: "legalPages",
  legalpage: "legalPages",
  redirects: "redirects",
  redirect: "redirects",
  submissions: "submissions",
  contactformsubmissions: "submissions",
  contact_form_submissions: "submissions",
  leads: "leads",
  lead: "leads",
  categories: "categories",
  category: "categories",
  tags: "tags",
  tag: "tags",
  media: "media",
  folders: "folders",
};

export const ENTITY_LABEL_MAP = {
  pages: "Pages",
  posts: "Blog Posts",
  services: "Services",
  testimonials: "Testimonials",
  faqs: "FAQs",
  teamMembers: "Team Members",
  legalPages: "Legal Pages",
  redirects: "Redirects",
  submissions: "Contact Submissions",
  leads: "Leads",
  categories: "Categories",
  tags: "Tags",
  media: "Media Assets",
  folders: "Media Folders",
};

function castValue(val) {
  if (val === null || val === undefined) return null;
  if (typeof val !== "string") return val;
  const trimmed = val.trim();
  if (
    trimmed === "" ||
    trimmed.toLowerCase() === "null" ||
    trimmed.toLowerCase() === "nil"
  )
    return null;
  if (trimmed.toLowerCase() === "true") return true;
  if (trimmed.toLowerCase() === "false") return false;

  // Try parsing number
  if (
    !isNaN(trimmed) &&
    trimmed !== "" &&
    !trimmed.includes(" ") &&
    !trimmed.startsWith("0x")
  ) {
    const num = Number(trimmed);
    if (!isNaN(num)) return num;
  }

  // Try parsing JSON object or array
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // Return as plain string if JSON parse fails
    }
  }

  return trimmed;
}

// 1. CSV Parser
export function parseCsvText(csvText) {
  if (!csvText || !csvText.trim()) return [];

  const lines = [];
  let currentLine = "";
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentLine += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++;
      }
      lines.push(currentLine);
      currentLine = "";
    } else {
      currentLine += char;
    }
  }
  if (currentLine.trim()) {
    lines.push(currentLine);
  }

  if (lines.length === 0) return [];

  const parseRow = (line) => {
    const cells = [];
    let cell = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      const next = line[i + 1];
      if (c === '"') {
        if (inQuotes && next === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === "," && !inQuotes) {
        cells.push(cell);
        cell = "";
      } else {
        cell += c;
      }
    }
    cells.push(cell);
    return cells;
  };

  const headers = parseRow(lines[0]).map((h) =>
    h.trim().replace(/^"|"$/g, ""),
  );
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseRow(lines[i]);
    const rowObj = {};
    headers.forEach((h, index) => {
      if (h) {
        rowObj[h] = castValue(values[index]);
      }
    });
    records.push(rowObj);
  }

  return records;
}

// 2. SQL Parser
export function parseSqlText(sqlText) {
  const data = {};

  // Match INSERT INTO statements
  const insertRegex =
    /INSERT\s+INTO\s+[`"']?([a-zA-Z0-9_-]+)[`"']?\s*\(([^)]+)\)\s*VALUES\s*([\s\S]+?);/gi;
  let match;

  while ((match = insertRegex.exec(sqlText)) !== null) {
    const rawTable = match[1].toLowerCase();
    const entityKey = TABLE_ENTITY_MAP[rawTable] || rawTable;
    const cols = match[2].split(",").map((c) => c.trim().replace(/[`"']/g, ""));
    const valuesBlob = match[3];

    const tuples = [];
    let currentTuple = "";
    let inString = false;
    let stringChar = "";
    let depth = 0;

    for (let i = 0; i < valuesBlob.length; i++) {
      const char = valuesBlob[i];
      const next = valuesBlob[i + 1];

      if (
        (char === "'" || char === '"') &&
        (i === 0 || valuesBlob[i - 1] !== "\\")
      ) {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (stringChar === char) {
          if (next === char) {
            currentTuple += char;
            i++;
            continue;
          }
          inString = false;
        }
      }

      if (!inString) {
        if (char === "(") {
          depth++;
          if (depth === 1) {
            currentTuple = "";
            continue;
          }
        } else if (char === ")") {
          depth--;
          if (depth === 0) {
            tuples.push(currentTuple);
            currentTuple = "";
            continue;
          }
        }
      }

      if (depth > 0) {
        currentTuple += char;
      }
    }

    if (!data[entityKey]) data[entityKey] = [];

    tuples.forEach((tupleStr) => {
      const valList = [];
      let curVal = "";
      let inValStr = false;
      let valQuoteChar = "";

      for (let j = 0; j < tupleStr.length; j++) {
        const c = tupleStr[j];
        const nextC = tupleStr[j + 1];

        if ((c === "'" || c === '"') && (j === 0 || tupleStr[j - 1] !== "\\")) {
          if (!inValStr) {
            inValStr = true;
            valQuoteChar = c;
            continue;
          } else if (valQuoteChar === c) {
            if (nextC === c) {
              curVal += c;
              j++;
              continue;
            }
            inValStr = false;
            continue;
          }
        }

        if (c === "," && !inValStr) {
          valList.push(curVal);
          curVal = "";
        } else {
          curVal += c;
        }
      }
      valList.push(curVal);

      const rowObj = {};
      cols.forEach((col, idx) => {
        rowObj[col] = castValue(valList[idx]);
      });
      data[entityKey].push(rowObj);
    });
  }

  return data;
}

// 3. XML Parser
export function parseXmlText(xmlText) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "text/xml");

  if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
    throw new Error("XML Parsing error: Invalid XML format.");
  }

  const data = {};

  const parseNode = (node) => {
    if (node.nodeType !== 1) return null;
    const children = Array.from(node.children);
    if (children.length === 0) {
      return castValue(node.textContent);
    }

    const childTags = children.map((c) => c.tagName.toLowerCase());
    const isArray =
      childTags.length > 1 && childTags.every((t) => t === childTags[0]);

    if (isArray) {
      return children.map((c) => parseNode(c));
    }

    const obj = {};
    children.forEach((c) => {
      const tag = c.tagName;
      const val = parseNode(c);
      if (obj[tag] !== undefined) {
        if (!Array.isArray(obj[tag])) obj[tag] = [obj[tag]];
        obj[tag].push(val);
      } else {
        obj[tag] = val;
      }
    });
    return obj;
  };

  const root = xmlDoc.documentElement;
  const rootChildren = Array.from(root.children);

  rootChildren.forEach((child) => {
    const rawTag = child.tagName.toLowerCase();
    const entityKey = TABLE_ENTITY_MAP[rawTag] || rawTag;

    const rowItems = Array.from(child.children);
    if (rowItems.length > 0) {
      const rows = rowItems.map((item) => parseNode(item));
      data[entityKey] = rows;
    } else {
      const val = parseNode(child);
      if (Array.isArray(val)) {
        data[entityKey] = val;
      }
    }
  });

  return data;
}

// 4. ZIP Parser for CSV files
export async function parseZipFile(file) {
  const zip = new JSZip();
  const contents = await zip.loadAsync(file);
  const data = {};

  for (const filename of Object.keys(contents.files)) {
    if (filename.endsWith(".csv") && !filename.startsWith("__MACOSX")) {
      const csvText = await contents.files[filename].async("string");
      const cleanName = filename
        .replace(/^.*[\\/]/, "")
        .replace(/\.csv$/i, "")
        .toLowerCase();
      const entityKey = TABLE_ENTITY_MAP[cleanName] || cleanName;
      data[entityKey] = parseCsvText(csvText);
    }
  }

  return data;
}

// Auto-detect entity key from column names
export function autoDetectEntity(columns, fileName = "") {
  const cleanName = fileName.toLowerCase().replace(/\.csv$/, "");
  if (TABLE_ENTITY_MAP[cleanName]) return TABLE_ENTITY_MAP[cleanName];

  const colSet = new Set(columns.map((c) => c.toLowerCase()));
  if (colSet.has("sections") || colSet.has("ispublished") && colSet.has("slug"))
    return "pages";
  if (colSet.has("content") && colSet.has("author")) return "posts";
  if (colSet.has("icon") && colSet.has("features")) return "services";
  if (colSet.has("quote") || colSet.has("rating") || colSet.has("authorname"))
    return "testimonials";
  if (colSet.has("question") && colSet.has("answer")) return "faqs";
  if (colSet.has("role") || colSet.has("bio")) return "teamMembers";
  if (colSet.has("sourcemanifest") || colSet.has("targeturl")) return "redirects";
  if (colSet.has("message") || colSet.has("formdata")) return "submissions";
  if (colSet.has("status") && colSet.has("email")) return "leads";

  return "pages"; // fallback default
}
