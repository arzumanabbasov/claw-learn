import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.ALLOWED_ORIGIN ?? 'https://clawlearn.vercel.app'
  ),
  title: 'Claw Learn — AI Visual Math Tutor',
  description:
    'Ask math and physics questions naturally. Watch concepts come alive with AI-powered animated explanations inspired by 3Blue1Brown.',
  keywords: ['math tutor', 'AI', 'visual learning', 'animations', 'calculus', 'physics'],
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    title: 'Claw Learn — AI Visual Math Tutor',
    description: 'AI That Explains Math Visually.',
    type: 'website',
    images: ['/logo.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700;1,900&family=DM+Mono:wght@300;400&family=DM+Sans:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
