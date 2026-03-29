import { toErrorMessage } from "../../run/utils.js";

function createDiagnostic(message, details = null) {
  return {
    source: "kernel-discovery",
    severity: "error",
    message,
    ...(details ? { details } : {}),
  };
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
        const nextResult = {
          kernels: [],
          diagnostics: [
            createDiagnostic(
              "Не удалось загрузить список ядер Jupyter.",
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
