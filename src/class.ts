import { BaseService } from 'base-service-class';
import { checkUniqueKey, findByPrimaryKey, updateRow } from 'database-helpers';
import { Debug, MessageType } from 'node-debug';
import { BadRequestError } from 'node-errors';
import { Row as Lookup, service as lookupService } from 'system-lookup-service';
import { Row as Table, service as tableService } from 'system-table-service';

let table: Table;

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
  Base = 'base',
  ForeignKey = 'foreign-key',
  Lookup = 'lookup',
  URL = 'url',
}

const checkNameMatchesExpected = (
  name: string,
  columnType: string,
  referencingInstanceName: string,
  nameQualifier: string | null,
) => {
  if (
    (<string[]>[ColumnType.ForeignKey, ColumnType.Lookup]).includes(columnType)
  ) {
    const expectedName =
      (nameQualifier !== null ? `${nameQualifier}_` : '') +
        `${referencingInstanceName}_` +
        columnType ==
      ColumnType.ForeignKey
        ? 'id'
        : 'lookup_code';
    if (name !== expectedName) {
      throw new BadRequestError(`name must be set to "${expectedName}"`);
    }
  }
};

enum DataType {
  Varchar = 'varchar',
  Text = 'text',
  SmallInt = 'smallint',
  Integer = 'integer',
  BigInt = 'bigint',
  Decimal = 'decimal',
  Date = 'date',
  Time = 'time',
  Timestamp = 'timestamp',
  TimestampTZ = 'timestamp-tz',
  Boolean = 'boolean',
}

const checkDataType = (
  dataType: string,
  lengthOrPrecision: number | null,
  scale: number | null,
) => {
  if (dataType == DataType.Varchar || dataType == DataType.Decimal) {
    if (lengthOrPrecision == null) {
      throw new BadRequestError('length_or_precision cannot be null');
    }
    if (dataType == DataType.Varchar) {
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
  if (dataType !== DataType.Decimal && scale !== null) {
    throw new BadRequestError('scale must be null');
  }
};

export type PrimaryKey = {
  uuid?: string;
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
  position_number?: number;
  position_in_unique_key?: number | null;
};

export type CreateData = PrimaryKey & Data;
export type UpdateData = Partial<Data>;
export type Row = Required<PrimaryKey> & Required<Data> & Required<System>;

export class Service extends BaseService<
  PrimaryKey,
  CreateData,
  UpdateData,
  Row,
  System
> {
  async preCreate() {
    const debug = new Debug(`${this.debugSource}.preCreate`);
    debug.write(MessageType.Entry);
    debug.write(MessageType.Step, 'Finding table (for update)...');
    table = (await findByPrimaryKey(
      this.query,
      tableService.tableName,
      { uuid: this.createData.table_uuid },
      { forUpdate: true },
    )) as Table;
    if (
      !Object.values<string>(ColumnType).includes(this.createData.column_type)
    ) {
      throw new BadRequestError('column_type is invalid');
    }
    if (
      this.createData.column_type !== ColumnType.ForeignKey &&
      typeof this.createData.foreign_key_table_uuid !== 'undefined' &&
      this.createData.foreign_key_table_uuid !== null
    ) {
      throw new BadRequestError(
        'foreign_key_table_uuid is not required or must be set to null',
      );
    }
    if (
      this.createData.column_type !== ColumnType.Lookup &&
      typeof this.createData.lookup_uuid !== 'undefined' &&
      this.createData.lookup_uuid !== null
    ) {
      throw new BadRequestError(
        'lookup_uuid is not required or must be set to null',
      );
    }
    let foreignKeyTable: Table;
    let lookup: Lookup;
    if (this.createData.column_type == ColumnType.ForeignKey) {
      if (typeof this.createData.foreign_key_table_uuid == 'undefined') {
        throw new BadRequestError('foreign_key_table_uuid is required');
      }
      if (this.createData.foreign_key_table_uuid == null) {
        throw new BadRequestError('foreign_key_table_uuid cannot be null');
      }
      foreignKeyTable = await tableService.findOne(this.query, {
        uuid: this.createData.foreign_key_table_uuid,
      });
    } else if (this.createData.column_type == ColumnType.Lookup) {
      if (typeof this.createData.lookup_uuid == 'undefined') {
        throw new BadRequestError('lookup_uuid is required');
      }
      if (this.createData.lookup_uuid == null) {
        throw new BadRequestError('lookup_uuid cannot be null');
      }
      lookup = await lookupService.findOne(this.query, {
        uuid: this.createData.lookup_uuid,
      });
    }
    debug.write(MessageType.Step, 'Checking name...');
    if (
      !(<string[]>[ColumnType.ForeignKey, ColumnType.Lookup]).includes(
        this.createData.column_type,
      )
    ) {
      if (
        typeof this.createData.name_qualifier !== 'undefined' &&
        this.createData.name_qualifier !== null
      ) {
        throw new BadRequestError(
          'name_qualifier is not required or must be set to null',
        );
      }
      checkNameNotReserved(this.createData.name);
    } else {
      checkNameMatchesExpected(
        this.createData.name,
        this.createData.column_type,
        this.createData.column_type == ColumnType.ForeignKey
          ? foreignKeyTable!.singular_name
          : lookup!.lookup_type,
        this.createData.name_qualifier || null,
      );
    }
    const uniqueKey = {
      table_uuid: this.createData.table_uuid,
      name: this.createData.name,
    };
    debug.write(MessageType.Value, `uniqueKey=${JSON.stringify(uniqueKey)}`);
    debug.write(MessageType.Step, 'Checking unique key...');
    await checkUniqueKey(this.query, this.tableName, uniqueKey);
    if (!Object.values<string>(DataType).includes(this.createData.data_type)) {
      throw new BadRequestError('data_type is invalid');
    }
    debug.write(MessageType.Step, 'Checking data type...');
    checkDataType(
      this.createData.data_type,
      this.createData.length_or_precision || null,
      this.createData.scale || null,
    );
    // Check is_not_null & initial_value here against (non-)existing data
    this.system.position_number = table.column_count + 1;
    debug.write(MessageType.Exit);
  }

  async preUpdate() {
    const debug = new Debug(`${this.debugSource}.preUpdate`);
    debug.write(MessageType.Entry);
    debug.write(MessageType.Exit);
  }

  async preDelete() {
    const debug = new Debug(`${this.debugSource}.preDelete`);
    debug.write(MessageType.Entry);
    debug.write(MessageType.Step, 'Finding table (for update)...');
    table = (await findByPrimaryKey(
      this.query,
      tableService.tableName,
      { uuid: this.row.table_uuid },
      { forUpdate: true },
    )) as Table;
    debug.write(MessageType.Exit);
  }

  async postCreate() {
    const debug = new Debug(`${this.debugSource}.postCreate`);
    debug.write(MessageType.Entry);
    /* TODO: if not null, add column (nullable), update using initial value, set to not null 
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
    debug.write(MessageType.Step, 'Incrementing table column count...');
    await updateRow(
      this.query,
      tableService.tableName,
      { uuid: this.createdRow.table_uuid },
      { column_count: table.column_count + 1 },
    );
    debug.write(MessageType.Exit);
  }

  async postUpdate() {
    const debug = new Debug(`${this.debugSource}.postUpdate`);
    debug.write(MessageType.Entry);
    debug.write(MessageType.Exit);
  }

  async postDelete() {
    const debug = new Debug(`${this.debugSource}.postDelete`);
    debug.write(MessageType.Entry);
    debug.write(MessageType.Step, 'Decrementing table column count...');
    await updateRow(
      this.query,
      tableService.tableName,
      { uuid: this.row.table_uuid },
      { column_count: table.column_count - 1 },
    );
    debug.write(MessageType.Exit);
  }
}