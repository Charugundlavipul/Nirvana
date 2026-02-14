const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "em",
  "u",
  "ul",
  "ol",
  "li",
  "h2",
  "h3",
  "h4",
  "blockquote",
  "a",
]);

const ALLOWED_ATTRS_BY_TAG = {
  a: new Set(["href", "target", "rel"]),
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
      node.removeAttribute("target");
      node.removeAttribute("rel");
    } else {
      if (node.getAttribute("target") === "_blank") {
        node.setAttribute("rel", "noopener noreferrer");
      } else if (!node.getAttribute("rel")) {
        node.setAttribute("rel", "noopener noreferrer");
      }
    }
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

export function richTextToPlainText(value) {
  if (!value) return "";
  const input = `${value}`;

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

export function createRichTextExcerpt(value, maxChars = 180) {
  const plain = richTextToPlainText(value);
  if (plain.length <= maxChars) {
    return { text: plain, isTruncated: false };
  }
  return {
    text: `${plain.slice(0, maxChars).trimEnd()}...`,
    isTruncated: true,
  };
}
