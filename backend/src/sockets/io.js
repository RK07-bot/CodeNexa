let io = null;

export const setIo = (instance) => {
  io = instance;
};

export const chainRoom = (chainId) => `chain:${chainId}`;
export const userRoom = (userId) => `user:${userId}`;

// does nothing before the socket server is up, so the REST code never has to check
export const emitToChain = (chainId, event, payload) => {
  io?.to(chainRoom(chainId)).emit(event, payload);
};