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

    // Estados transferidos do outro arquivo
    const [viagens, setViagens] = useState<Viagem[]>([]);
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [feedback, setFeedback] = useState('');

    // Efeito para buscar as viagens ao carregar a página
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

    // Função para criar novo motorista
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
        <div className="min-h-screen bg-background">
            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
                <div className="flex h-16 items-center border-b px-6">
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                            <Truck className="h-4 w-4 text-primary-foreground" />
                        </div>
                        <span className="font-semibold">Controle Frotas</span>
                    </div>
                </div>

                <nav className="p-6 space-y-2">
                    <Button variant="ghost" className="w-full justify-start">
                        <TrendingUp className="mr-2 h-4 w-4" />
                        Dashboard
                    </Button>
                    <Button variant="ghost" className="w-full justify-start">
                        <Truck className="mr-2 h-4 w-4" />
                        Veículos
                    </Button>
                    <Button variant="ghost" className="w-full justify-start">
                        <Users className="mr-2 h-4 w-4" />
                        Motoristas
                    </Button>
                    <Button variant="ghost" className="w-full justify-start">
                        <MapPin className="mr-2 h-4 w-4" />
                        Rotas
                    </Button>
                    <Button variant="ghost" className="w-full justify-start">
                        <Fuel className="mr-2 h-4 w-4" />
                        Combustível
                    </Button>
                    <Button variant="ghost" className="w-full justify-start">
                        <Shield className="mr-2 h-4 w-4" />
                        Manutenção
                    </Button>
                </nav>
            </aside>

            {/* Main Content */}
            <div className="lg:pl-64">
                {/* Header */}
                <header className="bg-card border-b h-16 flex items-center justify-between px-6">
                    <div className="flex items-center space-x-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="lg:hidden"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                        >
                            <Menu className="h-4 w-4" />
                        </Button>
                        <div>
                            <h1 className="text-xl font-semibold">Dashboard</h1>
                            <p className="text-sm text-muted-foreground">Visão geral da frota</p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        <Button variant="ghost" size="sm">
                            <Bell className="h-4 w-4" />
                        </Button>
                        <Avatar>
                            <AvatarImage src="/placeholder-avatar.jpg" />
                            <AvatarFallback>AD</AvatarFallback>
                        </Avatar>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate("/")}
                        >
                            <LogOut className="h-4 w-4" />
                        </Button>
                    </div>
                </header>

                {/* Dashboard Content */}
                <main className="p-6 space-y-6">
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

                    {/* Novo: Seção de Cadastro de Motorista */}
                    <Card className="shadow-card">
                        <CardHeader>
                            <CardTitle>Cadastrar Novo Motorista</CardTitle>
                            <CardDescription>Crie uma nova conta para um motorista</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleNewMotorista} className="space-y-4 max-w-sm">
                                <div className="space-y-2">
                                    <Label htmlFor="new-motorista-email">Email</Label>
                                    <Input
                                        id="new-motorista-email"
                                        type="email"
                                        placeholder="email@exemplo.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="new-motorista-senha">Senha</Label>
                                    <Input
                                        id="new-motorista-senha"
                                        type="password"
                                        placeholder="••••••••"
                                        value={senha}
                                        onChange={(e) => setSenha(e.target.value)}
                                        required
                                    />
                                </div>
                                <Button type="submit" variant="fleet" className="w-full">
                                    Cadastrar Motorista
                                </Button>
                            </form>
                            {feedback && <p className={`mt-4 text-sm ${feedback.startsWith('Erro') ? 'text-destructive' : 'text-success'}`}>{feedback}</p>}
                        </CardContent>
                    </Card>

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
                </main>
            </div>

            {/* Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
        </div>
    );
};

export default Dashboard;