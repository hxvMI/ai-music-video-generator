import type { PersistedCreatorProjectInput } from "@/lib/projectPersistence";

const fileIds = new WeakMap<File, number>();
let nextFileId = 1;

// File contents are immutable, so an identity is enough to detect replacement
// without reading audio bytes or copying them into the comparison string.
export function getProjectSnapshotKey(project: PersistedCreatorProjectInput) {
  return JSON.stringify(project, (_key, value: unknown) => {
    if (typeof File !== "undefined" && value instanceof File) {
      if (!fileIds.has(value)) fileIds.set(value, nextFileId++);
      return { fileId: fileIds.get(value) };
    }
    return value;
  });
}
