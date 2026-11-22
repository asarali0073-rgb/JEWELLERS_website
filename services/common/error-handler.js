function isUnavailableError(error) {
  return (
    /Mongo(Network|ServerSelection|NotConnected|TopologyClosed)/.test(
      error.name || "",
    ) ||
    error.name === "MongooseServerSelectionError" ||
    error.name === "MongooseError" && /buffering timed out/i.test(error.message)
  );
}

export function serviceErrorHandler(serviceName, extraHandler) {
  return (error, _req, res, next) => {
    if (res.headersSent) {
      next(error);
      return;
    }

    if (extraHandler?.(error, res)) return;

    if (
      error?.type === "entity.parse.failed" ||
      error instanceof SyntaxError && error.status === 400
    ) {
      res.status(400).json({ message: "Request body contains invalid JSON." });
      return;
    }

    if (error?.type === "entity.too.large") {
      res.status(413).json({ message: "Request body is too large." });
      return;
    }

    if (
      error?.name === "ValidationError" ||
      error?.name === "CastError"
    ) {
      res.status(400).json({ message: "Request data is invalid." });
      return;
    }

    if (error?.code === 11000) {
      res.status(409).json({ message: "A record with these values already exists." });
      return;
    }

    if (isUnavailableError(error)) {
      console.error(`${serviceName} request failed:`, {
        name: error.name,
        code: error.code,
      });
      res.status(503).json({ message: "Database service is temporarily unavailable." });
      return;
    }

    console.error(`${serviceName} request failed:`, {
      name: error?.name || "Error",
      code: error?.code,
    });
    res.status(500).json({ message: "Internal server error." });
  };
}
