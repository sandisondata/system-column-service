"use strict";
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
exports.Service = void 0;
const base_service_class_1 = require("base-service-class");
const database_helpers_1 = require("database-helpers");
const node_debug_1 = require("node-debug");
const node_errors_1 = require("node-errors");
const system_lookup_service_1 = require("system-lookup-service");
const system_table_service_1 = require("system-table-service");
let table;
let foreignKeyTable;
let lookup;
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
    ColumnType["Base"] = "base";
    ColumnType["ForeignKey"] = "foreign-key";
    ColumnType["Lookup"] = "lookup";
    ColumnType["URL"] = "url";
})(ColumnType || (ColumnType = {}));
const checkNameMatchesExpected = (name, columnType, referencingInstanceName, nameQualifier) => {
    if ([ColumnType.ForeignKey, ColumnType.Lookup].includes(columnType)) {
        const expectedName = (nameQualifier != null ? `${nameQualifier}_` : '') +
            `${referencingInstanceName}_` +
            columnType ==
            ColumnType.ForeignKey
            ? 'id'
            : 'lookup_code';
        if (name != expectedName) {
            throw new node_errors_1.BadRequestError(`name must be set to "${expectedName}"`);
        }
    }
};
var DataType;
(function (DataType) {
    DataType["Varchar"] = "varchar";
    DataType["Text"] = "text";
    DataType["SmallInt"] = "smallint";
    DataType["Integer"] = "integer";
    DataType["BigInt"] = "bigint";
    DataType["Decimal"] = "decimal";
    DataType["Date"] = "date";
    DataType["Time"] = "time";
    DataType["Timestamp"] = "timestamp";
    DataType["TimestampTZ"] = "timestamptz";
    DataType["Boolean"] = "boolean";
})(DataType || (DataType = {}));
const checkDataType = (dataType, lengthOrPrecision, scale) => {
    if ([DataType.Varchar, DataType.Decimal].includes(dataType)) {
        if (lengthOrPrecision == null) {
            throw new node_errors_1.BadRequestError('length_or_precision cannot be null');
        }
        if (dataType == DataType.Varchar) {
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
        if (lengthOrPrecision != null) {
            throw new node_errors_1.BadRequestError('length_or_precision must be null');
        }
    }
    if (dataType != DataType.Decimal && scale != null) {
        throw new node_errors_1.BadRequestError('scale must be null');
    }
};
class Service extends base_service_class_1.BaseService {
    preCreate() {
        return __awaiter(this, void 0, void 0, function* () {
            const debug = new node_debug_1.Debug(`${this.debugSource}.preCreate`);
            debug.write(node_debug_1.MessageType.Entry);
            debug.write(node_debug_1.MessageType.Step, 'Finding table (for update)...');
            table = (yield (0, database_helpers_1.findByPrimaryKey)(this.query, system_table_service_1.service.tableName, { uuid: this.createData.table_uuid }, { forUpdate: true }));
            if (!Object.values(ColumnType).includes(this.createData.column_type)) {
                throw new node_errors_1.BadRequestError('column_type is invalid');
            }
            if (this.createData.column_type != ColumnType.ForeignKey &&
                typeof this.createData.foreign_key_table_uuid != 'undefined' &&
                this.createData.foreign_key_table_uuid != null) {
                throw new node_errors_1.BadRequestError('foreign_key_table_uuid is not required or must be set to null');
            }
            if (this.createData.column_type != ColumnType.Lookup &&
                typeof this.createData.lookup_uuid != 'undefined' &&
                this.createData.lookup_uuid != null) {
                throw new node_errors_1.BadRequestError('lookup_uuid is not required or must be set to null');
            }
            if (this.createData.column_type == ColumnType.ForeignKey) {
                if (typeof this.createData.foreign_key_table_uuid == 'undefined') {
                    throw new node_errors_1.BadRequestError('foreign_key_table_uuid is required');
                }
                if (this.createData.foreign_key_table_uuid == null) {
                    throw new node_errors_1.BadRequestError('foreign_key_table_uuid cannot be null');
                }
                foreignKeyTable = yield system_table_service_1.service.findOne(this.query, {
                    uuid: this.createData.foreign_key_table_uuid,
                });
            }
            else if (this.createData.column_type == ColumnType.Lookup) {
                if (typeof this.createData.lookup_uuid == 'undefined') {
                    throw new node_errors_1.BadRequestError('lookup_uuid is required');
                }
                if (this.createData.lookup_uuid == null) {
                    throw new node_errors_1.BadRequestError('lookup_uuid cannot be null');
                }
                lookup = yield system_lookup_service_1.service.findOne(this.query, {
                    uuid: this.createData.lookup_uuid,
                });
            }
            debug.write(node_debug_1.MessageType.Step, 'Checking name...');
            if (![ColumnType.ForeignKey, ColumnType.Lookup].includes(this.createData.column_type)) {
                if (typeof this.createData.name_qualifier != 'undefined' &&
                    this.createData.name_qualifier != null) {
                    throw new node_errors_1.BadRequestError('name_qualifier is not required or must be set to null');
                }
                checkNameNotReserved(this.createData.name);
            }
            else {
                checkNameMatchesExpected(this.createData.name, this.createData.column_type, this.createData.column_type == ColumnType.ForeignKey
                    ? foreignKeyTable.singular_name
                    : lookup.lookup_type, this.createData.name_qualifier || null);
            }
            const uniqueKey = {
                table_uuid: this.createData.table_uuid,
                name: this.createData.name,
            };
            debug.write(node_debug_1.MessageType.Value, `uniqueKey=${JSON.stringify(uniqueKey)}`);
            debug.write(node_debug_1.MessageType.Step, 'Checking unique key...');
            yield (0, database_helpers_1.checkUniqueKey)(this.query, this.tableName, uniqueKey);
            if (!Object.values(DataType).includes(this.createData.data_type)) {
                throw new node_errors_1.BadRequestError('data_type is invalid');
            }
            debug.write(node_debug_1.MessageType.Step, 'Checking data type...');
            checkDataType(this.createData.data_type, this.createData.length_or_precision || null, this.createData.scale || null);
            // TODO: Check is_not_null & initial_value here against (non-)existing data
            this.system.position_number = table.column_count + 1;
            debug.write(node_debug_1.MessageType.Exit);
        });
    }
    preUpdate() {
        return __awaiter(this, void 0, void 0, function* () {
            const debug = new node_debug_1.Debug(`${this.debugSource}.preUpdate`);
            debug.write(node_debug_1.MessageType.Entry);
            // TODO: Check if updatable and data type change compatibility
            debug.write(node_debug_1.MessageType.Exit);
        });
    }
    preDelete() {
        return __awaiter(this, void 0, void 0, function* () {
            const debug = new node_debug_1.Debug(`${this.debugSource}.preDelete`);
            debug.write(node_debug_1.MessageType.Entry);
            debug.write(node_debug_1.MessageType.Step, 'Finding table (for update)...');
            table = (yield (0, database_helpers_1.findByPrimaryKey)(this.query, system_table_service_1.service.tableName, { uuid: this.row.table_uuid }, { forUpdate: true }));
            debug.write(node_debug_1.MessageType.Exit);
        });
    }
    postCreate() {
        return __awaiter(this, void 0, void 0, function* () {
            const debug = new node_debug_1.Debug(`${this.debugSource}.postCreate`);
            debug.write(node_debug_1.MessageType.Entry);
            // TODO: if not null, add column (nullable), update using initial value, set to not null
            debug.write(node_debug_1.MessageType.Step, 'Adding column to data table...');
            const sql = `ALTER TABLE ${table.name} ` +
                `ADD COLUMN ${this.createdRow.name} ${this.createdRow.data_type}` +
                ([DataType.Varchar, DataType.Decimal].includes(this.createdRow.data_type)
                    ? '(' +
                        this.createdRow.length_or_precision +
                        (this.createdRow.data_type == DataType.Decimal
                            ? `, ${this.createdRow.scale}`
                            : '') +
                        ')'
                    : '') +
                (this.createdRow.is_not_null ? ' NOT NULL' : '');
            debug.write(node_debug_1.MessageType.Value, `sql=(${sql})`);
            yield this.query(sql);
            if ([ColumnType.ForeignKey, ColumnType.Lookup].includes(this.createdRow.column_type)) {
                debug.write(node_debug_1.MessageType.Step, 'Adding foreign key constraint to data table...');
                const sql = `ALTER TABLE ${table.name} ` +
                    `ADD CONSTRAINT "${this.createdRow.uuid}_fk" ` +
                    `FOREIGN KEY (${this.createdRow.name}) ` +
                    'REFERENCES ' +
                    (this.createdRow.column_type == ColumnType.ForeignKey
                        ? foreignKeyTable.name
                        : lookup.lookup_type) +
                    ' (' +
                    (this.createdRow.column_type == ColumnType.ForeignKey
                        ? 'id'
                        : 'lookup_code') +
                    ')';
                debug.write(node_debug_1.MessageType.Value, `sql=(${sql})`);
            }
            debug.write(node_debug_1.MessageType.Step, 'Incrementing table column count...');
            yield (0, database_helpers_1.updateRow)(this.query, system_table_service_1.service.tableName, { uuid: this.createdRow.table_uuid }, { column_count: table.column_count + 1 });
            debug.write(node_debug_1.MessageType.Exit);
        });
    }
    postUpdate() {
        return __awaiter(this, void 0, void 0, function* () {
            const debug = new node_debug_1.Debug(`${this.debugSource}.postUpdate`);
            debug.write(node_debug_1.MessageType.Entry);
            if (this.updatedRow.name != this.row.name) {
                debug.write(node_debug_1.MessageType.Step, 'Renaming column on data table...');
                const sql = `ALTER TABLE ${table.name} ` +
                    `RENAME COLUMN ${this.row.name} TO ${this.updatedRow.name}`;
                debug.write(node_debug_1.MessageType.Value, `sql=(${sql})`);
                yield this.query(sql);
            }
            debug.write(node_debug_1.MessageType.Exit);
        });
    }
    postDelete() {
        return __awaiter(this, void 0, void 0, function* () {
            const debug = new node_debug_1.Debug(`${this.debugSource}.postDelete`);
            debug.write(node_debug_1.MessageType.Entry);
            debug.write(node_debug_1.MessageType.Step, 'Dropping column from data table...');
            const sql = `ALTER TABLE ${table.name} ` + `DROP COLUMN ${this.row.name}`;
            debug.write(node_debug_1.MessageType.Value, `sql=(${sql})`);
            yield this.query(sql);
            debug.write(node_debug_1.MessageType.Step, 'Decrementing table column count...');
            yield (0, database_helpers_1.updateRow)(this.query, system_table_service_1.service.tableName, { uuid: this.row.table_uuid }, { column_count: table.column_count - 1 });
            debug.write(node_debug_1.MessageType.Exit);
        });
    }
}
exports.Service = Service;
