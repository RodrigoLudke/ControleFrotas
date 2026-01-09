import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {Card, CardContent, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {ArrowLeft, Droplet, User, Truck, Calendar, Gauge, DollarSign, MapPin, Fuel, Clock} from "lucide-react";
import { apiFetch } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";

interface AbastecimentoData {
    id: number;
    veiculoId: number;
    userId: number;
    data: string;
    quilometragem: number;
    litros: number | string;
    valorPorLitro: number | string;
    custoTotal: number | string;
    combustivel: string; // Enum
    posto?: string | null;
    veiculo?: { placa?: string; modelo?: string };
    user?: { nome?: string; email?: string };
    createdAt: string;
    updatedAt: string;
}

export default function AbastecimentosDetalhes() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [item, setItem] = useState<AbastecimentoData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await apiFetch(`/abastecimentos/${id}`);
                if (res.ok) {
                    const data = await res.json();
                    setItem(data);
                } else {
                    toast({ title: "Erro", description: "Abastecimento não encontrado.", variant: "destructive" });
                    navigate("/abastecimentos");
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

    const formatCurrency = (val: number | string) => {
        return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const formatNumber = (val: number | string, decimals: number = 2) => {
        return Number(val).toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
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
        <AdminLayout title="Detalhes do Abastecimento">
            <div className="space-y-6">
                <Button variant="ghost" onClick={() => navigate("/abastecimentos")} className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                </Button>

                <Card className="shadow-card border-t-4 border-t-blue-500">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Fuel className="h-6 w-6 text-blue-600" />
                                Abastecimento #{item.id}
                            </CardTitle>
                            <Badge className="text-base px-3 py-1 bg-slate-800">{item.combustivel}</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-8">

                        {/* Posto e Data (Destaque) */}
                        <div className="bg-muted/40 p-4 rounded-lg border flex flex-col md:flex-row justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white dark:bg-slate-800 rounded-full shadow-sm">
                                    <MapPin className="h-6 w-6 text-red-500" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase font-bold">Posto</p>
                                    <p className="text-xl font-semibold">{item.posto || "Não informado"}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white dark:bg-slate-800 rounded-full shadow-sm">
                                    <Calendar className="h-6 w-6 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase font-bold">Data e Hora</p>
                                    <p className="text-xl font-semibold">
                                        {format(new Date(item.data), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Veículo e Responsável */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex items-center p-4 border rounded-lg">
                                <Truck className="h-8 w-8 text-muted-foreground mr-4" />
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Veículo (ID: {item.veiculoId})</p>
                                    <p className="font-bold text-lg">{item.veiculo?.modelo || "—"}</p>
                                    <p className="text-sm font-mono bg-slate-100 dark:bg-slate-800 px-2 rounded inline-block mt-1">
                                        {item.veiculo?.placa || "SEM PLACA"}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center p-4 border rounded-lg">
                                <User className="h-8 w-8 text-muted-foreground mr-4" />
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Motorista (ID: {item.userId})</p>
                                    <p className="font-bold text-lg">{item.user?.nome || "—"}</p>
                                    <p className="text-sm text-muted-foreground">{item.user?.email}</p>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Dados Numéricos (Cards) */}
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Detalhes do Consumo</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900">
                                    <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
                                        <Droplet className="h-6 w-6 text-blue-500 mb-2" />
                                        <p className="text-sm text-muted-foreground">Litros</p>
                                        <p className="text-2xl font-bold">{formatNumber(item.litros, 3)} L</p>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
                                        <DollarSign className="h-6 w-6 text-muted-foreground mb-2" />
                                        <p className="text-sm text-muted-foreground">Valor / Litro</p>
                                        <p className="text-2xl font-bold">{formatCurrency(item.valorPorLitro)}</p>
                                    </CardContent>
                                </Card>

                                <Card className="bg-green-50 dark:bg-green-950/30 border-green-100 dark:border-green-900">
                                    <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
                                        <DollarSign className="h-6 w-6 text-green-600 mb-2" />
                                        <p className="text-sm text-green-700 dark:text-green-400 font-bold uppercase">Custo Total</p>
                                        <p className="text-2xl font-bold text-green-700 dark:text-green-400">{formatCurrency(item.custoTotal)}</p>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
                                        <Gauge className="h-6 w-6 text-muted-foreground mb-2" />
                                        <p className="text-sm text-muted-foreground">Quilometragem</p>
                                        <p className="text-2xl font-bold">{formatNumber(item.quilometragem, 0)} km</p>
                                    </CardContent>

                                    <CardFooter className="bg-muted/50 flex justify-between text-xs text-muted-foreground py-3">
                                        <span className="flex items-center"><Clock className="h-3 w-3 mr-1"/> Criado em: {formatData(item.createdAt)}</span>
                                        <span className="flex items-center"><Clock className="h-3 w-3 mr-1"/> Atualizado em: {formatData(item.updatedAt)}</span>
                                    </CardFooter>

                                </Card>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}