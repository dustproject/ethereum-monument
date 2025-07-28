import { IWorld } from "@dust/world/src/codegen/world/IWorld.sol";

library Constants {
  // NOTE: Don't commit a different address, this is used for all programs.
  address internal constant DUST_ADDRESS = 0x253eb85B3C953bFE3827CC14a151262482E7189C;
  IWorld internal constant DUST_WORLD = IWorld(DUST_ADDRESS);
}
