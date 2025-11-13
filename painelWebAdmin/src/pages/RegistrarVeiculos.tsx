// src/pages/RegistrarVeiculos.tsx
import {useEffect, useState} from "react";
import {AdminLayout} from "@/components/layout/AdminLayout";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Textarea} from "@/components/ui/textarea";
import {useToast} from "@/hooks/use-toast";
import {z} from "zod";
import {Car, Save} from "lucide-react";
import {apiFetch} from "@/services/api";
import {useNavigate, useParams} from "react-router-dom";
import {cn} from "@/lib/utils";

const VEHICLE_TYPES = [
    {value: "B", label: "Carro"},
    {value: "A", label: "Moto"},
    {value: "C", label: "Caminhão"},
    {value: "D", label: "Ônibus"},
    {value: "E", label: "Caminhão Acoplado"},
];

const vehicleCreateSchema = z.object({
    vehicleTypes: z.string({required_error: "Selecione a categoria"}).min(1, "Selecione a categoria"),
    plate: z.string().min(7, "Placa deve ter pelo menos 7 caracteres").max(8, "Placa inválida"),
    brand: z.string().min(2, "Marca é obrigatória").max(50, "Marca muito longa"),
    model: z.string().min(2, "Modelo é obrigatório").max(50, "Modelo muito longo"),
    year: z.string().min(4, "Ano inválido").max(4, "Ano inválido"),
    color: z.string().min(2, "Cor é obrigatória").max(30, "Cor muito longa"),
    chassis: z.string().min(17, "Chassi deve ter 17 caracteres").max(17, "Chassi deve ter 17 caracteres"),
    renavam: z.string().min(9, "RENAVAM deve ter pelo menos 9 dígitos").max(11, "RENAVAM muito longo"),
    fuel: z.enum(["gasolina", "alcool", "flex", "diesel", "eletrico", "hibrido"], {
        required_error: "Selecione o tipo de combustível",
    }),
    capacity: z.string().min(1, "Capacidade é obrigatória"),
    mileage: z.string().min(1, "Quilometragem é obrigatória"),
    purchaseDate: z.string().min(1, "Data de compra é obrigatória"),
    purchaseValue: z.string().min(1, "Valor de compra é obrigatório"),
    insuranceCompany: z.string().max(100, "Nome da seguradora muito longo").optional(),
    insurancePolicy: z.string().max(50, "Número da apólice muito longo").optional(),
    insuranceExpiry: z.string().optional(),
    observations: z.string().max(500, "Observações muito longas").optional(),
});

// Para edição: todos os campos opcionais (permite PATCH parcial)
const vehicleEditSchema = vehicleCreateSchema.partial();

type VehicleFormData = z.infer<typeof vehicleCreateSchema>;

const fuelOptions = [
    {value: "gasolina", label: "Gasolina"},
    {value: "alcool", label: "Álcool"},
    {value: "flex", label: "Flex"},
    {value: "diesel", label: "Diesel"},
    {value: "eletrico", label: "Elétrico"},
    {value: "hibrido", label: "Híbrido"},
];

export default function RegisterVehicle() {
    const {toast} = useToast();
    const navigate = useNavigate();
    const {id} = useParams<{ id?: string }>();

    const [isLoading, setIsLoading] = useState(false);
    const [loadingInit, setLoadingInit] = useState<boolean>(!!id);
    const [formData, setFormData] = useState<Partial<VehicleFormData>>({
        vehicleTypes: undefined,
    });
    const [errors, setErrors] = useState<Partial<Record<keyof VehicleFormData, string>>>({});
    const [popoverOpen, setPopoverOpen] = useState(false);

    // escolhe schema conforme modo (create vs edit)
    const activeSchema = id ? vehicleEditSchema : vehicleCreateSchema;

    useEffect(() => {
        if (!id) {
            setLoadingInit(false);
            return;
        }

        const fetchVehicle = async () => {
            setLoadingInit(true);
            try {
                const res = await apiFetch(`/veiculos/${id}`, {method: "GET"});
                if (res.ok) {
                    const data = await res.json();

                    // mapear campos do backend para formData (sem motoristas)
                    setFormData({
                        vehicleTypes: data.vehicleTypes ?? undefined,
                        plate: data.placa ?? "",
                        brand: data.marca ?? "",
                        model: data.modelo ?? "",
                        year: data.ano ? String(data.ano) : "",
                        color: data.cor ?? "",
                        chassis: data.chassi ?? "",
                        renavam: data.renavam ?? "",
                        fuel: data.combustivel ?? undefined,
                        capacity: data.capacidade !== undefined && data.capacidade !== null ? String(data.capacidade) : "",
                        mileage: data.quilometragem !== undefined && data.quilometragem !== null ? String(data.quilometragem) : "",
                        purchaseDate: data.dataCompra ? new Date(data.dataCompra).toISOString().slice(0, 10) : "",
                        purchaseValue: data.valorCompra !== undefined && data.valorCompra !== null ? String(data.valorCompra) : "",
                        insuranceCompany: data.seguradora ?? "",
                        insurancePolicy: data.apoliceSeguro ?? "",
                        insuranceExpiry: data.validadeSeguro ? new Date(data.validadeSeguro).toISOString().slice(0, 10) : "",
                        observations: data.observacoes ?? ""
                    });
                } else {
                    const err = await res.json().catch(() => ({error: "Veículo não encontrado."}));
                    toast({
                        title: "Erro ao carregar veículo",
                        description: err.error || "Veículo não encontrado.",
                        variant: "destructive",
                    });
                    navigate("/veiculos");
                }
            } catch (error) {
                console.error("Erro ao buscar veículo:", error);
                toast({
                    title: "Erro de conexão",
                    description: "Não foi possível carregar os dados do veículo.",
                    variant: "destructive",
                });
                navigate("/veiculos");
            } finally {
                setLoadingInit(false);
            }
        };

        fetchVehicle();
    }, [id, navigate, toast]);

    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    const validateField = (name: keyof VehicleFormData, value: any) => {
        try {
            // cria um schema parcial para validar só o campo
            //eslint-disable-next-line @typescript-eslint/no-explicit-any
            const single = z.object({[name]: (activeSchema as any).shape[name]});
            single.parse({[name]: value});
            setErrors((prev) => ({...prev, [name]: undefined}));
        } catch (error) {
            if (error instanceof z.ZodError) {
                setErrors((prev) => ({...prev, [name]: error.errors[0].message}));
            }
        }
    };

    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleInputChange = (name: keyof VehicleFormData, value: any) => {
        setFormData((prev) => ({...prev, [name]: value}));
        validateField(name, value);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const finalData = {...formData};
            const validatedData = id ? vehicleEditSchema.parse(finalData) : vehicleCreateSchema.parse(finalData);
            //eslint-disable-next-line @typescript-eslint/no-explicit-any
            const vehicleData: any = {
                placa: validatedData.plate,
                marca: validatedData.brand,
                modelo: validatedData.model,
                ano: validatedData.year,
                cor: validatedData.color,
                chassi: validatedData.chassis,
                renavam: validatedData.renavam,
                combustivel: validatedData.fuel,
                capacidade: validatedData.capacity,
                quilometragem: validatedData.mileage,
                dataCompra: validatedData.purchaseDate,
                valorCompra: validatedData.purchaseValue,
                seguradora: validatedData.insuranceCompany || "",
                apoliceSeguro: validatedData.insurancePolicy || "",
                validadeSeguro: validatedData.insuranceExpiry || "",
                observacoes: validatedData.observations || "",
                categoria: validatedData.vehicleTypes // caso queira persistir tipos
            };

            let response;
            if (id) {
                response = await apiFetch(`/veiculos/${id}`, {
                    method: "PATCH",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify(vehicleData),
                });
            } else {
                // criação (usa /veiculos/cadastrar para compatibilidade com backend)
                response = await apiFetch("/veiculos/cadastrar", {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify(vehicleData),
                });
            }

            if (response.ok) {
                toast({
                    title: id ? "Veículo atualizado" : "Veículo cadastrado com sucesso!",
                    description: id ? "Alterações salvas." : `${validatedData.brand} ${validatedData.model} (${validatedData.plate}) cadastrado.`,
                    variant: "default",
                });
                navigate("/veiculos");
            } else {
                const errorData = await response.json().catch(() => ({error: "Erro ao salvar veículo."}));
                toast({
                    title: "Erro",
                    description: errorData.error || "Não foi possível salvar o veículo.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            if (error instanceof z.ZodError) {
                const fieldErrors: Partial<Record<keyof VehicleFormData, string>> = {};
                error.errors.forEach((err) => {
                    if (err.path && err.path[0]) {
                        fieldErrors[err.path[0] as keyof VehicleFormData] = err.message;
                    }
                });
                setErrors(fieldErrors);
                toast({
                    title: "Erro de validação",
                    description: "Por favor, corrija os campos destacados.",
                    variant: "destructive",
                });
            } else {
                console.error("Erro inesperado:", error);
                toast({
                    title: "Erro inesperado",
                    description: "Não foi possível processar a operação.",
                    variant: "destructive",
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (loadingInit) {
        return (
            <AdminLayout title={id ? "Carregando veículo..." : "Cadastrar Veículo"}>
                <div className="mx-auto max-w-4xl">Carregando...</div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title={id ? "Editar Veículo" : "Cadastrar Veículo"}>
            <div className="mx-auto max-w-4xl">
                <Card className="shadow-form">
                    <CardHeader className="space-y-2">
                        <div className="flex items-center space-x-2">
                            <Car className="h-6 w-6 text-primary"/>
                            <CardTitle
                                className="text-2xl">{id ? "Editar Veículo" : "Cadastrar Novo Veículo"}</CardTitle>
                        </div>
                        <CardDescription>{id ? "Altere os dados do veículo abaixo" : "Preencha os dados do veículo para cadastrá-lo no sistema"}</CardDescription>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Dados do Veículo */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">Dados do
                                    Veículo</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="categoria">Categoria (Tipo) *</Label>
                                        <Select value={formData.vehicleTypes || ""}
                                                onValueChange={(value) => handleInputChange("vehicleTypes", value)}>
                                            <SelectTrigger
                                                className={cn(
                                                    errors.vehicleTypes ? "border-destructive" : "",
                                                    !formData.vehicleTypes && "text-muted-foreground",
                                                )}
                                            >
                                                <SelectValue placeholder="Selecione a categoria"/>
                                            </SelectTrigger>
                                            <SelectContent>
                                                {VEHICLE_TYPES.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.vehicleTypes &&
                                            <p className="text-sm text-destructive">{errors.vehicleTypes}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="plate">Placa *</Label>
                                        <Input id="plate" value={formData.plate || ""}
                                               onChange={(e) => handleInputChange("plate", e.target.value.toUpperCase())}
                                               className={errors.plate ? "border-destructive" : ""}
                                               placeholder="ABC1234" maxLength={8}/>
                                        {errors.plate && <p className="text-sm text-destructive">{errors.plate}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="brand">Marca *</Label>
                                        <Input id="brand" value={formData.brand || ""}
                                               onChange={(e) => handleInputChange("brand", e.target.value)}
                                               className={errors.brand ? "border-destructive" : ""}
                                               placeholder="Ex: Toyota, Volkswagen"/>
                                        {errors.brand && <p className="text-sm text-destructive">{errors.brand}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="model">Modelo *</Label>
                                        <Input id="model" value={formData.model || ""}
                                               onChange={(e) => handleInputChange("model", e.target.value)}
                                               className={errors.model ? "border-destructive" : ""}
                                               placeholder="Ex: Corolla, Gol"/>
                                        {errors.model && <p className="text-sm text-destructive">{errors.model}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="year">Ano *</Label>
                                        <Input id="year" type="number" value={formData.year || ""}
                                               onChange={(e) => handleInputChange("year", e.target.value)}
                                               className={errors.year ? "border-destructive" : ""} placeholder="2023"/>
                                        {errors.year && <p className="text-sm text-destructive">{errors.year}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="color">Cor *</Label>
                                        <Input id="color" value={formData.color || ""}
                                               onChange={(e) => handleInputChange("color", e.target.value)}
                                               className={errors.color ? "border-destructive" : ""}
                                               placeholder="Branco, Preto, Prata"/>
                                        {errors.color && <p className="text-sm text-destructive">{errors.color}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="fuel">Combustível *</Label>
                                        <Select value={formData.fuel || ""}
                                                onValueChange={(value) => handleInputChange("fuel", value)}>
                                            <SelectTrigger
                                                className={errors.fuel ? "border-destructive" : ""}><SelectValue
                                                placeholder="Selecione o combustível"/></SelectTrigger>
                                            <SelectContent>{fuelOptions.map((option) => (<SelectItem key={option.value}
                                                                                                     value={option.value}>{option.label}</SelectItem>))}</SelectContent>
                                        </Select>
                                        {errors.fuel && <p className="text-sm text-destructive">{errors.fuel}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="chassis">Chassi *</Label>
                                        <Input id="chassis" value={formData.chassis || ""}
                                               onChange={(e) => handleInputChange("chassis", e.target.value.toUpperCase())}
                                               className={errors.chassis ? "border-destructive" : ""}
                                               placeholder="17 caracteres" maxLength={17}/>
                                        {errors.chassis && <p className="text-sm text-destructive">{errors.chassis}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="renavam">RENAVAM *</Label>
                                        <Input id="renavam" value={formData.renavam || ""}
                                               onChange={(e) => handleInputChange("renavam", e.target.value)}
                                               className={errors.renavam ? "border-destructive" : ""}
                                               placeholder="123456789"/>
                                        {errors.renavam && <p className="text-sm text-destructive">{errors.renavam}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="capacity">Capacidade de Passageiros *</Label>
                                        <Input id="capacity" type="number" value={formData.capacity || ""}
                                               onChange={(e) => handleInputChange("capacity", e.target.value)}
                                               className={errors.capacity ? "border-destructive" : ""} placeholder="5"/>
                                        {errors.capacity &&
                                            <p className="text-sm text-destructive">{errors.capacity}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="mileage">Quilometragem Atual *</Label>
                                        <Input id="mileage" type="number" value={formData.mileage || ""}
                                               onChange={(e) => handleInputChange("mileage", e.target.value)}
                                               className={errors.mileage ? "border-destructive" : ""}
                                               placeholder="50000"/>
                                        {errors.mileage && <p className="text-sm text-destructive">{errors.mileage}</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Dados de Compra */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">Dados de
                                    Compra</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="purchaseDate">Data de Compra *</Label>
                                        <Input id="purchaseDate" type="date" value={formData.purchaseDate || ""}
                                               onChange={(e) => handleInputChange("purchaseDate", e.target.value)}
                                               className={errors.purchaseDate ? "border-destructive" : ""}/>
                                        {errors.purchaseDate &&
                                            <p className="text-sm text-destructive">{errors.purchaseDate}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="purchaseValue">Valor de Compra *</Label>
                                        <Input id="purchaseValue" type="number" step="0.01"
                                               value={formData.purchaseValue || ""}
                                               onChange={(e) => handleInputChange("purchaseValue", e.target.value)}
                                               className={errors.purchaseValue ? "border-destructive" : ""}
                                               placeholder="50000.00"/>
                                        {errors.purchaseValue &&
                                            <p className="text-sm text-destructive">{errors.purchaseValue}</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Dados do Seguro */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">Dados do
                                    Seguro (Opcional)</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="insuranceCompany">Seguradora</Label>
                                        <Input id="insuranceCompany" value={formData.insuranceCompany || ""}
                                               onChange={(e) => handleInputChange("insuranceCompany", e.target.value)}
                                               className={errors.insuranceCompany ? "border-destructive" : ""}
                                               placeholder="Nome da seguradora"/>
                                        {errors.insuranceCompany &&
                                            <p className="text-sm text-destructive">{errors.insuranceCompany}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="insurancePolicy">Número da Apólice</Label>
                                        <Input id="insurancePolicy" value={formData.insurancePolicy || ""}
                                               onChange={(e) => handleInputChange("insurancePolicy", e.target.value)}
                                               className={errors.insurancePolicy ? "border-destructive" : ""}
                                               placeholder="123456789"/>
                                        {errors.insurancePolicy &&
                                            <p className="text-sm text-destructive">{errors.insurancePolicy}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="insuranceExpiry">Vencimento do Seguro</Label>
                                        <Input id="insuranceExpiry" type="date" value={formData.insuranceExpiry || ""}
                                               onChange={(e) => handleInputChange("insuranceExpiry", e.target.value)}
                                               className={errors.insuranceExpiry ? "border-destructive" : ""}/>
                                        {errors.insuranceExpiry &&
                                            <p className="text-sm text-destructive">{errors.insuranceExpiry}</p>}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="observations">Observações</Label>
                                    <Textarea id="observations" value={formData.observations || ""}
                                              onChange={(e) => handleInputChange("observations", e.target.value)}
                                              className={errors.observations ? "border-destructive" : ""}
                                              placeholder="Informações adicionais sobre o veículo" rows={3}/>
                                    {errors.observations &&
                                        <p className="text-sm text-destructive">{errors.observations}</p>}
                                </div>
                            </div>

                            {/* Botões */}
                            <div className="flex justify-end space-x-4 pt-6 border-t border-border">
                                <Button type="button" variant="secondary"
                                        onClick={() => navigate("/veiculos")}>Cancelar</Button>
                                <Button type="submit" disabled={isLoading} className="min-w-[120px]">
                                    {isLoading ? "Salvando..." : (<><Save
                                        className="mr-2 h-4 w-4"/>{id ? "Atualizar" : "Cadastrar"}</>)}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
