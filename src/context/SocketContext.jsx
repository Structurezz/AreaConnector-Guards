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
      // Read on every (re)connect so the server can verify who we are and put
      // us in the right estate / staff rooms.
      auth: (cb) => cb({ token: localStorage.getItem('accessToken') }),
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
  // Fire-and-forget, dropped if the connection is congested (live call audio).
  const sendVolatile = useCallback((event, ...args) => { socketRef.current?.volatile.emit(event, ...args); }, []);

  // Emit and wait for the server's acknowledgement (resolves false on timeout).
  const emitAck = useCallback((event, data, timeoutMs = 4000) => new Promise((resolve) => {
    const sock = socketRef.current;
    if (!sock) return resolve(false);
    sock.timeout(timeoutMs).emit(event, data, (err) => resolve(!err));
  }), []);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected, subscribe, emit, emitAck, sendVolatile }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
