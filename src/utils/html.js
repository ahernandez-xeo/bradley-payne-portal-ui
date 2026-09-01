/** Strip tags for the plain-text fallback column. */
export const htmlToPlainText = (html) => {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent || "").replace(/\u00a0/g, " ").trim();
};
