import React, { useMemo } from "react";
import { sanitizeRichText } from "../../lib/richText";

const RichTextContent = ({ value, className = "", ...props }) => {
  const safeHtml = useMemo(() => sanitizeRichText(value), [value]);
  if (!safeHtml) return null;

  return <div className={className} {...props} dangerouslySetInnerHTML={{ __html: safeHtml }} />;
};

export default RichTextContent;
