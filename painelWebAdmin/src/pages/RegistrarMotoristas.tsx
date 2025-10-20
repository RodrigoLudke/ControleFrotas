// src/pages/RegisterDriver.tsx
import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Save, User, ChevronDown } from "lucide-react";
import { apiFetch } from "@/services/api";
import { useNavigate, useParams } from "react-router-dom";

const CNH_CATEGORIES = [
    { label: "Categoria A", value: "A" },
    { label: "Categoria B", value: "B" },
    { label: "Categoria AB", value: "AB" },
    { label: "Categoria C", value: "C" },
    { label: "Categoria D", value: "D" },
    { label: "Categoria E", value: "E" },
];

const driverCreateSchema = z.object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100, "Nome muito longo"),
    email: z.string().email("Email inválido").max(255, "Email muito longo"),
    password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
    phone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos").max(15, "Telefone muito longo"),
    cpf: z.string().length(11, "CPF deve ter 11 dígitos"),
    rg: z.string().min(5, "RG inválido").max(20, "RG muito longo"),
    cnh: z.string().length(11, "CNH deve ter 11 dígitos"),
    cnhValidity: z.string().min(1, "Validade da CNH é obrigatória"),
    cnhCategories: z.array(z.string()).min(1, "Selecione pelo menos uma categoria de CNH"),
    address: z.string().min(10, "Endereço deve ter pelo menos 10 caracteres").max(200, "Endereço muito longo"),
    birthDate: z.string().min(1, "Data de nascimento é obrigatória"),
    hireDate: z.string().min(1, "Data de contratação é obrigatória"),
    salary: z.string().min(1, "Salário é obrigatório"),
    observations: z.string().max(500, "Observações muito longas").optional()
});

// Schema para edição: senha opcional
const driverEditSchema = driverCreateSchema.extend({
    password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").optional()
});

type DriverFormData = z.infer<typeof driverCreateSchema>;

export default function RegisterDriver() {
    const { toast } = useToast();
    const navigate = useNavigate();
    const { id } = useParams<{ id?: string }>();

    const [isLoading, setIsLoading] = useState(false);
    const [loadingInit, setLoadingInit] = useState<boolean>(!!id);
    const [formData, setFormData] = useState<Partial<DriverFormData>>({
        cnhCategories: []
    });
    const [errors, setErrors] = useState<Partial<Record<keyof DriverFormData, string>>>({});
    const [popoverOpen, setPopoverOpen] = useState(false);

    // escolhe schema conforme modo (create vs edit)
    const activeSchema = id ? driverEditSchema : driverCreateSchema;

    useEffect(() => {
        if (!id) return;

        const fetchDriver = async () => {
            setLoadingInit(true);
            try {
                const res = await apiFetch(`/motoristas/${id}`, { method: "GET" });
                if (res.ok) {
                    const data = await res.json();
                    setFormData({
                        name: data.nome ?? "",
                        email: data.email ?? "",
                        // senha não preenche
                        phone: data.telefone ?? "",
                        cpf: data.cpf ?? "",
                        rg: data.rg ?? "",
                        cnh: data.cnh ?? "",
                        cnhValidity: data.validadeCnh ? new Date(data.validadeCnh).toISOString().slice(0, 10) : "",
                        cnhCategories: Array.isArray(data.categoria) ? data.categoria : (data.categoria ? [data.categoria] : []),
                        address: data.endereco ?? "",
                        birthDate: data.dataNascimento ? new Date(data.dataNascimento).toISOString().slice(0, 10) : "",
                        hireDate: data.dataContratacao ? new Date(data.dataContratacao).toISOString().slice(0, 10) : "",
                        salary: data.salario !== undefined ? String(data.salario) : "",
                        observations: data.observacoes ?? ""
                    });
                } else {
                    const err = await res.json().catch(() => ({ error: "Motorista não encontrado." }));
                    toast({
                        title: "Erro ao carregar",
                        description: err.error || "Motorista não encontrado.",
                        variant: "destructive"
                    });
                    navigate("/motoristas");
                }
            } catch (error) {
                console.error("Erro ao buscar motorista:", error);
                toast({
                    title: "Erro de conexão",
                    description: "Não foi possível carregar os dados do motorista.",
                    variant: "destructive"
                });
                navigate("/motoristas");
            } finally {
                setLoadingInit(false);
            }
        };

        fetchDriver();
    }, [id, navigate, toast]);
//eslint-disable-next-line @typescript-eslint/no-explicit-any
    const validateField = (name: keyof DriverFormData, value: any) => {
        try {
            //eslint-disable-next-line @typescript-eslint/no-explicit-any
            const single = z.object({ [name]: (activeSchema as any).shape[name] });
            single.parse({ [name]: value });
            setErrors(prev => ({ ...prev, [name]: undefined }));
        } catch (error) {
            if (error instanceof z.ZodError) {
                setErrors(prev => ({ ...prev, [name]: error.errors[0].message }));
            }
        }
    };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleInputChange = (name: keyof DriverFormData, value: any) => {
        setFormData(prev => ({ ...prev, [name]: value }));
        validateField(name, value);
    };

    const handleCategoryToggle = (category: string) => {
        const currentCategories = formData.cnhCategories || [];
        const newCategories = currentCategories.includes(category)
            ? currentCategories.filter(c => c !== category)
            : [...currentCategories, category];

        setFormData(prev => ({ ...prev, cnhCategories: newCategories }));

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const fieldSchema = (activeSchema as any).shape.cnhCategories;
            fieldSchema.parse(newCategories);
            setErrors(prev => ({ ...prev, cnhCategories: undefined }));
        } catch (error) {
            if (error instanceof z.ZodError) {
                setErrors(prev => ({ ...prev, cnhCategories: error.errors[0].message }));
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // validação: usa schema adequado
            const validatedData = id
                ? driverEditSchema.parse(formData)
                : driverCreateSchema.parse(formData);

            //eslint-disable-next-line @typescript-eslint/no-explicit-any
            const driverData: any = {
                email: validatedData.email,
                // senha para criação; para edição só enviar se preenchida
                ...(validatedData.password ? { senha: validatedData.password } : {}),
                nome: validatedData.name,
                cpf: validatedData.cpf,
                rg: validatedData.rg,
                cnh: validatedData.cnh,
                validadeCnh: validatedData.cnhValidity,
                telefone: validatedData.phone,
                endereco: validatedData.address,
                dataContratacao: validatedData.hireDate,
                salario: validatedData.salary !== undefined ? parseFloat(String(validatedData.salary)) : undefined,
                observacoes: validatedData.observations || "",
                categoria: validatedData.cnhCategories,
                dataNascimento: validatedData.birthDate
            };

            let response;
            if (id) {
                response = await apiFetch(`/motoristas/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(driverData)
                });
            } else {
                // seu endpoint de criação atual é /motoristas/cadastrar
                response = await apiFetch("/motoristas/cadastrar", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(driverData)
                });
            }

            if (response.ok) {
                toast({
                    title: id ? "Motorista atualizado" : "Motorista cadastrado com sucesso!",
                    description: id ? "Alterações salvas." : `${validatedData.name} foi adicionado ao sistema.`,
                    variant: "default"
                });
                navigate("/motoristas");
            } else {
                const errorData = await response.json().catch(() => ({ error: "Erro ao salvar motorista." }));
                toast({
                    title: "Erro",
                    description: errorData.error || "Não foi possível salvar o motorista.",
                    variant: "destructive"
                });
            }
        } catch (error) {
            if (error instanceof z.ZodError) {
                const fieldErrors: Partial<Record<keyof DriverFormData, string>> = {};
                error.errors.forEach(err => {
                    if (err.path && err.path[0]) {
                        fieldErrors[err.path[0] as keyof DriverFormData] = err.message;
                    }
                });
                setErrors(fieldErrors);
                toast({
                    title: "Erro de validação",
                    description: "Por favor, corrija os campos destacados.",
                    variant: "destructive"
                });
            } else {
                console.error("Erro inesperado:", error);
                toast({
                    title: "Erro inesperado",
                    description: "Não foi possível processar a operação.",
                    variant: "destructive"
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (loadingInit) {
        return (
            <AdminLayout title={id ? "Carregando motorista..." : "Cadastrar Motorista"}>
                <div className="mx-auto max-w-4xl">Carregando...</div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title={id ? "Editar Motorista" : "Cadastrar Motorista"}>
            <div className="mx-auto max-w-4xl">
                <Card className="shadow-form">
                    <CardHeader className="space-y-2">
                        <div className="flex items-center space-x-2">
                            <User className="h-6 w-6 text-primary" />
                            <CardTitle className="text-2xl">{id ? "Editar Motorista" : "Cadastrar Novo Motorista"}</CardTitle>
                        </div>
                        <CardDescription>
                            {id ? "Altere os dados do motorista abaixo" : "Preencha os dados do motorista para cadastrá-lo no sistema"}
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Dados Pessoais */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">Dados Pessoais</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Nome Completo *</Label>
                                        <Input
                                            id="name"
                                            value={formData.name || ""}
                                            onChange={(e) => handleInputChange("name", e.target.value)}
                                            className={errors.name ? "border-destructive" : ""}
                                            placeholder="Digite o nome completo"
                                        />
                                        {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email *</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={formData.email || ""}
                                            onChange={(e) => handleInputChange("email", e.target.value)}
                                            className={errors.email ? "border-destructive" : ""}
                                            placeholder="exemplo@email.com"
                                        />
                                        {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="password">{id ? "Alterar senha (opcional)" : "Senha *"}</Label>
                                        <Input
                                            id="password"
                                            type="password"
                                            value={formData.password || ""}
                                            onChange={(e) => handleInputChange("password", e.target.value)}
                                            className={errors.password ? "border-destructive" : ""}
                                            placeholder="********"
                                        />
                                        {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Telefone *</Label>
                                        <Input
                                            id="phone"
                                            value={formData.phone || ""}
                                            onChange={(e) => handleInputChange("phone", e.target.value)}
                                            className={errors.phone ? "border-destructive" : ""}
                                            placeholder="(11) 99999-9999"
                                        />
                                        {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="birthDate">Data de Nascimento *</Label>
                                        <Input
                                            id="birthDate"
                                            type="date"
                                            value={formData.birthDate || ""}
                                            onChange={(e) => handleInputChange("birthDate", e.target.value)}
                                            className={errors.birthDate ? "border-destructive" : ""}
                                        />
                                        {errors.birthDate && <p className="text-sm text-destructive">{errors.birthDate}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="cpf">CPF *</Label>
                                        <Input
                                            id="cpf"
                                            value={formData.cpf || ""}
                                            onChange={(e) => handleInputChange("cpf", e.target.value)}
                                            className={errors.cpf ? "border-destructive" : ""}
                                            placeholder="12345678900"
                                            maxLength={11}
                                        />
                                        {errors.cpf && <p className="text-sm text-destructive">{errors.cpf}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="rg">RG *</Label>
                                        <Input
                                            id="rg"
                                            value={formData.rg || ""}
                                            onChange={(e) => handleInputChange("rg", e.target.value)}
                                            className={errors.rg ? "border-destructive" : ""}
                                            placeholder="12.345.678-9"
                                        />
                                        {errors.rg && <p className="text-sm text-destructive">{errors.rg}</p>}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="address">Endereço Completo *</Label>
                                    <Textarea
                                        id="address"
                                        value={formData.address || ""}
                                        onChange={(e) => handleInputChange("address", e.target.value)}
                                        className={errors.address ? "border-destructive" : ""}
                                        placeholder="Rua, número, bairro, cidade, estado, CEP"
                                        rows={3}
                                    />
                                    {errors.address && <p className="text-sm text-destructive">{errors.address}</p>}
                                </div>
                            </div>

                            {/* Dados Profissionais */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">Dados Profissionais</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="cnh">CNH *</Label>
                                        <Input
                                            id="cnh"
                                            value={formData.cnh || ""}
                                            onChange={(e) => handleInputChange("cnh", e.target.value)}
                                            className={errors.cnh ? "border-destructive" : ""}
                                            placeholder="12345678900"
                                            maxLength={11}
                                        />
                                        {errors.cnh && <p className="text-sm text-destructive">{errors.cnh}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="cnhValidity">Validade CNH *</Label>
                                        <Input
                                            id="cnhValidity"
                                            type="date"
                                            value={formData.cnhValidity || ""}
                                            onChange={(e) => handleInputChange("cnhValidity", e.target.value)}
                                            className={errors.cnhValidity ? "border-destructive" : ""}
                                        />
                                        {errors.cnhValidity && <p className="text-sm text-destructive">{errors.cnhValidity}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Categorias CNH *</Label>
                                        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={popoverOpen}
                                                    className={`w-full justify-between ${errors.cnhCategories ? "border-destructive" : ""}`}
                                                >
                          <span className={`truncate ${formData.cnhCategories && formData.cnhCategories.length > 0 ? "" : "text-muted-foreground font-normal"}`}>
                            {formData.cnhCategories && formData.cnhCategories.length > 0 ? formData.cnhCategories.join(", ") : "Selecione as categorias"}
                          </span>
                                                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-full p-0" align="start">
                                                <div className="p-4 space-y-3">
                                                    {CNH_CATEGORIES.map((category) => (
                                                        <div key={category.value} className="flex items-center space-x-2">
                                                            <Checkbox
                                                                id={`category-${category.value}`}
                                                                checked={formData.cnhCategories?.includes(category.value)}
                                                                onCheckedChange={() => handleCategoryToggle(category.value)}
                                                            />
                                                            <Label htmlFor={`category-${category.value}`} className="text-sm font-normal cursor-pointer">
                                                                {category.label}
                                                            </Label>
                                                        </div>
                                                    ))}
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                        {errors.cnhCategories && <p className="text-sm text-destructive">{errors.cnhCategories}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="hireDate">Data de Contratação *</Label>
                                        <Input
                                            id="hireDate"
                                            type="date"
                                            value={formData.hireDate || ""}
                                            onChange={(e) => handleInputChange("hireDate", e.target.value)}
                                            className={errors.hireDate ? "border-destructive" : ""}
                                        />
                                        {errors.hireDate && <p className="text-sm text-destructive">{errors.hireDate}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="salary">Salário *</Label>
                                        <Input
                                            id="salary"
                                            type="number"
                                            step="0.01"
                                            value={formData.salary || ""}
                                            onChange={(e) => handleInputChange("salary", e.target.value)}
                                            className={errors.salary ? "border-destructive" : ""}
                                            placeholder="0,00"
                                        />
                                        {errors.salary && <p className="text-sm text-destructive">{errors.salary}</p>}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="observations">Observações</Label>
                                    <Textarea
                                        id="observations"
                                        value={formData.observations || ""}
                                        onChange={(e) => handleInputChange("observations", e.target.value)}
                                        className={errors.observations ? "border-destructive" : ""}
                                        placeholder="Informações adicionais sobre o motorista"
                                        rows={3}
                                    />
                                    {errors.observations && <p className="text-sm text-destructive">{errors.observations}</p>}
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="flex justify-end space-x-4 pt-6 border-t border-border">
                                <Button type="button" variant="secondary" onClick={() => navigate("/motoristas")}>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={isLoading} className="min-w-[120px]">
                                    {isLoading ? "Salvando..." : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            {id ? "Atualizar" : "Cadastrar"}
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
