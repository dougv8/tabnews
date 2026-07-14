import email from "infra/email.js";
import dataBase from "infra/database.js";
import webserver from "infra/webserver.js";
import { ForbiddenError, NotFoundError } from "infra/errors.js";
import user from "models/user.js";
import authorization from "models/authorization.js";

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
    from: "CursoDev <contato@cursodev.douglaspontes.com.br>",
    to: user.email,
    subject: "Ative seu cadastro no CursoDev!",
    text: makeDefaultMessage(user, activationToken),
  });

  function makeDefaultMessage(user, activationToken) {
    const mensage = [
      `${user.username}, clique no link abaixo para ativar o seu cadastro no CursoDev!`,
      "", // Linha em branco
      `${webserver.origin}/cadastro/ativar/${activationToken.id}`,
      "", // Linha em branco
      "Atenciosamente,",
      "Equipe CursoDev.",
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
  const userToActivate = await user.findOneById(userId);

  if (!authorization.can(userToActivate, "read:activation_token")) {
    throw new ForbiddenError({
      message: "Você não pode mais utilizar tokens de ativação.",
      action: "Entre em contato com o suporte.",
    });
  }

  const activetedUser = await user.setFeatures(userId, [
    "create:session",
    "read:session",
    "update:user",
  ]);
  return activetedUser;
}

const activation = {
  sendEmailToUser,
  create,
  findOneValidById,
  markTokenAsUsed,
  activateUserByUserId,
  EXPIRATION_IN_MILLISECONDS,
};

export default activation;
