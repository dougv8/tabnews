import crypto from "node:crypto";
import dataBase from "infra/database.js";
import { UnauthorizedError } from "infra/errors.js";

const EXPIRATION_IN_MILLISECONDS = 60 * 60 * 24 * 30 * 1000; // 30 Days

async function create(userId) {
  const token = crypto.randomBytes(48).toString("hex");
  const expiresAt = new Date(Date.now() + EXPIRATION_IN_MILLISECONDS);
  const newSession = await runInsertQuery(token, userId, expiresAt);

  return newSession;

  async function runInsertQuery(token, userId, expiresAt) {
    const result = await dataBase.query({
      text: `
      INSERT INTO 
        sessions (token, user_id, expires_at) 
      VALUES 
        ($1, $2, $3)
      RETURNING
        *
      ;`,
      values: [token, userId, expiresAt],
    });

    return result.rows[0];
  }
}

async function findOneValidByToken(sessionToken) {
  const sessionFound = runSelectQuery(sessionToken);
  return sessionFound;

  async function runSelectQuery(sessionToken) {
    const result = await dataBase.query({
      text: `
      SELECT
        *
      FROM
        sessions
      WHERE 
        token=$1
        AND expires_at > NOW()
      LIMIT
        1
      ;`,
      values: [sessionToken],
    });

    if (result.rowCount === 0) {
      throw new UnauthorizedError({
        message: "Usuário não possui sessão válida.",
        action: "Verifique se este usuário está logado e tente novamente.",
      });
    }

    return result.rows[0];
  }
}

async function renew(sessionId) {
  const expiresAt = new Date(Date.now() + EXPIRATION_IN_MILLISECONDS);
  const renewSessionObject = runUpdateQuery(sessionId, expiresAt);
  return renewSessionObject;

  async function runUpdateQuery(sessionId, expiresAt) {
    const result = await dataBase.query({
      text: `
      UPDATE 
        sessions
      SET 
        expires_at = $2,
        updated_at = timezone('utc', now())
      WHERE
        id= $1
      RETURNING
      *
      ;`,
      values: [sessionId, expiresAt],
    });

    return result.rows[0];
  }
}

async function expireById(sessionId) {
  const renewSessionObject = runUpdateQuery(sessionId);
  return renewSessionObject;

  async function runUpdateQuery(sessionId) {
    const result = await dataBase.query({
      text: `
      UPDATE 
        sessions
      SET 
        expires_at = expires_at - interval '1 year',
        updated_at = timezone('utc', now())
      WHERE
        id= $1
      RETURNING
      *
      ;`,
      values: [sessionId],
    });

    return result.rows[0];
  }
}

const session = {
  create,
  findOneValidByToken,
  renew,
  expireById,
  EXPIRATION_IN_MILLISECONDS,
};

export default session;
