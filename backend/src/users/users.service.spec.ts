import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let prisma: {
    user: { findMany: jest.Mock; findUnique: jest.Mock };
    clientProfile: { upsert: jest.Mock };
    address: { upsert: jest.Mock };
    employment: { upsert: jest.Mock };
    $transaction: jest.Mock;
  };
  let service: UsersService;

  beforeEach(() => {
    prisma = {
      user: { findMany: jest.fn(), findUnique: jest.fn() },
      clientProfile: { upsert: jest.fn() },
      address: { upsert: jest.fn() },
      employment: { upsert: jest.fn() },
      $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
    };
    service = new UsersService(prisma as never);
  });

  describe('getProfile', () => {
    it('throws NotFoundException when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns a fully-populated profile when every related record exists', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        clientProfile: {
          firstName: 'Jean',
          lastName: 'Dupont',
          phone: '+33 6 12 34 56 78',
          dateOfBirth: new Date('1985-06-14T00:00:00Z'),
          placeOfBirth: 'Lyon',
          nationality: 'Française',
          maritalStatus: 'Marié',
          dependents: 2,
          clientType: 'PARTICULIER',
        },
        addresses: [
          {
            label: 'DOMICILE',
            street: '14 rue des Lilas',
            city: 'Lyon',
            postalCode: '69003',
            country: 'France',
            residenceType: 'Propriétaire',
            since: '2019',
            verified: true,
          },
        ],
        employment: {
          isIndependent: false,
          status: 'Salarié',
          employer: 'Techneo Industries SA',
          sector: 'Industrie',
          role: 'Ingénieur',
          seniority: '7 ans',
          annualIncome: '58800',
          monthlyIncome: '4900',
          contractType: 'CDI',
          verified: true,
          activity: null,
          turnover: null,
          netResult: null,
        },
      });

      const profile = await service.getProfile('user-1');

      expect(profile.firstName).toBe('Jean');
      expect(profile.lastName).toBe('Dupont');
      expect(profile.dateOfBirth).toBe('1985-06-14T00:00:00.000Z');
      expect(profile.addresses).toHaveLength(1);
      expect(profile.addresses[0].city).toBe('Lyon');
      expect(profile.employment?.employer).toBe('Techneo Industries SA');
      expect(profile.employment?.annualIncome).toBe(58800);
    });

    it('returns null/empty fields for a brand-new account with no profile completed yet', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-2',
        clientProfile: null,
        addresses: [],
        employment: null,
      });

      const profile = await service.getProfile('user-2');

      expect(profile.firstName).toBeNull();
      expect(profile.clientType).toBe('PARTICULIER');
      expect(profile.addresses).toEqual([]);
      expect(profile.employment).toBeNull();
    });
  });

  // Auto-service (cf. UserProfileController) — même noyau que
  // AdminClientsService.updateProfile/updateAddresses/updateEmployment, sans
  // `clientType`/`verified` : ces trois méthodes renvoient la vue client restreinte
  // (getProfile), jamais la fiche 360 admin.
  describe('updateProfile', () => {
    it('upserts the client profile and returns the refreshed client-facing view', async () => {
      prisma.clientProfile.upsert.mockResolvedValue({});
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        clientProfile: { nationality: 'Suisse' },
        addresses: [],
        employment: null,
      });

      const result = await service.updateProfile('user-1', {
        nationality: 'Suisse',
      });

      expect(prisma.clientProfile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
      expect(result.nationality).toBe('Suisse');
    });

    it('converts a dateOfBirth string into a Date before upserting', async () => {
      prisma.clientProfile.upsert.mockResolvedValue({});
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        clientProfile: null,
        addresses: [],
        employment: null,
      });

      await service.updateProfile('user-1', { dateOfBirth: '1990-01-01' });

      const calls = prisma.clientProfile.upsert.mock.calls as unknown as Array<
        [{ create: { dateOfBirth: Date } }]
      >;
      expect(calls[0][0].create.dateOfBirth).toBeInstanceOf(Date);
    });
  });

  describe('updateAddresses', () => {
    it('upserts every address entry inside a single transaction, forcing verified to false', async () => {
      prisma.address.upsert.mockResolvedValue({});
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        clientProfile: null,
        addresses: [],
        employment: null,
      });

      await service.updateAddresses('user-1', {
        addresses: [
          {
            label: 'DOMICILE',
            street: '1 rue Neuve',
            city: 'Nyon',
            postalCode: '1260',
            country: 'Suisse',
          },
        ],
      });

      expect(prisma.$transaction).toHaveBeenCalled();
      const calls = prisma.address.upsert.mock.calls as unknown as Array<
        [{ create: { verified: boolean }; update: { verified: boolean } }]
      >;
      expect(calls[0][0].create.verified).toBe(false);
      expect(calls[0][0].update.verified).toBe(false);
    });

    it("resets a previously admin-verified address's verified flag once the client edits it", async () => {
      prisma.address.upsert.mockResolvedValue({});
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        clientProfile: null,
        addresses: [],
        employment: null,
      });

      await service.updateAddresses('user-1', {
        addresses: [
          {
            label: 'DOMICILE',
            street: 'Nouvelle adresse',
            city: 'Geneve',
            postalCode: '1200',
            country: 'Suisse',
          },
        ],
      });

      const calls = prisma.address.upsert.mock.calls as unknown as Array<
        [{ update: { verified: boolean } }]
      >;
      expect(calls[0][0].update.verified).toBe(false);
    });
  });

  describe('updateEmployment', () => {
    it('upserts employment, forcing verified to false, and returns the client-facing view', async () => {
      prisma.employment.upsert.mockResolvedValue({});
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        clientProfile: null,
        addresses: [],
        employment: {
          isIndependent: false,
          status: null,
          employer: 'Acme',
          sector: null,
          role: null,
          seniority: null,
          annualIncome: '60000',
          monthlyIncome: null,
          contractType: null,
          verified: false,
          activity: null,
          turnover: null,
          netResult: null,
        },
      });

      const result = await service.updateEmployment('user-1', {
        employer: 'Acme',
        annualIncome: 60000,
      });

      const calls = prisma.employment.upsert.mock.calls as unknown as Array<
        [{ create: { verified: boolean }; update: { verified: boolean } }]
      >;
      expect(calls[0][0].create.verified).toBe(false);
      expect(calls[0][0].update.verified).toBe(false);
      expect(result.employment?.employer).toBe('Acme');
      expect(result.employment?.annualIncome).toBe(60000);
    });
  });
});
