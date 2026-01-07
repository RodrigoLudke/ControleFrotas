import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { apiFetch } from './api';
import { Alert } from 'react-native';

const LOCATION_TASK_NAME = 'BACKGROUND_LOCATION_TASK';

// 1. DEFINIR A TAREFA GLOBALMENTE (Fora de qualquer componente ou função)
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
        console.error("Erro no background task:", error);
        return;
    }
    if (data) {
        // @ts-ignore
        const { locations } = data;
        const location = locations[0]; // Pega a localização mais recente

        if (location) {
            console.log('[Background] Localização recebida:', location.coords.latitude, location.coords.longitude);

            // Envia para o backend sem travar a thread principal
            try {
                await apiFetch('/motoristas/localizacao', {
                    method: 'POST',
                    body: JSON.stringify({
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                        timestamp: location.timestamp,
                    }),
                });
            } catch (err) {
                console.log("Falha no envio silencioso (pode ser offline):", err);
            }
        }
    }
});

export async function requestPermissions() {
    const { status: foreground } = await Location.requestForegroundPermissionsAsync();
    if (foreground !== 'granted') return false;

    const { status: background } = await Location.requestBackgroundPermissionsAsync();
    if (background !== 'granted') {
        Alert.alert("Atenção", "Para rastrear a viagem com a tela bloqueada, escolha 'Permitir o tempo todo' nas configurações.");
        return false;
    }
    return true;
}

export async function startTracking() {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (hasStarted) {
        console.log("Rastreamento já está ativo.");
        return;
    }

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.High,
        timeInterval: 10000,      // Atualiza a cada 10 seg
        distanceInterval: 10,     // Ou a cada 10 metros
        showsBackgroundLocationIndicator: true, // Ícone azul na barra superior (obrigatório iOS)
        foregroundService: {
            notificationTitle: "Viagem em Andamento",
            notificationBody: "Seu trajeto está sendo registrado.",
            notificationColor: "#2b6cb0",
        },
    });
    console.log(">>> Rastreamento iniciado (Background Mode)");
}

export async function stopTracking() {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (hasStarted) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        console.log("<<< Rastreamento finalizado.");
    }
}

export async function isTrackingActive() {
    return await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
}