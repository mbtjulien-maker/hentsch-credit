import { LifeBuoy, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Coordonnées de démonstration — à remplacer par le vrai canal de support de l'établissement.
const SUPPORT_EMAIL = "support@cryptocreditbank.example";

export function SupportSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LifeBuoy className="size-4 text-muted-foreground" />
          Contacter le support
        </CardTitle>
        <CardDescription>Une question sur votre compte, votre gage ou un dépôt ?</CardDescription>
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
          Chat en direct (bientôt disponible)
        </Button>
      </CardContent>
    </Card>
  );
}
