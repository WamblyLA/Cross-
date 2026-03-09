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
      <label className="text-sm">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 rounded border border-white/20 bg-transparent outline-none"
      />
      {error ? <span className="text-red-500 text-xs">{error}</span> : null}
    </div>
  );
}