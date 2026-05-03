import createProxy from 'next-intl/middleware';
import {routing} from './i18n/routing';

const intlProxy = createProxy(routing);

export default function proxy(request: any) {
  return intlProxy(request);
}

export const config = {
  // Match only internationalized pathnames
  matcher: ['/', '/(is|en)/:path*']
};
