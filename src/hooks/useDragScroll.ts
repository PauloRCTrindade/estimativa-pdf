import { useRef, useCallback, useEffect } from "react";

/**
 * Hook que adiciona rolagem horizontal por click+arraste (grab/drag scroll)
 * em um elemento container. Não interfere com drag-and-drop nativo, cliques
 * em elementos interativos (botões, inputs, links, cards com draggable, etc.)
 * e preserva a rolagem com scrollbar e mouse wheel.
 */
export function useDragScroll<T extends HTMLElement>() {
  const containerRef = useRef<T>(null);
  const stateRef = useRef({
    isDragging: false,
    startX: 0,
    scrollLeft: 0,
    hasMoved: false,
  });

  const isInteractive = useCallback((target: EventTarget | null): boolean => {
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
  }, []);

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;

      // Só ativa com botão esquerdo
      if (e.button !== 0) return;

      // Ignora elementos interativos
      if (isInteractive(e.target)) return;

      // Ignora se não houver scroll horizontal possível
      if (container.scrollWidth <= container.clientWidth) return;

      stateRef.current.isDragging = true;
      stateRef.current.hasMoved = false;
      stateRef.current.startX = e.pageX - container.offsetLeft;
      stateRef.current.scrollLeft = container.scrollLeft;

      container.style.cursor = "grabbing";
      container.style.userSelect = "none";
    },
    [isInteractive]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container || !stateRef.current.isDragging) return;

      e.preventDefault();

      const x = e.pageX - container.offsetLeft;
      const walk = x - stateRef.current.startX;

      // Multiplicador para tornar o scroll mais suave/natural
      const scrollMultiplier = 1.5;
      container.scrollLeft = stateRef.current.scrollLeft - walk * scrollMultiplier;

      if (Math.abs(walk) > 3) {
        stateRef.current.hasMoved = true;
      }
    },
    []
  );

  const handleMouseUp = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    stateRef.current.isDragging = false;
    container.style.cursor = "";
    container.style.userSelect = "";

    // Se houve movimento, suprime o próximo click para evitar clique acidental
    if (stateRef.current.hasMoved) {
      const captureClick = (e: MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        container.removeEventListener("click", captureClick, true);
      };
      container.addEventListener("click", captureClick, true);
      // Fallback: remove o listener após um curto período
      setTimeout(() => {
        container.removeEventListener("click", captureClick, true);
      }, 50);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (stateRef.current.isDragging) {
      stateRef.current.isDragging = false;
      container.style.cursor = "";
      container.style.userSelect = "";
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    container.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      container.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      container.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp, handleMouseLeave]);

  return containerRef;
}
