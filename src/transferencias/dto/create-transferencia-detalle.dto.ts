import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class CreateTransferenciaDetalleDto {
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  productoId: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  cantidad: number;
}
