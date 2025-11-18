// src/pages/VehicleDetails.tsx
import {useEffect, useMemo, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {AdminLayout} from "@/components/layout/AdminLayout";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {Avatar, AvatarFallback} from "@/components/ui/avatar";
import {Separator} from "@/components/ui/separator";
import {
    Activity,
    AlertTriangle,
    ArrowLeft,
    Calendar,
    Car,
    DollarSign,
    Fuel,
    TrendingDown,
    TrendingUp,
    Wrench,
} from "lucide-react";
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
    YAxis,
} from "recharts";
import {apiFetch} from "@/services/api";
import {useToast} from "@/hooks/use-toast";
import {format} from "date-fns";
import {ptBR} from "date-fns/locale/pt-BR";

/* ---------- types ---------- */
type Veiculo = {
    id: number;
    placa?: string;
    modelo?: string;
    ano?: number | null;
    cor?: string | null;
    combustivel?: string | null;
    quilometragem?: number | null;
    seguradora?: string | null;
    apoliceSeguro?: string | null;
    validadeSeguro?: string | null;
    status?: string | null;
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    viagens?: any; // se backend embutir
};

type Viagem = {
    id: number;
    userId?: number | null;
    veiculoId?: number | null;
    dataSaida?: string | null;
    dataChegada?: string | null;
    kmInicial?: number | null;
    kmFinal?: number | null;
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    user?: any;
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    local?: string;
};

type Motorista = { id: number; nome?: string; email?: string };

const COLORS = [
    "hsl(214 84% 56%)",
    "hsl(212 100% 47%)",
    "hsl(142 76% 36%)",
    "hsl(38 92% 50%)",
    "hsl(0 84% 60%)",
];

export default function VehicleDetails() {
    const {id} = useParams<{ id?: string }>();
    const vehicleId = id ? Number(id) : Number.NaN;
    const navigate = useNavigate();
    const {toast} = useToast();

    const [loading, setLoading] = useState(true);
    const [vehicle, setVehicle] = useState<Veiculo | null>(null);
    const [trips, setTrips] = useState<Viagem[]>([]);
    const [fuels, setFuels] = useState<Abastecimento[]>([]);
    const [manuts, setManuts] = useState<Manutencao[]>([]);
    const [drivers, setDrivers] = useState<Motorista[]>([]);

    useEffect(() => {
        if (!Number.isFinite(vehicleId) || vehicleId <= 0) {
            console.warn("VehicleDetails: ID de veículo inválido:", vehicleId);
            setLoading(false);
            return;
        }
        let mounted = true;

        /* helpers para parse seguro */
        const safeJsonSingle = async (res?: Response | null) => {
            if (!res) return null;
            if (!res.ok) return null;
            try {
                return await res.json();
            } catch (e) {
                console.warn("safeJsonSingle parse fail", e);
                return null;
            }
        };

        const safeJsonList = async (res?: Response | null) => {
            if (!res) return [];
            if (!res.ok) return [];
            try {
                const j = await res.json();
                if (Array.isArray(j)) return j;
                //eslint-disable-next-line @typescript-eslint/no-explicit-any
                if (j && Array.isArray((j as any).data)) return (j as any).data;
                if (j && typeof j === "object") {
                    const keys = Object.keys(j);
                    for (const k of keys) {
                        //eslint-disable-next-line @typescript-eslint/no-explicit-any
                        if (Array.isArray((j as any)[k])) return (j as any)[k];
                    }
                }
                console.warn("safeJsonList: formato inesperado", j);
                return [];
            } catch (e) {
                console.warn("safeJsonList parse fail", e);
                return [];
            }
        };

        /* normalizadores */
        //eslint-disable-next-line @typescript-eslint/no-explicit-any
        const normalizeTrip = (t: any): Viagem => {
            const ki = t.kmInicial ?? t.km_inicial ?? null;
            const kf = t.kmFinal ?? t.km_final ?? null;
            const uid = t.userId ?? t.user?.id ?? undefined;
            const vid = t.veiculoId ?? t.veiculo?.id ?? undefined;
            return {
                id: Number(t.id),
                userId: uid !== undefined && uid !== null ? Number(uid) : undefined,
                veiculoId: vid !== undefined && vid !== null ? Number(vid) : undefined,
                dataSaida: t.dataSaida ?? t.data_saida ?? null,
                dataChegada: t.dataChegada ?? t.data_chegada ?? null,
                kmInicial: ki !== undefined && ki !== null ? Number(ki) : null,
                kmFinal: kf !== undefined && kf !== null ? Number(kf) : null,
                user: t.user,
                veiculo: t.veiculo,
            };
        };
        //eslint-disable-next-line @typescript-eslint/no-explicit-any
        const normalizeFuel = (f: any): Abastecimento => {
            return {
                id: Number(f.id),
                veiculoId: Number(f.veiculoId ?? f.veiculo?.id),
                userId: Number(f.userId ?? f.user?.id ?? 0),
                data: f.data,
                quilometragem: Number(f.quilometragem ?? 0),
                litros: Number(f.litros ?? 0),
                valorPorLitro: Number(f.valorPorLitro ?? f.valor_por_litro ?? 0),
                custoTotal: Number(f.custoTotal ?? f.custo_total ?? 0),
                combustivel: f.combustivel,
                posto: f.posto,
            };
        };
        //eslint-disable-next-line @typescript-eslint/no-explicit-any
        const normalizeManut = (m: any): Manutencao => {
            return {
                id: Number(m.id),
                veiculoId: m.veiculoId !== undefined ? Number(m.veiculoId) : undefined,
                userId: m.userId !== undefined && m.userId !== null ? Number(m.userId) : undefined,
                data: m.data ?? null,
                quilometragem: m.quilometragem !== undefined ? Number(m.quilometragem) : undefined,
                custo: m.custo !== undefined && m.custo !== null ? Number(m.custo) : undefined,
                descricao: m.descricao,
                tipo: m.tipo,
                local: m.local,
                status: m.status,
            };
        };

        /* função que tenta obter viagens:
           1) checa se veículo retornou viagens embutidas (vehicle.viagens / trips / _embedded)
           2) tenta /viagens?veiculoId=... (mas server ignora query — pode retornar apenas user trips)
           3) tenta /viagens/admin (se for ADMIN, retornará tudo) e filtra por veiculoId
           4) fallback: /viagens (apenas do usuário logado) e filtra — útil se usuário só for dono das próprias viagens
        */
        //eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tryTripsWithFallback = async (vehFromApi?: any) => {
            // 1) checa viagens embutidas no objeto veículo
            if (vehFromApi) {
                const maybeArrays = [
                    vehFromApi.viagens,
                    vehFromApi.trips,
                    vehFromApi.data,
                    vehFromApi._embedded?.viagens,
                    vehFromApi._embedded?.trips,
                ];
                for (const arr of maybeArrays) {
                    if (Array.isArray(arr) && arr.length > 0) {
                        console.debug("VehicleDetails: usando viagens embutidas em /veiculos/:id");
                        return arr.map(normalizeTrip);
                    }
                }
            }

            // 2) primeira tentativa: /viagens?veiculoId=... (muitos backends ignoram query)
            try {
                const res = await apiFetch(`/viagens?veiculoId=${vehicleId}`);
                const arr = await safeJsonList(res);
                console.debug("VehicleDetails: tentativa /viagens?veiculoId ->", Array.isArray(arr) ? arr.length : typeof arr);

                // Se veio lista e contém viagens com esse veiculo, normaliza e valida
                if (Array.isArray(arr) && arr.length > 0) {
                    const normalized = arr.map(normalizeTrip).filter((t) => Number(t.veiculoId) === vehicleId);
                    if (normalized.length > 0) {
                        console.debug("VehicleDetails: /viagens?veiculoId retornou itens filtrados localmente ->", normalized.length);
                        return normalized;
                    }
                }
            } catch (e) {
                console.warn("VehicleDetails: erro ao chamar /viagens?veiculoId", e);
            }

            // 3) segunda tentativa: /viagens/admin (requer token ADMIN). Se ok, filtra por veiculoId
            try {
                const resAdmin = await apiFetch("/viagens/admin");
                if (resAdmin && resAdmin.ok) {
                    const all = await safeJsonList(resAdmin);
                    const filtered = (all || []).map(normalizeTrip).filter((t) => Number(t.veiculoId) === vehicleId);
                    console.debug("VehicleDetails: /viagens/admin -> total:", (all || []).length, "filtradas:", filtered.length);
                    return filtered;
                } else {
                    // se 403/401: não é admin — continua para fallback
                    console.debug("VehicleDetails: /viagens/admin não autorizado (status)", resAdmin?.status);
                }
            } catch (e) {
                console.warn("VehicleDetails: erro ao chamar /viagens/admin", e);
            }

            // 4) fallback final: /viagens (apenas viagens do usuário logado) -> filtra por veiculoId (vai mostrar só as desse user)
            try {
                const resUser = await apiFetch("/viagens");
                const arr = await safeJsonList(resUser);
                const filtered = (arr || []).map(normalizeTrip).filter((t) => Number(t.veiculoId) === vehicleId);
                console.debug("VehicleDetails: fallback /viagens (user) -> total:", (arr || []).length, "filtradas:", filtered.length);
                return filtered;
            } catch (e) {
                console.warn("VehicleDetails: erro ao chamar fallback /viagens", e);
            }

            return [];
        };

        const load = async () => {
            setLoading(true);
            try {
                const [vRes, driversRes] = await Promise.allSettled([apiFetch(`/veiculos/${vehicleId}`), apiFetch(`/motoristas`)]);
                //eslint-disable-next-line @typescript-eslint/no-explicit-any
                let vehJson: any = null;
                if (vRes.status === "fulfilled") {
                    vehJson = await safeJsonSingle(vRes.value);
                    if (mounted) setVehicle(vehJson);
                } else {
                    console.warn("Falha ao carregar /veiculos/:id", vRes.reason);
                    toast({
                        title: "Aviso",
                        description: "Não foi possível carregar dados básicos do veículo.",
                        variant: "destructive"
                    });
                }

                if (driversRes.status === "fulfilled") {
                    const dArr = await safeJsonList(driversRes.value);
                    if (mounted) setDrivers(dArr);
                } else {
                    console.warn("Falha ao carregar motoristas:", driversRes.reason);
                    if (mounted) setDrivers([]);
                }

                // obter trips com a estratégia acima
                const tripsArr = await tryTripsWithFallback(vehJson);
                if (mounted) setTrips(Array.isArray(tripsArr) ? tripsArr : []);

                // buscar fuels/manuts
                const [fuelsRes, manRes] = await Promise.allSettled([
                    apiFetch(`/abastecimentos?veiculoId=${vehicleId}`),
                    apiFetch(`/manutencoes?veiculoId=${vehicleId}`),
                ]);
                if (fuelsRes.status === "fulfilled") {
                    const fArr = await safeJsonList(fuelsRes.value);
                    if (mounted) setFuels(Array.isArray(fArr) ? fArr.map(normalizeFuel) : []);
                } else {
                    console.warn("Falha ao carregar abastecimentos:", fuelsRes.reason);
                    if (mounted) setFuels([]);
                }
                if (manRes.status === "fulfilled") {
                    const mArr = await safeJsonList(manRes.value);
                    if (mounted) setManuts(Array.isArray(mArr) ? mArr.map(normalizeManut) : []);
                } else {
                    console.warn("Falha ao carregar manutenções:", manRes.reason);
                    if (mounted) setManuts([]);
                }

                console.debug("VehicleDetails loaded:", {
                    vehicleId,
                    tripsCount: (tripsArr || []).length,
                    fuelsCount: fuels.length,
                    manutsCount: manuts.length,
                });
            } catch (err) {
                console.error("Erro ao carregar dados do veículo:", err);
                toast({
                    title: "Erro",
                    description: "Erro ao carregar dados do veículo. Veja o console.",
                    variant: "destructive"
                });
                if (mounted) {
                    setTrips([]);
                    setFuels([]);
                    setManuts([]);
                    setDrivers([]);
                }
            } finally {
                if (mounted) setLoading(false);
            }
        };

        load();
        return () => {
            mounted = false;
        };
    }, [vehicleId, toast]);

    /* mapa de drivers */
    const driversMap = useMemo(() => {
        const m: Record<number, Motorista> = {};
        for (const d of drivers) {
            if (d && typeof d.id === "number") m[d.id] = d;
        }
        return m;
    }, [drivers]);

    /* KPIs */
    const proxima = useMemo(() => {
        if (!Array.isArray(manuts) || manuts.length === 0) return null;

        const list = manuts
            .map((m) => ({...m, __data: m?.data ? new Date(m.data) : null}))
            .filter((m) => m.__data instanceof Date && !Number.isNaN(m.__data.getTime()))
            .sort((a, b) => a.__data.getTime() - b.__data.getTime());

        const now = new Date();
        const futura = list.find((m) => m.__data.getTime() > now.getTime());
        if (futura) return futura;

        const agendada = list.find((m) => (m.status || "").toLowerCase() === "agendada");
        return agendada || null;
    }, [manuts]);

    const stats = useMemo(() => {
        // Definir períodos de data
        const hoje = new Date();
        const inicioMesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const inicioMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
        const fimMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0);

        // Função auxiliar para calcular variação percentual
        const calcularVariacao = (valorAtual: number, valorAnterior: number): number => {
            if (valorAnterior === 0) {
                return valorAtual > 0 ? Number.POSITIVE_INFINITY : 0;
            }
            return ((valorAtual - valorAnterior) / valorAnterior) * 100;
        };

        // Calcular totais para período atual (inicioMesAtual até hoje)
        const tripsAtual = (trips || []).filter(t => {
            if (!t.dataSaida) return false;
            const data = new Date(t.dataSaida);
            if (data.getTime() > hoje.getTime()) return false;
            return data >= inicioMesAtual && data <= hoje;
        });
        const viagensAtualCount = tripsAtual.length;

        const kmAtual = tripsAtual.reduce((acc, t) => {
            const ki = typeof t.kmInicial === "number" ? t.kmInicial : null;
            const kf = typeof t.kmFinal === "number" ? t.kmFinal : null;
            if (ki !== null && kf !== null && kf >= ki) return acc + (kf - ki);
            return acc;
        }, 0);

        const fuelsAtual = (fuels || []).filter(f => {
            if (!f.data) return false;
            const data = new Date(f.data);
            if (data.getTime() > hoje.getTime()) return false;
            return data >= inicioMesAtual && data <= hoje;
        });

        // Excluir manutenções agendadas/futuras do período atual
        const manutsAtual = (manuts || []).filter(m => {
            if (!m.data) return false;
            const status = (m.status ?? "").toString().toUpperCase();
            if (status === "AGENDADA") return false;
            const data = new Date(m.data);
            if (data.getTime() > hoje.getTime()) return false;
            return data >= inicioMesAtual && data <= hoje;
        });

        const custoAtual =
            fuelsAtual.reduce((acc, f) => acc + (f.custoTotal ? Number(f.custoTotal) : 0), 0) +
            manutsAtual.reduce((acc, m) => acc + (m.custo ? Number(m.custo) : 0), 0);

        // Calcular totais para período anterior (inicioMesAnterior até fimMesAnterior)
        const tripsAnterior = (trips || []).filter(t => {
            if (!t.dataSaida) return false;
            const data = new Date(t.dataSaida);
            return data >= inicioMesAnterior && data <= fimMesAnterior;
        });
        const viagensAnteriorCount = tripsAnterior.length;

        const kmAnterior = tripsAnterior.reduce((acc, t) => {
            const ki = typeof t.kmInicial === "number" ? t.kmInicial : null;
            const kf = typeof t.kmFinal === "number" ? t.kmFinal : null;
            if (ki !== null && kf !== null && kf >= ki) return acc + (kf - ki);
            return acc;
        }, 0);

        const fuelsAnterior = (fuels || []).filter(f => {
            if (!f.data) return false;
            const data = new Date(f.data);
            return data >= inicioMesAnterior && data <= fimMesAnterior;
        });

        const manutsAnterior = (manuts || []).filter(m => {
            if (!m.data) return false;
            const status = (m.status ?? "").toString().toUpperCase();
            if (status === "AGENDADA") return false;
            const data = new Date(m.data);
            return data >= inicioMesAnterior && data <= fimMesAnterior;
        });

        const custoAnterior =
            fuelsAnterior.reduce((acc, f) => acc + (f.custoTotal ? Number(f.custoTotal) : 0), 0) +
            manutsAnterior.reduce((acc, m) => acc + (m.custo ? Number(m.custo) : 0), 0);

        // Variações
        const deltaViagens = calcularVariacao(viagensAtualCount, viagensAnteriorCount);
        const deltaKm = calcularVariacao(kmAtual, kmAnterior);
        const deltaCusto = calcularVariacao(custoAtual, custoAnterior);

        // Calcular consumo médio para períodos atual e anterior
        const calcularConsumoMedio = (fuelsList: Abastecimento[]) => {
            if (fuelsList.length < 2) return 0;
            const validFuels = [...fuelsList]
                .filter((f) => f && f.quilometragem !== undefined && f.litros !== undefined)
                //eslint-disable-next-line @typescript-eslint/no-explicit-any
                .map((f) => ({quil: Number((f as any).quilometragem), litros: Number((f as any).litros)}))
                .filter((f) => !Number.isNaN(f.quil) && !Number.isNaN(f.litros))
                .sort((a, b) => a.quil - b.quil);

            if (validFuels.length < 2) return 0;

            let totalKm = 0;
            let totalLitros = 0;
            for (let i = 1; i < validFuels.length; i++) {
                const older = validFuels[i - 1];
                const newer = validFuels[i];
                const kmInterval = newer.quil - older.quil;
                const litros = newer.litros;
                if (kmInterval > 0 && litros > 0) {
                    totalKm += kmInterval;
                    totalLitros += litros;
                }
            }
            return totalLitros > 0 ? +(totalKm / totalLitros).toFixed(2) : 0;
        };

        const consumoAtual = calcularConsumoMedio(fuelsAtual);
        const consumoAnterior = calcularConsumoMedio(fuelsAnterior);
        const deltaConsumo = calcularVariacao(consumoAtual, consumoAnterior);

        // Totais gerais (todos os dados)
        const totalViagens = (trips || []).length;
        const kmRodados = (trips || []).reduce((acc, t) => {
            const ki = typeof t.kmInicial === "number" ? t.kmInicial : null;
            const kf = typeof t.kmFinal === "number" ? t.kmFinal : null;
            if (ki !== null && kf !== null && kf >= ki) return acc + (kf - ki);
            return acc;
        }, 0);

        // Excluir manutenções agendadas do custo total global
        const fuelCost = (fuels || []).reduce((acc, f) => acc + (f.custoTotal ? Number(f.custoTotal) : 0), 0);
        const manutCostEfetivo = (manuts || []).filter(m => ((m.status ?? "").toString().toUpperCase() !== "AGENDADA"))
            .reduce((acc, m) => acc + (m.custo ? Number(m.custo) : 0), 0);
        const custoTotal = fuelCost + manutCostEfetivo;

        // Média de consumo estimado (global - todos os dados)
        let mediaCombustivel = 0;
        try {
            mediaCombustivel = calcularConsumoMedio(fuels || []);
        } catch (e) {
            mediaCombustivel = 0;
        }

        return {
            totalViagens,
            kmRodados,
            custoTotal,
            mediaCombustivel,
            deltas: {
                viagens: deltaViagens,
                km: deltaKm,
                custo: deltaCusto,
                consumo: deltaConsumo
            },
            periodTotals: {
                viagensAtual: viagensAtualCount,
                viagensAnterior: viagensAnteriorCount,
                kmAtual,
                kmAnterior,
                custoAtual,
                custoAnterior,
                consumoAtual,
                consumoAnterior
            }
        };
    }, [trips, fuels, manuts]);

    const costOverTime = useMemo(() => {
        const map: Record<string, {
            ym: string;
            mes: string;
            combustivel: number;
            manutencao: number;
            custo: number
        }> = {};
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const push = (iso?: string | null, amount = 0, key: "combustivel" | "manutencao") => {
            if (!iso) return;
            try {
                const d = new Date(iso);
                if (Number.isNaN(d.getTime())) return;
                const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                const label = format(d, "MMM", {locale: ptBR});
                if (!map[ym]) map[ym] = {ym, mes: label, combustivel: 0, manutencao: 0, custo: 0};
                map[ym][key] += amount;
                map[ym].custo += amount;
            } catch (e) { /* ignore */
            }
        };
        for (const f of (fuels || [])) push(f.data, Number(f.custoTotal ?? 0), "combustivel");
        for (const m of (manuts || [])) push(m.data ?? undefined, Number(m.custo ?? 0), "manutencao");
        const arr = Object.values(map).sort((a, b) => a.ym.localeCompare(b.ym));
        if (arr.length === 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const res: any[] = [];
            for (let i = 5; i >= 0; i--) {
                const d = new Date();
                d.setMonth(d.getMonth() - i);
                res.push({mes: format(d, "MMM", {locale: ptBR}), custo: 0, combustivel: 0, manutencao: 0});
            }
            return res;
        }
        return arr.slice(-6).map((x) => ({
            mes: x.mes,
            custo: x.custo,
            combustivel: x.combustivel,
            manutencao: x.manutencao
        }));
    }, [fuels, manuts]);

    const driversUsage = useMemo(() => {
        const count: Record<number, number> = {};
        for (const t of (trips || [])) {
            const uid = t.userId ?? t.user?.id;
            const uidNum = uid !== undefined && uid !== null ? Number(uid) : Number.NaN;
            if (!Number.isNaN(uidNum)) count[uidNum] = (count[uidNum] || 0) + 1;
        }
        const arr = Object.entries(count)
            .map(([uid, qtd]) => {
                const idn = Number(uid);
                const d = driversMap[idn];
                return {name: d?.nome ?? d?.email ?? `Motorista ${uid}`, value: qtd, trips: qtd};
            })
            .sort((a, b) => b.value - a.value);
        return arr.slice(0, 8);
    }, [trips, driversMap]);

    const fuelHistory = useMemo(() => {
        const arr = [...(fuels || [])];
        arr.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
        return arr.slice(0, 20);
    }, [fuels]);

    const maintenanceHistory = useMemo(() => {
        const arr = [...(manuts || [])];
        arr.sort((a, b) => {
            const da = a.data ? new Date(a.data).getTime() : 0;
            const db = b.data ? new Date(b.data).getTime() : 0;
            return db - da;
        });
        return arr.slice(0, 20);
    }, [manuts]);

    if (loading) {
        return (
            <AdminLayout title="Carregando Veículo...">
                <div className="p-6">Carregando dados...</div>
            </AdminLayout>
        );
    }

    if (!id || !Number.isFinite(vehicleId) || vehicleId <= 0) {
        return (
            <AdminLayout title="Veículo">
                <div className="mx-auto max-w-4xl p-6">ID do Veículo não especificado ou inválido.</div>
            </AdminLayout>
        );
    }

    if (!vehicle) {
        return (
            <AdminLayout title="Erro">
                <div className="space-y-6 p-6">
                    <Button variant="ghost" onClick={() => navigate("/veiculos")}>
                        <ArrowLeft className="mr-2 h-4 w-4"/>
                        Voltar para Veículos
                    </Button>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center text-destructive">
                                <AlertTriangle className="mr-2 h-5 w-5"/>
                                Veículo não encontrado
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p>O veículo com ID {id} não foi encontrado ou não pôde ser carregado.</p>
                        </CardContent>
                    </Card>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title={`Veículo: ${vehicle.placa ?? id}`}>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <Button variant="ghost" onClick={() => navigate("/veiculos")}>
                        <ArrowLeft className="mr-2 h-4 w-4"/>
                        Voltar para Veículos
                    </Button>
                </div>

                {/* Profile */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-start space-x-6">
                            <Avatar className="h-24 w-24">
                                <AvatarFallback className="text-2xl">
                                    <Car className="h-12 w-12"/>
                                </AvatarFallback>
                            </Avatar>

                            <div className="flex-1 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-3xl font-bold">{vehicle.modelo ?? "—"}</h2>
                                        <p className="text-lg text-muted-foreground">{vehicle.placa ?? "—"}</p>
                                    </div>
                                    <div>
                                        <Badge
                                            className={
                                                vehicle.status === "manutencao"
                                                    ? "bg-yellow-500"
                                                    : vehicle.status === "inativo"
                                                        ? "bg-red-500"
                                                        : vehicle.status === "disponivel"
                                                            ? "bg-green-500"
                                                            : "bg-blue-500"
                                            }
                                        >
                                            {vehicle.status ? vehicle.status.charAt(0).toUpperCase() + vehicle.status.slice(1).replace("_", " ") : "—"}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                        <p className="text-muted-foreground">Ano</p>
                                        <p className="font-medium">{vehicle.ano ?? "—"}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Cor</p>
                                        <p className="font-medium">{vehicle.cor ?? "—"}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Combustível</p>
                                        <p className="font-medium">{vehicle.combustivel ?? "—"}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Km Atual</p>
                                        <p className="font-medium">{vehicle.quilometragem ? vehicle.quilometragem.toLocaleString("pt-BR") : "—"}</p>
                                    </div>
                                </div>

                                <Separator/>

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-muted-foreground">Seguro</p>
                                        <p className="font-medium">{vehicle.seguradora ?? "—"}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Válido
                                            até: {vehicle.validadeSeguro ? format(new Date(vehicle.validadeSeguro), "dd/MM/yyyy", {locale: ptBR}) : "—"}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Manutenção</p>
                                        <p className="font-medium">Próxima: {proxima ? format(new Date(proxima.data), "dd/MM/yyyy", {locale: ptBR}) : "—"}</p>
                                        <p className="text-xs text-muted-foreground">Local: {proxima?.local ?? "—"}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* KPIs */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total de Viagens</CardTitle>
                            <Activity className="h-4 w-4 text-muted-foreground"/>
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

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total de Km Rodados</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground"/>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-baseline justify-between">
                                <div className="text-2xl font-bold">{stats.kmRodados.toLocaleString("pt-BR")}</div>
                                <div className="text-sm text-muted-foreground">Mês atual: <span className="font-medium">{(stats.periodTotals?.kmAtual ?? 0).toLocaleString("pt-BR")}</span></div>
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

                    <Card>
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

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total de Consumo Médio (estimado)</CardTitle>
                            <Fuel className="h-4 w-4 text-muted-foreground"/>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-baseline justify-between">
                                <div className="text-2xl font-bold">{stats.mediaCombustivel || "—"}</div>
                                <div className="text-sm text-muted-foreground">Mês atual: <span className="font-medium">{stats.periodTotals?.consumoAtual ?? "—"}</span></div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {Number.isFinite(stats.deltas.consumo) ? (
                                    stats.deltas.consumo < 0 ? (
                                        <>
                                            <TrendingDown className="h-3 w-3 mr-1 text-success inline"/>
                                            <span className="text-success">{stats.deltas.consumo.toFixed(1)}%</span>
                                        </>
                                    ) : (
                                        <>
                                            <TrendingUp className="h-3 w-3 mr-1 text-destructive inline"/>
                                            <span className="text-destructive">+{stats.deltas.consumo.toFixed(1)}%</span>
                                        </>
                                    )
                                ) : (
                                    <>
                                        <TrendingUp className="h-3 w-3 mr-1 text-destructive inline"/>
                                        <span className="text-destructive">+∞</span>
                                    </>
                                )}
                                <span className="ml-1">vs mês anterior</span>
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* charts, históricos etc... */}
                <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Motoristas que Mais Usaram</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {driversUsage.length > 0 ? (
                                <>
                                    <ResponsiveContainer width="100%" height={260}>
                                        <PieChart>
                                            <Pie data={driversUsage} dataKey="value" cx="50%" cy="50%" outerRadius={80}
                                                 labelLine={false}
                                                 label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                                                {driversUsage.map((entry, idx) => (
                                                    <Cell key={idx} fill={COLORS[idx % COLORS.length]}/>
                                                ))}
                                            </Pie>
                                            <Tooltip/>
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="mt-4 space-y-2">
                                        {driversUsage.map((d, i) => (
                                            <div key={i} className="flex items-center justify-between text-sm">
                                                <div className="flex items-center">
                                                    <div className="w-3 h-3 rounded-full mr-2"
                                                         style={{backgroundColor: COLORS[i % COLORS.length]}}/>
                                                    <span>{d.name}</span>
                                                </div>
                                                <span className="text-muted-foreground">{d.trips} viagens</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div
                                    className="flex items-center justify-center h-[260px] text-muted-foreground">Nenhuma
                                    viagem registrada para este veículo.</div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Tipos de Manutenção</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {manuts.length > 0 ? (
                                <ResponsiveContainer width="100%" height={260}>
                                    <BarChart
                                        data={(() => {
                                            const counts: Record<string, number> = {};
                                            for (const m of manuts) {
                                                const t = m.tipo ?? "Outros";
                                                counts[t] = (counts[t] || 0) + 1;
                                            }
                                            return Object.entries(counts).map(([type, count]) => ({type, count}));
                                        })()}
                                    >
                                        <CartesianGrid strokeDasharray="3 3"/>
                                        <XAxis dataKey="type"/>
                                        <YAxis/>
                                        <Tooltip/>
                                        <Bar dataKey="count" fill={COLORS[0]} name="Quantidade"/>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div
                                    className="flex items-center justify-center h-[260px] text-muted-foreground">Nenhuma
                                    manutenção registrada.</div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Evolução de Custos (Últimos meses)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={costOverTime}>
                                <CartesianGrid strokeDasharray="3 3"/>
                                <XAxis dataKey="mes"/>
                                <YAxis/>
                                { /* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                <Tooltip formatter={(val: any) => formatCurrency(Number(val))}/>
                                <Legend/>
                                <Line type="monotone" dataKey="custo" stroke={COLORS[0]} name="Custo Total"
                                      strokeWidth={2}/>
                                <Line type="monotone" dataKey="combustivel" stroke={COLORS[2]} name="Combustível"
                                      strokeWidth={2}/>
                                <Line type="monotone" dataKey="manutencao" stroke={COLORS[3]} name="Manutenção"
                                      strokeWidth={2}/>
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* maintenance & fuel history */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Wrench className="mr-2 h-5 w-5"/> Histórico de Manutenções
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {maintenanceHistory.length === 0 &&
                                <div className="text-muted-foreground text-center p-4">Nenhuma manutenção
                                    registrada</div>}
                            {maintenanceHistory.map((m) => (
                                <div key={m.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                                    <div className="flex-shrink-0">
                                        <Wrench className="h-5 w-5 text-muted-foreground"/>
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <p className="font-medium">{m.descricao ?? m.tipo ?? "Manutenção"}</p>
                                            <Badge>{m.tipo ?? "—"}</Badge>
                                        </div>
                                        <div
                                            className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-muted-foreground">
                                            <div className="flex items-center">
                                                <Calendar className="mr-1 h-3 w-3"/>
                                                {m.data ? format(new Date(m.data), "dd/MM/yyyy", {locale: ptBR}) : "—"}
                                            </div>
                                            <div className="flex items-center">
                                                <Activity className="mr-1 h-3 w-3"/>
                                                {m.quilometragem ? m.quilometragem.toLocaleString("pt-BR") : "—"} km
                                            </div>
                                            <div className="flex items-center">
                                                <DollarSign className="mr-1 h-3 w-3"/>
                                                {m.custo ? formatCurrency(Number(m.custo)) : "—"}
                                            </div>
                                            <div>{m.status ?? "—"}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Fuel className="mr-2 h-5 w-5"/> Histórico de Abastecimento
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {fuelHistory.length === 0 &&
                                <div className="text-muted-foreground text-center p-4">Nenhum abastecimento
                                    registrado</div>}
                            {fuelHistory.map((f) => (
                                <div key={f.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                                    <div className="flex-shrink-0">
                                        <Fuel className="h-5 w-5 text-muted-foreground"/>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="font-medium">{f.posto ?? f.combustivel ?? "Abastecimento"}</p>
                                            <p className="text-lg font-bold">{formatCurrency(Number(f.custoTotal ?? 0))}</p>
                                        </div>
                                        <div
                                            className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-muted-foreground">
                                            <div className="flex items-center">
                                                <Calendar className="mr-1 h-3 w-3"/>
                                                {f.data ? format(new Date(f.data), "dd/MM/yyyy", {locale: ptBR}) : "—"}
                                            </div>
                                            <div>
                                                <Fuel className="inline mr-1 h-3 w-3"/>
                                                {Number(f.litros).toFixed(2)} L
                                            </div>
                                            <div>R$ {Number(f.valorPorLitro).toFixed(2) ?? "—"}/L</div>
                                            <div className="flex items-center">
                                                <Activity className="inline mr-1 h-3 w-3"/>
                                                {f.quilometragem?.toLocaleString("pt-BR") ?? "—"} km
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}

/* helper currency */
function formatCurrency(v: number) {
    if (typeof v !== "number") return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", {style: "currency", currency: "BRL"}).format(v);
}
