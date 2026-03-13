import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Sucursal } from '../../sucursales/entities/sucursal.entity';
import { TransferenciaDetalle } from './transferencia-detalle.entity';

@Entity('transferencias')
export class Transferencia {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Sucursal, { onDelete: 'RESTRICT' })
  sucursalOrigen: Sucursal;

  @ManyToOne(() => Sucursal, { onDelete: 'RESTRICT' })
  sucursalDestino: Sucursal;

  @Column({ type: 'timestamp' })
  fecha: Date;

  @Column({ name: 'usuario_id', type: 'int', nullable: true })
  usuarioId: number | null;

  // PENDIENTE, ACEPTADA, RECHAZADA
  @Column({ length: 20, default: 'PENDIENTE' })
  estado: string;

  @Column({ name: 'aceptada_por', type: 'int', nullable: true })
  aceptadaPor: number | null;

  @Column({ name: 'aceptada_at', type: 'timestamp', nullable: true })
  aceptadaAt: Date | null;

  @Column({ name: 'rechazada_por', type: 'int', nullable: true })
  rechazadaPor: number | null;

  @Column({ name: 'rechazada_at', type: 'timestamp', nullable: true })
  rechazadaAt: Date | null;

  @Column({ name: 'rechazo_motivo', type: 'varchar', length: 255, nullable: true })
  rechazoMotivo: string | null;

  @OneToMany(() => TransferenciaDetalle, (d) => d.transferencia, {
    cascade: true,
  })
  detalles: TransferenciaDetalle[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
