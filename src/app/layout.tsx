import type {Metadata} from 'next';
import Link from 'next/link';
import {CartProvider} from '@/components/CartProvider';
import CartButton from '@/components/CartButton';
import './globals.css';

export const metadata: Metadata = {
  title: 'Catalog Migration Trial',
  description: 'Trial run of the edX Partner API \u2192 VIAX catalog migration (display only).',
};

const nav = [
  {href: '/', label: 'Dashboard'},
  {href: '/courses', label: 'Courses'},
  {href: '/programs', label: 'Programs'},
  {href: '/compare', label: 'Compare'},
];

export default function RootLayout({children}: LayoutProps<'/'>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <CartProvider>
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-4">
              <span className="font-semibold tracking-tight">Catalog Migration Trial</span>
              <nav className="flex gap-4 text-sm">
                {nav.map((n) => (
                  <Link key={n.href} href={n.href} className="text-slate-600 hover:text-slate-900">
                    {n.label}
                  </Link>
                ))}
              </nav>
              <div className="ml-auto">
                <CartButton />
              </div>
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
        </CartProvider>
      </body>
    </html>
  );
}
