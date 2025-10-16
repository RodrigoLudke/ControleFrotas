// src/pages/Trips.tsx
import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card } from "@/components/ui/card";
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
import { Search, Plus, Eye, Edit, Trash2, CarFront, Calendar } from "lucide-react";
import { apiFetch } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
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
    // possíveis campos extras (fallback)
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    veiculo?: any;
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    user?: any;
}

export default function Trips() {
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState("");
    const [trips, setTrips] = useState<TripBackend[]>([]);
    const [vehiclesMap, setVehiclesMap] = useState<Record<number, string>>({});
    const [driversMap, setDriversMap] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            try {
                // buscar viagens (rota admin)
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

                // buscar veículos e motoristas em paralelo
                const [resVeic, resMotor] = await Promise.allSettled([apiFetch("/veiculos"), apiFetch("/motoristas")]);

                const vMap: Record<number, string> = {};
                if (resVeic.status === "fulfilled" && resVeic.value.ok) {
                    try {
                        const veics = await resVeic.value.json();
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
                if (resMotor.status === "fulfilled" && resMotor.value.ok) {
                    try {
                        const motors = await resMotor.value.json();
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
            } catch (error) {
                console.error("Erro ao carregar dados de viagens:", error);
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

        fetchAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const formatDateTime = (iso?: string | null) => {
        if (!iso) return "-";
        try {
            const dt = new Date(iso);
            // 15/01/2024 14:30
            return format(dt, "dd/MM/yyyy HH:mm", { locale: ptBR });
        } catch {
            return iso;
        }
    };

    // search por placa, motorista e finalidade
    const filtered = trips.filter((t) => {
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
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                            placeholder="Buscar por veículo (placa), motorista ou finalidade..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <Button className="w-full sm:w-auto">
                        <Plus className="mr-2 h-4 w-4" />
                        Nova Viagem
                    </Button>
                </div>

                <Card>
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
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        Carregando...
                                    </TableCell>
                                </TableRow>
                            ) : filtered.length > 0 ? (
                                filtered.map((trip) => {
                                    const plate =
                                        (trip.veiculoId && vehiclesMap[Number(trip.veiculoId)]) ||
                                        (trip.veiculo && (trip.veiculo.placa || trip.veiculo.modelo)) ||
                                        "—";
                                    const driver =
                                        (trip.userId && driversMap[Number(trip.userId)]) ||
                                        (trip.user && (trip.user.nome || trip.user.email)) ||
                                        "—";

                                    return (
                                        <TableRow key={String(trip.id)}>
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

                                            <TableCell className="max-w-xs">
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
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        Nenhuma viagem encontrada
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </Card>
            </div>
        </AdminLayout>
    );
}
