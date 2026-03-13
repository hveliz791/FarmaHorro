import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KardexMovimiento } from '../kardex/entities/kardex-movimiento.entity';
import { ProductoSucursal } from '../productos-sucursales/entities/producto-sucursal.entity';
import { Producto } from '../productos/entities/producto.entity';
import { Sucursal } from '../sucursales/entities/sucursal.entity';
import { VentaDetalle } from '../ventas/entities/venta-detalle.entity';
import { Venta } from '../ventas/entities/venta.entity';
import { VentasController } from './ventas.controller';
import { VentasService } from './ventas.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Venta,
      VentaDetalle,
      Sucursal,
      Producto,
      ProductoSucursal,
      KardexMovimiento,
    ]),
  ],
  controllers: [VentasController],
  providers: [VentasService],
  exports: [VentasService],
})
export class VentasModule {}
