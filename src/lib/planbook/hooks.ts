import { useCallback, useEffect, useRef } from "react";

/**
 * Returns a stable callback that debounces invocations of `fn` by `delay` ms.
 * The returned function always invokes the latest `fn` closure.
 */
export function useDebouncedCallback<T extends (...args: any[]) => void>(
  fn: T,
  delay: number,
): T {
  const fnRef = useRef(fn);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const debounced = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        fnRef.current(...args);
      }, delay);
    },
    [delay],
  );

  return debounced as unknown as T;
}
