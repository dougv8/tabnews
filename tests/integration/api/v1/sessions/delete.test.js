import orchestrator from "tests/orchestrator.js";
import { version as uuidVersion } from "uuid";
import session from "models/session.js";
import { expect, jest } from "@jest/globals";
import setCookieParser from "set-cookie-parser";
import webserver from "infra/webserver.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("DELETE /api/v1/sessions", () => {
  describe("Default user", () => {
    test("With nonexistent session", async () => {
      const nonexistentToken =
        "993744fa7abcde6e059e1f44272a27be062b9d6f34ed9a8c656ae1f966f8bba834d591069a10be1b61e0e9ef7db22500";

      const response = await fetch(`${webserver.origin}/api/v1/sessions`, {
        method: "DELETE",
        headers: {
          Cookie: `session_id=${nonexistentToken}`,
        },
      });

      expect(response.status).toBe(401);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "UnauthorizedError",
        message: "Usuário não possui sessão válida.",
        action: "Verifique se este usuário está logado e tente novamente.",
        status_code: 401,
      });
    });

    test("With expired session", async () => {
      jest.useFakeTimers({
        now: new Date(Date.now() - session.EXPIRATION_IN_MILLISECONDS),
      });

      const createdUser = await orchestrator.createUSer();

      const sessionObject = await orchestrator.createSession(createdUser);

      jest.useRealTimers();

      const response = await fetch(`${webserver.origin}/api/v1/sessions`, {
        method: "DELETE",
        headers: {
          Cookie: `session_id=${sessionObject.token}`,
        },
      });

      expect(response.status).toBe(401);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "UnauthorizedError",
        message: "Usuário não possui sessão válida.",
        action: "Verifique se este usuário está logado e tente novamente.",
        status_code: 401,
      });
    });

    test("With valid session", async () => {
      const createdUser = await orchestrator.createUSer({
        username: "userWithValidSession",
      });

      const sessionObject = await orchestrator.createSession(createdUser);

      const response = await fetch(`${webserver.origin}/api/v1/sessions`, {
        method: "DELETE",
        headers: {
          Cookie: `session_id=${sessionObject.token}`,
        },
      });

      expect(response.status).toBe(200);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        id: sessionObject.id,
        token: sessionObject.token,
        user_id: sessionObject.user_id,
        expires_at: responseBody.expires_at,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });
      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.expires_at)).not.toBeNaN();
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();

      expect(
        responseBody.expires_at < sessionObject.expires_at.toISOString(),
      ).toBe(true);
      expect(
        responseBody.updated_at > sessionObject.updated_at.toISOString(),
      ).toBe(true);

      //Set-Cookie assertions
      const parsedCookie = setCookieParser(response, { map: true });

      expect(parsedCookie.session_id).toEqual({
        name: "session_id",
        value: "invalid",
        maxAge: -1,
        path: "/",
        httpOnly: true,
      });

      //Double check assertions
      const doubleCheckResponse = await fetch(
        `${webserver.origin}/api/v1/user`,
        {
          method: "GET",
          headers: {
            Cookie: `session_id=${sessionObject.token}`,
          },
        },
      );

      expect(doubleCheckResponse.status).toBe(401);

      const doubleCheckResponseBody = await doubleCheckResponse.json();
      expect(doubleCheckResponseBody).toEqual({
        name: "UnauthorizedError",
        message: "Usuário não possui sessão válida.",
        action: "Verifique se este usuário está logado e tente novamente.",
        status_code: 401,
      });
    });
  });
});
