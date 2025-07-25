import { skipToken, useQuery } from "@tanstack/react-query";
import { useDustClient } from "./useDustClient";

export function useSelectedObjectTypeQuery(enabled: boolean) {
  const { data: dustClient } = useDustClient();

  return useQuery<number | null>({
    queryKey: ["getSelectedObjectType"],
    queryFn:
      !dustClient || !enabled
        ? skipToken
        : async () => {
            try {
              const selectedObjectType = await dustClient.provider.request({
                method: "getSelectedObjectType",
              });
              return Number(selectedObjectType);
            } catch (error) {
              console.error("Error getting selected object type:", error);
              return null;
            }
          },
    enabled: enabled && !!dustClient,
    refetchInterval: 200,
    refetchIntervalInBackground: true,
  });
}
