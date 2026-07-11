export type SupportedLocale = "en" | "ja" | "zh-CN";

export type TranslationKey =
  | "app.title"
  | "toolbar.new"
  | "toolbar.open"
  | "toolbar.save"
  | "toolbar.circuitFocus"
  | "toolbar.assemble"
  | "toolbar.assembling"
  | "toolbar.assembled"
  | "toolbar.run"
  | "toolbar.running"
  | "toolbar.step"
  | "toolbar.reset"
  | "toolbar.stop"
  | "status.idle"
  | "status.dirty"
  | "status.ready"
  | "status.running"
  | "status.stopped"
  | "status.finished"
  | "status.error"
  | "panel.source"
  | "panel.inspector"
  | "inspector.registers"
  | "inspector.memory"
  | "inspector.sourceMap"
  | "inspector.trace"
  | "observation.cpuFlow"
  | "observation.registerStack"
  | "observation.codeMachine"
  | "locale.english"
  | "locale.japanese"
  | "locale.chineseSimplified"
  | "accessibility.primaryCommands"
  | "accessibility.languageSelector"
  | "accessibility.languageOption"
  | "accessibility.inspectorPanels"
  | "accessibility.openInspectorTab"
  | "accessibility.observationMode";

export type TranslationParams = Record<string, string | number>;
export type Translate = (key: TranslationKey, params?: TranslationParams) => string;

export type CompleteTranslationResource = Readonly<Record<TranslationKey, string>>;
export type PartialTranslationResource = Readonly<Partial<Record<TranslationKey, string>>>;

export interface I18nContextValue {
  locale: SupportedLocale;
  setLocale(locale: SupportedLocale): void;
  t: Translate;
}
