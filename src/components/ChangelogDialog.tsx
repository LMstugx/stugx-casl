import { ExternalLink, History, X } from "lucide-react";
import { useEffect, useRef, type RefObject } from "react";
import { createPortal } from "react-dom";
import { BUILD_METADATA } from "../production/buildMetadata";
import { CANONICAL_REPOSITORY_URL, RELEASES, type LocalizedReleaseText, type ReleaseChannel, type ReleaseSectionType } from "../content/releases";
import { useI18n } from "../i18n/useI18n";
import type { TranslationKey } from "../i18n/types";

type ChangelogDialogProps = {
  open: boolean;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLButtonElement>;
};

const channelKeys: Record<ReleaseChannel, TranslationKey> = {
  stable: "changelog.channel.stable",
  preview: "changelog.channel.preview",
  "desktop-demo": "changelog.channel.desktopDemo"
};

const sectionKeys: Record<ReleaseSectionType, TranslationKey> = {
  added: "changelog.section.added",
  improved: "changelog.section.improved",
  fixed: "changelog.section.fixed",
  security: "changelog.section.security",
  docs: "changelog.section.docs",
  "known-issues": "changelog.section.knownIssues"
};

export default function ChangelogDialog({ open, onClose, returnFocusRef }: ChangelogDialogProps) {
  const { locale, t } = useI18n();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    return () => returnFocusRef.current?.focus();
  }, [open, returnFocusRef]);

  if (!open) return null;
  return createPortal(
    <div className="file-dialog-backdrop changelog-backdrop" data-testid="changelog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div
        ref={dialogRef}
        className="file-dialog changelog-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="changelog-title"
        onKeyDown={(event) => trapDialogKeyboard(event, dialogRef.current, onClose)}
      >
        <header className="changelog-heading">
          <div className="file-dialog-heading">
            <History aria-hidden="true" size={20} />
            <div>
              <h2 id="changelog-title">{t("changelog.title")}</h2>
              <p>
                {t("changelog.currentVersion")}: <strong data-testid="changelog-current-version">{BUILD_METADATA.version}</strong>
              </p>
            </div>
          </div>
          <button ref={closeRef} type="button" className="icon-button changelog-close" title={t("changelog.close")} aria-label={t("changelog.close")} onClick={onClose}>
            <X aria-hidden="true" size={18} />
          </button>
        </header>
        <div className="changelog-body" data-testid="changelog-body">
          {RELEASES.length ? RELEASES.map((release, index) => {
            const current = release.version === BUILD_METADATA.version;
            return (
              <details className="changelog-release" data-testid="changelog-release" data-release-version={release.version} key={release.version} open={index === 0 ? true : undefined}>
                <summary>
                  <span className="changelog-release-identity">
                    <strong>{release.version}</strong>
                    <time dateTime={release.date}>{release.date}</time>
                  </span>
                  <span className="changelog-release-status">
                    {current ? <span className="changelog-current-badge" data-testid="changelog-current-badge">{t("changelog.current")}</span> : null}
                    <span className="changelog-channel">{t(channelKeys[release.channel])}</span>
                  </span>
                </summary>
                <div className="changelog-release-content">
                  <h3>{localized(release.title, locale)}</h3>
                  <p>{localized(release.summary, locale)}</p>
                  {release.sections.map((section) => (
                    <section className={`changelog-section changelog-section-${section.type}`} key={section.type}>
                      <h4>{t(sectionKeys[section.type])}</h4>
                      <ul>
                        {section.items.map((item, itemIndex) => <li key={`${release.version}-${section.type}-${itemIndex}`}>{localized(item, locale)}</li>)}
                      </ul>
                    </section>
                  ))}
                  <footer className="changelog-release-links">
                    {release.webUrl ? (
                      <a href={release.webUrl} target="_blank" rel="noopener noreferrer">
                        {t("changelog.viewWebsite")}<ExternalLink aria-hidden="true" size={14} />
                      </a>
                    ) : null}
                    {release.commit ? (
                      <a href={`${CANONICAL_REPOSITORY_URL}/commit/${release.commit}`} target="_blank" rel="noopener noreferrer">
                        commit {release.commit.slice(0, 7)}<ExternalLink aria-hidden="true" size={14} />
                      </a>
                    ) : null}
                    {release.tag ? (
                      <a href={`${CANONICAL_REPOSITORY_URL}/releases/tag/${release.tag}`} target="_blank" rel="noopener noreferrer">
                        {release.tag}<ExternalLink aria-hidden="true" size={14} />
                      </a>
                    ) : null}
                  </footer>
                </div>
              </details>
            );
          }) : <p>{t("changelog.noReleaseNotes")}</p>}
        </div>
      </div>
    </div>,
    document.body
  );
}

function localized(value: LocalizedReleaseText, locale: "en" | "ja" | "zh-CN") {
  return value[locale];
}

function trapDialogKeyboard(event: React.KeyboardEvent, dialog: HTMLDivElement | null, onClose: () => void) {
  if (event.key === "Escape") {
    event.preventDefault();
    onClose();
    return;
  }
  if (event.key !== "Tab") return;
  const controls = Array.from(dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], summary') ?? []);
  if (!controls.length) return;
  const current = controls.indexOf(document.activeElement as HTMLElement);
  const next = event.shiftKey ? (current <= 0 ? controls.length - 1 : current - 1) : (current + 1) % controls.length;
  event.preventDefault();
  controls[next].focus();
}
