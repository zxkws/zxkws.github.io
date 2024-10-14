import { getCache } from "./cache";

export default (): string => {
  return getCache("basename") ?? "/";
};
