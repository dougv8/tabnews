import orchestrator from "tests/orchestrator.js";
import { version as uuidVersion } from "uuid";
import user from "models/user.js";
import password from "models/password.js";
import webserver from "infra/webserver.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("PATCH /api/v1/users/[username]", () => {
  describe("Anonymous user", () => {
    test("With unique `username`", async () => {
      const newUser = await orchestrator.createUser();

      const response = await fetch(
        `${webserver.origin}/api/v1/users/${newUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: "uniqueUser2",
          }),
        },
      );
      expect(response.status).toBe(403);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        action: 'Verifique se o seu usuário possui a feature: "update:user".',
        message: "Você não possui permissão para executar essa ação.",
        name: "ForbiddenError",
        status_code: 403,
      });
    });
  });
  describe("Default user", () => {
    test("With nonexistente `username`", async () => {
      const user1 = await orchestrator.createUser();
      await orchestrator.activateUser(user1);
      const user1SessionObject = await orchestrator.createSession(user1);

      const response = await fetch(
        "http://localhost:3000/api/v1/users/UsuarioInexistente",
        {
          method: "PATCH",
          headers: {
            Cookie: `session_id=${user1SessionObject.token}`,
          },
        },
      );

      expect(response.status).toBe(404);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "NotFoundError",
        message: "O username informado não foi encontrado no sistema.",
        action: "Verifique se o username foi digitado corretamente.",
        status_code: 404,
      });
    });

    test("With duplicated `username`", async () => {
      await orchestrator.createUser({
        username: "user1",
      });

      const createdUser2 = await orchestrator.createUser({
        username: "user2",
      });

      await orchestrator.activateUser(createdUser2);
      const sessionObjectUser2 = await orchestrator.createSession(createdUser2);

      const response = await fetch("http://localhost:3000/api/v1/users/user2", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${sessionObjectUser2.token}`,
        },
        body: JSON.stringify({
          username: "user1",
        }),
      });
      expect(response.status).toBe(400);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "O username informado já está sendo utilizado.",
        action: "Utilize outro username para realizar esta operação.",
        status_code: 400,
      });
    });

    test("With `userB` targeting `userA`", async () => {
      await orchestrator.createUser({
        username: "userA",
      });

      const createdUserB = await orchestrator.createUser({
        username: "userB",
      });

      await orchestrator.activateUser(createdUserB);
      const sessionObjectUserB = await orchestrator.createSession(createdUserB);

      const response = await fetch("http://localhost:3000/api/v1/users/userA", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${sessionObjectUserB.token}`,
        },
        body: JSON.stringify({
          username: "userC",
        }),
      });
      expect(response.status).toBe(403);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para atualizar outro usuário.",
        action:
          "Verifique se você possui a feature necessária para atualizar outro usuário.",
        status_code: 403,
      });
    });

    test("With duplicated `email`", async () => {
      await orchestrator.createUser({
        email: "email1@gmail.com",
      });

      const createdUser2 = await orchestrator.createUser({
        email: "email2@gmail.com",
      });

      await orchestrator.activateUser(createdUser2);
      const sessionObjectUser2 = await orchestrator.createSession(createdUser2);

      const response = await fetch(
        `${webserver.origin}/api/v1/users/${createdUser2.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObjectUser2.token}`,
          },
          body: JSON.stringify({
            email: "email1@gmail.com",
          }),
        },
      );
      expect(response.status).toBe(400);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "O email informado já está sendo utilizado.",
        action: "Utilize outro email para realizar esta operação.",
        status_code: 400,
      });
    });

    test("With unique `username`", async () => {
      const newUser = await orchestrator.createUser();
      await orchestrator.activateUser(newUser);
      const sessionObjectUser = await orchestrator.createSession(newUser);

      const response = await fetch(
        `${webserver.origin}/api/v1/users/${newUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObjectUser.token}`,
          },
          body: JSON.stringify({
            username: "uniqueUser2",
          }),
        },
      );
      expect(response.status).toBe(200);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        id: responseBody.id,
        username: "uniqueUser2",
        features: ["create:session", "read:session", "update:user"],
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });
      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();
      expect(responseBody.updated_at > responseBody.created_at).toBe(true);
    });

    test("With unique `email`", async () => {
      const newUser = await orchestrator.createUser();
      await orchestrator.activateUser(newUser);
      const sessionObjectUser = await orchestrator.createSession(newUser);

      const response = await fetch(
        `${webserver.origin}/api/v1/users/${newUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObjectUser.token}`,
          },
          body: JSON.stringify({
            email: "uniqueEmail2@gmail.com",
          }),
        },
      );
      expect(response.status).toBe(200);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        id: responseBody.id,
        username: newUser.username,
        features: ["create:session", "read:session", "update:user"],
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });
      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();
      expect(responseBody.updated_at > responseBody.created_at).toBe(true);

      const userInDatabase = await user.findOneByUsername(newUser.username);
      expect(userInDatabase.email).toBe("uniqueEmail2@gmail.com");
    });

    test("With new `password`", async () => {
      const newUser = await orchestrator.createUser();
      await orchestrator.activateUser(newUser);
      const sessionObjectUser = await orchestrator.createSession(newUser);

      const response = await fetch(
        `${webserver.origin}/api/v1/users/${newUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObjectUser.token}`,
          },
          body: JSON.stringify({
            password: "newPassword2",
          }),
        },
      );
      expect(response.status).toBe(200);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        id: responseBody.id,
        username: newUser.username,
        features: ["create:session", "read:session", "update:user"],
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });
      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();
      expect(responseBody.updated_at > responseBody.created_at).toBe(true);

      const findUserInDatabase = await user.findOneByUsername(newUser.username);
      const correctPasswordMatch = await password.compare(
        "newPassword2",
        findUserInDatabase.password,
      );
      expect(correctPasswordMatch).toBe(true);

      const incorrectPasswordMatch = await password.compare(
        newUser.password,
        findUserInDatabase.password,
      );
      expect(incorrectPasswordMatch).toBe(false);
    });
  });
  describe("Privileged user", () => {
    test("With `update:user:others` targeting `defaultUser`", async () => {
      const privilegedUser = await orchestrator.createUser();
      const activatedPrivilegeUser =
        await orchestrator.activateUser(privilegedUser);

      await orchestrator.addFeaturesToUser(privilegedUser, [
        "update:user:others",
      ]);

      const privilegedUserSession = await orchestrator.createSession(
        activatedPrivilegeUser,
      );

      const defaultUser = await orchestrator.createUser();

      const response = await fetch(
        `${webserver.origin}/api/v1/users/${defaultUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${privilegedUserSession.token}`,
          },
          body: JSON.stringify({
            username: "AlteredForPrivileged",
          }),
        },
      );
      expect(response.status).toBe(200);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        id: defaultUser.id,
        username: "AlteredForPrivileged",
        features: ["read:activation_token"],
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });
      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();
      expect(responseBody.updated_at > responseBody.created_at).toBe(true);
    });
  });
});
