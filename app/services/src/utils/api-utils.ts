import axios from 'axios';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';

import type { RequestFile } from '@utils/router-utils';

/**
 * Send a FormData request with a file to the specified URL.
 *
 * @param {string} url - The URL to send the request to.
 * @param {string} method - The HTTP method for the request (e.g., 'POST', 'PUT').
 * @param {RequestFile} requestFile - The file to include in the FormData.
 * @returns {Promise<AxiosResponse>} A Promise that resolves to the Axios response.
 */
const sendFormData = (url: string, method: AxiosRequestConfig['method'], requestFile: RequestFile): Promise<AxiosResponse> => {
  // Create a Blob from the Buffer
  const blob = new Blob([Buffer.from(requestFile.buffer)], { type: 'application/octet-stream' });

  // Create a FormData object and append the file
  const formData = new FormData();
  formData.append(requestFile.fieldname, blob, requestFile.filename);

  // Send the FormData request using Axios
  return axios.request({
    url,
    method,
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

export default { sendFormData };
