// src/pages/Alertas.tsx
import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Check, X, MessageSquare } from "lucide-react";
import { apiFetch } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";

interface Alert {
    id: number;
    userId?: number;
    veiculoId?: number;
    mensagem: string;
    createdAt: string;
    tipo?: string; // opcional
    status?: string; // exemplo: "PENDENTE"
    // outros campos que o backend retornar...
}

export default function Alertas() {
    const { toast } = useToast();
    const navigate = useNavigate();

    const [searchTerm, setSearchTerm] = useState("");
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<number | null>(null);

    const fetchAlerts = async () => {
        setLoading(true);
        try {
            const res = await apiFetch("/alertas");
            if (!res.ok) {
                const e = await res.json().catch(() => ({ error: "Erro ao buscar alertas" }));
                toast({ title: "Erro", description: e.error || "Não foi possível carregar alertas", variant: "destructive" });
                setAlerts([]);
                return;
            }
            const data = await res.json();
            setAlerts(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Erro ao buscar alertas:", err);
            toast({ title: "Erro de conexão", description: "Não foi possível conectar ao servidor", variant: "destructive" });
            setAlerts([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAlerts();
    }, []); // mount

    const handleDecision = async (alertId: number, action: "accept" | "reject") => {
        if (!window.confirm(action === "accept" ? "Aceitar este alerta e criar uma manutenção?" : "Reprovar este alerta?")) return;
        setProcessingId(alertId);
        try {
            // endpoint assumed: POST /alertas/:id/decidir  { action: "accept"|"reject" }
            const res = await apiFetch(`/alertas/${alertId}/decidir`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action })
            });

            if (!res.ok) {
                const e = await res.json().catch(() => ({ error: "Erro ao processar decisão" }));
                toast({ title: "Erro", description: e.error || "Não foi possível processar a decisão", variant: "destructive" });
            } else {
                toast({ title: action === "accept" ? "Alerta aceito" : "Alerta reprovado", variant: "default" });

                if (action === "accept") {
                    // obter dados do alerta para pré-preencher a página de manutenção (speech: fetch alert detail)
                    const alertData = await res.json().catch(() => null);
                    // redireciona para página de criação de manutenção com estado
                    // se backend retornar o alerta atualizado no response, usamos; senão, buscamos o alerta
                    const payload = alertData?.alert || null;
                    if (payload) {
                        navigate("/registrarmanutencoes", { state: { alert: payload } });
                    } else {
                        // fallback: buscar alerta detalhe
                        const det = await apiFetch(`/alertas/${alertId}`);
                        const detJson = det.ok ? await det.json() : null;
                        navigate("/registrarmanutencoes", { state: { alert: detJson } });
                    }
                } else {
                    // remover localmente
                    setAlerts(prev => prev.filter(a => a.id !== alertId));
                }
            }
        } catch (err) {
            console.error("Erro ao decidir alerta:", err);
            toast({ title: "Erro", description: "Erro de conexão ao processar a decisão.", variant: "destructive" });
        } finally {
            setProcessingId(null);
        }
    };

    const filtered = alerts.filter(a => {
        const q = searchTerm.trim().toLowerCase();
        if (!q) return true;
        return (
            String(a.mensagem || "").toLowerCase().includes(q) ||
            String(a.veiculoId || "").toLowerCase().includes(q) ||
            String(a.userId || "").toLowerCase().includes(q)
        );
    });

    return (
        <AdminLayout title="Alertas de Manutenção">
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input placeholder="Buscar por veículo, motorista ou mensagem..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                    </div>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={fetchAlerts}>Atualizar</Button>
                    </div>
                </div>

                <Card className="shadow-card">
                    <CardHeader>
                        <CardTitle>Alertas pendentes</CardTitle>
                        <CardDescription>{loading ? "Carregando..." : `${filtered.length} alerta(s)`}</CardDescription>
                    </CardHeader>

                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Veículo (ID)</TableHead>
                                        <TableHead>Motorista (ID)</TableHead>
                                        <TableHead>Mensagem</TableHead>
                                        <TableHead>Enviado em</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
                                        </TableRow>
                                    ) : filtered.length > 0 ? (
                                        filtered.map(alert => (
                                            <TableRow key={alert.id} className="hover:bg-muted/50">
                                                <TableCell>{alert.veiculoId ?? "—"}</TableCell>
                                                <TableCell>{alert.userId ?? "—"}</TableCell>
                                                <TableCell className="max-w-sm truncate">{alert.mensagem}</TableCell>
                                                <TableCell>{alert.createdAt ? format(new Date(alert.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button size="sm" variant="ghost" onClick={() => handleDecision(alert.id, "reject")} disabled={processingId === alert.id}>
                                                            <X className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                        <Button size="sm" onClick={() => handleDecision(alert.id, "accept")} disabled={processingId === alert.id}>
                                                            <Check className="h-4 w-4" />
                                                            <span className="sr-only">Aceitar</span>
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum alerta pendente</TableCell>
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
