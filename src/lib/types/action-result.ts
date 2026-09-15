/// The single response shape every server action returns. Import this - never
/// redeclare it locally.
export type ActionResult<T = unknown> = {
  success: boolean;
  message?: string;
  data?: T;
};

export function ok<T>(data: T, message?: string): ActionResult<T> {
  return { success: true, data, message };
}

export function fail<T = never>(message: string): ActionResult<T> {
  return { success: false, message };
}
