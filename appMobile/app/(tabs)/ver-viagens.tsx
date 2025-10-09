import React, { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
    FlatList,
    StyleSheet,
    View,
    Pressable,
    ActivityIndicator,
    Platform,
    Text,
} from "react-native";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { apiFetch } from "@/services/api";
import { MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";

export default function VerViagens() {
    const [viagens, setViagens] = useState<any[]>([]);
    const [veiculosMap, setVeiculosMap] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState<boolean>(false);
    const colorScheme = useColorScheme() as "light" | "dark";
    const theme = Colors[colorScheme];

    useFocusEffect(
        useCallback(() => {
            const fetchAll = async () => {
                try {
                    setLoading(true);

                    // busca viagens
                    const respV = await apiFetch("/viagens");
                    if (!respV.ok) throw new Error("Erro ao buscar viagens");
                    const dataViagens = await respV.json();

                    // tenta buscar veículos para mapear id -> nome/placa
                    let map: Record<string, string> = {};
                    try {
                        const respVeic = await apiFetch("/veiculos");
                        if (respVeic.ok) {
                            const listaVeic = await respVeic.json();
                            if (Array.isArray(listaVeic)) {
                                map = listaVeic.reduce((acc: Record<string, string>, v: any) => {
                                    const id = String(v.id ?? v.veiculoId ?? v.vehicleId ?? "");
                                    const label =
                                        v.nome ||
                                        v.placa ||
                                        v.modelo ||
                                        v.descricao ||
                                        (v.id ? `Veículo ${v.id}` : "");
                                    if (id) acc[id] = label;
                                    return acc;
                                }, {});
                            }
                        }
                    } catch (err) {
                        console.warn("Falha ao carregar veículos (apenas fallback):", err);
                    }

                    setViagens(Array.isArray(dataViagens) ? dataViagens : []);
                    setVeiculosMap(map);
                } catch (err) {
                    console.error("Erro ao carregar viagens:", err);
                    setViagens([]);
                    setVeiculosMap({});
                } finally {
                    setLoading(false);
                }
            };

            fetchAll();
        }, [])
    );

    // resumo: total de viagens e km percorridos
    const totalViagens = viagens.length;
    const totalKm = viagens.reduce((acc, v) => {
        if (v.distancia != null) return acc + Number(v.distancia || 0);
        if (v.kmFinal != null && v.kmInicial != null)
            return acc + Math.max(0, Number(v.kmFinal) - Number(v.kmInicial));
        if (v.kmFinal != null) return acc + Number(v.kmFinal || 0); // fallback
        return acc;
    }, 0);

    const renderViagem = ({ item }: { item: any }) => {
        const saida = item.dataSaida ? new Date(item.dataSaida) : null;
        const chegada = item.dataChegada ? new Date(item.dataChegada) : null;

        // monta label do veículo de forma robusta
        const veiculoId = item.veiculoId ?? item.veiculo?.id ?? item.vehicleId ?? item.veiculoId;
        const veiculoFromMap = veiculoId ? veiculosMap[String(veiculoId)] : undefined;

        // propriedades possíveis que o backend pode retornar
        const possibleName =
            item.veiculo?.nome ||
            item.veiculoNome ||
            item.veiculo_nome ||
            item.placa ||
            item.nomeVeiculo ||
            item.veiculo?.placa ||
            item.plate;

        const vehicleLabel =
            (veiculoId ? String(veiculoId) : "") +
            (veiculoFromMap ? ` - ${veiculoFromMap}` : possibleName ? ` - ${possibleName}` : ` - Veículo`);

        return (
            <Pressable
                style={[styles.card, { backgroundColor: theme.card }]}
                onPress={() => {
                    /* navegar para detalhes se quiser */
                }}
            >
                <View style={styles.cardHeader}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <FontAwesome5 name="truck" size={18} color="#2b6cb0" />
                        <ThemedText style={styles.cardTitle}>{vehicleLabel}</ThemedText>
                    </View>
                    <View
                        style={[
                            styles.statusPill,
                            { backgroundColor: item.status === "andamento" ? "#f6ad55" : "#38a169" },
                        ]}
                    >
                        <ThemedText style={styles.statusText}>
                            {item.status === "andamento" ? "Em Andamento" : "Concluída"}
                        </ThemedText>
                    </View>
                </View>

                <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                        <ThemedText style={styles.label}>Saída</ThemedText>
                        <ThemedText style={styles.value}>
                            {saida
                                ? `${saida.toLocaleDateString("pt-BR")} • ${saida.toLocaleTimeString("pt-BR", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}`
                                : "-"}
                        </ThemedText>
                    </View>

                    <View style={{ flex: 1 }}>
                        <ThemedText style={styles.label}>Chegada</ThemedText>
                        <ThemedText style={styles.value}>
                            {chegada
                                ? `${chegada.toLocaleDateString("pt-BR")} • ${chegada.toLocaleTimeString("pt-BR", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}`
                                : "-"}
                        </ThemedText>
                    </View>
                </View>

                <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                        <ThemedText style={styles.label}>Finalidade</ThemedText>
                        <ThemedText style={styles.value}>{item.finalidade ?? "-"}</ThemedText>
                    </View>

                    <View style={{ flex: 1 }}>
                        <ThemedText style={styles.label}>KM Final</ThemedText>
                        <ThemedText style={styles.value}>{item.kmFinal != null ? String(item.kmFinal) : "-"}</ThemedText>
                    </View>
                </View>
            </Pressable>
        );
    };

    return (
        <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <ThemedText type="title" style={styles.title}>
                    <MaterialCommunityIcons name="map-marker" size={28} /> Minhas Viagens
                </ThemedText>
                <ThemedText style={styles.subtitle}>Histórico das suas viagens</ThemedText>
            </View>

            <View style={{ paddingHorizontal: 20 }}>
                <View style={[styles.summaryCard, { backgroundColor: theme.card }]}>
                    <View style={styles.summaryItem}>
                        <MaterialCommunityIcons name="map-marker" size={22} color="#38a169" />
                        <ThemedText style={styles.summaryNumber}>{totalViagens}</ThemedText>
                        <ThemedText style={styles.summaryLabel}>Suas Viagens</ThemedText>
                    </View>

                    <View style={styles.summaryItem}>
                        <FontAwesome5 name="truck" size={22} color="#2b6cb0" />
                        <ThemedText style={styles.summaryNumber}>{totalKm.toLocaleString()}</ThemedText>
                        <ThemedText style={styles.summaryLabel}>KM Percorridos</ThemedText>
                    </View>
                </View>
            </View>

            {loading ? (
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                    <ActivityIndicator />
                </View>
            ) : (
                <FlatList
                    data={viagens}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={renderViagem}
                    contentContainerStyle={{ padding: 20, paddingTop: 12, paddingBottom: Platform.OS === "ios" ? 40 : 20 }}
                    ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                    ListEmptyComponent={() => (
                        <View style={{ padding: 20 }}>
                            <ThemedText>Nenhuma viagem registrada.</ThemedText>
                        </View>
                    )}
                />
            )}
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { paddingTop: 36, flex: 1 },
    header: { padding: 20 },
    title: { fontSize: 32, fontWeight: "800" },
    subtitle: { color: "#6b7280" },
    summaryCard: {
        marginTop: 8,
        borderRadius: 12,
        padding: 14,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    summaryItem: { alignItems: "center", flex: 1 },
    summaryNumber: { fontWeight: "700", fontSize: 18, marginTop: 4 },
    summaryLabel: { color: "#6b7280", marginTop: 2 },
    card: {
        borderRadius: 12,
        padding: 16,
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 1,
    },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
    cardTitle: { fontWeight: "800", fontSize: 16 },
    statusPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
    statusText: { color: "#fff", fontWeight: "700" },
    row: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
    label: { color: "#6b7280", fontSize: 13 },
    value: { fontWeight: "700", fontSize: 14, marginTop: 2 },
});
