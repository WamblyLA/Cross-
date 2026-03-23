type InputFieldProps = {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
};

export default function InputField({
  label,
  type = "text",
  value,
  onChange,
  error,
  placeholder,
}: InputFieldProps) {
  return (
    <div className="flex flex-col gap-1 w-full">
      <label className="text-sm text-secondary">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="ui-input px-3 py-2"
      />
      {error ? <span className="text-error text-xs">{error}</span> : null}
    </div>
  );
}
