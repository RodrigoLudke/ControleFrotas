import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, MapPin, User, Truck, Calendar, Gauge, FileText, Clock } from "lucide-react";
import { apiFetch } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";

interface ViagemData {
    id: number;
    userId: number;
    veiculoId: number;
    dataSaida: string; // DateTime
    dataChegada: string; // DateTime
    finalidade: string;
    kmInicial: number;
    kmFinal: number;
    createdAt: string;
    updatedAt: string;
    veiculo?: { placa?: string; modelo?: string };
    user?: { nome?: string; email?: string };
}

export default function ViagensDetalhes() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [trip, setTrip] = useState<ViagemData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTrip = async () => {
            try {
                const res = await apiFetch(`/viagens/${id}`);
                if (res.ok) {
                    const data = await res.json();
                    setTrip(data);
                } else {
                    toast({ title: "Erro", description: "Viagem não encontrada.", variant: "destructive" });
                    navigate("/viagens");
                }
            } catch (error) {
                console.error(error);
                toast({ title: "Erro", description: "Falha na conexão.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        fetchTrip();
    }, [id, navigate, toast]);

    if (loading) return <AdminLayout title="Carregando..."><div className="p-4">Carregando...</div></AdminLayout>;
    if (!trip) return null;

    const formatData = (iso: string) => {
        if (!iso) return "—";
        try {
            return format(new Date(iso), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
        } catch {
            return iso;
        }
    };

    const distancia = trip.kmFinal - trip.kmInicial;

    return (
        <AdminLayout title="Detalhes da Viagem">
            <div className="space-y-6">
                <Button variant="ghost" onClick={() => navigate("/viagens")} className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                </Button>

                <Card className="shadow-card border-t-4 border-t-blue-500">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <MapPin className="h-5 w-5 text-primary" />
                                Viagem #{trip.id}
                            </CardTitle>
                            <Badge variant="outline">Concluída</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        {/* Motorista e Veículo */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2 border p-4 rounded-md bg-muted/20">
                                <div className="flex items-center text-muted-foreground mb-2">
                                    <User className="h-4 w-4 mr-2" />
                                    <span className="text-sm font-medium">Motorista (ID: {trip.userId})</span>
                                </div>
                                <p className="text-lg font-semibold">{trip.user?.nome || "—"}</p>
                                <p className="text-sm text-muted-foreground">{trip.user?.email || "—"}</p>
                            </div>
                            <div className="space-y-2 border p-4 rounded-md bg-muted/20">
                                <div className="flex items-center text-muted-foreground mb-2">
                                    <Truck className="h-4 w-4 mr-2" />
                                    <span className="text-sm font-medium">Veículo (ID: {trip.veiculoId})</span>
                                </div>
                                <p className="text-lg font-semibold">{trip.veiculo?.modelo || "Modelo desconhecido"}</p>
                                <Badge variant="secondary" className="mt-1 text-md">{trip.veiculo?.placa || "SEM PLACA"}</Badge>
                            </div>
                        </div>

                        <Separator />

                        {/* Datas */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center">
                                    <Calendar className="h-4 w-4 mr-2" /> Data de Saída
                                </h4>
                                <p className="text-lg">{formatData(trip.dataSaida)}</p>
                            </div>
                            <div>
                                <h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center">
                                    <Calendar className="h-4 w-4 mr-2" /> Data de Chegada
                                </h4>
                                <p className="text-lg">{formatData(trip.dataChegada)}</p>
                            </div>
                        </div>

                        <Separator />

                        {/* Quilometragem */}
                        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border">
                            <h3 className="font-semibold mb-4 flex items-center">
                                <Gauge className="h-5 w-5 mr-2" /> Registro de Quilometragem
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center md:text-left">
                                <div>
                                    <span className="text-xs text-muted-foreground uppercase tracking-wider">KM Inicial</span>
                                    <p className="text-2xl font-mono">{trip.kmInicial.toLocaleString('pt-BR')} km</p>
                                </div>
                                <div>
                                    <span className="text-xs text-muted-foreground uppercase tracking-wider">KM Final</span>
                                    <p className="text-2xl font-mono">{trip.kmFinal.toLocaleString('pt-BR')} km</p>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-2 rounded shadow-sm border-l-4 border-primary">
                                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Distância</span>
                                    <p className="text-2xl font-bold text-primary">
                                        {distancia > 0 ? distancia.toLocaleString('pt-BR') : 0} km
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Finalidade */}
                        <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center">
                                <FileText className="h-4 w-4 mr-2" /> Finalidade da Viagem
                            </h4>
                            <div className="bg-muted p-4 rounded-md text-sm leading-relaxed">
                                {trip.finalidade}
                            </div>
                        </div>
                    </CardContent>

                    <CardFooter className="bg-muted/50 flex justify-between text-xs text-muted-foreground py-3">
                        <span className="flex items-center"><Clock className="h-3 w-3 mr-1"/> Criado em: {formatData(trip.createdAt)}</span>
                        <span className="flex items-center"><Clock className="h-3 w-3 mr-1"/> Atualizado em: {formatData(trip.updatedAt)}</span>
                    </CardFooter>

                </Card>
            </div>
        </AdminLayout>
    );
}