import { Children, isValidElement, type ChangeEvent, type ChangeEventHandler, type ReactNode } from "react";
import {
  Select as BeuiSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "~/components/motion/select";

export type SelectOption = {
  value: string;
  label: string;
};

type SelectProps = {
  id?: string;
  value: string;
  options?: SelectOption[];
  children?: ReactNode;
  onValueChange?: (value: string) => void;
  onChange?: ChangeEventHandler<HTMLSelectElement>;
  className?: string;
  "aria-label"?: string;
};

export function Select({ id, value, options, children, onValueChange, onChange, className, "aria-label": ariaLabel }: SelectProps) {
  const childOptions = Children.toArray(children).flatMap((child) => {
    if (!isValidElement<{ value?: string; children?: ReactNode }>(child)) return [];
    return [{ value: child.props.value ?? "", label: String(child.props.children ?? "") }];
  });
  const resolvedOptions = options ?? childOptions;

  return (
    <BeuiSelect
      value={value}
      className={className}
      onValueChange={(next) => {
        onValueChange?.(next);
        onChange?.({ target: { value: next } } as ChangeEvent<HTMLSelectElement>);
      }}
    >
      <SelectTrigger className="focus-ring h-11 rounded-xl border-[#c4d0dd] bg-white px-3.5 font-semibold shadow-[0_2px_8px_rgba(15,23,42,.04)]" >
        <SelectValue placeholder={ariaLabel} />
      </SelectTrigger>
      <SelectContent className="min-w-[13rem] border-[#c4d0dd] bg-white shadow-[0_18px_42px_rgba(15,23,42,.16)]" >
        {resolvedOptions.map((option) => (
          <SelectItem key={option.value} value={option.value} className="focus-ring min-h-10 text-[#344155] data-[selected=true]:text-[#1d4ed8]">
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
      {id ? <input id={id} type="hidden" value={value} readOnly /> : null}
    </BeuiSelect>
  );
}
