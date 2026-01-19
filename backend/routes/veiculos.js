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

// Handler reutilizável para criação (POST / e POST /cadastrar)
async function createVehicleHandler(req, res) {
    try {
        const companyId = req.user.companyId;

        // CORREÇÃO: Recebendo anoFabricacao e anoModelo
        // Se o seu frontend ainda mandar apenas "ano", você pode fazer: const anoFabricacao = req.body.ano;
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
                // CORREÇÃO: Selects corrigidos
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
        // CORREÇÃO: Recebendo campos novos
        const {
            placa, marca, modelo, anoFabricacao, anoModelo, cor, chassi, renavam, capacidade,
            quilometragem, combustivel, valorCompra, dataCompra, seguradora,
            apoliceSeguro, validadeSeguro, observacoes, status, categoria
        } = req.body;

        const updates = {};
        if (placa !== undefined) updates.placa = placa;
        if (marca !== undefined) updates.marca = marca;
        if (modelo !== undefined) updates.modelo = modelo;
        // CORREÇÃO: Updates mapeados corretamente
        if (anoFabricacao !== undefined) updates.anoFabricacao = anoFabricacao !== null ? Number(anoFabricacao) : null;
        if (anoModelo !== undefined) updates.anoModelo = anoModelo !== null ? Number(anoModelo) : null;

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