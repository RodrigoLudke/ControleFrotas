// backend/routes/manutencoes.js
import express from "express";
import pkg from "@prisma/client";
import {autenticarToken} from "../index.js";

const {PrismaClient} = pkg;
const prisma = new PrismaClient();
const router = express.Router();

// Listar manutenções
router.get("/", autenticarToken, async (req, res) => {
    try {
        const {status, from, to, veiculoId, limit} = req.query;
        const isAdmin = req.user && req.user.role === "ADMIN";

        const where = {};

        if (!isAdmin) {
            where.userId = Number(req.user.id);
        } else {
            if (veiculoId !== undefined) {
                const vid = parseInt(String(veiculoId), 10);
                if (!Number.isNaN(vid)) where.veiculoId = vid;
            }
        }

        if (status) where.status = String(status).toUpperCase();
        if (from) {
            const d = new Date(String(from));
            if (!Number.isNaN(d.getTime())) where.data = {...(where.data || {}), gte: d};
        }
        if (to) {
            const d = new Date(String(to));
            if (!Number.isNaN(d.getTime())) where.data = {...(where.data || {}), lte: d};
        }

        const prismaWhere = {};
        if (where.userId !== undefined) prismaWhere.userId = where.userId;
        if (where.veiculoId !== undefined) prismaWhere.veiculoId = where.veiculoId;
        if (where.status !== undefined) prismaWhere.status = where.status;
        if (where.data !== undefined) prismaWhere.data = where.data;

        const take = limit ? Math.min(100, parseInt(String(limit), 10) || 100) : undefined;

        const manutencoes = await prisma.manutencao.findMany({
            where: prismaWhere,
            orderBy: {data: "desc"}, // Ajustado para DESC (mais recentes primeiro)
            take,
            include: {
                veiculo: {select: {id: true, placa: true, modelo: true}},
                user: {select: {id: true, nome: true, email: true}} // Garante o nome na lista
            }
        });

        res.json(manutencoes);
    } catch (error) {
        console.error("Erro ao listar manutenções:", error);
        res.status(500).json({error: "Erro interno ao listar manutenções."});
    }
});

// Buscar 1 manutenção por id
router.get("/:id", autenticarToken, async (req, res) => {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({error: "ID inválido."});
    const id = parseInt(req.params.id, 10);

    try {
        const m = await prisma.manutencao.findUnique({
            where: {id},
            include: {
                veiculo: {select: {id: true, placa: true, modelo: true}},
                user: {select: {id: true, nome: true, email: true}} // Garante o nome no detalhe
            }
        });
        if (!m) return res.status(404).json({error: "Manutenção não encontrada."});

        const isAdmin = req.user && req.user.role === "ADMIN";
        if (!isAdmin && m.userId !== req.user.id) return res.status(403).json({error: "Acesso negado."});

        res.json(m);
    } catch (error) {
        console.error("GET /manutencoes/:id error:", error);
        res.status(500).json({error: "Erro interno ao buscar manutenção."});
    }
});

// Criar manutenção
router.post("/", autenticarToken, async (req, res) => {
    try {
        const {
            veiculoId, data, quilometragem, tipo, descricao, custo, local, observacoes, status, userId
        } = req.body;

        if (!veiculoId || !data || !quilometragem || !tipo || !descricao) {
            return res.status(400).json({error: "Campos obrigatórios: veiculoId, data, quilometragem, tipo, descricao."});
        }

        const vid = parseInt(String(veiculoId), 10);
        if (Number.isNaN(vid)) return res.status(400).json({error: "veiculoId inválido."});

        const dt = new Date(String(data));
        if (Number.isNaN(dt.getTime())) return res.status(400).json({error: "data inválida."});

        // LÓGICA DE CORREÇÃO: Se for Admin e enviou userId, usa ele. Se não, usa o logado.
        let targetUserId = req.user.id;
        if (req.user.role === "ADMIN" && userId) {
            const parsedId = Number.parseInt(String(userId), 10);
            if (!Number.isNaN(parsedId)) targetUserId = parsedId;
        }

        const newManut = await prisma.manutencao.create({
            data: {
                veiculoId: vid,
                userId: targetUserId, // Usa o ID correto (Motorista ou Admin)
                data: dt,
                quilometragem: Number(quilometragem),
                tipo: String(tipo).toUpperCase(),
                descricao: String(descricao),
                custo: custo !== undefined && custo !== null ? Number(custo) : null,
                local: local ?? null,
                observacoes: observacoes ?? null,
                status: status ? String(status).toUpperCase() : "AGENDADA"
            }
        });

        res.status(201).json(newManut);
    } catch (error) {
        console.error("Erro ao criar manutenção:", error);
        res.status(500).json({error: "Erro interno ao criar manutenção."});
    }
});

// Atualizar manutenção
router.patch("/:id", autenticarToken, async (req, res) => {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({error: "ID inválido."});
    const id = parseInt(req.params.id, 10);

    try {
        const existing = await prisma.manutencao.findUnique({where: {id}});
        if (!existing) return res.status(404).json({error: "Manutenção não encontrada."});

        const isAdmin = req.user && req.user.role === "ADMIN";
        if (!isAdmin && existing.userId !== req.user.id) return res.status(403).json({error: "Acesso negado."});

        const {
            veiculoId, data, quilometragem, tipo, descricao, custo, local, observacoes, status, userId
        } = req.body;

        const updates = {};
        if (veiculoId !== undefined) updates.veiculoId = parseInt(String(veiculoId), 10);
        if (data !== undefined) updates.data = new Date(String(data));
        if (quilometragem !== undefined) updates.quilometragem = Number(quilometragem);
        if (tipo !== undefined) updates.tipo = String(tipo).toUpperCase();
        if (descricao !== undefined) updates.descricao = String(descricao);
        if (custo !== undefined) updates.custo = custo !== null ? Number(custo) : null;
        if (local !== undefined) updates.local = local;
        if (observacoes !== undefined) updates.observacoes = observacoes;
        if (status !== undefined) updates.status = String(status).toUpperCase();

        // Permite Admin reatribuir a manutenção para outro motorista
        if (isAdmin && userId !== undefined) {
            updates.userId = Number.parseInt(String(userId), 10);
        }

        const updated = await prisma.manutencao.update({
            where: {id},
            data: updates
        });

        res.json({message: "Manutenção atualizada com sucesso.", manutencao: updated});
    } catch (error) {
        console.error("Erro ao atualizar manutenção:", error);
        res.status(500).json({error: "Erro interno ao atualizar manutenção."});
    }
});

// Deletar manutenção
router.delete("/:id", autenticarToken, async (req, res) => {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({error: "ID inválido."});
    const id = parseInt(req.params.id, 10);

    try {
        const existing = await prisma.manutencao.findUnique({where: {id}});
        if (!existing) return res.status(404).json({error: "Manutenção não encontrada."});

        const isAdmin = req.user && req.user.role === "ADMIN";
        if (!isAdmin && existing.userId !== req.user.id) return res.status(403).json({error: "Acesso negado."});

        await prisma.manutencao.delete({where: {id}});
        res.json({message: "Manutenção deletada com sucesso."});
    } catch (error) {
        console.error("Erro ao deletar manutenção:", error);
        res.status(500).json({error: "Erro interno ao deletar manutenção."});
    }
});

export default router;