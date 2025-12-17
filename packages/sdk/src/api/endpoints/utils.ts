export type PaginatedParams<T = object> = T & {
  page?: number;
  limit?: number;
};

export type PaginatedResponse<T, K extends string = 'items'> = {
  pagination: {
    page: number;
    totalPage: number;
    limitPerPage: number;
    count: number;
  };
} & {
  [Key in K]: T[];
};

export const fileToFormData = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return formData;
};
