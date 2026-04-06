import { useEffect, useRef, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface MathRendererProps {
  content: string;
  inline?: boolean;
}

export function MathRenderer({ content, inline = true }: MathRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !content) {
      return;
    }

    try {
      katex.render(content, containerRef.current, {
        displayMode: !inline,
        throwOnError: false,
        errorColor: "#cc0000",
      });
    } catch (error) {
      console.error("KaTeX rendering error:", error);
      if (containerRef.current) {
        containerRef.current.textContent = inline ? `$${content}$` : `$$${content}$$`;
      }
    }
  }, [content, inline]);

  return <div ref={containerRef} className={`math-${inline ? "inline" : "block"} ${inline ? "" : "my-4"}`} />;
}
