import { Compass } from "lucide-react";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";

export function NotFoundPage() {
  return <div className="page-shell min-h-[70vh]"><p className="pt-8 text-center text-7xl font-black text-white/5 sm:text-9xl">404</p><div className="-mt-8 sm:-mt-12"><EmptyState icon={Compass} title="This page drifted out of range" description="The route does not exist in AniVerse." action={<Button to="/">Back home</Button>} /></div></div>;
}
