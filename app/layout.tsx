import './globals.css';
export const metadata = { title: '360° Business-Analyse · Workbook', description: 'Dein Workbook zur 360° Business-Analyse von JOERG ROOS.', icons: { icon: '/emblem.svg' } };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <head />
      <body><div className="bg" />{children}</body>
    </html>
  );
}
