import express from "express";
import pkg from "@prisma/client";

import { autenticarToken, autorizarRoles } from "../index.js";

const { PrismaClient } = pkg;
const prisma = new PrismaClient();
const router = express.Router();

// Listar veículos do usuário logado
router.get("/me", autenticarToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const veiculos = await prisma.userVeiculo.findMany({
            where: { userId: parseInt(userId) },
            include: { veiculo: true },
        });

        res.json(veiculos.map(v => v.veiculo));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erro ao buscar veículos" });
    }
});
// Rota para cadastrar um novo veículo e associá-lo ao usuário logado
// 🔹 Rota atualizada para criar um novo veículo e associar a múltiplos motoristas
router.post("/", autenticarToken, autorizarRoles("ADMIN"), async (req, res) => {
    try {
        const { nome, tipo, motoristasIds } = req.body;

        if (!nome || !tipo) {
            return res.status(400).json({ error: "Nome e tipo do veículo são obrigatórios." });
        }

        if (!motoristasIds || !Array.isArray(motoristasIds) || motoristasIds.length === 0) {
            return res.status(400).json({ error: "É necessário fornecer ao menos um motorista para associar ao veículo." });
        }

        // 1. Cria o novo veículo na tabela `Veiculo`
        const novoVeiculo = await prisma.veiculo.create({
            data: {
                nome,
                tipo,
            },
        });

        // 2. Associa o veículo aos motoristas
        const veiculosMotoristas = motoristasIds.map(motoristaId => ({
            userId: motoristaId,
            veiculoId: novoVeiculo.id,
        }));

        await prisma.userVeiculo.createMany({
            data: veiculosMotoristas,
            skipDuplicates: true, // Para evitar erros caso um motorista já esteja associado
        });

        res.status(201).json({ message: "Veículo cadastrado e associado com sucesso!", veiculo: novoVeiculo });
    } catch (error) {
        console.error("Erro ao registrar veículo:", error);
        res.status(500).json({ error: "Erro interno do servidor." });
    }
});

export default router;