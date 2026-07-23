/* react-hook-form–based Form primitives replacing antd Form.
   Pattern for migrated call sites:

     const form = useForm<Values>({ defaultValues: {...} });
     <Form form={form} onFinish={handler}>
       <FormItem name="email" label={t(...)} rules={{ required: t("errors.validation") }}>
         {(field) => <Input {...field} />}
       </FormItem>
     </Form>

   `rules` maps to RHF RegisterOptions; errors render under the field. */
import * as React from "react";
import {
  Controller,
  FormProvider,
  useFormContext,
  type ControllerRenderProps,
  type FieldValues,
  type Path,
  type RegisterOptions,
  type UseFormReturn,
} from "react-hook-form";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface FormProps<T extends FieldValues> extends Omit<React.FormHTMLAttributes<HTMLFormElement>, "onSubmit"> {
  form: UseFormReturn<T>;
  onFinish?: (values: T) => void | Promise<void>;
  children: React.ReactNode;
}

export function Form<T extends FieldValues>({ form, onFinish, children, className, ...rest }: FormProps<T>) {
  return (
    <FormProvider {...form}>
      <form
        noValidate
        className={cn("space-y-5", className)}
        onSubmit={form.handleSubmit(async (values) => {
          await onFinish?.(values as T);
        })}
        {...rest}
      >
        {children}
      </form>
    </FormProvider>
  );
}

interface FormItemProps<T extends FieldValues, N extends Path<T>> {
  name: N;
  label?: React.ReactNode;
  /** RHF validation rules; `required` may be the error message string. */
  rules?: RegisterOptions<T, N>;
  hint?: React.ReactNode;
  className?: string;
  children: (field: ControllerRenderProps<T, N>, meta: { invalid: boolean }) => React.ReactNode;
}

export function FormItem<T extends FieldValues, N extends Path<T>>({
  name, label, rules, hint, className, children,
}: FormItemProps<T, N>) {
  const ctx = useFormContext<T>();
  const required = Boolean(rules?.required);
  const id = React.useId();
  return (
    <Controller
      control={ctx.control}
      name={name}
      rules={rules}
      render={({ field, fieldState }) => (
        <div className={cn("space-y-1.5", className)}>
          {label != null && (
            <Label htmlFor={id}>
              {label}
              {required && <span className="text-destructive ms-1">*</span>}
            </Label>
          )}
          {/* id + aria-invalid ride along on the field object so plain
              `{...field}` spreads wire up the label and error styling. */}
          {children(
            { ...field, id, "aria-invalid": fieldState.invalid || undefined } as ControllerRenderProps<T, N>,
            { invalid: fieldState.invalid },
          )}
          {fieldState.error?.message ? (
            <p role="alert" className="text-xs text-destructive">{fieldState.error.message}</p>
          ) : hint ? (
            <p className="text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>
      )}
    />
  );
}
