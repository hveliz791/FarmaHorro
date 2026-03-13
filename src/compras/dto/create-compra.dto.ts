import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateCompraDetalleDto {
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  productoId: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  @IsNotEmpty()
  cantidad: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  precio: number;
}

export class CreateCompraDto {
  // ADMIN: no lo manda (sale del token)
  // SUPER_ADMIN: lo manda
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  @Type(() => Number)
  @IsInt()
  sucursalId?: number;

  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  proveedorId: number;

  @IsDateString()
  @IsNotEmpty()
  fecha: string;

  // Déjalo solo si lo usarás o si el frontend lo manda
  @IsOptional()
  @IsString()
  formaPago?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCompraDetalleDto)
  detalles: CreateCompraDetalleDto[];
}
