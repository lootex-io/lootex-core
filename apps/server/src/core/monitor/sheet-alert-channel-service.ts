import { Injectable, Logger } from '@nestjs/common';
import { google, sheets_v4 } from 'googleapis';

@Injectable()
export class SheetAlertChannelService {
  private readonly logger = new Logger(SheetAlertChannelService.name);

  private clientEmail = 'test-402@alert-channel.iam.gserviceaccount.com';
  private clientId = '102534441070861536262';
  private privateKey =
    '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCOwUBvXcM5Gf9U\nNdIwy0jeDVWgc3qpDih1+yO+GsFZTNVcz+ktAsmGguBGl2nIYa4lo1S4qVUiIE+D\na/LBrNuE5VjjVshcVmzrPo62aA4miU7wdGl5bA01CBQzLHhxrZpx0JOt3f/d83b0\nFmDlAPxSh65vnpF8TElFEtXwDNELQ2ey0bL2vyhn9VJovoCxtaj5qCiu0HGln9/X\nLbkumi7a1q+wV3dROuws62shAoFBq6fi0QwSnKV5mGXehcI0tjwooxUWAp6B3TcW\nms66b1Xs7yzh/7GZ4yMOgKxbZLwJAAQ4NZc5mdfBDFnT8RHWIwM/EiejCKCiPciP\n0wUZv8uvAgMBAAECggEADhqjzhz6a8rYwi4rHS0Ifv/cROUD6m3+q2Frr52fGr6P\nmgLkq9DJrmOB2xecmPKlrQxNE42PXrbIhFiG/IGikqfCN3vcgdr8GeXtXbI8K6yH\nQxSNUzTMvT+WF1Q+diTLzJDp9lSnsfsa9pS7cAS/6TuEjXyiLSCwYIWy42uwv6b8\naOevsV4Bk1Hm8Ek+6i0yW4YkV7SP7HTEhxhMuQWOS1RGpqPX1N9Up2PHmiX8N6ne\nbC10l5w62scRqm1Bwr8JuHqauc1pb0M/ssMaPMjM0J61a/qvb5edX55f6cRgY+mw\nzrPcYDgueIWW5yTSyQRP3S61KJplZMt3b+qLtIfyIQKBgQDH2OL5GwbzHMDsYU2c\n8RePoNWMAVbtlvITosJFoq1tpmeKa5bM4J45Nquv0F+ARrzwERVMVTU9kaaOG5mO\nIa+OTE9gZQePy7rQdjZiQU/RCWFO0uv9t71c53Pr+Y6+FaHFo7dZoBBObhvnCg7c\nQOMsJTc3UcjszM5/4RtE5CRS0QKBgQC23a9JGPlJroqeKejgI0v10IUgGoVF3YwI\ns4l3hu6j1WeshuDAPGCzfKgRvrkhQYqltarL/l6mX6ovUMiIrsTfJHfz7xZeMWwZ\nStfAknbzVndyzueaVOuoDk9Pa5cLGtyxncIA3kT9+ArDVdqzPKTSVkjCFjLaafrC\nmTXjRoDWfwKBgQC+nFMAHZMnVgl8a+JHCnzadSC5BJ4QxqPlrpt1J5AawViIYc3X\nY3YGQ+rFKg2sn8udfe2+fJbnPoCJkjGHqwFyy735xuLLeBmasuV0Ga8zRasWL37+\n470tW2TpcYGAM8m0ZE6AoXZsGAFs/97knM8QT/62OL9XfJCIz//eWWt7wQKBgDZX\nLCaJsFKv9mtHwvcQJht3CoheuSnoyxsu1vPY+gNfgD5pmlIl3wqXSY50Yak7Q8s4\nb/fMsC26keUbmWvcm44/1RF9A+WbxCbD8dc87vIiyL4qM/LNt3WqQvEz5J+dLOXv\nHl6JrnDWC8S+N445wDTtBRP/6r6y7Zx0UOon4lNbAoGAD6hAHjeOciS4GGoZpsVc\n5t2Ig/zY7oYZqwTI/9ymEIhfUwKcaIY0p84wHVUJtMaEj9LW/j+7N//dyPON6++K\nz2MVLY1WduTFCuKImeWQSXZsAF8HZhEA+IxA3v/HNYiRcnPDEt/DsPgiZr6zD+s+\nJXsL9PcuDC9yVaHnpSfPXWA=\n-----END PRIVATE KEY-----\n'.replace(
      /\\n/g,
      '\n',
    );

  //
  private sheetId = '1o8ZKTj48cTMB0o28CYiT0wSvah91MkDfvL5Xmuz3CxM';
  private tableName = 'Sheet1';
  private range = 'A:B:C:D:E';

  async getAlertChannelSheetClient(): Promise<sheets_v4.Sheets> {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: this.clientEmail,
        client_id: this.clientId,
        private_key: this.privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const authClient = await auth.getClient();
    // @ts-ignore
    return google.sheets({
      version: 'v4',
      auth: authClient,
    });
  }

  // async readSheet() {
  //   const sheetClient = await this.getAlertChannelSheetClient();
  //   const res = await sheetClient.spreadsheets.values.get({
  //     spreadsheetId: this.sheetId,
  //     range: `${this.tableName}`,
  //   });
  //   return res.data.values;
  // }

  async appendItem(data: any[]) {
    this.logger.debug(`appendItem ${data}`);
    const sheetClient: any = await this.getAlertChannelSheetClient();
    await sheetClient.spreadsheets.values.append({
      spreadsheetId: this.sheetId,
      range: `${this.tableName}`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        majorDimension: 'ROWS',
        values: [data],
      },
    });
  }
}
