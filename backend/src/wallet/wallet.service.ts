import { Injectable } from '@nestjs/common';
import { AcceptedCurrency, Chain, Wallet } from '@prisma/client';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { UnsupportedChainException } from '../common/exceptions/wallet.exceptions';
import { PrismaService } from '../prisma/prisma.service';
import { EVM_SANDBOX_CHAINS } from './wallet.constants';

// Génération d'adresses de dépôt en environnement Sandbox/Testnet (CLAUDE.md §5 Step 3).
// La clé privée générée n'est jamais persistée : en production, la génération et la
// custody des clés sont déléguées au partenaire MPC (Circle / DFNS / Fireblocks).
@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  generateSandboxAddress(chain: Chain): string {
    if (!EVM_SANDBOX_CHAINS.includes(chain)) {
      throw new UnsupportedChainException(chain);
    }
    const privateKey = generatePrivateKey();
    return privateKeyToAccount(privateKey).address;
  }

  // Idempotent : renvoie l'adresse existante si l'utilisateur en a déjà une pour ce
  // couple (chain, currency) plutôt que d'en générer une nouvelle à chaque appel.
  async createDepositAddress(
    userId: string,
    chain: Chain,
    currency: AcceptedCurrency,
  ): Promise<Wallet> {
    const existing = await this.prisma.wallet.findFirst({
      where: { userId, chain, currency },
    });
    if (existing) {
      return existing;
    }

    const address = this.generateSandboxAddress(chain);
    return this.prisma.wallet.create({
      data: { userId, chain, currency, address },
    });
  }

  async listWallets(userId: string): Promise<Wallet[]> {
    return this.prisma.wallet.findMany({ where: { userId } });
  }
}
