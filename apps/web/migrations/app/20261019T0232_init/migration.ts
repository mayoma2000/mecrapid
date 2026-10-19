#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/70ad624252db9ad12d1f3ea163e5139fb81208fcad5ea6153dc4034285b87c85/contract';
import endContract from '../../snapshots/70ad624252db9ad12d1f3ea163e5139fb81208fcad5ea6153dc4034285b87c85/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
  sql,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'Appointment',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('customerId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('duration', 'int4', {
            notNull: true,
            default: lit(60),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('scheduledAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('serviceType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('scheduled'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('vehicleId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'Appointment_status_check_da016018',
            sql`"status" IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'Customer',
        columns: [
          col('address', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('email', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('phone', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'PartLineItem',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('quantity', 'int4', {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('sparePartId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('totalPrice', 'float8', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/float8@1' },
          }),
          col('unitPrice', 'float8', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/float8@1' },
          }),
          col('workOrderId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'ServiceLineItem',
        columns: [
          col('cost', 'float8', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/float8@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('description', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('workOrderId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'SparePart',
        columns: [
          col('category', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('location', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('minimumStock', 'int4', {
            notNull: true,
            default: lit(5),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('partNumber', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('purchasePrice', 'float8', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/float8@1' },
          }),
          col('quantity', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('sellingPrice', 'float8', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/float8@1' },
          }),
          col('supplier', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'User',
        columns: [
          col('clerkId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('phone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('role', 'text', {
            notNull: true,
            default: lit('receptionist'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'User_role_check_06cea4f0',
            sql`"role" IN ('admin', 'mechanic', 'receptionist')`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'Vehicle',
        columns: [
          col('color', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('customerId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('licensePlate', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('make', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('mileage', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('model', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('vin', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('year', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'WorkOrder',
        columns: [
          col('actualCost', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('complaint', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('completedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('customerId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('diagnosis', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('estimatedCost', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('mechanicId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('pending'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('vehicleId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'WorkOrder_status_check_18c95b97',
            sql`"status" IN ('pending', 'assigned', 'in_progress', 'quality_check', 'completed', 'cancelled')`,
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'SparePart',
        constraint: 'SparePart_partNumber_key',
        columns: ['partNumber'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'User',
        constraint: 'User_clerkId_key',
        columns: ['clerkId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'User',
        constraint: 'User_email_key',
        columns: ['email'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Vehicle',
        constraint: 'Vehicle_licensePlate_key',
        columns: ['licensePlate'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Appointment',
        index: 'Appointment_customerId_idx_b2a8a46c',
        columns: ['customerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Appointment',
        index: 'Appointment_vehicleId_idx_e2df58fc',
        columns: ['vehicleId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PartLineItem',
        index: 'PartLineItem_sparePartId_idx_5330e868',
        columns: ['sparePartId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PartLineItem',
        index: 'PartLineItem_workOrderId_idx_136dd311',
        columns: ['workOrderId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ServiceLineItem',
        index: 'ServiceLineItem_workOrderId_idx_136dd311',
        columns: ['workOrderId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Vehicle',
        index: 'Vehicle_customerId_idx_b2a8a46c',
        columns: ['customerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'WorkOrder',
        index: 'WorkOrder_customerId_idx_b2a8a46c',
        columns: ['customerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'WorkOrder',
        index: 'WorkOrder_mechanicId_idx_30292d1f',
        columns: ['mechanicId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'WorkOrder',
        index: 'WorkOrder_vehicleId_idx_e2df58fc',
        columns: ['vehicleId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Appointment',
        foreignKey: {
          name: 'Appointment_customerId_fkey',
          columns: ['customerId'],
          references: { schema: 'public', table: 'Customer', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Appointment',
        foreignKey: {
          name: 'Appointment_vehicleId_fkey',
          columns: ['vehicleId'],
          references: { schema: 'public', table: 'Vehicle', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PartLineItem',
        foreignKey: {
          name: 'PartLineItem_workOrderId_fkey',
          columns: ['workOrderId'],
          references: { schema: 'public', table: 'WorkOrder', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PartLineItem',
        foreignKey: {
          name: 'PartLineItem_sparePartId_fkey',
          columns: ['sparePartId'],
          references: { schema: 'public', table: 'SparePart', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ServiceLineItem',
        foreignKey: {
          name: 'ServiceLineItem_workOrderId_fkey',
          columns: ['workOrderId'],
          references: { schema: 'public', table: 'WorkOrder', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Vehicle',
        foreignKey: {
          name: 'Vehicle_customerId_fkey',
          columns: ['customerId'],
          references: { schema: 'public', table: 'Customer', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'WorkOrder',
        foreignKey: {
          name: 'WorkOrder_customerId_fkey',
          columns: ['customerId'],
          references: { schema: 'public', table: 'Customer', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'WorkOrder',
        foreignKey: {
          name: 'WorkOrder_vehicleId_fkey',
          columns: ['vehicleId'],
          references: { schema: 'public', table: 'Vehicle', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'WorkOrder',
        foreignKey: {
          name: 'WorkOrder_mechanicId_fkey',
          columns: ['mechanicId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
