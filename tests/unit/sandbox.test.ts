// STATUS: unit tests for AgentSandboxClient — covers create, reconnect, executeCode, close.
// NEXT: add tests for timeout extension.
import { describe, it, expect, vi } from 'vitest';

const mockRun = vi.fn(async () => ({ exitCode: 0, stdout: 'ok', stderr: '' }));
const mockWriteFiles = vi.fn(async () => []);
const mockKill = vi.fn(async () => {});
const mockGetHost = vi.fn((port: number) => `sandbox-abc-${port}.e2b.dev`);

const mockSandboxInstance = {
  sandboxId: 'sbx_abc123',
  files: { writeFiles: mockWriteFiles },
  commands: { run: mockRun },
  getHost: mockGetHost,
  kill: mockKill,
};

vi.mock('e2b', () => ({
  Sandbox: {
    create: vi.fn(async () => mockSandboxInstance),
    connect: vi.fn(async () => mockSandboxInstance),
  },
}));

import { AgentSandboxClient } from '@/lib/sandbox/client';

describe('AgentSandboxClient.create', () => {
  it('creates a sandbox and exposes its ID', async () => {
    const client = await AgentSandboxClient.create('sess_1');
    expect(client.sandboxId).toBe('sbx_abc123');
  });
});

describe('AgentSandboxClient.reconnect', () => {
  it('connects to an existing sandbox by ID', async () => {
    const client = await AgentSandboxClient.reconnect('sess_1', 'sbx_abc123');
    expect(client.sandboxId).toBe('sbx_abc123');
  });
});

describe('executeCode', () => {
  it('writes files, runs command, returns previewUrl', async () => {
    const client = await AgentSandboxClient.create('sess_1');
    const result = await client.executeCode([{ path: 'index.ts', content: 'export {}' }]);
    expect(mockWriteFiles).toHaveBeenCalled();
    expect(mockRun).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.previewUrl).toBe('https://sandbox-abc-3000.e2b.dev');
  });

  it('returns success:false when exit code is non-zero', async () => {
    mockRun.mockResolvedValueOnce({ exitCode: 1, stdout: '', stderr: 'build failed' });
    const client = await AgentSandboxClient.create('sess_1');
    const result = await client.executeCode([]);
    expect(result.success).toBe(false);
    expect(result.error).toBe('build failed');
  });
});

describe('close', () => {
  it('kills the sandbox', async () => {
    const client = await AgentSandboxClient.create('sess_1');
    await client.close();
    expect(mockKill).toHaveBeenCalled();
  });
});
