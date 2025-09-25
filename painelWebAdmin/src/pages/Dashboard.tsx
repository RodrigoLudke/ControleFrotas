"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Truck,
    Users,
    MapPin,
    AlertTriangle,
    TrendingUp,
    Calendar,
    Bell,
    Settings,
    LogOut,
    Menu,
    Fuel,
    Clock,
    Shield
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/services/api";
import {AdminLayout} from "@/components/layout/AdminLayout.tsx";

interface Viagem {
    id: number;
    userId: number;
    veiculoId: number;
    dataSaida: string;
    dataChegada: string;
    finalidade: string;
    kmFinal: number;
    createdAt: string;
    updatedAt: string;
}

const Dashboard = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const navigate = useNavigate();

    const [viagens, setViagens] = useState<Viagem[]>([]);

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

    const fleetStats = [
        {
            title: "Veículos Ativos",
            value: "127",
            change: "+12%",
            trend: "up",
            icon: Truck,
            color: "fleet-success"
        },
        {
            title: "Motoristas",
            value: "89",
            change: "+5%",
            trend: "up",
            icon: Users,
            color: "fleet-primary"
        },
        {
            title: "Rotas Ativas",
            value: "23",
            change: "-2%",
            trend: "down",
            icon: MapPin,
            color: "fleet-warning"
        },
        {
            title: "Alertas",
            value: "7",
            change: "+3",
            trend: "up",
            icon: AlertTriangle,
            color: "fleet-danger"
        }
    ];

    const recentActivities = [
        {
            id: 1,
            type: "maintenance",
            message: "Manutenção programada para veículo ABC-1234",
            time: "15 min atrás",
            priority: "medium"
        },
        {
            id: 2,
            type: "route",
            message: "Nova rota São Paulo - Campinas criada",
            time: "32 min atrás",
            priority: "low"
        },
        {
            id: 3,
            type: "alert",
            message: "Combustível baixo no veículo XYZ-5678",
            time: "1h atrás",
            priority: "high"
        },
        {
            id: 4,
            type: "driver",
            message: "Novo motorista João Silva cadastrado",
            time: "2h atrás",
            priority: "low"
        }
    ];

    const quickActions = [
        { label: "Adicionar Veículo", icon: Truck, variant: "fleet" as const },
        { label: "Nova Rota", icon: MapPin, variant: "secondary" as const },
        { label: "Relatórios", icon: TrendingUp, variant: "secondary" as const },
        { label: "Configurações", icon: Settings, variant: "secondary" as const }
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
                                            stat.trend === 'up' ? 'text-success' : 'text-destructive'
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

                {/* Novo: Seção de Últimas Viagens */}
                <Card className="shadow-card">
                    <CardHeader>
                        <CardTitle>Últimas Viagens</CardTitle>
                        <CardDescription>Visão geral das últimas viagens registradas</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-foreground uppercase bg-muted/50">
                                <tr>
                                    <th scope="col" className="px-6 py-3">ID</th>
                                    <th scope="col" className="px-6 py-3">Veículo</th>
                                    <th scope="col" className="px-6 py-3">Saída</th>
                                    <th scope="col" className="px-6 py-3">Chegada</th>
                                    <th scope="col" className="px-6 py-3">Finalidade</th>
                                    <th scope="col" className="px-6 py-3">KM Final</th>
                                </tr>
                                </thead>
                                <tbody>
                                {viagens.length > 0 ? (
                                    viagens.map((item) => (
                                        <tr key={item.id} className="border-b bg-card hover:bg-muted/30">
                                            <td className="px-6 py-4 font-medium">{item.id}</td>
                                            <td className="px-6 py-4">{item.veiculoId}</td>
                                            <td className="px-6 py-4">{new Date(item.dataSaida).toLocaleString("pt-BR")}</td>
                                            <td className="px-6 py-4">{new Date(item.dataChegada).toLocaleString("pt-BR")}</td>
                                            <td className="px-6 py-4">{item.finalidade}</td>
                                            <td className="px-6 py-4">{item.kmFinal}</td>
                                        </tr>
                                    ))
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
                                    onClick={() => navigate(action.label === "Adicionar Veículo" ? "/veiculos" : "/")}
                                >
                                    <action.icon className="mr-2 h-4 w-4" />
                                    {action.label}
                                </Button>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Recent Activities */}
                    <Card className="lg:col-span-2 shadow-card">
                        <CardHeader>
                            <CardTitle>Atividades Recentes</CardTitle>
                            <CardDescription>Últimas atualizações do sistema</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {recentActivities.map((activity) => (
                                    <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg bg-muted/30">
                                        <div className="flex-shrink-0">
                                            <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium">{activity.message}</p>
                                            <p className="text-xs text-muted-foreground">{activity.time}</p>
                                        </div>
                                        <Badge
                                            variant={
                                                activity.priority === 'high' ? 'destructive' :
                                                    activity.priority === 'medium' ? 'default' : 'secondary'
                                            }
                                            className="ml-auto"
                                        >
                                            {activity.priority === 'high' ? 'Alta' :
                                                activity.priority === 'medium' ? 'Média' : 'Baixa'}
                                        </Badge>
                                    </div>
                                ))}
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
};

export default Dashboard;