/**
 * Safely copy text to clipboard across secure (HTTPS) and non-secure (HTTP) browser contexts.
 * @param {string} text - Text to copy to clipboard
 * @returns {Promise<boolean>} Resolves to true if successfully copied, false otherwise
 */
export async function copyToClipboard(text) {
  if (!text) return false;

  // Modern Clipboard API (works on HTTPS / localhost)
  if (typeof navigator !== "undefined" && navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn("navigator.clipboard.writeText failed, attempting fallback:", err);
    }
  }

  // Fallback for non-secure contexts (HTTP) or older browsers
  if (typeof document !== "undefined") {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-999999px";
      textarea.style.top = "-999999px";
      textarea.setAttribute("readonly", "");
      document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, 99999);
      const successful = document.execCommand("copy");
      document.body.removeChild(textarea);
      if (successful) return true;
    } catch (fallbackErr) {
      console.error("Clipboard copy fallback failed:", fallbackErr);
    }
  }

  return false;
}
