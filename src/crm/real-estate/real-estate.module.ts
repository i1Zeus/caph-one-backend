import { Module } from '@nestjs/common';
import { FilesModule } from '../../files/files.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { WhatsAppModule } from '../../notifications/whatsapp/whatsapp.module';
import { CityCenterController } from './city-center.controller';
import { CityCenterService } from './city-center.service';
import { ContractAttachmentController } from './contract-attachment.controller';
import { ContractAttachmentService } from './contract-attachment.service';
import { ContractPdfService } from './contract-pdf.service';
import { ContractSignatureController } from './contract-signature.controller';
import { ContractSignatureService } from './contract-signature.service';
import { PropertyContractController } from './property-contract.controller';
import { PropertyContractService } from './property-contract.service';
import { PropertyGroupController } from './property-group.controller';
import { PropertyGroupService } from './property-group.service';
import { PropertyRequestController } from './property-request.controller';
import { PropertyRequestService } from './property-request.service';
import { PropertyController } from './property.controller';
import { PropertyService } from './property.service';
import { SportsCityController } from './sports-city.controller';
import { SportsCityService } from './sports-city.service';
import { UserEntityAccessController } from './user-entity-access.controller';
import { UserEntityAccessService } from './user-entity-access.service';

@Module({
  imports: [PrismaModule, FilesModule, WhatsAppModule],
  controllers: [
    PropertyController,
    PropertyRequestController,
    PropertyContractController,
    ContractSignatureController,
    ContractAttachmentController,
    PropertyGroupController,
    CityCenterController,
    SportsCityController,
    UserEntityAccessController,
  ],
  providers: [
    PropertyService,
    PropertyRequestService,
    PropertyContractService,
    ContractSignatureService,
    ContractAttachmentService,
    PropertyGroupService,
    CityCenterService,
    SportsCityService,
    UserEntityAccessService,
    ContractPdfService,
  ],
  exports: [
    PropertyService,
    PropertyRequestService,
    PropertyContractService,
    ContractSignatureService,
    ContractAttachmentService,
    PropertyGroupService,
    CityCenterService,
    SportsCityService,
    UserEntityAccessService,
  ],
})
export class RealEstateModule {}
