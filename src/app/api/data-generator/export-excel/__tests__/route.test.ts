import type { NextRequest } from 'next/server';
import { POST } from '../route';

jest.mock('exceljs', () => {
  const worksheetMock = {
    columns: [] as any,
    addRow: jest.fn(),
  };

  const workbookMock = {
    addWorksheet: jest.fn(() => worksheetMock),
    xlsx: {
      writeBuffer: jest.fn(async () => new Uint8Array([1, 2, 3])),
    },
  };

  return {
    __esModule: true,
    default: {
      Workbook: jest.fn(() => workbookMock),
    },
    __worksheetMock: worksheetMock,
    __workbookMock: workbookMock,
  };
});

const excelJsMock = jest.requireMock('exceljs') as unknown as {
  __worksheetMock: { columns: any; addRow: jest.Mock }; 
  __workbookMock: {
    addWorksheet: jest.Mock;
    xlsx: { writeBuffer: jest.Mock };
  };
};

beforeEach(() => {
  excelJsMock.__worksheetMock.columns = [];
  excelJsMock.__worksheetMock.addRow.mockReset();
  excelJsMock.__workbookMock.addWorksheet.mockReset().mockImplementation(() => excelJsMock.__worksheetMock);
  excelJsMock.__workbookMock.xlsx.writeBuffer
    .mockReset()
    .mockResolvedValue(new Uint8Array([1, 2, 3]));
});

describe('POST /api/data-generator/export-excel', () => {
  const buildRequest = (payload: unknown): NextRequest => {
    return {
      json: async () => payload,
    } as NextRequest;
  };

  it('returns 400 when data is missing', async () => {
    const response = await POST(buildRequest({}));
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe('Data array is required to export Excel.');
  });

  it('generates an excel workbook from data rows', async () => {
    const payload = {
      data: [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ],
      name: 'sample',
    };

    const response = await POST(buildRequest(payload));
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    const buffer = await response.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(0);
  });
});
