import { afterEach, describe, expect, it, vi } from 'vitest';
import { firstLogoProblem, firstPhotoProblem } from './image-file';

describe('image file validation', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('accepts a wide logo without relaxing the hotel photo dimensions', async () => {
    vi.stubGlobal('createImageBitmap', async () => ({
      width: 800,
      height: 200,
      close: () => undefined,
    }));
    const file = new File([new Uint8Array([1])], 'wide-logo.png', { type: 'image/png' });

    await expect(firstLogoProblem([file])).resolves.toBeNull();
    await expect(firstPhotoProblem([file])).resolves.toContain('shorter side');
  });
});
