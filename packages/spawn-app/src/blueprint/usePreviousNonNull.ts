import { useEffect, useRef } from "react";

export function usePreviousNonNull<T>(
  value: T | null | undefined
): T | undefined {
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    if (value !== null && value !== undefined) {
      ref.current = value;
    }
  }, [value]);

  return ref.current;
}
