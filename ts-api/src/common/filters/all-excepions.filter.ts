// src/common/filters/all-exceptions.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Log the full error server-side — visible in Render logs
    this.logger.error(exception);

    const responseBody = {
      statusCode: httpStatus,
      message:
        exception instanceof HttpException
          ? exception.message
          : 'Internal server error',
      ...(process.env.NODE_ENV !== 'production' && {
        detail: String(exception), // Only expose stack in dev
      }),
    };

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}