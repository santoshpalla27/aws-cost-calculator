import Joi from 'joi';
import logger from '../config/logger.config.js';

export const validateEstimationRequest = (req, res, next) => {
  const schema = Joi.object({
    aws_access_key_id: Joi.string().optional(),
    aws_secret_access_key: Joi.string().optional(),
    aws_session_token: Joi.string().optional(),
    region: Joi.string().valid(
      'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
      'eu-west-1', 'eu-west-2', 'eu-central-1',
      'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1',
      'ap-south-1'
    ).optional(),
    filePaths: Joi.alternatives().try(
      Joi.array().items(Joi.string()),
      Joi.string()
    ).optional()
  }).unknown(true);

  const { error } = schema.validate(req.body);
  
  if (error) {
    logger.error('Validation error: ' + error.details[0].message);
    logger.error('Request body: ' + JSON.stringify(req.body));
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: error.details[0].message
    });
  }

  next();
};