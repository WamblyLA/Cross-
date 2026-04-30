import path from "path";
import { normalizePathCase } from "../../run/utils.js";

export function isCommandLikeExecutable(executablePath) {
  const normalized = `${executablePath ?? ""}`.trim();

  if (!normalized) {
    return false;
  }

  return !path.isAbsolute(normalized) && !/[\\/]/u.test(normalized) && !normalized.startsWith(".");
}

export function normalizeKernelExecutablePath(executablePath) {
  const normalized = `${executablePath ?? ""}`.trim();

  if (!normalized || isCommandLikeExecutable(normalized)) {
    return null;
  }

  return path.isAbsolute(normalized) ? path.resolve(normalized) : path.resolve(normalized);
}

export function buildInterpreterKernelId(interpreterPath) {
  return `interpreter:${normalizePathCase(path.resolve(interpreterPath))}`;
}

export function mergeNotebookKernelDescriptors(kernelspecDescriptors, interpreterDescriptors) {
  const existingInterpreterPaths = new Set(
    kernelspecDescriptors
      .filter((descriptor) => descriptor.kind === "python" && descriptor.interpreterPath)
      .map((descriptor) => normalizePathCase(descriptor.interpreterPath)),
  );
  const seenIds = new Set(kernelspecDescriptors.map((descriptor) => descriptor.id));
  const merged = [...kernelspecDescriptors];

  for (const descriptor of interpreterDescriptors) {
    const normalizedInterpreterPath = descriptor.interpreterPath
      ? normalizePathCase(descriptor.interpreterPath)
      : null;

    if (seenIds.has(descriptor.id)) {
      continue;
    }

    if (normalizedInterpreterPath && existingInterpreterPaths.has(normalizedInterpreterPath)) {
      continue;
    }

    seenIds.add(descriptor.id);
    merged.push(descriptor);
  }

  return merged.sort((left, right) => {
    if (left.isRecommended !== right.isRecommended) {
      return left.isRecommended ? -1 : 1;
    }

    if (left.launchKind !== right.launchKind) {
      return left.launchKind === "interpreter" ? -1 : 1;
    }

    return left.primaryLabel.localeCompare(right.primaryLabel, "ru");
  });
}
