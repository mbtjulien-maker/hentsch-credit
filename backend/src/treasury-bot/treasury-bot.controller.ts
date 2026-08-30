import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TreasuryBotService } from './treasury-bot.service';

// Bot de trésorerie en SIMULATION (paper trading) — réservé au back-office, aucune
// exposition côté client pour l'instant (cf. TreasuryBotService). Déclenchement manuel
// possible (run/backfill) pour la démonstration et le débogage, en plus du cron quotidien.
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/treasury-bot')
export class TreasuryBotController {
  constructor(private readonly treasuryBotService: TreasuryBotService) {}

  @Get('history')
  getHistory(@Query('limit') limit?: string) {
    const parsed = limit ? Number.parseInt(limit, 10) : undefined;
    return this.treasuryBotService.getHistory(
      parsed && Number.isFinite(parsed) ? parsed : undefined,
    );
  }

  @Post('run')
  runNow() {
    return this.treasuryBotService.runDailySimulation();
  }

  @Post('backfill')
  backfill(@Query('days') days?: string) {
    const parsed = days ? Number.parseInt(days, 10) : undefined;
    return this.treasuryBotService
      .backfillHistory(parsed && Number.isFinite(parsed) ? parsed : undefined)
      .then((created) => ({ created }));
  }
}
