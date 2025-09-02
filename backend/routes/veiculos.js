import express from "express";
import pkg from "@prisma/client";

import { autenticarToken } from "../index.js";

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

export default router;