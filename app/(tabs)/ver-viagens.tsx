import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { FlatList, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { apiFetch } from "@/services/api";

// Use a variável de ambiente para a URL base
// Para testar no emulador/navegador:
const BASE_URL = process.env.LOCALHOST;

export default function VerViagens() {
    const [viagens, setViagens] = useState<any[]>([]);
    const colorScheme = useColorScheme() as "light" | "dark";

    useFocusEffect(
        useCallback(() => {
            const fetchViagens = async () => {
                try {
                    const response = await apiFetch("/viagens");
                    if (!response.ok) throw new Error("Erro ao buscar viagens");

                    const data = await response.json();
                    setViagens(data);
                } catch (err) {
                    console.error("Erro ao carregar viagens:", err);
                }
            };

            fetchViagens();

        }, [])
    );

    const renderViagem = ({ item }: { item: any }) => {
        const saida = new Date(item.dataSaida);
        const chegada = new Date(item.dataChegada);

        return (
            <ThemedView style={[styles.card, { borderColor: Colors[colorScheme].tint }]}>
                <ThemedText type="subtitle">Veículo: {item.veiculoId}</ThemedText>

                <ThemedText>
                    Saída: {saida.toLocaleDateString("pt-BR")} às{" "}
                    {saida.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </ThemedText>

                <ThemedText>
                    Chegada: {chegada.toLocaleDateString("pt-BR")} às{" "}
                    {chegada.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </ThemedText>

                <ThemedText>Finalidade: {item.finalidade}</ThemedText>
                <ThemedText>KM Final: {item.kmFinal}</ThemedText>
            </ThemedView>
        );
    };

    return (
        <ThemedView style={styles.container}>
            <FlatList
                data={viagens}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderViagem}
            />
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    card: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 16,
        marginBottom: 12,
    },
});
