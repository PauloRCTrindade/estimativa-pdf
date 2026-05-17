import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Loader2, X } from "lucide-react";

type ToastType = "success" | "error" | "loading" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

function getType(message: string): ToastType {
  if (message.startsWith("✅") || message.includes("sucesso") || message.includes("carregada") || message.includes("aberto") || message.includes("baixado") || message.includes("gerado")) return "success";
  if (message.startsWith("❌") || message.includes("Erro") || message.includes("erro") || message.includes("impossível") || message.includes("possível")) return "error";
  if (message.includes("...") || message.includes("Gerando") || message.includes("Salvando") || message.includes("Excluindo") || message.includes("Abrindo") || message.includes("Buscando") || message.includes("Carregando")) return "loading";
  return "info";
}

const STYLES: Record<ToastType, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
  success: { bg: "bg-green-50", border: "border-green-300", text: "text-green-800", icon: <CheckCircle className="h-4 w-4 text-green-600 shrink-0" /> },
  error:   { bg: "bg-red-50",   border: "border-red-300",   text: "text-red-800",   icon: <XCircle   className="h-4 w-4 text-red-600   shrink-0" /> },
  loading: { bg: "bg-blue-50",  border: "border-blue-300",  text: "text-blue-800",  icon: <Loader2   className="h-4 w-4 text-blue-600  shrink-0 animate-spin" /> },
  info:    { bg: "bg-zinc-50",  border: "border-zinc-300",  text: "text-zinc-800",  icon: null },
};

let toastId = 0;
type Listener = (msg: string) => void;
const listeners = new Set<Listener>();

export function notify(message: string) {
  listeners.forEach((fn) => fn(message));
}

export function ToastNotification() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const handler: Listener = (message) => {
      const id = ++toastId;
      const type = getType(message);

      setToasts((prev) => {
        // Remove toasts de loading anteriores quando chega sucesso ou erro
        const filtered = (type === "success" || type === "error")
          ? prev.filter((t) => t.type !== "loading")
          : prev;
        return [...filtered, { id, message, type }];
      });

      if (type !== "loading") {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000);
      }
    };
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const s = STYLES[toast.type];
        const clean = toast.message.replace(/^[✅❌]\s*/, "");
        return (
          <div
            key={toast.id}
            className={`flex items-center gap-3 rounded-lg border px-4 py-3 shadow-md text-sm pointer-events-auto ${s.bg} ${s.border} ${s.text}`}
          >
            {s.icon}
            <span className="flex-1">{clean}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="opacity-50 hover:opacity-100 transition-opacity"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
