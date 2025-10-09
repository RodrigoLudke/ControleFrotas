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
import { useFocusEffect } from "@react-navigation/native";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker"; // expo install @react-native-picker/picker
import { apiFetch } from "@/services/api"; // ajuste o caminho conforme seu projeto

export default function RegistrarViagem() {
    // estados iniciais que você já tinha
    const [veiculoId, setVeiculoId] = useState<string>("");
    const [data, setData] = useState<Date>(new Date());
    const [dataChegada, setDataChegada] = useState<Date>(new Date());
    const [horarioSaida, setHorarioSaida] = useState<Date>(new Date());
    const [horarioChegada, setHorarioChegada] = useState<Date>(new Date());
    const [finalidade, setFinalidade] = useState<string>("");
    const [kmFinal, setKmFinal] = useState<string>("");

    const colorScheme = useColorScheme() as "light" | "dark";
    const theme = Colors[colorScheme];

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showDataChegadaPicker, setShowDataChegadaPicker] = useState(false);
    const [showSaidaPicker, setShowSaidaPicker] = useState(false);
    const [showChegadaPicker, setShowChegadaPicker] = useState(false);

    // lista de veículos (para popular o select). Ajuste endpoint se necessário
    const [veiculos, setVeiculos] = useState<Array<any>>([]);
    const [loadingVeiculos, setLoadingVeiculos] = useState<boolean>(false);
    const [saving, setSaving] = useState<boolean>(false);

    useFocusEffect(
        useCallback(() => {
            // Este código será executado toda vez que a tela entra em foco
            setVeiculoId("");
            setData(new Date());
            setDataChegada(new Date());
            setHorarioSaida(new Date());
            setHorarioChegada(new Date());
            setFinalidade("");
            setKmFinal("");

            // carregar veículos sempre que entrar na tela
            carregarVeiculos();
        }, [])
    );

    const carregarVeiculos = async () => {
        try {
            setLoadingVeiculos(true);
            const res = await apiFetch("/veiculos"); // ajuste se seu endpoint for diferente
            if (!res.ok) {
                // erro ao buscar veículos — tentar ler json para mensagem ou apenas fallback
                const err = await res.json().catch(() => null);
                console.warn("Erro ao buscar veículos", err);
                setVeiculos([]);
                setLoadingVeiculos(false);
                return;
            }
            const data = await res.json();
            // espera-se array de veículos; normalize se necessário
            setVeiculos(Array.isArray(data) ? data : []);
        } catch (err) {
            console.warn("Erro ao carregar veículos:", err);
            setVeiculos([]);
        } finally {
            setLoadingVeiculos(false);
        }
    };

    const formatDate = (d?: Date) => (d ? d.toLocaleDateString() : "");
    const formatTime = (d?: Date) => (d ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "");

    const salvarViagem = async () => {
        try {
            // Validações básicas antes de enviar
            if (!veiculoId) {
                Alert.alert("Erro", "Selecione o veículo.");
                return;
            }
            if (!finalidade) {
                Alert.alert("Erro", "Informe a finalidade.");
                return;
            }
            if (!kmFinal) {
                Alert.alert("Erro", "Informe a quilometragem final.");
                return;
            }

            // Combina data + hora de saída
            const inicioViagem = new Date(data);
            inicioViagem.setHours(horarioSaida.getHours(), horarioSaida.getMinutes(), 0, 0);

            // Combina data + hora de chegada
            const fimViagem = new Date(dataChegada);
            fimViagem.setHours(horarioChegada.getHours(), horarioChegada.getMinutes(), 0, 0);

            if (fimViagem <= inicioViagem) {
                Alert.alert("Erro", "A data/horário de chegada não pode ser anterior ou igual à saída.");
                return;
            }

            setSaving(true);

            const body = {
                veiculoId: parseInt(veiculoId, 10),
                dataSaida: inicioViagem.toISOString(), // datetime completo
                dataChegada: fimViagem.toISOString(),
                finalidade,
                kmFinal: parseInt(kmFinal, 10),
            };

            const response = await apiFetch("/viagens", {
                method: "POST",
                body: JSON.stringify(body),
            });

            const result = await response.json().catch(() => ({}));

            if (!response.ok) {
                if (response.status === 400 && result.ultimaKm) {
                    Alert.alert(
                        "Quilometragem inválida",
                        `A quilometragem final não pode ser menor ou igual que a última registrada (${result.ultimaKm}).`
                    );
                } else if (response.status === 403) {
                    Alert.alert("Erro de Permissão", result.error || "Você não tem permissão para realizar esta ação.");
                } else {
                    Alert.alert("Erro", result.error || "Erro ao registrar viagem.");
                }
                return;
            }

            Alert.alert("Sucesso", "Viagem registrada!");
            // limpa campos
            setVeiculoId("");
            setFinalidade("");
            setKmFinal("");
            setData(new Date());
            setDataChegada(new Date());
            setHorarioSaida(new Date());
            setHorarioChegada(new Date());
        } catch (error) {
            console.error("Erro ao salvar viagem:", error);
            Alert.alert("Erro", "Não foi possível salvar a viagem.");
        } finally {
            setSaving(false);
        }
    };

    // handlers do DateTimePicker
    const onChangeData = (_: any, selected?: Date) => {
        setShowDatePicker(false);
        if (selected) setData(selected);
    };

    const onChangeDataChegada = (_: any, selected?: Date) => {
        setShowDataChegadaPicker(false);
        if (selected) setDataChegada(selected);
    };

    const onChangeHorarioSaida = (_: any, selected?: Date) => {
        setShowSaidaPicker(false);
        if (selected) setHorarioSaida(selected);
    };

    const onChangeHorarioChegada = (_: any, selected?: Date) => {
        setShowChegadaPicker(false);
        if (selected) setHorarioChegada(selected);
    };

    return (
        <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardAvoidingView}
            >
                <ScrollView contentContainerStyle={styles.scrollContainer}>
                    <ThemedText type="title" style={styles.title}>
                        <MaterialCommunityIcons name="map-marker" size={28} /> Nova Viagem
                    </ThemedText>
                    <ThemedText style={styles.subtitle}>Registre uma nova viagem da frota</ThemedText>

                    {/* Seção: Informações do Veículo */}
                    <View style={[styles.section, { backgroundColor: theme.card }]}>
                        <ThemedText style={styles.sectionTitle}>
                            <FontAwesome5 name="truck" size={16} /> Informações do Veículo
                        </ThemedText>
                        <ThemedText style={styles.sectionNote}>Selecione o veículo responsável (ID)</ThemedText>

                        {loadingVeiculos ? (
                            <View style={{ paddingVertical: 12 }}>
                                <ActivityIndicator />
                            </View>
                        ) : (
                            <View style={[styles.pickerWrap, { borderColor: theme.border }]}>
                                <Picker
                                    selectedValue={veiculoId}
                                    onValueChange={(val) => setVeiculoId(String(val))}
                                    mode="dropdown"
                                    // Estilo condicional para Android
                                    style={Platform.OS === 'android' ? { color: theme.text } : undefined}
                                    dropdownIconColor={Platform.OS === 'android' ? theme.text : undefined}
                                    // Estilo condicional para iOS
                                    itemStyle={Platform.OS === 'ios' && { color: theme.text }}
                                >
                                    <Picker.Item label="Selecione o veículo" value="" />
                                    {veiculos.map((v: any) => (
                                        <Picker.Item
                                            key={String(v.id)}
                                            label={v.placa ? `${v.id} - ${v.placa}` : `${v.id} - ${v.nome || "Veículo"}`}
                                            value={String(v.id)}
                                        />
                                    ))}
                                </Picker>
                            </View>
                        )}
                    </View>

                    {/* Seção: Rota e Data (apenas datas e horários) */}
                    <View style={[styles.section, { backgroundColor: theme.card }]}>
                        <ThemedText style={styles.sectionTitle}>
                            <MaterialCommunityIcons name="calendar" size={16} /> Rota e Data
                        </ThemedText>
                        <ThemedText style={styles.sectionNote}>Data e horário de saída e chegada</ThemedText>

                        <View style={styles.row}>
                            <View style={{ flex: 1 }}>
                                <ThemedText style={styles.label}>Data Saída</ThemedText>
                                <Pressable
                                    style={[styles.dateBtn, { borderColor: theme.border }]}
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <ThemedText>{formatDate(data)}</ThemedText>
                                </Pressable>
                                {showDatePicker && (
                                    <DateTimePicker value={data} mode="date" display="default" onChange={onChangeData} />
                                )}
                            </View>

                            <View style={{ flex: 1 }}>
                                <ThemedText style={styles.label}>Horário Saída</ThemedText>
                                <Pressable
                                    style={[styles.dateBtn, { borderColor: theme.border }]}
                                    onPress={() => setShowSaidaPicker(true)}
                                >
                                    <ThemedText>{formatTime(horarioSaida)}</ThemedText>
                                </Pressable>
                                {showSaidaPicker && (
                                    <DateTimePicker value={horarioSaida} mode="time" display="spinner" onChange={onChangeHorarioSaida} />
                                )}
                            </View>
                        </View>

                        <View style={styles.row}>
                            <View style={{ flex: 1 }}>
                                <ThemedText style={styles.label}>Data Chegada</ThemedText>
                                <Pressable
                                    style={[styles.dateBtn, { borderColor: theme.border }]}
                                    onPress={() => setShowDataChegadaPicker(true)}
                                >
                                    <ThemedText>{formatDate(dataChegada)}</ThemedText>
                                </Pressable>
                                {showDataChegadaPicker && (
                                    <DateTimePicker value={dataChegada} mode="date" display="default" onChange={onChangeDataChegada} />
                                )}
                            </View>

                            <View style={{ flex: 1 }}>
                                <ThemedText style={styles.label}>Horário Chegada</ThemedText>
                                <Pressable
                                    style={[styles.dateBtn, { borderColor: theme.border }]}
                                    onPress={() => setShowChegadaPicker(true)}
                                >
                                    <ThemedText>{formatTime(horarioChegada)}</ThemedText>
                                </Pressable>
                                {showChegadaPicker && (
                                    <DateTimePicker value={horarioChegada} mode="time" display="spinner" onChange={onChangeHorarioChegada} />
                                )}
                            </View>
                        </View>
                    </View>

                    {/* Seção: Dados da Viagem (finalidade + km final) */}
                    <View style={[styles.section, { backgroundColor: theme.card }]}>
                        <ThemedText style={styles.sectionTitle}>
                            <MaterialCommunityIcons name="file-document" size={16} /> Dados da Viagem
                        </ThemedText>
                        <ThemedText style={styles.sectionNote}>Finalidade e quilometragem final</ThemedText>

                        <TextInput
                            placeholder="Finalidade"
                            placeholderTextColor="#9aa0a6"
                            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                            value={finalidade}
                            onChangeText={setFinalidade}
                        />

                        <TextInput
                            placeholder="KM Final"
                            placeholderTextColor="#9aa0a6"
                            keyboardType="numeric"
                            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                            value={kmFinal}
                            onChangeText={setKmFinal}
                        />
                    </View>

                    {/* botões */}
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12 }}>
                        <Pressable
                            style={[styles.btnOutline, { borderColor: theme.primary }]}
                            onPress={() => {
                                // limpar campos
                                setVeiculoId("");
                                setFinalidade("");
                                setKmFinal("");
                                setData(new Date());
                                setDataChegada(new Date());
                                setHorarioSaida(new Date());
                                setHorarioChegada(new Date());
                            }}
                        >
                            <ThemedText style={{ color: theme.primary }}>Cancelar</ThemedText>
                        </Pressable>

                        <Pressable style={[styles.btnPrimary, { backgroundColor: theme.primary }]} onPress={salvarViagem} disabled={saving}>
                            {saving ? <ActivityIndicator color="#fff" /> : <ThemedText style={{ color: theme.textBack }}>Registrar Viagem</ThemedText>}
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { paddingTop: 36, flex: 1 },
    keyboardAvoidingView: { flex: 1 },
    scrollContainer: { padding: 20, paddingBottom: 40 },
    title: { fontSize: 34, fontWeight: "800", marginBottom: 6 },
    subtitle: { color: "#6b7280", marginBottom: 12 },
    section: { borderRadius: 12, padding: 14, marginTop: 12 },
    sectionTitle: { fontSize: 16, fontWeight: "800" },
    sectionNote: { color: "#6b7280", marginBottom: 8 },
    input: { padding: 12, borderWidth: 1, borderRadius: 10, marginTop: 8 },
    dateBtn: { padding: 12, borderWidth: 1, borderRadius: 10, marginTop: 8 },
    pickerWrap: { borderWidth: 1, borderRadius: 10, overflow: "hidden", marginTop: 8 },
    row: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
    btnPrimary: { paddingVertical: 14, paddingHorizontal: 20, borderRadius: 10, minWidth: 140, alignItems: "center" },
    btnOutline: { paddingVertical: 14, paddingHorizontal: 20, borderRadius: 10, minWidth: 140, alignItems: "center", borderWidth: 1 },
    label: { color: "#6b7280", fontSize: 13 },
});
