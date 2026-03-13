import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Cliente } from '../clientes/entities/cliente.entity'; // ✅ IMPORTANTE
import { KardexMovimiento } from '../kardex/entities/kardex-movimiento.entity';
import { ProductoSucursal } from '../productos-sucursales/entities/producto-sucursal.entity';
import { Producto } from '../productos/entities/producto.entity';
import { Sucursal } from '../sucursales/entities/sucursal.entity';
import { CreateVentaDto } from './dto/create-venta.dto';
import { UpdateVentaDto } from './dto/update-venta.dto';
import { VentaDetalle } from './entities/venta-detalle.entity';
import { Venta } from './entities/venta.entity';

@Injectable()
export class VentasService {
  constructor(
    @InjectRepository(Venta)
    private readonly ventaRepo: Repository<Venta>,
    @InjectRepository(VentaDetalle)
    private readonly ventaDetalleRepo: Repository<VentaDetalle>,
    @InjectRepository(Sucursal)
    private readonly sucursalRepo: Repository<Sucursal>,
    @InjectRepository(Producto)
    private readonly productoRepo: Repository<Producto>,
    @InjectRepository(ProductoSucursal)
    private readonly productoSucursalRepo: Repository<ProductoSucursal>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * La sucursal y el usuario VIENEN DEL TOKEN (controller),
   * no del DTO.
   */
  async create(
    dto: CreateVentaDto,
    sucursalId: number,
    usuarioId: number,
  ): Promise<Venta> {
    if (!dto.detalles || dto.detalles.length === 0) {
      throw new BadRequestException('La venta debe tener al menos un detalle');
    }

    const sucursal = await this.sucursalRepo.findOne({
      where: { id: sucursalId, activo: true },
    });
    if (!sucursal) throw new NotFoundException('Sucursal no encontrada');

    return this.dataSource.transaction(async (manager) => {
      const venta = new Venta();
      venta.sucursal = sucursal;
      venta.fecha = new Date(dto.fecha);
      venta.formaPago = dto.formaPago ?? null;
      venta.usuarioId = usuarioId ?? null;
      venta.anulada = false;
      venta.detalles = [];

      // ✅ Asignar cliente si viene en el DTO
      if (dto.clienteId) {
        const cliente = await manager.getRepository(Cliente).findOne({
          where: { id: dto.clienteId },
        });

        if (!cliente) {
          throw new NotFoundException(
            `Cliente con id ${dto.clienteId} no encontrado`,
          );
        }

        venta.cliente = cliente;
      } else {
        // Venta sin cliente (contado / consumidor final genérico)
        venta.cliente = null;
      }

      let total = 0;

      const detallesInfo: {
        producto: Producto;
        cantidad: number;
        precio: number;
        descuento: number;
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

        const prodSuc = await manager.getRepository(ProductoSucursal).findOne({
          where: {
            producto: { id: producto.id },
            sucursal: { id: sucursal.id },
          },
          relations: ['producto', 'sucursal'],
        });

        if (!prodSuc) {
          throw new BadRequestException(
            `El producto ${producto.nombre} no tiene inventario en esta sucursal`,
          );
        }

        const stockActual = Number(prodSuc.stock);
        if (stockActual < detDto.cantidad) {
          throw new BadRequestException(
            `Stock insuficiente para el producto ${producto.nombre}. ` +
              `Stock actual: ${stockActual}, requerido: ${detDto.cantidad}`,
          );
        }

        const detalle = new VentaDetalle();
        detalle.producto = producto;
        detalle.cantidad = detDto.cantidad;
        detalle.precio = detDto.precio;
        detalle.descuento = detDto.descuento ?? 0;
        detalle.venta = venta;

        const subtotal =
          detDto.cantidad * detDto.precio - (detDto.descuento ?? 0);
        total += subtotal;

        venta.detalles.push(detalle);

        detallesInfo.push({
          producto,
          cantidad: detDto.cantidad,
          precio: detDto.precio,
          descuento: detDto.descuento ?? 0,
        });
      }

      venta.total = total;

      const ventaGuardada = await manager.getRepository(Venta).save(venta);

      // Actualizar inventario + kardex (SALIDA_VENTA)
      for (const det of detallesInfo) {
        const prodSuc = await manager.getRepository(ProductoSucursal).findOne({
          where: {
            producto: { id: det.producto.id },
            sucursal: { id: sucursal.id },
          },
          relations: ['producto', 'sucursal'],
        });

        if (!prodSuc) {
          throw new BadRequestException(
            `El producto ${det.producto.nombre} no tiene inventario en esta sucursal`,
          );
        }

        const stockAntes = Number(prodSuc.stock);
        if (stockAntes < det.cantidad) {
          throw new BadRequestException(
            `Stock insuficiente para el producto ${det.producto.nombre}.`,
          );
        }

        const stockDespues = stockAntes - det.cantidad;
        prodSuc.stock = stockDespues;
        await manager.getRepository(ProductoSucursal).save(prodSuc);

        const kardex = manager.getRepository(KardexMovimiento).create({
          producto: det.producto,
          sucursal,
          tipo: 'SALIDA_VENTA',
          documentoTipo: 'VENTA',
          documentoId: ventaGuardada.id,
          cantidad: det.cantidad,
          stockAntes,
          stockDespues,
          usuarioId: usuarioId ?? null,
        });

        await manager.getRepository(KardexMovimiento).save(kardex);
      }

      const ventaCompleta = await manager.getRepository(Venta).findOne({
        where: { id: ventaGuardada.id },
        relations: ['sucursal', 'cliente', 'detalles', 'detalles.producto'], // ✅ cliente incluido
      });

      if (!ventaCompleta) {
        throw new Error('Error al recuperar la venta guardada');
      }

      return ventaCompleta;
    });
  }

  async findAll(): Promise<Venta[]> {
    return this.ventaRepo.find({
      relations: ['sucursal', 'cliente', 'detalles', 'detalles.producto'], // ✅ cliente incluido
      order: { id: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Venta> {
    const venta = await this.ventaRepo.findOne({
      where: { id },
      relations: ['sucursal', 'cliente', 'detalles', 'detalles.producto'], // ✅ cliente incluido
    });
    if (!venta) {
      throw new NotFoundException(`Venta con id ${id} no encontrada`);
    }
    return venta;
  }

  async update(id: number, dto: UpdateVentaDto): Promise<Venta> {
    const venta = await this.findOne(id);
    if (dto.fecha) venta.fecha = new Date(dto.fecha);
    if (dto.clienteNombre !== undefined) {
      // por si más adelante agregas clienteNombre directo
      (venta as any).clienteNombre = dto.clienteNombre;
    }
    if (dto.formaPago !== undefined) venta.formaPago = dto.formaPago;
    return this.ventaRepo.save(venta);
  }

  /**
   * Anular venta:
   * - Verifica sucursal según rol.
   * - Revierte stock en productos_sucursales.
   * - Inserta movimiento de kardex ANULACION_VENTA.
   */
  async anular(id: number, user: any): Promise<Venta> {
    return this.dataSource.transaction(async (manager) => {
      const venta = await manager.getRepository(Venta).findOne({
        where: { id },
        relations: ['sucursal', 'cliente', 'detalles', 'detalles.producto'], // ✅ cliente también aquí
      });
      if (!venta) {
        throw new NotFoundException(`Venta con id ${id} no encontrada`);
      }

      if (venta.anulada) {
        throw new BadRequestException('La venta ya está anulada');
      }

      // 🔐 Validar que solo SUPER_ADMIN puede anular otras sucursales
      if (user.rol !== 'SUPER_ADMIN') {
        if (!user.sucursalId || user.sucursalId !== venta.sucursal.id) {
          throw new ForbiddenException(
            'No tienes permiso para anular ventas de otra sucursal',
          );
        }
      }

      // Revertir inventario y generar kardex inverso
      for (const det of venta.detalles) {
        let prodSuc = await manager.getRepository(ProductoSucursal).findOne({
          where: {
            producto: { id: det.producto.id },
            sucursal: { id: venta.sucursal.id },
          },
          relations: ['producto', 'sucursal'],
        });

        // Si por alguna razón no existe registro de producto_sucursal, lo creamos
        if (!prodSuc) {
          prodSuc = manager.getRepository(ProductoSucursal).create({
            producto: det.producto,
            sucursal: venta.sucursal,
            stock: 0,
            stockMinimo: 0,
            activo: true,
          });
        }

        const stockAntes = Number(prodSuc.stock);
        const cantidad = Number(det.cantidad);
        const stockDespues = stockAntes + cantidad;

        prodSuc.stock = stockDespues;
        await manager.getRepository(ProductoSucursal).save(prodSuc);

        const kardexAnulacion =
          manager.getRepository(KardexMovimiento).create({
            producto: det.producto,
            sucursal: venta.sucursal,
            tipo: 'ANULACION_VENTA', // 👈 nuevo tipo lógico
            documentoTipo: 'VENTA',
            documentoId: venta.id,
            cantidad,
            stockAntes,
            stockDespues,
            usuarioId: user.userId ?? null,
          });

        await manager.getRepository(KardexMovimiento).save(kardexAnulacion);
      }

      venta.anulada = true;
      const ventaAnulada = await manager.getRepository(Venta).save(venta);

      return ventaAnulada;
    });
  }



//funciones de los reportes 

 async totalDiario(user: any, sucursalId?: number) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const qb = this.ventaRepo.createQueryBuilder('v')
      .select('COALESCE(SUM(v.total), 0)', 'total')
      .where('v.anulada = false')
      .andWhere('v.fecha >= :hoy', { hoy });

    this.aplicarSucursal(qb, user, sucursalId);

    return qb.getRawOne();
  }

  // =========================
  // 📊 TOTAL MENSUAL
  // =========================
  async totalMensual(user: any, sucursalId?: number) {
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const qb = this.ventaRepo.createQueryBuilder('v')
      .select('COALESCE(SUM(v.total), 0)', 'total')
      .where('v.anulada = false')
      .andWhere('v.fecha >= :inicioMes', { inicioMes });

    this.aplicarSucursal(qb, user, sucursalId);

    return qb.getRawOne();
  }

  // =========================
  // 👤 VENTAS POR USUARIO
  // =========================
  async ventasPorUsuario(user: any, sucursalId?: number) {
    const qb = this.ventaRepo.createQueryBuilder('v')
      .select('v.usuarioId', 'usuarioId')
      .addSelect('SUM(v.total)', 'total')
      .where('v.anulada = false')
      .groupBy('v.usuarioId');

    this.aplicarSucursal(qb, user, sucursalId);

    return qb.getRawMany();
  }

 
  // =========================
// 🔐 FILTRO DE SUCURSAL (FIX SEGURO)
// =========================
// =========================
// 🔐 FILTRO DE SUCURSAL (FIX SEGURO)
// =========================
private aplicarSucursal(qb: any, user: any, sucursalId?: number) {
  const rol = user?.rol ?? user?.role ?? user?.tipoRol;

  // ✅ Treat SYSTEM_OWNER igual que SUPER_ADMIN
  const isGlobalAdmin = rol === 'SUPER_ADMIN' || rol === 'SYSTEM_OWNER';

  if (isGlobalAdmin) {
    // Si te mandan sucursalId en query => filtra, si no => todas
    if (sucursalId) {
      qb.andWhere('v.sucursal = :sucursalId', { sucursalId: Number(sucursalId) });
    }
    return;
  }

  // no es global admin => debe tener sucursalId en token
  const sid = user?.sucursalId ?? user?.sucursal_id ?? user?.sucursal?.id;

  if (!sid) {
    throw new ForbiddenException('Usuario sin sucursal asignada');
  }

  qb.andWhere('v.sucursal = :sucursalId', { sucursalId: Number(sid) });
}



  // =========================
// 📅 DASHBOARD POR FECHA (NUEVO - NO TOCA LO EXISTENTE)
// =========================
private getRangoDia(fecha: string) {
  // fecha viene "YYYY-MM-DD"
  const inicio = new Date(`${fecha}T00:00:00.000Z`);
  const fin = new Date(`${fecha}T23:59:59.999Z`);
  return { inicio, fin };
}

private getRangoMesDesdeFecha(fecha: string) {
  const [y, m] = fecha.split('-').map(Number);
  const inicio = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
  const fin = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
  return { inicio, fin };
}

// ✅ Total diario según fecha (NO usa "hoy")
async totalDiarioPorFecha(user: any, fecha: string, sucursalId?: number) {
  const { inicio, fin } = this.getRangoDia(fecha);

  const qb = this.ventaRepo
    .createQueryBuilder('v')
    .select('COALESCE(SUM(v.total), 0)', 'total')
    .where('v.anulada = false')
    .andWhere('v.fecha BETWEEN :inicio AND :fin', { inicio, fin });

  this.aplicarSucursal(qb, user, sucursalId);

  return qb.getRawOne(); // { total: "123.45" }
}

// ✅ Total mensual según fecha (NO usa "mes actual" automático)
async totalMensualPorFecha(user: any, fecha: string, sucursalId?: number) {
  const { inicio, fin } = this.getRangoMesDesdeFecha(fecha);

  const qb = this.ventaRepo
    .createQueryBuilder('v')
    .select('COALESCE(SUM(v.total), 0)', 'total')
    .where('v.anulada = false')
    .andWhere('v.fecha BETWEEN :inicio AND :fin', { inicio, fin });

  this.aplicarSucursal(qb, user, sucursalId);

  return qb.getRawOne(); // { total: "123.45" }
}

// ✅ Ventas por usuario, según rango (DÍA o MES)
async ventasPorUsuarioEnRango(
  user: any,
  inicio: Date,
  fin: Date,
  sucursalId?: number,
) {
  const qb = this.ventaRepo
    .createQueryBuilder('v')
    .select('v.usuarioId', 'usuarioId')
    .addSelect('SUM(v.total)', 'total')
    .where('v.anulada = false')
    .andWhere('v.fecha BETWEEN :inicio AND :fin', { inicio, fin })
    .groupBy('v.usuarioId');

  this.aplicarSucursal(qb, user, sucursalId);

  return qb.getRawMany(); // [{ usuarioId: 1, total: "999.99" }]
}

// ✅ Conteo de ventas del mes (para KPI "total ventas")
async conteoVentasMesPorFecha(user: any, fecha: string, sucursalId?: number) {
  const { inicio, fin } = this.getRangoMesDesdeFecha(fecha);

  const qb = this.ventaRepo
    .createQueryBuilder('v')
    .select('COUNT(*)', 'totalVentasMes')
    .where('v.anulada = false')
    .andWhere('v.fecha BETWEEN :inicio AND :fin', { inicio, fin });

  this.aplicarSucursal(qb, user, sucursalId);

  return qb.getRawOne(); // { totalVentasMes: "10" }
}

// ✅ Endpoint “todo en uno” para el dashboard
async dashboardGlobal(user: any, fecha: string, sucursalId?: number) {
  const totalDia = await this.totalDiarioPorFecha(user, fecha, sucursalId);
  const totalMes = await this.totalMensualPorFecha(user, fecha, sucursalId);

  const { inicio: inicioDia, fin: finDia } = this.getRangoDia(fecha);
  const { inicio: inicioMes, fin: finMes } = this.getRangoMesDesdeFecha(fecha);

  const ventasUsuarioDia = await this.ventasPorUsuarioEnRango(
    user,
    inicioDia,
    finDia,
    sucursalId,
  );

  const ventasUsuarioMes = await this.ventasPorUsuarioEnRango(
    user,
    inicioMes,
    finMes,
    sucursalId,
  );

  const conteoMes = await this.conteoVentasMesPorFecha(user, fecha, sucursalId);

  // OJO: aquí no uso nombre real del User para no tocar entidades/joins.
  // En frontend se muestra "Usuario #ID".
  return {
    fecha,
    mes: fecha.slice(0, 7),
    kpis: {
      totalDia: Number(totalDia?.total ?? 0),
      totalMes: Number(totalMes?.total ?? 0),
      totalVentasMes: Number(conteoMes?.totalVentasMes ?? 0),
    },
    ventasPorUsuarioMes: ventasUsuarioMes.map((r: any) => ({
      usuarioId: Number(r.usuarioId),
      nombre: `Usuario #${r.usuarioId}`,
      total: Number(r.total ?? 0),
    })),
    ventasPorUsuarioDia: ventasUsuarioDia.map((r: any) => ({
      usuarioId: Number(r.usuarioId),
      nombre: `Usuario #${r.usuarioId}`,
      total: Number(r.total ?? 0),
    })),
  };
}



}
