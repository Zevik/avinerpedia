/** Layout of the text pages (/about, /privacy, /accessibility) and the marker for facts the owner must supply. */
export function LegalPage({ title, updated, children }: { title: string; updated?: string; children: React.ReactNode }) {
  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <h1 className="text-3xl md:text-4xl font-bold mb-2">{title}</h1>
      {updated ? <p className="text-sm text-muted-foreground mb-8">עדכון אחרון: {updated}</p> : <div className="mb-6" />}
      <div className="prose prose-lg max-w-none prose-headings:font-bold prose-a:text-blue-700">{children}</div>
    </div>
  );
}

/** A value from SITE_INFO, or a highlighted placeholder saying what the owner still has to confirm. */
export function OwnerValue({ value, missing }: { value: string | null | undefined; missing: string }) {
  if (value) return <>{value}</>;
  return <mark className="bg-amber-100 text-amber-900 px-1 rounded">[נדרש אישור בעל האתר: {missing}]</mark>;
}
