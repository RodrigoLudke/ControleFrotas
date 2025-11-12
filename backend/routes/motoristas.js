// routes/motoristas.js
import express from "express";
import pkg from "@prisma/client";
import bcrypt from "bcrypt";
import { autenticarToken, autorizarRoles } from "../index.js";

const { PrismaClient } = pkg;
const prisma = new PrismaClient();
const router = express.Router();

function expandCategories(selected = []) {
  const map = {
    A: ["A"],
    B: ["B"],
    AB: ["A", "B"],
    C: ["C"],
    D: ["D"],
    E: ["E"],
  };
  const result = new Set();
  for (const s of selected) {
    const arr = map[s];
    if (arr && Array.isArray(arr)) arr.forEach((x) => result.add(x));
  }
  return Array.from(result);
}

/* -------------------------
   ROTAS ESPECÍFICAS (SEM :id)
   ------------------------- */

// Listar todos os motoristas (ADMIN)
router.get("/", autenticarToken, autorizarRoles("ADMIN"), async (req, res) => {
  try {
    const motoristas = await prisma.user.findMany({
      where: { role: "USER" },
      select: {
        id: true,
        nome: true,
        cpf: true,
        cnh: true,
        validadeCnh: true,
        telefone: true,
        email: true,
        endereco: true,
        dataContratacao: true,
        status: true,
        categoria: true,
        latitude: true,
        longitude: true,
        lastLocationUpdate: true,
      },
      orderBy: { nome: "asc" },
    });
    res.json(motoristas);
  } catch (error) {
    console.error("Erro ao buscar motoristas:", error);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

// Rota de criação simples (POST /)
router.post("/", autenticarToken, autorizarRoles("ADMIN"), async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha)
      return res.status(400).json({ error: "Email e senha são obrigatórios." });

    const usuarioExistente = await prisma.user.findUnique({ where: { email } });
    if (usuarioExistente)
      return res.status(409).json({ error: "Este email já está em uso." });

    const senhaHash = await bcrypt.hash(senha, 10);
    const novoMotorista = await prisma.user.create({
      data: { email, senha: senhaHash, role: "USER" },
    });
    res.status(201).json({
      message: "Motorista cadastrado com sucesso!",
      motorista: novoMotorista,
    });
  } catch (error) {
    console.error("Erro ao registrar motorista:", error);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

// Cadastro detalhado (mantive /cadastrar)
router.post("/cadastrar", async (req, res) => {
  try {
    const {
      email,
      senha,
      nome,
      cpf,
      rg,
      cnh,
      validadeCnh,
      telefone,
      endereco,
      dataContratacao,
      salario,
      observacoes,
      categoria,
      dataNascimento,
    } = req.body;

    if (!email || !senha || !nome || !cpf || !cnh) {
      return res.status(400).json({ error: "Campos obrigatórios faltando." });
    }

    const hashedPassword = await bcrypt.hash(senha, 10);

    const novoMotorista = await prisma.user.create({
      data: {
        email,
        senha: hashedPassword,
        nome,
        cpf,
        rg,
        cnh,
        validadeCnh: new Date(validadeCnh),
        telefone,
        endereco,
        dataContratacao: dataContratacao ? new Date(dataContratacao) : null,
        salario: salario !== undefined ? parseFloat(salario) : null,
        observacoes: observacoes || "",
        categoria: Array.isArray(categoria)
          ? categoria
          : categoria
            ? [categoria]
            : undefined,
        dataNascimento: dataNascimento ? new Date(dataNascimento) : null,
        role: "USER",
        status: "ativo",
      },
    });

    // associa veículos conforme categorias
    const selectedCategories = Array.isArray(categoria)
      ? categoria
      : categoria
        ? [categoria]
        : [];
    const expanded = expandCategories(selectedCategories);
    if (expanded.length > 0) {
      const veiculosPermitidos = await prisma.veiculo.findMany({
        where: { categoria: { in: expanded } },
        select: { id: true },
      });
      if (veiculosPermitidos.length > 0) {
        const createManyData = veiculosPermitidos.map((v) => ({
          userId: novoMotorista.id,
          veiculoId: v.id,
        }));
        await prisma.userVeiculo.createMany({
          data: createManyData,
          skipDuplicates: true,
        });
      }
    }

    res.status(201).json(novoMotorista);
  } catch (error) {
    if (error?.code === "P2002")
      return res.status(409).json({ error: "Dados duplicados." });
    console.error("Erro ao cadastrar motorista:", error);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

// Rota para atualizar localização do motorista em tempo real
router.post("/localizacao", autenticarToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { latitude, longitude } = req.body;

    if (latitude == null || longitude == null) {
      return res.status(400).json({ error: "Localização inválida." });
    }

    await prisma.user.update({
      where: { id: Number(userId) },
      data: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        lastLocationUpdate: new Date(),
      },
    });

    res.status(200).json({ message: "Localização atualizada." });
  } catch (error) {
    console.error("Erro ao atualizar localização:", error);
    res.status(500).json({ error: "Erro interno." });
  }
});

/* -------------------------
   ROTAS POR ID (SOMENTE NÚMEROS)
   ------------------------- */

// Buscar 1 motorista por id
router.get(
  "/:id",
  autenticarToken,
  autorizarRoles("ADMIN"),
  async (req, res) => {
    if (!/^\d+$/.test(req.params.id)) {
      return res
        .status(400)
        .json({ error: "ID inválido. O ID deve ser um número inteiro." });
    }
    const id = parseInt(req.params.id, 10);
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id))
        return res.status(400).json({ error: "ID inválido." });

      const motorista = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          nome: true,
          email: true,
          cpf: true,
          rg: true,
          telefone: true,
          endereco: true,
          cnh: true,
          validadeCnh: true,
          categoria: true,
          dataContratacao: true,
          salario: true,
          observacoes: true,
          dataNascimento: true,
          status: true,
        },
      });

      if (!motorista)
        return res.status(404).json({ error: "Motorista não encontrado." });
      return res.json(motorista);
    } catch (err) {
      console.error("GET /motoristas/:id error:", err);
      return res
        .status(500)
        .json({ error: "Erro interno ao buscar motorista." });
    }
  },
);

// Atualizar motorista (APENAS ADMIN)
router.patch(
  "/:id",
  autenticarToken,
  autorizarRoles("ADMIN"),
  async (req, res) => {
    if (!/^\d+$/.test(req.params.id)) {
      return res
        .status(400)
        .json({ error: "ID inválido. O ID deve ser um número inteiro." });
    }
    const id = parseInt(req.params.id, 10);
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id))
        return res.status(400).json({ error: "ID inválido." });

      const {
        nome,
        email,
        cpf,
        telefone,
        endereco,
        validadeCnh,
        categoria,
        status,
        senha,
        salario,
      } = req.body;

      const updates = {};
      if (nome !== undefined) updates.nome = nome;
      if (email !== undefined) updates.email = email;
      if (cpf !== undefined) updates.cpf = cpf;
      if (telefone !== undefined) updates.telefone = telefone;
      if (endereco !== undefined) updates.endereco = endereco;
      if (validadeCnh !== undefined)
        updates.validadeCnh = new Date(validadeCnh);
      if (categoria !== undefined)
        updates.categoria = Array.isArray(categoria) ? categoria : [categoria];
      if (status !== undefined) updates.status = status;
      if (salario !== undefined) updates.salario = Number(salario);
      if (senha !== undefined)
        updates.senha = await bcrypt.hash(String(senha), 10);

      const motoristaExistente = await prisma.user.findUnique({
        where: { id },
      });
      if (!motoristaExistente)
        return res.status(404).json({ error: "Motorista não encontrado." });

      const motoristaAtualizado = await prisma.user.update({
        where: { id },
        data: updates,
        select: {
          id: true,
          nome: true,
          email: true,
          cpf: true,
          telefone: true,
          endereco: true,
          categoria: true,
          status: true,
          validadeCnh: true,
          salario: true,
        },
      });

      res.json({
        message: "Motorista atualizado com sucesso.",
        motorista: motoristaAtualizado,
      });
    } catch (error) {
      console.error("Erro ao atualizar motorista:", error);
      if (error?.code === "P2002")
        return res.status(409).json({ error: "Dados duplicados." });
      res.status(500).json({ error: "Erro interno ao atualizar motorista." });
    }
  },
);

// Deletar motorista (APENAS ADMIN)
router.delete(
  "/:id",
  autenticarToken,
  autorizarRoles("ADMIN"),
  async (req, res) => {
    if (!/^\d+$/.test(req.params.id)) {
      return res
        .status(400)
        .json({ error: "ID inválido. O ID deve ser um número inteiro." });
    }
    const id = parseInt(req.params.id, 10);
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id))
        return res.status(400).json({ error: "ID inválido." });

      const motoristaExistente = await prisma.user.findUnique({
        where: { id },
      });
      if (!motoristaExistente)
        return res.status(404).json({ error: "Motorista não encontrado." });

      await prisma.user.delete({ where: { id } });
      res.json({ message: "Motorista deletado com sucesso." });
    } catch (error) {
      console.error("Erro ao deletar motorista:", error);
      res.status(500).json({ error: "Erro interno ao deletar motorista." });
    }
  },
);

export default router;
