import { useState, useEffect, useRef, useCallback } from 'react';

const WS_URL = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`;
const MAX_RECONNECT_DELAY = 30000;

export default function useWebSocket(pollId) {
  const [voteCount, setVoteCount] = useState(0);
  const [results, setResults] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptRef = useRef(0);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!pollId || !mountedRef.current) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) { ws.close(); return; }
        setIsConnected(true);
        reconnectAttemptRef.current = 0;
        ws.send(JSON.stringify({ type: 'subscribe', pollId }));
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'voteUpdate' || data.type === 'vote_update') {
            setVoteCount(data.voteCount ?? data.votes ?? 0);
          } else if (data.type === 'pollClosed' || data.type === 'poll_closed') {
            setResults(data.results ?? null);
          } else if (data.type === 'subscribed') {
            if (data.voteCount !== undefined) setVoteCount(data.voteCount);
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setIsConnected(false);
        // Reconnect with exponential backoff
        const attempt = reconnectAttemptRef.current++;
        const delay = Math.min(1000 * Math.pow(2, attempt), MAX_RECONNECT_DELAY);
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      // Connection failed, will retry via onclose
    }
  }, [pollId]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { voteCount, results, isConnected };
}
