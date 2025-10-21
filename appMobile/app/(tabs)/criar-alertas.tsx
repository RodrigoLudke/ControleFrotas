// src/screens/RegistrarAlertaManutencao.tsx
import React, { useCallback, useEffect, useState } from "react";
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

export default function RegistrarAlertaManutencao() {
    const navigation = useNavigation();
    const colorScheme = useColorScheme() as "light" | "dark";
    const theme = Colors[colorScheme];

    const [veiculoId, setVeiculoId] = useState<string>("");
    const [descricao, setDescricao] = useState<string>("");
    const [quilometragem, setQuilometragem] = useState<string>("");
    const [tipo, setTipo] = useState<"SOLICITACAO" | "REGISTRO_RAPIDO">("SOLICITACAO");
    const [urgente, setUrgente] = useState<boolean>(false);
    const [data, setData] = useState<Date>(new Date());

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [veiculos, setVeiculos] = useState<Array<any>>([]);
    const [loadingVeiculos, setLoadingVeiculos] = useState<boolean>(false);
    const [saving, setSaving] = useState<boolean>(false);
    const [loadingInit, setLoadingInit] = useState<boolean>(true);

    useFocusEffect(
        useCallback(() => {
            carregarVeiculos();
            // reset form quando abrir nova criação
            setDescricao("");
            setQuilometragem("");
            setVeiculoId("");
            setTipo("SOLICITACAO");
            setUrgente(false);
            setData(new Date());
        }, [])
    );

    const carregarVeiculos = async () => {
        try {
            setLoadingVeiculos(true);
            const res = await apiFetch("/veiculos");
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

    const onChangeData = (_: any, selected?: Date) => {
        setShowDatePicker(false);
        if (selected) setData(selected);
    };

    const validar = () => {
        if (!veiculoId) {
            Alert.alert("Erro", "Selecione o veículo.");
            return false;
        }
        if (!descricao || descricao.trim().length < 6) {
            Alert.alert("Erro", "Descreva o problema com pelo menos 6 caracteres.");
            return false;
        }
        return true;
    };

    const enviarAlerta = async () => {
        try {
            if (!validar()) return;

            setSaving(true);

            const payload: any = {
                veiculoId: parseInt(veiculoId, 10),
                data: new Date(data).toISOString(),
                descricao: descricao.trim(),
                tipo, // SOLICITACAO | REGISTRO_RAPIDO
                urgente,
            };
            if (quilometragem) payload.quilometragem = parseInt(quilometragem, 10);

            const res = await apiFetch("/alertas", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const result = await res.json().catch(() => ({}));

            if (!res.ok) {
                const message = result.error || "Erro ao enviar alerta.";
                Alert.alert("Erro", message);
                return;
            }

            Alert.alert("Sucesso", "Alerta enviado. A equipe de manutenção será notificada.");
            navigation.goBack();
        } catch (err) {
            console.error("Erro ao enviar alerta:", err);
            Alert.alert("Erro", "Não foi possível enviar o alerta.");
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
                        <MaterialCommunityIcons name="wrench" size={28} /> Solicitar Manutenção
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

                    {/* Data / Urgente / Tipo */}
                    <View style={[styles.section, { backgroundColor: theme.card }]}>
                        <ThemedText style={styles.sectionTitle}>
                            <MaterialCommunityIcons name="calendar" size={14} /> Detalhes
                        </ThemedText>

                        <View style={styles.row}>
                            <View style={{ flex: 1 }}>
                                <ThemedText style={styles.label}>Data / Hora</ThemedText>
                                <Pressable style={[styles.dateBtn, { borderColor: theme.border }]} onPress={() => setShowDatePicker(true)}>
                                    <ThemedText>{`${formatDate(data)} ${formatTime(data)}`}</ThemedText>
                                </Pressable>
                                {showDatePicker && <DateTimePicker value={data} mode="datetime" display="default" onChange={onChangeData} />}
                            </View>

                            <View style={{ flex: 1 }}>
                                <ThemedText style={styles.label}>Urgente</ThemedText>
                                <Pressable
                                    style={[styles.dateBtn, { borderColor: theme.border, justifyContent: "center" }]}
                                    onPress={() => setUrgente((s) => !s)}
                                >
                                    <ThemedText>{urgente ? "Sim — Urgente" : "Não"}</ThemedText>
                                </Pressable>
                            </View>
                        </View>

                        <View style={{ marginTop: 8 }}>
                            <ThemedText style={styles.label}>Tipo</ThemedText>
                            <View style={[styles.pickerWrap, { borderColor: theme.border }]}>
                                <Picker
                                    selectedValue={tipo}
                                    onValueChange={(val) => setTipo(val as any)}
                                    mode="dropdown"
                                    style={Platform.OS === "android" ? { color: "#111" } : undefined}
                                >
                                    <Picker.Item label="Solicitação de manutenção (motorista solicita reparo)" value="SOLICITACAO" />
                                    <Picker.Item label="Registro rápido (manutenção pequena já realizada)" value="REGISTRO_RAPIDO" />
                                </Picker>
                            </View>
                        </View>
                    </View>

                    {/* Descrição / Quilometragem */}
                    <View style={[styles.section, { backgroundColor: theme.card }]}>
                        <ThemedText style={styles.sectionTitle}>
                            <MaterialCommunityIcons name="file-document" size={14} /> Descrição
                        </ThemedText>

                        <TextInput
                            placeholder="Descreva o problema (ex: pneu furado, barulho no motor, etc.)"
                            placeholderTextColor="#9aa0a6"
                            multiline
                            numberOfLines={4}
                            style={[styles.textarea, { color: theme.text, borderColor: theme.border }]}
                            value={descricao}
                            onChangeText={setDescricao}
                        />

                        <TextInput
                            placeholder="Quilometragem atual (opcional)"
                            placeholderTextColor="#9aa0a6"
                            keyboardType="numeric"
                            style={[styles.input, { color: theme.text, borderColor: theme.border, marginTop: 8 }]}
                            value={quilometragem}
                            onChangeText={setQuilometragem}
                        />
                    </View>

                    {/* Botões */}
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12 }}>
                        <Pressable style={[styles.btnOutline, { borderColor: theme.primary }]} onPress={() => navigation.goBack()}>
                            <ThemedText style={{ color: theme.primary }}>Voltar</ThemedText>
                        </Pressable>

                        <Pressable style={[styles.btnPrimary, { backgroundColor: theme.primary }]} onPress={enviarAlerta} disabled={saving}>
                            {saving ? <ActivityIndicator color="#fff" /> : <ThemedText style={{ color: theme.textBack }}>Enviar Alerta</ThemedText>}
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
    textarea: { padding: 12, borderWidth: 1, borderRadius: 10, textAlignVertical: "top" },
    dateBtn: { padding: 12, borderWidth: 1, borderRadius: 10 },
    pickerWrap: { borderWidth: 1, borderRadius: 10, overflow: "hidden", marginTop: 8 },
    row: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
    btnPrimary: { paddingVertical: 14, paddingHorizontal: 20, borderRadius: 10, minWidth: 140, alignItems: "center" },
    btnOutline: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, minWidth: 100, alignItems: "center", borderWidth: 1 },
    label: { color: "#6b7280", fontSize: 13 },
});
