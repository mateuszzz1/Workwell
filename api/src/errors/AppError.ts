/**
 * Erro "esperado" da aplicação.
 *
 * Use quando uma regra de negócio impede a operação, informando a mensagem
 * que o usuário deve ver e o código HTTP:
 *   400 dado inválido · 401 não logado · 403 sem permissão
 *   404 não encontrado · 409 conflito (ex.: e-mail repetido) · 429 excesso de tentativas
 *
 * Exemplo: throw new AppError("Desafio não encontrado.", 404);
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400,
  ) {
    super(message);
    this.name = "AppError";
  }
}
