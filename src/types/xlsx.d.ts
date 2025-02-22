declare module 'xlsx' {
  export const utils: {
    book_new: () => any;
    json_to_sheet: (data: any[], options?: { header: string[]; skipHeader: boolean }) => any;
    book_append_sheet: (workbook: any, worksheet: any, name: string) => void;
  };
  export const writeFile: (workbook: any, filename: string) => void;
} 