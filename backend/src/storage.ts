import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Armazenamento local em disco para o MVP (testagem local, sem credencial de
 * nuvem). ARCHITECTURE.md propõe um bucket compatível com S3 para produção —
 * a troca é só desta implementação, o resto do código conhece apenas
 * `storagePath`.
 */
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.resolve("uploads");

export async function salvarArquivo(pedidoId: string, filename: string, buffer: Buffer): Promise<string> {
  const dir = path.join(UPLOAD_DIR, pedidoId);
  await mkdir(dir, { recursive: true });
  const storagePath = path.join(pedidoId, `${randomUUID()}-${filename}`);
  await writeFile(path.join(UPLOAD_DIR, storagePath), buffer);
  return storagePath;
}

export async function lerArquivo(storagePath: string): Promise<Buffer> {
  return readFile(path.join(UPLOAD_DIR, storagePath));
}
