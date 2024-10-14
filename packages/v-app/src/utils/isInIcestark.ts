import { getCache } from "./cache";

const isInIcestark = () => {
  const cache = getCache("root");
  return !!cache;
};

export default isInIcestark;
