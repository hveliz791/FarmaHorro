import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('proveedores')
export class Proveedor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, nullable: true, unique: true })
nit?: string;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  contacto?: string; // 👈 sin "| null", solo string y opcional

  @Column({ type: 'varchar', length: 50, nullable: true })
  telefono?: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  correo?: string;

  @Column({ type: 'text', nullable: true })
  direccion?: string;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
