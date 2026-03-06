export interface RegisterDto {
  name: string;
  email: string;
  /** Mínimo 8 chars, 1 maiúscula, 1 minúscula, 1 número — validado no backend com @Matches() */
  password: string;
}
