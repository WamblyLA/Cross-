declare module "markdown-it-texmath" {
  import type MarkdownIt from "markdown-it";

  type TexmathOptions = {
    engine?: unknown;
    delimiters?: string | string[];
    katexOptions?: Record<string, unknown>;
    outerSpace?: boolean;
    macros?: Record<string, string>;
  };

  export default function texmath(md: MarkdownIt, options?: TexmathOptions): void;
}
