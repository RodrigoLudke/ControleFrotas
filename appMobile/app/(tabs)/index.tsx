// src/screens/Home.tsx
import React, {useCallback, useEffect, useState} from "react";
import {ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View} from "react-native";
import {useRouter} from "expo-router";
import {useFocusEffect} from "@react-navigation/native";
import {ThemedView} from "@/components/ThemedView";
import {ThemedText} from "@/components/ThemedText";
import {Colors} from "@/constants/Colors";
import {useColorScheme} from "@/hooks/useColorScheme";
import {FontAwesome5, Ionicons, MaterialCommunityIcons} from "@expo/vector-icons";
import {startTracking, stopTracking, isTrackingActive} from "@/services/locationService";
import {apiFetch} from "@/services/api";

/**
 * Dashboard (Home) - Otimizado
 * - Viagens e KMs agora garantidamente mostram apenas dados do mês atual.
 */

export default function Home() {
    const router = useRouter();
    const colorScheme = useColorScheme() as "light" | "dark";
    const theme = Colors[colorScheme];

    const [loading, setLoading] = useState(false);
    // Estados de dados brutos (se precisar usar em outro lugar)
    const [viagens, setViagens] = useState<any[]>([]);
    const [abastecimentos, setAbastecimentos] = useState<any[]>([]);
    const [alertas, setAlertas] = useState<any[] | null>(null);

    // Estado das estatísticas calculadas
    const [stats, setStats] = useState({
        viagensEsteMes: 0,
        kmRodados: 0,
        solicitacoesManutencaoPendentes: 0,
        abastecimentosEsteMes: 0
    });

    // NOVO ESTADO PARA O RASTREAMENTO
    const [isTracking, setIsTracking] = useState(false);

    // Verifica se já estava rastreando ao abrir o app (ex: motorista fechou e abriu o app de novo)
    useEffect(() => {
        isTrackingActive().then(setIsTracking);
    }, []);

    // FUNÇÃO DO BOTÃO
    const toggleRastreamento = async () => {
        if (isTracking) {
            await stopTracking();
            setIsTracking(false);
            Alert.alert("Jornada Pausada", "O rastreamento foi interrompido.");
        } else {
            await startTracking();
            // Verificamos novamente se iniciou de fato (pode ter falhado a permissão)
            const active = await isTrackingActive();
            setIsTracking(active);
            if(active) Alert.alert("Jornada Iniciada", "Sua localização está sendo enviada em segundo plano.");
        }
    };

    // Helper para verificar se a data é do mês atual
    const isSameMonth = (d: Date, ref = new Date()) => {
        return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
    };

    // Helper para converter valores numéricos com segurança
    const toNumberSafe = (v: any) => {
        if (v === undefined || v === null) return 0;
        const n = Number(v);
        return Number.isNaN(n) ? 0 : n;
    };

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch paralelo
            const [viagensRes, abastecRes, alertasRes] = await Promise.allSettled([
                apiFetch("/viagens"),
                apiFetch("/abastecimentos"),
                apiFetch("/alertas")
            ]);

            // --- Processamento Viagens ---
            let viagensArr: any[] = [];
            if (viagensRes.status === "fulfilled" && viagensRes.value.ok) {
                try {
                    viagensArr = await viagensRes.value.json();
                } catch (e) { viagensArr = []; }
            } else {
                console.warn("Falha ao buscar viagens:", viagensRes);
            }

            // --- Processamento Abastecimentos ---
            let abastecArr: any[] = [];
            if (abastecRes.status === "fulfilled" && abastecRes.value.ok) {
                try {
                    abastecArr = await abastecRes.value.json();
                } catch (e) { abastecArr = []; }
            } else {
                console.warn("Falha ao buscar abastecimentos:", abastecRes);
            }

            // --- Processamento Alertas ---
            let alertArr: any[] | null = null;
            if (alertasRes.status === "fulfilled" && alertasRes.value.ok) {
                try {
                    alertArr = await alertasRes.value.json();
                } catch (e) { alertArr = []; }
            } else {
                console.warn("Falha ao buscar alertas:", alertasRes);
                alertArr = null;
            }

            // Atualiza estados brutos
            setViagens(Array.isArray(viagensArr) ? viagensArr : []);
            setAbastecimentos(Array.isArray(abastecArr) ? abastecArr : []);
            setAlertas(Array.isArray(alertArr) ? alertArr : null);

            // --- CÁLCULO DE ESTATÍSTICAS (OTIMIZADO) ---
            const now = new Date();

            // 1. Filtra viagens deste mês (uma única vez)
            const viagensDoMes = (Array.isArray(viagensArr) ? viagensArr : []).filter((v: any) => {
                if (!v?.dataSaida) return false;
                const d = new Date(v.dataSaida);
                return isSameMonth(d, now);
            });

            // 2. Soma KM usando APENAS as viagens filtradas do mês
            const kmRodadosDoMes = viagensDoMes.reduce((acc: number, v: any) => {
                const ki = toNumberSafe(v.kmInicial);
                const kf = toNumberSafe(v.kmFinal);
                if (ki > 0 && kf >= ki) return acc + (kf - ki);
                return acc;
            }, 0);

            // 3. Filtra abastecimentos deste mês
            const abastecimentosDoMes = (Array.isArray(abastecArr) ? abastecArr : []).filter((a: any) => {
                if (!a?.data) return false;
                const d = new Date(a.data);
                return isSameMonth(d, now);
            });

            // 4. Solicitações pendentes (não depende de data, apenas status)
            let solicitacoesPendentes = 0;
            if (alertArr !== null) {
                solicitacoesPendentes = (alertArr ?? []).filter((a: any) => {
                    const tipo = (a.tipo ?? "").toString().toUpperCase();
                    const status = (a.status ?? "").toString().toUpperCase();
                    return tipo === "SOLICITACAO" && status === "PENDENTE";
                }).length;
            }

            setStats({
                viagensEsteMes: viagensDoMes.length,
                kmRodados: kmRodadosDoMes,
                solicitacoesManutencaoPendentes: solicitacoesPendentes,
                abastecimentosEsteMes: abastecimentosDoMes.length
            });

        } catch (err) {
            console.error("Erro ao carregar dashboard:", err);
            Alert.alert("Erro", "Não foi possível carregar as estatísticas. Verifique sua conexão.");
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchAll();
        }, [fetchAll])
    );

    const goToRegistrarViagem = () => router.push("/(tabs)/registrar");
    const goToVerViagens = () => router.push("/(tabs)/ver-viagens");
    const goToCriarAlerta = () => router.push("/(tabs)/criar-alertas");
    const goToRegistrarAbastecimento = () => router.push("/(tabs)/registrar-abastecimento");

    return (
        <ThemedView style={[styles.container, {backgroundColor: theme.background}]}>
            <ScrollView contentContainerStyle={{padding: 20}}>
                <View style={styles.header}>
                    <ThemedText type="title" style={styles.title}>Menu</ThemedText>
                    <ThemedText style={styles.subtitle}>Motoristas</ThemedText>
                </View>

                {loading ? (
                    <View style={{padding: 20, alignItems: "center"}}>
                        <ActivityIndicator size="large" color={theme.text} />
                    </View>
                ) : (
                    <View style={styles.grid}>
                        <View style={[styles.card, {backgroundColor: theme.card}]}>
                            <View style={styles.cardRow}>
                                <View>
                                    <ThemedText style={styles.cardTitle}>Minhas Viagens</ThemedText>
                                    <ThemedText type="title" style={styles.cardNumber}>
                                        {stats.viagensEsteMes}
                                    </ThemedText>
                                    <ThemedText style={styles.cardNote}>Este mês</ThemedText>
                                </View>
                                <View style={styles.iconWrap}>
                                    <MaterialCommunityIcons name="map-marker" size={28} color="#2b6cb0"/>
                                </View>
                            </View>
                        </View>

                        <View style={[styles.card, {backgroundColor: theme.card}]}>
                            <View style={styles.cardRow}>
                                <View>
                                    <ThemedText style={styles.cardTitle}>KM Rodados</ThemedText>
                                    <ThemedText type="title" style={styles.cardNumber}>
                                        {stats.kmRodados.toLocaleString()}
                                    </ThemedText>
                                    <ThemedText style={styles.cardNote}>Este mês</ThemedText>
                                </View>
                                <View style={styles.iconWrap}>
                                    <FontAwesome5 name="truck" size={22} color="#f6ad55"/>
                                </View>
                            </View>
                        </View>

                        <View style={[styles.card, {backgroundColor: theme.card}]}>
                            <View style={styles.cardRow}>
                                <View>
                                    <ThemedText style={styles.cardTitle}>Meus Alertas</ThemedText>
                                    <ThemedText type="title" style={styles.cardNumber}>
                                        {stats.solicitacoesManutencaoPendentes}
                                    </ThemedText>
                                    <ThemedText style={styles.cardNote}>Pendentes</ThemedText>
                                </View>
                                <View style={styles.iconWrap}>
                                    <Ionicons name="warning-outline" size={26} color="#dd6b20"/>
                                </View>
                            </View>
                        </View>

                        <View style={[styles.card, {backgroundColor: theme.card}]}>
                            <View style={styles.cardRow}>
                                <View>
                                    <ThemedText style={styles.cardTitle}>Abastecimentos</ThemedText>
                                    <ThemedText type="title" style={styles.cardNumber}>
                                        {stats.abastecimentosEsteMes}
                                    </ThemedText>
                                    <ThemedText style={styles.cardNote}>Este mês</ThemedText>
                                </View>
                                <View style={styles.iconWrap}>
                                    <FontAwesome5 name="gas-pump" size={22} color="#38a169"/>
                                </View>
                            </View>
                        </View>
                    </View>
                )}

                {/* --- AQUI VEM O NOVO BOTÃO DE JORNADA (ESTILIZADO) --- */}
                <View style={[styles.actionsCard, { backgroundColor: theme.card, marginBottom: 10 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 15 }}>
                        {/* Ícone de Status */}
                        <View style={[
                            styles.iconWrap,
                            {
                                backgroundColor: isTracking ? "rgba(56, 161, 105, 0.15)" : "rgba(229, 62, 62, 0.1)",
                                padding: 12
                            }
                        ]}>
                            <FontAwesome5
                                name={isTracking ? "satellite-dish" : "power-off"}
                                size={24}
                                color={isTracking ? "#38a169" : "#e53e3e"}
                            />
                        </View>

                        {/* Texto descritivo */}
                        <View style={{ flex: 1 }}>
                            <ThemedText style={{ fontWeight: 'bold', fontSize: 16 }}>
                                {isTracking ? "Jornada Ativa" : "Jornada Parada"}
                            </ThemedText>
                            <ThemedText style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
                                {isTracking ? "GPS enviando dados..." : "Toque para iniciar."}
                            </ThemedText>
                        </View>

                        {/* Botão de Ação */}
                        <Pressable
                            onPress={toggleRastreamento}
                            style={({ pressed }) => ({
                                backgroundColor: isTracking ? "#e53e3e" : "#38a169",
                                paddingVertical: 10,
                                paddingHorizontal: 20,
                                borderRadius: 8,
                                opacity: pressed ? 0.8 : 1,
                                alignItems: 'center',
                                justifyContent: 'center'
                            })}
                        >
                            <ThemedText style={{ color: "#fff", fontWeight: "bold", fontSize: 14 }}>
                                {isTracking ? "Parar" : "Iniciar"}
                            </ThemedText>
                        </Pressable>
                    </View>
                </View>

                <View style={[styles.actionsCard, {backgroundColor: theme.card}]}>
                    <ThemedText style={styles.actionsTitle}>Ações Rápidas</ThemedText>
                    <ThemedText style={styles.actionsSubtitle}>O que você deseja fazer?</ThemedText>

                    <View style={styles.actionsRow}>
                        <Pressable style={[styles.actionBtn, {borderColor: theme.border}]} onPress={goToRegistrarViagem}>
                            <View style={styles.actionInner}>
                                <MaterialCommunityIcons name="map-marker-plus" size={22} color="#2b6cb0"/>
                                <ThemedText style={styles.actionText}>Nova Viagem</ThemedText>
                                <ThemedText style={styles.actionNote}>Registrar nova viagem</ThemedText>
                            </View>
                        </Pressable>

                        <Pressable style={[styles.actionBtn, {borderColor: theme.border}]} onPress={goToVerViagens}>
                            <View style={styles.actionInner}>
                                <FontAwesome5 name="list" size={22} color="#f6ad55"/>
                                <ThemedText style={styles.actionText}>Minhas Viagens</ThemedText>
                                <ThemedText style={styles.actionNote}>Ver histórico de viagens</ThemedText>
                            </View>
                        </Pressable>

                        <Pressable style={[styles.actionBtn, {borderColor: theme.border}]} onPress={goToCriarAlerta}>
                            <View style={styles.actionInner}>
                                <MaterialCommunityIcons name="wrench" size={22} color="#ed8936"/>
                                <ThemedText style={styles.actionText}>Solicitar Manutenção</ThemedText>
                                <ThemedText style={styles.actionNote}>Reportar problema no veículo</ThemedText>
                            </View>
                        </Pressable>

                        <Pressable style={[styles.actionBtn, {borderColor: theme.border}]} onPress={goToRegistrarAbastecimento}>
                            <View style={styles.actionInner}>
                                <FontAwesome5 name="gas-pump" size={22} color="#38a169"/>
                                <ThemedText style={styles.actionText}>Novo Abastecimento</ThemedText>
                                <ThemedText style={styles.actionNote}>Registrar novo abastecimento</ThemedText>
                            </View>
                        </Pressable>
                    </View>
                </View>
            </ScrollView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {paddingTop: 36, flex: 1},
    header: {marginBottom: 20},
    title: {fontSize: 34, fontWeight: "800", marginBottom: 6},
    subtitle: {color: "#6b7280"},
    grid: {flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 10},
    card: {width: "48%", borderRadius: 12, padding: 16, marginBottom: 10},
    cardRow: {flexDirection: "row", justifyContent: "space-between", alignItems: "center"},
    cardTitle: {fontSize: 13, color: "#6b7280"},
    cardNumber: {fontSize: 28, fontWeight: "bold", marginTop: 4},
    cardNote: {fontSize: 12, color: "#9aa0a6"},
    iconWrap: {padding: 8, borderRadius: 50, backgroundColor: "rgba(0,0,0,0.05)"},
    actionsCard: {borderRadius: 12, padding: 16, marginTop: 10},
    actionsTitle: {fontSize: 16, fontWeight: "bold"},
    actionsSubtitle: {fontSize: 13, color: "#6b7280", marginBottom: 10},
    actionsRow: {flexDirection: "row", justifyContent: "space-between", gap: 10, flexWrap: "wrap"},
    actionBtn: {padding: 12, borderWidth: 1, borderRadius: 10, width: "48%"},
    actionInner: {alignItems: "center"},
    actionText: {fontWeight: "bold", marginTop: 8},
    actionNote: {fontSize: 12, color: "#9aa0a6"},
});