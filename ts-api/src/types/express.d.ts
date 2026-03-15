/* eslint-disable prettier/prettier */
declare namespace Express {
  interface Request {
    user?: {
      id: string;
      email: string;
    };
  }
}
//ts-api/src/types/express.d.ts