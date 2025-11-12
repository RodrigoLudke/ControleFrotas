// src/pages/Alertas.tsx
import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Check, X } from "lucide-react";
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
  tipo?: string;
  status?: string;
  veiculo?: { id?: number; placa?: string; modelo?: string };
  user?: { id?: number; nome?: string; email?: string };
}

export default function Alertas() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  // maps separados
  const [veiculosPlateMap, setVeiculosPlateMap] = useState<
    Record<string, string>
  >({});
  const [veiculosModelMap, setVeiculosModelMap] = useState<
    Record<string, string>
  >({});
  const [motoristasNameMap, setMotoristasNameMap] = useState<
    Record<string, string>
  >({});
  const [motoristasEmailMap, setMotoristasEmailMap] = useState<
    Record<string, string>
  >({});

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/alertas?status=PENDENTE");
      if (!res.ok) {
        const e = await res
          .json()
          .catch(() => ({ error: "Erro ao buscar alertas" }));
        toast({
          title: "Erro",
          description: e.error || "Não foi possível carregar alertas",
          variant: "destructive",
        });
        setAlerts([]);
        return;
      }
      const data = await res.json();
      const alertsArr: Alert[] = Array.isArray(data) ? data : [];
      setAlerts(alertsArr);

      // Carregar veículos e motoristas para mapear ids -> labels (placa / modelo / nome / email)
      try {
        const [resV, resM] = await Promise.all([
          apiFetch("/veiculos"),
          apiFetch("/motoristas"),
        ]);

        const vPlate: Record<string, string> = {};
        const vModel: Record<string, string> = {};
        if (resV.ok) {
          const dv = await resV.json();
          if (Array.isArray(dv)) {
            //eslint-disable-next-line @typescript-eslint/no-explicit-any
            dv.forEach((v: any) => {
              const id = String(v.id ?? "");
              if (!id) return;
              vPlate[id] = v.placa ?? v.modelo ?? `Veículo ${v.id}`;
              vModel[id] = v.modelo ?? "";
            });
          }
        }

        const mName: Record<string, string> = {};
        const mEmail: Record<string, string> = {};
        if (resM.ok) {
          const dm = await resM.json();
          if (Array.isArray(dm)) {
            //eslint-disable-next-line @typescript-eslint/no-explicit-any
            dm.forEach((m: any) => {
              const id = String(m.id ?? "");
              if (!id) return;
              mName[id] = m.nome ?? m.email ?? `Motorista ${m.id}`;
              mEmail[id] = m.email ?? "";
            });
          }
        }

        // complementar com dados embutidos nos alertas (se existirem)
        alertsArr.forEach((a) => {
          const vid = String(a.veiculo?.id ?? a.veiculoId ?? "");
          if (vid) {
            if (a.veiculo?.placa && !vPlate[vid]) vPlate[vid] = a.veiculo.placa;
            if (a.veiculo?.modelo && !vModel[vid])
              vModel[vid] = a.veiculo.modelo;
          }
          const uid = String(a.user?.id ?? a.userId ?? "");
          if (uid) {
            if (a.user?.nome && !mName[uid]) mName[uid] = a.user.nome;
            if (a.user?.email && !mEmail[uid]) mEmail[uid] = a.user.email;
          }
        });

        setVeiculosPlateMap(vPlate);
        setVeiculosModelMap(vModel);
        setMotoristasNameMap(mName);
        setMotoristasEmailMap(mEmail);
      } catch (err) {
        console.warn("Falha ao carregar veículos/motoristas:", err);
      }
    } catch (err) {
      console.error("Erro ao buscar alertas:", err);
      toast({
        title: "Erro de conexão",
        description: "Não foi possível conectar ao servidor",
        variant: "destructive",
      });
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []); // mount

  const handleDecision = async (
    alertId: number,
    action: "accept" | "reject",
  ) => {
    if (
      !window.confirm(
        action === "accept"
          ? "Aceitar este alerta e criar uma manutenção?"
          : "Reprovar este alerta?",
      )
    )
      return;
    setProcessingId(alertId);
    try {
      const det = await apiFetch(`/alertas/${alertId}`);
      const detJson = det.ok ? await det.json() : null;

      const res = await apiFetch(`/alertas/${alertId}/decidir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const e = await res
          .json()
          .catch(() => ({ error: "Erro ao processar decisão" }));
        toast({
          title: "Erro",
          description: e.error || "Não foi possível processar a decisão",
          variant: "destructive",
        });
      } else {
        toast({
          title: action === "accept" ? "Alerta aceito" : "Alerta reprovado",
          variant: "default",
        });

        if (action === "accept") {
          const alertPayload =
            detJson || alerts.find((a) => a.id === alertId) || null;
          navigate("/registrarmanutencoes", { state: { alert: alertPayload } });
        } else {
          setAlerts((prev) => prev.filter((a) => a.id !== alertId));
        }
      }
    } catch (err) {
      console.error("Erro ao decidir alerta:", err);
      toast({
        title: "Erro",
        description: "Erro de conexão ao processar a decisão.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = alerts.filter((a) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;

    const veiculoLabel =
      (a.veiculo && a.veiculo.placa) ||
      veiculosPlateMap[String(a.veiculoId ?? "")] ||
      (a.veiculo && (a.veiculo.modelo ?? String(a.veiculo.id))) ||
      String(a.veiculoId ?? "");

    const veiculoModel =
      (a.veiculo && a.veiculo.modelo) ||
      veiculosModelMap[String(a.veiculoId ?? "")] ||
      "";

    const motoristaLabel =
      (a.user && a.user.nome) ||
      motoristasNameMap[String(a.userId ?? "")] ||
      (a.user && (a.user.email ?? String(a.user.id))) ||
      String(a.userId ?? "");

    const motoristaEmail =
      (a.user && a.user.email) ||
      motoristasEmailMap[String(a.userId ?? "")] ||
      "";

    return (
      String(a.mensagem || "")
        .toLowerCase()
        .includes(q) ||
      String(veiculoLabel || "")
        .toLowerCase()
        .includes(q) ||
      String(veiculoModel || "")
        .toLowerCase()
        .includes(q) ||
      String(motoristaLabel || "")
        .toLowerCase()
        .includes(q) ||
      String(motoristaEmail || "")
        .toLowerCase()
        .includes(q)
    );
  });

  return (
    <AdminLayout title="Alertas de Manutenção">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por veículo, motorista ou mensagem..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={fetchAlerts}>
              Atualizar
            </Button>
          </div>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Alertas pendentes</CardTitle>
            <CardDescription>
              {loading ? "Carregando..." : `${filtered.length} alerta(s)`}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Motorista</TableHead>
                    <TableHead>Mensagem</TableHead>
                    <TableHead>Enviado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-8 text-muted-foreground"
                      >
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : filtered.length > 0 ? (
                    filtered.map((alert) => {
                      const vid = String(
                        alert.veiculo?.id ?? alert.veiculoId ?? "",
                      );
                      const veiculoPlate =
                        (alert.veiculo && alert.veiculo.placa) ||
                        veiculosPlateMap[vid] ||
                        (alert.veiculo &&
                          (alert.veiculo.modelo || String(alert.veiculo.id))) ||
                        String(alert.veiculoId ?? "—");
                      const veiculoModel =
                        (alert.veiculo && alert.veiculo.modelo) ||
                        veiculosModelMap[vid] ||
                        "";

                      const uid = String(alert.user?.id ?? alert.userId ?? "");
                      const motoristaName =
                        (alert.user && alert.user.nome) ||
                        motoristasNameMap[uid] ||
                        (alert.user &&
                          (alert.user.email || String(alert.user.id))) ||
                        String(alert.userId ?? "—");
                      const motoristaEmail =
                        (alert.user && alert.user.email) ||
                        motoristasEmailMap[uid] ||
                        "";

                      return (
                        <TableRow key={alert.id} className="hover:bg-muted/50">
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {veiculoPlate ?? "—"}
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                {veiculoModel || "—"}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {motoristaName ?? "—"}
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                {motoristaEmail || "—"}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-sm truncate">
                            {alert.mensagem}
                          </TableCell>
                          <TableCell>
                            {alert.createdAt
                              ? format(
                                  new Date(alert.createdAt),
                                  "dd/MM/yyyy HH:mm",
                                  { locale: ptBR },
                                )
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  handleDecision(alert.id, "reject")
                                }
                                disabled={processingId === alert.id}
                              >
                                <X className="h-4 w-4 text-destructive" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={() =>
                                  handleDecision(alert.id, "accept")
                                }
                                disabled={processingId === alert.id}
                              >
                                <Check className="h-4 w-4" />
                                <span className="sr-only">Aceitar</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-8 text-muted-foreground"
                      >
                        Nenhum alerta pendente
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
