import { PartialType } from '@nestjs/mapped-types';
import { CreateTransferenciaDto } from './create-transferencia.dto';

export class UpdateTransferenciaDto extends PartialType(
  CreateTransferenciaDto,
) {}
