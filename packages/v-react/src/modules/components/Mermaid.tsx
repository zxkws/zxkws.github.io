import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
});

export const Mermaid = ({ content }: { content: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState('');

  useEffect(() => {
    let mounted = true;
    
    const renderChart = async () => {
      try {
        // Generate a unique ID for each render to avoid collisions
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, content);
        if (mounted) {
          setSvg(svg);
        }
      } catch (error) {
        console.error('Mermaid render error:', error);
        // Fallback or error message could be rendered here
        if (mounted) {
          setSvg(`<pre class="error">Mermaid Error: ${error instanceof Error ? error.message : String(error)}</pre>`);
        }
      }
    };

    renderChart();

    return () => {
      mounted = false;
    };
  }, [content]);

  return (
    <div 
      className="mermaid-chart"
      ref={ref}
      dangerouslySetInnerHTML={{ __html: svg }} 
    />
  );
};
