import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { User } from './users/user.entity';
import { Group } from './groups/group.entity';
import { GroupMember } from './groups/group-member.entity';
import { Category } from './categories/category.entity';
import { PaymentMethod } from './payment-methods/payment-method.entity';
import { Transaction } from './transactions/transaction.entity';
import { Installment } from './transactions/installment.entity';
import { SeedModule } from './seed/seed.module';
import { GroupsModule } from './groups/groups.module';
import { CategoriesModule } from './categories/categories.module';
import { PaymentMethodsModule } from './payment-methods/payment-methods.module';
import { TransactionsModule } from './transactions/transactions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule, SeedModule, GroupsModule,],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        database: config.get<string>('DB_NAME'),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASSWORD'),
        entities: [User, Group, GroupMember, Category, PaymentMethod, Transaction, Installment],
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        synchronize: false,
        logging: config.get<string>('NODE_ENV') === 'development',
      }),
    }),

    AuthModule,
    CategoriesModule,
    PaymentMethodsModule,
    TransactionsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
