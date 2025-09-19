import express from "express";
import pkg from "@prisma/client";
import { autenticarToken } from "../index.js";

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


export default router;