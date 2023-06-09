import {Request, RequestHandler} from 'express';
import formidable, {Files} from 'formidable';

export interface RequestWithFiles extends Request {
  files?: Files;
}

export const fileUpload: RequestHandler = async (
  req: RequestWithFiles,
  res,
  next,
) => {
  if (!req.headers['content-type']?.startsWith('multipart/form-data;'))
    return res.status(422).json({error: 'Only accepts form-data'});

  const form = formidable({multiples: false});

  form.parse(req, (err, fileds, files) => {
    if (err) return next(err);

    req.body = fileds;
    req.files = files;

    next();
  });
};
