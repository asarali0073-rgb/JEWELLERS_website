import assert from "node:assert/strict";
import test from "node:test";
import { databaseErrorDetails } from "../../common/database-diagnostics.js";

test("reports nested database error codes without logging sensitive messages", () => {
  const error = new Error("mongodb+srv://private-user:private-password@private-host");
  error.name = "MongooseServerSelectionError";
  error.reason = {
    servers: new Map([
      [
        "private-host",
        {
          error: Object.assign(new Error("private connection details"), {
            name: "MongoNetworkError",
            cause: Object.assign(new Error("TLS failure"), {
              code: "ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR",
            }),
          }),
        },
      ],
    ]),
  };

  const details = databaseErrorDetails(error);
  assert.deepEqual(details, {
    name: "MongooseServerSelectionError",
    causes: [
      "MongoNetworkError",
      "Error (ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR)",
    ],
    diagnosis:
      "The TLS handshake to MongoDB failed before authentication. Check Atlas cluster status and outbound network or TLS inspection; keep certificate validation enabled.",
  });
  assert.equal(JSON.stringify(details).includes("private-password"), false);
  assert.equal(JSON.stringify(details).includes("private-host"), false);
});

test("classifies DNS, network, and authentication failures without echoing details", () => {
  const cases = [
    [
      Object.assign(new Error("private DNS host"), { code: "ENOTFOUND" }),
      /DNS resolution/,
    ],
    [
      Object.assign(new Error("private network address"), { code: "ETIMEDOUT" }),
      /nodes are unreachable/,
    ],
    [
      Object.assign(new Error("private credential details"), {
        code: 18,
        codeName: "AuthenticationFailed",
      }),
      /rejected authentication/,
    ],
  ];

  for (const [error, diagnosis] of cases) {
    const details = databaseErrorDetails(error);
    assert.match(details.diagnosis, diagnosis);
    assert.equal(JSON.stringify(details).includes("private"), false);
  }
});
