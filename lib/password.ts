/** Mismas reglas del backend (UserRequest.password): 8+ con mayúscula,
 *  minúscula y dígito. Se muestran como checklist en los modales. */
export const PASSWORD_RULES: { label: string; test: (p: string) => boolean }[] = [
  { label: "Mínimo 8 caracteres", test: (p) => p.length >= 8 },
  { label: "Una mayúscula", test: (p) => /[A-Z]/.test(p) },
  { label: "Una minúscula", test: (p) => /[a-z]/.test(p) },
  { label: "Un número", test: (p) => /\d/.test(p) },
];
