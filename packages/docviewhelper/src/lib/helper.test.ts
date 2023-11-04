import { getViewerDetails } from './helper';

describe(`test url`, () => {
  it('works', async () => {
    const url = getViewerDetails(
      'http://www.africau.edu/images/default/sample.pdf'
    );
    const response = fetch(url.url);
    console.log(response);
  });
});
