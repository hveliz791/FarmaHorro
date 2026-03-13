import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ConfirmarTransferenciaDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  observacion?: string;
}
