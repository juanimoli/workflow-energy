/**
 * Export Service
 * Handles generation of PDF and Excel reports from metrics data
 */

const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

/**
 * Format date to Spanish locale
 */
function formatDate(date) {
    return new Date(date).toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Generate PDF report from metrics data
 * @param {Object} data - Metrics data
 * @param {Object} filters - Applied filters
 * @returns {PDFDocument} PDF document stream
 */
function generatePDFReport(data, filters = {}) {
    // Normalize incoming data shape. The dashboard sends { kpis, statusDistribution, priorityDistribution, trendData }
    // but future calls could send { stats, trends } (metrics-summary style). Adapt both so export is always complete.
    if (!data.kpis && data.stats) {
        const stats = data.stats;
        data.kpis = {
            totalOrders: stats.total || 0,
            pendingOrders: stats.byStatus?.pending || 0,
            inProgressOrders: stats.byStatus?.in_progress || 0,
            completedOrders: stats.byStatus?.completed || 0,
            cancelledOrders: stats.byStatus?.cancelled || 0,
            overdueOrders: stats.overdueOrders || 0,
            avgResolutionTime: stats.avgCompletionHours || 0,
            highPriorityOrders: (stats.byPriority?.high || 0) + (stats.byPriority?.critical || 0)
        };
        // Build distributions if absent
        if (!data.statusDistribution && stats.byStatus) {
            data.statusDistribution = Object.entries(stats.byStatus).map(([status, count]) => ({ status, count }));
        }
        if (!data.priorityDistribution && stats.byPriority) {
            data.priorityDistribution = Object.entries(stats.byPriority).map(([priority, count]) => ({ priority, count }));
        }
        if (!data.trendData && data.trends) {
            data.trendData = data.trends.map(t => ({
                date: t.date,
                created: t.created,
                completed: t.completed,
                pending: t.pending ?? t.in_progress
            }));
        }
    }

    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    // Add title
    doc.fontSize(20)
        .font('Helvetica-Bold')
        .text('Reporte de Métricas', { align: 'center' })
        .moveDown();

    // Add generation date
    doc.fontSize(10)
        .font('Helvetica')
        .text(`Generado: ${formatDate(new Date())}`, { align: 'right' })
        .moveDown();

    // Add filter information
    if (filters.period) {
        doc.fontSize(12)
            .font('Helvetica-Bold')
            .text('Filtros Aplicados:', { underline: true })
            .font('Helvetica')
            .fontSize(10)
            .text(`Período: ${filters.period} días`)
            .moveDown();
    }

    if (filters.teamId) {
        doc.text(`Equipo: ${filters.teamName || filters.teamId}`)
            .moveDown();
    }

    // Add KPIs section
    doc.fontSize(14)
        .font('Helvetica-Bold')
        .text('Indicadores Clave (KPIs)', { underline: true })
        .moveDown(0.5);

    const kpis = data.kpis || {};
    const total = kpis.totalOrders || 0;
    const completed = kpis.completedOrders || 0;
    const overdue = kpis.overdueOrders || 0;
    const active = (kpis.pendingOrders || 0) + (kpis.inProgressOrders || 0);
    // Derived rates
    const completionRate = total > 0 ? (completed / total * 100).toFixed(1) : '0.0';
    const overdueRate = total > 0 ? (overdue / total * 100).toFixed(1) : '0.0';
    const activeRate = total > 0 ? (active / total * 100).toFixed(1) : '0.0';
    
    doc.fontSize(10)
        .font('Helvetica')
        .text(`Total de Órdenes: ${total}`)
        .text(`Pendientes: ${kpis.pendingOrders || 0}`)
        .text(`En Progreso: ${kpis.inProgressOrders || 0}`)
        .text(`Completadas: ${completed}`)
        .text(`Canceladas: ${kpis.cancelledOrders || 0}`)
        .text(`Vencidas: ${overdue}`)
        .text(`Órdenes Activas: ${active}`)
        .text(`Tiempo Promedio de Resolución: ${kpis.avgResolutionTime || 0} días`)
        .text(`Órdenes de Alta + Crítica: ${kpis.highPriorityOrders || 0}`)
        .moveDown()
        .font('Helvetica-Bold')
        .text('Indicadores Derivados', { underline: true })
        .font('Helvetica')
        .fontSize(10)
        .text(`Tasa de Finalización: ${completionRate}%`)
        .text(`Tasa de Órdenes Activas: ${activeRate}%`)
        .text(`Tasa de Vencidas: ${overdueRate}%`)
        .moveDown();

    // Add status distribution
    if (data.statusDistribution && data.statusDistribution.length > 0) {
        doc.addPage()
            .fontSize(14)
            .font('Helvetica-Bold')
            .text('Distribución por Estado', { underline: true })
            .moveDown(0.5);

        const tableTop = doc.y;
        const itemHeight = 25;

        // Table headers
        doc.fontSize(10)
            .font('Helvetica-Bold')
            .text('Estado', 50, tableTop)
            .text('Cantidad', 250, tableTop)
            .text('Porcentaje', 350, tableTop);

        // Draw header line
        doc.moveTo(50, tableTop + 15)
            .lineTo(500, tableTop + 15)
            .stroke();

        // Table rows
        let currentY = tableTop + 20;
        doc.font('Helvetica');
        
        data.statusDistribution.forEach((item, index) => {
            const percentage = kpis.totalOrders > 0 
                ? ((item.count / kpis.totalOrders) * 100).toFixed(1) 
                : 0;
            
            doc.text(item.status || 'N/A', 50, currentY)
                .text(item.count.toString(), 250, currentY)
                .text(`${percentage}%`, 350, currentY);
            
            currentY += itemHeight;
        });
    }

    // Add trend data
    if (data.trendData && data.trendData.length > 0) {
        doc.addPage()
            .fontSize(14)
            .font('Helvetica-Bold')
            .text('Tendencia de Órdenes', { underline: true })
            .moveDown(0.5);

        const tableTop = doc.y;
        const itemHeight = 25;

        // Table headers
        doc.fontSize(10)
            .font('Helvetica-Bold')
            .text('Fecha', 50, tableTop)
            .text('Creadas', 200, tableTop)
            .text('Completadas', 300, tableTop)
            .text('Pendientes', 420, tableTop);

        // Draw header line
        doc.moveTo(50, tableTop + 15)
            .lineTo(530, tableTop + 15)
            .stroke();

        // Table rows
        let currentY = tableTop + 20;
        doc.font('Helvetica');
        
        data.trendData.slice(0, 20).forEach((item) => {
            doc.text(item.date || 'N/A', 50, currentY)
                .text(item.created?.toString() || '0', 200, currentY)
                .text(item.completed?.toString() || '0', 300, currentY)
                .text(item.pending?.toString() || '0', 420, currentY);
            
            currentY += itemHeight;
            
            // Add new page if needed
            if (currentY > 700) {
                doc.addPage();
                currentY = 50;
            }
        });
    }

    // Add footer to current page
    doc.fontSize(8)
        .font('Helvetica')
        .text(
            `Generado el ${formatDate(new Date())}`,
            50,
            doc.page.height - 50,
            { align: 'center' }
        );

    return doc;
}

/**
 * Generate Excel report from metrics data
 * @param {Object} data - Metrics data
 * @param {Object} filters - Applied filters
 * @returns {ExcelJS.Workbook} Excel workbook
 */
async function generateExcelReport(data, filters = {}) {
    const workbook = new ExcelJS.Workbook();
    
    workbook.creator = 'Work Order Management System';
    workbook.created = new Date();
    workbook.modified = new Date();

    // Sheet 1: Summary and KPIs
    const summarySheet = workbook.addWorksheet('Resumen', {
        properties: { tabColor: { argb: 'FF1976D2' } }
    });

    // Add title
    summarySheet.mergeCells('A1:D1');
    const titleCell = summarySheet.getCell('A1');
    titleCell.value = 'Reporte de Métricas - Work Orders';
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    summarySheet.getRow(1).height = 30;

    // Add generation date
    summarySheet.mergeCells('A2:D2');
    const dateCell = summarySheet.getCell('A2');
    dateCell.value = `Generado: ${formatDate(new Date())}`;
    dateCell.font = { size: 10, italic: true };
    dateCell.alignment = { horizontal: 'right' };

    // Add filters
    let currentRow = 4;
    if (filters.period || filters.teamId) {
        summarySheet.getCell(`A${currentRow}`).value = 'Filtros Aplicados:';
        summarySheet.getCell(`A${currentRow}`).font = { bold: true };
        currentRow++;

        if (filters.period) {
            summarySheet.getCell(`A${currentRow}`).value = 'Período:';
            summarySheet.getCell(`B${currentRow}`).value = `${filters.period} días`;
            currentRow++;
        }

        if (filters.teamId) {
            summarySheet.getCell(`A${currentRow}`).value = 'Equipo:';
            summarySheet.getCell(`B${currentRow}`).value = filters.teamName || filters.teamId;
            currentRow++;
        }
        currentRow++;
    }

    // Add KPIs
    const kpis = data.kpis || {};
    summarySheet.getCell(`A${currentRow}`).value = 'Indicadores Clave (KPIs)';
    summarySheet.getCell(`A${currentRow}`).font = { size: 14, bold: true };
    currentRow += 2;

    const kpiData = [
        ['Indicador', 'Valor'],
        ['Total de Órdenes', kpis.totalOrders || 0],
        ['Pendientes', kpis.pendingOrders || 0],
        ['En Progreso', kpis.inProgressOrders || 0],
        ['Completadas', kpis.completedOrders || 0],
        ['Canceladas', kpis.cancelledOrders || 0],
        ['Vencidas', kpis.overdueOrders || 0],
        ['Órdenes Activas', (kpis.pendingOrders || 0) + (kpis.inProgressOrders || 0)],
        ['Tiempo Promedio de Resolución (días)', kpis.avgResolutionTime || 0],
        ['Órdenes de Alta Prioridad', kpis.highPriorityOrders || 0],
        ['Tasa de Finalización (%)', (kpis.totalOrders ? ((kpis.completedOrders || 0) / kpis.totalOrders * 100) : 0)],
        ['Tasa de Vencidas (%)', (kpis.totalOrders ? ((kpis.overdueOrders || 0) / kpis.totalOrders * 100) : 0)],
        ['Tasa de Órdenes Activas (%)', (kpis.totalOrders ? (((kpis.pendingOrders || 0) + (kpis.inProgressOrders || 0)) / kpis.totalOrders * 100) : 0)]
    ];

    kpiData.forEach((row, index) => {
        summarySheet.getRow(currentRow + index).values = row;
        if (index === 0) {
            summarySheet.getRow(currentRow + index).font = { bold: true };
            summarySheet.getRow(currentRow + index).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE3F2FD' }
            };
        }
    });

    summarySheet.columns = [
        { key: 'indicator', width: 40 },
        { key: 'value', width: 20 }
    ];

    // Sheet 2: Status Distribution
    if (data.statusDistribution && data.statusDistribution.length > 0) {
        const statusSheet = workbook.addWorksheet('Distribución por Estado', {
            properties: { tabColor: { argb: 'FF4CAF50' } }
        });

        // Headers
        statusSheet.columns = [
            { header: 'Estado', key: 'status', width: 20 },
            { header: 'Cantidad', key: 'count', width: 15 },
            { header: 'Porcentaje', key: 'percentage', width: 15, style: { numFmt: '0.0%' } }
        ];

        // Style header row
        statusSheet.getRow(1).font = { bold: true };
        statusSheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4CAF50' }
        };

        // Add data
        data.statusDistribution.forEach((item) => {
            const percentage = kpis.totalOrders > 0 
                ? (item.count / kpis.totalOrders)
                : 0;

            statusSheet.addRow({
                status: item.status || 'N/A',
                count: item.count,
                percentage
            });
        });
    }

    // Sheet 3: Trend Data
    if (data.trendData && data.trendData.length > 0) {
        const trendSheet = workbook.addWorksheet('Tendencia', {
            properties: { tabColor: { argb: 'FFFF9800' } }
        });

        // Headers
        trendSheet.columns = [
            { header: 'Fecha', key: 'date', width: 15 },
            { header: 'Creadas', key: 'created', width: 12 },
            { header: 'Completadas', key: 'completed', width: 15 },
            { header: 'Pendientes', key: 'pending', width: 15 }
        ];

        // Style header row
        trendSheet.getRow(1).font = { bold: true };
        trendSheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFF9800' }
        };

        // Add data
        data.trendData.forEach((item) => {
            trendSheet.addRow({
                date: item.date || 'N/A',
                created: item.created || 0,
                completed: item.completed || 0,
                pending: item.pending || 0
            });
        });
    }

    // Sheet 4: Priority Distribution
    if (data.priorityDistribution && data.priorityDistribution.length > 0) {
        const prioritySheet = workbook.addWorksheet('Distribución por Prioridad', {
            properties: { tabColor: { argb: 'FFF44336' } }
        });

        // Headers
        prioritySheet.columns = [
            { header: 'Prioridad', key: 'priority', width: 20 },
            { header: 'Cantidad', key: 'count', width: 15 },
            { header: 'Porcentaje', key: 'percentage', width: 15, style: { numFmt: '0.0%' } }
        ];

        // Style header row
        prioritySheet.getRow(1).font = { bold: true };
        prioritySheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF44336' }
        };

        // Add data
        data.priorityDistribution.forEach((item) => {
            const percentage = kpis.totalOrders > 0 
                ? (item.count / kpis.totalOrders)
                : 0;

            prioritySheet.addRow({
                priority: item.priority || 'N/A',
                count: item.count,
                percentage
            });
        });
    }

    return workbook;
}

module.exports = {
    generatePDFReport,
    generateExcelReport
};
