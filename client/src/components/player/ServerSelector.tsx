import type { ProviderInfo, ProviderId } from "../../types/provider";

export function ServerSelector({ providers, selected, onChange }: { providers: ProviderInfo[]; selected?: ProviderId; onChange: (id: ProviderId) => void }) {
  return <fieldset><legend className="mb-2 text-xs font-bold uppercase text-muted">Server</legend><div className="flex flex-wrap gap-2">{providers.map((provider) => <button type="button" key={provider.id} disabled={!provider.enabled || provider.status !== "AVAILABLE"} aria-pressed={selected === provider.id} onClick={() => onChange(provider.id)} className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${selected === provider.id ? "border-accent bg-accent/15 text-foreground" : "border-outline bg-surface text-muted hover:text-foreground"} disabled:cursor-not-allowed disabled:opacity-40`}>{provider.label}</button>)}</div></fieldset>;
}
