export interface IQueryProcessor {

    query(que: string): Promise<any[]>;
    optionsValid(que: any): boolean;
}
