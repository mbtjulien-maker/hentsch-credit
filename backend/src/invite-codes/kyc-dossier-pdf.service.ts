import { Injectable } from '@nestjs/common';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { AccountType } from '@prisma/client';
import type { OwnAddressEntryDto } from '../users/dto/update-own-addresses.dto';
import type { UpdateOwnEmploymentDto } from '../users/dto/update-own-employment.dto';
import type { UpdateOwnIdentityDocumentDto } from '../users/dto/update-own-identity-document.dto';
import type { UpdateOwnProfileDto } from '../users/dto/update-own-profile.dto';
import type { SubmitOwnAmlProfileDto } from '../users/dto/submit-own-aml-profile.dto';

export interface KycDossierPdfInput {
  email: string;
  accountType: AccountType;
  profile: UpdateOwnProfileDto;
  address: OwnAddressEntryDto;
  employment: UpdateOwnEmploymentDto;
  identityDocument: UpdateOwnIdentityDocumentDto;
  aml: SubmitOwnAmlProfileDto;
}

const PAGE_MARGIN = 50;
const PAGE_WIDTH = 595.28; // A4 portrait, points
const PAGE_HEIGHT = 841.89;
const LINE_HEIGHT = 15;
const SECTION_GAP = 10;

function value(v: string | number | boolean | null | undefined): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Oui' : 'Non';
  return String(v);
}

function listValue(v: string[] | null | undefined): string {
  return v && v.length > 0 ? v.join(', ') : '—';
}

// Régénère le dossier KYC papier (cf. dossier de référence utilisé pour calquer
// /dashboard/kyc, §6 CLAUDE.md entrée #33) avec les informations réellement saisies par
// le client dans l'assistant d'inscription progressif — jamais un gabarit vide, jamais
// une donnée fabriquée : chaque champ affiche soit la valeur saisie, soit "—" si laissée
// vide (cf. §6 entrée #40). Le client le relit et le valide explicitement avant que le
// compte ne soit réellement créé (POST /invite-codes/redeem). Bibliothèque pdf-lib — pure
// JS, aucune dépendance native, déjà auditée sans vulnérabilité propre (cf. npm audit).
@Injectable()
export class KycDossierPdfService {
  async generate(input: KycDossierPdfInput): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

    let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - PAGE_MARGIN;

    const ensureSpace = (needed: number) => {
      if (y - needed < PAGE_MARGIN) {
        page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - PAGE_MARGIN;
      }
    };

    const drawTitle = (text: string) => {
      ensureSpace(30);
      page.drawText(text, {
        x: PAGE_MARGIN,
        y,
        size: 16,
        font: boldFont,
        color: rgb(0.1, 0.1, 0.1),
      });
      y -= 24;
    };

    const drawSectionHeading = (text: string) => {
      ensureSpace(LINE_HEIGHT * 2);
      y -= 6;
      page.drawText(text, {
        x: PAGE_MARGIN,
        y,
        size: 11.5,
        font: boldFont,
        color: rgb(0.55, 0.42, 0.1),
      });
      y -= 4;
      page.drawLine({
        start: { x: PAGE_MARGIN, y },
        end: { x: PAGE_WIDTH - PAGE_MARGIN, y },
        thickness: 0.5,
        color: rgb(0.8, 0.8, 0.8),
      });
      y -= LINE_HEIGHT;
    };

    const drawField = (label: string, text: string) => {
      ensureSpace(LINE_HEIGHT);
      page.drawText(`${label} :`, {
        x: PAGE_MARGIN,
        y,
        size: 9.5,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });
      page.drawText(text, {
        x: PAGE_MARGIN + 190,
        y,
        size: 9.5,
        font: boldFont,
        color: rgb(0.1, 0.1, 0.1),
      });
      y -= LINE_HEIGHT;
    };

    drawTitle(
      'Hentsch Credit — Dossier d’identification et de vérification client',
    );
    ensureSpace(LINE_HEIGHT);
    page.drawText(
      `Généré le ${new Date().toLocaleDateString('fr-FR')} à partir des informations saisies par le client — à vérifier avant validation.`,
      { x: PAGE_MARGIN, y, size: 8.5, font, color: rgb(0.5, 0.5, 0.5) },
    );
    y -= LINE_HEIGHT + SECTION_GAP;

    const { profile, address, employment, identityDocument, aml } = input;

    drawSectionHeading('1. État civil');
    drawField('Prénom', value(profile.firstName));
    drawField('Nom', value(profile.lastName));
    drawField('Nom d’usage', value(profile.usageLastName));
    drawField('Date de naissance', value(profile.dateOfBirth));
    drawField('Lieu de naissance', value(profile.placeOfBirth));
    drawField('Pays de naissance', value(profile.birthCountry));
    drawField('Sexe', value(profile.gender));
    drawField('Nationalité', value(profile.nationality));
    drawField('Seconde nationalité', value(profile.secondNationality));
    drawField('Situation de famille', value(profile.maritalStatus));
    drawField('Personnes à charge', value(profile.dependents));
    drawField('Téléphone', value(profile.phone));
    drawField(
      'Type de compte',
      input.accountType === 'BUSINESS'
        ? 'Professionnel (Business)'
        : 'Particulier',
    );

    y -= SECTION_GAP;
    drawSectionHeading('2. Coordonnées et résidence fiscale');
    drawField('E-mail', value(input.email));
    drawField('Adresse (domicile)', value(address.street));
    if (address.addressLine2)
      drawField('Complément d’adresse', value(address.addressLine2));
    drawField('Ville', value(address.city));
    drawField('Code postal', value(address.postalCode));
    drawField('Pays', value(address.country));
    drawField('Résidence fiscale', value(profile.taxResidenceCountry));
    drawField('Autre résidence fiscale', value(profile.additionalTaxResidence));
    drawField('Numéro fiscal (NIF)', value(profile.taxIdNumber));

    y -= SECTION_GAP;
    drawSectionHeading('3. Situation socio-professionnelle');
    drawField('Statut professionnel', value(employment.professionalStatus));
    drawField(
      'Employeur / Activité',
      value(employment.employer ?? employment.activity),
    );
    drawField('Secteur', value(employment.sector));
    drawField('Ancienneté', value(employment.seniority));
    drawField('Revenu annuel déclaré', value(employment.annualIncome));
    drawField(
      'Tranche de revenu annuel',
      value(employment.annualIncomeBracket),
    );
    drawField('Tranche de patrimoine', value(employment.netWorthBracket));

    y -= SECTION_GAP;
    drawSectionHeading('4. Pièces justificatives déclarées');
    drawField('Type de pièce d’identité', value(identityDocument.documentType));
    drawField('Numéro de pièce', value(identityDocument.documentNumber));
    drawField(
      'Autorité de délivrance',
      value(identityDocument.issuingAuthority),
    );
    drawField('Lieu de délivrance', value(identityDocument.issuePlace));
    drawField('Date de délivrance', value(identityDocument.issueDate));
    drawField('Date d’expiration', value(identityDocument.expiryDate));
    drawField(
      'Justificatif de domicile',
      value(identityDocument.proofOfAddressType),
    );
    drawField(
      'Émetteur du justificatif',
      value(identityDocument.proofOfAddressIssuer),
    );
    drawField(
      'Date du justificatif',
      value(identityDocument.proofOfAddressDate),
    );

    y -= SECTION_GAP;
    drawSectionHeading('5. Conformité LCB-FT');
    drawField(
      'Personne politiquement exposée',
      value(aml.isPoliticallyExposed),
    );
    drawField('Origine des fonds', listValue(aml.fundsOrigin));
    if (aml.fundsOriginOther)
      drawField('Origine des fonds (autre)', value(aml.fundsOriginOther));
    drawField(
      'Objet de la relation d’affaires',
      listValue(aml.relationshipPurpose),
    );
    drawField('Ville d’attestation', value(aml.attestationCity));
    drawField('Attestation « Lu et approuvé »', value(aml.confirmAttestation));

    y -= SECTION_GAP + 4;
    ensureSpace(LINE_HEIGHT * 2);
    page.drawText(
      'Ce document récapitule les informations transmises par le client au moment de son inscription. Il ne constitue pas',
      { x: PAGE_MARGIN, y, size: 8, font, color: rgb(0.55, 0.55, 0.55) },
    );
    y -= 11;
    page.drawText(
      'une validation de conformité — celle-ci reste effectuée par un conseiller après création du compte.',
      { x: PAGE_MARGIN, y, size: 8, font, color: rgb(0.55, 0.55, 0.55) },
    );

    return doc.save();
  }
}
