import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SOevent — Collaborative Whiteboard',
  description: 'Event-sourced collaborative whiteboard with traceable authorship.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
