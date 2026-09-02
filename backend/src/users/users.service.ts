import { Injectable, NotFoundException } from '@nestjs/common';
import { Address, ClientProfile, Employment, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateOwnAddressesDto } from './dto/update-own-addresses.dto';
import { UpdateOwnEmploymentDto } from './dto/update-own-employment.dto';
import { UpdateOwnProfileDto } from './dto/update-own-profile.dto';

export interface ClientProfileAddressView {
  label: Address['label'];
  street: string;
  city: string;
  postalCode: string;
  country: string;
  residenceType: string | null;
  since: string | null;
  verified: boolean;
}

export interface ClientProfileEmploymentView {
  isIndependent: boolean;
  status: string | null;
  employer: string | null;
  sector: string | null;
  role: string | null;
  seniority: string | null;
  annualIncome: number | null;
  monthlyIncome: number | null;
  contractType: string | null;
  verified: boolean;
  activity: string | null;
  turnover: number | null;
  netResult: number | null;
}

export interface ClientProfileView {
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  placeOfBirth: string | null;
  nationality: string | null;
  maritalStatus: string | null;
  dependents: number | null;
  clientType: ClientProfile['clientType'];
  addresses: ClientProfileAddressView[];
  employment: ClientProfileEmploymentView | null;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<
    Pick<User, 'id' | 'email' | 'kycStatus' | 'role' | 'createdAt'>[]
  > {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        kycStatus: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Profil "noyau essentiel" (cf. AdminClientsModule pour la version complète
  // back-office) exposé ici au client lui-même — nom, prénom, coordonnées, adresse,
  // situation professionnelle et revenus déclarés. Nullable partout : un compte
  // fraîchement créé (cf. AccountRequestsService.approve) n'a encore rien de complété.
  async getProfile(userId: string): Promise<ClientProfileView> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { clientProfile: true, addresses: true, employment: true },
    });
    if (!user) {
      throw new NotFoundException(
        `Aucun utilisateur trouvé pour l'identifiant ${userId}`,
      );
    }

    return {
      firstName: user.clientProfile?.firstName ?? null,
      lastName: user.clientProfile?.lastName ?? null,
      phone: user.clientProfile?.phone ?? null,
      dateOfBirth: user.clientProfile?.dateOfBirth?.toISOString() ?? null,
      placeOfBirth: user.clientProfile?.placeOfBirth ?? null,
      nationality: user.clientProfile?.nationality ?? null,
      maritalStatus: user.clientProfile?.maritalStatus ?? null,
      dependents: user.clientProfile?.dependents ?? null,
      clientType: user.clientProfile?.clientType ?? 'PARTICULIER',
      addresses: user.addresses.map((a: Address) => ({
        label: a.label,
        street: a.street,
        city: a.city,
        postalCode: a.postalCode,
        country: a.country,
        residenceType: a.residenceType,
        since: a.since,
        verified: a.verified,
      })),
      employment: user.employment
        ? this.presentEmployment(user.employment)
        : null,
    };
  }

  // Auto-service — même noyau que AdminClientsService.updateProfile, mais retourne la
  // vue client restreinte (getProfile) plutôt que la fiche 360 complète, et n'accepte pas
  // `clientType` (cf. UpdateOwnProfileDto). Upsert : un compte fraîchement créé n'a pas
  // encore de ClientProfile (cf. AccountRequestsService.approve).
  async updateProfile(
    userId: string,
    dto: UpdateOwnProfileDto,
  ): Promise<ClientProfileView> {
    const data = {
      firstName: dto.firstName,
      lastName: dto.lastName,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      placeOfBirth: dto.placeOfBirth,
      nationality: dto.nationality,
      maritalStatus: dto.maritalStatus,
      dependents: dto.dependents,
      phone: dto.phone,
    };
    await this.prisma.clientProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
    return this.getProfile(userId);
  }

  // Remplacement en bloc (au plus une par label, cf. @@unique([userId, label]) sur
  // Address) — même principe que la version admin. `verified` forcé à false ici, sur la
  // création COMME sur la mise à jour : une adresse qu'un admin avait certifiée perd sa
  // certification dès que le client la modifie lui-même, jusqu'à nouvelle vérification.
  async updateAddresses(
    userId: string,
    dto: UpdateOwnAddressesDto,
  ): Promise<ClientProfileView> {
    await this.prisma.$transaction(
      dto.addresses.map((a) =>
        this.prisma.address.upsert({
          where: { userId_label: { userId, label: a.label } },
          create: { userId, ...a, verified: false },
          update: { ...a, verified: false },
        }),
      ),
    );
    return this.getProfile(userId);
  }

  // Même logique que updateAddresses ci-dessus pour `verified` : jamais certifiée par
  // l'auto-déclaration du client, toujours remise à false dès qu'il modifie sa situation.
  async updateEmployment(
    userId: string,
    dto: UpdateOwnEmploymentDto,
  ): Promise<ClientProfileView> {
    const data = { ...dto, verified: false };
    await this.prisma.employment.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
    return this.getProfile(userId);
  }

  private presentEmployment(e: Employment): ClientProfileEmploymentView {
    return {
      isIndependent: e.isIndependent,
      status: e.status,
      employer: e.employer,
      sector: e.sector,
      role: e.role,
      seniority: e.seniority,
      annualIncome: e.annualIncome ? Number(e.annualIncome) : null,
      monthlyIncome: e.monthlyIncome ? Number(e.monthlyIncome) : null,
      contractType: e.contractType,
      verified: e.verified,
      activity: e.activity,
      turnover: e.turnover ? Number(e.turnover) : null,
      netResult: e.netResult ? Number(e.netResult) : null,
    };
  }
}
