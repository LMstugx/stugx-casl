import React from "react";
import ReactDOM from "react-dom/client";
import "./production/configureMonaco";
import App from "./App";
import { detectBrowserCapabilities, hasRequiredProductionCapabilities } from "./production/browserCapabilities";
import { ProductionErrorBoundary, ProductionFailureScreen } from "./production/ProductionFailure";
import { getApplicationRuntime } from "./runtime/applicationRuntime";
import "./styles/tokens.css";
import "./styles/app.css";

const root = ReactDOM.createRoot(document.getElementById("root")!);
const capabilities = detectBrowserCapabilities();
document.documentElement.dataset.applicationRuntime = getApplicationRuntime();

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
