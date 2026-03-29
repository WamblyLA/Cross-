import ReactMarkdown, { type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { resolveMarkdownUrl } from "./markdownUrlResolver";

type MarkdownRendererProps = {
  source: string;
  filePath: string;
  className?: string;
};

function buildWrapperClassName(className?: string) {
  return className ? `markdown-preview ${className}` : "markdown-preview";
}

export default function MarkdownRenderer({
  source,
  filePath,
  className,
}: MarkdownRendererProps) {
  const components: Components = {
    a({ href, children, ...props }) {
      const resolvedHref = typeof href === "string" ? resolveMarkdownUrl(href, filePath, false) : null;

      if (!resolvedHref) {
        return <span>{children}</span>;
      }

      return (
        <a
          {...props}
          className="markdown-link"
          href={resolvedHref}
          target={resolvedHref.startsWith("#") ? undefined : "_blank"}
          rel={resolvedHref.startsWith("#") ? undefined : "noreferrer"}
        >
          {children}
        </a>
      );
    },
    img({ src, alt, ...props }) {
      const resolvedSrc = typeof src === "string" ? resolveMarkdownUrl(src, filePath, true) : null;

      if (!resolvedSrc) {
        return alt ? <span className="markdown-image-fallback">{alt}</span> : null;
      }

      return <img {...props} className="markdown-image" src={resolvedSrc} alt={alt ?? ""} />;
    },
    table({ children }) {
      return (
        <div className="markdown-table-wrap">
          <table>{children}</table>
        </div>
      );
    },
  };

  return (
    <div className={buildWrapperClassName(className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={components}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
