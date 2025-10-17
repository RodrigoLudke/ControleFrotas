// src/pages/Dashboard.tsx
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Truck,
    Users,
    MapPin,
    AlertTriangle,
    TrendingUp,
    Settings,
    Clock
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/services/api";
import { AdminLayout } from "@/components/layout/AdminLayout";

interface Viagem {
    id: number;
    userId: number;
    veiculoId: number;
    dataSaida?: string | null;
    dataChegada?: string | null;
    finalidade?: string | null;
    kmFinal?: number | null;
}

interface Manutencao {
    id: number;
    veiculoId: number;
    userId?: number | null;
    data: string;
    quilometragem: number;
    tipo: "PREVENTIVA" | "CORRETIVA";
    descricao?: string;
    custo?: number | null;
    local?: string | null;
    status: "AGENDADA" | "EM_ANDAMENTO" | "CONCLUIDA" | "CANCELADA";
}

export default function Dashboard() {
    const navigate = useNavigate();

    const [viagens, setViagens] = useState<Viagem[]>([]);
    const [vehiclesMap, setVehiclesMap] = useState<Record<number, string>>({});
    const [driversMap, setDriversMap] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState<boolean>(true);

    const [countVehiclesActive, setCountVehiclesActive] = useState<number>(0);
    const [countDrivers, setCountDrivers] = useState<number>(0);

    // próximas manutenções agendadas
    const [manutencoesUpcoming, setManutencoesUpcoming] = useState<Manutencao[]>([]);
    const [loadingManutencoes, setLoadingManutencoes] = useState<boolean>(true);

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            try {
                // Viagens admin (limit handled later)
                const resTrips = await apiFetch("/viagens/admin");
                const tripsData: Viagem[] = resTrips.ok ? await resTrips.json() : [];

                // Veículos e Motoristas em paralelo
                const [resVeic, resMotor] = await Promise.allSettled([apiFetch("/veiculos"), apiFetch("/motoristas")]);

                const vMap: Record<number, string> = {};
                //eslint-disable-next-line @typescript-eslint/no-explicit-any
                let vehiclesList: any[] = [];
                if (resVeic.status === "fulfilled" && resVeic.value.ok) {
                    try {
                        const veics = await resVeic.value.json();
                        vehiclesList = Array.isArray(veics) ? veics : [];
                        //eslint-disable-next-line @typescript-eslint/no-explicit-any
                        vehiclesList.forEach((v: any) => {
                            if (v && v.id !== undefined) vMap[Number(v.id)] = v.placa ?? v.modelo ?? `Veículo ${v.id}`;
                        });
                    } catch (e) {
                        console.warn("Erro ao parsear /veiculos", e);
                    }
                } else {
                    console.warn("Falha fetch /veiculos", resVeic);
                }

                const dMap: Record<number, string> = {};
                //eslint-disable-next-line @typescript-eslint/no-explicit-any
                let driversList: any[] = [];
                if (resMotor.status === "fulfilled" && resMotor.value.ok) {
                    try {
                        const motors = await resMotor.value.json();
                        driversList = Array.isArray(motors) ? motors : [];
                        //eslint-disable-next-line @typescript-eslint/no-explicit-any
                        driversList.forEach((m: any) => {
                            if (m && m.id !== undefined) dMap[Number(m.id)] = m.nome ?? m.email ?? `Motorista ${m.id}`;
                        });
                    } catch (e) {
                        console.warn("Erro ao parsear /motoristas", e);
                    }
                } else {
                    console.warn("Falha fetch /motoristas", resMotor);
                }

                setVehiclesMap(vMap);
                setDriversMap(dMap);

                // organiza viagens: ordenar por dataSaida desc e manter (por ex) 5 para o card
                const sortedTrips = Array.isArray(tripsData)
                    ? tripsData.slice().sort((a, b) => {
                        const da = a.dataSaida ? new Date(a.dataSaida).getTime() : 0;
                        const db = b.dataSaida ? new Date(b.dataSaida).getTime() : 0;
                        return db - da;
                    }).slice(0, 5)
                    : [];
                setViagens(sortedTrips);

                // contadores
                //eslint-disable-next-line @typescript-eslint/no-explicit-any
                setCountVehiclesActive(vehiclesList.filter((v: any) => (v.status ?? "").toString() === "disponivel").length);
                setCountDrivers(driversList.length);
            } catch (error) {
                console.error("Erro ao carregar dados do dashboard:", error);
            } finally {
                setLoading(false);
            }
        };

        const fetchManutencoes = async () => {
            setLoadingManutencoes(true);
            try {
                const res = await apiFetch("/manutencoes");
                if (!res.ok) {
                    // backend pode não ter rota — trata silenciosamente
                    console.warn("manutencoes fetch falhou:", await res.text().catch(() => "no body"));
                    setManutencoesUpcoming([]);
                    return;
                }
                const all: Manutencao[] = await res.json();
                if (!Array.isArray(all)) {
                    setManutencoesUpcoming([]);
                    return;
                }
                const now = Date.now();
                const upcoming = all
                    .filter(m => m && m.status === "AGENDADA")
                    .filter(m => {
                        const dt = m.data ? new Date(m.data).getTime() : 0;
                        return dt >= now;
                    })
                    .sort((a, b) => {
                        const da = a.data ? new Date(a.data).getTime() : 0;
                        const db = b.data ? new Date(b.data).getTime() : 0;
                        return da - db;
                    })
                    .slice(0, 5);
                setManutencoesUpcoming(upcoming);
            } catch (error) {
                console.error("Erro ao buscar manutenções:", error);
                setManutencoesUpcoming([]);
            } finally {
                setLoadingManutencoes(false);
            }
        };

        fetchAll();
        fetchManutencoes();
    }, []);

    const fleetStats = [
        {
            title: "Veículos Ativos",
            value: String(countVehiclesActive),
            change: "--",
            trend: "up",
            icon: Truck,
            color: "fleet-success"
        },
        {
            title: "Motoristas",
            value: String(countDrivers),
            change: "--",
            trend: "up",
            icon: Users,
            color: "fleet-primary"
        },
        {
            title: "Rotas Ativas",
            value: "--",
            change: "--",
            trend: "none",
            icon: MapPin,
            color: "fleet-warning"
        },
        {
            title: "Alertas",
            value: "--",
            change: "--",
            trend: "none",
            icon: AlertTriangle,
            color: "fleet-danger"
        }
    ];

    const quickActions = [
        { label: "Adicionar Veículo", icon: Truck, variant: "default" as const, to: "/registrarveiculos" },
        { label: "Adicionar Motorista", icon: Users, variant: "secondary" as const, to: "/registrarmotoristas" },
        { label: "Relatórios", icon: TrendingUp, variant: "secondary" as const, to: "/" },
        { label: "Configurações", icon: Settings, variant: "secondary" as const, to: "/" }
    ];

    return (
        <AdminLayout title="Dashboard">
            <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {fleetStats.map((stat, index) => (
                        <Card key={index} className="shadow-card">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">
                                            {stat.title}
                                        </p>
                                        <p className="text-2xl font-bold">{stat.value}</p>
                                        <p className={`text-xs flex items-center ${
                                            stat.trend === 'up' ? 'text-success' : stat.trend === 'down' ? 'text-destructive' : 'text-muted-foreground'
                                        }`}>
                                            <TrendingUp className="h-3 w-3 mr-1" />
                                            {stat.change}
                                        </p>
                                    </div>
                                    <div className={`w-12 h-12 rounded-lg bg-${stat.color}/10 flex items-center justify-center`}>
                                        <stat.icon className={`h-6 w-6 text-${stat.color}`} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Últimas Viagens */}
                <Card className="shadow-card">
                    <CardHeader>
                        <CardTitle>Últimas Viagens</CardTitle>
                        <CardDescription>Visão geral das últimas viagens registradas (limitado a 5)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-foreground uppercase bg-muted/50">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Motorista</th>
                                    <th scope="col" className="px-6 py-3">Veículo (placa)</th>
                                    <th scope="col" className="px-6 py-3">Saída</th>
                                    <th scope="col" className="px-6 py-3">Chegada</th>
                                    <th scope="col" className="px-6 py-3">Finalidade</th>
                                    <th scope="col" className="px-6 py-3">KM Final</th>
                                </tr>
                                </thead>
                                <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-6 text-muted-foreground">Carregando...</td>
                                    </tr>
                                ) : viagens.length > 0 ? (
                                    viagens.map((item) => {
                                        const driver = (item.userId && driversMap[item.userId]) || "—";
                                        const plate = (item.veiculoId && vehiclesMap[item.veiculoId]) || "—";
                                        return (
                                            <tr key={item.id} className="border-b bg-card hover:bg-muted/30">
                                                <td className="px-6 py-4 font-medium">{driver}</td>
                                                <td className="px-6 py-4">{plate}</td>
                                                <td className="px-6 py-4">{item.dataSaida ? new Date(item.dataSaida).toLocaleString("pt-BR") : "—"}</td>
                                                <td className="px-6 py-4">{item.dataChegada ? new Date(item.dataChegada).toLocaleString("pt-BR") : "—"}</td>
                                                <td className="px-6 py-4">{item.finalidade ?? "—"}</td>
                                                <td className="px-6 py-4">{item.kmFinal ?? "—"}</td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr className="bg-card">
                                        <td colSpan={6} className="text-center py-4 text-muted-foreground">Nenhuma viagem encontrada.</td>
                                    </tr>
                                )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Quick Actions */}
                    <Card className="shadow-card">
                        <CardHeader>
                            <CardTitle>Ações Rápidas</CardTitle>
                            <CardDescription>Acesso rápido às funcionalidades principais</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {quickActions.map((action, index) => (
                                <Button
                                    key={index}
                                    variant={action.variant}
                                    className="w-full justify-start"
                                    onClick={() => navigate(action.to)}
                                >
                                    <action.icon className="mr-2 h-4 w-4" />
                                    {action.label}
                                </Button>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Próximas Manutenções Agendadas */}
                    <Card className="lg:col-span-2 shadow-card">
                        <CardHeader>
                            <CardTitle>Próximas Manutenções Agendadas</CardTitle>
                            <CardDescription>Próximas manutenções com status <strong>AGENDADA</strong></CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {loadingManutencoes ? (
                                    <div className="text-center py-6 text-muted-foreground">Carregando manutenções...</div>
                                ) : manutencoesUpcoming.length === 0 ? (
                                    <div className="text-center py-6 text-muted-foreground">Nenhuma manutenção agendada nos próximos dias.</div>
                                ) : (
                                    manutencoesUpcoming.map((m) => {
                                        const vehicleLabel = (m.veiculoId && vehiclesMap[m.veiculoId]) || `Veículo ${m.veiculoId}`;
                                        const userLabel = (m.userId && driversMap[m.userId]) || "—";
                                        return (
                                            <div key={m.id} className="flex items-start space-x-3 p-3 rounded-lg bg-muted/30">
                                                <div className="flex-shrink-0">
                                                    <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium">
                                                        {m.tipo === "PREVENTIVA" ? "Preventiva" : "Corretiva"} — {vehicleLabel}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {m.local ? `${m.local} • ` : ""}{new Date(m.data).toLocaleString("pt-BR")}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">{m.descricao ? `${m.descricao}` : ""}</p>
                                                </div>
                                                <div className="text-right">
                                                    {m.custo !== undefined && m.custo !== null ? (
                                                        <Badge variant="default" className="ml-auto">{Number(m.custo).toFixed(2)}</Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="ml-auto">Sem custo</Badge>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Fleet Overview Map Placeholder */}
                <Card className="shadow-card">
                    <CardHeader>
                        <CardTitle>Localização da Frota</CardTitle>
                        <CardDescription>Posição atual dos veículos em tempo real</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-64 bg-gradient-to-br from-muted/20 to-muted/40 rounded-lg flex items-center justify-center">
                            <div className="text-center">
                                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                                <p className="text-muted-foreground">Mapa interativo será carregado aqui</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}