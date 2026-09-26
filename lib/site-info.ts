/**
 * Facts about the site's operator, shown on /privacy and /accessibility. Only the site owner can
 * supply them; while a value is null the page shows a highlighted "נדרש אישור בעל האתר" marker
 * instead of inventing it. Fill these in (and review both pages) before the public launch.
 */
export const SITE_INFO = {
  /** Who operates the site and is responsible for it (person, association, company). */
  operator: null as string | null,
  /** Contact e-mail for privacy requests. */
  contactEmail: 'zevik.aviner@gmail.com' as string | null,
  /** The person handling accessibility requests: name, e-mail, phone (and SMS/WhatsApp if possible). */
  accessibilityContact: { name: 'זאב אבינר', email: 'zevik.aviner@gmail.com' } as { name: string; email: string; phone?: string },
  /** Date of the last review of /about, /privacy and /accessibility (shown at the top of each). */
  lastUpdated: '27.9.2026',
};
