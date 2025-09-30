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
    Phone,
    Mail,
    Calendar,
    MapPin
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface Driver {
    id: number;
    nome: string;
    cpf: string;
    cnh: string;
    validadeCnh: string;
    telefone: string;
    email: string;
    endereco: string;
    dataContratacao: string;
    status: string;
    categoria: string;
}

const Motoristas = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState("");
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDrivers = async () => {
            try {
                const response = await apiFetch("/motoristas");
                if (response.ok) {
                    const data = await response.json();
                    setDrivers(data);
                } else {
                    const errorData = await response.json();
                    toast({
                        title: "Erro ao carregar motoristas",
                        description: errorData.error || "Não foi possível carregar a lista de motoristas.",
                        variant: "destructive",
                    });
                }
            } catch (error) {
                console.error("Falha na busca por motoristas:", error);
                toast({
                    title: "Erro de conexão",
                    description: "Não foi possível conectar ao servidor. Verifique sua conexão.",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };

        fetchDrivers();
    }, [toast]);

    const filteredDrivers = drivers.filter(driver =>
        driver.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        driver.cpf?.includes(searchTerm) ||
        driver.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusBadge = (status: string) => {
        return status === "ativo" ? (
            <Badge variant="default" className="bg-success text-success-foreground">Ativo</Badge>
        ) : (
            <Badge variant="secondary">Inativo</Badge>
        );
    };

    const getCategoryBadge = (category: string) => {
        const colors = {
            A: "bg-blue-100 text-blue-800",
            B: "bg-green-100 text-green-800",
            C: "bg-yellow-100 text-yellow-800",
            D: "bg-purple-100 text-purple-800",
            E: "bg-red-100 text-red-800",
            AB: "bg-cyan-100 text-cyan-800"
        };

        return (
            <Badge variant="outline" className={colors[category as keyof typeof colors]}>
                Categoria {category}
            </Badge>
        );
    };

    return (
        <AdminLayout title="Motoristas">
            <div className="space-y-6">
                {/* Header Actions */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                            placeholder="Buscar motoristas..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <Button
                        onClick={() => navigate("/register-driver")}
                        className="bg-primary hover:bg-primary/90"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Novo Motorista
                    </Button>
                </div>

                {/* Drivers Table */}
                <Card className="shadow-card">
                    <CardHeader>
                        <CardTitle>Lista de Motoristas</CardTitle>
                        <CardDescription>
                            {loading ? "Carregando..." : `${filteredDrivers.length} motorista(s) encontrado(s)`}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nome</TableHead>
                                        <TableHead>CPF</TableHead>
                                        <TableHead>CNH</TableHead>
                                        <TableHead>Categoria</TableHead>
                                        <TableHead>Contato</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredDrivers.map((driver) => (
                                        <TableRow key={driver.id} className="hover:bg-muted/50">
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium">{driver.nome}</div>
                                                    <div className="text-sm text-muted-foreground flex items-center">
                                                        <MapPin className="h-3 w-3 mr-1" />
                                                        {driver.endereco}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">{driver.cpf}</TableCell>
                                            <TableCell>
                                                <div>
                                                    <div className="font-mono text-sm">{driver.cnh}</div>
                                                    <div className="text-xs text-muted-foreground flex items-center">
                                                        <Calendar className="h-3 w-3 mr-1" />
                                                        Válida até {new Date(driver.validadeCnh).toLocaleDateString('pt-BR')}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>{getCategoryBadge(driver.categoria)}</TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <div className="text-sm flex items-center">
                                                        <Phone className="h-3 w-3 mr-1" />
                                                        {driver.telefone}
                                                    </div>
                                                    <div className="text-sm flex items-center text-muted-foreground">
                                                        <Mail className="h-3 w-3 mr-1" />
                                                        {driver.email}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>{getStatusBadge(driver.status)}</TableCell>
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

                            {filteredDrivers.length === 0 && !loading && (
                                <div className="text-center py-8 text-muted-foreground">
                                    <div className="mb-2">Nenhum motorista encontrado</div>
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

export default Motoristas;