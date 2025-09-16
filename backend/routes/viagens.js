import express from "express";
import pkg from "@prisma/client";
import { autenticarToken } from "../index.js";

const router = express.Router();
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

// Registrar viagem
router.post("/", autenticarToken, async (req, res) => {
    try {
        const { veiculoId, dataSaida, dataChegada, horarioSaida, horarioChegada, finalidade, kmFinal } = req.body;
        const userId = req.user.id;

        const inicioViagem = new Date(`${dataSaida}T${horarioSaida}`);
        const fimViagem = new Date(`${dataChegada}T${horarioChegada}`);
        if (fimViagem.getTime() <= inicioViagem.getTime()) {
            return res.status(400).json({ error: "O horário de chegada não pode ser menor ou igual ao horário de saída." });
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

        if (ultimaViagem && kmFinal <= ultimaViagem.kmFinal) {
            return res.status(400).json({
                error: "A quilometragem final não pode ser menor ou igual que a última registrada.",
                ultimaKm: ultimaViagem.kmFinal,
            });
        }

        const viagem = await prisma.viagem.create({
            data: {
                userId: parseInt(userId),
                veiculoId,
                dataSaida: new Date(dataSaida),
                dataChegada: new Date(dataChegada),
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