import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { getTypeOrmConfig } from './config/database.config';

// Importaremos aquí los módulos de dominio
import { AuthModule } from './auth/auth.module';
import { CategoriasModule } from './categorias/categorias.module';
import { ComprasModule } from './compras/compras.module';
import { KardexModule } from './kardex/kardex.module';
import { ProductosSucursalesModule } from './productos-sucursales/productos-sucursales.module';
import { ProductosModule } from './productos/productos.module';
import { ProveedoresModule } from './proveedores/proveedores.module';
import { SucursalesModule } from './sucursales/sucursales.module';
import { UsersModule } from './users/users.module';
import { VentasModule } from './ventas/ventas.module';
import { TransferenciasModule } from './transferencias/transferencias.module';
import { ClientesModule } from './clientes/clientes.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
     ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 20,
      },
    ]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: getTypeOrmConfig,
    }),
    SucursalesModule,
    CategoriasModule,
    ProductosModule,
    ProductosSucursalesModule,
    ProveedoresModule,
    ComprasModule,
    VentasModule,
    KardexModule,
    UsersModule,
    AuthModule,
    TransferenciasModule,
    ClientesModule,
  ],

  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // Primero: requiere JWT
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard, // Segundo: verifica roles
    },
  ],
})
export class AppModule {}
