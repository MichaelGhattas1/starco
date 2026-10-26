import { mediaUrl } from './media';

const HTTP_API = 'http://plazainn.runasp.net';
const HTTPS_API = 'https://plazainn.runasp.net';

describe('media URLs', () => {
  it('keeps the current HTTP API address while that host has no working certificate', () => {
    expect(mediaUrl('images/hotel/81.png', HTTP_API)).toBe(
      'http://plazainn.runasp.net/images/hotel/81.png',
    );
    expect(mediaUrl('http://plazainn.runasp.net/images/hotel/81.png', HTTP_API)).toBe(
      'http://plazainn.runasp.net/images/hotel/81.png',
    );
  });

  it('upgrades stored HTTP links on the API host once the API base is HTTPS', () => {
    expect(mediaUrl('http://plazainn.runasp.net/images/hotel/81.png', HTTPS_API)).toBe(
      'https://plazainn.runasp.net/images/hotel/81.png',
    );
    expect(mediaUrl('wwwroot/menus/cafeMenu/119.pdf', HTTPS_API)).toBe(
      'https://plazainn.runasp.net/menus/cafeMenu/119.pdf',
    );
  });

  it('leaves other hosts and existing HTTPS links unchanged', () => {
    expect(mediaUrl('https://accept.paymob.com/api/acceptance/iframes/1', HTTPS_API)).toBe(
      'https://accept.paymob.com/api/acceptance/iframes/1',
    );
    expect(mediaUrl('http://cdn.example/photo.jpg', HTTPS_API)).toBe('http://cdn.example/photo.jpg');
    expect(mediaUrl(null, HTTPS_API)).toBeNull();
  });
});
