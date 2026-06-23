import { useRef, useEffect } from "react";

/**
 * Hook que adiciona rolagem horizontal por click+arraste (grab/drag scroll)
 * em um elemento container. Não interfere com drag-and-drop nativo, cliques
 * em elementos interativos (botões, inputs, links, cards com draggable, etc.)
 * e preserva a rolagem com scrollbar e mouse wheel.
 */
export function useDragScroll<T extends HTMLElement>() {
  const containerRef = useRef<T>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isDragging = false;
    let startX = 0;
    let scrollLeft = 0;
    let hasMoved = false;

    const isInteractive = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;

      // Elementos interativos nativos
      const interactiveTags = ["BUTTON", "INPUT", "TEXTAREA", "SELECT", "A", "LABEL"];
      if (interactiveTags.includes(target.tagName)) return true;

      // Elementos dentro de componentes shadcn/ui (Popover, Dialog, etc.)
      if (target.closest("[role='dialog']")) return true;
      if (target.closest("[role='menuitem']")) return true;
      if (target.closest("[data-radix-popper-content-wrapper]")) return true;

      // Drag-and-drop nativo
      if (target.closest('[draggable="true"]')) return true;

      // Cards e colunas (evitar conflito com drag do Kanban)
      if (target.closest("[data-kanban-card]")) return true;
      if (target.closest("[data-kanban-column-header]")) return true;

      // Evitar textos editáveis
      if (target.isContentEditable) return true;

      return false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      e.preventDefault();

      const x = e.pageX - container.offsetLeft;
      const walk = x - startX;

      // Multiplicador para tornar o scroll mais suave/natural
      const scrollMultiplier = 1.5;
      container.scrollLeft = scrollLeft - walk * scrollMultiplier;

      if (Math.abs(walk) > 3) {
        hasMoved = true;
      }
    };

    const handleMouseUp = () => {
      if (!isDragging) return;

      const hadMoved = hasMoved;

      // Finaliza o estado de arraste imediatamente
      isDragging = false;
      container.style.cursor = "";
      container.style.userSelect = "";

      // Remove os listeners globais adicionados no mousedown
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      container.removeEventListener("mouseleave", handleMouseUp);

      hasMoved = false;

      // Se não houve movimento, não precisa suprimir clique
      if (!hadMoved) return;

      // Suprime o próximo click apenas se ele ocorrer no fundo vazio do board.
      // Clicar em cards, botões e outros elementos interativos continua funcionando.
      const captureClick = (e: MouseEvent) => {
        cleanup();
        if (isInteractive(e.target)) return;
        e.preventDefault();
        e.stopPropagation();
      };

      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        container.removeEventListener("click", captureClick, true);
        hasMoved = false;
      };

      container.addEventListener("click", captureClick, true);
      const timeoutId = setTimeout(cleanup, 150);
    };

    const handleMouseDown = (e: MouseEvent) => {
      // Só ativa com botão esquerdo
      if (e.button !== 0) return;

      // Ignora elementos interativos
      if (isInteractive(e.target)) return;

      // Ignora se não houver scroll horizontal possível
      if (container.scrollWidth <= container.clientWidth) return;

      isDragging = true;
      hasMoved = false;
      startX = e.pageX - container.offsetLeft;
      scrollLeft = container.scrollLeft;

      container.style.cursor = "grabbing";
      container.style.userSelect = "none";

      // Adiciona listeners globais apenas durante o arraste
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      container.addEventListener("mouseleave", handleMouseUp);
    };

    container.addEventListener("mousedown", handleMouseDown);

    return () => {
      container.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      container.removeEventListener("mouseleave", handleMouseUp);
    };
  }, []);

  return containerRef;
}
