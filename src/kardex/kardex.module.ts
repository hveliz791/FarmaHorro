import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KardexMovimiento } from './entities/kardex-movimiento.entity';
import { KardexController } from './kardex.controller';
import { KardexService } from './kardex.service';

@Module({
  imports: [TypeOrmModule.forFeature([KardexMovimiento])],
  controllers: [KardexController],
  providers: [KardexService],
  exports: [KardexService, TypeOrmModule],
})
export class KardexModule {}
