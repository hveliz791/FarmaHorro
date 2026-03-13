import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectTransferenciaDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  motivo?: string;
}
