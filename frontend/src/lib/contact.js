export const CONTACT = {
  WHATSAPP_NUMBER: '628111997125',
  WHATSAPP_DISPLAY: '+628111997125',
  WHATSAPP_LINK: 'https://wa.me/628111997125',
  getWhatsAppHelpLink: (message = 'Halo LPMQ, saya membutuhkan bantuan terkait permohonan tanda tashih.') =>
    `https://wa.me/628111997125?text=${encodeURIComponent(message)}`,
  EMAIL: 'lajnah@kemenag.go.id',
  PHONE: '(021) 87798807',
  OFFICE_LABEL: 'Sekretariat LPMQ',
};

export default CONTACT;
