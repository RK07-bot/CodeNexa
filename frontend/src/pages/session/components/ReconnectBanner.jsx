import { motion } from "framer-motion";
import { Clock, UserX, WifiOff } from "lucide-react";
import { useSocket } from "../../../context/SocketContext.jsx";
import useNow from "../../../hooks/useNow.js";
import { formatClock } from "../../../lib/formatDuration.js";

const Banner = ({ icon: Icon, children }) => (
  <motion.div
    initial={{ opacity: 0, y: -6 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex shrink-0 items-center gap-2.5 rounded-xl border border-amber-400/25 bg-amber-400/8 px-4 py-2.5 text-sm text-amber-300"
  >
    <Icon className="size-4 shrink-0" />
    <p>{children}</p>
  </motion.div>
);

const ReconnectBanner = ({ session, partner, graceSeconds, clockOffset }) => {
  const { connected } = useSocket();
  const now = useNow();

  if (!connected) return <Banner icon={WifiOff}>Connection lost. Trying to reconnect...</Banner>;
  if (!partner || partner.connected) return null;

  if (session.status === "completed") {
    return <Banner icon={UserX}>{partner.username} has left the room.</Banner>;
  }

  // a guest who joined but has not opened the room yet has no drop time to count from
  if (!partner.disconnectedAt) {
    return <Banner icon={Clock}>Waiting for {partner.username} to connect...</Banner>;
  }

  const remaining = Date.parse(partner.disconnectedAt) + graceSeconds * 1000 - (now + clockOffset);

  return remaining > 0 ? (
    <Banner icon={Clock}>
      {partner.username} lost connection. The session ends in{" "}
      <span className="font-mono font-semibold">{formatClock(remaining)}</span> unless they come back.
    </Banner>
  ) : (
    <Banner icon={Clock}>Ending the session...</Banner>
  );
};

export default ReconnectBanner;