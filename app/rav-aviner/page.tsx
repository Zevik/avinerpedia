import type { Metadata } from 'next';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { LegalPage } from '@/components/legal/LegalPage';
import { RAV_AVINER_MD } from '@/lib/pages/rav-aviner';
import { pageMetadata, SITE_URL } from '@/lib/seo';

// Biography of Rav Aviner (text in lib/pages/rav-aviner.ts). Static.
const TITLE = 'הרב שלמה חיים הכהן אבינר';
const DESCRIPTION =
  'הרב שלמה אבינר: תולדות חייו, דרכו התורנית והחינוכית, ספריו ותלמידיו. נשיא ישיבת עטרת ירושלים ורב היישוב בית אל לשעבר.';

export const metadata: Metadata = pageMetadata({
  title: 'הרב שלמה אבינר - תולדות חייו, משנתו וספריו | אבינרפדיה',
  description: DESCRIPTION,
  path: '/rav-aviner',
  type: 'article',
});

// schema.org Person, so search engines connect the page to the Rav.
const personJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'הרב שלמה אבינר',
  alternateName: ['שלמה חיים הכהן אבינר', 'Rabbi Shlomo Aviner'],
  birthDate: '1943',
  birthPlace: 'ליון, צרפת',
  description: DESCRIPTION,
  url: `${SITE_URL}/rav-aviner`,
};

export default function RavAvinerPage() {
  return (
    <LegalPage title={TITLE}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }} />
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{RAV_AVINER_MD}</ReactMarkdown>
      <p>
        <Link href="/library">לכל השיעורים, המאמרים והשו&quot;ת בספריית התכנים</Link>
      </p>
    </LegalPage>
  );
}
