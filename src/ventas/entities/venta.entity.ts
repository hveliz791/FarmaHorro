import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Cliente } from '../../clientes/entities/cliente.entity';
import { Sucursal } from '../../sucursales/entities/sucursal.entity';
import { User } from '../../users/entities/user.entity';
import { VentaDetalle } from './venta-detalle.entity';

@Entity('ventas')
export class Venta {
  @PrimaryGeneratedColumn()
  id: number;

  // ✅ Relación con sucursal
  @ManyToOne(() => Sucursal, { onDelete: 'RESTRICT', eager: true })
  sucursal: Sucursal;

  // ✅ Relación REAL con usuario
  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'usuario_id' })
  usuario: User | null;

  // 🔒 Se mantiene el ID por compatibilidad
  @Column({ name: 'usuario_id', type: 'int', nullable: true })
  usuarioId: number | null;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  total: number;

  @Column({ type: 'timestamp' })
  fecha: Date;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  formaPago: string | null;

  @Column({ default: false })
  anulada: boolean;

  @OneToMany(() => VentaDetalle, (detalle) => detalle.venta, {
    cascade: true,
  })
  detalles: VentaDetalle[];

  @ManyToOne(() => Cliente, { nullable: true, eager: true })
  cliente: Cliente | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
