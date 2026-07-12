import type { DocumentId, DocumentWriteBinding, SaveTargetId } from "./types";

export interface WritableFileStreamLike {
  write(data: Uint8Array): Promise<void>;
  close(): Promise<void>;
}

export interface FileSystemFileHandleLike {
  readonly name: string;
  createWritable(): Promise<WritableFileStreamLike>;
}

type RegistryEntry = {
  binding: DocumentWriteBinding;
  handle: FileSystemFileHandleLike;
};

export class TransientWriteBindingRegistry {
  private readonly entries = new Map<SaveTargetId, RegistryEntry>();
  private sequence = 0;

  register(documentId: DocumentId, fileName: string, handle: FileSystemFileHandleLike): DocumentWriteBinding {
    this.releaseDocument(documentId);
    const targetId = `save-target:${++this.sequence}` as SaveTargetId;
    const binding: DocumentWriteBinding = { documentId, targetId, strategy: "file-system-access", fileName };
    this.entries.set(targetId, { binding, handle });
    return binding;
  }

  resolve(documentId: DocumentId, targetId: SaveTargetId): FileSystemFileHandleLike | null {
    const entry = this.entries.get(targetId);
    return entry?.binding.documentId === documentId ? entry.handle : null;
  }

  bindingFor(documentId: DocumentId, targetId: SaveTargetId): DocumentWriteBinding | null {
    const entry = this.entries.get(targetId);
    return entry?.binding.documentId === documentId ? entry.binding : null;
  }

  has(binding: DocumentWriteBinding): boolean {
    return this.resolve(binding.documentId, binding.targetId) !== null;
  }

  releaseDocument(documentId: DocumentId): void {
    for (const [targetId, entry] of this.entries) {
      if (entry.binding.documentId === documentId) this.entries.delete(targetId);
    }
  }

  clear(): void {
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }
}
