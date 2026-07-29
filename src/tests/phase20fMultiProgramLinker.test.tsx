// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import ProjectModulesPanel from "../components/ProjectModulesPanel";
import SourceMapPanel from "../components/SourceMapPanel";
import TracePanel from "../components/TracePanel";
import { assembleMockModule, createMockStateFromLinkedProgram } from "../core/mockCaslCore";
import { createDocument } from "../documents/documentModel";
import { createSequentialDocumentIdFactory } from "../documents/idFactory";
import { I18nProvider } from "../i18n/I18nProvider";
import { linkCaslProject } from "../linker/caslLinker";
import {
  addProjectModule,
  commitModuleAssembly,
  commitProjectLink,
  createCaslModule,
  createCaslProjectSession,
  createProjectLinkRequest,
  createSequentialProjectIdentityFactory,
  moduleAssemblyInput
} from "../linker/projectSession";

const mainSource = `MAIN START
      CALL SUB
      RET
      END`;
const subSource = `SUB START
      LAD GR1,#0042
      RET
      END`;

function sourceDocument(fileName: string, content: string) {
  return createDocument({
    language: "casl",
    origin: "external-file",
    fileName,
    content,
    lineEnding: "lf"
  }, createSequentialDocumentIdFactory(fileName));
}

function linkedSession() {
  const ids = createSequentialProjectIdentityFactory("ui");
  let session = createCaslProjectSession(sourceDocument("main.cas", mainSource), null, ids);
  const sub = createCaslModule(sourceDocument("sub.cas", subSource), null, ids);
  session = addProjectModule(session, sub);
  for (const moduleId of session.moduleOrder) {
    const module = session.modules.find((candidate) => candidate.moduleId === moduleId)!;
    session = commitModuleAssembly(
      session,
      moduleId,
      assembleMockModule(moduleAssemblyInput(module, ids.nextModuleAssemblyId(moduleId)))
    );
  }
  const request = createProjectLinkRequest(session, ids)!;
  return commitProjectLink(session, linkCaslProject(request));
}

function renderPanel() {
  return renderToStaticMarkup(
    <I18nProvider storage={{ read: () => "en", write: () => undefined, clear: () => undefined }}>
      <ProjectModulesPanel
        session={linkedSession()}
        busy={false}
        onAddNew={vi.fn()}
        onOpen={vi.fn()}
        onSelect={vi.fn()}
        onRemove={vi.fn()}
        onRename={vi.fn()}
        onSetMain={vi.fn()}
        onMove={vi.fn()}
        onAssembleCurrent={vi.fn()}
        onAssembleAll={vi.fn()}
        onLink={vi.fn()}
        onSaveCurrent={vi.fn()}
      />
    </I18nProvider>
  );
}

describe("Phase 20F multi-program UI and ownership", () => {
  it("project_panel_lists_independent_modules_main_and_link_state", () => {
    const markup = renderPanel();
    expect(markup).toContain("Project Modules");
    expect(markup).toContain("main.cas");
    expect(markup).toContain("sub.cas");
    expect(markup).toContain("Main");
    expect(markup).toContain("Linked");
  });

  it("linker_output_shows_placement_entry_and_relocation", () => {
    const markup = renderPanel();
    expect(markup).toContain("Entry Point");
    expect(markup).toContain("#0020");
    expect(markup).toContain("call-target");
    expect(markup).toContain("SUB");
  });

  it("project_commands_are_explicit_and_do_not_offer_auto_link_or_run", () => {
    const markup = renderPanel();
    expect(markup).toContain("Assemble Module");
    expect(markup).toContain("Assemble All");
    expect(markup).toContain("Link Project");
    expect(markup).not.toContain("Auto Link");
    expect(markup).not.toContain("Run Linked Program");
  });

  it("source_mapping_and_trace_can_show_module_context", () => {
    const session = linkedSession();
    const result = session.linkState.status === "linked" ? session.linkState.result : undefined;
    expect(result).toBeTruthy();
    const moduleNames = new Map(session.modules.map((module) => [module.moduleId, module.displayName]));
    const state = createMockStateFromLinkedProgram(result!);
    state.sourceMap = state.sourceMap.map((mapping) => ({
      ...mapping,
      moduleName: mapping.moduleId ? moduleNames.get(mapping.moduleId as never) : undefined
    }));
    state.trace = [{
      index: 1,
      address: 0x20,
      instruction: "CALL",
      detail: "CALL",
      moduleId: result!.mainModuleId
    }];
    const sourceMarkup = renderToStaticMarkup(
      <I18nProvider storage={{ read: () => "en", write: () => undefined, clear: () => undefined }}>
        <SourceMapPanel state={state} />
        <TracePanel state={state} />
      </I18nProvider>
    );
    expect(sourceMarkup).toContain("main.cas");
    expect(sourceMarkup).toContain("module-context-badge");
  });

  it("implementation_has_no_network_storage_or_proprietary_project_parser", () => {
    const sources = [
      readFileSync("src/linker/caslLinker.ts", "utf8"),
      readFileSync("src/linker/projectSession.ts", "utf8"),
      readFileSync("cpp-core/src/Linker.cpp", "utf8")
    ].join("\n");
    expect(sources).not.toMatch(/\b(fetch|XMLHttpRequest|localStorage|sessionStorage)\b/);
    expect(sources).not.toMatch(/\.cmk|wcasl.*parse|project-file.*parse/i);
  });
});
