import { type Locator, type Page } from '@playwright/test';

export class ContractSignPage {
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly signButton: Locator;
  readonly signatureCanvas: Locator;
  readonly clearSignatureButton: Locator;
  readonly successHeading: Locator;
  readonly payButton: Locator;
  readonly notFoundHeading: Locator;

  constructor(private readonly page: Page) {
    this.nameInput = page.locator('input[placeholder="Enter your full name as on ID"]');
    this.emailInput = page.locator('input[type="email"]');
    this.signButton = page.getByRole('button', { name: 'Sign contract' });
    this.signatureCanvas = page.locator('canvas');
    this.clearSignatureButton = page.getByRole('button', { name: 'Clear signature' });
    this.successHeading = page.getByText('Contract signed!');
    this.payButton = page.getByRole('button', { name: /Pay now/ });
    this.notFoundHeading = page.getByText('Contract not found');
  }

  async goto(token: string) {
    await this.page.goto(`/contracts/sign/${token}`);
  }

  /** Simulate drawing a stroke on the signature canvas. */
  async drawSignature() {
    await this.signatureCanvas.waitFor({ state: 'visible' });
    const box = await this.signatureCanvas.boundingBox();
    if (!box) throw new Error('Signature canvas not found in DOM');
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await this.page.mouse.move(cx - 30, cy);
    await this.page.mouse.down();
    await this.page.mouse.move(cx, cy - 20, { steps: 5 });
    await this.page.mouse.move(cx + 30, cy, { steps: 5 });
    await this.page.mouse.up();
  }

  /** Check a checkbox by its 0-based index among all checkboxes on the page. */
  async checkByIndex(index: number) {
    await this.page.locator('input[type="checkbox"]').nth(index).check();
  }

  async fillSignForm(name: string, email: string) {
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
    await this.drawSignature();
    await this.checkByIndex(0); // accept terms
    await this.checkByIndex(1); // accept policies
  }
}
