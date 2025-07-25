import { useQuery } from "@tanstack/react-query";
import { connectDustClient } from "dustkit/internal";

export function useDustClient() {
  return useQuery({
    queryKey: ["dust-client"],
    queryFn: connectDustClient,
  });
}
