// src/pages/DriverDetails.tsx
import {useEffect, useMemo, useState} from "react";
import {AdminLayout} from "@/components/layout/AdminLayout";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {Separator} from "@/components/ui/separator";
import {Progress} from "@/components/ui/progress";
import {ArrowLeft, Calendar, Car, DollarSign, Mail, MapPin, Phone, TrendingUp, TrendingDown, Clock, Timer} from "lucide-react";
import {useNavigate, useParams} from "react-router-dom";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";
import {apiFetch} from "@/services/api";
import {useToast} from "@/hooks/use-toast";
import {format} from "date-fns";
import {ptBR} from "date-fns/locale/pt-BR";

// ------- Types (simples) -------
type Motorista = {
    id: number;
    nome?: string;
    cpf?: string;
    cnh?: string;
    validadeCnh?: string | null;
    telefone?: string | null;
    email?: string | null;
    endereco?: string | null;
    dataContratacao?: string | null;
    status?: string | null;
    categoria?: string | null;
};
type Viagem = {
    id: number;
    veiculoId?: number | null;
    userId?: number | null;
    dataSaida?: string | null;
    dataChegada?: string | null;
    kmInicial?: number | null;
    kmFinal?: number | null;
    finalidade?: string | null;
    user?: any;
    veiculo?: any;
};
type Abastecimento = {
    id: number;
    veiculoId: number;
    userId: number;
    data: string;
    quilometragem: number;
    litros: number;
    valorPorLitro: number;
    custoTotal: number;
    combustivel?: string;
    posto?: string | null;
};
type Manutencao = {
    id: number;
    veiculoId?: number;
    userId?: number;
    data?: string;
    quilometragem?: number;
    custo?: number;
    descricao?: string;
    tipo?: string;
    status?: string;
};
type Veiculo = { id: number; placa?: string; modelo?: string; };

// colors for charts
const COLORS = ['hsl(214 84% 56%)', 'hsl(212 100% 47%)', 'hsl(142 76% 36%)', 'hsl(38 92% 50%)', 'hsl(0 84% 60%)'];

export default function DriverDetails() {
    const {id} = useParams<{ id?: string }>();
    const driverId = id ? Number(id) : NaN;
    const navigate = useNavigate();
    const {toast} = useToast();

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
                if (dRes && dRes.ok) {
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
                                    const uid = t.userId ?? (t.user && t.user.id);
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
                const vRes = await tryEndpoints[6];

                // fuels: tentar /abastecimentos?userId=driverId, senão /abastecimentos/admin e filtrar
                let fuelsArr: any = [];
                try {
                    const fuelsRes = await tryEndpoints[4];
                    const fjson = await safeJson(fuelsRes);
                    if (Array.isArray(fjson) && fjson.length > 0) fuelsArr = fjson;
                    else {
                        const fAdminRes = await apiFetch(`/abastecimentos/admin`);
                        const fall = await safeJson(fAdminRes);
                        if (Array.isArray(fall)) fuelsArr = fall.filter((f: any) => {
                            const uid = f.userId ?? (f.user && f.user.id);
                            return Number(uid) === driverId;
                        });
                    }
                } catch (e) {
                    console.warn("Erro ao buscar abastecimentos (tentativas múltiplas):", e);
                    fuelsArr = [];
                }

                // manuts: mesma estratégia
                let manArr: any = [];
                try {
                    const manRes = await tryEndpoints[5];
                    const mjson = await safeJson(manRes);
                    if (Array.isArray(mjson) && mjson.length > 0) manArr = mjson;
                    else {
                        const mAdminRes = await apiFetch(`/manutencoes/admin`);
                        const mall = await safeJson(mAdminRes);
                        if (Array.isArray(mall)) manArr = mall.filter((m: any) => {
                            const uid = m.userId ?? (m.user && m.user.id);
                            return Number(uid) === driverId;
                        });
                    }
                } catch (e) {
                    console.warn("Erro ao buscar manutenções (tentativas múltiplas):", e);
                    manArr = [];
                }

                // vehicles
                //eslint-disable-next-line @typescript-eslint/no-explicit-any
                const vArr = (await safeJson(vRes)) as any;

                if (mounted) {
                    setTrips(Array.isArray(tripsArr) ? tripsArr : []);
                    setFuels(Array.isArray(fuelsArr) ? fuelsArr : []);
                    setManuts(Array.isArray(manArr) ? manArr : []);
                    setVehicles(Array.isArray(vArr) ? vArr : []);
                }

                // logs úteis para debug
                console.debug("DriverDetails: trips fetched:", {
                    driverId,
                    tripsCount: Array.isArray(tripsArr) ? tripsArr.length : 0
                });
            } catch (err) {
                console.error("Erro ao carregar dados do motorista:", err);
                toast({title: "Erro", description: "Erro ao carregar dados. Veja o console.", variant: "destructive"});
            } finally {
                if (mounted) setLoading(false);
            }
        };

        load();
        return () => {
            mounted = false;
        };
    }, [driverId, toast]);

    // mapa de veículos
    const vehiclesMap = useMemo(() => {
        const m: Record<number, Veiculo> = {};
        vehicles.forEach(v => {
            if (v && v.id !== undefined) m[v.id] = v;
        });
        return m;
    }, [vehicles]);

    // KPIs (com cálculo real de variação)
    const stats = useMemo(() => {
        // Definir períodos de data
        const hoje = new Date();
        const inicioMesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const inicioMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
        const fimMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0);

        // Função auxiliar para calcular variação percentual
        const calcularVariacao = (valorAtual: number, valorAnterior: number): number => {
            // Retorna Infinity quando não há valor anterior e há valor atual (crescimento a partir de zero)
            if (valorAnterior === 0) {
                return valorAtual > 0 ? Number.POSITIVE_INFINITY : 0;
            }
            return ((valorAtual - valorAnterior) / valorAnterior) * 100;
        };

        // Helper para obter duração em ms
        const getDurationMs = (t: Viagem) => {
            if (t.dataSaida && t.dataChegada) {
                const s = new Date(t.dataSaida).getTime();
                const e = new Date(t.dataChegada).getTime();
                if (!isNaN(s) && !isNaN(e) && e > s) return e - s;
            }
            return 0;
        };

        // Helper para formatar duração
        const formatDur = (ms: number) => {
            if (!ms) return "0h 00min";
            const h = Math.floor(ms / (1000 * 60 * 60));
            const m = Math.round((ms % (1000 * 60 * 60)) / (1000 * 60));
            return `${h}h ${String(m).padStart(2, "0")}min`;
        };

        // Calcular totais para período atual (inicioMesAtual até hoje)
        const triposAtual = trips.filter(t => {
            if (!t.dataSaida) return false;
            const data = new Date(t.dataSaida);
            return data >= inicioMesAtual && data <= hoje;
        });
        const viagensAtualCount = triposAtual.length;

        const kmAtual = triposAtual.reduce((acc, t) => {
            const ki = typeof t.kmInicial === "number" ? t.kmInicial : null;
            const kf = typeof t.kmFinal === "number" ? t.kmFinal : null;
            if (ki !== null && kf !== null && kf >= ki) {
                return acc + (kf - ki);
            }
            return acc;
        }, 0);

        // Tempo viagens (Mês Atual)
        const durationsAtual = triposAtual.map(getDurationMs).filter(d => d > 0);
        const avgAtualMs = durationsAtual.length > 0
            ? durationsAtual.reduce((a, b) => a + b, 0) / durationsAtual.length
            : 0;

        const fuelsAtual = fuels.filter(f => {
            if (!f.data) return false;
            const data = new Date(f.data);
            return data >= inicioMesAtual && data <= hoje;
        });
        // Excluir manutenções agendadas
        const manutsAtual = manuts.filter(m => {
            if (!m.data) return false;
            const status = (m.status ?? "").toString().toUpperCase();
            if (status === "AGENDADA") return false;
            const data = new Date(m.data);
            return data >= inicioMesAtual && data <= hoje;
        });

        const custoAtual =
            fuelsAtual.reduce((acc, f) => acc + (f.custoTotal ? Number(f.custoTotal) : 0), 0) +
            manutsAtual.reduce((acc, m) => acc + (m.custo ? Number(m.custo) : 0), 0);

        // Calcular totais para período anterior (inicioMesAnterior até fimMesAnterior)
        const tripsAnterior = trips.filter(t => {
            if (!t.dataSaida) return false;
            const data = new Date(t.dataSaida);
            return data >= inicioMesAnterior && data <= fimMesAnterior;
        });
        const viagensAnteriorCount = tripsAnterior.length;

        const kmAnterior = tripsAnterior.reduce((acc, t) => {
            const ki = typeof t.kmInicial === "number" ? t.kmInicial : null;
            const kf = typeof t.kmFinal === "number" ? t.kmFinal : null;
            if (ki !== null && kf !== null && kf >= ki) {
                return acc + (kf - ki);
            }
            return acc;
        }, 0);

        // Tempo viagens (Mês Anterior)
        const durationsAnterior = tripsAnterior.map(getDurationMs).filter(d => d > 0);
        const avgAnteriorMs = durationsAnterior.length > 0
            ? durationsAnterior.reduce((a, b) => a + b, 0) / durationsAnterior.length
            : 0;

        const fuelsAnterior = fuels.filter(f => {
            if (!f.data) return false;
            const data = new Date(f.data);
            return data >= inicioMesAnterior && data <= fimMesAnterior;
        });
        const manutsAnterior = manuts.filter(m => {
            if (!m.data) return false;
            const status = (m.status ?? "").toString().toUpperCase();
            if (status === "AGENDADA") return false;
            const data = new Date(m.data);
            return data >= inicioMesAnterior && data <= fimMesAnterior;
        });

        const custoAnterior =
            fuelsAnterior.reduce((acc, f) => acc + (f.custoTotal ? Number(f.custoTotal) : 0), 0) +
            manutsAnterior.reduce((acc, m) => acc + (m.custo ? Number(m.custo) : 0), 0);

        // Calcular variações
        const deltaViagens = calcularVariacao(viagensAtualCount, viagensAnteriorCount);
        const deltaKm = calcularVariacao(kmAtual, kmAnterior);
        const deltaCusto = calcularVariacao(custoAtual, custoAnterior);
        const deltaTempoMedio = calcularVariacao(avgAtualMs, avgAnteriorMs);

        // Totals gerais (todos os dados)
        const totalViagens = trips.length;
        const kmRodados = trips.reduce((acc, t) => {
            const ki = typeof t.kmInicial === "number" ? t.kmInicial : null;
            const kf = typeof t.kmFinal === "number" ? t.kmFinal : null;
            if (ki !== null && kf !== null && kf >= ki) {
                return acc + (kf - ki);
            }
            return acc;
        }, 0);

        // Tempo Total Geral
        const allDurations = trips.map(getDurationMs).filter(d => d > 0);
        const totalDurationMs = allDurations.reduce((a, b) => a + b, 0);

        const manutCost = manuts.reduce((acc, m) => acc + (m.custo ? Number(m.custo) : 0), 0);
        const fuelCost = fuels.reduce((acc, f) => acc + (f.custoTotal ? Number(f.custoTotal) : 0), 0);

        const manutCostEfetivo = manuts
            .filter(m => ((m.status ?? "").toString().toUpperCase() !== "AGENDADA"))
            .reduce((acc, m) => acc + (m.custo ? Number(m.custo) : 0), 0);
        const custoTotal = manutCostEfetivo + fuelCost;

        return {
            totalViagens,
            kmRodados,
            custoTotal,
            tempoTotalGeral: formatDur(totalDurationMs),
            medias: {
                tempoAtual: formatDur(avgAtualMs),
                tempoAnterior: formatDur(avgAnteriorMs)
            },
            deltas: {
                viagens: deltaViagens,
                km: deltaKm,
                custo: deltaCusto,
                tempo: deltaTempoMedio
            },
            periodTotals: {
                viagensAtual: viagensAtualCount,
                kmAtual,
                custoAtual,
            }
        };
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
                const label = format(d, "MMM", {locale: ptBR});
                if (!map[ym]) map[ym] = {mesLabel: label, custo: 0, combustivel: 0, manutencao: 0};
                map[ym][key] += amount;
                map[ym].custo += amount;
            } catch (e) { /* ignore */
            }
        };
        fuels.forEach(f => push(f.data, Number(f.custoTotal ?? 0), "combustivel"));
        manuts.forEach(m => push(m.data ?? undefined, Number(m.custo ?? 0), "manutencao"));
        const arr = Object.entries(map).map(([ym, val]) => ({ym, ...val}));
        arr.sort((a, b) => a.ym.localeCompare(b.ym));
        if (arr.length === 0) {
            //eslint-disable-next-line @typescript-eslint/no-explicit-any
            const res: any[] = [];
            for (let i = 5; i >= 0; i--) {
                const d = new Date();
                d.setMonth(d.getMonth() - i);
                res.push({mes: format(d, "MMM", {locale: ptBR}), custo: 0, combustivel: 0, manutencao: 0});
            }
            return res;
        }
        return arr.slice(-6).map(x => ({
            mes: x.mesLabel,
            custo: x.custo,
            combustivel: x.combustivel,
            manutencao: x.manutencao
        }));
    }, [fuels, manuts]);

    // vehiclesUsed
    const vehiclesUsed = useMemo(() => {
        const count: Record<number, number> = {};
        trips.forEach(t => {
            const vid = t.veiculoId ?? (t.veiculo && t.veiculo.id);
            if (typeof vid === "number") count[vid] = (count[vid] || 0) + 1;
        });
        const arr = Object.entries(count).map(([vid, qtd]) => {
            const v = vehiclesMap[Number(vid)];
            return {
                veiculo: v ? v.modelo ?? `Veículo ${vid}` : `Veículo ${vid}`,
                placa: v ? v.placa ?? "" : "",
                viagens: qtd,
                percentual: 0
            };
        });
        const total = arr.reduce((a, b) => a + b.viagens, 0) || 1;
        arr.forEach(a => a.percentual = +(100 * (a.viagens / total)).toFixed(1));
        arr.sort((a, b) => b.viagens - a.viagens);
        return arr;
    }, [trips, vehiclesMap]);

    const vehicleDistributionData = useMemo(() => vehiclesUsed.map(v => ({
        name: v.veiculo,
        value: v.viagens
    })), [vehiclesUsed]);

    const fuelHistory = useMemo(() => {
        const arr = [...fuels];
        arr.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
        return arr.slice(0, 20);
    }, [fuels]);

    const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);

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
                        <ArrowLeft className="h-4 w-4 mr-2"/>
                        Voltar
                    </Button>
                </div>

                {/* Perfil */}
                <Card className="shadow-card">
                    <CardContent className="pt-6">
                        <div className="flex flex-col md:flex-row gap-6">
                            <div className="flex-shrink-0">
                                <div
                                    className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary">
                                    {driver?.nome ? driver.nome.split(' ').map(n => n[0]).join('') : '—'}
                                </div>
                            </div>
                            <div className="flex-1 space-y-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h2 className="text-2xl font-bold">{driver?.nome ?? '—'}</h2>
                                        <Badge variant="default"
                                               className={driver?.status === "ativo" ? "bg-success text-success-foreground" : ""}>
                                            {driver?.status === "ativo" ? "Ativo" : (driver?.status ?? "—")}
                                        </Badge>
                                        <Badge variant="outline">Categoria {driver?.categoria ?? "—"}</Badge>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                                        <div className="flex items-center text-muted-foreground"><Phone
                                            className="h-4 w-4 mr-2"/>{driver?.telefone ?? '—'}</div>
                                        <div className="flex items-center text-muted-foreground"><Mail
                                            className="h-4 w-4 mr-2"/>{driver?.email ?? '—'}</div>
                                        <div className="flex items-center text-muted-foreground"><MapPin
                                            className="h-4 w-4 mr-2"/>{driver?.endereco ?? '—'}</div>
                                        <div className="flex items-center text-muted-foreground"><Calendar
                                            className="h-4 w-4 mr-2"/>{driver?.dataContratacao ? `Desde ${format(new Date(driver.dataContratacao), "dd/MM/yyyy", {locale: ptBR})}` : '—'}
                                        </div>
                                    </div>
                                </div>

                                <Separator/>

                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                    <div><span className="text-muted-foreground">CPF:</span><p
                                        className="font-mono font-medium">{driver?.cpf ?? '—'}</p></div>
                                    <div><span className="text-muted-foreground">CNH:</span><p
                                        className="font-mono font-medium">{driver?.cnh ?? '—'}</p></div>
                                    <div><span className="text-muted-foreground">Validade CNH:</span><p
                                        className="font-medium">{driver?.validadeCnh ? format(new Date(driver.validadeCnh), "dd/MM/yyyy", {locale: ptBR}) : '—'}</p>
                                    </div>
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
                            <Car className="h-4 w-4 text-muted-foreground"/>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-baseline justify-between">
                                <div className="text-2xl font-bold">{stats.totalViagens}</div>
                                <div className="text-sm text-muted-foreground">Mês atual: <span className="font-medium">{stats.periodTotals?.viagensAtual ?? 0}</span></div>
                            </div>
                            <p className="text-xs flex items-center mt-1">
                                {Number.isFinite(stats.deltas.viagens) ? (
                                    stats.deltas.viagens >= 0 ? (
                                        <>
                                            <TrendingUp className="h-3 w-3 mr-1 text-success"/>
                                            <span className="text-success">+{stats.deltas.viagens.toFixed(1)}%</span>
                                        </>
                                    ) : (
                                        <>
                                            <TrendingDown className="h-3 w-3 mr-1 text-destructive"/>
                                            <span className="text-destructive">{stats.deltas.viagens.toFixed(1)}%</span>
                                        </>
                                    )
                                ) : (
                                    <>
                                        <TrendingUp className="h-3 w-3 mr-1 text-success"/>
                                        <span className="text-success">+∞</span>
                                    </>
                                )}
                                <span className="text-muted-foreground ml-1">% vs mês anterior</span>
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="shadow-card">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">KM Rodados</CardTitle>
                            <MapPin className="h-4 w-4 text-muted-foreground"/>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-baseline justify-between">
                                <div className="text-2xl font-bold">{stats.kmRodados.toLocaleString('pt-BR')}</div>
                                <div className="text-sm text-muted-foreground">Mês atual: <span className="font-medium">{(stats.periodTotals?.kmAtual ?? 0).toLocaleString('pt-BR')}</span></div>
                            </div>
                            <p className="text-xs flex items-center mt-1">
                                {Number.isFinite(stats.deltas.km) ? (
                                    stats.deltas.km >= 0 ? (
                                        <>
                                            <TrendingUp className="h-3 w-3 mr-1 text-success"/>
                                            <span className="text-success">+{stats.deltas.km.toFixed(1)}%</span>
                                        </>
                                    ) : (
                                        <>
                                            <TrendingDown className="h-3 w-3 mr-1 text-destructive"/>
                                            <span className="text-destructive">{stats.deltas.km.toFixed(1)}%</span>
                                        </>
                                    )
                                ) : (
                                    <>
                                        <TrendingUp className="h-3 w-3 mr-1 text-success"/>
                                        <span className="text-success">+∞</span>
                                    </>
                                )}
                                <span className="text-muted-foreground ml-1">% vs mês anterior</span>
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="shadow-card">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Custo Total</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground"/>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-baseline justify-between">
                                <div className="text-2xl font-bold">{formatCurrency(stats.custoTotal)}</div>
                                <div className="text-sm text-muted-foreground">Mês atual: <span className="font-medium">{formatCurrency(stats.periodTotals?.custoAtual ?? 0)}</span></div>
                            </div>
                            <p className="text-xs flex items-center mt-1">
                                {Number.isFinite(stats.deltas.custo) ? (
                                    stats.deltas.custo > 0 ? (
                                        <>
                                            <TrendingUp className="h-3 w-3 mr-1 text-destructive"/>
                                            <span className="text-destructive">+{stats.deltas.custo.toFixed(1)}%</span>
                                        </>
                                    ) : (
                                        <>
                                            <TrendingDown className="h-3 w-3 mr-1 text-success"/>
                                            <span className="text-success">{stats.deltas.custo.toFixed(1)}%</span>
                                        </>
                                    )
                                ) : (
                                    <>
                                        <TrendingUp className="h-3 w-3 mr-1 text-destructive"/>
                                        <span className="text-destructive">+∞</span>
                                    </>
                                )}
                                <span className="text-muted-foreground ml-1">% vs mês anterior</span>
                            </p>
                        </CardContent>
                    </Card>

                </div>

                {/* Performance & Distribution */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* NOVO CARD: Tempo em Viagem (Substituindo Taxa de Conclusão) */}
                    <Card className="shadow-card">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Timer className="h-4 w-4 text-primary" />
                                Tempo em Viagem
                            </CardTitle>
                            <CardDescription>Análise da duração das viagens realizadas</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Total Acumulado */}
                            <div>
                                <div className="text-sm text-muted-foreground mb-1">Tempo Total Acumulado</div>
                                <div className="text-3xl font-bold text-foreground">{stats.tempoTotalGeral}</div>
                            </div>

                            <Separator />

                            {/* Comparativo de Médias Mensais */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                                        <Calendar className="h-3 w-3" /> Média (Mês Atual)
                                    </div>
                                    <div className="text-xl font-bold">{stats.medias.tempoAtual}</div>

                                    <div className="flex items-center text-xs mt-1">
                                        {Number.isFinite(stats.deltas.tempo) ? (
                                            stats.deltas.tempo > 0 ? (
                                                <>
                                                    <TrendingUp className="h-3 w-3 mr-1 text-blue-600" />
                                                    <span className="text-blue-600 font-medium">+{stats.deltas.tempo.toFixed(1)}%</span>
                                                </>
                                            ) : stats.deltas.tempo < 0 ? (
                                                <>
                                                    <TrendingDown className="h-3 w-3 mr-1 text-blue-600" />
                                                    <span className="text-blue-600 font-medium">{stats.deltas.tempo.toFixed(1)}%</span>
                                                </>
                                            ) : (
                                                <span className="text-muted-foreground">0%</span>
                                            )
                                        ) : (
                                            <span className="text-muted-foreground">—</span>
                                        )}
                                        <span className="text-muted-foreground ml-1">vs mês anterior</span>
                                    </div>
                                </div>

                                <div>
                                    <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                                        <Clock className="h-3 w-3" /> Média (Mês Anterior)
                                    </div>
                                    <div className="text-xl font-bold text-muted-foreground">{stats.medias.tempoAnterior}</div>
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
                                        label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {vehicleDistributionData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]}/>
                                        ))}
                                    </Pie>
                                    <Tooltip/>
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
                                <CartesianGrid strokeDasharray="3 3"/>
                                <XAxis dataKey="mes"/>
                                <YAxis/>
                                { /* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                <Tooltip formatter={(value: any) => formatCurrency(Number(value))}/>
                                <Legend/>
                                <Line type="monotone" dataKey="custo" stroke={COLORS[0]} strokeWidth={2}
                                      name="Custo Total"/>
                                <Line type="monotone" dataKey="combustivel" stroke={COLORS[2]} strokeWidth={2}
                                      name="Combustível"/>
                                <Line type="monotone" dataKey="manutencao" stroke={COLORS[3]} strokeWidth={2}
                                      name="Manutenção"/>
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Veículos Mais Usados */}
                {/*<Card className="shadow-card">*/}
                {/*    <CardHeader>*/}
                {/*        <CardTitle>Veículos Mais Utilizados</CardTitle>*/}
                {/*        <CardDescription>Ranking de veículos por número de viagens</CardDescription>*/}
                {/*    </CardHeader>*/}
                {/*    <CardContent>*/}
                {/*        <ResponsiveContainer width="100%" height={300}>*/}
                {/*            <BarChart data={vehiclesUsed}>*/}
                {/*                <CartesianGrid strokeDasharray="3 3"/>*/}
                {/*                <XAxis dataKey="veiculo"/>*/}
                {/*                <YAxis/>*/}
                {/*                <Tooltip/>*/}
                {/*                <Legend/>*/}
                {/*                <Bar dataKey="viagens" fill={COLORS[0]} name="Número de Viagens"/>*/}
                {/*            </BarChart>*/}
                {/*        </ResponsiveContainer>*/}
                {/*    </CardContent>*/}
                {/*</Card>*/}

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
                                                <TableCell
                                                    className="font-medium">{format(new Date(fuel.data), "dd/MM/yyyy", {locale: ptBR})}</TableCell>
                                                <TableCell>{fuel.posto ?? fuel.combustivel ?? "—"}</TableCell>
                                                <TableCell>{fuel.litros} L</TableCell>
                                                <TableCell
                                                    className="font-medium">{formatCurrency(Number(fuel.custoTotal ?? 0))}</TableCell>
                                                <TableCell
                                                    className="font-mono">{fuel.quilometragem.toLocaleString('pt-BR')} km</TableCell>
                                                <TableCell>{consumption !== '-' ? <Badge variant="outline"
                                                                                         className="font-mono">{consumption} km/L</Badge> : '-'}</TableCell>
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
                                            <TableCell><Badge
                                                variant="secondary">{vehicle.percentual}%</Badge></TableCell>
                                            <TableCell><Progress value={vehicle.percentual}
                                                                 className="h-2 w-24"/></TableCell>
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