/**
 * Facts about the site's operator, shown on /privacy and /accessibility. Only the site owner can
 * supply them; while a value is null the page shows a highlighted "נדרש אישור בעל האתר" marker
 * instead of inventing it. Fill these in (and review both pages) before the public launch.
 */
export const SITE_INFO = {
  /** Who operates the site and is responsible for it (person, association, company). */
  operator: null as string | null,
  /** Contact e-mail for privacy requests. */
  contactEmail: null as string | null,
  /** The person handling accessibility requests: name, e-mail, phone (and SMS/WhatsApp if possible). */
  accessibilityContact: null as { name: string; email: string; phone?: string } | null,
  /** Where the hosting and the database run (Vercel functions region, Supabase project region). */
  serverRegions: null as string | null,
  /** How long the hosting provider keeps request logs (IP addresses), per the Vercel plan. */
  logRetention: null as string | null,
  /** Physical service locations (תקנה 34), or a statement that there are none. */
  physicalService: null as string | null,
  /** Date of the last review of both pages. */
  lastUpdated: '26.9.2026',
};
