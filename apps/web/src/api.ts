export type UploadTicket = {
  fileId: string;
  method: 'PUT';
  url: string;
  headers: Record<string, string>;
};

const API_BASE = import.meta.env.VITE_API_BASE ?? '';

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {'Content-Type':'application/json', ...(init?.headers ?? {})}
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((body as any)?.error ?? `HTTP_${response.status}`);
  return body as T;
}

export async function requestUploadTicket(fileName: string, fileSize: number, contentType: string): Promise<UploadTicket> {
  return json('/api/assets/upload-ticket', {
    method: 'POST',
    body: JSON.stringify({fileName, fileSize, contentType})
  });
}

export async function uploadPreparedFile(ticket: UploadTicket, blob: Blob): Promise<void> {
  const headers = new Headers();
  for (const [key, value] of Object.entries(ticket.headers ?? {})) {
    const name = key.toLowerCase();
    if (name === 'content-length' || name === 'host' || name === 'authorization') continue;
    headers.set(key, value);
  }
  if (!headers.has('Content-Type') && blob.type) headers.set('Content-Type', blob.type);
  const response = await fetch(ticket.url, {method:'PUT', headers, body:blob});
  if (!response.ok) throw new Error(`UPLOAD_FAILED_${response.status}`);
}

export async function createTryOn(personFileId: string, garmentFileId: string, garmentCategory: string) {
  return json<{taskId:string}>('/api/tryon', {
    method: 'POST',
    body: JSON.stringify({personFileId, garmentFileId, garmentCategory})
  });
}

export async function getTryOn(taskId: string) {
  return json<{status:string; resultUrl?:string; error?:unknown}>(`/api/tryon/${encodeURIComponent(taskId)}`);
}

export async function deleteTryOn(taskId: string) {
  return json<{deleted:true}>(`/api/tryon/${encodeURIComponent(taskId)}`, {method:'DELETE'});
}

export async function pollTryOn(taskId: string, onStatus?: (status:string)=>void) {
  for (let attempt = 0; attempt < 90; attempt++) {
    const state = await getTryOn(taskId);
    onStatus?.(state.status);
    if (state.status === 'success') {
      if (!state.resultUrl) throw new Error('RESULT_URL_MISSING');
      return state.resultUrl;
    }
    if (state.status === 'error') throw new Error('VTO_FAILED');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  throw new Error('VTO_POLL_TIMEOUT');
}
