import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

type ExportExcelBody = {
  data?: Array<Record<string, unknown>>;
  name?: string;
};

const EXCEL_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ExportExcelBody;
    const { data, name } = body;

    if (!Array.isArray(data) || data.length === 0) {
      return createJsonResponse({ error: 'Data array is required to export Excel.' }, 400);
    }

    const columns = Object.keys(data[0]);
    if (columns.length === 0) {
      return createJsonResponse({ error: 'Unable to infer columns from provided data.' }, 400);
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Data');

    worksheet.columns = columns.map((column) => ({
      header: column,
      key: column,
    }));

    data.forEach((row) => {
      worksheet.addRow(row);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const uint8Array = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

    const filename = `${name ?? 'test-data'}.xlsx`;

    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': EXCEL_MIME,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': uint8Array.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('[ExportExcel] Failed to generate Excel', error);
    return createJsonResponse(
      {
        error: 'Failed to generate Excel file.',
        debug: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}

const createJsonResponse = (payload: Record<string, unknown>, status: number) =>
  new NextResponse(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
