import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import "monaco-editor/esm/vs/basic-languages/cpp/cpp.contribution";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";

type MonacoScope = typeof globalThis & {
  monaco?: typeof monaco;
  MonacoEnvironment?: {
    getWorker: () => Worker;
  };
};

const scope = globalThis as MonacoScope;
scope.monaco = monaco;
scope.MonacoEnvironment = {
  getWorker: () => new EditorWorker()
};
loader.config({ monaco });
