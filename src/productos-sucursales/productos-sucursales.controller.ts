import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { CreateProductoSucursalDto } from './dto/create-producto-sucursal.dto';
import { UpdateProductoSucursalDto } from './dto/update-producto-sucursal.dto';
import { ProductosSucursalesService } from './productos-sucursales.service';

@Controller('inventario')
export class ProductosSucursalesController {
  constructor(private readonly service: ProductosSucursalesService) {}

  @Post()
  create(@Body() dto: CreateProductoSucursalDto) {
    return this.service.create(dto);
  }

  @Get('sucursal/:sucursalId')
  findBySucursal(@Param('sucursalId', ParseIntPipe) sucursalId: number) {
    return this.service.findBySucursal(sucursalId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductoSucursalDto,
  ) {
    return this.service.update(id, dto);
  }
}
