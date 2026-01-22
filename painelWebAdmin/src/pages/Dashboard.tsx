"use client";

import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {AlertTriangle, Clock, MapPin, HelpCircle, Wrench, Truck, Users, CalendarDays, FileText, Shield} from "lucide-react";
import {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import {apiFetch} from "@/services/api";
import {AdminLayout} from "@/components/layout/AdminLayout";

// --- NOVOS IMPORTS ---
import {useQuery} from "@tanstack/react-query";
import {MapContainer, Marker, Popup, TileLayer} from 'react-leaflet';
// Lembre-se de importar 'leaflet/dist/leaflet.css' no seu main.tsx!
// --- FIM DOS NOVOS IMPORTS ---


interface Viagem {
    id: number;
    userId: number;
    veiculoId: number;
    dataSaida?: string | null;
    dataChegada?: string | null;
    finalidade?: string | null;
    kmFinal?: number | null;
}

interface Manutencao {
    id: number;
    veiculoId: number;
    userId?: number | null;
    data: string;
    quilometragem: number;
    tipo: "PREVENTIVA" | "CORRETIVA";
    descricao?: string;
    custo?: number | null;
    local?: string | null;
    status: "AGENDADA" | "EM_ANDAMENTO" | "CONCLUIDA" | "CANCELADA";
}

interface Alerta {
    id: number;
    veiculoId: number;
    tipo: string;
    mensagem: string;
    dataCriacao: string;
    lido: boolean;
}

// --- NOVA INTERFACE ---
// Interface para os dados do motorista com localização
interface DriverLocation {
    id: number;
    nome: string;
    latitude: number | null;
    longitude: number | null;
    lastLocationUpdate: string | null;
}

// --- INTERFACES PARA VENCIMENTOS ---
interface CnhVencendo {
    id: number;
    nome: string;
    validadeCnh: string;
}

interface SeguroVencendo {
    id: number;
    placa: string;
    modelo: string;
    validadeSeguro: string;
}
// --- FIM DA NOVA INTERFACE ---

export default function Dashboard() {
    const navigate = useNavigate();

    const [viagens, setViagens] = useState<Viagem[]>([]);
    const [vehiclesMap, setVehiclesMap] = useState<Record<number, string>>({});
    const [driversMap, setDriversMap] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState<boolean>(true);
    const [alertas, setAlertas] = useState<Alerta[]>([]);

    const [countVehiclesActive, setCountVehiclesActive] = useState<number>(0);
    const [countDrivers, setCountDrivers] = useState<number>(0);

    // próximas manutenções agendadas
    const [manutencoesUpcoming, setManutencoesUpcoming] = useState<Manutencao[]>([]);
    const [loadingManutencoes, setLoadingManutencoes] = useState<boolean>(true);

    // --- ESTADOS PARA VENCIMENTOS ---
    const [cnhExpiring, setCnhExpiring] = useState<CnhVencendo[]>([]);
    const [insuranceExpiring, setInsuranceExpiring] = useState<SeguroVencendo[]>([]);
    const [loadingVencimentos, setLoadingVencimentos] = useState<boolean>(true);


    // --- NOVO HOOK useQuery para o MAPA ---
    // Busca os motoristas e suas localizações
    const {data: motoristasComLocalizacao, isLoading: isLoadingMotoristasLocalizacao} = useQuery<DriverLocation[]>({
        queryKey: ['motoristasLocalizacao'],
        queryFn: async () => {
            const res = await apiFetch("/motoristas");
            if (!res.ok) {
                console.error("Falha ao buscar localização dos motoristas");
                throw new Error("Erro ao buscar motoristas para o mapa");
            }
            const data = await res.json();
            return Array.isArray(data) ? data : [];
        },
        refetchInterval: 10000,
        staleTime: 5000,
    });

    // --- LÓGICA DE FILTRO ATUALIZADA ---
    const LOCATION_TIMEOUT_MS = 60 * 1000;
    const now = Date.now();

    const motoristasNoMapa = motoristasComLocalizacao?.filter(
        m => {
            if (m.latitude == null || m.longitude == null) return false;
            if (!m.lastLocationUpdate) return false;

            try {
                const updateTime = new Date(m.lastLocationUpdate).getTime();
                const age = now - updateTime;
                return age < LOCATION_TIMEOUT_MS;
            } catch (error) {
                console.warn(`Data de localização inválida para motorista ${m.id}`);
                return false;
            }
        }
    ) ?? [];
    // --- FIM DA LÓGICA DE FILTRO ---

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            try {
                const resTrips = await apiFetch("/viagens/admin");
                const tripsData: Viagem[] = resTrips.ok ? await resTrips.json() : [];

                const resAlerts = await apiFetch("/alertas/admin");
                const alertsData: Alerta[] = resAlerts.ok ? await resAlerts.json() : [];

                const [resVeic, resMotor] = await Promise.allSettled([apiFetch("/veiculos"), apiFetch("/motoristas")]);

                const vMap: Record<number, string> = {};
                //eslint-disable-next-line @typescript-eslint/no-explicit-any
                let vehiclesList: any[] = [];
                if (resVeic.status === "fulfilled" && resVeic.value.ok) {
                    try {
                        const veics = await resVeic.value.json();
                        vehiclesList = Array.isArray(veics) ? veics : [];
                        //eslint-disable-next-line @typescript-eslint/no-explicit-any
                        vehiclesList.forEach((v: any) => {
                            if (v && v.id !== undefined) vMap[Number(v.id)] = v.placa ?? v.modelo ?? `Veículo ${v.id}`;
                        });
                    } catch (e) {
                        console.warn("Erro ao parsear /veiculos", e);
                    }
                } else {
                    console.warn("Falha fetch /veiculos", resVeic);
                }

                const dMap: Record<number, string> = {};
                //eslint-disable-next-line @typescript-eslint/no-explicit-any
                let driversList: any[] = [];
                if (resMotor.status === "fulfilled" && resMotor.value.ok) {
                    try {
                        const motors = await resMotor.value.json();
                        driversList = Array.isArray(motors) ? motors : [];
                        //eslint-disable-next-line @typescript-eslint/no-explicit-any
                        driversList.forEach((m: any) => {
                            if (m && m.id !== undefined) dMap[Number(m.id)] = m.nome ?? m.email ?? `Motorista ${m.id}`;
                        });
                    } catch (e) {
                        console.warn("Erro ao parsear /motoristas", e);
                    }
                } else {
                    console.warn("Falha fetch /motoristas", resMotor);
                }

                setVehiclesMap(vMap);
                setDriversMap(dMap);

                const sortedTrips = Array.isArray(tripsData)
                    ? tripsData.slice().sort((a, b) => {
                        const da = a.dataSaida ? new Date(a.dataSaida).getTime() : 0;
                        const db = b.dataSaida ? new Date(b.dataSaida).getTime() : 0;
                        return db - da;
                    }).slice(0, 5)
                    : [];
                setViagens(sortedTrips);

                const sortedAlerts = Array.isArray(alertsData)
                    ? alertsData.slice().sort((a, b) => {
                        const da = a.dataCriacao ? new Date(a.dataCriacao).getTime() : 0;
                        const db = b.dataCriacao ? new Date(b.dataCriacao).getTime() : 0;
                        return db - da;
                    })
                    : [];
                setAlertas(sortedAlerts);

                //eslint-disable-next-line @typescript-eslint/no-explicit-any
                setCountVehiclesActive(vehiclesList.filter((v: any) => (v.status ?? "").toString() === "disponivel").length);
                setCountDrivers(driversList.length);
            } catch (error) {
                console.error("Erro ao carregar dados do dashboard:", error);
            } finally {
                setLoading(false);
            }
        };

        const fetchManutencoes = async () => {
            setLoadingManutencoes(true);
            try {
                const res = await apiFetch("/manutencoes");
                if (!res.ok) {
                    console.warn("manutencoes fetch falhou:", await res.text().catch(() => "no body"));
                    setManutencoesUpcoming([]);
                    return;
                }
                const all: Manutencao[] = await res.json();
                if (!Array.isArray(all)) {
                    setManutencoesUpcoming([]);
                    return;
                }
                const now = Date.now();
                const upcoming = all
                    .filter(m => m && m.status === "AGENDADA")
                    .filter(m => {
                        const dt = m.data ? new Date(m.data).getTime() : 0;
                        return dt >= now;
                    })
                    .sort((a, b) => {
                        const da = a.data ? new Date(a.data).getTime() : 0;
                        const db = b.data ? new Date(b.data).getTime() : 0;
                        return da - db;
                    })
                    .slice(0, 5);
                setManutencoesUpcoming(upcoming);
            } catch (error) {
                console.error("Erro ao buscar manutenções:", error);
                setManutencoesUpcoming([]);
            } finally {
                setLoadingManutencoes(false);
            }
        };

        // --- FETCH DE VENCIMENTOS (CNH e SEGURO) ---
        const fetchVencimentos = async () => {
            setLoadingVencimentos(true);
            try {
                // Chama as rotas específicas em paralelo
                const [resCnh, resSeguro] = await Promise.all([
                    apiFetch("/motoristas/cnh-vencendo"),
                    apiFetch("/veiculos/seguro-vencendo")
                ]);

                if (resCnh.ok) {
                    const dataCnh = await resCnh.json();
                    setCnhExpiring(Array.isArray(dataCnh) ? dataCnh : []);
                }

                if (resSeguro.ok) {
                    const dataSeguro = await resSeguro.json();
                    setInsuranceExpiring(Array.isArray(dataSeguro) ? dataSeguro : []);
                }

            } catch (error) {
                console.error("Erro ao buscar vencimentos:", error);
            } finally {
                setLoadingVencimentos(false);
            }
        };

        fetchAll();
        fetchManutencoes();
        fetchVencimentos(); // <--- Inicia a busca
    }, []);

    const fleetStats = [
        {
            title: "Veículos Ativos",
            value: String(countVehiclesActive),
            icon: Truck,
            bgColorClass: "bg-fleet-success/10",
            textColorClass: "text-fleet-success"
        },
        {
            title: "Motoristas",
            value: String(countDrivers),
            icon: Users,
            bgColorClass: "bg-fleet-primary/10",
            textColorClass: "text-fleet-primary"
        },
        {
            title: "Viagens Recentes",
            value: String(viagens.length),
            icon: MapPin,
            bgColorClass: "bg-fleet-warning/10",
            textColorClass: "text-fleet-warning"
        },
        {
            title: "Alertas",
            value: String(alertas.length),
            icon: AlertTriangle,
            bgColorClass: "bg-fleet-danger/10",
            textColorClass: "text-fleet-danger"
        }
    ];

    // Helper para data vencida
    const isExpired = (dateString: string) => {
        return new Date(dateString).getTime() < Date.now();
    };

    return (
        <AdminLayout title="Dashboard">
            <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {fleetStats.map((stat, index) => (
                        <Card key={index} className="shadow-card">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">
                                            {stat.title}
                                        </p>
                                        <p className="text-2xl font-bold">{stat.value}</p>
                                    </div>
                                    <div
                                        className={`w-12 h-12 rounded-lg flex items-center justify-center ${stat.bgColorClass}`}>
                                        <stat.icon className={`h-6 w-6 ${stat.textColorClass}`} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Últimas Viagens */}
                <Card className="shadow-card">
                    <CardHeader>
                        <CardTitle>Últimas Viagens</CardTitle>
                        <CardDescription>Visão geral das últimas viagens registradas (limitado a 5)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-foreground uppercase bg-muted/50">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Motorista</th>
                                    <th scope="col" className="px-6 py-3">Veículo (placa)</th>
                                    <th scope="col" className="px-6 py-3">Saída</th>
                                    <th scope="col" className="px-6 py-3">Chegada</th>
                                    <th scope="col" className="px-6 py-3">Finalidade</th>
                                    <th scope="col" className="px-6 py-3">KM Final</th>
                                </tr>
                                </thead>
                                <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={6}
                                            className="text-center py-6 text-muted-foreground">Carregando...
                                        </td>
                                    </tr>
                                ) : viagens.length > 0 ? (
                                    viagens.map((item) => {
                                        const driver = (item.userId && driversMap[item.userId]) || "—";
                                        const plate = (item.veiculoId && vehiclesMap[item.veiculoId]) || "—";
                                        return (
                                            <tr key={item.id} className="border-b bg-card hover:bg-muted/30">
                                                <td className="px-6 py-4 font-medium">{driver}</td>
                                                <td className="px-6 py-4">{plate}</td>
                                                <td className="px-6 py-4">{item.dataSaida ? new Date(item.dataSaida).toLocaleString("pt-BR") : "—"}</td>
                                                <td className="px-6 py-4">{item.dataChegada ? new Date(item.dataChegada).toLocaleString("pt-BR") : "—"}</td>
                                                <td className="px-6 py-4">{item.finalidade ?? "—"}</td>
                                                <td className="px-6 py-4">{item.kmFinal ?? "—"}</td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr className="bg-card">
                                        <td colSpan={6} className="text-center py-4 text-muted-foreground">Nenhuma
                                            viagem encontrada.
                                        </td>
                                    </tr>
                                )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* --- CARD SUBSTITUÍDO: PRÓXIMOS VENCIMENTOS (CNH / SEGURO) --- */}
                    <Card className="shadow-card h-full">
                        <CardHeader>
                            <CardTitle>Próximos Vencimentos</CardTitle>
                            <CardDescription>CNH e Seguros vencendo em 30 dias</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {loadingVencimentos ? (
                                <div className="text-center py-6 text-muted-foreground">Verificando documentos...</div>
                            ) : (cnhExpiring.length === 0 && insuranceExpiring.length === 0) ? (
                                <div className="text-center py-6 text-muted-foreground flex flex-col items-center">
                                    <CalendarDays className="h-10 w-10 mb-2 opacity-20" />
                                    <p>Nenhum vencimento próximo.</p>
                                </div>
                            ) : (
                                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                                    {/* Lista de CNHs */}
                                    {cnhExpiring.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">CNH Motoristas</p>
                                            {cnhExpiring.map((cnh) => (
                                                <div key={`cnh-${cnh.id}`} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-muted">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                                            <FileText className="h-4 w-4" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium">{cnh.nome}</p>
                                                            <p className="text-xs text-muted-foreground">CNH</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <Badge variant={isExpired(cnh.validadeCnh) ? "destructive" : "outline"} className={!isExpired(cnh.validadeCnh) ? "text-amber-600 border-amber-200 bg-amber-50" : ""}>
                                                            {new Date(cnh.validadeCnh).toLocaleDateString("pt-BR")}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Lista de Seguros */}
                                    {insuranceExpiring.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Seguro Veículos</p>
                                            {insuranceExpiring.map((seg) => (
                                                <div key={`seg-${seg.id}`} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-muted">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                                            <Shield className="h-4 w-4" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium">{seg.placa}</p>
                                                            <p className="text-xs text-muted-foreground">{seg.modelo}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <Badge variant={isExpired(seg.validadeSeguro) ? "destructive" : "outline"} className={!isExpired(seg.validadeSeguro) ? "text-amber-600 border-amber-200 bg-amber-50" : ""}>
                                                            {new Date(seg.validadeSeguro).toLocaleDateString("pt-BR")}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    {/* --- FIM DO CARD --- */}

                    {/* Próximas Manutenções Agendadas */}
                    <Card className="lg:col-span-2 shadow-card">
                        <CardHeader>
                            <CardTitle>Próximas Manutenções Agendadas</CardTitle>
                            <CardDescription>Próximas manutenções com status <strong>AGENDADA</strong></CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {loadingManutencoes ? (
                                    <div className="text-center py-6 text-muted-foreground">Carregando
                                        manutenções...</div>
                                ) : manutencoesUpcoming.length === 0 ? (
                                    <div className="text-center py-6 text-muted-foreground">Nenhuma manutenção agendada
                                        nos próximos dias.</div>
                                ) : (
                                    manutencoesUpcoming.map((m) => {
                                        const vehicleLabel = (m.veiculoId && vehiclesMap[m.veiculoId]) || `Veículo ${m.veiculoId}`;
                                        // const userLabel = (m.userId && driversMap[m.userId]) || "—"; // userLabel não estava sendo usado
                                        return (
                                            <div key={m.id}
                                                 className="flex items-start space-x-3 p-3 rounded-lg bg-muted/30">
                                                <div className="flex-shrink-0">
                                                    <Clock className="h-5 w-5 text-muted-foreground mt-0.5"/>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium">
                                                        {m.tipo === "PREVENTIVA" ? "Preventiva" : "Corretiva"} — {vehicleLabel}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {m.local ? `${m.local} • ` : ""}{new Date(m.data).toLocaleString("pt-BR")}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">{m.descricao ? `${m.descricao}` : ""}</p>
                                                </div>
                                                <div className="text-right">
                                                    {m.status !== undefined && m.status !== null ? (
                                                        <Badge variant="default" className="ml-auto">{m.status}</Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="ml-auto">Sem
                                                            Status</Badge>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* --- MAPA DA FROTA (SUBSTITUÍDO) --- */}
                <Card className="shadow-card">
                    <CardHeader>
                        <CardTitle>Localização da Frota</CardTitle>
                        <CardDescription>
                            {isLoadingMotoristasLocalizacao
                                ? "Buscando localização..."
                                : `${motoristasNoMapa.length} veículos rastreados em tempo real (atualiza a cada 10s)`
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* Aumentei a altura do mapa para h-96 (384px) */}
                        <div className="h-96 w-full rounded-lg overflow-hidden">
                            {isLoadingMotoristasLocalizacao && !motoristasComLocalizacao ? (
                                <div className="h-full w-full bg-muted flex items-center justify-center">
                                    <div className="text-center">
                                        <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-2 animate-pulse"/>
                                        <p className="text-muted-foreground">Carregando mapa...</p>
                                    </div>
                                </div>
                            ) : (
                                <MapContainer
                                    // Centraliza no Brasil continental
                                    center={[-14.2350, -51.9253]}
                                    zoom={4}
                                    style={{height: '100%', width: '100%'}}
                                    scrollWheelZoom={true}
                                >
                                    <TileLayer
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    />
                                    {motoristasNoMapa.map(motorista => (
                                        <Marker
                                            key={motorista.id}
                                            // position precisa ser [latitude, longitude]
                                            position={[motorista.latitude!, motorista.longitude!]}
                                        >
                                            <Popup>
                                                <strong>{motorista.nome}</strong><br/>
                                                Última atualização: {motorista.lastLocationUpdate
                                                ? new Date(motorista.lastLocationUpdate).toLocaleString('pt-BR')
                                                : 'N/A'}
                                            </Popup>
                                        </Marker>
                                    ))}
                                </MapContainer>
                            )}
                        </div>
                    </CardContent>
                </Card>
                {/* --- FIM DO MAPA --- */}
            </div>
        </AdminLayout>
    );
}