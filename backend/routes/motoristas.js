import express from "express";
import pkg from "@prisma/client";
import bcrypt from "bcrypt";
import { autenticarToken, autorizarRoles } from "../index.js";

const { PrismaClient } = pkg;
const prisma = new PrismaClient();
const router = express.Router();

function expandCategories(selected = []) {
    // para cada categoria selecionada, devolve as categorias de veículos permitidas
    const map = {
        A: ["A"],
        B: ["B"],
        AB: ["A", "B"],
        C: ["C"],
        D: ["D"],
        E: ["E"],
    };

    const result = new Set();
    for (const s of selected) {
        const arr = map[s];
        if (arr && Array.isArray(arr)) {
            arr.forEach(x => result.add(x));
        }
    }
    return Array.from(result);
}

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

// GET /motoristas/:id -> retornar dados de 1 motorista (APENAS ADMIN)
router.get("/listaredit/:id", autenticarToken, autorizarRoles("ADMIN"), async (req, res) => {
    try {
        // Valida ID
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) {
            return res.status(400).json({ error: "ID inválido." });
        }

        // Busca o motorista específico
        const motorista = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                nome: true,
                email: true,
                cpf: true,
                rg: true,
                telefone: true,
                endereco: true,
                cnh: true,
                validadeCnh: true,
                categoria: true,
                dataContratacao: true,
                salario: true,
                observacoes: true,
                dataNascimento: true,
                status: true
            }
        });

        if (!motorista) {
            return res.status(404).json({ error: "Motorista não encontrado." });
        }

        return res.json(motorista);
    } catch (error) {
        console.error("GET /motoristas/:id error:", error);
        return res.status(500).json({ error: "Erro interno ao buscar motorista." });
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
                categoria: Array.isArray(categoria) ? categoria : (categoria ? [categoria] : undefined),
                dataNascimento: new Date(dataNascimento)
            }
        });

        // Se houver categorias, expande e associa veículos
        const selectedCategories = Array.isArray(categoria) ? categoria : (categoria ? [categoria] : []);
        const expanded = expandCategories(selectedCategories);

        if (expanded.length > 0) {
            // busca veículos cuja categoria esteja em "expanded"
            const veiculosPermitidos = await prisma.veiculo.findMany({
                where: { categoria: { in: expanded } },
                select: { id: true }
            });

            if (veiculosPermitidos.length > 0) {
                const createManyData = veiculosPermitidos.map(v => ({
                    userId: novoMotorista.id,
                    veiculoId: v.id
                }));

                // criar associações (skipDuplicates por segurança)
                await prisma.userVeiculo.createMany({
                    data: createManyData,
                    skipDuplicates: true
                });
            }
        }

        res.status(201).json(novoMotorista);
    } catch (error) {
        if (error.code === 'P2002') { // Erro de unique constraint (e-mail, cpf, cnh, rg)
            return res.status(409).json({ error: 'Dados duplicados. E-mail, CPF, RG ou CNH já existem.' });
        }
        console.error("Erro ao cadastrar motorista:", error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

// Atualizar motorista (APENAS ADMIN)
router.patch("/:id", autenticarToken, autorizarRoles("ADMIN"), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { nome, email, cpf, telefone, endereco, validadeCnh, categoria, status, senha } = req.body;

        const dadosParaAtualizar = {};

        if (nome !== undefined) dadosParaAtualizar.nome = nome;
        if (email !== undefined) dadosParaAtualizar.email = email;
        if (cpf !== undefined) dadosParaAtualizar.cpf = cpf;
        if (telefone !== undefined) dadosParaAtualizar.telefone = telefone;
        if (endereco !== undefined) dadosParaAtualizar.endereco = endereco;
        if (validadeCnh !== undefined) dadosParaAtualizar.validadeCnh = new Date(validadeCnh);
        if (categoria !== undefined) dadosParaAtualizar.categoria = Array.isArray(categoria) ? categoria : [categoria];
        if (status !== undefined) dadosParaAtualizar.status = status;
        if (senha !== undefined) {
            const bcrypt = await import("bcrypt");
            dadosParaAtualizar.senha = await bcrypt.hash(senha, 10);
        }

        const motoristaExistente = await prisma.user.findUnique({ where: { id } });
        if (!motoristaExistente) {
            return res.status(404).json({ error: "Motorista não encontrado." });
        }

        const motoristaAtualizado = await prisma.user.update({
            where: { id },
            data: dadosParaAtualizar,
            select: {
                id: true, nome: true, email: true, cpf: true, telefone: true, endereco: true, categoria: true, status: true, validadeCnh: true
            }
        });

        res.json({ message: "Motorista atualizado com sucesso.", motorista: motoristaAtualizado });
    } catch (error) {
        console.error("Erro ao atualizar motorista:", error);
        if (error.code === "P2002") {
            return res.status(409).json({ error: "Dados duplicados (email/cpf/rg/cnh)." });
        }
        res.status(500).json({ error: "Erro interno ao atualizar motorista." });
    }
});

// Deletar motorista (APENAS ADMIN)
router.delete("/:id", autenticarToken, autorizarRoles("ADMIN"), async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        const motoristaExistente = await prisma.user.findUnique({ where: { id } });
        if (!motoristaExistente) {
            return res.status(404).json({ error: "Motorista não encontrado." });
        }

        // se quiser checar dependências (viagens, veiculos), pode-se bloquear a remoção ou remover em cascata
        await prisma.user.delete({ where: { id } });

        res.json({ message: "Motorista deletado com sucesso." });
    } catch (error) {
        console.error("Erro ao deletar motorista:", error);
        res.status(500).json({ error: "Erro interno ao deletar motorista." });
    }
});


export default router;