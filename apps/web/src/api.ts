export type UploadTicket = {
  fileId: string;
  method: 'PUT';
  url: string;
  headers: Record<string, string>;
};

export type RelaySource = {
  id: string;
  title: string;
  price?: number;
  currency?: string;
  garment_category?: string;
};

export type SearchCandidate = {
  id: string;
  title: string;
  source: string;
  observedAt: string;
  price?: number;
  priceText?: string;
  currency?: string;
  productUrl?: string;
  imageUrl?: string;
  secondHandCondition?: string;
  garmentCategory?: 'auto' | 'full_body' | 'upper_body' | 'lower_body' | 'shoes' | 'outerwear';
};

export type InventorySearchResponse = {
  provider: 'fixture' | 'serpapi';
  query: string;
  providerQuery: string;
  observedAt: string;
  receivedAt: string;
  expiresAt: string;
  candidates: SearchCandidate[];
  candidateSetToken: string | null;
};

export type RelayPlan = {
  source_item_id: string;
  ranked: Array<{
    candidate_id: string;
    score: number;
    reasons: string[];
    cautions: string[];
  }>;
  summary: string;
  candidateSet?: {
    provider: 'fixture' | 'serpapi';
    observedAt: string;
    receivedAt: string;
    expiresAt: string;
  };
};

export type CandidateTryOnTask = {
  taskId: string;
  bindingToken: string;
  candidate: {
    id: string;
    title: string;
    source: string;
    imageUrl: string;
  };
  candidateSet: {
    observedAt: string;
    receivedAt: string;
  };
};

export type CandidateTryOnStatus = {
  status: string;
  resultUrl?: string;
  error?: unknown;
  binding: {
    candidateId: string;
    sourceItemId: string;
  };
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

export async function searchInventory(source: RelaySource, query: string): Promise<InventorySearchResponse> {
  return json<InventorySearchResponse>('/api/search', {
    method: 'POST',
    body: JSON.stringify({
      source,
      query,
      maxResults: 12,
      strictSecondhand: true,
      region: 'ca'
    })
  });
}

export async function rankRelay(candidateSetToken: string, intent: string): Promise<RelayPlan> {
  return json<RelayPlan>('/api/relay/rank', {
    method: 'POST',
    body: JSON.stringify({candidateSetToken, intent})
  });
}

export async function createCandidateTryOn(
  candidateSetToken: string,
  candidateId: string,
  personFileId: string,
  garmentCategory?: SearchCandidate['garmentCategory']
): Promise<CandidateTryOnTask> {
  return json<CandidateTryOnTask>('/api/tryon/candidate', {
    method: 'POST',
    body: JSON.stringify({candidateSetToken, candidateId, personFileId, garmentCategory})
  });
}

export async function getCandidateTryOn(taskId: string, bindingToken: string): Promise<CandidateTryOnStatus> {
  return json<CandidateTryOnStatus>('/api/tryon/candidate/status', {
    method: 'POST',
    body: JSON.stringify({taskId, bindingToken})
  });
}

export async function deleteCandidateTryOn(taskId: string, bindingToken: string) {
  return json<{deleted:true; candidateId:string}>('/api/tryon/candidate/delete', {
    method: 'POST',
    body: JSON.stringify({taskId, bindingToken})
  });
}

export async function pollCandidateTryOn(
  taskId: string,
  bindingToken: string,
  expectedCandidateId: string,
  expectedSourceItemId: string,
  onStatus?: (status:string)=>void
): Promise<string> {
  for (let attempt = 0; attempt < 90; attempt++) {
    const state = await getCandidateTryOn(taskId, bindingToken);
    if (state.binding.candidateId !== expectedCandidateId || state.binding.sourceItemId !== expectedSourceItemId) {
      throw new Error('CANDIDATE_VTO_BINDING_MISMATCH');
    }
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
