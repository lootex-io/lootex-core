import { Injectable, Inject, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import {
  EmailRecipient,
  EmailSentResult,
  EmailReqOptions,
} from './send-in-blue.interface';

@Injectable()
export class SendInBlueService {
  private logger = new Logger(SendInBlueService.name);

  constructor(
    @Inject('SENDINBLUE_KEY') private SENDINBLUE_KEY: string,

    private readonly httpService: HttpService,
  ) {}

  /**
   * @async
   * @function sendPlainEmail
   * @summary calls SendInBlue on behalf of your account to send emails
   *          plain text content
   * @param {EmailRecipient} recipient recipient of your email
   * @param {String} subject Email subject
   * @param {String} content plain text email content
   * @return {Promise<EmailSentResult>} res.data
   */
  async sendPlainEmail(
    recipient: EmailRecipient,
    subject: string,
    content: string,
  ): Promise<EmailSentResult> {
    try {
      const options = new EmailReqOptions(this.SENDINBLUE_KEY);
      options.data.addRecipient(recipient);
      options.data.subject = subject;
      options.data.content = content;
      return (await this.httpService.axiosRef.request(options))?.data;
    } catch (err) {
      this.logger.error(err);
      throw err;
    }
  }
}
