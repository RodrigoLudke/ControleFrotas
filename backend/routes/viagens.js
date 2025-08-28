import express from "express";
import pkg from "@prisma/client";
import { autenticarToken } from "../index.js";

const router = express.Router();
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

// Registrar viagem
router.post("/", autenticarToken, async (req, res) => {
    try {
        const { veiculoId, data, horarioSaida, horarioChegada, finalidade, kmFinal } = req.body;
        const userId = req.user.id;

        // valida se o usuário pode dirigir o veículo
        const permitido = await prisma.userVeiculo.findFirst({
            where: { userId: parseInt(userId), veiculoId },
        });

        if (!permitido) {
            return res.status(403).json({ error: "Você não pode dirigir este veículo" });
        }

        const ultimaViagem = await prisma.viagem.findFirst({
            where: { veiculoId },
            orderBy: { createdAt: "desc" }, // pega a última
        });

        if (ultimaViagem && kmFinal < ultimaViagem.kmFinal) {
            return res.status(400).json({
                error: "A quilometragem final não pode ser menor que a última registrada.",
                ultimaKm: ultimaViagem.kmFinal,
            });
        }

        const viagem = await prisma.viagem.create({
            data: {
                userId: parseInt(userId),
                veiculoId,
                data: new Date(data),
                horarioSaida: new Date(horarioSaida),
                horarioChegada: new Date(horarioChegada),
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
            orderBy: { data: "desc" },
        });

        res.json(viagens);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erro ao buscar viagens" });
    }
});


export default router;