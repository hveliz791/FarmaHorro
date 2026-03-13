import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type UserRole =
  | 'SYSTEM_OWNER' 
  | 'SUPER_ADMIN' 
  | 'ADMIN'
  | 'VENTAS'
  | 'COMPRAS'
  | 'BODEGA'
  | 'GERENCIA';

@Entity('usuarios')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150 })
  nombre: string;

  @Column({ length: 150, unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ type: 'varchar', length: 20 })
  rol: UserRole;

  /**
   * 👇 NUEVO:
   * - Para usuarios de sucursal (VENTAS, BODEGA, ADMIN de sucursal, etc.) debe tener sucursalId
   * - Para SUPER_ADMIN puede ser null, porque ve todas
   */
  @Column({ name: 'sucursal_id', type: 'int', nullable: true })
  sucursalId: number | null;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
