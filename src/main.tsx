import React from "react";
import ReactDOM from "react-dom/client";
import "./production/configureMonaco";
import App from "./App";
import { detectBrowserCapabilities, hasRequiredProductionCapabilities } from "./production/browserCapabilities";
import { ProductionErrorBoundary, ProductionFailureScreen } from "./production/ProductionFailure";
import { getApplicationRuntime } from "./runtime/applicationRuntime";
import "./styles/tokens.css";
import "./styles/app.css";
import "./styles/datapath.css";
import "./styles/workbench.css";

const root = ReactDOM.createRoot(document.getElementById("root")!);
const capabilities = detectBrowserCapabilities();
document.documentElement.dataset.applicationRuntime = getApplicationRuntime();

// Development-only preview pages. The condition is constant-folded to false in production
// builds, so the preview module is never bundled.
const devPreview = import.meta.env.DEV ? new URLSearchParams(window.location.search).get("preview") : null;

if (devPreview === "workbench") {
  void import("./dev/WorkbenchPreview").then(({ mountWorkbenchPreview }) => mountWorkbenchPreview(root));
} else {
  root.render(
    hasRequiredProductionCapabilities(capabilities)
      ? (
          <React.StrictMode>
            <ProductionErrorBoundary>
              <App />
            </ProductionErrorBoundary>
          </React.StrictMode>
        )
      : <ProductionFailureScreen kind="webassembly" />
  );
}
