// backend/routes/abastecimentos.js
import express from "express";
import pkg from "@prisma/client";
import {autenticarToken} from "../index.js";

const {PrismaClient} = pkg;
const prisma = new PrismaClient();
const router = express.Router();

/*
  Rotas:
  GET    /abastecimentos         -> lista (admin: todos; user: só os seus). filtros: veiculoId, from, to, limit
  GET    /abastecimentos/:id     -> detalhe (owner | admin)
  POST   /abastecimentos         -> cria (autenticado)
  PATCH  /abastecimentos/:id     -> atualiza (owner | admin)
  DELETE /abastecimentos/:id     -> deleta (owner | admin)
*/

// Listar abastecimentos
router.get("/", autenticarToken, async (req, res) => {
    try {
        const {veiculoId, from, to, limit} = req.query;
        const isAdmin = req.user && req.user.role === "ADMIN";
        const companyId = req.user.companyId;

        const where = {};

        if (!isAdmin) {
            where.userId = Number(req.user.id);
        } else {
            if (veiculoId !== undefined) {
                const vid = parseInt(String(veiculoId), 10);
                if (!Number.isNaN(vid)) where.veiculoId = vid;
            }
        }

        if (from) {
            const d = new Date(String(from));
            if (!Number.isNaN(d.getTime())) where.data = {...(where.data || {}), gte: d};
        }
        if (to) {
            const d = new Date(String(to));
            if (!Number.isNaN(d.getTime())) where.data = {...(where.data || {}), lte: d};
        }

        const prismaWhere = {
            companyId: companyId
        };
        if (where.userId !== undefined) prismaWhere.userId = where.userId;
        if (where.veiculoId !== undefined) prismaWhere.veiculoId = where.veiculoId;
        if (where.data !== undefined) prismaWhere.data = where.data;

        const take = limit ? Math.min(200, parseInt(String(limit), 10) || 200) : undefined;

        const abastecimentos = await prisma.abastecimento.findMany({
            where: prismaWhere,
            orderBy: {data: "desc"},
            take,
            include: {
                veiculo: {select: {id: true, placa: true, modelo: true}},
                user: {select: {id: true, nome: true, email: true}}
            }
        });

        res.json(abastecimentos);
    } catch (error) {
        console.error("Erro ao listar abastecimentos:", error);
        res.status(500).json({error: "Erro interno ao listar abastecimentos."});
    }
});

// Buscar 1 abastecimento por id
router.get("/:id", autenticarToken, async (req, res) => {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({error: "ID inválido."});
    const id = parseInt(req.params.id, 10);
    const companyId = req.user.companyId;

    try {
        const a = await prisma.abastecimento.findFirst({
            where: {
                id: id,
                companyId: companyId
            },
            include: {
                veiculo: {select: {id: true, placa: true, modelo: true}},
                user: {select: {id: true, nome: true, email: true}}
            }
        });
        if (!a) return res.status(404).json({error: "Abastecimento não encontrado."});

        const isAdmin = req.user && req.user.role === "ADMIN";
        if (!isAdmin && a.userId !== req.user.id) return res.status(403).json({error: "Acesso negado."});

        res.json(a);
    } catch (error) {
        console.error("GET /abastecimentos/:id error:", error);
        res.status(500).json({error: "Erro interno ao buscar abastecimento."});
    }
});

// Criar abastecimento
router.post("/", autenticarToken, async (req, res) => {
    try {
        const {
            veiculoId,
            data,
            quilometragem,
            litros,
            valorPorLitro,
            combustivel,
            posto,
            comprovanteUrl
        } = req.body;

        const companyId = req.user.companyId;

        if (!veiculoId || !data || quilometragem === undefined || litros === undefined || valorPorLitro === undefined || !combustivel) {
            return res.status(400).json({error: "Campos obrigatórios: veiculoId, data, quilometragem, litros, valorPorLitro, combustivel."});
        }

        const vid = parseInt(String(veiculoId), 10);
        if (Number.isNaN(vid)) return res.status(400).json({error: "veiculoId inválido."});

        // SEGURANÇA: Verificar se o veículo pertence à empresa
        const veiculoValido = await prisma.veiculo.findFirst({
            where: { id: vid, companyId: companyId }
        });

        if (!veiculoValido) {
            return res.status(404).json({ error: "Veículo não encontrado ou não pertence à sua empresa." });
        }

        const dt = new Date(String(data));
        if (Number.isNaN(dt.getTime())) return res.status(400).json({error: "data inválida."});

        const litrosNum = Number(litros);
        const valorNum = Number(valorPorLitro);
        if (isNaN(litrosNum) || isNaN(valorNum)) return res.status(400).json({error: "litros ou valorPorLitro inválido."});

        const custoTotal = litrosNum * valorNum;

        // CORREÇÃO: Usando connect para todos os relacionamentos
        const novo = await prisma.abastecimento.create({
            data: {
                company: {
                    connect: { id: companyId }
                },
                veiculo: {
                    connect: { id: vid }
                },
                user: {
                    connect: { id: req.user.id }
                },
                data: dt,
                quilometragem: Number(quilometragem),
                litros: litrosNum,
                valorPorLitro: valorNum,
                custoTotal: Number(custoTotal.toFixed(2)),
                combustivel: String(combustivel),
                posto: posto ?? null,
                comprovanteUrl: comprovanteUrl ?? null
            }
        });

        res.status(201).json(novo);
    } catch (error) {
        console.error("Erro ao criar abastecimento:", error);
        res.status(500).json({error: "Erro interno ao criar abastecimento."});
    }
});

// Atualizar abastecimento (owner ou ADMIN)
router.patch("/:id", autenticarToken, async (req, res) => {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({error: "ID inválido."});
    const id = parseInt(req.params.id, 10);
    const companyId = req.user.companyId;

    try {
        const existing = await prisma.abastecimento.findFirst({where: {id, companyId}});
        if (!existing) return res.status(404).json({error: "Abastecimento não encontrado."});

        const isAdmin = req.user && req.user.role === "ADMIN";
        if (!isAdmin && existing.userId !== req.user.id) return res.status(403).json({error: "Acesso negado."});

        const {
            veiculoId,
            data,
            quilometragem,
            litros,
            valorPorLitro,
            combustivel,
            posto,
            comprovanteUrl
        } = req.body;

        const updates = {};
        if (veiculoId !== undefined) {
            const vid = parseInt(String(veiculoId), 10);
            if (Number.isNaN(vid)) return res.status(400).json({error: "veiculoId inválido."});
            // Verifica se o NOVO veículo também pertence à empresa
            const veiculoValido = await prisma.veiculo.findFirst({
                where: { id: vid, companyId: companyId }
            });
            if (!veiculoValido) {
                return res.status(400).json({ error: "O veículo informado não pertence à sua empresa." });
            }
            updates.veiculoId = vid;
        }
        if (data !== undefined) {
            const dt = new Date(String(data));
            if (Number.isNaN(dt.getTime())) return res.status(400).json({error: "data inválida."});
            updates.data = dt;
        }
        if (quilometragem !== undefined) updates.quilometragem = Number(quilometragem);
        if (litros !== undefined) updates.litros = Number(litros);
        if (valorPorLitro !== undefined) updates.valorPorLitro = Number(valorPorLitro);
        if (litros !== undefined || valorPorLitro !== undefined) {
            const litrosVal = litros !== undefined ? Number(litros) : Number(existing.litros);
            const valorVal = valorPorLitro !== undefined ? Number(valorPorLitro) : Number(existing.valorPorLitro);
            updates.custoTotal = Number((litrosVal * valorVal).toFixed(2));
        }
        if (combustivel !== undefined) updates.combustivel = combustivel;
        if (posto !== undefined) updates.posto = posto;
        if (comprovanteUrl !== undefined) updates.comprovanteUrl = comprovanteUrl;

        const updated = await prisma.abastecimento.update({
            where: {id},
            data: updates
        });

        res.json({message: "Abastecimento atualizado com sucesso.", abastecimento: updated});
    } catch (error) {
        console.error("Erro ao atualizar abastecimento:", error);
        res.status(500).json({error: "Erro interno ao atualizar abastecimento."});
    }
});

// Deletar abastecimento (owner ou ADMIN)
router.delete("/:id", autenticarToken, async (req, res) => {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({error: "ID inválido."});
    const id = parseInt(req.params.id, 10);
    const companyId = req.user.companyId;

    try {
        const existing = await prisma.abastecimento.findFirst({
            where: { id, companyId }
        });
        if (!existing) return res.status(404).json({error: "Abastecimento não encontrado."});

        const isAdmin = req.user && req.user.role === "ADMIN";
        if (!isAdmin && existing.userId !== req.user.id) return res.status(403).json({error: "Acesso negado."});

        await prisma.abastecimento.delete({where: {id}});
        res.json({message: "Abastecimento deletado com sucesso."});
    } catch (error) {
        console.error("Erro ao deletar abastecimento:", error);
        res.status(500).json({error: "Erro interno ao deletar abastecimento."});
    }
});

export default router;