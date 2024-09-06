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
exports.delete_ = exports.update = exports.findOne = exports.find = exports.create = exports.DataType = exports.ColumnType = void 0;
const database_helpers_1 = require("database-helpers");
const node_debug_1 = require("node-debug");
//import { BadRequestError } from 'node-errors';
const node_utilities_1 = require("node-utilities");
const lookupService = __importStar(require("repository-lookup-service"));
const tableService = __importStar(require("repository-table-service"));
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
var ColumnType;
(function (ColumnType) {
    ColumnType["BASE"] = "base";
    ColumnType["FOREIGN_KEY"] = "foreign-key";
    ColumnType["LOOKUP"] = "lookup";
    ColumnType["URL"] = "url";
})(ColumnType || (exports.ColumnType = ColumnType = {}));
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
})(DataType || (exports.DataType = DataType = {}));
/*
const nativeDataType =
  Object.keys(DataType)[
    Object.values<string>(DataType).indexOf('varchar')
  ].toLowerCase();
*/
const create = (query, createData) => __awaiter(void 0, void 0, void 0, function* () {
    const debug = new node_debug_1.Debug(`${debugSource}.create`);
    debug.write(node_debug_1.MessageType.Entry, `createData=${JSON.stringify(createData)}`);
    if (typeof createData.uuid !== 'undefined') {
        const primaryKey = { uuid: createData.uuid };
        debug.write(node_debug_1.MessageType.Value, `primaryKey=${JSON.stringify(primaryKey)}`);
        debug.write(node_debug_1.MessageType.Step, 'Checking primary key...');
        yield (0, database_helpers_1.checkPrimaryKey)(query, tableName, instanceName, primaryKey);
    }
    debug.write(node_debug_1.MessageType.Step, 'Finding table...');
    const table = yield tableService.findOne(query, {
        uuid: createData.table_uuid,
    });
    if (!Object.values(DataType).includes(createData.column_type)) {
        throw new Error('column_type is invalid');
    }
    let foreignKeyTable;
    let lookup;
    if (createData.column_type == ColumnType.BASE) {
        null;
    }
    else if (createData.column_type == ColumnType.FOREIGN_KEY) {
        foreignKeyTable = yield tableService.findOne(query, {
            uuid: createData.foreign_key_table_uuid,
        });
    }
    else if (createData.column_type == ColumnType.LOOKUP) {
        lookup = yield lookupService.findOne(query, {
            uuid: createData.lookup_uuid,
        });
    }
    else if (createData.column_type == ColumnType.URL) {
        null;
    }
    debug.write(node_debug_1.MessageType.Step, 'Creating row...');
    const row = (yield (0, database_helpers_1.createRow)(query, tableName, createData));
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
        const _createdRow = Object.assign(Object.assign(Object.assign({}, properties1), { foreign_key_table: foreignKeyTable, lookup_uuid: row.lookup_uuid }), properties2);
        createdRow = _createdRow;
    }
    else if (row.column_type == ColumnType.LOOKUP) {
        const _createdRow = Object.assign(Object.assign(Object.assign({}, properties1), { foreign_key_table_uuid: row.foreign_key_table_uuid, lookup: lookup }), properties2);
        createdRow = _createdRow;
    }
    else {
        const _createdRow = Object.assign(Object.assign(Object.assign({}, properties1), { foreign_key_table_uuid: row.foreign_key_table_uuid, lookup_uuid: row.lookup_uuid }), properties2);
        createdRow = _createdRow;
    }
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
    const row = (yield (0, database_helpers_1.findByPrimaryKey)(query, tableName, instanceName, primaryKey, { columnNames: columnNames }));
    debug.write(node_debug_1.MessageType.Exit, `row=${JSON.stringify(row)}`);
    return row;
});
exports.findOne = findOne;
const update = (query, primaryKey, updateData) => __awaiter(void 0, void 0, void 0, function* () {
    const debug = new node_debug_1.Debug(`${debugSource}.update`);
    debug.write(node_debug_1.MessageType.Entry, `primaryKey=${JSON.stringify(primaryKey)};` +
        `updateData=${JSON.stringify(updateData)}`);
    debug.write(node_debug_1.MessageType.Step, 'Finding row by primary key...');
    const row = (yield (0, database_helpers_1.findByPrimaryKey)(query, tableName, instanceName, primaryKey, { columnNames: columnNames, forUpdate: true }));
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
    const row = (yield (0, database_helpers_1.findByPrimaryKey)(query, tableName, instanceName, primaryKey, { forUpdate: true }));
    debug.write(node_debug_1.MessageType.Value, `row=${JSON.stringify(row)}`);
    debug.write(node_debug_1.MessageType.Step, 'Deleting row...');
    yield (0, database_helpers_1.deleteRow)(query, tableName, primaryKey);
    debug.write(node_debug_1.MessageType.Exit);
});
exports.delete_ = delete_;
