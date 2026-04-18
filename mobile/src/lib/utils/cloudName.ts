export function normalizeCloudItemName(value: string) {
  return value.trim();
}

export function validateCloudItemName(value: string) {
  const normalized = normalizeCloudItemName(value);

  if (!normalized) {
    return "Имя обязательно.";
  }

  if (normalized.length > 255) {
    return "Имя должно быть не длиннее 255 символов.";
  }

  if (/[\\/]/.test(normalized)) {
    return "Имя не должно содержать символы / или \\.";
  }

  return null;
}
