import { Query } from 'database';
import * as lookupService from 'repository-lookup-service';
import * as tableService from 'repository-table-service';
export declare enum ColumnType {
    BASE = "base",
    FOREIGN_KEY = "foreign-key",
    LOOKUP = "lookup",
    URL = "url"
}
export declare enum DataType {
    VARCHAR = "varchar",
    TEXT = "text",
    SMALLINT = "smallint",
    INTEGER = "integer",
    BIGINT = "bigint",
    DECIMAL = "decimal",
    DATE = "date",
    TIME = "time",
    TIMESTAMP = "timestamp",
    TIMESTAMPTZ = "timestamptz",
    BOOLEAN = "boolean"
}
export type PrimaryKey = {
    uuid: string;
};
export type Data<Populate extends boolean | ColumnType.FOREIGN_KEY | ColumnType.LOOKUP = false> = (Populate extends false ? {
    table_uuid: string;
} : {
    table: tableService.Row;
}) & {
    column_type: string;
} & (Populate extends ColumnType.FOREIGN_KEY ? {
    foreign_key_table: tableService.Row;
} : {
    foreign_key_table_uuid?: string | null;
}) & (Populate extends ColumnType.LOOKUP ? {
    lookup: lookupService.Row;
} : {
    lookup_uuid?: string | null;
}) & {
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
export type CreatedRow<Populate extends true | ColumnType.FOREIGN_KEY | ColumnType.LOOKUP> = Row<Populate>;
export type Row<Populate extends boolean | ColumnType.FOREIGN_KEY | ColumnType.LOOKUP = false> = PrimaryKey & Required<Data<Populate>> & System;
export type UpdateData = Partial<Data>;
export type UpdatedRow = Row;
export declare const create: (query: Query, createData: CreateData) => Promise<CreatedRow<true> | CreatedRow<ColumnType.FOREIGN_KEY> | CreatedRow<ColumnType.LOOKUP>>;
export declare const find: (query: Query) => Promise<Row<false>[]>;
export declare const findOne: (query: Query, primaryKey: Required<PrimaryKey>) => Promise<Row<false>>;
export declare const update: (query: Query, primaryKey: PrimaryKey, updateData: UpdateData) => Promise<UpdatedRow>;
export declare const delete_: (query: Query, primaryKey: PrimaryKey) => Promise<void>;
