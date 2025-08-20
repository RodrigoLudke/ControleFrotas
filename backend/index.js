import express from "express";
import bodyParser from "body-parser";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pkg from "@prisma/client";

import cors from "cors";

const { PrismaClient } = pkg;
const prisma = new PrismaClient();

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Rota de cadastro (já existe)
app.post("/register", async (req, res) => {
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ error: "Dados inválidos" });

    const senhaHash = await bcrypt.hash(senha, 10);

    const user = await prisma.user.create({
        data: { email, senha: senhaHash },
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

    // Gera token JWT
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
        expiresIn: "1h",
    });

    res.json({ message: "Login realizado", token });
});

function autenticarToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

app.get("/dados-protegidos", autenticarToken, (req, res) => {
    res.json({ message: "Aqui estão os dados secretos", user: req.user });
});


app.listen(3000, () => {
    console.log("API rodando na porta 3000");
});
