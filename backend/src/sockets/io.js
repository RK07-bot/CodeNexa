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

export const LOBBY_ROOM = "lobby";

// tells everyone watching the room lists to refresh, they fetch the new list themselves
export const emitToLobby = () => {
  io?.to(LOBBY_ROOM).emit("lobby:changed");
};