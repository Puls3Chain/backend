import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { Tip } from './tip.entity';

export enum AuthMethod {
  EMAIL = 'email',
  STELLAR = 'stellar',
}

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  username!: string;

  @Column({ nullable: true })
  displayName!: string;

  @Column('text', { nullable: true })
  bio!: string;

  @Column({ nullable: true })
  avatarUrl!: string;

  @Column({ type: 'simple-json', nullable: true })
  socialLinks: {
    twitter?: string;
    github?: string;
    youtube?: string;
    website?: string;
  } | null;

  @Column({ unique: true, nullable: true })
  email!: string;

  @Column({ nullable: true, select: false })
  password!: string;

  @Column({ unique: true, nullable: true })
  walletAddress!: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: AuthMethod.EMAIL,
  })
  authMethod!: AuthMethod;

  @Column({
    type: 'varchar',
    length: 20,
    default: UserRole.USER,
  })
  role!: UserRole;

  @Column({ default: true })
  isActive!: boolean;

  @OneToMany(() => Tip, (tip) => tip.creator)
  receivedTips!: Tip[];

  @OneToMany(() => Tip, (tip) => tip.supporter)
  sentTips!: Tip[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @BeforeInsert()
  @BeforeUpdate()
  validateAuthMethod(): void {
    if (this.authMethod === AuthMethod.EMAIL && !this.email) {
      throw new Error('Email is required for email authentication');
    }

    if (this.authMethod === AuthMethod.STELLAR && !this.walletAddress) {
      throw new Error('Wallet address is required for Stellar authentication');
    }
  }
}
