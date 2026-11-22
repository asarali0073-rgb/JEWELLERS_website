import assert from "node:assert/strict";
import test from "node:test";
import { serviceErrorHandler } from "../../common/error-handler.js";

function invoke(error) {
  const result = {};
  const response = {
    headersSent: false,
    status(status) {
      result.status = status;
      return this;
    },
    json(body) {
      result.body = body;
      return this;
    },
  };
  const handler = serviceErrorHandler("Test Service");
  handler(error, {}, response, (nextError) => {
    result.nextError = nextError;
  });
  return result;
}

test("maps malformed JSON, validation, duplicate, and unavailable errors safely", () => {
  assert.deepEqual(
    invoke(Object.assign(new SyntaxError("private parser details"), {
      status: 400,
      type: "entity.parse.failed",
    })),
    {
      status: 400,
      body: { message: "Request body contains invalid JSON." },
    },
  );
  assert.equal(invoke({ name: "ValidationError" }).status, 400);
  assert.equal(invoke({ name: "MongoServerError", code: 11000 }).status, 409);

  const originalError = console.error;
  console.error = () => {};
  try {
    const unavailable = invoke({
      name: "MongoNetworkError",
      code: "ECONNRESET",
      message: "private connection string",
    });
    assert.equal(unavailable.status, 503);
    assert.equal(
      JSON.stringify(unavailable).includes("private connection string"),
      false,
    );
    assert.equal(invoke(new Error("unexpected")).status, 500);
  } finally {
    console.error = originalError;
  }
});
