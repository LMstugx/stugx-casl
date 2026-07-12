import { Component, type ErrorInfo, type ReactNode } from "react";
import { parseSupportedLocale } from "../i18n/locale";
import { LOCALE_STORAGE_KEY } from "../i18n/localeStorage";
import type { SupportedLocale } from "../i18n/types";

export type ProductionFailureKind = "unexpected" | "webassembly" | "wasm-initialization";

const copy: Record<SupportedLocale, Record<ProductionFailureKind | "reload", string>> = {
  en: {
    unexpected: "The application could not start safely.",
    webassembly: "This browser does not support the WebAssembly runtime required by stugx.CASL.",
    "wasm-initialization": "The WebAssembly execution backend could not be initialized.",
    reload: "Reload"
  },
  ja: {
    unexpected: "アプリケーションを安全に開始できませんでした。",
    webassembly: "このブラウザーは stugx.CASL に必要な WebAssembly ランタイムをサポートしていません。",
    "wasm-initialization": "WebAssembly 実行バックエンドを初期化できませんでした。",
    reload: "再読み込み"
  },
  "zh-CN": {
    unexpected: "无法安全启动应用程序。",
    webassembly: "此浏览器不支持 stugx.CASL 所需的 WebAssembly 运行时。",
    "wasm-initialization": "无法初始化 WebAssembly 执行后端。",
    reload: "重新加载"
  }
};

export function ProductionFailureScreen({ kind, locale = resolveFailureLocale(), onReload = reloadPage }: { kind: ProductionFailureKind; locale?: SupportedLocale; onReload?: () => void }) {
  return (
    <main className="production-failure" role="alert" data-testid="production-failure" data-failure-kind={kind}>
      <div>
        <strong>stugx.CASL</strong>
        <h1>{copy[locale][kind]}</h1>
        <button type="button" onClick={onReload}>{copy[locale].reload}</button>
      </div>
    </main>
  );
}

type ErrorBoundaryState = { failed: boolean };

export class ProductionErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // The public fallback intentionally does not log stack, source, storage, or path detail.
  }

  render() {
    return this.state.failed ? <ProductionFailureScreen kind="unexpected" /> : this.props.children;
  }
}

function resolveFailureLocale(): SupportedLocale {
  try {
    return parseSupportedLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY))
      ?? parseSupportedLocale(document.documentElement.lang)
      ?? "en";
  } catch {
    return "en";
  }
}

function reloadPage(): void {
  window.location.reload();
}
