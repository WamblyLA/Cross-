import fsSync from "fs";
import fs from "fs/promises";
import path from "path";

const STORE_FILE_NAME = "terminal-preferences.json";

function createDefaultStore() {
  return {
    version: 1,
    defaultProfileId: null,
    cachedProfiles: [],
  };
}

export function createTerminalPreferencesStore({ app }) {
  const getStoreFilePath = () => path.join(app.getPath("userData"), STORE_FILE_NAME);

  async function readStore() {
    const storeFilePath = getStoreFilePath();

    if (!fsSync.existsSync(storeFilePath)) {
      return createDefaultStore();
    }

    try {
      const rawText = await fs.readFile(storeFilePath, "utf-8");
      const parsedStore = JSON.parse(rawText);

      return {
        version: 1,
        defaultProfileId:
          typeof parsedStore?.defaultProfileId === "string"
            ? parsedStore.defaultProfileId
            : null,
        cachedProfiles: Array.isArray(parsedStore?.cachedProfiles)
          ? parsedStore.cachedProfiles
          : [],
      };
    } catch {
      return createDefaultStore();
    }
  }

  async function writeStore(nextStore) {
    const storeFilePath = getStoreFilePath();
    await fs.writeFile(storeFilePath, JSON.stringify(nextStore, null, 2), "utf-8");
  }

  async function getPreferences() {
    return readStore();
  }

  async function setDefaultProfileId(profileId) {
    const store = await readStore();
    store.defaultProfileId = typeof profileId === "string" ? profileId : null;
    await writeStore(store);
    return store.defaultProfileId;
  }

  async function setCachedProfiles(profiles) {
    const store = await readStore();
    store.cachedProfiles = Array.isArray(profiles) ? profiles : [];
    await writeStore(store);
    return store.cachedProfiles;
  }

  return {
    getPreferences,
    setDefaultProfileId,
    setCachedProfiles,
  };
}
