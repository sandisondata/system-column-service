"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.delete_ = exports.update = exports.findOne = exports.find = exports.create = void 0;
const database_helpers_1 = require("database-helpers");
const node_debug_1 = require("node-debug");
const node_errors_1 = require("node-errors");
const node_utilities_1 = require("node-utilities");
const lookupService = __importStar(require("repository-lookup-service"));
const tableService = __importStar(require("repository-table-service"));
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
const checkNameNotReserved = (name) => {
    if ([
        'id',
        'creation_date',
        'created_by',
        'last_update_date',
        'last_updated_by',
        'file_count',
    ].includes(name)) {
        throw new node_errors_1.BadRequestError(`name "${name}" is reserved by the system`);
    }
};
var ColumnType;
(function (ColumnType) {
    ColumnType["BASE"] = "base";
    ColumnType["FOREIGN_KEY"] = "foreign-key";
    ColumnType["LOOKUP"] = "lookup";
    ColumnType["URL"] = "url";
})(ColumnType || (ColumnType = {}));
const checkNameMatchesExpected = (name, columnType, referencingInstanceName, nameQualifier) => {
    if ([ColumnType.FOREIGN_KEY, ColumnType.LOOKUP].includes(columnType)) {
        const expectedName = (nameQualifier !== null ? `${nameQualifier}_` : '') +
            `${referencingInstanceName}_` +
            columnType ==
            ColumnType.FOREIGN_KEY
            ? 'id'
            : 'lookup_code';
        if (name !== expectedName) {
            throw new node_errors_1.BadRequestError(`name must be set to "${expectedName}"`);
        }
    }
};
var DataType;
(function (DataType) {
    DataType["VARCHAR"] = "varchar";
    DataType["TEXT"] = "text";
    DataType["SMALLINT"] = "smallint";
    DataType["INTEGER"] = "integer";
    DataType["BIGINT"] = "bigint";
    DataType["DECIMAL"] = "decimal";
    DataType["DATE"] = "date";
    DataType["TIME"] = "time";
    DataType["TIMESTAMP"] = "timestamp";
    DataType["TIMESTAMPTZ"] = "timestamptz";
    DataType["BOOLEAN"] = "boolean";
})(DataType || (DataType = {}));
const checkDataType = (dataType, lengthOrPrecision, scale) => {
    if (dataType == DataType.VARCHAR || dataType == DataType.DECIMAL) {
        if (lengthOrPrecision == null) {
            throw new node_errors_1.BadRequestError('length_or_precision cannot be null');
        }
        if (dataType == DataType.VARCHAR) {
            if (!(lengthOrPrecision >= 1 && lengthOrPrecision <= 32767)) {
                throw new node_errors_1.BadRequestError('length_or_precision must be between 1 and 32767');
            }
        }
        else {
            if (!(lengthOrPrecision >= 1 && lengthOrPrecision <= 1000)) {
                throw new node_errors_1.BadRequestError('length_or_precision must be between 1 and 1000');
            }
            if (scale == null) {
                throw new node_errors_1.BadRequestError('scale cannot be null');
            }
            if (!(scale >= 1 && scale <= lengthOrPrecision)) {
                throw new node_errors_1.BadRequestError(`scale must be between 1 and ${lengthOrPrecision}`);
            }
        }
    }
    else {
        if (lengthOrPrecision !== null) {
            throw new node_errors_1.BadRequestError('length_or_precision must be null');
        }
    }
    if (dataType !== DataType.DECIMAL && scale !== null) {
        throw new node_errors_1.BadRequestError('scale must be null');
    }
};
const create = (query, createData) => __awaiter(void 0, void 0, void 0, function* () {
    const debug = new node_debug_1.Debug(`${debugSource}.create`);
    debug.write(node_debug_1.MessageType.Entry, `createData=${JSON.stringify(createData)}`);
    if (typeof createData.uuid !== 'undefined') {
        const primaryKey = { uuid: createData.uuid };
        debug.write(node_debug_1.MessageType.Value, `primaryKey=${JSON.stringify(primaryKey)}`);
        debug.write(node_debug_1.MessageType.Step, 'Checking primary key...');
        yield (0, database_helpers_1.checkPrimaryKey)(query, tableName, primaryKey);
    }
    debug.write(node_debug_1.MessageType.Step, 'Finding table (for update)...');
    yield tableService.findOne(query, {
        uuid: createData.table_uuid,
    }, true);
    if (!Object.values(DataType).includes(createData.column_type)) {
        throw new node_errors_1.BadRequestError('column_type is invalid');
    }
    if (createData.column_type !== ColumnType.FOREIGN_KEY &&
        typeof createData.foreign_key_table_uuid !== 'undefined' &&
        createData.foreign_key_table_uuid !== null) {
        throw new node_errors_1.BadRequestError('foreign_key_table_uuid is not required or must be set to null');
    }
    if (createData.column_type !== ColumnType.LOOKUP &&
        typeof createData.lookup_uuid !== 'undefined' &&
        createData.lookup_uuid !== null) {
        throw new node_errors_1.BadRequestError('lookup_uuid is not required or must be set to null');
    }
    let foreignKeyTable;
    let lookup;
    if (createData.column_type == ColumnType.FOREIGN_KEY) {
        if (typeof createData.foreign_key_table_uuid == 'undefined') {
            throw new node_errors_1.BadRequestError('foreign_key_table_uuid is required');
        }
        if (createData.foreign_key_table_uuid == null) {
            throw new node_errors_1.BadRequestError('foreign_key_table_uuid cannot be null');
        }
        foreignKeyTable = yield tableService.findOne(query, {
            uuid: createData.foreign_key_table_uuid,
        });
    }
    else if (createData.column_type == ColumnType.LOOKUP) {
        if (typeof createData.lookup_uuid == 'undefined') {
            throw new node_errors_1.BadRequestError('lookup_uuid is required');
        }
        if (createData.lookup_uuid == null) {
            throw new node_errors_1.BadRequestError('lookup_uuid cannot be null');
        }
        lookup = yield lookupService.findOne(query, {
            uuid: createData.lookup_uuid,
        });
    }
    debug.write(node_debug_1.MessageType.Step, 'Checking name...');
    if (![ColumnType.FOREIGN_KEY, ColumnType.LOOKUP].includes(createData.column_type)) {
        if (typeof createData.name_qualifier !== 'undefined' &&
            createData.name_qualifier !== null) {
            throw new node_errors_1.BadRequestError('name_qualifier is not required or must be set to null');
        }
        checkNameNotReserved(createData.name);
    }
    else {
        checkNameMatchesExpected(createData.name, createData.column_type, createData.column_type == ColumnType.FOREIGN_KEY
            ? foreignKeyTable.singular_name
            : lookup.lookup_type, createData.name_qualifier || null);
    }
    const uniqueKey = {
        table_uuid: createData.table_uuid,
        name: createData.name,
    };
    debug.write(node_debug_1.MessageType.Value, `uniqueKey=${JSON.stringify(uniqueKey)}`);
    debug.write(node_debug_1.MessageType.Step, 'Checking unique key...');
    yield (0, database_helpers_1.checkUniqueKey)(query, tableName, uniqueKey);
    if (!Object.values(DataType).includes(createData.data_type)) {
        throw new node_errors_1.BadRequestError('data_type is invalid');
    }
    debug.write(node_debug_1.MessageType.Step, 'Checking data type...');
    checkDataType(createData.data_type, createData.length_or_precision || null, createData.scale || null);
    // Check is_not_null & initial_value here against (non-)existing data
    debug.write(node_debug_1.MessageType.Step, 'Creating row...');
    const createdRow = (yield (0, database_helpers_1.createRow)(query, tableName, createData));
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
    debug.write(node_debug_1.MessageType.Exit, `createdRow=${JSON.stringify(createdRow)}`);
    return createdRow;
});
exports.create = create;
// TODO: query parameters + add actual query to helpers
const find = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const debug = new node_debug_1.Debug(`${debugSource}.find`);
    debug.write(node_debug_1.MessageType.Entry);
    debug.write(node_debug_1.MessageType.Step, 'Finding rows...');
    const rows = (yield query(`SELECT * FROM ${tableName} ORDER BY uuid`))
        .rows;
    debug.write(node_debug_1.MessageType.Exit, `rows(${debugRows})=${JSON.stringify(rows.slice(0, debugRows))}`);
    return rows;
});
exports.find = find;
const findOne = (query, primaryKey) => __awaiter(void 0, void 0, void 0, function* () {
    const debug = new node_debug_1.Debug(`${debugSource}.findOne`);
    debug.write(node_debug_1.MessageType.Entry, `primaryKey=${JSON.stringify(primaryKey)}`);
    debug.write(node_debug_1.MessageType.Step, 'Finding row by primary key...');
    const row = (yield (0, database_helpers_1.findByPrimaryKey)(query, tableName, primaryKey, {
        columnNames: columnNames,
    }));
    debug.write(node_debug_1.MessageType.Exit, `row=${JSON.stringify(row)}`);
    return row;
});
exports.findOne = findOne;
const update = (query, primaryKey, updateData) => __awaiter(void 0, void 0, void 0, function* () {
    const debug = new node_debug_1.Debug(`${debugSource}.update`);
    debug.write(node_debug_1.MessageType.Entry, `primaryKey=${JSON.stringify(primaryKey)};` +
        `updateData=${JSON.stringify(updateData)}`);
    debug.write(node_debug_1.MessageType.Step, 'Finding row by primary key...');
    const row = (yield (0, database_helpers_1.findByPrimaryKey)(query, tableName, primaryKey, {
        columnNames: columnNames,
        forUpdate: true,
    }));
    debug.write(node_debug_1.MessageType.Value, `row=${JSON.stringify(row)}`);
    const mergedRow = Object.assign({}, row, updateData);
    debug.write(node_debug_1.MessageType.Value, `mergedRow=${JSON.stringify(mergedRow)}`);
    let updatedRow = Object.assign({}, mergedRow);
    if (!(0, node_utilities_1.objectsEqual)((0, node_utilities_1.pick)(mergedRow, dataColumnNames), (0, node_utilities_1.pick)(row, dataColumnNames))) {
        debug.write(node_debug_1.MessageType.Step, 'Updating row...');
        updatedRow = (yield (0, database_helpers_1.updateRow)(query, tableName, primaryKey, updateData, columnNames));
    }
    debug.write(node_debug_1.MessageType.Exit, `updatedRow=${JSON.stringify(updatedRow)}`);
    return updatedRow;
});
exports.update = update;
const delete_ = (query, primaryKey) => __awaiter(void 0, void 0, void 0, function* () {
    const debug = new node_debug_1.Debug(`${debugSource}.delete`);
    debug.write(node_debug_1.MessageType.Entry, `primaryKey=${JSON.stringify(primaryKey)}`);
    debug.write(node_debug_1.MessageType.Step, 'Finding row by primary key...');
    const row = (yield (0, database_helpers_1.findByPrimaryKey)(query, tableName, primaryKey, {
        forUpdate: true,
    }));
    debug.write(node_debug_1.MessageType.Value, `row=${JSON.stringify(row)}`);
    debug.write(node_debug_1.MessageType.Step, 'Deleting row...');
    yield (0, database_helpers_1.deleteRow)(query, tableName, primaryKey);
    debug.write(node_debug_1.MessageType.Exit);
});
exports.delete_ = delete_;
