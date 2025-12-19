import { HttpException, HttpStatus } from '@nestjs/common';

export class SimpleJson {
  constructor(
    protected status: string,
    protected message: string,
    protected data: any,
  ) {}

  static success(params?: { status?: string; message?: string; data?: any }) {
    params = {
      status: 'success',
      message: 'LT0963',
      data: undefined,
      ...params,
    };
    return new SimpleJson(
      params.status,
      params.message,
      params.data,
    ).toCleanJson();
  }

  /**
   * 移除undefined属性
   */
  toCleanJson() {
    return JSON.parse(JSON.stringify(this));
  }
}

/**
 * throw SimpleException.fail({
 *   debug: 'error message',
 * });
 */
export class SimpleException {
  static fail(params?: {
    statusCode?: string;
    message?: string;
    debug?: string;
    httpStatus?: HttpStatus;
  }) {
    params = {
      statusCode: '400',
      message: 'LT0961',
      debug: '',
      httpStatus: HttpStatus.BAD_REQUEST,
      ...params,
    };
    return new HttpException(
      {
        statusCode: params.statusCode,
        message: params.message,
        debug: params.debug,
      },
      params.httpStatus,
    );
  }

  static error(response: string | any) {
    return new HttpException(response, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
