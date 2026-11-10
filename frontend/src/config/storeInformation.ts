/** Only publish team identities and contact channels approved by the project owner. */
export const storeInformation: {
  team: Array<{ name: string; studentId: string; contribution: string }>;
  contactEmail: string | null;
  contactPhone: string | null;
} = {
  team: [
    { name: 'Nguyễn Văn Hiền', studentId: 'N23DCAT023', contribution: 'Trực tiếp thiết kế và phát triển website.' },
    { name: 'Khuất Nguyễn Bảo Hiếu', studentId: 'N23DCAT026', contribution: 'Trực tiếp thiết kế và phát triển website.' },
  ],
  contactEmail: 'nguyenvanhien1313.tv@gmail.com',
  contactPhone: null,
};
