import sessionless from 'sessionless-node';
import fetch from 'node-fetch';

const get = async (url) => {
  return await fetch(url);
};

const post = async (url, payload) => {
  return await fetch(url, {
    method: 'post',
    body: JSON.stringify(payload),
    headers: {'Content-Type': 'application/json'}
  });
};

const put = async (url, payload) => {
  return await fetch(url, {
    method: 'put',
    body: JSON.stringify(payload),
    headers: {'Content-Type': 'application/json'}
  });
};

const _delete = async (url, payload) => {
  return await fetch(url, {
    method: 'delete',
    body: JSON.stringify(payload),
    headers: {'Content-Type': 'application/json'}
  });
};

const minnie = {
  baseURL: 'https://dev.minnie.allyabase.com/',

  /**
   * Configure the minnie client for different environments
   * @param {Object} config - Configuration options
   * @param {string} config.baseURL - Direct base URL (e.g., 'http://127.0.0.1:5114/')
   * @param {string} config.wikiBaseURL - Wiki proxy base URL (e.g., 'http://127.0.0.1:5124')
   *                                      Will construct URL as: {wikiBaseURL}/plugin/allyabase/bdo/
   */
  configure: (config) => {
    if (config.wikiBaseURL) {
      // Wiki proxy mode: route through wiki plugin
      minnie.baseURL = `${config.wikiBaseURL.replace(/\/$/, '')}/plugin/allyabase/bdo/`;
    } else if (config.baseURL) {
      // Direct mode: use base URL as-is
      minnie.baseURL = config.baseURL.endsWith('/') ? config.baseURL : config.baseURL + '/';
    }
  },

  createUser: async (ttl, isOrganization, saveKeys, getKeys) => {
    let ttlToUse = ttl;
    if(isOrganization) {
      ttlToUse = -1;
    }
    let keys = await getKeys();
    if(!keys || !keys.privateKey) {
      await sessionless.generateKeys(saveKeys, getKeys);
      keys = await getKeys();
    }
    sessionless.getKeys = getKeys;

    const payload = {
      timestamp: new Date().getTime() + '',
      pubKey: keys.pubKey,
      ttl: ttlToUse,
      isOrganization
    };

    payload.signature = await sessionless.sign(payload.timestamp + payload.pubKey);

    const res = await put(`${minnie.baseURL}user/create`, payload);
    const user = await res.json();
console.log(user);

    return user;
  },

  getInbox: async (uuid) => {
    const timestamp = new Date().getTime() + '';
    const keys = await sessionless.getKeys();

    const signature = await sessionless.sign(timestamp + uuid);

    const res = await get(`${minnie.baseURL}user/${uuid}/inbox?timestamp=${timestamp}&signature=${signature}`);
    const inbox = await res.json();

    return inbox;
  },

  send: async (uuid, recipient, cc, bcc, body) => {
    const timestamp = new Date().getTime() + '';

    const signature = await sessionless.sign(timestamp + uuid + recipient + body);

    const payload = {
      timestamp,
      userUUID: uuid,
      recipient,
      cc,
      bcc,
      body,
      signature
    };

    let postURL = `${minnie.baseURL}user/${uuid}/send`;

    const res = await post(postURL, payload);
    const success = await res.json();

    return success;
  },

  deleteUser: async (uuid) => {
    const timestamp = new Date().getTime() + '';

    const signature = await sessionless.sign(timestamp + uuid);

    const payload = {
      timestamp,
      userUUID: uuid,
      signature
    };

    const res = await _delete(`${minnie.baseURL}user/delete`, payload);
    return res.status;
  }
};

export default minnie;
