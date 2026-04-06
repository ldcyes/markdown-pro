import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

// Initialize mermaid once at module level
let mermaidInitialized = false;

function initMermaid() {
  if (!mermaidInitialized) {
    mermaid.initialize({
      startOnLoad: false,
      theme: "default",
      securityLevel: "loose",
    });
    mermaidInitialized = true;
  }
}

interface MermaidRendererProps {
  content: string;
}

export function MermaidRenderer({ content }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current || !content) {
      return;
    }

    const renderDiagram = async () => {
      setLoading(true);
      setError(null);
      
      try {
        initMermaid();
        
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const { svg } = await mermaid.render(id, content);

        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
          setError(null);
        }
      } catch (err) {
        console.error("Mermaid rendering error:", err);
        setError(err instanceof Error ? err.message : "Failed to render diagram");
      } finally {
        setLoading(false);
      }
    };

    renderDiagram();
  }, [content]);

  if (loading) {
    return <div className="mermaid-loading my-4 flex justify-center text-gray-500">Loading diagram...</div>;
  }

  if (error) {
    return (
      <div className="mermaid-error p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
        <p className="text-red-800 dark:text-red-200 text-sm">Mermaid Error: {error}</p>
        <pre className="mt-2 text-xs text-gray-600 dark:text-gray-400 overflow-x-auto">{content}</pre>
      </div>
    );
  }

  return <div ref={containerRef} className="mermaid-diagram my-4 flex justify-center" />;
}
