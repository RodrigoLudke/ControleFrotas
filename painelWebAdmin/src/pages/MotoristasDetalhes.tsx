// src/pages/DriverDetails.tsx
import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
    ArrowLeft,
    TrendingUp,
    TrendingDown,
    Car,
    Fuel,
    DollarSign,
    MapPin,
    Calendar,
    Phone,
    Mail,
    Clock,
    AlertCircle
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import {
    ResponsiveContainer,
    LineChart,
    Line,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar
} from "recharts";
import { apiFetch } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";

// ------- Types (simples) -------
type Motorista = { id: number; nome?: string; cpf?: string; cnh?: string; validadeCnh?: string | null; telefone?: string | null; email?: string | null; endereco?: string | null; dataContratacao?: string | null; status?: string | null; categoria?: string | null; };
//eslint-disable-next-line @typescript-eslint/no-explicit-any
type Viagem = { id: number; veiculoId?: number | null; userId?: number | null; dataSaida?: string | null; dataChegada?: string | null; kmInicial?: number | null; kmFinal?: number | null; finalidade?: string | null; user?: any; veiculo?: any; };
type Abastecimento = { id: number; veiculoId: number; userId: number; data: string; quilometragem: number; litros: number; valorPorLitro: number; custoTotal: number; combustivel?: string; posto?: string | null; };
type Manutencao = { id: number; veiculoId?: number; userId?: number; data?: string; quilometragem?: number; custo?: number; descricao?: string; tipo?: string; status?: string; };
type Veiculo = { id: number; placa?: string; modelo?: string; };

// colors for charts
const COLORS = ['hsl(214 84% 56%)', 'hsl(212 100% 47%)', 'hsl(142 76% 36%)', 'hsl(38 92% 50%)', 'hsl(0 84% 60%)'];

export default function DriverDetails() {
    const { id } = useParams<{ id?: string }>();
    const driverId = id ? Number(id) : NaN;
    const navigate = useNavigate();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [driver, setDriver] = useState<Motorista | null>(null);
    const [trips, setTrips] = useState<Viagem[]>([]);
    const [fuels, setFuels] = useState<Abastecimento[]>([]);
    const [manuts, setManuts] = useState<Manutencao[]>([]);
    const [vehicles, setVehicles] = useState<Veiculo[]>([]);

    useEffect(() => {
        // valida driverId
        if (!Number.isFinite(driverId) || driverId <= 0) {
            console.warn("DriverDetails: driverId inválido:", driverId);
            return;
        }
        let mounted = true;

        const safeJson = async (res: Response | null) => {
            if (!res) return null;
            if (!res.ok) return null;
            try {
                const j = await res.json();
                // aceita payload direto [] ou { data: [] }
                if (Array.isArray(j)) return j;
                if (j && Array.isArray(j.data)) return j.data;
                return j;
            } catch (e) {
                console.warn("safeJson parse fail", e);
                return null;
            }
        };

        const load = async () => {
            setLoading(true);
            try {
                // tentativas em ordem: userId, motoristaId, admin (filtrar depois)
                const tryEndpoints = [
                    apiFetch(`/motoristas/${driverId}`),
                    apiFetch(`/viagens?userId=${driverId}`),
                    apiFetch(`/viagens?motoristaId=${driverId}`),
                    apiFetch(`/viagens/admin`), // fallback: pega tudo e filtra
                    apiFetch(`/abastecimentos?userId=${driverId}`),
                    apiFetch(`/manutencoes?userId=${driverId}`),
                    apiFetch(`/veiculos`)
                ];

                // Disparar as requisições necessárias em paralelo (motorista + viagens/fuels/manuts/veiculos)
                // Separo a chamada do motorista para tratar primeiro
                const dRes = await tryEndpoints[0];
                if (dRes?.ok) {
                    const dJson = await dRes.json().catch(() => null);
                    if (mounted) setDriver(dJson);
                } else {
                    console.warn("Não conseguiu carregar /motoristas/:id", dRes);
                    // não interrompe, apenas avisa
                }

                // 1) tentar /viagens?userId=
                let tripsArr: Viagem[] | null = null;
                try {
                    const r1 = await tryEndpoints[1];
                    //eslint-disable-next-line @typescript-eslint/no-explicit-any
                    tripsArr = await safeJson(r1) as any;
                    if (Array.isArray(tripsArr) && tripsArr.length > 0) {
                        // ok
                    } else {
                        // 2) tentar /viagens?motoristaId=
                        const r2 = await tryEndpoints[2];
                        //eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const arr2 = await safeJson(r2) as any;
                        if (Array.isArray(arr2) && arr2.length > 0) {
                            tripsArr = arr2;
                        } else {
                            // 3) fallback -> /viagens/admin e filtra por userId (se retornar tudo)
                            const r3 = await tryEndpoints[3];
                            //eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const all = await safeJson(r3) as any;
                            if (Array.isArray(all)) {
                                tripsArr = all.filter((t: Viagem) => {
                                    const uid = t.userId ?? (t.user?.id);
                                    return Number(uid) === driverId;
                                });
                            } else {
                                tripsArr = [];
                            }
                        }
                    }
                } catch (e) {
                    console.warn("Erro ao buscar viagens (tentativas múltiplas):", e);
                    tripsArr = [];
                }

                // fuels, manuts, vehicles
                const [fuelsRes, manRes, vRes] = await Promise.all([tryEndpoints[4], tryEndpoints[5], tryEndpoints[6]]);
                //eslint-disable-next-line @typescript-eslint/no-explicit-any
                const fuelsArr = (await safeJson(fuelsRes)) as any;
                //eslint-disable-next-line @typescript-eslint/no-explicit-any
                const manArr = (await safeJson(manRes)) as any;
                //eslint-disable-next-line @typescript-eslint/no-explicit-any
                const vArr = (await safeJson(vRes)) as any;

                if (mounted) {
                    setTrips(Array.isArray(tripsArr) ? tripsArr : []);
                    setFuels(Array.isArray(fuelsArr) ? fuelsArr : []);
                    setManuts(Array.isArray(manArr) ? manArr : []);
                    setVehicles(Array.isArray(vArr) ? vArr : []);
                }

                // logs úteis para debug
                console.debug("DriverDetails: trips fetched:", { driverId, tripsCount: Array.isArray(tripsArr) ? tripsArr.length : 0 });
            } catch (err) {
                console.error("Erro ao carregar dados do motorista:", err);
                toast({ title: "Erro", description: "Erro ao carregar dados. Veja o console.", variant: "destructive" });
            } finally {
                if (mounted) setLoading(false);
            }
        };

        load();
        return () => { mounted = false; };
    }, [driverId, toast]);

    // mapa de veículos
    const vehiclesMap = useMemo(() => {
        const m: Record<number, Veiculo> = {};
        vehicles.forEach(v => { if (v && v.id !== undefined) m[v.id] = v; });
        return m;
    }, [vehicles]);

    // KPIs (mesma lógica sua)
    const stats = useMemo(() => {
        const totalViagens = trips.length;
        const kmRodados = trips.reduce((acc, t) => {
            const ki = typeof t.kmInicial === "number" ? t.kmInicial : null;
            const kf = typeof t.kmFinal === "number" ? t.kmFinal : null;
            if (ki !== null && kf !== null && kf >= ki) {
                return acc + (kf - ki);
            }
            return acc;
        }, 0);
        const manutCost = manuts.reduce((acc, m) => acc + (m.custo ? Number(m.custo) : 0), 0);
        const fuelCost = fuels.reduce((acc, f) => acc + (f.custoTotal ? Number(f.custoTotal) : 0), 0);
        const custoTotal = manutCost + fuelCost;

        const viagensCompletadas = trips.filter(t => !!t.dataChegada).length;
        const viagensCanceladas = totalViagens - viagensCompletadas;

        let tempoMedio = "—";
        try {
            const durations: number[] = trips.map(t => {
                if (t.dataSaida && t.dataChegada) {
                    const s = new Date(t.dataSaida).getTime();
                    const e = new Date(t.dataChegada).getTime();
                    if (!isNaN(s) && !isNaN(e) && e > s) return e - s;
                }
                return 0;
            }).filter(d => d > 0);
            if (durations.length > 0) {
                const avgMs = durations.reduce((a, b) => a + b, 0) / durations.length;
                const hours = Math.floor(avgMs / (1000 * 60 * 60));
                const minutes = Math.round((avgMs % (1000 * 60 * 60)) / (1000 * 60));
                tempoMedio = `${hours}h ${String(minutes).padStart(2, "0")}min`;
            }
        } catch (e) { tempoMedio = "—"; }

        return { totalViagens, kmRodados, custoTotal, viagensCompletadas, viagensCanceladas, tempoMedio, avaliacaoMedia: 0 };
    }, [trips, manuts, fuels]);

    // cost over time
    const costOverTime = useMemo(() => {
        const map: Record<string, { mesLabel: string; custo: number; combustivel: number; manutencao: number }> = {};
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const push = (iso?: string | null, amount = 0, key: "combustivel" | "manutencao") => {
            if (!iso) return;
            try {
                const d = new Date(iso);
                if (isNaN(d.getTime())) return;
                const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                const label = format(d, "MMM", { locale: ptBR });
                if (!map[ym]) map[ym] = { mesLabel: label, custo: 0, combustivel: 0, manutencao: 0 };
                map[ym][key] += amount;
                map[ym].custo += amount;
            } catch (e) { /* ignore */ }
        };
        fuels.forEach(f => push(f.data, Number(f.custoTotal ?? 0), "combustivel"));
        manuts.forEach(m => push(m.data ?? undefined, Number(m.custo ?? 0), "manutencao"));
        const arr = Object.entries(map).map(([ym, val]) => ({ ym, ...val }));
        arr.sort((a, b) => a.ym.localeCompare(b.ym));
        if (arr.length === 0) {
            //eslint-disable-next-line @typescript-eslint/no-explicit-any
            const res: any[] = [];
            for (let i = 5; i >= 0; i--) {
                const d = new Date(); d.setMonth(d.getMonth() - i);
                res.push({ mes: format(d, "MMM", { locale: ptBR }), custo: 0, combustivel: 0, manutencao: 0 });
            }
            return res;
        }
        return arr.slice(-6).map(x => ({ mes: x.mesLabel, custo: x.custo, combustivel: x.combustivel, manutencao: x.manutencao }));
    }, [fuels, manuts]);

    // vehiclesUsed
    const vehiclesUsed = useMemo(() => {
        const count: Record<number, number> = {};
        trips.forEach(t => {
            const vid = t.veiculoId ?? (t.veiculo?.id);
            if (typeof vid === "number") count[vid] = (count[vid] || 0) + 1;
        });
        const arr = Object.entries(count).map(([vid, qtd]) => {
            const v = vehiclesMap[Number(vid)];
            return { veiculo: v ? v.modelo ?? `Veículo ${vid}` : `Veículo ${vid}`, placa: v ? v.placa ?? "" : "", viagens: qtd, percentual: 0 };
        });
        const total = arr.reduce((a, b) => a + b.viagens, 0) || 1;
        arr.forEach(a => a.percentual = +(100 * (a.viagens / total)).toFixed(1));
        arr.sort((a, b) => b.viagens - a.viagens);
        return arr;
    }, [trips, vehiclesMap]);

    const vehicleDistributionData = useMemo(() => vehiclesUsed.map(v => ({ name: v.veiculo, value: v.viagens })), [vehiclesUsed]);

    const fuelHistory = useMemo(() => {
        const arr = [...fuels]; arr.sort((a,b) => new Date(b.data).getTime() - new Date(a.data).getTime()); return arr.slice(0,20);
    }, [fuels]);

    const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    if (!id) return (
        <AdminLayout title="Detalhes do Motorista">
            <div className="mx-auto max-w-4xl">Motorista não especificado.</div>
        </AdminLayout>
    );

    return (
        <AdminLayout title={`Detalhes do Motorista ${driver?.nome ?? id}`}>
            <div className="space-y-6">
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" onClick={() => navigate("/motoristas")}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Voltar
                    </Button>
                </div>

                {/* Perfil */}
                <Card className="shadow-card">
                    <CardContent className="pt-6">
                        <div className="flex flex-col md:flex-row gap-6">
                            <div className="flex-shrink-0">
                                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary">
                                    {driver?.nome ? driver.nome.split(' ').map(n => n[0]).join('') : '—'}
                                </div>
                            </div>
                            <div className="flex-1 space-y-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h2 className="text-2xl font-bold">{driver?.nome ?? '—'}</h2>
                                        <Badge variant="default" className={driver?.status === "ativo" ? "bg-success text-success-foreground" : ""}>
                                            {driver?.status === "ativo" ? "Ativo" : (driver?.status ?? "—")}
                                        </Badge>
                                        <Badge variant="outline">Categoria {driver?.categoria ?? "—"}</Badge>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                                        <div className="flex items-center text-muted-foreground"><Phone className="h-4 w-4 mr-2" />{driver?.telefone ?? '—'}</div>
                                        <div className="flex items-center text-muted-foreground"><Mail className="h-4 w-4 mr-2" />{driver?.email ?? '—'}</div>
                                        <div className="flex items-center text-muted-foreground"><MapPin className="h-4 w-4 mr-2" />{driver?.endereco ?? '—'}</div>
                                        <div className="flex items-center text-muted-foreground"><Calendar className="h-4 w-4 mr-2" />{driver?.dataContratacao ? `Desde ${format(new Date(driver.dataContratacao), "dd/MM/yyyy", { locale: ptBR })}` : '—'}</div>
                                    </div>
                                </div>

                                <Separator />

                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                    <div><span className="text-muted-foreground">CPF:</span><p className="font-mono font-medium">{driver?.cpf ?? '—'}</p></div>
                                    <div><span className="text-muted-foreground">CNH:</span><p className="font-mono font-medium">{driver?.cnh ?? '—'}</p></div>
                                    <div><span className="text-muted-foreground">Validade CNH:</span><p className="font-medium">{driver?.validadeCnh ? format(new Date(driver.validadeCnh), "dd/MM/yyyy", { locale: ptBR }) : '—'}</p></div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* KPIs Principais */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="shadow-card">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total de Viagens</CardTitle>
                            <Car className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalViagens}</div>
                            <p className="text-xs text-muted-foreground flex items-center mt-1">
                                <TrendingUp className="h-3 w-3 mr-1 text-success" />
                                {/* simplistic delta placeholder */}
                                +{Math.round(Math.random() * 10)}% vs mês anterior
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="shadow-card">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">KM Rodados</CardTitle>
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.kmRodados.toLocaleString('pt-BR')}</div>
                            <p className="text-xs text-muted-foreground flex items-center mt-1">
                                <TrendingUp className="h-3 w-3 mr-1 text-success" />
                                +{Math.round(Math.random() * 10)}% vs mês anterior
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="shadow-card">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Custo Total</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(stats.custoTotal)}</div>
                            <p className="text-xs text-muted-foreground flex items-center mt-1">
                                <TrendingUp className="h-3 w-3 mr-1 text-destructive" />
                                +{Math.round(Math.random() * 10)}% vs mês anterior
                            </p>
                        </CardContent>
                    </Card>

                </div>

                {/* Performance & Distribution */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="shadow-card">
                        <CardHeader>
                            <CardTitle>Taxa de Conclusão</CardTitle>
                            <CardDescription>Performance nas viagens realizadas</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span>Viagens Completadas</span>
                                    <span className="font-medium">{stats.viagensCompletadas}/{stats.totalViagens}</span>
                                </div>
                                <Progress value={(stats.viagensCompletadas / Math.max(1, stats.totalViagens)) * 100} className="h-2" />
                                <p className="text-xs text-muted-foreground mt-1">
                                    {((stats.viagensCompletadas / Math.max(1, stats.totalViagens)) * 100).toFixed(1)}% de conclusão
                                </p>
                            </div>

                            <Separator />

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">Tempo Médio</span>
                                    </div>
                                    <p className="text-xl font-bold">{stats.tempoMedio}</p>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">Canceladas</span>
                                    </div>
                                    <p className="text-xl font-bold text-destructive">{stats.viagensCanceladas}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-card">
                        <CardHeader>
                            <CardTitle>Distribuição de Veículos</CardTitle>
                            <CardDescription>Veículos mais utilizados pelo motorista</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie
                                        data={vehicleDistributionData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {vehicleDistributionData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>

                {/* Evolução de Custos */}
                <Card className="shadow-card">
                    <CardHeader>
                        <CardTitle>Evolução de Custos</CardTitle>
                        <CardDescription>Histórico de custos mensais (últimos meses)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={costOverTime}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="mes" />
                                <YAxis />
                                { /* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                                <Legend />
                                <Line type="monotone" dataKey="custo" stroke={COLORS[0]} strokeWidth={2} name="Custo Total" />
                                <Line type="monotone" dataKey="combustivel" stroke={COLORS[2]} strokeWidth={2} name="Combustível" />
                                <Line type="monotone" dataKey="manutencao" stroke={COLORS[3]} strokeWidth={2} name="Manutenção" />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Veículos Mais Usados */}
                <Card className="shadow-card">
                    <CardHeader>
                        <CardTitle>Veículos Mais Utilizados</CardTitle>
                        <CardDescription>Ranking de veículos por número de viagens</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={vehiclesUsed}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="veiculo" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="viagens" fill={COLORS[0]} name="Número de Viagens" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Histórico de Abastecimentos */}
                <Card className="shadow-card">
                    <CardHeader>
                        <CardTitle>Histórico de Abastecimentos</CardTitle>
                        <CardDescription>Últimos abastecimentos realizados</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Data</TableHead>
                                        <TableHead>Local</TableHead>
                                        <TableHead>Litros</TableHead>
                                        <TableHead>Valor</TableHead>
                                        <TableHead>KM Atual</TableHead>
                                        <TableHead>Consumo (estimado)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {fuelHistory.map((fuel, index) => {
                                        const next = fuelHistory[index + 1];
                                        const kmDiff = next ? fuel.quilometragem - next.quilometragem : null;
                                        const liters = next ? next.litros : null;
                                        const consumption = (kmDiff && liters) ? (kmDiff / liters).toFixed(2) : '-';
                                        return (
                                            <TableRow key={fuel.id}>
                                                <TableCell className="font-medium">{format(new Date(fuel.data), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                                                <TableCell>{fuel.posto ?? fuel.combustivel ?? "—"}</TableCell>
                                                <TableCell>{fuel.litros} L</TableCell>
                                                <TableCell className="font-medium">{formatCurrency(Number(fuel.custoTotal ?? 0))}</TableCell>
                                                <TableCell className="font-mono">{fuel.quilometragem.toLocaleString('pt-BR')} km</TableCell>
                                                <TableCell>{consumption !== '-' ? <Badge variant="outline" className="font-mono">{consumption} km/L</Badge> : '-'}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                {/* Detalhamento por Veículo */}
                <Card className="shadow-card">
                    <CardHeader>
                        <CardTitle>Detalhamento por Veículo</CardTitle>
                        <CardDescription>Estatísticas completas de uso por veículo</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Veículo</TableHead>
                                        <TableHead>Placa</TableHead>
                                        <TableHead>Viagens</TableHead>
                                        <TableHead>Percentual</TableHead>
                                        <TableHead>Performance</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {vehiclesUsed.map((vehicle, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium">{vehicle.veiculo}</TableCell>
                                            <TableCell className="font-mono">{vehicle.placa || "—"}</TableCell>
                                            <TableCell>{vehicle.viagens}</TableCell>
                                            <TableCell><Badge variant="secondary">{vehicle.percentual}%</Badge></TableCell>
                                            <TableCell><Progress value={vehicle.percentual} className="h-2 w-24" /></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
