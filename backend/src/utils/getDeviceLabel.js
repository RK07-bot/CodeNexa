export const getDeviceLabel = (userAgent = "") => {
  // Get browser name
  // Check Edge first because Edge also contains "Chrome" in its user-agent
  const browser = /edg/i.test(userAgent)
    ? "Edge"
    : /chrome/i.test(userAgent)
      ? "Chrome"
      : /firefox/i.test(userAgent)
        ? "Firefox"
        : /safari/i.test(userAgent)
          ? "Safari"
          : "Unknown browser";

  // Get operating system
  const os = /windows/i.test(userAgent)
    ? "Windows"
    : /mac os/i.test(userAgent)
      ? "macOS"
      : /android/i.test(userAgent)
        ? "Android"
        : /iphone|ipad/i.test(userAgent)
          ? "iOS"
          : /linux/i.test(userAgent)
            ? "Linux"
            : "Unknown device";

  // Example: Chrome on Windows
  return `${browser} on ${os}`;
};
