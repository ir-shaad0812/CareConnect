// ============================================
// INVOICE SERVICE - Sprint-05
// PDF Invoice Generation using PDFKit
// Supports partial-payment and final invoices
// ============================================

import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { getDirname } from '../utils/pathHelper.js';
import paymentService from './payment.service.js';

const __dirname = getDirname(import.meta.url);
const UPLOADS_DIR = path.join(__dirname, '../../uploads/invoices');

class InvoiceService {
  constructor() {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
  }

  // ============================================
  // GENERATE PDF INVOICE
  // ============================================

  /**
   * Generate a PDF invoice for a specific transaction.
   * Returns a readable stream or file path.
   *
   * @param {string} transactionId
   * @param {string} userId - for authorization
   * @returns {Promise<{stream: PDFDocument, filename: string}>}
   */
  async generateInvoicePDF(transactionId, userId) {
    const invoiceData = await paymentService.getInvoiceData(transactionId, userId);

    const { invoice, transaction, booking, company } = invoiceData;
    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
    const filename = `invoice-${transaction.transactionNumber}.pdf`;

    // ---- Header ----
    this._drawHeader(doc, company);

    // ---- Invoice meta ----
    this._drawInvoiceMeta(doc, invoice, transaction);

    // ---- Bill To / Service Provider ----
    this._drawParties(doc, booking);

    // ---- Booking Details ----
    this._drawBookingDetails(doc, booking, transaction);

    // ---- Line Items Table ----
    this._drawLineItems(doc, invoice);

    // ---- Totals ----
    this._drawTotals(doc, invoice, transaction, booking);

    // ---- Payment Status Banner ----
    this._drawPaymentStatus(doc, transaction, booking);

    // ---- Footer ----
    this._drawFooter(doc, company);

    doc.end();

    return { stream: doc, filename };
  }

  /**
   * Generate a final agreement/invoice PDF when booking is fully paid.
   * Includes full payment history, service details, and legal confirmation.
   *
   * @param {string} bookingId - Booking ID
   * @param {string} userId - For authorization
   * @returns {Promise<{stream: PDFDocument, filename: string}>}
   */
  async generateFinalInvoicePDF(bookingId, userId) {
    // Fetch booking with related data
    const paymentServiceMod = (await import('./payment.service.js')).default;
    const summary = await paymentServiceMod.getBookingPaymentSummary(bookingId, userId);
    const { booking, transactions, summary: paymentSummary } = summary;

    if (booking.paymentStatus !== 'fully_paid') {
      throw new Error('Final invoice can only be generated for fully paid bookings');
    }

    const Booking = (await import('../models/booking.model.js')).default;
    const fullBooking = await Booking.findById(bookingId)
      .populate('careSeekerId', 'fullName email phone location')
      .populate('caregiverId', 'fullName email phone location');

    if (!fullBooking) throw new Error('Booking not found');

    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
    const filename = `final-invoice-${fullBooking.bookingNumber}.pdf`;

    const company = {
      name: 'CareConnect',
      email: 'billing@careconnect.com',
      website: process.env.FRONTEND_URL || 'https://careconnect.com',
    };

    // ---- Header ----
    this._drawHeader(doc, company);

    // ---- FINAL INVOICE label ----
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#155724')
      .text('FINAL INVOICE / PAYMENT AGREEMENT', 50, 130, { align: 'center', width: 495 });

    doc.moveTo(50, 155).lineTo(545, 155).strokeColor('#28a745').lineWidth(2).stroke();

    // ---- Parties ----
    const careSeeker = fullBooking.careSeekerId;
    const caregiver = fullBooking.caregiverId;
    const y = 170;

    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a73e8').text('BILL TO', 50, y);
    doc.fontSize(10).fillColor('#333').font('Helvetica-Bold').text(careSeeker?.fullName || 'Care Seeker', 50, y + 18);
    doc.font('Helvetica');
    if (careSeeker?.email) doc.text(careSeeker.email, 50, y + 33);

    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a73e8').text('SERVICE PROVIDER', 310, y);
    doc.fontSize(10).fillColor('#333').font('Helvetica-Bold').text(caregiver?.fullName || 'Caregiver', 310, y + 18);
    doc.font('Helvetica');
    if (caregiver?.email) doc.text(caregiver.email, 310, y + 33);

    // ---- Booking Details ----
    let detY = 235;
    doc.moveTo(50, detY).lineTo(545, detY).strokeColor('#e0e0e0').lineWidth(1).stroke();
    detY += 10;
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a73e8').text('BOOKING DETAILS', 50, detY);
    detY += 20;
    doc.fontSize(10).fillColor('#333');

    const details = [
      ['Booking #:', fullBooking.bookingNumber],
      ['Service Type:', (fullBooking.serviceType || '').replace(/_/g, ' ')],
      ['Care Recipient:', fullBooking.careRecipient?.name || 'N/A'],
      ['Start Date:', fullBooking.schedule?.startDate ? this._formatDate(fullBooking.schedule.startDate) : 'N/A'],
      ['End Date:', fullBooking.schedule?.endDate ? this._formatDate(fullBooking.schedule.endDate) : 'N/A'],
      ['Total Amount:', `${fullBooking.pricing?.currency || 'NPR'} ${this._formatCurrency(fullBooking.totalAmount)}`],
    ];

    for (const [label, value] of details) {
      doc.font('Helvetica-Bold').text(label, 60, detY, { width: 120 });
      doc.font('Helvetica').text(value, 185, detY);
      detY += 16;
    }

    // ---- Payment History Table ----
    detY += 10;
    doc.moveTo(50, detY).lineTo(545, detY).strokeColor('#e0e0e0').lineWidth(1).stroke();
    detY += 10;
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a73e8').text('PAYMENT HISTORY', 50, detY);
    detY += 20;

    // Table header
    doc.rect(50, detY, 495, 22).fill('#1a73e8');
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#fff');
    doc.text('Date', 55, detY + 6, { width: 90 });
    doc.text('Transaction #', 145, detY + 6, { width: 120 });
    doc.text('Method', 265, detY + 6, { width: 70 });
    doc.text('Amount', 335, detY + 6, { width: 80, align: 'right' });
    doc.text('Status', 425, detY + 6, { width: 115, align: 'center' });
    detY += 22;

    const completedTxns = transactions.filter(t => t.type === 'payment' && t.status === 'completed');
    for (let i = 0; i < completedTxns.length; i++) {
      const txn = completedTxns[i];
      const bgColor = i % 2 === 0 ? '#f8f9fa' : '#ffffff';
      doc.rect(50, detY, 495, 18).fill(bgColor);
      doc.fillColor('#333').fontSize(8).font('Helvetica');
      doc.text(this._formatDate(txn.createdAt), 55, detY + 4, { width: 90 });
      doc.text(txn.transactionNumber || '', 145, detY + 4, { width: 120 });
      doc.text(this._formatPaymentMethod(txn.paymentMethod), 265, detY + 4, { width: 70 });
      doc.text(this._formatCurrency(txn.amount), 335, detY + 4, { width: 80, align: 'right' });
      doc.fillColor('#28a745').text('Completed', 425, detY + 4, { width: 115, align: 'center' });
      detY += 18;
    }

    // ---- Total Summary ----
    detY += 15;
    doc.moveTo(350, detY).lineTo(545, detY).strokeColor('#333').lineWidth(1).stroke();
    detY += 8;
    doc.fontSize(10).font('Helvetica').fillColor('#333');
    doc.text('Total Amount:', 380, detY, { width: 90, align: 'right' });
    doc.text(`${fullBooking.pricing?.currency || 'NPR'} ${this._formatCurrency(fullBooking.totalAmount)}`, 475, detY, { width: 70, align: 'right' });
    detY += 16;
    doc.text('Total Paid:', 380, detY, { width: 90, align: 'right' });
    doc.text(`${fullBooking.pricing?.currency || 'NPR'} ${this._formatCurrency(fullBooking.amountPaid)}`, 475, detY, { width: 70, align: 'right' });
    detY += 16;
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#28a745');
    doc.text('Amount Due:', 380, detY, { width: 90, align: 'right' });
    doc.text(`${fullBooking.pricing?.currency || 'NPR'} 0.00`, 475, detY, { width: 70, align: 'right' });

    // ---- PAID IN FULL Banner ----
    detY += 30;
    doc.rect(50, detY, 495, 35).fill('#d4edda');
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#155724');
    doc.text('\u2713 PAID IN FULL', 60, detY + 5);
    doc.fontSize(9).font('Helvetica').fillColor('#155724');
    doc.text('This booking has been fully paid. No outstanding balance remains.', 60, detY + 22);

    // ---- Legal Confirmation ----
    detY += 50;
    doc.fontSize(8).fillColor('#666').font('Helvetica');
    doc.text(
      'This document serves as confirmation that all financial obligations for the above-referenced care service have been fulfilled. ' +
      'Both parties acknowledge receipt and agree to the terms of service as outlined in the CareConnect platform agreement.',
      50, detY, { width: 495, align: 'justify' }
    );

    // ---- Footer ----
    this._drawFooter(doc, company);

    doc.end();
    return { stream: doc, filename };
  }

  /**
   * Generate and save an invoice PDF to disk.
   */
  async saveInvoicePDF(transactionId, userId) {
    const { stream, filename } = await this.generateInvoicePDF(transactionId, userId);

    const filePath = path.join(UPLOADS_DIR, filename);
    const writeStream = fs.createWriteStream(filePath);

    return new Promise((resolve, reject) => {
      stream.pipe(writeStream);
      writeStream.on('finish', () => resolve({ filePath, filename }));
      writeStream.on('error', reject);
    });
  }

  // ============================================
  // PDF SECTIONS
  // ============================================

  _drawHeader(doc, company) {
    // Company name (left)
    doc
      .fontSize(24)
      .fillColor('#1a73e8')
      .text(company.name, 50, 45, { align: 'left' })
      .fontSize(10)
      .fillColor('#666')
      .text(company.email, 50, 75)
      .text(company.website, 50, 90);

    // "INVOICE" label (right)
    doc
      .fontSize(28)
      .fillColor('#333')
      .text('INVOICE', 400, 45, { align: 'right' });

    // Divider
    doc
      .moveTo(50, 115)
      .lineTo(545, 115)
      .strokeColor('#1a73e8')
      .lineWidth(2)
      .stroke();

    doc.moveDown(2);
  }

  _drawInvoiceMeta(doc, invoice, transaction) {
    const y = 130;
    const col1 = 50;
    const col2 = 350;

    doc.fontSize(10).fillColor('#333');

    doc.font('Helvetica-Bold').text('Invoice Number:', col1, y);
    doc.font('Helvetica').text(invoice.invoiceNumber || transaction.transactionNumber, col1 + 110, y);

    doc.font('Helvetica-Bold').text('Date:', col1, y + 18);
    doc.font('Helvetica').text(this._formatDate(invoice.issuedAt || transaction.createdAt), col1 + 110, y + 18);

    doc.font('Helvetica-Bold').text('Transaction:', col2, y);
    doc.font('Helvetica').text(transaction.transactionNumber, col2 + 90, y);

    doc.font('Helvetica-Bold').text('Status:', col2, y + 18);
    const statusColor = transaction.status === 'completed' ? '#28a745' : '#dc3545';
    doc.font('Helvetica').fillColor(statusColor).text(transaction.status.toUpperCase(), col2 + 90, y + 18);
    doc.fillColor('#333');

    if (invoice.dueDate) {
      doc.font('Helvetica-Bold').text('Due Date:', col1, y + 36);
      doc.font('Helvetica').text(this._formatDate(invoice.dueDate), col1 + 110, y + 36);
    }

    doc.font('Helvetica-Bold').text('Payment Method:', col2, y + 36);
    doc.font('Helvetica').text(this._formatPaymentMethod(transaction.paymentMethod), col2 + 90, y + 36);
  }

  _drawParties(doc, booking) {
    if (!booking) return;

    const y = 210;
    const col1 = 50;
    const col2 = 310;

    // Bill To
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#1a73e8')
      .text('BILL TO', col1, y);

    doc
      .fontSize(10)
      .fillColor('#333')
      .font('Helvetica-Bold')
      .text(booking.careSeeker?.fullName || 'Care Seeker', col1, y + 18);

    doc.font('Helvetica');
    if (booking.careSeeker?.email) doc.text(booking.careSeeker.email, col1, y + 33);
    if (booking.careSeeker?.phone) doc.text(booking.careSeeker.phone, col1, y + 48);

    // Service Provider
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#1a73e8')
      .text('SERVICE PROVIDER', col2, y);

    doc
      .fontSize(10)
      .fillColor('#333')
      .font('Helvetica-Bold')
      .text(booking.caregiver?.fullName || 'Caregiver', col2, y + 18);

    doc.font('Helvetica');
    if (booking.caregiver?.email) doc.text(booking.caregiver.email, col2, y + 33);
    if (booking.caregiver?.phone) doc.text(booking.caregiver.phone, col2, y + 48);
  }

  _drawBookingDetails(doc, booking, transaction) {
    if (!booking) return;

    const y = 295;

    doc
      .moveTo(50, y)
      .lineTo(545, y)
      .strokeColor('#e0e0e0')
      .lineWidth(1)
      .stroke();

    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#1a73e8')
      .text('BOOKING DETAILS', 50, y + 10);

    doc.fontSize(10).fillColor('#333');

    const details = [
      ['Booking #:', booking.bookingNumber || 'N/A'],
      ['Service Type:', (booking.serviceType || '').replace(/_/g, ' ')],
      ['Care Recipient:', booking.careRecipient?.name || 'N/A'],
    ];

    if (booking.schedule?.startDate) {
      details.push(['Start Date:', this._formatDate(booking.schedule.startDate)]);
    }

    if (transaction.isPartialPayment) {
      details.push(['Payment Type:', 'PARTIAL PAYMENT']);
    }

    let detY = y + 28;
    for (const [label, value] of details) {
      doc.font('Helvetica-Bold').text(label, 60, detY, { width: 120 });
      doc.font('Helvetica').text(value, 185, detY);
      detY += 16;
    }

    return detY;
  }

  _drawLineItems(doc, invoice) {
    const items = invoice.items || [];
    if (items.length === 0) return;

    let y = 420;

    // Table header
    doc
      .rect(50, y, 495, 22)
      .fill('#1a73e8');

    doc.fontSize(10).font('Helvetica-Bold').fillColor('#fff');
    doc.text('Description', 55, y + 6, { width: 230 });
    doc.text('Qty', 290, y + 6, { width: 50, align: 'center' });
    doc.text('Unit Price', 340, y + 6, { width: 80, align: 'right' });
    doc.text('Total', 430, y + 6, { width: 110, align: 'right' });

    y += 22;
    doc.fillColor('#333').font('Helvetica');

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const bgColor = i % 2 === 0 ? '#f8f9fa' : '#ffffff';
      doc.rect(50, y, 495, 20).fill(bgColor);

      doc.fillColor('#333').fontSize(9);
      doc.text(item.description || 'Service', 55, y + 5, { width: 230 });
      doc.text(String(item.quantity || 1), 290, y + 5, { width: 50, align: 'center' });
      doc.text(this._formatCurrency(item.unitPrice || 0), 340, y + 5, { width: 80, align: 'right' });
      doc.text(this._formatCurrency(item.total || 0), 430, y + 5, { width: 110, align: 'right' });

      y += 20;
    }

    // Table bottom border
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#e0e0e0').lineWidth(1).stroke();

    return y;
  }

  _drawTotals(doc, invoice, transaction, booking) {
    let y = 520;
    const labelX = 380;
    const valueX = 475;

    doc.fontSize(10).font('Helvetica').fillColor('#333');

    // Subtotal
    doc.text('Subtotal:', labelX, y, { width: 90, align: 'right' });
    doc.text(this._formatCurrency(invoice.subtotal || transaction.amount), valueX, y, { width: 70, align: 'right' });
    y += 18;

    // Platform fee
    doc.text('Platform Fee:', labelX, y, { width: 90, align: 'right' });
    doc.text(this._formatCurrency(transaction.platformFee || 0), valueX, y, { width: 70, align: 'right' });
    y += 18;

    // Tax
    if (invoice.tax > 0) {
      doc.text('Tax:', labelX, y, { width: 90, align: 'right' });
      doc.text(this._formatCurrency(invoice.tax), valueX, y, { width: 70, align: 'right' });
      y += 18;
    }

    // Divider
    doc.moveTo(labelX, y).lineTo(545, y).strokeColor('#333').lineWidth(1).stroke();
    y += 8;

    // Total
    doc.font('Helvetica-Bold').fontSize(12);
    doc.text('Total:', labelX, y, { width: 90, align: 'right' });
    doc.text(
      `${(transaction.currency || 'USD')} ${this._formatCurrency(invoice.total || transaction.amount)}`,
      valueX - 15, y, { width: 85, align: 'right' }
    );
    y += 22;

    // Partial payment info
    if (transaction.isPartialPayment && booking) {
      doc.font('Helvetica').fontSize(9).fillColor('#666');

      doc.text('This Payment:', labelX, y, { width: 90, align: 'right' });
      doc.text(this._formatCurrency(transaction.amount), valueX, y, { width: 70, align: 'right' });
      y += 15;

      doc.text('Total Paid:', labelX, y, { width: 90, align: 'right' });
      doc.text(this._formatCurrency(transaction.runningAmountPaid || booking.amountPaid), valueX, y, { width: 70, align: 'right' });
      y += 15;

      doc.text('Amount Due:', labelX, y, { width: 90, align: 'right' });
      doc.fillColor('#dc3545').font('Helvetica-Bold');
      doc.text(this._formatCurrency(transaction.runningAmountDue || booking.amountDue), valueX, y, { width: 70, align: 'right' });
      y += 15;

      doc.fillColor('#333').font('Helvetica');
    }
  }

  _drawPaymentStatus(doc, transaction, booking) {
    let y = 640;

    if (transaction.isPartialPayment) {
      doc.rect(50, y, 495, 35).fill('#fff3cd');
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#856404');
      doc.text('⚠ PARTIAL PAYMENT', 60, y + 5);
      doc.fontSize(9).font('Helvetica').fillColor('#856404');
      doc.text(
        `This is a partial payment. Outstanding balance: ${transaction.currency || 'USD'} ${this._formatCurrency(transaction.runningAmountDue || 0)}`,
        60, y + 20
      );
    } else if (booking && booking.paymentStatus === 'fully_paid') {
      doc.rect(50, y, 495, 30).fill('#d4edda');
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#155724');
      doc.text('✓ PAID IN FULL', 60, y + 9);
    } else if (transaction.status === 'completed') {
      doc.rect(50, y, 495, 30).fill('#d4edda');
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#155724');
      doc.text('✓ PAYMENT COMPLETED', 60, y + 9);
    }
  }

  _drawFooter(doc, company) {
    const y = 730;

    doc
      .moveTo(50, y)
      .lineTo(545, y)
      .strokeColor('#e0e0e0')
      .lineWidth(1)
      .stroke();

    doc.fontSize(8).fillColor('#999').font('Helvetica');
    doc.text(`Generated by ${company.name} on ${this._formatDate(new Date())}`, 50, y + 10, { align: 'center', width: 495 });
    doc.text('Thank you for using CareConnect!', 50, y + 22, { align: 'center', width: 495 });
    doc.text(`For questions, contact ${company.email}`, 50, y + 34, { align: 'center', width: 495 });
  }

  // ============================================
  // UTILITY
  // ============================================

  _formatDate(date) {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  }

  _formatCurrency(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) return '0.00';
    return amount.toFixed(2);
  }

  _formatPaymentMethod(method) {
    const map = {
      stripe_checkout: 'Stripe (Card)',
      stripe: 'Stripe',
      khalti: 'Khalti',
      esewa: 'eSewa',
      bank_transfer: 'Bank Transfer',
      cash: 'Cash',
    };
    return map[method] || method || 'N/A';
  }
}

export default new InvoiceService();
