// src/pages/Abastecimentos.tsx
import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Eye, Edit, Trash2, Fuel } from "lucide-react";
import { apiFetch } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";

interface AbastecimentoBackend {
    id: number;
    veiculoId: number;
    userId: number;
    data: string | null;
    quilometragem: number | null;
    litros: string | number | null; // backend may return Decimal as string
    valorPorLitro: string | number | null;
    custoTotal: string | number | null;
    combustivel?: string | null;
    posto?: string | null;
    // possíveis relações incluídas pelo backend
    veiculo?: { id?: number; placa?: string; modelo?: string };
    user?: { id?: number; nome?: string; email?: string };
}

export default function Abastecimentos() {
    const navigate = useNavigate();
    const { toast } = useToast();

    const [searchTerm, setSearchTerm] = useState("");
    const [abastecimentos, setAbastecimentos] = useState<AbastecimentoBackend[]>([]);
    const [vehiclesPlateMap, setVehiclesPlateMap] = useState<Record<number, string>>({});
    const [vehiclesModelMap, setVehiclesModelMap] = useState<Record<number, string>>({});
    const [driversNameMap, setDriversNameMap] = useState<Record<number, string>>({});
    const [driversEmailMap, setDriversEmailMap] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const fetchAbastecimentos = async () => {
        setLoading(true);
        try {
            // buscar abastecimentos (rota admin)
            const res = await apiFetch("/abastecimentos");
            if (!res.ok) {
                const e = await res.json().catch(() => ({ error: "Erro ao buscar abastecimentos" }));
                toast({
                    title: "Erro ao carregar abastecimentos",
                    description: e.error || "Não foi possível carregar os abastecimentos.",
                    variant: "destructive",
                });
                setAbastecimentos([]);
                setLoading(false);
                return;
            }
            const data: AbastecimentoBackend[] = await res.json();

            // buscar veículos e motoristas em paralelo para montar maps
            const [veicRes, motorRes] = await Promise.allSettled([apiFetch("/veiculos"), apiFetch("/motoristas")]);

            const vPlateMap: Record<number, string> = {};
            const vModelMap: Record<number, string> = {};
            if (veicRes.status === "fulfilled" && veicRes.value.ok) {
                try {
                    const veics = await veicRes.value.json();
                    if (Array.isArray(veics)) {
                        //eslint-disable-next-line @typescript-eslint/no-explicit-any
                        veics.forEach((v: any) => {
                            if (v && v.id !== undefined) {
                                vPlateMap[Number(v.id)] = v.placa ?? v.modelo ?? `Veículo ${v.id}`;
                                vModelMap[Number(v.id)] = v.modelo ?? "";
                            }
                        });
                    }
                } catch (err) {
                    console.warn("Erro ao parsear /veiculos", err);
                }
            }

            const dNameMap: Record<number, string> = {};
            const dEmailMap: Record<number, string> = {};
            if (motorRes.status === "fulfilled" && motorRes.value.ok) {
                try {
                    const motors = await motorRes.value.json();
                    if (Array.isArray(motors)) {
                        //eslint-disable-next-line @typescript-eslint/no-explicit-any
                        motors.forEach((m: any) => {
                            if (m && m.id !== undefined) {
                                dNameMap[Number(m.id)] = m.nome ?? m.email ?? `Motorista ${m.id}`;
                                dEmailMap[Number(m.id)] = m.email ?? "";
                            }
                        });
                    }
                } catch (err) {
                    console.warn("Erro ao parsear /motoristas", err);
                }
            }

            // complementar maps com dados embutidos nos próprios abastecimentos (se houver)
            if (Array.isArray(data)) {
                data.forEach(a => {
                    const vid = a.veiculo?.id ?? a.veiculoId;
                    if (vid !== undefined && vid !== null) {
                        if (a.veiculo?.placa && !vPlateMap[Number(vid)]) vPlateMap[Number(vid)] = a.veiculo.placa;
                        if (a.veiculo?.modelo && !vModelMap[Number(vid)]) vModelMap[Number(vid)] = a.veiculo.modelo;
                    }
                    const uid = a.user?.id ?? a.userId;
                    if (uid !== undefined && uid !== null) {
                        if (a.user?.nome && !dNameMap[Number(uid)]) dNameMap[Number(uid)] = a.user.nome;
                        if (a.user?.email && !dEmailMap[Number(uid)]) dEmailMap[Number(uid)] = a.user.email;
                    }
                });
            }

            setVehiclesPlateMap(vPlateMap);
            setVehiclesModelMap(vModelMap);
            setDriversNameMap(dNameMap);
            setDriversEmailMap(dEmailMap);
            setAbastecimentos(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Erro ao carregar abastecimentos:", err);
            toast({
                title: "Erro de conexão",
                description: "Não foi possível conectar ao servidor para carregar abastecimentos.",
                variant: "destructive",
            });
            setAbastecimentos([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAbastecimentos();
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

    const formatNumber = (value?: string | number | null, options?: Intl.NumberFormatOptions) => {
        if (value === null || value === undefined || value === "") return "—";
        const num = typeof value === "string" ? Number(value) : Number(value);
        if (Number.isNaN(num)) return String(value);
        return num.toLocaleString("pt-BR", options);
    };

    // ações: ver, editar, deletar
    const handleView = (id: number) => {
        navigate(`/registrarabastecimentos/${id}`);
    };

    const handleEdit = (id: number) => {
        navigate(`/registrarabastecimentos/${id}`);
    };

    const handleDelete = async (id: number) => {
        const ok = window.confirm("Tem certeza que deseja deletar este abastecimento? Essa ação é irreversível.");
        if (!ok) return;

        setDeletingId(id);
        try {
            const res = await apiFetch(`/abastecimentos/${id}`, { method: "DELETE" });
            if (res.ok) {
                toast({
                    title: "Abastecimento deletado",
                    description: "O registro de abastecimento foi removido com sucesso.",
                });
                setAbastecimentos(prev => prev.filter(a => a.id !== id));
            } else {
                const err = await res.json().catch(() => ({ error: "Erro ao deletar abastecimento." }));
                toast({
                    title: "Erro ao deletar",
                    description: err.error || "Não foi possível deletar o abastecimento.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Erro ao deletar abastecimento:", error);
            toast({
                title: "Erro de conexão",
                description: "Não foi possível conectar ao servidor para deletar o abastecimento.",
                variant: "destructive",
            });
        } finally {
            setDeletingId(null);
        }
    };

    const filtered = abastecimentos.filter(a => {
        const q = searchTerm.trim().toLowerCase();
        if (!q) return true;

        const plate =
            (a.veiculoId !== undefined && vehiclesPlateMap[Number(a.veiculoId)]) ||
            (a.veiculo && (a.veiculo.placa || a.veiculo.modelo)) ||
            "";

        const model =
            (a.veiculoId !== undefined && vehiclesModelMap[Number(a.veiculoId)]) ||
            (a.veiculo && a.veiculo.modelo) ||
            "";

        const driver =
            (a.userId !== undefined && driversNameMap[Number(a.userId)]) ||
            (a.user && (a.user.nome || a.user.email)) ||
            "";

        return (
            String(plate).toLowerCase().includes(q) ||
            String(model).toLowerCase().includes(q) ||
            String(driver).toLowerCase().includes(q) ||
            String(a.posto || "").toLowerCase().includes(q) ||
            String(a.combustivel || "").toLowerCase().includes(q)
        );
    });

    return (
        <AdminLayout title="Abastecimentos">
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-4 justify-between">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                            placeholder="Buscar por placa, motorista, posto ou combustível..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    <Button onClick={() => navigate("/registrarabastecimentos")} className="bg-primary hover:bg-primary/90">
                        <Plus className="mr-2 h-4 w-4" /> Novo Abastecimento
                    </Button>
                </div>

                <Card className="shadow-card">
                    <CardHeader>
                        <CardTitle>Lista de Abastecimentos</CardTitle>
                        <CardDescription>{loading ? "Carregando..." : `${filtered.length} registro(s)`}</CardDescription>
                    </CardHeader>

                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Veículo</TableHead>
                                        <TableHead>Motorista</TableHead>
                                        <TableHead>Data</TableHead>
                                        <TableHead>KM</TableHead>
                                        <TableHead>Litros</TableHead>
                                        <TableHead>Valor / L</TableHead>
                                        <TableHead>Custo</TableHead>
                                        <TableHead>Comb.</TableHead>
                                        <TableHead>Posto</TableHead>
                                        <TableHead>Ações</TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
                                        </TableRow>
                                    ) : filtered.length > 0 ? (
                                        filtered.map((a) => {
                                            const vid = a.veiculoId ?? a.veiculo?.id;
                                            const plate =
                                                (vid !== undefined && vid !== null && vehiclesPlateMap[Number(vid)]) ||
                                                (a.veiculo && (a.veiculo.placa ?? a.veiculo.modelo)) ||
                                                "—";
                                            const model =
                                                (vid !== undefined && vid !== null && vehiclesModelMap[Number(vid)]) ||
                                                (a.veiculo && a.veiculo.modelo) ||
                                                "—";
                                            const uid = a.userId ?? a.user?.id;
                                            const driverName =
                                                (uid !== undefined && uid !== null && driversNameMap[Number(uid)]) ||
                                                (a.user && (a.user.nome ?? a.user.email)) ||
                                                "—";
                                            const driverEmail =
                                                (uid !== undefined && uid !== null && driversEmailMap[Number(uid)]) ||
                                                (a.user && a.user.email) ||
                                                "—";

                                            return (
                                                <TableRow key={String(a.id)} className="hover:bg-muted/50">
                                                    <TableCell>
                                                        <div>
                                                            <div className="font-medium flex items-center gap-2">
                                                                <span>{plate}</span>
                                                            </div>
                                                            <div className="text-sm text-muted-foreground mt-1">{model || "—"}</div>
                                                        </div>
                                                    </TableCell>

                                                    <TableCell>
                                                        <div>
                                                            <div className="font-medium">{driverName}</div>
                                                            <div className="text-sm text-muted-foreground mt-1">{driverEmail}</div>
                                                        </div>
                                                    </TableCell>

                                                    <TableCell>{formatDateTime(a.data ?? null)}</TableCell>

                                                    <TableCell>{a.quilometragem != null ? `${a.quilometragem.toLocaleString()} km` : "—"}</TableCell>

                                                    <TableCell>{formatNumber(a.litros, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</TableCell>

                                                    <TableCell>{formatNumber(a.valorPorLitro, { style: "currency", currency: "BRL" })}</TableCell>

                                                    <TableCell>{formatNumber(a.custoTotal, { style: "currency", currency: "BRL" })}</TableCell>

                                                    <TableCell>{a.combustivel ?? "—"}</TableCell>

                                                    <TableCell className="max-w-sm truncate">{a.posto ?? "—"}</TableCell>

                                                    <TableCell>
                                                        <div className="flex items-center space-x-2">
                                                            <Button variant="ghost" size="sm" onClick={() => handleView(a.id)}>
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="sm" onClick={() => handleEdit(a.id)}>
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-destructive hover:text-destructive"
                                                                onClick={() => handleDelete(a.id)}
                                                                disabled={deletingId === a.id}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                                                <div className="mb-2">Nenhum abastecimento encontrado</div>
                                                <Button variant="outline" onClick={() => { setSearchTerm(""); fetchAbastecimentos(); }}>
                                                    Limpar filtros
                                                </Button>
                                            </TableCell>
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
}
