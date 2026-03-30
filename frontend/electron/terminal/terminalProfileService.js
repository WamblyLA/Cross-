import {
  createFallbackTerminalProfiles,
  discoverTerminalProfiles,
} from "./terminalProfileDiscovery.js";

function cloneProfile(profile, defaultProfileId) {
  return {
    ...profile,
    isDefault: profile.id === defaultProfileId,
  };
}

function normalizeProfiles(profiles) {
  return Array.isArray(profiles)
    ? profiles.filter(
        (profile) =>
          profile &&
          typeof profile.id === "string" &&
          typeof profile.label === "string" &&
          typeof profile.command === "string",
      )
    : [];
}

export function createTerminalProfileService({ preferencesStore, onProfilesChanged }) {
  let profiles = createFallbackTerminalProfiles();
  let defaultProfileId = profiles[0]?.id ?? null;
  let discoveryStatus = "idle";
  let initialized = false;
  let discoveryPromise = null;

  async function ensureInitialized() {
    if (initialized) {
      return;
    }

    const preferences = await preferencesStore.getPreferences();
    const cachedProfiles = normalizeProfiles(preferences.cachedProfiles);

    if (cachedProfiles.length > 0) {
      profiles = cachedProfiles;
    }

    defaultProfileId =
      typeof preferences.defaultProfileId === "string" &&
      profiles.some((profile) => profile.id === preferences.defaultProfileId)
        ? preferences.defaultProfileId
        : profiles[0]?.id ?? null;
    initialized = true;
  }

  function getSnapshot() {
    return {
      profiles: profiles.map((profile) => cloneProfile(profile, defaultProfileId)),
      defaultProfileId,
      discoveryStatus,
    };
  }

  async function emitProfilesChanged() {
    await Promise.resolve(onProfilesChanged?.(getSnapshot()));
  }

  async function listProfiles() {
    await ensureInitialized();
    return getSnapshot();
  }

  async function setDefaultProfile(profileId) {
    await ensureInitialized();

    if (!profiles.some((profile) => profile.id === profileId)) {
      throw new Error("Выбранный профиль терминала недоступен.");
    }

    defaultProfileId = profileId;
    await preferencesStore.setDefaultProfileId(profileId);
    await emitProfilesChanged();
    return getSnapshot();
  }

  async function startDiscovery() {
    await ensureInitialized();

    if (discoveryPromise) {
      return discoveryPromise;
    }

    discoveryStatus = "loading";
    await emitProfilesChanged();

    discoveryPromise = (async () => {
      try {
        const discoveredProfiles = await discoverTerminalProfiles();

        if (discoveredProfiles.length > 0) {
          profiles = discoveredProfiles;

          if (!profiles.some((profile) => profile.id === defaultProfileId)) {
            defaultProfileId = profiles[0]?.id ?? null;
            await preferencesStore.setDefaultProfileId(defaultProfileId);
          }

          await preferencesStore.setCachedProfiles(profiles);
        }

        discoveryStatus = "ready";
      } catch {
        discoveryStatus = "error";
      } finally {
        discoveryPromise = null;
        await emitProfilesChanged();
      }

      return getSnapshot();
    })();

    return discoveryPromise;
  }

  async function resolveLaunchCandidates(profileId) {
    await ensureInitialized();

    const preferredIds = [
      profileId,
      defaultProfileId,
      profiles[0]?.id ?? null,
    ].filter(Boolean);
    const usedIds = new Set();
    const launchCandidates = [];

    for (const preferredId of preferredIds) {
      if (usedIds.has(preferredId)) {
        continue;
      }

      const profile = profiles.find((entry) => entry.id === preferredId);

      if (!profile) {
        continue;
      }

      usedIds.add(profile.id);
      launchCandidates.push(profile);
    }

    for (const profile of profiles) {
      if (usedIds.has(profile.id)) {
        continue;
      }

      usedIds.add(profile.id);
      launchCandidates.push(profile);
    }

    if (launchCandidates.length > 0) {
      return launchCandidates;
    }

    const fallbackProfiles = createFallbackTerminalProfiles();

    return fallbackProfiles.filter((profile) => {
      if (usedIds.has(profile.id)) {
        return false;
      }

      usedIds.add(profile.id);
      return true;
    });
  }

  return {
    getSnapshot,
    listProfiles,
    setDefaultProfile,
    startDiscovery,
    resolveLaunchCandidates,
  };
}
