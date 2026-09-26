'use client';

import Link from 'next/link';
import { Accessibility, Search, Menu, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { SearchAutocomplete } from '@/components/SearchAutocomplete';

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchButton = useRef<HTMLButtonElement>(null);
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
  ];

  return (
    <nav aria-label="ראשי" className="sticky top-0 z-50 bg-white border-b shadow-sm">
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

          {/* Search and accessibility icons - Left side. Accessibility is a plain link to the
              statement, styled like the other icons (no floating "accessibility widget"). */}
          <div className="flex items-center gap-1">
            <Link
              prefetch={false}
              href="/accessibility"
              aria-label="נגישות"
              title="נגישות"
              aria-current={isActive('/accessibility') ? 'page' : undefined}
              className={`p-2 rounded-full transition-colors ${isActive('/accessibility') ? 'bg-primary/10 text-primary' : 'hover:bg-secondary'}`}
            >
              <Accessibility className="w-5 h-5" aria-hidden />
            </Link>
            <button
              ref={searchButton}
              type="button"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-2 hover:bg-secondary rounded-full transition-colors"
              aria-label="חיפוש"
              aria-expanded={isSearchOpen}
              aria-controls="navbar-search"
            >
              <Search className="w-5 h-5" aria-hidden />
            </button>

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 hover:bg-secondary rounded-full transition-colors"
              aria-label="תפריט"
              aria-expanded={isMenuOpen}
              aria-controls="navbar-menu"
            >
              {isMenuOpen ? (
                <X className="w-5 h-5" aria-hidden />
              ) : (
                <Menu className="w-5 h-5" aria-hidden />
              )}
            </button>
          </div>
        </div>

        {/* Search Bar - Now using Autocomplete */}
        {isSearchOpen && (
          <div id="navbar-search" className="pb-4 flex justify-center">
            <SearchAutocomplete autoFocus onEscape={() => { setIsSearchOpen(false); searchButton.current?.focus(); }} />
          </div>
        )}

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div id="navbar-menu" className="md:hidden pb-4 space-y-2">
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
