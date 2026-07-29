import { describe, expect, it } from "vitest";
import { assembleMockModule } from "../../core/mockCaslCore";
import {
  createDocument,
  editDocument,
  isDocumentDirty
} from "../../documents/documentModel";
import { createSequentialDocumentIdFactory } from "../../documents/idFactory";
import {
  addProjectModule,
  commitModuleAssembly,
  commitProjectLink,
  createCaslModule,
  createCaslProjectSession,
  createProjectLinkRequest,
  createSequentialProjectIdentityFactory,
  moduleAssemblyInput,
  moveProjectModule,
  renameProjectModule,
  setMainProjectModule,
  syncProjectModule
} from "../projectSession";
import { linkCaslProject } from "../caslLinker";

function document(name: string, source: string) {
  return createDocument({
    language: "casl",
    origin: "external-file",
    fileName: name,
    content: source,
    lineEnding: "lf"
  }, createSequentialDocumentIdFactory(name));
}

const mainSource = `MAIN START
      CALL SUB
      RET
      END`;
const subSource = `SUB START
      LAD GR1,#0042
      RET
      END`;

describe("CASL project session ownership", () => {
  it("keeps module identity stable across display rename and reorder", () => {
    const ids = createSequentialProjectIdentityFactory("identity");
    let session = createCaslProjectSession(document("main.cas", mainSource), null, ids);
    const sub = createCaslModule(document("sub.cas", subSource), null, ids);
    const third = createCaslModule(document("third.cas", subSource.replace("SUB", "THIRD")), null, ids);
    session = addProjectModule(addProjectModule(session, sub), third);
    const originalId = sub.moduleId;

    session = renameProjectModule(session, sub.moduleId, "renamed.cas");
    session = moveProjectModule(session, sub.moduleId, 1);

    expect(session.modules.find((module) => module.displayName === "renamed.cas")?.moduleId).toBe(originalId);
    expect(session.moduleOrder).toContain(originalId);
  });

  it("tracks dirty state independently and invalidates only the edited module assembly", () => {
    const ids = createSequentialProjectIdentityFactory("dirty");
    let session = createCaslProjectSession(document("main.cas", mainSource), null, ids);
    const main = session.modules[0];
    const assembled = assembleMockModule(moduleAssemblyInput(
      main,
      ids.nextModuleAssemblyId(main.moduleId)
    ));
    session = commitModuleAssembly(session, main.moduleId, assembled);

    const edited = editDocument(main.document, `${mainSource}\n`);
    session = syncProjectModule(session, main.moduleId, edited, null);

    expect(isDocumentDirty(session.modules[0].document)).toBe(true);
    expect(session.modules[0].assembly).toBeUndefined();
    expect(session.linkState).toMatchObject({ status: "stale", reason: "source-edited" });
  });

  it("keeps the selected main module first without deriving identity from order", () => {
    const ids = createSequentialProjectIdentityFactory("main");
    let session = createCaslProjectSession(document("main.cas", mainSource), null, ids);
    const sub = createCaslModule(document("sub.cas", subSource), null, ids);
    session = addProjectModule(session, sub);
    session = setMainProjectModule(session, sub.moduleId);

    expect(session.mainModuleId).toBe(sub.moduleId);
    expect(session.moduleOrder[0]).toBe(sub.moduleId);
    expect(session.modules.find((module) => module.moduleId === sub.moduleId)?.sourceUnitId).toBe(sub.sourceUnitId);
  });

  it("creates a link request only from current successful module assemblies", () => {
    const ids = createSequentialProjectIdentityFactory("request");
    let session = createCaslProjectSession(document("main.cas", mainSource), null, ids);
    const sub = createCaslModule(document("sub.cas", subSource), null, ids);
    session = addProjectModule(session, sub);
    expect(createProjectLinkRequest(session, ids)).toBeNull();

    for (const moduleId of session.moduleOrder) {
      const module = session.modules.find((candidate) => candidate.moduleId === moduleId)!;
      session = commitModuleAssembly(
        session,
        moduleId,
        assembleMockModule(moduleAssemblyInput(module, ids.nextModuleAssemblyId(moduleId)))
      );
    }

    const request = createProjectLinkRequest(session, ids);
    expect(request?.modules.map((module) => module.moduleId)).toEqual(session.moduleOrder);
    expect(request?.mainModuleId).toBe(session.mainModuleId);
  });

  it("commits a linked image atomically and preserves the previous result after failure", () => {
    const ids = createSequentialProjectIdentityFactory("commit");
    let session = createCaslProjectSession(document("main.cas", mainSource), null, ids);
    const sub = createCaslModule(document("sub.cas", subSource), null, ids);
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
    const success = linkCaslProject(request);
    session = commitProjectLink(session, success);
    expect(session.linkState.status).toBe("linked");

    const failed = { ...success, ok: false, words: [], diagnostics: [{
      line: 1,
      message: "failed",
      severity: "error" as const
    }] };
    session = commitProjectLink(session, failed);
    expect(session.linkState.status).toBe("error");
    expect(session.linkState.status === "error" ? session.linkState.previous?.linkId : undefined)
      .toBe(success.linkId);
  });
});
