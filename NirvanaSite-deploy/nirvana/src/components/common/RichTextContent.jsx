import React, { useMemo } from "react";
import { sanitizeRichText } from "../../lib/richText";

const RichTextContent = ({ value, className = "" }) => {
  const safeHtml = useMemo(() => sanitizeRichText(value), [value]);
  if (!safeHtml) return null;

  return <div className={className} dangerouslySetInnerHTML={{ __html: safeHtml }} />;
};

export default RichTextContent;
