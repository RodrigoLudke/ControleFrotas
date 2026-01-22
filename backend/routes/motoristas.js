// backend/routes/motoristas.js
import express from "express";
import pkg from "@prisma/client";
import bcrypt from "bcrypt";
import {autenticarToken, autorizarRoles} from "../index.js";

const {PrismaClient} = pkg;
const prisma = new PrismaClient();
const router = express.Router();

function expandCategories(selected = []) {
    const map = {A: ["A"], B: ["B"], AB: ["A", "B"], C: ["C"], D: ["D"], E: ["E"]};
    const result = new Set();
    for (const s of selected) {
        const arr = map[s];
        if (arr && Array.isArray(arr)) arr.forEach(x => result.add(x));
    }
    return Array.from(result);
}

/* -------------------------
   ROTAS ESPECÍFICAS (SEM :id)
   ------------------------- */

// Listar todos os motoristas (ADMIN)
router.get("/", autenticarToken, autorizarRoles("ADMIN"), async (req, res) => {
    try {
        const companyId = req.user.companyId;

        const motoristas = await prisma.user.findMany({
            where: {
                role: "USER",
                companyId: companyId, // <--- Filtro por empresa
                deletedAt: null       // <--- Filtro Soft Delete (não traz os excluídos)
            },
            select: {
                id: true, nome: true, cpf: true, cnh: true, validadeCnh: true,
                telefone: true, email: true, endereco: true, dataContratacao: true,
                status: true, categoria: true, latitude: true, longitude: true, lastLocationUpdate: true
            },
            orderBy: {nome: "asc"}
        });
        res.json(motoristas);
    } catch (error) {
        console.error("Erro ao buscar motoristas:", error);
        res.status(500).json({error: "Erro interno do servidor."});
    }
});

// Rota de criação simples (POST /)
router.post("/", autenticarToken, autorizarRoles("ADMIN"), async (req, res) => {
    try {
        const {email, senha} = req.body;
        const companyId = req.user.companyId;

        if (!email || !senha) return res.status(400).json({error: "Email e senha são obrigatórios."});

        const usuarioExistente = await prisma.user.findUnique({where: {email}});
        if (usuarioExistente) return res.status(409).json({error: "Este email já está em uso."});

        const senhaHash = await bcrypt.hash(senha, 10);

        const novoMotorista = await prisma.user.create({
            data: {
                company: {
                    connect: { id: companyId }
                },
                email,
                senha: senhaHash,
                role: "USER"
            }
        });
        res.status(201).json({message: "Motorista cadastrado com sucesso!", motorista: novoMotorista});
    } catch (error) {
        console.error("Erro ao registrar motorista:", error);
        res.status(500).json({error: "Erro interno do servidor."});
    }
});

// Cadastro detalhado (Adicionei autenticação para garantir companyId)
router.post("/cadastrar", autenticarToken, autorizarRoles("ADMIN"), async (req, res) => {
    try {
        const {
            email, senha, nome, cpf, rg, cnh, validadeCnh, telefone, endereco,
            dataContratacao, salario, observacoes, categoria, dataNascimento
        } = req.body;

        const companyId = req.user.companyId;

        // Validação básica
        if (!email || !senha || !nome || !cpf || !cnh) {
            return res.status(400).json({error: 'Campos obrigatórios faltando.'});
        }

        // ------------------------------------------------------------------
        // PASSO 1: Busca Global por CPF (procura em TODAS as empresas)
        // ------------------------------------------------------------------
        const usuarioExistente = await prisma.user.findFirst({
            where: { cpf: cpf }
        });

        // Validação de E-mail Global (para login único)
        const emailCheck = await prisma.user.findUnique({ where: { email } });
        if (emailCheck) {
            // Se o email existe e não pertence ao usuário que encontramos pelo CPF...
            if (!usuarioExistente || (usuarioExistente.id !== emailCheck.id)) {
                return res.status(409).json({ error: "Este e-mail já está em uso por outra pessoa." });
            }
        }

        const hashedPassword = await bcrypt.hash(senha, 10);

        // ==================================================================
        // CENÁRIO: O MOTORISTA JÁ EXISTE NO SISTEMA
        // ==================================================================
        if (usuarioExistente) {

            // Lógica de Vínculo com Carros (Função Auxiliar para não repetir código)
            const associarCarros = async (userId) => {
                const selectedCategories = Array.isArray(categoria) ? categoria : (categoria ? [categoria] : []);
                const expanded = expandCategories(selectedCategories);
                if (expanded.length > 0) {
                    const veiculosPermitidos = await prisma.veiculo.findMany({
                        where: { categoria: {in: expanded}, companyId: companyId, deletedAt: null },
                        select: {id: true}
                    });
                    if (veiculosPermitidos.length > 0) {
                        const createManyData = veiculosPermitidos.map(v => ({ userId, veiculoId: v.id }));
                        await prisma.userVeiculo.createMany({data: createManyData, skipDuplicates: true});
                    }
                }
            };

            // CASO A: ELE É DE OUTRA EMPRESA
            if (usuarioExistente.companyId !== companyId) {

                // 1. Removemos vínculos com os carros da empresa ANTIGA
                await prisma.userVeiculo.deleteMany({
                    where: { userId: usuarioExistente.id }
                });

                // 2. Trazemos o motorista para a NOSSA empresa e atualizamos tudo
                const motoristaTransferido = await prisma.user.update({
                    where: { id: usuarioExistente.id },
                    data: {
                        companyId: companyId,   // <--- MUDANÇA DE EMPRESA
                        deletedAt: null,        // Garante que não está excluído
                        status: "ativo",        // Ativa o cadastro

                        // Atualiza dados pessoais
                        senha: hashedPassword,
                        nome, rg, cnh, email,
                        validadeCnh: new Date(validadeCnh),
                        telefone, endereco,
                        dataContratacao: dataContratacao ? new Date(dataContratacao) : null,
                        salario: salario !== undefined ? parseFloat(salario) : null,
                        observacoes: observacoes || "",
                        categoria: Array.isArray(categoria) ? categoria : (categoria ? [categoria] : undefined),
                        dataNascimento: dataNascimento ? new Date(dataNascimento) : null,
                        role: "USER"
                    }
                });

                // 3. Associa aos carros da NOVA empresa
                await associarCarros(motoristaTransferido.id);

                return res.status(200).json({
                    message: "Motorista transferido de outra empresa com sucesso.",
                    motorista: motoristaTransferido
                });
            }

            // CASO B: ELE É DA MESMA EMPRESA (Recontratação)
            if (usuarioExistente.companyId === companyId) {
                // Se já está ativo, erro.
                if (!usuarioExistente.deletedAt) {
                    return res.status(409).json({ error: "Motorista já cadastrado e ativo nesta empresa." });
                }

                // Se estava demitido (soft delete), reativa.
                const motoristaReativado = await prisma.user.update({
                    where: { id: usuarioExistente.id },
                    data: {
                        deletedAt: null,
                        status: "ativo",
                        senha: hashedPassword,
                        nome, rg, cnh, email,
                        validadeCnh: new Date(validadeCnh),
                        telefone, endereco,
                        dataContratacao: dataContratacao ? new Date(dataContratacao) : null,
                        salario: salario !== undefined ? parseFloat(salario) : null,
                        observacoes: observacoes || "",
                        categoria: Array.isArray(categoria) ? categoria : (categoria ? [categoria] : undefined),
                        dataNascimento: dataNascimento ? new Date(dataNascimento) : null,
                        role: "USER"
                    }
                });

                // Re-associa carros da empresa atual
                await associarCarros(motoristaReativado.id);

                return res.status(200).json({
                    message: "Motorista reativado com sucesso (Recontratação).",
                    motorista: motoristaReativado
                });
            }
        }

        // ==================================================================
        // CENÁRIO: MOTORISTA NOVO (NUNCA EXISTIU)
        // ==================================================================

        const novoMotorista = await prisma.user.create({
            data: {
                company: { connect: { id: companyId } },
                email, senha: hashedPassword, nome, cpf, rg,
                cnh, validadeCnh: new Date(validadeCnh), telefone, endereco,
                dataContratacao: dataContratacao ? new Date(dataContratacao) : null,
                salario: salario !== undefined ? parseFloat(salario) : null,
                observacoes: observacoes || "",
                categoria: Array.isArray(categoria) ? categoria : (categoria ? [categoria] : undefined),
                dataNascimento: dataNascimento ? new Date(dataNascimento) : null,
                role: "USER",
                status: "ativo"
            }
        });

        // Associação de veículos
        const selectedCategories = Array.isArray(categoria) ? categoria : (categoria ? [categoria] : []);
        const expanded = expandCategories(selectedCategories);

        if (expanded.length > 0) {
            const veiculosPermitidos = await prisma.veiculo.findMany({
                where: {
                    categoria: {in: expanded},
                    companyId: companyId,
                    deletedAt: null
                },
                select: {id: true}
            });

            if (veiculosPermitidos.length > 0) {
                const createManyData = veiculosPermitidos.map(v => ({userId: novoMotorista.id, veiculoId: v.id}));
                await prisma.userVeiculo.createMany({data: createManyData, skipDuplicates: true});
            }
        }

        res.status(201).json(novoMotorista);

    } catch (error) {
        if (error?.code === 'P2002') {
            return res.status(409).json({error: 'Dados únicos (CPF, CNH ou Email) já cadastrados.'});
        }
        console.error("Erro ao cadastrar motorista:", error);
        res.status(500).json({error: 'Erro interno do servidor.'});
    }
});

// Rota para atualizar localização do motorista em tempo real
router.post("/localizacao", autenticarToken, async (req, res) => {
    try {
        const userId = req.user?.id;
        const companyId = req.user?.companyId;
        const {latitude, longitude} = req.body;

        if (latitude == null || longitude == null) {
            return res.status(400).json({error: "Localização inválida."});
        }

        // Garante que o usuário só atualiza a si mesmo e dentro da empresa correta
        // (Embora userId venha do token, findMany/updateMany é mais seguro em multi-tenant)
        await prisma.user.updateMany({
            where: {
                id: Number(userId),
                companyId: companyId
            },
            data: {
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                lastLocationUpdate: new Date(),
            },
        });

        res.status(200).json({message: "Localização atualizada."});
    } catch (error) {
        console.error("Erro ao atualizar localização:", error);
        res.status(500).json({error: "Erro interno."});
    }
});

// Rota para buscar CNHs vencendo nos próximos 30 dias
router.get("/cnh-vencendo", autenticarToken, autorizarRoles("ADMIN"), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const hoje = new Date();
        const daqui30Dias = new Date();
        daqui30Dias.setDate(hoje.getDate() + 30);

        const motoristas = await prisma.user.findMany({
            where: {
                companyId: companyId,
                deletedAt: null,
                status: "ativo", // Apenas motoristas ativos
                validadeCnh: {
                    lte: daqui30Dias, // Menor ou igual a data limite (pega vencidos também)
                    not: null         // Garante que tem data cadastrada
                }
            },
            select: {
                id: true,
                nome: true,
                validadeCnh: true,
                email: true // Opcional, caso queira contactar
            },
            orderBy: {
                validadeCnh: 'asc' // Os que vencem primeiro aparecem no topo
            }
        });

        res.json(motoristas);
    } catch (error) {
        console.error("Erro ao buscar vencimentos de CNH:", error);
        res.status(500).json({ error: "Erro interno ao buscar CNHs." });
    }
});

/* -------------------------
   ROTAS POR ID (SOMENTE NÚMEROS)
   ------------------------- */

// Buscar 1 motorista por id
router.get("/:id", autenticarToken, autorizarRoles("ADMIN"), async (req, res) => {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({error: "ID inválido."});
    const id = parseInt(req.params.id, 10);
    const companyId = req.user.companyId;

    try {
        // CORREÇÃO: Usar findFirst com filtros de segurança
        const motorista = await prisma.user.findFirst({
            where: {
                id: id,
                companyId: companyId, // <--- Segurança
                deletedAt: null       // <--- Ignora excluídos
            },
            select: {
                id: true, nome: true, email: true, cpf: true, rg: true, telefone: true,
                endereco: true, cnh: true, validadeCnh: true, categoria: true,
                dataContratacao: true, salario: true, observacoes: true, dataNascimento: true, status: true
            }
        });

        if (!motorista) return res.status(404).json({error: "Motorista não encontrado."});
        return res.json(motorista);
    } catch (err) {
        console.error("GET /motoristas/:id error:", err);
        return res.status(500).json({error: "Erro interno ao buscar motorista."});
    }
});

// Atualizar motorista (APENAS ADMIN)
router.patch("/:id", autenticarToken, autorizarRoles("ADMIN"), async (req, res) => {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({error: "ID inválido."});
    const id = parseInt(req.params.id, 10);
    const companyId = req.user.companyId;

    try {
        const {
            nome, email, cpf, telefone, endereco, validadeCnh, categoria, status, senha, salario
        } = req.body;

        const updates = {};
        if (nome !== undefined) updates.nome = nome;
        if (email !== undefined) updates.email = email;
        if (cpf !== undefined) updates.cpf = cpf;
        if (telefone !== undefined) updates.telefone = telefone;
        if (endereco !== undefined) updates.endereco = endereco;
        if (validadeCnh !== undefined) updates.validadeCnh = new Date(validadeCnh);
        if (categoria !== undefined) updates.categoria = Array.isArray(categoria) ? categoria : [categoria];
        if (status !== undefined) updates.status = status;
        if (salario !== undefined) updates.salario = Number(salario);
        if (senha !== undefined) updates.senha = await bcrypt.hash(String(senha), 10);

        // Verifica existência com segurança
        const motoristaExistente = await prisma.user.findFirst({
            where: { id, companyId, deletedAt: null }
        });

        if (!motoristaExistente) return res.status(404).json({error: "Motorista não encontrado."});

        const motoristaAtualizado = await prisma.user.update({
            where: {id},
            data: updates,
            select: {
                id: true, nome: true, email: true, cpf: true, telefone: true,
                endereco: true, categoria: true, status: true, validadeCnh: true, salario: true
            }
        });

        if (categoria !== undefined) {
            // A. Removemos TODAS as permissões atuais desse motorista (limpeza)
            await prisma.userVeiculo.deleteMany({
                where: { userId: id }
            });

            // B. Recalculamos quais carros ele pode dirigir agora
            const selectedCategories = Array.isArray(categoria) ? categoria : [categoria];
            const expanded = expandCategories(selectedCategories); // Usa sua função auxiliar

            if (expanded.length > 0) {
                // Busca veículos da empresa compatíveis
                const veiculosPermitidos = await prisma.veiculo.findMany({
                    where: {
                        categoria: { in: expanded },
                        companyId: companyId,
                        deletedAt: null
                    },
                    select: { id: true }
                });

                // C. Cria os novos vínculos
                if (veiculosPermitidos.length > 0) {
                    const createManyData = veiculosPermitidos.map(v => ({
                        userId: id,
                        veiculoId: v.id
                    }));

                    await prisma.userVeiculo.createMany({
                        data: createManyData,
                        skipDuplicates: true
                    });
                }
            }
        }

        res.json({message: "Motorista atualizado com sucesso.", motorista: motoristaAtualizado});
    } catch (error) {
        console.error("Erro ao atualizar motorista:", error);
        if (error?.code === "P2002") return res.status(409).json({error: "Dados duplicados."});
        res.status(500).json({error: "Erro interno ao atualizar motorista."});
    }
});

// Deletar motorista (SOFT DELETE)
router.delete("/:id", autenticarToken, autorizarRoles("ADMIN"), async (req, res) => {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({error: "ID inválido."});
    const id = parseInt(req.params.id, 10);
    const companyId = req.user.companyId;

    try {
        // 1. Verifica se o motorista existe, pertence à empresa e não está deletado
        const motoristaExistente = await prisma.user.findFirst({
            where: {
                id: id,
                companyId: companyId,
                deletedAt: null
            }
        });

        if (!motoristaExistente) return res.status(404).json({error: "Motorista não encontrado."});

        // 2. SOFT DELETE: Atualiza o deletedAt e muda status para inativo
        // Não apagamos de verdade para não quebrar Viagens, Abastecimentos, etc.
        await prisma.user.update({
            where: { id },
            data: {
                deletedAt: new Date(),
                status: "inativo" // Bloqueia login imediatamente
            }
        });

        res.json({message: "Motorista deletado com sucesso."});
    } catch (error) {
        console.error("Erro ao deletar motorista:", error);
        res.status(500).json({error: "Erro interno ao deletar motorista."});
    }
});

export default router;