// backend/routes/manutencoes.js
import express from "express";
import pkg from "@prisma/client";
import { autenticarToken } from "../index.js";

const { PrismaClient } = pkg;
const prisma = new PrismaClient();
const router = express.Router();

// Listar manutenções
router.get("/", autenticarToken, async (req, res) => {
    try {
        const { status, from, to, veiculoId, limit } = req.query;
        const isAdmin = req.user && req.user.role === "ADMIN";
        const companyId = req.user.companyId; // <--- Pega da sessão

        // 1. Filtro base de segurança
        const where = {
            companyId: companyId
        };

        if (!isAdmin) {
            where.userId = Number(req.user.id);
        } else {
            // Se for admin e enviou veiculoId, filtra por ele
            if (veiculoId !== undefined) {
                const vid = parseInt(String(veiculoId), 10);
                if (!Number.isNaN(vid)) where.veiculoId = vid;
            }
        }

        if (status) where.status = String(status).toUpperCase();

        if (from || to) {
            where.data = {};
            if (from) {
                const d = new Date(String(from));
                if (!Number.isNaN(d.getTime())) where.data.gte = d;
            }
            if (to) {
                const d = new Date(String(to));
                if (!Number.isNaN(d.getTime())) where.data.lte = d;
            }
        }

        const take = limit ? Math.min(100, parseInt(String(limit), 10) || 100) : undefined;

        const manutencoes = await prisma.manutencao.findMany({
            where: where, // <--- Usa o objeto com companyId
            orderBy: { data: "desc" },
            take,
            include: {
                veiculo: { select: { id: true, placa: true, modelo: true } },
                user: { select: { id: true, nome: true, email: true } }
            }
        });

        res.json(manutencoes);
    } catch (error) {
        console.error("Erro ao listar manutenções:", error);
        res.status(500).json({ error: "Erro interno ao listar manutenções." });
    }
});

// Buscar 1 manutenção por id
router.get("/:id", autenticarToken, async (req, res) => {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: "ID inválido." });
    const id = parseInt(req.params.id, 10);
    const companyId = req.user.companyId;

    try {
        // CORREÇÃO: Usar findFirst para garantir companyId
        const m = await prisma.manutencao.findFirst({
            where: {
                id: id,
                companyId: companyId
            },
            include: {
                veiculo: { select: { id: true, placa: true, modelo: true } },
                user: { select: { id: true, nome: true, email: true } }
            }
        });

        if (!m) return res.status(404).json({ error: "Manutenção não encontrada." });

        const isAdmin = req.user && req.user.role === "ADMIN";
        if (!isAdmin && m.userId !== req.user.id) return res.status(403).json({ error: "Acesso negado." });

        res.json(m);
    } catch (error) {
        console.error("GET /manutencoes/:id error:", error);
        res.status(500).json({ error: "Erro interno ao buscar manutenção." });
    }
});

// Criar manutenção
router.post("/", autenticarToken, async (req, res) => {
    try {
        const {
            veiculoId, data, quilometragem, tipo, descricao, custo, local, observacoes, status, userId,
            nfNumero, comprovanteUrl // Campos opcionais do schema novo
        } = req.body;

        const companyId = req.user.companyId;

        if (!veiculoId || !data || !quilometragem || !tipo || !descricao) {
            return res.status(400).json({ error: "Campos obrigatórios: veiculoId, data, quilometragem, tipo, descricao." });
        }

        const vid = parseInt(String(veiculoId), 10);
        if (Number.isNaN(vid)) return res.status(400).json({ error: "veiculoId inválido." });

        // SEGURANÇA: Verificar se veículo pertence à empresa
        const veiculoValido = await prisma.veiculo.findFirst({
            where: { id: vid, companyId: companyId }
        });
        if (!veiculoValido) {
            return res.status(404).json({ error: "Veículo não encontrado ou não pertence à sua empresa." });
        }

        const dt = new Date(String(data));
        if (Number.isNaN(dt.getTime())) return res.status(400).json({ error: "data inválida." });

        // Lógica de atribuição de usuário (Admin pode definir outro)
        let targetUserId = req.user.id;
        if (req.user.role === "ADMIN" && userId) {
            const parsedId = Number.parseInt(String(userId), 10);
            // Idealmente: verificar se esse userId também é da mesma companyId
            if (!Number.isNaN(parsedId)) targetUserId = parsedId;
        }

        const newManut = await prisma.manutencao.create({
            data: {
                companyId: companyId, // <--- Vincula à empresa
                veiculoId: vid,
                userId: targetUserId,
                data: dt,
                quilometragem: Number(quilometragem),
                tipo: String(tipo).toUpperCase(),
                descricao: String(descricao),
                custo: custo !== undefined && custo !== null ? Number(custo) : null,
                local: local ?? null,
                observacoes: observacoes ?? null,
                status: status ? String(status).toUpperCase() : "AGENDADA",
                nfNumero: nfNumero ?? null,
                comprovanteUrl: comprovanteUrl ?? null
            }
        });

        res.status(201).json(newManut);
    } catch (error) {
        console.error("Erro ao criar manutenção:", error);
        res.status(500).json({ error: "Erro interno ao criar manutenção." });
    }
});

// Atualizar manutenção
router.patch("/:id", autenticarToken, async (req, res) => {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: "ID inválido." });
    const id = parseInt(req.params.id, 10);
    const companyId = req.user.companyId;

    try {
        // CORREÇÃO: findFirst com companyId
        const existing = await prisma.manutencao.findFirst({
            where: { id, companyId }
        });

        if (!existing) return res.status(404).json({ error: "Manutenção não encontrada." });

        const isAdmin = req.user && req.user.role === "ADMIN";
        if (!isAdmin && existing.userId !== req.user.id) return res.status(403).json({ error: "Acesso negado." });

        const {
            veiculoId, data, quilometragem, tipo, descricao, custo, local, observacoes, status, userId,
            nfNumero, comprovanteUrl
        } = req.body;

        const updates = {};

        // Se mudar o veículo, verifica se o novo é da empresa
        if (veiculoId !== undefined) {
            const vid = parseInt(String(veiculoId), 10);
            if (!Number.isNaN(vid)) {
                const vCheck = await prisma.veiculo.findFirst({ where: { id: vid, companyId } });
                if (!vCheck) return res.status(400).json({ error: "Veículo inválido ou de outra empresa." });
                updates.veiculoId = vid;
            }
        }

        if (data !== undefined) updates.data = new Date(String(data));
        if (quilometragem !== undefined) updates.quilometragem = Number(quilometragem);
        if (tipo !== undefined) updates.tipo = String(tipo).toUpperCase();
        if (descricao !== undefined) updates.descricao = String(descricao);
        if (custo !== undefined) updates.custo = custo !== null ? Number(custo) : null;
        if (local !== undefined) updates.local = local;
        if (observacoes !== undefined) updates.observacoes = observacoes;
        if (status !== undefined) updates.status = String(status).toUpperCase();
        if (nfNumero !== undefined) updates.nfNumero = nfNumero;
        if (comprovanteUrl !== undefined) updates.comprovanteUrl = comprovanteUrl;

        // Permite Admin reatribuir
        if (isAdmin && userId !== undefined) {
            updates.userId = Number.parseInt(String(userId), 10);
        }

        const updated = await prisma.manutencao.update({
            where: { id },
            data: updates
        });

        res.json({ message: "Manutenção atualizada com sucesso.", manutencao: updated });
    } catch (error) {
        console.error("Erro ao atualizar manutenção:", error);
        res.status(500).json({ error: "Erro interno ao atualizar manutenção." });
    }
});

// Deletar manutenção
router.delete("/:id", autenticarToken, async (req, res) => {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: "ID inválido." });
    const id = parseInt(req.params.id, 10);
    const companyId = req.user.companyId;

    try {
        const existing = await prisma.manutencao.findFirst({
            where: { id, companyId }
        });

        if (!existing) return res.status(404).json({ error: "Manutenção não encontrada." });

        const isAdmin = req.user && req.user.role === "ADMIN";
        if (!isAdmin && existing.userId !== req.user.id) return res.status(403).json({ error: "Acesso negado." });

        await prisma.manutencao.delete({ where: { id } });
        res.json({ message: "Manutenção deletada com sucesso." });
    } catch (error) {
        console.error("Erro ao deletar manutenção:", error);
        res.status(500).json({ error: "Erro interno ao deletar manutenção." });
    }
});

export default router;