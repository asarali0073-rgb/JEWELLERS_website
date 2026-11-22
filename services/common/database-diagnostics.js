export function databaseErrorDetails(error) {
  const causes = new Set();
  const codes = new Set();
  const pending = [error];
  const seen = new Set();

  while (pending.length && seen.size < 20) {
    const current = pending.shift();
    if (!current || typeof current !== "object" || seen.has(current)) continue;
    seen.add(current);

    if (current !== error) {
      causes.add(
        `${current.name || "Error"}${current.code ? ` (${current.code})` : ""}`,
      );
    }
    if (current.code) codes.add(String(current.code));
    if (current.codeName) codes.add(String(current.codeName));
    if (current.cause) pending.push(current.cause);
    if (current.reason?.cause) pending.push(current.reason.cause);
    for (const server of current.reason?.servers?.values?.() || []) {
      if (server.error) pending.push(server.error);
    }
  }

  const allCodes = [...codes].join(" ");
  const authenticationFailure =
    codes.has("18") ||
    codes.has("AuthenticationFailed") ||
    /authentication failed/i.test(error?.message || "");
  const tlsFailure = /ERR_SSL|CERT_|TLS/i.test(allCodes);
  const dnsFailure = /ENOTFOUND|EAI_AGAIN|ENODATA/i.test(allCodes);
  const networkFailure =
    /ECONNREFUSED|ETIMEDOUT|EHOSTUNREACH|ENETUNREACH|ECONNRESET/i.test(
      allCodes,
    );
  const diagnosis = authenticationFailure
    ? "MongoDB rejected authentication. Verify the Atlas database user and URL-encoded credentials."
    : tlsFailure
      ? "The TLS handshake to MongoDB failed before authentication. Check Atlas cluster status and outbound network or TLS inspection; keep certificate validation enabled."
      : dnsFailure
        ? "MongoDB DNS resolution or node connection failed. Verify the Atlas SRV hostname and DNS/network access."
        : networkFailure
          ? "MongoDB nodes are unreachable. Check Atlas network access allowlists, outbound firewall rules, and cluster status."
          : error?.name === "MongooseServerSelectionError"
            ? "Mongoose could not select a MongoDB server. Verify Atlas cluster status, network access, and the service-specific MONGODB_URI."
            : undefined;

  return {
    name: error?.name || "Error",
    ...(error?.code ? { code: error.code } : {}),
    causes: [...causes],
    ...(diagnosis ? { diagnosis } : {}),
  };
}

export function logDatabaseError(serviceName, context, error) {
  console.error(`${serviceName} ${context}:`, databaseErrorDetails(error));
}
