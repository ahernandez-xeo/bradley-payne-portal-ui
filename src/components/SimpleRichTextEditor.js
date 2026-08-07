import { useEffect, useRef } from "react";

import classes from "./SimpleRichTextEditor.module.scss";

const COMMANDS = [
  { cmd: "bold", label: "B", title: "Bold" },
  { cmd: "italic", label: "I", title: "Italic" },
  { cmd: "underline", label: "U", title: "Underline" },
  { cmd: "insertUnorderedList", label: "• List", title: "Bullet list" },
  { cmd: "insertOrderedList", label: "1. List", title: "Numbered list" },
];

/** Strip tags for the plain-text fallback column. */
export const htmlToPlainText = (html) => {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent || "").replace(/\u00a0/g, " ").trim();
};

const SimpleRichTextEditor = ({ value, onChange, disabled }) => {
  const editorRef = useRef(null);
  const lastHtmlRef = useRef("");

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const next = value || "";
    if (next !== lastHtmlRef.current && next !== editor.innerHTML) {
      editor.innerHTML = next;
      lastHtmlRef.current = next;
    }
  }, [value]);

  const emitChange = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const html = editor.innerHTML;
    lastHtmlRef.current = html;
    onChange?.(html, htmlToPlainText(html));
  };

  const runCommand = (command) => {
    if (disabled) return;
    editorRef.current?.focus();
    document.execCommand(command, false, null);
    emitChange();
  };

  const handleCreateLink = () => {
    if (disabled) return;
    const url = window.prompt("Link URL");
    if (!url) return;
    editorRef.current?.focus();
    document.execCommand("createLink", false, url);
    emitChange();
  };

  return (
    <div className={classes.editor}>
      <div className={classes.toolbar} role="toolbar" aria-label="Formatting">
        {COMMANDS.map((item) => (
          <button
            key={item.cmd}
            type="button"
            className={classes.toolBtn}
            title={item.title}
            disabled={disabled}
            onMouseDown={(event) => {
              event.preventDefault();
              runCommand(item.cmd);
            }}
          >
            {item.label}
          </button>
        ))}
        <button
          type="button"
          className={classes.toolBtn}
          title="Insert link"
          disabled={disabled}
          onMouseDown={(event) => {
            event.preventDefault();
            handleCreateLink();
          }}
        >
          Link
        </button>
      </div>
      <div
        ref={editorRef}
        className={classes.surface}
        contentEditable={!disabled}
        role="textbox"
        aria-multiline="true"
        data-placeholder="Write the location narrative…"
        onInput={emitChange}
        onBlur={emitChange}
        suppressContentEditableWarning
      />
    </div>
  );
};

export default SimpleRichTextEditor;
