import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let prisma: { user: { findMany: jest.Mock; findUnique: jest.Mock } };
  let service: UsersService;

  beforeEach(() => {
    prisma = { user: { findMany: jest.fn(), findUnique: jest.fn() } };
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
});
