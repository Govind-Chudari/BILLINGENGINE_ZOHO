import jsPDF from "jspdf";

export function generateInvoicePDF(invoice, username) {
  const doc  = new jsPDF();
  const blue = [26, 86, 219];
  const gray = [100, 116, 139];
  const dark = [30,  41,  59];

  doc.setFillColor(...blue);
  doc.rect(0, 0, 210, 38, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("BillFlow", 14, 16);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Cloud Storage Billing Engine", 14, 24);
  doc.text("INVOICE", 196, 16, { align: "right" });

  doc.setFontSize(9);
  doc.text(`#INV-${String(invoice.id).padStart(4, "0")}`, 196, 24, { align: "right" });

  doc.setTextColor(...dark);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Bill To", 14, 52);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...gray);
  doc.text(username, 14, 60);
  doc.text("BillFlow Cloud Storage", 14, 67);

  doc.setTextColor(...gray);
  doc.setFontSize(9);
  const rightX = 130;
  const pairs = [
    ["Invoice Date",  new Date(invoice.generated_at).toLocaleDateString("en-IN")],
    ["Billing Period", invoice.month],
    ["Status",        invoice.status.toUpperCase()],
  ];

  pairs.forEach(([key, val], i) => {
    doc.setFont("helvetica", "bold");
    doc.text(key, rightX, 52 + i * 9);
    doc.setFont("helvetica", "normal");
    doc.text(val, 196, 52 + i * 9, { align: "right" });
  });

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 78, 196, 78);

  doc.setTextColor(...dark);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Usage Summary", 14, 90);

  const usageRows = [
    ["Average Storage", `${invoice.usage.avg_storage_mb} MB / day`],
    ["Peak Storage",    `${invoice.usage.avg_storage_gb} GB`],
    ["Total API Calls", `${invoice.usage.total_api_calls} requests`],
    ["Days Active",     `${invoice.usage.days_active} days`],
  ];

  doc.setFontSize(9);
  usageRows.forEach(([key, val], i) => {
    const y = 100 + i * 9;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...gray);
    doc.text(key, 14, y);
    doc.setTextColor(...dark);
    doc.setFont("helvetica", "bold");
    doc.text(val, 100, y);
  });

  const tableTop = 145;

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, tableTop - 7, 182, 10, 2, 2, "F");

  doc.setTextColor(...gray);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("DESCRIPTION", 20, tableTop);
  doc.text("RATE", 110, tableTop);
  doc.text("AMOUNT (₹)", 190, tableTop, { align: "right" });

  const rows = [
    {
      desc:   "Object Storage",
      detail: `Avg ${invoice.usage.avg_storage_gb} GB/day × ${invoice.rates.storage_per_gb_day}/GB/day`,
      rate:   `₹${invoice.rates.storage_per_gb_day}/GB/day`,
      amount: invoice.costs.storage_cost.toFixed(4)
    },
    {
      desc:   "API Requests",
      detail: `${invoice.usage.total_api_calls} calls × ₹${invoice.rates.api_per_call}/call`,
      rate:   `₹${invoice.rates.api_per_call}/call`,
      amount: invoice.costs.api_cost.toFixed(4)
    },
    {
      desc:   "Free Tier Discount",
      detail: "1 GB storage + 1000 API calls per month",
      rate:   "—",
      amount: "0.0000"
    },
  ];

  rows.forEach((row, i) => {
    const y = tableTop + 15 + i * 18;

    if (i % 2 === 0) {
      doc.setFillColor(250, 252, 255);
      doc.rect(14, y - 7, 182, 16, "F");
    }

    doc.setTextColor(...dark);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(row.desc, 20, y);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...gray);
    doc.setFontSize(8);
    doc.text(row.detail, 20, y + 6);

    doc.setFontSize(9);
    doc.setTextColor(...gray);
    doc.text(row.rate, 110, y);

    doc.setTextColor(...dark);
    doc.setFont("helvetica", "bold");
    doc.text(`₹${row.amount}`, 190, y, { align: "right" });
  });

  const totalY = tableTop + 80;

  doc.setFillColor(...blue);
  doc.roundedRect(120, totalY, 76, 22, 3, 3, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("TOTAL AMOUNT DUE", 132, totalY + 9);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`₹${invoice.costs.total_amount.toFixed(4)}`, 158, totalY + 18, {
    align: "center"
  });

  // Free tier note 
  doc.setTextColor(...gray);
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text(
    "Free tier applied: 1 GB storage and 1,000 API calls per month are complimentary.",
    14, totalY + 12
  );

  // Footer 
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 272, 196, 272);

  doc.setTextColor(...gray);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("BillFlow · Cloud Storage Billing Engine", 14, 280);
  doc.text(
    `Generated: ${new Date().toLocaleString("en-IN")}`,
    196, 280, { align: "right" }
  );

  // Save the PDF
  doc.save(`BillFlow_Invoice_${invoice.month}_${username}.pdf`);
}