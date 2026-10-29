import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function PasswordInput({ id, label = "password", disabled, ...props }) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const [visible, setVisible] = useState(false);

  return (
    <span className="password-field">
      <input {...props} id={inputId} disabled={disabled} type={visible ? "text" : "password"} />
      <button type="button" disabled={disabled} aria-controls={inputId} aria-label={`${visible ? "Hide" : "Show"} ${label}`} aria-pressed={visible} onClick={() => setVisible((current) => !current)}>
        {visible ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
      </button>
    </span>
  );
}
