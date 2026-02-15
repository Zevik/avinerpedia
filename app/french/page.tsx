import { Metadata } from 'next';
export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { BookOpen, Video, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export const metadata: Metadata = {
  title: 'שיעורי הרב אבינר בצרפתית | אבינרפדיה',
  description: 'Les cours du Rav Chlomo Aviner en français - Emouna, Erets Israel, La Paracha de la semaine',
};

async function getFrenchContent() {
  const { data, error } = await supabase
    .from('content_items')
    .select('*')
    .eq('main_category', 'Cours en Français')
    .order('title');

  if (error) {
    console.error('Error fetching French content:', error);
    return [];
  }

  return data || [];
}

export default async function FrenchPage() {
  const items = await getFrenchContent();

  // Group by detecting French keywords in title (not sub_category, as French content is in titles)
  const grouped = items.reduce((acc, item) => {
    const title = item.title || '';
    const subCat = item.sub_category || '';

    // Match French categories based on title content
    let category = 'Autres';
    if (title.match(/Emouna/i) || subCat.match(/אמונה/i)) {
      category = 'Emouna';
    } else if (title.match(/Erets|Mitsva|état|obligation|opérations|Mashiah/i) || subCat.match(/ארץ ישראל/i)) {
      category = 'Erets Israel';
    } else if (title.match(/Paracha/i) || subCat.match(/פרשת השבוע/i)) {
      category = 'La Paracha de la semaine';
    } else if (title.match(/couple|famille|éthique|amour/i) || subCat.match(/זוג|משפחה/i)) {
      category = 'Le couple et la famille';
    }

    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  const categories = [
    { key: 'Emouna', title: 'Emouna - אמונה', icon: BookOpen },
    { key: 'Erets Israel', title: 'Erets Israel - ארץ ישראל', icon: Video },
    { key: 'La Paracha de la semaine', title: 'La Paracha de la semaine - פרשת השבוע', icon: FileText },
    { key: 'Le couple et la famille', title: 'Le couple et la famille - הזוג והמשפחה', icon: BookOpen },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="max-w-4xl mx-auto mb-12 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-6">
            <span className="text-4xl">🇫🇷</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Les cours du Rav Chlomo Aviner
          </h1>

          <p className="text-xl text-muted-foreground mb-6">
            שיעורי הרב שלמה אבינר שליט"א בצרפתית
          </p>

          <div className="bg-blue-50 border-r-4 border-blue-500 rounded-lg p-6 text-right">
            <p className="text-lg leading-relaxed">
              <strong>Pour poser vos questions au Rav Aviner</strong>
              <br />
              <a href="mailto:contact@avinerpedia.com" className="text-primary hover:underline">
                Cliquez ici pour vous inscrire
              </a>
            </p>
          </div>
        </div>

        {/* Content by Category */}
        <div className="max-w-6xl mx-auto space-y-12">
          {categories.map(({ key, title, icon: Icon }) => {
            const categoryItems = grouped[key] || [];

            if (categoryItems.length === 0) return null;

            return (
              <section key={key} className="bg-white rounded-xl shadow-lg p-8">
                <div className="flex items-center space-x-3 space-x-reverse mb-6 pb-4 border-b">
                  <Icon className="w-8 h-8 text-primary" />
                  <h2 className="text-3xl font-bold">{title}</h2>
                  <span className="text-sm text-muted-foreground">
                    ({categoryItems.length})
                  </span>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {categoryItems.map((item: any) => (
                    <Link
                      key={item.id}
                      href={`/content/${item.id}`}
                      className="group block p-6 bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-lg hover:shadow-md hover:border-primary/50 transition-all"
                    >
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary transition-colors mb-2">
                        {item.title}
                      </h3>

                      {item.sub_category && (
                        <p className="text-sm text-muted-foreground">
                          {item.sub_category}
                        </p>
                      )}

                      {item.video_id && (
                        <div className="mt-3 inline-flex items-center text-sm text-primary">
                          <Video className="w-4 h-4 ml-2" />
                          <span>Vidéo</span>
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}

          {/* Other items */}
          {grouped['Autres'] && grouped['Autres'].length > 0 && (
            <section className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-3xl font-bold mb-6 pb-4 border-b">
                Autres cours ({grouped['Autres'].length})
              </h2>

              <div className="grid gap-4 md:grid-cols-2">
                {grouped['Autres'].map((item: any) => (
                  <Link
                    key={item.id}
                    href={`/content/${item.id}`}
                    className="group block p-6 bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-lg hover:shadow-md hover:border-primary/50 transition-all"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Back Link */}
        <div className="mt-12 text-center">
          <Link
            href="/"
            className="inline-flex items-center space-x-2 space-x-reverse text-primary hover:underline"
          >
            <span>←</span>
            <span>Retour à l'accueil</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
