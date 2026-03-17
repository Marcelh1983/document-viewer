import { ViewerType, getbaseUrl } from 'docviewhelper';

export interface DemoDoc {
  type: string;
  label: string;
  url: string;
}

export interface DemoViewer {
  name: ViewerType;
  docs: DemoDoc[];
  custom: boolean;
  acceptedUploadTypes: string;
  viewerUrl?: string;
}

export const viewers: DemoViewer[] = [
  {
    name: 'google',
    docs: [
      {
        type: 'docx',
        label: 'DOCX',
        url: 'https://calibre-ebook.com/downloads/demos/demo.docx',
      },
      {
        type: 'doc',
        label: 'DOC',
        url: 'https://go.microsoft.com/fwlink/?LinkID=521962',
      },
      {
        type: 'pdf',
        label: 'PDF',
        url: 'https://filesamples.com/samples/document/pdf/sample1.pdf',
      },
      {
        type: 'pptx',
        label: 'PPTX',
        url: `${getbaseUrl()}/assets/file_example_PPTX_250kB.pptx`,
      },
    ],
    custom: true,
    acceptedUploadTypes: '',
  },
  {
    name: 'office',
    docs: [
      {
        type: 'docx',
        label: 'DOCX',
        url: 'https://filesamples.com/samples/document/docx/sample1.docx',
      },
      {
        type: 'xlsx',
        label: 'XLSX',
        url: 'https://filesamples.com/samples/document/xlsx/sample1.xlsx',
      },
      {
        type: 'pptx',
        label: 'PPTX',
        url: `${getbaseUrl()}/assets/file_example_PPTX_250kB.pptx`,
      },
    ],
    custom: true,
    acceptedUploadTypes: '',
  },
  {
    name: 'mammoth',
    docs: [
      {
        type: 'docx',
        label: 'DOCX',
        url: `${getbaseUrl()}/assets/file-sample_100kB.docx`,
      },
    ],
    custom: false,
    acceptedUploadTypes:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  },
  {
    name: 'pdf',
    docs: [
      {
        type: 'pdf',
        label: 'PDF',
        url: `${getbaseUrl()}/assets/file-sample_150kB.pdf`,
      },
    ],
    custom: false,
    acceptedUploadTypes: 'application/pdf',
  },
  {
    name: 'url',
    docs: [
      {
        type: 'published',
        label: 'PUBLISHED',
        // eslint-disable-next-line max-len
        url: `https://docs.google.com/document/d/e/2PACX-1vRs3gemrszDinuGJCi_wO2m5XVP1q2SlRhxM8PAUYc3wu9LFsvteny7l6Rkp695-ruhfn3gWXV03yXC/pub?embedded=true`,
      },
    ],
    custom: true,
    acceptedUploadTypes: '',
  },
];

export const defaultDemoViewer = viewers[0];

export const getDemoViewer = (viewerName?: string) =>
  viewers.find((viewer) => viewer.name === viewerName) ?? defaultDemoViewer;

export const getDemoDoc = (viewerName?: string, docType?: string) => {
  const viewer = getDemoViewer(viewerName);
  return viewer.docs.find((doc) => doc.type === docType) ?? viewer.docs[0];
};
