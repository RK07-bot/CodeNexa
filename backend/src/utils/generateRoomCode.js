import crypto from "crypto";

// no I or O and no 0 or 1, so a code is easy to read out loud
const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";

const pick = (chars) => chars[crypto.randomInt(chars.length)];

const generateRoomCode = () =>
  Array.from({ length: 3 }, () => pick(LETTERS)).join("") +
  Array.from({ length: 3 }, () => pick(DIGITS)).join("");

export default generateRoomCode;