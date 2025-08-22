import { useState } from "react";
import {
    TextInput,
    StyleSheet,
    Pressable,
    Alert,
    ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

const BASE_URL = process.env.LOCALHOST;

export default function RegistrarViagem() {
    const [veiculo, setVeiculo] = useState("");
    const [data, setData] = useState("");
    const [saida, setSaida] = useState("");
    const [chegada, setChegada] = useState("");
    const [finalidade, setFinalidade] = useState("");
    const [kmFinal, setKmFinal] = useState("");

    const colorScheme = useColorScheme() as "light" | "dark";

    const handleRegistrar = async () => {
        try {
            const token = await AsyncStorage.getItem("token");

            const response = await fetch(`${BASE_URL}/viagens`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    veiculoId: parseInt(veiculo),
                    data,
                    horaSaida: saida,
                    horaChegada: chegada,
                    finalidade,
                    kmFinal: parseFloat(kmFinal),
                }),
            });

            const resData = await response.json();

            if (response.ok) {
                Alert.alert("Sucesso", "Viagem registrada!");
                setVeiculo("");
                setData("");
                setSaida("");
                setChegada("");
                setFinalidade("");
                setKmFinal("");
            } else {
                Alert.alert("Erro", resData.error || "Falha ao registrar viagem");
            }
        } catch (err) {
            Alert.alert("Erro", "Não foi possível conectar ao servidor");
        }
    };

    return (
        <ThemedView style={styles.container}>
            <ScrollView
                contentContainerStyle={{ paddingBottom: 20 }}
                keyboardShouldPersistTaps="handled"
            >
                <ThemedText type="title" style={styles.title}>
                    Registrar Viagem
                </ThemedText>

                <TextInput
                    style={[
                        styles.input,
                        { borderColor: Colors[colorScheme].tint, color: Colors[colorScheme].text },
                    ]}
                    placeholder="ID do Veículo"
                    placeholderTextColor={Colors[colorScheme].icon}
                    value={veiculo}
                    onChangeText={setVeiculo}
                />
                <TextInput
                    style={[
                        styles.input,
                        { borderColor: Colors[colorScheme].tint, color: Colors[colorScheme].text },
                    ]}
                    placeholder="Data (AAAA-MM-DD)"
                    placeholderTextColor={Colors[colorScheme].icon}
                    value={data}
                    onChangeText={setData}
                />
                <TextInput
                    style={[
                        styles.input,
                        { borderColor: Colors[colorScheme].tint, color: Colors[colorScheme].text },
                    ]}
                    placeholder="Hora de Saída (HH:MM)"
                    placeholderTextColor={Colors[colorScheme].icon}
                    value={saida}
                    onChangeText={setSaida}
                />
                <TextInput
                    style={[
                        styles.input,
                        { borderColor: Colors[colorScheme].tint, color: Colors[colorScheme].text },
                    ]}
                    placeholder="Hora de Chegada (HH:MM)"
                    placeholderTextColor={Colors[colorScheme].icon}
                    value={chegada}
                    onChangeText={setChegada}
                />
                <TextInput
                    style={[
                        styles.input,
                        { borderColor: Colors[colorScheme].tint, color: Colors[colorScheme].text },
                    ]}
                    placeholder="Finalidade"
                    placeholderTextColor={Colors[colorScheme].icon}
                    value={finalidade}
                    onChangeText={setFinalidade}
                />
                <TextInput
                    style={[
                        styles.input,
                        { borderColor: Colors[colorScheme].tint, color: Colors[colorScheme].text },
                    ]}
                    placeholder="KM Final"
                    placeholderTextColor={Colors[colorScheme].icon}
                    keyboardType="numeric"
                    value={kmFinal}
                    onChangeText={setKmFinal}
                />

                <Pressable
                    style={[styles.button, { backgroundColor: Colors[colorScheme].tint }]}
                    onPress={handleRegistrar}
                >
                    <ThemedText
                        style={[styles.buttonText, { color: Colors[colorScheme].background }]}
                    >
                        Salvar Viagem
                    </ThemedText>
                </Pressable>
            </ScrollView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: "center", padding: 20 },
    title: { fontSize: 28, fontWeight: "bold", marginBottom: 30, textAlign: "center" },
    input: {
        width: "100%",
        padding: 12,
        borderWidth: 1,
        borderRadius: 10,
        marginBottom: 15,
        fontSize: 16,
    },
    button: {
        width: "100%",
        padding: 15,
        borderRadius: 10,
        alignItems: "center",
        marginTop: 10,
    },
    buttonText: { fontSize: 18, fontWeight: "600" },
});
