// src/pages/Veiculos.tsx
import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    Search,
    Plus,
    Edit,
    Trash2,
    Eye,
    Calendar,
    Fuel,
    Gauge,
    MapPin
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface Vehicle {
    id: number;
    placa?: string;
    modelo?: string;
    ano?: number | null;
    cor?: string | null;
    combustivel?: string | null;
    quilometragem?: number | null;
    ultimaManutencao?: string | null;
    proximaManutencao?: string | null;
    seguradora?: string | null;      // backend uses 'seguradora'
    apoliceSeguro?: string | null;   // backend uses 'apoliceSeguro'
    validadeSeguro?: string | null;  // backend uses 'validadeSeguro'
    seguro?: string | null;          // keep compatibility if frontend used this
    status?: string | null;
}

const Veiculos = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState("");
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const fetchVehicles = async () => {
        setLoading(true);
        try {
            const response = await apiFetch("/veiculos");
            if (response.ok) {
                const data = await response.json();
                setVehicles(Array.isArray(data) ? data : []);
            } else {
                const errorData = await response.json().catch(() => ({ error: "Erro ao buscar veículos." }));
                toast({
                    title: "Erro ao carregar veículos",
                    description: errorData.error || "Não foi possível carregar a lista de veículos.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Falha na busca por veículos:", error);
            toast({
                title: "Erro de conexão",
                description: "Não foi possível conectar ao servidor. Verifique sua conexão.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVehicles();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filteredVehicles = vehicles.filter(vehicle =>
        (vehicle.placa || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (vehicle.modelo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (vehicle.cor || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusBadge = (status?: string | null) => {
        const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
            disponivel: { label: "Disponível", variant: "default", className: "bg-success text-success-foreground" },
            em_uso: { label: "Em Uso", variant: "secondary", className: "bg-blue-100 text-blue-800" },
            manutencao: { label: "Manutenção", variant: "destructive", className: "" },
            inativo: { label: "Inativo", variant: "outline", className: "" }
        };
        const key = status || "disponivel";
        const config = statusConfig[key] ?? { label: key ?? "Desconhecido", variant: "outline", className: "" };
        return (
            <Badge variant={config.variant} className={config.className}>
                {config.label}
            </Badge>
        );
    };

    const getInsuranceBadge = (status?: string | null) => {
        // considera 'seguro' ou 'validadeSeguro' — trate conforme os dados disponíveis
        if (status === "ativo") {
            return <Badge variant="default" className="bg-success text-success-foreground">Ativo</Badge>;
        }
        return <Badge variant="destructive">Vencido / Sem Seguro</Badge>;
    };

    const formatDate = (dateString?: string | null) => {
        if (!dateString) return 'Data não informada';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('pt-BR');
        } catch (e) {
            return 'Data inválida';
        }
    };

    const handleView = (id: number) => {
        // abre a tela de visualização/edição (ajuste caso queira rota diferente)
        navigate(`/veiculos/${id}`);
    };

    const handleEdit = (id: number) => {
        navigate(`/registrarveiculos/${id}`);
    };

    const handleDelete = async (id: number) => {
        const ok = window.confirm("Tem certeza que deseja deletar este veículo? Essa ação é irreversível.");
        if (!ok) return;

        setDeletingId(id);
        try {
            const res = await apiFetch(`/veiculos/${id}`, { method: "DELETE" });
            if (res.ok) {
                toast({
                    title: "Veículo deletado",
                    description: "O veículo foi removido com sucesso.",
                });
                setVehicles(prev => prev.filter(v => v.id !== id));
            } else {
                const err = await res.json().catch(() => ({ error: "Erro ao deletar veículo." }));
                toast({
                    title: "Erro ao deletar",
                    description: err.error || "Não foi possível deletar o veículo.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Erro ao deletar veículo:", error);
            toast({
                title: "Erro de conexão",
                description: "Não foi possível conectar ao servidor para deletar o veículo.",
                variant: "destructive",
            });
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <AdminLayout title="Veículos">
            <div className="space-y-6">
                {/* Header Actions */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                            placeholder="Buscar veículos..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <Button
                        onClick={() => navigate("/registrarveiculos")}
                        className="bg-primary hover:bg-primary/90"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Novo Veículo
                    </Button>
                </div>

                {/* Vehicles Table */}
                <Card className="shadow-card">
                    <CardHeader>
                        <CardTitle>Lista de Veículos</CardTitle>
                        <CardDescription>
                            {loading ? "Carregando..." : `${filteredVehicles.length} veículo(s) encontrado(s)`}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Veículo</TableHead>
                                        <TableHead>Placa</TableHead>
                                        <TableHead>Combustível</TableHead>
                                        <TableHead>Quilometragem</TableHead>
                                        <TableHead>Manutenção</TableHead>
                                        <TableHead>Seguro</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredVehicles.map((vehicle) => (
                                        <TableRow key={vehicle.id} className="hover:bg-muted/50">
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium">{vehicle.modelo || 'N/A'}</div>
                                                    <div className="text-sm text-muted-foreground flex items-center">
                                                        <MapPin className="h-3 w-3 mr-1" />
                                                        {vehicle.ano ?? '—'} • {vehicle.cor || 'N/A'}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono font-medium">{vehicle.placa || 'N/A'}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center">
                                                    <Fuel className="h-4 w-4 mr-2 text-muted-foreground" />
                                                    {vehicle.combustivel || 'N/A'}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center">
                                                    <Gauge className="h-4 w-4 mr-2 text-muted-foreground" />
                                                    {vehicle.quilometragem ? `${vehicle.quilometragem.toLocaleString()} km` : 'N/A'}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <div className="text-sm">Última: {formatDate(vehicle.ultimaManutencao)}</div>
                                                    <div className="text-xs text-muted-foreground flex items-center">
                                                        <Calendar className="h-3 w-3 mr-1" />
                                                        Próxima: {formatDate(vehicle.proximaManutencao)}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    {/* tenta usar campo seguradora/apoliceSeguro ou seguro para compatibilidade */}
                                                    {getInsuranceBadge(vehicle.seguro ?? (vehicle.validadeSeguro ? "ativo" : undefined))}
                                                    <div className="text-xs text-muted-foreground">
                                                        Válido até {formatDate(vehicle.validadeSeguro)}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>{getStatusBadge(vehicle.status)}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center space-x-2">
                                                    <Button variant="ghost" size="sm" onClick={() => handleView(vehicle.id)}>
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => handleEdit(vehicle.id)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-destructive hover:text-destructive"
                                                        onClick={() => handleDelete(vehicle.id)}
                                                        disabled={deletingId === vehicle.id}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            {filteredVehicles.length === 0 && !loading && (
                                <div className="text-center py-8 text-muted-foreground">
                                    <div className="mb-2">Nenhum veículo encontrado</div>
                                    <Button variant="outline" onClick={() => { setSearchTerm(""); fetchVehicles(); }}>
                                        Limpar filtros
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
};

export default Veiculos;
