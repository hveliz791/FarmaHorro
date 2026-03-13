import { PartialType } from '@nestjs/mapped-types';
import { CreateProductoSucursalDto } from './create-producto-sucursal.dto';

export class UpdateProductoSucursalDto extends PartialType(
  CreateProductoSucursalDto,
) {}
