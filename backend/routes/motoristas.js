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
                nome: true,
                cpf: true,
                cnh: true,
                validadeCnh: true,
                telefone: true,
                email: true,
                endereco: true,
                dataContratacao: true,
                status: true,
                categoria: true,
            }
        });
        res.json(motoristas);
    } catch (error) {
        console.error("Erro ao buscar motoristas:", error);
        res.status(500).json({ error: "Erro interno do servidor." });
    }
});

// Rota para registrar um novo motorista (apenas ADMIN pode criar) (POSTMAN) (TESTE)
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

// Nova rota para cadastro de motorista
router.post('/cadastrar', async (req, res) => {
    const {
        email,
        senha,
        nome,
        cpf,
        rg,
        cnh,
        validadeCnh,
        telefone,
        endereco,
        dataContratacao,
        salario,
        observacoes,
        categoria,
        dataNascimento
    } = req.body;

    // Converte o salário para um número decimal
    const salarioNumerico = parseFloat(salario);

    // Validação básica dos dados
    if (!email || !senha || !nome || !cpf || !cnh) {
        return res.status(400).json({ error: 'Campos obrigatórios faltando.' });
    }

    try {
        // Criptografa a senha antes de salvar
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(senha, salt);

        // Cria o novo usuário no banco de dados
        const novoMotorista = await prisma.user.create({
            data: {
                email: email,
                senha: hashedPassword,
                nome: nome,
                cpf: cpf,
                rg: rg,
                cnh: cnh,
                validadeCnh: new Date(validadeCnh),
                telefone: telefone,
                endereco: endereco,
                dataContratacao: new Date(dataContratacao),
                salario: salarioNumerico,
                observacoes: observacoes,
                categoria: categoria,
                dataNascimento: new Date(dataNascimento)
            }
        });

        res.status(201).json(novoMotorista);
    } catch (error) {
        if (error.code === 'P2002') { // Erro de unique constraint (e-mail, cpf, cnh, rg)
            return res.status(409).json({ error: 'Dados duplicados. E-mail, CPF, RG ou CNH já existem.' });
        }
        console.error("Erro ao cadastrar motorista:", error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

export default router;