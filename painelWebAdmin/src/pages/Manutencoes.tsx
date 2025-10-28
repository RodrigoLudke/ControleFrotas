// src/pages/Manutencoes.tsx
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
    Wrench,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";

interface Manutencao {
    id: number;
    veiculoId?: number;
    userId?: number;
    veiculo?: { id?: number; placa?: string; modelo?: string };
    user?: { id?: number; nome?: string; email?: string };
    descricao?: string;
    data?: string; // ISO
    quilometragem?: number | null;
    tipo?: string;
    status?: string;
    custo?: number | null;
    createdAt?: string;
    updatedAt?: string;
}

interface Vehicle {
    id: number;
    placa?: string;
    modelo?: string;
}

interface Driver {
    id: number;
    nome?: string;
    email?: string;
}

const Manutencoes = () => {
    const navigate = useNavigate();
    const { toast } = useToast();

    const [searchTerm, setSearchTerm] = useState("");
    const [manutencoes, setManutencoes] = useState<Manutencao[]>([]);
    const [veiculos, setVeiculos] = useState<Vehicle[]>([]);
    const [motoristas, setMotoristas] = useState<Driver[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [resM, resV, resD] = await Promise.all([
                apiFetch("/manutencoes"),
                apiFetch("/veiculos"),
                apiFetch("/motoristas"),
            ]);

            if (resM.ok) {
                const dataM = await resM.json();
                setManutencoes(Array.isArray(dataM) ? dataM : []);
            } else {
                const err = await resM.json().catch(() => ({ error: "Erro ao buscar manutenções." }));
                toast({ title: "Erro", description: err.error || "Não foi possível carregar manutenções.", variant: "destructive" });
                setManutencoes([]);
            }

            if (resV.ok) {
                const dataV = await resV.json();
                setVeiculos(Array.isArray(dataV) ? dataV : []);
            } else {
                setVeiculos([]);
            }

            if (resD.ok) {
                const dataD = await resD.json();
                setMotoristas(Array.isArray(dataD) ? dataD : []);
            } else {
                setMotoristas([]);
            }
        } catch (err) {
            console.error("Erro ao buscar dados:", err);
            toast({ title: "Erro de conexão", description: "Não foi possível conectar ao servidor.", variant: "destructive" });
            setManutencoes([]);
            setVeiculos([]);
            setMotoristas([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const formatDateTime = (iso?: string | null) => {
        if (!iso) return "—";
        try {
            return format(new Date(iso), "dd/MM/yyyy HH:mm", { locale: ptBR });
        } catch {
            return iso;
        }
    };

    const getVehicleLabel = (item: Manutencao) => {
        // Prioriza objeto aninhado, senão busca pelo id em veiculos
        if (item.veiculo && (item.veiculo.placa || item.veiculo.modelo)) {
            return `${item.veiculo.placa ?? `#${item.veiculo.id ?? "?"}`}`.trim();
        }
        if (item.veiculoId !== undefined && item.veiculoId !== null) {
            const v = veiculos.find(x => Number(x.id) === Number(item.veiculoId));
            if (v) return `${v.placa ?? `#${v.id}`}`.trim();
            return `#${item.veiculoId}`;
        }
        return "—";
    };

    const getDriverLabel = (item: Manutencao) => {
        if (item.user && (item.user.nome || item.user.email)) {
            return `${item.user.nome ?? item.user.email ?? `#${item.user.id ?? "?"}`}`;
        }
        if (item.userId !== undefined && item.userId !== null) {
            const m = motoristas.find(x => Number(x.id) === Number(item.userId));
            if (m) return `${m.nome ?? m.email ?? `#${m.id}`}`;
            return `#${item.userId}`;
        }
        return "—";
    };

    const getStatusBadge = (status?: string | null) => {
        const key = (status ?? "").toLowerCase();
        const mapping: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
            agendada: { label: "Agendada", variant: "default", className: "" },
            em_andamento: { label: "Em Andamento", variant: "secondary", className: "" },
            concluida: { label: "Concluída", variant: "default", className: "bg-success text-success-foreground" },
            cancelada: { label: "Cancelada", variant: "destructive", className: "" },
            pendente: { label: "Pendente", variant: "outline", className: "" },
        };
        const cfg = mapping[key] ?? { label: status ?? "Desconhecido", variant: "outline" };
        return <Badge variant={cfg.variant} className={cfg.className}>{cfg.label}</Badge>;
    };

    const filtered = manutencoes.filter(m => {
        const q = searchTerm.trim().toLowerCase();
        if (!q) return true;

        const vehicleLabel = getVehicleLabel(m).toLowerCase();
        const driverLabel = getDriverLabel(m).toLowerCase();
        const descricao = (m.descricao ?? "").toLowerCase();
        const tipo = (m.tipo ?? "").toLowerCase();
        const status = (m.status ?? "").toLowerCase();

        return (
            vehicleLabel.includes(q) ||
            driverLabel.includes(q) ||
            descricao.includes(q) ||
            tipo.includes(q) ||
            status.includes(q) ||
            String(m.id).includes(q)
        );
    });

    const handleView = (id: number) => {
        navigate(`/registrarmanutencoes/${id}`);
    };

    const handleEdit = (id: number) => {
        navigate(`/registrarmanutencoes/${id}`);
    };

    const handleDelete = async (id: number) => {
        const ok = window.confirm("Tem certeza que deseja deletar esta manutenção? Essa ação é irreversível.");
        if (!ok) return;

        setDeletingId(id);
        try {
            const res = await apiFetch(`/manutencoes/${id}`, { method: "DELETE" });
            if (res.ok) {
                toast({ title: "Manutenção deletada", description: "Registro removido com sucesso." });
                setManutencoes(prev => prev.filter(x => x.id !== id));
            } else {
                const e = await res.json().catch(() => ({ error: "Erro ao deletar manutenção." }));
                toast({ title: "Erro", description: e.error || "Não foi possível deletar.", variant: "destructive" });
            }
        } catch (err) {
            console.error("Erro ao deletar manutenção:", err);
            toast({ title: "Erro de conexão", description: "Não foi possível conectar ao servidor.", variant: "destructive" });
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <AdminLayout title="Manutenções">
            <div className="space-y-6">
                {/* Header Actions */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                            placeholder="Buscar por veículo, motorista, descrição, tipo ou status..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    <div className="flex gap-2">
                        <Button onClick={() => navigate("/registrarmanutencoes")} className="bg-primary hover:bg-primary/90">
                            <Plus className="mr-2 h-4 w-4" />
                            Nova Manutenção
                        </Button>
                        <Button variant="secondary" onClick={fetchAll}>Atualizar</Button>
                    </div>
                </div>

                {/* Manutenções Table */}
                <Card className="shadow-card">
                    <CardHeader>
                        <CardTitle>Lista de Manutenções</CardTitle>
                        <CardDescription>{loading ? "Carregando..." : `${filtered.length} registro(s)`}</CardDescription>
                    </CardHeader>

                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Veículo</TableHead>
                                        <TableHead>Motorista</TableHead>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead>Descrição</TableHead>
                                        <TableHead>Data / Horário</TableHead>
                                        <TableHead>Quilometragem</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Ações</TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
                                        </TableRow>
                                    ) : filtered.length > 0 ? (
                                        filtered.map(m => (
                                            <TableRow key={m.id} className="hover:bg-muted/50">
                                                <TableCell>
                                                    <div>
                                                        <div className="font-medium">{getVehicleLabel(m)}</div>
                                                        <div className="text-sm text-muted-foreground">{m.veiculo?.modelo ?? ""}</div>
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <div className="font-medium">{getDriverLabel(m)}</div>
                                                    <div className="text-sm text-muted-foreground">{m.user?.email ?? ""}</div>
                                                </TableCell>

                                                <TableCell>
                                                    <div className="font-medium">{m.tipo ?? "—"}</div>
                                                </TableCell>

                                                <TableCell className="max-w-sm truncate">{m.descricao ?? "—"}</TableCell>

                                                <TableCell>{formatDateTime(m.data ?? m.createdAt)}</TableCell>

                                                <TableCell>{m.quilometragem != null ? `${m.quilometragem.toLocaleString()} km` : "—"}</TableCell>

                                                <TableCell>{getStatusBadge(m.status)}</TableCell>

                                                <TableCell>
                                                    <div className="flex items-center space-x-2 justify-end">
                                                        <Button variant="ghost" size="sm" onClick={() => handleView(m.id)}>
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="sm" onClick={() => handleEdit(m.id)}>
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-destructive hover:text-destructive"
                                                            onClick={() => handleDelete(m.id)}
                                                            disabled={deletingId === m.id}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma manutenção encontrada</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
};

export default Manutencoes;
