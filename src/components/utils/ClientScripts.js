"use client";
import { useEffect } from "react";

// This component takes raw HTML strings and injects them into the document head or body.
// It only runs on the client, which avoids server-client hydration mismatches.
export default function ClientScripts({ headScripts, bodyScripts, deferScripts = true }) {
  useEffect(() => {
    const processScripts = (htmlStr, targetElement, prepend = false) => {
      if (!htmlStr) return;
      const template = document.createElement("template");
      template.innerHTML = htmlStr;

      const nodes = Array.from(template.content.childNodes);
      nodes.forEach((node) => {
        if (node.tagName === "SCRIPT" && deferScripts) {
          if (node.src) {
            node.defer = true;
          }
        }
      });

      if (prepend) {
        targetElement.prepend(...nodes);
      } else {
        targetElement.append(...nodes);
      }
    };

    processScripts(headScripts, document.head, false);
    processScripts(bodyScripts, document.body, true);
  }, [headScripts, bodyScripts, deferScripts]);

  return null;
}
