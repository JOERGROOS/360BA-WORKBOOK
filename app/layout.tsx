import './globals.css';
export const metadata = { title: '360° Business-Analyse · Workbook', description: 'Dein Workbook zur 360° Business-Analyse von JOERG ROOS.' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <head><link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet" /></head>
      <body><div className="bg" />{children}</body>
    </html>
  );
}
