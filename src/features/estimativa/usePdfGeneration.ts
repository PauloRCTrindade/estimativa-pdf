import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { notify } from "@/components/ui/toast-notification";
import { sanitizeFileName } from "@/utils";

export function usePdfGeneration(formTitulo: string) {
  async function criarPDF() {
    const element = document.getElementById("pdf-area");
    if (!element) {
      throw new Error("Área do PDF não encontrada.");
    }

    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      onclone: (doc) => {
        doc.documentElement.classList.remove("dark");
        doc.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
          node.remove();
        });
        const safeStyle = doc.createElement("style");
        safeStyle.innerHTML = `
          html, body {
            margin: 0;
            background: #ffffff !important;
            color: #111111 !important;
            font-family: Arial, Helvetica, sans-serif !important;
          }
          table { border-collapse: collapse; }
          *, *::before, *::after { box-sizing: border-box; }
        `;
        doc.head.appendChild(safeStyle);
        const cloned = doc.getElementById("pdf-area");
        if (!cloned) return;
        cloned.style.backgroundColor = "#ffffff";
        cloned.style.color = "#111111";
      },
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    return pdf;
  }

  async function gerarPDF() {
    try {
      notify("Gerando PDF...");
      const pdf = await criarPDF();
      pdf.save(sanitizeFileName(formTitulo) + ".pdf");
      notify("PDF baixado com sucesso.");
    } catch (error) {
      console.error(error);
      notify("Não foi possível gerar o PDF. Verifique se a biblioteca html2canvas está instalada.");
    }
  }

  async function abrirPDF() {
    try {
      notify("Abrindo PDF...");
      const pdf = await criarPDF();
      const blob = pdf.output("blob");
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank", "noopener,noreferrer");
      notify("PDF aberto em uma nova aba.");
    } catch (error) {
      console.error(error);
      notify("Não foi possível abrir o PDF no navegador.");
    }
  }

  async function criarPDFCalendario() {
    const element = document.getElementById("calendar-area");
    if (!element) {
      throw new Error("Área do calendário não encontrada.");
    }
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      onclone: (doc) => {
        doc.documentElement.classList.remove("dark");
        doc.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => node.remove());
        const safeStyle = doc.createElement("style");
        safeStyle.innerHTML = `
          html,body{margin:0;background:#fff!important;color:#111!important;font-family:Arial,Helvetica,sans-serif!important}
          table{border-collapse:collapse}
          *,*::before,*::after{box-sizing:border-box}
        `;
        doc.head.appendChild(safeStyle);
        const cloned = doc.getElementById("calendar-area");
        if (cloned) { cloned.style.backgroundColor = "#ffffff"; cloned.style.color = "#111111"; }
      },
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("l", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pagesNeeded = Math.ceil(imgHeight / pageHeight);

    if (pagesNeeded === 1) {
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
    } else {
      const pixelsPerPage = (canvas.height * pageHeight) / imgHeight;
      for (let page = 0; page < pagesNeeded; page++) {
        if (page > 0) pdf.addPage();
        const startPixel = page * pixelsPerPage;
        const endPixel = Math.min((page + 1) * pixelsPerPage, canvas.height);
        const cropHeight = endPixel - startPixel;
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = canvas.width;
        tempCanvas.height = cropHeight;
        const ctx = tempCanvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(canvas, 0, startPixel, canvas.width, cropHeight, 0, 0, canvas.width, cropHeight);
          const croppedImgData = tempCanvas.toDataURL("image/png");
          const pageImgHeight = (cropHeight * imgWidth) / canvas.width;
          pdf.addImage(croppedImgData, "PNG", 0, 0, imgWidth, pageImgHeight);
        }
      }
    }
    return pdf;
  }

  async function gerarPDFCalendario() {
    try {
      notify("Gerando PDF do calendário...");
      const pdf = await criarPDFCalendario();
      pdf.save(`${sanitizeFileName(formTitulo)}_calendario.pdf`);
      notify("PDF do calendário gerado com sucesso.");
    } catch (error) {
      console.error(error);
      notify("Não foi possível gerar o PDF do calendário.");
    }
  }

  async function abrirCalendario() {
    try {
      notify("Abrindo calendário de atividades...");
      const pdf = await criarPDFCalendario();
      const blob = pdf.output("blob");
      window.open(URL.createObjectURL(blob), "_blank", "noopener,noreferrer");
      notify("Calendário de atividades aberto em uma nova aba.");
    } catch (error) {
      console.error(error);
      notify("Não foi possível abrir o calendário de atividades.");
    }
  }

  return { criarPDF, gerarPDF, abrirPDF, criarPDFCalendario, gerarPDFCalendario, abrirCalendario };
}
