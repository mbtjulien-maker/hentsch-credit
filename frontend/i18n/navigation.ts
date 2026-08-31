import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Link/useRouter/usePathname/redirect conscients de la langue courante — à utiliser à la
// place des équivalents next/navigation dans toute la vitrine publique (app/[locale]/**),
// jamais dans /dashboard ou /admin (hors périmètre i18n, cf. routing.ts).
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
