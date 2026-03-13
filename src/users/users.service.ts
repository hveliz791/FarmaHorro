// src/users/users.service.ts
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserRole } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  private sanitize(user: User) {
    const { passwordHash, ...safe } = user as any;
    return safe;
  }

  private canAdminTouchTarget(actor: any, target: User) {
    // ADMIN solo puede tocar usuarios de su sucursal, y que NO sean ADMIN/SUPER_ADMIN/SYSTEM_OWNER
    if (!actor?.sucursalId) return false;
    if (target.rol === 'ADMIN' || target.rol === 'SUPER_ADMIN' || target.rol === 'SYSTEM_OWNER') return false;
    if (target.sucursalId !== actor.sucursalId) return false;
    return true;
  }

  /**
   * ✅ Solo roles que se deben mostrar en el frontend (selector).
   * Nunca expone SYSTEM_OWNER.
   */
  getAssignableRoles(actor: any): UserRole[] {
    const actorRole: UserRole = actor?.rol;

    if (actorRole === 'SYSTEM_OWNER') {
      // Solo tú (oculto) puedes ver/asignar todo
      return ['SYSTEM_OWNER', 'SUPER_ADMIN', 'ADMIN', 'GERENCIA'];
    }

    if (actorRole === 'SUPER_ADMIN') {
      // Cliente multi-sucursal, pero NO puede asignar el rol oculto
      return ['ADMIN', 'GERENCIA'];
    }

    if (actorRole === 'ADMIN') {
      return ['GERENCIA'];
    }

    return [];
  }

  async create(dto: CreateUserDto, actor: any): Promise<any> {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new BadRequestException('El usuario ya existe');

    const actorRole: UserRole = actor?.rol;

    // ✅ Bloqueo del rol oculto:
    if (dto.rol === 'SYSTEM_OWNER' && actorRole !== 'SYSTEM_OWNER') {
      throw new ForbiddenException('No puedes asignar ese rol');
    }

    if (actorRole === 'ADMIN') {
      if (dto.rol === 'ADMIN' || dto.rol === 'SUPER_ADMIN' || dto.rol === 'SYSTEM_OWNER') {
        throw new ForbiddenException('Un ADMIN no puede crear usuarios ADMIN, SUPER_ADMIN o SYSTEM_OWNER');
      }
      if (!actor.sucursalId) throw new BadRequestException('El ADMIN no tiene sucursal asignada');
      dto.sucursalId = actor.sucursalId; // fuerza sucursal
    }

    if (actorRole === 'SUPER_ADMIN') {
      // SUPER_ADMIN NO puede crear SYSTEM_OWNER (ya bloqueado arriba)
      // ADMIN requiere sucursal
      if (dto.rol === 'ADMIN' && !dto.sucursalId) {
        throw new BadRequestException('Debe indicar sucursalId para crear un ADMIN');
      }
      // Para roles operativos exigimos sucursal (GERENCIA, etc.)
      if (dto.rol !== 'SUPER_ADMIN' && dto.rol !== 'ADMIN') {
        if (!dto.sucursalId) throw new BadRequestException('Debe indicar sucursalId para este rol');
      }
      // SUPER_ADMIN puede tener sucursal null
      if (dto.rol === 'SUPER_ADMIN') dto.sucursalId = dto.sucursalId ?? undefined;
    }

    if (actorRole === 'SYSTEM_OWNER') {
      // Puede crear cualquier rol. Para roles con sucursal, exigir sucursalId.
      if (dto.rol !== 'SUPER_ADMIN' && dto.rol !== 'SYSTEM_OWNER') {
        if (!dto.sucursalId) throw new BadRequestException('Debe indicar sucursalId para este rol');
      }
      if (dto.rol === 'ADMIN' && !dto.sucursalId) {
        throw new BadRequestException('Debe indicar sucursalId para crear un ADMIN');
      }
      if (dto.rol === 'SUPER_ADMIN' || dto.rol === 'SYSTEM_OWNER') {
        dto.sucursalId = dto.sucursalId ?? undefined; // pueden ser null
      }
    }

    if (actorRole !== 'ADMIN' && actorRole !== 'SUPER_ADMIN' && actorRole !== 'SYSTEM_OWNER') {
      throw new ForbiddenException('No tienes permiso para crear usuarios');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = this.userRepo.create({
      nombre: dto.nombre.trim(),
      email: dto.email.trim(),
      passwordHash,
      rol: dto.rol,
      sucursalId: dto.sucursalId ?? null,
      activo: dto.activo ?? true,
    });

    const saved = await this.userRepo.save(user);
    return this.sanitize(saved);
  }

  async findAll(actor: any): Promise<any[]> {
    const actorRole: UserRole = actor?.rol;

    // SYSTEM_OWNER y SUPER_ADMIN ven todos
    if (actorRole === 'SYSTEM_OWNER' || actorRole === 'SUPER_ADMIN') {
      const users = await this.userRepo.find({ order: { id: 'ASC' } });
      return users.map((u) => this.sanitize(u));
    }

    // ADMIN y GERENCIA ven solo su sucursal
    if ((actorRole === 'ADMIN' || actorRole === 'GERENCIA') && actor?.sucursalId) {
      const users = await this.userRepo.find({
        where: { sucursalId: actor.sucursalId },
        order: { id: 'ASC' },
      });
      return users.map((u) => this.sanitize(u));
    }

    throw new ForbiddenException('No tienes permiso para ver usuarios');
  }

  async findOne(id: number, actor: any): Promise<any> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`Usuario con id ${id} no encontrado`);

    const actorRole: UserRole = actor?.rol;

    if (actorRole === 'SYSTEM_OWNER' || actorRole === 'SUPER_ADMIN') return this.sanitize(user);

    if ((actorRole === 'ADMIN' || actorRole === 'GERENCIA') && actor?.sucursalId) {
      if (user.sucursalId !== actor.sucursalId) {
        throw new ForbiddenException('No puedes ver usuarios de otra sucursal');
      }
      return this.sanitize(user);
    }

    throw new ForbiddenException('No tienes permiso para ver este usuario');
  }

  async update(id: number, dto: UpdateUserDto, actor: any): Promise<any> {
    const target = await this.userRepo.findOne({ where: { id } });
    if (!target) throw new NotFoundException('Usuario no encontrado');

    const actorRole: UserRole = actor?.rol;

    // ✅ Bloqueo del rol oculto (nadie excepto SYSTEM_OWNER puede asignarlo)
    if ((dto as any).rol === 'SYSTEM_OWNER' && actorRole !== 'SYSTEM_OWNER') {
      throw new ForbiddenException('No puedes asignar ese rol');
    }

    if (actorRole === 'ADMIN') {
      if (!this.canAdminTouchTarget(actor, target)) {
        throw new ForbiddenException('No tienes permiso para editar este usuario');
      }
      // ADMIN no puede cambiar rol ni sucursal ni email
      if ((dto as any).rol !== undefined) delete (dto as any).rol;
      if ((dto as any).sucursalId !== undefined) delete (dto as any).sucursalId;
      if ((dto as any).email !== undefined) delete (dto as any).email;
    }

    if (actorRole !== 'ADMIN' && actorRole !== 'SUPER_ADMIN' && actorRole !== 'SYSTEM_OWNER') {
      throw new ForbiddenException('No tienes permiso para editar usuarios');
    }

    // ✅ Regla: SUPER_ADMIN no puede editar SYSTEM_OWNER (opcional pero recomendado)
    if (actorRole === 'SUPER_ADMIN' && target.rol === 'SYSTEM_OWNER') {
      throw new ForbiddenException('No puedes editar este usuario');
    }

    // Aplicar cambios permitidos
    if ((dto as any).nombre !== undefined) target.nombre = (dto as any).nombre;
    if ((dto as any).email !== undefined) target.email = (dto as any).email;

    if ((dto as any).rol !== undefined) target.rol = (dto as any).rol;

    if ((dto as any).sucursalId !== undefined) {
      // SYSTEM_OWNER / SUPER_ADMIN pueden tener sucursal null
      if (target.rol === 'SUPER_ADMIN' || target.rol === 'SYSTEM_OWNER') {
        target.sucursalId = null;
      } else {
        target.sucursalId = ((dto as any).sucursalId ?? null);
      }
    }

    if ((dto as any).activo !== undefined) target.activo = (dto as any).activo;

    if ((dto as any).password) {
      target.passwordHash = await bcrypt.hash((dto as any).password, 10);
    }

    const saved = await this.userRepo.save(target);
    return this.sanitize(saved);
  }

  async remove(id: number, actor: any): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const actorRole: UserRole = actor?.rol;

    // ✅ Nadie desactiva SYSTEM_OWNER (recomendado)
    if (user.rol === 'SYSTEM_OWNER') {
      throw new ForbiddenException('No se puede desactivar este usuario');
    }

    // ADMIN restricciones
    if (actorRole === 'ADMIN') {
      if ((user.rol as string) === 'ADMIN' || (user.rol as string) === 'SUPER_ADMIN' || (user.rol as string) === 'SYSTEM_OWNER') {
        throw new ForbiddenException('No puedes desactivar usuarios ADMIN, SUPER_ADMIN o SYSTEM_OWNER');
      }
      if (!actor.sucursalId || user.sucursalId !== actor.sucursalId) {
        throw new ForbiddenException('No puedes desactivar usuarios de otra sucursal');
      }
    }

    // SUPER_ADMIN no puede desactivar SYSTEM_OWNER (ya bloqueado arriba)
    user.activo = false;
    await this.userRepo.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }
}