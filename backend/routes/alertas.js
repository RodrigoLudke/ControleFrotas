// backend/routes/alertas.js
import express from "express";
import pkg from "@prisma/client";
import { autenticarToken, autorizarRoles } from "../index.js";

const { PrismaClient } = pkg;
const prisma = new PrismaClient();
const router = express.Router();

/*
   POST /alertas
   Motorista autenticado cria um alerta/solicitação de manutenção ou um registro rápido.
   Body: { veiculoId?: number, mensagem: string, tipo?: "SOLICITACAO"|"REGISTRO_RAPIDO" }
 */
router.post("/", autenticarToken, async (req, res) => {
    try {
        const userId = req.user?.id;
        const companyId = req.user?.companyId; // <--- Pega da sessão
        const { veiculoId, mensagem, tipo } = req.body;

        if (!mensagem || String(mensagem).trim().length === 0) {
            return res.status(400).json({ error: "Mensagem é obrigatória." });
        }

        // Se informou veículo, valida se pertence à empresa
        if (veiculoId) {
            const vid = Number(veiculoId);
            const veiculoValido = await prisma.veiculo.findFirst({
                where: { id: vid, companyId: companyId }
            });
            if (!veiculoValido) {
                return res.status(400).json({ error: "Veículo inválido ou não pertence à sua empresa." });
            }
        }

        const alerta = await prisma.alerta.create({
            data: {
                companyId: companyId, // <--- Vincula à empresa
                userId,
                veiculoId: veiculoId ? Number(veiculoId) : null,
                mensagem,
                tipo: tipo === "REGISTRO_RAPIDO" ? "REGISTRO_RAPIDO" : "SOLICITACAO",
                status: "PENDENTE",
            },
            include: {
                user: { select: { id: true, nome: true, email: true } },
            },
        });

        return res.status(201).json(alerta);
    } catch (err) {
        console.error("Erro POST /alertas:", err);
        res.status(500).json({ error: "Erro interno ao criar alerta." });
    }
});

/* GET /
    Motorista autenticado lista seus próprios alertas
 */
router.get("/", autenticarToken, async (req, res) => {
    try {
        const userId = req.user?.id;
        const companyId = req.user?.companyId;

        const alertas = await prisma.alerta.findMany({
            where: {
                userId,
                companyId: companyId // <--- Segurança extra (filtro por empresa)
            },
            orderBy: { createdAt: "desc" },
            include: {
                veiculo: { select: { id: true, placa: true, modelo: true } },
            },
        });

        res.json(alertas);
    } catch (err) {
        console.error("Erro GET /alertas/meus:", err);
        res.status(500).json({ error: "Erro ao buscar seus alertas." });
    }
});

/*
   GET /admin
   Admin: lista alertas DA SUA EMPRESA (padrão: todos ou filtro por status)
 */
router.get("/admin", autenticarToken, autorizarRoles("ADMIN"), async (req, res) => {
    try {
        const { status } = req.query;
        const companyId = req.user.companyId;

        const where = {
            companyId: companyId // <--- Filtro OBRIGATÓRIO
        };

        if (status) {
            where.status = String(status);
        }

        const alertas = await prisma.alerta.findMany({
            where,
            orderBy: { createdAt: "desc" },
            include: {
                user: { select: { id: true, nome: true, email: true } },
                veiculo: { select: { id: true, placa: true, modelo: true } },
            },
        });

        res.json(alertas);
    } catch (err) {
        console.error("Erro GET /alertas/admin:", err);
        res.status(500).json({ error: "Erro ao buscar alertas." });
    }
});

/*
   GET /:id
   Admin: detalhe do alerta (seguro por empresa)
 */
router.get("/:id", autenticarToken, autorizarRoles("ADMIN"), async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const companyId = req.user.companyId;

        if (Number.isNaN(id)) return res.status(400).json({ error: "ID inválido." });

        // CORREÇÃO: findFirst com companyId
        const alerta = await prisma.alerta.findFirst({
            where: {
                id: id,
                companyId: companyId
            },
            include: {
                user: { select: { id: true, nome: true, email: true } },
                veiculo: { select: { id: true, placa: true, modelo: true } },
            },
        });

        if (!alerta) return res.status(404).json({ error: "Alerta não encontrado." });
        res.json(alerta);
    } catch (err) {
        console.error("Erro GET /alertas/:id:", err);
        res.status(500).json({ error: "Erro interno." });
    }
});

/*
   POST /:id/decidir
   Admin aprova ou reprova.
   Se aceitar e mandar agendar, cria manutenção (vinculada à empresa).
 */
router.post("/:id/decidir", autenticarToken, autorizarRoles("ADMIN"), async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const companyId = req.user.companyId;

        if (Number.isNaN(id)) return res.status(400).json({ error: "ID inválido." });

        const { action, agendar } = req.body;
        if (!action || !["accept", "reject"].includes(action)) {
            return res.status(400).json({ error: "Ação inválida. Use 'accept' ou 'reject'." });
        }

        // 1. Busca alerta com segurança da empresa
        const alerta = await prisma.alerta.findFirst({
            where: { id, companyId }
        });

        if (!alerta) return res.status(404).json({ error: "Alerta não encontrado." });

        if (action === "reject") {
            const updated = await prisma.alerta.update({
                where: { id },
                data: { status: "REPROVADO" }
            });
            return res.json({ message: "Alerta reprovado.", alerta: updated });
        }

        // action === "accept"
        const updatedAlerta = await prisma.alerta.update({
            where: { id },
            data: { status: "APROVADO" }
        });

        let manutencaoCriada = null;
        if (agendar) {
            const { data: dataAgendamento, quilometragem, tipo = "CORRETIVA", descricao } = agendar;
            const statusManut = agendar?.status === "CONCLUIDA" ? "CONCLUIDA" : "AGENDADA";

            const veiculoIdFinal = alerta.veiculoId ?? (agendar.veiculoId ? Number(agendar.veiculoId) : null);

            // Validação extra: se o veiculoId vier do 'agendar' (manual) e não do alerta,
            // verificar se pertence à empresa
            if (!alerta.veiculoId && veiculoIdFinal) {
                const vCheck = await prisma.veiculo.findFirst({ where: { id: veiculoIdFinal, companyId }});
                if (!vCheck) return res.status(400).json({ error: "Veículo informado no agendamento não pertence à empresa." });
            }

            if (!veiculoIdFinal) {
                // Se não tiver veículo no alerta nem no agendamento, não dá pra criar manutenção
                // (Depende da regra de negócio, mas geralmente manutenção precisa de veículo)
            } else {
                manutencaoCriada = await prisma.manutencao.create({
                    data: {
                        companyId: companyId, // <--- OBRIGATÓRIO
                        veiculoId: veiculoIdFinal,
                        userId: agendar.userId ?? alerta.userId ?? null,
                        data: dataAgendamento ? new Date(dataAgendamento) : new Date(),
                        quilometragem: quilometragem ? Number(quilometragem) : 0,
                        tipo: tipo === "PREVENTIVA" ? "PREVENTIVA" : "CORRETIVA",
                        descricao: descricao ?? alerta.mensagem ?? "Manutenção agendada a partir de alerta",
                        custo: agendar.custo ? Number(agendar.custo) : undefined,
                        local: agendar.local ?? undefined,
                        observacoes: agendar.observacoes ?? undefined,
                        status: statusManut
                    }
                });

                // Atualizar status do veículo para 'manutencao' se necessário
                try {
                    await prisma.veiculo.update({
                        where: { id: veiculoIdFinal }, // Seguro pois validamos acima
                        data: { status: "manutencao" }
                    });
                } catch (e) {
                    console.warn("Não foi possível atualizar status do veículo:", e);
                }
            }
        }

        return res.json({ message: "Alerta aprovado.", alerta: updatedAlerta, manutencao: manutencaoCriada });
    } catch (err) {
        console.error("Erro POST /alertas/:id/decidir:", err);
        res.status(500).json({ error: "Erro interno ao processar decisão." });
    }
});

export default router;