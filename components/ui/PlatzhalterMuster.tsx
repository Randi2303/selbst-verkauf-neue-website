/**
 * Dezentes Linienmuster für Foto-Platzhalterflächen: zwei Häuser im
 * Strich-Stil der Website. Liegt hinter einem Initialen-Kreis, wenn
 * ein Porträt (noch) nicht in public/ liegt. Eine Komponente für alle
 * Menschen-Flächen (Startseiten-Sektion und Team-Seite), damit der
 * Platzhalter überall derselbe ist.
 */
export default function PlatzhalterMuster() {
  return (
    <svg
      className="absolute inset-0 h-full w-full text-primary/10"
      viewBox="0 0 200 200"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <path d="M-10 150 60 96l70 54" strokeLinejoin="round" />
      <path d="M60 208v-70" />
      <path d="M110 150 170 104l60 46" strokeLinejoin="round" />
      <circle cx="152" cy="46" r="22" />
      <path d="M-10 178h220" />
    </svg>
  );
}
