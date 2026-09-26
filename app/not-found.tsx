import Link from 'next/link';
import { Home, BookOpen } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        {/* Logo/Icon */}
        <div className="mb-8 flex justify-center">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center">
            <BookOpen className="w-12 h-12 text-primary" />
          </div>
        </div>

        {/* Main Title */}
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">
          אבינרפדיה
        </h1>

        <p className="text-xl md:text-2xl text-gray-600 mb-8">
          כל שיעורי הרב שלמה אבינר שליט"א
        </p>

        {/* 404 Message */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="text-7xl font-bold text-primary/50 mb-4">404</div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-3">
            הדף לא נמצא
          </h2>
          <p className="text-gray-600 mb-6">
            מצטערים, הדף שחיפשתם אינו קיים או הועבר למקום אחר
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center space-x-2 space-x-reverse px-8 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-md hover:shadow-lg"
            >
              <Home className="w-5 h-5" />
              <span className="font-semibold">חזרה לעמוד הבית</span>
            </Link>

            <Link
              href="/videos"
              className="inline-flex items-center justify-center space-x-2 space-x-reverse px-8 py-3 bg-white text-primary border-2 border-primary rounded-lg hover:bg-primary/5 transition-colors"
            >
              <BookOpen className="w-5 h-5" />
              <span className="font-semibold">עיון בסרטונים</span>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-sm text-gray-500">
          מאגר מקיף של אלפי שיעורים, מאמרים ושו"ת הלכה
        </p>
      </div>
    </div>
  );
}
