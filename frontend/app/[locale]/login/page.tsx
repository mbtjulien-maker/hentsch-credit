import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { LoginForm } from "@/components/login-form";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Login.meta" });
  return { title: t("title"), description: t("description") };
}

export default function LoginPage() {
  return <LoginForm />;
}
