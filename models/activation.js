import email from "infra/email.js";
import dataBase from "infra/database.js";
import webserver from "infra/webserver.js";

const EXPIRATION_IN_MILLISECONDS = 60 * 15 * 1000; // 1 Minutes

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

async function findOneByUserId(userId) {
  const userFound = await runSelectQuery(userId);
  return userFound;

  async function runSelectQuery(userId) {
    const result = await dataBase.query({
      text: `
      SELECT 
        *
      FROM
        user_activation_tokens
      WHERE 
        user_id=$1
      LIMIT
        1
      ;`,
      values: [userId],
    });

    // if (result.rowCount === 0) {
    //   throw new NotFoundError({
    //     message: "O username informado não foi encontrado no sistema.",
    //     action: "Verifique se o username foi digitado corretamente.",
    //   });
    // }
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

const activation = {
  sendEmailToUser,
  create,
  findOneByUserId,
};

export default activation;
