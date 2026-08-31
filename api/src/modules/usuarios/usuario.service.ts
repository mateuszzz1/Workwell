import { prisma } from "../../database/prisma.js";
import { AppError } from "../../errors/AppError.js";
import type { CriarUsuarioInput } from "./usuario.schema.js";

export class UsuarioService {
  async listar() {
    return prisma.usuario.findMany({
      select: {
        id: true,
        nome: true,
        email: true,
        perfil: true,
        cargo: true,
        setor: true,
        areaResponsavel: true,
        pontosTotal: true,
        onboardingConcluido: true,
        ativo: true,
        criadoEm: true,
        empresa: {
          select: { id: true, nome: true },
        },
      },
      orderBy: { nome: "asc" },
    });
  }

  async criar(dados: CriarUsuarioInput) {
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { email: dados.email },
    });

    if (usuarioExistente) {
      throw new AppError("Já existe um usuário com este e-mail.", 409);
    }

    const empresaId = dados.empresaId ?? (await this.buscarEmpresaPadrao());

    return prisma.usuario.create({
      data: {
        nome: dados.nome,
        email: dados.email,
        perfil: dados.perfil,
        empresaId,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        perfil: true,
        cargo: true,
        setor: true,
        areaResponsavel: true,
        pontosTotal: true,
        criadoEm: true,
        empresa: { select: { id: true, nome: true } },
      },
    });
  }

  private async buscarEmpresaPadrao() {
    const empresa = await prisma.empresa.findFirst({
      where: { ativa: true },
      orderBy: { id: "asc" },
      select: { id: true },
    });

    if (!empresa) {
      throw new AppError(
        "Cadastre uma empresa antes de criar usuários.",
        409,
      );
    }

    return empresa.id;
  }
}
