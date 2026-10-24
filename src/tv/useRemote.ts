import { useCallback, useLayoutEffect, useRef } from 'react';
import { useTVEventHandler, type HWEvent } from 'react-native';

/**
 * Teclas do controle remoto (D-pad, play/pause, avançar/voltar). No celular não dispara.
 * Só reage ao soltar a tecla (eventKeyAction 1) para não repetir a ação no keydown.
 */
export function useRemote(handler: (key: string, event: HWEvent) => void) {
  const handlerRef = useRef(handler);
  useLayoutEffect(() => {
    handlerRef.current = handler;
  });

  const listener = useCallback((event: HWEvent) => {
    if (!event || event.eventKeyAction === 0) return;
    if (event.eventType === 'focus' || event.eventType === 'blur') return;
    handlerRef.current(event.eventType, event);
  }, []);

  useTVEventHandler(listener);
}
