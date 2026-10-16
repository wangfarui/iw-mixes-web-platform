import {
  importDirectoryFiles,
  mergeSnapshots,
  namespaceImportedSnapshot,
  normalizeSnapshot,
  validateSnapshot,
} from "../utils/skillWorkbench/core";
self.onmessage = async ({ data }) => {
  try {
    const snapshot =
      data.kind === "import"
        ? mergeSnapshots(
            data.base,
            await importDirectoryFiles(data.files, data.source),
          )
        : data.kind === "snapshot"
          ? mergeSnapshots(
              data.base,
              namespaceImportedSnapshot(
                validateSnapshot(JSON.parse(await data.file.text())),
                crypto.randomUUID(),
              ),
            )
          : data.snapshot;
    self.postMessage({ snapshot, records: normalizeSnapshot(snapshot) });
  } catch (error) {
    self.postMessage({ error: (error as Error).message });
  }
};
