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
        const { veiculoId, mensagem, tipo } = req.body;

        if (!mensagem || String(mensagem).trim().length === 0) {
            return res.status(400).json({ error: "Mensagem é obrigatória." });
        }

        const alerta = await prisma.alerta.create({
            data: {
                userId,
                veiculoId: veiculoId ?? null,
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

/*
   GET /alertas
   Admin: lista alertas (padrão: pendentes). Pode passar ?status=APROVADO|PENDENTE|REPROVADO
 */
router.get("/", autenticarToken, autorizarRoles("ADMIN"), async (req, res) => {
    try {
        const { status } = req.query;
        const where = status ? { status: String(status) } : undefined;

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
        console.error("Erro GET /alertas:", err);
        res.status(500).json({ error: "Erro ao buscar alertas." });
    }
});

/*
   GET /alertas/:id
   Admin: detalhe do alerta
 */
router.get("/:id", autenticarToken, autorizarRoles("ADMIN"), async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) return res.status(400).json({ error: "ID inválido." });

        const alerta = await prisma.alerta.findUnique({
            where: { id },
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
   POST /alertas/:id/decidir
   Admin aprova ou reprova. body: { action: "accept"|"reject", agendar?: { data?: string, quilometragem?: number } }
   Se action == "accept", opcionalmente cria uma manutenção e atualiza status do veículo para 'manutencao'.
 */
router.post("/:id/decidir", autenticarToken, autorizarRoles("ADMIN"), async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) return res.status(400).json({ error: "ID inválido." });

        const { action, agendar } = req.body;
        if (!action || !["accept", "reject"].includes(action)) {
            return res.status(400).json({ error: "Ação inválida. Use 'accept' ou 'reject'." });
        }

        const alerta = await prisma.alerta.findUnique({ where: { id } });
        if (!alerta) return res.status(404).json({ error: "Alerta não encontrado." });

        if (action === "reject") {
            const updated = await prisma.alerta.update({ where: { id }, data: { status: "REPROVADO" } });
            return res.json({ message: "Alerta reprovado.", alerta: updated });
        }

        // action === "accept"
        // marca alerta como aprovado
        const updatedAlerta = await prisma.alerta.update({ where: { id }, data: { status: "APROVADO" } });

        // se o admin enviar dados para agendar, criamos manutenção
        let manutencaoCriada = null;
        if (agendar) {
            // agendar pode conter data e/ou quilometragem e tipo/opcional
            const { data: dataAgendamento, quilometragem, tipo = "CORRETIVA", descricao } = agendar;

            // definimos o status da manutenção: AGENDADA ou CONCLUIDA (se admin marcar já realizada)
            const statusManut = agendar?.status === "CONCLUIDA" ? "CONCLUIDA" : "AGENDADA";

            const manutData = {
                veiculoId: alerta.veiculoId ?? (agendar.veiculoId ?? null),
                userId: agendar.userId ?? alerta.userId ?? null,
                data: dataAgendamento ? new Date(dataAgendamento) : new Date(),
                quilometragem: quilometragem ?? undefined,
                tipo: tipo === "PREVENTIVA" ? "PREVENTIVA" : "CORRETIVA",
                descricao: descricao ?? alerta.mensagem ?? "Manutenção agendada a partir de alerta",
                custo: agendar.custo ?? undefined,
                local: agendar.local ?? undefined,
                observacoes: agendar.observacoes ?? undefined,
                status: statusManut
            };

            // criar manutenção (garantir campos obrigatórios)
            manutencaoCriada = await prisma.manutencao.create({
                data: {
                    veiculoId: manutData.veiculoId,
                    userId: manutData.userId,
                    data: manutData.data,
                    quilometragem: manutData.quilometragem ?? 0,
                    tipo: manutData.tipo,
                    descricao: manutData.descricao,
                    custo: manutData.custo ?? undefined,
                    local: manutData.local ?? undefined,
                    observacoes: manutData.observacoes ?? undefined,
                    status: statusManut === "CONCLUIDA" ? "CONCLUIDA" : "AGENDADA"
                }
            });

            // opcional: atualizar status do veículo para 'manutencao'
            if (alerta.veiculoId) {
                try {
                    await prisma.veiculo.update({
                        where: { id: alerta.veiculoId },
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
