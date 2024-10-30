"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.service = void 0;
const class_1 = require("./class");
exports.service = new class_1.Service('system-column-service', '_columns', ['uuid'], [
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
], false, ['position_number', 'position_in_unique_key']);
