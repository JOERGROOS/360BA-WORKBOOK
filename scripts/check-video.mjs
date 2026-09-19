import assert from 'node:assert/strict';
const { videoQuelle } = await import('../lib/video.ts');

// Leer, kaputt oder nicht https → Platzhalter statt Einbettung.
assert.equal(videoQuelle(''), null);
assert.equal(videoQuelle(undefined), null);
assert.equal(videoQuelle('   '), null);
assert.equal(videoQuelle('kein link'), null);
assert.equal(videoQuelle('http://vimeo.com/76979871'), null, 'http wird abgelehnt');
assert.equal(videoQuelle('javascript:alert(1)'), null);
assert.equal(videoQuelle('data:text/html,<script>'), null);
assert.equal(videoQuelle('https://boeseseite.de/vimeo.com/76979871'), null, 'Host zählt, nicht der Pfad');
assert.equal(videoQuelle('https://vimeo.com/keine-zahl'), null);

// Vimeo in allen gebräuchlichen Schreibweisen → immer die Player-Adresse mit dnt=1.
const erwartet = 'https://player.vimeo.com/video/76979871?dnt=1&title=0&byline=0&portrait=0';
for (const roh of [
  'https://vimeo.com/76979871',
  'https://www.vimeo.com/76979871',
  ' https://vimeo.com/76979871 ',
  'https://player.vimeo.com/video/76979871',
  'https://vimeo.com/channels/staffpicks/76979871',
]) assert.deepEqual(videoQuelle(roh), { art: 'vimeo', adresse: erwartet }, roh);

// Direkte Videodatei bleibt, wie sie ist.
assert.deepEqual(videoQuelle('https://cdn.joerg-roos.com/gruss.MP4'), { art: 'mp4', adresse: 'https://cdn.joerg-roos.com/gruss.MP4' });
assert.equal(videoQuelle('https://cdn.joerg-roos.com/gruss.mov'), null, 'nur mp4');

console.log('ok');
