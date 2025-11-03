// src/screens/RegistrarAbastecimento.tsx
import React, { useCallback, useState } from "react";
import {
    View,
    StyleSheet,
    TextInput,
    Pressable,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
    ActivityIndicator,
    Text,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { apiFetch } from "@/services/api";

export default function RegistrarAbastecimento() {
    const navigation = useNavigation();
    const colorScheme = useColorScheme() as "light" | "dark";
    const theme = Colors[colorScheme];

    // form fields
    const [veiculoId, setVeiculoId] = useState<string>("");
    const [data, setData] = useState<Date>(new Date());
    const [quilometragem, setQuilometragem] = useState<string>("");
    const [litros, setLitros] = useState<string>(""); // decimal
    const [valorPorLitro, setValorPorLitro] = useState<string>(""); // decimal
    const [posto, setPosto] = useState<string>("");
    const [combustivel, setCombustivel] = useState<string>(""); // enum values e.g. GASOLINA

    // pickers & UI state
    const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
    const [showTimePicker, setShowTimePicker] = useState<boolean>(false);
    const [veiculos, setVeiculos] = useState<Array<any>>([]);
    const [loadingVeiculos, setLoadingVeiculos] = useState<boolean>(false);
    const [loadingInit, setLoadingInit] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);

    useFocusEffect(
        useCallback(() => {
            carregarVeiculos();
            // reset form
            setVeiculoId("");
            setData(new Date());
            setQuilometragem("");
            setLitros("");
            setValorPorLitro("");
            setPosto("");
            setCombustivel("");
        }, [])
    );

    const carregarVeiculos = async () => {
        try {
            setLoadingVeiculos(true);
            const res = await apiFetch("/veiculos/disponiveis");
            if (!res.ok) {
                setVeiculos([]);
                return;
            }
            const data = await res.json();
            setVeiculos(Array.isArray(data) ? data : []);
        } catch (err) {
            console.warn("Erro ao carregar veículos:", err);
            setVeiculos([]);
        } finally {
            setLoadingVeiculos(false);
            setLoadingInit(false);
        }
    };

    const formatDate = (d?: Date) => (d ? d.toLocaleDateString() : "");
    const formatTime = (d?: Date) => (d ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "");

    // Date/Time flow (same logic as alert screen)
    const openDateTimePicker = () => {
        if (Platform.OS === "android") {
            setShowDatePicker(true); // date first, then time
        } else {
            setShowDatePicker(true); // iOS single datetime
        }
    };

    const onChangeDate = (event: any, selected?: Date) => {
        if (Platform.OS === "android") {
            setShowDatePicker(false);
            if (event?.type === "dismissed") {
                return;
            }
            const picked = selected ?? data;
            const newDate = new Date(picked);
            // keep existing time if present
            setData(prev => {
                const copy = new Date(newDate);
                copy.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
                return copy;
            });
            setShowTimePicker(true);
        } else {
            setShowDatePicker(false);
            if (selected) setData(selected);
        }
    };

    const onChangeTime = (event: any, selected?: Date) => {
        setShowTimePicker(false);
        if (event?.type === "dismissed") return;
        if (!selected) return;
        setData(prev => {
            const copy = new Date(prev);
            copy.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
            return copy;
        });
    };

    const parseDecimal = (s: string) => {
        if (!s) return NaN;
        // accept comma as decimal separator
        const normalized = s.replace(/\s+/g, "").replace(",", ".");
        const n = Number(normalized);
        return Number.isFinite(n) ? n : NaN;
    };

    const validar = () => {
        if (!veiculoId) {
            Alert.alert("Erro", "Selecione o veículo.");
            return false;
        }
        if (!quilometragem || Number.isNaN(Number(quilometragem))) {
            Alert.alert("Erro", "Informe a quilometragem correta.");
            return false;
        }
        const l = parseDecimal(litros);
        if (Number.isNaN(l) || l <= 0) {
            Alert.alert("Erro", "Informe a quantidade de litros válida.");
            return false;
        }
        const vpl = parseDecimal(valorPorLitro);
        if (Number.isNaN(vpl) || vpl <= 0) {
            Alert.alert("Erro", "Informe um valor por litro válido.");
            return false;
        }
        if (!combustivel) {
            Alert.alert("Erro", "Selecione o tipo de combustível.");
            return false;
        }
        return true;
    };

    const enviarAbastecimento = async () => {
        try {
            if (!validar()) return;

            setSaving(true);

            const l = parseDecimal(litros);
            const vpl = parseDecimal(valorPorLitro);
            const custoTotal = Number((l * vpl).toFixed(2));

            const payload: any = {
                veiculoId: parseInt(veiculoId, 10),
                data: new Date(data).toISOString(),
                quilometragem: parseInt(quilometragem, 10),
                litros: l,
                valorPorLitro: vpl,
                custoTotal,
                combustivel, // string enum
                posto: posto?.trim() || undefined,
            };

            const res = await apiFetch("/abastecimentos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const result = await res.json().catch(() => ({}));

            if (!res.ok) {
                const message = result.error || "Erro ao registrar abastecimento.";
                Alert.alert("Erro", message);
                return;
            }

            Alert.alert("Sucesso", "Abastecimento registrado com sucesso.");
            // @ts-ignore navigation typing
            navigation.goBack?.();
        } catch (err) {
            console.error("Erro ao registrar abastecimento:", err);
            Alert.alert("Erro", "Não foi possível registrar o abastecimento.");
        } finally {
            setSaving(false);
        }
    };

    if (loadingInit) {
        return (
            <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
                <View style={{ padding: 20 }}>
                    <ActivityIndicator />
                    <Text style={{ marginTop: 8 }}>Carregando...</Text>
                </View>
            </ThemedView>
        );
    }

    return (
        <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoidingView}>
                <ScrollView contentContainerStyle={styles.scrollContainer}>
                    <ThemedText type="title" style={styles.title}>
                        <MaterialCommunityIcons name="fuel" size={28} /> Registrar Abastecimento
                    </ThemedText>

                    {/* Veículo */}
                    <View style={[styles.section, { backgroundColor: theme.card }]}>
                        <ThemedText style={styles.sectionTitle}>
                            <FontAwesome5 name="truck" size={14} /> Veículo
                        </ThemedText>
                        {loadingVeiculos ? (
                            <ActivityIndicator />
                        ) : (
                            <View style={[styles.pickerWrap, { borderColor: theme.border }]}>
                                <Picker
                                    selectedValue={veiculoId}
                                    onValueChange={(val) => setVeiculoId(String(val))}
                                    mode="dropdown"
                                    style={Platform.OS === "android" ? { color: veiculoId ? theme.text : "#9aa0a6" } : undefined}
                                    dropdownIconColor={Platform.OS === "android" ? theme.text : undefined}
                                >
                                    <Picker.Item label="Selecione o veículo" value="" />
                                    {veiculos.map((v: any) => (
                                        <Picker.Item
                                            key={String(v.id)}
                                            label={v.placa ? `${v.placa} — ${v.modelo ?? ""}` : `Veículo ${v.id}`}
                                            value={String(v.id)}
                                        />
                                    ))}
                                </Picker>
                            </View>
                        )}
                    </View>

                    {/* Data / Combustível */}
                    <View style={[styles.section, { backgroundColor: theme.card }]}>
                        <ThemedText style={styles.sectionTitle}>
                            <MaterialCommunityIcons name="calendar" size={14} /> Detalhes
                        </ThemedText>

                        <View style={styles.row}>
                            <View style={{ flex: 0.8 }}>
                                <ThemedText style={styles.label}>Data / Hora</ThemedText>
                                <Pressable style={[styles.dateBtn, { borderColor: theme.border }]} onPress={openDateTimePicker}>
                                    <ThemedText>{`${formatDate(data)} ${formatTime(data)}`}</ThemedText>
                                </Pressable>

                                {showDatePicker && Platform.OS === "ios" && (
                                    <DateTimePicker value={data} mode="datetime" display="default" onChange={onChangeDate} />
                                )}
                                {showDatePicker && Platform.OS === "android" && (
                                    <DateTimePicker value={data} mode="date" display="calendar" onChange={onChangeDate} />
                                )}
                                {showTimePicker && Platform.OS === "android" && (
                                    <DateTimePicker value={data} mode="time" display="spinner" onChange={onChangeTime} />
                                )}
                            </View>

                            <View style={{ flex: 1 }}>
                                <ThemedText style={styles.label}>Combustível</ThemedText>
                                <View style={[styles.pickerWrap, { borderColor: theme.border }]}>
                                    <Picker
                                        selectedValue={combustivel}
                                        onValueChange={(val) => setCombustivel(String(val))}
                                        mode="dropdown"
                                        style={Platform.OS === "android" ? { color: combustivel ? theme.text : "#9aa0a6" } : undefined}
                                    >
                                        <Picker.Item label="Selecione o combustível" value="" />
                                        <Picker.Item label="Gasolina" value="gasolina" />
                                        <Picker.Item label="Alcool" value="álcool" />
                                        <Picker.Item label="Flex" value="flex" />
                                        <Picker.Item label="Diesel" value="diesel" />
                                        <Picker.Item label="Elétrico" value="eletrico" />
                                    </Picker>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Valores / Quilometragem */}
                    <View style={[styles.section, { backgroundColor: theme.card }]}>
                        <ThemedText style={styles.sectionTitle}>
                            <MaterialCommunityIcons name="speedometer" size={14} /> Medidas e Valores
                        </ThemedText>

                        <TextInput
                            placeholder="Quilometragem"
                            placeholderTextColor="#9aa0a6"
                            keyboardType="numeric"
                            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                            value={quilometragem}
                            onChangeText={setQuilometragem}
                        />

                        <TextInput
                            placeholder="Litros abastecidos (ex: 45.32)"
                            placeholderTextColor="#9aa0a6"
                            keyboardType="numeric"
                            style={[styles.input, { color: theme.text, borderColor: theme.border, marginTop: 8 }]}
                            value={litros}
                            onChangeText={setLitros}
                        />

                        <TextInput
                            placeholder="Valor por litro (ex: 5.599)"
                            placeholderTextColor="#9aa0a6"
                            keyboardType="numeric"
                            style={[styles.input, { color: theme.text, borderColor: theme.border, marginTop: 8 }]}
                            value={valorPorLitro}
                            onChangeText={setValorPorLitro}
                        />

                        <TextInput
                            placeholder="Posto (opcional)"
                            placeholderTextColor="#9aa0a6"
                            style={[styles.input, { color: theme.text, borderColor: theme.border, marginTop: 8 }]}
                            value={posto}
                            onChangeText={setPosto}
                        />
                    </View>

                    {/* Botões */}
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12 }}>
                        <Pressable style={[styles.btnOutline, { borderColor: theme.primary }]} onPress={() => navigation.goBack()}>
                            <ThemedText style={{ color: theme.primary }}>Voltar</ThemedText>
                        </Pressable>

                        <Pressable style={[styles.btnPrimary, { backgroundColor: theme.primary }]} onPress={enviarAbastecimento} disabled={saving}>
                            {saving ? <ActivityIndicator color="#fff" /> : <ThemedText style={{ color: theme.textBack }}>Registrar Abastecimento</ThemedText>}
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    keyboardAvoidingView: { flex: 1 },
    scrollContainer: { padding: 20, paddingBottom: 40 },
    title: { fontSize: 28, fontWeight: "800", marginBottom: 6 },
    section: { borderRadius: 12, padding: 14, marginTop: 12 },
    sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 6 },
    input: { padding: 12, borderWidth: 1, borderRadius: 10 },
    dateBtn: { padding: 12, borderWidth: 1, borderRadius: 10, marginTop: 11 },
    pickerWrap: { borderWidth: 1, borderRadius: 10, overflow: "hidden", marginTop: 8 },
    row: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
    btnPrimary: { paddingVertical: 14, paddingHorizontal: 20, borderRadius: 10, minWidth: 140, alignItems: "center" },
    btnOutline: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, minWidth: 100, alignItems: "center", borderWidth: 1 },
    label: { color: "#6b7280", fontSize: 13 },
});
