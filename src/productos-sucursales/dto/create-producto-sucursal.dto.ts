import { Type } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateProductoSucursalDto {
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  productoId: number;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  sucursalId: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  stock?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  stockMinimo?: number;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
