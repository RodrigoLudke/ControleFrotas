// src/pages/RegistrarManutencoes.tsx
import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Save, Wrench } from "lucide-react";
import { apiFetch } from "@/services/api";
import { useNavigate, useParams, useLocation } from "react-router-dom";

const manutencaoSchema = z.object({
    veiculoId: z.number().int().positive("Selecione um veículo"),
    userId: z.number().int().positive().optional(),
    data: z.string().min(1, "Data/hora é obrigatória"),
    quilometragem: z.number().int().nonnegative("Quilometragem inválida"),
    tipo: z.enum(["PREVENTIVA", "CORRETIVA"], {
        invalid_type_error: "Selecione um tipo de manutenção válido",
        required_error: "Selecione o tipo de manutenção"
    }),
    descricao: z.string().min(5, "Descrição muito curta").max(2000),
    custo: z.number().nonnegative().optional(),
    local: z.string().max(200).optional(),
    observacoes: z.string().max(2000).optional(),
    status: z.enum(["AGENDADA", "EM_ANDAMENTO", "CONCLUIDA", "CANCELADA"]).optional()
});

type ManutencaoForm = z.infer<typeof manutencaoSchema>;

export default function RegisterMaintenance() {
    const { id } = useParams<{ id?: string }>();
    const isEdit = Boolean(id);
    const { toast } = useToast();
    const navigate = useNavigate();
    const location = useLocation();
    // incoming alert (se vier de navigate('/registrarmanutencoes', { state: { alert } }))
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    const incomingAlert: any = (location && (location as any).state && (location as any).state.alert) || null;

    const [loadingInit, setLoadingInit] = useState<boolean>(!!id);
    const [isSaving, setIsSaving] = useState<boolean>(false);

    const [veiculos, setVeiculos] = useState<Array<{ id: number; placa?: string; modelo?: string }>>([]);
    const [motoristas, setMotoristas] = useState<Array<{ id: number; nome?: string; email?: string }>>([]);

    const [form, setForm] = useState<Partial<ManutencaoForm>>({
        veiculoId: undefined,
        userId: undefined,
        data: "", // NÃO vamos pré-preencher data/hora a partir do alerta
        quilometragem: undefined,
        // sem valor padrão para exibir placeholder em cinza
        //eslint-disable-next-line @typescript-eslint/no-explicit-any
        tipo: undefined as any,
        descricao: "",
        custo: undefined,
        local: "",
        observacoes: "",
        //eslint-disable-next-line @typescript-eslint/no-explicit-any
        status: undefined as any
    });

    const [errors, setErrors] = useState<Partial<Record<keyof ManutencaoForm, string>>>({});

    // load vehicles and drivers
    useEffect(() => {
        const loadLists = async () => {
            try {
                const [resV, resM] = await Promise.all([apiFetch("/veiculos"), apiFetch("/motoristas")]);

                if (resV.ok) {
                    const dv = await resV.json();
                    setVeiculos(Array.isArray(dv) ? dv : []);
                } else {
                    console.warn("Falha ao buscar veículos");
                    setVeiculos([]);
                }

                if (resM.ok) {
                    const dm = await resM.json();
                    setMotoristas(Array.isArray(dm) ? dm : []);
                } else {
                    console.warn("Falha ao buscar motoristas");
                    setMotoristas([]);
                }
            } catch (err) {
                console.error("Erro ao carregar listas:", err);
                setVeiculos([]);
                setMotoristas([]);
            }
        };

        loadLists();
    }, []);

    // fetch maintenance when editing
    useEffect(() => {
        if (!id) return;

        const fetchManutencao = async () => {
            setLoadingInit(true);
            try {
                const res = await apiFetch(`/manutencoes/${id}`);
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    toast({
                        title: "Erro ao carregar manutenção",
                        description: err.error || "Registro não encontrado.",
                        variant: "destructive"
                    });
                    navigate("/manutencoes");
                    return;
                }
                const data = await res.json();

                // transforma data para format compatível com input datetime-local (YYYY-MM-DDTHH:mm)
                const dateLocal = data.data ? new Date(data.data).toISOString().slice(0, 16) : "";

                setForm({
                    veiculoId: data.veiculoId ?? undefined,
                    userId: data.userId ?? undefined,
                    data: dateLocal,
                    quilometragem: data.quilometragem ?? undefined,
                    tipo: data.tipo ?? undefined,
                    descricao: data.descricao ?? "",
                    custo: data.custo !== undefined && data.custo !== null ? Number(String(data.custo)) : undefined,
                    local: data.local ?? "",
                    observacoes: data.observacoes ?? "",
                    status: data.status ?? undefined
                });
            } catch (err) {
                console.error("Erro ao buscar manutenção:", err);
                toast({
                    title: "Erro de conexão",
                    description: "Não foi possível carregar a manutenção.",
                    variant: "destructive"
                });
                navigate("/manutencoes");
            } finally {
                setLoadingInit(false);
            }
        };

        fetchManutencao();
    }, [id, navigate, toast]);

    // --- Preencher a partir do alert (se houver) ---
    useEffect(() => {
        // preenche apenas se veio alert e não estamos em modo edição
        if (!incomingAlert || isEdit) return;

        // Espera a lista de veículos carregada para garantir que o Select tenha o SelectItem correspondente
        if (veiculos.length === 0) {
            // ainda não temos os veículos — aguardamos o carregamento
            return;
        }

        try {
            const alert = incomingAlert;

            // possíveis campos no alerta (tolerância a formatos diferentes)
            const rawVeiculoId = alert.veiculoId ?? alert.veiculo?.id ?? alert.veiculo?.veiculoId;
            const rawVeiculoPlaca = alert.veiculo?.placa ?? alert.placa ?? alert.veiculoPlaca;

            // tentar encontrar veículo na lista por id ou placa (case-insensitive)
            let veiculoMatch = undefined;
            if (rawVeiculoId !== undefined && rawVeiculoId !== null) {
                veiculoMatch = veiculos.find(v => String(v.id) === String(rawVeiculoId));
            }
            if (!veiculoMatch && rawVeiculoPlaca) {
                const placaNormalized = String(rawVeiculoPlaca).toLowerCase();
                veiculoMatch = veiculos.find(v => v.placa && String(v.placa).toLowerCase() === placaNormalized);
            }
            const veiculoIdFromAlert = veiculoMatch ? Number(veiculoMatch.id) : (rawVeiculoId !== undefined ? Number(rawVeiculoId) : undefined);

            // motorista: tentar por id, email ou nome
            const rawUserId = alert.userId ?? alert.user?.id ?? alert.user?.userId;
            const rawUserEmail = alert.user?.email ?? alert.userEmail;
            const rawUserName = alert.user?.nome ?? alert.user?.name ?? alert.user?.nomeCompleto;

            let motoristaMatch = undefined;
            if (rawUserId !== undefined && rawUserId !== null && motoristas.length > 0) {
                motoristaMatch = motoristas.find(m => String(m.id) === String(rawUserId));
            }
            if (!motoristaMatch && rawUserEmail && motoristas.length > 0) {
                const emailNorm = String(rawUserEmail).toLowerCase();
                motoristaMatch = motoristas.find(m => m.email && String(m.email).toLowerCase() === emailNorm);
            }
            if (!motoristaMatch && rawUserName && motoristas.length > 0) {
                const nameNorm = String(rawUserName).toLowerCase();
                motoristaMatch = motoristas.find(m => m.nome && String(m.nome).toLowerCase() === nameNorm);
            }
            const userIdFromAlert = motoristaMatch ? Number(motoristaMatch.id) : (rawUserId !== undefined ? Number(rawUserId) : undefined);

            const descricaoFromAlert = alert.mensagem ?? alert.descricao ?? "";
            const quilometragemFromAlert = alert.quilometragem ?? undefined;
            const tipoAlert = alert.tipo ?? undefined; // SOLICITACAO | REGISTRO_RAPIDO

            // mapear tipo/status do alerta para manutenção
            let mappedTipo: "PREVENTIVA" | "CORRETIVA" = "CORRETIVA";
            let mappedStatus: "AGENDADA" | "EM_ANDAMENTO" | "CONCLUIDA" | "CANCELADA" = "AGENDADA";

            if (tipoAlert === "REGISTRO_RAPIDO") {
                mappedTipo = "CORRETIVA";
                mappedStatus = "CONCLUIDA";
            } else {
                // SOLICITACAO ou outros -> manter como corretiva/agendada por padrão
                mappedTipo = "CORRETIVA";
                mappedStatus = "AGENDADA";
            }

            // atualiza o form (NÃO sobrescreve data/hora — o usuário quer preencher isso)
            setForm(prev => ({
                ...prev,
                veiculoId: veiculoIdFromAlert !== undefined ? veiculoIdFromAlert : prev.veiculoId,
                userId: userIdFromAlert !== undefined ? userIdFromAlert : prev.userId,
                // data: NÃO alterar; deixamos para o usuário selecionar
                quilometragem: quilometragemFromAlert !== undefined ? Number(quilometragemFromAlert) : prev.quilometragem,
                tipo: mappedTipo,
                descricao: descricaoFromAlert ? `${descricaoFromAlert}` : prev.descricao,
                status: mappedStatus
            }));
        } catch (err) {
            console.warn("Falha ao aplicar alert state no formulário:", err);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [incomingAlert, isEdit, veiculos, motoristas]);

    // valida um campo isolado usando zod (criamos um schema parcial)
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    const validateField = <K extends keyof ManutencaoForm>(key: K, value: any) => {
        try {
            //eslint-disable-next-line @typescript-eslint/no-explicit-any
            const single = z.object({ [key]: (manutencaoSchema as any).shape[key] });
            single.parse({ [key]: value });
            setErrors(prev => ({ ...prev, [key]: undefined }));
            return true;
        } catch (err) {
            if (err instanceof z.ZodError) {
                setErrors(prev => ({ ...prev, [key]: err.errors[0].message }));
            }
            return false;
        }
    };

    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleChange = <K extends keyof ManutencaoForm>(key: K, value: any) => {
        setForm(prev => ({ ...prev, [key]: value }));
        validateField(key, value);
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault?.();
        setIsSaving(true);

        try {
            // montar payload com conversões
            //eslint-disable-next-line @typescript-eslint/no-explicit-any
            const payloadRaw: any = {
                veiculoId: form.veiculoId !== undefined ? Number(form.veiculoId) : undefined,
                userId: form.userId !== undefined ? Number(form.userId) : undefined,
                data: form.data ? new Date(form.data).toISOString() : undefined,
                quilometragem: form.quilometragem !== undefined ? Number(form.quilometragem) : undefined,
                tipo: form.tipo,
                descricao: form.descricao,
                custo: form.custo !== undefined && form.custo !== null ? Number(String(form.custo)) : undefined,
                local: form.local,
                observacoes: form.observacoes,
                status: form.status
            };

            // valida com zod (nota: zod espera "data" como string)
            const validated = manutencaoSchema.parse({
                ...payloadRaw,
                data: payloadRaw.data || ""
            });

            // chamada ao backend
            let res;
            if (isEdit && id) {
                res = await apiFetch(`/manutencoes/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(validated)
                });
            } else {
                res = await apiFetch("/manutencoes", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(validated)
                });
            }

            if (res.ok) {
                toast({
                    title: isEdit ? "Manutenção atualizada" : "Manutenção criada",
                    description: isEdit ? "Alterações salvas com sucesso." : "Manutenção registrada com sucesso.",
                });
                navigate("/manutencoes");
            } else {
                const err = await res.json().catch(() => ({ error: "Erro ao salvar manutenção." }));
                toast({
                    title: "Erro",
                    description: err.error || "Não foi possível salvar a manutenção.",
                    variant: "destructive"
                });
            }
        } catch (err) {
            if (err instanceof z.ZodError) {
                const fieldErrs: Partial<Record<keyof ManutencaoForm, string>> = {};
                err.errors.forEach(e => {
                    if (e.path && e.path[0]) fieldErrs[e.path[0] as keyof ManutencaoForm] = e.message;
                });
                setErrors(fieldErrs);
                toast({
                    title: "Erro de validação",
                    description: "Corrija os campos destacados.",
                    variant: "destructive"
                });
            } else {
                console.error("Erro ao salvar manutenção:", err);
                toast({
                    title: "Erro inesperado",
                    description: "Não foi possível salvar a manutenção. Verifique o console.",
                    variant: "destructive"
                });
            }
        } finally {
            setIsSaving(false);
        }
    };

    if (loadingInit) {
        return (
            <AdminLayout title={isEdit ? "Carregando manutenção..." : "Cadastrar Manutenção"}>
                <div className="mx-auto max-w-4xl">Carregando...</div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title={isEdit ? "Editar Manutenção" : "Cadastrar Manutenção"}>
            <div className="mx-auto max-w-4xl">
                <Card className="shadow-form">
                    <CardHeader className="space-y-2">
                        <div className="flex items-center space-x-2">
                            <Wrench className="h-6 w-6 text-primary" />
                            <CardTitle className="text-2xl">{isEdit ? "Editar Manutenção" : "Registrar Nova Manutenção"}</CardTitle>
                        </div>
                        <CardDescription>
                            {isEdit ? "Altere os dados da manutenção" : "Preencha os dados para registrar a manutenção do veículo"}
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">Dados da Manutenção</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="veiculo">Veículo *</Label>
                                        <Select
                                            value={form.veiculoId ? String(form.veiculoId) : ""}
                                            onValueChange={(v) => handleChange("veiculoId", v ? Number(v) : undefined)}
                                        >
                                            <SelectTrigger
                                                id="veiculo"
                                                className={`${errors.veiculoId ? "border-destructive" : ""} ${!form.veiculoId ? "text-muted-foreground" : ""}`}
                                            >
                                                <SelectValue placeholder="Selecione o veículo (placa)" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {veiculos.map(v => (
                                                    <SelectItem key={v.id} value={String(v.id)}>
                                                        {v.placa ? `${v.placa} — ${v.modelo ?? ""}` : `Veículo ${v.id}`}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.veiculoId && <p className="text-sm text-destructive">{errors.veiculoId}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="user">Motorista (opcional)</Label>
                                        <Select
                                            value={form.userId !== undefined ? String(form.userId) : ""}
                                            onValueChange={(v) => {
                                                // usamos "0" como sentinel para "sem motorista" no SelectItem
                                                if (v === "0") handleChange("userId", undefined);
                                                else handleChange("userId", v ? Number(v) : undefined);
                                            }}
                                        >
                                            <SelectTrigger id="user" className={`${!form.userId ? "text-muted-foreground" : ""}`}>
                                                <SelectValue placeholder="Selecione o motorista (opcional)" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {/* opção "Sem motorista" NÃO pode ter value="" -> uso "0" */}
                                                <SelectItem value="0">Sem motorista</SelectItem>
                                                {motoristas.map(m => (
                                                    <SelectItem key={m.id} value={String(m.id)}>
                                                        {m.nome ?? m.email ?? `Motorista ${m.id}`}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.userId && <p className="text-sm text-destructive">{errors.userId}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="data">Data e Horário *</Label>
                                        <Input
                                            id="data"
                                            type="datetime-local"
                                            value={form.data || ""}
                                            onChange={(e) => handleChange("data", e.target.value)}
                                            className={`${errors.data ? "border-destructive" : ""} ${!form.data ? "text-muted-foreground" : ""}`}
                                        />
                                        {errors.data && <p className="text-sm text-destructive">{errors.data}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="quilometragem">Quilometragem *</Label>
                                        <Input
                                            id="quilometragem"
                                            type="number"
                                            value={form.quilometragem ?? ""}
                                            onChange={(e) => handleChange("quilometragem", e.target.value === "" ? undefined : Number(e.target.value))}
                                            className={errors.quilometragem ? "border-destructive" : ""}
                                            placeholder="0"
                                        />
                                        {errors.quilometragem && <p className="text-sm text-destructive">{errors.quilometragem}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="tipo">Tipo *</Label>
                                        <Select
                                            value={form.tipo ?? ""}
                                            //eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            onValueChange={(v) => handleChange("tipo", v as any)}
                                        >
                                            <SelectTrigger id="tipo" className={`${!form.tipo ? "text-muted-foreground" : ""}`}>
                                                <SelectValue placeholder="Selecione o tipo" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="PREVENTIVA">Preventiva</SelectItem>
                                                <SelectItem value="CORRETIVA">Corretiva</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {errors.tipo && <p className="text-sm text-destructive">{errors.tipo}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="status">Status</Label>
                                        <Select
                                            value={form.status ?? ""}
                                            //eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            onValueChange={(v) => handleChange("status", v as any)}
                                        >
                                            <SelectTrigger id="status" className={`${!form.status ? "text-muted-foreground" : ""}`}>
                                                <SelectValue placeholder="Selecione status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="AGENDADA">Agendada</SelectItem>
                                                <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
                                                <SelectItem value="CONCLUIDA">Concluída</SelectItem>
                                                <SelectItem value="CANCELADA">Cancelada</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {errors.status && <p className="text-sm text-destructive">{errors.status}</p>}
                                    </div>

                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="descricao">Descrição *</Label>
                                        <Textarea
                                            id="descricao"
                                            rows={4}
                                            value={form.descricao || ""}
                                            onChange={(e) => handleChange("descricao", e.target.value)}
                                            className={errors.descricao ? "border-destructive" : ""}
                                            placeholder="Descreva o problema ou serviço a ser realizado"
                                        />
                                        {errors.descricao && <p className="text-sm text-destructive">{errors.descricao}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="custo">Custo (R$)</Label>
                                        <Input
                                            id="custo"
                                            type="number"
                                            step="0.01"
                                            value={form.custo ?? ""}
                                            onChange={(e) => handleChange("custo", e.target.value === "" ? undefined : Number(e.target.value))}
                                            className={errors.custo ? "border-destructive" : ""}
                                            placeholder="0.00"
                                        />
                                        {errors.custo && <p className="text-sm text-destructive">{errors.custo}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="local">Local / Oficina</Label>
                                        <Input
                                            id="local"
                                            value={form.local || ""}
                                            onChange={(e) => handleChange("local", e.target.value)}
                                            className={errors.local ? "border-destructive" : ""}
                                            placeholder="Nome da oficina (opcional)"
                                        />
                                        {errors.local && <p className="text-sm text-destructive">{errors.local}</p>}
                                    </div>

                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="observacoes">Observações</Label>
                                        <Textarea
                                            id="observacoes"
                                            rows={3}
                                            value={form.observacoes || ""}
                                            onChange={(e) => handleChange("observacoes", e.target.value)}
                                            className={errors.observacoes ? "border-destructive" : ""}
                                            placeholder="Observações adicionais (opcional)"
                                        />
                                        {errors.observacoes && <p className="text-sm text-destructive">{errors.observacoes}</p>}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end space-x-4 pt-6 border-t border-border">
                                <Button type="button" variant="secondary" onClick={() => navigate("/manutencoes")}>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={isSaving} onClick={handleSubmit} className="min-w-[140px]">
                                    {isSaving ? "Salvando..." : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            {isEdit ? "Atualizar" : "Cadastrar"}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
