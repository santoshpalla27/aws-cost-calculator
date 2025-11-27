import { DataTypes, Model } from 'sequelize';

export interface ReportAttributes {
  id: string;
  name: string;
  description: string;
  data: any;
  totalMonthlyCost: number;
  createdAt: Date;
  updatedAt: Date;
}

export class Report extends Model implements ReportAttributes {
  public id!: string;
  public name!: string;
  public description!: string;
  public data!: any;
  public totalMonthlyCost!: number;
  public createdAt!: Date;
  public updatedAt!: Date;
}