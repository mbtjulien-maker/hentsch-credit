import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Exige une session valide (cookie JWT) — cf. JwtStrategy pour l'extraction/vérification.
// Peuple req.user (AuthenticatedUser) pour le reste de la requête, cf. @CurrentUser().
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
