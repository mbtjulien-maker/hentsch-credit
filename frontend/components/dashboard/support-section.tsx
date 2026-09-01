import { LifeBuoy, Mail, MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Coordonnées de démonstration — à remplacer par le vrai canal de support de l'établissement.
const SUPPORT_EMAIL = "support@cryptocreditbank.example";

export function SupportSection() {
  const t = useTranslations("Dashboard.supportSection");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LifeBuoy className="size-4 text-muted-foreground" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Button
          variant="outline"
          className="justify-start"
          nativeButton={false}
          render={<a href={`mailto:${SUPPORT_EMAIL}`} />}
        >
          <Mail className="size-4" />
          {SUPPORT_EMAIL}
        </Button>
        <Button variant="outline" className="justify-start" disabled>
          <MessageCircle className="size-4" />
          {t("liveChat")}
        </Button>
      </CardContent>
    </Card>
  );
}
