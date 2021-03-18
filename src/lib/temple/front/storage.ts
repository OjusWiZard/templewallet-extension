import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { browser } from "webextension-polyfill-ts";

import { useRetryableSWR } from "lib/swr";

export function useStorage<T = any>(
  key: string,
  fallback?: T
): [T, (val: SetStateAction<T>) => Promise<void>] {
  const { data, revalidate } = useRetryableSWR<T>(key, fetchFromStorage, {
    suspense: true,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  useOnStorageChanged(revalidate);

  const value = fallback !== undefined ? data ?? fallback : data!;

  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const setValue = useCallback(
    async (val: SetStateAction<T>) => {
      const nextValue =
        typeof val === "function" ? (val as any)(valueRef.current) : val;
      await putToStorage(key, nextValue);
      valueRef.current = nextValue;
    },
    [key]
  );

  return useMemo(() => [value, setValue], [value, setValue]);
}

export function usePassiveStorage<T = any>(
  key: string,
  fallback?: T
): [T, Dispatch<SetStateAction<T>>] {
  const { data } = useRetryableSWR<T>(key, fetchFromStorage, {
    suspense: true,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });
  const finalData = fallback !== undefined ? data ?? fallback : data!;

  const [value, setValue] = useState(finalData);
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value) {
      putToStorage(key, value);
    }
    prevValue.current = value;
  }, [key, value]);

  return [value, setValue];
}

export function useOnStorageChanged(handleStorageChanged: () => void) {
  useEffect(() => {
    browser.storage.onChanged.addListener(handleStorageChanged);
    return () => browser.storage.onChanged.removeListener(handleStorageChanged);
  }, [handleStorageChanged]);
}

export async function fetchFromStorage(key: string) {
  const items = await browser.storage.local.get([key]);
  if (key in items) {
    return items[key];
  } else {
    return null;
  }
}

export async function putToStorage<T = any>(key: string, value: T) {
  return browser.storage.local.set({ [key]: value });
}
