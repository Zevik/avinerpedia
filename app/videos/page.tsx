import { OG_IMAGES, pageMetadata } from '@/lib/seo';
import { LibraryView } from '@/components/library/LibraryView';

export const metadata = pageMetadata({
  title: "סרטונים - שיעורי וידאו של הרב שלמה אבינר | אבינרפדיה",
  description: "אלפי שיעורי וידאו של הרב שלמה אבינר בכל נושאי התורה, ההלכה, האמונה והמדינה, עם סינון לפי נושא.",
  path: '/videos',
  image: OG_IMAGES.videos,
});

/** The library with the "video" type preset (series episodes are on /series). */
export default async function VideosPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <LibraryView heading="סרטונים" fixedType="video" searchParams={await searchParams} />;
}
