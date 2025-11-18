// frontend/lib/hooks/use-websocket.ts

import { useEffect, useRef, useState } from 'react';

interface WebSocketHook {
  connect: (url: string, userId: string) => void;
  disconnect: () => void;
  sendMessage: (message: any) => void;
  isConnected: boolean;
  messages: any[];
}

export function useWebSocket(): WebSocketHook {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);

  const connect = (url: string, userId: string) => {
    // In a real implementation, you would connect to the WebSocket server
    // For now, we'll simulate the connection
    console.log(`Connecting to WebSocket: ${url} for user: ${userId}`);
    
    // Create a mock connection for demo purposes
    setIsConnected(true);
    
    // In a real implementation:
    // ws.current = new WebSocket(`${url}?userId=${userId}`);
    // 
    // ws.current.onopen = () => {
    //   setIsConnected(true);
    //   console.log('WebSocket connected');
    // };
    // 
    // ws.current.onmessage = (event) => {
    //   const data = JSON.parse(event.data);
    //   setMessages(prev => [...prev, data]);
    // };
    // 
    // ws.current.onclose = () => {
    //   setIsConnected(false);
    //   console.log('WebSocket disconnected');
    // };
  };

  const disconnect = () => {
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    setIsConnected(false);
  };

  const sendMessage = (message: any) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  return { connect, disconnect, sendMessage, isConnected, messages };
}