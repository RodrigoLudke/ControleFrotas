import { useState } from "react";
import {
    Pressable,
    StyleSheet,
    TextInput,
    Platform,
    Alert,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch } from "@/services/api";
import ParallaxScrollView from "@/components/ParallaxScrollView";

// Use a variável de ambiente para a URL base
// Para testar no emulador/navegador:
const BASE_URL = process.env.LOCALHOST;

export default function RegistrarViagem() {
    const [veiculoId, setVeiculoId] = useState("");
    const [data, setData] = useState(new Date());
    const [horarioSaida, setHorarioSaida] = useState(new Date());
    const [horarioChegada, setHorarioChegada] = useState(new Date());
    const [finalidade, setFinalidade] = useState("");
    const [kmFinal, setKmFinal] = useState("");
    const colorScheme = useColorScheme() as "light" | "dark";

    // controla se o picker aparece
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showSaidaPicker, setShowSaidaPicker] = useState(false);
    const [showChegadaPicker, setShowChegadaPicker] = useState(false);

    const salvarViagem = async () => {
        try {
            const body = {
                veiculoId: parseInt(veiculoId),
                data: data.toISOString(),
                horarioSaida: horarioSaida.toISOString(),
                horarioChegada: horarioChegada.toISOString(),
                finalidade,
                kmFinal: parseInt(kmFinal),
            };

            const response = await apiFetch(`/viagens`, {
                method: "POST",
                body: JSON.stringify(body),
            });

            const result = await response.json();

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
        <ThemedView style={styles.container}>
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
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
    title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
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
