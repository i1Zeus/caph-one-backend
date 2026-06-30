import { Injectable, Logger } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ContractPdfService {
  private readonly logger = new Logger(ContractPdfService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a PDF for a property contract
   * Returns a Buffer containing the PDF data
   */
  async generateContractPdf(contractId: number): Promise<Buffer> {
    // Fetch contract with all related data
    const contract = await this.prisma.propertyContract.findFirst({
      where: { id: contractId, isDeleted: false },
      include: {
        property: true,
        lead: true,
        signatures: {
          where: { isDeleted: false },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!contract) {
      throw new Error(`Contract with ID ${contractId} not found`);
    }

    return new Promise<Buffer>((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: `عقد ${contract.contractType === 'SALE_PURCHASE' ? 'بيع' : 'إيجار'} - ${contract.contractNumber}`,
            Author: 'iZeus ERP',
            Subject: `Property Contract - ${contract.contractNumber}`,
          },
        });

        const buffers: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // === HEADER ===
        this.renderHeader(doc, contract);

        // === PARTY DETAILS ===
        this.renderPartyDetails(doc, contract);

        // === PROPERTY DETAILS ===
        this.renderPropertyDetails(doc, contract);

        // === CONTRACT TERMS ===
        this.renderContractTerms(doc, contract);

        // === SIGNATURES ===
        this.renderSignatures(doc, contract);

        // === FOOTER ===
        this.renderFooter(doc);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private renderHeader(doc: PDFKit.PDFDocument, contract: any) {
    // Title
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('iZeus ERP', { align: 'center' });

    doc.moveDown(0.5);

    // Contract Type
    const contractTypeLabel =
      contract.contractType === 'SALE_PURCHASE'
        ? 'Sale Contract'
        : contract.contractType === 'RENT_LEASE'
          ? 'Rental Contract'
          : contract.contractType === 'INVESTMENT'
            ? 'Investment Contract'
            : 'Contract';

    const contractTypeAr =
      contract.contractType === 'SALE_PURCHASE'
        ? 'عقد بيع وشراء'
        : contract.contractType === 'RENT_LEASE'
          ? 'عقد إيجار'
          : contract.contractType === 'INVESTMENT'
            ? 'عقد استثمار'
            : 'عقد';

    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .text(contractTypeLabel, { align: 'center' });
    doc
      .fontSize(14)
      .font('Helvetica')
      .text(contractTypeAr, { align: 'center' });

    doc.moveDown(0.5);

    // Contract Number and Date
    doc
      .fontSize(11)
      .font('Helvetica')
      .text(`Contract No: ${contract.contractNumber}`, { align: 'center' });
    doc.text(
      `Date: ${new Date(contract.createdAt).toLocaleDateString('en-GB')}`,
      { align: 'center' },
    );
    doc.text(`Status: ${contract.status}`, { align: 'center' });

    // Divider
    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);
  }

  private renderPartyDetails(doc: PDFKit.PDFDocument, contract: any) {
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Party Details / تفاصيل الأطراف');
    doc.moveDown(0.5);

    const isSale = contract.contractType === 'SALE_PURCHASE';
    const firstPartyRole = isSale ? 'Seller / البائع' : 'Lessor / المؤجر';
    const secondPartyRole = isSale ? 'Buyer / المشتري' : 'Lessee / المستأجر';

    // First Party
    doc.fontSize(11).font('Helvetica-Bold').text(`First Party (${firstPartyRole}):`);
    doc.fontSize(10).font('Helvetica');
    doc.text(`  Name / الاسم: ${contract.firstPartyName || contract.property?.ownerName || '-'}`);
    doc.text(`  Address / العنوان: ${contract.firstPartyAddress || '-'}`);
    doc.text(`  ID Number / رقم الهوية: ${contract.firstPartyIdNumber || '-'}`);
    doc.text(`  Phone / الهاتف: ${contract.firstPartyPhone || contract.property?.ownerPhone || '-'}`);

    doc.moveDown(0.5);

    // Second Party
    doc.fontSize(11).font('Helvetica-Bold').text(`Second Party (${secondPartyRole}):`);
    doc.fontSize(10).font('Helvetica');
    doc.text(`  Name / الاسم: ${contract.secondPartyName || contract.lead?.name || '-'}`);
    doc.text(`  Address / العنوان: ${contract.secondPartyAddress || '-'}`);
    doc.text(`  ID Number / رقم الهوية: ${contract.secondPartyIdNumber || '-'}`);
    doc.text(`  Phone / الهاتف: ${contract.secondPartyPhone || contract.lead?.phone || '-'}`);

    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#cccccc');
    doc.moveDown(1);
  }

  private renderPropertyDetails(doc: PDFKit.PDFDocument, contract: any) {
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Property Details / تفاصيل العقار');
    doc.moveDown(0.5);

    doc.fontSize(10).font('Helvetica');
    doc.text(`  Property / العقار: ${contract.property?.title || '-'}`);
    doc.text(`  Property Type / نوع الملك: ${contract.propertyTypeDetails || contract.property?.propertyType || '-'}`);
    doc.text(`  Property Area / مساحة العقار: ${contract.propertyArea || contract.property?.area || '-'} sqm`);
    doc.text(`  Quarter/District / المحلة: ${contract.propertyDistrict || contract.property?.district || '-'}`);
    doc.text(`  Sequence/Serial No / رقم التسلسل: ${contract.propertySequence || contract.property?.deedNumber || '-'}`);

    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#cccccc');
    doc.moveDown(1);
  }

  private renderContractTerms(doc: PDFKit.PDFDocument, contract: any) {
    const isSale = contract.contractType === 'SALE_PURCHASE';
    const isRent = contract.contractType === 'RENT_LEASE';

    if (isRent) {
      doc.fontSize(14).font('Helvetica-Bold').text('Rental Contract Terms / تفاصيل وشروط الإيجار');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');

      // Agreement Details (Bilingual narrative format)
      doc.font('Helvetica-Bold').text('Lease Agreement / اتفاقية الإيجار:');
      doc.font('Helvetica');
      doc.text(`  The Lessee agreed to lease the property / وافق المستأجر على استئجار العقار`);
      doc.text(`  Located in / الواقع في: ${contract.propertyDistrict || contract.property?.district || '-'}`);
      
      const amountStr = contract.contractAmount ? `${Number(contract.contractAmount).toLocaleString()} IQD` : '-';
      doc.text(`  Rent Amount (Numbers) / ببدل إيجار رقماً: ${amountStr}`);
      doc.text(`  Rent Amount (Writing) / ببدل إيجار كتابة: ${contract.contractAmountInWriting || '-'}`);
      
      const startDateStr = contract.startDate ? new Date(contract.startDate).toLocaleDateString('en-GB') : '-';
      const endDateStr = contract.endDate ? new Date(contract.endDate).toLocaleDateString('en-GB') : '-';
      doc.text(`  For the duration of / للمدة: ${contract.rentDuration || '-'} (From/تبدأ من ${startDateStr} To/لغاية ${endDateStr})`);
      doc.text(`  Payment terms / وأن يتم دفع بدل الإيجار: ${contract.rentPaymentTerms || '-'}`);

      doc.moveDown(0.5);

      // Penalties & Security Deposits
      doc.font('Helvetica-Bold').text('Deposits & Breach Penalties / التأمينات والشرط الجزائي:');
      doc.font('Helvetica');
      doc.text(`  If refusing to complete lease / إذا امتنع عن إتمام الإيجار: ${contract.rentRefusalTerms || '-'}`);
      
      const securityDepStr = contract.securityDeposit ? `${Number(contract.securityDeposit).toLocaleString()} IQD` : '-';
      doc.text(`  Security Deposit / دفع تأمينات قدرها: ${securityDepStr}`);
      
      const breachPenStr = contract.rentBreachPenalty ? `${Number(contract.rentBreachPenalty).toLocaleString()} IQD` : '-';
      doc.text(`  Breach Penalty (Non-reporting) / تعهد بدفع تأمينات عند النكول أو عدم التقرير: ${breachPenStr}`);

      doc.moveDown(0.5);

      // Fees Responsibility
      doc.font('Helvetica-Bold').text('Required Fees / عهدة الرسوم والمصاريف:');
      doc.font('Helvetica');
      doc.text(`  Required rental fees responsibility / جميع الرسوم المقتضية للإيجار يتحملها: ${contract.rentFeesResponsibility || '-'}`);

      // Chamber of Commerce Stamp
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').text('Official Certification / التوثيق الرسمي:');
      doc.font('Helvetica');
      doc.text(`  Issued & Stamped by Chamber of Commerce / يصدر ويختم العقد من غرفة التجارة: ${contract.chamberOfCommerceStamp ? 'Yes / نعم' : 'No / لا'}`);

      // Acceptance Date
      if (contract.agreementDate) {
        doc.moveDown(0.5);
        const agreementDateObj = new Date(contract.agreementDate);
        const agreementYear = agreementDateObj.getFullYear();
        doc
          .font('Helvetica-Bold')
          .text('Consent and Agreement / بناءً على حصول التراضي والقبول في:', { continued: true });
        doc
          .font('Helvetica')
          .text(` ${agreementDateObj.toLocaleDateString('en-GB')} (${agreementYear} Year/سنة)`);
      }
    } else {
      // General/Sale Contract layout
      doc.fontSize(14).font('Helvetica-Bold').text('Financial & Contract Terms / تفاصيل العقد والجانب المالي');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');

      // Contract Amount
      if (contract.contractAmount) {
        doc
          .font('Helvetica-Bold')
          .text('Total Sale Amount / بدل البيع المتفق عليه:', { continued: true });
        doc
          .font('Helvetica')
          .text(` ${Number(contract.contractAmount).toLocaleString()} IQD`);
      }

      // Downpayment
      if (contract.downpayment) {
        doc
          .font('Helvetica-Bold')
          .text('Downpayment (Deposit) / المبلغ المقبوض كعربون:', { continued: true });
        doc
          .font('Helvetica')
          .text(` ${Number(contract.downpayment).toLocaleString()} IQD`);
      }

      // Remaining Amount
      if (contract.remainingAmount) {
        doc
          .font('Helvetica-Bold')
          .text('Remaining Amount / المبلغ المتبقي (الباقي):', { continued: true });
        doc
          .font('Helvetica')
          .text(` ${Number(contract.remainingAmount).toLocaleString()} IQD`);
      }

      doc.moveDown(0.5);

      // Penalties / Guarantees
      doc.font('Helvetica-Bold').text('Breach Penalties / تضمينات النكول والشرط الجزائي:');
      doc.font('Helvetica');
      doc.text(`  First Party Penalty / تضمينات الفريق الأول للثاني: ${contract.firstPartyPenalty ? `${Number(contract.firstPartyPenalty).toLocaleString()} IQD` : '-'}`);
      doc.text(`  Second Party Penalty / تضمينات الفريق الثاني للأول: ${contract.secondPartyPenalty ? `${Number(contract.secondPartyPenalty).toLocaleString()} IQD` : '-'}`);

      doc.moveDown(0.5);

      // Responsibility of Fees
      doc.font('Helvetica-Bold').text('Responsibility for Fees & Expenses / عهدة الرسوم والمصاريف:');
      doc.font('Helvetica');
      doc.text(`  Discharge/Transfer Fees / رسوم الفك والنقل: ${contract.dischargeFeesResponsibility || '-'}`);
      doc.text(`  All Other Fees & Taxes / عهدة جميع الرسوم الأخرى: ${contract.allFeesResponsibility || '-'}`);

      // Start Date
      if (contract.startDate) {
        doc.moveDown(0.5);
        doc
          .font('Helvetica-Bold')
          .text('Contract Date / تاريخ كتابة العقد:', { continued: true });
        doc
          .font('Helvetica')
          .text(` ${new Date(contract.startDate).toLocaleDateString('en-GB')}`);
      }
    }

    // Additional Clauses
    if (contract.additionalClauses) {
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').text('Additional Clauses / فقرات إضافية:');
      doc.font('Helvetica').text(`  ${contract.additionalClauses}`);
    }

    // Legacy Notes
    if (contract.notes) {
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').text('Notes / ملاحظات:');
      doc.font('Helvetica').text(`  ${contract.notes}`);
    }

    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#cccccc');
    doc.moveDown(1);
  }

  private renderSignatures(doc: PDFKit.PDFDocument, contract: any) {
    if (doc.y > 600) {
      doc.addPage();
    }

    doc.fontSize(14).font('Helvetica-Bold').text('Signatures / التوقيعات');
    doc.moveDown(1);

    const signatures = contract.signatures || [];

    const findSig = (roleSubstring: string) => {
      return signatures.find(
        (sig: any) =>
          sig.signerRole?.toLowerCase().includes(roleSubstring.toLowerCase()) ||
          (roleSubstring === 'seller' && sig.signerRole === 'بائع') ||
          (roleSubstring === 'buyer' && sig.signerRole === 'مشتري') ||
          (roleSubstring === 'witness 1' && (sig.signerRole === 'شاهد أول' || sig.signerRole === 'الشاهد الأول')) ||
          (roleSubstring === 'witness 2' && (sig.signerRole === 'شاهد ثاني' || sig.signerRole === 'الشاهد الثاني'))
      );
    };

    const sellerSig = findSig('seller') || findSig('lessor') || findSig('بائع') || findSig('مؤجر');
    const buyerSig = findSig('buyer') || findSig('lessee') || findSig('مشتري') || findSig('مستأجر');
    const witness1Sig = findSig('witness 1') || findSig('شاهد 1') || findSig('الشاهد الأول') || findSig('شاهد أول');
    const witness2Sig = findSig('witness 2') || findSig('شاهد 2') || findSig('الشاهد الثاني') || findSig('شاهد ثاني');

    const renderSignatureBox = (title: string, sig: any, x: number, y: number) => {
      doc.fontSize(10).font('Helvetica-Bold').text(title, x, y);
      if (sig && sig.isSigned) {
        doc.font('Helvetica').fontSize(9);
        doc.text(`Name: ${sig.signerName}`, x, y + 15);
        doc.text(`Signed: ${new Date(sig.signedAt).toLocaleDateString('en-GB')}`, x, y + 27);
        doc.text('Signature: [Signed digitally]', x, y + 39);
      } else {
        doc.font('Helvetica').fontSize(9);
        doc.text('Name: ______________________', x, y + 15);
        doc.text('Signature: __________________', x, y + 30);
      }
    };

    const startY = doc.y;

    // Row 1: Seller and Buyer
    renderSignatureBox(
      contract.contractType === 'SALE_PURCHASE' ? 'First Party (Seller) / الطرف الأول (البائع)' : 'First Party (Lessor) / الطرف الأول (المؤجر)',
      sellerSig,
      50,
      startY
    );

    renderSignatureBox(
      contract.contractType === 'SALE_PURCHASE' ? 'Second Party (Buyer) / الطرف الثاني (المشتري)' : 'Second Party (Lessee) / الطرف الثاني (المستأجر)',
      buyerSig,
      300,
      startY
    );

    // Row 2: Witnesses
    renderSignatureBox(
      'First Witness / الشاهد الأول',
      witness1Sig,
      50,
      startY + 80
    );

    renderSignatureBox(
      'Second Witness / الشاهد الثاني',
      witness2Sig,
      300,
      startY + 80
    );
  }

  private renderFooter(doc: PDFKit.PDFDocument) {
    // Footer at bottom of page
    const pageHeight = doc.page.height;
    doc
      .fontSize(8)
      .font('Helvetica')
      .text(
        `Generated by iZeus ERP on ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}`,
        50,
        pageHeight - 50,
        { align: 'center' },
      );
  }
}
