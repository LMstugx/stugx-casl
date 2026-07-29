import {
  ArrowDown,
  ArrowUp,
  FilePlus2,
  FolderOpen,
  Link2,
  Play,
  Save,
  Star,
  Trash2,
  Wrench
} from "lucide-react";
import { formatWord } from "../core/types";
import { isDocumentDirty } from "../documents/documentModel";
import { useI18n } from "../i18n/useI18n";
import type {
  CaslProjectSession,
  LinkedProgramResult,
  ModuleId
} from "../linker/types";

type ProjectModulesPanelProps = {
  session: CaslProjectSession;
  busy: boolean;
  onAddNew(): void;
  onOpen(): void;
  onSelect(moduleId: ModuleId): void;
  onRemove(moduleId: ModuleId): void;
  onRename(moduleId: ModuleId, displayName: string): void;
  onSetMain(moduleId: ModuleId): void;
  onMove(moduleId: ModuleId, direction: -1 | 1): void;
  onAssembleCurrent(): void;
  onAssembleAll(): void;
  onLink(): void;
  onSaveCurrent(): void;
};

function linkedResult(session: CaslProjectSession): LinkedProgramResult | undefined {
  if (session.linkState.status === "linked") return session.linkState.result;
  if ("previous" in session.linkState) return session.linkState.previous;
  return undefined;
}

export default function ProjectModulesPanel({
  session,
  busy,
  onAddNew,
  onOpen,
  onSelect,
  onRemove,
  onRename,
  onSetMain,
  onMove,
  onAssembleCurrent,
  onAssembleAll,
  onLink,
  onSaveCurrent
}: ProjectModulesPanelProps) {
  const { t } = useI18n();
  const orderedModules = session.moduleOrder
    .map((moduleId) => session.modules.find((module) => module.moduleId === moduleId))
    .filter((module): module is NonNullable<typeof module> => Boolean(module));
  const result = linkedResult(session);
  const active = session.modules.find((module) => module.moduleId === session.activeModuleId);
  const canLink = orderedModules.length > 0
    && session.mainModuleId !== null
    && orderedModules.every((module) => module.assembly?.ok);

  return (
    <section
      className="panel project-modules-panel"
      aria-label={t("project.modules")}
      data-testid="project-modules-panel"
      data-link-state={session.linkState.status}
    >
      <header className="panel-header project-modules-header">
        <div>
          <h2>{t("project.modules")}</h2>
          <span className={`project-link-state ${session.linkState.status}`}>
            {session.linkState.status === "linked"
              ? t("project.linked")
              : session.linkState.status === "linking"
                ? t("project.linking")
                : session.linkState.status === "stale"
                  ? t("project.linkStale")
                  : session.linkState.status === "error"
                    ? t("project.linkFailed")
                    : t("project.notLinked")}
          </span>
        </div>
        <div className="project-command-group">
          <button type="button" className="text-button" data-testid="project-new-module" onClick={onAddNew} disabled={busy} title={t("project.newModule")}>
            <FilePlus2 aria-hidden="true" size={16} />
            <span>{t("project.newModule")}</span>
          </button>
          <button type="button" className="text-button" data-testid="project-add-module" onClick={onOpen} disabled={busy} title={t("project.addModule")}>
            <FolderOpen aria-hidden="true" size={16} />
            <span>{t("project.addModule")}</span>
          </button>
          <button type="button" className="text-button" data-testid="project-assemble-current" onClick={onAssembleCurrent} disabled={busy || !active} title={t("project.assembleModule")}>
            <Wrench aria-hidden="true" size={16} />
            <span>{t("project.assembleModule")}</span>
          </button>
          <button type="button" className="text-button" data-testid="project-assemble-all" onClick={onAssembleAll} disabled={busy || orderedModules.length === 0} title={t("project.assembleAll")}>
            <Play aria-hidden="true" size={16} />
            <span>{t("project.assembleAll")}</span>
          </button>
          <button type="button" className="text-button" data-testid="project-link" onClick={onLink} disabled={busy || !canLink} title={t("project.linkProject")}>
            <Link2 aria-hidden="true" size={16} />
            <span>{t("project.linkProject")}</span>
          </button>
          <button type="button" className="text-button" data-testid="project-save-current" onClick={onSaveCurrent} disabled={busy || !active} title={t("project.saveCurrent")}>
            <Save aria-hidden="true" size={16} />
            <span>{t("project.saveCurrent")}</span>
          </button>
        </div>
      </header>

      <div className="project-modules-body">
        <ol className="project-module-list" aria-label={t("project.moduleOrder")}>
          {orderedModules.map((module, index) => {
            const isMain = module.moduleId === session.mainModuleId;
            const isActive = module.moduleId === session.activeModuleId;
            const dirty = isDocumentDirty(module.document);
            const assemblyState = module.assembly?.ok
              ? t("project.assemblyReady")
              : module.assembly
                ? t("project.assemblyError")
                : t("project.notAssembled");
            return (
              <li
                key={module.moduleId}
                className={isActive ? "project-module-row active" : "project-module-row"}
                data-testid={`project-module-${module.moduleId}`}
              >
                <button
                  type="button"
                  className="project-module-select"
                  data-testid="project-module-select"
                  data-module-id={module.moduleId}
                  data-assembly-status={module.assembly?.ok ? "ready" : module.assembly ? "error" : "not-assembled"}
                  aria-pressed={isActive}
                  onClick={() => onSelect(module.moduleId)}
                >
                  <strong>{module.displayName}</strong>
                  <span>{isMain ? t("project.main") : t("project.module")}</span>
                  {dirty ? <span>{t("project.modified")}</span> : null}
                  <span>{assemblyState}</span>
                </button>
                <input
                  key={`${module.moduleId}:${module.displayName}`}
                  className="project-module-name"
                  defaultValue={module.displayName}
                  aria-label={t("project.renameModule")}
                  maxLength={128}
                  onBlur={(event) => onRename(module.moduleId, event.currentTarget.value)}
                />
                <div className="project-module-actions">
                  <button
                    type="button"
                    className={isMain ? "icon-only selected" : "icon-only"}
                    aria-label={t("project.setAsMain")}
                    aria-pressed={isMain}
                    disabled={isMain}
                    onClick={() => onSetMain(module.moduleId)}
                  >
                    <Star aria-hidden="true" size={15} />
                  </button>
                  <button
                    type="button"
                    className="icon-only"
                    aria-label={t("project.moveUp")}
                    disabled={isMain || index <= 1}
                    onClick={() => onMove(module.moduleId, -1)}
                  >
                    <ArrowUp aria-hidden="true" size={15} />
                  </button>
                  <button
                    type="button"
                    className="icon-only"
                    aria-label={t("project.moveDown")}
                    disabled={isMain || index === orderedModules.length - 1}
                    onClick={() => onMove(module.moduleId, 1)}
                  >
                    <ArrowDown aria-hidden="true" size={15} />
                  </button>
                  <button
                    type="button"
                    className="icon-only"
                    aria-label={t("project.removeModule")}
                    disabled={orderedModules.length <= 1}
                    onClick={() => onRemove(module.moduleId)}
                  >
                    <Trash2 aria-hidden="true" size={15} />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="project-link-output" aria-live="polite">
          <div className="project-link-summary">
            <strong>{t("project.linkerOutput")}</strong>
            {result ? (
              <span>
                {t("project.entryPoint")}: <code>#{formatWord(result.entryPoint)}</code>
                {" · "}
                {t("project.totalWords")}: <code>{result.words.length}</code>
              </span>
            ) : (
              <span>{t("project.noLinkedImage")}</span>
            )}
          </div>
          {result ? (
            <div className="project-link-tables">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t("project.module")}</th>
                    <th>{t("project.moduleAddressRange")}</th>
                    <th>{t("project.totalWords")}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.placements.map((placement) => {
                    const module = session.modules.find((candidate) => candidate.moduleId === placement.moduleId);
                    return (
                      <tr key={placement.moduleId}>
                        <td>{module?.displayName ?? placement.moduleId}</td>
                        <td className="mono-value">
                          #{formatWord(placement.baseAddress)}-#{formatWord(Math.max(placement.baseAddress, placement.endAddressExclusive - 1))}
                        </td>
                        <td className="mono-value">{placement.wordCount}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t("project.relocation")}</th>
                    <th>{t("project.symbol")}</th>
                    <th>{t("table.address")}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.relocations.length === 0 ? (
                    <tr><td colSpan={3}>{t("project.noRelocations")}</td></tr>
                  ) : result.relocations.map((relocation) => (
                    <tr key={relocation.relocationId}>
                      <td>{relocation.kind}</td>
                      <td className="mono-value">{relocation.symbolName}</td>
                      <td className="mono-value">#{formatWord(relocation.resolvedAddress)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
