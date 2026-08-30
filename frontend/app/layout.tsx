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

// URL publique du site — utilisée pour résoudre les images Open Graph/Twitter et les URLs
// canoniques en absolu. Pas de domaine de production fixé en dur : NEXT_PUBLIC_SITE_URL
// doit être défini au déploiement (cf. .env.example), localhost par défaut en dev.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";

// Métadonnées par défaut, héritées par toute page qui ne les redéfinit pas explicitement
// (cf. app/page.tsx et les autres pages publiques pour des title/description spécifiques).
// `template` préfixe automatiquement le nom du site à chaque titre de page enfant qui
// suit la convention "X · Hentsch Credit" — évite la répétition à chaque export.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Hentsch Credit · Crédit crypto-collatéralisé",
    template: "%s",
  },
  description:
    "Déposez des stablecoins, de l'or ou de l'argent tokenisés en garantie pour débloquer une ligne de crédit, sans jamais vendre vos actifs.",
  openGraph: {
    siteName: "Hentsch Credit",
    locale: "fr_CH",
    type: "website",
    images: [{ url: "/brand/hentsch-logo-full.png", width: 1200, height: 630, alt: "Hentsch Credit" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/brand/hentsch-logo-full.png"],
  },
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
