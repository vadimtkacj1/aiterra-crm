export class TranslatableError extends Error {
  constructor(public readonly i18nKey: string) {
    super(i18nKey);
    this.name = "TranslatableError";
  }
}
