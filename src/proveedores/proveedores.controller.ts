import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { Proveedor } from './entities/proveedor.entity';
import { ProveedoresService } from './proveedores.service';

@Controller('proveedores')
export class ProveedoresController {
  constructor(private readonly proveedoresService: ProveedoresService) {}

  @Post()
  create(@Body() dto: CreateProveedorDto): Promise<Proveedor> {
    return this.proveedoresService.create(dto);
  }

  @Get()
  findAll(): Promise<Proveedor[]> {
    return this.proveedoresService.findAll();
  }

  @Get('nit/:nit')
findByNit(@Param('nit') nit: string): Promise<Proveedor> {
  return this.proveedoresService.findByNit(nit);
}

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Proveedor> {
    return this.proveedoresService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProveedorDto,
  ): Promise<Proveedor> {
    return this.proveedoresService.update(id, dto);
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    await this.proveedoresService.remove(id);
    return { message: `Proveedor ${id} desactivado correctamente` };
  }
}
