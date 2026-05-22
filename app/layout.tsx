import type { Metadata } from "next";
import { Inter } from "next/font/google";
// @ts-expect-error
import '@radix-ui/themes/styles.css'; 
// @ts-expect-error
import "./globals.css";
import { Theme } from '@radix-ui/themes';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Gestor de Turnos",
  description: "TFG Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className} style={{ margin: 0, padding: 0 }}>
      <Toaster 
        position="top-right" 
        richColors 
      /> 
       <Theme appearance="light" accentColor="blue" radius="medium">
          {children}
        </Theme>
      </body>
    </html>
  );
}