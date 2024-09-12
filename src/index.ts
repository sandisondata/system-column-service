import { Query } from 'database';
import {
  checkPrimaryKey,
  checkUniqueKey,
  createRow,
  deleteRow,
  findByPrimaryKey,
  updateRow,
} from 'database-helpers';
import { Debug, MessageType } from 'node-debug';
import { BadRequestError } from 'node-errors';
import { objectsEqual, pick } from 'node-utilities';
import * as lookupService from 'repository-lookup-service';
import * as tableService from 'repository-table-service';

const debugSource = 'column.service';
const debugRows = 3;

const tableName = '_columns';
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

const checkNameNotReserved = (name: string) => {
  if (
    [
      'id',
      'creation_date',
      'created_by',
      'last_update_date',
      'last_updated_by',
      'file_count',
    ].includes(name)
  ) {
    throw new BadRequestError(`name "${name}" is reserved by the system`);
  }
};

enum ColumnType {
  BASE = 'base',
  FOREIGN_KEY = 'foreign-key',
  LOOKUP = 'lookup',
  URL = 'url',
}

const checkNameMatchesExpected = (
  name: string,
  columnType: string,
  referencingInstanceName: string,
  nameQualifier: string | null,
) => {
  if (
    (<string[]>[ColumnType.FOREIGN_KEY, ColumnType.LOOKUP]).includes(columnType)
  ) {
    const expectedName =
      (nameQualifier !== null ? `${nameQualifier}_` : '') +
        `${referencingInstanceName}_` +
        columnType ==
      ColumnType.FOREIGN_KEY
        ? 'id'
        : 'lookup_code';
    if (name !== expectedName) {
      throw new BadRequestError(`name must be set to "${expectedName}"`);
    }
  }
};

enum DataType {
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

const checkDataType = (
  dataType: string,
  lengthOrPrecision: number | null,
  scale: number | null,
) => {
  if (dataType == DataType.VARCHAR || dataType == DataType.DECIMAL) {
    if (lengthOrPrecision == null) {
      throw new BadRequestError('length_or_precision cannot be null');
    }
    if (dataType == DataType.VARCHAR) {
      if (!(lengthOrPrecision >= 1 && lengthOrPrecision <= 32767)) {
        throw new BadRequestError(
          'length_or_precision must be between 1 and 32767',
        );
      }
    } else {
      if (!(lengthOrPrecision >= 1 && lengthOrPrecision <= 1000)) {
        throw new BadRequestError(
          'length_or_precision must be between 1 and 1000',
        );
      }
      if (scale == null) {
        throw new BadRequestError('scale cannot be null');
      }
      if (!(scale >= 1 && scale <= lengthOrPrecision)) {
        throw new BadRequestError(
          `scale must be between 1 and ${lengthOrPrecision}`,
        );
      }
    }
  } else {
    if (lengthOrPrecision !== null) {
      throw new BadRequestError('length_or_precision must be null');
    }
  }
  if (dataType !== DataType.DECIMAL && scale !== null) {
    throw new BadRequestError('scale must be null');
  }
};

export type PrimaryKey = {
  uuid: string;
};

export type Data = {
  table_uuid: string;
  column_type: string;
  foreign_key_table_uuid?: string | null;
  lookup_uuid?: string | null;
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
export type Row = PrimaryKey & Required<Data> & System;
export type UpdateData = Partial<Data>;

export const create = async (query: Query, createData: CreateData) => {
  const debug = new Debug(`${debugSource}.create`);
  debug.write(MessageType.Entry, `createData=${JSON.stringify(createData)}`);
  if (typeof createData.uuid !== 'undefined') {
    const primaryKey: PrimaryKey = { uuid: createData.uuid };
    debug.write(MessageType.Value, `primaryKey=${JSON.stringify(primaryKey)}`);
    debug.write(MessageType.Step, 'Checking primary key...');
    await checkPrimaryKey(query, tableName, primaryKey);
  }
  debug.write(MessageType.Step, 'Finding table (for update)...');
  await tableService.findOne(
    query,
    {
      uuid: createData.table_uuid,
    },
    true,
  );
  if (!Object.values<string>(DataType).includes(createData.column_type)) {
    throw new BadRequestError('column_type is invalid');
  }
  if (
    createData.column_type !== ColumnType.FOREIGN_KEY &&
    typeof createData.foreign_key_table_uuid !== 'undefined' &&
    createData.foreign_key_table_uuid !== null
  ) {
    throw new BadRequestError(
      'foreign_key_table_uuid is not required or must be set to null',
    );
  }
  if (
    createData.column_type !== ColumnType.LOOKUP &&
    typeof createData.lookup_uuid !== 'undefined' &&
    createData.lookup_uuid !== null
  ) {
    throw new BadRequestError(
      'lookup_uuid is not required or must be set to null',
    );
  }
  let foreignKeyTable: tableService.Row;
  let lookup: lookupService.Row;
  if (createData.column_type == ColumnType.FOREIGN_KEY) {
    if (typeof createData.foreign_key_table_uuid == 'undefined') {
      throw new BadRequestError('foreign_key_table_uuid is required');
    }
    if (createData.foreign_key_table_uuid == null) {
      throw new BadRequestError('foreign_key_table_uuid cannot be null');
    }
    foreignKeyTable = await tableService.findOne(query, {
      uuid: createData.foreign_key_table_uuid,
    });
  } else if (createData.column_type == ColumnType.LOOKUP) {
    if (typeof createData.lookup_uuid == 'undefined') {
      throw new BadRequestError('lookup_uuid is required');
    }
    if (createData.lookup_uuid == null) {
      throw new BadRequestError('lookup_uuid cannot be null');
    }
    lookup = await lookupService.findOne(query, {
      uuid: createData.lookup_uuid,
    });
  }
  debug.write(MessageType.Step, 'Checking name...');
  if (
    !(<string[]>[ColumnType.FOREIGN_KEY, ColumnType.LOOKUP]).includes(
      createData.column_type,
    )
  ) {
    if (
      typeof createData.name_qualifier !== 'undefined' &&
      createData.name_qualifier !== null
    ) {
      throw new BadRequestError(
        'name_qualifier is not required or must be set to null',
      );
    }
    checkNameNotReserved(createData.name);
  } else {
    checkNameMatchesExpected(
      createData.name,
      createData.column_type,
      createData.column_type == ColumnType.FOREIGN_KEY
        ? foreignKeyTable!.singular_name
        : lookup!.lookup_type,
      createData.name_qualifier || null,
    );
  }
  const uniqueKey = {
    table_uuid: createData.table_uuid,
    name: createData.name,
  };
  debug.write(MessageType.Value, `uniqueKey=${JSON.stringify(uniqueKey)}`);
  debug.write(MessageType.Step, 'Checking unique key...');
  await checkUniqueKey(query, tableName, uniqueKey);
  if (!Object.values<string>(DataType).includes(createData.data_type)) {
    throw new BadRequestError('data_type is invalid');
  }
  debug.write(MessageType.Step, 'Checking data type...');
  checkDataType(
    createData.data_type,
    createData.length_or_precision || null,
    createData.scale || null,
  );
  // Check is_not_null & initial_value here against (non-)existing data
  debug.write(MessageType.Step, 'Creating row...');
  const createdRow = (await createRow(query, tableName, createData)) as Row;
  /* TODO: if not null, add column (nullable), update using intial value, set to not null 
const nativeDataType =
  Object.keys(DataType)[
    Object.values<string>(DataType).indexOf('varchar')
  ].toLowerCase();
          await this._transactionalEntityManager.query(
            // Should be using queryRunner.addColumn instead?
            `ALTER TABLE repository_${this._repository.id}.table_${this._table.id} ` +
              `ADD COLUMN column_${this._column.id} ${_nativeDataTypeCode}` +
              (this._column.is_nullable ? '' : ' NOT NULL')
          );
          if (_foreignKeyTable) {
            const _foreignKeyColumn =
              await this._transactionalEntityManager.findOne(Column, {
                table_id: _foreignKeyTable.id,
                column_name: 'id',
              });
            await this._transactionalEntityManager.query(
              // Should be using queryRunner.createForeignKey instead?
              `ALTER TABLE repository_${this._repository.id}.table_${this._table.id} ` +
                `ADD CONSTRAINT column_${this._column.id} ` +
                `FOREIGN KEY (column_${this._column.id}) ` +
                `REFERENCES repository_${this._repository.id}.table_${_foreignKeyTable.id} (column_${_foreignKeyColumn.id})`
            );
          }
  */
  // TODO: add 1 to table column count
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

export const findOne = async (query: Query, primaryKey: PrimaryKey) => {
  const debug = new Debug(`${debugSource}.findOne`);
  debug.write(MessageType.Entry, `primaryKey=${JSON.stringify(primaryKey)}`);
  debug.write(MessageType.Step, 'Finding row by primary key...');
  const row = (await findByPrimaryKey(query, tableName, primaryKey, {
    columnNames: columnNames,
  })) as Row;
  debug.write(MessageType.Exit, `row=${JSON.stringify(row)}`);
  return row;
};

export const update = async (
  query: Query,
  primaryKey: PrimaryKey,
  updateData: UpdateData,
) => {
  const debug = new Debug(`${debugSource}.update`);
  debug.write(
    MessageType.Entry,
    `primaryKey=${JSON.stringify(primaryKey)};` +
      `updateData=${JSON.stringify(updateData)}`,
  );
  debug.write(MessageType.Step, 'Finding row by primary key...');
  const row = (await findByPrimaryKey(query, tableName, primaryKey, {
    columnNames: columnNames,
    forUpdate: true,
  })) as Row;
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
  const row = (await findByPrimaryKey(query, tableName, primaryKey, {
    forUpdate: true,
  })) as Row;
  debug.write(MessageType.Value, `row=${JSON.stringify(row)}`);
  debug.write(MessageType.Step, 'Deleting row...');
  await deleteRow(query, tableName, primaryKey);
  debug.write(MessageType.Exit);
};
