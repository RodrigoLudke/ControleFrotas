import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {Card, CardContent, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    ArrowLeft,
    Wrench,
    User,
    Truck,
    Calendar,
    Gauge,
    DollarSign,
    MapPin,
    ClipboardList,
    Info,
    Clock
} from "lucide-react";
import { apiFetch } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";

interface ManutencaoData {
    id: number;
    veiculoId: number;
    userId?: number | null;
    data: string;
    quilometragem: number;
    tipo: string; // Enum
    descricao: string;
    custo?: number | string | null;
    local?: string | null;
    observacoes?: string | null;
    status: string; // Enum
    veiculo?: { placa?: string; modelo?: string };
    user?: { nome?: string; email?: string };
    createdAt: string;
    updatedAt: string;
}

export default function ManutencoesDetalhes() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [item, setItem] = useState<ManutencaoData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await apiFetch(`/manutencoes/${id}`);
                if (res.ok) {
                    const data = await res.json();
                    setItem(data);
                } else {
                    toast({ title: "Erro", description: "Manutenção não encontrada.", variant: "destructive" });
                    navigate("/manutencoes");
                }
            } catch (error) {
                console.error(error);
                toast({ title: "Erro", description: "Conexão falhou.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id, navigate, toast]);

    if (loading) return <AdminLayout title="Carregando..."><div className="p-4">Carregando...</div></AdminLayout>;
    if (!item) return null;

    const getStatusBadge = (status: string) => {
        const s = status.toLowerCase();
        const map: Record<string, string> = {
            concluida: "bg-green-600 hover:bg-green-700",
            pendente: "bg-yellow-600 hover:bg-yellow-700",
            agendada: "bg-blue-600 hover:bg-blue-700",
            cancelada: "bg-red-600 hover:bg-red-700",
            em_andamento: "bg-orange-500 hover:bg-orange-600"
        };
        return <Badge className={map[s] || "bg-gray-500"}>{status.replace('_', ' ').toUpperCase()}</Badge>;
    };

    const formatData = (iso: string) => {
        if (!iso) return "—";
        try {
            return format(new Date(iso), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
        } catch {
            return iso;
        }
    };

    return (
        <AdminLayout title="Detalhes da Manutenção">
            <div className="space-y-6">
                <Button variant="ghost" onClick={() => navigate("/manutencoes")} className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                </Button>

                <Card className="shadow-card border-t-4 border-t-blue-500">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <CardTitle className="flex items-center gap-2">
                                    <Wrench className="h-5 w-5 text-primary" />
                                    Manutenção #{item.id}
                                </CardTitle>
                                <p className="text-sm text-muted-foreground capitalize">{item.tipo.toLowerCase()}</p>
                            </div>
                            {getStatusBadge(item.status)}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">

                        {/* Informações Principais */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex items-start space-x-3">
                                <Truck className="h-5 w-5 text-muted-foreground mt-1" />
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Veículo</p>
                                    <p className="text-lg font-semibold">{item.veiculo?.modelo}</p>
                                    <p className="text-sm">{item.veiculo?.placa}</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-3">
                                <User className="h-5 w-5 text-muted-foreground mt-1" />
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Responsável</p>
                                    <p className="text-lg font-semibold">{item.user?.nome || "—"}</p>
                                    <p className="text-sm">{item.user?.email}</p>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Detalhes Técnicos e Financeiros */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-3 bg-muted/30 rounded-lg border">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                    <Calendar className="h-4 w-4" /> Data
                                </div>
                                <p className="font-semibold">{format(new Date(item.data), "dd/MM/yyyy", { locale: ptBR })}</p>
                            </div>
                            <div className="p-3 bg-muted/30 rounded-lg border">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                    <Gauge className="h-4 w-4" /> KM no ato
                                </div>
                                <p className="font-semibold">{item.quilometragem.toLocaleString('pt-BR')} km</p>
                            </div>
                            <div className="p-3 bg-muted/30 rounded-lg border col-span-2 md:col-span-2">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                    <DollarSign className="h-4 w-4" /> Custo
                                </div>
                                <p className="font-semibold text-xl text-green-600">
                                    {item.custo ? Number(item.custo).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : "R$ 0,00"}
                                </p>
                            </div>
                        </div>

                        {/* Local (Oficina) */}
                        <div className="flex items-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            <MapPin className="h-5 w-5 mr-3" />
                            <div className="flex-1">
                                <p className="text-xs font-bold uppercase">Local / Oficina</p>
                                <p className="font-medium">{item.local || "Local não especificado"}</p>
                            </div>
                        </div>

                        {/* Descrição */}
                        <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center">
                                <ClipboardList className="h-4 w-4 mr-2" /> Descrição do Serviço
                            </h4>
                            <div className="p-4 rounded-md bg-muted border text-sm whitespace-pre-wrap">
                                {item.descricao}
                            </div>
                        </div>

                        {/* Observações */}
                        {item.observacoes && (
                            <div>
                                <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center">
                                    <Info className="h-4 w-4 mr-2" /> Observações Adicionais
                                </h4>
                                <div className="p-4 rounded-md bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900 text-sm whitespace-pre-wrap">
                                    {item.observacoes}
                                </div>
                            </div>
                        )}
                    </CardContent>

                    <CardFooter className="bg-muted/50 flex justify-between text-xs text-muted-foreground py-3">
                        <span className="flex items-center"><Clock className="h-3 w-3 mr-1"/> Criado em: {formatData(item.createdAt)}</span>
                        <span className="flex items-center"><Clock className="h-3 w-3 mr-1"/> Atualizado em: {formatData(item.updatedAt)}</span>
                    </CardFooter>

                </Card>
            </div>
        </AdminLayout>
    );
}