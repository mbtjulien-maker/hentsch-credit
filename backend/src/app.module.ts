import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AccountRequestsModule } from './account-requests/account-requests.module';
import { AdminClientsModule } from './admin-clients/admin-clients.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CardsModule } from './cards/cards.module';
import { ClientWalletsModule } from './client-wallets/client-wallets.module';
import { CreditEngineModule } from './credit/credit-engine.module';
import { CreditRequestsModule } from './credit-requests/credit-requests.module';
import { DepositIntentsModule } from './deposit-intents/deposit-intents.module';
import { DirectCreditModule } from './direct-credit/direct-credit.module';
import { LedgerModule } from './ledger/ledger.module';
import { MarketDataModule } from './market-data/market-data.module';
import { PaymentsModule } from './payments/payments.module';
import { PrismaModule } from './prisma/prisma.module';
import { TransactionsModule } from './transactions/transactions.module';
import { TreasuryBotModule } from './treasury-bot/treasury-bot.module';
import { UsersModule } from './users/users.module';
import { WalletModule } from './wallet/wallet.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { WithdrawalModule } from './withdrawal/withdrawal.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    // Limite de débit globale par IP (défense contre le scraping/l'abus automatisé) —
    // 120 req/min est large pour un usage normal (dashboard qui rafraîchit son solde,
    // vue marché...), mais bloque un script qui bourrine l'API. Des limites plus strictes
    // s'ajoutent par route sensible via @Throttle (ex: /auth/login, cf. AuthController).
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
    PrismaModule,
    AuthModule,
    LedgerModule,
    CreditEngineModule,
    WalletModule,
    WebhooksModule,
    TransactionsModule,
    UsersModule,
    CardsModule,
    MarketDataModule,
    WithdrawalModule,
    PaymentsModule,
    CreditRequestsModule,
    AccountRequestsModule,
    AdminClientsModule,
    DepositIntentsModule,
    DirectCreditModule,
    ClientWalletsModule,
    TreasuryBotModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
