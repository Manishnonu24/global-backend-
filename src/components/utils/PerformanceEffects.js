"use client";

import { useEffect } from "react";

export default function PerformanceEffects({ lazyLoadImages, lazyLoadVideos }) {
  useEffect(() => {
    // Suppress Three.js Clock deprecation warnings from third-party 3D libraries
    const _origWarn = console.warn;
    console.warn = function (...args) {
      if (
        args[0] &&
        typeof args[0] === "string" &&
        args[0].includes("THREE.Clock: This module has been deprecated")
      ) {
        return;
      }
      _origWarn.apply(console, args);
    };
    const applyLazyLoading = (root = document) => {
      if (!root || typeof root.querySelectorAll !== "function") return;
      if (lazyLoadImages) {
        root.querySelectorAll("img:not([loading]):not([data-nimg])").forEach((img) => {
          img.setAttribute("loading", "lazy");
        });
      }
      if (lazyLoadVideos) {
        root.querySelectorAll("video:not([preload])").forEach((video) => {
          video.setAttribute("preload", "none");
        });
      }
    };

    // Apply initially
    applyLazyLoading();

    // Use MutationObserver scoped to main container and only added element nodes
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) {
            applyLazyLoading(node);
          }
        }
      }
    });

    const target = document.querySelector("main") || document.body;
    observer.observe(target, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      console.warn = _origWarn;
    };
  }, [lazyLoadImages, lazyLoadVideos]);

  return null;
}
