// backend/routes/viagens.js
import express from "express";
import pkg from "@prisma/client";
import { autenticarToken, autorizarRoles } from "../index.js";

const { PrismaClient } = pkg;
const prisma = new PrismaClient();
const router = express.Router();

/**
 * Helpers
 */
const isValidInteger = (v) => {
    if (v === undefined || v === null) return false;
    return /^\d+$/.test(String(v));
};

const parseDateSafe = (v) => {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
};

const parseIntSafe = (v) => {
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? null : n;
};

/* -------------------------
   CRIAR VIAGEM (motorista que tem permissão para o veículo)
   ------------------------- */
router.post("/", autenticarToken, async (req, res) => {
    // <-- 'kmInicial' foi REMOVIDO daqui. Ele será calculado.
    const { veiculoId, dataSaida, dataChegada, finalidade, kmFinal } = req.body;
    const userId = parseIntSafe(req.user?.id);

    // --- Validações Iniciais (Mantidas) ---
    if (!isValidInteger(veiculoId)) return res.status(400).json({ error: "veiculoId inválido." });
    if (!dataSaida || !dataChegada) return res.status(400).json({ error: "dataSaida e dataChegada são obrigatórios." });
    if (finalidade === undefined) return res.status(400).json({ error: "finalidade é obrigatória." });
    if (!isValidInteger(kmFinal)) return res.status(400).json({ error: "kmFinal inválido." });

    const inicioViagem = parseDateSafe(dataSaida);
    const fimViagem = parseDateSafe(dataChegada);
    if (!inicioViagem || !fimViagem) return res.status(400).json({ error: "Datas inválidas." });
    if (fimViagem <= inicioViagem) return res.status(400).json({ error: "Data/Horário de chegada não pode ser anterior ou igual à saída." });

    const veiculoIdNum = Number(veiculoId);
    const kmFinalNum = Number(kmFinal);

    // --- Início da Lógica de Transação ---
    try {
        // <-- Usa $transaction para garantir consistência
        const novaViagem = await prisma.$transaction(async (tx) => {

            // 1. garante que o veículo exista
            const veiculo = await tx.veiculo.findUnique({ where: { id: veiculoIdNum } });
            if (!veiculo) {
                // <-- Lança erro para causar rollback
                throw new Error("Veículo não encontrado.");
            }

            // 2. valida se o usuário pode dirigir o veículo
            const permitido = await tx.userVeiculo.findFirst({
                where: { userId: userId, veiculoId: veiculoIdNum },
            });
            if (!permitido) {
                // <-- Lança erro para causar rollback
                throw new Error("Você não tem permissão para dirigir este veículo.");
            }

            // 3. busca a última viagem (cronologicamente)
            const ultimaViagem = await tx.viagem.findFirst({
                where: { veiculoId: veiculoIdNum },
                // <-- CORRIGIDO: Ordenar por dataChegada para achar a última real
                orderBy: { dataChegada: "desc" },
            });

            let kmInicialCalculado;

            if (ultimaViagem) {
                // 4a. Valida se a nova viagem começa DEPOIS da última
                if (inicioViagem <= new Date(ultimaViagem.dataChegada)) {
                    // <-- CORRIGIDO: Compara com dataChegada
                    throw new Error(`A data/hora de saída não pode ser anterior ou igual à chegada da última viagem (${ultimaViagem.dataChegada.toISOString()}).`);
                }

                // 5a. O kmInicial é o kmFinal da última viagem
                kmInicialCalculado = ultimaViagem.kmFinal;

            } else {
                // 5b. Se for a primeira viagem, usa a quilometragem base do veículo
                kmInicialCalculado = veiculo.quilometragem;
            }

            // 6. Validação de coerência do Hodômetro
            if (kmFinalNum <= kmInicialCalculado) {
                throw new Error(`A quilometragem final (${kmFinalNum}) não pode ser menor ou igual à quilometragem inicial (${kmInicialCalculado}).`);
            }

            // 7. Criar a nova viagem
            const viagemCriada = await tx.viagem.create({
                data: {
                    userId: userId,
                    veiculoId: veiculoIdNum,
                    dataSaida: inicioViagem,
                    dataChegada: fimViagem,
                    finalidade: String(finalidade),
                    kmInicial: kmInicialCalculado, // <-- ADICIONADO: O valor que calculamos
                    kmFinal: kmFinalNum,
                },
            });

            // 8. ATUALIZAR O HODÔMETRO PRINCIPAL DO VEÍCULO
            await tx.veiculo.update({
                where: { id: veiculoIdNum },
                data: { quilometragem: kmFinalNum },
            });

            // 9. Retorna a viagem (isso "commita" a transação)
            return viagemCriada;
        });

        // --- Fim da Transação ---

        return res.status(201).json(novaViagem);

    } catch (error) {
        console.error("POST /viagens error:", error);

        // <-- Trata os erros que lançamos dentro da transação
        if (error.message.includes("Veículo não encontrado")) {
            return res.status(404).json({ error: error.message });
        }
        if (error.message.includes("Você não tem permissão")) {
            return res.status(403).json({ error: error.message });
        }
        if (error.message.includes("data/hora de saída") || error.message.includes("quilometragem final")) {
            return res.status(400).json({ error: error.message });
        }

        // Erro genérico
        return res.status(500).json({ error: "Erro ao registrar viagem." });
    }
});

/* -------------------------
   LISTAR VIAGENS DO USUÁRIO LOGADO
   ------------------------- */
router.get("/", autenticarToken, async (req, res) => {
    try {
        const userId = parseIntSafe(req.user?.id);
        if (userId === null) return res.status(400).json({ error: "Usuário inválido." });

        const viagens = await prisma.viagem.findMany({
            where: { userId },
            orderBy: { dataSaida: "desc" },
        });

        return res.json(viagens);
    } catch (error) {
        console.error("GET /viagens error:", error);
        return res.status(500).json({ error: "Erro ao buscar viagens." });
    }
});

/* -------------------------
   LISTAR TODAS VIAGENS (ADMIN)
   ------------------------- */
router.get("/admin", autenticarToken, autorizarRoles("ADMIN"), async (req, res) => {
    try {
        const viagens = await prisma.viagem.findMany({
            orderBy: { dataSaida: "desc" },
        });
        return res.json(viagens);
    } catch (error) {
        console.error("GET /viagens/admin error:", error);
        return res.status(500).json({ error: "Erro ao buscar viagens." });
    }
});

/* -------------------------
   BUSCAR 1 VIAGEM POR ID
   ------------------------- */
router.get("/:id", autenticarToken, async (req, res) => {
    try {
        if (!isValidInteger(req.params.id)) return res.status(400).json({ error: "ID inválido." });
        const id = parseInt(req.params.id, 10);

        const viagem = await prisma.viagem.findUnique({ where: { id } });
        if (!viagem) return res.status(404).json({ error: "Viagem não encontrada." });
        return res.json(viagem);
    } catch (error) {
        console.error("GET /viagens/:id error:", error);
        return res.status(500).json({ error: "Erro ao buscar viagem." });
    }
});

/* -------------------------
   ATUALIZAR VIAGEM (dono da viagem ou ADMIN)
   -> aceita PATCH parcial: finalidade, dataSaida, dataChegada, kmFinal
   ------------------------- */
router.patch("/:id", autenticarToken, async (req, res) => {
    try {
        if (!isValidInteger(req.params.id)) return res.status(400).json({ error: "ID inválido." });
        const id = parseInt(req.params.id, 10);

        const userIdLogado = parseIntSafe(req.user?.id);
        const userRole = req.user?.role;

        const viagem = await prisma.viagem.findUnique({ where: { id } });
        if (!viagem) return res.status(404).json({ error: "Viagem não encontrada." });

        // autorização: dono ou admin
        if (userRole !== "ADMIN" && viagem.userId !== userIdLogado) {
            return res.status(403).json({ error: "Acesso negado." });
        }

        const { finalidade, dataSaida, dataChegada, kmFinal } = req.body;

        const updates = {};

        if (finalidade !== undefined) updates.finalidade = String(finalidade);
        if (dataSaida !== undefined) {
            const d = parseDateSafe(dataSaida);
            if (!d) return res.status(400).json({ error: "dataSaida inválida." });
            updates.dataSaida = d;
        }
        if (dataChegada !== undefined) {
            const d = parseDateSafe(dataChegada);
            if (!d) return res.status(400).json({ error: "dataChegada inválida." });
            updates.dataChegada = d;
        }

        // valida datas se ambos foram enviados (ou comparando com valores existentes)
        const newDataSaida = updates.dataSaida ?? new Date(viagem.dataSaida);
        const newDataChegada = updates.dataChegada ?? new Date(viagem.dataChegada);
        if (newDataSaida >= newDataChegada) {
            return res.status(400).json({ error: "Data de saída deve ser anterior à data de chegada." });
        }

        if (kmFinal !== undefined) {
            const novoKm = parseIntSafe(kmFinal);
            if (novoKm === null) return res.status(400).json({ error: "kmFinal inválido." });

            // buscar maior kmFinal de outras viagens do mesmo veículo (excluindo esta)
            const ultimaOutra = await prisma.viagem.findFirst({
                where: {
                    veiculoId: viagem.veiculoId,
                    id: { not: viagem.id }
                },
                orderBy: { kmFinal: "desc" }
            });

            if (ultimaOutra && novoKm <= ultimaOutra.kmFinal) {
                return res.status(400).json({
                    error: "A quilometragem final informada é menor ou igual à última registrada para este veículo.",
                    ultimaKm: ultimaOutra.kmFinal
                });
            }

            updates.kmFinal = novoKm;
        }

        const viagemAtualizada = await prisma.viagem.update({
            where: { id },
            data: updates,
        });

        return res.json({ message: "Viagem atualizada com sucesso.", viagem: viagemAtualizada });
    } catch (error) {
        console.error("PATCH /viagens/:id error:", error);
        return res.status(500).json({ error: "Erro interno ao atualizar viagem." });
    }
});

/* -------------------------
   DELETAR VIAGEM (dono da viagem ou ADMIN)
   ------------------------- */
router.delete("/:id", autenticarToken, async (req, res) => {
    try {
        if (!isValidInteger(req.params.id)) return res.status(400).json({ error: "ID inválido." });
        const id = parseInt(req.params.id, 10);

        const userIdLogado = parseIntSafe(req.user?.id);
        const userRole = req.user?.role;

        const viagem = await prisma.viagem.findUnique({ where: { id } });
        if (!viagem) return res.status(404).json({ error: "Viagem não encontrada." });

        if (userRole !== "ADMIN" && viagem.userId !== userIdLogado) {
            return res.status(403).json({ error: "Acesso negado." });
        }

        await prisma.viagem.delete({ where: { id } });
        return res.json({ message: "Viagem deletada com sucesso." });
    } catch (error) {
        console.error("DELETE /viagens/:id error:", error);
        return res.status(500).json({ error: "Erro interno ao deletar viagem." });
    }
});

export default router;
