import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { KardexMovimiento } from './entities/kardex-movimiento.entity';

@Injectable()
export class KardexService {
  constructor(
    @InjectRepository(KardexMovimiento)
    private readonly kardexRepo: Repository<KardexMovimiento>,
  ) {}

  // 🔹 Kardex por producto (sin fecha)
  async findByProducto(
    productoId: number,
    sucursalId?: number,
  ): Promise<KardexMovimiento[]> {
    const where: any = { producto: { id: productoId } };
    if (sucursalId) where.sucursal = { id: sucursalId };

    return this.kardexRepo.find({
      where,
      relations: ['producto', 'sucursal'],
      order: { fecha: 'ASC', id: 'ASC' },
    });
  }

  // 🔹 Kardex por producto + rango de fechas
async findByProductoAndRangoFechas(
  productoId: number,
  sucursalId: number | undefined,
  desde: Date,
  hastaExclusivo: Date,
): Promise<KardexMovimiento[]> {
  const where: any = {
    producto: { id: productoId },
    fecha: Between(desde, hastaExclusivo), // O >= desde AND < hastaExclusivo
  };

  if (sucursalId) {
    where.sucursal = { id: sucursalId };
  }

  return this.kardexRepo.find({
    where,
    relations: ['producto', 'sucursal'],
    order: { fecha: 'ASC', id: 'ASC' },
  });
}


  // ⭐ NUEVO: Kardex de TODOS los productos en un rango de fechas
async findByRangoFechas(
  sucursalId: number | undefined,
  desde: Date,
  hastaExclusivo: Date,
): Promise<KardexMovimiento[]> {
  const qb = this.kardexRepo
    .createQueryBuilder('k')
    .leftJoinAndSelect('k.producto', 'producto')
    .leftJoinAndSelect('k.sucursal', 'sucursal')
    .where('k.fecha >= :desde', { desde })
    .andWhere('k.fecha < :hasta', { hasta: hastaExclusivo })
    .orderBy('k.fecha', 'ASC')
    .addOrderBy('k.id', 'ASC');

  if (sucursalId) {
    qb.andWhere('sucursal.id = :sucursalId', { sucursalId });
  }

  return qb.getMany();
}
}
