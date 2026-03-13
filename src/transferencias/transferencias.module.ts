import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KardexMovimiento } from '../kardex/entities/kardex-movimiento.entity';
import { ProductoSucursal } from '../productos-sucursales/entities/producto-sucursal.entity';
import { Producto } from '../productos/entities/producto.entity';
import { Sucursal } from '../sucursales/entities/sucursal.entity';
import { TransferenciaDetalle } from './entities/transferencia-detalle.entity';
import { Transferencia } from './entities/transferencia.entity';
import { TransferenciasController } from './transferencias.controller';
import { TransferenciasService } from './transferencias.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Transferencia,
      TransferenciaDetalle,
      Sucursal,
      Producto,
      ProductoSucursal,
      KardexMovimiento,
    ]),
  ],
  controllers: [TransferenciasController],
  providers: [TransferenciasService],
  exports: [TransferenciasService],
})
export class TransferenciasModule {}
