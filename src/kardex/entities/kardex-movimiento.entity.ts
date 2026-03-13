import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Producto } from '../../productos/entities/producto.entity';
import { Sucursal } from '../../sucursales/entities/sucursal.entity';

@Entity('kardex')
export class KardexMovimiento {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Producto, { onDelete: 'RESTRICT' })
  producto: Producto;

  @ManyToOne(() => Sucursal, { onDelete: 'RESTRICT' })
  sucursal: Sucursal;

  // ENTRADA_COMPRA, SALIDA_VENTA, AJUSTE_ENTRADA, AJUSTE_SALIDA, TRANSFERENCIA_OUT, TRANSFERENCIA_IN, etc.
  @Column({ length: 40 })
  tipo: string;

  // COMPRA, VENTA, AJUSTE, TRANSFERENCIA, etc.
  @Column({ name: 'documento_tipo', length: 30 })
  documentoTipo: string;

  @Column({ name: 'documento_id', type: 'int' })
  documentoId: number;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  cantidad: number;

  @Column({ name: 'stock_antes', type: 'numeric', precision: 12, scale: 2 })
  stockAntes: number;

  @Column({ name: 'stock_despues', type: 'numeric', precision: 12, scale: 2 })
  stockDespues: number;

  @Column({ name: 'usuario_id', type: 'int', nullable: true })
  usuarioId: number | null;

  @CreateDateColumn({ name: 'fecha' })
  fecha: Date;
}
