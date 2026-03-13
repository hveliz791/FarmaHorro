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
import { Proveedor } from '../proveedores/entities/proveedor.entity';
import { Sucursal } from '../sucursales/entities/sucursal.entity';
import { CreateCompraDto } from './dto/create-compra.dto';
import { UpdateCompraDto } from './dto/update-compra.dto';
import { CompraDetalle } from './entities/compra-detalle.entity';
import { Compra } from './entities/compra.entity';

@Injectable()
export class ComprasService {
  constructor(
    @InjectRepository(Compra)
    private readonly compraRepo: Repository<Compra>,
    @InjectRepository(CompraDetalle)
    private readonly compraDetalleRepo: Repository<CompraDetalle>,
    @InjectRepository(Proveedor)
    private readonly proveedorRepo: Repository<Proveedor>,
    @InjectRepository(Sucursal)
    private readonly sucursalRepo: Repository<Sucursal>,
    @InjectRepository(Producto)
    private readonly productoRepo: Repository<Producto>,
    @InjectRepository(ProductoSucursal)
    private readonly productoSucursalRepo: Repository<ProductoSucursal>,
    private readonly dataSource: DataSource,
  ) {}

  // ✅ helper: roles globales (pueden elegir sucursal)
  private isGlobalRole(user: any) {
    const r = String(user?.rol || '').toUpperCase();
    return r === 'SUPER_ADMIN' || r === 'SYSTEM_OWNER';
  }

  /**
   * Crear compra:
   * - SUPER_ADMIN / SYSTEM_OWNER: debe indicar dto.sucursalId y se respeta
   * - Otros roles: se usa SIEMPRE user.sucursalId, ignorando dto.sucursalId
   */
  async create(dto: CreateCompraDto, user: any): Promise<Compra> {
    if (!dto.detalles || dto.detalles.length === 0) {
      throw new BadRequestException('La compra debe tener al menos un detalle');
    }

    // Determinar sucursal a usar
    let sucursalIdToUse: number;

    if (this.isGlobalRole(user)) {
      if (!dto.sucursalId) {
        throw new BadRequestException(
          'Debe indicar la sucursal en la compra (sucursalId)',
        );
      }
      sucursalIdToUse = dto.sucursalId;
    } else {
      if (!user.sucursalId) {
        throw new BadRequestException('El usuario no tiene una sucursal asignada');
      }
      sucursalIdToUse = user.sucursalId;
    }

    // Proveedor
    const proveedor = await this.proveedorRepo.findOne({
      where: { id: dto.proveedorId, activo: true },
    });
    if (!proveedor) throw new NotFoundException('Proveedor no encontrado');

    // Sucursal
    const sucursal = await this.sucursalRepo.findOne({
      where: { id: sucursalIdToUse, activo: true },
    });
    if (!sucursal) throw new NotFoundException('Sucursal no encontrada');

    return this.dataSource.transaction(async (manager) => {
      const compra = new Compra();
      compra.proveedor = proveedor;
      compra.sucursal = sucursal;
      compra.fecha = new Date(dto.fecha);
      compra.usuarioId = user.userId ?? null;
      compra.anulada = false;
      compra.detalles = [];

      let total = 0;

      const detallesInfo: {
        producto: Producto;
        cantidad: number;
        precio: number;
      }[] = [];

      for (const detDto of dto.detalles) {
        const producto = await manager.getRepository(Producto).findOne({
          where: { id: detDto.productoId, activo: true },
        });
        if (!producto) {
          throw new NotFoundException(
            `Producto con id ${detDto.productoId} no encontrado`,
          );
        }

        const detalle = new CompraDetalle();
        detalle.producto = producto;
        detalle.cantidad = detDto.cantidad;
        detalle.precio = detDto.precio;
        detalle.compra = compra;

        compra.detalles.push(detalle);
        total += detDto.cantidad * detDto.precio;

        detallesInfo.push({
          producto,
          cantidad: detDto.cantidad,
          precio: detDto.precio,
        });
      }

      compra.total = total;

      const compraGuardada = await manager.getRepository(Compra).save(compra);

      // Actualizar inventario y kardex
      for (const det of detallesInfo) {
        let prodSuc = await manager.getRepository(ProductoSucursal).findOne({
          where: {
            producto: { id: det.producto.id },
            sucursal: { id: sucursal.id },
          },
          relations: ['producto', 'sucursal'],
        });

        if (!prodSuc) {
          prodSuc = manager.getRepository(ProductoSucursal).create({
            producto: det.producto,
            sucursal,
            stock: 0,
            stockMinimo: 0,
            activo: true,
          });
        }

        const stockAntes = Number(prodSuc.stock);
        const stockDespues = stockAntes + det.cantidad;

        prodSuc.stock = stockDespues;
        await manager.getRepository(ProductoSucursal).save(prodSuc);

        const kardex = manager.getRepository(KardexMovimiento).create({
          producto: det.producto,
          sucursal,
          tipo: 'ENTRADA_COMPRA',
          documentoTipo: 'COMPRA',
          documentoId: compraGuardada.id,
          cantidad: det.cantidad,
          stockAntes,
          stockDespues,
          usuarioId: user.userId ?? null,
        });

        await manager.getRepository(KardexMovimiento).save(kardex);
      }

      const compraCompleta = await manager.getRepository(Compra).findOne({
        where: { id: compraGuardada.id },
        relations: ['proveedor', 'sucursal', 'detalles', 'detalles.producto'],
      });

      if (!compraCompleta) {
        throw new Error('Error al recuperar la compra guardada');
      }

      return compraCompleta;
    });
  }

  /**
   * Listar compras
   * SUPER_ADMIN / SYSTEM_OWNER → puede filtrar por sucursalId (query). Si no manda, trae todas.
   * Otros roles → solo de su sucursal (token).
   */
  async findAll(user: any, sucursalId?: number): Promise<Compra[]> {
    // ✅ roles globales
    if (this.isGlobalRole(user)) {
      // si mandan sucursalId -> filtra, si no -> todas
      if (sucursalId) {
        return this.compraRepo.find({
          where: { sucursal: { id: sucursalId } },
          relations: ['proveedor', 'sucursal', 'detalles', 'detalles.producto'],
          order: { id: 'DESC' },
        });
      }

      return this.compraRepo.find({
        relations: ['proveedor', 'sucursal', 'detalles', 'detalles.producto'],
        order: { id: 'DESC' },
      });
    }

    // ✅ roles normales: por token
    if (!user.sucursalId) {
      throw new BadRequestException('El usuario no tiene una sucursal asignada');
    }

    // (opcional) si mandan sucursalId distinto -> bloquear
    if (sucursalId && Number(sucursalId) !== Number(user.sucursalId)) {
      throw new ForbiddenException('No puedes consultar compras de otra sucursal');
    }

    return this.compraRepo.find({
      where: { sucursal: { id: user.sucursalId } },
      relations: ['proveedor', 'sucursal', 'detalles', 'detalles.producto'],
      order: { id: 'DESC' },
    });
  }

  /**
   * Ver una compra
   * SUPER_ADMIN / SYSTEM_OWNER → puede ver cualquiera
   * Otros → solo si es de su sucursal
   */
  async findOne(id: number, user: any): Promise<Compra> {
    const compra = await this.compraRepo.findOne({
      where: { id },
      relations: ['proveedor', 'sucursal', 'detalles', 'detalles.producto'],
    });
    if (!compra) {
      throw new NotFoundException(`Compra con id ${id} no encontrada`);
    }

    if (!this.isGlobalRole(user)) {
      if (!user.sucursalId || compra.sucursal.id !== user.sucursalId) {
        throw new ForbiddenException('No tiene acceso a esta compra');
      }
    }

    return compra;
  }

  async update(id: number, dto: UpdateCompraDto): Promise<Compra> {
    const compra = await this.findOne(id, {
      rol: 'SUPER_ADMIN',
      sucursalId: null,
    });
    if (dto.fecha) compra.fecha = new Date(dto.fecha);
    return this.compraRepo.save(compra);
  }

  /**
   * Anular compra
   * SUPER_ADMIN / SYSTEM_OWNER → cualquiera
   * Otros → solo si es de su sucursal
   */
  async anular(id: number, user: any): Promise<Compra> {
    return this.dataSource.transaction(async (manager) => {
      const compra = await manager.getRepository(Compra).findOne({
        where: { id },
        relations: ['sucursal', 'detalles', 'detalles.producto'],
      });

      if (!compra) {
        throw new NotFoundException(`Compra con id ${id} no encontrada`);
      }

      if (compra.anulada) {
        throw new BadRequestException('La compra ya está anulada');
      }

      // 🔐 Validar permiso por sucursal
      if (!this.isGlobalRole(user)) {
        if (!user.sucursalId || compra.sucursal.id !== user.sucursalId) {
          throw new ForbiddenException('No tiene permiso para anular esta compra');
        }
      }

      // ✅ Revertir inventario
      for (const det of compra.detalles) {
        const cantidad = Number(det.cantidad || 0);
        if (cantidad <= 0) continue;

        const prodSuc = await manager.getRepository(ProductoSucursal).findOne({
          where: {
            producto: { id: det.producto.id },
            sucursal: { id: compra.sucursal.id },
          },
          relations: ['producto', 'sucursal'],
        });

        if (!prodSuc) {
          throw new BadRequestException(
            `No existe inventario para el producto ${det.producto.nombre} en esta sucursal. No se puede anular la compra.`,
          );
        }

        const stockAntes = Number(prodSuc.stock);
        const stockDespues = stockAntes - cantidad;

        if (stockDespues < 0) {
          throw new BadRequestException(
            `No se puede anular: el inventario quedaría negativo para ${det.producto.nombre}. ` +
              `Stock actual: ${stockAntes}, a restar: ${cantidad}`,
          );
        }

        prodSuc.stock = stockDespues;
        await manager.getRepository(ProductoSucursal).save(prodSuc);

        const kardexAnulacion = manager.getRepository(KardexMovimiento).create({
          producto: det.producto,
          sucursal: compra.sucursal,
          tipo: 'ANULACION_COMPRA',
          documentoTipo: 'COMPRA',
          documentoId: compra.id,
          cantidad,
          stockAntes,
          stockDespues,
          usuarioId: user.userId ?? null,
        });

        await manager.getRepository(KardexMovimiento).save(kardexAnulacion);
      }

      compra.anulada = true;
      return manager.getRepository(Compra).save(compra);
    });
  }
}