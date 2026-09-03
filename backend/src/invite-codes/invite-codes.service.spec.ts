import { InviteCode } from '@prisma/client';
import * as passwordUtil from '../common/password.util';
import {
  AccountAlreadyExistsException,
  AccountCapacityReachedException,
} from '../common/exceptions/account-request.exceptions';
import {
  InviteCodeAlreadyUsedException,
  InviteCodeExpiredException,
  InviteCodeNotFoundException,
} from '../common/exceptions/invite-code.exceptions';
import { MAX_CLIENT_ACCOUNTS } from '../account-requests/account-requests.constants';
import { InviteCodesService } from './invite-codes.service';
import type { RedeemInviteCodeDto } from './dto/redeem-invite-code.dto';

function buildCode(overrides: Partial<InviteCode> = {}): InviteCode {
  return {
    id: 'code-1',
    code: 'AAAA-BBBB-2026',
    accountType: 'PARTICULIER',
    note: null,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    usedAt: null,
    usedByUserId: null,
    ...overrides,
  };
}

describe('InviteCodesService', () => {
  let prisma: {
    inviteCode: {
      findUnique: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    user: { findUnique: jest.Mock; count: jest.Mock; create: jest.Mock };
    $transaction: jest.Mock;
  };
  let tx: {
    inviteCode: { findUnique: jest.Mock; update: jest.Mock };
    user: { count: jest.Mock; create: jest.Mock };
  };
  let usersService: {
    updateProfile: jest.Mock;
    updateAddresses: jest.Mock;
    updateEmployment: jest.Mock;
    updateIdentityDocument: jest.Mock;
    submitAmlProfile: jest.Mock;
  };
  let service: InviteCodesService;

  beforeEach(() => {
    tx = {
      inviteCode: { findUnique: jest.fn(), update: jest.fn() },
      user: { count: jest.fn().mockResolvedValue(0), create: jest.fn() },
    };
    prisma = {
      inviteCode: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      user: { findUnique: jest.fn(), count: jest.fn(), create: jest.fn() },
      $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
        callback(tx),
      ),
    };
    usersService = {
      updateProfile: jest.fn().mockResolvedValue(undefined),
      updateAddresses: jest.fn().mockResolvedValue(undefined),
      updateEmployment: jest.fn().mockResolvedValue(undefined),
      updateIdentityDocument: jest.fn().mockResolvedValue(undefined),
      submitAmlProfile: jest.fn().mockResolvedValue(undefined),
    };
    service = new InviteCodesService(prisma as never, usersService as never);
    jest.spyOn(passwordUtil, 'hashPassword').mockResolvedValue('hashed');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generate', () => {
    it('crée un code au format XXXX-XXXX-AAAA avec l’année en cours', async () => {
      prisma.inviteCode.findUnique.mockResolvedValue(null);
      prisma.inviteCode.create.mockImplementation(
        ({ data }: { data: Partial<InviteCode> }) =>
          Promise.resolve(buildCode(data)),
      );

      const result = await service.generate({ accountType: 'PARTICULIER' });

      const year = new Date().getFullYear();
      expect(result.code).toMatch(
        new RegExp(`^[A-Z0-9]{4}-[A-Z0-9]{4}-${year}$`),
      );
      expect(result.status).toBe('ACTIVE');
    });

    it('réessaie tant que le code généré existe déjà', async () => {
      prisma.inviteCode.findUnique
        .mockResolvedValueOnce(buildCode()) // collision
        .mockResolvedValueOnce(null); // deuxième tentative libre
      prisma.inviteCode.create.mockImplementation(
        ({ data }: { data: Partial<InviteCode> }) =>
          Promise.resolve(buildCode(data)),
      );

      await service.generate({ accountType: 'BUSINESS' });

      expect(prisma.inviteCode.findUnique).toHaveBeenCalledTimes(2);
      expect(prisma.inviteCode.create).toHaveBeenCalledTimes(1);
    });

    it('propage accountType/note tels quels sur le code créé', async () => {
      prisma.inviteCode.findUnique.mockResolvedValue(null);
      prisma.inviteCode.create.mockImplementation(
        ({ data }: { data: Partial<InviteCode> }) =>
          Promise.resolve(buildCode(data)),
      );

      const result = await service.generate({
        accountType: 'BUSINESS',
        note: 'Jean Dupont',
      });

      expect(result.accountType).toBe('BUSINESS');
      expect(result.note).toBe('Jean Dupont');
    });
  });

  describe('validate', () => {
    it('rejette un code introuvable', async () => {
      prisma.inviteCode.findUnique.mockResolvedValue(null);
      await expect(service.validate('ZZZZ-ZZZZ-2026')).rejects.toThrow(
        InviteCodeNotFoundException,
      );
    });

    it('rejette un code déjà utilisé', async () => {
      prisma.inviteCode.findUnique.mockResolvedValue(
        buildCode({ usedAt: new Date() }),
      );
      await expect(service.validate('AAAA-BBBB-2026')).rejects.toThrow(
        InviteCodeAlreadyUsedException,
      );
    });

    it('rejette un code expiré', async () => {
      prisma.inviteCode.findUnique.mockResolvedValue(
        buildCode({ expiresAt: new Date(Date.now() - 1000) }),
      );
      await expect(service.validate('AAAA-BBBB-2026')).rejects.toThrow(
        InviteCodeExpiredException,
      );
    });

    it('accepte un code actif et normalise la casse/espaces', async () => {
      prisma.inviteCode.findUnique.mockResolvedValue(
        buildCode({ accountType: 'BUSINESS' }),
      );
      const result = await service.validate('  aaaa-bbbb-2026 ');
      expect(result.accountType).toBe('BUSINESS');
      expect(prisma.inviteCode.findUnique).toHaveBeenCalledWith({
        where: { code: 'AAAA-BBBB-2026' },
      });
    });
  });

  describe('redeem', () => {
    function buildDto(
      overrides: Partial<RedeemInviteCodeDto> = {},
    ): RedeemInviteCodeDto {
      return {
        code: 'AAAA-BBBB-2026',
        email: 'nouveau.client@example.com',
        password: 'motdepasse123',
        profile: { firstName: 'Ada', lastName: 'Lovelace' },
        address: {
          label: 'DOMICILE',
          street: '1 rue de Rivoli',
          city: 'Paris',
          postalCode: '75001',
          country: 'France',
        },
        employment: { professionalStatus: 'SALARIE' },
        identityDocument: { documentType: 'CNI' },
        aml: { confirmAttestation: true },
        ...overrides,
      };
    }

    it('rejette un email déjà utilisé sans toucher au code', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });
      await expect(service.redeem(buildDto())).rejects.toThrow(
        AccountAlreadyExistsException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('crée le compte, consomme le code et persiste le dossier KYC via UsersService', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      tx.inviteCode.findUnique.mockResolvedValue(buildCode());
      tx.user.create.mockResolvedValue({
        id: 'new-user',
        email: 'nouveau.client@example.com',
        kycStatus: 'PENDING',
        role: 'CLIENT',
        accountType: 'PARTICULIER',
        createdAt: new Date(),
      });

      const dto = buildDto();
      const user = await service.redeem(dto);

      expect(user.id).toBe('new-user');
      expect(tx.inviteCode.update).toHaveBeenCalledWith({
        where: { id: 'code-1' },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- expect.objectContaining() est typé `any` par @types/jest
        data: expect.objectContaining({ usedByUserId: 'new-user' }),
      });
      expect(usersService.updateProfile).toHaveBeenCalledWith(
        'new-user',
        dto.profile,
      );
      expect(usersService.updateAddresses).toHaveBeenCalledWith('new-user', {
        addresses: [dto.address],
      });
      expect(usersService.updateEmployment).toHaveBeenCalledWith(
        'new-user',
        dto.employment,
      );
      expect(usersService.updateIdentityDocument).toHaveBeenCalledWith(
        'new-user',
        dto.identityDocument,
      );
      expect(usersService.submitAmlProfile).toHaveBeenCalledWith(
        'new-user',
        dto.aml,
      );
    });

    it('rejette un code déjà consommé au moment précis de la transaction', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      tx.inviteCode.findUnique.mockResolvedValue(
        buildCode({ usedAt: new Date() }),
      );

      await expect(service.redeem(buildDto())).rejects.toThrow(
        InviteCodeAlreadyUsedException,
      );
      expect(tx.user.create).not.toHaveBeenCalled();
    });

    it('rejette si le plafond de comptes clients est atteint', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      tx.inviteCode.findUnique.mockResolvedValue(buildCode());
      tx.user.count.mockResolvedValue(MAX_CLIENT_ACCOUNTS);

      await expect(service.redeem(buildDto())).rejects.toThrow(
        AccountCapacityReachedException,
      );
      expect(tx.user.create).not.toHaveBeenCalled();
    });
  });
});
