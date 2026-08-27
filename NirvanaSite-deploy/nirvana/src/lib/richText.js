const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "em",
  "u",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "blockquote",
  "a",
  "figure",
  "figcaption",
  "img",
]);

const ALLOWED_ATTRS_BY_TAG = {
  a: new Set(["href", "target", "rel"]),
  img: new Set(["src", "alt", "title", "loading", "decoding"]),
};

function isSafeUrl(value) {
  const normalized = `${value || ""}`.trim().toLowerCase();
  if (!normalized) return false;
  return !(
    normalized.startsWith("javascript:") ||
    normalized.startsWith("vbscript:") ||
    normalized.startsWith("data:")
  );
}

function sanitizeElement(node) {
  const tag = node.tagName.toLowerCase();
  if (tag === "script" || tag === "style" || tag === "iframe" || tag === "object" || tag === "embed") {
    node.parentNode?.removeChild(node);
    return;
  }

  if (!ALLOWED_TAGS.has(tag)) {
    const parent = node.parentNode;
    if (!parent) return;
    while (node.firstChild) {
      parent.insertBefore(node.firstChild, node);
    }
    parent.removeChild(node);
    return;
  }

  const allowedAttrs = ALLOWED_ATTRS_BY_TAG[tag] || new Set();
  Array.from(node.attributes).forEach((attr) => {
    const name = attr.name.toLowerCase();
    if (name.startsWith("on") || name === "style" || !allowedAttrs.has(name)) {
      node.removeAttribute(attr.name);
      return;
    }
    if ((name === "href" || name === "src") && !isSafeUrl(attr.value)) {
      node.removeAttribute(attr.name);
    }
  });

  if (tag === "a") {
    const href = node.getAttribute("href");
    if (!href) {
      node.removeAttribute("title");
      node.removeAttribute("target");
      node.removeAttribute("rel");
    } else {
      // Always expose the real destination on hover instead of trusting a
      // user-supplied title that could describe a different URL.
      node.setAttribute("title", href);
      if (node.getAttribute("target") === "_blank") {
        node.setAttribute("rel", "noopener noreferrer");
      } else if (!node.getAttribute("rel")) {
        node.setAttribute("rel", "noopener noreferrer");
      }
    }
  }

  if (tag === "img" && !node.getAttribute("src")) {
    node.parentNode?.removeChild(node);
  }
}

function walkAndSanitize(node) {
  Array.from(node.childNodes).forEach((child) => {
    if (child.nodeType === 8) {
      child.parentNode?.removeChild(child);
      return;
    }
    if (child.nodeType === 1) {
      walkAndSanitize(child);
      sanitizeElement(child);
    }
  });
}

export function sanitizeRichText(value) {
  if (!value) return "";
  const input = `${value}`;

  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return input
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
      .replace(/\son\w+=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${input}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return "";

  walkAndSanitize(root);
  return root.innerHTML;
}

export function richTextToPlainText(value, preserveNewlines = false) {
  if (!value) return "";
  let input = `${value}`;

  if (preserveNewlines) {
    // Replace block tags and breaks with newlines
    input = input
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<\/h[1-6]>/gi, "\n")
      .replace(/<\/li>/gi, "\n");

    // Strip all remaining tags
    input = input.replace(/<[^>]+>/g, "");

    // Decode HTML entities (basic ones)
    input = input
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"');

    // Normalize whitespace: collapse multiple spaces/tabs to single space, but handle newlines
    return input
      .replace(/[ \t]+/g, " ")     // Collapse non-newline whitespace
      .replace(/\n\s*\n/g, "\n\n") // Max 2 consecutive newlines
      .replace(/^\s+|\s+$/g, "");  // Trim start/end
  }

  // Original flat text behavior
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return input
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${input}</div>`, "text/html");
  return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
}

export function createRichTextExcerpt(value, maxChars = 180, preserveNewlines = false) {
  const plain = richTextToPlainText(value, preserveNewlines);
  if (plain.length <= maxChars) {
    return { text: plain, isTruncated: false };
  }
  return {
    text: `${plain.slice(0, maxChars).trimEnd()}...`,
    isTruncated: true,
  };
}
