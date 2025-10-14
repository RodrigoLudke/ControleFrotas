import express from "express";
import { PrismaClient } from "@prisma/client";
import { autenticarToken, autorizarRoles } from "../index.js";

const router = express.Router();
const prisma = new PrismaClient();

// Criar veículo
router.post("/cadastrar", async (req, res) => {
    try {
        const {
            placa,
            marca,
            modelo,
            ano,
            cor,
            chassi,
            renavam,
            combustivel,
            capacidade,
            quilometragem,
            valorCompra,
            dataCompra,
            seguradora,
            apoliceSeguro,
            validadeSeguro,
            observacoes,
            motoristasIds = []
        } = req.body;

        if (!placa || !modelo || !ano || !combustivel) {
            return res.status(400).json({ error: "Placa, modelo, ano e combustível são obrigatórios." });
        }

        const veiculo = await prisma.veiculo.create({
            data: {
                placa,
                marca,
                modelo,
                ano: parseInt(ano),
                cor,
                chassi,
                renavam,
                combustivel, // enum Combustivel: gasolina, alcool, flex, diesel, eletrico, hibrido
                capacidade: parseInt(capacidade),
                quilometragem: parseInt(quilometragem) || 0,
                valorCompra: valorCompra ? parseFloat(valorCompra) : 0,
                dataCompra: dataCompra ? new Date(dataCompra) : new Date(),
                seguradora,
                apoliceSeguro,
                validadeSeguro: validadeSeguro ? new Date(validadeSeguro) : null,
                observacoes,

                usuarios: {
                    create: motoristasIds.map((userId) => ({
                        user: { connect: { id: userId } }
                    }))
                }
            },
            include: { usuarios: { include: { user: true } } }
        });

        res.status(201).json({ message: "Veículo cadastrado com sucesso!", veiculo });
    } catch (err) {
        console.error("Erro ao criar veículo:", err);
        res.status(500).json({ error: "Erro interno do servidor." });
    }
});

// Listar veículos
router.get("/", async (req, res) => {
    try {
        const veiculos = await prisma.veiculo.findMany({
            include: { usuarios: { include: { user: true } } }
        });
        res.json(veiculos);
    } catch (err) {
        console.error("Erro ao listar veículos:", err);
        res.status(500).json({ error: "Erro interno do servidor." });
    }
});

// Atualizar veículo (APENAS ADMIN)
router.patch("/:id", autenticarToken, autorizarRoles("ADMIN"), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const {
            placa, marca, modelo, ano, cor, chassi, renavam, combustivel,
            capacidade, quilometragem, valorCompra, dataCompra, seguradora,
            apoliceSeguro, validadeSeguro, observacoes
        } = req.body;

        const atualizacoes = {};

        if (placa !== undefined) atualizacoes.placa = placa;
        if (marca !== undefined) atualizacoes.marca = marca;
        if (modelo !== undefined) atualizacoes.modelo = modelo;
        if (ano !== undefined) atualizacoes.ano = parseInt(ano);
        if (cor !== undefined) atualizacoes.cor = cor;
        if (chassi !== undefined) atualizacoes.chassi = chassi;
        if (renavam !== undefined) atualizacoes.renavam = renavam;
        if (combustivel !== undefined) atualizacoes.combustivel = combustivel;
        if (capacidade !== undefined) atualizacoes.capacidade = parseInt(capacidade);
        if (quilometragem !== undefined) atualizacoes.quilometragem = parseInt(quilometragem);
        if (valorCompra !== undefined) atualizacoes.valorCompra = parseFloat(valorCompra);
        if (dataCompra !== undefined) atualizacoes.dataCompra = new Date(dataCompra);
        if (seguradora !== undefined) atualizacoes.seguradora = seguradora;
        if (apoliceSeguro !== undefined) atualizacoes.apoliceSeguro = apoliceSeguro;
        if (validadeSeguro !== undefined) atualizacoes.validadeSeguro = new Date(validadeSeguro);
        if (observacoes !== undefined) atualizacoes.observacoes = observacoes;

        const veiculo = await prisma.veiculo.findUnique({ where: { id } });
        if (!veiculo) return res.status(404).json({ error: "Veículo não encontrado." });

        const veiculoAtualizado = await prisma.veiculo.update({
            where: { id },
            data: atualizacoes
        });

        res.json({ message: "Veículo atualizado com sucesso.", veiculo: veiculoAtualizado });
    } catch (error) {
        console.error("Erro ao atualizar veículo:", error);
        if (error.code === "P2002") {
            return res.status(409).json({ error: "Dados duplicados (placa/chassi/renavam)." });
        }
        res.status(500).json({ error: "Erro interno ao atualizar veículo." });
    }
});

// Deletar veículo (APENAS ADMIN)
router.delete("/:id", autenticarToken, autorizarRoles("ADMIN"), async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        const veiculo = await prisma.veiculo.findUnique({ where: { id } });
        if (!veiculo) return res.status(404).json({ error: "Veículo não encontrado." });

        // opcional: checar se o veículo tem viagens ativas; aqui deletamos
        await prisma.veiculo.delete({ where: { id } });

        res.json({ message: "Veículo deletado com sucesso." });
    } catch (error) {
        console.error("Erro ao deletar veículo:", error);
        res.status(500).json({ error: "Erro interno ao deletar veículo." });
    }
});

export default router;
