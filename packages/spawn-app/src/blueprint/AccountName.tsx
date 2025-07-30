import type { Hex } from "viem";
import { useENS } from "./useENS";
import { useKeymakerUser } from "./useKeymakerUser";
import { TruncatedHex } from "./TruncatedHex";

export type Props = {
  address: Hex;
};

export function AccountName({ address }: Props) {
  const { data: user } = useKeymakerUser(address);
  const { data: ens } = useENS(address);
  return (
    <span className="font-medium">
      {user?.username ?? ens?.name ?? <TruncatedHex hex={address} />}
    </span>
  );
}
