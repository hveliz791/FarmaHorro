import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompraDetalle } from '../compras/entities/compra-detalle.entity';
import { Compra } from '../compras/entities/compra.entity';
import { KardexMovimiento } from '../kardex/entities/kardex-movimiento.entity';
import { ProductoSucursal } from '../productos-sucursales/entities/producto-sucursal.entity';
import { Producto } from '../productos/entities/producto.entity';
import { Proveedor } from '../proveedores/entities/proveedor.entity';
import { Sucursal } from '../sucursales/entities/sucursal.entity';
import { ComprasController } from './compras.controller';
import { ComprasService } from './compras.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Compra,
      CompraDetalle,
      Proveedor,
      Sucursal,
      Producto,
      ProductoSucursal,
      KardexMovimiento,
    ]),
  ],
  controllers: [ComprasController],
  providers: [ComprasService],
  exports: [ComprasService],
})
export class ComprasModule {}
