import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/lib/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hentsch Credit · Dashboard",
  description: "Solde, gage, crédit et historique du compte de crédit crypto-collatéralisé.",
};

// Script anti-flash : pose la classe .dark sur <html> avant l'hydratation React, à partir
// de la préférence stockée (cf. lib/theme-provider.tsx) ou, à défaut, de la préférence
// système. Sans ça, la page se peindrait toujours en clair une fraction de seconde avant
// que ThemeProvider ne prenne le relais côté client, même pour un visiteur en mode sombre.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("hentsch-theme");
    var theme = stored === "light" || stored === "dark"
      ? stored
      : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    if (theme === "dark") document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full bg-background text-foreground" suppressHydrationWarning>
        <ThemeProvider>
          <main className="relative min-h-screen bg-background">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
