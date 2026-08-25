import { afterEach, describe, expect, it, vi } from 'vitest';
import { PerfectCorpProvider } from './index';

afterEach(() => vi.restoreAllMocks());

describe('PerfectCorpProvider', () => {
  it('creates a direct-upload ticket without returning the API key', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({status:200,data:{files:[{file_id:'file-1',requests:[{method:'PUT',url:'https://upload.example/presigned',headers:{'Content-Type':'image/jpeg'}}]}]}}),{status:200,headers:{'content-type':'application/json'}}));
    const provider = new PerfectCorpProvider('secret-key');
    const ticket = await provider.createUploadTicket({fileName:'person.jpg',fileSize:1234,contentType:'image/jpeg'});
    expect(ticket.fileId).toBe('file-1');
    expect(ticket.url).toContain('presigned');
    expect(JSON.stringify(ticket)).not.toContain('secret-key');
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('binds person and garment file ids into cloth-v4 with auto category', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({status:200,data:{task_id:'task-1'}}),{status:200,headers:{'content-type':'application/json'}}));
    const provider = new PerfectCorpProvider('secret-key');
    await provider.createTryOn({personFileId:'person-1',garmentFileId:'garment-1'});
    const [, init] = fetchMock.mock.calls[0];
    expect(String(fetchMock.mock.calls[0][0])).toContain('/s2s/v2.0/task/cloth-v4');
    expect(String(init?.body)).toContain('person-1');
    expect(String(init?.body)).toContain('garment-1');
    expect(String(init?.body)).toContain('auto');
  });

  it('uses Perfect task management cleanup for finished task resources', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({status:200}),{status:200,headers:{'content-type':'application/json'}}));
    const provider = new PerfectCorpProvider('secret-key');
    await provider.deleteTask('task-1');
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/s2s/v2.0/task/delete');
    expect(init?.method).toBe('POST');
    expect(String(init?.body)).toContain('task-1');
  });
});
