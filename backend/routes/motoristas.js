import express from "express";
import pkg from "@prisma/client";
import bcrypt from "bcrypt";
import { autenticarToken, autorizarRoles } from "../index.js";

const { PrismaClient } = pkg;
const prisma = new PrismaClient();
const router = express.Router();

// 🔹 Nova rota para listar todos os motoristas
router.get("/", autenticarToken, autorizarRoles("ADMIN"), async (req, res) => {
    try {
        const motoristas = await prisma.user.findMany({
            where: {
                role: "USER"
            },
            select: {
                id: true,
                email: true
            }
        });
        res.json(motoristas);
    } catch (error) {
        console.error("Erro ao buscar motoristas:", error);
        res.status(500).json({ error: "Erro interno do servidor." });
    }
});


router.post("/", autenticarToken, autorizarRoles("ADMIN"), async (req, res) => {
    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({ error: "Email e senha são obrigatórios." });
        }

        const usuarioExistente = await prisma.user.findUnique({ where: { email } });
        if (usuarioExistente) {
            return res.status(409).json({ error: "Este email já está em uso." });
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        const novoMotorista = await prisma.user.create({
            data: {
                email,
                senha: senhaHash,
                role: "USER", // Define o novo usuário como 'USER' (motorista)
            },
        });

        res.status(201).json({ message: "Motorista cadastrado com sucesso!", motorista: novoMotorista });
    } catch (error) {
        console.error("Erro ao registrar motorista:", error);
        res.status(500).json({ error: "Erro interno do servidor." });
    }
});

export default router;