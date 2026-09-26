import type { Metadata } from 'next';
import { Heebo } from 'next/font/google';
import './globals.css';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { pageMetadata, SITE_NAME, SITE_URL } from '@/lib/seo';

const heebo = Heebo({
  subsets: ['hebrew', 'latin'],
  variable: '--font-heebo',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  keywords: ['הרב שלמה אבינר', 'אבינרפדיה', 'תורה', 'הלכה', 'שאלות ותשובות', 'סרטונים', 'סדרות לימוד'],
  // Site-wide defaults (no canonical: each page sets its own).
  ...pageMetadata({ title: 'אבינרפדיה - כל שיעורי הרב שלמה אבינר' }),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <body className={`${heebo.variable} font-sans antialiased`}>
        {/* First stop for keyboard users: jump past the navbar (WCAG 2.4.1). */}
        <a href="#main-content" className="skip-link">דילוג לתוכן הראשי</a>
        <Navbar />
        <main id="main-content" tabIndex={-1} className="min-h-screen focus:outline-none">
          {children}
        </main>
        <footer className="border-t mt-16 py-8">
          <div className="container mx-auto px-4 text-center text-muted-foreground">
            <p>© {new Date().getFullYear()} אבינרפדיה. כל הזכויות שמורות.</p>
            <p className="mt-2 text-sm">
              תוכן מאת הרב שלמה אבינר שליט״א
            </p>
            <nav aria-label="מידע על האתר" className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
              <Link prefetch={false} href="/about" className="underline underline-offset-4 hover:text-primary">אודות</Link>
              <Link prefetch={false} href="/rav-aviner" className="underline underline-offset-4 hover:text-primary">על הרב אבינר</Link>
              <Link prefetch={false} href="/accessibility" className="underline underline-offset-4 hover:text-primary">הצהרת נגישות</Link>
              <Link prefetch={false} href="/privacy" className="underline underline-offset-4 hover:text-primary">מדיניות פרטיות</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}