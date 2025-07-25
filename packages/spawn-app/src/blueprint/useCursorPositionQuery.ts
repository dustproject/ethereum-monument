import { skipToken, useQuery } from "@tanstack/react-query";
import { dustClient } from "../dustClient";

type Cursor = {
  x: number;
  y: number;
  z: number;
};

export function useCursorPositionQuery() {
  return useQuery<Cursor | null>({
    queryKey: ["cursor", "position"],
    queryFn: !dustClient
      ? skipToken
      : async () => {
          try {
            const cursor = await dustClient.provider.request({
              method: "getCursorPosition",
            });

            if (!cursor) {
              return null;
            }

            return {
              x: Math.floor((cursor.x ?? 0) / 16),
              y: Math.floor((cursor.y ?? 0) / 16),
              z: Math.floor((cursor.z ?? 0) / 16),
            };
          } catch (e) {
            console.error("Error fetching cursor", e);
            return null;
          }
        },
    enabled: !!dustClient,
    refetchIntervalInBackground: true,
    refetchInterval: 100,
  });
}
