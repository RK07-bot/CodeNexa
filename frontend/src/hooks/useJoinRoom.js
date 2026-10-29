import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { joinSession } from "../api/sessions.api.js";

const useJoinRoom = () => {
  const navigate = useNavigate();
  const [joining, setJoining] = useState(null);
  const [error, setError] = useState(null);

  const join = async (code) => {
    setJoining(code);
    setError(null);

    try {
      await joinSession(code);
      navigate(`/session/${code}`);
    } catch (err) {
      const data = err.response?.data;

      setError({
        message: data?.message || "Could not join this room.",
        roomCode: data?.alreadyInRoom ? data.roomCode : null,
      });
    } finally {
      setJoining(null);
    }
  };

  return { join, joining, error };
};

export default useJoinRoom;