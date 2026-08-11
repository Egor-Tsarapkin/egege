"use client";

import katex from "katex";
import { useEffect, useRef } from "react";

export default function RichHtml({ html, className = "" }: { html: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.querySelectorAll<HTMLElement>("[data-formula]").forEach((element) => {
      const formula = element.dataset.formula ?? "";
      if (!formula) return;
      try {
        katex.render(formula, element, {
          displayMode: element.classList.contains("teacher-formula-block"),
          throwOnError: false,
          strict: false,
        });
      } catch {
        element.textContent = formula;
      }
    });
  }, [html]);

  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} ref={ref} />;
}
