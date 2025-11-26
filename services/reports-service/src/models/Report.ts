import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index
} from 'typeorm';

export enum ReportType {
    TERRAFORM = 'terraform',
    AWS_CALCULATOR = 'aws_calculator'
}

@Entity('cost_reports')
export class Report {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    userId: string;

    @Column({
        type: 'enum',
        enum: ReportType
    })
    type: ReportType;

    @Column()
    name: string;

    @Column({ type: 'jsonb' })
    data: any;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    totalMonthlyCost: number;

    @Column({ type: 'jsonb', nullable: true })
    metadata: any;

    @CreateDateColumn()
    @Index()
    createdAt: Date;
}