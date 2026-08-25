import { afterEach, describe, expect, it, vi } from 'vitest';
import { PerfectCorpProvider } from './index';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PerfectCorpProvider candidate references', () => {
  it('uses ref_file_url for a signed remote garment reference', async () => {
    let requestBody: any = null;
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      requestBody = JSON.parse(String(init?.body ?? '{}'));
      return new Response(JSON.stringify({status: 200, data: {task_id: 'task-12345678'}}), {
        status: 200,
        headers: {'content-type': 'application/json'}
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const provider = new PerfectCorpProvider('test-key');
    const result = await provider.createTryOn({
      personFileId: 'person-file-id',
      garmentFileUrl: 'https://images.example.test/jacket.jpg',
      garmentCategory: 'outerwear'
    });

    expect(result.taskId).toBe('task-12345678');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(requestBody).toMatchObject({
      src_file_id: 'person-file-id',
      ref_file_url: 'https://images.example.test/jacket.jpg',
      garment_category: 'outerwear'
    });
    expect(requestBody.ref_file_id).toBeUndefined();
  });

  it('refuses an ambiguous garment ID plus garment URL before calling Perfect', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const provider = new PerfectCorpProvider('test-key');
    await expect(provider.createTryOn({
      personFileId: 'person-file-id',
      garmentFileId: 'garment-file-id',
      garmentFileUrl: 'https://images.example.test/jacket.jpg'
    })).rejects.toThrow('PERFECT_REFERENCE_INVALID');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requires one garment reference before calling Perfect', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const provider = new PerfectCorpProvider('test-key');
    await expect(provider.createTryOn({personFileId: 'person-file-id'}))
      .rejects.toThrow('PERFECT_REFERENCE_INVALID');

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
