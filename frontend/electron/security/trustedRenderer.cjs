function parseUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isTrustedRendererUrl(candidateValue, trustedValue) {
  const candidate = parseUrl(candidateValue);
  const trusted = parseUrl(trustedValue);

  if (!candidate || !trusted) {
    return false;
  }

  if (trusted.protocol === "file:") {
    return candidate.protocol === "file:" && candidate.pathname === trusted.pathname;
  }

  return candidate.origin === trusted.origin;
}

function isSafeExternalUrl(value) {
  const parsed = parseUrl(value);
  return parsed?.protocol === "https:" || parsed?.protocol === "http:";
}

module.exports = {
  isSafeExternalUrl,
  isTrustedRendererUrl,
};
