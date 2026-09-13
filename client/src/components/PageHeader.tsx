export function PageHeader({ title, description, eyebrow }: { title: string; description: string; eyebrow?: string }) {
  return (
    <header className="mb-8 max-w-3xl">
      {eyebrow && <p className="mb-2 text-xs font-black uppercase text-accent-secondary">{eyebrow}</p>}
      <h1 className="text-3xl font-black text-foreground sm:text-5xl">{title}</h1>
      <p className="mt-3 leading-7 text-muted">{description}</p>
    </header>
  );
}
