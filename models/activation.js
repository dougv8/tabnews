import email from "infra/email.js";
import dataBase from "infra/database.js";
import webserver from "infra/webserver.js";
import { NotFoundError } from "infra/errors.js";
import user from "models/user.js";

const EXPIRATION_IN_MILLISECONDS = 60 * 15 * 1000; // 15 Minutes

async function create(userId) {
  const expiresAt = new Date(Date.now() + EXPIRATION_IN_MILLISECONDS);

  const newToken = await runInsertQuery(userId, expiresAt);
  return newToken;

  async function runInsertQuery(userId, expiresAt) {
    const result = await dataBase.query({
      text: `
      INSERT INTO 
        user_activation_tokens (user_id, expires_at)
      VALUES 
        ($1, $2)
      RETURNING
        *
      ;`,
      values: [userId, expiresAt],
    });

    return result.rows[0];
  }
}

async function findOneValidById(id) {
  const userFound = await runSelectQuery(id);
  return userFound;

  async function runSelectQuery(id) {
    const result = await dataBase.query({
      text: `
      SELECT 
        *
      FROM
        user_activation_tokens
      WHERE 
        id=$1
        AND used_at IS NULL
        AND expires_at > NOW()
      LIMIT
        1
      ;`,
      values: [id],
    });

    if (result.rowCount === 0) {
      throw new NotFoundError({
        message:
          "O token de ativação não foi encontrado no sistema ou expirou.",
        action: "Faça um novo cadastro.",
      });
    }
    return result.rows[0];
  }
}

async function sendEmailToUser(user, activationToken) {
  await email.send({
    from: "Fintab <contato@fintab.com.br>",
    to: user.email,
    subject: "Ative seu cadastro no FinTab!",
    text: makeDefaultMessage(user, activationToken),
  });

  function makeDefaultMessage(user, activationToken) {
    const mensage = [
      `${user.username}, clique no link abaixo para ativar o seu cadastro no FinTab!`,
      "", // Linha em branco
      `${webserver.origin}/cadastro/ativar/${activationToken.id}`,
      "", // Linha em branco
      "Atenciosamente,",
      "Equipe FinTab.",
    ].join("\n");
    return mensage;
  }
}

async function markTokenAsUsed(activationTokenId) {
  const usedActivationToken = await runUpdateQuery(activationTokenId);
  return usedActivationToken;

  async function runUpdateQuery(activationTokenId) {
    const result = await dataBase.query({
      text: `
      UPDATE
        user_activation_tokens
      SET 
        used_at = timezone('utc', now()),
        updated_at = timezone('utc', now())
      WHERE
        id=$1
      RETURNING
      *
      ;`,
      values: [activationTokenId],
    });

    return result.rows[0];
  }
}

async function activateUserByUserId(userId) {
  const activetedUser = await user.setFeatures(userId, ["create:session"]);
  return activetedUser;
}

const activation = {
  sendEmailToUser,
  create,
  findOneValidById,
  markTokenAsUsed,
  activateUserByUserId,
};

export default activation;
