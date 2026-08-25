import type { GarmentCategory } from '@rewear/domain';

export * from './search';

export interface UploadTicketRequest {
  fileName: string;
  fileSize: number;
  contentType: 'image/jpeg' | 'image/jpg' | 'image/png';
}

export interface UploadTicket {
  fileId: string;
  method: 'PUT';
  url: string;
  headers: Record<string, string>;
}

export interface TryOnRequest {
  personFileId: string;
  garmentFileId: string;
  garmentCategory?: GarmentCategory;
}

export interface TryOnStatus {
  status: string;
  resultUrl?: string;
  error?: unknown;
}

export interface VirtualTryOnProvider {
  createUploadTicket(input: UploadTicketRequest): Promise<UploadTicket>;
  createTryOn(input: TryOnRequest): Promise<{ taskId: string }>;
  getTryOn(taskId: string): Promise<TryOnStatus>;
  deleteTask(taskId: string): Promise<void>;
}

export class PerfectCorpProvider implements VirtualTryOnProvider {
  constructor(private readonly apiKey: string, private readonly baseUrl = 'https://yce-api-01.makeupar.com') {}

  private async request(path: string, init: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...(init.headers ?? {})
      }
    });
    const body = await response.json() as any;
    if (!response.ok || body?.status >= 400) {
      const error = new Error(`PERFECT_API_${response.status}`);
      (error as any).details = body;
      throw error;
    }
    return body;
  }

  async createUploadTicket(input: UploadTicketRequest): Promise<UploadTicket> {
    const body = await this.request('/s2s/v2.0/file', {
      method: 'POST',
      body: JSON.stringify({ files: [{ file_name: input.fileName, file_size: input.fileSize, content_type: input.contentType }] })
    });
    const file = body?.data?.files?.[0];
    const request = file?.requests?.[0];
    if (!file?.file_id || !request?.url) throw new Error('PERFECT_UPLOAD_TICKET_INVALID');
    return { fileId: file.file_id, method: 'PUT', url: request.url, headers: request.headers ?? {} };
  }

  async createTryOn(input: TryOnRequest): Promise<{ taskId: string }> {
    const body = await this.request('/s2s/v2.0/task/cloth-v4', {
      method: 'POST',
      body: JSON.stringify({
        src_file_id: input.personFileId,
        ref_file_id: input.garmentFileId,
        garment_category: input.garmentCategory ?? 'auto'
      })
    });
    if (!body?.data?.task_id) throw new Error('PERFECT_TASK_ID_MISSING');
    return { taskId: body.data.task_id };
  }

  async getTryOn(taskId: string): Promise<TryOnStatus> {
    const body = await this.request(`/s2s/v2.0/task/cloth-v4/${encodeURIComponent(taskId)}`);
    const status = body?.data?.task_status ?? 'unknown';
    return { status, resultUrl: body?.data?.results?.url, error: body?.data?.error };
  }

  async deleteTask(taskId: string): Promise<void> {
    const body = await this.request('/s2s/v2.0/task/delete', {
      method: 'POST',
      body: JSON.stringify({ task_id: taskId })
    });
    if (body?.status !== 200) throw new Error('PERFECT_DELETE_UNCONFIRMED');
  }
}
