import type { PlaybackLanguage, ProviderCapabilities } from "../../types/provider";

export function LanguageSelector({ value, capabilities, onChange }: { value: PlaybackLanguage; capabilities?: ProviderCapabilities; onChange: (value: PlaybackLanguage) => void }) {
  return <fieldset><legend className="mb-2 text-xs font-bold uppercase text-muted">Audio</legend><div className="flex gap-2">{(["sub", "dub"] as const).map((language) => { const supported = language === "sub" ? capabilities?.supportsSub !== false : capabilities?.supportsDub === true; return <button type="button" key={language} disabled={!supported} aria-pressed={value === language} onClick={() => onChange(language)} className={`rounded-md border px-3 py-2 text-sm font-semibold uppercase transition ${value === language ? "border-accent bg-accent/15 text-foreground" : "border-outline bg-surface text-muted hover:text-foreground"} disabled:cursor-not-allowed disabled:opacity-40`}>{language}</button>; })}</div></fieldset>;
}
