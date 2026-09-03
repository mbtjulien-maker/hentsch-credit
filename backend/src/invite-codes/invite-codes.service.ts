import { Injectable } from '@nestjs/common';
import { randomInt } from 'crypto';
import { InviteCode } from '@prisma/client';
import {
  AccountAlreadyExistsException,
  AccountCapacityReachedException,
} from '../common/exceptions/account-request.exceptions';
import {
  InviteCodeAlreadyUsedException,
  InviteCodeExpiredException,
  InviteCodeNotFoundException,
} from '../common/exceptions/invite-code.exceptions';
import { hashPassword } from '../common/password.util';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { MAX_CLIENT_ACCOUNTS } from '../account-requests/account-requests.constants';
import {
  INVITE_CODE_MAX_GENERATION_ATTEMPTS,
  INVITE_CODE_SEGMENT_CHARS,
  INVITE_CODE_SEGMENT_LENGTH,
  INVITE_CODE_VALIDITY_HOURS,
} from './invite-codes.constants';
import { GenerateInviteCodeDto } from './dto/generate-invite-code.dto';
import { RedeemInviteCodeDto } from './dto/redeem-invite-code.dto';

export interface InviteCodeView {
  id: string;
  code: string;
  accountType: InviteCode['accountType'];
  note: string | null;
  createdAt: Date;
  expiresAt: Date;
  usedAt: Date | null;
  // Calculé à la lecture — jamais un statut stocké qui pourrait dériver d'une horloge non
  // rafraîchie (cf. commentaire de classe ci-dessous).
  status: 'ACTIVE' | 'USED' | 'EXPIRED';
}

// Accès par invitation (cf. §6 CLAUDE.md entrée #40) — remplace le formulaire public
// "Demander l'ouverture d'un compte" comme point d'entrée. Un conseiller génère un code à
// la demande pour un client précis (jamais un lot automatique) ; le client le saisit sur
// la page publique d'accès, puis parcourt un dossier KYC progressif avant que ce service
// ne crée réellement le compte (redeem). `usedAt`/`expiresAt` sont les seules sources de
// vérité pour la validité d'un code — jamais un statut persisté séparément, qui pourrait
// dériver de l'horloge du serveur entre deux lectures.
@Injectable()
export class InviteCodesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  private normalizeCode(raw: string): string {
    return raw.trim().toUpperCase();
  }

  private buildRandomSegment(): string {
    let segment = '';
    for (let i = 0; i < INVITE_CODE_SEGMENT_LENGTH; i++) {
      segment +=
        INVITE_CODE_SEGMENT_CHARS[randomInt(INVITE_CODE_SEGMENT_CHARS.length)];
    }
    return segment;
  }

  // Format `XXXX-XXXX-AAAA` (ex. "58BY-IU76-2026") — deux segments aléatoires + l'année en
  // cours, jamais l'année de génération arbitrairement fixée : un code émis en décembre et
  // consommé en janvier resterait de toute façon expiré bien avant (24h de validité).
  private buildRandomCode(): string {
    const year = new Date().getFullYear();
    return `${this.buildRandomSegment()}-${this.buildRandomSegment()}-${year}`;
  }

  private present(code: InviteCode): InviteCodeView {
    const status: InviteCodeView['status'] = code.usedAt
      ? 'USED'
      : code.expiresAt.getTime() < Date.now()
        ? 'EXPIRED'
        : 'ACTIVE';
    return {
      id: code.id,
      code: code.code,
      accountType: code.accountType,
      note: code.note,
      createdAt: code.createdAt,
      expiresAt: code.expiresAt,
      usedAt: code.usedAt,
      status,
    };
  }

  private assertRedeemable(
    code: InviteCode | null,
  ): asserts code is InviteCode {
    if (!code) throw new InviteCodeNotFoundException();
    if (code.usedAt) throw new InviteCodeAlreadyUsedException();
    if (code.expiresAt.getTime() < Date.now())
      throw new InviteCodeExpiredException();
  }

  // Générée à la demande par un conseiller (back-office) — jamais un lot automatique,
  // cf. §6 entrée #40 : un code correspond à une invitation individuelle. La boucle de
  // nouvelle tentative protège contre une collision réelle plutôt que de compter
  // uniquement sur la probabilité (36^8 combinaisons par année pour les deux segments).
  async generate(dto: GenerateInviteCodeDto): Promise<InviteCodeView> {
    for (
      let attempt = 0;
      attempt < INVITE_CODE_MAX_GENERATION_ATTEMPTS;
      attempt++
    ) {
      const code = this.buildRandomCode();
      const existing = await this.prisma.inviteCode.findUnique({
        where: { code },
      });
      if (existing) continue;
      const created = await this.prisma.inviteCode.create({
        data: {
          code,
          accountType: dto.accountType,
          note: dto.note,
          expiresAt: new Date(
            Date.now() + INVITE_CODE_VALIDITY_HOURS * 60 * 60 * 1000,
          ),
        },
      });
      return this.present(created);
    }
    // Ne devrait jamais se produire en usage normal (cf. commentaire ci-dessus) — un
    // filet de sécurité explicite plutôt qu'une boucle infinie ou un code dupliqué silencieux.
    throw new Error(
      "Impossible de générer un code d'invitation unique après plusieurs tentatives",
    );
  }

  async listAll(): Promise<InviteCodeView[]> {
    const codes = await this.prisma.inviteCode.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return codes.map((code) => this.present(code));
  }

  // Vérifie la validité SANS consommer le code — appelé par la page publique d'accès
  // avant que le client n'entre dans le dossier KYC progressif. Le code est revérifié
  // (et réellement consommé) une seconde fois à la fin du parcours par redeem()
  // ci-dessous : rien ne garantit qu'il reste valide entre les deux appels.
  async validate(
    rawCode: string,
  ): Promise<{ accountType: InviteCode['accountType']; expiresAt: Date }> {
    const code = await this.prisma.inviteCode.findUnique({
      where: { code: this.normalizeCode(rawCode) },
    });
    this.assertRedeemable(code);
    return { accountType: code.accountType, expiresAt: code.expiresAt };
  }

  // Finalise l'inscription — crée réellement le compte (User + LedgerBalance vide,
  // kycStatus PENDING, comme AccountRequestsService.approve) et consomme le code dans une
  // même transaction. Le dossier KYC (profil/adresse/emploi/pièce d'identité/LCB-FT) est
  // ensuite persisté en réutilisant EXACTEMENT les méthodes de l'auto-déclaration
  // progressive (UsersService), jamais une seconde implémentation de ces upserts — non
  // atomique avec la création du compte : si une étape échoue ici, le compte existe déjà
  // en PENDING et le client peut reprendre son dossier depuis /dashboard/profil ou
  // /dashboard/kyc, cohérent avec le reste du produit où l'auto-déclaration est toujours
  // progressive et jamais tout-ou-rien.
  async redeem(dto: RedeemInviteCodeDto) {
    const normalizedCode = this.normalizeCode(dto.code);

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new AccountAlreadyExistsException(dto.email);
    }

    const passwordHash = await hashPassword(dto.password);

    const user = await this.prisma.$transaction(async (tx) => {
      // Revérifié ICI, au plus près de l'écriture réelle — même principe que
      // AccountRequestsService.approve pour le plafond de comptes : deux tentatives
      // concurrentes avec le même code ne doivent jamais toutes les deux réussir.
      const freshCode = await tx.inviteCode.findUnique({
        where: { code: normalizedCode },
      });
      this.assertRedeemable(freshCode);

      const clientCount = await tx.user.count({ where: { role: 'CLIENT' } });
      if (clientCount >= MAX_CLIENT_ACCOUNTS) {
        throw new AccountCapacityReachedException(MAX_CLIENT_ACCOUNTS);
      }

      const createdUser = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          kycStatus: 'PENDING',
          role: 'CLIENT',
          accountType: freshCode.accountType,
          ledgerBalance: { create: {} },
        },
      });

      await tx.inviteCode.update({
        where: { id: freshCode.id },
        data: { usedAt: new Date(), usedByUserId: createdUser.id },
      });

      return createdUser;
    });

    await this.usersService.updateProfile(user.id, dto.profile);
    await this.usersService.updateAddresses(user.id, {
      addresses: [dto.address],
    });
    await this.usersService.updateEmployment(user.id, dto.employment);
    await this.usersService.updateIdentityDocument(
      user.id,
      dto.identityDocument,
    );
    await this.usersService.submitAmlProfile(user.id, dto.aml);

    return user;
  }
}
