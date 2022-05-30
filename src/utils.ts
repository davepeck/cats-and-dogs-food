/** Return `true` if this device supports touch. */
export const hasTouchSupport = () => {
  return 'ontouchstart' in window;
};
