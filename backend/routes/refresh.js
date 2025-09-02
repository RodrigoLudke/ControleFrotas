import express from "express";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const prisma = new PrismaClient();
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_TOKEN_EXPIRES = "15m"; // expiração curta

// rota de refresh
router.post("/refresh", async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ error: "Refresh token não informado" });
        }

        // procurar refresh token no banco
        const dbToken = await prisma.refreshToken.findUnique({
            where: { token: refreshToken },
            include: { user: true },
        });

        if (!dbToken) {
            return res.status(401).json({ error: "Refresh token inválido" });
        }

        // verificar se expirou
        if (dbToken.expiresAt < new Date()) {
            // opcional: apagar do banco se expirado
            await prisma.refreshToken.delete({ where: { id: dbToken.id } });
            return res.status(401).json({ error: "Refresh token expirado" });
        }

        // gerar novo access token
        const accessToken = jwt.sign(
            { userId: dbToken.user.id, email: dbToken.user.email },
            JWT_SECRET,
            { expiresIn: ACCESS_TOKEN_EXPIRES }
        );

        // opcional: gerar novo refresh token para renovar continuamente
        const newRefreshToken = crypto.randomUUID();
        const refreshExpiry = new Date();
        refreshExpiry.setDate(refreshExpiry.getDate() + 7); // 7 dias

        await prisma.refreshToken.create({
            data: {
                token: newRefreshToken,
                userId: dbToken.user.id,
                expiresAt: refreshExpiry,
            },
        });

        // deletar o velho refresh token (melhor segurança)
        await prisma.refreshToken.delete({ where: { id: dbToken.id } });

        return res.json({
            accessToken,
            refreshToken: newRefreshToken,
        });
    } catch (err) {
        console.error("Erro no /refresh:", err);
        return res.status(500).json({ error: "Erro interno do servidor" });
    }
});

export default router;


router.post("/logout", async (req, res) => {
    const { refreshToken } = req.body;

    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });

    res.json({ message: "Logout realizado com sucesso" });
});
