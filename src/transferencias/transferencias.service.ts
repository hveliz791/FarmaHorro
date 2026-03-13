import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { KardexMovimiento } from '../kardex/entities/kardex-movimiento.entity';
import { ProductoSucursal } from '../productos-sucursales/entities/producto-sucursal.entity';
import { Producto } from '../productos/entities/producto.entity';
import { Sucursal } from '../sucursales/entities/sucursal.entity';
import { CreateTransferenciaDto } from './dto/create-transferencia.dto';
import { UpdateTransferenciaDto } from './dto/update-transferencia.dto';
import { TransferenciaDetalle } from './entities/transferencia-detalle.entity';
import { Transferencia } from './entities/transferencia.entity';

@Injectable()
export class TransferenciasService {
  constructor(
    @InjectRepository(Transferencia)
    private readonly transferenciaRepo: Repository<Transferencia>,
    @InjectRepository(TransferenciaDetalle)
    private readonly transferenciaDetalleRepo: Repository<TransferenciaDetalle>,
    @InjectRepository(Sucursal)
    private readonly sucursalRepo: Repository<Sucursal>,
    @InjectRepository(Producto)
    private readonly productoRepo: Repository<Producto>,
    @InjectRepository(ProductoSucursal)
    private readonly productoSucursalRepo: Repository<ProductoSucursal>,
    private readonly dataSource: DataSource,
  ) {}

  // ✅ helper: roles globales
  private isGlobalRole(user: any) {
    const r = String(user?.rol || '').toUpperCase();
    return r === 'SUPER_ADMIN' || r === 'SYSTEM_OWNER';
  }

  async create(dto: CreateTransferenciaDto, user: any): Promise<Transferencia> {
    if (!dto.detalles || dto.detalles.length === 0) {
      throw new BadRequestException('La transferencia debe tener al menos un detalle');
    }

    let sucursalOrigenId: number;
    let sucursalDestinoId: number;

    // ✅ SUPER_ADMIN y SYSTEM_OWNER: eligen origen + destino
    if (this.isGlobalRole(user)) {
      if (!dto.sucursalOrigenId || !dto.sucursalDestinoId) {
        throw new BadRequestException('Debe indicar sucursalOrigenId y sucursalDestinoId');
      }
      sucursalOrigenId = dto.sucursalOrigenId;
      sucursalDestinoId = dto.sucursalDestinoId;
    } else {
      // ✅ otros roles: origen fijo = su sucursal
      if (!user.sucursalId) {
        throw new BadRequestException('El usuario no tiene una sucursal asignada');
      }
      sucursalOrigenId = user.sucursalId;

      if (!dto.sucursalDestinoId) {
        throw new BadRequestException('Debe indicar la sucursal destino de la transferencia');
      }
      sucursalDestinoId = dto.sucursalDestinoId;
    }

    if (sucursalOrigenId === sucursalDestinoId) {
      throw new BadRequestException('La sucursal origen y destino deben ser distintas');
    }

    const sucOrigen = await this.sucursalRepo.findOne({
      where: { id: sucursalOrigenId, activo: true },
    });
    if (!sucOrigen) throw new NotFoundException('Sucursal origen no encontrada');

    const sucDestino = await this.sucursalRepo.findOne({
      where: { id: sucursalDestinoId, activo: true },
    });
    if (!sucDestino) throw new NotFoundException('Sucursal destino no encontrada');

    return this.dataSource.transaction(async (manager) => {
      const transferencia = new Transferencia();
      transferencia.sucursalOrigen = sucOrigen;
      transferencia.sucursalDestino = sucDestino;
      transferencia.fecha = new Date(dto.fecha);
      transferencia.usuarioId = user.userId ?? null;
      transferencia.estado = 'PENDIENTE';
      transferencia.detalles = [];

      const detallesInfo: { producto: Producto; cantidad: number }[] = [];

      // 1) Validar stock en origen y armar detalles
      for (const detDto of dto.detalles) {
        const producto = await manager.getRepository(Producto).findOne({
          where: { id: detDto.productoId, activo: true },
        });
        if (!producto) {
          throw new NotFoundException(`Producto con id ${detDto.productoId} no encontrado`);
        }

        const prodSucOrigen = await manager.getRepository(ProductoSucursal).findOne({
          where: {
            producto: { id: producto.id },
            sucursal: { id: sucOrigen.id },
          },
          relations: ['producto', 'sucursal'],
          lock: { mode: 'pessimistic_write' },
        });

        if (!prodSucOrigen) {
          throw new BadRequestException(
            `El producto ${producto.nombre} no tiene inventario en la sucursal origen`,
          );
        }

        const stockOrigen = Number(prodSucOrigen.stock);
        if (stockOrigen < detDto.cantidad) {
          throw new BadRequestException(
            `Stock insuficiente en sucursal origen para producto ${producto.nombre}. ` +
              `Stock actual: ${stockOrigen}, requerido: ${detDto.cantidad}`,
          );
        }

        const detalle = new TransferenciaDetalle();
        detalle.producto = producto;
        detalle.cantidad = detDto.cantidad;
        detalle.transferencia = transferencia;

        transferencia.detalles.push(detalle);
        detallesInfo.push({ producto, cantidad: detDto.cantidad });
      }

      const transfGuardada = await manager.getRepository(Transferencia).save(transferencia);

      // 2) DESCONTAR SOLO ORIGEN + KARDEX OUT (NO SUMAR DESTINO)
      for (const det of detallesInfo) {
        const prodSucOrigen = await manager.getRepository(ProductoSucursal).findOne({
          where: {
            producto: { id: det.producto.id },
            sucursal: { id: sucOrigen.id },
          },
          relations: ['producto', 'sucursal'],
          lock: { mode: 'pessimistic_write' },
        });

        if (!prodSucOrigen) {
          throw new BadRequestException(
            `El producto ${det.producto.nombre} no tiene inventario en sucursal origen`,
          );
        }

        const stockOrigenAntes = Number(prodSucOrigen.stock);
        const stockOrigenDespues = stockOrigenAntes - det.cantidad;

        prodSucOrigen.stock = stockOrigenDespues;
        await manager.getRepository(ProductoSucursal).save(prodSucOrigen);

        const kardexOut = manager.getRepository(KardexMovimiento).create({
          producto: det.producto,
          sucursal: sucOrigen,
          tipo: 'TRANSFERENCIA_OUT',
          documentoTipo: 'TRANSFERENCIA',
          documentoId: transfGuardada.id,
          cantidad: det.cantidad,
          stockAntes: stockOrigenAntes,
          stockDespues: stockOrigenDespues,
          usuarioId: user.userId ?? null,
        });
        await manager.getRepository(KardexMovimiento).save(kardexOut);
      }

      return manager.getRepository(Transferencia).findOneOrFail({
        where: { id: transfGuardada.id },
        relations: ['sucursalOrigen', 'sucursalDestino', 'detalles', 'detalles.producto'],
      });
    });
  }

  // ✅ (opcional pero recomendado) permitir filtro por sucursal para roles globales
  async findAll(user: any, sucursalId?: number): Promise<Transferencia[]> {
    if (this.isGlobalRole(user)) {
      if (sucursalId) {
        return this.transferenciaRepo.find({
          where: [
            { sucursalOrigen: { id: sucursalId } },
            { sucursalDestino: { id: sucursalId } },
          ],
          relations: ['sucursalOrigen', 'sucursalDestino', 'detalles', 'detalles.producto'],
          order: { id: 'DESC' },
        });
      }

      return this.transferenciaRepo.find({
        relations: ['sucursalOrigen', 'sucursalDestino', 'detalles', 'detalles.producto'],
        order: { id: 'DESC' },
      });
    }

    if (!user.sucursalId) {
      throw new BadRequestException('El usuario no tiene una sucursal asignada');
    }

    return this.transferenciaRepo.find({
      where: [
        { sucursalOrigen: { id: user.sucursalId } },
        { sucursalDestino: { id: user.sucursalId } },
      ],
      relations: ['sucursalOrigen', 'sucursalDestino', 'detalles', 'detalles.producto'],
      order: { id: 'DESC' },
    });
  }

  async findOne(id: number, user: any): Promise<Transferencia> {
    const transf = await this.transferenciaRepo.findOne({
      where: { id },
      relations: ['sucursalOrigen', 'sucursalDestino', 'detalles', 'detalles.producto'],
    });
    if (!transf) throw new NotFoundException(`Transferencia con id ${id} no encontrada`);

    if (!this.isGlobalRole(user)) {
      if (
        !user.sucursalId ||
        (transf.sucursalOrigen.id !== user.sucursalId &&
          transf.sucursalDestino.id !== user.sucursalId)
      ) {
        throw new ForbiddenException('No tiene acceso a esta transferencia');
      }
    }

    return transf;
  }

  // ✅ ACEPTAR
  async aceptar(id: number, user: any): Promise<Transferencia> {
    if (!this.isGlobalRole(user) && !user.sucursalId) {
      throw new BadRequestException('El usuario no tiene una sucursal asignada');
    }

    return this.dataSource.transaction(async (manager) => {
      const repoTransf = manager.getRepository(Transferencia);
      const repoProdSuc = manager.getRepository(ProductoSucursal);
      const repoKardex = manager.getRepository(KardexMovimiento);

      const locked = await repoTransf
        .createQueryBuilder('t')
        .setLock('pessimistic_write')
        .where('t.id = :id', { id })
        .getOne();

      if (!locked) throw new NotFoundException(`Transferencia ${id} no encontrada`);

      const transf = await repoTransf.findOne({
        where: { id },
        relations: ['sucursalOrigen', 'sucursalDestino', 'detalles', 'detalles.producto'],
      });

      if (!transf) throw new NotFoundException(`Transferencia ${id} no encontrada`);

      if (transf.estado !== 'PENDIENTE') {
        throw new BadRequestException('Solo se puede aceptar una transferencia PENDIENTE');
      }

      // Permiso: solo destino (o global)
      if (!this.isGlobalRole(user)) {
        if (transf.sucursalDestino.id !== user.sucursalId) {
          throw new ForbiddenException('Solo la sucursal destino puede aceptar esta transferencia');
        }
      }

      const sucDestino = transf.sucursalDestino;

      for (const det of transf.detalles) {
        const producto = det.producto;

        let prodSucDestino = await repoProdSuc
          .createQueryBuilder('ps')
          .setLock('pessimistic_write')
          .leftJoinAndSelect('ps.producto', 'producto')
          .leftJoinAndSelect('ps.sucursal', 'sucursal')
          .where('producto.id = :productoId', { productoId: producto.id })
          .andWhere('sucursal.id = :sucursalId', { sucursalId: sucDestino.id })
          .getOne();

        if (!prodSucDestino) {
          prodSucDestino = repoProdSuc.create({
            producto,
            sucursal: sucDestino,
            stock: 0,
            stockMinimo: 0,
            activo: true,
          });
        }

        const stockAntes = Number(prodSucDestino.stock);
        const stockDespues = stockAntes + Number(det.cantidad);

        prodSucDestino.stock = stockDespues;
        await repoProdSuc.save(prodSucDestino);

        const kardexIn = repoKardex.create({
          producto,
          sucursal: sucDestino,
          tipo: 'TRANSFERENCIA_IN',
          documentoTipo: 'TRANSFERENCIA',
          documentoId: transf.id,
          cantidad: det.cantidad,
          stockAntes,
          stockDespues,
          usuarioId: user.userId ?? null,
        });

        await repoKardex.save(kardexIn);
      }

      transf.estado = 'ACEPTADA';
      transf.aceptadaPor = user.userId ?? null;
      transf.aceptadaAt = new Date();

      await repoTransf.save(transf);

      return repoTransf.findOneOrFail({
        where: { id: transf.id },
        relations: ['sucursalOrigen', 'sucursalDestino', 'detalles', 'detalles.producto'],
      });
    });
  }

  // ✅ RECHAZAR
  async rechazar(id: number, user: any, motivo?: string): Promise<Transferencia> {
    if (!this.isGlobalRole(user) && !user.sucursalId) {
      throw new BadRequestException('El usuario no tiene una sucursal asignada');
    }

    return this.dataSource.transaction(async (manager) => {
      const repoTransf = manager.getRepository(Transferencia);
      const repoProdSuc = manager.getRepository(ProductoSucursal);
      const repoKardex = manager.getRepository(KardexMovimiento);

      const locked = await repoTransf
        .createQueryBuilder('t')
        .setLock('pessimistic_write')
        .where('t.id = :id', { id })
        .getOne();

      if (!locked) throw new NotFoundException(`Transferencia ${id} no encontrada`);

      const transf = await repoTransf.findOne({
        where: { id },
        relations: ['sucursalOrigen', 'sucursalDestino', 'detalles', 'detalles.producto'],
      });

      if (!transf) throw new NotFoundException(`Transferencia ${id} no encontrada`);

      if (transf.estado !== 'PENDIENTE') {
        throw new BadRequestException('Solo se puede rechazar una transferencia PENDIENTE');
      }

      if (!this.isGlobalRole(user)) {
        if (transf.sucursalDestino.id !== user.sucursalId) {
          throw new ForbiddenException('Solo la sucursal destino puede rechazar esta transferencia');
        }
      }

      const sucOrigen = transf.sucursalOrigen;

      for (const det of transf.detalles) {
        const producto = det.producto;

        const prodSucOrigen = await repoProdSuc
          .createQueryBuilder('ps')
          .setLock('pessimistic_write')
          .leftJoinAndSelect('ps.producto', 'producto')
          .leftJoinAndSelect('ps.sucursal', 'sucursal')
          .where('producto.id = :productoId', { productoId: producto.id })
          .andWhere('sucursal.id = :sucursalId', { sucursalId: sucOrigen.id })
          .getOne();

        if (!prodSucOrigen) {
          throw new BadRequestException(`Inventario en origen no existe para ${producto.nombre}`);
        }

        const stockAntes = Number(prodSucOrigen.stock);
        const stockDespues = stockAntes + Number(det.cantidad);

        prodSucOrigen.stock = stockDespues;
        await repoProdSuc.save(prodSucOrigen);

        const kardexRev = repoKardex.create({
          producto,
          sucursal: sucOrigen,
          tipo: 'TRANSFERENCIA_RECHAZO_IN',
          documentoTipo: 'TRANSFERENCIA',
          documentoId: transf.id,
          cantidad: det.cantidad,
          stockAntes,
          stockDespues,
          usuarioId: user.userId ?? null,
        });

        await repoKardex.save(kardexRev);
      }

      transf.estado = 'RECHAZADA';
      transf.rechazadaPor = user.userId ?? null;
      transf.rechazadaAt = new Date();
      transf.rechazoMotivo = (motivo ?? '').trim() || null;

      await repoTransf.save(transf);

      return repoTransf.findOneOrFail({
        where: { id: transf.id },
        relations: ['sucursalOrigen', 'sucursalDestino', 'detalles', 'detalles.producto'],
      });
    });
  }

  async update(id: number, dto: UpdateTransferenciaDto): Promise<Transferencia> {
    const transf = await this.findOne(id, { rol: 'SUPER_ADMIN', sucursalId: null });

    if (dto.fecha) transf.fecha = new Date(dto.fecha);
    if (dto.sucursalOrigenId || dto.sucursalDestinoId) {
      throw new BadRequestException('No se permite cambiar sucursales en una transferencia ya creada');
    }

    return this.transferenciaRepo.save(transf);
  }
}