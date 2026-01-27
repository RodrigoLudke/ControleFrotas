// backend/routes/veiculos.js
import express from "express";
import pkg from "@prisma/client";
import { autenticarToken, autorizarRoles } from "../index.js";

const { PrismaClient } = pkg;
const prisma = new PrismaClient();
const router = express.Router();

/* -------------------------
  Retorna quais categorias de CNH um motorista precisa ter
  para dirigir um veículo de uma determinada categoria.
  Ex: Veículo "A" -> Motorista precisa ter CNH "A" ou "AB".
  -------------------------- */

function getRequiredDriverCategories(vehicleCategory) {
    const map = {
        A: ["A", "AB"],
        B: ["B", "AB"],
        C: ["C"],
        D: ["D"],
        E: ["E"],
    };
    // Retorna o array correspondente ou um array com a própria categoria
    return map[vehicleCategory] || (vehicleCategory ? [vehicleCategory] : []);
}

/* -------------------------
   ROTAS ESPECÍFICAS (SEM :id)
   ------------------------- */

// Listar veiculos disponíveis para motoristas (USER)
router.get("/disponiveis", autenticarToken, autorizarRoles("USER"), async (req, res) => {
    try {
        const companyId = req.user.companyId;

        const veiculos = await prisma.veiculo.findMany({
            where: {
                status: "disponivel",
                companyId: companyId,
                deletedAt: null
            },
            select: {
                id: true,
                placa: true,
                marca: true,
                modelo: true,
                anoFabricacao: true,
                anoModelo: true,
                cor: true,
                chassi: true,
                renavam: true,
                capacidade: true,
                quilometragem: true,
                combustivel: true,
                valorCompra: true,
                dataCompra: true,
                seguradora: true,
                apoliceSeguro: true,
                validadeSeguro: true,
                observacoes: true,
                status: true,
                categoria: true
            },
            orderBy: { modelo: "asc" }
        });

        res.json(veiculos);
    } catch (error) {
        console.error("Erro ao listar veículos disponíveis:", error);
        res.status(500).json({ error: "Erro interno do servidor." });
    }
});

// Listar todos os veículos (ADMIN)
router.get("/", autenticarToken, autorizarRoles("ADMIN"), async (req, res) => {
    try {
        const companyId = req.user.companyId;

        const veiculos = await prisma.veiculo.findMany({
            where: {
                companyId: companyId,
                deletedAt: null
            },
            select: {
                id: true,
                placa: true,
                marca: true,
                modelo: true,
                anoFabricacao: true,
                anoModelo: true,
                cor: true,
                chassi: true,
                renavam: true,
                capacidade: true,
                quilometragem: true,
                combustivel: true,
                valorCompra: true,
                dataCompra: true,
                seguradora: true,
                apoliceSeguro: true,
                validadeSeguro: true,
                observacoes: true,
                status: true,
                categoria: true
            },
            orderBy: { modelo: "asc" }
        });

        res.json(veiculos);
    } catch (error) {
        console.error("Erro ao listar veículos:", error);
        res.status(500).json({ error: "Erro interno do servidor." });
    }
});

// Rota para buscar Seguros vencendo nos próximos 30 dias
router.get("/seguro-vencendo", autenticarToken, autorizarRoles("ADMIN"), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const hoje = new Date();
        const daqui30Dias = new Date();
        daqui30Dias.setDate(hoje.getDate() + 30);

        const veiculos = await prisma.veiculo.findMany({
            where: {
                companyId: companyId,
                deletedAt: null,
                status: { not: "inativo" },
                validadeSeguro: {
                    lte: daqui30Dias,
                    not: null
                }
            },
            select: {
                id: true,
                placa: true,
                modelo: true,
                validadeSeguro: true,
                seguradora: true
            },
            orderBy: {
                validadeSeguro: 'asc'
            }
        });

        res.json(veiculos);
    } catch (error) {
        console.error("Erro ao buscar vencimentos de seguro:", error);
        res.status(500).json({ error: "Erro interno ao buscar seguros." });
    }
});

// --- NOVA ROTA: Verificar Revisões Pendentes (Melhorada) ---
router.get("/revisoes-pendentes", autenticarToken, autorizarRoles("ADMIN"), async (req, res) => {
    try {
        const companyId = req.user.companyId;

        const veiculos = await prisma.veiculo.findMany({
            where: {
                companyId,
                deletedAt: null,
                status: { not: "inativo" }
            },
            include: {
                manutencoes: {
                    where: { tipo: "PREVENTIVA", status: "CONCLUIDA" },
                    orderBy: { data: 'desc' },
                    take: 1
                }
            }
        });

        const pendentes = [];
        const now = new Date();

        for (const v of veiculos) {
            let limitKm = 0;
            let limitMonths = 0;

            // 1. Regras (Mantenha conforme sua lógica)
            if (v.categoria === 'B') {
                limitKm = 20000;
                limitMonths = 12;
            } else if (['C', 'D', 'E'].includes(v.categoria)) {
                limitKm = 10000;
                limitMonths = 6;
            } else {
                continue;
            }

            const lastMaint = v.manutencoes[0];

            // 2. CORREÇÃO DA REFERÊNCIA DE KM
            // Se tiver manutenção, usa a KM da manutenção.
            // Se NÃO tiver, usa a 'kmInicial' (do cadastro) ou 'quilometragem' (se acabou de cadastrar).
            // NOTA: Certifique-se de que seu modelo 'veiculo' tenha 'kmInicial'. Se não tiver,
            // considere adicionar ou usar a lógica abaixo.

            let refKm = 0;

            if (lastMaint) {
                refKm = lastMaint.quilometragem;
            } else {
                // Cenário: Veículo novo no sistema sem revisões.
                // O ciclo começa na KM de compra/entrada.
                // Se 'kmInicial' não existir no banco, fallback para 0 (mas isso causa o bug)
                // Se você não tiver o campo kmInicial, uma solução paliativa é:
                // assumir que se não tem manutenção, o ciclo é "Ciclo de Fabricante" (usando resto da divisão)
                refKm = v.kmInicial ?? 0;
            }

            // 3. Referência de DATA
            const refDate = lastMaint
                ? new Date(lastMaint.data)
                : (v.dataCompra ? new Date(v.dataCompra) : new Date(v.createdAt));

            // 4. Cálculos

            // Lógica Híbrida Inteligente:
            let deltaKm = 0;
            let motivoKm = "";

            if (lastMaint || (v.kmInicial !== undefined && v.kmInicial !== null)) {
                // Lógica Relativa: Temos um ponto de partida claro (última revisão ou compra)
                deltaKm = v.quilometragem - refKm;
                motivoKm = `Rodou ${deltaKm}km desde ${lastMaint ? 'última revisão' : 'a compra'}`;
            } else {
                // Lógica de Fabricante (Fallback se não tivermos histórico nem kmInicial):
                // Se o carro tem 55.000km e o limite é 10.000km, ele está no meio do ciclo (5.000km rodados).
                // Isso evita o alerta falso de "atrasado 45.000km".
                const kmNoCicloAtual = v.quilometragem % limitKm;

                // O delta será o quanto ele rodou dentro deste ciclo de 10k/20k
                deltaKm = kmNoCicloAtual;

                // O "refKm" virtual seria a última virada de ciclo (ex: 50.000)
                refKm = v.quilometragem - kmNoCicloAtual;
                motivoKm = `Ciclo atual: ${deltaKm}km rodados (Total: ${v.quilometragem}km)`;
            }

            const diffTimeMs = now.getTime() - refDate.getTime();
            const deltaMonths = diffTimeMs / (1000 * 60 * 60 * 24 * 30.44);

            // 5. Verificar Limites
            // Adicionei uma margem de tolerância (ex: avisar se passou ou se está > 95% do limite)
            // Mas mantendo sua lógica estrita de ">= limit":

            if (deltaKm >= limitKm || deltaMonths >= limitMonths) {
                pendentes.push({
                    id: v.id,
                    placa: v.placa,
                    modelo: v.modelo,
                    categoria: v.categoria,
                    kmAtual: v.quilometragem,
                    ultimaRevisao: lastMaint ? lastMaint.data : null,
                    refKm: refKm, // Útil para debug
                    motivo: deltaKm >= limitKm
                        ? `${motivoKm} (Limite: ${limitKm}km)`
                        : `Passou ${Math.floor(deltaMonths)} meses desde ${lastMaint ? 'revisão' : 'aquisição'} (Limite: ${limitMonths})`,
                    tipoAlerta: 'REVISAO'
                });
            }
        }

        res.json(pendentes);

    } catch (error) {
        console.error("Erro ao calcular revisões:", error);
        res.status(500).json({ error: "Erro interno." });
    }
});

// Handler reutilizável para criação (POST / e POST /cadastrar)
async function createVehicleHandler(req, res) {
    try {
        const companyId = req.user.companyId;

        const {
            placa, marca, modelo, ano, cor, chassi, renavam, capacidade,
            quilometragem, combustivel, valorCompra, dataCompra, seguradora,
            apoliceSeguro, validadeSeguro, observacoes, status, categoria
        } = req.body;

        // validações básicas
        if (!placa || !modelo) {
            return res.status(400).json({ error: "Campos obrigatórios: placa e modelo." });
        }

        const novo = await prisma.veiculo.create({
            data: {
                company: {
                    connect: { id: companyId }
                },
                placa,
                marca: marca ?? null,
                modelo,
                anoFabricacao: ano ? Number(ano) : null,
                anoModelo: ano ? Number(ano) : null,
                cor: cor ?? null,
                chassi: chassi ?? null,
                renavam: renavam ?? null,
                capacidade: capacidade !== undefined && capacidade !== null ? Number(capacidade) : null,
                quilometragem: quilometragem !== undefined && quilometragem !== null ? Number(quilometragem) : 0,
                combustivel: combustivel ?? undefined,
                valorCompra: valorCompra !== undefined && valorCompra !== null ? Number(valorCompra) : null,
                dataCompra: dataCompra ? new Date(dataCompra) : new Date(),
                seguradora: seguradora ?? null,
                apoliceSeguro: apoliceSeguro ?? null,
                validadeSeguro: validadeSeguro ? new Date(validadeSeguro) : null,
                observacoes: observacoes ?? null,
                status: status ?? "disponivel",
                categoria: categoria ?? null
            }
        });

        // LÓGICA DE ASSOCIAÇÃO
        const newVehicleCategory = novo.categoria;

        if (newVehicleCategory) {
            const requiredDriverCats = getRequiredDriverCategories(newVehicleCategory);

            if (requiredDriverCats.length > 0) {
                const motoristasPermitidos = await prisma.user.findMany({
                    where: {
                        companyId: companyId,
                        role: "USER",
                        deletedAt: null,
                        categoria: {
                            hasSome: requiredDriverCats
                        }
                    },
                    select: { id: true }
                });

                if (motoristasPermitidos.length > 0) {
                    const createManyData = motoristasPermitidos.map(motorista => ({
                        userId: motorista.id,
                        veiculoId: novo.id
                    }));

                    await prisma.userVeiculo.createMany({
                        data: createManyData,
                        skipDuplicates: true
                    });
                }
            }
        }
        res.status(201).json(novo);
    } catch (error) {
        console.error("Erro ao cadastrar veículo:", error);
        if (error?.code === "P2002") {
            return res.status(409).json({ error: "Dados duplicados (placa, chassi ou renavam)." });
        }
        res.status(500).json({ error: "Erro interno ao cadastrar veículo." });
    }
}

router.post("/", autenticarToken, autorizarRoles("ADMIN"), createVehicleHandler);
router.post("/cadastrar", autenticarToken, autorizarRoles("ADMIN"), createVehicleHandler);

/* -------------------------
   ROTAS POR ID (VALIDAÇÃO DENTRO)
   ------------------------- */

// Buscar 1 veículo por id
router.get("/:id", autenticarToken, autorizarRoles("ADMIN"), async (req, res) => {
    if (!/^\d+$/.test(req.params.id)) {
        return res.status(400).json({ error: "ID inválido. Deve ser um número inteiro." });
    }
    const id = parseInt(req.params.id, 10);
    const companyId = req.user.companyId;

    try {
        const veiculo = await prisma.veiculo.findFirst({
            where: {
                id: id,
                companyId: companyId,
                deletedAt: null
            },
            select: {
                id: true,
                placa: true,
                marca: true,
                modelo: true,
                anoFabricacao: true,
                anoModelo: true,
                cor: true,
                chassi: true,
                renavam: true,
                capacidade: true,
                quilometragem: true,
                combustivel: true,
                valorCompra: true,
                dataCompra: true,
                seguradora: true,
                apoliceSeguro: true,
                validadeSeguro: true,
                observacoes: true,
                status: true,
                categoria: true,
            }
        });

        if (!veiculo) return res.status(404).json({ error: "Veículo não encontrado." });
        res.json(veiculo);
    } catch (error) {
        console.error("GET /veiculos/:id error:", error);
        res.status(500).json({ error: "Erro interno ao buscar veículo." });
    }
});

// Atualizar veículo (APENAS ADMIN)
router.patch("/:id", autenticarToken, autorizarRoles("ADMIN"), async (req, res) => {
    if (!/^\d+$/.test(req.params.id)) {
        return res.status(400).json({ error: "ID inválido. Deve ser um número inteiro." });
    }
    const id = parseInt(req.params.id, 10);
    const companyId = req.user.companyId;

    try {
        const {
            placa, marca, modelo, ano, cor, chassi, renavam, capacidade,
            quilometragem, combustivel, valorCompra, dataCompra, seguradora,
            apoliceSeguro, validadeSeguro, observacoes, status, categoria
        } = req.body;

        const updates = {};
        if (placa !== undefined) updates.placa = placa;
        if (marca !== undefined) updates.marca = marca;
        if (modelo !== undefined) updates.modelo = modelo;

        if (ano !== undefined) {
            const anoInt = Number(ano);
            updates.anoFabricacao = anoInt;
            updates.anoModelo = anoInt;
        }

        if (cor !== undefined) updates.cor = cor;
        if (chassi !== undefined) updates.chassi = chassi;
        if (renavam !== undefined) updates.renavam = renavam;
        if (capacidade !== undefined) updates.capacidade = capacidade !== null ? Number(capacidade) : null;
        if (quilometragem !== undefined) updates.quilometragem = quilometragem !== null ? Number(quilometragem) : null;
        if (combustivel !== undefined) updates.combustivel = combustivel;
        if (valorCompra !== undefined) updates.valorCompra = valorCompra !== null ? Number(String(valorCompra)) : null;
        if (dataCompra !== undefined) updates.dataCompra = dataCompra ? new Date(dataCompra) : null;
        if (seguradora !== undefined) updates.seguradora = seguradora;
        if (apoliceSeguro !== undefined) updates.apoliceSeguro = apoliceSeguro;
        if (validadeSeguro !== undefined) updates.validadeSeguro = validadeSeguro ? new Date(validadeSeguro) : null;
        if (observacoes !== undefined) updates.observacoes = observacoes;
        if (categoria !== undefined) updates.categoria = categoria;
        if (status !== undefined) updates.status = status;

        const existing = await prisma.veiculo.findFirst({
            where: { id, companyId, deletedAt: null }
        });
        if (!existing) return res.status(404).json({ error: "Veículo não encontrado." });

        const updated = await prisma.veiculo.update({
            where: { id },
            data: updates,
            select: {
                id: true, placa: true, modelo: true, status: true
            }
        });

        res.json({ message: "Veículo atualizado com sucesso.", veiculo: updated });
    } catch (error) {
        console.error("Erro ao atualizar veículo:", error);
        if (error?.code === "P2002") return res.status(409).json({ error: "Dados duplicados." });
        res.status(500).json({ error: "Erro interno ao atualizar veículo." });
    }
});

// Deletar veículo (SOFT DELETE)
router.delete("/:id", autenticarToken, autorizarRoles("ADMIN"), async (req, res) => {
    if (!/^\d+$/.test(req.params.id)) {
        return res.status(400).json({ error: "ID inválido. Deve ser um número inteiro." });
    }
    const id = parseInt(req.params.id, 10);
    const companyId = req.user.companyId;

    try {
        const existing = await prisma.veiculo.findFirst({
            where: { id, companyId, deletedAt: null }
        });

        if (!existing) return res.status(404).json({ error: "Veículo não encontrado." });

        await prisma.veiculo.update({
            where: { id },
            data: {
                deletedAt: new Date(),
                status: "inativo"
            }
        });

        res.json({ message: "Veículo deletado com sucesso." });
    } catch (error) {
        console.error("Erro ao deletar veículo:", error);
        res.status(500).json({ error: "Erro interno ao deletar veículo." });
    }
});

export default router;