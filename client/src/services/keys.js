import api from './api';

const seg = (value) => encodeURIComponent(String(value));

export const keysAPI = {
  publishBundle: (bundle) => api.post('/keys/bundle', bundle),
  addOneTimePreKeys: (oneTimePreKeys) => api.post('/keys/prekeys', { oneTimePreKeys }),
  rotateSignedPreKey: (signedPreKey) => api.post('/keys/signed-prekey', { signedPreKey }),
  preKeyCount: () => api.get('/keys/count'),
  fetchBundle: (userId) => api.get(`/keys/bundle/${seg(userId)}`),
};
