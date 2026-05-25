import { useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';

/**
 * Hook de penalización por fallo.
 * Cuando el estado global `cooldown` es true, lo desactiva automáticamente
 * después de 3000ms.
 */
export function useCooldown() {
  const { state, dispatch } = useGame();
  const timerRef = useRef(null);

  useEffect(() => {
    if (state.cooldown) {
      // Limpiar timer previo si existe
      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(() => {
        dispatch({ type: 'COOLDOWN_OFF' });
      }, 3000);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [state.cooldown, dispatch]);

  return state.cooldown;
}
