const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32 || secret === 'changeme') {
  throw new Error('JWT_SECRET debe tener al menos 32 caracteres y configurarse fuera de Git');
}
module.exports = { secret, jwtOptions: { algorithm: 'HS256', issuer: 'techseed', audience: 'techseed-web' } };
