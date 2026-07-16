import { History } from "lucide-react";
import { useRef, useState } from "react";
import { useI18n } from "../i18n/useI18n";
import ChangelogDialog from "./ChangelogDialog";

export default function ChangelogLauncher() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <div className="project-overview-actions">
        <button ref={triggerRef} type="button" className="text-button" data-testid="changelog-trigger" onClick={() => setOpen(true)}>
          <History aria-hidden="true" size={15} />
          {t("changelog.title")}
        </button>
      </div>
      <ChangelogDialog open={open} onClose={() => setOpen(false)} returnFocusRef={triggerRef} />
    </>
  );
}
