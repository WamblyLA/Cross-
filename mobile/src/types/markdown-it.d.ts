declare module "markdown-it" {
  class MarkdownIt {
    constructor(options?: Record<string, unknown>);
    render(source: string): string;
    use(plugin: (md: MarkdownIt, options?: any) => void, options?: any): this;
  }

  export default MarkdownIt;
}
