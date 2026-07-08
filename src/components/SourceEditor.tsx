import Editor, { OnMount } from "@monaco-editor/react";
import { useEffect, useRef } from "react";
import type { editor } from "monaco-editor";

type SourceEditorProps = {
  source: string;
  currentLine?: number;
  onChange: (source: string) => void;
};

export default function SourceEditor({ source, currentLine, onChange }: SourceEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const decorationIds = useRef<string[]>([]);

  const handleMount: OnMount = (editorInstance, monaco) => {
    editorRef.current = editorInstance;
    monaco.editor.defineTheme("caslStudioLight", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "comment", foreground: "16803A" },
        { token: "keyword", foreground: "2253EB", fontStyle: "bold" }
      ],
      colors: {
        "editor.lineHighlightBackground": "#EAF2FF",
        "editorLineNumber.foreground": "#7C8798"
      }
    });
    monaco.editor.setTheme("caslStudioLight");
  };

  useEffect(() => {
    if (!editorRef.current) return;
    decorationIds.current = editorRef.current.deltaDecorations(
      decorationIds.current,
      currentLine
        ? [
            {
              range: {
                startLineNumber: currentLine,
                endLineNumber: currentLine,
                startColumn: 1,
                endColumn: 1
              },
              options: {
                isWholeLine: true,
                className: "current-exec-line",
                glyphMarginClassName: "current-exec-glyph"
              }
            }
          ]
        : []
    );
  }, [currentLine]);

  return (
    <div className="source-editor">
      <Editor
        height="100%"
        language="plaintext"
        value={source}
        onMount={handleMount}
        onChange={(value) => onChange(value ?? "")}
        options={{
          minimap: { enabled: false },
          fontFamily: "'Cascadia Mono', 'Consolas', monospace",
          fontSize: 15,
          lineHeight: 28,
          glyphMargin: true,
          scrollBeyondLastLine: false,
          overviewRulerBorder: false,
          renderLineHighlight: "all",
          automaticLayout: true,
          padding: { top: 14, bottom: 14 }
        }}
      />
    </div>
  );
}
