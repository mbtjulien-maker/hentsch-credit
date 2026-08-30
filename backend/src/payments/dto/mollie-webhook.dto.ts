import { IsString } from 'class-validator';

// Mollie notifie en POSTant un simple `id` (application/x-www-form-urlencoded) — jamais
// le statut lui-même. Le statut authentique est toujours re-vérifié auprès de l'API
// Mollie, jamais déduit du corps du webhook (cf. MollieService.confirmPayment).
export class MollieWebhookDto {
  @IsString()
  id: string;
}
