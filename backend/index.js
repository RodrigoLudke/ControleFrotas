import express from "express";
import bodyParser from "body-parser";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {PrismaClient} from "@prisma/client";
import {randomBytes} from "crypto";
import veiculosRoutes from "./routes/veiculos.js";
import viagensRoutes from "./routes/viagens.js";
import motoristasRoutes from "./routes/motoristas.js";
import refreshRoutes from "./routes/refresh.js";
import manutencoesRoutes from "./routes/manutencoes.js";
import abastecimentosRoutes from "./routes/abastecimentos.js";
import alertas from "./routes/alertas.js";
import cors from "cors";
import dotenv from "dotenv";
import cron from "node-cron";

// Carregar variáveis de ambiente
dotenv.config();
const URLS_PERMITIDAS = process.env.URLS_PERMITIDAS ? process.env.URLS_PERMITIDAS.split(",") : [];

// 1. Define your trusted domains (whitelist)
const allowedValues = new Set(URLS_PERMITIDAS);

// 2. Configure CORS options
const corsOptions = {
    origin: function (origin, callback) {
        // Check if the incoming origin is in our whitelist
        if (!origin || allowedValues.has(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
};

const prisma = new PrismaClient();
const app = express();

app.disable("x-powered-by");

app.use(bodyParser.json());
app.use(cors(corsOptions));

app.use("/veiculos", veiculosRoutes);
app.use("/viagens", viagensRoutes);
app.use("/motoristas", motoristasRoutes);
app.use("/refresh", refreshRoutes);
app.use("/manutencoes", manutencoesRoutes);
app.use("/abastecimentos", abastecimentosRoutes);
app.use("/alertas", alertas);

// -------------------------------------------------------------------
// ROTA DE CADASTRO DE NOVA EMPRESA (SIGN UP)
// Cria a Empresa + O primeiro Usuário (Admin)
// -------------------------------------------------------------------
app.post("/register", async (req, res) => {
    // Agora pedimos o nome da empresa também
    const { nomeEmpresa, nomeUser, email, senha } = req.body;

    if (!nomeEmpresa || !email || !senha) {
        return res.status(400).json({ error: "Nome da empresa, email e senha são obrigatórios." });
    }

    try {
        // Verifica se o email já existe globalmente
        const userExists = await prisma.user.findUnique({ where: { email } });
        if (userExists) return res.status(409).json({ error: "Email já cadastrado." });

        const senhaHash = await bcrypt.hash(senha, 10);

        // TRANSACTION: Cria Empresa e Usuário juntos
        const resultado = await prisma.$transaction(async (tx) => {
            // 1. Cria a Empresa
            const novaEmpresa = await tx.company.create({
                data: {
                    nome: nomeEmpresa,
                    isActive: true
                }
            });

            // 2. Cria o Usuário Admin vinculado a essa empresa
            const novoUsuario = await tx.user.create({
                data: {
                    companyId: novaEmpresa.id, // <--- VÍNCULO IMPORTANTE
                    nome: nomeUser || "Admin",
                    email,
                    senha: senhaHash,
                    role: "ADMIN",
                    status: "ativo"
                }
            });

            return { empresa: novaEmpresa, usuario: novoUsuario };
        });

        res.status(201).json({
            message: "Empresa e Administrador cadastrados com sucesso!",
            company: resultado.empresa.nome,
            user: resultado.usuario.email
        });

    } catch (error) {
        console.error("Erro no registro:", error);
        res.status(500).json({ error: "Erro interno ao registrar empresa." });
    }
});

// -------------------------------------------------------------------
// ROTA DE LOGIN
// -------------------------------------------------------------------
app.post("/index", async (req, res) => {
    const {email, senha} = req.body;

    const user = await prisma.user.findUnique({where: {email}});
    if (!user) return res.status(400).json({error: "Usuário não encontrado"});

    // Verifica se a empresa está ativa (Opcional, mas recomendado para SaaS)
    /* const empresa = await prisma.company.findUnique({ where: { id: user.companyId } });
    if (!empresa || !empresa.isActive) return res.status(403).json({ error: "Empresa bloqueada/inativa." });
    */

    const senhaValida = await bcrypt.compare(senha, user.senha);
    if (!senhaValida) return res.status(401).json({error: "Senha inválida"});

    const accessToken = gerarAccessToken(user);
    // CORREÇÃO: Passar o companyId para o refresh token
    const refreshToken = await gerarRefreshToken(user.id, user.companyId);

    res.json({message: "Login realizado", accessToken, refreshToken});
});

function gerarAccessToken(user) {
    // CORREÇÃO: Incluir companyId no payload do JWT
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role,
            companyId: user.companyId // <--- FUNDAMENTAL PARA O SISTEMA FUNCIONAR
        },
        process.env.JWT_SECRET,
        { expiresIn: "30m" }
    );
}

// CORREÇÃO: Receber companyId
async function gerarRefreshToken(userId, companyId) {
    const token = randomBytes(40).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

    await prisma.refreshToken.create({
        data: {
            token,
            userId,
            companyId, // <--- OBRIGATÓRIO NO NOVO SCHEMA
            expiresAt,
        },
    });

    return token;
}

// -------------------------------------------------------------------
// CRON JOBS
// -------------------------------------------------------------------
async function atualizarManutencoesAtrasadas() {
    console.log('[CRON] Executando verificação de manutenções atrasadas...');
    const agora = new Date();

    try {
        // Isso pode rodar globalmente para todas as empresas sem problemas
        const { count } = await prisma.manutencao.updateMany({
            where: {
                status: 'AGENDADA',
                data: {
                    lt: agora
                }
            },
            data: {
                status: 'CONCLUIDA'
            }
        });

        if (count > 0) {
            console.log(`[CRON] ${count} manutenções foram atualizadas para "CONCLUIDA".`);
        } else {
            console.log('[CRON] Nenhuma manutenção atrasada encontrada.');
        }

    } catch (error) {
        console.error('[CRON] Erro ao atualizar manutenções atrasadas:', error);
    }
}

cron.schedule('0 * * * *', () => {
    atualizarManutencoesAtrasadas();
});

// -------------------------------------------------------------------
// MIDDLEWARES DE AUTH (Exportados para uso nas rotas)
// -------------------------------------------------------------------

export function autenticarToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(401);
        req.user = user; // Agora req.user tem { id, role, companyId }
        next();
    });
}

export function autorizarRoles(...rolesPermitidos) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({error: "Não autenticado"});
        }

        if (!rolesPermitidos.includes(req.user.role)) {
            return res.status(403).json({error: "Acesso negado"});
        }

        next();
    };
}


app.get("/dados-protegidos", autenticarToken, (req, res) => {
    // Agora você verá o companyId aqui no retorno
    res.json({message: "Aqui estão os dados secretos", user: req.user});
});

app.listen(3000, () => {
    console.log("API rodando na porta 3000");
});