import Editor, { OnMount } from "@monaco-editor/react";
import { useEffect, useRef } from "react";
import type { editor } from "monaco-editor";
import type { FrameSymbolRelation } from "../transpiler/framePlanView";

type SourceEditorProps = {
  source: string;
  language?: "casl" | "cpp";
  currentLine?: number;
  onChange: (source: string) => void;
  frameSymbolRelations?: FrameSymbolRelation[];
  selectedFrameSlotId?: string;
  onSelectFrameSymbol?: (relation: FrameSymbolRelation) => void;
};

export default function SourceEditor({
  source,
  language = "casl",
  currentLine,
  onChange,
  frameSymbolRelations = [],
  selectedFrameSlotId,
  onSelectFrameSymbol
}: SourceEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const decorationIds = useRef<string[]>([]);
  const visibleRelations = language === "cpp" ? frameSymbolRelations.slice(0, 8) : [];

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
        "editor.lineHighlightBackground": "#E6EEF9",
        "editorLineNumber.foreground": "#6F7B8D",
        "editor.background": "#FBFCFE",
        "editorGutter.background": "#F4F6F9"
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
    <div className="source-editor" data-testid="source-editor">
      <Editor
        height="100%"
        language={language === "cpp" ? "cpp" : "plaintext"}
        value={source}
        onMount={handleMount}
        onChange={(value) => onChange(value ?? "")}
        options={{
          minimap: { enabled: false },
          fontFamily: "'Cascadia Mono', 'Consolas', monospace",
          fontSize: 14,
          lineHeight: 24,
          glyphMargin: true,
          scrollBeyondLastLine: false,
          overviewRulerBorder: false,
          renderLineHighlight: "all",
          automaticLayout: true,
          padding: { top: 10, bottom: 10 }
        }}
      />
      {visibleRelations.length > 0 ? (
        <div className="source-editor-frame-symbols" data-testid="source-editor-frame-symbols" aria-label="Related FramePlan symbols">
          <span className="compact-label">Frame symbols</span>
          <div className="source-editor-frame-symbol-list">
            {visibleRelations.map((relation) => (
              <button
                key={relation.relationId}
                type="button"
                className="source-editor-frame-symbol-marker"
                data-testid="source-editor-frame-symbol-marker"
                data-slot-id={relation.mappingId}
                data-symbol-kind={relation.slotKind}
                data-selected={selectedFrameSlotId === relation.mappingId ? "true" : "false"}
                aria-pressed={selectedFrameSlotId === relation.mappingId}
                aria-label={`Select FramePlan slot for source editor symbol ${relation.symbolName}`}
                title={relation.title}
                onClick={() => onSelectFrameSymbol?.(relation)}
              >
                <code>{relation.symbolName}</code>
                <span>{relation.slotKind}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
