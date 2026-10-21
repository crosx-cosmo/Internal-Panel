import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { CrosXProviders } from '@/lib/store-context';
import { Toaster } from 'sonner';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jakarta',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'CrosX Internal Panel',
  description:
    'Enterprise Ad-Tech SaaS operations platform for campaign orchestration, real-time attribution reporting, postback management, template building, and API administration.',
  openGraph: {
    title: 'CrosX Internal Panel',
    description:
      'Enterprise Ad-Tech SaaS operations platform for campaign orchestration, real-time attribution reporting, postback management, template building, and API administration.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CrosX Internal Panel',
    description:
      'Enterprise Ad-Tech SaaS operations platform for campaign orchestration, real-time attribution reporting, postback management, template building, and API administration.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${plusJakarta.variable} ${jetbrainsMono.variable}`}
    >
      <body
        suppressHydrationWarning
        className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#090D16] dark:text-slate-100 font-sans antialiased selection:bg-blue-600 selection:text-white transition-colors duration-200"
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange={false}
        >
          <CrosXProviders>
            {children}
            <Toaster
              position="bottom-right"
              richColors
              closeButton
              toastOptions={{
                className:
                  'font-sans border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1623] text-slate-900 dark:text-slate-100',
              }}
            />
          </CrosXProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
