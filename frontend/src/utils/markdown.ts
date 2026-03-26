import { marked } from "marked";
import DOMPurify from "dompurify";

export function markdownToHtml(markdown: string | null | undefined): string {
  if (!markdown) {
    return "";
  }

  const rawHtml = marked.parse(markdown, {
    async: false,
    gfm: true,
    breaks: true,
  }) as string;
  return DOMPurify.sanitize(rawHtml);
}
