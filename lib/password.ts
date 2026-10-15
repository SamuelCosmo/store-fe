import type { TKey } from "./i18n";

/** Mismas reglas del backend (UserRequest.password): 8+ con mayúscula,
 *  minúscula y dígito. Se muestran como checklist en los modales. */
export const PASSWORD_RULES: { key: TKey; test: (p: string) => boolean }[] = [
  { key: "pwd.min8", test: (p) => p.length >= 8 },
  { key: "pwd.upper", test: (p) => /[A-Z]/.test(p) },
  { key: "pwd.lower", test: (p) => /[a-z]/.test(p) },
  { key: "pwd.digit", test: (p) => /\d/.test(p) },
];
