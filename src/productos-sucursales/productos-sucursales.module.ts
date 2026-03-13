import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Producto } from '../productos/entities/producto.entity';
import { Sucursal } from '../sucursales/entities/sucursal.entity';
import { ProductoSucursal } from './entities/producto-sucursal.entity';
import { ProductosSucursalesController } from './productos-sucursales.controller';
import { ProductosSucursalesService } from './productos-sucursales.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProductoSucursal, Producto, Sucursal])],
  providers: [ProductosSucursalesService],
  controllers: [ProductosSucursalesController],
})
export class ProductosSucursalesModule {}
