import React, { useState, useCallback, useEffect } from "react";
import { View, ScrollView, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { MaterialCommunityIcons, FontAwesome5, Ionicons } from "@expo/vector-icons";
import { startTracking} from "@/services/locationService";

export default function Home() {
    const router = useRouter();
    const colorScheme = useColorScheme() as "light" | "dark";
    const theme = Colors[colorScheme];
    const [stats, setStats] = useState({
        viagensEsteMes: 0,
        kmRodados: 0,
        emAndamento: 0,
        concluidas: 0,
    });

    useEffect(() => {
        console.log("Iniciando serviço de localização na Home...");
        startTracking();

        // Opcional: retornar uma função de limpeza para parar o rastreamento
        // se o app for completamente fechado (depende da sua lógica de logout)
        // return () => {
        //   stopTracking();
        // };
    }, []);

    // Envolva a lógica de carregamento em um useCallback
    const loadStats = useCallback(async () => {
        try {
            const raw = await AsyncStorage.getItem("viagens");
            const viagens = raw ? JSON.parse(raw) : [];

            // filtro básico por mês atual (ex.: viagens com dataSaida no mesmo mês)
            const now = new Date();
            const thisMonth = viagens.filter((v: any) => {
                if (!v.dataSaida) return false;
                const d = new Date(v.dataSaida);
                return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
            });

            const km = viagens.reduce((acc: number, v: any) => acc + (v.distancia || 0), 0);
            const emAnd = viagens.filter((v: any) => v.status === "andamento").length;
            const concl = viagens.filter((v: any) => v.status === "concluida").length;

            setStats({
                viagensEsteMes: thisMonth.length,
                kmRodados: km,
                emAndamento: emAnd,
                concluidas: concl,
            });
        } catch (e) {
            console.warn("Erro ao carregar estatísticas:", e);
        }
    }, []);

    // Use useFocusEffect para chamar a função loadStats sempre que a tela for focada
    useFocusEffect(
        useCallback(() => {
            loadStats();
        }, [loadStats])
    );

    return (
        <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
            <ScrollView contentContainerStyle={{ padding: 20 }}>
                <View style={styles.header}>
                    <ThemedText type="title" style={styles.title}>Menu</ThemedText>
                    <ThemedText style={styles.subtitle}>Motoristas</ThemedText>
                </View>

                <View style={styles.grid}>
                    <View style={[styles.card, { backgroundColor: theme.card }]}>
                        <View style={styles.cardRow}>
                            <View>
                                <ThemedText style={styles.cardTitle}>Minhas Viagens</ThemedText>
                                <ThemedText type="title" style={styles.cardNumber}>{stats.viagensEsteMes}</ThemedText>
                                <ThemedText style={styles.cardNote}>Este mês</ThemedText>
                            </View>
                            <View style={styles.iconWrap}>
                                <MaterialCommunityIcons name="map-marker" size={28} color="#2b6cb0" />
                            </View>
                        </View>
                    </View>

                    <View style={[styles.card, { backgroundColor: theme.card }]}>
                        <View style={styles.cardRow}>
                            <View>
                                <ThemedText style={styles.cardTitle}>KM Rodados</ThemedText>
                                <ThemedText type="title" style={styles.cardNumber}>{stats.kmRodados.toLocaleString()}</ThemedText>
                                <ThemedText style={styles.cardNote}>Este mês</ThemedText>
                            </View>
                            <View style={styles.iconWrap}>
                                <FontAwesome5 name="truck" size={22} color="#f6ad55" />
                            </View>
                        </View>
                    </View>

                    <View style={[styles.card, { backgroundColor: theme.card }]}>
                        <View style={styles.cardRow}>
                            <View>
                                <ThemedText style={styles.cardTitle}>Em Andamento</ThemedText>
                                <ThemedText type="title" style={styles.cardNumber}>{stats.emAndamento}</ThemedText>
                                <ThemedText style={styles.cardNote}>Viagem ativa</ThemedText>
                            </View>
                            <View style={styles.iconWrap}>
                                <Ionicons name="time-outline" size={26} color="#dd6b20" />
                            </View>
                        </View>
                    </View>

                    <View style={[styles.card, { backgroundColor: theme.card }]}>
                        <View style={styles.cardRow}>
                            <View>
                                <ThemedText style={styles.cardTitle}>Concluídas</ThemedText>
                                <ThemedText type="title" style={styles.cardNumber}>{stats.concluidas}</ThemedText>
                                <ThemedText style={styles.cardNote}>Este mês</ThemedText>
                            </View>
                            <View style={styles.iconWrap}>
                                <MaterialCommunityIcons name="check-circle-outline" size={28} color="#38a169" />
                            </View>
                        </View>
                    </View>
                </View>

                <View style={[styles.actionsCard, { backgroundColor: theme.card }]}>
                    <ThemedText style={styles.actionsTitle}>Ações Rápidas</ThemedText>
                    <ThemedText style={styles.actionsSubtitle}>O que você deseja fazer?</ThemedText>

                    <View style={styles.actionsRow}>
                        <Pressable style={[styles.actionBtn, { borderColor: theme.border }]} onPress={() => router.push("/(tabs)/registrar")}>
                            <View style={styles.actionInner}>
                                <MaterialCommunityIcons name="map-marker-plus" size={22} color="#2b6cb0" />
                                <ThemedText style={styles.actionText}>Nova Viagem</ThemedText>
                                <ThemedText style={styles.actionNote}>Registrar nova viagem</ThemedText>
                            </View>
                        </Pressable>

                        <Pressable style={[styles.actionBtn, { borderColor: theme.border }]} onPress={() => router.push("/(tabs)/ver-viagens")}>
                            <View style={styles.actionInner}>
                                <FontAwesome5 name="list" size={20} color="#f6ad55" />
                                <ThemedText style={styles.actionText}>Minhas Viagens</ThemedText>
                                <ThemedText style={styles.actionNote}>Ver histórico de viagens</ThemedText>
                            </View>
                        </Pressable>

                        <Pressable style={[styles.actionBtn, { borderColor: theme.border }]} onPress={() => router.push("/(tabs)/criar-alertas")}>
                            <View style={styles.actionInner}>
                                <MaterialCommunityIcons name="wrench" size={20} color="#ed8936" />
                                <ThemedText style={styles.actionText}>Solicitar Manutenção</ThemedText>
                                <ThemedText style={styles.actionNote}>Reportar problema no veículo</ThemedText>
                            </View>
                        </Pressable>
                    </View>
                </View>
            </ScrollView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { paddingTop: 36, flex: 1 },
    header: { marginBottom: 20 },
    title: { fontSize: 34, fontWeight: "800", marginBottom: 6 },
    subtitle: { color: "#6b7280" },
    grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 10 },
    card: { width: "48%", borderRadius: 12, padding: 16, marginBottom: 10 },
    cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    cardTitle: { fontSize: 13, color: "#6b7280" },
    cardNumber: { fontSize: 28, fontWeight: "bold", marginTop: 4 },
    cardNote: { fontSize: 12, color: "#9aa0a6" },
    iconWrap: { padding: 8, borderRadius: 50, backgroundColor: "rgba(0,0,0,0.05)" },
    actionsCard: { borderRadius: 12, padding: 16, marginTop: 10 },
    actionsTitle: { fontSize: 16, fontWeight: "bold" },
    actionsSubtitle: { fontSize: 13, color: "#6b7280", marginBottom: 10 },
    actionsRow: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
    actionBtn: { flex: 1, padding: 12, borderWidth: 1, borderRadius: 10 },
    actionInner: { alignItems: "center" },
    actionText: { fontWeight: "bold", marginTop: 8 },
    actionNote: { fontSize: 12, color: "#9aa0a6" },
});