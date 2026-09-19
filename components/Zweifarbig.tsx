// Überschrift im Stil der Webseite: weiß, ein Teil orange.
// `wort` darf mehrere Wörter umfassen; kommt es im Text nicht vor, bleibt alles weiß.
export function Zweifarbig({ text, wort }: { text: string; wort: string }) {
  const i = wort ? text.indexOf(wort) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <span className="text-o">{wort}</span>
      {text.slice(i + wort.length)}
    </>
  );
}
