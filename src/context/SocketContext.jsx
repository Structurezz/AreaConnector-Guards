import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  // Stable primitives — avoid re-running the effect every fetchMe refresh,
  // which was killing the WebSocket upgrade mid-handshake.
  const userId = user?._id || null;
  const estateId =
    (typeof user?.estateId === 'object' ? user?.estateId?._id : user?.estateId) || null;
  const role = user?.role || null;

  useEffect(() => {
    if (!userId) return;

    const socketUrl =
      import.meta.env.VITE_SOCKET_URL ||
      (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '') ||
      'http://localhost:5001';
    const socket = io(socketUrl, {
      withCredentials: true,
      transports: ['polling', 'websocket'],
      upgrade: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join', { userId, estateId, role });
    });

    socket.on('disconnect', () => setConnected(false));

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [userId, estateId, role]);

  const subscribe = useCallback((event, handler) => {
    socketRef.current?.on(event, handler);
    return () => socketRef.current?.off(event, handler);
  }, [connected]); // new reference when socket connects → consumers re-subscribe on the live socket

  const emit = useCallback((event, data) => socketRef.current?.emit(event, data), []);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected, subscribe, emit }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
