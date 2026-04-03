import fsSync from "fs";
import fs from "fs/promises";
import path from "path";

const STORE_FILE_NAME = "linked-workspaces.json";

function createDefaultStore() {
  return {
    version: 1,
    bindings: [],
  };
}

function looksLikeBrokenCyrillic(value) {
  return /(?:Р.|С.)/.test(`${value ?? ""}`);
}

function sanitizeBinding(binding) {
  return {
    bindingId: `${binding?.bindingId ?? ""}`.trim(),
    clientBindingKey: `${binding?.clientBindingKey ?? ""}`.trim(),
    projectId: `${binding?.projectId ?? ""}`.trim(),
    projectName: looksLikeBrokenCyrillic(binding?.projectName) ? "" : `${binding?.projectName ?? ""}`,
    localRootPath: `${binding?.localRootPath ?? ""}`.trim(),
    localRootLabel: looksLikeBrokenCyrillic(binding?.localRootLabel)
      ? ""
      : `${binding?.localRootLabel ?? ""}`.trim(),
    lastKnownState: `${binding?.lastKnownState ?? "linked_ready"}`.trim() || "linked_ready",
    updatedAt: `${binding?.updatedAt ?? new Date().toISOString()}`,
  };
}

export function createLinkBindingStore({ app }) {
  const getStoreFilePath = () => path.join(app.getPath("userData"), STORE_FILE_NAME);

  async function readStore() {
    const storeFilePath = getStoreFilePath();

    if (!fsSync.existsSync(storeFilePath)) {
      return createDefaultStore();
    }

    try {
      const rawText = await fs.readFile(storeFilePath, "utf-8");
      const parsed = JSON.parse(rawText);

      return {
        version: 1,
        bindings: Array.isArray(parsed?.bindings) ? parsed.bindings.map(sanitizeBinding) : [],
      };
    } catch {
      return createDefaultStore();
    }
  }

  async function writeStore(nextStore) {
    const storeFilePath = getStoreFilePath();
    await fs.writeFile(storeFilePath, JSON.stringify(nextStore, null, 2), "utf-8");
  }

  async function listBindings() {
    return (await readStore()).bindings;
  }

  async function saveBinding(binding) {
    const store = await readStore();
    const nextBinding = sanitizeBinding(binding);
    const nextBindings = store.bindings.filter((item) => item.bindingId !== nextBinding.bindingId);
    nextBindings.unshift(nextBinding);
    store.bindings = nextBindings;
    await writeStore(store);
    return nextBinding;
  }

  async function removeBinding(bindingId) {
    const store = await readStore();
    store.bindings = store.bindings.filter((item) => item.bindingId !== bindingId);
    await writeStore(store);
  }

  return {
    listBindings,
    saveBinding,
    removeBinding,
  };
}
