import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Tipos para os dados
interface Vehicle {
  placa: string;
  marca: string;
  modelo: string;
  ano: number | null;
  status: string;
  combustivel: string | null;
  odometro: number | null;
}

interface Maintenance {
  vehicle?: { placa: string; marca: string; modelo: string };
  scheduled_date: string;
  status: string;
  maintenance_type: string;
  description: string | null;
}

interface FuelFillup {
  vehicle?: { placa: string; marca: string; modelo: string };
  date: string;
  odometer: number | null;
  liters: number;
  price_per_liter: number;
  total_amount: number;
  supplier_name: string | null;
}

// Exportar veículos para Excel
export const exportVehiclesToExcel = (vehicles: Vehicle[]) => {
  const data = vehicles.map(v => ({
    'Placa': v.placa,
    'Marca': v.marca,
    'Modelo': v.modelo,
    'Ano': v.ano || '—',
    'Estado': v.status === 'em_operacao' ? 'Em operação' : v.status === 'parado' ? 'Parado' : 'Em manutenção',
    'Combustível': v.combustivel || '—',
    'Odómetro (km)': v.odometro || '—',
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Veículos');
  
  // Ajustar largura das colunas
  const wscols = [
    { wch: 12 }, // Placa
    { wch: 15 }, // Marca
    { wch: 20 }, // Modelo
    { wch: 8 },  // Ano
    { wch: 15 }, // Estado
    { wch: 12 }, // Combustível
    { wch: 15 }, // Odómetro
  ];
  ws['!cols'] = wscols;

  const fileName = `veiculos_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

// Exportar manutenções para Excel
export const exportMaintenancesToExcel = (maintenances: Maintenance[]) => {
  const data = maintenances.map(m => ({
    'Viatura': m.vehicle ? `${m.vehicle.placa} - ${m.vehicle.marca} ${m.vehicle.modelo}` : '—',
    'Data': new Date(m.scheduled_date).toLocaleDateString('pt-PT'),
    'Estado': m.status === 'agendado' ? 'Agendado' : m.status === 'em_progresso' ? 'Em progresso' : 'Concluído',
    'Tipo': m.maintenance_type.replace(/_/g, ' '),
    'Descrição': m.description || '—',
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Manutenções');
  
  const wscols = [
    { wch: 30 }, // Viatura
    { wch: 12 }, // Data
    { wch: 15 }, // Estado
    { wch: 18 }, // Tipo
    { wch: 40 }, // Descrição
  ];
  ws['!cols'] = wscols;

  const fileName = `manutencoes_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

// Exportar abastecimentos para Excel
export const exportFuelFillupsToExcel = (fillups: FuelFillup[]) => {
  const data = fillups.map(f => ({
    'Viatura': f.vehicle ? `${f.vehicle.placa} - ${f.vehicle.marca} ${f.vehicle.modelo}` : '—',
    'Data': new Date(f.date).toLocaleDateString('pt-PT'),
    'Odómetro (km)': f.odometer || '—',
    'Litros': f.liters.toFixed(2),
    'Preço/Litro (Kz)': f.price_per_liter.toFixed(3),
    'Total (Kz)': f.total_amount.toFixed(2),
    'Fornecedor': f.supplier_name || '—',
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Abastecimentos');
  
  const wscols = [
    { wch: 30 }, // Viatura
    { wch: 12 }, // Data
    { wch: 15 }, // Odómetro
    { wch: 10 }, // Litros
    { wch: 15 }, // Preço/Litro
    { wch: 12 }, // Total
    { wch: 20 }, // Fornecedor
  ];
  ws['!cols'] = wscols;

  const fileName = `abastecimentos_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

// Exportar veículos para PDF
export const exportVehiclesToPDF = (vehicles: Vehicle[]) => {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text('Relatório de Veículos', 14, 20);
  
  doc.setFontSize(10);
  doc.text(`Data: ${new Date().toLocaleDateString('pt-PT')}`, 14, 28);

  const tableData = vehicles.map(v => [
    v.placa,
    v.marca,
    v.modelo,
    v.ano?.toString() || '—',
    v.status === 'em_operacao' ? 'Em operação' : v.status === 'parado' ? 'Parado' : 'Em manutenção',
    v.combustivel || '—',
    v.odometro?.toString() || '—',
  ]);

  autoTable(doc, {
    startY: 35,
    head: [['Placa', 'Marca', 'Modelo', 'Ano', 'Estado', 'Combustível', 'Odómetro']],
    body: tableData,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [59, 130, 246] },
  });

  doc.save(`veiculos_${new Date().toISOString().slice(0, 10)}.pdf`);
};

// Exportar manutenções para PDF
export const exportMaintenancesToPDF = (maintenances: Maintenance[]) => {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text('Relatório de Manutenções', 14, 20);
  
  doc.setFontSize(10);
  doc.text(`Data: ${new Date().toLocaleDateString('pt-PT')}`, 14, 28);

  const tableData = maintenances.map(m => [
    m.vehicle ? `${m.vehicle.placa}` : '—',
    new Date(m.scheduled_date).toLocaleDateString('pt-PT'),
    m.status === 'agendado' ? 'Agendado' : m.status === 'em_progresso' ? 'Em progresso' : 'Concluído',
    m.maintenance_type.replace(/_/g, ' '),
    m.description || '—',
  ]);

  autoTable(doc, {
    startY: 35,
    head: [['Viatura', 'Data', 'Estado', 'Tipo', 'Descrição']],
    body: tableData,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [59, 130, 246] },
    columnStyles: {
      4: { cellWidth: 50 },
    },
  });

  doc.save(`manutencoes_${new Date().toISOString().slice(0, 10)}.pdf`);
};

// Exportar abastecimentos para PDF
export const exportFuelFillupsToPDF = (fillups: FuelFillup[]) => {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text('Relatório de Abastecimentos', 14, 20);
  
  doc.setFontSize(10);
  doc.text(`Data: ${new Date().toLocaleDateString('pt-PT')}`, 14, 28);

  const tableData = fillups.map(f => [
    f.vehicle ? `${f.vehicle.placa}` : '—',
    new Date(f.date).toLocaleDateString('pt-PT'),
    f.odometer?.toString() || '—',
    f.liters.toFixed(2),
    f.price_per_liter.toFixed(3),
    f.total_amount.toFixed(2),
  ]);

  autoTable(doc, {
    startY: 35,
    head: [['Viatura', 'Data', 'Odómetro', 'Litros', 'Preço/L (Kz)', 'Total (Kz)']],
    body: tableData,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [59, 130, 246] },
  });

  doc.save(`abastecimentos_${new Date().toISOString().slice(0, 10)}.pdf`);
};
