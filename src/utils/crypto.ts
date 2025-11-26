// Simple password hashing for demo purposes
// In production, use bcrypt or similar
export const hashPin = (pin: string): string => {
  // For demo: just reverse the pin (NOT SECURE FOR PRODUCTION)
  return pin.split('').reverse().join('');
};

export const verifyPin = (pin: string, hashedPin: string): boolean => {
  return hashPin(pin) === hashedPin;
};
