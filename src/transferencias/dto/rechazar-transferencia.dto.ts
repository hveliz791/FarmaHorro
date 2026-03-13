import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RechazarTransferenciaDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  motivo?: string;
}
