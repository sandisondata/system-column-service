import { Query } from 'database';
import {
  checkPrimaryKey,
  //checkUniqueKey,
  createRow,
  deleteRow,
  findByPrimaryKey,
  updateRow,
} from 'database-helpers';
import { Debug, MessageType } from 'node-debug';
//import { BadRequestError } from 'node-errors';
import { objectsEqual, pick } from 'node-utilities';
import * as lookupService from 'repository-lookup-service';
import * as tableService from 'repository-table-service';

const debugSource = 'column.service';
const debugRows = 3;

const tableName = '_columns';
const instanceName = 'column';

const primaryKeyColumnNames = ['uuid'];
const dataColumnNames = [
  'table_uuid',
  'column_type',
  'foreign_key_table_uuid',
  'lookup_uuid',
  'name_qualifier',
  'name',
  'data_type',
  'length_or_precision',
  'scale',
  'is_not_null',
  'initial_value',
];
const systemColumnNames = ['position_number', 'position_in_unique_key'];
const columnNames = [
  ...primaryKeyColumnNames,
  ...dataColumnNames,
  ...systemColumnNames,
];

export enum ColumnType {
  BASE = 'base',
  FOREIGN_KEY = 'foreign-key',
  LOOKUP = 'lookup',
  URL = 'url',
}

export enum DataType {
  VARCHAR = 'varchar',
  TEXT = 'text',
  SMALLINT = 'smallint',
  INTEGER = 'integer',
  BIGINT = 'bigint',
  DECIMAL = 'decimal',
  DATE = 'date',
  TIME = 'time',
  TIMESTAMP = 'timestamp',
  TIMESTAMPTZ = 'timestamptz',
  BOOLEAN = 'boolean',
}

export type PrimaryKey = {
  uuid: string;
};

export type Data<
  Populate extends boolean | ColumnType.FOREIGN_KEY | ColumnType.LOOKUP = false,
> = (Populate extends false
  ? { table_uuid: string }
  : { table: tableService.Row }) & {
  column_type: string;
} & (Populate extends ColumnType.FOREIGN_KEY
    ? { foreign_key_table: tableService.Row }
    : { foreign_key_table_uuid?: string | null }) &
  (Populate extends ColumnType.LOOKUP
    ? { lookup: lookupService.Row }
    : { lookup_uuid?: string | null }) & {
    name_qualifier?: string | null;
    name: string;
    data_type: string;
    length_or_precision?: number | null;
    scale?: number | null;
    is_not_null?: boolean;
    initial_value?: string | null;
  };

export type System = {
  position_number: number;
  position_in_unique_key: number | null;
};

export type CreateData = Partial<PrimaryKey> & Data;
export type CreatedRow<
  Populate extends true | ColumnType.FOREIGN_KEY | ColumnType.LOOKUP,
> = Row<Populate>;

export type Row<
  Populate extends boolean | ColumnType.FOREIGN_KEY | ColumnType.LOOKUP = false,
> = PrimaryKey & Required<Data<Populate>> & System;

export type UpdateData = Partial<Data>;
export type UpdatedRow = Row;

/*
const nativeDataType =
  Object.keys(DataType)[
    Object.values<string>(DataType).indexOf('varchar')
  ].toLowerCase();
*/

export const create = async (
  query: Query,
  createData: CreateData,
): Promise<
  | CreatedRow<true>
  | CreatedRow<ColumnType.FOREIGN_KEY>
  | CreatedRow<ColumnType.LOOKUP>
> => {
  const debug = new Debug(`${debugSource}.create`);
  debug.write(MessageType.Entry, `createData=${JSON.stringify(createData)}`);
  if (typeof createData.uuid !== 'undefined') {
    const primaryKey: PrimaryKey = { uuid: createData.uuid };
    debug.write(MessageType.Value, `primaryKey=${JSON.stringify(primaryKey)}`);
    debug.write(MessageType.Step, 'Checking primary key...');
    await checkPrimaryKey(query, tableName, instanceName, primaryKey);
  }
  debug.write(MessageType.Step, 'Finding table...');
  const table = await tableService.findOne(query, {
    uuid: createData.table_uuid,
  });
  let foreignKeyTable: tableService.Row;
  let lookup: lookupService.Row;
  if (createData.column_type == ColumnType.BASE) {
    null;
  } else if (createData.column_type == ColumnType.FOREIGN_KEY) {
    if (
      typeof createData.foreign_key_table_uuid !== 'undefined' &&
      createData.foreign_key_table_uuid !== null
    ) {
      foreignKeyTable = await tableService.findOne(query, {
        uuid: createData.foreign_key_table_uuid,
      });
    }
  } else if (createData.column_type == ColumnType.LOOKUP) {
    if (
      typeof createData.lookup_uuid !== 'undefined' &&
      createData.lookup_uuid !== null
    ) {
      lookup = await lookupService.findOne(query, {
        uuid: createData.lookup_uuid,
      });
    }
  } else if (createData.column_type == ColumnType.URL) {
    null;
  } else {
    throw new Error('column_type is invalid');
  }
  debug.write(MessageType.Step, 'Creating row...');
  const row = (await createRow(query, tableName, createData)) as Row;
  let createdRow;
  const properties1 = {
    uuid: row.uuid,
    table: table,
    column_type: row.column_type,
  };
  const properties2 = {
    name_qualifier: row.name_qualifier,
    name: row.name,
    data_type: row.data_type,
    length_or_precision: row.length_or_precision,
    scale: row.scale,
    is_not_null: row.is_not_null,
    initial_value: row.initial_value,
    position_number: row.position_number,
    position_in_unique_key: row.position_in_unique_key,
  };
  if (row.column_type == ColumnType.FOREIGN_KEY) {
    const _createdRow: CreatedRow<ColumnType.FOREIGN_KEY> = {
      ...properties1,
      foreign_key_table: foreignKeyTable!,
      lookup_uuid: row.lookup_uuid,
      ...properties2,
    };
    createdRow = _createdRow;
  } else if (row.column_type == ColumnType.LOOKUP) {
    const _createdRow: CreatedRow<ColumnType.LOOKUP> = {
      ...properties1,
      foreign_key_table_uuid: row.foreign_key_table_uuid,
      lookup: lookup!,
      ...properties2,
    };
    createdRow = _createdRow;
  } else {
    const _createdRow: CreatedRow<true> = {
      ...properties1,
      foreign_key_table_uuid: row.foreign_key_table_uuid,
      lookup_uuid: row.lookup_uuid,
      ...properties2,
    };
    createdRow = _createdRow;
  }
  debug.write(MessageType.Exit, `createdRow=${JSON.stringify(createdRow)}`);
  return createdRow;
};

// TODO: query parameters + add actual query to helpers
export const find = async (query: Query) => {
  const debug = new Debug(`${debugSource}.find`);
  debug.write(MessageType.Entry);
  debug.write(MessageType.Step, 'Finding rows...');
  const rows = (await query(`SELECT * FROM ${tableName} ORDER BY uuid`))
    .rows as Row[];
  debug.write(
    MessageType.Exit,
    `rows(${debugRows})=${JSON.stringify(rows.slice(0, debugRows))}`,
  );
  return rows;
};

export const findOne = async (
  query: Query,
  primaryKey: Required<PrimaryKey>,
) => {
  const debug = new Debug(`${debugSource}.findOne`);
  debug.write(MessageType.Entry, `primaryKey=${JSON.stringify(primaryKey)}`);
  debug.write(MessageType.Step, 'Finding row by primary key...');
  const row = (await findByPrimaryKey(
    query,
    tableName,
    instanceName,
    primaryKey,
    { columnNames: columnNames },
  )) as Row;
  debug.write(MessageType.Exit, `row=${JSON.stringify(row)}`);
  return row;
};

export const update = async (
  query: Query,
  primaryKey: PrimaryKey,
  updateData: UpdateData,
): Promise<UpdatedRow> => {
  const debug = new Debug(`${debugSource}.update`);
  debug.write(
    MessageType.Entry,
    `primaryKey=${JSON.stringify(primaryKey)};` +
      `updateData=${JSON.stringify(updateData)}`,
  );
  debug.write(MessageType.Step, 'Finding row by primary key...');
  const row = (await findByPrimaryKey(
    query,
    tableName,
    instanceName,
    primaryKey,
    { columnNames: columnNames, forUpdate: true },
  )) as Row;
  debug.write(MessageType.Value, `row=${JSON.stringify(row)}`);
  const mergedRow: Row = Object.assign({}, row, updateData);
  debug.write(MessageType.Value, `mergedRow=${JSON.stringify(mergedRow)}`);
  let updatedRow: Row = Object.assign({}, mergedRow);
  if (
    !objectsEqual(pick(mergedRow, dataColumnNames), pick(row, dataColumnNames))
  ) {
    debug.write(MessageType.Step, 'Updating row...');
    updatedRow = (await updateRow(
      query,
      tableName,
      primaryKey,
      updateData,
      columnNames,
    )) as Row;
  }
  debug.write(MessageType.Exit, `updatedRow=${JSON.stringify(updatedRow)}`);
  return updatedRow;
};

export const delete_ = async (query: Query, primaryKey: PrimaryKey) => {
  const debug = new Debug(`${debugSource}.delete`);
  debug.write(MessageType.Entry, `primaryKey=${JSON.stringify(primaryKey)}`);
  debug.write(MessageType.Step, 'Finding row by primary key...');
  const row = (await findByPrimaryKey(
    query,
    tableName,
    instanceName,
    primaryKey,
    { forUpdate: true },
  )) as Row;
  debug.write(MessageType.Value, `row=${JSON.stringify(row)}`);
  debug.write(MessageType.Step, 'Deleting row...');
  await deleteRow(query, tableName, primaryKey);
  debug.write(MessageType.Exit);
};
