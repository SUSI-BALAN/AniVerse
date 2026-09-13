import { Play } from "lucide-react";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { useEffect, useState } from "react";
import { LanguageSelector } from "../components/player/LanguageSelector";
import { ServerSelector } from "../components/player/ServerSelector";
import { getProviders } from "../services/providerApi";
import type { PlaybackLanguage, ProviderId, ProviderInfo } from "../types/provider";

export function ComingSoonPage({ title }: { title: string }) {
  const [providers, setProviders] = useState<ProviderInfo[]>([]); const [selected, setSelected] = useState<ProviderId>(); const [language, setLanguage] = useState<PlaybackLanguage>("sub");
  useEffect(() => { getProviders().then((items) => { setProviders(items); setSelected(items.find((item) => item.status === "AVAILABLE")?.id); }).catch(() => setProviders([])); }, []);
  const selectedProvider = providers.find((provider) => provider.id === selected);
  return <div className="page-shell min-h-[70vh]"><EmptyState icon={Play} title={title} description="The player arrives in the next playback phase. Provider availability is shown below for integration readiness." action={<Button to="/browse">Browse anime</Button>} /><section className="mx-auto mt-8 max-w-2xl rounded-md border border-outline bg-surface p-5"><h2 className="text-lg font-bold text-foreground">Playback servers</h2><p className="mt-1 text-sm text-muted">Server URLs are resolved securely by the AniVerse API.</p><div className="mt-5 space-y-5"><ServerSelector providers={providers} selected={selected} onChange={setSelected} /><LanguageSelector value={language} capabilities={selectedProvider?.capabilities} onChange={setLanguage} /></div></section></div>;
}
