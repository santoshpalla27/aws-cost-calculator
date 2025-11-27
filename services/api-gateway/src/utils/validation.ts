import Joi from 'joi';

export const schemas = {
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
  }),

  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    firstName: Joi.string().optional(),
    lastName: Joi.string().optional(),
  }),

  terraformEstimate: Joi.object({
    source: Joi.string().valid('files', 'git', 'plan_json').required(),
    gitUrl: Joi.string().uri().when('source', { is: 'git', then: Joi.required() }),
    branch: Joi.string().default('main'),
    terraformFiles: Joi.object().when('source', { is: 'files', then: Joi.required() }),
    planJson: Joi.string().when('source', { is: 'plan_json', then: Joi.required() }),
  }),
};