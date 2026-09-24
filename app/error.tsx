'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-secondary/20">
      <div className="text-center px-4 max-w-md">
        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-3xl font-bold mb-4">משהו השתבש</h2>
        <p className="text-lg text-muted-foreground mb-8">
          מצטערים, אירעה שגיאה בטעינת הדף
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          נסו שוב
        </button>
      </div>
    </div>
  );
}
