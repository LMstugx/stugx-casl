import type { ReactNode } from "react";

/** Same identities as OBSERVATION_WORKSPACE_LAYOUTS in src/observation/workspace.ts. */
export type WorkbenchLayout = "show-both" | "circuit-focus" | "data-focus";

export interface WorkbenchShellLabels {
  code: string;
  datapath: string;
  observation: string;
  dock: string;
  controls: string;
}

export interface WorkbenchShellProps {
  topBar: ReactNode;
  codePane: ReactNode;
  datapathPane: ReactNode;
  observationPane: ReactNode;
  dock: ReactNode;
  controls: ReactNode;
  layout: WorkbenchLayout;
  codeOpen: boolean;
  dockOpen: boolean;
  labels: WorkbenchShellLabels;
}

/**
 * Layout shell of the v2 workbench. It only arranges the slots it is given.
 *
 * Every slot stays mounted in every layout: a pane that is not shown gets the `hidden`
 * attribute and is never removed from the tree. The datapath pane in particular keeps its
 * place in the tree, so switching layout, tab, or locale never remounts the datapath.
 */
export function WorkbenchShell({
  topBar,
  codePane,
  datapathPane,
  observationPane,
  dock,
  controls,
  layout,
  codeOpen,
  dockOpen,
  labels
}: WorkbenchShellProps) {
  const circuitOnly = layout === "circuit-focus";
  const codeVisible = codeOpen && !circuitOnly;
  const dockVisible = dockOpen && !circuitOnly;

  return (
    <div className="wb" data-layout={layout} data-code={codeVisible ? "open" : "closed"} data-dock={dockVisible ? "open" : "closed"}>
      <header className="wb-top">{topBar}</header>
      <div className="wb-main">
        <section className="wb-pane wb-code" aria-label={labels.code} hidden={!codeVisible}>
          {codePane}
        </section>
        <section className="wb-pane wb-datapath" aria-label={labels.datapath}>
          {datapathPane}
        </section>
        <aside className="wb-pane wb-observation" aria-label={labels.observation} hidden={circuitOnly}>
          {observationPane}
        </aside>
      </div>
      <section className="wb-pane wb-dock" aria-label={labels.dock} hidden={!dockVisible}>
        {dock}
      </section>
      <footer className="wb-controls" aria-label={labels.controls}>
        {controls}
      </footer>
    </div>
  );
}
