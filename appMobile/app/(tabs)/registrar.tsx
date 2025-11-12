// RegistrarViagem.tsx
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
import {
  useFocusEffect,
  useRoute,
  useNavigation,
} from "@react-navigation/native";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { apiFetch } from "@/services/api";

export default function RegistrarViagem() {
  const route = useRoute();
  const navigation = useNavigation();
  // se navegação mandar { id: 3 } — usamos isso para editar
  const params: any = (route.params as any) || {};
  const editingId: number | null = params?.id ? Number(params.id) : null;

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

  const [veiculos, setVeiculos] = useState<Array<any>>([]);
  const [loadingVeiculos, setLoadingVeiculos] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [loadingInit, setLoadingInit] = useState<boolean>(!!editingId);

  useFocusEffect(
    useCallback(() => {
      // carregar veículos sempre que a tela entra em foco
      carregarVeiculos();
      if (!editingId) resetForm();
      else carregarViagem(editingId);
    }, [editingId]),
  );

  const resetForm = () => {
    setVeiculoId("");
    setData(new Date());
    setDataChegada(new Date());
    setHorarioSaida(new Date());
    setHorarioChegada(new Date());
    setFinalidade("");
    setKmFinal("");
  };

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
    }
  };

  const carregarViagem = async (id: number) => {
    try {
      setLoadingInit(true);
      const res = await apiFetch(`/viagens/${id}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        Alert.alert(
          "Erro",
          err.error || "Não foi possível carregar a viagem para edição.",
        );
        navigation.goBack();
        return;
      }
      const trip = await res.json();
      // preenche campos (tolerante a nomes)
      const ds = trip.dataSaida ? new Date(trip.dataSaida) : new Date();
      const dc = trip.dataChegada ? new Date(trip.dataChegada) : new Date();

      setVeiculoId(String(trip.veiculoId ?? trip.veiculo?.id ?? ""));
      setData(ds);
      setDataChegada(dc);
      setHorarioSaida(new Date(ds));
      setHorarioChegada(new Date(dc));
      setFinalidade(String(trip.finalidade ?? ""));
      setKmFinal(trip.kmFinal != null ? String(trip.kmFinal) : "");
    } catch (err) {
      console.error("Erro ao buscar viagem:", err);
      Alert.alert("Erro", "Não foi possível carregar os dados da viagem.");
      navigation.goBack();
    } finally {
      setLoadingInit(false);
    }
  };

  const formatDate = (d?: Date) => (d ? d.toLocaleDateString() : "");
  const formatTime = (d?: Date) =>
    d ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

  const salvarViagem = async () => {
    try {
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

      const inicioViagem = new Date(data);
      inicioViagem.setHours(
        horarioSaida.getHours(),
        horarioSaida.getMinutes(),
        0,
        0,
      );
      const fimViagem = new Date(dataChegada);
      fimViagem.setHours(
        horarioChegada.getHours(),
        horarioChegada.getMinutes(),
        0,
        0,
      );
      if (fimViagem <= inicioViagem) {
        Alert.alert(
          "Erro",
          "A data/horário de chegada não pode ser anterior ou igual à saída.",
        );
        return;
      }

      setSaving(true);

      const body = {
        veiculoId: parseInt(veiculoId, 10),
        dataSaida: inicioViagem.toISOString(),
        dataChegada: fimViagem.toISOString(),
        finalidade,
        kmFinal: parseInt(kmFinal, 10),
      };

      let response;
      if (editingId) {
        response = await apiFetch(`/viagens/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        response = await apiFetch("/viagens", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 400 && result.ultimaKm) {
          Alert.alert(
            "Quilometragem inválida",
            `A quilometragem final não pode ser menor ou igual que a última registrada (${result.ultimaKm}).`,
          );
        } else if (response.status === 403) {
          Alert.alert(
            "Erro de Permissão",
            result.error || "Você não tem permissão para realizar esta ação.",
          );
        } else {
          Alert.alert("Erro", result.error || "Erro ao salvar viagem.");
        }
        return;
      }

      Alert.alert(
        "Sucesso",
        editingId ? "Viagem atualizada!" : "Viagem registrada!",
      );
      navigation.goBack();
    } catch (error) {
      console.error("Erro ao salvar viagem:", error);
      Alert.alert("Erro", "Não foi possível salvar a viagem.");
    } finally {
      setSaving(false);
    }
  };

  const excluirViagem = async () => {
    if (!editingId) return;
    Alert.alert("Confirmar", "Deseja realmente deletar esta viagem?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Deletar",
        style: "destructive",
        onPress: async () => {
          try {
            setSaving(true);
            const res = await apiFetch(`/viagens/${editingId}`, {
              method: "DELETE",
            });
            if (res.ok) {
              Alert.alert("Sucesso", "Viagem deletada.");
              navigation.goBack();
            } else {
              const err = await res.json().catch(() => ({}));
              Alert.alert(
                "Erro",
                err.error || "Não foi possível deletar a viagem.",
              );
            }
          } catch (err) {
            console.error("Erro ao deletar viagem:", err);
            Alert.alert("Erro", "Não foi possível deletar a viagem.");
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  // handlers DateTimePickers
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

  if (loadingInit) {
    return (
      <ThemedView
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <View style={{ padding: 20 }}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8 }}>Carregando viagem...</Text>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <ThemedText type="title" style={styles.title}>
            <MaterialCommunityIcons name="map-marker" size={28} />{" "}
            {editingId ? "Editar Viagem" : "Nova Viagem"}
          </ThemedText>

          {/* Veículo */}
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <ThemedText style={styles.sectionTitle}>
              <FontAwesome5 name="truck" size={14} /> Informações do Veículo
            </ThemedText>
            {loadingVeiculos ? (
              <ActivityIndicator />
            ) : (
              <View style={[styles.pickerWrap, { borderColor: theme.border }]}>
                <Picker
                  selectedValue={veiculoId}
                  onValueChange={(val) => setVeiculoId(String(val))}
                  mode="dropdown"
                  style={
                    Platform.OS === "android"
                      ? { color: veiculoId ? theme.text : "#9aa0a6" }
                      : undefined
                  }
                  dropdownIconColor={
                    Platform.OS === "android" ? theme.text : undefined
                  }
                >
                  <Picker.Item label="Selecione o veículo" value="" />
                  {veiculos.map((v: any) => (
                    <Picker.Item
                      key={String(v.id)}
                      label={
                        v.placa
                          ? `${v.placa} - ${v.modelo}`
                          : `${v.id} - Veículo`
                      }
                      value={String(v.id)}
                    />
                  ))}
                </Picker>
              </View>
            )}
          </View>

          {/* Datas e horários */}
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <ThemedText style={styles.sectionTitle}>
              <MaterialCommunityIcons name="calendar" size={14} /> Rota e Data
            </ThemedText>
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
                  <DateTimePicker
                    value={data}
                    mode="date"
                    display="default"
                    onChange={onChangeData}
                  />
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
                  <DateTimePicker
                    value={horarioSaida}
                    mode="time"
                    display="spinner"
                    onChange={onChangeHorarioSaida}
                  />
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
                  <DateTimePicker
                    value={dataChegada}
                    mode="date"
                    display="default"
                    onChange={onChangeDataChegada}
                  />
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
                  <DateTimePicker
                    value={horarioChegada}
                    mode="time"
                    display="spinner"
                    onChange={onChangeHorarioChegada}
                  />
                )}
              </View>
            </View>
          </View>

          {/* Dados da viagem */}
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <ThemedText style={styles.sectionTitle}>
              <MaterialCommunityIcons name="file-document" size={14} /> Dados da
              Viagem
            </ThemedText>
            <TextInput
              placeholder="Finalidade"
              placeholderTextColor="#9aa0a6"
              style={[
                styles.input,
                { color: theme.text, borderColor: theme.border },
              ]}
              value={finalidade}
              onChangeText={setFinalidade}
            />
            <TextInput
              placeholder="KM Final"
              placeholderTextColor="#9aa0a6"
              keyboardType="numeric"
              style={[
                styles.input,
                { color: theme.text, borderColor: theme.border },
              ]}
              value={kmFinal}
              onChangeText={setKmFinal}
            />
          </View>

          {/* Botões */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 12,
            }}
          >
            <Pressable
              style={[styles.btnOutline, { borderColor: theme.primary }]}
              onPress={() => navigation.goBack()}
            >
              <ThemedText style={{ color: theme.primary }}>Voltar</ThemedText>
            </Pressable>

            {!!editingId && (
              <Pressable
                style={[styles.btnOutline, { borderColor: "#e53e3e" }]}
                onPress={excluirViagem}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator />
                ) : (
                  <ThemedText style={{ color: "#e53e3e" }}>Deletar</ThemedText>
                )}
              </Pressable>
            )}

            <Pressable
              style={[styles.btnPrimary, { backgroundColor: theme.primary }]}
              onPress={salvarViagem}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={{ color: theme.textBack }}>
                  {editingId ? "Atualizar" : "Registrar Viagem"}
                </ThemedText>
              )}
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
  input: { padding: 12, borderWidth: 1, borderRadius: 10, marginTop: 8 },
  dateBtn: { padding: 12, borderWidth: 1, borderRadius: 10, marginTop: 8 },
  pickerWrap: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 8,
  },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  btnPrimary: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    minWidth: 140,
    alignItems: "center",
  },
  btnOutline: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    minWidth: 100,
    alignItems: "center",
    borderWidth: 1,
  },
  label: { color: "#6b7280", fontSize: 13 },
});
