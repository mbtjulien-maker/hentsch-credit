import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DirectCreditService } from './direct-credit.service';

// Lecture seule back-office — le crédit direct n'a pas de file d'attente à approuver
// (décision automatique à la soumission, cf. DirectCreditService.evaluate) : cet
// endpoint sert uniquement à consulter l'historique des demandes pour audit/suivi.
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/direct-credit-requests')
export class AdminDirectCreditController {
  constructor(private readonly directCreditService: DirectCreditService) {}

  @Get()
  list() {
    return this.directCreditService.listAll();
  }
}
