"use client";

import { useEffect, useState } from 'react';
import { apiFetch } from '@/services/api';

// Defina a interface com base no seu schema.prisma
interface Viagem {
    id: number;
    userId: number;
    veiculoId: number;
    dataSaida: string; // Tipo DateTime do Prisma é retornado como string
    dataChegada: string; // Tipo DateTime do Prisma é retornado como string
    finalidade: string;
    kmFinal: number;
    createdAt: string;
    updatedAt: string;
}

export default function DashboardPage() {
    const [viagens, setViagens] = useState<Viagem[]>([]);
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [feedback, setFeedback] = useState('');

    useEffect(() => {
        const fetchViagens = async () => {
            try {
                const response = await apiFetch("/viagens/admin");
                if (response.ok) {
                    const data: Viagem[] = await response.json();
                    setViagens(data);
                } else {
                    console.error("Falha ao buscar viagens:", await response.json());
                }
            } catch (err) {
                console.error("Erro ao carregar viagens:", err);
            }
        };

        fetchViagens();
    }, []);

    const handleNewMotorista = async (e: React.FormEvent) => {
        e.preventDefault();
        setFeedback('');

        try {
            const response = await apiFetch("/users/motorista", {
                method: 'POST',
                body: JSON.stringify({ email, senha }),
            });

            const result = await response.json();

            if (response.ok) {
                setFeedback('Motorista criado com sucesso!');
                setEmail('');
                setSenha('');
            } else {
                setFeedback('Erro: ' + (result.error || 'Não foi possível criar o motorista.'));
            }
        } catch (err) {
            setFeedback('Não foi possível conectar ao servidor.');
            console.error(err);
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: 'auto', fontFamily: 'Arial, sans-serif' }}>
            <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>Painel de Administração</h1>

            <section style={{ marginBottom: '40px' }}>
                <h2 style={{ borderBottom: '2px solid #ccc', paddingBottom: '10px' }}>Últimas Viagens</h2>
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
                        <thead>
                        <tr style={{ background: '#000' }}>
                            <th style={tableHeaderStyle}>ID</th>
                            <th style={tableHeaderStyle}>Veículo</th>
                            <th style={tableHeaderStyle}>Saída</th>
                            <th style={tableHeaderStyle}>Chegada</th>
                            <th style={tableHeaderStyle}>Finalidade</th>
                            <th style={tableHeaderStyle}>KM Final</th>
                        </tr>
                        </thead>
                        <tbody>
                        {viagens.map((item) => {
                            const saida = new Date(item.dataSaida);
                            const chegada = new Date(item.dataChegada);
                            return (
                                <tr key={item.id} style={{ borderBottom: '1px solid #ddd' }}>
                                    <td style={tableCellStyle}>{item.id}</td>
                                    <td style={tableCellStyle}>{item.veiculoId}</td>
                                    <td style={tableCellStyle}>
                                        {saida.toLocaleDateString("pt-BR")} às {saida.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                    </td>
                                    <td style={tableCellStyle}>
                                        {chegada.toLocaleDateString("pt-BR")} às {chegada.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                    </td>
                                    <td style={tableCellStyle}>{item.finalidade}</td>
                                    <td style={tableCellStyle}>{item.kmFinal}</td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>
            </section>

            <section>
                <h2 style={{ borderBottom: '2px solid #ccc', paddingBottom: '10px' }}>Cadastrar Novo Motorista</h2>
                <form onSubmit={handleNewMotorista} style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '400px', marginTop: '15px' }}>
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={inputStyle}
                    />
                    <input
                        type="password"
                        placeholder="Senha"
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        required
                        style={inputStyle}
                    />
                    <button type="submit" style={buttonStyle}>
                        Cadastrar Motorista
                    </button>
                </form>
                {feedback && <p style={{ marginTop: '10px', color: feedback.startsWith('Erro') ? 'red' : 'green' }}>{feedback}</p>}
            </section>
        </div>
    );
}

// Estilos básicos para o código web
const tableHeaderStyle = {
    padding: '12px',
    border: '1px solid #ddd',
    textAlign: 'left',
};

const tableCellStyle = {
    padding: '8px',
    border: '1px solid #ddd',
};

const inputStyle = {
    padding: '10px',
    fontSize: '16px',
    borderRadius: '5px',
    border: '1px solid #ccc',
};

const buttonStyle = {
    padding: '10px',
    fontSize: '16px',
    borderRadius: '5px',
    border: 'none',
    backgroundColor: '#0070f3',
    color: 'white',
    cursor: 'pointer',
};