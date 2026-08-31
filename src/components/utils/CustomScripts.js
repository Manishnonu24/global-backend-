"use client";
import { useEffect } from "react";

export default function CustomScripts({ scripts, deferScripts = true }) {
  useEffect(() => {
    if (!scripts) return;

    // Inject head scripts
    if (scripts.head) {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = scripts.head.trim();
      Array.from(tempDiv.childNodes).forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.tagName === "SCRIPT") {
            const scriptEl = document.createElement("script");
            Array.from(node.attributes).forEach((attr) => {
              scriptEl.setAttribute(attr.name, attr.value);
            });
            if (deferScripts && scriptEl.hasAttribute("src") && !scriptEl.hasAttribute("defer")) {
              scriptEl.setAttribute("defer", "true");
            }
            scriptEl.innerHTML = node.innerHTML;
            document.head.appendChild(scriptEl);
          } else {
            document.head.appendChild(node.cloneNode(true));
          }
        }
      });
    }

    // Inject body scripts
    if (scripts.body) {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = scripts.body.trim();
      Array.from(tempDiv.childNodes).forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.tagName === "SCRIPT") {
            const scriptEl = document.createElement("script");
            Array.from(node.attributes).forEach((attr) => {
              scriptEl.setAttribute(attr.name, attr.value);
            });
            if (deferScripts && scriptEl.hasAttribute("src") && !scriptEl.hasAttribute("defer")) {
              scriptEl.setAttribute("defer", "true");
            }
            scriptEl.innerHTML = node.innerHTML;
            document.body.appendChild(scriptEl);
          } else {
            document.body.appendChild(node.cloneNode(true));
          }
        }
      });
    }
  }, [scripts]);

  return null;
}
