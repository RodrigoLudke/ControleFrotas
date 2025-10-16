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
import { Search, Plus, Eye, Edit, Trash2, CarFront, Calendar, MapPin } from "lucide-react";
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
    // possíveis relações incluídas pelo backend
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    veiculo?: any;
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    user?: any;
}

export default function Trips() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState("");
    const [trips, setTrips] = useState<TripBackend[]>([]);
    const [vehiclesMap, setVehiclesMap] = useState<Record<number, string>>({});
    const [driversMap, setDriversMap] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState(true);

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

            const vMap: Record<number, string> = {};
            if (veicRes.status === "fulfilled" && veicRes.value.ok) {
                try {
                    const veics = await veicRes.value.json();
                    if (Array.isArray(veics)) {
                        //eslint-disable-next-line @typescript-eslint/no-explicit-any
                        veics.forEach((v: any) => {
                            if (v && v.id !== undefined) vMap[Number(v.id)] = v.placa ?? v.modelo ?? `Veículo ${v.id}`;
                        });
                    }
                } catch (e) {
                    console.warn("Erro ao parsear /veiculos", e);
                }
            }

            const dMap: Record<number, string> = {};
            if (motorRes.status === "fulfilled" && motorRes.value.ok) {
                try {
                    const motors = await motorRes.value.json();
                    if (Array.isArray(motors)) {
                        //eslint-disable-next-line @typescript-eslint/no-explicit-any
                        motors.forEach((m: any) => {
                            if (m && m.id !== undefined) dMap[Number(m.id)] = m.nome ?? m.email ?? `Motorista ${m.id}`;
                        });
                    }
                } catch (e) {
                    console.warn("Erro ao parsear /motoristas", e);
                }
            }

            setVehiclesMap(vMap);
            setDriversMap(dMap);
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

    // filtro: placa, motorista, finalidade
    const filteredTrips = trips.filter((t) => {
        const plate =
            (t.veiculoId && vehiclesMap[Number(t.veiculoId)]) ||
            (t.veiculo && (t.veiculo.placa || t.veiculo.modelo)) ||
            "";
        const driver =
            (t.userId && driversMap[Number(t.userId)]) ||
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

    return (
        <AdminLayout title="Viagens">
            <div className="space-y-6">
                {/* Header Actions - estilo igual ao Motoristas */}
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

                {/* Tabela dentro do card com header e description idem padrão */}
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
                                        <TableHead>Veículo (placa)</TableHead>
                                        <TableHead>Motorista</TableHead>
                                        <TableHead>Horário Saída</TableHead>
                                        <TableHead>Horário Chegada</TableHead>
                                        <TableHead>Finalidade</TableHead>
                                        <TableHead>Km Final</TableHead>
                                        <TableHead className="text-center">Ações</TableHead>
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
                                            const plate =
                                                (trip.veiculoId && vehiclesMap[Number(trip.veiculoId)]) ||
                                                (trip.veiculo && (trip.veiculo.placa || trip.veiculo.modelo)) ||
                                                "—";
                                            const driver =
                                                (trip.userId && driversMap[Number(trip.userId)]) ||
                                                (trip.user && (trip.user.nome || trip.user.email)) ||
                                                "—";

                                            return (
                                                <TableRow key={String(trip.id)} className="hover:bg-muted/50">
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <CarFront className="h-4 w-4 text-primary" />
                                                            <span className="font-medium">{plate}</span>
                                                        </div>
                                                    </TableCell>

                                                    <TableCell>{driver}</TableCell>

                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                                            {formatDateTime(trip.dataSaida)}
                                                        </div>
                                                    </TableCell>

                                                    <TableCell>{formatDateTime(trip.dataChegada)}</TableCell>

                                                    <TableCell className="max-w-sm truncate">{trip.finalidade ?? "—"}</TableCell>

                                                    <TableCell>
                                                        {trip.kmFinal !== null && trip.kmFinal !== undefined ? (
                                                            <Badge variant="secondary">{trip.kmFinal} km</Badge>
                                                        ) : (
                                                            <Badge variant="outline">Não informado</Badge>
                                                        )}
                                                    </TableCell>

                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button variant="ghost" size="sm" title="Ver">
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="sm" title="Editar">
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="sm" title="Deletar">
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
