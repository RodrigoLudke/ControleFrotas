import express from "express";
import bodyParser from "body-parser";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

import { randomBytes } from "crypto";

import veiculosRoutes from "./routes/veiculos.js";
import viagensRoutes from "./routes/viagens.js";
import motoristasRoutes from "./routes/motoristas.js";
import refreshRoutes from "./routes/refresh.js";

import cors from "cors";

const prisma = new PrismaClient();

const app = express();
app.use(bodyParser.json());
app.use(cors());

app.use("/veiculos", veiculosRoutes);
app.use("/viagens", viagensRoutes);
app.use("users/motoristas", motoristasRoutes);
app.use("/refresh", refreshRoutes);

// Rota de cadastro (já existe)
app.post("/register", async (req, res) => {
    const { email, senha, role } = req.body;
    if (!email || !senha) return res.status(400).json({ error: "Dados inválidos" });

    const senhaHash = await bcrypt.hash(senha, 10);

    const user = await prisma.user.create({
        data: { email, senha: senhaHash, role: role === "ADMIN" ? "ADMIN" : "USER" },
    });

    res.json({ message: "Usuário cadastrado", user });
});

// 🔹 Nova rota de login
app.post("/index", async (req, res) => {
    const { email, senha } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: "Usuário não encontrado" });

    const senhaValida = await bcrypt.compare(senha, user.senha);
    if (!senhaValida) return res.status(401).json({ error: "Senha inválida" });

    const accessToken = gerarAccessToken(user);
    const refreshToken = await gerarRefreshToken(user.id);

    res.json({ message: "Login realizado", accessToken, refreshToken });
});

function gerarAccessToken(user) {
    return jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: "1m", // expira rápido
    });
}

async function gerarRefreshToken(userId) {
    const token = randomBytes(40).toString("hex"); // string aleatória segura
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

    await prisma.refreshToken.create({
        data: {
            token,
            userId,
            expiresAt,
        },
    });

    return token;
}

export function autenticarToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(401);
        req.user = user;
        next();
    });
}

export function autorizarRoles(...rolesPermitidos) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: "Não autenticado" });
        }

        if (!rolesPermitidos.includes(req.user.role)) {
            return res.status(403).json({ error: "Acesso negado" });
        }

        next();
    };
}


app.get("/dados-protegidos", autenticarToken, (req, res) => {
    res.json({ message: "Aqui estão os dados secretos", user: req.user });
});

app.listen(3000, () => {
    console.log("API rodando na porta 3000");
});
