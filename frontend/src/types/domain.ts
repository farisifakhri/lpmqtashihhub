import { RegistrationStatusCode, PaymentStatusCode, TashihStageCode } from '@/app/tokens';

export type UserRole =
  | 'ADMIN'
  | 'VERIFICATOR'
  | 'DISTRIBUTOR'
  | 'TASHIH_MEMBER'
  | 'TASHIH_LEADER'
  | 'DOCUMENTATOR'
  | 'HEAD_OF_LPMQ'
  | 'PUBLISHER';

export interface User {
  id: string;
  name: string;
  email: string;
  nip?: string;
  role: UserRole;
  publisherId?: string;
  publisherName?: string;
}

export interface Publisher {
  id: string;
  name: string;
  picName: string;
  email: string;
  phone: string;
  address: string;
}

export interface Registration {
  id: string;
  registrationNumber: string;
  publisherId: string;
  publisherName: string;
  mushafTitle: string;
  mushafCategory: string;
  serviceType: string;
  status: RegistrationStatusCode;
  paymentStatus: PaymentStatusCode;
  currentStage?: TashihStageCode;
  submittedAt: string;
  updatedAt: string;
  estimatedSlaDays: number;
  totalFee: number;
}

export type OfficialDocumentType = 'BERITA_ACARA' | 'SURAT_TANDA_TASHIH';

export interface OfficialDocument {
  id: string;
  registrationId: string;
  documentType: OfficialDocumentType;
  documentNumber: string;
  title: string;
  qrToken: string;
  signedBy: string;
  signedAt: string;
  validUntil?: string;
}
