import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Smooth Operators — Inner Circle Dashboard',
  description:
    'Plan events on a calendar and brainstorm on collaborative boards, with every contribution attributed to a GitHub account.',
};

// Runs before paint to set the theme class, avoiding a light/dark flash.
const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
