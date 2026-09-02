import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AmlProfile,
  Address,
  ClientProfile,
  Employment,
  IdentityDocument,
  User,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateOwnAddressesDto } from './dto/update-own-addresses.dto';
import { UpdateOwnEmploymentDto } from './dto/update-own-employment.dto';
import { UpdateOwnIdentityDocumentDto } from './dto/update-own-identity-document.dto';
import { UpdateOwnProfileDto } from './dto/update-own-profile.dto';
import { SubmitOwnAmlProfileDto } from './dto/submit-own-aml-profile.dto';

export interface ClientProfileAddressView {
  label: Address['label'];
  street: string;
  addressLine2: string | null;
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
  professionalStatus: string | null;
  employer: string | null;
  sector: string | null;
  role: string | null;
  seniority: string | null;
  annualIncome: number | null;
  monthlyIncome: number | null;
  contractType: string | null;
  annualIncomeBracket: string | null;
  netWorthBracket: string | null;
  verified: boolean;
  activity: string | null;
  turnover: number | null;
  netResult: number | null;
}

export interface ClientProfileIdentityDocumentView {
  documentType: string | null;
  documentNumber: string | null;
  issuingAuthority: string | null;
  issuePlace: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  identityCheckMethod: string | null;
  proofOfAddressType: string | null;
  proofOfAddressIssuer: string | null;
  proofOfAddressDate: string | null;
  verified: boolean;
}

export interface ClientProfileAmlView {
  isPoliticallyExposed: boolean | null;
  fundsOrigin: string[];
  fundsOriginOther: string | null;
  relationshipPurpose: string[];
  attestedAt: string | null;
  attestationCity: string | null;
  // Décision de conformité — lecture seule côté client (jamais écrite par lui, cf.
  // AdminClientsService.decideKyc), affichée pour qu'il voie où en est son dossier.
  riskLevel: string | null;
  reviewDecision: string | null;
  reviewedAt: string | null;
}

export interface ClientProfileView {
  firstName: string | null;
  lastName: string | null;
  usageLastName: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  placeOfBirth: string | null;
  birthCountry: string | null;
  gender: string | null;
  nationality: string | null;
  secondNationality: string | null;
  maritalStatus: string | null;
  dependents: number | null;
  taxResidenceCountry: string | null;
  additionalTaxResidence: string | null;
  taxIdNumber: string | null;
  clientType: ClientProfile['clientType'];
  addresses: ClientProfileAddressView[];
  employment: ClientProfileEmploymentView | null;
  identityDocument: ClientProfileIdentityDocumentView | null;
  aml: ClientProfileAmlView | null;
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
      include: {
        clientProfile: true,
        addresses: true,
        employment: true,
        identityDocument: true,
        amlProfile: true,
      },
    });
    if (!user) {
      throw new NotFoundException(
        `Aucun utilisateur trouvé pour l'identifiant ${userId}`,
      );
    }

    return {
      firstName: user.clientProfile?.firstName ?? null,
      lastName: user.clientProfile?.lastName ?? null,
      usageLastName: user.clientProfile?.usageLastName ?? null,
      phone: user.clientProfile?.phone ?? null,
      dateOfBirth: user.clientProfile?.dateOfBirth?.toISOString() ?? null,
      placeOfBirth: user.clientProfile?.placeOfBirth ?? null,
      birthCountry: user.clientProfile?.birthCountry ?? null,
      gender: user.clientProfile?.gender ?? null,
      nationality: user.clientProfile?.nationality ?? null,
      secondNationality: user.clientProfile?.secondNationality ?? null,
      maritalStatus: user.clientProfile?.maritalStatus ?? null,
      dependents: user.clientProfile?.dependents ?? null,
      taxResidenceCountry: user.clientProfile?.taxResidenceCountry ?? null,
      additionalTaxResidence:
        user.clientProfile?.additionalTaxResidence ?? null,
      taxIdNumber: user.clientProfile?.taxIdNumber ?? null,
      clientType: user.clientProfile?.clientType ?? 'PARTICULIER',
      addresses: user.addresses.map((a: Address) => ({
        label: a.label,
        street: a.street,
        addressLine2: a.addressLine2,
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
      identityDocument: user.identityDocument
        ? this.presentIdentityDocument(user.identityDocument)
        : null,
      aml: user.amlProfile ? this.presentAml(user.amlProfile) : null,
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
      usageLastName: dto.usageLastName,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      placeOfBirth: dto.placeOfBirth,
      birthCountry: dto.birthCountry,
      gender: dto.gender,
      nationality: dto.nationality,
      secondNationality: dto.secondNationality,
      maritalStatus: dto.maritalStatus,
      dependents: dto.dependents,
      phone: dto.phone,
      taxResidenceCountry: dto.taxResidenceCountry,
      additionalTaxResidence: dto.additionalTaxResidence,
      taxIdNumber: dto.taxIdNumber,
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

  // Pièce d'identité et justificatif de domicile déclarés (cf. §6 entrée #33) — mêmes
  // règles que updateAddresses/updateEmployment ci-dessus : `verified` forcé à false à
  // chaque écriture du client, y compris sur une pièce déjà certifiée par un conseiller.
  async updateIdentityDocument(
    userId: string,
    dto: UpdateOwnIdentityDocumentDto,
  ): Promise<ClientProfileView> {
    const data = {
      documentType: dto.documentType,
      documentNumber: dto.documentNumber,
      issuingAuthority: dto.issuingAuthority,
      issuePlace: dto.issuePlace,
      issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
      expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
      identityCheckMethod: dto.identityCheckMethod,
      proofOfAddressType: dto.proofOfAddressType,
      proofOfAddressIssuer: dto.proofOfAddressIssuer,
      proofOfAddressDate: dto.proofOfAddressDate
        ? new Date(dto.proofOfAddressDate)
        : undefined,
      verified: false,
    };
    await this.prisma.identityDocument.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
    return this.getProfile(userId);
  }

  // Soumission du profil de conformité LCB-FT/PPE avec attestation "Lu et approuvé" (cf.
  // dossier KYC papier §5-6, §6 entrée #33) — `confirmAttestation` déjà validé à `true`
  // par le DTO avant d'arriver ici (cf. SubmitOwnAmlProfileDto). Toute (re)soumission
  // horodate `attestedAt` et réinitialise le volet admin (`riskLevel`/`reviewDecision`/
  // `reviewedByUserId`/`reviewedAt`) : un dossier qui vient de changer n'est plus
  // celui qu'un conseiller a validé, même principe que `verified` forcé à false ailleurs
  // dans l'auto-déclaration.
  async submitAmlProfile(
    userId: string,
    dto: SubmitOwnAmlProfileDto,
  ): Promise<ClientProfileView> {
    if (dto.confirmAttestation !== true) {
      // Filet de sécurité — @Equals(true) sur le DTO doit déjà avoir rejeté la requête
      // avant d'arriver ici, jamais atteint en usage normal.
      throw new BadRequestException(
        "L'attestation « Lu et approuvé » doit être cochée pour soumettre le dossier.",
      );
    }
    const data = {
      isPoliticallyExposed: dto.isPoliticallyExposed,
      fundsOrigin: dto.fundsOrigin ?? [],
      fundsOriginOther: dto.fundsOriginOther,
      relationshipPurpose: dto.relationshipPurpose ?? [],
      attestationCity: dto.attestationCity,
      attestedAt: new Date(),
      riskLevel: null,
      reviewDecision: null,
      reviewedByUserId: null,
      reviewedAt: null,
    };
    await this.prisma.amlProfile.upsert({
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
      professionalStatus: e.professionalStatus,
      employer: e.employer,
      sector: e.sector,
      role: e.role,
      seniority: e.seniority,
      annualIncome: e.annualIncome ? Number(e.annualIncome) : null,
      monthlyIncome: e.monthlyIncome ? Number(e.monthlyIncome) : null,
      contractType: e.contractType,
      annualIncomeBracket: e.annualIncomeBracket,
      netWorthBracket: e.netWorthBracket,
      verified: e.verified,
      activity: e.activity,
      turnover: e.turnover ? Number(e.turnover) : null,
      netResult: e.netResult ? Number(e.netResult) : null,
    };
  }

  private presentIdentityDocument(
    d: IdentityDocument,
  ): ClientProfileIdentityDocumentView {
    return {
      documentType: d.documentType,
      documentNumber: d.documentNumber,
      issuingAuthority: d.issuingAuthority,
      issuePlace: d.issuePlace,
      issueDate: d.issueDate?.toISOString() ?? null,
      expiryDate: d.expiryDate?.toISOString() ?? null,
      identityCheckMethod: d.identityCheckMethod,
      proofOfAddressType: d.proofOfAddressType,
      proofOfAddressIssuer: d.proofOfAddressIssuer,
      proofOfAddressDate: d.proofOfAddressDate?.toISOString() ?? null,
      verified: d.verified,
    };
  }

  private presentAml(a: AmlProfile): ClientProfileAmlView {
    return {
      isPoliticallyExposed: a.isPoliticallyExposed,
      fundsOrigin: a.fundsOrigin,
      fundsOriginOther: a.fundsOriginOther,
      relationshipPurpose: a.relationshipPurpose,
      attestedAt: a.attestedAt?.toISOString() ?? null,
      attestationCity: a.attestationCity,
      riskLevel: a.riskLevel,
      reviewDecision: a.reviewDecision,
      reviewedAt: a.reviewedAt?.toISOString() ?? null,
    };
  }
}
