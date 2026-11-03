import { useEffect, useRef } from "react";

// a video or audio element can only be given a stream through a property, never through JSX
const useStream = (stream) => {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (el && el.srcObject !== stream) el.srcObject = stream ?? null;
  }, [stream]);

  return ref;
};

// always muted: the sound of a call travels in its own stream and plays through StreamAudio
export const StreamVideo = ({ stream, className = "" }) => {
  const ref = useStream(stream);
  return <video ref={ref} autoPlay playsInline muted className={className} />;
};

export const StreamAudio = ({ stream }) => {
  const ref = useStream(stream);
  return <audio ref={ref} autoPlay />;
};