import { BaseService } from 'base-service-class';
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
export declare class Service extends BaseService<PrimaryKey, CreateData, UpdateData, Row, System> {
    preCreate(): Promise<void>;
    preUpdate(): Promise<void>;
    preDelete(): Promise<void>;
    postCreate(): Promise<void>;
    postUpdate(): Promise<void>;
    postDelete(): Promise<void>;
}
