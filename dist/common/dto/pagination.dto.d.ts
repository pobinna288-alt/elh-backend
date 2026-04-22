export declare class PaginationDto {
    page: number;
    limit: number;
    get safePage(): number;
    get safeLimit(): number;
    get skip(): number;
}
export declare class PaginatedResponseDto<T> {
    data: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
    constructor(data: T[], total: number, page: number, limit: number);
}
export declare enum SortOrder {
    ASC = "ASC",
    DESC = "DESC"
}
export declare class SearchDto extends PaginationDto {
    search?: string;
    sortBy?: string;
    sortOrder?: SortOrder;
}
