declare namespace API{

    type Dynasty = {
        id: number;
        name: string;
        startYear?: number;
        endYear?: number;
        description?: string;
        sort?: number;
        createTime?: string;
        updateTime?: string;
    }
}