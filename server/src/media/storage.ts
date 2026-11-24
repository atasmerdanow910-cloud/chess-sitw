import { Injectable } from '@nestjs/common';
import { createReadStream } from 'node:fs';
import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';

import { getEnv } from '../config/env.js';

/**
 * Where files live. Local disk outside any web root.
 * Can be swapped for S3/MinIO later without touching the rest of the code.
 */
export abstract class MediaStorage {
  abstract put(key: string, data: Buffer): Promise<void>;
  abstract open(key: string): Promise<{ stream: Readable; size: number } | null>;
  abstract remove(key: string): Promise<void>;
}

@Injectable()
export class LocalMediaStorage extends MediaStorage {
  private readonly root = path.resolve(getEnv().MEDIA_DIR);

  private resolve(key: string): string {
    if (!/^[a-z0-9/._-]+$/.test(key) || key.includes('..')) throw new Error('bad storage key');
    const full = path.resolve(this.root, key);
    if (!full.startsWith(this.root + path.sep)) throw new Error('bad storage key');
    return full;
  }

  async put(key: string, data: Buffer): Promise<void> {
    const full = this.resolve(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data, { mode: 0o640 });
  }

  async open(key: string): Promise<{ stream: Readable; size: number } | null> {
    const full = this.resolve(key);
    try {
      const info = await stat(full);
      return { stream: createReadStream(full), size: info.size };
    } catch {
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    await rm(this.resolve(key), { force: true });
  }
}
