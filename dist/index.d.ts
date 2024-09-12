import { Query } from 'database';
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
export declare const create: (query: Query, createData: CreateData) => Promise<Row>;
export declare const find: (query: Query) => Promise<Row[]>;
export declare const findOne: (query: Query, primaryKey: PrimaryKey) => Promise<Row>;
export declare const update: (query: Query, primaryKey: PrimaryKey, updateData: UpdateData) => Promise<Row>;
export declare const delete_: (query: Query, primaryKey: PrimaryKey) => Promise<void>;
