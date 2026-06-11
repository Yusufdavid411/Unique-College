import { LoaderCircle } from "lucide-react";

export default function LoadingButton({
  children,
  className = "button primary",
  loading = false,
  loadingText = "Working...",
  type = "button",
  ...props
}) {
  return (
    <button className={className} type={type} disabled={loading || props.disabled} aria-busy={loading} {...props}>
      {loading && <LoaderCircle className="spin-icon" size={16} />}
      {loading ? loadingText : children}
    </button>
  );
}
