// src/pages/Trips.tsx
import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Search, Plus, Eye, Edit, Trash2, CarFront, Calendar, Gauge } from "lucide-react";
import { apiFetch } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";

interface TripBackend {
    id: number;
    userId?: number | null;
    veiculoId?: number | null;
    dataSaida?: string | null;
    dataChegada?: string | null;
    finalidade?: string | null;
    kmFinal?: number | null;
    veiculo?: any; //eslint-disable-line @typescript-eslint/no-explicit-any
    user?: any; //eslint-disable-line @typescript-eslint/no-explicit-any
}

export default function Trips() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState("");
    const [trips, setTrips] = useState<TripBackend[]>([]);
    // agora maps com plate/model e name/email separados
    const [vehiclesPlateMap, setVehiclesPlateMap] = useState<Record<number, string>>({});
    const [vehiclesModelMap, setVehiclesModelMap] = useState<Record<number, string>>({});
    const [driversNameMap, setDriversNameMap] = useState<Record<number, string>>({});
    const [driversEmailMap, setDriversEmailMap] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const fetchTrips = async () => {
        setLoading(true);
        try {
            const resTrips = await apiFetch("/viagens/admin");
            if (!resTrips.ok) {
                const err = await resTrips.json().catch(() => ({ error: "Erro ao buscar viagens" }));
                toast({
                    title: "Erro ao carregar viagens",
                    description: err.error || "Não foi possível carregar as viagens.",
                    variant: "destructive",
                });
                setTrips([]);
                return;
            }
            const tripsData: TripBackend[] = await resTrips.json();

            // buscar veículos e motoristas para montar maps (para mostrar placa / nome)
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
                } catch (e) {
                    console.warn("Erro ao parsear /veiculos", e);
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
                } catch (e) {
                    console.warn("Erro ao parsear /motoristas", e);
                }
            }

            // complementar maps com dados embutidos nas viagens (se houver)
            if (Array.isArray(tripsData)) {
                tripsData.forEach(t => {
                    const vid = t.veiculo?.id ?? t.veiculoId;
                    if (vid !== undefined && vid !== null) {
                        if (t.veiculo?.placa && !vPlateMap[Number(vid)]) vPlateMap[Number(vid)] = t.veiculo.placa;
                        if (t.veiculo?.modelo && !vModelMap[Number(vid)]) vModelMap[Number(vid)] = t.veiculo.modelo;
                    }
                    const uid = t.user?.id ?? t.userId;
                    if (uid !== undefined && uid !== null) {
                        if (t.user?.nome && !dNameMap[Number(uid)]) dNameMap[Number(uid)] = t.user.nome;
                        if (t.user?.email && !dEmailMap[Number(uid)]) dEmailMap[Number(uid)] = t.user.email;
                    }
                });
            }

            setVehiclesPlateMap(vPlateMap);
            setVehiclesModelMap(vModelMap);
            setDriversNameMap(dNameMap);
            setDriversEmailMap(dEmailMap);
            setTrips(Array.isArray(tripsData) ? tripsData : []);
        } catch (err) {
            console.error("Erro ao carregar viagens:", err);
            toast({
                title: "Erro de conexão",
                description: "Não foi possível conectar ao servidor para carregar viagens.",
                variant: "destructive",
            });
            setTrips([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTrips();
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

    const filteredTrips = trips.filter((t) => {
        const plate =
            (t.veiculoId !== undefined && t.veiculoId !== null && vehiclesPlateMap[Number(t.veiculoId)]) ||
            (t.veiculo && (t.veiculo.placa || t.veiculo.modelo)) ||
            "";
        const driver =
            (t.userId !== undefined && t.userId !== null && driversNameMap[Number(t.userId)]) ||
            (t.user && (t.user.nome || t.user.email)) ||
            "";
        const finalidade = t.finalidade ?? "";
        const q = searchTerm.trim().toLowerCase();
        if (!q) return true;
        return (
            String(plate).toLowerCase().includes(q) ||
            String(driver).toLowerCase().includes(q) ||
            String(finalidade).toLowerCase().includes(q)
        );
    });

    // ações: ver, editar, deletar
    const handleView = (id: number) => {
        navigate(`/registrarviagens/${id}`);
    };

    const handleEdit = (id: number) => {
        navigate(`/registrarviagens/${id}`);
    };

    const handleDelete = async (id: number) => {
        const ok = window.confirm("Tem certeza que deseja deletar esta viagem? A ação é irreversível.");
        if (!ok) return;

        setDeletingId(id);
        try {
            const res = await apiFetch(`/viagens/${id}`, { method: "DELETE" });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: "Erro ao deletar viagem." }));
                toast({
                    title: "Erro ao deletar",
                    description: err.error || "Não foi possível deletar a viagem.",
                    variant: "destructive",
                });
                return;
            }
            // remover localmente (sem recarregar tudo)
            setTrips(prev => prev.filter(t => t.id !== id));
            toast({ title: "Viagem deletada", description: "A viagem foi removida com sucesso." });
        } catch (err) {
            console.error("Erro ao deletar viagem:", err);
            toast({
                title: "Erro de conexão",
                description: "Não foi possível conectar ao servidor para deletar a viagem.",
                variant: "destructive",
            });
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <AdminLayout title="Viagens">
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-4 justify-between">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                            placeholder="Buscar por veículo (placa), motorista ou finalidade..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <Button onClick={() => navigate("/registrarviagens")} className="bg-primary hover:bg-primary/90">
                        <Plus className="mr-2 h-4 w-4" /> Nova Viagem
                    </Button>
                </div>

                <Card className="shadow-card">
                    <CardHeader>
                        <CardTitle>Lista de Viagens</CardTitle>
                        <CardDescription>
                            {loading ? "Carregando..." : `${filteredTrips.length} viagem(ns) encontrado(s)`}
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Veículo</TableHead>
                                        <TableHead>Motorista</TableHead>
                                        <TableHead>Horário Saída</TableHead>
                                        <TableHead>Horário Chegada</TableHead>
                                        <TableHead>Finalidade</TableHead>
                                        <TableHead>Km Final</TableHead>
                                        <TableHead>Ações</TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                                Carregando...
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredTrips.length > 0 ? (
                                        filteredTrips.map((trip) => {
                                            const vid = trip.veiculoId ?? trip.veiculo?.id;
                                            const plate =
                                                (vid !== undefined && vid !== null && vehiclesPlateMap[Number(vid)]) ||
                                                (trip.veiculo && (trip.veiculo.placa ?? trip.veiculo.modelo)) ||
                                                "—";
                                            const model =
                                                (vid !== undefined && vid !== null && vehiclesModelMap[Number(vid)]) ||
                                                (trip.veiculo && trip.veiculo.modelo) ||
                                                "";

                                            const uid = trip.userId ?? trip.user?.id;
                                            const driverName =
                                                (uid !== undefined && uid !== null && driversNameMap[Number(uid)]) ||
                                                (trip.user && (trip.user.nome ?? trip.user.email)) ||
                                                "—";
                                            const driverEmail =
                                                (uid !== undefined && uid !== null && driversEmailMap[Number(uid)]) ||
                                                (trip.user && trip.user.email) ||
                                                "";

                                            return (
                                                <TableRow key={String(trip.id)} className="hover:bg-muted/50">
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
                                                            <div className="text-sm text-muted-foreground mt-1">{driverEmail || "—"}</div>
                                                        </div>
                                                    </TableCell>

                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                                            {formatDateTime(trip.dataSaida)}
                                                        </div>
                                                    </TableCell>

                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                                            {formatDateTime(trip.dataChegada)}
                                                        </div>
                                                    </TableCell>

                                                    <TableCell className="max-w-sm truncate">{trip.finalidade ?? "—"}</TableCell>

                                                    <TableCell>
                                                        <div className="flex items-center">
                                                            <Gauge className="h-4 w-4 mr-2 text-muted-foreground" />
                                                            {trip.kmFinal ? `${trip.kmFinal.toLocaleString()} km` : 'N/A'}
                                                        </div>
                                                    </TableCell>

                                                    <TableCell>
                                                        <div className="flex items-center space-x-2">
                                                            <Button variant="ghost" size="sm" onClick={() => handleView(trip.id)}>
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="sm" onClick={() => handleEdit(trip.id)}>
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-destructive hover:text-destructive"
                                                                onClick={() => handleDelete(trip.id)}
                                                                disabled={deletingId === trip.id}
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
                                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                                <div className="mb-2">Nenhuma viagem encontrada</div>
                                                <Button variant="outline" onClick={() => { setSearchTerm(""); fetchTrips(); }}>
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
