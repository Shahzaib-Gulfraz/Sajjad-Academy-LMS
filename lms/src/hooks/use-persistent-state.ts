import { useEffect, useMemo, useRef, useState } from "react";

const isBrowser = () => typeof window !== "undefined";

type Options<T> = {
  key: string;
  defaultValue: T;
  deserialize?: (raw: string) => T;
  serialize?: (value: T) => string;
};

export const usePersistentState = <T,>({
  key,
  defaultValue,
  deserialize,
  serialize,
}: Options<T>) => {
  const serializer = useMemo(() => serialize ?? ((value: T) => JSON.stringify(value)), [serialize]);
  const deserializer = useMemo(
    () =>
      deserialize ??
      ((raw: string) => {
        return JSON.parse(raw) as T;
      }),
    [deserialize]
  );

  const readValue = () => {
    if (!isBrowser()) return defaultValue;
    const raw = window.localStorage.getItem(key);
    if (!raw) return defaultValue;
    try {
      const parsed = deserializer(raw);
      return parsed !== null && parsed !== undefined ? parsed : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  const [value, setValue] = useState<T>(readValue);
  const lastSerializedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isBrowser()) return;
    try {
      const nextSerialized = serializer(value);
      if (nextSerialized !== lastSerializedRef.current) {
        window.localStorage.setItem(key, nextSerialized);
        lastSerializedRef.current = nextSerialized;
      }
    } catch {
      return;
    }
  }, [key, serializer, value]);

  useEffect(() => {
    if (!isBrowser()) return;
    const sync = () => {
      const nextValue = readValue();
      try {
        const nextSerialized = serializer(nextValue);
        if (nextSerialized !== lastSerializedRef.current) {
          lastSerializedRef.current = nextSerialized;
          setValue(nextValue);
        }
      } catch {
        setValue(nextValue);
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== key) return;
      sync();
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        sync();
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", handleVisibility);

    sync();

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, serializer]);

  return [value, setValue] as const;
};
