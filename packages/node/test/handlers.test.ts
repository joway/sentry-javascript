import { Runtime } from '@sentry/types';

import { Event, Request, User } from '../src';
import { parseRequest } from '../src/handlers';

describe('parseRequest', () => {
  const mockReq = {
    body: 'foo',
    cookies: { test: 'test' },
    headers: {
      host: 'mattrobenolt.com',
    },
    method: 'POST',
    url: '/some/path?key=value',
    user: {
      custom_property: 'foo',
      email: 'tobias@mail.com',
      id: 123,
      username: 'tobias',
    },
  };

  describe('parseRequest.contexts runtime', () => {
    test('runtime name must contain node', () => {
      const parsedRequest: Event = parseRequest({}, mockReq);
      expect((parsedRequest.contexts!.runtime as Runtime).name).toEqual('node');
    });

    test('runtime version must contain current node version', () => {
      const parsedRequest: Event = parseRequest({}, mockReq);
      expect((parsedRequest.contexts!.runtime as Runtime).version).toEqual(process.version);
    });

    test('runtime disbaled by options', () => {
      const parsedRequest: Event = parseRequest({}, mockReq, {
        version: false,
      });
      expect(parsedRequest).not.toHaveProperty('contexts.runtime');
    });
  });

  describe('parseRequest.user properties', () => {
    const DEFAULT_USER_KEYS = ['id', 'username', 'email'];
    const CUSTOM_USER_KEYS = ['custom_property'];

    test('parseRequest.user only contains the default properties from the user', () => {
      const parsedRequest: Event = parseRequest({}, mockReq);
      expect(Object.keys(parsedRequest.user as User)).toEqual(DEFAULT_USER_KEYS);
    });

    test('parseRequest.user only contains the custom properties specified in the options.user array', () => {
      const parsedRequest: Event = parseRequest({}, mockReq, {
        user: CUSTOM_USER_KEYS,
      });
      expect(Object.keys(parsedRequest.user as User)).toEqual(CUSTOM_USER_KEYS);
    });

    test('parseRequest.user doesnt blow up when someone passes non-object value', () => {
      const parsedRequest: Event = parseRequest(
        {},
        {
          ...mockReq,
          // @ts-ignore
          user: 'wat',
        },
      );
      expect(Object.keys(parsedRequest.user as User)).toEqual([]);
    });
  });

  describe('parseRequest.ip property', () => {
    test('can be extracted from req.ip', () => {
      const parsedRequest: Event = parseRequest(
        {},
        {
          ...mockReq,
          ip: '123',
        },
        {
          ip: true,
        },
      );
      expect(parsedRequest.user!.ip_address).toEqual('123');
    });

    test('can extract from req.connection.remoteAddress', () => {
      const parsedRequest: Event = parseRequest(
        {},
        {
          ...mockReq,
          connection: {
            remoteAddress: '321',
          },
        },
        {
          ip: true,
        },
      );
      expect(parsedRequest.user!.ip_address).toEqual('321');
    });
  });

  describe('parseRequest.request properties', () => {
    test('parseRequest.request only contains the default set of properties from the request', () => {
      const DEFAULT_REQUEST_PROPERTIES = ['cookies', 'data', 'headers', 'method', 'query_string', 'url'];
      const parsedRequest: Event = parseRequest({}, mockReq);
      expect(Object.keys(parsedRequest.request as Request)).toEqual(DEFAULT_REQUEST_PROPERTIES);
    });

    test('parseRequest.request only contains the specified properties in the options.request array', () => {
      const INCLUDED_PROPERTIES = ['data', 'headers', 'query_string', 'url'];
      const parsedRequest: Event = parseRequest({}, mockReq, {
        request: INCLUDED_PROPERTIES,
      });
      expect(Object.keys(parsedRequest.request as Request)).toEqual(INCLUDED_PROPERTIES);
    });

    test('parseRequest.request skips `body` property for GET and HEAD requests', () => {
      expect(parseRequest({}, mockReq, {}).request).toHaveProperty('data');
      expect(parseRequest({}, { ...mockReq, method: 'GET' }, {}).request).not.toHaveProperty('data');
      expect(parseRequest({}, { ...mockReq, method: 'HEAD' }, {}).request).not.toHaveProperty('data');
    });
  });
});
