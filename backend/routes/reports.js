const express = require('express');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { getDB } = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Generate work orders report
router.get('/work-orders', authenticateToken, async (req, res) => {
  try {
    const { format = 'pdf', startDate, endDate, status, teamId, assignedTo } = req.query;
    
    const db = getDB();
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    // Role-based filtering
    if (req.user.role === 'employee') {
      whereClause += ` AND wo.assigned_to = $${paramIndex}`;
      params.push(req.user.userId);
      paramIndex++;
    } else if (req.user.role === 'team_leader') {
      whereClause += ` AND wo.team_id = $${paramIndex}`;
      params.push(req.user.teamId);
      paramIndex++;
    }

    // Add date filters
    if (startDate) {
      whereClause += ` AND wo.created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereClause += ` AND wo.created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    // Add other filters
    if (status) {
      whereClause += ` AND wo.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (teamId) {
      whereClause += ` AND wo.team_id = $${paramIndex}`;
      params.push(teamId);
      paramIndex++;
    }

    if (assignedTo) {
      whereClause += ` AND wo.assigned_to = $${paramIndex}`;
      params.push(assignedTo);
      paramIndex++;
    }

    const query = `
      SELECT 
        wo.*,
        u.first_name || ' ' || u.last_name as assigned_to_name,
        creator.first_name || ' ' || creator.last_name as created_by_name,
        t.name as team_name,
        p.name as project_name
      FROM work_orders wo
      LEFT JOIN users u ON wo.assigned_to = u.id
      LEFT JOIN users creator ON wo.created_by = creator.id
      LEFT JOIN teams t ON wo.team_id = t.id
      LEFT JOIN projects p ON wo.project_id = p.id
      ${whereClause}
      ORDER BY wo.created_at DESC
    `;

    const result = await db.query(query, params);
    const workOrders = result.rows;

    if (format === 'excel') {
      return generateExcelReport(res, workOrders, 'work-orders');
    } else {
      return generatePDFReport(res, workOrders, 'Reporte de Órdenes de Trabajo');
    }

  } catch (error) {
    logger.error('Generate work orders report error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Generate team performance report
router.get('/team-performance', authenticateToken, authorizeRoles('team_leader', 'supervisor', 'admin'), async (req, res) => {
  try {
    const { format = 'pdf', startDate, endDate, teamId } = req.query;
    
    const db = getDB();
    let whereClause = '';
    const params = [];
    let paramIndex = 1;

    if (req.user.role === 'team_leader') {
      whereClause = 'AND t.id = $1';
      params.push(req.user.teamId);
      paramIndex++;
    } else if (teamId) {
      whereClause = `AND t.id = $${paramIndex}`;
      params.push(teamId);
      paramIndex++;
    }

    if (startDate) {
      whereClause += ` AND wo.created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereClause += ` AND wo.created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    const query = `
      SELECT 
        t.name as team_name,
        u.first_name || ' ' || u.last_name as employee_name,
        COUNT(wo.id) as total_orders,
        COUNT(*) FILTER (WHERE wo.status = 'completed') as completed_orders,
        COUNT(*) FILTER (WHERE wo.status = 'pending') as pending_orders,
        COUNT(*) FILTER (WHERE wo.status = 'in_progress') as in_progress_orders,
        AVG(EXTRACT(EPOCH FROM (wo.completed_at - wo.started_at))/3600) FILTER (WHERE wo.completed_at IS NOT NULL) as avg_completion_hours,
        COUNT(*) FILTER (WHERE wo.due_date < CURRENT_DATE AND wo.status NOT IN ('completed', 'cancelled')) as overdue_orders
      FROM teams t
      LEFT JOIN users u ON t.id = u.team_id AND u.is_active = true
      LEFT JOIN work_orders wo ON u.id = wo.assigned_to
      WHERE t.is_active = true
      ${whereClause}
      GROUP BY t.id, t.name, u.id, u.first_name, u.last_name
      ORDER BY t.name, completed_orders DESC
    `;

    const result = await db.query(query, params);
    const performanceData = result.rows;

    if (format === 'excel') {
      return generateExcelReport(res, performanceData, 'team-performance');
    } else {
      return generatePDFReport(res, performanceData, 'Reporte de Desempeño de Equipos');
    }

  } catch (error) {
    logger.error('Generate team performance report error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Generate metrics summary report
router.get('/metrics-summary', authenticateToken, authorizeRoles('supervisor', 'admin'), async (req, res) => {
  try {
    const { format = 'pdf', timeframe = '30' } = req.query;
    
    const db = getDB();

    // Get overall statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_orders,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_orders,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_orders,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_orders,
        COUNT(*) FILTER (WHERE priority = 'critical') as critical_orders,
        AVG(EXTRACT(EPOCH FROM (completed_at - started_at))/3600) FILTER (WHERE completed_at IS NOT NULL) as avg_completion_hours,
        COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status NOT IN ('completed', 'cancelled')) as overdue_orders
      FROM work_orders
      WHERE created_at >= CURRENT_DATE - INTERVAL '${timeframe} days'
    `;

    const statsResult = await db.query(statsQuery);

    // Get team summary
    const teamQuery = `
      SELECT 
        t.name as team_name,
        COUNT(wo.id) as total_orders,
        COUNT(*) FILTER (WHERE wo.status = 'completed') as completed_orders,
        ROUND((COUNT(*) FILTER (WHERE wo.status = 'completed')::float / NULLIF(COUNT(wo.id), 0) * 100), 2) as completion_rate
      FROM teams t
      LEFT JOIN work_orders wo ON t.id = wo.team_id AND wo.created_at >= CURRENT_DATE - INTERVAL '${timeframe} days'
      WHERE t.is_active = true
      GROUP BY t.id, t.name
      ORDER BY completion_rate DESC
    `;

    const teamResult = await db.query(teamQuery);

    const reportData = {
      stats: statsResult.rows[0],
      teams: teamResult.rows,
      timeframe: parseInt(timeframe),
      generatedAt: new Date(),
      generatedBy: `${req.user.firstName} ${req.user.lastName}`
    };

    if (format === 'excel') {
      return generateMetricsExcelReport(res, reportData);
    } else {
      return generateMetricsPDFReport(res, reportData);
    }

  } catch (error) {
    logger.error('Generate metrics summary report error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Helper function to generate PDF reports
const generatePDFReport = (res, data, title) => {
  const doc = new PDFDocument({ margin: 50 });
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${title.replace(/\s+/g, '_')}.pdf"`);
  
  doc.pipe(res);

  // Header
  doc.fontSize(20).text(title, { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Generado el: ${new Date().toLocaleDateString('es-ES')}`, { align: 'right' });
  doc.moveDown(2);

  // Table headers and data (simplified example)
  if (data.length > 0) {
    const headers = Object.keys(data[0]);
    let yPosition = doc.y;

    // Headers
    headers.forEach((header, index) => {
      doc.text(header, 50 + (index * 100), yPosition, { width: 95 });
    });

    yPosition += 20;
    doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();
    yPosition += 10;

    // Data rows
    data.forEach((row, rowIndex) => {
      if (yPosition > 700) {
        doc.addPage();
        yPosition = 50;
      }

      headers.forEach((header, index) => {
        const value = row[header] || '';
        doc.text(String(value).substring(0, 20), 50 + (index * 100), yPosition, { width: 95 });
      });

      yPosition += 20;
    });
  }

  doc.end();
};

// Helper function to generate Excel reports
const generateExcelReport = async (res, data, reportType) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Reporte');

  if (data.length > 0) {
    // Add headers
    const headers = Object.keys(data[0]);
    worksheet.addRow(headers);

    // Style headers
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add data
    data.forEach(row => {
      const rowData = headers.map(header => row[header]);
      worksheet.addRow(rowData);
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 15;
    });
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${reportType}.xlsx"`);

  await workbook.xlsx.write(res);
  res.end();
};

// Helper function for metrics PDF report
const generateMetricsPDFReport = (res, data) => {
  const doc = new PDFDocument({ margin: 50 });
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="metrics_summary.pdf"');
  
  doc.pipe(res);

  // Title
  doc.fontSize(20).text('Resumen de Métricas', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Período: Últimos ${data.timeframe} días`, { align: 'center' });
  doc.text(`Generado por: ${data.generatedBy}`, { align: 'center' });
  doc.text(`Fecha: ${data.generatedAt.toLocaleDateString('es-ES')}`, { align: 'center' });
  doc.moveDown(2);

  // Statistics
  doc.fontSize(16).text('Estadísticas Generales');
  doc.moveDown();
  doc.fontSize(12);
  doc.text(`Total de Órdenes: ${data.stats.total_orders}`);
  doc.text(`Pendientes: ${data.stats.pending_orders}`);
  doc.text(`En Progreso: ${data.stats.in_progress_orders}`);
  doc.text(`Completadas: ${data.stats.completed_orders}`);
  doc.text(`Críticas: ${data.stats.critical_orders}`);
  doc.text(`Vencidas: ${data.stats.overdue_orders}`);
  doc.text(`Tiempo Promedio de Resolución: ${parseFloat(data.stats.avg_completion_hours || 0).toFixed(2)} horas`);
  doc.moveDown(2);

  // Team Performance
  doc.fontSize(16).text('Desempeño por Equipos');
  doc.moveDown();
  
  data.teams.forEach(team => {
    doc.fontSize(12);
    doc.text(`${team.team_name}: ${team.completed_orders}/${team.total_orders} (${team.completion_rate}%)`);
  });

  doc.end();
};

// Helper function for metrics Excel report
const generateMetricsExcelReport = async (res, data) => {
  const workbook = new ExcelJS.Workbook();
  
  // Statistics sheet
  const statsSheet = workbook.addWorksheet('Estadísticas');
  statsSheet.addRow(['Métrica', 'Valor']);
  statsSheet.addRow(['Total de Órdenes', data.stats.total_orders]);
  statsSheet.addRow(['Pendientes', data.stats.pending_orders]);
  statsSheet.addRow(['En Progreso', data.stats.in_progress_orders]);
  statsSheet.addRow(['Completadas', data.stats.completed_orders]);
  statsSheet.addRow(['Críticas', data.stats.critical_orders]);
  statsSheet.addRow(['Vencidas', data.stats.overdue_orders]);
  statsSheet.addRow(['Tiempo Promedio (horas)', parseFloat(data.stats.avg_completion_hours || 0).toFixed(2)]);

  // Teams sheet
  const teamsSheet = workbook.addWorksheet('Equipos');
  teamsSheet.addRow(['Equipo', 'Total Órdenes', 'Completadas', 'Tasa de Finalización (%)']);
  
  data.teams.forEach(team => {
    teamsSheet.addRow([team.team_name, team.total_orders, team.completed_orders, team.completion_rate]);
  });

  // Style headers
  [statsSheet, teamsSheet].forEach(sheet => {
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    sheet.columns.forEach(column => {
      column.width = 20;
    });
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="metrics_summary.xlsx"');

  await workbook.xlsx.write(res);
  res.end();
};

module.exports = router;