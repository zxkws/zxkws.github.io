import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

// We don't initialize globally anymore to allow dynamic theme switching
// or we initialize with a base config.

export const Mermaid = ({ content }: { content: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState('');

  useEffect(() => {
    let mounted = true;
    
    const renderChart = async () => {
      try {
        const isDark = document.documentElement.classList.contains('dark');
        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? 'dark' : 'default',
          securityLevel: 'loose',
          fontFamily: 'inherit',
        });
        
        // Generate a unique ID for each render to avoid collisions
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, content);
        if (mounted) {
          setSvg(svg);
        }
      } catch (error) {
        console.error('Mermaid render error:', error);
        if (mounted) {
          setSvg(`<pre class="error" style="color:red">Mermaid Error: ${error instanceof Error ? error.message : String(error)}</pre>`);
        }
      }
    };

    renderChart();

    // Optional: Listen for theme changes if your app toggles the 'dark' class on html
    const observer = new MutationObserver(() => {
      renderChart();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      mounted = false;
      observer.disconnect();
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
