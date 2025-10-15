// backend/routes/veiculos.js
import express from "express";
import pkg from "@prisma/client";
import bcrypt from "bcrypt"; // pode ser usado em outras rotas, mantive a importação
import { autenticarToken, autorizarRoles } from "../index.js";

const { PrismaClient } = pkg;
const prisma = new PrismaClient();
const router = express.Router();

/* -------------------------
   ROTAS ESPECÍFICAS (SEM :id)
   ------------------------- */

// Listar todos os veículos (ADMIN)
router.get("/", autenticarToken, autorizarRoles("ADMIN"), async (req, res) => {
    try {
        const veiculos = await prisma.veiculo.findMany({
            select: {
                id: true,
                placa: true,
                marca: true,
                modelo: true,
                ano: true,
                cor: true,
                chassi: true,
                renavam: true,
                capacidade: true,
                combustivel: true,
                quilometragem: true,
                ultimaManutencao: true,
                proximaManutencao: true,
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

// Criar novo veículo (ADMIN) -> POST /veiculos
async function createVehicleHandler(req, res) {
    try {
        const {
            placa, marca, modelo, ano, cor, combustivel, quilometragem,
            ultimaManutencao, proximaManutencao, seguradora,
            apoliceSeguro, validadeSeguro, status,
            chassi, renavam, capacidade, dataCompra, valorCompra,
            observacoes, categoria
        } = req.body;

        // validações básicas
        if (!placa || !modelo) {
            return res.status(400).json({ error: "Campos obrigatórios: placa e modelo." });
        }

        // Criação convertendo tipos corretamente
        const novo = await prisma.veiculo.create({
            data: {
                placa,
                marca: marca || null,
                modelo,
                ano: (ano !== undefined && ano !== null) ? Number(ano) : null,
                cor: cor || null,
                chassi: chassi || null,
                renavam: renavam || null,
                capacidade: (capacidade !== undefined && capacidade !== null) ? Number(capacidade) : null,
                combustivel: combustivel || null,
                quilometragem: (quilometragem !== undefined && quilometragem !== null) ? Number(quilometragem) : null,
                ultimaManutencao: ultimaManutencao ? new Date(ultimaManutencao) : null,
                proximaManutencao: proximaManutencao ? new Date(proximaManutencao) : null,
                valorCompra: valorCompra !== undefined && valorCompra !== null ? Number(String(valorCompra)) : null,
                dataCompra: dataCompra ? new Date(dataCompra) : null,
                seguradora: seguradora || null,
                apoliceSeguro: apoliceSeguro || null,
                validadeSeguro: validadeSeguro ? new Date(validadeSeguro) : null,
                observacoes: observacoes || null,
                status: status || "disponivel",
                categoria: categoria || null
            }
        });

        res.status(201).json(novo);
    } catch (error) {
        console.error("Erro ao cadastrar veículo:", error);
        if (error?.code === "P2002") return res.status(409).json({ error: "Dados duplicados (ex.: placa, chassi, renavam)." });
        res.status(500).json({ error: "Erro interno ao cadastrar veículo." });
    }
}

router.post("/", autenticarToken, autorizarRoles("ADMIN"), createVehicleHandler);

// compatibilidade: POST /veiculos/cadastrar -> chama o handler de criação
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
    try {
        const veiculo = await prisma.veiculo.findUnique({
            where: { id },
            select: {
                id: true,
                placa: true,
                marca: true,
                modelo: true,
                ano: true,
                cor: true,
                chassi: true,
                renavam: true,
                capacidade: true,
                combustivel: true,
                quilometragem: true,
                ultimaManutencao: true,
                proximaManutencao: true,
                valorCompra: true,
                dataCompra: true,
                seguradora: true,
                apoliceSeguro: true,
                validadeSeguro: true,
                observacoes: true,
                status: true,
                categoria: true
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

    try {
        const {
            placa, marca, modelo, ano, cor, combustivel, quilometragem,
            ultimaManutencao, proximaManutencao, seguradora,
            apoliceSeguro, validadeSeguro, status,
            chassi, renavam, capacidade, dataCompra, valorCompra,
            observacoes, categoria
        } = req.body;

        const updates = {};
        if (placa !== undefined) updates.placa = placa;
        if (marca !== undefined) updates.marca = marca;
        if (modelo !== undefined) updates.modelo = modelo;
        if (ano !== undefined) updates.ano = (ano !== null ? Number(ano) : null);
        if (cor !== undefined) updates.cor = cor;
        if (chassi !== undefined) updates.chassi = chassi;
        if (renavam !== undefined) updates.renavam = renavam;
        if (capacidade !== undefined) updates.capacidade = (capacidade !== null ? Number(capacidade) : null);
        if (combustivel !== undefined) updates.combustivel = combustivel;
        if (quilometragem !== undefined) updates.quilometragem = (quilometragem !== null ? Number(quilometragem) : null);
        if (ultimaManutencao !== undefined) updates.ultimaManutencao = ultimaManutencao ? new Date(ultimaManutencao) : null;
        if (proximaManutencao !== undefined) updates.proximaManutencao = proximaManutencao ? new Date(proximaManutencao) : null;
        if (valorCompra !== undefined) updates.valorCompra = valorCompra !== null ? Number(String(valorCompra)) : null;
        if (dataCompra !== undefined) updates.dataCompra = dataCompra ? new Date(dataCompra) : null;
        if (seguradora !== undefined) updates.seguradora = seguradora;
        if (apoliceSeguro !== undefined) updates.apoliceSeguro = apoliceSeguro;
        if (validadeSeguro !== undefined) updates.validadeSeguro = validadeSeguro ? new Date(validadeSeguro) : null;
        if (observacoes !== undefined) updates.observacoes = observacoes;
        if (categoria !== undefined) updates.categoria = categoria;
        if (status !== undefined) updates.status = status;

        const existing = await prisma.veiculo.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ error: "Veículo não encontrado." });

        const updated = await prisma.veiculo.update({
            where: { id },
            data: updates,
            select: {
                id: true, placa: true, marca: true, modelo: true, ano: true, cor: true, chassi: true, renavam: true,
                capacidade: true, combustivel: true, quilometragem: true, ultimaManutencao: true, proximaManutencao: true,
                valorCompra: true, dataCompra: true, seguradora: true, apoliceSeguro: true, validadeSeguro: true, observacoes: true,
                status: true, categoria: true
            }
        });

        res.json({ message: "Veículo atualizado com sucesso.", veiculo: updated });
    } catch (error) {
        console.error("Erro ao atualizar veículo:", error);
        if (error?.code === "P2002") return res.status(409).json({ error: "Dados duplicados." });
        res.status(500).json({ error: "Erro interno ao atualizar veículo." });
    }
});

// Deletar veículo (APENAS ADMIN)
router.delete("/:id", autenticarToken, autorizarRoles("ADMIN"), async (req, res) => {
    if (!/^\d+$/.test(req.params.id)) {
        return res.status(400).json({ error: "ID inválido. Deve ser um número inteiro." });
    }
    const id = parseInt(req.params.id, 10);
    try {
        const existing = await prisma.veiculo.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ error: "Veículo não encontrado." });

        await prisma.veiculo.delete({ where: { id } });
        res.json({ message: "Veículo deletado com sucesso." });
    } catch (error) {
        console.error("Erro ao deletar veículo:", error);
        res.status(500).json({ error: "Erro interno ao deletar veículo." });
    }
});

export default router;
