/**
 * Cadastro (UC01) e login (UC02).
 *
 * Os dois devolvem o mesmo formato: { token, usuario }.
 * O frontend guarda o token e o envia nas próximas requisições.
 */
import { prisma } from "../../database/prisma.js";
import { AppError } from "../../errors/AppError.js";
import { conferirSenha, gerarHashSenha } from "../../utils/senha.js";
import { gerarToken } from "../../utils/token.js";
import { camposPublicos } from "../usuarios/usuario.service.js";
import type { CadastroInput, LoginInput } from "./auth.schema.js";

export async function cadastrar(dados: CadastroInput) {
  const existente = await prisma.usuario.findUnique({ where: { email: dados.email }, select: { id: true } });
  if (existente) {
    throw new AppError("Já existe uma conta com este e-mail.", 409);
  }

  // No protótipo há uma única empresa; o colaborador é vinculado a ela.
  const empresa = await prisma.empresa.findFirst({ where: { ativa: true }, orderBy: { id: "asc" } });
  if (!empresa) {
    throw new AppError("Nenhuma empresa cadastrada. Execute a carga de dados (db:setup).", 409);
  }

  const usuario = await prisma.usuario.create({
    data: {
      nome: dados.nome,
      email: dados.email,
      senhaHash: await gerarHashSenha(dados.senha),
      perfil: "COLABORADOR",
      empresaId: empresa.id,
      onboardingConcluido: false,
    },
    select: camposPublicos,
  });

  return { token: gerarToken(usuario.id, usuario.perfil), usuario };
}

export async function login(dados: LoginInput) {
  const encontrado = await prisma.usuario.findUnique({
    where: { email: dados.email },
    select: { id: true, ativo: true, senhaHash: true },
  });

  const senhaCorreta = await conferirSenha(dados.senha, encontrado?.senhaHash ?? null);

  // Mensagem única para e-mail inexistente ou senha errada: assim não
  // revelamos se um e-mail está ou não cadastrado na plataforma.
  if (!encontrado || !encontrado.ativo || !senhaCorreta) {
    throw new AppError("E-mail ou senha incorretos.", 401);
  }

  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: encontrado.id }, select: camposPublicos });
  return { token: gerarToken(usuario.id, usuario.perfil), usuario };
}
