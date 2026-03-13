import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Producto } from '../../productos/entities/producto.entity';
import { Transferencia } from './transferencia.entity';

@Entity('transferencias_detalles')
export class TransferenciaDetalle {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Transferencia, (t) => t.detalles, {
    onDelete: 'CASCADE',
  })
  transferencia: Transferencia;

  @ManyToOne(() => Producto, { onDelete: 'RESTRICT' })
  producto: Producto;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  cantidad: number;
}
