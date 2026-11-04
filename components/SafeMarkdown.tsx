import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function SafeMarkdown({ children }: { children: string }) {
  return <div className="safe-markdown"><ReactMarkdown
    remarkPlugins={[remarkGfm]}
    skipHtml
    disallowedElements={["a", "img"]}
    unwrapDisallowed
  >{children}</ReactMarkdown></div>;
}
