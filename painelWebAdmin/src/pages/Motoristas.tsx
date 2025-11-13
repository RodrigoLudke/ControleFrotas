import {useEffect, useState} from "react";
import {AdminLayout} from "@/components/layout/AdminLayout";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Badge} from "@/components/ui/badge";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {Calendar, Edit, Eye, Mail, MapPin, Phone, Plus, Search, Trash2} from "lucide-react";
import {useNavigate} from "react-router-dom";
import {apiFetch} from "@/services/api";
import {useToast} from "@/hooks/use-toast";

interface Driver {
    id: number;
    nome: string;
    cpf: string;
    cnh?: string;
    validadeCnh?: string;
    telefone?: string;
    email?: string;
    endereco?: string;
    dataContratacao?: string;
    status?: string;
    categoria?: string;
}

const Motoristas = () => {
    const navigate = useNavigate();
    const {toast} = useToast();
    const [searchTerm, setSearchTerm] = useState("");
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const fetchDrivers = async () => {
        setLoading(true);
        try {
            const response = await apiFetch("/motoristas");
            if (response.ok) {
                const data = await response.json();
                setDrivers(data);
            } else {
                const errorData = await response.json().catch(() => ({error: "Erro ao buscar motoristas."}));
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

    useEffect(() => {
        fetchDrivers();
    }, []); // só no mount

    const filteredDrivers = drivers.filter(driver =>
        driver.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        driver.cpf?.includes(searchTerm) ||
        driver.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusBadge = (status: string | undefined) => {
        return status === "ativo" ? (
            <Badge variant="default" className="bg-success text-success-foreground">Ativo</Badge>
        ) : (
            <Badge variant="secondary">Inativo</Badge>
        );
    };

    const getCategoryBadge = (category?: string) => {
        const colors = {
            A: "bg-blue-100 text-blue-800",
            B: "bg-green-100 text-green-800",
            C: "bg-yellow-100 text-yellow-800",
            D: "bg-purple-100 text-purple-800",
            E: "bg-red-100 text-red-800",
            AB: "bg-cyan-100 text-cyan-800"
        } as const;

        if (!category) return null;

        return (
            <Badge variant="outline" className={colors[category as keyof typeof colors]}>
                Categoria {category}
            </Badge>
        );
    };

    const handleEditDriver = (id: number) => {
        // padrão: reaproveitar a página de cadastro para edição (ajuste se seu route for outro)
        navigate(`/registrarmotoristas/${id}`);
    };

    const handleDeleteDriver = async (id: number) => {
        const ok = window.confirm("Tem certeza que deseja deletar este motorista? Esta ação é irreversível.");
        if (!ok) return;

        setDeletingId(id);
        try {
            const res = await apiFetch(`/motoristas/${id}`, {method: "DELETE"});
            if (res.ok) {
                // backend pode retornar 200/204/JSON
                toast({
                    title: "Motorista deletado",
                    description: "O motorista foi removido com sucesso.",
                });
                // remover localmente
                setDrivers(prev => prev.filter(d => d.id !== id));
            } else {
                const err = await res.json().catch(() => ({error: "Erro ao deletar motorista."}));
                toast({
                    title: "Erro ao deletar",
                    description: err.error || "Não foi possível deletar o motorista.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Erro ao deletar motorista:", error);
            toast({
                title: "Erro de conexão",
                description: "Não foi possível conectar ao servidor para deletar o motorista.",
                variant: "destructive",
            });
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <AdminLayout title="Motoristas">
            <div className="space-y-6">
                {/* Header Actions */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between">
                    <div className="relative flex-1 max-w-md">
                        <Search
                            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4"/>
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
                        <Plus className="mr-2 h-4 w-4"/>
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
                                                        <MapPin className="h-3 w-3 mr-1"/>
                                                        {driver.endereco}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">{driver.cpf}</TableCell>
                                            <TableCell>
                                                <div>
                                                    <div className="font-mono text-sm">{driver.cnh}</div>
                                                    <div className="text-xs text-muted-foreground flex items-center">
                                                        <Calendar className="h-3 w-3 mr-1"/>
                                                        {driver.validadeCnh ? `Válida até ${new Date(driver.validadeCnh).toLocaleDateString('pt-BR')}` : 'Sem data'}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>{getCategoryBadge(driver.categoria)}</TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <div className="text-sm flex items-center">
                                                        <Phone className="h-3 w-3 mr-1"/>
                                                        {driver.telefone}
                                                    </div>
                                                    <div className="text-sm flex items-center text-muted-foreground">
                                                        <Mail className="h-3 w-3 mr-1"/>
                                                        {driver.email}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>{getStatusBadge(driver.status || "")}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center space-x-2">
                                                    <Button variant="ghost" size="sm"
                                                            onClick={() => navigate(`/motoristas/${driver.id}`)}>
                                                        <Eye className="h-4 w-4"/>
                                                    </Button>
                                                    <Button variant="ghost" size="sm"
                                                            onClick={() => handleEditDriver(driver.id)}>
                                                        <Edit className="h-4 w-4"/>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-destructive hover:text-destructive"
                                                        onClick={() => handleDeleteDriver(driver.id)}
                                                        disabled={deletingId === driver.id}
                                                    >
                                                        <Trash2 className="h-4 w-4"/>
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
                                    <Button variant="outline" onClick={() => {
                                        setSearchTerm("");
                                        fetchDrivers();
                                    }}>
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
