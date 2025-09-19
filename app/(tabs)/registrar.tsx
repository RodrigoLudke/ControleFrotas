import { useState, useCallback} from "react";
import {
    Pressable,
    StyleSheet,
    TextInput,
    Platform,
    Alert,
    KeyboardAvoidingView,
    ScrollView,
    View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch } from "@/services/api";

const BASE_URL = process.env.LOCALHOST;

export default function RegistrarViagem() {
    const [veiculoId, setVeiculoId] = useState("");
    const [data, setData] = useState(new Date());
    const [dataChegada, setDataChegada] = useState(new Date());
    const [horarioSaida, setHorarioSaida] = useState(new Date());
    const [horarioChegada, setHorarioChegada] = useState(new Date());
    const [finalidade, setFinalidade] = useState("");
    const [kmFinal, setKmFinal] = useState("");
    const colorScheme = useColorScheme() as "light" | "dark";

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showDataChegadaPicker, setShowDataChegadaPicker] = useState(false);
    const [showSaidaPicker, setShowSaidaPicker] = useState(false);
    const [showChegadaPicker, setShowChegadaPicker] = useState(false);

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
        }, [])
    );

    const salvarViagem = async () => {
        try {
            // Combina data + hora de saída
            const inicioViagem = new Date(data);
            inicioViagem.setHours(horarioSaida.getHours(), horarioSaida.getMinutes(), 0, 0);

            // Combina data + hora de chegada
            const fimViagem = new Date(dataChegada);
            fimViagem.setHours(horarioChegada.getHours(), horarioChegada.getMinutes(), 0, 0);

            const body = {
                veiculoId: parseInt(veiculoId),
                dataSaida: inicioViagem.toISOString(),   // já datetime completo
                dataChegada: fimViagem.toISOString(),    // idem
                finalidade,
                kmFinal: parseInt(kmFinal),
            };


            const response = await apiFetch(`/viagens`, {
                method: "POST",
                body: JSON.stringify(body),
            });

            const result = await response.json();

            if (fimViagem <= inicioViagem) {
                Alert.alert("Erro", "A data/horário de chegada não pode ser anterior à saída.");
                return;
            }

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
            setVeiculoId("");
            setFinalidade("");
            setKmFinal("");
        } catch (error) {
            console.error("Erro ao salvar viagem:", error);
            Alert.alert("Erro", "Não foi possível salvar a viagem.");
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardAvoidingView}
        >
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <ThemedView style={styles.contentWrapper}>
                    <ThemedText type="title" style={styles.title}>
                        Registrar Viagem
                    </ThemedText>

                    <TextInput
                        style={[styles.input, { borderColor: Colors[colorScheme].tint, color: Colors[colorScheme].text }]}
                        placeholder="ID do Veículo"
                        placeholderTextColor={Colors[colorScheme].icon}
                        value={veiculoId}
                        onChangeText={setVeiculoId}
                        keyboardType="numeric"
                    />

                    {/* Data */}
                    <Pressable onPress={() => setShowDatePicker(true)} style={[styles.input, styles.pressable]}>
                        <ThemedText>{data.toLocaleDateString()}</ThemedText>
                    </Pressable>
                    {showDatePicker && (
                        <DateTimePicker
                            value={data}
                            mode="date"
                            display="default"
                            onChange={(e, selected) => {
                                setShowDatePicker(false);
                                if (selected) setData(selected);
                            }}
                        />
                    )}
                    {/* Data de Chegada */}
                    <Pressable onPress={() => setShowDataChegadaPicker(true)} style={[styles.input, styles.pressable]}>
                        <ThemedText>{dataChegada.toLocaleDateString()}</ThemedText>
                    </Pressable>
                    {showDataChegadaPicker && (
                        <DateTimePicker
                            value={dataChegada}
                            mode="date"
                            display="default"
                            onChange={(e, selected) => {
                                setShowDataChegadaPicker(false);
                                if (selected) setDataChegada(selected);
                            }}
                        />
                    )}


                    {/* Horário de Saída */}
                    <Pressable onPress={() => setShowSaidaPicker(true)} style={[styles.input, styles.pressable]}>
                        <ThemedText>{horarioSaida.toLocaleTimeString()}</ThemedText>
                    </Pressable>
                    {showSaidaPicker && (
                        <DateTimePicker
                            value={horarioSaida}
                            mode="time"
                            display="default"
                            onChange={(e, selected) => {
                                setShowSaidaPicker(false);
                                if (selected) setHorarioSaida(selected);
                            }}
                        />
                    )}

                    {/* Horário de Chegada */}
                    <Pressable onPress={() => setShowChegadaPicker(true)} style={[styles.input, styles.pressable]}>
                        <ThemedText>{horarioChegada.toLocaleTimeString()}</ThemedText>
                    </Pressable>
                    {showChegadaPicker && (
                        <DateTimePicker
                            value={horarioChegada}
                            mode="time"
                            display="default"
                            onChange={(e, selected) => {
                                setShowChegadaPicker(false);
                                if (selected) setHorarioChegada(selected);
                            }}
                        />
                    )}

                    <TextInput
                        style={[styles.input, { borderColor: Colors[colorScheme].tint, color: Colors[colorScheme].text }]}
                        placeholder="Finalidade"
                        placeholderTextColor={Colors[colorScheme].icon}
                        value={finalidade}
                        onChangeText={setFinalidade}
                    />

                    <TextInput
                        style={[styles.input, { borderColor: Colors[colorScheme].tint, color: Colors[colorScheme].text }]}
                        placeholder="Km Final"
                        placeholderTextColor={Colors[colorScheme].icon}
                        value={kmFinal}
                        onChangeText={setKmFinal}
                        keyboardType="numeric"
                    />

                    <Pressable style={[styles.button, { backgroundColor: Colors[colorScheme].tint }]} onPress={salvarViagem}>
                        <ThemedText style={[styles.buttonText, { color: Colors[colorScheme].background }]}>
                            Salvar Viagem
                        </ThemedText>
                    </Pressable>
                </ThemedView>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    keyboardAvoidingView: {
        flex: 1,
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    contentWrapper: {
        flex: 1, // Isso fará com que o ThemedView se expanda para ocupar o espaço do ScrollView
        width: '100%',
        maxWidth: 600, // Largura máxima para telas maiores, você pode ajustar este valor
        paddingHorizontal: 20,
        justifyContent: 'center', // Centraliza o conteúdo verticalmente dentro do wrapper
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 20,
        textAlign: "center"
    },
    input: {
        width: "100%",
        padding: 12,
        borderWidth: 1,
        borderRadius: 10,
        marginBottom: 15,
        fontSize: 16,
    },
    pressable: {
        justifyContent: "center",
        backgroundColor: "transparent",
    },
    button: {
        width: "100%",
        padding: 15,
        borderRadius: 10,
        alignItems: "center",
    },
    buttonText: {
        fontSize: 18,
        fontWeight: "600",
    },
});