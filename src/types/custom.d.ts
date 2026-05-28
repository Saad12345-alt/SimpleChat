declare module "mongo-sanitize" {
  function sanitize(input: any): any;
  export = sanitize;
}

declare namespace Express {
  interface Request {
    file?: import('multer').File;
  }
}
