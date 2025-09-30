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
    placa: string;
    modelo: string;
    ano: number;
    cor: string;
    combustivel: string;
    quilometragem: number;
    ultimaManutencao: string;
    proximaManutencao: string;
    seguro: string;
    validadeSeguro: string;
    status: string;
}

const Veiculos = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState("");
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchVehicles = async () => {
            try {
                const response = await apiFetch("/veiculos");
                if (response.ok) {
                    const data = await response.json();
                    setVehicles(data);
                } else {
                    const errorData = await response.json();
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

        fetchVehicles();
    }, [toast]);

    const filteredVehicles = vehicles.filter(vehicle =>
        vehicle.placa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.modelo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.cor?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusBadge = (status: string) => {
        const statusConfig = {
            disponivel: { label: "Disponível", variant: "default" as const, className: "bg-success text-success-foreground" },
            em_uso: { label: "Em Uso", variant: "secondary" as const, className: "bg-blue-100 text-blue-800" },
            manutencao: { label: "Manutenção", variant: "destructive" as const, className: "" },
            inativo: { label: "Inativo", variant: "outline" as const, className: "" }
        };

        const config = statusConfig[status as keyof typeof statusConfig];
        return (
            <Badge variant={config.variant} className={config.className}>
                {config.label}
            </Badge>
        );
    };

    const getInsuranceBadge = (status: string) => {
        return status === "ativo" ? (
            <Badge variant="default" className="bg-success text-success-foreground">Ativo</Badge>
        ) : (
            <Badge variant="destructive">Vencido / Sem Seguro</Badge>
        );
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'Data não informada';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('pt-BR');
        } catch (e) {
            return 'Data inválida';
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
                        onClick={() => navigate("/register-vehicle")}
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
                                                    <div className="text-sm text-muted-foreground">
                                                        {vehicle.ano} • {vehicle.cor || 'N/A'}
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
                                                    <div className="text-sm">
                                                        Última: {formatDate(vehicle.ultimaManutencao)}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground flex items-center">
                                                        <Calendar className="h-3 w-3 mr-1" />
                                                        Próxima: {formatDate(vehicle.proximaManutencao)}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    {getInsuranceBadge(vehicle.seguro)}
                                                    <div className="text-xs text-muted-foreground">
                                                        Válido até {formatDate(vehicle.validadeSeguro)}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>{getStatusBadge(vehicle.status)}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center space-x-2">
                                                    <Button variant="ghost" size="sm">
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm">
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
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
                                    <Button variant="outline" onClick={() => setSearchTerm("")}>
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