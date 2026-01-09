// backend/routes/refresh.js
import express from "express";
import pkg from "@prisma/client"; // Ajuste na importação do Prisma (padrão que usamos nos outros arquivos)
import jwt from "jsonwebtoken";
import {randomBytes} from "crypto";

const { PrismaClient } = pkg;
const prisma = new PrismaClient();
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_TOKEN_EXPIRES = "15m";

// rota de refresh
router.post("/", async (req, res) => {
    try {
        const {refreshToken} = req.body;

        if (!refreshToken) {
            return res.status(400).json({error: "Refresh token não informado"});
        }

        // procurar refresh token no banco
        const dbToken = await prisma.refreshToken.findUnique({
            where: {token: refreshToken},
            include: {user: true},
        });

        if (!dbToken) {
            return res.status(401).json({error: "Refresh token inválido"});
        }

        // verificar se expirou
        if (dbToken.expiresAt < new Date()) {
            await prisma.refreshToken.delete({where: {id: dbToken.id}});
            return res.status(401).json({error: "Refresh token expirado"});
        }

        // 1. CORREÇÃO: Incluir companyId no Payload do novo Access Token
        const accessToken = jwt.sign(
            {
                id: dbToken.user.id,
                email: dbToken.user.email,
                role: dbToken.user.role,
                companyId: dbToken.user.companyId
            },
            JWT_SECRET,
            {expiresIn: ACCESS_TOKEN_EXPIRES}
        );

        // gerar novo refresh token
        const newRefreshToken = randomBytes(40).toString("hex");
        const refreshExpiry = new Date();
        refreshExpiry.setDate(refreshExpiry.getDate() + 7);

        // 2. CORREÇÃO: Salvar o companyId na tabela RefreshToken
        await prisma.refreshToken.create({
            data: {
                token: newRefreshToken,
                userId: dbToken.user.id,
                companyId: dbToken.user.companyId,
                expiresAt: refreshExpiry,
            },
        });

        // deletar o velho refresh token
        await prisma.refreshToken.delete({where: {id: dbToken.id}});

        return res.json({
            accessToken,
            refreshToken: newRefreshToken,
        });
    } catch (err) {
        console.error("Erro no /refresh:", err);
        return res.status(500).json({error: "Erro interno do servidor"});
    }
});

router.post("/logout", async (req, res) => {
    try {
        const {refreshToken} = req.body;
        if (refreshToken) {
            await prisma.refreshToken.deleteMany({where: {token: refreshToken}});
        }
        res.json({message: "Logout realizado com sucesso"});
    } catch (error) {
        res.status(500).json({error: "Erro no logout"});
    }
});

export default router;