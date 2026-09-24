import type { Metadata } from 'next';
import { Heebo } from 'next/font/google';
import './globals.css';
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
        <Navbar />
        <main className="min-h-screen">
          {children}
        </main>
        <footer className="border-t mt-16 py-8">
          <div className="container mx-auto px-4 text-center text-muted-foreground">
            <p>© {new Date().getFullYear()} אבינרפדיה. כל הזכויות שמורות.</p>
            <p className="mt-2 text-sm">
              תוכן מאת הרב שלמה אבינר שליט״א
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}