import { isDocumentDirty } from "../documents/documentModel";
import type { DocumentWriteBinding, SourceDocument } from "../documents/types";
import type {
  CaslModuleDocument,
  CaslProjectSession,
  LinkId,
  LinkRevision,
  LinkStaleReason,
  LinkedProgramResult,
  ModuleAssemblyId,
  ModuleId,
  ProjectId,
  ProjectLinkModuleInput,
  ProjectLinkRequest
} from "./types";

export interface ProjectIdentityFactory {
  nextProjectId(): ProjectId;
  nextModuleId(): ModuleId;
  nextModuleAssemblyId(moduleId: ModuleId): ModuleAssemblyId;
  nextLinkId(projectId: ProjectId, revision: LinkRevision): LinkId;
}

export function createSequentialProjectIdentityFactory(namespace = "project-session"): ProjectIdentityFactory {
  const prefix = namespace.trim() || "project-session";
  let projectSequence = 0;
  let moduleSequence = 0;
  let assemblySequence = 0;
  return {
    nextProjectId: () => `${prefix}:project:${++projectSequence}` as ProjectId,
    nextModuleId: () => `${prefix}:module:${++moduleSequence}` as ModuleId,
    nextModuleAssemblyId: (moduleId) =>
      `${moduleId}:assembly:${++assemblySequence}` as ModuleAssemblyId,
    nextLinkId: (projectId, revision) => `${projectId}:link:${revision}` as LinkId
  };
}

export function createCaslModule(
  document: SourceDocument,
  writeBinding: DocumentWriteBinding | null,
  ids: ProjectIdentityFactory
): CaslModuleDocument {
  if (document.language !== "casl") throw new Error("Only CASL source can be added to a CASL project.");
  return {
    moduleId: ids.nextModuleId(),
    sourceUnitId: document.sourceUnitId,
    displayName: document.displayName,
    document,
    writeBinding
  };
}

export function createCaslProjectSession(
  document: SourceDocument,
  writeBinding: DocumentWriteBinding | null,
  ids: ProjectIdentityFactory
): CaslProjectSession {
  const module = createCaslModule(document, writeBinding, ids);
  return {
    projectId: ids.nextProjectId(),
    modules: [module],
    activeModuleId: module.moduleId,
    mainModuleId: module.moduleId,
    moduleOrder: [module.moduleId],
    linkState: { status: "unlinked" },
    linkRevision: 0
  };
}

function staleLink(
  session: CaslProjectSession,
  reason: LinkStaleReason
): CaslProjectSession["linkState"] {
  const previous = session.linkState.status === "linked"
    ? session.linkState.result
    : "previous" in session.linkState ? session.linkState.previous : undefined;
  return previous ? { status: "stale", reason, previous } : { status: "stale", reason };
}

export function syncProjectModule(
  session: CaslProjectSession,
  moduleId: ModuleId,
  document: SourceDocument,
  writeBinding: DocumentWriteBinding | null
): CaslProjectSession {
  const current = session.modules.find((module) => module.moduleId === moduleId);
  if (!current) return session;
  const sourceChanged =
    current.sourceUnitId !== document.sourceUnitId
    || current.document.revision !== document.revision
    || current.document.content !== document.content;
  const modules = session.modules.map((module) => module.moduleId === moduleId
    ? {
        ...module,
        sourceUnitId: document.sourceUnitId,
        displayName: document.displayName,
        document,
        writeBinding,
        ...(sourceChanged ? { assembly: undefined } : {})
      }
    : module
  );
  return {
    ...session,
    modules,
    linkState: sourceChanged ? staleLink(session, "source-edited") : session.linkState
  };
}

export function addProjectModule(
  session: CaslProjectSession,
  module: CaslModuleDocument
): CaslProjectSession {
  if (session.modules.some((candidate) => candidate.moduleId === module.moduleId)) return session;
  return {
    ...session,
    modules: [...session.modules, module],
    activeModuleId: module.moduleId,
    moduleOrder: [...session.moduleOrder, module.moduleId],
    linkState: staleLink(session, "module-added")
  };
}

export function removeProjectModule(
  session: CaslProjectSession,
  moduleId: ModuleId
): CaslProjectSession {
  if (session.modules.length <= 1 || !session.modules.some((module) => module.moduleId === moduleId)) {
    return session;
  }
  const modules = session.modules.filter((module) => module.moduleId !== moduleId);
  const moduleOrder = session.moduleOrder.filter((candidate) => candidate !== moduleId);
  const mainModuleId = session.mainModuleId === moduleId ? moduleOrder[0] ?? null : session.mainModuleId;
  const normalizedOrder = mainModuleId
    ? [mainModuleId, ...moduleOrder.filter((candidate) => candidate !== mainModuleId)]
    : moduleOrder;
  return {
    ...session,
    modules,
    moduleOrder: normalizedOrder,
    mainModuleId,
    activeModuleId: session.activeModuleId === moduleId
      ? normalizedOrder[0]
      : session.activeModuleId,
    linkState: staleLink(session, "module-removed")
  };
}

export function setMainProjectModule(
  session: CaslProjectSession,
  moduleId: ModuleId
): CaslProjectSession {
  if (session.mainModuleId === moduleId || !session.modules.some((module) => module.moduleId === moduleId)) {
    return session;
  }
  return {
    ...session,
    mainModuleId: moduleId,
    moduleOrder: [moduleId, ...session.moduleOrder.filter((candidate) => candidate !== moduleId)],
    linkState: staleLink(session, "main-changed")
  };
}

export function moveProjectModule(
  session: CaslProjectSession,
  moduleId: ModuleId,
  direction: -1 | 1
): CaslProjectSession {
  const index = session.moduleOrder.indexOf(moduleId);
  const target = index + direction;
  if (
    index < 0
    || target < 0
    || target >= session.moduleOrder.length
    || moduleId === session.mainModuleId
    || target === 0
  ) {
    return session;
  }
  const moduleOrder = [...session.moduleOrder];
  [moduleOrder[index], moduleOrder[target]] = [moduleOrder[target], moduleOrder[index]];
  return {
    ...session,
    moduleOrder,
    linkState: staleLink(session, "module-reordered")
  };
}

export function renameProjectModule(
  session: CaslProjectSession,
  moduleId: ModuleId,
  displayName: string
): CaslProjectSession {
  const safeName = displayName.trim().slice(0, 128);
  if (!safeName) return session;
  return {
    ...session,
    modules: session.modules.map((module) => module.moduleId === moduleId
      ? { ...module, displayName: safeName }
      : module
    )
  };
}

export function commitModuleAssembly(
  session: CaslProjectSession,
  moduleId: ModuleId,
  assembly: CaslModuleDocument["assembly"]
): CaslProjectSession {
  if (!assembly) return session;
  return {
    ...session,
    modules: session.modules.map((module) =>
      module.moduleId === moduleId
      && module.sourceUnitId === assembly.sourceUnitId
        ? { ...module, assembly }
        : module
    ),
    linkState: staleLink(session, "module-assembled")
  };
}

export function moduleAssemblyInput(
  module: CaslModuleDocument,
  moduleAssemblyId: ModuleAssemblyId
): ProjectLinkModuleInput {
  return {
    moduleId: module.moduleId,
    sourceUnitId: module.sourceUnitId,
    moduleAssemblyId,
    displayName: module.displayName,
    source: module.document.content
  };
}

export function createProjectLinkRequest(
  session: CaslProjectSession,
  ids: ProjectIdentityFactory
): ProjectLinkRequest | null {
  if (!session.mainModuleId) return null;
  const orderedModules = session.moduleOrder.map((moduleId) =>
    session.modules.find((module) => module.moduleId === moduleId)
  );
  if (orderedModules.some((module) => !module?.assembly?.ok)) return null;
  const linkRevision = session.linkRevision + 1;
  return {
    projectId: session.projectId,
    linkId: ids.nextLinkId(session.projectId, linkRevision),
    linkRevision,
    mainModuleId: session.mainModuleId,
    modules: orderedModules.map((module) => moduleAssemblyInput(
      module!,
      module!.assembly!.moduleAssemblyId
    ))
  };
}

export function commitProjectLink(
  session: CaslProjectSession,
  result: LinkedProgramResult
): CaslProjectSession {
  if (
    !result.ok
    || result.projectId !== session.projectId
    || result.mainModuleId !== session.mainModuleId
  ) {
    const previous = session.linkState.status === "linked"
      ? session.linkState.result
      : "previous" in session.linkState ? session.linkState.previous : undefined;
    return {
      ...session,
      linkState: previous
        ? { status: "error", diagnostics: result.diagnostics, previous }
        : { status: "error", diagnostics: result.diagnostics }
    };
  }
  return {
    ...session,
    linkRevision: result.linkRevision,
    linkState: { status: "linked", result }
  };
}

export function setProjectLinking(
  session: CaslProjectSession,
  requestId: string
): CaslProjectSession {
  const previous = session.linkState.status === "linked"
    ? session.linkState.result
    : "previous" in session.linkState ? session.linkState.previous : undefined;
  return {
    ...session,
    linkState: previous
      ? { status: "linking", requestId, previous }
      : { status: "linking", requestId }
  };
}

export function projectHasDirtyModules(session: CaslProjectSession): boolean {
  return session.modules.some((module) => isDocumentDirty(module.document));
}
