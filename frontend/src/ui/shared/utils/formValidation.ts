import type { Rule } from "antd/es/form";
import type { TFunction } from "i18next";

// Email validation
export function emailRules(t: TFunction, required = true): Rule[] {
  const rules: Rule[] = [
    { type: "email", message: t("form.validation.emailInvalid") },
  ];

  if (required) {
    rules.unshift({ required: true, message: t("form.validation.emailRequired") });
  }

  return rules;
}

// Password validation
export function passwordRules(t: TFunction, minLength = 8): Rule[] {
  return [
    { required: true, message: t("form.validation.passwordRequired") },
    { min: minLength, message: t("form.validation.passwordMinLength", { length: minLength }) },
    {
      pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      message: t("form.validation.passwordStrength"),
    },
  ];
}

// Required field validation
export function requiredRule(t: TFunction, fieldName?: string): Rule {
  return {
    required: true,
    message: fieldName
      ? t("form.validation.fieldRequired", { field: fieldName })
      : t("form.validation.required"),
  };
}

// Number validation
export function numberRules(t: TFunction, min?: number, max?: number, required = true): Rule[] {
  const rules: Rule[] = [{ type: "number", message: t("form.validation.numberInvalid") }];

  if (required) {
    rules.unshift({ required: true, message: t("form.validation.numberRequired") });
  }

  if (min !== undefined) {
    rules.push({ type: "number", min, message: t("form.validation.numberMin", { min }) });
  }

  if (max !== undefined) {
    rules.push({ type: "number", max, message: t("form.validation.numberMax", { max }) });
  }

  return rules;
}

// URL validation
export function urlRules(t: TFunction, required = false): Rule[] {
  const rules: Rule[] = [
    { type: "url", message: t("form.validation.urlInvalid") },
  ];

  if (required) {
    rules.unshift({ required: true, message: t("form.validation.urlRequired") });
  }

  return rules;
}

// Phone validation
export function phoneRules(t: TFunction, required = false): Rule[] {
  const rules: Rule[] = [
    {
      pattern: /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/,
      message: t("form.validation.phoneInvalid"),
    },
  ];

  if (required) {
    rules.unshift({ required: true, message: t("form.validation.phoneRequired") });
  }

  return rules;
}

// Async validation for unique email
export function uniqueEmailValidator(
  checkEmailExists: (email: string) => Promise<boolean>,
  t: TFunction
): Rule {
  return {
    validator: async (_, value) => {
      if (!value) return;
      const exists = await checkEmailExists(value);
      if (exists) {
        throw new Error(t("form.validation.emailExists"));
      }
    },
  };
}

// Confirm password validation
export function confirmPasswordRule(t: TFunction, passwordFieldName = "password"): Rule {
  return ({ getFieldValue }) => ({
    validator(_: unknown, value: string) {
      if (!value || getFieldValue(passwordFieldName) === value) {
        return Promise.resolve();
      }
      return Promise.reject(new Error(t("form.validation.passwordMismatch")));
    },
  });
}

// Date range validation
export function dateRangeRules(t: TFunction, required = false): Rule[] {
  const rules: Rule[] = [
    {
      validator: (_, value) => {
        if (!value || value.length !== 2) {
          return Promise.resolve();
        }
        const [start, end] = value;
        if (start && end && start.isAfter(end)) {
          return Promise.reject(new Error(t("form.validation.dateRangeInvalid")));
        }
        return Promise.resolve();
      },
    },
  ];

  if (required) {
    rules.unshift({ required: true, message: t("form.validation.dateRangeRequired") });
  }

  return rules;
}

// Amount validation (positive number with decimals)
export function amountRules(t: TFunction, min = 0.01, max?: number): Rule[] {
  return [
    { required: true, message: t("form.validation.amountRequired") },
    { type: "number", min, message: t("form.validation.amountMin", { min }) },
    ...(max ? [{ type: "number", max, message: t("form.validation.amountMax", { max }) } as Rule] : []),
  ];
}

// Text length validation
export function textLengthRules(t: TFunction, min?: number, max?: number, required = true): Rule[] {
  const rules: Rule[] = [];

  if (required) {
    rules.push({ required: true, message: t("form.validation.textRequired") });
  }

  if (min !== undefined) {
    rules.push({ min, message: t("form.validation.textMinLength", { length: min }) });
  }

  if (max !== undefined) {
    rules.push({ max, message: t("form.validation.textMaxLength", { length: max }) });
  }

  return rules;
}

// Whitespace validation
export function noWhitespaceRule(t: TFunction): Rule {
  return {
    whitespace: true,
    message: t("form.validation.noWhitespace"),
  };
}
