import { toErrorMessage } from "../../run/utils.js";

function createDiagnostic(message, details = null) {
  return {
    source: "kernel-discovery",
    severity: "error",
    message,
    ...(details ? { details } : {}),
  };
}

function getErrorDiagnostics(error) {
  if (!error || typeof error !== "object" || !Array.isArray(error.diagnostics)) {
    return [];
  }

  return error.diagnostics.filter(
    (diagnostic) =>
      diagnostic &&
      typeof diagnostic === "object" &&
      typeof diagnostic.message === "string",
  );
}

function getCacheKey(options) {
  return options.workspaceRootPath ?? "__global__";
}

export function createKernelDiscoveryService({ bridge }) {
  const cache = new Map();
  const inflight = new Map();
  let refreshCounter = 0;

  async function discover(options = {}, forceRefresh = false) {
    const cacheKey = getCacheKey(options);

    if (!forceRefresh && cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    if (inflight.has(cacheKey)) {
      return inflight.get(cacheKey);
    }

    const startedAt = Date.now();
    const discoveryPromise = (async () => {
      try {
        const result = await bridge.listKernels({
          workspaceRootPath: options.workspaceRootPath ?? null,
        });
        const nextResult = {
          kernels: result.kernels ?? [],
          diagnostics: result.diagnostics ?? [],
          refreshId: ++refreshCounter,
          durationMs: Date.now() - startedAt,
        };

        cache.set(cacheKey, nextResult);
        return nextResult;
      } catch (error) {
        const diagnostics = getErrorDiagnostics(error);
        const nextResult = {
          kernels: [],
          diagnostics:
            diagnostics.length > 0
                ? diagnostics
              : [
                  createDiagnostic(
                    "Failed to load Jupyter kernels.",
                    toErrorMessage(error, "Kernel discovery failed."),
                  ),
                ],
          refreshId: ++refreshCounter,
          durationMs: Date.now() - startedAt,
        };

        cache.set(cacheKey, nextResult);
        return nextResult;
      } finally {
        inflight.delete(cacheKey);
      }
    })();

    inflight.set(cacheKey, discoveryPromise);
    return discoveryPromise;
  }

  return {
    listKernels(options) {
      return discover(options, false);
    },
    refreshKernels(options) {
      return discover(options, true);
    },
    clearCache() {
      cache.clear();
    },
  };
}
