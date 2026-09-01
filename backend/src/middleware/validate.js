import Joi from 'joi';

export const triageSchema = Joi.object({
  symptoms: Joi.string().required().min(3).messages({
    'string.empty': 'Symptoms description cannot be empty.',
    'any.required': 'Missing required "symptoms" field. Please provide a non-empty description of symptoms.',
    'string.min': 'Symptoms description must be at least 3 characters long.'
  }),
  aadhaar_number: Joi.string().allow('', null).pattern(/^[0-9\s]{0,14}$/).optional().messages({
    'string.pattern.base': 'Aadhaar number must be a 12-digit numeric identifier.'
  }),
  patient_id: Joi.string().allow('', null).optional(),
  patient_name: Joi.string().allow('', null).optional(),
  patient_age: Joi.alternatives().try(Joi.string(), Joi.number()).allow('', null).optional(),
  age: Joi.alternatives().try(Joi.string(), Joi.number()).allow('', null).optional(),
  medical_history: Joi.alternatives().try(
    Joi.string().allow('', null),
    Joi.array().items(Joi.string())
  ).optional(),
  additional_history: Joi.string().allow('', null).optional(),
  vitals: Joi.alternatives().try(
    Joi.object({
      bp: Joi.string().allow('', null).optional(),
      pulse: Joi.alternatives().try(Joi.string(), Joi.number()).allow('', null).optional(),
      spO2: Joi.alternatives().try(Joi.string(), Joi.number()).allow('', null).optional(),
      spo2: Joi.alternatives().try(Joi.string(), Joi.number()).allow('', null).optional(),
      temperature: Joi.alternatives().try(Joi.string(), Joi.number()).allow('', null).optional(),
      temp: Joi.alternatives().try(Joi.string(), Joi.number()).allow('', null).optional(),
    }).unknown(true),
    Joi.string().allow('', null)
  ).optional(),
  gcs: Joi.alternatives().try(Joi.string(), Joi.number()).allow('', null).optional(),
  gcs_score: Joi.alternatives().try(Joi.string(), Joi.number()).allow('', null).optional(),
  referred_facility_id: Joi.alternatives().try(Joi.string(), Joi.number()).allow(null).optional(),
  status: Joi.string().allow('', null).optional()
}).unknown(true);

export function validateTriagePayload(req, res, next) {
  const { error, value } = triageSchema.validate(req.body, { abortEarly: false });

  if (error) {
    console.warn('⚠️ [Joi Validation Error]:', error.details.map((d) => d.message).join(' | '));
    return res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: error.details[0].message,
      validation_errors: error.details.map((d) => d.message)
    });
  }

  req.validatedBody = value;
  next();
}
