import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SOevent — Event calendar + collaborative boards',
  description:
    'Plan events on a calendar and brainstorm on collaborative boards, with every contribution attributed to a GitHub account.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
