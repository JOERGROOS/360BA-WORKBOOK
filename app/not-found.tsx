import { Mitteilung } from '@/components/Mitteilung';

export default function NotFound() {
  return (
    <Mitteilung eyebrow="360° Business-Analyse" titel={<>Diese Seite gibt es <span className="text-o">nicht</span>.</>}>
      <a className="underline text-o" href="https://joerg-roos.com">Zurück zu joerg-roos.com</a>
    </Mitteilung>
  );
}
