import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { Producto } from './entities/producto.entity';
import { ProductosService } from './productos.service';

@Controller('productos')
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

  @Post()
  create(@Body() dto: CreateProductoDto): Promise<Producto> {
    return this.productosService.create(dto);
  }

  /**
   * ✅ POS/Listado: rápido + search + stock por sucursal + paginado
   * /productos?search=aspirina&sucursalId=1&limit=60&offset=0
   */
  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('sucursalId') sucursalId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.productosService.findAllPos({
      search: search?.trim() || undefined,
      sucursalId: sucursalId ? Number(sucursalId) : undefined,
      limit: limit ? Number(limit) : 60,
      offset: offset ? Number(offset) : 0,
    });
  }

  @Get('admin/list')
findAllAdmin(): Promise<Producto[]> {
  return this.productosService.findAllAdmin();
}


  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Producto> {
    return this.productosService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductoDto,
  ): Promise<Producto> {
    return this.productosService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.productosService.remove(id);
    return { message: `Producto ${id} desactivado correctamente` };
  }
}
