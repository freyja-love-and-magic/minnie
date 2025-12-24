import { createClient } from './client.js';
import sessionless from 'sessionless-node';
  
const client = await createClient()
  .on('error', err => console.log('Redis Client Error', err))
  .connect();
    
const db = {
  getUser: async (uuid) => {
    const user = await client.get(`user:${uuid}`);
    const parsedUser = JSON.parse(user);
    return parsedUser; 
  },

  putUser: async (user) => {
    const uuid = sessionless.generateUUID();
    user.userUUID = uuid;

    if(user.isOrganization) {
      user.ttl = -1;
    }

    user.inbox = [];

    await client.set(`user:${uuid}`, JSON.stringify(user));
    const userToReturn = JSON.parse(JSON.stringify(user));
    return userToReturn;
  },

  getInbox: async (uuid) => {
    const user = await db.getUser(uuid);
    return user.inbox;
  },

  deleteUser: async (uuid) => {
    const resp = await client.del(`user:${uuid}`);

    return true;
  },

  saveKeys: async (keys) => {
    await client.set(`keys`, JSON.stringify(keys));
  },

  getKeys: async () => {
    const keyString = await client.get('keys');
    return JSON.parse(keyString);
  }

};

export default db;
