'use client';

import Link from 'next/link';
import { Search, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { SearchAutocomplete } from '@/components/SearchAutocomplete';

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const pathname = usePathname();
  // One style for every link; the current section is marked the same way everywhere.
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/'));
  const linkClass = (href: string) =>
    `px-3 py-2 rounded-full text-sm lg:text-base font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
      isActive(href) ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-secondary hover:text-primary'
    }`;

  const navLinks = [
    { href: '/library', label: 'ספריית התכנים' },
    { href: '/videos', label: 'סרטונים' },
    { href: '/qa', label: 'שו״ת' },
    { href: '/articles', label: 'מאמרים' },
    { href: '/series', label: 'סדרות' },
    { href: '/topics', label: 'נושאים' },
    { href: '/french', label: 'Cours en Français' },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white border-b shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo - Right side */}
          {/* The logo is the link to the home page (there is no separate "בית" item). */}
          <Link href="/" aria-label="אבינרפדיה – לדף הבית" className="flex items-center space-x-2 space-x-reverse">
            <div className="text-2xl font-bold text-primary">
              אבינרפדיה
            </div>
          </Link>

          {/* Desktop Navigation - Center */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? 'page' : undefined}
                className={linkClass(link.href)}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Search Icon - Left side */}
          <div className="flex items-center space-x-4 space-x-reverse">
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-2 hover:bg-secondary rounded-full transition-colors"
              aria-label="חיפוש"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 hover:bg-secondary rounded-full transition-colors"
              aria-label="תפריט"
            >
              {isMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Search Bar - Now using Autocomplete */}
        {isSearchOpen && (
          <div className="pb-4 flex justify-center">
            <SearchAutocomplete />
          </div>
        )}

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? 'page' : undefined}
                className={`block px-4 py-2 rounded-lg transition-colors ${isActive(link.href) ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-secondary'}`}
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
