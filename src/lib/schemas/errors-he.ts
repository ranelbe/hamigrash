import { z, type ZodErrorMap } from 'zod';

// Global Hebrew translator for Zod's default error messages.
// Custom .min/.max/.regex messages set on individual schemas always win.

export const heErrorMap: ZodErrorMap = (issue, ctx) => {
  let message: string = ctx.defaultError;

  switch (issue.code) {
    case 'invalid_type':
      message = (issue.received === 'undefined' || issue.received === 'null' || issue.received === 'nan')
        ? 'שדה חובה'
        : issue.expected === 'string'  ? 'יש להזין טקסט'
        : issue.expected === 'number'  ? 'יש להזין מספר'
        : issue.expected === 'boolean' ? 'יש לבחור כן/לא'
        : issue.expected === 'date'    ? 'יש להזין תאריך תקין'
        : 'ערך לא תקין';
      break;

    case 'too_small':
      if (issue.type === 'string') {
        message = issue.minimum === 1 ? 'שדה חובה' : `יש להזין לפחות ${issue.minimum} תווים`;
      } else if (issue.type === 'number') {
        message = `הערך המינימלי הוא ${issue.minimum}`;
      } else if (issue.type === 'array') {
        message = `יש לבחור לפחות ${issue.minimum} פריטים`;
      } else if (issue.type === 'date') {
        message = 'התאריך מוקדם מדי';
      }
      break;

    case 'too_big':
      if (issue.type === 'string') {
        message = `מקסימום ${issue.maximum} תווים`;
      } else if (issue.type === 'number') {
        message = `הערך המקסימלי הוא ${issue.maximum}`;
      } else if (issue.type === 'array') {
        message = `מקסימום ${issue.maximum} פריטים`;
      } else if (issue.type === 'date') {
        message = 'התאריך מאוחר מדי';
      }
      break;

    case 'invalid_string':
      message = issue.validation === 'email' ? 'כתובת דוא"ל לא תקינה'
        : issue.validation === 'url'    ? 'כתובת URL לא תקינה'
        : issue.validation === 'uuid'   ? 'מזהה לא תקין'
        : issue.validation === 'regex'  ? (ctx.defaultError || 'פורמט לא תקין')
        : 'טקסט לא תקין';
      break;

    case 'invalid_enum_value':
      message = `ערך לא חוקי. מותר: ${(issue.options as string[]).join(', ')}`;
      break;

    case 'invalid_date':
      message = 'תאריך לא תקין';
      break;

    case 'not_finite':
      message = 'מספר לא תקין';
      break;

    case 'invalid_union':
      message = 'הערך לא מתאים לאף אופציה';
      break;

    case 'custom':
      message = issue.message ?? message;
      break;
  }

  return { message };
};

// Apply once at module load — every schema parsed afterwards uses Hebrew errors.
z.setErrorMap(heErrorMap);
