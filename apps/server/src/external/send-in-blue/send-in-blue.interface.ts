import { AxiosRequestConfig, RawAxiosRequestHeaders } from 'axios';

export class EmailRecipient {
  public email: string;

  public name: string;

  constructor(email: string, name: string) {
    this.email = email;
    this.name = name;
  }
}

export class EmailReqPayload {
  public sender: EmailRecipient = new EmailRecipient(
    'support@lootex.io',
    'Lootex Support',
  );

  public to: Array<EmailRecipient> = [];

  public subject = '';

  constructor(subject: string) {
    this.subject = subject;
  }

  /**
   * @public
   * @function addRecipient
   * @summary Adds a recipient to this email delivery
   * @param recipient Recipient instance to add to payload
   */
  public addRecipient(recipient: EmailRecipient): void {
    this.to.push(recipient);
  }

  /**
   * @public
   * @function recipientCount
   * @summary gives you how many recipients this delivery has
   * @return {Number} recipientCount
   */
  public get recipientCount(): number {
    return this.to.length;
  }

  /**
   * @public
   * @function removeRecipient
   * @summary does a splice on target recipient and return it
   * @param {EmailRecipient} recipient Recipient instance to remove
   * @return {Array<EmailRecipient>} spliceResult
   */
  public removeRecipient(recipient: EmailRecipient): Array<EmailRecipient> {
    return this.to.indexOf(recipient) === -1
      ? []
      : this.to.splice(this.to.indexOf(recipient), 1);
  }

  /**
   * @public
   * @function removeRecipientByEmail
   * @summary removes a recipient from the 'to' address book using email as key
   * @param email Email address to look for
   */
  public removeRecipientByEmail(email: string): Array<EmailRecipient> {
    for (const recipient of this.to) {
      if (recipient.email === email) {
        return this.removeRecipient(recipient);
      }
    }
    return [];
  }

  /**
   * @function clearRecipients
   * @summary clears the 'to' recipient array
   */
  public clearRecipients(): void {
    this.to.splice(0, this.to.length);
  }
}

export class EmailReqPlainPayload extends EmailReqPayload {
  private htmlContent = '';
  private readonly htmlTemplate: '<html><head></head><body>%c</body></html>';
  get content(): string {
    return this.htmlTemplate.replace('%c', this.htmlContent);
  }
  set content(val: string) {
    if (typeof val === 'string') this.htmlContent = val;
  }
  constructor(subject: string) {
    super(subject);
  }
}

export class EmailReqOptions implements AxiosRequestConfig {
  readonly url: string = 'https://api.sendinblue.com/v3/smtp/email';

  readonly method: string = 'POST';

  headers: RawAxiosRequestHeaders;

  data: EmailReqPlainPayload;

  constructor(key: string, subject = '') {
    this.headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'api-key': key,
    };
    this.data = new EmailReqPlainPayload(subject);
  }
}

export interface EmailSentResult {
  messageId: string;
  key?: string;
}
