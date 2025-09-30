import express from "express";
import { PrismaClient } from "@prisma/client";

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

export default router;
