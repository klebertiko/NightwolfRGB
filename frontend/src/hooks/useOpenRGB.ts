import { useState, useEffect, useCallback, useRef } from 'react';
import { wsUrl } from '../api/client';
import type { WebSocketStatusData } from '../types';

export const useOpenRGB = () => {
    const [connected, setConnected] = useState(false);
    const [deviceCount, setDeviceCount] = useState(0);
    const [status, setStatus] = useState<WebSocketStatusData | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const connect = useCallback(() => {
        try {
            const ws = new WebSocket(wsUrl());

            ws.onopen = () => {
                console.log('✅ WebSocket connected');
                setConnected(true);
            };

            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);

                    if (message.type === 'status') {
                        setStatus(message.data);
                        setConnected(message.data.connected);
                        setDeviceCount(message.data.deviceCount);
                    }
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            ws.onclose = () => {
                console.log('🔌 WebSocket disconnected');
                setConnected(false);

                reconnectTimeoutRef.current = setTimeout(() => {
                    console.log('🔄 Attempting to reconnect...');
                    connect();
                }, 3000);
            };

            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };

            wsRef.current = ws;
        } catch (error) {
            console.error('Failed to create WebSocket:', error);
        }
    }, []);

    const disconnect = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
    }, []);

    useEffect(() => {
        connect();
        return () => disconnect();
    }, [connect, disconnect]);

    return {
        connected,
        deviceCount,
        status,
        reconnect: connect
    };
};
