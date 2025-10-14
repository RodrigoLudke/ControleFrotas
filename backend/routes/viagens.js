import express from "express";
import pkg from "@prisma/client";
import { autenticarToken } from "../index.js";
import { autorizarRoles } from "../index.js";

const router = express.Router();
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

// Registrar viagem
router.post("/", autenticarToken, async (req, res) => {
    try {
        const { veiculoId, dataSaida, dataChegada, finalidade, kmFinal } = req.body;
        const userId = req.user.id;

        const inicioViagem = new Date(dataSaida);
        const fimViagem = new Date(dataChegada);

        if (fimViagem <= inicioViagem) {
            return res.status(400).json({ error: "Data/Horário de chegada não pode ser anterior à saída." });
        }

        // valida se o usuário pode dirigir o veículo
        const permitido = await prisma.userVeiculo.findFirst({
            where: { userId: parseInt(userId), veiculoId },
        });

        if (!permitido) {
            return res.status(403).json({ error: "Você não pode dirigir este veículo" });
        }

        const ultimaViagem = await prisma.viagem.findFirst({
            where: { veiculoId },
            orderBy: { kmFinal: "desc" }, // pega a última
        });

        if (ultimaViagem) {
            if (inicioViagem <= new Date(ultimaViagem.dataSaida)) {
                return res.status(400).json({
                    error: "A data/hora de saída não pode ser anterior ou igual à última viagem registrada.",
                    ultimaData: ultimaViagem.dataSaida,
                });
            }

            if (kmFinal <= ultimaViagem.kmFinal) {
                return res.status(400).json({
                    error: "A quilometragem final não pode ser menor ou igual que a última registrada.",
                    ultimaKm: ultimaViagem.kmFinal,
                });
            }
        }

        const viagem = await prisma.viagem.create({
            data: {
                userId,
                veiculoId,
                dataSaida: inicioViagem,
                dataChegada: fimViagem,
                finalidade,
                kmFinal,
            },
        });

        res.json(viagem);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erro ao registrar viagem" });
    }
});

// Listar viagens do usuário autenticado
router.get("/", autenticarToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const viagens = await prisma.viagem.findMany({
            where: { userId: parseInt(userId) },
            orderBy: { kmFinal: "desc" },
        });

        res.json(viagens);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erro ao buscar viagens" });
    }
});

router.get("/admin", autenticarToken, autorizarRoles("ADMIN"), async (req, res) => {
    try {
        const viagens = await prisma.viagem.findMany({
            orderBy: { dataSaida: "desc" },
        });

        res.json(viagens);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erro ao buscar viagens" });
    }
});

// Atualizar viagem (motorista dono da viagem) — pode ser chamado pelo app mobile.
// ADMIN também pode atualizar.
router.patch("/:id", autenticarToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const userIdLogado = req.user.id;
        const userRole = req.user.role;

        const viagem = await prisma.viagem.findUnique({ where: { id } });
        if (!viagem) return res.status(404).json({ error: "Viagem não encontrada." });

        // só o dono ou ADMIN podem editar
        if (userRole !== "ADMIN" && viagem.userId !== userIdLogado) {
            return res.status(403).json({ error: "Acesso negado." });
        }

        const { finalidade, dataSaida, dataChegada, kmFinal } = req.body;

        const dadosParaAtualizar = {};

        if (finalidade !== undefined) dadosParaAtualizar.finalidade = finalidade;
        if (dataSaida !== undefined) dadosParaAtualizar.dataSaida = new Date(dataSaida);
        if (dataChegada !== undefined) dadosParaAtualizar.dataChegada = new Date(dataChegada);

        // Validação básica de datas
        if (dadosParaAtualizar.dataSaida && dadosParaAtualizar.dataChegada) {
            if (dadosParaAtualizar.dataSaida >= dadosParaAtualizar.dataChegada) {
                return res.status(400).json({ error: "Data de saída deve ser anterior à data de chegada." });
            }
        }

        if (kmFinal !== undefined) {
            const novoKm = parseInt(kmFinal);
            if (isNaN(novoKm)) return res.status(400).json({ error: "kmFinal inválido." });

            // checar a maior quilometragem de outras viagens do mesmo veículo (excluindo esta viagem)
            const ultimaOutra = await prisma.viagem.findFirst({
                where: {
                    veiculoId: viagem.veiculoId,
                    id: { not: viagem.id }
                },
                orderBy: { kmFinal: "desc" }
            });

            if (ultimaOutra && novoKm <= ultimaOutra.kmFinal) {
                return res.status(400).json({
                    error: "A quilometragem final informada é menor ou igual à última registrada para este veículo.",
                    ultimaKm: ultimaOutra.kmFinal
                });
            }

            dadosParaAtualizar.kmFinal = novoKm;
        }

        const viagemAtualizada = await prisma.viagem.update({
            where: { id },
            data: dadosParaAtualizar
        });

        res.json({ message: "Viagem atualizada com sucesso.", viagem: viagemAtualizada });
    } catch (error) {
        console.error("Erro ao atualizar viagem:", error);
        res.status(500).json({ error: "Erro interno ao atualizar viagem." });
    }
});

// Deletar viagem (dono da viagem ou ADMIN)
router.delete("/:id", autenticarToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const userIdLogado = req.user.id;
        const userRole = req.user.role;

        const viagem = await prisma.viagem.findUnique({ where: { id } });
        if (!viagem) return res.status(404).json({ error: "Viagem não encontrada." });

        if (userRole !== "ADMIN" && viagem.userId !== userIdLogado) {
            return res.status(403).json({ error: "Acesso negado." });
        }

        await prisma.viagem.delete({ where: { id } });
        res.json({ message: "Viagem deletada com sucesso." });
    } catch (error) {
        console.error("Erro ao deletar viagem:", error);
        res.status(500).json({ error: "Erro interno ao deletar viagem." });
    }
});


export default router;